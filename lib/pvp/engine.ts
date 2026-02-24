import type {
  TurnSlot, BattleState, ActionLogEntry, ActionResult, Aura, Archetype,
} from './types'
import { FORMULAS, getTypeMultiplier } from './types'
import { ABILITY_BY_ID, INNATE_BY_ARCHETYPE } from './abilities'
import type { Ability } from './abilities'

// ─── Inicialización de batalla ────────────────────────────────────────────────

export interface InitTeamMember {
  therianId:  string
  name:       string | null
  archetype:  Archetype
  vitality:   number
  agility:    number
  instinct:   number
  charisma:   number
  equippedAbilities: string[]  // IDs equipadas (max 4)
}

export function initBattleState(
  attackerTeam: InitTeamMember[],
  defenderTeam: InitTeamMember[],
): BattleState {
  const attackerSlots = attackerTeam.map(m => buildSlot(m, 'attacker'))
  const defenderSlots = defenderTeam.map(m => buildSlot(m, 'defender'))

  // Calcular auras (líder = mayor charisma de cada equipo)
  const auras: Aura[] = []
  const attackerLeader = [...attackerTeam].sort((a, b) => b.charisma - a.charisma)[0]
  const defenderLeader = [...defenderTeam].sort((a, b) => b.charisma - a.charisma)[0]

  const attackerAura = buildAura(attackerLeader, 'attacker')
  const defenderAura = buildAura(defenderLeader, 'defender')
  if (attackerAura) auras.push(attackerAura)
  if (defenderAura) auras.push(defenderAura)

  // Aplicar auras a los slots
  applyAuras(attackerSlots, auras, 'attacker')
  applyAuras(defenderSlots, auras, 'defender')

  // Ordenar todos los slots por effectiveAgility desc (con tiebreaker por Conductividad)
  const allSlots = [...attackerSlots, ...defenderSlots].sort((a, b) => {
    if (b.effectiveAgility !== a.effectiveAgility) return b.effectiveAgility - a.effectiveAgility
    // Conductividad: Eléctrico gana empate
    const aCond = hasConductividad(a)
    const bCond = hasConductividad(b)
    if (aCond && !bCond) return -1
    if (bCond && !aCond) return 1
    return 0
  })

  return {
    slots:     allSlots,
    turnIndex: 0,
    round:     1,
    auras,
    log:       [],
    status:    'active',
    winnerId:  null,
  }
}

function buildSlot(m: InitTeamMember, side: 'attacker' | 'defender'): TurnSlot {
  const innate = INNATE_BY_ARCHETYPE[m.archetype]
  const maxHp = FORMULAS.maxHp(m.vitality)
  return {
    therianId:        m.therianId,
    side,
    archetype:        m.archetype,
    name:             m.name,
    currentHp:        maxHp,
    maxHp,
    baseAgility:      m.agility,
    effectiveAgility: m.agility,
    vitality:         m.vitality,
    instinct:         m.instinct,
    equippedAbilities: m.equippedAbilities,
    innateAbilityId:  innate?.id ?? `basic_${m.archetype}`,
    cooldowns:        {},
    effects:          [],
    isDead:           false,
  }
}

function buildAura(leader: InitTeamMember, side: 'attacker' | 'defender'): Aura | null {
  const value = FORMULAS.auraValue(leader.charisma)
  const auraMap: Record<Archetype, Aura['type']> = {
    forestal:  'hp',
    volcanico: 'damage',
    acuatico:  'defense',
    electrico: 'agility',
  }
  return { archetype: leader.archetype, type: auraMap[leader.archetype], value, side }
}

function applyAuras(slots: TurnSlot[], auras: Aura[], side: 'attacker' | 'defender') {
  const aura = auras.find(a => a.side === side)
  if (!aura) return
  for (const slot of slots) {
    if (aura.type === 'hp') {
      const bonus = Math.round(aura.value)
      slot.maxHp += bonus
      slot.currentHp += bonus
    } else if (aura.type === 'agility') {
      slot.effectiveAgility += Math.round(aura.value)
    }
    // damage y defense se aplican dinámicamente en calcDamage
  }
}

function hasConductividad(slot: TurnSlot): boolean {
  return slot.equippedAbilities.includes('ele_cond')
}

// ─── Avance de turno ──────────────────────────────────────────────────────────

/** Devuelve el índice del siguiente slot que debe actuar (vivo) */
export function nextAliveIndex(state: BattleState, from: number): number {
  const n = state.slots.length
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n
    if (!state.slots[idx].isDead) return idx
  }
  return from // fallback (no debería ocurrir si hay al menos 1 vivo)
}

// ─── Resolución de un turno ───────────────────────────────────────────────────

export interface TurnInput {
  abilityId: string
  targetId?: string   // undefined para AoE o self
}

export interface TurnResult {
  state:   BattleState
  entry:   ActionLogEntry
}

export function resolveTurn(state: BattleState, input: TurnInput, rng: () => number): TurnResult {
  const actor = state.slots[state.turnIndex]

  // Si está stunned → skipear turno
  const stunEffect = actor.effects.find(e => e.type === 'stun' && e.turnsRemaining > 0)
  if (stunEffect) {
    decrementEffects(actor)
    decrementCooldowns(actor)
    const entry: ActionLogEntry = {
      turn: state.round,
      actorId: actor.therianId,
      actorName: actor.name,
      abilityId: 'stun',
      abilityName: 'Aturdido',
      targetIds: [],
      results: [],
    }
    state.log.push(entry)
    advanceTurn(state)
    return { state, entry }
  }

  const ability = ABILITY_BY_ID[input.abilityId]
  if (!ability) throw new Error(`Ability not found: ${input.abilityId}`)

  const targets = resolveTargets(state, actor, ability.target, input.targetId)
  const results: ActionResult[] = []

  for (const target of targets) {
    const result = resolveAction(state, actor, target, ability, rng)
    results.push(result)
    if (target.currentHp <= 0) target.isDead = true
  }

  // Efectos de reflect: daño de vuelta al actor
  const reflectDmg = results.reduce((sum, r) => sum + (r.reflected ?? 0), 0)
  if (reflectDmg > 0) {
    actor.currentHp = Math.max(0, actor.currentHp - reflectDmg)
    if (actor.currentHp <= 0) actor.isDead = true
  }

  // Actualizar cooldown de la habilidad usada
  if (ability.cooldown > 0) {
    actor.cooldowns[ability.id] = ability.cooldown
  }

  decrementCooldowns(actor)
  decrementEffects(actor)

  const entry: ActionLogEntry = {
    turn: state.round,
    actorId: actor.therianId,
    actorName: actor.name,
    abilityId: ability.id,
    abilityName: ability.name,
    targetIds: targets.map(t => t.therianId),
    results,
  }
  state.log.push(entry)

  // Verificar victoria
  const attackersAlive = state.slots.filter(s => s.side === 'attacker' && !s.isDead)
  const defendersAlive = state.slots.filter(s => s.side === 'defender' && !s.isDead)

  if (attackersAlive.length === 0) {
    state.status = 'completed'
    state.winnerId = null  // ganó el defensor
  } else if (defendersAlive.length === 0) {
    state.status = 'completed'
    state.winnerId = 'attacker'  // reemplazar con userId en el API
  }

  if (state.status === 'active') advanceTurn(state)

  return { state, entry }
}

function resolveAction(
  state: BattleState,
  actor: TurnSlot,
  target: TurnSlot,
  ability: Ability,
  rng: () => number,
): ActionResult {
  const result: ActionResult = {
    targetId:   target.therianId,
    targetName: target.name,
    blocked:    false,
    died:       false,
  }

  // ── Habilidades de daño ──────────────────────────────────────────────────────
  if (ability.effect.damage !== undefined) {
    const rawDamage = calcDamage(state, actor, target, ability.effect.damage)

    // Bloqueo por instinto
    const blockChance = FORMULAS.blockChance(target.instinct)
    const blocked = rng() < blockChance
    result.blocked = blocked

    const finalDamage = blocked ? FORMULAS.blockDamage(rawDamage) : rawDamage

    // Reflect pasivo (Espinas / Aura Ígnea)
    const reflectPct = getReflectPct(target)
    if (reflectPct > 0) {
      result.reflected = Math.round(finalDamage * reflectPct)
    }

    target.currentHp = Math.max(0, target.currentHp - finalDamage)
    result.damage = finalDamage
    result.died = target.currentHp <= 0
  }

  // ── Habilidades de curación ──────────────────────────────────────────────────
  if (ability.effect.heal !== undefined) {
    const healAmt = Math.round(FORMULAS.heal(actor.vitality) * ability.effect.heal)
    target.currentHp = Math.min(target.maxHp, target.currentHp + healAmt)
    result.heal = healAmt
  }

  // ── Stun ────────────────────────────────────────────────────────────────────
  if (ability.effect.stun && !result.blocked) {
    target.effects.push({ type: 'stun', value: ability.effect.stun, turnsRemaining: ability.effect.stun })
    result.stun = ability.effect.stun
  }

  // ── Debuffs ──────────────────────────────────────────────────────────────────
  if (ability.effect.debuff && !result.blocked) {
    const { stat, pct, turns } = ability.effect.debuff
    target.effects.push({ type: 'debuff', stat, value: pct, turnsRemaining: turns })
    if (stat === 'agility') {
      target.effectiveAgility = Math.round(target.effectiveAgility * (1 + pct))
    }
    result.effect = `${stat} ${pct > 0 ? '+' : ''}${Math.round(pct * 100)}% por ${turns} turnos`
  }

  // ── Buffs ────────────────────────────────────────────────────────────────────
  if (ability.effect.buff) {
    const { stat, pct, turns } = ability.effect.buff
    target.effects.push({ type: 'buff', stat, value: pct, turnsRemaining: turns })
    if (stat === 'agility') {
      target.effectiveAgility = Math.round(target.effectiveAgility * (1 + pct))
    }
    result.effect = `${stat} +${Math.round(pct * 100)}% por ${turns} turnos`
  }

  return result
}

function calcDamage(
  state: BattleState,
  actor: TurnSlot,
  target: TurnSlot,
  abilityMultiplier: number,
): number {
  const base    = FORMULAS.damage(actor.effectiveAgility)
  const typeMod = getTypeMultiplier(actor.archetype, target.archetype)
  const archMod = FORMULAS.archetypeBonus(actor.archetype, ABILITY_BY_ID[actor.innateAbilityId]?.archetype ?? actor.archetype)

  // Aura de daño del atacante
  const atkAura  = state.auras.find(a => a.side === actor.side && a.type === 'damage')
  const damageMod = atkAura ? 1 + atkAura.value * 0.001 * 5 : 1

  // Aura de defensa del defensor
  const defAura  = state.auras.find(a => a.side === target.side && a.type === 'defense')
  const defenseMod = defAura ? 1 - defAura.value * 0.001 * 5 : 1

  // Debuffs de daño activos en el actor
  const dmgDebuff = actor.effects.find(e => e.type === 'debuff' && e.stat === 'damage')
  const actorDmgMod = dmgDebuff ? 1 + dmgDebuff.value : 1

  const raw = base * abilityMultiplier * typeMod * archMod * damageMod * defenseMod * actorDmgMod
  return Math.max(1, Math.round(raw))
}

function getReflectPct(target: TurnSlot): number {
  let pct = 0
  if (target.equippedAbilities.includes('for_espinas')) pct += 0.15
  if (target.equippedAbilities.includes('vol_aura'))    pct += 0.20
  return pct
}

function resolveTargets(
  state: BattleState,
  actor: TurnSlot,
  targetType: string,
  targetId?: string,
): TurnSlot[] {
  const enemies = state.slots.filter(s => s.side !== actor.side && !s.isDead)
  const allies  = state.slots.filter(s => s.side === actor.side && !s.isDead)

  if (targetType === 'all')    return enemies
  if (targetType === 'self')   return [actor]
  if (targetType === 'ally') {
    if (targetId) {
      const t = allies.find(s => s.therianId === targetId)
      return t ? [t] : [actor]
    }
    return [actor]
  }
  // 'single'
  if (targetId) {
    const t = enemies.find(s => s.therianId === targetId)
    if (t) return [t]
  }
  return enemies.length > 0 ? [enemies[0]] : []
}

function advanceTurn(state: BattleState) {
  const next = nextAliveIndex(state, state.turnIndex)
  // Si dimos una vuelta completa → incrementar round
  if (next <= state.turnIndex) state.round++
  state.turnIndex = next
}

function decrementCooldowns(slot: TurnSlot) {
  for (const id of Object.keys(slot.cooldowns)) {
    slot.cooldowns[id] = Math.max(0, slot.cooldowns[id] - 1)
    if (slot.cooldowns[id] === 0) delete slot.cooldowns[id]
  }
}

function decrementEffects(slot: TurnSlot) {
  for (const effect of slot.effects) {
    effect.turnsRemaining = Math.max(0, effect.turnsRemaining - 1)
  }
  // Revertir agility si expiró el debuff/buff correspondiente
  for (const effect of slot.effects) {
    if (effect.turnsRemaining === 0 && effect.stat === 'agility') {
      slot.effectiveAgility = Math.round(slot.effectiveAgility / (1 + effect.value))
    }
  }
  slot.effects = slot.effects.filter(e => e.turnsRemaining > 0)
}

// ─── Helpers de consulta ──────────────────────────────────────────────────────

export function getActiveSlot(state: BattleState): TurnSlot {
  return state.slots[state.turnIndex]
}

export function isPlayerTurn(state: BattleState): boolean {
  return getActiveSlot(state).side === 'attacker'
}
