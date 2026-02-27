import {
  PetInstance, PetDefinition, PetStats, PlayerState, SkillType,
} from '../data/types'
import { PET_DEFINITIONS, calcPetStats, getPetXPForLevel } from '../data/pets'
import { eventBus } from '../engine/EventBus'

const MAX_ACTIVE_PETS = 2   // base, increased to 3 at Taming 70

export class PetSystem {
  private playerState: PlayerState

  constructor(playerState: PlayerState) {
    this.playerState = playerState
  }

  get activePets(): PetInstance[] {
    return this.playerState.pets
      .filter(p => p.isActive)
      .sort((a, b) => a.activeSlot - b.activeSlot)
  }

  get allPets(): PetInstance[] {
    return this.playerState.pets
  }

  getMaxActivePets(): number {
    const tamingLevel = this.playerState.skills[SkillType.Taming]?.level ?? 1
    return tamingLevel >= 70 ? 3 : MAX_ACTIVE_PETS
  }

  /** Create a new pet instance from a definition (on capture) */
  createPetInstance(defId: string, captureLevel?: number): PetInstance {
    const def = PET_DEFINITIONS[defId]
    if (!def) throw new Error(`Unknown pet: ${defId}`)

    const level = captureLevel ?? Math.max(1, def.tamingLevel)
    const stats = calcPetStats(def, level)

    // Luck bonus: check if player is lucky (Luck skill level 70+)
    const luckLevel = this.playerState.skills[SkillType.Luck]?.level ?? 1
    const hasLuckyRoll = luckLevel >= 70 && Math.random() < 0.1

    if (hasLuckyRoll) {
      // Above-average stats: each stat gets +10–20% bonus
      const bonus = 1 + 0.1 + Math.random() * 0.1
      stats.hp = Math.floor(stats.hp * bonus)
      stats.maxHp = stats.hp
      stats.atk = Math.floor(stats.atk * bonus)
      stats.def = Math.floor(stats.def * bonus)
      stats.matk = Math.floor(stats.matk * bonus)
      stats.mdef = Math.floor(stats.mdef * bonus)
      stats.spd = Math.floor(stats.spd * bonus)
    }

    return {
      instanceId: generateId(),
      definitionId: defId,
      name: def.name,
      level,
      xp: 0,
      bond: 0,
      stats,
      activeAbilities: def.abilities
        .filter(a => !a.isPassive && !a.isBondAbility)
        .slice(0, 2)
        .map(a => a.id),
      learnedAbilities: def.abilities.map(a => a.id),
      isActive: false,
      activeSlot: -1,
      statusEffects: [],
    }
  }

  /** Add a captured pet to the player's collection */
  addPet(pet: PetInstance): void {
    this.playerState.pets.push(pet)
    eventBus.emit('pet:captured', { pet })
    eventBus.emit('ui:notification', { message: `${pet.name} joined your team!`, type: 'success' })
  }

  /** Activate a pet into a combat slot */
  activatePet(petId: string, slot: number): boolean {
    const max = this.getMaxActivePets()
    if (slot >= max) {
      eventBus.emit('ui:notification', {
        message: `Upgrade Taming to unlock slot ${slot + 1}`,
        type: 'warning',
      })
      return false
    }

    // Deactivate any pet currently in this slot
    const existing = this.playerState.pets.find(p => p.activeSlot === slot && p.isActive)
    if (existing) {
      existing.isActive = false
      existing.activeSlot = -1
    }

    const pet = this.playerState.pets.find(p => p.instanceId === petId)
    if (!pet) return false

    // Remove from any existing slot first
    if (pet.isActive) {
      pet.isActive = false
      pet.activeSlot = -1
    }

    pet.isActive = true
    pet.activeSlot = slot
    return true
  }

  deactivatePet(petId: string): void {
    const pet = this.playerState.pets.find(p => p.instanceId === petId)
    if (pet) {
      pet.isActive = false
      pet.activeSlot = -1
    }
  }

  /** Award XP to a pet and handle level-ups */
  awardPetXP(petId: string, amount: number): void {
    const pet = this.playerState.pets.find(p => p.instanceId === petId)
    if (!pet || pet.level >= 99) return

    const def = PET_DEFINITIONS[pet.definitionId]
    if (!def) return

    pet.xp += amount
    const xpNeeded = getPetXPForLevel(pet.level + 1)

    if (pet.xp >= xpNeeded && pet.level < 99) {
      pet.level++
      // Recalculate stats
      const newStats = calcPetStats(def, pet.level)
      // Preserve current HP ratio
      const hpRatio = pet.stats.hp / pet.stats.maxHp
      pet.stats = newStats
      pet.stats.hp = Math.floor(newStats.maxHp * hpRatio)

      eventBus.emit('pet:level_up', { pet })
      eventBus.emit('ui:notification', { message: `${pet.name} reached level ${pet.level}!`, type: 'success' })

      // Check for evolution availability
      if (def.evolution && pet.level >= def.evolution.requiredLevel) {
        eventBus.emit('ui:notification', {
          message: `${pet.name} can evolve! Check your pet panel.`,
          type: 'info',
        })
      }
    }
  }

  /** Add bond XP to a pet (gained through combat participation) */
  awardBondXP(petId: string, amount: number): void {
    const pet = this.playerState.pets.find(p => p.instanceId === petId)
    if (!pet || pet.bond >= 100) return

    const tamingLevel = this.playerState.skills[SkillType.Taming]?.level ?? 1
    // Taming skill increases bond gain rate
    const bondBonus = 1 + (tamingLevel >= 70 ? 0.5 : tamingLevel >= 40 ? 0.25 : tamingLevel >= 20 ? 0.1 : 0)
    const prevBond = pet.bond

    pet.bond = Math.min(100, pet.bond + amount * bondBonus)

    // Bond milestones
    const milestones = [25, 50, 75, 100]
    for (const m of milestones) {
      if (prevBond < m && pet.bond >= m) {
        eventBus.emit('pet:bond_increased', { petId: pet.instanceId, newBond: pet.bond })

        if (m === 75) {
          const def = PET_DEFINITIONS[pet.definitionId]
          const bondAbility = def?.abilities.find(a => a.isBondAbility)
          if (bondAbility) {
            pet.learnedAbilities.push(bondAbility.id)
            eventBus.emit('ui:notification', {
              message: `${pet.name} learned ${bondAbility.name} (Bond Ability)!`,
              type: 'success',
            })
          }
        }
        eventBus.emit('ui:notification', {
          message: `${pet.name}'s bond reached ${m}!`,
          type: 'info',
        })
      }
    }
  }

  /** Attempt to evolve a pet */
  evolvePet(petId: string): boolean {
    const pet = this.playerState.pets.find(p => p.instanceId === petId)
    if (!pet) return false

    const def = PET_DEFINITIONS[pet.definitionId]
    if (!def?.evolution) return false

    const evo = def.evolution
    if (pet.level < evo.requiredLevel) {
      eventBus.emit('ui:notification', { message: `Need level ${evo.requiredLevel} to evolve`, type: 'warning' })
      return false
    }

    // Check required item
    if (evo.requiredItemId) {
      const itemIdx = this.playerState.inventory.findIndex(i => i.itemId === evo.requiredItemId)
      if (itemIdx === -1) {
        eventBus.emit('ui:notification', {
          message: `Missing: ${evo.requiredItemId.replace(/_/g, ' ')}`,
          type: 'warning',
        })
        return false
      }
      // Consume the item
      const item = this.playerState.inventory[itemIdx]
      item.quantity--
      if (item.quantity <= 0) this.playerState.inventory.splice(itemIdx, 1)
    }

    const fromId = pet.definitionId
    const newDef = PET_DEFINITIONS[evo.targetDefinitionId]
    if (!newDef) return false

    pet.definitionId = evo.targetDefinitionId
    pet.name = newDef.name
    // Recalculate stats (preserve current XP/bond/level)
    const oldHpRatio = pet.stats.hp / pet.stats.maxHp
    pet.stats = calcPetStats(newDef, pet.level)
    pet.stats.hp = Math.floor(pet.stats.maxHp * oldHpRatio)
    // Update available abilities
    pet.learnedAbilities = newDef.abilities.map(a => a.id)
    pet.activeAbilities = newDef.abilities
      .filter(a => !a.isPassive && !a.isBondAbility)
      .slice(0, 2)
      .map(a => a.id)

    eventBus.emit('pet:evolved', { pet, fromId })
    eventBus.emit('ui:notification', { message: `${fromId} evolved into ${pet.name}!`, type: 'success' })
    return true
  }

  /** Calculate total stat for a pet including player skill synergies */
  getPetEffectiveStat(pet: PetInstance, stat: keyof PetStats): number {
    const base = pet.stats[stat] as number
    const def = PET_DEFINITIONS[pet.definitionId]
    if (!def) return base

    const synergies = this.computeSynergies(def, pet)
    let bonus = 0

    if (stat === 'atk' && synergies.vanguardAtkBonus) bonus += synergies.vanguardAtkBonus
    if (stat === 'matk' && synergies.sageMatkBonus) bonus += synergies.sageMatkBonus
    if (stat === 'hp' || stat === 'maxHp') {
      if (synergies.petHpInherit) bonus += synergies.petHpInherit * (this.playerState.maxHp)
    }

    return Math.floor(base + bonus)
  }

  private computeSynergies(def: PetDefinition, pet: PetInstance): Record<string, number> {
    const s: Record<string, number> = {}
    const taming  = this.playerState.skills[SkillType.Taming]?.level  ?? 1
    const melee   = this.playerState.skills[SkillType.Melee]?.level   ?? 1
    const magic   = this.playerState.skills[SkillType.Magic]?.level   ?? 1
    const vitality= this.playerState.skills[SkillType.Vitality]?.level ?? 1

    if (taming >= 60 && melee >= 60) s.vanguardAtkBonus = melee * 0.15
    if (taming >= 60 && magic >= 60) s.sageMatkBonus = magic * 0.15
    if (taming >= 50 && vitality >= 50) s.petHpInherit = 0.10

    return s
  }

  /** Heal a pet */
  healPet(petId: string, amount: number): void {
    const pet = this.playerState.pets.find(p => p.instanceId === petId)
    if (!pet) return
    const maxHp = this.getPetEffectiveStat(pet, 'maxHp')
    pet.stats.hp = Math.min(maxHp, pet.stats.hp + amount)
  }

  /** Apply damage to a pet */
  damagePet(petId: string, amount: number): void {
    const pet = this.playerState.pets.find(p => p.instanceId === petId)
    if (!pet) return
    pet.stats.hp = Math.max(0, pet.stats.hp - amount)
    if (pet.stats.hp === 0) {
      pet.isActive = false
      pet.activeSlot = -1
      eventBus.emit('pet:died', { petId })
      eventBus.emit('ui:notification', { message: `${pet.name} fainted!`, type: 'danger' })
    }
  }

  /** Revive all fainted pets with partial HP (at rest point / potion use) */
  reviveAll(hpPercent = 0.5): void {
    for (const pet of this.playerState.pets) {
      if (pet.stats.hp === 0) {
        pet.stats.hp = Math.floor(pet.stats.maxHp * hpPercent)
      }
    }
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
