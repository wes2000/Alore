'use client'

import { useGameStore } from '@/lib/store/gameStore'
import { BiomeType } from '@/lib/game/data/types'
import { BIOME_DEFINITIONS } from '@/lib/game/data/biomes'
import { GameEngine } from '@/lib/game/GameEngine'
import Minimap from './Minimap'

// ── Pokémon Red/Blue palette ──────────────────────────────────────────────────
const CREAM  = '#F0E8C8'
const BLACK  = '#181818'
const RED    = '#D03030'
const GOLD   = '#E8A000'
const BLUE   = '#2848C0'
const GREEN  = '#00A800'
const YELLOW = '#E8C000'
const SHADOW = '#706040'

const panel: React.CSSProperties = {
  background: CREAM,
  border: `3px solid ${BLACK}`,
  boxShadow: `3px 3px 0 ${BLACK}`,
  color: BLACK,
  fontFamily: "'Press Start 2P', monospace",
  imageRendering: 'pixelated',
}

interface HUDProps {
  engine: GameEngine | null
}

export default function HUD({ engine }: HUDProps) {
  const {
    playerHP, playerMaxHP, playerEnergy, playerMaxEnergy,
    playerGold, currentBiome, fps,
    activePanel, togglePanel, notifications,
    interactPrompt, gatherProgress,
    playerATK, playerDEF,
  } = useGameStore()

  const hpPct     = Math.max(0, playerHP / Math.max(1, playerMaxHP))
  const energyPct = Math.max(0, playerEnergy / Math.max(1, playerMaxEnergy))
  const biomeName = currentBiome ? (BIOME_DEFINITIONS[currentBiome]?.name ?? currentBiome) : '---'
  const hpColor   = hpPct > 0.5 ? GREEN : hpPct > 0.25 ? YELLOW : RED

  return (
    <div className="pointer-events-none absolute inset-0 select-none">

      {/* ── Top-left: Vitals ── */}
      <div className="absolute left-2 top-2 flex flex-col gap-1.5" style={{ width: 178 }}>
        <div style={{ ...panel, padding: '7px 9px' }}>

          {/* HP row */}
          <div style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 6, marginBottom: 4 }}>
              <span style={{ color: RED }}>HP</span>
              <span style={{ fontSize: 5, color: SHADOW }}>{playerHP}/{playerMaxHP}</span>
            </div>
            <SegBar pct={hpPct} color={hpColor} />
          </div>

          {/* Energy row */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 6, marginBottom: 4 }}>
              <span style={{ color: BLUE }}>EN</span>
              <span style={{ fontSize: 5, color: SHADOW }}>{Math.floor(playerEnergy)}/{playerMaxEnergy}</span>
            </div>
            <SegBar pct={energyPct} color={BLUE} />
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 5 }}>
            <span>ATK <span style={{ color: YELLOW }}>{playerATK}</span></span>
            <span>DEF <span style={{ color: BLUE }}>{playerDEF}</span></span>
          </div>
        </div>

        {/* Gather progress */}
        {gatherProgress !== null && (
          <div style={{ ...panel, padding: '6px 9px' }}>
            <div style={{ fontSize: 5, marginBottom: 4, color: GOLD }}>GATHERING...</div>
            <SegBar pct={gatherProgress} color={GOLD} />
          </div>
        )}
      </div>

      {/* ── Top-right: Info + Minimap ── */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
        <div style={{ ...panel, padding: '6px 8px', textAlign: 'right', lineHeight: '15px' }}>
          <div style={{ fontSize: 7, color: GOLD }}>{playerGold.toLocaleString()} G</div>
          <div style={{ fontSize: 5, marginTop: 3 }}>{biomeName.toUpperCase()}</div>
          <div style={{ fontSize: 4, marginTop: 2, color: SHADOW }}>{fps} FPS</div>
        </div>
        <div style={{ border: `3px solid ${BLACK}`, boxShadow: `3px 3px 0 ${BLACK}`, lineHeight: 0 }}>
          <Minimap engine={engine} />
        </div>
      </div>

      {/* ── Interact Prompt ── */}
      {interactPrompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <div style={{ ...panel, padding: '6px 12px', fontSize: 6 }}>
            ▶ {interactPrompt}
          </div>
        </div>
      )}

      {/* ── Bottom: Action Bar (2×2 battle menu) ── */}
      <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
        <div style={{
          ...panel,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          overflow: 'hidden',
        }}>
          {[
            { label: 'SKILLS', panel: 'skills',    hotkey: 'L' },
            { label: 'PETS',   panel: 'pets',      hotkey: 'P' },
            { label: 'ITEMS',  panel: 'inventory', hotkey: 'TAB' },
            { label: 'MAP',    panel: 'map',       hotkey: 'M' },
          ].map(({ label, panel: p, hotkey }) => {
            const isActive = activePanel === p
            return (
              <button
                key={p}
                onClick={() => togglePanel(p as 'skills' | 'pets' | 'inventory' | 'map')}
                style={{
                  padding: '7px 11px',
                  fontSize: 6,
                  fontFamily: "'Press Start 2P', monospace",
                  background: isActive ? BLACK : CREAM,
                  color: isActive ? CREAM : BLACK,
                  border: `1px solid ${BLACK}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'none',
                  userSelect: 'none',
                  lineHeight: 1,
                }}
              >
                <span style={{ color: isActive ? CREAM : RED, width: 6 }}>{isActive ? '▶' : ''}</span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="absolute right-2 bottom-20 flex flex-col gap-1.5 items-end" style={{ maxWidth: 200 }}>
        {notifications.map(n => (
          <div
            key={n.id}
            className="animate-fade-in"
            style={{
              ...panel,
              padding: '6px 10px',
              fontSize: 6,
              lineHeight: '13px',
              borderLeft: `5px solid ${notifAccent(n.type)}`,
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* ── Controls hint (desktop only) ── */}
      <div
        className="absolute left-2 bottom-3 hidden md:block"
        style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 4, color: '#808080', lineHeight: '10px' }}
      >
        <div>WASD MOVE  SHIFT SPRINT</div>
        <div>SPACE ATK  E INTERACT</div>
        <div>Q/R ABIL   SCROLL ZOOM</div>
      </div>
    </div>
  )
}

// ── 16-segment bar (Pokémon style) ───────────────────────────────────────────
function SegBar({ pct, color }: { pct: number; color: string }) {
  const SEG = 16
  const filled = Math.round(pct * SEG)
  return (
    <div style={{ display: 'flex', gap: 1, height: 5 }}>
      {Array.from({ length: SEG }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: '100%',
            background: i < filled ? color : '#C8B888',
            border: `1px solid ${BLACK}`,
          }}
        />
      ))}
    </div>
  )
}

function notifAccent(type: 'info' | 'success' | 'warning' | 'danger'): string {
  switch (type) {
    case 'success': return GREEN
    case 'warning': return YELLOW
    case 'danger':  return RED
    default:        return BLUE
  }
}
