import * as THREE from 'three'
import {
  PlayerState, SkillType, BiomeType,
  ResourceNodeType, ResourceNodeState, InventoryItem, MobInstance,
  TileType, Equipment, StatusEffect, Element, ActiveStatusEffect,
} from './data/types'
import { createDefaultPlayer } from '../db/gameDB'
import { ChunkSystem, worldToChunkLocal } from './world/ChunkSystem'
import { CHUNK_SIZE } from './world/BiomeMap'
import { isDungeonFloor } from './world/DungeonGenerator'
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
import { CraftingSystem } from './systems/CraftingSystem'
import { QuestSystem } from './systems/QuestSystem'
import { StatusEffectSystem } from './systems/StatusEffectSystem'
import { SpellSystem } from './systems/SpellSystem'
import { MobSpawner } from './world/MobSpawner'
import { GatheringSystem, NODE_RESPAWN_MS } from './systems/GatheringSystem'
import { MOB_DEFINITIONS } from './data/mobs'
import { ITEM_DEFINITIONS } from './data/items'
import { XP_AWARDS } from './data/skills'
import { ABILITIES } from './data/abilities'
import { SPELLS } from './data/spells'
import { BIOME_DEFINITIONS, TILE_IMPASSABLE } from './data/biomes'
import { SHOP_BUY_ITEMS, SHOP_NPC_X, SHOP_NPC_Y, SHOP_INTERACT_RANGE, SELL_RATIO } from './data/shop'
import { NPCSystem } from './systems/NPCSystem'
import { NPC_DEFINITIONS, getAllNPCs } from './data/npcs'

const PLAYER_SPEED         = 5.0   // tiles per second
const SPRINT_MULT          = 1.7
const ENERGY_SPRINT_DRAIN  = 12    // energy/sec while sprinting
const ENERGY_REGEN         = 6     // energy/sec when not sprinting

const PRELOAD_RADIUS       = 2     // chunks around player to preload (tile data, collision)
const RENDER_RADIUS        = 1     // chunks around player to hold GPU textures (3×3 = 9 max)

// Tick-count thresholds derived from TICK_RATE so they stay correct if the rate changes
const AUTO_SAVE_TICKS      = TICK_RATE * 30           // every 30 s
const NEARBY_CHECK_TICKS   = Math.ceil(TICK_RATE / 10) // 10× per second (~100 ms)
const NODE_RESPAWN_TICKS   = TICK_RATE * 10           // every 10 s
const PET_BOND_TICKS       = TICK_RATE                // every 1 s
const ANIM_FRAME_TICKS     = Math.ceil(TICK_RATE / 6) // ~6 animation fps

const PLAYER_ATTACK_RANGE    = 2.5   // tiles (auto-target scan radius)
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
  inputSystem: InputSystem

  // Systems
  skillSystem: SkillSystem
  petSystem: PetSystem
  combatSystem: CombatSystem
  tamingSystem: TamingSystem
  craftingSystem: CraftingSystem
  questSystem!: QuestSystem
  statusEffectSystem: StatusEffectSystem
  spellSystem: SpellSystem
  private mobSpawner: MobSpawner
  private gatheringSystem: GatheringSystem
  npcSystem: NPCSystem

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

  // Pet ability cooldown tracking: petInstanceId → { abilityId → lastUsedTimeSec }
  private petAbilityCooldowns = new Map<string, Record<string, number>>()

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
    this.craftingSystem = new CraftingSystem(this.playerState, this.skillSystem)
    this.statusEffectSystem = new StatusEffectSystem()
    this.spellSystem = new SpellSystem(this.playerState, this.skillSystem)
    this.mobSpawner   = new MobSpawner(this.playerState.worldSeed)
    this.gatheringSystem = new GatheringSystem(
      this.playerState,
      this.skillSystem,
      (chunkKey, nodeId, nodeType, itemId, qty) =>
        this.onGatherComplete(chunkKey, nodeId, nodeType, itemId, qty)
    )
    this.npcSystem = new NPCSystem(this.playerState)

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

    // Ensure new fields have defaults for old saves
    if (!this.playerState.equipment) this.playerState.equipment = { weapon: null, offhand: null, body: null }
    if (!this.playerState.activeQuests) this.playerState.activeQuests = []
    if (!this.playerState.currentDungeon) this.playerState.currentDungeon = null
    if (!this.playerState.playerStatusEffects) this.playerState.playerStatusEffects = []
    if (this.playerState.equippedSpellIndex == null) this.playerState.equippedSpellIndex = 0
    if (!this.playerState.combatStyle) this.playerState.combatStyle = 'melee'
    if (this.playerState.comboHitCount == null) this.playerState.comboHitCount = 0
    if (this.playerState.lastComboTime == null) this.playerState.lastComboTime = 0
    if (!this.playerState.bestiary) this.playerState.bestiary = {}
    if (!this.playerState.discoveredChunks) this.playerState.discoveredChunks = []

    // Initialize quest system (must be after player state is loaded)
    this.questSystem = new QuestSystem(this.playerState, this.skillSystem)

    // Add player entity (no label — player name clutters center screen)
    this.entityRenderer.addEntity(
      'player', 'player',
      this.playerState.x, this.playerState.y,
      0x4488ff, 0x88bbff,
      undefined
    )

    // Add all NPCs to the renderer
    for (const npc of getAllNPCs()) {
      this.entityRenderer.addEntity(
        `npc_${npc.id}`, 'npc',
        npc.x, npc.y,
        npc.color, npc.accentColor,
        npc.name
      )
    }

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
    eventBus.on('mob:attack_player', ({ mobId, damage }) => {
      const p = this.playerState
      const defLevel = this.skillSystem.getSkillLevel(SkillType.Defense)
      const flatReduction = Math.floor(defLevel * 0.4)
      // Equipment DEF from shield + body
      const equipDef = this.skillSystem.getPlayerDEF()
      let reduced = Math.max(1, damage - flatReduction - equipDef)

      // Apply milestone damage reduction (Defense 30/60/70+)
      const milestoneReduction = this.skillSystem.getDamageReduction()
      reduced = Math.floor(reduced * (1 - milestoneReduction))

      // Indomitable (Vitality 60): 20% less damage below 25% HP
      const indomReduction = this.skillSystem.getIndomitableReduction()
      reduced = Math.floor(reduced * (1 - indomReduction))

      reduced = Math.max(1, reduced)
      p.hp = Math.max(0, p.hp - reduced)

      // Award Defense/Vitality XP on hit
      this.skillSystem.awardXP(SkillType.Defense, 2)
      this.skillSystem.awardXP(SkillType.Vitality, 1.5)

      // Apply status effects from mob's element
      const mob = Array.from(this.mobSpawner.mobValues()).find(m => m.id === mobId)
      if (mob && mob.element && mob.element !== Element.None) {
        const statusMap: Partial<Record<Element, StatusEffect>> = {
          [Element.Fire]: StatusEffect.Burn,
          [Element.Water]: StatusEffect.Slow,
          [Element.Shadow]: StatusEffect.Weaken,
        }
        const status = statusMap[mob.element]
        if (status && Math.random() < 0.3) {
          if (!p.playerStatusEffects) p.playerStatusEffects = []
          p.playerStatusEffects = p.playerStatusEffects.filter(s => s.type !== status)
          const power = status === StatusEffect.Burn ? 8 : 1
          p.playerStatusEffects.push({ type: status, duration: 4, power, sourceId: mob.id })
          eventBus.emit('ui:notification', {
            message: `${status} applied!`,
            type: 'danger',
          })
        }
      }

      this.entityRenderer.flash('player', 0xff2222, 200)
      this.forceEmitPlayerHP()
      if (p.hp <= 0) {
        eventBus.emit('ui:notification', { message: 'You were defeated!', type: 'danger' })
        p.hp = Math.max(1, Math.floor(p.maxHp * 0.5))
        p.x = 16; p.y = 16
        p.playerStatusEffects = []
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
    this.spellSystem.update(dt)

    this.playerAttackCooldown = Math.max(0, this.playerAttackCooldown - dt)
    this.mobSpawner.update(dt, this.playerState.x, this.playerState.y)
    this.gatheringSystem.update(dt)

    // Tick mob status effects
    this.tickMobStatusEffects(dt)
    // Tick player status effects
    this.tickPlayerStatusEffects(dt)

    // Handle spell cycling (Q key)
    if (this.inputSystem.wasJustPressed('ability1')) {
      this.spellSystem.cycleSpell()
    }

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

    // Cancel gathering and dialogue when player moves
    if (move.x !== 0 || move.y !== 0) {
      if (this.gatheringSystem.isGathering) this.gatheringSystem.cancel()
      if (this.npcSystem.isInDialogue) this.npcSystem.closeDialogue()
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
    const nowSec = Date.now() / 1000

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

      // ── Pet combat AI ──────────────────────────────────────────────────────
      // Check every 3 ticks (~10 Hz) to keep overhead low
      if (this.tickCount % 3 === 0 && pet.activeAbilities.length > 0) {
        const petCx = targetX + 0.5
        const petCy = targetY + 0.5
        const nearbyMob = this.mobSpawner.getMobAt(petCx, petCy, 4.25)
        if (nearbyMob) {
          const cooldowns = this.petAbilityCooldowns.get(pet.instanceId) ?? {}
          for (const abilityId of pet.activeAbilities) {
            const ability = ABILITIES[abilityId]
            if (!ability || ability.isPassive || ability.basePower === 0) continue
            const lastUsed = cooldowns[abilityId] ?? 0
            if (nowSec - lastUsed >= ability.cooldown) {
              // Use the ability!
              cooldowns[abilityId] = nowSec
              this.petAbilityCooldowns.set(pet.instanceId, cooldowns)

              const atkStat = ability.damageType === 'Magical' ? pet.stats.matk : pet.stats.atk
              const dmg = Math.max(1, Math.floor(ability.basePower * 0.4 + atkStat * 0.6) - nearbyMob.def)
              const result = this.mobSpawner.damageMob(nearbyMob.id, dmg)

              this.entityRenderer.spawnAttackEffect(nearbyMob.x + 0.5, nearbyMob.y + 0.5)
              if (result) this.entityRenderer.flash(`mob_${nearbyMob.id}`, 0xff8800, 120)
              this.entityRenderer.showSpeechBubble(
                `pet_${pet.instanceId}`,
                `${pet.name}: ${ability.name}!`,
                2500
              )

              if (result?.state === 'dead') {
                this.onMobDied(result)
                this.petSystem.awardPetXP(pet.instanceId, 20 + nearbyMob.level * 5)
              }
              break
            }
          }
        }
      }
    })
  }

  // ─── Combat ──────────────────────────────────────────────────────────────

  private handlePlayerAttack(): void {
    if (!this.inputSystem.wasJustPressed('attack')) return
    if (this.playerAttackCooldown > 0) return

    const p = this.playerState
    const weapon = p.equipment?.weapon ? ITEM_DEFINITIONS[p.equipment.weapon] : null

    // Determine combat style and range
    const weaponStyle = weapon?.weaponStyle ?? 'melee'
    const atkRange = weapon?.atkRange ?? PLAYER_ATTACK_RANGE
    p.combatStyle = weaponStyle === 'staff' ? 'magic' : weaponStyle === 'bow' ? 'ranged' : 'melee'

    // Staff attack: cast current spell
    if (weaponStyle === 'staff') {
      this.handleStaffAttack(atkRange)
      return
    }

    // Bow attack: ranged projectile
    if (weaponStyle === 'bow') {
      this.handleBowAttack(atkRange)
      return
    }

    // Melee attack
    const mob = this.mobSpawner.getMobAt(p.x + 0.5, p.y + 0.5, atkRange)

    // Check melee combo tracker (Melee 30: Swordsman)
    const meleeLvl = this.skillSystem.getSkillLevel(SkillType.Melee)
    const now = performance.now()
    if (meleeLvl >= 30 && (now - p.lastComboTime) < 1500) {
      p.comboHitCount++
      if (p.comboHitCount >= 3) {
        // Free third hit: no cooldown
        p.comboHitCount = 0
        this.playerAttackCooldown = 0
      } else {
        this.playerAttackCooldown = PLAYER_ATTACK_COOLDOWN
      }
    } else {
      p.comboHitCount = 1
      this.playerAttackCooldown = PLAYER_ATTACK_COOLDOWN
    }
    p.lastComboTime = now

    // Blade Dancer (Melee 50): 10% chance to skip cooldown
    if (Math.random() < this.skillSystem.getBladeDanceChance()) {
      this.playerAttackCooldown = 0
    }

    // Slash effect: on mob → at mob, otherwise in front of player
    if (mob) {
      this.entityRenderer.spawnAttackEffect(mob.x + 0.5, mob.y + 0.5)
    } else {
      const dirOffsets: Record<string, { x: number; y: number }> = {
        right: { x: 1, y: 0 }, left: { x: -1, y: 0 },
        down:  { x: 0, y: 1 }, up:   { x: 0,  y: -1 },
      }
      const off = dirOffsets[this.playerDir] ?? { x: 0, y: 1 }
      this.entityRenderer.spawnAttackEffect(
        p.x + 0.5 + off.x * 1.1,
        p.y + 0.5 + off.y * 1.1,
      )
      return
    }

    // Calculate damage with equipped weapon bonus
    const weaponAtk = weapon?.statBonus?.atk ?? 0
    const damage = Math.max(1, PLAYER_ATTACK_BASE_DMG + (meleeLvl - 1) * 2 + weaponAtk - mob.def)

    const result = this.mobSpawner.damageMob(mob.id, damage)
    if (!result) return

    this.entityRenderer.flash(`mob_${mob.id}`, 0xff4444, 120)
    this.skillSystem.awardXP(SkillType.Melee, 4)

    // Knockback (Melee 20: Warrior)
    if (Math.random() < this.skillSystem.getKnockbackChance()) {
      const dx = mob.x - p.x
      const dy = mob.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        mob.x += (dx / dist)
        mob.y += (dy / dist)
      }
    }

    if (result.state === 'dead') {
      this.onMobDied(result)
    }
  }

  private handleStaffAttack(range: number): void {
    const p = this.playerState
    const spell = this.spellSystem.getCurrentSpell()
    if (!spell) {
      // Fallback: basic arcane bolt
      this.playerAttackCooldown = PLAYER_ATTACK_COOLDOWN
      return
    }

    const castResult = this.spellSystem.cast(spell.id)
    if (!castResult) {
      this.playerAttackCooldown = 0.3
      return
    }

    this.playerAttackCooldown = castResult.cooldown

    // Find target within spell range
    const mob = this.mobSpawner.getMobAt(p.x + 0.5, p.y + 0.5, castResult.range)
    if (!mob) {
      const dirOffsets: Record<string, { x: number; y: number }> = {
        right: { x: 1, y: 0 }, left: { x: -1, y: 0 },
        down:  { x: 0, y: 1 }, up:   { x: 0,  y: -1 },
      }
      const off = dirOffsets[this.playerDir] ?? { x: 0, y: 1 }
      this.entityRenderer.spawnAttackEffect(
        p.x + 0.5 + off.x * castResult.range * 0.5,
        p.y + 0.5 + off.y * castResult.range * 0.5,
      )
      return
    }

    const damage = this.spellSystem.calculateDamage(castResult)
    const defStat = mob.mdef ?? mob.def
    const finalDmg = Math.max(1, damage - Math.floor(defStat * 0.3))
    const result = this.mobSpawner.damageMob(mob.id, finalDmg)

    this.entityRenderer.spawnAttackEffect(mob.x + 0.5, mob.y + 0.5)
    if (result) this.entityRenderer.flash(`mob_${mob.id}`, 0x8844ff, 120)

    // Apply element to target (for combo reactions)
    if (castResult.element !== Element.None) {
      this.combatSystem.applyElement(mob.id, castResult.element, 'player', { x: mob.x, y: mob.y })
    }

    // Apply status effect
    if (castResult.statusEffect && Math.random() < (castResult.statusChance ?? 0)) {
      const power = castResult.statusEffect === StatusEffect.Burn ? 8 : 1
      this.statusEffectSystem.applyToMob(mob, castResult.statusEffect, castResult.statusDuration ?? 3, power, 'player')
    }

    // AoE damage
    if (castResult.aoeRadius > 0) {
      for (const aoeMob of this.mobSpawner.allMobs) {
        if (aoeMob.id === mob.id || aoeMob.state === 'dead') continue
        const dist = Math.sqrt((aoeMob.x - mob.x) ** 2 + (aoeMob.y - mob.y) ** 2)
        if (dist <= castResult.aoeRadius) {
          const aoeDmg = Math.max(1, Math.floor(finalDmg * 0.6))
          this.mobSpawner.damageMob(aoeMob.id, aoeDmg)
        }
      }
    }

    if (result?.state === 'dead') {
      this.onMobDied(result)
    }
  }

  private handleBowAttack(range: number): void {
    const p = this.playerState
    const weapon = p.equipment?.weapon ? ITEM_DEFINITIONS[p.equipment.weapon] : null

    // Check ammo
    const isXbow = weapon?.id === 'crossbow'
    const ammoId = isXbow ? 'crossbow_bolt' : 'feather'
    const ammoItem = p.inventory.find(i => i.itemId === ammoId)
    if (!ammoItem || ammoItem.quantity <= 0) {
      eventBus.emit('ui:notification', { message: `No ${isXbow ? 'bolts' : 'feathers'}!`, type: 'warning' })
      this.playerAttackCooldown = 0.3
      return
    }

    // Consume ammo
    ammoItem.quantity--
    if (ammoItem.quantity <= 0) {
      const idx = p.inventory.indexOf(ammoItem)
      if (idx !== -1) p.inventory.splice(idx, 1)
    }

    this.playerAttackCooldown = PLAYER_ATTACK_COOLDOWN

    const mob = this.mobSpawner.getMobAt(p.x + 0.5, p.y + 0.5, range)
    if (!mob) {
      const dirOffsets: Record<string, { x: number; y: number }> = {
        right: { x: 1, y: 0 }, left: { x: -1, y: 0 },
        down:  { x: 0, y: 1 }, up:   { x: 0,  y: -1 },
      }
      const off = dirOffsets[this.playerDir] ?? { x: 0, y: 1 }
      this.entityRenderer.spawnAttackEffect(
        p.x + 0.5 + off.x * range * 0.5,
        p.y + 0.5 + off.y * range * 0.5,
      )
      return
    }

    const rangedLvl = this.skillSystem.getSkillLevel(SkillType.Ranged)
    const weaponAtk = weapon?.statBonus?.atk ?? 0
    let baseDmg = Math.max(1, 8 + (rangedLvl - 1) * 2 + weaponAtk - mob.def)

    // Distance bonus (Ranged 50: Sniper)
    const dist = Math.sqrt((mob.x - p.x) ** 2 + (mob.y - p.y) ** 2)
    baseDmg = Math.floor(baseDmg * (1 + this.skillSystem.getRangedDamageBonus(dist)))

    // Headshot (Ranged 30: Sharpshooter)
    if (Math.random() < this.skillSystem.getHeadshotChance()) {
      baseDmg = Math.floor(baseDmg * 1.5)
      eventBus.emit('ui:notification', { message: 'Headshot!', type: 'success' })
    }

    const result = this.mobSpawner.damageMob(mob.id, baseDmg)
    this.entityRenderer.spawnAttackEffect(mob.x + 0.5, mob.y + 0.5)
    if (result) this.entityRenderer.flash(`mob_${mob.id}`, 0x44ff44, 120)
    this.skillSystem.awardXP(SkillType.Ranged, 4)

    if (result?.state === 'dead') {
      this.onMobDied(result)
    }
  }

  // ─── Interaction ─────────────────────────────────────────────────────────

  private handleInteract(): void {
    if (!this.inputSystem.wasJustPressed('interact')) return

    const p = this.playerState

    // Ignore interact while gathering — only movement cancels it
    if (this.gatheringSystem.isGathering) {
      return
    }

    // If in dialogue, pass through to NPC system choice handling (handled by UI)
    if (this.npcSystem.isInDialogue) {
      return
    }

    // Priority 0: dungeon entry/exit
    const chunk = this.chunkSystem.getChunkAt(Math.floor(p.x), Math.floor(p.y))
    if (chunk.dungeonData && !p.currentDungeon) {
      // Check if standing on entrance room area
      const lx = ((Math.floor(p.x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
      const ly = ((Math.floor(p.y) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
      const entranceRoom = chunk.dungeonData.rooms.find(r => r.type === 'entrance')
      if (entranceRoom && lx >= entranceRoom.x && lx < entranceRoom.x + entranceRoom.w &&
          ly >= entranceRoom.y && ly < entranceRoom.y + entranceRoom.h) {
        this.enterDungeon(`${chunk.cx}_${chunk.cy}`)
        return
      }
    } else if (p.currentDungeon) {
      // Check if at entrance to exit
      const [dcxStr, dcyStr] = p.currentDungeon.split('_')
      const dchunk = this.chunkSystem.getChunk(parseInt(dcxStr), parseInt(dcyStr))
      if (dchunk.dungeonData) {
        const lx = ((Math.floor(p.x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
        const ly = ((Math.floor(p.y) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
        const entranceRoom = dchunk.dungeonData.rooms.find(r => r.type === 'entrance')
        if (entranceRoom && lx >= entranceRoom.x && lx < entranceRoom.x + 2 &&
            ly >= entranceRoom.y && ly < entranceRoom.y + 2) {
          this.exitDungeon()
          return
        }
      }
    }

    // Priority 0.5: interact with nearby NPC
    const nearbyNPC = this.npcSystem.findNearbyNPC()
    if (nearbyNPC) {
      this.npcSystem.interact(nearbyNPC.id)
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
        // Mark tamed in bestiary
        const bEntry = this.playerState.bestiary[tameTarget.mobId]
        if (bEntry) bEntry.tamed = true
        else this.playerState.bestiary[tameTarget.mobId] = { kills: 0, tamed: true }
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

    // Check dungeon entrance
    const chunk = this.chunkSystem.getChunkAt(Math.floor(p.x), Math.floor(p.y))
    if (chunk.dungeonData && !p.currentDungeon) {
      const lx = ((Math.floor(p.x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
      const ly = ((Math.floor(p.y) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
      const entranceRoom = chunk.dungeonData.rooms.find(r => r.type === 'entrance')
      if (entranceRoom && lx >= entranceRoom.x && lx < entranceRoom.x + entranceRoom.w &&
          ly >= entranceRoom.y && ly < entranceRoom.y + entranceRoom.h) {
        const label = `Enter Dungeon (Tier ${chunk.dungeonData.tier})`
        if (label !== this.lastInteractLabel) {
          this.lastInteractLabel = label
          eventBus.emit('interact:nearby', { label })
        }
        return
      }
    }

    // Check nearby NPC
    const npcLabel = this.npcSystem.getNearbyLabel()
    if (npcLabel) {
      const label = npcLabel
      if (label !== this.lastInteractLabel) {
        this.lastInteractLabel = label
        eventBus.emit('interact:nearby', { label })
      }
      return
    }

    const tameTarget = this.mobSpawner.getTameableMobNearby(p.x + 0.5, p.y + 0.5, INTERACT_RANGE)
    if (tameTarget) {
      const def = MOB_DEFINITIONS[tameTarget.mobId]
      const label = `Tame ${def?.name ?? tameTarget.mobId}`
      if (label !== this.lastInteractLabel) {
        this.lastInteractLabel = label
        eventBus.emit('interact:nearby', { label })
      }
      return
    }

    const nodeResult = this.findNearbyNode()
    if (nodeResult) {
      const typeLabel = nodeResult.node.type.replace(/([A-Z])/g, ' $1').trim()
      const label = `Gather ${typeLabel}`
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

    let bestDist = Infinity
    let bestResult: { node: ResourceNodeState; chunkKey: string } | null = null

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this.chunkSystem.getChunk(cx + dx, cy + dy)
        for (const node of chunk.resourceNodes) {
          if (node.depleted) continue
          const wx = chunk.cx * CHUNK_SIZE + node.localX
          const wy = chunk.cy * CHUNK_SIZE + node.localY
          const dist = Math.sqrt((wx - p.x - 0.5) ** 2 + (wy - p.y - 0.5) ** 2)
          if (dist <= INTERACT_RANGE && dist < bestDist) {
            bestDist = dist
            bestResult = { node, chunkKey: `${chunk.cx}_${chunk.cy}` }
          }
        }
      }
    }
    return bestResult
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
        def?.name ?? mob.mobId,
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

    // Update bestiary
    const entry = this.playerState.bestiary[mob.mobId]
    if (entry) {
      entry.kills++
    } else {
      this.playerState.bestiary[mob.mobId] = { kills: 1, tamed: false }
    }

    for (const drop of def.drops) {
      if (Math.random() < drop.chance) {
        const qty = drop.minQty + Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1))
        this.addToInventory(drop.itemId, qty)
      }
    }

    // Boss drops guaranteed equipment
    if (mob.isBoss) {
      const bossLoot = ['iron_sword', 'iron_shield', 'leather_chaps', 'iron_chainmail']
      const lootId = bossLoot[Math.floor(Math.random() * bossLoot.length)]
      this.addToInventory(lootId, 1)
      eventBus.emit('ui:notification', { message: `Boss dropped: ${ITEM_DEFINITIONS[lootId]?.name}!`, type: 'success' })

      // Notify dungeon clear
      if (this.playerState.currentDungeon) {
        const [dcxStr, dcyStr] = this.playerState.currentDungeon.split('_')
        const dchunk = this.chunkSystem.getChunk(parseInt(dcxStr), parseInt(dcyStr))
        this.onDungeonBossKilled(dchunk.dungeonData?.tier ?? 1)
      }
    }

    const xp = 10 + mob.level * 5
    // Award XP to the active combat style
    const p = this.playerState
    if (p.combatStyle === 'magic') {
      this.skillSystem.awardXP(SkillType.Magic, xp)
    } else if (p.combatStyle === 'ranged') {
      this.skillSystem.awardXP(SkillType.Ranged, xp)
    } else {
      this.skillSystem.awardXP(SkillType.Melee, xp)
    }

    eventBus.emit('mob:died', { mobId: mob.id, x: mob.x, y: mob.y })
    eventBus.emit('ui:notification', { message: `Defeated ${mob.bossName ?? def.name}!`, type: 'info' })
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
      // Track discovered chunks for world map
      if (!this.playerState.discoveredChunks.includes(key)) {
        this.playerState.discoveredChunks.push(key)
      }
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

  // ─── Status Effect Ticking ───────────────────────────────────────────────

  private tickMobStatusEffects(dt: number): void {
    for (const mob of this.mobSpawner.mobValues()) {
      if (mob.state === 'dead') continue
      const burnDmg = this.statusEffectSystem.tickMob(mob, dt)
      if (burnDmg > 0) {
        const result = this.mobSpawner.damageMob(mob.id, burnDmg)
        if (result) {
          this.entityRenderer.flash(`mob_${mob.id}`, 0xff6600, 100)
          if (result.state === 'dead') this.onMobDied(result)
        }
      }
      // Apply speed modifier to mob movement
      const spdMult = this.statusEffectSystem.getSpeedMultiplier(mob)
      if (spdMult === 0) mob.state = 'wander' // Stunned
    }
  }

  private tickPlayerStatusEffects(dt: number): void {
    const p = this.playerState
    if (!p.playerStatusEffects || p.playerStatusEffects.length === 0) return

    p.playerStatusEffects = p.playerStatusEffects.filter(effect => {
      effect.duration -= dt
      if (effect.type === StatusEffect.Burn) {
        const dmg = Math.floor(effect.power * dt)
        if (dmg > 0) {
          p.hp = Math.max(0, p.hp - dmg)
          this.entityRenderer.flash('player', 0xff4400, 80)
          this.forceEmitPlayerHP()
        }
      }
      return effect.duration > 0
    })
  }

  // ─── Equipment ─────────────────────────────────────────────────────────

  equipItem(itemId: string): { success: boolean; message: string } {
    const def = ITEM_DEFINITIONS[itemId]
    if (!def || !def.equipSlot) return { success: false, message: 'Cannot equip this item' }

    // Check skill requirement
    if (def.skillReq && !this.skillSystem.meetsRequirement(def.skillReq.skill, def.skillReq.level)) {
      return { success: false, message: `Need ${def.skillReq.skill} level ${def.skillReq.level}` }
    }

    // Check if player has the item
    const invItem = this.playerState.inventory.find(i => i.itemId === itemId)
    if (!invItem) return { success: false, message: 'Item not in inventory' }

    // Unequip current item in that slot
    const slot = def.equipSlot
    const currentEquipped = this.playerState.equipment[slot]
    if (currentEquipped) {
      this.addToInventory(currentEquipped, 1)
    }

    // Remove from inventory
    invItem.quantity--
    if (invItem.quantity <= 0) {
      const idx = this.playerState.inventory.indexOf(invItem)
      if (idx !== -1) this.playerState.inventory.splice(idx, 1)
    }

    // Equip
    this.playerState.equipment[slot] = itemId

    // Update combat style
    if (slot === 'weapon') {
      this.playerState.combatStyle = def.weaponStyle === 'staff' ? 'magic' : def.weaponStyle === 'bow' ? 'ranged' : 'melee'
    }

    eventBus.emit('ui:notification', { message: `Equipped ${def.name}!`, type: 'success' })
    return { success: true, message: `Equipped ${def.name}` }
  }

  unequipItem(slot: 'weapon' | 'offhand' | 'body'): { success: boolean; message: string } {
    const itemId = this.playerState.equipment[slot]
    if (!itemId) return { success: false, message: 'Nothing equipped' }

    this.playerState.equipment[slot] = null
    this.addToInventory(itemId, 1)

    if (slot === 'weapon') this.playerState.combatStyle = 'melee'

    const def = ITEM_DEFINITIONS[itemId]
    eventBus.emit('ui:notification', { message: `Unequipped ${def?.name ?? itemId}`, type: 'info' })
    return { success: true, message: `Unequipped ${def?.name ?? itemId}` }
  }

  // ─── Dungeon Entry/Exit ────────────────────────────────────────────────

  enterDungeon(chunkKey: string): void {
    this.playerState.currentDungeon = chunkKey
    const [cxStr, cyStr] = chunkKey.split('_')
    const cx = parseInt(cxStr), cy = parseInt(cyStr)
    const chunk = this.chunkSystem.getChunk(cx, cy)
    const tier = chunk.dungeonData?.tier ?? 1
    eventBus.emit('world:dungeon_entered', { tier })
    eventBus.emit('ui:notification', { message: `Entered dungeon (Tier ${tier})`, type: 'warning' })
  }

  exitDungeon(): void {
    this.playerState.currentDungeon = null
    eventBus.emit('ui:notification', { message: 'Exited dungeon', type: 'info' })
  }

  onDungeonBossKilled(tier: number): void {
    const activePetDefIds = this.petSystem.activePets.map(p => p.definitionId)
    this.questSystem.onDungeonCleared(tier, activePetDefIds)
    eventBus.emit('world:dungeon_cleared', {})
    eventBus.emit('ui:notification', { message: `Dungeon cleared! (Tier ${tier})`, type: 'success' })
  }

  // ─── Render (interpolated) ───────────────────────────────────────────────

  private render(alpha: number): void {
    const p = this.playerState

    // Interpolate camera between the previous and current tick positions so the
    // background scrolls at the same rate as the player sprite — eliminates stutter.
    const camX =  this.prevPlayerX + (p.x - this.prevPlayerX) * alpha + 0.5
    const camY = -(this.prevPlayerY + (p.y - this.prevPlayerY) * alpha + 0.5)
    this.sceneRenderer.setCameraPosition(camX, camY)

    // Build/repaint at most 4 chunks per frame — 16×16 chunks are 4× cheaper so
    // we can process more per frame without stalling the main thread.
    this.chunkRenderer.processPending(4)

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

  // ─── NPC Dialogue ───────────────────────────────────────────────────────

  /** Handle a dialogue choice from the UI. Returns true if dialogue is still open. */
  handleDialogueChoice(choiceIndex: number): boolean {
    const result = this.npcSystem.chooseOption(choiceIndex)
    if (result?.action === 'open_shop') {
      eventBus.emit('shop:open', {})
    }
    if (result?.action === 'start_quest') {
      const npcId = this.npcSystem.currentNPCId
      if (npcId) {
        const npc = NPC_DEFINITIONS[npcId]
        if (npc?.questIds) {
          for (const qId of npc.questIds) {
            if (this.questSystem.startQuest(qId)) break  // start the first available quest
          }
        }
      }
      // Emit talk_to_npc for quest objectives
      if (npcId) {
        this.questSystem.updateProgress('talk_to_npc', npcId, 1)
      }
    }
    return this.npcSystem.isInDialogue
  }

  // ─── Shop ─────────────────────────────────────────────────────────────────

  /** Buy one unit of an item from the shop. Returns result for UI feedback. */
  buyItem(itemId: string): { success: boolean; message: string } {
    const listing = SHOP_BUY_ITEMS.find(i => i.id === itemId)
    if (!listing) return { success: false, message: 'Item not available' }
    if (this.playerState.gold < listing.price) return { success: false, message: 'Not enough gold!' }

    this.playerState.gold -= listing.price
    const def = ITEM_DEFINITIONS[itemId]
    const existing = this.playerState.inventory.find(i => i.itemId === itemId)
    if (existing && def?.stackable) {
      existing.quantity += 1
    } else {
      this.playerState.inventory.push({
        itemId,
        quantity: 1,
        slotIndex: this.playerState.inventory.length,
      })
    }
    eventBus.emit('player:gold_changed', { amount: 0, total: this.playerState.gold })
    return { success: true, message: `Bought ${def?.name ?? itemId}! -${listing.price}G` }
  }

  /** Sell all of an inventory slot back to the shop. Returns result for UI feedback. */
  sellItem(slotIndex: number): { success: boolean; message: string } {
    const idx = this.playerState.inventory.findIndex(i => i.slotIndex === slotIndex)
    if (idx === -1) return { success: false, message: 'No item in slot' }
    const slot = this.playerState.inventory[idx]
    const def = ITEM_DEFINITIONS[slot.itemId]
    if (!def) return { success: false, message: 'Unknown item' }

    const earned = Math.max(1, Math.floor(def.value * SELL_RATIO)) * slot.quantity
    this.playerState.gold += earned
    this.playerState.inventory.splice(idx, 1)
    eventBus.emit('player:gold_changed', { amount: 0, total: this.playerState.gold })
    return { success: true, message: `Sold for +${earned}G` }
  }

  /** Derived combat/progression stats for the HUD. */
  getComputedStats(): { atk: number; def: number; maxHp: number; maxEnergy: number } {
    return {
      atk:       this.skillSystem.getPlayerATK(),
      def:       this.skillSystem.getPlayerDEF(),
      maxHp:     this.playerState.maxHp,
      maxEnergy: this.playerState.maxEnergy,
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
    titan_golem:    '#5a5a4a',
    thunder_roc:    '#e8d020',
    phantom_wolf:   '#4a2a7a',
  }
  return colors[defId] ?? '#888888'
}
