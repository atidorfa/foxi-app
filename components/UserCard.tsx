interface Props {
  name: string | null
  email: string
  level: number
  xp: number
  therianCount: number
  compact?: boolean
}

function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export default function UserCard({ name, email, level, xp, therianCount, compact }: Props) {
  const xpToNext = xpToNextLevel(level)
  const xpPct = Math.min(100, Math.round((xp / xpToNext) * 100))
  const displayName = name ?? email.split('@')[0]

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-700 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-[0_0_10px_rgba(155,89,182,0.4)]">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold text-xs truncate max-w-[72px]">{displayName}</span>
            <span className="flex-shrink-0 text-[9px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 rounded-full px-1.5 py-0.5">
              Nv {level}
            </span>
          </div>
          <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#13131F]/80 px-8 py-6 flex items-center gap-6 w-80">
      {/* Avatar placeholder */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-700 to-purple-500 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 shadow-[0_0_24px_rgba(155,89,182,0.5)]">
        {displayName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Name + level */}
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-base truncate">{displayName}</span>
          <span className="flex-shrink-0 text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 rounded-full px-2.5 py-1">
            Nv {level}
          </span>
        </div>

        {/* XP bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/60 uppercase tracking-widest">XP</span>
            <span className="text-[10px] text-white/60 font-mono">{xp} / {xpToNext}</span>
          </div>
          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
