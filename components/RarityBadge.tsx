'use client'

import type { Rarity } from '@/lib/generation/engine'

const CONFIG: Record<Rarity, { label: string; class: string; glow: string }> = {
  COMMON:    { label: 'Común',       class: 'bg-gray-500/20 text-gray-300 border-gray-500/40',       glow: '' },
  UNCOMMON:  { label: 'Poco común',  class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', glow: 'shadow-[0_0_8px_rgba(52,211,153,0.25)]' },
  RARE:      { label: 'Raro',        class: 'bg-blue-500/20 text-blue-300 border-blue-500/40',       glow: 'shadow-[0_0_10px_rgba(96,165,250,0.3)]' },
  EPIC:      { label: 'Épico',       class: 'bg-purple-500/20 text-purple-300 border-purple-500/40', glow: 'shadow-[0_0_12px_rgba(192,132,252,0.4)]' },
  LEGENDARY: { label: 'Legendario',  class: 'bg-amber-500/20 text-amber-300 border-amber-500/40',    glow: 'shadow-[0_0_15px_rgba(252,211,77,0.5)]' },
  MYTHIC:    { label: 'Mítico',      class: 'bg-red-500/20 text-red-300 border-red-500/40',          glow: 'shadow-[0_0_18px_rgba(239,68,68,0.6)]' },
}

interface Props {
  rarity: Rarity
  size?: 'sm' | 'md' | 'lg'
}

export default function RarityBadge({ rarity, size = 'md' }: Props) {
  const cfg = CONFIG[rarity]
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-1.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-semibold tracking-widest uppercase
        ${sizeClass} ${cfg.class} ${cfg.glow}
      `}
    >
      {rarity === 'LEGENDARY' && <span className="animate-pulse">★</span>}
      {rarity === 'MYTHIC' && <span className="animate-pulse">✦</span>}
      {cfg.label}
    </span>
  )
}
