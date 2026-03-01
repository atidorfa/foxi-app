'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { TherianDTO } from '@/lib/therian-dto'
import PvpRoom from './PvpRoom'
import type { BattleRewards } from './BattleField'

interface MonthlyReward {
  gold: number
  essence: number
  eggs: string[]
  accessories: string[]
  runes: string[]
}

interface PvpStatus {
  mmr: number
  rank: string
  peakMmr: number
  peakRank: string
  weeklyPvpWins: number
  weeklyRequired: number
  chestAvailable: boolean
  alreadyClaimedChest: boolean
  currentMonth: string
  monthlyReward: MonthlyReward | null
  alreadyClaimedMonthly: boolean
}

interface Props {
  therians: TherianDTO[]
  activeBattleId: string | null
  onClose: () => void
}

const RANK_ORDER = ['HIERRO', 'BRONCE', 'PLATA', 'ORO', 'PLATINO', 'MITICO']
const RANK_COLORS: Record<string, string> = {
  HIERRO:  'text-slate-400',
  BRONCE:  'text-amber-600',
  PLATA:   'text-slate-300',
  ORO:     'text-yellow-400',
  PLATINO: 'text-cyan-300',
  MITICO:  'text-purple-400',
}
const RANK_BORDERS: Record<string, string> = {
  HIERRO:  'border-slate-500/40',
  BRONCE:  'border-amber-600/40',
  PLATA:   'border-slate-400/40',
  ORO:     'border-yellow-400/40',
  PLATINO: 'border-cyan-400/40',
  MITICO:  'border-purple-500/40',
}
const RANK_THRESHOLDS: Record<string, [number, number]> = {
  HIERRO:  [0, 1000],
  BRONCE:  [1000, 1400],
  PLATA:   [1400, 1800],
  ORO:     [1800, 2200],
  PLATINO: [2200, 2600],
  MITICO:  [2600, 3000],
}

function rankProgress(mmr: number, rank: string): number {
  const [lo, hi] = RANK_THRESHOLDS[rank] ?? [0, 1000]
  if (rank === 'MITICO') return 100
  return Math.min(100, Math.max(0, Math.round(((mmr - lo) / (hi - lo)) * 100)))
}

export default function PvpModal({ therians, activeBattleId, onClose }: Props) {
  const [tab, setTab] = useState<'fight' | 'rewards'>('fight')
  const [status, setStatus] = useState<PvpStatus | null>(null)
  const [claimingWeekly, setClaimingWeekly] = useState(false)
  const [claimingMonthly, setClaimingMonthly] = useState(false)
  const [claimMsg, setClaimMsg] = useState<string | null>(null)

  const fetchStatus = useCallback(() => {
    fetch('/api/pvp/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setStatus(data) })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  function handleBattleComplete(_won: boolean, _rewards?: BattleRewards) {
    fetchStatus()
  }

  async function claimWeekly() {
    setClaimingWeekly(true)
    setClaimMsg(null)
    try {
      const res = await fetch('/api/pvp/rewards/weekly', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setClaimMsg(`¡Cofre reclamado! +${data.gold} oro, 1 huevo, 2 runas.`)
        fetchStatus()
      } else {
        setClaimMsg(data.error ?? 'Error al reclamar.')
      }
    } finally {
      setClaimingWeekly(false)
    }
  }

  async function claimMonthly() {
    setClaimingMonthly(true)
    setClaimMsg(null)
    try {
      const res = await fetch('/api/pvp/rewards/monthly', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setClaimMsg(`¡Recompensa mensual reclamada! +${data.gold} oro.`)
        fetchStatus()
      } else {
        setClaimMsg(data.error ?? 'Error al reclamar.')
      }
    } finally {
      setClaimingMonthly(false)
    }
  }

  const progress = status ? rankProgress(status.mmr, status.rank) : 0

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-[#0F0F1A] border border-white/10 overflow-hidden shadow-2xl">

        {/* Header MMR */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-white/3 shrink-0">
          <div className="flex items-center gap-3">
            {status ? (
              <>
                <div className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${RANK_COLORS[status.rank]} ${RANK_BORDERS[status.rank]} bg-white/5`}>
                  {status.rank}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{status.mmr} MMR</span>
                    {status.rank !== 'MITICO' && (
                      <span className="text-white/30 text-xs">
                        →&nbsp;{RANK_ORDER[RANK_ORDER.indexOf(status.rank) + 1]}
                      </span>
                    )}
                  </div>
                  <div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-32 h-6 rounded bg-white/5 animate-pulse" />
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0">
          <button
            onClick={() => setTab('fight')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'fight' ? 'text-white border-b-2 border-purple-500' : 'text-white/40 hover:text-white/60'}`}
          >
            ⚔️ Combatir
          </button>
          <button
            onClick={() => setTab('rewards')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'rewards' ? 'text-white border-b-2 border-purple-500' : 'text-white/40 hover:text-white/60'}`}
          >
            🎁 Recompensas
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'fight' && (
            <PvpRoom
              therians={therians}
              activeBattleId={activeBattleId}
              onBattleComplete={handleBattleComplete}
            />
          )}

          {tab === 'rewards' && (
            <div className="p-5 space-y-5">
              {claimMsg && (
                <div className="text-center text-sm py-2 px-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  {claimMsg}
                </div>
              )}

              {/* Cofre Semanal */}
              <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Cofre Semanal</p>
                  {status?.alreadyClaimedChest && (
                    <span className="text-xs text-white/30 border border-white/10 rounded px-2 py-0.5">Reclamado</span>
                  )}
                </div>

                {status ? (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-white/50">
                        <span>Victorias PvP</span>
                        <span>{status.weeklyPvpWins} / {status.weeklyRequired}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${Math.min(100, (status.weeklyPvpWins / status.weeklyRequired) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-white/40 space-y-0.5">
                      <p>🪙 800 oro</p>
                      <p>🥚 1× Huevo Poco Común</p>
                      <p>💎 2× Runa T1 aleatoria</p>
                    </div>

                    <button
                      onClick={claimWeekly}
                      disabled={!status.chestAvailable || claimingWeekly}
                      className="w-full py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {claimingWeekly ? 'Reclamando...' : status.alreadyClaimedChest ? 'Ya reclamado esta semana' : status.chestAvailable ? '¡Reclamar cofre!' : `Faltan ${status.weeklyRequired - status.weeklyPvpWins} victorias`}
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-white/5 animate-pulse" />
                    <div className="h-8 rounded bg-white/5 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Recompensa Mensual */}
              <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Recompensa Mensual</p>
                  {status?.alreadyClaimedMonthly && (
                    <span className="text-xs text-white/30 border border-white/10 rounded px-2 py-0.5">Reclamado</span>
                  )}
                </div>

                {status ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span>Pico del mes:</span>
                      <span className={`font-bold ${RANK_COLORS[status.peakRank]}`}>{status.peakRank}</span>
                      <span>({status.peakMmr} MMR)</span>
                    </div>

                    {status.monthlyReward ? (
                      <div className="text-xs text-white/40 space-y-0.5">
                        <p>🪙 {status.monthlyReward.gold.toLocaleString()} oro</p>
                        {status.monthlyReward.essence > 0 && <p>✨ {status.monthlyReward.essence}× Esencia</p>}
                        {status.monthlyReward.eggs.map((e, i) => <p key={i}>🥚 1× {e}</p>)}
                        {status.monthlyReward.accessories.map((a, i) => <p key={i}>🎭 1× {a}</p>)}
                        {status.monthlyReward.runes.map((r, i) => <p key={i}>💎 1× {r}</p>)}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30">Alcanza BRONCE o superior para recibir recompensa mensual.</p>
                    )}

                    <button
                      onClick={claimMonthly}
                      disabled={!status.monthlyReward || status.alreadyClaimedMonthly || claimingMonthly}
                      className="w-full py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-500 text-white"
                    >
                      {claimingMonthly ? 'Reclamando...' : status.alreadyClaimedMonthly ? 'Ya reclamado este mes' : !status.monthlyReward ? 'Sin recompensa (HIERRO)' : '¡Reclamar recompensa!'}
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-white/5 animate-pulse" />
                    <div className="h-8 rounded bg-white/5 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
