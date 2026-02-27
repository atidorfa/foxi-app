import Link from 'next/link'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { getSpeciesById } from '@/lib/catalogs/species'
import { getPaletteById } from '@/lib/catalogs/appearance'
import LeaderboardTable from '@/components/LeaderboardTable'
import type { TherianAppearance } from '@/lib/generation/engine'

export const dynamic = 'force-dynamic'

function netScore(t: { bites: number; deaths?: number | null }): number {
  return t.bites - (t.deaths ?? 0)
}

export default async function LeaderboardPage() {
  const session = await getSession()

  // Fetch all active named therians for combat ranking (sort by net score in JS)
  const [allActive, topLevelUsers] = await Promise.all([
    db.therian.findMany({
      where: { name: { not: null }, status: 'active' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.user.findMany({
      where: {
        therians: { some: { name: { not: null }, status: 'active' } },
      },
      orderBy: [{ level: 'desc' }, { xp: 'desc' }, { createdAt: 'asc' }],
      take: 20,
      include: {
        therians: {
          where: { status: 'active', name: { not: null } },
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ])

  // Sort by net score (bites - deaths) DESC, tie-break by createdAt ASC
  const top = [...allActive]
    .sort((a, b) => {
      const diff = netScore(b as any) - netScore(a as any)
      return diff !== 0 ? diff : a.createdAt.getTime() - b.createdAt.getTime()
    })
    .slice(0, 20)

  let userRank: number | null = null
  let userRankLevel: number | null = null
  if (session?.user?.id) {
    const userTherian = allActive.find(t => t.user.id === session.user.id)

    const [, currentUser] = await Promise.all([
      Promise.resolve(null),
      db.user.findUnique({
        where: { id: session.user.id },
        select: {
          level: true,
          xp: true,
          createdAt: true,
          therians: { where: { status: 'active', name: { not: null } }, take: 1 },
        },
      }),
    ])

    if (userTherian) {
      const userNet = netScore(userTherian as any)
      const aboveBites = allActive.filter(t => {
        if (t.id === userTherian.id) return false
        const net = netScore(t as any)
        return net > userNet || (net === userNet && t.createdAt < userTherian.createdAt)
      }).length
      userRank = aboveBites + 1
    }

    if (currentUser && currentUser.therians.length > 0) {
      const aboveLevel = await db.user.count({
        where: {
          therians: { some: { status: 'active', name: { not: null } } },
          OR: [
            { level: { gt: currentUser.level } },
            { level: currentUser.level, xp: { gt: currentUser.xp } },
            { level: currentUser.level, xp: currentUser.xp, createdAt: { lt: currentUser.createdAt } },
          ],
        },
      })
      userRankLevel = aboveLevel + 1
    }
  }

  function mapEntry(t: typeof top[number], i: number) {
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
      bites: t.bites,
      deaths: (t as any).deaths ?? 0,
      appearance: {
        paletteColors: palette
          ? { primary: palette.primary, secondary: palette.secondary, accent: palette.accent }
          : { primary: '#888', secondary: '#555', accent: '#aaa' },
      },
      ownerId: t.user.id,
      ownerName: t.user.name ?? t.user.email.split('@')[0],
    }
  }

  function mapLevelEntry(u: typeof topLevelUsers[number], i: number) {
    const therian = u.therians[0]
    if (!therian) return null
    const species = getSpeciesById(therian.speciesId)
    const appearance: TherianAppearance = JSON.parse(therian.appearance)
    const palette = getPaletteById(appearance.palette)
    return {
      rank: i + 1,
      id: therian.id,
      name: therian.name,
      species: species
        ? { id: species.id, name: species.name, emoji: species.emoji }
        : { id: therian.speciesId, name: therian.speciesId, emoji: '?' },
      rarity: therian.rarity,
      bites: therian.bites,
      deaths: (therian as any).deaths ?? 0,
      level: u.level,
      xp: u.xp,
      appearance: {
        paletteColors: palette
          ? { primary: palette.primary, secondary: palette.secondary, accent: palette.accent }
          : { primary: '#888', secondary: '#555', accent: '#aaa' },
      },
      ownerId: u.id,
      ownerName: u.name ?? u.email.split('@')[0],
    }
  }

  const entries = top.map((t, i) => mapEntry(t, i))
  const entriesLevel = topLevelUsers.map((u, i) => mapLevelEntry(u, i)).filter(Boolean) as NonNullable<ReturnType<typeof mapLevelEntry>>[]

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

        {(userRank !== null || userRankLevel !== null) && (
          <div className="grid grid-cols-2 gap-3">
            {userRank !== null && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex flex-col items-center">
                <p className="text-[#8B84B0] text-xs mb-1">⚔️ Combate</p>
                <p className="text-amber-400 font-black font-mono text-2xl">#{userRank}</p>
              </div>
            )}
            {userRankLevel !== null && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 flex flex-col items-center">
                <p className="text-[#8B84B0] text-xs mb-1">✨ Nivel</p>
                <p className="text-purple-400 font-black font-mono text-2xl">#{userRankLevel}</p>
              </div>
            )}
          </div>
        )}

        <LeaderboardTable entries={entries} entriesLevel={entriesLevel} userRank={userRank} userRankLevel={userRankLevel} />

      </main>
    </div>
  )
}
