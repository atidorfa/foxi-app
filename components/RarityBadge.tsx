'use client'

import type { Rarity } from '@/lib/generation/engine'

const CONFIG: Record<Rarity, { label: string; class: string; glow: string; dot: string }> = {
  COMMON:    { label: 'Común',       class: 'bg-gray-500/20 text-gray-300 border-gray-500/40',          glow: '',                                              dot: 'bg-gray-400' },
  UNCOMMON:  { label: 'Poco común',  class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', glow: 'shadow-[0_0_8px_rgba(52,211,153,0.25)]',        dot: 'bg-emerald-400' },
  RARE:      { label: 'Raro',        class: 'bg-blue-500/20 text-blue-300 border-blue-500/40',          glow: 'shadow-[0_0_10px_rgba(96,165,250,0.3)]',        dot: 'bg-blue-400' },
  EPIC:      { label: 'Épico',       class: 'bg-purple-500/20 text-purple-300 border-purple-500/40',    glow: 'shadow-[0_0_12px_rgba(192,132,252,0.4)]',       dot: 'bg-purple-400' },
  LEGENDARY: { label: 'Legendario',  class: 'bg-amber-500/20 text-amber-300 border-amber-500/40',       glow: 'shadow-[0_0_15px_rgba(252,211,77,0.5)]',        dot: 'bg-amber-400' },
  MYTHIC:    { label: 'Mítico',      class: 'bg-red-500/20 text-red-300 border-red-500/40',             glow: 'shadow-[0_0_18px_rgba(239,68,68,0.6)]',         dot: 'bg-red-400' },
}

const RARITY_ODDS: { rarity: Rarity; pct: string }[] = [
  { rarity: 'COMMON',    pct: '60%' },
  { rarity: 'UNCOMMON',  pct: '25%' },
  { rarity: 'RARE',      pct: '10%' },
  { rarity: 'EPIC',      pct: '4%' },
  { rarity: 'LEGENDARY', pct: '~1%' },
  { rarity: 'MYTHIC',    pct: '0.001%' },
]

interface Props {
  rarity: Rarity
  size?: 'sm' | 'md' | 'lg'
}

export default function RarityBadge({ rarity, size = 'md' }: Props) {
  const cfg = CONFIG[rarity]
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-1.5' : 'text-sm px-3 py-1'

  return (
    <span className="relative inline-flex group/rarity">
      <span
        className={`
          inline-flex items-center gap-1 rounded-full border font-semibold tracking-widest uppercase cursor-default
          ${sizeClass} ${cfg.class} ${cfg.glow}
        `}
      >
        {rarity === 'LEGENDARY' && <span className="animate-pulse">★</span>}
        {rarity === 'MYTHIC' && <span className="animate-pulse">✦</span>}
        {cfg.label}
      </span>

      {/* Tooltip */}
      <div className="
        pointer-events-none absolute top-0 left-full ml-2 z-50
        opacity-0 group-hover/rarity:opacity-100 transition-opacity duration-200
        w-48 rounded-xl border border-white/10 bg-[#0F0F1A]/95 backdrop-blur-sm shadow-xl p-3
      ">
        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 text-center">Probabilidades</p>
        <ul className="space-y-1.5">
          {RARITY_ODDS.map(({ rarity: r, pct }) => {
            const c = CONFIG[r]
            const isActive = r === rarity
            return (
              <li key={r} className={`flex items-center justify-between text-xs ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  <span className={isActive ? 'text-white font-semibold' : 'text-white/70'}>{c.label}</span>
                </span>
                <span className={isActive ? 'text-white font-semibold' : 'text-white/50'}>{pct}</span>
              </li>
            )
          })}
        </ul>
        {/* Arrow */}
        <div className="absolute top-3 right-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-white/10" />
      </div>
    </span>
  )
}
