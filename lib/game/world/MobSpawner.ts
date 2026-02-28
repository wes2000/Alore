import { MobInstance, BiomeType, DungeonData } from '../data/types'
import { MOB_DEFINITIONS } from '../data/mobs'
import { BIOME_DEFINITIONS } from '../data/biomes'
import { SeededRandom, chunkSeed } from './noise'
import { CHUNK_SIZE } from './BiomeMap'
import { eventBus } from '../engine/EventBus'

const MAX_MOBS_PER_CHUNK = 2   // reduced from 4 — halves entity count and draw calls
const CHASE_RANGE   = 6     // tiles: mob starts chasing player
const ATTACK_RANGE  = 1.3   // tiles: mob attacks player
const WANDER_SPEED  = 1.6   // tiles/second when wandering
const WANDER_INTERVAL = [2, 5] as const  // seconds between direction picks
const ATTACK_COOLDOWN = 1.5 // seconds between mob attacks

// Biomes where mobs should not spawn (water tiles player can't walk)
const SKIP_BIOMES = new Set<BiomeType>([BiomeType.ShallowWater, BiomeType.DeepWater])

function weightedPick<T extends { weight: number }>(table: T[], rng: SeededRandom): T {
  let total = table.reduce((s, e) => s + e.weight, 0)
  let r = rng.next() * total
  for (const e of table) { r -= e.weight; if (r <= 0) return e }
  return table[table.length - 1]
}

let _nextId = 0

export class MobSpawner {
  private mobs = new Map<string, MobInstance>()
  private chunkMobs = new Map<string, string[]>()  // chunkKey → mobIds
  private worldSeed: number

  constructor(worldSeed: number) {
    this.worldSeed = worldSeed
  }

  /** Iterate live mob instances without allocating a new Array. Use this in hot paths. */
  mobValues(): IterableIterator<MobInstance> {
    return this.mobs.values()
  }

  get allMobs(): MobInstance[] {
    return Array.from(this.mobs.values())
  }

  /** Spawn mobs for a chunk (idempotent — skips already-spawned chunks). */
  spawnForChunk(cx: number, cy: number, biome: BiomeType): void {
    const key = `${cx}_${cy}`
    if (this.chunkMobs.has(key)) return
    if (SKIP_BIOMES.has(biome)) { this.chunkMobs.set(key, []); return }

    const table = BIOME_DEFINITIONS[biome].mobSpawnTable
    if (table.length === 0) { this.chunkMobs.set(key, []); return }

    const rng = new SeededRandom(chunkSeed(this.worldSeed ^ 0xbabe1234, cx, cy))
    const count = 1 + Math.floor(rng.next() * MAX_MOBS_PER_CHUNK)
    const ids: string[] = []

    for (let i = 0; i < count; i++) {
      const entry = weightedPick(table, rng)
      const def = MOB_DEFINITIONS[entry.mobId]
      if (!def) continue

      const level = entry.minLevel + Math.floor(rng.next() * (entry.maxLevel - entry.minLevel + 1))
      // Place within chunk, 3-tile border from edges
      const x = cx * CHUNK_SIZE + 3 + rng.next() * (CHUNK_SIZE - 6)
      const y = cy * CHUNK_SIZE + 3 + rng.next() * (CHUNK_SIZE - 6)

      const hp  = Math.round(def.baseHp  + def.hpPerLevel  * (level - 1))
      const atk = Math.round(def.baseAtk + def.atkPerLevel * (level - 1))

      const mob: MobInstance = {
        id: `mob_${_nextId++}`,
        mobId: entry.mobId,
        petDefId: def.petDefId,
        x, y,
        hp, maxHp: hp,
        level,
        element: def.element,
        chunkKey: key,
        state: 'wander',
        wanderTargetX: x,
        wanderTargetY: y,
        wanderTimer: rng.next() * WANDER_INTERVAL[1],
        attackCooldown: ATTACK_COOLDOWN * rng.next(),
        spd: def.baseSpd,
        atk,
        def: Math.round(level * 0.4),
        mdef: Math.round(level * 0.3),
        tameable: def.tameable,
        statusEffects: [],
        isDungeonMob: false,
        isBoss: false,
      }
      this.mobs.set(mob.id, mob)
      ids.push(mob.id)
    }

    this.chunkMobs.set(key, ids)
  }

  /** Spawn dungeon-specific mobs in a chunk with dungeon data */
  spawnDungeonMobs(cx: number, cy: number, biome: BiomeType, dungeonData: import('../data/types').DungeonData): void {
    const key = `${cx}_${cy}`
    if (this.chunkMobs.has(key)) return

    const table = BIOME_DEFINITIONS[biome].mobSpawnTable
    if (table.length === 0) { this.chunkMobs.set(key, []); return }

    const rng = new SeededRandom(chunkSeed(this.worldSeed ^ 0xdead1234, cx, cy))
    const ids: string[] = []

    for (const room of dungeonData.rooms) {
      if (room.type === 'entrance') continue

      const roomCenterX = cx * CHUNK_SIZE + room.x + room.w / 2
      const roomCenterY = cy * CHUNK_SIZE + room.y + room.h / 2

      if (room.type === 'boss') {
        // Boss mob: pick strongest mob, 3x HP
        const entry = table[table.length - 1] // highest-tier mob
        const def = MOB_DEFINITIONS[entry.mobId]
        if (!def) continue
        const level = entry.maxLevel + dungeonData.tier * 5
        const hp = Math.round((def.baseHp + def.hpPerLevel * (level - 1)) * 3)
        const atk = Math.round((def.baseAtk + def.atkPerLevel * (level - 1)) * 1.5)

        const mob: MobInstance = {
          id: `mob_${_nextId++}`, mobId: entry.mobId, petDefId: '',
          x: roomCenterX, y: roomCenterY,
          hp, maxHp: hp, level, element: def.element, chunkKey: key,
          state: 'wander', wanderTargetX: roomCenterX, wanderTargetY: roomCenterY,
          wanderTimer: 3, attackCooldown: 1, spd: def.baseSpd * 0.8,
          atk, def: Math.round(level * 0.8), mdef: Math.round(level * 0.6),
          tameable: false, statusEffects: [], isDungeonMob: true, isBoss: true,
          bossName: `${def.name} Lord (Tier ${dungeonData.tier})`,
        }
        this.mobs.set(mob.id, mob)
        ids.push(mob.id)
      } else if (room.type === 'pet_lair') {
        // Spawn a tameable pet in pet lairs
        const tameableEntries = table.filter(e => MOB_DEFINITIONS[e.mobId]?.tameable)
        if (tameableEntries.length > 0) {
          const entry = tameableEntries[Math.floor(rng.next() * tameableEntries.length)]
          const def = MOB_DEFINITIONS[entry.mobId]
          if (def) {
            const level = entry.maxLevel + dungeonData.tier * 2
            const hp = Math.round(def.baseHp + def.hpPerLevel * (level - 1))
            const atk = Math.round(def.baseAtk + def.atkPerLevel * (level - 1))
            const mob: MobInstance = {
              id: `mob_${_nextId++}`, mobId: entry.mobId, petDefId: def.petDefId,
              x: roomCenterX, y: roomCenterY,
              hp, maxHp: hp, level, element: def.element, chunkKey: key,
              state: 'wander', wanderTargetX: roomCenterX, wanderTargetY: roomCenterY,
              wanderTimer: 2, attackCooldown: 1, spd: def.baseSpd,
              atk, def: Math.round(level * 0.4), mdef: Math.round(level * 0.3),
              tameable: true, statusEffects: [], isDungeonMob: true, isBoss: false,
            }
            this.mobs.set(mob.id, mob)
            ids.push(mob.id)
          }
        }
      } else if (room.type === 'normal') {
        // Normal room: 1-2 mobs
        const count = 1 + Math.floor(rng.next() * 2)
        for (let i = 0; i < count; i++) {
          const entry = weightedPick(table, rng)
          const def = MOB_DEFINITIONS[entry.mobId]
          if (!def) continue
          const level = entry.minLevel + dungeonData.tier * 3 + Math.floor(rng.next() * 5)
          const hp = Math.round(def.baseHp + def.hpPerLevel * (level - 1))
          const atk = Math.round(def.baseAtk + def.atkPerLevel * (level - 1))
          const x = roomCenterX + (rng.next() - 0.5) * (room.w - 2)
          const y = roomCenterY + (rng.next() - 0.5) * (room.h - 2)
          const mob: MobInstance = {
            id: `mob_${_nextId++}`, mobId: entry.mobId, petDefId: def.petDefId,
            x, y, hp, maxHp: hp, level, element: def.element, chunkKey: key,
            state: 'wander', wanderTargetX: x, wanderTargetY: y,
            wanderTimer: rng.next() * 3, attackCooldown: rng.next() * 1.5,
            spd: def.baseSpd, atk, def: Math.round(level * 0.4), mdef: Math.round(level * 0.3),
            tameable: def.tameable, statusEffects: [], isDungeonMob: true, isBoss: false,
          }
          this.mobs.set(mob.id, mob)
          ids.push(mob.id)
        }
      }
    }
    this.chunkMobs.set(key, ids)
  }

  /** Remove all mobs belonging to a chunk. */
  despawnChunk(chunkKey: string): void {
    const ids = this.chunkMobs.get(chunkKey) ?? []
    for (const id of ids) this.mobs.delete(id)
    this.chunkMobs.delete(chunkKey)
  }

  // Squared distance threshold — skip full AI beyond this range (18 tiles)
  private static readonly AI_CULL_DIST2 = 18 * 18

  /** Tick all mob AI. */
  update(dt: number, playerX: number, playerY: number): void {
    for (const mob of this.mobs.values()) {
      if (mob.state === 'dead') continue
      // Skip AI for mobs far from the player — they can't see or reach the player anyway
      const dx = playerX - mob.x
      const dy = playerY - mob.y
      if (dx * dx + dy * dy > MobSpawner.AI_CULL_DIST2) {
        mob.state = 'wander'  // reset chase if they wandered out of range
        continue
      }
      this.updateMob(mob, dt, playerX, playerY)
    }
  }

  private updateMob(mob: MobInstance, dt: number, px: number, py: number): void {
    const dx = px - mob.x
    const dy = py - mob.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // ── State transitions ──────────────────────────────────────────────────
    if (dist <= CHASE_RANGE) {
      mob.state = 'chase'
    } else if (mob.state === 'chase') {
      mob.state = 'wander'
    }

    // ── Chase AI ──────────────────────────────────────────────────────────
    if (mob.state === 'chase') {
      if (dist > ATTACK_RANGE) {
        const spd = mob.spd * dt
        mob.x += (dx / dist) * spd
        mob.y += (dy / dist) * spd
      }
      // Attack
      mob.attackCooldown -= dt
      if (dist <= ATTACK_RANGE && mob.attackCooldown <= 0) {
        mob.attackCooldown = ATTACK_COOLDOWN
        eventBus.emit('mob:attack_player', { mobId: mob.id, damage: mob.atk })
      }
      return
    }

    // ── Wander AI ─────────────────────────────────────────────────────────
    mob.wanderTimer -= dt
    if (mob.wanderTimer <= 0) {
      mob.wanderTimer = WANDER_INTERVAL[0] + Math.random() * (WANDER_INTERVAL[1] - WANDER_INTERVAL[0])
      const angle = Math.random() * Math.PI * 2
      const range = 2 + Math.random() * 4
      mob.wanderTargetX = mob.x + Math.cos(angle) * range
      mob.wanderTargetY = mob.y + Math.sin(angle) * range
    }
    const tdx = mob.wanderTargetX - mob.x
    const tdy = mob.wanderTargetY - mob.y
    const tdist = Math.sqrt(tdx * tdx + tdy * tdy)
    if (tdist > 0.4) {
      const spd = WANDER_SPEED * dt
      mob.x += (tdx / tdist) * spd
      mob.y += (tdy / tdist) * spd
    }
  }

  /** Deal damage to a mob. Returns the mob (or null if not found / already dead). */
  damageMob(mobId: string, amount: number): MobInstance | null {
    const mob = this.mobs.get(mobId)
    if (!mob || mob.state === 'dead') return null
    mob.hp = Math.max(0, mob.hp - amount)
    if (mob.hp <= 0) mob.state = 'dead'
    return mob
  }

  /** Returns the closest alive mob within `radius` tiles of (x, y). */
  getMobAt(x: number, y: number, radius: number): MobInstance | null {
    let closest: MobInstance | null = null
    let closestDist = radius
    for (const mob of this.mobs.values()) {
      if (mob.state === 'dead') continue
      const dist = Math.sqrt((mob.x - x) ** 2 + (mob.y - y) ** 2)
      if (dist < closestDist) { closestDist = dist; closest = mob }
    }
    return closest
  }

  /** Returns a tameable mob below 35% HP within `radius` tiles. */
  getTameableMobNearby(x: number, y: number, radius: number): MobInstance | null {
    for (const mob of this.mobs.values()) {
      if (mob.state === 'dead' || !mob.tameable) continue
      if (mob.hp / mob.maxHp > 0.35) continue
      const dist = Math.sqrt((mob.x - x) ** 2 + (mob.y - y) ** 2)
      if (dist <= radius) return mob
    }
    return null
  }

  /** Purge dead mobs from the map. Call once per update cycle. */
  removeDead(): void {
    for (const [id, mob] of this.mobs) {
      if (mob.state === 'dead') this.mobs.delete(id)
    }
  }
}
