import type { AiTeam, Player } from './logic'

// All names are fictional.
export const PLAYERS: Player[] = [
  { id: 'gk1', name: 'Tom Hartley', position: 'GK', rating: 86, price: 14 },
  { id: 'gk2', name: 'Luis Moreno', position: 'GK', rating: 78, price: 9 },
  { id: 'gk3', name: 'Danny Cole', position: 'GK', rating: 70, price: 5 },
  { id: 'gk4', name: 'Sam Pike', position: 'GK', rating: 62, price: 2 },

  { id: 'df1', name: 'Marcus Reid', position: 'DEF', rating: 88, price: 16 },
  { id: 'df2', name: 'Jonas Berg', position: 'DEF', rating: 81, price: 11 },
  { id: 'df3', name: 'Kofi Mensah', position: 'DEF', rating: 76, price: 8 },
  { id: 'df4', name: 'Ryan Walsh', position: 'DEF', rating: 69, price: 5 },
  { id: 'df5', name: 'Alfie Grant', position: 'DEF', rating: 60, price: 2 },

  { id: 'md1', name: 'Mateo Silva', position: 'MID', rating: 90, price: 18 },
  { id: 'md2', name: 'Harry Doyle', position: 'MID', rating: 83, price: 12 },
  { id: 'md3', name: 'Yusuf Kaya', position: 'MID', rating: 79, price: 10 },
  { id: 'md4', name: 'Callum Fraser', position: 'MID', rating: 74, price: 7 },
  { id: 'md5', name: 'Ben Okafor', position: 'MID', rating: 67, price: 4 },
  { id: 'md6', name: 'Leo Marsh', position: 'MID', rating: 59, price: 2 },

  { id: 'fw1', name: 'Adrian Costa', position: 'FWD', rating: 91, price: 19 },
  { id: 'fw2', name: 'Jamie Foster', position: 'FWD', rating: 84, price: 13 },
  { id: 'fw3', name: 'Ibrahim Diallo', position: 'FWD', rating: 77, price: 9 },
  { id: 'fw4', name: 'Owen Price', position: 'FWD', rating: 71, price: 6 },
  { id: 'fw5', name: 'Charlie Webb', position: 'FWD', rating: 63, price: 3 },
]

export const AI_TEAMS: AiTeam[] = [
  { id: 'riverside', name: 'Riverside Rovers', attack: 80, defence: 77 },
  { id: 'hillcrest', name: 'Hillcrest Athletic', attack: 76, defence: 80 },
  { id: 'dockyard', name: 'Dockyard United', attack: 74, defence: 72 },
  { id: 'northgate', name: 'Northgate Town', attack: 70, defence: 71 },
  { id: 'meadow', name: 'Meadow Park', attack: 66, defence: 68 },
]

export const BUDGET = 50
