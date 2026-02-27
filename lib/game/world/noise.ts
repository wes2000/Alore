/**
 * Deterministic 2D Perlin-style noise implementation.
 * No external dependencies. Seeded for reproducible world generation.
 */

// Permutation table helpers
function createPerm(seed: number): Uint8Array {
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)
  // Seeded LCG to fill p
  let s = seed >>> 0
  for (let i = 0; i < 256; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    p[i] = s & 0xff
  }
  // Duplicate for wrap-around
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  return perm
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a)
}
function grad2(hash: number, x: number, y: number): number {
  const h = hash & 7
  const u = h < 4 ? x : y
  const v = h < 4 ? y : x
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v)
}

export class PerlinNoise {
  private perm: Uint8Array

  constructor(seed: number) {
    this.perm = createPerm(seed)
  }

  sample(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = fade(xf)
    const v = fade(yf)
    const p = this.perm
    const a  = (p[X]     + Y) & 255
    const b  = (p[X + 1] + Y) & 255
    return lerp(
      lerp(grad2(p[a],     xf,     yf),     grad2(p[b],     xf - 1, yf),     u),
      lerp(grad2(p[a + 1], xf,     yf - 1), grad2(p[b + 1], xf - 1, yf - 1), u),
      v
    ) * 0.5 + 0.5  // remap -1..1 → 0..1
  }

  /** Fractal Brownian Motion — layered octaves for more natural terrain */
  fbm(x: number, y: number, octaves = 4, lacunarity = 2.0, gain = 0.5): number {
    let value = 0
    let amplitude = 1.0
    let frequency = 1.0
    let max = 0
    for (let i = 0; i < octaves; i++) {
      value += this.sample(x * frequency, y * frequency) * amplitude
      max += amplitude
      amplitude *= gain
      frequency *= lacunarity
    }
    return value / max
  }
}

/**
 * Multi-layer noise sampler for world generation.
 * Each layer uses a different seed offset for independence.
 */
export class WorldNoise {
  private temperature: PerlinNoise
  private moisture: PerlinNoise
  private elevation: PerlinNoise
  private detail: PerlinNoise
  private scatter: PerlinNoise

  constructor(worldSeed: number) {
    this.temperature = new PerlinNoise(worldSeed ^ 0x1a2b3c4d)
    this.moisture    = new PerlinNoise(worldSeed ^ 0x5e6f7a8b)
    this.elevation   = new PerlinNoise(worldSeed ^ 0x9c0d1e2f)
    this.detail      = new PerlinNoise(worldSeed ^ 0x3f4a5b6c)
    this.scatter     = new PerlinNoise(worldSeed ^ 0x7d8e9f00)
  }

  /** Temperature map 0..1 at large scale */
  getTemperature(wx: number, wy: number): number {
    return this.temperature.fbm(wx * 0.003, wy * 0.003, 3, 2.0, 0.6)
  }

  /** Moisture map 0..1 at large scale */
  getMoisture(wx: number, wy: number): number {
    return this.moisture.fbm(wx * 0.004, wy * 0.004, 3, 2.2, 0.55)
  }

  /** Elevation map 0..1 — drives water/mountain overrides */
  getElevation(wx: number, wy: number): number {
    return this.elevation.fbm(wx * 0.006, wy * 0.006, 5, 2.0, 0.5)
  }

  /** Fine-grain detail noise for tile-level variation */
  getDetail(wx: number, wy: number): number {
    return this.detail.sample(wx * 0.15, wy * 0.15)
  }

  /** Scatter noise for resource node placement — high frequency */
  getScatter(wx: number, wy: number): number {
    return this.scatter.sample(wx * 0.8, wy * 0.8)
  }
}

/** Cheap deterministic hash for per-chunk seed derivation */
export function chunkSeed(worldSeed: number, cx: number, cy: number): number {
  // XOR-based spatial hash
  let h = worldSeed ^ (cx * 73856093) ^ (cy * 19349663)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  return (h ^ (h >>> 16)) >>> 0
}

/** Seeded random number generator (LCG) for deterministic per-chunk content */
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0
    return this.state / 0x100000000
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  nextBool(probability: number): boolean {
    return this.next() < probability
  }

  /** Pick a weighted random entry from a table */
  weightedPick<T extends { weight: number }>(table: T[]): T {
    const total = table.reduce((sum, e) => sum + e.weight, 0)
    let r = this.next() * total
    for (const entry of table) {
      r -= entry.weight
      if (r <= 0) return entry
    }
    return table[table.length - 1]
  }
}
