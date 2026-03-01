import type { Ability, Archetype } from './types'
export type { Ability }

// ─── Ataques innatos (1 por arquetipo, no equipables) ─────────────────────────

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

// ─── Habilidades equipables ────────────────────────────────────────────────────

export const ABILITIES: Ability[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // 🌿 FORESTAL — 6 activas + 3 pasivas
  // ════════════════════════════════════════════════════════════════════════════

  // Activas
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
    effect: { debuff: { stat: 'agility', pct: 0.25, turns: 2 } },
  },
  {
    id: 'for_latigo',
    name: 'Látigo de Raíz',
    archetype: 'forestal',
    type: 'active',
    cooldown: 3,
    target: 'single',
    effect: { damage: 1.4 },
  },
  {
    id: 'for_cura_salvaje',
    name: 'Cura Salvaje',
    archetype: 'forestal',
    type: 'active',
    cooldown: 4,
    target: 'self',
    effect: { heal: 1.2 },
  },
  {
    id: 'for_veneno',
    name: 'Mordedura Venenosa',
    archetype: 'forestal',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { damage: 0.7, dot: { damage: 0.3, turns: 3 } },
  },
  {
    id: 'for_drenar',
    name: 'Drenar Vida',
    archetype: 'forestal',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { damage: 0.9, lifeSteal: 0.4 },
  },

  // Pasivas
  {
    id: 'for_espinas',
    name: 'Espinas',
    archetype: 'forestal',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { thorns: 0.15 },
  },
  {
    id: 'for_raices',
    name: 'Raíces Profundas',
    archetype: 'forestal',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { regen: 8 },
  },
  {
    id: 'for_resiliencia',
    name: 'Resiliencia',
    archetype: 'forestal',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { endure: true },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ⚡ ELÉCTRICO — 6 activas + 3 pasivas
  // ════════════════════════════════════════════════════════════════════════════

  // Activas
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
    id: 'ele_multirayo',
    name: 'Multirayo',
    archetype: 'electrico',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { multiHit: { count: 3, dmg: 0.45 } },
  },
  {
    id: 'ele_cortocircuito',
    name: 'Cortocircuito',
    archetype: 'electrico',
    type: 'active',
    cooldown: 5,
    target: 'single',
    effect: { debuff: { stat: 'agility', pct: 0.40, turns: 2 } },
  },
  {
    id: 'ele_tormenta',
    name: 'Tormenta Estática',
    archetype: 'electrico',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { damage: 1.3, stunChance: 0.30 },
  },
  {
    id: 'ele_pulso',
    name: 'Pulso EMP',
    archetype: 'electrico',
    type: 'active',
    cooldown: 5,
    target: 'single',
    effect: { debuff: { stat: 'damage', pct: 0.30, turns: 2 } },
  },

  // Pasivas
  {
    id: 'ele_cond',
    name: 'Conductividad',
    archetype: 'electrico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { tiebreaker: true },
  },
  {
    id: 'ele_estatica',
    name: 'Carga Estática',
    archetype: 'electrico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { critBoost: 0.15 },
  },
  {
    id: 'ele_blindaje',
    name: 'Blindaje Eléctrico',
    archetype: 'electrico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { immunity: 'stun' },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 💧 ACUÁTICO — 6 activas + 3 pasivas
  // ════════════════════════════════════════════════════════════════════════════

  // Activas
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
    id: 'acu_corriente',
    name: 'Corriente Gélida',
    archetype: 'acuatico',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { damage: 1.2, debuff: { stat: 'agility', pct: 0.20, turns: 2 } },
  },
  {
    id: 'acu_burbuja',
    name: 'Burbuja Escudo',
    archetype: 'acuatico',
    type: 'active',
    cooldown: 5,
    target: 'self',
    effect: { shield: 80 },
  },
  {
    id: 'acu_helar',
    name: 'Congelamiento',
    archetype: 'acuatico',
    type: 'active',
    cooldown: 6,
    target: 'single',
    effect: {
      debuff: { stat: 'agility', pct: 0.50, turns: 2 },
    },
  },
  {
    id: 'acu_absorber',
    name: 'Absorber',
    archetype: 'acuatico',
    type: 'active',
    cooldown: 5,
    target: 'self',
    effect: { heal: 1.4 },
  },
  {
    id: 'acu_presion',
    name: 'Presión Hidráulica',
    archetype: 'acuatico',
    type: 'active',
    cooldown: 3,
    target: 'single',
    effect: { damage: 1.1, debuff: { stat: 'damage', pct: 0.10, turns: 2 } },
  },

  // Pasivas
  {
    id: 'acu_fluid',
    name: 'Fluidez',
    archetype: 'acuatico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { damageReduction: 0.15 },
  },
  {
    id: 'acu_escama',
    name: 'Escamas de Hielo',
    archetype: 'acuatico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { thorns: 0.10 },
  },
  {
    id: 'acu_corrientevida',
    name: 'Corriente de Vida',
    archetype: 'acuatico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { regen: 12 },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 🔥 VOLCÁNICO — 6 activas + 3 pasivas
  // ════════════════════════════════════════════════════════════════════════════

  // Activas
  {
    id: 'vol_intim',
    name: 'Intimidar',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { debuff: { stat: 'damage', pct: 0.20, turns: 2 } },
  },
  {
    id: 'vol_ejecucion',
    name: 'Ejecución Ígnea',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 5,
    target: 'single',
    effect: { damage: 1.0, execute: { threshold: 0.35, bonus: 2.0 } },
  },
  {
    id: 'vol_golpe',
    name: 'Golpe Magmático',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { damage: 1.6 },
  },
  {
    id: 'vol_quemadura',
    name: 'Quemadura Profunda',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 4,
    target: 'single',
    effect: { damage: 0.8, dot: { damage: 0.4, turns: 3 } },
  },
  {
    id: 'vol_explosion',
    name: 'Explosión Controlada',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 3,
    target: 'single',
    effect: { damage: 1.3 },
  },
  {
    id: 'vol_lava',
    name: 'Lluvia de Lava',
    archetype: 'volcanico',
    type: 'active',
    cooldown: 5,
    target: 'single',
    effect: { damage: 0.9, debuff: { stat: 'damage', pct: 0.25, turns: 2 } },
  },

  // Pasivas
  {
    id: 'vol_aura',
    name: 'Aura Ígnea',
    archetype: 'volcanico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { thorns: 0.20 },
  },
  {
    id: 'vol_berserker',
    name: 'Berserker',
    archetype: 'volcanico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { critBoost: 0.20 },
  },
  {
    id: 'vol_nucleo',
    name: 'Núcleo Ardiente',
    archetype: 'volcanico',
    type: 'passive',
    cooldown: 0,
    target: 'self',
    effect: { immunity: 'debuff' },
  },
]

// ─── Índices derivados ────────────────────────────────────────────────────────

export const ALL_ABILITIES: Ability[] = [...INNATE_ABILITIES, ...ABILITIES]

export const ABILITY_BY_ID: Record<string, Ability> = Object.fromEntries(
  ALL_ABILITIES.map(a => [a.id, a])
)

export const INNATE_BY_ARCHETYPE: Record<Archetype, Ability> = {
  forestal:  INNATE_ABILITIES[0],
  electrico: INNATE_ABILITIES[1],
  acuatico:  INNATE_ABILITIES[2],
  volcanico: INNATE_ABILITIES[3],
}

/** Habilidades activas equipables por arquetipo */
export function getActiveAbilities(archetype: Archetype): Ability[] {
  return ABILITIES.filter(a => a.archetype === archetype && a.type === 'active')
}

/** Habilidades pasivas equipables por arquetipo */
export function getPassiveAbilities(archetype: Archetype): Ability[] {
  return ABILITIES.filter(a => a.archetype === archetype && a.type === 'passive')
}
