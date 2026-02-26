'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { TherianDTO } from '@/lib/therian-dto'
import ShopModal from './ShopModal'

interface Wallet {
  gold: number
  essence: number
  therianSlots: number
}

interface Props {
  therian: TherianDTO
}

export default function NavShopButton({ therian: initialTherian }: Props) {
  const [showShop, setShowShop] = useState(false)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [localTherian, setLocalTherian] = useState(initialTherian)
  const [initialTab, setInitialTab] = useState<'gold' | 'coin'>('gold')
  const [highlightItem, setHighlightItem] = useState<string | undefined>(undefined)

  const openShop = (tab: 'gold' | 'coin' = 'gold', highlight?: string) => {
    setInitialTab(tab)
    setHighlightItem(highlight)
    setShowShop(true)
    if (!wallet) {
      fetch('/api/wallet')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setWallet(data) })
        .catch(() => {})
    }
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: 'gold' | 'coin'; highlight?: string }>).detail
      openShop(detail?.tab ?? 'gold', detail?.highlight)
    }
    window.addEventListener('open-shop', handler)
    return () => window.removeEventListener('open-shop', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button
        onClick={() => openShop()}
        className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all"
      >
        🛒 Tienda
      </button>

      {showShop && (
        wallet ? (
          <ShopModal
            therian={localTherian}
            wallet={wallet}
            initialTab={initialTab}
            highlightItem={highlightItem}
            onClose={() => setShowShop(false)}
            onPurchase={(newWallet, updatedTherian) => {
              setWallet(newWallet)
              window.dispatchEvent(new CustomEvent('wallet-update'))
              if (updatedTherian) {
                setLocalTherian(updatedTherian)
                window.dispatchEvent(new CustomEvent('therian-updated', { detail: updatedTherian }))
              }
            }}
          />
        ) : createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowShop(false)}
          >
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
          </div>,
          document.body
        )
      )}
    </>
  )
}
