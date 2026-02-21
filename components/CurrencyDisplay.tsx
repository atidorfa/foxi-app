'use client'

import { useState, useEffect } from 'react'

interface Wallet {
  gold: number
  essence: number
}

export default function CurrencyDisplay() {
  const [wallet, setWallet] = useState<Wallet | null>(null)

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

  if (!wallet) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-16 rounded-full bg-white/5 animate-pulse" />
        <div className="h-6 w-10 rounded-full bg-white/5 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      {/* GOLD — ganado por actividades y combates */}
      <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
        <span className="text-sm">🪙</span>
        <span className="text-amber-400 font-semibold">
          {wallet.gold.toLocaleString('es-AR')}
        </span>
      </div>
      {/* ESENCIA — premium, intercambiable */}
      <div className="flex items-center gap-1.5 rounded-full border border-blue-700/30 bg-blue-900/20 px-3 py-1.5">
        <span className="text-sm">🪙</span>
        <span className="text-blue-400 font-semibold">
          {wallet.essence.toLocaleString('es-AR')}
        </span>
      </div>
    </div>
  )
}
