import { PlayerState, SkillType } from '../data/types'
import { RECIPES, Recipe } from '../data/recipes'
import { ITEM_DEFINITIONS } from '../data/items'
import { SkillSystem } from './SkillSystem'
import { eventBus } from '../engine/EventBus'

export class CraftingSystem {
  private player: PlayerState
  private skillSystem: SkillSystem

  constructor(player: PlayerState, skillSystem: SkillSystem) {
    this.player = player
    this.skillSystem = skillSystem
  }

  /** Check if the player can craft a recipe */
  canCraft(recipeId: string): boolean {
    const recipe = RECIPES[recipeId]
    if (!recipe) return false

    // Check skill level
    if (this.skillSystem.getSkillLevel(recipe.skill) < recipe.levelReq) return false

    // Check ingredients
    for (const ing of recipe.ingredients) {
      const invItem = this.player.inventory.find(i => i.itemId === ing.itemId)
      if (!invItem || invItem.quantity < ing.quantity) return false
    }

    return true
  }

  /** Craft a recipe, consuming ingredients and producing output */
  craft(recipeId: string): { success: boolean; message: string } {
    const recipe = RECIPES[recipeId]
    if (!recipe) return { success: false, message: 'Unknown recipe' }

    if (this.skillSystem.getSkillLevel(recipe.skill) < recipe.levelReq) {
      return { success: false, message: `Need ${recipe.skill} level ${recipe.levelReq}` }
    }

    // Check and consume ingredients
    for (const ing of recipe.ingredients) {
      const invItem = this.player.inventory.find(i => i.itemId === ing.itemId)
      if (!invItem || invItem.quantity < ing.quantity) {
        const itemDef = ITEM_DEFINITIONS[ing.itemId]
        return { success: false, message: `Need ${ing.quantity}x ${itemDef?.name ?? ing.itemId}` }
      }
    }

    // Consume ingredients
    for (const ing of recipe.ingredients) {
      const invItem = this.player.inventory.find(i => i.itemId === ing.itemId)!
      invItem.quantity -= ing.quantity
      if (invItem.quantity <= 0) {
        const idx = this.player.inventory.indexOf(invItem)
        if (idx !== -1) this.player.inventory.splice(idx, 1)
      }
    }

    // Add output
    this.addToInventory(recipe.outputId, recipe.outputQty)

    // Award XP
    this.skillSystem.awardXP(recipe.skill, recipe.xp)

    const outputDef = ITEM_DEFINITIONS[recipe.outputId]
    const outputName = outputDef?.name ?? recipe.outputId

    eventBus.emit('ui:notification', {
      message: `Crafted ${recipe.outputQty > 1 ? recipe.outputQty + 'x ' : ''}${outputName}!`,
      type: 'success',
    })

    return { success: true, message: `Crafted ${outputName}!` }
  }

  /** Get all recipes the player has materials for or could attempt */
  getAvailableRecipes(skill?: SkillType): Recipe[] {
    return Object.values(RECIPES).filter(r => {
      if (skill && r.skill !== skill) return false
      return true
    })
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
