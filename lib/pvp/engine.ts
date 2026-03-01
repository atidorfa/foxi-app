import type {
  TurnSlot, BattleState, ActionLogEntry, ActionResult, Aura, Archetype,
  AvatarSnapshot, AuraRuntimeState,
} from './types'
import { FORMULAS, getTypeMultiplier } from './types'
import { ABILITY_BY_ID, INNATE_BY_ARCHETYPE } from './abilities'
import type { Ability } from './abilities'
import { getAuraById, AURAS } from '../catalogs/auras'
import type { AuraEffectDef } from '../catalogs/auras'

// ─── Inicialización de batalla ────────────────────────────────────────────────

export interface InitTeamMember {
  therianId:  string
  name:       string | null
  archetype:  Archetype
  vitality:   number
  agility:    number
  instinct:   number
  charisma:   number
  auraId?:    string | null        // aura asignada en generación
  equippedAbilities: string[]      // IDs activas equipadas (max 3)
  equippedPassives:  string[]      // IDs pasivas equipadas (max 2)
  avatarSnapshot?: AvatarSnapshot
}

// Mapa legacy para retrocompatibilidad de auras sin ID
const LEGACY_AURA_MAP: Record<Archetype, string> = {
  forestal:  'forestal_vigor_roble',
  volcanico: 'volcanico_fervor_magma',
  acuatico:  'acuatico_muralla_coral',
  electrico: 'electrico_pulso_galvanico',
}

// Mapa de tipo de aura (retrocompat UI)
const AURA_TYPE_MAP: Record<Archetype, Aura['type']> = {
  forestal:  'hp',
  volcanico: 'damage',
  acuatico:  'defense',
  electrico: 'agility',
}

function initAuraState(): AuraRuntimeState {
  return {
    resurrectionUsed:  false,
    avatarUsed:        false,
    ceniCegadoraUsed:  false,
    fallenCount:       0,
    tideSurge:         0,
    llamaradaTurns:    0,
    circuitoStacks:    0,
    lastAbilityArch:   null,
    shieldLastRefresh: 1,
    velocidadActive:   false,
    tormentaTargetId:  null,
  }
}

export function initBattleState(
  attackerTeam: InitTeamMember[],
  defenderTeam: InitTeamMember[],
): BattleState {
  const attackerLeader = [...attackerTeam].sort((a, b) => b.charisma - a.charisma)[0]
  const defenderLeader = [...defenderTeam].sort((a, b) => b.charisma - a.charisma)[0]

  const attackerAura = buildAura(attackerLeader, 'attacker')
  const defenderAura = buildAura(defenderLeader, 'defender')

  const auras: Aura[] = []
  if (attackerAura) auras.push(attackerAura)
  if (defenderAura) auras.push(defenderAura)

  // Crear auraState
  const auraState = {
    attacker: initAuraState(),
    defender: initAuraState(),
  }

  // Marcar leaders
  const attackerLeaderId = attackerLeader.therianId
  const defenderLeaderId = defenderLeader.therianId

  const attackerSlots = attackerTeam.map(m =>
    buildSlot(m, 'attacker', m.therianId === attackerLeaderId)
  )
  const defenderSlots = defenderTeam.map(m =>
    buildSlot(m, 'defender', m.therianId === defenderLeaderId)
  )

  // Aplicar auras iniciales
  if (attackerAura) applyInitAuras(attackerSlots, attackerAura, auraState.attacker, attackerLeader, defenderSlots)
  if (defenderAura) applyInitAuras(defenderSlots, defenderAura, auraState.defender, defenderLeader, attackerSlots)

  // Ordenar todos los slots por effectiveAgility desc
  const allSlots = [...attackerSlots, ...defenderSlots].sort((a, b) => {
    if (b.effectiveAgility !== a.effectiveAgility) return b.effectiveAgility - a.effectiveAgility
    const aCond = hasConductividad(a)
    const bCond = hasConductividad(b)
    if (aCond && !bCond) return -1
    if (bCond && !aCond) return 1
    return 0
  })

  // ── 1v1: pick highest-agility frontliner per side (first in sorted list) ──
  const initAttacker = allSlots.find(s => s.side === 'attacker')
  const initDefender = allSlots.find(s => s.side === 'defender')
  const frontliner = (initAttacker && initDefender) ? {
    attacker: initAttacker.therianId,
    defender: initDefender.therianId,
  } : undefined

  return {
    slots:     allSlots,
    turnIndex: 0,
    round:     1,
    auras,
    auraState,
    log:       [],
    status:    'active',
    winnerId:  null,
    frontliner,
    mode:      'auto',
    phase:     'active',
  }
}

function buildSlot(m: InitTeamMember, side: 'attacker' | 'defender', isLeader: boolean): TurnSlot {
  const innate = INNATE_BY_ARCHETYPE[m.archetype]
  const maxHp = FORMULAS.maxHp(m.vitality)
  return {
    therianId:         m.therianId,
    side,
    archetype:         m.archetype,
    name:              m.name,
    currentHp:         maxHp,
    maxHp,
    baseAgility:       m.agility,
    effectiveAgility:  m.agility,
    vitality:          m.vitality,
    instinct:          m.instinct,
    charisma:          m.charisma,
    equippedAbilities: m.equippedAbilities,
    equippedPassives:  m.equippedPassives ?? [],
    innateAbilityId:   innate?.id ?? `basic_${m.archetype}`,
    cooldowns:         {},
    effects:           [],
    isDead:            false,
    shieldHp:          0,
    endureUsed:        false,
    isLeader,
    avatarSnapshot:    m.avatarSnapshot,
  }
}

function buildAura(leader: InitTeamMember, side: 'attacker' | 'defender'): Aura | null {
  const auraId = leader.auraId ?? LEGACY_AURA_MAP[leader.archetype]
  const auraDef = getAuraById(auraId) ?? getAuraById(LEGACY_AURA_MAP[leader.archetype])
  if (!auraDef) return null

  return {
    auraId:    auraDef.id,
    name:      auraDef.name,
    archetype: leader.archetype,
    type:      AURA_TYPE_MAP[leader.archetype],  // retrocompat UI
    value:     FORMULAS.auraValue(leader.charisma),
    effect:    auraDef.effect,
    side,
  }
}

// ─── Aplicar efectos de inicio ────────────────────────────────────────────────

function applyInitAuras(
  slots: TurnSlot[],
  aura: Aura,
  auraState: AuraRuntimeState,
  leader: InitTeamMember,
  enemySlots: TurnSlot[],
) {
  const fx = aura.effect
  const leaderCha = leader.charisma
  const leaderVit = leader.vitality
  const leaderAgi = leader.agility

  for (const slot of slots) {
    // HP bonus
    if (fx.hpBonus === 'vit_half') {
      const bonus = Math.round(slot.vitality * 0.5)
      slot.maxHp += bonus
      slot.currentHp += bonus
    } else if (fx.hpBonus === 'cha_third') {
      const bonus = Math.round(leaderCha * 0.3)
      slot.maxHp += bonus
      slot.currentHp += bonus
    }

    // AGI bonus
    if (fx.agiBonus === 'agi_tenth') {
      slot.effectiveAgility += Math.round(leaderAgi * 0.1)
    }

    // Instinct bonus
    if (fx.instinctBonus === 'cha_tenth') {
      slot.instinct += Math.round(leaderCha * 0.1)
    }

    // Shield inicial
    if (fx.shield === 'cha_1_5x') {
      slot.shieldHp = Math.round(leaderCha * 1.5)
    } else if (fx.shield === 'cha_1x' && !fx.escudoHidraulico) {
      // Escudo Hidráulico inicia igual pero se maneja por round
      slot.shieldHp = Math.round(leaderCha * 1.0)
    } else if (fx.escudoHidraulico) {
      slot.shieldHp = Math.round(leaderCha * 1.0)
      auraState.shieldLastRefresh = 1
    }

    // Velocidad Terminal: +9999 AGI temporal en ronda 1
    if (fx.velocidadTerminal) {
      slot.effectiveAgility += 9999
      auraState.velocidadActive = true
    }
  }

  // Polen Sedante: 15% chance de reducir AGI enemiga -10% al inicio
  if (fx.polenSedante && Math.random() < 0.15) {
    for (const enemy of enemySlots) {
      enemy.effectiveAgility = Math.round(enemy.effectiveAgility * 0.90)
    }
  }
}

// ─── Hooks por ronda ──────────────────────────────────────────────────────────

export function applyRoundStartHooks(state: BattleState, round: number) {
  for (const side of ['attacker', 'defender'] as const) {
    const aura = state.auras.find(a => a.side === side)
    const auraState = state.auraState[side]
    if (!aura) continue

    const fx = aura.effect
    const sideSlots = state.slots.filter(s => s.side === side && !s.isDead)
    const enemySlots = state.slots.filter(s => s.side !== side && !s.isDead)
    const leaderSlot = sideSlots.find(s => s.isLeader) ?? sideSlots[0]

    // Velocidad Terminal: reset en ronda 2
    if (auraState.velocidadActive && round === 2) {
      for (const slot of sideSlots) {
        slot.effectiveAgility = Math.max(slot.baseAgility, slot.effectiveAgility - 9999)
      }
      auraState.velocidadActive = false
    }

    // Ecosistema Fértil: aliado con menos HP cura VIT*0.04
    if (fx.ecosistema && leaderSlot) {
      const lowestHp = sideSlots.reduce(
        (min, s) => (s.currentHp < min.currentHp ? s : min),
        sideSlots[0]
      )
      if (lowestHp) {
        const healAmt = Math.max(1, Math.round(leaderSlot.vitality * 0.04))
        lowestHp.currentHp = Math.min(lowestHp.maxHp, lowestHp.currentHp + healAmt)
      }
    }

    // Marea Creciente: +2% acumulable por ronda (cap 20%)
    if (fx.mareaCreciente) {
      auraState.tideSurge = Math.min(0.20, auraState.tideSurge + 0.02)
    }

    // Tormenta de Iones: reduce defensa de un enemy random 10% por esta ronda
    if (fx.tormentaIones && enemySlots.length > 0) {
      const target = enemySlots[Math.floor(Math.random() * enemySlots.length)]
      auraState.tormentaTargetId = target.therianId
    } else {
      auraState.tormentaTargetId = null
    }

    // Escudo Hidráulico: refresh cada 3 rondas
    if (fx.escudoHidraulico && leaderSlot) {
      const roundsSinceLast = round - auraState.shieldLastRefresh
      if (roundsSinceLast > 0 && roundsSinceLast % 3 === 0) {
        const shieldVal = Math.round(leaderSlot.charisma * 1.0)
        for (const slot of sideSlots) {
          slot.shieldHp = shieldVal
        }
        auraState.shieldLastRefresh = round
      }
    }
  }

  // Regen from passive abilities
  for (const slot of state.slots.filter(s => !s.isDead)) {
    for (const id of (slot.equippedPassives ?? [])) {
      const ab = ABILITY_BY_ID[id]
      if (ab?.effect.regen) {
        slot.currentHp = Math.min(slot.maxHp, slot.currentHp + ab.effect.regen)
      }
    }
  }

  // DoT tick — apply damage from 'dot' effects
  for (const slot of state.slots.filter(s => !s.isDead)) {
    const dotEffects = slot.effects.filter(e => e.type === 'dot')
    for (const dot of dotEffects) {
      const baseDmg = FORMULAS.damage(slot.effectiveAgility)
      const dotDmg = Math.max(1, Math.round(baseDmg * dot.value))
      slot.currentHp = Math.max(0, slot.currentHp - dotDmg)
      if (slot.currentHp <= 0) {
        slot.isDead = true
      }
    }
  }
}

// ─── Hooks por acción del actor ───────────────────────────────────────────────

function applyOnActionHooks(
  state: BattleState,
  actor: TurnSlot,
  usedAbilityId: string,
) {
  const aura = state.auras.find(a => a.side === actor.side)
  const auraState = state.auraState[actor.side]
  if (!aura) return

  const fx = aura.effect
  const ability = ABILITY_BY_ID[usedAbilityId]

  // Corriente de Retorno: 10% chance de reducir un CD en 1
  if (fx.corrienteRetorno) {
    const cdKeys = Object.keys(actor.cooldowns).filter(k => actor.cooldowns[k] > 0)
    if (cdKeys.length > 0 && Math.random() < 0.10) {
      const key = cdKeys[Math.floor(Math.random() * cdKeys.length)]
      actor.cooldowns[key] = Math.max(0, actor.cooldowns[key] - 1)
      if (actor.cooldowns[key] === 0) delete actor.cooldowns[key]
    }
  }

  // Circuito Sincronizado: +5% AGI si usa habilidad de su arquetipo
  if (fx.circuitoSync && ability) {
    const sameArch = ability.archetype === actor.archetype
    const prevArch = auraState.lastAbilityArch
    if (sameArch && prevArch === actor.archetype && auraState.circuitoStacks < 3) {
      auraState.circuitoStacks++
      actor.effectiveAgility = Math.round(actor.effectiveAgility * 1.05)
    }
    auraState.lastAbilityArch = ability.archetype
  }
}

// ─── Hooks al morir un aliado ─────────────────────────────────────────────────

function applyOnDeathHooks(
  state: BattleState,
  deadSlot: TurnSlot,
) {
  const aura = state.auras.find(a => a.side === deadSlot.side)
  const auraState = state.auraState[deadSlot.side]
  if (!aura) return

  const fx = aura.effect
  auraState.fallenCount++

  // Núcleo en Erupción: daño a cada enemigo vivo
  if (fx.nuclErupcion) {
    const enemies = state.slots.filter(s => s.side !== deadSlot.side && !s.isDead)
    const dmg = Math.max(1, Math.round(deadSlot.baseAgility * 0.25))
    for (const enemy of enemies) {
      applyDamageToSlot(state, enemy, dmg, false) // no bypass shields
    }
  }
}

// ─── Hooks al recibir un crítico ──────────────────────────────────────────────

function applyOnCritReceivedHooks(state: BattleState, hitSlot: TurnSlot) {
  const aura = state.auras.find(a => a.side === hitSlot.side)
  const auraState = state.auraState[hitSlot.side]
  if (!aura) return

  const fx = aura.effect

  // Llamarada Vengativa: team +8% daño por 2 turnos
  if (fx.llamarada) {
    auraState.llamaradaTurns = 2
  }
}

// ─── Verificar supervivencia (Resurrección / Avatar) ─────────────────────────

function checkSurvival(
  state: BattleState,
  slot: TurnSlot,
  incomingDamage: number,
): { survive: boolean; overrideDmg: number } {
  if (slot.currentHp > incomingDamage) {
    return { survive: true, overrideDmg: incomingDamage }
  }

  // Endure passive: survive fatal blow with 1 HP (once per battle)
  if (!slot.endureUsed && slot.equippedPassives?.some(id => ABILITY_BY_ID[id]?.effect.endure)) {
    slot.endureUsed = true
    return { survive: true, overrideDmg: slot.currentHp - 1 }
  }

  const aura = state.auras.find(a => a.side === slot.side)
  const auraState = state.auraState[slot.side]
  if (!aura) return { survive: false, overrideDmg: incomingDamage }

  const fx = aura.effect

  // Avatar de la Cascada: solo el líder
  if (fx.avatarCascada && slot.isLeader && !auraState.avatarUsed) {
    auraState.avatarUsed = true
    return { survive: true, overrideDmg: slot.currentHp - 1 }
  }

  // Resurrección Silvestre: primer aliado que moriría
  if (fx.resurrection && !auraState.resurrectionUsed) {
    auraState.resurrectionUsed = true
    return { survive: true, overrideDmg: slot.currentHp - 1 }
  }

  return { survive: false, overrideDmg: incomingDamage }
}

// ─── Modificar daño saliente ──────────────────────────────────────────────────

function modifyOutgoingDamage(
  state: BattleState,
  actor: TurnSlot,
  target: TurnSlot,
  base: number,
  isBasic: boolean,
  isAoe: boolean,
): number {
  let dmg = base
  const aura = state.auras.find(a => a.side === actor.side)
  const auraState = state.auraState[actor.side]
  if (!aura) return dmg

  const fx = aura.effect
  const leaderSlot = state.slots.find(s => s.side === actor.side && s.isLeader)
  const leaderVit = leaderSlot?.vitality ?? actor.vitality
  const leaderAgi = leaderSlot?.baseAgility ?? actor.baseAgility

  // Fervor de Magma: +AGI*0.08 flat
  if (fx.flatDamageBonus === 'agi_8pct') {
    dmg += Math.round(leaderAgi * 0.08)
  }

  // Ira del Bosque: +VIT*0.05 flat
  if (fx.flatDamageBonus === 'vit_5pct') {
    dmg += Math.round(leaderVit * 0.05)
  }

  // Carga Estática: +CHA*0.15 en básicos
  if (fx.basicFlatBonus === 'cha_15pct' && isBasic) {
    const leaderCha = leaderSlot?.charisma ?? actor.charisma
    dmg += Math.round(leaderCha * 0.15)
  }

  // Presión Tectónica: pierce 5% de defensa (multiplicador)
  if (fx.pierceDef) {
    dmg = Math.round(dmg * (1 + fx.pierceDef))
  }

  // Insignia de Azufre: +10% si target tiene debuff
  if (fx.vsBuff) {
    const hasDebuff = target.effects.some(e => e.type === 'debuff')
    if (hasDebuff) dmg = Math.round(dmg * (1 + fx.vsBuff))
  }

  // Supernova Primordial: +35% en rondas 1-2
  if (fx.supernova && state.round <= 2) {
    dmg = Math.round(dmg * (1 + fx.supernova))
  }

  // Sacrificio Ígneo: +12% por caído, cap 3
  if (fx.sacrificioMod) {
    const bonus = Math.min(auraState.fallenCount, 3) * fx.sacrificioMod
    if (bonus > 0) dmg = Math.round(dmg * (1 + bonus))
  }

  // Llamarada Vengativa activa: +8%
  if (auraState.llamaradaTurns > 0) {
    dmg = Math.round(dmg * 1.08)
  }

  // Marea Creciente
  if (fx.mareaCreciente && auraState.tideSurge > 0) {
    dmg = Math.round(dmg * (1 + auraState.tideSurge))
  }

  // Voltaje de Asalto: +AGI/1000 al multiplicador
  if (fx.voltajeAsalto) {
    dmg = Math.round(dmg * (1 + actor.effectiveAgility / 1000))
  }

  return dmg
}

// ─── Modificar daño entrante ──────────────────────────────────────────────────

function modifyIncomingDamage(
  state: BattleState,
  actor: TurnSlot,   // atacante
  target: TurnSlot,  // defensor
  dmg: number,
  isBasic: boolean,
  isAoe: boolean,
  bypassShields: boolean,
): number {
  let d = dmg
  const aura = state.auras.find(a => a.side === target.side)
  const auraState = state.auraState[target.side]

  if (aura) {
    const fx = aura.effect
    const leaderSlot = state.slots.find(s => s.side === target.side && s.isLeader)
    const leaderCha = leaderSlot?.charisma ?? target.charisma

    // Raíces de Hierro: reduce entrante por CHA*0.003, cap 15%
    if (fx.incomingReduction === 'cha_3x1000_cap15') {
      const pct = Math.min(leaderCha * 0.003, 0.15)
      d = Math.round(d * (1 - pct))
    }

    // Capa de Musgo: básicos -5%
    if (fx.basicDmgReduction && isBasic) {
      d = Math.round(d * (1 - fx.basicDmgReduction))
    }

    // Abismo de Calma: AoE -25%
    if (fx.aoeReduction && isAoe) {
      d = Math.round(d * (1 - fx.aoeReduction))
    }

    // Tormenta de Iones del rival: si el target es el marcado, -10% defensa del slot
    const enemyAuraState = state.auraState[actor.side as 'attacker' | 'defender']
    if (enemyAuraState.tormentaTargetId === target.therianId) {
      d = Math.round(d * 1.10) // +10% daño recibido (menos defensa)
    }
  }

  // Escudo de daño (absorbe antes de currentHp) — ignorado por Lava Fundente
  if (target.shieldHp > 0 && !bypassShields) {
    if (d <= target.shieldHp) {
      target.shieldHp -= d
      return 0
    } else {
      d -= target.shieldHp
      target.shieldHp = 0
    }
  }

  // damageReduction from passive abilities (e.g. acu_fluid)
  for (const id of (target.equippedPassives ?? [])) {
    const ab = ABILITY_BY_ID[id]
    if (ab?.effect.damageReduction) {
      d = Math.round(d * (1 - ab.effect.damageReduction))
    }
  }

  return Math.max(0, d)
}

// ─── Aplicar daño a un slot (usado por hooks) ─────────────────────────────────

function applyDamageToSlot(
  state: BattleState,
  slot: TurnSlot,
  dmg: number,
  bypassShields: boolean,
) {
  if (slot.isDead) return
  let d = dmg
  if (slot.shieldHp > 0 && !bypassShields) {
    if (d <= slot.shieldHp) { slot.shieldHp -= d; return }
    d -= slot.shieldHp
    slot.shieldHp = 0
  }
  const { survive, overrideDmg } = checkSurvival(state, slot, d)
  slot.currentHp = Math.max(0, slot.currentHp - overrideDmg)
  if (!survive && slot.currentHp <= 0) {
    slot.isDead = true
    applyOnDeathHooks(state, slot)
  }
}

// ─── Relámpago en Cadena ──────────────────────────────────────────────────────

function applyChainLightning(
  state: BattleState,
  actor: TurnSlot,
  critDamage: number,
) {
  const aura = state.auras.find(a => a.side === actor.side)
  if (!aura?.effect.relampagoChain) return
  if (Math.random() >= 0.30) return

  const enemies = state.slots.filter(s => s.side !== actor.side && !s.isDead)
  if (enemies.length < 2) return

  // Seleccionar un segundo objetivo distinto al primer objetivo
  const secondTarget = enemies[Math.floor(Math.random() * enemies.length)]
  const chainDmg = Math.max(1, Math.round(critDamage * 0.5))
  const lavaActive = state.auras.find(a => a.side === actor.side)?.effect.lavaFundente ?? false
  applyDamageToSlot(state, secondTarget, chainDmg, lavaActive)
}

// ─── Ojo de la Tormenta (reflect debuff) ──────────────────────────────────────

function tryReflectDebuff(
  state: BattleState,
  hitSlot: TurnSlot,
  actor: TurnSlot,
  debuff: NonNullable<import('./types').AbilityEffect['debuff']>,
) {
  const aura = state.auras.find(a => a.side === hitSlot.side)
  if (!aura?.effect.ojoTormenta) return
  if (Math.random() >= 0.20) return
  actor.effects.push({
    type: 'debuff',
    stat: debuff.stat,
    value: debuff.pct,
    turnsRemaining: debuff.turns,
  })
  if (debuff.stat === 'agility') {
    actor.effectiveAgility = Math.round(actor.effectiveAgility * (1 + debuff.pct))
  }
}

// ─── Singularidad de Plasma ───────────────────────────────────────────────────

function trySingularidadPlasma(
  state: BattleState,
  actor: TurnSlot,
  target: TurnSlot,
) {
  const aura = state.auras.find(a => a.side === actor.side)
  if (!aura?.effect.singularidad) return
  if (Math.random() >= 0.10) return

  const abilities = [...target.equippedAbilities, target.innateAbilityId]
  const withCd = abilities.filter(id => {
    const ab = ABILITY_BY_ID[id]
    return ab && ab.cooldown > 0
  })
  if (withCd.length === 0) return
  const id = withCd[Math.floor(Math.random() * withCd.length)]
  target.cooldowns[id] = (target.cooldowns[id] ?? 0) + 1
}

// ─── Avance de turno ──────────────────────────────────────────────────────────

export function nextAliveIndex(state: BattleState, from: number): number {
  const n = state.slots.length
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n
    if (!state.slots[idx].isDead) return idx
  }
  return from
}

// ─── Resolución de un turno ───────────────────────────────────────────────────

export interface TurnInput {
  abilityId: string
  targetId?: string
}

export interface TurnResult {
  state:   BattleState
  entry:   ActionLogEntry
}

export function resolveTurn(state: BattleState, input: TurnInput, rng: () => number): TurnResult {
  const actor = state.slots[state.turnIndex]

  // Inicio de ronda
  const isNewRound = state.turnIndex === 0 || state.slots
    .slice(0, state.turnIndex)
    .every(s => s.isDead)
  if (isNewRound) {
    applyRoundStartHooks(state, state.round)
    // Decrementar llamaradaTurns al inicio de cada ronda
    if (state.auraState.attacker.llamaradaTurns > 0) state.auraState.attacker.llamaradaTurns--
    if (state.auraState.defender.llamaradaTurns > 0) state.auraState.defender.llamaradaTurns--
  }

  // Stun
  const stunEffect = actor.effects.find(e => e.type === 'stun' && e.turnsRemaining > 0)
  if (stunEffect) {
    // Fluidez de Manantial: 50% de ignorar stun
    const defAura = state.auras.find(a => a.side === actor.side)
    if (defAura?.effect.stunResist && Math.random() < (defAura.effect.stunResist ?? 0)) {
      // Resiste el stun: decrementar y actuar normal
      decrementEffects(actor)
      decrementCooldowns(actor)
    } else {
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
  }

  const ability = ABILITY_BY_ID[input.abilityId]
  if (!ability) throw new Error(`Ability not found: ${input.abilityId}`)

  const isBasic = ability.isInnate ?? false
  const isAoe   = ability.target === 'all'

  const targets = resolveTargets(state, actor, ability.target, input.targetId)
  const results: ActionResult[] = []

  for (const target of targets) {
    const result = resolveAction(state, actor, target, ability, rng, isBasic, isAoe)
    results.push(result)
  }

  // Reflect pasivo (ability reflect, no aura)
  const reflectDmg = results.reduce((sum, r) => sum + (r.reflected ?? 0), 0)
  if (reflectDmg > 0) {
    applyDamageToSlot(state, actor, reflectDmg, false)
  }

  // Actualizar cooldown de la habilidad usada
  if (ability.cooldown > 0) {
    actor.cooldowns[ability.id] = ability.cooldown
  }

  decrementCooldowns(actor)
  decrementEffects(actor)

  // Hooks post-acción
  applyOnActionHooks(state, actor, ability.id)

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
    state.winnerId = null
  } else if (defendersAlive.length === 0) {
    state.status = 'completed'
    state.winnerId = 'attacker'
  }

  if (state.status === 'active') {
    if (state.frontliner) {
      // In 1v1 mode: check if any frontliner just died
      let frontlinerDiedSide: 'attacker' | 'defender' | null = null
      for (const side of ['attacker', 'defender'] as const) {
        const frontierId = state.frontliner[side]
        const frontlinerSlot = state.slots.find(s => s.therianId === frontierId)
        if (frontlinerSlot?.isDead) {
          // Only pause if there are alive bench slots; otherwise victory already set above
          const aliveOnSide = state.slots.filter(s => s.side === side && !s.isDead)
          if (aliveOnSide.length > 0) {
            frontlinerDiedSide = side
          }
          break
        }
      }
      if (frontlinerDiedSide) {
        state.phase = frontlinerDiedSide === 'attacker'
          ? 'waiting_attacker_switch'
          : 'waiting_defender_switch'
        // Don't advance — action route handles the switch before resuming
      } else {
        state.phase = 'active'
        advanceTurn(state)
      }
    } else {
      advanceTurn(state)
    }
  }

  return { state, entry }
}

function resolveAction(
  state: BattleState,
  actor: TurnSlot,
  target: TurnSlot,
  ability: Ability,
  rng: () => number,
  isBasic: boolean,
  isAoe: boolean,
): ActionResult {
  const result: ActionResult = {
    targetId:   target.therianId,
    targetName: target.name,
    blocked:    false,
    died:       false,
  }

  if (ability.effect.damage !== undefined) {
    // Evasión (Niebla del Abismo) vs precisión (Sentido Voltaico)
    const defAura = state.auras.find(a => a.side === target.side)
    const atkAura = state.auras.find(a => a.side === actor.side)
    const evasionBonus = defAura?.effect.evasionBonus ?? 0
    const evasionReduction = atkAura?.effect.evasionReduction ?? 0
    const netEvasion = Math.max(0, evasionBonus - evasionReduction)

    // Ceniza Cegadora: primer ataque tiene 10% de fallar
    let cenizaMiss = false
    const defAuraState = state.auraState[target.side]
    if (defAura?.effect.ceniCegadora && !defAuraState.ceniCegadoraUsed) {
      if (Math.random() < 0.10) {
        cenizaMiss = true
        defAuraState.ceniCegadoraUsed = true
      }
    }

    if (cenizaMiss || (netEvasion > 0 && Math.random() < netEvasion)) {
      result.effect = 'Esquivado'
      return result
    }

    const baseDmg    = calcDamage(state, actor, target, ability.effect.damage)
    const modifiedDmg = modifyOutgoingDamage(state, actor, target, baseDmg, isBasic, isAoe)

    // Bloqueo por instinto (crítico cambia comportamiento)
    const blockChance = FORMULAS.blockChance(target.instinct)
    const blocked = rng() < blockChance
    result.blocked = blocked

    // Crit
    const critChance = Math.min(0.40, target.instinct / 200) // usa instinct del atacante? No, crit chance es del actor
    let actorCritChance = Math.min(0.40, actor.instinct / 200)
    // critBoost from passive abilities
    for (const id of (actor.equippedPassives ?? [])) {
      const ab = ABILITY_BY_ID[id]
      if (ab?.effect.critBoost) actorCritChance += ab.effect.critBoost
    }
    const isCrit = !blocked && rng() < actorCritChance
    let finalDamage: number

    if (isCrit) {
      const critMultBonus = atkAura?.effect.critMultiplier ?? 1.0
      finalDamage = Math.round(modifiedDmg * 1.5 * critMultBonus)
    } else {
      finalDamage = blocked ? FORMULAS.blockDamage(modifiedDmg) : modifiedDmg
    }

    // Execute: multiply damage if target HP is below threshold
    if (ability.effect.execute) {
      const hpPct = target.currentHp / target.maxHp
      if (hpPct < ability.effect.execute.threshold) {
        finalDamage = Math.round(finalDamage * ability.effect.execute.bonus)
        result.effect = 'Ejecución'
      }
    }

    // MultiHit: overrides normal single-hit path
    if (ability.effect.multiHit) {
      const { count, dmg } = ability.effect.multiHit
      const typeMultiplier = getTypeMultiplier(actor.archetype, target.archetype)
      const archetypeBonus = FORMULAS.archetypeBonus(actor.archetype, ability.archetype)
      let totalDmg = 0
      for (let i = 0; i < count; i++) {
        const baseHit = FORMULAS.damage(actor.effectiveAgility)
        const hit = Math.max(1, Math.round(baseHit * dmg * typeMultiplier * archetypeBonus))
        totalDmg += hit
      }
      const lavaActiveMulti = atkAura?.effect.lavaFundente ?? false
      const netMultiDmg = modifyIncomingDamage(state, actor, target, totalDmg, false, false, lavaActiveMulti)
      const { survive: surviveMulti, overrideDmg: overrideMulti } = checkSurvival(state, target, netMultiDmg)
      target.currentHp = Math.max(0, target.currentHp - overrideMulti)
      result.damage = overrideMulti
      if (!surviveMulti && target.currentHp <= 0) { target.isDead = true; result.died = true; applyOnDeathHooks(state, target) }
      result.effect = (result.effect ? result.effect + ', ' : '') + `${count} golpes`
    } else {
      // Lava Fundente: bypass shields
      const lavaActive = atkAura?.effect.lavaFundente ?? false

      // Aplicar reducción defensiva + shields
      const netDmg = modifyIncomingDamage(state, actor, target, finalDamage, isBasic, isAoe, lavaActive)

      // Espinas del Pantano: thorns por hit
      if (defAura?.effect.espinas === 'cha_8pct') {
        const leaderSlot = state.slots.find(s => s.side === target.side && s.isLeader)
        const thornsDmg = Math.max(1, Math.round((leaderSlot?.charisma ?? target.charisma) * 0.08))
        result.reflected = thornsDmg
      }

      // Reflect pasivo de habilidades (no de aura espinas)
      const reflectPct = getReflectPct(target)
      if (reflectPct > 0) {
        result.reflected = (result.reflected ?? 0) + Math.round(finalDamage * reflectPct)
      }

      // Verificar supervivencia antes de aplicar
      const { survive, overrideDmg } = checkSurvival(state, target, netDmg)
      target.currentHp = Math.max(0, target.currentHp - overrideDmg)
      result.damage = overrideDmg

      if (!survive && target.currentHp <= 0) {
        target.isDead = true
        result.died = true
        applyOnDeathHooks(state, target)
      }

      // Si fue crítico: chain lightning y llamarada
      if (isCrit) {
        applyOnCritReceivedHooks(state, target)
        applyChainLightning(state, actor, finalDamage)
        result.effect = (result.effect ? result.effect + ', ' : '') + 'Crítico'
      }
    }

    // DoT: apply poison/dot effect after damage
    if (ability.effect.dot) {
      target.effects.push({ type: 'dot', value: ability.effect.dot.damage, turnsRemaining: ability.effect.dot.turns })
      result.effect = (result.effect ? result.effect + ', ' : '') + `Veneno ${ability.effect.dot.turns}t`
    }

    // LifeSteal: heal actor for a fraction of damage dealt
    if (ability.effect.lifeSteal && result.damage) {
      const stolen = Math.round(result.damage * ability.effect.lifeSteal)
      actor.currentHp = Math.min(actor.maxHp, actor.currentHp + stolen)
      result.effect = (result.effect ? result.effect + ', ' : '') + `+${stolen} HP`
    }

    // StunChance: random chance to stun after dealing damage
    if (ability.effect.stunChance && Math.random() < ability.effect.stunChance) {
      const hasImmunity = target.equippedPassives?.some(id => ABILITY_BY_ID[id]?.effect.immunity === 'stun')
      if (!hasImmunity) {
        target.effects.push({ type: 'stun', value: 1, turnsRemaining: 1 })
        result.stun = 1
      }
    }

    // Singularidad de Plasma
    trySingularidadPlasma(state, actor, target)
  }

  // Shield (target: self) — handled outside damage block
  if (ability.effect.shield) {
    actor.shieldHp = (actor.shieldHp ?? 0) + ability.effect.shield
    result.effect = `+${ability.effect.shield} escudo`
  }

  // Curación
  if (ability.effect.heal !== undefined) {
    const atkAura = state.auras.find(a => a.side === actor.side)
    const healMultiplier = defSideHealBonus(state, target)
    const healAmt = Math.round(FORMULAS.heal(actor.vitality) * ability.effect.heal * healMultiplier)
    target.currentHp = Math.min(target.maxHp, target.currentHp + healAmt)
    result.heal = healAmt

    // Bendición de las Profundidades: +20% del heal al aliado más bajo
    const healerAura = state.auras.find(a => a.side === actor.side)
    if (healerAura?.effect.bendicion) {
      const allies = state.slots.filter(s => s.side === actor.side && !s.isDead && s.therianId !== target.therianId)
      if (allies.length > 0) {
        const lowestHp = allies.reduce((min, s) => s.currentHp < min.currentHp ? s : min, allies[0])
        const overflow = Math.round(healAmt * 0.20)
        lowestHp.currentHp = Math.min(lowestHp.maxHp, lowestHp.currentHp + overflow)
      }
    }
  }

  // Stun
  if (ability.effect.stun && !result.blocked) {
    const defAura = state.auras.find(a => a.side === target.side)
    const stunResist = defAura?.effect.stunResist ?? 0
    const hasStunImmunity = target.equippedPassives?.some(id => ABILITY_BY_ID[id]?.effect.immunity === 'stun')
    if (!hasStunImmunity && (!stunResist || Math.random() >= stunResist)) {
      target.effects.push({ type: 'stun', value: ability.effect.stun, turnsRemaining: ability.effect.stun })
      result.stun = ability.effect.stun
    }
  }

  // Debuffs
  if (ability.effect.debuff && !result.blocked) {
    const { stat, pct, turns } = ability.effect.debuff
    const hasDebuffImmunity = target.equippedPassives?.some(id => ABILITY_BY_ID[id]?.effect.immunity === 'debuff')
    if (!hasDebuffImmunity) {
      // Ojo de la Tormenta: 20% de reflejar el debuff
      tryReflectDebuff(state, target, actor, ability.effect.debuff)
      target.effects.push({ type: 'debuff', stat, value: pct, turnsRemaining: turns })
      if (stat === 'agility') {
        target.effectiveAgility = Math.round(target.effectiveAgility * (1 + pct))
      }
      result.effect = `${stat} ${pct > 0 ? '+' : ''}${Math.round(pct * 100)}% por ${turns} turnos`
    }
  }

  // Buffs
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

// ─── Helpers de daño ─────────────────────────────────────────────────────────

function calcDamage(
  state: BattleState,
  actor: TurnSlot,
  target: TurnSlot,
  abilityMultiplier: number,
): number {
  const base    = FORMULAS.damage(actor.effectiveAgility)
  const typeMod = getTypeMultiplier(actor.archetype, target.archetype)
  const archMod = FORMULAS.archetypeBonus(actor.archetype, ABILITY_BY_ID[actor.innateAbilityId]?.archetype ?? actor.archetype)

  // Debuff de daño activo en el actor
  const dmgDebuff = actor.effects.find(e => e.type === 'debuff' && e.stat === 'damage')
  const actorDmgMod = dmgDebuff ? 1 + dmgDebuff.value : 1

  const raw = base * abilityMultiplier * typeMod * archMod * actorDmgMod
  return Math.max(1, Math.round(raw))
}

function defSideHealBonus(state: BattleState, target: TurnSlot): number {
  const aura = state.auras.find(a => a.side === target.side)
  return aura?.effect.healBonus ?? 1.0
}

function getReflectPct(target: TurnSlot): number {
  let pct = 0
  for (const id of (target.equippedPassives ?? [])) {
    const ab = ABILITY_BY_ID[id]
    if (!ab) continue
    if (ab.effect.thorns) pct += ab.effect.thorns
    if (ab.effect.reflect) pct += ab.effect.reflect
  }
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
  if (targetId) {
    const t = enemies.find(s => s.therianId === targetId)
    if (t) return [t]
  }
  return enemies.length > 0 ? [enemies[0]] : []
}

export function advanceTurn(state: BattleState) {
  if (state.frontliner) {
    // 1v1: alternate between frontliners
    const current = state.slots[state.turnIndex]
    const otherSide = current?.side === 'attacker' ? 'defender' : 'attacker'
    const otherFrontierId = state.frontliner[otherSide]
    const nextIdx = state.slots.findIndex(s => s.therianId === otherFrontierId && !s.isDead)
    if (nextIdx >= 0) {
      if (nextIdx <= state.turnIndex) state.round++
      state.turnIndex = nextIdx
    }
    // If nextIdx === -1: other frontliner is dead → phase will be set by resolveTurn
    return
  }
  // Original 3v3 round-robin logic
  const next = nextAliveIndex(state, state.turnIndex)
  if (next <= state.turnIndex) state.round++
  state.turnIndex = next
}

/** Aplica un cambio de frontliner para el lado indicado y ajusta turnIndex si es necesario. */
export function applyFrontlinerSwitch(
  state: BattleState,
  side: 'attacker' | 'defender',
  therianId: string,
): void {
  if (!state.frontliner) return
  const slot = state.slots.find(s => s.therianId === therianId && s.side === side && !s.isDead)
  if (!slot) return
  state.frontliner[side] = therianId
  // If it's this side's turn, update turnIndex to the new frontliner
  const current = state.slots[state.turnIndex]
  if (current?.side === side) {
    const newIdx = state.slots.findIndex(s => s.therianId === therianId)
    if (newIdx >= 0) state.turnIndex = newIdx
  }
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
  for (const effect of slot.effects) {
    if (effect.turnsRemaining === 0 && effect.stat === 'agility') {
      slot.effectiveAgility = Math.round(slot.effectiveAgility / (1 + effect.value))
    }
  }
  slot.effects = slot.effects.filter(e => e.turnsRemaining > 0)
}

export function hasConductividad(slot: TurnSlot): boolean {
  return (slot.equippedPassives ?? []).includes('ele_cond')
}

// ─── Helpers de consulta ──────────────────────────────────────────────────────

export function getActiveSlot(state: BattleState): TurnSlot {
  return state.slots[state.turnIndex]
}

export function isPlayerTurn(state: BattleState): boolean {
  return getActiveSlot(state).side === 'attacker'
}
