'use client'

import { useState, useEffect, useRef } from 'react'
import type { BattleState, TurnSlot, TurnSnapshot, ActionLogEntry, AvatarSnapshot } from '@/lib/pvp/types'
import type { Ability } from '@/lib/pvp/types'
import { ABILITY_BY_ID } from '@/lib/pvp/abilities'
import TherianAvatar from '@/components/TherianAvatar'
import type { TherianDTO } from '@/lib/therian-dto'

export interface BattleRewards {
  mmrDelta: number
  newMmr: number
  rank: string
  goldEarned: number
  weeklyPvpWins: number
}

interface Props {
  battleId: string
  initialState: BattleState
  onComplete: (won: boolean, rewards?: BattleRewards) => void
}

interface AnimInfo {
  actorId:   string
  targetIds: string[]
  actorSide: 'attacker' | 'defender'
  isHeal:    boolean
  frame:     number
}

interface FloatNum {
  id:        number
  therianId: string
  label:     string
  color:     string
}

interface ActiveAbilityInfo {
  abilityId:   string
  abilityName: string
  archetype:   string
  actorName:   string | null
  resultLines: string[]
}

// ─── Pure helpers (exported for tests) ────────────────────────────────────────

export function describeAbility(ab: Ability): string {
  const e = ab.effect
  const parts: string[] = []
  if (e.damage  !== undefined) parts.push(`Daño base ×${e.damage}`)
  if (e.heal    !== undefined) parts.push(`Curación base ×${e.heal}`)
  if (e.stun    !== undefined) parts.push(`Aturde ${e.stun} turno${e.stun !== 1 ? 's' : ''}`)
  if (e.buff)    parts.push(`+${Math.round(e.buff.pct * 100)}% ${e.buff.stat} por ${e.buff.turns} turnos`)
  if (e.debuff)  parts.push(`${Math.round(e.debuff.pct * 100)}% ${e.debuff.stat} por ${e.debuff.turns} turnos`)
  if (e.reflect) parts.push(`Refleja ${Math.round(e.reflect * 100)}% del daño recibido`)
  if (e.damageReduction) parts.push(`Reduce ${Math.round(e.damageReduction * 100)}% el daño recibido`)
  if (e.tiebreaker) parts.push('Actúa primero en empates de velocidad')
  return parts.join('. ')
}

export function hpBarColor(current: number, max: number): 'bg-emerald-500' | 'bg-amber-500' | 'bg-red-500' {
  const pct = max > 0 ? current / max : 0
  if (pct > 0.6) return 'bg-emerald-500'
  if (pct > 0.3) return 'bg-amber-500'
  return 'bg-red-500'
}

export function resultLines(entry: ActionLogEntry): string[] {
  if (entry.abilityId === 'stun') return ['Aturdido: saltea turno']
  const lines = entry.results.map(r => {
    if (r.damage !== undefined) return r.blocked ? `Bloqueado (${r.damage} dmg)` : `${r.damage} daño${r.died ? ' 💀' : ''}`
    if (r.heal   !== undefined) return `+${r.heal} HP`
    if (r.stun   !== undefined) return `Aturde ${r.stun}t`
    if (r.effect !== undefined) return r.effect
    return ''
  }).filter(Boolean)
  // If multi-target, add total damage summary
  if (entry.results.length > 1) {
    const total = entry.results.reduce((s, r) => s + (r.damage ?? 0), 0)
    if (total > 0) lines.push(`Total: ${total} daño`)
  }
  return lines
}

export function applySnapshot(base: BattleState, snap: TurnSnapshot): BattleState {
  return {
    ...base,
    turnIndex: snap.turnIndex,
    round:     snap.round,
    status:    snap.status,
    winnerId:  snap.winnerId,
    slots: base.slots.map(slot => {
      const s = snap.slots.find(ss => ss.therianId === slot.therianId)
      if (!s) return slot
      return { ...slot, currentHp: s.currentHp, isDead: s.isDead, effects: s.effects, cooldowns: s.cooldowns, effectiveAgility: s.effectiveAgility }
    }),
  }
}

// ─── Archetype helpers ────────────────────────────────────────────────────────

const ARCH_META = {
  forestal:  { emoji: '🌿', border: 'border-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  electrico: { emoji: '⚡', border: 'border-yellow-500/50',  text: 'text-yellow-400',  bg: 'bg-yellow-500/15'  },
  acuatico:  { emoji: '💧', border: 'border-blue-500/50',    text: 'text-blue-400',    bg: 'bg-blue-500/15'    },
  volcanico: { emoji: '🔥', border: 'border-orange-500/50',  text: 'text-orange-400',  bg: 'bg-orange-500/15'  },
} as const

function archMeta(archetype: string) {
  return ARCH_META[archetype as keyof typeof ARCH_META] ?? ARCH_META.forestal
}

const AURA_LABEL_FALLBACK: Record<string, string> = {
  hp: '🌿 Vitalidad', damage: '🔥 Combate', defense: '💧 Escudo', agility: '⚡ Celeridad',
}

function getAuraLabel(aura: { name?: string; type?: string }): string {
  if (aura.name) return aura.name
  return AURA_LABEL_FALLBACK[aura.type ?? ''] ?? (aura.type ?? '')
}

const SPEED_OPTIONS = [
  { label: '1×', ms: 1600 },
  { label: '2×', ms: 800  },
  { label: '4×', ms: 350  },
]

// Module-level counter for unique float number IDs
let floatCounter = 0

// ─── SlotAvatar ───────────────────────────────────────────────────────────────

function SlotAvatar({ slot }: { slot: TurnSlot }) {
  const snap: AvatarSnapshot | undefined = slot.avatarSnapshot
  const meta = archMeta(slot.archetype)

  if (!snap) {
    return <div className="w-16 h-16 flex items-center justify-center text-4xl">{meta.emoji}</div>
  }

  const fakeDto = {
    id: slot.therianId, name: slot.name,
    appearance: snap.appearance, level: snap.level, rarity: snap.rarity,
    equippedAccessories: {},
    species: { id: '', name: '', emoji: '', lore: '' },
    trait:   { id: '', name: '', lore: '' },
    stats:      { vitality: 0, agility: 0, instinct: 0, charisma: 0 },
    baseStats:  { vitality: 0, agility: 0, instinct: 0, charisma: 0 },
    equippedRunes: [], equippedRunesIds: [], equippedAbilities: [],
    bites: 0, xp: 0, xpToNext: 100,
    lastActionAt: null, canAct: false, nextActionAt: null,
    actionsUsed: 0, actionsMaxed: false, actionGains: {},
    canBite: false, nextBiteAt: null, status: 'active', createdAt: '',
  } as unknown as TherianDTO

  return <TherianAvatar therian={fakeDto} size={64} />
}

// ─── HpBar ────────────────────────────────────────────────────────────────────

function HpBar({ current, max }: { current: number; max: number }) {
  const pct   = Math.max(0, (current / max) * 100)
  const color = hpBarColor(current, max)
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── TurnQueueBar ─────────────────────────────────────────────────────────────

function TurnQueueBar({ slots, turnIndex, actorIndex }: {
  slots: TurnSlot[]; turnIndex: number; actorIndex: number
}) {
  const attackers = slots.filter(s => s.side === 'attacker')
  const defenders = slots.filter(s => s.side === 'defender')

  function Chip({ slot }: { slot: TurnSlot }) {
    const realIdx = slots.indexOf(slot)
    const isActor = realIdx === actorIndex
    const isNext  = realIdx === turnIndex && !isActor
    const meta    = archMeta(slot.archetype)
    return (
      <div
        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all select-none ${
          slot.isDead
            ? 'opacity-20 grayscale border-white/10 bg-white/5'
            : isActor
              ? `${meta.border} ${meta.bg} ring-2 ring-white/80 scale-115 shadow-[0_0_10px_rgba(255,255,255,0.25)]`
              : isNext
                ? `${meta.border} bg-white/5 ring-1 ring-white/30`
                : `${meta.border} bg-white/5`
        }`}
        title={slot.name ?? slot.archetype}
      >
        <span className="text-base leading-none">{meta.emoji}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      {attackers.map(s => <Chip key={s.therianId} slot={s} />)}
      <span className="text-white/20 text-[10px] font-bold mx-1">vs</span>
      {defenders.map(s => <Chip key={s.therianId} slot={s} />)}
    </div>
  )
}

// ─── ArenaSlot ────────────────────────────────────────────────────────────────

function ArenaSlot({ slot, isActor, isNext, onCardRef, onAvatarRef, mirrored, floats }: {
  slot:        TurnSlot
  isActor:     boolean
  isNext:      boolean
  onCardRef:   (el: HTMLDivElement | null) => void
  onAvatarRef: (el: HTMLDivElement | null) => void
  mirrored:    boolean
  floats:      FloatNum[]
}) {
  const meta = archMeta(slot.archetype)

  const borderClass = slot.isDead
    ? 'border-white/5 bg-white/2'
    : isActor
      ? `${meta.border} ${meta.bg} ring-2 ring-white/50 shadow-[0_0_14px_rgba(255,255,255,0.08)]`
      : isNext
        ? `${meta.border} bg-white/5 ring-1 ring-white/15`
        : 'border-white/10 bg-white/3'

  return (
    <div
      ref={onCardRef}
      className={`relative rounded-xl border p-2 transition-all duration-500 ${borderClass} ${slot.isDead ? 'opacity-30 grayscale' : ''}`}
    >
      {/* HP bar + text */}
      <HpBar current={slot.currentHp} max={slot.maxHp} />
      <div className="flex justify-between items-center mt-0.5 mb-1.5">
        <span className="text-[9px] text-white/30">{slot.currentHp}/{slot.maxHp}</span>
        {slot.effects.length > 0 && (
          <span className="text-[10px]">
            {slot.effects.map(e => e.type === 'stun' ? '😵' : e.type === 'buff' ? '↑' : '↓').join('')}
          </span>
        )}
      </div>

      {/* Avatar with float numbers — outer div for float anchor */}
      <div className="relative flex justify-center">
        {/* Float numbers — absolute above avatar, not mirrored */}
        {floats.length > 0 && (
          <div
            className="absolute inset-x-0 flex flex-col items-center pointer-events-none"
            style={{ bottom: '100%', zIndex: 20 }}
          >
            {floats.map(f => (
              <span
                key={f.id}
                className={`text-sm font-extrabold leading-none select-none ${f.color}`}
                style={{ animation: 'floatUp 1.2s ease-out forwards' }}
              >
                {f.label}
              </span>
            ))}
          </div>
        )}

        {/* WAAPI wrapper — translated by animation, does NOT have mirror so dx/dy are correct */}
        <div ref={onAvatarRef} style={{ willChange: 'transform' }}>
          {/* Mirror applied only to the visual content */}
          <div style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
               className={slot.isDead ? 'opacity-30' : ''}>
            <SlotAvatar slot={slot} />
          </div>
        </div>
      </div>

      {/* Name */}
      <p className="text-[10px] text-center text-white/60 mt-1.5 truncate font-medium">
        {slot.name ?? slot.archetype}
      </p>

      {/* Equipped ability dots (Phase 4: hover to inspect) */}
      {slot.equippedAbilities.length > 0 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {slot.equippedAbilities.slice(0, 4).map(id => {
            const ab = ABILITY_BY_ID[id]
            if (!ab) return null
            const abMeta = archMeta(ab.archetype)
            return (
              <div
                key={id}
                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] leading-none cursor-default ${abMeta.border} ${abMeta.bg} hover:scale-125 transition-transform`}
                title={`${ab.name}: ${describeAbility(ab)}`}
              >
                {abMeta.emoji}
              </div>
            )
          })}
        </div>
      )}

      {/* Actor turn indicator badge */}
      {isActor && !slot.isDead && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-lg">
          <span className="text-[9px] font-black text-black leading-none">⚔</span>
        </div>
      )}
    </div>
  )
}

// ─── ActiveAbilityCard ────────────────────────────────────────────────────────

function ActiveAbilityCard({ info }: { info: ActiveAbilityInfo | null }) {
  if (!info) {
    return (
      <div className="h-16 rounded-xl border border-white/5 bg-white/2 flex items-center justify-center">
        <p className="text-white/15 text-xs">Esperando turno...</p>
      </div>
    )
  }

  const meta = archMeta(info.archetype)
  const ab   = ABILITY_BY_ID[info.abilityId]
  const desc = ab ? describeAbility(ab) : ''

  let typeLabel = ''
  if (ab) {
    if (ab.type === 'passive') typeLabel = 'PASIVO'
    else if (ab.effect.heal !== undefined) typeLabel = 'CURA'
    else if (ab.effect.damage !== undefined) typeLabel = 'ATAQUE'
    else typeLabel = 'EFECTO'
  }

  return (
    <div className={`rounded-xl border p-3 ${meta.border} ${meta.bg} transition-all duration-300`}>
      <div className="flex items-start justify-between gap-2">
        {/* Left: archetype + name + description */}
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="text-xl leading-none flex-shrink-0 mt-0.5">{meta.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-bold ${meta.text}`}>{info.abilityName}</span>
              {typeLabel && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${meta.border} ${meta.text} opacity-60`}>
                  {typeLabel}
                </span>
              )}
            </div>
            {desc && (
              <p className="text-[10px] text-white/35 mt-0.5 leading-snug">{desc}</p>
            )}
          </div>
        </div>

        {/* Right: actor + results */}
        <div className="text-right flex-shrink-0 min-w-[80px]">
          <p className="text-[9px] text-white/25 mb-0.5">{info.actorName ?? '?'}</p>
          {info.resultLines.slice(0, 2).map((line, i) => (
            <p key={i} className="text-xs font-semibold text-white/65 leading-snug">{line}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── LogLine ──────────────────────────────────────────────────────────────────

function LogLine({ entry, isNew }: { entry: ActionLogEntry; isNew: boolean }) {
  const lines = resultLines(entry)
  const line  = lines[0] ?? ''
  let color = 'text-white/40'
  if (line.includes('HP'))       color = 'text-emerald-400/70'
  else if (line.includes('Bloqueado')) color = 'text-amber-400/60'
  else if (line.includes('daño'))      color = 'text-red-400/70'
  else if (line.includes('Aturde') || line.includes('Aturdido')) color = 'text-purple-400/60'

  return (
    <div className={`flex items-center gap-1.5 text-xs ${isNew ? 'opacity-100' : 'opacity-45'}`}>
      <span className="text-white/25 flex-shrink-0 w-6">T{entry.turn}</span>
      <span className="text-white/55 truncate max-w-[72px]">{entry.actorName ?? '?'}</span>
      <span className="text-white/20">›</span>
      <span className="text-white/45 flex-shrink-0 truncate max-w-[64px]">{entry.abilityName}</span>
      <span className="text-white/20">›</span>
      <span className={`${color} truncate flex-1`}>{line}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BattleField({ battleId, initialState, onComplete }: Props) {
  const [displayState,   setDisplayState]   = useState<BattleState>(initialState)
  const [snapshots,      setSnapshots]      = useState<TurnSnapshot[]>([])
  const [step,           setStep]           = useState(-1)
  const [speedIdx,       setSpeedIdx]       = useState(0)
  const [fetching,       setFetching]       = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [currentLog,     setCurrentLog]     = useState<ActionLogEntry[]>([])
  const [actorIndex,     setActorIndex]     = useState(initialState.turnIndex)
  const [animInfo,       setAnimInfo]       = useState<AnimInfo | null>(null)
  const [activeAbility,  setActiveAbility]  = useState<ActiveAbilityInfo | null>(null)
  const [floatNums,      setFloatNums]      = useState<Map<string, FloatNum[]>>(new Map())

  const finalStateRef = useRef<BattleState>(initialState)
  const snapshotsRef  = useRef<TurnSnapshot[]>([])
  const completedRef  = useRef(false)
  const baseSlotsRef  = useRef(initialState.slots)
  const rewardsRef    = useRef<BattleRewards | undefined>(undefined)

  // DOM refs para WAAPI
  const cardRefs   = useRef<Map<string, HTMLDivElement>>(new Map())
  const avatarRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const mySlots    = displayState.slots.filter(s => s.side === 'attacker')
  const enemySlots = displayState.slots.filter(s => s.side === 'defender')
  const myAura     = displayState.auras.find(a => a.side === 'attacker')
  const enemyAura  = displayState.auras.find(a => a.side === 'defender')

  // ── Fetch all turns at once ────────────────────────────────────────────────
  useEffect(() => {
    if (initialState.status === 'completed') {
      setFetching(false)
      if (!completedRef.current) {
        completedRef.current = true
        setTimeout(() => onComplete(initialState.winnerId !== null, rewardsRef.current), 3000)
      }
      return
    }
    fetch(`/api/pvp/${battleId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        finalStateRef.current = data.state as BattleState
        snapshotsRef.current  = data.snapshots as TurnSnapshot[]
        baseSlotsRef.current  = (data.state as BattleState).slots
        if (data.mmrDelta !== undefined) {
          rewardsRef.current = {
            mmrDelta: data.mmrDelta, newMmr: data.newMmr, rank: data.rank,
            goldEarned: data.goldEarned, weeklyPvpWins: data.weeklyPvpWins,
          }
        }
        setSnapshots(data.snapshots)
        setFetching(false)
        setStep(0)
      })
      .catch(() => setError('Error al cargar la batalla.'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step-by-step animation loop ───────────────────────────────────────────
  useEffect(() => {
    if (fetching || step < 0) return
    const snaps = snapshotsRef.current
    if (step >= snaps.length) return

    const delay = SPEED_OPTIONS[speedIdx].ms
    const timer = setTimeout(() => {
      const snap = snaps[step]
      if (!snap) return

      setActorIndex(snap.actorIndex)
      setDisplayState(prev => applySnapshot(prev, snap))
      setCurrentLog(prev => [...prev, snap.logEntry])

      // Active ability card — Phase 2
      const actorBase = baseSlotsRef.current[snap.actorIndex]
      setActiveAbility({
        abilityId:   snap.logEntry.abilityId,
        abilityName: snap.logEntry.abilityName,
        archetype:   actorBase?.archetype ?? 'forestal',
        actorName:   snap.logEntry.actorName,
        resultLines: resultLines(snap.logEntry),
      })

      // Float damage numbers — Phase 3
      const isStun    = snap.logEntry.abilityId === 'stun'
      const hasTarget = snap.logEntry.targetIds.length > 0 && !isStun
      const isHeal    = hasTarget && snap.logEntry.results[0]?.heal !== undefined

      if (hasTarget) {
        const newFloats = new Map<string, FloatNum[]>()
        for (const result of snap.logEntry.results) {
          let label = ''
          let color = 'text-red-400'
          if (result.damage !== undefined) {
            label = result.blocked ? `✦${result.damage}` : `${result.damage}`
            color = result.blocked ? 'text-amber-400' : 'text-red-400'
          } else if (result.heal !== undefined) {
            label = `+${result.heal}`
            color = 'text-emerald-400'
          } else if (result.stun) {
            label = '😵'
            color = 'text-purple-400'
          }
          if (label) {
            const id = ++floatCounter
            const prev = newFloats.get(result.targetId) ?? []
            newFloats.set(result.targetId, [...prev, { id, therianId: result.targetId, label, color }])
          }
        }
        setFloatNums(newFloats)
        setTimeout(() => setFloatNums(new Map()), 1200)
      }

      setAnimInfo(hasTarget && actorBase ? {
        actorId:   actorBase.therianId,
        targetIds: snap.logEntry.targetIds,
        actorSide: actorBase.side,
        isHeal,
        frame:     step,
      } : null)

      const next = step + 1
      if (next >= snaps.length) {
        if (!completedRef.current) {
          completedRef.current = true
          setTimeout(() => onComplete(snap.winnerId !== null, rewardsRef.current), 2500)
        }
      } else {
        setStep(next)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [step, fetching, speedIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── WAAPI: avatar lunges toward target ────────────────────────────────────
  useEffect(() => {
    if (!animInfo) return
    const { actorId, targetIds, actorSide, isHeal } = animInfo

    const actorCardEl = cardRefs.current.get(actorId)
    const avatarEl    = avatarRefs.current.get(actorId)

    // Elevate z-index so the card crosses above siblings
    if (actorCardEl) {
      actorCardEl.style.position = 'relative'
      actorCardEl.style.zIndex   = '50'
      setTimeout(() => { if (actorCardEl) actorCardEl.style.zIndex = '' }, 750)
      actorCardEl.animate(
        [
          { boxShadow: '0 0 0 2px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.3)', offset: 0 },
          { boxShadow: '0 0 0 1px rgba(255,255,255,0.2)', offset: 0.40 },
          { boxShadow: 'none', offset: 1 },
        ],
        { duration: 450 },
      )
    }

    const animDuration = isHeal ? 520 : 680
    if (avatarEl && targetIds.length > 0) {
      const sourceRect = avatarEl.getBoundingClientRect()
      const sourceCx   = sourceRect.left + sourceRect.width  / 2
      const sourceCy   = sourceRect.top  + sourceRect.height / 2

      const targetRects: DOMRect[] = []
      for (const tid of targetIds) {
        const el = cardRefs.current.get(tid)
        if (el) targetRects.push(el.getBoundingClientRect())
      }

      if (targetRects.length > 0) {
        const targetCx = targetRects.reduce((s, r) => s + r.left + r.width  / 2, 0) / targetRects.length
        const targetCy = targetRects.reduce((s, r) => s + r.top  + r.height / 2, 0) / targetRects.length
        const dx   = targetCx - sourceCx
        const dy   = targetCy - sourceCy
        const dist = Math.hypot(dx, dy)
        const reach = dist > 44 ? (dist - 22) / dist : 0.5
        const fx    = dx * reach
        const fy    = dy * reach
        const rot   = actorSide === 'attacker' ? 14 : -14

        avatarEl.animate(
          [
            { transform: 'translate(0,0) scale(1) rotate(0deg)',                                                                   offset: 0    },
            { transform: `translate(${fx*.78}px,${fy*.78}px) scale(${isHeal?1.1:1.22}) rotate(${isHeal?4:rot}deg)`,               offset: 0.30 },
            { transform: `translate(${fx}px,${fy}px) scale(${isHeal?1.06:0.82}) rotate(${isHeal?0:rot*-.55}deg)`,                 offset: 0.50 },
            { transform: `translate(${fx*.42}px,${fy*.42}px) scale(1.06) rotate(0deg)`,                                           offset: 0.72 },
            { transform: 'translate(0,0) scale(1) rotate(0deg)',                                                                   offset: 1    },
          ],
          { duration: animDuration, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' },
        )
      }
    }

    // Flash + shake on target cards
    const impactDelay = Math.round(animDuration * 0.46)
    for (const targetId of targetIds) {
      const cardEl = cardRefs.current.get(targetId)
      if (!cardEl) continue

      if (isHeal) {
        cardEl.animate(
          [
            { boxShadow: 'none', offset: 0 },
            { boxShadow: 'inset 0 0 0 2px rgba(52,211,153,0.95),0 0 26px rgba(52,211,153,0.65)', offset: 0.28 },
            { boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.3)', offset: 0.65 },
            { boxShadow: 'none', offset: 1 },
          ],
          { duration: 620, delay: impactDelay },
        )
      } else {
        cardEl.animate(
          [
            { boxShadow: 'none', offset: 0 },
            { boxShadow: 'inset 0 0 0 2px rgba(239,68,68,0.95),0 0 26px rgba(239,68,68,0.75)', offset: 0.22 },
            { boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.3)', offset: 0.58 },
            { boxShadow: 'none', offset: 1 },
          ],
          { duration: 560, delay: impactDelay },
        )
        cardEl.animate(
          [
            { transform: 'translateX(0)',               offset: 0    },
            { transform: 'translateX(-9px) rotate(-2deg)', offset: 0.14 },
            { transform: 'translateX(9px) rotate(2deg)',  offset: 0.28 },
            { transform: 'translateX(-5px)',               offset: 0.44 },
            { transform: 'translateX(5px)',                offset: 0.60 },
            { transform: 'translateX(-2px)',               offset: 0.80 },
            { transform: 'translateX(0)',               offset: 1    },
          ],
          { duration: 460, delay: impactDelay + 20 },
        )
      }
    }
  }, [animInfo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Skip to end ───────────────────────────────────────────────────────────
  function handleSkip() {
    if (fetching) return
    const snaps = snapshotsRef.current
    if (!snaps.length) return
    const last = snaps[snaps.length - 1]
    setDisplayState(applySnapshot(finalStateRef.current, last))
    setCurrentLog(snaps.map(s => s.logEntry))
    setActorIndex(last.actorIndex)
    setAnimInfo(null)
    setFloatNums(new Map())
    setStep(snaps.length)
    if (!completedRef.current) {
      completedRef.current = true
      setTimeout(() => onComplete(last.winnerId !== null, rewardsRef.current), 1500)
    }
  }

  const isFinished = step >= snapshots.length && !fetching && snapshots.length > 0
  const progress   = snapshots.length > 0 ? Math.round((Math.max(0, step) / snapshots.length) * 100) : 0

  function makeCardRefFn(id: string) {
    return (el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(id, el)
      else    cardRefs.current.delete(id)
    }
  }
  function makeAvatarRefFn(id: string) {
    return (el: HTMLDivElement | null) => {
      if (el) avatarRefs.current.set(id, el)
      else    avatarRefs.current.delete(id)
    }
  }

  const won = displayState.winnerId !== null

  return (
    <div className="space-y-3">
      {/* Float number keyframe */}
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0)    scale(1);    }
          60%  { opacity: 1; transform: translateY(-36px) scale(1.15); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.85); }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/40 text-xs">Ronda {displayState.round}</span>

        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          fetching
            ? 'border-white/20 bg-white/5 text-white/40 animate-pulse'
            : isFinished
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-400 animate-pulse'
        }`}>
          {fetching ? '⏳ Cargando...' : isFinished ? '✅ Resuelta' : `⚔️ ${step + 1}/${snapshots.length}`}
        </span>

        {/* Speed + skip controls */}
        {!fetching && !isFinished && (
          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setSpeedIdx(i)}
                className={`text-xs px-1.5 py-0.5 rounded border transition-all ${
                  speedIdx === i
                    ? 'border-white/40 bg-white/10 text-white/80'
                    : 'border-white/10 bg-white/3 text-white/30 hover:border-white/20 hover:text-white/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={handleSkip}
              className="text-xs px-1.5 py-0.5 rounded border border-white/10 bg-white/3 text-white/30 hover:border-white/20 hover:text-white/50 transition-all ml-0.5"
            >
              ⏭
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!fetching && snapshots.length > 0 && (
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-white/20 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ── Phase 1: Arena ── */}
      <div className="relative rounded-2xl border border-white/8 bg-[#080810] overflow-visible">
        {/* Atmospheric side glows */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-blue-900/15 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-red-900/15 to-transparent" />
        </div>

        {/* Aura name badges */}
        {(myAura || enemyAura) && (
          <div className="relative flex justify-between px-3 pt-2 pb-0 gap-2">
            {myAura
              ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">{getAuraLabel(myAura)}</span>
              : <span />}
            {enemyAura
              ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">{getAuraLabel(enemyAura)}</span>
              : <span />}
          </div>
        )}

        {/* Characters face-to-face */}
        <div className="relative flex items-start gap-1 px-2 py-3">
          {/* Attacker column */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <p className="text-[9px] text-white/20 uppercase tracking-widest text-center">Tu equipo</p>
            {mySlots.map(slot => (
              <ArenaSlot
                key={slot.therianId}
                slot={slot}
                isActor={displayState.slots.indexOf(slot) === actorIndex}
                isNext={displayState.slots.indexOf(slot) === displayState.turnIndex}
                onCardRef={makeCardRefFn(slot.therianId)}
                onAvatarRef={makeAvatarRefFn(slot.therianId)}
                mirrored={false}
                floats={floatNums.get(slot.therianId) ?? []}
              />
            ))}
          </div>

          {/* VS center divider */}
          <div className="flex flex-col items-center justify-center self-stretch pt-7 gap-1 px-0.5 flex-shrink-0">
            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-white/8 to-transparent" />
            <span className="text-white/15 text-[9px] font-black tracking-widest">VS</span>
            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-white/8 to-transparent" />
          </div>

          {/* Defender column (avatars mirrored) */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <p className="text-[9px] text-white/20 uppercase tracking-widest text-center">Rival</p>
            {enemySlots.map(slot => (
              <ArenaSlot
                key={slot.therianId}
                slot={slot}
                isActor={displayState.slots.indexOf(slot) === actorIndex}
                isNext={displayState.slots.indexOf(slot) === displayState.turnIndex}
                onCardRef={makeCardRefFn(slot.therianId)}
                onAvatarRef={makeAvatarRefFn(slot.therianId)}
                mirrored={true}
                floats={floatNums.get(slot.therianId) ?? []}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Turn queue ── */}
      <div className="bg-white/3 border border-white/5 rounded-xl px-3 py-2">
        <p className="text-white/20 text-[9px] text-center mb-1.5 uppercase tracking-widest">Orden de turno</p>
        <TurnQueueBar
          slots={displayState.slots}
          turnIndex={displayState.turnIndex}
          actorIndex={actorIndex}
        />
      </div>

      {/* ── Phase 2: Active ability card ── */}
      {!fetching && <ActiveAbilityCard info={activeAbility} />}

      {/* Error */}
      {error && (
        <p className="text-red-400/80 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
          {error}
        </p>
      )}

      {/* Compact combat log */}
      {currentLog.length > 0 && (
        <div className="bg-white/3 border border-white/5 rounded-xl p-3 space-y-1.5">
          <p className="text-white/20 text-[9px] uppercase tracking-widest mb-1.5">Registro</p>
          {[...currentLog].reverse().slice(0, 4).map((entry, i) => (
            <LogLine key={currentLog.length - 1 - i} entry={entry} isNew={i === 0} />
          ))}
        </div>
      )}

      {/* Result overlay */}
      {isFinished && displayState.status === 'completed' && (
        <div className={`text-center py-8 rounded-2xl border-2 space-y-3 ${
          won
            ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-amber-500/5 shadow-[0_0_40px_rgba(252,211,77,0.15)]'
            : 'border-red-500/40  bg-gradient-to-b from-red-500/10  to-red-500/5  shadow-[0_0_40px_rgba(239,68,68,0.12)]'
        }`}>
          <div className="text-6xl leading-none">{won ? '🏆' : '💀'}</div>
          <div>
            <p className={`text-2xl font-bold ${won ? 'text-amber-300' : 'text-red-300'}`}>
              {won ? '¡Victoria!' : 'Derrota'}
            </p>
            <p className="text-white/35 text-sm mt-1">
              {won ? 'Derrotaste al rival.' : 'Tu equipo fue eliminado.'}
            </p>
          </div>
          <p className="text-white/20 text-xs animate-pulse">Redirigiendo...</p>
        </div>
      )}
    </div>
  )
}
