export type EggItem = {
  id: string
  name: string
  emoji: string
  rarity: string
  description: string
  price: number
  currency: 'gold' | 'essence'
}

export const EGGS: EggItem[] = [
  {
    id: 'egg_common',
    name: 'Huevo Común',
    emoji: '🥚',
    rarity: 'COMMON',
    description: 'Sustituye un slot de fusión Común.',
    price: 100,
    currency: 'gold',
  },
  {
    id: 'egg_uncommon',
    name: 'Huevo Poco común',
    emoji: '🥚',
    rarity: 'UNCOMMON',
    description: 'Sustituye un slot de fusión Poco común.',
    price: 400,
    currency: 'gold',
  },
  {
    id: 'egg_rare',
    name: 'Huevo Raro',
    emoji: '🥚',
    rarity: 'RARE',
    description: 'Sustituye un slot de fusión Raro.',
    price: 1500,
    currency: 'gold',
  },
  {
    id: 'egg_epic',
    name: 'Huevo Épico',
    emoji: '🥚',
    rarity: 'EPIC',
    description: 'Sustituye un slot de fusión Épico.',
    price: 60,
    currency: 'essence',
  },
  {
    id: 'egg_legendary',
    name: 'Huevo Legendario',
    emoji: '🥚',
    rarity: 'LEGENDARY',
    description: 'Sustituye un slot de fusión Legendario.',
    price: 240,
    currency: 'essence',
  },
]

export const EGG_BY_ID: Record<string, EggItem> = Object.fromEntries(EGGS.map(e => [e.id, e]))
export const RARITY_TO_EGG: Record<string, EggItem> = Object.fromEntries(EGGS.map(e => [e.rarity, e]))
