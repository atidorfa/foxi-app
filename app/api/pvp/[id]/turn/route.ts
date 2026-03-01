import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { resolveTurn, getActiveSlot, applyFrontlinerSwitch, advanceTurn } from '@/lib/pvp/engine'
import { aiDecide, aiDecideSwitch } from '@/lib/pvp/ai'
import type { BattleState, TurnSnapshot } from '@/lib/pvp/types'
import {
  applyMmrChange,
  getRankFromMmr,
  getGoldRewardByRank,
  needsWeeklyReset,
} from '@/lib/pvp/mmr'

const PVP_XP_PER_THERIAN = 30

function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

const schema = z.object({
  abilityId: z.string(),
  targetId:  z.string().optional(),
})

function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xFFFFFFFF
  }
}

function makeSlotSnapshot(s: BattleState['slots'][0]) {
  return {
    therianId:        s.therianId,
    currentHp:        s.currentHp,
    maxHp:            s.maxHp,
    shieldHp:         s.shieldHp,
    isDead:           s.isDead,
    effects:          s.effects,
    cooldowns:        s.cooldowns,
    effectiveAgility: s.effectiveAgility,
  }
}

function makeSwitchSnapshot(
  state: BattleState,
  side: 'attacker' | 'defender',
  outId: string,
  inId: string,
  inName: string | null,
): TurnSnapshot {
  return {
    actorIndex:  state.turnIndex,
    turnIndex:   state.turnIndex,
    round:       state.round,
    slots:       state.slots.map(makeSlotSnapshot),
    logEntry: {
      turn:        state.round,
      actorId:     inId,
      actorName:   inName,
      abilityId:   'switch',
      abilityName: 'Cambio de Therian',
      targetIds:   [],
      results:     [],
    },
    status:      state.status,
    winnerId:    state.winnerId,
    switchEvent: { side, outId, inId },
    frontliner:  state.frontliner ? { ...state.frontliner } : undefined,
    phase:       state.phase,
  }
}

export async function POST(
  req: NextRequest,
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

  if (state.status !== 'active') {
    return NextResponse.json({ error: 'BATTLE_NOT_ACTIVE' }, { status: 400 })
  }
  if (state.mode !== 'manual') {
    return NextResponse.json({ error: 'NOT_MANUAL_MODE' }, { status: 400 })
  }

  // Must be player's turn
  if (state.phase === 'waiting_attacker_switch') {
    return NextResponse.json({ error: 'WAITING_SWITCH', phase: state.phase }, { status: 400 })
  }
  if (state.phase === 'waiting_defender_switch') {
    // AI handles defender switch automatically before player acts
    return NextResponse.json({ error: 'WAITING_SWITCH', phase: state.phase }, { status: 400 })
  }

  const currentActor = getActiveSlot(state)
  if (currentActor.side !== 'attacker') {
    return NextResponse.json({ error: 'NOT_YOUR_TURN' }, { status: 400 })
  }

  let body
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 }) }

  // Validate the ability belongs to the player's frontliner
  const frontliners = state.frontliner
  if (frontliners) {
    const myFrontliner = state.slots.find(s => s.therianId === frontliners.attacker)
    if (!myFrontliner) {
      return NextResponse.json({ error: 'FRONTLINER_NOT_FOUND' }, { status: 400 })
    }
    const validAbilities = [...myFrontliner.equippedAbilities, myFrontliner.innateAbilityId]
    if (!validAbilities.includes(body.abilityId)) {
      return NextResponse.json({ error: 'INVALID_ABILITY' }, { status: 400 })
    }
  }

  const rng = makeRng(Date.now())
  const snapshots: TurnSnapshot[] = []

  try {
    // ── Player's turn ────────────────────────────────────────────────────────
    const playerActorIndex = state.turnIndex
    const { state: afterPlayer, entry: playerEntry } = resolveTurn(
      state,
      { abilityId: body.abilityId, targetId: body.targetId },
      rng,
    )
    state = afterPlayer

    snapshots.push({
      actorIndex:  playerActorIndex,
      turnIndex:   state.turnIndex,
      round:       state.round,
      slots:       state.slots.map(makeSlotSnapshot),
      logEntry:    playerEntry,
      status:      state.status,
      winnerId:    state.winnerId,
      frontliner:  state.frontliner ? { ...state.frontliner } : undefined,
      phase:       state.phase,
    })

    // Handle if defender frontliner died from player's attack
    if (state.status === 'active' && state.phase === 'waiting_defender_switch') {
      const outId = state.frontliner!.defender
      let newId = aiDecideSwitch(state, 'defender')
      if (!newId) {
        const firstAlive = state.slots.find(s => s.side === 'defender' && !s.isDead)
        newId = firstAlive?.therianId ?? null
      }
      if (newId) {
        const inSlot = state.slots.find(s => s.therianId === newId)
        applyFrontlinerSwitch(state, 'defender', newId)
        state.phase = 'active'
        advanceTurn(state)
        snapshots.push(makeSwitchSnapshot(state, 'defender', outId, newId, inSlot?.name ?? null))
      }
    }

    // ── AI's turn (if battle still active and it's AI's turn) ────────────────
    if (state.status === 'active' && state.phase === 'active') {
      // Check if AI should proactively switch before acting
      if (state.frontliner) {
        const defenderSwitchId = aiDecideSwitch(state, 'defender')
        if (defenderSwitchId) {
          const outId = state.frontliner.defender
          const inSlot = state.slots.find(s => s.therianId === defenderSwitchId)
          applyFrontlinerSwitch(state, 'defender', defenderSwitchId)
          snapshots.push(makeSwitchSnapshot(state, 'defender', outId, defenderSwitchId, inSlot?.name ?? null))
        }
      }

      // AI acts
      if (state.status === 'active') {
        const aiActorIndex = state.turnIndex
        const aiActor  = getActiveSlot(state)
        const aiAllies = state.slots.filter(s => s.side === aiActor.side)
        const aiEnemies = state.slots.filter(s => s.side !== aiActor.side)
        const aiAction = aiDecide(aiActor, aiAllies, aiEnemies)
        const { state: afterAI, entry: aiEntry } = resolveTurn(state, aiAction, rng)
        state = afterAI

        snapshots.push({
          actorIndex:  aiActorIndex,
          turnIndex:   state.turnIndex,
          round:       state.round,
          slots:       state.slots.map(makeSlotSnapshot),
          logEntry:    aiEntry,
          status:      state.status,
          winnerId:    state.winnerId,
          frontliner:  state.frontliner ? { ...state.frontliner } : undefined,
          phase:       state.phase,
        })

        // Handle if attacker frontliner died from AI's attack
        if (state.status === 'active' && state.phase === 'waiting_attacker_switch') {
          // Player must switch — leave phase as-is, client shows switch UI
        }
      }
    }
  } catch (err) {
    console.error('[pvp/turn] Engine error:', err)
    return NextResponse.json({ error: 'ENGINE_ERROR', detail: String(err) }, { status: 500 })
  }

  // Resolve winner alias
  if (state.status === 'completed' && state.winnerId === 'attacker') {
    state.winnerId = userId
    if (snapshots.length > 0) {
      snapshots[snapshots.length - 1].winnerId = userId
    }
  }

  // ── Rewards on completion ────────────────────────────────────────────────
  let mmrDelta = 0, newMmr = 1000, rank = 'BRONCE', goldEarned = 0, weeklyPvpWins = 0

  if (state.status === 'completed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dba = db as any
    const user = await dba.user.findUnique({
      where: { id: userId },
      select: { mmr: true, peakMmr: true, weeklyPvpWins: true, weeklyPvpResetAt: true, level: true, xp: true },
    }) as { mmr: number; peakMmr: number; weeklyPvpWins: number; weeklyPvpResetAt: Date | null; level: number; xp: number } | null

    if (user) {
      const won        = state.winnerId === userId
      const mmrChange  = applyMmrChange(user.mmr, won)
      newMmr           = mmrChange.newMmr
      mmrDelta         = mmrChange.delta
      rank             = getRankFromMmr(newMmr)
      goldEarned       = won ? getGoldRewardByRank(rank as Parameters<typeof getGoldRewardByRank>[0]) : 0

      const resetNeeded       = needsWeeklyReset(user.weeklyPvpResetAt)
      const currentWeeklyWins = resetNeeded ? 0 : user.weeklyPvpWins
      weeklyPvpWins           = won ? currentWeeklyWins + 1 : currentWeeklyWins

      const newPeakMmr = Math.max(user.peakMmr, newMmr)

      let userNewXp = user.xp, userNewLevel = user.level
      if (won) {
        const attackerTeamIds: string[] = JSON.parse(battle.attackerTeam)
        userNewXp = user.xp + PVP_XP_PER_THERIAN * attackerTeamIds.length
        while (userNewXp >= xpToNextLevel(userNewLevel)) {
          userNewXp -= xpToNextLevel(userNewLevel)
          userNewLevel++
        }
      }

      const userUpdateData: Record<string, unknown> = {
        mmr: newMmr, peakMmr: newPeakMmr, weeklyPvpWins,
        ...(resetNeeded ? { weeklyPvpResetAt: new Date() } : {}),
        ...(won && goldEarned > 0 ? { gold: { increment: goldEarned } } : {}),
        ...(won ? { xp: userNewXp, level: userNewLevel } : {}),
      }

      await dba.$transaction([
        dba.pvpBattle.update({
          where: { id: battle.id },
          data: { state: JSON.stringify(state), status: state.status, winnerId: state.winnerId ?? null },
        }),
        dba.user.update({ where: { id: userId }, data: userUpdateData }),
      ])

      return NextResponse.json({
        battleId: battle.id, status: state.status, state, snapshots, phase: state.phase,
        mmrDelta, newMmr, rank, goldEarned, weeklyPvpWins,
      })
    }
  }

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
    phase:    state.phase,
  })
}
