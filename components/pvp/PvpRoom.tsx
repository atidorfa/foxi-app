'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { TherianDTO } from '@/lib/therian-dto'
import type { BattleState } from '@/lib/pvp/types'
import TeamSetup from './TeamSetup'
import BattleField from './BattleField'
import type { BattleRewards } from './BattleField'
import { getRankFromMmr } from '@/lib/pvp/mmr'

const RANK_META = {
  HIERRO:  { label: 'Hierro',  color: 'text-gray-300',   border: 'border-gray-500/40',  bg: 'bg-gray-500/10',   glow: 'shadow-gray-500/20'   },
  BRONCE:  { label: 'Bronce',  color: 'text-orange-300', border: 'border-orange-500/40', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/20' },
  PLATA:   { label: 'Plata',   color: 'text-slate-200',  border: 'border-slate-400/40',  bg: 'bg-slate-400/10',  glow: 'shadow-slate-400/20'  },
  ORO:     { label: 'Oro',     color: 'text-yellow-300', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', glow: 'shadow-yellow-500/25' },
  PLATINO: { label: 'Platino', color: 'text-cyan-300',   border: 'border-cyan-400/40',   bg: 'bg-cyan-400/10',   glow: 'shadow-cyan-400/25'   },
  MITICO:  { label: 'Mítico',  color: 'text-purple-300', border: 'border-purple-500/40', bg: 'bg-purple-500/10', glow: 'shadow-purple-500/30' },
} as const

interface Props {
  therians: TherianDTO[]
  activeBattleId: string | null
  onBattleComplete?: (won: boolean, rewards?: BattleRewards) => void
  onReturnToLobby?: () => void
  savedTeamIds?: string[]
  onTeamSaved?: (ids: string[]) => void
  /** Si se proporcionan 3 IDs, la batalla empieza automáticamente sin mostrar la pantalla de selección */
  initialTeamIds?: string[]
}

type Phase = 'setup' | 'starting' | 'loading_battle' | 'battle' | 'result'

export default function PvpRoom({ therians, activeBattleId, onBattleComplete, onReturnToLobby, savedTeamIds, onTeamSaved, initialTeamIds }: Props) {
  const startPhase: Phase = activeBattleId ? 'loading_battle' : initialTeamIds?.length === 3 ? 'starting' : 'setup'
  const [phase, setPhase] = useState<Phase>(startPhase)
  const [battleId, setBattleId] = useState<string | null>(activeBattleId)
  const [battleState, setBattleState] = useState<BattleState | null>(null)
  const [won, setWon] = useState<boolean | null>(null)
  const [rewards, setRewards] = useState<BattleRewards | undefined>(undefined)
  const [startError, setStartError] = useState<string | null>(null)
  const startingRef = useRef(false)

  // Si hay batalla activa en props → cargarla
  useEffect(() => {
    if (!activeBattleId) return
    fetch(`/api/pvp/${activeBattleId}`)
      .then(r => r.json())
      .then(data => {
        if (data.state) {
          setBattleId(activeBattleId)
          setBattleState(data.state)
          setPhase('battle')
        } else {
          setPhase('setup')
        }
      })
      .catch(() => setPhase('setup'))
  }, [activeBattleId])

  // Auto-start con equipo guardado
  useEffect(() => {
    if (phase !== 'starting' || !initialTeamIds || initialTeamIds.length !== 3) return
    if (startingRef.current) return
    startingRef.current = true

    fetch('/api/pvp/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attackerTeamIds: initialTeamIds }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.battleId && data.state) {
          setBattleId(data.battleId)
          setBattleState(data.state)
          setPhase('battle')
        } else if (data.error === 'BATTLE_IN_PROGRESS') {
          setStartError('Ya tienes una batalla en curso.')
          setPhase('setup')
        } else if (data.error === 'NO_ENERGY') {
          setStartError('Sin energía. Espera a que se recargue.')
          setPhase('setup')
        } else if (data.error === 'NO_OPPONENTS') {
          setStartError('No se encontraron rivales. Intenta más tarde.')
          setPhase('setup')
        } else {
          setStartError(data.error ?? 'Error al iniciar la batalla.')
          setPhase('setup')
        }
      })
      .catch(() => {
        setStartError('Error de conexión.')
        setPhase('setup')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function handleBattleStart(id: string, state: BattleState) {
    setBattleId(id)
    setBattleState(state)
    setPhase('battle')
  }

  function handleComplete(playerWon: boolean, battleRewards?: BattleRewards) {
    setWon(playerWon)
    setRewards(battleRewards)
    setPhase('result')
    onBattleComplete?.(playerWon, battleRewards)
  }

  function handleNewBattle() {
    setBattleId(null)
    setBattleState(null)
    setWon(null)
    setRewards(undefined)
    setPhase('setup')
  }

  if (phase === 'loading_battle' || phase === 'starting') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        <p className="text-white/40 text-sm">
          {phase === 'starting' ? 'Buscando rival...' : 'Cargando batalla...'}
        </p>
      </div>
    )
  }

  if (phase === 'setup') {
    return (
      <TeamSetup
        therians={therians}
        onBattleStart={handleBattleStart}
        savedTeamIds={savedTeamIds}
        onTeamSaved={onTeamSaved}
        externalError={startError ?? undefined}
      />
    )
  }

  if (phase === 'battle' && battleId && battleState) {
    return (
      <BattleField
        battleId={battleId}
        initialState={battleState}
        onComplete={handleComplete}
      />
    )
  }

  if (phase === 'result') {
    const isWin = won === true
    return (
      <div className="relative flex flex-col items-center py-10 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px] opacity-20 ${isWin ? 'bg-yellow-500' : 'bg-red-800'}`}
          />
        </div>

        {/* Trophy / Skull */}
        <div
          className="relative text-[96px] leading-none mb-2 animate-bounce"
          style={{ animationDuration: '2s', animationIterationCount: isWin ? '3' : '1' }}
        >
          {isWin ? '🏆' : '💀'}
        </div>

        {/* Result title */}
        <h2
          className={`text-4xl font-extrabold tracking-tight mb-1 ${isWin ? 'text-yellow-400' : 'text-red-400'}`}
        >
          {isWin ? '¡Victoria!' : 'Derrota'}
        </h2>
        <p className="text-white/30 text-sm mb-8">
          {isWin ? 'Derrotaste al rival.' : 'Tu equipo fue eliminado.'}
        </p>

        {/* Rank-up banner */}
        {isWin && rewards && (() => {
          const prevRank = getRankFromMmr(rewards.newMmr - rewards.mmrDelta)
          if (prevRank === rewards.rank) return null
          const meta = RANK_META[rewards.rank as keyof typeof RANK_META]
          const prevMeta = RANK_META[prevRank as keyof typeof RANK_META]
          if (!meta) return null
          return (
            <div className={`w-full max-w-sm rounded-2xl border p-5 text-center space-y-3 mb-2 ${meta.border} ${meta.bg} shadow-xl ${meta.glow}`}>
              <p className={`text-[11px] uppercase tracking-widest font-bold ${meta.color} opacity-70`}>
                ¡Ascenso de rango!
              </p>
              <Image
                src={`/ranks/${rewards.rank.toLowerCase()}.svg`}
                alt={meta.label}
                width={88}
                height={106}
                className="mx-auto drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 12px currentColor)' }}
              />
              <p className={`text-2xl font-extrabold tracking-wide ${meta.color}`}>
                {meta.label}
              </p>
              <p className="text-white/35 text-xs">
                {prevMeta?.label ?? prevRank} → {meta.label}
              </p>
            </div>
          )
        })()}

        {/* Rewards card */}
        {rewards && (
          <div className={`w-full max-w-sm rounded-2xl border p-6 space-y-4 mb-8 ${isWin ? 'border-yellow-500/20 bg-yellow-900/10' : 'border-red-500/15 bg-red-900/8'}`}>
            {/* MMR delta — big and prominent */}
            <div className="text-center space-y-0.5">
              <p className="text-white/30 text-xs uppercase tracking-widest">MMR</p>
              <p className={`text-5xl font-extrabold ${rewards.mmrDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {rewards.mmrDelta >= 0 ? '+' : ''}{rewards.mmrDelta}
              </p>
              <p className="text-white/50 text-sm">→ {rewards.newMmr} MMR · {rewards.rank}</p>
            </div>

            <div className="h-px bg-white/8" />

            {/* Gold */}
            {rewards.goldEarned > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Oro ganado</span>
                <span className="text-yellow-400 font-bold text-lg">+{rewards.goldEarned} 🪙</span>
              </div>
            )}

            {/* Weekly wins */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Victorias semanales</span>
              <span className="text-white font-medium">{rewards.weeklyPvpWins} / 15</span>
            </div>
          </div>
        )}

        {/* Next button */}
        <button
          onClick={onReturnToLobby ?? handleNewBattle}
          className={`px-10 py-3.5 rounded-xl font-bold text-lg text-white transition-all ${isWin ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 shadow-lg shadow-yellow-900/30' : 'bg-white/10 hover:bg-white/15 border border-white/10'}`}
        >
          {onReturnToLobby ? '← Volver al lobby' : 'Siguiente →'}
        </button>
      </div>
    )
  }

  return null
}
