import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'

export async function GET() {
  const session = await getSession()
  const currentUserId = session?.user?.id ?? null

  const where = currentUserId
    ? { userId: { not: currentUserId }, name: { not: null } }
    : { name: { not: null } }

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
