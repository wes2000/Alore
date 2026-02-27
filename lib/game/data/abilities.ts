import { AbilityDefinition, AbilityType, DamageType, Element, StatusEffect } from './types'

export const ABILITIES: Record<string, AbilityDefinition> = {
  // ─── Basic Attacks ─────────────────────────────────────────────────────────
  scratch: {
    id: 'scratch', name: 'Scratch', description: 'A quick claw swipe.',
    type: AbilityType.Instant, element: Element.None, damageType: DamageType.Physical,
    basePower: 12, cooldown: 0.8, range: 1.2, aoeRadius: 0, energyCost: 0,
    isBondAbility: false, isPassive: false,
  },
  bite: {
    id: 'bite', name: 'Bite', description: 'A fierce bite.',
    type: AbilityType.Instant, element: Element.None, damageType: DamageType.Physical,
    basePower: 18, cooldown: 1.2, range: 1.2, aoeRadius: 0, energyCost: 5,
    isBondAbility: false, isPassive: false,
  },
  tackle: {
    id: 'tackle', name: 'Tackle', description: 'Charges forward with full force.',
    type: AbilityType.Instant, element: Element.None, damageType: DamageType.Physical,
    basePower: 22, cooldown: 1.5, range: 1.5, aoeRadius: 0, energyCost: 8,
    isBondAbility: false, isPassive: false,
  },

  // ─── Fire Abilities ────────────────────────────────────────────────────────
  ember_toss: {
    id: 'ember_toss', name: 'Ember Toss', description: 'Hurls a burning ember that applies Burn.',
    type: AbilityType.Instant, element: Element.Fire, damageType: DamageType.Magical,
    basePower: 28, cooldown: 2.5, range: 5, aoeRadius: 0,
    statusEffect: StatusEffect.Burn, statusChance: 0.6, statusDuration: 4,
    energyCost: 15, isBondAbility: false, isPassive: false,
  },
  dash_strike: {
    id: 'dash_strike', name: 'Dash Strike', description: 'Closes gap instantly, dealing high damage.',
    type: AbilityType.Instant, element: Element.Fire, damageType: DamageType.Physical,
    basePower: 45, cooldown: 5.0, range: 4, aoeRadius: 0, energyCost: 25,
    isBondAbility: false, isPassive: false,
  },
  magma_toss: {
    id: 'magma_toss', name: 'Magma Toss', description: 'A slower but devastating molten projectile.',
    type: AbilityType.Charged, element: Element.Fire, damageType: DamageType.Magical,
    basePower: 65, cooldown: 4.0, range: 6, aoeRadius: 1.2,
    statusEffect: StatusEffect.Burn, statusChance: 0.9, statusDuration: 5,
    energyCost: 35, isBondAbility: false, isPassive: false,
  },
  inferno_surge: {
    id: 'inferno_surge', name: 'Inferno Surge', description: 'All fire abilities become AoE for 8 seconds.',
    type: AbilityType.Toggle, element: Element.Fire, damageType: DamageType.Magical,
    basePower: 0, cooldown: 60, range: 0, aoeRadius: 0, energyCost: 50,
    isBondAbility: true, isPassive: false,
  },
  heated_coat: {
    id: 'heated_coat', name: 'Heated Coat', description: 'Attackers take minor fire damage.',
    type: AbilityType.Reaction, element: Element.Fire, damageType: DamageType.Magical,
    basePower: 8, cooldown: 0, range: 0, aoeRadius: 0, energyCost: 0,
    isBondAbility: false, isPassive: true,
  },
  flame_body: {
    id: 'flame_body', name: 'Flame Body', description: '20% chance to burn attacker on hit.',
    type: AbilityType.Reaction, element: Element.Fire, damageType: DamageType.Magical,
    basePower: 15, cooldown: 0, range: 0, aoeRadius: 0,
    statusEffect: StatusEffect.Burn, statusChance: 0.2, statusDuration: 3,
    energyCost: 0, isBondAbility: false, isPassive: true,
  },

  // ─── Water Abilities ───────────────────────────────────────────────────────
  water_jet: {
    id: 'water_jet', name: 'Water Jet', description: 'A pressurized water stream.',
    type: AbilityType.Instant, element: Element.Water, damageType: DamageType.Magical,
    basePower: 30, cooldown: 2.5, range: 5, aoeRadius: 0,
    statusEffect: StatusEffect.Slow, statusChance: 0.4, statusDuration: 2,
    energyCost: 18, isBondAbility: false, isPassive: false,
  },
  tidal_wave: {
    id: 'tidal_wave', name: 'Tidal Wave', description: 'Summons a wave that hits all nearby enemies.',
    type: AbilityType.Instant, element: Element.Water, damageType: DamageType.Magical,
    basePower: 50, cooldown: 7.0, range: 3, aoeRadius: 3,
    statusEffect: StatusEffect.Slow, statusChance: 0.7, statusDuration: 3,
    energyCost: 40, isBondAbility: false, isPassive: false,
  },
  healing_rain: {
    id: 'healing_rain', name: 'Healing Rain', description: 'Channels a rain that heals all allies.',
    type: AbilityType.Channeled, element: Element.Water, damageType: DamageType.True,
    basePower: 20, cooldown: 15.0, range: 0, aoeRadius: 4, energyCost: 45,
    isBondAbility: false, isPassive: false,
  },
  hydro_bond: {
    id: 'hydro_bond', name: 'Hydro Bond', description: 'Bond aura: reduces all incoming damage by 15%.',
    type: AbilityType.Toggle, element: Element.Water, damageType: DamageType.True,
    basePower: 0, cooldown: 0, range: 0, aoeRadius: 0, energyCost: 0,
    isBondAbility: true, isPassive: true,
  },

  // ─── Earth Abilities ───────────────────────────────────────────────────────
  earth_slam: {
    id: 'earth_slam', name: 'Earth Slam', description: 'Pounds the ground, stunning nearby enemies.',
    type: AbilityType.Instant, element: Element.Earth, damageType: DamageType.Physical,
    basePower: 40, cooldown: 4.0, range: 2, aoeRadius: 2.5,
    statusEffect: StatusEffect.Stun, statusChance: 0.5, statusDuration: 1.5,
    energyCost: 30, isBondAbility: false, isPassive: false,
  },
  stone_shield: {
    id: 'stone_shield', name: 'Stone Shield', description: 'Encases self in stone. +50% DEF for 6s.',
    type: AbilityType.Toggle, element: Element.Earth, damageType: DamageType.True,
    basePower: 0, cooldown: 12.0, range: 0, aoeRadius: 0, energyCost: 25,
    isBondAbility: false, isPassive: false,
  },
  boulder_toss: {
    id: 'boulder_toss', name: 'Boulder Toss', description: 'Hold to charge. Scales 1x to 3x power.',
    type: AbilityType.Charged, element: Element.Earth, damageType: DamageType.Physical,
    basePower: 35, cooldown: 5.0, range: 7, aoeRadius: 1.5, energyCost: 28,
    isBondAbility: false, isPassive: false,
  },
  titan_bond: {
    id: 'titan_bond', name: 'Titan Bond', description: 'Bond: player gains 20% of this pet\'s DEF as bonus armor.',
    type: AbilityType.Toggle, element: Element.Earth, damageType: DamageType.True,
    basePower: 0, cooldown: 0, range: 0, aoeRadius: 0, energyCost: 0,
    isBondAbility: true, isPassive: true,
  },

  // ─── Lightning Abilities ───────────────────────────────────────────────────
  lightning_bolt: {
    id: 'lightning_bolt', name: 'Lightning Bolt', description: 'Strikes a target with electricity.',
    type: AbilityType.Instant, element: Element.Lightning, damageType: DamageType.Magical,
    basePower: 35, cooldown: 2.0, range: 6, aoeRadius: 0,
    statusEffect: StatusEffect.Stun, statusChance: 0.25, statusDuration: 1,
    energyCost: 20, isBondAbility: false, isPassive: false,
  },
  chain_lightning: {
    id: 'chain_lightning', name: 'Chain Lightning', description: 'Arcs to up to 3 enemies.',
    type: AbilityType.Instant, element: Element.Lightning, damageType: DamageType.Magical,
    basePower: 30, cooldown: 5.0, range: 5, aoeRadius: 0, energyCost: 35,
    isBondAbility: false, isPassive: false,
  },

  // ─── Wind Abilities ────────────────────────────────────────────────────────
  gust: {
    id: 'gust', name: 'Gust', description: 'A burst of wind that knocks enemies back.',
    type: AbilityType.Instant, element: Element.Wind, damageType: DamageType.Physical,
    basePower: 22, cooldown: 3.0, range: 4, aoeRadius: 2,
    statusEffect: StatusEffect.Slow, statusChance: 0.5, statusDuration: 2,
    energyCost: 15, isBondAbility: false, isPassive: false,
  },
  tailwind: {
    id: 'tailwind', name: 'Tailwind', description: 'Aura: +20% movement speed for player and pets.',
    type: AbilityType.Toggle, element: Element.Wind, damageType: DamageType.True,
    basePower: 0, cooldown: 0, range: 0, aoeRadius: 0, energyCost: 10,
    isBondAbility: false, isPassive: true,
  },

  // ─── Shadow Abilities ──────────────────────────────────────────────────────
  shadow_strike: {
    id: 'shadow_strike', name: 'Shadow Strike', description: 'Teleports behind target and strikes.',
    type: AbilityType.Instant, element: Element.Shadow, damageType: DamageType.Physical,
    basePower: 55, cooldown: 6.0, range: 5, aoeRadius: 0,
    statusEffect: StatusEffect.Blind, statusChance: 0.4, statusDuration: 2,
    energyCost: 35, isBondAbility: false, isPassive: false,
  },
  shadow_veil: {
    id: 'shadow_veil', name: 'Shadow Veil', description: 'Passive: 15% dodge chance.',
    type: AbilityType.Reaction, element: Element.Shadow, damageType: DamageType.True,
    basePower: 0, cooldown: 0, range: 0, aoeRadius: 0, energyCost: 0,
    isBondAbility: false, isPassive: true,
  },

  // ─── Light Abilities ───────────────────────────────────────────────────────
  holy_beam: {
    id: 'holy_beam', name: 'Holy Beam', description: 'A beam of sacred light.',
    type: AbilityType.Instant, element: Element.Light, damageType: DamageType.Magical,
    basePower: 38, cooldown: 3.0, range: 6, aoeRadius: 0, energyCost: 22,
    isBondAbility: false, isPassive: false,
  },
  mending_light: {
    id: 'mending_light', name: 'Mending Light', description: 'Heals the lowest-HP ally.',
    type: AbilityType.Instant, element: Element.Light, damageType: DamageType.True,
    basePower: 40, cooldown: 8.0, range: 6, aoeRadius: 0, energyCost: 30,
    isBondAbility: false, isPassive: false,
  },
  radiance_bond: {
    id: 'radiance_bond', name: 'Radiance Bond', description: 'Bond: heals player for 2% max HP per second.',
    type: AbilityType.Toggle, element: Element.Light, damageType: DamageType.True,
    basePower: 0, cooldown: 0, range: 0, aoeRadius: 6, energyCost: 0,
    isBondAbility: true, isPassive: true,
  },

  // ─── Arcane Abilities ──────────────────────────────────────────────────────
  arcane_burst: {
    id: 'arcane_burst', name: 'Arcane Burst', description: 'An unstable bolt of pure magic.',
    type: AbilityType.Instant, element: Element.Arcane, damageType: DamageType.Magical,
    basePower: 42, cooldown: 3.0, range: 5, aoeRadius: 0, energyCost: 25,
    isBondAbility: false, isPassive: false,
  },
  phase_shift: {
    id: 'phase_shift', name: 'Phase Shift', description: 'Brief invulnerability for 0.8 seconds.',
    type: AbilityType.Instant, element: Element.Arcane, damageType: DamageType.True,
    basePower: 0, cooldown: 20.0, range: 0, aoeRadius: 0, energyCost: 40,
    isBondAbility: false, isPassive: false,
  },
}
