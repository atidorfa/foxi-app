import Link from 'next/link'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { getSpeciesById } from '@/lib/catalogs/species'
import { getPaletteById } from '@/lib/catalogs/appearance'
import LeaderboardTable from '@/components/LeaderboardTable'
import type { TherianAppearance } from '@/lib/generation/engine'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const session = await getSession()

  const top = await db.therian.findMany({
    where: { name: { not: null } },
    orderBy: [{ bites: 'desc' }, { level: 'desc' }],
    take: 20,
    include: { user: { select: { id: true, name: true, email: true } } },
  })

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
        paletteColors: palette
          ? { primary: palette.primary, secondary: palette.secondary, accent: palette.accent }
          : { primary: '#888', secondary: '#555', accent: '#aaa' },
      },
      ownerId: t.user.id,
      ownerName: t.user.name ?? t.user.email.split('@')[0],
    }
  })

  return (
    <div className="min-h-screen bg-[#08080F] relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-8"
          style={{ background: 'radial-gradient(ellipse, #d97706, transparent)' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#08080F]/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <Link href="/therian" className="text-xl font-bold gradient-text">therian.biz</Link>
        <div className="flex items-center gap-4">
          <Link href="/therian" className="text-[#8B84B0] hover:text-white text-sm transition-colors">Mi Therian</Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white">🏆 Salón de los Mordedores</h1>
          <p className="text-[#8B84B0] text-sm">Los Therians más temidos del mundo.</p>
        </div>

        {userRank !== null && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 flex items-center justify-between">
            <p className="text-[#8B84B0] text-sm">Tu posición global</p>
            <p className="text-amber-400 font-black font-mono text-2xl">#{userRank}</p>
          </div>
        )}

        <LeaderboardTable entries={entries} userRank={null} />

      </main>
    </div>
  )
}
