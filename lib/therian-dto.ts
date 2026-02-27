import type { Therian } from '@prisma/client'
import { getSpeciesById } from './catalogs/species'
import { getTraitById } from './catalogs/traits'
import { getPaletteById } from './catalogs/appearance'
import { getRuneById, type Rune } from './catalogs/runes'
import { getAuraById, TIER_LABEL } from './catalogs/auras'
import type { TherianStats, TherianAppearance, Rarity } from './generation/engine'
import { SHOP_ITEMS } from './shop/catalog'
import { MAX_ACTIONS } from './actions/narratives'

function parseEquippedAccessories(raw: string | null): Record<string, string> {
  try {
    const parsed = JSON.parse(raw ?? '{}')
    if (Array.isArray(parsed)) {
      // Legacy format: string[] → migrate to slot-keyed object using shop catalog
      // Elements may be typeIds ("crown") or instanceIds ("crown:uuid") — extract typeId for lookup
      const result: Record<string, string> = {}
      for (const accId of parsed as string[]) {
        const typeId = accId.includes(':') ? accId.split(':')[0] : accId
        const shopItem = SHOP_ITEMS.find(i => i.accessoryId === typeId)
        if (shopItem?.slot) result[shopItem.slot] = accId // preserve full instanceId as value
      }
      return result
    }
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

const COOLDOWN_MS = 3 * 60 * 1000 // 3 minutos (mordida)
const ACTION_COOLDOWN_MS = 3 * 60 * 1000 // 3 minutos (templar)

export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export function toTherianDTO(therian: Therian) {
  const baseStats: TherianStats = JSON.parse(therian.stats)
  
  const equippedRunesIds: string[] = JSON.parse((therian as any).equippedRunes || '[]')
  const equippedRunes = equippedRunesIds.map(id => getRuneById(id)!).filter(Boolean)

  const stats = { ...baseStats }
  for (const rune of equippedRunes) {
    if (rune.mod.vitality) stats.vitality += rune.mod.vitality
    if (rune.mod.agility) stats.agility += rune.mod.agility
    if (rune.mod.instinct) stats.instinct += rune.mod.instinct
    if (rune.mod.charisma) stats.charisma += rune.mod.charisma
  }

  const appearance: TherianAppearance = JSON.parse(therian.appearance)
  const species = getSpeciesById(therian.speciesId)
  const trait = getTraitById(therian.traitId)
  const palette = getPaletteById(appearance.palette)

  const actionsUsed = (therian as any).actionsUsed ?? 0
  const actionsMaxed = actionsUsed >= MAX_ACTIONS
  const actionGains: Record<string, number> = JSON.parse((therian as any).actionGains || '{}')

  const now = Date.now()
  const lastActionAt = therian.lastActionAt

  const actionCooldownExpiry = lastActionAt
    ? new Date(lastActionAt).getTime() + ACTION_COOLDOWN_MS
    : 0
  const actionInCooldown = now < actionCooldownExpiry
  const canAct = !actionsMaxed && !actionInCooldown
  const nextActionAt = actionInCooldown
    ? new Date(actionCooldownExpiry).toISOString()
    : null

  const lastBiteAt = therian.lastBiteAt
  const canBite = !lastBiteAt || (now - new Date(lastBiteAt).getTime() > COOLDOWN_MS)
  const nextBiteAt = lastBiteAt
    ? new Date(new Date(lastBiteAt).getTime() + COOLDOWN_MS).toISOString()
    : null

  return {
    id: therian.id,
    name: therian.name ?? null,
    bites: therian.bites,
    deaths: (therian as any).deaths ?? 0,
    species: species
      ? { id: species.id, name: species.name, emoji: species.emoji, lore: species.lore }
      : { id: therian.speciesId, name: therian.speciesId, emoji: '?', lore: '' },
    rarity: therian.rarity as Rarity,
    trait: trait
      ? { id: trait.id, name: trait.name, lore: trait.lore }
      : { id: therian.traitId, name: therian.traitId, lore: '' },
    appearance: {
      palette: appearance.palette,
      paletteColors: palette
        ? { primary: palette.primary, secondary: palette.secondary, accent: palette.accent }
        : { primary: '#888', secondary: '#555', accent: '#aaa' },
      eyes: appearance.eyes,
      pattern: appearance.pattern,
      signature: appearance.signature,
    },
    stats,
    baseStats,
    equippedRunes,
    equippedRunesIds,
    lastActionAt: lastActionAt ? lastActionAt.toISOString() : null,
    canAct,
    nextActionAt,
    actionsUsed,
    actionsMaxed,
    actionGains,
    canBite,
    nextBiteAt,
    equippedAccessories: parseEquippedAccessories(therian.accessories ?? null),
    equippedAbilities: JSON.parse(therian.equippedAbilities || '[]') as string[],
    aura: (() => {
      const auraId = (therian as any).auraId as string | null | undefined
      if (!auraId) return null
      const def = getAuraById(auraId)
      if (!def) return null
      return {
        id:          def.id,
        name:        def.name,
        description: def.description,
        tier:        def.tier,
        tierLabel:   TIER_LABEL[def.tier],
        archetype:   def.archetype,
      }
    })(),
    status: therian.status,
    createdAt: therian.createdAt.toISOString(),
  }
}

export type TherianDTO = ReturnType<typeof toTherianDTO>
