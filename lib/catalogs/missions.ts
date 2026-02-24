export type MissionType = 'daily' | 'weekly' | 'streak'

export interface MissionProgress {
  actionsToday: number
  bitesToday: number
  actionsThisWeek: number
  bitesThisWeek: number
  loginStreak: number
}

export interface MissionDef {
  id: string
  title: string
  description: string
  rewardLabel: string
  type: MissionType
  goal: number
  getProgress: (p: MissionProgress) => number
  reward: { gold?: number; xp?: number }
}

export function getDayKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function getMissionClaimKey(mission: MissionDef, date: Date): string {
  if (mission.type === 'daily')  return `${mission.id}:${getDayKey(date)}`
  if (mission.type === 'weekly') return `${mission.id}:${getWeekKey(date)}`
  return mission.id // streak: permanent
}

export const MISSIONS: MissionDef[] = [
  // ── Diarias ──────────────────────────────────────────────
  {
    id: 'daily_templar',
    title: 'Templa hoy',
    description: 'Realiza cualquier acción de temple',
    rewardLabel: '🪙 +20 Oro',
    type: 'daily',
    goal: 1,
    getProgress: (p) => Math.min(p.actionsToday, 1),
    reward: { gold: 20 },
  },
  {
    id: 'daily_bite',
    title: 'Muerde hoy',
    description: 'Muerde a otro Therian hoy',
    rewardLabel: '🪙 +20 Oro',
    type: 'daily',
    goal: 1,
    getProgress: (p) => Math.min(p.bitesToday, 1),
    reward: { gold: 20 },
  },

  // ── Semanales ────────────────────────────────────────────
  {
    id: 'weekly_templar_5',
    title: '5 temples',
    description: 'Templa tu Therian 5 veces esta semana',
    rewardLabel: '🪙 +100 Oro',
    type: 'weekly',
    goal: 5,
    getProgress: (p) => Math.min(p.actionsThisWeek, 5),
    reward: { gold: 100 },
  },
  {
    id: 'weekly_bite_3',
    title: '3 mordidas',
    description: 'Muerde a otros Therians 3 veces esta semana',
    rewardLabel: '🪙 +100 Oro',
    type: 'weekly',
    goal: 3,
    getProgress: (p) => Math.min(p.bitesThisWeek, 3),
    reward: { gold: 100 },
  },

  // ── Racha ────────────────────────────────────────────────
  {
    id: 'streak_3',
    title: '3 días seguidos',
    description: 'Inicia sesión 3 días consecutivos',
    rewardLabel: '🪙 +50 Oro',
    type: 'streak',
    goal: 3,
    getProgress: (p) => Math.min(p.loginStreak, 3),
    reward: { gold: 50 },
  },
  {
    id: 'streak_7',
    title: '7 días seguidos',
    description: 'Inicia sesión 7 días consecutivos',
    rewardLabel: '🪙 +150 Oro · ✨ +50 XP',
    type: 'streak',
    goal: 7,
    getProgress: (p) => Math.min(p.loginStreak, 7),
    reward: { gold: 150, xp: 50 },
  },
  {
    id: 'streak_30',
    title: '30 días seguidos',
    description: 'Inicia sesión 30 días consecutivos',
    rewardLabel: '🪙 +500 Oro · ✨ +200 XP',
    type: 'streak',
    goal: 30,
    getProgress: (p) => Math.min(p.loginStreak, 30),
    reward: { gold: 500, xp: 200 },
  },
]
