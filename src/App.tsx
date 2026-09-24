import FirstGame from './games/first-game/FirstGame'
import { useHashRoute } from './useHashRoute'

function Landing() {
  return (
    <main className="page landing">
      <h1>TS Games</h1>
      <p className="tagline">A collection of small browser games built with React and TypeScript.</p>
      <section className="games">
        <h2>Games</h2>
        <a className="button" href="#/first-game">
          First game
        </a>
      </section>
      <footer>
        <a href="https://github.com/omio-ma/ts-game">View the source on GitHub</a>
      </footer>
    </main>
  )
}

function App() {
  const route = useHashRoute()

  switch (route) {
    case '/first-game':
      return <FirstGame />
    default:
      return <Landing />
  }
}

export default App
