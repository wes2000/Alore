import { ItemDefinition, ItemRarity, ItemType, SkillType } from './types'

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  // ─── Raw Resources ────────────────────────────────────────────────────────
  copper_ore:   { id: 'copper_ore',   name: 'Copper Ore',   description: 'A chunk of copper-rich rock.',   type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 5,   icon: '🪨', skillReq: undefined },
  tin_ore:      { id: 'tin_ore',      name: 'Tin Ore',      description: 'A pale silvery ore.',           type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 5,   icon: '🪨' },
  iron_ore:     { id: 'iron_ore',     name: 'Iron Ore',     description: 'Heavy iron-rich stone.',        type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 15,  icon: '🪨', skillReq: { skill: SkillType.Mining, level: 10 } },
  gold_ore:     { id: 'gold_ore',     name: 'Gold Ore',     description: 'Gleaming gold ore.',            type: ItemType.Resource, rarity: ItemRarity.Uncommon, stackable: true, maxStack: 100, value: 45,  icon: '✨', skillReq: { skill: SkillType.Mining, level: 30 } },
  mithril_ore:  { id: 'mithril_ore',  name: 'Mithril Ore',  description: 'A rare blue-tinged metal.',     type: ItemType.Resource, rarity: ItemRarity.Rare,     stackable: true, maxStack: 100, value: 120, icon: '💠', skillReq: { skill: SkillType.Mining, level: 40 } },
  oak_log:      { id: 'oak_log',      name: 'Oak Log',      description: 'Sturdy oak timber.',            type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 8,   icon: '🪵' },
  birch_log:    { id: 'birch_log',    name: 'Birch Log',    description: 'Light, smooth birch wood.',     type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 12,  icon: '🪵' },
  willow_log:   { id: 'willow_log',   name: 'Willow Log',   description: 'Flexible willow timber.',       type: ItemType.Resource, rarity: ItemRarity.Uncommon, stackable: true, maxStack: 100, value: 25,  icon: '🪵' },
  basic_herb:   { id: 'basic_herb',   name: 'Guam Leaf',    description: 'A common medicinal herb.',      type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 6,   icon: '🌿' },
  mid_herb:     { id: 'mid_herb',     name: 'Tarromin',     description: 'A mid-tier healing herb.',      type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 18,  icon: '🌿' },
  rare_herb:    { id: 'rare_herb',    name: 'Kwuarm',       description: 'A rare potent herb.',           type: ItemType.Resource, rarity: ItemRarity.Uncommon, stackable: true, maxStack: 100, value: 60,  icon: '🌿' },
  mushroom:     { id: 'mushroom',     name: 'Mushroom',     description: 'A common forest mushroom.',     type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 4,   icon: '🍄' },
  raw_shrimp:   { id: 'raw_shrimp',   name: 'Raw Shrimp',   description: 'Fresh caught shrimp.',          type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 3,   icon: '🦐' },
  raw_trout:    { id: 'raw_trout',    name: 'Raw Trout',    description: 'A river trout.',                type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 10,  icon: '🐟' },
  raw_salmon:   { id: 'raw_salmon',   name: 'Raw Salmon',   description: 'A plump salmon.',               type: ItemType.Resource, rarity: ItemRarity.Uncommon, stackable: true, maxStack: 100, value: 25,  icon: '🐟' },
  stone:        { id: 'stone',        name: 'Stone',        description: 'A rough grey stone.',           type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 500, value: 1,   icon: '🪨' },
  herb_bundle:  { id: 'herb_bundle',  name: 'Herb Bundle',  description: 'A handful of gathered herbs.',  type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 6,   icon: '🌿' },
  raw_fish:     { id: 'raw_fish',     name: 'Raw Fish',     description: 'A freshly caught fish.',        type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 5,   icon: '🐟' },
  slime_gel:    { id: 'slime_gel',    name: 'Slime Gel',    description: 'Gooey substance from slimes.',  type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 4,   icon: '🫧' },
  wolf_pelt:    { id: 'wolf_pelt',    name: 'Wolf Pelt',    description: 'Thick fur from a wolf.',        type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 100, value: 12,  icon: '🦴' },
  feather:      { id: 'feather',      name: 'Feather',      description: 'A light plume feather.',        type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 3,   icon: '🪶' },
  beast_claw:   { id: 'beast_claw',   name: 'Beast Claw',   description: 'A sharp claw from a predator.',type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 100, value: 8,   icon: '🦾' },
  scale:        { id: 'scale',        name: 'Scale',        description: 'Tough scales from a reptile.',  type: ItemType.Resource, rarity: ItemRarity.Uncommon, stackable: true, maxStack: 100, value: 20,  icon: '🐉' },
  void_essence: { id: 'void_essence', name: 'Void Essence', description: 'Dark energy crystallised.',     type: ItemType.Resource, rarity: ItemRarity.Rare,     stackable: true, maxStack: 50,  value: 80,  icon: '✨' },
  bone:         { id: 'bone',         name: 'Bone',         description: 'A gnawed bone.',                type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 2,   icon: '🦴' },

  // ─── Bars ──────────────────────────────────────────────────────────────────
  bronze_bar:   { id: 'bronze_bar',   name: 'Bronze Bar',   description: 'Copper + Tin smelted bar.',     type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 12,  icon: '🔩' },
  iron_bar:     { id: 'iron_bar',     name: 'Iron Bar',     description: 'Smelted iron bar.',             type: ItemType.Resource, rarity: ItemRarity.Common,   stackable: true, maxStack: 200, value: 32,  icon: '🔩' },
  steel_bar:    { id: 'steel_bar',    name: 'Steel Bar',    description: 'Iron + Coal smelted steel.',    type: ItemType.Resource, rarity: ItemRarity.Uncommon, stackable: true, maxStack: 100, value: 65,  icon: '🔩' },
  mithril_bar:  { id: 'mithril_bar',  name: 'Mithril Bar',  description: 'Rare mithril ingot.',           type: ItemType.Resource, rarity: ItemRarity.Rare,     stackable: true, maxStack: 100, value: 250, icon: '🔩' },

  // ─── Consumables ──────────────────────────────────────────────────────────
  hp_potion_s:  { id: 'hp_potion_s',  name: 'Minor Heal',   description: 'Restores 40 HP.',               type: ItemType.Consumable, rarity: ItemRarity.Common,   stackable: true, maxStack: 100, value: 20,  icon: '🧪' },
  hp_potion_m:  { id: 'hp_potion_m',  name: 'Heal Potion',  description: 'Restores 120 HP.',              type: ItemType.Consumable, rarity: ItemRarity.Common,   stackable: true, maxStack: 100, value: 55,  icon: '🧪' },
  hp_potion_l:  { id: 'hp_potion_l',  name: 'Super Heal',   description: 'Restores 280 HP.',              type: ItemType.Consumable, rarity: ItemRarity.Uncommon, stackable: true, maxStack: 50,  value: 140, icon: '🧪' },
  energy_pot:   { id: 'energy_pot',   name: 'Energy Pot',   description: 'Restores 50 energy.',           type: ItemType.Consumable, rarity: ItemRarity.Common,   stackable: true, maxStack: 100, value: 30,  icon: '⚡' },
  atk_potion:   { id: 'atk_potion',   name: 'Attack Potion',description: '+10% ATK for 3 minutes.',       type: ItemType.Consumable, rarity: ItemRarity.Common,   stackable: true, maxStack: 50,  value: 80,  icon: '⚗️' },
  def_potion:   { id: 'def_potion',   name: 'Defence Brew', description: '+10% DEF for 3 minutes.',       type: ItemType.Consumable, rarity: ItemRarity.Common,   stackable: true, maxStack: 50,  value: 80,  icon: '⚗️' },
  grilled_trout:{ id: 'grilled_trout',name: 'Grilled Trout',description: 'Restores 80 HP.',               type: ItemType.Consumable, rarity: ItemRarity.Common,   stackable: true, maxStack: 100, value: 25,  icon: '🍖' },
  cooked_salmon:{ id: 'cooked_salmon',name: 'Cooked Salmon',description: 'Restores 140 HP.',              type: ItemType.Consumable, rarity: ItemRarity.Common,   stackable: true, maxStack: 100, value: 50,  icon: '🍖' },

  // ─── Taming Items ─────────────────────────────────────────────────────────
  taming_snare: { id: 'taming_snare', name: 'Taming Snare', description: 'Basic capture tool. Works on Common pets.', type: ItemType.TamingItem, rarity: ItemRarity.Common, stackable: true, maxStack: 20, value: 50,  icon: '🪤' },
  beast_collar: { id: 'beast_collar', name: 'Beast Collar', description: 'Improved collar for Uncommon pets.',          type: ItemType.TamingItem, rarity: ItemRarity.Uncommon, stackable: true, maxStack: 10, value: 200, icon: '🪤', skillReq: { skill: SkillType.Taming, level: 10 } },
  spirit_lure:  { id: 'spirit_lure',  name: 'Spirit Lure',  description: 'Lures and captures Rare tier pets.',          type: ItemType.TamingItem, rarity: ItemRarity.Rare, stackable: true, maxStack: 5, value: 800,  icon: '🪤', skillReq: { skill: SkillType.Taming, level: 20 } },
  soothe_balm:  { id: 'soothe_balm',  name: 'Soothe Balm',  description: 'Reduces pet aggression before capture attempt.',type: ItemType.TamingItem, rarity: ItemRarity.Common, stackable: true, maxStack: 30, value: 40,  icon: '🧴' },

  // ─── Evolution Items ──────────────────────────────────────────────────────
  fire_shard:   { id: 'fire_shard',   name: 'Fire Shard',   description: 'A crystallised ember. Required to evolve Emberkit.', type: ItemType.KeyItem, rarity: ItemRarity.Rare, stackable: false, maxStack: 1, value: 0, icon: '🔥' },

  // ─── Equipment ────────────────────────────────────────────────────────────
  bronze_sword: { id: 'bronze_sword', name: 'Bronze Sword', description: 'A simple bronze blade.', type: ItemType.Weapon, rarity: ItemRarity.Common, stackable: false, maxStack: 1, value: 35, icon: '⚔️', statBonus: { atk: 8 } },
  iron_sword:   { id: 'iron_sword',   name: 'Iron Sword',   description: 'Reliable iron sword.',   type: ItemType.Weapon, rarity: ItemRarity.Common, stackable: false, maxStack: 1, value: 90, icon: '⚔️', statBonus: { atk: 18 }, skillReq: { skill: SkillType.Melee, level: 10 } },
  steel_sword:  { id: 'steel_sword',  name: 'Steel Sword',  description: 'A keen steel blade.',    type: ItemType.Weapon, rarity: ItemRarity.Uncommon, stackable: false, maxStack: 1, value: 250, icon: '⚔️', statBonus: { atk: 34 }, skillReq: { skill: SkillType.Melee, level: 20 } },
  oak_staff:    { id: 'oak_staff',    name: 'Oak Staff',    description: 'A basic magic staff.',   type: ItemType.Weapon, rarity: ItemRarity.Common, stackable: false, maxStack: 1, value: 60, icon: '🪄', statBonus: { matk: 12 } },
  iron_shield:  { id: 'iron_shield',  name: 'Iron Shield',  description: 'Solid iron protection.', type: ItemType.Armor, rarity: ItemRarity.Common, stackable: false, maxStack: 1, value: 75, icon: '🛡️', statBonus: { def: 14 }, skillReq: { skill: SkillType.Defense, level: 10 } },
  leather_chaps:{ id: 'leather_chaps',name: 'Leather Armor',description: 'Light leather outfit.', type: ItemType.Armor, rarity: ItemRarity.Common, stackable: false, maxStack: 1, value: 45, icon: '👕', statBonus: { def: 6, mdef: 4 } },

  // ─── Ability Scrolls ─────────────────────────────────────────────────────
  scroll_ember_toss:  { id: 'scroll_ember_toss',  name: 'Scroll: Ember Toss',   description: 'Teaches Ember Toss to a compatible pet.', type: ItemType.AbilityScroll, rarity: ItemRarity.Uncommon, stackable: false, maxStack: 1, value: 300, icon: '📜' },
  scroll_healing_rain:{ id: 'scroll_healing_rain', name: 'Scroll: Healing Rain', description: 'Teaches Healing Rain to a compatible pet.', type: ItemType.AbilityScroll, rarity: ItemRarity.Rare, stackable: false, maxStack: 1, value: 700, icon: '📜' },
  scroll_shadow_strike:{ id: 'scroll_shadow_strike', name: 'Scroll: Shadow Strike', description: 'Teaches Shadow Strike to a compatible pet.', type: ItemType.AbilityScroll, rarity: ItemRarity.Rare, stackable: false, maxStack: 1, value: 850, icon: '📜' },
}
