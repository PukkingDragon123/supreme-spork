// Shared art for the beaches (src/scenes/maps/places/beach-*.ts): a cached
// prop builder, sea / sand / surf ground painters with day and night
// palettes, swaying coconut palms, casuarinas and sea-almond trees, beach
// umbrellas, sling chairs and loungers, sandcastles, the lifeguard tower,
// boats (long-tail, speedboat, jet ski, banana boat), vendor carts (coconut,
// som tam hawker, grilled squid, ice cream tricycle, sarong rack, massage
// mats), a beach bar, rental boards, bins, the turtle hatchery and the photo
// frame. Beach landmarks live in beach-landmarks.ts.

import { bake, ditherOn, type Color, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas, type Sprite } from '../../engine/sprite'
import { mixHex } from '../characters'
import type { Prop } from '../props'

export type Pt = { x: number; y: number }
export interface BeachProp extends Prop {
  hooks: Record<string, Pt[]>
}

export const INK = '#3a2838'
export const mix = mixHex

/** Cached prop with hooks (relative to the anchor), outlined in plum ink. */
export function bprop(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>) => void, outline = true): BeachProp {
  return cached('beach:' + key, () => {
    const hooks: Record<string, Pt[]> = {}
    const c = bake(w, h, (g) => fn(g, hooks))
    for (const k of Object.keys(hooks)) hooks[k] = hooks[k].map((p) => ({ x: p.x - ax, y: p.y - ay }))
    if (!outline) return { canvas: c, w, h, ax, ay, hooks } as BeachProp
    const o = outlineCanvas(c, INK)
    return { ...o, ax: ax + 1, ay: ay + 1, hooks } as BeachProp
  }) as BeachProp
}

export function hooksAt(p: BeachProp, name: string, x: number, y: number): Pt[] {
  return (p.hooks[name] ?? []).map((h) => ({ x: x + h.x, y: y + h.y }))
}

/** Integer hash → 0..999. */
export function hsh(x: number, y: number, s = 0): number {
  return (((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) >>> 0) % 1000
}

// ---------------------------------------------------------------------------
// Palettes

export interface SeaPal {
  far: Color
  deep: Color
  mid: Color
  shallow: Color
  surf: Color
  foam: Color
  glint: Color
}

export const SEA: Record<'gulf' | 'andaman' | 'night', SeaPal> = {
  gulf: { far: '#4f8fd0', deep: '#3f86c8', mid: '#4ea8d8', shallow: '#6cc8da', surf: '#a4e8e2', foam: '#f4fffc', glint: '#dcf8ff' },
  andaman: { far: '#3f84cc', deep: '#2a7ec4', mid: '#27a6c4', shallow: '#46cfc6', surf: '#98f0e0', foam: '#f4fffc', glint: '#e0fff8' },
  night: { far: '#1e2c64', deep: '#1a285a', mid: '#20386e', shallow: '#2a4e82', surf: '#4a74a8', foam: '#a8c8e8', glint: '#7aa0d0' },
}

export interface SandPal {
  base: Color
  light: Color
  dark: Color
  wet: Color
  wetD: Color
}

export const SAND: Record<'white' | 'golden' | 'night', SandPal> = {
  white: { base: '#f4e6c4', light: '#fff6e0', dark: '#e2cc9e', wet: '#d8c29a', wetD: '#c4aa80' },
  golden: { base: '#efd8a4', light: '#faeac4', dark: '#dcc08a', wet: '#cfb282', wetD: '#b8986a' },
  night: { base: '#cabfa8', light: '#dcd2bc', dark: '#b4a88e', wet: '#a8987c', wetD: '#948468' },
}

export type ShoreFn = (x: number) => number

// ---------------------------------------------------------------------------
// Ground painters

/** The sea from the horizon (y0) down to the shore line, banded by depth. */
export function paintSea(g: Surface, w: number, y0: number, shore: ShoreFn, pal: SeaPal, seed = 0) {
  for (let x = 0; x < w; x++) {
    const sy = Math.round(shore(x))
    for (let y = y0; y < sy; y++) {
      const d = sy - y
      const far = (y - y0) / Math.max(1, sy - y0)
      let c = far < 0.18 ? pal.far : d > 90 ? pal.deep : d > 34 ? pal.mid : d > 12 ? pal.shallow : pal.surf
      // Dithered transitions between bands.
      if (far >= 0.18 && far < 0.24 && ditherOn(x, y, (far - 0.18) / 0.06)) c = pal.deep
      else if (far < 0.18 && ditherOn(x, y, far / 0.18 * 0.4)) c = pal.deep
      if (d > 34 && d < 44 && ditherOn(x, y, (44 - d) / 10)) c = pal.shallow
      if (d > 90 && d < 104 && ditherOn(x, y, (104 - d) / 14)) c = pal.mid
      if (d > 12 && d < 18 && ditherOn(x, y, (18 - d) / 6)) c = pal.surf
      g.px(x, y, c)
    }
  }
  // Static ripples and glints (the animated ones live in the Shore system).
  for (let k = 0; k < (w * 60) / 5; k++) {
    const v = hsh(k, seed, 4)
    const x = (v * 7 + k * 31) % w
    const sy = shore(x)
    const y = y0 + 4 + ((v * 13 + k * 17) % Math.max(1, Math.round(sy - y0 - 14)))
    const far = (y - y0) / Math.max(1, sy - y0)
    const len = far < 0.25 ? 2 : far < 0.6 ? 3 : 4
    g.hline(x, x + len - 1, y, k % 5 === 0 ? pal.glint : mix(pal.glint, pal.mid, 0.55))
  }
  // Horizon highlight line.
  g.hline(0, w - 1, y0, mix(pal.glint, pal.far, 0.3))
}

/** Sand from the shore down to y1: wet band, seaweed tide line, dry texture, shells and old footprints. */
export function paintSand(g: Surface, w: number, y1: number, shore: ShoreFn, pal: SandPal, seed = 0) {
  for (let x = 0; x < w; x++) {
    const sy = Math.round(shore(x))
    for (let y = sy; y < y1; y++) {
      const d = y - sy
      let c = pal.base
      const n = Math.sin(x * 0.07 + y * 0.013 + seed) + Math.cos(y * 0.09 - x * 0.021 + seed)
      if (d < 22) c = d < 3 ? pal.wetD : pal.wet
      else if (d < 28 && ditherOn(x, y, (28 - d) / 6)) c = pal.wet
      else if (n > 1.25 && ditherOn(x, y, 0.25)) c = pal.light
      else if (n < -1.2 && ditherOn(x, y, 0.28)) c = pal.dark
      const v = hsh(x, y, seed)
      if (v < 7) c = pal.dark
      else if (v > 993) c = pal.light
      // Wind ripples in the dry sand.
      if (d > 40 && (x * 3 + y * 7 + Math.round(Math.sin(y * 0.2) * 3)) % 23 === 0) c = pal.dark
      g.px(x, y, c)
    }
    // Wet-sand sheen right behind the surf.
    if (x % 3 === 0) g.px(x, sy + 1 + (hsh(x, 1, seed) % 6), mix(pal.wet, '#ffffff', 0.35))
  }
  // Seaweed / driftwood tide line.
  for (let x = 0; x < w; x += 1) {
    const v = hsh(x, 7, seed)
    if (v % 5) continue
    const y = Math.round(shore(x)) + 26 + (v % 4)
    g.px(x, y, v % 3 ? '#6e7a4a' : '#8a6a4a')
    if (v % 2) g.px(x + 1, y, '#5a6a3e')
  }
  // Shells and pebbles.
  for (let k = 0; k < (w * (y1 - 300)) / 380; k++) {
    const v = hsh(k, seed, 9)
    const x = (v * 11 + k * 37) % w
    const y = Math.round(shore(x)) + 6 + ((v * 17 + k * 23) % Math.max(4, y1 - Math.round(shore(x)) - 10))
    const c = ['#fffaf0', '#ffd6e0', '#e8d4b8', '#c8b4a0', '#f0c890'][k % 5]
    g.px(x, y, c)
    if (k % 3 === 0) g.px(x + 1, y, mix(c, INK, 0.25))
  }
}

/** A trail of old footprints across the sand (baked). */
export function footprintTrail(g: Surface, pts: [number, number][], pal: SandPal) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const n = Math.round(Math.hypot(bx - ax, by - ay) / 5)
    for (let k = 0; k < n; k++) {
      const t = k / n
      const x = ax + (bx - ax) * t
      const y = ay + (by - ay) * t
      const side = k % 2 ? 1 : -1
      const px = Math.round(x + side * 1.5)
      const py = Math.round(y)
      g.px(px, py, pal.dark)
      g.px(px, py + 1, pal.dark)
      g.px(px + 1, py, mix(pal.dark, pal.base, 0.5))
    }
  }
}

/** Soft oval shadow baked into the sand. */
export function sandShadow(g: Surface, cx: number, cy: number, rx: number, ry: number, a = 0.18) {
  g.alpha(a)
  g.ellipse(cx, cy, rx, ry, INK)
  g.alpha(1)
}

/** A far island silhouette on the horizon. */
export function isle(g: Surface, cx: number, cy: number, rw: number, rh: number, night: boolean, o: { sand?: boolean; karst?: boolean; seed?: number } = {}) {
  const leaf = night ? '#2a3c4c' : '#4a8a5e'
  const leafL = night ? '#34485a' : '#6aae68'
  const rock = night ? '#3a3a52' : '#b89478'
  if (o.sand) g.ellipse(cx, cy + 1, rw + 2, 2, night ? '#6a6a7a' : '#f4e6c4')
  if (o.karst) {
    g.poly([[cx - rw, cy], [cx - rw * 0.7, cy - rh * 0.8], [cx - rw * 0.3, cy - rh], [cx + rw * 0.2, cy - rh * 0.95], [cx + rw * 0.6, cy - rh * 0.6], [cx + rw, cy]], rock)
    g.poly([[cx - rw * 0.7, cy - rh * 0.8], [cx - rw * 0.3, cy - rh], [cx + rw * 0.2, cy - rh * 0.95], [cx, cy - rh * 0.7]], leaf)
    for (let i = -rw + 2; i < rw - 1; i += 3) g.vline(cx + i, cy - rh * 0.5, cy - 1, mix(rock, INK, 0.25))
    return
  }
  g.ellipse(cx, cy, rw, rh, leaf)
  g.ellipse(cx - rw * 0.3, cy - rh * 0.3, rw * 0.55, rh * 0.6, leafL)
  g.hline(Math.round(cx - rw), Math.round(cx + rw), cy, night ? '#1e2840' : mix(leaf, INK, 0.3))
}

// ---------------------------------------------------------------------------
// Coconut palms (trunk sprite + swaying crown frames)

export const PALM_FRAMES = 5

/** Curved ringed trunk; the crown sits at hooks.crown. */
export function palmTrunk(v: number): BeachProp {
  const H = 54 + (v % 3) * 8
  const lean = v % 2 ? -1 : 1
  const bend = 6 + (v % 3) * 2
  const W = 30
  return bprop(`palmtrunk:${v}`, W, H + 2, W / 2, H + 1, (g, hooks) => {
    let tx = W / 2
    for (let y = H; y >= 2; y--) {
      const t = (H - y) / H
      const x = W / 2 + Math.round(Math.sin(t * 1.5) * bend * lean)
      const ring = y % 4 === 0
      g.rect(x - 2, y, 4, 1, ring ? '#8a6a52' : '#b08a6a')
      g.px(x - 2, y, ring ? '#9a7a5e' : '#cfa888')
      g.px(x + 1, y, ring ? '#6e5240' : '#94705a')
      if (t < 0.12) g.rect(x - 3, y, 6, 1, ring ? '#8a6a52' : '#a88264')
      tx = x
    }
    // Coconut cluster under the crown.
    g.circle(tx - 2, 5, 2.2, '#7a8a3a')
    g.circle(tx + 2, 6, 2.2, '#6a7a32')
    g.circle(tx, 7, 2, '#8a9a44')
    g.px(tx - 3, 4, '#a8b860')
    hooks.crown = [{ x: tx, y: 3 }]
  })
}

/** Crown of fronds for a sway frame (0..PALM_FRAMES-1, middle = still). */
export function palmCrown(v: number, frame: number): Sprite {
  return cached(`beach:palmcrown:${v}:${frame}`, () => {
    const W = 64
    const H = 40
    const cx = W / 2
    const cy = 16
    const sway = (frame - (PALM_FRAMES - 1) / 2) * 1.6
    const c = bake(W, H, (g) => {
      const fronds: [number, number][] = [[-24, 7], [-20, -3], [-11, -11], [0, -14], [11, -11], [20, -3], [24, 7], [15, 15], [-15, 15], [3, 17]]
      const leafL = '#a8dc70'
      const leafB = ['#5eae55', '#62b058', '#4f9e4c'][v % 3]
      const leafD = '#3f8a4f'
      const leafDD = '#2c6a45'
      fronds.forEach(([dx, dy], fi) => {
        const n = 16
        const droop = dy > 5 ? 6 : 4
        let px = cx
        let py = cy
        for (let i = 1; i <= n; i++) {
          const t = i / n
          const sw = sway * t * t * (dy < 0 ? 1.2 : 0.8)
          const x = cx + dx * t + sw
          const y = cy + dy * t + t * t * droop - Math.sin(t * Math.PI) * 2
          g.line(px, py, x, y, leafB)
          // Leaflets hanging from the rib.
          if (i > 2) {
            const len = Math.round(3 + Math.sin(t * Math.PI) * 3)
            const dir = dx >= 0 ? 1 : -1
            g.line(x, y, x - dir * 1, y + len, (i + fi) % 3 === 0 ? leafDD : leafD)
            if (i % 2 === 0) g.line(x, y, x + dir * 1, y + len - 1, leafB)
          }
          if (i % 4 === 0) g.px(x, y - 1, leafL)
          px = x
          py = y
        }
      })
      g.circle(cx, cy + 1, 2.4, leafD)
      g.px(cx - 1, cy - 1, leafL)
    })
    const o = outlineCanvas(c, INK)
    return { canvas: o.canvas, w: o.w, h: o.h }
  })
}

// ---------------------------------------------------------------------------
// Other trees

/** Casuarina (สนทะเล): a tall feathery conifer-like tree along Thai beaches. */
export function casuarina(v = 0): BeachProp {
  const H = 66 + (v % 3) * 6
  return bprop(`casuarina:${v}`, 34, H, 17, H - 1, (g) => {
    const lean = v % 2 ? 1 : -1
    for (let y = 18; y < H; y++) {
      const x = 17 + Math.round(((H - y) / H) * lean * 2)
      g.rect(x - 1, y, 3, 1, y % 5 === 0 ? '#6e5240' : '#8a6a52')
    }
    const tiers = 6
    for (let i = 0; i < tiers; i++) {
      const ty = 4 + i * 9
      const r = 5 + i * 1.9
      const cx = 17 + lean * (tiers - i) * 0.3
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * Math.PI
        const x = cx + Math.cos(a + Math.PI) * r * (0.6 + (hsh(k, i, v) % 40) / 100)
        const y = ty + Math.sin(a) * 4 + (hsh(k, i + 9, v) % 3)
        g.line(cx, ty, x, y + 4, k % 3 ? '#4a7a5a' : '#5e9468')
      }
      g.ellipse(cx, ty + 4, r * 0.8, 3.2, '#3e6a4e')
      g.ellipse(cx - 1, ty + 3, r * 0.6, 2.2, '#5a8e64')
      g.px(cx - r * 0.4, ty + 2, '#8cc088')
    }
  })
}

/** Sea almond (ต้นหูกวาง): wide flat tiers of big leaves, a shady beach tree. */
export function seaAlmond(v = 0): BeachProp {
  return bprop(`almond:${v}`, 76, 66, 38, 65, (g) => {
    const bark = '#8a6a5a'
    g.rect(35, 30, 5, 36, bark)
    g.vline(35, 30, 65, '#a8887a')
    g.vline(39, 30, 65, '#6e5048')
    for (const [x1, y1] of [[18, 26], [58, 24], [30, 14], [48, 12]] as [number, number][]) g.thickLine(37, 36, x1, y1, 2, bark)
    const tiers: [number, number, number][] = [[38, 10, 18], [24, 22, 16], [54, 20, 17], [38, 26, 22]]
    for (const [cx, cy, r] of tiers) {
      g.ellipse(cx, cy + 2, r, 6, '#2c6a45')
      g.ellipse(cx, cy, r, 5.5, '#43905a')
      g.ellipse(cx - 3, cy - 1.5, r * 0.7, 3, '#5eae55')
      for (let k = 0; k < 14; k++) {
        const x = cx - r + ((hsh(k, cy, v) % 100) / 100) * r * 2
        const y = cy - 3 + (hsh(k, cx, v) % 6)
        g.rect(x, y, 2, 1, k % 4 === 0 ? '#e8704a' : k % 3 ? '#7cc36a' : '#3f8a4f')
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Umbrellas, chairs, towels

/** Striped beach umbrella seen from slightly above. */
export function umbrella(a: Color, b: Color, v = 0): BeachProp {
  return bprop(`umbrella:${a}:${b}:${v}`, 32, 34, 16, 33, (g) => {
    g.vline(16, 10, 33, '#e8e0d4')
    g.vline(17, 10, 33, '#b8aca0')
    // Canopy: 8 gores on a flattened dome.
    const cx = 16
    const cy = 9
    for (let y = -8; y <= 4; y++)
      for (let x = -15; x <= 15; x++) {
        const k = (x * x) / 225 + ((y + 1) * (y + 1)) / (y < -1 ? 64 : 25)
        if (k > 1) continue
        const ang = Math.atan2(y + 1, x)
        const gore = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8 + v * 0.5) % 2
        let c = gore ? a : b
        if (y > 1) c = mix(c, INK, 0.2)
        else if (y < -5 && x < 0) c = mix(c, '#ffffff', 0.25)
        g.px(cx + x, cy + y, c)
      }
    // Scalloped valance.
    for (let x = -15; x <= 15; x++) {
      const gore = Math.floor(((x + 15) / 30) * 8) % 2
      const c = mix(gore ? a : b, INK, 0.15)
      g.px(cx + x, cy + 5, c)
      if ((x + 15) % 4 < 2) g.px(cx + x, cy + 6, c)
    }
    g.rect(cx - 1, cy - 9, 2, 2, '#fffaf0')
  })
}

/** Canvas sling chair (เก้าอี้ผ้าใบ) facing up the beach (seen from behind). */
export function slingChair(c: Color): BeachProp {
  return bprop(`sling:${c}`, 14, 16, 7, 15, (g) => {
    const wood = '#b07a4a'
    g.line(1, 15, 3, 3, wood)
    g.line(12, 15, 10, 3, wood)
    g.line(3, 15, 1, 9, wood)
    g.line(10, 15, 12, 9, wood)
    g.rect(3, 3, 8, 9, c)
    for (let y = 3; y < 12; y += 2) g.hline(3, 10, y, mix(c, '#ffffff', 0.35))
    g.hline(3, 10, 11, mix(c, INK, 0.3))
    g.hline(2, 11, 3, '#8a5a32')
  })
}

/** Sun lounger with a mattress and a folded towel. */
export function lounger(c: Color): BeachProp {
  return bprop(`lounger:${c}`, 14, 26, 7, 25, (g) => {
    g.rect(1, 4, 12, 21, '#e8e0d4')
    g.rect(2, 6, 10, 18, c)
    for (let y = 8; y < 24; y += 4) g.hline(2, 11, y, mix(c, INK, 0.18))
    g.rect(2, 1, 10, 6, mix(c, '#ffffff', 0.2))
    g.rect(3, 18, 8, 4, '#fffaf0')
    g.hline(3, 10, 19, '#ff9fc0')
    g.px(1, 25, '#8a8480')
    g.px(12, 25, '#8a8480')
  })
}

/** A beach towel laid on the sand (baked, no outline). */
export function towel(g: Surface, x: number, y: number, w: number, h: number, a: Color, b: Color) {
  g.rect(x, y, w, h, a)
  for (let i = 0; i < w; i += 4) g.rect(x + i, y, 2, h, b)
  g.hline(x, x + w - 1, y + h, mix(a, INK, 0.35))
  g.px(x + 1, y + 1, '#ffffff')
}

/** Stack of white rubber rings for rent (ห่วงยาง). */
export function ringStack(n = 5): BeachProp {
  return bprop(`rings:${n}`, 22, 8 + n * 3, 11, 7 + n * 3, (g) => {
    for (let i = 0; i < n; i++) {
      const y = 4 + (n - 1 - i) * 3 + 3
      g.ellipse(11, y, 10, 3.5, i % 2 ? '#e8e8f0' : '#fffaf0')
      g.ellipse(11, y - 0.5, 4, 1.2, i % 2 ? '#c8c8d8' : '#d8d8e4')
      g.px(4, y - 1, '#ffffff')
      if (i === n - 1) {
        g.hline(3, 5, y + 2, '#e8514a')
        g.hline(16, 18, y + 2, '#e8514a')
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Beach fun

/** Sandcastle with towers, a flag and a bucket with a spade. */
export function sandcastle(v = 0): BeachProp {
  return bprop(`castle:${v}`, 30, 26, 15, 25, (g) => {
    const s = '#e0c48e'
    const l = '#f4dcaa'
    const d = '#c4a470'
    g.rect(5, 14, 20, 11, s)
    g.rect(5, 14, 3, 11, l)
    g.hline(5, 24, 24, d)
    for (let x = 5; x < 25; x += 4) g.rect(x, 12, 2, 2, s)
    for (const [tx, th] of [[4, 10], [22, 10], [13, 16]] as [number, number][]) {
      g.rect(tx, 25 - th - 6, 5, th + 6, s)
      g.px(tx, 25 - th - 6, l)
      g.rect(tx, 25 - th - 8, 1, 2, s)
      g.rect(tx + 2, 25 - th - 8, 1, 2, s)
      g.rect(tx + 4, 25 - th - 8, 1, 2, s)
      g.vline(tx + 4, 25 - th - 6, 24, d)
    }
    g.rect(13, 19, 4, 6, '#9a7a50')
    g.px(14, 18, '#9a7a50')
    g.px(15, 18, '#9a7a50')
    // Flag on the keep.
    g.vline(15, 0, 3, '#8a8480')
    g.rect(16, 0, 4, 2, v % 2 ? '#e8514a' : '#5aa9e8')
    // Shell windows.
    g.px(8, 18, '#ffd6e0')
    g.px(22, 18, '#fffaf0')
    if (v % 2 === 0) {
      // Bucket and spade.
      g.rect(25, 19, 5, 6, '#ffd23f')
      g.hline(25, 29, 19, '#e0a820')
      g.line(1, 25, 3, 18, '#5aa9e8')
    }
  })
}

/** Red-and-yellow swim-zone flag on a pole. */
export function swimFlag(red = false): BeachProp {
  return bprop(`flag:${red ? 'r' : 'ry'}`, 12, 30, 1, 29, (g) => {
    g.vline(1, 0, 29, '#d8d0c4')
    g.vline(2, 1, 29, '#a8a098')
    if (red) g.rect(3, 1, 8, 6, '#e8514a')
    else {
      g.rect(3, 1, 8, 3, '#e8514a')
      g.rect(3, 4, 8, 3, '#ffd23f')
    }
    g.px(10, 7, '#b8343f')
  })
}

/** Wooden lifeguard tower with a sun roof, ladder and a rescue buoy. */
export function lifeguardTower(): BeachProp {
  return bprop('lifeguard', 40, 58, 20, 57, (g, hooks) => {
    const w = '#c89060'
    const wd = '#8a5a3a'
    for (const x of [6, 32]) {
      g.line(x, 57, x + (x < 20 ? 4 : -4), 24, wd)
      g.line(x + 1, 57, x + 1 + (x < 20 ? 4 : -4), 24, w)
    }
    g.line(10, 44, 30, 34, wd)
    g.line(30, 44, 10, 34, wd)
    // Ladder.
    for (let y = 30; y < 57; y += 4) g.hline(17, 23, y, w)
    g.vline(16, 28, 57, wd)
    g.vline(24, 28, 57, wd)
    // Platform and cabin.
    g.rect(6, 22, 28, 4, w)
    g.hline(6, 33, 25, wd)
    g.rect(8, 12, 24, 10, '#fffaf0')
    g.rect(8, 12, 24, 3, '#e8514a')
    g.rect(11, 16, 18, 5, '#9fd0ff')
    g.hline(11, 28, 16, '#d4f1ff')
    // Striped roof.
    g.poly([[4, 12], [20, 3], [36, 12]], '#e8514a')
    for (let x = 8; x < 34; x += 6) g.line(20, 4, x, 12, '#fffaf0')
    g.hline(4, 36, 12, '#b8343f')
    // Buoy and flag.
    g.circle(33, 30, 3, '#ff7a1a')
    g.circle(33, 30, 1.2, w)
    g.px(32, 28, '#ffffff')
    g.vline(20, -1, 3, '#a8a098')
    hooks.guard = [{ x: 20, y: 22 }]
  })
}

// ---------------------------------------------------------------------------
// Boats

/** Long-tail boat (เรือหางยาว) seen from the side, bow ribbons tied on. */
export function longtailBoat(hull: Color = '#8a5a3a', ribbons: Color[] = ['#e8514a', '#ffd23f', '#43905a'], canopy?: Color): BeachProp {
  return bprop(`longtail:${hull}:${ribbons.join()}:${canopy ?? ''}`, 70, 26, 34, 22, (g, hooks) => {
    const hl = mix(hull, '#ffffff', 0.25)
    const hd = mix(hull, INK, 0.3)
    // Hull with the high curved bow on the right.
    g.poly([[4, 14], [56, 14], [64, 4], [66, 3], [60, 18], [10, 20]], hull)
    g.poly([[4, 14], [56, 14], [64, 4], [62, 10], [8, 16]], hl)
    g.hline(8, 58, 18, hd)
    g.hline(6, 56, 14, '#fffaf0')
    g.hline(6, 56, 15, '#3d63b5')
    // Ribbons (ผ้าแพร) on the bow post.
    ribbons.forEach((c, i) => {
      g.line(64, 4 + i, 60 - i * 2, 8 + i * 3, c)
      g.px(65, 3 + i, c)
    })
    g.circle(63, 2, 1.5, '#ffd6e0')
    // Engine and the long tail shaft with propeller.
    g.rect(6, 8, 7, 6, '#5e5a64')
    g.rect(7, 7, 5, 2, '#8a8490')
    g.line(6, 12, -2, 21, '#3a3040')
    g.line(6, 11, -2, 20, '#8a8490')
    g.rect(-3, 20, 3, 2, '#b8b8c0')
    if (canopy) {
      g.rect(18, 3, 30, 2, canopy)
      g.vline(20, 5, 13, '#8a8480')
      g.vline(46, 5, 13, '#8a8480')
    }
    // Plank seats.
    for (const x of [22, 32, 42]) g.rect(x, 12, 5, 2, '#c89060')
    hooks.seats = [{ x: 24, y: 12 }, { x: 34, y: 12 }, { x: 44, y: 12 }]
  })
}

export function speedboat(c: Color = '#fffaf0', stripe: Color = '#e8514a'): BeachProp {
  return bprop(`speed:${c}:${stripe}`, 36, 14, 18, 11, (g) => {
    g.poly([[1, 6], [26, 6], [35, 8], [30, 12], [3, 11]], c)
    g.hline(3, 30, 9, stripe)
    g.hline(3, 29, 11, mix(c, INK, 0.3))
    g.poly([[14, 6], [18, 1], [24, 1], [24, 6]], '#9fd0ff')
    g.line(14, 6, 18, 1, '#8a8490')
    g.rect(1, 3, 4, 4, '#3a3040')
  })
}

export function jetski(c: Color = '#ffd23f'): BeachProp {
  return bprop(`jetski:${c}`, 20, 10, 10, 8, (g) => {
    g.poly([[1, 5], [14, 4], [19, 6], [16, 9], [2, 8]], c)
    g.hline(2, 16, 8, mix(c, INK, 0.35))
    g.rect(6, 2, 6, 3, '#3a3040')
    g.line(12, 3, 14, 1, '#8a8490')
    g.hline(2, 14, 6, '#fffaf0')
  })
}

/** Inflatable banana boat (riders drawn by the Boats system). */
export function bananaBoat(): BeachProp {
  return bprop('banana', 44, 12, 22, 9, (g, hooks) => {
    g.ellipse(22, 7, 20, 3.4, '#e0b020')
    g.ellipse(22, 6, 19, 2.8, '#ffd23f')
    g.hline(8, 36, 5, '#fff08a')
    g.ellipse(39, 5, 4, 2.4, '#ffd23f')
    g.px(43, 3, '#6a5a2a')
    g.px(42, 3, '#6a5a2a')
    for (const x of [10, 18, 26, 34]) g.vline(x, 5, 9, '#c89a18')
    g.ellipse(22, 10, 21, 1.5, '#3aa0c8')
    hooks.seats = [10, 18, 26, 34].map((x) => ({ x, y: 5 }))
  })
}

// ---------------------------------------------------------------------------
// Vendors

/** Coconut cart (รถเข็นมะพร้าว) piled with green coconuts, a cleaver and straws. */
export function coconutCart(): BeachProp {
  return bprop('coconutcart', 40, 40, 20, 39, (g, hooks) => {
    // Parasol.
    g.vline(20, 2, 22, '#d8d0c4')
    g.poly([[2, 10], [20, 1], [38, 10]], '#43905a')
    for (let x = 6; x < 36; x += 8) g.line(20, 2, x, 10, '#fffaf0')
    g.hline(2, 38, 10, '#2f6f4b')
    // Cart body.
    g.rect(4, 24, 32, 10, '#3d8ac8')
    g.rect(4, 24, 32, 2, '#6aaee0')
    g.hline(4, 35, 33, '#2a5a8a')
    g.circle(9, 36, 3, '#3a3040')
    g.circle(31, 36, 3, '#3a3040')
    g.px(9, 36, '#bdb2ae')
    g.px(31, 36, '#bdb2ae')
    // Coconut pyramid.
    for (const [x, y] of [[9, 21], [15, 21], [21, 21], [27, 21], [33, 21], [12, 17], [18, 17], [24, 17], [30, 17], [15, 13], [21, 13], [27, 13]] as [number, number][]) {
      g.circle(x, y, 3, '#5e9a3a')
      g.circle(x - 0.6, y - 0.6, 2.2, '#7cc55e')
      g.px(x - 1, y - 2, '#b4e486')
    }
    // Cut coconut with a straw on top.
    g.circle(21, 9, 2.6, '#7cc55e')
    g.ellipse(21, 7, 2.2, 0.9, '#fffaf0')
    g.line(22, 7, 24, 3, '#ff6f91')
    g.px(24, 22 + 5, '#fffaf0')
    // Price sign "20".
    g.rect(28, 25, 7, 5, '#fffaf0')
    g.hline(29, 33, 27, '#e8514a')
    hooks.vendor = [{ x: 20, y: 39 }]
  })
}

/** Som tam hawker's shoulder-pole baskets (หาบเร่) with a clay mortar. */
export function somtamBaskets(): BeachProp {
  return bprop('somtam', 42, 22, 21, 21, (g) => {
    for (const cx of [9, 33]) {
      g.line(cx - 6, 4, cx, 0, '#8a6a4a')
      g.line(cx + 6, 4, cx, 0, '#8a6a4a')
      g.ellipse(cx, 14, 8, 7, '#b8904a')
      g.ellipse(cx, 12, 8, 3, '#d8b068')
      for (let y = 10; y < 20; y += 2) g.hline(cx - 7, cx + 7, y, '#9a7038')
      g.ellipse(cx, 8, 7, 2.5, '#e0c080')
    }
    // Mortar with papaya and pestle.
    g.ellipse(9, 6, 4, 2, '#8a5a3a')
    g.ellipse(9, 5.5, 3, 1.2, '#b8d86a')
    g.line(10, 5, 13, 0, '#c89060')
    // Veg and a plastic bag of sticky rice.
    g.rect(28, 5, 3, 3, '#e8514a')
    g.rect(32, 4, 3, 3, '#6cc36a')
    g.rect(36, 5, 3, 3, '#fffaf0')
    g.line(9, 0, 33, 0, '#8a6a4a')
  })
}

/** Grilled squid cart (ปลาหมึกย่าง) with a charcoal grill and skewers. */
export function squidGrill(): BeachProp {
  return bprop('squidgrill', 36, 30, 18, 29, (g, hooks) => {
    g.rect(2, 12, 32, 12, '#e8e0d4')
    g.rect(2, 12, 32, 2, '#fffaf0')
    g.hline(2, 33, 23, '#a8a098')
    g.circle(7, 26, 3, '#3a3040')
    g.circle(29, 26, 3, '#3a3040')
    // Charcoal bed.
    g.rect(4, 8, 28, 4, '#3a3040')
    for (let x = 5; x < 31; x += 2) g.px(x, 10, x % 4 ? '#ff7a1a' : '#ffd23f')
    // Squid skewers on the grill.
    for (let i = 0; i < 5; i++) {
      const x = 7 + i * 5
      g.vline(x, 0, 9, '#d8b068')
      g.rect(x - 1, 3, 3, 5, '#f0b890')
      g.px(x, 2, '#f0b890')
      g.px(x - 1, 8, '#e0906a')
      g.px(x + 1, 8, '#e0906a')
    }
    // Dipping sauce jar.
    g.rect(27, 14, 4, 5, '#6cc36a')
    g.hline(27, 30, 14, '#fffaf0')
    hooks.smoke = [{ x: 18, y: 6 }]
  })
}

/** Ice-cream tricycle with a bell and a little parasol. */
export function iceCart(): BeachProp {
  return bprop('icecart', 38, 38, 19, 37, (g) => {
    g.vline(26, 4, 20, '#d8d0c4')
    g.poly([[16, 8], [26, 2], [36, 8]], '#ff9fc0')
    g.line(26, 2, 21, 8, '#fffaf0')
    g.line(26, 2, 31, 8, '#fffaf0')
    g.rect(14, 18, 22, 12, '#fffaf0')
    g.rect(14, 18, 22, 3, '#5aa9e8')
    g.rect(17, 23, 6, 5, '#ffd6e0')
    g.rect(25, 23, 8, 5, '#d4f1ff')
    g.circle(29, 25, 2, '#ff9fc0')
    g.circle(20, 25, 1.5, '#8a5a3a')
    g.circle(5, 32, 5, '#3a3040')
    g.circle(5, 32, 3, '#bdb2ae')
    g.circle(31, 33, 4, '#3a3040')
    g.circle(19, 33, 4, '#3a3040')
    g.line(5, 32, 14, 24, '#8a8490')
    g.line(5, 22, 9, 22, '#8a8490')
    g.circle(9, 21, 1.4, '#ffd23f')
  })
}

/** Rack of batik sarongs (ผ้าปาเต๊ะ) for sale, a few flapping. */
export function sarongRack(): BeachProp {
  return bprop('sarongs', 46, 36, 23, 35, (g, hooks) => {
    g.vline(2, 2, 35, '#8a6a4a')
    g.vline(43, 2, 35, '#8a6a4a')
    g.hline(2, 43, 2, '#b08a6a')
    g.hline(2, 43, 3, '#8a6a4a')
    const cols: [Color, Color][] = [['#e8514a', '#ffd23f'], ['#3aa8c8', '#ff9fc0'], ['#6a4fb0', '#ffd54f'], ['#43905a', '#fffaf0'], ['#f58f35', '#3d63b5']]
    cols.forEach(([a, b], i) => {
      const x = 4 + i * 8
      g.rect(x, 4, 7, 24 - (i % 2) * 3, a)
      for (let y = 6; y < 26 - (i % 2) * 3; y += 4)
        for (let k = 0; k < 7; k += 3) {
          g.px(x + k + ((y >> 2) % 2), y, b)
          g.px(x + k + 1, y + 1, mix(b, a, 0.4))
        }
      g.vline(x + 6, 4, 27 - (i % 2) * 3, mix(a, INK, 0.25))
      hooks.cloth = [...(hooks.cloth ?? []), { x: x + 3, y: 28 - (i % 2) * 3 }]
    })
  })
}

/** Massage mats under a tree: two mats with pillows and a towel stack. */
export function massageMats(): BeachProp {
  return bprop('massage', 52, 22, 26, 21, (g) => {
    for (const x of [2, 28]) {
      g.rect(x, 6, 22, 12, '#e8514a')
      g.rect(x + 1, 7, 20, 10, '#f07a6a')
      for (let i = 0; i < 20; i += 4) g.vline(x + 1 + i, 7, 16, '#d8433f')
      g.rect(x + 16, 8, 5, 8, '#fffaf0')
      g.hline(x + 16, x + 20, 12, '#e8e0d4')
    }
    // Sign "นวด" plank, oil bottles and towel stack.
    g.rect(22, 0, 8, 6, '#c89060')
    g.hline(23, 28, 2, '#fffaf0')
    g.hline(23, 27, 4, '#fffaf0')
    g.rect(24, 17, 2, 4, '#ffd23f')
    g.rect(27, 17, 2, 4, '#6cc36a')
    g.rect(46, 18, 5, 3, '#fffaf0')
    g.rect(46, 16, 5, 2, '#9fd0ff')
  })
}

/** A thatched beach bar / shack with a counter and a chalk board. */
export function beachBar(night: boolean, sign: Color = '#43b8a8'): BeachProp {
  return bprop(`bar:${night ? 'n' : 'd'}:${sign}`, 64, 48, 32, 47, (g, hooks) => {
    const post = '#8a6a4a'
    for (const x of [4, 58]) g.rect(x, 16, 3, 32, post)
    g.rect(6, 30, 52, 14, '#b08a6a')
    for (let x = 8; x < 58; x += 4) g.vline(x, 30, 43, '#9a7456')
    g.rect(4, 28, 56, 3, '#d8b890')
    g.hline(4, 59, 30, '#8a6a4a')
    // Back shelf with bottles and a lit window at night.
    g.rect(10, 18, 44, 10, night ? '#ffd88a' : '#6a5040')
    for (let x = 12; x < 52; x += 4) g.rect(x, 20, 2, 5, ['#6cc36a', '#ff9fc0', '#ffd23f', '#9fd0ff'][x % 4])
    // Thatched roof.
    g.poly([[0, 18], [10, 4], [54, 4], [64, 18]], '#c8a060')
    for (let y = 6; y < 18; y += 3) for (let x = 2; x < 62; x += 3) g.px(x + (y % 2), y, (x + y) % 5 ? '#b08848' : '#e0c080')
    g.hline(0, 63, 18, '#9a7038')
    for (let x = 1; x < 63; x += 2) g.px(x, 19, '#9a7038')
    // Sign board.
    g.rect(24, 0, 16, 7, sign)
    g.hline(26, 37, 3, '#fffaf0')
    g.hline(27, 34, 5, mix(sign, '#ffffff', 0.4))
    // String lights.
    for (let x = 4; x < 60; x += 5) g.px(x, 20 + Math.round(Math.sin(x * 0.3)), night ? '#fff3a6' : '#e8e0d4')
    hooks.lamp = [{ x: 32, y: 22 }]
    hooks.lights = Array.from({ length: 11 }, (_, i) => ({ x: 4 + i * 5, y: 20 }))
  })
}

/** Rental board (jet ski / banana boat / ring prices). */
export function rentalBoard(kind: 'banana' | 'jetski' | 'ring' | 'turtle' | 'snorkel' | 'clean' | 'photo'): BeachProp {
  const col: Record<typeof kind, Color> = { banana: '#ffd23f', jetski: '#5aa9e8', ring: '#fffaf0', turtle: '#6cc36a', snorkel: '#43b8a8', clean: '#86c95f', photo: '#ff9fc0' }
  return bprop(`board:${kind}`, 22, 28, 11, 27, (g) => {
    g.vline(4, 12, 27, '#8a6a4a')
    g.vline(17, 12, 27, '#8a6a4a')
    g.rect(1, 1, 20, 14, '#fffaf0')
    g.rect(2, 2, 18, 12, col[kind])
    g.hline(3, 18, 2, mix(col[kind], '#ffffff', 0.4))
    const K = INK
    if (kind === 'banana') {
      g.ellipse(11, 8, 7, 2.5, '#fff08a')
      g.hline(5, 17, 10, '#c89a18')
    } else if (kind === 'jetski') {
      g.poly([[4, 9], [14, 8], [18, 10], [5, 11]], '#e8514a')
      g.rect(8, 6, 4, 2, K)
    } else if (kind === 'ring') {
      g.circle(11, 8, 4, '#e8514a')
      g.circle(11, 8, 2, col[kind])
    } else if (kind === 'turtle') {
      g.ellipse(11, 8, 4, 3, '#2f6f4b')
      g.circle(16, 8, 1.4, '#2f6f4b')
      g.px(6, 5, '#2f6f4b')
      g.px(6, 11, '#2f6f4b')
    } else if (kind === 'snorkel') {
      g.rect(6, 6, 7, 4, '#2d3650')
      g.rect(7, 7, 5, 2, '#9fe8ff')
      g.vline(15, 3, 9, '#ffd23f')
    } else if (kind === 'clean') {
      g.rect(8, 5, 6, 7, '#3a8a4a')
      g.hline(7, 14, 5, '#fffaf0')
      g.px(11, 8, '#fffaf0')
    } else {
      g.rect(6, 5, 10, 7, K)
      g.circle(11, 8, 2, '#9fd0ff')
      g.rect(13, 4, 2, 1, K)
    }
  })
}

/** Two recycling bins (blue for plastic, green for the rest). */
export function trashBins(): BeachProp {
  return bprop('bins', 22, 16, 11, 15, (g) => {
    for (const [x, c] of [[1, '#3d7ac8'], [12, '#3a9a4a']] as [number, Color][]) {
      g.rect(x, 3, 9, 12, c)
      g.rect(x - 1, 1, 11, 3, mix(c, '#ffffff', 0.25))
      g.vline(x + 2, 5, 13, mix(c, '#ffffff', 0.2))
      g.px(x + 4, 8, '#fffaf0')
      g.px(x + 5, 9, '#fffaf0')
      g.px(x + 3, 9, '#fffaf0')
    }
  })
}

/** The fenced turtle hatchery nest with a sign and a thermometer. */
export function turtleHatchery(): BeachProp {
  return bprop('hatchery', 52, 30, 26, 29, (g, hooks) => {
    g.ellipse(26, 22, 22, 6, '#e8d0a0')
    for (let x = 4; x <= 48; x += 4) {
      g.vline(x, 12, 26, '#b08a6a')
      g.px(x, 11, '#d8b890')
    }
    g.hline(4, 48, 15, '#c8a070')
    g.hline(4, 48, 22, '#c8a070')
    // Mesh.
    for (let x = 5; x < 48; x += 2) for (let y = 16; y < 22; y += 2) g.px(x + (y % 4 ? 1 : 0), y, '#e8e0d4')
    // Sand mounds with little flags.
    for (const [x, c] of [[16, '#e8514a'], [26, '#ffd23f'], [36, '#5aa9e8']] as [number, Color][]) {
      g.ellipse(x, 21, 4, 1.8, '#d8bc88')
      g.vline(x, 14, 20, '#8a8480')
      g.rect(x + 1, 14, 3, 2, c)
    }
    // Sign.
    g.vline(26, 0, 10, '#8a6a4a')
    g.rect(16, 0, 20, 7, '#6cc36a')
    g.hline(18, 33, 2, '#fffaf0')
    g.hline(19, 30, 4, '#fffaf0')
    hooks.nest = [{ x: 26, y: 22 }]
  })
}

/** Big wooden photo frame on the beach ("I ♥ ..." style). */
export function photoFrame(a: Color = '#ff9fc0', b: Color = '#ffd23f'): BeachProp {
  return bprop(`frame:${a}:${b}`, 40, 44, 20, 43, (g) => {
    g.vline(4, 30, 43, '#8a6a4a')
    g.vline(35, 30, 43, '#8a6a4a')
    g.rect(1, 2, 38, 30, a)
    g.rect(5, 6, 30, 22, '#00000000')
    const ctx = g.ctx
    ctx.clearRect(5 - g.ox, 6 - g.oy, 30, 22)
    g.hline(1, 38, 2, mix(a, '#ffffff', 0.4))
    // Heart and little shells on the frame.
    g.rect(17, 0, 2, 2, b)
    g.rect(20, 0, 2, 2, b)
    g.rect(17, 2, 5, 2, b)
    g.rect(18, 4, 3, 1, b)
    for (const [x, y] of [[3, 10], [3, 20], [36, 12], [36, 24], [10, 29], [28, 29]] as [number, number][]) g.px(x, y, '#fffaf0')
    g.rect(2, 29, 36, 3, mix(a, INK, 0.2))
  })
}

/** Beach rocks (one to three boulders). */
export function rocks(v = 0, big = false): BeachProp {
  const S = big ? 1.6 : 1
  return bprop(`rocks:${v}:${big ? 1 : 0}`, Math.round(34 * S), Math.round(18 * S), Math.round(17 * S), Math.round(17 * S), (g) => {
    const blobs: [number, number, number, number][] = [[12, 11, 9, 6], [24, 12, 7, 5], [5, 14, 4, 3]].slice(0, 1 + (v % 3)) as [number, number, number, number][]
    for (const [x, y, rx, ry] of blobs) {
      const X = x * S
      const Y = y * S
      g.ellipse(X, Y, rx * S, ry * S, '#6e6a78')
      g.ellipse(X - 1, Y - 1, rx * S - 1, ry * S - 1, '#9a94a4')
      g.ellipse(X - rx * S * 0.35, Y - ry * S * 0.4, rx * S * 0.4, ry * S * 0.35, '#c4c0cc')
      g.hline(Math.round(X - rx * S + 2), Math.round(X + rx * S - 2), Math.round(Y + ry * S - 1), '#4e4a58')
      g.px(X + 2, Y - 1, '#6a8a4a')
    }
  })
}

/** A promenade lamp post (lit head drawn by the map's lights). */
export function lampPost(night: boolean): BeachProp {
  return bprop(`bl-lamp:${night ? 1 : 0}`, 10, 34, 5, 33, (g, hooks) => {
    g.vline(5, 6, 33, '#5e5a64')
    g.vline(4, 6, 33, '#8a8490')
    g.rect(3, 31, 5, 3, '#5e5a64')
    g.rect(2, 0, 7, 6, night ? '#fff3a6' : '#e8f4ff')
    g.rect(1, 0, 9, 1, '#3a3040')
    g.rect(3, 6, 5, 1, '#3a3040')
    hooks.light = [{ x: 5, y: 3 }]
  })
}

/** Wooden boardwalk / pier planks (baked, no outline). */
export function boardwalk(g: Surface, x: number, y: number, w: number, h: number, night: boolean, vertical = true) {
  const base = night ? '#9a7a62' : '#c8966a'
  g.rect(x, y, w, h, base)
  const d = mix(base, INK, 0.3)
  const l = mix(base, '#ffffff', 0.2)
  if (vertical) {
    for (let j = 0; j < h; j += 4) {
      g.hline(x, x + w - 1, y + j, d)
      g.hline(x, x + w - 1, y + j + 1, l)
    }
    g.vline(x, y, y + h - 1, d)
    g.vline(x + w - 1, y, y + h - 1, d)
  } else {
    for (let i = 0; i < w; i += 4) {
      g.vline(x + i, y, y + h - 1, d)
      g.vline(x + i + 1, y, y + h - 1, l)
    }
    g.hline(x, x + w - 1, y, d)
    g.hline(x, x + w - 1, y + h - 1, d)
  }
}

/** A seafood/snack stall with a striped awning and a counter (wider shop front). */
export function seafoodStall(awn: [Color, Color], goods: 'crab' | 'fruit' | 'drinks' | 'squid'): BeachProp {
  return bprop(`bstall:${awn.join()}:${goods}`, 50, 40, 25, 39, (g, hooks) => {
    for (const x of [3, 45]) g.rect(x, 10, 2, 30, '#8a8480')
    for (let x = 0; x < 50; x++) {
      const c = Math.floor(x / 5) % 2 ? awn[0] : awn[1]
      g.vline(x, 4, 10, c)
      if (x % 5 < 3) g.px(x, 11, c)
    }
    g.hline(0, 49, 4, mix(awn[0], INK, 0.3))
    g.rect(2, 24, 46, 14, '#f0e8dc')
    g.rect(2, 24, 46, 2, '#fffaf0')
    g.hline(2, 47, 37, '#b8aca0')
    g.rect(6, 28, 38, 7, '#9fd0ff')
    for (let x = 7; x < 44; x += 2) g.px(x, 29 + (x % 3), '#d4f1ff')
    // Goods on the counter.
    for (let i = 0; i < 7; i++) {
      const x = 6 + i * 6
      if (goods === 'crab') {
        g.ellipse(x + 2, 22, 2.6, 1.6, '#e8704a')
        g.px(x, 21, '#b8433f')
        g.px(x + 4, 21, '#b8433f')
      } else if (goods === 'fruit') g.circle(x + 2, 21, 2.2, ['#ffd23f', '#7cc55e', '#f58f35'][i % 3])
      else if (goods === 'drinks') {
        g.rect(x + 1, 18, 3, 6, ['#ff9fc0', '#ffd23f', '#9fe0a0', '#ffb347'][i % 4])
        g.vline(x + 3, 15, 18, '#fffaf0')
      } else {
        g.vline(x + 2, 14, 23, '#d8b068')
        g.rect(x + 1, 16, 3, 5, '#f0b890')
      }
    }
    hooks.vendor = [{ x: 25, y: 22 }]
    hooks.lamp = [{ x: 25, y: 14 }]
  })
}

/** Tiny sea turtle sprite (for props and the hatchery). */
export function drawBabyTurtle(g: Surface, x: number, y: number, frame: number, flip = false, shell: Color = '#4a7a4a') {
  const X = Math.round(x)
  const Y = Math.round(y)
  const f = flip ? -1 : 1
  const fl = frame % 2
  g.px(X - 2, Y - 1 - fl, '#3a5a3a')
  g.px(X + 2, Y - 1 + fl, '#3a5a3a')
  g.px(X - 2, Y + 1 + fl, '#3a5a3a')
  g.px(X + 2, Y + 1 - fl, '#3a5a3a')
  g.ellipse(X, Y, 2, 1.6, shell)
  g.px(X - 1, Y - 1, mix(shell, '#ffffff', 0.35))
  g.px(X + f * 3, Y, '#5a7a5a')
  g.px(X + f * 3, Y - 1, '#5a7a5a')
}
