import { useState } from 'react'
import { BUDGET, PLAYERS } from './data'
import { SQUAD_SIZE, squadCost, squadProblem, squadStrength, type Player, type Position } from './logic'

const POSITIONS: { position: Position; label: string }[] = [
  { position: 'GK', label: 'Goalkeepers' },
  { position: 'DEF', label: 'Defenders' },
  { position: 'MID', label: 'Midfielders' },
  { position: 'FWD', label: 'Forwards' },
]

type Props = {
  teamName: string
  onTeamNameChange: (name: string) => void
  onConfirm: (squad: Player[]) => void
}

function SquadPicker({ teamName, onTeamNameChange, onConfirm }: Props) {
  const [selected, setSelected] = useState<Player[]>([])
  const remaining = BUDGET - squadCost(selected)
  const problem = squadProblem(selected, BUDGET)
  const strength = squadStrength(selected, 'balanced')
  const hasKeeper = selected.some((p) => p.position === 'GK')

  const isSelected = (player: Player) => selected.some((p) => p.id === player.id)

  function toggle(player: Player) {
    setSelected((current) =>
      isSelected(player) ? current.filter((p) => p.id !== player.id) : [...current, player],
    )
  }

  function cannotAdd(player: Player) {
    if (isSelected(player)) return false
    return (
      selected.length >= SQUAD_SIZE ||
      player.price > remaining ||
      (player.position === 'GK' && hasKeeper)
    )
  }

  return (
    <>
      <p className="fm-intro">
        Sign 5 players with a £{BUDGET}m budget: one goalkeeper, plus at least one defender,
        midfielder and forward. Then take them through a 10-match league season.
      </p>

      <label className="fm-field">
        Team name
        <input
          value={teamName}
          maxLength={24}
          onChange={(e) => onTeamNameChange(e.target.value)}
        />
      </label>

      <div className="fm-summary">
        <div>
          <strong>£{remaining}m</strong> left
        </div>
        <div>
          <strong>
            {selected.length}/{SQUAD_SIZE}
          </strong>{' '}
          players
        </div>
        <div>
          ATT <strong>{Math.round(strength.attack)}</strong> · DEF{' '}
          <strong>{Math.round(strength.defence)}</strong>
        </div>
      </div>

      {POSITIONS.map(({ position, label }) => (
        <section key={position} className="fm-group">
          <h2>{label}</h2>
          <ul className="fm-players">
            {PLAYERS.filter((p) => p.position === position).map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  className={`fm-player${isSelected(player) ? ' selected' : ''}`}
                  aria-pressed={isSelected(player)}
                  disabled={cannotAdd(player)}
                  onClick={() => toggle(player)}
                >
                  <span className="fm-rating">{player.rating}</span>
                  <span className="fm-name">{player.name}</span>
                  <span className="fm-price">£{player.price}m</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="fm-actions">
        {problem && selected.length > 0 && <p className="fm-hint">{problem}</p>}
        <button
          type="button"
          className="button"
          disabled={problem !== null || teamName.trim() === ''}
          onClick={() => onConfirm(selected)}
        >
          Start season
        </button>
      </div>
    </>
  )
}

export default SquadPicker
