import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import {
  getRankFromMmr,
  currentMonthKey,
  MONTHLY_REWARDS,
} from '@/lib/pvp/mmr'
import { randomUUID } from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dba = any

async function getUserMonthlyState(userId: string, dba: Dba) {
  const user = await dba.user.findUnique({
    where: { id: userId },
    select: {
      mmr: true,
      peakMmr: true,
      lastMonthlyRewardMonth: true,
    },
  }) as {
    mmr: number
    peakMmr: number
    lastMonthlyRewardMonth: string | null
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
  const user = await getUserMonthlyState(session.user.id, dba)
  if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const month = currentMonthKey()
  const peakRank = getRankFromMmr(user.peakMmr)
  const reward = MONTHLY_REWARDS[peakRank]
  const alreadyClaimed = user.lastMonthlyRewardMonth === month

  return NextResponse.json({
    peakMmr: user.peakMmr,
    peakRank,
    currentMonth: month,
    alreadyClaimed,
    hasReward: reward !== null && !alreadyClaimed,
    reward,
  })
}

export async function POST() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const user = await getUserMonthlyState(session.user.id, dba)
  if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const month = currentMonthKey()

  if (user.lastMonthlyRewardMonth === month) {
    return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 409 })
  }

  const peakRank = getRankFromMmr(user.peakMmr)
  const reward = MONTHLY_REWARDS[peakRank]

  if (!reward) {
    return NextResponse.json({ error: 'NO_REWARD_FOR_RANK', rank: peakRank }, { status: 400 })
  }

  // Accesorios: cada accesorio se crea como instancia única (igual que en shop/buy)
  const accessoryItems = reward.accessories.map(accessoryId => {
    const instanceId = `${accessoryId}:${randomUUID()}`
    return dba.inventoryItem.create({
      data: { userId: session.user.id, type: 'ACCESSORY', itemId: instanceId, quantity: 1 },
    })
  })

  // Huevos: upsert por itemId
  const eggItems = reward.eggs.map(eggId =>
    dba.inventoryItem.upsert({
      where: { userId_itemId: { userId: session.user.id, itemId: eggId } },
      update: { quantity: { increment: 1 } },
      create: { userId: session.user.id, type: 'EGG', itemId: eggId, quantity: 1 },
    })
  )

  // Runas al UserRuneInventory — agrupar por runeId en caso de duplicados en la lista
  const runeCountMap: Record<string, number> = {}
  for (const runeId of reward.runes) {
    runeCountMap[runeId] = (runeCountMap[runeId] ?? 0) + 1
  }
  const runeItems = Object.entries(runeCountMap).map(([runeId, qty]) =>
    dba.userRuneInventory.upsert({
      where: { userId_runeId: { userId: session.user.id, runeId } },
      update: { quantity: { increment: qty } },
      create: { userId: session.user.id, runeId, quantity: qty, source: 'monthly' },
    })
  )

  await dba.$transaction([
    // Gold + essence + reset peakMmr al mmr actual + marcar mes cobrado
    dba.user.update({
      where: { id: session.user.id },
      data: {
        gold: { increment: reward.gold },
        essence: { increment: reward.essence },
        peakMmr: user.mmr, // resetear pico al mmr actual del nuevo mes
        lastMonthlyRewardMonth: month,
      },
    }),
    ...eggItems,
    ...accessoryItems,
    ...runeItems,
  ])

  return NextResponse.json({
    claimed: true,
    rank: peakRank,
    reward,
  })
}
