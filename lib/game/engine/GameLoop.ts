export const TICK_RATE = 30           // logic ticks per second (30 Hz is plenty for a top-down RPG;
                                       // visuals interpolate smoothly to whatever fps the browser hits)
export const TICK_MS  = 1000 / TICK_RATE
const MAX_DELTA_MS       = 100        // cap large gaps (tab switch, breakpoint)
const MAX_UPDATES_FRAME  = 3          // cap update iterations per RAF to prevent spiral

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

    // Fixed-timestep update loop — capped to prevent the spiral of death.
    // Excess accumulator carries over naturally; MAX_DELTA_MS already bounds worst-case lag.
    let updates = 0
    while (this.accumulator >= TICK_MS && updates < MAX_UPDATES_FRAME) {
      this.updateFn(TICK_MS / 1000)
      this.accumulator -= TICK_MS
      updates++
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
