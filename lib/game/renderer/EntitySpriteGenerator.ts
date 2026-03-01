import * as THREE from 'three'
import { Element } from '../data/types'

/**
 * Procedural pixel-art sprite generator for mobs, pets, and NPCs.
 * Generates 2-frame animation strips as canvas textures (32×16 for mobs/pets, 32×24 for NPCs).
 * All sprites are cached by id — one texture per entity type, shared across instances.
 */

const FRAME = 16  // single frame width/height for mobs and pets
const NPC_H = 24  // NPC frame height

// Texture cache: one per mob/pet/NPC type
const mobCache  = new Map<string, THREE.CanvasTexture>()
const petCache  = new Map<string, THREE.CanvasTexture>()
const npcCache  = new Map<string, THREE.CanvasTexture>()

// ─── Color helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff]
}

function rgbStr(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`
}

function darken(hex: number, amt = 0.35): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbStr(Math.round(r * (1 - amt)), Math.round(g * (1 - amt)), Math.round(b * (1 - amt)))
}

function lighten(hex: number, amt = 0.35): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbStr(
    Math.min(255, Math.round(r + (255 - r) * amt)),
    Math.min(255, Math.round(g + (255 - g) * amt)),
    Math.min(255, Math.round(b + (255 - b) * amt)),
  )
}

function hexStr(hex: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbStr(r, g, b)
}

const ELEMENT_ACCENT: Partial<Record<Element, string>> = {
  [Element.Fire]:      '#ff6020',
  [Element.Water]:     '#40a0ff',
  [Element.Earth]:     '#80b040',
  [Element.Lightning]: '#f0e020',
  [Element.Wind]:      '#80e0c0',
  [Element.Shadow]:    '#9040d0',
  [Element.Light]:     '#f0e080',
  [Element.Arcane]:    '#c060f0',
}

// ─── Body shape detection ───────────────────────────────────────────────────

type BodyShape = 'slime' | 'quad' | 'orb' | 'crawler' | 'bird' | 'wyrm' | 'golem' | 'fawn' | 'round'

function detectShape(mobId: string): BodyShape {
  const id = mobId.toLowerCase()
  if (id.includes('slime'))                                       return 'slime'
  if (id.includes('wolf') || id.includes('boar') || id.includes('bear') ||
      id.includes('panther') || id.includes('beast') || id.includes('fang'))
                                                                  return 'quad'
  if (id.includes('sprite') || id.includes('wisp') || id.includes('imp') ||
      id.includes('wraith'))                                      return 'orb'
  if (id.includes('crawler') || id.includes('scorpion') || id.includes('kraken'))
                                                                  return 'crawler'
  if (id.includes('bird') || id.includes('hawk') || id.includes('eagle') ||
      id.includes('thunderbird') || id.includes('roc'))           return 'bird'
  if (id.includes('wyrm') || id.includes('dragon') || id.includes('drake') ||
      id.includes('leviathan'))                                   return 'wyrm'
  if (id.includes('golem') || id.includes('giant') || id.includes('colossus') ||
      id.includes('titan'))                                       return 'golem'
  if (id.includes('fawn') || id.includes('grazer') || id.includes('ember'))
                                                                  return 'fawn'
  return 'round'
}

// ─── Shape drawers ──────────────────────────────────────────────────────────
// Each draws a single frame at (ox, oy) with the given bob offset.
// Canvas is 16px wide per frame. All coordinates are pixel-level.

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, 1, 1)
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function drawSlime(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.5)
  const d = darken(body)
  const o = darken(body, 0.15)
  // Body dome
  rect(ctx, ox + 4, y + 6, 8, 5, b)
  rect(ctx, ox + 3, y + 7, 10, 4, b)
  rect(ctx, ox + 5, y + 5, 6, 1, b)
  // Highlight
  px(ctx, ox + 5, y + 7, h)
  px(ctx, ox + 6, y + 6, h)
  // Shadow bottom
  rect(ctx, ox + 4, y + 11, 8, 1, d)
  // Outline
  rect(ctx, ox + 5, y + 4, 6, 1, o)
  px(ctx, ox + 3, y + 6, o)
  px(ctx, ox + 12, y + 6, o)
  // Eyes
  px(ctx, ox + 6, y + 8, '#ffffff')
  px(ctx, ox + 9, y + 8, '#ffffff')
  px(ctx, ox + 7, y + 8, '#000000')
  px(ctx, ox + 10, y + 8, '#000000')
  // Element accent
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 8, y + 5, ea) }
}

function drawQuad(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.4)
  const d = darken(body)
  const a = hexStr(accent)
  // Body
  rect(ctx, ox + 4, y + 5, 8, 5, b)
  rect(ctx, ox + 3, y + 6, 10, 3, b)
  // Head
  rect(ctx, ox + 9, y + 3, 4, 4, b)
  rect(ctx, ox + 10, y + 2, 3, 1, b)
  // Legs (4)
  rect(ctx, ox + 4, y + 10, 2, 3, d)
  rect(ctx, ox + 10, y + 10, 2, 3, d)
  // Highlight
  px(ctx, ox + 5, y + 6, h)
  px(ctx, ox + 11, y + 3, h)
  // Tail
  px(ctx, ox + 3, y + 5, a)
  px(ctx, ox + 2, y + 4, a)
  // Eyes
  px(ctx, ox + 11, y + 3, '#ffffff')
  px(ctx, ox + 12, y + 3, '#000000')
  // Ear
  px(ctx, ox + 10, y + 1, a)
  // Element accent
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 13, y + 2, ea) }
}

function drawOrb(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.5)
  const g = lighten(body, 0.7)
  const d = darken(body, 0.2)
  // Main orb
  rect(ctx, ox + 5, y + 4, 6, 6, b)
  rect(ctx, ox + 4, y + 5, 8, 4, b)
  rect(ctx, ox + 6, y + 3, 4, 1, b)
  rect(ctx, ox + 6, y + 10, 4, 1, b)
  // Glow highlight
  px(ctx, ox + 6, y + 5, h)
  px(ctx, ox + 7, y + 4, g)
  // Trail particles below
  px(ctx, ox + 6, y + 12, d)
  px(ctx, ox + 8, y + 13, d)
  px(ctx, ox + 5, y + 14, d)
  // Eyes
  px(ctx, ox + 6, y + 6, '#ffffff')
  px(ctx, ox + 9, y + 6, '#ffffff')
  px(ctx, ox + 7, y + 7, '#000000')
  px(ctx, ox + 10, y + 7, '#000000')
  // Element accent
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 8, y + 3, ea); px(ctx, ox + 10, y + 11, ea) }
}

function drawCrawler(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.35)
  const d = darken(body)
  const a = hexStr(accent)
  // Wide low body
  rect(ctx, ox + 2, y + 8, 12, 3, b)
  rect(ctx, ox + 3, y + 7, 10, 1, b)
  // Legs (6)
  for (let i = 0; i < 6; i++) {
    px(ctx, ox + 2 + i * 2, y + 11, d)
    px(ctx, ox + 2 + i * 2, y + 12, d)
  }
  // Head front
  rect(ctx, ox + 12, y + 7, 2, 3, a)
  // Highlight
  px(ctx, ox + 4, y + 8, h)
  // Eyes
  px(ctx, ox + 13, y + 7, '#ffffff')
  px(ctx, ox + 13, y + 8, '#000000')
  // Element accent
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 1, y + 8, ea) }
}

function drawBird(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.4)
  const d = darken(body)
  const a = hexStr(accent)
  // Body center
  rect(ctx, ox + 5, y + 5, 6, 4, b)
  rect(ctx, ox + 6, y + 4, 4, 1, b)
  // Wings
  rect(ctx, ox + 2, y + 4, 3, 3, a)
  rect(ctx, ox + 11, y + 4, 3, 3, a)
  px(ctx, ox + 1, y + 3, a)
  px(ctx, ox + 14, y + 3, a)
  // Tail
  rect(ctx, ox + 5, y + 9, 2, 2, d)
  px(ctx, ox + 4, y + 10, d)
  // Head
  rect(ctx, ox + 8, y + 2, 3, 3, b)
  // Beak
  px(ctx, ox + 11, y + 3, a)
  // Highlight
  px(ctx, ox + 7, y + 5, h)
  // Eye
  px(ctx, ox + 9, y + 3, '#ffffff')
  px(ctx, ox + 10, y + 3, '#000000')
  // Element
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 1, y + 2, ea); px(ctx, ox + 14, y + 2, ea) }
}

function drawWyrm(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.4)
  const d = darken(body)
  const a = hexStr(accent)
  // Serpentine body
  rect(ctx, ox + 2, y + 7, 3, 3, b)
  rect(ctx, ox + 5, y + 6, 3, 3, b)
  rect(ctx, ox + 8, y + 5, 3, 3, b)
  // Head
  rect(ctx, ox + 10, y + 3, 4, 4, b)
  rect(ctx, ox + 11, y + 2, 3, 2, b)
  // Snout
  px(ctx, ox + 14, y + 3, a)
  px(ctx, ox + 14, y + 4, a)
  // Tail tip
  px(ctx, ox + 1, y + 8, d)
  px(ctx, ox + 0, y + 9, d)
  // Small wing stubs
  px(ctx, ox + 9, y + 3, a)
  px(ctx, ox + 10, y + 2, a)
  // Belly highlight
  rect(ctx, ox + 3, y + 9, 2, 1, h)
  rect(ctx, ox + 6, y + 8, 2, 1, h)
  // Eye
  px(ctx, ox + 12, y + 3, '#ffffff')
  px(ctx, ox + 13, y + 3, '#000000')
  // Horn
  px(ctx, ox + 12, y + 1, a)
  // Element
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 14, y + 5, ea) }
}

function drawGolem(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.3)
  const d = darken(body)
  const a = hexStr(accent)
  // Stocky body
  rect(ctx, ox + 4, y + 4, 8, 7, b)
  rect(ctx, ox + 3, y + 5, 10, 5, b)
  // Head
  rect(ctx, ox + 5, y + 2, 6, 3, b)
  rect(ctx, ox + 6, y + 1, 4, 1, a)
  // Arms
  rect(ctx, ox + 2, y + 5, 2, 5, d)
  rect(ctx, ox + 12, y + 5, 2, 5, d)
  // Legs
  rect(ctx, ox + 5, y + 11, 2, 3, d)
  rect(ctx, ox + 9, y + 11, 2, 3, d)
  // Highlight
  px(ctx, ox + 5, y + 5, h)
  px(ctx, ox + 6, y + 3, h)
  // Eyes
  px(ctx, ox + 6, y + 3, '#ffffff')
  px(ctx, ox + 9, y + 3, '#ffffff')
  px(ctx, ox + 7, y + 3, '#000000')
  px(ctx, ox + 10, y + 3, '#000000')
  // Element
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 8, y + 1, ea) }
}

function drawFawn(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.4)
  const d = darken(body)
  const a = hexStr(accent)
  // Gentle body
  rect(ctx, ox + 4, y + 6, 7, 4, b)
  rect(ctx, ox + 3, y + 7, 9, 2, b)
  // Head (front, small)
  rect(ctx, ox + 10, y + 3, 3, 4, b)
  px(ctx, ox + 11, y + 2, b)
  // Thin legs
  rect(ctx, ox + 4, y + 10, 1, 4, d)
  rect(ctx, ox + 6, y + 10, 1, 4, d)
  rect(ctx, ox + 9, y + 10, 1, 4, d)
  rect(ctx, ox + 11, y + 10, 1, 4, d)
  // Spots / highlight
  px(ctx, ox + 5, y + 7, h)
  px(ctx, ox + 7, y + 8, h)
  // Tail
  px(ctx, ox + 3, y + 6, a)
  // Ear
  px(ctx, ox + 11, y + 1, a)
  // Eye
  px(ctx, ox + 11, y + 4, '#ffffff')
  px(ctx, ox + 12, y + 4, '#000000')
  // Element
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 13, y + 3, ea) }
}

function drawRound(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  body: number, accent: number, elem: Element) {
  const y = oy + bob
  const b = hexStr(body)
  const h = lighten(body, 0.45)
  const d = darken(body)
  // Round body
  rect(ctx, ox + 4, y + 5, 8, 6, b)
  rect(ctx, ox + 3, y + 6, 10, 4, b)
  rect(ctx, ox + 5, y + 4, 6, 1, b)
  rect(ctx, ox + 5, y + 11, 6, 1, b)
  // Highlight
  px(ctx, ox + 5, y + 6, h)
  px(ctx, ox + 6, y + 5, h)
  // Shadow
  rect(ctx, ox + 5, y + 11, 6, 1, d)
  // Eyes
  px(ctx, ox + 6, y + 7, '#ffffff')
  px(ctx, ox + 9, y + 7, '#ffffff')
  px(ctx, ox + 7, y + 7, '#000000')
  px(ctx, ox + 10, y + 7, '#000000')
  // Element accent
  const ea = ELEMENT_ACCENT[elem]
  if (ea) { px(ctx, ox + 8, y + 4, ea) }
}

const SHAPE_DRAWERS: Record<BodyShape, typeof drawSlime> = {
  slime: drawSlime,
  quad: drawQuad,
  orb: drawOrb,
  crawler: drawCrawler,
  bird: drawBird,
  wyrm: drawWyrm,
  golem: drawGolem,
  fawn: drawFawn,
  round: drawRound,
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getMobTexture(
  mobId: string, color: number, accentColor: number, element: Element
): THREE.CanvasTexture {
  const cached = mobCache.get(mobId)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = FRAME * 2
  canvas.height = FRAME
  const ctx = canvas.getContext('2d')!

  const shape = detectShape(mobId)
  const draw = SHAPE_DRAWERS[shape]

  // Frame 0: normal
  draw(ctx, 0, 0, 0, color, accentColor, element)
  // Frame 1: bob up 1px
  draw(ctx, FRAME, 0, -1, color, accentColor, element)

  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  // Set up for 2-frame strip: show frame 0 by default
  tex.repeat.set(0.5, 1)
  tex.offset.set(0, 0)
  mobCache.set(mobId, tex)
  return tex
}

export function getPetTexture(
  defId: string, colorHex: string, element: Element
): THREE.CanvasTexture {
  const cached = petCache.get(defId)
  if (cached) return cached

  // Parse hex color string to number
  const colorNum = parseInt(colorHex.replace('#', ''), 16)
  const accentNum = lightenHex(colorNum, 0.3)

  const canvas = document.createElement('canvas')
  canvas.width = FRAME * 2
  canvas.height = FRAME
  const ctx = canvas.getContext('2d')!

  const shape = detectShape(defId)
  const draw = SHAPE_DRAWERS[shape]

  // Frame 0: squash (normal, slightly wider appearance from base draw)
  draw(ctx, 0, 0, 1, colorNum, accentNum, element)
  // Frame 1: stretch (bob up 2px for a bouncy feel)
  draw(ctx, FRAME, 0, -1, colorNum, accentNum, element)

  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.repeat.set(0.5, 1)
  tex.offset.set(0, 0)
  petCache.set(defId, tex)
  return tex
}

export function getNPCTexture(
  npcId: string, color: number, accentColor: number
): THREE.CanvasTexture {
  const cached = npcCache.get(npcId)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = FRAME * 2
  canvas.height = NPC_H
  const ctx = canvas.getContext('2d')!

  // Draw 2 frames of a humanoid figure
  drawHumanoid(ctx, 0, 0, 0, color, accentColor, npcId)
  drawHumanoid(ctx, FRAME, 0, -1, color, accentColor, npcId)

  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.repeat.set(0.5, 1)
  tex.offset.set(0, 0)
  npcCache.set(npcId, tex)
  return tex
}

// ─── NPC humanoid drawer ────────────────────────────────────────────────────

function drawHumanoid(ctx: CanvasRenderingContext2D, ox: number, oy: number, bob: number,
  color: number, accent: number, npcId: string) {
  const y = oy + bob
  const b = hexStr(color)
  const h = lighten(color, 0.4)
  const d = darken(color)
  const a = hexStr(accent)
  const skin = '#e8c8a0'

  // Legs
  rect(ctx, ox + 5, y + 17, 2, 5, d)
  rect(ctx, ox + 9, y + 17, 2, 5, d)
  // Body / tunic
  rect(ctx, ox + 4, y + 9, 8, 9, b)
  rect(ctx, ox + 3, y + 10, 10, 7, b)
  // Belt
  rect(ctx, ox + 4, y + 14, 8, 1, a)
  // Arms
  rect(ctx, ox + 2, y + 10, 2, 6, b)
  rect(ctx, ox + 12, y + 10, 2, 6, b)
  // Hands
  px(ctx, ox + 2, y + 16, skin)
  px(ctx, ox + 13, y + 16, skin)
  // Head
  rect(ctx, ox + 5, y + 3, 6, 6, skin)
  rect(ctx, ox + 6, y + 2, 4, 1, skin)
  // Hair
  rect(ctx, ox + 5, y + 2, 6, 2, d)
  rect(ctx, ox + 6, y + 1, 4, 1, d)
  // Eyes
  px(ctx, ox + 6, y + 5, '#000000')
  px(ctx, ox + 9, y + 5, '#000000')
  // Mouth
  px(ctx, ox + 7, y + 7, darken(0xe8c8a0, 0.15))
  // Highlight on tunic
  px(ctx, ox + 5, y + 11, h)
  px(ctx, ox + 6, y + 10, h)

  // NPC-specific headgear/accessory
  if (npcId.includes('blacksmith') || npcId.includes('forgemaster')) {
    // Hammer held in right hand
    rect(ctx, ox + 13, y + 12, 2, 1, '#888888')
    rect(ctx, ox + 14, y + 10, 1, 3, '#664422')
  } else if (npcId.includes('wizard') || npcId.includes('archmage') || npcId.includes('thalos')) {
    // Pointed hat
    rect(ctx, ox + 4, y + 1, 8, 2, a)
    rect(ctx, ox + 6, y + 0, 4, 1, a)
    px(ctx, ox + 7, y - 1, a)
    px(ctx, ox + 8, y - 1, a)
  } else if (npcId.includes('ranger') || npcId.includes('elara')) {
    // Hood
    rect(ctx, ox + 4, y + 1, 8, 3, '#2a5020')
    rect(ctx, ox + 5, y + 0, 6, 1, '#2a5020')
  } else if (npcId.includes('fisherman') || npcId.includes('cedric')) {
    // Fishing hat (wide brim)
    rect(ctx, ox + 3, y + 1, 10, 1, '#8a7050')
    rect(ctx, ox + 5, y + 0, 6, 1, '#8a7050')
  } else if (npcId.includes('hermit') || npcId.includes('mira')) {
    // Hooded cloak
    rect(ctx, ox + 4, y + 1, 8, 2, '#4a2870')
    rect(ctx, ox + 5, y + 0, 6, 1, '#4a2870')
    px(ctx, ox + 3, y + 3, '#4a2870')
    px(ctx, ox + 12, y + 3, '#4a2870')
  } else if (npcId.includes('shopkeeper') || npcId.includes('merchant') || npcId.includes('harlow')) {
    // Merchant hat
    rect(ctx, ox + 4, y + 1, 8, 1, '#c0a040')
    rect(ctx, ox + 5, y + 0, 6, 1, '#c0a040')
  }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function lightenHex(hex: number, amt: number): number {
  const [r, g, b] = hexToRgb(hex)
  return (
    (Math.min(255, Math.round(r + (255 - r) * amt)) << 16) |
    (Math.min(255, Math.round(g + (255 - g) * amt)) << 8) |
    Math.min(255, Math.round(b + (255 - b) * amt))
  )
}
