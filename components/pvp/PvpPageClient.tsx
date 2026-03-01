'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'
import PvpRoom from './PvpRoom'
import TeamSetup from './TeamSetup'
import TherianAvatar from '@/components/TherianAvatar'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  energy: number
  energyMax: number
  energyRegenAt: string | null
}

interface RankingEntry {
  position: number
  name: string
  mmr: number
  rank: string
  isCurrentUser: boolean
}

// ─── Rank constants ───────────────────────────────────────────────────────────

const RANK_ORDER = ['HIERRO', 'BRONCE', 'PLATA', 'ORO', 'PLATINO', 'MITICO']

const RANK_COLORS: Record<string, string> = {
  HIERRO:  'text-slate-400',
  BRONCE:  'text-amber-500',
  PLATA:   'text-slate-300',
  ORO:     'text-yellow-400',
  PLATINO: 'text-cyan-300',
  MITICO:  'text-purple-400',
}

const RANK_BORDER: Record<string, string> = {
  HIERRO:  'border-slate-500/30',
  BRONCE:  'border-amber-600/30',
  PLATA:   'border-slate-400/30',
  ORO:     'border-yellow-400/30',
  PLATINO: 'border-cyan-400/30',
  MITICO:  'border-purple-500/40',
}

const RANK_GLOW: Record<string, string> = {
  HIERRO:  '',
  BRONCE:  '',
  PLATA:   '',
  ORO:     'shadow-[0_0_40px_rgba(250,204,21,0.08)]',
  PLATINO: 'shadow-[0_0_40px_rgba(34,211,238,0.08)]',
  MITICO:  'shadow-[0_0_50px_rgba(168,85,247,0.12)]',
}

const RANK_ICONS: Record<string, string> = {
  HIERRO:  '🔩',
  BRONCE:  '🥉',
  PLATA:   '🥈',
  ORO:     '🥇',
  PLATINO: '💠',
  MITICO:  '🔮',
}

const RANK_BAR_COLOR: Record<string, string> = {
  HIERRO:  'from-slate-500 to-slate-400',
  BRONCE:  'from-amber-600 to-amber-400',
  PLATA:   'from-slate-400 to-white/60',
  ORO:     'from-yellow-500 to-yellow-300',
  PLATINO: 'from-cyan-500 to-cyan-300',
  MITICO:  'from-purple-500 to-purple-300',
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

function formatCountdown(targetIso: string): string {
  const ms = new Date(targetIso).getTime() - Date.now()
  if (ms <= 0) return 'recargando...'
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ─── View type ────────────────────────────────────────────────────────────────

type View = 'lobby' | 'fight' | 'team' | 'ranking' | 'info' | 'rewards'

interface Props {
  therians: TherianDTO[]
  activeBattleId: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PvpPageClient({ therians, activeBattleId }: Props) {
  const [view, setView] = useState<View>(activeBattleId ? 'fight' : 'lobby')
  const [status, setStatus] = useState<PvpStatus | null>(null)
  const [savedTeamIds, setSavedTeamIds] = useState<string[]>([])
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[] | null>(null)
  const [rankingCurrentUser, setRankingCurrentUser] = useState<RankingEntry | null>(null)
  const [claimingWeekly, setClaimingWeekly] = useState(false)
  const [claimingMonthly, setClaimingMonthly] = useState(false)
  const [claimMsg, setClaimMsg] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<string | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(() => {
    fetch('/api/pvp/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setStatus(data) })
      .catch(() => {})
  }, [])

  const fetchSavedTeam = useCallback(() => {
    fetch('/api/pvp/team')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.teamIds) setSavedTeamIds(data.teamIds) })
      .catch(() => {})
  }, [])

  const fetchRanking = useCallback(() => {
    fetch('/api/pvp/ranking')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.entries) {
          setRankingEntries(data.entries)
          setRankingCurrentUser(data.currentUser ?? null)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchStatus(); fetchSavedTeam() }, [fetchStatus, fetchSavedTeam])

  // Energy countdown timer
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (!status?.energyRegenAt) { setCountdown(null); return }
    setCountdown(formatCountdown(status.energyRegenAt))
    countdownRef.current = setInterval(() => {
      if (!status?.energyRegenAt) return
      const remaining = new Date(status.energyRegenAt).getTime() - Date.now()
      if (remaining <= 0) {
        setCountdown(null)
        fetchStatus()
        clearInterval(countdownRef.current!)
      } else {
        setCountdown(formatCountdown(status.energyRegenAt))
      }
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [status?.energyRegenAt, fetchStatus])

  function handleBattleComplete(_won: boolean) {
    fetchStatus()
    // View stays on 'fight' so the result screen is shown; onReturnToLobby handles navigation
  }

  async function claimWeekly() {
    setClaimingWeekly(true)
    setClaimMsg(null)
    try {
      const res = await fetch('/api/pvp/rewards/weekly', { method: 'POST' })
      const data = await res.json()
      setClaimMsg(res.ok ? `¡Cofre reclamado! +${data.gold} oro, 1 huevo, 2 runas.` : (data.error ?? 'Error al reclamar.'))
      if (res.ok) fetchStatus()
    } finally { setClaimingWeekly(false) }
  }

  async function claimMonthly() {
    setClaimingMonthly(true)
    setClaimMsg(null)
    try {
      const res = await fetch('/api/pvp/rewards/monthly', { method: 'POST' })
      const data = await res.json()
      setClaimMsg(res.ok ? `¡Recompensa mensual reclamada! +${data.gold} oro.` : (data.error ?? 'Error al reclamar.'))
      if (res.ok) fetchStatus()
    } finally { setClaimingMonthly(false) }
  }

  const rank = status?.rank ?? 'HIERRO'
  const progress = status ? rankProgress(status.mmr, rank) : 0
  const nextRankLabel = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1]
  const energy = status?.energy ?? 10
  const energyMax = status?.energyMax ?? 10
  const hasRewardBadge = !!(status?.chestAvailable && !status?.alreadyClaimedChest)
  const hasSavedTeam = savedTeamIds.length === 3
  const canFight = hasSavedTeam && therians.length >= 3 && energy > 0

  // ─── Sidebar ──────────────────────────────────────────────────────────────

  const sidebar = (
    <div className="space-y-4">

      {/* Rank card */}
      {status ? (
        <div className={`rounded-2xl border p-6 space-y-4 bg-white/3 ${RANK_BORDER[rank]} ${RANK_GLOW[rank]} transition-all duration-500`}>
          <div className="text-center space-y-1">
            <div className="text-5xl mb-3">{RANK_ICONS[rank]}</div>
            <p className={`text-xl font-bold tracking-widest uppercase ${RANK_COLORS[rank]}`}>{rank}</p>
            <p className="text-white text-4xl font-bold leading-none">{status.mmr}</p>
            <p className="text-white/25 text-xs uppercase tracking-widest">MMR</p>
          </div>
          {rank !== 'MITICO' ? (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs text-white/35">
                <span>{rank}</span>
                <span>{nextRankLabel}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${RANK_BAR_COLOR[rank]} transition-all duration-700`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-white/20">{progress}% → {nextRankLabel}</p>
            </div>
          ) : (
            <p className="text-center text-xs text-purple-400 font-medium pt-1">⭐ Rango máximo alcanzado</p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 p-6 bg-white/3 space-y-3 animate-pulse">
          <div className="h-12 w-12 rounded-full bg-white/5 mx-auto" />
          <div className="h-5 rounded bg-white/5 mx-auto w-20" />
          <div className="h-8 rounded bg-white/5" />
          <div className="h-2 rounded-full bg-white/5" />
        </div>
      )}

      {/* Energy counter */}
      <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-white/35 text-xs uppercase tracking-widest">⚡ Energía</span>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-lg tabular-nums ${energy === 0 ? 'text-red-400' : energy <= 3 ? 'text-amber-400' : 'text-yellow-300'}`}>
            {energy}
          </span>
          <span className="text-white/25 text-sm">/</span>
          <span className="text-white/40 text-sm">{energyMax}</span>
          {energy < energyMax && countdown && (
            <span className="text-white/25 text-xs border border-white/8 rounded px-1.5 py-0.5 ml-1">
              +1 en {countdown}
            </span>
          )}
        </div>
      </div>

      {/* Season stats */}
      {status && (
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2.5">
          <p className="text-white/25 text-xs uppercase tracking-widest">Temporada</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/45">Pico</span>
            <span className={`font-semibold ${RANK_COLORS[status.peakRank]}`}>
              {RANK_ICONS[status.peakRank]} {status.peakRank} · {status.peakMmr}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-white/45">Victorias sem.</span>
              <span className="text-white font-medium">{status.weeklyPvpWins} / {status.weeklyRequired}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500/60 transition-all duration-500"
                style={{ width: `${Math.min(100, (status.weeklyPvpWins / status.weeklyRequired) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Battle modes */}
      <div className="space-y-2">
        <button
          onClick={() => hasSavedTeam ? setView('fight') : setView('team')}
          disabled={hasSavedTeam && !canFight}
          className={`w-full py-4 rounded-xl font-bold text-lg text-white border shadow-lg transition-all flex items-center justify-center gap-2
            ${hasSavedTeam
              ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border-red-500/20 shadow-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 border-purple-500/20 shadow-purple-900/20'
            }`}
        >
          {hasSavedTeam ? '⚔️ Batalla Clasificatoria' : '🛡️ Configura tu equipo'}
        </button>
        {!hasSavedTeam ? (
          <p className="text-center text-xs text-purple-300/60">
            Debes guardar un equipo de 3 Therians antes de combatir
          </p>
        ) : !canFight && (
          <p className="text-center text-xs text-white/25">
            {energy === 0 ? `Sin energía · recarga en ${countdown ?? '...'}` : 'Necesitas al menos 3 Therians'}
          </p>
        )}
        <button
          disabled
          className="w-full py-3.5 rounded-xl font-medium text-white/25 border border-white/8 bg-white/2 cursor-not-allowed flex items-center justify-center gap-2"
        >
          🤝 Amistosa
          <span className="text-[10px] font-normal bg-white/8 px-2 py-0.5 rounded-full text-white/20">Próximamente</span>
        </button>
      </div>

      {/* Secondary buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setView('team')}
          className={`py-2.5 rounded-xl border text-xs font-medium transition-colors flex flex-col items-center gap-1 ${view === 'team' ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-white/8 bg-white/3 hover:bg-white/5 text-white/50 hover:text-white/80'}`}
        >
          <span className="text-base">🛡️</span>
          Equipo
        </button>
        <button
          onClick={() => { setView('ranking'); fetchRanking() }}
          className={`py-2.5 rounded-xl border text-xs font-medium transition-colors flex flex-col items-center gap-1 ${view === 'ranking' ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' : 'border-white/8 bg-white/3 hover:bg-white/5 text-white/50 hover:text-white/80'}`}
        >
          <span className="text-base">🏆</span>
          Ranking
        </button>
        <button
          onClick={() => setView('info')}
          className={`py-2.5 rounded-xl border text-xs font-medium transition-colors flex flex-col items-center gap-1 ${view === 'info' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-white/8 bg-white/3 hover:bg-white/5 text-white/50 hover:text-white/80'}`}
        >
          <span className="text-base">ℹ️</span>
          Liga
        </button>
      </div>

      {/* Rewards button */}
      <button
        onClick={() => setView('rewards')}
        className={`w-full py-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${view === 'rewards' ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300' : 'border-white/8 bg-white/3 hover:bg-white/5 text-white/50 hover:text-white/80'}`}
      >
        🎁 Recompensas
        {hasRewardBadge && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </button>
    </div>
  )

  // ─── FIGHT VIEW ──────────────────────────────────────────────────────────────

  if (view === 'fight') {
    return (
      <div className="space-y-5">
        <button onClick={() => setView('lobby')} className="text-white/40 hover:text-white/70 text-sm flex items-center gap-1.5 transition-colors">
          ← Volver al lobby
        </button>
        <PvpRoom
          therians={therians}
          activeBattleId={activeBattleId}
          onBattleComplete={handleBattleComplete}
          onReturnToLobby={() => setView('lobby')}
          savedTeamIds={savedTeamIds}
          onTeamSaved={ids => setSavedTeamIds(ids)}
          initialTeamIds={savedTeamIds.length === 3 ? savedTeamIds : undefined}
        />
      </div>
    )
  }

  // ─── TEAM VIEW ────────────────────────────────────────────────────────────────

  if (view === 'team') {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <button
          onClick={() => setView('lobby')}
          className="text-white/40 hover:text-white/70 text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Volver al lobby
        </button>
        <TeamSetup
          therians={therians}
          onBattleStart={() => {}}
          savedTeamIds={savedTeamIds}
          onTeamSaved={ids => setSavedTeamIds(ids)}
          mode="team-setup"
        />
      </div>
    )
  }

  // ─── RANKING VIEW ─────────────────────────────────────────────────────────────

  if (view === 'ranking') {
    return (
      <div className="grid lg:grid-cols-[300px,1fr] gap-6 items-start">
        <div>{sidebar}</div>
        <div className="space-y-6">
          <div>
            <h2 className="text-white font-bold text-2xl mb-1">🏆 Ranking</h2>
            <p className="text-white/35 text-sm">Top jugadores por MMR actual.</p>
          </div>

          {rankingEntries === null ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/3 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {rankingEntries.map(entry => (
                <div
                  key={entry.position}
                  className={`flex items-center gap-4 rounded-xl border px-5 py-3.5 transition-all ${entry.isCurrentUser ? 'border-purple-500/30 bg-purple-500/8' : 'border-white/8 bg-white/3'}`}
                >
                  <span className={`w-7 text-center font-bold text-lg ${entry.position <= 3 ? ['text-yellow-400', 'text-slate-300', 'text-amber-600'][entry.position - 1] : 'text-white/30'}`}>
                    {entry.position <= 3 ? ['🥇', '🥈', '🥉'][entry.position - 1] : `#${entry.position}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${entry.isCurrentUser ? 'text-purple-200' : 'text-white'}`}>
                      {entry.name}{entry.isCurrentUser ? ' (tú)' : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${RANK_COLORS[entry.rank]} ${RANK_BORDER[entry.rank]} bg-white/5`}>
                    {entry.rank}
                  </span>
                  <span className="text-white font-bold tabular-nums">{entry.mmr}</span>
                </div>
              ))}

              {rankingCurrentUser && (
                <>
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-white/20 text-xs">tu posición</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>
                  <div className="flex items-center gap-4 rounded-xl border border-purple-500/30 bg-purple-500/8 px-5 py-3.5">
                    <span className="w-7 text-center font-bold text-white/40 text-lg">#{rankingCurrentUser.position}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-purple-200 truncate">{rankingCurrentUser.name} (tú)</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${RANK_COLORS[rankingCurrentUser.rank]} ${RANK_BORDER[rankingCurrentUser.rank]} bg-white/5`}>
                      {rankingCurrentUser.rank}
                    </span>
                    <span className="text-white font-bold tabular-nums">{rankingCurrentUser.mmr}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── INFO VIEW ────────────────────────────────────────────────────────────────

  if (view === 'info') {
    const leagues = [
      { rank: 'HIERRO',  range: '0 – 999',    mmrGold: '50', monthly: 'Sin recompensa' },
      { rank: 'BRONCE',  range: '1000 – 1399', mmrGold: '50', monthly: '1.500 🪙 · 🥚 Uncommon · 2× Runa T1' },
      { rank: 'PLATA',   range: '1400 – 1799', mmrGold: '75', monthly: '3.000 🪙 · 🥚 Rare · 3× Runa T1' },
      { rank: 'ORO',     range: '1800 – 2199', mmrGold: '75', monthly: '6.000 🪙 · 🥚 Epic · 3× Runa T2' },
      { rank: 'PLATINO', range: '2200 – 2599', mmrGold: '100', monthly: '12.000 🪙 · 🥚 Legendary · 5× Runa T3' },
      { rank: 'MITICO',  range: '2600+',       mmrGold: '100', monthly: '30.000 🪙 · 🥚 Legendary · 4× Runa T4 · 👑 Corona' },
    ]

    return (
      <div className="grid lg:grid-cols-[300px,1fr] gap-6 items-start">
        <div>{sidebar}</div>
        <div className="space-y-6">
          <div>
            <h2 className="text-white font-bold text-2xl mb-1">ℹ️ Liga PvP</h2>
            <p className="text-white/35 text-sm">Todo lo que necesitas saber para competir.</p>
          </div>

          {/* MMR rules */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-3">
            <p className="text-white font-semibold text-sm">⚔️ Sistema de MMR</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-emerald-900/20 border border-emerald-500/15 p-3 text-center">
                <p className="text-emerald-400 font-bold text-2xl">+25</p>
                <p className="text-white/40 text-xs mt-0.5">MMR por victoria</p>
              </div>
              <div className="rounded-lg bg-red-900/20 border border-red-500/15 p-3 text-center">
                <p className="text-red-400 font-bold text-2xl">−15</p>
                <p className="text-white/40 text-xs mt-0.5">MMR por derrota</p>
              </div>
            </div>
          </div>

          {/* Energy rules */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-3">
            <p className="text-white font-semibold text-sm">⚡ Energía de combate</p>
            <div className="space-y-2 text-sm text-white/50">
              <div className="flex items-start gap-2"><span>•</span><span>Máximo <strong className="text-white">10 energías</strong>. Cada batalla cuesta 1.</span></div>
              <div className="flex items-start gap-2"><span>•</span><span>Se regenera <strong className="text-white">1 energía cada 2h 40m</strong> (160 minutos) si no estás al máximo.</span></div>
              <div className="flex items-start gap-2"><span>•</span><span>Con 10 energías, el temporizador está pausado.</span></div>
            </div>
          </div>

          {/* Weekly chest */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-3">
            <p className="text-white font-semibold text-sm">🎁 Cofre Semanal</p>
            <p className="text-white/50 text-sm">Gana <strong className="text-white">15 victorias</strong> en la semana y reclama el cofre:</p>
            <div className="text-sm text-white/40 space-y-1">
              <p>🪙 800 oro</p>
              <p>🥚 1× Huevo Poco Común</p>
              <p>💎 2× Runa T1 aleatoria</p>
            </div>
          </div>

          {/* League table */}
          <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/8">
              <p className="text-white font-semibold text-sm">🏅 Rangos y recompensas mensuales</p>
              <p className="text-white/30 text-xs mt-0.5">Las recompensas se basan en el pico de rango del mes.</p>
            </div>
            <div className="divide-y divide-white/5">
              {leagues.map(l => (
                <div key={l.rank} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="text-xl leading-none mt-0.5">{RANK_ICONS[l.rank]}</span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${RANK_COLORS[l.rank]}`}>{l.rank}</span>
                      <span className="text-white/25 text-xs">{l.range} MMR</span>
                      <span className="text-yellow-400/70 text-xs ml-auto">+{l.mmrGold}🪙 /win</span>
                    </div>
                    <p className="text-white/35 text-xs">{l.monthly}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── REWARDS VIEW ─────────────────────────────────────────────────────────────

  if (view === 'rewards') {
    return (
      <div className="grid lg:grid-cols-[300px,1fr] gap-6 items-start">
        <div>{sidebar}</div>
        <div className="space-y-6 max-w-lg">
          <h2 className="text-white font-bold text-2xl">🎁 Recompensas PvP</h2>

          {claimMsg && (
            <div className="text-center text-sm py-2 px-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
              {claimMsg}
            </div>
          )}

          {/* Cofre Semanal */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold">Cofre Semanal</p>
              {status?.alreadyClaimedChest && (
                <span className="text-xs text-white/30 border border-white/10 rounded px-2 py-0.5">Reclamado</span>
              )}
            </div>
            {status ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-white/50">
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
                <div className="text-sm text-white/40 space-y-1">
                  <p>🪙 800 oro · 🥚 1× Huevo Poco Común · 💎 2× Runa T1 aleatoria</p>
                </div>
                <button
                  onClick={claimWeekly}
                  disabled={!status.chestAvailable || claimingWeekly}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {claimingWeekly ? 'Reclamando...' : status.alreadyClaimedChest ? 'Ya reclamado esta semana' : status.chestAvailable ? '¡Reclamar cofre!' : `Faltan ${status.weeklyRequired - status.weeklyPvpWins} victorias`}
                </button>
              </>
            ) : <div className="h-16 rounded bg-white/5 animate-pulse" />}
          </div>

          {/* Recompensa Mensual */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold">Recompensa Mensual</p>
              {status?.alreadyClaimedMonthly && (
                <span className="text-xs text-white/30 border border-white/10 rounded px-2 py-0.5">Reclamado</span>
              )}
            </div>
            {status ? (
              <>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <span>Pico del mes:</span>
                  <span className={`font-bold ${RANK_COLORS[status.peakRank]}`}>{status.peakRank}</span>
                  <span>({status.peakMmr} MMR)</span>
                </div>
                {status.monthlyReward ? (
                  <div className="text-sm text-white/40 space-y-1">
                    <p>🪙 {status.monthlyReward.gold.toLocaleString()} oro</p>
                    {status.monthlyReward.essence > 0 && <p>✨ {status.monthlyReward.essence}× Esencia</p>}
                    {status.monthlyReward.eggs.map((e, i) => <p key={i}>🥚 1× {e}</p>)}
                    {status.monthlyReward.accessories.map((a, i) => <p key={i}>🎭 1× {a}</p>)}
                    {status.monthlyReward.runes.map((r, i) => <p key={i}>💎 1× {r}</p>)}
                  </div>
                ) : (
                  <p className="text-sm text-white/30">Alcanza BRONCE o superior para recibir recompensa mensual.</p>
                )}
                <button
                  onClick={claimMonthly}
                  disabled={!status.monthlyReward || status.alreadyClaimedMonthly || claimingMonthly}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {claimingMonthly ? 'Reclamando...' : status.alreadyClaimedMonthly ? 'Ya reclamado este mes' : !status.monthlyReward ? 'Sin recompensa (HIERRO)' : '¡Reclamar recompensa!'}
                </button>
              </>
            ) : <div className="h-16 rounded bg-white/5 animate-pulse" />}
          </div>
        </div>
      </div>
    )
  }

  // ─── LOBBY VIEW ───────────────────────────────────────────────────────────────

  return (
    <div className="grid lg:grid-cols-[300px,1fr] gap-6 items-start">
      <div>{sidebar}</div>

      {/* Arena visual */}
      <div className="space-y-4">
        <div className="relative rounded-2xl overflow-hidden border border-white/8 min-h-[400px] flex flex-col bg-[#08080F]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full blur-[120px] opacity-20 bg-red-800" />
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#08080F] to-transparent" />
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[300px] h-[40px] rounded-full blur-[30px] opacity-25 bg-red-700" />
          </div>

          <div className="relative flex items-center justify-between px-6 pt-5 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/30 text-xs uppercase tracking-widest font-medium">Arena PvP</span>
            </div>
            <span className="text-white/15 text-xs">Temporada activa</span>
          </div>

          <div className="flex-1 flex items-end justify-center pb-10 relative">
            {(() => {
              const arenaTherians = savedTeamIds.length === 3
                ? savedTeamIds.map(id => therians.find(t => t.id === id)).filter(Boolean) as typeof therians
                : therians.slice(0, 3)
              return arenaTherians.length > 0 ? (
                <div className="flex items-end justify-center gap-8">
                  {arenaTherians.map((t, i) => {
                    const isCenter = arenaTherians.length === 1 || i === 1
                    return (
                      <div
                        key={t.id}
                        className="flex flex-col items-center gap-2 transition-all duration-300"
                        style={{ transform: isCenter ? 'translateY(-24px) scale(1.18)' : 'scale(1)', zIndex: isCenter ? 10 : 5 }}
                      >
                        <div style={isCenter ? { filter: 'drop-shadow(0 0 18px rgba(239,68,68,0.35))' } : {}}>
                          <TherianAvatar therian={t} size={isCenter ? 100 : 76} />
                        </div>
                        <p className="text-white/35 text-xs text-center max-w-[88px] truncate">{t.name ?? t.species.name}</p>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-white/15 text-sm">Sin Therians</p>
            })()}
            <div className="absolute bottom-4 left-8 right-8 h-px bg-gradient-to-r from-transparent via-red-800/40 to-transparent" />
          </div>

          <div className="relative px-6 py-4 text-center">
            <p className="text-white/35 text-sm">
              {!hasSavedTeam
                ? 'Ve a Equipo y guarda tu formación de 3 Therians'
                : energy === 0
                  ? `Sin energía · recarga en ${countdown ?? '...'}`
                  : 'Equipo guardado listo para combatir'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
            <p className="text-white/25 text-xs uppercase tracking-widest mb-1.5">Therians</p>
            <p className="text-white text-3xl font-bold">{therians.length}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
            <p className="text-white/25 text-xs uppercase tracking-widest mb-1.5">Victorias sem.</p>
            <p className="text-white text-3xl font-bold">{status?.weeklyPvpWins ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
