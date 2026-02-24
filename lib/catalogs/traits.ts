export interface Trait {
  id: string
  name: string
  mod: {
    vitality: number
    agility: number
    instinct: number
    charisma: number
  }
  lore: string
}

export const TRAITS: Trait[] = [
  {
    id: 'forestal',
    name: 'Forestal',
    mod: { vitality: 5, agility: 0, instinct: 0, charisma: 0 },
    lore: 'Enraizado en la tierra, nada lo derriba.',
  },
  {
    id: 'electrico',
    name: 'Eléctrico',
    mod: { vitality: 0, agility: 5, instinct: 0, charisma: 0 },
    lore: 'Más rápido que el pensamiento.',
  },
  {
    id: 'acuatico',
    name: 'Acuático',
    mod: { vitality: 0, agility: 0, instinct: 5, charisma: 0 },
    lore: 'Fluye donde otros no pueden seguir.',
  },
  {
    id: 'volcanico',
    name: 'Volcánico',
    mod: { vitality: 0, agility: 0, instinct: 0, charisma: 5 },
    lore: 'Su presencia lo llena todo.',
  },
]

export function getTraitById(id: string): Trait | undefined {
  return TRAITS.find(t => t.id === id)
}
