import * as THREE from 'three'

export const TILE_SIZE = 32      // pixels per tile in world space
export const ZOOM_DEFAULT = 1.0  // tiles visible = canvas / TILE_SIZE / ZOOM

export class SceneRenderer {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  private width: number
  private height: number
  private zoom: number = ZOOM_DEFAULT

  // Sub-scenes
  worldScene:    THREE.Scene   // tilemap + entities
  uiScene:       THREE.Scene   // screen-space elements

  constructor(canvas: HTMLCanvasElement) {
    this.width  = canvas.clientWidth  || canvas.width
    this.height = canvas.clientHeight || canvas.height

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,  // pixel art — no AA
      powerPreference: 'high-performance',
    })
    // Cap at 1 — rendering at native DPR (2× on Retina) is 4× the GPU work for
    // minimal visual gain on pixel-art tiles. Keeps the frame budget predictable.
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(this.width, this.height)
    this.renderer.autoClear = false

    this.scene = new THREE.Scene()
    this.worldScene = new THREE.Scene()
    this.uiScene = new THREE.Scene()

    // Orthographic camera: 1 unit = 1 tile
    this.camera = this.makeCamera()

    // Ambient light (world scene is unlit — using MeshBasicMaterial)
    // The "lighting" is handled via vertex colors / material colors
  }

  private makeCamera(): THREE.OrthographicCamera {
    const aspect = this.width / this.height
    const tilesH = this.height / TILE_SIZE / this.zoom
    const tilesV = tilesH
    const tilesW = tilesH * aspect

    return new THREE.OrthographicCamera(
      -tilesW / 2,  tilesW / 2,
       tilesV / 2, -tilesV / 2,
      -1000, 1000
    )
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.renderer.setSize(width, height)
    this.rebuildCamera()
  }

  private rebuildCamera(): void {
    const aspect = this.width / this.height
    const tilesH = this.height / TILE_SIZE / this.zoom
    const tilesW = tilesH * aspect

    this.camera.left   = -tilesW / 2
    this.camera.right  =  tilesW / 2
    this.camera.top    =  tilesH / 2
    this.camera.bottom = -tilesH / 2
    this.camera.updateProjectionMatrix()
  }

  setZoom(z: number): void {
    this.zoom = Math.max(0.35, Math.min(3.0, z))
    this.rebuildCamera()
  }

  setCameraPosition(x: number, y: number): void {
    this.camera.position.set(x, y, 100)
    this.camera.lookAt(x, y, 0)
  }

  /** Number of tiles visible in each axis half */
  getVisibleTileRadius(): { rx: number; ry: number } {
    const aspect = this.width / this.height
    const ry = Math.ceil(this.height / TILE_SIZE / this.zoom / 2) + 2
    const rx = Math.ceil(ry * aspect) + 2
    return { rx, ry }
  }

  /** Convert screen pixels → world tile coordinates */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const nx = (screenX / this.width)  * 2 - 1
    const ny = -(screenY / this.height) * 2 + 1
    const vec = new THREE.Vector3(nx, ny, 0).unproject(this.camera)
    return { x: vec.x, y: vec.y }
  }

  render(): void {
    this.renderer.clear()
    this.renderer.render(this.worldScene, this.camera)
  }

  dispose(): void {
    this.renderer.dispose()
  }

  get viewWidth(): number  { return this.width }
  get viewHeight(): number { return this.height }
  get currentZoom(): number { return this.zoom }
}
