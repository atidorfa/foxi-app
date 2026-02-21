'use client'

import dynamic from 'next/dynamic'
import TherianAvatarSVG from './TherianAvatarSVG'
import TherianAvatarChibi from './TherianAvatarChibi'
import type { TherianDTO } from '@/lib/therian-dto'

// Loaded dynamically — Rive needs canvas (no SSR)
const TherianAvatarEvolved = dynamic(() => import('./TherianAvatarEvolved'), { ssr: false })

interface Props {
  therian: TherianDTO
  size?: number
  animated?: boolean
  isWalking?: boolean
  isJumping?: boolean
  facingRight?: boolean
  speed?: number
  onActionTrigger?: boolean
}

export default function TherianAvatar({
  therian,
  size = 300,
  animated = false,
  isWalking,
  isJumping,
  facingRight,
  speed,
  onActionTrigger,
}: Props) {
  // Level 3+: chibi egg-head form (fully animated SVG)
  if (therian.level >= 3) {
    return (
      <TherianAvatarChibi
        therian={therian}
        size={size}
        animated={animated}
        isWalking={isWalking}
        isJumping={isJumping}
      />
    )
  }

  // Level 2: evolved form with Rive canvas (falls back to SVG with limbs)
  if (therian.level >= 2) {
    return (
      <TherianAvatarEvolved
        therian={therian}
        size={size}
        animated={animated}
        isWalking={isWalking}
        isJumping={isJumping}
        facingRight={facingRight}
        speed={speed}
        onActionTrigger={onActionTrigger}
      />
    )
  }

  // Level 1: simple blob SVG, no limbs
  return <TherianAvatarSVG therian={therian} size={size} animated={animated} />
}
