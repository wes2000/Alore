'use client'

import { useGameStore } from '@/lib/store/gameStore'
import { BiomeType } from '@/lib/game/data/types'
import { BIOME_DEFINITIONS } from '@/lib/game/data/biomes'
import { GameEngine } from '@/lib/game/GameEngine'
import Minimap from './Minimap'
import ShopPanel from './ShopPanel'

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

/** Convert camelCase node type to readable label: "OakTree" → "Oak Tree" */
function fmtNode(nodeType: string): string {
  return nodeType.replace(/([A-Z])/g, ' $1').trim()
}

interface HUDProps { engine: GameEngine | null }

export default function HUD({ engine }: HUDProps) {
  const {
    playerHP, playerMaxHP, playerEnergy, playerMaxEnergy,
    playerGold, currentBiome, fps,
    activePanel, togglePanel, notifications,
    interactPrompt, gatherProgress, gatherNodeType,
    playerATK, playerDEF, shopOpen,
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
          <div style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 6, marginBottom: 4 }}>
              <span style={{ color: RED }}>HP</span>
              <span style={{ fontSize: 5, color: SHADOW }}>{playerHP}/{playerMaxHP}</span>
            </div>
            <SegBar pct={hpPct} color={hpColor} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 6, marginBottom: 4 }}>
              <span style={{ color: BLUE }}>EN</span>
              <span style={{ fontSize: 5, color: SHADOW }}>{Math.floor(playerEnergy)}/{playerMaxEnergy}</span>
            </div>
            <SegBar pct={energyPct} color={BLUE} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 5 }}>
            <span>ATK <span style={{ color: YELLOW }}>{playerATK}</span></span>
            <span>DEF <span style={{ color: BLUE }}>{playerDEF}</span></span>
          </div>
        </div>

        {/* Gather progress — shows node name while active */}
        {gatherProgress !== null && (
          <div style={{ ...panel, padding: '6px 9px' }}>
            <div style={{ fontSize: 5, marginBottom: 4, color: GOLD }}>
              {gatherNodeType ? fmtNode(gatherNodeType).toUpperCase() : 'GATHERING'}...
            </div>
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

      {/* ── Right side: Window buttons (below minimap) ── */}
      <div
        className="pointer-events-auto absolute right-2 flex flex-col gap-1"
        style={{ top: 150 }}
      >
        {[
          { label: 'SKL', panel: 'skills',    hotkey: 'L' },
          { label: 'PET', panel: 'pets',      hotkey: 'P' },
          { label: 'INV', panel: 'inventory', hotkey: 'I' },
          { label: 'MAP', panel: 'map',       hotkey: 'M' },
        ].map(({ label, panel: p, hotkey }) => {
          const isActive = activePanel === p
          return (
            <button
              key={p}
              onClick={() => togglePanel(p as 'skills' | 'pets' | 'inventory' | 'map')}
              style={{
                ...panel,
                padding: '5px 7px',
                fontSize: 6,
                fontFamily: "'Press Start 2P', monospace",
                background: isActive ? BLACK : CREAM,
                color: isActive ? CREAM : BLACK,
                boxShadow: isActive ? 'none' : `2px 2px 0 ${BLACK}`,
                transform: isActive ? 'translate(1px,1px)' : 'none',
                cursor: 'pointer',
                textAlign: 'center',
                userSelect: 'none',
                lineHeight: 1,
                minWidth: 36,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <span>{label}</span>
              <span style={{ fontSize: 4, opacity: 0.6 }}>[{hotkey}]</span>
            </button>
          )
        })}
      </div>

      {/* ── Notifications (top-center, below HUD panels) ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col gap-1.5 items-center"
        style={{ top: 130, maxWidth: 240, zIndex: 10, pointerEvents: 'none' }}
      >
        {notifications.map(n => (
          <div
            key={n.id}
            className="animate-fade-in"
            style={{
              ...panel,
              padding: '5px 8px',
              fontSize: 6,
              lineHeight: '12px',
              borderLeft: `5px solid ${notifAccent(n.type)}`,
              whiteSpace: 'nowrap',
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* ── Interact Prompt (above mobile controls) ── */}
      {interactPrompt && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 265 }}>
          <div style={{ ...panel, padding: '6px 12px', fontSize: 6 }}>
            ▶ {interactPrompt}
          </div>
        </div>
      )}

      {/* ── Shop overlay ── */}
      {shopOpen && <ShopPanel engine={engine} />}

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

function SegBar({ pct, color }: { pct: number; color: string }) {
  const SEG = 16
  const filled = Math.round(pct * SEG)
  return (
    <div style={{ display: 'flex', gap: 1, height: 5 }}>
      {Array.from({ length: SEG }, (_, i) => (
        <div key={i} style={{ flex: 1, height: '100%', background: i < filled ? color : '#C8B888', border: `1px solid ${BLACK}` }} />
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
