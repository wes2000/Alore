export type ObjectiveType = 'kill' | 'gather' | 'craft' | 'explore_biomes' | 'tame' | 'reach_level' | 'dungeon_clear' | 'raise_bond' | 'mine'

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
}
