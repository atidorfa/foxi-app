import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import {
  WEEKLY_WINS_REQUIRED,
  WEEKLY_CHEST_GOLD,
  WEEKLY_CHEST_EGG,
  WEEKLY_CHEST_RUNE_POOL,
  WEEKLY_CHEST_RUNE_COUNT,
  needsWeeklyReset,
  pickRandom,
} from '@/lib/pvp/mmr'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dba = any

async function getUserRewardState(userId: string, dba: Dba) {
  const user = await dba.user.findUnique({
    where: { id: userId },
    select: {
      weeklyPvpWins: true,
      weeklyPvpResetAt: true,
      lastWeeklyChestAt: true,
    },
  }) as {
    weeklyPvpWins: number
    weeklyPvpResetAt: Date | null
    lastWeeklyChestAt: Date | null
  } | null
  return user
}

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const user = await getUserRewardState(session.user.id, dba)
  if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const resetNeeded = needsWeeklyReset(user.weeklyPvpResetAt)
  const effectiveWins = resetNeeded ? 0 : user.weeklyPvpWins

  // El cofre está disponible si llegó a 15 victorias Y no lo reclamó en el período actual
  const chestEligible = effectiveWins >= WEEKLY_WINS_REQUIRED
  const alreadyClaimed = !resetNeeded &&
    user.lastWeeklyChestAt !== null &&
    user.weeklyPvpResetAt !== null &&
    user.lastWeeklyChestAt >= user.weeklyPvpResetAt

  const chestAvailable = chestEligible && !alreadyClaimed

  return NextResponse.json({
    weeklyPvpWins: effectiveWins,
    required: WEEKLY_WINS_REQUIRED,
    chestAvailable,
    alreadyClaimed,
    weekResetAt: resetNeeded ? null : user.weeklyPvpResetAt?.toISOString() ?? null,
    preview: {
      gold: WEEKLY_CHEST_GOLD,
      egg: WEEKLY_CHEST_EGG,
      runes: WEEKLY_CHEST_RUNE_COUNT,
    },
  })
}

export async function POST() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const user = await getUserRewardState(session.user.id, dba)
  if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const resetNeeded = needsWeeklyReset(user.weeklyPvpResetAt)
  const effectiveWins = resetNeeded ? 0 : user.weeklyPvpWins

  if (effectiveWins < WEEKLY_WINS_REQUIRED) {
    return NextResponse.json({ error: 'NOT_ENOUGH_WINS', current: effectiveWins, required: WEEKLY_WINS_REQUIRED }, { status: 400 })
  }

  const alreadyClaimed = !resetNeeded &&
    user.lastWeeklyChestAt !== null &&
    user.weeklyPvpResetAt !== null &&
    user.lastWeeklyChestAt >= user.weeklyPvpResetAt

  if (alreadyClaimed) {
    return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 409 })
  }

  // Seleccionar 2 runas aleatorias del pool T1
  const runesAwarded = pickRandom(WEEKLY_CHEST_RUNE_POOL, WEEKLY_CHEST_RUNE_COUNT)

  const now = new Date()

  await dba.$transaction([
    // +800 gold + lastWeeklyChestAt
    dba.user.update({
      where: { id: session.user.id },
      data: {
        gold: { increment: WEEKLY_CHEST_GOLD },
        lastWeeklyChestAt: now,
      },
    }),
    // Egg al inventario
    dba.inventoryItem.upsert({
      where: { userId_itemId: { userId: session.user.id, itemId: WEEKLY_CHEST_EGG } },
      update: { quantity: { increment: 1 } },
      create: { userId: session.user.id, type: 'EGG', itemId: WEEKLY_CHEST_EGG, quantity: 1 },
    }),
    // Runas al inventario de usuario
    ...runesAwarded.map(runeId =>
      dba.userRuneInventory.upsert({
        where: { userId_runeId: { userId: session.user.id, runeId } },
        update: { quantity: { increment: 1 } },
        create: { userId: session.user.id, runeId, quantity: 1, source: 'weekly' },
      })
    ),
  ])

  return NextResponse.json({
    gold: WEEKLY_CHEST_GOLD,
    egg: WEEKLY_CHEST_EGG,
    runes: runesAwarded,
  })
}
