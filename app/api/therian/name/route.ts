import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

const schema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(24, 'El nombre no puede superar 24 caracteres.')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, 'Solo se permiten letras, espacios, guiones y apóstrofes.'),
})

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const newName = parsed.data.name.trim()

  const therian = await db.therian.findUnique({
    where: { userId: session.user.id },
  })
  if (!therian) {
    return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
  }

  // Verificar unicidad (excluyendo el propio Therian)
  const existing = await db.therian.findUnique({ where: { name: newName } })
  if (existing && existing.id !== therian.id) {
    return NextResponse.json({ error: 'Ese nombre ya está en uso.' }, { status: 409 })
  }

  const updated = await db.therian.update({
    where: { id: therian.id },
    data: { name: newName },
  })

  return NextResponse.json({ name: updated.name })
}
