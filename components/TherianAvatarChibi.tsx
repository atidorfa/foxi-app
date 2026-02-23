'use client'

import React, { useRef, useEffect } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'
import { ACC_VISUAL_CHIBI } from '@/lib/items/accessory-visuals'

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

// Patterns fitted to new compact body (x=124–176, y=178–226)
const PATTERN_DEFS: Record<string, (_p: string, s: string) => React.ReactElement> = {
  solid:    () => <></>,
  stripe:   (_p, s) => (
    <>
      <rect x="126" y="181" width="11" height="40" rx="5" fill={s} opacity="0.5"/>
      <rect x="145" y="179" width="11" height="44" rx="5" fill={s} opacity="0.3"/>
    </>
  ),
  spot:     (_p, s) => (
    <>
      <circle cx="140" cy="198" r="10" fill={s} opacity="0.4"/>
      <circle cx="162" cy="214" r="7"  fill={s} opacity="0.35"/>
      <circle cx="130" cy="216" r="6"  fill={s} opacity="0.3"/>
    </>
  ),
  gradient: () => <></>,
  void:     (_p, _s) => (
    <rect x="124" y="178" width="52" height="48" rx="24" fill="url(#voidGrad)" opacity="0.15"/>
  ),
  ember:    (_p, s) => (
    <>
      <ellipse cx="138" cy="220" rx="16" ry="10" fill={s} opacity="0.3"/>
      <ellipse cx="162" cy="218" rx="10" ry="7"  fill={s} opacity="0.25"/>
    </>
  ),
  frost:    (_p, s) => (
    <>
      <line x1="150" y1="180" x2="150" y2="224" stroke={s} strokeWidth="1.5" opacity="0.3"/>
      <line x1="124" y1="196" x2="176" y2="212" stroke={s} strokeWidth="1.5" opacity="0.3"/>
      <line x1="124" y1="212" x2="176" y2="196" stroke={s} strokeWidth="1.5" opacity="0.3"/>
    </>
  ),
  dual:     (_p, s) => (
    <path d="M150 178 C150 178,176 202,150 226 C124 202,150 178" fill={s} opacity="0.2"/>
  ),
}

// Signatures — head: cx=150 cy=100 rx=82 ry=76 (top≈24), body: y≈178–226
const SIGNATURE_ELEMENTS: Record<string, (p: string, a: string) => React.ReactElement> = {
  tail_long:    (p, a) => (
    <path d="M178 210 Q232 228 252 264 Q262 282 238 276 Q218 270 200 240 Q184 218 178 210"
          fill={p} stroke={a} strokeWidth="1" opacity="0.9"/>
  ),
  tail_fluffy:  (p, a) => (
    <ellipse cx="212" cy="218" rx="32" ry="23" fill={p} stroke={a} strokeWidth="1" opacity="0.8"
             transform="rotate(28,212,218)"/>
  ),
  horns_small:  (p, a) => (
    <>
      <path d="M116 84 Q106 48 114 32 Q126 56 122 88" fill={a} stroke={p} strokeWidth="1"/>
      <path d="M184 84 Q194 48 186 32 Q174 56 178 88" fill={a} stroke={p} strokeWidth="1"/>
    </>
  ),
  horns_grand:  (p, a) => (
    <>
      <path d="M110 82 Q84 36 98 14 Q114 48 118 86" fill={a} stroke={p} strokeWidth="1.5"/>
      <path d="M190 82 Q216 36 202 14 Q186 48 182 86" fill={a} stroke={p} strokeWidth="1.5"/>
    </>
  ),
  wings_small:  (p, a) => (
    <>
      <path d="M122 196 Q88 172 92 192 Q96 214 124 210" fill={p} stroke={a} strokeWidth="1" opacity="0.7"/>
      <path d="M178 196 Q212 172 208 192 Q204 214 176 210" fill={p} stroke={a} strokeWidth="1" opacity="0.7"/>
    </>
  ),
  mane:         (_p, a) => (
    <ellipse cx="150" cy="128" rx="58" ry="50" fill={a} opacity="0.35"/>
  ),
  crown:        (p, a) => (
    <path d="M116 74 L126 46 L150 62 L174 46 L184 74 L166 68 L150 58 L134 68 Z"
          fill={a} stroke={p} strokeWidth="1.5"/>
  ),
  no_signature: () => <></>,
}

// ── Layout reference ─────────────────────────────────────────────────────────
// Head :  ellipse cx=150 cy=100 rx=82 ry=76  →  top y=24, bottom y=176
// Body :  rect x=124 y=177 w=52 h=48 rx=22   →  pill shape, 52×48 px
// Ears :  tall rabbit ears towering above head
// Arms :  simple straight ovals from shoulder pivot (top edge = pivot)
// Legs :  simple straight ovals from hip pivot (top edge = pivot)
// Feet :  slightly wider ovals at leg bottoms
// ─────────────────────────────────────────────────────────────────────────────

const EAR_L = "M76,96 Q56,16 104,0 Q144,46 112,100 Z"
const EAR_R = "M224,96 Q244,16 196,0 Q156,46 188,100 Z"

// Arm pivots — top of arm ellipse = pivot point
// Arms centered slightly outside body (natural hang from shoulder)
const L_ARM_PX = 122, L_ARM_PY = 183   // left shoulder
const R_ARM_PX = 178, R_ARM_PY = 183   // right shoulder

// Leg pivots — top of leg ellipse = pivot point
const L_LEG_PX = 138, L_LEG_PY = 223   // left hip
const R_LEG_PX = 162, R_LEG_PY = 223   // right hip

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

  // Accessory overlays
  const acc = therian.equippedAccessories ?? {}
  function accTypeId(slotId: string): string | null {
    const inst = acc[slotId]
    if (!inst) return null
    return inst.includes(':') ? inst.split(':')[0] : inst
  }
  const earsId  = accTypeId('orejas')
  const tailId  = accTypeId('cola')
  const eyesId  = accTypeId('ojos')
  const clawsId = accTypeId('garras')
  const glassId = accTypeId('anteojos')
  const headId  = accTypeId('cabeza')
  const colors  = { primary, secondary, accent }

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
        lArmRef.current?.setAttribute('transform', pivotTransform(L_ARM_PX, L_ARM_PY, -28))
        rArmRef.current?.setAttribute('transform', pivotTransform(R_ARM_PX, R_ARM_PY,  28))
        lLegRef.current?.setAttribute('transform', pivotTransform(L_LEG_PX, L_LEG_PY,  20))
        rLegRef.current?.setAttribute('transform', pivotTransform(R_LEG_PX, R_LEG_PY, -20))
        bodyBobRef.current?.setAttribute('transform', 'translate(0 0)')
      } else if (walking) {
        lArmRef.current?.setAttribute('transform', pivotTransform(L_ARM_PX, L_ARM_PY,  sinP * 22))
        rArmRef.current?.setAttribute('transform', pivotTransform(R_ARM_PX, R_ARM_PY, -sinP * 22))
        lLegRef.current?.setAttribute('transform', pivotTransform(L_LEG_PX, L_LEG_PY, -sinP * 26))
        rLegRef.current?.setAttribute('transform', pivotTransform(R_LEG_PX, R_LEG_PY,  sinP * 26))
        const bob = -Math.abs(sinP) * 4
        bodyBobRef.current?.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`)
      } else {
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

      {/* Ground shadow */}
      <ellipse cx="150" cy="278" rx="46" ry="7" fill={primary} opacity="0.2"/>

      <g ref={bodyBobRef}>

        {/* ── Arms — simple straight ovals, pivot at shoulder top ── */}
        <g ref={lArmRef}>
          {/* Arm oval: top edge at pivot y=183, 12px left of pivot x */}
          <ellipse cx="110" cy="212" rx="13" ry="29" fill={fill}/>
          {/* Paw — slightly wider rounded end */}
          <ellipse cx="109" cy="240" rx="14" ry="10" fill={secondary} opacity="0.88"/>
        </g>
        <g ref={rArmRef}>
          <ellipse cx="190" cy="212" rx="13" ry="29" fill={fill}/>
          <ellipse cx="191" cy="240" rx="14" ry="10" fill={secondary} opacity="0.88"/>
        </g>

        {/* ── Legs — short straight ovals, pivot at hip bottom ── */}
        <g ref={lLegRef}>
          {/* Leg oval: top edge at pivot y=223 */}
          <ellipse cx="138" cy="243" rx="13" ry="20" fill={fill}/>
          {/* Foot — wider flat oval */}
          <ellipse cx="134" cy="261" rx="17" ry="9" fill={secondary} opacity="0.88"/>
        </g>
        <g ref={rLegRef}>
          <ellipse cx="162" cy="243" rx="13" ry="20" fill={fill}/>
          <ellipse cx="166" cy="261" rx="17" ry="9" fill={secondary} opacity="0.88"/>
        </g>

        {/* Cola accesorio (detrás del cuerpo, antes del signature) */}
        {tailId && ACC_VISUAL_CHIBI[tailId]?.(colors)}

        {/* Signature trait (behind body) */}
        {SignatureEl(primary, accent)}

        {/* ── Body — small pill/rounded-rect, like in the image ── */}
        <rect x="124" y="177" width="52" height="48" rx="22" fill={fill}/>

        {/* Pattern over body */}
        {PatternEl(primary, secondary)}

        {/* Garras (sobre patas) */}
        {clawsId && ACC_VISUAL_CHIBI[clawsId]?.(colors)}

        {/* ── Ears — accesorio reemplaza las genéricas ── */}
        {earsId
          ? ACC_VISUAL_CHIBI[earsId]?.(colors)
          : (
            <>
              <path d={EAR_L} fill={fill} stroke={accent} strokeWidth="1"/>
              <path d={EAR_R} fill={fill} stroke={accent} strokeWidth="1"/>
              <path d="M82,92 Q64,20 104,4 Q136,48 110,96 Z" fill={secondary} opacity="0.55"/>
              <path d="M218,92 Q236,20 196,4 Q164,48 190,96 Z" fill={secondary} opacity="0.55"/>
            </>
          )
        }

        {/* ── Head — large round oval, defining chibi shape ── */}
        <ellipse cx="150" cy="100" rx="82" ry="76" fill={fill}/>

        {/* Nose */}
        <ellipse cx="150" cy="118" rx="7" ry="5" fill={accent} opacity="0.85"/>

        {/* Eyes — 1.35× scaled for chibi big-eye look */}
        <g transform="translate(114, 96) scale(1.35)">
          <path d={eyeShape} fill={accent}
                filter={therian.rarity === 'LEGENDARY' ? 'url(#legendary-glow)' : undefined}/>
          <circle cx="0" cy="0" r="2.5" fill="white" opacity="0.85"/>
        </g>
        <g transform="translate(186, 96) scale(1.35)">
          <path d={eyeShape} fill={accent}
                filter={therian.rarity === 'LEGENDARY' ? 'url(#legendary-glow)' : undefined}/>
          <circle cx="0" cy="0" r="2.5" fill="white" opacity="0.85"/>
        </g>

        {/* Ojos accesorio (markings sobre ojos) */}
        {eyesId && ACC_VISUAL_CHIBI[eyesId]?.(colors)}

        {/* Anteojos */}
        {glassId && ACC_VISUAL_CHIBI[glassId]?.(colors)}

        {/* Cabeza accesorio (corona, etc.) */}
        {headId && ACC_VISUAL_CHIBI[headId]?.(colors)}

        {/* Rarity aura */}
        {therian.rarity === 'LEGENDARY' && (
          <>
            <ellipse cx="150" cy="148" rx="92" ry="122" fill="none" stroke={accent} strokeWidth="1" opacity="0.25"/>
            <ellipse cx="150" cy="148" rx="86" ry="116" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.15" strokeDasharray="5 8"/>
          </>
        )}
        {therian.rarity === 'EPIC' && (
          <ellipse cx="150" cy="148" rx="94" ry="124" fill="none" stroke="#C084FC" strokeWidth="1" opacity="0.2"/>
        )}

      </g>
    </svg>
  )
}
