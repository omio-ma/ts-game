import { JOYSTICK_RADIUS, type Joystick } from './input'
import type { GameMap, Tile } from './map'
import type { Pilot } from './movement'
import { drawPilot, drawStaminaBar, type Anim } from './pilot'

/** Size of one tile on screen, in CSS px. */
export const TILE = 32

const GROUND: Record<Tile, string> = {
  sand: '#dfa166',
  dune: '#eec491',
  hardpan: '#c4744a',
  dust: '#d6957f',
  scorch: '#c98a58',
  rock: '#dfa166',
  crystal: '#d6957f',
  ship: '#c98a58',
}
const OUTSIDE = '#5a2e22'
/** Her feet are a little below the centre of her collision box, in tiles. */
const FEET_OFFSET = 0.15

/** A stable pseudo-random number in 0..1 for each tile, for small variations. */
function hash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 2147483647, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Lighten (amount > 0) or darken (< 0) a #rrggbb colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift: number) => {
    const v = (n >> shift) & 255
    return Math.round(amount > 0 ? v + (255 - v) * amount : v * (1 + amount))
  }
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

function drawGround(ctx: CanvasRenderingContext2D, tile: Tile, x: number, y: number, px: number, py: number) {
  ctx.fillStyle = shade(GROUND[tile], (hash(x, y) - 0.5) * 0.05)
  ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5)
  // A few grains or cracks so flat ground isn't flat colour.
  const specks = Math.floor(hash(x, y, 1) * 3)
  ctx.fillStyle = tile === 'dune' ? 'rgba(255, 240, 210, 0.45)' : 'rgba(90, 40, 20, 0.18)'
  for (let i = 0; i < specks; i++) {
    const sx = px + hash(x, y, 2 + i) * (TILE - 4)
    const sy = py + hash(x, y, 5 + i) * (TILE - 4)
    if (tile === 'dune') ctx.fillRect(sx, sy, 8, 1.5)
    else ctx.fillRect(sx, sy, 2.5, 2.5)
  }
}

/** A boulder sitting on its tile and rising above it, lit from the top left. */
function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number) {
  const cx = px + TILE / 2 + (hash(x, y, 9) - 0.5) * 4
  const base = py + TILE * 0.8
  const r = TILE * (0.44 + hash(x, y, 11) * 0.12)
  const tall = 0.75 + hash(x, y, 12) * 0.35
  ctx.fillStyle = 'rgba(70, 25, 10, 0.3)'
  ctx.beginPath()
  ctx.ellipse(cx + 5, base, r * 1.05, r * 0.38, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7a3120'
  ctx.beginPath()
  ctx.ellipse(cx, base - r * 0.55 * tall, r, r * 0.8 * tall + 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#a24a2e'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.1, base - r * 0.8 * tall, r * 0.86, r * 0.58 * tall, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c46a45'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.35, base - r * 1.05 * tall, r * 0.36, r * 0.2, -0.3, 0, Math.PI * 2)
  ctx.fill()
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number) {
  const teal = hash(x, y, 20) < 0.4
  const cx = px + TILE / 2
  const base = py + TILE * 0.85
  const glow = ctx.createRadialGradient(cx, base - 10, 2, cx, base - 10, TILE * 0.8)
  glow.addColorStop(0, teal ? 'rgba(90, 230, 210, 0.35)' : 'rgba(190, 120, 255, 0.35)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(px - TILE / 2, py - TILE / 2, TILE * 2, TILE * 2)
  const shards = 3 + Math.floor(hash(x, y, 21) * 2)
  for (let i = 0; i < shards; i++) {
    const sx = cx + (i - (shards - 1) / 2) * 6 + (hash(x, y, 22 + i) - 0.5) * 4
    const h = TILE * (0.45 + hash(x, y, 30 + i) * 0.4)
    const lean = (hash(x, y, 40 + i) - 0.5) * 8
    ctx.fillStyle = teal ? (i % 2 ? '#3fb8a8' : '#6fe0cf') : i % 2 ? '#7b4fc0' : '#a57ee6'
    ctx.beginPath()
    ctx.moveTo(sx - 4, base)
    ctx.lineTo(sx + lean, base - h)
    ctx.lineTo(sx + 4, base)
    ctx.closePath()
    ctx.fill()
  }
}

/** Height of the ship's hull above the ground, in CSS px. */
const HULL_HEIGHT = 12

function shipBox(map: GameMap, ox: number, oy: number) {
  const { x, y, w, h } = map.ship
  const left = x * TILE - ox
  const top = y * TILE - oy
  return { left, top, width: w * TILE, height: h * TILE, midY: top + (h * TILE) / 2 }
}

/** The parts of the crash lying flat on the ground: skid trail, scorch, wings. */
function drawShipGround(ctx: CanvasRenderingContext2D, map: GameMap, ox: number, oy: number) {
  const { left, top, width, height, midY } = shipBox(map, ox, oy)
  ctx.save()
  // Skid trail where she came down, over the scorched tiles from the map.
  ctx.lineCap = 'round'
  const trailEnd = { x: left - 13.5 * TILE, y: midY - 8.4 * TILE }
  for (const [lineWidth, colour] of [[TILE * 1.6, 'rgba(90, 45, 30, 0.35)'], [TILE * 0.7, 'rgba(60, 30, 20, 0.4)']] as const) {
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = colour
    ctx.beginPath()
    ctx.moveTo(left + TILE / 2, midY)
    ctx.lineTo(trailEnd.x, trailEnd.y)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(40, 20, 15, 0.35)'
  ctx.beginPath()
  ctx.ellipse(left + width / 2, midY + 6, width * 0.62, height * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  // Wings: one still attached behind the hull, one snapped off and lying askew.
  ctx.fillStyle = '#7d858e'
  ctx.beginPath()
  ctx.moveTo(left + width * 0.45, midY - 6)
  ctx.lineTo(left + width * 0.25, top - TILE * 0.2)
  ctx.lineTo(left + width * 0.6, top + 4)
  ctx.closePath()
  ctx.fill()
  ctx.save()
  ctx.translate(left + width * 0.3, top + height + 6)
  ctx.rotate(0.5)
  ctx.fillStyle = '#6c737b'
  ctx.fillRect(-14, -3, 34, 12)
  ctx.fillStyle = '#9aa3ad'
  ctx.fillRect(-14, -6, 34, 12)
  ctx.restore()
  ctx.restore()
}

/** The hull, raised off the ground: a darker side face below a lighter top. */
function drawShip(ctx: CanvasRenderingContext2D, map: GameMap, ox: number, oy: number) {
  const { left, width, midY } = shipBox(map, ox, oy)
  const hull = (dy: number) => {
    ctx.beginPath()
    ctx.moveTo(left + 4, midY - 14 + dy)
    ctx.lineTo(left + width - 22, midY - 16 + dy)
    ctx.lineTo(left + width - 2, midY - 2 + dy)
    ctx.lineTo(left + width - 10, midY + 10 + dy)
    ctx.lineTo(left + width - 22, midY + 16 + dy)
    ctx.lineTo(left + 4, midY + 14 + dy)
    ctx.closePath()
    ctx.fill()
  }
  ctx.save()
  // Stack copies of the outline upwards to give the hull a solid side.
  ctx.fillStyle = '#8b939b'
  for (let dy = 0; dy < HULL_HEIGHT; dy++) hull(-dy)
  // Engine bell at the back, blackened, with its own side.
  ctx.fillStyle = '#2f2a27'
  ctx.fillRect(left - 6, midY - 10 - HULL_HEIGHT + 4, 12, 20 + HULL_HEIGHT - 4)
  ctx.fillStyle = '#4a4440'
  ctx.fillRect(left - 6, midY - 10 - HULL_HEIGHT, 12, 20)
  ctx.fillStyle = '#d9dde2'
  hull(-HULL_HEIGHT)
  // Orange stripe and dark cockpit glass on top.
  const top = midY - HULL_HEIGHT
  ctx.fillStyle = '#e8743b'
  ctx.fillRect(left + 10, top - 3, width - 40, 6)
  ctx.fillStyle = '#2b3a4a'
  ctx.beginPath()
  ctx.ellipse(left + width - 24, top, 9, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(160, 220, 240, 0.35)'
  ctx.beginPath()
  ctx.ellipse(left + width - 27, top - 2.5, 4, 2, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawJoystick(ctx: CanvasRenderingContext2D, stick: Joystick) {
  ctx.save()
  ctx.fillStyle = 'rgba(255, 245, 235, 0.18)'
  ctx.strokeStyle = 'rgba(255, 245, 235, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(stick.origin.x, stick.origin.y, JOYSTICK_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 245, 235, 0.6)'
  ctx.beginPath()
  ctx.arc(stick.knob.x, stick.knob.y, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Top-left of the view in CSS px: centred on the pilot, kept inside the map. */
export function cameraFor(map: GameMap, pilot: Pilot, viewW: number, viewH: number) {
  const clamp = (centre: number, view: number, size: number) =>
    size <= view ? (size - view) / 2 : Math.min(Math.max(centre - view / 2, 0), size - view)
  return {
    x: Math.round(clamp(pilot.x * TILE, viewW, map.width * TILE)),
    y: Math.round(clamp(pilot.y * TILE - TILE / 2, viewH, map.height * TILE)),
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  pilot: Pilot,
  stick: Joystick | null,
  viewW: number,
  viewH: number,
  anim: Anim,
) {
  const cam = cameraFor(map, pilot, viewW, viewH)
  ctx.fillStyle = OUTSIDE
  ctx.fillRect(0, 0, viewW, viewH)

  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1)
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1)
  const x1 = Math.min(map.width - 1, Math.ceil((cam.x + viewW) / TILE) + 1)
  const y1 = Math.min(map.height - 1, Math.ceil((cam.y + viewH) / TILE) + 1)

  // Ground first: tiles, then the flat parts of the crash site.
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      drawGround(ctx, map.tiles[y * map.width + x], x, y, x * TILE - cam.x, y * TILE - cam.y)
    }
  }
  drawShipGround(ctx, map, cam.x, cam.y)

  // Then everything standing up, sorted by where it touches the ground, so things
  // further down the screen are drawn in front. Rows past the bottom edge are
  // included because tall things there reach up into view.
  const things: { y: number; draw: () => void }[] = []
  for (let y = y0; y <= Math.min(map.height - 1, y1 + 1); y++) {
    for (let x = x0; x <= x1; x++) {
      const tile = map.tiles[y * map.width + x]
      const px = x * TILE - cam.x
      const py = y * TILE - cam.y
      if (tile === 'rock') things.push({ y: y + 0.75, draw: () => drawRock(ctx, x, y, px, py) })
      else if (tile === 'crystal') things.push({ y: y + 0.8, draw: () => drawCrystal(ctx, x, y, px, py) })
    }
  }
  things.push({ y: map.ship.y + map.ship.h - 0.3, draw: () => drawShip(ctx, map, cam.x, cam.y) })
  const feetX = pilot.x * TILE - cam.x
  const feetY = (pilot.y + FEET_OFFSET) * TILE - cam.y
  things.push({ y: pilot.y + FEET_OFFSET, draw: () => drawPilot(ctx, pilot, feetX, feetY, anim) })
  things.sort((a, b) => a.y - b.y)
  for (const thing of things) thing.draw()

  // Warm haze: a peach sky tint from the top, and darker edges.
  const sky = ctx.createLinearGradient(0, 0, 0, viewH)
  sky.addColorStop(0, 'rgba(255, 190, 150, 0.28)')
  sky.addColorStop(0.5, 'rgba(255, 170, 130, 0.06)')
  sky.addColorStop(1, 'rgba(120, 50, 40, 0.18)')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, viewW, viewH)
  const vignette = ctx.createRadialGradient(
    viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.35,
    viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.75,
  )
  vignette.addColorStop(0, 'rgba(60, 20, 10, 0)')
  vignette.addColorStop(1, 'rgba(60, 20, 10, 0.45)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, viewW, viewH)

  drawStaminaBar(ctx, pilot, feetX, feetY)
  if (stick) drawJoystick(ctx, stick)
}
