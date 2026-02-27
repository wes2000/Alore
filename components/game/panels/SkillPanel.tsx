'use client'

import { useGameStore } from '@/lib/store/gameStore'
import { SkillType, SkillCategory } from '@/lib/game/data/types'
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

export default function SkillPanel({ engine }: Props) {
  const { activePanel, setPanel } = useGameStore()
  if (activePanel !== 'skills') return null

  const skills = engine?.playerState.skills
  if (!skills) return null

  const totalLevel = Object.values(skills).reduce((s, sk) => s + sk.level, 0)

  return (
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
                const nextMilestone = def.milestones.find(m => m.level > state.level)
                return (
                  <SkillRow
                    key={def.type}
                    icon={def.icon}
                    name={def.name}
                    level={state.level}
                    xp={state.xp}
                    xpToNext={state.xpToNext}
                    progressPct={pct}
                    color={def.color}
                    nextMilestone={nextMilestone?.level}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </PanelContainer>
  )
}

function SkillRow({
  icon, name, level, xp, xpToNext, progressPct, color, nextMilestone,
}: {
  icon: string; name: string; level: number; xp: number; xpToNext: number
  progressPct: number; color: string; nextMilestone?: number
}) {
  return (
    <div className="bg-game-panel rounded border border-game-border p-2 hover:border-gray-500 transition-colors cursor-default">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
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
          <span>→ lv{nextMilestone}</span>
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
