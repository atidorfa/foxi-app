export type ShopItemType = 'cosmetic' | 'service' | 'slot' | 'rune'

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
  runeId?: string
  tier?: 1 | 2 | 3 | 4 | 5
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'rename',
    name: 'Cambio de nombre',
    emoji: '✏️',
    description: 'Elige un nuevo nombre único para tu Therian.',
    costGold: 0,
    costCoin: 100,
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
    description: 'Desbloquea otro slot para adoptar.',
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

  // ── RUNAS T1 (200 oro) ─────────────────────────────────────────────────────
  { id: 'rune_vit_t1', name: 'Runa de Vitalidad I',   emoji: '🌿', description: '+1 Vitalidad. La sangre fluye más fuerte.',              costGold: 200, costCoin: 0, type: 'rune', runeId: 'rune_vit_t1', tier: 1 },
  { id: 'rune_agi_t1', name: 'Runa de Agilidad I',    emoji: '⚡', description: '+1 Agilidad. El cuerpo responde al instante.',           costGold: 200, costCoin: 0, type: 'rune', runeId: 'rune_agi_t1', tier: 1 },
  { id: 'rune_ins_t1', name: 'Runa de Instinto I',    emoji: '🌌', description: '+1 Instinto. Los sentidos se agudizan levemente.',       costGold: 200, costCoin: 0, type: 'rune', runeId: 'rune_ins_t1', tier: 1 },
  { id: 'rune_cha_t1', name: 'Runa de Carisma I',     emoji: '✨', description: '+1 Carisma. Tu presencia se vuelve magnética.',          costGold: 200, costCoin: 0, type: 'rune', runeId: 'rune_cha_t1', tier: 1 },
  { id: 'rune_all_t1', name: 'Runa de Equilibrio I',  emoji: '🔮', description: '+1 a todos los stats. Un balance sutil.',                costGold: 1000, costCoin: 0, type: 'rune', runeId: 'rune_all_t1', tier: 1 },

  // ── RUNAS T2 (800 oro) ─────────────────────────────────────────────────────
  { id: 'rune_vit_t2', name: 'Runa de Vitalidad II',  emoji: '🌿', description: '+2 Vitalidad. El cuerpo resiste con más firmeza.',       costGold: 800, costCoin: 0, type: 'rune', runeId: 'rune_vit_t2', tier: 2 },
  { id: 'rune_agi_t2', name: 'Runa de Agilidad II',   emoji: '⚡', description: '+2 Agilidad. Cada paso es más veloz.',                   costGold: 800, costCoin: 0, type: 'rune', runeId: 'rune_agi_t2', tier: 2 },
  { id: 'rune_ins_t2', name: 'Runa de Instinto II',   emoji: '🌌', description: '+2 Instinto. Percibes lo que otros ignoran.',            costGold: 800, costCoin: 0, type: 'rune', runeId: 'rune_ins_t2', tier: 2 },
  { id: 'rune_cha_t2', name: 'Runa de Carisma II',    emoji: '✨', description: '+2 Carisma. Las miradas te siguen.',                    costGold: 800, costCoin: 0, type: 'rune', runeId: 'rune_cha_t2', tier: 2 },
  { id: 'rune_all_t2', name: 'Runa de Equilibrio II', emoji: '🔮', description: '+2 a todos los stats. Cuerpo y espíritu en armonía.',   costGold: 2400, costCoin: 0, type: 'rune', runeId: 'rune_all_t2', tier: 2 },

  // ── RUNAS T3 (50 esencia) ──────────────────────────────────────────────────
  { id: 'rune_vit_t3', name: 'Runa de Vitalidad III', emoji: '🌿', description: '+3 Vitalidad. Las heridas se cierran antes.',            costGold: 0, costCoin: 50, type: 'rune', runeId: 'rune_vit_t3', tier: 3 },
  { id: 'rune_agi_t3', name: 'Runa de Agilidad III',  emoji: '⚡', description: '+3 Agilidad. Difícil de atrapar para cualquiera.',       costGold: 0, costCoin: 50, type: 'rune', runeId: 'rune_agi_t3', tier: 3 },
  { id: 'rune_ins_t3', name: 'Runa de Instinto III',  emoji: '🌌', description: '+3 Instinto. Nada escapa a tu atención.',                costGold: 0, costCoin: 50, type: 'rune', runeId: 'rune_ins_t3', tier: 3 },
  { id: 'rune_cha_t3', name: 'Runa de Carisma III',   emoji: '✨', description: '+3 Carisma. Convences sin esfuerzo.',                   costGold: 0, costCoin: 50, type: 'rune', runeId: 'rune_cha_t3', tier: 3 },
  { id: 'rune_all_t3', name: 'Runa de Equilibrio III',emoji: '🔮', description: '+3 a todos los stats. La unión de todas las fuerzas.',  costGold: 0, costCoin: 150, type: 'rune', runeId: 'rune_all_t3', tier: 3 },
]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(item => item.id === id)
}

/**
 * Dynamic slot cost based on current slot count.
 * Slot 4 → 10, slot 5 → 20, slot 6 → 30, slot 7 → 40, slot 8 → 50.
 */
export function getSlotCost(currentSlots: number): number {
  return (currentSlots - 2) * 10
}
