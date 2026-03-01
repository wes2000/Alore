export type ObjectiveType = 'kill' | 'gather' | 'craft' | 'explore_biomes' | 'tame' | 'reach_level' | 'dungeon_clear' | 'raise_bond' | 'mine' | 'talk_to_npc'

export interface QuestObjective {
  id: string
  type: ObjectiveType
  description: string
  target: string        // mob id, item id, biome type, skill type, etc.
  required: number      // how many
}

export interface QuestReward {
  xp?: { skill: string; amount: number }[]
  items?: { itemId: string; quantity: number }[]
  goldBonus?: number
  unlocksEvolution?: string  // pet definition id that can now evolve
  unlocksRecipe?: string     // recipe id unlocked on completion
}

export interface QuestDefinition {
  id: string
  name: string
  description: string
  objectives: QuestObjective[]
  rewards: QuestReward
  prerequisites?: string[]   // quest IDs that must be completed first
  autoStart?: boolean        // auto-start for new players
}

export const QUESTS: Record<string, QuestDefinition> = {
  // ─── Intro Quests ────────────────────────────────────────────────────────
  intro_the_world: {
    id: 'intro_the_world',
    name: 'Explore the World',
    description: 'Discover 5 different biomes to earn Exploration experience.',
    objectives: [
      { id: 'explore_biomes', type: 'explore_biomes', description: 'Discover 5 biomes', target: 'any', required: 5 },
    ],
    rewards: {
      xp: [{ skill: 'Exploration', amount: 500 }],
    },
    autoStart: true,
  },

  first_forge: {
    id: 'first_forge',
    name: 'The First Forge',
    description: 'Craft any item using Smithing.',
    objectives: [
      { id: 'craft_smithing', type: 'craft', description: 'Craft via Smithing', target: 'Smithing', required: 1 },
    ],
    rewards: {
      xp: [{ skill: 'Smithing', amount: 500 }],
      items: [{ itemId: 'bronze_sword', quantity: 1 }],
    },
    autoStart: true,
  },

  dungeon_first_blood: {
    id: 'dungeon_first_blood',
    name: 'Dungeon First Blood',
    description: 'Clear a tier-1 dungeon boss.',
    objectives: [
      { id: 'clear_t1', type: 'dungeon_clear', description: 'Clear a tier 1 dungeon', target: '1', required: 1 },
    ],
    rewards: {
      xp: [{ skill: 'Melee', amount: 1000 }],
      items: [{ itemId: 'iron_shield', quantity: 1 }],
    },
    autoStart: true,
  },

  pet_bond_trial: {
    id: 'pet_bond_trial',
    name: 'The Bond Trial',
    description: 'Raise any pet\'s bond to 75.',
    objectives: [
      { id: 'raise_bond', type: 'raise_bond', description: 'Raise pet bond to 75', target: 'any', required: 75 },
    ],
    rewards: {
      items: [{ itemId: 'beast_collar', quantity: 3 }],
    },
    autoStart: true,
  },

  // ─── Evolution Chain Quests ──────────────────────────────────────────────
  fire_apprentice: {
    id: 'fire_apprentice',
    name: 'Fire Apprentice',
    description: 'Tame an Emberkit to earn the Fire Shard.',
    objectives: [
      { id: 'tame_emberkit', type: 'tame', description: 'Tame an Emberkit', target: 'emberkit', required: 1 },
    ],
    rewards: {
      items: [{ itemId: 'fire_shard', quantity: 1 }],
      xp: [{ skill: 'Taming', amount: 200 }],
    },
    autoStart: true,
  },

  trial_of_flames: {
    id: 'trial_of_flames',
    name: 'Trial of Flames',
    description: 'With Blazefang as your active pet, defeat a tier-2 dungeon boss to prove your bond and unlock Cinderwyrm evolution.',
    objectives: [
      { id: 'clear_t2_with_blazefang', type: 'dungeon_clear', description: 'Clear tier-2 dungeon with Blazefang', target: '2', required: 1 },
    ],
    rewards: {
      unlocksEvolution: 'cinderwyrm',
      xp: [{ skill: 'Taming', amount: 800 }],
    },
    prerequisites: ['fire_apprentice'],
  },

  stone_heart_trial: {
    id: 'stone_heart_trial',
    name: 'Stone Heart Trial',
    description: 'With Stone Colossus at level 60, mine 100 ores in dungeons.',
    objectives: [
      { id: 'mine_dungeon_ores', type: 'mine', description: 'Mine 100 dungeon ores', target: 'dungeon', required: 100 },
    ],
    rewards: {
      unlocksEvolution: 'titan_golem',
      xp: [{ skill: 'Mining', amount: 1500 }],
    },
  },

  storm_caller: {
    id: 'storm_caller',
    name: 'Storm Caller',
    description: 'Tame a Storm Eagle and reach Ranged level 30.',
    objectives: [
      { id: 'tame_storm_eagle', type: 'tame', description: 'Tame a Storm Eagle', target: 'storm_eagle', required: 1 },
      { id: 'ranged_30', type: 'reach_level', description: 'Reach Ranged 30', target: 'Ranged', required: 30 },
    ],
    rewards: {
      unlocksEvolution: 'thunder_roc',
      xp: [{ skill: 'Ranged', amount: 800 }],
    },
  },

  shadow_pursuit: {
    id: 'shadow_pursuit',
    name: 'Shadow Pursuit',
    description: 'Defeat 50 shadow-element mobs with Shadow Wolf active.',
    objectives: [
      { id: 'kill_shadow_mobs', type: 'kill', description: 'Defeat shadow mobs with Shadow Wolf', target: 'shadow', required: 50 },
    ],
    rewards: {
      unlocksEvolution: 'phantom_wolf',
      xp: [{ skill: 'Melee', amount: 600 }],
    },
  },

  // ─── Blacksmith Quests (Forgemaster Brynn) ────────────────────────────────

  bs_bronze_basics: {
    id: 'bs_bronze_basics',
    name: 'Bronze Basics',
    description: 'Smelt 5 bronze bars to prove your mettle at the forge.',
    objectives: [
      { id: 'craft_bronze', type: 'craft', description: 'Craft 5 Bronze Bars', target: 'Smithing', required: 5 },
    ],
    rewards: {
      xp: [{ skill: 'Smithing', amount: 300 }],
      goldBonus: 100,
    },
  },

  bs_iron_challenge: {
    id: 'bs_iron_challenge',
    name: 'Iron Challenge',
    description: 'Mine 30 iron ore and craft an iron sword.',
    objectives: [
      { id: 'mine_iron', type: 'gather', description: 'Gather 30 Iron Ore', target: 'iron_ore', required: 30 },
      { id: 'craft_iron_sword', type: 'craft', description: 'Craft via Smithing', target: 'Smithing', required: 3 },
    ],
    rewards: {
      xp: [{ skill: 'Smithing', amount: 600 }, { skill: 'Mining', amount: 400 }],
      items: [{ itemId: 'iron_sword', quantity: 1 }],
    },
    prerequisites: ['bs_bronze_basics'],
  },

  bs_steel_mastery: {
    id: 'bs_steel_mastery',
    name: 'Steel Mastery',
    description: 'Reach Smithing level 25 and craft 10 items.',
    objectives: [
      { id: 'smithing_25', type: 'reach_level', description: 'Reach Smithing 25', target: 'Smithing', required: 25 },
      { id: 'craft_10', type: 'craft', description: 'Craft 10 Smithing items', target: 'Smithing', required: 10 },
    ],
    rewards: {
      xp: [{ skill: 'Smithing', amount: 1200 }],
      goldBonus: 500,
    },
    prerequisites: ['bs_iron_challenge'],
  },

  bs_mithril_legend: {
    id: 'bs_mithril_legend',
    name: 'Mithril Legend',
    description: 'Mine 20 Mithril Ore and reach Smithing 40.',
    objectives: [
      { id: 'mine_mithril', type: 'gather', description: 'Gather 20 Mithril Ore', target: 'mithril_ore', required: 20 },
      { id: 'smithing_40', type: 'reach_level', description: 'Reach Smithing 40', target: 'Smithing', required: 40 },
    ],
    rewards: {
      xp: [{ skill: 'Smithing', amount: 2000 }],
      items: [{ itemId: 'mithril_bar', quantity: 5 }],
      goldBonus: 1000,
    },
    prerequisites: ['bs_steel_mastery'],
  },

  // ─── Ranger Quests (Ranger Elara) ─────────────────────────────────────────

  rg_forest_survey: {
    id: 'rg_forest_survey',
    name: 'Forest Survey',
    description: 'Explore 3 biomes and defeat 10 forest creatures.',
    objectives: [
      { id: 'explore_3', type: 'explore_biomes', description: 'Discover 3 biomes', target: 'any', required: 3 },
      { id: 'kill_forest', type: 'kill', description: 'Defeat 10 forest mobs', target: 'forest_sprite', required: 10 },
    ],
    rewards: {
      xp: [{ skill: 'Exploration', amount: 400 }],
      items: [{ itemId: 'taming_snare', quantity: 5 }],
    },
  },

  rg_tame_the_wilds: {
    id: 'rg_tame_the_wilds',
    name: 'Tame the Wilds',
    description: 'Tame 3 different pets to build your menagerie.',
    objectives: [
      { id: 'tame_3', type: 'tame', description: 'Tame 3 pets', target: 'any', required: 3 },
    ],
    rewards: {
      xp: [{ skill: 'Taming', amount: 500 }],
      items: [{ itemId: 'beast_collar', quantity: 2 }],
    },
    prerequisites: ['rg_forest_survey'],
  },

  rg_biome_master: {
    id: 'rg_biome_master',
    name: 'Biome Master',
    description: 'Discover 8 different biomes across the world.',
    objectives: [
      { id: 'explore_8', type: 'explore_biomes', description: 'Discover 8 biomes', target: 'any', required: 8 },
    ],
    rewards: {
      xp: [{ skill: 'Exploration', amount: 1500 }],
      goldBonus: 750,
    },
    prerequisites: ['rg_tame_the_wilds'],
  },

  rg_shadow_hunter: {
    id: 'rg_shadow_hunter',
    name: 'Shadow Hunter',
    description: 'Defeat 25 shadow-element creatures lurking in the wilderness.',
    objectives: [
      { id: 'kill_shadows', type: 'kill', description: 'Defeat 25 shadow mobs', target: 'shadow_imp', required: 15 },
      { id: 'kill_wolves', type: 'kill', description: 'Defeat 10 great wolves', target: 'great_wolf', required: 10 },
    ],
    rewards: {
      xp: [{ skill: 'Melee', amount: 800 }, { skill: 'Exploration', amount: 600 }],
      items: [{ itemId: 'spirit_lure', quantity: 1 }],
    },
    prerequisites: ['rg_biome_master'],
  },

  // ─── Wizard Quests (Archmage Thalos) ──────────────────────────────────────

  wz_arcane_initiate: {
    id: 'wz_arcane_initiate',
    name: 'Arcane Initiate',
    description: 'Reach Magic level 10 to prove your potential.',
    objectives: [
      { id: 'magic_10', type: 'reach_level', description: 'Reach Magic 10', target: 'Magic', required: 10 },
    ],
    rewards: {
      xp: [{ skill: 'Magic', amount: 500 }],
      goldBonus: 200,
    },
  },

  wz_elemental_trial: {
    id: 'wz_elemental_trial',
    name: 'Elemental Trial',
    description: 'Defeat 20 mobs using magic attacks and reach Magic 20.',
    objectives: [
      { id: 'kill_with_magic', type: 'kill', description: 'Defeat 20 mobs', target: 'any', required: 20 },
      { id: 'magic_20', type: 'reach_level', description: 'Reach Magic 20', target: 'Magic', required: 20 },
    ],
    rewards: {
      xp: [{ skill: 'Magic', amount: 1000 }],
      items: [{ itemId: 'void_essence', quantity: 5 }],
    },
    prerequisites: ['wz_arcane_initiate'],
  },

  wz_spell_weaver: {
    id: 'wz_spell_weaver',
    name: 'Spell Weaver',
    description: 'Clear a tier-3 dungeon using magic and reach Magic 35.',
    objectives: [
      { id: 'clear_t3', type: 'dungeon_clear', description: 'Clear tier 3 dungeon', target: '3', required: 1 },
      { id: 'magic_35', type: 'reach_level', description: 'Reach Magic 35', target: 'Magic', required: 35 },
    ],
    rewards: {
      xp: [{ skill: 'Magic', amount: 2000 }],
      goldBonus: 1000,
    },
    prerequisites: ['wz_elemental_trial'],
  },

  wz_void_scholar: {
    id: 'wz_void_scholar',
    name: 'Void Scholar',
    description: 'Collect 15 Void Essence and reach Magic 50.',
    objectives: [
      { id: 'gather_void', type: 'gather', description: 'Gather 15 Void Essence', target: 'void_essence', required: 15 },
      { id: 'magic_50', type: 'reach_level', description: 'Reach Magic 50', target: 'Magic', required: 50 },
    ],
    rewards: {
      xp: [{ skill: 'Magic', amount: 3000 }],
      items: [{ itemId: 'void_essence', quantity: 10 }],
      goldBonus: 2000,
    },
    prerequisites: ['wz_spell_weaver'],
  },

  // ─── Fisherman Quests (Old Man Cedric) ────────────────────────────────────

  fs_first_catch: {
    id: 'fs_first_catch',
    name: 'First Catch',
    description: 'Catch 10 fish from any fishing spot.',
    objectives: [
      { id: 'catch_fish', type: 'gather', description: 'Catch 10 fish', target: 'raw_fish', required: 10 },
    ],
    rewards: {
      xp: [{ skill: 'Fishing', amount: 200 }],
      goldBonus: 50,
    },
  },

  fs_big_haul: {
    id: 'fs_big_haul',
    name: 'Big Haul',
    description: 'Catch 50 fish and reach Fishing level 15.',
    objectives: [
      { id: 'catch_50', type: 'gather', description: 'Catch 50 fish', target: 'raw_fish', required: 50 },
      { id: 'fishing_15', type: 'reach_level', description: 'Reach Fishing 15', target: 'Fishing', required: 15 },
    ],
    rewards: {
      xp: [{ skill: 'Fishing', amount: 600 }, { skill: 'Cooking', amount: 300 }],
      goldBonus: 300,
    },
    prerequisites: ['fs_first_catch'],
  },

  fs_rare_waters: {
    id: 'fs_rare_waters',
    name: 'Rare Waters',
    description: 'Reach Fishing 30 and explore 6 biomes to find rare spots.',
    objectives: [
      { id: 'fishing_30', type: 'reach_level', description: 'Reach Fishing 30', target: 'Fishing', required: 30 },
      { id: 'explore_6', type: 'explore_biomes', description: 'Discover 6 biomes', target: 'any', required: 6 },
    ],
    rewards: {
      xp: [{ skill: 'Fishing', amount: 1200 }],
      goldBonus: 800,
    },
    prerequisites: ['fs_big_haul'],
  },

  fs_master_angler: {
    id: 'fs_master_angler',
    name: 'Master Angler',
    description: 'Catch 200 fish and reach Fishing 50.',
    objectives: [
      { id: 'catch_200', type: 'gather', description: 'Catch 200 fish', target: 'raw_fish', required: 200 },
      { id: 'fishing_50', type: 'reach_level', description: 'Reach Fishing 50', target: 'Fishing', required: 50 },
    ],
    rewards: {
      xp: [{ skill: 'Fishing', amount: 3000 }],
      goldBonus: 2000,
    },
    prerequisites: ['fs_rare_waters'],
  },

  // ─── Hermit Quests (Mira the Herbalist) ───────────────────────────────────

  hm_herb_gathering: {
    id: 'hm_herb_gathering',
    name: 'Herb Gathering',
    description: 'Gather 20 herb bundles from the wilds.',
    objectives: [
      { id: 'gather_herbs', type: 'gather', description: 'Gather 20 herb bundles', target: 'herb_bundle', required: 20 },
    ],
    rewards: {
      xp: [{ skill: 'Foraging', amount: 300 }],
      items: [{ itemId: 'basic_herb', quantity: 10 }],
    },
  },

  hm_mushroom_hunt: {
    id: 'hm_mushroom_hunt',
    name: 'Mushroom Hunt',
    description: 'Collect 30 mushrooms and reach Foraging 15.',
    objectives: [
      { id: 'gather_shrooms', type: 'gather', description: 'Gather 30 mushrooms', target: 'mushroom', required: 30 },
      { id: 'foraging_15', type: 'reach_level', description: 'Reach Foraging 15', target: 'Foraging', required: 15 },
    ],
    rewards: {
      xp: [{ skill: 'Foraging', amount: 500 }, { skill: 'Alchemy', amount: 300 }],
      goldBonus: 200,
    },
    prerequisites: ['hm_herb_gathering'],
  },

  hm_potion_mastery: {
    id: 'hm_potion_mastery',
    name: 'Potion Mastery',
    description: 'Craft 10 potions via Alchemy and reach Alchemy 20.',
    objectives: [
      { id: 'craft_potions', type: 'craft', description: 'Craft 10 Alchemy items', target: 'Alchemy', required: 10 },
      { id: 'alchemy_20', type: 'reach_level', description: 'Reach Alchemy 20', target: 'Alchemy', required: 20 },
    ],
    rewards: {
      xp: [{ skill: 'Alchemy', amount: 1000 }],
      items: [{ itemId: 'hp_potion_l', quantity: 5 }],
    },
    prerequisites: ['hm_mushroom_hunt'],
  },

  hm_swamp_secrets: {
    id: 'hm_swamp_secrets',
    name: 'Swamp Secrets',
    description: 'Defeat 20 swamp creatures and reach Alchemy 35.',
    objectives: [
      { id: 'kill_swamp', type: 'kill', description: 'Defeat 20 swamp mobs', target: 'bog_crawler', required: 10 },
      { id: 'kill_wisps', type: 'kill', description: 'Defeat 10 swamp wisps', target: 'swamp_wisp', required: 10 },
      { id: 'alchemy_35', type: 'reach_level', description: 'Reach Alchemy 35', target: 'Alchemy', required: 35 },
    ],
    rewards: {
      xp: [{ skill: 'Alchemy', amount: 2000 }],
      items: [{ itemId: 'rare_herb', quantity: 10 }],
      goldBonus: 1500,
    },
    prerequisites: ['hm_potion_mastery'],
  },
}
