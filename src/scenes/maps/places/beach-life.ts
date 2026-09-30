// Ambient systems for the beach maps: the surf (waves running up and
// back, foam, glints, the sun or moon path on the sea, glowing plankton at
// night and a soft surf sound), swaying coconut palms that drop coconuts,
// boats (moored long-tails bobbing, a jet ski, the banana boat that tips
// everyone into the sea, a parasail), ghost crabs that dash into holes,
// seagulls, a beach dog that chases the waves, the player's footprints that
// the waves wash away, wading/swimming with a rubber ring, swimmers bobbing
// in the sea, horses (Hua Hin), a fire show at night, kites and the beach
// passport stamp on arrival.

import type { Color, Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx, synth } from '../../../engine/audio'
import type { Life } from '../../life'
import type { WorldScene } from '../../world'
import type { Rect } from '../../pathfind'
import { drawGlow } from '../../sky'
import { drawShadow } from '../../../art/props'
import { dogSprite, DOG_COATS, type DogPose } from '../../../art/characters'
import { avatarSprite, type AvatarLook } from '../../../art/avatar'
import { randomVisitorLook } from '../../world'
import { mode, mapId } from '../../../ui/store'
import { beachArrived } from '../../../game/beach'
import { toast } from '../../../game/events'
import { PLACE_BY_ID } from '../../../game/data/places'
import { bananaBoat, jetski, longtailBoat, mix, palmCrown, palmTrunk, PALM_FRAMES, speedboat, type BeachProp, type SeaPal, type ShoreFn, INK } from '../../../art/places/beach-kit'

export type { ShoreFn }

/** Where the swash reaches at column x and time t (a bit beyond the shore line at its peak). */
export function waveY(shore: ShoreFn, x: number, t: number): number {
  const run = Math.sin(t * 0.78 + x * 0.018) * 0.5 + 0.5
  return shore(x) + 2 + run * run * 9 - 4
}

// ---------------------------------------------------------------------------
// Surf

export class Shore implements Life {
  private nextWash = 2
  private plankton: { x: number; y: number; t: number }[] = []
  constructor(
    private s: WorldScene,
    private shore: ShoreFn,
    private day: SeaPal,
    private night: SeaPal,
    private horizon: number,
  ) {}
  update(dt: number, t: number) {
    this.nextWash -= dt
    if (this.nextWash <= 0) {
      this.nextWash = (Math.PI * 2) / 0.78
      // Soft surf hush when the player is near the water.
      const p = this.s.player
      if (mode.value === 'world' && Math.abs(p.y - this.shore(p.x)) < 150) synth.noise(2.4, 0.018, 'lowpass', 700, 0.6, 0, 300)
    }
    if (this.s.isNight() && Math.random() < dt * 6) {
      const x = this.s.camX + rand(0, this.s.vw)
      this.plankton.push({ x, y: waveY(this.shore, x, t) - rand(1, 5), t: rand(0.6, 1.4) })
    }
    for (const p of this.plankton) p.t -= dt
    this.plankton = this.plankton.filter((p) => p.t > 0)
  }
  ground(g: Surface, t: number) {
    const s = this.s
    const pal = s.isNight() ? this.night : this.day
    const x0 = Math.max(0, Math.floor(s.camX) - 2)
    const x1 = Math.min(s.map.w - 1, Math.ceil(s.camX + s.vw) + 2)
    const sunPath = s.phase === 'golden' || s.phase === 'dawn'
    const moon = s.isNight()
    const sunX = s.phase === 'dawn' ? 26 : s.phase === 'golden' ? s.map.w - 30 : s.map.w - 34
    for (let x = x0; x <= x1; x++) {
      const sy = this.shore(x)
      const wy = waveY(this.shore, x, t)
      const run = Math.sin(t * 0.78 + x * 0.018)
      // Wet darkening where the swash has just been.
      g.alpha(0.18)
      g.vline(x, Math.round(sy), Math.round(Math.max(sy, wy + 3)), INK)
      g.alpha(1)
      // The swash sheet (translucent surf colour) and its foam lip.
      g.alpha(0.7)
      g.vline(x, Math.round(sy - 8), Math.round(wy - 2), pal.surf)
      g.alpha(1)
      const lip = Math.round(wy)
      g.px(x, lip, pal.foam)
      if (run > -0.2 || (x + Math.floor(t * 3)) % 3) g.px(x, lip - 1, pal.foam)
      if ((x * 7 + Math.floor(t * 4)) % 5 === 0) g.px(x, lip + 1, mix(pal.foam, pal.surf, 0.4))
      // Breakers further out: broken white crests rolling in.
      const by = Math.round(sy - 16 - Math.sin(t * 0.78 + x * 0.018 + 1.2) * 5)
      if (Math.sin(x * 0.27 + t * 1.3) > 0.25) g.px(x, by, pal.foam)
      if (Math.sin(x * 0.19 - t * 0.9 + 2) > 0.55) g.px(x, by - 11, mix(pal.foam, pal.shallow, 0.4))
      // Sun / moon path on the water.
      if ((sunPath || moon) && Math.abs(x - sunX) < 18) {
        for (let y = this.horizon + 2; y < sy - 20; y += 3) {
          const spread = 3 + (y - this.horizon) * 0.08
          if (Math.abs(x - sunX) > spread) continue
          if (Math.sin(y * 0.9 + x * 0.6 + t * 3) > 0.2) g.px(x, y, moon ? '#e8f0ff' : s.phase === 'golden' ? '#ffd88a' : '#ffe0d0')
        }
      }
    }
    // Twinkling glints on the open sea.
    const k = Math.floor(t * 4)
    for (let i = 0; i < 26; i++) {
      const h = ((i + 1) * 2654435761 + k * 97) >>> 0
      const x = x0 + (h % Math.max(1, x1 - x0))
      const sy = this.shore(x)
      const y = this.horizon + 4 + ((h >>> 9) % Math.max(1, Math.round(sy - this.horizon - 24)))
      g.px(x, y, pal.glint)
      if (i % 3 === 0) g.px(x + 1, y, pal.glint)
    }
  }
  glow(g: Surface) {
    for (const p of this.plankton) drawGlow(g, p.x, p.y, 3, Math.min(1, p.t) * 0.7, '#7af0ff')
  }
}

// ---------------------------------------------------------------------------
// Swaying coconut palms

export interface PalmSpot {
  x: number
  y: number
  v: number
  flip?: boolean
}

export class Palms implements Life {
  private items: { p: PalmSpot; trunk: BeachProp; ph: number; shake: number; nut: { x: number; y: number; vy: number; ground: number; t: number } | null }[]
  constructor(
    private s: WorldScene,
    spots: PalmSpot[],
  ) {
    this.items = spots.map((p) => ({ p, trunk: palmTrunk(p.v), ph: rand(0, 6), shake: 0, nut: null }))
  }
  private crownAt(it: (typeof this.items)[number]) {
    const h = it.trunk.hooks.crown[0]
    return { x: it.p.x + (it.p.flip ? -h.x : h.x), y: it.p.y + h.y }
  }
  update(dt: number) {
    for (const it of this.items) {
      it.shake = Math.max(0, it.shake - dt)
      const n = it.nut
      if (n) {
        n.t += dt
        if (n.y < n.ground) {
          n.vy += 260 * dt
          n.y = Math.min(n.ground, n.y + n.vy * dt)
          if (n.y >= n.ground) {
            sfx.plop()
            this.s.particles.add({ kind: 'smoke', x: n.x, y: n.ground, vx: 0, vy: -6, max: 0.5, color: '#f0e0c0', size: 2 })
            const p = this.s.player
            if (Math.hypot(p.x - n.x, p.y - n.ground) < 12) this.s.say(pick(['โอ๊ย! มะพร้าวหล่นใส่หัว!', 'ตุ้บ! ดาวขึ้นเลย', 'โชคดีที่ใส่หมวก... ไม่ได้ใส่!']), p.x, p.y - 30, 2.4)
            else this.s.say(pick(['ตุ้บ!', 'มะพร้าวหล่น! ใครจะเอาไปบ้าง', 'ระวังหัวนะ~']), n.x, n.ground - 16, 1.8)
          }
        }
        if (n.t > 8) it.nut = null
      }
    }
  }
  ground(g: Surface, t: number) {
    // Crown shadows sway on the sand.
    for (const it of this.items) {
      if (!this.s.onScreen(it.p.x, it.p.y, 50)) continue
      const c = this.crownAt(it)
      const sw = Math.sin(t * 0.9 + it.ph) * 2 + this.s.wind() * 2
      g.alpha(0.13)
      g.ellipse(c.x + 18 + sw, it.p.y + 4, 20, 5, INK)
      g.alpha(1)
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const it of this.items) {
      if (!this.s.onScreen(it.p.x, it.p.y - 40, 60)) continue
      add(it.p.y, () => {
        const g = this.s.gfx
        const tr = it.trunk
        drawShadow(g, it.p.x, it.p.y, 5, 1.6)
        g.draw(tr.canvas, Math.round(it.p.x - (it.p.flip ? tr.w - tr.ax : tr.ax)), Math.round(it.p.y - tr.ay), it.p.flip)
        const c = this.crownAt(it)
        const w = Math.sin(t * 0.9 + it.ph) * 0.7 + this.s.wind() * 0.9 + (it.shake > 0 ? Math.sin(t * 40) * 1.5 : 0)
        const f = Math.max(0, Math.min(PALM_FRAMES - 1, Math.round((PALM_FRAMES - 1) / 2 + w * 1.4)))
        const cr = palmCrown(it.p.v, f)
        g.draw(cr.canvas, Math.round(c.x - cr.w / 2), Math.round(c.y - 17))
      })
      if (it.nut) {
        const n = it.nut
        add(n.y >= n.ground ? n.ground : 99998, () => {
          const g = this.s.gfx
          if (n.y >= n.ground) drawShadow(g, n.x, n.ground, 3, 1)
          g.circle(n.x, n.y - 2, 2.4, '#6a8a32')
          g.px(n.x - 1, n.y - 3, '#a8c860')
        })
      }
    }
  }
  tap(x: number, y: number): boolean {
    for (const it of this.items) {
      const c = this.crownAt(it)
      if (Math.abs(x - c.x) < 20 && y > c.y - 14 && y < c.y + 12) {
        it.shake = 0.6
        sfx.whoosh()
        if (!it.nut && Math.random() < 0.55) it.nut = { x: c.x + rand(-4, 4), y: c.y + 4, vy: 0, ground: it.p.y + rand(4, 12), t: 0 }
        return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Boats

export interface Moored {
  x: number
  y: number
  hull?: Color
  ribbons?: Color[]
  canopy?: Color
  flip?: boolean
}

interface Route {
  kind: 'jetski' | 'banana' | 'speed' | 'parasail' | 'longtail'
  /** Loop: centre + radii, period (s). */
  cx: number
  cy: number
  rx: number
  ry: number
  period: number
  ph: number
  color?: Color
}

export class Boats implements Life {
  private dunk = 0
  private dunkAt = { x: 0, y: 0 }
  private riders: AvatarLook[] = Array.from({ length: 4 }, () => randomVisitorLook())
  constructor(
    private s: WorldScene,
    private moored: Moored[],
    private routes: Route[],
  ) {}
  private pos(r: Route, t: number) {
    const a = ((t + r.ph) / r.period) * Math.PI * 2
    return { x: r.cx + Math.cos(a) * r.rx, y: r.cy + Math.sin(a) * r.ry, dir: -Math.sin(a) >= 0 ? 1 : -1 }
  }
  update(dt: number, t: number) {
    this.dunk = Math.max(0, this.dunk - dt)
    for (const r of this.routes) {
      if (r.kind !== 'banana') continue
      const p = this.pos(r, t)
      // Once per lap at the far turn: everybody into the sea.
      const a = (((t + r.ph) / r.period) * Math.PI * 2) % (Math.PI * 2)
      if (this.dunk <= 0 && Math.abs(a - Math.PI) < 0.05) {
        this.dunk = 3.2
        this.dunkAt = { x: p.x, y: p.y }
        for (let i = 0; i < 14; i++) this.s.particles.add({ kind: 'drop', x: p.x + rand(-14, 14), y: p.y - 4, vx: rand(-30, 30), vy: rand(-50, -20), g: 120, max: 0.8, color: '#e8fbff' })
        if (this.s.onScreen(p.x, p.y, 0)) {
          this.s.say(pick(['ตูมมม! ตกน้ำทุกคน 555', 'บอกแล้วว่าให้เกาะแน่น ๆ!', 'กรี๊ดดด!!', 'ขออีกรอบ!']), p.x, p.y - 20, 2.4)
          sfx.splash()
        }
      }
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const g = () => this.s.gfx
    this.moored.forEach((m, i) => {
      if (!this.s.onScreen(m.x, m.y, 50)) return
      const sp = longtailBoat(m.hull, m.ribbons, m.canopy)
      add(m.y, () => {
        const G = g()
        const bob = Math.round(Math.sin(t * 1.6 + i * 1.3) * 1)
        G.draw(sp.canvas, Math.round(m.x - (m.flip ? sp.w - sp.ax : sp.ax)), Math.round(m.y - sp.ay + bob), m.flip)
        G.alpha(0.6)
        G.hline(Math.round(m.x - 26), Math.round(m.x + 28), Math.round(m.y + 1), '#e8fbff')
        G.alpha(1)
      })
    })
    for (const r of this.routes) {
      const p = this.pos(r, t)
      if (!this.s.onScreen(p.x, p.y, 70)) continue
      add(p.y, () => this.drawRoute(g(), r, p, t))
    }
    if (this.dunk > 0) {
      const d = this.dunkAt
      add(d.y + 2, () => {
        const G = g()
        for (let i = 0; i < 4; i++) {
          const x = d.x - 12 + i * 8 + Math.sin(t * 3 + i) * 2
          const y = d.y + 2 + Math.round(Math.sin(t * 5 + i))
          G.circle(x, y - 3, 2.2, ['#3a2838', '#6e4a35', '#2a2a3a', '#8a5a3a'][i])
          G.px(x - 1, y - 2, '#f0bd90')
          G.hline(Math.round(x - 3), Math.round(x + 3), y, '#fffaf0')
        }
      })
    }
  }
  private drawRoute(G: Surface, r: Route, p: { x: number; y: number; dir: number }, t: number) {
    const flip = p.dir < 0
    const wake = (len: number) => {
      for (let i = 2; i < len; i += 2) {
        G.px(Math.round(p.x - p.dir * i), Math.round(p.y + (i % 4 ? 1 : 0)), i < len / 2 ? '#ffffff' : '#d4f4f8')
        if (i % 4 === 0) G.px(Math.round(p.x - p.dir * i), Math.round(p.y - 1), '#e8fbff')
      }
    }
    if (r.kind === 'jetski') {
      wake(26)
      const sp = jetski(r.color)
      G.draw(sp.canvas, Math.round(p.x - sp.ax), Math.round(p.y - sp.ay), flip)
      // Rider in a life vest.
      G.rect(Math.round(p.x - 1), Math.round(p.y - 12), 3, 5, '#ff7a1a')
      G.rect(Math.round(p.x - 1), Math.round(p.y - 15), 3, 3, '#f0bd90')
      G.px(Math.round(p.x), Math.round(p.y - 16), '#3a2838')
      if (Math.floor(t * 8) % 2) G.px(Math.round(p.x - p.dir * 10), Math.round(p.y - 4), '#ffffff')
      return
    }
    if (r.kind === 'longtail') {
      wake(40)
      const sp = longtailBoat('#6e4a35', ['#e8514a', '#fffaf0', '#3d63b5'], '#43905a')
      G.draw(sp.canvas, Math.round(p.x - sp.ax), Math.round(p.y - sp.ay + Math.round(Math.sin(t * 6))), !flip)
      return
    }
    // Speedboat towing the banana boat or the parasail.
    wake(34)
    const boat = speedboat('#fffaf0', r.color ?? '#e8514a')
    G.draw(boat.canvas, Math.round(p.x - boat.ax), Math.round(p.y - boat.ay), flip)
    if (r.kind === 'banana') {
      const bx = p.x - p.dir * 44
      const rope = this.dunk > 0 ? 0 : 1
      G.line(p.x - p.dir * 14, p.y - 2, bx + p.dir * 18, p.y - 4, '#fffaf0')
      const bb = bananaBoat()
      G.draw(bb.canvas, Math.round(bx - bb.ax), Math.round(p.y - bb.ay + Math.round(Math.sin(t * 7))), flip)
      if (this.dunk > 0 || !rope) return
      this.riders.forEach((lk, i) => {
        const sx = bx - p.dir * (-12 + i * 8)
        const hop = Math.floor(t * 6 + i) % 3 === 0 ? 1 : 0
        const sp = avatarSprite(lk, 'side', i % 2 ? 'happy' : 'sit', { flip })
        G.draw(sp.canvas, Math.round(sx - sp.w / 2), Math.round(p.y - 5 - sp.h + 6 - hop))
        G.rect(Math.round(sx - 2), Math.round(p.y - 14 - hop), 4, 4, '#ff7a1a')
      })
    }
  }
  over(g: Surface, t: number) {
    for (const r of this.routes) {
      if (r.kind !== 'parasail') continue
      const p = this.pos(r, t)
      const cx = p.x - p.dir * 50
      const cy = p.y - 118 + Math.sin(t * 0.8) * 4
      if (!this.s.onScreen(cx, cy, 60)) continue
      g.line(p.x - p.dir * 12, p.y - 4, cx, cy + 22, '#fffaf0')
      // Rainbow canopy.
      const cols = ['#e8514a', '#ffd23f', '#6cc36a', '#5aa9e8', '#b37cf0']
      for (let i = 0; i < 5; i++) {
        const a0 = Math.PI + (i / 5) * Math.PI
        const a1 = Math.PI + ((i + 1) / 5) * Math.PI
        g.poly([[cx, cy + 6], [cx + Math.cos(a0) * 16, cy + 6 + Math.sin(a0) * 9], [cx + Math.cos(a1) * 16, cy + 6 + Math.sin(a1) * 9]], cols[i])
      }
      g.hline(Math.round(cx - 16), Math.round(cx + 16), Math.round(cy + 6), '#b8343f')
      for (const dx of [-14, -6, 6, 14]) g.line(cx + dx, cy + 6, cx, cy + 20, '#fffaf0')
      // The flyer, kicking their legs.
      const k = Math.floor(t * 3) % 2
      g.rect(Math.round(cx - 1), Math.round(cy + 19), 3, 5, '#ff7a1a')
      g.rect(Math.round(cx - 1), Math.round(cy + 16), 3, 3, '#f0bd90')
      g.px(Math.round(cx - 1 + k), Math.round(cy + 25), '#3a2838')
      g.px(Math.round(cx + 1 - k), Math.round(cy + 25), '#3a2838')
    }
  }
  tap(x: number, y: number): boolean {
    for (const m of this.moored) {
      if (Math.abs(x - m.x) < 28 && y > m.y - 20 && y < m.y + 4) {
        this.s.say(pick(['เรือหางยาวไปเกาะ คนละร้อยจ้า!', 'ผูกผ้าแพรขอพรแม่ย่านาง เดินทางปลอดภัย', 'เครื่องดังมากนะ ปิดหูด้วย 555', 'ไปถ้ำพระนางก็ได้ครับ']), m.x, m.y - 22, 2.4)
        sfx.tap()
        return true
      }
    }
    return false
  }
}

export function route(kind: Route['kind'], cx: number, cy: number, rx: number, ry: number, period: number, ph = 0, color?: Color): Route {
  return { kind, cx, cy, rx, ry, period, ph, color }
}

// ---------------------------------------------------------------------------
// Ghost crabs (ปูลม)

interface Crab {
  hx: number
  hy: number
  x: number
  y: number
  tx: number
  state: 'out' | 'run' | 'hide'
  timer: number
  t: number
  claws: number
}

export class Crabs implements Life {
  private crabs: Crab[]
  constructor(
    private s: WorldScene,
    holes: { x: number; y: number }[],
  ) {
    this.crabs = holes.map((h) => ({ hx: h.x, hy: h.y, x: h.x, y: h.y, tx: h.x, state: 'hide', timer: rand(1, 6), t: 0, claws: 0 }))
  }
  update(dt: number) {
    const p = this.s.player
    for (const c of this.crabs) {
      c.t += dt
      c.timer -= dt
      c.claws = Math.max(0, c.claws - dt)
      const near = Math.hypot(p.x - c.x, p.y - c.y) < 34
      if (c.state === 'hide') {
        if (c.timer <= 0 && !near) {
          c.state = 'out'
          c.timer = rand(2, 5)
          c.x = c.hx
          c.y = c.hy
          c.tx = c.hx + rand(-24, 24)
        }
        continue
      }
      if (near && c.state === 'out') {
        c.state = 'run'
        c.tx = c.hx
        c.claws = 0.8
      }
      const dx = c.tx - c.x
      const sp = c.state === 'run' ? 70 : 22
      if (Math.abs(dx) > 0.5) c.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt)
      else if (c.state === 'run') {
        c.state = 'hide'
        c.timer = rand(4, 9)
      } else if (c.timer <= 0) {
        c.tx = Math.random() < 0.3 ? c.hx : c.hx + rand(-24, 24)
        c.timer = rand(1.5, 4)
        if (Math.random() < 0.25) {
          c.state = 'run'
          c.tx = c.hx
        }
      }
    }
  }
  ground(g: Surface) {
    for (const c of this.crabs) {
      if (!this.s.onScreen(c.hx, c.hy, 10)) continue
      g.ellipse(c.hx, c.hy + 1, 2, 1, '#8a7456')
      g.px(c.hx, c.hy + 1, '#5a4a36')
    }
  }
  sorted(add: (y: number, draw: () => void) => void) {
    for (const c of this.crabs) {
      if (c.state === 'hide' || !this.s.onScreen(c.x, c.y, 10)) continue
      add(c.y, () => {
        const g = this.s.gfx
        const x = Math.round(c.x)
        const y = Math.round(c.y)
        const leg = Math.abs(c.tx - c.x) > 0.5 ? Math.floor(c.t * 18) % 2 : 0
        const body = '#e8d8b8'
        const dark = '#b8a080'
        g.ellipse(x, y - 1, 2.6, 1.6, dark)
        g.ellipse(x, y - 1.5, 2.2, 1.2, body)
        for (const s of [-1, 1]) {
          g.px(x + s * 3, y - (leg ? 0 : 1), dark)
          g.px(x + s * 3, y + (leg ? -1 : 0), dark)
        }
        // Eye stalks and claws (raised when scared).
        g.px(x - 1, y - 3, '#3a2838')
        g.px(x + 1, y - 3, '#3a2838')
        const up = c.claws > 0 ? 2 : 0
        g.px(x - 3, y - 2 - up, body)
        g.px(x + 3, y - 2 - up, body)
        if (up) {
          g.px(x - 3, y - 5, dark)
          g.px(x + 3, y - 5, dark)
        }
      })
    }
  }
  tap(x: number, y: number): boolean {
    for (const c of this.crabs) {
      if (c.state === 'hide') continue
      if (Math.abs(x - c.x) < 7 && Math.abs(y - c.y) < 6) {
        c.state = 'run'
        c.tx = c.hx
        c.claws = 1
        this.s.say(pick(['ก้ามพร้อม!', 'ปูลมวิ่งเร็วที่สุดในหาด!', 'อย่ามาใกล้นะ!', 'ฉึบ ๆ ๆ']), c.x, c.y - 10, 1.6)
        sfx.scratch()
        return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Seagulls

interface Gull {
  x: number
  y: number
  vx: number
  state: 'fly' | 'land' | 'peck'
  t: number
  timer: number
  alt: number
  lx: number
  ly: number
}

export class Gulls implements Life {
  private gulls: Gull[] = []
  constructor(
    private s: WorldScene,
    private sky: Rect,
    private landing: Rect[],
    n = 5,
  ) {
    for (let i = 0; i < n; i++) this.gulls.push({ x: rand(sky.x, sky.x + sky.w), y: rand(sky.y, sky.y + sky.h), vx: pick([-1, 1]) * rand(14, 22), state: 'fly', t: rand(0, 5), timer: rand(6, 14), alt: 0, lx: 0, ly: 0 })
  }
  update(dt: number) {
    const p = this.s.player
    for (const b of this.gulls) {
      b.t += dt
      b.timer -= dt
      if (b.state === 'fly') {
        b.x += b.vx * dt
        b.y += Math.sin(b.t * 0.8) * 6 * dt
        if (b.x < this.sky.x - 20) b.vx = Math.abs(b.vx)
        if (b.x > this.sky.x + this.sky.w + 20) b.vx = -Math.abs(b.vx)
        if (b.timer <= 0 && this.landing.length) {
          const r = pick(this.landing)
          b.lx = rand(r.x, r.x + r.w)
          b.ly = rand(r.y, r.y + r.h)
          b.state = 'land'
        }
      } else if (b.state === 'land') {
        const dx = b.lx - b.x
        const dy = b.ly - b.y
        const d = Math.hypot(dx, dy)
        if (d < 2) {
          b.state = 'peck'
          b.timer = rand(4, 10)
        } else {
          b.x += (dx / d) * Math.min(d, 40 * dt)
          b.y += (dy / d) * Math.min(d, 40 * dt)
          b.vx = dx
        }
      } else {
        if (b.timer <= 0 || (Math.hypot(p.x - b.x, p.y - b.y) < 26 && p.moving)) this.takeOff(b)
      }
    }
  }
  private takeOff(b: Gull) {
    b.state = 'fly'
    b.timer = rand(8, 16)
    b.vx = pick([-1, 1]) * rand(18, 26)
    b.y = Math.min(b.y, this.sky.y + this.sky.h)
    if (this.s.onScreen(b.x, b.y, 0) && Math.random() < 0.4) this.s.say(pick(['แกว๊ก!', 'แกว๊ก ๆ ๆ', 'ขอปลาหมึกหน่อย!']), b.x, b.y - 8, 1.4)
  }
  sorted(add: (y: number, draw: () => void) => void) {
    for (const b of this.gulls) {
      if (b.state !== 'peck' || !this.s.onScreen(b.x, b.y, 10)) continue
      add(b.y, () => {
        const g = this.s.gfx
        const x = Math.round(b.x)
        const y = Math.round(b.y)
        const f = b.vx < 0 ? -1 : 1
        const peck = Math.floor(b.t * 2) % 3 === 0 ? 1 : 0
        drawShadow(g, x, y, 3, 1)
        g.rect(x - 2, y - 4, 5, 3, '#fffaf0')
        g.hline(x - 2, x + 1, y - 3, '#b8c0cc')
        g.px(x - f * 3, y - 4, '#5a6070')
        g.rect(x + f * 2, y - 6 + peck, 2, 2, '#fffaf0')
        g.px(x + f * 4, y - 5 + peck, '#ffb020')
        g.px(x + f * 2, y - 6 + peck, '#3a2838')
        g.px(x - 1, y - 1, '#ffb020')
        g.px(x + 1, y - 1, '#ffb020')
      })
    }
  }
  over(g: Surface) {
    for (const b of this.gulls) {
      if (b.state === 'peck' || !this.s.onScreen(b.x, b.y, 10)) continue
      const x = Math.round(b.x)
      const y = Math.round(b.y)
      const flap = Math.floor(b.t * (b.state === 'land' ? 10 : 5)) % 2
      const c = this.s.isNight() ? '#c8c8e0' : '#fffaf0'
      g.px(x, y, c)
      g.px(x + 1, y, c)
      if (flap) {
        g.line(x - 4, y - 2, x, y, c)
        g.line(x + 5, y - 2, x + 1, y, c)
      } else {
        g.line(x - 4, y + 1, x, y, c)
        g.line(x + 5, y + 1, x + 1, y, c)
      }
      g.px(x - 4, y - (flap ? 2 : -1), '#5a6070')
      g.px(x + 5, y - (flap ? 2 : -1), '#5a6070')
    }
  }
  tap(x: number, y: number): boolean {
    for (const b of this.gulls) {
      if (Math.abs(x - b.x) < 7 && Math.abs(y - b.y) < 7) {
        this.takeOff(b)
        this.s.say(pick(['แกว๊ก! (บินหนี)', 'นกนางนวลโกรธแล้ว', 'แกว๊ก ๆ!']), b.x, b.y - 8, 1.4)
        sfx.whoosh()
        return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// The beach dog

export class BeachDog implements Life {
  x: number
  y: number
  private tx: number
  private ty: number
  private state: 'idle' | 'walk' | 'chase' | 'flee' | 'dig' | 'sleep' | 'shake' | 'happy' = 'sleep'
  private timer = rand(3, 7)
  private t = 0
  private flip = false
  private coat = DOG_COATS.find((c) => c.id === 'tan') ?? DOG_COATS[0]
  constructor(
    private s: WorldScene,
    private shore: ShoreFn,
    home: { x: number; y: number },
    private range: Rect,
    coat?: string,
  ) {
    this.x = this.tx = home.x
    this.y = this.ty = home.y
    if (coat) this.coat = DOG_COATS.find((c) => c.id === coat) ?? this.coat
  }
  update(dt: number, t: number) {
    this.t += dt
    this.timer -= dt
    const dx = this.tx - this.x
    const dy = this.ty - this.y
    const d = Math.hypot(dx, dy)
    const moving = this.state === 'walk' || this.state === 'chase' || this.state === 'flee'
    if (moving && d > 1) {
      const sp = this.state === 'walk' ? 20 : 48
      this.x += (dx / d) * Math.min(d, sp * dt)
      this.y += (dy / d) * Math.min(d, sp * dt)
      this.flip = dx < 0
    }
    // Chase the wave out, run away when it comes back in.
    const w = waveY(this.shore, this.x, t)
    if (this.state === 'chase' && d <= 1) {
      this.state = 'flee'
      this.tx = this.x + rand(-10, 10)
      this.ty = this.shore(this.x) + 22
      if (this.s.onScreen(this.x, this.y, 0) && Math.random() < 0.5) this.s.say(pick(['โฮ่ง! โฮ่ง! (สู้คลื่น)', 'คลื่นมาแล้ว หนีเร็ว!', 'โฮ่ง!']), this.x, this.y - 16, 1.6)
    } else if (this.state === 'flee' && d <= 1) {
      this.state = 'shake'
      this.timer = 1.2
      for (let i = 0; i < 10; i++) this.s.particles.add({ kind: 'drop', x: this.x + rand(-4, 4), y: this.y - 6, vx: rand(-30, 30), vy: rand(-30, -10), g: 90, max: 0.6, color: '#d4f4ff' })
    } else if ((this.state === 'walk' && d <= 1) || (!moving && this.timer <= 0)) {
      this.pickNext(w)
    }
    if (this.state === 'dig' && Math.random() < dt * 8) this.s.particles.add({ kind: 'dot', x: this.x - (this.flip ? -5 : 5), y: this.y, vx: (this.flip ? 1 : -1) * rand(10, 30), vy: rand(-20, -8), g: 60, max: 0.5, color: '#e0c89a' })
  }
  private pickNext(w: number) {
    const r = Math.random()
    if (r < 0.3) {
      this.state = 'chase'
      this.tx = this.x + rand(-20, 20)
      this.ty = Math.max(w - 6, this.shore(this.x) - 6)
    } else if (r < 0.55) {
      this.state = 'walk'
      this.tx = rand(this.range.x, this.range.x + this.range.w)
      this.ty = rand(this.range.y, this.range.y + this.range.h)
    } else if (r < 0.72) {
      this.state = 'dig'
      this.timer = rand(2, 4)
    } else if (r < 0.87) {
      this.state = 'sleep'
      this.timer = rand(5, 10)
    } else {
      this.state = 'idle'
      this.timer = rand(2, 4)
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (!this.s.onScreen(this.x, this.y, 16)) return
    add(this.y, () => {
      const g = this.s.gfx
      const moving = (this.state === 'walk' || this.state === 'chase' || this.state === 'flee') && Math.hypot(this.tx - this.x, this.ty - this.y) > 1
      let pose: DogPose = 'stand'
      if (moving) pose = Math.floor(this.t * (this.state === 'walk' ? 8 : 14)) % 2 ? 'walk1' : 'stand'
      else if (this.state === 'sleep') pose = 'sleep'
      else if (this.state === 'happy' || this.state === 'idle') pose = Math.floor(this.t * 5) % 2 ? 'wag' : 'sit'
      const sp = dogSprite(this.coat, pose, this.flip)
      const shake = this.state === 'shake' ? Math.round(Math.sin(this.t * 50)) : 0
      drawShadow(g, this.x, this.y, 7, 2)
      g.draw(sp.canvas, Math.round(this.x - sp.w / 2 + shake), Math.round(this.y - sp.h + 1))
      if (this.state === 'sleep' && Math.floor(t * 1.2) % 2 === 0) {
        g.px(this.x + 5, this.y - 12, '#e2e8ff')
        g.px(this.x + 6, this.y - 14, '#e2e8ff')
      }
    })
  }
  tap(x: number, y: number): boolean {
    if (Math.abs(x - this.x) < 11 && y > this.y - 16 && y < this.y + 4) {
      this.state = 'happy'
      this.timer = 2.4
      this.s.particles.hearts(this.x, this.y - 14, 3)
      this.s.say(pick(['โฮ่ง! (ขอเล่นด้วย)', 'หมาหาดตัวนี้ชื่อเจ้าทราย', 'แฮ่ก ๆ ร้อนจัง ขอลงน้ำ', 'เจ้าทรายขุดหลุมเก่งที่สุด', 'โฮ่ง ๆ (ขอปลาหมึก)']), this.x, this.y - 18, 2)
      sfx.bark()
      return true
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Footprints the waves wash away

export class Footprints implements Life {
  private prints: { x: number; y: number; t: number; left: boolean }[] = []
  private lx = 0
  private ly = 0
  private left = false
  constructor(
    private s: WorldScene,
    private shore: ShoreFn,
    private sandTo: number,
  ) {
    this.lx = s.player.x
    this.ly = s.player.y
  }
  update(dt: number, t: number) {
    const p = this.s.player
    if (Math.hypot(p.x - this.lx, p.y - this.ly) > 5) {
      this.lx = p.x
      this.ly = p.y
      if (p.y > this.shore(p.x) + 1 && p.y < this.sandTo) {
        this.left = !this.left
        this.prints.push({ x: p.x + (this.left ? -2 : 2), y: p.y, t: 24, left: this.left })
        if (this.prints.length > 90) this.prints.shift()
      }
    }
    for (const f of this.prints) {
      f.t -= dt
      if (f.y < waveY(this.shore, f.x, t) + 1) f.t = Math.min(f.t, 0.3)
    }
    this.prints = this.prints.filter((f) => f.t > 0)
  }
  ground(g: Surface) {
    for (const f of this.prints) {
      if (!this.s.onScreen(f.x, f.y, 4)) continue
      g.alpha(Math.min(0.45, f.t / 6))
      g.rect(Math.round(f.x), Math.round(f.y) - 1, 2, 3, INK)
      g.alpha(1)
    }
  }
}

// ---------------------------------------------------------------------------
// Wading and swimming

export class Waders implements Life {
  private bob: { x: number; y: number; ph: number; look: AvatarLook; ring: Color; dx: number }[]
  constructor(
    private s: WorldScene,
    private shore: ShoreFn,
    swimmers: { x: number; y: number; ring?: Color }[] = [],
    private seaColor: Color = '#6cc8da',
  ) {
    this.bob = swimmers.map((w) => ({ ...w, ph: rand(0, 6), look: randomVisitorLook(), ring: w.ring ?? pick(['#fffaf0', '#e8514a', '#ffd23f', '#ff9fc0']), dx: 0 }))
  }
  /** 0 on the sand, up to 1 in deep-ish water. */
  depth(x: number, y: number): number {
    return Math.max(0, Math.min(1, (this.shore(x) - y) / 36))
  }
  update(dt: number, t: number) {
    for (const w of this.bob) w.dx = Math.sin(t * 0.3 + w.ph) * 6
    const p = this.s.player
    if (p.moving && this.depth(p.x, p.y) > 0.05 && Math.random() < dt * 8) this.s.particles.add({ kind: 'ripple', x: p.x, y: p.y, max: 0.8, color: '#e8fbff', size: 5 })
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const w of this.bob) {
      const x = w.x + w.dx
      if (!this.s.onScreen(x, w.y, 20)) continue
      add(w.y, () => {
        const g = this.s.gfx
        const b = Math.round(Math.sin(t * 2 + w.ph))
        const sp = avatarSprite(w.look, 'front', Math.floor(t * 0.5 + w.ph) % 4 === 0 ? 'happy' : 'stand')
        g.drawPart(sp.canvas, 0, 0, sp.w, 13, Math.round(x - sp.w / 2), Math.round(w.y - 16 + b))
        g.ellipse(x, w.y - 3 + b, 7, 2.4, mix(w.ring, INK, 0.25))
        g.ellipse(x, w.y - 3.5 + b, 6, 1.8, w.ring)
        g.hline(Math.round(x - 8), Math.round(x + 8), Math.round(w.y - 1 + b), '#e8fbff')
      })
    }
  }
  over(g: Surface, t: number) {
    const p = this.s.player
    const dep = this.depth(p.x, p.y)
    if (dep <= 0.02) return
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    const h = Math.round(3 + dep * 11)
    const bob = dep > 0.5 ? Math.round(Math.sin(t * 2.4)) : 0
    g.alpha(0.82)
    g.rect(x - 9, y - h + bob, 19, h + 3, this.seaColor)
    g.alpha(1)
    for (let i = -9; i <= 9; i++) if ((i + Math.floor(t * 6)) % 4) g.px(x + i, y - h + bob, '#e8fbff')
    if (dep > 0.45) {
      // A rubber ring appears once you're swimming.
      g.ellipse(x, y - h + bob + 1, 8, 2.6, '#c8343f')
      g.ellipse(x, y - h + bob + 0.5, 7, 2, '#e8514a')
      for (const dx of [-5, 0, 5]) g.px(x + dx, y - h + bob, '#fffaf0')
    }
  }
}

// ---------------------------------------------------------------------------
// Horses along the beach (Hua Hin)

export class Horses implements Life {
  private h: { x0: number; x1: number; y: number; ph: number; rider: AvatarLook; coat: Color; speed: number }[]
  constructor(
    private s: WorldScene,
    lanes: { x0: number; x1: number; y: number; coat?: Color }[],
  ) {
    this.h = lanes.map((l, i) => ({ ...l, ph: i * 7, rider: randomVisitorLook(), coat: l.coat ?? ['#8a5a3a', '#f0e8dc', '#3a2a2a'][i % 3], speed: 9 + i * 2 }))
  }
  private pos(it: (typeof this.h)[number], t: number) {
    const len = Math.abs(it.x1 - it.x0)
    const ph = ((t + it.ph) * it.speed) / len % 2
    const k = ph < 1 ? ph : 2 - ph
    return { x: it.x0 + (it.x1 - it.x0) * k, flip: ph >= 1 }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const it of this.h) {
      const p = this.pos(it, t)
      if (!this.s.onScreen(p.x, it.y, 30)) continue
      add(it.y, () => drawHorse(this.s.gfx, p.x, it.y, t, p.flip === (it.x1 < it.x0), it.coat, it.rider))
    }
  }
  tap(x: number, y: number): boolean {
    for (const it of this.h) {
      const p = this.pos(it, performance.now() / 1000)
      if (Math.abs(x - p.x) < 14 && y > it.y - 30 && y < it.y + 3) {
        this.s.say(pick(['ขี่ม้าไหมครับ รอบละยี่สิบ!', 'ม้าชื่อเจ้าแต้ว ใจดีมาก', 'ฮี้~', 'เดินเลียบหาดถึงเขาตะเกียบเลย']), p.x, it.y - 32, 2.2)
        sfx.tap()
        return true
      }
    }
    return false
  }
}

export function drawHorse(g: Surface, x: number, y: number, t: number, flip: boolean, coat: Color, rider?: AvatarLook) {
  const X = Math.round(x)
  const Y = Math.round(y)
  const f = flip ? -1 : 1
  const d = mix(coat, INK, 0.3)
  const l = mix(coat, '#ffffff', 0.25)
  const step = Math.floor(t * 6) % 2
  drawShadow(g, X, Y, 12, 2.5)
  // Legs.
  for (const [lx, ph] of [[-7, 0], [-4, 1], [5, 1], [8, 0]] as [number, number][]) {
    const off = (step + ph) % 2 ? 1 : -1
    g.vline(X + f * lx + off, Y - 8, Y, d)
    g.px(X + f * lx + off, Y, INK)
  }
  // Body, neck and head.
  g.ellipse(X, Y - 11, 10, 4.5, d)
  g.ellipse(X, Y - 11.5, 9.5, 4, coat)
  g.ellipse(X - 2, Y - 13, 6, 1.5, l)
  g.thickLine(X + f * 8, Y - 13, X + f * 12, Y - 21, 3, coat)
  g.ellipse(X + f * 14, Y - 21, 3.5, 2, coat)
  g.px(X + f * 16, Y - 21, d)
  g.px(X + f * 12, Y - 23, INK)
  // Mane, tail, red tassels and saddle cloth.
  g.line(X + f * 10, Y - 22, X + f * 7, Y - 15, '#3a2a2a')
  g.line(X - f * 10, Y - 12, X - f * 12, Y - 5 + step, '#3a2a2a')
  g.px(X + f * 13, Y - 19, '#e8514a')
  g.px(X + f * 14, Y - 18, '#e8514a')
  g.rect(X - 4, Y - 16, 8, 4, '#e8514a')
  g.hline(X - 4, X + 3, Y - 12, '#ffd23f')
  if (rider) {
    const sp = avatarSprite(rider, 'side', 'sit', { flip })
    g.draw(sp.canvas, Math.round(X - sp.w / 2), Math.round(Y - 14 - sp.h + 5))
  }
}

// ---------------------------------------------------------------------------
// Fire show at night (poi spinning on the sand)

export class FireShow implements Life {
  private look = randomVisitorLook()
  constructor(
    private s: WorldScene,
    private x: number,
    private y: number,
  ) {}
  sorted(add: (y: number, draw: () => void) => void) {
    if (!this.s.isNight() || !this.s.onScreen(this.x, this.y, 30)) return
    add(this.y, () => {
      const g = this.s.gfx
      const sp = avatarSprite(this.look, 'front', 'happy')
      drawShadow(g, this.x, this.y, 6, 2)
      g.draw(sp.canvas, Math.round(this.x - sp.w / 2), Math.round(this.y - sp.h + 1))
    })
  }
  update(dt: number, t: number) {
    if (!this.s.isNight() || !this.s.onScreen(this.x, this.y, 20)) return
    for (const k of [0, Math.PI]) {
      const a = t * 7 + k
      const px = this.x + Math.cos(a) * 11
      const py = this.y - 18 + Math.sin(a) * 9
      if (Math.random() < dt * 40) this.s.particles.add({ kind: 'dot', x: px, y: py, vx: rand(-4, 4), vy: rand(-8, 2), max: rand(0.25, 0.5), color: pick(['#ffd23f', '#ff7a1a', '#fff3a6']) })
    }
  }
  glow(g: Surface, t: number) {
    if (!this.s.isNight()) return
    for (const k of [0, Math.PI]) {
      const a = t * 7 + k
      drawGlow(g, this.x + Math.cos(a) * 11, this.y - 18 + Math.sin(a) * 9, 7, 1, '#ffb040')
    }
    drawGlow(g, this.x, this.y - 12, 26, 0.6, '#ff9a40')
  }
  tap(x: number, y: number): boolean {
    if (!this.s.isNight() || Math.abs(x - this.x) < 14 === false || Math.abs(y - (this.y - 14)) > 18) return false
    this.s.say(pick(['โชว์ควงไฟ! ปรบมือหน่อย~', 'ห้ามลองเองที่บ้านนะ', 'ร้อนนน แต่เท่!']), this.x, this.y - 34, 2.2)
    sfx.whoosh()
    return true
  }
}

// ---------------------------------------------------------------------------
// Kites over the beach

export class Kites implements Life {
  constructor(
    private s: WorldScene,
    private kites: { x: number; y: number; color: Color; tail: Color }[],
  ) {}
  over(g: Surface, t: number) {
    for (const k of this.kites) {
      const kx = k.x + Math.sin(t * 0.7 + k.x) * 6 + this.s.wind() * 6
      const ky = k.y - 70 + Math.sin(t * 1.1 + k.y) * 4
      if (!this.s.onScreen(kx, ky, 30) && !this.s.onScreen(k.x, k.y, 10)) continue
      g.line(k.x + 2, k.y - 16, kx, ky + 5, '#fffaf0')
      g.poly([[kx, ky - 5], [kx + 4, ky], [kx, ky + 5], [kx - 4, ky]], k.color)
      g.line(kx, ky - 5, kx, ky + 5, mix(k.color, INK, 0.3))
      for (let i = 1; i < 6; i++) g.px(kx + Math.round(Math.sin(t * 4 + i) * 2), ky + 5 + i * 2, i % 2 ? k.tail : '#fffaf0')
    }
  }
}

// ---------------------------------------------------------------------------
// Passport stamp on arrival

export class BeachArrival implements Life {
  private done = false
  constructor(private s: WorldScene) {}
  update() {
    if (this.done) return
    this.done = true
    if (mode.value !== 'world' || mapId.value !== this.s.map.id) return
    if (beachArrived(this.s.map.id)) toast(`ประทับตราพาสปอร์ตทะเล: ${PLACE_BY_ID[this.s.map.id]?.name ?? ''}`, 'sun')
  }
}
