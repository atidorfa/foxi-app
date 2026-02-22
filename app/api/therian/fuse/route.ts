import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { generateTherianWithRarity, getNextRarity } from '@/lib/generation/engine'
import type { Rarity } from '@/lib/generation/engine'

const FUSION_SUCCESS_RATE: Record<string, number> = {
  COMMON:    1.00,
  UNCOMMON:  0.70,
  RARE:      0.50,
  EPIC:      0.20,
  LEGENDARY: 0.05,
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json()
  const { therianIds } = body as { therianIds: string[] }

  if (!Array.isArray(therianIds) || therianIds.length !== 3 || new Set(therianIds).size !== 3) {
    return NextResponse.json({ error: 'INVALID_SELECTION' }, { status: 400 })
  }

  // Load all 3 and verify ownership
  const therians = await db.therian.findMany({
    where: { id: { in: therianIds }, userId: session.user.id },
  })

  if (therians.length !== 3) {
    return NextResponse.json({ error: 'INVALID_THERIANS' }, { status: 400 })
  }

  // All must share the same rarity
  const rarity = therians[0].rarity as Rarity
  if (!therians.every(t => t.rarity === rarity)) {
    return NextResponse.json({ error: 'RARITY_MISMATCH' }, { status: 400 })
  }

  // MYTHIC can't be fused (no next rarity)
  const nextRarity = getNextRarity(rarity)
  if (!nextRarity) {
    return NextResponse.json({ error: 'MAX_RARITY' }, { status: 400 })
  }

  // Roll for success
  const successRate = FUSION_SUCCESS_RATE[rarity] ?? 0.50
  const success = Math.random() < successRate
  const resultRarity: Rarity = success ? nextRarity : rarity

  // Delete the 3 source therians (cascade handles ActionLog, BattleLog, RuneInventory)
  await db.therian.deleteMany({ where: { id: { in: therianIds } } })

  // Generate and persist the result therian
  const secret = process.env.SERVER_SECRET ?? 'therian-hmac-secret-local'
  const generated = generateTherianWithRarity(session.user.id, secret, resultRarity)

  const newTherian = await db.therian.create({
    data: {
      userId:    session.user.id,
      speciesId: generated.speciesId,
      rarity:    generated.rarity,
      seed:      generated.seed,
      appearance: JSON.stringify(generated.appearance),
      stats:      JSON.stringify(generated.stats),
      traitId:   generated.traitId,
    },
  })

  return NextResponse.json({
    success,
    therian: toTherianDTO(newTherian),
    resultRarity,
    successRate,
  })
}
