'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { InventoryItemDTO } from '@/app/api/inventory/route'

const RARITY_COLOR: Record<string, string> = {
  COMMON: 'text-gray-400', UNCOMMON: 'text-emerald-400', RARE: 'text-blue-400',
  EPIC: 'text-purple-400', LEGENDARY: 'text-amber-400', MYTHIC: 'text-red-400',
  ACCESSORY: 'text-cyan-400',
}
const RARITY_BORDER: Record<string, string> = {
  COMMON: 'border-gray-600/40', UNCOMMON: 'border-emerald-500/40', RARE: 'border-blue-500/40',
  EPIC: 'border-purple-500/40', LEGENDARY: 'border-amber-500/40', MYTHIC: 'border-red-500/40',
  ACCESSORY: 'border-cyan-500/40',
}
const RARITY_BG: Record<string, string> = {
  COMMON: 'bg-gray-500/10', UNCOMMON: 'bg-emerald-500/10', RARE: 'bg-blue-500/10',
  EPIC: 'bg-purple-500/10', LEGENDARY: 'bg-amber-500/10', MYTHIC: 'bg-red-500/10',
  ACCESSORY: 'bg-cyan-500/10',
}
const RARITY_LABEL: Record<string, string> = {
  COMMON: 'Común', UNCOMMON: 'Poco común', RARE: 'Raro',
  EPIC: 'Épico', LEGENDARY: 'Legendario', MYTHIC: 'Mítico', ACCESSORY: 'Accesorio',
}
const RARITY_SORT = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON', 'ACCESSORY']
const GRID_SIZE = 64

function sortItems(list: InventoryItemDTO[]): InventoryItemDTO[] {
  return list.slice().sort((a, b) => {
    if (a.type !== b.type) return a.type === 'EGG' ? -1 : 1
    return RARITY_SORT.indexOf(a.rarity) - RARITY_SORT.indexOf(b.rarity)
  })
}

function toSlots(list: InventoryItemDTO[]): (InventoryItemDTO | null)[] {
  const slots: (InventoryItemDTO | null)[] = Array(GRID_SIZE).fill(null)
  list.forEach((item, i) => { if (i < GRID_SIZE) slots[i] = item })
  return slots
}

type TooltipData = { item: InventoryItemDTO; x: number; y: number }

export default function NavInventoryButton() {
  const [show, setShow] = useState(false)
  const [items, setItems] = useState<InventoryItemDTO[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [gridSlots, setGridSlots] = useState<(InventoryItemDTO | null)[]>(Array(GRID_SIZE).fill(null))
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const fetchInventory = () => {
    setLoading(true)
    fetch('/api/inventory')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => { setItems(data.items); setLoading(false) })
      .catch(() => { setItems([]); setLoading(false) })
  }

  useEffect(() => {
    if (items) setGridSlots(toSlots(sortItems(items)))
  }, [items])

  useEffect(() => {
    const handler = () => {
      if (show) fetchInventory()
      else setItems(null)
    }
    window.addEventListener('inventory-updated', handler)
    return () => window.removeEventListener('inventory-updated', handler)
  }, [show])

  const open = () => { setShow(true); if (!items) fetchInventory() }
  const close = () => { setShow(false); setTooltip(null) }

  function handleAutoSort() {
    const filled = gridSlots.filter(Boolean) as InventoryItemDTO[]
    setGridSlots(toSlots(sortItems(filled)))
  }

  function handleDragStart(index: number) { setDragIndex(index); setTooltip(null) }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); setDragOver(null); return }
    const next = [...gridSlots]
    ;[next[targetIndex], next[dragIndex]] = [next[dragIndex], next[targetIndex]]
    setGridSlots(next)
    setDragIndex(null)
    setDragOver(null)
  }

  function handleCellHover(e: React.MouseEvent, item: InventoryItemDTO | null) {
    if (!item || dragIndex !== null) { setTooltip(null); return }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({ item, x: rect.left + rect.width / 2, y: rect.top })
  }

  const totalItems = (items ?? []).reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      <button
        onClick={open}
        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all"
      >
        🎒 Inventario
        {items && totalItems > 0 && (
          <span className="bg-emerald-500/30 text-emerald-200 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
            {totalItems}
          </span>
        )}
      </button>

      {show && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative rounded-2xl border border-white/10 bg-[#13131F] shadow-2xl flex flex-col"
            style={{ width: 'fit-content' }}
            onClick={e => e.stopPropagation()}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-base">🎒</span>
                <h2 className="text-white font-bold text-sm uppercase tracking-widest">Inventario</h2>
                {items && totalItems > 0 && (
                  <span className="text-white/30 text-xs ml-1">{totalItems} objeto{totalItems !== 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-6">
                {items && items.length > 0 && (
                  <button
                    onClick={handleAutoSort}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
                  >
                    ↕ Ordenar
                  </button>
                )}
                <button onClick={close} className="text-white/30 hover:text-white/70 text-xl leading-none transition-colors">
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center" style={{ width: 420, height: 420 }}>
                  <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-emerald-500 animate-spin" />
                </div>
              ) : (
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: 'repeat(8, 1fr)', width: 420 }}
                >
                  {gridSlots.map((item, i) => {
                    const rarity = item?.rarity ?? 'COMMON'
                    const isDragging = dragIndex === i
                    const isTarget = dragOver === i && dragIndex !== null && dragIndex !== i
                    const isAccessory = item?.type === 'ACCESSORY'
                    const isDraggable = !!item && !isAccessory
                    return (
                      <div
                        key={i}
                        draggable={isDraggable}
                        onDragStart={() => isDraggable && handleDragStart(i)}
                        onDragEnd={() => { setDragIndex(null); setDragOver(null) }}
                        onDragOver={e => { e.preventDefault(); setDragOver(i) }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={() => handleDrop(i)}
                        onMouseEnter={e => handleCellHover(e, item)}
                        onMouseLeave={() => setTooltip(null)}
                        className={`relative flex items-center justify-center rounded-md border select-none transition-all ${
                          isDragging
                            ? 'opacity-30 scale-95'
                            : isTarget
                            ? 'border-white/40 bg-white/10 scale-105'
                            : item
                            ? `${RARITY_BORDER[rarity]} ${RARITY_BG[rarity]} ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:brightness-125' : 'cursor-default hover:brightness-110'}`
                            : 'border-white/5 bg-white/[0.02]'
                        }`}
                        style={{ width: 48, height: 48 }}
                      >
                        {item && (
                          <>
                            <span className="text-2xl leading-none">{item.emoji}</span>
                            {item.quantity > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white/80 bg-black/70 rounded px-0.5 leading-tight">
                                {item.quantity}
                              </span>
                            )}
                            {isAccessory && (
                              <span className="absolute top-0.5 right-0.5 text-[7px] text-cyan-400 leading-none">✦</span>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Hint for accessories */}
            {!loading && items && items.some(i => i.type === 'ACCESSORY') && (
              <p className="text-white/20 text-[10px] text-center pb-3 -mt-1">
                Equipá los accesorios (✦) desde el panel de tu Therian
              </p>
            )}
          </div>

          {/* Tooltip */}
          {tooltip && dragIndex === null && (
            <div
              ref={tooltipRef}
              className="fixed z-[10000] pointer-events-none"
              style={{
                left: Math.min(Math.max(tooltip.x, 90), window.innerWidth - 90),
                top: tooltip.y - 8,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className={`rounded-xl border ${RARITY_BORDER[tooltip.item.rarity]} px-3 py-2 shadow-2xl`} style={{ width: 160, background: '#13131F' }}>
                <p className="text-white text-xs font-bold leading-tight">{tooltip.item.name}</p>
                <p className={`text-[10px] font-semibold mt-0.5 ${RARITY_COLOR[tooltip.item.rarity]}`}>
                  {RARITY_LABEL[tooltip.item.rarity]}
                </p>
                {tooltip.item.description && (
                  <p className="text-white/50 text-[10px] mt-1 leading-tight">{tooltip.item.description}</p>
                )}
                {tooltip.item.quantity > 1 && (
                  <p className="text-white/60 text-[10px] mt-1 font-mono">×{tooltip.item.quantity} en stock</p>
                )}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
