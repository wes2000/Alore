import { PlayerState, SkillType, Element, StatusEffect } from '../data/types'
import { SPELLS, SpellDefinition, getUnlockedSpells } from '../data/spells'
import { SkillSystem } from './SkillSystem'
import { eventBus } from '../engine/EventBus'

export class SpellSystem {
  private player: PlayerState
  private skillSystem: SkillSystem
  private cooldowns = new Map<string, number>()  // spellId → remaining cooldown
  private lastCastTime = 0

  constructor(player: PlayerState, skillSystem: SkillSystem) {
    this.player = player
    this.skillSystem = skillSystem
  }

  /** Get currently equipped spell */
  getCurrentSpell(): SpellDefinition | null {
    const unlocked = this.getUnlockedSpells()
    if (unlocked.length === 0) return null
    const idx = Math.max(0, Math.min(this.player.equippedSpellIndex, unlocked.length - 1))
    return unlocked[idx]
  }

  /** Cycle to next spell */
  cycleSpell(): string | null {
    const unlocked = this.getUnlockedSpells()
    if (unlocked.length === 0) return null
    this.player.equippedSpellIndex = (this.player.equippedSpellIndex + 1) % unlocked.length
    const spell = unlocked[this.player.equippedSpellIndex]
    eventBus.emit('ui:notification', { message: `Spell: ${spell.name}`, type: 'info' })
    return spell.id
  }

  /** Get all spells the player can use */
  getUnlockedSpells(): SpellDefinition[] {
    const magicLevel = this.skillSystem.getSkillLevel(SkillType.Magic)
    return getUnlockedSpells(magicLevel)
  }

  /** Check if a spell can be cast right now */
  canCast(spellId: string): boolean {
    const spell = SPELLS[spellId]
    if (!spell) return false
    if (this.skillSystem.getSkillLevel(SkillType.Magic) < spell.magicLevelReq) return false
    if (this.player.energy < spell.energyCost) return false
    if ((this.cooldowns.get(spellId) ?? 0) > 0) return false
    return true
  }

  /** Cast a spell: consume energy, start cooldown, return spell for effect */
  cast(spellId: string): SpellDefinition | null {
    if (!this.canCast(spellId)) return null
    const spell = SPELLS[spellId]!

    this.player.energy -= spell.energyCost
    this.cooldowns.set(spellId, spell.cooldown)

    // Award Magic XP
    this.skillSystem.awardXP(SkillType.Magic, spell.basePower * 0.4)

    // Check Spellweave passive (Magic 50): if cast within 1.5s of last, free arcane bolt
    const now = performance.now() / 1000
    const magicLevel = this.skillSystem.getSkillLevel(SkillType.Magic)
    const spellweaveActive = magicLevel >= 50 && (now - this.lastCastTime) < 1.5 && this.lastCastTime > 0
    this.lastCastTime = now

    if (spellweaveActive && spellId !== 'arcane_bolt') {
      // Will be handled by GameEngine to fire a free arcane_bolt
      eventBus.emit('ui:notification', { message: 'Spellweave!', type: 'success' })
    }

    return spell
  }

  /** Calculate magic damage */
  calculateDamage(spell: SpellDefinition): number {
    const magicLevel = this.skillSystem.getSkillLevel(SkillType.Magic)
    const matkBonus = magicLevel * 0.8
    const magicPowerBonus = this.skillSystem.getMagicPowerBonus()
    const base = spell.basePower + matkBonus
    return Math.floor(base * (1 + magicPowerBonus))
  }

  /** Update cooldowns each frame */
  update(dt: number): void {
    for (const [id, cd] of this.cooldowns) {
      if (cd > 0) {
        const newCd = cd - dt
        if (newCd <= 0) this.cooldowns.delete(id)
        else this.cooldowns.set(id, newCd)
      }
    }
  }
}
