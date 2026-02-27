import {
  SkillType, ComboType, Element, PetInstance, StatusEffect,
} from '../data/types'

// ─── Event Payload Types ─────────────────────────────────────────────────────

export interface Events {
  // Skill events
  'skill:xp_gained':      { skill: SkillType; amount: number }
  'skill:level_up':       { skill: SkillType; newLevel: number }
  'skill:milestone':      { skill: SkillType; level: number; title: string }

  // Pet events
  'pet:captured':         { pet: PetInstance }
  'pet:released':         { petId: string }
  'pet:evolved':          { pet: PetInstance; fromId: string }
  'pet:level_up':         { pet: PetInstance }
  'pet:bond_increased':   { petId: string; newBond: number }
  'pet:died':             { petId: string }

  // Combat events
  'combat:damage':        { targetId: string; amount: number; type: string; element: Element }
  'combat:heal':          { targetId: string; amount: number }
  'combat:element_applied': { entityId: string; element: Element; sourceId: string }
  'combat:combo':         { type: ComboType; position: { x: number; y: number } }
  'combat:status_applied': { entityId: string; status: StatusEffect; duration: number }
  'combat:kill':          { killerId: string; targetId: string; targetMobId: string }

  // World events
  'world:chunk_entered':  { cx: number; cy: number }
  'world:biome_changed':  { biomeType: string }
  'world:resource_harvested': { nodeType: string; worldX: number; worldY: number; itemId: string; quantity: number }
  'world:dungeon_entered': { tier: number }
  'world:dungeon_cleared': {}
  'world:poi_discovered': { poiId: string; type: string }

  // Player events
  'player:hp_changed':    { current: number; max: number }
  'player:energy_changed': { current: number; max: number }
  'player:died':          {}
  'player:respawned':     {}
  'player:gold_changed':  { amount: number; total: number }

  // UI events
  'ui:panel_open':        { panel: string }
  'ui:panel_close':       { panel: string }
  'ui:notification':      { message: string; type: 'info' | 'success' | 'warning' | 'danger' }

  // Weather events
  'weather:changed':      { type: string }

  // Quest events
  'quest:started':        { questId: string }
  'quest:progress':       { questId: string; objective: string; current: number; required: number }
  'quest:completed':      { questId: string }

  // Save events
  'save:requested':       {}
  'save:completed':       {}
  'save:failed':          { reason: string }
}

type EventKey = keyof Events
type EventHandler<K extends EventKey> = (payload: Events[K]) => void
type AnyHandler = (payload: unknown) => void

export class EventBus {
  private listeners = new Map<EventKey, Set<AnyHandler>>()

  on<K extends EventKey>(event: K, handler: EventHandler<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as AnyHandler)

    // Return unsubscribe function
    return () => this.off(event, handler)
  }

  off<K extends EventKey>(event: K, handler: EventHandler<K>): void {
    this.listeners.get(event)?.delete(handler as AnyHandler)
  }

  emit<K extends EventKey>(event: K, payload: Events[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const h of handlers) h(payload)
    }
  }

  /** Remove all listeners (cleanup on unmount) */
  clear(): void {
    this.listeners.clear()
  }
}

// Singleton — shared across all game systems
export const eventBus = new EventBus()
