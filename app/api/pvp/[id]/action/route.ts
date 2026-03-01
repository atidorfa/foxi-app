import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { resolveTurn, getActiveSlot } from '@/lib/pvp/engine'
import { aiDecide } from '@/lib/pvp/ai'
import type { BattleState, TurnSnapshot } from '@/lib/pvp/types'

function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xFFFFFFFF
  }
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
