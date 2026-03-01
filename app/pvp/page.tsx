import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import SignOutButton from '@/components/SignOutButton'
import CurrencyDisplay from '@/components/CurrencyDisplay'
import PvpRoom from '@/components/pvp/PvpRoom'

export const dynamic = 'force-dynamic'

export default async function PvpPage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const userId = session.user.id

  const [therians, activeBattle] = await Promise.all([
    db.therian.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'asc' },
    }),
    db.pvpBattle.findFirst({
      where: { attackerId: userId, status: 'active' },
      select: { id: true },
    }),
  ])

  if (therians.length === 0) {
    redirect('/adopt')
  }

  const dtos = therians.map(toTherianDTO)

  return (
    <div className="min-h-screen bg-[#08080F] relative">
      {/* Fondo */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[150px] opacity-8"
          style={{ background: 'radial-gradient(ellipse, #C0392B, transparent)' }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#08080F]/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold gradient-text">therian.biz</span>
        <div className="flex items-center gap-4">
          <Link href="/therian" className="text-[#8B84B0] hover:text-white text-sm transition-colors">
            ← Volver
          </Link>
          <CurrencyDisplay />
          <SignOutButton />
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-lg mx-auto px-4 py-8">
        <PvpRoom therians={dtos} activeBattleId={activeBattle?.id ?? null} />
      </main>
    </div>
  )
}
