import { describe, expect, it } from 'vitest'
import { generateMap, isSolid, tileAt, type GameMap, type Tile } from './map'
import {
  clampDirection,
  newPilot,
  PILOT_RADIUS,
  STAMINA_DRAIN,
  STAMINA_RECOVERED,
  stepPilot,
  turnTowards,
  WALK_SPEED,
  type Pilot,
} from './movement'

/** A small hand-made map: '#' is rock, '.' is sand. */
function mapFrom(rows: string[]): GameMap {
  const tiles: Tile[] = rows.join('').split('').map((c) => (c === '#' ? 'rock' : 'sand'))
  return {
    width: rows[0].length,
    height: rows.length,
    tiles,
    ship: { x: 0, y: 0, w: 0, h: 0 },
    spawn: { x: 0.5, y: 0.5 },
  }
}

/** Walk (or run) for `seconds` in steps of 1/60 s. */
function walk(map: GameMap, pilot: Pilot, dir: { x: number; y: number }, seconds: number, run = false) {
  for (let t = 0; t < Math.round(seconds * 60); t++) pilot = stepPilot(map, pilot, dir, 1 / 60, run)
  return pilot
}

describe('generateMap', () => {
  const map = generateMap()

  it('is the same every time for the same seed', () => {
    expect(generateMap().tiles).toEqual(map.tiles)
    expect(generateMap(42).tiles).not.toEqual(map.tiles)
  })

  it('puts the ship in the middle, and it is solid', () => {
    const { ship } = map
    expect(tileAt(map, ship.x + 1, ship.y + 1)).toBe('ship')
    expect(isSolid(map, ship.x + 1, ship.y + 1)).toBe(true)
    expect(Math.abs(ship.x + ship.w / 2 - map.width / 2)).toBeLessThanOrEqual(1)
  })

  it('starts the pilot on open ground with room to move', () => {
    const { x, y } = map.spawn
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        expect(isSolid(map, Math.floor(x) + dx, Math.floor(y) + dy)).toBe(false)
      }
    }
  })

  it('has rocks and crystals to walk around', () => {
    expect(map.tiles).toContain('rock')
    expect(map.tiles).toContain('crystal')
  })

  it('treats outside the map as solid', () => {
    expect(isSolid(map, -1, 5)).toBe(true)
    expect(isSolid(map, map.width, 5)).toBe(true)
  })
})

describe('stepPilot', () => {
  const open = mapFrom(['.....', '.....', '.....', '.....', '.....'])
  const start = newPilot(2.5, 2.5, 0)

  it('walks in the given direction and faces it', () => {
    const p = stepPilot(open, start, { x: 1, y: 0 }, 0.1)
    expect(p.x).toBeCloseTo(2.9)
    expect(p.y).toBe(2.5)
    expect(p.facing).toBe(0)
  })

  it('counts the distance walked, for the step animation', () => {
    const p = stepPilot(open, start, { x: 1, y: 0 }, 0.1)
    expect(p.walked).toBeCloseTo(0.4)
    expect(p.moving).toBe(true)
    expect(stepPilot(open, p, { x: 0, y: 0 }, 0.1).moving).toBe(false)
  })

  it('does not count walking into a wall as steps', () => {
    const map = mapFrom(['...', '.#.', '...'])
    const againstRock = { ...start, x: 1.5, y: 1 - PILOT_RADIUS - 1e-4 }
    const p = stepPilot(map, againstRock, { x: 0, y: 1 }, 0.1)
    expect(p.walked).toBe(0)
    expect(p.moving).toBe(false)
  })

  it('turns smoothly instead of snapping round', () => {
    const p = stepPilot(open, start, { x: -1, y: 0 }, 1 / 60)
    expect(p.facing).not.toBeCloseTo(Math.PI)
    expect(walk(open, start, { x: -1, y: 0 }, 0.3).facing).toBeCloseTo(Math.PI)
  })

  it('turns the short way round', () => {
    expect(turnTowards(3, -3, 0.1)).toBeCloseTo(3.1)
    expect(turnTowards(0, 0.05, 0.1)).toBe(0.05)
  })

  it('stays put with no input', () => {
    expect(stepPilot(open, start, { x: 0, y: 0 }, 0.1)).toBe(start)
  })

  it('is not faster diagonally', () => {
    expect(clampDirection({ x: 1, y: 1 }).x).toBeCloseTo(Math.SQRT1_2)
    const p = stepPilot(open, start, { x: 1, y: 1 }, 0.1)
    expect(Math.hypot(p.x - start.x, p.y - start.y)).toBeCloseTo(0.4)
  })

  it('stops at the edge of the map', () => {
    const p = walk(open, start, { x: 1, y: 0 }, 3)
    expect(p.x).toBeCloseTo(5 - PILOT_RADIUS, 3)
    expect(p.x).toBeLessThan(5 - PILOT_RADIUS)
  })

  it('cannot walk through a rock', () => {
    const map = mapFrom(['.....', '.....', '...#.', '.....', '.....'])
    const p = walk(map, start, { x: 1, y: 0 }, 2)
    expect(p.x).toBeCloseTo(3 - PILOT_RADIUS, 3)
  })

  it('slides along a wall when walking into it diagonally', () => {
    const map = mapFrom(['.....', '.....', '.....', '#####', '.....'])
    const p = walk(map, start, { x: 1, y: 1 }, 0.4)
    expect(p.y).toBeCloseTo(3 - PILOT_RADIUS, 3)
    expect(p.x).toBeGreaterThan(start.x + 0.5)
  })
})

describe('running and stamina', () => {
  // A long open strip, so she never reaches the end.
  const field = mapFrom(Array.from({ length: 3 }, () => '.'.repeat(200)))
  const start = newPilot(1.5, 1.5, 0)
  const east = { x: 1, y: 0 }
  const still = { x: 0, y: 0 }

  it('runs faster than walking and uses up stamina', () => {
    const p = stepPilot(field, start, east, 0.1, true)
    expect(p.x - start.x).toBeGreaterThan(WALK_SPEED * 0.1)
    expect(p.running).toBe(true)
    expect(p.stamina).toBeCloseTo(1 - STAMINA_DRAIN * 0.1)
  })

  it('drops back to walking when stamina runs out, and stays tired for a while', () => {
    const tired = walk(field, start, east, 4.5, true)
    expect(tired.stamina).toBeLessThan(0.1)
    expect(tired.exhausted).toBe(true)
    expect(tired.running).toBe(false)
    // Holding Shift while exhausted is just walking, and stamina comes back.
    const later = walk(field, tired, east, 1, true)
    expect(later.running).toBe(false)
    expect(later.stamina).toBeGreaterThan(tired.stamina)
  })

  it('can run again once stamina has recovered enough', () => {
    const tired = walk(field, start, east, 4.5, true)
    const rested = walk(field, tired, still, 1)
    expect(rested.stamina).toBeGreaterThanOrEqual(STAMINA_RECOVERED)
    expect(rested.exhausted).toBe(false)
    expect(stepPilot(field, rested, east, 1 / 60, true).running).toBe(true)
  })

  it('recharges faster standing still than walking', () => {
    const half = walk(field, start, east, 2, true)
    const walked = walk(field, half, east, 1)
    const stood = walk(field, half, still, 1)
    expect(walked.stamina).toBeGreaterThan(half.stamina)
    expect(stood.stamina).toBeGreaterThan(walked.stamina)
  })

  it('does not use stamina when holding Shift without moving', () => {
    const half = walk(field, start, east, 2, true)
    expect(stepPilot(field, half, still, 0.1, true).stamina).toBeGreaterThan(half.stamina)
  })

  it('never goes above full', () => {
    const half = walk(field, start, east, 2, true)
    expect(walk(field, half, still, 10).stamina).toBe(1)
  })
})
