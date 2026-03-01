'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '@/lib/store/gameStore'
import { SkillType, SkillCategory, SkillMilestone } from '@/lib/game/data/types'
import { SKILL_DEFINITIONS } from '@/lib/game/data/skills'
import { GameEngine } from '@/lib/game/GameEngine'

interface Props {
  engine: GameEngine | null
}

const CATEGORIES = [
  { cat: SkillCategory.Gathering, label: '⛏ Gathering', color: 'text-amber-400' },
  { cat: SkillCategory.Artisan,   label: '🔨 Artisan',   color: 'text-orange-400' },
  { cat: SkillCategory.Combat,    label: '⚔️ Combat',    color: 'text-red-400' },
  { cat: SkillCategory.Special,   label: '✨ Special',   color: 'text-purple-400' },
]

interface SkillTooltipData {
  name: string
  description: string
  color: string
  level: number
  currentMilestone: SkillMilestone | undefined
  nextMilestone: SkillMilestone | undefined
  x: number
  y: number
}

export default function SkillPanel({ engine }: Props) {
  const { activePanel, setPanel } = useGameStore()
  const [tooltip, setTooltip] = useState<SkillTooltipData | null>(null)
  if (activePanel !== 'skills') return null

  const skills = engine?.playerState.skills
  if (!skills) return null

  const totalLevel = Object.values(skills).reduce((s, sk) => s + sk.level, 0)

  return (
    <>
      <PanelContainer title="Skills" onClose={() => setPanel(null)} totalLevel={totalLevel}>
        {CATEGORIES.map(({ cat, label, color }) => {
          const catSkills = Object.values(SKILL_DEFINITIONS).filter(d => d.category === cat)
          return (
            <div key={cat} className="mb-4">
              <h3 className={`text-xs font-bold mb-2 ${color}`}>{label}</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {catSkills.map(def => {
                  const state = skills[def.type]
                  if (!state) return null
                  const pct = engine!.skillSystem.getProgressPercent(def.type)
                  const currentMilestone = [...def.milestones].reverse().find(m => m.level <= state.level)
                  const nextMilestone = def.milestones.find(m => m.level > state.level)
                  return (
                    <SkillRow
                      key={def.type}
                      icon={def.icon}
                      name={def.name}
                      description={def.description}
                      level={state.level}
                      xp={state.xp}
                      xpToNext={state.xpToNext}
                      progressPct={pct}
                      color={def.color}
                      currentMilestone={currentMilestone}
                      nextMilestone={nextMilestone}
                      onShowTooltip={(x, y) => setTooltip({
                        name: def.name,
                        description: def.description,
                        color: def.color,
                        level: state.level,
                        currentMilestone,
                        nextMilestone,
                        x, y,
                      })}
                      onHideTooltip={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </PanelContainer>

      {tooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] w-52 bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-[9px] pointer-events-none font-mono shadow-xl"
          style={{
            left: `${tooltip.x - 8}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-100%, -50%)',
          }}
        >
          <div className="font-bold mb-1 text-[10px]" style={{ color: tooltip.color }}>
            {tooltip.name} — Lv {tooltip.level}
          </div>
          <div className="text-gray-400 mb-2">{tooltip.description}</div>

          {tooltip.currentMilestone && (
            <div className="mb-2 border-t border-gray-700 pt-1.5">
              <div className="text-gray-500 uppercase text-[7px] mb-0.5">Current rank</div>
              <div className="text-game-text font-bold">{tooltip.currentMilestone.title}</div>
              <div className="text-gray-400">{tooltip.currentMilestone.description}</div>
            </div>
          )}

          {tooltip.nextMilestone && (
            <div className="border-t border-gray-700 pt-1.5">
              <div className="text-gray-500 uppercase text-[7px] mb-0.5">Next at level {tooltip.nextMilestone.level}</div>
              <div className="text-game-gold font-bold">{tooltip.nextMilestone.title}</div>
              <div className="text-gray-400">{tooltip.nextMilestone.description}</div>
            </div>
          )}

          {!tooltip.nextMilestone && tooltip.level >= 99 && (
            <div className="border-t border-gray-700 pt-1.5">
              <div className="text-yellow-400 font-bold">✦ Mastered!</div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

function SkillRow({
  icon, name, description, level, xp, xpToNext, progressPct, color,
  currentMilestone, nextMilestone, onShowTooltip, onHideTooltip,
}: {
  icon: string; name: string; description: string; level: number; xp: number; xpToNext: number
  progressPct: number; color: string
  currentMilestone: SkillMilestone | undefined; nextMilestone: SkillMilestone | undefined
  onShowTooltip: (x: number, y: number) => void; onHideTooltip: () => void
}) {
  return (
    <div
      className="bg-game-panel rounded border border-game-border p-2 hover:border-gray-500 transition-colors cursor-default"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        onShowTooltip(rect.left, rect.top + rect.height / 2)
      }}
      onMouseLeave={onHideTooltip}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm emoji-icon">{icon}</span>
        <span className="text-xs text-game-text font-medium truncate flex-1">{name}</span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color }}
        >
          {level}
        </span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-0.5">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-500">
        <span>{Math.floor(xp).toLocaleString()} xp</span>
        {nextMilestone && level < 99 && (
          <span>→ lv{nextMilestone.level}</span>
        )}
      </div>
    </div>
  )
}

function PanelContainer({
  title, onClose, totalLevel, children,
}: {
  title: string; onClose: () => void; totalLevel?: number; children: React.ReactNode
}) {
  return (
    <div className="absolute inset-y-4 right-4 w-80 bg-game-bg border border-game-border rounded-lg overflow-hidden flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-panel">
        <h2 className="text-game-text font-bold tracking-wide">{title}</h2>
        {totalLevel !== undefined && (
          <span className="text-xs text-gray-500">Total: {totalLevel}</span>
        )}
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-lg leading-none ml-2"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-game-text custom-scroll">
        {children}
      </div>
    </div>
  )
}
