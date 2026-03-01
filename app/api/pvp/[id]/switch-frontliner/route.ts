import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { applyFrontlinerSwitch, advanceTurn } from '@/lib/pvp/engine'
import type { BattleState } from '@/lib/pvp/types'

const schema = z.object({
  therianId: z.string(),
})

const SWITCH_COOLDOWN_MS = 10_000

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

  // Only allow switch when in active phase OR waiting_attacker_switch
  const allowedPhases = ['active', 'waiting_attacker_switch'] as const
  if (!allowedPhases.includes(state.phase as typeof allowedPhases[number])) {
    return NextResponse.json({ error: 'SWITCH_NOT_ALLOWED', phase: state.phase }, { status: 400 })
  }

  // Check cooldown (only for voluntary switches, not for forced switches on death)
  const isForced = state.phase === 'waiting_attacker_switch'
  if (!isForced && state.switchCooldownEnd && Date.now() < state.switchCooldownEnd) {
    const remainingMs = state.switchCooldownEnd - Date.now()
    return NextResponse.json({ error: 'SWITCH_COOLDOWN', remainingMs }, { status: 429 })
  }

  let body
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 }) }

  const { therianId } = body

  // Validate: must be an alive attacker slot that is not the current frontliner
  const slot = state.slots.find(s => s.therianId === therianId && s.side === 'attacker' && !s.isDead)
  if (!slot) {
    return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 })
  }
  if (state.frontliner?.attacker === therianId) {
    return NextResponse.json({ error: 'ALREADY_FRONTLINER' }, { status: 400 })
  }

  const outId = state.frontliner?.attacker ?? null
  applyFrontlinerSwitch(state, 'attacker', therianId)
  state.phase = 'active'

  // Set cooldown only for voluntary switches
  if (!isForced) {
    state.switchCooldownEnd = Date.now() + SWITCH_COOLDOWN_MS
  }

  // After the switch, if it was a forced switch, advance the turn to continue battle
  if (isForced) {
    advanceTurn(state)
  }

  await db.pvpBattle.update({
    where: { id: battle.id },
    data: {
      state:  JSON.stringify(state),
      status: state.status,
    },
  })

  return NextResponse.json({
    battleId:           battle.id,
    status:             state.status,
    state,
    switchCooldownEnd:  state.switchCooldownEnd ?? null,
    switchEvent: outId ? { side: 'attacker', outId, inId: therianId } : undefined,
    phase:              state.phase,
  })
}
