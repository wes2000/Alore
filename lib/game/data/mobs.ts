import { Element } from './types'

export interface DropEntry {
  itemId: string
  chance: number   // 0–1
  minQty: number
  maxQty: number
}

export interface MobDef {
  id: string
  name: string
  element: Element
  petDefId: string     // '' if not tameable
  tameable: boolean
  color: number        // THREE.js hex color (entity body)
  accentColor: number  // THREE.js hex (entity border)
  baseHp: number       // HP at level 1
  hpPerLevel: number   // HP added per level
  baseAtk: number      // ATK at level 1
  atkPerLevel: number  // ATK added per level
  baseSpd: number      // tiles/second (movement)
  drops: DropEntry[]
}

// Helper to build a drop entry
const drop = (itemId: string, chance: number, minQty = 1, maxQty = 1): DropEntry =>
  ({ itemId, chance, minQty, maxQty })

export const MOB_DEFINITIONS: Record<string, MobDef> = {
  // ─── Plains ────────────────────────────────────────────────────────────────
  grass_slime: {
    id: 'grass_slime', name: 'Grass Slime', element: Element.Earth,
    petDefId: 'grass_slime', tameable: true,
    color: 0x4a9a30, accentColor: 0x70c850,
    baseHp: 28, hpPerLevel: 8, baseAtk: 3, atkPerLevel: 1, baseSpd: 1.8,
    drops: [drop('slime_gel', 0.8, 1, 3), drop('basic_herb', 0.2)],
  },
  wild_boar: {
    id: 'wild_boar', name: 'Wild Boar', element: Element.Earth,
    petDefId: 'wild_boar', tameable: true,
    color: 0x7a4a28, accentColor: 0xa07040,
    baseHp: 45, hpPerLevel: 12, baseAtk: 6, atkPerLevel: 1.5, baseSpd: 2.8,
    drops: [drop('bone', 0.6, 1, 2), drop('beast_claw', 0.3)],
  },
  hawk: {
    id: 'hawk', name: 'Hawk', element: Element.Wind,
    petDefId: '', tameable: false,
    color: 0x8a6030, accentColor: 0xc09050,
    baseHp: 30, hpPerLevel: 7, baseAtk: 7, atkPerLevel: 2, baseSpd: 4.0,
    drops: [drop('feather', 0.9, 1, 3), drop('beast_claw', 0.15)],
  },
  emberkit: {
    id: 'emberkit', name: 'Emberkit', element: Element.Fire,
    petDefId: 'emberkit', tameable: true,
    color: 0xe05020, accentColor: 0xff8040,
    baseHp: 38, hpPerLevel: 9, baseAtk: 8, atkPerLevel: 2, baseSpd: 3.2,
    drops: [drop('slime_gel', 0.3), drop('feather', 0.2), drop('fire_shard', 0.02)],
  },

  // ─── Forest ────────────────────────────────────────────────────────────────
  forest_sprite: {
    id: 'forest_sprite', name: 'Forest Sprite', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0x30a040, accentColor: 0x60d060,
    baseHp: 55, hpPerLevel: 14, baseAtk: 9, atkPerLevel: 2, baseSpd: 2.5,
    drops: [drop('herb_bundle', 0.7, 1, 3), drop('mushroom', 0.5, 1, 2)],
  },
  great_wolf: {
    id: 'great_wolf', name: 'Great Wolf', element: Element.Shadow,
    petDefId: '', tameable: false,
    color: 0x404050, accentColor: 0x707080,
    baseHp: 75, hpPerLevel: 18, baseAtk: 14, atkPerLevel: 3, baseSpd: 3.8,
    drops: [drop('wolf_pelt', 0.7, 1, 2), drop('bone', 0.5), drop('beast_claw', 0.25)],
  },
  shadow_imp: {
    id: 'shadow_imp', name: 'Shadow Imp', element: Element.Shadow,
    petDefId: '', tameable: false,
    color: 0x3a1050, accentColor: 0x7040a0,
    baseHp: 50, hpPerLevel: 11, baseAtk: 12, atkPerLevel: 2.5, baseSpd: 3.0,
    drops: [drop('void_essence', 0.25), drop('bone', 0.4)],
  },
  fawn: {
    id: 'fawn', name: 'Fawn', element: Element.Earth,
    petDefId: 'fawn', tameable: true,
    color: 0xd4a870, accentColor: 0xf0c890,
    baseHp: 40, hpPerLevel: 8, baseAtk: 4, atkPerLevel: 0.5, baseSpd: 3.5,
    drops: [drop('bone', 0.4), drop('herb_bundle', 0.3)],
  },

  // ─── Desert ────────────────────────────────────────────────────────────────
  sand_crawler: {
    id: 'sand_crawler', name: 'Sand Crawler', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0xb08040, accentColor: 0xe0c060,
    baseHp: 70, hpPerLevel: 15, baseAtk: 11, atkPerLevel: 2, baseSpd: 2.0,
    drops: [drop('scale', 0.4, 1, 2), drop('stone', 0.6, 2, 4)],
  },
  dust_wyrm: {
    id: 'dust_wyrm', name: 'Dust Wyrm', element: Element.Wind,
    petDefId: '', tameable: false,
    color: 0xc89040, accentColor: 0xf0c060,
    baseHp: 90, hpPerLevel: 20, baseAtk: 16, atkPerLevel: 3, baseSpd: 3.5,
    drops: [drop('scale', 0.6, 1, 3), drop('bone', 0.4)],
  },
  scorpion: {
    id: 'scorpion', name: 'Scorpion', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0x804020, accentColor: 0xb06040,
    baseHp: 65, hpPerLevel: 14, baseAtk: 13, atkPerLevel: 2.5, baseSpd: 2.8,
    drops: [drop('beast_claw', 0.5, 1, 2), drop('scale', 0.3)],
  },

  // ─── Savanna ───────────────────────────────────────────────────────────────
  grazer: {
    id: 'grazer', name: 'Grazer', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0xc0a060, accentColor: 0xe0c080,
    baseHp: 55, hpPerLevel: 10, baseAtk: 8, atkPerLevel: 1.5, baseSpd: 3.0,
    drops: [drop('bone', 0.5), drop('beast_claw', 0.2)],
  },
  thunderbird: {
    id: 'thunderbird', name: 'Thunderbird', element: Element.Lightning,
    petDefId: '', tameable: false,
    color: 0xc0c020, accentColor: 0xf0f040,
    baseHp: 80, hpPerLevel: 17, baseAtk: 18, atkPerLevel: 3.5, baseSpd: 4.5,
    drops: [drop('feather', 0.8, 2, 4), drop('scale', 0.2)],
  },
  mane_beast: {
    id: 'mane_beast', name: 'Mane Beast', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0xa08040, accentColor: 0xc0a060,
    baseHp: 95, hpPerLevel: 22, baseAtk: 15, atkPerLevel: 3, baseSpd: 3.2,
    drops: [drop('wolf_pelt', 0.6, 1, 2), drop('bone', 0.5), drop('beast_claw', 0.35)],
  },

  // ─── Rainforest ────────────────────────────────────────────────────────────
  jungle_spirit: {
    id: 'jungle_spirit', name: 'Jungle Spirit', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0x205a20, accentColor: 0x40a040,
    baseHp: 140, hpPerLevel: 30, baseAtk: 22, atkPerLevel: 4, baseSpd: 2.8,
    drops: [drop('herb_bundle', 0.8, 2, 5), drop('void_essence', 0.15)],
  },
  poison_fang: {
    id: 'poison_fang', name: 'Poison Fang', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0x507020, accentColor: 0x80a040,
    baseHp: 120, hpPerLevel: 25, baseAtk: 28, atkPerLevel: 5, baseSpd: 4.0,
    drops: [drop('scale', 0.6, 2, 4), drop('beast_claw', 0.4)],
  },
  shadow_panther: {
    id: 'shadow_panther', name: 'Shadow Panther', element: Element.Shadow,
    petDefId: '', tameable: false,
    color: 0x101820, accentColor: 0x304050,
    baseHp: 160, hpPerLevel: 35, baseAtk: 32, atkPerLevel: 6, baseSpd: 5.0,
    drops: [drop('void_essence', 0.4, 1, 2), drop('wolf_pelt', 0.5, 1, 2)],
  },

  // ─── Swamp ─────────────────────────────────────────────────────────────────
  bog_crawler: {
    id: 'bog_crawler', name: 'Bog Crawler', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x386028, accentColor: 0x588040,
    baseHp: 85, hpPerLevel: 18, baseAtk: 13, atkPerLevel: 2.5, baseSpd: 1.8,
    drops: [drop('slime_gel', 0.8, 2, 4), drop('mushroom', 0.4, 1, 3)],
  },
  swamp_wisp: {
    id: 'swamp_wisp', name: 'Swamp Wisp', element: Element.Shadow,
    petDefId: '', tameable: false,
    color: 0x40805a, accentColor: 0x60b080,
    baseHp: 70, hpPerLevel: 14, baseAtk: 18, atkPerLevel: 3, baseSpd: 3.5,
    drops: [drop('void_essence', 0.3), drop('herb_bundle', 0.5, 1, 2)],
  },
  mud_golem: {
    id: 'mud_golem', name: 'Mud Golem', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0x5a4028, accentColor: 0x806040,
    baseHp: 130, hpPerLevel: 28, baseAtk: 16, atkPerLevel: 2.5, baseSpd: 1.5,
    drops: [drop('stone', 0.8, 3, 6), drop('slime_gel', 0.5, 1, 2)],
  },

  // ─── Tundra ────────────────────────────────────────────────────────────────
  frost_wolf: {
    id: 'frost_wolf', name: 'Frost Wolf', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x8090b8, accentColor: 0xb0c0e0,
    baseHp: 120, hpPerLevel: 25, baseAtk: 20, atkPerLevel: 4, baseSpd: 4.0,
    drops: [drop('wolf_pelt', 0.7, 1, 2), drop('bone', 0.5)],
  },
  ice_sprite: {
    id: 'ice_sprite', name: 'Ice Sprite', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0xa0c8e8, accentColor: 0xd0e8ff,
    baseHp: 90, hpPerLevel: 18, baseAtk: 22, atkPerLevel: 4, baseSpd: 3.0,
    drops: [drop('void_essence', 0.2), drop('herb_bundle', 0.3)],
  },
  glacier_bear: {
    id: 'glacier_bear', name: 'Glacier Bear', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0x809098, accentColor: 0xa0b0b8,
    baseHp: 200, hpPerLevel: 45, baseAtk: 25, atkPerLevel: 4, baseSpd: 2.5,
    drops: [drop('wolf_pelt', 0.8, 2, 3), drop('beast_claw', 0.5), drop('bone', 0.7)],
  },

  // ─── Taiga ─────────────────────────────────────────────────────────────────
  taiga_wolf: {
    id: 'taiga_wolf', name: 'Taiga Wolf', element: Element.Shadow,
    petDefId: '', tameable: false,
    color: 0x506070, accentColor: 0x708090,
    baseHp: 80, hpPerLevel: 18, baseAtk: 17, atkPerLevel: 3, baseSpd: 4.2,
    drops: [drop('wolf_pelt', 0.6, 1, 2), drop('beast_claw', 0.35)],
  },
  frost_imp: {
    id: 'frost_imp', name: 'Frost Imp', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x5878b8, accentColor: 0x88aae8,
    baseHp: 70, hpPerLevel: 14, baseAtk: 20, atkPerLevel: 3.5, baseSpd: 3.2,
    drops: [drop('void_essence', 0.3), drop('bone', 0.4)],
  },
  snow_bear: {
    id: 'snow_bear', name: 'Snow Bear', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0xd0d8e0, accentColor: 0xf0f4f8,
    baseHp: 160, hpPerLevel: 35, baseAtk: 22, atkPerLevel: 3.5, baseSpd: 2.8,
    drops: [drop('wolf_pelt', 0.75, 1, 3), drop('bone', 0.6, 1, 2)],
  },

  // ─── Snowfield ─────────────────────────────────────────────────────────────
  blizzard_wraith: {
    id: 'blizzard_wraith', name: 'Blizzard Wraith', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0xb0c8e8, accentColor: 0xe0f0ff,
    baseHp: 200, hpPerLevel: 40, baseAtk: 35, atkPerLevel: 6, baseSpd: 3.8,
    drops: [drop('void_essence', 0.5, 1, 2), drop('scale', 0.35)],
  },
  frost_giant: {
    id: 'frost_giant', name: 'Frost Giant', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x6090b0, accentColor: 0x90c0e0,
    baseHp: 350, hpPerLevel: 70, baseAtk: 40, atkPerLevel: 7, baseSpd: 2.0,
    drops: [drop('bone', 0.8, 2, 4), drop('stone', 0.9, 4, 8), drop('void_essence', 0.2)],
  },
  ice_dragon_spawn: {
    id: 'ice_dragon_spawn', name: 'Ice Dragon Spawn', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x4080c0, accentColor: 0x70b0f0,
    baseHp: 280, hpPerLevel: 55, baseAtk: 45, atkPerLevel: 8, baseSpd: 3.5,
    drops: [drop('scale', 0.8, 2, 5), drop('void_essence', 0.4, 1, 2)],
  },

  // ─── Peaks ─────────────────────────────────────────────────────────────────
  rock_golem: {
    id: 'rock_golem', name: 'Rock Golem', element: Element.Earth,
    petDefId: '', tameable: false,
    color: 0x6a6a5a, accentColor: 0x9a9a8a,
    baseHp: 250, hpPerLevel: 55, baseAtk: 30, atkPerLevel: 5, baseSpd: 1.5,
    drops: [drop('stone', 0.9, 5, 10), drop('iron_ore', 0.4, 1, 2), drop('copper_ore', 0.5, 1, 3)],
  },
  mountain_dragon: {
    id: 'mountain_dragon', name: 'Mountain Dragon', element: Element.Fire,
    petDefId: '', tameable: false,
    color: 0x802010, accentColor: 0xc04020,
    baseHp: 400, hpPerLevel: 80, baseAtk: 55, atkPerLevel: 9, baseSpd: 3.0,
    drops: [drop('scale', 0.9, 3, 6), drop('void_essence', 0.5, 1, 3), drop('fire_shard', 0.05)],
  },
  storm_eagle: {
    id: 'storm_eagle', name: 'Storm Eagle', element: Element.Lightning,
    petDefId: 'storm_eagle', tameable: true,
    color: 0xc8c820, accentColor: 0xf8f840,
    baseHp: 180, hpPerLevel: 38, baseAtk: 38, atkPerLevel: 7, baseSpd: 5.5,
    drops: [drop('feather', 0.9, 3, 6), drop('scale', 0.3)],
  },

  // ─── Shallow Water ─────────────────────────────────────────────────────────
  river_sprite: {
    id: 'river_sprite', name: 'River Sprite', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x40a0d0, accentColor: 0x70d0ff,
    baseHp: 25, hpPerLevel: 5, baseAtk: 4, atkPerLevel: 1, baseSpd: 2.5,
    drops: [drop('raw_fish', 0.6, 1, 2), drop('herb_bundle', 0.2)],
  },
  water_slime: {
    id: 'water_slime', name: 'Water Slime', element: Element.Water,
    petDefId: 'water_slime', tameable: true,
    color: 0x4090c8, accentColor: 0x70c0ff,
    baseHp: 22, hpPerLevel: 6, baseAtk: 3, atkPerLevel: 0.8, baseSpd: 1.6,
    drops: [drop('slime_gel', 0.8, 1, 2)],
  },

  // ─── Deep Water ────────────────────────────────────────────────────────────
  sea_drake: {
    id: 'sea_drake', name: 'Sea Drake', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x104878, accentColor: 0x2070b0,
    baseHp: 150, hpPerLevel: 32, baseAtk: 28, atkPerLevel: 5, baseSpd: 3.5,
    drops: [drop('scale', 0.7, 2, 4), drop('raw_fish', 0.8, 2, 3)],
  },
  kraken_spawn: {
    id: 'kraken_spawn', name: 'Kraken Spawn', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x081838, accentColor: 0x103060,
    baseHp: 220, hpPerLevel: 45, baseAtk: 35, atkPerLevel: 6, baseSpd: 2.8,
    drops: [drop('scale', 0.8, 2, 5), drop('void_essence', 0.3)],
  },
  deep_leviathan: {
    id: 'deep_leviathan', name: 'Deep Leviathan', element: Element.Water,
    petDefId: '', tameable: false,
    color: 0x040c28, accentColor: 0x082040,
    baseHp: 350, hpPerLevel: 70, baseAtk: 50, atkPerLevel: 9, baseSpd: 4.0,
    drops: [drop('scale', 0.95, 4, 8), drop('void_essence', 0.6, 1, 3)],
  },
}
