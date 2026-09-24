import { useEffect, useState } from 'react'

// Hash-based routing (e.g. #/first-game) works on GitHub Pages without
// server-side rewrites, and keeps the browser back button working.
function currentRoute() {
  return window.location.hash.replace(/^#/, '') || '/'
}

export function useHashRoute() {
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const onChange = () => {
      setRoute(currentRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
