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
  slot?: string // accessory slot ID (orejas | cola | ojos | cabeza | anteojos | garras)
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
    slot: 'anteojos',
  },
  {
    id: 'acc_crown',
    name: 'Corona',
    emoji: '👑',
    description: 'Una corona digna de la realeza Therian.',
    costGold: 0,
    costCoin: 6,
    type: 'cosmetic',
    accessoryId: 'crown',
    slot: 'cabeza',
  },
  {
    id: 'slot_extra',
    name: 'Slot Extra de Therian',
    emoji: '🌟',
    description: 'Desbloquea un segundo Therian para adoptar.',
    costGold: 0,
    costCoin: 10,
    type: 'slot',
  },

  // ── OREJAS ─────────────────────────────────────────────────────────────────
  { id: 'acc_ears_wolf',  name: 'Orejas de Lobo',    emoji: '🐺', description: 'Orejas puntiagudas y altas de lobo.',          costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_wolf',  slot: 'orejas' },
  { id: 'acc_ears_fox',   name: 'Orejas de Zorro',   emoji: '🦊', description: 'Orejas enormes y puntiagudas de zorro.',        costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_fox',   slot: 'orejas' },
  { id: 'acc_ears_cat',   name: 'Orejas de Gato',    emoji: '🐱', description: 'Orejas triangulares compactas de gato.',        costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_cat',   slot: 'orejas' },
  { id: 'acc_ears_crow',  name: 'Cresta de Cuervo',  emoji: '🪶', description: 'Cresta de plumas estilizadas de cuervo.',       costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_crow',  slot: 'orejas' },
  { id: 'acc_ears_deer',  name: 'Orejas de Ciervo',  emoji: '🦌', description: 'Orejas anchas y redondeadas de ciervo.',        costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_deer',  slot: 'orejas' },
  { id: 'acc_ears_bear',  name: 'Orejas de Oso',     emoji: '🐻', description: 'Pequeñas orejas redondas de oso.',              costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'ears_bear',  slot: 'orejas' },

  // ── COLA ───────────────────────────────────────────────────────────────────
  { id: 'acc_tail_wolf',  name: 'Cola de Lobo',      emoji: '🐺', description: 'Cola voluminosa con punta clara de lobo.',      costGold: 600, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_wolf',  slot: 'cola' },
  { id: 'acc_tail_fox',   name: 'Cola de Zorro',     emoji: '🦊', description: 'Cola gigante y esponjosa de zorro.',             costGold: 700, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_fox',   slot: 'cola' },
  { id: 'acc_tail_cat',   name: 'Cola de Gato',      emoji: '🐱', description: 'Cola larga y curvada de gato.',                  costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_cat',   slot: 'cola' },
  { id: 'acc_tail_crow',  name: 'Plumas Caudales',   emoji: '🪶', description: 'Abanico de plumas caudales de cuervo.',          costGold: 600, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_crow',  slot: 'cola' },
  { id: 'acc_tail_deer',  name: 'Cola de Ciervo',    emoji: '🦌', description: 'Pequeña cola blanca de ciervo.',                 costGold: 400, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_deer',  slot: 'cola' },
  { id: 'acc_tail_bear',  name: 'Cola de Oso',       emoji: '🐻', description: 'Pequeña cola redondeada de oso.',                costGold: 400, costCoin: 0, type: 'cosmetic', accessoryId: 'tail_bear',  slot: 'cola' },

  // ── OJOS ───────────────────────────────────────────────────────────────────
  { id: 'acc_eyes_wolf',  name: 'Ojos de Lobo',      emoji: '🐺', description: 'Marcas de lágrima bajo los ojos de lobo.',       costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_wolf',  slot: 'ojos' },
  { id: 'acc_eyes_fox',   name: 'Ojos de Zorro',     emoji: '🦊', description: 'Contorno astuto alrededor de los ojos de zorro.',costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_fox',   slot: 'ojos' },
  { id: 'acc_eyes_cat',   name: 'Ojos de Gato',      emoji: '🐱', description: 'Pupila vertical felina.',                        costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_cat',   slot: 'ojos' },
  { id: 'acc_eyes_crow',  name: 'Ojos de Cuervo',    emoji: '🪶', description: 'Círculo oscuro de cuervo alrededor de los ojos.',costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_crow',  slot: 'ojos' },
  { id: 'acc_eyes_deer',  name: 'Ojos de Ciervo',    emoji: '🦌', description: 'Pestañas curvas inocentes de ciervo.',           costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_deer',  slot: 'ojos' },
  { id: 'acc_eyes_bear',  name: 'Ojos de Oso',       emoji: '🐻', description: 'Parches oscuros alrededor de los ojos de oso.',  costGold: 450, costCoin: 0, type: 'cosmetic', accessoryId: 'eyes_bear',  slot: 'ojos' },

  // ── GARRAS ─────────────────────────────────────────────────────────────────
  { id: 'acc_claws_wolf', name: 'Garras de Lobo',    emoji: '🐺', description: '4 garras curvas afiladas de lobo.',               costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_wolf', slot: 'garras' },
  { id: 'acc_claws_fox',  name: 'Garras de Zorro',   emoji: '🦊', description: 'Garras delgadas y elegantes de zorro.',           costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_fox',  slot: 'garras' },
  { id: 'acc_claws_cat',  name: 'Garras de Gato',    emoji: '🐱', description: '3 garras retráctiles curvadas de gato.',          costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_cat',  slot: 'garras' },
  { id: 'acc_claws_crow', name: 'Talones de Cuervo', emoji: '🪶', description: 'Talones de ave de cuervo.',                       costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_crow', slot: 'garras' },
  { id: 'acc_claws_deer', name: 'Pezuñas de Ciervo', emoji: '🦌', description: 'Pezuñas divididas de ciervo.',                   costGold: 500, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_deer', slot: 'garras' },
  { id: 'acc_claws_bear', name: 'Garras de Oso',     emoji: '🐻', description: '4 garras anchas y poderosas de oso.',             costGold: 550, costCoin: 0, type: 'cosmetic', accessoryId: 'claws_bear', slot: 'garras' },
]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(item => item.id === id)
}
