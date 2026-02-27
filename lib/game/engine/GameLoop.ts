export const TICK_RATE = 60           // logic ticks per second
export const TICK_MS  = 1000 / TICK_RATE
const MAX_DELTA_MS   = 100            // cap to prevent spiral of death

export type UpdateFn = (dt: number) => void  // dt in seconds
export type RenderFn = (alpha: number) => void // alpha = interpolation 0..1

export class GameLoop {
  private updateFn: UpdateFn
  private renderFn: RenderFn
  private running = false
  private accumulator = 0
  private lastTime = 0
  private rafId: number | null = null

  // Performance stats
  private _fps = 0
  private _frameCount = 0
  private _fpsTimer = 0

  constructor(update: UpdateFn, render: RenderFn) {
    this.updateFn = update
    this.renderFn = render
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.accumulator = 0
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private loop = (time: number): void => {
    if (!this.running) return

    const delta = Math.min(time - this.lastTime, MAX_DELTA_MS)
    this.lastTime = time

    // FPS counter
    this._frameCount++
    this._fpsTimer += delta
    if (this._fpsTimer >= 1000) {
      this._fps = this._frameCount
      this._frameCount = 0
      this._fpsTimer -= 1000
    }

    this.accumulator += delta

    // Fixed-timestep update loop
    while (this.accumulator >= TICK_MS) {
      this.updateFn(TICK_MS / 1000)
      this.accumulator -= TICK_MS
    }

    // Render with interpolation alpha
    const alpha = this.accumulator / TICK_MS
    this.renderFn(alpha)

    this.rafId = requestAnimationFrame(this.loop)
  }

  get fps(): number {
    return this._fps
  }

  get isRunning(): boolean {
    return this.running
  }
}
