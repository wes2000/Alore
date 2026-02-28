import * as THREE from 'three'
import { TileType } from '../data/types'

export type PlayerDirection = 'down' | 'left' | 'right' | 'up'

// Source tile size in all sprite sheets (px)
const TILE_PX = 24

// Player sprite sheet (Player Sample.png): 13 cols × 9 rows of 24×24 frames
const PLAYER_COLS = 13
const PLAYER_ROWS = 9
const PLAYER_WALK_FRAMES = 3

// Which row corresponds to each direction (0-indexed from top)
const PLAYER_DIR_ROW: Record<PlayerDirection, number> = {
  down:  0,
  left:  2,
  right: 4,
  up:    6,
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
  private imgs: Record<TileSheet | 'player', HTMLImageElement | null> = {
    grass: null, tree: null, water: null, player: null,
  }
  private _playerTexture: THREE.Texture | null = null
  private loaded = 0
  private readonly total = 4
  // Cache last-applied frame to skip redundant GPU texture uploads
  private _lastDir: PlayerDirection | null = null
  private _lastFrame = -1

  get ready(): boolean { return this.loaded >= this.total }
  get playerTexture(): THREE.Texture | null { return this._playerTexture }

  async load(): Promise<void> {
    const loadOne = (key: TileSheet | 'player', src: string): Promise<void> =>
      new Promise(resolve => {
        const img = new Image()
        img.onload = () => {
          this.imgs[key] = img
          if (key === 'player') {
            const tex = new THREE.Texture(img)
            tex.minFilter = THREE.NearestFilter
            tex.magFilter = THREE.NearestFilter
            tex.needsUpdate = true
            this._playerTexture = tex
          }
          this.loaded++
          resolve()
        }
        img.onerror = () => { this.loaded++; resolve() }
        img.src = src
      })

    await Promise.all([
      loadOne('grass',  '/sprites/Grassland Tileset.png'),
      loadOne('tree',   '/sprites/Reg tree wall.png'),
      loadOne('water',  '/sprites/Alt-water cliffs.png'),
      loadOne('player', '/sprites/Player Sample.png'),
    ])
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
