import { Element, DamageType, StatusEffect } from './types'

export interface SpellDefinition {
  id: string
  name: string
  description: string
  element: Element
  damageType: DamageType
  basePower: number
  range: number           // tiles
  aoeRadius: number       // 0 = single target
  energyCost: number
  cooldown: number        // seconds
  magicLevelReq: number   // Magic skill level required
  statusEffect?: StatusEffect
  statusChance?: number   // 0-1
  statusDuration?: number // seconds
  chainTargets?: number   // for chain spells
}

export const SPELLS: Record<string, SpellDefinition> = {
  // ─── Arcane (unlocked at Magic 1) ────────────────────────────────────────
  arcane_bolt: {
    id: 'arcane_bolt', name: 'Arcane Bolt', description: 'A bolt of pure arcane energy.',
    element: Element.Arcane, damageType: DamageType.Magical,
    basePower: 15, range: 4, aoeRadius: 0, energyCost: 8, cooldown: 0.8,
    magicLevelReq: 1,
  },

  // ─── Element spells (unlocked at Magic 10) ──────────────────────────────
  fire_bolt: {
    id: 'fire_bolt', name: 'Fire Bolt', description: 'Launches a fiery projectile. 60% Burn chance.',
    element: Element.Fire, damageType: DamageType.Magical,
    basePower: 22, range: 4, aoeRadius: 0, energyCost: 14, cooldown: 1.2,
    magicLevelReq: 10,
    statusEffect: StatusEffect.Burn, statusChance: 0.6, statusDuration: 4,
  },
  water_bolt: {
    id: 'water_bolt', name: 'Water Bolt', description: 'A pressurized water bolt. 40% Slow chance.',
    element: Element.Water, damageType: DamageType.Magical,
    basePower: 20, range: 4, aoeRadius: 0, energyCost: 12, cooldown: 1.0,
    magicLevelReq: 10,
    statusEffect: StatusEffect.Slow, statusChance: 0.4, statusDuration: 3,
  },
  earth_spike: {
    id: 'earth_spike', name: 'Earth Spike', description: 'Erupts spikes from the ground in an area.',
    element: Element.Earth, damageType: DamageType.Magical,
    basePower: 25, range: 3, aoeRadius: 1.5, energyCost: 16, cooldown: 1.5,
    magicLevelReq: 10,
  },
  lightning_arc: {
    id: 'lightning_arc', name: 'Lightning Arc', description: 'Arcs lightning, chaining to nearby enemies.',
    element: Element.Lightning, damageType: DamageType.Magical,
    basePower: 18, range: 4, aoeRadius: 0, energyCost: 18, cooldown: 1.5,
    magicLevelReq: 10,
    statusEffect: StatusEffect.Stun, statusChance: 0.2, statusDuration: 1,
    chainTargets: 2,
  },

  // ─── Tier 2 spells (Magic 25+) ──────────────────────────────────────────
  frost_nova: {
    id: 'frost_nova', name: 'Frost Nova', description: 'AoE freeze burst around the caster.',
    element: Element.Water, damageType: DamageType.Magical,
    basePower: 30, range: 0, aoeRadius: 3, energyCost: 25, cooldown: 4,
    magicLevelReq: 25,
    statusEffect: StatusEffect.Freeze, statusChance: 0.7, statusDuration: 2,
  },
  inferno_wave: {
    id: 'inferno_wave', name: 'Inferno Wave', description: 'AoE fire wave in front of caster.',
    element: Element.Fire, damageType: DamageType.Magical,
    basePower: 35, range: 3, aoeRadius: 2, energyCost: 28, cooldown: 3.5,
    magicLevelReq: 25,
    statusEffect: StatusEffect.Burn, statusChance: 0.8, statusDuration: 5,
  },
  shadow_curse: {
    id: 'shadow_curse', name: 'Shadow Curse', description: 'Weakens and poisons a target.',
    element: Element.Shadow, damageType: DamageType.Magical,
    basePower: 18, range: 5, aoeRadius: 0, energyCost: 20, cooldown: 3,
    magicLevelReq: 25,
    statusEffect: StatusEffect.Poison, statusChance: 0.8, statusDuration: 6,
  },
  gust_blast: {
    id: 'gust_blast', name: 'Gust Blast', description: 'A burst of wind that slows enemies in an area.',
    element: Element.Wind, damageType: DamageType.Magical,
    basePower: 20, range: 4, aoeRadius: 2.5, energyCost: 18, cooldown: 2.5,
    magicLevelReq: 25,
    statusEffect: StatusEffect.Slow, statusChance: 0.6, statusDuration: 3,
  },

  // ─── Tier 3 spells (Magic 40+) ──────────────────────────────────────────
  ice_prison: {
    id: 'ice_prison', name: 'Ice Prison', description: 'Freezes a single target solid.',
    element: Element.Water, damageType: DamageType.Magical,
    basePower: 15, range: 5, aoeRadius: 0, energyCost: 30, cooldown: 8,
    magicLevelReq: 40,
    statusEffect: StatusEffect.Freeze, statusChance: 0.95, statusDuration: 3,
  },
  thunder_clap: {
    id: 'thunder_clap', name: 'Thunder Clap', description: 'AoE stun around caster.',
    element: Element.Lightning, damageType: DamageType.Magical,
    basePower: 40, range: 0, aoeRadius: 3, energyCost: 35, cooldown: 6,
    magicLevelReq: 40,
    statusEffect: StatusEffect.Stun, statusChance: 0.7, statusDuration: 1.5,
  },
  life_drain: {
    id: 'life_drain', name: 'Life Drain', description: 'Drains life from target, healing caster.',
    element: Element.Shadow, damageType: DamageType.Magical,
    basePower: 30, range: 4, aoeRadius: 0, energyCost: 25, cooldown: 4,
    magicLevelReq: 40,
    statusEffect: StatusEffect.Weaken, statusChance: 0.5, statusDuration: 4,
  },
  stone_skin: {
    id: 'stone_skin', name: 'Stone Skin', description: 'Hardens your body. Self buff, no damage.',
    element: Element.Earth, damageType: DamageType.True,
    basePower: 0, range: 0, aoeRadius: 0, energyCost: 30, cooldown: 15,
    magicLevelReq: 40,
  },

  // ─── Tier 4 spells (Magic 60+) ──────────────────────────────────────────
  meteor: {
    id: 'meteor', name: 'Meteor', description: 'Calls down a meteor. Massive AoE fire damage.',
    element: Element.Fire, damageType: DamageType.Magical,
    basePower: 70, range: 5, aoeRadius: 3, energyCost: 50, cooldown: 12,
    magicLevelReq: 60,
    statusEffect: StatusEffect.Burn, statusChance: 0.9, statusDuration: 6,
  },
  chain_lightning: {
    id: 'chain_lightning', name: 'Chain Lightning', description: 'Bounces between up to 4 enemies.',
    element: Element.Lightning, damageType: DamageType.Magical,
    basePower: 35, range: 5, aoeRadius: 0, energyCost: 40, cooldown: 5,
    magicLevelReq: 60,
    statusEffect: StatusEffect.Stun, statusChance: 0.3, statusDuration: 1,
    chainTargets: 4,
  },
  purify: {
    id: 'purify', name: 'Purify', description: 'Removes all debuffs from self.',
    element: Element.Light, damageType: DamageType.True,
    basePower: 0, range: 0, aoeRadius: 0, energyCost: 20, cooldown: 10,
    magicLevelReq: 60,
  },
}

/** Get spells unlocked at or below a given Magic level */
export function getUnlockedSpells(magicLevel: number): SpellDefinition[] {
  return Object.values(SPELLS)
    .filter(s => s.magicLevelReq <= magicLevel)
    .sort((a, b) => a.magicLevelReq - b.magicLevelReq)
}
