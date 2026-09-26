// Arrival cinematic: the player leaves home (condo soi, river pier or a
// mountain town), rides a tuk-tuk / long-tail boat / red songthaew, and the
// temple is revealed with a parallax tilt past its gate.

import type { Scene } from '../../engine/stage'
import { bake, type Surface } from '../../engine/pixel'
import { Particles } from '../../engine/particles'
import { sfx } from '../../engine/audio'
import { avatarSprite, type AvatarLook, type Pose } from '../../art/avatar'
import { birdSprite } from '../../art/characters'
import { drawChedi, drawShrine, ROOFS } from '../../art/buildings'
import { drawDeity } from '../../art/deities'
import { bananaTree, frangipaniTree, palmTree } from '../../art/props'
import {
  bakeCondo,
  bakeGate,
  bakeGrandFacade,
  bakeGuideway,
  bakeMountains,
  bakePier,
  bakeSky,
  bakeSkyline,
  bakeSoi,
  bakeCloud,
  drawGateDoors,
  drawGlassDoors,
  drawNaga,
  drawPine,
  drawPrang,
  drawRays,
  drawSkytrain,
  drawStiltHouse,
  drawTempleWall,
  drawWheel,
  drawYaksha,
  glint,
  h01,
  longtail,
  ramp,
  seeded,
  softGlow,
  songthaew,
  tukTuk,
  type Vehicle,
} from '../../art/cinematic'
import { cam, Director, E, play, seg, tw, type Caption, type CutsceneEvents, type Shot, type Transition } from './timeline'

export type ArrivalArea = 'wat' | 'shrine' | 'river' | 'mountain'

export const AREA_NAMES: Record<ArrivalArea, string> = {
  wat: 'วัดศรีบุญดี',
  shrine: 'ลานเทพรวมใจ',
  river: 'วัดริมน้ำ',
  mountain: 'วัดบนดอย',
}

function vehicleFor(area: ArrivalArea): Vehicle {
  return area === 'river' ? longtail() : area === 'mountain' ? songthaew() : tukTuk()
}

/** Draw a vehicle with the player seated in it. `x` left, `y` bottom (wheel line). */
function drawRide(g: Surface, v: Vehicle, look: AvatarLook | null, x: number, y: number, t: number, spin: number, bob: number) {
  const top = Math.round(y - v.h + bob)
  x = Math.round(x)
  g.draw(v.back, x, top)
  if (look) {
    const a = avatarSprite(look, 'side', 'stand')
    // Only the upper body shows above the seat.
    g.drawPart(a.canvas, 0, 0, a.w, 22, x + v.seat[0], top + v.seat[1] + Math.round(Math.sin(t * 9) * 0.4))
  }
  g.draw(v.front, x, top)
  for (const [wx, wy, r] of v.wheels) drawWheel(g, x + wx, top + wy, r, spin)
}

const walkCycle: Pose[] = ['walk1', 'pass', 'walk2', 'pass']

// ---------------------------------------------------------------------------
// Shot A — leaving home

class DepartShot implements Shot {
  dur: number
  zoom = 2
  private w = 0
  private h = 0
  private gy = 0
  private sky!: HTMLCanvasElement
  private set!: HTMLCanvasElement
  private street!: HTMLCanvasElement
  private hills: HTMLCanvasElement | null = null
  private door: [number, number, number, number] = [0, 0, 0, 0]
  private fx = new Particles()
  private flags = { hop: false, arrive: false, happy: false }
  private v: Vehicle
  /** Extra time at the start for the first-time version. */
  private o: number

  constructor(
    private area: ArrivalArea,
    private look: AvatarLook,
    first: boolean,
  ) {
    this.o = first ? 1.0 : 0
    this.dur = 2.8 + this.o
    this.v = vehicleFor(area)
  }

  bake(w: number, h: number) {
    this.w = w
    this.h = h
    const river = this.area === 'river'
    const gy = Math.round(Math.min(h * 0.72, h - 30))
    this.gy = gy
    this.sky = bakeSky(w, gy + 2, ['#7fb8f0', '#a8d0f6', '#d8ecff', '#ffeccc'], 6)
    this.hills = this.area === 'mountain' ? bakeMountains(w, gy, gy - 60, 9, '#8fa8d0', '#b4c8e8', 70) : river ? bakeSkyline(w, gy, gy - 26, { seed: 8, minH: 10, maxH: 60, body: '#b9c4e0', rim: '#d4dcf0', windows: 0 }).body : null
    if (river) {
      this.set = bakePier(w, gy)
      this.street = bake(w, h - gy, (g) => {
        g.gradientV(0, 12, w, h - gy - 12, ramp(['#7cc6d8', '#4fa2c0', '#347fa8'], 6), 3)
        for (let i = 0; i < 20; i++) g.rect(Math.round(h01(i) * w), 16 + Math.round(h01(i + 5) * (h - gy - 20)), 4, 1, '#b3eef4')
      })
    } else {
      const c = bakeCondo(w, gy, this.area === 'mountain' ? 12 : 5)
      this.set = c.canvas
      this.door = c.door
      this.street = bake(w, h - gy + 2, (g) => {
        g.rect(0, 0, w, 14, '#ddd3c6')
        for (let x = 0; x < w; x += 7) g.vline(x, 0, 13, '#c6baac')
        g.hline(0, w - 1, 6, '#c6baac')
        g.rect(0, 14, w, 1, '#f3ede4')
        g.rect(0, 15, w, 2, '#a89c90')
        g.gradientV(0, 17, w, h - gy - 15, ['#7a7390', '#6c6583'], 3)
        for (let x = 4; x < w; x += 20) g.rect(x, 17 + Math.round((h - gy - 17) * 0.5), 9, 1, '#e8e2d8')
      })
    }
    this.fx = new Particles()
    this.flags = { hop: false, arrive: false, happy: false }
    for (const v of ['front', 'side'] as const) for (const p of ['walk1', 'walk2', 'pass', 'stand', 'happy'] as Pose[]) avatarSprite(this.look, v, p)
  }

  // Timeline helpers (seconds, shot-local).
  private vx(t: number) {
    const o = this.o
    const stopX = this.stopX()
    if (t < o + 1.8) return tw(t, o - 0.1, o + 1.2, -this.v.w - 6, stopX, E.outCubic)
    return tw(t, o + 1.95, o + 2.95, stopX, this.w + 20, E.inCubic)
  }
  private stopX() {
    return this.area === 'river' ? Math.round(this.w * 0.52 - this.v.w / 2) : Math.round(this.w * 0.76 - this.v.w / 2)
  }
  private roadY() {
    return this.area === 'river' ? this.gy + 14 : this.gy + 19
  }

  update(dt: number, t: number) {
    this.fx.update(dt)
    const o = this.o
    if (o > 0 && !this.flags.happy && t > 0.55) {
      this.flags.happy = true
      const [px, py] = this.playerPos(t)
      this.fx.hearts(px + 8, py - 4, 2)
      this.fx.sparkles(px + 8, py, 6, '#fff3a6', 8)
      play(() => sfx.merit())
    }
    if (!this.flags.arrive && t > o + 0.6) {
      this.flags.arrive = true
      play(() => (this.area === 'river' ? sfx.splash() : sfx.whoosh()))
    }
    if (!this.flags.hop && t > o + 1.6) {
      this.flags.hop = true
      play(() => sfx.tap())
    }
    // Exhaust puffs / wake spray while the vehicle moves.
    const moving = Math.abs(this.vx(t) - this.vx(t - 0.05)) > 0.05
    if (moving && Math.random() < dt * 14) {
      const x = this.vx(t) + this.v.exhaust[0]
      const y = this.roadY() - this.v.h + this.v.exhaust[1]
      if (this.area === 'river') this.fx.add({ kind: 'drop', x, y: this.roadY() - 2, vx: -10 - Math.random() * 10, vy: -12 - Math.random() * 8, g: 60, max: 0.6, color: '#e6fbff' })
      else this.fx.add({ kind: 'smoke', x, y, vx: -8, vy: -6, max: 0.8, color: '#d8d2e0', size: 2 })
    }
  }

  /** Player position (left, bottom) or null when seated. */
  private playerPos(t: number): [number, number, Pose, 'front' | 'side'] {
    const o = this.o
    const river = this.area === 'river'
    const seatX = this.stopX() + this.v.seat[0]
    if (river) {
      const x0 = Math.round(this.w * 0.2)
      const x = Math.round(tw(t, o + 0.4, o + 1.6, x0, seatX, E.linear))
      const walking = t > o + 0.4 && t < o + 1.6
      return [x, this.gy + 1, walking ? walkCycle[Math.floor(t * 8) % 4] : t < o ? 'happy' : 'stand', t < o + 0.4 ? 'front' : 'side']
    }
    const [dx, , dw] = this.door
    const doorX = dx + dw / 2 - 9
    if (t < o + 0.75) {
      // Step out of the lobby toward the camera.
      const y = Math.round(tw(t, 0.25, 0.75, this.gy - 1, this.gy + 8, E.linear))
      const walking = t > 0.25 && t < 0.75
      const pose: Pose = walking ? walkCycle[Math.floor(t * 8) % 4] : t > 0.75 && t < o + 0.7 ? (Math.floor(t * 4) % 2 ? 'happy' : 'stand') : 'stand'
      return [Math.round(doorX), y, pose, 'front']
    }
    const x = Math.round(tw(t, o + 0.8, o + 1.6, doorX, seatX, E.linear))
    return [x, this.gy + 8, walkCycle[Math.floor(t * 8) % 4], 'side']
  }

  render(g: Surface, t: number) {
    const { w, h, gy } = this
    const o = this.o
    g.rect(0, 0, w, h, '#ffeccc')
    g.draw(this.sky, 0, 0)
    softGlow(g, w - 14, 18, 70, 0.8, '#fff3c4')
    if (this.hills) g.draw(this.hills, 0, 0)
    if (this.area === 'mountain') for (let i = 0; i < 6; i++) drawPine(g, 8 + i * 36, gy - 40 + (i % 2) * 6, 28, '#5a8a78', '#7aa890')
    g.draw(this.set, 0, 0)
    if (this.area !== 'river') {
      const [dx, dy, dw, dh] = this.door
      drawGlassDoors(g, dx, dy, dw, dh, E.inOutSine(seg(t, 0, 0.35)) * (1 - seg(t, o + 1.0, o + 1.4)))
    }
    g.draw(this.street, 0, gy)

    const seated = t >= o + 1.6
    const [px, py, pose, view] = this.playerPos(t)
    const vx = this.vx(t)
    const ry = this.roadY()
    const spin = vx * 0.4
    const bob = Math.abs(vx - this.stopX()) > 1 && Math.floor(t * 10) % 2 ? -1 : 0
    const waterBob = this.area === 'river' ? Math.round(Math.sin(t * 3) * 1) : 0
    if (!seated) {
      const a = avatarSprite(this.look, view, pose)
      const hop = pose === 'happy' ? -1 : 0
      g.alpha(0.25)
      g.ellipse(px + 9, py, 7, 1.5, '#3a2838')
      g.reset()
      g.draw(a.canvas, px, py - a.h + hop)
    }
    drawRide(g, this.v, seated ? this.look : null, vx, ry, t, spin, bob + waterBob)
    this.fx.render(g)
    // Fade in from the app's plum background.
    const fin = 1 - seg(t, 0, 0.5)
    if (fin > 0) {
      g.alpha(Math.round(fin * 8) / 8)
      g.rect(0, 0, w, h, '#2b2340')
      g.reset()
    }
  }
}

// ---------------------------------------------------------------------------
// Shot B — the ride: parallax city → trees → temple wall

class RideShot implements Shot {
  in?: Transition = { kind: 'wipe', dur: 0.6 }
  dur: number
  zoom = 2
  private w = 0
  private h = 0
  private gy = 0
  private sky!: HTMLCanvasElement
  private far!: HTMLCanvasElement
  private mid!: HTMLCanvasElement
  private near!: HTMLCanvasElement
  private road!: HTMLCanvasElement
  private clouds: HTMLCanvasElement[] = []
  private D = 300
  private v: Vehicle
  private fx = new Particles()

  constructor(
    private area: ArrivalArea,
    private look: AvatarLook,
    first: boolean,
  ) {
    this.dur = first ? 3.0 : 2.3
    this.v = vehicleFor(area)
  }

  bake(w: number, h: number) {
    this.w = w
    this.h = h
    const gy = Math.round(Math.min(h * 0.7, h - 30))
    this.gy = gy
    const D = this.D
    const L = w + D + 20
    const r = seeded(21)
    const area = this.area
    const mountain = area === 'mountain'
    const river = area === 'river'
    this.sky = bakeSky(w, gy + 4, mountain ? ['#8fb4e0', '#b8d0ec', '#e4eef8', '#f4f4f4'] : ['#6fb0f0', '#9ccaf6', '#cfe6ff', '#fff0d4'], 6)
    this.clouds = [bakeCloud(40, 2, '#ffffff', '#f4f0ff', '#d8d4f0'), bakeCloud(56, 5, '#ffffff', '#f4f0ff', '#d8d4f0')]
    this.far = mountain
      ? bakeMountains(w + 80, gy, gy - 24, 3, '#9ab0d8', '#bccbe8', 60)
      : bakeSkyline(w + 80, gy, gy - 16, { seed: 31, minH: 16, maxH: area === 'shrine' ? 90 : 60, body: '#b9c0e0', rim: '#d0d6ee', side: '#aab0d4', windows: 0, landmarks: area === 'shrine' }).body
    this.mid = bake(Math.round(w + D * 0.5 + 40), gy + 2, (g) => {
      const MW = Math.round(w + D * 0.5 + 40)
      if (mountain) for (let x = -4; x < MW; x += 9 + r() * 8) drawPine(g, x, gy - 6 - r() * 6, 24 + r() * 12, '#4f7f6a', '#6f9f84')
      else if (area === 'shrine') {
        g.draw(bakeGuideway(MW, gy + 2, gy - 58, gy, '#c9c3d6', '#e8e4f0', '#aaa3ba'), 0, 0)
        for (let x = 0; x < MW; x += 44) {
          g.rect(x + 6, gy - 50, 22, 50, '#d8d0e4')
          g.rect(x + 8, gy - 46, 18, 3, '#9fc4e0')
          g.rect(x + 8, gy - 38, 18, 3, '#9fc4e0')
        }
      } else for (let x = -4; x < MW; x += 10 + r() * 10) {
        const rr = 7 + r() * 8
        g.circle(x, gy - 8 - rr * 0.5, rr, '#6fa87a')
        g.circle(x - 2, gy - 10 - rr * 0.6, rr * 0.6, '#8cc48a')
      }
    })
    // Near strip: city → trees → temple wall (or bank houses / pines).
    this.near = bake(L, gy + 2, (g) => {
      const a = Math.round(L * 0.42)
      const b = Math.round(L * 0.62)
      if (river) {
        let x = 0
        let v = 0
        while (x < a) {
          drawStiltHouse(g, x, gy - 2, 26, v++)
          x += 34
        }
        for (let x2 = a; x2 < b; x2 += 16) g.draw(palmTree().canvas, x2, gy - 56)
        drawTempleWall(g, b, L, gy - 2, 18)
      } else if (mountain) {
        for (let x = 0; x < b; x += 11) drawPine(g, x, gy, 30 + ((x * 7) % 11), '#3f6f5a', '#5f8f74')
        // Guard rail.
        g.rect(0, gy - 6, L, 2, '#f4f2f6')
        for (let x = 0; x < L; x += 10) g.rect(x, gy - 6, 1, 6, '#8c8699')
        for (let x = b; x < L; x += 11) drawPine(g, x, gy - 4, 20, '#4f7f6a', '#6f9f84')
      } else {
        const soi = bakeSoi(a + 30, gy + 2, gy, 7)
        g.draw(soi, 0, 0)
        for (let x2 = a + 30; x2 < b; x2 += 14) {
          const tr = (x2 / 14) % 2 ? frangipaniTree(0) : bananaTree()
          g.draw(tr.canvas, x2 - 6, gy - tr.h + 1)
        }
        if (area === 'wat') drawTempleWall(g, b, L, gy, 20)
        else {
          // Shrine district: garland stalls under umbrellas.
          for (let x2 = b; x2 < L; x2 += 30) {
            g.rect(x2, gy - 12, 24, 12, '#c28e5c')
            g.rect(x2, gy - 12, 24, 1, '#e0bb8a')
            for (let k = 0; k < 6; k++) g.circle(x2 + 3 + k * 4, gy - 14, 2, k % 2 ? '#f58f35' : '#ffd23f')
            g.poly(
              [
                [x2 - 4, gy - 22],
                [x2 + 12, gy - 32],
                [x2 + 28, gy - 22],
              ],
              ['#e8514a', '#5a8de0', '#6cc36a'][(x2 / 30) % 3 | 0],
            )
            g.vline(x2 + 12, gy - 22, gy - 12, '#6a6478')
          }
        }
      }
    })
    this.road = bake(w + 40, h - gy + 2, (g) => {
      const H = h - gy + 2
      if (river) {
        g.gradientV(0, 0, w + 40, H, ramp(['#7cc6d8', '#4fa2c0', '#347fa8'], 6), 3)
      } else {
        g.rect(0, 0, w + 40, 4, mountain ? '#a89c90' : '#ddd3c6')
        g.gradientV(0, 4, w + 40, H - 4, ['#7a7390', '#665f7c'], 3)
      }
    })
    this.fx = new Particles()
  }

  private pos(t: number) {
    return this.D * E.outQuad(seg(t, -0.2, this.dur + 0.6))
  }

  update(dt: number, t: number) {
    this.fx.update(dt)
    const vx = Math.round(this.w * 0.46 - this.v.w / 2)
    const ry = this.gy + (this.area === 'river' ? 10 : 12)
    const speed = this.pos(t + 0.02) - this.pos(t)
    if (Math.random() < dt * 20 * Math.min(1, speed)) {
      if (this.area === 'river') this.fx.add({ kind: 'drop', x: vx + 2, y: ry - 2, vx: -20 - Math.random() * 20, vy: -14 - Math.random() * 10, g: 70, max: 0.6, color: '#e6fbff' })
      else this.fx.add({ kind: 'smoke', x: vx + this.v.exhaust[0], y: ry - this.v.h + this.v.exhaust[1], vx: -24, vy: -6, max: 0.7, color: '#e0dae8', size: 2 })
    }
    for (const p of this.fx.list) if (p.kind === 'smoke' || p.kind === 'drop') p.x -= speed * 0.4
  }

  render(g: Surface, t: number) {
    const { w, h, gy } = this
    const p = this.pos(t)
    const mountain = this.area === 'mountain'
    // Climbing: the world sinks slowly on the mountain road.
    const climb = mountain ? Math.round(p * 0.08) : 0
    g.rect(0, 0, w, h, '#fff0d4')
    g.draw(this.sky, 0, 0)
    this.clouds.forEach((c, i) => g.draw(c, Math.round(((i * 70 - p * 0.05) % (w + 60)) + w) % (w + 60) - 50, 10 + i * 16))
    g.draw(this.far, -Math.round(p * 0.12), climb)
    g.draw(this.mid, -Math.round(p * 0.45), climb)
    if (this.area === 'shrine') {
      // A skytrain glides the other way overhead.
      const tx = Math.round(w + 20 - t * 70 - p * 0.45)
      drawSkytrain(g, tx, gy - 58, 3, 1, { body: '#e8e6f0', stripe: '#46c07a', roof: '#ffffff', win: '#3d4a78', dark: '#6a6478' })
    }
    g.draw(this.near, -Math.round(p), 0)
    // Road with scrolling lane marks.
    g.draw(this.road, 0, gy)
    const ry = gy + (this.area === 'river' ? 10 : 12)
    if (this.area === 'river') {
      for (let i = 0; i < 16; i++) {
        const x = Math.round((h01(i) * (w + 40) - p * 1.2) % (w + 40) + (w + 40)) % (w + 40) - 20
        g.rect(x, gy + 3 + Math.round(h01(i + 3) * (h - gy - 6)), 5, 1, '#b3eef4')
      }
    } else {
      for (let x = -Math.round(p) % 24; x < w; x += 24) g.rect(x, gy + 4 + Math.round((h - gy - 4) * 0.45), 11, 1, '#e8e2d8')
    }
    const vx = Math.round(this.w * 0.46 - this.v.w / 2)
    const bob = this.area === 'river' ? Math.round(Math.sin(t * 6)) : Math.floor(t * 12) % 3 === 0 ? -1 : 0
    drawRide(g, this.v, this.look, vx, ry, t, p * 0.4, bob)
    // Wake behind the boat.
    if (this.area === 'river') {
      g.alpha(0.7)
      for (let i = 0; i < 6; i++) g.rect(vx - 4 - i * 6, ry - 1 + (i % 2), 5 - (i >> 1), 1, '#e6fbff')
      g.reset()
    }
    this.fx.render(g)
    // Foreground posts whip past for speed.
    for (let x = -Math.round(p * 1.6) % 90 + w; x > -10; x -= 90) {
      if (this.area === 'river') continue
      g.rect(x, gy - 30, 3, h, '#4a3a50')
      g.rect(x - 3, gy - 32, 9, 3, '#5a4a60')
    }
  }
}

// ---------------------------------------------------------------------------
// Shot C — the grand reveal (parallax tilt past the gate to the temple)

class RevealShot implements Shot {
  in?: Transition = { kind: 'iris', dur: 0.8 }
  dur: number
  zoom = 1
  private w = 0
  private h = 0
  private sky!: HTMLCanvasElement
  private clouds: HTMLCanvasElement[] = []
  private back!: HTMLCanvasElement
  private fore!: HTMLCanvasElement
  private backY0 = 0
  private foreY0 = 0
  private T = 0
  private glints: [number, number, 0 | 1][] = []
  private door: [number, number, number, number] | null = null
  private fx = new Particles()
  private rang = false
  private shone = false
  private crowd: { x: number; y: number; look: AvatarLook; pose: Pose }[] = []
  readonly bell: number
  private o: number
  private mistY = 0

  constructor(
    private area: ArrivalArea,
    private first: boolean,
  ) {
    this.o = first ? 1.0 : 0
    this.dur = first ? 4.8 : 2.9
    this.bell = this.o + 1.5
  }

  bake(w: number, h: number) {
    this.w = w
    this.h = h
    this.glints = []
    this.door = null
    this.crowd = []
    const area = this.area
    const kg = Math.max(0.7, Math.min(1.45, h / 300))
    this.sky = bakeSky(w, h + 40, area === 'mountain' ? ['#8aa8d8', '#b0c8ea', '#dbe6f4', '#f4f4f8'] : ['#4f9bea', '#7fbdf5', '#b5dcff', '#e6f2ff', '#fff0d4'], 6)
    this.clouds = [bakeCloud(64, 3, '#ffffff', '#f4f0ff', '#d8d4f0'), bakeCloud(44, 8, '#ffffff', '#f4f0ff', '#d8d4f0')]
    const groundScreen = h - Math.round(h * (area === 'shrine' ? 0.2 : 0.06))
    // Background layer (moves at 0.45 of the tilt).
    const bw = w
    const bh = Math.round(h * 1.6) + 300
    const bGround = bh - 160
    let backTop = 0
    this.back = bake(bw, bh, (g) => {
      if (area === 'wat') {
        const s = Math.max(0.36, Math.min(0.66, w / 320, (h * 1.1) / 342))
        const f = bakeGrandFacade(s)
        const fx = Math.round(w / 2) - f.cx
        const fy = bGround - f.gy
        drawChedi(g, Math.round(w * 0.12), bGround - Math.round(20 * s), { gold: true, scale: s * 2.2 })
        drawChedi(g, Math.round(w * 0.88), bGround - Math.round(20 * s), { gold: true, scale: s * 2.2 })
        g.draw(f.canvas, fx, fy)
        for (const [x, y] of f.glints) this.glints.push([x + fx, y + fy, 0])
        backTop = fy + f.top
        g.rect(0, bGround, bw, bh - bGround, '#e9dcc6')
      } else if (area === 'river') {
        const ph = Math.round(Math.min(h * 0.9, 260))
        const pal = { body: '#f6e6d0', light: '#fffaf0', shade: '#dcc2a8', dark: '#a8847a', accent: '#5ab8e8', accent2: '#ff8fb0' }
        drawPrang(g, Math.round(w * 0.28), bGround, ph * 0.55, pal)
        drawPrang(g, Math.round(w * 0.78), bGround, ph * 0.55, pal)
        drawPrang(g, Math.round(w * 0.53), bGround, ph, pal)
        this.glints.push([Math.round(w * 0.53), bGround - Math.round(ph * 0.94), 0])
        backTop = bGround - ph
        g.rect(0, bGround, bw, bh - bGround, '#4798bc')
        for (let x = 0; x < w; x += 14) g.circle(x, bGround - 4, 8, '#5f9a6a')
      } else if (area === 'mountain') {
        g.draw(bakeMountains(bw, bh, Math.round(bh * 0.3), 5, '#9ab0d8', '#bccbe8', 90), 0, 0)
        g.draw(bakeMountains(bw, bh, Math.round(bh * 0.45), 8, '#86a0c8', '#a8bee0', 70), 0, 0)
        backTop = 0
        g.rect(0, bGround, bw, bh - bGround, '#6f9f84')
        for (let x = 0; x < w; x += 10) drawPine(g, x, bGround + 4, 22 + ((x * 13) % 9), '#4f7f6a', '#6f9f84')
      } else {
        // City plaza shrine.
        g.draw(bakeSkyline(bw, bh, bGround - 30, { seed: 14, minH: 60, maxH: 170, body: '#c8cde6', rim: '#e2e6f4', side: '#b4bad8', windows: 0, landmarks: true }).body, 0, 0)
        g.draw(bakeGuideway(bw, bh, bGround - 70, bGround - 30, '#d4cfe0', '#f0ecf6', '#b8b2c8'), 0, 0)
        const k = Math.max(0.9, Math.min(1.4, w / 150))
        drawShrine(g, Math.round(w / 2), bGround, { w: Math.round(56 * k), h: Math.round(48 * k), roof: ROOFS.gold, back: '#7e2436' })
        drawDeity(g, 'brahma', Math.round(w / 2), bGround - Math.round(8 * k), k * 0.8, 0)
        this.glints.push([Math.round(w / 2), bGround - Math.round(48 * k) - Math.round(30 * k), 0])
        backTop = bGround - Math.round(48 * k) - Math.round(36 * k)
        g.rect(0, bGround, bw, bh - bGround, '#e9dcc6')
      }
    })
    // Foreground layer (moves 1:1).
    const fw = w
    const mountain = area === 'mountain'
    const fh = Math.round(h * (mountain ? 1.9 : 1.2))
    const fGround = mountain ? fh - Math.round(h * 0.2) : Math.round(fh * 0.8)
    let gateH = Math.round(60 * kg)
    let foreTop: number | null = null
    this.fore = bake(fw, fh, (g) => {
      if (area === 'wat') {
        const gate = bakeGate(kg * 0.72)
        gateH = gate.gy - gate.tip[1]
        const gx = Math.round(w / 2) - gate.cx
        const gyy = fGround - gate.gy
        const [dx, dy, dw, dh] = gate.door
        // Wall with the doorway left open.
        drawTempleWall(g, 0, fw, fGround, Math.round(34 * kg))
        g.ctx.clearRect(gx + dx, gyy + dy - 12, dw, dh + 12)
        g.draw(gate.canvas, gx, gyy)
        this.door = [gx + dx, gyy + dy, dw, dh]
        this.glints.push([gx + gate.tip[0], gyy + gate.tip[1], 1])
        drawYaksha(g, Math.round(w / 2 - gate.cx + 2), fGround + 6, Math.round(88 * kg), '#4fae6a', 1)
        drawYaksha(g, Math.round(w / 2 + gate.cx - 2), fGround + 6, Math.round(88 * kg), '#d9534a', -1)
        g.rect(0, fGround + 4, fw, fh - fGround, '#d9ccb4')
        for (let x = 0; x < fw; x += 8) g.vline(x, fGround + 4, fh, '#c9b99e')
      } else if (area === 'river') {
        drawTempleWall(g, 0, fw, fGround - 8, Math.round(22 * kg))
        // Pier pavilion.
        const px = Math.round(w * 0.5)
        g.rect(px - 30, fGround - 40, 60, 4, '#e8514a')
        g.poly(
          [
            [px - 36, fGround - 38],
            [px - 20, fGround - 58],
            [px + 20, fGround - 58],
            [px + 36, fGround - 38],
          ],
          '#f08a3a',
        )
        g.hline(px - 36, px + 36, fGround - 38, '#3f9a6b')
        for (const x of [px - 26, px - 8, px + 8, px + 26]) g.rect(x - 1, fGround - 36, 3, 30, '#fffaf0')
        g.rect(px - 40, fGround - 8, 80, 4, '#b07a52')
        g.gradientV(0, fGround - 4, fw, fh - fGround + 4, ramp(['#6cb8d0', '#4798bc', '#2f77a8'], 6), 3)
        for (let i = 0; i < 30; i++) g.rect(Math.round(h01(i) * fw), fGround + Math.round(h01(i + 1) * (fh - fGround)), 4, 1, '#b3eef4')
        g.draw(longtail().front, Math.round(w * 0.08), fGround + 6)
      } else if (area === 'mountain') {
        // Naga stairs rising through the mist to the golden chedi.
        const top = Math.round(fGround - h * 0.95)
        const cs = Math.max(1, Math.min(1.8, w / 110))
        g.rect(Math.round(w * 0.1), top - 6, Math.round(w * 0.8), 8, '#e4ddd6')
        g.hline(Math.round(w * 0.1), Math.round(w * 0.9), top - 6, '#ffffff')
        drawChedi(g, Math.round(w * 0.2), top - 4, { gold: true, scale: cs * 0.42 })
        drawChedi(g, Math.round(w * 0.8), top - 4, { gold: true, scale: cs * 0.42 })
        drawChedi(g, Math.round(w / 2), top - 6, { gold: true, scale: cs })
        this.glints.push([Math.round(w / 2), top - 6 - Math.round(cs * 88), 1])
        foreTop = top - 6 - Math.round(cs * 92)
        this.mistY = top + 10
        const n = 24
        for (let i = 0; i < n; i++) {
          const f0 = i / n
          const y = Math.round(fGround - (fGround - top) * Math.pow(f0, 0.8))
          const y2 = Math.round(fGround - (fGround - top) * Math.pow((i + 1) / n, 0.8))
          const half = Math.round(w * 0.24 * (1 - f0 * 0.7))
          g.rect(w / 2 - half, y2, half * 2, y - y2, i % 2 ? '#e4ddd6' : '#f3ede4')
          g.hline(w / 2 - half, w / 2 + half - 1, y2, '#ffffff')
        }
        for (const dir of [-1, 1]) {
          let lx = w / 2 + dir * w * 0.24
          let ly = fGround - 20
          for (let i = 1; i <= n; i++) {
            const f0 = i / n
            const x = w / 2 + dir * (w * 0.24 * (1 - f0 * 0.7) + 3)
            const y = fGround - 20 - (fGround - top - 10) * Math.pow(f0, 0.8)
            const bw2 = Math.max(2, 7 * (1 - f0 * 0.7))
            g.thickLine(lx, ly, x, y, bw2 + 1, '#2c6a45')
            g.thickLine(lx, ly - 1, x, y - 1, bw2, '#4fb06a')
            if (i % 2 === 0) g.px(Math.round(x), Math.round(y - 1), '#ffd54f')
            lx = x
            ly = y
          }
          drawNaga(g, Math.round(w / 2 + dir * (w * 0.24 + 6)), fGround - 8, Math.round(70 * kg), dir)
          this.glints.push([Math.round(w / 2 + dir * (w * 0.24 + 6)) - dir * Math.round(10 * kg), fGround - 8 - Math.round(75 * kg), 1])
        }
        for (const x of [8, w - 10, 20, w - 24]) drawPine(g, x, fGround + (x % 3) * 4, 50, '#3f6f5a', '#5f8f74')
        g.rect(0, fGround, fw, fh - fGround, '#b9aa98')
      } else {
        // Crowd of worshippers in front of the shrine.
        g.rect(0, fGround - 10, fw, fh - fGround + 10, '#e9dcc6')
        for (let x = 0; x < fw; x += 10) g.vline(x, fGround - 10, fh, '#dccab0')
        // Incense urn.
        const ux = Math.round(w / 2)
        g.rect(ux - 12, fGround - 24, 24, 16, '#b8742a')
        g.rect(ux - 14, fGround - 26, 28, 3, '#ffd54f')
        g.rect(ux - 10, fGround - 20, 20, 2, '#e9a53a')
        for (let k = -8; k <= 8; k += 3) g.vline(ux + k, fGround - 34, fGround - 26, '#c9683a')
        // Garland stalls at the sides.
        for (const sx of [4, w - 34]) {
          g.rect(sx, fGround - 30, 30, 22, '#c28e5c')
          g.rect(sx, fGround - 30, 30, 2, '#e0bb8a')
          for (let r2 = 0; r2 < 2; r2++) for (let k = 0; k < 6; k++) g.circle(sx + 3 + k * 5, fGround - 24 + r2 * 7, 2.4, (k + r2) % 2 ? '#f58f35' : '#ffd23f')
        }
      }
    })
    if (area === 'shrine') {
      const r = seeded(4)
      const tops = ['top_white', 'top_floral', 'top_hoodie', 'top_day2', 'top_day4', 'top_lace', 'top_day6']
      const hairs = ['hair_bob', 'hair_short', 'hair_long', 'hair_bun']
      for (let i = 0; i < 14; i++) {
        const look: AvatarLook = {
          gender: r() < 0.5 ? 'm' : 'f',
          skin: Math.floor(r() * 4),
          face: 0,
          hairColor: Math.floor(r() * 3),
          hair: hairs[Math.floor(r() * hairs.length)],
          top: tops[Math.floor(r() * tops.length)],
          bottom: r() < 0.5 ? 'bot_black' : 'bot_khaki',
        }
        this.crowd.push({ x: Math.round(8 + r() * (w - 30)), y: Math.round(fGround + 2 + (i % 3) * 7), look, pose: r() < 0.5 ? 'wai' : 'stand' })
      }
      this.crowd.sort((a, b) => a.y - b.y)
    }
    // Parallax framing: start with the foreground grounded at the bottom.
    this.foreY0 = groundScreen - fGround
    // The temple stands further back, so its ground sits about halfway up the gate.
    this.backY0 = this.foreY0 + fGround - Math.round(gateH * 0.55) - bGround
    const topScreen0 = this.backY0 + backTop
    this.T = Math.round(Math.max(60 * kg, Math.min(h < w ? 1e4 : gateH * 0.85, (Math.round(h * 0.14) - topScreen0) / 0.45)))
    if (area === 'shrine') this.T = Math.min(this.T, Math.round(46 * kg))
    if (foreTop !== null) this.T = Math.round(Math.max(60 * kg, Math.round(h * 0.16) - (this.foreY0 + foreTop)))
    this.fx = new Particles()
    this.rang = false
    this.shone = false
    for (const f of ['a', 'fly'] as const) birdSprite(f, '#7a6a80')
    for (const c of this.crowd) avatarSprite(c.look, 'back', c.pose)
  }

  private tilt(t: number) {
    return cam(t, this.o + 0.1, this.o + 2.0, 0, this.T, E.inOutCubic)
  }

  update(dt: number, t: number) {
    this.fx.update(dt)
    if (!this.rang && t >= this.bell) {
      this.rang = true
      play(() => (this.area === 'shrine' ? sfx.chime() : sfx.bigBell()))
      const T = this.tilt(t)
      for (const [x, y, layer] of this.glints) this.fx.sparkles(x, y + (layer ? this.foreY0 + T : this.backY0 + T * 0.45), 8, '#fff6c2', 12)
    }
    if (this.first && !this.shone && t >= this.o + 2.6) {
      this.shone = true
      play(() => sfx.sparkle())
    }
    if (this.first && t > this.o + 2.4 && Math.random() < dt * 16) {
      this.fx.add({ kind: 'sparkle', x: Math.random() * this.w, y: Math.random() * this.h * 0.7, vy: 6, max: 1, color: Math.random() < 0.5 ? '#fff3a6' : '#ffd6e6' })
    }
    if (this.area === 'shrine' && Math.random() < dt * 8) {
      this.fx.add({ kind: 'smoke', x: this.w / 2 + (Math.random() - 0.5) * 16, y: this.foreY0 + this.tilt(t) + Math.round(this.h * 1.2 * 0.8) - 34, vy: -12, max: 2, color: '#e8e2ec', size: 2 })
    }
  }

  render(g: Surface, t: number) {
    const { w, h } = this
    const T = this.tilt(t)
    g.rect(0, 0, w, h, '#fff0d4')
    g.draw(this.sky, 0, Math.round(-40 + T * 0.1))
    this.clouds.forEach((c, i) => g.draw(c, Math.round(((i * 97 + t * (3 + i)) % (w + 80)) - 60), Math.round(h * (0.08 + i * 0.16) + T * 0.15)))
    const by = this.backY0 + Math.round(T * 0.45)
    const fy = this.foreY0 + T
    g.draw(this.back, 0, by)
    // Birds cross after the bell.
    const tb = t - this.bell
    if (tb > 0) {
      for (let i = 0; i < 7; i++) {
        const d = tb - i * 0.06
        if (d < 0) continue
        const x = -10 + d * 70 + Math.abs(i - 3) * -6
        const y = h * 0.3 - d * 18 + Math.abs(i - 3) * 5
        const b = birdSprite(Math.floor(d * 9 + i) % 2 ? 'fly' : 'a', '#7a6a80')
        g.draw(b.canvas, Math.round(x), Math.round(y))
      }
      softGlow(g, w / 2, by + this.back.height * 0.4, Math.round(w * 0.9), Math.max(0, 1 - tb / 1.8) * 0.7, '#ffe7a0')
    }
    // Through the gateway: the path to the hall, glowing when the doors open.
    if (this.door) {
      const [dx, dy, dw, dh] = this.door
      const open = this.first ? E.inOutSine(seg(t, 0.2, 1.1)) : 1
      if (this.first && t > 0.2 && t < 1.6) softGlow(g, dx + dw / 2, fy + dy + dh / 2, 60, (1 - seg(t, 1.1, 1.6)) * 1.2, '#fff3c4')
      g.draw(this.fore, 0, fy)
      drawGateDoors(g, dx, fy + dy, dw, dh, open)
    } else g.draw(this.fore, 0, fy)
    // Mist bands for the mountain.
    if (this.area === 'mountain') {
      for (let i = 0; i < 4; i++) {
        const y = this.foreY0 + T + this.mistY + i * 26 - 20
        const x = Math.round(Math.sin(t * 0.4 + i) * 20)
        softGlow(g, w / 2 + x, y, Math.round(w * 0.9), 1.2, '#ffffff', 0.2)
      }
    }
    for (const c of this.crowd) {
      const a = avatarSprite(c.look, 'back', c.pose)
      g.draw(a.canvas, c.x, fy + c.y - a.h)
    }
    // Glints.
    this.glints.forEach(([x, y, layer], i) => {
      const ph = ((t * 0.9 + i * 0.41) % 2) / 0.45
      glint(g, x, y + (layer ? fy : by), Math.max(0, 1 - Math.abs(ph - 1)))
    })
    this.fx.render(g)
    drawRays(g, w + 20, -30, h * 1.3, 2.1, 0.6, 5, t, this.first && t > this.o + 2.2 ? 0.14 : 0.08)
  }
}

// ---------------------------------------------------------------------------

export class ArrivalCutscene implements Scene {
  private dir: Director

  constructor(
    opts: { look: AvatarLook; area: ArrivalArea; first: boolean },
    ev: CutsceneEvents,
  ) {
    const { look, area, first } = opts
    const a = new DepartShot(area, look, first)
    const b = new RideShot(area, look, first)
    const c = new RevealShot(area, first)
    const shots: Shot[] = [a, b, c]
    const tB = a.dur
    const tC = a.dur + b.dur
    const name = AREA_NAMES[area] ?? AREA_NAMES.wat
    const captions: Caption[] = []
    if (first) {
      captions.push({ at: 0.4, until: a.dur - 0.2, text: 'วันนี้ไปทำบุญกันเถอะ' })
      captions.push({ at: tC + c.bell - 0.3, until: tC + c.dur + 1, text: `ยินดีต้อนรับสู่${name}` })
    } else {
      captions.push({ at: tC + c.bell - 0.2, until: tC + c.dur + 1, text: name })
    }
    void tB
    this.dir = new Director(shots, ev, {
      captions,
      doneAt: tC + c.dur,
      letterbox: (t) => Math.min(seg(t, 0, 0.6), 1 - seg(t, tC + c.dur - 0.9, tC + c.dur - 0.1)),
    })
  }

  resize(w: number, h: number) {
    this.dir.resize(w, h)
  }
  update(dt: number) {
    this.dir.update(dt)
  }
  render(g: Surface) {
    this.dir.render(g)
  }
  skip() {
    this.dir.skip()
  }
  /** Dev helper: jump to a time silently. */
  seek(t: number) {
    this.dir.seek(t)
  }
  /** Total length in seconds (for UI progress). */
  get duration() {
    return this.dir.doneAt
  }
}
