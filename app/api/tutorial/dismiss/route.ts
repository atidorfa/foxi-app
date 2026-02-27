import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { parseTutorialState } from '@/lib/tutorial'

export async function POST() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any

  const user = await dba.user.findUnique({
    where: { id: session.user.id },
    select: { tutorialProgress: true },
  }) as { tutorialProgress: string } | null

  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const state = parseTutorialState(user.tutorialProgress ?? '{}')

  await dba.user.update({
    where: { id: session.user.id },
    data: { tutorialProgress: JSON.stringify({ ...state, dismissed: true }) },
  })

  return NextResponse.json({ ok: true })
}
