'use client'

import { useState, useEffect, useRef } from 'react'
import type { BattleState, TurnSlot, TurnSnapshot, ActionLogEntry, AvatarSnapshot, Aura } from '@/lib/pvp/types'
import type { Ability } from '@/lib/pvp/types'
import { ABILITY_BY_ID } from '@/lib/pvp/abilities'
import { getAuraById } from '@/lib/catalogs/auras'
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
  if (e.damage     !== undefined) parts.push(`Daño base ×${e.damage}`)
  if (e.heal       !== undefined) parts.push(`Curación base ×${e.heal}`)
  if (e.stun       !== undefined) parts.push(`Aturde ${e.stun} turno${e.stun !== 1 ? 's' : ''}`)
  if (e.stunChance !== undefined) parts.push(`${Math.round(e.stunChance * 100)}% chance de aturdir`)
  if (e.dot)                      parts.push(`Veneno: ×${e.dot.damage} daño por ${e.dot.turns} turnos`)
  if (e.shield     !== undefined) parts.push(`Escudo: ${e.shield} HP`)
  if (e.lifeSteal  !== undefined) parts.push(`Roba vida ${Math.round(e.lifeSteal * 100)}%`)
  if (e.multiHit)                 parts.push(`${e.multiHit.count} golpes consecutivos`)
  if (e.execute)                  parts.push(`Ejecuta si HP < ${Math.round(e.execute.threshold * 100)}%`)
  if (e.buff)                     parts.push(`+${Math.round(e.buff.pct * 100)}% ${e.buff.stat} por ${e.buff.turns} turnos`)
  if (e.debuff)                   parts.push(`-${Math.round(e.debuff.pct * 100)}% ${e.debuff.stat} por ${e.debuff.turns} turnos`)
  if (e.thorns     !== undefined) parts.push(`Refleja ${Math.round(e.thorns * 100)}% del daño recibido`)
  if (e.damageReduction !== undefined) parts.push(`Reduce ${Math.round(e.damageReduction * 100)}% el daño recibido`)
  if (e.regen      !== undefined) parts.push(`Regenera ${e.regen} HP/turno`)
  if (e.critBoost  !== undefined) parts.push(`+${Math.round(e.critBoost * 100)}% daño crítico`)
  if (e.immunity)                 parts.push(`Inmune a ${e.immunity === 'debuff' ? 'debuffs' : e.immunity}`)
  if (e.endure)                   parts.push('Sobrevive un golpe fatal con 1 HP')
  if (e.tiebreaker)               parts.push('Actúa primero en empates de velocidad')
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
    turnIndex:  snap.turnIndex,
    round:      snap.round,
    status:     snap.status,
    winnerId:   snap.winnerId,
    ...(snap.frontliner ? { frontliner: snap.frontliner } : {}),
    ...(snap.phase      ? { phase:      snap.phase      } : {}),
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

// Raw CSS values for inline styles (not Tailwind classes)
const ARCH_COLORS: Record<string, { glow: string; ring: string; textColor: string; bgLight: string }> = {
  forestal:  { glow: 'rgba(52,211,153,0.38)',  ring: 'rgba(52,211,153,0.80)',  textColor: '#34D399', bgLight: 'rgba(52,211,153,0.10)' },
  electrico: { glow: 'rgba(250,204,21,0.38)',  ring: 'rgba(250,204,21,0.80)',  textColor: '#FBBF24', bgLight: 'rgba(250,204,21,0.10)' },
  acuatico:  { glow: 'rgba(96,165,250,0.38)',  ring: 'rgba(96,165,250,0.80)',  textColor: '#60A5FA', bgLight: 'rgba(96,165,250,0.10)' },
  volcanico: { glow: 'rgba(251,146,60,0.38)',  ring: 'rgba(251,146,60,0.80)',  textColor: '#FB923C', bgLight: 'rgba(251,146,60,0.10)' },
}
function archColors(archetype: string) {
  return ARCH_COLORS[archetype] ?? ARCH_COLORS.forestal
}

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
  { label: '1×', ms: 2200 },
  { label: '2×', ms: 900  },
  { label: '4×', ms: 350  },
]

// Module-level counter for unique float number IDs
let floatCounter = 0

// ─── SlotAvatar ───────────────────────────────────────────────────────────────

function SlotAvatar({ slot, size = 88 }: { slot: TurnSlot; size?: number }) {
  const snap: AvatarSnapshot | undefined = slot.avatarSnapshot
  const meta = archMeta(slot.archetype)

  if (!snap) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center text-5xl">
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

  return <TherianAvatar therian={fakeDto} size={size} />
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

// ─── TeamChipBar ──────────────────────────────────────────────────────────────

function TeamChipBar({ slots, actorId, spotlightTargetId }: {
  slots: TurnSlot[]
  actorId: string | null
  spotlightTargetId: string | null
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
      {slots.map((slot) => {
        const colors  = archColors(slot.archetype)
        const isActor = slot.therianId === actorId
        const isTgt   = slot.therianId === spotlightTargetId
        const hpPct   = slot.maxHp > 0 ? Math.max(0, slot.currentHp / slot.maxHp) : 0
        const hpColor = hpPct > 0.55 ? '#10B981' : hpPct > 0.28 ? '#F59E0B' : '#EF4444'
        return (
          <div key={slot.therianId} style={{
            position:'relative', width:34, height:34, borderRadius:'50%', flexShrink:0,
            border:`2px solid ${isActor ? colors.ring : isTgt ? 'rgba(239,68,68,0.75)' : 'rgba(255,255,255,0.10)'}`,
            background: slot.isDead ? 'rgba(255,255,255,0.03)' : colors.bgLight,
            display:'flex', alignItems:'center', justifyContent:'center',
            opacity: slot.isDead ? 0.28 : 1,
            filter: slot.isDead ? 'grayscale(1)' : 'none',
            boxShadow: isActor ? `0 0 10px ${colors.ring}` : isTgt ? '0 0 10px rgba(239,68,68,0.55)' : 'none',
            transition:'all 0.35s ease',
          }}>
            <span style={{ fontSize:15, lineHeight:1 }}>{archMeta(slot.archetype).emoji}</span>
            {/* Mini HP bar at bottom of chip */}
            <div style={{ position:'absolute', bottom:2, left:4, right:4, height:2, borderRadius:2, background:'rgba(0,0,0,0.4)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${hpPct*100}%`, background:hpColor, borderRadius:2, transition:'width 0.6s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PortraitBar ──────────────────────────────────────────────────────────────

function PortraitBar({ slots, activeSlotId, label, labelColor, direction = 'row', onSwitch, switchCooldownEnd, canSwitch, bypassCooldown }: {
  slots:             TurnSlot[]
  activeSlotId:      string | null
  label:             string
  labelColor:        string
  direction?:        'row' | 'column'
  onSwitch?:         (therianId: string) => void
  switchCooldownEnd?: number | null
  canSwitch?:        boolean
  bypassCooldown?:   boolean
}) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!switchCooldownEnd || switchCooldownEnd <= Date.now()) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [switchCooldownEnd])

  const remaining  = switchCooldownEnd ? Math.max(0, Math.ceil((switchCooldownEnd - now) / 1000)) : 0
  const inCooldown = remaining > 0 && !bypassCooldown

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <span style={{ fontSize:8, color:labelColor, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2 }}>{label}</span>
      <div style={{ display:'flex', flexDirection: direction === 'column' ? 'column' : 'row', gap: direction === 'column' ? 6 : 5 }}>
        {slots.map(slot => {
          const colors    = archColors(slot.archetype)
          const hpPct     = slot.maxHp > 0 ? Math.max(0, slot.currentHp / slot.maxHp) : 0
          const hpColor   = hpPct > 0.55 ? '#10B981' : hpPct > 0.28 ? '#F59E0B' : '#EF4444'
          const isActive  = slot.therianId === activeSlotId
          const isBench   = !isActive && !slot.isDead
          const clickable = isBench && !!onSwitch && !!canSwitch && !inCooldown
          return (
            <div key={slot.therianId} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              {/* Active indicator dot */}
              <div style={{
                width:5, height:5, borderRadius:'50%',
                background: isActive && !slot.isDead ? '#FFFFFF' : 'transparent',
                boxShadow: isActive && !slot.isDead ? '0 0 6px rgba(255,255,255,0.9)' : 'none',
              }} />
              {/* Portrait circle */}
              <div
                onClick={() => { if (clickable) onSwitch!(slot.therianId) }}
                title={clickable ? `Cambiar a ${slot.name ?? slot.archetype}` : undefined}
                style={{
                  width:46, height:46, borderRadius:'50%', overflow:'hidden', flexShrink:0,
                  border:`2px solid ${
                    isActive && !slot.isDead ? colors.ring
                      : slot.isDead ? 'rgba(255,255,255,0.06)'
                      : clickable ? colors.ring.replace('0.80','0.55')
                      : 'rgba(255,255,255,0.12)'
                  }`,
                  background: slot.isDead ? 'rgba(0,0,0,0.40)' : colors.bgLight,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  opacity: slot.isDead ? 0.35 : 1,
                  filter: slot.isDead ? 'grayscale(1)' : 'none',
                  boxShadow: isActive && !slot.isDead
                    ? `0 0 14px ${colors.ring}, 0 0 5px ${colors.glow}`
                    : clickable ? `0 0 12px ${colors.glow.replace('0.38','0.30')}` : 'none',
                  transition:'all 0.25s ease',
                  position:'relative',
                  cursor: clickable ? 'pointer' : 'default',
                  transform: clickable ? 'scale(1.06)' : 'scale(1)',
                }}>
                <SlotAvatar slot={slot} size={44} />
                {slot.isDead && (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, background:'rgba(0,0,0,0.45)', borderRadius:'50%' }}>💀</div>
                )}
                {/* Cooldown countdown overlay on bench portraits */}
                {isBench && inCooldown && (
                  <div style={{
                    position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                    background:'rgba(0,0,0,0.68)', borderRadius:'50%',
                    fontSize:15, fontWeight:900, color:'rgba(255,255,255,0.88)',
                    textShadow:'0 0 8px rgba(255,255,255,0.5)',
                    pointerEvents:'none',
                  }}>
                    {remaining}
                  </div>
                )}
              </div>
              {/* HP bar */}
              <div style={{ width:46, height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${hpPct*100}%`, background:hpColor, borderRadius:2, transition:'width 0.6s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AbilityCardsRow ──────────────────────────────────────────────────────────

function AbilityCardsRow({ slot, onInspect, inspectedAbilityId }: {
  slot:               TurnSlot | null
  onInspect:          (id: string | null) => void
  inspectedAbilityId: string | null
}) {
  if (!slot || slot.equippedAbilities.length === 0) return null
  return (
    <div style={{ display:'flex', gap:6 }}>
      {slot.equippedAbilities.slice(0, 4).map(id => {
        const ab    = ABILITY_BY_ID[id]
        if (!ab) return null
        const theme = ARCH_CARD_THEME[ab.archetype] ?? DEFAULT_CARD_THEME
        const abMeta = archMeta(ab.archetype)
        const isAct  = inspectedAbilityId === id
        return (
          <button
            key={id}
            onClick={() => onInspect(isAct ? null : id)}
            title={describeAbility(ab)}
            style={{
              flex:'1 1 0', minWidth:0,
              background: isAct ? theme.cardBg : 'rgba(255,255,255,0.03)',
              border:`1.5px solid ${isAct ? theme.borderColor : 'rgba(255,255,255,0.08)'}`,
              borderRadius:10, padding:'9px 6px', cursor:'pointer', textAlign:'center',
              transform: isAct ? 'translateY(-3px) scale(1.04)' : 'translateY(0) scale(1)',
              boxShadow: isAct ? `0 0 18px ${theme.glowColor}` : 'none',
              transition:'all 0.18s ease',
              display:'flex', flexDirection:'column', alignItems:'center', gap:5,
            }}
          >
            <span style={{ fontSize:22, lineHeight:1 }}>{abMeta.emoji}</span>
            <span style={{
              fontSize:9, fontWeight:700, lineHeight:1.2, textAlign:'center',
              color: isAct ? theme.textColor : 'rgba(255,255,255,0.55)',
              overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:'100%',
            }}>
              {ab.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── SpotlightSlot ────────────────────────────────────────────────────────────

function SpotlightSlot({ slot, side, onCardRef, onAvatarRef, floats, onInspect, inspectedAbilityId }: {
  slot:               TurnSlot
  side:               'left' | 'right'   // left=attacker, right=target — controls facing
  onCardRef:          (el: HTMLDivElement | null) => void
  onAvatarRef:        (el: HTMLDivElement | null) => void
  floats:             FloatNum[]
  onInspect:          (id: string | null) => void
  inspectedAbilityId: string | null
}) {
  const colors  = archColors(slot.archetype)
  const meta    = archMeta(slot.archetype)
  const hpPct   = slot.maxHp > 0 ? Math.max(0, slot.currentHp / slot.maxHp) : 0
  const hpColor = hpPct > 0.55 ? '#10B981' : hpPct > 0.28 ? '#F59E0B' : '#EF4444'
  // left side faces right (normal); right side faces left (mirrored)
  const mirrored = side === 'right'
  const [hoveredAbilityId, setHoveredAbilityId] = useState<string | null>(null)

  return (
    <div
      ref={onCardRef}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        flex:1, minWidth:0, maxWidth:'46%',
        opacity: slot.isDead ? 0.32 : 1,
        filter:  slot.isDead ? 'grayscale(0.85)' : 'none',
        transition:'opacity 0.4s ease, filter 0.4s ease',
      }}
    >
      {/* Archetype tag */}
      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:colors.textColor, opacity:0.75, marginBottom:4 }}>
        {meta.emoji} {slot.archetype}
      </div>

      {/* Name */}
      <div style={{ fontSize:13, fontWeight:800, color:'rgba(255,255,255,0.92)', marginBottom:5, textAlign:'center', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textShadow:`0 0 12px ${colors.glow}` }}>
        {slot.name ?? slot.archetype}
      </div>

      {/* HP numbers */}
      <div style={{ display:'flex', alignItems:'baseline', gap:3, marginBottom:5 }}>
        <span style={{ fontSize:16, fontWeight:900, color:hpColor, lineHeight:1 }}>{slot.currentHp}</span>
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.22)' }}>/{slot.maxHp}</span>
        {/* Active effects */}
        {slot.effects.map((e, i) => (
          <span key={i} style={{ fontSize:12 }}>
            {e.type === 'stun' ? '😵' : e.type === 'buff' ? '⬆' : '⬇'}
          </span>
        ))}
      </div>

      {/* HP bar */}
      <div style={{ width:'85%', height:5, background:'rgba(255,255,255,0.07)', borderRadius:4, marginBottom:10, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${hpPct*100}%`, background:hpColor, borderRadius:4, transition:'width 0.7s ease, background 0.5s ease', boxShadow:`0 0 6px ${hpColor}60` }} />
      </div>

      {/* Avatar */}
      <div style={{ position:'relative' }}>
        {/* Archetype aura ring behind avatar */}
        <div style={{
          position:'absolute', inset:-10, borderRadius:'50%',
          background:`radial-gradient(ellipse, ${colors.glow} 0%, transparent 68%)`,
          pointerEvents:'none', animation:'arenaGlow 2.4s ease-in-out infinite alternate',
        }} />

        {/* Float damage numbers */}
        {floats.length > 0 && (
          <div style={{ position:'absolute', bottom:'108%', left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', pointerEvents:'none', zIndex:20, gap:2 }}>
            {floats.map(f => (
              <span key={f.id} className={`font-extrabold leading-none select-none ${f.color}`}
                style={{ fontSize:28, animation:'floatUp 1.2s ease-out forwards', textShadow:'0 2px 8px rgba(0,0,0,0.8)' }}>
                {f.label}
              </span>
            ))}
          </div>
        )}

        {/* WAAPI wrapper */}
        <div ref={onAvatarRef} style={{ willChange:'transform', position:'relative', zIndex:2, transform: mirrored ? 'scaleX(-1)' : 'none' }}>
          <SlotAvatar slot={slot} size={112} />
        </div>

        {/* Dead skull */}
        {slot.isDead && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, zIndex:5 }}>💀</div>
        )}
      </div>

      {/* Ground shadow / puddle */}
      <div style={{ width:70, height:10, borderRadius:'50%', background:`radial-gradient(ellipse, ${colors.glow} 0%, transparent 70%)`, marginTop:2, opacity:0.7 }} />

      {/* Ability dots with hover tooltip */}
      {slot.equippedAbilities.length > 0 && (
        <div style={{ display:'flex', gap:6, marginTop:8, position:'relative', zIndex:15 }}>
          {slot.equippedAbilities.slice(0,4).map(id => {
            const ab     = ABILITY_BY_ID[id]
            if (!ab) return null
            const abMeta = archMeta(ab.archetype)
            const abClr  = archColors(ab.archetype)
            const isHov  = hoveredAbilityId === id
            const desc   = describeAbility(ab)
            return (
              <div key={id} style={{ position:'relative' }}>
                {/* Hover tooltip (floats upward, stays inside arena) */}
                {isHov && (
                  <div style={{
                    position:'absolute', bottom:'calc(100% + 10px)', left:'50%', transform:'translateX(-50%)',
                    minWidth:148, maxWidth:200, zIndex:50, pointerEvents:'none',
                    background:'linear-gradient(145deg,#0C0C1E,#14142A)',
                    border:`1px solid ${abClr.ring.replace('0.80','0.50')}`,
                    borderRadius:10, padding:'8px 10px',
                    boxShadow:`0 0 18px ${abClr.glow}, 0 4px 14px rgba(0,0,0,0.75)`,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                      <span style={{ fontSize:14 }}>{abMeta.emoji}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.92)', lineHeight:1.2 }}>{ab.name}</span>
                    </div>
                    {desc && (
                      <p style={{ margin:0, fontSize:9, color:'rgba(255,255,255,0.52)', lineHeight:1.55 }}>{desc}</p>
                    )}
                  </div>
                )}
                {/* Dot button */}
                <button
                  onMouseEnter={() => setHoveredAbilityId(id)}
                  onMouseLeave={() => setHoveredAbilityId(null)}
                  onClick={() => onInspect(inspectedAbilityId === id ? null : id)}
                  style={{
                    width:28, height:28, borderRadius:'50%',
                    border:`1.5px solid ${abClr.ring.replace('0.80', isHov ? '0.70' : '0.40')}`,
                    background: isHov ? abClr.bgLight.replace('0.10','0.22') : abClr.bgLight,
                    fontSize:13, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transform: isHov ? 'scale(1.25)' : 'scale(1)',
                    transition:'all 0.15s ease',
                    boxShadow: isHov ? `0 0 10px ${abClr.ring}` : 'none',
                  }}
                  aria-label={ab.name}
                >
                  {abMeta.emoji}
                </button>
              </div>
            )
          })}
        </div>
      )}
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

function ArenaSlot({ slot, isActor, isNext, onCardRef, onAvatarRef, mirrored, floats, onInspect, inspectedAbilityId, avatarSize = 88 }: {
  slot:               TurnSlot
  isActor:            boolean
  isNext:             boolean
  onCardRef:          (el: HTMLDivElement | null) => void
  onAvatarRef:        (el: HTMLDivElement | null) => void
  mirrored:           boolean
  floats:             FloatNum[]
  onInspect:          (id: string | null) => void
  inspectedAbilityId: string | null
  avatarSize?:        number
}) {
  const meta = archMeta(slot.archetype)

  // Glow color per archetype for active turn
  const glowColor = {
    forestal:  '0_0_18px_rgba(52,211,153,0.55)',
    electrico: '0_0_18px_rgba(250,204,21,0.55)',
    acuatico:  '0_0_18px_rgba(96,165,250,0.55)',
    volcanico: '0_0_18px_rgba(251,146,60,0.55)',
  }[slot.archetype] ?? '0_0_18px_rgba(255,255,255,0.4)'

  return (
    <div
      ref={onCardRef}
      className={`relative flex flex-col items-center transition-all duration-400 ${slot.isDead ? 'opacity-30 grayscale' : ''}`}
    >
      {/* ── Name + HP bar (above avatar) ── */}
      <div className="w-full px-1 mb-1.5 space-y-0.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-semibold text-white/55 truncate leading-none">
            {slot.name ?? slot.archetype}
          </span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {slot.effects.map((e, i) => (
              <span key={i} className="text-[9px] leading-none">
                {e.type === 'stun' ? '😵' : e.type === 'buff' ? '↑' : '↓'}
              </span>
            ))}
            <span className="text-[9px] text-white/35 font-mono leading-none ml-0.5">
              {slot.currentHp}
            </span>
          </div>
        </div>
        <HpBar current={slot.currentHp} max={slot.maxHp} />
      </div>

      {/* ── Avatar ── */}
      <div className="relative flex justify-center">
        {/* Float damage numbers */}
        {floats.length > 0 && (
          <div
            className="absolute inset-x-0 flex flex-col items-center pointer-events-none"
            style={{ bottom: '100%', zIndex: 20 }}
          >
            {floats.map(f => (
              <span
                key={f.id}
                className={`text-base font-extrabold leading-none select-none ${f.color}`}
                style={{ animation: 'floatUp 1.2s ease-out forwards' }}
              >
                {f.label}
              </span>
            ))}
          </div>
        )}

        {/* Active turn glow ring */}
        {isActor && !slot.isDead && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: `0 0 0 2px rgba(255,255,255,0.5), ${glowColor.replace(/_/g,' ')}`, zIndex: 1 }}
          />
        )}
        {/* Next turn subtle ring */}
        {isNext && !isActor && !slot.isDead && (
          <div className="absolute inset-0 rounded-full pointer-events-none ring-1 ring-white/20" style={{ zIndex: 1 }} />
        )}

        {/* WAAPI wrapper */}
        <div ref={onAvatarRef} style={{ willChange: 'transform', position: 'relative', zIndex: 2 }}>
          <div style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}>
            <SlotAvatar slot={slot} size={avatarSize} />
          </div>
        </div>

        {/* Turn badge (⚔ floats above avatar) */}
        {isActor && !slot.isDead && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-white text-xs font-black animate-bounce"
               style={{ animationDuration: '0.7s' }}>
            ⚔
          </div>
        )}
      </div>

      {/* ── Ground shadow ── */}
      <div className="w-14 h-1.5 rounded-full bg-black/30 blur-sm mt-0.5" />

      {/* ── Ability dots ── */}
      {slot.equippedAbilities.length > 0 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {slot.equippedAbilities.slice(0, 4).map(id => {
            const ab = ABILITY_BY_ID[id]
            if (!ab) return null
            const abMeta = archMeta(ab.archetype)
            const isActive = inspectedAbilityId === id
            return (
              <button
                key={id}
                onClick={() => onInspect(isActive ? null : id)}
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] leading-none transition-all active:scale-90 ${
                  isActive
                    ? `${abMeta.border} ${abMeta.bg} ring-2 ring-white/60 scale-110`
                    : `${abMeta.border} ${abMeta.bg} opacity-75 hover:opacity-100 hover:scale-110`
                }`}
                aria-label={ab.name}
              >
                {abMeta.emoji}
              </button>
            )
          })}
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

// ─── AbilityInspectorPanel — TCG Card style ───────────────────────────────────

const ARCH_CARD_THEME: Record<string, {
  cardBg: string; borderColor: string; glowColor: string; textColor: string; badgeBg: string
}> = {
  forestal:  { cardBg:'linear-gradient(145deg,#041A0E 0%,#072816 45%,#041A0E 100%)', borderColor:'rgba(52,211,153,0.50)',  glowColor:'rgba(52,211,153,0.14)',  textColor:'#34D399', badgeBg:'rgba(52,211,153,0.14)'  },
  electrico: { cardBg:'linear-gradient(145deg,#161200 0%,#241D00 45%,#161200 100%)', borderColor:'rgba(250,204,21,0.50)',  glowColor:'rgba(250,204,21,0.14)',  textColor:'#FBBF24', badgeBg:'rgba(250,204,21,0.14)'  },
  acuatico:  { cardBg:'linear-gradient(145deg,#020C1A 0%,#051626 45%,#020C1A 100%)', borderColor:'rgba(96,165,250,0.50)',  glowColor:'rgba(96,165,250,0.14)',  textColor:'#60A5FA', badgeBg:'rgba(96,165,250,0.14)'  },
  volcanico: { cardBg:'linear-gradient(145deg,#180500 0%,#260A00 45%,#180500 100%)', borderColor:'rgba(251,146,60,0.50)',  glowColor:'rgba(251,146,60,0.14)',  textColor:'#FB923C', badgeBg:'rgba(251,146,60,0.14)'  },
}
const DEFAULT_CARD_THEME = {
  cardBg:'linear-gradient(145deg,#0D0D20 0%,#16162E 45%,#0D0D20 100%)',
  borderColor:'rgba(255,255,255,0.18)', glowColor:'rgba(255,255,255,0.06)', textColor:'rgba(255,255,255,0.7)', badgeBg:'rgba(255,255,255,0.08)',
}

function AbilityInspectorPanel({ abilityId, onClose }: { abilityId: string; onClose: () => void }) {
  const ab = ABILITY_BY_ID[abilityId]
  if (!ab) return null

  const meta  = archMeta(ab.archetype)
  const theme = ARCH_CARD_THEME[ab.archetype] ?? DEFAULT_CARD_THEME
  const desc  = describeAbility(ab)

  // Type badge
  let typeLabel = 'EFECTO';  let typeBg = 'rgba(245,158,11,0.22)'; let typeClr = '#F59E0B'
  if (ab.type === 'passive')            { typeLabel='PASIVO'; typeBg='rgba(168,85,247,0.22)';  typeClr='#A855F7' }
  else if (ab.effect.heal !== undefined) { typeLabel='CURA';   typeBg='rgba(52,211,153,0.22)';  typeClr='#34D399' }
  else if (ab.effect.damage !== undefined){ typeLabel='ATAQUE'; typeBg='rgba(248,113,113,0.22)'; typeClr='#F87171' }

  // Effect chips
  const chips: { label: string; color: string }[] = []
  const e = ab.effect
  if (e.damage     !== undefined) chips.push({ label:`×${e.damage} daño`,                                           color:'#F87171' })
  if (e.heal       !== undefined) chips.push({ label:`×${e.heal} curación`,                                         color:'#34D399' })
  if (e.stun       !== undefined) chips.push({ label:`Aturde ${e.stun}t`,                                           color:'#C084FC' })
  if (e.buff)                     chips.push({ label:`+${Math.round(e.buff.pct*100)}% ${e.buff.stat} ×${e.buff.turns}t`,     color:'#60A5FA' })
  if (e.debuff)                   chips.push({ label:`-${Math.round(e.debuff.pct*100)}% ${e.debuff.stat} ×${e.debuff.turns}t`, color:'#FB923C' })
  if (e.reflect)                  chips.push({ label:`Refleja ${Math.round(e.reflect*100)}%`,                       color:'#22D3EE' })
  if (e.damageReduction)          chips.push({ label:`-${Math.round(e.damageReduction*100)}% daño`,                 color:'#2DD4BF' })
  if (e.tiebreaker)               chips.push({ label:'Prioridad turno',                                             color:'#FCD34D' })

  return (
    <div style={{
      background: theme.cardBg,
      border: `1.5px solid ${theme.borderColor}`,
      borderRadius: 16,
      boxShadow: `0 0 28px ${theme.glowColor}, 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background watermark */}
      <div style={{
        position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
        fontSize:90, opacity:0.05, pointerEvents:'none', lineHeight:1, userSelect:'none',
      }}>
        {meta.emoji}
      </div>

      {/* Top gloss line */}
      <div style={{ position:'absolute', top:0, left:16, right:16, height:1, background:'rgba(255,255,255,0.08)', borderRadius:1 }} />

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          {/* Archetype icon box */}
          <div style={{
            width:38, height:38, borderRadius:10, flexShrink:0,
            border:`1px solid ${theme.borderColor}`,
            background:'rgba(255,255,255,0.04)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, boxShadow:`0 0 10px ${theme.glowColor}`,
          }}>
            {meta.emoji}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            {/* Name + type */}
            <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:3 }}>
              <span style={{ color:'rgba(255,255,255,0.92)', fontWeight:700, fontSize:14, lineHeight:1 }}>
                {ab.name}
              </span>
              <span style={{
                fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:20,
                background:typeBg, color:typeClr, border:`1px solid ${typeClr}38`,
                letterSpacing:0.8, textTransform:'uppercase',
              }}>
                {typeLabel}
              </span>
            </div>
            {/* Archetype label */}
            <span style={{ fontSize:9, color:theme.textColor, opacity:0.65, textTransform:'uppercase', letterSpacing:1.2 }}>
              {ab.archetype}
            </span>
          </div>
        </div>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width:26, height:26, borderRadius:8, flexShrink:0,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
            color:'rgba(255,255,255,0.35)', fontSize:13, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
          aria-label="Cerrar"
        >✕</button>
      </div>

      {/* ── Divider ── */}
      <div style={{ height:1, background:theme.borderColor, opacity:0.35, marginBottom:10 }} />

      {/* ── Effect chips ── */}
      {chips.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
          {chips.map((c, i) => (
            <span key={i} style={{
              fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20,
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)',
              color:c.color,
            }}>
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Description ── */}
      <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,0.50)', lineHeight:1.65, fontStyle:'italic' }}>
        &ldquo;{desc || 'Habilidad de efecto especial.'}&rdquo;
      </p>
    </div>
  )
}

// ─── AuraLabel with hover tooltip ────────────────────────────────────────────

function AuraLabel({ aura, side }: { aura: Aura; side: 'attacker' | 'defender' }) {
  const [hovered, setHovered] = useState(false)
  const auraDef   = getAuraById(aura.auraId)
  const isAtk     = side === 'attacker'
  const clr       = isAtk ? 'rgba(96,165,250,' : 'rgba(248,113,113,'

  return (
    <div style={{ position:'relative' }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <span style={{
        fontSize:8, cursor:'help',
        color:`${clr}0.65)`, background:`${clr}0.08)`,
        border:`1px solid ${clr}0.20)`, borderRadius:10,
        padding:'2px 7px', display:'block', textAlign:'center',
        maxWidth:58, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.5,
      }}>
        {getAuraLabel(aura)}
      </span>
      {hovered && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
          minWidth:200, maxWidth:260, zIndex:100, pointerEvents:'none',
          background:'linear-gradient(145deg,#0D0D20,#16162E)',
          border:`1px solid ${clr}0.35)`,
          borderRadius:12, padding:'10px 12px',
          boxShadow:`0 0 24px ${clr}0.18), 0 8px 24px rgba(0,0,0,0.6)`,
        }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.92)', marginBottom:5, letterSpacing:0.5 }}>
            {auraDef?.name ?? getAuraLabel(aura)}
          </div>
          <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,0.55)', lineHeight:1.6, fontStyle:'italic' }}>
            {auraDef?.description ?? '—'}
          </p>
        </div>
      )}
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

// ─── ManualAbilityPanel ───────────────────────────────────────────────────────

function ManualAbilityPanel({ slot, onUse, disabled, cooldowns }: {
  slot:      import('@/lib/pvp/types').TurnSlot
  onUse:     (abilityId: string, targetId?: string) => void
  disabled:  boolean
  cooldowns: Record<string, number>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const allAbilities = [slot.innateAbilityId, ...slot.equippedAbilities.slice(0, 4)]
  const selectedAb = selectedId ? ABILITY_BY_ID[selectedId] : null

  function handleSelect(id: string) {
    if (disabled) return
    if ((cooldowns[id] ?? 0) > 0) return
    setSelectedId(prev => prev === id ? null : id)
  }

  function handleConfirm() {
    if (!selectedId || disabled) return
    onUse(selectedId)
    setSelectedId(null)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.2, textAlign:'center' }}>
        ⚔ Tu turno — elige habilidad
      </div>

      {/* Ability grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
        {allAbilities.map(id => {
          const ab = ABILITY_BY_ID[id]
          if (!ab) return null
          const meta  = archMeta(ab.archetype)
          const clr   = archColors(ab.archetype)
          const cd    = cooldowns[id] ?? 0
          const isDisabled = disabled || cd > 0
          const isSelected = selectedId === id
          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              disabled={isDisabled}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                padding:'8px 6px', borderRadius:12,
                background: isSelected
                  ? clr.bgLight.replace('0.10', '0.22')
                  : isDisabled ? 'rgba(255,255,255,0.02)' : clr.bgLight,
                border:`1.5px solid ${isSelected ? clr.ring : isDisabled ? 'rgba(255,255,255,0.06)' : clr.ring.replace('0.80','0.35')}`,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.45 : 1,
                transition:'all 0.15s ease',
                boxShadow: isSelected
                  ? `0 0 18px ${clr.glow}, inset 0 0 0 1px ${clr.ring.replace('0.80','0.25')}`
                  : isDisabled ? 'none' : `0 0 8px ${clr.glow.replace('0.38','0.18')}`,
                position:'relative',
                transform: isSelected ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize:18 }}>{meta.emoji}</span>
              <span style={{ fontSize:10, fontWeight:700, color: isDisabled ? 'rgba(255,255,255,0.30)' : isSelected ? clr.textColor : 'rgba(255,255,255,0.65)', textAlign:'center', lineHeight:1.3 }}>
                {ab.name}
              </span>
              {ab.type === 'passive' && (
                <span style={{ fontSize:8, color:'rgba(255,255,255,0.30)', fontStyle:'italic' }}>pasivo</span>
              )}
              {cd > 0 && (
                <span style={{ position:'absolute', top:4, right:6, fontSize:9, color:'rgba(255,255,255,0.40)', fontWeight:700 }}>
                  {cd}t
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected ability card + confirm */}
      {selectedAb && (() => {
        const meta  = archMeta(selectedAb.archetype)
        const clr   = archColors(selectedAb.archetype)
        const desc  = describeAbility(selectedAb)
        let typeLabel = 'EFECTO'; let typeClr = '#F59E0B'
        if (selectedAb.type === 'passive')               { typeLabel='PASIVO'; typeClr='#A855F7' }
        else if (selectedAb.effect.heal !== undefined)   { typeLabel='CURA';   typeClr='#34D399' }
        else if (selectedAb.effect.damage !== undefined) { typeLabel='ATAQUE'; typeClr='#F87171' }
        return (
          <div style={{
            borderRadius:14, padding:'12px 14px',
            background:`linear-gradient(135deg, ${clr.bgLight.replace('0.10','0.20')} 0%, rgba(0,0,0,0.3) 100%)`,
            border:`1.5px solid ${clr.ring.replace('0.80','0.40')}`,
            boxShadow:`0 0 20px ${clr.glow.replace('0.38','0.12')}`,
            display:'flex', flexDirection:'column', gap:10,
          }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:24, lineHeight:1 }}>{meta.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ color:'rgba(255,255,255,0.92)', fontWeight:700, fontSize:14 }}>{selectedAb.name}</span>
                  <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:12, background:'rgba(255,255,255,0.08)', color:typeClr }}>{typeLabel}</span>
                  {selectedAb.cooldown > 0 && (
                    <span style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginLeft:'auto' }}>CD: {selectedAb.cooldown}t</span>
                  )}
                </div>
                {desc && (
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.50)', marginTop:3, lineHeight:1.5 }}>{desc}</p>
                )}
              </div>
            </div>
            {/* Confirm + cancel */}
            <div style={{ display:'flex', gap:8 }}>
              <button
                onClick={handleConfirm}
                disabled={disabled}
                style={{
                  flex:1, padding:'9px 0', borderRadius:10, fontSize:13, fontWeight:700,
                  background: disabled ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${clr.bgLight.replace('0.10','0.35')}, ${clr.bgLight.replace('0.10','0.20')})`,
                  border:`1.5px solid ${disabled ? 'rgba(255,255,255,0.08)' : clr.ring.replace('0.80','0.70')}`,
                  color: disabled ? 'rgba(255,255,255,0.25)' : clr.textColor,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  boxShadow: disabled ? 'none' : `0 0 16px ${clr.glow}`,
                  transition:'all 0.15s ease',
                }}
              >
                ⚔ Usar {selectedAb.name}
              </button>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  padding:'9px 14px', borderRadius:10, fontSize:12, fontWeight:500,
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.10)',
                  color:'rgba(255,255,255,0.40)', cursor:'pointer', transition:'all 0.15s ease',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── SwitchPanel ──────────────────────────────────────────────────────────────

function SwitchPanel({ benchSlots, onSwitch, disabled, cooldownEnd, forced }: {
  benchSlots:  import('@/lib/pvp/types').TurnSlot[]
  onSwitch:    (therianId: string) => void
  disabled:    boolean
  cooldownEnd: number | null
  forced:      boolean  // true = frontliner died, must switch
}) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!cooldownEnd || cooldownEnd <= Date.now()) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [cooldownEnd])

  const remaining = cooldownEnd ? Math.max(0, Math.ceil((cooldownEnd - now) / 1000)) : 0
  const canSwitch = !disabled && remaining === 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:9, color: forced ? '#F87171' : 'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.2, textAlign:'center', fontWeight:700 }}>
        {forced ? '💀 Tu Therian cayó — elige sustituto' : '🔄 Cambiar Therian'}
      </div>
      {remaining > 0 && !forced && (
        <div style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.40)' }}>
          Disponible en {remaining}s
        </div>
      )}
      <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
        {benchSlots.map(slot => {
          const clr = archColors(slot.archetype)
          const meta = archMeta(slot.archetype)
          const hpPct = slot.maxHp > 0 ? Math.max(0, slot.currentHp / slot.maxHp) : 0
          return (
            <button
              key={slot.therianId}
              onClick={() => canSwitch && onSwitch(slot.therianId)}
              disabled={!canSwitch}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                padding:'10px 14px', borderRadius:14,
                background: canSwitch ? clr.bgLight : 'rgba(255,255,255,0.02)',
                border:`1.5px solid ${canSwitch ? clr.ring.replace('0.80','0.60') : 'rgba(255,255,255,0.08)'}`,
                cursor: canSwitch ? 'pointer' : 'not-allowed',
                opacity: canSwitch ? 1 : 0.5,
                transition:'all 0.15s ease',
                boxShadow: canSwitch ? `0 0 16px ${clr.glow}` : 'none',
              }}
            >
              <span style={{ fontSize:22 }}>{meta.emoji}</span>
              <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.80)', maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {slot.name ?? slot.archetype}
              </span>
              {/* HP bar */}
              <div style={{ width:56, height:3, background:'rgba(255,255,255,0.10)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${hpPct*100}%`, background: hpPct>0.55?'#10B981':hpPct>0.28?'#F59E0B':'#EF4444', borderRadius:2 }} />
              </div>
              <span style={{ fontSize:9, color:'rgba(255,255,255,0.35)' }}>{slot.currentHp}/{slot.maxHp} HP</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function BattleField({ battleId, initialState, onComplete }: Props) {
  const [playerMode, setPlayerMode] = useState<'auto' | 'manual'>('manual')
  const isManual = playerMode === 'manual'

  const [displayState,   setDisplayState]   = useState<BattleState>(initialState)
  const [snapshots,      setSnapshots]      = useState<TurnSnapshot[]>([])
  const [step,           setStep]           = useState(-1)
  const [speedIdx,       setSpeedIdx]       = useState(0)
  const [fetching,       setFetching]       = useState(false)  // starts false; auto-fight triggered manually
  const [error,          setError]          = useState<string | null>(null)
  const [currentLog,     setCurrentLog]     = useState<ActionLogEntry[]>([])
  const [actorIndex,     setActorIndex]     = useState(initialState.turnIndex)
  const [animInfo,            setAnimInfo]            = useState<AnimInfo | null>(null)
  const [activeAbility,       setActiveAbility]       = useState<ActiveAbilityInfo | null>(null)
  const [floatNums,           setFloatNums]           = useState<Map<string, FloatNum[]>>(new Map())
  const [inspectedAbilityId,  setInspectedAbilityId]  = useState<string | null>(null)
  const [spotlightTargetId,   setSpotlightTargetId]   = useState<string | null>(null)
  const [showBurst,           setShowBurst]           = useState(false)
  const [burstType,           setBurstType]           = useState<'damage'|'heal'>('damage')
  // Manual mode state
  const [manualWaiting,    setManualWaiting]    = useState(isManual)   // waiting for player input
  const [manualActing,     setManualActing]     = useState(false)       // sending turn to server
  const [manualAnimating,  setManualAnimating]  = useState(false)       // playing back snapshots
  const [showSwitchPanel,  setShowSwitchPanel]  = useState(false)       // show switch UI
  const [switchCooldownEnd, setSwitchCooldownEnd] = useState<number | null>(null)
  const [forcedSwitch,      setForcedSwitch]     = useState(false)      // frontliner died, must switch
  const [attackerSwitchKey, setAttackerSwitchKey] = useState(0)         // increments to trigger switch animation

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

  // Frontliner slots for 1v1 visual (attacker left, defender right)
  // Use tracked frontliner IDs from state if available, else fallback to first alive
  const frontlinerAttackerId = displayState.frontliner?.attacker
  const frontlinerDefenderId = displayState.frontliner?.defender
  const activeAttackerSlot = (frontlinerAttackerId
    ? displayState.slots.find(s => s.therianId === frontlinerAttackerId)
    : null) ?? mySlots.find(s => !s.isDead) ?? mySlots[0] ?? null
  const activeDefenderSlot = (frontlinerDefenderId
    ? displayState.slots.find(s => s.therianId === frontlinerDefenderId)
    : null) ?? enemySlots.find(s => !s.isDead) ?? enemySlots[0] ?? null
  const currentActorSlot   = displayState.slots[actorIndex] ?? displayState.slots[0] ?? null
  const currentTargetSlot  = spotlightTargetId
    ? (displayState.slots.find(s => s.therianId === spotlightTargetId) ?? null)
    : null
  const leftSlot  = (currentActorSlot?.side === 'attacker' ? currentActorSlot : null)
    ?? (currentTargetSlot?.side === 'attacker' ? currentTargetSlot : null)
    ?? activeAttackerSlot
  const rightSlot = (currentActorSlot?.side === 'defender' ? currentActorSlot : null)
    ?? (currentTargetSlot?.side === 'defender' ? currentTargetSlot : null)
    ?? activeDefenderSlot
  const leftColors  = leftSlot  ? archColors(leftSlot.archetype)  : archColors('forestal')
  const rightColors = rightSlot ? archColors(rightSlot.archetype) : archColors('forestal')

  // ── Run auto-fight (calls /action to resolve all turns) ──────────────────
  function runAutoFight() {
    if (displayState.status === 'completed') {
      setFetching(false)
      if (!completedRef.current) {
        completedRef.current = true
        setTimeout(() => onComplete(displayState.winnerId !== null, rewardsRef.current), 3000)
      }
      return
    }
    setFetching(true)
    setManualWaiting(false)
    fetch(`/api/pvp/${battleId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setFetching(false); return }
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
      .catch(() => { setError('Error al cargar la batalla.'); setFetching(false) })
  }

  // ── No auto-fetch on mount — player chooses mode in-battle ────────────────
  // (intentionally empty — auto-fight is triggered by the mode toggle)

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
      setSpotlightTargetId(snap.logEntry.targetIds[0] ?? null)

      const next = step + 1
      if (next >= snaps.length) {
        if (isManual) {
          // Manual mode: animation done, check next state
          setManualAnimating(false)
          const finalState = finalStateRef.current
          if (finalState.status === 'completed') {
            if (!completedRef.current) {
              completedRef.current = true
              setTimeout(() => onComplete(finalState.winnerId !== null, rewardsRef.current), 2000)
            }
          } else if (finalState.phase !== 'waiting_attacker_switch') {
            // Ready for player's next turn (unless forced switch UI is already shown)
            if (!showSwitchPanel) setManualWaiting(true)
          }
        } else {
          if (!completedRef.current) {
            completedRef.current = true
            setTimeout(() => onComplete(snap.winnerId !== null, rewardsRef.current), 2500)
          }
        }
      } else {
        setStep(next)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [step, fetching, speedIdx, isManual, showSwitchPanel]) // eslint-disable-line react-hooks/exhaustive-deps

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

    // Central impact burst
    const impactDelay = Math.round(animDuration * 0.46)
    setBurstType(isHeal ? 'heal' : 'damage')
    setTimeout(() => { setShowBurst(true); setTimeout(() => setShowBurst(false), 480) }, impactDelay)

    // Flash + shake on target cards
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

  // ── Manual mode: play back a batch of snapshots ───────────────────────────
  function playManualSnapshots(snaps: TurnSnapshot[], finalState: BattleState) {
    if (snaps.length === 0) return
    setManualAnimating(true)
    snapshotsRef.current  = snaps
    finalStateRef.current = finalState
    baseSlotsRef.current  = finalState.slots
    setSnapshots(snaps)
    setStep(0)
  }

  // ── Manual mode: send ability ──────────────────────────────────────────────
  async function handleManualAbility(abilityId: string, targetId?: string) {
    if (manualActing || manualAnimating) return
    setManualActing(true)
    setManualWaiting(false)
    setError(null)
    try {
      const res = await fetch(`/api/pvp/${battleId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abilityId, targetId }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setManualWaiting(true); return }

      const newState = data.state as BattleState
      const snaps    = data.snapshots as TurnSnapshot[]
      playManualSnapshots(snaps, newState)

      // Check if waiting for player switch after animation
      if (newState.phase === 'waiting_attacker_switch') {
        setForcedSwitch(true)
        setShowSwitchPanel(true)
      }

      if (newState.status === 'completed') {
        if (data.mmrDelta !== undefined) {
          rewardsRef.current = {
            mmrDelta: data.mmrDelta, newMmr: data.newMmr, rank: data.rank,
            goldEarned: data.goldEarned, weeklyPvpWins: data.weeklyPvpWins,
          }
        }
      }
    } catch {
      setError('Error de conexión.')
      setManualWaiting(true)
    } finally {
      setManualActing(false)
    }
  }

  // ── Manual mode: switch frontliner ────────────────────────────────────────
  async function handleManualSwitch(therianId: string) {
    if (manualActing || manualAnimating) return
    setManualActing(true)
    setError(null)
    try {
      const res = await fetch(`/api/pvp/${battleId}/switch-frontliner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therianId }),
      })
      const data = await res.json()
      if (data.error === 'SWITCH_COOLDOWN') {
        setSwitchCooldownEnd(Date.now() + (data.remainingMs ?? 10000))
        setManualActing(false)
        return
      }
      if (data.error) { setError(data.error); setManualActing(false); return }

      const newState = data.state as BattleState
      if (data.switchCooldownEnd) setSwitchCooldownEnd(data.switchCooldownEnd)
      setDisplayState(newState)
      setActorIndex(newState.turnIndex)
      setAttackerSwitchKey(k => k + 1)
      setShowSwitchPanel(false)
      setForcedSwitch(false)
      if (newState.status !== 'completed') {
        setManualWaiting(true)
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setManualActing(false)
    }
  }

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

  const isFinished = isManual
    ? displayState.status === 'completed'
    : step >= snapshots.length && !fetching && snapshots.length > 0
  const progress = snapshots.length > 0 ? Math.round((Math.max(0, step) / snapshots.length) * 100) : 0

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
      {/* Keyframes */}
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0)     scale(1);    }
          60%  { opacity: 1; transform: translateY(-40px) scale(1.2);  }
          100% { opacity: 0; transform: translateY(-68px) scale(0.85); }
        }
        @keyframes arenaEntryLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes arenaEntryRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes torchFlicker {
          0%,100% { opacity:0.95; transform:scaleY(1)    scaleX(1);    }
          20%     { opacity:0.75; transform:scaleY(0.93) scaleX(1.08); }
          50%     { opacity:1;   transform:scaleY(1.06) scaleX(0.94); }
          75%     { opacity:0.82; transform:scaleY(0.96) scaleX(1.05); }
        }
        @keyframes torchGlow {
          0%,100% { opacity:0.55; }
          50%     { opacity:0.85; }
        }
        @keyframes arenaGlow {
          from { opacity:0.6; transform:scale(0.95); }
          to   { opacity:1;   transform:scale(1.05); }
        }
        @keyframes impactBurst {
          0%   { opacity:0;   transform:scale(0.2); }
          25%  { opacity:1;   transform:scale(1.1); }
          65%  { opacity:0.6; transform:scale(1.4); }
          100% { opacity:0;   transform:scale(2);   }
        }
        @keyframes spotlightEntry {
          from { opacity:0; transform:translateY(16px) scale(0.92); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes switchEntryAttacker {
          0%   { opacity:0; transform:translateX(-38px) scale(0.84); }
          55%  { opacity:1; transform:translateX(6px)   scale(1.04); }
          100% { opacity:1; transform:translateX(0)     scale(1);    }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
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
              : isManual
                ? manualWaiting
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-400 animate-pulse'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400 animate-pulse'
        }`}>
          {fetching
            ? '⏳ Cargando...'
            : isFinished
              ? '✅ Resuelta'
              : isManual
                ? manualWaiting ? '🎮 Tu turno' : manualActing ? '⏳ Rival...' : '▶ Animando'
                : `⚔️ ${step + 1}/${snapshots.length}`
          }
        </span>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Manual mode: "Switch to Auto" button */}
          {isManual && !isFinished && (manualWaiting || (!manualActing && !manualAnimating)) && (
            <button
              onClick={() => { setPlayerMode('auto'); runAutoFight() }}
              disabled={fetching || manualActing || manualAnimating}
              className="text-xs px-2 py-0.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="La IA resolverá el resto de la batalla automáticamente"
            >
              🤖 Auto
            </button>
          )}
          {/* Auto mode: speed + skip controls */}
          {!fetching && !isFinished && !isManual && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!fetching && snapshots.length > 0 && (
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-white/20 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ══ COLOSSEUM ARENA — Portrait columns flanking arena ══ */}
      <div style={{ position:'relative', paddingInline:64 }}>
        {/* Left: player team portraits (outside arena) */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:64, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
          <PortraitBar
            slots={mySlots}
            activeSlotId={displayState.frontliner?.attacker ?? leftSlot?.therianId ?? null}
            label="Tu equipo"
            labelColor="rgba(96,165,250,0.70)"
            direction="column"
            onSwitch={isManual && !manualActing && !manualAnimating ? handleManualSwitch : undefined}
            switchCooldownEnd={switchCooldownEnd}
            canSwitch={isManual && (manualWaiting || forcedSwitch) && !manualActing && !manualAnimating}
            bypassCooldown={forcedSwitch}
          />
          {myAura && <AuraLabel aura={myAura} side="attacker" />}
        </div>
        {/* Right: enemy team portraits (outside arena) */}
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:64, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
          <PortraitBar slots={enemySlots} activeSlotId={displayState.frontliner?.defender ?? rightSlot?.therianId ?? null} label="Rival" labelColor="rgba(248,113,113,0.70)" direction="column" />
          {enemyAura && <AuraLabel aura={enemyAura} side="defender" />}
        </div>
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 490, background: '#050510', borderRadius: 20, border: '1px solid rgba(120,60,200,0.22)' }}
      >
        {/* ── Deep space bg + ceiling glow per side ── */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 110% 55% at 50% 0%, #0E0A30 0%, #050510 60%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(ellipse 60% 48% at 18% 0%, ${leftColors.glow.replace('0.38','0.26')} 0%, transparent 65%)` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(ellipse 60% 48% at 82% 0%, ${rightColors.glow.replace('0.38','0.22')} 0%, transparent 65%)` }} />

        {/* ── Crowd silhouettes ── */}
        <div className="absolute top-0 inset-x-0 pointer-events-none" style={{ height:56, zIndex:2 }}>
          <svg width="100%" height="56" viewBox="0 0 400 56" preserveAspectRatio="none">
            {[8,30,52,74,96,118,140,162,184,206,228,250,272,294,316,338,360,382].map((x,i) => (
              <ellipse key={`b${i}`} cx={x} cy={22} rx={10} ry={16} fill="#08061E" />
            ))}
            {[20,46,72,98,124,150,176,202,228,254,280,306,332,358,384].map((x,i) => (
              <ellipse key={`f${i}`} cx={x} cy={40} rx={13} ry={20} fill="#0A0826" />
            ))}
            <rect x="0" y="0" width="400" height="56" fill="url(#cFade)" />
            <defs>
              <linearGradient id="cFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#050510" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#050510" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ── Left column + torch ── */}
        <div className="absolute pointer-events-none" style={{ left:0, top:0, bottom:0, width:38, zIndex:4, background:'linear-gradient(to right,#100E0C,#1A1612,transparent)' }}>
          <div style={{ position:'absolute', top:76, left:13, width:15, height:6, background:'#2E2418', borderRadius:3 }} />
          <div style={{ position:'absolute', top:62, left:19, width:4, height:20, background:'#3A2C18', borderRadius:2 }} />
          <div style={{ position:'absolute', top:42, left:15, width:11, height:22, background:'radial-gradient(ellipse at 50% 85%,#FF5500,#FF3300 40%,transparent 100%)', borderRadius:'50% 50% 35% 35%', animation:'torchFlicker 1.9s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:49, left:17, width:7, height:13, background:'radial-gradient(ellipse at 50% 85%,#FFE000,#FFAA00 55%,transparent 100%)', borderRadius:'50% 50% 35% 35%', animation:'torchFlicker 1.4s ease-in-out infinite reverse' }} />
          <div style={{ position:'absolute', top:32, left:1, width:36, height:52, background:'radial-gradient(ellipse,rgba(255,110,0,0.32),transparent 70%)', animation:'torchGlow 1.9s ease-in-out infinite' }} />
        </div>

        {/* ── Right column + torch ── */}
        <div className="absolute pointer-events-none" style={{ right:0, top:0, bottom:0, width:38, zIndex:4, background:'linear-gradient(to left,#100E0C,#1A1612,transparent)' }}>
          <div style={{ position:'absolute', top:76, right:13, width:15, height:6, background:'#2E2418', borderRadius:3 }} />
          <div style={{ position:'absolute', top:62, right:19, width:4, height:20, background:'#3A2C18', borderRadius:2 }} />
          <div style={{ position:'absolute', top:42, right:15, width:11, height:22, background:'radial-gradient(ellipse at 50% 85%,#FF5500,#FF3300 40%,transparent 100%)', borderRadius:'50% 50% 35% 35%', animation:'torchFlicker 2.2s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:49, right:17, width:7, height:13, background:'radial-gradient(ellipse at 50% 85%,#FFE000,#FFAA00 55%,transparent 100%)', borderRadius:'50% 50% 35% 35%', animation:'torchFlicker 1.6s ease-in-out infinite reverse' }} />
          <div style={{ position:'absolute', top:32, right:1, width:36, height:52, background:'radial-gradient(ellipse,rgba(255,110,0,0.32),transparent 70%)', animation:'torchGlow 2.2s ease-in-out infinite' }} />
        </div>

        {/* ── Arena floor ── */}
        <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{ height:90, zIndex:3, background:'linear-gradient(to bottom,#1E1B38,#12102A,#0A0918)', borderTop:'1px solid rgba(140,70,220,0.25)', boxShadow:'inset 0 3px 16px rgba(130,60,210,0.14)' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'rgba(155,89,182,0.32)', boxShadow:'0 0 22px 5px rgba(155,89,182,0.22)' }} />
          <div style={{ position:'absolute', left:0, right:0, top:'30%', height:1, background:'rgba(155,89,182,0.10)' }} />
          <div style={{ position:'absolute', left:0, right:0, top:'60%', height:1, background:'rgba(155,89,182,0.07)' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:30, background:'linear-gradient(to top,rgba(90,50,160,0.14),transparent)' }} />
        </div>

        {/* ── Spotlight characters (1v1: left=attacker, right=defender) ── */}
        <div className="absolute inset-x-0" style={{ bottom:90, top:110, zIndex:10, display:'flex', alignItems:'flex-end', paddingInline:8 }}>

          {/* Left fighter (attacker side) */}
          {leftSlot && (
            <div key={attackerSwitchKey} style={{ flex:1, minWidth:0, display:'flex', justifyContent:'center', animation: attackerSwitchKey > 0 ? 'switchEntryAttacker 0.42s cubic-bezier(0.22,1,0.36,1) both' : 'spotlightEntry 0.4s ease-out both' }}>
              <SpotlightSlot
                slot={leftSlot}
                side="left"
                onCardRef={makeCardRefFn(leftSlot.therianId)}
                onAvatarRef={makeAvatarRefFn(leftSlot.therianId)}
                floats={floatNums.get(leftSlot.therianId) ?? []}
                onInspect={setInspectedAbilityId}
                inspectedAbilityId={inspectedAbilityId}
              />
            </div>
          )}

          {/* Center: VS + impact burst */}
          <div style={{ width:48, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingBottom:20, position:'relative' }}>
            {showBurst && (
              <div style={{
                position:'absolute', width:80, height:80, borderRadius:'50%',
                background: burstType === 'heal'
                  ? 'radial-gradient(circle,rgba(52,211,153,0.95),rgba(52,211,153,0.4) 40%,transparent 70%)'
                  : 'radial-gradient(circle,rgba(255,255,255,0.95),rgba(239,68,68,0.6) 35%,transparent 68%)',
                animation:'impactBurst 0.48s ease-out both',
                pointerEvents:'none', zIndex:20,
              }} />
            )}
            <span style={{ fontSize:11, fontWeight:900, letterSpacing:2, color:'rgba(255,255,255,0.14)' }}>VS</span>
          </div>

          {/* Right fighter (defender side) */}
          {rightSlot ? (
            <div style={{ flex:1, minWidth:0, display:'flex', justifyContent:'center', animation:'spotlightEntry 0.4s ease-out 0.08s both' }}>
              <SpotlightSlot
                slot={rightSlot}
                side="right"
                onCardRef={makeCardRefFn(rightSlot.therianId)}
                onAvatarRef={makeAvatarRefFn(rightSlot.therianId)}
                floats={floatNums.get(rightSlot.therianId) ?? []}
                onInspect={setInspectedAbilityId}
                inspectedAbilityId={inspectedAbilityId}
              />
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.18 }}>
              <span style={{ fontSize:40 }}>?</span>
            </div>
          )}
        </div>
      </div>
      </div>{/* /paddingInline wrapper */}

      {/* ── Narrative ── */}
      {activeAbility && !fetching && (() => {
        const meta    = archMeta(activeAbility.archetype)
        const colors  = archColors(activeAbility.archetype)
        const results = activeAbility.resultLines
        return (
          <div style={{
            borderRadius:14, padding:'12px 16px',
            background:`linear-gradient(135deg, ${colors.bgLight.replace('0.10','0.18')} 0%, rgba(255,255,255,0.03) 100%)`,
            border:`1px solid ${colors.ring.replace('0.80','0.28')}`,
            boxShadow:`0 0 20px ${colors.glow.replace('0.38','0.10')}`,
          }}>
            {/* Action line */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: results.length > 0 ? 8 : 0 }}>
              <span style={{ fontSize:20 }}>{meta.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)', fontWeight:500 }}>
                  {activeAbility.actorName ?? '?'}
                </span>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.30)' }}> usó </span>
                <span style={{ fontSize:13, fontWeight:800, color:colors.textColor }}>
                  {activeAbility.abilityName}
                </span>
              </div>
            </div>
            {/* Result lines */}
            {results.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {results.map((line, i) => {
                  const isHeal   = line.startsWith('+')
                  const isDead   = line.includes('💀')
                  const isBlock  = line.includes('Bloqueado') || line.includes('✦')
                  const isStun   = line.includes('Aturde') || line.includes('Aturdido')
                  const clr      = isHeal ? '#34D399' : isDead ? '#F87171' : isBlock ? '#FCD34D' : isStun ? '#C084FC' : '#F87171'
                  return (
                    <span key={i} style={{
                      fontSize:14, fontWeight:900, color:clr,
                      textShadow:`0 0 12px ${clr}70`,
                      background:'rgba(0,0,0,0.25)', borderRadius:8, padding:'2px 10px',
                    }}>{line}</span>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Manual mode controls ── */}
      {isManual && displayState.status === 'active' && (() => {
        const myFrontierId  = displayState.frontliner?.attacker
        const myFrontliner  = displayState.slots.find(s => s.therianId === myFrontierId)
        const myBench       = displayState.slots.filter(s => s.side === 'attacker' && !s.isDead && s.therianId !== myFrontierId)

        return (
          <div style={{
            background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:16, padding:'14px 14px', display:'flex', flexDirection:'column', gap:10,
          }}>
            {/* Switch panel (forced or voluntary) */}
            {showSwitchPanel && myBench.length > 0 && (
              <SwitchPanel
                benchSlots={myBench}
                onSwitch={handleManualSwitch}
                disabled={manualActing}
                cooldownEnd={switchCooldownEnd}
                forced={forcedSwitch}
              />
            )}

            {/* Ability panel (when waiting for player input and not showing forced switch) */}
            {manualWaiting && !forcedSwitch && myFrontliner && (
              <>
                <ManualAbilityPanel
                  slot={myFrontliner}
                  onUse={handleManualAbility}
                  disabled={manualActing || manualAnimating}
                  cooldowns={myFrontliner.cooldowns}
                />
              </>
            )}

            {/* AI thinking */}
            {(manualActing || manualAnimating) && !forcedSwitch && (
              <div style={{ textAlign:'center', color:'rgba(255,255,255,0.35)', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.15)', borderTopColor:'rgba(255,255,255,0.60)', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} />
                {manualActing ? 'El rival piensa...' : 'Reproduciendo turno...'}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Turn queue (compact) ── */}
      <div className="bg-white/3 border border-white/5 rounded-xl px-3 py-2">
        <TurnQueueBar
          slots={displayState.slots}
          turnIndex={displayState.turnIndex}
          actorIndex={actorIndex}
        />
      </div>

      {/* ── Ability inspector ── */}
      {inspectedAbilityId && (
        <AbilityInspectorPanel
          abilityId={inspectedAbilityId}
          onClose={() => setInspectedAbilityId(null)}
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400/80 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
          {error}
        </p>
      )}

      {/* Combat log (last 2) */}
      {currentLog.length > 0 && (
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'8px 12px', display:'flex', flexDirection:'column', gap:5 }}>
          {[...currentLog].reverse().slice(0, 2).map((entry, i) => (
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
