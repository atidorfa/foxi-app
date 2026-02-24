// ─── Tipos base ───────────────────────────────────────────────────────────────

export type Archetype = 'forestal' | 'electrico' | 'acuatico' | 'volcanico'
export type AbilityType = 'active' | 'passive'
export type TargetType = 'single' | 'all' | 'self' | 'ally'
export type AuraType = 'hp' | 'damage' | 'defense' | 'agility'
export type EffectType = 'buff' | 'debuff' | 'stun'

// ─── Tabla de ventajas elementales ───────────────────────────────────────────
// volcanico > forestal, forestal > acuatico, acuatico > volcanico
// electrico = neutral

export const TYPE_CHART: Partial<Record<Archetype, Partial<Record<Archetype, number>>>> = {
  volcanico: { forestal: 1.25, acuatico: 0.75 },
  forestal:  { acuatico: 1.25, volcanico: 0.75 },
  acuatico:  { volcanico: 1.25, forestal: 0.75 },
  electrico: {},
}

export function getTypeMultiplier(attacker: Archetype, defender: Archetype): number {
  return TYPE_CHART[attacker]?.[defender] ?? 1.0
}

// ─── Habilidades ──────────────────────────────────────────────────────────────

export interface AbilityEffect {
  damage?:  number                                     // multiplicador de daño base (1.0 = normal)
  heal?:    number                                     // multiplicador de curación base (1.0 = normal)
  stun?:    number                                     // turnos de stun
  reflect?: number                                     // % daño reflejado (pasivo)
  damageReduction?: number                             // % reducción de daño entrante (pasivo)
  tiebreaker?: boolean                                 // actúa primero en empate de agility (pasivo)
  buff?:  { stat: 'agility' | 'damage'; pct: number; turns: number }
  debuff?: { stat: 'agility' | 'damage'; pct: number; turns: number }
}

export interface Ability {
  id:        string
  name:      string
  archetype: Archetype
  type:      AbilityType
  cooldown:  number        // 0 = sin cooldown (básico o pasivo)
  target:    TargetType
  effect:    AbilityEffect
  isInnate?: boolean       // true = ataque básico, no ocupa slot
}

// ─── Estado de combate ────────────────────────────────────────────────────────

export interface ActiveEffect {
  type:          EffectType
  stat?:         'agility' | 'damage'
  value:         number           // pct como decimal (ej. 0.25) o turnos (stun)
  turnsRemaining: number
}

export interface TurnSlot {
  therianId:         string
  side:              'attacker' | 'defender'
  archetype:         Archetype
  name:              string | null
  currentHp:         number
  maxHp:             number
  baseAgility:       number
  effectiveAgility:  number       // agility con buffs/debuffs aplicados
  vitality:          number       // para fórmulas de curación
  instinct:          number       // para fórmulas de bloqueo
  equippedAbilities: string[]     // IDs de habilidades equipadas (max 4)
  innateAbilityId:   string       // básico innato según arquetipo
  cooldowns:         Record<string, number>  // abilityId → turnos restantes
  effects:           ActiveEffect[]
  isDead:            boolean
}

export interface ActionLogEntry {
  turn:       number
  actorId:    string
  actorName:  string | null
  abilityId:  string
  abilityName: string
  targetIds:  string[]
  results:    ActionResult[]
}

export interface ActionResult {
  targetId:   string
  targetName: string | null
  blocked:    boolean
  damage?:    number
  heal?:      number
  stun?:      number
  effect?:    string       // descripción textual del efecto
  reflected?: number       // daño reflejado al atacante
  died:       boolean
}

export interface Aura {
  archetype: Archetype
  type:      AuraType
  value:     number        // hp/agility como puntos, damage/defense como decimal
  side:      'attacker' | 'defender'
}

export interface BattleState {
  slots:      TurnSlot[]
  turnIndex:  number       // índice circular en slots (saltea muertos)
  round:      number
  auras:      Aura[]       // puede haber 1 por equipo (si ambos tienen líder distinto)
  log:        ActionLogEntry[]
  status:     'active' | 'completed'
  winnerId:   string | null  // userId del ganador, o null si ganó el defensor
}

// ─── IA ───────────────────────────────────────────────────────────────────────

export interface AIAction {
  abilityId: string
  targetId?: string        // undefined = AoE o self
}

// ─── Fórmulas ─────────────────────────────────────────────────────────────────

export const FORMULAS = {
  maxHp:       (vitality: number) => Math.round(50 + vitality * 3),
  damage:      (agility: number)  => agility * 0.5 + 10,
  heal:        (vitality: number) => Math.round(15 + vitality * 0.4),
  blockChance: (instinct: number) => instinct / 300,   // 0–33% a max 100
  blockDamage: (dmg: number)      => Math.round(dmg * 0.40),
  auraValue:   (charisma: number) => charisma * 0.2,   // puntos (hp/agi) o decimal * 0.001 (dmg/def)
  archetypeBonus: (therianArch: Archetype, abilityArch: Archetype) =>
    therianArch === abilityArch ? 1.15 : 1.0,
} as const
