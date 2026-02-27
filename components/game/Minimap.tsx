'use client'

import { useEffect, useRef } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { useGameStore } from '@/lib/store/gameStore'
import { BiomeType } from '@/lib/game/data/types'

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

const MINI_RADIUS = 8   // chunks visible in each direction
const MINI_PX     = 3   // pixels per chunk tile
const MAP_SIZE    = (MINI_RADIUS * 2 + 1) * MINI_PX  // 51px

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

      const cx = Math.floor(engine.playerState.x / engine.chunkSizeValue)
      const cy = Math.floor(engine.playerState.y / engine.chunkSizeValue)

      for (let dy = -MINI_RADIUS; dy <= MINI_RADIUS; dy++) {
        for (let dx = -MINI_RADIUS; dx <= MINI_RADIUS; dx++) {
          const chunk = engine.getChunk(cx + dx, cy + dy)
          ctx.fillStyle = BIOME_COLOR[chunk.biome] ?? '#444'
          ctx.fillRect(
            (dx + MINI_RADIUS) * MINI_PX,
            (dy + MINI_RADIUS) * MINI_PX,
            MINI_PX,
            MINI_PX
          )
        }
      }

      // Player dot
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
