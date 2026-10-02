import type { Pilot } from './movement'

// The pilot in a three-quarter view: seen from the front, back or side
// depending on where she faces, each with its own walk cycle. Drawn around her
// feet, which sit on the ground at (0, 0); up is negative y.

/** Animation inputs that aren't game state. */
export interface Anim {
  /** Seconds since the page loaded, for idle breathing and swaying. */
  time: number
  /** 0 when standing still, easing up to 1 while walking. */
  walkBlend: number
  /** 0 when not running, easing up to 1 while running. */
  runBlend: number
}

/** Tiles walked per full stride (left step plus right step). */
const STRIDE = 1.3
const SCALE = 1.15

const SUIT = '#3d7189'
const SUIT_DARK = '#2c5568'
const SUIT_LIGHT = '#5b93ab'
const ORANGE = '#e8743b'
const PACK = '#9aa2a8'
const BOOT = '#2e2622'
const SKIN = '#d29a74'
const SKIN_DARK = '#b98160'
const HAIR = '#3b2418'
const HAIR_LIGHT = '#6a4430'
const OUTLINE = 'rgba(45, 20, 12, 0.6)'

type Ctx = CanvasRenderingContext2D

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, outline = false) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  if (outline) stroke(ctx)
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, outline = false) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
  if (outline) stroke(ctx)
}

function stroke(ctx: Ctx) {
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 0.9
  ctx.stroke()
}

/** A limb as a thick rounded line, with an outline. */
function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, width: number, fill: string) {
  ctx.lineCap = 'round'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = width + 1.6
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.strokeStyle = fill
  ctx.lineWidth = width
  ctx.stroke()
}

interface Pose {
  /** -1..1: which leg is forward, and how far. */
  swing: number
  /** How much running changes the pose, 0..1. */
  run: number
  /** Ponytail sideways sway. */
  sway: number
}

/** Facing the camera (walking down the screen). */
function drawFront(ctx: Ctx, { swing, sway }: Pose) {
  // Legs: from the front, stepping shows as each foot lifting in turn.
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * swing) * 3
    rect(ctx, side * 2.7 - 2.1, -10, 4.2, 10 - lift, 1.5, SUIT_DARK, true)
    rect(ctx, side * 2.7 - 2.4, -3.2 - lift, 4.8, 3.4, 1.4, BOOT)
  }
  // Arms swing forward and back, so from the front they just shift a little.
  for (const side of [-1, 1]) {
    const dy = side * swing * 1.4
    limb(ctx, side * 7.2, -17.5, side * 7.8, -11 + dy, 3.6, SUIT)
    ellipse(ctx, side * 7.8, -10.2 + dy, 1.8, 1.8, SKIN, true)
  }
  rect(ctx, -6, -19.5, 12, 11, 4, SUIT, true)
  rect(ctx, -3.5, -18, 7, 6, 2, SUIT_LIGHT)
  ctx.fillStyle = ORANGE
  ctx.fillRect(-6, -10.5, 12, 1.6) // belt
  ellipse(ctx, -5, -17.5, 1.5, 1.2, ORANGE) // shoulder patches
  ellipse(ctx, 5, -17.5, 1.5, 1.2, ORANGE)

  // Head: face, hair over the top falling to the sides, a fringe, and eyes.
  ellipse(ctx, sway * 0.4 + 6.5, -23.5, 2, 2.6, HAIR) // ponytail peeking out
  ellipse(ctx, 0, -26, 6.6, 6.4, SKIN, true)
  ctx.fillStyle = HAIR
  ctx.beginPath()
  ctx.ellipse(0, -27, 7.2, 6.4, 0, Math.PI * 0.95, Math.PI * 2.05)
  ctx.fill()
  stroke(ctx)
  rect(ctx, -7.2, -28, 3, 7, 1.5, HAIR) // side hair
  rect(ctx, 4.2, -28, 3, 7, 1.5, HAIR)
  for (const fx of [-3.6, -0.6, 2.6]) ellipse(ctx, fx, -28.2, 2.2, 1.6, HAIR) // fringe
  ellipse(ctx, -2.4, -24.6, 0.9, 1.1, '#2a1a12') // eyes
  ellipse(ctx, 2.4, -24.6, 0.9, 1.1, '#2a1a12')
  ellipse(ctx, 0, -21.8, 1.1, 0.5, SKIN_DARK) // mouth
}

/** Facing away (walking up the screen). */
function drawBack(ctx: Ctx, { swing, sway }: Pose) {
  for (const side of [-1, 1]) {
    const lift = Math.max(0, -side * swing) * 3
    rect(ctx, side * 2.7 - 2.1, -10, 4.2, 10 - lift, 1.5, SUIT_DARK, true)
    rect(ctx, side * 2.7 - 2.4, -3.2 - lift, 4.8, 3.4, 1.4, BOOT)
  }
  for (const side of [-1, 1]) {
    const dy = -side * swing * 1.4
    limb(ctx, side * 7.2, -17.5, side * 7.8, -11 + dy, 3.6, SUIT)
    ellipse(ctx, side * 7.8, -10.2 + dy, 1.8, 1.8, SKIN, true)
  }
  rect(ctx, -6, -19.5, 12, 11, 4, SUIT, true)
  // Backpack and oxygen tank.
  rect(ctx, -4.6, -19, 9.2, 9.5, 2.5, PACK, true)
  rect(ctx, -1.2, -18, 2.4, 7, 1.2, ORANGE)
  // Head from behind: all hair, strands, and a ponytail hanging down.
  ellipse(ctx, 0, -26, 6.8, 6.6, HAIR, true)
  ctx.strokeStyle = HAIR_LIGHT
  ctx.lineWidth = 0.7
  ctx.lineCap = 'round'
  for (const off of [-3, 0, 3]) {
    ctx.beginPath()
    ctx.moveTo(off * 0.7, -31.5)
    ctx.quadraticCurveTo(off * 1.2, -27, off * 0.6, -22.5)
    ctx.stroke()
  }
  ellipse(ctx, sway, -18.5, 2.4, 4, HAIR, true)
  ellipse(ctx, sway * 0.4, -21.8, 1.6, 1, ORANGE) // hair tie
}

/** Facing right; facing left is the same drawing mirrored. */
function drawSide(ctx: Ctx, { swing, run, sway }: Pose) {
  const hipY = -10
  const stride = 4.5 * (1 + 0.4 * run)
  const foot = (s: number) => ({ x: s * stride, y: -Math.max(0, -s) * 2.5 })
  // Far leg and arm first, darker, behind the body.
  const far = foot(-swing)
  limb(ctx, 0, hipY, far.x, far.y - 2, 3.8, SUIT_DARK)
  ellipse(ctx, far.x + 1.2, far.y - 1.5, 3, 1.8, BOOT)
  limb(ctx, 0.5, -17, swing * 4.5, -11, 3.2, SUIT_DARK)
  // Backpack behind her, then the body.
  rect(ctx, -9.5, -19.5, 5.5, 10, 2, PACK, true)
  rect(ctx, -9, -16, 1.6, 6, 0.8, ORANGE)
  rect(ctx, -4.5, -19.5, 9, 11, 3.5, SUIT, true)
  ctx.fillStyle = ORANGE
  ctx.fillRect(-4.5, -10.5, 9, 1.6)
  // Near leg and arm.
  const near = foot(swing)
  limb(ctx, 0, hipY, near.x, near.y - 2, 4, SUIT)
  ellipse(ctx, near.x + 1.2, near.y - 1.5, 3.1, 1.9, BOOT, true)
  const hand = { x: -swing * 5 + run * 1.5, y: -11 - run * 1.5 }
  limb(ctx, 0, -17, hand.x, hand.y, 3.6, SUIT)
  ellipse(ctx, hand.x, hand.y, 1.8, 1.8, SKIN, true)
  ellipse(ctx, -0.8, -17.8, 1.5, 1.2, ORANGE)

  // Head in profile: ponytail out the back, hair over the top, face forward.
  ellipse(ctx, -8.4, -25.5 + sway * 0.6, 3.2, 2.1, HAIR, true)
  ellipse(ctx, -5.6, -26, 1.2, 1.5, ORANGE)
  ellipse(ctx, 0.8, -26, 6.4, 6.4, SKIN, true)
  ctx.fillStyle = HAIR
  ctx.beginPath()
  ctx.ellipse(-0.6, -27, 6.6, 6.2, 0, Math.PI * 0.4, Math.PI * 1.85)
  ctx.closePath()
  ctx.fill()
  stroke(ctx)
  ellipse(ctx, 3.4, -30.4, 3.6, 1.8, HAIR) // fringe
  ellipse(ctx, 4.4, -25.4, 0.9, 1.1, '#2a1a12') // eye
}

/** Draw the pilot with her feet at (x, y) on screen. */
export function drawPilot(ctx: Ctx, pilot: Pilot, x: number, y: number, anim: Anim) {
  const phase = (pilot.walked / STRIDE) * Math.PI * 2
  const run = anim.runBlend
  const pose: Pose = {
    swing: Math.sin(phase) * anim.walkBlend * (1 + 0.4 * run),
    run,
    sway: Math.cos(phase) * (1.4 + run) * anim.walkBlend + Math.sin(anim.time * 1.3) * 0.4,
  }
  // Up and down on each step (twice per stride), and a slow breath when still.
  const bob = Math.abs(Math.sin(phase)) * (1.2 + 0.8 * run) * anim.walkBlend
  const breath = Math.sin(anim.time * 2.2) * 0.012 * (1 - anim.walkBlend)

  const cos = Math.cos(pilot.facing)
  const sin = Math.sin(pilot.facing)
  const side = Math.abs(cos) > Math.abs(sin) * 1.05

  ctx.save()
  ellipse(ctx, x, y, 9 * SCALE, 3.2 * SCALE, 'rgba(60, 25, 10, 0.3)')
  ctx.translate(x, y)
  ctx.scale(SCALE * (side && cos < 0 ? -1 : 1), SCALE * (1 + breath))
  if (side) ctx.rotate(0.1 * run) // lean into the run
  ctx.translate(0, -bob)
  if (side) drawSide(ctx, pose)
  else if (sin > 0) drawFront(ctx, pose)
  else drawBack(ctx, pose)
  ctx.restore()
}

/** Stamina bar above her head, shown only while it isn't full. */
export function drawStaminaBar(ctx: Ctx, pilot: Pilot, x: number, y: number) {
  const show = Math.min(1, (1 - pilot.stamina) * 20)
  if (show <= 0) return
  const w = 30
  const top = y - 46
  ctx.save()
  ctx.globalAlpha = show
  rect(ctx, x - w / 2 - 1.5, top - 1.5, w + 3, 7, 3.5, 'rgba(40, 18, 10, 0.6)')
  rect(ctx, x - w / 2, top, Math.max(w * pilot.stamina, 0.5), 4, 2, pilot.exhausted ? '#e0603a' : '#9fe0b4')
  ctx.restore()
}
