import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { essencia: true, therianCoin: true, therianSlots: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({
    essencia: user.essencia,
    therianCoin: user.therianCoin,
    therianSlots: user.therianSlots,
  })
}
