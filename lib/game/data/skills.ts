import { SkillDefinition, SkillType, SkillCategory, SkillState } from './types'

// OSRS-style XP curve: floor((level + 300 * 2^(level/7)) / 4)
export function xpForLevel(level: number): number {
  let xp = 0
  for (let l = 1; l < level; l++) {
    xp += Math.floor(l + 300 * Math.pow(2, l / 7))
  }
  return Math.floor(xp / 4)
}

export function levelFromXP(xp: number): number {
  for (let level = 99; level >= 1; level--) {
    if (xp >= xpForLevel(level)) return level
  }
  return 1
}

export function xpToNextLevel(currentXP: number, currentLevel: number): number {
  if (currentLevel >= 99) return 0
  return xpForLevel(currentLevel + 1) - currentXP
}

export const SKILL_DEFINITIONS: Record<SkillType, SkillDefinition> = {
  // ─── GATHERING ─────────────────────────────────────────────────────────────
  [SkillType.Mining]: {
    type: SkillType.Mining,
    name: 'Mining',
    description: 'Strike ore veins and unearth precious metals.',
    category: SkillCategory.Gathering,
    icon: '⛏️',
    color: '#9090a8',
    milestones: [
      { level: 1, title: 'Prospector', description: 'Can mine Copper and Tin nodes.' },
      { level: 10, title: 'Miner', description: 'Unlock Iron nodes. 5% chance to find Gem Fragments.' },
      { level: 20, title: 'Tunnel Rat', description: 'Unlock Coal. Mining speed +10%.', passiveBonus: { stat: 'miningSpeed', value: 0.1 } },
      { level: 30, title: 'Vein Reader', description: 'Unlock Gold nodes. Rare Fossil drops appear.' },
      { level: 40, title: 'Deep Miner', description: 'Unlock Mithril. Can mine in Tier 2 dungeons.' },
      { level: 50, title: "Miner's Eye", description: 'Highlight ore veins through walls in 3-tile radius.', unlocksContent: ['ore_highlight_passive'] },
      { level: 60, title: 'Vein Master', description: 'Unlock Adamant. 10% chance to double node yield.' },
      { level: 70, title: 'Expert Miner', description: 'Unlock Runite. Mining speed +20% total.', passiveBonus: { stat: 'miningSpeed', value: 0.2 } },
      { level: 80, title: 'Relic Hunter', description: 'Can mine Ancient Relic nodes. Elite Rock Pet encounters unlock.' },
      { level: 90, title: 'Motherlode', description: '2% chance per mine to spawn a cluster of 5 bonus nodes.', unlocksContent: ['motherlode_passive'] },
      { level: 99, title: 'Grand Miner', description: 'All ore yields +1. Crystal ore nodes unlocked.', unlocksContent: ['crystal_ore', 'grand_miner_cape'] },
    ],
  },
  [SkillType.Fishing]: {
    type: SkillType.Fishing,
    name: 'Fishing',
    description: 'Cast your line into rivers and seas.',
    category: SkillCategory.Gathering,
    icon: '🎣',
    color: '#4090c8',
    milestones: [
      { level: 1, title: 'Angler', description: 'Can fish at basic spots. Catches: Shrimp, Sardine.' },
      { level: 10, title: 'Fisherman', description: 'Unlock Trout and Pike. Occasional treasure item catches.' },
      { level: 20, title: 'Caster', description: 'Unlock Salmon. Fishing speed +10%.' },
      { level: 30, title: 'River Expert', description: 'Unlock Tuna. Can fish at deep water spots.' },
      { level: 40, title: 'Sea Fisher', description: 'Unlock Lobster. Can find Sunken Relics while fishing.' },
      { level: 50, title: 'Sixth Sense', description: 'Can sense fishing spots through fog.', unlocksContent: ['fishing_sense_passive'] },
      { level: 60, title: 'Deep Sea Fisher', description: 'Unlock Shark and exotic fish.' },
      { level: 70, title: 'Master Angler', description: 'Fishing speed +25%. Unlock dark cave pools.' },
      { level: 80, title: 'Sea Whisperer', description: 'Can attract rare water-elemental pets while fishing.' },
      { level: 90, title: 'Abyssal Fisher', description: 'Unlock deep ocean spots with unique legendary fish.' },
      { level: 99, title: 'Grand Fisher', description: 'All fish yield double. Unlock spectral fishing rod.' },
    ],
  },
  [SkillType.Woodcutting]: {
    type: SkillType.Woodcutting,
    name: 'Woodcutting',
    description: 'Fell trees and harvest rare timber.',
    category: SkillCategory.Gathering,
    icon: '🪓',
    color: '#804020',
    milestones: [
      { level: 1, title: 'Woodcutter', description: 'Can chop Oak trees.' },
      { level: 10, title: 'Lumberjack', description: 'Unlock Birch trees. Occasional bird nest drops.' },
      { level: 20, title: 'Forest Runner', description: 'Unlock Willow. Woodcutting speed +10%.' },
      { level: 30, title: 'Treewalker', description: 'Unlock Teak. Rare Bark essence drops.' },
      { level: 40, title: 'Grove Master', description: 'Unlock Maple. Can identify rare tree types on map.' },
      { level: 50, title: 'Bark Reader', description: 'Read tree health — harvest at peak for bonus logs.', unlocksContent: ['bark_read_passive'] },
      { level: 60, title: 'Canopy Climber', description: 'Unlock Yew. Access dense rainforest canopy areas.' },
      { level: 70, title: 'Timber Lord', description: 'Woodcutting speed +25%. Unlock Magic trees.' },
      { level: 80, title: 'Ancient Feller', description: 'Can chop Ancient Trees — massive XP and rare wood.' },
      { level: 90, title: 'Grove Warden', description: 'Trees around you respawn 50% faster.' },
      { level: 99, title: 'Grand Woodcutter', description: 'All log yields +1. Dragon Axe auto-unlock.', unlocksContent: ['dragon_axe', 'grand_woodcutter_cape'] },
    ],
  },
  [SkillType.Foraging]: {
    type: SkillType.Foraging,
    name: 'Foraging',
    description: 'Gather herbs, mushrooms, and rare botanical specimens.',
    category: SkillCategory.Gathering,
    icon: '🌿',
    color: '#40a040',
    milestones: [
      { level: 1, title: 'Herbalist', description: 'Can forage basic herbs and berries.' },
      { level: 10, title: 'Naturalist', description: 'Unlock mushroom clusters. Occasional seed drops.' },
      { level: 20, title: 'Botanist', description: 'Unlock mid-tier herbs. Forage speed +10%.' },
      { level: 30, title: 'Grove Seeker', description: 'Can identify medicinal plants on minimap.' },
      { level: 40, title: 'Verdant Touch', description: 'Unlock rare herbs used in Alchemy.' },
      { level: 50, title: 'Plant Whisperer', description: '20% chance to harvest without depleting node.', unlocksContent: ['plant_whisper_passive'] },
      { level: 60, title: 'Master Herbalist', description: 'Unlock exotic rainforest herbs.' },
      { level: 70, title: 'Root Sage', description: 'Can forage underground nodes in dungeons.' },
      { level: 80, title: 'Ancient Botanist', description: 'Unlock Ethereal herbs. Significant Alchemy synergy.' },
      { level: 90, title: 'Bloom Keeper', description: 'Foraging nodes around you respawn 40% faster.' },
      { level: 99, title: 'Grand Forager', description: 'All forage yields +1. Unlock Primordial Garden POI access.', unlocksContent: ['grand_forager_cape'] },
    ],
  },

  // ─── ARTISAN ───────────────────────────────────────────────────────────────
  [SkillType.Smithing]: {
    type: SkillType.Smithing,
    name: 'Smithing',
    description: 'Forge weapons, armor, and equipment from raw ore.',
    category: SkillCategory.Artisan,
    icon: '🔨',
    color: '#d07020',
    milestones: [
      { level: 1, title: 'Apprentice Smith', description: 'Can smelt Copper and Tin into Bronze. Craft basic tools.' },
      { level: 10, title: 'Smith', description: 'Unlock Iron smithing. Can craft basic weapons and armor.' },
      { level: 20, title: 'Armourer', description: 'Unlock Steel (Iron + Coal). Full armor sets.' },
      { level: 30, title: 'Weaponsmith', description: 'Can craft weapon upgrades and reinforcements.' },
      { level: 40, title: 'Master Smith', description: 'Unlock Mithril. Can craft pet equipment (collars, armor).' },
      { level: 50, title: 'Forge Master', description: 'Craft Alloy bars (hybrid material) using Mining 50+ synergy.', unlocksContent: ['alloy_bars'] },
      { level: 60, title: 'Rune Forger', description: 'Unlock Adamant. Imbue metals with minor enchantments.' },
      { level: 70, title: 'Elite Armourer', description: 'Unlock Runite. Armor grants +1 bonus to all stats.' },
      { level: 80, title: 'Ancient Forger', description: 'Can craft Ancient Relic items from dungeon materials.' },
      { level: 90, title: 'Grand Forgemaster', description: '10% chance to craft a Superior version of any item.' },
      { level: 99, title: 'Grand Smith', description: 'Dragon equipment unlocked. All crafted items +10% durability.', unlocksContent: ['grand_smith_cape'] },
    ],
  },
  [SkillType.Cooking]: {
    type: SkillType.Cooking,
    name: 'Cooking',
    description: 'Prepare meals that restore HP and grant combat buffs.',
    category: SkillCategory.Artisan,
    icon: '🍳',
    color: '#e08040',
    milestones: [
      { level: 1, title: 'Cook', description: 'Can cook basic fish and meat. Restores HP.' },
      { level: 10, title: 'Chef', description: 'Unlock combo meals. Reduce burn chance on all recipes.' },
      { level: 20, title: 'Sous-Chef', description: 'Unlock stat-boosting meals. ATK/DEF food.' },
      { level: 30, title: 'Culinarian', description: 'Can brew teas and soups. Regeneration food.' },
      { level: 40, title: 'Expert Chef', description: 'Seafarer\'s Craft synergy with Fishing 40+: double buff duration.' },
      { level: 50, title: 'Master Cook', description: '5% chance to cook a Perfect version of any meal (double effect).', unlocksContent: ['perfect_cook_passive'] },
      { level: 60, title: 'Banquet Master', description: 'Can prepare multi-course meals with layered buffs.' },
      { level: 70, title: 'Exotic Chef', description: 'Cook legendary fish for powerful temporary stat boosts.' },
      { level: 80, title: 'Ancient Recipes', description: 'Discover dungeon recipes. Brew magical foodstuffs.' },
      { level: 90, title: 'Grand Culinarian', description: 'All meals grant +1 to their primary stat bonus.' },
      { level: 99, title: 'Grand Chef', description: 'Never burn food. All meals have 20% extended duration.', unlocksContent: ['grand_chef_cape'] },
    ],
  },
  [SkillType.Alchemy]: {
    type: SkillType.Alchemy,
    name: 'Alchemy',
    description: 'Brew potions, poisons, and magical elixirs.',
    category: SkillCategory.Artisan,
    icon: '⚗️',
    color: '#8040c0',
    milestones: [
      { level: 1, title: 'Herbmixer', description: 'Brew basic HP and Energy potions.' },
      { level: 10, title: 'Alchemist', description: 'Unlock stat potions (ATK, DEF, SPD).' },
      { level: 20, title: 'Apothecary', description: 'Brew antidotes and status-cure items.' },
      { level: 30, title: 'Potion Master', description: 'Brew elemental resistance potions.' },
      { level: 40, title: 'Grand Alchemist', description: 'Herbmaster synergy with Foraging 40+: potions proc double dose.' },
      { level: 50, title: 'Transmuter', description: 'Can convert low-value items into reagents.', unlocksContent: ['transmutation'] },
      { level: 60, title: 'Spell Brewer', description: 'With Magic 60+: brew Spell Amplifier vials.' },
      { level: 70, title: 'Toxicologist', description: 'Brew powerful poisons for weapons.' },
      { level: 80, title: 'Ancient Alchemist', description: 'Brew Elixirs — permanent minor stat boosts (1/day).' },
      { level: 90, title: 'Philosopher', description: 'Chance to brew a double-strength version of any potion.' },
      { level: 99, title: 'Grand Alchemist', description: 'All potions last 50% longer.', unlocksContent: ['grand_alchemist_cape'] },
    ],
  },
  [SkillType.Crafting]: {
    type: SkillType.Crafting,
    name: 'Crafting',
    description: 'Construct bows, accessories, tools, and magical staves.',
    category: SkillCategory.Artisan,
    icon: '🪡',
    color: '#c0a020',
    milestones: [
      { level: 1, title: 'Artisan', description: 'Craft basic tools, ropes, and leather items.' },
      { level: 10, title: 'Crafter', description: 'Craft shortbows and wooden staves.' },
      { level: 20, title: 'Craftsman', description: 'Craft rings and amulets. Accessories with minor bonuses.' },
      { level: 30, title: 'Expert Crafter', description: 'Craft composite bows. Better ranged weapons.' },
      { level: 40, title: 'Runic Carver', description: 'Runic Bow unlock with Woodcutting 50+: Magic-scaling ranged weapon.' },
      { level: 50, title: 'Jeweller', description: 'Craft enchanted jewelry with elemental resistances.', unlocksContent: ['enchanted_jewelry'] },
      { level: 60, title: 'Master Craftsman', description: 'Craft Ability Scrolls to teach pets new moves.' },
      { level: 70, title: 'Artificer', description: 'Craft mechanical gadgets: traps, decoys.' },
      { level: 80, title: 'Reliquary', description: 'Craft pet cosmetic items and special pet equipment.' },
      { level: 90, title: 'Grand Artificer', description: 'All crafted items have 15% chance to be masterwork (+10% stats).' },
      { level: 99, title: 'Grand Crafter', description: 'Craft Dragon equipment. Unlock Legendary item recipes.', unlocksContent: ['grand_crafter_cape'] },
    ],
  },

  // ─── COMBAT ────────────────────────────────────────────────────────────────
  [SkillType.Melee]: {
    type: SkillType.Melee,
    name: 'Melee',
    description: 'Master close-quarters combat with blades and blunt weapons.',
    category: SkillCategory.Combat,
    icon: '⚔️',
    color: '#e03030',
    milestones: [
      { level: 1, title: 'Brawler', description: 'Can equip basic weapons. Standard attack speed.' },
      { level: 10, title: 'Fighter', description: 'Unlock Iron weapons. ATK +5%.' },
      { level: 20, title: 'Warrior', description: 'Unlock Steel equipment. Knockback chance on heavy hits.' },
      { level: 30, title: 'Swordsman', description: 'Unlock combo attacks: rapid 3-hit strikes.' },
      { level: 40, title: 'Battlemaster', description: 'Vanguard pets gain 15% of your Melee level as bonus ATK.' },
      { level: 50, title: 'Blade Dancer', description: '10% chance for each hit to be free (no cooldown).', unlocksContent: ['blade_dance_passive'] },
      { level: 60, title: 'Champion', description: 'Unlock Mithril weapons. All melee +15% damage.' },
      { level: 70, title: 'Elite Warrior', description: 'Unlock Adamant equipment. Dual-wield option.' },
      { level: 80, title: 'Warlord', description: 'Unlock Runite equipment. AoE heavy slam ability.' },
      { level: 90, title: 'Iron Wall', description: 'Defense + Vitality 70+ synergy: 5% flat damage reduction.' },
      { level: 99, title: 'Grand Warrior', description: 'Dragon weapons unlock. All hits have 5% chance to crit for 2x.', unlocksContent: ['grand_warrior_cape'] },
    ],
  },
  [SkillType.Ranged]: {
    type: SkillType.Ranged,
    name: 'Ranged',
    description: 'Strike from a distance with bows, thrown weapons, and crossbows.',
    category: SkillCategory.Combat,
    icon: '🏹',
    color: '#40a040',
    milestones: [
      { level: 1, title: 'Marksman', description: 'Can equip shortbow and throw basic weapons.' },
      { level: 10, title: 'Archer', description: 'Unlock Oak shortbow. Range +1 tile.' },
      { level: 20, title: 'Scout', description: 'Unlock crossbow. Bolts pierce thin terrain.' },
      { level: 30, title: 'Sharpshooter', description: 'Headshot mechanic: 15% chance for +50% damage.' },
      { level: 40, title: 'Ranger', description: 'Trickster pets gain 15% of your Ranged level as bonus SPD.' },
      { level: 50, title: 'Sniper', description: 'Attacks beyond 6 tiles gain +20% damage bonus.', unlocksContent: ['long_range_passive'] },
      { level: 60, title: 'Bowmaster', description: 'Unlock composite bow. Multi-shot ability: 3 arrows at once.' },
      { level: 70, title: 'Elite Ranger', description: 'Unlock dragon crossbow. Poison-tipped arrows.' },
      { level: 80, title: 'Deadeye', description: 'All ranged attacks apply a mild slow.' },
      { level: 90, title: 'Hawk Eye', description: 'Reveal hidden enemies in full screen range.' },
      { level: 99, title: 'Grand Ranger', description: 'All ranged crits deal 3x damage.', unlocksContent: ['grand_ranger_cape'] },
    ],
  },
  [SkillType.Magic]: {
    type: SkillType.Magic,
    name: 'Magic',
    description: 'Harness elemental forces through arcane knowledge.',
    category: SkillCategory.Combat,
    icon: '✨',
    color: '#8040e0',
    milestones: [
      { level: 1, title: 'Apprentice', description: 'Can cast Arcane Bolt. Equip basic staves.' },
      { level: 10, title: 'Mage', description: 'Unlock element-specific tier 1 spells.' },
      { level: 20, title: 'Spellcaster', description: 'Unlock AoE blast variants. Spell power +10%.' },
      { level: 25, title: 'Enchanter', description: 'Unlock utility spells: Freeze, Slow, Weaken.' },
      { level: 30, title: 'Elementalist', description: 'Unlock tier 2 element spells. Trigger element reactions more reliably.' },
      { level: 40, title: 'Archmage', description: 'Unlock Teleport to visited POIs. Spell power +20%.' },
      { level: 50, title: 'Spellweave', description: 'Two spells cast within 1.5s trigger a free Arcane Bolt.', unlocksContent: ['spellweave_passive'] },
      { level: 60, title: 'Grand Mage', description: 'Unlock tier 3 element spells. Pet magic +10% from player Magic.' },
      { level: 70, title: 'Runemaster', description: 'Unlock Enchant spell: temporarily buff weapons/armor.' },
      { level: 80, title: 'Ritual Caster', description: 'Unlock Ritual magic: powerful channel spells using rare ingredients.' },
      { level: 90, title: 'Arcane Mastery', description: 'All spells have 5% chance to cast twice.' },
      { level: 99, title: 'Grand Wizard', description: 'Unlock Arcane Form aura. All spells gain secondary Arcane effect.', unlocksContent: ['arcane_form', 'grand_wizard_cape'] },
    ],
  },
  [SkillType.Defense]: {
    type: SkillType.Defense,
    name: 'Defense',
    description: 'Trained through surviving and blocking incoming damage.',
    category: SkillCategory.Combat,
    icon: '🛡️',
    color: '#6080c0',
    milestones: [
      { level: 1, title: 'Survivor', description: 'Can equip light armor. Basic block rate.' },
      { level: 10, title: 'Defender', description: 'Block chance +5%. Can equip medium armor.' },
      { level: 20, title: 'Shield Wall', description: 'Can use shields. Parry window extended.' },
      { level: 30, title: 'Iron Hide', description: 'Passive: reduce all damage by 3%.' },
      { level: 40, title: 'Tank', description: 'Can equip heavy armor. Stagger enemies on block.' },
      { level: 50, title: 'Bulwark', description: 'Perfect block (timed) reflects 50% of blocked damage.', unlocksContent: ['perfect_block_passive'] },
      { level: 60, title: 'Fortress', description: 'Passive: 8% damage reduction total.' },
      { level: 70, title: 'Ironclad', description: 'Can equip Dragon armor. Resistance to status effects +25%.' },
      { level: 80, title: 'Living Fortress', description: 'Block can now be used while moving.' },
      { level: 90, title: 'Iron Body', description: 'Defense + Vitality 70+ synergy: 5% flat damage reduction stacks with armor.' },
      { level: 99, title: 'Grand Defender', description: 'Immune to knockback. 15% total damage reduction.', unlocksContent: ['grand_defender_cape'] },
    ],
  },

  // ─── SPECIAL ───────────────────────────────────────────────────────────────
  [SkillType.Taming]: {
    type: SkillType.Taming,
    name: 'Taming',
    description: 'Capture and bond with wild creatures.',
    category: SkillCategory.Special,
    icon: '🐾',
    color: '#e04080',
    milestones: [
      { level: 1, title: 'Beast Friend', description: 'Can tame Common tier pets. Craft basic Taming items.' },
      { level: 10, title: 'Tamer', description: 'Can tame Uncommon tier pets. Taming items cost less.' },
      { level: 15, title: 'Soother', description: '"Soothe" ability: reduce mob aggression before capture attempt.' },
      { level: 20, title: 'Pet Whisperer', description: 'Can tame Rare tier pets. Bond XP +10%.' },
      { level: 30, title: 'Dungeon Tamer', description: 'Can attempt taming in dungeons.' },
      { level: 40, title: 'Elite Tamer', description: 'Can tame Elite tier pets. Bond XP +25%.' },
      { level: 50, title: 'Empathy', description: 'See pet hidden stat rolls before committing to tame.', unlocksContent: ['empathy_passive'] },
      { level: 60, title: 'Lair Raider', description: 'Can tame pets from Pet Lair rooms without quest.' },
      { level: 70, title: 'Master Tamer', description: 'Bond XP +50%. Equip 3 active pets simultaneously.' },
      { level: 80, title: 'Legendary Hunter', description: 'Can tame Legendary tier pets.' },
      { level: 90, title: 'Persistence', description: 'Failed taming attempts lower that mob\'s resistance for next try.' },
      { level: 99, title: 'Grand Tamer', description: 'Can tame bosses with unique boss taming items.', unlocksContent: ['grand_tamer_cape', 'boss_taming'] },
    ],
  },
  [SkillType.Exploration]: {
    type: SkillType.Exploration,
    name: 'Exploration',
    description: 'Chart the world and uncover its hidden secrets.',
    category: SkillCategory.Special,
    icon: '🗺️',
    color: '#c0a040',
    milestones: [
      { level: 1, title: 'Wanderer', description: 'Map reveals as you move. Basic compass.' },
      { level: 10, title: 'Scout', description: 'POI detection range +2 tiles. Reveal adjacent chunks on map.' },
      { level: 20, title: 'Pathfinder', description: 'Movement through difficult terrain +10%.' },
      { level: 30, title: 'Cartographer', description: 'Can mark custom waypoints on map.' },
      { level: 40, title: 'Explorer', description: 'Unlock fast travel between discovered Towns.' },
      { level: 50, title: 'Dungeon Diver', description: 'Detect dungeon entrances through unexplored terrain.', unlocksContent: ['dungeon_sense_passive'] },
      { level: 60, title: 'World Walker', description: 'POI detection range +5 tiles. See mob levels on map.' },
      { level: 70, title: 'Ancient Tracker', description: 'Reveal hidden caches and buried treasure on map.' },
      { level: 80, title: 'Trailblazer', description: 'Exploration + Luck 50+ synergy: reveal hidden cursed caches.' },
      { level: 90, title: 'World Scholar', description: 'All biome danger levels reduced by 1 for you.' },
      { level: 99, title: 'Grand Explorer', description: 'Entire world map is always revealed. Teleport to any discovered location.', unlocksContent: ['grand_explorer_cape'] },
    ],
  },
  [SkillType.Vitality]: {
    type: SkillType.Vitality,
    name: 'Vitality',
    description: 'Strengthen your body through trials and endurance.',
    category: SkillCategory.Special,
    icon: '❤️',
    color: '#e04040',
    milestones: [
      { level: 1, title: 'Survivor', description: 'Base HP: 100. Stamina: 100.' },
      { level: 10, title: 'Tough', description: 'Max HP +50. HP regen +1/sec.' },
      { level: 20, title: 'Resilient', description: 'Max Stamina +20. Stamina regen +15%.' },
      { level: 30, title: 'Enduring', description: 'HP regen works even in combat (halved rate).' },
      { level: 40, title: 'Vigorous', description: 'Max HP +100. Max Stamina +40.' },
      { level: 50, title: 'Iron Lungs', description: 'Stamina depletion rate halved. Sprint lasts twice as long.', unlocksContent: ['iron_lungs_passive'] },
      { level: 60, title: 'Indomitable', description: 'Below 25% HP: receive 20% less damage.' },
      { level: 70, title: 'Titan Body', description: 'Defense + Vitality 70+: 5% flat damage reduction. Pets inherit 10% HP.' },
      { level: 80, title: 'Undying', description: 'Once per day: survive a killing blow at 1 HP.' },
      { level: 90, title: 'Living Legend', description: 'Max HP +200. HP regen in combat (full rate).' },
      { level: 99, title: 'Grand Vital', description: 'Immune to all status effects lasting under 2 seconds.', unlocksContent: ['grand_vitality_cape'] },
    ],
  },
  [SkillType.Luck]: {
    type: SkillType.Luck,
    name: 'Luck',
    description: 'Fortune favors the bold — and the skilled.',
    category: SkillCategory.Special,
    icon: '🍀',
    color: '#40c040',
    milestones: [
      { level: 1, title: 'Fortunate', description: 'Baseline luck. XP gained passively from rare events.' },
      { level: 10, title: 'Lucky', description: 'Rare drop chance +2%. Lucky Clover items spawn in world.' },
      { level: 20, title: 'Charmed', description: 'Rare node spawn chance +5%.' },
      { level: 30, title: 'Blessed', description: 'Crit chance +3% globally (player and pets).' },
      { level: 40, title: "Fortune's Favor", description: 'Once per day, next rare event is guaranteed success.', unlocksContent: ['fortunes_favor'] },
      { level: 50, title: "Gambler's Eye", description: 'Reveals item quality tier before picking up.', unlocksContent: ['quality_preview_passive'] },
      { level: 60, title: 'Charmed II', description: 'Rare drop chance +8% total. Lucky Chest POIs appear on map.' },
      { level: 70, title: 'Blessed II', description: 'Pet taming: 10% chance of above-average stat rolls on capture.' },
      { level: 80, title: 'Jackpot', description: '0.5% chance on any kill to drop a random rare item.', unlocksContent: ['jackpot_passive'] },
      { level: 90, title: 'Weather Reader', description: 'Weather events are luck-weighted: good weather more frequent.' },
      { level: 99, title: "Fortune's Champion", description: 'All % chances in the game get a +1% additive boost.', unlocksContent: ['fortunes_champion_passive', 'grand_luck_cape'] },
    ],
  },
}

// XP award values for common actions
export const XP_AWARDS = {
  mining: { copper: 17.5, iron: 35, gold: 65, mithril: 80 },
  fishing: { shrimp: 10, trout: 50, salmon: 70, tuna: 80 },
  woodcutting: { oak: 25, birch: 38, willow: 68, teak: 85 },
  foraging: { basic_herb: 12, mid_herb: 28, rare_herb: 55 },
  smithing: { bronze_bar: 12.5, iron_bar: 25, steel_bar: 37.5 },
  cooking: { basic: 30, mid: 60, high: 95 },
  alchemy: { basic_potion: 25, mid_potion: 50, high_potion: 80 },
  crafting: { basic: 15, mid: 40, high: 80 },
  combat: { base_per_hp_dealt: 0.4 },  // XP = damage dealt * 0.4
  taming: { common: 50, uncommon: 120, rare: 280, elite: 600, legendary: 1400 },
  exploration: { new_chunk: 20, new_poi: 100, new_biome: 200 },
  vitality: { survive_hit: 1.5, full_hp_heal: 3 },
  luck: { rare_drop: 25, rare_node: 15, crit: 2 },
}

export function createDefaultSkillState(type: SkillType): SkillState {
  return {
    type,
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(2),
  }
}

export function createAllSkills(): Record<SkillType, SkillState> {
  return Object.values(SkillType).reduce((acc, type) => {
    acc[type] = createDefaultSkillState(type)
    return acc
  }, {} as Record<SkillType, SkillState>)
}
