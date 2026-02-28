import { ChunkState } from '../data/types'
import { WorldNoise, chunkSeed } from './noise'
import { generateChunk, CHUNK_SIZE } from './BiomeMap'
import { generateDungeon, getDungeonTier } from './DungeonGenerator'
import { SeededRandom } from './noise'

const DUNGEON_CHUNK_CHANCE = 0.04   // 4% of far-away chunks become dungeons
const LOAD_RADIUS = 3               // chunks around player to keep loaded
const MAX_CACHED_CHUNKS = 200       // LRU eviction limit

export class ChunkSystem {
  private chunks = new Map<string, ChunkState>()
  // Insertion-ordered Map used as LRU: delete+re-insert = O(1) touch, first key = oldest
  private lruOrder = new Map<string, true>()
  private worldSeed: number
  private noise: WorldNoise

  // Modified chunk keys that need persisting to DB
  private dirtyChunks = new Set<string>()

  constructor(worldSeed: number) {
    this.worldSeed = worldSeed
    this.noise = new WorldNoise(worldSeed)
  }

  private key(cx: number, cy: number): string {
    return `${cx}_${cy}`
  }

  getChunk(cx: number, cy: number): ChunkState {
    const k = this.key(cx, cy)
    if (this.chunks.has(k)) {
      this.touch(k)
      return this.chunks.get(k)!
    }
    return this.loadChunk(cx, cy)
  }

  private loadChunk(cx: number, cy: number): ChunkState {
    const k = this.key(cx, cy)
    const chunk = generateChunk(cx, cy, this.worldSeed, this.noise)

    // Check if this chunk should be a dungeon
    if (this.shouldBeDungeon(cx, cy)) {
      const tier = getDungeonTier(cx, cy)
      chunk.dungeonData = generateDungeon(chunkSeed(this.worldSeed, cx, cy), tier)
    }

    this.chunks.set(k, chunk)
    this.touch(k)
    this.evictIfNeeded()
    return chunk
  }

  private shouldBeDungeon(cx: number, cy: number): boolean {
    // Spawn area (within 5 chunks) never has dungeons
    if (Math.abs(cx) <= 5 && Math.abs(cy) <= 5) return false
    const rng = new SeededRandom(chunkSeed(this.worldSeed, cx ^ 0xdeadbeef, cy ^ 0xcafebabe))
    return rng.next() < DUNGEON_CHUNK_CHANCE
  }

  private touch(k: string): void {
    // Delete + re-insert keeps insertion order correct — O(1) in V8
    this.lruOrder.delete(k)
    this.lruOrder.set(k, true)
  }

  private evictIfNeeded(): void {
    while (this.lruOrder.size > MAX_CACHED_CHUNKS) {
      const oldest = this.lruOrder.keys().next().value!
      // Don't evict dirty chunks; move them to end and stop trying
      if (this.dirtyChunks.has(oldest)) {
        this.lruOrder.delete(oldest)
        this.lruOrder.set(oldest, true)
        break
      }
      this.chunks.delete(oldest)
      this.lruOrder.delete(oldest)
    }
  }

  /** Mark a chunk as modified (resource depleted, etc.) */
  markDirty(cx: number, cy: number): void {
    this.dirtyChunks.add(this.key(cx, cy))
  }

  /** Get and clear dirty chunk keys for persistence */
  consumeDirtyChunks(): ChunkState[] {
    const result: ChunkState[] = []
    for (const k of this.dirtyChunks) {
      const chunk = this.chunks.get(k)
      if (chunk) result.push(chunk)
    }
    this.dirtyChunks.clear()
    return result
  }

  /** Preload chunks in a radius around a world position */
  preloadAround(worldX: number, worldY: number, radius = LOAD_RADIUS): void {
    const cx = Math.floor(worldX / CHUNK_SIZE)
    const cy = Math.floor(worldY / CHUNK_SIZE)
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.getChunk(cx + dx, cy + dy)
      }
    }
  }

  /** Get the chunk that contains a world-space tile position */
  getChunkAt(worldX: number, worldY: number): ChunkState {
    const cx = Math.floor(worldX / CHUNK_SIZE)
    const cy = Math.floor(worldY / CHUNK_SIZE)
    return this.getChunk(cx, cy)
  }

  /** Get the tile type at a world-space position */
  getTileAt(worldX: number, worldY: number): number {
    const cx = Math.floor(worldX / CHUNK_SIZE)
    const cy = Math.floor(worldY / CHUNK_SIZE)
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    const localY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    const chunk = this.getChunk(cx, cy)
    return chunk.tiles[localY]?.[localX] ?? 0
  }

  /** Restore chunk states from saved data (DB load) */
  restoreChunk(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    this.chunks.set(k, chunk)
    this.touch(k)
  }

  get worldSeedValue(): number {
    return this.worldSeed
  }
}

/** Convert world-space coordinates to chunk coords + local offset */
export function worldToChunkLocal(wx: number, wy: number): {
  cx: number; cy: number; lx: number; ly: number
} {
  const cx = Math.floor(wx / CHUNK_SIZE)
  const cy = Math.floor(wy / CHUNK_SIZE)
  const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  return { cx, cy, lx, ly }
}

/** Convert chunk + local coords back to world coords */
export function chunkLocalToWorld(cx: number, cy: number, lx: number, ly: number): {
  wx: number; wy: number
} {
  return { wx: cx * CHUNK_SIZE + lx, wy: cy * CHUNK_SIZE + ly }
}
