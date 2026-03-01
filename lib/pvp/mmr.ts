export const MMR_GAIN = 25
export const MMR_LOSS = 15
export const MMR_FLOOR = 0

export const WEEKLY_WINS_REQUIRED = 15
export const WEEKLY_CHEST_GOLD = 800
export const WEEKLY_CHEST_EGG = 'egg_uncommon'
export const WEEKLY_CHEST_RUNE_POOL = ['rune_vit_t1', 'rune_agi_t1', 'rune_ins_t1', 'rune_cha_t1']
export const WEEKLY_CHEST_RUNE_COUNT = 2

export type Rank = 'HIERRO' | 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO' | 'MITICO'

export interface MonthlyReward {
  gold: number
  essence: number
  eggs: string[]
  accessories: string[]
  runes: string[]
}

export function getRankFromMmr(mmr: number): Rank {
  if (mmr >= 2600) return 'MITICO'
  if (mmr >= 2200) return 'PLATINO'
  if (mmr >= 1800) return 'ORO'
  if (mmr >= 1400) return 'PLATA'
  if (mmr >= 1000) return 'BRONCE'
  return 'HIERRO'
}

export function getGoldRewardByRank(rank: Rank): number {
  if (rank === 'PLATINO' || rank === 'MITICO') return 100
  if (rank === 'PLATA' || rank === 'ORO') return 75
  return 50 // HIERRO, BRONCE
}

export function applyMmrChange(currentMmr: number, won: boolean): { newMmr: number; delta: number } {
  const delta = won ? MMR_GAIN : -MMR_LOSS
  const newMmr = Math.max(MMR_FLOOR, currentMmr + delta)
  return { newMmr, delta: newMmr - currentMmr }
}

export function needsWeeklyReset(resetAt: Date | null): boolean {
  if (!resetAt) return true
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  return Date.now() - resetAt.getTime() > WEEK_MS
}

export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Pick `count` random elements from an array without repeating. */
export function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export const MONTHLY_REWARDS: Record<Rank, MonthlyReward | null> = {
  HIERRO: null,
  BRONCE: {
    gold: 1500,
    essence: 1,
    eggs: ['egg_uncommon'],
    accessories: [],
    runes: ['rune_vit_t1', 'rune_agi_t1'],
  },
  PLATA: {
    gold: 3000,
    essence: 3,
    eggs: ['egg_rare'],
    accessories: ['acc_glasses'],
    runes: ['rune_vit_t1', 'rune_agi_t1', 'rune_ins_t1'],
  },
  ORO: {
    gold: 6000,
    essence: 7,
    eggs: ['egg_epic'],
    accessories: ['acc_tail_wolf'],
    runes: ['rune_vit_t2', 'rune_agi_t2', 'rune_all_t1'],
  },
  PLATINO: {
    gold: 12000,
    essence: 15,
    eggs: ['egg_legendary'],
    accessories: ['acc_ears_wolf'],
    runes: ['rune_vit_t3', 'rune_agi_t3', 'rune_ins_t3', 'rune_all_t2', 'rune_cha_t2'],
  },
  MITICO: {
    gold: 30000,
    essence: 30,
    eggs: ['egg_legendary'],
    accessories: ['acc_crown'],
    runes: ['rune_vit_t4', 'rune_agi_t4', 'rune_all_t3', 'rune_all_t3', 'rune_cha_t4'],
  },
}
