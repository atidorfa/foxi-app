'use client'

import { useState } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'
import TherianCard from './TherianCard'
import { RUNES, Rune } from '@/lib/catalogs/runes'

interface Props {
  therian: TherianDTO
  rank?: number
}

// Hexagon offsets from center
const OFFSETS = [
  { x: 0, y: -210 },    // Top
  { x: -165, y: -105 }, // Top Left
  { x: 165, y: -105 },  // Top Right
  { x: -165, y: 105 },  // Bottom Left
  { x: 165, y: 105 },   // Bottom Right
  { x: 0, y: 210 }      // Bottom
]

export default function RuneSystem({ therian: initialTherian, rank }: Props) {
  const [therian, setTherian] = useState<TherianDTO>(initialTherian)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [equipping, setEquipping] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Ensure 6 slots
  const equippedRunes: (Rune | null)[] = Array(6).fill(null)
  if (therian.equippedRunesIds) {
    for (let i = 0; i < 6; i++) {
        const id = therian.equippedRunesIds[i]
        if (id) {
            equippedRunes[i] = RUNES.find(r => r.id === id) || null
        }
    }
  }

  const handleEquip = async (runeId: string | null) => {
    if (selectedSlot === null) return
    setEquipping(true)
    try {
      const res = await fetch('/api/therian/runes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex: selectedSlot, runeId })
      })
      if (res.ok) {
        const updated = await res.json()
        setTherian(updated)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setEquipping(false)
      setSelectedSlot(null)
    }
  }

  return (
    <div className="relative w-full max-w-sm mx-auto my-12 flex justify-center items-center min-h-[600px] outline-none">
      
      {/* Dark overlay behind nodes when expanded */}
      <div 
        className={`fixed inset-0 bg-black/30 z-0 transition-opacity duration-500 ease-out pointer-events-none ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Main Card Wrapper */}
      <div 
        className={`relative z-10 w-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isExpanded 
            ? 'scale-[0.80] opacity-30 blur-[2px] cursor-pointer hover:opacity-50 shadow-2xl translate-y-4' 
            : 'scale-100 opacity-100 translate-y-0'
        }`}
        onClick={() => { if (isExpanded) setIsExpanded(false) }}
      >
        <TherianCard therian={therian} rank={rank} />
        
        {/* Toggle Button (Straddling Top Border) */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
          className={`absolute z-30 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-purple-500/30 bg-[#13131F] flex items-center justify-center transition-all duration-500 shadow-[0_0_30px_rgba(168,85,247,0.15)] cursor-pointer overflow-hidden ${
            isExpanded ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100 w-20 h-20 hover:border-purple-500/80 hover:scale-110 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]'
          }`}
        >
          {/* Subtle glow layer */}
          <div className="absolute inset-0 bg-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
          
          <div className="-rotate-45 flex flex-col items-center justify-center font-bold tracking-widest text-[#8B84B0] hover:text-purple-300 transition-colors pointer-events-none">
            <span className="text-[10px] mb-0.5 uppercase">Runas</span>
            <span className="text-[14px] leading-none text-purple-400">✧</span>
          </div>
        </button>
      </div>

      {/* The 6 Rune Slots */}
      <div className={`absolute top-1/2 left-1/2 z-20 w-0 h-0 transition-opacity duration-500 ${isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {OFFSETS.map((pos, index) => {
          const r = equippedRunes[index]
          return (
            <div 
              key={index} 
              className="absolute flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                transform: isExpanded 
                  ? `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(1)` 
                  : `translate(-50%, -50%) scale(0)`
              }}
            >
               <button
                 onClick={() => isExpanded && setSelectedSlot(index)}
                 className="group relative w-[85px] h-[85px] md:w-[95px] md:h-[95px] rotate-45 border border-white/10 bg-[#151522]/95 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:border-purple-500/70 hover:scale-[1.12] hover:z-30 shadow-[0_10px_40px_rgba(0,0,0,0.8)] cursor-pointer overflow-hidden"
               >
                  {/* Hover visual bloom effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-tr from-purple-500 to-fuchsia-500 transition-opacity duration-300" />
                 
                  <div className="-rotate-45 text-center flex flex-col items-center justify-center pointer-events-none p-1 w-full h-full">
                   {r ? (
                      <>
                        <div className="text-purple-300 text-[11px] md:text-sm font-bold leading-tight mb-1 drop-shadow-md px-1 break-words line-clamp-2">
                          {r.name.split(' ')[0]} {/* Takes just first word to fit better */}
                        </div>
                        <div className="flex gap-1 text-[8px] md:text-[9px] text-white/80 font-mono">
                          {r.mod.vitality && <span>🌿+{r.mod.vitality}</span>}
                          {r.mod.agility && <span>⚡+{r.mod.agility}</span>}
                          {r.mod.instinct && <span>🌌+{r.mod.instinct}</span>}
                          {r.mod.charisma && <span>✨+{r.mod.charisma}</span>}
                        </div>
                      </>
                   ) : (
                      <span className="text-white/10 text-2xl font-light group-hover:text-purple-400 transition-colors drop-shadow-md">+</span>
                   )}
                 </div>
               </button>
            </div>
          )
        })}
      </div>

      {/* Selector Modal */}
      {selectedSlot !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => !equipping && setSelectedSlot(null)}
        >
          <div 
            className="bg-[#13131F] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="text-white font-semibold uppercase tracking-widest text-sm text-center w-full">
                Equipar Runa ✧
              </h3>
              <button onClick={() => !equipping && setSelectedSlot(null)} className="absolute right-4 text-white/40 hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 grid gap-3 grid-cols-1 md:grid-cols-2">
              <button
                disabled={equipping}
                onClick={() => handleEquip(null)}
                className="col-span-1 md:col-span-2 p-3 rounded-xl border border-white/10 text-[#8B84B0] hover:text-white hover:border-white/30 text-sm text-center disabled:opacity-50 transition-colors"
              >
                Quitar Runa Actual
              </button>

              {RUNES.map(rune => {
                 const isEquipped = equippedRunes.some(r => r?.id === rune.id)
                 return (
                   <button
                     key={rune.id}
                     onClick={() => !isEquipped && handleEquip(rune.id)}
                     disabled={equipping || isEquipped}
                     className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                        isEquipped 
                          ? 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed grayscale-[50%]'
                          : 'border-white/10 bg-white/5 hover:border-purple-500 hover:bg-white/10 active:scale-[0.98]'
                     }`}
                   >
                     <div className="flex justify-between items-start mb-1 w-full gap-2">
                        <span className="text-purple-300 font-bold text-sm tracking-wide leading-tight">{rune.name}</span>
                        {isEquipped && <span className="text-[9px] text-white/30 uppercase bg-black/30 px-1.5 py-0.5 rounded-full shrink-0">Equipada</span>}
                     </div>
                     <p className="text-[#8B84B0] text-xs italic mb-2 flex-1">{rune.lore}</p>
                     <div className="text-white/80 font-mono text-[11px] flex flex-wrap gap-2 mt-auto pt-2 border-t border-white/5">
                        {rune.mod.vitality && <span className="text-emerald-400">🌿 +{rune.mod.vitality}</span>}
                        {rune.mod.agility && <span className="text-yellow-400">⚡ +{rune.mod.agility}</span>}
                        {rune.mod.instinct && <span className="text-blue-400">🌌 +{rune.mod.instinct}</span>}
                        {rune.mod.charisma && <span className="text-amber-400">✨ +{rune.mod.charisma}</span>}
                     </div>
                   </button>
                 )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
