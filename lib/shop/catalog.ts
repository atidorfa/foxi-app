export type ShopItemType = 'cosmetic' | 'service' | 'slot'

export interface ShopItem {
  id: string
  name: string
  emoji: string
  description: string
  costGold: number
  costCoin: number
  type: ShopItemType
  accessoryId?: string
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'rename',
    name: 'Cambio de nombre',
    emoji: '✏️',
    description: 'Elige un nuevo nombre único para tu Therian.',
    costGold: 500,
    costCoin: 0,
    type: 'service',
  },
  {
    id: 'acc_glasses',
    name: 'Anteojos',
    emoji: '🕶️',
    description: 'Añade unos anteojos retro a tu Therian.',
    costGold: 300,
    costCoin: 0,
    type: 'cosmetic',
    accessoryId: 'glasses',
  },
  {
    id: 'acc_crown',
    name: 'Corona',
    emoji: '👑',
    description: 'Una corona digna de la realeza Therian.',
    costGold: 0,
    costCoin: 3,
    type: 'cosmetic',
    accessoryId: 'crown',
  },
  {
    id: 'slot_extra',
    name: 'Slot Extra de Therian',
    emoji: '🌟',
    description: 'Desbloquea un segundo Therian para adoptar.',
    costGold: 0,
    costCoin: 5,
    type: 'slot',
  },
]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(item => item.id === id)
}
