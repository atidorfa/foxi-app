import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import TherianCard from '@/components/TherianCard'
import SignOutButton from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function TherianPage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const therian = await db.therian.findUnique({
    where: { userId: session.user.id },
  })

  if (!therian) {
    redirect('/adopt')
  }

  const dto = toTherianDTO(therian)

  const aboveCount = await db.therian.count({
    where: {
      OR: [
        { bites: { gt: therian.bites } },
        { bites: therian.bites, level: { gt: therian.level } },
      ],
    },
  })
  const userRank = aboveCount + 1

  return (
    <div className="min-h-screen bg-[#08080F] relative">
      {/* Fondo */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[150px] opacity-10"
          style={{ background: `radial-gradient(ellipse, ${dto.appearance.paletteColors.primary}, transparent)` }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#08080F]/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold gradient-text">FOXI</span>
        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-[#8B84B0] hover:text-white text-sm transition-colors">🏆 Top</Link>
          <SignOutButton/>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-md mx-auto px-4 py-8">
        <TherianCard therian={dto} rank={userRank}/>
      </main>
    </div>
  )
}
