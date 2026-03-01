import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'

const saveSchema = z.object({
  teamIds: z.array(z.string()).length(3),
})

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const user = await dba.user.findUnique({
    where: { id: session.user.id },
    select: { savedPvpTeam: true },
  }) as { savedPvpTeam: string | null } | null

  if (!user?.savedPvpTeam) {
    return NextResponse.json({ teamIds: [], therians: [] })
  }

  const teamIds: string[] = JSON.parse(user.savedPvpTeam)
  const therians = await db.therian.findMany({
    where: { id: { in: teamIds }, userId: session.user.id, status: 'active' },
  })

  // Return in the same order as teamIds, filter out missing ones
  const therianMap = new Map(therians.map(t => [t.id, t]))
  const orderedTherians = teamIds
    .map(id => therianMap.get(id))
    .filter((t): t is typeof therians[0] => !!t)

  return NextResponse.json({
    teamIds: orderedTherians.map(t => t.id),
    therians: orderedTherians.map(t => toTherianDTO(t)),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body
  try { body = saveSchema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 }) }

  // Validate that all 3 therians belong to the user and are active
  const therians = await db.therian.findMany({
    where: { id: { in: body.teamIds }, userId: session.user.id, status: 'active' },
    select: { id: true },
  })
  if (therians.length !== 3) {
    return NextResponse.json({ error: 'INVALID_TEAM' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  await dba.user.update({
    where: { id: session.user.id },
    data: { savedPvpTeam: JSON.stringify(body.teamIds) },
  })

  return NextResponse.json({ ok: true, teamIds: body.teamIds })
}
