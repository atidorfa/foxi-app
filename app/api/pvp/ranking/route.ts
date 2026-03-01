import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getRankFromMmr } from '@/lib/pvp/mmr'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any

  const top10 = await dba.user.findMany({
    orderBy: { mmr: 'desc' },
    take: 10,
    select: { id: true, name: true, mmr: true },
  }) as Array<{ id: string; name: string | null; mmr: number }>

  const entries = top10.map((u, i) => ({
    position: i + 1,
    name: u.name ?? 'Anónimo',
    mmr: u.mmr,
    rank: getRankFromMmr(u.mmr),
    isCurrentUser: u.id === session.user.id,
  }))

  // If current user is not in top 10, find their position
  const isInTop10 = entries.some(e => e.isCurrentUser)
  let currentUserEntry = null
  if (!isInTop10) {
    const me = await dba.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, mmr: true },
    }) as { name: string | null; mmr: number } | null

    if (me) {
      const above = await dba.user.count({ where: { mmr: { gt: me.mmr } } })
      currentUserEntry = {
        position: above + 1,
        name: me.name ?? 'Tú',
        mmr: me.mmr,
        rank: getRankFromMmr(me.mmr),
        isCurrentUser: true,
      }
    }
  }

  return NextResponse.json({ entries, currentUser: currentUserEntry })
}
