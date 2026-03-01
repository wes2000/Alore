'use client'

import { useEffect, useRef } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { useGameStore } from '@/lib/store/gameStore'
import { BiomeType, NPCRole } from '@/lib/game/data/types'
import { getAllNPCs } from '@/lib/game/data/npcs'

const BIOME_COLOR: Record<BiomeType, string> = {
  [BiomeType.Plains]:      '#5a9e38',
  [BiomeType.Forest]:      '#2a5c2a',
  [BiomeType.Desert]:      '#c8a050',
  [BiomeType.Savanna]:     '#a89828',
  [BiomeType.Rainforest]:  '#1a6a1a',
  [BiomeType.Swamp]:       '#4a6038',
  [BiomeType.Tundra]:      '#a0b8c8',
  [BiomeType.Taiga]:       '#486858',
  [BiomeType.Snowfield]:   '#d8e8f8',
  [BiomeType.Peaks]:       '#888880',
  [BiomeType.ShallowWater]:'#4080c0',
  [BiomeType.DeepWater]:   '#183870',
}

const POI_COLORS: Record<string, string> = {
  dungeon:    '#e03030',
  shop:       '#00e8e8',
  questGiver: '#f0c800',
  npc:        '#f0c800',
}

const MINI_RADIUS = 8   // chunks visible in each direction
const MINI_PX     = 3   // pixels per chunk tile
const MAP_SIZE    = (MINI_RADIUS * 2 + 1) * MINI_PX  // 51px

// Pre-compute NPC chunk positions
const NPC_LIST = getAllNPCs()

interface MinimapProps {
  engine: GameEngine | null
}

export default function Minimap({ engine }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { playerX, playerY } = useGameStore()

  // Redraw on an interval so we don't thrash React on every move tick
  useEffect(() => {
    if (!engine) return

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE)

      const chunkSize = engine.chunkSizeValue
      const cx = Math.floor(engine.playerState.x / chunkSize)
      const cy = Math.floor(engine.playerState.y / chunkSize)

      // Draw biome tiles and mark dungeons
      for (let dy = -MINI_RADIUS; dy <= MINI_RADIUS; dy++) {
        for (let dx = -MINI_RADIUS; dx <= MINI_RADIUS; dx++) {
          const chunk = engine.getChunk(cx + dx, cy + dy)
          const px = (dx + MINI_RADIUS) * MINI_PX
          const py = (dy + MINI_RADIUS) * MINI_PX

          ctx.fillStyle = BIOME_COLOR[chunk.biome] ?? '#444'
          ctx.fillRect(px, py, MINI_PX, MINI_PX)

          // Dungeon marker
          if (chunk.dungeonData) {
            ctx.fillStyle = POI_COLORS.dungeon
            ctx.fillRect(px + 1, py + 1, MINI_PX - 2, MINI_PX - 2)
          }
        }
      }

      // Draw NPC markers (shops, quest givers, etc.)
      for (const npc of NPC_LIST) {
        const ncx = Math.floor(npc.x / chunkSize)
        const ncy = Math.floor(npc.y / chunkSize)
        const dx = ncx - cx
        const dy = ncy - cy
        if (Math.abs(dx) > MINI_RADIUS || Math.abs(dy) > MINI_RADIUS) continue

        const px = (dx + MINI_RADIUS) * MINI_PX
        const py = (dy + MINI_RADIUS) * MINI_PX

        ctx.fillStyle = npc.role === NPCRole.Shopkeeper
          ? POI_COLORS.shop
          : POI_COLORS.questGiver
        ctx.fillRect(px + 1, py + 1, MINI_PX - 2, MINI_PX - 2)
      }

      // Player dot (always on top)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(MINI_RADIUS * MINI_PX + 1, MINI_RADIUS * MINI_PX + 1, MINI_PX - 2, MINI_PX - 2)
    }

    draw()
    const timer = setInterval(draw, 500)
    return () => clearInterval(timer)
  }, [engine]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={MAP_SIZE}
      height={MAP_SIZE}
      className="border border-game-border rounded-sm"
      style={{ imageRendering: 'pixelated', opacity: 0.85 }}
    />
  )
}
