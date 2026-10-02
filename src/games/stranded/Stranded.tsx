import { useEffect, useRef, useState } from 'react'
import { createInput } from './input'
import { generateMap } from './map'
import { newPilot, stepPilot } from './movement'
import { drawScene } from './render'
import './stranded.css'

// Longest step simulated in one frame, so a stalled tab doesn't teleport her.
const MAX_DT = 1 / 20

function Stranded() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const map = generateMap()
    const input = createInput(canvas)
    let pilot = newPilot(map.spawn.x, map.spawn.y)
    let viewW = 0
    let viewH = 0
    let hasMoved = false
    // Ease the walk and run animations in and out, so she doesn't snap between them.
    let walkBlend = 0
    let runBlend = 0

    // Match the canvas to its on-screen size and the screen's pixel density.
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      viewW = canvas.clientWidth
      viewH = canvas.clientHeight
      canvas.width = Math.round(viewW * dpr)
      canvas.height = Math.round(viewH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    let last = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min((now - last) / 1000, MAX_DT)
      last = now
      const dir = input.direction()
      pilot = stepPilot(map, pilot, dir, dt, input.running())
      if (!hasMoved && (dir.x !== 0 || dir.y !== 0)) {
        hasMoved = true
        setMoved(true)
      }
      const ease = Math.min(1, dt * 10)
      walkBlend += ((pilot.moving ? 1 : 0) - walkBlend) * ease
      runBlend += ((pilot.running ? 1 : 0) - runBlend) * ease
      drawScene(ctx, map, pilot, input.joystick(), viewW, viewH, { time: now / 1000, walkBlend, runBlend })
      frame = requestAnimationFrame(tick)
    })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      input.dispose()
    }
  }, [])

  return (
    <main className="stranded">
      <canvas ref={canvasRef} className="stranded-canvas" aria-label="Stranded: the planet surface" />
      <a className="stranded-back" href="#/">
        ← Games
      </a>
      <p className={`stranded-hint${moved ? ' stranded-hint-hidden' : ''}`}>
        Move with WASD or the arrow keys, hold Shift to run. On a touch screen, press and drag.
      </p>
    </main>
  )
}

export default Stranded
