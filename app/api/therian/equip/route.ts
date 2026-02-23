import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { z } from 'zod'

const schema = z.object({
  therianId: z.string(),
  accessoryId: z.string(),
  action: z.enum(['equip', 'unequip']),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  let body
  try {
    body = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
  }

  const { therianId, accessoryId, action } = body
  const userId = session.user.id

  // Validate therian belongs to user
  const therian = await db.therian.findFirst({ where: { id: therianId, userId } })
  if (!therian) return NextResponse.json({ error: 'THERIAN_NOT_FOUND' }, { status: 404 })

  // Validate ownership: InventoryItem (new) or legacy therian.accessories
  const inventoryItem = await db.inventoryItem.findUnique({
    where: { userId_itemId: { userId, itemId: accessoryId } },
  })
  if (!inventoryItem) {
    const allTherians = await db.therian.findMany({ where: { userId }, select: { accessories: true } })
    const legacyOwned = allTherians.some(t =>
      (JSON.parse(t.accessories ?? '[]') as string[]).includes(accessoryId)
    )
    if (!legacyOwned) return NextResponse.json({ error: 'NOT_OWNED' }, { status: 403 })
  }

  const equipped: string[] = JSON.parse(therian.accessories ?? '[]')

  if (action === 'equip') {
    if (!equipped.includes(accessoryId)) equipped.push(accessoryId)
  } else {
    const idx = equipped.indexOf(accessoryId)
    if (idx !== -1) equipped.splice(idx, 1)
  }

  const updated = await db.therian.update({
    where: { id: therianId },
    data: { accessories: JSON.stringify(equipped) },
  })

  return NextResponse.json({ therian: toTherianDTO(updated) })
}
