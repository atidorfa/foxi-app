import type { Ability } from './types'
export type { Ability }

// ─── Ataques básicos innatos (1 por arquetipo, no ocupan slot) ────────────────

export const INNATE_ABILITIES: Ability[] = [
  {
    id: 'basic_forestal',
    name: 'Zarpazo de Raíz',
    archetype: 'forestal',
    type: 'active',
    cooldown: 0,
    target: 'single',
    effect: { damage: 1.0 },
    isInnate: true,
  },
  {
    id: 'basic_electrico',
    name: 'Descarga',
    archetype: 'electrico',
    type: 'active',
    cooldown: 0,
    target: 'single',
    effect: { damage: 1.0 },
    isInnate: true,
  },
  {
    id: 'basic_acuatico',
    name: 'Oleada',
    archetype: 'acuatico',
    type: 'active',
    cooldown: 0,
    target: 'single',
    effect: { damage: 1.0 },
    isInnate: true,
  },
  {
    id: 'basic_volcanico',
    name: 'Llamarada',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 0,
    target: 'single',
    effect: { damage: 1.0 },
    isInnate: true,
  },
]

// ─── Habilidades equipables (3 activas + 1 pasiva por arquetipo) ──────────────

export const ABILITIES: Ability[] = [
  // ── 🌿 Forestal ──────────────────────────────────────────────────────────────
  {
    id: 'for_regen',
    name: 'Regeneración',
    archetype: 'forestal',
    type: 'active',
    cooldown: 3,
    target: 'self',
    effect: { heal: 1.0 },
  },
  {
    id: 'for_enred',
    name: 'Enredadera',
    archetype: 'forestal',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { debuff: { stat: 'agility', pct: -0.25, turns: 2 } },
  },
  {
    id: 'for_espinas',
    name: 'Espinas',
    archetype: 'forestal',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { reflect: 0.15 },
  },

  // ── ⚡ Eléctrico ──────────────────────────────────────────────────────────────
  {
    id: 'ele_rayo',
    name: 'Rayo Paralizante',
    archetype: 'electrico',
    type: 'active',
    cooldown: 5,
    target: 'single',
    effect: { damage: 0.8, stun: 1 },
  },
  {
    id: 'ele_sobre',
    name: 'Sobrecarga',
    archetype: 'electrico',
    type: 'active',
    cooldown: 4,
    target: 'self',
    effect: { buff: { stat: 'agility', pct: 0.30, turns: 2 } },
  },
  {
    id: 'ele_cond',
    name: 'Conductividad',
    archetype: 'electrico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { tiebreaker: true },
  },

  // ── 💧 Acuático ───────────────────────────────────────────────────────────────
  {
    id: 'acu_marea',
    name: 'Marea Curativa',
    archetype: 'acuatico',
    type: 'active',
    cooldown: 3,
    target: 'ally',
    effect: { heal: 1.0 },
  },
  {
    id: 'acu_tsun',
    name: 'Tsunami',
    archetype: 'acuatico',
    type: 'active',
    cooldown: 5,
    target: 'all',
    effect: { damage: 0.6 },
  },
  {
    id: 'acu_fluid',
    name: 'Fluidez',
    archetype: 'acuatico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { damageReduction: 0.15 },
  },

  // ── 🔥 Volcánico ──────────────────────────────────────────────────────────────
  {
    id: 'vol_erup',
    name: 'Erupción',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 4,
    target: 'all',
    effect: { damage: 0.6 },
  },
  {
    id: 'vol_intim',
    name: 'Intimidar',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 4,
    target: 'all',
    effect: { debuff: { stat: 'damage', pct: -0.20, turns: 2 } },
  },
  {
    id: 'vol_aura',
    name: 'Aura Ígnea',
    archetype: 'volcanico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { reflect: 0.20 },
  },
]

// ─── Lookups ──────────────────────────────────────────────────────────────────

const ALL_ABILITIES = [...INNATE_ABILITIES, ...ABILITIES]
export const ABILITY_BY_ID: Record<string, Ability> = Object.fromEntries(
  ALL_ABILITIES.map(a => [a.id, a])
)

export const INNATE_BY_ARCHETYPE: Record<string, Ability> = Object.fromEntries(
  INNATE_ABILITIES.map(a => [a.archetype, a])
)
