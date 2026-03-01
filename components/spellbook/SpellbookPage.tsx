'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ABILITIES, INNATE_ABILITIES } from '@/lib/pvp/abilities'
import type { Ability } from '@/lib/pvp/abilities'
import { SHOP_ITEMS } from '@/lib/shop/catalog'

type ArchFilter = 'all' | 'forestal' | 'electrico' | 'acuatico' | 'volcanico'
type TypeFilter = 'all' | 'active' | 'passive'

interface InventoryEntry {
  abilityId: string
  quantity: number
  equippedIn: string[]
}

const ARCH_META: Record<string, { label: string; emoji: string; text: string; border: string; bg: string; badge: string }> = {
  forestal:  { label: 'Forestal',  emoji: '🌿', text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/8',  badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  electrico: { label: 'Eléctrico', emoji: '⚡', text: 'text-yellow-400',  border: 'border-yellow-500/30',  bg: 'bg-yellow-500/8',   badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  acuatico:  { label: 'Acuático',  emoji: '💧', text: 'text-blue-400',    border: 'border-blue-500/30',    bg: 'bg-blue-500/8',     badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  volcanico: { label: 'Volcánico', emoji: '🔥', text: 'text-orange-400',  border: 'border-orange-500/30',  bg: 'bg-orange-500/8',   badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
}

function effectSummary(ab: Ability): string {
  const e = ab.effect
  const parts: string[] = []
  if (e.damage)       parts.push(`${Math.round(e.damage * 100)}% daño`)
  if (e.heal)         parts.push(`${Math.round(e.heal * 100)}% curación`)
  if (e.stun)         parts.push(`Aturdimiento ${e.stun}t`)
  if (e.shield)       parts.push(`Escudo ${e.shield} HP`)
  if (e.dot)          parts.push(`DoT ×${e.dot.damage} × ${e.dot.turns}t`)
  if (e.lifeSteal)    parts.push(`Roba vida ${Math.round(e.lifeSteal * 100)}%`)
  if (e.multiHit)     parts.push(`${e.multiHit.count}× golpes`)
  if (e.execute)      parts.push(`Ejecución <${Math.round(e.execute.threshold * 100)}% HP`)
  if (e.stunChance)   parts.push(`${Math.round(e.stunChance * 100)}% stun`)
  if (e.buff)         parts.push(`+${Math.round(e.buff.pct * 100)}% ${e.buff.stat} ${e.buff.turns}t`)
  if (e.debuff)       parts.push(`-${Math.round(e.debuff.pct * 100)}% ${e.debuff.stat} rival`)
  if (e.thorns)       parts.push(`Refleja ${Math.round(e.thorns * 100)}% daño`)
  if (e.damageReduction) parts.push(`Reduce daño ${Math.round(e.damageReduction * 100)}%`)
  if (e.regen)        parts.push(`+${e.regen} HP/turno`)
  if (e.critBoost)    parts.push(`+${Math.round(e.critBoost * 100)}% crítico`)
  if (e.immunity)     parts.push(`Inmune a ${e.immunity}`)
  if (e.endure)       parts.push('Sobrevive golpe fatal')
  if (e.tiebreaker)   parts.push('Actúa primero en empates')
  return parts.join(' · ') || '—'
}

export default function SpellbookPage() {
  const router = useRouter()
  const [archFilter, setArchFilter] = useState<ArchFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [inventory, setInventory] = useState<InventoryEntry[]>([])
  const [loadingInv, setLoadingInv] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [gold, setGold] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/user/abilities').then(r => r.ok ? r.json() : { inventory: [] }),
      fetch('/api/me').then(r => r.ok ? r.json() : null),
    ]).then(([invData, meData]) => {
      setInventory(invData.inventory ?? [])
      if (meData?.gold !== undefined) setGold(meData.gold)
    }).finally(() => setLoadingInv(false))
  }, [])

  // Listen for wallet updates
  useEffect(() => {
    const handler = () => {
      fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.gold !== undefined) setGold(d.gold)
      })
    }
    window.addEventListener('wallet-update', handler)
    return () => window.removeEventListener('wallet-update', handler)
  }, [])

  const invMap = Object.fromEntries(inventory.map(i => [i.abilityId, i]))

  const filtered = ABILITIES.filter(ab => {
    if (archFilter !== 'all' && ab.archetype !== archFilter) return false
    if (typeFilter !== 'all' && ab.type !== typeFilter) return false
    if (search && !ab.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleBuy = async (abilityId: string) => {
    const shopItem = SHOP_ITEMS.find(i => i.abilityId === abilityId)
    if (!shopItem) return
    setBuying(abilityId)
    setBuyError(null)
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: shopItem.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'INSUFFICIENT_ESSENCIA') setBuyError('Oro insuficiente.')
        else setBuyError(data.error ?? 'Error al comprar.')
        return
      }
      // Update inventory
      setInventory(prev => {
        const existing = prev.find(i => i.abilityId === abilityId)
        if (existing) {
          return prev.map(i => i.abilityId === abilityId ? { ...i, quantity: i.quantity + 1 } : i)
        }
        return [...prev, { abilityId, quantity: 1, equippedIn: [] }]
      })
      if (data.newBalance?.gold !== undefined) {
        setGold(data.newBalance.gold)
        window.dispatchEvent(new CustomEvent('wallet-update'))
      }
    } catch {
      setBuyError('Error de conexión.')
    } finally {
      setBuying(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#08080F]/90 backdrop-blur-md border-b border-white/8 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/therian" className="text-white/40 hover:text-white/70 transition-colors text-sm">← Inicio</Link>
            <h1 className="text-lg font-bold text-white">📖 Libro de Hechizos</h1>
          </div>
          <div className="flex items-center gap-3">
            {gold !== null && (
              <span className="text-amber-400 text-sm font-semibold">🪙 {gold.toLocaleString()}</span>
            )}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/25 w-36"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto flex gap-2 mt-3 flex-wrap">
          {/* Archetype filter */}
          {(['all', 'forestal', 'electrico', 'acuatico', 'volcanico'] as ArchFilter[]).map(arch => {
            const meta = arch === 'all' ? null : ARCH_META[arch]
            const active = archFilter === arch
            return (
              <button
                key={arch}
                onClick={() => setArchFilter(arch)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? meta
                      ? `${meta.badge} border`
                      : 'bg-white/15 text-white border-white/30'
                    : 'bg-transparent text-white/40 border-white/10 hover:text-white/60 hover:border-white/20'
                }`}
              >
                {meta ? `${meta.emoji} ${meta.label}` : 'Todas'}
              </button>
            )
          })}

          <div className="w-px bg-white/10 self-stretch mx-1" />

          {/* Type filter */}
          {([['all', 'Todas'], ['active', 'Activas'], ['passive', 'Pasivas']] as [TypeFilter, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                typeFilter === t
                  ? 'bg-white/15 text-white border-white/30'
                  : 'bg-transparent text-white/40 border-white/10 hover:text-white/60 hover:border-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {buyError && (
          <div className="mb-4 text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
            {buyError}
          </div>
        )}

        {loadingInv ? (
          <div className="text-white/20 text-center py-20 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-white/20 text-center py-20 text-sm">No hay habilidades que coincidan.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(ab => {
              const meta = ARCH_META[ab.archetype]
              const shopItem = SHOP_ITEMS.find(i => i.abilityId === ab.id)
              const inv = invMap[ab.id]
              const owned = inv?.quantity ?? 0
              const equippedCount = inv?.equippedIn.length ?? 0
              const isBuying = buying === ab.id

              return (
                <div
                  key={ab.id}
                  className={`rounded-2xl border bg-white/3 backdrop-blur-sm p-4 flex flex-col gap-3 transition-all ${
                    owned > 0 ? `${meta.border}` : 'border-white/8'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${owned > 0 ? meta.text : 'text-white/70'}`}>
                          {ab.name}
                        </span>
                        {/* Type badge */}
                        <span className={`text-[9px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded border ${
                          ab.type === 'passive'
                            ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
                            : 'border-white/15 text-white/40 bg-white/5'
                        }`}>
                          {ab.type === 'passive' ? 'Pasiva' : 'Activa'}
                        </span>
                      </div>
                      {/* Archetype + CD */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-semibold ${meta.text}`}>{meta.emoji} {meta.label}</span>
                        {ab.type === 'active' && (
                          <span className="text-white/25 text-[10px]">
                            CD: {ab.cooldown === 0 ? '—' : `${ab.cooldown}t`}
                            {' · '}
                            {ab.target === 'self' ? 'Propio' : ab.target === 'ally' ? 'Aliado' : 'Rival'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Owned badge */}
                    {owned > 0 && (
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg border ${meta.badge} flex-shrink-0`}>
                        ×{owned}
                      </div>
                    )}
                  </div>

                  {/* Effect summary */}
                  <p className="text-white/40 text-[11px] leading-relaxed">
                    {effectSummary(ab)}
                  </p>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-white/6">
                    {/* Equipped info + equip link */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-white/25">
                        {owned === 0
                          ? 'No poseída'
                          : equippedCount > 0
                            ? `Equipada en ${equippedCount} Therian${equippedCount > 1 ? 's' : ''}`
                            : `Disponible (${owned - equippedCount} libre${owned - equippedCount > 1 ? 's' : ''})`
                        }
                      </span>
                      {owned > 0 && owned - equippedCount > 0 && (
                        <Link
                          href="/therian"
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${meta.badge} opacity-70 hover:opacity-100`}
                        >
                          → Equipar
                        </Link>
                      )}
                    </div>

                    {/* Buy button */}
                    {shopItem && (
                      <button
                        onClick={() => handleBuy(ab.id)}
                        disabled={isBuying}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all disabled:opacity-40 ${
                          owned === 0
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60'
                            : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/8 hover:border-white/20'
                        }`}
                      >
                        <span>🪙 {shopItem.costGold.toLocaleString()}</span>
                        <span className="text-white/30">·</span>
                        <span>{isBuying ? '...' : owned > 0 ? '+1 copia' : 'Comprar'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Innate abilities note */}
        <div className="mt-8 border-t border-white/6 pt-6">
          <h2 className="text-white/30 text-xs uppercase tracking-widest font-semibold mb-3">
            Habilidades Innatas (no equipables)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INNATE_ABILITIES.map(ab => {
              const meta = ARCH_META[ab.archetype]
              return (
                <div key={ab.id} className={`rounded-xl border ${meta.border} ${meta.bg} px-3 py-2`}>
                  <div className={`text-[11px] font-semibold ${meta.text}`}>{meta.emoji} {ab.name}</div>
                  <div className="text-white/25 text-[10px] mt-0.5">{meta.label} · Siempre activa</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
