import * as THREE from 'three'
import { ChunkState, TileType } from '../data/types'
import { getTileColor } from '../data/biomes'
import { isDungeonFloor } from '../world/DungeonGenerator'
import { CHUNK_SIZE } from '../world/BiomeMap'
import { SpriteManager } from './SpriteManager'

// Pixels per tile in the canvas texture (16 gives better sprite quality than 8)
const CANVAS_TILE_PX = 16
const CANVAS_SIZE = CHUNK_SIZE * CANVAS_TILE_PX  // 512px

// Dungeon tile colors
const DUNGEON_FLOOR_COLOR = '#2a2030'
const DUNGEON_WALL_COLOR  = '#181020'
const ROOM_COLORS: Record<string, string> = {
  entrance: '#303840',
  boss: '#3a0808',
  treasure: '#302000',
  puzzle: '#0a2030',
  pet_lair: '#0a2a14',
  normal: '#2a2030',
}

export class ChunkRenderer {
  private scene: THREE.Scene
  private meshes      = new Map<string, THREE.Mesh>()
  private textures    = new Map<string, THREE.CanvasTexture>()
  private chunkStates = new Map<string, ChunkState>()          // live refs — always current
  private chunkCoords = new Map<string, { cx: number; cy: number }>() // avoids split/parseInt hot-path
  private canvas2d: HTMLCanvasElement
  private ctx2d: CanvasRenderingContext2D
  private sprites: SpriteManager | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    // Shared offscreen canvas for texture painting
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

  /**
   * Repaint all loaded chunk textures in-place after the sprite manager loads.
   * Does NOT destroy/recreate meshes or canvases — avoids the GC spike that
   * previously caused a hard stall ~2 s after startup.
   */
  rebakeAll(): void {
    for (const [k, chunk] of this.chunkStates) {
      const tex = this.textures.get(k)
      if (!tex) continue
      this.paintChunk(chunk)
      const snapCtx = (tex.image as HTMLCanvasElement).getContext('2d')!
      snapCtx.drawImage(this.canvas2d, 0, 0)
      tex.needsUpdate = true
    }
  }

  addChunk(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    if (this.meshes.has(k)) return  // already rendered

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

  removeChunk(cx: number, cy: number): void {
    const k = this.key(cx, cy)
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

  /** Unload chunks whose distance from (playerCX, playerCY) exceeds maxRadius. */
  removeChunksOutsideRadius(playerCX: number, playerCY: number, maxRadius: number): void {
    for (const [, { cx, cy }] of this.chunkCoords) {
      if (Math.abs(cx - playerCX) > maxRadius || Math.abs(cy - playerCY) > maxRadius) {
        this.removeChunk(cx, cy)
      }
    }
  }

  refreshChunk(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    const existingTex = this.textures.get(k)
    if (existingTex) {
      this.paintChunk(chunk)
      // Copy updated pixels into the texture's own snapshot canvas so Three.js
      // uploads the correct content (existingTex.image is the per-chunk canvas).
      const snapCtx = (existingTex.image as HTMLCanvasElement).getContext('2d')!
      snapCtx.drawImage(this.canvas2d, 0, 0)
      existingTex.needsUpdate = true
    }
  }

  private buildTexture(chunk: ChunkState): THREE.CanvasTexture {
    this.paintChunk(chunk)
    // Give every chunk its own canvas so that batch-loading many chunks at once
    // doesn't cause all of their CanvasTextures to read the same shared canvas
    // at upload time (they would all show the last-painted chunk).
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
    const ctx = this.ctx2d
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    const dungeon = chunk.dungeonData

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const px = tx * CANVAS_TILE_PX
        const py = ty * CANVAS_TILE_PX

        if (dungeon) {
          // Dungeon chunk — render rooms and corridors
          const isFloor = isDungeonFloor(dungeon, tx, ty)
          if (isFloor) {
            // Find which room type this tile belongs to
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
        } else {
          // Normal world chunk — try sprite first, fallback to color
          const tileType = chunk.tiles[ty][tx] as unknown as TileType
          ctx.globalAlpha = 1
          if (!this.sprites?.drawTile(ctx, tileType, px, py, CANVAS_TILE_PX)) {
            // Fallback: colored rect with subtle variation
            const colorNum = getTileColor(tileType)
            const vary = ((tx * 7 + ty * 13) & 0x0f) / 256 * 0.08
            ctx.fillStyle = varyColor(colorNum, vary)
            ctx.fillRect(px, py, CANVAS_TILE_PX, CANVAS_TILE_PX)
          }
          continue
        }

        ctx.fillRect(px, py, CANVAS_TILE_PX, CANVAS_TILE_PX)
      }
    }
    ctx.globalAlpha = 1

    // Paint resource node markers directly onto the texture — eliminates
    // hundreds of separate overlay meshes from the scene graph.
    const margin = Math.round(CANVAS_TILE_PX * 0.18)
    const size   = CANVAS_TILE_PX - margin * 2
    for (const node of chunk.resourceNodes) {
      if (node.depleted) continue
      const px = node.localX * CANVAS_TILE_PX
      const py = node.localY * CANVAS_TILE_PX
      ctx.fillStyle = numToHex(getNodeColor(node.type))
      ctx.fillRect(px + margin, py + margin, size, size)
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'
      ctx.lineWidth = 1
      ctx.strokeRect(px + margin + 0.5, py + margin + 0.5, size - 1, size - 1)
    }
  }

  /** Update which chunks are visible based on camera position. */
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
    for (const [, { cx, cy }] of this.chunkCoords) {
      this.removeChunk(cx, cy)
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function numToHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0')
}

function varyColor(base: number, vary: number): string {
  const r = ((base >> 16) & 0xff)
  const g = ((base >> 8)  & 0xff)
  const b =  (base        & 0xff)
  const sign = vary >= 0 ? 1 : -1
  const v = Math.abs(vary) * 255 * sign
  return `rgb(${clamp(r + v)},${clamp(g + v)},${clamp(b + v)})`
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function getNodeColor(nodeType: string): number {
  const nodeColors: Record<string, number> = {
    CopperOre: 0xc87040,
    IronOre:   0x808090,
    GoldOre:   0xf0c040,
    MithrilOre: 0x4080e0,
    OakTree:   0x2a5a1a,
    BirchTree: 0xd4c8a0,
    WillowTree: 0x487840,
    HerbPatch: 0x60c840,
    MushroomCluster: 0x8a5020,
    FishingSpot: 0x40b0ff,
    StoneBoulder: 0x888888,
  }
  return nodeColors[nodeType] ?? 0x888888
}
