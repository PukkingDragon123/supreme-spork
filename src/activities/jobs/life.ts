// Cute ambient life for the job scenes: a temple cat that wanders, sits,
// grooms, naps and purrs when the player comes close (and can leave paw
// prints), pigeons that peck and scatter, kids who watch and cheer,
// dragonflies, a croaking frog and a wall gecko.

import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { catPoseSprite, pigeonSprite, type CatPose } from '../../art/characters'
import { avatarSprite, type AvatarLook } from '../../art/avatar'
import { drawAt, shadow } from '../../art/jobs'
import { drawDragonfly, drawFrog, drawGecko, drawHeartPop, drawZzz } from '../../art/workLife'
import type { Worker } from './worker'

type Rect = [number, number, number, number]

interface Cat {
  x: number
  y: number
  tx: number
  ty: number
  area: Rect
  color: string
  state: 'walk' | 'sit' | 'groom' | 'sleep' | 'happy'
  t: number
  flip: boolean
  step: number
  heart: number
  onStep?: (x: number, y: number, flip: boolean) => void
}

interface Pigeon {
  x: number
  y: number
  hx: number
  hy: number
  vx: number
  vy: number
  flying: number
  gone: number
  flip: boolean
  ph: number
  tone: number
}

interface Kid {
  x: number
  y: number
  look: AvatarLook
  flip: boolean
  cheer: number
  ph: number
}

interface Fly {
  x: number
  y: number
  tx: number
  ty: number
  area: Rect
  wait: number
  color: string
}

export const KID_LOOKS: AvatarLook[] = [
  { gender: 'f', skin: 1, face: 0, hairColor: 0, hair: 'hair_twin', top: 'top_school_f', bottom: 'bot_school_skirt', shoes: 'shoes_school', head: null, neck: null, hand: null, back: 'back_schoolbag' },
  { gender: 'm', skin: 2, face: 1, hairColor: 0, hair: 'hair_short', top: 'top_school_m', bottom: 'bot_school_navy', shoes: 'shoes_school', head: null, neck: null, hand: null, back: null },
  { gender: 'f', skin: 0, face: 2, hairColor: 1, hair: 'hair_ponytail', top: 'top_retro_floral', bottom: 'bot_songkran_shorts', shoes: null, head: null, neck: null, hand: 'hand_bubbletea', back: null },
]

export class Life {
  cats: Cat[] = []
  pigeonsList: Pigeon[] = []
  kids: Kid[] = []
  flies: Fly[] = []
  frogs: { x: number; y: number; croak: number; next: number }[] = []
  geckos: { x: number; y: number; ty: number; area: Rect; wait: number }[] = []
  t = 0

  cat(x: number, y: number, area: Rect, o: { color?: string; state?: Cat['state']; onStep?: Cat['onStep'] } = {}) {
    this.cats.push({ x, y, tx: x, ty: y, area, color: o.color ?? pick(['#f5a55a', '#fffaf0', '#6d6070', '#e8c898']), state: o.state ?? 'sit', t: rand(1, 3), flip: Math.random() < 0.5, step: 0, heart: 0, onStep: o.onStep })
    return this
  }

  pigeons(n: number, area: Rect) {
    for (let i = 0; i < n; i++) {
      const x = rand(area[0], area[2])
      const y = rand(area[1], area[3])
      this.pigeonsList.push({ x, y, hx: x, hy: y, vx: 0, vy: 0, flying: 0, gone: 0, flip: Math.random() < 0.5, ph: rand(0, 6), tone: i % 3 })
    }
    return this
  }

  kid(x: number, y: number, look: AvatarLook = pick(KID_LOOKS), flip = false) {
    this.kids.push({ x, y, look, flip, cheer: 0, ph: rand(0, 6) })
    return this
  }

  dragonflies(n: number, area: Rect) {
    for (let i = 0; i < n; i++) this.flies.push({ x: rand(area[0], area[2]), y: rand(area[1], area[3]), tx: 0, ty: 0, area, wait: 0, color: pick(['#4fb0e0', '#e8514a', '#6cc36a']) })
    return this
  }

  frog(x: number, y: number) {
    this.frogs.push({ x, y, croak: 0, next: rand(2, 5) })
    return this
  }

  gecko(x: number, y: number, area: Rect) {
    this.geckos.push({ x, y, ty: y, area, wait: rand(2, 5) })
    return this
  }

  /** Kids clap and cats perk up (call on a praise). */
  cheer() {
    for (const k of this.kids) k.cheer = 1.2
  }

  update(dt: number, worker?: Worker | null) {
    this.t += dt
    const wx = worker?.x ?? -999
    const wy = worker?.y ?? -999
    for (const c of this.cats) {
      c.t -= dt
      c.heart = Math.max(0, c.heart - dt)
      const near = Math.hypot(wx - c.x, (wy - c.y) * 1.3) < 22
      if (near && c.state !== 'walk' && c.state !== 'happy' && c.state !== 'sleep') {
        c.state = 'happy'
        c.t = 1.6
        c.heart = 1.2
      }
      if (c.state === 'walk') {
        const dx = c.tx - c.x
        const dy = c.ty - c.y
        const d = Math.hypot(dx, dy)
        if (d < 1) {
          c.state = pick(['sit', 'groom', 'sit', 'sleep'] as const)
          c.t = c.state === 'sleep' ? rand(5, 9) : rand(2, 4)
        } else {
          const sp = 14
          c.x += (dx / d) * sp * dt
          c.y += (dy / d) * sp * dt
          c.flip = dx < 0
          const before = Math.floor(c.step)
          c.step += dt * 5
          if (Math.floor(c.step) !== before) c.onStep?.(c.x, c.y, c.flip)
        }
      } else if (c.t <= 0) {
        c.state = 'walk'
        c.tx = rand(c.area[0], c.area[2])
        c.ty = rand(c.area[1], c.area[3])
      }
    }
    for (const p of this.pigeonsList) {
      if (p.gone > 0) {
        p.gone -= dt
        if (p.gone <= 0) {
          p.flying = -1
          p.x = p.hx + rand(-30, 30)
          p.y = p.hy - 80
        }
        continue
      }
      if (p.flying > 0) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy -= 40 * dt
        p.flying -= dt
        if (p.flying <= 0) p.gone = rand(5, 9)
        continue
      }
      if (p.flying < 0) {
        // Gliding back in to land.
        p.x += (p.hx - p.x) * Math.min(1, dt * 2)
        p.y += (p.hy - p.y) * Math.min(1, dt * 2)
        if (Math.hypot(p.hx - p.x, p.hy - p.y) < 1.5) p.flying = 0
        continue
      }
      p.ph += dt
      if (Math.random() < dt * 0.4) {
        p.hx += rand(-6, 6)
        p.flip = Math.random() < 0.5
      }
      p.x += (p.hx - p.x) * Math.min(1, dt * 3)
      if (Math.hypot(wx - p.x, (wy - p.y) * 1.2) < 26) {
        p.flying = 1.4
        p.vx = (p.x < wx ? -1 : 1) * rand(40, 70)
        p.vy = rand(-50, -30)
        p.flip = p.vx < 0
      }
    }
    for (const k of this.kids) k.cheer = Math.max(0, k.cheer - dt)
    for (const f of this.flies) {
      f.wait -= dt
      if (f.wait <= 0) {
        f.tx = rand(f.area[0], f.area[2])
        f.ty = rand(f.area[1], f.area[3])
        f.wait = rand(0.8, 2.2)
      }
      f.x += (f.tx - f.x) * Math.min(1, dt * 3)
      f.y += (f.ty - f.y) * Math.min(1, dt * 3)
    }
    for (const fr of this.frogs) {
      fr.next -= dt
      fr.croak = Math.max(0, fr.croak - dt * 2)
      if (fr.next <= 0) {
        fr.croak = 1
        fr.next = rand(3, 6)
      }
    }
    for (const gk of this.geckos) {
      gk.wait -= dt
      if (gk.wait <= 0) {
        gk.ty = rand(gk.area[1], gk.area[3])
        gk.x = Math.max(gk.area[0], Math.min(gk.area[2], gk.x + rand(-10, 10)))
        gk.wait = rand(3, 6)
      }
      gk.y += (gk.ty - gk.y) * Math.min(1, dt * 2)
    }
  }

  /** Ground-level life (cats, pigeons, kids, frogs), drawn under the player. */
  drawGround(g: Surface) {
    const t = this.t
    for (const gk of this.geckos) drawGecko(g, gk.x, gk.y, t)
    for (const fr of this.frogs) drawFrog(g, fr.x, fr.y, fr.croak)
    for (const p of this.pigeonsList) {
      if (p.gone > 0) continue
      if (p.flying === 0) shadow(g, p.x, p.y + 1, 3, 1, 0.4)
      const frame = p.flying !== 0 ? (Math.floor(t * 10) % 2 ? 'fly1' : 'fly2') : Math.sin(p.ph * 3) > 0.4 ? 'peck' : 'stand'
      drawAt(g, pigeonSprite(frame, p.flip, p.tone), p.x, p.y + 1)
    }
    for (const c of this.cats) {
      shadow(g, c.x, c.y + 1, 5, 1.6, 0.5)
      let pose: CatPose = 'sit'
      if (c.state === 'walk') pose = Math.floor(c.step) % 2 ? 'walk1' : 'walk2'
      else if (c.state === 'groom') pose = Math.floor(t * 3) % 2 ? 'groom' : 'sit'
      else if (c.state === 'sleep') pose = 'sleep'
      else if (c.state === 'happy') pose = 'happy'
      drawAt(g, catPoseSprite(pose, c.color, c.flip), c.x, c.y + 1)
      if (c.state === 'sleep') drawZzz(g, c.x + 4, c.y - 8, t)
      if (c.heart > 0) drawHeartPop(g, c.x + (c.flip ? -4 : 4), c.y - 12 - (1.2 - c.heart) * 6)
    }
    for (const k of this.kids) {
      const hop = k.cheer > 0 && Math.floor(k.cheer * 8) % 2 ? 2 : 0
      shadow(g, k.x, k.y + 1, 6, 2)
      const pose = k.cheer > 0 ? 'happy' : Math.sin(t * 0.8 + k.ph) > 0.85 ? 'wai' : 'stand'
      drawAt(g, avatarSprite(k.look, 'front', pose, { flip: k.flip }), k.x, k.y + 1 - hop)
      if (k.cheer > 0.6) drawHeartPop(g, k.x + 5, k.y - 32 - (1.2 - k.cheer) * 8)
    }
  }

  /** Flying life (dragonflies), drawn over everything. */
  drawAir(g: Surface) {
    for (const f of this.flies) drawDragonfly(g, f.x, f.y, this.t, f.tx >= f.x ? 1 : -1, f.color)
  }
}
