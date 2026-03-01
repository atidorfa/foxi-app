import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { EGG_BY_ID } from '@/lib/items/eggs'
import { SHOP_ITEMS } from '@/lib/shop/catalog'

export type InventoryItemDTO = {
  id: string
  type: string
  itemId: string
  quantity: number
  name: string
  emoji: string
  rarity: string
  description: string
  createdAt: string
}

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  // Lazy migration: move accessories from therian.accessories → InventoryItem
  // This runs once per user until all accessories are migrated
  const [therians, existingAccItems] = await Promise.all([
    db.therian.findMany({ where: { userId }, select: { accessories: true } }),
    db.inventoryItem.findMany({ where: { userId, type: 'ACCESSORY' }, select: { itemId: true } }),
  ])

  const existingAccIds = new Set(existingAccItems.map(i => i.itemId))
  const legacyAccIds = new Set<string>()
  for (const t of therians) {
    try {
      const parsed = JSON.parse(t.accessories ?? '[]')
      // Only migrate old array format; object format means already migrated
      if (Array.isArray(parsed)) {
        parsed.forEach((a: string) => legacyAccIds.add(a))
      }
    } catch { /* ignore */ }
  }
  const toMigrate = [...legacyAccIds].filter(a => !existingAccIds.has(a))
  if (toMigrate.length > 0) {
    await db.inventoryItem.createMany({
      data: toMigrate.map(accId => ({ userId, type: 'ACCESSORY', itemId: accId, quantity: 1 })),
      skipDuplicates: true,
    })
  }

  // Build set of instanceIds currently equipped on any Therian
  // Equipped accessories must NOT appear in the inventory — they belong to that Therian
  const equippedInstanceIds = new Set<string>()
  for (const t of therians) {
    try {
      const parsed = JSON.parse(t.accessories ?? '{}')
      if (Array.isArray(parsed)) {
        // Legacy array format: typeIds like 'glasses'
        parsed.forEach((id: string) => equippedInstanceIds.add(id))
      } else {
        // New object format: { slotId: instanceId }
        Object.values(parsed as Record<string, string>).forEach(id => equippedInstanceIds.add(id))
      }
    } catch { /* ignore */ }
  }

  // Fetch all inventory items, excluding accessories that are currently equipped
  const inventoryItems = await db.inventoryItem.findMany({
    where: { userId, quantity: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
  })

  const enriched: InventoryItemDTO[] = inventoryItems
    .filter(item => item.type !== 'ACCESSORY' || !equippedInstanceIds.has(item.itemId))
    .map(item => {
    if (item.type === 'EGG') {
      const meta = EGG_BY_ID[item.itemId]
      return {
        id: item.id,
        type: 'EGG',
        itemId: item.itemId,
        quantity: item.quantity,
        name: meta?.name ?? item.itemId,
        emoji: meta?.emoji ?? '🥚',
        rarity: meta?.rarity ?? 'COMMON',
        description: meta?.description ?? '',
        createdAt: item.createdAt.toISOString(),
      }
    }
    if (item.type === 'ACCESSORY') {
      // instanceId format: "typeId:uuid" (new) or just "typeId" (legacy)
      const typeId = item.itemId.includes(':') ? item.itemId.split(':')[0] : item.itemId
      const shopItem = SHOP_ITEMS.find(i => i.accessoryId === typeId)
      return {
        id: item.id,
        type: 'ACCESSORY',
        itemId: item.itemId,
        quantity: 1,
        name: shopItem?.name ?? typeId,
        emoji: shopItem?.emoji ?? '🎨',
        rarity: 'ACCESSORY',
        description: shopItem?.description ?? '',
        createdAt: item.createdAt.toISOString(),
      }
    }
    return {
      id: item.id,
      type: item.type,
      itemId: item.itemId,
      quantity: item.quantity,
      name: item.itemId,
      emoji: '📦',
      rarity: 'COMMON',
      description: '',
      createdAt: item.createdAt.toISOString(),
    }
  })

  return NextResponse.json({ items: enriched })
}
