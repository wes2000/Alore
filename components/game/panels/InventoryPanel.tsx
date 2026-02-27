'use client'

import { useGameStore } from '@/lib/store/gameStore'
import { InventoryItem } from '@/lib/game/data/types'
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

export default function InventoryPanel({ engine }: Props) {
  const { activePanel, setPanel, addNotification } = useGameStore()
  if (activePanel !== 'inventory' || !engine) return null

  const inventory = engine.playerState.inventory
  const gold = engine.playerState.gold

  const useItem = (item: InventoryItem) => {
    const def = ITEM_DEFINITIONS[item.itemId]
    if (!def) return
    // HP potions
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
      return
    }
    addNotification(`Cannot use ${def.name} right now`, 'warning')
  }

  return (
    <div className="absolute inset-y-4 right-4 w-80 bg-game-bg border border-game-border rounded-lg overflow-hidden flex flex-col shadow-2xl font-mono">
      <div className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-panel">
        <h2 className="text-game-text font-bold">🎒 Inventory</h2>
        <span className="text-game-gold font-bold text-sm">🪙 {gold.toLocaleString()}</span>
        <button onClick={() => setPanel(null)} className="text-gray-500 hover:text-white ml-2">✕</button>
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
              return (
                <div
                  key={idx}
                  className={`rounded border bg-game-panel p-1.5 cursor-pointer hover:bg-gray-800 transition-colors group relative ${rarity}`}
                  onClick={() => useItem(item)}
                  title={`${def.name}\n${def.description}`}
                >
                  <div className="text-lg text-center">{def.icon}</div>
                  {item.quantity > 1 && (
                    <div className="absolute bottom-0.5 right-1 text-[9px] text-game-text font-bold">
                      {item.quantity}
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-40 bg-gray-900 border border-gray-700 rounded p-1.5 text-[9px] pointer-events-none">
                    <div className={`font-bold mb-0.5 ${rarity.split(' ')[0]}`}>{def.name}</div>
                    <div className="text-gray-400">{def.description}</div>
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
        Click consumables to use
      </div>
    </div>
  )
}
