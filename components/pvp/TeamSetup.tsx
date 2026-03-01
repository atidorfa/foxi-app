'use client'

import { useState } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'
import type { BattleState } from '@/lib/pvp/types'
import { ABILITY_BY_ID, INNATE_BY_ARCHETYPE } from '@/lib/pvp/abilities'
import TherianAvatar from '@/components/TherianAvatar'

interface Props {
  therians: TherianDTO[]
  onBattleStart: (battleId: string, state: BattleState) => void
  savedTeamIds?: string[]
  onTeamSaved?: (ids: string[]) => void
  mode?: 'battle' | 'team-setup'
  externalError?: string
}

const ARCH_META = {
  forestal:  { emoji: '🌿', border: 'border-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-500/8', pill: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' },
  electrico: { emoji: '⚡', border: 'border-yellow-500/50',  text: 'text-yellow-400',  bg: 'bg-yellow-500/8',  pill: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20' },
  acuatico:  { emoji: '💧', border: 'border-blue-500/50',    text: 'text-blue-400',    bg: 'bg-blue-500/8',    pill: 'bg-blue-500/15 text-blue-300 border border-blue-500/20' },
  volcanico: { emoji: '🔥', border: 'border-orange-500/50',  text: 'text-orange-400',  bg: 'bg-orange-500/8',  pill: 'bg-orange-500/15 text-orange-300 border border-orange-500/20' },
} as const

const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-white/10',
  UNCOMMON:  'border-emerald-500/25',
  RARE:      'border-blue-500/30',
  EPIC:      'border-purple-500/40',
  LEGENDARY: 'border-amber-500/50',
  MYTHIC:    'border-red-500/55',
}

const RARITY_COLORS: Record<string, string> = {
  COMMON:    'text-white/40',
  UNCOMMON:  'text-emerald-400/80',
  RARE:      'text-blue-400/80',
  EPIC:      'text-purple-400/80',
  LEGENDARY: 'text-amber-400/80',
  MYTHIC:    'text-red-400/80',
}

const TIER_COLORS: Record<string, { border: string; badge: string; glow: string }> = {
  standard:     { border: 'border-slate-500/30',  badge: 'bg-slate-500/15 text-slate-300 border border-slate-500/20',    glow: '' },
  premium:      { border: 'border-purple-500/40', badge: 'bg-purple-500/15 text-purple-300 border border-purple-500/20', glow: 'shadow-[0_0_16px_rgba(168,85,247,0.12)]' },
  premium_plus: { border: 'border-amber-500/40',  badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
}

const TIER_LABEL: Record<string, string> = {
  standard:     'Estándar',
  premium:      'Premium',
  premium_plus: 'Legendario',
}

export default function TeamSetup({ therians, onBattleStart, savedTeamIds, onTeamSaved, mode = 'battle', externalError }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((savedTeamIds ?? []).filter(id => therians.some(t => t.id === id)))
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

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

  async function handleSaveTeam() {
    if (selected.size !== 3) return
    setSaving(true)
    setSaveMsg(null)
    setError(null)
    try {
      const res = await fetch('/api/pvp/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIds: Array.from(selected) }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSaveMsg('✓ Equipo guardado correctamente')
        onTeamSaved?.(Array.from(selected))
      } else {
        setSaveMsg(`Error: ${data.error ?? 'No se pudo guardar el equipo'}`)
      }
    } catch {
      setSaveMsg('Error de conexión.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStart() {
    if (selected.size !== 3) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pvp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackerTeamIds: Array.from(selected), mode: 'manual' }),
      })
      let data: Record<string, unknown> = {}
      try { data = await res.json() } catch { /* no-JSON */ }

      if (!res.ok) {
        if (data.error === 'BATTLE_IN_PROGRESS') {
          setError('Ya tienes una batalla en curso.')
        } else if (data.error === 'NO_OPPONENTS') {
          setError('No se encontraron rivales. Intenta más tarde.')
        } else if (data.error === 'NO_ENERGY') {
          setError('Sin energía. Espera a que se recargue.')
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
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {mode === 'team-setup' ? '🛡️ Configurar Equipo' : '⚔️ Arena PvP'}
        </h1>
        <p className="text-white/35 text-sm">
          {mode === 'team-setup'
            ? 'Selecciona 3 Therians y guarda tu formación'
            : 'Selecciona 3 Therians para combatir'}
        </p>
      </div>

      {/* Selection tracker */}
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
              selected.size > i
                ? 'border-aurora-500/70 bg-aurora-500/15 text-white shadow-[0_0_12px_rgba(155,89,182,0.2)]'
                : 'border-white/15 text-white/25'
            }`}
          >
            {selected.size > i ? '✓' : i + 1}
          </div>
        ))}
        <span className="text-white/35 text-sm ml-2 tabular-nums">{selected.size}/3</span>
      </div>

      {/* Aura activa */}
      {activeAura ? (
        <div className={`rounded-xl border p-3.5 transition-all duration-300 ${
          TIER_COLORS[activeAura.tier]?.border ?? 'border-white/10'
        } bg-white/3 ${TIER_COLORS[activeAura.tier]?.glow ?? ''}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-lg leading-none mt-0.5">
              {activeAura.archetype === 'forestal' ? '🌿' : activeAura.archetype === 'electrico' ? '⚡' : activeAura.archetype === 'acuatico' ? '💧' : '🔥'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-white/35 text-[10px] uppercase tracking-widest">Aura del líder</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${TIER_COLORS[activeAura.tier]?.badge ?? ''}`}>
                  {TIER_LABEL[activeAura.tier] ?? activeAura.tier}
                </span>
                <span className="text-white/20 text-[10px]">
                  Líder: {leader?.name ?? '—'} · CHA {leader?.stats.charisma}
                </span>
              </div>
              <p className="text-white font-semibold text-sm leading-tight">{activeAura.name}</p>
              <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{activeAura.description}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/2 p-3 flex items-center gap-2 text-white/20">
          <span className="text-base">✨</span>
          <span className="text-xs">Selecciona Therians para ver el aura del líder</span>
        </div>
      )}

      {/* Therians grid */}
      <div className="space-y-2">
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
              className={`w-full text-left rounded-xl border p-3 transition-all duration-150 group ${
                isSelected
                  ? `${arch.border} ${arch.bg} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]`
                  : `${RARITY_BORDER[t.rarity] ?? 'border-white/8'} bg-white/2 hover:bg-white/4 hover:border-white/15`
              }`}
            >
              <div className="flex gap-3 items-start">
                {/* Avatar */}
                <div className="flex-shrink-0 mt-0.5">
                  <TherianAvatar therian={t} size={60} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm truncate">
                      {t.name ?? t.species.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${arch.pill}`}>
                      {arch.emoji} {archId}
                    </span>
                    <span className={`text-[10px] font-medium ml-auto ${RARITY_COLORS[t.rarity] ?? 'text-white/30'}`}>
                      {t.rarity}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 text-[11px] text-white/40">
                    <span>🌿 {t.stats.vitality}</span>
                    <span>⚡ {t.stats.agility}</span>
                    <span>🌌 {t.stats.instinct}</span>
                    <span>✨ {t.stats.charisma}</span>
                  </div>

                  {/* Abilities */}
                  <div className="flex flex-wrap gap-1">
                    {allAbilityIds.map(id => {
                      const ab = ABILITY_BY_ID[id]
                      if (!ab) return null
                      return (
                        <span
                          key={id}
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            ab.isInnate
                              ? 'border-white/15 bg-white/5 text-white/50'
                              : ab.type === 'passive'
                                ? 'border-white/8 bg-white/3 text-white/30'
                                : 'border-white/12 bg-white/4 text-white/45'
                          }`}
                        >
                          {ab.isInnate ? '★ ' : ab.type === 'passive' ? '(P) ' : ''}{ab.name}
                        </span>
                      )
                    })}
                    {allAbilityIds.length === 0 && (
                      <span className="text-[10px] text-white/20">Sin habilidades</span>
                    )}
                  </div>
                </div>

                {/* Selection dot */}
                <div className="flex-shrink-0 flex items-center self-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'border-white/50 bg-white/15' : 'border-white/15'
                  }`}>
                    {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Messages */}
      {(error || externalError) && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-2.5 text-red-400 text-sm text-center">
          {error ?? externalError}
        </div>
      )}
      {saveMsg && (
        <div className={`rounded-xl border px-4 py-2.5 text-sm text-center ${
          saveMsg.startsWith('✓')
            ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400'
            : 'border-red-500/20 bg-red-500/8 text-red-400'
        }`}>
          {saveMsg}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {mode === 'team-setup' ? (
          <button
            onClick={handleSaveTeam}
            disabled={selected.size !== 3 || saving}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-35 disabled:cursor-not-allowed bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 border border-purple-500/20 shadow-lg shadow-purple-900/20"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              '💾 Guardar equipo'
            )}
          </button>
        ) : (
          <>
            {/* Save silently available in battle mode too */}
            {selected.size === 3 && (
              <button
                onClick={handleSaveTeam}
                disabled={saving}
                className="w-full py-2 rounded-xl text-xs font-medium text-white/30 hover:text-white/55 transition-all disabled:opacity-30 border border-white/6 bg-white/2 hover:bg-white/4"
              >
                {saving ? 'Guardando...' : '💾 Guardar como equipo predeterminado'}
              </button>
            )}
            <button
              onClick={handleStart}
              disabled={selected.size !== 3 || loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all disabled:opacity-35 disabled:cursor-not-allowed bg-gradient-to-r from-red-700/90 to-orange-700/90 hover:from-red-600 hover:to-orange-600 border border-red-500/20 shadow-lg shadow-red-900/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                  Buscando rival...
                </span>
              ) : (
                '⚔️ Combatir'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
