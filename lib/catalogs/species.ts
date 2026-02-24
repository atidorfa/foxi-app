export interface Species {
  id: string
  name: string
  emoji: string
  bias: {
    vitality: number
    agility: number
    instinct: number
    charisma: number
  }
  lore: string
}

export const SPECIES: Species[] = [
  {
    id: 'therian',
    name: 'Therian',
    emoji: '',
    bias: { vitality: 0, agility: 0, instinct: 0, charisma: 0 },
    lore: '',
  },
]

export function getSpeciesById(id: string): Species | undefined {
  return SPECIES.find(s => s.id === id)
}
