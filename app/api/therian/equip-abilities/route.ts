import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import { ABILITY_BY_ID } from '@/lib/pvp/abilities'

const MAX_ABILITIES = 3

const schema = z.object({
  therianId:  z.string(),
  abilityIds: z.array(z.string()).max(MAX_ABILITIES),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 }) }

  // Validar que el Therian pertenece al usuario y está activo
  const therian = await db.therian.findFirst({
    where: { id: body.therianId, userId: session.user.id, status: 'active' },
  })
  if (!therian) {
    return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
  }

  // Validar que todas las habilidades existen y no son innatas ni pasivas (pasivas sí se permiten)
  for (const id of body.abilityIds) {
    const ability = ABILITY_BY_ID[id]
    if (!ability) {
      return NextResponse.json({ error: 'INVALID_ABILITY', abilityId: id }, { status: 400 })
    }
    if (ability.isInnate) {
      return NextResponse.json({ error: 'CANNOT_EQUIP_INNATE', abilityId: id }, { status: 400 })
    }
  }

  const updated = await db.therian.update({
    where: { id: therian.id },
    data: { equippedAbilities: JSON.stringify(body.abilityIds) },
  })

  return NextResponse.json({ therian: toTherianDTO(updated) })
}
