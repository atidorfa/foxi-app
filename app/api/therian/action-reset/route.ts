import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { z } from 'zod'

const RESET_COST = 1000

const schema = z.object({
  therianId: z.string(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body
  try {
    body = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
  }

  const [therian, user] = await Promise.all([
    db.therian.findFirst({ where: { id: body.therianId, userId: session.user.id } }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ])

  if (!therian) return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
  if (!user) return NextResponse.json({ error: 'NO_USER' }, { status: 404 })

  if (user.gold < RESET_COST) {
    return NextResponse.json({ error: 'NOT_ENOUGH_GOLD', required: RESET_COST, current: user.gold }, { status: 402 })
  }

  const [updated] = await Promise.all([
    db.therian.update({
      where: { id: therian.id },
      data: { actionsUsed: 0, actionGains: '{}' },
    }),
    db.user.update({
      where: { id: session.user.id },
      data: { gold: { decrement: RESET_COST } },
    }),
  ])

  return NextResponse.json({ therian: toTherianDTO(updated), goldSpent: RESET_COST })
}
