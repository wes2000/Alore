import * as THREE from 'three'
import { PlayerState, SkillType, BiomeType } from './data/types'
import { createDefaultPlayer } from '../db/gameDB'
import { ChunkSystem, worldToChunkLocal } from './world/ChunkSystem'
import { CHUNK_SIZE } from './world/BiomeMap'
import { SceneRenderer } from './renderer/SceneRenderer'
import { ChunkRenderer } from './renderer/ChunkRenderer'
import { EntityRenderer, HealthBarRenderer } from './renderer/EntityRenderer'
import { SpriteManager, PlayerDirection } from './renderer/SpriteManager'
import { GameLoop } from './engine/GameLoop'
import { InputSystem } from './engine/InputSystem'
import { eventBus } from './engine/EventBus'
import { SkillSystem } from './systems/SkillSystem'
import { PetSystem } from './systems/PetSystem'
import { CombatSystem } from './systems/CombatSystem'
import { TamingSystem } from './systems/TamingSystem'
import { XP_AWARDS } from './data/skills'
import { BIOME_DEFINITIONS } from './data/biomes'

const PLAYER_SPEED    = 5.0   // tiles per second (walking)
const SPRINT_MULT     = 1.7   // multiplier while sprinting
const ENERGY_SPRINT_DRAIN = 12  // energy per second while sprinting
const ENERGY_REGEN    = 6     // energy per second when not sprinting

const PRELOAD_RADIUS  = 3     // chunks to preload around player
const AUTO_SAVE_TICKS = 60 * 30  // ~every 30 seconds at 60tps

export class GameEngine {
  // Core
  playerState: PlayerState
  private chunkSystem: ChunkSystem
  private sceneRenderer: SceneRenderer
  private chunkRenderer: ChunkRenderer
  private entityRenderer: EntityRenderer
  private healthBars: HealthBarRenderer
  private gameLoop: GameLoop
  private inputSystem: InputSystem

  // Systems
  skillSystem: SkillSystem
  petSystem: PetSystem
  combatSystem: CombatSystem
  tamingSystem: TamingSystem

  // Sprite rendering
  private spriteManager: SpriteManager

  // State tracking
  private initialized = false
  private tickCount = 0
  private prevChunkKey = ''
  private prevBiome: BiomeType | null = null
  private playerDir: PlayerDirection = 'down'
  private playerFrame = 0
  private playerFrameTick = 0

  constructor(canvas: HTMLCanvasElement, playerId: string) {
    this.playerState = createDefaultPlayer(playerId)

    // Renderer
    this.sceneRenderer = new SceneRenderer(canvas)

    // World
    this.chunkSystem = new ChunkSystem(this.playerState.worldSeed)

    // Sub-renderers
    this.chunkRenderer  = new ChunkRenderer(this.sceneRenderer.worldScene)
    this.entityRenderer = new EntityRenderer(this.sceneRenderer.worldScene)
    this.healthBars     = new HealthBarRenderer(this.sceneRenderer.worldScene)

    // Input
    this.inputSystem = new InputSystem()
    this.inputSystem.attach(canvas)

    // Systems
    this.skillSystem  = new SkillSystem(this.playerState)
    this.petSystem    = new PetSystem(this.playerState)
    this.combatSystem = new CombatSystem()
    this.tamingSystem = new TamingSystem(this.playerState, this.petSystem, this.skillSystem)

    // Sprite manager (loads async; renderers get it once ready)
    this.spriteManager = new SpriteManager()

    // Game loop
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha)
    )
  }

  /** Initialize with saved or new player data */
  async init(savedState?: Partial<PlayerState>): Promise<void> {
    if (savedState) {
      Object.assign(this.playerState, savedState)
      // Recreate chunk system with loaded world seed
      this.chunkSystem = new ChunkSystem(this.playerState.worldSeed)
    }

    // Add player entity to renderer
    this.entityRenderer.addEntity(
      'player', 'player',
      this.playerState.x, this.playerState.y,
      0x4488ff, 0x88bbff,
      this.playerState.name
    )

    // Register event listeners
    this.setupEventListeners()

    // Pre-warm chunks around spawn
    this.chunkSystem.preloadAround(this.playerState.x, this.playerState.y, PRELOAD_RADIUS)
    this.syncChunksToRenderer()

    // Load sprites asynchronously; rebake chunks once ready
    this.spriteManager.load().then(() => {
      this.chunkRenderer.setSpriteManager(this.spriteManager)
      this.entityRenderer.setSpriteManager(this.spriteManager)
      this.chunkRenderer.rebakeAll()
      this.syncChunksToRenderer()
    })

    this.initialized = true
    this.gameLoop.start()
  }

  private setupEventListeners(): void {
    // Combat events → visual feedback
    eventBus.on('combat:damage', ({ targetId, amount }) => {
      this.entityRenderer.flash(targetId, 0xff4444, 120)
    })
    eventBus.on('combat:heal', ({ targetId }) => {
      this.entityRenderer.flash(targetId, 0x44ff44, 120)
    })
  }

  // ─── Update (fixed timestep) ─────────────────────────────────────────────

  private update(dt: number): void {
    if (!this.initialized) return
    this.tickCount++

    this.updatePlayer(dt)
    this.updatePets(dt)
    this.combatSystem.tick()
    this.checkChunkTransition()

    if (this.tickCount % AUTO_SAVE_TICKS === 0) {
      eventBus.emit('save:requested', {})
    }

    this.inputSystem.endFrame()
  }

  private updatePlayer(dt: number): void {
    const input = this.inputSystem.getState()
    const move  = this.inputSystem.getMoveVector()
    const p     = this.playerState

    // Sprint
    const isSprinting = input.sprint && (move.x !== 0 || move.y !== 0)
    let speed = PLAYER_SPEED

    if (isSprinting && p.energy > 0) {
      speed *= SPRINT_MULT
      p.energy = Math.max(0, p.energy - ENERGY_SPRINT_DRAIN * dt)
    } else {
      // Regen energy
      p.energy = Math.min(p.maxEnergy, p.energy + ENERGY_REGEN * dt)
    }

    // Apply Vitality level bonus to speed
    const vitalityBonus = 1 + (this.skillSystem.getSkillLevel(SkillType.Vitality) - 1) * 0.001

    const dx = move.x * speed * vitalityBonus * dt
    const dy = move.y * speed * vitalityBonus * dt

    // Collision check
    const newX = p.x + dx
    const newY = p.y + dy

    if (!this.isBlocked(newX, p.y)) p.x = newX
    if (!this.isBlocked(p.x, newY)) p.y = newY

    // Emit events if values changed
    eventBus.emit('player:hp_changed', { current: p.hp, max: p.maxHp })
    eventBus.emit('player:energy_changed', { current: p.energy, max: p.maxEnergy })

    // Update entity renderer position
    this.entityRenderer.updatePosition('player', p.x, p.y)
    this.healthBars.setHealth('player', p.x, p.y, p.hp / p.maxHp)

    // Direction tracking for sprite animation
    const isMoving = move.x !== 0 || move.y !== 0
    if (move.x > 0.1)       this.playerDir = 'right'
    else if (move.x < -0.1) this.playerDir = 'left'
    else if (move.y > 0.1)  this.playerDir = 'down'
    else if (move.y < -0.1) this.playerDir = 'up'

    if (isMoving) {
      this.playerFrameTick++
      if (this.playerFrameTick >= 10) {
        this.playerFrameTick = 0
        this.playerFrame = (this.playerFrame + 1) % 3
      }
      this.playerState.playtime += dt
    } else {
      this.playerFrame = 0
    }
    this.entityRenderer.setPlayerFrame(this.playerDir, this.playerFrame)
  }

  private isBlocked(x: number, y: number): boolean {
    const r = 0.35  // half-size collision radius
    const cx = x + 0.5
    const cy = y + 0.5
    // Check all 4 corners of the player's bounding box
    const corners: [number, number][] = [
      [cx - r, cy - r], [cx + r, cy - r],
      [cx - r, cy + r], [cx + r, cy + r],
    ]
    for (const [wx, wy] of corners) {
      if (isImpassable(this.chunkSystem.getTileAt(Math.floor(wx), Math.floor(wy)))) return true
    }
    return false
  }

  private updatePets(dt: number): void {
    const active = this.petSystem.activePets
    const p = this.playerState

    active.forEach((pet, slot) => {
      // Simple follow AI: pets orbit around the player
      const angle = (slot / Math.max(1, active.length)) * Math.PI * 2 + this.tickCount * 0.02
      const followRadius = 1.5 + slot * 0.5
      const targetX = p.x + Math.cos(angle) * followRadius - 0.5
      const targetY = p.y + Math.sin(angle) * followRadius - 0.5

      this.entityRenderer.addEntity(
        `pet_${pet.instanceId}`, 'pet',
        targetX, targetY,
        parseInt(getPetColor(pet.definitionId).replace('#', ''), 16),
        0xffffff,
        pet.name,
        0.6
      )
      this.entityRenderer.updatePosition(`pet_${pet.instanceId}`, targetX, targetY)
      this.healthBars.setHealth(
        `pet_${pet.instanceId}`,
        targetX, targetY,
        pet.stats.hp / pet.stats.maxHp
      )

      // Tick status effects
      const burnDmg = this.combatSystem.tickStatusEffects(pet, dt)
      if (burnDmg > 0) {
        this.petSystem.damagePet(pet.instanceId, burnDmg)
        eventBus.emit('combat:damage', {
          targetId: `pet_${pet.instanceId}`,
          amount: burnDmg,
          type: 'Magical',
          element: 'Fire' as import('./data/types').Element,
        })
      }

      // Award bond XP passively while active
      if (this.tickCount % 60 === 0) {
        this.petSystem.awardBondXP(pet.instanceId, 0.5)
      }
    })
  }

  private checkChunkTransition(): void {
    const p = this.playerState
    const { cx, cy } = worldToChunkLocal(Math.floor(p.x), Math.floor(p.y))
    const key = `${cx}_${cy}`

    if (key !== this.prevChunkKey) {
      this.prevChunkKey = key
      eventBus.emit('world:chunk_entered', { cx, cy })

      // Award exploration XP for new chunk
      this.skillSystem.awardXP(SkillType.Exploration, XP_AWARDS.exploration.new_chunk)

      // Preload surrounding chunks
      this.chunkSystem.preloadAround(p.x, p.y, PRELOAD_RADIUS)
      this.syncChunksToRenderer()

      // Check biome change
      const chunk = this.chunkSystem.getChunkAt(Math.floor(p.x), Math.floor(p.y))
      if (chunk.biome !== this.prevBiome) {
        this.prevBiome = chunk.biome
        eventBus.emit('world:biome_changed', { biomeType: chunk.biome })
        if (!this.playerState.discoveredPOIs.includes(`biome_${chunk.biome}`)) {
          this.playerState.discoveredPOIs.push(`biome_${chunk.biome}`)
          this.skillSystem.awardXP(SkillType.Exploration, XP_AWARDS.exploration.new_biome)
          eventBus.emit('ui:notification', {
            message: `Discovered: ${BIOME_DEFINITIONS[chunk.biome].name}`,
            type: 'info',
          })
        }
      }
    }
  }

  private syncChunksToRenderer(): void {
    const p = this.playerState
    const cx = Math.floor(p.x / CHUNK_SIZE)
    const cy = Math.floor(p.y / CHUNK_SIZE)
    const radius = PRELOAD_RADIUS + 1

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const chunk = this.chunkSystem.getChunk(cx + dx, cy + dy)
        this.chunkRenderer.addChunk(chunk)
      }
    }
  }

  // ─── Render (interpolated) ───────────────────────────────────────────────

  private render(alpha: number): void {
    const p = this.playerState

    // Interpolated camera follow
    const camX = p.x + 0.5
    const camY = -(p.y + 0.5)  // Y flip
    this.sceneRenderer.setCameraPosition(camX, camY)

    // Update mouse world position
    const { rx, ry } = this.sceneRenderer.getVisibleTileRadius()
    this.chunkRenderer.syncVisible(camX, camY, rx, ry)

    // Interpolated entity positions
    this.entityRenderer.render(alpha)

    this.sceneRenderer.render()
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  handleResize(width: number, height: number): void {
    this.sceneRenderer.resize(width, height)
  }

  interactAtMouse(): void {
    const { mouseWorldX, mouseWorldY } = this.inputSystem.getState()
    // TODO: check for resource nodes, NPCs, etc. at mouse position
  }

  setZoom(zoom: number): void {
    this.sceneRenderer.setZoom(zoom)
  }

  get fps(): number {
    return this.gameLoop.fps
  }

  getPlayerBiome(): BiomeType {
    const p = this.playerState
    const chunk = this.chunkSystem.getChunkAt(Math.floor(p.x), Math.floor(p.y))
    return chunk.biome
  }

  destroy(): void {
    this.gameLoop.stop()
    this.inputSystem.detach()
    this.entityRenderer.dispose()
    this.chunkRenderer.dispose()
    this.healthBars.dispose()
    this.sceneRenderer.dispose()
    eventBus.clear()
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { TileType } from './data/types'
import { TILE_IMPASSABLE } from './data/biomes'

function isImpassable(tileValue: number): boolean {
  const tile = tileValue as unknown as TileType
  return TILE_IMPASSABLE[tile] === true
}

function getPetColor(defId: string): string {
  const colors: Record<string, string> = {
    grass_slime: '#5aae3a',
    water_slime: '#4a90c8',
    wild_boar:   '#8a5a3a',
    emberkit:    '#e05020',
    forest_sprite: '#80c840',
    fawn:        '#d4a870',
    shadow_wolf: '#6a3a9a',
    frost_wisp:  '#a0d4f8',
    blazefang:   '#e03000',
    stone_colossus: '#6a6a5a',
    storm_eagle: '#c8c820',
    cinderwyrm:  '#c02000',
    void_leviathan: '#3a1a5a',
  }
  return colors[defId] ?? '#888888'
}
