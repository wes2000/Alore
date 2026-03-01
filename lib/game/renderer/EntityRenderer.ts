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
  // Animation state (for textured entities: mobs, pets, NPCs)
  animFrames: number     // total frames in strip (0 = no animation)
  animTick: number       // increments each render call
  animSpeed: number      // render calls per frame switch
  entityTexture: THREE.CanvasTexture | null  // null = flat color (player handled separately)
}

interface SpeechBubble {
  sprite: THREE.Sprite
  texture: THREE.CanvasTexture
}

// Entity types for the renderer
export type EntityKind = 'player' | 'pet' | 'mob' | 'npc'

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
  private speechBubbles = new Map<string, SpeechBubble>()

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
    size = 0.75,
    texture?: THREE.CanvasTexture,
    animFrames = 0,
  ): void {
    if (this.entities.has(id)) {
      this.updatePosition(id, x, y)
      return
    }

    // Body mesh — single draw call per entity
    const geo = new THREE.PlaneGeometry(size, kind === 'npc' ? size * 1.5 : size)
    let mat: THREE.MeshBasicMaterial
    if (texture) {
      mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, color: 0xffffff })
    } else {
      mat = new THREE.MeshBasicMaterial({ color, transparent: false })
    }
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
      animFrames: animFrames,
      animTick: 0,
      animSpeed: 20,   // ~3 FPS at 60 render calls/sec
      entityTexture: texture ?? null,
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
    // Clean up speech bubble if present
    const bubble = this.speechBubbles.get(id)
    if (bubble) {
      this.scene.remove(bubble.sprite)
      bubble.texture.dispose()
      ;(bubble.sprite.material as THREE.SpriteMaterial).dispose()
      this.speechBubbles.delete(id)
    }
  }

  /** Display a speech bubble above an entity for durationMs then fade it out. */
  showSpeechBubble(entityId: string, text: string, durationMs = 2000): void {
    const e = this.entities.get(entityId)
    if (!e) return

    // Remove any existing bubble for this entity
    const old = this.speechBubbles.get(entityId)
    if (old) {
      this.scene.remove(old.sprite)
      old.texture.dispose()
      ;(old.sprite.material as THREE.SpriteMaterial).dispose()
      this.speechBubbles.delete(entityId)
    }

    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 30
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#F0E8C8'
    ctx.fillRect(0, 0, 200, 30)
    ctx.strokeStyle = '#181818'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, 198, 28)
    ctx.font = 'bold 9px monospace'
    ctx.fillStyle = '#181818'
    ctx.textAlign = 'center'
    ctx.fillText(text, 100, 20)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(2.4, 0.38, 1)
    sprite.position.set(e.currX + 0.5, -(e.currY + 0.5) + 1.3, 0.8)
    this.scene.add(sprite)
    this.speechBubbles.set(entityId, { sprite, texture })

    const fadeDelay = durationMs * 0.65
    const startTime = performance.now()
    const tick = () => {
      const elapsed = performance.now() - startTime
      if (elapsed >= durationMs) {
        this.scene.remove(sprite)
        texture.dispose()
        mat.dispose()
        this.speechBubbles.delete(entityId)
        return
      }
      if (elapsed > fadeDelay) {
        mat.opacity = 1 - (elapsed - fadeDelay) / (durationMs - fadeDelay)
      }
      const ent = this.entities.get(entityId)
      if (ent) {
        sprite.position.set(ent.currX + 0.5, -(ent.currY + 0.5) + 1.3, 0.8)
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  /** Read-only access to entity state — used by HealthBarRenderer in the render pass. */
  getEntity(id: string): EntityVisual | undefined {
    return this.entities.get(id)
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

      // Animate mob/pet/NPC 2-frame sprites
      if (e.entityTexture && e.animFrames >= 2) {
        e.animTick++
        if (e.animTick >= e.animSpeed) {
          e.animTick = 0
          // Toggle UV offset between frame 0 and frame 1
          const currentFrame = e.entityTexture.offset.x > 0 ? 0 : 1
          e.entityTexture.offset.set(currentFrame * (1 / e.animFrames), 0)
        }
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

  /**
   * Spawn a pixel-art slash/impact effect at world position (wx, wy).
   * The effect expands and fades over ~280ms then removes itself.
   */
  spawnAttackEffect(wx: number, wy: number): void {
    const texture = buildSlashTexture()
    const geo = new THREE.PlaneGeometry(1.6, 1.6)
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(wx, -wy, 0.7)

    this.scene.add(mesh)

    const DURATION = 280
    const start = performance.now()

    const tick = () => {
      const t = Math.min((performance.now() - start) / DURATION, 1)
      mat.opacity = 1 - t
      const s = 0.5 + t * 1.2
      mesh.scale.set(s, s, 1)
      if (t < 1) {
        requestAnimationFrame(tick)
      } else {
        this.scene.remove(mesh)
        geo.dispose()
        mat.dispose()
        texture.dispose()
      }
    }
    requestAnimationFrame(tick)
  }

  /**
   * Play a death animation: shrink to 0 + white flash over 300ms,
   * then spawn colored poof particles. Removes the entity after.
   */
  playDeathAnimation(id: string, bodyColor: number): void {
    const e = this.entities.get(id)
    if (!e) {
      this.removeEntity(id)
      return
    }

    const mesh = e.mesh
    const mat = mesh.material as THREE.MeshBasicMaterial
    const wx = e.currX + 0.5
    const wy = e.currY + 0.5

    // Flash white
    mat.color.setHex(0xffffff)

    const DURATION = 300
    const start = performance.now()
    const origScale = mesh.scale.x

    const tick = () => {
      const t = Math.min((performance.now() - start) / DURATION, 1)
      const s = origScale * (1 - t)
      mesh.scale.set(s, s, 1)
      mat.opacity = 1 - t
      mat.transparent = true
      if (t < 1) {
        requestAnimationFrame(tick)
      } else {
        this.removeEntity(id)
        // Spawn poof particles
        this.spawnPoofParticles(wx, wy, bodyColor)
      }
    }
    requestAnimationFrame(tick)
  }

  /** Spawn 4-5 small colored particles that drift outward and fade. */
  private spawnPoofParticles(wx: number, wy: number, color: number): void {
    const count = 4 + Math.floor(Math.random() * 2)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const speed = 0.8 + Math.random() * 0.8
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed

      const geo = new THREE.PlaneGeometry(0.15, 0.15)
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(wx, -wy, 0.6)
      this.scene.add(mesh)

      const DURATION = 350
      const start = performance.now()

      const tick = () => {
        const t = Math.min((performance.now() - start) / DURATION, 1)
        mesh.position.x = wx + vx * t
        mesh.position.y = -wy + vy * t
        mat.opacity = 1 - t
        const s = 1 - t * 0.5
        mesh.scale.set(s, s, 1)
        if (t < 1) {
          requestAnimationFrame(tick)
        } else {
          this.scene.remove(mesh)
          geo.dispose()
          mat.dispose()
        }
      }
      requestAnimationFrame(tick)
    }
  }

  /**
   * Spawn a floating damage number at world position.
   * Rises 0.5 tiles over 600ms and fades out.
   */
  spawnDamageNumber(wx: number, wy: number, amount: number, color = '#ffffff'): void {
    this.spawnFloatingText(wx, wy, String(amount), color)
  }

  /** Spawn a floating text label (damage number, "Miss", "CRIT!", etc.) */
  spawnFloatingText(wx: number, wy: number, text: string, color = '#ffffff', scale = 1): void {
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 28
    const ctx = canvas.getContext('2d')!
    const fontSize = Math.round(14 * scale)
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'
    ctx.lineWidth = 3
    ctx.strokeText(text, 48, 22)
    ctx.fillStyle = color
    ctx.fillText(text, 48, 22)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(0.8 * scale, 0.3 * scale, 1)
    sprite.position.set(wx, -wy + 0.3, 0.85)
    this.scene.add(sprite)

    const DURATION = 600
    const startY = -wy + 0.3
    const start = performance.now()

    const tick = () => {
      const t = Math.min((performance.now() - start) / DURATION, 1)
      sprite.position.y = startY + t * 0.5
      mat.opacity = t < 0.5 ? 1 : 1 - (t - 0.5) * 2
      if (t < 1) {
        requestAnimationFrame(tick)
      } else {
        this.scene.remove(sprite)
        texture.dispose()
        mat.dispose()
      }
    }
    requestAnimationFrame(tick)
  }

  dispose(): void {
    for (const id of this.entities.keys()) this.removeEntity(id)
  }
}

// ─── Attack effect ────────────────────────────────────────────────────────────

/** Build a 16×16 pixel-art cross/impact texture for the attack slash effect. */
function buildSlashTexture(): THREE.CanvasTexture {
  const SIZE = 16
  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  // White cross (+ shape)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 7, SIZE, 2)   // horizontal bar
  ctx.fillRect(7, 0, 2, SIZE)   // vertical bar

  // Yellow tips at arm ends
  ctx.fillStyle = '#FFEE44'
  ctx.fillRect(0,  7, 2, 2)    // left tip
  ctx.fillRect(14, 7, 2, 2)    // right tip
  ctx.fillRect(7,  0, 2, 2)    // top tip
  ctx.fillRect(7, 14, 2, 2)    // bottom tip

  // Bright center
  ctx.fillStyle = '#FFFFAA'
  ctx.fillRect(7, 7, 2, 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

// ─── Label helpers ────────────────────────────────────────────────────────────

function makeLabel(
  text: string,
  kind: EntityKind
): { sprite: THREE.Sprite; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 28
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 192, 28)

  const color = kind === 'player' ? 'rgba(255,255,255,0.85)' :
                kind === 'pet'    ? 'rgba(160,232,160,0.8)' :
                kind === 'npc'    ? 'rgba(255,215,0,0.8)' : 'rgba(255,128,128,0.7)'

  // Smaller text, no background rectangle — just outlined text for subtlety
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'center'
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'
  ctx.lineWidth = 3
  ctx.strokeText(text, 96, 18)
  ctx.fillStyle = color
  ctx.fillText(text, 96, 18)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.5, 0.22, 1)

  return { sprite, canvas }
}

// ─── Health bar renderer ──────────────────────────────────────────────────────

export class HealthBarRenderer {
  private scene: THREE.Scene
  private bars = new Map<string, { bg: THREE.Mesh; fg: THREE.Mesh }>()
  // Cache last ratio per entity so we skip redundant color/scale writes
  private ratioCache = new Map<string, number>()

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /**
   * Called in the UPDATE tick: ensures the bar exists and updates HP ratio/color only.
   * Position is NOT set here — it is synced in the RENDER pass (with interpolation).
   */
  setHealth(id: string, ratio: number): void {
    if (!this.bars.has(id)) {
      const bgGeo = new THREE.PlaneGeometry(0.8, 0.1)
      const bgMat = new THREE.MeshBasicMaterial({ color: 0x400000 })
      const bg = new THREE.Mesh(bgGeo, bgMat)

      const fgGeo = new THREE.PlaneGeometry(0.8, 0.1)
      const fgMat = new THREE.MeshBasicMaterial({ color: 0x20c020 })
      const fg = new THREE.Mesh(fgGeo, fgMat)

      // Start hidden off-screen; position will be set on first render pass
      bg.visible = false
      fg.visible = false
      this.scene.add(bg)
      this.scene.add(fg)
      this.bars.set(id, { bg, fg })
    }

    // Only touch Three.js objects when ratio actually changed (avoids redundant GPU state writes)
    const prev = this.ratioCache.get(id) ?? -1
    if (Math.abs(ratio - prev) > 0.005) {
      this.ratioCache.set(id, ratio)
      const { fg } = this.bars.get(id)!
      fg.scale.set(ratio, 1, 1)
      const color = ratio > 0.5 ? 0x20c020 : ratio > 0.25 ? 0xe0c020 : 0xe02020
      ;(fg.material as THREE.MeshBasicMaterial).color.setHex(color)
    }
  }

  /**
   * Called in the RENDER pass: syncs bar positions to interpolated entity positions.
   * This gives health bars the same smooth motion as entity sprites.
   */
  syncPositions(entityRenderer: EntityRenderer, alpha: number): void {
    const bz = 0.9
    for (const [id, bar] of this.bars) {
      const e = entityRenderer.getEntity(id)
      if (!e) continue
      const ix = e.prevX + (e.currX - e.prevX) * alpha
      const iy = e.prevY + (e.currY - e.prevY) * alpha
      const ratio = this.ratioCache.get(id) ?? 1
      bar.bg.position.set(ix + 0.5, -(iy + 0.5) - 0.5, bz)
      bar.fg.position.set(ix + 0.5 - (1 - ratio) * 0.4, -(iy + 0.5) - 0.5, bz + 0.01)
      if (!bar.bg.visible) { bar.bg.visible = true; bar.fg.visible = true }
    }
  }

  remove(id: string): void {
    const bar = this.bars.get(id)
    if (!bar) return
    this.scene.remove(bar.bg)
    this.scene.remove(bar.fg)
    bar.bg.geometry.dispose()
    bar.fg.geometry.dispose()
    this.bars.delete(id)
    this.ratioCache.delete(id)
  }

  dispose(): void {
    for (const id of this.bars.keys()) this.remove(id)
  }
}
