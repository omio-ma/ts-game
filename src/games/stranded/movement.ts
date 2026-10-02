import { isSolid, type GameMap } from './map'

export interface Vec {
  x: number
  y: number
}

export interface Pilot {
  /** Centre of the pilot, in tile units. */
  x: number
  y: number
  /** Direction she faces, in radians (0 = east, π/2 = south). */
  facing: number
  /** Total distance walked, in tiles. Drives the step animation. */
  walked: number
  /** Whether she moved in the last step. */
  moving: boolean
  /** Whether she was running in the last step. */
  running: boolean
  /** 0 (empty) to 1 (full). Running uses it up. */
  stamina: number
  /** Set when stamina runs out; she can't run again until it recovers a bit. */
  exhausted: boolean
}

/** Tiles per second at full speed. */
export const WALK_SPEED = 4
/** Half the width of her collision box, in tiles. */
export const PILOT_RADIUS = 0.3
/** How fast she turns to face a new direction, in radians per second. */
export const TURN_SPEED = 14

/** Running speed as a multiple of walking speed. */
export const RUN_MULTIPLIER = 1.75
/** Stamina used per second of running: a full bar lasts 4 seconds. */
export const STAMINA_DRAIN = 0.25
/** Stamina regained per second while walking (a full bar in 10 s)... */
export const STAMINA_REGEN_WALKING = 0.1
/** ...and while standing still (a full bar in 3 s). */
export const STAMINA_REGEN_RESTING = 0.33
/** After running out, she can run again once stamina is back to this. */
export const STAMINA_RECOVERED = 0.3

export function newPilot(x: number, y: number, facing = Math.PI / 2): Pilot {
  return { x, y, facing, walked: 0, moving: false, running: false, stamina: 1, exhausted: false }
}

const EPSILON = 1e-4

/** Clamp a direction to length 1, so diagonals aren't faster than straight lines. */
export function clampDirection(dir: Vec): Vec {
  const len = Math.hypot(dir.x, dir.y)
  return len > 1 ? { x: dir.x / len, y: dir.y / len } : dir
}

function overlapsSolid(map: GameMap, x: number, y: number, r: number): boolean {
  const x0 = Math.floor(x - r)
  const x1 = Math.floor(x + r)
  const y0 = Math.floor(y - r)
  const y1 = Math.floor(y + r)
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(map, tx, ty)) return true
    }
  }
  return false
}

/** Turn from `from` towards `to` by at most `maxStep` radians, the short way round. */
export function turnTowards(from: number, to: number, maxStep: number): number {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return Math.abs(diff) <= maxStep ? to : from + Math.sign(diff) * maxStep
}

/**
 * Move the pilot by `dir` (length 0..1) for `dt` seconds, running if `wantsRun`
 * and she has the stamina. X and Y are resolved separately, so walking
 * diagonally into a wall slides along it. Steps must be under one tile, which
 * holds while `dt` is kept small.
 */
export function stepPilot(map: GameMap, pilot: Pilot, dir: Vec, dt: number, wantsRun = false): Pilot {
  const d = clampDirection(dir)
  const hasInput = d.x !== 0 || d.y !== 0
  if (!hasInput && !pilot.moving && pilot.stamina === 1) return pilot

  const r = PILOT_RADIUS
  const canRun = wantsRun && hasInput && !pilot.exhausted && pilot.stamina > 0
  const speed = WALK_SPEED * (canRun ? RUN_MULTIPLIER : 1)
  let { x, y } = pilot

  const nx = x + d.x * speed * dt
  if (!overlapsSolid(map, nx, y, r)) x = nx
  else if (d.x > 0) x = Math.floor(nx + r) - r - EPSILON
  else x = Math.floor(nx - r) + 1 + r + EPSILON

  const ny = y + d.y * speed * dt
  if (!overlapsSolid(map, x, ny, r)) y = ny
  else if (d.y > 0) y = Math.floor(ny + r) - r - EPSILON
  else y = Math.floor(ny - r) + 1 + r + EPSILON

  const moved = Math.hypot(x - pilot.x, y - pilot.y)
  const moving = moved > 0
  const running = canRun && moving

  let stamina = pilot.stamina
  if (running) stamina -= STAMINA_DRAIN * dt
  else stamina += (moving ? STAMINA_REGEN_WALKING : STAMINA_REGEN_RESTING) * dt
  stamina = Math.min(1, Math.max(0, stamina))
  const exhausted = stamina === 0 || (pilot.exhausted && stamina < STAMINA_RECOVERED)

  return {
    x,
    y,
    facing: hasInput ? turnTowards(pilot.facing, Math.atan2(d.y, d.x), TURN_SPEED * dt) : pilot.facing,
    walked: pilot.walked + moved,
    moving,
    running,
    stamina,
    exhausted,
  }
}
