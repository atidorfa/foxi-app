import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { generateTherianWithRarity, getNextRarity } from '@/lib/generation/engine'
import { EGG_BY_ID } from '@/lib/items/eggs'
import type { Rarity } from '@/lib/generation/engine'

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

  if (therianIds.length > 0) {
    const therians = await db.therian.findMany({
      where: { id: { in: therianIds }, userId: session.user.id },
      select: { id: true, rarity: true },
    })
    if (therians.length !== therianIds.length) {
      return NextResponse.json({ error: 'INVALID_THERIANS' }, { status: 400 })
    }
    rarity = therians[0].rarity
    if (!therians.every(t => t.rarity === rarity)) {
      return NextResponse.json({ error: 'RARITY_MISMATCH' }, { status: 400 })
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

  // Delete therians and deduct eggs atomically
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
  ])

  // Clean up empty inventory slots
  await db.inventoryItem.deleteMany({ where: { userId: session.user.id, quantity: { lte: 0 } } })

  // Generate and persist the result therian
  const secret = process.env.SERVER_SECRET ?? 'therian-hmac-secret-local'
  const generated = generateTherianWithRarity(session.user.id, secret, resultRarity)

  const newTherian = await db.therian.create({
    data: {
      userId:     session.user.id,
      speciesId:  generated.speciesId,
      rarity:     generated.rarity,
      seed:       generated.seed,
      appearance: JSON.stringify(generated.appearance),
      stats:      JSON.stringify(generated.stats),
      traitId:    generated.traitId,
    },
  })

  return NextResponse.json({
    success,
    therian: toTherianDTO(newTherian),
    resultRarity,
    successRate,
  })
}
