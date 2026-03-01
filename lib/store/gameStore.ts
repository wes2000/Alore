import { create } from 'zustand'
import { PlayerState, PetInstance, SkillType, BiomeType, DialogueNode } from '../game/data/types'

interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'danger'
  expiresAt: number
}

type PanelName = 'skills' | 'pets' | 'inventory' | 'map' | 'crafting' | 'quests' | 'bestiary'

interface DialogueState {
  npcId: string
  npcName: string
  npcIcon: string
  node: DialogueNode
}

interface GameStore {
  // Player mirrors (updated from engine for React UI)
  playerHP:     number
  playerMaxHP:  number
  playerEnergy: number
  playerMaxEnergy: number
  playerGold:   number
  playerX:      number
  playerY:      number
  currentBiome: BiomeType | null
  fps:          number

  // Derived combat stats (updated on skill level-up)
  playerATK: number   // base attack damage
  playerDEF: number   // flat damage reduction

  // Interaction / gathering prompts
  interactPrompt: string | null
  gatherProgress: number | null   // 0–1 while gathering, null when idle
  gatherNodeType: string | null   // e.g. "OakTree", shown during gathering

  // UI state
  activePanel: PanelName | null
  notifications: Notification[]
  shopOpen: boolean

  // New M1–M4 state
  inDungeon: boolean
  dungeonTier: number
  combatStyle: 'melee' | 'ranged' | 'magic'
  activeSpellName: string | null
  playerStatusEffects: string[]
  comboCount: number
  activeQuestCount: number

  // M6: NPC dialogue
  dialogue: DialogueState | null

  // Actions
  setPlayerHP:    (hp: number, max: number) => void
  setPlayerEnergy:(energy: number, max: number) => void
  setPlayerGold:  (gold: number) => void
  setPlayerPos:   (x: number, y: number) => void
  setBiome:       (biome: BiomeType) => void
  setFPS:         (fps: number) => void
  setPlayerStats:    (atk: number, def: number) => void
  setInteractPrompt: (label: string | null) => void
  setGatherProgress: (progress: number | null) => void
  setGatherNodeType: (nodeType: string | null) => void
  setPanel:       (panel: GameStore['activePanel']) => void
  togglePanel:    (panel: PanelName) => void
  setShopOpen:    (open: boolean) => void
  setInDungeon:   (inDungeon: boolean, tier?: number) => void
  setCombatStyle: (style: 'melee' | 'ranged' | 'magic') => void
  setActiveSpellName:(name: string | null) => void
  setPlayerStatusEffects:(effects: string[]) => void
  setComboCount:(count: number) => void
  setActiveQuestCount:(count: number) => void
  setDialogue: (dialogue: DialogueState | null) => void
  addNotification:(message: string, type: Notification['type']) => void
  removeNotification:(id: string) => void
  clearExpiredNotifications:() => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerHP:       100,
  playerMaxHP:    100,
  playerEnergy:   100,
  playerMaxEnergy:100,
  playerGold:     0,
  playerX:        0,
  playerY:        0,
  currentBiome:   null,
  fps:            0,
  playerATK:      12,
  playerDEF:      0,
  interactPrompt: null,
  gatherProgress: null,
  gatherNodeType: null,
  activePanel:    null,
  notifications:  [],
  shopOpen:       false,
  inDungeon:      false,
  dungeonTier:    0,
  combatStyle:    'melee',
  activeSpellName: null,
  playerStatusEffects: [],
  comboCount: 0,
  activeQuestCount: 0,
  dialogue: null,

  setPlayerHP:       (hp, max)    => set({ playerHP: hp, playerMaxHP: max }),
  setPlayerEnergy:   (energy, max)=> set({ playerEnergy: energy, playerMaxEnergy: max }),
  setPlayerGold:     (gold)       => set({ playerGold: gold }),
  setPlayerPos:      (x, y)       => set({ playerX: x, playerY: y }),
  setBiome:          (biome)      => set({ currentBiome: biome }),
  setFPS:            (fps)        => set({ fps }),
  setPlayerStats:    (atk, def)   => set({ playerATK: atk, playerDEF: def }),
  setInteractPrompt: (label)      => set({ interactPrompt: label }),
  setGatherProgress: (progress)   => set({ gatherProgress: progress }),
  setGatherNodeType: (nodeType)   => set({ gatherNodeType: nodeType }),

  setPanel: (panel) => set({ activePanel: panel }),
  togglePanel: (panel) => set(s => ({
    activePanel: s.activePanel === panel ? null : panel,
  })),
  setShopOpen: (open) => set({ shopOpen: open }),
  setInDungeon: (inDungeon, tier) => set({ inDungeon, dungeonTier: tier ?? 0 }),
  setCombatStyle: (style) => set({ combatStyle: style }),
  setActiveSpellName: (name) => set({ activeSpellName: name }),
  setPlayerStatusEffects: (effects) => set({ playerStatusEffects: effects }),
  setComboCount: (count) => set({ comboCount: count }),
  setActiveQuestCount: (count) => set({ activeQuestCount: count }),
  setDialogue: (dialogue) => set({ dialogue }),

  addNotification: (message, type) => {
    const id = Math.random().toString(36).slice(2)
    const notification: Notification = {
      id, message, type,
      expiresAt: Date.now() + 3500,
    }
    set(s => ({ notifications: [...s.notifications.slice(-4), notification] }))
    // Auto-remove
    setTimeout(() => {
      set(s => ({ notifications: s.notifications.filter(n => n.id !== id) }))
    }, 3600)
  },

  removeNotification: (id) => set(s => ({
    notifications: s.notifications.filter(n => n.id !== id),
  })),

  clearExpiredNotifications: () => {
    const now = Date.now()
    set(s => ({ notifications: s.notifications.filter(n => n.expiresAt > now) }))
  },
}))
