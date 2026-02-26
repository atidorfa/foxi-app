'use client'

import { useState, useRef } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'

type ActionType = 'CARE' | 'TRAIN' | 'EXPLORE' | 'SOCIAL'

const SLOTS = [
  {
    type: 'CARE'    as ActionType, label: 'Vitalidad', icon: '🌿', statKey: 'vitality'  as const,
    borderIdle: 'border-emerald-500/20', bgIdle: 'bg-emerald-500/6',  textIdle: 'text-emerald-400/50', barIdle: 'bg-emerald-500/30',
    borderSpin: 'border-emerald-500/35', bgSpin: 'bg-emerald-500/10', textSpin: 'text-emerald-400/80', barSpin: 'bg-emerald-400/60',
    border: 'border-emerald-500/60',     bg: 'bg-emerald-500/18',     text: 'text-emerald-300',        bar: 'bg-emerald-400',
    shadow: 'shadow-[0_0_22px_rgba(52,211,153,0.4)]',
  },
  {
    type: 'TRAIN'   as ActionType, label: 'Agilidad',  icon: '⚡',  statKey: 'agility'   as const,
    borderIdle: 'border-amber-500/20',   bgIdle: 'bg-amber-500/6',    textIdle: 'text-amber-400/50',   barIdle: 'bg-amber-500/30',
    borderSpin: 'border-amber-500/35',   bgSpin: 'bg-amber-500/10',   textSpin: 'text-amber-400/80',   barSpin: 'bg-amber-400/60',
    border: 'border-amber-500/60',       bg: 'bg-amber-500/18',       text: 'text-amber-300',          bar: 'bg-amber-400',
    shadow: 'shadow-[0_0_22px_rgba(251,191,36,0.4)]',
  },
  {
    type: 'EXPLORE' as ActionType, label: 'Instinto',  icon: '🌌',  statKey: 'instinct'  as const,
    borderIdle: 'border-blue-500/20',    bgIdle: 'bg-blue-500/6',     textIdle: 'text-blue-400/50',    barIdle: 'bg-blue-500/30',
    borderSpin: 'border-blue-500/35',    bgSpin: 'bg-blue-500/10',    textSpin: 'text-blue-400/80',    barSpin: 'bg-blue-400/60',
    border: 'border-blue-500/60',        bg: 'bg-blue-500/18',        text: 'text-blue-300',           bar: 'bg-blue-400',
    shadow: 'shadow-[0_0_22px_rgba(96,165,250,0.4)]',
  },
  {
    type: 'SOCIAL'  as ActionType, label: 'Carisma',   icon: '✨',  statKey: 'charisma'  as const,
    borderIdle: 'border-pink-500/20',    bgIdle: 'bg-pink-500/6',     textIdle: 'text-pink-400/50',    barIdle: 'bg-pink-500/30',
    borderSpin: 'border-pink-500/35',    bgSpin: 'bg-pink-500/10',    textSpin: 'text-pink-400/80',    barSpin: 'bg-pink-400/60',
    border: 'border-pink-500/60',        bg: 'bg-pink-500/18',        text: 'text-pink-300',           bar: 'bg-pink-400',
    shadow: 'shadow-[0_0_22px_rgba(244,114,182,0.4)]',
  },
] as const

export interface ActionResultData {
  therian: TherianDTO
  narrative: string
  delta: { stat: string; amount: number; xp: number }
  goldEarned: number
  actionType: ActionType
  levelUp?: boolean
  userLevel?: number
}

interface Props {
  therian: TherianDTO
  onSpinStart: () => void
  onAction: (data: ActionResultData) => void
  onError: (err: string, nextActionAt?: string) => void
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function DailyActionButtons({ therian, onSpinStart, onAction, onError }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [highlighted, setHighlighted] = useState<number | null>(null)
  const [winner, setWinner] = useState<number | null>(null)
  const cancelRef = useRef(false)
  const apiDoneRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiResultRef = useRef<{ ok: boolean; data: any } | null>(null)

  const handleSpin = async () => {
    if (spinning || !therian.canAct || therian.actionsMaxed) return

    setSpinning(true)
    setWinner(null)
    setHighlighted(0)
    cancelRef.current = false
    apiDoneRef.current = false
    apiResultRef.current = null
    onSpinStart()

    // Fire API call — server picks the random action
    fetch('/api/therian/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therianId: therian.id }),
    })
      .then(async r => {
        const data = await r.json()
        apiResultRef.current = { ok: r.ok, data }
        apiDoneRef.current = true
      })
      .catch(() => {
        apiResultRef.current = { ok: false, data: { error: 'Error de conexión.' } }
        apiDoneRef.current = true
      })

    // Phase 1: Fast spin — keep cycling until min duration AND API responded
    let curIdx = 0
    let t = 0
    const MIN_FAST_MS = 3000

    while (t < MIN_FAST_MS || !apiDoneRef.current) {
      if (cancelRef.current) { setSpinning(false); return }
      setHighlighted(curIdx)
      const progress = Math.min(t / MIN_FAST_MS, 1)
      const interval = Math.round(65 + 130 * progress * progress) // 65ms → 195ms
      await sleep(interval)
      t += interval
      curIdx = (curIdx + 1) % 4
    }

    if (cancelRef.current) { setSpinning(false); return }

    const result = apiResultRef.current!
    if (!result.ok) {
      setSpinning(false)
      setHighlighted(null)
      const data = result.data
      if (data?.error === 'COOLDOWN_ACTIVE') {
        onError('Tu Therian necesita descansar.', data.nextActionAt)
      } else if (data?.error === 'MAX_ACTIONS_REACHED') {
        onError('Usos agotados.')
      } else {
        onError(data?.error ?? 'Algo salió mal.')
      }
      return
    }

    const winnerIndex = SLOTS.findIndex(s => s.type === result.data.actionType)

    // Phase 2: Slow-down sequence — last highlighted slot must be winnerIndex
    // stepsNeeded is chosen so: (curIdx + stepsNeeded - 1) % 4 == winnerIndex
    let stepsNeeded = ((winnerIndex - curIdx + 1) + 4) % 4
    while (stepsNeeded < 5) stepsNeeded += 4 // ensure at least 5 slow steps

    for (let s = 0; s < stepsNeeded; s++) {
      if (cancelRef.current) { setSpinning(false); return }
      setHighlighted(curIdx)
      const progress = stepsNeeded <= 1 ? 1 : s / (stepsNeeded - 1)
      const interval = Math.round(180 + 520 * progress * progress) // 180ms → 700ms
      await sleep(interval)
      curIdx = (curIdx + 1) % 4
    }

    if (cancelRef.current) { setSpinning(false); return }

    // Land on winner
    setHighlighted(winnerIndex)
    setWinner(winnerIndex)
    await sleep(600)

    if (cancelRef.current) { setSpinning(false); return }

    setSpinning(false)
    setHighlighted(null)
    setWinner(null)
    onAction(result.data)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(() => {
          const maxGain = Math.max(1, ...SLOTS.map(s => therian.actionGains[s.type] ?? 0))
          return SLOTS.map((slot, i) => {
            const isHighlighted = highlighted === i
            const isWinner = winner === i
            const hasWinner = winner !== null

            const borderClass = isHighlighted ? slot.border : spinning ? slot.borderSpin : slot.borderIdle
            const bgClass     = isHighlighted ? slot.bg     : spinning ? slot.bgSpin     : slot.bgIdle
            const textClass   = isHighlighted ? slot.text   : spinning ? slot.textSpin   : slot.textIdle
            const barClass    = isHighlighted ? slot.bar    : spinning ? slot.barSpin    : slot.barIdle
            const dur = isHighlighted ? '60ms' : '150ms'
            const gained = therian.actionGains[slot.type] ?? 0
            const barPct = Math.round((gained / maxGain) * 100)

            return (
              <div
                key={slot.type}
                className={[
                  'relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all',
                  borderClass, bgClass,
                  isHighlighted ? `scale-105 ${slot.shadow}` : '',
                  hasWinner && !isWinner ? 'opacity-25' : '',
                ].join(' ')}
                style={{ transitionDuration: dur }}
              >
                <span className={`text-xl transition-transform ${isHighlighted ? 'scale-110' : ''}`}
                  style={{ transitionDuration: dur }}>
                  {slot.icon}
                </span>
                <span className={`text-xs font-semibold transition-colors ${textClass}`}
                  style={{ transitionDuration: dur }}>
                  +1 {slot.label}
                </span>
                {/* total gained + relative bar */}
                <div className="w-full space-y-0.5 mt-0.5">
                  <div className="text-center">
                    <span className={`text-[10px] font-mono font-bold transition-colors ${textClass}`}
                      style={{ transitionDuration: dur }}>
                      {gained > 0 ? `+${gained}` : '—'}
                    </span>
                  </div>
                  <div className="w-full h-[3px] rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barClass}`}
                      style={{ width: `${barPct}%`, transitionDuration: dur }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        })()}
      </div>

      {therian.actionsMaxed ? (
        <div className="py-2.5 rounded-xl text-center text-white/30 text-sm border border-white/5 bg-white/3">
          Usos agotados por hoy
        </div>
      ) : therian.canAct ? (
        <button
          onClick={handleSpin}
          disabled={spinning}
          className="w-full py-3 rounded-xl font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {spinning ? '✨ Templando...' : '🌿 Templar'}
        </button>
      ) : null}
    </div>
  )
}
