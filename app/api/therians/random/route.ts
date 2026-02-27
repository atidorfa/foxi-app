import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'

const RARITY_RANK: Record<string, number> = {
  COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5,
}
const MAX_RARITY_DIFF = 2

export async function GET(req: NextRequest) {
  const session = await getSession()
  const currentUserId = session?.user?.id ?? null

  const therianId = req.nextUrl.searchParams.get('therianId')

  // If therianId provided, load challenger rarity to filter by range
  let rarityFilter: string[] | null = null
  if (therianId && currentUserId) {
    const challenger = await db.therian.findFirst({
      where: { id: therianId, userId: currentUserId, status: 'active' },
      select: { rarity: true },
    })
    if (challenger) {
      const rank = RARITY_RANK[challenger.rarity] ?? 0
      rarityFilter = Object.entries(RARITY_RANK)
        .filter(([, r]) => Math.abs(r - rank) <= MAX_RARITY_DIFF)
        .map(([key]) => key)
    }
  }

  const where = {
    ...(currentUserId ? { userId: { not: currentUserId } } : {}),
    name: { not: null },
    status: 'active',
    ...(rarityFilter ? { rarity: { in: rarityFilter } } : {}),
  }

  const count = await db.therian.count({ where })

  if (count === 0) {
    return NextResponse.json({ error: 'NO_THERIANS' }, { status: 404 })
  }

  const skip = Math.floor(Math.random() * count)
  const therian = await db.therian.findFirst({ where, skip })

  if (!therian) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json(toTherianDTO(therian))
}
