// Tiny animated pixel illustrations for chant meaning cards
// ("ความหมายของบทนี้"). Everything is drawn in code on a 104×60 canvas and
// shown at an integer scale. `focus` lights up the parts a verse is about.

import type { Surface } from '../engine/pixel'
import { mix } from '../engine/pixel'
import type { ChantArt } from '../game/data/chants'
import { buddhaSculpt, deitySculpt, softGlow } from './hall'
import { avatarSprite, DEFAULT_LOOK, type AvatarLook, type Pose } from './avatar'
import { petSprite } from './pets'

export const ART_W = 104
export const ART_H = 60

export interface ArtState {
  t: number
  /** Parts to highlight (null = animate through all of them). */
  focus: number[] | null
  look?: AvatarLook
}

type Draw = (g: Surface, s: ArtState) => void

const W = ART_W
const H = ART_H
const TAU = Math.PI * 2
const sin = Math.sin
const cos = Math.cos
const on = (s: ArtState, i: number, n: number, period = 1.6) => (s.focus ? s.focus.includes(i) : Math.floor(s.t / period) % n === i)
const lit = (s: ArtState, i: number) => (s.focus ? s.focus.includes(i) : true)

function sky(g: Surface, stops: string[]) {
  g.gradientV(0, 0, W, H, stops, 12)
}

function floor(g: Surface, y: number, a: string, b: string) {
  g.rect(0, y, W, H - y, a)
  for (let x = (y * 3) % 7; x < W; x += 7) g.px(x, y + 2, b)
  g.hline(0, W, y, b)
}

function candle(g: Surface, x: number, y: number, t: number, seed: number) {
  g.rect(x - 1, y - 6, 2, 6, '#fff4dc')
  g.px(x, y - 6, '#e8d8b8')
  const f = sin(t * 12 + seed) > 0 ? 1 : 0
  g.px(x, y - 8 - f, '#ffd24a')
  g.px(x, y - 7, '#ff9a2a')
  softGlow(g, x, y - 8, 7, 0.55, '#ffb050')
}

function lotus(g: Surface, x: number, y: number, open: number, c = '#f59ab8', c2 = '#fbd0de') {
  const r = 2 + open * 2
  g.poly(
    [
      [x - r - 1, y],
      [x, y - 3 - open * 2],
      [x + r + 1, y],
    ],
    c,
  )
  g.poly(
    [
      [x - 2, y],
      [x, y - 5 - open * 2],
      [x + 2, y],
    ],
    c2,
  )
  g.hline(x - r - 1, x + r + 1, y, '#3f8a3a')
}

function smoke(g: Surface, x: number, y: number, t: number) {
  for (let i = 0; i < 6; i++) {
    const k = (t * 0.6 + i / 6) % 1
    g.alpha(0.6 * (1 - k))
    g.px(Math.round(x + sin(k * 7 + i) * 2), Math.round(y - k * 16), '#f4eef6')
  }
  g.alpha(1)
}

function heart(g: Surface, x: number, y: number, c = '#ff5c8a', hi = '#ffc2d4') {
  const rows = ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...']
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] === 'x') g.px(x - 3 + i, y - 3 + j, c)
  })
  g.px(x - 2, y - 2, hi)
}

function tinyBuddha(g: Surface, x: number, y: number, glow = 0.5) {
  // A 7×8 seated Buddha, bottom-centred on (x, y).
  softGlow(g, x, y - 5, 6, glow, '#ffd98a')
  const rows = ['...x...', '..xxx..', '..xxx..', '.xxxxx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', 'xxxxxxx']
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] === 'x') g.px(x - 3 + i, y - 8 + j, j < 3 ? '#ffe38a' : j === 7 ? '#b36a22' : '#eaaa36')
  })
  g.px(x, y - 8, '#fff8d8')
}

function buddha(g: Surface, cx: number, seatY: number, s: number) {
  const b = buddhaSculpt('sukhothai', s)
  g.draw(b.canvas, Math.round(cx) - b.ox, Math.round(seatY) - b.oy)
}

function person(g: Surface, x: number, y: number, pose: Pose, s: ArtState, view: 'back' | 'front' | 'side' = 'back', flip = false) {
  const spr = avatarSprite(s.look ?? DEFAULT_LOOK, view, pose, { barefoot: true, flip })
  g.draw(spr.canvas, Math.round(x - spr.w / 2), Math.round(y - spr.h))
}

function gem(g: Surface, x: number, y: number, c: string, dark: string, light: string, glow: number) {
  if (glow > 0) softGlow(g, x, y, 10 + glow * 4, 0.3 + glow * 0.6, light)
  g.poly(
    [
      [x - 5, y - 1],
      [x - 3, y - 4],
      [x + 3, y - 4],
      [x + 5, y - 1],
      [x, y + 5],
    ],
    c,
  )
  g.poly(
    [
      [x - 5, y - 1],
      [x + 5, y - 1],
      [x, y + 5],
    ],
    dark,
  )
  g.hline(x - 2, x + 1, y - 3, light)
  g.px(x - 2, y - 2, '#ffffff')
  if (glow > 0.5) g.px(x + 3, y - 5, '#ffffff')
}

// ---------------------------------------------------------------------------

const bow: Draw = (g, s) => {
  sky(g, ['#3a1a24', '#5e2a2e', '#7a3a30'])
  softGlow(g, W / 2, 18, 30, 0.35 + 0.1 * sin(s.t * 1.4), '#ffd98a')
  g.rect(W / 2 - 15, 33, 30, 4, '#8c4a1c')
  g.hline(W / 2 - 15, W / 2 + 14, 33, '#b36a22')
  g.rect(W / 2 - 18, 37, 36, 3, '#62301a')
  buddha(g, W / 2, 34, 0.33)
  floor(g, 40, '#7a4a30', '#8e5a3a')
  candle(g, 22, 40, s.t, 1)
  candle(g, W - 22, 40, s.t, 2)
  smoke(g, 32, 38, s.t)
  g.rect(31, 38, 3, 2, '#b8742a')
  lotus(g, 72, 39, 0.6)
  // Three bows, then a short rest.
  const cyc = s.t % 4.6
  const k = cyc < 3.9 ? (cyc % 1.3) / 1.3 : 0
  const pose: Pose = k < 0.15 ? 'kneel' : k < 0.4 ? 'wai' : k < 0.8 ? 'bow' : 'wai'
  person(g, W / 2, H + 3, pose, s)
  if (cyc < 3.9 && k > 0.4 && k < 0.8) {
    const n = Math.floor(cyc / 1.3)
    for (let i = 0; i <= n; i++) softGlow(g, W / 2 - 4 + i * 4, 44, 3, 0.9, '#fff3a6')
  }
}

const GEM_COLORS: [string, string, string][] = [
  ['#f7c84c', '#b36a22', '#fff3b0'],
  ['#7fd0e8', '#2f7a9a', '#e0f8ff'],
  ['#f47a8a', '#a8344a', '#ffd6de'],
]

const gems: Draw = (g, s) => {
  sky(g, ['#23163a', '#3a2450', '#5a3060'])
  for (let i = 0; i < 14; i++) {
    const x = (i * 37) % W
    const y = (i * 23) % 30
    if (sin(s.t * 2 + i) > 0.3) g.px(x, y, '#fff6d0')
  }
  // Lotus seat.
  const cx = W / 2
  g.ellipse(cx, 50, 30, 5, '#3f8a3a')
  for (let i = -3; i <= 3; i++) lotus(g, cx + i * 8, 50, 0.4, '#f59ab8', '#fbd0de')
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * 22
    const f = lit(s, i) ? 1 : 0.15
    const bob = lit(s, i) ? Math.round(sin(s.t * 2 + i) * 1.5) : 0
    const y = 34 + bob - (i === 1 ? 4 : 0)
    const [c, d, l] = GEM_COLORS[i]
    if (f < 0.5) gem(g, x, y, mix(c, '#3a2450', 0.55), mix(d, '#3a2450', 0.55), mix(l, '#3a2450', 0.5), 0)
    else {
      gem(g, x, y, c, d, l, 0.6 + 0.4 * sin(s.t * 3 + i))
      // Flame tips (Triratna).
      const fl = sin(s.t * 10 + i * 2) > 0 ? 1 : 0
      g.px(x, y - 7 - fl, '#ffd24a')
      g.px(x, y - 6, '#ff9a2a')
    }
  }
}

/** 9×9 icons for the nine virtues of the Buddha. */
function virtueIcon(g: Surface, i: number, x: number, y: number, c: string, d: string) {
  switch (i) {
    case 0: // pure: lotus
      lotus(g, x, y + 3, 0.5, c, '#fff8e0')
      break
    case 1: // self-enlightened: sun
      g.circle(x, y, 2.5, c)
      for (let k = 0; k < 8; k++) g.px(Math.round(x + cos((k / 8) * TAU) * 4), Math.round(y + sin((k / 8) * TAU) * 4), c)
      break
    case 2: // knowledge and conduct: open book
      g.poly(
        [
          [x - 4, y - 2],
          [x, y - 1],
          [x + 4, y - 2],
          [x + 4, y + 3],
          [x, y + 4],
          [x - 4, y + 3],
        ],
        c,
      )
      g.vline(x, y - 1, y + 4, d)
      break
    case 3: // well-gone: footprints
      g.ellipse(x - 2, y + 1, 1.3, 2.4, c)
      g.ellipse(x + 2, y - 2, 1.3, 2.4, c)
      break
    case 4: // knower of worlds: globe
      g.circle(x, y, 3.5, c)
      g.hline(x - 3, x + 3, y, d)
      g.vline(x, y - 3, y + 3, d)
      break
    case 5: // trainer: wheel (charioteer)
      g.circle(x, y, 3.5, c)
      g.circle(x, y, 2, '#2a1a30')
      g.px(x, y, c)
      for (let k = 0; k < 4; k++) g.line(x, y, x + Math.round(cos((k / 4) * TAU + 0.78) * 3), y + Math.round(sin((k / 4) * TAU + 0.78) * 3), c)
      break
    case 6: // teacher of gods and humans: crown over a person
      g.rect(x - 1, y - 1, 3, 3, c)
      g.rect(x - 2, y + 2, 5, 3, c)
      g.px(x - 2, y - 3, c)
      g.px(x, y - 4, c)
      g.px(x + 2, y - 3, c)
      break
    case 7: // awakened: open eye
      g.ellipse(x, y, 4, 2, c)
      g.circle(x, y, 1.2, d)
      break
    default: // blessed: star
      g.poly(
        [
          [x, y - 4],
          [x + 1.3, y - 1],
          [x + 4, y - 1],
          [x + 2, y + 1],
          [x + 3, y + 4],
          [x, y + 2],
          [x - 3, y + 4],
          [x - 2, y + 1],
          [x - 4, y - 1],
          [x - 1.3, y - 1],
        ],
        c,
      )
  }
}

const virtues: Draw = (g, s) => {
  sky(g, ['#2a1630', '#482440', '#6a3446'])
  const cx = W / 2
  softGlow(g, cx, 30, 22, 0.4, '#ffd98a')
  buddha(g, cx, 49, 0.3)
  g.rect(cx - 12, 49, 24, 3, '#8c4a1c')
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI
    const x = Math.round(cx + cos(a) * 42)
    const y = Math.round(40 + sin(a) * 30)
    const hot = on(s, i, 9, 0.9)
    if (hot) softGlow(g, x, y, 9, 0.7 + 0.2 * sin(s.t * 4), '#ffe38a')
    g.circle(x, y, 6, hot ? '#6a3a1c' : '#3a2030')
    virtueIcon(g, i, x, y, hot ? '#ffe38a' : '#8a6a70', hot ? '#b36a22' : '#5a4050')
  }
  floor(g, 52, '#5a3040', '#6a3a4a')
}

const dhamma: Draw = (g, s) => {
  sky(g, ['#16284a', '#24406a', '#3a5a80'])
  const cx = W / 2
  const cy = 28
  softGlow(g, cx, cy, 24, 0.45, '#ffe7a0')
  const rot = s.t * 0.6
  g.circle(cx, cy, 13, '#d38a2a')
  g.circle(cx, cy, 11, '#24406a')
  g.circle(cx, cy, 3, '#f7c84c')
  for (let k = 0; k < 8; k++) {
    const a = rot + (k / 8) * TAU
    g.thickLine(cx, cy, cx + cos(a) * 11, cy + sin(a) * 11, 1.6, '#f7c84c')
    g.circle(cx + cos(a) * 13, cy + sin(a) * 13, 1.2, '#ffe38a')
  }
  g.rect(cx - 3, 41, 6, 9, '#b36a22')
  g.rect(cx - 8, 50, 16, 3, '#8c4a1c')
  // Six virtues orbit as stars.
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU - s.t * 0.25
    const x = cx + cos(a) * 22
    const y = cy + sin(a) * 18
    const hot = on(s, i, 6, 0.9)
    if (hot) softGlow(g, x, y, 6, 0.8, '#fff3b0')
    g.px(x, y, hot ? '#ffffff' : '#7a8ab0')
    if (hot) {
      g.px(x - 1, y, '#fff3b0')
      g.px(x + 1, y, '#fff3b0')
      g.px(x, y - 1, '#fff3b0')
      g.px(x, y + 1, '#fff3b0')
    }
  }
  // Two deer of the Deer Park.
  const deer = (x: number, flip: boolean) => {
    const d = flip ? -1 : 1
    g.rect(x - 4, 44, 8, 4, '#c98a54')
    g.rect(x + d * 3, 40, 2, 5, '#c98a54')
    g.rect(x + d * 3 + (flip ? -1 : 0), 39, 3, 2, '#c98a54')
    g.px(x + d * 4, 37, '#8a5a30')
    g.px(x + d * 5, 36, '#8a5a30')
    for (const lx of [-3, -1, 1, 3]) g.vline(x + lx, 48, 51, '#8a5a30')
    g.px(x - d * 4, 44, '#fff4dc')
  }
  deer(20, false)
  deer(W - 20, true)
  floor(g, 52, '#3f6a3a', '#4f7a44')
}

function monk(g: Surface, x: number, y: number, t: number, lit = 1) {
  const step = Math.floor(t * 4) % 2
  const robe = lit > 0.5 ? '#e8892a' : '#a86a3a'
  const dark = lit > 0.5 ? '#b8621c' : '#7a4a2a'
  g.rect(x - 1, y - 13, 3, 3, '#c98a64')
  g.px(x - 1, y - 13, '#b07050')
  g.rect(x - 2, y - 10, 5, 8, robe)
  g.vline(x - 2, y - 10, y - 3, dark)
  g.rect(x - 1, y - 2, 1 + step, 2, dark)
  g.rect(x + 1, y - 2, 2 - step, 2, dark)
  g.rect(x + 2, y - 8, 3, 3, '#3a2a28')
  g.hline(x + 2, x + 4, y - 8, '#6a5a58')
}

const sangha: Draw = (g, s) => {
  sky(g, ['#ffc890', '#ffe0b0', '#fff1d8'])
  softGlow(g, 16, 14, 14, 0.8, '#fff3c0')
  g.circle(16, 14, 5, '#fff3c0')
  g.poly(
    [
      [0, 30],
      [26, 20],
      [52, 28],
      [78, 18],
      [W, 28],
      [W, 32],
      [0, 32],
    ],
    '#8ab86a',
  )
  g.rect(0, 32, W, 14, '#e8c890')
  g.hline(0, W, 32, '#c9a676')
  for (let x = 3; x < W; x += 9) g.px(x, 38 + (x % 3), '#d8b478')
  const phase = s.focus ? s.focus[0] : Math.floor(s.t / 3) % 3
  const n = phase === 0 ? 4 : 8
  for (let i = 0; i < n; i++) {
    const pair = Math.floor(i / 2)
    const x = ((s.t * 6 + (phase === 0 ? i * 16 : pair * 22 + (i % 2) * 8)) % (W + 20)) - 10
    monk(g, x, 44, s.t + i * 0.3, 1)
  }
  // Field of merit.
  const grow = phase === 2 ? 1 : 0.25
  g.rect(0, 46, W, H - 46, '#8ab85a')
  for (let x = 2; x < W; x += 4) {
    const h = Math.round(2 + grow * (4 + sin(x + s.t * 2) * 1.5))
    g.vline(x, H - 1 - h - 6, H - 7, phase === 2 ? '#4f9a3a' : '#6aa04a')
    if (phase === 2 && x % 8 === 2) g.px(x, H - 8 - h, '#ffd24a')
  }
  g.rect(0, H - 6, W, 6, '#6a8a3a')
}

const heartSelf: Draw = (g, s) => {
  sky(g, ['#3a2a50', '#5a3a6a', '#7a4a70'])
  const cx = W / 2
  const lvl = s.focus ? s.focus[0] : Math.floor(s.t / 2) % 3
  for (let r = 0; r < 3; r++) {
    const k = (s.t * 0.5 + r / 3) % 1
    g.alpha((1 - k) * 0.5)
    const rad = 6 + k * (18 + lvl * 8)
    for (let a = 0; a < 40; a++) g.px(cx + cos((a / 40) * TAU) * rad, 34 + sin((a / 40) * TAU) * rad * 0.8, '#ffb0c8')
    g.alpha(1)
  }
  softGlow(g, cx, 34, 16 + lvl * 4, 0.5, '#ff9ab8')
  person(g, cx, 52, 'sit', s, 'front')
  heart(g, cx, 36 + Math.round(sin(s.t * 3) * 0.5))
  floor(g, 52, '#4a3050', '#5a3a60')
  lotus(g, 20, 52, 0.7)
  lotus(g, W - 20, 52, 0.7)
}

const metta: Draw = (g, s) => {
  sky(g, ['#ffd0dc', '#ffe0e6', '#fff0f0'])
  const cx = W / 2
  const cy = 26
  const lvl = s.focus ? s.focus[0] : 2
  for (let r = 0; r < 3; r++) {
    const k = (s.t * 0.45 + r / 3) % 1
    g.alpha((1 - k) * 0.7)
    const rad = 6 + k * 46
    for (let a = 0; a < 64; a++) g.px(cx + cos((a / 64) * TAU) * rad, cy + sin((a / 64) * TAU) * rad * 0.62, '#ff7aa0')
    g.alpha(1)
  }
  softGlow(g, cx, cy, 12, 0.7, '#ffb0c8')
  heart(g, cx, cy + Math.round(sin(s.t * 3)))
  g.rect(0, 46, W, H - 46, '#9ac27a')
  g.hline(0, W, 46, '#7aa05a')
  // Beings around: they light up (little hearts) as a wave reaches them.
  const beings: { x: number; y: number; kind: 'dog' | 'cat' | 'bird' | 'p1' | 'p2' | 'rabbit' }[] = [
    { x: 14, y: 55, kind: 'dog' },
    { x: 90, y: 55, kind: 'cat' },
    { x: 30, y: 57, kind: 'p1' },
    { x: 74, y: 57, kind: 'p2' },
    { x: 52, y: 58, kind: 'rabbit' },
    { x: 84, y: 20, kind: 'bird' },
  ]
  const shown = lvl === 0 ? 2 : lvl === 1 ? 4 : 6
  beings.slice(0, shown).forEach((b, i) => {
    const f = Math.floor(s.t * 3 + i) % 2
    if (b.kind === 'dog') g.draw(petSprite('bangkaew', 'side', 'idle', f).canvas, b.x - 10, b.y - 20)
    else if (b.kind === 'cat') g.draw(petSprite('siamese', 'side', 'idle', f, { flip: true }).canvas, b.x - 10, b.y - 20)
    else if (b.kind === 'rabbit') g.draw(petSprite('jaderabbit', 'down', 'idle', f).canvas, b.x - 10, b.y - 20)
    else if (b.kind === 'bird') g.draw(petSprite('hornbill', 'side', 'walk', f, { flip: true }).canvas, b.x - 10, b.y - 20)
    else person(g, b.x, b.y, 'happy', { ...s, look: b.kind === 'p1' ? { ...DEFAULT_LOOK, gender: 'f', hair: 'hair_long' } : DEFAULT_LOOK }, 'front')
    const d = Math.hypot((b.x - cx) / 1, (b.y - 10 - cy) / 0.62)
    const k = ((s.t * 0.45 * 46 - (d - 6)) / 46) % (1 / 3)
    if (k >= 0 && k < 0.12) heart(g, b.x, b.y - 24 - Math.round(k * 30), '#ff5c8a')
  })
}

function silaIcon(g: Surface, i: number, x: number, y: number, hot: boolean) {
  const c = hot ? '#ffe38a' : '#9a8a70'
  const d = hot ? '#b36a22' : '#6a5a48'
  switch (i) {
    case 0: // life: a fish swimming free
      g.ellipse(x - 1, y, 4, 2.2, hot ? '#ff9a4a' : c)
      g.poly(
        [
          [x + 2, y],
          [x + 5, y - 3],
          [x + 5, y + 3],
        ],
        hot ? '#ff9a4a' : c,
      )
      g.px(x - 3, y - 1, '#2a1a10')
      break
    case 1: // honesty with things: coin pouch
      g.ellipse(x, y + 1, 4, 3.5, c)
      g.rect(x - 2, y - 4, 4, 2, d)
      g.px(x, y + 1, d)
      break
    case 2: // faithfulness: two joined hearts
      heart(g, x - 2, y, hot ? '#ff5c8a' : c, hot ? '#ffc2d4' : c)
      break
    case 3: // truthful speech: speech bubble with a tick
      g.rect(x - 4, y - 3, 9, 6, c)
      g.px(x - 3, y + 3, c)
      g.line(x - 2, y, x, y + 1, d)
      g.line(x, y + 1, x + 3, y - 2, d)
      break
    default: // no intoxicants: bottle crossed out
      g.rect(x - 1, y - 4, 2, 2, c)
      g.rect(x - 2, y - 2, 4, 6, c)
      g.line(x - 4, y + 4, x + 4, y - 4, hot ? '#e0503a' : d)
  }
}

const sila: Draw = (g, s) => {
  sky(g, ['#f3e2c0', '#f7ead0', '#fbf2e0'])
  g.rect(6, 12, W - 12, 36, '#fff8e8')
  g.frame(6, 12, W - 12, 36, '#c9a676')
  g.rect(3, 10, 4, 40, '#b8742a')
  g.rect(W - 7, 10, 4, 40, '#b8742a')
  for (let i = 0; i < 5; i++) {
    const x = 18 + i * 17
    const hot = on(s, i, 5)
    if (hot) softGlow(g, x, 28, 10, 0.5 + 0.2 * sin(s.t * 4), '#ffd98a')
    g.circle(x, 28, 7, hot ? '#7a4a1c' : '#e8dcc4')
    silaIcon(g, i, x, 28 + (hot ? Math.round(sin(s.t * 4) * 0.6) : 0), hot)
    // Numbered dot under each.
    for (let k = 0; k <= i; k++) g.px(x - i + k * 2, 40, hot ? '#b36a22' : '#c9b89a')
  }
  // A shield of five virtues.
  const sx = W / 2
  const lit5 = s.focus ? s.focus.length : 1
  g.poly(
    [
      [sx - 6, 50],
      [sx + 6, 50],
      [sx + 6, 55],
      [sx, 59],
      [sx - 6, 55],
    ],
    lit5 ? '#6fc15a' : '#9a8a70',
  )
  g.line(sx - 3, 54, sx - 1, 56, '#fff8e8')
  g.line(sx - 1, 56, sx + 3, 52, '#fff8e8')
}

function deity(id: 'ganesha' | 'guanyin' | 'lakshmi'): Draw {
  return (g, s) => {
    const bg = id === 'ganesha' ? ['#5a1a1a', '#8a2a1a', '#b8481a'] : id === 'guanyin' ? ['#1a3a4a', '#2a5a6a', '#4a7a8a'] : ['#4a1a3a', '#7a2a5a', '#a84a7a']
    sky(g, bg)
    const cx = W / 2
    softGlow(g, cx, 26, 26, 0.45 + 0.1 * sin(s.t * 1.5), id === 'guanyin' ? '#d8f4ff' : '#ffd98a')
    const d = deitySculpt(id, 0.62)
    g.draw(d.canvas, Math.round(cx) - d.ox, 50 - d.oy)
    floor(g, 50, id === 'guanyin' ? '#2a4a5a' : '#6a2a2a', id === 'guanyin' ? '#3a5a6a' : '#7a3a30')
    if (id === 'ganesha') {
      // Marigolds drifting and laddu offerings.
      for (let i = 0; i < 7; i++) {
        const k = (s.t * 0.25 + i / 7) % 1
        g.circle(8 + ((i * 29) % (W - 16)), k * 50, 1.3, i % 2 ? '#ffb020' : '#ff8a1a')
      }
      for (let i = 0; i < 3; i++) g.circle(20 + i * 5, 52, 2, '#f7a84a')
      for (let i = 0; i < 3; i++) g.circle(W - 30 + i * 5, 52, 2, '#f7a84a')
    } else if (id === 'guanyin') {
      // Water drops from the willow branch and a lotus pond.
      g.rect(0, 52, W, H - 52, '#3a7a9a')
      for (let i = 0; i < 5; i++) {
        const k = (s.t * 0.8 + i / 5) % 1
        g.px(cx + 12 + sin(i) * 3, 18 + k * 36, '#d8f4ff')
      }
      lotus(g, 20, 56, 0.8, '#fbd0de', '#ffffff')
      lotus(g, W - 20, 56, 0.8, '#fbd0de', '#ffffff')
    } else {
      // Gold coins raining and pink lotus.
      for (let i = 0; i < 8; i++) {
        const k = (s.t * 0.35 + i / 8) % 1
        const x = 6 + ((i * 23) % (W - 12))
        g.circle(x, k * 52, 1.5, '#ffd24a')
        g.px(x, k * 52, '#fff3b0')
      }
      lotus(g, 18, 54, 1, '#f59ab8', '#fbd0de')
      lotus(g, W - 18, 54, 1, '#f59ab8', '#fbd0de')
    }
    smoke(g, 12, 50, s.t)
    smoke(g, W - 12, 50, s.t + 0.5)
  }
}

const jina: Draw = (g, s) => {
  sky(g, ['#1a1030', '#2a1a48', '#3a2458'])
  const cx = W / 2
  const lvl = s.focus ? s.focus[0] : Math.floor(s.t / 2.5) % 4
  // Protective cage of light.
  const pulse = 0.5 + 0.2 * sin(s.t * 2)
  softGlow(g, cx, 36, 30, 0.3 + pulse * 0.3, '#ffd98a')
  g.alpha(0.35)
  for (let a = 0; a < 90; a++) g.px(cx + cos((a / 90) * TAU) * 30, 38 + sin((a / 90) * TAU) * 22, '#ffe7a0')
  for (let k = 0; k < 6; k++) g.line(cx - 30 + k * 12, 38, cx, 14, '#ffe7a0')
  g.alpha(1)
  // A ring of Buddhas circling (28 are named; we show 12).
  const n = 12
  for (let i = 0; i < n; i++) {
    const a = s.t * 0.3 + (i / n) * TAU
    const x = cx + cos(a) * 34
    const y = 38 + sin(a) * 16
    if (sin(a) < 0) tinyBuddha(g, x, y + 4, lvl === 1 ? 0.7 : 0.35)
  }
  person(g, cx, 54, 'wai', s)
  // Where the Buddha, Dhamma, Sangha and the great disciples rest on the body.
  if (lvl === 0) tinyBuddha(g, cx, 16, 0.9)
  if (lvl === 1) for (let i = -2; i <= 2; i++) tinyBuddha(g, cx + i * 9, 20 - Math.abs(i) * 2, 0.6)
  if (lvl === 2) {
    softGlow(g, cx, 28, 5, 0.9, '#fff3b0')
    softGlow(g, cx - 2, 31, 3, 0.9, '#bfe8ff')
    softGlow(g, cx + 2, 31, 3, 0.9, '#bfe8ff')
    softGlow(g, cx, 40, 5, 0.9, '#ffc8a0')
  }
  if (lvl === 3) {
    tinyBuddha(g, cx - 18, 50, 0.7)
    tinyBuddha(g, cx + 18, 50, 0.7)
    softGlow(g, cx, 40, 6, 0.9, '#ffc8e0')
  }
  for (let i = 0; i < n; i++) {
    const a = s.t * 0.3 + (i / n) * TAU
    if (sin(a) >= 0) tinyBuddha(g, cx + cos(a) * 34, 38 + sin(a) * 16 + 4, lvl === 1 ? 0.7 : 0.35)
  }
}

const bahum: Draw = (g, s) => {
  const phase = s.focus ? s.focus[0] : Math.floor(s.t / 3.5) % 2
  const k = phase === 1 ? Math.min(1, (s.t % 3.5) / 1.5) : 0
  sky(g, phase === 0 ? ['#2a1a2a', '#4a2a3a', '#5a3040'] : ['#ffcf8a', '#ffe0a8', '#fff0cc'])
  // Bodhi tree and the Buddha.
  g.circle(24, 16, 15, phase === 0 ? '#2a4a2a' : '#4f9a3a')
  g.circle(12, 22, 9, phase === 0 ? '#2a4a2a' : '#5aa844')
  g.circle(36, 22, 8, phase === 0 ? '#244024' : '#468a34')
  g.rect(22, 24, 4, 20, '#6a4a2a')
  softGlow(g, 24, 36, 16 + k * 20, 0.5 + k * 0.6, '#ffe38a')
  if (phase === 1)
    for (let r = 0; r < 2; r++) {
      const q = (s.t * 0.6 + r / 2) % 1
      g.alpha(0.6 * (1 - q))
      for (let a = 0; a < 48; a++) g.px(24 + cos((a / 48) * TAU) * q * 70, 38 + sin((a / 48) * TAU) * q * 30, '#fff3b0')
      g.alpha(1)
    }
  buddha(g, 24, 51, 0.3)
  floor(g, 51, phase === 0 ? '#3a2a2a' : '#8ab85a', phase === 0 ? '#4a3030' : '#7aa04a')
  // Mara on the elephant Girimekhala, with a thousand arms.
  const ex = phase === 0 ? 84 - ((s.t * 3) % 8) : 80
  const kneel = phase === 1 ? k : 0
  const ey = 50 + Math.round(kneel * 3)
  const hide = phase === 0 ? '#5a5a6a' : '#7a7a8a'
  g.ellipse(ex + 2, ey - 10, 13, 8, hide)
  g.ellipse(ex - 11, ey - 13, 6, 6, hide)
  g.ellipse(ex - 8, ey - 15, 3, 4, phase === 0 ? '#4a4a5a' : '#6a6a7a')
  g.thickLine(ex - 15, ey - 12, ex - 16 - Math.round(kneel * 2), ey - 2, 2.2, hide)
  g.line(ex - 14, ey - 9, ex - 18, ey - 7, '#fff4dc')
  g.px(ex - 12, ey - 15, '#1a1020')
  for (const lx of [-8, -3, 5, 10]) g.rect(ex + lx, ey - 4, 3, 4 - Math.round(kneel * 3), phase === 0 ? '#4a4a5a' : '#6a6a7a')
  g.rect(ex - 2, ey - 19, 10, 3, phase === 0 ? '#8a2a2a' : '#b86a4a')
  const mx = ex + 3
  const my = ey - 26 + Math.round(kneel * 5)
  g.rect(mx - 2, my + 1, 5, 7, phase === 0 ? '#3a1a2a' : '#6a4a5a')
  g.rect(mx - 1, my - 2, 3, 3, phase === 0 ? '#7a8a5a' : '#b0a080')
  g.px(mx, my - 3, '#ffd24a')
  if (phase === 0) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 1.05 + (i / 9) * Math.PI * 1.1 + sin(s.t * 3 + i) * 0.08
      g.line(mx, my + 3, mx + cos(a) * 10, my + 3 + sin(a) * 8, '#7a3040')
      g.px(mx + cos(a) * 11, my + 3 + sin(a) * 9, '#d0d0e0')
    }
  } else {
    // Victory: flowers fall, Mara bows.
    for (let i = 0; i < 10; i++) {
      const q = (s.t * 0.4 + i / 10) % 1
      g.px(10 + ((i * 37) % (W - 20)), q * 48, i % 2 ? '#ffd0e0' : '#fff3b0')
    }
  }
}

const yatha: Draw = (g, s) => {
  const phase = s.focus ? s.focus[0] : Math.floor(s.t / 3) % 3
  sky(g, phase === 2 ? ['#0e1a3a', '#1a2a5a', '#2a3a6a'] : ['#8ac8e8', '#b0dcf0', '#d8f0f8'])
  // Hills with streams.
  g.poly(
    [
      [0, 40],
      [18, 14],
      [40, 36],
      [60, 18],
      [80, 38],
      [0, 38],
    ],
    phase === 2 ? '#2a3a4a' : '#6a9a5a',
  )
  const sea = 40 + (phase === 0 ? 4 - Math.min(4, (s.t % 3) * 2) : 0)
  g.rect(0, sea, W, H - sea, phase === 2 ? '#1a3a6a' : '#3a8ac8')
  for (let x = (Math.floor(s.t * 8) % 6); x < W; x += 6) g.px(x, sea + 2 + (x % 3), phase === 2 ? '#4a6aa0' : '#bfe8ff')
  for (const [x0, y0] of [
    [18, 16],
    [60, 20],
  ]) {
    for (let i = 0; i < 12; i++) {
      const k = (s.t * 0.9 + i / 12) % 1
      const y = y0 + k * (sea - y0)
      g.px(Math.round(x0 + sin(y * 0.4) * 3), Math.round(y), phase === 2 ? '#6a8ac0' : '#e0f6ff')
    }
  }
  if (phase === 1) {
    // Wishes rising as little lights.
    for (let i = 0; i < 6; i++) {
      const k = (s.t * 0.3 + i / 6) % 1
      const x = 20 + i * 13
      softGlow(g, x, sea - k * 36, 4, 0.8 * (1 - k), '#ffd98a')
      g.px(x, sea - k * 36, '#fff3b0')
    }
  }
  if (phase === 2) {
    // The full moon and a shining gem.
    softGlow(g, 82, 14, 14, 0.8, '#fff6d0')
    g.circle(82, 14, 6, '#fff6d0')
    g.px(80, 12, '#e8e0c0')
    g.px(84, 16, '#e8e0c0')
    for (let x = 70; x < 95; x += 2) g.px(x + (Math.floor(s.t * 4) % 2), sea + 4 + ((x * 3) % 5), '#fff6d0')
    gem(g, 30, 30, '#7fd0e8', '#2f7a9a', '#e0f8ff', 0.8 + 0.2 * sin(s.t * 4))
  }
}

const ART: Record<ChantArt, Draw> = {
  bow,
  gems,
  virtues,
  dhamma,
  sangha,
  heart: heartSelf,
  metta,
  sila,
  ganesha: deity('ganesha'),
  guanyin: deity('guanyin'),
  lakshmi: deity('lakshmi'),
  jina,
  bahum,
  yatha,
}

export function drawChantArt(g: Surface, art: ChantArt, st: ArtState) {
  g.reset()
  g.clear()
  ;(ART[art] ?? bow)(g, st)
  g.reset()
  // Soft vignette frame.
  g.alpha(0.25)
  g.hline(0, W, 0, '#000000')
  g.hline(0, W, H - 1, '#000000')
  g.vline(0, 0, H, '#000000')
  g.vline(W - 1, 0, H, '#000000')
  g.alpha(1)
}

/** Captions for the parts an illustration can highlight. */
export const ART_PARTS: Partial<Record<ChantArt, string[]>> = {
  gems: ['พระพุทธ', 'พระธรรม', 'พระสงฆ์'],
  virtues: ['อะระหัง', 'สัมมาสัมพุทโธ', 'วิชชาจะระณะฯ', 'สุคะโต', 'โลกะวิทู', 'อะนุตตะโรฯ', 'สัตถาฯ', 'พุทโธ', 'ภะคะวา'],
  dhamma: ['ตรัสไว้ดี', 'เห็นเอง', 'ไม่จำกัดกาล', 'เชิญมาดู', 'น้อมมาใส่ตัว', 'รู้เฉพาะตน'],
  sila: ['ไม่ฆ่า', 'ไม่ลัก', 'ไม่ผิดกาม', 'ไม่โกหก', 'ไม่เมา'],
}
