// The player's own avatar at work: draws the HD doll in an act_w_* pose at a
// feet position, with optional apron (slipped under the arms), clipping
// behind a counter, face gags (sweat, soot, heart eyes, "><" eyes), grip
// fists over held tools and a thumbs-up. Used by the volunteer jobs and the
// kitchen.

import { createCanvas, mix, Surface } from '../engine/pixel'
import { cached, flipSprite, type Sprite } from '../engine/sprite'
import { DOLL_H, DOLL_W, dollSprite, type DollPose, type DollView } from './doll'
import { lookKey, type AvatarLook } from './avatar'
import { P, SKIN_TONES } from './palette'
import { OUTFIT_BY_ID } from '../game/data/outfits'
import { poseInfo, wristOf, WP as WPOSE, type Side } from './poses/work'

export type FaceFx = 'none' | 'sweat' | 'hearts' | 'sour' | 'soot' | 'dizzy' | 'sparkle'

export interface WorkerDrawOpts {
  view?: DollView
  flip?: boolean
  blink?: boolean
  apron?: boolean
  /** Only draw the rows above this world y (e.g. standing behind a counter). */
  clipY?: number
  face?: FaceFx
  t?: number
}

const INK = P.ink

export interface HandMat {
  l: string
  b: string
  s: string
  d: string
}

/** Skin (or mascot-paw) colours for hands drawn over tools. */
export function handMat(look: AvatarLook): HandMat {
  const paws = look.suit ? OUTFIT_BY_ID[look.suit]?.suit?.paws : undefined
  if (paws) return { l: mix(paws, '#ffffff', 0.3), b: paws, s: mix(paws, INK, 0.2), d: mix(paws, INK, 0.5) }
  const t = SKIN_TONES[look.skin] ?? SKIN_TONES[1]
  return { l: t.l, b: t.b, s: mix(t.b, t.d, 0.6), d: mix(t.d, INK, 0.4) }
}

// ---------------------------------------------------------------------------
// Sprites

const APRON = { main: '#fffaf0', shade: '#eadcc4', edge: '#b39a8c', strap: '#f07a8a', strapD: '#c9536a', pocket: '#ffe0e8' }

/** Doll with a kitchen apron slipped between the body and the arms. */
function apronSprite(look: AvatarLook, pose: DollPose, view: DollView, blink: boolean): Sprite {
  return cached(`wapron:${lookKey(look)}:${pose}:${view}:${blink ? 1 : 0}`, () => {
    const base = dollSprite(look, pose, { view, blink })
    const hasBare = !!poseInfo(pose)
    const bare = hasBare ? dollSprite(look, `${pose}_na` as DollPose, { view, blink }) : base
    const c = createCanvas(base.w, base.h)
    const ctx = c.getContext('2d')!
    ctx.drawImage(bare.canvas, 0, 0)
    if (view === 'front') {
      const solid = ctx.getImageData(0, 0, c.width, c.height).data
      const on = (x: number, y: number) => solid[(y * c.width + x) * 4 + 3] > 20
      const put = (x: number, y: number, col: string) => {
        ctx.fillStyle = col
        ctx.fillRect(x, y, 1, 1)
      }
      // Sprite space = doll + 1.
      const f = look.gender === 'f'
      // Neck straps.
      for (let y = 24; y <= 27; y++) {
        put(f ? 14 : 13, y, APRON.strap)
        put(f ? 19 : 20, y, APRON.strap)
      }
      // Bib.
      for (let y = 28; y <= 33; y++)
        for (let x = 13; x <= 20; x++) {
          if (!on(x, y)) continue
          const edge = x === 13 || x === 20 || y === 28
          put(x, y, edge ? APRON.edge : x >= 19 ? APRON.shade : APRON.main)
        }
      // Waist tie.
      for (let x = 11; x <= 22; x++) if (on(x, 34)) put(x, 34, x % 3 === 0 ? APRON.strapD : APRON.strap)
      // Skirt over the legs.
      for (let y = 35; y <= 44; y++) {
        const k = (y - 35) / 9
        const x0 = Math.round(11 - k)
        const x1 = Math.round(22 + k)
        for (let x = x0; x <= x1; x++) {
          const edge = x === x0 || x === x1 || y === 44
          put(x, y, edge ? APRON.edge : x >= x1 - 2 ? APRON.shade : APRON.main)
        }
      }
      // Pocket with a heart.
      for (let x = 14; x <= 19; x++) put(x, 38, APRON.edge)
      for (let y = 39; y <= 41; y++) {
        put(14, y, APRON.edge)
        put(19, y, APRON.edge)
        for (let x = 15; x <= 18; x++) put(x, y, APRON.pocket)
      }
      put(16, 39, APRON.strap)
      put(17, 40, APRON.strap)
      put(16, 40, APRON.strap)
      put(18, 39, APRON.strap)
      // Skirt outline against the background.
      for (let y = 35; y <= 45; y++) {
        const k = (y - 35) / 9
        const x0 = Math.round(11 - k) - 1
        const x1 = Math.round(22 + k) + 1
        if (y === 45) for (let x = x0 + 1; x < x1; x++) if (!on(x, y)) put(x, y, INK)
        if (!on(x0, y)) put(x0, y, INK)
        if (!on(x1, y)) put(x1, y, INK)
      }
    }
    // Arms (and hands) on top: every pixel where the armed doll differs.
    if (hasBare) {
      const a = base.canvas.getContext('2d')!.getImageData(0, 0, base.w, base.h)
      const b = bare.canvas.getContext('2d')!.getImageData(0, 0, base.w, base.h)
      const out = ctx.getImageData(0, 0, base.w, base.h)
      for (let i = 0; i < a.data.length; i += 4) {
        if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) {
          out.data[i] = a.data[i]
          out.data[i + 1] = a.data[i + 1]
          out.data[i + 2] = a.data[i + 2]
          out.data[i + 3] = a.data[i + 3]
        }
      }
      ctx.putImageData(out, 0, 0)
    }
    return { canvas: c, w: base.w, h: base.h }
  })
}

export function workerSprite(look: AvatarLook, pose: DollPose, opts: WorkerDrawOpts = {}): Sprite {
  const view = opts.view ?? 'front'
  if (!opts.apron) return dollSprite(look, pose, { view, blink: opts.blink, flip: opts.flip })
  const s = apronSprite(look, pose, view, !!opts.blink)
  if (!opts.flip) return s
  return cached(`wapronf:${lookKey(look)}:${pose}:${view}:${opts.blink ? 1 : 0}`, () => flipSprite(s))
}

/** Top-left of the sprite for a feet position. */
export function workerOrigin(x: number, feetY: number): [number, number] {
  return [Math.round(x - DOLL_W / 2), Math.round(feetY - DOLL_H + 1)]
}

/** World position of a pose's wrist. */
export function wristAt(pose: string, side: Side, x: number, feetY: number, flip = false): [number, number] {
  const [ox, oy] = workerOrigin(x, feetY)
  const w = wristOf(pose, flip ? (side === 'L' ? 'R' : 'L') : side) ?? [side === 'L' ? 9 : 24, 33]
  return [ox + (flip ? DOLL_W - w[0] : w[0]), oy + w[1]]
}

/** Draw the worker with its feet at (x, feetY). */
export function drawWorker(g: Surface, look: AvatarLook, pose: DollPose, x: number, feetY: number, opts: WorkerDrawOpts = {}) {
  const s = workerSprite(look, pose, opts)
  const [ox, oy] = workerOrigin(x, feetY)
  if (opts.clipY !== undefined) {
    const rows = Math.max(0, Math.min(s.h, Math.round(opts.clipY) - oy))
    if (rows > 0) g.drawPart(s.canvas, 0, 0, s.w, rows, ox, oy)
  } else g.draw(s.canvas, ox, oy)
  if (opts.face && opts.face !== 'none' && (opts.view ?? 'front') === 'front') drawFaceFx(g, look, ox, oy, opts.face, opts.t ?? 0, !!opts.flip)
}

// ---------------------------------------------------------------------------
// Hands

/** A gripping fist centred on (x, y), drawn over a held tool. */
export function drawFist(g: Surface, look: AvatarLook, x: number, y: number, thumb: 'none' | 'up' = 'none') {
  const m = handMat(look)
  const X = Math.round(x) - 2
  const Y = Math.round(y) - 2
  const rows =
    thumb === 'up'
      ? ['..k..', '.klk.', 'kkbkk', 'kbbbk', 'kbbsk', 'kbbsk', '.kkk.']
      : ['.kkk.', 'klbbk', 'kbbsk', '.kkk.']
  const oy = thumb === 'up' ? -3 : 0
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '.') continue
      g.px(X + i, Y + j + oy, ch === 'k' ? INK : ch === 'l' ? m.l : ch === 's' ? m.s : m.b)
    }
  })
}

// ---------------------------------------------------------------------------
// Face gags (front view). Doll eyes sit at x 10..13 / 18..21, y 15..20.

function facePut(g: Surface, ox: number, oy: number, flip: boolean, x: number, y: number, c: string) {
  // x, y in doll space; +1 for the sprite outline.
  const sx = flip ? DOLL_W - 1 - (x + 1) : x + 1
  g.px(ox + sx, oy + y + 1, c)
}

function coverEyes(g: Surface, look: AvatarLook, ox: number, oy: number, flip: boolean) {
  const t = SKIN_TONES[look.skin] ?? SKIN_TONES[1]
  for (let y = 15; y <= 20; y++)
    for (const x0 of [9, 18])
      for (let x = x0; x < x0 + 5; x++) facePut(g, ox, oy, flip, x, y, t.b)
}

function drawRows(g: Surface, ox: number, oy: number, flip: boolean, x0: number, y0: number, rows: string[], pal: Record<string, string>) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]]
      if (c) facePut(g, ox, oy, flip, x0 + i, y0 + j, c)
    }
  })
}

export function drawFaceFx(g: Surface, look: AvatarLook, ox: number, oy: number, fx: FaceFx, t: number, flip = false) {
  const K = '#2a1a2c'
  switch (fx) {
    case 'sweat': {
      const bob = Math.floor(t * 3) % 2
      drawRows(g, ox, oy, flip, 25, 9 + bob, ['.k.', 'kbk', 'kwk', '.k.'], { k: '#2f6fa8', b: '#9fd9ff', w: '#e6f7ff' })
      break
    }
    case 'hearts': {
      coverEyes(g, look, ox, oy, flip)
      const pal = { r: '#ff4f7b', l: '#ffb3c7', k: '#8e2a4a' }
      const heart = ['.r.r.', 'rlrrr', 'rrrrr', '.rrr.', '..r..']
      drawRows(g, ox, oy, flip, 9, 15, heart, pal)
      drawRows(g, ox, oy, flip, 18, 15, heart, pal)
      break
    }
    case 'sour': {
      coverEyes(g, look, ox, oy, flip)
      drawRows(g, ox, oy, flip, 10, 16, ['kk..', '..kk', 'kk..'], { k: K })
      drawRows(g, ox, oy, flip, 18, 16, ['..kk', 'kk..', '..kk'], { k: K })
      // Wobbly mouth.
      drawRows(g, ox, oy, flip, 13, 21, ['.k.k.k', 'k.k.k.'], { k: '#a8435a' })
      break
    }
    case 'dizzy': {
      coverEyes(g, look, ox, oy, flip)
      const sp = ['kkkk', 'k..k', 'k.kk', 'k...']
      drawRows(g, ox, oy, flip, 10, 16, sp, { k: K })
      drawRows(g, ox, oy, flip, 18, 16, sp, { k: K })
      break
    }
    case 'soot': {
      // Smudges on the cheeks and nose, singed puff of hair, a smoke curl.
      const s1 = '#4a3f48'
      const s2 = '#6d6070'
      for (const [x, y, c] of [
        [7, 19, s1], [8, 19, s2], [8, 20, s1], [9, 18, s2], [23, 18, s2], [24, 19, s1], [23, 20, s2], [22, 19, s1],
        [15, 18, s2], [16, 19, s1], [12, 12, s2], [19, 11, s1], [20, 12, s2],
      ] as [number, number, string][])
        facePut(g, ox, oy, flip, x, y, c)
      drawRows(g, ox, oy, flip, 8, -1, ['..kkk...kkk..', '.kgggk.kgggk.', 'kgglggkggglgk', '.kgggggggggk.'], { k: '#3a3440', g: '#8c8190', l: '#c8c0cc' })
      const up = Math.floor(t * 4) % 3
      drawRows(g, ox, oy, flip, 20 + (up === 1 ? 1 : 0), -6 - up, ['.ww', 'w..', '.w.'], { w: '#d8d0dc' })
      break
    }
    case 'sparkle': {
      if (Math.floor(t * 6) % 2 === 0) {
        drawRows(g, ox, oy, flip, 26, 6, ['.y.', 'yWy', '.y.'], { y: '#ffd54f', W: '#ffffff' })
        drawRows(g, ox, oy, flip, 2, 12, ['.y.', 'yWy', '.y.'], { y: '#ffd54f', W: '#ffffff' })
      } else {
        drawRows(g, ox, oy, flip, 27, 12, ['y'], { y: '#fff3a6' })
        drawRows(g, ox, oy, flip, 3, 6, ['y'], { y: '#fff3a6' })
      }
      break
    }
  }
}

// ---------------------------------------------------------------------------
// Result-card portraits

export type CardMood = 'thumbs' | 'cheer' | 'phew' | 'yum' | 'sour' | 'burnt' | 'taste'

/** The player striking a reaction pose for a result card (DOLL_W+12 × DOLL_H+8). */
export function workerCard(look: AvatarLook, mood: CardMood, frame: 0 | 1 = 0, apron = false): Sprite {
  return cached(`wcard:${lookKey(look)}:${mood}:${frame}:${apron ? 1 : 0}`, () => {
    const W = DOLL_W + 12
    const H = DOLL_H + 8
    const g = new Surface(W, H)
    const pose =
      mood === 'thumbs' || mood === 'yum' ? WPOSE.thumbs : mood === 'cheer' ? WPOSE.cheer : mood === 'phew' ? WPOSE.phew : mood === 'taste' ? WPOSE.taste : WPOSE.oops
    const face: FaceFx = mood === 'yum' ? 'hearts' : mood === 'sour' ? 'sour' : mood === 'burnt' ? 'soot' : mood === 'phew' ? 'sweat' : mood === 'taste' ? 'none' : 'sparkle'
    const hop = frame === 1 && (mood === 'cheer' || mood === 'thumbs' || mood === 'yum') ? 2 : 0
    const feet = H - 3 - hop
    drawWorker(g, look, pose, W / 2, feet, { apron, face, t: frame ? 0.2 : 0, blink: frame === 1 && mood === 'phew' })
    if (mood === 'thumbs' || mood === 'yum') {
      const [wx, wy] = wristAt(pose, 'R', W / 2, feet)
      drawFist(g, look, wx, wy, 'up')
    }
    if (mood === 'taste') {
      // Spoon to the lips.
      const [wx, wy] = wristAt(pose, 'R', W / 2, feet)
      g.thickLine(wx, wy, wx - 3, wy - 5, 2, INK)
      g.line(wx, wy, wx - 3, wy - 5, '#d0d0da')
      g.ellipse(wx - 4, wy - 6, 2, 1.5, '#e4e4ec')
      drawFist(g, look, wx, wy)
    }
    return { canvas: g.canvas, w: W, h: H }
  })
}
