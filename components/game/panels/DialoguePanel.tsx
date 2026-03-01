'use client'

import { GameEngine } from '@/lib/game/GameEngine'
import { useGameStore } from '@/lib/store/gameStore'

const CREAM  = '#F0E8C8'
const BLACK  = '#181818'
const GOLD   = '#E8A000'
const SHADOW = '#706040'
const PIXEL: React.CSSProperties = { fontFamily: "'Press Start 2P', monospace" }

const panel: React.CSSProperties = {
  background: CREAM,
  border: `3px solid ${BLACK}`,
  boxShadow: `3px 3px 0 ${BLACK}`,
  color: BLACK,
  ...PIXEL,
}

interface Props { engine: GameEngine | null }

export default function DialoguePanel({ engine }: Props) {
  const { dialogue, setDialogue } = useGameStore()

  if (!dialogue) return null

  const handleChoice = (index: number) => {
    if (!engine) return
    engine.handleDialogueChoice(index)
  }

  return (
    <div
      className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-auto"
      style={{ zIndex: 50 }}
    >
      <div style={{ ...panel, width: 400, maxWidth: '94vw', padding: '12px 14px' }}>
        {/* NPC header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{dialogue.npcIcon}</span>
          <span style={{ fontSize: 7, color: GOLD }}>{dialogue.npcName.toUpperCase()}</span>
        </div>

        {/* Dialogue text */}
        <div style={{
          fontSize: 6,
          lineHeight: '12px',
          color: BLACK,
          padding: '8px 10px',
          background: '#E0D8A8',
          border: `2px solid ${BLACK}`,
          marginBottom: 8,
          minHeight: 40,
        }}>
          {dialogue.node.text}
        </div>

        {/* Choices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {dialogue.node.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleChoice(i)}
              style={{
                ...PIXEL,
                fontSize: 6,
                padding: '6px 10px',
                background: CREAM,
                color: BLACK,
                border: `2px solid ${BLACK}`,
                cursor: 'pointer',
                textAlign: 'left',
                lineHeight: '10px',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = CREAM }}
              onMouseLeave={e => { e.currentTarget.style.background = CREAM; e.currentTarget.style.color = BLACK }}
            >
              {'> '}{choice.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 4, color: SHADOW, marginTop: 6, textAlign: 'center' }}>
          Move to close
        </div>
      </div>
    </div>
  )
}
