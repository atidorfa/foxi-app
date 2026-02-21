'use client'

import TherianAvatarSVG from './TherianAvatarSVG'
import TherianAvatarChibi from './TherianAvatarChibi'
import type { TherianDTO } from '@/lib/therian-dto'

interface Props {
  therian: TherianDTO
  size?: number
  animated?: boolean
  isWalking?: boolean
  isJumping?: boolean
}

export default function TherianAvatar({
  therian,
  size = 300,
  animated = false,
  isWalking,
  isJumping,
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

  // Level 1–2: simple blob SVG, no limbs
  return <TherianAvatarSVG therian={therian} size={size} animated={animated} />
}
