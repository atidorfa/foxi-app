export interface AchievementUser {
  level: number
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
}

export const ACHIEVEMENT_CATEGORIES = [
  { id: 'aventura', label: 'Aventura', icon: '⭐' },
  { id: 'combate', label: 'Combate', icon: '⚔️' },
  { id: 'temple',  label: 'Temple',   icon: '🌿' },
]

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'reach_level_2',
    title: 'Primer Despertar',
    description: 'Alcanza el nivel 2',
    rewardLabel: '🌟 +1 slot de Therian',
    category: 'aventura',
    check: (u) => u.level >= 2,
    reward: { therianSlots: 1 },
  },
  {
    id: 'reach_level_3',
    title: 'Alma Forjada',
    description: 'Alcanza el nivel 3',
    rewardLabel: '🌟 +1 slot de Therian',
    category: 'aventura',
    check: (u) => u.level >= 3,
    reward: { therianSlots: 1 },
  },
  {
    id: 'first_bite',
    title: 'Primera Mordida',
    description: 'Muerde a otro Therian por primera vez',
    rewardLabel: '✨ +80 XP · 🪙 +80 Oro',
    category: 'combate',
    check: (u) => u.therians.some(t => {
      const gains: Record<string, number> = JSON.parse(t.actionGains || '{}')
      return (gains['BITE'] ?? 0) >= 1
    }),
    reward: { xp: 80, gold: 80 },
  },
  {
    id: 'first_templar',
    title: 'Primer Temple',
    description: 'Templa tu Therian por primera vez',
    rewardLabel: '✨ +80 XP · 🪙 +80 Oro',
    category: 'temple',
    check: (u) => u.therians.some(t => {
      const gains: Record<string, number> = JSON.parse(t.actionGains || '{}')
      const TEMPLAR_ACTIONS = ['CARE', 'TRAIN', 'EXPLORE', 'SOCIAL']
      return TEMPLAR_ACTIONS.some(k => (gains[k] ?? 0) >= 1)
    }),
    reward: { xp: 80, gold: 80 },
  },
]
