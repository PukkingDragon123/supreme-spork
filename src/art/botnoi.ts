// บอทน้อย (Bot Noi): the player's little robot helper. Painted procedurally
// in two sizes: a 15×19 world sprite that hovers next to the player and a
// 37×46 portrait for the tutorial speech bubbles.
//
// Look: a chubby cream "rice-ball" head with a navy screen face (glowing
// mint pixel eyes), saffron ear pods, a lotus-bud antenna whose tip glows,
// a little ปิ่นโต (tiffin-carrier) body with a saffron band, tiny mitten
// arms and a hover-jet flame. Expressions live on the screen.

import { createCanvas } from '../engine/pixel'
import { cached, spriteDataUrl, type Sprite } from '../engine/sprite'
import { P } from './palette'

export type BotExpr = 'normal' | 'happy' | 'blink' | 'surprised' | 'think' | 'love' | 'sleepy' | 'wink' | 'dizzy' | 'sorry' | 'scan'
export type BotArm = 'down' | 'wave' | 'point' | 'cheer'

export const BOT_EXPRS: BotExpr[] = ['normal', 'happy', 'blink', 'surprised', 'think', 'love', 'sleepy', 'wink', 'dizzy', 'sorry', 'scan']
export const BOT_ARMS: BotArm[] = ['down', 'wave', 'point', 'cheer']

export interface BotLook {
  expr?: BotExpr
  arm?: BotArm
  /** Jet flame frame 0..2. */
  flame?: number
  /** Antenna tip lit up. */
  glow?: boolean
  /** Mouth open (talking). */
  talk?: boolean
  /** Animation phase for moving expressions (dizzy, scan). */
  phase?: number
  /** Face left instead of right. */
  flip?: boolean
}

// ---------------------------------------------------------------------------
// Colours

const C = {
  ink: P.ink,
  shellHi: '#ffffff',
  shell: '#fbf3e3',
  shellS: '#e6d6bd',
  shellD: '#c9b393',
  screen: '#233052',
  screenHi: '#34457a',
  screenD: '#18223d',
  eye: '#7ff3dd',
  eyeHi: '#e4fff9',
  eyeD: '#3fbfae',
  heart: '#ff6f9f',
  heartHi: '#ffc2d6',
  blush: '#ff9fb8',
  saf: '#ffa53a',
  safS: '#e0761c',
  safHi: '#ffd592',
  bud: '#ff86b0',
  budHi: '#ffd6e6',
  budS: '#d9588a',
  budGlow: '#fff0f6',
  leaf: '#6cc56a',
  leafS: '#3f9a4e',
  metal: '#a9aec4',
  metalS: '#6f7593',
  metalHi: '#dfe3f0',
  flame: ['#fff7c2', '#ffd24a', '#ff8a3a', '#e8513a'],
  sweat: '#8fd3ff',
  z: '#dfe8ff',
}

// ---------------------------------------------------------------------------
// Raster with part tags and an ink outline pass

type Col = string | null

class Raster {
  c: Col[]
  tag: Uint8Array
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.c = new Array(w * h).fill(null)
    this.tag = new Uint8Array(w * h)
  }
  in(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }
  put(x: number, y: number, c: Col, tag = 1) {
    x = Math.round(x)
    y = Math.round(y)
    if (!this.in(x, y) || !c) return
    this.c[y * this.w + x] = c
    this.tag[y * this.w + x] = tag
  }
  get(x: number, y: number): Col {
    return this.in(x, y) ? this.c[y * this.w + x] : null
  }
  tagAt(x: number, y: number) {
    return this.in(x, y) ? this.tag[y * this.w + x] : 0
  }
  /** Paint every pixel whose centre passes `test`. */
  fill(test: (x: number, y: number) => boolean, col: (x: number, y: number) => Col, tag = 1) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (test(x + 0.5, y + 0.5)) this.put(x, y, col(x, y), tag)
  }
  rows(rows: string[], ox: number, oy: number, pal: Record<string, string>, tag = 1) {
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const k = r[i]
        if (k !== '.' && k !== ' ' && pal[k]) this.put(ox + i, oy + j, pal[k], tag)
      }
    })
  }
  mirror(fromX: number) {
    // copy the left half onto the right half (x > fromX mirrors x < fromX)
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < fromX; x++) {
        const m = 2 * fromX - x
        if (!this.in(m, y)) continue
        this.c[y * this.w + m] = this.c[y * this.w + x]
        this.tag[y * this.w + m] = this.tag[y * this.w + x]
      }
  }
  /** Canvas with a 1px ink outline around every pixel whose tag is in `solid`. */
  toCanvas(ink: string | null, glowTags: number[] = []): HTMLCanvasElement {
    const W = this.w + 2
    const H = this.h + 2
    const cv = createCanvas(W, H)
    const ctx = cv.getContext('2d')!
    const solid = (x: number, y: number) => this.in(x, y) && !!this.c[y * this.w + x] && !glowTags.includes(this.tag[y * this.w + x])
    if (ink) {
      ctx.fillStyle = ink
      for (let y = -1; y <= this.h; y++)
        for (let x = -1; x <= this.w; x++) {
          if (this.get(x, y)) continue
          if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ctx.fillRect(x + 1, y + 1, 1, 1)
        }
    }
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.c[y * this.w + x]
        if (!c) continue
        ctx.fillStyle = c
        ctx.fillRect(x + 1, y + 1, 1, 1)
      }
    return cv
  }
}

const T = { shell: 1, screen: 2, face: 3, saf: 4, arm: 5, metal: 6, bud: 7, flame: 8, fx: 9 }

function flipCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height)
  const ctx = c.getContext('2d')!
  ctx.translate(src.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(src, 0, 0)
  return c
}

/** Soft sphere shading for a shell pixel at normalised (u, v) in -1..1. */
function shellShade(u: number, v: number): string {
  const r = u * u + v * v
  const l = -u * 0.55 - v * 0.85
  if (l > 0.5 && r < 0.55) return C.shellHi
  if (r > 0.62 && l < -0.25) return C.shellD
  if (l < -0.2 || (r > 0.78 && l < 0.2)) return C.shellS
  return C.shell
}

const lookKey = (o: BotLook) => `${o.expr ?? 'normal'}:${o.arm ?? 'down'}:${(o.flame ?? 0) % 3}:${o.glow ? 1 : 0}:${o.talk ? 1 : 0}:${(o.phase ?? 0) % 4}:${o.flip ? 1 : 0}`

// ---------------------------------------------------------------------------
// World sprite (13×17 inside a 1px outline → 15×19)

export const BOT_W = 15
export const BOT_H = 19

function worldRaster(o: BotLook): Raster {
  const r = new Raster(13, 17)
  const expr = o.expr ?? 'normal'
  const arm = o.arm ?? 'down'
  const ph = o.phase ?? 0

  // Antenna: lotus-bud tip on a little metal stalk.
  r.put(6, 0, o.glow ? C.budGlow : C.bud, T.bud)
  r.put(5, 1, C.bud, T.bud)
  r.put(6, 1, o.glow ? C.budHi : C.bud, T.bud)
  r.put(7, 1, C.budS, T.bud)
  r.put(6, 2, C.metal, T.metal)

  // Body (ปิ่นโต) with a saffron band, nozzle below.
  const body: [number, number, number][] = [
    [11, 3, 9],
    [12, 3, 9],
    [13, 4, 8],
  ]
  for (const [y, a, b] of body)
    for (let x = a; x <= b; x++) {
      const band = y === 12
      const c = band ? (x === b ? C.safS : x === a ? C.safHi : C.saf) : x === b ? C.shellS : y === 13 ? (x === a ? C.shell : C.shellS) : x === a ? C.shellHi : C.shell
      r.put(x, y, c, band ? T.saf : T.shell)
    }
  r.put(6, 11, C.heart, T.face)
  r.put(5, 14, C.metalHi, T.metal)
  r.put(6, 14, C.metal, T.metal)
  r.put(7, 14, C.metalS, T.metal)

  // Head: a rounded 11×8 block.
  const head: [number, number, number][] = [
    [3, 3, 9],
    [4, 2, 10],
    [5, 1, 11],
    [6, 1, 11],
    [7, 1, 11],
    [8, 1, 11],
    [9, 2, 10],
    [10, 3, 9],
  ]
  for (const [y, a, b] of head)
    for (let x = a; x <= b; x++) {
      const u = (x + 0.5 - 6.5) / 5.6
      const v = (y + 0.5 - 7) / 4.4
      r.put(x, y, shellShade(u, v), T.shell)
    }
  // Ear pods.
  for (const x of [0, 12]) {
    r.put(x, 6, x === 0 ? C.safHi : C.saf, T.saf)
    r.put(x, 7, x === 0 ? C.saf : C.safS, T.saf)
  }
  // Screen face.
  const scr: [number, number, number][] = [
    [5, 4, 8],
    [6, 3, 9],
    [7, 3, 9],
    [8, 4, 8],
  ]
  for (const [y, a, b] of scr) for (let x = a; x <= b; x++) r.put(x, y, y === 5 && x < 6 ? C.screenHi : C.screen, T.screen)
  // Cheeks.
  if (expr !== 'dizzy' && expr !== 'sorry') {
    r.put(2, 8, C.blush, T.face)
    r.put(10, 8, C.blush, T.face)
  }

  // Eyes (two 2×2 slots at x 4-5 and 7-8, rows 6-7).
  const E = (x: number, y: number, c = C.eye) => r.put(x, y, c, T.face)
  const pair = (fn: (x0: number, side: 0 | 1) => void) => {
    fn(4, 0)
    fn(7, 1)
  }
  switch (expr) {
    case 'happy':
      pair((x) => (E(x - 1, 7), E(x, 6), E(x + 1, 6), E(x + 2, 7)))
      break
    case 'blink':
    case 'sleepy':
      pair((x) => (E(x, 7, C.eyeD), E(x + 1, 7, C.eyeD)))
      break
    case 'surprised':
      pair((x) => (E(x, 6, C.eyeHi), E(x + 1, 6), E(x, 7), E(x + 1, 7)))
      E(6, 8, C.eye)
      break
    case 'think':
      pair((x) => E(x + 1, 6, C.eyeHi))
      break
    case 'love':
      pair((x) => (E(x - 1, 6, C.heart), E(x + 1, 6, C.heart), E(x - 1 + 1, 7, C.heart), E(x, 6, C.heartHi)))
      break
    case 'wink':
      E(3, 7), E(4, 6), E(5, 6), E(6, 7)
      E(7, 6, C.eyeHi), E(8, 6), E(7, 7), E(8, 7)
      break
    case 'dizzy':
      pair((x) => (ph % 2 ? (E(x + 1, 6), E(x, 7)) : (E(x, 6), E(x + 1, 7))))
      break
    case 'sorry':
      pair((x, side) => (side ? (E(x + 1, 6), E(x, 7), E(x + 1, 7)) : (E(x, 6), E(x, 7), E(x + 1, 7))))
      break
    case 'scan': {
      const sx = 3 + (ph % 4) * 2
      for (let y = 5; y <= 8; y++) if (r.tagAt(sx, y) === T.screen) E(sx, y, y === 6 || y === 7 ? C.eyeHi : C.eye)
      break
    }
    default:
      pair((x) => (E(x, 6, C.eyeHi), E(x + 1, 6), E(x, 7), E(x + 1, 7)))
  }
  if (o.talk && expr !== 'surprised') E(6, 8, C.eye)

  // Arms (tiny mittens) on the body's sides.
  const A = (x: number, y: number, c = C.shell) => r.put(x, y, c, T.arm)
  const left = arm === 'cheer' ? 'up' : 'down'
  const right = arm === 'wave' || arm === 'cheer' ? 'up' : arm === 'point' ? 'out' : 'down'
  if (left === 'down') (A(2, 11, C.shellHi), A(2, 12, C.shellS))
  else (A(2, 10, C.shellHi), A(2, 11, C.shell), A(1, 9, C.shellHi))
  if (right === 'down') (A(10, 11, C.shell), A(10, 12, C.shellS))
  else if (right === 'up') (A(10, 10, C.shell), A(10, 11, C.shellS), A(11, 9, C.shellHi))
  else (A(10, 11, C.shell), A(11, 11, C.shell), A(12, 11, C.shellHi), A(10, 12, C.shellS))

  // Jet flame (drawn without outline).
  const f = (o.flame ?? 0) % 3
  const F = (x: number, y: number, i: number) => r.put(x, y, C.flame[i], T.flame)
  if (f === 0) (F(5, 15, 1), F(6, 15, 0), F(7, 15, 1), F(6, 16, 2))
  else if (f === 1) (F(5, 15, 2), F(6, 15, 1), F(7, 15, 2), F(6, 16, 1))
  else (F(6, 15, 0), F(5, 15, 1), F(7, 15, 1), F(5, 16, 2), F(7, 16, 3))
  return r
}

/** World sprite (15×19). Anchor: bottom centre of the flame. */
export function botnoiSprite(o: BotLook = {}): Sprite {
  return cached(`botnoi:w:${lookKey(o)}`, () => {
    const r = worldRaster({ ...o, flip: false })
    let cv = r.toCanvas(C.ink, [T.flame])
    if (o.flip) cv = flipCanvas(cv)
    return { canvas: cv, w: cv.width, h: cv.height }
  })
}

// ---------------------------------------------------------------------------
// Portrait (35×46 inside a 1px outline → 37×48)

export const BOT_PORTRAIT_W = 37
export const BOT_PORTRAIT_H = 48

function portraitRaster(o: BotLook): Raster {
  const W = 35
  const r = new Raster(W, 46)
  const cx = 17
  const expr = o.expr ?? 'normal'
  const arm = o.arm ?? 'down'
  const ph = o.phase ?? 0

  // --- antenna: lotus bud with sepals on a metal stalk
  const bud = ['..h..', '.hBb.', 'hBBbs', 'BBBbs', '.Bbs.', '..s..']
  r.rows(bud, cx - 2, 0, { h: o.glow ? C.budGlow : C.budHi, B: o.glow ? C.budHi : C.bud, b: C.bud, s: C.budS }, T.bud)
  r.rows(['l...l', 'LlmlL'], cx - 2, 5, { l: C.leaf, L: C.leafS, m: C.metalHi }, T.bud)
  r.put(cx, 7, C.metalHi, T.metal)
  r.put(cx, 8, C.metal, T.metal)
  r.put(cx + 1, 8, C.metalS, T.metal)

  // --- body (ปิ่นโต): two tiers with a saffron band and a heart light
  const bodyTop = 31
  for (let y = bodyTop; y <= 39; y++) {
    const inset = y === bodyTop ? 2 : y === 39 ? 2 : y === 38 ? 1 : 0
    for (let x = 11 + inset; x <= 23 - inset; x++) {
      const band = y === 34 || y === 35
      const u = (x + 0.5 - 17.5) / 6.5
      let c: string
      if (band) c = x >= 22 - inset ? C.safS : x <= 12 ? C.safHi : C.saf
      else c = x >= 22 - inset ? C.shellS : u < -0.55 && y < 34 ? C.shellHi : y >= 38 ? C.shellS : C.shell
      r.put(x, y, c, band ? T.saf : T.shell)
    }
  }
  // tier seam and the little heart light on the lid
  for (let x = 12; x <= 22; x++) if (r.tagAt(x, 36) === T.shell) r.put(x, 36, x === 22 ? C.shellD : C.shellS, T.shell)
  r.rows(['h.h', 'hhh', '.h.'], 16, 32, { h: C.heart }, T.face)
  r.put(16, 32, C.heartHi, T.face)
  // nozzle
  r.rows(['mMMMs', '.mMs.'], 15, 40, { m: C.metalHi, M: C.metal, s: C.metalS }, T.metal)

  // --- head: a squircle 27×22
  const hx = cx + 0.5
  const hy = 20
  const rx = 13.6
  const ry = 11.2
  r.fill(
    (x, y) => Math.pow(Math.abs(x - hx) / rx, 2.6) + Math.pow(Math.abs(y - hy) / ry, 2.6) <= 1,
    (x, y) => shellShade((x + 0.5 - hx) / rx, (y + 0.5 - hy) / ry),
    T.shell,
  )
  // ear pods
  for (const side of [-1, 1] as const) {
    const ex = side < 0 ? 2.5 : W - 2.5
    r.fill(
      (x, y) => Math.pow((x - ex) / 2.6, 2) + Math.pow((y - 20.5) / 4.2, 2) <= 1,
      (x, y) => {
        const u = (x + 0.5 - ex) / 2.6
        const v = (y + 0.5 - 20.5) / 4.2
        return -u * 0.4 - v * 0.9 > 0.45 ? C.safHi : u * side > 0.35 || v > 0.55 ? C.safS : C.saf
      },
      T.saf,
    )
    r.put(side < 0 ? 2 : W - 3, 20, C.safHi, T.saf)
    r.put(side < 0 ? 2 : W - 3, 21, C.safS, T.saf)
  }
  // screen face: rounded rect with a gloss streak
  const sx0 = 8
  const sx1 = 26
  const sy0 = 13
  const sy1 = 26
  const rad = 4
  r.fill(
    (x, y) => {
      if (x < sx0 || x > sx1 + 1 || y < sy0 || y > sy1 + 1) return false
      const qx = Math.max(sx0 + rad - x, 0, x - (sx1 + 1 - rad))
      const qy = Math.max(sy0 + rad - y, 0, y - (sy1 + 1 - rad))
      return qx * qx + qy * qy <= rad * rad
    },
    (x, y) => (y === sy0 || x === sx0 ? C.screenD : y === sy1 || x === sx1 ? C.screenD : C.screen),
    T.screen,
  )
  for (const [x, y] of [
    [11, 15],
    [12, 15],
    [13, 15],
    [10, 16],
    [10, 17],
  ] as [number, number][])
    r.put(x, y, C.screenHi, T.screen)
  // cheeks glow on the screen
  if (expr !== 'dizzy' && expr !== 'sorry' && expr !== 'scan') {
    for (const x of [10, 11, 23, 24]) r.put(x, 23, C.blush, T.face)
  }

  // --- expressions
  const E = (x: number, y: number, c = C.eye) => {
    if (r.tagAt(x, y) === T.screen || r.tagAt(x, y) === T.face) r.put(x, y, c, T.face)
  }
  const L = 11 // left eye x0 (eyes are 4 wide: 11-14 and 20-23)
  const R = 20 // right eye x0
  const EY = 17 // eye top
  const normalEye = (x0: number) => {
    for (let y = EY; y <= EY + 4; y++)
      for (let x = x0; x <= x0 + 3; x++) {
        const corner = (y === EY || y === EY + 4) && (x === x0 || x === x0 + 3)
        if (!corner) E(x, y, (x === x0 || x === x0 + 1) && (y === EY + 1 || y === EY) ? C.eyeHi : y === EY + 4 ? C.eyeD : C.eye)
      }
  }
  /** ^ shaped closed eye over a 4-wide slot. */
  const arc = (x0: number) => {
    for (const [x, y] of [
      [x0 - 1, EY + 3],
      [x0, EY + 2],
      [x0 + 1, EY + 1],
      [x0 + 2, EY + 1],
      [x0 + 3, EY + 2],
      [x0 + 4, EY + 3],
    ])
      E(x, y)
  }
  const mouth = (kind: 'smile' | 'o' | 'flat' | 'open' | 'wobble' | 'cat') => {
    const m = 17
    const y = 24
    if (kind === 'smile') [[m - 1, y - 1], [m, y], [m + 1, y - 1]].forEach(([x, yy]) => E(x, yy))
    else if (kind === 'o') {
      for (const [x, yy] of [[m, y - 2], [m - 1, y - 1], [m + 1, y - 1], [m - 1, y], [m + 1, y], [m, y + 1]]) E(x, yy)
    } else if (kind === 'flat') [[m - 1, y], [m, y], [m + 1, y]].forEach(([x, yy]) => E(x, yy, C.eyeD))
    else if (kind === 'open') {
      ;[[m - 1, y - 1], [m, y - 1], [m + 1, y - 1], [m - 1, y], [m + 1, y]].forEach(([x, yy]) => E(x, yy))
      E(m, y, C.heart)
    } else if (kind === 'wobble') [[m - 2, y], [m - 1, y - 1], [m, y], [m + 1, y - 1], [m + 2, y]].forEach(([x, yy]) => E(x, yy, C.eyeD))
    else [[m - 2, y - 1], [m - 1, y], [m, y - 1], [m + 1, y], [m + 2, y - 1]].forEach(([x, yy]) => E(x, yy))
  }
  const heart = (x0: number) => {
    const rows = ['.h..h.', 'hHhhhh', 'hhhhhh', '.hhhh.', '..hh..']
    rows.forEach((row, j) => {
      for (let i = 0; i < 6; i++) if (row[i] !== '.') E(x0 - 1 + i, EY + j, row[i] === 'H' ? C.heartHi : C.heart)
    })
  }
  const ring = (x0: number) => {
    for (let x = x0; x <= x0 + 3; x++) (E(x, EY), E(x, EY + 4))
    for (let y = EY + 1; y <= EY + 3; y++) (E(x0 - 1, y), E(x0 + 4, y))
    E(x0 + 1, EY + 2, C.eyeHi)
    E(x0 + 2, EY + 2, C.eye)
  }
  /** A little spiral around (cx, EY + 2), rotated by `turn` quarter turns. */
  const spiral = (cx: number, turn: number) => {
    const pts = [
      [0, 0],
      [1, 0],
      [1, -1],
      [0, -2],
      [-1, -1],
      [-2, 0],
      [-1, 1],
      [0, 2],
      [1, 2],
      [2, 1],
      [2, 0],
    ]
    for (const [px, py] of pts) {
      let dx = px
      let dy = py
      for (let k = 0; k < turn % 4; k++) [dx, dy] = [-dy, dx]
      E(cx + dx, EY + 2 + dy)
    }
  }
  switch (expr) {
    case 'happy':
      arc(L)
      arc(R)
      mouth(o.talk ? 'open' : 'cat')
      break
    case 'blink':
      for (const x0 of [L, R]) for (let x = x0; x <= x0 + 3; x++) E(x, EY + 3, C.eye)
      mouth(o.talk ? 'open' : 'smile')
      break
    case 'sleepy':
      for (const x0 of [L, R]) for (let x = x0 - 1; x <= x0 + 4; x++) E(x, EY + 3, C.eyeD)
      mouth('flat')
      // a little "z" in the corner
      r.rows(['zzz', '.z.', 'zzz'], 22, 14, { z: C.z }, T.face)
      break
    case 'surprised':
      ring(L)
      ring(R)
      mouth('o')
      break
    case 'think':
      for (const x0 of [L + 1, R + 1])
        for (let y = EY - 1; y <= EY + 2; y++)
          for (let x = x0; x <= x0 + 2; x++) {
            const corner = (y === EY - 1 || y === EY + 2) && (x === x0 || x === x0 + 2)
            if (!corner) E(x, y, x === x0 && y === EY ? C.eyeHi : C.eye)
          }
      mouth('flat')
      E(13, 24, C.eyeD)
      break
    case 'love':
      heart(L)
      heart(R)
      mouth(o.talk ? 'open' : 'cat')
      break
    case 'wink':
      arc(L)
      normalEye(R)
      mouth(o.talk ? 'open' : 'cat')
      break
    case 'dizzy':
      spiral(L + 1, ph)
      spiral(R + 2, ph + 2)
      mouth('wobble')
      break
    case 'sorry':
      for (const [x, y] of [
        [L, EY],
        [L + 1, EY + 1],
        [L + 2, EY + 2],
        [L + 1, EY + 3],
        [L, EY + 4],
      ])
        E(x, y)
      for (const [x, y] of [
        [R + 3, EY],
        [R + 2, EY + 1],
        [R + 1, EY + 2],
        [R + 2, EY + 3],
        [R + 3, EY + 4],
      ])
        E(x, y)
      mouth('wobble')
      // sweat drop on the shell
      r.rows(['.s', 'ss', 'sw'], 28, 9, { s: C.sweat, w: '#ffffff' }, T.fx)
      break
    case 'scan': {
      const sx = sx0 + 2 + ((ph % 4) * 14) / 3
      for (let y = sy0 + 1; y < sy1; y++) {
        E(Math.round(sx), y, C.eyeHi)
        E(Math.round(sx) + 1, y, C.eye)
        E(Math.round(sx) - 1, y, C.eyeD)
      }
      break
    }
    default:
      normalEye(L)
      normalEye(R)
      mouth(o.talk ? 'open' : 'smile')
  }

  // --- arms: stubby capsule arms ending in round mittens
  const capsule = (x0: number, y0: number, x1: number, y1: number, rad: number) => {
    const dx = x1 - x0
    const dy = y1 - y0
    const len2 = dx * dx + dy * dy || 1
    r.fill(
      (px, py) => {
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2))
        return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t)) <= rad
      },
      (px, py) => {
        const t = Math.max(0, Math.min(1, ((px + 0.5 - x0) * dx + (py + 0.5 - y0) * dy) / len2))
        const ox = px + 0.5 - (x0 + dx * t)
        const oy = py + 0.5 - (y0 + dy * t)
        return ox * -0.6 + oy * -0.8 > rad * 0.35 ? C.shellHi : ox * 0.6 + oy * 0.8 > rad * 0.3 ? C.shellS : C.shell
      },
      T.arm,
    )
  }
  const mitt = (x: number, y: number) => {
    r.fill(
      (px, py) => Math.hypot(px - x, py - y) <= 2.1,
      (px, py) => (px + 0.5 - x < -0.5 && py + 0.5 - y < -0.2 ? C.shellHi : px + 0.5 - x > 0.7 || py + 0.5 - y > 0.8 ? C.shellS : C.shell),
      T.arm,
    )
  }
  const leftUp = arm === 'cheer'
  const rightUp = arm === 'wave' || arm === 'cheer'
  if (leftUp) (capsule(10.5, 33, 6.5, 28.5, 1.3), mitt(6, 27.5))
  else (capsule(10.5, 33, 8.5, 36, 1.3), mitt(8, 37))
  if (rightUp) (capsule(24.5, 33, 28.5, 28.5, 1.3), mitt(29, 27.5))
  else if (arm === 'point') {
    capsule(24.5, 33, 30, 32.5, 1.3)
    mitt(30.5, 32.5)
    r.put(33, 32, C.shell, T.arm)
    r.put(34, 32, C.shellHi, T.arm)
  } else (capsule(24.5, 33, 26.5, 36, 1.3), mitt(27, 37))

  // --- flame
  const f = (o.flame ?? 0) % 3
  const flames = [
    ['.bab.', '.bab.', '.cbc.', '..c..'],
    ['.cbc.', '.bab.', '..b..', '..d..'],
    ['.bab.', '.aab.', 'cb.bc', '.c.d.'],
  ][f]
  r.rows(flames, 15, 42, { a: C.flame[0], b: C.flame[1], c: C.flame[2], d: C.flame[3] }, T.flame)
  return r
}

/** Portrait (37×48) with a full-body pose for speech bubbles and menus. */
export function botnoiPortrait(o: BotLook = {}): Sprite {
  return cached(`botnoi:p:${lookKey(o)}`, () => {
    const r = portraitRaster(o)
    let cv = r.toCanvas(C.ink, [T.flame])
    if (o.flip) cv = flipCanvas(cv)
    return { canvas: cv, w: cv.width, h: cv.height }
  })
}

const urlCache = new Map<string, string>()

/** Data URL of the portrait, integer-scaled. */
export function botnoiPortraitUrl(o: BotLook = {}, scale = 2): string {
  const k = `${lookKey(o)}@${scale}`
  let u = urlCache.get(k)
  if (!u) {
    u = spriteDataUrl(botnoiPortrait(o), scale)
    urlCache.set(k, u)
  }
  return u
}

/** Data URL of the world sprite, integer-scaled (small UI icons). */
export function botnoiSpriteUrl(o: BotLook = {}, scale = 2): string {
  const k = `w:${lookKey(o)}@${scale}`
  let u = urlCache.get(k)
  if (!u) {
    u = spriteDataUrl(botnoiSprite(o), scale)
    urlCache.set(k, u)
  }
  return u
}

/** Head-only icon (the world sprite cropped above the body), for pills and badges. */
export function botnoiHeadIcon(expr: BotExpr = 'happy'): Sprite {
  return cached(`botnoi:head:${expr}`, () => {
    const s = botnoiSprite({ expr, glow: true })
    const h = 13
    const c = createCanvas(s.w, h)
    c.getContext('2d')!.drawImage(s.canvas, 0, 0, s.w, h, 0, 0, s.w, h)
    return { canvas: c, w: s.w, h }
  })
}

export const BOTNOI_COLORS = C
