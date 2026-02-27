import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { parseTutorialState } from '@/lib/tutorial'
import {
  PASSIVE_MISSIONS,
  PASSIVE_COLLECTION_MISSIONS,
  PASSIVE_TRAIT_MISSIONS,
  computeAccumulatedGold,
  getReferenceTime,
} from '@/lib/catalogs/passive-missions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any

  const [user, therians] = await Promise.all([
    dba.user.findUnique({
      where: { id: session.user.id },
      select: {
        level: true,
        xp: true,
        claimedAchievements: true,
        claimedMissions:     true,
        tutorialProgress:    true,
        lastPassiveClaim:    true,
        completedCollections: true,
      },
    }) as Promise<{
      level: number; xp: number
      claimedAchievements: string; claimedMissions: string
      tutorialProgress: string; lastPassiveClaim: Date | null
      completedCollections: string
    } | null>,
    db.therian.findMany({
      where: { userId: session.user.id },
      select: { actionsUsed: true, actionGains: true, bites: true, rarity: true, createdAt: true, traitId: true },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const tutorialState = parseTutorialState(user.tutorialProgress ?? '{}')

  if (tutorialState.dismissed) {
    return NextResponse.json({ dismissed: true })
  }

  // ── Step 1: temple + bite ──────────────────────────────────────────────────
  let hasTempled = false
  let hasBitten  = false
  for (const t of therians) {
    const gains: Record<string, number> = JSON.parse(t.actionGains || '{}')
    const actionCount = (gains.CARE ?? 0) + (gains.TRAIN ?? 0) + (gains.EXPLORE ?? 0) + (gains.SOCIAL ?? 0)
    if (actionCount >= 1 || t.actionsUsed >= 1) hasTempled = true
    if ((gains.BITE ?? 0) >= 1) hasBitten = true
  }
  const step1Progress = (hasTempled ? 1 : 0) + (hasBitten ? 1 : 0)

  // ── Step 2: achievement + mission ─────────────────────────────────────────
  const claimedAchievements: string[] = JSON.parse(user.claimedAchievements ?? '[]')
  const claimedMissions:     string[] = JSON.parse(user.claimedMissions ?? '[]')
  const hasClaimedAchievement = claimedAchievements.length >= 1
  const hasClaimedMission     = claimedMissions.length >= 1
  const step2Progress = (hasClaimedAchievement ? 1 : 0) + (hasClaimedMission ? 1 : 0)

  // ── Step 3: 2nd therian ───────────────────────────────────────────────────
  const step3Progress = therians.length >= 2 ? 1 : 0

  // ── Step 4: level 3 ───────────────────────────────────────────────────────
  const step4Progress = Math.min(user.level, 3)

  // ── Step 5: 3rd therian ───────────────────────────────────────────────────
  const step5Progress = therians.length >= 3 ? 1 : 0

  const steps = [
    {
      id: 'step1', progress: step1Progress, goal: 2,
      completed: step1Progress >= 2,
      subItems: [
        { key: 'templed', label: 'Templar', done: hasTempled },
        { key: 'bitten',  label: 'Morder',  done: hasBitten  },
      ],
    },
    {
      id: 'step2', progress: step2Progress, goal: 2,
      completed: step2Progress >= 2,
      subItems: [
        { key: 'achievement', label: 'Logro',  done: hasClaimedAchievement },
        { key: 'mission',     label: 'Misión', done: hasClaimedMission     },
      ],
    },
    { id: 'step3', progress: step3Progress, goal: 1, completed: step3Progress >= 1, subItems: null },
    { id: 'step4', progress: step4Progress, goal: 3, completed: step4Progress >= 3, subItems: null },
    { id: 'step5', progress: step5Progress, goal: 1, completed: step5Progress >= 1, subItems: null },
  ]

  const allComplete = steps.every(s => s.completed)

  // ── Award reward on first completion ──────────────────────────────────────
  if (allComplete && !tutorialState.rewardClaimed) {
    // Bank passive gold first to avoid resetting the reference
    const rarityCounts: Record<string, number> = {}
    for (const t of therians) rarityCounts[t.rarity] = (rarityCounts[t.rarity] ?? 0) + 1
    const traitCounts: Record<string, number> = {}
    for (const t of therians) traitCounts[t.traitId] = (traitCounts[t.traitId] ?? 0) + 1
    const completedIds: string[] = JSON.parse(user.completedCollections ?? '[]')
    const completedSet = new Set(completedIds)
    const totalGoldPer24h =
      user.level * 100 +
      PASSIVE_MISSIONS.reduce((s, m) => s + ((rarityCounts[m.rarity] ?? 0) * m.goldPer24h), 0) +
      PASSIVE_COLLECTION_MISSIONS.filter(m => completedSet.has(m.id) || (rarityCounts[m.rarity] ?? 0) >= m.required).reduce((s, m) => s + m.goldPer24h, 0) +
      PASSIVE_TRAIT_MISSIONS.filter(m => completedSet.has(m.id) || (traitCounts[m.traitId] ?? 0) >= m.required).reduce((s, m) => s + m.goldPer24h, 0)
    const oldestTherian = therians.reduce<Date | null>((oldest, t) => (!oldest || t.createdAt < oldest) ? t.createdAt : oldest, null)
    const now = new Date()
    const referenceTime  = getReferenceTime(user.lastPassiveClaim, oldestTherian, now)
    const passiveGold    = Math.floor(computeAccumulatedGold(totalGoldPer24h, referenceTime, now))

    // XP + level-up for tutorial reward
    const TUTORIAL_XP   = 10
    const TUTORIAL_GOLD = 100
    let newXp    = user.xp + TUTORIAL_XP
    let newLevel = user.level
    const xpNeeded = Math.floor(100 * Math.pow(1.5, newLevel - 1))
    if (newXp >= xpNeeded) { newXp -= xpNeeded; newLevel += 1 }

    await dba.user.update({
      where: { id: session.user.id },
      data: {
        gold:            { increment: TUTORIAL_GOLD + passiveGold },
        xp:              newXp,
        level:           newLevel,
        lastPassiveClaim: now,
        tutorialProgress: JSON.stringify({ rewardClaimed: true, dismissed: false }),
      },
    })

    return NextResponse.json({ dismissed: false, steps, allComplete: true, rewardClaimed: true, justRewarded: true })
  }

  return NextResponse.json({
    dismissed:     false,
    steps,
    allComplete,
    rewardClaimed: tutorialState.rewardClaimed,
    justRewarded:  false,
  })
}
