import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { z } from 'zod'

const EXCHANGE_RATE = 200 // Esencia por 1 Therian COIN

const schema = z.object({
  amount: z.number().int().positive().multipleOf(EXCHANGE_RATE),
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
    return NextResponse.json(
      { error: 'INVALID_INPUT', message: `El monto debe ser múltiplo de ${EXCHANGE_RATE}` },
      { status: 400 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { essencia: true, therianCoin: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  if (user.essencia < body.amount) {
    return NextResponse.json(
      { error: 'INSUFFICIENT_ESSENCIA', available: user.essencia },
      { status: 400 }
    )
  }

  const coinsToAdd = Math.floor(body.amount / EXCHANGE_RATE)

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: {
      essencia: { decrement: body.amount },
      therianCoin: { increment: coinsToAdd },
    },
    select: { essencia: true, therianCoin: true },
  })

  return NextResponse.json({
    essencia: updated.essencia,
    therianCoin: updated.therianCoin,
    exchanged: { essencia: body.amount, coinReceived: coinsToAdd },
  })
}
