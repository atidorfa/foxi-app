import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import {
  getRankFromMmr,
  needsWeeklyReset,
  currentMonthKey,
  WEEKLY_WINS_REQUIRED,
  MONTHLY_REWARDS,
} from '@/lib/pvp/mmr'
import { computeEnergy } from '@/lib/pvp/energy'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const user = await dba.user.findUnique({
    where: { id: session.user.id },
    select: {
      mmr: true,
      peakMmr: true,
      weeklyPvpWins: true,
      weeklyPvpResetAt: true,
      lastWeeklyChestAt: true,
      lastMonthlyRewardMonth: true,
      pvpEnergy: true,
      pvpEnergyRegenAt: true,
    },
  }) as {
    mmr: number
    peakMmr: number
    weeklyPvpWins: number
    weeklyPvpResetAt: Date | null
    lastWeeklyChestAt: Date | null
    lastMonthlyRewardMonth: string | null
    pvpEnergy: number | null
    pvpEnergyRegenAt: Date | null
  } | null

  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  // Compute regenerated energy and persist if changed
  const { energy, regenAt: energyRegenAt, dirty } = computeEnergy(
    user.pvpEnergy ?? 10,
    user.pvpEnergyRegenAt ?? null,
  )
  if (dirty) {
    await dba.user.update({
      where: { id: session.user.id },
      data: { pvpEnergy: energy, pvpEnergyRegenAt: energyRegenAt },
    })
  }

  const resetNeeded = needsWeeklyReset(user.weeklyPvpResetAt)
  const effectiveWins = resetNeeded ? 0 : user.weeklyPvpWins

  const chestEligible = effectiveWins >= WEEKLY_WINS_REQUIRED
  const alreadyClaimedChest =
    !resetNeeded &&
    user.lastWeeklyChestAt !== null &&
    user.weeklyPvpResetAt !== null &&
    user.lastWeeklyChestAt >= user.weeklyPvpResetAt
  const chestAvailable = chestEligible && !alreadyClaimedChest

  const rank = getRankFromMmr(user.mmr)
  const peakRank = getRankFromMmr(user.peakMmr)
  const month = currentMonthKey()
  const alreadyClaimedMonthly = user.lastMonthlyRewardMonth === month
  const monthlyReward = MONTHLY_REWARDS[peakRank]

  return NextResponse.json({
    mmr: user.mmr,
    rank,
    peakMmr: user.peakMmr,
    peakRank,
    weeklyPvpWins: effectiveWins,
    weeklyRequired: WEEKLY_WINS_REQUIRED,
    chestAvailable,
    alreadyClaimedChest,
    currentMonth: month,
    monthlyReward,
    alreadyClaimedMonthly,
    energy,
    energyMax: 10,
    energyRegenAt: energyRegenAt ? energyRegenAt.toISOString() : null,
  })
}
