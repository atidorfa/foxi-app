import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { z } from 'zod'

const GOLD_PER_ESSENCE = 100  // gold spent to get 1 essence
const GOLD_PER_SELL    = 80   // gold received for 1 essence

const schema = z.object({
  direction: z.enum(['buy', 'sell']),  // buy = gold→essence, sell = essence→gold
  qty: z.number().int().min(1),
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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { gold: true, essence: true },
  })
  if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  let data: { gold: { decrement?: number; increment?: number }; essence: { decrement?: number; increment?: number } }

  if (body.direction === 'buy') {
    const goldCost = body.qty * GOLD_PER_ESSENCE
    if (user.gold < goldCost) {
      return NextResponse.json({ error: 'INSUFFICIENT_GOLD', available: user.gold }, { status: 400 })
    }
    data = { gold: { decrement: goldCost }, essence: { increment: body.qty } }
  } else {
    if (user.essence < body.qty) {
      return NextResponse.json({ error: 'INSUFFICIENT_ESSENCE', available: user.essence }, { status: 400 })
    }
    const goldGain = body.qty * GOLD_PER_SELL
    data = { essence: { decrement: body.qty }, gold: { increment: goldGain } }
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data,
    select: { gold: true, essence: true },
  })

  return NextResponse.json({ gold: updated.gold, essence: updated.essence })
}
