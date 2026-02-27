'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SubItem {
  key: string
  label: string
  done: boolean
}

interface TutorialStep {
  id: string
  progress: number
  goal: number
  completed: boolean
  subItems: SubItem[] | null
}

interface TutorialData {
  dismissed:     boolean
  steps:         TutorialStep[]
  allComplete:   boolean
  rewardClaimed: boolean
  justRewarded:  boolean
}

const STEP_LABELS: Record<string, string> = {
  step1: 'Haz que tu Therian temple y muerda',
  step2: 'Reclama un logro y una misión',
  step3: 'Adopta un segundo Therian',
  step4: 'Sube a nivel 3',
  step5: 'Adopta un tercer Therian',
}

const STEP_ICONS: Record<string, string> = {
  step1: '⚔️',
  step2: '🏆',
  step3: '🐾',
  step4: '⬆️',
  step5: '🐾',
}

export default function TutorialCard() {
  const [data, setData]               = useState<TutorialData | null>(null)
  const [dismissed, setDismissed]     = useState(false)
  const [dismissing, setDismissing]   = useState(false)
  const [justRewarded, setJustRewarded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tutorial', { cache: 'no-store' })
      if (!res.ok) return
      const json: TutorialData = await res.json()
      if (json.dismissed) { setDismissed(true); return }
      if (json.justRewarded) {
        setJustRewarded(true)
        window.dispatchEvent(new CustomEvent('wallet-update'))
      }
      setData(json)
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 12000)
    return () => clearInterval(intervalRef.current!)
  }, [fetchData])

  // Refresh when actions/achievements/missions happen
  useEffect(() => {
    const refresh = () => fetchData()
    window.addEventListener('therian-updated', refresh)
    window.addEventListener('wallet-update',   refresh)
    return () => {
      window.removeEventListener('therian-updated', refresh)
      window.removeEventListener('wallet-update',   refresh)
    }
  }, [fetchData])

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await fetch('/api/tutorial/dismiss', { method: 'POST' })
      setDismissed(true)
    } finally {
      setDismissing(false)
    }
  }

  if (dismissed || !data) return null

  const completedCount = data.steps.filter(s => s.completed).length

  return (
    <div className="w-72 rounded-2xl border border-white/8 bg-[#0F0F1C] flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Tutorial</p>
            <p className="text-white/35 text-[10px]">{completedCount}/5 pasos</p>
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1">
          {data.steps.map(s => (
            <div
              key={s.id}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                s.completed ? 'bg-emerald-400' : 'bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col divide-y divide-white/4">
        {data.steps.map((step, idx) => (
          <div
            key={step.id}
            className={`px-4 py-2.5 flex items-start gap-3 transition-colors ${
              step.completed ? 'opacity-50' : ''
            }`}
          >
            {/* Step number / check */}
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
              step.completed
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/8 text-white/40'
            }`}>
              {step.completed ? '✓' : idx + 1}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[11px] font-medium leading-tight ${
                  step.completed ? 'text-white/45 line-through' : 'text-white/80'
                }`}>
                  {STEP_ICONS[step.id]} {STEP_LABELS[step.id]}
                </p>
                {/* Progress badge */}
                {!step.completed && (
                  <span className={`flex-shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    step.progress > 0
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      : 'bg-white/5 text-white/30 border border-white/10'
                  }`}>
                    {step.id === 'step4' ? `Nv${step.progress}/${step.goal}` : `${step.progress}/${step.goal}`}
                  </span>
                )}
              </div>

              {/* Sub-items for steps 1 and 2 */}
              {step.subItems && !step.completed && (
                <div className="flex gap-3 mt-1.5">
                  {step.subItems.map(sub => (
                    <div key={sub.key} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${sub.done ? 'bg-emerald-400' : 'bg-white/20'}`} />
                      <span className={`text-[9px] font-medium ${sub.done ? 'text-emerald-400' : 'text-white/30'}`}>
                        {sub.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Completion banner */}
      {data.allComplete && (
        <div className="border-t border-emerald-500/20 bg-emerald-500/8 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <p className="text-emerald-400 font-bold text-xs">¡Tutorial completado!</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              {justRewarded ? '🪙 +100 oro' : '🪙 +100 oro'}
            </span>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
              ⭐ +10 XP
            </span>
          </div>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="w-full py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {dismissing ? '···' : 'Cerrar tutorial ✕'}
          </button>
        </div>
      )}
    </div>
  )
}
