import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getShopItem, getSlotCost } from '@/lib/shop/catalog'
import { EGG_BY_ID } from '@/lib/items/eggs'
import { toTherianDTO } from '@/lib/therian-dto'
import { z } from 'zod'

const schema = z.object({
  itemId: z.string(),
  quantity: z.number().int().min(1).max(99).optional().default(1),
  newName: z.string().min(2).max(24).regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body
  try {
    body = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
  }

  // Check if it's an egg purchase
  const egg = EGG_BY_ID[body.itemId]
  if (egg) {
    const qty = body.quantity ?? 1
    const totalCost = egg.price * qty

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, gold: true, essence: true, therianSlots: true },
    })
    if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

    // Validate balance
    if (egg.currency === 'gold' && user.gold < totalCost) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_ESSENCIA', available: user.gold, required: totalCost },
        { status: 400 }
      )
    }
    if (egg.currency === 'essence' && user.essence < totalCost) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_COIN', available: user.essence, required: totalCost },
        { status: 400 }
      )
    }

    // Deduct currency — explicit to avoid silent no-op if currency value is unrecognized
    let currencyData: { gold?: { decrement: number }; essence?: { decrement: number } }
    if (egg.currency === 'gold') {
      currencyData = { gold: { decrement: totalCost } }
    } else if (egg.currency === 'essence') {
      currencyData = { essence: { decrement: totalCost } }
    } else {
      return NextResponse.json({ error: 'INVALID_EGG_CURRENCY', currency: egg.currency }, { status: 500 })
    }

    // Atomic: inventory + currency in one transaction
    const [, updatedUser] = await db.$transaction([
      db.inventoryItem.upsert({
        where: { userId_itemId: { userId: session.user.id, itemId: egg.id } },
        update: { quantity: { increment: qty } },
        create: { userId: session.user.id, type: 'EGG', itemId: egg.id, quantity: qty },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: currencyData,
        select: { gold: true, essence: true, therianSlots: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      newBalance: { gold: updatedUser.gold, essence: updatedUser.essence, therianSlots: updatedUser.therianSlots },
    })
  }

  const item = getShopItem(body.itemId)
  if (!item) {
    return NextResponse.json({ error: 'ITEM_NOT_FOUND' }, { status: 404 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, gold: true, essence: true, therianSlots: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  // Dynamic cost for slot purchases
  const effectiveCostCoin = item.type === 'slot' ? getSlotCost(user.therianSlots) : item.costCoin

  // Validar saldo
  if (item.costGold > 0 && user.gold < item.costGold) {
    return NextResponse.json(
      { error: 'INSUFFICIENT_ESSENCIA', available: user.gold, required: item.costGold },
      { status: 400 }
    )
  }
  if (effectiveCostCoin > 0 && user.essence < effectiveCostCoin) {
    return NextResponse.json(
      { error: 'INSUFFICIENT_COIN', available: user.essence, required: effectiveCostCoin },
      { status: 400 }
    )
  }

  let updatedTherian = null

  if (item.type === 'service' && item.id === 'rename') {
    if (!body.newName) {
      return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 })
    }

    const therian = await db.therian.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' } })
    if (!therian) {
      return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
    }

    // Verificar unicidad de nombre (excluyendo el propio)
    const existing = await db.therian.findFirst({
      where: { name: body.newName, NOT: { id: therian.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'NAME_TAKEN' }, { status: 409 })
    }

    const t = await db.therian.update({
      where: { id: therian.id },
      data: { name: body.newName },
    })
    updatedTherian = toTherianDTO(t)
  }

  if (item.type === 'rune' && item.runeId) {
    const therian = await db.therian.findFirst({ where: { userId: session.user.id, status: 'active' }, orderBy: { createdAt: 'asc' } })
    if (!therian) return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })

    const deductRune: Record<string, unknown> = {}
    if (item.costGold > 0) deductRune.gold = { decrement: item.costGold }
    if (effectiveCostCoin > 0) deductRune.essence = { decrement: effectiveCostCoin }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dba = db as any
    const [, updatedUserRune] = await dba.$transaction([
      dba.runeInventory.upsert({
        where: { therianId_runeId: { therianId: therian.id, runeId: item.runeId } },
        update: { quantity: { increment: 1 } },
        create: { therianId: therian.id, runeId: item.runeId, quantity: 1, source: 'shop' },
      }),
      dba.user.update({
        where: { id: session.user.id },
        data: deductRune,
        select: { gold: true, essence: true, therianSlots: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      newBalance: { gold: updatedUserRune.gold, essence: updatedUserRune.essence, therianSlots: updatedUserRune.therianSlots },
    })
  }

  if (item.type === 'cosmetic' && item.accessoryId) {
    // Each purchase creates a unique instance: "typeId:uuid"
    // This allows the same cosmetic type to be bought multiple times (one per Therian)
    const instanceId = `${item.accessoryId}:${randomUUID()}`
    await db.inventoryItem.create({
      data: { userId: session.user.id, type: 'ACCESSORY', itemId: instanceId, quantity: 1 },
    })
  }

  let slotAchievementClaimed: string | null = null

  if (item.type === 'slot') {
    if (user.therianSlots >= 8) {
      return NextResponse.json({ error: 'MAX_SLOTS_REACHED' }, { status: 400 })
    }
    // Check if en_aventura achievement is already claimed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dba = db as any
    const u2 = await dba.user.findUnique({
      where: { id: session.user.id },
      select: { claimedAchievements: true },
    }) as { claimedAchievements: string } | null
    const prevClaimed: string[] = JSON.parse(u2?.claimedAchievements || '[]')
    if (!prevClaimed.includes('en_aventura')) {
      prevClaimed.push('en_aventura')
      slotAchievementClaimed = JSON.stringify(prevClaimed)
    }
  }

  // Deducir currency — build data explicitly so it's never an empty object
  const deductData: Record<string, unknown> = {}
  if (item.costGold > 0) deductData.gold = { decrement: item.costGold }
  if (effectiveCostCoin > 0) deductData.essence = { decrement: effectiveCostCoin }

  if (Object.keys(deductData).length === 0) {
    return NextResponse.json({ error: 'ITEM_HAS_NO_COST' }, { status: 500 })
  }

  if (item.type === 'slot') {
    deductData.therianSlots = { increment: 1 }
    if (slotAchievementClaimed) {
      deductData.claimedAchievements = slotAchievementClaimed
      deductData.gold = { increment: 500 }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedUser = await (db as any).user.update({
    where: { id: session.user.id },
    data: deductData,
    select: { gold: true, essence: true, therianSlots: true },
  })

  return NextResponse.json({
    success: true,
    newBalance: {
      gold: updatedUser.gold,
      essence: updatedUser.essence,
      therianSlots: updatedUser.therianSlots,
    },
    ...(updatedTherian ? { updatedTherian } : {}),
    ...(slotAchievementClaimed ? { achievementUnlocked: { id: 'en_aventura', title: 'En Aventura', rewardLabel: '🪙 +500 Oro' } } : {}),
  })
}
