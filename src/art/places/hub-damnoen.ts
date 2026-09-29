// ตลาดน้ำดำเนินสะดวก – side-view paddle boats drawn every frame (fruit,
// boat noodles, kanom krok, coconuts, tourists, a zooming long-tail), the
// wooden shophouse row on stilts, arched canal bridges, the fish pier, and
// the water monitor (ตัวเงินตัวทอง) that swims across to everyone's delight.

import type { Color, Surface } from '../../engine/pixel'
import { avatarSprite, type AvatarLook } from '../avatar'
import { hprop, hsh, INK, mix, ramp, type HubProp } from './hub-kit'

export type BoatKind = 'fruit' | 'noodle' | 'krok' | 'coconut' | 'flower' | 'tourist' | 'longtail' | 'empty'

const HULL = { L: '#a87050', b: '#7a4a32', d: '#5a3424', D: '#3e2418' }

/** Vendor straw hat (งอบ) centred at x, top y. */
function ngob(g: Surface, x: number, y: number) {
  g.rect(x - 5, y + 2, 11, 1, '#c9a06a')
  g.rect(x - 4, y + 1, 9, 1, '#e0c080')
  g.rect(x - 2, y, 5, 1, '#e8cc90')
  g.px(x, y - 1, '#c9a06a')
  g.hline(x - 4, x + 4, y + 3, '#9a7446')
}

/** A seated vendor in a blue ม่อฮ่อม shirt with a straw hat, paddling. */
function vendor(g: Surface, x: number, y: number, t: number, dir: 1 | -1, paddle = true, shirt: Color = '#3d63b5') {
  g.rect(x - 2, y - 8, 5, 6, shirt)
  g.hline(x - 2, x + 2, y - 8, mix(shirt, '#ffffff', 0.3))
  g.rect(x - 2, y - 11, 5, 3, '#e0a878')
  g.px(x + dir, y - 10, INK)
  ngob(g, x, y - 14)
  if (paddle) {
    const a = Math.sin(t * 3) * 0.6
    const px = Math.round(x - dir * 2 + Math.cos(a) * 3 * -dir)
    g.line(x + dir * 2, y - 6, px - dir * 6, y + 4, '#9a6a45')
    g.rect(px - dir * 7 - 1, y + 3, 3, 2, '#9a6a45')
  }
}

/** Side-view canal boat. (x, y) = middle of the waterline; `dir` = bow direction. */
export function drawBoat(g: Surface, x: number, y: number, t: number, kind: BoatKind, dir: 1 | -1 = 1, o: { tourists?: AvatarLook[]; moving?: boolean; seed?: number } = {}) {
  const bob = Math.round(Math.sin(t * 2.1 + x * 0.07) * 0.7)
  const X = Math.round(x)
  const Y = Math.round(y) + bob
  const len = kind === 'longtail' ? 30 : kind === 'tourist' ? 27 : 23
  // Water shadow / reflection.
  g.alpha(0.3)
  g.ellipse(X, Y + 3, len + 1, 2.4, '#1e3a3a')
  g.alpha(1)
  // Hull (upturned bow).
  const bow = X + dir * len
  const stern = X - dir * len
  g.poly([[stern, Y - 3], [bow, Y - 3], [bow + dir * 3, Y - 7], [bow + dir * 1, Y - 2], [X + dir * (len - 5), Y + 2], [X - dir * (len - 4), Y + 2], [stern - dir * 1, Y - 5]], HULL.b)
  g.hline(Math.min(stern, bow), Math.max(stern, bow), Y - 3, HULL.L)
  g.hline(Math.min(stern, bow) + 3, Math.max(stern, bow) - 3, Y, HULL.d)
  g.hline(Math.min(stern, bow) + 5, Math.max(stern, bow) - 5, Y + 1, HULL.D)
  // Garland on the bow post (พวงมาลัยหัวเรือ).
  g.px(bow + dir * 3, Y - 8, '#f58f35')
  g.px(bow + dir * 2, Y - 7, '#ffd23f')
  const s = o.seed ?? 0
  const vx = X - dir * Math.round(len * 0.55)
  if (kind === 'fruit' || kind === 'coconut' || kind === 'flower') {
    const cols =
      kind === 'fruit' ? ['#ffd23f', '#f58f35', '#6a3a5a', '#e8514a', '#6cc36a'] : kind === 'coconut' ? ['#6cc36a', '#86c95f', '#8a5a3a'] : ['#ff9fc0', '#fffaf0', '#ffd23f', '#e8514a']
    for (let i = 0; i < 9; i++) {
      const fx = X - dir * 4 + dir * (i % 5) * 4 + (i > 4 ? dir * 2 : 0)
      const fy = Y - 5 - (i > 4 ? 3 : 0)
      const c = cols[(i + s) % cols.length]
      g.circle(fx, fy, kind === 'coconut' ? 2.3 : 1.7, mix(c, INK, 0.2))
      g.circle(fx, fy - 0.5, kind === 'coconut' ? 1.8 : 1.2, c)
    }
    // Baskets.
    g.rect(X + dir * 1 - 5, Y - 4, 10, 2, '#c9a06a')
    vendor(g, vx, Y - 1, t + s, dir, o.moving !== false)
  } else if (kind === 'noodle') {
    // Charcoal stove + pot, bowls, a sauce rack.
    const px = X + dir * 5
    g.rect(px - 4, Y - 7, 8, 4, '#3a3040')
    g.px(px - 2, Y - 4, '#ff7a3a')
    g.px(px + 1, Y - 4, '#ffd23f')
    g.rect(px - 4, Y - 12, 8, 5, '#bdb2ae')
    g.hline(px - 4, px + 3, Y - 12, '#e4ddd6')
    g.hline(px - 3, px + 2, Y - 11, '#8a4a2a')
    for (let i = 0; i < 3; i++) {
      g.ellipse(X + dir * (13 + i * 4), Y - 5, 1.6, 1, '#fffaf0')
      g.px(X + dir * (13 + i * 4), Y - 6, '#8a4a2a')
    }
    g.rect(X - dir * 3 - 1, Y - 8, 3, 5, '#e8514a')
    vendor(g, vx, Y - 1, t + s, dir, o.moving === true, '#3a3040')
  } else if (kind === 'krok') {
    const px = X + dir * 5
    g.rect(px - 5, Y - 7, 10, 4, '#3a3040')
    g.rect(px - 6, Y - 9, 12, 2, '#6a6374')
    for (let i = 0; i < 4; i++) g.circle(px - 4 + i * 3, Y - 9, 1, i % 2 ? '#ffe7a8' : '#f0c878')
    g.rect(X + dir * 14 - 3, Y - 6, 6, 3, '#43905a')
    g.px(X + dir * 14, Y - 7, '#fffaf0')
    vendor(g, vx, Y - 1, t + s, dir, o.moving === true, '#e8514a')
  } else if (kind === 'tourist' || kind === 'longtail') {
    const looks = o.tourists ?? []
    looks.slice(0, kind === 'longtail' ? 4 : 3).forEach((lk, i) => {
      const sp = avatarSprite(lk, 'side', 'sit', { flip: dir < 0 })
      const tx = X + dir * (8 - i * 9)
      g.draw(sp.canvas, Math.round(tx - sp.w / 2), Math.round(Y - 2 - sp.h + 9), false)
      if (i === 0 && Math.floor(t * 0.7 + s) % 3 === 0) {
        // Selfie stick.
        g.line(tx + dir * 2, Y - 12, tx + dir * 6, Y - 22, '#8a8480')
        g.rect(tx + dir * 6 - 1, Y - 25, 3, 4, '#3a3040')
      }
    })
    if (kind === 'longtail') {
      // Engine and the long shaft.
      g.rect(stern + dir * 2 - 3, Y - 9, 7, 5, '#5a5566')
      g.px(stern + dir * 2, Y - 10, '#8c8187')
      g.line(stern + dir * 2, Y - 5, stern - dir * 14, Y + 3, '#8c8187')
      g.rect(bow - dir * 6 - 2, Y - 10, 5, 2, '#e8514a')
    } else vendor(g, stern + dir * 4, Y - 1, t + s, dir, true, '#43905a')
  } else vendor(g, X, Y - 1, t + s, dir, true)
}

/** Wooden shophouse row on stilts (north bank), baked. Returns shop-front centres. */
export function woodRow(g: Surface, x0: number, x1: number, gy: number, seed: number, night: boolean): { x: number; y: number }[] {
  const unit = 40
  const out: { x: number; y: number }[] = []
  const T = ramp('#a86b3e')
  for (let x = x0; x < x1; x += unit) {
    const w = Math.min(unit, x1 - x)
    const top = gy - 58
    const tone = hsh(x, seed) % 3
    const wall = tone === 0 ? T.b : tone === 1 ? mix(T.b, '#c88a58', 0.4) : mix(T.b, INK, 0.12)
    // Walls with vertical slats.
    g.rect(x, top + 12, w, 46, wall)
    for (let i = x + 2; i < x + w; i += 3) g.vline(i, top + 12, gy - 1, mix(wall, INK, 0.18))
    // Zinc roof (two slopes seen from the front).
    for (let y = top; y < top + 13; y++) {
      const inset = Math.round((top + 12 - y) * 0.6)
      for (let i = x + inset; i < x + w - inset; i++) {
        const rib = (i + y) % 3
        g.px(i, y, rib === 0 ? '#c8c4cc' : rib === 1 ? '#a8a2b0' : '#8c8696')
      }
    }
    g.hline(x, x + w - 1, top + 12, '#6a6374')
    for (let i = x + 4; i < x + w - 4; i += 9) g.px(i, top + 5, '#b86a4a')
    // Upper window with shutters.
    const wx = x + w / 2 - 6
    g.rect(wx, top + 16, 12, 10, '#5e3822')
    g.rect(wx + 1, top + 17, 10, 8, night ? '#ffe7a8' : '#3a2a30')
    g.rect(wx - 4, top + 16, 4, 10, '#6a9a78')
    g.rect(wx + 12, top + 16, 4, 10, '#6a9a78')
    // Open shop below with goods hanging.
    g.rect(x + 3, gy - 24, w - 6, 24, night ? '#5a4040' : '#3e2a2a')
    if (night) {
      g.alpha(0.35)
      g.rect(x + 3, gy - 24, w - 6, 24, '#ffcf7a')
      g.alpha(1)
    }
    const kind = hsh(x, seed, 3) % 4
    for (let i = x + 6; i < x + w - 6; i += 5) {
      if (kind === 0) {
        // Straw hats.
        g.rect(i - 2, gy - 20, 5, 1, '#e0c080')
        g.rect(i - 1, gy - 21, 3, 1, '#e8cc90')
      } else if (kind === 1) {
        // Hanging shirts.
        const c = ['#3d63b5', '#e8514a', '#ffd23f', '#43905a'][(i / 5) % 4 | 0]
        g.rect(i - 2, gy - 21, 4, 6, c)
      } else if (kind === 2) {
        // Wooden elephants on a shelf.
        g.rect(i - 2, gy - 13, 4, 3, '#8a5a3a')
        g.px(i + 2, gy - 14, '#8a5a3a')
      } else {
        // Fans and bags.
        g.circle(i, gy - 18, 2, ['#ff9fc0', '#9fd0ff', '#ffe27a'][(i / 5) % 3 | 0])
      }
    }
    g.rect(x + 3, gy - 6, w - 6, 6, mix(wall, '#ffffff', 0.15))
    g.hline(x + 3, x + w - 4, gy - 6, mix(wall, '#ffffff', 0.35))
    // Posts.
    g.rect(x, top + 12, 2, 46, T.D)
    out.push({ x: x + w / 2, y: gy })
  }
  return out
}

/** Deck edge with pilings over the water (baked), running along y from x0 to x1. */
export function deckEdge(g: Surface, x0: number, x1: number, y: number, below: boolean) {
  for (let x = x0; x < x1; x += 7) {
    g.rect(x, below ? y : y - 6, 2, 6, '#5e3822')
    g.px(x, below ? y + 5 : y - 1, '#3e2418')
  }
  g.hline(x0, x1 - 1, y, '#5e3822')
  g.hline(x0, x1 - 1, below ? y - 1 : y + 1, '#8a5a3a')
}

/** Arched canal bridge running north-south (anchor: south foot). */
export function canalBridge(len: number, night = false): HubProp {
  const W = 34
  const H = len + 18
  return hprop(`dn:bridge:${len}:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const deck = ramp('#e8e0d4')
    // Deck (lighter in the middle where it arches up).
    for (let y = 8; y < H - 2; y++) {
      const f = (y - 8) / (H - 10)
      const lift = Math.sin(f * Math.PI)
      g.hline(6, W - 7, y, lift > 0.6 ? deck.L : deck.b)
      if (y % 4 === 0) g.hline(7, W - 8, y, deck.d)
    }
    // Railings with posts.
    for (const x of [3, W - 5]) {
      g.rect(x, 4, 3, H - 4, '#fffaf0')
      g.vline(x + 2, 4, H - 1, '#d8cfc4')
      for (let y = 8; y < H - 2; y += 8) {
        g.rect(x - 1, y, 5, 2, '#e8514a')
        if (night) g.px(x + 1, y - 1, '#fff3a6')
      }
    }
    g.rect(0, 0, W, 5, '#fffaf0')
    g.hline(0, W - 1, 4, '#d8cfc4')
    g.rect(0, H - 5, W, 5, '#e8e0d4')
    hooks.lamps = [
      { x: 4, y: 2 },
      { x: W - 4, y: 2 },
    ]
  })
}

/** Pier steps down to the water, with a fish-food bucket (baked). */
export function pierSteps(g: Surface, x: number, y: number, w: number) {
  for (let i = 0; i < 4; i++) {
    g.rect(x + i, y + i * 3, w - i * 2, 3, i % 2 ? '#c9c0b8' : '#dcd4cc')
    g.hline(x + i, x + w - 1 - i, y + i * 3 + 2, '#a8a098')
  }
}

/** The water monitor seen from above, swimming; (x, y) = head, `ang` = heading (radians). */
export function drawMonitor(g: Surface, x: number, y: number, t: number, ang: number, fade = 0) {
  const ux = Math.cos(ang)
  const uy = Math.sin(ang) * 0.8
  const px = -Math.sin(ang)
  const py = Math.cos(ang) * 0.8
  const body = '#5e6a4a'
  const spot = '#e8d060'
  const D = '#3a4430'
  g.alpha(1 - Math.min(1, fade))
  const at = (along: number, side: number): [number, number] => [Math.round(x + ux * along + px * side), Math.round(y + uy * along + py * side)]
  // Tail wiggling behind (S-curve), thinning out.
  for (let i = 0; i < 20; i++) {
    const wig = Math.sin(t * 8 - i * 0.45) * (0.4 + i * 0.13)
    const [tx, ty] = at(-(7 + i), wig)
    g.px(tx, ty, i % 5 === 2 ? spot : i < 12 ? body : D)
    if (i < 6) {
      const [sx, sy] = at(-(7 + i), wig + 1)
      g.px(sx, sy, D)
    }
  }
  // Body: three blobs with yellow spots.
  for (let i = 0; i < 3; i++) {
    const [bx, by] = at(-2 - i * 2, 0)
    g.circle(bx, by, 2.2 - i * 0.2, body)
  }
  for (const [a, s] of [[-2, -1], [-4, 1], [-6, 0], [-3, 1]] as const) {
    const [sx, sy] = at(a, s)
    g.px(sx, sy, spot)
  }
  // Legs paddling.
  const k = Math.floor(t * 8) % 2 ? 1 : -1
  for (const [a, s] of [[-1, 3], [-1, -3], [-6, 3], [-6, -3]] as const) {
    const [lx, ly] = at(a + (s > 0 ? k : -k), s)
    g.px(lx, ly, D)
  }
  // Head, eye and flicking tongue.
  for (let i = 0; i < 3; i++) {
    const [hx, hy] = at(i, 0)
    g.px(hx, hy, body)
    const [h2x, h2y] = at(i, 0.9)
    g.px(h2x, h2y, body)
  }
  const [ex, ey] = at(1, -1)
  g.px(ex, ey, INK)
  if (Math.floor(t * 4) % 3 === 0) {
    const [ax, ay] = at(4, 0)
    const [bx, by] = at(5, -1)
    const [cx, cy] = at(5, 1)
    g.px(ax, ay, '#ff6f91')
    g.px(bx, by, '#ff6f91')
    g.px(cx, cy, '#ff6f91')
  }
  g.alpha(1)
}

/** Wooden entrance arch with a boat on top (anchor: centre ground). */
export function dnGate(night = false): HubProp {
  const W = 96
  const H = 60
  return hprop(`dn:gate:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const T = ramp('#8a5a3a')
    for (const x of [6, W - 13]) {
      g.rect(x, 16, 7, H - 16, T.b)
      g.vline(x + 5, 16, H - 1, T.d)
      g.vline(x + 1, 16, H - 1, T.L)
      g.rect(x - 2, H - 5, 11, 5, '#bdb2ae')
    }
    g.rect(0, 12, W, 6, T.d)
    g.hline(0, W - 1, 12, T.L)
    g.rect(14, 2, W - 28, 13, '#f3dcb2')
    g.frame(14, 2, W - 28, 13, T.D)
    for (let i = 0; i < 8; i++) {
      const x = 22 + i * 7
      g.rect(x, 6, 5, 1, '#3d63b5')
      g.rect(x + (i % 2) * 4, 7, 1, 3, '#3d63b5')
      g.px(x + 2, 5, '#3d63b5')
    }
    // A little boat and two straw hats on the beam.
    g.poly([[36, 1], [60, 1], [63, -2 + 3], [58, 3], [38, 3], [33, 1]], '#7a4a32')
    g.rect(44, -1 + 1, 3, 1, '#e0c080')
    g.rect(52, -1 + 1, 3, 1, '#e0c080')
    // Garlands.
    for (let x = 16; x < W - 16; x += 4) g.px(x, 19 + Math.round(Math.sin(x * 0.4)), x % 8 ? '#f58f35' : '#ffd23f')
    if (night) for (let x = 4; x < W; x += 8) g.px(x, 11, '#fff3a6')
    hooks.lamp = [{ x: W / 2, y: 8 }]
  })
}

/** Tour minivan parked (side view, bow to the right). */
export function vanSprite(color: Color = '#fffaf0'): HubProp {
  return hprop(`dn:van:${color}`, 44, 22, 22, 21, (g) => {
    const R = ramp(color)
    g.rect(2, 5, 40, 12, R.b)
    g.rect(6, 2, 30, 4, R.b)
    g.hline(6, 35, 2, R.L)
    g.rect(38, 7, 4, 9, R.b)
    for (let x = 8; x < 34; x += 7) g.rect(x, 4, 5, 5, '#6a8ab0')
    g.rect(36, 5, 5, 4, '#6a8ab0')
    g.hline(2, 41, 12, '#3d63b5')
    g.hline(2, 41, 16, R.D)
    g.circle(10, 18, 3, '#3a3040')
    g.circle(34, 18, 3, '#3a3040')
    g.px(10, 18, '#bdb2ae')
    g.px(34, 18, '#bdb2ae')
    g.px(42, 11, '#fff3a6')
  })
}

/** Painted photo cut-out board: two vendors in a boat with face holes. */
export function photoBoard(): HubProp {
  return hprop('dn:photo', 38, 34, 19, 33, (g) => {
    g.rect(4, 26, 2, 7, '#6e4a35')
    g.rect(32, 26, 2, 7, '#6e4a35')
    g.rect(0, 0, 38, 27, '#9fd0ff')
    g.rect(0, 18, 38, 9, '#5e9480')
    g.hline(0, 37, 18, '#8cc4a6')
    // Boat.
    g.poly([[3, 19], [35, 19], [37, 15], [33, 23], [5, 23], [1, 15]], '#7a4a32')
    // Two painted vendors with holes for faces.
    for (const x of [11, 26]) {
      g.rect(x - 4, 9, 9, 10, x < 20 ? '#3d63b5' : '#e8514a')
      g.rect(x - 7, 3, 15, 2, '#e0c080')
      g.rect(x - 4, 1, 9, 2, '#e8cc90')
      g.circle(x, 7, 2.6, '#2a2030')
    }
    // Fruit painted in the boat.
    for (let i = 0; i < 6; i++) g.circle(6 + i * 5, 17, 1.5, ['#ffd23f', '#f58f35', '#6a3a5a'][i % 3])
    g.frame(0, 0, 38, 27, '#6e4a35')
  })
}

/** A floating water-hyacinth clump (ผักตบชวา). */
export function drawHyacinth(g: Surface, x: number, y: number, seed: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  for (let i = 0; i < 5; i++) {
    const v = hsh(i, seed)
    g.circle(X + (v % 7) - 3, Y + ((v >> 3) % 3) - 1, 1.5, i % 2 ? '#5ea653' : '#86c95f')
  }
  if (seed % 3 === 0) {
    g.px(X, Y - 2, '#c8a0ff')
    g.px(X + 1, Y - 2, '#e2d2ff')
  }
}
