import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const therianId = url.searchParams.get('therianId')

  const therian = therianId
    ? await db.therian.findFirst({ where: { id: therianId, userId: session.user.id, status: 'active' } })
    : await db.therian.findFirst({ where: { userId: session.user.id, status: 'active' }, orderBy: { createdAt: 'asc' } })

  if (!therian) return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inventory = await (db as any).runeInventory.findMany({
    where: { therianId: therian.id },
    select: { runeId: true, quantity: true },
  })

  return NextResponse.json({ inventory })
}
