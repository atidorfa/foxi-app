'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { TherianDTO } from '@/lib/therian-dto'
import type { InventoryItemDTO } from '@/app/api/inventory/route'
import type { Rarity } from '@/lib/generation/engine'
import TherianAvatar from './TherianAvatar'
import RarityBadge from './RarityBadge'

// ─── Types ───────────────────────────────────────────────────────────────────
type EggSlot = {
  kind: 'egg'
  itemId: string
  rarity: string
  name: string
  emoji: string
  availableQty: number
}
type TherianSlot = TherianDTO & { kind: 'therian' }
type FusionSlot = TherianSlot | EggSlot | null

interface Props {
  therians: TherianDTO[]
  inventory: InventoryItemDTO[]
  onClose: () => void
  onSuccess: () => void
}

type Phase = 'select' | 'fusing' | 'result'

// ─── Constants ───────────────────────────────────────────────────────────────
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
const FUSEABLE_RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
const RARITY_SORT_ORDER = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']

export default function FusionModal({ therians, inventory, onClose, onSuccess }: Props) {
  const [localTherians, setLocalTherians] = useState<TherianDTO[]>(therians)
  const [localInventory, setLocalInventory] = useState<InventoryItemDTO[]>(inventory)
  const [slots, setSlots] = useState<FusionSlot[]>([null, null, null])
  const [phase, setPhase] = useState<Phase>('select')
  const [result, setResult] = useState<{ success: boolean; therian: TherianDTO; successRate: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showProbs, setShowProbs] = useState(false)
  const [hasFused, setHasFused] = useState(false)

  // ─── Derived state ────────────────────────────────────────────────────────
  const selectedRarity = slots.find(s => s !== null)?.rarity ?? null
  const filledCount = slots.filter(Boolean).length
  const canFuse = filledCount === 3

  // IDs of therians already in slots
  const selectedTherianIds = slots.filter(s => s?.kind === 'therian').map(s => (s as TherianSlot).id)
  // Count of each egg itemId used in slots
  const usedEggCounts: Record<string, number> = {}
  slots.filter(s => s?.kind === 'egg').forEach(s => {
    const egg = s as EggSlot
    usedEggCounts[egg.itemId] = (usedEggCounts[egg.itemId] ?? 0) + 1
  })

  // Selector therians
  const selectorTherians = localTherians
    .filter(t => {
      if (!FUSEABLE_RARITIES.includes(t.rarity)) return false
      if (selectedRarity && t.rarity !== selectedRarity) return false
      return true
    })
    .sort((a, b) => RARITY_SORT_ORDER.indexOf(a.rarity) - RARITY_SORT_ORDER.indexOf(b.rarity))

  // Selector eggs: inventory eggs with qty > used
  const selectorEggs: EggSlot[] = localInventory
    .filter(item => {
      if (item.type !== 'EGG') return false
      if (!FUSEABLE_RARITIES.includes(item.rarity)) return false
      if (selectedRarity && item.rarity !== selectedRarity) return false
      const remaining = item.quantity - (usedEggCounts[item.itemId] ?? 0)
      return remaining > 0
    })
    .sort((a, b) => RARITY_SORT_ORDER.indexOf(a.rarity) - RARITY_SORT_ORDER.indexOf(b.rarity))
    .map(item => ({
      kind: 'egg' as const,
      itemId: item.itemId,
      rarity: item.rarity,
      name: item.name,
      emoji: item.emoji,
      availableQty: item.quantity - (usedEggCounts[item.itemId] ?? 0),
    }))

  const hasFuseableGroup = FUSEABLE_RARITIES.some(r => {
    const therianCount = localTherians.filter(t => t.rarity === r).length
    const eggCount = localInventory
      .filter(i => i.type === 'EGG' && i.rarity === r)
      .reduce((s, i) => s + i.quantity, 0)
    return therianCount + eggCount >= 3
  })

  // ─── Auto-fill ────────────────────────────────────────────────────────────
  function handleAutoFill() {
    // Find highest fuseable rarity with 3+ items total (eggs + therians)
    const bestRarity = [...FUSEABLE_RARITIES].reverse().find(r => {
      const therianCount = localTherians.filter(t => t.rarity === r).length
      const eggCount = localInventory
        .filter(i => i.type === 'EGG' && i.rarity === r)
        .reduce((s, i) => s + i.quantity, 0)
      return therianCount + eggCount >= 3
    })
    if (!bestRarity) return

    // Build egg pool for this rarity (track remaining qty)
    const eggPool = localInventory
      .filter(i => i.type === 'EGG' && i.rarity === bestRarity && i.quantity > 0)
      .map(i => ({ itemId: i.itemId, rarity: i.rarity, name: i.name, emoji: i.emoji, remaining: i.quantity }))

    const therianPool = localTherians.filter(t => t.rarity === bestRarity)

    const newSlots: FusionSlot[] = []
    let therianIdx = 0
    for (let i = 0; i < 3; i++) {
      // Prioritize eggs first
      const egg = eggPool.find(e => e.remaining > 0)
      if (egg) {
        newSlots.push({ kind: 'egg', itemId: egg.itemId, rarity: egg.rarity, name: egg.name, emoji: egg.emoji, availableQty: egg.remaining })
        egg.remaining--
      } else if (therianIdx < therianPool.length) {
        newSlots.push({ ...therianPool[therianIdx], kind: 'therian' })
        therianIdx++
      }
    }
    setSlots([...newSlots, ...Array(3 - newSlots.length).fill(null)])
  }

  // ─── Slot management ──────────────────────────────────────────────────────
  function addTherian(t: TherianDTO) {
    if (selectedTherianIds.includes(t.id)) return
    const nextEmpty = slots.findIndex(s => s === null)
    if (nextEmpty === -1) return
    const newSlots = [...slots]
    newSlots[nextEmpty] = { ...t, kind: 'therian' }
    setSlots(newSlots)
  }

  function addEgg(egg: EggSlot) {
    const nextEmpty = slots.findIndex(s => s === null)
    if (nextEmpty === -1) return
    const newSlots = [...slots]
    newSlots[nextEmpty] = egg
    setSlots(newSlots)
  }

  function removeFromSlot(index: number) {
    const newSlots = [...slots]
    newSlots[index] = null
    const filled = newSlots.filter(Boolean) as FusionSlot[]
    setSlots([...filled, ...Array(3 - filled.length).fill(null)])
  }

  // ─── Fusion ───────────────────────────────────────────────────────────────
  async function handleFuse() {
    if (!canFuse) return
    setPhase('fusing')
    setError(null)
    try {
      const therianIds = slots
        .filter(s => s?.kind === 'therian')
        .map(s => (s as TherianSlot).id)

      const eggItems = slots.filter(s => s?.kind === 'egg') as EggSlot[]
      const eggCountMap: Record<string, number> = {}
      eggItems.forEach(e => { eggCountMap[e.itemId] = (eggCountMap[e.itemId] ?? 0) + 1 })
      const eggUses = Object.entries(eggCountMap).map(([itemId, qty]) => ({ itemId, qty }))

      const res = await fetch('/api/therian/fuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therianIds, eggUses }),
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
      // Refresh both therians and inventory
      Promise.all([
        fetch('/api/therians/mine').then(r => r.ok ? r.json() : null),
        fetch('/api/inventory').then(r => r.ok ? r.json() : null),
      ]).then(([therianData, invData]) => {
        if (therianData) setLocalTherians(therianData)
        if (invData) setLocalInventory(invData.items)
      }).catch(() => {})
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

  // ─── Render ───────────────────────────────────────────────────────────────
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
            {phase === 'select' && hasFuseableGroup && (
              <button
                onClick={handleAutoFill}
                className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all"
              >
                ✦ Auto-colocar
              </button>
            )}
            <button
              onClick={() => setShowProbs(p => !p)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                showProbs
                  ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                  : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
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
            <div className="px-5 pt-3 pb-2 flex-shrink-0">
              <p className="text-[#8B84B0] text-xs leading-relaxed">
                Combina <span className="text-white font-semibold">3 elementos de la misma rareza</span> (Therians y/o Huevos).
                Todo se consume independientemente del resultado.
              </p>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">

              {/* LEFT: Slots + action */}
              <div className="w-[45%] flex flex-col px-4 py-3 gap-3 flex-shrink-0">
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
                      slot.kind === 'egg' ? (
                        <>
                          <span className="text-3xl leading-none flex-shrink-0">{slot.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate leading-tight">{slot.name}</p>
                            <p className={`text-[10px] font-semibold ${RARITY_COLOR[slot.rarity]}`}>{RARITY_LABEL[slot.rarity]}</p>
                          </div>
                          <span className="text-white/20 text-xs flex-shrink-0">✕</span>
                        </>
                      ) : (
                        <>
                          <TherianAvatar therian={slot} size={40} animated={false} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate leading-tight">{slot.name ?? 'Sin nombre'}</p>
                            <p className={`text-[10px] font-semibold ${RARITY_COLOR[slot.rarity]}`}>{RARITY_LABEL[slot.rarity]}</p>
                          </div>
                          <span className="text-white/20 text-xs flex-shrink-0">✕</span>
                        </>
                      )
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
                      <span className={`font-semibold ${RARITY_COLOR[Object.entries(RARITY_LABEL).find(([,v]) => v === RARITY_NEXT_LABEL[selectedRarity])?.[0] ?? '']}`}>
                        {RARITY_NEXT_LABEL[selectedRarity]}
                      </span>
                    </div>
                    <p className="text-white/50 font-mono font-bold">{rate}% éxito</p>
                  </div>
                )}

                {error && <p className="text-red-400 text-xs italic">{error}</p>}

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

              {/* RIGHT: Selector */}
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-[#8B84B0] text-[10px] uppercase tracking-widest px-4 pt-3 pb-2 flex-shrink-0">
                  {selectedRarity ? `Therians ${RARITY_LABEL[selectedRarity]}` : 'Seleccionar'}
                </p>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                  {selectorTherians.length === 0 && selectorEggs.length === 0 ? (
                    <div className="py-8 text-center text-[#4A4468] text-xs italic px-2">
                      {!hasFuseableGroup
                        ? 'Necesitas al menos 3 elementos de la misma rareza (Therians + Huevos) para fusionar.'
                        : selectedRarity
                        ? `No hay más ${RARITY_LABEL[selectedRarity]} disponibles.`
                        : 'Sin elementos disponibles.'}
                    </div>
                  ) : (
                    <>
                      {/* Therians */}
                      {selectorTherians.map(t => {
                        const isSelected = selectedTherianIds.includes(t.id)
                        return (
                          <button
                            key={t.id}
                            onClick={() => !isSelected && addTherian(t)}
                            disabled={isSelected}
                            className={`w-full flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                              isSelected
                                ? `${RARITY_BORDER[t.rarity]} ${RARITY_BG[t.rarity]} opacity-35 cursor-not-allowed`
                                : `${RARITY_BORDER[t.rarity]} ${RARITY_BG[t.rarity]} hover:opacity-80 cursor-pointer`
                            }`}
                          >
                            <TherianAvatar therian={t} size={36} animated={false} />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-semibold truncate leading-tight">{t.name ?? 'Sin nombre'}</p>
                              <p className={`text-[10px] font-semibold ${RARITY_COLOR[t.rarity]}`}>Nv {t.level}</p>
                            </div>
                            {isSelected && <span className="text-[10px] text-white/30 flex-shrink-0">en slot</span>}
                          </button>
                        )
                      })}

                      {/* Eggs divider */}
                      {selectorEggs.length > 0 && (
                        <>
                          {selectorTherians.length > 0 && (
                            <div className="flex items-center gap-2 py-1">
                              <div className="flex-1 border-t border-white/5" />
                              <span className="text-[10px] text-white/25 uppercase tracking-widest">Huevos</span>
                              <div className="flex-1 border-t border-white/5" />
                            </div>
                          )}
                          {selectorEggs.map(egg => (
                            <button
                              key={egg.itemId}
                              onClick={() => addEgg(egg)}
                              className={`w-full flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${RARITY_BORDER[egg.rarity]} ${RARITY_BG[egg.rarity]} hover:opacity-80 cursor-pointer`}
                            >
                              <span className="text-2xl leading-none flex-shrink-0">{egg.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-semibold truncate leading-tight">{egg.name}</p>
                                <p className={`text-[10px] font-semibold ${RARITY_COLOR[egg.rarity]}`}>{RARITY_LABEL[egg.rarity]} · Huevo de fusión</p>
                              </div>
                              <span className="text-white/50 text-xs font-mono font-bold flex-shrink-0">×{egg.availableQty}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </>
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
                  <p className="text-white font-bold">{result.therian.name ?? 'Sin nombre'}</p>
                  <p className="text-[#8B84B0] text-xs">{result.therian.trait.name}</p>
                </div>
                <RarityBadge rarity={result.therian.rarity as Rarity} size="sm" />
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
