import { PetTier, PlayerState, SkillType } from '../data/types'
import { PET_DEFINITIONS } from '../data/pets'
import { PetSystem } from './PetSystem'
import { SkillSystem } from './SkillSystem'
import { eventBus } from '../engine/EventBus'
import { XP_AWARDS } from '../data/skills'

// Minimum taming level required per tier
const TIER_LEVEL_REQS: Record<PetTier, number> = {
  [PetTier.Common]:    1,
  [PetTier.Uncommon]:  10,
  [PetTier.Rare]:      20,
  [PetTier.Elite]:     40,
  [PetTier.Legendary]: 80,
}

// Base capture success rate per tier (before skill/item modifiers)
const TIER_BASE_RATES: Record<PetTier, number> = {
  [PetTier.Common]:    0.60,
  [PetTier.Uncommon]:  0.35,
  [PetTier.Rare]:      0.15,
  [PetTier.Elite]:     0.07,
  [PetTier.Legendary]: 0.02,
}

// Item capture rate bonuses
const ITEM_BONUSES: Record<string, number> = {
  taming_snare: 0.15,
  beast_collar: 0.25,
  spirit_lure:  0.35,
}

// Resistance modifier per failed attempt (stacks up to 3 times)
const PERSISTENCE_REDUCTION = 0.08  // 8% easier per previous fail

export class TamingSystem {
  private playerState: PlayerState
  private petSystem: PetSystem
  private skillSystem: SkillSystem

  // Track previous failed taming attempts against each mob instance
  private failedAttempts = new Map<string, number>()

  constructor(playerState: PlayerState, petSystem: PetSystem, skillSystem: SkillSystem) {
    this.playerState = playerState
    this.petSystem = petSystem
    this.skillSystem = skillSystem
  }

  /** Check if the player can attempt to tame a given pet definition */
  canAttempt(petDefId: string, itemId?: string): { can: boolean; reason?: string } {
    const def = PET_DEFINITIONS[petDefId]
    if (!def) return { can: false, reason: 'Unknown creature' }

    const tamingLevel = this.skillSystem.getSkillLevel(SkillType.Taming)

    if (tamingLevel < TIER_LEVEL_REQS[def.tier]) {
      return {
        can: false,
        reason: `Requires Taming level ${TIER_LEVEL_REQS[def.tier]} (you have ${tamingLevel})`,
      }
    }

    if (tamingLevel < def.tamingLevel) {
      return {
        can: false,
        reason: `This creature requires Taming level ${def.tamingLevel}`,
      }
    }

    if (itemId) {
      const hasItem = this.playerState.inventory.some(i => i.itemId === itemId && i.quantity > 0)
      if (!hasItem) {
        return { can: false, reason: `You need a ${itemId.replace(/_/g, ' ')}` }
      }
    } else {
      // Without item, can only tame Common
      if (def.tier !== PetTier.Common) {
        return { can: false, reason: 'This creature requires a taming item' }
      }
    }

    return { can: true }
  }

  /** Attempt to tame a creature */
  attempt(
    mobInstanceId: string,
    petDefId: string,
    mobLevel: number,
    itemId?: string
  ): { success: boolean; message: string } {
    const check = this.canAttempt(petDefId, itemId)
    if (!check.can) {
      return { success: false, message: check.reason ?? 'Cannot tame' }
    }

    const def = PET_DEFINITIONS[petDefId]
    if (!def) return { success: false, message: 'Unknown creature' }

    // Consume the taming item
    if (itemId) {
      const idx = this.playerState.inventory.findIndex(i => i.itemId === itemId)
      if (idx !== -1) {
        this.playerState.inventory[idx].quantity--
        if (this.playerState.inventory[idx].quantity <= 0) {
          this.playerState.inventory.splice(idx, 1)
        }
      }
    }

    // Calculate success chance
    const tamingLevel = this.skillSystem.getSkillLevel(SkillType.Taming)
    const luckLevel   = this.skillSystem.getSkillLevel(SkillType.Luck)

    let rate = TIER_BASE_RATES[def.tier]

    // Taming skill bonus: each level above requirement adds ~0.5%
    const levelOverRequirement = tamingLevel - Math.max(TIER_LEVEL_REQS[def.tier], def.tamingLevel)
    rate += Math.max(0, levelOverRequirement) * 0.005

    // Item bonus
    if (itemId) rate += ITEM_BONUSES[itemId] ?? 0

    // Persistence: prior failed attempts against this specific mob
    const fails = Math.min(3, this.failedAttempts.get(mobInstanceId) ?? 0)
    if (tamingLevel >= 90) rate += fails * PERSISTENCE_REDUCTION

    // Luck bonus
    rate += (luckLevel - 1) * 0.001

    // Low HP bonus: easier to catch at low HP (simulate)
    rate += 0.05

    // Soothe balm applied
    if (this.playerState.inventory.some(i => i.itemId === 'soothe_balm')) rate += 0.10

    rate = Math.min(0.95, rate)

    const roll = Math.random()
    const success = roll < rate

    if (success) {
      this.failedAttempts.delete(mobInstanceId)
      const pet = this.petSystem.createPetInstance(petDefId, mobLevel)
      this.petSystem.addPet(pet)

      // Award taming XP
      const xpAwards = XP_AWARDS.taming
      const xpMap: Record<PetTier, number> = {
        [PetTier.Common]:    xpAwards.common,
        [PetTier.Uncommon]:  xpAwards.uncommon,
        [PetTier.Rare]:      xpAwards.rare,
        [PetTier.Elite]:     xpAwards.elite,
        [PetTier.Legendary]: xpAwards.legendary,
      }
      this.skillSystem.awardXP(SkillType.Taming, xpMap[def.tier])

      // Luck XP for rare captures
      if (def.tier === PetTier.Rare || def.tier === PetTier.Elite || def.tier === PetTier.Legendary) {
        this.skillSystem.awardXP(SkillType.Luck, 25)
        eventBus.emit('ui:notification', { message: `Lucky catch!`, type: 'success' })
      }

      return { success: true, message: `Captured ${def.name}!` }
    } else {
      // Track failure for persistence mechanic
      const prevFails = this.failedAttempts.get(mobInstanceId) ?? 0
      this.failedAttempts.set(mobInstanceId, prevFails + 1)

      const successPercent = Math.round(rate * 100)
      return {
        success: false,
        message: `${def.name} broke free! (${successPercent}% chance)`,
      }
    }
  }
}
