'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TherianAvatar from '@/components/TherianAvatar'
import RarityBadge from '@/components/RarityBadge'
import type { TherianDTO } from '@/lib/therian-dto'

type Phase = 'idle' | 'summoning' | 'revealed'

export default function AdoptPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [therian, setTherian] = useState<TherianDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAdopt = async () => {
    setPhase('summoning')
    setError(null)

    await new Promise(r => setTimeout(r, 2000)) // Animación de espera

    try {
      const res = await fetch('/api/therian/adopt', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'NO_SLOTS_AVAILABLE') {
          router.push('/therian')
          return
        }
        throw new Error(data.error)
      }

      setTherian(data)
      setPhase('revealed')
    } catch {
      setError('Algo salió mal. Intenta de nuevo.')
      setPhase('idle')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#08080F] relative overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-purple-900/8 blur-[150px]"/>
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.4 + 0.05,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* IDLE: Invitación a adoptar */}
        {phase === 'idle' && (
          <div className="text-center space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-3">Tu Therian espera</h1>
              <p className="text-[#8B84B0] text-lg leading-relaxed">
                Hay uno ahí afuera que lleva tu nombre.<br/>
                No lo elegís. Él te elige a vos.
              </p>
            </div>

            {/* Rareza odds */}
            <div className="rounded-2xl border border-white/8 bg-[#13131F]/80 p-6 space-y-3">
              <p className="text-[#8B84B0] text-xs uppercase tracking-widest text-center mb-4">Probabilidades</p>
              {[
                { rarity: 'COMMON' as const,    pct: '70%', color: 'text-gray-400' },
                { rarity: 'RARE' as const,      pct: '20%', color: 'text-blue-400' },
                { rarity: 'EPIC' as const,      pct: '9%',  color: 'text-purple-400' },
                { rarity: 'LEGENDARY' as const, pct: '1%',  color: 'text-amber-400' },
              ].map(({ rarity, pct, color }) => (
                <div key={rarity} className="flex items-center justify-between">
                  <RarityBadge rarity={rarity} size="sm"/>
                  <span className={`font-mono font-bold ${color}`}>{pct}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAdopt}
              className="w-full bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 text-white font-bold py-5 rounded-2xl text-lg transition-all duration-300 active:scale-[0.98] shadow-[0_0_30px_rgba(155,89,182,0.4)]"
            >
              Despertar mi Therian
            </button>
          </div>
        )}

        {/* SUMMONING: Animación de espera */}
        {phase === 'summoning' && (
          <div className="text-center space-y-8">
            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping"/>
              <div className="absolute inset-4 rounded-full border-2 border-purple-400/40 animate-ping" style={{ animationDelay: '0.3s' }}/>
              <div className="absolute inset-8 rounded-full border-2 border-purple-300/50 animate-ping" style={{ animationDelay: '0.6s' }}/>
              <div className="absolute inset-0 flex items-center justify-center text-6xl">
                ✦
              </div>
            </div>
            <div>
              <p className="text-white text-xl font-light">El llamado se escucha...</p>
              <p className="text-[#8B84B0] text-sm mt-2 italic">Despertando tu Therian</p>
            </div>
          </div>
        )}

        {/* REVEALED: Therian encontrado */}
        {phase === 'revealed' && therian && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-[#8B84B0] text-sm uppercase tracking-widest mb-2">Tu Therian</p>
              <h1 className="text-3xl font-bold text-white">
                {therian.species.emoji} {therian.species.name}
              </h1>
              <div className="flex justify-center mt-3">
                <RarityBadge rarity={therian.rarity} size="lg"/>
              </div>
            </div>

            <div className="flex justify-center">
              <TherianAvatar therian={therian} size={240} animated/>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#13131F]/80 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#8B84B0] text-xs uppercase tracking-widest">Arquetipo</span>
                <span className="text-white font-semibold">{therian.trait.name}</span>
              </div>
              <p className="text-[#A99DC0] italic text-sm border-t border-white/5 pt-3">{therian.trait.lore}</p>

              <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(therian.stats).map(([stat, val]) => (
                  <div key={stat} className="flex justify-between">
                    <span className="text-[#8B84B0] capitalize">{stat === 'vitality' ? 'Vitalidad' : stat === 'agility' ? 'Agilidad' : stat === 'instinct' ? 'Instinto' : 'Carisma'}</span>
                    <span className="text-white font-mono font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[#A99DC0] text-center text-sm italic">
              {therian.species.lore}
            </p>

            <button
              onClick={() => router.push('/therian')}
              className="w-full bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 text-white font-bold py-4 rounded-2xl transition-all duration-200 active:scale-[0.98]"
            >
              Ver mi Therian →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
