import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import TherianAvatar from '@/components/TherianAvatar'
import StatBar from '@/components/StatBar'
import RarityBadge from '@/components/RarityBadge'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const STAT_CONFIG = [
  { key: 'vitality' as const, label: 'Vitalidad', icon: '🌿', color: 'vitality' },
  { key: 'agility'  as const, label: 'Agilidad',  icon: '⚡', color: 'agility' },
  { key: 'instinct' as const, label: 'Instinto',  icon: '🌌', color: 'instinct' },
  { key: 'charisma' as const, label: 'Carisma',   icon: '✨', color: 'charisma' },
]

const RARITY_GLOW: Record<string, string> = {
  COMMON:    'border-white/10',
  RARE:      'border-blue-500/30 shadow-[0_0_30px_rgba(96,165,250,0.1)]',
  EPIC:      'border-purple-500/40 shadow-[0_0_40px_rgba(192,132,252,0.15)]',
  LEGENDARY: 'border-amber-500/50 shadow-[0_0_50px_rgba(252,211,77,0.2),0_0_100px_rgba(252,211,77,0.05)]',
}

export default async function TherianProfilePage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name: rawName } = await params
  const name = decodeURIComponent(rawName)

  const session = await getSession()

  const therian = await db.therian.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })

  if (!therian) notFound()

  const dto = toTherianDTO(therian)

  const aboveCount = await db.therian.count({
    where: {
      OR: [
        { bites: { gt: therian.bites } },
        { bites: therian.bites, level: { gt: therian.level } },
      ],
    },
  })
  const rank = aboveCount + 1

  const isOwner = session?.user?.id === therian.userId
  const xpPct = Math.min(100, (dto.xp / dto.xpToNext) * 100)
  const glowClass = RARITY_GLOW[dto.rarity] ?? RARITY_GLOW.COMMON

  return (
    <div className="min-h-screen bg-[#08080F] relative">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[150px] opacity-10"
          style={{ background: `radial-gradient(ellipse, ${dto.appearance.paletteColors.primary}, transparent)` }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#08080F]/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold gradient-text">therian.biz</Link>
        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-[#8B84B0] hover:text-white text-sm transition-colors">🏆 Top</Link>
          {isOwner && (
            <Link href="/therian" className="text-[#8B84B0] hover:text-white text-sm transition-colors">Mi Therian</Link>
          )}
        </div>
      </nav>

      <main className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-4">

        {/* Profile card */}
        <div className={`relative rounded-2xl border bg-[#13131F] overflow-hidden ${glowClass}`}>
          {/* Fondo decorativo */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${dto.appearance.paletteColors.primary}, transparent 70%)`,
            }}
          />

          <div className="relative p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <h1 className="text-2xl font-bold text-white">{dto.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <p className="text-[#8B84B0] text-xs">🔰 Nivel {dto.level}</p>
                  <p className="text-[#8B84B0] text-xs">🦷 {dto.bites} mordidas</p>
                  <p className="text-[#8B84B0] text-xs">🏆 #{rank}</p>
                </div>
              </div>
              <RarityBadge rarity={dto.rarity} />
            </div>

            {/* Avatar */}
            <div className="flex justify-center">
              <TherianAvatar therian={dto} size={220} animated />
            </div>

            {/* Trait */}
            <div className="rounded-xl border border-white/5 bg-white/3 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[#8B84B0] text-xs uppercase tracking-widest">Arquetipo</span>
                <span className="text-white font-semibold text-sm">{dto.trait.name}</span>
              </div>
              <p className="text-[#A99DC0] italic text-sm mt-1">{dto.trait.lore}</p>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <h3 className="text-[#8B84B0] text-xs uppercase tracking-widest">Stats</h3>
              {STAT_CONFIG.map((cfg) => (
                <StatBar
                  key={cfg.key}
                  label={cfg.label}
                  icon={cfg.icon}
                  value={dto.stats[cfg.key]}
                  color={cfg.color}
                />
              ))}
            </div>

            {/* XP Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#8B84B0]">
                <span>XP</span>
                <span className="font-mono">{dto.xp} / {dto.xpToNext}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-700 to-purple-400 rounded-full"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>

            {/* Adoption date */}
            <p className="text-center text-[#4A4468] text-xs">
              Adoptado el {new Date(dto.createdAt).toLocaleDateString('es-AR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/leaderboard"
            className="flex-1 py-3 rounded-xl text-center text-sm font-semibold border border-white/10 text-[#8B84B0] hover:text-white hover:border-white/20 transition-colors"
          >
            ← Leaderboard
          </Link>
          {isOwner && (
            <Link
              href="/therian"
              className="flex-1 py-3 rounded-xl text-center text-sm font-semibold bg-purple-700 hover:bg-purple-600 text-white transition-colors"
            >
              Mi Therian ↗
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
