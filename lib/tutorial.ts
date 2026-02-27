export interface TutorialStepDef {
  id: string
  label: string
  goal: number
  subItems?: { key: string; label: string }[]
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'step1',
    label: 'Haz que tu Therian temple y muerda',
    goal: 2,
    subItems: [
      { key: 'templed', label: 'Templar' },
      { key: 'bitten',  label: 'Morder'  },
    ],
  },
  {
    id: 'step2',
    label: 'Reclama un logro y una misión',
    goal: 2,
    subItems: [
      { key: 'achievement', label: 'Logro'  },
      { key: 'mission',     label: 'Misión' },
    ],
  },
  {
    id: 'step3',
    label: 'Adopta un segundo Therian',
    goal: 1,
  },
  {
    id: 'step4',
    label: 'Sube a nivel 3',
    goal: 3,
  },
  {
    id: 'step5',
    label: 'Adopta un tercer Therian',
    goal: 1,
  },
]

export interface TutorialState {
  rewardClaimed: boolean
  dismissed: boolean
}

export function parseTutorialState(json: string): TutorialState {
  try {
    const p = JSON.parse(json)
    return {
      rewardClaimed: Boolean(p.rewardClaimed),
      dismissed:     Boolean(p.dismissed),
    }
  } catch {
    return { rewardClaimed: false, dismissed: false }
  }
}
