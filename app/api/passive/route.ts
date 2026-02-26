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
      select: { lastPassiveClaim: true, level: true, completedCollections: true },
    }) as Promise<{ lastPassiveClaim: Date | null; level: number; completedCollections: string } | null>,
    db.therian.findMany({
      where: { userId: session.user.id },
      select: { rarity: true, createdAt: true, traitId: true },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const now = new Date()

  // Count therians per rarity (all statuses)
  const rarityCounts: Record<string, number> = {}
  for (const t of therians) {
    rarityCounts[t.rarity] = (rarityCounts[t.rarity] ?? 0) + 1
  }

  const ownedRarities = new Set(Object.keys(rarityCounts))

  // Count therians per traitId
  const traitCounts: Record<string, number> = {}
  for (const t of therians) {
    traitCounts[t.traitId] = (traitCounts[t.traitId] ?? 0) + 1
  }

  // Permanently completed missions (survive fusion/loss of therians) — both collection and trait
  const completedIds: string[] = JSON.parse(user.completedCollections ?? '[]')
  const completedSet = new Set(completedIds)

  // Detect newly completed collection + trait missions to persist
  const newlyCompleted = [
    ...PASSIVE_COLLECTION_MISSIONS
      .filter((m) => (rarityCounts[m.rarity] ?? 0) >= m.required && !completedSet.has(m.id))
      .map((m) => m.id),
    ...PASSIVE_TRAIT_MISSIONS
      .filter((m) => (traitCounts[m.traitId] ?? 0) >= m.required && !completedSet.has(m.id))
      .map((m) => m.id),
  ]
  if (newlyCompleted.length > 0) {
    const updated = [...completedIds, ...newlyCompleted]
    await dba.user.update({
      where: { id: session.user.id },
      data: { completedCollections: JSON.stringify(updated) },
    })
    newlyCompleted.forEach((id) => completedSet.add(id))
  }

  const missions = PASSIVE_MISSIONS.map((m) => {
    const count = rarityCounts[m.rarity] ?? 0
    return {
      id: m.id,
      rarity: m.rarity,
      title: m.title,
      description: m.description,
      goldPer24h: m.goldPer24h,
      count,
      effectiveGoldPer24h: count * m.goldPer24h,
      active: count > 0,
    }
  })

  const collectionMissions = PASSIVE_COLLECTION_MISSIONS.map((m) => {
    const progress  = rarityCounts[m.rarity] ?? 0
    const active    = progress >= m.required || completedSet.has(m.id)
    const permanent = completedSet.has(m.id) && progress < m.required
    return { id: m.id, rarity: m.rarity, title: m.title, description: m.description, required: m.required, goldPer24h: m.goldPer24h, progress, active, permanent }
  })

  const GOLD_PER_LEVEL = 100
  const levelGoldPer24h = user.level * GOLD_PER_LEVEL

  // Base gold scales by count per rarity; collection/trait bonuses flat per completed mission (permanent)
  const totalGoldPer24h =
    levelGoldPer24h +
    PASSIVE_MISSIONS.reduce((sum, m) => sum + ((rarityCounts[m.rarity] ?? 0) * m.goldPer24h), 0) +
    PASSIVE_COLLECTION_MISSIONS.filter((m) => completedSet.has(m.id) || (rarityCounts[m.rarity] ?? 0) >= m.required)
      .reduce((sum, m) => sum + m.goldPer24h, 0) +
    PASSIVE_TRAIT_MISSIONS.filter((m) => completedSet.has(m.id) || (traitCounts[m.traitId] ?? 0) >= m.required)
      .reduce((sum, m) => sum + m.goldPer24h, 0)

  const oldestTherian = therians.reduce<Date | null>((oldest, t) => {
    if (!oldest) return t.createdAt
    return t.createdAt < oldest ? t.createdAt : oldest
  }, null)

  const referenceTime   = getReferenceTime(user.lastPassiveClaim, oldestTherian, now)
  const goldAccumulated = computeAccumulatedGold(totalGoldPer24h, referenceTime, now)
  const claimable       = canClaimFn(user.lastPassiveClaim, now)
  const nextClaim       = nextClaimAt(user.lastPassiveClaim)

  const traitMissions = PASSIVE_TRAIT_MISSIONS.map((m) => {
    const progress  = traitCounts[m.traitId] ?? 0
    const active    = progress >= m.required || completedSet.has(m.id)
    const permanent = completedSet.has(m.id) && progress < m.required
    return { id: m.id, traitId: m.traitId, title: m.title, description: m.description, required: m.required, goldPer24h: m.goldPer24h, progress, active, permanent }
  })

  return NextResponse.json({
    totalGoldPer24h,
    goldAccumulated,
    lastClaimAt:      user.lastPassiveClaim?.toISOString() ?? null,
    nextClaimAt:      nextClaim?.toISOString() ?? null,
    canClaim:         claimable,
    missions,
    collectionMissions,
    traitMissions,
    levelBonus:       { level: user.level, goldPer24h: levelGoldPer24h },
  })
}
