'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { eventBus } from '@/lib/game/engine/EventBus'
import { useGameStore } from '@/lib/store/gameStore'
import { getOrCreatePlayerId, loadPlayer, loadPets, savePlayer, savePets, scheduleSave } from '@/lib/db/gameDB'
import HUD from './HUD'
import MobileControls from './MobileControls'
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

const ZOOM_MIN = 0.25
const ZOOM_MAX = 4.0
const ZOOM_STEP = 0.15

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
      eventBus.on('interact:nearby',       ({ label })        => store.setInteractPrompt(label)),
      eventBus.on('interact:clear',        ()                 => store.setInteractPrompt(null)),
      // On level-up, immediately push new maxHp/maxEnergy + stats to the HUD
      eventBus.on('skill:level_up', () => {
        const engine = engineRef.current
        if (!engine) return
        const p = engine.playerState
        store.setPlayerHP(p.hp, p.maxHp)
        store.setPlayerEnergy(p.energy, p.maxEnergy)
        const { atk, def } = engine.getComputedStats()
        store.setPlayerStats(atk, def)
      }),
      eventBus.on('gather:start',          ({ nodeType })     => store.setGatherNodeType(nodeType)),
      eventBus.on('gather:progress',       ({ progress })     => store.setGatherProgress(progress)),
      eventBus.on('gather:complete',       ()                 => { store.setGatherProgress(null); store.setGatherNodeType(null) }),
      eventBus.on('gather:cancel',         ()                 => { store.setGatherProgress(null); store.setGatherNodeType(null) }),
      eventBus.on('dialogue:open',         ({ npcId, npcName, npcIcon, node }) => store.setDialogue({ npcId, npcName, npcIcon, node })),
      eventBus.on('dialogue:close',        ()                 => store.setDialogue(null)),
      eventBus.on('shop:open',             ()                 => store.setShopOpen(true)),
      eventBus.on('shop:close',            ()                 => store.setShopOpen(false)),
      // Sync player status effects to store when applied or ticked
      eventBus.on('combat:status_applied', ({ entityId }) => {
        if (entityId === 'player') {
          const engine = engineRef.current
          if (!engine) return
          store.setPlayerStatusEffects(engine.playerState.playerStatusEffects.map(s => s.type))
        }
      }),
      // Sync combo count on damage events for responsive HUD
      eventBus.on('combat:damage', () => {
        const engine = engineRef.current
        if (!engine) return
        const now = performance.now()
        const combo = (now - engine.playerState.lastComboTime < 1500)
          ? engine.playerState.comboHitCount : 0
        store.setComboCount(combo)
      }),
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

  // Save on page close/refresh so pet data and progress are never lost
  useEffect(() => {
    const onBeforeUnload = () => {
      const engine = engineRef.current
      if (!engine) return
      // Fire-and-forget saves (browser gives ~2s for beforeunload)
      savePlayer(engine.playerState).catch(() => {})
      savePets(engine.playerState.id, engine.playerState.pets).catch(() => {})
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // FPS + computed stats polling (stats update rarely so 2s is fine)
  useEffect(() => {
    const tick = setInterval(() => {
      const engine = engineRef.current
      if (!engine) return
      store.setFPS(engine.fps)
      const { atk, def } = engine.getComputedStats()
      store.setPlayerStats(atk, def)
      // Sync status effects and combo to HUD
      const effects = engine.playerState.playerStatusEffects?.map(s => s.type) ?? []
      store.setPlayerStatusEffects(effects)
      // Combo count (reset display if window expired)
      const now = performance.now()
      const combo = (now - engine.playerState.lastComboTime < 1500)
        ? engine.playerState.comboHitCount : 0
      store.setComboCount(combo)
      // Sync combat style and active spell name
      store.setCombatStyle(engine.playerState.combatStyle ?? 'melee')
      store.setActiveSpellName(engine.getActiveSpellName())
    }, 500)
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
      if (e.code === 'KeyB')   store.togglePanel('bestiary')
      if (e.code === 'KeyK')   store.togglePanel('spells')
      if (e.code === 'Escape') store.setPanel(null)
      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zoom = (engineRef.current as any)?.sceneRenderer?.currentZoom ?? 1
        engineRef.current?.setZoom(Math.min(ZOOM_MAX, zoom + 0.25))
      }
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zoom = (engineRef.current as any)?.sceneRenderer?.currentZoom ?? 1
        engineRef.current?.setZoom(Math.max(ZOOM_MIN, zoom - 0.25))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store])

  // Mouse-wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const engine = engineRef.current
      if (!engine) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (engine as any)?.sceneRenderer?.currentZoom ?? 1
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      engine.setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current + delta)))
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, []) // runs once after mount; canvas ref is stable

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

        // Pets are now saved directly on the player document. Fall back to
        // the separate pets table for older saves that don't have inline pets.
        let savedPets = savedPlayer?.pets ?? []
        if (savedPets.length === 0 && savedPlayer) {
          const tablePets = await withTimeout(loadPets(playerId), 4000)
          if (tablePets && tablePets.length > 0) savedPets = tablePets
        }

        setLoadMsg('Building world...')
        engine = new GameEngine(canvas, playerId)
        engineRef.current = engine

        const isNewPlayer = !savedPlayer
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

        // Give starter pet to new players only (not returning players whose pets failed to load)
        if (isNewPlayer && engine.playerState.pets.length === 0) {
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
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: '#080808', fontFamily: "'Press Start 2P', monospace" }}
        >
          <div style={{ textAlign: 'center', color: '#F0E8C8' }}>
            {/* Title box */}
            <div style={{
              border: '4px solid #F0E8C8',
              padding: '16px 32px',
              marginBottom: 24,
              boxShadow: '6px 6px 0 #F0E8C8',
            }}>
              <div style={{ fontSize: 22, color: '#D03030', letterSpacing: 4, marginBottom: 6 }}>WILDBORNE</div>
              <div style={{ fontSize: 7, color: '#C8B888', letterSpacing: 2 }}>A PIXEL ADVENTURE</div>
            </div>
            {/* Loading message */}
            <div style={{ fontSize: 8, color: '#A8A8A8', marginBottom: 20, letterSpacing: 1 }}>{loadMsg}</div>
            {/* Blinking dots */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    background: '#D03030',
                    animationDelay: `${i * 0.25}s`,
                  }}
                  className="animate-bounce"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* React UI — only mounted after engine is live */}
      {ready && (
        <>
          <HUD engine={engineRef.current} />
          <MobileControls engine={engineRef.current} />
          <SkillPanel engine={engineRef.current} />
          <PetPanel engine={engineRef.current} onUpdate={triggerUpdate} />
          <InventoryPanel engine={engineRef.current} />
        </>
      )}
    </div>
  )
}
