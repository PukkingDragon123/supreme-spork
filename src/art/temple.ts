// Thai temple architecture for the walkable worlds, drawn procedurally in a
// cute front-facing 3/4 pixel style: the ordination hall (อุโบสถ) with
// stacked roofs, ช่อฟ้า, ใบระกา and หางหงส์, bell-shaped chedi, bell tower,
// gates, walls, ใบเสมา, guardians and garden furniture.
//
// Every builder returns a cached Prop (sprite + ground anchor) so the world
// can y-sort it against characters. Many also return "hooks" – points the
// scene animates every frame (eave bells, glints, lit windows, flames).

import { bake, type Color, type Surface } from '../engine/pixel'
import { cached, outlineCanvas } from '../engine/sprite'
import { P } from './palette'
import { mixHex } from './characters'
import type { Prop } from './props'

// ---------------------------------------------------------------------------
// Colours local to temple art.

export const GOLD = { L: '#fff3a6', l: '#ffe27a', b: '#ffd54f', d: '#e9a53a', D: '#b8742a', DD: '#8a5222' }
export const WHITE = { L: '#ffffff', b: '#fffaf0', d: '#efe4d0', D: '#dccab0', DD: '#bfa98e' }

export interface RoofRamp {
  field: Color
  fieldD: Color
  fieldL: Color
  border: Color
  borderD: Color
  under: Color
}

export const ROOF = {
  orange: { field: '#f28a3c', fieldD: '#cf6424', fieldL: '#ffb065', border: '#3fa06e', borderD: '#277253', under: '#8a3a2a' },
  red: { field: '#e2503f', fieldD: '#b3363b', fieldL: '#ff8a70', border: '#3fa06e', borderD: '#277253', under: '#6e2430' },
  blue: { field: '#4f7fd0', fieldD: '#3a5fb0', fieldL: '#8fb6ff', border: '#ffc94a', borderD: '#d48e2c', under: '#2a3470' },
  green: { field: '#3f9a6b', fieldD: '#2c7552', fieldL: '#6cc38e', border: '#f28a3c', borderD: '#cf6424', under: '#1e4a3a' },
  gold: { field: '#f5c542', fieldD: '#d99a2b', fieldL: '#fff09a', border: '#e8514a', borderD: '#b8343f', under: '#7a4a1a' },
} satisfies Record<string, RoofRamp>

export interface Pt {
  x: number
  y: number
}

/** A prop with extra animation hooks (relative to the anchor). */
export interface Building extends Prop {
  hooks: Record<string, Pt[]>
}

function build(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>) => void, outline = true): Building {
  return cached(key, () => {
    const hooks: Record<string, Pt[]> = {}
    const c = bake(w, h, (g) => fn(g, hooks))
    // Hooks are stored relative to the ground anchor.
    for (const k of Object.keys(hooks)) hooks[k] = hooks[k].map((p) => ({ x: p.x - ax, y: p.y - ay }))
    if (!outline) return { canvas: c, w, h, ax, ay, hooks } as Building
    const o = outlineCanvas(c, P.ink)
    return { ...o, ax: ax + 1, ay: ay + 1, hooks } as Building
  }) as Building
}

export function sprite(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface) => void, outline = true): Prop {
  return build(key, w, h, ax, ay, (g) => fn(g), outline)
}

// ---------------------------------------------------------------------------
// Low level helpers.

/** y of a straight line at x, clamped to the segment. */
function lerpY(ax: number, ay: number, bx: number, by: number, x: number) {
  if (bx === ax) return ay
  const t = Math.max(0, Math.min(1, (x - ax) / (bx - ax)))
  return ay + (by - ay) * t
}

/** Fill the area between a sloped line and the same line moved up by `depth` (a roof surface). */
export function roofBand(g: Surface, ax: number, ay: number, bx: number, by: number, depth: number, r: RoofRamp, borderW = 5) {
  const dir = bx > ax ? 1 : -1
  const n = Math.abs(bx - ax)
  for (let i = 0; i <= n; i++) {
    const x = ax + i * dir
    const yb = Math.round(lerpY(ax, ay, bx, by, x))
    const edge = n - i // distance from the eave end
    for (let k = 1; k <= depth; k++) {
      const y = yb - k
      let c = r.field
      if (edge < borderW) c = edge < 2 ? r.borderD : r.border
      else {
        // Tile rows parallel to the barge line and staggered joints.
        if (k % 3 === 0) c = r.fieldD
        else if ((i + (Math.floor(k / 3) % 2) * 2) % 4 === 0 && k % 3 === 2) c = r.fieldD
        else if (k % 3 === 1 && (i + k) % 7 === 0) c = r.fieldL
      }
      g.px(x, y, c)
    }
    // Ridge-side highlight on the top row.
    g.px(x, yb - depth, edge < borderW ? r.border : r.fieldL)
  }
}

/** Gold barge board (ลำยอง) with ใบระกา fins along the upper edge. */
export function bargeBoard(g: Surface, ax: number, ay: number, bx: number, by: number, thick = 3, fins = true) {
  const dir = bx > ax ? 1 : -1
  const n = Math.abs(bx - ax)
  for (let i = 0; i <= n; i++) {
    const x = ax + i * dir
    const y = Math.round(lerpY(ax, ay, bx, by, x))
    g.px(x, y, GOLD.L)
    for (let k = 1; k < thick; k++) g.px(x, y + k, k === thick - 1 ? GOLD.D : GOLD.b)
    g.px(x, y + thick, GOLD.DD)
    if (fins && i > 2 && i < n - 2 && i % 3 === 0) {
      // A fin leaning outwards/up (ใบระกา).
      g.px(x, y - 1, GOLD.b)
      g.px(x + dir, y - 2, GOLD.l)
    }
  }
}

/** ช่อฟ้า: a slender golden hook rising from (x, y). */
export function chofa(g: Surface, x: number, y: number, h = 9, dir = 1) {
  for (let k = 0; k < h; k++) {
    const yy = y - k
    const lean = k > h - 4 ? dir : 0
    g.px(x + lean, yy, k < 2 ? GOLD.D : GOLD.b)
    if (k < h - 3) g.px(x + 1 + lean, yy, GOLD.D)
  }
  // Beak/head curling over.
  g.px(x + dir, y - h, GOLD.l)
  g.px(x + dir * 2, y - h, GOLD.b)
  g.px(x + dir * 3, y - h + 1, GOLD.D)
  g.px(x, y - h + 1, GOLD.L)
  // Collar.
  g.px(x - 1, y, GOLD.D)
  g.px(x + 2, y, GOLD.D)
}

/** หางหงส์: upturned curl at the lower end of a barge board (dir = outwards). */
export function hangHong(g: Surface, x: number, y: number, dir: number, s = 1) {
  const pts: [number, number, string][] = [
    [0, 0, GOLD.b],
    [1, 0, GOLD.b],
    [1, -1, GOLD.b],
    [2, -1, GOLD.l],
    [2, -2, GOLD.b],
    [2, -3, GOLD.l],
    [1, -4, GOLD.b],
    [0, 1, GOLD.D],
    [1, 1, GOLD.D],
    [2, 0, GOLD.D],
    [3, -2, GOLD.D],
  ]
  for (const [dx, dy, c] of pts) {
    if (s === 1) g.px(x + dx * dir, y + dy, c)
    else g.rect(x + dx * dir * s, y + dy * s, s, s, c)
  }
}

/** Fill a gable triangle interior. */
function triangle(g: Surface, cx: number, apexY: number, hw: number, baseY: number, inset: number, color: Color) {
  const h = baseY - apexY
  for (let y = apexY + inset; y < baseY; y++) {
    const half = ((y - apexY) / h) * hw - inset * 1.3
    if (half <= 0) continue
    g.rect(Math.round(cx - half), y, Math.round(half * 2) + 1, 1, color)
  }
}

function triHalf(_cx: number, apexY: number, hw: number, baseY: number, y: number, inset: number) {
  return ((y - apexY) / (baseY - apexY)) * hw - inset * 1.3
}

/** Paint rows of characters with a palette at (x, y). */
export function rows(g: Surface, x: number, y: number, art: string[], pal: Record<string, Color>, flip = false) {
  for (let r = 0; r < art.length; r++) {
    const row = art[r]
    for (let c = 0; c < row.length; c++) {
      const k = row[c]
      const col = pal[k]
      if (!col) continue
      g.px(flip ? x + row.length - 1 - c : x + c, y + r, col)
    }
  }
}

const GOLD_PAL = { L: GOLD.L, G: GOLD.b, g: GOLD.d, d: GOLD.D, l: GOLD.l, r: P.redL, w: '#fffaf0', b: '#5a8de0' }

// Narai riding Garuda – the classic central motif of a หน้าบัน.
const NARAI = [
  '........L........',
  '.......lGl.......',
  '.......GgG.......',
  '......lGGGl......',
  '......GGrGG......',
  '...l...GGG...l...',
  '...Gl.GGgGG.lG...',
  '....GGGGGGGGG....',
  '.....gGGgGGg.....',
  '.......GgG.......',
  'l.....GGGGG.....l',
  'Gl..lGGgGgGGl..lG',
  'GGGGGGGGGGGGGGGGG',
  '.gGGgGGGgGGGgGGg.',
  '..gGG.gGGGg.GGg..',
  '...g..GG.GG..g...',
  '.....gG...Gg.....',
]

// A small three-headed Erawan / lotus emblem for upper gables.
const EMBLEM = ['....L....', '...lGl...', '..lGgGl..', '.lGGrGGl.', 'GGgGGGgGG', '.gGG.GGg.', '..g...g..']

/** Kanok (flame scroll) filling for a tympanum. */
function kanok(g: Surface, cx: number, apexY: number, hw: number, baseY: number, inset: number, clear: { x: number; y: number; w: number; h: number } | null) {
  for (let y = apexY + inset + 3; y < baseY - 2; y += 4) {
    const half = triHalf(cx, apexY, hw, baseY, y, inset + 2)
    for (let x = Math.ceil(cx - half); x <= cx + half - 3; x += 5) {
      if (clear && x + 3 >= clear.x && x <= clear.x + clear.w && y + 3 >= clear.y && y <= clear.y + clear.h) continue
      const flip = x < cx
      const s = flip ? -1 : 1
      const ox = flip ? x + 3 : x
      // Tiny flame curl.
      g.px(ox, y + 2, GOLD.d)
      g.px(ox + s, y + 1, GOLD.b)
      g.px(ox + 2 * s, y, GOLD.l)
      g.px(ox + s, y + 3, GOLD.d)
    }
  }
}

/** Glass mosaic sparkle on a coloured field. */
function mosaic(g: Surface, cx: number, apexY: number, hw: number, baseY: number, inset: number, a: Color, b: Color) {
  for (let y = apexY + inset; y < baseY; y++) {
    const half = triHalf(cx, apexY, hw, baseY, y, inset)
    for (let x = Math.ceil(cx - half); x <= cx + half; x++) {
      const n = (x * 7 + y * 13) % 17
      if (n === 0 && y % 2 === 0) g.px(x, y, a)
      else if (n === 9 && (x + y) % 5 === 0) g.px(x, y, b)
    }
  }
}

export interface GableStyle {
  field: Color
  fieldD: Color
  sparkA: Color
  sparkB: Color
  motif: 'narai' | 'emblem' | 'none'
  thick?: number
}

/** Complete gable (หน้าบัน + ลำยอง + ใบระกา + ช่อฟ้า + หางหงส์). Returns glint points. */
export function gable(g: Surface, cx: number, apexY: number, hw: number, baseY: number, st: GableStyle): Pt[] {
  const t = st.thick ?? 3
  triangle(g, cx, apexY, hw, baseY, 0, st.fieldD)
  triangle(g, cx, apexY, hw, baseY - 3, t + 1, st.field)
  mosaic(g, cx, apexY, hw, baseY - 3, t + 1, st.sparkA, st.sparkB)
  // Inner gold frame parallel to the barge boards.
  const h = baseY - apexY
  for (let y = apexY + t + 3; y < baseY - 2; y++) {
    const half = Math.round(triHalf(cx, apexY, hw, baseY, y, t + 1))
    g.px(cx - half, y, GOLD.d)
    g.px(cx + half, y, GOLD.d)
  }
  let clear: { x: number; y: number; w: number; h: number } | null = null
  if (st.motif === 'narai') {
    const mw = NARAI[0].length
    const mh = NARAI.length
    const my = Math.round(baseY - 4 - mh)
    clear = { x: cx - (mw >> 1) - 2, y: my - 2, w: mw + 4, h: mh + 4 }
    kanok(g, cx, apexY, hw, baseY - 3, t + 2, clear)
    rows(g, cx - (mw >> 1), my, NARAI, GOLD_PAL)
  } else if (st.motif === 'emblem') {
    const mw = EMBLEM[0].length
    const my = Math.round(apexY + h * 0.36)
    clear = { x: cx - (mw >> 1) - 2, y: my - 2, w: mw + 4, h: EMBLEM.length + 4 }
    kanok(g, cx, apexY, hw, baseY - 3, t + 2, clear)
    rows(g, cx - (mw >> 1), my, EMBLEM, GOLD_PAL)
  } else kanok(g, cx, apexY, hw, baseY - 3, t + 2, null)
  // Bottom frame of the pediment.
  g.hline(cx - hw + 2, cx + hw - 2, baseY - 3, GOLD.l)
  g.hline(cx - hw + 2, cx + hw - 2, baseY - 2, GOLD.d)
  g.hline(cx - hw + 3, cx + hw - 3, baseY - 1, GOLD.DD)
  // Barge boards.
  bargeBoard(g, cx, apexY, cx - hw, baseY, t)
  bargeBoard(g, cx, apexY, cx + hw, baseY, t)
  // Chofa and tails.
  chofa(g, cx, apexY, Math.max(6, Math.round(h * 0.22)), 1)
  hangHong(g, cx - hw - 1, baseY + 1, -1)
  hangHong(g, cx + hw + 1, baseY + 1, 1)
  const ch = Math.max(6, Math.round(h * 0.22))
  return [
    { x: cx + 1, y: apexY - ch },
    { x: cx - hw - 3, y: baseY - 3 },
    { x: cx + hw + 3, y: baseY - 3 },
  ]
}

/** Column with a gold lotus capital (บัวหัวเสา) and base. */
export function column(g: Surface, x: number, top: number, bottom: number, w = 4, body: Color = WHITE.b, shade: Color = WHITE.D) {
  g.rect(x, top, w, bottom - top, body)
  g.rect(x, top, 1, bottom - top, WHITE.L)
  g.rect(x + w - 1, top, 1, bottom - top, shade)
  // Lotus capital.
  g.rect(x - 1, top, w + 2, 1, GOLD.b)
  for (let i = -1; i <= w; i++) g.px(x + i, top + 1, (i & 1) === 0 ? GOLD.l : GOLD.d)
  g.rect(x, top + 2, w, 1, GOLD.D)
  // Petal skirt.
  g.px(x, top + 3, GOLD.d)
  g.px(x + w - 1, top + 3, GOLD.d)
  // Base.
  g.rect(x - 1, bottom - 3, w + 2, 1, GOLD.b)
  g.rect(x - 1, bottom - 2, w + 2, 2, GOLD.d)
}

/** Pointed gold crown over a door or window (ซุ้มทรงมงกุฎ). */
export function crown(g: Surface, cx: number, baseY: number, w: number, h: number) {
  const tiers = Math.max(2, Math.floor(h / 3))
  let y = baseY
  for (let i = 0; i < tiers; i++) {
    const tw = Math.max(2, Math.round(w * (1 - i / tiers)))
    const th = i === tiers - 1 ? 2 : 3
    g.rect(Math.round(cx - tw / 2), y - th, tw, th, GOLD.b)
    g.hline(Math.round(cx - tw / 2), Math.round(cx - tw / 2) + tw - 1, y - th, GOLD.l)
    g.px(Math.round(cx + tw / 2) - 1, y - 1, GOLD.D)
    if (tw > 5) g.px(Math.round(cx), y - 2, P.redD)
    y -= th
  }
  g.px(cx, y - 1, GOLD.l)
  g.px(cx, y - 2, GOLD.b)
}

/** Lacquered door/window with gold ลายรดน้ำ. */
export function lacquerPanel(g: Surface, x: number, y: number, w: number, h: number, night: boolean, leaves = 2) {
  g.rect(x - 1, y - 1, w + 2, h + 1, GOLD.d)
  g.rect(x - 1, y - 1, w + 2, 1, GOLD.l)
  if (night) {
    g.rect(x, y, w, h, '#ffcf7a')
    g.rect(x + 1, y + 1, w - 2, h - 1, '#ffe7a8')
    g.rect(Math.round(x + w / 2) - 1, y + 3, 2, h - 5, '#fff6d6')
    return
  }
  g.rect(x, y, w, h, P.redD)
  g.rect(x, y, w, 1, P.redDD)
  for (let j = 2; j < h - 1; j += 3)
    for (let i = 1; i < w - 1; i += 2) if (((i + j) >> 1) % 2 === 0) g.px(x + i, y + j, GOLD.d)
  if (leaves === 2) g.vline(Math.round(x + w / 2) - (w % 2 ? 0 : 1), y, y + h - 1, P.redDD)
  // Gold medallions.
  if (h > 10) {
    g.px(x + Math.floor(w / 4), y + Math.floor(h / 2), GOLD.l)
    g.px(x + w - 1 - Math.floor(w / 4), y + Math.floor(h / 2), GOLD.l)
  }
}

/** Honeycomb valance (สาหร่ายรวงผึ้ง) hanging between columns. */
export function valance(g: Surface, x0: number, x1: number, y: number) {
  g.hline(x0, x1, y, GOLD.d)
  for (let x = x0; x <= x1; x++) {
    const k = (x - x0) % 4
    const t = Math.min(x - x0, x1 - x) // deeper in the middle
    const depth = 1 + Math.min(3, Math.floor(t / 3))
    if (k === 1 || k === 2) {
      for (let d = 1; d <= depth; d++) g.px(x, y + d, d === depth ? GOLD.D : GOLD.b)
    } else if (k === 0) g.px(x, y + 1, GOLD.l)
  }
}

// ---------------------------------------------------------------------------
// The ordination hall (อุโบสถ).

export interface HallOpts {
  roof?: RoofRamp
  roof2?: RoofRamp
  night?: boolean
  field?: Color
  fieldD?: Color
  field2?: Color
  field2D?: Color
  scale?: 'grand' | 'small'
}

/**
 * Grand ubosot, 156×156. Anchor = bottom centre of the naga stairs.
 * Hooks: bells (eave bell hang points), glints (gold tips), windows & door
 * (lit at night), candles (in front of the door).
 */
export function hallSprite(o: HallOpts = {}): Building {
  const night = !!o.night
  const roof = o.roof ?? ROOF.orange
  const roof2 = o.roof2 ?? ROOF.orange
  const key = `hall:${o.scale ?? 'grand'}:${roof.field}:${roof2.field}:${o.field ?? ''}:${night ? 1 : 0}`
  const W = 156
  const H = 158
  const cx = 78
  return build(key, W, H, cx, H - 2, (g, hooks) => {
    const glints: Pt[] = []
    const bells: Pt[] = []
    const windows: Pt[] = []
    const field = o.field ?? '#c23a3f'
    const fieldD = o.fieldD ?? '#7e2436'
    const field2 = o.field2 ?? '#3d63b5'
    const field2D = o.field2D ?? '#26306e'

    // Geometry (y grows downward).
    const A2 = 20 // main gable apex
    const B2 = 70 // main gable base
    const HW2 = 48
    const A1 = 54 // porch gable apex
    const B1 = 90
    const HW1 = 40
    const colTop = 94
    const floor = 130
    const plat0 = 131
    const plat1 = 144
    const ground = H - 2

    // --- roof mass backing (never shows transparent gaps) ---
    g.poly(
      [
        [cx, A2 - 8],
        [cx + HW2 + 26, B2 + 26],
        [cx + HW2 + 20, B2 + 28],
        [cx - HW2 - 20, B2 + 28],
        [cx - HW2 - 26, B2 + 26],
      ],
      fieldD,
    )
    // Gold-trimmed red end panels of the lower tiers.
    for (let y = A2 + 20; y < B2 + 26; y += 3)
      for (let x = cx - HW2 - 24; x < cx + HW2 + 24; x += 4) if (((x >> 2) + (y / 3)) % 2 === 0) g.px(x + (y % 2), y, mixHex(fieldD, GOLD.d, 0.35))

    // --- main roof surfaces (receding behind the main gable) ---
    roofBand(g, cx, A2, cx - HW2, B2, 11, roof2)
    roofBand(g, cx, A2, cx + HW2, B2, 11, roof2)
    // Ridge with the rear chofa.
    g.vline(cx, A2 - 11, A2, GOLD.D)
    g.vline(cx + 1, A2 - 11, A2, GOLD.DD)
    chofa(g, cx, A2 - 11, 7, 1)
    glints.push({ x: cx + 1, y: A2 - 18 })

    // --- side wing tiers (ปีกนก) – two levels on each side ---
    for (const s of [-1, 1]) {
      // Upper wing.
      const ax = cx + s * (HW2 - 6)
      const ay = Math.round(lerpY(cx, A2, cx + s * HW2, B2, ax)) + 3
      const bx = cx + s * (HW2 + 14)
      const by = B2 + 12
      roofBand(g, ax, ay, bx, by, 8, roof)
      bargeBoard(g, ax, ay, bx, by, 3)
      hangHong(g, bx + s, by + 1, s)
      glints.push({ x: bx + s * 3, y: by - 3 })
      bells.push({ x: bx + s, y: by + 4 })
      // Lower wing (verandah).
      const cx2 = cx + s * (HW2 + 2)
      const cy2 = B2 + 12
      const dx2 = cx + s * (HW2 + 24)
      const dy2 = B2 + 25
      roofBand(g, cx2, cy2, dx2, dy2, 8, roof)
      bargeBoard(g, cx2, cy2, dx2, dy2, 3)
      hangHong(g, dx2 + s, dy2 + 1, s)
      glints.push({ x: dx2 + s * 3, y: dy2 - 3 })
      bells.push({ x: dx2 + s, y: dy2 + 4 })
    }

    // --- main gable (rear, taller) ---
    glints.push(...gable(g, cx, A2, HW2, B2, { field: field2, fieldD: field2D, sparkA: '#8fb6ff', sparkB: '#ffd6e0', motif: 'emblem' }))

    // --- porch roof surfaces + porch gable (front, lower) ---
    // Shadow under the main eave onto the porch roof.
    roofBand(g, cx, A1, cx - HW1, B1, 8, roof)
    roofBand(g, cx, A1, cx + HW1, B1, 8, roof)
    g.vline(cx, A1 - 8, A1, GOLD.D)
    glints.push(...gable(g, cx, A1, HW1, B1, { field, fieldD, sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'narai' }))
    bells.push({ x: cx - HW1 - 2, y: B1 + 4 }, { x: cx + HW1 + 2, y: B1 + 4 })

    // --- walls behind the columns (in the porch shade) ---
    const wallL = cx - HW2 - 20
    const wallR = cx + HW2 + 20
    g.rect(wallL, B1 + 1, wallR - wallL, floor - B1 - 1, WHITE.d)
    // Soft shadow under the eaves.
    g.rect(wallL, B1 + 1, wallR - wallL, 3, WHITE.DD)
    g.rect(wallL, B1 + 4, wallR - wallL, 2, WHITE.D)
    // Verandah side bays are deeper in shade.
    g.rect(wallL, B1 + 1, 18, floor - B1 - 1, mixHex(WHITE.D, '#b8a3c8', 0.2))
    g.rect(wallR - 18, B1 + 1, 18, floor - B1 - 1, mixHex(WHITE.D, '#b8a3c8', 0.2))
    // Beam (ขื่อ) across the porch.
    g.rect(cx - HW1 - 4, B1, (HW1 + 4) * 2 + 1, 1, GOLD.l)
    g.rect(cx - HW1 - 4, B1 + 1, (HW1 + 4) * 2 + 1, 2, P.redD)
    for (let x = cx - HW1 - 2; x < cx + HW1 + 4; x += 3) g.px(x, B1 + 1, GOLD.d)
    g.rect(cx - HW1 - 4, B1 + 3, (HW1 + 4) * 2 + 1, 1, GOLD.D)
    // Verandah beams.
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? wallL : cx + HW1 + 5
      const x1 = s < 0 ? cx - HW1 - 5 : wallR - 1
      g.rect(x0, B2 + 26, x1 - x0 + 1, 1, GOLD.l)
      g.rect(x0, B2 + 27, x1 - x0 + 1, 2, P.redD)
      g.rect(x0, B2 + 29, x1 - x0 + 1, 1, GOLD.D)
    }

    // Door with its crown.
    const dw = 12
    const dh = 24
    const dx = cx - dw / 2
    const dy = floor - dh
    crown(g, cx, dy - 1, dw + 6, 12)
    lacquerPanel(g, dx, dy, dw, dh, night, 2)
    g.rect(dx - 2, dy - 1, 1, dh + 1, GOLD.D)
    g.rect(dx + dw + 1, dy - 1, 1, dh + 1, GOLD.D)
    hooks.door = [{ x: cx, y: dy + dh / 2 }]
    // Windows.
    for (const wx of [cx - 25, cx + 25, cx - 57, cx + 57]) {
      const ww = Math.abs(wx - cx) > 40 ? 6 : 8
      const wy = floor - 22
      crown(g, wx, wy - 1, ww + 4, 8)
      lacquerPanel(g, wx - ww / 2, wy, ww, 13, night, 2)
      windows.push({ x: wx, y: wy + 6 })
    }
    // Columns.
    for (const x of [cx - 14, cx + 11, cx - 38, cx + 35]) column(g, x, colTop, floor, 4)
    for (const x of [cx - 67, cx + 64]) column(g, x, B2 + 30, floor, 4)
    // Valances between columns.
    valance(g, cx - 33, cx - 15, colTop - 1)
    valance(g, cx + 15, cx + 34, colTop - 1)
    valance(g, cx - 62, cx - 40, B2 + 30)
    valance(g, cx + 40, cx + 63, B2 + 30)
    // Brackets (คันทวย) from the outer columns to the lower wing eaves.
    for (const s of [-1, 1]) {
      const bx = s < 0 ? cx - 67 : cx + 67
      g.line(bx, B2 + 34, bx + s * 4, B2 + 29, GOLD.d)
      g.px(bx + s * 4, B2 + 28, GOLD.l)
    }

    // --- platform (ฐานไพที) with lotus mouldings ---
    const px0 = cx - HW2 - 26
    const pw = (HW2 + 26) * 2 + 1
    g.rect(px0 + 2, floor - 1, pw - 4, 2, '#f6eedd')
    g.hline(px0 + 2, px0 + pw - 3, floor - 1, WHITE.L)
    g.rect(px0, plat0, pw, plat1 - plat0, WHITE.b)
    g.hline(px0, px0 + pw - 1, plat0, WHITE.L)
    for (let x = px0; x < px0 + pw; x++) {
      // Upturned lotus petals.
      const k = (x - px0) % 3
      g.px(x, plat0 + 1, k === 1 ? GOLD.l : WHITE.d)
      g.px(x, plat0 + 2, k === 1 ? GOLD.d : WHITE.D)
      // Downturned petals.
      g.px(x, plat0 + 7, k === 1 ? GOLD.d : WHITE.D)
      g.px(x, plat0 + 8, k === 1 ? GOLD.l : WHITE.d)
    }
    g.rect(px0, plat0 + 3, pw, 4, P.redD)
    g.hline(px0, px0 + pw - 1, plat0 + 3, P.redDD)
    for (let x = px0 + 1; x < px0 + pw; x += 4) {
      g.px(x, plat0 + 5, GOLD.b)
      g.px(x + 1, plat0 + 4, GOLD.d)
      g.px(x - 1, plat0 + 4, GOLD.d)
    }
    g.rect(px0, plat0 + 9, pw, plat1 - plat0 - 9, WHITE.b)
    g.hline(px0, px0 + pw - 1, plat1 - 1, WHITE.D)
    // Corner redents.
    g.vline(px0 + 3, plat0, plat1 - 1, WHITE.d)
    g.vline(px0 + pw - 4, plat0, plat1 - 1, WHITE.D)

    // --- naga stairs (บันไดนาค) ---
    const steps = 6
    const stepH = (ground - floor) / steps
    for (let i = 0; i < steps; i++) {
      const y = Math.round(floor + 1 + i * stepH)
      const y2 = Math.round(floor + 1 + (i + 1) * stepH)
      const half = 10 + Math.round(i * 0.8)
      g.rect(cx - half, y, half * 2 + 1, y2 - y, WHITE.b)
      g.hline(cx - half, cx + half, y, WHITE.L)
      g.hline(cx - half, cx + half, y2 - 1, WHITE.D)
      if (y2 - y > 3) g.hline(cx - half, cx + half, y2 - 2, WHITE.d)
    }
    for (const s of [-1, 1]) nagaRail(g, cx + s * 12, floor - 4, cx + s * 16, ground, s)

    // Candles & flower urns at the door.
    for (const s of [-1, 1]) {
      g.rect(cx + s * 9 - 1, floor - 5, 3, 5, GOLD.d)
      g.rect(cx + s * 9 - 1, floor - 5, 3, 1, GOLD.l)
      g.px(cx + s * 9, floor - 7, '#ffd6e0')
      g.px(cx + s * 9 - 1, floor - 6, '#ff9fc0')
      g.px(cx + s * 9 + 1, floor - 6, '#ff9fc0')
    }

    hooks.glints = glints
    hooks.bells = bells
    hooks.windows = windows
    hooks.candles = [
      { x: cx - 9, y: floor - 8 },
      { x: cx + 9, y: floor - 8 },
    ]
  })
}

/** Naga balustrade from the top (x0, y0) down to the head at (x1, y1). */
export function nagaRail(g: Surface, x0: number, y0: number, x1: number, y1: number, s: number, body: Color = '#5cbf73', scale: Color = GOLD.b) {
  const bodyD = mixHex(body, '#1e4a3a', 0.45)
  const n = Math.max(1, y1 - y0)
  for (let i = 0; i <= n; i++) {
    const y = y0 + i
    const x = Math.round(x0 + ((x1 - x0) * i) / n)
    g.rect(x - 1, y - 2, 3, 3, body)
    g.px(x + s, y, bodyD)
    if (i % 3 === 0) g.px(x, y - 2, scale)
    if (i % 3 === 1) g.px(x - s, y - 1, GOLD.l)
  }
  // Raised head with a golden crest (หงอน) – drawn facing the visitor.
  nagaHead(g, x1 - 5, y1 - 15, body, s < 0)
}

const NAGA_HEAD = [
  '.L..L..L..',
  '.Gl.Gl.Gl.',
  'LGGlGGlGGL',
  'GgGGgGGgGG',
  '.GbbbbbbG.',
  '.bBbbbbBb.',
  '.bEwbbEwb.',
  '.bEEbbEEb.',
  '..bbrrbb..',
  '..dbbbbd..',
  '...bGGb...',
  '...bggb...',
  '...bGGb...',
  '..bbggbb..',
  '.dbbbbbbd.',
]

export function nagaHead(g: Surface, x: number, y: number, body: Color = '#5cbf73', flip = false) {
  const pal = { L: GOLD.L, G: GOLD.b, g: GOLD.d, l: GOLD.l, b: body, B: mixHex(body, '#ffffff', 0.35), d: mixHex(body, '#1e4a3a', 0.45), E: P.ink, w: '#ffffff', r: P.red }
  rows(g, x, y, NAGA_HEAD, pal, flip)
}

// ---------------------------------------------------------------------------
// Shaded horizontal slices: most round/square masonry is drawn row by row
// with a light left side and a shaded right side.

export interface Ramp {
  L: Color
  b: Color
  d: Color
  D: Color
}

const WHITE_RAMP: Ramp = { L: '#ffffff', b: '#fffaf0', d: '#ece0cc', D: '#d2bfa2' }
const GOLD_RAMP: Ramp = { L: GOLD.L, b: GOLD.b, d: GOLD.d, D: GOLD.D }

/** One shaded row centred on cx with half width `half`. */
export function slice(g: Surface, cx: number, y: number, half: number, r: Ramp, lit = 0.3) {
  const x0 = Math.round(cx - half)
  const x1 = Math.round(cx + half)
  const w = x1 - x0
  if (w <= 0) return
  g.rect(x0, y, w, 1, r.b)
  const l = Math.max(1, Math.round(w * lit))
  g.rect(x0 + 1, y, Math.max(0, l - 1), 1, r.L)
  const d = Math.max(1, Math.round(w * 0.22))
  g.rect(x1 - d, y, d, 1, r.d)
  g.px(x1 - 1, y, r.D)
  g.px(x0, y, r.d)
}

/** A redented square tier (ย่อมุม) seen from the front with its top surface. */
export function tier(g: Surface, cx: number, top: number, h: number, half: number, r: Ramp, band?: Color) {
  // Top surface.
  g.rect(Math.round(cx - half + 1), top, Math.round(half * 2) - 1, 1, r.L)
  for (let y = top + 1; y < top + h; y++) slice(g, cx, y, half, r, 0.35)
  // Redent shadows near the corners.
  g.vline(Math.round(cx - half + 2), top + 1, top + h - 1, r.b)
  g.vline(Math.round(cx + half - 3), top + 1, top + h - 1, r.D)
  if (band) g.hline(Math.round(cx - half), Math.round(cx + half) - 1, top + h - 1, band)
}

// ---------------------------------------------------------------------------
// Bell-shaped chedi (เจดีย์ทรงระฆัง), white with a golden spire.

export function chediSprite(o: { gold?: boolean; small?: boolean } = {}): Building {
  const W = o.small ? 40 : 60
  const H = o.small ? 80 : 118
  const k = o.small ? 0.66 : 1
  return build(`chedi:${o.gold ? 1 : 0}:${o.small ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const body = o.gold ? GOLD_RAMP : WHITE_RAMP
    const S = (v: number) => Math.round(v * k)
    let y = H - 1
    // Base tiers.
    const tiers: [number, number][] = [
      [S(8), S(28)],
      [S(6), S(24)],
      [S(5), S(20)],
    ]
    for (const [h, half] of tiers) {
      y -= h
      tier(g, cx, y, h, half, body, o.gold ? GOLD.D : P.redD)
      if (!o.gold) g.hline(Math.round(cx - half) + 1, Math.round(cx + half) - 2, y + h - 2, GOLD.d)
    }
    // Niche with a little golden Buddha on the middle tier.
    if (!o.small) {
      const ny = H - 1 - S(8) - S(6) + 1
      g.rect(cx - 4, ny, 8, 5, GOLD.d)
      g.rect(cx - 3, ny + 1, 6, 4, '#5a3d4f')
      g.px(cx - 1, ny + 2, GOLD.b)
      g.px(cx, ny + 2, GOLD.b)
      g.rect(cx - 2, ny + 3, 4, 2, GOLD.b)
      g.px(cx - 1, ny + 1, GOLD.l)
    }
    // Lotus base with petals.
    for (let i = 0; i < S(5); i++) {
      y -= 1
      const half = S(17) - i * 0.4
      slice(g, cx, y, half, body)
      if (i === 1 || i === 3) for (let x = Math.round(cx - half) + 1; x < cx + half - 1; x += 3) g.px(x, y, o.gold ? GOLD.D : GOLD.d)
    }
    // Three rings (มาลัยเถา).
    for (const half of [S(15), S(13.5), S(12)]) {
      y -= 1
      slice(g, cx, y, half, body)
      g.hline(Math.round(cx - half) + 1, Math.round(cx + half) - 2, y, body.L)
      y -= 1
      slice(g, cx, y, half, body)
      y -= 1
      slice(g, cx, y, half - 1, { ...body, b: body.d, L: body.b })
    }
    // Gold band at the foot of the bell.
    y -= 1
    slice(g, cx, y, S(13), GOLD_RAMP)
    // The bell (องค์ระฆัง).
    const bellH = S(28)
    const bellW = S(14)
    const bellBase = y
    for (let i = 1; i <= bellH; i++) {
      const t = i / bellH
      const half = bellW * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.6)))
      slice(g, cx, bellBase - i, half, body, 0.32)
    }
    // Garland (สังวาล) swags around the bell.
    if (!o.gold) {
      for (let x = -bellW + 2; x <= bellW - 2; x++) {
        const sw = Math.round(Math.abs(Math.sin((x / bellW) * Math.PI * 1.5)) * S(3))
        g.px(cx + x, bellBase - S(8) + sw, GOLD.d)
      }
      for (let x = -bellW + 4; x <= bellW - 4; x += 5) {
        g.px(cx + x, bellBase - S(8) + 1 + Math.round(Math.abs(Math.sin((x / bellW) * Math.PI * 1.5)) * S(3)), GOLD.b)
      }
      // Highlight curve.
      for (let i = 4; i < bellH - 4; i++) {
        const t = i / bellH
        const half = bellW * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.6)))
        g.px(Math.round(cx - half * 0.55), bellBase - i, '#ffffff')
      }
    }
    y = bellBase - bellH
    // Harmika (บัลลังก์).
    const hh = S(6)
    const hw = S(6)
    g.rect(cx - hw - 1, y - 1, hw * 2 + 2, 1, GOLD.D)
    for (let i = 0; i < hh; i++) slice(g, cx, y - 1 - i, hw, i === 0 || i === hh - 1 ? GOLD_RAMP : body)
    y -= hh + 1
    // Rings (ปล้องไฉน).
    const nr = o.small ? 6 : 8
    for (let i = 0; i < nr; i++) {
      const half = Math.max(1.5, S(5.2) - i * (S(5.2) - 1.5) / nr)
      slice(g, cx, y, half, GOLD_RAMP)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      slice(g, cx, y - 1, half, GOLD_RAMP)
      slice(g, cx, y - 2, half - 0.3, GOLD_RAMP)
      y -= 3
    }
    // Spire (ปลียอด) and crystal ball.
    const sp = S(12)
    for (let i = 0; i < sp; i++) {
      const half = 1.6 - (i / sp) * 1.2
      slice(g, cx, y - i, half, GOLD_RAMP, 0.5)
    }
    y -= sp
    g.px(cx - 1, y - 1, GOLD.l)
    g.px(cx, y - 1, '#ffffff')
    g.px(cx - 1, y - 2, GOLD.b)
    g.px(cx - 1, y - 3, GOLD.l)
    hooks.glints = [{ x: cx - 1, y: y - 2 }, { x: cx - hw, y: bellBase - bellH - 2 }]
    hooks.top = [{ x: cx, y: y - 3 }]
  })
}

// ---------------------------------------------------------------------------
// Bell tower (หอระฆัง). The bell itself is drawn by the scene (hook 'bell').

export function bellTowerSprite(roof: RoofRamp = ROOF.orange): Building {
  const W = 50
  const H = 92
  return build(`belltower:${roof.field}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Plinth and lower body.
    tier(g, cx, H - 8, 7, 21, WHITE_RAMP, P.redD)
    for (let y = H - 36; y < H - 8; y++) slice(g, cx, y, 16, WHITE_RAMP, 0.3)
    g.hline(cx - 16, cx + 15, H - 36, '#ffffff')
    // Arched doorway with gold trim.
    g.rect(cx - 5, H - 26, 10, 18, GOLD.d)
    g.rect(cx - 4, H - 25, 8, 17, '#4a3048')
    dome(g, cx, H - 25, 5, 5, GOLD.d)
    dome(g, cx, H - 25, 4, 4, '#4a3048')
    g.px(cx, H - 31, GOLD.l)
    // Little windows.
    for (const s of [-1, 1]) {
      g.rect(cx + s * 11 - 1, H - 28, 3, 6, GOLD.d)
      g.rect(cx + s * 11, H - 27, 1, 5, '#4a3048')
    }
    // Cornice.
    for (let i = 0; i < 4; i++) slice(g, cx, H - 40 + i, 18 - (i === 3 ? 1 : 0), i === 1 ? GOLD_RAMP : WHITE_RAMP)
    g.hline(cx - 18, cx + 17, H - 41, P.redD)
    // Belfry: four posts, the rear ones darker.
    const bT = H - 64
    const bB = H - 41
    g.rect(cx - 15, bT, 30, bB - bT, '#5a3d4f')
    g.rect(cx - 15, bT, 30, 3, '#3a2838')
    for (const s of [-1, 1]) {
      g.rect(cx + s * 11 - 1, bT, 3, bB - bT, WHITE.D)
      g.rect(cx + s * 16 - (s > 0 ? 2 : 0), bT, 3, bB - bT, WHITE.b)
      g.px(cx + s * 16 - (s > 0 ? 2 : 0), bT, GOLD.b)
      g.px(cx + s * 16 - (s > 0 ? 0 : -2), bT + 1, WHITE.D)
    }
    // Balustrade.
    g.rect(cx - 15, bB - 5, 30, 1, WHITE.b)
    for (let x = cx - 14; x < cx + 14; x += 3) g.rect(x, bB - 4, 1, 4, WHITE.d)
    // Beam where the bell hangs.
    g.rect(cx - 16, bT + 2, 32, 2, P.redD)
    g.hline(cx - 16, cx + 15, bT + 2, GOLD.d)
    valance(g, cx - 13, cx + 12, bT + 4)
    hooks.bell = [{ x: cx, y: bT + 6 }]
    // Roof: little gable with wings.
    const apex = 10
    const base = bT
    for (const s of [-1, 1]) {
      roofBand(g, cx + s * 14, base - 8, cx + s * 24, base + 1, 6, roof)
      bargeBoard(g, cx + s * 14, base - 8, cx + s * 24, base + 1, 2)
      hangHong(g, cx + s * 25, base + 2, s)
    }
    roofBand(g, cx, apex, cx - 18, base, 7, roof)
    roofBand(g, cx, apex, cx + 18, base, 7, roof)
    const gl = gable(g, cx, apex, 18, base, { field: P.redD, fieldD: P.redDD, sparkA: P.redL, sparkB: '#8fb6ff', motif: 'emblem', thick: 2 })
    hooks.glints = gl
    hooks.bells = [
      { x: cx - 25, y: base + 5 },
      { x: cx + 25, y: base + 5 },
    ]
  })
}

/** Upper half of an ellipse standing on `baseY`. */
export function dome(g: Surface, cx: number, baseY: number, rx: number, ry: number, c: Color) {
  for (let yy = Math.floor(baseY - ry); yy < baseY; yy++) {
    const dy = (yy + 0.5 - baseY) / ry
    const half = rx * Math.sqrt(Math.max(0, 1 - dy * dy))
    const a = Math.round(cx - half)
    const b = Math.round(cx + half)
    if (b > a) g.rect(a, yy, b - a, 1, c)
  }
}

/** Big bronze temple bell with its top-centre at (x, y), swinging by `swing` px at the bottom. */
export function drawTowerBell(g: Surface, x: number, y: number, swing: number) {
  const art = [
    '...kk...',
    '..kddk..',
    '.dGGGGd.',
    '.GLGGGd.',
    'dGLGGGDd',
    'dGLGGGDd',
    'dGGGGGDd',
    'dGGGGGDd',
    'GGGGGGGD',
    'DDDDDDDD',
    '...dd...',
  ]
  const pal: Record<string, Color> = { k: '#4a3128', d: '#b8742a', G: '#d9a441', L: '#ffe27a', D: '#8a5222' }
  for (let r = 0; r < art.length; r++) {
    const off = Math.round((swing * r) / art.length)
    for (let c = 0; c < 8; c++) {
      const col = pal[art[r][c]]
      if (col) g.px(x - 4 + c + off, y + r, col)
    }
  }
}

// ---------------------------------------------------------------------------
// Long pavilions seen from their long side (bell rack, holy water, sala).

export function longRoof(g: Surface, x0: number, x1: number, ridgeY: number, eaveY: number, inset: number, roof: RoofRamp) {
  // Tiled trapezoid.
  for (let y = ridgeY; y <= eaveY; y++) {
    const t = (y - ridgeY) / Math.max(1, eaveY - ridgeY)
    const a = Math.round(x0 + inset * (1 - t))
    const b = Math.round(x1 - inset * (1 - t))
    const edge = eaveY - y
    let c = roof.field
    if (edge < 2) c = edge === 0 ? roof.borderD : roof.border
    else if ((y - ridgeY) % 3 === 2) c = roof.fieldD
    g.rect(a, y, b - a + 1, 1, c)
    if (edge >= 2 && (y - ridgeY) % 3 === 1) for (let x = a + ((y >> 1) % 4); x < b; x += 4) g.px(x, y, roof.fieldL)
    // Gable end barge boards.
    g.px(a, y, GOLD.b)
    g.px(b, y, GOLD.b)
    if (y % 3 === 0) {
      g.px(a - 1, y, GOLD.l)
      g.px(b + 1, y, GOLD.l)
    }
  }
  // Gold ridge with chofa at both ends.
  g.hline(x0 + inset, x1 - inset, ridgeY, GOLD.b)
  g.hline(x0 + inset, x1 - inset, ridgeY - 1, GOLD.d)
  for (const [x, dir] of [
    [x0 + inset, -1],
    [x1 - inset, 1],
  ] as const) {
    g.px(x, ridgeY - 2, GOLD.b)
    g.px(x + dir, ridgeY - 3, GOLD.b)
    g.px(x + dir, ridgeY - 4, GOLD.l)
    g.px(x + dir * 2, ridgeY - 5, GOLD.b)
  }
  // Hang hong at the eave corners.
  hangHong(g, x0 - 1, eaveY + 1, -1)
  hangHong(g, x1 + 1, eaveY + 1, 1)
}

/** Rack of nine bells (ระฆัง ๙ ใบ). Bells are drawn by the scene at hooks.bells. */
export function bellRackSprite(n = 9): Building {
  const W = n * 8 + 14
  const H = 46
  return build(`bellrack:${n}`, W, H, W / 2, H - 1, (g, hooks) => {
    // Stone base.
    tier(g, W / 2, H - 6, 6, W / 2 - 1, WHITE_RAMP)
    // Posts.
    for (const x of [4, W - 7, Math.floor(W / 2) - 1]) {
      g.rect(x, 17, 3, H - 23, P.redD)
      g.px(x, 17, P.redL)
      g.vline(x, 18, H - 7, P.red)
      g.rect(x - 1, H - 9, 5, 3, GOLD.d)
    }
    // Beam.
    g.rect(2, 17, W - 4, 3, P.redD)
    g.hline(2, W - 3, 17, GOLD.l)
    g.hline(2, W - 3, 19, P.redDD)
    for (let x = 4; x < W - 4; x += 4) g.px(x, 18, GOLD.b)
    longRoof(g, 2, W - 3, 4, 15, 6, ROOF.orange)
    hooks.bells = Array.from({ length: n }, (_, i) => ({ x: 11 + i * 8, y: 20 }))
  })
}

/** Small bell hanging from a rack; `swing` shears it sideways. */
export function drawRackBell(g: Surface, x: number, y: number, swing: number) {
  const art = ['..k..', '..k..', '.dGd.', 'dGLGd', 'dGLGD', 'dGGGD', 'GGGGD', 'DDDDD', '..d..']
  const pal: Record<string, Color> = { k: '#6e4a35', d: GOLD.d, G: GOLD.b, L: GOLD.L, D: GOLD.D }
  for (let r = 0; r < art.length; r++) {
    const off = Math.round((swing * r) / art.length)
    for (let c = 0; c < 5; c++) {
      const col = pal[art[r][c]]
      if (col) g.px(x - 2 + c + off, y + r, col)
    }
  }
}

/** Holy water sala with the Ratchaburi dragon jar (โอ่งมังกร). */
export function holyWaterSprite(): Building {
  const W = 52
  const H = 52
  return build('holywater2', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    tier(g, cx, H - 6, 6, 25, WHITE_RAMP, P.redD)
    g.rect(4, H - 7, W - 8, 1, '#e4d6bf')
    // Posts.
    for (const x of [4, W - 8]) column(g, x, 18, H - 6, 4)
    g.rect(3, 16, W - 6, 3, P.redD)
    g.hline(3, W - 4, 16, GOLD.l)
    g.hline(3, W - 4, 18, GOLD.D)
    valance(g, 9, W - 10, 19)
    longRoof(g, 2, W - 3, 4, 14, 7, ROOF.green)
    // Jar.
    const jy = H - 7
    g.ellipse(cx, jy - 9, 12, 10, '#6e3f27')
    g.ellipse(cx - 1, jy - 10, 11, 9, '#8f5634')
    g.ellipse(cx - 4, jy - 13, 4, 4, '#b8774a')
    g.px(cx - 5, jy - 14, '#d9a070')
    g.rect(cx - 8, jy - 20, 16, 3, '#5a3322')
    g.ellipse(cx, jy - 20, 8, 2, '#4a2a1e')
    g.ellipse(cx, jy - 20, 7, 1.3, P.waterD)
    g.px(cx - 3, jy - 20, P.waterL)
    // Golden dragon winding around the jar.
    for (let x = -10; x <= 10; x++) {
      const y = jy - 10 + Math.round(Math.sin(x * 0.55) * 2)
      g.px(cx + x, y, GOLD.b)
      if (x % 3 === 0) g.px(cx + x, y - 1, GOLD.l)
    }
    g.rect(cx + 9, jy - 14, 3, 3, GOLD.b)
    g.px(cx + 10, jy - 13, P.ink)
    // Floating flowers and a ladle.
    g.px(cx - 2, jy - 21, '#ff9fc0')
    g.px(cx + 3, jy - 21, '#fffaf0')
    g.px(cx + 4, jy - 21, GOLD.b)
    g.line(cx + 5, jy - 22, cx + 12, jy - 27, '#c9a04c')
    g.rect(cx + 11, jy - 29, 3, 2, '#c9a04c')
    hooks.water = [{ x: cx, y: jy - 20 }]
  })
}

// ---------------------------------------------------------------------------
// Walls and gates.

/** Temple wall (กำแพงแก้ว) segment with a tiled coping and lotus-bud posts. */
export function wallSprite(len: number, opts: { posts?: number } = {}): Prop {
  const H = 26
  return sprite(`twall:${len}:${opts.posts ?? 24}`, len, H, 0, H - 1, (g) => {
    const top = 8
    g.rect(0, top + 3, len, H - top - 3, WHITE.b)
    g.rect(0, top + 3, len, 1, '#ffffff')
    g.rect(0, H - 4, len, 3, WHITE.D)
    g.rect(0, H - 1, len, 1, WHITE.DD)
    // Coping roof.
    g.rect(0, top, len, 3, ROOF.red.field)
    g.hline(0, len - 1, top, ROOF.red.fieldL)
    for (let x = 1; x < len; x += 3) g.px(x, top + 1, ROOF.red.fieldD)
    g.hline(0, len - 1, top + 3, ROOF.red.border)
    g.hline(0, len - 1, top + 4, ROOF.red.borderD)
    // Ventilation panels (ช่องลม) between posts.
    const step = opts.posts ?? 24
    for (let x = 0; x + step <= len + 1; x += step) {
      for (let i = x + 6; i < x + step - 4; i += 4) {
        g.rect(i, top + 9, 2, 4, WHITE.D)
        g.px(i, top + 9, '#c9b69a')
      }
      g.hline(x + 4, x + step - 4, top + 15, GOLD.d)
    }
    // Posts with lotus-bud finials (หัวเม็ด).
    for (let x = 0; x <= len - 4; x += step) {
      const px = Math.min(len - 5, x)
      g.rect(px, top - 1, 5, H - top + 1, WHITE.b)
      g.rect(px + 4, top - 1, 1, H - top + 1, WHITE.D)
      g.rect(px, top - 1, 1, H - top + 1, '#ffffff')
      g.rect(px - 1, top - 2, 7, 2, WHITE.d)
      g.rect(px, top - 5, 5, 3, WHITE.b)
      g.rect(px + 1, top - 7, 3, 2, WHITE.b)
      g.px(px + 2, top - 8, GOLD.b)
      g.px(px + 3, top - 6, WHITE.D)
      g.px(px + 1, top - 4, GOLD.d)
    }
  }, true)
}

/** Grand gate (ซุ้มประตู) – 72 wide; the opening spans x 20..52 of the sprite. */
export function gateSprite(): Building {
  const W = 76
  const H = 84
  return build('tgate2', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Pillars.
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 2 : W - 16
      for (let y = 36; y < H - 1; y++) slice(g, x0 + 7, y, 7, WHITE_RAMP)
      g.rect(x0 - 1, H - 6, 16, 5, WHITE.d)
      g.hline(x0 - 1, x0 + 14, H - 6, '#ffffff')
      g.rect(x0 + 3, 44, 8, 26, P.redD)
      g.rect(x0 + 4, 45, 6, 24, P.red)
      for (let y = 47; y < 68; y += 4) {
        g.px(x0 + 6, y, GOLD.b)
        g.px(x0 + 7, y + 1, GOLD.b)
        g.px(x0 + 8, y, GOLD.b)
      }
      g.rect(x0 + 2, 43, 10, 1, GOLD.d)
      g.rect(x0 + 2, 70, 10, 1, GOLD.d)
      g.rect(x0 - 1, 34, 16, 3, GOLD.b)
      g.hline(x0 - 1, x0 + 14, 34, GOLD.L)
      g.hline(x0 - 1, x0 + 14, 36, GOLD.D)
    }
    // Arch opening frame (ซุ้มโค้ง) with gold trim.
    const ax0 = 17
    const ax1 = W - 17
    for (let x = ax0; x < ax1; x++) {
      const t = (x - ax0) / (ax1 - ax0 - 1)
      const archY = 40 + Math.round(Math.pow(Math.abs(t - 0.5) * 2, 2) * 6) - 4
      g.vline(x, 30, archY, WHITE.b)
      g.px(x, archY, GOLD.b)
      g.px(x, archY + 1, GOLD.D)
    }
    g.px(cx - 1, 35, GOLD.l)
    // Lintel with the name plaque.
    g.rect(2, 26, W - 4, 5, WHITE.b)
    g.hline(2, W - 3, 26, '#ffffff')
    g.hline(2, W - 3, 30, WHITE.D)
    g.rect(cx - 14, 27, 28, 7, GOLD.d)
    g.rect(cx - 13, 28, 26, 5, P.redD)
    for (let x = cx - 11; x < cx + 11; x += 2) g.px(x, 30, (x >> 1) % 3 ? GOLD.l : GOLD.b)
    // Roof with a central gable and side wings.
    for (const s of [-1, 1]) {
      roofBand(g, cx + s * 20, 16, cx + s * 38, 27, 6, ROOF.orange)
      bargeBoard(g, cx + s * 20, 16, cx + s * 38, 27, 2)
      hangHong(g, cx + s * 39, 28, s)
    }
    roofBand(g, cx, 8, cx - 26, 27, 8, ROOF.orange)
    roofBand(g, cx, 8, cx + 26, 27, 8, ROOF.orange)
    const gl = gable(g, cx, 8, 26, 27, { field: P.redD, fieldD: P.redDD, sparkA: P.redL, sparkB: '#8fb6ff', motif: 'emblem', thick: 2 })
    hooks.glints = gl
    hooks.bells = [
      { x: cx - 39, y: 32 },
      { x: cx + 39, y: 32 },
    ]
  })
}

// ---------------------------------------------------------------------------
// ใบเสมา (boundary stone) on a lotus pedestal inside a little gold-topped pavilion.

export function semaSprite(pavilion = true): Prop {
  const W = pavilion ? 16 : 10
  const H = pavilion ? 24 : 14
  return sprite(`sema:${pavilion ? 1 : 0}`, W, H, W >> 1, H - 1, (g) => {
    const cx = W >> 1
    const base = H - 1
    if (pavilion) {
      g.rect(1, base - 3, W - 2, 3, WHITE.b)
      g.hline(1, W - 2, base - 3, '#ffffff')
      g.hline(1, W - 2, base, WHITE.D)
      for (const x of [2, W - 4]) g.rect(x, 8, 2, base - 11, WHITE.b)
      g.rect(3, 8, W - 6, base - 11, '#e6d8c2')
      // Pointed roof.
      for (let i = 0; i < 6; i++) g.rect(cx - 7 + i, 7 - i, (7 - i) * 2 + 1, 1, i === 0 ? ROOF.orange.border : ROOF.orange.field)
      g.px(cx, 0, GOLD.b)
      g.px(cx, 1, GOLD.l)
      g.hline(1, W - 2, 8, GOLD.d)
    }
    // The leaf-shaped stone.
    const sy = base - (pavilion ? 3 : 1)
    const sh = pavilion ? 10 : 11
    for (let i = 0; i < sh; i++) {
      const t = i / sh
      const half = t < 0.6 ? 3 : 3 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.6) / 0.4, 2)))
      if (half > 0.2) slice(g, cx, sy - 1 - i, Math.max(0.6, half), { L: '#fffdf7', b: '#f0e8dc', d: '#d8ccbc', D: '#b8ab9c' })
    }
    g.px(cx - 1, sy - sh, '#f0e8dc')
    g.px(cx, sy - sh - 1, GOLD.b)
    g.px(cx - 1, sy - 4, GOLD.d)
    g.px(cx, sy - 5, GOLD.d)
    g.px(cx + 1, sy - 4, GOLD.d)
    g.rect(cx - 4, sy - 1, 8, 2, GOLD.d)
    g.hline(cx - 4, cx + 3, sy - 1, GOLD.l)
  })
}

