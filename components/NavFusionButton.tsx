'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { TherianDTO } from '@/lib/therian-dto'
import type { InventoryItemDTO } from '@/app/api/inventory/route'
import FusionModal from './FusionModal'

export default function NavFusionButton() {
  const [showFusion, setShowFusion] = useState(false)
  const [therians, setTherians] = useState<TherianDTO[] | null>(null)
  const [inventory, setInventory] = useState<InventoryItemDTO[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = () => {
      if (showFusion) {
        fetch('/api/inventory')
          .then(r => r.ok ? r.json() : { items: [] })
          .then(data => setInventory(data.items))
          .catch(() => setInventory([]))
      } else {
        setInventory(null) // invalidate cache
      }
    }
    window.addEventListener('inventory-updated', handler)
    return () => window.removeEventListener('inventory-updated', handler)
  }, [showFusion])

  const openFusion = () => {
    setShowFusion(true)
    if (!therians || !inventory) {
      setLoading(true)
      Promise.all([
        fetch('/api/therians/mine').then(r => r.ok ? r.json() : []),
        fetch('/api/inventory').then(r => r.ok ? r.json() : { items: [] }),
      ])
        .then(([therianData, invData]) => {
          setTherians(therianData)
          setInventory(invData.items ?? [])
          setLoading(false)
        })
        .catch(() => { setTherians([]); setInventory([]); setLoading(false) })
    }
  }

  return (
    <>
      <button
        onClick={openFusion}
        className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all"
      >
        ⚗️ Fusión
      </button>

      {showFusion && (
        loading || !therians || !inventory ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFusion(false)}
          >
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
          </div>,
          document.body
        ) : (
          <FusionModal
            therians={therians}
            inventory={inventory}
            onClose={() => setShowFusion(false)}
            onSuccess={() => {
              setShowFusion(false)
              setTherians(null)
              setInventory(null)
              window.location.href = '/therian'
            }}
          />
        )
      )}
    </>
  )
}
