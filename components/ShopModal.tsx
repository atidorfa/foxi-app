'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { TherianDTO } from '@/lib/therian-dto'
import { SHOP_ITEMS, getSlotCost } from '@/lib/shop/catalog'
import { EGGS } from '@/lib/items/eggs'
import { RUNES } from '@/lib/catalogs/runes'

interface Wallet {
  gold: number
  essence: number
  therianSlots: number
}

interface Props {
  therian: TherianDTO
  therians?: TherianDTO[]
  wallet: Wallet
  initialTab?: Tab
  highlightItem?: string
  onClose: () => void
  onPurchase: (newWallet: Wallet, updatedTherian?: TherianDTO) => void
}

type Tab = 'huevos' | 'accesorios' | 'runas' | 'cuenta'

const TABS: { id: Tab; label: string }[] = [
  { id: 'huevos',     label: '🥚 Huevos'     },
  { id: 'accesorios', label: '🎨 Accesorios'  },
  { id: 'runas',      label: '🔮 Runas'       },
  { id: 'cuenta',     label: '⚙️ Cuenta'      },
]

const SLOT_LABELS: Record<string, string> = {
  orejas:   '👂 Orejas',
  cola:     '🦊 Cola',
  ojos:     '👁️ Ojos',
  garras:   '🐾 Garras',
  cabeza:   '👑 Cabeza',
  anteojos: '🕶️ Anteojos',
}

const RARITY_COLOR: Record<string, string> = {
  COMMON:    'text-gray-400',
  UNCOMMON:  'text-emerald-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-amber-400',
  MYTHIC:    'text-red-400',
}

export default function ShopModal({ therian, therians, wallet, initialTab = 'accesorios', highlightItem, onClose, onPurchase }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [renameInput, setRenameInput] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameTargetId, setRenameTargetId] = useState<string>(therian.id)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [eggQty, setEggQty] = useState<Record<string, number>>({})
  const [achievementUnlocked, setAchievementUnlocked] = useState<{ title: string; rewardLabel: string } | null>(null)
  const [accessorySlot, setAccessorySlot] = useState<string>('orejas')
  const [runasTier, setRunasTier] = useState<1 | 2 | 3>(1)

  const accessoryItems = SHOP_ITEMS.filter(i => i.type === 'cosmetic')
  const cuentaItems = SHOP_ITEMS.filter(i => i.type === 'service' || i.type === 'slot')

  function getEggQty(id: string) { return eggQty[id] ?? 1 }
  function setQty(id: string, val: number) {
    setEggQty(prev => ({ ...prev, [id]: Math.max(1, Math.min(99, val)) }))
  }

  async function handleBuy(itemId: string, quantity = 1) {
    setError(null)
    if (itemId === 'rename') {
      if (renamingId !== itemId) { setRenamingId(itemId); return }
      if (!renameInput.trim()) return
    }
    setLoading(itemId)
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId, quantity,
          ...(itemId === 'rename' ? { newName: renameInput.trim(), therianId: renameTargetId } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const messages: Record<string, string> = {
          INSUFFICIENT_ESSENCIA: `GOLD insuficiente (necesitas ${data.required}, tienes ${data.available})`,
          INSUFFICIENT_COIN:     `ESENCIA insuficiente (necesitas ${data.required}, tienes ${data.available})`,
          NAME_TAKEN:   'Ese nombre ya está en uso.',
          ALREADY_OWNED:'Ya tienes este accesorio.',
          NAME_REQUIRED:'Ingresa un nombre.',
        }
        setError(messages[data.error] ?? 'Error al comprar.')
        return
      }
      setRenamingId(null)
      setRenameInput('')
      window.dispatchEvent(new Event('inventory-updated'))
      onPurchase(data.newBalance, data.updatedTherian)
      if (data.achievementUnlocked) setAchievementUnlocked(data.achievementUnlocked)
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(null)
    }
  }

  function renderShopItem(item: typeof SHOP_ITEMS[number]) {
    const owned = item.type === 'cosmetic' && item.accessoryId
      ? Object.values(therian.equippedAccessories ?? {}).some(v => {
          const typeId = v.includes(':') ? v.split(':')[0] : v
          return typeId === item.accessoryId
        })
      : item.type === 'slot'
      ? wallet.therianSlots >= 8
      : false
    const isLoadingThis = loading === item.id
    const effectiveCoinCost = item.type === 'slot' ? getSlotCost(wallet.therianSlots) : item.costCoin
    const cost = item.costGold > 0 ? item.costGold : effectiveCoinCost
    const costLabel = item.costGold > 0
      ? `${cost.toLocaleString('es-AR')} 🪙`
      : `${cost} 💎`
    const canAfford = item.costGold > 0
      ? wallet.gold >= item.costGold
      : wallet.essence >= effectiveCoinCost
    const isHighlighted = item.id === highlightItem

    return (
      <div
        key={item.id}
        className={`rounded-xl border p-3 flex flex-col gap-2 ${
          isHighlighted
            ? 'border-amber-400/70 bg-amber-500/8 shadow-[0_0_18px_rgba(245,158,11,0.35)] animate-pulse'
            : 'border-white/5 bg-white/3'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xl leading-none">{item.emoji}</span>
          <span className="text-[10px] font-mono text-white/50 leading-none mt-0.5">{costLabel}</span>
        </div>
        <div>
          <p className="text-white font-semibold text-xs leading-tight">{item.name}</p>
          <p className="text-[#8B84B0] text-[10px] leading-tight mt-0.5">{item.description}</p>
        </div>

        {item.id === 'rename' && renamingId === 'rename' && (
          <div className="flex flex-col gap-1.5">
            {therians && therians.length > 1 && (
              <select
                value={renameTargetId}
                onChange={e => setRenameTargetId(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs text-white outline-none focus:border-purple-500/50"
              >
                {therians.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#1A1A2E]">
                    {t.name ?? t.species.name} ({t.rarity})
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              placeholder="Nuevo nombre..."
              maxLength={24}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500/50"
              autoFocus
            />
          </div>
        )}

        <div className="mt-auto">
          {owned ? (
            <div className="text-center text-[10px] text-[#8B84B0] italic py-0.5">
              {item.type === 'slot' ? '✓ Máximo (8/8)' : '✓ Ya tienes esto'}
            </div>
          ) : (
            <button
              onClick={() => handleBuy(item.id)}
              disabled={isLoadingThis || !canAfford}
              className={`w-full rounded-lg py-1.5 text-[10px] font-semibold transition-all ${
                !canAfford
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : item.id === 'rename' && renamingId !== 'rename'
                  ? 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:from-purple-600 hover:to-purple-400'
              }`}
            >
              {isLoadingThis ? '⏳...'
                : item.id === 'rename' && renamingId === 'rename' ? 'Confirmar'
                : item.id === 'rename' ? 'Cambiar nombre'
                : 'Comprar'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl h-[680px] flex flex-col rounded-2xl border border-white/10 bg-[#13131F] shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-white/5 px-5 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-white font-bold text-sm uppercase tracking-widest">Tienda</h2>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="flex items-center gap-1 text-amber-400">
                    <span>🪙</span>
                    <span className="font-semibold">{wallet.gold.toLocaleString('es-AR')}</span>
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <span>💎</span>
                    <span className="font-semibold">{wallet.essence.toLocaleString('es-AR')}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white/70 text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body: tabs izquierda + contenido derecha */}
          <div className="flex-1 flex overflow-hidden">

            {/* Tabs verticales */}
            <div className="flex-shrink-0 w-32 border-r border-white/5 flex flex-col py-2 gap-0.5">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setError(null); setRenamingId(null) }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors rounded-none ${
                    tab === t.id
                      ? 'bg-purple-500/15 text-purple-300 border-r-2 border-purple-400'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/3'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {error && <p className="text-red-400 text-xs text-center italic">{error}</p>}

            {/* Tab: Huevos */}
            {tab === 'huevos' && (
              <div className="grid grid-cols-3 gap-3">
                {EGGS.map(egg => {
                  const isLoadingThis = loading === egg.id
                  const qty = getEggQty(egg.id)
                  const totalCost = egg.price * qty
                  const isGoldEgg = egg.currency === 'gold'
                  const canAfford = isGoldEgg ? wallet.gold >= totalCost : wallet.essence >= totalCost
                  const currencyIcon = isGoldEgg ? '🪙' : '💎'
                  return (
                    <div key={egg.id} className="rounded-xl border border-white/5 bg-white/3 p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xl leading-none">{egg.emoji}</span>
                        <span className="text-[10px] font-mono text-white/50">{egg.price.toLocaleString('es-AR')} {currencyIcon}</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-xs leading-tight">{egg.name}</p>
                        <p className={`text-[10px] font-semibold ${RARITY_COLOR[egg.rarity]}`}>{egg.rarity.charAt(0) + egg.rarity.slice(1).toLowerCase()}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                        <button onClick={() => setQty(egg.id, qty - 1)} disabled={qty <= 1} className="px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">−</button>
                        <span className="text-xs font-mono text-white font-semibold">{qty}</span>
                        <button onClick={() => setQty(egg.id, qty + 1)} disabled={qty >= 99} className="px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">+</button>
                      </div>
                      <button
                        onClick={() => handleBuy(egg.id, qty)}
                        disabled={isLoadingThis || !canAfford}
                        className={`w-full rounded-lg py-1.5 text-[10px] font-semibold transition-all ${
                          !canAfford
                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:from-purple-600 hover:to-purple-400'
                        }`}
                      >
                        {isLoadingThis ? '⏳...' : `×${qty} · ${totalCost.toLocaleString('es-AR')} ${currencyIcon}`}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tab: Accesorios — sub-tabs por slot */}
            {tab === 'accesorios' && (() => {
              const bySlot = accessoryItems.reduce<Record<string, typeof accessoryItems>>((acc, item) => {
                const slot = item.slot ?? 'otros'
                acc[slot] = acc[slot] ? [...acc[slot], item] : [item]
                return acc
              }, {})
              const slotOrder = ['orejas', 'cola', 'ojos', 'garras', 'cabeza', 'anteojos', 'otros'].filter(s => bySlot[s])
              const activeSlot = slotOrder.includes(accessorySlot) ? accessorySlot : slotOrder[0]
              return (
                <>
                  {/* Sub-tabs */}
                  <div className="flex flex-wrap gap-1">
                    {slotOrder.map(slotId => (
                      <button
                        key={slotId}
                        onClick={() => setAccessorySlot(slotId)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                          activeSlot === slotId
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                        }`}
                      >
                        {SLOT_LABELS[slotId] ?? slotId}
                      </button>
                    ))}
                  </div>
                  {/* Items del slot activo */}
                  <div className="grid grid-cols-3 gap-3">
                    {(bySlot[activeSlot] ?? []).map(item => renderShopItem(item))}
                  </div>
                </>
              )
            })()}

            {/* Tab: Runas */}
            {tab === 'runas' && (() => {
              const runeItems = SHOP_ITEMS.filter(i => i.type === 'rune' && i.tier === runasTier)
              return (
                <>
                  {/* Tier sub-tabs */}
                  <div className="flex gap-1">
                    {([1, 2, 3] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setRunasTier(t)}
                        className={`rounded-lg px-3 py-1 text-[10px] font-semibold transition-colors ${
                          runasTier === t
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                        }`}
                      >
                        Tier {t} {t === 1 ? '· 🪙' : t === 2 ? '· 🪙' : '· 💎'}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {runeItems.map(item => {
                      const rune = RUNES.find(r => r.id === item.runeId)
                      const isLoadingThis = loading === item.id
                      const cost = item.costGold > 0 ? item.costGold : item.costCoin
                      const costLabel = item.costGold > 0 ? `${cost.toLocaleString('es-AR')} 🪙` : `${cost} 💎`
                      const canAfford = item.costGold > 0 ? wallet.gold >= item.costGold : wallet.essence >= item.costCoin
                      return (
                        <div key={item.id} className="rounded-xl border border-white/5 bg-white/3 p-3 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xl leading-none">{item.emoji}</span>
                            <span className="text-[10px] font-mono text-white/50 leading-none mt-0.5">{costLabel}</span>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-xs leading-tight">{item.name}</p>
                            <p className="text-[#8B84B0] text-[10px] leading-tight mt-0.5">{rune?.lore}</p>
                          </div>
                          {rune && (
                            <div className="font-mono text-[10px] flex flex-wrap gap-1">
                              {rune.mod.vitality  !== undefined && <span className="text-emerald-400">+{rune.mod.vitality}🌿</span>}
                              {rune.mod.agility   !== undefined && <span className="text-yellow-400">+{rune.mod.agility}⚡</span>}
                              {rune.mod.instinct  !== undefined && <span className="text-blue-400">+{rune.mod.instinct}🌌</span>}
                              {rune.mod.charisma  !== undefined && <span className="text-amber-400">+{rune.mod.charisma}✨</span>}
                            </div>
                          )}
                          <div className="mt-auto">
                            <button
                              onClick={() => handleBuy(item.id)}
                              disabled={isLoadingThis || !canAfford}
                              className={`w-full rounded-lg py-1.5 text-[10px] font-semibold transition-all ${
                                !canAfford
                                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:from-purple-600 hover:to-purple-400'
                              }`}
                            >
                              {isLoadingThis ? '⏳...' : 'Comprar'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}

            {/* Tab: Cuenta */}
            {tab === 'cuenta' && (
              <div className="grid grid-cols-3 gap-3">
                {cuentaItems.map(item => renderShopItem(item))}
              </div>
            )}
          </div>

          </div>{/* end body */}
        </div>
      </div>

      {achievementUnlocked && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => { setAchievementUnlocked(null); router.refresh() }}
        >
          <div
            className="relative bg-[#13131F] border border-amber-500/40 rounded-2xl p-8 w-full max-w-xs text-center shadow-[0_0_60px_rgba(245,158,11,0.2)] space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-5xl">🏆</div>
            <div>
              <p className="text-amber-400 text-[10px] uppercase tracking-widest font-semibold mb-1">Logro desbloqueado</p>
              <h2 className="text-white font-bold text-xl">{achievementUnlocked.title}</h2>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
              <p className="text-amber-300 font-semibold text-sm">{achievementUnlocked.rewardLabel}</p>
            </div>
            <button
              onClick={() => { setAchievementUnlocked(null); router.refresh() }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
            >
              ¡Genial!
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
