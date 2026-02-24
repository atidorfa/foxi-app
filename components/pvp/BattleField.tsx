'use client'

import { useState } from 'react'
import type { BattleState, TurnSlot, ActionLogEntry, Aura } from '@/lib/pvp/types'
import { ABILITY_BY_ID, INNATE_BY_ARCHETYPE } from '@/lib/pvp/abilities'
import type { Ability } from '@/lib/pvp/abilities'

interface Props {
  battleId: string
  initialState: BattleState
  onComplete: (won: boolean) => void
}

type TurnPhase = 'idle' | 'selecting_target' | 'selecting_ally' | 'loading'

// ─── Archetype helpers ──────────────────────────────────────────────────────

const ARCH_META = {
  forestal:  { emoji: '🌿', border: 'border-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-500/15', pill: 'bg-emerald-500/20 text-emerald-300' },
  electrico: { emoji: '⚡', border: 'border-yellow-500/50',  text: 'text-yellow-400',  bg: 'bg-yellow-500/15',  pill: 'bg-yellow-500/20 text-yellow-300' },
  acuatico:  { emoji: '💧', border: 'border-blue-500/50',    text: 'text-blue-400',    bg: 'bg-blue-500/15',    pill: 'bg-blue-500/20 text-blue-300' },
  volcanico: { emoji: '🔥', border: 'border-orange-500/50',  text: 'text-orange-400',  bg: 'bg-orange-500/15',  pill: 'bg-orange-500/20 text-orange-300' },
} as const

function archMeta(archetype: string) {
  return ARCH_META[archetype as keyof typeof ARCH_META] ?? ARCH_META.forestal
}

const AURA_LABEL: Record<string, string> = {
  hp:      '🌿 Vitalidad',
  damage:  '🔥 Combate',
  defense: '💧 Escudo',
  agility: '⚡ Celeridad',
}

// ─── HP Bar ─────────────────────────────────────────────────────────────────

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, (current / max) * 100)
  const color = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Turn Queue Bar ──────────────────────────────────────────────────────────

function TurnQueueBar({ state }: { state: BattleState }) {
  const attackers = state.slots.filter(s => s.side === 'attacker')
  const defenders = state.slots.filter(s => s.side === 'defender')

  function Chip({ slot, idx }: { slot: TurnSlot; idx: number }) {
    const isActive = state.slots.indexOf(slot) === state.turnIndex
    const meta = archMeta(slot.archetype)
    return (
      <div
        className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all select-none ${
          slot.isDead
            ? 'opacity-25 grayscale border-white/10 bg-white/5'
            : isActive
              ? `${meta.border} ${meta.bg} ring-2 ring-white/60 scale-110`
              : `${meta.border} bg-white/5`
        }`}
        title={slot.name ?? slot.archetype}
      >
        <span className="text-base leading-none">{meta.emoji}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {attackers.map((s, i) => <Chip key={s.therianId} slot={s} idx={i} />)}
      <span className="text-white/20 text-xs mx-1">|</span>
      {defenders.map((s, i) => <Chip key={s.therianId} slot={s} idx={i} />)}
    </div>
  )
}

// ─── Slot Card ───────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  isActive,
  isTargetable,
  onTarget,
}: {
  slot: TurnSlot
  isActive: boolean
  isTargetable: boolean
  onTarget?: () => void
}) {
  const meta = archMeta(slot.archetype)

  return (
    <button
      onClick={isTargetable ? onTarget : undefined}
      disabled={!isTargetable && !isActive}
      className={`w-full text-left rounded-lg border p-2 transition-all ${
        slot.isDead
          ? 'opacity-25 grayscale border-white/5 bg-white/3 cursor-default'
          : isTargetable
            ? `${meta.border} ${meta.bg} ring-1 ring-red-500/50 cursor-pointer hover:ring-red-500/80 hover:scale-[1.02]`
            : isActive
              ? `${meta.border} ${meta.bg} ring-1 ring-white/20`
              : 'border-white/10 bg-white/3'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{meta.emoji}</span>
        <span className="text-xs font-medium text-white/80 truncate flex-1">
          {slot.name ?? slot.archetype}
        </span>
        {isActive && !slot.isDead && (
          <span className="text-xs bg-white/10 px-1 rounded text-white/50">turno</span>
        )}
        {isTargetable && (
          <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded">🎯</span>
        )}
      </div>
      <HpBar current={slot.currentHp} max={slot.maxHp} />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-white/30">{slot.currentHp}/{slot.maxHp}</span>
        {slot.effects.length > 0 && (
          <span className="text-xs text-amber-400/60">{slot.effects.map(e => e.type === 'stun' ? '😵' : e.type === 'buff' ? '↑' : '↓').join('')}</span>
        )}
      </div>
    </button>
  )
}

// ─── Ability Button ──────────────────────────────────────────────────────────

function AbilityButton({
  ability,
  slot,
  disabled,
  isSelected,
  onClick,
}: {
  ability: Ability
  slot: TurnSlot
  disabled: boolean
  isSelected: boolean
  onClick: () => void
}) {
  if (ability.type === 'passive') {
    return (
      <div className="rounded-lg border border-white/10 bg-white/3 p-2 opacity-50 cursor-default">
        <div className="text-xs text-white/40 font-medium truncate">(P) {ability.name}</div>
        <div className="text-xs text-white/20 mt-0.5">Pasiva</div>
      </div>
    )
  }

  const cooldown = slot.cooldowns[ability.id] ?? 0
  const onCooldown = cooldown > 0
  const meta = archMeta(ability.archetype)
  const sameArch = slot.archetype === ability.archetype

  return (
    <button
      onClick={!disabled && !onCooldown ? onClick : undefined}
      disabled={disabled || onCooldown}
      className={`w-full text-left rounded-lg border p-2 transition-all ${
        isSelected
          ? `${meta.border} ${meta.bg} ring-1 ring-white/30`
          : onCooldown
            ? 'border-white/10 bg-white/3 opacity-40 cursor-not-allowed'
            : disabled
              ? 'border-white/10 bg-white/3 opacity-40 cursor-not-allowed'
              : sameArch
                ? `${meta.border} bg-white/5 hover:${meta.bg} hover:scale-[1.02] cursor-pointer`
                : 'border-white/15 bg-white/5 hover:bg-white/8 cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-white/80 truncate">{ability.name}</span>
        {onCooldown ? (
          <span className="text-xs bg-white/10 px-1 rounded text-white/40 flex-shrink-0">{cooldown}t</span>
        ) : ability.isInnate ? (
          <span className="text-xs text-white/20 flex-shrink-0">★</span>
        ) : null}
      </div>
      <div className="text-xs text-white/30 mt-0.5">
        {ability.target === 'all' ? 'AoE' : ability.target === 'self' ? 'Propio' : ability.target === 'ally' ? 'Aliado' : 'Objetivo'}
        {ability.cooldown > 0 && ` · CD${ability.cooldown}`}
      </div>
    </button>
  )
}

// ─── Log Entry ───────────────────────────────────────────────────────────────

function LogLine({ entry }: { entry: ActionLogEntry }) {
  const firstResult = entry.results[0]
  let resultText = ''
  let resultColor = 'text-white/40'

  if (entry.abilityId === 'stun') {
    resultText = 'aturdido'
    resultColor = 'text-white/30'
  } else if (firstResult) {
    if (firstResult.damage !== undefined) {
      resultText = firstResult.blocked
        ? `bloqueó (${firstResult.damage} dmg)`
        : `${firstResult.damage} daño${firstResult.died ? ' 💀' : ''}`
      resultColor = firstResult.blocked ? 'text-amber-400/60' : 'text-red-400/70'
    } else if (firstResult.heal !== undefined) {
      resultText = `+${firstResult.heal} HP`
      resultColor = 'text-emerald-400/70'
    } else if (firstResult.effect) {
      resultText = firstResult.effect
      resultColor = 'text-yellow-400/60'
    } else if (firstResult.stun) {
      resultText = `aturde ${firstResult.stun}t`
      resultColor = 'text-purple-400/60'
    }
    if (entry.results.length > 1) {
      const totalDmg = entry.results.reduce((s, r) => s + (r.damage ?? 0), 0)
      if (totalDmg > 0) {
        resultText = `${totalDmg} total${entry.results.some(r => r.died) ? ' 💀' : ''}`
        resultColor = 'text-red-400/70'
      }
    }
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-white/30 flex-shrink-0">T{entry.turn}</span>
      <span className="text-white/60 truncate max-w-[80px]">{entry.actorName ?? '?'}</span>
      <span className="text-white/20">→</span>
      <span className="text-white/50 flex-shrink-0">{entry.abilityName}</span>
      <span className="text-white/20">→</span>
      <span className={`${resultColor} truncate flex-1`}>{resultText}</span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BattleField({ battleId, initialState, onComplete }: Props) {
  const [state, setState] = useState<BattleState>(initialState)
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('idle')
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeSlot = state.slots[state.turnIndex]
  const isPlayerTurn = activeSlot?.side === 'attacker' && !activeSlot?.isDead
  const mySlots = state.slots.filter(s => s.side === 'attacker')
  const enemySlots = state.slots.filter(s => s.side === 'defender')

  const myAura = state.auras.find(a => a.side === 'attacker')
  const enemyAura = state.auras.find(a => a.side === 'defender')

  // Habilidades del slot activo del jugador
  const activeAttacker = mySlots.find(s => !s.isDead && state.slots.indexOf(s) === state.turnIndex)
    ?? mySlots.find(s => !s.isDead)
  const actorSlot = isPlayerTurn ? activeSlot : null

  function getAbilitiesForSlot(slot: TurnSlot): Ability[] {
    const innate = INNATE_BY_ARCHETYPE[slot.archetype]
    const abilities: Ability[] = innate ? [innate] : []
    for (const id of slot.equippedAbilities) {
      const ab = ABILITY_BY_ID[id]
      if (ab) abilities.push(ab)
    }
    return abilities
  }

  async function executeAction(abilityId: string, targetId?: string) {
    setTurnPhase('loading')
    setError(null)
    try {
      const res = await fetch(`/api/pvp/${battleId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abilityId, targetId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al ejecutar acción.')
        setTurnPhase('idle')
        return
      }
      setState(data.state)
      setSelectedAbilityId(null)
      setTurnPhase('idle')

      if (data.status === 'completed') {
        const won = data.state.winnerId !== null
        onComplete(won)
      }
    } catch {
      setError('Error de conexión.')
      setTurnPhase('idle')
    }
  }

  function handleAbilityClick(ability: Ability) {
    if (!actorSlot) return
    if (ability.type === 'passive') return

    if (ability.target === 'single') {
      // Necesita seleccionar objetivo
      if (selectedAbilityId === ability.id) {
        setSelectedAbilityId(null)
        setTurnPhase('idle')
      } else {
        setSelectedAbilityId(ability.id)
        setTurnPhase('selecting_target')
      }
    } else if (ability.target === 'ally') {
      if (selectedAbilityId === ability.id) {
        setSelectedAbilityId(null)
        setTurnPhase('idle')
      } else {
        setSelectedAbilityId(ability.id)
        setTurnPhase('selecting_ally')
      }
    } else {
      // 'self' o 'all'
      setSelectedAbilityId(null)
      setTurnPhase('idle')
      executeAction(ability.id)
    }
  }

  function handleTargetClick(target: TurnSlot) {
    if (!selectedAbilityId) return
    const abilityId = selectedAbilityId
    setSelectedAbilityId(null)
    setTurnPhase('idle')
    executeAction(abilityId, target.therianId)
  }

  const loading = turnPhase === 'loading'
  const selectingTarget = turnPhase === 'selecting_target'
  const selectingAlly = turnPhase === 'selecting_ally'

  const recentLog = state.log.slice(-4).reverse()

  return (
    <div className="space-y-4">
      {/* Header: round + status */}
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs">Ronda {state.round}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          isPlayerTurn && !loading
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
            : loading
              ? 'border-white/20 bg-white/5 text-white/40'
              : 'border-orange-500/30 bg-orange-500/10 text-orange-400'
        }`}>
          {loading ? '⏳ Resolviendo...' : isPlayerTurn ? '✅ Tu turno' : '🤖 Rival pensando...'}
        </span>
        <span className="text-white/40 text-xs">⚔️ PvP</span>
      </div>

      {/* Turn queue */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-3">
        <p className="text-white/30 text-xs text-center mb-2">Cola de turnos</p>
        <TurnQueueBar state={state} />
      </div>

      {/* Battle area: my team vs enemy team */}
      <div className="grid grid-cols-2 gap-3">
        {/* My team */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs font-medium">Tu equipo</span>
            {myAura && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                {AURA_LABEL[myAura.type] ?? myAura.type}
              </span>
            )}
          </div>
          {mySlots.map(slot => (
            <SlotCard
              key={slot.therianId}
              slot={slot}
              isActive={state.slots.indexOf(slot) === state.turnIndex}
              isTargetable={selectingAlly && !slot.isDead}
              onTarget={() => handleTargetClick(slot)}
            />
          ))}
        </div>

        {/* Enemy team */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs font-medium">Rival</span>
            {enemyAura && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                {AURA_LABEL[enemyAura.type] ?? enemyAura.type}
              </span>
            )}
          </div>
          {enemySlots.map(slot => (
            <SlotCard
              key={slot.therianId}
              slot={slot}
              isActive={state.slots.indexOf(slot) === state.turnIndex}
              isTargetable={selectingTarget && !slot.isDead}
              onTarget={() => handleTargetClick(slot)}
            />
          ))}
        </div>
      </div>

      {/* Target / ally selection hint */}
      {selectingTarget && (
        <div className="text-center text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg py-2">
          🎯 Selecciona un objetivo del equipo rival
          <button
            onClick={() => { setSelectedAbilityId(null); setTurnPhase('idle') }}
            className="ml-2 text-white/30 hover:text-white/60 underline"
          >
            cancelar
          </button>
        </div>
      )}
      {selectingAlly && (
        <div className="text-center text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2">
          💚 Selecciona un aliado de tu equipo
          <button
            onClick={() => { setSelectedAbilityId(null); setTurnPhase('idle') }}
            className="ml-2 text-white/30 hover:text-white/60 underline"
          >
            cancelar
          </button>
        </div>
      )}

      {/* Ability panel */}
      {actorSlot && (
        <div className="space-y-2">
          <p className="text-white/40 text-xs">
            Habilidades de {actorSlot.name ?? actorSlot.archetype}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {getAbilitiesForSlot(actorSlot).map(ab => (
              <AbilityButton
                key={ab.id}
                ability={ab}
                slot={actorSlot}
                disabled={loading || ((selectingTarget || selectingAlly) && ab.id !== selectedAbilityId)}
                isSelected={ab.id === selectedAbilityId}
                onClick={() => handleAbilityClick(ab)}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI turn placeholder */}
      {!isPlayerTurn && !loading && state.status === 'active' && (
        <div className="text-center text-white/30 text-xs bg-white/3 border border-white/5 rounded-lg py-3">
          El servidor ya resolvió los turnos del rival. Pulsa cualquier habilidad cuando sea tu turno.
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400/80 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2">
          {error}
        </p>
      )}

      {/* Combat log */}
      {recentLog.length > 0 && (
        <div className="bg-white/3 border border-white/5 rounded-xl p-3 space-y-1.5">
          <p className="text-white/30 text-xs mb-2">Registro</p>
          {recentLog.map((entry, i) => (
            <LogLine key={i} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
