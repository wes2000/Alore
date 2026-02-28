import { SkillType } from './types'

export interface RecipeIngredient {
  itemId: string
  quantity: number
}

export interface Recipe {
  id: string
  name: string
  skill: SkillType
  levelReq: number
  ingredients: RecipeIngredient[]
  outputId: string
  outputQty: number
  xp: number
}

export const RECIPES: Record<string, Recipe> = {
  // ─── Smithing: Smelting ──────────────────────────────────────────────────
  smelt_bronze: {
    id: 'smelt_bronze', name: 'Smelt Bronze Bar', skill: SkillType.Smithing, levelReq: 1,
    ingredients: [{ itemId: 'copper_ore', quantity: 2 }, { itemId: 'tin_ore', quantity: 1 }],
    outputId: 'bronze_bar', outputQty: 1, xp: 13,
  },
  smelt_iron: {
    id: 'smelt_iron', name: 'Smelt Iron Bar', skill: SkillType.Smithing, levelReq: 10,
    ingredients: [{ itemId: 'iron_ore', quantity: 3 }],
    outputId: 'iron_bar', outputQty: 1, xp: 25,
  },
  smelt_steel: {
    id: 'smelt_steel', name: 'Smelt Steel Bar', skill: SkillType.Smithing, levelReq: 20,
    ingredients: [{ itemId: 'iron_ore', quantity: 2 }, { itemId: 'coal', quantity: 2 }],
    outputId: 'steel_bar', outputQty: 1, xp: 38,
  },
  smelt_mithril: {
    id: 'smelt_mithril', name: 'Smelt Mithril Bar', skill: SkillType.Smithing, levelReq: 40,
    ingredients: [{ itemId: 'mithril_ore', quantity: 4 }],
    outputId: 'mithril_bar', outputQty: 1, xp: 80,
  },

  // ─── Smithing: Weapons & Armor ───────────────────────────────────────────
  forge_bronze_sword: {
    id: 'forge_bronze_sword', name: 'Forge Bronze Sword', skill: SkillType.Smithing, levelReq: 1,
    ingredients: [{ itemId: 'bronze_bar', quantity: 3 }],
    outputId: 'bronze_sword', outputQty: 1, xp: 25,
  },
  forge_iron_sword: {
    id: 'forge_iron_sword', name: 'Forge Iron Sword', skill: SkillType.Smithing, levelReq: 10,
    ingredients: [{ itemId: 'iron_bar', quantity: 4 }],
    outputId: 'iron_sword', outputQty: 1, xp: 50,
  },
  forge_steel_sword: {
    id: 'forge_steel_sword', name: 'Forge Steel Sword', skill: SkillType.Smithing, levelReq: 20,
    ingredients: [{ itemId: 'steel_bar', quantity: 5 }],
    outputId: 'steel_sword', outputQty: 1, xp: 80,
  },
  forge_iron_shield: {
    id: 'forge_iron_shield', name: 'Forge Iron Shield', skill: SkillType.Smithing, levelReq: 12,
    ingredients: [{ itemId: 'iron_bar', quantity: 5 }],
    outputId: 'iron_shield', outputQty: 1, xp: 55,
  },
  forge_iron_chainmail: {
    id: 'forge_iron_chainmail', name: 'Forge Iron Chainmail', skill: SkillType.Smithing, levelReq: 15,
    ingredients: [{ itemId: 'iron_bar', quantity: 6 }],
    outputId: 'iron_chainmail', outputQty: 1, xp: 65,
  },
  forge_steel_plate: {
    id: 'forge_steel_plate', name: 'Forge Steel Plate', skill: SkillType.Smithing, levelReq: 25,
    ingredients: [{ itemId: 'steel_bar', quantity: 7 }],
    outputId: 'steel_platebody', outputQty: 1, xp: 100,
  },
  forge_crossbow_bolts: {
    id: 'forge_crossbow_bolts', name: 'Forge Crossbow Bolts', skill: SkillType.Smithing, levelReq: 15,
    ingredients: [{ itemId: 'iron_bar', quantity: 1 }],
    outputId: 'crossbow_bolt', outputQty: 15, xp: 20,
  },

  // ─── Cooking ─────────────────────────────────────────────────────────────
  cook_shrimp: {
    id: 'cook_shrimp', name: 'Cook Shrimp', skill: SkillType.Cooking, levelReq: 1,
    ingredients: [{ itemId: 'raw_shrimp', quantity: 1 }],
    outputId: 'cooked_shrimp', outputQty: 1, xp: 15,
  },
  cook_fish: {
    id: 'cook_fish', name: 'Cook Fish', skill: SkillType.Cooking, levelReq: 1,
    ingredients: [{ itemId: 'raw_fish', quantity: 1 }],
    outputId: 'cooked_fish', outputQty: 1, xp: 20,
  },
  cook_trout: {
    id: 'cook_trout', name: 'Grill Trout', skill: SkillType.Cooking, levelReq: 10,
    ingredients: [{ itemId: 'raw_trout', quantity: 1 }],
    outputId: 'grilled_trout', outputQty: 1, xp: 40,
  },
  cook_salmon: {
    id: 'cook_salmon', name: 'Cook Salmon', skill: SkillType.Cooking, levelReq: 20,
    ingredients: [{ itemId: 'raw_salmon', quantity: 1 }],
    outputId: 'cooked_salmon', outputQty: 1, xp: 60,
  },

  // ─── Alchemy ─────────────────────────────────────────────────────────────
  brew_hp_small: {
    id: 'brew_hp_small', name: 'Brew Minor Heal', skill: SkillType.Alchemy, levelReq: 1,
    ingredients: [{ itemId: 'basic_herb', quantity: 2 }, { itemId: 'mushroom', quantity: 1 }],
    outputId: 'hp_potion_s', outputQty: 1, xp: 25,
  },
  brew_hp_med: {
    id: 'brew_hp_med', name: 'Brew Heal Potion', skill: SkillType.Alchemy, levelReq: 15,
    ingredients: [{ itemId: 'mid_herb', quantity: 2 }, { itemId: 'mushroom', quantity: 2 }],
    outputId: 'hp_potion_m', outputQty: 1, xp: 50,
  },
  brew_hp_large: {
    id: 'brew_hp_large', name: 'Brew Super Heal', skill: SkillType.Alchemy, levelReq: 30,
    ingredients: [{ itemId: 'rare_herb', quantity: 2 }, { itemId: 'mushroom', quantity: 3 }],
    outputId: 'hp_potion_l', outputQty: 1, xp: 80,
  },
  brew_energy: {
    id: 'brew_energy', name: 'Brew Energy Pot', skill: SkillType.Alchemy, levelReq: 10,
    ingredients: [{ itemId: 'basic_herb', quantity: 3 }, { itemId: 'slime_gel', quantity: 2 }],
    outputId: 'energy_pot', outputQty: 1, xp: 35,
  },
  brew_atk: {
    id: 'brew_atk', name: 'Brew Attack Potion', skill: SkillType.Alchemy, levelReq: 20,
    ingredients: [{ itemId: 'mid_herb', quantity: 3 }, { itemId: 'beast_claw', quantity: 1 }],
    outputId: 'atk_potion', outputQty: 1, xp: 55,
  },
  brew_def: {
    id: 'brew_def', name: 'Brew Defence Brew', skill: SkillType.Alchemy, levelReq: 20,
    ingredients: [{ itemId: 'mid_herb', quantity: 3 }, { itemId: 'scale', quantity: 1 }],
    outputId: 'def_potion', outputQty: 1, xp: 55,
  },

  // ─── Crafting ────────────────────────────────────────────────────────────
  craft_leather_armor: {
    id: 'craft_leather_armor', name: 'Craft Leather Armor', skill: SkillType.Crafting, levelReq: 1,
    ingredients: [{ itemId: 'wolf_pelt', quantity: 3 }],
    outputId: 'leather_chaps', outputQty: 1, xp: 20,
  },
  craft_taming_snare: {
    id: 'craft_taming_snare', name: 'Craft Taming Snare', skill: SkillType.Crafting, levelReq: 1,
    ingredients: [{ itemId: 'oak_log', quantity: 3 }, { itemId: 'slime_gel', quantity: 2 }],
    outputId: 'taming_snare', outputQty: 2, xp: 15,
  },
  craft_beast_collar: {
    id: 'craft_beast_collar', name: 'Craft Beast Collar', skill: SkillType.Crafting, levelReq: 10,
    ingredients: [{ itemId: 'wolf_pelt', quantity: 2 }, { itemId: 'iron_bar', quantity: 1 }],
    outputId: 'beast_collar', outputQty: 1, xp: 35,
  },
  craft_oak_staff: {
    id: 'craft_oak_staff', name: 'Craft Oak Staff', skill: SkillType.Crafting, levelReq: 5,
    ingredients: [{ itemId: 'oak_log', quantity: 5 }, { itemId: 'basic_herb', quantity: 2 }],
    outputId: 'oak_staff', outputQty: 1, xp: 30,
  },
  craft_short_bow: {
    id: 'craft_short_bow', name: 'Craft Short Bow', skill: SkillType.Crafting, levelReq: 10,
    ingredients: [{ itemId: 'oak_log', quantity: 4 }, { itemId: 'slime_gel', quantity: 3 }],
    outputId: 'short_bow', outputQty: 1, xp: 35,
  },
  craft_crossbow: {
    id: 'craft_crossbow', name: 'Craft Crossbow', skill: SkillType.Crafting, levelReq: 25,
    ingredients: [{ itemId: 'willow_log', quantity: 3 }, { itemId: 'iron_bar', quantity: 3 }, { itemId: 'slime_gel', quantity: 2 }],
    outputId: 'crossbow', outputQty: 1, xp: 60,
  },
  craft_soothe_balm: {
    id: 'craft_soothe_balm', name: 'Craft Soothe Balm', skill: SkillType.Crafting, levelReq: 8,
    ingredients: [{ itemId: 'basic_herb', quantity: 2 }, { itemId: 'slime_gel', quantity: 3 }],
    outputId: 'soothe_balm', outputQty: 2, xp: 20,
  },
}

export function getRecipesBySkill(skill: SkillType): Recipe[] {
  return Object.values(RECIPES).filter(r => r.skill === skill)
}
