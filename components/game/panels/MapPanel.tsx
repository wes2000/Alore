'use client'

import { useEffect, useRef } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { useGameStore } from '@/lib/store/gameStore'
import { BIOME_DEFINITIONS } from '@/lib/game/data/biomes'
import { NPC_DEFINITIONS } from '@/lib/game/data/npcs'
import { BiomeType } from '@/lib/game/data/types'

const CREAM  = '#F0E8C8'
const BLACK  = '#181818'
const RED    = '#D03030'
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

const BIOME_MAP_COLORS: Record<string, string> = {
  Plains: '#5a9e38',
  Forest: '#2d6e1e',
  Desert: '#c8a040',
  Savanna: '#a09030',
  Rainforest: '#1a5a1a',
  Swamp: '#3a5a28',
  Tundra: '#8898a8',
  Taiga: '#406050',
  Snowfield: '#d0d8e8',
  Peaks: '#707070',
  ShallowWater: '#3878b8',
  DeepWater: '#1a3868',
}

const CELL_SIZE = 4
const MAP_RADIUS = 40  // chunks from center to show

interface Props { engine: GameEngine | null }

export default function MapPanel({ engine }: Props) {
  const { activePanel, setPanel, playerX, playerY } = useGameStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (activePanel !== 'map' || !engine || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const chunkSize = engine.chunkSizeValue
    const pcx = Math.floor(playerX / chunkSize)
    const pcy = Math.floor(playerY / chunkSize)

    const width  = (MAP_RADIUS * 2 + 1) * CELL_SIZE
    const height = (MAP_RADIUS * 2 + 1) * CELL_SIZE
    canvas.width  = width
    canvas.height = height

    // Background (fog of war)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    // Get discovered chunks
    const discovered = new Set(engine.playerState.discoveredChunks)

    // Draw discovered chunks
    for (const key of discovered) {
      const [cxStr, cyStr] = key.split('_')
      const cx = parseInt(cxStr)
      const cy = parseInt(cyStr)

      const dx = cx - pcx
      const dy = cy - pcy
      if (Math.abs(dx) > MAP_RADIUS || Math.abs(dy) > MAP_RADIUS) continue

      const chunk = engine.getChunk(cx, cy)
      const color = BIOME_MAP_COLORS[chunk.biome] ?? '#444444'

      const px = (dx + MAP_RADIUS) * CELL_SIZE
      const py = (dy + MAP_RADIUS) * CELL_SIZE

      ctx.fillStyle = color
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)

      // Mark dungeon entrances
      if (chunk.dungeonData) {
        ctx.fillStyle = RED
        ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2)
      }
    }

    // Draw NPC markers
    for (const npc of Object.values(NPC_DEFINITIONS)) {
      const ncx = Math.floor(npc.x / chunkSize)
      const ncy = Math.floor(npc.y / chunkSize)
      const npcKey = `${ncx}_${ncy}`
      if (!discovered.has(npcKey)) continue

      const dx = ncx - pcx
      const dy = ncy - pcy
      if (Math.abs(dx) > MAP_RADIUS || Math.abs(dy) > MAP_RADIUS) continue

      const px = (dx + MAP_RADIUS) * CELL_SIZE
      const py = (dy + MAP_RADIUS) * CELL_SIZE

      ctx.fillStyle = GOLD
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
    }

    // Draw player dot (center, blinking handled by CSS)
    const cpx = MAP_RADIUS * CELL_SIZE
    const cpy = MAP_RADIUS * CELL_SIZE
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cpx, cpy, CELL_SIZE, CELL_SIZE)
    // White outline for visibility
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(cpx - 1, cpy - 1, CELL_SIZE + 2, CELL_SIZE + 2)

  }, [activePanel, engine, playerX, playerY])

  if (activePanel !== 'map') return null

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
      style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) setPanel(null) }}
    >
      <div style={{ ...panel, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 7, color: GOLD }}>WORLD MAP</div>
          <button
            onClick={() => setPanel(null)}
            style={{ ...PIXEL, fontSize: 8, background: RED, color: CREAM, border: `2px solid ${BLACK}`, padding: '3px 8px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Map canvas */}
        <div style={{ border: `3px solid ${BLACK}`, lineHeight: 0 }}>
          <canvas
            ref={canvasRef}
            style={{ imageRendering: 'pixelated', width: (MAP_RADIUS * 2 + 1) * CELL_SIZE, height: (MAP_RADIUS * 2 + 1) * CELL_SIZE }}
          />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 4, color: SHADOW }}>
          <span><span style={{ display: 'inline-block', width: 6, height: 6, background: '#fff', border: `1px solid ${BLACK}`, verticalAlign: 'middle', marginRight: 2 }} /> You</span>
          <span><span style={{ display: 'inline-block', width: 6, height: 6, background: GOLD, border: `1px solid ${BLACK}`, verticalAlign: 'middle', marginRight: 2 }} /> NPC</span>
          <span><span style={{ display: 'inline-block', width: 6, height: 6, background: RED, border: `1px solid ${BLACK}`, verticalAlign: 'middle', marginRight: 2 }} /> Dungeon</span>
          <span><span style={{ display: 'inline-block', width: 6, height: 6, background: '#1a1a1a', border: `1px solid ${BLACK}`, verticalAlign: 'middle', marginRight: 2 }} /> Unexplored</span>
        </div>
      </div>
    </div>
  )
}
