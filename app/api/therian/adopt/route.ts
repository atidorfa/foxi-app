import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { generateTherian } from '@/lib/generation/engine'
import { toTherianDTO } from '@/lib/therian-dto'
import { assignUniqueName } from '@/lib/catalogs/names'

const ADOPT_COST = 150

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const [user, totalCount] = await Promise.all([
    (db as any).user.findUnique({ where: { id: session.user.id }, select: { gold: true } }) as Promise<{ gold: number } | null>,
    db.therian.count({ where: { userId: session.user.id } }),
  ])

  const needsPayment = totalCount > 0
  return NextResponse.json({
    cost: needsPayment ? ADOPT_COST : 0,
    gold: user?.gold ?? 0,
    canAfford: !needsPayment || (user?.gold ?? 0) >= ADOPT_COST,
  })
}

export async function POST() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { therianSlots: true, gold: true },
  })

  const [activeCount, totalCount] = await Promise.all([
    db.therian.count({ where: { userId: session.user.id, status: 'active' } }),
    db.therian.count({ where: { userId: session.user.id } }),
  ])

  const hasSlot = activeCount < (user?.therianSlots ?? 1)
  const needsPayment = totalCount > 0

  if (needsPayment && (user?.gold ?? 0) < ADOPT_COST) {
    return NextResponse.json({ error: 'INSUFFICIENT_GOLD', required: ADOPT_COST }, { status: 402 })
  }

  const secret = process.env.SERVER_SECRET ?? 'default-secret'
  const generated = generateTherian(session.user.id, secret)
  const uniqueName = await assignUniqueName(db)

  const [therian] = await db.$transaction([
    db.therian.create({
      data: {
        userId:     session.user.id,
        speciesId:  generated.speciesId,
        rarity:     generated.rarity,
        seed:       generated.seed,
        appearance: JSON.stringify(generated.appearance),
        stats:      JSON.stringify(generated.stats),
        traitId:    generated.traitId,
        name:       uniqueName,
        status:     hasSlot ? 'active' : 'capsule',
      },
    }),
    ...(needsPayment
      ? [db.user.update({ where: { id: session.user.id }, data: { gold: { decrement: ADOPT_COST } } })]
      : []
    ),
  ])

  return NextResponse.json(toTherianDTO(therian), { status: 201 })
}
