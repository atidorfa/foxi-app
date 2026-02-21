export interface Rune {
  id: string
  name: string
  lore: string
  mod: {
    vitality?: number
    agility?: number
    instinct?: number
    charisma?: number
  }
}

// 50 runas simples generadas con distintos incrementos de estadísticas
export const RUNES: Rune[] = [
  ...[
    { id: 'v_1', name: 'Vitalidad Menor', lore: 'Aumenta un poco tu aguante.', mod: { vitality: 2 } },
    { id: 'v_2', name: 'Vitalidad Fuerte', lore: 'Las heridas sanan algo más rápido.', mod: { vitality: 5 } },
    { id: 'v_3', name: 'Vigor del Oso', lore: 'Sientes que podrías derribar un árbol.', mod: { vitality: 8 } },
    { id: 'v_4', name: 'Sangre Hirviente', lore: 'Otorga gran vitalidad.', mod: { vitality: 12, agility: -2 } },
    { id: 'a_1', name: 'Agilidad Menor', lore: 'Movimientos levemente fluidos.', mod: { agility: 2 } },
    { id: 'a_2', name: 'Agilidad Fuerte', lore: 'Es más difícil atraparte.', mod: { agility: 5 } },
    { id: 'a_3', name: 'Paso del Viento', lore: 'Casi no tocas el suelo al caminar.', mod: { agility: 8 } },
    { id: 'a_4', name: 'Reflejo de Caza', lore: 'Otorga gran agilidad.', mod: { agility: 12, instinct: -2 } },
    { id: 'i_1', name: 'Instinto Menor', lore: 'Prestas un poco más de atención.', mod: { instinct: 2 } },
    { id: 'i_2', name: 'Instinto Fuerte', lore: 'Tus sentidos son notoriamente agudos.', mod: { instinct: 5 } },
    { id: 'i_3', name: 'Tercer Ojo', lore: 'Ves sombras antes de que caigan.', mod: { instinct: 8 } },
    { id: 'i_4', name: 'Conexión Arcana', lore: 'Otorga gran instinto.', mod: { instinct: 12, charisma: -2 } },
    { id: 'c_1', name: 'Carisma Menor', lore: 'Apareces un poco más agradable.', mod: { charisma: 2 } },
    { id: 'c_2', name: 'Carisma Fuerte', lore: 'Atraes las miradas, inevitablemente.', mod: { charisma: 5 } },
    { id: 'c_3', name: 'Aura Magnética', lore: 'Todos te ven como un líder natural.', mod: { charisma: 8 } },
    { id: 'c_4', name: 'Presencia Real', lore: 'Otorga gran carisma.', mod: { charisma: 12, vitality: -2 } },
  ],
  ...Array.from({ length: 34 }).map((_, i) => {
    // Generación procedural de las otras para llegar a 50
    const stats: (keyof Rune['mod'])[] = ['vitality', 'agility', 'instinct', 'charisma']
    const stat1 = stats[i % 4]
    const stat2 = stats[(i + 1) % 4]
    return {
      id: `mixed_${i}`,
      name: `Runa Dual ${i + 1}`,
      lore: `Una mixtura sutil de energías ancestrales.`,
      mod: {
        [stat1]: (i % 3) + 2,
        [stat2]: (i % 4) + 1,
      }
    }
  })
]

export function getRuneById(id: string): Rune | undefined {
  return RUNES.find(r => r.id === id)
}
