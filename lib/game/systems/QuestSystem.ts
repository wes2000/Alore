import { PlayerState, ActiveQuest, SkillType } from '../data/types'
import { QUESTS, QuestDefinition } from '../data/quests'
import { ITEM_DEFINITIONS } from '../data/items'
import { SkillSystem } from './SkillSystem'
import { eventBus } from '../engine/EventBus'

export class QuestSystem {
  private player: PlayerState
  private skillSystem: SkillSystem

  constructor(player: PlayerState, skillSystem: SkillSystem) {
    this.player = player
    this.skillSystem = skillSystem
    this.initAutoStartQuests()
    this.subscribeToEvents()
  }

  /** Start auto-start quests for new players */
  private initAutoStartQuests(): void {
    for (const quest of Object.values(QUESTS)) {
      if (quest.autoStart && !this.isQuestActive(quest.id) && !this.isQuestCompleted(quest.id)) {
        this.startQuest(quest.id)
      }
    }
  }

  private subscribeToEvents(): void {
    eventBus.on('mob:died', (p) => {
      this.updateProgress('kill', p.mobId, 1)
    })
    eventBus.on('gather:complete', (p) => {
      this.updateProgress('gather', p.itemId, p.qty)
      this.updateProgress('mine', p.nodeType, p.qty)
    })
    eventBus.on('world:biome_changed', () => {
      // Count discovered biomes
      const uniqueBiomes = new Set(this.player.discoveredPOIs.filter(p => p.startsWith('biome_')))
      this.updateProgressAbsolute('explore_biomes', 'any', uniqueBiomes.size)
    })
    eventBus.on('pet:captured', (p) => {
      this.updateProgress('tame', p.pet.definitionId, 1)
    })
    eventBus.on('pet:bond_increased', (p) => {
      this.updateProgressAbsolute('raise_bond', 'any', Math.floor(p.newBond))
    })
    eventBus.on('skill:level_up', (p) => {
      this.updateProgressAbsolute('reach_level', p.skill, p.newLevel)
    })
  }

  startQuest(questId: string): boolean {
    const quest = QUESTS[questId]
    if (!quest) return false
    if (this.isQuestActive(questId) || this.isQuestCompleted(questId)) return false

    // Check prerequisites
    if (quest.prerequisites) {
      for (const preReq of quest.prerequisites) {
        if (!this.isQuestCompleted(preReq)) return false
      }
    }

    const objectives: Record<string, number> = {}
    for (const obj of quest.objectives) {
      objectives[obj.id] = 0
    }

    this.player.activeQuests.push({
      questId,
      objectives,
      startedAt: Date.now(),
    })

    eventBus.emit('quest:started', { questId })
    eventBus.emit('ui:notification', { message: `Quest started: ${quest.name}`, type: 'info' })
    return true
  }

  /** Update progress for matching objectives */
  updateProgress(type: string, target: string, amount: number): void {
    for (const aq of this.player.activeQuests) {
      const quest = QUESTS[aq.questId]
      if (!quest) continue

      for (const obj of quest.objectives) {
        if (obj.type !== type) continue
        // Match target: 'any' matches everything, otherwise exact match
        if (obj.target !== 'any' && obj.target !== target) continue

        const prev = aq.objectives[obj.id] ?? 0
        aq.objectives[obj.id] = Math.min(obj.required, prev + amount)

        if (aq.objectives[obj.id] !== prev) {
          eventBus.emit('quest:progress', {
            questId: aq.questId,
            objective: obj.id,
            current: aq.objectives[obj.id],
            required: obj.required,
          })
        }
      }

      // Check completion
      this.checkCompletion(aq)
    }
  }

  /** Set absolute progress value (for level-based or biome-count objectives) */
  updateProgressAbsolute(type: string, target: string, value: number): void {
    for (const aq of this.player.activeQuests) {
      const quest = QUESTS[aq.questId]
      if (!quest) continue

      for (const obj of quest.objectives) {
        if (obj.type !== type) continue
        if (obj.target !== 'any' && obj.target !== target) continue

        const prev = aq.objectives[obj.id] ?? 0
        const newVal = Math.min(obj.required, value)
        if (newVal > prev) {
          aq.objectives[obj.id] = newVal
          eventBus.emit('quest:progress', {
            questId: aq.questId,
            objective: obj.id,
            current: newVal,
            required: obj.required,
          })
        }
      }

      this.checkCompletion(aq)
    }
  }

  /** Notify dungeon clear with tier */
  onDungeonCleared(tier: number, activePetDefIds: string[]): void {
    for (const aq of this.player.activeQuests) {
      const quest = QUESTS[aq.questId]
      if (!quest) continue

      for (const obj of quest.objectives) {
        if (obj.type !== 'dungeon_clear') continue

        // Target is the tier number as string
        const requiredTier = parseInt(obj.target)
        if (tier < requiredTier) continue

        // Special: trial_of_flames requires Blazefang active
        if (aq.questId === 'trial_of_flames' && !activePetDefIds.includes('blazefang')) continue

        const prev = aq.objectives[obj.id] ?? 0
        aq.objectives[obj.id] = Math.min(obj.required, prev + 1)
      }

      this.checkCompletion(aq)
    }
  }

  private checkCompletion(aq: ActiveQuest): void {
    const quest = QUESTS[aq.questId]
    if (!quest) return

    const allDone = quest.objectives.every(obj => (aq.objectives[obj.id] ?? 0) >= obj.required)
    if (!allDone) return

    this.completeQuest(aq.questId)
  }

  completeQuest(questId: string): void {
    const quest = QUESTS[questId]
    if (!quest) return

    // Remove from active
    const idx = this.player.activeQuests.findIndex(q => q.questId === questId)
    if (idx !== -1) this.player.activeQuests.splice(idx, 1)

    // Add to completed
    if (!this.player.completedQuests.includes(questId)) {
      this.player.completedQuests.push(questId)
    }

    // Grant rewards
    if (quest.rewards.xp) {
      for (const xpReward of quest.rewards.xp) {
        const skillType = xpReward.skill as SkillType
        this.skillSystem.awardXP(skillType, xpReward.amount)
      }
    }
    if (quest.rewards.items) {
      for (const itemReward of quest.rewards.items) {
        this.addToInventory(itemReward.itemId, itemReward.quantity)
      }
    }
    if (quest.rewards.goldBonus) {
      this.player.gold += quest.rewards.goldBonus
    }

    eventBus.emit('quest:completed', { questId })
    eventBus.emit('ui:notification', { message: `Quest complete: ${quest.name}!`, type: 'success' })

    // Check for newly unlockable quests
    for (const q of Object.values(QUESTS)) {
      if (q.prerequisites?.includes(questId) && !this.isQuestActive(q.id) && !this.isQuestCompleted(q.id)) {
        // Check if all prerequisites met
        const allPreReqsMet = q.prerequisites.every(p => this.isQuestCompleted(p))
        if (allPreReqsMet) {
          this.startQuest(q.id)
        }
      }
    }
  }

  isQuestActive(questId: string): boolean {
    return this.player.activeQuests.some(q => q.questId === questId)
  }

  isQuestCompleted(questId: string): boolean {
    return this.player.completedQuests.includes(questId)
  }

  getActiveQuests(): { quest: QuestDefinition; progress: ActiveQuest }[] {
    return this.player.activeQuests
      .map(aq => ({ quest: QUESTS[aq.questId]!, progress: aq }))
      .filter(q => q.quest != null)
  }

  private addToInventory(itemId: string, qty: number): void {
    const def = ITEM_DEFINITIONS[itemId]
    const maxStack = def?.maxStack ?? 100
    const existing = this.player.inventory.find(i => i.itemId === itemId)
    if (existing && def?.stackable) {
      existing.quantity = Math.min(maxStack, existing.quantity + qty)
    } else {
      this.player.inventory.push({
        itemId,
        quantity: Math.min(maxStack, qty),
        slotIndex: this.player.inventory.length,
      })
    }
  }
}
