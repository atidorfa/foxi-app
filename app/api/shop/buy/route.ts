import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getShopItem } from '@/lib/shop/catalog'
import { toTherianDTO } from '@/lib/therian-dto'
import { z } from 'zod'

const schema = z.object({
  itemId: z.string(),
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

  // Validar saldo
  if (item.costGold > 0 && user.gold < item.costGold) {
    return NextResponse.json(
      { error: 'INSUFFICIENT_ESSENCIA', available: user.gold, required: item.costGold },
      { status: 400 }
    )
  }
  if (item.costCoin > 0 && user.essence < item.costCoin) {
    return NextResponse.json(
      { error: 'INSUFFICIENT_COIN', available: user.essence, required: item.costCoin },
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

  if (item.type === 'cosmetic' && item.accessoryId) {
    const therian = await db.therian.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' } })
    if (!therian) {
      return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
    }

    const ownedAccessories: string[] = JSON.parse(therian.accessories ?? '[]')
    if (ownedAccessories.includes(item.accessoryId)) {
      return NextResponse.json({ error: 'ALREADY_OWNED' }, { status: 409 })
    }

    ownedAccessories.push(item.accessoryId)
    const t = await db.therian.update({
      where: { id: therian.id },
      data: { accessories: JSON.stringify(ownedAccessories) },
    })
    updatedTherian = toTherianDTO(t)
  }

  if (item.type === 'slot') {
    if (user.therianSlots >= 8) {
      return NextResponse.json({ error: 'MAX_SLOTS_REACHED' }, { status: 400 })
    }
    await db.user.update({
      where: { id: session.user.id },
      data: { therianSlots: { increment: 1 } },
    })
  }

  // Deducir currency
  const updatedUser = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(item.costGold > 0 ? { gold: { decrement: item.costGold } } : {}),
      ...(item.costCoin > 0 ? { essence: { decrement: item.costCoin } } : {}),
    },
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
  })
}
