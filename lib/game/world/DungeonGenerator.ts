import { DungeonData, DungeonRoom, DungeonCorridor } from '../data/types'
import { SeededRandom } from './noise'
import { CHUNK_SIZE } from './BiomeMap'

export type RoomType = DungeonRoom['type']

interface BSPNode {
  x: number; y: number; w: number; h: number
  left?: BSPNode; right?: BSPNode
  room?: DungeonRoom
}

const MIN_ROOM = 5
const MAX_ROOM = 12
const MIN_PARTITION = 10

/** Binary Space Partitioning dungeon generator */
export function generateDungeon(
  seed: number,
  tier: number,
): DungeonData {
  const rng = new SeededRandom(seed)

  // Dungeon occupies the chunk interior, leaving 1-tile border
  const area = { x: 1, y: 1, w: CHUNK_SIZE - 2, h: CHUNK_SIZE - 2 }
  const root: BSPNode = { ...area }

  // Split until rooms are small enough
  const maxSplits = 4 + tier
  splitNode(root, rng, 0, maxSplits)

  // Create rooms in leaf nodes
  const rooms: DungeonRoom[] = []
  createRooms(root, rng, rooms)

  if (rooms.length === 0) {
    // Fallback: single large room
    rooms.push({ x: 3, y: 3, w: CHUNK_SIZE - 6, h: CHUNK_SIZE - 6, type: 'normal' })
  }

  // Assign special room types
  assignRoomTypes(rooms, rng, tier)

  // Connect rooms with L-shaped corridors
  const corridors: DungeonCorridor[] = connectRooms(rooms, rng)

  return { rooms, corridors, tier }
}

function splitNode(node: BSPNode, rng: SeededRandom, depth: number, maxDepth: number): void {
  if (depth >= maxDepth) return
  if (node.w < MIN_PARTITION * 2 && node.h < MIN_PARTITION * 2) return

  // Choose split direction
  const canSplitH = node.h >= MIN_PARTITION * 2
  const canSplitV = node.w >= MIN_PARTITION * 2

  if (!canSplitH && !canSplitV) return

  const splitVertical = canSplitV && (!canSplitH || rng.next() > 0.5)

  if (splitVertical) {
    const splitX = node.x + MIN_PARTITION + rng.nextInt(0, node.w - MIN_PARTITION * 2)
    node.left  = { x: node.x, y: node.y, w: splitX - node.x, h: node.h }
    node.right = { x: splitX, y: node.y, w: node.x + node.w - splitX, h: node.h }
  } else {
    const splitY = node.y + MIN_PARTITION + rng.nextInt(0, node.h - MIN_PARTITION * 2)
    node.left  = { x: node.x, y: node.y, w: node.w, h: splitY - node.y }
    node.right = { x: node.x, y: splitY, w: node.w, h: node.y + node.h - splitY }
  }

  splitNode(node.left!, rng, depth + 1, maxDepth)
  splitNode(node.right!, rng, depth + 1, maxDepth)
}

function createRooms(node: BSPNode, rng: SeededRandom, rooms: DungeonRoom[]): void {
  if (!node.left && !node.right) {
    // Leaf node — create a room
    const maxW = Math.min(MAX_ROOM, node.w - 2)
    const maxH = Math.min(MAX_ROOM, node.h - 2)
    const minW = Math.min(MIN_ROOM, maxW)
    const minH = Math.min(MIN_ROOM, maxH)
    if (maxW < minW || maxH < minH) return

    const rw = rng.nextInt(minW, maxW)
    const rh = rng.nextInt(minH, maxH)
    const rx = node.x + rng.nextInt(1, node.w - rw - 1)
    const ry = node.y + rng.nextInt(1, node.h - rh - 1)

    node.room = { x: rx, y: ry, w: rw, h: rh, type: 'normal' }
    rooms.push(node.room)
    return
  }
  if (node.left) createRooms(node.left, rng, rooms)
  if (node.right) createRooms(node.right, rng, rooms)
}

function assignRoomTypes(rooms: DungeonRoom[], rng: SeededRandom, tier: number): void {
  if (rooms.length === 0) return

  // Entrance: closest to top-left
  rooms.sort((a, b) => (a.x + a.y) - (b.x + b.y))
  rooms[0].type = 'entrance'

  // Boss: furthest from entrance
  const entrance = rooms[0]
  rooms.sort((a, b) => {
    const da = Math.abs(a.x - entrance.x) + Math.abs(a.y - entrance.y)
    const db = Math.abs(b.x - entrance.x) + Math.abs(b.y - entrance.y)
    return db - da
  })
  // Find the first non-entrance room for boss
  for (const r of rooms) {
    if (r.type !== 'entrance') { r.type = 'boss'; break }
  }

  // Special rooms
  const remaining = rooms.filter(r => r.type === 'normal')

  // Treasure rooms (1–2 depending on tier)
  const treasureCount = Math.min(Math.floor(tier / 2) + 1, 2)
  for (let i = 0; i < treasureCount && i < remaining.length; i++) {
    remaining[i].type = 'treasure'
  }

  // Puzzle room (tier 2+)
  if (tier >= 2 && remaining.length > treasureCount) {
    remaining[treasureCount].type = 'puzzle'
  }

  // Pet Lair (1 per dungeon, tier 1+, 40% chance)
  if (rng.next() < 0.4) {
    const norms = rooms.filter(r => r.type === 'normal')
    if (norms.length > 0) {
      norms[rng.nextInt(0, norms.length - 1)].type = 'pet_lair'
    }
  }
}

function centerOf(room: DungeonRoom): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  }
}

function connectRooms(rooms: DungeonRoom[], rng: SeededRandom): DungeonCorridor[] {
  const corridors: DungeonCorridor[] = []
  if (rooms.length < 2) return corridors

  // Connect each room to the nearest unconnected room (Prim's-style MST)
  const connected = new Set<number>([0])
  while (connected.size < rooms.length) {
    let bestDist = Infinity
    let bestFrom = -1
    let bestTo = -1

    for (const fromIdx of connected) {
      const from = centerOf(rooms[fromIdx])
      for (let toIdx = 0; toIdx < rooms.length; toIdx++) {
        if (connected.has(toIdx)) continue
        const to = centerOf(rooms[toIdx])
        const dist = Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
        if (dist < bestDist) { bestDist = dist; bestFrom = fromIdx; bestTo = toIdx }
      }
    }

    if (bestFrom === -1) break

    const a = centerOf(rooms[bestFrom])
    const b = centerOf(rooms[bestTo])

    // L-shaped corridor: horizontal then vertical (or vice versa)
    if (rng.next() > 0.5) {
      corridors.push({ x1: a.x, y1: a.y, x2: b.x, y2: a.y })  // horizontal
      corridors.push({ x1: b.x, y1: a.y, x2: b.x, y2: b.y })  // vertical
    } else {
      corridors.push({ x1: a.x, y1: a.y, x2: a.x, y2: b.y })  // vertical
      corridors.push({ x1: a.x, y1: b.y, x2: b.x, y2: b.y })  // horizontal
    }

    connected.add(bestTo)
  }

  return corridors
}

/** Determine dungeon tier based on distance from world origin */
export function getDungeonTier(cx: number, cy: number): number {
  const dist = Math.sqrt(cx * cx + cy * cy) * 32  // tiles
  if (dist < 500) return 1
  if (dist < 1500) return 2
  return 3
}

/** Check if a tile is inside any room or corridor */
export function isDungeonFloor(
  dungeon: DungeonData,
  tx: number, ty: number
): boolean {
  for (const room of dungeon.rooms) {
    if (tx >= room.x && tx < room.x + room.w &&
        ty >= room.y && ty < room.y + room.h) return true
  }
  for (const c of dungeon.corridors) {
    const minX = Math.min(c.x1, c.x2)
    const maxX = Math.max(c.x1, c.x2)
    const minY = Math.min(c.y1, c.y2)
    const maxY = Math.max(c.y1, c.y2)
    if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) return true
  }
  return false
}
