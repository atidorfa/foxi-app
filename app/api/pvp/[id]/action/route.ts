import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { resolveTurn, isPlayerTurn, getActiveSlot } from '@/lib/pvp/engine'
import { aiDecide } from '@/lib/pvp/ai'
import { ABILITY_BY_ID } from '@/lib/pvp/abilities'
import type { BattleState } from '@/lib/pvp/types'

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  let body
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 }) }

  const { id } = await params
  const battle = await db.pvpBattle.findFirst({
    where: { id, attackerId: userId, status: 'active' },
  })
  if (!battle) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  let state: BattleState = JSON.parse(battle.state)

  // Verificar que es turno del jugador
  if (!isPlayerTurn(state)) {
    return NextResponse.json({ error: 'NOT_YOUR_TURN' }, { status: 400 })
  }

  const actor = getActiveSlot(state)

  // Validar habilidad: debe ser innata o equipada en este Therian
  const isInnate   = body.abilityId === actor.innateAbilityId
  const isEquipped = actor.equippedAbilities.includes(body.abilityId)
  if (!isInnate && !isEquipped) {
    return NextResponse.json({ error: 'ABILITY_NOT_EQUIPPED' }, { status: 400 })
  }

  // Validar cooldown
  if ((actor.cooldowns[body.abilityId] ?? 0) > 0) {
    return NextResponse.json({
      error: 'ABILITY_ON_COOLDOWN',
      turnsRemaining: actor.cooldowns[body.abilityId],
    }, { status: 400 })
  }

  // Validar que la habilidad existe y no es pasiva
  const ability = ABILITY_BY_ID[body.abilityId]
  if (!ability || ability.type === 'passive') {
    return NextResponse.json({ error: 'INVALID_ABILITY' }, { status: 400 })
  }

  const rng = makeRng(Date.now())

  // Resolver turno del jugador
  const { state: s1 } = resolveTurn(state, { abilityId: body.abilityId, targetId: body.targetId }, rng)
  state = s1

  // Auto-resolver turnos de IA hasta el próximo turno del jugador (o fin)
  let aiTurns = 0
  while (state.status === 'active' && !isPlayerTurn(state) && aiTurns < 20) {
    const aiActor  = getActiveSlot(state)
    const allies   = state.slots.filter(s => s.side === 'defender')
    const enemies  = state.slots.filter(s => s.side === 'attacker')
    const aiAction = aiDecide(aiActor, allies, enemies)
    const { state: next } = resolveTurn(state, aiAction, rng)
    state = next
    aiTurns++
  }

  // Determinar winnerId real (reemplazar 'attacker' por userId)
  if (state.status === 'completed' && state.winnerId === 'attacker') {
    state.winnerId = userId
  }

  // Guardar estado actualizado
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
    isPlayerTurn: state.status === 'active' ? isPlayerTurn(state) : false,
  })
}
