import {
  BiomeType, BiomeDefinition, TileType,
  ResourceNodeType, SkillType,
} from './types'

// Temperature (0=cold, 1=hot) × Moisture (0=arid, 1=wet) biome lookup
// This 2D table is indexed by quantized [temp][moisture]
export const BIOME_LOOKUP: BiomeType[][] = [
  // temp=0 (cold)
  [BiomeType.Tundra, BiomeType.Taiga, BiomeType.Snowfield],
  // temp=1 (mild)
  [BiomeType.Plains, BiomeType.Forest, BiomeType.Swamp],
  // temp=2 (hot)
  [BiomeType.Desert, BiomeType.Savanna, BiomeType.Rainforest],
]

// Extreme elevation override
export const PEAK_ELEVATION_THRESHOLD = 0.78
export const WATER_ELEVATION_THRESHOLD = 0.32
export const DEEP_WATER_ELEVATION_THRESHOLD = 0.18

export const BIOME_DEFINITIONS: Record<BiomeType, BiomeDefinition> = {
  [BiomeType.Plains]: {
    type: BiomeType.Plains,
    name: 'Verdant Plains',
    color: '#5a9e38',
    accentColor: '#7ec850',
    fogColor: '#a8d878',
    ambientLight: 1.0,
    dangerLevel: 1,
    tileVariants: [TileType.Grass, TileType.Grass, TileType.Grass, TileType.Flower],
    resourceTable: [
      { nodeType: ResourceNodeType.HerbPatch, density: 0.06, cluster: true, respawnMinutes: 12, elite: false },
      { nodeType: ResourceNodeType.CopperOre, density: 0.02, cluster: false, respawnMinutes: 20, elite: false },
      { nodeType: ResourceNodeType.OakTree, density: 0.04, cluster: true, respawnMinutes: 8, elite: false },
      { nodeType: ResourceNodeType.FishingSpot, density: 0.01, cluster: false, respawnMinutes: 0, elite: false },
    ],
    mobSpawnTable: [
      { mobId: 'grass_slime', weight: 40, minLevel: 1, maxLevel: 5 },
      { mobId: 'wild_boar', weight: 30, minLevel: 2, maxLevel: 6 },
      { mobId: 'hawk', weight: 20, minLevel: 3, maxLevel: 7 },
      { mobId: 'emberkit', weight: 10, minLevel: 4, maxLevel: 8 },
    ],
  },
  [BiomeType.Forest]: {
    type: BiomeType.Forest,
    name: 'Ancient Forest',
    color: '#2a5c2a',
    accentColor: '#3d7a3d',
    fogColor: '#4a7a40',
    ambientLight: 0.75,
    dangerLevel: 2,
    tileVariants: [TileType.DenseTree, TileType.Tree, TileType.Grass, TileType.Mushroom],
    resourceTable: [
      { nodeType: ResourceNodeType.OakTree, density: 0.18, cluster: true, respawnMinutes: 8, elite: false },
      { nodeType: ResourceNodeType.BirchTree, density: 0.08, cluster: true, respawnMinutes: 10, elite: false },
      { nodeType: ResourceNodeType.MushroomCluster, density: 0.05, cluster: true, respawnMinutes: 15, elite: false },
      { nodeType: ResourceNodeType.HerbPatch, density: 0.04, cluster: false, respawnMinutes: 12, elite: false },
      { nodeType: ResourceNodeType.CopperOre, density: 0.025, cluster: false, respawnMinutes: 20, elite: false },
    ],
    mobSpawnTable: [
      { mobId: 'forest_sprite', weight: 35, minLevel: 4, maxLevel: 10 },
      { mobId: 'great_wolf', weight: 30, minLevel: 5, maxLevel: 12 },
      { mobId: 'shadow_imp', weight: 20, minLevel: 6, maxLevel: 14 },
      { mobId: 'fawn', weight: 15, minLevel: 3, maxLevel: 8 },
    ],
  },
  [BiomeType.Desert]: {
    type: BiomeType.Desert,
    name: 'Scorched Desert',
    color: '#d4a044',
    accentColor: '#e8c97d',
    fogColor: '#f0d898',
    ambientLight: 1.0,
    dangerLevel: 3,
    tileVariants: [TileType.Sand, TileType.Sand, TileType.CactusGround, TileType.Stone],
    resourceTable: [
      { nodeType: ResourceNodeType.CopperOre, density: 0.04, cluster: false, respawnMinutes: 20, elite: false },
      { nodeType: ResourceNodeType.IronOre, density: 0.02, cluster: false, respawnMinutes: 25, elite: false },
      { nodeType: ResourceNodeType.HerbPatch, density: 0.02, cluster: false, respawnMinutes: 20, elite: false, skillReq: { skill: SkillType.Foraging, level: 15 } },
    ],
    mobSpawnTable: [
      { mobId: 'sand_crawler', weight: 40, minLevel: 8, maxLevel: 18 },
      { mobId: 'dust_wyrm', weight: 25, minLevel: 12, maxLevel: 22 },
      { mobId: 'scorpion', weight: 35, minLevel: 10, maxLevel: 20 },
    ],
  },
  [BiomeType.Savanna]: {
    type: BiomeType.Savanna,
    name: 'Golden Savanna',
    color: '#b08a34',
    accentColor: '#c4a35a',
    fogColor: '#d4b870',
    ambientLight: 0.95,
    dangerLevel: 2,
    tileVariants: [TileType.DryGrass, TileType.DryGrass, TileType.Sand, TileType.Grass],
    resourceTable: [
      { nodeType: ResourceNodeType.HerbPatch, density: 0.05, cluster: true, respawnMinutes: 12, elite: false },
      { nodeType: ResourceNodeType.OakTree, density: 0.03, cluster: false, respawnMinutes: 10, elite: false },
      { nodeType: ResourceNodeType.FishingSpot, density: 0.008, cluster: false, respawnMinutes: 0, elite: false },
    ],
    mobSpawnTable: [
      { mobId: 'grazer', weight: 35, minLevel: 4, maxLevel: 10 },
      { mobId: 'thunderbird', weight: 25, minLevel: 8, maxLevel: 16 },
      { mobId: 'mane_beast', weight: 40, minLevel: 6, maxLevel: 14 },
    ],
  },
  [BiomeType.Rainforest]: {
    type: BiomeType.Rainforest,
    name: 'Verdant Rainforest',
    color: '#1a4a20',
    accentColor: '#245a2a',
    fogColor: '#2a6030',
    ambientLight: 0.6,
    dangerLevel: 4,
    tileVariants: [TileType.DenseTree, TileType.DenseTree, TileType.Grass, TileType.Flower],
    resourceTable: [
      { nodeType: ResourceNodeType.OakTree, density: 0.2, cluster: true, respawnMinutes: 8, elite: false },
      { nodeType: ResourceNodeType.BirchTree, density: 0.12, cluster: true, respawnMinutes: 10, elite: false },
      { nodeType: ResourceNodeType.HerbPatch, density: 0.1, cluster: true, respawnMinutes: 10, elite: false, skillReq: { skill: SkillType.Foraging, level: 25 } },
      { nodeType: ResourceNodeType.MushroomCluster, density: 0.06, cluster: true, respawnMinutes: 15, elite: false },
    ],
    mobSpawnTable: [
      { mobId: 'jungle_spirit', weight: 30, minLevel: 20, maxLevel: 35 },
      { mobId: 'poison_fang', weight: 35, minLevel: 22, maxLevel: 38 },
      { mobId: 'shadow_panther', weight: 35, minLevel: 25, maxLevel: 40 },
    ],
  },
  [BiomeType.Swamp]: {
    type: BiomeType.Swamp,
    name: 'Murky Swamp',
    color: '#3a5030',
    accentColor: '#4a6040',
    fogColor: '#506040',
    ambientLight: 0.65,
    dangerLevel: 3,
    tileVariants: [TileType.Mud, TileType.DeepMud, TileType.Grass, TileType.Mushroom],
    resourceTable: [
      { nodeType: ResourceNodeType.WillowTree, density: 0.08, cluster: true, respawnMinutes: 10, elite: false },
      { nodeType: ResourceNodeType.MushroomCluster, density: 0.1, cluster: true, respawnMinutes: 12, elite: false },
      { nodeType: ResourceNodeType.HerbPatch, density: 0.08, cluster: true, respawnMinutes: 15, elite: false },
      { nodeType: ResourceNodeType.FishingSpot, density: 0.03, cluster: false, respawnMinutes: 0, elite: false },
    ],
    mobSpawnTable: [
      { mobId: 'bog_crawler', weight: 40, minLevel: 10, maxLevel: 20 },
      { mobId: 'swamp_wisp', weight: 30, minLevel: 12, maxLevel: 22 },
      { mobId: 'mud_golem', weight: 30, minLevel: 15, maxLevel: 25 },
    ],
  },
  [BiomeType.Tundra]: {
    type: BiomeType.Tundra,
    name: 'Frozen Tundra',
    color: '#7a9aaa',
    accentColor: '#9ab4c4',
    fogColor: '#b4ccd8',
    ambientLight: 0.9,
    dangerLevel: 3,
    tileVariants: [TileType.TundraGround, TileType.Ice, TileType.Snow, TileType.Rock],
    resourceTable: [
      { nodeType: ResourceNodeType.IronOre, density: 0.04, cluster: false, respawnMinutes: 25, elite: false },
      { nodeType: ResourceNodeType.MithrilOre, density: 0.01, cluster: false, respawnMinutes: 40, elite: false, skillReq: { skill: SkillType.Mining, level: 40 } },
      { nodeType: ResourceNodeType.HerbPatch, density: 0.02, cluster: false, respawnMinutes: 20, elite: false, skillReq: { skill: SkillType.Foraging, level: 30 } },
    ],
    mobSpawnTable: [
      { mobId: 'frost_wolf', weight: 40, minLevel: 18, maxLevel: 30 },
      { mobId: 'ice_sprite', weight: 35, minLevel: 20, maxLevel: 32 },
      { mobId: 'glacier_bear', weight: 25, minLevel: 22, maxLevel: 35 },
    ],
  },
  [BiomeType.Taiga]: {
    type: BiomeType.Taiga,
    name: 'Spruce Taiga',
    color: '#3a6040',
    accentColor: '#4a7a50',
    fogColor: '#5a8a60',
    ambientLight: 0.8,
    dangerLevel: 2,
    tileVariants: [TileType.Grass, TileType.DenseTree, TileType.Snow, TileType.Rock],
    resourceTable: [
      { nodeType: ResourceNodeType.OakTree, density: 0.12, cluster: true, respawnMinutes: 8, elite: false },
      { nodeType: ResourceNodeType.IronOre, density: 0.03, cluster: false, respawnMinutes: 22, elite: false },
      { nodeType: ResourceNodeType.HerbPatch, density: 0.03, cluster: false, respawnMinutes: 15, elite: false },
    ],
    mobSpawnTable: [
      { mobId: 'taiga_wolf', weight: 45, minLevel: 10, maxLevel: 20 },
      { mobId: 'frost_imp', weight: 30, minLevel: 12, maxLevel: 22 },
      { mobId: 'snow_bear', weight: 25, minLevel: 15, maxLevel: 25 },
    ],
  },
  [BiomeType.Snowfield]: {
    type: BiomeType.Snowfield,
    name: 'Endless Snowfield',
    color: '#cce0f0',
    accentColor: '#ddeeff',
    fogColor: '#eef6ff',
    ambientLight: 1.0,
    dangerLevel: 4,
    tileVariants: [TileType.Snow, TileType.Snow, TileType.Ice, TileType.TundraGround],
    resourceTable: [
      { nodeType: ResourceNodeType.IronOre, density: 0.02, cluster: false, respawnMinutes: 25, elite: false },
      { nodeType: ResourceNodeType.MithrilOre, density: 0.015, cluster: false, respawnMinutes: 40, elite: false, skillReq: { skill: SkillType.Mining, level: 40 } },
    ],
    mobSpawnTable: [
      { mobId: 'blizzard_wraith', weight: 40, minLevel: 30, maxLevel: 45 },
      { mobId: 'frost_giant', weight: 35, minLevel: 35, maxLevel: 50 },
      { mobId: 'ice_dragon_spawn', weight: 25, minLevel: 40, maxLevel: 55 },
    ],
  },
  [BiomeType.Peaks]: {
    type: BiomeType.Peaks,
    name: 'Ancient Peaks',
    color: '#7a8a9a',
    accentColor: '#9aaaba',
    fogColor: '#c0d0e0',
    ambientLight: 0.95,
    dangerLevel: 5,
    tileVariants: [TileType.Rock, TileType.Mountain, TileType.Stone, TileType.Snow],
    resourceTable: [
      { nodeType: ResourceNodeType.IronOre, density: 0.05, cluster: true, respawnMinutes: 22, elite: false },
      { nodeType: ResourceNodeType.MithrilOre, density: 0.03, cluster: true, respawnMinutes: 40, elite: false, skillReq: { skill: SkillType.Mining, level: 40 } },
      { nodeType: ResourceNodeType.StoneBoulder, density: 0.08, cluster: true, respawnMinutes: 5, elite: false },
    ],
    mobSpawnTable: [
      { mobId: 'rock_golem', weight: 35, minLevel: 28, maxLevel: 45 },
      { mobId: 'mountain_dragon', weight: 30, minLevel: 35, maxLevel: 55 },
      { mobId: 'storm_eagle', weight: 35, minLevel: 30, maxLevel: 48 },
    ],
  },
  [BiomeType.ShallowWater]: {
    type: BiomeType.ShallowWater,
    name: 'Shallow Waters',
    color: '#4a90c8',
    accentColor: '#5aaad8',
    fogColor: '#80c0e8',
    ambientLight: 0.9,
    dangerLevel: 1,
    tileVariants: [TileType.Water],
    resourceTable: [
      { nodeType: ResourceNodeType.FishingSpot, density: 0.15, cluster: false, respawnMinutes: 0, elite: false },
    ],
    mobSpawnTable: [
      { mobId: 'river_sprite', weight: 60, minLevel: 2, maxLevel: 8 },
      { mobId: 'water_slime', weight: 40, minLevel: 1, maxLevel: 6 },
    ],
  },
  [BiomeType.DeepWater]: {
    type: BiomeType.DeepWater,
    name: 'Deep Waters',
    color: '#1a4a8a',
    accentColor: '#2a5a9a',
    fogColor: '#3a6aaa',
    ambientLight: 0.7,
    dangerLevel: 3,
    tileVariants: [TileType.DeepWater],
    resourceTable: [
      { nodeType: ResourceNodeType.FishingSpot, density: 0.08, cluster: false, respawnMinutes: 0, elite: false, skillReq: { skill: SkillType.Fishing, level: 20 } },
    ],
    mobSpawnTable: [
      { mobId: 'sea_drake', weight: 45, minLevel: 15, maxLevel: 28 },
      { mobId: 'kraken_spawn', weight: 30, minLevel: 20, maxLevel: 35 },
      { mobId: 'deep_leviathan', weight: 25, minLevel: 25, maxLevel: 40 },
    ],
  },
}

// Tile passability — true = impassable
export const TILE_IMPASSABLE: Partial<Record<TileType, boolean>> = {
  [TileType.DenseTree]: true,
  [TileType.Tree]: false,  // passable (just visual)
  [TileType.Mountain]: true,
  [TileType.DeepWater]: true,
  [TileType.Water]: true,
  [TileType.Rock]: false,  // passable boulders are separate entities
}

// Tile movement cost multiplier (base = 1.0)
export const TILE_MOVE_COST: Partial<Record<TileType, number>> = {
  [TileType.Mud]: 1.8,
  [TileType.DeepMud]: 2.4,
  [TileType.Sand]: 1.3,
  [TileType.Snow]: 1.4,
  [TileType.Ice]: 0.8,    // faster but less control
}

// Biome color for tile rendering (hex RGB as 0xRRGGBB)
export function getBiomeColor(biome: BiomeType): number {
  const def = BIOME_DEFINITIONS[biome]
  return parseInt(def.color.replace('#', ''), 16)
}

export function getTileColor(tile: TileType): number {
  const colors: Partial<Record<TileType, string>> = {
    [TileType.Grass]: '#5a9e38',
    [TileType.DryGrass]: '#b08a34',
    [TileType.Sand]: '#d4a044',
    [TileType.Stone]: '#7a7a8a',
    [TileType.Snow]: '#cce0f0',
    [TileType.Ice]: '#a0c8e8',
    [TileType.Mud]: '#6a5a3a',
    [TileType.DeepMud]: '#4a3a2a',
    [TileType.Water]: '#4a90c8',
    [TileType.DeepWater]: '#1a4a8a',
    [TileType.DenseTree]: '#1a4a1a',
    [TileType.Tree]: '#2a6a2a',
    [TileType.CactusGround]: '#c89040',
    [TileType.TundraGround]: '#8090a0',
    [TileType.Rock]: '#6a6a7a',
    [TileType.Mountain]: '#8a8a9a',
    [TileType.Flower]: '#68ae42',
    [TileType.Mushroom]: '#7a5a2a',
  }
  const hex = colors[tile] ?? '#444444'
  return parseInt(hex.replace('#', ''), 16)
}
