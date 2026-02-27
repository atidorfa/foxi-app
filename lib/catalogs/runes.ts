export interface Rune {
  id: string
  name: string
  lore: string
  tier: 1 | 2 | 3 | 4 | 5
  mod: {
    vitality?: number
    agility?: number
    instinct?: number
    charisma?: number
  }
}

const DEFS: Array<{
  key: string
  names: readonly [string, string, string, string, string]
  lores: readonly [string, string, string, string, string]
  mods: readonly [Rune['mod'], Rune['mod'], Rune['mod'], Rune['mod'], Rune['mod']]
}> = [
  {
    key: 'vit',
    names: ['Runa de Vitalidad I', 'Runa de Vitalidad II', 'Runa de Vitalidad III', 'Runa de Vitalidad IV', 'Runa de Vitalidad V'],
    lores: [
      'La sangre fluye un poco más fuerte.',
      'El cuerpo resiste con más firmeza.',
      'Las heridas se cierran antes de lo esperado.',
      'Tu aguante supera al de cualquier común.',
      'Indestructible en cuerpo y alma.',
    ],
    mods: [{ vitality: 1 }, { vitality: 2 }, { vitality: 3 }, { vitality: 4 }, { vitality: 5 }],
  },
  {
    key: 'agi',
    names: ['Runa de Agilidad I', 'Runa de Agilidad II', 'Runa de Agilidad III', 'Runa de Agilidad IV', 'Runa de Agilidad V'],
    lores: [
      'El cuerpo responde al instante.',
      'Cada paso es más veloz que el anterior.',
      'Difícil de atrapar para cualquiera.',
      'Te mueves como el viento mismo.',
      'Nadie puede seguirte.',
    ],
    mods: [{ agility: 1 }, { agility: 2 }, { agility: 3 }, { agility: 4 }, { agility: 5 }],
  },
  {
    key: 'ins',
    names: ['Runa de Instinto I', 'Runa de Instinto II', 'Runa de Instinto III', 'Runa de Instinto IV', 'Runa de Instinto V'],
    lores: [
      'Los sentidos se agudizan levemente.',
      'Percibes lo que otros suelen ignorar.',
      'Nada escapa a tu atención.',
      'Ves antes de mirar.',
      'El mundo te habla en silencio.',
    ],
    mods: [{ instinct: 1 }, { instinct: 2 }, { instinct: 3 }, { instinct: 4 }, { instinct: 5 }],
  },
  {
    key: 'cha',
    names: ['Runa de Carisma I', 'Runa de Carisma II', 'Runa de Carisma III', 'Runa de Carisma IV', 'Runa de Carisma V'],
    lores: [
      'Tu presencia se vuelve levemente magnética.',
      'Las miradas te siguen sin razón aparente.',
      'Convences sin esfuerzo visible.',
      'Tu aura transforma el ambiente.',
      'Nadie puede ignorarte.',
    ],
    mods: [{ charisma: 1 }, { charisma: 2 }, { charisma: 3 }, { charisma: 4 }, { charisma: 5 }],
  },
  {
    key: 'all',
    names: ['Runa de Equilibrio I', 'Runa de Equilibrio II', 'Runa de Equilibrio III', 'Runa de Equilibrio IV', 'Runa de Equilibrio V'],
    lores: [
      'Un balance sutil entre las fuerzas.',
      'Cuerpo y espíritu en armonía.',
      'La unión de todas las fuerzas.',
      'Equilibrio casi perfecto.',
      'La esencia completa de toda existencia.',
    ],
    mods: [
      { vitality: 1, agility: 1, instinct: 1, charisma: 1 },
      { vitality: 2, agility: 2, instinct: 2, charisma: 2 },
      { vitality: 3, agility: 3, instinct: 3, charisma: 3 },
      { vitality: 4, agility: 4, instinct: 4, charisma: 4 },
      { vitality: 5, agility: 5, instinct: 5, charisma: 5 },
    ],
  },
]

export const RUNES: Rune[] = DEFS.flatMap(def =>
  ([1, 2, 3, 4, 5] as const).map(tier => ({
    id: `rune_${def.key}_t${tier}`,
    name: def.names[tier - 1],
    lore: def.lores[tier - 1],
    tier,
    mod: def.mods[tier - 1],
  }))
)

export function getRuneById(id: string): Rune | undefined {
  return RUNES.find(r => r.id === id)
}
