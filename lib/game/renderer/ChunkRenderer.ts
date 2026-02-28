import * as THREE from 'three'
import { ChunkState, TileType } from '../data/types'
import { getTileColor } from '../data/biomes'
import { isDungeonFloor } from '../world/DungeonGenerator'
import { CHUNK_SIZE } from '../world/BiomeMap'
import { SpriteManager } from './SpriteManager'

// 8 px/tile keeps canvas at 256×256 (vs 512×512 at 16) — 4× less canvas memory
// and 4× fewer pixels per drawImage call. NearestFilter upscale to TILE_SIZE=32
// still looks crisp for pixel-art tiles.
const CANVAS_TILE_PX = 8
const CANVAS_SIZE = CHUNK_SIZE * CANVAS_TILE_PX  // 256px

// Dungeon tile colors
const DUNGEON_FLOOR_COLOR = '#2a2030'
const DUNGEON_WALL_COLOR  = '#181020'
const ROOM_COLORS: Record<string, string> = {
  entrance: '#303840',
  boss:     '#3a0808',
  treasure: '#302000',
  puzzle:   '#0a2030',
  pet_lair: '#0a2a14',
  normal:   '#2a2030',
}

export class ChunkRenderer {
  private scene: THREE.Scene
  private meshes      = new Map<string, THREE.Mesh>()
  private textures    = new Map<string, THREE.CanvasTexture>()
  private chunkStates = new Map<string, ChunkState>()          // live refs — always current
  private chunkCoords = new Map<string, { cx: number; cy: number }>() // cached for syncVisible

  // Async build queues — processed 2 per render frame so the main thread never stalls.
  // buildQueue: new chunks that need a mesh + texture created from scratch.
  // repaintQueue: existing chunks whose texture needs repainting (e.g., after sprite load).
  private buildQueue   = new Map<string, ChunkState>()  // insertion-ordered
  private repaintQueue = new Map<string, ChunkState>()  // insertion-ordered

  private canvas2d: HTMLCanvasElement   // shared scratch canvas for painting
  private ctx2d: CanvasRenderingContext2D
  private sprites: SpriteManager | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.canvas2d = document.createElement('canvas')
    this.canvas2d.width  = CANVAS_SIZE
    this.canvas2d.height = CANVAS_SIZE
    this.ctx2d = this.canvas2d.getContext('2d')!
  }

  setSpriteManager(sm: SpriteManager): void {
    this.sprites = sm
  }

  private key(cx: number, cy: number): string {
    return `${cx}_${cy}`
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Request a chunk to be rendered.  Does NOT paint synchronously — pushes to
   * buildQueue so the expensive canvas work is spread across frames.
   */
  addChunk(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    if (this.meshes.has(k) || this.buildQueue.has(k)) return
    this.buildQueue.set(k, chunk)
  }

  removeChunk(cx: number, cy: number): void {
    const k = this.key(cx, cy)

    // Cancel any queued work for this chunk
    this.buildQueue.delete(k)
    this.repaintQueue.delete(k)

    const mesh = this.meshes.get(k)
    if (mesh) {
      this.scene.remove(mesh)
      ;(mesh.material as THREE.MeshBasicMaterial).map?.dispose()
      ;(mesh.material as THREE.Material).dispose()
      mesh.geometry.dispose()
      this.meshes.delete(k)
    }
    this.textures.get(k)?.dispose()
    this.textures.delete(k)
    this.chunkStates.delete(k)
    this.chunkCoords.delete(k)
  }

  /** Unload chunks beyond maxRadius from the player chunk. */
  removeChunksOutsideRadius(playerCX: number, playerCY: number, maxRadius: number): void {
    for (const [, { cx, cy }] of this.chunkCoords) {
      if (Math.abs(cx - playerCX) > maxRadius || Math.abs(cy - playerCY) > maxRadius) {
        this.removeChunk(cx, cy)
      }
    }
    // Also discard queued builds that are now out of range
    for (const [k, chunk] of this.buildQueue) {
      if (Math.abs(chunk.cx - playerCX) > maxRadius || Math.abs(chunk.cy - playerCY) > maxRadius) {
        this.buildQueue.delete(k)
      }
    }
  }

  /**
   * Queue a repaint of all loaded chunk textures (called after sprite manager loads).
   * Repaints are spread across frames — avoids the GC spike from synchronous rebuild.
   */
  rebakeAll(): void {
    for (const [k, chunk] of this.chunkStates) {
      this.repaintQueue.set(k, chunk)
    }
  }

  /**
   * Called every render frame. Processes up to maxPerFrame pending operations so
   * canvas painting never blocks the main thread for more than ~4 ms at a time.
   */
  processPending(maxPerFrame: number): void {
    let done = 0

    // Priority 1: build new chunk meshes (player needs them to see the world)
    for (const [k, chunk] of this.buildQueue) {
      if (done >= maxPerFrame) break
      this.buildQueue.delete(k)
      if (!this.meshes.has(k)) {
        this.buildAndAdd(chunk)
        done++
      }
    }

    // Priority 2: repaint existing textures with updated sprites
    for (const [k, chunk] of this.repaintQueue) {
      if (done >= maxPerFrame) break
      this.repaintQueue.delete(k)
      const tex = this.textures.get(k)
      if (tex) {
        this.paintChunk(chunk)
        const snapCtx = (tex.image as HTMLCanvasElement).getContext('2d')!
        snapCtx.drawImage(this.canvas2d, 0, 0)
        tex.needsUpdate = true
        done++
      }
    }
  }

  /**
   * Repaint a single chunk in-place (e.g., after a node depletes or respawns).
   * This is a direct repaint — appropriate for rare, single-chunk events.
   */
  refreshChunk(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    const existingTex = this.textures.get(k)
    if (existingTex) {
      this.paintChunk(chunk)
      const snapCtx = (existingTex.image as HTMLCanvasElement).getContext('2d')!
      snapCtx.drawImage(this.canvas2d, 0, 0)
      existingTex.needsUpdate = true
    }
  }

  /** Update mesh visibility based on camera frustum. Uses cached coords — no string parsing. */
  syncVisible(camX: number, camY: number, rxTiles: number, ryTiles: number): void {
    const camCX    = Math.floor(camX  / CHUNK_SIZE)
    const camCY    = Math.floor(-camY / CHUNK_SIZE)
    const rxChunks = Math.ceil(rxTiles / CHUNK_SIZE) + 1
    const ryChunks = Math.ceil(ryTiles / CHUNK_SIZE) + 1

    for (const [k, mesh] of this.meshes) {
      const { cx, cy } = this.chunkCoords.get(k)!
      mesh.visible = Math.abs(cx - camCX) <= rxChunks && Math.abs(cy - camCY) <= ryChunks
    }
  }

  dispose(): void {
    this.buildQueue.clear()
    this.repaintQueue.clear()
    for (const [, { cx, cy }] of this.chunkCoords) {
      this.removeChunk(cx, cy)
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /** Build and immediately add a chunk mesh. Only called from processPending. */
  private buildAndAdd(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    if (this.meshes.has(k)) return  // already built (should not happen, safety guard)

    const texture = this.buildTexture(chunk)
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE)
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: false })
    const mesh = new THREE.Mesh(geo, mat)

    mesh.position.set(
      chunk.cx * CHUNK_SIZE + CHUNK_SIZE / 2,
      -(chunk.cy * CHUNK_SIZE + CHUNK_SIZE / 2),
      0
    )

    this.scene.add(mesh)
    this.meshes.set(k, mesh)
    this.textures.set(k, texture)
    this.chunkStates.set(k, chunk)
    this.chunkCoords.set(k, { cx: chunk.cx, cy: chunk.cy })
  }

  /** Paint the shared scratch canvas then snapshot it into a dedicated per-chunk canvas. */
  private buildTexture(chunk: ChunkState): THREE.CanvasTexture {
    this.paintChunk(chunk)
    // Per-chunk canvas prevents all CanvasTextures sharing the same live canvas
    // (which causes them all to show the last-painted chunk at GPU upload time).
    const snap = document.createElement('canvas')
    snap.width  = CANVAS_SIZE
    snap.height = CANVAS_SIZE
    snap.getContext('2d')!.drawImage(this.canvas2d, 0, 0)
    const tex = new THREE.CanvasTexture(snap)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    return tex
  }

  private paintChunk(chunk: ChunkState): void {
    const ctx    = this.ctx2d
    const dungeon = chunk.dungeonData
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const px = tx * CANVAS_TILE_PX
        const py = ty * CANVAS_TILE_PX

        if (dungeon) {
          const isFloor = isDungeonFloor(dungeon, tx, ty)
          if (isFloor) {
            let color = DUNGEON_FLOOR_COLOR
            for (const room of dungeon.rooms) {
              if (tx >= room.x && tx < room.x + room.w &&
                  ty >= room.y && ty < room.y + room.h) {
                color = ROOM_COLORS[room.type] ?? DUNGEON_FLOOR_COLOR
                break
              }
            }
            ctx.fillStyle = color
          } else {
            ctx.fillStyle = DUNGEON_WALL_COLOR
          }
          ctx.fillRect(px, py, CANVAS_TILE_PX, CANVAS_TILE_PX)
        } else {
          const tileType = chunk.tiles[ty][tx] as unknown as TileType
          ctx.globalAlpha = 1
          if (!this.sprites?.drawTile(ctx, tileType, px, py, CANVAS_TILE_PX)) {
            const colorNum = getTileColor(tileType)
            const vary = ((tx * 7 + ty * 13) & 0x0f) / 256 * 0.08
            ctx.fillStyle = varyColor(colorNum, vary)
            ctx.fillRect(px, py, CANVAS_TILE_PX, CANVAS_TILE_PX)
          }
        }
      }
    }
    ctx.globalAlpha = 1

    // Resource node pixel-art sprites baked directly into the tile texture
    for (const node of chunk.resourceNodes) {
      if (node.depleted) continue
      const px = node.localX * CANVAS_TILE_PX
      const py = node.localY * CANVAS_TILE_PX
      drawNodePixelArt(ctx, px, py, node.type)
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function varyColor(base: number, vary: number): string {
  const r = (base >> 16) & 0xff
  const g = (base >>  8) & 0xff
  const b =  base        & 0xff
  const v = vary * 255
  return `rgb(${clamp(r + v)},${clamp(g + v)},${clamp(b + v)})`
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

// ─── Pixel-art resource node sprites ─────────────────────────────────────────
// Each pattern is 8 chars wide × 8 chars tall (one canvas pixel each).
// '.' = skip (transparent). Each letter maps to a hex color in the palette.
// At CANVAS_TILE_PX=8 these pixels are 4× upscaled to 32px display tiles.

type Palette = Record<string, string>

const NODE_ART: Record<string, { p: string[]; pal: Palette }> = {
  OakTree: {
    p: [
      '...dGGd.',
      '..dGlGGd',
      '.dGGGGGd',
      'dGGGGGGd',
      '.dGGGGd.',
      '...BB...',
      '...BB...',
      '........',
    ],
    pal: { d: '#1a3a08', G: '#3a7a18', l: '#5aaa28', B: '#7a4a20' },
  },
  BirchTree: {
    p: [
      '...dLLd.',
      '..dLlLLd',
      '.dLLLLLd',
      'dLLLLLLd',
      '.dLLLLd.',
      '...Ww...',
      '...wW...',
      '........',
    ],
    pal: { d: '#2a5010', L: '#6a9a30', l: '#8aca40', W: '#e8e0c0', w: '#c8b890' },
  },
  WillowTree: {
    p: [
      '...dWWd.',
      '..dWwWWd',
      '.dWWWWWd',
      'dWWWWWWd',
      '.dWWWWd.',
      '...Bb...',
      '...Bb...',
      '........',
    ],
    pal: { d: '#1a3830', W: '#407840', w: '#60a860', B: '#604820', b: '#402a10' },
  },
  StoneBoulder: {
    p: [
      '..dDDd..',
      '.dLLLDd.',
      'dLlLLLDd',
      'dLLLLLDd',
      '.dLLLDd.',
      '..dDDd..',
      '........',
      '........',
    ],
    pal: { d: '#505050', D: '#383838', L: '#909090', l: '#b0b0b0' },
  },
  CopperOre: {
    p: [
      '..dDDd..',
      '.dLLLDd.',
      'dLooCLDd',
      'dLoCoCDd',
      '.dLLLDd.',
      '..dDDd..',
      '........',
      '........',
    ],
    pal: { d: '#505058', D: '#383840', L: '#808090', l: '#9090a0', o: '#e09060', C: '#a86030' },
  },
  IronOre: {
    p: [
      '..dDDd..',
      '.dddDDd.',
      'ddiiiDDd',
      'ddiiIDd.',
      '.dddDd..',
      '..dDd...',
      '........',
      '........',
    ],
    pal: { d: '#505058', D: '#303038', i: '#8090a0', I: '#a0b0c0' },
  },
  GoldOre: {
    p: [
      '..dDDd..',
      '.dLLLDd.',
      'dLGGGLDd',
      'dLGgGLDd',
      '.dLGLDd.',
      '..dDDd..',
      '........',
      '........',
    ],
    pal: { d: '#504840', D: '#383028', L: '#888070', G: '#e8c020', g: '#f8e040' },
  },
  MithrilOre: {
    p: [
      '..dDDd..',
      '.dLLLDd.',
      'dLMMMlDd',
      'dLMmMlDd',
      '.dLMLDd.',
      '..dDDd..',
      '........',
      '........',
    ],
    pal: { d: '#384050', D: '#202830', L: '#607080', l: '#708090', M: '#5090e0', m: '#80b8f8' },
  },
  HerbPatch: {
    p: [
      '.f.f.f..',
      'S.S.S...',
      'SSSSSSS.',
      '.sSSSss.',
      '..sssss.',
      '........',
      '........',
      '........',
    ],
    pal: { f: '#e8d020', S: '#60c840', s: '#308020' },
  },
  MushroomCluster: {
    p: [
      '.DRRRD..',
      'DRRRRRd.',
      'RWwWRRd.',
      'RRRRRd..',
      '.DSSSD..',
      '..SSS...',
      '........',
      '........',
    ],
    pal: { D: '#601010', R: '#d82020', d: '#401010', W: '#f0f0f0', w: '#d0c8c0', S: '#e8e8d0' },
  },
  FishingSpot: {
    p: [
      '........',
      '.wWww...',
      'bwwwwwb.',
      'bWwwwwb.',
      '.wWwww..',
      '..wWw...',
      '........',
      '........',
    ],
    pal: { b: '#2060a0', w: '#60b8e0', W: '#c0e8ff' },
  },
}

function drawNodePixelArt(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  nodeType: string,
): void {
  const art = NODE_ART[nodeType]
  if (!art) {
    // Fallback: small colored square for unknown node types
    ctx.fillStyle = '#888888'
    const m = 1
    ctx.fillRect(px + m, py + m, CANVAS_TILE_PX - m * 2, CANVAS_TILE_PX - m * 2)
    return
  }
  const { p, pal } = art
  for (let row = 0; row < p.length; row++) {
    const rowStr = p[row]
    for (let col = 0; col < rowStr.length; col++) {
      const ch = rowStr[col]
      if (ch !== '.') {
        ctx.fillStyle = pal[ch]
        ctx.fillRect(px + col, py + row, 1, 1)
      }
    }
  }
}
