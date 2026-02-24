import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { getNarrative, ACTION_DELTAS, MAX_ACTIONS } from '@/lib/actions/narratives'
import type { ActionType } from '@/lib/actions/narratives'
import type { TherianStats } from '@/lib/generation/engine'
import { z } from 'zod'

const schema = z.object({
  action_type: z.enum(['CARE', 'TRAIN', 'EXPLORE', 'SOCIAL']),
  therianId:   z.string(),
})

function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

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
    where: { id: body.therianId, userId: session.user.id },
  })

  if (!therian) {
    return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
  }

  // Validar cap de acciones
  if (therian.actionsUsed >= MAX_ACTIONS) {
    return NextResponse.json({ error: 'MAX_ACTIONS_REACHED' }, { status: 429 })
  }

  const actionType = body.action_type as ActionType
  const delta = ACTION_DELTAS[actionType]
  const stats: TherianStats = JSON.parse(therian.stats)

  // Aplicar delta al stat correspondiente
  const oldVal = stats[delta.stat]
  stats[delta.stat] = Math.min(100, oldVal + delta.amount)

  // XP y nivel
  let xp = therian.xp + delta.xp
  let level = therian.level
  const xpNeeded = xpToNextLevel(level)

  if (xp >= xpNeeded) {
    xp -= xpNeeded
    level += 1
  }

  const narrative = getNarrative(actionType)

  const actionGains: Record<string, number> = JSON.parse(therian.actionGains || '{}')
  actionGains[actionType] = (actionGains[actionType] ?? 0) + 1

  const updated = await db.therian.update({
    where: { id: therian.id },
    data: {
      stats: JSON.stringify(stats),
      xp,
      level,
      actionsUsed: { increment: 1 },
      actionGains: JSON.stringify(actionGains),
    },
  })

  await db.user.update({
    where: { id: session.user.id },
    data: { gold: { increment: delta.gold } },
  })

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
    levelUp: level > therian.level,
    goldEarned: delta.gold,
  })
}
