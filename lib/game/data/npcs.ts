import { NPCDefinition, NPCRole } from './types'

export const NPC_INTERACT_RANGE = 2.5

export const NPC_DEFINITIONS: Record<string, NPCDefinition> = {
  // ─── Near Spawn (Plains) ────────────────────────────────────────────────────

  shopkeeper: {
    id: 'shopkeeper',
    name: 'Merchant Harlow',
    role: NPCRole.Shopkeeper,
    icon: '🛒',
    x: 4, y: -3,
    color: 0xFFCC00, accentColor: 0xFFEE88,
    dialogue: [
      {
        id: 'greet',
        text: "Welcome, traveller! I've got supplies for every occasion. Care to browse?",
        choices: [
          { label: 'Show me your wares', nextNodeId: null, action: 'open_shop' },
          { label: 'Not right now', nextNodeId: null },
        ],
      },
    ],
  },

  blacksmith: {
    id: 'blacksmith',
    name: 'Forgemaster Brynn',
    role: NPCRole.QuestGiver,
    icon: '🔨',
    x: 8, y: -1,
    color: 0xA04020, accentColor: 0xC06040,
    questIds: ['bs_bronze_basics', 'bs_iron_challenge', 'bs_steel_mastery', 'bs_mithril_legend'],
    dialogue: [
      {
        id: 'greet',
        text: "The forge runs hot today! I'm Brynn, master of metal. Bring me materials, and I'll teach you the secrets of the anvil.",
        choices: [
          { label: 'I want a challenge', nextNodeId: 'quests' },
          { label: 'Just passing through', nextNodeId: null },
        ],
      },
      {
        id: 'quests',
        text: 'Prove your worth at the forge. Complete my tasks and earn rare recipes!',
        choices: [
          { label: 'Accept the challenge', nextNodeId: null, action: 'start_quest' },
          { label: 'Maybe later', nextNodeId: null },
        ],
      },
    ],
  },

  // ─── Forest Biome ───────────────────────────────────────────────────────────

  ranger: {
    id: 'ranger',
    name: 'Ranger Elara',
    role: NPCRole.QuestGiver,
    icon: '🏹',
    x: 40, y: 30,
    color: 0x2E7D32, accentColor: 0x66BB6A,
    questIds: ['rg_forest_survey', 'rg_tame_the_wilds', 'rg_biome_master', 'rg_shadow_hunter'],
    dialogue: [
      {
        id: 'greet',
        text: "Shh... listen to the forest. I'm Elara. I track beasts and chart the unknown. Do you seek to learn the ways of the wild?",
        choices: [
          { label: 'I want to explore', nextNodeId: 'quests' },
          { label: 'Tell me about this place', nextNodeId: 'lore' },
          { label: 'Goodbye', nextNodeId: null },
        ],
      },
      {
        id: 'lore',
        text: 'These woods are ancient. Shadow creatures lurk in the deep thickets, and rare beasts hide in biomes most never reach. The world is vast — discover it.',
        choices: [
          { label: 'I want a quest', nextNodeId: 'quests' },
          { label: 'Farewell', nextNodeId: null },
        ],
      },
      {
        id: 'quests',
        text: "I have tasks for a willing explorer. The wilds won't map themselves!",
        choices: [
          { label: 'Sign me up', nextNodeId: null, action: 'start_quest' },
          { label: 'Not yet', nextNodeId: null },
        ],
      },
    ],
  },

  // ─── Peaks Biome ────────────────────────────────────────────────────────────

  wizard: {
    id: 'wizard',
    name: 'Archmage Thalos',
    role: NPCRole.QuestGiver,
    icon: '🧙',
    x: -35, y: -45,
    color: 0x6A1B9A, accentColor: 0xAB47BC,
    questIds: ['wz_arcane_initiate', 'wz_elemental_trial', 'wz_spell_weaver', 'wz_void_scholar'],
    dialogue: [
      {
        id: 'greet',
        text: "Ah, a visitor to my mountain sanctum. I am Thalos. The arcane arts require discipline — and courage. Are you prepared to learn?",
        choices: [
          { label: 'Teach me magic', nextNodeId: 'quests' },
          { label: 'What is this place?', nextNodeId: 'lore' },
          { label: 'I must go', nextNodeId: null },
        ],
      },
      {
        id: 'lore',
        text: "The peaks channel pure arcane energy. Spells are amplified here. Master the elements, and you'll command power beyond imagination.",
        choices: [
          { label: 'I want to train', nextNodeId: 'quests' },
          { label: 'Farewell', nextNodeId: null },
        ],
      },
      {
        id: 'quests',
        text: 'Very well. My trials are not for the faint of heart. Prove your magical prowess!',
        choices: [
          { label: 'Begin the trials', nextNodeId: null, action: 'start_quest' },
          { label: 'Another time', nextNodeId: null },
        ],
      },
    ],
  },

  // ─── Water / Fishing Spot ───────────────────────────────────────────────────

  fisherman: {
    id: 'fisherman',
    name: 'Old Man Cedric',
    role: NPCRole.QuestGiver,
    icon: '🎣',
    x: 20, y: -20,
    color: 0x1565C0, accentColor: 0x42A5F5,
    questIds: ['fs_first_catch', 'fs_big_haul', 'fs_rare_waters', 'fs_master_angler'],
    dialogue: [
      {
        id: 'greet',
        text: "Heh, another one drawn to the water? Name's Cedric. Been fishing these shores for decades. Pull up a rock and cast a line!",
        choices: [
          { label: 'Got any fishing jobs?', nextNodeId: 'quests' },
          { label: 'Any fishing tips?', nextNodeId: 'tips' },
          { label: 'See you around', nextNodeId: null },
        ],
      },
      {
        id: 'tips',
        text: "Best catches come from patience. Higher Fishing skill means faster reels. And if you find a Rare spot... don't tell anyone else!",
        choices: [
          { label: 'I want a quest', nextNodeId: 'quests' },
          { label: 'Thanks, bye', nextNodeId: null },
        ],
      },
      {
        id: 'quests',
        text: "I need a hand bringing in the catch. Help me out and I'll make it worth your while!",
        choices: [
          { label: "Let's fish", nextNodeId: null, action: 'start_quest' },
          { label: 'Maybe later', nextNodeId: null },
        ],
      },
    ],
  },

  // ─── Swamp Biome ────────────────────────────────────────────────────────────

  hermit: {
    id: 'hermit',
    name: 'Mira the Herbalist',
    role: NPCRole.QuestGiver,
    icon: '🧪',
    x: -25, y: 35,
    color: 0x4A148C, accentColor: 0x7B1FA2,
    questIds: ['hm_herb_gathering', 'hm_mushroom_hunt', 'hm_potion_mastery', 'hm_swamp_secrets'],
    dialogue: [
      {
        id: 'greet',
        text: "Watch your step in the bog. I'm Mira. I brew remedies from the swamp's bounty. Interested in the alchemical arts?",
        choices: [
          { label: 'I want to learn alchemy', nextNodeId: 'quests' },
          { label: 'What grows here?', nextNodeId: 'lore' },
          { label: 'Goodbye', nextNodeId: null },
        ],
      },
      {
        id: 'lore',
        text: "The swamp is rich with rare herbs and fungi. Dangerous too — but the best ingredients come from the most treacherous places.",
        choices: [
          { label: 'Give me a task', nextNodeId: 'quests' },
          { label: 'Farewell', nextNodeId: null },
        ],
      },
      {
        id: 'quests',
        text: "Gather what I need and I'll share my recipes. The swamp rewards the diligent!",
        choices: [
          { label: 'Count me in', nextNodeId: null, action: 'start_quest' },
          { label: 'Not now', nextNodeId: null },
        ],
      },
    ],
  },
}

/** Get all NPC definitions as an array */
export function getAllNPCs(): NPCDefinition[] {
  return Object.values(NPC_DEFINITIONS)
}
