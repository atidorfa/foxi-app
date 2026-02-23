export type AccessorySlot = {
  id: string
  name: string
  emoji: string
}

export const ACCESSORY_SLOTS: AccessorySlot[] = [
  { id: 'orejas',   name: 'Orejas',   emoji: '👂' },
  { id: 'cola',     name: 'Cola',     emoji: '🐾' },
  { id: 'ojos',     name: 'Ojos',     emoji: '👁️' },
  { id: 'cabeza',   name: 'Cabeza',   emoji: '👑' },
  { id: 'anteojos', name: 'Anteojos', emoji: '🕶️' },
  { id: 'garras',   name: 'Garras',   emoji: '⚔️' },
]

export const SLOT_BY_ID = Object.fromEntries(ACCESSORY_SLOTS.map(s => [s.id, s]))
