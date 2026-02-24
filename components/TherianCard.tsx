'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { TherianDTO } from '@/lib/therian-dto'
import type { BattleResult } from '@/lib/battle/engine'
import TherianAvatar from './TherianAvatar'
import StatBar from './StatBar'
import RarityBadge from './RarityBadge'
import DailyActionButtons from './DailyActionButtons'
import FlavorText from './FlavorText'
import BattleArena from './BattleArena'
import { RUNES, type Rune } from '@/lib/catalogs/runes'
import { TRAITS } from '@/lib/catalogs/traits'
import { ACCESSORY_SLOTS } from '@/lib/items/accessory-slots'
import { SHOP_ITEMS } from '@/lib/shop/catalog'

interface Props {
  therian: TherianDTO
  rank?: number
}

const STAT_CONFIG = [
  { key: 'vitality' as const, label: 'Vitalidad', icon: '🌿', color: 'vitality' },
  { key: 'agility'  as const, label: 'Agilidad',  icon: '⚡', color: 'agility' },
  { key: 'instinct' as const, label: 'Instinto',  icon: '🌌', color: 'instinct' },
  { key: 'charisma' as const, label: 'Carisma',   icon: '✨', color: 'charisma' },
]

function timeRemaining(isoString: string | null): string {
  if (!isoString) return 'Ya disponible'
  const diff = new Date(isoString).getTime() - Date.now()
  if (diff <= 0) return 'Ya disponible'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const RARITY_GLOW: Record<string, string> = {
  COMMON:    'border-white/10',
  UNCOMMON:  'border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.1)]',
  RARE:      'border-blue-500/30 shadow-[0_0_30px_rgba(96,165,250,0.1)]',
  EPIC:      'border-purple-500/40 shadow-[0_0_40px_rgba(192,132,252,0.15)]',
  LEGENDARY: 'border-amber-500/50 shadow-[0_0_50px_rgba(252,211,77,0.2),0_0_100px_rgba(252,211,77,0.05)]',
  MYTHIC:    'border-red-500/60 shadow-[0_0_60px_rgba(239,68,68,0.25),0_0_120px_rgba(239,68,68,0.1)]',
}

export default function TherianCard({ therian: initialTherian, rank }: Props) {
  const [therian, setTherian] = useState(initialTherian)

  // Sync prop changes from parent (e.g. equipping a rune)
  useEffect(() => {
    setTherian(initialTherian)
  }, [initialTherian])
  const [narrative, setNarrative] = useState<string | null>(null)
  const [lastDelta, setLastDelta] = useState<{ stat: string; amount: number } | null>(null)
  const [levelUp, setLevelUp] = useState(false)
  const [showEvolution, setShowEvolution] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [goldEarned, setGoldEarned] = useState<number | null>(null)
  const [showActionPopup, setShowActionPopup] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetConfirming, setResetConfirming] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [equipping, setEquipping] = useState(false)

  // Accessories panel (left side)
  const [showAccessories, setShowAccessories] = useState(false)
  const [selectedAccessorySlot, setSelectedAccessorySlot] = useState<string | null>(null)
  const [equippingAccessory, setEquippingAccessory] = useState(false)
  const [ownedAccessories, setOwnedAccessories] = useState<{ itemId: string; name: string; emoji: string; description: string }[] | null>(null)
  const [loadingAccessories, setLoadingAccessories] = useState(false)

  // Bite popup
  const [showBitePopup, setShowBitePopup] = useState(false)
  const [bitePhase, setBitePhase] = useState<'search' | 'preview' | 'fighting' | 'result'>('search')
  const [searchInput, setSearchInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [targetTherian, setTargetTherian] = useState<TherianDTO | null>(null)
  const [biting, setBiting] = useState(false)
  const [biteError, setBiteError] = useState<string | null>(null)
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null)

  // Escuchar compras desde NavShopButton
  useEffect(() => {
    const handler = (e: Event) => {
      const updated = (e as CustomEvent).detail
      if (updated) setTherian(updated)
    }
    window.addEventListener('therian-updated', handler)
    return () => window.removeEventListener('therian-updated', handler)
  }, [])

  // Re-fetch accessories when inventory changes (e.g. after a purchase)
  useEffect(() => {
    const handler = () => {
      fetch('/api/inventory')
        .then(r => r.ok ? r.json() : { items: [] })
        .then(data => {
          setOwnedAccessories(
            (data.items ?? [])
              .filter((i: { type: string }) => i.type === 'ACCESSORY')
              .map((i: { itemId: string; name: string; emoji: string; description: string }) => ({
                itemId: i.itemId, name: i.name, emoji: i.emoji, description: i.description,
              }))
          )
        })
    }
    window.addEventListener('inventory-updated', handler)
    return () => window.removeEventListener('inventory-updated', handler)
  }, [])

  const openAccessoriesPanel = () => {
    if (!showAccessories && ownedAccessories === null && !loadingAccessories) {
      setLoadingAccessories(true)
      fetch('/api/inventory')
        .then(r => r.ok ? r.json() : { items: [] })
        .then(data => {
          setOwnedAccessories(
            (data.items ?? [])
              .filter((i: { type: string }) => i.type === 'ACCESSORY')
              .map((i: { itemId: string; name: string; emoji: string; description: string }) => ({
                itemId: i.itemId, name: i.name, emoji: i.emoji, description: i.description,
              }))
          )
          setLoadingAccessories(false)
        })
    }
    setShowAccessories(prev => !prev)
  }

  const handleEquipAccessory = async (accessoryId: string | null) => {
    if (!selectedAccessorySlot) return
    setEquippingAccessory(true)
    try {
      const res = await fetch('/api/therian/accessory-equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therianId: therian.id, slotId: selectedAccessorySlot, accessoryId }),
      })
      if (res.ok) {
        const data = await res.json()
        setTherian(data.therian)
        window.dispatchEvent(new CustomEvent('therian-updated', { detail: data.therian }))
        // Refresh inventory: equipped accessories disappear from it, unequipped ones reappear
        window.dispatchEvent(new Event('inventory-updated'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setEquippingAccessory(false)
      setSelectedAccessorySlot(null)
    }
  }

  // Name editing
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(therian.name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaving, setNameSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  // Trigger evolution overlay when therian transitions to level 2
  useEffect(() => {
    if (levelUp && therian.level === 2) {
      setShowEvolution(true)
      const t = setTimeout(() => setShowEvolution(false), 4000)
      return () => clearTimeout(t)
    }
  }, [levelUp, therian.level])

  const handleNameSave = async () => {
    const trimmed = nameInput.trim()
    if (trimmed === therian.name) { setEditingName(false); return }
    setNameSaving(true)
    setNameError(null)
    try {
      const res = await fetch('/api/therian/name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setNameError(data.error ?? 'Error al guardar.'); return }
      setTherian(prev => ({ ...prev, name: data.name }))
      setNameInput(data.name)
      setEditingName(false)
    } catch {
      setNameError('Error de conexión.')
    } finally {
      setNameSaving(false)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSave()
    if (e.key === 'Escape') { setEditingName(false); setNameInput(therian.name ?? ''); setNameError(null) }
  }

  const handleBiteSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = searchInput.trim()
    if (!name) return
    setSearching(true)
    setSearchError(null)
    setTargetTherian(null)
    try {
      const res = await fetch(`/api/therians/search?name=${encodeURIComponent(name)}`)
      if (!res.ok) {
        setSearchError(res.status === 404 ? `No se encontró ningún Therian llamado "${name}".` : 'Error al buscar.')
        return
      }
      setTargetTherian(await res.json())
      setBitePhase('preview')
    } catch {
      setSearchError('Error de conexión.')
    } finally {
      setSearching(false)
    }
  }

  const handleRandom = async () => {
    setSearching(true)
    setSearchError(null)
    setTargetTherian(null)
    try {
      const res = await fetch('/api/therians/random')
      if (!res.ok) { setSearchError('No hay Therians disponibles para retar.'); return }
      setTargetTherian(await res.json())
      setBitePhase('preview')
    } catch {
      setSearchError('Error de conexión.')
    } finally {
      setSearching(false)
    }
  }

  const handleBite = async () => {
    if (!targetTherian) return
    setBiting(true)
    setBiteError(null)
    try {
      const res = await fetch('/api/therian/bite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_name: targetTherian.name, therianId: therian.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          const diff = Math.max(0, new Date(data.nextBiteAt).getTime() - Date.now())
          const h = Math.floor(diff / 3600000)
          const m = Math.floor((diff % 3600000) / 60000)
          setBiteError(`Cooldown activo. Próxima mordida en ${h}h ${m}m.`)
        } else if (data.error === 'CANNOT_BITE_SELF') {
          setBiteError('No puedes morderte a ti mismo.')
        } else {
          setBiteError(data.error ?? 'Algo salió mal.')
        }
        setBiting(false)
        return
      }
      setBattleResult(data.battle)
      setTherian(data.challenger)
      setBitePhase('fighting')
      if (data.goldEarned) {
        setGoldEarned(data.goldEarned)
        window.dispatchEvent(new CustomEvent('wallet-update'))
      }
      window.dispatchEvent(new CustomEvent('therian-updated', { detail: data.challenger }))
    } catch {
      setBiteError('Error de conexión.')
      setBiting(false)
    }
  }

  const handleBiteReset = () => {
    setBitePhase('search')
    setSearchInput('')
    setSearchError(null)
    setBiteError(null)
    setTargetTherian(null)
    setBattleResult(null)
  }

  const handleBiteClose = () => {
    setShowBitePopup(false)
    handleBiteReset()
  }

  const handleActionReset = async () => {
    setResetting(true)
    setResetError(null)
    try {
      const res = await fetch('/api/therian/action-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therianId: therian.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'NOT_ENOUGH_GOLD') setResetError(`Necesitás ${data.required} 🪙 (tenés ${data.current})`)
        else setResetError('Algo salió mal.')
        return
      }
      setTherian(data.therian)
      setResetConfirming(false)
      window.dispatchEvent(new CustomEvent('wallet-update'))
      window.dispatchEvent(new CustomEvent('therian-updated', { detail: data.therian }))
    } catch {
      setResetError('Error de conexión.')
    } finally {
      setResetting(false)
    }
  }

  const handleAction = async (actionType: string) => {
    setError(null)
    setNarrative(null)
    setLastDelta(null)
    setLevelUp(false)

    try {
      const res = await fetch('/api/therian/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType, therianId: therian.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.message ?? 'Tu Therian necesita descansar.')
          setTherian(prev => ({ ...prev, canAct: false, nextActionAt: data.nextActionAt }))
        } else {
          setError('Algo salió mal. Intenta de nuevo.')
        }
        return
      }

      setTherian(data.therian)
      setNarrative(data.narrative)
      setLastDelta(data.delta)
      if (data.levelUp) setLevelUp(true)
      if (data.goldEarned) {
        setGoldEarned(data.goldEarned)
        window.dispatchEvent(new CustomEvent('wallet-update'))
      }
      window.dispatchEvent(new CustomEvent('therian-updated', { detail: data.therian }))
    } catch {
      setError('Error de conexión.')
    }
  }

  const handleEquip = async (runeId: string | null) => {
    if (selectedSlot === null) return
    setEquipping(true)
    try {
      const res = await fetch('/api/therian/runes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex: selectedSlot, runeId, therianId: therian.id }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTherian(updated)
        window.dispatchEvent(new CustomEvent('therian-updated', { detail: updated }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setEquipping(false)
      setSelectedSlot(null)
    }
  }

  const equippedRunesArray: (Rune | null)[] = Array.from({ length: 6 }, (_, i) => {
    const id = therian.equippedRunesIds?.[i]
    return id ? (RUNES.find(r => r.id === id) ?? null) : null
  })

  const xpPct = Math.min(100, (therian.xp / therian.xpToNext) * 100)
  const glowClass = RARITY_GLOW[therian.rarity] ?? RARITY_GLOW.COMMON

  return (
    <div className="relative w-full z-10 flex text-left font-sans group/card">

      {/* Accessories Panel (LEFT) */}
      <div
        className={`absolute top-[2%] bottom-[2%] left-0 w-[90%] z-0 border-y border-l border-white/10 bg-[#0F0F1A] rounded-l-2xl shadow-xl flex items-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          showAccessories ? '-translate-x-[95%]' : '-translate-x-[12px]'
        }`}
      >
        <div className={`w-full p-5 pr-10 flex flex-col justify-center space-y-4 transition-opacity duration-300 ${showAccessories ? 'opacity-100 delay-150' : 'opacity-0 pointer-events-none'}`}>
          <h3 className="text-[#8B84B0] text-xs uppercase tracking-widest font-semibold">
            Accesorios
          </h3>
          {loadingAccessories ? (
            <div className="text-white/20 text-xs text-center py-4">Cargando...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {ACCESSORY_SLOTS.map((slot) => {
                const equippedAccId = therian.equippedAccessories[slot.id]
                // instanceId format: "typeId:uuid" (new) or just "typeId" (legacy)
                const accTypeId = equippedAccId ? (equippedAccId.includes(':') ? equippedAccId.split(':')[0] : equippedAccId) : null
                const accMeta = accTypeId ? SHOP_ITEMS.find(i => i.accessoryId === accTypeId) : null
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedAccessorySlot(slot.id)}
                    className="group border border-white/10 bg-white/3 rounded-xl p-2 text-left hover:border-amber-500/40 hover:bg-amber-950/20 transition-all min-h-[60px] flex flex-col items-start justify-center cursor-pointer"
                  >
                    {equippedAccId && accMeta ? (
                      <div className="text-amber-300 text-[10px] font-bold leading-tight line-clamp-2">
                        {accMeta.emoji} {accMeta.name}
                      </div>
                    ) : (
                      <div className="text-white/25 text-[9px] uppercase tracking-wider group-hover:text-amber-400/50 transition-colors">
                        {slot.emoji} {slot.name}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Toggle arrow button attached to the left edge */}
        <button
          onClick={openAccessoriesPanel}
          className={`absolute top-1/2 -left-7 -translate-y-1/2 w-7 h-16 bg-[#0F0F1A] border-y border-l border-white/10 rounded-l-xl flex items-center justify-center hover:bg-[#1a1a2e] transition-all text-white/50 hover:text-white cursor-pointer shadow-md z-10 ${!showAccessories && 'group-hover/card:-translate-x-1'}`}
        >
          <span className={`transition-transform duration-500 text-[10px] ${showAccessories ? 'rotate-180' : ''}`}>
            ◀
          </span>
        </button>
      </div>

      {/* Side Stats Panel */}
      <div 
        className={`absolute top-[2%] bottom-[2%] right-0 w-[90%] z-0 border-y border-r border-white/10 bg-[#0F0F1A] rounded-r-2xl shadow-xl flex items-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          showStats ? 'translate-x-[95%]' : 'translate-x-[12px]'
        }`}
      >
        <div className={`w-full p-5 pl-10 flex flex-col justify-center space-y-4 transition-opacity duration-300 ${showStats ? 'opacity-100 delay-150' : 'opacity-0 pointer-events-none'}`}>
          <h3 className="text-[#8B84B0] text-xs uppercase tracking-widest font-semibold">
            Runas
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {equippedRunesArray.map((rune, i) => (
              <button
                key={i}
                onClick={() => setSelectedSlot(i)}
                className="group border border-white/10 bg-white/3 rounded-xl p-2 text-left hover:border-purple-500/40 hover:bg-purple-950/20 transition-all min-h-[60px] flex flex-col justify-center cursor-pointer"
              >
                {rune ? (
                  <>
                    <div className="text-purple-300 text-[10px] font-bold leading-tight mb-1 line-clamp-1">{rune.name}</div>
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                      {rune.mod.vitality !== undefined && <span className="text-[9px] text-emerald-400 font-mono">{rune.mod.vitality > 0 ? '+' : ''}{rune.mod.vitality}🌿</span>}
                      {rune.mod.agility !== undefined && <span className="text-[9px] text-yellow-400 font-mono">{rune.mod.agility > 0 ? '+' : ''}{rune.mod.agility}⚡</span>}
                      {rune.mod.instinct !== undefined && <span className="text-[9px] text-blue-400 font-mono">{rune.mod.instinct > 0 ? '+' : ''}{rune.mod.instinct}🌌</span>}
                      {rune.mod.charisma !== undefined && <span className="text-[9px] text-amber-400 font-mono">{rune.mod.charisma > 0 ? '+' : ''}{rune.mod.charisma}✨</span>}
                    </div>
                  </>
                ) : (
                  <div className="text-white/15 text-lg text-center w-full group-hover:text-purple-400/50 transition-colors">+</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle arrow button attached to the right edge */}
        <button
           onClick={() => setShowStats(!showStats)}
           className={`absolute top-1/2 -right-7 -translate-y-1/2 w-7 h-16 bg-[#0F0F1A] border-y border-r border-white/10 rounded-r-xl flex items-center justify-center hover:bg-[#1a1a2e] transition-all text-white/50 hover:text-white cursor-pointer shadow-md z-10 ${!showStats && 'group-hover/card:translate-x-1'}`}
        >
          <span className={`transition-transform duration-500 text-[10px] ${showStats ? 'rotate-180' : ''}`}>
             ▶
          </span>
        </button>
      </div>

      {/* Main Card (Front) */}
      <div className={`
        relative z-10 w-full rounded-2xl border bg-[#13131F]
        ${glowClass} transition-shadow duration-500 shadow-2xl
      `}>
        {/* Fondo decorativo aislante de overflow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="absolute inset-0 opacity-5"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${therian.appearance.paletteColors.primary}, transparent 70%)`,
            }}
          />
        </div>

        <div className="relative p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            {/* Nombre editable */}
            {editingName ? (
              <div className="mb-2 space-y-1.5">
                <p className="text-[#8B84B0] text-[10px] uppercase tracking-widest">Nombrando tu Therian...</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={nameInputRef}
                      value={nameInput}
                      onChange={e => { setNameInput(e.target.value); setNameError(null) }}
                      onKeyDown={handleNameKeyDown}
                      maxLength={24}
                      disabled={nameSaving}
                      className="w-full bg-white/5 border border-purple-500/50 rounded-xl px-3 py-1.5 text-sm text-white outline-none focus:border-purple-400 focus:bg-purple-950/20 transition-all disabled:opacity-50 placeholder-white/20"
                      placeholder="Elige un nombre..."
                      style={{ boxShadow: '0 0 0 0 transparent' }}
                      onFocus={e => (e.target.style.boxShadow = '0 0 14px rgba(168,85,247,0.25)')}
                      onBlur={e => (e.target.style.boxShadow = '0 0 0 0 transparent')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">
                      {nameInput.length}/24
                    </span>
                  </div>
                  <button
                    onClick={handleNameSave}
                    disabled={nameSaving || nameInput.trim().length < 2}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                  >
                    {nameSaving ? '···' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameInput(therian.name ?? ''); setNameError(null) }}
                    className="px-2.5 py-1.5 rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
                {nameError ? (
                  <p className="text-red-400 text-xs pl-1">{nameError}</p>
                ) : (
                  <p className="text-white/20 text-xs pl-1">Enter para guardar · Esc para cancelar</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="group flex items-center gap-1.5 mb-0.5"
                title="Cambiar nombre"
              >
                <span className="text-2xl font-bold text-white">
                  {therian.name ?? 'Sin nombre'}
                </span>
                <span className="opacity-0 group-hover:opacity-60 text-purple-400 text-xs transition-opacity">✎</span>
              </button>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <p className="text-[#8B84B0] text-xs">🔰 Nivel {therian.level}</p>
              <p className="text-[#8B84B0] text-xs">🦷 {therian.bites} mordidas</p>
              {rank !== undefined && (
                <p className="text-[#8B84B0] text-xs">🏆 #{rank}</p>
              )}
            </div>
          </div>
          <RarityBadge rarity={therian.rarity} />
        </div>

        {/* Battle nav links — grid 2 cols: Jaula debajo de Morder, mismo tamaño */}
        <div className="grid grid-cols-2 gap-2">
          {/* Col 1 fila 1: Morder */}
          {therian.canBite ? (
            <button
              onClick={() => setShowBitePopup(true)}
              className="text-center py-2 rounded-lg border border-red-500/30 bg-red-500/8 text-red-300 hover:bg-red-500/15 hover:border-red-500/50 text-sm font-semibold transition-colors"
            >
              ⚔️ Morder
            </button>
          ) : (
            <button
              onClick={() => setShowBitePopup(true)}
              className="group rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-center hover:bg-white/5 transition-colors"
            >
              <p className="text-white/30 text-xs font-semibold leading-none mb-0.5">⚔️ Morder</p>
              <p className="text-white/50 text-xs leading-none group-hover:hidden">
                {therian.nextBiteAt
                  ? new Date(therian.nextBiteAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                  : 'mañana'}
              </p>
              <p className="text-white/70 text-xs leading-none hidden group-hover:block">
                {therian.nextBiteAt ? `Faltan ${timeRemaining(therian.nextBiteAt)}` : 'mañana'}
              </p>
            </button>
          )}

          {/* Col 2 fila 1: Acción */}
          {therian.actionsMaxed ? (
            <button
              onClick={() => setShowActionPopup(true)}
              className="group/templar relative rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-center hover:bg-white/5 hover:border-white/10 transition-colors">
              <p className="text-white/40 text-xs font-semibold leading-none mb-0.5">🌿 Templar</p>
              <p className="text-white/30 text-xs leading-none">10/10 completado</p>
              {/* Tooltip de gains al hover */}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover/templar:opacity-100 transition-opacity duration-200 w-44 rounded-xl border border-white/10 bg-[#0F0F1A]/95 backdrop-blur-sm shadow-xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 text-center">Stats subidos</p>
                {[
                  { type: 'CARE',    label: 'Vitalidad', color: 'text-emerald-400' },
                  { type: 'TRAIN',   label: 'Agilidad',  color: 'text-yellow-400'  },
                  { type: 'EXPLORE', label: 'Instinto',  color: 'text-blue-400'    },
                  { type: 'SOCIAL',  label: 'Carisma',   color: 'text-pink-400'    },
                ].map(({ type, label, color }) => {
                  const gain = therian.actionGains?.[type] ?? 0
                  return (
                    <div key={type} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-white/50">{label}</span>
                      <span className={`font-mono font-bold ${gain > 0 ? color : 'text-white/20'}`}>
                        {gain > 0 ? `+${gain}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowActionPopup(true)}
              className="group/templar relative rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-center hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-colors"
            >
              <p className="text-emerald-400 text-xs font-semibold leading-none mb-0.5">🌿 Templar</p>
              <p className="text-emerald-400/70 text-xs leading-none">{therian.actionsUsed}/10</p>
              {/* Tooltip de gains al hover */}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover/templar:opacity-100 transition-opacity duration-200 w-44 rounded-xl border border-white/10 bg-[#0F0F1A]/95 backdrop-blur-sm shadow-xl p-3">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 text-center">Stats subidos</p>
                {[
                  { type: 'CARE',    label: 'Vitalidad', color: 'text-emerald-400' },
                  { type: 'TRAIN',   label: 'Agilidad',  color: 'text-yellow-400'  },
                  { type: 'EXPLORE', label: 'Instinto',  color: 'text-blue-400'    },
                  { type: 'SOCIAL',  label: 'Carisma',   color: 'text-pink-400'    },
                ].map(({ type, label, color }) => {
                  const gain = therian.actionGains?.[type] ?? 0
                  return (
                    <div key={type} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-white/50">{label}</span>
                      <span className={`font-mono font-bold ${gain > 0 ? color : 'text-white/20'}`}>
                        {gain > 0 ? `+${gain}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </button>
          )}

          {/* Col 1 fila 2: Jaula — mismo tamaño que Morder, exactamente debajo */}
          {therian.level >= 2 ? (
            <Link
              href="/casa"
              className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-center hover:bg-amber-500/15 hover:border-amber-500/50 transition-colors"
            >
              <p className="text-amber-400 text-xs font-semibold leading-none mb-0.5">🏠 Jaula</p>
              <p className="text-amber-400/70 text-xs leading-none">Entrar</p>
            </Link>
          ) : (
            <div className="rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-center opacity-50 cursor-not-allowed">
              <p className="text-white/30 text-xs font-semibold leading-none mb-0.5">🏠 Jaula</p>
              <p className="text-white/30 text-xs leading-none">Nivel 2</p>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <TherianAvatar therian={therian} size={220} animated />
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          {STAT_CONFIG.map((cfg) => (
            <StatBar
              key={cfg.key}
              label={cfg.label}
              icon={cfg.icon}
              value={therian.stats[cfg.key]}
              color={cfg.color}
              delta={lastDelta?.stat === cfg.key ? lastDelta.amount : undefined}
            />
          ))}
          <div className="pt-2 space-y-1">
            <div className="flex justify-between text-xs text-[#8B84B0]">
              <span>XP</span>
              <span className="font-mono">{therian.xp} / {therian.xpToNext}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-700 to-purple-400 rounded-full transition-all duration-1000"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Trait */}
        {(() => {
          return (
            <div className="rounded-xl border border-white/5 bg-white/3 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[#8B84B0] text-xs uppercase tracking-widest">Arquetipo</span>
                <span className="relative group/trait">
                  <span className="text-white font-semibold text-sm cursor-default">{therian.trait.name}</span>
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute top-0 left-full ml-2 z-50 opacity-0 group-hover/trait:opacity-100 transition-opacity duration-200 w-52 rounded-xl border border-white/10 bg-[#0F0F1A]/95 backdrop-blur-sm shadow-xl p-3">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 text-center">Arquetipos</p>
                    <ul className="space-y-1">
                      {TRAITS.map(t => {
                        const isActive = t.id === therian.trait.id
                        return (
                          <li key={t.id} className={`text-xs rounded-lg px-2 py-1 ${isActive ? 'bg-white/8' : 'opacity-50'}`}>
                            <div className="flex items-center justify-between">
                              <span className={isActive ? 'text-white font-semibold' : 'text-white/70'}>{t.name}</span>
                              <span className="flex gap-1.5 font-mono text-[10px]">
                                {t.mod.vitality !== 0 && <span className={t.mod.vitality > 0 ? 'text-emerald-400' : 'text-red-400'}>{t.mod.vitality > 0 ? '+' : ''}{t.mod.vitality}🌿</span>}
                                {t.mod.agility  !== 0 && <span className={t.mod.agility  > 0 ? 'text-yellow-400' : 'text-red-400'}>{t.mod.agility  > 0 ? '+' : ''}{t.mod.agility}⚡</span>}
                                {t.mod.instinct !== 0 && <span className={t.mod.instinct > 0 ? 'text-blue-400'   : 'text-red-400'}>{t.mod.instinct > 0 ? '+' : ''}{t.mod.instinct}🌌</span>}
                                {t.mod.charisma !== 0 && <span className={t.mod.charisma > 0 ? 'text-pink-400'  : 'text-red-400'}>{t.mod.charisma > 0 ? '+' : ''}{t.mod.charisma}✨</span>}
                              </span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    {/* Arrow */}
                    <div className="absolute top-3 right-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-white/10" />
                  </div>
                </span>
              </div>
              <p className="text-[#A99DC0] italic text-sm mt-1">{therian.trait.lore}</p>
            </div>
          )
        })()}



        {/* Adoption date */}
        <p className="text-center text-[#4A4468] text-xs italic">
          Adoptado el {new Date(therian.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

      </div>
      </div>

      {/* Evolution overlay — aparece cuando el Therian pasa a nivel 2 */}
      {showEvolution && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85">
          <div className="relative flex items-center justify-center">
            {/* Anillos de ping concéntricos */}
            <span className="absolute inline-flex h-64 w-64 rounded-full bg-amber-400 opacity-20 animate-ping" />
            <span
              className="absolute inline-flex h-48 w-48 rounded-full bg-amber-400 opacity-15 animate-ping"
              style={{ animationDelay: '0.3s' }}
            />
            <span
              className="absolute inline-flex h-32 w-32 rounded-full bg-amber-400 opacity-10 animate-ping"
              style={{ animationDelay: '0.6s' }}
            />
            {/* Avatar centrado */}
            <div className="relative z-10">
              <TherianAvatar therian={therian} size={240} animated />
            </div>
          </div>
          <div className="mt-10 text-center">
            <p
              className="text-5xl font-bold text-amber-400 tracking-widest uppercase"
              style={{ textShadow: '0 0 20px rgba(252,211,77,0.9), 0 0 60px rgba(252,211,77,0.4)' }}
            >
              ¡EVOLUCIÓN!
            </p>
            <p className="text-amber-300/70 text-sm mt-3">
              Tu Therian ha alcanzado el nivel 2 y ha ganado extremidades
            </p>
            <p className="text-amber-300/40 text-xs mt-1">
              La Jaula ya está disponible
            </p>
          </div>
        </div>
      )}

      {/* Bite popup */}
      {showBitePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleBiteClose}
        >
          <div
            className="bg-[#13131F] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm uppercase tracking-widest">⚔️ Morder</h3>
              <button
                onClick={handleBiteClose}
                className="text-white/30 hover:text-white/70 text-lg leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Cooldown banner */}
            {!therian.canBite && therian.nextBiteAt && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-yellow-300 text-sm text-center">
                ⏳ Próxima mordida en {timeRemaining(therian.nextBiteAt)}
              </div>
            )}

            {/* Search phase */}
            {(bitePhase === 'search' || bitePhase === 'preview') && (
              <form onSubmit={handleBiteSearch} className="space-y-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Nombre del Therian rival..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#4A4468] outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={searching || !searchInput.trim()}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {searching ? 'Buscando...' : '🔍 Buscar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRandom}
                    disabled={searching}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-white/8 border border-white/10 hover:bg-white/12 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {searching ? '···' : '🎲 Aleatorio'}
                  </button>
                </div>
                {searchError && (
                  <p className="text-red-400 text-xs text-center">{searchError}</p>
                )}
              </form>
            )}

            {/* Target preview */}
            {bitePhase === 'preview' && targetTherian && (() => {
              const target = targetTherian;
              return (
              <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold">{target.name}</div>
                    <div className="text-[#8B84B0] text-sm">Nv {target.level}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${
                      target.rarity === 'LEGENDARY' ? 'text-amber-400'
                      : target.rarity === 'EPIC' ? 'text-purple-400'
                      : target.rarity === 'RARE' ? 'text-blue-400'
                      : 'text-slate-400'
                    }`}>{target.rarity}</div>
                    <div className="text-[#8B84B0] text-sm">{target.bites} 🦷</div>
                  </div>
                </div>
                {/* Stats comparison */}
                <div className="space-y-1 text-xs">
                  <div className="grid grid-cols-[1fr_auto_1fr] text-[10px] uppercase tracking-widest text-white/25 mb-1.5">
                    <span>Yo</span>
                    <span />
                    <span className="text-right">Rival</span>
                  </div>
                  {([['vitality','🌿'],['agility','⚡'],['instinct','🌌'],['charisma','✨']] as const).map(([k, icon]) => {
                    const mine = therian.stats[k]
                    const theirs = target.stats[k]
                    const iWin = mine > theirs
                    const theyWin = theirs > mine
                    return (
                      <div key={k} className="grid grid-cols-[1fr_auto_1fr] items-center bg-white/4 rounded-lg px-3 py-1.5">
                        <span className={`font-mono font-bold ${iWin ? 'text-emerald-400' : theyWin ? 'text-white/40' : 'text-white/60'}`}>
                          {mine}{iWin && ' ▲'}
                        </span>
                        <span className="text-white/30 px-2">{icon}</span>
                        <span className={`font-mono font-bold text-right ${theyWin ? 'text-red-400' : iWin ? 'text-white/40' : 'text-white/60'}`}>
                          {theyWin && '▲ '}{theirs}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {target.id === therian.id && (
                  <p className="text-amber-400 text-xs text-center">No puedes morderte a ti mismo.</p>
                )}
                {biteError && <p className="text-red-400 text-xs text-center">{biteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setBitePhase('search'); setBiteError(null) }}
                    className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                  >
                    ↺ Rebuscar
                  </button>
                  <button
                    onClick={handleBite}
                    disabled={biting || !therian.canBite || target.id === therian.id}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {biting ? 'Iniciando...' : therian.canBite ? '🦷 ¡Morder!' : '⏳ Cooldown'}
                  </button>
                </div>
              </div>
            )})()}

            {/* Battle arena */}
            {(bitePhase === 'fighting' || bitePhase === 'result') && battleResult && targetTherian && (
              <BattleArena
                challenger={therian}
                target={targetTherian as any}
                result={battleResult}
                onComplete={() => setBitePhase('result')}
              />
            )}

            {/* Result actions */}
            {bitePhase === 'result' && goldEarned !== null && (
              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-amber-400 text-sm font-semibold">
                <span>🪙</span>
                <span>+{goldEarned} GOLD</span>
              </div>
            )}

            {bitePhase === 'result' && (
              <div className="flex gap-2">
                <button
                  onClick={handleBiteReset}
                  className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-[#8B84B0] hover:text-white hover:border-white/20 transition-colors"
                >
                  Buscar rival
                </button>
                <Link
                  href="/leaderboard"
                  className="flex-1 py-2.5 rounded-xl font-bold bg-purple-700 hover:bg-purple-600 text-white text-sm text-center transition-colors"
                >
                  🏆 Leaderboard
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accessory selector modal */}
      {selectedAccessorySlot !== null && (() => {
        const slot = ACCESSORY_SLOTS.find(s => s.id === selectedAccessorySlot)!
        const currentAccId = therian.equippedAccessories[selectedAccessorySlot]
        const allEquippedIds = new Set(Object.values(therian.equippedAccessories))
        // Show only accessories for this slot that are NOT currently equipped anywhere
        const slotAccessories = (ownedAccessories ?? []).filter(a => {
          const typeId = a.itemId.includes(':') ? a.itemId.split(':')[0] : a.itemId
          const shopItem = SHOP_ITEMS.find(i => i.accessoryId === typeId)
          return shopItem?.slot === selectedAccessorySlot && !allEquippedIds.has(a.itemId)
        })
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => !equippingAccessory && setSelectedAccessorySlot(null)}
          >
            <div
              className="bg-[#13131F] border border-white/10 rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-center relative">
                <h3 className="text-white font-semibold uppercase tracking-widest text-sm">
                  {slot.emoji} {slot.name}
                </h3>
                <button
                  onClick={() => !equippingAccessory && setSelectedAccessorySlot(null)}
                  className="absolute right-4 text-white/40 hover:text-white transition-colors"
                >✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {currentAccId && (
                  <button
                    disabled={equippingAccessory}
                    onClick={() => handleEquipAccessory(null)}
                    className="w-full p-3 rounded-xl border border-white/10 text-[#8B84B0] hover:text-white hover:border-white/30 text-sm text-center disabled:opacity-50 transition-colors"
                  >
                    Quitar accesorio actual
                  </button>
                )}
                {slotAccessories.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-white/20 text-sm">
                      {currentAccId ? 'Este slot ya tiene un accesorio equipado' : 'No tienes accesorios para este slot'}
                    </p>
                    {!currentAccId && <p className="text-white/10 text-xs mt-1">Visita la tienda para comprar</p>}
                  </div>
                ) : (
                  slotAccessories.map(acc => (
                    <button
                      key={acc.itemId}
                      onClick={() => handleEquipAccessory(acc.itemId)}
                      disabled={equippingAccessory}
                      className="w-full flex items-center gap-3 text-left p-3 rounded-xl border border-white/10 bg-white/3 hover:border-amber-500/50 hover:bg-amber-950/20 active:scale-[0.98] disabled:opacity-50 transition-all"
                    >
                      <span className="text-2xl">{acc.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-amber-300 font-bold text-sm leading-tight">{acc.name}</div>
                        {acc.description && (
                          <div className="text-[#8B84B0] text-xs mt-0.5 line-clamp-1">{acc.description}</div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Rune selector modal */}
      {selectedSlot !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => !equipping && setSelectedSlot(null)}
        >
          <div
            className="bg-[#13131F] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-center relative">
              <h3 className="text-white font-semibold uppercase tracking-widest text-sm">Equipar Runa ✧</h3>
              <button
                onClick={() => !equipping && setSelectedSlot(null)}
                className="absolute right-4 text-white/40 hover:text-white transition-colors"
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid gap-3 grid-cols-1 md:grid-cols-2">
              <button
                disabled={equipping}
                onClick={() => handleEquip(null)}
                className="col-span-1 md:col-span-2 p-3 rounded-xl border border-white/10 text-[#8B84B0] hover:text-white hover:border-white/30 text-sm text-center disabled:opacity-50 transition-colors"
              >
                Quitar Runa Actual
              </button>
              {RUNES.map(rune => {
                const isEquipped = equippedRunesArray.some(r => r?.id === rune.id)
                return (
                  <button
                    key={rune.id}
                    onClick={() => !isEquipped && handleEquip(rune.id)}
                    disabled={equipping || isEquipped}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isEquipped
                        ? 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                        : 'border-white/10 bg-white/5 hover:border-purple-500 hover:bg-white/10 active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 w-full gap-2">
                      <span className="text-purple-300 font-bold text-sm leading-tight">{rune.name}</span>
                      {isEquipped && <span className="text-[9px] text-white/30 uppercase bg-black/30 px-1.5 py-0.5 rounded-full shrink-0">Equipada</span>}
                    </div>
                    <p className="text-[#8B84B0] text-xs italic mb-2 flex-1">{rune.lore}</p>
                    <div className="font-mono text-[11px] flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {rune.mod.vitality !== undefined && <span className="text-emerald-400">🌿 {rune.mod.vitality > 0 ? '+' : ''}{rune.mod.vitality}</span>}
                      {rune.mod.agility !== undefined && <span className="text-yellow-400">⚡ {rune.mod.agility > 0 ? '+' : ''}{rune.mod.agility}</span>}
                      {rune.mod.instinct !== undefined && <span className="text-blue-400">🌌 {rune.mod.instinct > 0 ? '+' : ''}{rune.mod.instinct}</span>}
                      {rune.mod.charisma !== undefined && <span className="text-amber-400">✨ {rune.mod.charisma > 0 ? '+' : ''}{rune.mod.charisma}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Action popup */}
      {showActionPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowActionPopup(false)}
        >
          <div
            className="bg-[#13131F] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm uppercase tracking-widest">Templar el espíritu</h3>
                <p className="text-[#8B84B0] text-xs mt-1">Ganarás:</p>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-purple-400 text-xs font-mono">+10 XP</span>
                  <span className="text-amber-400 text-xs font-mono">+10 🪙</span>
                </div>
              </div>
              <button
                onClick={() => setShowActionPopup(false)}
                className="text-white/30 hover:text-white/70 text-lg leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            <DailyActionButtons therian={therian} onAction={handleAction} />

            {narrative && <FlavorText text={narrative} key={narrative} />}

            {goldEarned !== null && (
              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-amber-400 text-sm font-semibold">
                <span>🪙</span>
                <span>+{goldEarned} GOLD</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-300 text-sm text-center italic">
                {error}
              </div>
            )}

            {levelUp && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-amber-300 text-sm text-center">
                ✦ ¡Tu Therian alcanzó el nivel {therian.level}! ✦
              </div>
            )}

            {/* Reset button */}
            <div className="pt-1 border-t border-white/5">
              {resetConfirming ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                  <p className="text-red-300 text-xs text-center font-semibold">¿Reiniciar los 10 usos?</p>
                  <p className="text-white/30 text-[10px] text-center">Se deducirán 1000 🪙 de tu cuenta</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setResetConfirming(false); setResetError(null) }}
                      disabled={resetting}
                      className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 text-xs transition-colors disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleActionReset}
                      disabled={resetting}
                      className="flex-1 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resetting ? 'Reiniciando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setResetConfirming(true); setResetError(null) }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-white/5 bg-white/3 hover:border-red-500/30 hover:bg-red-500/5 transition-all group"
                >
                  <span className="text-white/30 text-xs group-hover:text-red-400 transition-colors">↺ Reiniciar usos</span>
                  <span className="text-amber-400/60 text-xs font-mono group-hover:text-amber-400 transition-colors">1000 🪙</span>
                </button>
              )}
              {resetError && (
                <p className="text-red-400 text-xs text-center mt-1.5">{resetError}</p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
