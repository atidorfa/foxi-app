import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import TherianAvatar from '@/components/TherianAvatar'
import RarityBadge from '@/components/RarityBadge'

export const dynamic = 'force-dynamic'

const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-slate-400', UNCOMMON: 'text-emerald-400', RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-amber-400', MYTHIC: 'text-red-400',
}
const RARITY_LABEL: Record<string, string> = {
  COMMON: 'Común', UNCOMMON: 'Poco común', RARE: 'Raro', EPIC: 'Épico', LEGENDARY: 'Legendario', MYTHIC: 'Mítico',
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      therians: {
        orderBy: { bites: 'desc' },
      },
    },
  })

  if (!user) notFound()

  const displayName = user.name ?? user.email.split('@')[0]
  const dtos = user.therians.map(toTherianDTO)
  const totalBites = dtos.reduce((s, t) => s + t.bites, 0)
  const primaryColor = dtos[0]?.appearance.paletteColors.primary ?? '#8E44AD'

  return (
    <div className="min-h-screen bg-[#08080F] relative">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-10"
          style={{ background: `radial-gradient(ellipse, ${primaryColor}, transparent)` }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#08080F]/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <Link href="/therian" className="text-xl font-bold gradient-text">therian.biz</Link>
        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-[#8B84B0] hover:text-white text-sm transition-colors">🏆 Top</Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Owner header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 text-2xl font-bold text-white/80">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
          <h1 className="text-2xl font-black text-white">@{displayName}</h1>
          <p className="text-[#8B84B0] text-sm">
            Dueño de {dtos.length} Therian{dtos.length !== 1 ? 's' : ''} · {totalBites} mordidas totales
          </p>
          <p className="text-[#4A4468] text-xs">
            En therian.biz desde {new Date(user.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Therians list */}
        <div className="space-y-3">
          <h2 className="text-[#8B84B0] text-xs uppercase tracking-widest">Therians</h2>
          {dtos.length === 0 ? (
            <p className="text-center text-[#4A4468] italic py-8">Este dueño aún no tiene Therians.</p>
          ) : (
            dtos.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#13131F] px-4 py-3"
              >
                <TherianAvatar therian={t} size={56} animated={false} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold truncate">{t.name ?? 'Sin nombre'}</span>
                    <span className={`text-xs font-semibold ${RARITY_COLOR[t.rarity] ?? 'text-slate-400'}`}>
                      {RARITY_LABEL[t.rarity] ?? t.rarity}
                    </span>
                  </div>
                  <div className="text-[#8B84B0] text-xs">
                    Nv {t.level} · {t.bites} 🦷
                  </div>
                </div>
                <RarityBadge rarity={t.rarity} size="sm" />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
