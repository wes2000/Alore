'use client'

import { useState, useEffect } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { useGameStore } from '@/lib/store/gameStore'
import { MOB_DEFINITIONS } from '@/lib/game/data/mobs'
import { BestiaryEntry } from '@/lib/game/data/types'

const CREAM  = '#F0E8C8'
const BLACK  = '#181818'
const RED    = '#D03030'
const GOLD   = '#E8A000'
const GREEN  = '#00A800'
const BLUE   = '#2848C0'
const SHADOW = '#706040'
const PIXEL: React.CSSProperties = { fontFamily: "'Press Start 2P', monospace" }

const panel: React.CSSProperties = {
  background: CREAM,
  border: `3px solid ${BLACK}`,
  boxShadow: `3px 3px 0 ${BLACK}`,
  color: BLACK,
  ...PIXEL,
}

const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#E05020',
  Water: '#2070C0',
  Earth: '#6A8030',
  Lightning: '#D0C020',
  Wind: '#70B0A0',
  Shadow: '#6040A0',
  Light: '#E0D040',
  Arcane: '#A040E0',
  None: SHADOW,
}

interface Props { engine: GameEngine | null }

export default function BestiaryPanel({ engine }: Props) {
  const { activePanel, setPanel } = useGameStore()
  const [bestiary, setBestiary] = useState<Record<string, BestiaryEntry>>({})

  useEffect(() => {
    if (activePanel === 'bestiary' && engine) {
      setBestiary({ ...engine.playerState.bestiary })
    }
  }, [activePanel, engine])

  if (activePanel !== 'bestiary') return null

  const allMobs = Object.values(MOB_DEFINITIONS)
  const discovered = allMobs.filter(m => bestiary[m.id])
  const completion = allMobs.length > 0 ? Math.round((discovered.length / allMobs.length) * 100) : 0

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
      style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) setPanel(null) }}
    >
      <div style={{ ...panel, width: 380, maxWidth: '94vw', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 7, color: GOLD }}>BESTIARY</div>
          <div style={{ fontSize: 5, color: SHADOW }}>{discovered.length}/{allMobs.length} ({completion}%)</div>
          <button
            onClick={() => setPanel(null)}
            style={{ ...PIXEL, fontSize: 8, background: RED, color: CREAM, border: `2px solid ${BLACK}`, padding: '3px 8px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Mob grid */}
        <div
          className="custom-scroll"
          style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          {allMobs.map(mob => {
            const entry = bestiary[mob.id]
            const isDiscovered = !!entry

            return (
              <div
                key={mob.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  background: isDiscovered ? '#E0D8A8' : '#C0B890',
                  border: `2px solid ${BLACK}`,
                  opacity: isDiscovered ? 1 : 0.5,
                }}
              >
                {/* Color swatch representing the mob */}
                <div style={{
                  width: 16, height: 16, flexShrink: 0,
                  background: isDiscovered ? `#${mob.color.toString(16).padStart(6, '0')}` : '#888',
                  border: `2px solid ${isDiscovered ? `#${mob.accentColor.toString(16).padStart(6, '0')}` : '#666'}`,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 5 }}>
                    {isDiscovered ? mob.name : '???'}
                  </div>
                  {isDiscovered && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 4 }}>
                      <span style={{ color: ELEMENT_COLORS[mob.element] || SHADOW }}>
                        {mob.element}
                      </span>
                      <span style={{ color: SHADOW }}>
                        Kills: {entry.kills}
                      </span>
                      {mob.tameable && (
                        <span style={{ color: entry.tamed ? GREEN : SHADOW }}>
                          {entry.tamed ? 'Tamed' : 'Not tamed'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Drop hints for discovered mobs */}
                {isDiscovered && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {mob.drops.slice(0, 3).map((d, i) => (
                      <span key={i} style={{ fontSize: 4, color: SHADOW }}>
                        {d.itemId.split('_').map(w => w[0].toUpperCase()).join('')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
