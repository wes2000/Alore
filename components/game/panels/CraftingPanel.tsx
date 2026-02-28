'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { GameEngine } from '@/lib/game/GameEngine'
import { SkillType } from '@/lib/game/data/types'
import { RECIPES, Recipe, getRecipesBySkill } from '@/lib/game/data/recipes'
import { ITEM_DEFINITIONS } from '@/lib/game/data/items'

interface Props {
  engine: GameEngine | null
}

const CREAM  = '#F0E8C8'
const BLACK  = '#181818'
const RED    = '#D03030'
const GOLD   = '#E8A000'
const GREEN  = '#00A800'
const SHADOW = '#706040'
const PIXEL: React.CSSProperties = { fontFamily: "'Press Start 2P', monospace" }

const panel: React.CSSProperties = {
  background: CREAM,
  border: `3px solid ${BLACK}`,
  boxShadow: `3px 3px 0 ${BLACK}`,
  color: BLACK,
  ...PIXEL,
}

const TABS: { label: string; skill: SkillType }[] = [
  { label: 'SMTH', skill: SkillType.Smithing },
  { label: 'COOK', skill: SkillType.Cooking },
  { label: 'ALCH', skill: SkillType.Alchemy },
  { label: 'CRFT', skill: SkillType.Crafting },
]

export default function CraftingPanel({ engine }: Props) {
  const { activePanel, setPanel, addNotification } = useGameStore()
  const [tab, setTab] = useState<SkillType>(SkillType.Smithing)
  const [msg, setMsg] = useState<string | null>(null)
  const [msgOk, setMsgOk] = useState(true)
  const [, forceUpdate] = useState(0)

  if (activePanel !== 'crafting' || !engine) return null

  const recipes = getRecipesBySkill(tab)
  const skillLevel = engine.skillSystem.getSkillLevel(tab)

  const flash = (text: string, ok: boolean) => {
    setMsg(text)
    setMsgOk(ok)
    setTimeout(() => setMsg(null), 1800)
  }

  const handleCraft = (recipeId: string) => {
    if (!engine) return
    const result = engine.craftingSystem.craft(recipeId)
    flash(result.message, result.success)
    if (result.success) forceUpdate(n => n + 1)
  }

  const hasIngredients = (recipe: Recipe): boolean => {
    for (const ing of recipe.ingredients) {
      const invItem = engine.playerState.inventory.find(i => i.itemId === ing.itemId)
      if (!invItem || invItem.quantity < ing.quantity) return false
    }
    return true
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
      style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) setPanel(null) }}
    >
      <div style={{ ...panel, width: 340, maxWidth: '92vw', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 7, color: GOLD }}>CRAFTING</div>
          <div style={{ fontSize: 5, color: SHADOW }}>{tab} Lv.{skillLevel}</div>
          <button
            onClick={() => setPanel(null)}
            style={{ ...PIXEL, fontSize: 8, background: RED, color: CREAM, border: `2px solid ${BLACK}`, padding: '3px 8px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3 }}>
          {TABS.map(t => (
            <button
              key={t.skill}
              onClick={() => setTab(t.skill)}
              style={{
                ...PIXEL, flex: 1, fontSize: 5, padding: '5px 2px',
                background: tab === t.skill ? BLACK : CREAM,
                color: tab === t.skill ? CREAM : BLACK,
                border: `2px solid ${BLACK}`, cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {msg && (
          <div style={{ fontSize: 6, color: msgOk ? GREEN : RED, textAlign: 'center', padding: '2px' }}>
            {msg}
          </div>
        )}

        {/* Recipe list */}
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {recipes.map(recipe => {
            const outputDef = ITEM_DEFINITIONS[recipe.outputId]
            const canDo = skillLevel >= recipe.levelReq && hasIngredients(recipe)
            const levelOk = skillLevel >= recipe.levelReq

            return (
              <div
                key={recipe.id}
                style={{
                  padding: '6px',
                  background: levelOk ? '#E0D8A8' : '#C8C0A0',
                  border: `2px solid ${BLACK}`,
                  opacity: levelOk ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{outputDef?.icon ?? '?'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 5, fontWeight: 'bold' }}>
                      {recipe.name}
                      {recipe.outputQty > 1 && <span style={{ color: SHADOW }}> ×{recipe.outputQty}</span>}
                    </div>
                    {!levelOk && (
                      <div style={{ fontSize: 4, color: RED, marginTop: 1 }}>
                        Requires Lv.{recipe.levelReq}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 4, color: SHADOW, flexShrink: 0 }}>
                    +{recipe.xp} XP
                  </div>
                  <button
                    onClick={() => handleCraft(recipe.id)}
                    disabled={!canDo}
                    style={{
                      ...PIXEL, fontSize: 5, padding: '4px 6px',
                      background: canDo ? GREEN : '#A09080',
                      color: canDo ? CREAM : BLACK,
                      border: `2px solid ${BLACK}`,
                      cursor: canDo ? 'pointer' : 'default',
                      flexShrink: 0,
                    }}
                  >
                    CRAFT
                  </button>
                </div>

                {/* Ingredients */}
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {recipe.ingredients.map(ing => {
                    const ingDef = ITEM_DEFINITIONS[ing.itemId]
                    const have = engine.playerState.inventory.find(i => i.itemId === ing.itemId)?.quantity ?? 0
                    const enough = have >= ing.quantity
                    return (
                      <span key={ing.itemId} style={{ fontSize: 4, color: enough ? BLACK : RED }}>
                        {ingDef?.icon ?? '?'} {have}/{ing.quantity} {ingDef?.name ?? ing.itemId}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
