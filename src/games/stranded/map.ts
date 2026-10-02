// The planet: a tile grid generated from a fixed seed, so it's the same every time.
// Positions are in tile units: tile (3, 5) covers x 3..4 and y 5..6.

export type Tile =
  | 'sand' // orange sand
  | 'dune' // pale dunes
  | 'hardpan' // cracked terracotta ground
  | 'dust' // dusty pink patches
  | 'scorch' // the crash trail behind the ship
  | 'rock' // rust-red boulder (solid)
  | 'crystal' // purple/teal crystal outcrop (solid)
  | 'ship' // the wreck (solid)

export interface GameMap {
  width: number
  height: number
  tiles: Tile[]
  /** Top-left tile and size of the crashed ship. */
  ship: { x: number; y: number; w: number; h: number }
  /** Where the pilot starts, in tile units (centre of a tile). */
  spawn: { x: number; y: number }
}

export const MAP_SIZE = 64
export const MAP_SEED = 1977

const SOLID: ReadonlySet<Tile> = new Set(['rock', 'crystal', 'ship'])

export function tileAt(map: GameMap, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null
  return map.tiles[y * map.width + x]
}

/** Solid tiles and anything outside the map block movement. */
export function isSolid(map: GameMap, x: number, y: number): boolean {
  const tile = tileAt(map, x, y)
  return tile === null || SOLID.has(tile)
}

type Rng = () => number

// Same mulberry32 generator as Five-a-Side Manager's `seededRng`.
export function seededRng(seed: number): Rng {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** Smooth value noise in 0..1: random values on a coarse grid, blended between. */
function valueNoise(width: number, height: number, cell: number, rng: Rng) {
  const gw = Math.ceil(width / cell) + 2
  const gh = Math.ceil(height / cell) + 2
  const grid = Array.from({ length: gw * gh }, rng)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const gx = x / cell
    const gy = y / cell
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const tx = smooth(gx - x0)
    const ty = smooth(gy - y0)
    const at = (i: number, j: number) => grid[j * gw + i]
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx
    return top * (1 - ty) + bottom * ty
  }
}

export function generateMap(seed = MAP_SEED, size = MAP_SIZE): GameMap {
  const rng = seededRng(seed)
  const width = size
  const height = size
  const tiles: Tile[] = new Array(width * height)
  const set = (x: number, y: number, tile: Tile) => {
    if (x >= 0 && y >= 0 && x < width && y < height) tiles[y * width + x] = tile
  }
  const get = (x: number, y: number) => tiles[y * width + x]

  // Ground: two layers of noise pick between the walkable ground types.
  const broad = valueNoise(width, height, 12, rng)
  const fine = valueNoise(width, height, 5, rng)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const b = broad(x, y)
      const f = fine(x, y)
      let tile: Tile = 'sand'
      if (b > 0.68) tile = 'dune'
      else if (b < 0.3) tile = 'hardpan'
      else if (f > 0.75) tile = 'dust'
      set(x, y, tile)
    }
  }

  // The ship lies in the middle, with a scorched skid trail leading in from the
  // north-west where it came down.
  const ship = { x: Math.floor(width / 2) - 2, y: Math.floor(height / 2) - 1, w: 4, h: 3 }
  for (let i = 0; i < 14; i++) {
    const cx = ship.x - i
    const cy = ship.y - Math.floor(i * 0.6)
    for (let d = 0; d < 2; d++) set(cx, cy + d, 'scorch')
  }

  // Keep a clear area around the ship so the pilot has room to start.
  const cx = ship.x + ship.w / 2
  const cy = ship.y + ship.h / 2
  const nearShip = (x: number, y: number, r: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r

  // Boulder clusters: pick a centre, then grow a small random blob around it.
  for (let c = 0; c < 70; c++) {
    let x = Math.floor(rng() * width)
    let y = Math.floor(rng() * height)
    const count = 1 + Math.floor(rng() * 6)
    for (let i = 0; i < count; i++) {
      if (!nearShip(x, y, 7) && get(x, y) !== 'scorch') set(x, y, 'rock')
      x += Math.floor(rng() * 3) - 1
      y += Math.floor(rng() * 3) - 1
    }
  }

  // Crystal outcrops: rarer, small, and only out in the open.
  for (let c = 0; c < 22; c++) {
    const x = Math.floor(rng() * width)
    const y = Math.floor(rng() * height)
    if (nearShip(x, y, 9)) continue
    set(x, y, 'crystal')
    if (rng() < 0.5) set(x + 1, y, 'crystal')
    if (rng() < 0.3) set(x, y + 1, 'crystal')
  }

  for (let y = ship.y; y < ship.y + ship.h; y++) {
    for (let x = ship.x; x < ship.x + ship.w; x++) set(x, y, 'ship')
  }

  const spawn = { x: ship.x + ship.w / 2, y: ship.y + ship.h + 1.5 }
  return { width, height, tiles, ship, spawn }
}
