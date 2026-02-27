'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { PetInstance, PetArchetype, PetTier } from '@/lib/game/data/types'
import { PET_DEFINITIONS, getPetXPForLevel } from '@/lib/game/data/pets'
import { ABILITIES } from '@/lib/game/data/abilities'
import { GameEngine } from '@/lib/game/GameEngine'

interface Props {
  engine: GameEngine | null
  onUpdate?: () => void
}

const TIER_COLORS: Record<PetTier, string> = {
  [PetTier.Common]:    'text-gray-400',
  [PetTier.Uncommon]:  'text-green-400',
  [PetTier.Rare]:      'text-blue-400',
  [PetTier.Elite]:     'text-purple-400',
  [PetTier.Legendary]: 'text-yellow-400',
}

const ARCHETYPE_ICONS: Record<PetArchetype, string> = {
  [PetArchetype.Vanguard]:  '🛡',
  [PetArchetype.Striker]:   '⚔',
  [PetArchetype.Sage]:      '✨',
  [PetArchetype.Warden]:    '💚',
  [PetArchetype.Trickster]: '🎭',
}

export default function PetPanel({ engine, onUpdate }: Props) {
  const { activePanel, setPanel } = useGameStore()
  const [selectedPet, setSelectedPet] = useState<string | null>(null)

  if (activePanel !== 'pets' || !engine) return null

  const allPets = engine.playerState.pets
  const activePets = engine.petSystem.activePets
  const maxActive = engine.petSystem.getMaxActivePets()
  const selected = allPets.find(p => p.instanceId === selectedPet)

  return (
    <div className="absolute inset-y-4 right-4 w-80 bg-game-bg border border-game-border rounded-lg overflow-hidden flex flex-col shadow-2xl font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-game-border bg-game-panel">
        <h2 className="text-game-text font-bold">🐾 Pets</h2>
        <span className="text-xs text-gray-500">
          Active: {activePets.length}/{maxActive}
        </span>
        <button onClick={() => setPanel(null)} className="text-gray-500 hover:text-white ml-2">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Active Slots */}
        <div className="p-3 border-b border-game-border">
          <h3 className="text-xs text-gray-500 mb-2">ACTIVE PARTY</h3>
          <div className="flex gap-2">
            {Array.from({ length: maxActive }).map((_, slot) => {
              const pet = activePets.find(p => p.activeSlot === slot)
              return (
                <div
                  key={slot}
                  className={`flex-1 h-14 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                    pet ? 'border-game-accent bg-game-accent/10' : 'border-dashed border-game-border hover:border-gray-500'
                  }`}
                  onClick={() => pet ? setSelectedPet(pet.instanceId) : null}
                >
                  {pet ? (
                    <div className="text-center">
                      <div className="text-base">{getArchetypeIcon(pet.definitionId)}</div>
                      <div className="text-[9px] text-gray-400">{pet.name.slice(0, 8)}</div>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">Slot {slot + 1}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Pet List */}
        <div className="p-3">
          <h3 className="text-xs text-gray-500 mb-2">ALL PETS ({allPets.length})</h3>
          {allPets.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-4">No pets yet. Explore to find creatures!</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {allPets.map(pet => (
                <PetCard
                  key={pet.instanceId}
                  pet={pet}
                  isSelected={selectedPet === pet.instanceId}
                  onClick={() => setSelectedPet(s => s === pet.instanceId ? null : pet.instanceId)}
                  onActivate={(slot) => {
                    engine.petSystem.activatePet(pet.instanceId, slot)
                    onUpdate?.()
                  }}
                  onDeactivate={() => {
                    engine.petSystem.deactivatePet(pet.instanceId)
                    onUpdate?.()
                  }}
                  maxSlots={maxActive}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selected Pet Details */}
        {selected && (
          <PetDetailView
            pet={selected}
            engine={engine}
            onEvolve={() => {
              engine.petSystem.evolvePet(selected.instanceId)
              onUpdate?.()
            }}
          />
        )}
      </div>
    </div>
  )
}

function PetCard({
  pet, isSelected, onClick, onActivate, onDeactivate, maxSlots,
}: {
  pet: PetInstance
  isSelected: boolean
  onClick: () => void
  onActivate: (slot: number) => void
  onDeactivate: () => void
  maxSlots: number
}) {
  const def = PET_DEFINITIONS[pet.definitionId]
  const xpNeeded = getPetXPForLevel(pet.level + 1)
  const xpPct = pet.level >= 99 ? 100 : Math.min(100, (pet.xp / xpNeeded) * 100)

  return (
    <div
      className={`rounded border cursor-pointer transition-all ${
        isSelected ? 'border-game-accent bg-game-accent/10' : 'border-game-border hover:border-gray-600 bg-game-panel'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 p-2">
        {/* Color dot */}
        <div
          className="w-8 h-8 rounded flex items-center justify-center text-sm flex-shrink-0"
          style={{ backgroundColor: def?.color ?? '#888' }}
        >
          {ARCHETYPE_ICONS[def?.archetype ?? PetArchetype.Striker]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-game-text truncate">{pet.name}</span>
            <span className={`text-[9px] ${TIER_COLORS[def?.tier ?? PetTier.Common]}`}>
              {def?.tier}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-500">
            <span>Lv.{pet.level}</span>
            <span>Bond: {pet.bond.toFixed(0)}%</span>
            <span>{def?.element}</span>
          </div>
          {/* XP bar */}
          <div className="h-0.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-game-xp rounded-full" style={{ width: `${xpPct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {pet.isActive ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDeactivate() }}
              className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-800 hover:bg-red-800"
            >
              Remove
            </button>
          ) : (
            <select
              className="text-[9px] px-1 py-0.5 rounded bg-game-panel text-game-text border border-game-border"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const slot = parseInt(e.target.value)
                if (!isNaN(slot)) onActivate(slot)
                e.target.value = ''
              }}
              defaultValue=""
            >
              <option value="" disabled>+Add</option>
              {Array.from({ length: maxSlots }).map((_, i) => (
                <option key={i} value={i}>Slot {i + 1}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats when selected */}
      {isSelected && (
        <div className="px-2 pb-2">
          <div className="grid grid-cols-3 gap-1 text-[9px] text-gray-400">
            <StatBadge label="HP" value={`${pet.stats.hp}/${pet.stats.maxHp}`} color="text-red-400" />
            <StatBadge label="ATK" value={pet.stats.atk} color="text-orange-400" />
            <StatBadge label="DEF" value={pet.stats.def} color="text-blue-400" />
            <StatBadge label="MATK" value={pet.stats.matk} color="text-purple-400" />
            <StatBadge label="MDEF" value={pet.stats.mdef} color="text-indigo-400" />
            <StatBadge label="SPD" value={pet.stats.spd} color="text-yellow-400" />
          </div>
        </div>
      )}
    </div>
  )
}

function PetDetailView({
  pet, engine, onEvolve,
}: {
  pet: PetInstance; engine: GameEngine; onEvolve: () => void
}) {
  const def = PET_DEFINITIONS[pet.definitionId]
  if (!def) return null

  const canEvolve = def.evolution && pet.level >= def.evolution.requiredLevel
  const bondAbility = def.abilities.find(a => a.isBondAbility)

  return (
    <div className="p-3 border-t border-game-border">
      <h3 className="text-xs font-bold text-game-text mb-2">Abilities</h3>
      <div className="flex flex-col gap-1 mb-3">
        {def.abilities
          .filter(a => pet.learnedAbilities.includes(a.id))
          .map(ability => (
            <div key={ability.id} className="flex items-start gap-2 text-[10px]">
              <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                ability.isBondAbility ? 'bg-yellow-400' : ability.isPassive ? 'bg-gray-500' : 'bg-game-accent'
              }`} />
              <div>
                <span className="text-game-text font-medium">{ability.name}</span>
                <span className="text-gray-500 ml-1">
                  {ability.isBondAbility ? '(Bond)' : ability.isPassive ? '(Passive)' : `CD:${ability.cooldown}s`}
                </span>
                <div className="text-gray-500">{ability.description}</div>
              </div>
            </div>
          ))
        }
        {bondAbility && !pet.learnedAbilities.includes(bondAbility.id) && (
          <div className="text-[10px] text-gray-600 italic">
            🔒 {bondAbility.name} — unlocks at bond 75
          </div>
        )}
      </div>

      {canEvolve && (
        <button
          onClick={onEvolve}
          className="w-full py-1.5 rounded bg-yellow-900/60 border border-yellow-600 text-yellow-300 text-xs font-bold hover:bg-yellow-800 transition-colors"
        >
          ✨ Evolve to {PET_DEFINITIONS[def.evolution!.targetDefinitionId]?.name}
        </button>
      )}
      {def.evolution && !canEvolve && (
        <div className="text-[9px] text-gray-600">
          Evolution: Level {def.evolution.requiredLevel} required
          {def.evolution.requiredItemId && ` + ${def.evolution.requiredItemId.replace(/_/g, ' ')}`}
        </div>
      )}
    </div>
  )
}

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-black/30 rounded px-1 py-0.5 text-center">
      <div className="text-gray-600">{label}</div>
      <div className={`font-bold ${color}`}>{value}</div>
    </div>
  )
}

function getArchetypeIcon(defId: string): string {
  const def = PET_DEFINITIONS[defId]
  return ARCHETYPE_ICONS[def?.archetype ?? PetArchetype.Striker]
}
