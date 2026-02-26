import type { Rarity } from '../generation/engine'

export interface PassiveMissionDef {
  id: string
  rarity: Rarity
  title: string
  description: string
  goldPer24h: number
}

export const PASSIVE_MISSIONS: PassiveMissionDef[] = [
  {
    id: 'passive_common',
    rarity: 'COMMON',
    title: 'Therian Común',
    description: 'Tienes al menos un Therian Común',
    goldPer24h: 30,
  },
  {
    id: 'passive_uncommon',
    rarity: 'UNCOMMON',
    title: 'Therian Poco Común',
    description: 'Tienes al menos un Therian Poco Común',
    goldPer24h: 120,
  },
  {
    id: 'passive_rare',
    rarity: 'RARE',
    title: 'Therian Raro',
    description: 'Tienes al menos un Therian Raro',
    goldPer24h: 480,
  },
  {
    id: 'passive_epic',
    rarity: 'EPIC',
    title: 'Therian Épico',
    description: 'Tienes al menos un Therian Épico',
    goldPer24h: 1920,
  },
  {
    id: 'passive_legendary',
    rarity: 'LEGENDARY',
    title: 'Therian Legendario',
    description: 'Tienes al menos un Therian Legendario',
    goldPer24h: 7680,
  },
  {
    id: 'passive_mythic',
    rarity: 'MYTHIC',
    title: 'Therian Mítico',
    description: 'Tienes al menos un Therian Mítico',
    goldPer24h: 30720,
  },
]

/** Collection missions: need 3 Therians of each rarity */
export interface PassiveCollectionMissionDef {
  id: string
  rarity: Rarity
  title: string
  description: string
  required: number
  goldPer24h: number
}

export const PASSIVE_COLLECTION_MISSIONS: PassiveCollectionMissionDef[] = [
  { id: 'col_common',    rarity: 'COMMON',    title: '3 Therians Comunes',      description: 'Colecciona 3 Therians Comunes',      required: 3, goldPer24h: 90    },
  { id: 'col_uncommon',  rarity: 'UNCOMMON',  title: '3 Therians Poco Comunes', description: 'Colecciona 3 Therians Poco Comunes', required: 3, goldPer24h: 360   },
  { id: 'col_rare',      rarity: 'RARE',      title: '3 Therians Raros',        description: 'Colecciona 3 Therians Raros',        required: 3, goldPer24h: 1440  },
  { id: 'col_epic',      rarity: 'EPIC',      title: '3 Therians Épicos',       description: 'Colecciona 3 Therians Épicos',       required: 3, goldPer24h: 5760  },
  { id: 'col_legendary', rarity: 'LEGENDARY', title: '3 Therians Legendarios',  description: 'Colecciona 3 Therians Legendarios',  required: 3, goldPer24h: 23040 },
  { id: 'col_mythic',    rarity: 'MYTHIC',    title: '3 Therians Míticos',      description: 'Colecciona 3 Therians Míticos',      required: 3, goldPer24h: 92160 },
]

/** Trait (archetype) collection missions: need 2 Therians of same trait */
export interface PassiveTraitMissionDef {
  id: string
  traitId: string
  title: string
  description: string
  required: number
  goldPer24h: number
}

export const PASSIVE_TRAIT_MISSIONS: PassiveTraitMissionDef[] = [
  { id: 'trait_forestal',  traitId: 'forestal',  title: '2 Therians Forestales', description: 'Colecciona 2 Therians con arquetipo Forestal',  required: 2, goldPer24h: 500  },
  { id: 'trait_electrico', traitId: 'electrico', title: '2 Therians Eléctricos',  description: 'Colecciona 2 Therians con arquetipo Eléctrico', required: 2, goldPer24h: 500  },
  { id: 'trait_acuatico',  traitId: 'acuatico',  title: '2 Therians Acuáticos',   description: 'Colecciona 2 Therians con arquetipo Acuático',  required: 2, goldPer24h: 500  },
  { id: 'trait_volcanico', traitId: 'volcanico', title: '2 Therians Volcánicos',   description: 'Colecciona 2 Therians con arquetipo Volcánico',  required: 2, goldPer24h: 500  },
]

/** ms per day */
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Max accumulation window (7 days) to prevent exploits on old accounts */
const MAX_ACCUMULATION_MS = 7 * MS_PER_DAY

/** Claim cooldown: 1 hour */
export const CLAIM_COOLDOWN_MS = 60 * 60 * 1000

export function getTotalGoldPer24h(
  activeMissions: PassiveMissionDef[],
  activeCollections: PassiveCollectionMissionDef[],
): number {
  const base = activeMissions.reduce((sum, m) => sum + m.goldPer24h, 0)
  const collection = activeCollections.reduce((sum, m) => sum + m.goldPer24h, 0)
  return base + collection
}

/**
 * Compute gold accumulated since reference time.
 * Reference time = lastPassiveClaim if set, else oldest therian createdAt (capped at 7 days).
 */
export function computeAccumulatedGold(
  totalGoldPer24h: number,
  referenceTime: Date,
  now: Date,
): number {
  const msElapsed = Math.min(now.getTime() - referenceTime.getTime(), MAX_ACCUMULATION_MS)
  if (msElapsed <= 0 || totalGoldPer24h === 0) return 0
  return (totalGoldPer24h * msElapsed) / MS_PER_DAY
}

export function getReferenceTime(
  lastPassiveClaim: Date | null,
  oldestTherianAt: Date | null,
  now: Date,
): Date {
  if (lastPassiveClaim) return lastPassiveClaim
  if (!oldestTherianAt) return now
  const sevenDaysAgo = new Date(now.getTime() - MAX_ACCUMULATION_MS)
  return oldestTherianAt < sevenDaysAgo ? sevenDaysAgo : oldestTherianAt
}

export function canClaim(lastPassiveClaim: Date | null, now: Date): boolean {
  if (!lastPassiveClaim) return true
  return now.getTime() - lastPassiveClaim.getTime() >= CLAIM_COOLDOWN_MS
}

export function nextClaimAt(lastPassiveClaim: Date | null): Date | null {
  if (!lastPassiveClaim) return null
  return new Date(lastPassiveClaim.getTime() + CLAIM_COOLDOWN_MS)
}
