import { describe, expect, it } from 'vitest'
import { AI_TEAMS, BUDGET, PLAYERS } from './data'
import {
  applyResults,
  createFixtures,
  emptyTable,
  seededRng,
  simulateMatch,
  squadProblem,
  squadStrength,
  USER_TEAM_ID,
  type Player,
} from './logic'

const byId = (...ids: string[]) => ids.map((id) => PLAYERS.find((p) => p.id === id)!)

describe('squadProblem', () => {
  it('accepts a valid squad within budget', () => {
    expect(squadProblem(byId('gk2', 'df3', 'md3', 'md4', 'fw3'), BUDGET)).toBeNull()
  })

  it('rejects a squad over budget', () => {
    expect(squadProblem(byId('gk1', 'df1', 'md1', 'md2', 'fw1'), BUDGET)).toBe('Over budget')
  })

  it('requires exactly one goalkeeper', () => {
    expect(squadProblem(byId('gk3', 'gk4', 'df4', 'md5', 'fw5'), BUDGET)).toMatch(/goalkeeper/)
  })

  it('requires five players', () => {
    expect(squadProblem(byId('gk3', 'df4'), BUDGET)).toMatch(/Pick 5/)
  })
})

describe('createFixtures', () => {
  const teams = ['a', 'b', 'c', 'd', 'e', 'f']
  const rounds = createFixtures(teams)

  it('has each team play once per round', () => {
    expect(rounds).toHaveLength(10)
    for (const round of rounds) {
      const ids = round.flatMap((f) => [f.home, f.away])
      expect(new Set(ids).size).toBe(teams.length)
    }
  })

  it('has every pair meet once at home and once away', () => {
    const all = rounds.flat().map((f) => `${f.home}-${f.away}`)
    expect(new Set(all).size).toBe(30)
  })

  it('handles an odd number of teams', () => {
    const odd = createFixtures(['a', 'b', 'c'])
    expect(odd.flat()).toHaveLength(6)
  })
})

describe('simulateMatch', () => {
  const squad: Player[] = byId('gk2', 'df3', 'md3', 'md4', 'fw3')
  const strengths = {
    [USER_TEAM_ID]: squadStrength(squad, 'balanced'),
    ...Object.fromEntries(AI_TEAMS.map((t) => [t.id, t])),
  }

  it('is deterministic for a given seed', () => {
    const fixture = { home: USER_TEAM_ID, away: 'riverside' }
    expect(simulateMatch(fixture, strengths, seededRng(1), squad)).toEqual(
      simulateMatch(fixture, strengths, seededRng(1), squad),
    )
  })

  it('creates one goal event per goal, with user scorers named', () => {
    const rng = seededRng(42)
    for (let i = 0; i < 50; i++) {
      const r = simulateMatch({ home: USER_TEAM_ID, away: 'meadow' }, strengths, rng, squad)
      expect(r.events).toHaveLength(r.homeGoals + r.awayGoals)
      for (const e of r.events.filter((e) => e.teamId === USER_TEAM_ID)) {
        expect(squad.map((p) => p.name)).toContain(e.scorer)
      }
    }
  })

  it('makes stronger teams win more often', () => {
    const rng = seededRng(7)
    let strongWins = 0
    let weakWins = 0
    for (let i = 0; i < 500; i++) {
      const r = simulateMatch({ home: 'riverside', away: 'meadow' }, strengths, rng)
      if (r.homeGoals > r.awayGoals) strongWins++
      if (r.homeGoals < r.awayGoals) weakWins++
    }
    expect(strongWins).toBeGreaterThan(weakWins * 2)
  })
})

describe('applyResults', () => {
  it('awards points and sorts the table', () => {
    const table = applyResults(emptyTable(['a', 'b', 'c']), [
      { home: 'a', away: 'b', homeGoals: 0, awayGoals: 2, events: [] },
      { home: 'c', away: 'a', homeGoals: 1, awayGoals: 1, events: [] },
    ])
    expect(table.map((r) => [r.teamId, r.points])).toEqual([
      ['b', 3],
      ['c', 1],
      ['a', 1],
    ])
    expect(table[2]).toMatchObject({ played: 2, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 3 })
  })
})
