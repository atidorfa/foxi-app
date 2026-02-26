export interface AchievementUser {
  level: number
  therianSlots: number
  therians: Array<{ actionGains: string }>
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  rewardLabel: string
  category: string
  check: (user: AchievementUser) => boolean
  reward: { therianSlots?: number; gold?: number; xp?: number }
  getProgress?: (user: AchievementUser) => { current: number; max: number }
}

export const ACHIEVEMENT_CATEGORIES = [
  { id: 'aventura', label: 'Aventura', icon: '⭐' },
  { id: 'combate', label: 'Combate', icon: '⚔️' },
  { id: 'temple',  label: 'Temple',   icon: '🌿' },
]

function totalBites(u: AchievementUser): number {
  return u.therians.reduce((sum, t) => {
    const g: Record<string, number> = JSON.parse(t.actionGains || '{}')
    return sum + (g['BITE'] ?? 0)
  }, 0)
}

function totalTemplar(u: AchievementUser): number {
  const KEYS = ['CARE', 'TRAIN', 'EXPLORE', 'SOCIAL']
  return u.therians.reduce((sum, t) => {
    const g: Record<string, number> = JSON.parse(t.actionGains || '{}')
    return sum + KEYS.reduce((s, k) => s + (g[k] ?? 0), 0)
  }, 0)
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'reach_level_2',
    title: 'Primer Despertar',
    description: 'Alcanza el nivel 2',
    rewardLabel: '🌟 +1 slot de Therian',
    category: 'aventura',
    check: (u) => u.level >= 2,
    reward: { therianSlots: 1 },
    getProgress: (u) => ({ current: Math.min(u.level, 2), max: 2 }),
  },
  {
    id: 'reach_level_3',
    title: 'Alma Forjada',
    description: 'Alcanza el nivel 3',
    rewardLabel: '🌟 +1 slot de Therian',
    category: 'aventura',
    check: (u) => u.level >= 3,
    reward: { therianSlots: 1 },
    getProgress: (u) => ({ current: Math.min(u.level, 3), max: 3 }),
  },
  {
    id: 'first_bite',
    title: 'Primera Mordida',
    description: 'Muerde a otro Therian por primera vez',
    rewardLabel: '✨ +100 XP · 🪙 +100 Oro',
    category: 'combate',
    check: (u) => u.therians.some(t => {
      const gains: Record<string, number> = JSON.parse(t.actionGains || '{}')
      return (gains['BITE'] ?? 0) >= 1
    }),
    reward: { xp: 100, gold: 100 },
    getProgress: (u) => ({ current: Math.min(totalBites(u), 1), max: 1 }),
  },
  {
    id: 'first_templar',
    title: 'Primer Temple',
    description: 'Templa tu Therian por primera vez',
    rewardLabel: '✨ +100 XP · 🪙 +100 Oro',
    category: 'temple',
    check: (u) => u.therians.some(t => {
      const gains: Record<string, number> = JSON.parse(t.actionGains || '{}')
      const TEMPLAR_ACTIONS = ['CARE', 'TRAIN', 'EXPLORE', 'SOCIAL']
      return TEMPLAR_ACTIONS.some(k => (gains[k] ?? 0) >= 1)
    }),
    reward: { xp: 100, gold: 100 },
    getProgress: (u) => ({ current: Math.min(totalTemplar(u), 1), max: 1 }),
  },
  {
    id: 'en_aventura',
    title: 'En Aventura',
    description: 'Compra un slot extra de Therian en la tienda',
    rewardLabel: '🪙 +500 Oro',
    category: 'aventura',
    check: () => false, // auto-awarded on slot purchase, not manually claimable
    reward: { gold: 500 },
  },
  {
    id: 'max_slots',
    title: 'Manada Completa',
    description: 'Desbloquea 8 slots de Therian',
    rewardLabel: '🪙 +2.000 Oro',
    category: 'aventura',
    check: (u) => u.therianSlots >= 8,
    reward: { gold: 2000 },
    getProgress: (u) => ({ current: Math.min(u.therianSlots, 8), max: 8 }),
  },

  // Templar milestones
  {
    id: 'templar_100',
    title: '100 Temples',
    description: 'Templa tu Therian 100 veces',
    rewardLabel: '🪙 +500 Oro',
    category: 'temple',
    check: (u) => totalTemplar(u) >= 100,
    reward: { gold: 500 },
    getProgress: (u) => ({ current: Math.min(totalTemplar(u), 100), max: 100 }),
  },
  {
    id: 'templar_1k',
    title: '1.000 Temples',
    description: 'Templa tu Therian 1.000 veces',
    rewardLabel: '🪙 +5.000 Oro',
    category: 'temple',
    check: (u) => totalTemplar(u) >= 1000,
    reward: { gold: 5000 },
    getProgress: (u) => ({ current: Math.min(totalTemplar(u), 1000), max: 1000 }),
  },
  {
    id: 'templar_10k',
    title: '10.000 Temples',
    description: 'Templa tu Therian 10.000 veces',
    rewardLabel: '🪙 +50.000 Oro',
    category: 'temple',
    check: (u) => totalTemplar(u) >= 10000,
    reward: { gold: 50000 },
    getProgress: (u) => ({ current: Math.min(totalTemplar(u), 10000), max: 10000 }),
  },
  {
    id: 'templar_100k',
    title: '100.000 Temples',
    description: 'Templa tu Therian 100.000 veces',
    rewardLabel: '🪙 +500.000 Oro',
    category: 'temple',
    check: (u) => totalTemplar(u) >= 100000,
    reward: { gold: 500000 },
    getProgress: (u) => ({ current: Math.min(totalTemplar(u), 100000), max: 100000 }),
  },

  // Bite milestones
  {
    id: 'bite_100',
    title: '100 Mordidas',
    description: 'Muerde a otro Therian 100 veces',
    rewardLabel: '🪙 +500 Oro',
    category: 'combate',
    check: (u) => totalBites(u) >= 100,
    reward: { gold: 500 },
    getProgress: (u) => ({ current: Math.min(totalBites(u), 100), max: 100 }),
  },
  {
    id: 'bite_1k',
    title: '1.000 Mordidas',
    description: 'Muerde a otro Therian 1.000 veces',
    rewardLabel: '🪙 +5.000 Oro',
    category: 'combate',
    check: (u) => totalBites(u) >= 1000,
    reward: { gold: 5000 },
    getProgress: (u) => ({ current: Math.min(totalBites(u), 1000), max: 1000 }),
  },
  {
    id: 'bite_10k',
    title: '10.000 Mordidas',
    description: 'Muerde a otro Therian 10.000 veces',
    rewardLabel: '🪙 +50.000 Oro',
    category: 'combate',
    check: (u) => totalBites(u) >= 10000,
    reward: { gold: 50000 },
    getProgress: (u) => ({ current: Math.min(totalBites(u), 10000), max: 10000 }),
  },
  {
    id: 'bite_100k',
    title: '100.000 Mordidas',
    description: 'Muerde a otro Therian 100.000 veces',
    rewardLabel: '🪙 +500.000 Oro',
    category: 'combate',
    check: (u) => totalBites(u) >= 100000,
    reward: { gold: 500000 },
    getProgress: (u) => ({ current: Math.min(totalBites(u), 100000), max: 100000 }),
  },
]
