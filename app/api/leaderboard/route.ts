import { NextResponse, NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getSpeciesById } from '@/lib/catalogs/species'
import { getPaletteById } from '@/lib/catalogs/appearance'
import type { TherianAppearance } from '@/lib/generation/engine'

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(50, Math.max(1, parseInt(limitParam ?? '20', 10) || 20))

  const session = await getSession()

  const top = await db.therian.findMany({
    where: { name: { not: null } },
    orderBy: [{ bites: 'desc' }, { level: 'desc' }],
    take: limit,
  })

  // Find user's own rank
  let userRank: number | null = null
  if (session?.user?.id) {
    const userTherian = await db.therian.findFirst({
      where: { userId: session.user.id },
      orderBy: { bites: 'desc' },
    })
    if (userTherian) {
      const aboveCount = await db.therian.count({
        where: {
          OR: [
            { bites: { gt: userTherian.bites } },
            { bites: userTherian.bites, level: { gt: userTherian.level } },
          ],
        },
      })
      userRank = aboveCount + 1
    }
  }

  const entries = top.map((t, i) => {
    const species = getSpeciesById(t.speciesId)
    const appearance: TherianAppearance = JSON.parse(t.appearance)
    const palette = getPaletteById(appearance.palette)

    return {
      rank: i + 1,
      id: t.id,
      name: t.name,
      species: species
        ? { id: species.id, name: species.name, emoji: species.emoji }
        : { id: t.speciesId, name: t.speciesId, emoji: '?' },
      rarity: t.rarity,
      level: t.level,
      bites: t.bites,
      appearance: {
        palette: appearance.palette,
        paletteColors: palette
          ? { primary: palette.primary, secondary: palette.secondary, accent: palette.accent }
          : { primary: '#888', secondary: '#555', accent: '#aaa' },
        eyes: appearance.eyes,
        pattern: appearance.pattern,
        signature: appearance.signature,
      },
    }
  })

  return NextResponse.json({ entries, userRank })
}
