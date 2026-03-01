'use client'

import { useState, useEffect, useRef } from 'react'
import type { BattleState, TurnSlot, TurnSnapshot, ActionLogEntry, AvatarSnapshot } from '@/lib/pvp/types'
import TherianAvatar from '@/components/TherianAvatar'
import type { TherianDTO } from '@/lib/therian-dto'

interface Props {
  battleId: string
  initialState: BattleState
  onComplete: (won: boolean) => void
}

interface AnimInfo {
  actorId:   string
  targetIds: string[]
  actorSide: 'attacker' | 'defender'
  isHeal:    boolean
  frame:     number
}

// ─── Archetype helpers ──────────────────────────────────────────────────────

const ARCH_META = {
  forestal:  { emoji: '🌿', border: 'border-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  electrico: { emoji: '⚡', border: 'border-yellow-500/50',  text: 'text-yellow-400',  bg: 'bg-yellow-500/15' },
  acuatico:  { emoji: '💧', border: 'border-blue-500/50',    text: 'text-blue-400',    bg: 'bg-blue-500/15'  },
  volcanico: { emoji: '🔥', border: 'border-orange-500/50',  text: 'text-orange-400',  bg: 'bg-orange-500/15'},
} as const

function archMeta(archetype: string) {
  return ARCH_META[archetype as keyof typeof ARCH_META] ?? ARCH_META.forestal
}

const AURA_LABEL_FALLBACK: Record<string, string> = {
  hp:      '🌿 Vitalidad',
  damage:  '🔥 Combate',
  defense: '💧 Escudo',
  agility: '⚡ Celeridad',
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

// ─── Avatar ──────────────────────────────────────────────────────────────────

function SlotAvatar({ slot }: { slot: TurnSlot }) {
  const snap: AvatarSnapshot | undefined = slot.avatarSnapshot
  const meta = archMeta(slot.archetype)

  if (!snap) {
    return (
      <div className="w-16 h-16 flex items-center justify-center text-4xl">
        {meta.emoji}
      </div>
    )
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

// ─── HP Bar ──────────────────────────────────────────────────────────────────

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, (current / max) * 100)
  const color = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Turn Queue Bar ──────────────────────────────────────────────────────────

function TurnQueueBar({
  slots, turnIndex, actorIndex,
}: { slots: TurnSlot[]; turnIndex: number; actorIndex: number }) {
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
    <div className="flex items-center justify-center gap-1">
      {attackers.map(s => <Chip key={s.therianId} slot={s} />)}
      <span className="text-white/20 text-xs mx-1.5">|</span>
      {defenders.map(s => <Chip key={s.therianId} slot={s} />)}
    </div>
  )
}

// ─── Slot Card ───────────────────────────────────────────────────────────────

function SlotCard({
  slot, isActor, isNext, onCardRef, onAvatarRef,
}: {
  slot:        TurnSlot
  isActor:     boolean
  isNext:      boolean
  onCardRef:   (el: HTMLDivElement | null) => void
  onAvatarRef: (el: HTMLDivElement | null) => void
}) {
  const meta = archMeta(slot.archetype)

  return (
    <div
      ref={onCardRef}
      className={`relative rounded-xl border p-2 transition-colors transition-opacity duration-500 ${
        slot.isDead
          ? 'opacity-20 grayscale border-white/5 bg-white/3'
          : isActor
            ? `${meta.border} ${meta.bg} ring-2 ring-white/60 shadow-[0_0_18px_rgba(255,255,255,0.1)]`
            : isNext
              ? `${meta.border} bg-white/5 ring-1 ring-white/15`
              : 'border-white/10 bg-white/3'
      }`}
    >
      {/* Nombre + indicador de turno */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm leading-none">{meta.emoji}</span>
        <span className="text-xs font-medium text-white/80 truncate flex-1">
          {slot.name ?? slot.archetype}
        </span>
        {isActor && !slot.isDead && (
          <span className="text-[11px] font-bold text-white/80 animate-pulse">⚔</span>
        )}
      </div>

      {/* HP */}
      <HpBar current={slot.currentHp} max={slot.maxHp} />
      <div className="flex justify-between mt-1 mb-2">
        <span className="text-[10px] text-white/30">{slot.currentHp}/{slot.maxHp}</span>
        {slot.effects.length > 0 && (
          <span className="text-[10px] text-amber-400/60">
            {slot.effects.map(e => e.type === 'stun' ? '😵' : e.type === 'buff' ? '↑' : '↓').join('')}
          </span>
        )}
      </div>

      {/* Avatar — ref para movimiento de ataque */}
      <div
        ref={onAvatarRef}
        className={`flex justify-center ${slot.isDead ? 'opacity-30' : ''}`}
        style={{ willChange: 'transform' }}
      >
        <SlotAvatar slot={slot} />
      </div>
    </div>
  )
}

// ─── Log ─────────────────────────────────────────────────────────────────────

function LogLine({ entry, isNew }: { entry: ActionLogEntry; isNew: boolean }) {
  const first = entry.results[0]
  let text = '', color = 'text-white/40'

  if (entry.abilityId === 'stun') {
    text = 'aturdido'; color = 'text-white/30'
  } else if (first) {
    if (first.damage !== undefined) {
      text  = first.blocked ? `bloqueó (${first.damage})` : `${first.damage} dmg${first.died ? ' 💀' : ''}`
      color = first.blocked ? 'text-amber-400/60' : 'text-red-400/70'
    } else if (first.heal !== undefined) {
      text = `+${first.heal} HP`; color = 'text-emerald-400/70'
    } else if (first.stun) {
      text = `aturde ${first.stun}t`; color = 'text-purple-400/60'
    } else if (first.effect) {
      text = first.effect; color = 'text-yellow-400/60'
    }
    if (entry.results.length > 1) {
      const total = entry.results.reduce((s, r) => s + (r.damage ?? 0), 0)
      if (total > 0) { text = `${total} total${entry.results.some(r => r.died) ? ' 💀' : ''}`; color = 'text-red-400/70' }
    }
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs ${isNew ? 'opacity-100' : 'opacity-45'}`}>
      <span className="text-white/25 flex-shrink-0 w-6">T{entry.turn}</span>
      <span className="text-white/55 truncate max-w-[72px]">{entry.actorName ?? '?'}</span>
      <span className="text-white/20">›</span>
      <span className="text-white/45 flex-shrink-0 truncate max-w-[64px]">{entry.abilityName}</span>
      <span className="text-white/20">›</span>
      <span className={`${color} truncate flex-1`}>{text}</span>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applySnapshot(base: BattleState, snap: TurnSnapshot): BattleState {
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BattleField({ battleId, initialState, onComplete }: Props) {
  const [displayState, setDisplayState] = useState<BattleState>(initialState)
  const [snapshots, setSnapshots]       = useState<TurnSnapshot[]>([])
  const [step, setStep]                 = useState(-1)
  const [speedIdx, setSpeedIdx]         = useState(0)
  const [fetching, setFetching]         = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [currentLog, setCurrentLog]     = useState<ActionLogEntry[]>([])
  const [actorIndex, setActorIndex]     = useState(initialState.turnIndex)
  const [animInfo, setAnimInfo]         = useState<AnimInfo | null>(null)

  const finalStateRef  = useRef<BattleState>(initialState)
  const snapshotsRef   = useRef<TurnSnapshot[]>([])
  const completedRef   = useRef(false)
  const baseSlotsRef   = useRef(initialState.slots)

  // DOM refs para WAAPI
  const cardRefs   = useRef<Map<string, HTMLDivElement>>(new Map())
  const avatarRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const mySlots    = displayState.slots.filter(s => s.side === 'attacker')
  const enemySlots = displayState.slots.filter(s => s.side === 'defender')
  const myAura     = displayState.auras.find(a => a.side === 'attacker')
  const enemyAura  = displayState.auras.find(a => a.side === 'defender')

  // ── Fetch completo ────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialState.status === 'completed') {
      setFetching(false)
      if (!completedRef.current) {
        completedRef.current = true
        setTimeout(() => onComplete(initialState.winnerId !== null), 3000)
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
        setSnapshots(data.snapshots)
        setFetching(false)
        setStep(0)
      })
      .catch(() => setError('Error al cargar la batalla.'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loop de animación paso a paso ─────────────────────────────────────────
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

      const isStun    = snap.logEntry.abilityId === 'stun'
      const hasTarget = snap.logEntry.targetIds.length > 0 && !isStun
      const isHeal    = hasTarget && snap.logEntry.results[0]?.heal !== undefined
      const actorBase = baseSlotsRef.current[snap.actorIndex]

      setAnimInfo(hasTarget && actorBase ? {
        actorId:   actorBase.therianId,
        targetIds: snap.logEntry.targetIds,
        actorSide: actorBase.side,
        isHeal,
        frame: step,
      } : null)

      const next = step + 1
      if (next >= snaps.length) {
        if (!completedRef.current) {
          completedRef.current = true
          setTimeout(() => onComplete(snap.winnerId !== null), 2500)
        }
      } else {
        setStep(next)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [step, fetching, speedIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── WAAPI: cruce real hacia el objetivo ───────────────────────────────────
  useEffect(() => {
    if (!animInfo) return
    const { actorId, targetIds, actorSide, isHeal } = animInfo

    const actorCardEl = cardRefs.current.get(actorId)
    const avatarEl    = avatarRefs.current.get(actorId)

    // Elevar z-index de la card atacante para que cruce por encima de las demás
    if (actorCardEl) {
      actorCardEl.style.position = 'relative'
      actorCardEl.style.zIndex   = '50'
      setTimeout(() => { if (actorCardEl) actorCardEl.style.zIndex = '' }, 750)
    }

    // Flash blanco en la card atacante (señal visual de "está atacando")
    if (actorCardEl) {
      actorCardEl.animate(
        [
          { boxShadow: '0 0 0 2px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.3)', offset: 0    },
          { boxShadow: '0 0 0 1px rgba(255,255,255,0.2)',                                  offset: 0.40 },
          { boxShadow: 'none',                                                              offset: 1    },
        ],
        { duration: 450 },
      )
    }

    // Calcular destino del avatar hacia el centro promedio de los objetivos
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

        // Detenerse 22px antes del centro del objetivo (para no solaparse)
        const reach = dist > 44 ? (dist - 22) / dist : 0.5
        const fx    = dx * reach
        const fy    = dy * reach

        const rot = actorSide === 'attacker' ? 14 : -14

        avatarEl.animate(
          [
            { transform: 'translate(0,0) scale(1) rotate(0deg)',                                                                  offset: 0    },
            { transform: `translate(${fx*.78}px,${fy*.78}px) scale(${isHeal?1.1:1.22}) rotate(${isHeal?4:rot}deg)`,              offset: 0.30 },
            { transform: `translate(${fx}px,${fy}px) scale(${isHeal?1.06:0.82}) rotate(${isHeal?0:rot*-.55}deg)`,                offset: 0.50 },
            { transform: `translate(${fx*.42}px,${fy*.42}px) scale(1.06) rotate(0deg)`,                                          offset: 0.72 },
            { transform: 'translate(0,0) scale(1) rotate(0deg)',                                                                  offset: 1    },
          ],
          { duration: animDuration, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' },
        )
      }
    }

    // Flash/shake en objetivos — sincronizados con la llegada del avatar (offset 0.50)
    const impactDelay = Math.round(animDuration * 0.46)
    for (const targetId of targetIds) {
      const cardEl = cardRefs.current.get(targetId)
      if (!cardEl) continue

      if (isHeal) {
        cardEl.animate(
          [
            { boxShadow: 'none',                                                                      offset: 0    },
            { boxShadow: 'inset 0 0 0 2px rgba(52,211,153,0.95),0 0 26px rgba(52,211,153,0.65)',     offset: 0.28 },
            { boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.3)',                                     offset: 0.65 },
            { boxShadow: 'none',                                                                      offset: 1    },
          ],
          { duration: 620, delay: impactDelay },
        )
      } else {
        // Flash rojo
        cardEl.animate(
          [
            { boxShadow: 'none',                                                                             offset: 0    },
            { boxShadow: 'inset 0 0 0 2px rgba(239,68,68,0.95),0 0 26px rgba(239,68,68,0.75)',              offset: 0.22 },
            { boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.3)',                                              offset: 0.58 },
            { boxShadow: 'none',                                                                             offset: 1    },
          ],
          { duration: 560, delay: impactDelay },
        )
        // Shake
        cardEl.animate(
          [
            { transform: 'translateX(0)',                offset: 0    },
            { transform: 'translateX(-9px) rotate(-2deg)', offset: 0.14 },
            { transform: 'translateX(9px) rotate(2deg)',  offset: 0.28 },
            { transform: 'translateX(-5px)',               offset: 0.44 },
            { transform: 'translateX(5px)',                offset: 0.60 },
            { transform: 'translateX(-2px)',               offset: 0.80 },
            { transform: 'translateX(0)',                offset: 1    },
          ],
          { duration: 460, delay: impactDelay + 20 },
        )
      }
    }
  }, [animInfo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Skip ──────────────────────────────────────────────────────────────────
  function handleSkip() {
    if (fetching) return
    const snaps = snapshotsRef.current
    if (!snaps.length) return
    const last = snaps[snaps.length - 1]
    setDisplayState(applySnapshot(finalStateRef.current, last))
    setCurrentLog(snaps.map(s => s.logEntry))
    setActorIndex(last.actorIndex)
    setAnimInfo(null)
    setStep(snaps.length)
    if (!completedRef.current) {
      completedRef.current = true
      setTimeout(() => onComplete(last.winnerId !== null), 1500)
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <span className="text-white/30 text-xs">⚔️ PvP</span>
      </div>

      {/* Progreso */}
      {!fetching && snapshots.length > 0 && (
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-white/20 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Cola de turnos */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-3">
        <p className="text-white/25 text-[10px] text-center mb-2 uppercase tracking-widest">Orden de turno</p>
        <TurnQueueBar slots={displayState.slots} turnIndex={displayState.turnIndex} actorIndex={actorIndex} />
      </div>

      {/* Arena — grid 2 columnas */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tu equipo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/50 text-xs font-medium">Tu equipo</span>
            {myAura && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/35" title={(myAura as any).auraId}>
                {getAuraLabel(myAura)}
              </span>
            )}
          </div>
          {mySlots.map(slot => (
            <SlotCard
              key={slot.therianId}
              slot={slot}
              isActor={displayState.slots.indexOf(slot) === actorIndex}
              isNext={displayState.slots.indexOf(slot) === displayState.turnIndex}
              onCardRef={makeCardRefFn(slot.therianId)}
              onAvatarRef={makeAvatarRefFn(slot.therianId)}
            />
          ))}
        </div>

        {/* Rival */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/50 text-xs font-medium">Rival</span>
            {enemyAura && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/35" title={(enemyAura as any).auraId}>
                {getAuraLabel(enemyAura)}
              </span>
            )}
          </div>
          {enemySlots.map(slot => (
            <SlotCard
              key={slot.therianId}
              slot={slot}
              isActor={displayState.slots.indexOf(slot) === actorIndex}
              isNext={displayState.slots.indexOf(slot) === displayState.turnIndex}
              onCardRef={makeCardRefFn(slot.therianId)}
              onAvatarRef={makeAvatarRefFn(slot.therianId)}
            />
          ))}
        </div>
      </div>

      {/* Controles de velocidad */}
      {!fetching && !isFinished && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-white/25 text-xs">Vel:</span>
          {SPEED_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setSpeedIdx(i)}
              className={`text-xs px-2 py-1 rounded-lg border transition-all ${
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
            className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-white/3 text-white/30 hover:border-white/20 hover:text-white/50 transition-all ml-1"
          >
            ⏭ Skip
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400/80 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
          {error}
        </p>
      )}

      {/* Log */}
      {currentLog.length > 0 && (
        <div className="bg-white/3 border border-white/5 rounded-xl p-3 space-y-1.5">
          <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2">Registro</p>
          {[...currentLog].reverse().slice(0, 5).map((entry, i) => (
            <LogLine key={currentLog.length - 1 - i} entry={entry} isNew={i === 0} />
          ))}
        </div>
      )}

      {/* ── Pantalla de resultado ── */}
      {isFinished && displayState.status === 'completed' && (
        <div
          className={`result-reveal text-center py-8 rounded-2xl border-2 space-y-3 ${
            won
              ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-amber-500/5 shadow-[0_0_40px_rgba(252,211,77,0.15)]'
              : 'border-red-500/40  bg-gradient-to-b from-red-500/10  to-red-500/5  shadow-[0_0_40px_rgba(239,68,68,0.12)]'
          }`}
        >
          <div className="icon-pop text-6xl leading-none">
            {won ? '🏆' : '💀'}
          </div>
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
