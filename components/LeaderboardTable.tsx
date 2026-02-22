'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { TherianDTO } from '@/lib/therian-dto'
import TherianAvatar from './TherianAvatar'
import RarityBadge from './RarityBadge'

interface LeaderboardEntry {
  rank: number
  id: string
  name: string | null
  species: { id: string; name: string; emoji: string }
  rarity: string
  level: number
  bites: number
  appearance: {
    paletteColors: { primary: string; secondary: string; accent: string }
  }
  ownerId?: string
  ownerName?: string
}

interface Props {
  entries: LeaderboardEntry[]
  userRank: number | null
}

const RARITY_LABEL: Record<string, string> = {
  COMMON: 'Común', UNCOMMON: 'Poco común', RARE: 'Raro', EPIC: 'Épico', LEGENDARY: 'Legendario', MYTHIC: 'Mítico',
}
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-slate-400', UNCOMMON: 'text-emerald-400', RARE: 'text-blue-400', EPIC: 'text-purple-400', LEGENDARY: 'text-amber-400', MYTHIC: 'text-red-400',
}
const RARITY_GLOW: Record<string, string> = {
  COMMON:    'border-white/10',
  UNCOMMON:  'border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.1)]',
  RARE:      'border-blue-500/30 shadow-[0_0_30px_rgba(96,165,250,0.1)]',
  EPIC:      'border-purple-500/40 shadow-[0_0_40px_rgba(192,132,252,0.15)]',
  LEGENDARY: 'border-amber-500/50 shadow-[0_0_50px_rgba(252,211,77,0.2)]',
  MYTHIC:    'border-red-500/60 shadow-[0_0_60px_rgba(239,68,68,0.25)]',
}
const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
const STAT_CONFIG = [
  { key: 'vitality' as const, label: 'Vitalidad', icon: '🌿', bar: 'from-emerald-600 to-emerald-400' },
  { key: 'agility'  as const, label: 'Agilidad',  icon: '⚡', bar: 'from-amber-600 to-amber-400' },
  { key: 'instinct' as const, label: 'Instinto',  icon: '🌌', bar: 'from-blue-600 to-blue-400' },
  { key: 'charisma' as const, label: 'Carisma',   icon: '✨', bar: 'from-pink-600 to-pink-400' },
]

function ProfileModal({
  entry,
  onClose,
}: {
  entry: LeaderboardEntry
  onClose: () => void
}) {
  const [dto, setDto] = useState<TherianDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  React.useEffect(() => {
    if (!entry.name) { setLoading(false); setError(true); return }
    fetch(`/api/therians/search?name=${encodeURIComponent(entry.name)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setDto(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [entry.name])

  const glowClass = dto ? (RARITY_GLOW[dto.rarity] ?? RARITY_GLOW.COMMON) : 'border-white/10'
  const primaryColor = dto?.appearance.paletteColors.primary ?? entry.appearance.paletteColors.primary

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border bg-[#13131F] shadow-2xl ${glowClass}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Fondo decorativo */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none rounded-2xl"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${primaryColor}, transparent 70%)` }}
        />

        {/* Header bar */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {RANK_MEDAL[entry.rank] ? (
                <span className="text-xl">{RANK_MEDAL[entry.rank]}</span>
              ) : (
                <span className="text-[#4A4468] font-mono text-sm">#{entry.rank}</span>
              )}
              <span className="text-white font-bold truncate max-w-[180px]">{entry.name}</span>
            </div>
            {entry.ownerId && entry.ownerName && (
              <Link
                href={`/user/${entry.ownerId}`}
                onClick={onClose}
                className="text-purple-400/70 hover:text-purple-300 text-xs transition-colors pl-0.5"
              >
                @{entry.ownerName} →
              </Link>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 text-xl leading-none transition-colors ml-2 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="relative px-5 pb-6 space-y-5">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <p className="text-center text-[#8B84B0] italic py-8">No se pudo cargar el perfil.</p>
          )}

          {dto && !loading && (
            <>
              {/* Species + badges */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[#8B84B0] text-xs">{dto.species.emoji} {dto.species.name}</p>
                  <div className="flex items-center gap-2 text-xs text-[#8B84B0]">
                    <span>🔰 Nv {dto.level}</span>
                    <span>🦷 {dto.bites} mordidas</span>
                  </div>
                </div>
                <RarityBadge rarity={dto.rarity} size="sm" />
              </div>

              {/* Avatar */}
              <div className="flex justify-center">
                <TherianAvatar therian={dto} size={180} animated={false} />
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
                {STAT_CONFIG.map(cfg => {
                  const val = dto.stats[cfg.key]
                  return (
                    <div key={cfg.key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-[#8B84B0]">
                          <span>{cfg.icon}</span>{cfg.label}
                        </span>
                        <span className="font-mono font-bold text-white">{val}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${cfg.bar} rounded-full`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* XP */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#8B84B0]">
                  <span>XP</span>
                  <span className="font-mono">{dto.xp} / {dto.xpToNext}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-700 to-purple-400 rounded-full"
                    style={{ width: `${Math.min(100, (dto.xp / dto.xpToNext) * 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-center text-[#4A4468] text-xs">
                Adoptado el {new Date(dto.createdAt).toLocaleDateString('es-AR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LeaderboardTable({ entries, userRank }: Props) {
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null)

  if (entries.length === 0) {
    return (
      <div className="text-center text-[#8B84B0] italic py-8">
        Aún no hay batallas. ¡Sé el primero en morder!
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => entry.name && setSelected(entry)}
            className="w-full flex items-center gap-3 rounded-xl border border-white/5 bg-[#13131F] px-4 py-3 hover:bg-[#1A1A2E] hover:border-white/10 transition-colors text-left"
            style={{
              boxShadow: entry.rank <= 3 ? `0 0 16px ${entry.appearance.paletteColors.primary}22` : undefined,
            }}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {RANK_MEDAL[entry.rank] ?? (
                <span className="text-[#4A4468] font-mono text-sm">#{entry.rank}</span>
              )}
            </div>

            {/* Color accent bar */}
            <div
              className="w-1 h-10 rounded-full flex-shrink-0"
              style={{ background: entry.appearance.paletteColors.primary }}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold truncate">{entry.name}</span>
                <span className={`text-xs font-semibold ${RARITY_COLOR[entry.rarity] ?? 'text-slate-400'}`}>
                  {RARITY_LABEL[entry.rarity] ?? entry.rarity}
                </span>
              </div>
              <div className="text-[#8B84B0] text-xs flex items-center gap-1.5">
                <span>{entry.species.emoji} {entry.species.name} · Nv {entry.level}</span>
                {entry.ownerId && entry.ownerName && (
                  <>
                    <span className="text-white/15">·</span>
                    <Link
                      href={`/user/${entry.ownerId}`}
                      onClick={e => e.stopPropagation()}
                      className="text-purple-400/70 hover:text-purple-300 transition-colors"
                    >
                      @{entry.ownerName}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Bites */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-white font-bold font-mono text-lg">{entry.bites}</span>
              <span className="text-base">🦷</span>
            </div>
          </button>
        ))}

        {userRank !== null && userRank > entries.length && (
          <div className="text-center text-[#8B84B0] text-sm pt-2 italic">
            Tu posición global: <span className="text-white font-bold">#{userRank}</span>
          </div>
        )}
      </div>

      {selected && (
        <ProfileModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
