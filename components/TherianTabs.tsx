'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TherianDTO } from '@/lib/therian-dto'
import TherianAvatar from './TherianAvatar'
import TherianCard from './TherianCard'

interface Props {
  therians: TherianDTO[]
  ranks: Record<string, number>
  slots: number
}

const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-gray-500/30',
  UNCOMMON:  'border-emerald-500/40',
  RARE:      'border-blue-500/40',
  EPIC:      'border-purple-500/50',
  LEGENDARY: 'border-amber-500/60',
  MYTHIC:    'border-red-500/60',
}

const RARITY_BORDER_ACTIVE: Record<string, string> = {
  COMMON:    'border-gray-400/60 shadow-[0_0_12px_rgba(156,163,175,0.2)]',
  UNCOMMON:  'border-emerald-400/70 shadow-[0_0_14px_rgba(52,211,153,0.25)]',
  RARE:      'border-blue-400/70 shadow-[0_0_14px_rgba(96,165,250,0.25)]',
  EPIC:      'border-purple-400/80 shadow-[0_0_16px_rgba(192,132,252,0.3)]',
  LEGENDARY: 'border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.35)]',
  MYTHIC:    'border-red-400/90 shadow-[0_0_24px_rgba(239,68,68,0.4)]',
}

const ORDER_KEY = 'therian-grid-order'

function loadOrder(therians: TherianDTO[]): string[] {
  try {
    const saved = localStorage.getItem(ORDER_KEY)
    if (saved) {
      const parsed: string[] = JSON.parse(saved)
      const ids = new Set(therians.map(t => t.id))
      // Keep saved order, discard IDs no longer present, append new ones at end
      const filtered = parsed.filter(id => ids.has(id))
      const missing = therians.map(t => t.id).filter(id => !filtered.includes(id))
      return [...filtered, ...missing]
    }
  } catch {}
  return therians.map(t => t.id)
}

export default function TherianTabs({ therians, ranks, slots }: Props) {
  const router = useRouter()
  const [order, setOrder] = useState<string[]>(() => {
    // SSR-safe: will be corrected in useEffect
    return therians.map(t => t.id)
  })
  const [activeId, setActiveId] = useState<string>(therians[0]?.id ?? '')
  const [dragOver, setDragOver] = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  // Local copy of therians updated by TherianCard events (so dots refresh without page reload)
  const [localTherians, setLocalTherians] = useState<TherianDTO[]>(therians)
  // Load persisted order after mount (client-only)
  useEffect(() => {
    setOrder(loadOrder(therians))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for therian state changes dispatched by TherianCard after action/bite
  useEffect(() => {
    const handler = (e: Event) => {
      const updated = (e as CustomEvent<TherianDTO>).detail
      if (!updated?.id) return
      setLocalTherians(prev => prev.map(t => t.id === updated.id ? updated : t))
    }
    window.addEventListener('therian-updated', handler)
    return () => window.removeEventListener('therian-updated', handler)
  }, [])

  const saveOrder = useCallback((newOrder: string[]) => {
    setOrder(newOrder)
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(newOrder)) } catch {}
  }, [])

  // Sorted therians according to order (uses localTherians so dots refresh live)
  const sortedTherians = order
    .map(id => localTherians.find(t => t.id === id))
    .filter(Boolean) as TherianDTO[]

  const active = localTherians.find(t => t.id === activeId) ?? localTherians[0]
  const hasAvailableSlot = therians.length < slots
  const showGrid = therians.length > 1 || hasAvailableSlot

  // Up to 8 cells: real therians + 1 adopt cell if available
  const totalCells = Math.min(8, sortedTherians.length + (hasAvailableSlot ? 1 : 0))

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOver(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === dropIndex) {
      dragIndexRef.current = null
      setDragOver(null)
      return
    }
    const newOrder = [...order]
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(dropIndex, 0, moved)
    saveOrder(newOrder)
    dragIndexRef.current = null
    setDragOver(null)
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
    setDragOver(null)
  }

  return (
    <div className="space-y-5">
      {showGrid && (
        <div className="flex justify-center">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: totalCells }).map((_, i) => {
              const t = sortedTherians[i]
              const isAdopt = !t

              if (isAdopt) {
                return (
                  <button
                    key="adopt"
                    onClick={() => router.push('/adopt')}
                    className="flex flex-col items-center justify-center gap-1.5 w-[80px] h-[96px] rounded-xl border border-dashed border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/6 transition-all"
                  >
                    <span className="text-2xl text-white/25">+</span>
                    <span className="text-[10px] text-white/25 font-medium">Adoptar</span>
                  </button>
                )
              }

              const isActive = t.id === activeId
              const isDragTarget = dragOver === i

              return (
                <button
                  key={t.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={e => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveId(t.id)}
                  className={`relative flex flex-col items-center justify-end gap-0 w-[80px] h-[96px] rounded-xl border bg-[#13131F] overflow-hidden transition-all cursor-grab active:cursor-grabbing select-none ${
                    isDragTarget
                      ? 'border-white/40 scale-105 shadow-[0_0_16px_rgba(255,255,255,0.15)]'
                      : isActive
                        ? RARITY_BORDER_ACTIVE[t.rarity]
                        : `${RARITY_BORDER[t.rarity]} opacity-60 hover:opacity-85`
                  } ${dragIndexRef.current === i ? 'opacity-30' : ''}`}
                >
                  {/* Indicadores de acción disponible */}
                  {(t.canAct || t.canBite) && (
                    <div className="absolute top-1.5 left-1.5 z-20 flex flex-col gap-[3px]">
                      {t.canAct && (
                        <div
                          title="Acción diaria disponible"
                          className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.9)] animate-pulse"
                        />
                      )}
                      {t.canBite && (
                        <div
                          title="Mordida disponible"
                          className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.9)] animate-pulse"
                        />
                      )}
                    </div>
                  )}

                  {/* Avatar ocupa toda la celda */}
                  <div className="absolute inset-0 flex items-center justify-center -mt-2">
                    <TherianAvatar therian={t} size={72} />
                  </div>

                  {/* Nombre al fondo con gradiente */}
                  <div className="relative z-10 w-full bg-gradient-to-t from-[#13131F] to-transparent pt-4 pb-1.5 px-1 text-center">
                    <span className="text-[9px] font-semibold text-white/80 leading-none truncate block">
                      {t.name ?? t.species.name}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* TherianCard del activo */}
      {active && <TherianCard key={active.id} therian={active} rank={ranks[active.id]} />}
    </div>
  )
}
