import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { ABILITY_BY_ID } from '@/lib/pvp/abilities'

const MAX_ACTIVE   = 3
const MAX_PASSIVES = 2

const schema = z.object({
  therianId:  z.string(),
  abilityIds: z.array(z.string()).max(MAX_ACTIVE),   // habilidades activas
  passiveIds: z.array(z.string()).max(MAX_PASSIVES).optional(), // habilidades pasivas
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  let body
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 }) }

  const allIds     = [...body.abilityIds, ...(body.passiveIds ?? [])]
  const passiveIds = body.passiveIds ?? []

  // Validar que el Therian pertenece al usuario y está activo
  const therian = await db.therian.findFirst({
    where: { id: body.therianId, userId, status: 'active' },
  })
  if (!therian) {
    return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
  }

  // Validar cada habilidad
  for (const id of allIds) {
    const ability = ABILITY_BY_ID[id]
    if (!ability) {
      return NextResponse.json({ error: 'INVALID_ABILITY', abilityId: id }, { status: 400 })
    }
    if (ability.isInnate) {
      return NextResponse.json({ error: 'CANNOT_EQUIP_INNATE', abilityId: id }, { status: 400 })
    }
    // Activas solo en abilityIds, pasivas solo en passiveIds
    if (ability.type === 'passive' && body.abilityIds.includes(id)) {
      return NextResponse.json({ error: 'PASSIVE_IN_ACTIVE_SLOT', abilityId: id }, { status: 400 })
    }
    if (ability.type === 'active' && passiveIds.includes(id)) {
      return NextResponse.json({ error: 'ACTIVE_IN_PASSIVE_SLOT', abilityId: id }, { status: 400 })
    }
  }

  // Validar ownership — cada habilidad debe estar en el inventario del usuario
  // con cantidad suficiente (cantidad total - ya equipadas en otros Therians)
  const dba = db as any
  for (const id of allIds) {
    // Buscar cuántas copias tiene el usuario
    const inv = await dba.userAbilityInventory.findUnique({
      where: { userId_abilityId: { userId, abilityId: id } },
    }) as { quantity: number } | null

    const owned = inv?.quantity ?? 0

    // Contar cuántos otros Therians del usuario ya tienen esta habilidad equipada
    const ability = ABILITY_BY_ID[id]!
    const field = ability.type === 'passive' ? 'equippedPassives' : 'equippedAbilities'
    const otherTherians = await db.therian.findMany({
      where: { userId, id: { not: body.therianId }, status: 'active' },
      select: { [field]: true },
    })
    const equippedElsewhere = otherTherians.filter(t =>
      (JSON.parse((t as any)[field] || '[]') as string[]).includes(id)
    ).length

    if (owned - equippedElsewhere < 1) {
      return NextResponse.json({
        error: 'NOT_ENOUGH_COPIES',
        abilityId: id,
        owned,
        equippedElsewhere,
      }, { status: 409 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (db as any).therian.update({
    where: { id: therian.id },
    data: {
      equippedAbilities: JSON.stringify(body.abilityIds),
      equippedPassives:  JSON.stringify(passiveIds),
    },
  })

  return NextResponse.json({ therian: toTherianDTO(updated) })
}
