import { SkillType, SkillState, PlayerState } from '../data/types'
import { xpForLevel, levelFromXP, xpToNextLevel, SKILL_DEFINITIONS } from '../data/skills'
import { eventBus } from '../engine/EventBus'

export class SkillSystem {
  private playerState: PlayerState

  constructor(playerState: PlayerState) {
    this.playerState = playerState
  }

  /** Award XP to a skill, handling level-ups and milestones */
  awardXP(skill: SkillType, amount: number): void {
    if (amount <= 0) return

    const state = this.playerState.skills[skill]
    if (!state || state.level >= 99) return

    // Apply Luck bonus: each Luck level = tiny XP boost
    const luckLevel = this.playerState.skills[SkillType.Luck]?.level ?? 1
    const luckBonus = 1 + (luckLevel * 0.001)  // max ~10% at level 99
    const finalAmount = amount * luckBonus

    const prevLevel = state.level
    state.xp += finalAmount

    // Recalculate level
    const newLevel = Math.min(99, levelFromXP(state.xp))
    state.level = newLevel
    state.xpToNext = xpToNextLevel(state.xp, newLevel)

    eventBus.emit('skill:xp_gained', { skill, amount: finalAmount })

    // Level-up events
    if (newLevel > prevLevel) {
      for (let l = prevLevel + 1; l <= newLevel; l++) {
        eventBus.emit('skill:level_up', { skill, newLevel: l })

        // Apply level-up bonuses for special skills
        this.applyLevelUpBonus(skill, l)

        // Check milestones
        const def = SKILL_DEFINITIONS[skill]
        const milestone = def.milestones.find(m => m.level === l)
        if (milestone) {
          eventBus.emit('skill:milestone', { skill, level: l, title: milestone.title })
          eventBus.emit('ui:notification', {
            message: `${def.name} ${l}: ${milestone.title}`,
            type: 'success',
          })
        }
      }
    }
  }

  private applyLevelUpBonus(skill: SkillType, level: number): void {
    const player = this.playerState

    switch (skill) {
      case SkillType.Vitality:
        // Recalculate max HP: base 100 + 5 per level
        player.maxHp = 100 + (level - 1) * 5
        // Milestone bonuses
        if (level >= 10) player.maxHp += 50
        if (level >= 40) player.maxHp += 100
        if (level >= 90) player.maxHp += 200
        player.hp = Math.min(player.hp + 5, player.maxHp)
        eventBus.emit('player:hp_changed', { current: player.hp, max: player.maxHp })
        break

      case SkillType.Defense:
        // Increase max energy
        player.maxEnergy = 100 + Math.floor((level - 1) * 0.8)
        break

      default:
        break
    }
  }

  // ─── Gathering Speed Bonus ──────────────────────────────────────────────

  /** Get gathering speed bonus for a skill (0.0 = no bonus, 0.1 = 10% faster) */
  getGatheringSpeedBonus(skill: SkillType): number {
    const level = this.getSkillLevel(skill)
    let bonus = 0

    // Per-level bonus: 1% per level up to 50%
    bonus += Math.min(0.5, level * 0.01)

    // Milestone passives
    const def = SKILL_DEFINITIONS[skill]
    for (const milestone of def.milestones) {
      if (level >= milestone.level && milestone.passiveBonus?.stat?.includes('Speed')) {
        bonus += milestone.passiveBonus.value
      }
    }

    return bonus
  }

  // ─── Combat Passive Helpers ─────────────────────────────────────────────

  /** Flat damage reduction from Defense milestones */
  getDamageReduction(): number {
    const defLevel = this.getSkillLevel(SkillType.Defense)
    const vitLevel = this.getSkillLevel(SkillType.Vitality)
    let reduction = 0

    // Defense 30: Iron Hide — 3% reduction
    if (defLevel >= 30) reduction += 0.03
    // Defense 60: Fortress — 8% total
    if (defLevel >= 60) reduction = 0.08
    // Defense + Vitality 70: Iron Body — +5%
    if (defLevel >= 70 && vitLevel >= 70) reduction += 0.05

    return reduction
  }

  /** Vitality 60: Indomitable — 20% less damage below 25% HP */
  getIndomitableReduction(): number {
    const vitLevel = this.getSkillLevel(SkillType.Vitality)
    if (vitLevel >= 60 && this.playerState.hp < this.playerState.maxHp * 0.25) {
      return 0.2
    }
    return 0
  }

  /** Magic 20: Spellcaster — 10% spell power bonus */
  getMagicPowerBonus(): number {
    const magicLevel = this.getSkillLevel(SkillType.Magic)
    let bonus = 0
    if (magicLevel >= 20) bonus += 0.10
    if (magicLevel >= 40) bonus += 0.10  // Archmage: total 20%
    return bonus
  }

  /** Ranged damage bonus helpers */
  getRangedDamageBonus(distToTarget: number): number {
    const rangedLevel = this.getSkillLevel(SkillType.Ranged)
    let bonus = 0
    // Ranged 50: Sniper — +20% if target > 6 tiles
    if (rangedLevel >= 50 && distToTarget > 6) bonus += 0.20
    return bonus
  }

  /** Melee 20: Warrior — 15% knockback chance */
  getKnockbackChance(): number {
    const meleeLevel = this.getSkillLevel(SkillType.Melee)
    return meleeLevel >= 20 ? 0.15 : 0
  }

  /** Ranged 30: Sharpshooter — 15% headshot chance (1.5x damage) */
  getHeadshotChance(): number {
    const rangedLevel = this.getSkillLevel(SkillType.Ranged)
    return rangedLevel >= 30 ? 0.15 : 0
  }

  /** Melee 50: Blade Dancer — 10% free hit */
  getBladeDanceChance(): number {
    const meleeLevel = this.getSkillLevel(SkillType.Melee)
    return meleeLevel >= 50 ? 0.10 : 0
  }

  /** Get combat ATK including weapon and skills */
  getPlayerATK(): number {
    const meleeLevel = this.getSkillLevel(SkillType.Melee)
    const rangedLevel = this.getSkillLevel(SkillType.Ranged)
    let baseAtk = 12 + (meleeLevel - 1) * 2

    // Read equipped weapon stat bonus
    const weapon = this.playerState.equipment?.weapon
    if (weapon) {
      const { ITEM_DEFINITIONS } = require('../data/items')
      const def = ITEM_DEFINITIONS[weapon]
      if (def?.statBonus?.atk) baseAtk += def.statBonus.atk
      if (def?.statBonus?.matk) baseAtk += def.statBonus.matk
    }

    return baseAtk
  }

  /** Get player DEF including equipment */
  getPlayerDEF(): number {
    const defLevel = this.getSkillLevel(SkillType.Defense)
    let baseDef = Math.floor(defLevel * 0.5)

    // Read equipped armor/shield stat bonuses
    const eq = this.playerState.equipment
    if (eq) {
      const { ITEM_DEFINITIONS } = require('../data/items')
      for (const slot of ['offhand', 'body'] as const) {
        const itemId = eq[slot]
        if (itemId) {
          const def = ITEM_DEFINITIONS[itemId]
          if (def?.statBonus?.def) baseDef += def.statBonus.def
        }
      }
    }

    return baseDef
  }

  getSkillLevel(skill: SkillType): number {
    return this.playerState.skills[skill]?.level ?? 1
  }

  getSkillXP(skill: SkillType): number {
    return this.playerState.skills[skill]?.xp ?? 0
  }

  /** Check if a skill requirement is met */
  meetsRequirement(skill: SkillType, level: number): boolean {
    return this.getSkillLevel(skill) >= level
  }

  /** XP progress percentage toward next level */
  getProgressPercent(skill: SkillType): number {
    const state = this.playerState.skills[skill]
    if (!state || state.level >= 99) return 100
    const levelStart = xpForLevel(state.level)
    const levelEnd   = xpForLevel(state.level + 1)
    const range = levelEnd - levelStart
    if (range <= 0) return 100
    return Math.min(100, ((state.xp - levelStart) / range) * 100)
  }

  /** Total level across all 16 skills (like OSRS total level) */
  getTotalLevel(): number {
    return Object.values(this.playerState.skills).reduce((sum, s) => sum + s.level, 0)
  }

  /** Cross-skill synergy bonuses (calculated on demand) */
  getSynergies(): Record<string, number> {
    const skills = this.playerState.skills
    const synergies: Record<string, number> = {}

    const mining    = skills[SkillType.Mining]?.level    ?? 1
    const smithing  = skills[SkillType.Smithing]?.level  ?? 1
    const fishing   = skills[SkillType.Fishing]?.level   ?? 1
    const cooking   = skills[SkillType.Cooking]?.level   ?? 1
    const wc        = skills[SkillType.Woodcutting]?.level ?? 1
    const crafting  = skills[SkillType.Crafting]?.level  ?? 1
    const foraging  = skills[SkillType.Foraging]?.level  ?? 1
    const alchemy   = skills[SkillType.Alchemy]?.level   ?? 1
    const taming    = skills[SkillType.Taming]?.level    ?? 1
    const melee     = skills[SkillType.Melee]?.level     ?? 1
    const magic     = skills[SkillType.Magic]?.level     ?? 1
    const defense   = skills[SkillType.Defense]?.level   ?? 1
    const vitality  = skills[SkillType.Vitality]?.level  ?? 1
    const ranged    = skills[SkillType.Ranged]?.level    ?? 1
    const expl      = skills[SkillType.Exploration]?.level ?? 1
    const luck      = skills[SkillType.Luck]?.level      ?? 1

    // Mining + Smithing 50+: alloy crafting
    if (mining >= 50 && smithing >= 50) synergies['alloy_crafting'] = 1

    // Fishing + Cooking 40+: double meal buff duration
    if (fishing >= 40 && cooking >= 40) synergies['seafarer_double_duration'] = 2.0

    // Woodcutting + Crafting 50+: Runic Bow
    if (wc >= 50 && crafting >= 50) synergies['runic_bow'] = 1

    // Foraging + Alchemy 40+: potion double dose chance
    if (foraging >= 40 && alchemy >= 40) synergies['herbmaster_double_dose'] = 0.25

    // Taming + Melee 60+: Vanguard pets get ATK bonus
    if (taming >= 60 && melee >= 60) synergies['vanguard_atk_bonus'] = melee * 0.15

    // Taming + Magic 60+: Sage pets get MATK bonus
    if (taming >= 60 && magic >= 60) synergies['sage_matk_bonus'] = magic * 0.15

    // Taming + Vitality 50+: Pets inherit HP
    if (taming >= 50 && vitality >= 50) synergies['pet_hp_inherit'] = 0.10

    // Exploration + Luck 50+: reveal cursed caches
    if (expl >= 50 && luck >= 50) synergies['cursed_cache_reveal'] = 1

    // Defense + Vitality 70+: flat damage reduction
    if (defense >= 70 && vitality >= 70) synergies['iron_body_reduction'] = 0.05

    // Magic + Alchemy 60+: Spell Amplifiers
    if (magic >= 60 && alchemy >= 60) synergies['spell_amplifier'] = 1

    return synergies
  }
}
