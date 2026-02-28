/**
 * gameDB — save/load helpers for InstantDB.
 * All DB operations go through these functions so game engine
 * stays decoupled from the database layer.
 */

import { db } from './instant'
import { PlayerState, PetInstance, ChunkState, SkillType } from '../game/data/types'
import { createAllSkills } from '../game/data/skills'

const SAVE_DEBOUNCE_MS = 5000  // auto-save at most every 5 seconds

// ─── Player ID ───────────────────────────────────────────────────────────────

const PLAYER_ID_KEY = 'wildborne_player_id'

export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

// ─── Player ───────────────────────────────────────────────────────────────────

export function createDefaultPlayer(id: string): PlayerState {
  return {
    id,
    name: 'Adventurer',
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    energy: 100,
    maxEnergy: 100,
    gold: 0,
    skills: createAllSkills(),
    inventory: [
      { itemId: 'hp_potion_s', quantity: 5, slotIndex: 0 },
      { itemId: 'taming_snare', quantity: 3, slotIndex: 1 },
    ],
    equipment: { weapon: null, offhand: null, body: null },
    pets: [],
    worldSeed: Math.floor(Math.random() * 0xffffffff),
    playtime: 0,
    discoveredPOIs: [],
    completedQuests: [],
    activeQuests: [],
    currentDungeon: null,
    playerStatusEffects: [],
    equippedSpellIndex: 0,
    combatStyle: 'melee',
    comboHitCount: 0,
    lastComboTime: 0,
  }
}

export async function savePlayer(player: PlayerState): Promise<void> {
  try {
    await db.transact([
      db.tx.players[player.id].update({
        username:        player.name,
        x:               player.x,
        y:               player.y,
        hp:              player.hp,
        maxHp:           player.maxHp,
        energy:          player.energy,
        maxEnergy:       player.maxEnergy,
        gold:            player.gold,
        worldSeed:       player.worldSeed,
        playtime:        player.playtime,
        skills:          player.skills as unknown as Record<string, unknown>,
        inventory:       player.inventory as unknown as Record<string, unknown>[],
        equipment:       player.equipment as unknown as Record<string, unknown>,
        discoveredPOIs:  player.discoveredPOIs as unknown as Record<string, unknown>[],
        completedQuests: player.completedQuests as unknown as Record<string, unknown>[],
        activeQuests:    player.activeQuests as unknown as Record<string, unknown>[],
        combatStyle:     player.combatStyle,
        equippedSpellIndex: player.equippedSpellIndex,
        lastSaved:       Date.now(),
      }),
    ])
  } catch (e) {
    console.error('savePlayer failed:', e)
  }
}

export async function loadPlayer(playerId: string): Promise<PlayerState | null> {
  try {
    const result = await db.queryOnce({
      players: {
        $: { where: { id: playerId } },
        pets: {},
      },
    })

    const players = result.data?.players
    if (!players || players.length === 0) return null

    const p = players[0] as Record<string, unknown>
    return {
      id: playerId,
      name:            (p.username as string) ?? 'Adventurer',
      x:               (p.x as number) ?? 0,
      y:               (p.y as number) ?? 0,
      hp:              (p.hp as number) ?? 100,
      maxHp:           (p.maxHp as number) ?? 100,
      energy:          (p.energy as number) ?? 100,
      maxEnergy:       (p.maxEnergy as number) ?? 100,
      gold:            (p.gold as number) ?? 0,
      worldSeed:       (p.worldSeed as number) ?? Math.floor(Math.random() * 0xffffffff),
      playtime:        (p.playtime as number) ?? 0,
      skills:          (p.skills as PlayerState['skills']) ?? createAllSkills(),
      inventory:       (p.inventory as PlayerState['inventory']) ?? [],
      equipment:       (p.equipment as PlayerState['equipment']) ?? { weapon: null, offhand: null, body: null },
      pets:            [],  // loaded separately
      discoveredPOIs:  (p.discoveredPOIs as string[]) ?? [],
      completedQuests: (p.completedQuests as string[]) ?? [],
      activeQuests:    (p.activeQuests as PlayerState['activeQuests']) ?? [],
      currentDungeon:  null,
      playerStatusEffects: [],
      equippedSpellIndex: (p.equippedSpellIndex as number) ?? 0,
      combatStyle:     (p.combatStyle as PlayerState['combatStyle']) ?? 'melee',
      comboHitCount:   0,
      lastComboTime:   0,
    }
  } catch (e) {
    console.error('loadPlayer failed:', e)
    return null
  }
}

// ─── Pets ─────────────────────────────────────────────────────────────────────

export async function savePets(playerId: string, pets: PetInstance[]): Promise<void> {
  try {
    const txns = pets.map(pet =>
      db.tx.pets[pet.instanceId].update({
        playerId,
        instanceId:       pet.instanceId,
        definitionId:     pet.definitionId,
        name:             pet.name,
        level:            pet.level,
        xp:               pet.xp,
        bond:             pet.bond,
        stats:            pet.stats as unknown as Record<string, unknown>,
        activeAbilities:  pet.activeAbilities as unknown as Record<string, unknown>[],
        learnedAbilities: pet.learnedAbilities as unknown as Record<string, unknown>[],
        isActive:         pet.isActive,
        activeSlot:       pet.activeSlot,
        statusEffects:    pet.statusEffects as unknown as Record<string, unknown>[],
      })
    )
    if (txns.length > 0) await db.transact(txns)
  } catch (e) {
    console.error('savePets failed:', e)
  }
}

export async function loadPets(playerId: string): Promise<PetInstance[]> {
  try {
    const result = await db.queryOnce({
      pets: { $: { where: { playerId } } },
    })
    const rawPets = result.data?.pets as Record<string, unknown>[] ?? []
    return rawPets.map(p => ({
      instanceId:       (p.instanceId as string),
      definitionId:     (p.definitionId as string),
      name:             (p.name as string),
      level:            (p.level as number) ?? 1,
      xp:               (p.xp as number) ?? 0,
      bond:             (p.bond as number) ?? 0,
      stats:            (p.stats as PetInstance['stats']),
      activeAbilities:  (p.activeAbilities as string[]) ?? [],
      learnedAbilities: (p.learnedAbilities as string[]) ?? [],
      isActive:         (p.isActive as boolean) ?? false,
      activeSlot:       (p.activeSlot as number) ?? -1,
      statusEffects:    (p.statusEffects as PetInstance['statusEffects']) ?? [],
    }))
  } catch (e) {
    console.error('loadPets failed:', e)
    return []
  }
}

// ─── Chunks ───────────────────────────────────────────────────────────────────

export async function saveChunks(playerId: string, chunks: ChunkState[]): Promise<void> {
  try {
    const txns = chunks.map(chunk => {
      const key = `${chunk.cx}_${chunk.cy}`
      const docId = `${playerId}_${key}`
      return db.tx.worldChunks[docId].update({
        playerId,
        chunkKey:      key,
        resourceNodes: chunk.resourceNodes as unknown as Record<string, unknown>[],
        modifiedAt:    Date.now(),
      })
    })
    if (txns.length > 0) await db.transact(txns)
  } catch (e) {
    console.error('saveChunks failed:', e)
  }
}

export async function loadChunks(
  playerId: string,
  chunkKeys: string[]
): Promise<Record<string, ChunkState['resourceNodes']>> {
  try {
    const result = await db.queryOnce({
      worldChunks: {
        $: { where: { playerId } },
      },
    })
    const raw = result.data?.worldChunks as Record<string, unknown>[] ?? []
    const map: Record<string, ChunkState['resourceNodes']> = {}
    for (const c of raw) {
      const key = c.chunkKey as string
      if (chunkKeys.includes(key)) {
        map[key] = c.resourceNodes as ChunkState['resourceNodes']
      }
    }
    return map
  } catch (e) {
    console.error('loadChunks failed:', e)
    return {}
  }
}

// ─── Debounced auto-save ──────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleSave(
  player: PlayerState,
  pets: PetInstance[],
  dirtyChunks: ChunkState[]
): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    await Promise.all([
      savePlayer(player),
      savePets(player.id, pets),
      dirtyChunks.length > 0 ? saveChunks(player.id, dirtyChunks) : Promise.resolve(),
    ])
  }, SAVE_DEBOUNCE_MS)
}
