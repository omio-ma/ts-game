import { clampDirection, type Vec } from './movement'

/** How far (CSS px) the thumb drags for full speed. */
export const JOYSTICK_RADIUS = 56
const DEAD_ZONE = 0.15

const KEYS: Record<string, Vec> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

export interface Joystick {
  /** Where the thumb went down, in CSS px relative to the canvas. */
  origin: Vec
  /** The knob, kept within JOYSTICK_RADIUS of the origin. */
  knob: Vec
}

/**
 * WASD / arrow keys on desktop (Shift to run), and on touch screens a virtual
 * joystick (press anywhere and drag) plus a Run button to hold with the other
 * thumb. Both produce one direction of length 0..1.
 */
export function createInput(canvas: HTMLCanvasElement, runButton: HTMLElement) {
  const pressed = new Set<string>()
  let pointerId: number | null = null
  let stick: Joystick | null = null
  // Pointers currently holding the Run button.
  const runPointers = new Set<number>()

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pressed.add(e.code)
    if (!(e.code in KEYS)) return
    pressed.add(e.code)
    e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent) => pressed.delete(e.code)
  const onBlur = () => {
    pressed.clear()
    runPointers.clear()
    setRunHeld()
  }

  const local = (e: PointerEvent): Vec => {
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || pointerId !== null) return
    pointerId = e.pointerId
    const p = local(e)
    stick = { origin: p, knob: p }
    // Keep receiving moves if the thumb slides off the canvas. Can throw if the
    // pointer is already gone, which is harmless here.
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId || !stick) return
    const p = local(e)
    const dx = p.x - stick.origin.x
    const dy = p.y - stick.origin.y
    const scale = Math.min(1, JOYSTICK_RADIUS / (Math.hypot(dx, dy) || 1))
    stick = { origin: stick.origin, knob: { x: stick.origin.x + dx * scale, y: stick.origin.y + dy * scale } }
  }
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    pointerId = null
    stick = null
  }

  const setRunHeld = () => {
    if (runPointers.size > 0) runButton.dataset.held = ''
    else delete runButton.dataset.held
  }
  const onRunDown = (e: PointerEvent) => {
    e.preventDefault()
    runPointers.add(e.pointerId)
    try {
      runButton.setPointerCapture(e.pointerId)
    } catch {
      // ignore, as for the joystick
    }
    setRunHeld()
  }
  const onRunUp = (e: PointerEvent) => {
    runPointers.delete(e.pointerId)
    setRunHeld()
  }
  // A long press would otherwise open the browser's context menu.
  const onRunMenu = (e: Event) => e.preventDefault()

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  runButton.addEventListener('pointerdown', onRunDown)
  runButton.addEventListener('pointerup', onRunUp)
  runButton.addEventListener('pointercancel', onRunUp)
  runButton.addEventListener('contextmenu', onRunMenu)

  return {
    direction(): Vec {
      if (stick) {
        const x = (stick.knob.x - stick.origin.x) / JOYSTICK_RADIUS
        const y = (stick.knob.y - stick.origin.y) / JOYSTICK_RADIUS
        return Math.hypot(x, y) < DEAD_ZONE ? { x: 0, y: 0 } : { x, y }
      }
      let x = 0
      let y = 0
      for (const code of pressed) {
        if (!(code in KEYS)) continue
        x += KEYS[code].x
        y += KEYS[code].y
      }
      return clampDirection({ x: Math.sign(x), y: Math.sign(y) })
    },
    /** Shift or the Run button held: run. */
    running: () => pressed.has('ShiftLeft') || pressed.has('ShiftRight') || runPointers.size > 0,
    joystick: () => stick,
    dispose() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      runButton.removeEventListener('pointerdown', onRunDown)
      runButton.removeEventListener('pointerup', onRunUp)
      runButton.removeEventListener('pointercancel', onRunUp)
      runButton.removeEventListener('contextmenu', onRunMenu)
    },
  }
}
