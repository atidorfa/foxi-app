import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { generateTherianWithRarity, getNextRarity } from '@/lib/generation/engine'
import { EGG_BY_ID } from '@/lib/items/eggs'
import { assignUniqueName } from '@/lib/catalogs/names'
import type { Rarity } from '@/lib/generation/engine'
import {
  PASSIVE_MISSIONS,
  PASSIVE_COLLECTION_MISSIONS,
  PASSIVE_TRAIT_MISSIONS,
  computeAccumulatedGold,
  getReferenceTime,
} from '@/lib/catalogs/passive-missions'

const FUSION_SUCCESS_RATE: Record<string, number> = {
  COMMON:    1.00,
  UNCOMMON:  0.70,
  RARE:      0.50,
  EPIC:      0.20,
  LEGENDARY: 0.05,
}

type EggUse = { itemId: string; qty: number }

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json()
  const therianIds: string[] = Array.isArray(body.therianIds) ? body.therianIds : []
  const eggUses: EggUse[] = Array.isArray(body.eggUses) ? body.eggUses : []

  const totalSlots = therianIds.length + eggUses.reduce((s, e) => s + (e.qty ?? 0), 0)

  if (totalSlots !== 3 || new Set(therianIds).size !== therianIds.length) {
    return NextResponse.json({ error: 'INVALID_SELECTION' }, { status: 400 })
  }

  // Load therians and verify ownership
  let rarity: string | null = null
  let accessoriesToReturn: string[] = []

  if (therianIds.length > 0) {
    const therians = await db.therian.findMany({
      where: { id: { in: therianIds }, userId: session.user.id },
      select: { id: true, rarity: true, accessories: true },
    })
    if (therians.length !== therianIds.length) {
      return NextResponse.json({ error: 'INVALID_THERIANS' }, { status: 400 })
    }
    rarity = therians[0].rarity
    if (!therians.every(t => t.rarity === rarity)) {
      return NextResponse.json({ error: 'RARITY_MISMATCH' }, { status: 400 })
    }
    for (const t of therians) {
      const equipped: string[] = JSON.parse(t.accessories ?? '[]')
      accessoriesToReturn.push(...equipped)
    }
  }

  // Validate eggs: existence in catalog + inventory + rarity match
  for (const eu of eggUses) {
    const egg = EGG_BY_ID[eu.itemId]
    if (!egg) return NextResponse.json({ error: 'INVALID_EGG' }, { status: 400 })

    if (rarity === null) {
      rarity = egg.rarity
    } else if (egg.rarity !== rarity) {
      return NextResponse.json({ error: 'RARITY_MISMATCH' }, { status: 400 })
    }

    const inv = await db.inventoryItem.findUnique({
      where: { userId_itemId: { userId: session.user.id, itemId: eu.itemId } },
    })
    if (!inv || inv.quantity < eu.qty) {
      return NextResponse.json({ error: 'INSUFFICIENT_EGGS', itemId: eu.itemId }, { status: 400 })
    }
  }

  if (!rarity) {
    return NextResponse.json({ error: 'INVALID_SELECTION' }, { status: 400 })
  }

  // MYTHIC can't be fused
  const nextRarity = getNextRarity(rarity as Rarity)
  if (!nextRarity) {
    return NextResponse.json({ error: 'MAX_RARITY' }, { status: 400 })
  }

  // Roll for success
  const successRate = FUSION_SUCCESS_RATE[rarity] ?? 0.50
  const success = Math.random() < successRate
  const resultRarity: Rarity = success ? nextRarity : (rarity as Rarity)

  // Bank accumulated passive gold before deleting therians to avoid resetting the reference time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const [userForPassive, allTherians] = await Promise.all([
    dba.user.findUnique({
      where: { id: session.user.id },
      select: { lastPassiveClaim: true, level: true, completedCollections: true },
    }) as Promise<{ lastPassiveClaim: Date | null; level: number; completedCollections: string } | null>,
    db.therian.findMany({
      where: { userId: session.user.id },
      select: { rarity: true, createdAt: true, traitId: true },
    }),
  ])
  if (userForPassive) {
    const rarityCounts: Record<string, number> = {}
    for (const t of allTherians) rarityCounts[t.rarity] = (rarityCounts[t.rarity] ?? 0) + 1
    const traitCounts: Record<string, number> = {}
    for (const t of allTherians) traitCounts[t.traitId] = (traitCounts[t.traitId] ?? 0) + 1
    const completedIds: string[] = JSON.parse(userForPassive.completedCollections ?? '[]')
    const completedSet = new Set(completedIds)
    const GOLD_PER_LEVEL = 100
    const totalGoldPer24h =
      userForPassive.level * GOLD_PER_LEVEL +
      PASSIVE_MISSIONS.reduce((sum, m) => sum + ((rarityCounts[m.rarity] ?? 0) * m.goldPer24h), 0) +
      PASSIVE_COLLECTION_MISSIONS.filter((m) => completedSet.has(m.id) || (rarityCounts[m.rarity] ?? 0) >= m.required)
        .reduce((sum, m) => sum + m.goldPer24h, 0) +
      PASSIVE_TRAIT_MISSIONS.filter((m) => completedSet.has(m.id) || (traitCounts[m.traitId] ?? 0) >= m.required)
        .reduce((sum, m) => sum + m.goldPer24h, 0)
    const oldestTherian = allTherians.reduce<Date | null>((oldest, t) => {
      if (!oldest) return t.createdAt
      return t.createdAt < oldest ? t.createdAt : oldest
    }, null)
    const fusionNow = new Date()
    const referenceTime = getReferenceTime(userForPassive.lastPassiveClaim, oldestTherian, fusionNow)
    const goldToBank = Math.floor(computeAccumulatedGold(totalGoldPer24h, referenceTime, fusionNow))
    await dba.user.update({
      where: { id: session.user.id },
      data: {
        ...(goldToBank > 0 ? { gold: { increment: goldToBank } } : {}),
        lastPassiveClaim: fusionNow,
      },
    })
  }

  // Delete therians and deduct eggs atomically; return equipped accessories to inventory
  await db.$transaction([
    ...(therianIds.length > 0
      ? [db.therian.deleteMany({ where: { id: { in: therianIds } } })]
      : []),
    ...eggUses.map(eu =>
      db.inventoryItem.update({
        where: { userId_itemId: { userId: session.user.id, itemId: eu.itemId } },
        data: { quantity: { decrement: eu.qty } },
      })
    ),
    ...accessoriesToReturn.map(itemId =>
      db.inventoryItem.upsert({
        where: { userId_itemId: { userId: session.user.id, itemId } },
        update: { quantity: { increment: 1 } },
        create: { userId: session.user.id, type: 'ACCESSORY', itemId, quantity: 1 },
      })
    ),
  ])

  // Clean up empty inventory slots
  await db.inventoryItem.deleteMany({ where: { userId: session.user.id, quantity: { lte: 0 } } })

  // Generate and persist the result therian
  const secret = process.env.SERVER_SECRET ?? 'therian-hmac-secret-local'
  const generated = generateTherianWithRarity(session.user.id, secret, resultRarity)
  const name = await assignUniqueName(db)

  const newTherian = await db.therian.create({
    data: {
      userId:     session.user.id,
      speciesId:  generated.speciesId,
      rarity:     generated.rarity,
      seed:       generated.seed,
      appearance: JSON.stringify(generated.appearance),
      stats:      JSON.stringify(generated.stats),
      traitId:    generated.traitId,
      auraId:     generated.auraId,
      name,
    },
  })

  return NextResponse.json({
    success,
    therian: toTherianDTO(newTherian),
    resultRarity,
    successRate,
  })
}
