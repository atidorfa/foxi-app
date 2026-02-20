'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
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

function CombatLog({
  rounds,
  challengerName,
  targetName,
}: {
  rounds: BattleRound[]
  challengerName: string
  targetName: string
}) {
  const [open, setOpen] = useState(false)

  // Summary stats
  const hits     = rounds.filter(r => !r.evaded && !r.blocked && r.damage > 0).length
  const evades   = rounds.filter(r => r.evaded).length
  const blocks   = rounds.filter(r => r.blocked).length
  const crits    = rounds.filter(r => r.critical).length
  const counters = rounds.filter(r => r.blocked && r.counterDamage > 0).length

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#8B84B0] hover:text-white transition-colors"
      >
        <span className="font-semibold tracking-wide">📋 Log del combate ({rounds.length} turnos)</span>
        <span className="text-xs opacity-60">{open ? '▲ cerrar' : '▼ expandir'}</span>
      </button>

      {/* Summary pills — always visible */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 font-mono">
          {hits} golpes
        </span>
        {crits > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono">
            {crits} críticos
          </span>
        )}
        {evades > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono">
            {evades} esquives
          </span>
        )}
        {blocks > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
            {blocks} bloqueos{counters > 0 ? ` (${counters} contras)` : ''}
          </span>
        )}
      </div>

      {/* Expanded per-round table */}
      {open && (
        <div className="border-t border-white/5 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#4A4468] uppercase tracking-widest border-b border-white/5">
                <th className="text-left px-3 py-2 font-medium w-8">#</th>
                <th className="text-left px-3 py-2 font-medium">Atacante</th>
                <th className="text-left px-3 py-2 font-medium">Resultado</th>
                <th className="text-right px-3 py-2 font-medium">Daño</th>
                <th className="text-right px-3 py-2 font-medium">Contra</th>
                <th className="text-right px-3 py-2 font-medium">HP A</th>
                <th className="text-right px-3 py-2 font-medium">HP B</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r, i) => {
                const atkName = r.attacker === 'challenger' ? challengerName : targetName
                const isChallenger = r.attacker === 'challenger'

                let resultLabel = ''
                let resultColor = 'text-white/60'
                if (r.evaded)        { resultLabel = 'ESQUIVÓ';   resultColor = 'text-blue-400' }
                else if (r.blocked)  { resultLabel = 'BLOQUEÓ';   resultColor = 'text-emerald-400' }
                else if (r.critical) { resultLabel = '⚡ CRÍTICO'; resultColor = 'text-amber-400' }
                else                 { resultLabel = 'Golpe';     resultColor = 'text-white/50' }

                return (
                  <tr
                    key={i}
                    className={`border-b border-white/3 ${i % 2 === 0 ? 'bg-white/2' : ''}`}
                  >
                    <td className="px-3 py-1.5 text-[#4A4468] font-mono">{i + 1}</td>
                    <td className={`px-3 py-1.5 font-semibold ${isChallenger ? 'text-purple-300' : 'text-red-300'}`}>
                      {atkName}
                    </td>
                    <td className={`px-3 py-1.5 ${resultColor}`}>{resultLabel}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-red-300">
                      {r.damage > 0 ? `-${r.damage}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-emerald-300">
                      {r.counterDamage > 0 ? `↩ -${r.counterDamage}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-white/40">{r.challengerHp}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-white/40">{r.targetHp}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 text-[10px] text-[#4A4468]">
            HP A = {challengerName} · HP B = {targetName}
          </div>
        </div>
      )}
    </div>
  )
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
  const skippedRef = useRef(false)
  const [skipping, setSkipping] = useState(false)

  const handleSkip = useCallback(() => {
    skippedRef.current = true
    setLungeLeft(false)
    setLungeRight(false)
    setShakeLeft(false)
    setShakeRight(false)
    setFloatingTexts([])
    setDisplayedChallengerHp(result.challengerFinalHp)
    setDisplayedTargetHp(result.targetFinalHp)
    setCurrentRound(result.rounds.length - 1)
    setSkipping(true)
    setTimeout(() => {
      setSkipping(false)
      setPhase('result')
      onComplete?.()
    }, 550)
  }, [result, onComplete])

  // Intro → fighting
  useEffect(() => {
    const t = setTimeout(() => {
      if (!skippedRef.current) setPhase('fighting')
    }, 900)
    return () => clearTimeout(t)
  }, [])

  // Process rounds
  useEffect(() => {
    if (skippedRef.current) return
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

      // Shake defender if damage was dealt, attacker if blocked+counter
      if (round.damage > 0) {
        if (isLeft) setShakeRight(true)
        else setShakeLeft(true)
        setTimeout(() => { setShakeLeft(false); setShakeRight(false) }, 300)
      } else if (round.blocked && round.counterDamage > 0) {
        if (isLeft) setShakeLeft(true)
        else setShakeRight(true)
        setTimeout(() => { setShakeLeft(false); setShakeRight(false) }, 300)
      }

      // Floating text on defender side
      const id = ++floatId.current
      let text = `-${round.damage}`
      let color = '#fc8181'
      if (round.evaded)        { text = 'ESQUIVÓ';               color = '#63b3ed' }
      else if (round.blocked)  { text = '🛡️ BLOQUEÓ!';          color = '#68d391' }
      else if (round.critical) { text = `CRÍTICO! -${round.damage}`; color = '#f6e05e' }

      const defSide: 'left' | 'right' = isLeft ? 'right' : 'left'
      setFloatingTexts(prev => [...prev, { id, text, color, side: defSide }])
      setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1000)

      // Counter damage floating text on attacker side
      if (round.blocked && round.counterDamage > 0) {
        const cid = ++floatId.current
        const atkSide: 'left' | 'right' = isLeft ? 'left' : 'right'
        setFloatingTexts(prev => [...prev, { id: cid, text: `↩ -${round.counterDamage}`, color: '#68d391', side: atkSide }])
        setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== cid)), 1000)
      }
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

      {/* Skip color wash overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-500"
        style={{
          background: isUserWinner
            ? 'radial-gradient(ellipse at center, rgba(34,197,94,0.25) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(239,68,68,0.25) 0%, transparent 70%)',
          opacity: skipping ? 1 : 0,
        }}
      />

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
        <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 transition-opacity duration-500 ${skipping ? 'opacity-0' : 'opacity-100'}`}>
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

        {/* Skip button */}
        {phase !== 'result' && !skipping && (
          <div className="flex justify-center">
            <button
              onClick={handleSkip}
              className="px-4 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all text-xs font-medium tracking-wide"
            >
              Saltar animación ⏭
            </button>
          </div>
        )}

        {/* Round log — last 3 rounds */}
        <div className={`space-y-1 min-h-[60px] transition-opacity duration-300 ${skipping ? 'opacity-0' : 'opacity-100'}`}>
          {result.rounds
            .slice(Math.max(0, currentRound - 2), currentRound + 1)
            .map((r, i) => {
              const atkName = r.attacker === 'challenger' ? (challenger.name ?? 'Tú') : (target.name ?? 'Rival')
              const defName = r.attacker === 'challenger' ? (target.name ?? 'Rival') : (challenger.name ?? 'Tú')
              let msg = `${atkName} ataca`
              if (r.evaded)       msg += ` — ¡${defName} esquivó!`
              else if (r.blocked) msg += ` — ¡${defName} bloqueó! ↩ -${r.counterDamage}`
              else if (r.critical) msg += ` — ¡CRÍTICO! (-${r.damage})`
              else msg += ` (-${r.damage})`
              return (
                <p key={i} className="text-xs text-[#8B84B0] italic truncate">{msg}</p>
              )
            })}
        </div>

        {/* Result banner */}
        {phase === 'result' && (
          <>
            <div className={`rounded-xl border px-4 py-4 text-center space-y-1 animate-[resultAppear_0.45s_cubic-bezier(0.34,1.56,0.64,1)_forwards] ${
              isUserWinner
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-red-500/40 bg-red-500/10'
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

            <CombatLog
              rounds={result.rounds}
              challengerName={challenger.name ?? 'Tú'}
              targetName={target.name ?? 'Rival'}
            />
          </>
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
        @keyframes resultAppear {
          0%   { opacity: 0; transform: scale(0.88) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
