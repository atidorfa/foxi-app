'use client'

import React, { useRef, useEffect } from 'react'
import type { TherianDTO } from '@/lib/therian-dto'
import { ACC_VISUAL_SVG, CLAW_SIDE_SVG } from '@/lib/items/accessory-visuals'

interface Props {
  therian: TherianDTO
  size?: number
  animated?: boolean
  showLimbs?: boolean   // true cuando level >= 2
  isWalking?: boolean   // activa la animación de caminar
  isJumping?: boolean   // activa la pose de salto
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

const PATTERN_DEFS: Record<string, (_primary: string, secondary: string) => React.ReactElement> = {
  solid:    () => <></>,
  stripe:   (_p, s) => (
    <>
      <rect x="80" y="80" width="15" height="140" rx="7" fill={s} opacity="0.5"/>
      <rect x="105" y="60" width="15" height="160" rx="7" fill={s} opacity="0.3"/>
    </>
  ),
  spot:     (_p, s) => (
    <>
      <circle cx="100" cy="100" r="18" fill={s} opacity="0.4"/>
      <circle cx="150" cy="130" r="12" fill={s} opacity="0.35"/>
      <circle cx="80"  cy="150" r="10" fill={s} opacity="0.3"/>
    </>
  ),
  gradient: () => <></>,
  void:     (_p, _s) => (
    <rect x="60" y="60" width="180" height="180" rx="90" fill="url(#voidGrad)" opacity="0.15"/>
  ),
  ember:    (_p, s) => (
    <>
      <ellipse cx="120" cy="200" rx="30" ry="40" fill={s} opacity="0.3"/>
      <ellipse cx="180" cy="210" rx="20" ry="35" fill={s} opacity="0.25"/>
    </>
  ),
  frost:    (_p, s) => (
    <>
      <line x1="150" y1="80" x2="150" y2="220" stroke={s} strokeWidth="1.5" opacity="0.3"/>
      <line x1="90"  y1="110" x2="210" y2="190" stroke={s} strokeWidth="1.5" opacity="0.3"/>
      <line x1="90"  y1="190" x2="210" y2="110" stroke={s} strokeWidth="1.5" opacity="0.3"/>
    </>
  ),
  dual:     (_p, s) => (
    <path d="M150 60 C150 60, 240 150, 150 240 C60 150, 150 60" fill={s} opacity="0.2"/>
  ),
}

const SIGNATURE_ELEMENTS: Record<string, (primary: string, accent: string) => React.ReactElement> = {
  tail_long:    (p, a) => (
    <path d="M200 224 C228 210 260 216 272 246 C282 270 264 282 244 276 C224 270 206 250 200 224 Z"
          fill={p} stroke={a} strokeWidth="1" opacity="0.88"/>
  ),
  tail_fluffy:  (p, a) => (
    <>
      <path d="M200 226 C218 200 260 196 278 228 C294 256 274 282 250 280 C224 278 202 256 200 226 Z"
            fill={p} stroke={a} strokeWidth="1" opacity="0.85"/>
      <ellipse cx="248" cy="274" rx="22" ry="14" fill={a} opacity="0.38"/>
    </>
  ),
  horns_small:  (p, a) => (
    <>
      <path d="M115 85 Q105 55 110 45 Q118 60 118 85" fill={a} stroke={p} strokeWidth="1"/>
      <path d="M185 85 Q195 55 190 45 Q182 60 182 85" fill={a} stroke={p} strokeWidth="1"/>
    </>
  ),
  horns_grand:  (p, a) => (
    <>
      <path d="M110 85 Q85 40 95 20 Q108 45 115 85" fill={a} stroke={p} strokeWidth="1.5"/>
      <path d="M190 85 Q215 40 205 20 Q192 45 185 85" fill={a} stroke={p} strokeWidth="1.5"/>
    </>
  ),
  wings_small:  (p, a) => (
    <>
      <path d="M80 140 Q50 110 55 130 Q60 155 85 155" fill={p} stroke={a} strokeWidth="1" opacity="0.7"/>
      <path d="M220 140 Q250 110 245 130 Q240 155 215 155" fill={p} stroke={a} strokeWidth="1" opacity="0.7"/>
    </>
  ),
  mane:         (_p, a) => (
    <ellipse cx="150" cy="120" rx="55" ry="45" fill={a} opacity="0.35"/>
  ),
  crown:        (p, a) => (
    <path d="M115 80 L125 55 L150 70 L175 55 L185 80 L165 75 L150 65 L135 75 Z"
          fill={a} stroke={p} strokeWidth="1.5"/>
  ),
  no_signature: () => <></>,
}

// Cuerpo: tapa plana en y=148 (ancho completo desde el primer punto), sin cuello visible
// La cabeza se renderiza ENCIMA y oculta la unión — no hace falta transición suave
const BODY_SHAPE = "M96,148 L204,148 C226,148 232,164 232,186 C232,214 226,240 210,254 C196,268 174,274 150,274 C126,274 104,268 90,254 C74,240 68,214 68,186 C68,164 74,148 96,148 Z"
// Cabeza: termina en y=154 — se superpone 6px sobre el cuerpo, unión invisible
const HEAD_SHAPE = "M150,50 C122,50 100,68 96,92 C92,112 97,132 110,142 C122,150 136,154 150,154 C164,154 178,150 190,142 C203,132 208,112 204,92 C200,68 178,50 150,50 Z"
const EAR_L = "M108 80 Q100 44 118 34 Q130 58 118 84 Z"
const EAR_R = "M192 80 Q200 44 182 34 Q170 58 182 84 Z"

// Pivot points: hombros y caderas
const L_ARM_PX = 88,  L_ARM_PY = 160  // hombro izquierdo
const R_ARM_PX = 212, R_ARM_PY = 160  // hombro derecho
const L_LEG_PX = 120, L_LEG_PY = 246  // cadera izquierda
const R_LEG_PX = 180, R_LEG_PY = 246  // cadera derecha

function pivotTransform(px: number, py: number, angle: number): string {
  const a = angle.toFixed(2)
  return `translate(${px} ${py}) rotate(${a}) translate(${-px} ${-py})`
}

export default function TherianAvatarSVG({
  therian,
  size = 300,
  animated = false,
  showLimbs = false,
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
  const clawsId  = accTypeId('garras')
  const hocicoId = accTypeId('hocico')
  const glassId  = accTypeId('anteojos')
  const headId   = accTypeId('cabeza')
  const colors  = { primary, secondary, accent }

  // Refs para las extremidades — el RAF actualiza los atributos directamente
  const lArmRef = useRef<SVGGElement>(null)
  const rArmRef = useRef<SVGGElement>(null)
  const lLegRef = useRef<SVGGElement>(null)
  const rLegRef = useRef<SVGGElement>(null)
  const bodyBobRef = useRef<SVGGElement>(null)

  // Refs para leer estados dentro del loop sin recrearlo
  const isWalkingRef = useRef(isWalking)
  const isJumpingRef = useRef(isJumping)
  useEffect(() => { isWalkingRef.current = isWalking }, [isWalking])
  useEffect(() => { isJumpingRef.current = isJumping }, [isJumping])

  useEffect(() => {
    if (!showLimbs) return

    let animId: number
    let phase = 0
    let lastTime = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const walking = isWalkingRef.current
      const jumping = isJumpingRef.current

      // Walk: ciclo de 0.55s  |  Idle: ciclo lento de 3s  |  Jump: pausa el ciclo
      if (!jumping) {
        const cycleSpeed = walking
          ? (Math.PI * 2) / 0.55
          : (Math.PI * 2) / 3.0
        phase += dt * cycleSpeed
      }

      const sinP = Math.sin(phase)

      if (jumping) {
        // ── JUMP ──
        // Brazos se alzan hacia arriba ±28°, piernas se recogen ±20°
        lArmRef.current?.setAttribute('transform', pivotTransform(L_ARM_PX, L_ARM_PY, -28))
        rArmRef.current?.setAttribute('transform', pivotTransform(R_ARM_PX, R_ARM_PY,  28))
        lLegRef.current?.setAttribute('transform', pivotTransform(L_LEG_PX, L_LEG_PY,  20))
        rLegRef.current?.setAttribute('transform', pivotTransform(R_LEG_PX, R_LEG_PY, -20))
        bodyBobRef.current?.setAttribute('transform', 'translate(0 0)')
      } else if (walking) {
        // ── WALK ──
        // Brazos oscilan ±22°, piernas ±26° en fase opuesta
        const armA =  sinP * 22
        const armB = -sinP * 22
        const legA = -sinP * 26
        const legB =  sinP * 26

        lArmRef.current?.setAttribute('transform', pivotTransform(L_ARM_PX, L_ARM_PY, armA))
        rArmRef.current?.setAttribute('transform', pivotTransform(R_ARM_PX, R_ARM_PY, armB))
        lLegRef.current?.setAttribute('transform', pivotTransform(L_LEG_PX, L_LEG_PY, legA))
        rLegRef.current?.setAttribute('transform', pivotTransform(R_LEG_PX, R_LEG_PY, legB))

        // Bob vertical: sube en cada paso (dos veces por ciclo)
        const bob = -Math.abs(sinP) * 4
        bodyBobRef.current?.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`)
      } else {
        // ── IDLE ──
        // Balanceo suave de brazos ±4°, piernas quietas, respiración leve
        const armSway = sinP * 4
        lArmRef.current?.setAttribute('transform', pivotTransform(L_ARM_PX, L_ARM_PY,  armSway))
        rArmRef.current?.setAttribute('transform', pivotTransform(R_ARM_PX, R_ARM_PY, -armSway))
        lLegRef.current?.setAttribute('transform', pivotTransform(L_LEG_PX, L_LEG_PY, 0))
        rLegRef.current?.setAttribute('transform', pivotTransform(R_LEG_PX, R_LEG_PY, 0))

        // Respiración: bob suave hacia arriba/abajo
        const breathe = sinP * -1.5
        bodyBobRef.current?.setAttribute('transform', `translate(0 ${breathe.toFixed(2)})`)
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [showLimbs]) // solo monta/desmonta una vez; isWalking se lee via ref

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: animated ? 'drop-shadow(0 0 15px rgba(155,89,182,0.4))' : undefined }}
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

      {/* Todo el personaje sube/baja con el bob — excepto las extremidades que ya tienen sus propios transforms */}
      <g ref={bodyBobRef}>

        {showLimbs && (
          <>
            {/* Brazo izquierdo — pivot en hombro izquierdo */}
            <g ref={lArmRef}>
              <ellipse cx="76" cy="200" rx="17" ry="42" fill={fill}/>
              <ellipse cx="68" cy="240" rx="21" ry="13" fill={secondary} opacity="0.9"/>
              {clawsId && CLAW_SIDE_SVG[clawsId]?.(colors, 'L')}
            </g>

            {/* Brazo derecho — pivot en hombro derecho */}
            <g ref={rArmRef}>
              <ellipse cx="224" cy="200" rx="17" ry="42" fill={fill}/>
              <ellipse cx="232" cy="240" rx="21" ry="13" fill={secondary} opacity="0.9"/>
              {clawsId && CLAW_SIDE_SVG[clawsId]?.(colors, 'R')}
            </g>

            {/* Pierna izquierda — pivot en cadera izquierda */}
            <g ref={lLegRef}>
              <ellipse cx="122" cy="272" rx="20" ry="28" fill={fill}/>
              <ellipse cx="114" cy="296" rx="24" ry="11" fill={secondary} opacity="0.9"/>
            </g>

            {/* Pierna derecha — pivot en cadera derecha */}
            <g ref={rLegRef}>
              <ellipse cx="178" cy="272" rx="20" ry="28" fill={fill}/>
              <ellipse cx="186" cy="296" rx="24" ry="11" fill={secondary} opacity="0.9"/>
            </g>
          </>
        )}

        {/* Cola accesorio (detrás del cuerpo, antes del signature) */}
        {tailId && ACC_VISUAL_SVG[tailId]?.(colors)}

        {/* Signature (detrás del cuerpo) */}
        {SignatureEl(primary, accent)}

        {/* Cuerpo */}
        <path d={BODY_SHAPE} fill={fill}/>
        {/* Zona ventral — bien dentro del cuerpo, sin sobresalir */}
        <ellipse cx="150" cy="210" rx="20" ry="28" fill={secondary} opacity="0.38"/>

        {/* Patrón sobre cuerpo */}
        {PatternEl(primary, secondary)}

        {/* Orejas — accesorio reemplaza las genéricas */}
        {earsId
          ? ACC_VISUAL_SVG[earsId]?.(colors)
          : (
            <>
              <path d={EAR_L} fill={primary} stroke={accent} strokeWidth="1"/>
              <path d={EAR_R} fill={primary} stroke={accent} strokeWidth="1"/>
              <path d="M110 76 Q103 50 118 42 Q125 58 116 79 Z" fill={secondary} opacity="0.6"/>
              <path d="M190 76 Q197 50 182 42 Q175 58 184 79 Z" fill={secondary} opacity="0.6"/>
            </>
          )
        }

        {/* Cabeza */}
        <path d={HEAD_SHAPE} fill={fill}/>

        {/* Hocico / Nariz */}
        {hocicoId
          ? ACC_VISUAL_SVG[hocicoId]?.(colors)
          : <ellipse cx="150" cy="118" rx="8" ry="5" fill={accent} opacity="0.9"/>
        }

        {/* Ojos */}
        <g transform="translate(120, 100)">
          <path d={eyeShape} fill={accent}
                filter={therian.rarity === 'LEGENDARY' ? 'url(#legendary-glow)' : undefined}/>
          <circle cx="0" cy="0" r="2" fill="white" opacity="0.8"/>
        </g>
        <g transform="translate(180, 100)">
          <path d={eyeShape} fill={accent}
                filter={therian.rarity === 'LEGENDARY' ? 'url(#legendary-glow)' : undefined}/>
          <circle cx="0" cy="0" r="2" fill="white" opacity="0.8"/>
        </g>

        {/* Ojos accesorio (markings sobre ojos) */}
        {eyesId && ACC_VISUAL_SVG[eyesId]?.(colors)}

        {/* Anteojos */}
        {glassId && ACC_VISUAL_SVG[glassId]?.(colors)}

        {/* Cabeza accesorio (corona, etc.) */}
        {headId && ACC_VISUAL_SVG[headId]?.(colors)}

        {/* Efecto rareza */}
        {therian.rarity === 'LEGENDARY' && (
          <>
            <circle cx="150" cy="150" r="140" fill="none" stroke={accent} strokeWidth="1" opacity="0.2"/>
            <circle cx="150" cy="150" r="130" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.15" strokeDasharray="5 8"/>
          </>
        )}
        {therian.rarity === 'EPIC' && (
          <circle cx="150" cy="150" r="140" fill="none" stroke="#C084FC" strokeWidth="1" opacity="0.15"/>
        )}

      </g>
    </svg>
  )
}
