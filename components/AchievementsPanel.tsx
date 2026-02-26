'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface AchievementEntry {
  id: string
  title: string
  description: string
  rewardLabel: string
  category: string
  unlocked: boolean
  claimed: boolean
  progress: { current: number; max: number } | null
}

interface Props {
  achievements: AchievementEntry[]
}

const CATEGORIES = [
  { id: 'aventura', label: 'Aventura', icon: '⭐' },
  { id: 'combate',  label: 'Combate',  icon: '⚔️' },
  { id: 'temple',   label: 'Temple',   icon: '🌿' },
]

export default function AchievementsPanel({ achievements }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [congrats, setCongrats] = useState<{ title: string; rewardLabel: string } | null>(null)

  const claimedCount      = achievements.filter(a => a.claimed).length
  const unlockedUnclaimed = achievements.filter(a => a.unlocked && !a.claimed).length

  const handleClaim = async (ach: AchievementEntry) => {
    setClaiming(ach.id)
    try {
      const res = await fetch('/api/achievements/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementId: ach.id }),
      })
      if (res.ok) {
        setCongrats({ title: ach.title, rewardLabel: ach.rewardLabel })
        router.refresh()
      }
    } finally {
      setClaiming(null)
    }
  }

  const filtered = achievements.filter(a => a.category === activeCategory)

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="relative w-80 rounded-2xl border border-amber-500/20 bg-[#13131F]/80 px-5 py-3.5 flex items-center justify-between hover:border-amber-500/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🏆</span>
          <div>
            <p className="text-amber-400/70 text-[10px] uppercase tracking-widest font-semibold">Logros</p>
            <p className="text-white text-sm font-semibold">{claimedCount} / {achievements.length} completados</p>
          </div>
        </div>
        {unlockedUnclaimed > 0 && (
          <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {unlockedUnclaimed}
          </span>
        )}
      </button>

      {/* WoW-style modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex flex-col bg-[#13131F] border border-white/8 rounded-2xl w-[700px] max-w-[95vw] h-[500px] max-h-[90vh] shadow-[0_0_60px_rgba(0,0,0,0.6)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <h2 className="text-amber-400/80 text-[10px] uppercase tracking-widest font-semibold">Logros</h2>
                  <p className="text-white font-semibold text-sm">{claimedCount} / {achievements.length} completados</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/25 hover:text-white/60 text-lg leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">
              {/* Left category tabs */}
              <div className="w-40 flex-shrink-0 border-r border-white/6 flex flex-col py-2">
                {CATEGORIES.map(cat => {
                  const catAchs   = achievements.filter(a => a.category === cat.id)
                  const catClaimed = catAchs.filter(a => a.claimed).length
                  const catPending = catAchs.filter(a => a.unlocked && !a.claimed).length
                  const isActive   = activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`relative w-full text-left px-4 py-3 flex items-center gap-2.5 transition-colors ${
                        isActive
                          ? 'bg-amber-500/8 border-r-2 border-amber-500'
                          : 'hover:bg-white/4'
                      }`}
                    >
                      <span className="text-base leading-none">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${isActive ? 'text-amber-400' : 'text-white/50'}`}>
                          {cat.label}
                        </p>
                        <p className="text-[10px] text-white/25">{catClaimed}/{catAchs.length}</p>
                      </div>
                      {catPending > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                          {catPending}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Right achievement list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filtered.length === 0 && (
                  <p className="text-white/25 text-sm text-center mt-10">No hay logros en esta categoría</p>
                )}
                {filtered.map(ach => {
                  const canClaim = ach.unlocked && !ach.claimed
                  return (
                    <div
                      key={ach.id}
                      className={`rounded-xl border px-4 py-3 flex items-center gap-4 transition-colors ${
                        ach.claimed
                          ? 'border-white/5 bg-white/2 opacity-40'
                          : ach.unlocked
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-white/5 bg-white/2'
                      }`}
                    >
                      {/* Icon box */}
                      <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xl border ${
                        ach.claimed  ? 'border-white/8 bg-white/3' :
                        ach.unlocked ? 'border-amber-500/30 bg-amber-500/8' :
                                       'border-white/8 bg-white/3'
                      }`}>
                        {ach.claimed ? '✅' : ach.unlocked ? '🔓' : '🔒'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${
                          ach.claimed ? 'text-white/35' : ach.unlocked ? 'text-amber-300' : 'text-white/35'
                        }`}>
                          {ach.title}
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5">{ach.description}</p>
                        <p className={`text-[11px] mt-0.5 font-mono ${ach.claimed ? 'text-white/20' : 'text-amber-400/70'}`}>
                          {ach.rewardLabel}
                        </p>
                        {ach.progress && (
                          <div className="mt-0.5 space-y-0.5">
                            <div className="w-full h-[3px] rounded-full bg-white/8 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${ach.claimed ? 'bg-white/20' : 'bg-amber-400'}`}
                                style={{ width: `${Math.min(100, Math.round((ach.progress.current / ach.progress.max) * 100))}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono ${ach.claimed ? 'text-white/20' : 'text-white/35'}`}>
                              {ach.progress.current.toLocaleString('es-AR')} / {ach.progress.max.toLocaleString('es-AR')}
                            </span>
                          </div>
                        )}
                      </div>

                      {canClaim && (
                        <button
                          onClick={() => handleClaim(ach)}
                          disabled={claiming === ach.id}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claiming === ach.id ? '···' : 'Reclamar'}
                        </button>
                      )}
                      {ach.claimed && (
                        <span className="flex-shrink-0 text-[10px] text-white/25 font-mono">Reclamado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Congrats modal */}
      {congrats && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setCongrats(null)}
        >
          <div
            className="relative bg-[#13131F] border border-amber-500/40 rounded-2xl p-8 w-full max-w-xs text-center shadow-[0_0_60px_rgba(245,158,11,0.2)] space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-5xl">🏆</div>
            <div>
              <p className="text-amber-400 text-[10px] uppercase tracking-widest font-semibold mb-1">Logro desbloqueado</p>
              <h2 className="text-white font-bold text-xl">{congrats.title}</h2>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
              <p className="text-amber-300 font-semibold text-sm">{congrats.rewardLabel}</p>
            </div>
            <button
              onClick={() => setCongrats(null)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
            >
              ¡Genial!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
