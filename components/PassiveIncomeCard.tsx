'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface PassiveMissionEntry {
  id: string
  rarity: string
  title: string
  description: string
  goldPer24h: number
  count: number
  effectiveGoldPer24h: number
  active: boolean
}

interface CollectionMissionEntry {
  id: string
  rarity: string
  title: string
  description: string
  required: number
  goldPer24h: number
  progress: number
  active: boolean
  permanent: boolean
}

interface TraitMissionEntry {
  id: string
  traitId: string
  title: string
  description: string
  required: number
  goldPer24h: number
  progress: number
  active: boolean
  permanent: boolean
}

interface PassiveData {
  totalGoldPer24h: number
  goldAccumulated: number
  lastClaimAt: string | null
  nextClaimAt: string | null
  canClaim: boolean
  missions: PassiveMissionEntry[]
  collectionMissions: CollectionMissionEntry[]
  traitMissions: TraitMissionEntry[]
  levelBonus: { level: number; goldPer24h: number }
}

const RARITY_TEXT: Record<string, string> = {
  COMMON:    'text-slate-400',
  UNCOMMON:  'text-emerald-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-amber-400',
  MYTHIC:    'text-red-400',
}
const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-slate-500/40',
  UNCOMMON:  'border-emerald-500/40',
  RARE:      'border-blue-500/40',
  EPIC:      'border-purple-500/40',
  LEGENDARY: 'border-amber-500/40',
  MYTHIC:    'border-red-500/40',
}
const RARITY_BG: Record<string, string> = {
  COMMON:    'bg-slate-500/10',
  UNCOMMON:  'bg-emerald-500/10',
  RARE:      'bg-blue-500/10',
  EPIC:      'bg-purple-500/10',
  LEGENDARY: 'bg-amber-500/10',
  MYTHIC:    'bg-red-500/10',
}
const RARITY_BAR: Record<string, string> = {
  COMMON:    'bg-slate-400',
  UNCOMMON:  'bg-emerald-400',
  RARE:      'bg-blue-400',
  EPIC:      'bg-purple-400',
  LEGENDARY: 'bg-amber-400',
  MYTHIC:    'bg-red-400',
}
const RARITY_LABEL: Record<string, string> = {
  COMMON:    'Común',
  UNCOMMON:  'Poco Común',
  RARE:      'Raro',
  EPIC:      'Épico',
  LEGENDARY: 'Legendario',
  MYTHIC:    'Mítico',
}
const RARITY_ICON: Record<string, string> = {
  COMMON:    '🐾',
  UNCOMMON:  '🌿',
  RARE:      '💧',
  EPIC:      '💜',
  LEGENDARY: '⚡',
  MYTHIC:    '🔥',
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '¡Listo!'
  const totalSecs = Math.ceil(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hrs}h ${remainMins}m`
  }
  return `${mins}m ${secs}s`
}

const TRAIT_ICON: Record<string, string> = {
  forestal:  '🌿',
  electrico: '⚡',
  acuatico:  '💧',
  volcanico: '🔥',
}

type Tab = 'activas' | 'rareza' | 'arquetipo'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'activas',   label: 'Activas',   icon: '✅' },
  { id: 'rareza',    label: 'Rareza',    icon: '🏆' },
  { id: 'arquetipo', label: 'Arquetipo', icon: '🔮' },
]

export default function PassiveIncomeCard() {
  const router = useRouter()
  const [open, setOpen]           = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('activas')
  const [data, setData]           = useState<PassiveData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [claiming, setClaiming]   = useState(false)
  const [claimResult, setClaimResult] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<string | null>(null)
  const [liveGold, setLiveGold]   = useState<number | null>(null)

  function formatGold(n: number): string {
    if (n >= 1000) return n.toFixed(0)
    if (n >= 0.01) return n.toFixed(4)
    return n.toFixed(6)
  }
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const goldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchedAtRef   = useRef<number>(0)
  const baseGoldRef    = useRef<number>(0)
  const rateRef        = useRef<number>(0)

  const MS_PER_DAY = 24 * 60 * 60 * 1000

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/passive', { cache: 'no-store' })
      if (res.ok) {
        const json: PassiveData = await res.json()
        setData(json)
        // Snapshot for live counter
        fetchedAtRef.current = Date.now()
        baseGoldRef.current  = json.goldAccumulated
        rateRef.current      = json.totalGoldPer24h
        setLiveGold(json.goldAccumulated)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Live gold counter — updates every second client-side
  useEffect(() => {
    if (goldIntervalRef.current) clearInterval(goldIntervalRef.current)
    goldIntervalRef.current = setInterval(() => {
      if (rateRef.current === 0 || fetchedAtRef.current === 0) return
      const msElapsed = Date.now() - fetchedAtRef.current
      const extra = (rateRef.current * msElapsed) / MS_PER_DAY
      setLiveGold(baseGoldRef.current + extra)
    }, 1000)
    return () => clearInterval(goldIntervalRef.current!)
  }, [])

  // Cooldown countdown
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!data?.nextClaimAt) { setCountdown(null); return }
    const update = () => {
      const msLeft = new Date(data.nextClaimAt!).getTime() - Date.now()
      if (msLeft <= 0) { setCountdown(null); clearInterval(intervalRef.current!); fetchData() }
      else setCountdown(formatCountdown(msLeft))
    }
    update()
    intervalRef.current = setInterval(update, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [data?.nextClaimAt, fetchData])

  const handleClaim = async () => {
    setClaiming(true)
    setClaimResult(null)
    try {
      const res = await fetch('/api/passive/claim', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        setClaimResult(json.goldClaimed)
        window.dispatchEvent(new CustomEvent('wallet-update'))
        await fetchData()
        router.refresh()
      }
    } finally {
      setClaiming(false)
    }
  }

  const totalPer24h = data?.totalGoldPer24h ?? 0
  const hasIncome   = totalPer24h > 0

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); fetchData() }}
        className="relative w-80 rounded-2xl border border-amber-500/20 bg-[#13131F]/80 px-5 py-3.5 flex items-center justify-between hover:border-amber-500/35 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🌾</span>
          <div className="space-y-0.5">
            <p className="text-amber-400/70 text-[10px] uppercase tracking-widest font-semibold">Ingresos Pasivos</p>
            {hasIncome ? (
              <>
                <p className="text-white/60 text-xs">
                  Generando: <span className="text-amber-300 font-semibold">+{totalPer24h} 🪙</span>
                  <span className="text-white/40">/24hs</span>
                </p>
                <p className="text-white/60 text-xs">
                  Oro acumulado: <span className="text-amber-300 font-semibold font-mono">{liveGold === null ? '···' : formatGold(liveGold)} 🪙</span>
                </p>
              </>
            ) : (
              <p className="text-white/40 text-xs">Sin ingresos activos</p>
            )}
          </div>
        </div>
        {hasIncome && liveGold !== null && liveGold > 0 && data?.canClaim && (
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex flex-col bg-[#13131F] border border-white/8 rounded-2xl w-[700px] max-w-[95vw] h-[520px] max-h-[90vh] shadow-[0_0_60px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌾</span>
                <div className="space-y-0.5">
                  <p className="text-amber-400/70 text-[10px] uppercase tracking-widest font-semibold">Misiones Pasivas</p>
                  {hasIncome ? (
                    <>
                      <p className="text-white font-semibold text-sm">
                        <span className="text-amber-300">+{totalPer24h} 🪙</span>
                        <span className="text-white/40 text-xs font-normal">/24hs en total</span>
                      </p>
                      <p className="text-white/50 text-xs">
                        Oro acumulado: <span className="text-amber-300 font-semibold font-mono">{liveGold === null ? '···' : formatGold(liveGold)} 🪙</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-white/40 text-sm">Sin misiones activas</p>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/25 hover:text-white/60 text-lg leading-none transition-colors">✕</button>
            </div>

            {/* Body: tabs + content */}
            <div className="flex flex-1 min-h-0">
              {/* Left tabs */}
              <div className="w-40 flex-shrink-0 border-r border-white/6 flex flex-col py-2">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-2.5 transition-colors ${
                        isActive ? 'bg-amber-500/8 border-r-2 border-amber-500' : 'hover:bg-white/4'
                      }`}
                    >
                      <span className="text-base leading-none">{tab.icon}</span>
                      <p className={`text-xs font-semibold ${isActive ? 'text-amber-400' : 'text-white/50'}`}>
                        {tab.label}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Right content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading && <p className="text-white/25 text-sm text-center mt-10">Cargando...</p>}

                {/* Tab: Activas — level bonus row */}
                {!loading && activeTab === 'activas' && data?.levelBonus && (
                  <div className="rounded-xl border px-4 py-3 flex items-center gap-4 border-yellow-500/40 bg-yellow-500/10">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xl border border-yellow-500/40 bg-yellow-500/10">
                      ⭐
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-white/90">Bonificación de Nivel</p>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-yellow-400">Nivel {data.levelBonus.level}</span>
                      </div>
                      <p className="text-[10px] text-white/35 font-mono">
                        Nivel {data.levelBonus.level} × +100 🪙
                      </p>
                    </div>
                    <div className="flex-shrink-0 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
                      +{data.levelBonus.goldPer24h} 🪙
                    </div>
                  </div>
                )}

                {/* Tab: Activas — rarity missions */}
                {!loading && activeTab === 'activas' && data?.missions.map((m) => {
                  const tc = RARITY_TEXT[m.rarity] ?? 'text-white/60'
                  const bc = m.active ? (RARITY_BORDER[m.rarity] ?? 'border-white/10') : 'border-white/5'
                  const bg = m.active ? (RARITY_BG[m.rarity] ?? 'bg-white/3') : 'bg-white/2'
                  return (
                    <div key={m.id} className={`rounded-xl border px-4 py-3 flex items-center gap-4 ${bc} ${bg} ${!m.active ? 'opacity-40' : ''}`}>
                      <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xl border ${bc} ${bg}`}>
                        {m.active ? (RARITY_ICON[m.rarity] ?? '🐾') : '🔒'}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm ${m.active ? 'text-white/90' : 'text-white/35'}`}>{m.title}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${tc}`}>{RARITY_LABEL[m.rarity]}</span>
                        </div>
                        {m.active && m.count > 1 && (
                          <p className="text-[10px] text-white/35 font-mono">
                            {m.count} therians × +{m.goldPer24h} 🪙
                          </p>
                        )}
                        {!m.active && (
                          <p className="text-[11px] text-white/20">Obtén este Therian para desbloquear</p>
                        )}
                      </div>
                      {m.active ? (
                        <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${bc} ${bg} ${tc}`}>
                          +{m.effectiveGoldPer24h} 🪙
                        </div>
                      ) : null}
                    </div>
                  )
                })}

                {/* Tab: Arquetipo */}
                {!loading && activeTab === 'arquetipo' && data?.traitMissions.map((m) => {
                  const icon = TRAIT_ICON[m.traitId] ?? '🔮'
                  const bc   = m.active ? 'border-violet-500/40' : 'border-white/5'
                  const bg   = m.active ? 'bg-violet-500/10'     : 'bg-white/2'
                  const tc   = m.active ? 'text-violet-300'      : 'text-white/30'
                  const pct  = Math.min(100, Math.round((m.progress / m.required) * 100))
                  return (
                    <div key={m.id} className={`rounded-xl border px-4 py-3 flex items-center gap-4 ${bc} ${bg}`}>
                      <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xl border ${bc} ${bg}`}>
                        {m.active ? icon : '🔒'}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm ${m.active ? 'text-white/90' : 'text-white/70'}`}>{m.title}</p>
                          {m.permanent && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1 py-0.5">
                              permanente
                            </span>
                          )}
                        </div>
                        {!m.active && (
                          <div className="space-y-0.5">
                            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500 bg-violet-400 opacity-70" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-white/30 font-mono">{m.progress}/{m.required}</p>
                          </div>
                        )}
                        <p className={`text-[11px] font-mono font-semibold ${tc}`}>
                          {m.active ? `+${m.goldPer24h} 🪙` : `+${m.goldPer24h} 🪙 al completar`}
                        </p>
                      </div>
                      {m.active && (
                        <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${bc} ${bg} ${tc}`}>
                          +{m.goldPer24h} 🪙
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Tab: Rareza */}
                {!loading && activeTab === 'rareza' && data?.collectionMissions.map((m) => {
                  const tc  = RARITY_TEXT[m.rarity] ?? 'text-white/60'
                  const bc  = m.active ? (RARITY_BORDER[m.rarity] ?? 'border-white/10') : 'border-white/5'
                  const bg  = m.active ? (RARITY_BG[m.rarity] ?? 'bg-white/3') : 'bg-white/2'
                  const bar = RARITY_BAR[m.rarity] ?? 'bg-white/40'
                  const pct = Math.min(100, Math.round((m.progress / m.required) * 100))
                  return (
                    <div key={m.id} className={`rounded-xl border px-4 py-3 flex items-center gap-4 ${bc} ${bg}`}>
                      <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xl border ${bc} ${bg}`}>
                        {m.active ? (RARITY_ICON[m.rarity] ?? '🐾') : '🔒'}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm ${m.active ? 'text-white/90' : 'text-white/70'}`}>{m.title}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${tc}`}>{RARITY_LABEL[m.rarity]}</span>
                          {m.permanent && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1 py-0.5">
                              permanente
                            </span>
                          )}
                        </div>
                        {!m.active && (
                          <div className="space-y-0.5">
                            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${bar} opacity-70`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-white/30 font-mono">{m.progress}/{m.required}</p>
                          </div>
                        )}
                        <p className={`text-[11px] font-mono font-semibold ${m.active ? tc : 'text-white/30'}`}>
                          {m.active ? `+${m.goldPer24h} 🪙` : `+${m.goldPer24h} 🪙 al completar`}
                        </p>
                      </div>
                      {m.active && (
                        <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${bc} ${bg} ${tc}`}>
                          +{m.goldPer24h} 🪙
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Claim section */}
            <div className="border-t border-white/6 px-6 py-4 flex-shrink-0 space-y-3">
              {data?.canClaim ? (
                <button
                  onClick={handleClaim}
                  disabled={claiming || liveGold === null || liveGold < 1}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors"
                >
                  {claiming ? '···' : liveGold === null ? '···' : liveGold < 1 ? 'Sin oro acumulado' : `Reclamar ${Math.floor(liveGold)} 🪙`}
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl border border-white/8 bg-white/3 text-center">
                  <p className="text-white/40 text-xs">Próximo reclamo en</p>
                  <p className="text-white/70 font-mono text-sm font-semibold">{countdown ?? '—'}</p>
                </div>
              )}

              {claimResult !== null && claimResult > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-2.5 text-center">
                  <p className="text-amber-300 font-bold text-sm">¡Recibiste {claimResult} 🪙!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
