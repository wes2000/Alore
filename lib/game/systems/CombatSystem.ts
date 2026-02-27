import {
  Element, ComboType, StatusEffect, DamageType, PlayerState, PetInstance,
} from '../data/types'
import { eventBus } from '../engine/EventBus'

// ─── Element Effectiveness ────────────────────────────────────────────────────

const STRONG_AGAINST: Partial<Record<Element, Element>> = {
  [Element.Fire]:      Element.Earth,
  [Element.Water]:     Element.Fire,
  [Element.Earth]:     Element.Lightning,
  [Element.Lightning]: Element.Water,
  [Element.Wind]:      Element.Shadow,
  [Element.Shadow]:    Element.Light,
  [Element.Light]:     Element.Shadow,
  [Element.Arcane]:    Element.None,
}

const WEAK_AGAINST: Partial<Record<Element, Element>> = {
  [Element.Fire]:      Element.Water,
  [Element.Water]:     Element.Lightning,
  [Element.Earth]:     Element.Fire,
  [Element.Lightning]: Element.Earth,
  [Element.Wind]:      Element.Arcane,
  [Element.Shadow]:    Element.Wind,
  [Element.Light]:     Element.Arcane,
}

export function getEffectiveness(attackElement: Element, targetElement: Element): number {
  if (attackElement === Element.None || attackElement === Element.Arcane) return 1.0
  if (STRONG_AGAINST[attackElement] === targetElement) return 1.5
  if (WEAK_AGAINST[attackElement] === targetElement) return 0.65
  return 1.0
}

// ─── Element Combo Reactions ─────────────────────────────────────────────────

interface ElementReaction {
  combo: ComboType
  description: string
  damageMultiplier: number
  aoeRadius: number
  statusEffect?: StatusEffect
  statusDuration?: number
}

type ElementPair = `${Element}+${Element}`

function pairKey(a: Element, b: Element): ElementPair {
  // Order-independent
  const [x, y] = [a, b].sort()
  return `${x}+${y}` as ElementPair
}

const REACTIONS: Partial<Record<string, ElementReaction>> = {
  [pairKey(Element.Fire, Element.Water)]: {
    combo: ComboType.SteamBurst,
    description: 'Steam Burst — AoE blind, 3 seconds',
    damageMultiplier: 1.3,
    aoeRadius: 3,
    statusEffect: StatusEffect.Blind,
    statusDuration: 3,
  },
  [pairKey(Element.Fire, Element.Wind)]: {
    combo: ComboType.Wildfire,
    description: 'Wildfire — Burn spreads to nearby enemies',
    damageMultiplier: 1.5,
    aoeRadius: 2.5,
    statusEffect: StatusEffect.Burn,
    statusDuration: 5,
  },
  [pairKey(Element.Lightning, Element.Water)]: {
    combo: ComboType.Electrolysis,
    description: 'Electrolysis — Stun, 1.5 seconds',
    damageMultiplier: 1.8,
    aoeRadius: 1.5,
    statusEffect: StatusEffect.Stun,
    statusDuration: 1.5,
  },
  [pairKey(Element.Earth, Element.Wind)]: {
    combo: ComboType.DustStorm,
    description: 'Dust Storm — AoE slow + accuracy reduction',
    damageMultiplier: 1.2,
    aoeRadius: 4,
    statusEffect: StatusEffect.Slow,
    statusDuration: 4,
  },
  [pairKey(Element.Light, Element.Shadow)]: {
    combo: ComboType.VoidCollapse,
    description: 'Void Collapse — Massive burst, no secondary',
    damageMultiplier: 2.5,
    aoeRadius: 0,
  },
  [pairKey(Element.Fire, Element.Water)]: {
    combo: ComboType.FlashVaporize,
    description: 'Flash Vaporize — Massive single-target burst',
    damageMultiplier: 3.0,
    aoeRadius: 0,
  },
}

// ─── Element Application Tracker ─────────────────────────────────────────────

interface PendingElement {
  element: Element
  sourceId: string
  appliedAt: number  // Date.now()
}

const COMBO_WINDOW_MS = 2000  // 2 seconds

export class CombatSystem {
  private elementTracker = new Map<string, PendingElement[]>()

  // ─── Damage Calculation ───────────────────────────────────────────────────

  calculateDamage(
    basePower: number,
    attackStat: number,
    defenseStat: number,
    element: Element,
    targetElement: Element,
    isCrit: boolean,
    damageType: DamageType,
    level: number = 1
  ): number {
    // Formula: damage = (basePower + attackStat * 0.6) * effectiveness * level_scale * crit
    const attackBonus = attackStat * 0.6
    const levelScale = 1 + (level - 1) * 0.02
    const effectiveness = damageType === DamageType.Physical ? 1.0 :
      getEffectiveness(element, targetElement)
    const critMult = isCrit ? 2.0 : 1.0

    let damage = (basePower + attackBonus) * effectiveness * levelScale * critMult

    // Defense reduces damage (diminishing returns)
    const defReduction = defenseStat / (defenseStat + 50)
    damage *= (1 - defReduction * 0.8)

    return Math.max(1, Math.floor(damage))
  }

  /** Apply an element to a target — may trigger a combo reaction */
  applyElement(
    targetId: string,
    element: Element,
    sourceId: string,
    targetPos: { x: number; y: number }
  ): void {
    if (element === Element.None || element === Element.Arcane) return

    const now = Date.now()

    if (!this.elementTracker.has(targetId)) {
      this.elementTracker.set(targetId, [])
    }

    const pending = this.elementTracker.get(targetId)!
    // Remove stale applications
    const fresh = pending.filter(p => now - p.appliedAt < COMBO_WINDOW_MS)

    eventBus.emit('combat:element_applied', { entityId: targetId, element, sourceId })

    // Check for reactions against all existing elements
    for (const prev of fresh) {
      const key = pairKey(prev.element, element)
      const reaction = REACTIONS[key]
      if (reaction) {
        this.triggerReaction(reaction, targetId, targetPos, sourceId)
        // Clear after reaction
        this.elementTracker.set(targetId, [])
        return
      }
    }

    // No reaction — add this element
    fresh.push({ element, sourceId, appliedAt: now })
    this.elementTracker.set(targetId, fresh)
  }

  private triggerReaction(
    reaction: ElementReaction,
    targetId: string,
    pos: { x: number; y: number },
    sourceId: string
  ): void {
    eventBus.emit('combat:combo', { type: reaction.combo, position: pos })

    if (reaction.statusEffect) {
      eventBus.emit('combat:status_applied', {
        entityId: targetId,
        status: reaction.statusEffect,
        duration: reaction.statusDuration ?? 2,
      })
    }
  }

  /** Clean up stale element applications */
  tick(): void {
    const now = Date.now()
    for (const [targetId, pending] of this.elementTracker) {
      const fresh = pending.filter(p => now - p.appliedAt < COMBO_WINDOW_MS)
      if (fresh.length === 0) this.elementTracker.delete(targetId)
      else this.elementTracker.set(targetId, fresh)
    }
  }

  // ─── Status Effect Helpers ────────────────────────────────────────────────

  applyStatus(
    target: PetInstance | { id: string },
    status: StatusEffect,
    duration: number,
    power: number,
    sourceId: string
  ): void {
    const entity = target as PetInstance
    if (!entity.statusEffects) return

    // Remove existing same-type effect (refresh)
    entity.statusEffects = entity.statusEffects.filter(s => s.type !== status)
    entity.statusEffects.push({ type: status, duration, power, sourceId })

    eventBus.emit('combat:status_applied', {
      entityId: (entity as PetInstance).instanceId,
      status,
      duration,
    })
  }

  tickStatusEffects(pet: PetInstance, dt: number): number {
    let burnDamage = 0
    pet.statusEffects = pet.statusEffects.filter(effect => {
      effect.duration -= dt
      if (effect.type === StatusEffect.Burn) {
        burnDamage += effect.power * dt
      }
      return effect.duration > 0
    })
    return Math.floor(burnDamage)
  }

  // ─── Crit Calculation ─────────────────────────────────────────────────────

  rollCrit(baseCritChance: number, luckLevel: number): boolean {
    const luckBonus = (luckLevel - 1) * 0.001  // up to ~10% at lv99
    const total = Math.min(0.5, baseCritChance + luckBonus)
    return Math.random() < total
  }
}
