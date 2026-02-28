'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { GameEngine } from '@/lib/game/GameEngine'
import { QUESTS } from '@/lib/game/data/quests'

interface Props {
  engine: GameEngine | null
}

const CREAM  = '#F0E8C8'
const BLACK  = '#181818'
const RED    = '#D03030'
const GOLD   = '#E8A000'
const GREEN  = '#00A800'
const BLUE   = '#2848C0'
const SHADOW = '#706040'
const PIXEL: React.CSSProperties = { fontFamily: "'Press Start 2P', monospace" }

const panel: React.CSSProperties = {
  background: CREAM,
  border: `3px solid ${BLACK}`,
  boxShadow: `3px 3px 0 ${BLACK}`,
  color: BLACK,
  ...PIXEL,
}

export default function QuestPanel({ engine }: Props) {
  const { activePanel, setPanel } = useGameStore()
  const [tab, setTab] = useState<'active' | 'completed'>('active')

  if (activePanel !== 'quests' || !engine) return null

  const activeQuests = engine.questSystem.getActiveQuests()
  const completedIds = engine.playerState.completedQuests

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
      style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) setPanel(null) }}
    >
      <div style={{ ...panel, width: 340, maxWidth: '92vw', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 7, color: GOLD }}>QUESTS</div>
          <div style={{ fontSize: 5, color: SHADOW }}>
            {activeQuests.length} active · {completedIds.length} done
          </div>
          <button
            onClick={() => setPanel(null)}
            style={{ ...PIXEL, fontSize: 8, background: RED, color: CREAM, border: `2px solid ${BLACK}`, padding: '3px 8px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['active', 'completed'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...PIXEL, flex: 1, fontSize: 6, padding: '5px 4px',
                background: tab === t ? BLACK : CREAM,
                color: tab === t ? CREAM : BLACK,
                border: `2px solid ${BLACK}`, cursor: 'pointer',
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Quest list */}
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tab === 'active' ? (
            activeQuests.length === 0 ? (
              <div style={{ fontSize: 6, textAlign: 'center', color: SHADOW, padding: 16 }}>
                No active quests
              </div>
            ) : (
              activeQuests.map(({ quest, progress }) => (
                <div
                  key={quest.id}
                  style={{ padding: '6px', background: '#E0D8A8', border: `2px solid ${BLACK}` }}
                >
                  <div style={{ fontSize: 6, fontWeight: 'bold', color: GOLD }}>{quest.name}</div>
                  <div style={{ fontSize: 4, color: SHADOW, marginTop: 2 }}>{quest.description}</div>

                  {/* Objectives */}
                  <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {quest.objectives.map(obj => {
                      const current = progress.objectives[obj.id] ?? 0
                      const pct = Math.min(1, current / obj.required)
                      const done = current >= obj.required
                      return (
                        <div key={obj.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 4, marginBottom: 2 }}>
                            <span style={{ color: done ? GREEN : BLACK }}>
                              {done ? '✓ ' : '○ '}{obj.description}
                            </span>
                            <span style={{ color: done ? GREEN : SHADOW }}>
                              {current}/{obj.required}
                            </span>
                          </div>
                          <div style={{ height: 4, background: '#C8B888', border: `1px solid ${BLACK}` }}>
                            <div style={{ height: '100%', width: `${pct * 100}%`, background: done ? GREEN : BLUE, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Rewards preview */}
                  <div style={{ marginTop: 4, fontSize: 4, color: SHADOW }}>
                    Rewards:{' '}
                    {quest.rewards.xp?.map(r => `${r.amount} ${r.skill} XP`).join(', ')}
                    {quest.rewards.items && quest.rewards.xp && ', '}
                    {quest.rewards.items?.map(r => `${r.quantity}x ${r.itemId}`).join(', ')}
                    {quest.rewards.goldBonus ? `, ${quest.rewards.goldBonus}G` : ''}
                    {quest.rewards.unlocksEvolution ? ` | Unlocks evolution: ${quest.rewards.unlocksEvolution}` : ''}
                  </div>
                </div>
              ))
            )
          ) : (
            completedIds.length === 0 ? (
              <div style={{ fontSize: 6, textAlign: 'center', color: SHADOW, padding: 16 }}>
                No completed quests yet
              </div>
            ) : (
              completedIds.map(qid => {
                const quest = QUESTS[qid]
                if (!quest) return null
                return (
                  <div
                    key={qid}
                    style={{ padding: '6px', background: '#D8D0A0', border: `2px solid ${BLACK}`, opacity: 0.7 }}
                  >
                    <div style={{ fontSize: 6, color: GREEN }}>✓ {quest.name}</div>
                    <div style={{ fontSize: 4, color: SHADOW, marginTop: 1 }}>{quest.description}</div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>
    </div>
  )
}
