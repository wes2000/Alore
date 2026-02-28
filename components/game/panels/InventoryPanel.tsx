'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { InventoryItem, EquipmentSlot, ItemType } from '@/lib/game/data/types'
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

export default function InventoryPanel({ engine }: Props) {
  const { activePanel, setPanel, addNotification } = useGameStore()
  const [, forceUpdate] = useState(0)
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

  return (
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
                className={`rounded border bg-game-panel p-1.5 text-center cursor-pointer hover:bg-gray-800 transition-colors relative group ${rarity || 'border-gray-800'}`}
                onClick={() => itemId && handleUnequip(slot)}
                title={def ? `${def.name}\nClick to unequip` : `${SLOT_LABELS[slot]} — empty`}
              >
                <div className="text-[7px] text-gray-600 uppercase mb-0.5">{SLOT_LABELS[slot]}</div>
                <div className="text-lg">{def ? def.icon : '—'}</div>
                {def && (
                  <div className="text-[8px] text-gray-400 mt-0.5 truncate">{def.name}</div>
                )}
                {def && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-36 bg-gray-900 border border-gray-700 rounded p-1.5 text-[9px] pointer-events-none">
                    <div className={`font-bold mb-0.5 ${rarity.split(' ')[0]}`}>{def.name}</div>
                    <div className="text-gray-400">{def.description}</div>
                    {def.statBonus?.atk && <div className="text-yellow-400">+{def.statBonus.atk} ATK</div>}
                    {def.statBonus?.def && <div className="text-blue-400">+{def.statBonus.def} DEF</div>}
                    {def.statBonus?.matk && <div className="text-purple-400">+{def.statBonus.matk} MATK</div>}
                    {def.statBonus?.mdef && <div className="text-purple-300">+{def.statBonus.mdef} MDEF</div>}
                    <div className="text-gray-500 mt-0.5">Click to unequip</div>
                  </div>
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
                  className={`rounded border bg-game-panel p-1.5 cursor-pointer hover:bg-gray-800 transition-colors group relative ${rarity}`}
                  onClick={() => useItem(item)}
                  title={`${def.name}\n${def.description}${isEquippable ? '\nClick to equip' : ''}`}
                >
                  <div className="text-lg text-center">{def.icon}</div>
                  {item.quantity > 1 && (
                    <div className="absolute bottom-0.5 right-1 text-[9px] text-game-text font-bold">
                      {item.quantity}
                    </div>
                  )}
                  {/* Equippable indicator */}
                  {isEquippable && (
                    <div className="absolute top-0 right-0.5 text-[7px] text-yellow-500">E</div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-40 bg-gray-900 border border-gray-700 rounded p-1.5 text-[9px] pointer-events-none">
                    <div className={`font-bold mb-0.5 ${rarity.split(' ')[0]}`}>{def.name}</div>
                    <div className="text-gray-400">{def.description}</div>
                    {def.statBonus?.atk && <div className="text-yellow-400">+{def.statBonus.atk} ATK</div>}
                    {def.statBonus?.def && <div className="text-blue-400">+{def.statBonus.def} DEF</div>}
                    {def.statBonus?.matk && <div className="text-purple-400">+{def.statBonus.matk} MATK</div>}
                    <div className="text-game-gold mt-0.5">{def.value}g</div>
                  </div>
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
  )
}
