import { useMemo, useState } from 'react'
import {
  applyResults,
  createFixtures,
  emptyTable,
  simulateMatch,
  squadStrength,
  USER_TEAM_ID,
  type AiTeam,
  type MatchResult,
  type Player,
  type TableRow,
  type Tactic,
} from './logic'

type Props = {
  teamName: string
  squad: Player[]
  aiTeams: AiTeam[]
  onNewSquad: () => void
}

type Season = {
  round: number
  table: TableRow[]
  userResults: MatchResult[]
}

const TACTICS: { value: Tactic; label: string }[] = [
  { value: 'defensive', label: 'Defensive' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'attacking', label: 'Attacking' },
]

type Outcome = 'W' | 'D' | 'L'

function outcome(result: MatchResult): Outcome {
  const [mine, theirs] =
    result.home === USER_TEAM_ID
      ? [result.homeGoals, result.awayGoals]
      : [result.awayGoals, result.homeGoals]
  return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D'
}

function ordinal(n: number) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

function SeasonView({ teamName, squad, aiTeams, onNewSquad }: Props) {
  const teamIds = useMemo(() => [USER_TEAM_ID, ...aiTeams.map((t) => t.id)], [aiTeams])
  const rounds = useMemo(() => createFixtures(teamIds), [teamIds])
  const names: Record<string, string> = useMemo(
    () => ({ [USER_TEAM_ID]: teamName, ...Object.fromEntries(aiTeams.map((t) => [t.id, t.name])) }),
    [teamName, aiTeams],
  )

  const newSeason = (): Season => ({ round: 0, table: emptyTable(teamIds), userResults: [] })
  const [season, setSeason] = useState<Season>(newSeason)
  const [tactic, setTactic] = useState<Tactic>('balanced')

  const finished = season.round >= rounds.length
  const nextFixture = finished ? null : rounds[season.round].find(
    (f) => f.home === USER_TEAM_ID || f.away === USER_TEAM_ID,
  )!
  const lastResult = season.userResults.at(-1)
  const position = season.table.findIndex((r) => r.teamId === USER_TEAM_ID) + 1
  const strength = squadStrength(squad, tactic)

  function playMatch() {
    const strengths = {
      [USER_TEAM_ID]: strength,
      ...Object.fromEntries(aiTeams.map((t) => [t.id, t])),
    }
    const results = rounds[season.round].map((f) =>
      simulateMatch(f, strengths, Math.random, squad),
    )
    const userResult = results.find((r) => r.home === USER_TEAM_ID || r.away === USER_TEAM_ID)!
    setSeason({
      round: season.round + 1,
      table: applyResults(season.table, results),
      userResults: [...season.userResults, userResult],
    })
  }

  return (
    <>
      {finished ? (
        <section className="fm-card fm-final">
          <h2>Season over</h2>
          <p className="fm-final-position">
            {teamName} finished <strong>{ordinal(position)}</strong>
          </p>
          <p>
            {position === 1
              ? 'Champions! The fans will be singing about this one for years.'
              : position <= 3
                ? 'A strong season. The title is within reach.'
                : position <= 5
                  ? 'Mid-table. The board expects more next year.'
                  : 'Bottom of the league. Time to rethink the squad.'}
          </p>
          <div className="fm-buttons">
            <button type="button" className="button" onClick={() => setSeason(newSeason())}>
              Play another season
            </button>
            <button type="button" className="button secondary" onClick={onNewSquad}>
              Pick a new squad
            </button>
          </div>
        </section>
      ) : (
        <section className="fm-card">
          <p className="fm-matchday">
            Matchday {season.round + 1} of {rounds.length}
          </p>
          <h2 className="fm-next">
            {names[nextFixture!.home]} <span>vs</span> {names[nextFixture!.away]}
          </h2>

          <div className="fm-tactics" role="radiogroup" aria-label="Tactic">
            {TACTICS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={tactic === t.value}
                className={tactic === t.value ? 'active' : ''}
                onClick={() => setTactic(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="fm-strength">
            ATT <strong>{Math.round(strength.attack)}</strong> · DEF{' '}
            <strong>{Math.round(strength.defence)}</strong>
          </p>

          <button type="button" className="button" onClick={playMatch}>
            Play match
          </button>
        </section>
      )}

      {lastResult && (
        <section className="fm-card">
          <h2 className="fm-section-title">
            Last result <span className={`fm-badge ${outcome(lastResult)}`}>{outcome(lastResult)}</span>
          </h2>
          <p className="fm-score">
            {names[lastResult.home]} <strong>{lastResult.homeGoals}</strong> –{' '}
            <strong>{lastResult.awayGoals}</strong> {names[lastResult.away]}
          </p>
          {lastResult.events.length === 0 ? (
            <p className="fm-muted">No goals.</p>
          ) : (
            <ul className="fm-events">
              {lastResult.events.map((e, i) => (
                <li key={i} className={e.teamId === USER_TEAM_ID ? 'mine' : ''}>
                  <span className="fm-minute">{e.minute}'</span>
                  {e.scorer ? `⚽ ${e.scorer}` : `Goal for ${names[e.teamId]}`}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {season.userResults.length > 0 && (
        <div className="fm-form" aria-label="Form">
          Form
          {season.userResults.slice(-5).map((r, i) => (
            <span key={i} className={`fm-badge ${outcome(r)}`}>
              {outcome(r)}
            </span>
          ))}
        </div>
      )}

      <section className="fm-card">
        <h2 className="fm-section-title">League table</h2>
        <table className="fm-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="team">Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {season.table.map((row, i) => (
              <tr key={row.teamId} className={row.teamId === USER_TEAM_ID ? 'mine' : ''}>
                <td>{i + 1}</td>
                <td className="team">{names[row.teamId]}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.goalsFor - row.goalsAgainst}</td>
                <td>
                  <strong>{row.points}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="fm-card">
        <h2 className="fm-section-title">Your squad</h2>
        <ul className="fm-squad">
          {squad.map((p) => (
            <li key={p.id}>
              <span className="fm-pos">{p.position}</span>
              <span className="fm-name">{p.name}</span>
              <span className="fm-rating">{p.rating}</span>
            </li>
          ))}
        </ul>
        {!finished && season.round > 0 && (
          <button type="button" className="link-button" onClick={onNewSquad}>
            Abandon season and pick a new squad
          </button>
        )}
      </section>
    </>
  )
}

export default SeasonView
