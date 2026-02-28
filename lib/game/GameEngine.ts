import * as THREE from 'three'
import {
  PlayerState, SkillType, BiomeType,
  ResourceNodeType, ResourceNodeState, InventoryItem, MobInstance,
  TileType,
} from './data/types'
import { createDefaultPlayer } from '../db/gameDB'
import { ChunkSystem, worldToChunkLocal } from './world/ChunkSystem'
import { CHUNK_SIZE } from './world/BiomeMap'
import { SceneRenderer } from './renderer/SceneRenderer'
import { ChunkRenderer } from './renderer/ChunkRenderer'
import { EntityRenderer, HealthBarRenderer } from './renderer/EntityRenderer'
import { SpriteManager, PlayerDirection } from './renderer/SpriteManager'
import { GameLoop, TICK_RATE } from './engine/GameLoop'
import { InputSystem } from './engine/InputSystem'
import { eventBus } from './engine/EventBus'
import { SkillSystem } from './systems/SkillSystem'
import { PetSystem } from './systems/PetSystem'
import { CombatSystem } from './systems/CombatSystem'
import { TamingSystem } from './systems/TamingSystem'
import { MobSpawner } from './world/MobSpawner'
import { GatheringSystem, NODE_RESPAWN_MS } from './systems/GatheringSystem'
import { MOB_DEFINITIONS } from './data/mobs'
import { ITEM_DEFINITIONS } from './data/items'
import { XP_AWARDS } from './data/skills'
import { BIOME_DEFINITIONS, TILE_IMPASSABLE } from './data/biomes'

const PLAYER_SPEED         = 5.0   // tiles per second
const SPRINT_MULT          = 1.7
const ENERGY_SPRINT_DRAIN  = 12    // energy/sec while sprinting
const ENERGY_REGEN         = 6     // energy/sec when not sprinting

const PRELOAD_RADIUS       = 3     // chunks around player to preload (tile data, collision)
const RENDER_RADIUS        = 2     // chunks around player to hold GPU textures (5×5 = 25 max)

// Tick-count thresholds derived from TICK_RATE so they stay correct if the rate changes
const AUTO_SAVE_TICKS      = TICK_RATE * 30           // every 30 s
const NEARBY_CHECK_TICKS   = Math.ceil(TICK_RATE / 10) // 10× per second (~100 ms)
const NODE_RESPAWN_TICKS   = TICK_RATE * 10           // every 10 s
const PET_BOND_TICKS       = TICK_RATE                // every 1 s
const ANIM_FRAME_TICKS     = Math.ceil(TICK_RATE / 6) // ~6 animation fps

const PLAYER_ATTACK_RANGE    = 1.5   // tiles
const PLAYER_ATTACK_BASE_DMG = 12    // damage at melee level 1
const PLAYER_ATTACK_COOLDOWN = 0.7   // seconds between attacks
const INTERACT_RANGE         = 2.5   // tiles

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
  private mobSpawner: MobSpawner
  private gatheringSystem: GatheringSystem

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
  private playerAttackCooldown = 0
  // Reused across ticks — avoids allocating a new Set every 30 Hz
  private liveMobIds = new Set<string>()
  private mobEntityIds = new Set<string>()
  private lastInteractLabel = ''

  // Previous player position for camera interpolation (set each tick before movement)
  private prevPlayerX = 0
  private prevPlayerY = 0

  // Change-detection for player stat events (avoids 60fps React re-renders)
  private prevHpRounded    = -1
  private prevMaxHp        = -1
  private prevEnergyRounded = -1
  private prevMaxEnergy    = -1

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
    this.mobSpawner   = new MobSpawner(this.playerState.worldSeed)
    this.gatheringSystem = new GatheringSystem(
      this.playerState,
      this.skillSystem,
      (chunkKey, nodeId, nodeType, itemId, qty) =>
        this.onGatherComplete(chunkKey, nodeId, nodeType, itemId, qty)
    )

    // Sprite manager (loads async)
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
      // Recreate world-dependent systems with the loaded seed
      this.chunkSystem = new ChunkSystem(this.playerState.worldSeed)
      this.mobSpawner  = new MobSpawner(this.playerState.worldSeed)
    }

    // Add player entity
    this.entityRenderer.addEntity(
      'player', 'player',
      this.playerState.x, this.playerState.y,
      0x4488ff, 0x88bbff,
      this.playerState.name
    )

    this.setupEventListeners()

    // Seed interpolation state so the first render doesn't snap from 0,0
    this.prevPlayerX = this.playerState.x
    this.prevPlayerY = this.playerState.y

    // Pre-warm chunks around spawn
    this.chunkSystem.preloadAround(this.playerState.x, this.playerState.y, PRELOAD_RADIUS)
    this.syncChunksToRenderer()

    // Load sprites async; rebake in-place once ready (no mesh destroy/recreate)
    this.spriteManager.load().then(() => {
      this.chunkRenderer.setSpriteManager(this.spriteManager)
      this.entityRenderer.setSpriteManager(this.spriteManager)
      this.chunkRenderer.rebakeAll()
    })

    this.initialized = true
    this.gameLoop.start()
  }

  private setupEventListeners(): void {
    eventBus.on('combat:damage', ({ targetId }) => {
      this.entityRenderer.flash(targetId, 0xff4444, 120)
    })
    eventBus.on('combat:heal', ({ targetId }) => {
      this.entityRenderer.flash(targetId, 0x44ff44, 120)
    })

    // Mob attacks player
    eventBus.on('mob:attack_player', ({ damage }) => {
      const p = this.playerState
      const defLevel = this.skillSystem.getSkillLevel(SkillType.Defense)
      const reduction = Math.floor(defLevel * 0.4)
      const reduced = Math.max(1, damage - reduction)
      p.hp = Math.max(0, p.hp - reduced)
      this.entityRenderer.flash('player', 0xff2222, 200)
      this.forceEmitPlayerHP()
      if (p.hp <= 0) {
        eventBus.emit('ui:notification', { message: 'You were defeated!', type: 'danger' })
        p.hp = Math.max(1, Math.floor(p.maxHp * 0.5))
        p.x = 16; p.y = 16
        this.forceEmitPlayerHP()
        eventBus.emit('ui:notification', { message: 'Respawned at starting area.', type: 'warning' })
      }
    })

    // Skill level-up: golden flash + force-push new max HP/energy to HUD
    eventBus.on('skill:level_up', ({ skill, newLevel }) => {
      this.entityRenderer.flash('player', 0xffee00, 600)
      // Force re-emit stats so HUD picks up new maxHp / maxEnergy immediately
      this.prevHpRounded     = -1
      this.prevMaxHp         = -1
      this.prevEnergyRounded = -1
      this.prevMaxEnergy     = -1
      const skillName = skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase()
      eventBus.emit('ui:notification', {
        message: `${skillName} Level ${newLevel}!`,
        type: 'success',
      })
    })
  }

  /** Force-emit player HP event regardless of change-detection state. */
  private forceEmitPlayerHP(): void {
    const p = this.playerState
    this.prevHpRounded = Math.round(p.hp)
    this.prevMaxHp     = p.maxHp
    eventBus.emit('player:hp_changed', { current: p.hp, max: p.maxHp })
  }

  // ─── Update (fixed timestep) ─────────────────────────────────────────────

  private update(dt: number): void {
    if (!this.initialized) return
    this.tickCount++

    this.updatePlayer(dt)
    this.updatePets(dt)
    this.combatSystem.tick()

    this.playerAttackCooldown = Math.max(0, this.playerAttackCooldown - dt)
    this.mobSpawner.update(dt, this.playerState.x, this.playerState.y)
    this.gatheringSystem.update(dt)

    this.handlePlayerAttack()
    this.handleInteract()
    if (this.tickCount % NEARBY_CHECK_TICKS === 0) this.checkNearbyInteractions()
    this.syncMobsToRenderer()
    this.mobSpawner.removeDead()

    this.checkNodeRespawns()
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

    // Snapshot position before movement so render() can interpolate the camera
    this.prevPlayerX = p.x
    this.prevPlayerY = p.y

    // Cancel gathering when player moves
    if ((move.x !== 0 || move.y !== 0) && this.gatheringSystem.isGathering) {
      this.gatheringSystem.cancel()
    }

    const isSprinting = input.sprint && (move.x !== 0 || move.y !== 0)
    let speed = PLAYER_SPEED

    if (isSprinting && p.energy > 0) {
      speed *= SPRINT_MULT
      p.energy = Math.max(0, p.energy - ENERGY_SPRINT_DRAIN * dt)
    } else {
      p.energy = Math.min(p.maxEnergy, p.energy + ENERGY_REGEN * dt)
    }

    const vitalityBonus = 1 + (this.skillSystem.getSkillLevel(SkillType.Vitality) - 1) * 0.001

    const dx = move.x * speed * vitalityBonus * dt
    const dy = move.y * speed * vitalityBonus * dt

    const newX = p.x + dx
    const newY = p.y + dy

    if (!this.isBlocked(newX, p.y)) p.x = newX
    if (!this.isBlocked(p.x, newY)) p.y = newY

    // Only emit when integer-rounded values actually change — prevents 60fps React re-renders
    const hpR = Math.round(p.hp)
    if (hpR !== this.prevHpRounded || p.maxHp !== this.prevMaxHp) {
      this.prevHpRounded = hpR
      this.prevMaxHp     = p.maxHp
      eventBus.emit('player:hp_changed', { current: p.hp, max: p.maxHp })
    }
    const enR = Math.round(p.energy)
    if (enR !== this.prevEnergyRounded || p.maxEnergy !== this.prevMaxEnergy) {
      this.prevEnergyRounded = enR
      this.prevMaxEnergy     = p.maxEnergy
      eventBus.emit('player:energy_changed', { current: p.energy, max: p.maxEnergy })
    }

    this.entityRenderer.updatePosition('player', p.x, p.y)
    this.healthBars.setHealth('player', p.hp / p.maxHp)

    const isMoving = move.x !== 0 || move.y !== 0
    if (move.x > 0.1)       this.playerDir = 'right'
    else if (move.x < -0.1) this.playerDir = 'left'
    else if (move.y > 0.1)  this.playerDir = 'down'
    else if (move.y < -0.1) this.playerDir = 'up'

    if (isMoving) {
      this.playerFrameTick++
      if (this.playerFrameTick >= ANIM_FRAME_TICKS) {
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
    const r = 0.35
    const cx = x + 0.5
    const cy = y + 0.5
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
      // Only ratio here — position synced in render() with interpolation
      this.healthBars.setHealth(`pet_${pet.instanceId}`, pet.stats.hp / pet.stats.maxHp)

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

      if (this.tickCount % PET_BOND_TICKS === 0) {
        this.petSystem.awardBondXP(pet.instanceId, 0.5)
      }
    })
  }

  // ─── Combat ──────────────────────────────────────────────────────────────

  private handlePlayerAttack(): void {
    if (!this.inputSystem.wasJustPressed('attack')) return
    if (this.playerAttackCooldown > 0) return

    const p = this.playerState
    const mob = this.mobSpawner.getMobAt(p.x + 0.5, p.y + 0.5, PLAYER_ATTACK_RANGE)
    if (!mob) return

    this.playerAttackCooldown = PLAYER_ATTACK_COOLDOWN
    const meleeLvl = this.skillSystem.getSkillLevel(SkillType.Melee)
    const damage = Math.max(1, PLAYER_ATTACK_BASE_DMG + (meleeLvl - 1) * 2 - mob.def)

    const result = this.mobSpawner.damageMob(mob.id, damage)
    if (!result) return

    this.entityRenderer.flash(`mob_${mob.id}`, 0xff4444, 120)
    this.skillSystem.awardXP(SkillType.Melee, 4)

    if (result.state === 'dead') {
      this.onMobDied(result)
    }
  }

  // ─── Interaction ─────────────────────────────────────────────────────────

  private handleInteract(): void {
    if (!this.inputSystem.wasJustPressed('interact')) return

    const p = this.playerState

    // Cancel active gather
    if (this.gatheringSystem.isGathering) {
      this.gatheringSystem.cancel()
      return
    }

    // Priority 1: tame a weak nearby mob
    const tameTarget = this.mobSpawner.getTameableMobNearby(p.x + 0.5, p.y + 0.5, INTERACT_RANGE)
    if (tameTarget) {
      const result = this.tamingSystem.attempt(tameTarget.id, tameTarget.petDefId, tameTarget.level)
      eventBus.emit('ui:notification', {
        message: result.message,
        type: result.success ? 'success' : 'warning',
      })
      if (result.success) {
        this.mobSpawner.damageMob(tameTarget.id, tameTarget.maxHp)
      }
      return
    }

    // Priority 2: gather a resource node
    const nodeResult = this.findNearbyNode()
    if (nodeResult) {
      this.gatheringSystem.start(nodeResult.node.id, nodeResult.node.type, nodeResult.chunkKey)
    }
  }

  private checkNearbyInteractions(): void {
    if (this.gatheringSystem.isGathering) {
      if (this.lastInteractLabel !== '') {
        this.lastInteractLabel = ''
        eventBus.emit('interact:clear', {})
      }
      return
    }

    const p = this.playerState

    const tameTarget = this.mobSpawner.getTameableMobNearby(p.x + 0.5, p.y + 0.5, INTERACT_RANGE)
    if (tameTarget) {
      const def = MOB_DEFINITIONS[tameTarget.mobId]
      const label = `Tame ${def?.name ?? tameTarget.mobId} [E]`
      if (label !== this.lastInteractLabel) {
        this.lastInteractLabel = label
        eventBus.emit('interact:nearby', { label })
      }
      return
    }

    const nodeResult = this.findNearbyNode()
    if (nodeResult) {
      const typeLabel = nodeResult.node.type.replace(/([A-Z])/g, ' $1').trim()
      const label = `Gather ${typeLabel} [E]`
      if (label !== this.lastInteractLabel) {
        this.lastInteractLabel = label
        eventBus.emit('interact:nearby', { label })
      }
      return
    }

    if (this.lastInteractLabel !== '') {
      this.lastInteractLabel = ''
      eventBus.emit('interact:clear', {})
    }
  }

  private findNearbyNode(): { node: ResourceNodeState; chunkKey: string } | null {
    const p = this.playerState
    const cx = Math.floor(p.x / CHUNK_SIZE)
    const cy = Math.floor(p.y / CHUNK_SIZE)

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this.chunkSystem.getChunk(cx + dx, cy + dy)
        for (const node of chunk.resourceNodes) {
          if (node.depleted) continue
          const wx = chunk.cx * CHUNK_SIZE + node.localX
          const wy = chunk.cy * CHUNK_SIZE + node.localY
          const dist = Math.sqrt((wx - p.x - 0.5) ** 2 + (wy - p.y - 0.5) ** 2)
          if (dist <= INTERACT_RANGE) {
            return { node, chunkKey: `${chunk.cx}_${chunk.cy}` }
          }
        }
      }
    }
    return null
  }

  // ─── Mob Management ──────────────────────────────────────────────────────

  private syncMobsToRenderer(): void {
    // Reuse the Set — clear() is O(n) but skips allocation + GC pressure
    this.liveMobIds.clear()

    // mobValues() returns an iterator directly — no Array.from allocation
    for (const mob of this.mobSpawner.mobValues()) {
      if (mob.state === 'dead') continue
      const id = `mob_${mob.id}`
      this.liveMobIds.add(id)

      const def = MOB_DEFINITIONS[mob.mobId]
      this.entityRenderer.addEntity(
        id, 'mob',
        mob.x, mob.y,
        def?.color ?? 0x888888,
        def?.accentColor ?? 0xaaaaaa,
        def ? `${def.name} L${mob.level}` : mob.mobId,
        0.65
      )
      // Only pass the ratio — position is synced in render() with interpolation
      this.healthBars.setHealth(id, mob.hp / mob.maxHp)
      this.mobEntityIds.add(id)
    }

    // Remove despawned mob entities
    for (const id of this.mobEntityIds) {
      if (!this.liveMobIds.has(id)) {
        this.entityRenderer.removeEntity(id)
        this.healthBars.remove(id)
        this.mobEntityIds.delete(id)
      }
    }
  }

  private onMobDied(mob: MobInstance): void {
    const def = MOB_DEFINITIONS[mob.mobId]
    if (!def) return

    for (const drop of def.drops) {
      if (Math.random() < drop.chance) {
        const qty = drop.minQty + Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1))
        this.addToInventory(drop.itemId, qty)
      }
    }

    const xp = 10 + mob.level * 5
    this.skillSystem.awardXP(SkillType.Melee, xp)

    eventBus.emit('mob:died', { mobId: mob.id, x: mob.x, y: mob.y })
    eventBus.emit('ui:notification', { message: `Defeated ${def.name}!`, type: 'info' })
  }

  private addToInventory(itemId: string, qty: number): void {
    const p = this.playerState
    const def = ITEM_DEFINITIONS[itemId]
    const maxStack = def?.maxStack ?? 100
    const existing = p.inventory.find(i => i.itemId === itemId)
    if (existing && def?.stackable) {
      existing.quantity = Math.min(maxStack, existing.quantity + qty)
    } else {
      const item: InventoryItem = {
        itemId,
        quantity: Math.min(maxStack, qty),
        slotIndex: p.inventory.length,
      }
      p.inventory.push(item)
    }
  }

  // ─── Gathering ───────────────────────────────────────────────────────────

  private onGatherComplete(
    chunkKey: string,
    nodeId: string,
    nodeType: ResourceNodeType,
    itemId: string,
    qty: number
  ): void {
    const [cxStr, cyStr] = chunkKey.split('_')
    const cx = parseInt(cxStr)
    const cy = parseInt(cyStr)
    const chunk = this.chunkSystem.getChunk(cx, cy)
    const node = chunk.resourceNodes.find(n => n.id === nodeId)
    if (node) {
      const respawnMs = NODE_RESPAWN_MS[nodeType]
      if (respawnMs !== 0) {
        node.depleted = true
        node.respawnAt = Date.now() + (respawnMs ?? 5 * 60_000)
        this.chunkSystem.markDirty(cx, cy)
        this.chunkRenderer.refreshChunk(chunk)
      }
    }
    this.addToInventory(itemId, qty)
  }

  private checkNodeRespawns(): void {
    if (this.tickCount % NODE_RESPAWN_TICKS !== 0) return  // every 10 s

    const now = Date.now()
    const p = this.playerState
    const cx = Math.floor(p.x / CHUNK_SIZE)
    const cy = Math.floor(p.y / CHUNK_SIZE)
    const radius = PRELOAD_RADIUS + 1

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const chunk = this.chunkSystem.getChunk(cx + dx, cy + dy)
        let changed = false
        for (const node of chunk.resourceNodes) {
          if (node.depleted && node.respawnAt > 0 && now >= node.respawnAt) {
            node.depleted = false
            node.respawnAt = 0
            changed = true
          }
        }
        if (changed) this.chunkRenderer.refreshChunk(chunk)
      }
    }
  }

  // ─── Chunk Management ────────────────────────────────────────────────────

  private checkChunkTransition(): void {
    const p = this.playerState
    const { cx, cy } = worldToChunkLocal(Math.floor(p.x), Math.floor(p.y))
    const key = `${cx}_${cy}`

    if (key !== this.prevChunkKey) {
      this.prevChunkKey = key
      eventBus.emit('world:chunk_entered', { cx, cy })
      this.skillSystem.awardXP(SkillType.Exploration, XP_AWARDS.exploration.new_chunk)

      this.chunkSystem.preloadAround(p.x, p.y, PRELOAD_RADIUS)
      this.syncChunksToRenderer()

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
    const p  = this.playerState
    const cx = Math.floor(p.x / CHUNK_SIZE)
    const cy = Math.floor(p.y / CHUNK_SIZE)

    // Build GPU meshes only within RENDER_RADIUS (5×5 = 25 chunks max).
    // PRELOAD_RADIUS tile data is still warmed by checkChunkTransition for collision / mob logic.
    for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
      for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
        const chunk = this.chunkSystem.getChunk(cx + dx, cy + dy)
        this.chunkRenderer.addChunk(chunk)
        this.mobSpawner.spawnForChunk(cx + dx, cy + dy, chunk.biome)
      }
    }

    // Evict chunks that have scrolled too far away so GPU memory doesn't grow unboundedly.
    this.chunkRenderer.removeChunksOutsideRadius(cx, cy, RENDER_RADIUS + 1)
  }

  // ─── Render (interpolated) ───────────────────────────────────────────────

  private render(alpha: number): void {
    const p = this.playerState

    // Interpolate camera between the previous and current tick positions so the
    // background scrolls at the same rate as the player sprite — eliminates stutter.
    const camX =  this.prevPlayerX + (p.x - this.prevPlayerX) * alpha + 0.5
    const camY = -(this.prevPlayerY + (p.y - this.prevPlayerY) * alpha + 0.5)
    this.sceneRenderer.setCameraPosition(camX, camY)

    // Build/repaint at most 2 chunks per frame — spreads expensive canvas work
    // so no single frame ever stalls waiting for chunk painting.
    this.chunkRenderer.processPending(2)

    const { rx, ry } = this.sceneRenderer.getVisibleTileRadius()
    this.chunkRenderer.syncVisible(camX, camY, rx, ry)

    this.entityRenderer.render(alpha)
    // Sync health bar positions to interpolated entity positions (smooth + no per-tick writes)
    this.healthBars.syncPositions(this.entityRenderer, alpha)
    this.sceneRenderer.render()
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  handleResize(width: number, height: number): void {
    this.sceneRenderer.resize(width, height)
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

  /** Derived combat/progression stats for the HUD. */
  getComputedStats(): { atk: number; def: number; maxHp: number; maxEnergy: number } {
    const p = this.playerState
    const meleeLvl = this.skillSystem.getSkillLevel(SkillType.Melee)
    const defLvl   = this.skillSystem.getSkillLevel(SkillType.Defense)
    return {
      atk:       PLAYER_ATTACK_BASE_DMG + (meleeLvl - 1) * 2,
      def:       Math.floor(defLvl * 0.4),
      maxHp:     p.maxHp,
      maxEnergy: p.maxEnergy,
    }
  }

  /** Expose a chunk by coords — used by Minimap. */
  getChunk(cx: number, cy: number) {
    return this.chunkSystem.getChunk(cx, cy)
  }

  get chunkSizeValue(): number {
    return CHUNK_SIZE
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

function isImpassable(tileValue: number): boolean {
  const tile = tileValue as unknown as TileType
  return TILE_IMPASSABLE[tile] === true
}

function getPetColor(defId: string): string {
  const colors: Record<string, string> = {
    grass_slime:    '#5aae3a',
    water_slime:    '#4a90c8',
    wild_boar:      '#8a5a3a',
    emberkit:       '#e05020',
    forest_sprite:  '#80c840',
    fawn:           '#d4a870',
    shadow_wolf:    '#6a3a9a',
    frost_wisp:     '#a0d4f8',
    blazefang:      '#e03000',
    stone_colossus: '#6a6a5a',
    storm_eagle:    '#c8c820',
    cinderwyrm:     '#c02000',
    void_leviathan: '#3a1a5a',
  }
  return colors[defId] ?? '#888888'
}
