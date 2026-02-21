'use client'

import { useState } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'

type ActionType = 'CARE' | 'TRAIN' | 'EXPLORE' | 'SOCIAL'

const ACTIONS: Array<{
  type: ActionType
  label: string
  icon: string
  desc: string
  stat: string
  gradient: string
  border: string
}> = [
  {
    type: 'CARE',
    label: 'Cuidar',
    icon: '🌿',
    desc: '+Vitalidad',
    stat: 'vitality',
    gradient: 'from-emerald-900/40 to-emerald-800/20 hover:from-emerald-800/60 hover:to-emerald-700/30',
    border: 'border-emerald-700/30 hover:border-emerald-500/60',
  },
  {
    type: 'TRAIN',
    label: 'Templar',
    icon: '⚡',
    desc: '+Agilidad',
    stat: 'agility',
    gradient: 'from-amber-900/40 to-amber-800/20 hover:from-amber-800/60 hover:to-amber-700/30',
    border: 'border-amber-700/30 hover:border-amber-500/60',
  },
  {
    type: 'EXPLORE',
    label: 'Explorar',
    icon: '🌌',
    desc: '+Instinto',
    stat: 'instinct',
    gradient: 'from-blue-900/40 to-blue-800/20 hover:from-blue-800/60 hover:to-blue-700/30',
    border: 'border-blue-700/30 hover:border-blue-500/60',
  },
  {
    type: 'SOCIAL',
    label: 'Socializar',
    icon: '✨',
    desc: '+Carisma',
    stat: 'charisma',
    gradient: 'from-pink-900/40 to-pink-800/20 hover:from-pink-800/60 hover:to-pink-700/30',
    border: 'border-pink-700/30 hover:border-pink-500/60',
  },
]

interface Props {
  therian: TherianDTO
  onAction: (actionType: ActionType) => Promise<void>
}

export default function DailyActionButtons({ therian, onAction }: Props) {
  const [loading, setLoading] = useState<ActionType | null>(null)

  const handleAction = async (type: ActionType) => {
    if (!therian.canAct || loading) return
    setLoading(type)
    try {
      await onAction(type)
    } finally {
      setLoading(null)
    }
  }

  if (!therian.canAct) {
    const nextDate = therian.nextActionAt ? new Date(therian.nextActionAt) : null
    const timeStr = nextDate
      ? nextDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      : 'mañana'

    return (
      <div className="rounded-xl border border-white/5 bg-white/3 px-5 py-4 text-center">
        <p className="text-[#8B84B0] text-sm">Tu Therian descansa hasta las</p>
        <p className="text-white font-semibold mt-1">{timeStr}</p>
        <p className="text-[#8B84B0] text-xs mt-1 italic">El descanso también es parte del camino.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTIONS.map((action) => {
        const isLoading = loading === action.type
        const disabled = !!loading

        return (
          <button
            key={action.type}
            onClick={() => handleAction(action.type)}
            disabled={disabled}
            className={`
              relative group flex flex-col items-center gap-2 p-4 rounded-xl border
              bg-gradient-to-b ${action.gradient} ${action.border}
              transition-all duration-300 ease-out
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-95
            `}
          >
            <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
              {isLoading ? '⏳' : action.icon}
            </span>
            <span className="text-white font-semibold text-sm">{action.label}</span>
            <span className="text-[#8B84B0] text-xs">{action.desc}</span>
          </button>
        )
      })}
    </div>
  )
}
