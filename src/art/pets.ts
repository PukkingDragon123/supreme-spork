// Collectible pet companions. Every pet is painted procedurally from simple
// shapes (ellipses, tubes, polygons) described in "design units": a 40×40
// grid with the origin at the bottom-centre of the frame (x right, y up is
// negative, ground at y = 0). The painter rasterises the same design at
// scale 1 (20×20 world sprite) or scale 2 (40×40 dress-up sprite); faces,
// shading, scale/feather patterns and ornaments are authored separately per
// scale so the small sprite stays crisp and the big one gets real detail.
//
// Each part is committed as a layer; the layer's edge pixels that touch
// earlier paint become a darker line colour (like the HD doll), so a head
// over a body, an ear over a head... separate cleanly. The silhouette gets a
// 1px ink outline. Flying pets bake their hover and a soft ground shadow into
// the frame; ground pets rest their feet on the bottom row (the caller draws
// the usual contact shadow).

import { createCanvas, mix } from '../engine/pixel'
import { cached, flipSprite, type Sprite } from '../engine/sprite'
import { P } from './palette'

export type PetFacing = 'down' | 'up' | 'side'
/** `swim` paddles half under water (used near water by pets with `swims`). */
export type PetAnim = 'idle' | 'walk' | 'happy' | 'sleep' | 'swim'

/** Nominal frame size at scale 1 (scale 2 is exactly double). */
export const PET_BASE = { w: 20, h: 20 } as const

const FRAMES: Record<PetAnim, number> = { idle: 2, walk: 4, happy: 2, sleep: 2, swim: 2 }

export function petFrames(anim: PetAnim): number {
  return FRAMES[anim]
}

// ---------------------------------------------------------------------------
// Colours

const INK = P.ink
const EYE = '#2a1a2c'
const WHITE = '#ffffff'
const BLUSH = '#ff9aa6'
const MOUTH = '#8e3a52'
const TONGUE = '#ff8f9c'
const HEART = '#ff6f91'
const HEART_L = '#ffc2d1'
const SHADOW = 'rgba(58, 40, 56, 0.24)'

interface Mat {
  l: string
  b: string
  s: string
  d: string
}

function mat(b: string, s?: string, l?: string, d?: string): Mat {
  const sh = s ?? mix(b, INK, 0.2)
  return { l: l ?? mix(b, '#ffffff', 0.4), b, s: sh, d: d ?? mix(sh, INK, 0.45) }
}

// ---------------------------------------------------------------------------
// Painter

/** A shape is a predicate on native pixel-centre coordinates. */
type Shape = (x: number, y: number) => boolean

function union(...s: Shape[]): Shape {
  return (x, y) => s.some((f) => f(x, y))
}
function inter(a: Shape, b: Shape): Shape {
  return (x, y) => a(x, y) && b(x, y)
}

interface FillOpts {
  /** Edge line colour where the part overlaps earlier paint (null = none). */
  line?: string | null
  /** Auto bottom-right shadow rim. Default true for materials. */
  shade?: boolean
  /** Shadow rim thickness in native px [x, y]. */
  sd?: [number, number]
  /** Highlight area. */
  hl?: Shape
  /** Top rim highlight (thin light edge along the top). */
  rim?: boolean
  /** Only paint where the buffer already has one of these tags. */
  clip?: number[]
  tag?: number
}

const T = { body: 1, head: 2, face: 3, deco: 4, wing: 5, fx: 6 }

class Pnt {
  k: number
  W: number
  H: number
  G: number
  hd: boolean
  c: (string | null)[]
  t: Uint8Array
  /** Native pixel offset applied to shapes as they are created. */
  ox = 0
  oy = 0

  constructor(k: number) {
    this.k = k
    this.W = Math.round(PET_BASE.w * k)
    this.H = Math.round(PET_BASE.h * k)
    this.G = this.H - 1
    this.hd = k >= 2
    this.c = new Array(this.W * this.H).fill(null)
    this.t = new Uint8Array(this.W * this.H)
  }

  X(x: number) {
    return this.W / 2 + (x * this.k) / 2 + this.ox
  }
  Y(y: number) {
    return this.G + (y * this.k) / 2 + this.oy
  }
  S(v: number) {
    return (v * this.k) / 2
  }
  /** Native pixel column/row for a design point. */
  ix(x: number) {
    return Math.floor(this.X(x))
  }
  iy(y: number) {
    return Math.floor(this.Y(y))
  }
  /** Mirror a native column around the frame centre. */
  mx(ix: number) {
    return this.W - 1 - ix
  }

  // --- shapes (design units) ---
  ell(cx: number, cy: number, rx: number, ry: number): Shape {
    const X = this.X(cx)
    const Y = this.Y(cy)
    const RX = Math.max(0.5, this.S(rx))
    const RY = Math.max(0.5, this.S(ry))
    return (x, y) => {
      const u = (x - X) / RX
      const v = (y - Y) / RY
      return u * u + v * v <= 1
    }
  }
  circ(cx: number, cy: number, r: number): Shape {
    return this.ell(cx, cy, r, r)
  }
  /** Tube through control points [x, y, radius] (Catmull-Rom smoothed). */
  tube(pts: [number, number, number][], steps = 6): Shape {
    const disc: [number, number, number][] = []
    const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))]
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = at(i - 1)
      const p1 = at(i)
      const p2 = at(i + 1)
      const p3 = at(i + 2)
      for (let s = 0; s < steps; s++) {
        const t = s / steps
        const t2 = t * t
        const t3 = t2 * t
        const cr = (a: number, b: number, c: number, d: number) =>
          0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
        disc.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t])
      }
    }
    const last = pts[pts.length - 1]
    disc.push(last)
    const nd = disc.map(([x, y, r]) => [this.X(x), this.Y(y), Math.max(0.5, this.S(r))] as const)
    return (x, y) => {
      for (const [cx, cy, r] of nd) {
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy <= r * r) return true
      }
      return false
    }
  }
  poly(pts: [number, number][]): Shape {
    const np = pts.map(([x, y]) => [this.X(x), this.Y(y)] as const)
    return (x, y) => {
      let inside = false
      for (let i = 0, j = np.length - 1; i < np.length; j = i++) {
        const [xi, yi] = np[i]
        const [xj, yj] = np[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
      }
      return inside
    }
  }
  /** Axis-aligned rect with rounded bottom corners (legs). */
  leg(x0: number, y0: number, x1: number, y1: number, round = true): Shape {
    const a = Math.round(this.X(x0))
    const b = Math.round(this.X(x1))
    const top = Math.round(this.Y(y0))
    const bot = Math.round(this.Y(y1))
    return (x, y) => {
      if (x < a || x >= b || y < top || y >= bot) return false
      if (round && b - a >= 3 && y >= bot - 1 && (x < a + 1 || x >= b - 1)) return false
      return true
    }
  }
  rect(x0: number, y0: number, x1: number, y1: number): Shape {
    return this.leg(x0, y0, x1, y1, false)
  }
  /** Native-pixel rect (for tiny details). */
  nrect(x: number, y: number, w: number, h: number): Shape {
    return (px, py) => px >= x && px < x + w && py >= y && py < y + h
  }

  // --- painting ---
  has(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.W && y < this.H && this.c[y * this.W + x] !== null
  }
  tagAt(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.W && y < this.H ? this.t[y * this.W + x] : 0
  }

  fill(shape: Shape, col: Mat | string, o: FillOpts = {}) {
    const m = typeof col === 'string' ? null : col
    const base = typeof col === 'string' ? col : col.b
    const line = o.line === undefined ? (m ? m.d : null) : o.line
    const shade = o.shade ?? !!m
    const sd = o.sd ?? (this.hd ? [1, 2] : [1, 1])
    const inS = (x: number, y: number) => x >= 0 && y >= 0 && x < this.W && y < this.H && shape(x + 0.5, y + 0.5)
    const pts: number[] = []
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++) {
        if (!inS(x, y)) continue
        if (o.clip && !o.clip.includes(this.t[y * this.W + x])) continue
        pts.push(y * this.W + x)
      }
    if (!pts.length) return
    const set = new Set(pts)
    const out: [number, string][] = []
    for (const i of pts) {
      const x = i % this.W
      const y = (i - x) / this.W
      let c = base
      if (m) {
        if (shade && (!inS(x + sd[0], y + sd[1]) || !inS(x, y + sd[1]))) c = m.s
        else if (o.rim && !inS(x, y - 1) && inS(x, y + 1)) c = m.l
        if (o.hl && o.hl(x + 0.5, y + 0.5) && c === base) c = m.l
      }
      if (line) {
        for (const [dx, dy] of N4) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) continue
          const ni = ny * this.W + nx
          if (!set.has(ni) && this.c[ni] !== null && this.t[ni] !== T.fx) {
            c = line
            break
          }
        }
      }
      out.push([i, c])
    }
    const tag = o.tag ?? T.body
    for (const [i, c] of out) {
      this.c[i] = c
      this.t[i] = tag
    }
  }

  /** Put one native pixel. */
  px(x: number, y: number, c: string, tag = T.face) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return
    this.c[y * this.W + x] = c
    this.t[y * this.W + x] = tag
  }
  /** Put a pixel only over existing paint. */
  pxOn(x: number, y: number, c: string, tag = T.face) {
    if (this.has(Math.floor(x), Math.floor(y))) this.px(x, y, c, tag)
  }
  /** Stamp rows of chars at a native position. */
  stamp(x: number, y: number, rows: string[], pal: Record<string, string>, mirror = false, tag = T.face) {
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++) {
        const ch = rows[j][i]
        const c = pal[ch]
        if (!c) continue
        this.px(mirror ? x - i : x + i, y + j, c, tag)
      }
  }

  outline() {
    const W = this.W
    const H = this.H
    const add: number[] = []
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (this.c[y * W + x] !== null) continue
        if (this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1)) add.push(y * W + x)
      }
    for (const i of add) {
      this.c[i] = INK
      this.t[i] = T.fx
    }
  }

  canvas(under?: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    const cv = createCanvas(this.W, this.H)
    const ctx = cv.getContext('2d')!
    under?.(ctx)
    for (let i = 0; i < this.c.length; i++) {
      const c = this.c[i]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(i % this.W, Math.floor(i / this.W), 1, 1)
    }
    return cv
  }
}

const N4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

// ---------------------------------------------------------------------------
// Pose

type Eyes = 'open' | 'happy' | 'closed'

interface Rig {
  p: Pnt
  f: PetFacing
  a: PetAnim
  fr: number
  hd: boolean
  /** Native px vertical body offset (negative = up). */
  bob: number
  /** Walk phase 0..3, or -1 when standing. */
  walk: number
  eyes: Eyes
  mouth: 'smile' | 'open'
  /** Tail swing -1..1. */
  wag: number
  sleep: boolean
  happy: boolean
  /** Airborne frame of the happy hop. */
  air: boolean
  /** Breathing phase (0/1). */
  br: number
  /** Last head placed (design units) – used by extras and hearts. */
  hx: number
  hy: number
  hrx: number
  hry: number
  /** Swimming: drawn as a walk, then the part below the waterline is cut. */
  swim?: boolean
  /** Native px lift the painter used (for `post` overlays). */
  lift?: number
}

function makeRig(p: Pnt, f: PetFacing, a: PetAnim, fr: number): Rig {
  const hd = p.hd
  const r: Rig = { p, f, a, fr, hd, bob: 0, walk: -1, eyes: 'open', mouth: 'smile', wag: 0, sleep: false, happy: false, air: false, br: 0, hx: 0, hy: -18, hrx: 8, hry: 7 }
  if (a === 'idle') {
    r.br = fr % 2
    r.wag = fr % 2 ? 1 : 0
  } else if (a === 'walk') {
    r.walk = fr % 4
    r.bob = fr % 2 ? -1 : 0
    r.wag = fr % 2 ? 1 : -1
  } else if (a === 'swim') {
    r.swim = true
    r.walk = (fr % 2) * 2
    r.wag = fr % 2 ? 1 : -1
  } else if (a === 'happy') {
    r.happy = true
    r.eyes = 'happy'
    r.mouth = 'open'
    r.air = fr % 2 === 1
    r.bob = r.air ? -(hd ? 4 : 2) : 0
    r.wag = r.air ? -1 : 1
  } else {
    r.sleep = true
    r.eyes = 'closed'
    r.br = fr % 2
  }
  return r
}

// ---------------------------------------------------------------------------
// Face helpers (positions in design units; stamps in native pixels)

/** One eye centred on a design point. `iris` tints the lower pixel (HD). */
function eye(r: Rig, x: number, y: number, iris?: string, mirror = false, small: string = EYE) {
  const p = r.p
  let cx = Math.round(p.X(x))
  const cy = Math.round(p.Y(y))
  if (r.hd) {
    // 2×3 (open) with a white catch-light, ^ (happy), ◡ (closed)
    if (mirror) cx = p.W - cx
    const x0 = cx - 1
    if (r.eyes === 'open') {
      p.stamp(x0, cy - 2, ['wk', 'kk', 'ik'], { w: WHITE, k: EYE, i: iris ?? '#5a3a60' })
    } else if (r.eyes === 'happy') {
      p.stamp(x0 - 1 + (mirror ? 1 : 0), cy - 1, ['.k.', 'k.k'], { k: EYE })
    } else {
      p.stamp(x0 - 1 + (mirror ? 1 : 0), cy - 1, ['k.k', '.k.'], { k: EYE })
    }
  } else {
    let ex = Math.floor(p.X(x))
    if (mirror) ex = p.mx(ex)
    const ey = Math.floor(p.Y(y))
    if (r.eyes === 'open') {
      p.px(ex, ey - 1, small)
      p.px(ex, ey, small)
    } else if (r.eyes === 'happy') {
      p.px(ex, ey - 1, small)
    } else {
      p.px(ex, ey, small)
    }
  }
}

/** Symmetric pair of eyes for front views (x is the right eye's offset). */
function eyes2(r: Rig, x: number, y: number, iris?: string, small: string = EYE) {
  eye(r, x, y, iris, false, small)
  eye(r, x, y, iris, true, small)
}

function blush2(r: Rig, x: number, y: number) {
  const p = r.p
  if (r.hd) {
    const cx = Math.round(p.X(x))
    const cy = Math.round(p.Y(y))
    p.pxOn(cx - 1, cy, BLUSH)
    p.pxOn(cx, cy, BLUSH)
    p.pxOn(p.W - cx, cy, BLUSH)
    p.pxOn(p.W - cx - 1, cy, BLUSH)
  } else {
    const cx = Math.floor(p.X(x))
    const cy = Math.floor(p.Y(y))
    p.pxOn(cx, cy, BLUSH)
    p.pxOn(p.mx(cx), cy, BLUSH)
  }
}

function blush1(r: Rig, x: number, y: number) {
  const p = r.p
  const cx = Math.round(p.X(x))
  const cy = Math.round(p.Y(y))
  if (r.hd) {
    p.pxOn(cx - 1, cy, BLUSH)
    p.pxOn(cx, cy, BLUSH)
  } else p.pxOn(Math.floor(p.X(x)), Math.floor(p.Y(y)), BLUSH)
}

/** Front-view nose + mouth centred on the frame (y = nose row). */
function snoutFront(r: Rig, y: number, nose: string = INK, kind: 'cat' | 'dog' | 'none' = 'dog') {
  const p = r.p
  const c = p.W / 2
  const ny = Math.round(p.Y(y))
  if (r.hd) {
    if (kind !== 'none') {
      p.px(c - 1, ny, nose)
      p.px(c, ny, nose)
      if (kind === 'dog') {
        p.px(c - 2, ny - 1, nose)
        p.px(c - 1, ny - 1, nose)
        p.px(c, ny - 1, nose)
        p.px(c + 1, ny - 1, nose)
        p.px(c - 1, ny - 1, '#6a5a70')
      }
    }
    if (r.mouth === 'open') {
      p.stamp(c - 2, ny + 1, ['mmmm', 'mttm', '.tt.'], { m: MOUTH, t: TONGUE })
    } else {
      if (kind === 'cat') p.stamp(c - 2, ny + 1, ['m..m'], { m: MOUTH })
      else p.stamp(c - 3, ny + 1, ['m.mm.m', '.m..m.'], { m: MOUTH })
    }
  } else {
    if (kind !== 'none') {
      p.px(c - 1, ny, nose)
      p.px(c, ny, nose)
    }
    if (r.mouth === 'open') {
      p.px(c - 1, ny + 1, MOUTH)
      p.px(c, ny + 1, TONGUE)
    }
  }
}

/** A little heart floating up during the happy hop (baked into the frame). */
function heart(r: Rig, x: number, y: number) {
  const p = r.p
  const cx = Math.round(p.X(x))
  const cy = Math.round(p.Y(y))
  if (r.hd) {
    p.stamp(cx - 2, cy - 2, ['hh.hh', 'lhhhh', 'hhhhh', '.hhh.', '..h..'], { h: HEART, l: HEART_L }, false, T.deco)
    p.px(cx - 2, cy - 2, HEART_L, T.deco)
  } else {
    p.stamp(cx - 1, cy - 1, ['h.h', 'hhh', '.h.'], { h: HEART }, false, T.deco)
  }
}

// ---------------------------------------------------------------------------
// Generic four-legged chibi

interface QuadLook {
  body: Mat
  /** Belly / chest / muzzle colour. */
  light: Mat
  /** Lower legs & paws (defaults to body). */
  paw?: Mat
  /** Far-side legs (defaults to body.s). */
  ears: 'point' | 'round' | 'none'
  ear: Mat
  earIn?: string
  /** Muzzle: dog (snout), cat (flat face), none. */
  snout: 'dog' | 'cat' | 'none'
  nose: string
  iris?: string
  tail: 'curl' | 'plume' | 'whip' | 'catUp' | 'tuft' | 'none'
  tailMat?: Mat
  /** Proportions */
  bodyRX?: number
  bodyRY?: number
  headRX?: number
  headRY?: number
  legH?: number
  legW?: number
  /** Face mask colour for Siamese-type point markings. */
  mask?: Mat
  /** Extra painters. */
  afterBody?: (r: Rig) => void
  afterHead?: (r: Rig) => void
  beforeBody?: (r: Rig) => void
}

function quad(r: Rig, q: QuadLook) {
  const p = r.p
  const f = r.f
  const brx = q.bodyRX ?? 7.5
  const bry = q.bodyRY ?? 5
  const hrx = q.headRX ?? 8
  const hry = q.headRY ?? 7
  const legH = q.legH ?? 6
  const legW = q.legW ?? 3.5
  const paw = q.paw ?? q.body
  const far = mat(q.body.s, q.body.d, q.body.b)
  const farPaw = mat(paw.s, paw.d, paw.b)
  const breathe = r.br

  if (r.sleep) return quadSleep(r, q)

  p.oy = r.bob
  const legTop = -legH - 1.5
  const legBot = r.air ? -1.5 : 0

  if (f === 'side') {
    const bcx = -2
    const bcy = -legH - bry + 2.5
    const hcx = 5.5
    const hcy = bcy - bry - hry + 5.5 + (breathe ? 2 / p.k : 0)
    // walk phases: near legs swing, far legs opposite
    const sw = r.walk < 0 ? 0 : [1.5, 0, -1.5, 0][r.walk]
    const lift = (i: number) => (r.walk === 1 && i === 0) || (r.walk === 3 && i === 1) ? -1.5 : 0
    const fx = 3 + (r.air ? 1.5 : 0)
    const bx = -7 + (r.air ? -1.5 : 0)
    // tail (behind)
    tailSide(r, q, bcx - brx + 1.5, bcy - 1)
    // far legs
    p.fill(p.leg(fx + 1.5 - sw, legTop, fx + 1.5 - sw + legW - 0.5, legBot + lift(1)), farPaw, { line: far.d })
    p.fill(p.leg(bx + 1.5 + sw, legTop, bx + 1.5 + sw + legW - 0.5, legBot + lift(0)), farPaw, { line: far.d })
    q.beforeBody?.(r)
    // body
    p.fill(p.ell(bcx, bcy, brx, bry), q.body, { hl: p.ell(bcx - 1.5, bcy - bry * 0.55, brx * 0.55, bry * 0.28) })
    // belly
    p.fill(p.ell(bcx + 0.5, bcy + bry * 0.55, brx * 0.72, bry * 0.42), q.light, { line: null, clip: [T.body], shade: false })
    q.afterBody?.(r)
    // near legs
    p.fill(p.leg(fx + sw, legTop + 1, fx + sw + legW, legBot + lift(0)), paw)
    p.fill(p.leg(bx - sw, legTop + 1, bx - sw + legW, legBot + lift(1)), paw)
    // head
    headSide(r, q, hcx, hcy, hrx, hry)
    if (r.happy && r.air) heart(r, 13, hcy - hry - 1)
  } else {
    const bcy = -legH - bry + 2.5
    const hcy = bcy - bry - hry + 6 + (breathe ? 2 / p.k : 0)
    const lw = legW
    const lift = (i: number) => (r.walk === 1 && i === 0) || (r.walk === 3 && i === 1) ? -1.5 : 0
    if (f === 'up') {
      // back view: legs, body, head, ears, tail on top
      p.fill(p.leg(-brx + 1, legTop, -brx + 1 + lw, legBot + lift(0)), paw)
      p.fill(p.leg(brx - 1 - lw, legTop, brx - 1, legBot + lift(1)), paw)
      q.beforeBody?.(r)
      p.fill(p.ell(0, bcy, brx - 0.5, bry), q.body, { hl: p.ell(-1.5, bcy - bry * 0.5, brx * 0.45, bry * 0.3) })
      q.afterBody?.(r)
      earsFront(r, q, hcy, hrx, hry, true)
      setHead(r, 0, hcy, hrx, hry)
      p.fill(p.ell(0, hcy, hrx, hry), q.body, { tag: T.head, hl: p.ell(-2, hcy - hry * 0.5, hrx * 0.5, hry * 0.3) })
      earsFront(r, q, hcy, hrx, hry, false, true)
      q.afterHead?.(r)
      tailBack(r, q, bcy)
    } else {
      // front view
      tailFrontPeek(r, q, bcy)
      p.fill(p.leg(-brx + 0.5, legTop + 1, -brx + 0.5 + lw - 0.5, legBot + lift(1) - 1), farPaw, { line: far.d })
      p.fill(p.leg(brx - 0.5 - lw + 0.5, legTop + 1, brx - 0.5, legBot + lift(0) - 1), farPaw, { line: far.d })
      q.beforeBody?.(r)
      p.fill(p.ell(0, bcy, brx - 0.5, bry), q.body, { hl: p.ell(-2, bcy - bry * 0.4, brx * 0.4, bry * 0.3) })
      p.fill(p.ell(0, bcy + 0.5, brx * 0.5, bry * 0.75), q.light, { line: null, clip: [T.body], shade: false })
      q.afterBody?.(r)
      const fl = 1.5
      p.fill(p.leg(-fl - lw, legTop + 2, -fl, legBot + lift(0)), paw)
      p.fill(p.leg(fl, legTop + 2, fl + lw, legBot + lift(1)), paw)
      earsFront(r, q, hcy, hrx, hry, true)
      headFront(r, q, hcy, hrx, hry)
    }
    if (r.happy && r.air) heart(r, 10, hcy - hry - 1)
  }
  p.oy = 0
}

function setHead(r: Rig, x: number, y: number, rx: number, ry: number) {
  r.hx = x
  r.hy = y
  r.hrx = rx
  r.hry = ry
}

function tailSide(r: Rig, q: QuadLook, x: number, y: number) {
  const p = r.p
  const tm = q.tailMat ?? q.body
  const w = r.wag
  switch (q.tail) {
    case 'curl':
      p.fill(p.tube([[x + 1, y + 1, 1.6], [x - 2, y - 3, 1.8], [x - 1 + w, y - 7, 1.8], [x + 2 + w, y - 7.5, 1.5]]), tm)
      break
    case 'plume':
      p.fill(p.tube([[x + 1, y + 1, 2], [x - 2.5, y - 3, 3], [x - 1.5 + w, y - 8, 3.2], [x + 2 + w, y - 9, 2.4]]), tm, { hl: p.ell(x - 2, y - 7, 1.6, 2) })
      break
    case 'whip':
      p.fill(p.tube([[x + 1, y, 1.4], [x - 3, y - 2, 1.3], [x - 5 + w, y - 6, 1], [x - 5 + w * 1.5, y - 10, 0.8]]), tm)
      break
    case 'catUp':
      p.fill(p.tube([[x + 1, y + 1, 1.4], [x - 3, y - 2, 1.4], [x - 4.5 + w, y - 8, 1.4], [x - 2.5 + w * 1.5, y - 12, 1.5]]), tm)
      break
    case 'tuft':
      p.fill(p.tube([[x + 1, y, 0.9], [x - 2, y + 2, 0.8], [x - 2.5 + w * 0.5, y + 4, 0.8]]), tm)
      p.fill(p.circ(x - 2.5 + w * 0.5, y + 5, 1.4), q.tailMat ?? mat(q.body.d))
      break
    default:
      break
  }
}

function tailBack(r: Rig, q: QuadLook, bcy: number) {
  const p = r.p
  const tm = q.tailMat ?? q.body
  const w = r.wag * 1.5
  switch (q.tail) {
    case 'curl':
      p.fill(p.tube([[0, bcy + 2, 1.8], [w, bcy - 2, 2], [1 + w, bcy - 4.5, 1.8]]), tm)
      break
    case 'plume':
      p.fill(p.tube([[0, bcy + 2, 2.2], [w, bcy - 2, 3.2], [1.5 + w, bcy - 5, 2.8]]), tm, { hl: p.ell(-0.5 + w, bcy - 2.5, 1.3, 1.6) })
      break
    case 'whip':
      p.fill(p.tube([[0, bcy + 2, 1.4], [w, bcy + 5, 1.2], [w * 2, bcy + 7, 1]]), tm)
      break
    case 'catUp':
      p.fill(p.tube([[0, bcy + 2, 1.5], [w, bcy - 3, 1.5], [w * 2 + 1.5, bcy - 7, 1.5]]), tm)
      break
    case 'tuft':
      p.fill(p.tube([[0, bcy + 2, 0.9], [w * 0.5, bcy + 5, 0.9]]), tm)
      p.fill(p.circ(w * 0.5, bcy + 6, 1.4), q.tailMat ?? mat(q.body.d))
      break
    default:
      break
  }
}

function tailFrontPeek(r: Rig, q: QuadLook, bcy: number) {
  const p = r.p
  const tm = q.tailMat ?? q.body
  const w = r.wag
  const brx = q.bodyRX ?? 7.5
  if (q.tail === 'plume') p.fill(p.tube([[brx - 3, bcy, 2.5], [brx + 1 + w, bcy - 4, 3], [brx + 1 + w, bcy - 8, 2.4]]), tm)
  else if (q.tail === 'curl') p.fill(p.tube([[brx - 3, bcy, 1.6], [brx + 0.5 + w, bcy - 3, 1.8], [brx - 0.5 + w, bcy - 6, 1.5]]), tm)
  else if (q.tail === 'catUp') p.fill(p.tube([[brx - 3, bcy + 2, 1.4], [brx + 1 + w, bcy - 2, 1.4], [brx + 2 + w, bcy - 8, 1.5]]), tm)
  else if (q.tail === 'whip') p.fill(p.tube([[brx - 3, bcy + 2, 1.3], [brx + 1.5 + w, bcy - 1, 1.1], [brx + 2 + w, bcy - 5, 0.9]]), tm)
}

function earsFront(r: Rig, q: QuadLook, hcy: number, hrx: number, hry: number, behind: boolean, back = false) {
  const p = r.p
  if (q.ears === 'none') return
  const em = q.ear
  const top = hcy - hry
  if (q.ears === 'point' && behind) {
    for (const s of [-1, 1]) {
      const ex = s * (hrx - 3)
      p.fill(p.poly([[ex - s * 3.5, top + 4.5], [ex + s * 1.5, top - 5], [ex + s * 3.5, top + 3.5]].map(([a, b]) => [a, b] as [number, number])), em)
      if (!back && q.earIn) p.fill(p.poly([[ex - s * 1.5, top + 3.5], [ex + s * 1.3, top - 2.5], [ex + s * 2.3, top + 3]]), q.earIn, { line: null, clip: [T.body] })
    }
  }
  if (q.ears === 'round' && behind) {
    for (const s of [-1, 1]) {
      p.fill(p.ell(s * (hrx - 1.5), top + 2, 3, 3), em)
      if (!back && q.earIn) p.fill(p.ell(s * (hrx - 1.5), top + 2.5, 1.6, 1.6), q.earIn, { line: null, clip: [T.body] })
    }
  }
}

function headFront(r: Rig, q: QuadLook, hcy: number, hrx: number, hry: number) {
  const p = r.p
  setHead(r, 0, hcy, hrx, hry)
  p.fill(p.ell(0, hcy, hrx, hry), q.body, { tag: T.head, hl: p.ell(-2.5, hcy - hry * 0.55, hrx * 0.45, hry * 0.25) })
  if (q.mask) p.fill(p.ell(0, hcy + 2, hrx * 0.62, hry * 0.62), q.mask, { line: null, clip: [T.head], shade: false })
  // muzzle
  if (q.snout === 'dog') p.fill(p.ell(0, hcy + 3, 4, 2.8), q.mask ?? q.light, { line: null, clip: [T.head], shade: false })
  if (q.snout === 'cat') p.fill(p.ell(0, hcy + 3.2, 3.2, 2.2), q.mask ?? q.light, { line: null, clip: [T.head], shade: false })
  q.afterHead?.(r)
  eyes2(r, 3.8, hcy, q.iris, q.mask && q.iris ? q.iris : EYE)
  blush2(r, 5.8, hcy + 2.5)
  snoutFront(r, hcy + 2, q.nose, q.snout === 'cat' ? 'cat' : q.snout === 'dog' ? 'dog' : 'none')
}

function headSide(r: Rig, q: QuadLook, hcx: number, hcy: number, hrx: number, hry: number) {
  const p = r.p
  setHead(r, hcx, hcy, hrx, hry)
  const top = hcy - hry
  // far ear
  if (q.ears === 'point')
    p.fill(p.poly([[hcx - 4.5, top + 4], [hcx - 2.5, top - 4.5], [hcx + 0, top + 2]]), mat(q.ear.s, q.ear.d, q.ear.b))
  p.fill(p.ell(hcx, hcy, hrx, hry), q.body, { tag: T.head, hl: p.ell(hcx - 2, hcy - hry * 0.55, hrx * 0.45, hry * 0.25) })
  if (q.mask) p.fill(p.ell(hcx + 3.5, hcy + 1.5, hrx * 0.55, hry * 0.6), q.mask, { line: null, clip: [T.head], shade: false })
  // snout
  const sx = hcx + hrx - 1
  const sy = hcy + 2.2
  if (q.snout === 'dog') {
    p.fill(p.ell(sx, sy, 3.6, 2.6), q.mask ?? q.light, { tag: T.head })
    noseSide(r, sx + 3, sy - 1.8, q.nose)
  } else if (q.snout === 'cat') {
    p.fill(p.ell(sx - 0.5, sy + 0.5, 2.4, 2), q.mask ?? q.light, { tag: T.head, line: null, clip: [T.head], shade: false })
    noseSide(r, hcx + hrx - 0.5, sy - 1, q.nose, true)
  }
  // near ear
  if (q.ears === 'point') {
    p.fill(p.poly([[hcx - 3.5, top + 4.5], [hcx - 0.5, top - 5], [hcx + 2.5, top + 3.5]]), q.ear)
    if (q.earIn) p.fill(p.poly([[hcx - 1.8, top + 3.5], [hcx - 0.4, top - 2.5], [hcx + 1.2, top + 3]]), q.earIn, { line: null, clip: [T.body] })
  } else if (q.ears === 'round') {
    p.fill(p.ell(hcx - 3, top + 2, 3, 3), q.ear)
    if (q.earIn) p.fill(p.ell(hcx - 3, top + 2.5, 1.5, 1.5), q.earIn, { line: null, clip: [T.body] })
  }
  q.afterHead?.(r)
  eye(r, hcx + 3, hcy - 0.5, q.iris, false, q.mask && q.iris ? q.iris : EYE)
  blush1(r, hcx + 3.5, hcy + 2.5)
  if (r.mouth === 'open') mouthSide(r, sx + 0.5, sy + 1.5)
}

function noseSide(r: Rig, x: number, y: number, c: string, tiny = false) {
  const p = r.p
  const nx = Math.round(p.X(x))
  const ny = Math.round(p.Y(y))
  if (r.hd) {
    p.px(nx - 1, ny, c)
    if (!tiny) {
      p.px(nx, ny, c)
      p.px(nx - 1, ny + 1, c)
      p.px(nx, ny + 1, c)
    }
  } else p.px(Math.floor(p.X(x)) - (tiny ? 0 : 1), Math.floor(p.Y(y)), c)
}

function mouthSide(r: Rig, x: number, y: number) {
  const p = r.p
  const nx = Math.round(p.X(x))
  const ny = Math.round(p.Y(y))
  if (r.hd) p.stamp(nx - 2, ny, ['mmm', '.tt'], { m: MOUTH, t: TONGUE })
  else p.px(Math.floor(p.X(x)), Math.floor(p.Y(y)), MOUTH)
}

function quadSleep(r: Rig, q: QuadLook) {
  const p = r.p
  const brx = (q.bodyRX ?? 7.5) + 1
  const bry = (q.bodyRY ?? 5) - 0.5
  const hrx = q.headRX ?? 8
  const hry = (q.headRY ?? 7) - 0.5
  const b = r.br ? -1 / p.k : 0
  if (r.f === 'side') {
    const bcy = -bry - 0.3
    tailSleepSide(r, q, brx, bcy)
    p.fill(p.ell(-3, bcy + b, brx, bry - b), q.body, { hl: p.ell(-4.5, bcy - bry * 0.55, brx * 0.55, bry * 0.28) })
    // tucked front paws
    p.fill(p.ell(7.5, -1.6, 2.6, 1.6), q.paw ?? q.light)
    const hcx = 6
    const hcy = -hry + 0.5
    headSide(r, q, hcx, hcy, hrx, hry)
  } else {
    const bcy = -bry - 0.3
    p.fill(p.ell(0, bcy + b, brx, bry - b), q.body, { hl: p.ell(-2.5, bcy - bry * 0.6, brx * 0.45, bry * 0.25) })
    if (r.f === 'up') {
      const hcy = bcy - bry - hry + 7
      earsFront(r, q, hcy, hrx, hry, true, true)
      setHead(r, 0, hcy, hrx, hry)
      p.fill(p.ell(0, hcy, hrx, hry), q.body, { tag: T.head, hl: p.ell(-2, hcy - hry * 0.5, hrx * 0.5, hry * 0.3) })
      q.afterHead?.(r)
      tailBack(r, { ...q, tail: q.tail === 'plume' || q.tail === 'curl' ? q.tail : 'none' }, bcy + 1)
    } else {
      tailFrontPeek(r, q, bcy + 3)
      const hcy = bcy - bry - hry + 8.5
      earsFront(r, q, hcy, hrx, hry, true)
      headFront(r, q, hcy, hrx, hry)
      // paws under the chin
      const pm = q.paw ?? q.light
      p.fill(p.ell(-3.3, -1.5, 2.4, 1.6), pm)
      p.fill(p.ell(3.3, -1.5, 2.4, 1.6), pm)
    }
  }
}

function tailSleepSide(r: Rig, q: QuadLook, brx: number, bcy: number) {
  const p = r.p
  const tm = q.tailMat ?? q.body
  if (q.tail === 'none') return
  const rad = q.tail === 'plume' ? 2.6 : q.tail === 'tuft' ? 0.9 : 1.5
  p.fill(p.tube([[-3 - brx + 1, bcy + 1, rad], [-brx - 2, bcy + 4, rad], [-brx + 3, -1.6, rad], [2, -1.4, rad * 0.9]]), tm)
}

// ---------------------------------------------------------------------------
// Species

type Painter = (r: Rig) => void

const SPECIES: Record<
  string,
  {
    draw: Painter
    icon?: PetFacing
    /** Ground shadow half-width (flying pets). */
    shadow?: number
    /** Unoutlined overlay painted onto the finished frame (drips, bubble tint...). */
    post?: (ctx: CanvasRenderingContext2D, r: Rig) => void
  }
> = {}

// --- Dogs & cats -----------------------------------------------------------

const BANG_W = mat('#fbf6ee', '#dcd0c4', '#ffffff', '#b9a79c')
const BANG_T = mat('#d99a5b', '#b3743e', '#f0c28e')
SPECIES.bangkaew = {
  draw: (r) =>
    quad(r, {
      body: BANG_W,
      light: mat('#ffffff', '#ece4da'),
      ears: 'point',
      ear: BANG_T,
      earIn: '#f7c9b9',
      snout: 'dog',
      nose: INK,
      tail: 'plume',
      tailMat: BANG_W,
      headRX: 8.2,
      afterBody: (r) => {
        const p = r.p
        // tan saddle patch
        if (r.f === 'side') {
          p.fill(p.ell(-4, -10.5, 4, 2.8), BANG_T, { line: null, clip: [T.body], shade: false })
        } else if (r.f === 'up') {
          p.fill(p.ell(0, -11.5, 4.5, 3), BANG_T, { line: null, clip: [T.body], shade: false })
        }
      },
    }),
}

const RIDGE = mat('#d9824a', '#b3622f', '#f0a870', '#8a4524')
SPECIES.ridgeback = {
  draw: (r) =>
    quad(r, {
      body: RIDGE,
      light: mat('#f3c08e', '#e0a06a'),
      ears: 'point',
      ear: RIDGE,
      earIn: '#f7b3a0',
      snout: 'dog',
      nose: INK,
      tail: 'whip',
      headRX: 7.6,
      headRY: 6.8,
      legH: 7,
      afterBody: (r) => {
        const p = r.p
        // the ridge: a darker stripe of backward hair along the spine
        if (r.f === 'side' && !r.sleep) {
          p.fill(p.ell(-2.5, -15.5, 5, 1.6), mat(RIDGE.s), { line: null, clip: [T.body], shade: false })
          if (r.hd) for (let i = -6; i <= 1; i += 2) p.pxOn(Math.round(p.X(i)), Math.round(p.Y(-15)), RIDGE.d)
        } else if (r.f === 'up' || (r.sleep && r.f === 'side')) {
          p.fill(p.ell(0, -10, 1.6, 4), mat(RIDGE.s), { line: null, clip: [T.body], shade: false })
        }
      },
    }),
}

const SIAM = mat('#f6ead3', '#e2cfae', '#fffaf0', '#b9a17c')
const SIAM_PT = mat('#6b4a3c', '#4f352c', '#8a6452', '#3a2828')
SPECIES.siamese = {
  draw: (r) =>
    quad(r, {
      body: SIAM,
      light: mat('#fffaf0', '#efe3cc'),
      paw: SIAM_PT,
      ears: 'point',
      ear: SIAM_PT,
      earIn: '#b48878',
      snout: 'cat',
      nose: '#4a2f2a',
      iris: '#5aa8f0',
      tail: 'catUp',
      tailMat: SIAM_PT,
      mask: SIAM_PT,
      bodyRX: 7,
      bodyRY: 4.6,
      headRX: 7.8,
      headRY: 6.6,
      legW: 3,
    }),
}

const KORAT = mat('#9aa8c0', '#7886a3', '#c9d3e6', '#56607e')
SPECIES.korat = {
  draw: (r) =>
    quad(r, {
      body: KORAT,
      light: mat('#b9c4d9', '#9aa8c0'),
      ears: 'point',
      ear: KORAT,
      earIn: '#d9a9b8',
      snout: 'cat',
      nose: '#6b5a78',
      iris: '#6ccf5a',
      tail: 'catUp',
      bodyRX: 7,
      bodyRY: 4.6,
      headRX: 8,
      headRY: 6.6,
      legW: 3,
    }),
}

// --- Elephants -------------------------------------------------------------

interface EleLook {
  skin: Mat
  ear: Mat
  earIn: string
  toe: string
  royal?: boolean
}

const GOLD = mat(P.gold, P.goldD, P.goldL, P.goldDD)
const ROYAL_RED = mat('#d8434f', '#a82f40', '#f07a7a', '#7e2436')

function elephant(r: Rig, e: EleLook) {
  const p = r.p
  const f = r.f
  const sk = e.skin
  const far = mat(sk.s, sk.d, sk.b)
  const legH = 5.5
  const lw = 4.6
  const up = r.happy
  const flap = r.br || r.walk === 1 || r.walk === 3 ? 0.8 : 0
  p.oy = r.bob
  const legBot = r.air ? -1.5 : 0
  const toes = (x0: number, x1: number, bot: number) => {
    if (!r.hd) return
    const y = Math.round(p.Y(bot)) - 1
    for (let x = Math.round(p.X(x0)) + 1; x < Math.round(p.X(x1)) - 1; x += 2) p.pxOn(x, y, e.toe)
  }
  const sleep = r.sleep
  if (f === 'side') {
    const bcx = -3.5
    const bcy = sleep ? -5.5 : -legH - 4.5
    const brx = 9.5
    const bry = sleep ? 5.5 : 6.5
    const hcx = sleep ? 5.5 : 5.5
    const hcy = sleep ? -8.5 : -18 + (r.br ? 1 / p.k : 0)
    // tail
    if (!sleep) {
      p.fill(p.tube([[bcx - brx + 1, bcy - 1, 0.9], [bcx - brx - 1.5, bcy + 2 + r.wag * 0.5, 0.8], [bcx - brx - 2 + r.wag, bcy + 4.5, 0.7]]), sk)
      p.fill(p.circ(bcx - brx - 2 + r.wag, bcy + 5.5, 1.2), mat(sk.d))
    }
    const sw = r.walk < 0 ? 0 : [1.5, 0, -1.5, 0][r.walk]
    if (!sleep) {
      p.fill(p.leg(2 - sw, -legH - 3, 2 - sw + lw - 0.5, legBot), far, { line: far.d })
      p.fill(p.leg(-9 + sw, -legH - 3, -9 + sw + lw - 0.5, legBot), far, { line: far.d })
    }
    p.fill(p.ell(bcx, bcy, brx, bry), sk, { hl: p.ell(bcx - 2, bcy - bry * 0.55, brx * 0.5, bry * 0.25) })
    if (e.royal) royalBlanket(r, bcx, bcy, brx, bry)
    if (!sleep) {
      const l1 = r.walk === 1 ? -1.5 : 0
      const l2 = r.walk === 3 ? -1.5 : 0
      p.fill(p.leg(0 + sw, -legH - 2, 0 + sw + lw, legBot + l1), sk)
      p.fill(p.leg(-11 - sw, -legH - 2, -11 - sw + lw, legBot + l2), sk)
      toes(0 + sw, 0 + sw + lw, legBot + l1)
      toes(-11 - sw, -11 - sw + lw, legBot + l2)
      if (e.royal && r.hd) {
        p.fill(p.rect(0 + sw, legBot + l1 - 3, 0 + sw + lw, legBot + l1 - 2), GOLD.b, { clip: [T.body], line: null })
        p.fill(p.rect(-11 - sw, legBot + l2 - 3, -11 - sw + lw, legBot + l2 - 2), GOLD.b, { clip: [T.body], line: null })
      }
    } else {
      p.fill(p.ell(-9, -1.3, 3, 1.5), sk)
    }
    setHead(r, hcx, hcy, 7.5, 7)
    p.fill(p.ell(hcx, hcy, 7.5, 7), sk, { tag: T.head, hl: p.ell(hcx - 1, hcy - 4, 3.5, 1.8) })
    // trunk
    const tx = hcx + 5.5
    const ty = hcy + 2
    const trunk: [number, number, number][] = sleep
      ? [[tx, ty, 2.5], [tx + 2.5, ty + 3, 2.1], [tx + 3.8, -1.8, 1.7], [tx + 5.8, -2, 1.4], [tx + 6.6, -3.6, 1.2]]
      : up
        ? [[tx, ty - 1, 2.5], [tx + 3.5, ty - 3.5, 2.1], [tx + 4.5, ty - 7.5, 1.7], [tx + 3.5, ty - 10.5, 1.4], [tx + 1.5, ty - 11, 1.2]]
        : [[tx, ty, 2.5], [tx + 3, ty + 3.5, 2.1], [tx + 3.8 + r.br * 0.5, ty + 7.5, 1.7], [tx + 5.5 + r.br * 0.5, ty + 8.5, 1.4], [tx + 6.5, ty + 7, 1.2]]
    p.fill(p.tube(trunk), sk, { tag: T.head })
    if (r.hd) trunkRings(r, trunk, sk)
    if (e.royal) royalHead(r, hcx, hcy, true)
    // ear (flaps)
    p.fill(p.ell(hcx - 3 - flap * 0.5, hcy + 0.5, 4.8 + flap, 6), e.ear, { tag: T.head, hl: p.ell(hcx - 4.5, hcy - 3, 2, 1.5) })
    p.fill(p.ell(hcx - 3 - flap * 0.5, hcy + 1, 2.8 + flap * 0.6, 4), e.earIn, { line: null, clip: [T.head] })
    eye(r, hcx + 3.2, hcy - 1)
    blush1(r, hcx + 4, hcy + 2.2)
    if (r.mouth === 'open' && !sleep) mouthSide(r, hcx + 5.5, hcy + 5)
  } else {
    const bcy = sleep ? -5.5 : -legH - 4
    const brx = 8.5
    const bry = sleep ? 5.5 : 6
    const hcy = sleep ? -12 : -18.5 + (r.br ? 1 / p.k : 0)
    const back = f === 'up'
    const l1 = r.walk === 1 ? -1.5 : 0
    const l2 = r.walk === 3 ? -1.5 : 0
    if (!sleep) {
      // outer (back) legs
      p.fill(p.leg(-brx + 0.5, -legH - 2, -brx + lw, legBot + l2 - (back ? 0 : 1)), back ? sk : far, { line: back ? sk.d : far.d })
      p.fill(p.leg(brx - lw, -legH - 2, brx - 0.5, legBot + l1 - (back ? 0 : 1)), back ? sk : far, { line: back ? sk.d : far.d })
    }
    p.fill(p.ell(0, bcy, brx, bry), sk, { hl: p.ell(-2, bcy - bry * 0.5, brx * 0.45, bry * 0.3) })
    if (e.royal) royalBlanket(r, 0, bcy, brx, bry)
    if (back) {
      p.fill(p.tube([[0, bcy + 1, 0.9], [r.wag * 0.6, bcy + 3.5, 0.8]]), sk)
      p.fill(p.circ(r.wag * 0.6, bcy + 4.5, 1.2), mat(sk.d))
    }
    if (!sleep && !back) {
      p.fill(p.leg(-5, -legH - 1, -5 + lw, legBot + l1), sk)
      p.fill(p.leg(5 - lw, -legH - 1, 5, legBot + l2), sk)
      toes(-5, -5 + lw, legBot + l1)
      toes(5 - lw, 5, legBot + l2)
    }
    if (sleep && !back) {
      p.fill(p.ell(-4.5, -1.4, 2.8, 1.6), sk)
      p.fill(p.ell(4.5, -1.4, 2.8, 1.6), sk)
    }
    // ears behind the head
    for (const s of [-1, 1]) {
      p.fill(p.ell(s * (8.5 + flap), hcy + 0.5, 5.3 + flap * 0.6, 6.3), e.ear, { tag: T.head })
      if (!back) p.fill(p.ell(s * (8.8 + flap), hcy + 1, 3.3 + flap * 0.4, 4.3), e.earIn, { line: null, clip: [T.head] })
    }
    setHead(r, 0, hcy, 7.8, 7)
    p.fill(p.ell(0, hcy, 7.8, 7), sk, { tag: T.head, hl: p.ell(-2.5, hcy - 4, 3.5, 1.8) })
    if (e.royal) royalHead(r, 0, hcy, false)
    if (!back) {
      const ty = hcy + 3
      const trunk: [number, number, number][] = sleep
        ? [[0, ty, 2.4], [0, ty + 4, 2], [1, -1.5, 1.6], [3.5, -1.6, 1.3], [4.3, -3.2, 1.1]]
        : up
          ? [[0, ty, 2.4], [0.5, ty - 3, 2], [2.5, ty - 7, 1.6], [4.5, ty - 9, 1.3], [5.8, ty - 8, 1.1]]
          : [[0, ty, 2.4], [0, ty + 3.5, 2.1], [0.3, ty + 7, 1.7], [2, ty + 8.8, 1.3], [3.4, ty + 7.8, 1.1]]
      p.fill(p.tube(trunk), sk, { tag: T.head })
      if (r.hd) trunkRings(r, trunk, sk)
      eyes2(r, 4, hcy - 0.5)
      blush2(r, 5.3, hcy + 2.5)
    }
  }
  if (r.happy && r.air) heart(r, f === 'side' ? 14 : 11, r.hy - r.hry - 1)
  p.oy = 0
}

function trunkRings(r: Rig, pts: [number, number, number][], sk: Mat) {
  const p = r.p
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const a = pts[i - 1]
    const b = pts[i + 1]
    // perpendicular short line across the trunk
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    for (const t of [-0.6, 0, 0.6]) {
      const px = Math.floor(p.X(x + nx * t * pts[i][2]))
      const py = Math.floor(p.Y(y + ny * t * pts[i][2]))
      if (p.tagAt(px, py) === T.head) p.pxOn(px, py, sk.s)
    }
  }
}

function royalBlanket(r: Rig, bcx: number, bcy: number, brx: number, bry: number) {
  const p = r.p
  if (r.f === 'down') {
    // just the fringe peeking at the sides
    p.fill(p.rect(bcx - brx, bcy - 2, bcx - brx + 2, bcy + 1.5), ROYAL_RED, { clip: [T.body], line: null, shade: false })
    p.fill(p.rect(bcx + brx - 2, bcy - 2, bcx + brx, bcy + 1.5), ROYAL_RED, { clip: [T.body], line: null, shade: false })
    return
  }
  const cloth = r.f === 'side' ? p.rect(bcx - 5, bcy - bry - 1, bcx + 4, bcy + 2) : p.rect(bcx - 5.5, bcy - bry - 1, bcx + 5.5, bcy + 2.5)
  p.fill(cloth, ROYAL_RED, { clip: [T.body], line: ROYAL_RED.d, tag: T.deco })
  // gold hem & diamonds
  const hemY = Math.round(p.Y(r.f === 'side' ? bcy + 2 : bcy + 2.5)) - 1
  for (let x = 0; x < p.W; x++) if (p.tagAt(x, hemY) === T.deco) p.px(x, hemY, (x & 1) || !r.hd ? GOLD.b : GOLD.d, T.deco)
  if (r.hd) {
    const cy = Math.round(p.Y(bcy - 1.5))
    const cx = Math.round(p.X(bcx - 0.5))
    p.stamp(cx - 1, cy - 1, ['.g.', 'gGg', '.g.'], { g: GOLD.b, G: '#fff3a6' }, false, T.deco)
  }
}

function royalHead(r: Rig, hcx: number, hcy: number, side: boolean) {
  const p = r.p
  if (r.f === 'up') {
    p.fill(p.rect(-5, hcy - 6.5, 5, hcy - 5), GOLD, { clip: [T.head], line: null })
    return
  }
  // gold headdress (ตาข่ายทอง) over the brow with a red jewel
  if (side) {
    p.fill(p.ell(hcx + 0.5, hcy - 6, 4.5, 2.4), GOLD, { tag: T.deco, line: GOLD.d })
    const gx = Math.round(p.X(hcx + 1))
    const gy = Math.round(p.Y(hcy - 6))
    p.px(gx, gy, ROYAL_RED.b, T.deco)
    if (r.hd) p.px(gx - 1, gy, ROYAL_RED.l, T.deco)
  } else {
    p.fill(p.poly([[-5, hcy - 5], [0, hcy - 9], [5, hcy - 5], [3.5, hcy - 3.5], [0, hcy - 5.5], [-3.5, hcy - 3.5]]), GOLD, { tag: T.deco, line: GOLD.d })
    const c = p.W / 2
    const gy = Math.round(p.Y(hcy - 6.3))
    p.px(c - 1, gy, ROYAL_RED.b, T.deco)
    p.px(c, gy, ROYAL_RED.b, T.deco)
    if (r.hd) {
      p.px(c - 1, gy - 1, ROYAL_RED.l, T.deco)
      p.px(c, gy - 1, ROYAL_RED.b, T.deco)
    }
  }
}

const ELE = mat('#aab0c4', '#8a8fa8', '#d3d8e6', '#62667e')
SPECIES.elephant = {
  draw: (r) => elephant(r, { skin: ELE, ear: mat('#a2a8bd', '#858aa3', '#c9cfe0', '#5f647c'), earIn: '#f0b8c4', toe: '#e8ecf5' }),
}
const WELE = mat('#fbf1ee', '#e9d6d4', '#ffffff', '#b8a0a4')
SPECIES.whiteelephant = {
  draw: (r) => elephant(r, { skin: WELE, ear: mat('#f7e8e6', '#e5cfcf', '#ffffff', '#b89ea4'), earIn: '#ffc9d3', toe: '#ffffff', royal: true }),
}

// --- Water buffalo -----------------------------------------------------------

const BUF = mat('#77728a', '#5c586f', '#9a96ab', '#403d52')
const HORN = mat('#efe4cf', '#c9b898', '#fffaf0', '#8f7f66')
SPECIES.buffalo = {
  draw: (r) =>
    quad(r, {
      body: BUF,
      light: mat('#8c879d', '#77728a'),
      ears: 'none',
      ear: BUF,
      snout: 'dog',
      mask: mat('#c8b3bb', '#a8939e', '#e3d2d8'),
      nose: '#5a3d4f',
      tail: 'tuft',
      tailMat: BUF,
      bodyRX: 8.5,
      bodyRY: 5.5,
      headRX: 7.8,
      headRY: 6.6,
      legW: 3.8,
      legH: 5.5,
      afterHead: (r) => {
        const p = r.p
        const { hx, hy, hrx, hry } = r
        const top = hy - hry
        if (r.f === 'side') {
          // ear sticks out sideways, horn sweeps back
          p.fill(p.ell(hx - 3.5, hy - 1, 2.6, 1.6), BUF, { tag: T.head })
          p.fill(p.tube([[hx + 1, top + 2, 1.8], [hx - 1.5, top - 0.5, 1.6], [hx - 3.5, top - 2.5, 1.3], [hx - 3.8, top - 5, 1], [hx - 2, top - 7, 0.7]]), HORN, { tag: T.deco })
        } else {
          for (const s of [-1, 1]) {
            p.fill(p.ell(s * (hrx + 0.5), hy, 2.5, 1.6), BUF, { tag: T.head })
            p.fill(
              p.tube([[s * 2.5, top + 2, 1.7], [s * 6, top + 0.5, 1.6], [s * 9.5, top - 0.5, 1.3], [s * 10.5, top - 3.5, 1], [s * 8.5, top - 6, 0.7]]),
              HORN,
              { tag: T.deco },
            )
          }
          if (r.f === 'down' && r.hd) {
            // pale chevron on the throat
            const y = Math.round(p.Y(hy + hry + 1))
            const c = p.W / 2
            for (let i = 0; i < 4; i++) {
              p.pxOn(c - 1 - i, y + i - 1, '#d5cbd6')
              p.pxOn(c + i, y + i - 1, '#d5cbd6')
            }
          }
        }
      },
    }),
}

// --- Turtle -----------------------------------------------------------------

const SHELL = mat('#6fbf6a', '#4d9a55', '#a6e08a', '#2f6f4b')
const SHELL_RIM = mat('#e8cf7a', '#c9a954', '#fff0b0', '#8a7236')
const TSKIN = mat('#b8dc8a', '#8fbd66', '#dcf2b8', '#5e8a45')

function scutes(r: Rig, cx: number, cy: number, rx: number, ry: number) {
  const p = r.p
  if (!r.hd) {
    const x = Math.round(p.X(cx))
    const y = Math.round(p.Y(cy))
    p.pxOn(x - 1, y - 1, SHELL.l)
    p.pxOn(x, y - 1, SHELL.l)
    return
  }
  // hexagon plates: centre plate + ring, drawn as darker seams
  const X = p.X(cx)
  const Y = p.Y(cy)
  const RX = p.S(rx)
  const RY = p.S(ry)
  for (let y = Math.floor(Y - RY); y <= Y + RY; y++)
    for (let x = Math.floor(X - RX); x <= X + RX; x++) {
      if (p.tagAt(x, y) !== T.deco) continue
      const u = (x + 0.5 - X) / RX
      const v = (y + 0.5 - Y) / RY
      const d = Math.max(Math.abs(u) * 0.9 + Math.abs(v) * 0.5, Math.abs(v))
      const seam = Math.abs(d - 0.45) < 0.08 || (d > 0.45 && Math.abs(u) < 0.06) || (d > 0.45 && Math.abs(Math.abs(u) - 0.62) < 0.06 && v < 0.2)
      if (seam) p.px(x, y, SHELL.d, T.deco)
      else if (d < 0.3 && v < 0) p.px(x, y, SHELL.l, T.deco)
    }
}

SPECIES.turtle = {
  icon: 'side',
  draw: (r) => {
    const p = r.p
    const f = r.f
    p.oy = r.bob
    const sleep = r.sleep
    const step = r.walk < 0 ? 0 : [1, 0, -1, 0][r.walk]
    const legBot = r.air ? -1 : 0
    if (f === 'side') {
      const hx = sleep ? 7 : r.happy ? 9.5 : 9 + (r.br ? 0.5 : 0)
      const hy = sleep ? -4 : r.happy ? -9.5 : -7.5
      // tail + legs
      p.fill(p.poly([[-8, -3.5], [-11.5, -2], [-8, -1.8]]), TSKIN)
      p.fill(p.leg(3 - step, -4, 5.8 - step, legBot), mat(TSKIN.s, TSKIN.d, TSKIN.b))
      p.fill(p.leg(-6 + step, -4, -3.2 + step, legBot), mat(TSKIN.s, TSKIN.d, TSKIN.b))
      // neck + head
      if (!sleep) p.fill(p.tube([[4, -5, 2.2], [hx - 2, hy + 0.5, 2.2]]), TSKIN)
      setHead(r, hx, hy, 4.6, 4)
      p.fill(p.ell(hx, hy, 4.6, 4), TSKIN, { tag: T.head, hl: p.ell(hx - 0.5, hy - 2.5, 2, 1) })
      // shell
      p.fill(p.ell(-1, -4.5, 8.2, 3.2), SHELL_RIM, { tag: T.deco })
      p.fill(inter(p.ell(-1, -6, 7.6, 7), p.rect(-10, -14, 8, -4)), SHELL, { tag: T.deco, hl: p.ell(-2.5, -11, 3, 1.2) })
      scutes(r, -1, -6.5, 6.5, 6)
      p.fill(p.leg(-8.5 - step, -3.5, -5.7 - step, legBot), TSKIN)
      p.fill(p.leg(1.2 + step, -3.5, 4 + step, legBot), TSKIN)
      eye(r, hx + 1.8, hy - 0.5)
      blush1(r, hx + 2.2, hy + 1.6)
      if (r.mouth === 'open') mouthSide(r, hx + 3.6, hy + 1.8)
    } else {
      const back = f === 'up'
      const hy = sleep ? -3.8 : r.happy ? -6 : -4.8 + (r.br ? 0.5 : 0)
      if (!back) {
        p.fill(p.leg(-9.5 + step, -4, -6.5 + step, legBot), TSKIN)
        p.fill(p.leg(6.5 - step, -4, 9.5 - step, legBot), TSKIN)
      } else {
        p.fill(p.leg(-7.5, -3, -4.8, legBot + (r.walk === 1 ? -1 : 0)), TSKIN)
        p.fill(p.leg(4.8, -3, 7.5, legBot + (r.walk === 3 ? -1 : 0)), TSKIN)
      }
      p.fill(p.ell(0, -4.3, 8.8, 3.2), SHELL_RIM, { tag: T.deco })
      p.fill(inter(p.ell(0, -6, 8.2, 7.2), p.rect(-10, -14, 10, -4)), SHELL, { tag: T.deco, hl: p.ell(-2.5, -11, 3, 1.2) })
      scutes(r, 0, -7, 7, 6.2)
      if (back) {
        p.fill(p.poly([[-1, -3], [0, -0.8], [1, -3]]), TSKIN)
        setHead(r, 0, -12, 4, 4)
      } else {
        setHead(r, 0, hy, 5.4, 4.6)
        p.fill(p.ell(0, hy, 5.4, 4.6), TSKIN, { tag: T.head, hl: p.ell(-1.5, hy - 2.8, 2.2, 1) })
        eyes2(r, 2.6, hy - 0.5)
        blush2(r, 3.8, hy + 1.6)
        snoutFront(r, hy + 1.3, TSKIN.d, 'none')
      }
    }
    if (r.happy && r.air) heart(r, f === 'side' ? 13 : 9, -16)
    p.oy = 0
  },
}

// --- Jade rabbit --------------------------------------------------------------

const JADE = mat('#bdeed7', '#8fd4b5', '#e8fbf1', '#4f9f82')
const JADE_D = mat('#5fc49a', '#3f9c78', '#9fe3c3', '#2c6f58')
const RAB_IN = '#ffc9d6'

SPECIES.jaderabbit = {
  draw: (r) => {
    const p = r.p
    const f = r.f
    const sleep = r.sleep
    // walk = hop cycle
    const hop = r.walk < 0 ? 0 : [0, -2, -3, -1][r.walk]
    p.oy = r.walk >= 0 ? Math.round(hop * (r.hd ? 1 : 0.5)) : r.bob
    const ear = (x0: number, y0: number, x1: number, y1: number, inner: boolean, flat = false) => {
      const pts: [number, number, number][] = flat
        ? [[x0, y0, 1.8], [x1, y1, 1.7], [x1 - 3, y1 + 0.5, 1.2]]
        : [[x0, y0, 1.9], [(x0 + x1) / 2, (y0 + y1) / 2, 2.1], [x1, y1, 1.6]]
      p.fill(p.tube(pts), JADE, { tag: T.head, sd: [1, 1] })
      if (inner && !flat) p.fill(p.tube([[x0, y0 - 1, 0.8], [(x0 + x1) / 2, (y0 + y1) / 2, 1], [x1, y1 + 1, 0.6]]), RAB_IN, { line: null, clip: [T.head] })
    }
    const stretched = r.walk === 2 || r.air
    if (f === 'side') {
      const hx = sleep ? 5 : 4
      const hy = sleep ? -7 : -15.5 + (r.br ? 1 / p.k : 0)
      // tail puff
      p.fill(p.circ(-8.5, sleep ? -5 : -7, 2.4), mat('#ffffff', '#e1efe8'))
      p.fill(p.ell(-2, sleep ? -5 : -7, sleep ? 8 : 7, sleep ? 5 : 6.2), JADE, { hl: p.ell(-3.5, sleep ? -8 : -11, 3, 1.3) })
      p.fill(p.ell(-0.5, sleep ? -3 : -4.5, 4.5, 3), mat('#f4fffa', '#dcefe6'), { line: null, clip: [T.body], shade: false })
      // jade markings on the haunch
      if (r.hd) p.fill(p.ell(-4.5, sleep ? -6.5 : -8.5, 2.3, 1.8), JADE_D, { line: null, clip: [T.body] })
      // feet
      p.fill(p.ell(stretched ? -5 : -3.5, -1.3, 4, 1.4), JADE)
      if (!sleep) p.fill(p.ell(stretched ? 5 : 3.5, -1.2, 1.8, 1.2), JADE)
      // ears
      if (sleep) ear(hx - 2, hy - 3, hx - 7, hy - 3.5, false, true)
      else {
        const lean = r.happy ? 1.5 : r.walk >= 0 ? -1 : 0
        ear(hx - 3.2, hy - 3.5, hx - 5 + lean, hy - 13, false)
      }
      setHead(r, hx, hy, 6, 5.3)
      p.fill(p.ell(hx, hy, 6, 5.3), JADE, { tag: T.head, hl: p.ell(hx - 1, hy - 3, 2.5, 1.2) })
      if (!sleep) {
        const lean = r.happy ? 1.5 : r.walk >= 0 ? -1 : 0
        ear(hx - 1.2, hy - 3.8, hx - 2.2 + lean, hy - 13.5, true)
      }
      p.fill(p.ell(hx + 3.8, hy + 1.5, 2.3, 1.8), mat('#f4fffa', '#dcefe6'), { line: null, clip: [T.head], shade: false })
      noseSide(r, hx + 5.8, hy + 0.8, '#ff8fa3', true)
      eye(r, hx + 2.2, hy - 0.8, '#3f9c78')
      blush1(r, hx + 2.6, hy + 2)
      if (r.hd) moonMark(r, hx - 1, hy - 3.8)
    } else {
      const back = f === 'up'
      const hy = sleep ? -8.5 : -15.5 + (r.br ? 1 / p.k : 0)
      p.fill(p.ell(-3.5, -1.3, 3, 1.5), JADE)
      p.fill(p.ell(3.5, -1.3, 3, 1.5), JADE)
      p.fill(p.ell(0, sleep ? -5 : -6.5, sleep ? 7.5 : 6.5, sleep ? 4.8 : 6), JADE, { hl: p.ell(-2, sleep ? -8 : -10.5, 2.5, 1.2) })
      if (!back) p.fill(p.ell(0, sleep ? -4 : -5.5, 3.8, 3.8), mat('#f4fffa', '#dcefe6'), { line: null, clip: [T.body], shade: false })
      if (back) p.fill(p.circ(0, sleep ? -3.5 : -4.5, 2.4), mat('#ffffff', '#e1efe8'))
      if (!back && !sleep) {
        p.fill(p.ell(-2.2, -4.5, 1.5, 1.4), JADE)
        p.fill(p.ell(2.2, -4.5, 1.5, 1.4), JADE)
      }
      const spread = r.happy ? 1.5 : 0
      if (sleep) {
        ear(-2.5, hy - 3.5, -7.5, hy - 1, false, true)
        ear(2.5, hy - 3.5, 7.5, hy - 1, false, true)
      } else {
        ear(-2.4, hy - 3.8, -3.8 - spread, hy - 13, !back)
        ear(2.4, hy - 3.8, 3.8 + spread, hy - 13, !back)
      }
      setHead(r, 0, hy, 6.3, 5.3)
      p.fill(p.ell(0, hy, 6.3, 5.3), JADE, { tag: T.head, hl: p.ell(-2, hy - 3, 2.5, 1.2) })
      if (!back) {
        p.fill(p.ell(0, hy + 2, 2.8, 1.8), mat('#f4fffa', '#dcefe6'), { line: null, clip: [T.head], shade: false })
        eyes2(r, 3, hy - 0.5, '#3f9c78')
        blush2(r, 4.2, hy + 1.8)
        snoutFront(r, hy + 1.2, '#ff8fa3', 'cat')
        if (r.hd) moonMark(r, 0, hy - 3.5)
      }
    }
    if (r.happy && r.air) heart(r, f === 'side' ? 12 : 10, -28)
    p.oy = 0
  },
}

/** Little gold crescent moon on the jade rabbit's forehead. */
function moonMark(r: Rig, x: number, y: number) {
  const p = r.p
  const cx = x === 0 ? p.W / 2 - 1 : Math.round(p.X(x))
  const cy = Math.round(p.Y(y))
  p.stamp(cx, cy - 1, ['g.', '.g', 'g.'].map((s) => s), { g: P.goldD })
  p.px(cx + 1, cy - 1, P.gold)
}

// --- Monkey -------------------------------------------------------------------

const MONK = mat('#a8754c', '#845634', '#c9966a', '#553522')
const PEACH = mat('#f6d2ae', '#e6b78e', '#fff0de', '#b88660')

SPECIES.monkey = {
  draw: (r) => {
    const p = r.p
    const f = r.f
    const sleep = r.sleep
    p.oy = r.bob
    const swing = r.walk < 0 ? 0 : [1.5, 0, -1.5, 0][r.walk]
    const armUp = r.happy
    if (f === 'side') {
      const hx = sleep ? 4.5 : 3.5
      const hy = sleep ? -8 : -16 + (r.br ? 1 / p.k : 0)
      p.fill(p.tube([[-4, -4, 1.2], [-9, -5, 1.1], [-11 + r.wag * 0.5, -10, 1.1], [-9 + r.wag * 0.5, -13.5, 1], [-6.5 + r.wag * 0.5, -12.5, 0.9]]), MONK)
      if (!sleep) {
        p.fill(p.tube([[-1, -5, 1.6], [0 - swing, -2, 1.5], [1 - swing, -0.8, 1.3]]), mat(MONK.s, MONK.d, MONK.b))
        p.fill(p.tube([[3, -10, 1.3], [armUp ? 5 : 3 - swing, armUp ? -17 : -6, 1.2]]), mat(MONK.s, MONK.d, MONK.b))
      }
      p.fill(p.ell(-0.5, sleep ? -4.8 : -6.5, sleep ? 6.5 : 5.2, sleep ? 4.5 : 5.8), MONK, { hl: p.ell(-2, sleep ? -8 : -10.5, 2.3, 1.2) })
      p.fill(p.ell(1.5, sleep ? -3.5 : -5.5, 3, 3.5), PEACH, { line: null, clip: [T.body], shade: false })
      if (!sleep) {
        p.fill(p.tube([[-1.5, -4.5, 1.8], [1 + swing, -2, 1.6], [2.5 + swing, -0.8, 1.3]]), MONK)
        p.fill(p.ell(3 + swing, -0.9, 1.8, 1), PEACH)
      }
      p.fill(p.circ(hx - 4.5, hy + 0.5, 2.6), MONK)
      p.fill(p.circ(hx - 4.5, hy + 0.5, 1.4), PEACH, { line: null, clip: [T.body] })
      setHead(r, hx, hy, 6.3, 5.8)
      p.fill(p.ell(hx, hy, 6.3, 5.8), MONK, { tag: T.head, hl: p.ell(hx - 2, hy - 3.8, 2.5, 1) })
      p.fill(union(p.ell(hx + 2.5, hy - 0.5, 3.4, 3.4), p.ell(hx + 3.5, hy + 2.5, 3, 2.3)), PEACH, { line: null, clip: [T.head], shade: false })
      // tuft
      p.fill(p.tube([[hx - 1, hy - 5.3, 1], [hx + 0.5, hy - 7, 0.8]]), MONK)
      if (!sleep) p.fill(p.tube([[3, -10, 1.3], [armUp ? 7 : 4.5 + swing, armUp ? -17.5 : -5.5, 1.2]]), MONK)
      if (!sleep) p.fill(p.circ(armUp ? 7 : 4.5 + swing, armUp ? -18 : -5, 1.3), PEACH)
      eye(r, hx + 3, hy - 0.8)
      blush1(r, hx + 3.7, hy + 1.6)
      if (r.mouth === 'open') mouthSide(r, hx + 5.5, hy + 3)
      else {
        const mx = Math.round(p.X(hx + 5))
        const my = Math.round(p.Y(hy + 3))
        if (r.hd) p.px(mx - 1, my, MOUTH)
      }
    } else {
      const back = f === 'up'
      const hy = sleep ? -9 : -16 + (r.br ? 1 / p.k : 0)
      // tail
      const tw = r.wag * 0.6
      if (back) p.fill(p.tube([[0, -3, 1.2], [3 + tw, -6, 1.1], [4 + tw, -11, 1.1], [1.5 + tw, -13.5, 1], [0 + tw, -11.5, 0.9]]), MONK)
      else p.fill(p.tube([[3, -3, 1.2], [8 + tw, -4, 1.1], [10 + tw, -9, 1.1], [8 + tw, -12, 1], [6 + tw, -10.5, 0.9]]), MONK)
      const l1 = r.walk === 1 ? -1.5 : 0
      const l2 = r.walk === 3 ? -1.5 : 0
      p.fill(p.ell(-3.2, -1.1 + l1, 2.2, 1.3), PEACH)
      p.fill(p.ell(3.2, -1.1 + l2, 2.2, 1.3), PEACH)
      p.fill(p.ell(0, sleep ? -5 : -6.5, sleep ? 6.5 : 5.5, sleep ? 4.6 : 5.6), MONK, { hl: p.ell(-2, sleep ? -8 : -10.5, 2.3, 1.2) })
      if (!back) p.fill(p.ell(0, sleep ? -4 : -5.5, 3.2, 3.6), PEACH, { line: null, clip: [T.body], shade: false })
      // arms
      for (const s of [-1, 1]) {
        if (sleep) continue
        const sw = s * swing
        const end: [number, number] = armUp ? [s * 8, -18] : [s * 5.5, -4.5 + sw]
        p.fill(p.tube([[s * 4, -10, 1.3], end.concat(1.2) as [number, number, number]]), MONK)
        p.fill(p.circ(end[0], end[1] - (armUp ? 0.5 : 0), 1.3), PEACH)
      }
      for (const s of [-1, 1]) {
        p.fill(p.circ(s * 6.8, hy + 0.5, 2.6), MONK)
        if (!back) p.fill(p.circ(s * 6.8, hy + 0.5, 1.4), PEACH, { line: null, clip: [T.body] })
      }
      setHead(r, 0, hy, 6.8, 5.8)
      p.fill(p.ell(0, hy, 6.8, 5.8), MONK, { tag: T.head, hl: p.ell(-2.5, hy - 3.8, 2.5, 1) })
      p.fill(p.tube([[0, hy - 5.3, 1], [1.5, hy - 7, 0.8]]), MONK)
      if (!back) {
        p.fill(union(p.ell(-2.4, hy - 0.3, 2.8, 3), p.ell(2.4, hy - 0.3, 2.8, 3), p.ell(0, hy + 2.5, 3.8, 2.4)), PEACH, { line: null, clip: [T.head], shade: false })
        eyes2(r, 2.4, hy - 0.5)
        blush2(r, 4, hy + 1.8)
        snoutFront(r, hy + 1.8, PEACH.d, 'cat')
      }
    }
    if (r.happy && r.air) heart(r, f === 'side' ? 12 : 10, r.hy - r.hry - 2)
    p.oy = 0
  },
}

// --- Flying helpers -----------------------------------------------------------

/** Lift a flying pet off the ground with a gentle bob (native px offset). */
function hover(r: Rig, lift: number) {
  const p = r.p
  let b = 0
  if (r.a === 'idle') b = -r.br
  else if (r.walk >= 0) b = -(r.hd ? [0, 1, 2, 1] : [0, 0, 1, 1])[r.walk]
  else if (r.air) b = -(r.hd ? 4 : 2)
  p.oy = -Math.round(p.S(r.sleep ? lift * 0.4 : lift)) + b
}

/** Shimmer: sprinkle light "scale" pixels over base-coloured body pixels. */
function scales(r: Rig, m: Mat, tag: number, phase: number) {
  const p = r.p
  if (!r.hd) return
  for (let y = 0; y < p.H; y++)
    for (let x = 0; x < p.W; x++) {
      if (p.tagAt(x, y) !== tag || p.c[y * p.W + x] !== m.b) continue
      const row = y >> 1
      const on = y % 2 === 0 && (x + (row % 2) * 2 + phase) % 4 === 0
      if (on) p.px(x, y, m.l, tag)
      else if (y % 2 === 1 && (x + (row % 2) * 2 + phase + 2) % 4 === 0) p.px(x, y, m.s, tag)
    }
}

// --- Hornbill -----------------------------------------------------------------

const HB = mat('#4a4058', '#342c40', '#6e6280', '#211a2a')
const HB_W = mat('#fffaf0', '#e4dccf', '#ffffff', '#a89a8c')
const BILL = mat('#ffd54f', '#e9a53a', '#fff3a6', '#b8742a')
const CASQUE = mat('#f7a03a', '#d0661f', '#ffc46a', '#9a4a1e')
const LEGC = '#6e6280'

SPECIES.hornbill = {
  icon: 'side',
  draw: (r) => {
    const p = r.p
    const f = r.f
    const sleep = r.sleep
    const hop = r.walk < 0 ? 0 : [0, -1, 0, -1][r.walk] * (r.hd ? 2 : 1)
    p.oy = r.walk >= 0 ? hop : r.bob
    const wingUp = r.happy
    const legs = (xs: number[]) => {
      if (sleep) return
      for (const x of xs) {
        const lx = Math.round(p.X(x))
        const top = Math.round(p.Y(-4))
        const bot = Math.round(p.Y(r.air ? -1 : 0))
        for (let y = top; y < bot; y++) p.px(lx, y, LEGC, T.body)
        if (r.hd) {
          p.px(lx + 1, bot - 1, LEGC, T.body)
          p.px(lx - 1, bot - 1, LEGC, T.body)
          for (let y = top; y < bot; y++) p.px(lx + 1, y, LEGC, T.body)
        }
      }
    }
    if (f === 'side') {
      const hx = sleep ? 3 : 4.5
      const hy = sleep ? -12 : -17 + (r.br ? 1 / p.k : 0)
      legs([-2, 1])
      // tail (white-tipped)
      p.fill(p.tube([[-5, -8, 2.2], [-9.5, -6.5 + r.wag * 0.4, 2.2], [-12, -5 + r.wag * 0.6, 1.9]]), HB)
      p.fill(p.circ(-12, -5 + r.wag * 0.6, 1.9), HB_W, { clip: [T.body], line: null })
      p.fill(p.ell(-1, sleep ? -6.5 : -9, 6.8, sleep ? 5 : 5.6), HB, { hl: p.ell(-2, sleep ? -10 : -13, 2.6, 1.1) })
      p.fill(p.ell(1.5, sleep ? -4.5 : -6.5, 4, 3.4), HB_W, { line: null, clip: [T.body], shade: false })
      if (wingUp) p.fill(p.poly([[-5, -10], [1, -10], [-2, -18], [-8, -19], [-9, -14]]), HB, { tag: T.wing })
      else p.fill(p.ell(-2.5, sleep ? -7.5 : -9.5, 4.8, 3.3), HB, { tag: T.wing, line: HB.d })
      if (r.hd) {
        // white wing band
        const y = Math.round(p.Y(wingUp ? -16 : sleep ? -6 : -8))
        for (let x = 0; x < p.W; x++) if (p.tagAt(x, y) === T.wing) p.px(x, y, HB_W.s, T.wing)
      }
      // neck (pale yellow)
      setHead(r, hx, hy, 4.8, 4.4)
      p.fill(p.ell(hx, hy, 4.8, 4.4), HB, { tag: T.head, hl: p.ell(hx - 1, hy - 2.8, 2, 0.9) })
      p.fill(p.ell(hx - 0.5, hy + 3.5, 3, 1.6), mat('#fff0b0', '#f0d880'), { line: null, clip: [T.head, T.body], shade: false })
      // bill + casque
      const bx = hx + 3
      p.fill(p.poly([[bx, hy - 2], [bx + 9, hy + 1.2], [bx + 8.5, hy + 2.4], [bx + 0.5, hy + 2]]), BILL, { tag: T.deco })
      p.fill(p.poly([[bx - 1.5, hy - 3.5], [bx + 5.5, hy - 1.8], [bx + 5, hy - 0.2], [bx, hy - 1]]), CASQUE, { tag: T.deco })
      eye(r, hx + 1.3, hy - 0.5, '#e8514a')
    } else {
      const back = f === 'up'
      const hy = sleep ? -12.5 : -17 + (r.br ? 1 / p.k : 0)
      legs([-2, 1.5])
      if (back) {
        p.fill(p.tube([[0, -6, 2.4], [r.wag * 0.5, -2.5, 2.4]]), HB)
        p.fill(p.circ(r.wag * 0.5, -2, 2.2), HB_W, { clip: [T.body], line: null })
      }
      for (const s of [-1, 1]) {
        if (wingUp) p.fill(p.poly([[s * 4, -11], [s * 11, -17], [s * 12, -13], [s * 6, -7]]), HB, { tag: T.wing })
      }
      p.fill(p.ell(0, sleep ? -6.5 : -9, 6.3, sleep ? 5 : 5.6), HB, { hl: p.ell(-2, sleep ? -10 : -13, 2.4, 1.1) })
      if (!back) p.fill(p.ell(0, sleep ? -4.5 : -6.5, 3.8, 3.4), HB_W, { line: null, clip: [T.body], shade: false })
      if (!wingUp)
        for (const s of [-1, 1]) p.fill(p.ell(s * 5.2, sleep ? -6.5 : -9, 2.3, 4), HB, { tag: T.wing, line: HB.d })
      setHead(r, 0, hy, 5, 4.5)
      p.fill(p.ell(0, hy, 5, 4.5), HB, { tag: T.head, hl: p.ell(-1.5, hy - 2.8, 2, 0.9) })
      if (!back) {
        eyes2(r, 2.6, hy - 0.8, '#e8514a')
        // head turned a little: the big bill + casque sweep out to one side
        p.fill(p.poly([[-0.5, hy + 0.3], [9, hy + 3.3], [8.5, hy + 4.5], [0, hy + 3]]), BILL, { tag: T.deco })
        p.fill(p.poly([[-0.5, hy - 1.2], [6, hy + 1.1], [5.6, hy + 2.3], [0, hy + 0.8]]), CASQUE, { tag: T.deco })
        blush1(r, -4, hy + 1.5)
      } else {
        p.fill(p.poly([[3.5, hy - 0.5], [9, hy + 2.3], [8.5, hy + 3.5], [3.5, hy + 1.5]]), BILL, { tag: T.deco })
      }
    }
    if (r.happy && r.air) heart(r, f === 'side' ? 13 : 10, r.hy - r.hry - 2)
    p.oy = 0
  },
}

// --- Golden hongsa --------------------------------------------------------------

const HS = mat('#ffd54f', '#e9a53a', '#fff3a6', '#b8742a')
const HS_W = mat('#f5b842', '#d08a2a', '#ffe28a', '#9a5a1e')
const HS_RED = mat('#e8514a', '#b8343f', '#ff8a7a', '#7e2436')
const HS_BEAK = mat('#f58f35', '#d0661f', '#ffbb66', '#9a4a1e')

function plume(r: Rig, pts: [number, number, number][]) {
  const p = r.p
  p.fill(p.tube(pts), HS, { tag: T.wing, hl: r.hd ? p.circ(pts[1][0], pts[1][1] - 1, 1) : undefined })
  const e = pts[pts.length - 1]
  p.fill(p.circ(e[0], e[1], Math.max(1, e[2] + 0.3)), HS_RED, { tag: T.wing })
}

SPECIES.hongsa = {
  shadow: 7,
  draw: (r) => {
    const p = r.p
    const f = r.f
    const sleep = r.sleep
    hover(r, 6)
    const w = r.wag * 0.7
    const flap = r.happy || r.walk === 1 || r.walk === 2
    if (f === 'side') {
      plume(r, [[-6, -6, 2], [-10, -8, 2.2], [-12.5, -12 + w, 1.8], [-11.5, -15.5 + w, 1.3], [-9.5, -15 + w, 1]])
      if (r.hd) plume(r, [[-6, -5, 1.8], [-11, -5, 2], [-14, -7.5 + w, 1.5], [-14.5, -10.5 + w, 1], [-13, -11 + w, 0.8]])
      p.fill(p.ell(-1.5, -5.5, 7.5, 4.8), HS, { hl: p.ell(1, -8, 3, 1.2) })
      if (flap && !sleep) {
        p.fill(p.poly([[-5.5, -7], [1, -7.5], [-2, -14], [-6, -17], [-9, -15], [-8, -10]]), HS_W, { tag: T.wing, line: r.hd ? undefined : HS_W.s })
      } else {
        p.fill(p.ell(-2.5, -6, 5, 3), HS_W, { tag: T.wing, line: r.hd ? undefined : HS_W.s })
      }
      if (r.hd) featherRows(r, T.wing, HS_W)
      let hx = 6.5
      let hy = -18.5 + (r.br ? 1 / p.k : 0)
      if (sleep) {
        hx = 2.5
        hy = -10.5
      } else {
        hy -= 1
        p.fill(p.tube([[3, -7, 2.3], [6, -10, 1.7], [4.5, -14.5, 1.6], [5.5, -18, 1.8]]), HS)
        p.fill(p.ell(4.2, -8.2, 2.4, 0.9), HS_RED, { clip: [T.body], line: null })
      }
      // crest
      p.fill(p.tube([[hx - 2.5, hy - 2.5, 1.1], [hx - 4.5, hy - 4.5, 1], [hx - 5, hy - 7, 0.9], [hx - 3.5, hy - 8, 0.8]]), HS_RED)
      setHead(r, hx, hy, 4, 3.6)
      p.fill(p.ell(hx, hy, 4, 3.6), HS, { tag: T.head, hl: p.ell(hx - 1, hy - 2, 1.8, 0.9) })
      p.fill(p.poly([[hx + 3, hy - 1], [hx + 6.5, hy + 0.5], [hx + 3, hy + 1.7]]), HS_BEAK, { tag: T.deco })
      eye(r, hx + 1, hy - 0.5, '#b8742a')
      blush1(r, hx + 1.6, hy + 1.6)
    } else {
      const back = f === 'up'
      // the kranok tail rises behind the body like a flame
      for (const s of [-1, 1]) plume(r, [[s * 2, -7, 1.8], [s * 5.5, -10, 2], [s * 7.5, -13.5 + w, 1.6], [s * 6.5, -16.5 + w, 1.1], [s * 4.8, -16 + w, 0.8]])
      if (flap && !sleep) for (const s of [-1, 1]) p.fill(p.poly([[s * 3, -8], [s * 9, -12], [s * 12, -17], [s * 13, -12], [s * 9, -5]]), HS_W, { tag: T.wing, line: r.hd ? undefined : HS_W.s })
      p.fill(p.ell(0, -5.5, 7, 5), HS, { hl: p.ell(-2, -8.5, 2.5, 1.2) })
      if (!back) p.fill(p.ell(0, -4.5, 4, 3.2), mat('#fff3a6', '#ffe28a'), { line: null, clip: [T.body], shade: false })
      if (!flap || sleep) for (const s of [-1, 1]) p.fill(p.ell(s * 6, -5.5, 2.5, 3.8), HS_W, { tag: T.wing, line: r.hd ? undefined : HS_W.s })
      if (r.hd) featherRows(r, T.wing, HS_W)
      let hy = -18 + (r.br ? 1 / p.k : 0)
      if (sleep) hy = -10.5
      else {
        hy -= 1
        p.fill(p.tube([[0, -8, 2.1], [0, -12, 1.7], [0, -16, 1.8]]), HS)
        if (!back) p.fill(p.ell(0, -9.5, 2.3, 0.9), HS_RED, { clip: [T.body], line: null })
      }
      p.fill(p.tube([[0, hy - 3, 1.1], [1.5, hy - 5.5, 1], [0.8, hy - 8, 0.9], [-0.8, hy - 8.5, 0.8]]), HS_RED)
      setHead(r, 0, hy, 4.2, 3.8)
      p.fill(p.ell(0, hy, 4.2, 3.8), HS, { tag: T.head, hl: p.ell(-1.2, hy - 2, 1.8, 0.9) })
      if (!back) {
        p.fill(p.poly([[-1.6, hy + 0.8], [1.6, hy + 0.8], [0, hy + 4]]), HS_BEAK, { tag: T.deco })
        eyes2(r, 2.1, hy - 0.8, '#b8742a')
        blush2(r, 3.2, hy + 1.2)
      }
    }
    if (r.happy && r.air) heart(r, f === 'side' ? 13 : 11, r.hy - r.hry - 3)
    p.oy = 0
  },
}

/** Light scallop rows over a wing so feathers read at HD. */
function featherRows(r: Rig, tag: number, m: Mat) {
  const p = r.p
  for (let y = 0; y < p.H; y++)
    for (let x = 0; x < p.W; x++) {
      if (p.tagAt(x, y) !== tag || p.c[y * p.W + x] !== m.b) continue
      if (y % 3 === 0 && (x + (y % 6 ? 1 : 0)) % 2 === 0) p.px(x, y, m.l, tag)
    }
}

// --- Baby garuda ----------------------------------------------------------------

const GR = mat('#ee5a4c', '#c23b3f', '#ff8f7d', '#7e2436')
const GR_W = mat('#ffc74a', '#e39a2e', '#fff0a0', '#a8601e')
const GR_TIP = mat('#e8514a', '#b8343f', '#ff8a7a', '#7e2436')

function garudaWing(r: Rig, s: number, up: boolean, far = false) {
  const p = r.p
  const m = far ? mat(GR_W.s, GR_W.d, GR_W.b) : GR_W
  const pts: [number, number][] = up
    ? [[s * 3, -9], [s * 8, -14], [s * 13.5, -19.5], [s * 15, -15], [s * 14, -11.5], [s * 11, -8.5], [s * 6, -6]]
    : [[s * 3, -9], [s * 8, -11.5], [s * 14, -11.5], [s * 14.5, -8], [s * 12.5, -5.5], [s * 9, -4], [s * 5, -5]]
  p.fill(p.poly(pts), m, { tag: T.wing })
  // red primary tips
  const tip = up ? p.circ(s * 14, -15.5, 2.6) : p.circ(s * 13.5, -8.5, 2.6)
  p.fill(inter(tip, p.poly(pts)), GR_TIP, { tag: T.wing, line: null, clip: [T.wing] })
  if (r.hd) {
    // feather separations
    for (let i = 1; i <= 3; i++) {
      const t = i / 4
      const ax = s * (4 + 9 * t)
      const ay = up ? -9 - 7 * t : -8.5 - 1 * t
      const bx = s * (6 + 7 * t)
      const by = up ? -6 - 3 * t : -4.5 - 0.5 * t
      const x0 = p.X(ax)
      const y0 = p.Y(ay)
      const x1 = p.X(bx)
      const y1 = p.Y(by)
      for (let k = 0; k <= 6; k++) {
        const x = Math.floor(x0 + ((x1 - x0) * k) / 6)
        const y = Math.floor(y0 + ((y1 - y0) * k) / 6)
        if (p.tagAt(x, y) === T.wing) p.px(x, y, m.s, T.wing)
      }
    }
  }
}

function chada(r: Rig, x: number, top: number) {
  const p = r.p
  // tiered golden crown (ชฎา)
  p.fill(p.poly([[x - 4.2, top + 2], [x + 4.2, top + 2], [x + 3.2, top - 1], [x + 1.4, top - 5], [x + 0.4, top - 9], [x, top - 10.5], [x - 0.4, top - 9], [x - 1.4, top - 5], [x - 3.2, top - 1]]), GOLD, { tag: T.deco, hl: r.hd ? p.rect(x - 1.5, top - 5, x - 0.5, top + 1) : undefined })
  if (r.hd) {
    for (const ty of [top - 1, top - 4.5, top - 7.5]) {
      const y = Math.round(p.Y(ty))
      for (let xx = 0; xx < p.W; xx++) if (p.tagAt(xx, y) === T.deco && p.c[y * p.W + xx] !== INK) p.px(xx, y, GOLD.s, T.deco)
    }
    const gy = Math.round(p.Y(top + 0.8))
    const gx = Math.round(p.X(x))
    p.px(gx - 1, gy, GR_TIP.b, T.deco)
    p.px(gx, gy, GR_TIP.b, T.deco)
  }
}

SPECIES.garuda = {
  shadow: 6,
  draw: (r) => {
    const p = r.p
    const f = r.f
    const sleep = r.sleep
    hover(r, 5)
    const up = !sleep && (r.happy ? !r.air : r.walk >= 0 ? r.walk < 2 : r.br === 1)
    const hy = sleep ? -12 : -14.5 + (r.br ? 1 / p.k : 0)
    if (f === 'side') {
      if (!sleep) garudaWing(r, -1, up, true)
      p.fill(p.tube([[-2, -3.5, 1], [-5, -1.5, 1.4], [-6.5, -1, 1.2]]), GR_W)
      p.fill(p.ell(-0.5, -6, 4.6, 4.6), GR, { hl: p.ell(-1.5, -8.5, 1.8, 1) })
      p.fill(p.ell(0.8, -7.8, 3, 1.3), GOLD, { clip: [T.body], line: null })
      // tucked talons
      p.fill(p.ell(1, -1.2, 2.2, 1.2), mat('#ffd54f', '#e9a53a'))
      if (sleep) p.fill(p.ell(-1.5, -6.5, 3.8, 3.2), GR_W, { tag: T.wing })
      else garudaWing(r, -1, !up)
      const hx = 1.5
      setHead(r, hx, hy, 5.8, 5.3)
      p.fill(p.ell(hx, hy, 5.8, 5.3), GR, { tag: T.head, hl: p.ell(hx - 1.5, hy - 3, 2.2, 1) })
      chada(r, hx - 0.5, hy - 5)
      p.fill(p.poly([[hx + 4.5, hy - 0.5], [hx + 8.5, hy + 0.8], [hx + 8, hy + 3], [hx + 6.8, hy + 2.2], [hx + 5, hy + 2.8]]), BILL, { tag: T.deco })
      eye(r, hx + 2.8, hy - 0.8, '#e9a53a')
      blush1(r, hx + 2.5, hy + 2.2)
    } else {
      const back = f === 'up'
      if (!sleep) {
        garudaWing(r, -1, up)
        garudaWing(r, 1, up)
      }
      for (const s of [-1, 1]) p.fill(p.ell(s * 2.3, -1.3, 1.8, 1.2), mat('#ffd54f', '#e9a53a'))
      if (back) p.fill(p.poly([[-2, -3], [2, -3], [0, 0.5]]), GR_W)
      p.fill(p.ell(0, -6, 4.8, 4.5), GR, { hl: p.ell(-1.5, -8.5, 1.8, 1) })
      if (!back) p.fill(p.ell(0, -8, 3.6, 1.4), GOLD, { clip: [T.body], line: null })
      if (sleep) for (const s of [-1, 1]) p.fill(p.ell(s * 4.5, -6, 2.2, 3.5), GR_W, { tag: T.wing })
      setHead(r, 0, hy, 6, 5.4)
      p.fill(p.ell(0, hy, 6, 5.4), GR, { tag: T.head, hl: p.ell(-2, hy - 3, 2.2, 1) })
      chada(r, 0, hy - 5)
      if (!back) {
        eyes2(r, 2.7, hy - 0.8, '#e9a53a')
        p.fill(p.poly([[-1.6, hy + 0.6], [1.6, hy + 0.6], [1.2, hy + 2.6], [0, hy + 3.8], [-1.2, hy + 2.6]]), BILL, { tag: T.deco })
        blush2(r, 4.2, hy + 1.8)
      }
    }
    if (r.happy && r.air) heart(r, f === 'side' ? 12 : 11, r.hy - r.hry - 6)
    p.oy = 0
  },
}

// --- Floating koi spirit -----------------------------------------------------------

const KOI = mat('#fffaf0', '#e9ddd2', '#ffffff', '#b9a79c')
const KOI_O = mat('#f7923a', '#d8692a', '#ffbe78', '#9a4a1e')
const KOI_R = mat('#e8514a', '#b8343f', '#ff8a7a', '#7e2436')
const FIN = mat('#ffe2d0', '#f7b79a', '#fff6ee', '#d8805c')

SPECIES.koi = {
  icon: 'side',
  shadow: 6,
  draw: (r) => {
    const p = r.p
    const f = r.f
    hover(r, 6)
    const s = r.walk >= 0 ? [0, 1, 0, -1][r.walk] : r.br ? 0.7 : r.air ? -1 : 0
    if (f === 'side') {
      // tail fin
      const tail = union(
        p.tube([[-6, -7, 1.3], [-10, -9 + s, 2], [-13.5, -11.5 + s * 1.5, 1.3]]),
        p.tube([[-6, -6, 1.3], [-10, -4 + s, 2], [-13.5, -2 + s * 1.5, 1.3]]),
        p.poly([[-7, -7.5], [-13, -11.5 + s * 1.5], [-11, -6.5 + s], [-13, -2 + s * 1.5], [-7, -5.5]]),
      )
      p.fill(tail, FIN, { tag: T.wing })
      p.fill(p.poly([[-4, -9], [-1, -13 + s * 0.3], [3.5, -10.5]]), FIN, { tag: T.wing })
      p.fill(union(p.ell(0.5, -6.5, 7.8, 4.3), p.tube([[-3, -6.5, 3.5], [-7, -6.5, 1.5]])), KOI, { hl: p.ell(1, -9, 4, 1) })
      p.fill(p.ell(-2.5, -8.5, 3, 2.2), KOI_O, { line: null, clip: [T.body], shade: false })
      p.fill(p.ell(-5.5, -5, 1.8, 1.5), KOI_O, { line: null, clip: [T.body], shade: false })
      p.fill(p.ell(4.5, -9.8, 2.2, 1.5), KOI_R, { line: null, clip: [T.body], shade: false })
      scales(r, KOI, T.body, r.fr)
      p.fill(p.ell(2, -3, 2.4, 1.2), FIN, { tag: T.wing })
      setHead(r, 4, -6.5, 4, 4.3)
      eye(r, 5.2, -7, '#5a3a60')
      blush1(r, 5.8, -5)
      const mx = Math.round(p.X(8))
      const my = Math.round(p.Y(-5.6))
      if (r.hd) {
        p.px(mx, my, MOUTH)
        p.px(mx, my + 1, FIN.d)
        p.px(mx - 1, my + 2, FIN.d)
      } else p.px(Math.floor(p.X(8)) - 1, Math.floor(p.Y(-5.5)), MOUTH)
    } else {
      // 3/4 views: swimming toward the viewer (down) or away (up)
      const back = f === 'up'
      const m = back ? -1 : 1
      const X = (x: number) => x * m
      const tail = back
        ? union(
            p.tube([[X(-3), -5.5, 1.5], [X(-7), -3.5 + s, 2], [X(-10.5), -1.8 + s * 1.5, 1.2]]),
            p.tube([[X(-3), -5.5, 1.5], [X(-8), -7 + s, 2], [X(-11.5), -7.5 + s * 1.5, 1.2]]),
            p.poly([[X(-4), -6.5], [X(-11.5), -7.5 + s * 1.5], [X(-9), -4.5 + s], [X(-10.5), -1.8 + s * 1.5], [X(-4), -4.5]]),
          )
        : union(
            p.tube([[X(-4), -8.5, 1.5], [X(-8), -11 + s, 2], [X(-11), -13.5 + s * 1.5, 1.2]]),
            p.tube([[X(-4), -8.5, 1.5], [X(-9), -8 + s, 2], [X(-12), -8.5 + s * 1.5, 1.2]]),
            p.poly([[X(-5), -9.5], [X(-11), -13.5 + s * 1.5], [X(-9.5), -10 + s], [X(-12), -8.5 + s * 1.5], [X(-5), -7.5]]),
          )
      p.fill(tail, FIN, { tag: T.wing })
      p.fill(p.poly([[X(-3), -11.5], [X(-1), -14.3 + s * 0.3], [X(2.5), -12]]), FIN, { tag: T.wing })
      const bodyS = back
        ? union(p.ell(X(0.5), -8, 6.4, 5), p.tube([[X(-2.5), -6.5, 3.3], [X(-4.5), -5.5, 1.8]]))
        : union(p.ell(X(0.5), -7.5, 6.4, 5), p.tube([[X(-3), -8.5, 3.3], [X(-5), -8.8, 1.8]]))
      setHead(r, X(1.5), -7.5, 6, 5)
      p.fill(bodyS, KOI, { hl: p.ell(X(0), -10.5, 3, 1) })
      p.fill(p.ell(X(2.5), -10.8, 2.3, 1.6), KOI_R, { line: null, clip: [T.body], shade: false })
      p.fill(p.ell(X(-3), -6.5, 2.6, 2), KOI_O, { line: null, clip: [T.body], shade: false })
      p.fill(p.ell(X(4.5), -4.2, 1.7, 1.3), KOI_O, { line: null, clip: [T.body], shade: false })
      if (r.hd) scales(r, KOI, T.body, r.fr)
      p.fill(p.ell(X(-1.5), -2.6, 2, 1.1), FIN, { tag: T.wing })
      p.fill(p.ell(X(5), -2.8, 1.6, 1), FIN, { tag: T.wing })
      if (!back) {
        eye(r, 0.2, -7.4)
        eye(r, 4.4, -7.4)
        blush1(r, -1.3, -5.3)
        blush1(r, 6, -5.3)
        const mx = Math.round(p.X(2.5))
        const my = Math.round(p.Y(-4.6))
        if (r.hd) p.stamp(mx - 1, my, r.mouth === 'open' ? ['mm', 'tt'] : ['mm'], { m: MOUTH, t: TONGUE })
        else if (r.mouth === 'open') p.px(Math.floor(p.X(2.2)), my, MOUTH)
      }
    }
    if (r.happy && r.air) heart(r, f === 'side' ? 11 : 9, -16)
    p.oy = 0
  },
}

// --- Serpents: baby naga & little gold dragon ----------------------------------------

interface SerpLook {
  body: Mat
  belly: Mat
  snout: Mat
  crest: Mat
  iris: string
  dragon?: boolean
}

const NAGA: SerpLook = {
  body: mat('#4fb06a', '#35865a', '#94e08c', '#1f5a44'),
  belly: mat('#ffd54f', '#e9a53a', '#fff3a6'),
  snout: mat('#7cc878', '#56a462', '#b6ecaa'),
  crest: GOLD,
  iris: '#e9a53a',
}
const DRAGON: SerpLook = {
  body: mat('#ffcf4a', '#e9a03a', '#fff0a0', '#a8601e'),
  belly: mat('#fff1d6', '#f3dcb2', '#fffaf0'),
  snout: mat('#ffe07a', '#f0b84a', '#fff6c0'),
  crest: mat('#ee5a4c', '#c23b3f', '#ff8f7d', '#7e2436'),
  iris: '#e8514a',
  dragon: true,
}
const ANTLER = mat('#fff1d6', '#f3c9a0', '#ffffff', '#b8865a')
const WHISKER = '#ff8a7a'

function serpent(r: Rig, s: SerpLook) {
  const p = r.p
  const f = r.f
  const sleep = r.sleep
  hover(r, sleep ? 2 : 5)
  const w = r.walk >= 0 ? [0, 1, 0, -1][r.walk] : r.br ? 0.6 : r.happy ? (r.air ? 1 : -1) : 0
  if (f === 'side') {
    const pts: [number, number, number][] = sleep
      ? [[-12, -2, 0.8], [-9, -1.5, 1.8], [-4, -2.5, 2.8], [1, -2.8, 3.2], [5, -3, 3.2], [7, -4, 3]]
      : [[-13, -4 + w, 0.8], [-10, -2 - w * 0.5, 1.8], [-5, -3 + w * 0.5, 2.8], [0, -3.5, 3.2], [4, -6, 3.4], [5, -11, 3.1], [4.5, -14.5, 2.8]]
    const hx = sleep ? 7 : 6
    const hy = sleep ? -8 : -18 + (r.br ? 1 / p.k : 0)
    if (s.dragon) {
      // red mane ridge along the back
      p.fill(p.tube(pts.map(([x, y, rr]) => [x - rr * 0.35, y - rr * 0.75, Math.max(0.7, rr * 0.5)] as [number, number, number])), s.crest)
      // little legs
      if (!sleep)
        for (const [lx, ly] of [[-5, -3], [3, -4]] as [number, number][]) {
          const k = lx < 0 ? w : -w
          p.fill(p.tube([[lx, ly, 1.3], [lx + 1.5, ly + 3 + k * 0.5, 1], [lx + 2.8, ly + 3.2 + k * 0.5, 0.8]]), mat(s.body.s, s.body.d, s.body.b))
        }
    }
    p.fill(p.tube(pts), s.body, { rim: r.hd })
    p.fill(p.tube(pts.map(([x, y, rr]) => [x + rr * 0.3, y + rr * 0.55, rr * 0.55] as [number, number, number])), s.belly, { line: null, clip: [T.body], shade: false })
    if (r.hd) bellyBands(r, s.belly)
    scales(r, s.body, T.body, r.fr)
    // crest / mane behind head
    if (s.dragon) {
      p.fill(p.ell(hx - 3.5, hy + 0.5, 3.2, 3.8), s.crest)
      p.fill(p.tube([[hx - 1.5, hy - 3.5, 1], [hx - 3, hy - 7.5, 0.9], [hx - 4.8, hy - 9, 0.7]]), ANTLER)
      p.fill(p.tube([[hx - 2.6, hy - 6.3, 0.7], [hx - 1, hy - 8, 0.6]]), ANTLER)
    } else {
      p.fill(p.poly([[hx - 5, hy - 1], [hx - 4.5, hy - 6], [hx - 2.5, hy - 4], [hx - 1.5, hy - 9], [hx + 0.5, hy - 4.5], [hx + 2, hy - 6.5], [hx + 2.5, hy - 2]]), s.crest, { tag: T.deco })
    }
    setHead(r, hx, hy, 5.5, 4.5)
    p.fill(p.ell(hx, hy, 5.5, 4.5), s.body, { tag: T.head, hl: p.ell(hx - 1.5, hy - 2.8, 2.2, 0.9) })
    p.fill(p.ell(hx + 4.2, hy + 1, 3.2, 2.5), s.snout, { tag: T.head })
    if (r.hd) {
      const nx = Math.round(p.X(hx + 6.3))
      const ny = Math.round(p.Y(hy - 0.3))
      p.px(nx, ny, s.body.d)
    }
    if (s.dragon) {
      const wy = r.fr % 2 ? 0.8 : 0
      p.fill(p.tube([[hx + 6.5, hy + 0.5, 0.55], [hx + 9, hy - 0.5 + wy, 0.55], [hx + 11, hy + 1.5 + wy, 0.5], [hx + 11.3, hy + 4 + wy, 0.5]]), WHISKER, { tag: T.fx, line: null })
    }
    eye(r, hx + 1.5, hy - 0.8, s.iris)
    blush1(r, hx + 2.5, hy + 2)
    if (r.mouth === 'open') mouthSide(r, hx + 5.5, hy + 2.8)
  } else {
    const back = f === 'up'
    const hy = sleep ? -9.5 : -16.5 + (r.br ? 1 / p.k : 0)
    // tail tip curling out of the coil
    p.fill(p.tube([[6, -4, 1.6], [9.5, -5.5 + w, 1.2], [11, -8.5 + w, 0.8], [10, -10 + w, 0.6]]), s.body)
    if (s.dragon && !sleep)
      for (const k of [-1, 1]) p.fill(p.tube([[k * 6, -3.5, 1.3], [k * 8.5, -1.5, 1], [k * 9.3, -0.8, 0.8]]), mat(s.body.s, s.body.d, s.body.b))
    p.fill(p.ell(0, -3.8, 8.5, 3.6), s.body, { hl: p.ell(-3, -6, 3, 0.8) })
    if (!back) p.fill(p.ell(0, -2.2, 6.5, 1.6), s.belly, { line: null, clip: [T.body], shade: false })
    p.fill(p.ell(0, -7.2, 6.5, 3), s.body, { hl: p.ell(-2.5, -9, 2.5, 0.8) })
    if (!back) p.fill(p.ell(0, -5.8, 5, 1.3), s.belly, { line: null, clip: [T.body], shade: false })
    if (!sleep) {
      p.fill(p.tube([[0, -8, 3], [0, -12, 2.9]]), s.body)
      if (!back) p.fill(p.ell(0, -10.5, 1.8, 3), s.belly, { line: null, clip: [T.body], shade: false })
    }
    if (r.hd) bellyBands(r, s.belly)
    scales(r, s.body, T.body, r.fr)
    if (s.dragon) {
      for (const k of [-1, 1]) {
        p.fill(p.ell(k * 5.2, hy - 0.5, 2.4, 3), s.crest)
        p.fill(p.tube([[k * 3, hy - 3.5, 1], [k * 4.5, hy - 7.5, 0.9], [k * 6.5, hy - 9, 0.7]]), ANTLER)
        p.fill(p.tube([[k * 4.1, hy - 6.2, 0.7], [k * 2.5, hy - 8.3, 0.6]]), ANTLER)
      }
    } else {
      p.fill(p.poly([[-6, hy - 1.5], [-6.8, hy - 6.5], [-3.8, hy - 4.5], [0, hy - 10.5], [3.8, hy - 4.5], [6.8, hy - 6.5], [6, hy - 1.5]]), s.crest, { tag: T.deco })
      if (r.hd) {
        const c = p.W / 2
        const gy = Math.round(p.Y(hy - 6))
        p.px(c - 1, gy, KOI_R.b, T.deco)
        p.px(c, gy, KOI_R.b, T.deco)
      }
    }
    setHead(r, 0, hy, 6.2, 5)
    p.fill(p.ell(0, hy, 6.2, 5), s.body, { tag: T.head, hl: p.ell(-2, hy - 3.2, 2.4, 0.9) })
    if (!back) {
      p.fill(p.ell(0, hy + 2.8, 3.8, 2.4), s.snout, { tag: T.head, line: s.body.s })
      if (r.hd) {
        const c = p.W / 2
        const ny = Math.round(p.Y(hy + 2))
        p.px(c - 2, ny, s.body.d)
        p.px(c + 1, ny, s.body.d)
      }
      if (s.dragon && r.hd) {
        const wy = r.fr % 2 ? 0.8 : 0
        for (const k of [-1, 1])
          p.fill(p.tube([[k * 3.5, hy + 3, 0.55], [k * 7, hy + 2 + wy, 0.55], [k * 9.5, hy + 4 + wy, 0.5], [k * 9.5, hy + 6.5 + wy, 0.5]]), WHISKER, { tag: T.fx, line: null })
      }
      eyes2(r, 3, hy - 0.8, s.iris)
      blush2(r, 4.5, hy + 1.6)
      if (r.mouth === 'open') {
        const c = p.W / 2
        const my = Math.round(p.Y(hy + 4.5))
        if (r.hd) p.stamp(c - 1, my, ['mm', 'tt'], { m: MOUTH, t: TONGUE })
        else p.px(c - 1, my, MOUTH)
      }
    }
  }
  if (r.happy && r.air) heart(r, f === 'side' ? 13 : 11, r.hy - r.hry - 5)
  p.oy = 0
}

/** Horizontal belly plates. */
function bellyBands(r: Rig, m: Mat) {
  const p = r.p
  for (let y = 0; y < p.H; y++) {
    if (y % 3 !== 0) continue
    for (let x = 0; x < p.W; x++) if (p.c[y * p.W + x] === m.b && p.tagAt(x, y) === T.body) p.px(x, y, m.s, T.body)
  }
}

SPECIES.naga = { shadow: 7, icon: 'down', draw: (r) => serpent(r, NAGA) }
SPECIES.dragon = { shadow: 7, icon: 'down', draw: (r) => serpent(r, DRAGON) }

// ---------------------------------------------------------------------------
// v4 pets: viral Thai animals (orange cat, water monitor, capybara, pygmy
// hippo, a blind-box monster, a peanut-butter bear) and pack / battle-pass
// exclusives (baby elephant in elephant pants, betta in a bubble, soggy
// cat, rescue dog). Data: game/data/petsV4.ts.

/** Recolour base-coloured pixels of a tag in a repeating pattern (stripes, spots). */
function patternOver(r: Rig, m: Mat, tags: number[], col: string, hit: (x: number, y: number) => boolean) {
  const p = r.p
  for (let y = 0; y < p.H; y++)
    for (let x = 0; x < p.W; x++) {
      const i = y * p.W + x
      if (!tags.includes(p.t[i]) || p.c[i] !== m.b) continue
      if (hit(x, y)) p.c[i] = col
    }
}

// --- Orange cat (แมวส้ม) --------------------------------------------------------

const ORANGE = mat('#f5a653', '#d98535', '#ffc98a', '#9a5320')
SPECIES.orange_cat = {
  draw: (r) => {
    quad(r, {
      body: ORANGE,
      light: mat('#fff1d6', '#f0d9b0'),
      ears: 'point',
      ear: ORANGE,
      earIn: '#ffb3cf',
      snout: 'cat',
      nose: '#e8709e',
      iris: '#7fd35a',
      tail: 'catUp',
      bodyRX: 7,
      bodyRY: 4.6,
      headRX: 8,
      headRY: 6.6,
      legW: 3,
    })
    // tabby stripes on the body and forehead
    const k = r.hd ? 2 : 1
    patternOver(r, ORANGE, [T.body], ORANGE.s, (x, y) => Math.floor((x + Math.floor(y / 2)) / k) % 3 === 0)
    patternOver(r, ORANGE, [T.head], ORANGE.s, (x, y) => y < r.p.Y(r.hy - r.hry * 0.35) && Math.floor(x / k) % 3 === 1)
  },
}

// --- Soggy grumpy cat (แมวเปียกหน้าบึ้ง) -------------------------------------------

const SOGGY = mat('#a9b3c6', '#8792a8', '#cfd6e2', '#5c677e')
SPECIES.soggy_cat = {
  draw: (r) => {
    quad(r, {
      body: SOGGY,
      light: mat('#dfe5ee', '#c3ccd9'),
      ears: 'point',
      ear: SOGGY,
      earIn: '#d9a9b8',
      snout: 'cat',
      nose: '#8e6a7a',
      iris: '#e9c23a',
      tail: 'whip',
      bodyRX: 6.6,
      bodyRY: 4.2,
      headRX: 7.6,
      headRY: 6.2,
      legW: 3,
      afterHead: (rr) => {
        const p = rr.p
        if (rr.f === 'up' || rr.sleep) return
        // angry brows
        const y = Math.round(p.Y(rr.hy - 2.4))
        if (rr.f === 'side') {
          const x = Math.round(p.X(rr.hx + 2))
          p.px(x, y, SOGGY.d)
          p.px(x + 1, y + (rr.hd ? 1 : 0), SOGGY.d)
          if (rr.hd) p.px(x + 2, y + 1, SOGGY.d)
        } else {
          const x = Math.round(p.X(2.2))
          const w = rr.hd ? 3 : 2
          for (let i = 0; i < w; i++) {
            p.px(x + i, y + (rr.hd ? Math.floor(i / 2) : 0), SOGGY.d)
            p.px(p.W - 1 - (x + i), y + (rr.hd ? Math.floor(i / 2) : 0), SOGGY.d)
          }
        }
      },
    })
    // wet spiky fur clumps along the belly line
    const p = r.p
    if (r.hd) patternOver(r, SOGGY, [T.body], SOGGY.d, (x, y) => (x + y) % 5 === 0 && y % 3 === 0)
    void p
  },
  post: (ctx, r) => {
    // drips falling from the chin and the belly
    const p = r.p
    const drops: [number, number][] = r.f === 'side' ? [[7, -3], [-3, -2]] : [[-3, -2.5], [3.5, -3]]
    ctx.fillStyle = '#7fc8ff'
    drops.forEach(([x, y], i) => {
      const fall = ((r.fr + i) % 2) * (r.hd ? 2 : 1)
      const px = Math.round(p.X(x))
      const py = Math.round(p.Y(y)) + fall
      ctx.fillRect(px, py, 1, r.hd ? 2 : 1)
    })
    ctx.fillStyle = '#d9f0ff'
    const [hx, hy] = [Math.round(p.X(r.hx + (r.f === 'side' ? 2 : 4))), Math.round(p.Y(r.hy - r.hry - 1))]
    if (r.hd && r.fr % 2 === 0) ctx.fillRect(hx, hy, 1, 1)
  },
}

// --- Rescue dog (ตูบกู้ภัย) ---------------------------------------------------------

const TUB = mat('#e8b872', '#c9914a', '#ffd9a0', '#8a5a2a')
const VEST = mat('#ff7a1a', '#d4580c', '#ffb066', '#8a3a0a')
SPECIES.tub_rescue = {
  draw: (r) =>
    quad(r, {
      body: TUB,
      light: mat('#fff0d6', '#f0d9b0'),
      ears: 'point',
      ear: TUB,
      earIn: '#f7c9b9',
      snout: 'dog',
      nose: INK,
      tail: 'curl',
      headRX: 8,
      afterBody: (rr) => {
        const p = rr.p
        // orange rescue vest with a reflective band
        const band = rr.f === 'side' ? p.rect(-6, -14, 3, -6) : p.rect(-6, -15, 6, -6)
        p.fill(band, VEST, { clip: [T.body], line: VEST.d, tag: T.deco })
        const y = Math.round(p.Y(-10))
        for (let x = 0; x < p.W; x++) if (p.tagAt(x, y) === T.deco) p.px(x, y, '#e8eef8', T.deco)
        if (rr.hd && rr.f !== 'down') {
          const cx = Math.round(p.X(rr.f === 'side' ? -1.5 : 0))
          p.stamp(cx - 1, y - 3, ['.b.', 'bwb', '.b.'], { b: '#2e3a6b', w: '#fbfcff' }, false, T.deco)
        }
      },
      afterHead: (rr) => {
        const p = rr.p
        // white safety helmet with an orange stripe and a head lamp
        const hx = rr.hx
        const top = rr.hy - rr.hry
        p.fill(p.ell(hx - (rr.f === 'side' ? 0.8 : 0), top + 2, rr.hrx * 0.78, 3.4), mat('#fbfcff', '#d9dfec', '#ffffff', '#8a8496'), { tag: T.deco })
        const sy0 = Math.round(p.Y(top - 1))
        const sy1 = Math.round(p.Y(top + 3))
        const sx = Math.round(p.X(hx - (rr.f === 'side' ? 0.8 : 0)))
        for (let y = sy0; y <= sy1; y++) {
          p.pxOn(sx, y, VEST.b, T.deco)
          if (rr.hd) p.pxOn(sx - 1, y, VEST.b, T.deco)
        }
        if (rr.f !== 'up') {
          const ly = Math.round(p.Y(top + 2.5))
          const lx = rr.f === 'side' ? Math.round(p.X(hx + 4)) : sx
          p.pxOn(lx, ly, '#ffe45e', T.deco)
          if (rr.hd) p.pxOn(lx - 1, ly, '#fffbd0', T.deco)
        }
      },
    }),
}

// --- Capybara (คาปิบาร่า) -----------------------------------------------------------

const CAPY = mat('#b58456', '#946640', '#d4a574', '#6e4a2e')
const YUZU = mat('#ffb02e', '#e08a1a', '#ffd680', '#a8600a')
SPECIES.capybara = {
  draw: (r) =>
    quad(r, {
      body: CAPY,
      light: mat('#c99a6a', '#b58456'),
      ears: 'round',
      ear: mat('#946640', '#7a5232'),
      snout: 'none',
      nose: INK,
      tail: 'none',
      bodyRX: 8.5,
      bodyRY: 5.5,
      headRX: 7,
      headRY: 6,
      legH: 4.5,
      legW: 3.5,
      afterHead: (rr) => {
        const p = rr.p
        const side = rr.f === 'side'
        if (rr.f !== 'up') {
          // the big square capybara muzzle
          if (side) {
            p.fill(p.ell(rr.hx + 4, rr.hy + 1.8, 4.2, 3.6), mat('#a87848', '#8a5e36'), { tag: T.head })
            p.px(Math.round(p.X(rr.hx + 7.3)), Math.round(p.Y(rr.hy + 0.5)), CAPY.d)
          } else {
            p.fill(p.ell(0, rr.hy + 2.6, 5, 3.2), mat('#a87848', '#8a5e36'), { tag: T.head, line: CAPY.d })
            const ny = Math.round(p.Y(rr.hy + 1.6))
            p.px(p.W / 2 - 2, ny, CAPY.d)
            p.px(p.W / 2 + 1, ny, CAPY.d)
          }
        }
        // the famous yuzu balanced on its head
        const yx = rr.hx - (side ? 1 : 0)
        const yy = rr.hy - rr.hry - 1.2
        p.fill(p.circ(yx, yy, 2.6), YUZU, { tag: T.deco, hl: p.ell(yx - 0.8, yy - 0.8, 1, 0.8) })
        p.fill(p.ell(yx + 1.6, yy - 2.6, 1.6, 0.9), mat('#5ea653', '#43905a'), { tag: T.deco })
      },
    }),
}

// --- Pygmy hippo (ฮิปโปแคระ) ---------------------------------------------------------

const HIPPO = mat('#a99db8', '#877a99', '#cfc6dc', '#5e5470')
const HIPPO_M = mat('#c9bcd6', '#b0a2c2', '#e3dbec', '#6e6480')
SPECIES.pygmy_hippo = {
  draw: (r) =>
    quad(r, {
      body: HIPPO,
      light: mat('#e9d6e0', '#d9bfcf'),
      ears: 'round',
      ear: HIPPO,
      earIn: '#ffb3cf',
      snout: 'none',
      nose: INK,
      tail: 'tuft',
      bodyRX: 8.5,
      bodyRY: 5.6,
      headRX: 8,
      headRY: 6.4,
      legH: 4,
      legW: 3.8,
      afterHead: (rr) => {
        const p = rr.p
        if (rr.f === 'up') return
        if (rr.f === 'side') {
          p.fill(p.ell(rr.hx + 4.5, rr.hy + 1.8, 4.6, 3.6), HIPPO_M, { tag: T.head })
          p.px(Math.round(p.X(rr.hx + 7.5)), Math.round(p.Y(rr.hy - 0.2)), HIPPO.d)
          p.fill(p.ell(rr.hx + 2, rr.hy + 3.6, 1.6, 1), '#ff9fc0', { line: null, clip: [T.head], shade: false })
        } else {
          p.fill(p.ell(0, rr.hy + 2.8, 6.2, 3.4), HIPPO_M, { tag: T.head, line: HIPPO.s })
          const ny = Math.round(p.Y(rr.hy + 1.4))
          for (const dx of rr.hd ? [-3, -2, 1, 2] : [-2, 1]) p.px(p.W / 2 + dx, ny, HIPPO.d)
          // chubby pink cheeks
          p.fill(p.ell(-5.6, rr.hy + 2.4, 1.8, 1.3), '#ff9fc0', { line: null, clip: [T.head], shade: false })
          p.fill(p.ell(5.6, rr.hy + 2.4, 1.8, 1.3), '#ff9fc0', { line: null, clip: [T.head], shade: false })
        }
      },
    }),
}

// --- Water monitor (ตัวเงินตัวทอง) ------------------------------------------------------

const MON = mat('#5c6b4a', '#465338', '#7a8a64', '#2f3a24')
const MON_B = mat('#d9d59a', '#bdb878', '#eeeac0', '#8a864a')
SPECIES.water_monitor = {
  icon: 'side',
  draw: (r) => {
    const p = r.p
    const f = r.f
    const sleep = r.sleep
    p.oy = r.bob
    const w = r.wag
    const step = r.walk < 0 ? 0 : [1, 0, -1, 0][r.walk]
    const tongue = !sleep && (r.happy || r.fr % 2 === 1)
    if (f === 'side') {
      // long tail on the ground, splayed legs, low body, flat head forward
      p.fill(p.tube([[-6, -3.5, 2.6], [-11, -2.5, 1.8], [-15.5, -1.5 + w * 0.5, 1.1], [-19, -1.2 + w, 0.6]]), MON)
      p.fill(p.ell(-3.5 - step, -1.3, 2.3, 1.3), mat(MON.s, MON.d))
      p.fill(p.ell(4.5 + step, -1.3, 2.3, 1.3), mat(MON.s, MON.d))
      p.fill(p.ell(0, sleep ? -3 : -4, 7.8, sleep ? 2.6 : 3.2), MON, { hl: p.ell(-1, -6, 4, 0.9) })
      p.fill(p.ell(0.5, sleep ? -1.8 : -2.4, 5.5, 1.4), MON_B, { line: null, clip: [T.body], shade: false })
      p.fill(p.ell(-4.5 + step, -1.1, 2.4, 1.3), MON)
      p.fill(p.ell(3.5 - step, -1.1, 2.4, 1.3), MON)
      const hx = 9.5
      const hy = sleep ? -3 : -5 - (r.air ? 1 : 0)
      setHead(r, hx, hy, 4.4, 2.8)
      p.fill(union(p.ell(hx, hy, 4.4, 2.8), p.ell(hx + 3.2, hy + 0.6, 2.6, 1.8)), MON, { tag: T.head, hl: p.ell(hx, hy - 1.8, 2.2, 0.6) })
      eye(r, hx + 1, hy - 0.8, '#e9c23a')
      if (tongue) {
        const tx = Math.round(p.X(hx + 6))
        const ty = Math.round(p.Y(hy + 0.8))
        p.stamp(tx, ty - 1, r.hd ? ['...c', 'ccc.', '...c'] : ['.c', 'c.'], { c: '#ff5f7a' }, false, T.deco)
      }
    } else if (f === 'down') {
      p.fill(p.tube([[3, -3, 1.6], [8, -2, 1.1], [11 + w, -1.2, 0.6]]), MON)
      for (const s of [-1, 1]) p.fill(p.ell(s * (6.5 + (s > 0 ? step : -step) * 0.5), -1.3, 2.6, 1.3), MON)
      p.fill(p.ell(0, -4.2, 6.2, 3.4), MON, { hl: p.ell(-2, -6.5, 2.5, 0.8) })
      const hy = sleep ? -5 : -7.5
      setHead(r, 0, hy, 5, 3.6)
      p.fill(p.ell(0, hy, 5, 3.6), MON, { tag: T.head, hl: p.ell(-1.5, hy - 2.2, 2, 0.7) })
      p.fill(p.ell(0, hy + 2, 3.4, 1.5), MON_B, { line: null, clip: [T.head], shade: false })
      eyes2(r, 3.4, hy - 0.8, '#e9c23a')
      if (tongue) {
        const c = p.W / 2
        const ty = Math.round(p.Y(hy + 3.2))
        p.stamp(c - (r.hd ? 2 : 1), ty, r.hd ? ['.cc.', '.cc.', 'c..c'] : ['cc'], { c: '#ff5f7a' }, false, T.deco)
      }
    } else {
      p.fill(p.ell(0, -4.8, 6.2, 3.8), MON, { hl: p.ell(-2, -7, 2.5, 0.8) })
      for (const s of [-1, 1]) p.fill(p.ell(s * 6.5, -1.4 + (s > 0 ? step : -step) * 0.3, 2.5, 1.3), MON)
      setHead(r, 0, -9, 4, 3)
      p.fill(p.ell(0, -9, 4, 3), MON, { tag: T.head })
      p.fill(p.tube([[0, -2.5, 2.2], [1 + w, -1, 1.5], [3 + w, -0.6, 0.8]]), MON)
    }
    // golden spots (they bring the money, after all)
    const k = r.hd ? 2 : 1
    patternOver(r, MON, [T.body, T.head], '#e8cf52', (x, y) => (Math.floor(x / k) * 2 + Math.floor(y / k) * 3) % 7 === 0)
    if (r.happy && r.air) heart(r, f === 'side' ? 12 : 9, -14)
    p.oy = 0
  },
}

// --- Upright chibis: peanut-butter bear & blind-box monster -------------------------

interface BipedLook {
  fur: Mat
  belly: Mat
  face?: Mat
  ears: 'round' | 'bunny'
  earIn: string
  /** Sways left and right while idle. */
  dance?: boolean
  mouth?: 'grin' | 'cute'
  after?: (r: Rig, hx: number, hy: number) => void
}

function biped(r: Rig, b: BipedLook) {
  const p = r.p
  const f = r.f
  const sleep = r.sleep
  const sway = b.dance && r.a === 'idle' ? (r.fr % 2 ? 1 : -1) : 0
  p.ox = Math.round(p.S(sway))
  p.oy = r.bob
  const swing = r.walk < 0 ? 0 : [1.5, 0, -1.5, 0][r.walk]
  const armUp = r.happy || (b.dance && r.a === 'idle')
  const hy = sleep ? -8.5 : -15.5 + (r.br ? 1 / p.k : 0)
  const ear = (x: number, y: number, s: number, inner: boolean) => {
    if (b.ears === 'round') {
      p.fill(p.circ(x, y, 2.5), b.fur, { tag: T.head })
      if (inner) p.fill(p.circ(x, y + 0.3, 1.3), b.earIn, { line: null, clip: [T.head] })
    } else {
      p.fill(p.tube([[x, y + 2, 1.8], [x + s * 0.6, y - 3, 1.5], [x + s * 1.2, y - 7, 0.7]]), b.fur, { tag: T.head })
      if (inner) p.fill(p.tube([[x, y + 1.5, 0.8], [x + s * 0.6, y - 3, 0.7], [x + s * 1.1, y - 5.5, 0.4]]), b.earIn, { line: null, clip: [T.head] })
    }
  }
  if (f === 'side') {
    const hx = 2.5
    if (!sleep) p.fill(p.tube([[1, -9.5, 1.3], [armUp ? 3 : 1 - swing, armUp ? -17 : -5.5, 1.2]]), mat(b.fur.s, b.fur.d, b.fur.b))
    p.fill(p.ell(-2.2 - swing, -1.2, 2.4, 1.4), mat(b.fur.s, b.fur.d, b.fur.b))
    p.fill(p.ell(-0.5, sleep ? -4.8 : -6.5, sleep ? 6.5 : 5.2, sleep ? 4.5 : 5.8), b.fur, { hl: p.ell(-2, sleep ? -8 : -10.5, 2.3, 1.2) })
    p.fill(p.ell(1.5, sleep ? -3.5 : -5.5, 3, 3.5), b.belly, { line: null, clip: [T.body], shade: false })
    p.fill(p.ell(1.8 + swing, -1.2, 2.4, 1.4), b.fur)
    p.fill(p.circ(-5.8, -5, 1.6), b.fur)
    ear(hx - 3.5, hy - 4.8, -1, false)
    setHead(r, hx, hy, 6.3, 5.8)
    p.fill(p.ell(hx, hy, 6.3, 5.8), b.fur, { tag: T.head, hl: p.ell(hx - 2, hy - 3.8, 2.5, 1) })
    if (b.face) p.fill(p.ell(hx + 2.5, hy + 0.8, 3.6, 3.8), b.face, { line: null, clip: [T.head], shade: false })
    ear(hx - 1, hy - 5.2, 1, true)
    if (!sleep) p.fill(p.tube([[3, -9.5, 1.3], [armUp ? 6 : 4 + swing, armUp ? -17.5 : -5, 1.2]]), b.fur)
    eye(r, hx + 3, hy - 0.5)
    blush1(r, hx + 3.6, hy + 2)
    if (b.mouth === 'grin' && !sleep) {
      const mx = Math.round(p.X(hx + 4.5))
      const my = Math.round(p.Y(hy + 3))
      p.stamp(mx - 1, my, r.hd ? ['kkk', 'wkw'] : ['k'], { k: '#6e2433', w: '#ffffff' })
    } else if (r.mouth === 'open') mouthSide(r, hx + 5.5, hy + 2.8)
    b.after?.(r, hx, hy)
  } else {
    const back = f === 'up'
    const l1 = r.walk === 1 ? -1.5 : 0
    const l2 = r.walk === 3 ? -1.5 : 0
    p.fill(p.ell(-3.2, -1.2 + l1, 2.4, 1.4), b.fur)
    p.fill(p.ell(3.2, -1.2 + l2, 2.4, 1.4), b.fur)
    if (back) p.fill(p.circ(0, -3.5, 1.8), b.fur)
    p.fill(p.ell(0, sleep ? -5 : -6.5, sleep ? 6.5 : 5.5, sleep ? 4.6 : 5.6), b.fur, { hl: p.ell(-2, sleep ? -8 : -10.5, 2.3, 1.2) })
    if (!back) p.fill(p.ell(0, sleep ? -4 : -5.8, 3.4, 3.8), b.belly, { line: null, clip: [T.body], shade: false })
    for (const s of [-1, 1]) {
      if (sleep) continue
      const up = armUp && (!b.dance || r.a !== 'idle' || (s > 0) === (r.fr % 2 === 0))
      const end: [number, number] = up ? [s * 8, -17.5] : [s * 6, -5 + s * swing]
      p.fill(p.tube([[s * 4, -10, 1.4], [end[0], end[1], 1.3]]), b.fur)
    }
    for (const s of [-1, 1]) ear(s * 4.6, hy - 4.6, s, !back)
    setHead(r, 0, hy, 6.8, 6)
    p.fill(p.ell(0, hy, 6.8, 6), b.fur, { tag: T.head, hl: p.ell(-2.5, hy - 3.8, 2.5, 1) })
    if (!back) {
      if (b.face) p.fill(p.ell(0, hy + 1, 5, 4.4), b.face, { line: null, clip: [T.head], shade: false })
      eyes2(r, 2.6, hy - 0.2)
      blush2(r, 4.3, hy + 2)
      if (b.mouth === 'grin' && !sleep) {
        const c = p.W / 2
        const my = Math.round(p.Y(hy + 2.8))
        p.stamp(c - (r.hd ? 3 : 1), my, r.hd ? ['kkkkkk', 'kwkwkw', '.kkkk.'] : ['kk'], { k: '#6e2433', w: '#ffffff' })
      } else snoutFront(r, hy + 1.8, b.belly.d, 'cat')
    }
    b.after?.(r, 0, hy)
  }
  if (r.happy && r.air) heart(r, f === 'side' ? 12 : 10, r.hy - r.hry - 3)
  p.oy = 0
  p.ox = 0
}

const PBEAR = mat('#f2c97a', '#d9a756', '#ffe3a8', '#9a6a2e')
SPECIES.butter_bear = {
  draw: (r) =>
    biped(r, {
      fur: PBEAR,
      belly: mat('#fff3d6', '#f0d9b0'),
      ears: 'round',
      earIn: '#ffb3cf',
      dance: true,
      after: (rr, hx, hy) => {
        const p = rr.p
        if (rr.f === 'up') return
        // a blue ribbon on one ear
        const rx = rr.f === 'side' ? hx - 1 : 5
        const bx = Math.round(p.X(rx))
        const by = Math.round(p.Y(hy - 6.5))
        p.stamp(bx - 2, by - 1, rr.hd ? ['bb.bb', 'bBbBb', 'bb.bb'] : ['b.b', '.b.'], { b: '#6fb8f0', B: '#bfe0ff' }, false, T.deco)
      },
    }),
}

const BBOX = mat('#c7a58a', '#a8866c', '#e0c4a8', '#6e4a35')
SPECIES.blindbox_monster = {
  draw: (r) =>
    biped(r, {
      fur: BBOX,
      belly: mat('#f1dcc6', '#dcc2a8'),
      face: mat('#f6e6d4', '#e6d0b8'),
      ears: 'bunny',
      earIn: '#ffb3cf',
      mouth: 'grin',
    }),
}

// --- Baby elephant in elephant pants (ช้างน้อยใส่กางเกงช้าง) ------------------------------

const PANTS = mat('#d8435f', '#a8304a', '#f07a8f', '#6e1a2e')
SPECIES.chang_noi = {
  draw: (r) => {
    elephant(r, { skin: ELE, ear: mat('#a2a8bd', '#858aa3', '#c9cfe0', '#5f647c'), earIn: '#f0b8c4', toe: '#e8ecf5' })
    const p = r.p
    p.oy = r.bob
    // baggy red elephant pants over the legs and the lower tummy
    const top = r.sleep ? -3.5 : r.f === 'side' ? -8.5 : -7.5
    p.fill(p.rect(-20, top, 20, 0.5), PANTS, { clip: [T.body], line: null, tag: T.deco, shade: false })
    const k = r.hd ? 2 : 1
    const wy = Math.round(p.Y(top))
    for (let x = 0; x < p.W; x++) {
      if (p.tagAt(x, wy) !== T.deco) continue
      p.px(x, wy, GOLD.b, T.deco)
      if (r.hd) p.px(x, wy + 1, GOLD.d, T.deco)
    }
    // tiny gold elephants (dots) on the fabric, darker hem
    for (let y = wy + 2 * k; y < p.H; y++)
      for (let x = 0; x < p.W; x++) {
        if (p.tagAt(x, y) !== T.deco || p.c[y * p.W + x] !== PANTS.b) continue
        if ((Math.floor(x / k) + Math.floor(y / k) * 2) % 5 === 0 && Math.floor(y / k) % 2 === 0) p.px(x, y, GOLD.b, T.deco)
      }
    p.oy = 0
  },
}

// --- Betta in a water bubble (ปลากัด) ----------------------------------------------------

const BETTA = mat('#e8304a', '#b8203a', '#ff7a8a', '#7a1024')
const BFIN = mat('#e8406a', '#6a5ae8', '#ff9ab0', '#3a2a9a')
SPECIES.betta = {
  shadow: 6,
  icon: 'side',
  draw: (r) => {
    const p = r.p
    hover(r, 6)
    const cy = -12
    const s = r.walk >= 0 ? [0, 1, 0, -1][r.walk] : r.br ? 0.8 : r.air ? -1 : 0
    const back = r.f === 'up'
    const m = r.f === 'side' ? 1 : back ? -1 : 1
    const X = (x: number) => x * m
    // flowing tail and fins
    p.fill(union(p.tube([[X(-2), cy, 1.6], [X(-5.5), cy - 2.5 + s, 2.6], [X(-7.5), cy - 4.5 + s * 1.4, 1.6]]), p.tube([[X(-2), cy, 1.6], [X(-5.5), cy + 2.5 + s, 2.6], [X(-7.5), cy + 4 + s * 1.4, 1.6]]), p.poly([[X(-2.5), cy - 1.5], [X(-7.8), cy - 4.8 + s * 1.4], [X(-6.5), cy + s], [X(-7.8), cy + 4.4 + s * 1.4], [X(-2.5), cy + 1.5]])), BFIN, { tag: T.wing })
    p.fill(p.poly([[X(-2), cy - 1.8], [X(0), cy - 5.5 + s * 0.4], [X(2.5), cy - 2]]), BFIN, { tag: T.wing })
    p.fill(p.poly([[X(-2.5), cy + 1.6], [X(-1), cy + 5.5 + s * 0.4], [X(2), cy + 1.8]]), BFIN, { tag: T.wing })
    p.fill(p.ell(X(1), cy, 4.4, 2.8), BETTA, { hl: p.ell(X(1.5), cy - 1.5, 2.4, 0.7) })
    setHead(r, X(2.5), cy, 2.5, 2.4)
    if (!back) {
      eye(r, X(3), cy - 0.5, '#5a3a60', m < 0)
      blush1(r, X(3.2), cy + 1)
    }
    if (r.hd) scales(r, BETTA, T.body, r.fr)
    // the water bubble around the fish (drawn as a ring; the inside is tinted in post)
    const ring = (x: number, y: number) => {
      const d = Math.hypot(x - p.X(0), y - p.Y(cy))
      return d <= p.S(9) && d >= p.S(9) - (r.hd ? 1.2 : 0.8)
    }
    p.fill(ring, mat('#bfeaff', '#8fd4f5', '#ffffff', '#5fb0d8'), { line: null, shade: false, tag: T.fx })
    if (r.happy && r.air) heart(r, 10, cy - 11)
    r.lift = p.oy
    p.oy = 0
  },
  post: (ctx, r) => {
    const p = r.p
    const cx = p.X(0)
    const cy = p.Y(-12) + (r.lift ?? 0)
    const rad = p.S(9) - 0.5
    ctx.fillStyle = 'rgba(150, 215, 255, 0.28)'
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++)
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < rad - 0.6) ctx.fillRect(x, y, 1, 1)
    // glossy highlight and a rising mini bubble
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    const hx = Math.round(cx - rad * 0.55)
    const hy = Math.round(cy - rad * 0.55)
    ctx.fillRect(hx, hy, 1, r.hd ? 2 : 1)
    if (r.hd) ctx.fillRect(hx + 1, hy - 1, 2, 1)
    const up = (r.fr % 2) * (r.hd ? 2 : 1)
    ctx.fillStyle = 'rgba(220, 245, 255, 0.9)'
    ctx.fillRect(Math.round(cx + rad * 0.35), Math.round(cy - rad * 0.2) - up, 1, 1)
  },
}

/** Waterline (design units above the ground) for the swim animation. */
const SWIM_LINE = -5

// ---------------------------------------------------------------------------
// Rendering entry points

function render(id: string, facing: PetFacing, anim: PetAnim, frame: number, k: number, shadow = true): Sprite {
  const p = new Pnt(k)
  const r = makeRig(p, facing, anim, frame)
  const sp = SPECIES[id] ?? SPECIES.bangkaew
  sp.draw(r)
  const wl = Math.round(p.Y(SWIM_LINE))
  if (r.swim) for (let y = wl; y < p.H; y++) for (let x = 0; x < p.W; x++) p.c[y * p.W + x] = null
  p.outline()
  const canvas = p.canvas(
    sp.shadow && shadow
      ? (ctx) => {
          // soft ground shadow under the hovering pet (shrinks as it rises)
          const lift = r.air ? 0.8 : r.walk === 2 ? 0.9 : 1
          const rx = p.S(sp.shadow!) * lift
          const ry = Math.max(1, p.S(1.6))
          const cx = p.W / 2
          const cy = p.G - ry + 0.5
          ctx.fillStyle = SHADOW
          for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
            for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
              const u = (x + 0.5 - cx) / rx
              const v = (y + 0.5 - cy) / ry
              if (u * u + v * v <= 1) ctx.fillRect(x, y, 1, 1)
            }
        }
      : undefined,
  )
  const ctx = canvas.getContext('2d')!
  sp.post?.(ctx, r)
  if (r.swim) {
    // water around the paddling pet: a translucent band with ripples and splashes
    let x0 = p.W
    let x1 = -1
    for (let x = 0; x < p.W; x++) if (p.c[(wl - 1) * p.W + x] !== null) ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)))
    if (x1 >= 0) {
      const pad = r.hd ? 4 : 2
      ctx.fillStyle = 'rgba(94, 190, 235, 0.55)'
      ctx.fillRect(x0 - pad, wl, x1 - x0 + 1 + pad * 2, Math.min(r.hd ? 4 : 2, p.H - wl))
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      for (let x = x0 - pad; x <= x1 + pad; x++) if ((x + r.fr * 2) % (r.hd ? 5 : 3) === 0) ctx.fillRect(x, wl, 1, 1)
      const sx = r.f === 'side' ? x1 + 1 : r.fr % 2 ? x0 - 1 : x1 + 1
      ctx.fillRect(sx, wl - (r.hd ? 2 : 1) - (r.fr % 2), 1, 1)
      if (r.hd) ctx.fillRect(sx + (r.fr % 2 ? -2 : 2), wl - 3, 1, 1)
    }
  }
  return { canvas, w: canvas.width, h: canvas.height }
}

/**
 * A pet frame. Side views face right (pass `flip` for left). The frame is
 * PET_BASE × scale; draw it bottom-centred on the pet's ground position:
 * `(x - w / 2, y - h + 1)`.
 */
export function petSprite(
  id: string,
  facing: PetFacing,
  anim: PetAnim,
  frame: number,
  opts: { flip?: boolean; scale?: 1 | 2 } = {},
): Sprite {
  const scale = opts.scale ?? 1
  const fr = ((frame % FRAMES[anim]) + FRAMES[anim]) % FRAMES[anim]
  const key = `pet:${id}:${facing}:${anim}:${fr}:${scale}`
  const s = cached(key, () => render(id, facing, anim, fr, scale))
  return opts.flip ? cached(key + ':f', () => flipSprite(s)) : s
}

/** ~24×24 thumbnail for shop cards and slots. */
export function petIcon(id: string): Sprite {
  return cached(`pet:icon:${id}`, () => {
    const facing = SPECIES[id]?.icon ?? 'down'
    const N = 24
    // Paint a little larger than the world sprite, then crop to the pet and
    // centre it in the slot; fall back to a smaller paint if it won't fit.
    for (const k of [1.5, 1.35, 1.2]) {
      const s = render(id, facing, 'idle', 0, k, false)
      const data = s.canvas.getContext('2d')!.getImageData(0, 0, s.w, s.h).data
      let x0 = s.w
      let y0 = s.h
      let x1 = -1
      let y1 = -1
      for (let y = 0; y < s.h; y++)
        for (let x = 0; x < s.w; x++)
          if (data[(y * s.w + x) * 4 + 3] > 0) {
            x0 = Math.min(x0, x)
            y0 = Math.min(y0, y)
            x1 = Math.max(x1, x)
            y1 = Math.max(y1, y)
          }
      const bw = x1 - x0 + 1
      const bh = y1 - y0 + 1
      if (x1 < 0 || ((bw > N || bh > N) && k > 1.2)) continue
      const c = createCanvas(N, N)
      c.getContext('2d')!.drawImage(s.canvas, x0, y0, bw, bh, Math.floor((N - bw) / 2), Math.ceil((N - bh) / 2), bw, bh)
      return { canvas: c, w: N, h: N }
    }
    return render(id, facing, 'idle', 0, 1.2, false)
  })
}

/** Ids that have art (for dev tooling / sanity checks). */
export function petArtIds(): string[] {
  return Object.keys(SPECIES)
}
