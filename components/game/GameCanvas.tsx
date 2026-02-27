'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { eventBus } from '@/lib/game/engine/EventBus'
import { useGameStore } from '@/lib/store/gameStore'
import { getOrCreatePlayerId, loadPlayer, loadPets, savePlayer, scheduleSave } from '@/lib/db/gameDB'
import HUD from './HUD'
import SkillPanel from './panels/SkillPanel'
import PetPanel from './panels/PetPanel'
import InventoryPanel from './panels/InventoryPanel'
import { BiomeType } from '@/lib/game/data/types'

/** Wrap a promise with a timeout — resolves null on timeout so DB never hangs startup */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ])
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const initedRef = useRef(false)
  const [ready,   setReady]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadMsg, setLoadMsg] = useState('Generating world...')
  const [, forceUpdate] = useState(0)

  const store = useGameStore()
  const triggerUpdate = useCallback(() => forceUpdate(n => n + 1), [])

  // Bridge engine events → Zustand store
  useEffect(() => {
    const unsubs = [
      eventBus.on('player:hp_changed',     ({ current, max }) => store.setPlayerHP(current, max)),
      eventBus.on('player:energy_changed', ({ current, max }) => store.setPlayerEnergy(current, max)),
      eventBus.on('player:gold_changed',   ({ total })        => store.setPlayerGold(total)),
      eventBus.on('world:biome_changed',   ({ biomeType })    => store.setBiome(biomeType as BiomeType)),
      eventBus.on('ui:notification',       ({ message, type }) => store.addNotification(message, type)),
      eventBus.on('ui:panel_open',         ({ panel })        => store.setPanel(panel as 'skills' | 'pets' | 'inventory' | 'map')),
      eventBus.on('ui:panel_close',        ()                 => store.setPanel(null)),
      eventBus.on('save:requested', async () => {
        const engine = engineRef.current
        if (!engine) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dirty = (engine as any).chunkSystem?.consumeDirtyChunks() ?? []
        scheduleSave(engine.playerState, engine.playerState.pets, dirty)
      }),
    ]
    return () => unsubs.forEach(u => u())
  }, [store])

  // FPS polling
  useEffect(() => {
    const tick = setInterval(() => {
      if (engineRef.current) store.setFPS(engineRef.current.fps)
    }, 1000)
    return () => clearInterval(tick)
  }, [store])

  // Keyboard shortcuts for panels + zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.code === 'KeyL')   store.togglePanel('skills')
      if (e.code === 'KeyP')   store.togglePanel('pets')
      if (e.code === 'Tab')  { e.preventDefault(); store.togglePanel('inventory') }
      if (e.code === 'KeyM')   store.togglePanel('map')
      if (e.code === 'Escape') store.setPanel(null)
      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zoom = (engineRef.current as any)?.sceneRenderer?.currentZoom ?? 1
        engineRef.current?.setZoom(zoom + 0.25)
      }
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zoom = (engineRef.current as any)?.sceneRenderer?.currentZoom ?? 1
        engineRef.current?.setZoom(zoom - 0.25)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store])

  // Resize handler
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

  // Engine initialization — canvas is always rendered so ref is populated here
  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true

    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    let engine: GameEngine | null = null

    ;(async () => {
      try {
        setLoadMsg('Looking up save data...')
        const playerId = getOrCreatePlayerId()

        // 4-second timeout so a slow/offline DB never blocks startup
        const savedPlayer = await withTimeout(loadPlayer(playerId), 4000)
        const savedPets   = savedPlayer
          ? (await withTimeout(loadPets(playerId), 4000) ?? [])
          : []

        setLoadMsg('Building world...')
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
          savePlayer(engine.playerState).catch(console.error)
        }

        // Give starter pet to new players
        if (engine.playerState.pets.length === 0) {
          const pet = engine.petSystem.createPetInstance('grass_slime', 3)
          engine.petSystem.addPet(pet)
          engine.petSystem.activatePet(pet.instanceId, 0)
        }

        setLoading(false)
        setReady(true)

        setTimeout(() => {
          store.addNotification('Welcome to Wildborne! WASD to move.', 'info')
          if (engine!.playerState.pets.length > 0) {
            store.addNotification('A Grass Slime decided to follow you!', 'success')
          }
        }, 300)

      } catch (err) {
        console.error('Engine init error:', err)
        // Never hang — show game even if something went wrong
        setLoadMsg('Starting...')
        setTimeout(() => {
          setLoading(false)
          setReady(false)
        }, 500)
      }
    })()

    return () => {
      engine?.destroy()
      engineRef.current = null
      initedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Canvas is ALWAYS in the DOM so the ref is populated when useEffect fires */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', imageRendering: 'pixelated' }}
      />

      {/* Loading overlay sits on top of the canvas — dismissed once engine is ready */}
      {loading && (
        <div className="absolute inset-0 bg-game-bg flex items-center justify-center font-mono z-50">
          <div className="text-center">
            <div className="text-5xl mb-5 animate-pulse">🌿</div>
            <div className="text-game-text text-xl font-bold mb-2 tracking-widest">WILDBORNE</div>
            <div className="text-gray-500 text-sm">{loadMsg}</div>
            <div className="mt-5 flex gap-1.5 justify-center">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-game-accent animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* React UI — only mounted after engine is live */}
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
