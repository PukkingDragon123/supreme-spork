// Wat Chedi (ไอ้ไข่), Sichon: the child spirit Ai Khai with his topknot and rosy
// cheeks, and the THOUSANDS of fighting-cock statues people bring when their
// wishes come true – every size and colour, packed on terraces – plus red soda
// offerings, soldier dolls and toy guns, the firecracker cage, the giant
// rooster photo spot, the old brick chedi and the souvenir/lottery stalls.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, ROOF, slice, tier } from '../temple'
import { buildProp, hash, BRICK_R, GOLD_R, WHITE_R, type Building } from './south'
import { canopy, LEAVES } from '../garden'

// ---------------------------------------------------------------------------
// Roosters.

export interface RoosterPal {
  B: Color // body
  D: Color // wing
  L: Color // breast
  H: Color // hackle / head
  T: Color // tail
  S: Color // tail sheen
}

export const ROOSTERS: Record<string, RoosterPal> = {
  red: { B: '#c8503c', D: '#8a2a2a', L: '#e07050', H: '#f0a040', T: '#1e3a2e', S: '#3f8a5f' },
  black: { B: '#3a2838', D: '#241824', L: '#5a3d4f', H: '#a0583a', T: '#1a1a24', S: '#4a5a9a' },
  white: { B: '#fffaf0', D: '#e0d8cc', L: '#ffffff', H: '#fff3d0', T: '#f0ece6', S: '#d8d0c8' },
  gold: { B: '#e9a53a', D: '#b8742a', L: '#ffd54f', H: '#fff3a6', T: '#b8742a', S: '#fff3a6' },
  yellow: { B: '#e89a3c', D: '#b8642a', L: '#f5c060', H: '#ffd070', T: '#fffaf0', S: '#e8e0d8' },
  green: { B: '#4a7a4a', D: '#2f5a3a', L: '#6a9a5a', H: '#c8b050', T: '#1e3a2e', S: '#6cc38e' },
  pink: { B: '#ff9fc0', D: '#e8709e', L: '#ffd6e0', H: '#fff0a0', T: '#9270dc', S: '#e2d2ff' },
  blue: { B: '#5a8de0', D: '#3d63b5', L: '#9fd0ff', H: '#ffd23f', T: '#26306e', S: '#8fb6ff' },
}
const ROOSTER_KEYS = Object.keys(ROOSTERS)
/** Weighted choice so real breeds dominate the crowd. */
const CROWD = ['red', 'red', 'red', 'black', 'black', 'white', 'yellow', 'yellow', 'gold', 'gold', 'green', 'pink', 'blue', 'red', 'white']

const MEDIUM = [
  '..........C.....',
  '..SS.....CCC....',
  '.STTS....HHH....',
  'STT.T....HHEY...',
  'ST...T...HHHYY..',
  'T..SS.T..HHC....',
  'T.T..T...HHC....',
  'T.T.T...HHH.....',
  '.TT.T..BHHH.....',
  '..TTBBBBHHHL....',
  '...TBBBBBBLL....',
  '...BDDDDBBLL....',
  '...BBDDDDBLL....',
  '....BBBBBBL.....',
  '......BBB.......',
  '......Y..Y......',
  '......Y..Y......',
  '.....YY.YY......',
]
const SMALL = [
  '.......C...',
  '.S....CHH..',
  'STS...HHEY.',
  'T..T..HHC..',
  'T.T..HHH...',
  '.TT.BHHL...',
  '..TBBBBLL..',
  '..BDDDBL...',
  '...BBBB....',
  '....Y.Y....',
  '....Y.Y....',
  '...YY.YY...',
]
const TINY = ['....C..', '.T..HEY', 'T.T.HC.', 'T.BBH..', '.TBDBL.', '..BBB..', '..Y.Y..', '.YY.YY.']

function paint(g: Surface, x: number, y: number, rows: string[], pal: Record<string, Color>, flip: boolean) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    for (let c = 0; c < row.length; c++) {
      const col = pal[row[c]]
      if (col) g.px(flip ? x + row.length - 1 - c : x + c, y + r, col)
    }
  }
}

function roosterPal(p: RoosterPal): Record<string, Color> {
  return { ...p, C: '#e8514a', E: '#2a1a24', Y: '#f5c030' }
}

/** Draw a rooster statue; (x, y) is the foot point. size 0 tiny · 1 small · 2 medium. */
export function drawRooster(g: Surface, x: number, y: number, size: 0 | 1 | 2, kind: string, flip = false, plinth = false) {
  const pal = roosterPal(ROOSTERS[kind] ?? ROOSTERS.red)
  const rows = size === 2 ? MEDIUM : size === 1 ? SMALL : TINY
  const w = rows[0].length
  const h = rows.length
  // Outline pass (plum), then colour.
  const ink: Record<string, Color> = {}
  for (const k of Object.keys(pal)) ink[k] = P.ink
  const ox = Math.round(x - w / 2)
  const oy = Math.round(y - h + 1) - (plinth ? 2 : 0)
  if (size > 0) {
    paint(g, ox - 1, oy, rows, ink, flip)
    paint(g, ox + 1, oy, rows, ink, flip)
    paint(g, ox, oy - 1, rows, ink, flip)
    paint(g, ox, oy + 1, rows, ink, flip)
  }
  paint(g, ox, oy, rows, pal, flip)
  if (plinth) {
    g.rect(ox + 1, oy + h, w - 2, 2, '#bdb2ae')
    g.hline(ox + 1, ox + w - 2, oy + h, '#e4ddd6')
  }
}

/** Big rooster statue (parametric, for sizes above the pixel sprites). Foot at (x, y), k ≈ height/24. */
export function drawBigRooster(g: Surface, x: number, y: number, k: number, kind: string, flip = false) {
  const p = ROOSTERS[kind] ?? ROOSTERS.red
  const f = flip ? -1 : 1
  const X = (v: number) => x + v * k * f
  const Y = (v: number) => y - v * k
  const ink = P.ink
  const outline = (fn: (o: number, c: Color | null) => void) => {
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      g.ctx.save()
      g.ctx.translate(dx, dy)
      fn(1, ink)
      g.ctx.restore()
    }
    fn(0, null)
  }
  outline((o, c) => {
    // Tail: arcing sickle feathers.
    const feathers: [number, number, number, Color][] = [
      [-4, 11, 1.6, p.T],
      [-6, 13, 1.3, p.S],
      [-8, 11, 1.1, p.T],
      [-7, 8, 1.0, p.S],
    ]
    for (const [tx, ty, th, col] of feathers) {
      const n = 16
      let px = X(-3)
      let py = Y(11)
      for (let i = 1; i <= n; i++) {
        const t = i / n
        const ax = -3 + (tx - 3) * t - Math.sin(t * Math.PI) * 2
        const ay = 11 + Math.sin(t * Math.PI) * (ty - 2) - t * t * (ty - 3)
        const qx = X(ax)
        const qy = Y(ay)
        g.thickLine(px, py, qx, qy, Math.max(1.2, th * k * 1.4 + o * 2), c ?? col)
        px = qx
        py = qy
      }
    }
    // Legs.
    g.thickLine(X(-0.5), Y(6), X(-1), Y(0.5), Math.max(1, 0.9 * k) + o * 2, c ?? '#f5c030')
    g.thickLine(X(1.8), Y(6), X(2.2), Y(0.5), Math.max(1, 0.9 * k) + o * 2, c ?? '#f5c030')
    g.thickLine(X(-2.2), Y(0.3), X(0.4), Y(0.3), Math.max(1, 0.7 * k) + o * 2, c ?? '#e9a53a')
    g.thickLine(X(1.2), Y(0.3), X(3.6), Y(0.3), Math.max(1, 0.7 * k) + o * 2, c ?? '#e9a53a')
    // Body, breast, neck, head.
    g.ellipse(X(0.5), Y(10), 5.6 * k + o, 4.4 * k + o, c ?? p.B)
    g.ellipse(X(3.4), Y(11.5), 3.2 * k + o, 3.8 * k + o, c ?? p.L)
    g.poly(
      [
        [X(1.5), Y(13) + o],
        [X(3.6) + o * f, Y(20)],
        [X(6.4) + o * f, Y(19.5)],
        [X(6.2) + o * f, Y(12)],
      ],
      c ?? p.H,
    )
    g.circle(X(5.2), Y(20.2), 2.2 * k + o, c ?? p.H)
    // Comb and wattle.
    for (const [cx, cy, r] of [
      [4.4, 22.6, 0.9],
      [5.4, 23.1, 1],
      [6.4, 22.5, 0.8],
    ]) g.circle(X(cx), Y(cy), r * k + o, c ?? '#e8514a')
    g.ellipse(X(6.6), Y(17.6), 0.9 * k + o, 1.4 * k + o, c ?? '#e8514a')
    // Beak.
    g.poly(
      [
        [X(6.8), Y(21)],
        [X(8.8) + o * f, Y(20.3)],
        [X(6.8), Y(19.6)],
      ],
      c ?? '#f5c030',
    )
  })
  // Details (no outline).
  g.ellipse(X(-0.5), Y(10), 3.4 * k, 2 * k, p.D)
  for (let i = 0; i < 4; i++) g.line(X(-2.5 + i * 1.2), Y(9.2), X(-2 + i * 1.2), Y(8.4), mixHex(p.D, '#000000', 0.2))
  for (let i = 0; i < 5; i++) g.px(X(2.5 + i * 0.7), Y(15 + (i % 2)), mixHex(p.H, '#ffffff', 0.35))
  g.circle(X(5.6), Y(20.6), Math.max(0.8, 0.55 * k), '#2a1a24')
  g.px(Math.round(X(5.6) - f), Math.round(Y(20.6) - 1), '#ffffff')
  g.ellipse(X(3.8), Y(12.5), 1.2 * k, 1.6 * k, mixHex(p.L, '#ffffff', 0.35))
}

/** Terraced bank packed with rooster statues of all sizes (a few dozen per bank). */
export function roosterBank(w: number, tiers: number, seed: number): Building {
  const stepH = 9
  const H = tiers * stepH + 24
  return buildProp(`ak:bank:${w}:${tiers}:${seed}`, w, H, w / 2, H - 1, (g) => {
    const cx = w / 2
    // Concrete steps (back = higher).
    for (let t = tiers - 1; t >= 0; t--) {
      const top = H - 1 - (t + 1) * stepH
      const half = w / 2 - 1 - (tiers - 1 - t) * 0
      g.rect(Math.round(cx - half), top, Math.round(half * 2), stepH + t * stepH, '#cfc8c4')
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, top, '#ece6e2')
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, top + stepH - 1, '#a8a0a0')
    }
    // Roosters: back rows first (smaller), front rows bigger.
    for (let t = tiers - 1; t >= 0; t--) {
      const footY = H - 1 - t * stepH - 2
      const size = (t === 0 ? 2 : t === 1 ? 1 : t % 2 ? 1 : 0) as 0 | 1 | 2
      const spacing = size === 2 ? 11 : size === 1 ? 8 : 6
      for (let x = 5 + (t % 2) * 3; x < w - 4; x += spacing) {
        const v = hash(x, t, seed)
        if (v % 11 === 0) continue
        const kind = CROWD[v % CROWD.length]
        drawRooster(g, x + (v % 3) - 1, footY - (v % 2), size, kind, v % 2 === 0)
      }
    }
  })
}

/** A single row of rooster statues on a low concrete ledge (lines paths and walls). */
export function roosterRow(len: number, seed: number, size: 0 | 1 | 2 = 1, ledge = true): Building {
  const H = size === 2 ? 22 : size === 1 ? 16 : 12
  return buildProp(`ak:row:${len}:${seed}:${size}:${ledge ? 1 : 0}`, len, H, len / 2, H - 1, (g) => {
    if (ledge) {
      g.rect(0, H - 3, len, 3, '#cfc8c4')
      g.hline(0, len - 1, H - 3, '#ece6e2')
      g.hline(0, len - 1, H - 1, '#a8a0a0')
    }
    const step = size === 2 ? 11 : size === 1 ? 8 : 6
    for (let x = Math.round(step / 2); x < len - 2; x += step) {
      const v = hash(x, seed, 21)
      drawRooster(g, x, H - (ledge ? 3 : 1), size, CROWD[v % CROWD.length], v % 2 === 0)
    }
  })
}

// ---------------------------------------------------------------------------
// Ai Khai.

/** The child spirit Ai Khai: chubby boy with a topknot, rosy cheeks, garlands. Foot at (cx, baseY). k = 1 → ~32 px. */
export function drawAiKhai(g: Surface, cx: number, baseY: number, k: number, pose: 'stand' | 'wave' = 'stand') {
  const S = (v: number) => Math.round(v * k)
  const skin = '#d9a070'
  const skinD = '#b87c50'
  const hair = '#2a1e2a'
  const shirt = '#fffaf0'
  const shirtD = '#e0d8cc'
  const pha = '#e8514a'
  const phaD = '#b8343f'
  const y0 = baseY
  // Legs and feet.
  g.rect(cx - S(4), y0 - S(6), S(3), S(6), skin)
  g.rect(cx + S(1), y0 - S(6), S(3), S(6), skin)
  g.rect(cx - S(5), y0 - S(1), S(4), S(1) || 1, skinD)
  g.rect(cx + S(1), y0 - S(1), S(4), S(1) || 1, skinD)
  // Red pha nung (sarong) with a gold belt.
  g.rect(cx - S(6), y0 - S(13), S(12), S(7), pha)
  g.rect(cx + S(3), y0 - S(13), S(3), S(7), phaD)
  g.vline(cx, y0 - S(12), y0 - S(7), phaD)
  g.rect(cx - S(6), y0 - S(14), S(12), S(2), GOLD.b)
  g.rect(cx - S(1), y0 - S(14), S(2), S(2), GOLD.l)
  // White shirt, round belly.
  g.rect(cx - S(6), y0 - S(21), S(12), S(7), shirt)
  g.rect(cx + S(3), y0 - S(21), S(3), S(7), shirtD)
  g.ellipse(cx, y0 - S(16), S(5.5), S(3), shirt)
  g.px(cx, y0 - S(18), '#bdb2ae')
  g.px(cx, y0 - S(16), '#bdb2ae')
  // Arms.
  g.rect(cx - S(8), y0 - S(20), S(2), S(7), skin)
  if (pose === 'wave') {
    g.rect(cx + S(6), y0 - S(26), S(2), S(7), skin)
    g.rect(cx + S(6), y0 - S(28), S(3), S(3), skin)
  } else g.rect(cx + S(6), y0 - S(20), S(2), S(7), skinD)
  // Garlands: marigold + jasmine.
  for (let i = -5; i <= 5; i++) {
    const yy = y0 - S(21) + Math.round((1 - (i * i) / 25) * S(4))
    g.px(cx + S(i), yy, i % 2 ? '#f58f35' : '#ffd23f')
    g.px(cx + S(i), yy + 1, i % 2 ? '#ffd23f' : '#fffaf0')
  }
  // Head.
  const hy = y0 - S(27)
  g.circle(cx, hy, S(6), skin)
  g.ellipse(cx + S(2), hy + S(1), S(3), S(4), skinD)
  g.circle(cx - S(0.5), hy, S(5.4), skin)
  // Crew-cut hair and the topknot (จุก) with a gold band.
  g.ellipse(cx, hy - S(4), S(5.6), S(2.2), hair)
  g.circle(cx, hy - S(8), S(2.2), hair)
  g.hline(cx - S(1.5), cx + S(1.5), hy - S(6), GOLD.b)
  // Face.
  g.rect(cx - S(3), hy, Math.max(1, S(1)), Math.max(1, S(1.5)), '#2a1a24')
  g.rect(cx + S(2), hy, Math.max(1, S(1)), Math.max(1, S(1.5)), '#2a1a24')
  if (k >= 1.5) {
    g.px(cx - S(3), hy, '#ffffff')
    g.px(cx + S(2), hy, '#ffffff')
  }
  g.rect(cx - S(5), hy + S(2), Math.max(1, S(1.6)), Math.max(1, S(1)), '#ff9aa6')
  g.rect(cx + S(3.4), hy + S(2), Math.max(1, S(1.6)), Math.max(1, S(1)), '#ff9aa6')
  g.hline(cx - S(1.5), cx + S(1), hy + S(3), '#b8343f')
  if (k >= 1.5) g.px(cx, hy + S(3) + 1, '#e8514a')
}

/** Ai Khai statue on a golden lotus pedestal (anchor: pedestal foot). */
export function aiKhaiStatue(k: number, pose: 'stand' | 'wave' = 'wave'): Building {
  const W = Math.round(26 * k) + 8
  const H = Math.round(40 * k) + 14
  return buildProp(`ak:statue:${k}:${pose}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = Math.round(W / 2)
    const foot = H - 1
    tier(g, cx, foot - 6, 6, W / 2 - 1, GOLD_R, GOLD.D)
    for (let x = 2; x < W - 2; x += 3) {
      g.px(x, foot - 7, GOLD.l)
      g.px(x + 1, foot - 8, GOLD.d)
    }
    drawAiKhai(g, cx, foot - 8, k, pose)
    hooks.head = [{ x: cx, y: foot - 8 - Math.round(33 * k) }]
    hooks.chest = [{ x: cx, y: foot - 8 - Math.round(18 * k) }]
  })
}

/** Ai Khai in his gilded glass shrine (บุษบก), heaped with garlands. Anchor: stand foot. */
export function aiKhaiShrine(): Building {
  const W = 64
  const H = 112
  return buildProp('ak:shrine', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const foot = H - 1
    // Gilded stand.
    tier(g, cx, foot - 8, 8, 30, GOLD_R, GOLD.D)
    tier(g, cx, foot - 14, 6, 25, { L: '#e05a52', b: '#b8343f', d: '#8e2433', D: '#6e1a2a' }, GOLD.d)
    for (let x = cx - 22; x < cx + 22; x += 4) g.px(x, foot - 11, GOLD.l)
    // Glass case with Ai Khai inside.
    const top = foot - 66
    g.rect(cx - 21, top, 42, 52, '#bfe6f4')
    g.rect(cx - 20, top + 1, 40, 50, '#d8f4ff')
    drawAiKhai(g, cx, foot - 16, 1.45, 'stand')
    g.alpha(0.07)
    g.rect(cx - 20, top + 1, 40, 50, '#9fd0ff')
    g.alpha(1)
    g.line(cx - 18, top + 3, cx - 15, top + 48, '#ffffff')
    g.line(cx + 16, top + 3, cx + 18, top + 20, '#f4fbff')
    // Gold frame.
    g.rect(cx - 23, top - 2, 3, 54, GOLD.d)
    g.rect(cx + 20, top - 2, 3, 54, GOLD.D)
    g.rect(cx - 23, top - 3, 46, 3, GOLD.b)
    g.hline(cx - 23, cx + 22, top - 3, GOLD.L)
    // Busabok roof tiers and spire.
    for (let i = 0; i < 5; i++) {
      const y = top - 4 - i * 5
      const half = 25 - i * 4
      g.rect(cx - half, y - 3, half * 2, 3, i % 2 ? '#b8343f' : GOLD.b)
      g.hline(cx - half, cx + half - 1, y - 3, i % 2 ? '#e05a52' : GOLD.L)
      g.px(cx - half - 1, y - 2, GOLD.b)
      g.px(cx + half, y - 2, GOLD.b)
      g.px(cx - half - 2, y - 3, GOLD.l)
      g.px(cx + half + 1, y - 3, GOLD.l)
    }
    for (let i = 0; i < 12; i++) slice(g, cx, top - 28 - i, Math.max(0.5, 3 - i * 0.22), GOLD_R, 0.5)
    // Marigold & jasmine garlands draped over the case.
    for (let k = 0; k < 3; k++) {
      for (let i = -18; i <= 18; i++) {
        const y = top + 2 + k * 3 + Math.round((1 - (i * i) / 324) * 6)
        g.px(cx + i, y, (i + k) % 2 ? '#f58f35' : '#ffd23f')
      }
    }
    for (const sd of [-1, 1])
      for (let j = 0; j < 20; j++) {
        g.px(cx + sd * 22, top + 6 + j, j % 2 ? '#fffaf0' : '#ffd23f')
        if (j % 5 === 4) g.px(cx + sd * 22, top + 7 + j, '#e8514a')
      }
    hooks.chest = [{ x: cx, y: foot - 40 }]
    hooks.glints = [
      { x: cx, y: top - 40 },
      { x: cx - 22, y: top - 3 },
      { x: cx + 22, y: top - 3 },
    ]
  })
}

/** Stacked plastic crates of red soda (for the shrine's endless offerings). */
export function sodaCrates(): Building {
  return buildProp('ak:crates', 24, 26, 12, 25, (g) => {
    for (let r = 0; r < 3; r++) {
      const y = 18 - r * 8
      const x = r === 2 ? 4 : 0
      const w = r === 2 ? 16 : 24
      g.rect(x, y, w, 8, r % 2 ? '#e8514a' : '#d8403a')
      g.hline(x, x + w - 1, y, '#ff8a7a')
      for (let i = x + 2; i < x + w - 1; i += 4) g.rect(i, y + 2, 2, 4, '#b8343f')
      for (let i = x + 1; i < x + w - 1; i += 3) {
        g.px(i, y - 1, '#e8514a')
        g.px(i, y - 2, '#fffaf0')
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Offerings: red soda, soldier & police dolls, toy guns.

/** Long table crowded with red soda bottles (น้ำแดง) with straws. */
export function sodaTable(w = 40): Building {
  return buildProp(`ak:soda:${w}`, w, 22, w / 2, 21, (g) => {
    g.rect(0, 12, w, 3, '#e0bb8a')
    g.hline(0, w - 1, 12, '#f3dcb2')
    g.rect(1, 15, w - 2, 5, '#c28e5c')
    g.rect(2, 20, 2, 2, '#6e4a35')
    g.rect(w - 4, 20, 2, 2, '#6e4a35')
    const cols = ['#e8514a', '#e8514a', '#e8514a', '#6cc36a', '#f58f35', '#e8514a']
    for (let row = 0; row < 2; row++)
      for (let x = 2 + row * 2; x < w - 2; x += 4) {
        const c = cols[hash(x, row, 5) % cols.length]
        const y = 11 - row * 3
        g.rect(x, y - 4, 2, 5, c)
        g.px(x, y - 4, mixHex(c, '#ffffff', 0.5))
        g.px(x, y - 5, '#fffaf0')
        g.line(x + 1, y - 5, x + 2, y - 8, hash(x, row, 9) % 2 ? '#ff9fc0' : '#9fd0ff')
      }
  })
}

/** Rows of little soldier and police dolls and bright orange toy guns. */
export function dollsRow(w = 40): Building {
  return buildProp(`ak:dolls:${w}`, w, 20, w / 2, 19, (g) => {
    g.rect(0, 14, w, 5, '#bdb2ae')
    g.hline(0, w - 1, 14, '#e4ddd6')
    for (let x = 3; x < w - 2; x += 5) {
      const police = hash(x, 1, 3) % 3 === 0
      const uni = police ? '#8a5a3a' : '#5a7a3a'
      g.rect(x - 1, 8, 3, 6, uni)
      g.px(x, 10, GOLD.b)
      g.rect(x - 1, 5, 3, 3, '#e8b186')
      g.rect(x - 1, 4, 3, 1, police ? '#3a3040' : '#4a6a2a')
      g.rect(x - 2, 4, 5, 1, police ? '#3a3040' : '#4a6a2a')
      g.px(x - 1, 6, '#2a1a24')
      g.px(x + 1, 6, '#2a1a24')
    }
    // Toy guns lying in front.
    for (let x = 2; x < w - 6; x += 9) {
      g.rect(x, 15, 6, 2, '#f58f35')
      g.rect(x + 1, 17, 2, 2, '#f58f35')
      g.px(x + 5, 15, '#3a3040')
    }
  })
}

/** Firecracker cage (ที่จุดประทัด): steel mesh box, blackened floor, red paper. */
export function firecrackerCage(): Building {
  return buildProp('ak:cage', 40, 36, 20, 35, (g, hooks) => {
    // Floor of red paper debris.
    g.rect(1, 28, 38, 7, '#6a5a5a')
    for (let i = 0; i < 60; i++) {
      const v = hash(i, 3, 7)
      g.px(2 + (v % 36), 28 + ((v >> 4) % 6), v % 3 ? '#e8514a' : '#b8343f')
    }
    // Mesh walls.
    g.rect(1, 6, 38, 23, 'rgba(60,60,70,0.25)')
    for (let x = 1; x < 40; x += 3) g.vline(x, 6, 28, '#8a8a98')
    for (let y = 6; y < 29; y += 3) g.hline(1, 38, y, '#9a9aa8')
    g.rect(0, 4, 40, 2, '#5a5a68')
    g.rect(0, 4, 2, 31, '#5a5a68')
    g.rect(38, 4, 2, 31, '#5a5a68')
    // Soot stains on the roof.
    g.rect(8, 2, 24, 3, '#3a3040')
    g.hline(8, 31, 2, '#5a5068')
    // A string of firecrackers hanging inside.
    for (let y = 8; y < 24; y += 2) {
      g.rect(18, y, 2, 2, '#e8514a')
      g.px(20, y, GOLD.b)
    }
    g.vline(19, 6, 8, '#6e4a35')
    // Sign.
    g.rect(24, 10, 12, 6, '#ffd23f')
    g.frame(24, 10, 12, 6, '#b8343f')
    g.hline(26, 33, 12, '#b8343f')
    g.hline(26, 31, 14, '#3a2838')
    hooks.fire = [{ x: 20, y: 24 }]
  })
}

// ---------------------------------------------------------------------------
// Stalls.

/** Rooster-statue stall: shelves of roosters in every size with price tags. */
export function roosterStall(): Building {
  const W = 58
  const H = 50
  return buildProp('ak:rstall', W, H, W / 2, H - 1, (g) => {
    // Awning.
    g.rect(2, 8, 2, 41, '#6e4a35')
    g.rect(W - 4, 8, 2, 41, '#6e4a35')
    for (let y = 1; y < 9; y++) for (let x = 0; x < W; x++) g.px(x, y, Math.floor(x / 6) % 2 ? '#ffd23f' : '#e8514a')
    for (let x = 0; x < W; x += 6) g.rect(x + 1, 9, 4, 1, Math.floor(x / 6) % 2 ? '#ffd23f' : '#e8514a')
    // Sign "ไก่ชนแก้บน".
    g.rect(W / 2 - 13, 2, 26, 6, '#fffaf0')
    g.hline(W / 2 - 10, W / 2 + 9, 4, '#b8343f')
    g.hline(W / 2 - 7, W / 2 + 5, 6, '#3a2838')
    // Shelves.
    for (const y of [22, 34]) {
      g.rect(3, y, W - 6, 2, '#9a6a45')
      g.hline(3, W - 4, y, '#c28e5c')
    }
    let i = 0
    for (const [y, size, step] of [
      [21, 1, 8],
      [33, 1, 8],
    ] as const) {
      for (let x = 8; x < W - 6; x += step) drawRooster(g, x, y, size, CROWD[(i++ * 7) % CROWD.length], i % 2 === 0)
    }
    // Front counter with big roosters and price tags.
    g.rect(2, 40, W - 4, 8, '#c28e5c')
    g.hline(2, W - 3, 40, '#e0bb8a')
    drawRooster(g, 12, 39, 2, 'gold', false)
    drawRooster(g, W - 13, 39, 2, 'red', true)
    for (const x of [22, 30, 38]) {
      g.rect(x, 43, 6, 3, '#fffaf0')
      g.hline(x + 1, x + 4, 44, '#b8343f')
    }
  })
}

/** Lottery-ticket seller's table with fanned sheets and a lucky rooster on top. */
export function lotteryStall(): Building {
  const W = 46
  const H = 46
  return buildProp('ak:lottery', W, H, W / 2, H - 1, (g) => {
    // Beach umbrella.
    for (let i = 0; i <= 8; i++) {
      const y = 10 - i
      const half = 22 - i * 2.4
      g.rect(Math.round(23 - half), y, Math.round(half * 2), 1, i % 2 ? '#5a8de0' : '#fffaf0')
    }
    g.px(23, 1, GOLD.b)
    g.rect(22, 11, 2, 16, '#9a9aa8')
    // Board of tickets.
    g.rect(4, 14, 38, 16, '#fffaf0')
    g.frame(4, 14, 38, 16, '#3d63b5')
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 6; c++) {
        const x = 6 + c * 6
        const y = 16 + r * 4
        g.rect(x, y, 5, 3, ['#9fd0ff', '#ffd6e0', '#c8f0cf'][(r + c) % 3])
        g.px(x + 1, y + 1, '#3a2838')
        g.px(x + 3, y + 1, '#3a2838')
      }
    // "เลขเด็ด" banner.
    g.rect(8, 30, 30, 5, '#e8514a')
    g.hline(10, 35, 32, '#fff3a6')
    // Table.
    g.rect(2, 35, W - 4, 3, '#e0bb8a')
    g.rect(4, 38, 2, 7, '#6e4a35')
    g.rect(W - 6, 38, 2, 7, '#6e4a35')
    drawRooster(g, 38, 13, 1, 'gold', true)
  })
}

// ---------------------------------------------------------------------------
// Architecture: old brick chedi and the photo-spot platform.

/** The ancient brick chedi that gives Wat Chedi its name, with plants growing on it. */
export function brickChedi(): Building {
  const W = 70
  const H = 112
  return buildProp('ak:brickchedi', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    let y = H - 1
    for (const [h, half] of [
      [8, 33],
      [7, 29],
      [6, 25],
    ] as const) {
      y -= h
      tier(g, cx, y, h, half, BRICK_R, '#6a3024')
    }
    for (let i = 0; i < 3; i++) {
      y -= 2
      slice(g, cx, y, 20 - i * 1.5, BRICK_R)
      slice(g, cx, y + 1, 20 - i * 1.5, BRICK_R)
    }
    const bellH = 34
    const base = y
    for (let i = 1; i <= bellH; i++) slice(g, cx, base - i, 18 * Math.pow(Math.max(0, 1 - Math.pow(i / bellH, 2.4)), 0.55), BRICK_R, 0.32)
    // Brick courses and weathering.
    for (let yy = H - 60; yy < H - 2; yy += 3)
      for (let x = 0; x < W; x += 5) {
        const v = hash(x, yy, 2)
        if (v % 4 === 0) g.px(x + ((yy / 3) % 2 ? 2 : 0), yy, BRICK_R.D)
      }
    y = base - bellH
    slice(g, cx, y, 6, BRICK_R)
    slice(g, cx, y - 1, 7, BRICK_R)
    slice(g, cx, y - 2, 6, BRICK_R)
    y -= 3
    for (let i = 0; i < 26; i++) slice(g, cx, y - i, Math.max(0.6, 4 - i * 0.14), BRICK_R, 0.4)
    g.px(cx, y - 27, GOLD.b)
    // Plants in the cracks, a gold-leaf patch and a saffron sash.
    for (const [px, py] of [
      [cx - 14, base - 6],
      [cx + 12, base - 18],
      [cx - 6, H - 20],
      [cx + 20, H - 14],
    ]) {
      g.px(px, py, LEAVES.green.b)
      g.px(px + 1, py - 1, LEAVES.green.L)
      g.px(px - 1, py - 1, LEAVES.green.d)
    }
    for (let x = cx - 17; x < cx + 17; x++) g.px(x, base - 4 + Math.round(Math.sin(x * 0.5)), x % 5 ? '#f5a623' : '#ffd070')
    hooks.glints = [{ x: cx, y: y - 27 }]
  })
}

/** A giant rooster photo-spot statue on a tiled platform with a heart frame sign. */
export function giantRooster(): Building {
  const W = 84
  const H = 96
  return buildProp('ak:giant', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Platform.
    tier(g, cx, H - 9, 8, 38, WHITE_R, P.redD)
    for (let x = cx - 34; x < cx + 34; x += 6) g.px(x, H - 5, GOLD.b)
    drawBigRooster(g, cx - 4, H - 10, 3.3, 'red', false)
    // Heart photo frame on a post at the side.
    g.rect(W - 11, 40, 2, 46, '#9a9aa8')
    const hx = W - 10
    const hy = 34
    for (const [dx, dy] of [
      [-5, -2],
      [5, -2],
    ])
      g.circle(hx + dx, hy + dy, 5, '#ff6f91')
    g.poly(
      [
        [hx - 10, hy - 1],
        [hx + 10, hy - 1],
        [hx, hy + 11],
      ],
      '#ff6f91',
    )
    g.circle(hx - 5, hy - 2, 3, '#ffd6e0')
    g.circle(hx + 5, hy - 2, 3, '#ffd6e0')
    g.poly(
      [
        [hx - 7, hy],
        [hx + 7, hy],
        [hx, hy + 7],
      ],
      '#ffd6e0',
    )
    g.px(hx - 6, hy - 4, '#ffffff')
    hooks.head = [{ x: cx + 13, y: H - 80 }]
  })
}

export { ROOF, ROOSTER_KEYS, CROWD, canopy }
