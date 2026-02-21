'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { TherianDTO } from '@/lib/therian-dto'
// TherianAvatar routes by level: 1→SVG blob, 2→Rive/evolved, 3→chibi
// It handles its own dynamic imports internally
import TherianAvatar from './TherianAvatar'

interface Props {
  therian: TherianDTO
}

const SPEED_PX_PER_SEC = 180
const X_MIN = 60
const X_MARGIN_RIGHT = 120
const JUMP_HEIGHT = 110        // px, how high the character rises
const JUMP_DURATION = 0.52     // seconds for the full parabolic arc

export default function CasaRoom({ therian }: Props) {
  const router = useRouter()

  // Position stored in a ref for the game loop, mirrored to state for rendering
  const posRef = useRef(0)
  const [renderPos, setRenderPos] = useState(-1) // -1 = not yet initialized

  const [isWalking, setIsWalking] = useState(false)
  const [facingRight, setFacingRight] = useState(true)
  const [isJumping, setIsJumping] = useState(false)
  const [jumpOffset, setJumpOffset] = useState(0)

  // Jump state: phase [0,1] advances each frame; active = in-air
  const jumpRef = useRef({ active: false, phase: 0 })

  // Refs to avoid stale closures in the game loop
  const keysRef        = useRef<Set<string>>(new Set())
  const joystickRef    = useRef({ x: 0 })
  const targetXRef     = useRef<number | null>(null)
  const isWalkingRef   = useRef(false)
  const facingRightRef = useRef(true)
  const animFrameRef   = useRef(0)

  // Mobile detection and joystick UI state
  const [isMobile, setIsMobile] = useState(false)
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 })
  const joystickCenterRef = useRef({ x: 0, y: 0 })

  // Initialize on mount (needs window)
  useEffect(() => {
    const initialX = window.innerWidth / 2
    posRef.current = initialX
    setRenderPos(initialX)
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Keyboard listeners
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      // Trigger jump on Space (only if not already jumping)
      if (e.key === ' ' && !jumpRef.current.active) {
        e.preventDefault()
        jumpRef.current = { active: true, phase: 0 }
        setIsJumping(true)
      }
    }
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup',   onUp)
    }
  }, [])

  // Game loop
  useEffect(() => {
    let lastTime = performance.now()
    let xMax = window.innerWidth - X_MARGIN_RIGHT

    const onResize = () => { xMax = window.innerWidth - X_MARGIN_RIGHT }
    window.addEventListener('resize', onResize)

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05) // cap at 50 ms
      lastTime = now

      const keys = keysRef.current
      const goLeft  = keys.has('ArrowLeft')  || keys.has('a') || keys.has('A')
      const goRight = keys.has('ArrowRight') || keys.has('d') || keys.has('D')
      const jx = joystickRef.current.x

      let dx = 0

      if (goLeft || goRight) {
        // Keyboard input cancels point-and-click target
        targetXRef.current = null
        dx = (goRight ? 1 : -1) * SPEED_PX_PER_SEC * dt
      } else if (Math.abs(jx) > 0.1) {
        // Joystick input
        targetXRef.current = null
        dx = jx * SPEED_PX_PER_SEC * dt
      } else if (targetXRef.current !== null) {
        // Point-and-click target
        const diff = targetXRef.current - posRef.current
        if (Math.abs(diff) < 5) {
          targetXRef.current = null
        } else {
          dx = Math.sign(diff) * SPEED_PX_PER_SEC * dt
        }
      }

      if (Math.abs(dx) > 0) {
        const right = dx > 0
        posRef.current = Math.max(X_MIN, Math.min(xMax, posRef.current + dx))
        setRenderPos(posRef.current)

        if (!isWalkingRef.current) {
          isWalkingRef.current = true
          setIsWalking(true)
        }
        if (facingRightRef.current !== right) {
          facingRightRef.current = right
          setFacingRight(right)
        }
      } else if (isWalkingRef.current) {
        isWalkingRef.current = false
        setIsWalking(false)
      }

      // Jump parabola: phase 0→1 over JUMP_DURATION seconds
      const jump = jumpRef.current
      if (jump.active) {
        jump.phase = Math.min(1, jump.phase + dt / JUMP_DURATION)
        // sin(phase*π) produces a smooth 0→peak→0 arc
        const offset = JUMP_HEIGHT * Math.sin(jump.phase * Math.PI)
        setJumpOffset(offset)
        if (jump.phase >= 1) {
          jumpRef.current = { active: false, phase: 0 }
          setJumpOffset(0)
          setIsJumping(false)
        }
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // Click anywhere in the room to set point-and-click destination
  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    targetXRef.current = e.clientX
  }

  // Joystick touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    joystickCenterRef.current = {
      x: rect.left + rect.width  / 2,
      y: rect.top  + rect.height / 2,
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    const center = joystickCenterRef.current
    const maxRadius = 32
    const rawDx = touch.clientX - center.x
    const rawDy = touch.clientY - center.y
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy)
    const clampedDx = dist > maxRadius ? (rawDx / dist) * maxRadius : rawDx
    const clampedDy = dist > maxRadius ? (rawDy / dist) * maxRadius : rawDy
    joystickRef.current = { x: clampedDx / maxRadius }
    setThumbPos({ x: clampedDx, y: clampedDy })
  }

  const handleTouchEnd = () => {
    joystickRef.current = { x: 0 }
    setThumbPos({ x: 0, y: 0 })
  }

  const primaryColor = therian.appearance.paletteColors.primary

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{ width: '100vw', height: '100vh', background: '#0A0A0F' }}
    >
      {/* ── Room background ── */}

      {/* Ceiling glow in therian's primary color */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] rounded-full blur-[120px] opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${primaryColor}, transparent)` }}
      />

      {/* Left wall gradient */}
      <div
        className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #0F0F1A, transparent)' }}
      />

      {/* Right wall gradient */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #0F0F1A, transparent)' }}
      />

      {/* Floor */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '20vh',
          background: 'linear-gradient(to bottom, #1A1A2E, #13131F)',
          borderTop: '1px solid rgba(155,89,182,0.12)',
        }}
      />

      {/* Floor perspective lines */}
      <div
        className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none"
        style={{ height: '20vh' }}
      >
        {[0.25, 0.5, 0.75].map((pct) => (
          <div
            key={pct}
            className="absolute left-0 right-0"
            style={{
              bottom: `${pct * 100}%`,
              height: 1,
              background: 'rgba(155,89,182,0.07)',
            }}
          />
        ))}
      </div>

      {/* Window (left) */}
      <div
        className="absolute pointer-events-none"
        style={{ left: 70, top: 90, width: 100, height: 130 }}
      >
        {/* Outer glow */}
        <div
          style={{
            position: 'absolute',
            inset: -8,
            background: 'radial-gradient(ellipse at center, rgba(100,80,200,0.12), transparent 70%)',
          }}
        />
        {/* Frame */}
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '3px solid #2A2A4E',
            borderRadius: 4,
            background: '#04040E',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Night sky glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 60% 25%, rgba(90,60,180,0.35), transparent 70%)',
            }}
          />
          {/* Stars */}
          {[
            { x: 20, y: 18, r: 1.2, o: 0.7 },
            { x: 55, y: 10, r: 0.8, o: 0.5 },
            { x: 72, y: 28, r: 1.0, o: 0.6 },
            { x: 35, y: 40, r: 0.7, o: 0.4 },
            { x: 80, y: 55, r: 1.0, o: 0.5 },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.r * 2,
                height: s.r * 2,
                borderRadius: '50%',
                background: 'white',
                opacity: s.o,
              }}
            />
          ))}
          {/* Cross divider */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: '#2A2A4E', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: '#2A2A4E', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Plant (right corner) */}
      <div
        className="absolute pointer-events-none"
        style={{ right: 90, bottom: '20vh', transform: 'translateY(2px)' }}
      >
        {/* Leaves SVG */}
        <svg width="70" height="85" viewBox="0 0 70 85" style={{ display: 'block' }}>
          <ellipse cx="35" cy="65" rx="8" ry="26" fill="#1E8449" transform="rotate(-20 35 65)" opacity="0.9"/>
          <ellipse cx="35" cy="65" rx="8" ry="26" fill="#27AE60" transform="rotate(15 35 65)" opacity="0.85"/>
          <ellipse cx="35" cy="65" rx="6" ry="22" fill="#2ECC71" transform="rotate(-3 35 65)" opacity="0.8"/>
          <ellipse cx="35" cy="65" rx="5" ry="18" fill="#1E8449" transform="rotate(35 35 65)" opacity="0.7"/>
          <line x1="35" y1="62" x2="35" y2="35" stroke="#1A5C33" strokeWidth="2" opacity="0.7"/>
        </svg>
        {/* Pot rim */}
        <div style={{ width: 38, height: 8, background: '#4A3A2A', borderRadius: '4px 4px 0 0', margin: '0 auto', border: '1px solid #5A4A3A' }} />
        {/* Pot body */}
        <div style={{ width: 32, height: 24, background: '#3A2A1A', borderRadius: '0 0 6px 6px', margin: '0 auto', border: '1px solid #5A4A3A' }} />
      </div>

      {/* Small shelf (right side) */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: 130,
          top: 110,
          width: 70,
          height: 8,
          background: '#2A2A4A',
          borderRadius: 2,
          boxShadow: '0 3px 10px rgba(0,0,0,0.6)',
        }}
      />
      {/* Glowing orb on shelf */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: 152,
          top: 84,
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${primaryColor}cc, ${primaryColor}44)`,
          boxShadow: `0 0 12px ${primaryColor}66`,
        }}
      />

      {/* ── Navbar ── */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5"
        style={{
          height: 48,
          background: 'rgba(15,15,26,0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{therian.name ?? 'Sin nombre'}</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-white/40 text-xs">Nv {therian.level}</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-white/40 text-xs">{therian.species.emoji} {therian.species.name}</span>
        </div>
        <button
          onClick={() => router.push('/therian')}
          className="text-white/50 hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          ← Volver
        </button>
      </div>

      {/* ── Clickable room area (below navbar) ── */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{ top: 48, cursor: 'crosshair' }}
        onClick={handleRoomClick}
      >
        {/* Therian character */}
        {renderPos > 0 && (
          <div
            style={{
              position: 'absolute',
              left: renderPos,
              bottom: 115 + jumpOffset,
              transform: `translateX(-50%) scaleX(${facingRight ? 1 : -1})`,
              transition: 'none',
              zIndex: 10,
            }}
          >
            <TherianAvatar
              therian={therian}
              size={180}
              isWalking={isWalking}
              isJumping={isJumping}
            />
          </div>
        )}
      </div>

      {/* ── Mobile virtual joystick ── */}
      {isMobile && (
        <div
          className="absolute z-30"
          style={{
            right: 28,
            bottom: 28,
            width: 64,
            height: 64,
            touchAction: 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 relative flex items-center justify-center">
            <div
              className="absolute w-6 h-6 rounded-full bg-white/50"
              style={{ transform: `translate(${thumbPos.x}px, ${thumbPos.y}px)` }}
            />
          </div>
        </div>
      )}

      {/* ── Controls hint ── */}
      {!isMobile && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/20 text-xs text-center pointer-events-none"
        >
          ← → / A D · Click para mover · Espacio para saltar
        </div>
      )}
    </div>
  )
}
