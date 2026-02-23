import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import TherianTabs from '@/components/TherianTabs'
import SignOutButton from '@/components/SignOutButton'
import CurrencyDisplay from '@/components/CurrencyDisplay'
import NavShopButton from '@/components/NavShopButton'
import NavFusionButton from '@/components/NavFusionButton'
import NavInventoryButton from '@/components/NavInventoryButton'

export const dynamic = 'force-dynamic'

export default async function TherianPage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const [therians, user] = await Promise.all([
    db.therian.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { therianSlots: true },
    }),
  ])

  if (therians.length === 0) {
    redirect('/adopt')
  }

  const dtos = therians.map(toTherianDTO)

  const ranks: Record<string, number> = {}
  await Promise.all(
    therians.map(async (t) => {
      const aboveCount = await db.therian.count({
        where: {
          OR: [
            { bites: { gt: t.bites } },
            { bites: t.bites, level: { gt: t.level } },
          ],
        },
      })
      ranks[t.id] = aboveCount + 1
    })
  )

  const primaryTherian = dtos[0]

  return (
    <div className="min-h-screen bg-[#08080F] relative">
      {/* Fondo */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[150px] opacity-10"
          style={{ background: `radial-gradient(ellipse, ${primaryTherian.appearance.paletteColors.primary}, transparent)` }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#08080F]/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold gradient-text">therian.biz</span>
        <div className="flex items-center gap-4">
          <NavFusionButton />
          <NavInventoryButton />
          <CurrencyDisplay />
          <NavShopButton therian={primaryTherian} />
          <Link href="/leaderboard" className="text-[#8B84B0] hover:text-white text-sm transition-colors">🏆 Top</Link>
          <SignOutButton/>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-md mx-auto px-4 py-8">
        <TherianTabs
          therians={dtos}
          ranks={ranks}
          slots={user?.therianSlots ?? 1}
        />
      </main>
    </div>
  )
}
