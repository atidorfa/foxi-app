'use client'

import { useState, useEffect, useRef } from 'react'

const BUY_RATE  = 100
const SELL_RATE = 80

interface Wallet { gold: number; essence: number }
type Direction = 'buy' | 'sell'
interface Pending { direction: Direction; qty: number }

export default function CurrencyDisplay() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [showExchange, setShowExchange] = useState(false)
  const [buyQty, setBuyQty]   = useState(1)
  const [sellQty, setSellQty] = useState(1)
  const [pending, setPending] = useState<Pending | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const fetchWallet = () => {
    fetch('/api/wallet')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setWallet(data) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchWallet()
    window.addEventListener('wallet-update', fetchWallet)
    return () => window.removeEventListener('wallet-update', fetchWallet)
  }, [])

  useEffect(() => {
    if (!showExchange) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowExchange(false)
        setPending(null)
        setError(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExchange])

  async function confirmExchange() {
    if (!wallet || !pending) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/wallet/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: pending.direction, qty: pending.qty }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(
          data.error === 'INSUFFICIENT_GOLD'    ? `Necesitas ${(pending.qty * BUY_RATE).toLocaleString('es-AR')} oro.` :
          data.error === 'INSUFFICIENT_ESSENCE' ? 'No tenés suficiente esencia.' :
          'Error al cambiar.'
        )
        setPending(null)
        return
      }
      setWallet({ gold: data.gold, essence: data.essence })
      window.dispatchEvent(new CustomEvent('wallet-update'))
      setPending(null)
    } catch {
      setError('Error de conexión.')
      setPending(null)
    } finally {
      setLoading(false)
    }
  }

  if (!wallet) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-16 rounded-full bg-white/5 animate-pulse" />
        <div className="h-6 w-10 rounded-full bg-white/5 animate-pulse" />
      </div>
    )
  }

  const maxBuy      = Math.max(1, Math.floor(wallet.gold / BUY_RATE))
  const maxSell     = Math.max(1, wallet.essence)
  const clampedBuy  = Math.min(buyQty,  maxBuy)
  const clampedSell = Math.min(sellQty, maxSell)
  const canBuy      = wallet.gold >= BUY_RATE
  const canSell     = wallet.essence >= 1

  const confirmLabel = pending
    ? pending.direction === 'buy'
      ? `🪙 ${(pending.qty * BUY_RATE).toLocaleString('es-AR')} → 💎 ${pending.qty}`
      : `💎 ${pending.qty} → 🪙 ${(pending.qty * SELL_RATE).toLocaleString('es-AR')}`
    : ''

  return (
    <div ref={ref} className="relative flex items-center gap-2 text-xs font-mono">
      {/* GOLD */}
      <button
        onClick={() => { setShowExchange(v => !v); setPending(null); setError(null) }}
        className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 hover:border-amber-500/40 hover:bg-amber-500/10 transition-colors"
      >
        <span className="text-sm">🪙</span>
        <span className="text-amber-400 font-semibold">{wallet.gold.toLocaleString('es-AR')}</span>
      </button>

      {/* ESENCIA */}
      <button
        onClick={() => { setShowExchange(v => !v); setPending(null); setError(null) }}
        className="flex items-center gap-1.5 rounded-full border border-blue-700/30 bg-blue-900/20 px-3 py-1.5 hover:border-blue-600/50 hover:bg-blue-900/30 transition-colors"
      >
        <span className="text-sm">💎</span>
        <span className="text-blue-400 font-semibold">{wallet.essence.toLocaleString('es-AR')}</span>
      </button>

      {/* Exchange popover */}
      {showExchange && (
        <div className="absolute top-full right-0 mt-2 w-72 rounded-xl border border-blue-700/30 bg-[#13131F] shadow-2xl p-4 space-y-3 z-[9999]">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Intercambio</p>

          {/* Buy: gold → essence */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/30 font-mono">{BUY_RATE} 🪙 = 1 💎</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                <button onClick={() => setBuyQty(q => Math.max(1, q - 1))} disabled={buyQty <= 1 || !canBuy}
                  className="px-2.5 py-1.5 text-sm text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">−</button>
                <span className="w-8 text-center text-xs font-mono font-semibold text-white/80">{clampedBuy}</span>
                <button onClick={() => setBuyQty(q => Math.min(maxBuy, q + 1))} disabled={clampedBuy >= maxBuy || !canBuy}
                  className="px-2.5 py-1.5 text-sm text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">+</button>
              </div>
              <button
                onClick={() => { setPending({ direction: 'buy', qty: clampedBuy }); setError(null) }}
                disabled={!canBuy}
                className="flex-1 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {`🪙 ${(clampedBuy * BUY_RATE).toLocaleString('es-AR')} → 💎 ${clampedBuy}`}
              </button>
            </div>
          </div>

          <div className="border-t border-white/6" />

          {/* Sell: essence → gold */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/30 font-mono">1 💎 = {SELL_RATE} 🪙</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                <button onClick={() => setSellQty(q => Math.max(1, q - 1))} disabled={sellQty <= 1 || !canSell}
                  className="px-2.5 py-1.5 text-sm text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">−</button>
                <span className="w-8 text-center text-xs font-mono font-semibold text-white/80">{clampedSell}</span>
                <button onClick={() => setSellQty(q => Math.min(maxSell, q + 1))} disabled={clampedSell >= maxSell || !canSell}
                  className="px-2.5 py-1.5 text-sm text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">+</button>
              </div>
              <button
                onClick={() => { setPending({ direction: 'sell', qty: clampedSell }); setError(null) }}
                disabled={!canSell}
                className="flex-1 rounded-lg border border-blue-700/30 bg-blue-900/15 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-900/25 hover:border-blue-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {`💎 ${clampedSell} → 🪙 ${(clampedSell * SELL_RATE).toLocaleString('es-AR')}`}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          {/* Confirmation popup */}
          {pending && (
            <div className="rounded-xl border border-white/10 bg-white/4 p-3 space-y-2">
              <p className="text-white/60 text-xs text-center">¿Confirmar intercambio?</p>
              <p className="text-white font-semibold text-xs text-center">{confirmLabel}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPending(null)}
                  disabled={loading}
                  className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 text-xs transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmExchange}
                  disabled={loading}
                  className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  {loading ? '⏳...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
