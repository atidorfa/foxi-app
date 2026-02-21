'use client'

import dynamic from 'next/dynamic'
import TherianAvatarSVG from './TherianAvatarSVG'
import type { TherianDTO } from '@/lib/therian-dto'

// Loaded dynamically — Rive needs canvas (no SSR)
const TherianAvatarEvolved = dynamic(() => import('./TherianAvatarEvolved'), { ssr: false })

interface Props {
  therian: TherianDTO
  size?: number
  animated?: boolean
  // Forwarded to TherianAvatarEvolved when level >= 2:
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

  return <TherianAvatarSVG therian={therian} size={size} animated={animated} />
}
