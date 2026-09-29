// ThaiMapScene – the illustrated travel map of Thailand. Drag to pan (with
// inertia), pinch or double-tap to zoom 1×/2×, tap a landmark to select it.
// The country is baked once (src/art/thaimap.ts); this scene only animates
// the sea, boats, a plane, clouds, lanterns and the landmark pins on top.

import type { PointerInfo, Scene } from '../engine/stage'
import { bake, Surface, type Color } from '../engine/pixel'
import { cached, type Sprite } from '../engine/sprite'
import { drawText, textWidth } from '../engine/font'
import { bakeCloud, glint, softGlow } from '../art/cinematic'
import { cityPoints, ICON_BASE, ICON_H, ICON_W, mapData, mapLabels, MC, placeIconArt, seededRand, smoothPath, thaiMapArt } from '../art/thaimap'
import { ALL_PLACES, BANGKOK, INSET, MAP, PLACE_BY_ID, proj, type Place } from '../game/data/places'
import { hubCrowd } from '../game/hubs'

export interface ThaiMapCallbacks {
  /** A pin was tapped (also fires when re-tapping the selected pin). */
  onSelect?(placeId: string): void
  /** The player tapped empty map while a pin was selected. */
  onDeselect?(): void
}

export interface ThaiMapState {
  unlocked: (id: string) => boolean
  current: string | null
  visited?: string[]
  /** Night look: dimmed map, glowing towns, pins and lanterns. */
  night?: boolean
}

/** Landmark icon for DOM cards (24×26, transparent, plum outline). */
export function placeIcon(id: string, locked = false): Sprite {
  return placeIconArt(id, locked)
}

interface Wave {
  x: number
  y: number
  ph: number
  len: number
  c: Color
}

interface Boat {
  path: [number, number][]
  speed: number
  t: number
  kind: 'longtail' | 'ferry' | 'sail' | 'ship' | 'fishing'
  loop: boolean
  dir: 1 | -1
}

interface Cloud {
  x: number
  y: number
  sp: number
  img: HTMLCanvasElement
}

const HIT_W = 11
const HIT_UP = 24
const HIT_DOWN = 5

export class ThaiMapScene implements Scene {
  selected: string | null = null
  private opts: Required<ThaiMapState>
  private vw = 200
  private vh = 400
  private zoom = 1
  private camX = 0
  private camY = 0
  private velX = 0
  private velY = 0
  private target: { x: number; y: number } | null = null
  private insetTop = 0
  private insetBottom = 0
  private time = 0
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>()
  private dragMoved = 0
  private pinchStart = 0
  private pinchDone = false
  private lastTap = { t: -1, x: 0, y: 0 }
  private lastMove = { vx: 0, vy: 0 }
  private view: Surface | null = null
  private waves: Wave[] = []
  private shimmer: number[] = []
  private boats: Boat[] = []
  private clouds: Cloud[] = []
  private lanterns: { x: number; y: number; ph: number; sp: number }[] = []
  private selT = 0
  private placed: Place[]
  private initialised = false

  constructor(opts: ThaiMapState, private cb: ThaiMapCallbacks = {}) {
    this.opts = { visited: [], night: false, ...opts }
    this.placed = [...ALL_PLACES].sort((a, b) => a.y - b.y)
    this.buildAmbient()
    // Start centred on Bangkok and its lens.
    this.camX = BANGKOK.x - 100
    this.camY = BANGKOK.y - 120
  }

  setState(opts: Partial<ThaiMapState>) {
    this.opts = { ...this.opts, ...opts, visited: opts.visited ?? this.opts.visited, night: opts.night ?? this.opts.night }
  }

  /** Reserve screen space (virtual px) covered by DOM UI above and below the map. */
  setInsets(top: number, bottom: number) {
    this.insetTop = Math.max(0, top)
    this.insetBottom = Math.max(0, bottom)
    if (this.target) this.retarget()
  }

  /** Select a pin programmatically (no callback). Pass null to clear. */
  select(id: string | null) {
    this.selected = id && PLACE_BY_ID[id] ? id : null
    this.selT = 0
  }

  private focusId: string | null = null

  /** Smoothly pan so a place sits in the middle of the visible band. */
  focus(placeId: string, instant = false) {
    if (!PLACE_BY_ID[placeId]) return
    this.focusId = placeId
    this.retarget()
    this.velX = this.velY = 0
    if (instant && this.target) {
      this.camX = this.target.x
      this.camY = this.target.y
      this.target = null
    }
  }

  private retarget() {
    const p = this.focusId ? PLACE_BY_ID[this.focusId] : null
    if (!p) return
    const bandH = (this.vh - this.insetTop - this.insetBottom) / this.zoom
    const t = this.clampCam(p.x - this.vw / this.zoom / 2, p.y - 10 - this.insetTop / this.zoom - bandH / 2)
    this.target = { x: t[0], y: t[1] }
  }

  getZoom() {
    return this.zoom
  }

  /** Integer zoom (1 or 2) around a screen point (defaults to the band centre). */
  setZoom(z: number, sx = this.vw / 2, sy = (this.insetTop + this.vh - this.insetBottom) / 2) {
    const nz = z >= 2 ? 2 : 1
    if (nz === this.zoom) return
    const wx = this.camX + sx / this.zoom
    const wy = this.camY + sy / this.zoom
    this.zoom = nz
    const [cx, cy] = this.clampCam(wx - sx / nz, wy - sy / nz)
    this.camX = cx
    this.camY = cy
    this.target = null
    if (this.focusId) this.retarget()
  }

  /** Screen position (virtual px) of a place's pin base, for DOM overlays. */
  screenPos(id: string): { x: number; y: number } | null {
    const p = PLACE_BY_ID[id]
    if (!p) return null
    return { x: (p.x - this.camX) * this.zoom, y: (p.y - this.camY) * this.zoom }
  }

  resize(w: number, h: number) {
    this.vw = w
    this.vh = h
    if (!this.initialised) {
      this.initialised = true
      this.camX = BANGKOK.x - w / 2
      this.camY = INSET.cy - 20 - h / 2
      if (this.opts.current && PLACE_BY_ID[this.opts.current]) {
        this.focusId = this.opts.current
        this.retarget()
        if (this.target) [this.camX, this.camY] = [this.target.x, this.target.y]
        this.target = null
      }
    }
    const [x, y] = this.clampCam(this.camX, this.camY)
    this.camX = x
    this.camY = y
    if (this.focusId && this.target) this.retarget()
  }

  private clampCam(x: number, y: number): [number, number] {
    const W = MAP.W
    const H = MAP.H
    const vw = this.vw / this.zoom
    const top = this.insetTop / this.zoom
    const band = (this.vh - this.insetTop - this.insetBottom) / this.zoom
    const cx = vw >= W ? (W - vw) / 2 : Math.max(0, Math.min(W - vw, x))
    const minY = -top
    const maxY = H - band - top
    const cy = band >= H ? (H - band) / 2 - top : Math.max(minY, Math.min(maxY, y))
    return [cx, cy]
  }

  // -------------------------------------------------------------------------
  // Ambient setup

  private buildAmbient() {
    const { W, H, kind, seaDist } = mapData()
    const r = seededRand(2024)
    const inLens = (x: number, y: number, pad: number) => Math.hypot(x - INSET.cx, y - INSET.cy) < INSET.r + pad
    const nearCompass = (x: number, y: number) => Math.hypot(x - 36, y - 376) < 26
    const clearSea = (x: number, y: number, len: number) => {
      for (let k = -2; k <= len + 2; k++) {
        const i = y * W + x + k
        if (kind[i] !== 0 || seaDist[i] < 5) return false
      }
      return true
    }
    for (let n = 0; n < 2400 && this.waves.length < 260; n++) {
      const x = Math.floor(MAP.PAD + r() * (W - 2 * MAP.PAD - 6))
      const y = Math.floor(MAP.PAD + r() * (H - 2 * MAP.PAD))
      if (!clearSea(x, y, 4) || inLens(x, y, 8) || nearCompass(x, y)) continue
      const d = seaDist[y * W + x]
      this.waves.push({ x, y, ph: r(), len: 3 + Math.floor(r() * 2), c: d > 20 ? '#8ccbe8' : '#c8f2f6' })
    }
    for (let y = MAP.PAD; y < H - MAP.PAD; y++)
      for (let x = MAP.PAD; x < W - MAP.PAD; x++) {
        const i = y * W + x
        if (kind[i] === 0 && seaDist[i] === 2 && !inLens(x, y, 6)) this.shimmer.push(i)
      }
    const P = (lo: number, la: number): [number, number] => proj(lo, la)
    this.boats = [
      { kind: 'ferry', path: [P(99.72, 9.24), P(99.86, 9.36), P(99.95, 9.47)], speed: 5, t: 0.2, loop: false, dir: 1 },
      { kind: 'longtail', path: [P(98.84, 8.0), P(98.8, 7.8), P(98.68, 7.72), P(98.62, 7.85), P(98.74, 7.98)], speed: 4, t: 0, loop: true, dir: 1 },
      { kind: 'longtail', path: [P(99.2, 7.2), P(99.35, 7.05), P(99.5, 6.9), P(99.3, 6.8), P(99.1, 7.0)], speed: 4, t: 0.5, loop: true, dir: 1 },
      { kind: 'sail', path: [P(97.6, 8.0), P(97.3, 7.4), P(97.8, 6.9), P(98.1, 7.5)], speed: 3, t: 0.3, loop: true, dir: 1 },
      { kind: 'ship', path: [P(96.95, 6.3), P(98.0, 5.9), P(99.4, 5.7)], speed: 3.2, t: 0.1, loop: false, dir: 1 },
      { kind: 'ship', path: [P(102.0, 7.2), P(103.2, 8.4), P(104.3, 9.3)], speed: 3.5, t: 0.6, loop: false, dir: 1 },
      { kind: 'fishing', path: [P(100.9, 7.9), P(101.1, 8.1), P(100.95, 8.25)], speed: 1.2, t: 0, loop: true, dir: 1 },
      { kind: 'fishing', path: [P(100.35, 12.2), P(100.55, 12.0), P(100.45, 11.85)], speed: 1.2, t: 0.4, loop: true, dir: 1 },
      { kind: 'sail', path: [P(101.4, 12.4), P(101.8, 12.2), P(101.6, 12.0)], speed: 2, t: 0.1, loop: true, dir: 1 },
      { kind: 'longtail', path: [P(102.2, 11.9), P(102.3, 11.7), P(102.45, 11.6), P(102.4, 11.9)], speed: 3, t: 0.2, loop: true, dir: 1 },
    ]
    const cols: [Color, Color, Color][] = [['#ffffff', '#f4f6ff', '#d8e0f4']]
    for (let i = 0; i < 7; i++) {
      const w = 26 + Math.floor(r() * 22)
      this.clouds.push({ x: r() * (W + 80) - 40, y: 40 + r() * (H - 120), sp: 2 + r() * 2.5, img: bakeCloud(w, 11 + i * 7, ...cols[0]) })
    }
    const [cmx, cmy] = proj(98.99, 18.79)
    for (let i = 0; i < 7; i++) this.lanterns.push({ x: cmx - 10 + r() * 20, y: cmy, ph: r(), sp: 0.07 + r() * 0.05 })
  }

  // -------------------------------------------------------------------------
  // Update

  update(dt0: number, _time?: number) {
    const dt = Math.max(0, dt0)
    this.time += dt
    this.selT += dt
    for (const b of this.boats) b.t += (dt * b.speed) / 100
    for (const c of this.clouds) {
      c.x += c.sp * dt
      if (c.x > MAP.W + 40) c.x = -c.img.width - 30
    }
    const dragging = this.pointers.size > 0
    if (this.target && !dragging) {
      const k = 1 - Math.exp(-7 * dt)
      this.camX += (this.target.x - this.camX) * k
      this.camY += (this.target.y - this.camY) * k
      if (Math.abs(this.target.x - this.camX) < 0.3 && Math.abs(this.target.y - this.camY) < 0.3) {
        this.camX = this.target.x
        this.camY = this.target.y
        this.target = null
      }
    } else if (!dragging && (Math.abs(this.velX) > 0.5 || Math.abs(this.velY) > 0.5)) {
      this.camX += this.velX * dt
      this.camY += this.velY * dt
      const f = Math.exp(-4.5 * dt)
      this.velX *= f
      this.velY *= f
      const [cx, cy] = this.clampCam(this.camX, this.camY)
      if (cx !== this.camX) this.velX = 0
      if (cy !== this.camY) this.velY = 0
      this.camX = cx
      this.camY = cy
    }
  }

  // -------------------------------------------------------------------------
  // Input

  pointer(e: PointerInfo) {
    const now = this.time
    if (e.type === 'down') {
      this.pointers.set(e.id, { x: e.x, y: e.y, sx: e.x, sy: e.y, t: now })
      this.target = null
      this.velX = this.velY = 0
      if (this.pointers.size === 1) this.dragMoved = 0
      if (this.pointers.size === 2) {
        this.pinchStart = this.pinchDist()
        this.pinchDone = false
      }
      return
    }
    const p = this.pointers.get(e.id)
    if (!p) return
    if (e.type === 'move') {
      const dx = e.x - p.x
      const dy = e.y - p.y
      p.x = e.x
      p.y = e.y
      if (this.pointers.size >= 2) {
        const d = this.pinchDist()
        const mid = this.pinchMid()
        if (!this.pinchDone && this.pinchStart > 0) {
          if (d / this.pinchStart > 1.35 && this.zoom === 1) {
            this.setZoom(2, mid.x, mid.y)
            this.pinchDone = true
          } else if (d / this.pinchStart < 0.74 && this.zoom === 2) {
            this.setZoom(1, mid.x, mid.y)
            this.pinchDone = true
          }
        }
        this.dragMoved = 99
        this.camX -= dx / this.zoom / 2
        this.camY -= dy / this.zoom / 2
      } else {
        this.dragMoved += Math.abs(dx) + Math.abs(dy)
        if (this.dragMoved > 3) {
          this.camX -= dx / this.zoom
          this.camY -= dy / this.zoom
          const dtt = Math.max(1 / 120, now - p.t)
          const vx = -dx / this.zoom / dtt
          const vy = -dy / this.zoom / dtt
          this.lastMove.vx = this.lastMove.vx * 0.5 + vx * 0.5
          this.lastMove.vy = this.lastMove.vy * 0.5 + vy * 0.5
        }
      }
      p.t = now
      const [cx, cy] = this.clampCam(this.camX, this.camY)
      this.camX = cx
      this.camY = cy
      return
    }
    // up / cancel
    this.pointers.delete(e.id)
    if (e.type === 'cancel') return
    if (this.pointers.size > 0) return
    if (this.dragMoved > 3) {
      const idle = now - p.t
      if (idle < 0.08) {
        const cap = 600
        this.velX = Math.max(-cap, Math.min(cap, this.lastMove.vx))
        this.velY = Math.max(-cap, Math.min(cap, this.lastMove.vy))
      }
      this.lastMove = { vx: 0, vy: 0 }
      return
    }
    this.tap(e.x, e.y, now)
  }

  private pinchDist() {
    const [a, b] = [...this.pointers.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  private pinchMid() {
    const [a, b] = [...this.pointers.values()]
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: this.vw / 2, y: this.vh / 2 }
  }

  /** The pin under a screen point, if any. */
  pickAt(sx: number, sy: number): string | null {
    const wx = this.camX + sx / this.zoom
    const wy = this.camY + sy / this.zoom
    let best: string | null = null
    let bestD = Infinity
    for (const p of this.placed) {
      const dx = wx - p.x
      const dy = wy - (p.y - 9)
      if (Math.abs(dx) > HIT_W || wy < p.y - HIT_UP || wy > p.y + HIT_DOWN) continue
      const d = dx * dx + dy * dy * 0.6
      if (d < bestD) {
        bestD = d
        best = p.id
      }
    }
    return best
  }

  private tap(sx: number, sy: number, now: number) {
    const id = this.pickAt(sx, sy)
    if (id) {
      this.lastTap.t = -1
      this.select(id)
      this.focus(id)
      this.cb.onSelect?.(id)
      return
    }
    // Double-tap on empty map toggles zoom.
    if (now - this.lastTap.t < 0.32 && Math.hypot(sx - this.lastTap.x, sy - this.lastTap.y) < 12) {
      this.setZoom(this.zoom === 1 ? 2 : 1, sx, sy)
      this.lastTap.t = -1
      return
    }
    this.lastTap = { t: now, x: sx, y: sy }
    if (this.selected) {
      this.selected = null
      this.focusId = null
      this.cb.onDeselect?.()
    }
  }

  // -------------------------------------------------------------------------
  // Render

  render(g: Surface) {
    const z = this.zoom
    let s = g
    if (z > 1) {
      const w = Math.ceil(this.vw / z) + 1
      const h = Math.ceil(this.vh / z) + 1
      if (!this.view) this.view = new Surface(w, h)
      else this.view.resize(w, h)
      s = this.view
    }
    const cx = Math.round(this.camX)
    const cy = Math.round(this.camY)
    s.reset()
    s.setCamera(0, 0)
    s.ctx.drawImage(tableTile(), 0, 0)
    this.drawTable(s, cx, cy)
    s.setCamera(cx, cy)
    const art = thaiMapArt()
    s.draw(art.base, 0, 0)
    this.drawSea(s)
    this.drawBoats(s)
    s.draw(mapLabels(), 0, 0)
    if (this.opts.night) this.drawNight(s)
    this.drawGlows(s)
    this.drawRoute(s)
    this.drawPins(s)
    this.drawPlane(s)
    this.drawClouds(s)
    s.setCamera(0, 0)
    if (z > 1) {
      g.setCamera(0, 0)
      g.ctx.drawImage(s.canvas, 0, 0, s.w, s.h, 0, 0, s.w * z, s.h * z)
    }
  }

  private drawTable(s: Surface, cx: number, cy: number) {
    // Dark wooden tabletop outside the map (tiled, scrolls with the camera).
    const t = tableTile()
    const ox = ((-cx % t.width) + t.width) % t.width
    const oy = ((-cy % t.height) + t.height) % t.height
    for (let y = oy - t.height; y < s.h; y += t.height) for (let x = ox - t.width; x < s.w; x += t.width) s.ctx.drawImage(t, x, y)
    // Soft drop shadow under the map board.
    s.ctx.fillStyle = 'rgba(20,12,24,0.45)'
    s.ctx.fillRect(3 - cx, 5 - cy, MAP.W, MAP.H)
  }

  private visibleRect(s: Surface, pad = 8) {
    return { x0: s.ox - pad, y0: s.oy - pad, x1: s.ox + s.w + pad, y1: s.oy + s.h + pad }
  }

  private drawSea(s: Surface) {
    const t = this.time
    const v = this.visibleRect(s)
    const { W } = mapData()
    // Coastal shimmer: foam pixels that twinkle.
    s.ctx.fillStyle = '#ffffff'
    const ph = Math.floor(t * 4)
    for (let k = 0; k < this.shimmer.length; k++) {
      const i = this.shimmer[k]
      const x = i % W
      const y = (i - x) / W
      if (x < v.x0 || x > v.x1 || y < v.y0 || y > v.y1) continue
      if (((i * 2654435761) >>> 0) % 23 !== (ph + (i % 7)) % 23) continue
      s.ctx.fillRect(x - s.ox, y - s.oy, 1, 1)
    }
    // Rolling wave glyphs.
    for (const w of this.waves) {
      if (w.x < v.x0 || w.x > v.x1 || w.y < v.y0 || w.y > v.y1) continue
      const f = (t * 0.28 + w.ph) % 1
      if (f > 0.7) continue
      const k = f / 0.7
      const len = k < 0.25 ? 2 : k < 0.75 ? w.len : w.len - 1
      const dx = Math.round(k * 3)
      const x = w.x + dx
      s.hline(x, x + len - 1, w.y, w.c)
      if (k > 0.2 && k < 0.8) {
        s.px(x + len, w.y + 1, w.c)
        s.px(x - 1, w.y + 1, w.c)
        s.px(x + 1, w.y - 1, '#ffffff')
      }
    }
    // Sun sparkles on the open sea.
    for (let i = 0; i < 10; i++) {
      const w = this.waves[(i * 37 + Math.floor(t * 0.7) * 13) % this.waves.length]
      if (!w) break
      const k = (t * 0.7 * 3 + i * 0.37) % 1
      glint(s, w.x + 2, w.y - 2, Math.sin(k * Math.PI) * 0.9)
    }
    // A dugong surfacing off Ko Libong (Trang).
    {
      const [x, y] = proj(99.3, 7.32)
      const k = (t % 7) / 1.8
      if (k < 1) {
        const up = Math.sin(k * Math.PI)
        s.ellipse(x, y, 3 + up, 1 + up * 0.6, '#9a8a90')
        s.hline(x - 2, x + 1, y - Math.round(up), '#c8bcc0')
        if (k > 0.3 && k < 0.7) s.px(x + 4, y - 1, '#9a8a90')
        s.px(x - 5, y + 1, '#e8fbff')
        s.px(x + 5, y + 1, '#e8fbff')
      }
    }
    // A sea turtle paddling round the Similan islands.
    {
      const [cx0, cy0] = proj(97.8, 8.55)
      const a = t * 0.25
      const x = Math.round(cx0 + Math.cos(a) * 7)
      const y = Math.round(cy0 + Math.sin(a) * 5)
      const fl = Math.floor(t * 4) % 2
      s.rect(x - 1, y - 1, 3, 2, '#5ea653')
      s.px(x, y - 1, '#86c95f')
      s.px(x + (Math.sin(a) > 0 ? -2 : 2), y, '#b4e486')
      s.px(x - 2, y - 1 + fl, '#43905a')
      s.px(x + 2, y - fl, '#43905a')
    }
    // A whale shark gliding past Ko Tao.
    {
      const [x0, y0] = proj(99.62, 10.3)
      const u = (t * 0.02) % 1
      const x = Math.round(x0 + u * 26)
      const y = Math.round(y0 + Math.sin(u * 6) * 2)
      s.ctx.globalAlpha = 0.55
      s.rect(x - 4, y, 8, 2, '#2f5f8e')
      s.px(x + 4, y, '#2f5f8e')
      s.px(x - 5, y - 1 + (Math.floor(t * 2) % 2), '#2f5f8e')
      s.px(x - 2, y, '#e8fbff')
      s.px(x + 1, y + 1, '#e8fbff')
      s.px(x + 3, y, '#e8fbff')
      s.ctx.globalAlpha = 1
    }
    // Pink dolphins leaping off Khanom and in the Andaman.
    for (const [lo, la, off] of [
      [99.95, 9.4, 0],
      [97.7, 9.0, 2.3],
      [101.2, 7.5, 4.1],
    ]) {
      const [dx0, dy0] = proj(lo, la)
      const k = ((t + off) % 6) / 1.2
      if (k > 1) continue
      const x = dx0 + k * 8
      const y = dy0 - Math.sin(k * Math.PI) * 4
      const col = lo > 99.9 && lo < 100 ? '#ffb3c8' : '#9fb8d0'
      s.rect(x, y, 3, 1, col)
      s.px(x + (k < 0.5 ? 3 : -1), y + (k < 0.5 ? -1 : 1), col)
      s.px(x + 1, y - 1, col)
      if (k < 0.15 || k > 0.85) s.px(dx0 + (k < 0.5 ? 0 : 8), dy0 + 1, '#ffffff')
    }
  }

  private pathPos(b: Boat): { x: number; y: number; dx: number } {
    const pts = b.path
    const n = b.loop ? pts.length : pts.length - 1
    // Ping-pong for open paths, wrap for loops.
    let u = b.t % (b.loop ? 1 : 2)
    let back = false
    if (!b.loop && u > 1) {
      u = 2 - u
      back = true
    }
    const f = u * n
    const i = Math.min(n - 1, Math.floor(f))
    const a = pts[i]
    const c = pts[(i + 1) % pts.length]
    const t = f - i
    const dx = (c[0] - a[0]) * (back ? -1 : 1)
    return { x: a[0] + (c[0] - a[0]) * t, y: a[1] + (c[1] - a[1]) * t, dx }
  }

  private drawBoats(s: Surface) {
    const t = this.time
    for (const b of this.boats) {
      const p = this.pathPos(b)
      const x = Math.round(p.x)
      const bob = Math.sin(t * 3 + b.path[0][0]) > 0 ? 0 : 1
      const y = Math.round(p.y) + bob
      if (Math.hypot(x - INSET.cx, y - INSET.cy) < INSET.r + 10) continue
      const spr = boatSprite(b.kind, p.dx < 0)
      // Wake.
      const wk = p.dx < 0 ? 1 : -1
      s.px(x + (p.dx < 0 ? spr.w : -2) , y, '#e8fbff')
      s.px(x + (p.dx < 0 ? spr.w + 2 : -4), y + 1, '#c8f2f6')
      if (b.kind !== 'fishing') s.px(x + wk * 5 + (p.dx < 0 ? spr.w : 0), y - 1, '#c8f2f6')
      s.draw(spr.canvas, x, y - spr.h + 2)
    }
  }

  private drawNight(s: Surface) {
    const t = this.time
    // Moonlit blue wash over the whole board.
    s.ctx.save()
    s.ctx.globalCompositeOperation = 'multiply'
    s.ctx.fillStyle = '#7f86cc'
    s.ctx.fillRect(-s.ox, -s.oy, MAP.W, MAP.H)
    s.ctx.restore()
    s.ctx.save()
    s.ctx.globalAlpha = 0.1
    s.ctx.fillStyle = '#2c2f63'
    s.ctx.fillRect(-s.ox, -s.oy, MAP.W, MAP.H)
    s.ctx.restore()
    // Town lights twinkling on.
    for (const [x, y, size] of cityPoints()) {
      const tw = 0.7 + 0.3 * Math.sin(t * 2 + x * 0.3)
      softGlow(s, x, y, size === 1 ? 13 : 9, 1.1 * tw, '#ffcf7a')
      s.px(x, y, '#fff3a6')
      if (size === 1) {
        s.px(x - 2, y + 1, '#ffe27a')
        s.px(x + 2, y - 1, '#ffe27a')
      }
    }
    // The lens stays readable: a soft lamp inside it.
    softGlow(s, INSET.cx, INSET.cy, INSET.r + 8, 0.9, '#ffe6c4')
    softGlow(s, BANGKOK.x, BANGKOK.y, 30, 1.3, '#ffcf7a')
  }

  private drawGlows(s: Surface) {
    const t = this.time
    // Bangkok's warm city glow.
    const pulse = 0.75 + Math.sin(t * 1.6) * 0.25
    softGlow(s, BANGKOK.x, BANGKOK.y, 16, 0.9 * pulse, '#ffcf7a')
    // Yi Peng lanterns rising over Chiang Mai.
    for (const l of this.lanterns) {
      const k = (t * l.sp + l.ph) % 1
      const x = Math.round(l.x + Math.sin(k * 9 + l.ph * 6) * 2)
      const y = Math.round(l.y - 4 - k * 26)
      if (k > 0.92) continue
      if (this.opts.night) softGlow(s, x, y, 4, 1, '#ffb050')
      s.px(x, y, '#ffd54f')
      s.px(x, y + 1, '#f58f35')
      if (k < 0.8) s.px(x, y - 1, '#fff3a6')
    }
  }

  private drawRoute(s: Surface) {
    const vis = this.opts.visited.filter((id) => PLACE_BY_ID[id])
    if (vis.length < 2) return
    const anchor = (p: Place, other: Place): [number, number] => (p.inset && !other.inset ? [BANGKOK.x, BANGKOK.y] : [p.x, p.y - 3])
    const t = this.time
    for (let i = 0; i + 1 < vis.length; i++) {
      const a = PLACE_BY_ID[vis[i]]
      const b = PLACE_BY_ID[vis[i + 1]]
      const [ax, ay] = anchor(a, b)
      const [bx, by] = anchor(b, a)
      const d = Math.hypot(bx - ax, by - ay)
      if (d < 4) continue
      // Gentle arc bulging up-left.
      const mx = (ax + bx) / 2 - (by - ay) * 0.18
      const my = (ay + by) / 2 + (bx - ax) * 0.18 - d * 0.05
      const n = Math.ceil(d * 1.2)
      for (let k = 0; k <= n; k++) {
        const u = k / n
        const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx
        const y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by
        const dash = Math.floor(k / 2 - t * 3) % 3
        if (dash === 0) continue
        s.px(x, y + 1, '#3a2838')
        s.px(x, y, dash === 1 ? '#fff3a6' : '#ffd54f')
      }
    }
  }

  private drawPins(s: Surface) {
    const t = this.time
    const v = this.visibleRect(s, 30)
    const cur = this.opts.current
    for (const p of this.placed) {
      if (p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1 + 20) continue
      const open = this.opts.unlocked(p.id)
      const sel = this.selected === p.id
      const icon = placeIconArt(p.id, !open)
      const phase = (p.x * 13 + p.y * 7) % 10
      let lift = 0
      if (sel) lift = Math.round(Math.abs(Math.sin(this.selT * 5)) * 3 * Math.max(0.35, 1 - this.selT * 0.6))
      else if (open) lift = Math.sin(t * 2.2 + phase) > 0.35 ? 1 : 0
      const x0 = p.x - ICON_W / 2
      const y0 = p.y - ICON_BASE - lift
      // Ground shadow and selection ring.
      s.ctx.globalAlpha = 0.32
      s.ellipse(p.x, p.y + 1, 9 - lift * 0.6, 2.4, '#2a1f2e')
      s.ctx.globalAlpha = 1
      if (sel) {
        const r = 11 + Math.sin(t * 5) * 1.2
        ring(s, p.x, p.y + 0.5, r, r * 0.34, '#fff3a6')
        ring(s, p.x, p.y + 1.5, r + 1, r * 0.34 + 0.4, '#e9a53a')
      } else if (p.id === cur) ring(s, p.x, p.y + 0.5, 10, 3, '#ff9fc0')
      s.draw(icon.canvas, x0, y0)
      if (p.kind && open) {
        // Social hubs: a small "online" dot; the selected one shows how many are there.
        if (sel || p.id === cur) drawHubBadge(s, p, y0, t)
        else onlineDot(s, x0 + ICON_W - 5, y0 + 4, t + p.x)
      }
      if (!open) {
        drawLock(s, x0 + ICON_W - 8, y0 + 1)
        drawStarTag(s, p.x, p.y + 4, p.stars)
      } else if (!this.opts.visited.includes(p.id)) {
        // Twinkle on places you can visit but haven't yet.
        const k = (t * 0.6 + phase * 0.1) % 1
        if (k < 0.3) glint(s, x0 + 4 + (phase % 3) * 7, y0 + 2 + (phase % 4) * 2, Math.sin((k / 0.3) * Math.PI))
      }
      if (sel && open) {
        for (let i = 0; i < 3; i++) {
          const a = t * 2 + (i * Math.PI * 2) / 3
          glint(s, p.x + Math.cos(a) * 13, p.y - 11 + Math.sin(a) * 9, 0.5 + 0.5 * Math.sin(t * 6 + i))
        }
      }
    }
    // Player marker above the current place (drawn last so it's on top).
    const cp = cur ? PLACE_BY_ID[cur] : null
    if (cp) {
      const bob = Math.round(Math.sin(t * 3) * 1.5)
      const spr = playerPin()
      s.draw(spr.canvas, cp.x - Math.floor(spr.w / 2), cp.y - ICON_H - spr.h + 4 + bob)
    }
  }

  private drawPlane(s: Surface) {
    const path = planePath()
    const t = (this.time * 0.012) % 1
    const f = t * (path.length - 1)
    const i = Math.floor(f)
    const a = path[i]
    const b = path[Math.min(path.length - 1, i + 1)]
    const x = a[0] + (b[0] - a[0]) * (f - i)
    const y = a[1] + (b[1] - a[1]) * (f - i)
    const left = b[0] < a[0]
    // Contrail dots behind.
    for (let k = 1; k < 16; k++) {
      const j = Math.max(0, Math.floor(f - k * 1.4))
      const q = path[j]
      if (k % 2) s.px(q[0], q[1], k < 8 ? '#ffffff' : '#e8f4ff')
    }
    const spr = planeSprite(left)
    s.ctx.globalAlpha = 0.25
    s.draw(planeShadow(left).canvas, x - spr.w / 2 + 6, y - spr.h / 2 + 12)
    s.ctx.globalAlpha = 1
    s.draw(spr.canvas, x - spr.w / 2, y - spr.h / 2)
  }

  private drawClouds(s: Surface) {
    const v = this.visibleRect(s, 60)
    for (const c of this.clouds) {
      if (c.x > v.x1 || c.x + c.img.width < v.x0 || c.y > v.y1 || c.y + c.img.height < v.y0) continue
      // Clouds thin out over the lens so they never hide the Bangkok pins.
      const d = Math.hypot(c.x + c.img.width / 2 - INSET.cx, c.y + c.img.height / 2 - INSET.cy)
      const k = Math.max(0, Math.min(1, (d - INSET.r - 14) / 30)) * (this.opts.night ? 0.5 : 1)
      if (k <= 0) continue
      s.ctx.globalAlpha = 0.16 * k
      s.draw(cloudShadow(c.img), c.x + 8, c.y + 14)
      s.ctx.globalAlpha = 0.88 * k
      s.draw(c.img, c.x, c.y)
    }
    s.ctx.globalAlpha = 1
  }
}

// ---------------------------------------------------------------------------
// Scene sprites

function ring(g: Surface, cx: number, cy: number, rx: number, ry: number, c: Color) {
  const n = Math.max(16, Math.round(rx * 6))
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    g.px(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), c)
  }
}

function drawLock(g: Surface, x: number, y: number) {
  g.rect(x, y + 3, 7, 6, MC.ink)
  g.rect(x + 1, y + 4, 5, 4, '#ffd54f')
  g.hline(x + 1, x + 5, y + 4, '#fff3a6')
  g.px(x + 3, y + 5, MC.ink)
  g.px(x + 3, y + 6, MC.ink)
  g.rect(x + 1, y, 5, 1, MC.ink)
  g.rect(x + 1, y + 1, 1, 3, MC.ink)
  g.rect(x + 5, y + 1, 1, 3, MC.ink)
  g.rect(x + 2, y + 1, 3, 1, '#bdb2ae')
}

const STAR = ['..#..', '.###.', '#####', '.###.', '#...#']

function drawStarTag(g: Surface, cx: number, y: number, n: number) {
  const txt = String(n)
  const w = 5 + 1 + textWidth(txt) + 4
  const x = Math.round(cx - w / 2)
  g.rect(x, y, w, 9, MC.ink)
  g.rect(x + 1, y + 1, w - 2, 7, '#fff1d6')
  g.hline(x + 1, x + w - 2, y + 7, '#e0bb8a')
  STAR.forEach((row, r) => {
    for (let c = 0; c < 5; c++) if (row[c] === '#') g.px(x + 2 + c, y + 2 + r, r < 2 ? '#ffd54f' : '#e9a53a')
  })
  drawText(g, txt, x + 8, y + 2, '#6e4a35')
}

/** Hub markets and the fair: a crowd badge (people glyph + simulated players there now). */
function drawHubBadge(g: Surface, p: Place, y0: number, t: number) {
  const txt = String(hubCrowd(p.id))
  const col = p.kind === 'fair' ? '#8a5ac8' : '#e8514a'
  const w = 3 + 4 + textWidth(txt) + 3
  const x = Math.round(p.x - w / 2)
  const y = Math.round(y0 - 6 + (Math.sin(t * 2 + p.x) > 0.6 ? -1 : 0))
  g.rect(x, y, w, 9, MC.ink)
  g.rect(x + 1, y + 1, w - 2, 7, col)
  g.hline(x + 1, x + w - 2, y + 1, p.kind === 'fair' ? '#b890f0' : '#ff8a7a')
  g.px(Math.round(p.x), y + 9, MC.ink)
  g.px(Math.round(p.x) - 1, y + 9, MC.ink)
  g.px(Math.round(p.x), y + 10, MC.ink)
  onlineDot(g, x + 3, y + 4, t + p.x, false)
  drawText(g, txt, x + 6, y + 2, '#fffaf0')
}

/** Blinking green "online now" dot (3×3 plus tips), optionally with an ink ring. */
function onlineDot(g: Surface, cx: number, cy: number, t: number, ring = true) {
  const on = Math.floor(t * 1.5) % 4 !== 0
  const c = on ? '#6cf07a' : '#3a9a4a'
  if (ring) {
    g.rect(cx - 2, cy - 1, 5, 3, MC.ink)
    g.rect(cx - 1, cy - 2, 3, 5, MC.ink)
  }
  g.rect(cx - 1, cy - 1, 3, 3, c)
  g.px(cx, cy - 2 + (ring ? 1 : 0), c)
  g.px(cx, cy, on ? '#e8ffe8' : c)
}

function playerPin(): Sprite {
  return cached('tm-player', () => {
    const c = bake(13, 17, (g) => {
      // Pink teardrop map pin with a white heart.
      g.circle(6.5, 6, 6, MC.ink)
      g.poly([[1.5, 8], [6.5, 16.5], [11.5, 8]], MC.ink)
      g.circle(6.5, 6, 5, '#ff7fa8')
      g.poly([[2.5, 8], [6.5, 15], [10.5, 8]], '#ff7fa8')
      g.poly([[6.5, 8], [6.5, 15], [10.5, 8]], '#e8578a')
      g.circle(5.5, 5, 2.5, '#ffa8c4')
      const H = ['.#.#.', '#####', '.###.', '..#..']
      H.forEach((row, r) => {
        for (let k = 0; k < 5; k++) if (row[k] === '#') g.px(4 + k, 4 + r, '#ffffff')
      })
      g.px(3, 3, '#ffffff')
    })
    return { canvas: c, w: 13, h: 17 }
  })
}

function boatSprite(kind: Boat['kind'], left: boolean): Sprite {
  return cached(`tm-boat:${kind}:${left ? 'l' : 'r'}`, () => {
    const draw = (g: Surface) => {
      if (kind === 'longtail') {
        g.poly([[0, 3], [8, 3], [10, 1], [9, 5], [1, 5]], '#8a5a3a')
        g.hline(0, 8, 3, '#b07a52')
        g.hline(2, 7, 4, '#e8514a')
        g.rect(3, 1, 4, 1, '#5a8de0')
        g.px(10, 0, '#ffd54f')
        g.px(0, 2, '#5a5566')
      } else if (kind === 'ferry') {
        g.poly([[0, 4], [12, 4], [11, 7], [1, 7]], '#fffaf0')
        g.hline(0, 12, 6, '#5a8de0')
        g.rect(3, 1, 7, 3, '#fffaf0')
        g.rect(4, 2, 5, 1, '#72b8f0')
        g.rect(6, 0, 2, 1, '#e8514a')
        g.hline(1, 11, 7, '#8c8187')
      } else if (kind === 'sail') {
        g.poly([[0, 7], [9, 7], [8, 9], [1, 9]], '#fffaf0')
        g.hline(1, 8, 9, '#8c8187')
        g.vline(5, 0, 7, '#6e4a35')
        g.poly([[5.5, 0], [5.5, 6], [9.5, 6]], '#ffffff')
        g.poly([[4.5, 1], [4.5, 6], [1.5, 6]], '#ff9fc0')
      } else if (kind === 'ship') {
        g.poly([[0, 4], [15, 4], [13, 7], [1, 7]], '#e8514a')
        g.hline(0, 15, 4, '#3a2838')
        g.rect(2, 2, 3, 2, '#5a8de0')
        g.rect(5, 2, 3, 2, '#ffd54f')
        g.rect(8, 2, 3, 2, '#86c95f')
        g.rect(11, 0, 3, 4, '#fffaf0')
        g.px(12, 1, '#72b8f0')
        g.hline(1, 13, 7, '#7e2436')
      } else {
        g.poly([[0, 3], [7, 3], [6, 5], [1, 5]], '#5a8de0')
        g.hline(0, 7, 3, '#9fd0ff')
        g.vline(3, 0, 3, '#6e4a35')
        g.px(4, 0, '#ffe45e')
        g.px(2, 1, '#e4ddd6')
      }
    }
    const sizes: Record<Boat['kind'], [number, number]> = { longtail: [11, 6], ferry: [13, 8], sail: [10, 10], ship: [16, 8], fishing: [8, 6] }
    const [w, h] = sizes[kind]
    const c = bake(w + 2, h + 2, (g) => {
      g.setCamera(-1, -1)
      draw(g)
    })
    // Outline and optionally mirror.
    const out = bake(w + 2, h + 2, (g) => {
      const tmp = new Surface(w + 2, h + 2)
      tmp.ctx.drawImage(c, 0, 0)
      const d = tmp.ctx.getImageData(0, 0, w + 2, h + 2).data
      g.ctx.fillStyle = MC.ink
      const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w + 2 && y < h + 2 && d[(y * (w + 2) + x) * 4 + 3] > 20
      for (let y = 0; y < h + 2; y++)
        for (let x = 0; x < w + 2; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) g.ctx.fillRect(x, y, 1, 1)
      g.ctx.drawImage(c, 0, 0)
    })
    if (!left) return { canvas: out, w: w + 2, h: h + 2 }
    const m = bake(w + 2, h + 2, (g) => {
      g.ctx.translate(w + 2, 0)
      g.ctx.scale(-1, 1)
      g.ctx.drawImage(out, 0, 0)
    })
    return { canvas: m, w: w + 2, h: h + 2 }
  })
}

function planeSprite(left: boolean): Sprite {
  return cached(`tm-plane:${left}`, () => {
    const rows = [
      '......##.....',
      '.....#ww#....',
      '#...#wwww#...',
      '#w##wwwwwbbw#',
      '#wwwwwwwwwwww#',
      '.##bbwwwww###.',
      '....#www#.....',
      '.....##.......',
    ]
    const pal: Record<string, Color> = { '#': MC.ink, w: '#fffaf0', b: '#5a8de0' }
    const c = bake(14, 8, (g) => {
      rows.forEach((r, y) => {
        for (let x = 0; x < r.length; x++) if (pal[r[x]]) g.px(left ? 13 - x : x, y, pal[r[x]])
      })
      g.px(left ? 1 : 12, 4, '#e8514a')
    })
    return { canvas: c, w: 14, h: 8 }
  })
}

function planeShadow(left: boolean): Sprite {
  return cached(`tm-plane-sh:${left}`, () => {
    const p = planeSprite(left)
    const c = bake(p.w, p.h, (g) => {
      g.ctx.drawImage(p.canvas, 0, 0)
      g.ctx.globalCompositeOperation = 'source-in'
      g.ctx.fillStyle = '#1e2048'
      g.ctx.fillRect(0, 0, p.w, p.h)
    })
    return { canvas: c, w: p.w, h: p.h }
  })
}

const cloudShadows = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()
function cloudShadow(img: HTMLCanvasElement): HTMLCanvasElement {
  let c = cloudShadows.get(img)
  if (!c) {
    c = bake(img.width, img.height, (g) => {
      g.ctx.drawImage(img, 0, 0)
      g.ctx.globalCompositeOperation = 'source-in'
      g.ctx.fillStyle = '#1e2048'
      g.ctx.fillRect(0, 0, img.width, img.height)
    })
    cloudShadows.set(img, c)
  }
  return c
}

let PLANE: [number, number][] | null = null
/** A looping sightseeing flight: Bangkok → Chiang Mai → Nong Khai → Ubon → Bangkok → Phuket → Hat Yai → Bangkok. */
function planePath(): [number, number][] {
  if (PLANE) return PLANE
  const stops: [number, number][] = [
    [100.75, 13.69], [99.8, 16.2], [98.97, 18.77], [100.6, 19.4], [102.79, 17.4], [104.2, 16.6], [104.87, 15.25],
    [102.6, 14.2], [100.75, 13.69], [99.6, 11.4], [98.3, 8.1], [99.0, 7.1], [100.39, 6.93], [101.0, 9.0], [100.9, 12.2], [100.75, 13.69],
  ]
  PLANE = smoothPath(stops.map(([lo, la]) => proj(lo, la)), 6)
  return PLANE
}

let TABLE: HTMLCanvasElement | null = null
function tableTile(): HTMLCanvasElement {
  if (TABLE) return TABLE
  TABLE = bake(48, 48, (g) => {
    g.rect(0, 0, 48, 48, '#4a3128')
    const r = seededRand(77)
    for (let y = 0; y < 48; y++) {
      if (y % 12 === 0) g.hline(0, 47, y, '#3a2620')
      for (let k = 0; k < 2; k++) {
        const x = Math.floor(r() * 48)
        g.hline(x, Math.min(47, x + 3 + Math.floor(r() * 8)), y, r() < 0.5 ? '#553a2e' : '#40291f')
      }
    }
  })
  return TABLE
}
