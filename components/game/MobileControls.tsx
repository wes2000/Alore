'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { InputState } from '@/lib/game/engine/InputSystem'

/** Max pixel displacement of the joystick knob from its center */
const JOYSTICK_RADIUS = 52

interface Props {
  engine: GameEngine | null
}

export default function MobileControls({ engine }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  if (!visible || !engine) return null

  return (
    <div className="pointer-events-none absolute inset-0 select-none" style={{ touchAction: 'none' }}>
      <Joystick engine={engine} />
      <SprintButton engine={engine} />
      <ActionButtons engine={engine} />
    </div>
  )
}

// ─── Virtual Joystick ─────────────────────────────────────────────────────────

function Joystick({ engine }: { engine: GameEngine }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const activeId = useRef<number | null>(null)
  const baseCenter = useRef({ x: 0, y: 0 })

  const size = JOYSTICK_RADIUS * 2 + 24

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activeId.current !== null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activeId.current = e.pointerId
    const rect = e.currentTarget.getBoundingClientRect()
    baseCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    setDragging(true)
    e.preventDefault()
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return
    const dx = e.clientX - baseCenter.current.x
    const dy = e.clientY - baseCenter.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const clampedDist = Math.min(dist, JOYSTICK_RADIUS)
    const angle = Math.atan2(dy, dx)
    setKnob({ x: Math.cos(angle) * clampedDist, y: Math.sin(angle) * clampedDist })
    // Dead-zone of 6px before registering movement
    const nx = dist > 6 ? dx / dist : 0
    const ny = dist > 6 ? dy / dist : 0
    engine.inputSystem.setJoystickVector(nx, ny)
    e.preventDefault()
  }, [engine])

  const release = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return
    activeId.current = null
    setDragging(false)
    setKnob({ x: 0, y: 0 })
    engine.inputSystem.setJoystickVector(0, 0)
  }, [engine])

  return (
    <div
      className="pointer-events-auto absolute"
      style={{ bottom: 108, left: 20, width: size, height: size, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
    >
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full border-2 border-white/20 bg-black/20"
      />
      {/* Inner ring */}
      <div
        className="absolute rounded-full border border-white/10"
        style={{
          inset: JOYSTICK_RADIUS / 2,
          borderRadius: '50%',
        }}
      />
      {/* Knob */}
      <div
        className="absolute rounded-full bg-white/50 border-2 border-white/80"
        style={{
          width: 44,
          height: 44,
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          transition: dragging ? 'none' : 'transform 0.12s ease-out',
        }}
      />
    </div>
  )
}

// ─── Sprint Toggle ─────────────────────────────────────────────────────────────

function SprintButton({ engine }: { engine: GameEngine }) {
  const [sprintOn, setSprintOn] = useState(false)

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
    const next = !sprintOn
    setSprintOn(next)
    engine.inputSystem.setMobileButton('sprint', next)
  }, [engine, sprintOn])

  return (
    <button
      className={`pointer-events-auto absolute rounded-full border-2 font-bold text-white flex items-center justify-center select-none transition-colors ${
        sprintOn
          ? 'bg-teal-500/90 border-teal-300'
          : 'bg-black/40 border-white/25 text-white/60'
      }`}
      style={{ bottom: 220, left: 30, width: 46, height: 46, fontSize: 20, touchAction: 'none' }}
      onPointerDown={onPointerDown}
    >
      ⚡
    </button>
  )
}

// ─── Action Buttons ────────────────────────────────────────────────────────────

function ActionButtons({ engine }: { engine: GameEngine }) {
  return (
    <div
      className="pointer-events-auto absolute flex flex-col items-end gap-3"
      style={{ bottom: 108, right: 20 }}
    >
      {/* Row 1: Abilities */}
      <div className="flex gap-2">
        <ActionBtn engine={engine} action="ability1" label="Q" size={46} color="bg-indigo-600/75 border-indigo-400" />
        <ActionBtn engine={engine} action="ability2" label="R" size={46} color="bg-purple-600/75 border-purple-400" />
      </div>
      {/* Row 2: Dodge · Interact · Attack */}
      <div className="flex gap-2 items-center">
        <ActionBtn engine={engine} action="dodge"    label="💨" size={46} color="bg-sky-600/75 border-sky-400" />
        <ActionBtn engine={engine} action="interact" label="E"  size={54} color="bg-yellow-600/75 border-yellow-400" />
        <ActionBtn engine={engine} action="attack"   label="⚔"  size={66} color="bg-red-600/75 border-red-400" fontSize={24} />
      </div>
    </div>
  )
}

interface ActionBtnProps {
  engine: GameEngine
  action: keyof InputState
  label: string
  size: number
  color: string
  fontSize?: number
}

function ActionBtn({ engine, action, label, size, color, fontSize }: ActionBtnProps) {
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

  return (
    <button
      className={`rounded-full border-2 flex items-center justify-center font-bold text-white select-none ${color} ${pressed ? 'opacity-100' : 'opacity-70'}`}
      style={{
        width: size,
        height: size,
        fontSize: fontSize ?? (size > 54 ? 18 : 14),
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        transition: 'transform 0.08s ease, opacity 0.08s ease',
        touchAction: 'none',
      }}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {label}
    </button>
  )
}
