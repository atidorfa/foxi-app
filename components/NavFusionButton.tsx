'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { TherianDTO } from '@/lib/therian-dto'
import FusionModal from './FusionModal'

export default function NavFusionButton() {
  const [showFusion, setShowFusion] = useState(false)
  const [therians, setTherians] = useState<TherianDTO[] | null>(null)
  const [loading, setLoading] = useState(false)

  const openFusion = () => {
    setShowFusion(true)
    if (!therians) {
      setLoading(true)
      fetch('/api/therians/mine')
        .then(r => r.ok ? r.json() : [])
        .then(data => { setTherians(data); setLoading(false) })
        .catch(() => { setTherians([]); setLoading(false) })
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
        loading || !therians ? createPortal(
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
            onClose={() => setShowFusion(false)}
            onSuccess={() => {
              setShowFusion(false)
              setTherians(null)
              window.location.href = '/therian'
            }}
          />
        )
      )}
    </>
  )
}
