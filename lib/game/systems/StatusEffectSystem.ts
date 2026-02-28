import { MobInstance, ActiveStatusEffect, StatusEffect } from '../data/types'
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

  /** Tick all status effects on a mob. Returns burn damage dealt this tick. */
  tickMob(mob: MobInstance, dt: number): number {
    if (!mob.statusEffects || mob.statusEffects.length === 0) return 0

    let burnDamage = 0
    mob.statusEffects = mob.statusEffects.filter(effect => {
      effect.duration -= dt
      if (effect.type === StatusEffect.Burn) {
        burnDamage += effect.power * dt
      }
      return effect.duration > 0
    })

    return Math.floor(burnDamage)
  }

  /** Check if a mob has a specific status effect */
  hasStatus(mob: MobInstance, status: StatusEffect): boolean {
    return mob.statusEffects?.some(s => s.type === status) ?? false
  }

  /** Get the speed multiplier for a mob considering status effects */
  getSpeedMultiplier(mob: MobInstance): number {
    let mult = 1
    if (this.hasStatus(mob, StatusEffect.Slow)) mult *= 0.5
    if (this.hasStatus(mob, StatusEffect.Stun)) mult = 0
    return mult
  }
}
