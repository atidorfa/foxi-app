import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO, xpToNextLevel } from '@/lib/therian-dto'
import { getNarrative, ACTION_DELTAS, MAX_ACTIONS } from '@/lib/actions/narratives'
import type { ActionType } from '@/lib/actions/narratives'
import type { TherianStats } from '@/lib/generation/engine'
import { z } from 'zod'

const ACTIONS: ActionType[] = ['CARE', 'TRAIN', 'EXPLORE', 'SOCIAL']

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

  const therian = await db.therian.findFirst({
    where: { id: body.therianId, userId: session.user.id, status: 'active' },
  })

  if (!therian) {
    return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
  }

  // Validar cap de acciones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((therian as any).actionsUsed >= MAX_ACTIONS) {
    return NextResponse.json({ error: 'MAX_ACTIONS_REACHED' }, { status: 429 })
  }

  // Cooldown de 3 minutos por Therian
  const ACTION_COOLDOWN_MS = 3 * 60 * 1000
  if (therian.lastActionAt) {
    const elapsed = Date.now() - new Date(therian.lastActionAt).getTime()
    if (elapsed < ACTION_COOLDOWN_MS) {
      const nextActionAt = new Date(new Date(therian.lastActionAt).getTime() + ACTION_COOLDOWN_MS).toISOString()
      return NextResponse.json({ error: 'COOLDOWN_ACTIVE', nextActionAt }, { status: 429 })
    }
  }

  const actionType = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
  const delta = ACTION_DELTAS[actionType]
  const stats: TherianStats = JSON.parse(therian.stats)

  // Aplicar delta al stat correspondiente
  const oldVal = stats[delta.stat]
  stats[delta.stat] = Math.min(100, oldVal + delta.amount)

  const narrative = getNarrative(actionType)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionGains: Record<string, number> = JSON.parse((therian as any).actionGains || '{}')
  actionGains[actionType] = (actionGains[actionType] ?? 0) + 1

  // XP y nivel van al User
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const user = await dba.user.findUnique({
    where: { id: session.user.id },
    select: { level: true, xp: true, gold: true },
  }) as { level: number; xp: number; gold: number } | null

  let userXp = (user?.xp ?? 0) + delta.xp
  let userLevel = user?.level ?? 1
  const xpNeeded = xpToNextLevel(userLevel)
  let levelUp = false
  if (userXp >= xpNeeded) {
    userXp -= xpNeeded
    userLevel += 1
    levelUp = true
  }

  const [updated] = await Promise.all([
    dba.therian.update({
      where: { id: therian.id },
      data: {
        stats: JSON.stringify(stats),
        actionsUsed: { increment: 1 },
        actionGains: JSON.stringify(actionGains),
        lastActionAt: new Date(),
      },
    }),
    dba.user.update({
      where: { id: session.user.id },
      data: { gold: { increment: delta.gold }, xp: userXp, level: userLevel },
    }),
  ])

  // Log de la acción
  await db.actionLog.create({
    data: {
      therianId:  therian.id,
      actionType,
      delta:      JSON.stringify({ stat: delta.stat, amount: delta.amount, xp: delta.xp, gold: delta.gold }),
      narrative,
    },
  })

  return NextResponse.json({
    therian: toTherianDTO(updated),
    narrative,
    delta: { stat: delta.stat, amount: delta.amount, xp: delta.xp },
    actionType,
    levelUp,
    goldEarned: delta.gold,
    userLevel,
    userXp,
  })
}
