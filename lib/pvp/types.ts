import type { AuraEffectDef } from '../catalogs/auras'
export type { AuraEffectDef }

// ─── Tipos base ───────────────────────────────────────────────────────────────

export type Archetype = 'forestal' | 'electrico' | 'acuatico' | 'volcanico'
export type AbilityType = 'active' | 'passive'
export type TargetType = 'single' | 'all' | 'self' | 'ally'
export type AuraType = 'hp' | 'damage' | 'defense' | 'agility'
export type EffectType = 'buff' | 'debuff' | 'stun' | 'dot' | 'shield_buff'

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
  // ── Activos ───────────────────────────────────────────────────────────────
  damage?:   number                                    // multiplicador de daño base (1.0 = normal)
  heal?:     number                                    // multiplicador de curación base (1.0 = normal)
  stun?:     number                                    // turnos de stun
  buff?:     { stat: 'agility' | 'damage'; pct: number; turns: number }
  debuff?:   { stat: 'agility' | 'damage'; pct: number; turns: number }
  dot?:      { damage: number; turns: number }         // daño por turno (multiplier × base dmg)
  lifeSteal?: number                                   // fracción del daño curada al actor (0–1)
  shield?:   number                                    // HP de escudo absorbido antes de currentHp
  multiHit?: { count: number; dmg: number }            // N golpes a dmg multiplicador c/u
  execute?:  { threshold: number; bonus: number }      // ×bonus si rival HP < threshold (0–1)
  stunChance?: number                                  // probabilidad de stun (0–1)
  // ── Pasivos ───────────────────────────────────────────────────────────────
  reflect?:        number          // % daño reflejado
  thorns?:         number          // igual que reflect (alias semántico)
  damageReduction?: number         // % reducción de daño entrante
  tiebreaker?:     boolean         // actúa primero en empate de agility
  regen?:          number          // HP curado al inicio de cada turno
  critBoost?:      number          // +% probabilidad de crítico
  immunity?:       'stun' | 'debuff' // inmune a efecto
  endure?:         boolean         // sobrevive 1 golpe fatal con 1HP (1x batalla)
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
  type:           EffectType
  stat?:          'agility' | 'damage'
  value:          number           // pct como decimal (ej. 0.25) o turnos (stun) o daño (dot)
  turnsRemaining: number
}

export interface AvatarSnapshot {
  appearance: {
    palette: string
    paletteColors: { primary: string; secondary: string; accent: string }
    eyes: string
    pattern: string
    signature: string
  }
  level: number
  rarity: string
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
  charisma:          number       // para fórmulas de aura
  equippedAbilities: string[]     // IDs de habilidades ACTIVAS equipadas (max 3)
  equippedPassives:  string[]     // IDs de habilidades PASIVAS equipadas (max 2)
  innateAbilityId:   string       // básico innato según arquetipo
  cooldowns:         Record<string, number>  // abilityId → turnos restantes
  effects:           ActiveEffect[]
  isDead:            boolean
  shieldHp:          number       // escudo de daño absorbido antes de currentHp
  endureUsed:        boolean      // pasiva Resiliencia ya activada esta batalla
  isLeader:          boolean      // el de mayor CHA del equipo (para Avatar de la Cascada)
  avatarSnapshot?:   AvatarSnapshot
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
  auraId:    string          // ID del catálogo (lib/catalogs/auras.ts)
  name:      string          // nombre legible
  archetype: Archetype
  type:      AuraType        // mantenido por retrocompatibilidad UI
  value:     number          // leader.charisma (mantenido por retrocompatibilidad)
  effect:    AuraEffectDef   // definición completa del efecto
  side:      'attacker' | 'defender'
}

// Estado de runtime de un aura durante la batalla
export interface AuraRuntimeState {
  resurrectionUsed:  boolean         // Resurrección Silvestre ya activada
  avatarUsed:        boolean         // Avatar de la Cascada ya activado
  ceniCegadoraUsed:  boolean         // Ceniza Cegadora ya procesada
  fallenCount:       number          // aliados caídos (Sacrificio Ígneo)
  tideSurge:         number          // acumulado de Marea Creciente (0–0.20)
  llamaradaTurns:    number          // turnos restantes del buff de Llamarada Vengativa
  circuitoStacks:    number          // stacks de Circuito Sincronizado (0–3)
  lastAbilityArch:   string | null   // arquetipo de la última habilidad usada
  shieldLastRefresh: number          // número de ronda en que se refrescó Escudo Hidráulico
  velocidadActive:   boolean         // Velocidad Terminal activa (reset en ronda 2)
  tormentaTargetId:  string | null   // therianId con -10% def por Tormenta de Iones (esta ronda)
}

export interface BattleState {
  slots:      TurnSlot[]
  turnIndex:  number       // índice circular en slots (saltea muertos)
  round:      number
  auras:      Aura[]       // puede haber 1 por equipo (si ambos tienen líder distinto)
  auraState:  {
    attacker:  AuraRuntimeState
    defender:  AuraRuntimeState
  }
  log:        ActionLogEntry[]
  status:     'active' | 'completed'
  winnerId:   string | null  // userId del ganador, o null si ganó el defensor
  // ── 1v1 system ──────────────────────────────────────────────────────────────
  frontliner?: { attacker: string; defender: string }  // therianId activo por lado
  mode?:        'auto' | 'manual'                      // auto = IA todo, manual = jugador elige
  phase?:       'active' | 'waiting_attacker_switch' | 'waiting_defender_switch'
  switchCooldownEnd?: number | null                    // Unix ms, cooldown del jugador para cambiar
}

// ─── Snapshot por turno (para animación cliente) ──────────────────────────────

/** Estado mínimo y mutable capturado después de cada turno resuelto */
export interface SlotSnapshot {
  therianId:        string
  currentHp:        number
  maxHp:            number
  shieldHp:         number
  isDead:           boolean
  effects:          ActiveEffect[]
  cooldowns:        Record<string, number>
  effectiveAgility: number
}

export interface TurnSnapshot {
  actorIndex: number           // índice del slot que actuó este turno
  turnIndex:  number           // índice del próximo en actuar
  round:      number
  slots:      SlotSnapshot[]
  logEntry:   ActionLogEntry
  status:     'active' | 'completed'
  winnerId:   string | null
  // ── 1v1 additions ──────────────────────────────────────────────────────────
  switchEvent?:  { side: 'attacker' | 'defender'; outId: string; inId: string }
  frontliner?:   { attacker: string; defender: string }
  phase?:        'active' | 'waiting_attacker_switch' | 'waiting_defender_switch'
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
