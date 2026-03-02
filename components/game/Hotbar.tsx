'use client'

import { useState, useEffect, useCallback } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { ITEM_DEFINITIONS } from '@/lib/game/data/items'
import { eventBus } from '@/lib/game/engine/EventBus'
import { ItemType } from '@/lib/game/data/types'

const CREAM  = '#F0E8C8'
const BLACK  = '#181818'
const GOLD   = '#E8A000'
const SHADOW = '#706040'

interface Props {
  engine: GameEngine | null
}

export default function Hotbar({ engine }: Props) {
  const [, forceUpdate] = useState(0)

  // Re-render on hotbar use to update quantities
  useEffect(() => {
    const unsub = eventBus.on('hotbar:used', () => forceUpdate(n => n + 1))
    return unsub
  }, [])

  // Also re-render periodically to keep quantities current
  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSlotClick = useCallback((slot: number) => {
    if (!engine) return
    engine.useHotbarSlot(slot)
    forceUpdate(n => n + 1)
  }, [engine])

  const handleRightClick = useCallback((e: React.MouseEvent, slot: number) => {
    e.preventDefault()
    if (!engine) return
    engine.assignHotbar(slot, null)
    forceUpdate(n => n + 1)
  }, [engine])

  // Handle drag & drop from inventory
  const handleDrop = useCallback((e: React.DragEvent, slot: number) => {
    e.preventDefault()
    if (!engine) return
    const itemId = e.dataTransfer.getData('text/plain')
    if (!itemId) return
    const def = ITEM_DEFINITIONS[itemId]
    if (!def) return
    // Only allow consumables and taming items on hotbar
    if (def.type !== ItemType.Consumable && def.type !== ItemType.TamingItem) return
    engine.assignHotbar(slot, itemId)
    forceUpdate(n => n + 1)
  }, [engine])

  if (!engine) return null

  const slots = engine.hotbarSlots

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto"
      style={{ zIndex: 20 }}
    >
      <div style={{
        display: 'flex',
        gap: 2,
        background: 'rgba(0,0,0,0.6)',
        border: `2px solid ${BLACK}`,
        padding: 3,
        borderRadius: 2,
      }}>
        {slots.map((itemId, i) => {
          const def = itemId ? ITEM_DEFINITIONS[itemId] : null
          const invItem = itemId
            ? engine.playerState.inventory.find(inv => inv.itemId === itemId)
            : null
          const qty = invItem?.quantity ?? 0

          return (
            <div
              key={i}
              onClick={() => handleSlotClick(i)}
              onContextMenu={(e) => handleRightClick(e, i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, i)}
              style={{
                width: 30,
                height: 30,
                background: def ? 'rgba(240,232,200,0.15)' : 'rgba(60,50,30,0.3)',
                border: `1px solid ${def ? GOLD : '#444'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: def ? 'pointer' : 'default',
                position: 'relative',
                fontFamily: "'Press Start 2P', monospace",
              }}
              title={def ? `${def.name} (${qty})` : `Slot ${i + 1} — empty`}
            >
              {def ? (
                <>
                  <span className="emoji-icon" style={{ fontSize: 12, lineHeight: 1 }}>
                    {def.icon}
                  </span>
                  {qty > 0 && (
                    <span style={{
                      position: 'absolute',
                      bottom: 1,
                      right: 2,
                      fontSize: 4,
                      color: CREAM,
                      textShadow: `0 0 2px ${BLACK}`,
                    }}>
                      {qty}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 4, color: SHADOW, opacity: 0.5 }}>{i + 1}</span>
              )}
              {/* Key number indicator */}
              <span style={{
                position: 'absolute',
                top: 1,
                left: 2,
                fontSize: 3,
                color: '#888',
              }}>
                {i + 1}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
