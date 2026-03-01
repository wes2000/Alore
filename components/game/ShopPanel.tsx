'use client'

import { useState, useEffect } from 'react'
import { GameEngine } from '@/lib/game/GameEngine'
import { SHOP_BUY_ITEMS } from '@/lib/game/data/shop'
import { ITEM_DEFINITIONS } from '@/lib/game/data/items'
import { useGameStore } from '@/lib/store/gameStore'
import { InventoryItem } from '@/lib/game/data/types'

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

interface Props { engine: GameEngine | null }

export default function ShopPanel({ engine }: Props) {
  const { setShopOpen, playerGold } = useGameStore()
  const [tab, setTab]     = useState<'buy' | 'sell'>('buy')
  const [msg, setMsg]     = useState<string | null>(null)
  const [msgOk, setMsgOk] = useState(true)
  const [inv, setInv]     = useState<InventoryItem[]>([])

  // Sync inventory from engine whenever panel opens or tab switches to sell
  useEffect(() => {
    if (engine) setInv([...engine.playerState.inventory])
  }, [engine, tab])

  const flash = (text: string, ok: boolean) => {
    setMsg(text); setMsgOk(ok)
    setTimeout(() => setMsg(null), 1800)
  }

  const handleBuy = (itemId: string, price: number) => {
    if (!engine) return
    const r = engine.buyItem(itemId)
    flash(r.message, r.success)
    if (r.success) setInv([...engine.playerState.inventory])
  }

  const handleSell = (slotIndex: number) => {
    if (!engine) return
    const r = engine.sellItem(slotIndex)
    flash(r.message, r.success)
    setInv([...engine.playerState.inventory])
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
      style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) setShopOpen(false) }}
    >
      <div style={{ ...panel, width: 320, maxWidth: '92vw', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 7, color: GOLD }}>GENERAL STORE</div>
          <div style={{ fontSize: 7, color: GOLD }}>{playerGold.toLocaleString()} G</div>
          <button
            onClick={() => setShopOpen(false)}
            style={{ ...PIXEL, fontSize: 8, background: RED, color: CREAM, border: `2px solid ${BLACK}`, padding: '3px 8px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['buy', 'sell'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...PIXEL, flex: 1, fontSize: 7, padding: '5px 4px',
                background: tab === t ? BLACK : CREAM,
                color: tab === t ? CREAM : BLACK,
                border: `2px solid ${BLACK}`, cursor: 'pointer',
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Feedback message */}
        {msg && (
          <div style={{ fontSize: 6, color: msgOk ? GREEN : RED, textAlign: 'center', padding: '2px' }}>
            {msg}
          </div>
        )}

        {/* Item list */}
        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {tab === 'buy'
            ? SHOP_BUY_ITEMS.map(listing => {
                const def = ITEM_DEFINITIONS[listing.id]
                if (!def) return null
                const canAfford = playerGold >= listing.price
                return (
                  <div
                    key={listing.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', background: '#E0D8A8', border: `2px solid ${BLACK}` }}
                  >
                    <span className="emoji-icon" style={{ fontSize: 16, lineHeight: 1 }}>{def.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 5 }}>{def.name}</div>
                      <div style={{ fontSize: 4, color: SHADOW, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{def.description}</div>
                    </div>
                    <button
                      onClick={() => handleBuy(listing.id, listing.price)}
                      disabled={!canAfford}
                      style={{
                        ...PIXEL, fontSize: 5, padding: '4px 6px', whiteSpace: 'nowrap',
                        background: canAfford ? GOLD : '#A09080',
                        color: BLACK, border: `2px solid ${BLACK}`,
                        cursor: canAfford ? 'pointer' : 'default',
                        flexShrink: 0,
                      }}
                    >
                      {listing.price}G
                    </button>
                  </div>
                )
              })
            : inv.length === 0
              ? <div style={{ fontSize: 6, textAlign: 'center', color: SHADOW, padding: 16 }}>Nothing to sell</div>
              : inv.map(slot => {
                  const def = ITEM_DEFINITIONS[slot.itemId]
                  if (!def || def.value === 0) return null
                  const sellPrice = Math.max(1, Math.floor(def.value * 0.4)) * slot.quantity
                  return (
                    <div
                      key={slot.slotIndex}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', background: '#E0D8A8', border: `2px solid ${BLACK}` }}
                    >
                      <span className="emoji-icon" style={{ fontSize: 16, lineHeight: 1 }}>{def.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 5 }}>{def.name} ×{slot.quantity}</div>
                      </div>
                      <button
                        onClick={() => handleSell(slot.slotIndex)}
                        style={{
                          ...PIXEL, fontSize: 5, padding: '4px 6px', whiteSpace: 'nowrap',
                          background: GREEN, color: CREAM,
                          border: `2px solid ${BLACK}`, cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        +{sellPrice}G
                      </button>
                    </div>
                  )
                })
          }
        </div>
      </div>
    </div>
  )
}
