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
    statusEffect: StatusEffect.Slow, statusChance: 0.8, statusDuration: 4,
  },
  inferno_wave: {
    id: 'inferno_wave', name: 'Inferno Wave', description: 'AoE fire wave in front of caster.',
    element: Element.Fire, damageType: DamageType.Magical,
    basePower: 35, range: 3, aoeRadius: 2, energyCost: 28, cooldown: 3.5,
    magicLevelReq: 25,
    statusEffect: StatusEffect.Burn, statusChance: 0.8, statusDuration: 5,
  },
}

/** Get spells unlocked at or below a given Magic level */
export function getUnlockedSpells(magicLevel: number): SpellDefinition[] {
  return Object.values(SPELLS)
    .filter(s => s.magicLevelReq <= magicLevel)
    .sort((a, b) => a.magicLevelReq - b.magicLevelReq)
}
