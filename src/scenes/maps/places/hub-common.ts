// Shared scene helpers for the hub markets and the temple fair: the arrival
// hook (hub_visit + passport stamp), quest-giver characters with a floating
// "!" marker, hawkers shouting sales lines, trading shoppers, the blind-box
// queue, hippo balloons, sleepy orange cats, hotspot shorthands.

import type { Color, Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { avatarSprite, type AvatarLook, type Pose, type View } from '../../../art/avatar'
import { drawShadow } from '../../../art/props'
import { catPoseSprite } from '../../../art/characters'
import { randomVisitorLook, type Hotspot, type WorldScene } from '../../world'
import type { Life } from '../../life'
import { drawPerson, type Gag, type GagPose, type Extra } from '../../gags'
import { mode, mapId } from '../../../ui/store'
import { hubArrived, HUB_META } from '../../../game/hubs'
import { drawMiniHippo, INK, mix } from '../../../art/places/hub-kit'

export function look(o: Partial<AvatarLook>): AvatarLook {
  return { ...randomVisitorLook(), ...o }
}

export type R = { x: number; y: number; w: number; h: number }

/** Hotspot shorthand: rect + stand point (+ optional extras). */
export function hs(id: string, label: string, hint: string, icon: string, rect: R, at: { x: number; y: number }, o: Partial<Hotspot> = {}): Hotspot {
  return { id, label, hint, icon, rect, at, face: 'up', ...o }
}

/** Remote-player chatter for a hub map (see HUB_META). */
export function hubChat(id: string): string[] {
  return HUB_META[id]?.chat ?? []
}

// ---------------------------------------------------------------------------
// Arrival: count the visit once the player really stands on this map.

export class HubArrival implements Life {
  private done = false
  constructor(private s: WorldScene) {}
  update() {
    if (this.done) return
    this.done = true
    // Only in the live game (dev pages and the title backdrop build scenes too).
    if (mode.value === 'world' && mapId.value === this.s.map.id) hubArrived(this.s.map.id)
  }
}

// ---------------------------------------------------------------------------
// Quest givers.

/** Draw the floating quest bubble ("!") above a character's head. */
export function questMarker(g: Surface, x: number, y: number, t: number) {
  const bob = Math.round(Math.sin(t * 3) * 1.2)
  const bx = Math.round(x - 4)
  const by = Math.round(y - 11 + bob)
  g.rect(bx, by, 9, 9, INK)
  g.rect(bx + 1, by + 1, 7, 7, '#ffe27a')
  g.hline(bx + 1, bx + 7, by + 1, '#fff6c2')
  g.rect(bx + 4, by + 2, 1, 3, INK)
  g.px(bx + 4, by + 6, INK)
  g.px(bx + 3, by + 9, INK)
  g.px(bx + 4, by + 9, INK)
  g.px(bx + 4, by + 10, INK)
}

export interface GiverOpts {
  view?: View
  extras?: Extra[]
  pose?: Pose
  /** Extra overlay drawn after the person (props in hand, costume bits). */
  over?: (g: Surface, p: GagPose) => void
  z?: number
}

/** A quest-giving character (stands still, "!" marker above the head). */
export function giverGag(lk: AvatarLook, x: number, y: number, lines: string[], o: GiverOpts = {}): Gag {
  return {
    x,
    y,
    z: o.z,
    h: 30,
    lines,
    draw: (g, p) => {
      drawPerson(g, lk, p, o.view ?? 'front', o.extras ?? [], p.react > 0 ? 'happy' : o.pose)
      o.over?.(g, p)
      questMarker(g, p.x, p.y - 30, p.t + x * 0.1)
    },
    react: (s, gx, gy) => {
      s.particles.sparkles(gx, gy - 32, 5, '#fff3a6', 8)
      sfx.chime()
    },
  }
}

/** A character gag that may carry an overlay (vendor with a prop, performer…). */
export function personGag(lk: AvatarLook, x: number, y: number, lines: string[], o: GiverOpts & { walk?: Gag['walk']; react?: Gag['react']; h?: number } = {}): Gag {
  return {
    x,
    y,
    z: o.z,
    h: o.h,
    lines,
    walk: o.walk,
    draw: (g, p) => {
      drawPerson(g, lk, p, o.view ?? 'front', o.extras ?? [], o.pose)
      o.over?.(g, p)
    },
    react: o.react,
  }
}

// ---------------------------------------------------------------------------
// Hawkers: vendors on screen shout sales lines now and then.

export class Hawkers implements Life {
  private next = rand(2, 5)
  constructor(
    private s: WorldScene,
    private spots: { x: number; y: number; lines: string[] }[],
    private every: [number, number] = [4, 9],
  ) {}
  update(dt: number) {
    this.next -= dt
    if (this.next > 0) return
    this.next = rand(this.every[0], this.every[1])
    const vis = this.spots.filter((p) => this.s.onScreen(p.x, p.y, -10))
    if (!vis.length) return
    const p = pick(vis)
    this.s.say(pick(p.lines), p.x, p.y, 2.2)
  }
}

// ---------------------------------------------------------------------------
// Shoppers trading with each other (two people facing, a 🤝 moment).

export function tradePairGag(x: number, y: number, a: Partial<AvatarLook>, b: Partial<AvatarLook>, lines: string[]): Gag {
  const la = look(a)
  const lb = look(b)
  return {
    x,
    y,
    w: 30,
    h: 28,
    lines,
    draw: (g, p) => {
      const deal = p.react > 0 || Math.floor(p.t * 0.5 + x) % 5 === 0
      const pa: GagPose = { ...p, x: p.x - 7, flip: false, moving: false }
      const pb: GagPose = { ...p, x: p.x + 7, flip: true, moving: false }
      const sa = avatarSprite(la, 'side', deal ? 'offer' : 'stand', { flip: false })
      const sb = avatarSprite(lb, 'side', deal ? 'offer' : 'stand', { flip: true })
      drawShadow(g, pa.x, p.y, 6, 2)
      drawShadow(g, pb.x, p.y, 6, 2)
      g.draw(sa.canvas, Math.round(pa.x - sa.w / 2), Math.round(p.y - sa.h + 1))
      g.draw(sb.canvas, Math.round(pb.x - sb.w / 2), Math.round(p.y - sb.h + 1))
      // The item changing hands.
      const bob = deal ? Math.round(Math.sin(p.t * 8)) : 0
      g.rect(p.x - 1, p.y - 15 + bob, 3, 3, deal ? '#ffd23f' : '#c8a0ff')
      g.px(p.x, p.y - 16 + bob, '#ffffff')
      if (deal && Math.floor(p.t * 4) % 2) {
        g.px(p.x - 3, p.y - 22, '#fff3a6')
        g.px(p.x + 3, p.y - 23, '#fff3a6')
        g.px(p.x, p.y - 25, '#ffffff')
      }
    },
    react: (s, gx, gy) => {
      s.particles.sparkles(gx, gy - 18, 8, '#ffe27a', 10)
      sfx.coins(3)
    },
  }
}

// ---------------------------------------------------------------------------
// A blind-box queue (parody shop "ป๊อปบุญ"): the sign flips to SOLD OUT,
// everybody groans, it restocks, everybody cheers.

export class BlindBoxQueue implements Life {
  private looks: AvatarLook[]
  private t = 0
  private soldOut = false
  private next = rand(12, 20)
  private hop = 0
  constructor(
    private s: WorldScene,
    private x: number,
    private y: number,
    /** Queue direction (people line up to the right/left of the door). */
    private dir: 1 | -1 = 1,
    n = 7,
  ) {
    this.looks = Array.from({ length: n }, (_, i) =>
      look(i === n - 1 ? { head: 'head_sunhat', hand: 'hand_parasol' } : i === 2 ? { hand: 'hand_phone' } : i === 4 ? { back: 'back_schoolbag' } : {}),
    )
  }
  update(dt: number) {
    this.t += dt
    this.next -= dt
    this.hop = Math.max(0, this.hop - dt)
    if (this.next > 0) return
    this.soldOut = !this.soldOut
    this.next = this.soldOut ? rand(6, 9) : rand(14, 22)
    if (!this.s.onScreen(this.x, this.y, 20)) return
    if (this.soldOut) {
      this.s.say(pick(['ของหมดแล้วค่า~', 'Sold out ค่ะ!', 'หมดล็อตนี้แล้วนะคะ']), this.x, this.y - 30, 2.4)
      setTimeout(() => this.s.say(pick(['เฮ้ออออ...', 'ต่อคิวมาสามชั่วโมง!!', 'ไม่นะะะ']), this.x + this.dir * 34, this.y - 30, 2.4), 700)
    } else {
      this.hop = 1
      this.s.say(pick(['ของเข้าแล้วค่า!', 'ล็อตใหม่มาแล้ว!']), this.x, this.y - 30, 2.2)
      setTimeout(() => this.s.say(pick(['เย้ยยย!', 'รอดแล้วว', 'ขอสีม่วงนะ ขอสีม่วง!']), this.x + this.dir * 24, this.y - 30, 2.2), 600)
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (!this.s.onScreen(this.x + this.dir * 40, this.y, 60)) return
    this.looks.forEach((lk, i) => {
      const x = this.x + this.dir * (12 + i * 11)
      const y = this.y + (i % 2)
      add(y, () => {
        const g = this.s.gfx
        const sad = this.soldOut
        const up = !sad && this.hop > 0 && Math.floor((t + i * 0.13) * 8) % 2 ? 2 : 0
        const pose: Pose = sad ? (i % 3 === 0 ? 'bow' : 'stand') : this.hop > 0 ? 'happy' : i === 2 && Math.floor(t + i) % 4 === 0 ? 'offer' : 'stand'
        const sp = avatarSprite(lk, 'side', pose, { flip: this.dir > 0 })
        drawShadow(g, x, y, 6, 2)
        g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - sp.h + 1 - up))
      })
    })
    // Little SOLD OUT / NEW sign on a stand by the door.
    add(this.y + 2, () => {
      const g = this.s.gfx
      const sx = this.x - this.dir * 2 - 6
      const sy = this.y - 16
      g.vline(sx + 6, sy + 8, this.y, '#8a8480')
      g.rect(sx, sy, 13, 8, INK)
      g.rect(sx + 1, sy + 1, 11, 6, this.soldOut ? '#e8514a' : '#6cc36a')
      g.hline(sx + 3, sx + 9, sy + 3, '#fffaf0')
      g.hline(sx + 3, sx + 7, sy + 5, '#fffaf0')
    })
  }
  tap(x: number, y: number): boolean {
    const x0 = Math.min(this.x, this.x + this.dir * 90)
    if (x < x0 || x > x0 + 90 || y < this.y - 26 || y > this.y + 4) return false
    this.s.say(
      this.soldOut ? pick(['ของหมดอีกแล้ว...', 'รอล็อตหน้านะ', 'ขอแค่สีเดียวเอง!']) : pick(['ห้ามแซงคิวนะ!', 'คิวนี้ยาวไปถึงซอย 26', 'ขอให้ได้ตัวลับ~', 'มาต่อคิวตั้งแต่ตีห้า']),
      x,
      this.y - 30,
      2.2,
    )
    sfx.tap()
    return true
  }
}

// ---------------------------------------------------------------------------
// Pygmy-hippo balloons (หมูดึ๋ง) bobbing on strings; tap one and it floats away.

interface Balloon {
  ax: number
  ay: number
  x: number
  y: number
  vy: number
  free: boolean
  gone: number
  color: Color
  ph: number
}

export class HippoBalloons implements Life {
  private items: Balloon[]
  constructor(
    private s: WorldScene,
    anchors: { x: number; y: number; color?: Color }[],
  ) {
    this.items = anchors.map((a, i) => ({ ax: a.x, ay: a.y, x: a.x, y: a.y - 26, vy: 0, free: false, gone: 0, color: a.color ?? ['#b4a8c8', '#9fd0ff', '#ff9fc0'][i % 3], ph: rand(0, 6) }))
  }
  update(dt: number, t: number) {
    for (const b of this.items) {
      if (b.free) {
        b.vy -= 10 * dt
        b.y += b.vy * dt
        b.x += Math.sin(t * 1.3 + b.ph) * 8 * dt + this.s.wind() * 6 * dt
        if (b.y < this.s.camY - 60) {
          b.gone += dt
          if (b.gone > 9) {
            // A new one gets tied on.
            b.free = false
            b.gone = 0
            b.vy = 0
            b.x = b.ax
            b.y = b.ay - 26
          }
        }
      } else {
        b.x = b.ax + Math.sin(t * 1.4 + b.ph) * 2 + this.s.wind() * 2
        b.y = b.ay - 26 + Math.sin(t * 2 + b.ph) * 1
      }
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const b of this.items) {
      if (!this.s.onScreen(b.x, b.y, 20)) continue
      add(b.free ? 99999 : b.ay + 1, () => {
        const g = this.s.gfx
        if (!b.free) g.line(b.ax, b.ay - 8, b.x, b.y + 4, '#fffaf0')
        else g.line(b.x, b.y + 4, b.x - 1, b.y + 14, '#fffaf0')
        drawHippoBalloon(g, b.x, b.y, b.color, t)
      })
    }
  }
  tap(x: number, y: number): boolean {
    for (const b of this.items) {
      if (b.free) continue
      if (Math.abs(x - b.x) < 8 && y > b.y - 8 && y < b.y + 6) {
        b.free = true
        b.vy = -6
        this.s.say(pick(['ลูกโป่งหมูดึ๋งลอยไปแล้ววว!', 'บ๊ายบาย หมูดึ๋ง~', 'แงงง ลูกโป่งหนู!']), b.ax, b.ay - 30, 2.4)
        sfx.whoosh()
        return true
      }
    }
    return false
  }
}

/** A hippo-shaped foil balloon centred at (x, y). */
export function drawHippoBalloon(g: Surface, x: number, y: number, body: Color, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  const D = mix(body, INK, 0.3)
  const L = mix(body, '#ffffff', 0.45)
  g.ellipse(X, Y, 6, 5, D)
  g.ellipse(X, Y - 0.5, 5.5, 4.5, body)
  // Snout, ears, eyes, cheeks.
  g.ellipse(X + 1, Y + 2, 3.5, 2, mix(body, '#ffffff', 0.2))
  g.px(X, Y + 2, D)
  g.px(X + 2, Y + 2, D)
  g.px(X - 4, Y - 5, D)
  g.px(X + 4, Y - 5, D)
  g.px(X - 2, Y - 1, INK)
  g.px(X + 2, Y - 1, INK)
  g.px(X - 4, Y + 1, '#ff9fc0')
  g.px(X + 5, Y + 1, '#ff9fc0')
  g.px(X - 3, Y - 3, L)
  g.px(X - 2, Y - 4, L)
  if (Math.floor(t * 2 + x) % 7 === 0) g.px(X - 3, Y - 3, '#ffffff')
  g.px(X, Y + 5, D)
}

// ---------------------------------------------------------------------------
// Orange cats doing orange-cat things (one shared brain cell).

export class OrangeCats implements Life {
  private cats: { x: number; y: number; pose: 'loaf' | 'sleep' | 'sit'; t: number; react: number; flip: boolean }[]
  constructor(
    private s: WorldScene,
    spots: { x: number; y: number; pose?: 'loaf' | 'sleep' | 'sit' }[],
  ) {
    this.cats = spots.map((p) => ({ x: p.x, y: p.y, pose: p.pose ?? 'loaf', t: rand(0, 5), react: 0, flip: Math.random() < 0.5 }))
  }
  update(dt: number) {
    for (const c of this.cats) {
      c.t += dt
      c.react = Math.max(0, c.react - dt)
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const c of this.cats) {
      if (!this.s.onScreen(c.x, c.y, 16)) continue
      add(c.y, () => {
        const g = this.s.gfx
        const pose = c.react > 0 ? (Math.floor(c.react * 6) % 2 ? 'sit' : 'groom') : c.pose
        const sp = catPoseSprite(pose as never, '#f58f35', c.flip)
        g.draw(sp.canvas, Math.round(c.x - sp.w / 2), Math.round(c.y - sp.h + 1))
        if (c.pose === 'sleep' && c.react <= 0 && Math.floor(t * 1.2 + c.x) % 2 === 0) {
          g.px(c.x + 4, c.y - 9, '#e2e8ff')
          g.px(c.x + 5, c.y - 11, '#e2e8ff')
        }
        // The single shared brain cell, occasionally visible.
        if (c.react > 0 && Math.floor(c.react * 3) % 2) g.px(c.x, c.y - 12, '#ff9fc0')
      })
    }
  }
  tap(x: number, y: number): boolean {
    for (const c of this.cats) {
      if (Math.abs(x - c.x) < 9 && y > c.y - 12 && y < c.y + 3) {
        c.react = 1.6
        this.s.particles.hearts(c.x, c.y - 10, 2)
        this.s.say(pick(['เมี้ยว (สมองว่าง)', 'แมวส้มหนึ่งตัว ใช้สมองร่วมกันหนึ่งเซลล์', '...เมี้ยว?', 'ง่วงงง', 'แมวส้มกำลังโหลด...']), c.x, c.y - 16, 2.2)
        sfx.sparkle()
        return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// A kid holding a hippo plush / generic little figures.

export function hippoKidOverlay(g: Surface, p: GagPose) {
  drawMiniHippo(g, p.x + (p.flip ? -5 : 5), p.y - 6, '#8a8098')
}

/** Draw a price tag with a number (e.g. "20") at (x, y). */
export function priceTag(g: Surface, x: number, y: number, n: string, c: Color = '#fffaf0') {
  const w = n.length * 4 + 3
  g.rect(x, y, w, 7, INK)
  g.rect(x + 1, y + 1, w - 2, 5, c)
  // Tiny 3x5 digits.
  const DIG: Record<string, string[]> = {
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'],
    '3': ['##.', '..#', '.#.', '..#', '##.'],
    '5': ['###', '#..', '##.', '..#', '##.'],
    '9': ['.#.', '#.#', '.##', '..#', '##.'],
    '-': ['...', '...', '###', '...', '...'],
  }
  ;[...n].forEach((ch, i) => {
    const rows = DIG[ch]
    if (!rows) return
    rows.forEach((row, r) => {
      for (let k = 0; k < 3; k++) if (row[k] === '#') g.px(x + 2 + i * 4 + k, y + 1 + r, '#b8343f')
    })
  })
}
