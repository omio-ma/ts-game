export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

export type Player = {
  id: string
  name: string
  position: Position
  rating: number
  /** Price in £m */
  price: number
}

export type AiTeam = {
  id: string
  name: string
  attack: number
  defence: number
}

export type Tactic = 'defensive' | 'balanced' | 'attacking'

export type Fixture = { home: string; away: string }

export type GoalEvent = { minute: number; teamId: string; scorer?: string }

export type MatchResult = Fixture & {
  homeGoals: number
  awayGoals: number
  events: GoalEvent[]
}

export type TableRow = {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export type Rng = () => number

export const USER_TEAM_ID = 'you'
export const SQUAD_SIZE = 5

const TACTIC_MODIFIERS: Record<Tactic, { attack: number; defence: number }> = {
  defensive: { attack: 0.88, defence: 1.12 },
  balanced: { attack: 1, defence: 1 },
  attacking: { attack: 1.14, defence: 0.88 },
}

// How much each position contributes to attack and defence
const ATTACK_WEIGHT: Record<Position, number> = { GK: 0, DEF: 0.3, MID: 0.8, FWD: 1 }
const DEFENCE_WEIGHT: Record<Position, number> = { GK: 1.2, DEF: 1, MID: 0.5, FWD: 0.1 }
const SCORER_WEIGHT: Record<Position, number> = { GK: 0, DEF: 1, MID: 3, FWD: 5 }

export function squadCost(squad: Player[]) {
  return squad.reduce((sum, p) => sum + p.price, 0)
}

/** Returns a reason the squad can't be used, or null if it's valid. */
export function squadProblem(squad: Player[], budget: number): string | null {
  const count = (pos: Position) => squad.filter((p) => p.position === pos).length
  if (squadCost(squad) > budget) return 'Over budget'
  if (squad.length !== SQUAD_SIZE) return `Pick ${SQUAD_SIZE} players (${squad.length} chosen)`
  if (count('GK') !== 1) return 'You need exactly 1 goalkeeper'
  if (count('DEF') < 1) return 'You need at least 1 defender'
  if (count('MID') < 1) return 'You need at least 1 midfielder'
  if (count('FWD') < 1) return 'You need at least 1 forward'
  return null
}

function weightedAverage(squad: Player[], weights: Record<Position, number>) {
  let total = 0
  let weight = 0
  for (const p of squad) {
    total += p.rating * weights[p.position]
    weight += weights[p.position]
  }
  return weight === 0 ? 0 : total / weight
}

export function squadStrength(squad: Player[], tactic: Tactic) {
  const mod = TACTIC_MODIFIERS[tactic]
  return {
    attack: weightedAverage(squad, ATTACK_WEIGHT) * mod.attack,
    defence: weightedAverage(squad, DEFENCE_WEIGHT) * mod.defence,
  }
}

/** Double round-robin: every team plays every other team home and away. */
export function createFixtures(teamIds: string[]): Fixture[][] {
  const teams = [...teamIds]
  if (teams.length % 2 === 1) teams.push('bye')
  const n = teams.length
  const firstHalf: Fixture[][] = []

  for (let round = 0; round < n - 1; round++) {
    const fixtures: Fixture[] = []
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i]
      const b = teams[n - 1 - i]
      if (a === 'bye' || b === 'bye') continue
      // Alternate home/away so no team is always at home
      fixtures.push(round % 2 === 0 ? { home: a, away: b } : { home: b, away: a })
    }
    firstHalf.push(fixtures)
    // Rotate every team except the first
    teams.splice(1, 0, teams.pop()!)
  }

  const secondHalf = firstHalf.map((round) => round.map((f) => ({ home: f.away, away: f.home })))
  return [...firstHalf, ...secondHalf]
}

function poisson(lambda: number, rng: Rng) {
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > limit)
  return k - 1
}

function expectedGoals(attack: number, defence: number, isHome: boolean) {
  const base = 1.6 * Math.pow(attack / defence, 3)
  return Math.min(6, base * (isHome ? 1.1 : 1))
}

function pickScorer(squad: Player[], rng: Rng) {
  const total = squad.reduce((sum, p) => sum + SCORER_WEIGHT[p.position] * p.rating, 0)
  let roll = rng() * total
  for (const p of squad) {
    roll -= SCORER_WEIGHT[p.position] * p.rating
    if (roll <= 0) return p.name
  }
  return squad[squad.length - 1].name
}

function goalEvents(teamId: string, goals: number, rng: Rng, squad?: Player[]): GoalEvent[] {
  return Array.from({ length: goals }, () => ({
    minute: 1 + Math.floor(rng() * 90),
    teamId,
    scorer: squad ? pickScorer(squad, rng) : undefined,
  }))
}

export type Strengths = Record<string, { attack: number; defence: number }>

export function simulateMatch(
  fixture: Fixture,
  strengths: Strengths,
  rng: Rng,
  userSquad?: Player[],
): MatchResult {
  const home = strengths[fixture.home]
  const away = strengths[fixture.away]
  const homeGoals = poisson(expectedGoals(home.attack, away.defence, true), rng)
  const awayGoals = poisson(expectedGoals(away.attack, home.defence, false), rng)
  const squadFor = (id: string) => (id === USER_TEAM_ID ? userSquad : undefined)

  const events = [
    ...goalEvents(fixture.home, homeGoals, rng, squadFor(fixture.home)),
    ...goalEvents(fixture.away, awayGoals, rng, squadFor(fixture.away)),
  ].sort((a, b) => a.minute - b.minute)

  return { ...fixture, homeGoals, awayGoals, events }
}

export function emptyTable(teamIds: string[]): TableRow[] {
  return teamIds.map((teamId) => ({
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }))
}

export function applyResults(table: TableRow[], results: MatchResult[]): TableRow[] {
  const next = table.map((row) => ({ ...row }))
  const row = (id: string) => next.find((r) => r.teamId === id)!

  for (const r of results) {
    const home = row(r.home)
    const away = row(r.away)
    home.played++
    away.played++
    home.goalsFor += r.homeGoals
    home.goalsAgainst += r.awayGoals
    away.goalsFor += r.awayGoals
    away.goalsAgainst += r.homeGoals

    if (r.homeGoals > r.awayGoals) {
      home.won++
      home.points += 3
      away.lost++
    } else if (r.homeGoals < r.awayGoals) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points++
      away.points++
    }
  }

  return sortTable(next)
}

export function sortTable(table: TableRow[]): TableRow[] {
  return [...table].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.teamId.localeCompare(b.teamId),
  )
}

/** Small seeded random number generator, handy for tests. */
export function seededRng(seed: number): Rng {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
