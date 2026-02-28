import { ResourceNodeType, SkillType, PlayerState } from '../data/types'
import { SkillSystem } from './SkillSystem'
import { eventBus } from '../engine/EventBus'

interface GatherJob {
  nodeId: string
  nodeType: ResourceNodeType
  chunkKey: string
  progress: number   // 0–1
  duration: number   // total seconds
}

// How long (seconds) to gather each node type at skill level 1
const BASE_DURATION: Record<ResourceNodeType, number> = {
  [ResourceNodeType.CopperOre]:       3.5,
  [ResourceNodeType.IronOre]:         5.0,
  [ResourceNodeType.GoldOre]:         6.5,
  [ResourceNodeType.MithrilOre]:      9.0,
  [ResourceNodeType.OakTree]:         3.0,
  [ResourceNodeType.BirchTree]:       4.0,
  [ResourceNodeType.WillowTree]:      3.5,
  [ResourceNodeType.HerbPatch]:       2.5,
  [ResourceNodeType.MushroomCluster]: 2.0,
  [ResourceNodeType.FishingSpot]:     5.5,
  [ResourceNodeType.StoneBoulder]:    2.0,
}

// Item yielded + skill XP per gather
const NODE_REWARD: Record<ResourceNodeType, { skill: SkillType; xp: number; itemId: string; minQty: number; maxQty: number }> = {
  [ResourceNodeType.CopperOre]:       { skill: SkillType.Mining,      xp: 17,  itemId: 'copper_ore',  minQty: 1, maxQty: 3 },
  [ResourceNodeType.IronOre]:         { skill: SkillType.Mining,      xp: 35,  itemId: 'iron_ore',    minQty: 1, maxQty: 2 },
  [ResourceNodeType.GoldOre]:         { skill: SkillType.Mining,      xp: 65,  itemId: 'gold_ore',    minQty: 1, maxQty: 2 },
  [ResourceNodeType.MithrilOre]:      { skill: SkillType.Mining,      xp: 150, itemId: 'mithril_ore', minQty: 1, maxQty: 1 },
  [ResourceNodeType.OakTree]:         { skill: SkillType.Woodcutting, xp: 25,  itemId: 'oak_log',     minQty: 1, maxQty: 3 },
  [ResourceNodeType.BirchTree]:       { skill: SkillType.Woodcutting, xp: 40,  itemId: 'birch_log',   minQty: 1, maxQty: 2 },
  [ResourceNodeType.WillowTree]:      { skill: SkillType.Woodcutting, xp: 55,  itemId: 'willow_log',  minQty: 1, maxQty: 2 },
  [ResourceNodeType.HerbPatch]:       { skill: SkillType.Foraging,    xp: 20,  itemId: 'herb_bundle', minQty: 1, maxQty: 4 },
  [ResourceNodeType.MushroomCluster]: { skill: SkillType.Foraging,    xp: 15,  itemId: 'mushroom',    minQty: 1, maxQty: 5 },
  [ResourceNodeType.FishingSpot]:     { skill: SkillType.Fishing,     xp: 30,  itemId: 'raw_fish',    minQty: 1, maxQty: 2 },
  [ResourceNodeType.StoneBoulder]:    { skill: SkillType.Mining,      xp: 10,  itemId: 'stone',       minQty: 2, maxQty: 5 },
}

// Respawn delay (ms) per node type
export const NODE_RESPAWN_MS: Partial<Record<ResourceNodeType, number>> = {
  [ResourceNodeType.CopperOre]:       20 * 60_000,
  [ResourceNodeType.IronOre]:         25 * 60_000,
  [ResourceNodeType.GoldOre]:         30 * 60_000,
  [ResourceNodeType.MithrilOre]:      40 * 60_000,
  [ResourceNodeType.OakTree]:          8 * 60_000,
  [ResourceNodeType.BirchTree]:       10 * 60_000,
  [ResourceNodeType.WillowTree]:      10 * 60_000,
  [ResourceNodeType.HerbPatch]:       12 * 60_000,
  [ResourceNodeType.MushroomCluster]: 15 * 60_000,
  [ResourceNodeType.FishingSpot]:     0,             // never depletes
  [ResourceNodeType.StoneBoulder]:     5 * 60_000,
}

export class GatheringSystem {
  private player: PlayerState
  private skillSystem: SkillSystem
  private job: GatherJob | null = null
  private onComplete: (chunkKey: string, nodeId: string, nodeType: ResourceNodeType, itemId: string, qty: number) => void
  private progressEmitSkip = 0  // emit every 3rd tick (~20fps instead of 60fps)

  constructor(
    player: PlayerState,
    skillSystem: SkillSystem,
    onComplete: (chunkKey: string, nodeId: string, nodeType: ResourceNodeType, itemId: string, qty: number) => void
  ) {
    this.player = player
    this.skillSystem = skillSystem
    this.onComplete = onComplete
  }

  get isGathering(): boolean { return this.job !== null }
  get progress(): number { return this.job?.progress ?? 0 }
  get activeNodeId(): string | null { return this.job?.nodeId ?? null }

  start(nodeId: string, nodeType: ResourceNodeType, chunkKey: string): boolean {
    if (this.job) return false

    const reward = NODE_REWARD[nodeType]
    const skillLevel = this.skillSystem.getSkillLevel(reward.skill)
    // Each skill level reduces duration by 1% (capped at 50% reduction)
    const baseSpeedMult = 1 + Math.min(50, skillLevel - 1) * 0.01
    // Add milestone passive bonuses (e.g., Mining 20: +10%, Mining 70: +20%)
    const milestoneBonus = this.skillSystem.getGatheringSpeedBonus(reward.skill)
    const speedMult = baseSpeedMult + milestoneBonus
    const duration = BASE_DURATION[nodeType] / speedMult

    this.job = { nodeId, nodeType, chunkKey, progress: 0, duration }
    eventBus.emit('gather:start', { nodeType, duration })
    return true
  }

  cancel(): void {
    if (!this.job) return
    this.job = null
    eventBus.emit('gather:cancel', {})
  }

  update(dt: number): void {
    if (!this.job) return

    this.job.progress = Math.min(1, this.job.progress + dt / this.job.duration)

    // Throttle progress events to ~20fps (every 3 game ticks) to reduce React re-renders
    this.progressEmitSkip++
    if (this.progressEmitSkip >= 3) {
      this.progressEmitSkip = 0
      eventBus.emit('gather:progress', { progress: this.job.progress })
    }

    if (this.job.progress >= 1) {
      this.finish()
    }
  }

  private finish(): void {
    const job = this.job!
    this.job = null

    const reward = NODE_REWARD[job.nodeType]
    const luckLevel = this.skillSystem.getSkillLevel(SkillType.Luck)
    const bonus = luckLevel >= 60 ? 1 : 0
    const qty = reward.minQty + Math.floor(Math.random() * (reward.maxQty - reward.minQty + 1)) + bonus

    // Award skill XP
    this.skillSystem.awardXP(reward.skill, reward.xp)

    // Notify engine to add item + deplete node
    this.onComplete(job.chunkKey, job.nodeId, job.nodeType, reward.itemId, qty)

    eventBus.emit('gather:complete', {
      itemId: reward.itemId,
      qty,
      nodeType: job.nodeType,
      chunkKey: job.chunkKey,
      nodeId: job.nodeId,
    })

    const itemName = reward.itemId.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    eventBus.emit('ui:notification', {
      message: `+${qty} ${itemName}`,
      type: 'success',
    })
  }
}
