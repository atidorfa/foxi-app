import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { resolveTurn, getActiveSlot } from '@/lib/pvp/engine'
import { aiDecide } from '@/lib/pvp/ai'
import type { BattleState, TurnSnapshot } from '@/lib/pvp/types'
import {
  applyMmrChange,
  getRankFromMmr,
  getGoldRewardByRank,
  needsWeeklyReset,
} from '@/lib/pvp/mmr'

const PVP_XP_PER_THERIAN = 30

function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xFFFFFFFF
  }
}

function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  const { id } = await params
  const battle = await db.pvpBattle.findFirst({
    where: { id, attackerId: userId, status: 'active' },
  })
  if (!battle) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  let state: BattleState = JSON.parse(battle.state)

  // Si ya está completada, devolver el estado actual sin hacer nada
  if (state.status !== 'active') {
    return NextResponse.json({ battleId: battle.id, status: state.status, state, snapshots: [] })
  }

  const rng = makeRng(Date.now())
  const snapshots: TurnSnapshot[] = []

  try {
    let safetyCounter = 0
    while (state.status === 'active' && safetyCounter < 100) {
      const actorIndex = state.turnIndex
      const actor   = getActiveSlot(state)
      const allies  = state.slots.filter(s => s.side === actor.side)
      const enemies = state.slots.filter(s => s.side !== actor.side)
      const aiAction = aiDecide(actor, allies, enemies)
      const { state: next, entry } = resolveTurn(state, aiAction, rng)
      state = next

      // Capturar snapshot compacto: solo partes mutables por slot
      snapshots.push({
        actorIndex,
        turnIndex: state.turnIndex,
        round:     state.round,
        slots: state.slots.map(s => ({
          therianId:        s.therianId,
          currentHp:        s.currentHp,
          maxHp:            s.maxHp,
          shieldHp:         s.shieldHp,
          isDead:           s.isDead,
          effects:          s.effects,
          cooldowns:        s.cooldowns,
          effectiveAgility: s.effectiveAgility,
        })),
        logEntry: entry,
        status:   state.status,
        winnerId: state.winnerId,
      })

      safetyCounter++
    }
  } catch (err) {
    console.error('[pvp/action] Engine error:', err)
    return NextResponse.json({ error: 'ENGINE_ERROR', detail: String(err) }, { status: 500 })
  }

  // Reemplazar 'attacker' por el userId real del ganador
  if (state.status === 'completed' && state.winnerId === 'attacker') {
    state.winnerId = userId
    // Actualizar también el último snapshot
    if (snapshots.length > 0) {
      snapshots[snapshots.length - 1].winnerId = userId
    }
  }

  // --- Recompensas al completar la batalla ---
  let mmrDelta = 0
  let newMmr = 1000
  let rank = 'BRONCE'
  let goldEarned = 0
  let weeklyPvpWins = 0

  if (state.status === 'completed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dba = db as any
    const user = await dba.user.findUnique({
      where: { id: userId },
      select: {
        mmr: true,
        peakMmr: true,
        weeklyPvpWins: true,
        weeklyPvpResetAt: true,
        level: true,
        xp: true,
      },
    }) as {
      mmr: number
      peakMmr: number
      weeklyPvpWins: number
      weeklyPvpResetAt: Date | null
      level: number
      xp: number
    } | null

    if (user) {
      const won = state.winnerId === userId
      const mmrChange = applyMmrChange(user.mmr, won)
      newMmr = mmrChange.newMmr
      mmrDelta = mmrChange.delta
      rank = getRankFromMmr(newMmr)
      goldEarned = won ? getGoldRewardByRank(rank as Parameters<typeof getGoldRewardByRank>[0]) : 0

      // Lazy weekly reset
      const resetNeeded = needsWeeklyReset(user.weeklyPvpResetAt)
      const currentWeeklyWins = resetNeeded ? 0 : user.weeklyPvpWins
      weeklyPvpWins = won ? currentWeeklyWins + 1 : currentWeeklyWins

      const newPeakMmr = Math.max(user.peakMmr, newMmr)

      // XP de cuenta por los Therians del equipo atacante (solo si ganó)
      let userNewXp = user.xp
      let userNewLevel = user.level
      if (won) {
        const attackerTeamIds: string[] = JSON.parse(battle.attackerTeam)
        const xpGained = PVP_XP_PER_THERIAN * attackerTeamIds.length
        userNewXp = user.xp + xpGained
        while (userNewXp >= xpToNextLevel(userNewLevel)) {
          userNewXp -= xpToNextLevel(userNewLevel)
          userNewLevel += 1
        }
      }

      const userUpdateData: Record<string, unknown> = {
        mmr: newMmr,
        peakMmr: newPeakMmr,
        weeklyPvpWins,
        ...(resetNeeded ? { weeklyPvpResetAt: new Date() } : {}),
        ...(won && goldEarned > 0 ? { gold: { increment: goldEarned } } : {}),
        ...(won ? { xp: userNewXp, level: userNewLevel } : {}),
      }

      await dba.$transaction([
        dba.pvpBattle.update({
          where: { id: battle.id },
          data: {
            state:    JSON.stringify(state),
            status:   state.status,
            winnerId: state.status === 'completed' ? (state.winnerId ?? null) : undefined,
          },
        }),
        dba.user.update({
          where: { id: userId },
          data: userUpdateData,
        }),
      ])

      return NextResponse.json({
        battleId: battle.id,
        status:   state.status,
        state,
        snapshots,
        mmrDelta,
        newMmr,
        rank,
        goldEarned,
        weeklyPvpWins,
      })
    }
  }

  // Batalla aún activa o sin usuario (fallback sin rewards)
  await db.pvpBattle.update({
    where: { id: battle.id },
    data: {
      state:    JSON.stringify(state),
      status:   state.status,
      winnerId: state.status === 'completed' ? (state.winnerId ?? null) : undefined,
    },
  })

  return NextResponse.json({
    battleId: battle.id,
    status:   state.status,
    state,
    snapshots,
  })
}
