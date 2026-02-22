import { createSeed, createRNG } from './prng'
import { SPECIES, getSpeciesById } from '../catalogs/species'
import { TRAITS, getTraitById } from '../catalogs/traits'
import { PALETTES, EYES, PATTERNS, SIGNATURES } from '../catalogs/appearance'

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'

export interface TherianAppearance {
  palette: string
  eyes: string
  pattern: string
  signature: string
}

export interface TherianStats {
  vitality: number
  agility: number
  instinct: number
  charisma: number
}

export interface GeneratedTherian {
  seed: string
  timestamp: number
  rarity: Rarity
  speciesId: string
  traitId: string
  stats: TherianStats
  appearance: TherianAppearance
}

const RARITY_WEIGHTS = [
  { value: 'COMMON'    as Rarity, weight: 60000 },
  { value: 'UNCOMMON'  as Rarity, weight: 25000 },
  { value: 'RARE'      as Rarity, weight: 10000 },
  { value: 'EPIC'      as Rarity, weight:  4000 },
  { value: 'LEGENDARY' as Rarity, weight:   999 },
  { value: 'MYTHIC'    as Rarity, weight:     1 },
]

const RARITY_BONUS: Record<Rarity, number> = {
  COMMON:    0,
  UNCOMMON:  3,
  RARE:      8,
  EPIC:     15,
  LEGENDARY: 25,
  MYTHIC:    40,
}

function clamp(value: number, min = 1, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function generateTherian(userId: string, secret: string): GeneratedTherian {
  const timestamp = Date.now()
  const seed = createSeed(userId, timestamp, secret)
  const rng = createRNG(seed)

  // 1. Rareza
  const rarity = rng.weighted(RARITY_WEIGHTS)

  // 2. Especie
  const species = rng.choice(SPECIES)

  // 3. Trait
  const trait = rng.choice(TRAITS)

  // 4. Stats
  const rarityBonus = RARITY_BONUS[rarity]
  const base = 50

  const stats: TherianStats = {
    vitality: clamp(base + rng.range(-10, 10) + species.bias.vitality + trait.mod.vitality + rarityBonus),
    agility:  clamp(base + rng.range(-10, 10) + species.bias.agility  + trait.mod.agility  + rarityBonus),
    instinct: clamp(base + rng.range(-10, 10) + species.bias.instinct + trait.mod.instinct + rarityBonus),
    charisma: clamp(base + rng.range(-10, 10) + species.bias.charisma + trait.mod.charisma + rarityBonus),
  }

  // 5. Apariencia
  const appearance: TherianAppearance = {
    palette:   rng.choice(PALETTES).id,
    eyes:      rng.choice(EYES).id,
    pattern:   rng.choice(PATTERNS).id,
    signature: rng.choice(SIGNATURES).id,
  }

  return { seed, timestamp, rarity, speciesId: species.id, traitId: trait.id, stats, appearance }
}

// Re-exportar para conveniencia
export { getSpeciesById, getTraitById }

export const RARITY_ORDER: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']

export function getNextRarity(rarity: Rarity): Rarity | null {
  const idx = RARITY_ORDER.indexOf(rarity)
  if (idx === -1 || idx === RARITY_ORDER.length - 1) return null
  return RARITY_ORDER[idx + 1]
}

export function generateTherianWithRarity(userId: string, secret: string, forcedRarity: Rarity): GeneratedTherian {
  const timestamp = Date.now()
  const seed = createSeed(userId, timestamp, secret)
  const rng = createRNG(seed)

  const species = rng.choice(SPECIES)
  const trait = rng.choice(TRAITS)

  const rarityBonus = RARITY_BONUS[forcedRarity]
  const base = 50

  const stats: TherianStats = {
    vitality: clamp(base + rng.range(-10, 10) + species.bias.vitality + trait.mod.vitality + rarityBonus),
    agility:  clamp(base + rng.range(-10, 10) + species.bias.agility  + trait.mod.agility  + rarityBonus),
    instinct: clamp(base + rng.range(-10, 10) + species.bias.instinct + trait.mod.instinct + rarityBonus),
    charisma: clamp(base + rng.range(-10, 10) + species.bias.charisma + trait.mod.charisma + rarityBonus),
  }

  const appearance: TherianAppearance = {
    palette:   rng.choice(PALETTES).id,
    eyes:      rng.choice(EYES).id,
    pattern:   rng.choice(PATTERNS).id,
    signature: rng.choice(SIGNATURES).id,
  }

  return { seed, timestamp, rarity: forcedRarity, speciesId: species.id, traitId: trait.id, stats, appearance }
}
