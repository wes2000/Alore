// ─── Enumerations ────────────────────────────────────────────────────────────

export enum BiomeType {
  Plains = 'Plains',
  Forest = 'Forest',
  Desert = 'Desert',
  Savanna = 'Savanna',
  Rainforest = 'Rainforest',
  Swamp = 'Swamp',
  Tundra = 'Tundra',
  Taiga = 'Taiga',
  Snowfield = 'Snowfield',
  Peaks = 'Peaks',
  ShallowWater = 'ShallowWater',
  DeepWater = 'DeepWater',
}

export enum TileType {
  Grass = 'Grass',
  DryGrass = 'DryGrass',
  Sand = 'Sand',
  Stone = 'Stone',
  Snow = 'Snow',
  Ice = 'Ice',
  Mud = 'Mud',
  DeepMud = 'DeepMud',
  Water = 'Water',
  DeepWater = 'DeepWater',
  DenseTree = 'DenseTree',
  Tree = 'Tree',
  CactusGround = 'CactusGround',
  TundraGround = 'TundraGround',
  Rock = 'Rock',
  Mountain = 'Mountain',
  Flower = 'Flower',
  Mushroom = 'Mushroom',
  DungeonEntrance = 'DungeonEntrance',
  DungeonFloor = 'DungeonFloor',
  DungeonWall = 'DungeonWall',
}

export enum Element {
  Fire = 'Fire',
  Water = 'Water',
  Earth = 'Earth',
  Lightning = 'Lightning',
  Wind = 'Wind',
  Shadow = 'Shadow',
  Light = 'Light',
  Arcane = 'Arcane',
  None = 'None',
}

export enum PetArchetype {
  Vanguard = 'Vanguard',
  Striker = 'Striker',
  Sage = 'Sage',
  Warden = 'Warden',
  Trickster = 'Trickster',
}

export enum PetTier {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  Elite = 'Elite',
  Legendary = 'Legendary',
}

export enum SkillType {
  // Gathering
  Mining = 'Mining',
  Fishing = 'Fishing',
  Woodcutting = 'Woodcutting',
  Foraging = 'Foraging',
  // Artisan
  Smithing = 'Smithing',
  Cooking = 'Cooking',
  Alchemy = 'Alchemy',
  Crafting = 'Crafting',
  // Combat
  Melee = 'Melee',
  Ranged = 'Ranged',
  Magic = 'Magic',
  Defense = 'Defense',
  // Special
  Taming = 'Taming',
  Exploration = 'Exploration',
  Vitality = 'Vitality',
  Luck = 'Luck',
}

export enum SkillCategory {
  Gathering = 'Gathering',
  Artisan = 'Artisan',
  Combat = 'Combat',
  Special = 'Special',
}

export enum AbilityType {
  Instant = 'Instant',
  Charged = 'Charged',
  Channeled = 'Channeled',
  Toggle = 'Toggle',
  Reaction = 'Reaction',
  Summon = 'Summon',
}

export enum DamageType {
  Physical = 'Physical',
  Magical = 'Magical',
  True = 'True',
}

export enum StatusEffect {
  Burn = 'Burn',
  Freeze = 'Freeze',
  Stun = 'Stun',
  Blind = 'Blind',
  Slow = 'Slow',
  Poison = 'Poison',
  Weaken = 'Weaken',
  Enrage = 'Enrage',
}

export enum ComboType {
  SteamBurst = 'SteamBurst',
  Wildfire = 'Wildfire',
  Electrolysis = 'Electrolysis',
  DustStorm = 'DustStorm',
  VoidCollapse = 'VoidCollapse',
  FlashVaporize = 'FlashVaporize',
}

export enum WeatherType {
  Clear = 'Clear',
  Rain = 'Rain',
  Fog = 'Fog',
  Heatwave = 'Heatwave',
  Storm = 'Storm',
}

export enum ResourceNodeType {
  CopperOre = 'CopperOre',
  IronOre = 'IronOre',
  GoldOre = 'GoldOre',
  MithrilOre = 'MithrilOre',
  OakTree = 'OakTree',
  BirchTree = 'BirchTree',
  WillowTree = 'WillowTree',
  HerbPatch = 'HerbPatch',
  MushroomCluster = 'MushroomCluster',
  FishingSpot = 'FishingSpot',
  StoneBoulder = 'StoneBoulder',
}

export enum ItemRarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  Epic = 'Epic',
  Legendary = 'Legendary',
}

export enum ItemType {
  Weapon = 'Weapon',
  Armor = 'Armor',
  Resource = 'Resource',
  Consumable = 'Consumable',
  TamingItem = 'TamingItem',
  AbilityScroll = 'AbilityScroll',
  KeyItem = 'KeyItem',
}

// ─── Core Data Structures ────────────────────────────────────────────────────

export interface Vec2 {
  x: number
  y: number
}

export interface PetStats {
  hp: number
  maxHp: number
  atk: number
  def: number
  matk: number
  mdef: number
  spd: number
  affinity: number // 0.5 – 2.0
}

export interface PetGrowthCurves {
  hp: number    // multiplier per level
  atk: number
  def: number
  matk: number
  mdef: number
  spd: number
}

export interface AbilityDefinition {
  id: string
  name: string
  description: string
  type: AbilityType
  element: Element
  damageType: DamageType
  basePower: number
  cooldown: number   // seconds
  range: number      // tiles
  aoeRadius: number  // 0 = single target
  statusEffect?: StatusEffect
  statusChance?: number  // 0–1
  statusDuration?: number // seconds
  energyCost: number
  isBondAbility: boolean
  isPassive: boolean
}

export interface EvolutionData {
  targetDefinitionId: string
  requiredLevel: number
  requiredItemId?: string
  requiredQuestId?: string
}

export interface PetDefinition {
  id: string
  name: string
  description: string
  archetype: PetArchetype
  element: Element
  tier: PetTier
  baseStats: PetStats
  growthCurves: PetGrowthCurves
  abilities: AbilityDefinition[]
  evolution?: EvolutionData
  color: string       // hex color for renderer
  accentColor: string // secondary color
  tamingLevel: number // minimum Taming skill to capture
  habitat: BiomeType[]
}

export interface SkillMilestone {
  level: number
  title: string
  description: string
  unlocksContent?: string[]
  passiveBonus?: { stat: string; value: number }
}

export interface SkillDefinition {
  type: SkillType
  name: string
  description: string
  category: SkillCategory
  icon: string   // emoji for now
  color: string  // hex
  milestones: SkillMilestone[]
}

export type WeaponStyle = 'melee' | 'staff' | 'bow'

export interface ItemDefinition {
  id: string
  name: string
  description: string
  type: ItemType
  rarity: ItemRarity
  stackable: boolean
  maxStack: number
  value: number  // gold value
  icon: string   // emoji
  statBonus?: Partial<PetStats>
  skillReq?: { skill: SkillType; level: number }
  weaponStyle?: WeaponStyle    // melee sword, staff, or bow
  atkRange?: number            // attack range in tiles (bows)
  element?: Element            // element for staves
  equipSlot?: EquipmentSlot    // which slot this equips to
  healAmount?: number          // for consumables
}

export interface BiomeDefinition {
  type: BiomeType
  name: string
  color: string
  accentColor: string
  fogColor: string
  ambientLight: number   // 0–1
  dangerLevel: number    // 1–5
  resourceTable: ResourceTableEntry[]
  mobSpawnTable: MobSpawnEntry[]
  tileVariants: TileType[]
}

export interface ResourceTableEntry {
  nodeType: ResourceNodeType
  density: number         // 0–1 probability per eligible position
  cluster: boolean
  respawnMinutes: number
  skillReq?: { skill: SkillType; level: number }
  elite: boolean
}

export interface MobSpawnEntry {
  mobId: string
  weight: number
  minLevel: number
  maxLevel: number
}

// ─── Runtime Instances ───────────────────────────────────────────────────────

export interface SkillState {
  type: SkillType
  level: number
  xp: number
  xpToNext: number
}

export interface PetInstance {
  instanceId: string
  definitionId: string
  name: string
  level: number
  xp: number
  bond: number          // 0–100
  stats: PetStats
  activeAbilities: string[]  // ability IDs, max 2 equipped
  learnedAbilities: string[] // all known ability IDs
  isActive: boolean
  activeSlot: number    // 0, 1, or 2
  statusEffects: ActiveStatusEffect[]
}

export interface ActiveStatusEffect {
  type: StatusEffect
  duration: number   // seconds remaining
  power: number
  sourceId: string
}

export interface InventoryItem {
  itemId: string
  quantity: number
  slotIndex: number
}

export type EquipmentSlot = 'weapon' | 'offhand' | 'body'

export interface Equipment {
  weapon: string | null   // itemId
  offhand: string | null  // itemId (shield)
  body: string | null     // itemId (armor)
}

export interface ActiveQuest {
  questId: string
  objectives: Record<string, number>  // objectiveId → current progress
  startedAt: number
}

export interface PlayerState {
  id: string
  name: string
  x: number
  y: number
  hp: number
  maxHp: number
  energy: number
  maxEnergy: number
  gold: number
  skills: Record<SkillType, SkillState>
  inventory: InventoryItem[]
  equipment: Equipment
  pets: PetInstance[]
  worldSeed: number
  playtime: number  // seconds
  discoveredPOIs: string[]
  completedQuests: string[]
  activeQuests: ActiveQuest[]
  currentDungeon: string | null  // chunkKey if inside a dungeon
  playerStatusEffects: ActiveStatusEffect[]
  equippedSpellIndex: number  // index into unlocked spells
  combatStyle: 'melee' | 'ranged' | 'magic'
  comboHitCount: number       // for melee combo tracker
  lastComboTime: number       // timestamp of last combo hit
  bestiary: Record<string, BestiaryEntry>
  discoveredChunks: string[]  // chunkKeys "cx,cy" the player has visited
}

export interface ChunkState {
  cx: number
  cy: number
  biome: BiomeType
  tiles: number[][]    // TileType indices
  resourceNodes: ResourceNodeState[]
  dungeonData?: DungeonData
  seed: number
}

export interface ResourceNodeState {
  id: string
  type: ResourceNodeType
  localX: number
  localY: number
  depleted: boolean
  respawnAt: number  // Date.now() timestamp
}

export interface DungeonData {
  rooms: DungeonRoom[]
  corridors: DungeonCorridor[]
  tier: number
}

export interface DungeonRoom {
  x: number
  y: number
  w: number
  h: number
  type: 'entrance' | 'boss' | 'treasure' | 'puzzle' | 'pet_lair' | 'normal'
}

export interface DungeonCorridor {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface MobInstance {
  id: string
  mobId: string        // matches BIOME_DEFINITIONS mobSpawnTable entry
  petDefId: string     // '' if not tameable
  x: number
  y: number
  hp: number
  maxHp: number
  level: number
  element: Element
  chunkKey: string
  state: 'wander' | 'chase' | 'dead'
  wanderTargetX: number
  wanderTargetY: number
  wanderTimer: number
  attackCooldown: number  // seconds until next mob attack
  spd: number             // tiles per second
  atk: number             // base damage per attack
  def: number             // damage reduction
  mdef: number            // magic damage reduction
  tameable: boolean
  statusEffects: ActiveStatusEffect[]
  isDungeonMob: boolean
  isBoss: boolean
  bossName?: string
}

// ─── NPC System ───────────────────────────────────────────────────────────────

export enum NPCRole {
  Shopkeeper = 'Shopkeeper',
  QuestGiver = 'QuestGiver',
  Trainer = 'Trainer',
  Lore = 'Lore',
}

export interface DialogueChoice {
  label: string
  nextNodeId: string | null  // null = end dialogue
  action?: 'open_shop' | 'start_quest'
  actionTarget?: string       // quest id or shop id
}

export interface DialogueNode {
  id: string
  text: string
  choices: DialogueChoice[]
}

export interface NPCDefinition {
  id: string
  name: string
  role: NPCRole
  icon: string                // emoji
  x: number
  y: number
  color: number               // THREE.js hex color
  accentColor: number
  dialogue: DialogueNode[]
  shopItems?: string[]         // item IDs this NPC sells (shopkeeper role)
  questIds?: string[]          // quests this NPC offers
}

// ─── Bestiary ─────────────────────────────────────────────────────────────────

export interface BestiaryEntry {
  kills: number
  tamed: boolean
}
