import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (db as any).user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, createdAt: true, level: true, xp: true },
  }) as { id: string; email: string; name: string | null; createdAt: Date; level: number; xp: number } | null

  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const xpToNext = Math.floor(100 * Math.pow(1.5, user.level - 1))
  return NextResponse.json({ ...user, xpToNext })
}
