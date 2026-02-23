import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { SLOT_BY_ID } from '@/lib/items/accessory-slots'
import { z } from 'zod'

const schema = z.object({
  therianId: z.string(),
  slotId: z.string(),
  accessoryId: z.string().nullable(),
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

  const { therianId, slotId, accessoryId } = body
  const userId = session.user.id

  // Validate slot exists
  if (!SLOT_BY_ID[slotId]) {
    return NextResponse.json({ error: 'INVALID_SLOT' }, { status: 400 })
  }

  // Validate therian belongs to user
  const therian = await db.therian.findFirst({ where: { id: therianId, userId } })
  if (!therian) return NextResponse.json({ error: 'THERIAN_NOT_FOUND' }, { status: 404 })

  // Validate ownership if equipping
  if (accessoryId !== null) {
    const owned = await db.inventoryItem.findUnique({
      where: { userId_itemId: { userId, itemId: accessoryId } },
    })
    if (!owned) return NextResponse.json({ error: 'NOT_OWNED' }, { status: 403 })
  }

  // Parse current equipped accessories (object format)
  let equipped: Record<string, string> = {}
  try {
    const parsed = JSON.parse(therian.accessories ?? '{}')
    if (!Array.isArray(parsed)) equipped = parsed
  } catch {
    equipped = {}
  }

  if (accessoryId === null) {
    // Unequip: remove the slot — instance returns to inventory automatically
    delete equipped[slotId]
  } else {
    // If this instanceId is equipped on another Therian, remove it from there first
    const otherTherians = await db.therian.findMany({
      where: { userId, NOT: { id: therianId } },
      select: { id: true, accessories: true },
    })
    const unequipOps: Promise<unknown>[] = []
    for (const other of otherTherians) {
      try {
        const parsed = JSON.parse(other.accessories ?? '{}')
        if (Array.isArray(parsed)) continue
        const otherEquipped = parsed as Record<string, string>
        const occupiedSlot = Object.entries(otherEquipped).find(([, aid]) => aid === accessoryId)
        if (occupiedSlot) {
          delete otherEquipped[occupiedSlot[0]]
          unequipOps.push(
            db.therian.update({
              where: { id: other.id },
              data: { accessories: JSON.stringify(otherEquipped) },
            })
          )
        }
      } catch { /* ignore */ }
    }
    if (unequipOps.length > 0) await Promise.all(unequipOps)

    // Remove this instanceId from any other slot on THIS Therian (can't double-equip)
    for (const [sid, aid] of Object.entries(equipped)) {
      if (aid === accessoryId && sid !== slotId) delete equipped[sid]
    }
    equipped[slotId] = accessoryId
  }

  const updated = await db.therian.update({
    where: { id: therianId },
    data: { accessories: JSON.stringify(equipped) },
  })

  return NextResponse.json({ therian: toTherianDTO(updated) })
}
