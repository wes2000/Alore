'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { InputState } from '@/lib/game/engine/InputSystem'

// ── D-pad arm size ─────────────────────────────────────────────────────────────
const ARM = 50   // px per D-pad segment (total pad = ARM×3)

// ── Game Boy Color-inspired palette ──────────────────────────────────────────
const GB = {
  dpad:     '#262626',
  dpadLit:  '#505050',
  dpadBd:   '#080808',
  center:   '#101010',
  btnA:     '#C01818',   // red A button
  btnALit:  '#E83030',
  btnB:     '#781010',   // darker B button
  btnBLit:  '#A02020',
  btnSm:    '#1A1A6A',   // dark blue for small buttons
  btnSmLit: '#3030A0',
  btnBd:    '#080808',
  btnTxt:   '#F8F8F0',
  runOff:   '#1A4020',
  runOn:    '#30D060',
}

const PIXEL_FONT: React.CSSProperties = { fontFamily: "'Press Start 2P', monospace" }

interface Props { engine: GameEngine | null }

export default function MobileControls({ engine }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  if (!visible || !engine) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 select-none"
      style={{ touchAction: 'none', ...PIXEL_FONT }}
    >
      <DPad engine={engine} />
      <RunButton engine={engine} />
      <RightButtons engine={engine} />
    </div>
  )
}

// ── D-Pad: drag-zone joystick rendered as a cross ─────────────────────────────
function DPad({ engine }: { engine: GameEngine }) {
  const [vec, setVec] = useState({ x: 0, y: 0 })
  const activeId = useRef<number | null>(null)
  const center   = useRef({ x: 0, y: 0 })

  const isUp    = vec.y < -0.3
  const isDown  = vec.y >  0.3
  const isLeft  = vec.x < -0.3
  const isRight = vec.x >  0.3

  const onDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activeId.current !== null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activeId.current = e.pointerId
    const r = e.currentTarget.getBoundingClientRect()
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    e.preventDefault()
  }, [])

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return
    const dx = e.clientX - center.current.x
    const dy = e.clientY - center.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 10) {
      setVec({ x: 0, y: 0 })
      engine.inputSystem.setJoystickVector(0, 0)
      return
    }
    const nx = dx / dist, ny = dy / dist
    setVec({ x: nx, y: ny })
    engine.inputSystem.setJoystickVector(nx, ny)
    e.preventDefault()
  }, [engine])

  const onUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return
    activeId.current = null
    setVec({ x: 0, y: 0 })
    engine.inputSystem.setJoystickVector(0, 0)
  }, [engine])

  // Shared style for each arm
  const arm = (lit: boolean): React.CSSProperties => ({
    position: 'absolute',
    background: lit ? GB.dpadLit : GB.dpad,
    border: `2px solid ${GB.dpadBd}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: lit ? '#E0E0E0' : '#484848',
    fontSize: 11,
    userSelect: 'none',
    transition: 'background 0.05s, color 0.05s',
  })

  return (
    <div
      className="pointer-events-auto absolute"
      style={{ bottom: 110, left: 10, width: ARM * 3, height: ARM * 3, touchAction: 'none' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* Up */}
      <div style={{ ...arm(isUp), left: ARM, top: 0, width: ARM, height: ARM }}>▲</div>
      {/* Left */}
      <div style={{ ...arm(isLeft), left: 0, top: ARM, width: ARM, height: ARM }}>◄</div>
      {/* Center */}
      <div style={{ position: 'absolute', left: ARM, top: ARM, width: ARM, height: ARM, background: GB.center, border: `2px solid ${GB.dpadBd}` }} />
      {/* Right */}
      <div style={{ ...arm(isRight), right: 0, top: ARM, width: ARM, height: ARM }}>►</div>
      {/* Down */}
      <div style={{ ...arm(isDown), left: ARM, bottom: 0, width: ARM, height: ARM }}>▼</div>
    </div>
  )
}

// ── RUN toggle button (above the D-pad center) ────────────────────────────────
function RunButton({ engine }: { engine: GameEngine }) {
  const [on, setOn] = useState(false)

  const onDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
    const next = !on
    setOn(next)
    engine.inputSystem.setMobileButton('sprint', next)
  }, [engine, on])

  return (
    <button
      className="pointer-events-auto absolute"
      style={{
        // positioned above the up-arm of the D-pad
        bottom: 110 + ARM * 3 + 8,
        left: 10 + ARM,
        width: ARM,
        height: 28,
        background: on ? GB.runOn : GB.runOff,
        border: `2px solid ${GB.dpadBd}`,
        color: on ? '#101010' : '#80C090',
        fontSize: 6,
        ...PIXEL_FONT,
        cursor: 'pointer',
        touchAction: 'none',
        boxShadow: on ? 'none' : `2px 2px 0 ${GB.dpadBd}`,
        transform: on ? 'translate(2px, 2px)' : 'none',
        letterSpacing: 1,
      }}
      onPointerDown={onDown}
    >
      RUN
    </button>
  )
}

// ── Right-side buttons (GB A/B + skills/dodge) ────────────────────────────────
function RightButtons({ engine }: { engine: GameEngine }) {
  return (
    <div
      className="pointer-events-auto absolute flex flex-col items-end"
      style={{ bottom: 110, right: 12, gap: 12 }}
    >
      {/* Row 1: Q (Ability 1) · R (Ability 2) — small oval SELECT-style */}
      <div style={{ display: 'flex', gap: 10 }}>
        <GBBtn engine={engine} action="ability1" label="Q" size={44} bg={GB.btnSm} bgLit={GB.btnSmLit} />
        <GBBtn engine={engine} action="ability2" label="R" size={44} bg={GB.btnSm} bgLit={GB.btnSmLit} />
      </div>

      {/* Row 2: Dodge · B (interact) · A (attack) */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <GBBtn engine={engine} action="dodge"    label="DG" size={40} bg={GB.dpad}  bgLit={GB.dpadLit} />
        <GBBtn engine={engine} action="interact" label="B"  size={56} bg={GB.btnB}  bgLit={GB.btnBLit} />
        <GBBtn engine={engine} action="attack"   label="A"  size={70} bg={GB.btnA}  bgLit={GB.btnALit} />
      </div>
    </div>
  )
}

interface GBBtnProps {
  engine: GameEngine
  action: keyof InputState
  label: string
  size: number
  bg: string
  bgLit: string
}

function GBBtn({ engine, action, label, size, bg, bgLit }: GBBtnProps) {
  const [pressed, setPressed] = useState(false)

  const onDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
    setPressed(true)
    engine.inputSystem.setMobileButton(action, true)
  }, [engine, action])

  const onUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setPressed(false)
    engine.inputSystem.setMobileButton(action, false)
  }, [engine, action])

  const fontSize = size >= 66 ? 13 : size >= 52 ? 10 : 7

  return (
    <button
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: pressed ? bgLit : bg,
        color: GB.btnTxt,
        border: `3px solid ${GB.btnBd}`,
        ...PIXEL_FONT,
        fontSize,
        cursor: 'pointer',
        transform: pressed ? 'translate(2px, 2px)' : 'none',
        boxShadow: pressed ? 'none' : `3px 3px 0 ${GB.btnBd}`,
        transition: 'none',
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label}
    </button>
  )
}
