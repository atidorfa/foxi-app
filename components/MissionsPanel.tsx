'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface MissionEntry {
  id: string
  title: string
  description: string
  rewardLabel: string
  type: 'daily' | 'weekly' | 'streak'
  progress: number
  goal: number
  completable: boolean
  claimed: boolean
}

const TABS = [
  { id: 'daily',  label: 'Diarias',   icon: '📅' },
  { id: 'weekly', label: 'Semanales', icon: '📆' },
  { id: 'streak', label: 'Racha',     icon: '🔥' },
] as const

export default function MissionsPanel() {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'streak'>('daily')
  const [missions, setMissions] = useState<MissionEntry[]>([])
  const [loginStreak, setLoginStreak] = useState(0)
  const [loading, setLoading]   = useState(false)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [congrats, setCongrats] = useState<{ title: string; rewardLabel: string } | null>(null)

  const fetchMissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/missions')
      if (res.ok) {
        const data = await res.json()
        setMissions(data.missions)
        setLoginStreak(data.loginStreak)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMissions() }, [fetchMissions])

  const handleClaim = async (m: MissionEntry) => {
    setClaiming(m.id)
    try {
      const res = await fetch('/api/missions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: m.id }),
      })
      if (res.ok) {
        setCongrats({ title: m.title, rewardLabel: m.rewardLabel })
        await fetchMissions()
        router.refresh()
      }
    } finally {
      setClaiming(null)
    }
  }

  const completableCount = missions.filter((m) => m.completable).length
  const filtered = missions.filter((m) => m.type === activeTab)

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); fetchMissions() }}
        className="relative w-80 rounded-2xl border border-purple-500/20 bg-[#13131F]/80 px-5 py-3.5 flex items-center justify-between hover:border-purple-500/35 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div>
            <p className="text-purple-400/70 text-[10px] uppercase tracking-widest font-semibold">Misiones</p>
            <p className="text-white text-sm font-semibold">
              {missions.filter(m => m.claimed).length} / {missions.length} completadas
            </p>
          </div>
        </div>
        {completableCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {completableCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex flex-col bg-[#13131F] border border-white/8 rounded-2xl w-[700px] max-w-[95vw] h-[500px] max-h-[90vh] shadow-[0_0_60px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-purple-400/80 text-[10px] uppercase tracking-widest font-semibold">Misiones</h2>
                  <p className="text-white font-semibold text-sm flex items-center gap-2">
                    Racha actual:
                    <span className="text-orange-400 font-bold">🔥 {loginStreak} día{loginStreak !== 1 ? 's' : ''}</span>
                  </p>
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
              {/* Left tabs */}
              <div className="w-40 flex-shrink-0 border-r border-white/6 flex flex-col py-2">
                {TABS.map((tab) => {
                  const tabMissions = missions.filter((m) => m.type === tab.id)
                  const pending     = tabMissions.filter((m) => m.completable).length
                  const isActive    = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative w-full text-left px-4 py-3 flex items-center gap-2.5 transition-colors ${
                        isActive ? 'bg-purple-500/8 border-r-2 border-purple-500' : 'hover:bg-white/4'
                      }`}
                    >
                      <span className="text-base leading-none">{tab.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${isActive ? 'text-purple-400' : 'text-white/50'}`}>
                          {tab.label}
                        </p>
                        <p className="text-[10px] text-white/25">
                          {tabMissions.filter((m) => m.claimed).length}/{tabMissions.length}
                        </p>
                      </div>
                      {pending > 0 && (
                        <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                          {pending}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Right content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading && (
                  <p className="text-white/25 text-sm text-center mt-10">Cargando...</p>
                )}
                {!loading && filtered.length === 0 && (
                  <p className="text-white/25 text-sm text-center mt-10">No hay misiones en esta categoría</p>
                )}
                {!loading && filtered.map((m) => {
                  const pct = Math.round((m.progress / m.goal) * 100)
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border px-4 py-3 flex items-center gap-4 transition-colors ${
                        m.claimed
                          ? 'border-white/5 bg-white/2 opacity-40'
                          : m.completable
                          ? 'border-purple-500/30 bg-purple-500/5'
                          : 'border-white/5 bg-white/2'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xl border ${
                        m.claimed     ? 'border-white/8 bg-white/3' :
                        m.completable ? 'border-purple-500/30 bg-purple-500/8' :
                                        'border-white/8 bg-white/3'
                      }`}>
                        {m.claimed ? '✅' : m.completable ? '🎯' : m.type === 'streak' ? '🔥' : '⏳'}
                      </div>

                      {/* Info + progress */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div>
                          <p className={`font-semibold text-sm ${
                            m.claimed ? 'text-white/35' : m.completable ? 'text-purple-300' : 'text-white/70'
                          }`}>
                            {m.title}
                          </p>
                          <p className="text-[11px] text-white/40">{m.description}</p>
                        </div>

                        {/* Progress bar */}
                        {!m.claimed && (
                          <div className="space-y-0.5">
                            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  m.completable ? 'bg-purple-500' : 'bg-purple-500/40'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-white/30 font-mono">
                              {m.progress}/{m.goal}
                            </p>
                          </div>
                        )}

                        <p className={`text-[11px] font-mono ${m.claimed ? 'text-white/20' : 'text-purple-400/70'}`}>
                          {m.rewardLabel}
                        </p>
                      </div>

                      {m.completable && (
                        <button
                          onClick={() => handleClaim(m)}
                          disabled={claiming === m.id}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claiming === m.id ? '···' : 'Reclamar'}
                        </button>
                      )}
                      {m.claimed && (
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
            className="relative bg-[#13131F] border border-purple-500/40 rounded-2xl p-8 w-full max-w-xs text-center shadow-[0_0_60px_rgba(168,85,247,0.2)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl">🎯</div>
            <div>
              <p className="text-purple-400 text-[10px] uppercase tracking-widest font-semibold mb-1">Misión completada</p>
              <h2 className="text-white font-bold text-xl">{congrats.title}</h2>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/8 px-4 py-3">
              <p className="text-purple-300 font-semibold text-sm">{congrats.rewardLabel}</p>
            </div>
            <button
              onClick={() => setCongrats(null)}
              className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm transition-colors"
            >
              ¡Genial!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
