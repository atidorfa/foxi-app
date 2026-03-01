import Link from 'next/link'

export default function NavPvpButton() {
  return (
    <Link
      href="/pvp"
      className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
    >
      ⚔️ PvP
    </Link>
  )
}
