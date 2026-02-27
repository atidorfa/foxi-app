import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { calculateBattle } from '@/lib/battle/engine'

const COOLDOWN_MS = 3 * 60 * 1000

const RARITY_RANK: Record<string, number> = {
  COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5,
}
const MAX_RARITY_DIFF = 2

const BodySchema = z.object({
  therianId: z.string().optional(),
  targetName: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  // Load challenger
  let challenger = parsed.data.therianId
    ? await db.therian.findFirst({ where: { id: parsed.data.therianId, userId: session.user.id, status: 'active' } })
    : await db.therian.findFirst({ where: { userId: session.user.id, status: 'active' }, orderBy: { createdAt: 'asc' } })
  if (!challenger) {
    return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
  }

  // Cooldown check
  if (challenger.lastBiteAt) {
    const elapsed = Date.now() - new Date(challenger.lastBiteAt).getTime()
    if (elapsed < COOLDOWN_MS) {
      const nextBiteAt = new Date(new Date(challenger.lastBiteAt).getTime() + COOLDOWN_MS).toISOString()
      return NextResponse.json({ error: 'COOLDOWN_ACTIVE', nextBiteAt }, { status: 429 })
    }
  }

  // Build rarity-compatible filter (max 2 tiers apart)
  const challengerRank = RARITY_RANK[challenger.rarity] ?? 0
  const compatibleRarities = Object.entries(RARITY_RANK)
    .filter(([, r]) => Math.abs(r - challengerRank) <= MAX_RARITY_DIFF)
    .map(([key]) => key)

  let target
  if (parsed.data.targetName) {
    // Fight the previewed target — validate it still exists and rarity is compatible
    target = await db.therian.findFirst({
      where: { name: { equals: parsed.data.targetName, mode: 'insensitive' }, status: 'active' },
    })
    if (!target) {
      return NextResponse.json({ error: 'TARGET_NOT_FOUND' }, { status: 404 })
    }
    if (target.userId === session.user.id) {
      return NextResponse.json({ error: 'CANNOT_BITE_SELF' }, { status: 400 })
    }
    if (!compatibleRarities.includes(target.rarity)) {
      return NextResponse.json({ error: 'RARITY_MISMATCH' }, { status: 400 })
    }
  } else {
    // Pick a random compatible target
    const totalTargets = await db.therian.count({
      where: { status: 'active', name: { not: null }, userId: { not: session.user.id }, rarity: { in: compatibleRarities } },
    })
    if (totalTargets === 0) {
      return NextResponse.json({ error: 'NO_TARGETS_AVAILABLE' }, { status: 404 })
    }
    const skip = Math.floor(Math.random() * totalTargets)
    target = await db.therian.findFirst({
      where: { status: 'active', name: { not: null }, userId: { not: session.user.id }, rarity: { in: compatibleRarities } },
      skip,
    })
    if (!target) {
      return NextResponse.json({ error: 'NO_TARGETS_AVAILABLE' }, { status: 404 })
    }
  }

  const secret = process.env.SERVER_SECRET ?? 'default-secret'
  const timestamp = Date.now()

  const challengerStats = JSON.parse(challenger.stats)
  const targetStats = JSON.parse(target.stats)

  const result = calculateBattle(
    { id: challenger.id, name: challenger.name ?? challenger.id, stats: challengerStats, rarity: challenger.rarity },
    { id: target.id, name: target.name ?? target.id, stats: targetStats, rarity: target.rarity },
    secret,
    timestamp,
  )

  const challengerWon = result.winner === 'challenger'
  const GOLD_WIN = 10
  const GOLD_LOSE = 0
  const XP_WIN = 10

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const userRecord = await dba.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, level: true },
  }) as { xp: number; level: number } | null

  let xpEarned = 0
  let userUpdate: Record<string, unknown> = { gold: { increment: challengerWon ? GOLD_WIN : GOLD_LOSE } }
  if (challengerWon) {
    xpEarned = XP_WIN
    let newXp = (userRecord?.xp ?? 0) + XP_WIN
    let newLevel = userRecord?.level ?? 1
    const xpNeeded = Math.floor(100 * Math.pow(1.5, newLevel - 1))
    if (newXp >= xpNeeded) { newXp -= xpNeeded; newLevel += 1 }
    userUpdate = { ...userUpdate, xp: newXp, level: newLevel }
  }

  const [updatedChallenger, updatedTarget] = await db.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txa = tx as any

    await txa.battleLog.create({
      data: {
        challengerId: challenger!.id,
        targetId: target!.id,
        winnerId: challengerWon ? challenger!.id : target!.id,
        rounds: JSON.stringify(result.rounds),
      },
    })

    const gains: Record<string, number> = JSON.parse((challenger as any).actionGains || '{}')
    gains['BITE'] = (gains['BITE'] ?? 0) + 1

    const uc = await txa.therian.update({
      where: { id: challenger!.id },
      data: {
        lastBiteAt: new Date(),
        bites: challengerWon ? { increment: 1 } : undefined,
        deaths: challengerWon ? undefined : { increment: 1 },
        actionGains: JSON.stringify(gains),
      },
    })

    const ut = await txa.therian.update({
      where: { id: target!.id },
      data: {
        bites: challengerWon ? undefined : { increment: 1 },
        deaths: challengerWon ? { increment: 1 } : undefined,
      },
    })

    await txa.user.update({ where: { id: session.user.id }, data: userUpdate })

    return [uc, ut]
  })

  const goldEarned = challengerWon ? GOLD_WIN : GOLD_LOSE

  return NextResponse.json({
    battle: result,
    challenger: toTherianDTO(updatedChallenger),
    target: toTherianDTO(updatedTarget),
    biteAwarded: challengerWon,
    goldEarned,
    xpEarned,
  })
}
