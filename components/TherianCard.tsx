'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { TherianDTO } from '@/lib/therian-dto'
import TherianAvatar from './TherianAvatar'
import StatBar from './StatBar'
import RarityBadge from './RarityBadge'
import DailyActionButtons from './DailyActionButtons'
import FlavorText from './FlavorText'

interface Props {
  therian: TherianDTO
}

const STAT_CONFIG = [
  { key: 'vitality' as const, label: 'Vitalidad', icon: '🌿', color: 'vitality' },
  { key: 'agility'  as const, label: 'Agilidad',  icon: '⚡', color: 'agility' },
  { key: 'instinct' as const, label: 'Instinto',  icon: '🌌', color: 'instinct' },
  { key: 'charisma' as const, label: 'Carisma',   icon: '✨', color: 'charisma' },
]

function timeRemaining(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now()
  if (diff <= 0) return 'Ya disponible'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const RARITY_GLOW: Record<string, string> = {
  COMMON:    'border-white/10',
  RARE:      'border-blue-500/30 shadow-[0_0_30px_rgba(96,165,250,0.1)]',
  EPIC:      'border-purple-500/40 shadow-[0_0_40px_rgba(192,132,252,0.15)]',
  LEGENDARY: 'border-amber-500/50 shadow-[0_0_50px_rgba(252,211,77,0.2),0_0_100px_rgba(252,211,77,0.05)]',
}

export default function TherianCard({ therian: initialTherian }: Props) {
  const [therian, setTherian] = useState(initialTherian)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [lastDelta, setLastDelta] = useState<{ stat: string; amount: number } | null>(null)
  const [levelUp, setLevelUp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Name editing
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(therian.name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaving, setNameSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

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

  const handleAction = async (actionType: string) => {
    setError(null)
    setNarrative(null)
    setLastDelta(null)
    setLevelUp(false)

    try {
      const res = await fetch('/api/therian/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType }),
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
    } catch {
      setError('Error de conexión.')
    }
  }

  const xpPct = Math.min(100, (therian.xp / therian.xpToNext) * 100)
  const glowClass = RARITY_GLOW[therian.rarity] ?? RARITY_GLOW.COMMON

  return (
    <div className={`
      relative rounded-2xl border bg-[#13131F] overflow-hidden
      ${glowClass} transition-shadow duration-500
    `}>
      {/* Fondo decorativo */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${therian.appearance.paletteColors.primary}, transparent 70%)`,
        }}
      />

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
                <p className="text-[#8B84B0] text-xs uppercase tracking-widest group-hover:text-purple-400/70 transition-colors">
                  {therian.name ?? 'Sin nombre'}
                </p>
                <span className="opacity-0 group-hover:opacity-60 text-purple-400 text-xs transition-opacity">✎</span>
              </button>
            )}
            <h2 className="text-2xl font-bold text-white">
              {therian.species.emoji} {therian.species.name}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-[#8B84B0] text-sm">Nivel {therian.level}</p>
              <p className="text-[#8B84B0] text-sm">🦷 {therian.bites} mordidas</p>
            </div>
          </div>
          <RarityBadge rarity={therian.rarity} />
        </div>

        {/* Battle nav links */}
        <div className="flex gap-2">
          {therian.canBite ? (
            <Link
              href="/bite"
              className="flex-1 text-center py-2 rounded-lg border border-red-500/30 bg-red-500/8 text-red-300 hover:bg-red-500/15 hover:border-red-500/50 text-sm font-semibold transition-colors"
            >
              ⚔️ Morder
            </Link>
          ) : (
            <div className="group flex-1 rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-center cursor-default">
              <p className="text-white/30 text-xs font-semibold leading-none mb-0.5">⚔️ Morder</p>
              <p className="text-white/50 text-xs leading-none group-hover:hidden">
                {therian.nextBiteAt
                  ? new Date(therian.nextBiteAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                  : 'mañana'}
              </p>
              <p className="text-white/70 text-xs leading-none hidden group-hover:block">
                {therian.nextBiteAt ? `Faltan ${timeRemaining(therian.nextBiteAt)}` : 'mañana'}
              </p>
            </div>
          )}
          {therian.canAct ? (
            <div className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-center">
              <p className="text-emerald-400 text-xs font-semibold leading-none mb-0.5">🌿 Acción</p>
              <p className="text-emerald-400/70 text-xs leading-none">Disponible</p>
            </div>
          ) : (
            <div className="group flex-1 rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-center cursor-default">
              <p className="text-white/30 text-xs font-semibold leading-none mb-0.5">🌿 Acción</p>
              <p className="text-white/50 text-xs leading-none group-hover:hidden">
                {therian.nextActionAt
                  ? new Date(therian.nextActionAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                  : 'mañana'}
              </p>
              <p className="text-white/70 text-xs leading-none hidden group-hover:block">
                {therian.nextActionAt ? `Faltan ${timeRemaining(therian.nextActionAt)}` : 'mañana'}
              </p>
            </div>
          )}
          <Link
            href="/leaderboard"
            className="flex-1 text-center py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 text-sm font-semibold transition-colors"
          >
            🏆 Leaderboard
          </Link>
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <TherianAvatar therian={therian} size={220} animated />
            {levelUp && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl animate-bounce">⬆️</span>
              </div>
            )}
          </div>
        </div>

        {/* Trait */}
        <div className="rounded-xl border border-white/5 bg-white/3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[#8B84B0] text-xs uppercase tracking-widest">Arquetipo</span>
            <span className="text-white font-semibold text-sm">{therian.trait.name}</span>
          </div>
          <p className="text-[#A99DC0] italic text-sm mt-1">{therian.trait.lore}</p>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <h3 className="text-[#8B84B0] text-xs uppercase tracking-widest">Stats</h3>
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
        </div>

        {/* XP Bar */}
        <div className="space-y-1">
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


        {/* Narrativa */}
        {narrative && (
          <FlavorText text={narrative} key={narrative} />
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-300 text-sm text-center italic">
            {error}
          </div>
        )}

        {/* Level up */}
        {levelUp && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-amber-300 text-sm text-center">
            ✦ ¡Tu Therian alcanzó el nivel {therian.level}! ✦
          </div>
        )}
      </div>
    </div>
  )
}
