'use client'

import { useGameStore } from '@/lib/store/gameStore'
import { BiomeType } from '@/lib/game/data/types'
import { BIOME_DEFINITIONS } from '@/lib/game/data/biomes'
import { GameEngine } from '@/lib/game/GameEngine'
import Minimap from './Minimap'

interface HUDProps {
  engine: GameEngine | null
}

export default function HUD({ engine }: HUDProps) {
  const {
    playerHP, playerMaxHP, playerEnergy, playerMaxEnergy,
    playerGold, playerX, playerY, currentBiome, fps,
    activePanel, togglePanel, notifications,
    interactPrompt, gatherProgress,
    playerATK, playerDEF,
  } = useGameStore()

  const hpPct     = Math.max(0, (playerHP / Math.max(1, playerMaxHP)) * 100)
  const energyPct = Math.max(0, (playerEnergy / Math.max(1, playerMaxEnergy)) * 100)
  const biomeName = currentBiome ? BIOME_DEFINITIONS[currentBiome]?.name ?? currentBiome : '...'

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-mono">

      {/* ── Top-left: Vitals ── */}
      <div className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-1.5 w-52">
        {/* HP Bar */}
        <div>
          <div className="flex justify-between text-xs text-game-text mb-0.5">
            <span className="text-game-health font-bold">❤ HP</span>
            <span>{playerHP} / {playerMaxHP}</span>
          </div>
          <div className="h-3 bg-game-panel rounded-sm border border-game-border overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-200"
              style={{
                width: `${hpPct}%`,
                background: hpPct > 50 ? '#20c020' : hpPct > 25 ? '#e0c020' : '#e02020',
              }}
            />
          </div>
        </div>

        {/* Energy Bar */}
        <div>
          <div className="flex justify-between text-xs text-game-text mb-0.5">
            <span className="text-blue-400 font-bold">⚡ Energy</span>
            <span>{Math.floor(playerEnergy)} / {playerMaxEnergy}</span>
          </div>
          <div className="h-2.5 bg-game-panel rounded-sm border border-game-border overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-200 bg-blue-500"
              style={{ width: `${energyPct}%` }}
            />
          </div>
        </div>

        {/* Combat stats row */}
        <div className="flex gap-3 text-[10px] text-gray-500 pt-0.5">
          <span className="text-orange-400">⚔ {playerATK} ATK</span>
          <span className="text-sky-400">🛡 {playerDEF} DEF</span>
        </div>

        {/* Gather Progress Bar (only visible while gathering) */}
        {gatherProgress !== null && (
          <div>
            <div className="flex justify-between text-xs text-game-text mb-0.5">
              <span className="text-yellow-300 font-bold">⛏ Gathering...</span>
              <span>{Math.round(gatherProgress * 100)}%</span>
            </div>
            <div className="h-2.5 bg-game-panel rounded-sm border border-game-border overflow-hidden">
              <div
                className="h-full rounded-sm bg-yellow-400 transition-none"
                style={{ width: `${gatherProgress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Top-right: Info + Minimap ── */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <div className="text-right text-xs text-game-text flex flex-col gap-0.5">
          <span className="text-game-gold font-bold">🪙 {playerGold.toLocaleString()}</span>
          <span className="text-gray-400">{biomeName}</span>
          <span className="text-gray-500">{Math.floor(playerX)}, {Math.floor(playerY)}</span>
          <span className="text-gray-600 text-[10px]">{fps} FPS</span>
        </div>
        <Minimap engine={engine} />
      </div>

      {/* ── Interact Prompt (center-bottom of screen) ── */}
      {interactPrompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <div className="px-4 py-1.5 rounded border border-yellow-500/60 bg-black/70 text-yellow-300 text-xs font-bold tracking-wide">
            {interactPrompt}
          </div>
        </div>
      )}

      {/* ── Bottom: Action Bar ── */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <ActionButton
          label="Skills"
          hotkey="L"
          active={activePanel === 'skills'}
          onClick={() => togglePanel('skills')}
          color="text-yellow-300"
        />
        <ActionButton
          label="Pets"
          hotkey="P"
          active={activePanel === 'pets'}
          onClick={() => togglePanel('pets')}
          color="text-pink-400"
        />
        <ActionButton
          label="Items"
          hotkey="Tab"
          active={activePanel === 'inventory'}
          onClick={() => togglePanel('inventory')}
          color="text-green-400"
        />
        <ActionButton
          label="Map"
          hotkey="M"
          active={activePanel === 'map'}
          onClick={() => togglePanel('map')}
          color="text-blue-400"
        />
      </div>

      {/* ── Notifications ── */}
      <div className="absolute right-3 bottom-20 flex flex-col gap-1.5 items-end max-w-xs">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`px-3 py-1.5 rounded text-xs font-medium border animate-fade-in ${notifStyle(n.type)}`}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* ── Controls hint (bottom-left) ── */}
      <div className="absolute left-3 bottom-4 text-[10px] text-gray-600 leading-4">
        <div>WASD Move · Shift Sprint</div>
        <div>Space Attack · E Interact</div>
        <div>Q/R Abilities · Scroll Zoom</div>
      </div>
    </div>
  )
}

function ActionButton({
  label, hotkey, active, onClick, color,
}: {
  label: string; hotkey: string; active: boolean; onClick: () => void; color: string
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded border text-xs font-bold transition-all
        ${active
          ? 'bg-game-accent border-purple-400 text-white'
          : 'bg-game-panel border-game-border text-game-text hover:border-gray-500'
        }
      `}
    >
      <span className={color}>{label}</span>
      <span className="ml-1.5 text-gray-500 font-normal text-[10px]">[{hotkey}]</span>
    </button>
  )
}

function notifStyle(type: 'info' | 'success' | 'warning' | 'danger'): string {
  switch (type) {
    case 'success': return 'bg-green-900/80 border-green-600 text-green-200'
    case 'warning': return 'bg-yellow-900/80 border-yellow-600 text-yellow-200'
    case 'danger':  return 'bg-red-900/80 border-red-600 text-red-200'
    default:        return 'bg-gray-900/80 border-gray-600 text-gray-200'
  }
}
