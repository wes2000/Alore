import * as THREE from 'three'
import { ChunkState, TileType } from '../data/types'
import { getTileColor } from '../data/biomes'
import { isDungeonFloor } from '../world/DungeonGenerator'
import { CHUNK_SIZE } from '../world/BiomeMap'

// Pixels per tile in the canvas texture
const CANVAS_TILE_PX = 8
const CANVAS_SIZE = CHUNK_SIZE * CANVAS_TILE_PX  // 256px

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
  private meshes = new Map<string, THREE.Mesh>()
  private textures = new Map<string, THREE.CanvasTexture>()
  private canvas2d: HTMLCanvasElement
  private ctx2d: CanvasRenderingContext2D

  constructor(scene: THREE.Scene) {
    this.scene = scene
    // Shared offscreen canvas for texture painting
    this.canvas2d = document.createElement('canvas')
    this.canvas2d.width  = CANVAS_SIZE
    this.canvas2d.height = CANVAS_SIZE
    this.ctx2d = this.canvas2d.getContext('2d')!
  }

  private key(cx: number, cy: number): string {
    return `${cx}_${cy}`
  }

  addChunk(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    if (this.meshes.has(k)) return  // already rendered

    const texture = this.buildTexture(chunk)
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE)
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: false })
    const mesh = new THREE.Mesh(geo, mat)

    // Position: chunk origin is top-left, Three.js center-pivot
    mesh.position.set(
      chunk.cx * CHUNK_SIZE + CHUNK_SIZE / 2,
      -(chunk.cy * CHUNK_SIZE + CHUNK_SIZE / 2),  // Y is flipped (down = +Y in tile space)
      0
    )

    this.scene.add(mesh)
    this.meshes.set(k, mesh)
    this.textures.set(k, texture)

    // Add resource node overlays
    this.addNodeOverlays(chunk)
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
    // Remove node overlay meshes
    this.removeNodeOverlays(cx, cy)
  }

  refreshChunk(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    const existingTex = this.textures.get(k)
    if (existingTex) {
      // Repaint onto existing texture
      this.paintChunk(chunk)
      existingTex.needsUpdate = true
    }
  }

  private buildTexture(chunk: ChunkState): THREE.CanvasTexture {
    this.paintChunk(chunk)
    const tex = new THREE.CanvasTexture(this.canvas2d)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    // Create an ImageBitmap to decouple from the shared canvas
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
          // Normal world chunk
          const tileType = chunk.tiles[ty][tx] as unknown as TileType
          const colorNum = getTileColor(tileType)
          ctx.fillStyle = numToHex(colorNum)
          // Add slight variation using tile position
          const vary = ((tx * 7 + ty * 13) & 0x0f) / 256 * 0.08
          ctx.globalAlpha = 1
          ctx.fillStyle = varyColor(colorNum, vary)
        }

        ctx.fillRect(px, py, CANVAS_TILE_PX, CANVAS_TILE_PX)
      }
    }
    ctx.globalAlpha = 1
  }

  // ─── Resource Node Overlays ────────────────────────────────────────────────
  private nodeOverlaysByChunk = new Map<string, THREE.Mesh[]>()

  private addNodeOverlays(chunk: ChunkState): void {
    const k = this.key(chunk.cx, chunk.cy)
    const overlays: THREE.Mesh[] = []

    for (const node of chunk.resourceNodes) {
      if (node.depleted) continue
      const color = getNodeColor(node.type)
      const geo = new THREE.PlaneGeometry(0.6, 0.6)
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
      const mesh = new THREE.Mesh(geo, mat)
      const wx = chunk.cx * CHUNK_SIZE + node.localX + 0.5
      const wy = -(chunk.cy * CHUNK_SIZE + node.localY + 0.5)
      mesh.position.set(wx, wy, 0.1)
      this.scene.add(mesh)
      overlays.push(mesh)
    }

    this.nodeOverlaysByChunk.set(k, overlays)
  }

  private removeNodeOverlays(cx: number, cy: number): void {
    const k = this.key(cx, cy)
    const overlays = this.nodeOverlaysByChunk.get(k)
    if (overlays) {
      for (const mesh of overlays) {
        this.scene.remove(mesh)
        ;(mesh.material as THREE.Material).dispose()
        mesh.geometry.dispose()
      }
      this.nodeOverlaysByChunk.delete(k)
    }
  }

  /** Update which chunks are visible based on camera position */
  syncVisible(camX: number, camY: number, rxTiles: number, ryTiles: number): void {
    // Convert camera position to chunk coords
    const camCX = Math.floor(camX / CHUNK_SIZE)
    const camCY = Math.floor(-camY / CHUNK_SIZE)
    const rxChunks = Math.ceil(rxTiles / CHUNK_SIZE) + 1
    const ryChunks = Math.ceil(ryTiles / CHUNK_SIZE) + 1

    // Hide chunks outside view range
    for (const [k, mesh] of this.meshes) {
      const [cxStr, cyStr] = k.split('_')
      const cx = parseInt(cxStr)
      const cy = parseInt(cyStr)
      const visible = Math.abs(cx - camCX) <= rxChunks && Math.abs(cy - camCY) <= ryChunks
      mesh.visible = visible
    }
  }

  dispose(): void {
    for (const [k] of this.meshes) {
      const [cx, cy] = k.split('_').map(Number)
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
