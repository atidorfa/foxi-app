'use client'

import React, { useEffect, useState, useRef } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'
import type { BattleResult, BattleRound } from '@/lib/battle/engine'
import TherianAvatar from './TherianAvatar'

interface BattleArenaProps {
  challenger: TherianDTO
  target: TherianDTO
  result: BattleResult
  onComplete?: () => void
}

const ROUND_DELAY_MS = 480

const RARITY_COLOR: Record<string, string> = {
  COMMON: '#a0aec0',
  RARE: '#63b3ed',
  EPIC: '#b794f4',
  LEGENDARY: '#f6e05e',
}

function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  return (
    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

interface FloatingText {
  id: number
  text: string
  color: string
  side: 'left' | 'right'
}

export default function BattleArena({ challenger, target, result, onComplete }: BattleArenaProps) {
  const initChallengerHp = challenger.stats.vitality
  const initTargetHp = target.stats.vitality

  const [phase, setPhase] = useState<'intro' | 'fighting' | 'result'>('intro')
  const [currentRound, setCurrentRound] = useState(-1)
  const [displayedChallengerHp, setDisplayedChallengerHp] = useState(initChallengerHp)
  const [displayedTargetHp, setDisplayedTargetHp] = useState(initTargetHp)
  const [lungeLeft, setLungeLeft] = useState(false)
  const [lungeRight, setLungeRight] = useState(false)
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([])
  const [shakeLeft, setShakeLeft] = useState(false)
  const [shakeRight, setShakeRight] = useState(false)
  const floatId = useRef(0)

  // Intro → fighting
  useEffect(() => {
    const t = setTimeout(() => setPhase('fighting'), 900)
    return () => clearTimeout(t)
  }, [])

  // Process rounds
  useEffect(() => {
    if (phase !== 'fighting') return
    if (currentRound >= result.rounds.length - 1) {
      const t = setTimeout(() => {
        setPhase('result')
        onComplete?.()
      }, 700)
      return () => clearTimeout(t)
    }

    const nextIndex = currentRound + 1
    const t = setTimeout(() => {
      const round: BattleRound = result.rounds[nextIndex]
      setCurrentRound(nextIndex)

      const isLeft = round.attacker === 'challenger'

      // Lunge animation
      if (isLeft) setLungeLeft(true)
      else setLungeRight(true)
      setTimeout(() => { setLungeLeft(false); setLungeRight(false) }, 220)

      // Update HP
      setDisplayedChallengerHp(round.challengerHp)
      setDisplayedTargetHp(round.targetHp)

      // Shake defender if damage was dealt
      if (round.damage > 0) {
        if (isLeft) setShakeRight(true)
        else setShakeLeft(true)
        setTimeout(() => { setShakeLeft(false); setShakeRight(false) }, 300)
      }

      // Floating text
      const id = ++floatId.current
      let text = `-${round.damage}`
      let color = '#fc8181'
      if (round.evaded) { text = 'ESQUIVÓ'; color = '#63b3ed' }
      else if (round.critical) { text = `CRÍTICO! -${round.damage}`; color = '#f6e05e' }

      const side: 'left' | 'right' = isLeft ? 'right' : 'left'
      setFloatingTexts(prev => [...prev, { id, text, color, side }])
      setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1000)
    }, ROUND_DELAY_MS)

    return () => clearTimeout(t)
  }, [phase, currentRound, result.rounds, onComplete])

  const winner = result.winner === 'challenger' ? challenger : target
  const loser  = result.winner === 'challenger' ? target : challenger
  const isUserWinner = result.winner === 'challenger'

  return (
    <div className="relative w-full rounded-2xl border border-white/10 bg-[#0D0D1A] overflow-hidden">
      {/* Arena background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-1/2 h-32 rounded-full blur-3xl opacity-20"
          style={{ background: challenger.appearance.paletteColors.primary }} />
        <div className="absolute bottom-0 right-1/4 w-1/2 h-32 rounded-full blur-3xl opacity-20"
          style={{ background: target.appearance.paletteColors.primary }} />
      </div>

      <div className="relative px-4 pt-4 pb-6 space-y-4">
        {/* Round counter */}
        <div className="text-center">
          <span className="text-[#4A4468] text-xs tracking-widest uppercase">
            {phase === 'intro' ? '— PREPARANDO BATALLA —'
              : phase === 'result' ? '— BATALLA TERMINADA —'
              : `Ronda ${currentRound + 1} / ${result.rounds.length}`}
          </span>
        </div>

        {/* Combatants row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Challenger side */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className={`transition-transform duration-200 ${
                lungeLeft ? 'translate-x-6' : ''
              } ${shakeLeft ? 'animate-[shake_0.3s_ease]' : ''}`}>
                <TherianAvatar therian={challenger} size={100} animated={phase === 'intro'} />
              </div>
              {/* Floating texts on challenger */}
              {floatingTexts.filter(f => f.side === 'left').map(f => (
                <div key={f.id} className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold animate-[floatUp_1s_ease_forwards] whitespace-nowrap pointer-events-none"
                  style={{ color: f.color }}>
                  {f.text}
                </div>
              ))}
            </div>
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white font-semibold truncate max-w-[80px]">{challenger.name ?? 'Tú'}</span>
                <span className="text-[#8B84B0] font-mono">{displayedChallengerHp}</span>
              </div>
              <HpBar current={displayedChallengerHp} max={initChallengerHp} color={challenger.appearance.paletteColors.primary} />
            </div>
          </div>

          {/* VS */}
          <div className="text-[#4A4468] font-bold text-lg">⚔️</div>

          {/* Target side */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className={`transition-transform duration-200 ${
                lungeRight ? '-translate-x-6' : ''
              } ${shakeRight ? 'animate-[shake_0.3s_ease]' : ''}`}>
                <TherianAvatar therian={target} size={100} animated={phase === 'intro'} />
              </div>
              {floatingTexts.filter(f => f.side === 'right').map(f => (
                <div key={f.id} className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold animate-[floatUp_1s_ease_forwards] whitespace-nowrap pointer-events-none"
                  style={{ color: f.color }}>
                  {f.text}
                </div>
              ))}
            </div>
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white font-semibold truncate max-w-[80px]">{target.name ?? 'Rival'}</span>
                <span className="text-[#8B84B0] font-mono">{displayedTargetHp}</span>
              </div>
              <HpBar current={displayedTargetHp} max={initTargetHp} color={target.appearance.paletteColors.primary} />
            </div>
          </div>
        </div>

        {/* Round log — last 3 rounds */}
        <div className="space-y-1 min-h-[60px]">
          {result.rounds
            .slice(Math.max(0, currentRound - 2), currentRound + 1)
            .map((r, i) => {
              const atkName = r.attacker === 'challenger' ? (challenger.name ?? 'Tú') : (target.name ?? 'Rival')
              let msg = `${atkName} ataca`
              if (r.evaded) msg += ' — ¡ESQUIVÓ!'
              else if (r.critical) msg += ` — ¡CRÍTICO! (-${r.damage})`
              else msg += ` (-${r.damage})`
              return (
                <p key={i} className="text-xs text-[#8B84B0] italic truncate">{msg}</p>
              )
            })}
        </div>

        {/* Result banner */}
        {phase === 'result' && (
          <div className={`rounded-xl border px-4 py-4 text-center space-y-1 ${
            isUserWinner
              ? 'border-amber-500/40 bg-amber-500/10'
              : 'border-red-500/30 bg-red-500/5'
          }`}>
            <div className="text-2xl font-black">
              {isUserWinner ? '⚔️ ¡GANASTE!' : '💀 PERDISTE'}
            </div>
            
            {isUserWinner && (
              <div className="inline-flex items-center gap-1 bg-amber-500/20 rounded-full px-3 py-1 text-amber-300 text-sm font-bold mt-1">
                🦷 +1 mordida
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) translateX(-50%); }
          100% { opacity: 0; transform: translateY(-32px) translateX(-50%); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-5px); }
          75%      { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}
