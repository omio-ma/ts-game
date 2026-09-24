import { useState } from 'react'
import { AI_TEAMS } from './data'
import type { Player } from './logic'
import SeasonView from './SeasonView'
import SquadPicker from './SquadPicker'
import './first-game.css'

function FirstGame() {
  const [teamName, setTeamName] = useState('Kickabout FC')
  const [squad, setSquad] = useState<Player[] | null>(null)

  return (
    <main className="page fm">
      <a className="back-link" href="#/">
        ← Back to games
      </a>
      <h1>Five-a-Side Manager</h1>
      {squad ? (
        <SeasonView
          teamName={teamName}
          squad={squad}
          aiTeams={AI_TEAMS}
          onNewSquad={() => setSquad(null)}
        />
      ) : (
        <SquadPicker teamName={teamName} onTeamNameChange={setTeamName} onConfirm={setSquad} />
      )}
    </main>
  )
}

export default FirstGame
