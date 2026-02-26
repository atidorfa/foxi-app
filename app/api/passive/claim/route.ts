import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import {
  PASSIVE_MISSIONS,
  PASSIVE_COLLECTION_MISSIONS,
  PASSIVE_TRAIT_MISSIONS,
  computeAccumulatedGold,
  getReferenceTime,
  canClaim as canClaimFn,
  nextClaimAt,
} from '@/lib/catalogs/passive-missions'

export async function POST() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any

  const [user, therians] = await Promise.all([
    dba.user.findUnique({
      where: { id: session.user.id },
      select: { lastPassiveClaim: true, gold: true, level: true, completedCollections: true },
    }) as Promise<{ lastPassiveClaim: Date | null; gold: number; level: number; completedCollections: string } | null>,
    db.therian.findMany({
      where: { userId: session.user.id },
      select: { rarity: true, createdAt: true, traitId: true },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const now = new Date()

  if (!canClaimFn(user.lastPassiveClaim, now)) {
    return NextResponse.json(
      { error: 'COOLDOWN_ACTIVE', nextClaimAt: nextClaimAt(user.lastPassiveClaim)?.toISOString() },
      { status: 429 },
    )
  }

  const rarityCounts: Record<string, number> = {}
  for (const t of therians) {
    rarityCounts[t.rarity] = (rarityCounts[t.rarity] ?? 0) + 1
  }

  const traitCounts: Record<string, number> = {}
  for (const t of therians) {
    traitCounts[t.traitId] = (traitCounts[t.traitId] ?? 0) + 1
  }

  const completedIds: string[] = JSON.parse(user.completedCollections ?? '[]')
  const completedSet = new Set(completedIds)

  const GOLD_PER_LEVEL = 100
  const totalGoldPer24h =
    user.level * GOLD_PER_LEVEL +
    PASSIVE_MISSIONS.reduce((sum, m) => sum + ((rarityCounts[m.rarity] ?? 0) * m.goldPer24h), 0) +
    PASSIVE_COLLECTION_MISSIONS.filter((m) => completedSet.has(m.id) || (rarityCounts[m.rarity] ?? 0) >= m.required)
      .reduce((sum, m) => sum + m.goldPer24h, 0) +
    PASSIVE_TRAIT_MISSIONS.filter((m) => completedSet.has(m.id) || (traitCounts[m.traitId] ?? 0) >= m.required)
      .reduce((sum, m) => sum + m.goldPer24h, 0)

  const oldestTherian = therians.reduce<Date | null>((oldest, t) => {
    if (!oldest) return t.createdAt
    return t.createdAt < oldest ? t.createdAt : oldest
  }, null)

  const referenceTime = getReferenceTime(user.lastPassiveClaim, oldestTherian, now)
  const goldClaimed   = Math.floor(computeAccumulatedGold(totalGoldPer24h, referenceTime, now))

  await dba.user.update({
    where: { id: session.user.id },
    data: {
      gold: { increment: goldClaimed },
      lastPassiveClaim: now,
    },
  })

  return NextResponse.json({ goldClaimed, newGold: user.gold + goldClaimed })
}
