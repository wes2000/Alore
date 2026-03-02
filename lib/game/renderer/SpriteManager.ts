import * as THREE from 'three'
import { TileType } from '../data/types'

export type PlayerDirection = 'down' | 'left' | 'right' | 'up'

// Source tile size in all sprite sheets (px)
const TILE_PX = 24

// Procedural player sprite sheet: 3 cols (walk frames) × 4 rows (directions), 24×24 per frame
const PLAYER_COLS = 3
const PLAYER_ROWS = 4
const PLAYER_WALK_FRAMES = 3

// Which row corresponds to each direction (0-indexed from top)
const PLAYER_DIR_ROW: Record<PlayerDirection, number> = {
  down:  0,
  left:  1,
  right: 2,
  up:    3,
}

// ─── Procedural player sprite generation ───────────────────────────────────

const FW = 24 // frame width
const FH = 24 // frame height

function pxF(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, 1, 1)
}

function rectF(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/**
 * Draw a single player frame at canvas offset (ox, oy).
 * dir: 'down'|'left'|'right'|'up'
 * walkPhase: 0=stand/left-foot, 1=neutral, 2=right-foot
 */
function drawPlayerFrame(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  dir: PlayerDirection,
  walkPhase: number
): void {
  // Color palette — adventurer with teal tunic, brown boots, dark hair
  const skin     = '#e8c0a0'
  const skinDark = '#c09870'
  const hair     = '#3a2820'
  const hairHi   = '#5a4030'
  const tunic    = '#2888a0'
  const tunicHi  = '#48b0c8'
  const tunicDk  = '#186878'
  const belt     = '#a07838'
  const beltBk   = '#785820'
  const pants    = '#484868'
  const pantsDk  = '#303048'
  const boots    = '#5a3820'
  const bootsDk  = '#3a2010'
  const cape     = '#c83838'
  const capeDk   = '#981818'
  const white    = '#ffffff'
  const black    = '#000000'
  const eyeColor = '#2050a0'

  // Leg offsets for walk cycle
  let legLOff = 0, legROff = 0
  if (walkPhase === 0) { legLOff = -1; legROff = 1 }
  if (walkPhase === 2) { legLOff = 1; legROff = -1 }

  if (dir === 'down') {
    // ── Facing down (toward camera) ──
    // Cape behind body
    rectF(ctx, ox + 7, oy + 8, 10, 8, cape)
    rectF(ctx, ox + 8, oy + 16, 8, 2, capeDk)
    // Boots
    rectF(ctx, ox + 8, oy + 19 + legLOff, 3, 3, boots)
    rectF(ctx, ox + 13, oy + 19 + legROff, 3, 3, boots)
    pxF(ctx, ox + 8, oy + 21 + legLOff, bootsDk)
    pxF(ctx, ox + 13, oy + 21 + legROff, bootsDk)
    // Pants / legs
    rectF(ctx, ox + 8, oy + 16 + legLOff, 3, 3, pants)
    rectF(ctx, ox + 13, oy + 16 + legROff, 3, 3, pants)
    pxF(ctx, ox + 8, oy + 18 + legLOff, pantsDk)
    pxF(ctx, ox + 13, oy + 18 + legROff, pantsDk)
    // Body / tunic
    rectF(ctx, ox + 7, oy + 8, 10, 8, tunic)
    rectF(ctx, ox + 8, oy + 7, 8, 1, tunic)
    // Tunic highlights & shadows
    rectF(ctx, ox + 8, oy + 9, 2, 4, tunicHi)
    rectF(ctx, ox + 15, oy + 10, 1, 4, tunicDk)
    // Belt
    rectF(ctx, ox + 7, oy + 14, 10, 1, belt)
    pxF(ctx, ox + 12, oy + 14, beltBk)
    // Arms
    rectF(ctx, ox + 5, oy + 8, 2, 7, tunic)
    rectF(ctx, ox + 17, oy + 8, 2, 7, tunic)
    // Hands
    rectF(ctx, ox + 5, oy + 15, 2, 1, skin)
    rectF(ctx, ox + 17, oy + 15, 2, 1, skin)
    // Head
    rectF(ctx, ox + 8, oy + 1, 8, 7, skin)
    rectF(ctx, ox + 7, oy + 2, 1, 5, skin)
    rectF(ctx, ox + 16, oy + 2, 1, 5, skin)
    // Hair
    rectF(ctx, ox + 7, oy + 0, 10, 3, hair)
    rectF(ctx, ox + 6, oy + 1, 1, 2, hair)
    rectF(ctx, ox + 17, oy + 1, 1, 2, hair)
    pxF(ctx, ox + 9, oy + 1, hairHi)
    pxF(ctx, ox + 10, oy + 0, hairHi)
    // Eyes
    pxF(ctx, ox + 9, oy + 4, white)
    pxF(ctx, ox + 10, oy + 4, eyeColor)
    pxF(ctx, ox + 13, oy + 4, eyeColor)
    pxF(ctx, ox + 14, oy + 4, white)
    // Mouth
    pxF(ctx, ox + 11, oy + 6, skinDark)
    pxF(ctx, ox + 12, oy + 6, skinDark)

  } else if (dir === 'up') {
    // ── Facing up (away from camera) ──
    // Cape in front (we see the back)
    rectF(ctx, ox + 7, oy + 7, 10, 10, cape)
    rectF(ctx, ox + 8, oy + 17, 8, 1, capeDk)
    rectF(ctx, ox + 9, oy + 8, 6, 1, capeDk)
    // Boots
    rectF(ctx, ox + 8, oy + 19 + legLOff, 3, 3, boots)
    rectF(ctx, ox + 13, oy + 19 + legROff, 3, 3, boots)
    // Pants
    rectF(ctx, ox + 8, oy + 16 + legLOff, 3, 3, pants)
    rectF(ctx, ox + 13, oy + 16 + legROff, 3, 3, pants)
    // Arms (tunic sleeves visible on sides)
    rectF(ctx, ox + 5, oy + 8, 2, 7, tunic)
    rectF(ctx, ox + 17, oy + 8, 2, 7, tunic)
    rectF(ctx, ox + 5, oy + 15, 2, 1, skin)
    rectF(ctx, ox + 17, oy + 15, 2, 1, skin)
    // Head (back of head = all hair)
    rectF(ctx, ox + 7, oy + 0, 10, 7, hair)
    rectF(ctx, ox + 6, oy + 1, 1, 5, hair)
    rectF(ctx, ox + 17, oy + 1, 1, 5, hair)
    rectF(ctx, ox + 8, oy + 7, 8, 1, hair)
    pxF(ctx, ox + 9, oy + 1, hairHi)
    pxF(ctx, ox + 14, oy + 1, hairHi)

  } else if (dir === 'left') {
    // ── Facing left (side view) ──
    // Cape behind (on right side)
    rectF(ctx, ox + 13, oy + 7, 5, 10, cape)
    rectF(ctx, ox + 14, oy + 17, 3, 1, capeDk)
    // Boots
    rectF(ctx, ox + 9, oy + 19 + legLOff, 4, 3, boots)
    rectF(ctx, ox + 10, oy + 19 + legROff, 4, 3, boots)
    pxF(ctx, ox + 9, oy + 21 + legLOff, bootsDk)
    // Pants
    rectF(ctx, ox + 9, oy + 16 + legLOff, 4, 3, pants)
    rectF(ctx, ox + 10, oy + 16 + legROff, 4, 3, pants)
    // Body
    rectF(ctx, ox + 8, oy + 7, 6, 9, tunic)
    rectF(ctx, ox + 7, oy + 8, 1, 7, tunic)
    pxF(ctx, ox + 9, oy + 8, tunicHi)
    pxF(ctx, ox + 13, oy + 10, tunicDk)
    // Belt
    rectF(ctx, ox + 7, oy + 14, 7, 1, belt)
    // Arm (front)
    rectF(ctx, ox + 7, oy + 8, 2, 7, tunic)
    pxF(ctx, ox + 7, oy + 15, skin)
    // Head (side)
    rectF(ctx, ox + 7, oy + 1, 7, 7, skin)
    rectF(ctx, ox + 6, oy + 2, 1, 5, skin)
    // Hair
    rectF(ctx, ox + 10, oy + 0, 5, 3, hair)
    rectF(ctx, ox + 14, oy + 1, 1, 4, hair)
    rectF(ctx, ox + 8, oy + 0, 2, 2, hair)
    pxF(ctx, ox + 11, oy + 0, hairHi)
    // Eye
    pxF(ctx, ox + 8, oy + 4, white)
    pxF(ctx, ox + 7, oy + 4, eyeColor)
    // Mouth
    pxF(ctx, ox + 7, oy + 6, skinDark)

  } else {
    // ── Facing right (mirror of left) ──
    // Cape behind (on left side)
    rectF(ctx, ox + 6, oy + 7, 5, 10, cape)
    rectF(ctx, ox + 7, oy + 17, 3, 1, capeDk)
    // Boots
    rectF(ctx, ox + 11, oy + 19 + legLOff, 4, 3, boots)
    rectF(ctx, ox + 10, oy + 19 + legROff, 4, 3, boots)
    pxF(ctx, ox + 14, oy + 21 + legLOff, bootsDk)
    // Pants
    rectF(ctx, ox + 11, oy + 16 + legLOff, 4, 3, pants)
    rectF(ctx, ox + 10, oy + 16 + legROff, 4, 3, pants)
    // Body
    rectF(ctx, ox + 10, oy + 7, 6, 9, tunic)
    rectF(ctx, ox + 16, oy + 8, 1, 7, tunic)
    pxF(ctx, ox + 14, oy + 8, tunicHi)
    pxF(ctx, ox + 10, oy + 10, tunicDk)
    // Belt
    rectF(ctx, ox + 10, oy + 14, 7, 1, belt)
    // Arm (front)
    rectF(ctx, ox + 15, oy + 8, 2, 7, tunic)
    pxF(ctx, ox + 16, oy + 15, skin)
    // Head (side)
    rectF(ctx, ox + 10, oy + 1, 7, 7, skin)
    rectF(ctx, ox + 17, oy + 2, 1, 5, skin)
    // Hair
    rectF(ctx, ox + 9, oy + 0, 5, 3, hair)
    rectF(ctx, ox + 9, oy + 1, 1, 4, hair)
    rectF(ctx, ox + 14, oy + 0, 2, 2, hair)
    pxF(ctx, ox + 12, oy + 0, hairHi)
    // Eye
    pxF(ctx, ox + 15, oy + 4, white)
    pxF(ctx, ox + 16, oy + 4, eyeColor)
    // Mouth
    pxF(ctx, ox + 16, oy + 6, skinDark)
  }
}

/**
 * Generate a procedural player sprite sheet as a canvas.
 * Layout: 3 columns (walk frames) × 4 rows (down, left, right, up), 24×24 per frame.
 */
function generatePlayerSpriteSheet(): HTMLCanvasElement {
  const cols = PLAYER_COLS
  const rows = PLAYER_ROWS
  const canvas = document.createElement('canvas')
  canvas.width  = cols * FW
  canvas.height = rows * FH
  const ctx = canvas.getContext('2d')!

  const directions: PlayerDirection[] = ['down', 'left', 'right', 'up']
  for (let row = 0; row < rows; row++) {
    const dir = directions[row]
    for (let col = 0; col < cols; col++) {
      drawPlayerFrame(ctx, col * FW, row * FH, dir, col)
    }
  }
  return canvas
}

// Tile → { sheet, sx, sy } mapping (sx/sy are pixel offsets in the source image)
// Grassland Tileset row 0 layout (24px tiles):
//   col 0: rich grass, col 1: grass+flower, col 2: lighter/dry grass, col 3: dirt/sand...
type TileSheet = 'grass' | 'tree' | 'water'
interface TileSprite { sheet: TileSheet; sx: number; sy: number }

const TILE_SPRITES: Partial<Record<TileType, TileSprite>> = {
  [TileType.Grass]:        { sheet: 'grass', sx: 0,   sy: 0  },
  [TileType.Flower]:       { sheet: 'grass', sx: 24,  sy: 0  },
  [TileType.DryGrass]:     { sheet: 'grass', sx: 48,  sy: 0  },
  [TileType.Sand]:         { sheet: 'grass', sx: 72,  sy: 0  },
  [TileType.Mud]:          { sheet: 'grass', sx: 96,  sy: 0  },
  [TileType.Stone]:        { sheet: 'grass', sx: 120, sy: 0  },
  [TileType.Rock]:         { sheet: 'grass', sx: 144, sy: 0  },
  [TileType.Snow]:         { sheet: 'grass', sx: 168, sy: 0  },
  [TileType.Ice]:          { sheet: 'grass', sx: 192, sy: 0  },
  [TileType.Mushroom]:     { sheet: 'grass', sx: 216, sy: 0  },
  [TileType.TundraGround]: { sheet: 'grass', sx: 240, sy: 0  },
  [TileType.CactusGround]: { sheet: 'grass', sx: 264, sy: 0  },
  [TileType.Mountain]:     { sheet: 'grass', sx: 288, sy: 0  },
  [TileType.DeepMud]:      { sheet: 'grass', sx: 312, sy: 0  },
  // Trees from Reg tree wall: top-right quadrant has a standalone tree
  [TileType.Tree]:         { sheet: 'tree',  sx: 192, sy: 0  },
  [TileType.DenseTree]:    { sheet: 'tree',  sx: 0,   sy: 0  },
  // Water from Alt-water cliffs: teal center at row 1
  [TileType.Water]:        { sheet: 'water', sx: 24,  sy: 24 },
  [TileType.DeepWater]:    { sheet: 'water', sx: 48,  sy: 24 },
}

export class SpriteManager {
  private imgs: Record<TileSheet, HTMLImageElement | null> = {
    grass: null, tree: null, water: null,
  }
  private _playerTexture: THREE.Texture | null = null
  private loaded = 0
  private readonly total = 3 // grass, tree, water (player is procedural)
  // Cache last-applied frame to skip redundant GPU texture uploads
  private _lastDir: PlayerDirection | null = null
  private _lastFrame = -1

  get ready(): boolean { return this.loaded >= this.total && this._playerTexture !== null }
  get playerTexture(): THREE.Texture | null { return this._playerTexture }

  async load(): Promise<void> {
    const loadOne = (key: TileSheet, src: string): Promise<void> =>
      new Promise(resolve => {
        const img = new Image()
        img.onload = () => {
          this.imgs[key] = img
          this.loaded++
          resolve()
        }
        img.onerror = () => { this.loaded++; resolve() }
        img.src = src
      })

    // Load tile sheets
    await Promise.all([
      loadOne('grass',  '/sprites/Grassland Tileset.png'),
      loadOne('tree',   '/sprites/Reg tree wall.png'),
      loadOne('water',  '/sprites/Alt-water cliffs.png'),
    ])

    // Generate procedural player sprite sheet
    const playerCanvas = generatePlayerSpriteSheet()
    const tex = new THREE.CanvasTexture(playerCanvas)
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.needsUpdate = true
    this._playerTexture = tex
  }

  /**
   * Draw a single tile into a 2D canvas context.
   * Returns true if a sprite was used, false if caller should fall back to color.
   */
  drawTile(
    ctx: CanvasRenderingContext2D,
    tileType: TileType,
    destX: number, destY: number,
    destSize: number,
  ): boolean {
    const info = TILE_SPRITES[tileType]
    if (!info) return false
    const img = this.imgs[info.sheet]
    if (!img) return false
    ctx.drawImage(img, info.sx, info.sy, TILE_PX, TILE_PX, destX, destY, destSize, destSize)
    return true
  }

  /**
   * Apply UV offset/repeat on a Three.js texture to show the correct player frame.
   * Call this whenever direction or frame changes.
   */
  applyPlayerFrame(texture: THREE.Texture, direction: PlayerDirection, frame: number): void {
    // Skip when nothing has changed — avoids a GPU texture upload every frame
    if (direction === this._lastDir && frame === this._lastFrame) return
    this._lastDir   = direction
    this._lastFrame = frame

    const row = PLAYER_DIR_ROW[direction]
    const col = frame % PLAYER_WALK_FRAMES
    texture.repeat.set(1 / PLAYER_COLS, 1 / PLAYER_ROWS)
    // Three.js textures have flipY=true: row 0 of image → highest UV.y
    texture.offset.set(col / PLAYER_COLS, (PLAYER_ROWS - 1 - row) / PLAYER_ROWS)
    texture.needsUpdate = true
  }
}
