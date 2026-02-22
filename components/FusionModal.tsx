'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { TherianDTO } from '@/lib/therian-dto'
import type { Rarity } from '@/lib/generation/engine'
import TherianAvatar from './TherianAvatar'
import RarityBadge from './RarityBadge'

interface Props {
  therians: TherianDTO[]
  onClose: () => void
  onSuccess: () => void
}

type Phase = 'select' | 'fusing' | 'result'

const RARITY_LABEL: Record<string, string> = {
  COMMON: 'Común', UNCOMMON: 'Poco común', RARE: 'Raro',
  EPIC: 'Épico', LEGENDARY: 'Legendario', MYTHIC: 'Mítico',
}
const RARITY_NEXT_LABEL: Record<string, string> = {
  COMMON: 'Poco común', UNCOMMON: 'Raro', RARE: 'Épico',
  EPIC: 'Legendario', LEGENDARY: 'Mítico',
}
const SUCCESS_RATE: Record<string, number> = {
  COMMON: 100, UNCOMMON: 70, RARE: 50, EPIC: 20, LEGENDARY: 5,
}
const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-emerald-400', RARE: 'text-blue-400',
  EPIC: 'text-purple-400', LEGENDARY: 'text-amber-400', MYTHIC: 'text-red-400',
}
const RARITY_BORDER: Record<string, string> = {
  COMMON: 'border-gray-500/50', UNCOMMON: 'border-emerald-500/50', RARE: 'border-blue-500/50',
  EPIC: 'border-purple-500/60', LEGENDARY: 'border-amber-500/60', MYTHIC: 'border-red-500/60',
}
const RARITY_BG: Record<string, string> = {
  COMMON: 'bg-gray-500/10', UNCOMMON: 'bg-emerald-500/10', RARE: 'bg-blue-500/10',
  EPIC: 'bg-purple-500/10', LEGENDARY: 'bg-amber-500/10', MYTHIC: 'bg-red-500/10',
}

const PROB_ROWS = [
  { from: 'COMMON',    to: 'UNCOMMON',  pct: 100, fromColor: 'text-gray-400',    toColor: 'text-emerald-400' },
  { from: 'UNCOMMON',  to: 'RARE',      pct: 70,  fromColor: 'text-emerald-400', toColor: 'text-blue-400' },
  { from: 'RARE',      to: 'EPIC',      pct: 50,  fromColor: 'text-blue-400',    toColor: 'text-purple-400' },
  { from: 'EPIC',      to: 'LEGENDARY', pct: 20,  fromColor: 'text-purple-400',  toColor: 'text-amber-400' },
  { from: 'LEGENDARY', to: 'MYTHIC',    pct: 5,   fromColor: 'text-amber-400',   toColor: 'text-red-400' },
]

// Fuseable = all except MYTHIC
const FUSEABLE_RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
const RARITY_SORT_ORDER = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']

export default function FusionModal({ therians, onClose, onSuccess }: Props) {
  const [localTherians, setLocalTherians] = useState<TherianDTO[]>(therians)
  const [slots, setSlots] = useState<(TherianDTO | null)[]>([null, null, null])
  const [phase, setPhase] = useState<Phase>('select')
  const [result, setResult] = useState<{ success: boolean; therian: TherianDTO; successRate: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showProbs, setShowProbs] = useState(false)
  const [hasFused, setHasFused] = useState(false)

  // Derive selected rarity from first filled slot
  const selectedRarity = slots.find(s => s !== null)?.rarity ?? null
  const filledCount = slots.filter(Boolean).length
  const canFuse = filledCount === 3

  // Selector: show fuseable therians, filter by selectedRarity if set, sort by rarity desc
  const selectorTherians = localTherians
    .filter(t => {
      if (!FUSEABLE_RARITIES.includes(t.rarity)) return false
      if (selectedRarity && t.rarity !== selectedRarity) return false
      return true
    })
    .sort((a, b) => RARITY_SORT_ORDER.indexOf(a.rarity) - RARITY_SORT_ORDER.indexOf(b.rarity))
  const selectedIds = slots.filter(Boolean).map(s => s!.id)

  function addToSlot(therian: TherianDTO) {
    if (selectedIds.includes(therian.id)) return
    const nextEmpty = slots.findIndex(s => s === null)
    if (nextEmpty === -1) return
    const newSlots = [...slots]
    newSlots[nextEmpty] = therian
    setSlots(newSlots)
  }

  function removeFromSlot(index: number) {
    const newSlots = [...slots]
    newSlots[index] = null
    // Compact: move nulls to end
    const filled = newSlots.filter(Boolean) as TherianDTO[]
    setSlots([...filled, ...Array(3 - filled.length).fill(null)])
  }

  async function handleFuse() {
    if (!canFuse) return
    setPhase('fusing')
    setError(null)
    try {
      const res = await fetch('/api/therian/fuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therianIds: slots.map(s => s!.id) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al fusionar.')
        setPhase('select')
        return
      }
      setResult({ success: data.success, therian: data.therian, successRate: data.successRate * 100 })
      setHasFused(true)
      setPhase('result')
      // Refetch fresh therians list so the selector stays up to date
      fetch('/api/therians/mine')
        .then(r => r.ok ? r.json() : null)
        .then(fresh => { if (fresh) setLocalTherians(fresh) })
        .catch(() => {})
    } catch {
      setError('Error de conexión.')
      setPhase('select')
    }
  }

  function handleClose() {
    if (hasFused) onSuccess()
    else onClose()
  }

  const rate = selectedRarity ? SUCCESS_RATE[selectedRarity] ?? 0 : null
  const hasFuseableGroup = FUSEABLE_RARITIES.some(
    r => localTherians.filter(t => t.rarity === r).length >= 3
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#13131F] shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">⚗️</span>
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">Fusión de Therians</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Probabilities toggle */}
            <button
              onClick={() => setShowProbs(p => !p)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                showProbs
                  ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                  : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
              title="Ver probabilidades"
            >
              % prob
            </button>
            <button
              onClick={handleClose}
              className="text-white/30 hover:text-white/70 text-xl leading-none transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ─── PROBABILITIES PANEL ─── */}
        {showProbs && (
          <div className="mx-5 mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 flex-shrink-0">
            <p className="text-purple-300/70 text-[10px] uppercase tracking-widest mb-2">Probabilidades de fusión</p>
            <div className="space-y-1">
              {PROB_ROWS.map(row => (
                <div key={row.from} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold ${row.fromColor}`}>{RARITY_LABEL[row.from]}</span>
                    <span className="text-white/25">→</span>
                    <span className={`font-semibold ${row.toColor}`}>{RARITY_LABEL[row.to]}</span>
                  </div>
                  <span className="font-mono font-bold text-white">{row.pct}%</span>
                </div>
              ))}
            </div>
            <p className="text-white/25 text-[10px] mt-2 italic">En caso de fallo, se obtiene un Therian aleatorio de la misma rareza.</p>
          </div>
        )}

        {/* ─── SELECT PHASE ─── */}
        {phase === 'select' && (
          <>
            {/* Instructions */}
            <div className="px-5 pt-3 pb-2 flex-shrink-0">
              <p className="text-[#8B84B0] text-xs leading-relaxed">
                Coloca <span className="text-white font-semibold">3 Therians de la misma rareza</span> en los slots.
                Los 3 se consumen independientemente del resultado.
              </p>
            </div>

            {/* Main split layout */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

              {/* LEFT: Slots + action */}
              <div className="w-[45%] flex flex-col px-4 py-3 gap-3 flex-shrink-0">
                {/* 3 slots */}
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    onClick={() => slot && removeFromSlot(i)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all min-h-[64px] ${
                      slot
                        ? `${RARITY_BORDER[slot.rarity]} ${RARITY_BG[slot.rarity]} cursor-pointer hover:opacity-70`
                        : 'border-dashed border-white/15 bg-white/2 cursor-default'
                    }`}
                  >
                    {slot ? (
                      <>
                        <TherianAvatar therian={slot} size={40} animated={false} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate leading-tight">{slot.name ?? slot.species.name}</p>
                          <p className={`text-[10px] font-semibold ${RARITY_COLOR[slot.rarity]}`}>{RARITY_LABEL[slot.rarity]}</p>
                        </div>
                        <span className="text-white/20 text-xs flex-shrink-0">✕</span>
                      </>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center gap-1 py-1">
                        <span className="text-white/15 text-xl">+</span>
                        <span className="text-white/20 text-[10px]">Slot {i + 1}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Rarity info */}
                {selectedRarity && (
                  <div className="rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs space-y-0.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`font-semibold ${RARITY_COLOR[selectedRarity]}`}>{RARITY_LABEL[selectedRarity]}</span>
                      <span className="text-white/30">→</span>
                      <span className={`font-semibold ${RARITY_COLOR[RARITY_NEXT_LABEL[selectedRarity] ? Object.entries(RARITY_LABEL).find(([,v]) => v === RARITY_NEXT_LABEL[selectedRarity])?.[0] ?? '' : '']}`}>
                        {RARITY_NEXT_LABEL[selectedRarity]}
                      </span>
                    </div>
                    <p className="text-white/50 font-mono font-bold">{rate}% éxito</p>
                  </div>
                )}

                {/* Error */}
                {error && <p className="text-red-400 text-xs italic">{error}</p>}

                {/* Fuse button */}
                <button
                  onClick={handleFuse}
                  disabled={!canFuse}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                    canFuse
                      ? 'bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 text-white shadow-[0_0_16px_rgba(155,89,182,0.3)]'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  {canFuse ? `⚗️ Fusionar` : `${filledCount}/3 seleccionados`}
                </button>
              </div>

              {/* Divider */}
              <div className="border-l border-white/5 flex-shrink-0" />

              {/* RIGHT: Therian selector */}
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-[#8B84B0] text-[10px] uppercase tracking-widest px-4 pt-3 pb-2 flex-shrink-0">
                  {selectedRarity
                    ? `Therians ${RARITY_LABEL[selectedRarity]}`
                    : 'Seleccionar'}
                </p>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                  {selectorTherians.length === 0 ? (
                    <div className="py-8 text-center text-[#4A4468] text-xs italic px-2">
                      {!hasFuseableGroup
                        ? 'Necesitas al menos 3 Therians de la misma rareza para fusionar.'
                        : selectedRarity
                        ? `No hay más Therians ${RARITY_LABEL[selectedRarity]} disponibles.`
                        : 'Sin Therians disponibles.'
                      }
                    </div>
                  ) : (
                    selectorTherians.map(t => {
                      const isSelected = selectedIds.includes(t.id)
                      return (
                        <button
                          key={t.id}
                          onClick={() => !isSelected && addToSlot(t)}
                          disabled={isSelected}
                          className={`w-full flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                            isSelected
                              ? `${RARITY_BORDER[t.rarity]} ${RARITY_BG[t.rarity]} opacity-35 cursor-not-allowed`
                              : `${RARITY_BORDER[t.rarity]} ${RARITY_BG[t.rarity]} hover:opacity-80 cursor-pointer`
                          }`}
                        >
                          <TherianAvatar therian={t} size={36} animated={false} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate leading-tight">{t.name ?? t.species.name}</p>
                            <p className={`text-[10px] font-semibold ${RARITY_COLOR[t.rarity]}`}>{t.species.emoji} {t.species.name} · Nv {t.level}</p>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] text-white/30 flex-shrink-0">en slot</span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── FUSING PHASE ─── */}
        {phase === 'fusing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
              <div className="absolute inset-3 rounded-full border-2 border-purple-400/40 animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute inset-0 flex items-center justify-center text-4xl">⚗️</div>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Fusionando...</p>
              <p className="text-[#8B84B0] text-xs mt-1 italic">Las esencias se combinan</p>
            </div>
          </div>
        )}

        {/* ─── RESULT PHASE ─── */}
        {phase === 'result' && result && (
          <div className="flex flex-col px-5 pb-6 pt-4 gap-4 overflow-y-auto">
            {result.success ? (
              <div className="text-center py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-emerald-400 font-black text-lg tracking-widest uppercase">✦ ¡Fusión exitosa!</p>
                <p className="text-emerald-300/60 text-xs mt-0.5">
                  Obtuviste un Therian <span className={`font-semibold ${RARITY_COLOR[result.therian.rarity]}`}>{RARITY_LABEL[result.therian.rarity]}</span>
                </p>
              </div>
            ) : (
              <div className="text-center py-3 rounded-xl border border-red-500/20 bg-red-500/5">
                <p className="text-red-400 font-bold text-base tracking-widest uppercase">✗ Fusión fallida</p>
                <p className="text-red-300/60 text-xs mt-0.5">
                  Probabilidad era {result.successRate}% — Therian de la misma rareza obtenido
                </p>
              </div>
            )}

            <div className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{result.therian.name ?? result.therian.species.name}</p>
                  <p className="text-[#8B84B0] text-xs">{result.therian.species.emoji} {result.therian.species.name} · {result.therian.trait.name}</p>
                </div>
                <RarityBadge rarity={result.therian.rarity} size="sm" />
              </div>
              <div className="flex justify-center py-2">
                <TherianAvatar therian={result.therian} size={140} animated />
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                {(Object.entries(result.therian.stats) as [string, number][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between bg-white/3 rounded-lg px-3 py-1.5">
                    <span className="text-[#8B84B0]">
                      {k === 'vitality' ? '🌿' : k === 'agility' ? '⚡' : k === 'instinct' ? '🌌' : '✨'}
                    </span>
                    <span className="text-white font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSlots([null, null, null])
                  setResult(null)
                  setError(null)
                  setPhase('select')
                }}
                className="flex-1 py-3 rounded-xl font-bold text-sm border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
              >
                ⚗️ Fusionar otra vez
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 text-white transition-all"
              >
                Ver mis Therians →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
