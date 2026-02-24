'use client'

import { useState, useEffect } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'
import type { BattleState } from '@/lib/pvp/types'
import TeamSetup from './TeamSetup'
import BattleField from './BattleField'

interface Props {
  therians: TherianDTO[]
  activeBattleId: string | null
}

type Phase = 'setup' | 'loading_battle' | 'battle' | 'result'

export default function PvpRoom({ therians, activeBattleId }: Props) {
  const [phase, setPhase] = useState<Phase>(activeBattleId ? 'loading_battle' : 'setup')
  const [battleId, setBattleId] = useState<string | null>(activeBattleId)
  const [battleState, setBattleState] = useState<BattleState | null>(null)
  const [won, setWon] = useState<boolean | null>(null)

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

  function handleBattleStart(id: string, state: BattleState) {
    setBattleId(id)
    setBattleState(state)
    setPhase('battle')
  }

  function handleComplete(playerWon: boolean) {
    setWon(playerWon)
    setPhase('result')
  }

  function handleNewBattle() {
    setBattleId(null)
    setBattleState(null)
    setWon(null)
    setPhase('setup')
  }

  if (phase === 'loading_battle') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Cargando batalla...</p>
      </div>
    )
  }

  if (phase === 'setup') {
    return <TeamSetup therians={therians} onBattleStart={handleBattleStart} />
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
    return (
      <div className="text-center space-y-6 py-16">
        <p className="text-7xl">{won ? '🏆' : '💀'}</p>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white">{won ? '¡Victoria!' : 'Derrota'}</p>
          <p className="text-white/40 text-sm">
            {won ? 'Derrotaste al rival.' : 'Tu equipo fue eliminado.'}
          </p>
        </div>
        <button
          onClick={handleNewBattle}
          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium transition-all"
        >
          ⚔️ Nueva batalla
        </button>
      </div>
    )
  }

  return null
}
