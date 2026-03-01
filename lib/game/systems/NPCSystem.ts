import { NPCDefinition, DialogueNode, PlayerState } from '../data/types'
import { NPC_DEFINITIONS, NPC_INTERACT_RANGE } from '../data/npcs'
import { eventBus } from '../engine/EventBus'

export class NPCSystem {
  private player: PlayerState
  private activeDialogueNPC: NPCDefinition | null = null
  private activeDialogueNode: DialogueNode | null = null

  constructor(player: PlayerState) {
    this.player = player
  }

  get isInDialogue(): boolean { return this.activeDialogueNPC !== null }
  get currentNPCId(): string | null { return this.activeDialogueNPC?.id ?? null }

  /** Find the nearest NPC within interact range, or null */
  findNearbyNPC(): NPCDefinition | null {
    const px = this.player.x + 0.5
    const py = this.player.y + 0.5
    let closest: NPCDefinition | null = null
    let closestDist = NPC_INTERACT_RANGE

    for (const npc of Object.values(NPC_DEFINITIONS)) {
      const dist = Math.hypot(px - (npc.x + 0.5), py - (npc.y + 0.5))
      if (dist < closestDist) {
        closestDist = dist
        closest = npc
      }
    }

    return closest
  }

  /** Get the interact label for the nearest NPC (for HUD prompt) */
  getNearbyLabel(): string | null {
    const npc = this.findNearbyNPC()
    if (!npc) return null
    return npc.name
  }

  /** Start dialogue with a specific NPC */
  interact(npcId: string): boolean {
    const npc = NPC_DEFINITIONS[npcId]
    if (!npc || npc.dialogue.length === 0) return false

    this.activeDialogueNPC = npc
    this.activeDialogueNode = npc.dialogue[0]

    eventBus.emit('npc:interact', { npcId })
    eventBus.emit('dialogue:open', {
      npcId,
      npcName: npc.name,
      npcIcon: npc.icon,
      node: this.activeDialogueNode,
    })

    return true
  }

  /** Advance dialogue by choosing an option */
  chooseOption(choiceIndex: number): { action?: string; actionTarget?: string } | null {
    if (!this.activeDialogueNPC || !this.activeDialogueNode) return null

    const choice = this.activeDialogueNode.choices[choiceIndex]
    if (!choice) return null

    const result = {
      action: choice.action,
      actionTarget: choice.actionTarget,
    }

    if (choice.nextNodeId) {
      const nextNode = this.activeDialogueNPC.dialogue.find(n => n.id === choice.nextNodeId)
      if (nextNode) {
        this.activeDialogueNode = nextNode
        eventBus.emit('dialogue:open', {
          npcId: this.activeDialogueNPC.id,
          npcName: this.activeDialogueNPC.name,
          npcIcon: this.activeDialogueNPC.icon,
          node: nextNode,
        })
        return result
      }
    }

    // End dialogue
    this.closeDialogue()
    return result
  }

  /** Close dialogue and clean up */
  closeDialogue(): void {
    if (!this.activeDialogueNPC) return
    this.activeDialogueNPC = null
    this.activeDialogueNode = null
    eventBus.emit('dialogue:close', {})
  }
}
