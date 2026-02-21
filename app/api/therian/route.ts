import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { assignUniqueName } from '@/lib/catalogs/names'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let therian = await db.therian.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  if (!therian) {
    return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
  }

  // Lazy name assignment for Therians that predate the feature
  if (!therian.name) {
    const uniqueName = await assignUniqueName(db)
    therian = await db.therian.update({
      where: { id: therian.id },
      data: { name: uniqueName },
    })
  }

  return NextResponse.json(toTherianDTO(therian))
}
