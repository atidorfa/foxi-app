import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getRuneById } from '@/lib/catalogs/runes'
import { toTherianDTO } from '@/lib/therian-dto'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await req.json()
    const { slotIndex, runeId, therianId } = body

    if (typeof slotIndex !== 'number' || slotIndex < 0 || slotIndex >= 6) {
      return NextResponse.json({ error: 'INVALID_SLOT' }, { status: 400 })
    }

    if (runeId !== null && !getRuneById(runeId)) {
      return NextResponse.json({ error: 'INVALID_RUNE' }, { status: 400 })
    }

    const therian = therianId
      ? await db.therian.findFirst({ where: { id: therianId, userId: session.user.id } })
      : await db.therian.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' } })

    if (!therian) {
      return NextResponse.json({ error: 'NO_THERIAN' }, { status: 404 })
    }

    let runes: (string | null)[] = JSON.parse(therian.equippedRunes || '[]')
    
    // Ensure array has exactly 6 elements
    if (!Array.isArray(runes)) runes = []
    while (runes.length < 6) runes.push(null)
    if (runes.length > 6) runes = runes.slice(0, 6)

    runes[slotIndex] = runeId

    const updated = await db.therian.update({
      where: { id: therian.id },
      data: { equippedRunes: JSON.stringify(runes) },
    })

    return NextResponse.json(toTherianDTO(updated))
  } catch (err: any) {
    console.error('Rune equip error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
