'use client'

import { useState } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'
import type { BattleState } from '@/lib/pvp/types'
import { ABILITY_BY_ID } from '@/lib/pvp/abilities'
import { INNATE_BY_ARCHETYPE } from '@/lib/pvp/abilities'
import TherianAvatar from '@/components/TherianAvatar'

interface Props {
  therians: TherianDTO[]
  onBattleStart: (battleId: string, state: BattleState) => void
}

const ARCH_META = {
  forestal:  { emoji: '🌿', border: 'border-emerald-500/60', text: 'text-emerald-400', bg: 'bg-emerald-500/10', pill: 'bg-emerald-500/20 text-emerald-300' },
  electrico: { emoji: '⚡', border: 'border-yellow-500/60',  text: 'text-yellow-400',  bg: 'bg-yellow-500/10',  pill: 'bg-yellow-500/20 text-yellow-300' },
  acuatico:  { emoji: '💧', border: 'border-blue-500/60',    text: 'text-blue-400',    bg: 'bg-blue-500/10',    pill: 'bg-blue-500/20 text-blue-300' },
  volcanico: { emoji: '🔥', border: 'border-orange-500/60',  text: 'text-orange-400',  bg: 'bg-orange-500/10',  pill: 'bg-orange-500/20 text-orange-300' },
} as const

const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-white/10',
  UNCOMMON:  'border-emerald-500/30',
  RARE:      'border-blue-500/30',
  EPIC:      'border-purple-500/40',
  LEGENDARY: 'border-amber-500/50',
  MYTHIC:    'border-red-500/60',
}

const TIER_COLORS: Record<string, { border: string; badge: string; glow: string }> = {
  standard:     { border: 'border-slate-500/40',  badge: 'bg-slate-500/20 text-slate-300',    glow: '' },
  premium:      { border: 'border-purple-500/50', badge: 'bg-purple-500/20 text-purple-300',  glow: 'shadow-[0_0_12px_rgba(168,85,247,0.15)]' },
  premium_plus: { border: 'border-amber-500/50',  badge: 'bg-amber-500/20 text-amber-300',    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.2)]' },
}

const TIER_LABEL: Record<string, string> = {
  standard:     'Estándar',
  premium:      'Premium',
  premium_plus: 'Legendario',
}

export default function TeamSetup({ therians, onBattleStart }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Líder del equipo seleccionado = mayor CHA → determina el aura activa
  const selectedTherians = therians.filter(t => selected.has(t.id))
  const leader = selectedTherians.length > 0
    ? selectedTherians.reduce((best, t) => t.stats.charisma > best.stats.charisma ? t : best)
    : null
  const activeAura = leader?.aura ?? null

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      }
      return next
    })
  }

  async function handleStart() {
    if (selected.size !== 3) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pvp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackerTeamIds: Array.from(selected) }),
      })
      let data: Record<string, unknown> = {}
      try { data = await res.json() } catch { /* response no-JSON */ }

      if (!res.ok) {
        if (data.error === 'BATTLE_IN_PROGRESS') {
          setError('Ya tienes una batalla en curso.')
        } else if (data.error === 'NO_OPPONENTS') {
          setError('No se encontraron rivales. Intenta más tarde.')
        } else if (data.error === 'ENGINE_ERROR') {
          setError(`Error interno del motor: ${data.detail ?? ''}`)
        } else {
          setError(String(data.error ?? `Error ${res.status}`))
        }
        return
      }
      onBattleStart(data.battleId as string, data.state as never)
    } catch (e) {
      setError(`Error de conexión: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-white">⚔️ Arena PvP</h1>
        <p className="text-white/40 text-sm">Selecciona 3 Therians para combatir</p>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-center gap-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
              selected.size > i
                ? 'border-white/60 bg-white/10 text-white'
                : 'border-white/20 text-white/20'
            }`}
          >
            {selected.size > i ? '✓' : i + 1}
          </div>
        ))}
        <span className="text-white/40 text-sm ml-1">{selected.size}/3 seleccionados</span>
      </div>

      {/* Aura activa de la formación */}
      <div className={`rounded-xl border p-3 transition-all duration-300 min-h-[60px] ${
        activeAura
          ? `${TIER_COLORS[activeAura.tier]?.border ?? 'border-white/10'} bg-white/3 ${TIER_COLORS[activeAura.tier]?.glow ?? ''}`
          : 'border-white/8 bg-white/2'
      }`}>
        {activeAura ? (
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-0.5">
              {ARCH_META[activeAura.archetype as keyof typeof ARCH_META]?.emoji ?? '✨'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-white/40 text-[10px] uppercase tracking-widest">Aura activa</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${TIER_COLORS[activeAura.tier]?.badge ?? ''}`}>
                  {TIER_LABEL[activeAura.tier] ?? activeAura.tier}
                </span>
                <span className="text-white/25 text-[10px]">
                  Líder: {leader?.name ?? '—'} (CHA {leader?.stats.charisma})
                </span>
              </div>
              <p className="text-white font-semibold text-sm leading-tight">{activeAura.name}</p>
              <p className="text-white/45 text-xs mt-0.5 leading-relaxed">{activeAura.description}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/20">
            <span className="text-base">✨</span>
            <span className="text-xs">Selecciona Therians para ver el aura activa</span>
          </div>
        )}
      </div>

      {/* Therians grid */}
      <div className="grid grid-cols-1 gap-3">
        {therians.map(t => {
          const archId = t.trait.id as keyof typeof ARCH_META
          const arch = ARCH_META[archId] ?? ARCH_META.forestal
          const isSelected = selected.has(t.id)
          const innate = INNATE_BY_ARCHETYPE[archId]
          const allAbilityIds = innate ? [innate.id, ...t.equippedAbilities] : t.equippedAbilities

          return (
            <button
              key={t.id}
              onClick={() => toggleSelect(t.id)}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                isSelected
                  ? `${arch.border} ${arch.bg} ring-1 ring-white/10`
                  : `${RARITY_BORDER[t.rarity]} bg-white/3 hover:bg-white/5`
              }`}
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <TherianAvatar therian={t} size={64} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm truncate">
                      {t.name ?? `Therian sin nombre`}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${arch.pill}`}>
                      {arch.emoji} {archId}
                    </span>
                  </div>

                  {/* Mini stats */}
                  <div className="flex gap-3 text-xs text-white/50">
                    <span>❤️ {t.stats.vitality}</span>
                    <span>⚡ {t.stats.agility}</span>
                    <span>🌌 {t.stats.instinct}</span>
                    <span>✨ {t.stats.charisma}</span>
                  </div>

                  {/* Abilities pills */}
                  <div className="flex flex-wrap gap-1">
                    {allAbilityIds.map(id => {
                      const ab = ABILITY_BY_ID[id]
                      if (!ab) return null
                      return (
                        <span
                          key={id}
                          className={`text-xs px-1.5 py-0.5 rounded border text-white/50 ${
                            ab.isInnate
                              ? 'border-white/20 bg-white/5'
                              : ab.type === 'passive'
                                ? 'border-white/10 bg-white/3 opacity-60'
                                : 'border-white/15 bg-white/5'
                          }`}
                        >
                          {ab.isInnate ? '★ ' : ab.type === 'passive' ? '(P) ' : ''}{ab.name}
                        </span>
                      )
                    })}
                    {allAbilityIds.length === 0 && (
                      <span className="text-xs text-white/20">Sin habilidades equipadas</span>
                    )}
                  </div>
                </div>

                {/* Selection indicator */}
                <div className="flex-shrink-0 flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'border-white/60 bg-white/20' : 'border-white/20'
                  }`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={selected.size !== 3 || loading}
        className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-red-600/80 to-orange-600/80 hover:from-red-600 hover:to-orange-600 border border-white/10"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Buscando rival...
          </span>
        ) : (
          '⚔️ Combatir'
        )}
      </button>
    </div>
  )
}
