import * as THREE from 'three'
import { PetArchetype } from '../data/types'
import { SpriteManager, PlayerDirection } from './SpriteManager'

interface EntityVisual {
  mesh: THREE.Mesh
  kind: EntityKind
  labelCanvas?: HTMLCanvasElement
  labelSprite?: THREE.Sprite
  prevX: number
  prevY: number
  currX: number
  currY: number
}

// Entity types for the renderer
export type EntityKind = 'player' | 'pet' | 'mob'

/** Colored quad renderer for entities with optional sprite support.
 *  Player entity uses a sprite sheet texture when SpriteManager is available.
 */
export class EntityRenderer {
  private scene: THREE.Scene
  private entities = new Map<string, EntityVisual>()
  private sprites: SpriteManager | null = null
  private playerDir: PlayerDirection = 'down'
  private playerFrame = 0
  private playerSpriteApplied = false  // tracks if sprite texture was applied

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  setSpriteManager(sm: SpriteManager): void {
    this.sprites = sm
  }

  /** Called each tick from GameEngine to drive player animation. */
  setPlayerFrame(direction: PlayerDirection, frame: number): void {
    this.playerDir = direction
    this.playerFrame = frame
  }

  addEntity(
    id: string,
    kind: EntityKind,
    x: number, y: number,
    color: number,
    accentColor: number,
    label?: string,
    size = 0.75
  ): void {
    if (this.entities.has(id)) {
      this.updatePosition(id, x, y)
      return
    }

    // Body mesh — single draw call per entity (border removed to halve draw calls)
    const geo = new THREE.PlaneGeometry(size, size)
    const mat = new THREE.MeshBasicMaterial({ color, transparent: false })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x + 0.5, -(y + 0.5), 0.5)

    this.scene.add(mesh)

    // Label sprite
    let labelSprite: THREE.Sprite | undefined
    let labelCanvas: HTMLCanvasElement | undefined
    if (label) {
      const { sprite, canvas } = makeLabel(label, kind)
      sprite.position.set(x + 0.5, -(y + 0.5) + size / 2 + 0.35, 0.6)
      this.scene.add(sprite)
      labelSprite = sprite
      labelCanvas = canvas
    }

    this.entities.set(id, {
      mesh,
      kind,
      labelCanvas,
      labelSprite,
      prevX: x, prevY: y,
      currX: x, currY: y,
    })
  }

  updatePosition(id: string, x: number, y: number): void {
    const e = this.entities.get(id)
    if (!e) return
    e.prevX = e.currX
    e.prevY = e.currY
    e.currX = x
    e.currY = y
  }

  updateColor(id: string, color: number): void {
    const e = this.entities.get(id)
    if (!e) return
    ;(e.mesh.material as THREE.MeshBasicMaterial).color.setHex(color)
  }

  removeEntity(id: string): void {
    const e = this.entities.get(id)
    if (!e) return
    this.scene.remove(e.mesh)
    if (e.labelSprite) this.scene.remove(e.labelSprite)
    ;(e.mesh.material as THREE.Material).dispose()
    e.mesh.geometry.dispose()
    e.labelSprite?.material.map?.dispose()
    e.labelSprite?.material.dispose()
    this.entities.delete(id)
  }

  /** Interpolated render — alpha is 0..1 between logic ticks */
  render(alpha: number): void {
    // Lazily apply player sprite texture once it becomes available
    if (!this.playerSpriteApplied && this.sprites?.playerTexture) {
      const playerEntity = this.entities.get('player')
      if (playerEntity) {
        const mat = playerEntity.mesh.material as THREE.MeshBasicMaterial
        mat.map = this.sprites.playerTexture
        mat.color.setHex(0xffffff)  // white = no tint, show sprite as-is
        mat.transparent = true
        mat.needsUpdate = true
        this.playerSpriteApplied = true
      }
    }

    for (const [id, e] of this.entities) {
      const ix = e.prevX + (e.currX - e.prevX) * alpha
      const iy = e.prevY + (e.currY - e.prevY) * alpha
      e.mesh.position.set(ix + 0.5, -(iy + 0.5), 0.5)
      if (e.labelSprite) {
        e.labelSprite.position.set(ix + 0.5, -(iy + 0.5) + 0.8, 0.6)
      }

      // Animate player sprite frame
      if (id === 'player' && this.playerSpriteApplied && this.sprites?.playerTexture) {
        this.sprites.applyPlayerFrame(this.sprites.playerTexture, this.playerDir, this.playerFrame)
      }
    }
  }

  /** Flash an entity's color briefly (for damage/heal feedback) */
  flash(id: string, flashColor: number, durationMs = 150): void {
    const e = this.entities.get(id)
    if (!e) return
    const mat = e.mesh.material as THREE.MeshBasicMaterial
    const origColor = mat.color.getHex()
    mat.color.setHex(flashColor)
    setTimeout(() => {
      mat.color.setHex(origColor)
    }, durationMs)
  }

  dispose(): void {
    for (const id of this.entities.keys()) this.removeEntity(id)
  }
}

// ─── Label helpers ────────────────────────────────────────────────────────────

function makeLabel(
  text: string,
  kind: EntityKind
): { sprite: THREE.Sprite; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 24
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 128, 24)

  const color = kind === 'player' ? '#ffffff' :
                kind === 'pet'    ? '#a0e8a0' : '#ff8080'

  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 0, 128, 24)
  ctx.fillStyle = color
  ctx.fillText(text, 64, 17)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.6, 0.3, 1)

  return { sprite, canvas }
}

// ─── Health bar renderer ──────────────────────────────────────────────────────

export class HealthBarRenderer {
  private scene: THREE.Scene
  private bars = new Map<string, { bg: THREE.Mesh; fg: THREE.Mesh }>()

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  setHealth(id: string, x: number, y: number, ratio: number): void {
    if (!this.bars.has(id)) {
      const bgGeo = new THREE.PlaneGeometry(0.8, 0.1)
      const bgMat = new THREE.MeshBasicMaterial({ color: 0x400000 })
      const bg = new THREE.Mesh(bgGeo, bgMat)

      const fgGeo = new THREE.PlaneGeometry(0.8, 0.1)
      const fgMat = new THREE.MeshBasicMaterial({ color: 0x20c020 })
      const fg = new THREE.Mesh(fgGeo, fgMat)

      this.scene.add(bg)
      this.scene.add(fg)
      this.bars.set(id, { bg, fg })
    }

    const { bg, fg } = this.bars.get(id)!
    const bz = 0.9
    bg.position.set(x + 0.5, -(y + 0.5) - 0.5, bz)
    fg.position.set(x + 0.5 - (1 - ratio) * 0.4, -(y + 0.5) - 0.5, bz + 0.01)
    fg.scale.set(ratio, 1, 1)

    // Color by health
    const color = ratio > 0.5 ? 0x20c020 : ratio > 0.25 ? 0xe0c020 : 0xe02020
    ;(fg.material as THREE.MeshBasicMaterial).color.setHex(color)
  }

  remove(id: string): void {
    const bar = this.bars.get(id)
    if (!bar) return
    this.scene.remove(bar.bg)
    this.scene.remove(bar.fg)
    bar.bg.geometry.dispose()
    bar.fg.geometry.dispose()
    this.bars.delete(id)
  }

  dispose(): void {
    for (const id of this.bars.keys()) this.remove(id)
  }
}
