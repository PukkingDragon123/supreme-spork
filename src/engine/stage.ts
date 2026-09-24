import { Surface } from './pixel'

export interface PointerInfo {
  type: 'down' | 'move' | 'up' | 'cancel'
  /** Virtual pixel coordinates (screen space, not world space). */
  x: number
  y: number
  id: number
  /** Movement since the last event, in virtual pixels. */
  dx: number
  dy: number
}

export interface Scene {
  /** Called whenever the virtual resolution changes. */
  resize?(w: number, h: number): void
  update(dt: number, time: number): void
  render(g: Surface): void
  pointer?(e: PointerInfo): void
  dispose?(): void
}

export interface StageOptions {
  /** Desired virtual width; the real width adapts so scaling stays integer. */
  targetWidth?: number
  /** Optional cap on virtual height (useful for close-up mini games). */
  maxHeight?: number
}

/**
 * Hosts a pixel canvas inside a DOM element. It picks an integer device-pixel
 * scale so art pixels never blur, runs the animation loop and forwards
 * pointer input in virtual pixel coordinates.
 */
export class Stage {
  readonly surface: Surface
  readonly el: HTMLCanvasElement
  scale = 1
  cssScale = 1
  private raf = 0
  private last = 0
  private time = 0
  private ro?: ResizeObserver
  private lastPt = new Map<number, [number, number]>()
  private running = false
  private scene: Scene | null = null

  constructor(
    private host: HTMLElement,
    private opts: StageOptions = {},
  ) {
    this.el = document.createElement('canvas')
    this.el.className = 'pixel-canvas'
    this.el.style.position = 'absolute'
    this.el.style.left = '0'
    this.el.style.top = '0'
    this.el.style.touchAction = 'none'
    this.surface = new Surface(16, 16, this.el)
    host.appendChild(this.el)
    this.fit()
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.fit())
      this.ro.observe(host)
    } else {
      window.addEventListener('resize', this.fit)
    }
    this.el.addEventListener('pointerdown', this.onPointer)
    this.el.addEventListener('pointermove', this.onPointer)
    this.el.addEventListener('pointerup', this.onPointer)
    this.el.addEventListener('pointercancel', this.onPointer)
    this.el.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  setScene(scene: Scene | null) {
    this.scene?.dispose?.()
    this.scene = scene
    if (scene) scene.resize?.(this.surface.w, this.surface.h)
  }

  get width() {
    return this.surface.w
  }
  get height() {
    return this.surface.h
  }

  fit = () => {
    const rect = this.host.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const devW = Math.max(1, Math.round(rect.width * dpr))
    const devH = Math.max(1, Math.round(rect.height * dpr))
    const target = this.opts.targetWidth ?? 180
    const scale = Math.max(1, Math.round(devW / target))
    let w = Math.ceil(devW / scale)
    let h = Math.ceil(devH / scale)
    if (this.opts.maxHeight && h > this.opts.maxHeight) h = this.opts.maxHeight
    w = Math.max(16, w)
    h = Math.max(16, h)
    this.scale = scale
    this.cssScale = scale / dpr
    this.surface.resize(w, h)
    this.el.style.width = `${(w * scale) / dpr}px`
    this.el.style.height = `${(h * scale) / dpr}px`
    // Centre vertically when the height was capped.
    const cssH = (h * scale) / dpr
    this.el.style.top = cssH < rect.height ? `${Math.round((rect.height - cssH) / 2)}px` : '0'
    this.scene?.resize?.(w, h)
  }

  /** Convert virtual pixel coordinates to CSS pixels relative to the host. */
  toCss(x: number, y: number): [number, number] {
    const top = parseFloat(this.el.style.top || '0')
    return [x * this.cssScale, y * this.cssScale + top]
  }

  private onPointer = (ev: PointerEvent) => {
    if (!this.scene?.pointer) return
    const r = this.el.getBoundingClientRect()
    const x = ((ev.clientX - r.left) / r.width) * this.surface.w
    const y = ((ev.clientY - r.top) / r.height) * this.surface.h
    const map: Record<string, PointerInfo['type']> = {
      pointerdown: 'down',
      pointermove: 'move',
      pointerup: 'up',
      pointercancel: 'cancel',
    }
    const type = map[ev.type]
    if (type === 'down') {
      try {
        this.el.setPointerCapture(ev.pointerId)
      } catch {
        /* ignore */
      }
    }
    const prev = this.lastPt.get(ev.pointerId) ?? [x, y]
    if (type === 'up' || type === 'cancel') this.lastPt.delete(ev.pointerId)
    else this.lastPt.set(ev.pointerId, [x, y])
    this.scene.pointer({ type, x, y, id: ev.pointerId, dx: x - prev[0], dy: y - prev[1] })
    if (type === 'down') ev.preventDefault()
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const tick = (now: number) => {
      if (!this.running) return
      // Clamp dt so a backgrounded tab doesn't make things jump.
      const dt = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      this.time += dt
      if (this.scene) {
        this.scene.update(dt, this.time)
        this.surface.reset()
        this.surface.setCamera(0, 0)
        this.scene.render(this.surface)
      }
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  destroy() {
    this.stop()
    this.scene?.dispose?.()
    this.scene = null
    this.ro?.disconnect()
    window.removeEventListener('resize', this.fit)
    this.el.remove()
  }
}
