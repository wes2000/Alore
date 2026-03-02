'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '@/lib/store/gameStore'
import { InventoryItem, EquipmentSlot, ItemType, ItemDefinition } from '@/lib/game/data/types'
import { ITEM_DEFINITIONS } from '@/lib/game/data/items'
import { GameEngine } from '@/lib/game/GameEngine'
import { ItemRarity } from '@/lib/game/data/types'

interface Props {
  engine: GameEngine | null
}

const RARITY_COLORS: Record<ItemRarity, string> = {
  [ItemRarity.Common]:    'text-gray-400 border-gray-700',
  [ItemRarity.Uncommon]:  'text-green-400 border-green-800',
  [ItemRarity.Rare]:      'text-blue-400 border-blue-800',
  [ItemRarity.Epic]:      'text-purple-400 border-purple-800',
  [ItemRarity.Legendary]: 'text-yellow-400 border-yellow-800',
}

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapon',
  offhand: 'Offhand',
  body: 'Body',
}

interface TooltipData {
  def: ItemDefinition
  rarity: string
  x: number
  y: number
  isEquip: boolean
}

export default function InventoryPanel({ engine }: Props) {
  const { activePanel, setPanel, addNotification } = useGameStore()
  const [, forceUpdate] = useState(0)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  if (activePanel !== 'inventory' || !engine) return null

  const inventory = engine.playerState.inventory
  const gold = engine.playerState.gold
  const equipment = engine.playerState.equipment

  const useItem = (item: InventoryItem) => {
    const def = ITEM_DEFINITIONS[item.itemId]
    if (!def) return

    // Equippable items
    if (def.equipSlot) {
      const result = engine.equipItem(item.itemId)
      addNotification(result.message, result.success ? 'success' : 'warning')
      forceUpdate(n => n + 1)
      return
    }

    // Consumables with healAmount
    if (def.healAmount && def.healAmount > 0) {
      engine.playerState.hp = Math.min(engine.playerState.maxHp, engine.playerState.hp + def.healAmount)
      item.quantity--
      if (item.quantity <= 0) {
        const idx = inventory.indexOf(item)
        if (idx !== -1) inventory.splice(idx, 1)
      }
      addNotification(`Restored ${def.healAmount} HP!`, 'success')
      forceUpdate(n => n + 1)
      return
    }

    // HP potions (legacy support for items without healAmount)
    if (item.itemId.startsWith('hp_potion')) {
      const healAmounts: Record<string, number> = {
        hp_potion_s: 40, hp_potion_m: 120, hp_potion_l: 280,
      }
      const heal = healAmounts[item.itemId] ?? 40
      engine.playerState.hp = Math.min(engine.playerState.maxHp, engine.playerState.hp + heal)
      item.quantity--
      if (item.quantity <= 0) {
        const idx = inventory.indexOf(item)
        if (idx !== -1) inventory.splice(idx, 1)
      }
      addNotification(`Restored ${heal} HP!`, 'success')
      forceUpdate(n => n + 1)
      return
    }
    addNotification(`Cannot use ${def.name} right now`, 'warning')
  }

  const handleUnequip = (slot: EquipmentSlot) => {
    engine.unequipItem(slot)
    addNotification(`Unequipped ${SLOT_LABELS[slot]}`, 'info')
    forceUpdate(n => n + 1)
  }

  const showTooltip = (e: React.MouseEvent, def: ItemDefinition, rarity: string, isEquip: boolean) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({ def, rarity, x: rect.left, y: rect.top + rect.height / 2, isEquip })
  }

  const hideTooltip = () => setTooltip(null)

  return (
    <>
      <div className="absolute inset-y-4 right-4 w-80 bg-game-bg border border-game-border rounded-lg overflow-hidden flex flex-col shadow-2xl font-mono">
        <div className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-panel">
          <h2 className="text-game-text font-bold">Inventory</h2>
          <span className="text-game-gold font-bold text-sm">{gold.toLocaleString()}G</span>
          <button onClick={() => setPanel(null)} className="text-gray-500 hover:text-white ml-2">✕</button>
        </div>

        {/* Equipment slots */}
        <div className="px-3 pt-3 pb-1">
          <div className="text-[9px] text-gray-500 mb-1.5 uppercase tracking-wider">Equipment</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['weapon', 'offhand', 'body'] as EquipmentSlot[]).map(slot => {
              const itemId = equipment[slot]
              const def = itemId ? ITEM_DEFINITIONS[itemId] : null
              const rarity = def ? RARITY_COLORS[def.rarity] : ''
              return (
                <div
                  key={slot}
                  className={`rounded border bg-game-panel p-1.5 text-center cursor-pointer hover:bg-gray-800 transition-colors relative ${rarity || 'border-gray-800'}`}
                  onClick={() => itemId && handleUnequip(slot)}
                  onMouseEnter={def ? (e) => showTooltip(e, def, rarity, true) : undefined}
                  onMouseLeave={hideTooltip}
                >
                  <div className="text-[7px] text-gray-600 uppercase mb-0.5">{SLOT_LABELS[slot]}</div>
                  <div className="text-lg emoji-icon">{def ? def.icon : '—'}</div>
                  {def && (
                    <div className="text-[8px] text-gray-400 mt-0.5 truncate">{def.name}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {inventory.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-8">Your inventory is empty.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {inventory.map((item, idx) => {
                const def = ITEM_DEFINITIONS[item.itemId]
                if (!def) return null
                const rarity = RARITY_COLORS[def.rarity]
                const isEquippable = !!def.equipSlot
                return (
                  <div
                    key={idx}
                    className={`rounded border bg-game-panel p-1.5 cursor-pointer hover:bg-gray-800 transition-colors relative ${rarity}`}
                    onClick={() => useItem(item)}
                    onMouseEnter={(e) => showTooltip(e, def, rarity, false)}
                    onMouseLeave={hideTooltip}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', item.itemId)}
                  >
                    <div className="text-lg text-center emoji-icon">{def.icon}</div>
                    {item.quantity > 1 && (
                      <div className="absolute bottom-0.5 right-1 text-[9px] text-game-text font-bold">
                        {item.quantity}
                      </div>
                    )}
                    {isEquippable && (
                      <div className="absolute top-0 right-0.5 text-[7px] text-yellow-500">E</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-3 pb-3 pt-1 border-t border-game-border text-[9px] text-gray-600">
          {inventory.reduce((sum, i) => sum + i.quantity, 0)} items ·
          Click equipment to equip · Click consumables to use
        </div>
      </div>

      {/* Tooltip rendered via portal to avoid overflow clipping */}
      {tooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] w-44 bg-gray-900 border border-gray-600 rounded-lg p-2 text-[10px] pointer-events-none font-mono shadow-xl"
          style={{
            left: `${tooltip.x - 8}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-100%, -50%)',
          }}
        >
          <div className={`font-bold mb-1 ${tooltip.rarity.split(' ')[0]}`}>{tooltip.def.name}</div>
          <div className="text-gray-400 mb-1">{tooltip.def.description}</div>
          {tooltip.def.statBonus?.atk && <div className="text-yellow-400">+{tooltip.def.statBonus.atk} ATK</div>}
          {tooltip.def.statBonus?.def && <div className="text-blue-400">+{tooltip.def.statBonus.def} DEF</div>}
          {tooltip.def.statBonus?.matk && <div className="text-purple-400">+{tooltip.def.statBonus.matk} MATK</div>}
          {tooltip.def.statBonus?.mdef && <div className="text-purple-300">+{tooltip.def.statBonus.mdef} MDEF</div>}
          {!tooltip.isEquip && <div className="text-game-gold mt-1">{tooltip.def.value}g</div>}
          {tooltip.isEquip && <div className="text-gray-500 mt-1">Click to unequip</div>}
        </div>,
        document.body
      )}
    </>
  )
}
