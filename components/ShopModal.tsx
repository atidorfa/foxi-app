'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { TherianDTO } from '@/lib/therian-dto'
import { SHOP_ITEMS } from '@/lib/shop/catalog'
import { EGGS } from '@/lib/items/eggs'

interface Wallet {
  gold: number
  essence: number
  therianSlots: number
}

interface Props {
  therian: TherianDTO
  wallet: Wallet
  onClose: () => void
  onPurchase: (newWallet: Wallet, updatedTherian?: TherianDTO) => void
}

type Tab = 'gold' | 'coin'

const EXCHANGE_RATE = 200

export default function ShopModal({ therian, wallet, onClose, onPurchase }: Props) {
  const [tab, setTab] = useState<Tab>('gold')
  const [renameInput, setRenameInput] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exchanging, setExchanging] = useState(false)
  const [exchangeQty, setExchangeQty] = useState(1)
  const [eggQty, setEggQty] = useState<Record<string, number>>({})

  const goldItems = SHOP_ITEMS.filter(i => i.costGold > 0)
  const coinItems = SHOP_ITEMS.filter(i => i.costCoin > 0)
  const displayItems = tab === 'gold' ? goldItems : coinItems
  const essenciaEggs = EGGS.filter(e => e.currency === 'essencia')
  const coinEggs = EGGS.filter(e => e.currency === 'therianCoin')
  const displayEggs = tab === 'coin' ? essenciaEggs : coinEggs

  function getEggQty(id: string) { return eggQty[id] ?? 1 }
  function setQty(id: string, val: number) {
    setEggQty(prev => ({ ...prev, [id]: Math.max(1, Math.min(99, val)) }))
  }

  async function handleBuy(itemId: string, quantity = 1) {
    setError(null)

    if (itemId === 'rename') {
      if (renamingId !== itemId) {
        setRenamingId(itemId)
        return
      }
      if (!renameInput.trim()) return
    }

    setLoading(itemId)
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          quantity,
          ...(itemId === 'rename' ? { newName: renameInput.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const messages: Record<string, string> = {
          INSUFFICIENT_ESSENCIA: `GOLD insuficiente (necesitas ${data.required}, tienes ${data.available})`,
          INSUFFICIENT_COIN: `ESENCIA insuficiente (necesitas ${data.required}, tienes ${data.available})`,
          NAME_TAKEN: 'Ese nombre ya está en uso.',
          ALREADY_OWNED: 'Ya tienes este accesorio.',
          NAME_REQUIRED: 'Ingresa un nombre.',
        }
        setError(messages[data.error] ?? 'Error al comprar.')
        return
      }
      setRenamingId(null)
      setRenameInput('')
      window.dispatchEvent(new Event('inventory-updated'))
      onPurchase(data.newBalance, data.updatedTherian)
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(null)
    }
  }

  async function handleExchange() {
    setError(null)
    setExchanging(true)
    const amount = exchangeQty * EXCHANGE_RATE
    try {
      const res = await fetch('/api/wallet/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'INSUFFICIENT_ESSENCIA'
          ? `Necesitas ${amount.toLocaleString('es-AR')} GOLD para cambiar.`
          : 'Error al cambiar.')
        return
      }
      onPurchase({ gold: data.gold, essence: data.essence, therianSlots: wallet.therianSlots })
    } catch {
      setError('Error de conexión.')
    } finally {
      setExchanging(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#13131F] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#13131F] border-b border-white/5 px-5 pt-5 pb-3 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">Tienda</h2>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/70 text-xl leading-none transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Balance */}
          <div className="flex items-center gap-3 text-xs font-mono mb-3">
            <span className="flex items-center gap-1 text-amber-400">
              <span>🪙</span>
              <span className="font-semibold">{wallet.gold.toLocaleString('es-AR')} GOLD</span>
            </span>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1 text-blue-400">
              <span>💎</span>
              <span className="font-semibold">{wallet.essence.toLocaleString('es-AR')} ESENCIA</span>
            </span>
          </div>

          {/* Exchange */}
          {(() => {
            const maxQty = Math.max(1, Math.floor(wallet.gold / EXCHANGE_RATE))
            const clampedQty = Math.min(exchangeQty, maxQty)
            const totalGold = clampedQty * EXCHANGE_RATE
            const canExchange = wallet.gold >= EXCHANGE_RATE
            return (
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                  <button
                    onClick={() => setExchangeQty(q => Math.max(1, q - 1))}
                    disabled={exchangeQty <= 1 || !canExchange}
                    className="px-2.5 py-2 text-sm text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-xs font-mono font-semibold text-white/80">{clampedQty}</span>
                  <button
                    onClick={() => setExchangeQty(q => Math.min(maxQty, q + 1))}
                    disabled={clampedQty >= maxQty || !canExchange}
                    className="px-2.5 py-2 text-sm text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleExchange}
                  disabled={exchanging || !canExchange}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {exchanging
                    ? '⏳ Canjeando...'
                    : `🪙 ${totalGold.toLocaleString('es-AR')} GOLD → 💎 ${clampedQty} ESENCIA`}
                </button>
              </div>
            )
          })()}

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {(['gold', 'coin'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setRenamingId(null) }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  tab === t
                    ? t === 'gold'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-900/30 text-blue-400 border border-blue-700/40'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {t === 'gold' ? '🪙 GOLD' : '💎 ESENCIA'}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="px-4 py-3 space-y-3">
          {error && (
            <p className="text-red-400 text-xs text-center italic">{error}</p>
          )}

          {displayItems.map(item => {
            const owned = item.type === 'cosmetic' && item.accessoryId
              ? Object.values(therian.equippedAccessories ?? {}).some(v => {
                  const typeId = v.includes(':') ? v.split(':')[0] : v
                  return typeId === item.accessoryId
                })
              : item.type === 'slot'
              ? wallet.therianSlots >= 8
              : false
            const isLoadingThis = loading === item.id
            const cost = item.costGold > 0 ? item.costGold : item.costCoin
            const costLabel = item.costGold > 0
              ? `${cost.toLocaleString('es-AR')} 🪙`
              : `${cost} 💎`
            const canAfford = item.costGold > 0
              ? wallet.gold >= item.costGold
              : wallet.essence >= item.costCoin

            return (
              <div
                key={item.id}
                className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{item.name}</p>
                      <p className="text-[#8B84B0] text-xs">{item.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-white/60 flex-shrink-0 mt-0.5">{costLabel}</span>
                </div>

                {/* Rename input */}
                {item.id === 'rename' && renamingId === 'rename' && (
                  <input
                    type="text"
                    value={renameInput}
                    onChange={e => setRenameInput(e.target.value)}
                    placeholder="Nuevo nombre..."
                    maxLength={24}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/50"
                    autoFocus
                  />
                )}

                {owned ? (
                  <div className="text-center text-xs text-[#8B84B0] italic py-0.5">
                    {item.type === 'slot' ? '✓ Máximo de slots alcanzado (8/8)' : '✓ Ya tienes esto'}
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(item.id)}
                    disabled={isLoadingThis || !canAfford}
                    className={`w-full rounded-lg py-2 text-xs font-semibold transition-all ${
                      !canAfford
                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                        : item.id === 'rename' && renamingId !== 'rename'
                        ? 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                        : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:from-purple-600 hover:to-purple-400'
                    }`}
                  >
                    {isLoadingThis ? '⏳ Procesando...'
                      : item.id === 'rename' && renamingId === 'rename' ? 'Confirmar nombre'
                      : item.id === 'rename' ? 'Cambiar nombre'
                      : 'Comprar'}
                  </button>
                )}
              </div>
            )
          })}

          {/* Huevos de Fusión */}
          {displayEggs.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest text-white/30 pt-1">Huevos de Fusión</p>
              {displayEggs.map(egg => {
                const isLoadingThis = loading === egg.id
                const qty = getEggQty(egg.id)
                const totalCost = egg.price * qty
                const canAfford = wallet.essence >= totalCost
                const costLabel = `${egg.price.toLocaleString('es-AR')} 💎 c/u`
                const totalLabel = `${totalCost.toLocaleString('es-AR')} 💎`
                const RARITY_COLOR: Record<string, string> = {
                  COMMON: 'text-gray-400', UNCOMMON: 'text-emerald-400', RARE: 'text-blue-400',
                  EPIC: 'text-purple-400', LEGENDARY: 'text-amber-400', MYTHIC: 'text-red-400',
                }
                return (
                  <div key={egg.id} className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{egg.emoji}</span>
                        <div>
                          <p className="text-white font-semibold text-sm">{egg.name}</p>
                          <p className={`text-xs font-semibold ${RARITY_COLOR[egg.rarity]}`}>{egg.description}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-white/60 flex-shrink-0 mt-0.5">{costLabel}</span>
                    </div>

                    {/* Quantity selector */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                        <button
                          onClick={() => setQty(egg.id, qty - 1)}
                          disabled={qty <= 1}
                          className="px-2.5 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-mono text-white font-semibold">{qty}</span>
                        <button
                          onClick={() => setQty(egg.id, qty + 1)}
                          disabled={qty >= 99}
                          className="px-2.5 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleBuy(egg.id, qty)}
                        disabled={isLoadingThis || !canAfford}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                          !canAfford
                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:from-purple-600 hover:to-purple-400'
                        }`}
                      >
                        {isLoadingThis ? '⏳...' : `Comprar ×${qty} · ${totalLabel}`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
