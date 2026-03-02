'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { GameEngine } from '@/lib/game/GameEngine'
import { Element, SkillType } from '@/lib/game/data/types'

interface Props {
  engine: GameEngine | null
}

const ELEMENT_COLORS: Record<string, string> = {
  [Element.Fire]:      'text-red-400',
  [Element.Water]:     'text-blue-400',
  [Element.Earth]:     'text-yellow-700',
  [Element.Lightning]: 'text-yellow-300',
  [Element.Wind]:      'text-green-300',
  [Element.Shadow]:    'text-purple-400',
  [Element.Light]:     'text-white',
  [Element.Arcane]:    'text-violet-400',
}

const ELEMENT_ICONS: Record<string, string> = {
  [Element.Fire]:      '🔥',
  [Element.Water]:     '💧',
  [Element.Earth]:     '🪨',
  [Element.Lightning]: '⚡',
  [Element.Wind]:      '🌀',
  [Element.Shadow]:    '🌑',
  [Element.Light]:     '✨',
  [Element.Arcane]:    '🔮',
}

export default function SpellPanel({ engine }: Props) {
  const { activePanel, setPanel } = useGameStore()
  const [, forceUpdate] = useState(0)
  if (activePanel !== 'spells' || !engine) return null

  const spells = engine.getUnlockedSpells()
  const currentIdx = engine.playerState.equippedSpellIndex
  const combatStyle = engine.playerState.combatStyle

  const selectSpell = (idx: number) => {
    engine.setEquippedSpell(idx)
    forceUpdate(n => n + 1)
  }

  return (
    <div className="absolute inset-y-4 right-4 w-80 bg-game-bg border border-game-border rounded-lg overflow-hidden flex flex-col shadow-2xl font-mono">
      <div className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-panel">
        <h2 className="text-game-text font-bold">Spellbook</h2>
        <span className="text-[9px] text-gray-500">
          {combatStyle === 'magic' ? '🔱 Staff equipped' : '⚠️ Equip a staff to cast'}
        </span>
        <button onClick={() => setPanel(null)} className="text-gray-500 hover:text-white ml-2">✕</button>
      </div>

      {spells.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs p-8 text-center">
          No spells unlocked yet. Raise your Magic skill to unlock spells.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {spells.map((spell, idx) => {
            const isSelected = idx === currentIdx
            const elColor = ELEMENT_COLORS[spell.element] ?? 'text-gray-400'
            const icon = ELEMENT_ICONS[spell.element] ?? '🔮'
            return (
              <div
                key={spell.id}
                className={`rounded border p-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-violet-900/40 border-violet-500'
                    : 'bg-game-panel border-gray-800 hover:bg-gray-800'
                }`}
                onClick={() => selectSpell(idx)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base emoji-icon">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${elColor}`}>{spell.name}</span>
                      {isSelected && (
                        <span className="text-[7px] bg-violet-600 text-white px-1 rounded">EQUIPPED</span>
                      )}
                    </div>
                    <div className="text-[8px] text-gray-500 mt-0.5">{spell.description}</div>
                  </div>
                </div>
                <div className="flex gap-3 mt-1.5 text-[8px]">
                  <span className="text-red-400">DMG {spell.basePower}</span>
                  <span className="text-blue-400">EN {spell.energyCost}</span>
                  <span className="text-yellow-400">CD {spell.cooldown}s</span>
                  <span className="text-green-400">RNG {spell.range}</span>
                  {spell.aoeRadius > 0 && <span className="text-orange-400">AoE {spell.aoeRadius}</span>}
                  {spell.statusEffect && (
                    <span className="text-purple-300">
                      {spell.statusEffect} {Math.round((spell.statusChance ?? 0) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="px-3 pb-3 pt-1 border-t border-game-border text-[8px] text-gray-600">
        Click to equip · Q to cycle in-game · Magic Lv{engine.playerState.skills[SkillType.Magic]?.level ?? 1}
      </div>
    </div>
  )
}
