'use client'

import React, { useRef, useEffect } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'

interface Props {
  therian: TherianDTO
  size?: number
  animated?: boolean
  isWalking?: boolean
  isJumping?: boolean
}

const EYE_SHAPES: Record<string, string> = {
  round:   'M-6,0 a6,5 0 1,0 12,0 a6,5 0 1,0 -12,0',
  sharp:   'M-8,0 L0,-4 L8,0 L0,4 Z',
  sleepy:  'M-6,-1 a6,4 0 0,0 12,0',
  fierce:  'M-8,-2 L8,-2 L6,2 L-6,2 Z',
  gentle:  'M-5,0 a5,6 0 1,0 10,0 a5,6 0 1,0 -10,0',
  hollow:  'M-6,0 a6,5 0 1,0 12,0 a6,5 0 1,0 -12,0 M-3,0 a3,2.5 0 1,0 6,0 a3,2.5 0 1,0 -6,0',
  glowing: 'M-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0',
  star:    'M0,-7 L2,-2 L7,-2 L3,1 L5,6 L0,3 L-5,6 L-3,1 L-7,-2 L-2,-2 Z',
}

// Patterns adjusted for chibi body (compact, centered ~150,216)
const PATTERN_DEFS: Record<string, (_p: string, s: string) => React.ReactElement> = {
  solid:    () => <></>,
  stripe:   (_p, s) => (
    <>
      <rect x="122" y="182" width="12" height="68" rx="6" fill={s} opacity="0.5"/>
      <rect x="143" y="178" width="12" height="74" rx="6" fill={s} opacity="0.3"/>
    </>
  ),
  spot:     (_p, s) => (
    <>
      <circle cx="138" cy="208" r="13" fill={s} opacity="0.4"/>
      <circle cx="165" cy="230" r="9"  fill={s} opacity="0.35"/>
      <circle cx="126" cy="234" r="8"  fill={s} opacity="0.3"/>
    </>
  ),
  gradient: () => <></>,
  void:     (_p, _s) => (
    <rect x="114" y="178" width="72" height="74" rx="36" fill="url(#voidGrad)" opacity="0.15"/>
  ),
  ember:    (_p, s) => (
    <>
      <ellipse cx="138" cy="242" rx="22" ry="14" fill={s} opacity="0.3"/>
      <ellipse cx="167" cy="246" rx="14" ry="10" fill={s} opacity="0.25"/>
    </>
  ),
  frost:    (_p, s) => (
    <>
      <line x1="150" y1="180" x2="150" y2="252" stroke={s} strokeWidth="1.5" opacity="0.3"/>
      <line x1="114" y1="208" x2="186" y2="236" stroke={s} strokeWidth="1.5" opacity="0.3"/>
      <line x1="114" y1="236" x2="186" y2="208" stroke={s} strokeWidth="1.5" opacity="0.3"/>
    </>
  ),
  dual:     (_p, s) => (
    <path d="M150 178 C150 178, 186 220, 150 254 C114 220, 150 178" fill={s} opacity="0.2"/>
  ),
}

// Signature elements adjusted for chibi proportions
// Head: ellipse cx=150 cy=103 rx=68 ry=78  (top y≈25, bottom y≈181)
// Body: y≈178 to y≈252
const SIGNATURE_ELEMENTS: Record<string, (p: string, a: string) => React.ReactElement> = {
  tail_long:    (p, a) => (
    <path d="M186 214 Q240 232 260 270 Q270 290 246 284 Q226 278 208 246 Q192 224 186 214"
          fill={p} stroke={a} strokeWidth="1" opacity="0.9"/>
  ),
  tail_fluffy:  (p, a) => (
    <ellipse cx="216" cy="224" rx="33" ry="24" fill={p} stroke={a} strokeWidth="1" opacity="0.8"
             transform="rotate(28,216,224)"/>
  ),
  horns_small:  (p, a) => (
    <>
      <path d="M113 84 Q102 50 110 34 Q122 56 118 86" fill={a} stroke={p} strokeWidth="1"/>
      <path d="M187 84 Q198 50 190 34 Q178 56 182 86" fill={a} stroke={p} strokeWidth="1"/>
    </>
  ),
  horns_grand:  (p, a) => (
    <>
      <path d="M108 82 Q80 36 94 14 Q110 46 116 86" fill={a} stroke={p} strokeWidth="1.5"/>
      <path d="M192 82 Q220 36 206 14 Q190 46 184 86" fill={a} stroke={p} strokeWidth="1.5"/>
    </>
  ),
  wings_small:  (p, a) => (
    <>
      <path d="M110 204 Q76 178 80 198 Q84 222 113 218" fill={p} stroke={a} strokeWidth="1" opacity="0.7"/>
      <path d="M190 204 Q224 178 220 198 Q216 222 187 218" fill={p} stroke={a} strokeWidth="1" opacity="0.7"/>
    </>
  ),
  mane:         (_p, a) => (
    <ellipse cx="150" cy="130" rx="60" ry="52" fill={a} opacity="0.35"/>
  ),
  crown:        (p, a) => (
    <path d="M113 74 L124 46 L150 62 L176 46 L187 74 L168 68 L150 58 L132 68 Z"
          fill={a} stroke={p} strokeWidth="1.5"/>
  ),
  no_signature: () => <></>,
}

// Ear paths for big egg head (cx=150, cy=103, rx=68, ry=78)
const EAR_L = "M102,86 Q90,46 116,30 Q132,58 115,88 Z"
const EAR_R = "M198,86 Q210,46 184,30 Q168,58 185,88 Z"

// Arm pivots — at shoulder junction of body sides
const L_ARM_PX = 112, L_ARM_PY = 184
const R_ARM_PX = 188, R_ARM_PY = 184

// Leg pivots — at bottom hip of body
const L_LEG_PX = 133, L_LEG_PY = 250
const R_LEG_PX = 167, R_LEG_PY = 250

function pivotTransform(px: number, py: number, angle: number): string {
  return `translate(${px} ${py}) rotate(${angle.toFixed(2)}) translate(${-px} ${-py})`
}

export default function TherianAvatarChibi({
  therian,
  size = 300,
  animated = false,
  isWalking = false,
  isJumping = false,
}: Props) {
  const { appearance } = therian
  const { primary, secondary, accent } = appearance.paletteColors
  const eyeShape = EYE_SHAPES[appearance.eyes] ?? EYE_SHAPES.round
  const PatternEl = PATTERN_DEFS[appearance.pattern] ?? PATTERN_DEFS.solid
  const SignatureEl = SIGNATURE_ELEMENTS[appearance.signature] ?? SIGNATURE_ELEMENTS.no_signature

  const isGradient = appearance.pattern === 'gradient'
  const fill = isGradient ? 'url(#bodyGrad)' : primary

  const lArmRef    = useRef<SVGGElement>(null)
  const rArmRef    = useRef<SVGGElement>(null)
  const lLegRef    = useRef<SVGGElement>(null)
  const rLegRef    = useRef<SVGGElement>(null)
  const bodyBobRef = useRef<SVGGElement>(null)

  const isWalkingRef = useRef(isWalking)
  const isJumpingRef = useRef(isJumping)
  useEffect(() => { isWalkingRef.current = isWalking }, [isWalking])
  useEffect(() => { isJumpingRef.current = isJumping }, [isJumping])

  useEffect(() => {
    let animId: number
    let phase = 0
    let lastTime = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const walking = isWalkingRef.current
      const jumping = isJumpingRef.current

      if (!jumping) {
        const cycleSpeed = walking
          ? (Math.PI * 2) / 0.55
          : (Math.PI * 2) / 3.0
        phase += dt * cycleSpeed
      }

      const sinP = Math.sin(phase)

      if (jumping) {
        // Jump pose: arms raised, legs tucked
        lArmRef.current?.setAttribute('transform', pivotTransform(L_ARM_PX, L_ARM_PY, -28))
        rArmRef.current?.setAttribute('transform', pivotTransform(R_ARM_PX, R_ARM_PY,  28))
        lLegRef.current?.setAttribute('transform', pivotTransform(L_LEG_PX, L_LEG_PY,  20))
        rLegRef.current?.setAttribute('transform', pivotTransform(R_LEG_PX, R_LEG_PY, -20))
        bodyBobRef.current?.setAttribute('transform', 'translate(0 0)')
      } else if (walking) {
        // Walk: arms ±22°, legs ±26° opposite phase, 0.55s cycle
        lArmRef.current?.setAttribute('transform', pivotTransform(L_ARM_PX, L_ARM_PY,  sinP * 22))
        rArmRef.current?.setAttribute('transform', pivotTransform(R_ARM_PX, R_ARM_PY, -sinP * 22))
        lLegRef.current?.setAttribute('transform', pivotTransform(L_LEG_PX, L_LEG_PY, -sinP * 26))
        rLegRef.current?.setAttribute('transform', pivotTransform(R_LEG_PX, R_LEG_PY,  sinP * 26))
        const bob = -Math.abs(sinP) * 4
        bodyBobRef.current?.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`)
      } else {
        // Idle: gentle arm sway ±4°, breathe ±1.5px, 3s cycle
        const armSway = sinP * 4
        lArmRef.current?.setAttribute('transform', pivotTransform(L_ARM_PX, L_ARM_PY,  armSway))
        rArmRef.current?.setAttribute('transform', pivotTransform(R_ARM_PX, R_ARM_PY, -armSway))
        lLegRef.current?.setAttribute('transform', pivotTransform(L_LEG_PX, L_LEG_PY, 0))
        rLegRef.current?.setAttribute('transform', pivotTransform(R_LEG_PX, R_LEG_PY, 0))
        const breathe = sinP * -1.5
        bodyBobRef.current?.setAttribute('transform', `translate(0 ${breathe.toFixed(2)})`)
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: animated ? 'drop-shadow(0 0 18px rgba(155,89,182,0.5))' : undefined }}
    >
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="40%">
          <stop offset="0%" stopColor={secondary}/>
          <stop offset="100%" stopColor={primary}/>
        </radialGradient>
        <radialGradient id="voidGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.8"/>
          <stop offset="100%" stopColor={primary} stopOpacity="0"/>
        </radialGradient>
        {therian.rarity === 'LEGENDARY' && (
          <filter id="legendary-glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        )}
      </defs>

      {/* Ground shadow — outside bob group, stays still */}
      <ellipse cx="150" cy="293" rx="50" ry="7" fill={primary} opacity="0.2"/>

      <g ref={bodyBobRef}>

        {/* ── Arms (behind body) ──
            Pivot: shoulder point. Arm hangs from pivot, round hand at bottom. */}
        <g ref={lArmRef}>
          {/* Arm body — top edge at pivot (y=184) */}
          <ellipse cx={L_ARM_PX} cy="215" rx="13" ry="31" fill={fill}/>
          {/* Round hand */}
          <circle cx="105" cy="250" r="14" fill={secondary} opacity="0.92"/>
        </g>
        <g ref={rArmRef}>
          <ellipse cx={R_ARM_PX} cy="215" rx="13" ry="31" fill={fill}/>
          <circle cx="195" cy="250" r="14" fill={secondary} opacity="0.92"/>
        </g>

        {/* ── Legs ──
            Pivot: hip point. Leg hangs from pivot, oval foot at bottom. */}
        <g ref={lLegRef}>
          {/* Leg body — top edge at pivot (y=250) */}
          <ellipse cx={L_LEG_PX} cy="267" rx="13" ry="17" fill={fill}/>
          {/* Round foot */}
          <ellipse cx="127" cy="283" rx="20" ry="10" fill={secondary} opacity="0.92"/>
        </g>
        <g ref={rLegRef}>
          <ellipse cx={R_LEG_PX} cy="267" rx="13" ry="17" fill={fill}/>
          <ellipse cx="173" cy="283" rx="20" ry="10" fill={secondary} opacity="0.92"/>
        </g>

        {/* Signature trait (behind body) */}
        {SignatureEl(primary, accent)}

        {/* Body — compact trapezoid, wider at bottom for chibi stability */}
        <path
          d="M122,178 L178,178 L186,208 L186,248 Q186,256 176,256 L124,256 Q114,256 114,248 L114,208 Z"
          fill={fill}
        />

        {/* Body pattern overlay */}
        {PatternEl(primary, secondary)}

        {/* Ears — behind head so head covers their base */}
        <path d={EAR_L} fill={fill} stroke={accent} strokeWidth="1"/>
        <path d={EAR_R} fill={fill} stroke={accent} strokeWidth="1"/>
        {/* Inner ear highlights */}
        <path d="M105,82 Q95,50 116,34 Q129,60 114,84 Z" fill={secondary} opacity="0.6"/>
        <path d="M195,82 Q205,50 184,34 Q171,60 186,84 Z" fill={secondary} opacity="0.6"/>

        {/* Head — big egg/oval, the defining chibi feature */}
        <ellipse cx="150" cy="103" rx="68" ry="78" fill={fill}/>

        {/* Nose — small, centered */}
        <ellipse cx="150" cy="122" rx="8" ry="5.5" fill={accent} opacity="0.85"/>

        {/* Eyes — scaled 1.35× vs normal for big chibi eyes */}
        <g transform="translate(118, 100) scale(1.35)">
          <path d={eyeShape} fill={accent}
                filter={therian.rarity === 'LEGENDARY' ? 'url(#legendary-glow)' : undefined}/>
          <circle cx="0" cy="0" r="2.5" fill="white" opacity="0.85"/>
        </g>
        <g transform="translate(182, 100) scale(1.35)">
          <path d={eyeShape} fill={accent}
                filter={therian.rarity === 'LEGENDARY' ? 'url(#legendary-glow)' : undefined}/>
          <circle cx="0" cy="0" r="2.5" fill="white" opacity="0.85"/>
        </g>

        {/* Rarity aura */}
        {therian.rarity === 'LEGENDARY' && (
          <>
            <ellipse cx="150" cy="152" rx="90" ry="126" fill="none" stroke={accent} strokeWidth="1" opacity="0.25"/>
            <ellipse cx="150" cy="152" rx="84" ry="120" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.15" strokeDasharray="5 8"/>
          </>
        )}
        {therian.rarity === 'EPIC' && (
          <ellipse cx="150" cy="152" rx="92" ry="128" fill="none" stroke="#C084FC" strokeWidth="1" opacity="0.2"/>
        )}

      </g>
    </svg>
  )
}
