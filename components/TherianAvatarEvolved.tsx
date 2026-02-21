'use client'

import { useState, useEffect } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'
import TherianAvatarSVG from './TherianAvatarSVG'
import type { TherianDTO } from '@/lib/therian-dto'

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

const EYE_TYPE_MAP: Record<string, number> = {
  round: 0, sharp: 1, sleepy: 2, fierce: 3,
  gentle: 4, hollow: 5, glowing: 6, star: 7,
}

const PATTERN_TYPE_MAP: Record<string, number> = {
  solid: 0, stripe: 1, spot: 2, gradient: 3,
  void: 4, ember: 5, frost: 6, dual: 7,
}

const SIGNATURE_TYPE_MAP: Record<string, number> = {
  tail_long: 0, tail_fluffy: 1, horns_small: 2, horns_grand: 3,
  wings_small: 4, mane: 5, crown: 6, no_signature: 7,
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

export default function TherianAvatarEvolved({
  therian,
  size = 300,
  animated = false,
  isWalking = false,
  isJumping = false,
  speed = 1.0,
  onActionTrigger = false,
}: Props) {
  const [riveError, setRiveError] = useState(false)

  const { rive, RiveComponent } = useRive({
    src: '/therian-evolved.riv',
    stateMachines: 'TherianSM',
    autoplay: true,
    onLoadError: () => setRiveError(true),
  })

  // Movement inputs
  const isWalkingInput   = useStateMachineInput(rive, 'TherianSM', 'isWalking')
  const speedInput       = useStateMachineInput(rive, 'TherianSM', 'speed')
  const doActionInput    = useStateMachineInput(rive, 'TherianSM', 'doAction')

  // Appearance inputs
  const colorPrimaryInput   = useStateMachineInput(rive, 'TherianSM', 'colorPrimary')
  const colorSecondaryInput = useStateMachineInput(rive, 'TherianSM', 'colorSecondary')
  const colorAccentInput    = useStateMachineInput(rive, 'TherianSM', 'colorAccent')
  const eyeTypeInput        = useStateMachineInput(rive, 'TherianSM', 'eyeType')
  const patternTypeInput    = useStateMachineInput(rive, 'TherianSM', 'patternType')
  const signatureTypeInput  = useStateMachineInput(rive, 'TherianSM', 'signatureType')

  // Set appearance once when Rive loads
  useEffect(() => {
    if (!rive) return
    const { primary, secondary, accent } = therian.appearance.paletteColors
    if (colorPrimaryInput)    colorPrimaryInput.value    = hexToInt(primary)
    if (colorSecondaryInput)  colorSecondaryInput.value  = hexToInt(secondary)
    if (colorAccentInput)     colorAccentInput.value     = hexToInt(accent)
    if (eyeTypeInput)         eyeTypeInput.value         = EYE_TYPE_MAP[therian.appearance.eyes] ?? 0
    if (patternTypeInput)     patternTypeInput.value     = PATTERN_TYPE_MAP[therian.appearance.pattern] ?? 0
    if (signatureTypeInput)   signatureTypeInput.value   = SIGNATURE_TYPE_MAP[therian.appearance.signature] ?? 7
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rive])

  // Sync walk animation
  useEffect(() => {
    if (isWalkingInput) isWalkingInput.value = isWalking
  }, [isWalkingInput, isWalking])

  useEffect(() => {
    if (speedInput) speedInput.value = speed
  }, [speedInput, speed])

  // Fire doAction trigger
  useEffect(() => {
    if (onActionTrigger && doActionInput) {
      doActionInput.fire()
    }
  }, [onActionTrigger, doActionInput])

  // Fallback — show evolved SVG (with limbs + animation) when .riv fails to load
  if (riveError) {
    return (
      <TherianAvatarSVG
        therian={therian}
        size={size}
        animated={animated}
        showLimbs
        isWalking={isWalking}
        isJumping={isJumping}
      />
    )
  }

  return (
    <RiveComponent
      style={{
        width: size,
        height: size,
        filter: animated ? 'drop-shadow(0 0 15px rgba(155,89,182,0.4))' : undefined,
      }}
    />
  )
}
