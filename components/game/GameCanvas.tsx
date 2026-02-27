'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { eventBus } from '@/lib/game/engine/EventBus'
import { useGameStore } from '@/lib/store/gameStore'
import { getOrCreatePlayerId, loadPlayer, loadPets, savePlayer, savePets, scheduleSave } from '@/lib/db/gameDB'
import HUD from './HUD'
import SkillPanel from './panels/SkillPanel'
import PetPanel from './panels/PetPanel'
import InventoryPanel from './panels/InventoryPanel'
import { BiomeType } from '@/lib/game/data/types'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const animRef   = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, forceUpdate] = useState(0)

  const store = useGameStore()

  const triggerUpdate = useCallback(() => forceUpdate(n => n + 1), [])

  // Bridge engine events → Zustand store
  useEffect(() => {
    const unsubs = [
      eventBus.on('player:hp_changed', ({ current, max }) => {
        store.setPlayerHP(current, max)
      }),
      eventBus.on('player:energy_changed', ({ current, max }) => {
        store.setPlayerEnergy(current, max)
      }),
      eventBus.on('player:gold_changed', ({ total }) => {
        store.setPlayerGold(total)
      }),
      eventBus.on('world:biome_changed', ({ biomeType }) => {
        store.setBiome(biomeType as BiomeType)
      }),
      eventBus.on('ui:notification', ({ message, type }) => {
        store.addNotification(message, type)
      }),
      eventBus.on('ui:panel_open', ({ panel }) => {
        store.setPanel(panel as 'skills' | 'pets' | 'inventory' | 'map')
      }),
      eventBus.on('ui:panel_close', () => {
        store.setPanel(null)
      }),
      eventBus.on('save:requested', async () => {
        const engine = engineRef.current
        if (!engine) return
        const dirty = engine['chunkSystem'].consumeDirtyChunks()
        scheduleSave(engine.playerState, engine.playerState.pets, dirty)
      }),
    ]
    return () => unsubs.forEach(u => u())
  }, [store])

  // FPS update loop
  useEffect(() => {
    const tick = setInterval(() => {
      if (engineRef.current) store.setFPS(engineRef.current.fps)
    }, 1000)
    return () => clearInterval(tick)
  }, [store])

  // Handle keyboard shortcuts for panels
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.code === 'KeyL') store.togglePanel('skills')
      if (e.code === 'KeyP') store.togglePanel('pets')
      if (e.code === 'Tab') { e.preventDefault(); store.togglePanel('inventory') }
      if (e.code === 'KeyM') store.togglePanel('map')
      if (e.code === 'Escape') store.setPanel(null)

      // Zoom
      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        engineRef.current?.setZoom((engineRef.current['sceneRenderer'].currentZoom ?? 1) + 0.25)
      }
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        engineRef.current?.setZoom((engineRef.current['sceneRenderer'].currentZoom ?? 1) - 0.25)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store])

  // Handle resize
  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      const engine = engineRef.current
      if (canvas && engine) {
        canvas.width  = window.innerWidth
        canvas.height = window.innerHeight
        engine.handleResize(window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Engine initialization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    let engine: GameEngine | null = null

    ;(async () => {
      const playerId = getOrCreatePlayerId()

      // Load or create player
      let savedPlayer = await loadPlayer(playerId)
      let savedPets   = savedPlayer ? await loadPets(playerId) : []

      engine = new GameEngine(canvas, playerId)
      engineRef.current = engine

      if (savedPlayer) {
        savedPlayer.pets = savedPets
        await engine.init(savedPlayer)
        store.setPlayerHP(savedPlayer.hp, savedPlayer.maxHp)
        store.setPlayerEnergy(savedPlayer.energy, savedPlayer.maxEnergy)
        store.setPlayerGold(savedPlayer.gold)
      } else {
        await engine.init()
        // Save newly created player
        await savePlayer(engine.playerState)
      }

      setLoading(false)
      setReady(true)

      // Add a starter pet for fun
      if (engine.playerState.pets.length === 0) {
        const starterPet = engine.petSystem.createPetInstance('grass_slime', 3)
        engine.petSystem.addPet(starterPet)
        engine.petSystem.activatePet(starterPet.instanceId, 0)
        store.addNotification('A Grass Slime decided to follow you!', 'info')
      }
    })()

    return () => {
      engine?.destroy()
      engineRef.current = null
    }
  }, []) // eslint-disable-line

  if (loading) {
    return (
      <div className="fixed inset-0 bg-game-bg flex items-center justify-center font-mono">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🌿</div>
          <div className="text-game-text text-lg font-bold mb-1">Wildborne</div>
          <div className="text-gray-500 text-sm">Generating world...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', imageRendering: 'pixelated' }}
      />

      {/* React UI overlay */}
      {ready && (
        <>
          <HUD />
          <SkillPanel engine={engineRef.current} />
          <PetPanel engine={engineRef.current} onUpdate={triggerUpdate} />
          <InventoryPanel engine={engineRef.current} />
        </>
      )}
    </div>
  )
}
