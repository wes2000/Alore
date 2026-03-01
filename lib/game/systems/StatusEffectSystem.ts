import { MobInstance, ActiveStatusEffect, StatusEffect, PlayerState } from '../data/types'
import { eventBus } from '../engine/EventBus'

export class StatusEffectSystem {
  /** Apply a status effect to a mob */
  applyToMob(mob: MobInstance, status: StatusEffect, duration: number, power: number, sourceId: string): void {
    if (!mob.statusEffects) mob.statusEffects = []

    // Refresh existing same-type
    mob.statusEffects = mob.statusEffects.filter(s => s.type !== status)
    mob.statusEffects.push({ type: status, duration, power, sourceId })

    eventBus.emit('combat:status_applied', {
      entityId: mob.id,
      status,
      duration,
    })
  }

  /** Apply a status effect to the player */
  applyToPlayer(player: PlayerState, status: StatusEffect, duration: number, power: number, sourceId: string): void {
    if (!player.playerStatusEffects) player.playerStatusEffects = []

    // Refresh existing same-type
    player.playerStatusEffects = player.playerStatusEffects.filter(s => s.type !== status)
    player.playerStatusEffects.push({ type: status, duration, power, sourceId })

    eventBus.emit('combat:status_applied', {
      entityId: 'player',
      status,
      duration,
    })
    eventBus.emit('ui:notification', {
      message: `${status} applied!`,
      type: 'danger',
    })
  }

  /**
   * Tick all status effects on a mob.
   * Returns an object with:
   *   dotDamage — total damage-over-time this tick (Burn + Poison)
   *   freezeShatter — true if mob was frozen and should take bonus damage on next hit
   */
  tickMob(mob: MobInstance, dt: number): { dotDamage: number } {
    if (!mob.statusEffects || mob.statusEffects.length === 0) return { dotDamage: 0 }

    let dotDamage = 0
    mob.statusEffects = mob.statusEffects.filter(effect => {
      effect.duration -= dt
      if (effect.type === StatusEffect.Burn) {
        dotDamage += effect.power * dt
      }
      if (effect.type === StatusEffect.Poison) {
        // Poison: lower damage but stacks with burn
        dotDamage += effect.power * dt
      }
      return effect.duration > 0
    })

    return { dotDamage: Math.floor(dotDamage) }
  }

  /**
   * Tick all status effects on the player.
   * Returns dot damage dealt this tick.
   */
  tickPlayer(player: PlayerState, dt: number): number {
    if (!player.playerStatusEffects || player.playerStatusEffects.length === 0) return 0

    let dotDamage = 0
    player.playerStatusEffects = player.playerStatusEffects.filter(effect => {
      effect.duration -= dt
      if (effect.type === StatusEffect.Burn) {
        dotDamage += effect.power * dt
      }
      if (effect.type === StatusEffect.Poison) {
        dotDamage += effect.power * dt
      }
      return effect.duration > 0
    })

    return Math.floor(dotDamage)
  }

  /** Check if a mob has a specific status effect */
  hasStatus(mob: MobInstance, status: StatusEffect): boolean {
    return mob.statusEffects?.some(s => s.type === status) ?? false
  }

  /** Check if the player has a specific status effect */
  playerHasStatus(player: PlayerState, status: StatusEffect): boolean {
    return player.playerStatusEffects?.some(s => s.type === status) ?? false
  }

  /** Get the speed multiplier for a mob considering status effects */
  getSpeedMultiplier(mob: MobInstance): number {
    let mult = 1
    if (this.hasStatus(mob, StatusEffect.Slow)) mult *= 0.5
    if (this.hasStatus(mob, StatusEffect.Stun)) mult = 0
    if (this.hasStatus(mob, StatusEffect.Freeze)) mult = 0
    return mult
  }

  /** Get speed multiplier for the player */
  getPlayerSpeedMultiplier(player: PlayerState): number {
    let mult = 1
    if (this.playerHasStatus(player, StatusEffect.Slow)) mult *= 0.5
    if (this.playerHasStatus(player, StatusEffect.Stun)) mult = 0
    if (this.playerHasStatus(player, StatusEffect.Freeze)) mult = 0
    return mult
  }

  /** Can the mob attack? Stun and Freeze prevent attacks */
  canMobAttack(mob: MobInstance): boolean {
    if (this.hasStatus(mob, StatusEffect.Stun)) return false
    if (this.hasStatus(mob, StatusEffect.Freeze)) return false
    return true
  }

  /** Can the player attack/move? */
  canPlayerAct(player: PlayerState): boolean {
    if (this.playerHasStatus(player, StatusEffect.Stun)) return false
    if (this.playerHasStatus(player, StatusEffect.Freeze)) return false
    return true
  }

  /** Get mob attack multiplier — Weaken reduces atk, Enrage increases it */
  getMobAtkMultiplier(mob: MobInstance): number {
    let mult = 1
    if (this.hasStatus(mob, StatusEffect.Weaken)) mult *= 0.75 // -25% ATK
    if (this.hasStatus(mob, StatusEffect.Enrage)) mult *= 1.5  // +50% ATK
    return mult
  }

  /** Get mob defense multiplier — Enrage reduces def */
  getMobDefMultiplier(mob: MobInstance): number {
    let mult = 1
    if (this.hasStatus(mob, StatusEffect.Enrage)) mult *= 0.75 // -25% DEF
    return mult
  }

  /** Get mob accuracy — Blind reduces accuracy */
  getMobAccuracy(mob: MobInstance): number {
    if (this.hasStatus(mob, StatusEffect.Blind)) return 0.5 // 50% hit chance
    return 1.0
  }

  /**
   * Check if a frozen mob should shatter — returns bonus damage multiplier.
   * Call this when dealing direct damage to a frozen mob.
   * Shatter removes the freeze effect.
   */
  checkFreezeShatter(mob: MobInstance): number {
    if (!this.hasStatus(mob, StatusEffect.Freeze)) return 1.0
    // Remove freeze on hit
    mob.statusEffects = mob.statusEffects.filter(s => s.type !== StatusEffect.Freeze)
    return 1.5 // 50% bonus damage on shatter
  }
}
