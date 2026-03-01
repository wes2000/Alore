import {
  BiomeType, TileType, ChunkState, ResourceNodeState, ResourceNodeType,
} from '../data/types'
import {
  BIOME_LOOKUP, PEAK_ELEVATION_THRESHOLD, WATER_ELEVATION_THRESHOLD,
  DEEP_WATER_ELEVATION_THRESHOLD, BIOME_DEFINITIONS,
} from '../data/biomes'
import { WorldNoise, SeededRandom, chunkSeed } from './noise'

export const CHUNK_SIZE = 16  // tiles per chunk side

/** Determine biome from noise values + distance-from-spawn weighting */
export function sampleBiome(
  temperature: number,
  moisture: number,
  elevation: number,
  distanceFromSpawn: number
): BiomeType {
  // Elevation overrides first
  if (elevation > PEAK_ELEVATION_THRESHOLD) return BiomeType.Peaks
  if (elevation < DEEP_WATER_ELEVATION_THRESHOLD) return BiomeType.DeepWater
  if (elevation < WATER_ELEVATION_THRESHOLD) return BiomeType.ShallowWater

  // Distance-from-spawn pushes dangerous biomes to be further away.
  // Target mild-temp (0.45) + low-moisture (0.2) → BIOME_LOOKUP[1][0] = Plains near spawn.
  const distFactor = Math.min(distanceFromSpawn / 600, 1)
  const blendedTemp = temperature * distFactor + 0.45 * (1 - distFactor)
  const blendedMoist = moisture * distFactor + 0.2 * (1 - distFactor)

  const tempIdx  = blendedTemp  < 0.33 ? 0 : blendedTemp  < 0.66 ? 1 : 2
  const moistIdx = blendedMoist < 0.33 ? 0 : blendedMoist < 0.66 ? 1 : 2

  return BIOME_LOOKUP[tempIdx][moistIdx]
}

/** Get the primary tile type for a given biome + detail noise value */
export function getTileForBiome(biome: BiomeType, detail: number): TileType {
  const def = BIOME_DEFINITIONS[biome]
  const variants = def.tileVariants
  // Use detail noise to pick from variants (weighted toward first)
  const idx = detail < 0.6 ? 0 : detail < 0.8 ? 1 : detail < 0.92 ? 2 : Math.min(3, variants.length - 1)
  return variants[idx]
}

/** Generate resource nodes for a chunk */
function generateResourceNodes(
  cx: number, cy: number,
  biome: BiomeType,
  tiles: number[][],
  rng: SeededRandom,
  worldSeed: number
): ResourceNodeState[] {
  const nodes: ResourceNodeState[] = []
  const def = BIOME_DEFINITIONS[biome]
  let nodeId = 0
  const occupied = new Set<string>()   // track tiles that already have a node

  for (const entry of def.resourceTable) {
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        // Only one resource node per tile
        const tileKey = `${tx}_${ty}`
        if (occupied.has(tileKey)) continue

        // Cluster: bias placement near existing nodes
        let density = entry.density
        if (entry.cluster && nodes.length > 0) {
          // check if a nearby node of same type exists
          const nearbyCount = nodes.filter(n =>
            n.type === entry.nodeType &&
            Math.abs(n.localX - tx) < 4 &&
            Math.abs(n.localY - ty) < 4
          ).length
          if (nearbyCount > 0) density *= 3
        }

        if (rng.nextBool(density)) {
          // Avoid placing on impassable tiles (water, mountains)
          const tileType = tiles[ty][tx] as unknown as TileType
          if (tileType === TileType.DeepWater || tileType === TileType.Mountain) continue

          // Fishing spots only near water tiles
          if (entry.nodeType === ResourceNodeType.FishingSpot) {
            const hasNearbyWater = checkNearbyWater(tiles, tx, ty)
            if (!hasNearbyWater) continue
          }

          occupied.add(tileKey)
          nodes.push({
            id: `${cx}_${cy}_${nodeId++}`,
            type: entry.nodeType,
            localX: tx,
            localY: ty,
            depleted: false,
            respawnAt: 0,
          })
        }
      }
    }
  }

  return nodes
}

function checkNearbyWater(tiles: number[][], tx: number, ty: number): boolean {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = tx + dx
      const ny = ty + dy
      if (nx < 0 || ny < 0 || nx >= CHUNK_SIZE || ny >= CHUNK_SIZE) continue
      if ((tiles[ny][nx] as unknown as TileType) === TileType.Water || (tiles[ny][nx] as unknown as TileType) === TileType.DeepWater) return true
    }
  }
  return false
}

/** Full chunk generation */
export function generateChunk(
  cx: number, cy: number,
  worldSeed: number,
  noise: WorldNoise
): ChunkState {
  const rng = new SeededRandom(chunkSeed(worldSeed, cx, cy))

  // World-space tile coordinates for noise sampling
  const tileOriginX = cx * CHUNK_SIZE
  const tileOriginY = cy * CHUNK_SIZE

  // Sample biome at chunk center for the primary biome
  const centerWX = tileOriginX + CHUNK_SIZE / 2
  const centerWY = tileOriginY + CHUNK_SIZE / 2
  const distFromSpawn = Math.sqrt(centerWX * centerWX + centerWY * centerWY)

  const temp  = noise.getTemperature(centerWX, centerWY)
  const moist = noise.getMoisture(centerWX, centerWY)
  const elev  = noise.getElevation(centerWX, centerWY)
  const primaryBiome = sampleBiome(temp, moist, elev, distFromSpawn)

  // Generate per-tile data
  const tiles: number[][] = []
  for (let ty = 0; ty < CHUNK_SIZE; ty++) {
    const row: number[] = []
    for (let tx = 0; tx < CHUNK_SIZE; tx++) {
      const wx = tileOriginX + tx
      const wy = tileOriginY + ty
      const detail = noise.getDetail(wx, wy)

      // Per-tile biome may differ slightly at chunk edges (biome blending)
      const t  = noise.getTemperature(wx, wy)
      const m  = noise.getMoisture(wx, wy)
      const e  = noise.getElevation(wx, wy)
      const dist = Math.sqrt(wx * wx + wy * wy)
      const tileBiome = sampleBiome(t, m, e, dist)
      const tile = getTileForBiome(tileBiome, detail)
      row.push(tile as unknown as number)
    }
    tiles.push(row)
  }

  const resourceNodes = generateResourceNodes(cx, cy, primaryBiome, tiles, rng, worldSeed)

  return {
    cx,
    cy,
    biome: primaryBiome,
    tiles: tiles as unknown as number[][],
    resourceNodes,
    seed: chunkSeed(worldSeed, cx, cy),
  }
}
