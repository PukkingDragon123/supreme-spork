// First-person stall scenes (ร้านค้าประจำสถานที่): you stand in front of the
// counter, the shopkeeper faces you, and the goods sit on shelves, hooks,
// trays and in glass cases. Each stall kind has its own look – ice-cream
// cart, amulet stall, noodle shop, 7-บุญ mart, souvenir kiosk, snack cart,
// costume rental, Chinese teahouse and the rooster-statue shop.
//
// The scene is split into a baked back layer (sky, walls, awning, shelves,
// back props), the NPC (drawn by the scene), a baked front layer (counter)
// and a few animated extras (steam, smoke, lanterns, fridge glow…).

import { bake, mix, type Color, type Surface } from '../engine/pixel'
import { Rng } from '../engine/rng'
import type { StallKind } from '../game/data/placeShops'
import { P } from './palette'
import { martLogo } from './mart'

// ---------------------------------------------------------------------------
// Layout

export type RowStyle = 'shelf' | 'hooks' | 'rack'
export type SlotRole = 'shelf' | 'hook' | 'rack' | 'counter' | 'case'

export interface StallSlot {
  /** Centre x of the item. */
  x: number
  /** Surface y: shelf board / counter top (items stand on it), or the hook point. */
  y: number
  /** Widest item that fits. */
  w: number
  role: SlotRole
  /** Drawn in front of the NPC. */
  front: boolean
  row: 'A' | 'B' | 'C' | 'D'
}

export interface StallLayout {
  w: number
  h: number
  /** Top of the awning. */
  top: number
  /** Shop sign board above the awning (x, y, w, h); h = 0 when it doesn't fit. */
  sign: [number, number, number, number]
  awningH: number
  rowA: number
  rowB: number
  rowC: number
  counterY: number
  counterH: number
  npcX: number
  npcY: number
  /** Width of the side columns next to the NPC. */
  side: number
  slots: StallSlot[]
}

export interface KindStyle {
  rows: { A: RowStyle; B: RowStyle; C: RowStyle }
  /** How snacks sit on the counter. */
  counter: 'tray' | 'case' | 'tubs' | 'bowls' | 'steamers' | 'plates'
  /** Open cart (sky behind) or a shop interior. */
  open: boolean
}

export const KIND_STYLE: Record<StallKind, KindStyle> = {
  icecream: { rows: { A: 'hooks', B: 'shelf', C: 'shelf' }, counter: 'tubs', open: true },
  amulet: { rows: { A: 'shelf', B: 'shelf', C: 'hooks' }, counter: 'case', open: false },
  noodle: { rows: { A: 'hooks', B: 'shelf', C: 'shelf' }, counter: 'bowls', open: false },
  mart: { rows: { A: 'shelf', B: 'shelf', C: 'shelf' }, counter: 'tray', open: false },
  souvenir: { rows: { A: 'hooks', B: 'shelf', C: 'hooks' }, counter: 'tray', open: true },
  snack: { rows: { A: 'hooks', B: 'shelf', C: 'shelf' }, counter: 'tray', open: true },
  costume: { rows: { A: 'rack', B: 'shelf', C: 'hooks' }, counter: 'plates', open: false },
  teahouse: { rows: { A: 'shelf', B: 'shelf', C: 'hooks' }, counter: 'steamers', open: false },
  rooster: { rows: { A: 'shelf', B: 'shelf', C: 'shelf' }, counter: 'plates', open: true },
}

const NPC_W = 68
/** How far the NPC's head top sits above the counter. */
const NPC_ABOVE = 82

/**
 * Everything hangs off the counter line, which sits just above the DOM panel
 * at the bottom (`insetBottom`); spare height above becomes the shop sign.
 */
export function stallLayout(kind: StallKind, w: number, h: number, insetTop: number, insetBottom: number): StallLayout {
  const counterY = Math.max(insetTop + 150, h - insetBottom - 2)
  // Spare height (tall phones) makes the awning and shelves roomier.
  const spare = Math.max(0, Math.min(44, counterY - 212 - insetTop))
  const awningH = 26 + Math.round(spare * 0.45)
  const rowC = counterY - 30
  const rowB = counterY - 90 - Math.round(spare * 0.12)
  const rowA = rowB - 31 - Math.round(spare * 0.12)
  const top = rowA - 30 - awningH
  const signH = 30
  const signW = Math.min(w - 24, 118)
  const signY = top - signH - 2
  const sign: [number, number, number, number] = signY >= insetTop - 2 ? [Math.round(w / 2 - signW / 2), signY, signW, signH] : [0, 0, 0, 0]
  const npcX = Math.round(w / 2 - NPC_W / 2)
  const npcY = counterY - NPC_ABOVE
  const side = Math.max(30, npcX + 6)
  const st = KIND_STYLE[kind]
  const slots: StallSlot[] = []
  const across = (row: 'A' | 'B', y: number, style: RowStyle) => {
    const n = Math.max(4, Math.min(6, Math.floor((w - 8) / 30)))
    const gap = (w - 8) / n
    for (let i = 0; i < n; i++) {
      const role: SlotRole = style === 'shelf' ? 'shelf' : style === 'rack' ? 'rack' : 'hook'
      slots.push({ x: Math.round(4 + gap * (i + 0.5)), y: role === 'shelf' ? y : y - 27, w: Math.floor(gap) - 2, role, front: false, row })
    }
  }
  across('A', rowA, st.rows.A)
  across('B', rowB, st.rows.B)
  // Beside the NPC.
  const cRole: SlotRole = st.rows.C === 'shelf' ? 'shelf' : 'hook'
  const perSide = side >= 58 ? 2 : 1
  for (let i = 0; i < perSide; i++) {
    const cx = Math.round((side / perSide) * (i + 0.5))
    slots.push({ x: cx, y: cRole === 'shelf' ? rowC : rowC - 26, w: Math.floor(side / perSide) - 2, role: cRole, front: false, row: 'C' })
    slots.push({ x: w - cx, y: cRole === 'shelf' ? rowC : rowC - 26, w: Math.floor(side / perSide) - 2, role: cRole, front: false, row: 'C' })
  }
  // Counter top.
  const n = Math.max(4, Math.min(6, Math.floor((w - 6) / 30)))
  const gap = (w - 6) / n
  for (let i = 0; i < n; i++) slots.push({ x: Math.round(3 + gap * (i + 0.5)), y: counterY + 2, w: Math.floor(gap) - 2, role: st.counter === 'case' ? 'case' : 'counter', front: true, row: 'D' })
  return { w, h, top, sign, awningH, rowA, rowB, rowC, counterY, counterH: 40, npcX, npcY, side, slots }
}

// ---------------------------------------------------------------------------
// Palettes per kind

interface Mood {
  sky: Color[]
  wall: Color
  wallD: Color
  wallL: Color
  wood: Color
  woodD: Color
  woodL: Color
  awn: [Color, Color]
  trim: Color
  counter: Color
  counterD: Color
  counterL: Color
  floor: Color
}

const MOOD: Record<StallKind, Mood> = {
  icecream: { sky: ['#8fd3ff', '#b9e6ff', '#e4f6ff'], wall: '#f4ead8', wallD: '#dccfb6', wallL: '#fffaf0', wood: '#e0bb8a', woodD: '#b8844a', woodL: '#f3dcb2', awn: ['#ff9fc0', '#fffaf0'], trim: '#6fcfb6', counter: '#fffaf0', counterD: '#f0c8d6', counterL: '#ffffff', floor: '#d8c8a8' },
  amulet: { sky: ['#3a2a30', '#4a3438', '#5a4040'], wall: '#6e3a2e', wallD: '#4e2620', wallL: '#8e4e3a', wood: '#8a5a32', woodD: '#5a3418', woodL: '#b8844a', awn: ['#b8343f', '#e9a53a'], trim: '#ffd54f', counter: '#6e4a35', counterD: '#4a3128', counterL: '#9a6a45', floor: '#4a3128' },
  noodle: { sky: ['#ffd9a0', '#ffe8c0', '#fff4dc'], wall: '#f2f2ec', wallD: '#d8d8cc', wallL: '#ffffff', wood: '#c28e5c', woodD: '#8a5a32', woodL: '#e0bb8a', awn: ['#e8514a', '#ffd54f'], trim: '#e8514a', counter: '#d0d0da', counterD: '#9898a8', counterL: '#f2f2f6', floor: '#b8a890' },
  mart: { sky: ['#e8f4ff', '#f4faff', '#ffffff'], wall: '#eef2f5', wallD: '#c9d3dc', wallL: '#ffffff', wood: '#a8a8b8', woodD: '#80808e', woodL: '#e4e8ec', awn: ['#3fa06e', '#f58f35'], trim: '#e8514a', counter: '#fffaf0', counterD: '#e6dccb', counterL: '#ffffff', floor: '#e4e0da' },
  souvenir: { sky: ['#7cc8ff', '#a4dcff', '#d4f1ff'], wall: '#f3dcb2', wallD: '#e0bb8a', wallL: '#fff1d6', wood: '#c28e5c', woodD: '#8a5a32', woodL: '#e0bb8a', awn: ['#5a8de0', '#ffd54f'], trim: '#5a8de0', counter: '#c28e5c', counterD: '#8a5a32', counterL: '#e0bb8a', floor: '#d8c8a8' },
  snack: { sky: ['#9fd8ff', '#c4e8ff', '#eaf8ff'], wall: '#f4ead8', wallD: '#dccfb6', wallL: '#fffaf0', wood: '#c28e5c', woodD: '#8a5a32', woodL: '#e0bb8a', awn: ['#43905a', '#fffaf0'], trim: '#43905a', counter: '#b87a4a', counterD: '#8a5a32', counterL: '#d9a06a', floor: '#cdbb98' },
  costume: { sky: ['#ffe1ea', '#fff0f4', '#fffaf6'], wall: '#fbe3ea', wallD: '#f0c0cf', wallL: '#fff4f8', wood: '#e9c46a', woodD: '#b8842a', woodL: '#fff3a6', awn: ['#e8709e', '#ffd54f'], trim: '#e9a53a', counter: '#fff4f8', counterD: '#f0c0cf', counterL: '#ffffff', floor: '#e8c8b8' },
  teahouse: { sky: ['#5a2a2a', '#6e3030', '#7e3a34'], wall: '#9e2f2a', wallD: '#7a2020', wallL: '#c24a3a', wood: '#5a3020', woodD: '#3a1c14', woodL: '#7a4a30', awn: ['#2f6f4b', '#ffd54f'], trim: '#ffd54f', counter: '#6e3424', counterD: '#4a2016', counterL: '#8e4a30', floor: '#4a2a1c' },
  rooster: { sky: ['#ffcf8a', '#ffe0a8', '#fff0cc'], wall: '#fff1d6', wallD: '#f3dcb2', wallL: '#fffaf0', wood: '#b8343f', woodD: '#7e2436', woodL: '#e8514a', awn: ['#e8514a', '#ffd54f'], trim: '#ffd54f', counter: '#e8514a', counterD: '#b8343f', counterL: '#ff8a7a', floor: '#d8b888' },
}

export function moodOf(kind: StallKind) {
  return MOOD[kind]
}

// ---------------------------------------------------------------------------
// Pieces

function scallop(g: Surface, x0: number, x1: number, y: number, a: Color, b: Color, step = 8, depth = 4) {
  for (let x = x0, i = 0; x < x1; x += step, i++) {
    const c = i % 2 ? b : a
    g.ellipse(x + step / 2, y, step / 2, depth, c)
  }
}

/** Striped canvas awning with scalloped hem and a sign board. */
function stripedAwning(g: Surface, L: StallLayout, m: Mood) {
  const { w, top } = L
  const hem = top + L.awningH - 4
  for (let x = 0; x < w; x++) {
    const c = Math.floor(x / 8) % 2 ? m.awn[1] : m.awn[0]
    g.vline(x, top + 8, hem, c)
  }
  g.dither(0, hem - 6, w, 6, null, 'rgba(58,40,56,0.18)', 0.5)
  scallop(g, 0, w, hem, m.awn[0], m.awn[1])
  g.rect(0, top + 6, w, 3, mix(m.awn[0], P.ink, 0.35))
  g.hline(0, w, top + 6, mix(m.awn[0], '#ffffff', 0.3))
}

const SIGN: Record<StallKind, { face: Color; edge: Color; trim: Color }> = {
  icecream: { face: '#fff4f8', edge: '#e8709e', trim: '#6fcfb6' },
  amulet: { face: '#8e1f2a', edge: '#e9a53a', trim: '#ffd54f' },
  noodle: { face: '#e8514a', edge: '#ffd54f', trim: '#fffaf0' },
  mart: { face: '#3fa06e', edge: '#f58f35', trim: '#ffffff' },
  souvenir: { face: '#fff1d6', edge: '#5a8de0', trim: '#ffd54f' },
  snack: { face: '#e0bb8a', edge: '#8a5a32', trim: '#43905a' },
  costume: { face: '#fff4f8', edge: '#e9a53a', trim: '#e8709e' },
  teahouse: { face: '#2a1a14', edge: '#ffd54f', trim: '#e8514a' },
  rooster: { face: '#b8343f', edge: '#ffd54f', trim: '#fff3a6' },
}

/** Colours of the sign text drawn by the DOM over the sign board. */
export function signInk(kind: StallKind): { color: string; shadow: string } {
  const dark = ['amulet', 'noodle', 'mart', 'teahouse', 'rooster'].includes(kind)
  return dark ? { color: '#fff6dc', shadow: mix(SIGN[kind].face, P.ink, 0.55) } : { color: '#3b2616', shadow: mix(SIGN[kind].face, '#ffffff', 0.2) }
}

/** The shop's name board above the awning, hung on two cords. */
function signBoard(g: Surface, L: StallLayout, kind: StallKind) {
  const [x, y, bw, bh] = L.sign
  if (!bh) return
  const c = SIGN[kind]
  for (const cx of [x + 10, x + bw - 11]) g.vline(cx, y + bh, L.top + 6, '#6e4a35')
  g.rect(x - 2, y - 2, bw + 4, bh + 4, P.ink)
  g.rect(x - 1, y - 1, bw + 2, bh + 2, c.edge)
  g.rect(x + 1, y + 1, bw - 2, bh - 2, c.face)
  g.hline(x + 1, x + bw - 2, y + 1, mix(c.face, '#ffffff', 0.3))
  g.hline(x + 1, x + bw - 2, y + bh - 2, mix(c.face, P.ink, 0.2))
  for (const [px, py] of [[x + 2, y + 2], [x + bw - 3, y + 2], [x + 2, y + bh - 3], [x + bw - 3, y + bh - 3]]) g.px(px, py, c.trim)
}

function posts(g: Surface, L: StallLayout, c: Color, d: Color) {
  for (const x of [2, L.w - 6]) {
    g.rect(x, L.top + 6, 4, L.counterY - L.top, c)
    g.vline(x + 3, L.top + 6, L.counterY, d)
  }
}

function shelfBoard(g: Surface, x0: number, x1: number, y: number, m: Mood) {
  g.rect(x0, y, x1 - x0, 3, m.wood)
  g.hline(x0, x1 - 1, y, m.woodL)
  g.hline(x0, x1 - 1, y + 3, m.woodD)
  g.dither(x0, y + 4, x1 - x0, 2, null, 'rgba(58,40,56,0.25)', 0.6)
  for (const x of [x0 + 3, x1 - 5]) {
    g.rect(x, y + 3, 2, 3, m.woodD)
  }
}

function hookRail(g: Surface, x0: number, x1: number, y: number, n: number, m: Mood) {
  g.rect(x0, y - 1, x1 - x0, 2, m.woodD)
  g.hline(x0, x1 - 1, y - 1, m.woodL)
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + ((x1 - x0) / n) * (i + 0.5))
    g.vline(x, y + 1, y + 3, '#a8a8b8')
    g.px(x + 1, y + 3, '#a8a8b8')
  }
}

function clothesRail(g: Surface, x0: number, x1: number, y: number) {
  g.rect(x0, y, x1 - x0, 2, '#c9c9d4')
  g.hline(x0, x1 - 1, y, '#f2f2f6')
  g.rect(x0, y - 4, 2, 6, '#a8a8b8')
  g.rect(x1 - 2, y - 4, 2, 6, '#a8a8b8')
}

function pegboard(g: Surface, x0: number, y0: number, x1: number, y1: number, c: Color) {
  g.rect(x0, y0, x1 - x0, y1 - y0, c)
  for (let y = y0 + 2; y < y1 - 1; y += 4) for (let x = x0 + 2 + ((y >> 2) % 2) * 2; x < x1 - 1; x += 4) g.px(x, y, mix(c, P.ink, 0.25))
}

// Backdrops ------------------------------------------------------------------

function skyAndPlace(g: Surface, L: StallLayout, m: Mood, seed: number) {
  const { w, h } = L
  g.gradientV(0, 0, w, h, m.sky, 8)
  const r = new Rng(seed)
  // Distant temple roofs and trees.
  const base = L.counterY - 20
  for (let i = 0; i < 5; i++) {
    const cx = r.int(0, w)
    g.ellipse(cx, base - 30 + r.int(-6, 6), r.int(12, 22), r.int(8, 14), '#9fcf8a')
  }
  const tx = Math.round(w * 0.72)
  g.poly([[tx - 24, base - 30], [tx, base - 52], [tx + 24, base - 30]], '#f2a05a')
  g.poly([[tx - 18, base - 44], [tx, base - 62], [tx + 18, base - 44]], '#e88a4a')
  g.vline(tx, base - 70, base - 62, '#e9a53a')
  g.rect(tx - 20, base - 30, 40, 30, '#fff1d6')
  const cx = Math.round(w * 0.2)
  g.poly([[cx - 8, base - 20], [cx, base - 58], [cx + 8, base - 20]], '#ffe27a')
  g.ellipse(cx, base - 22, 10, 6, '#ffd54f')
  g.rect(0, base, w, h - base, '#e8dcc0')
  g.dither(0, base - 4, w, 8, null, '#fffaf0', 0.35)
  // Soft clouds.
  for (let i = 0; i < 3; i++) {
    const x = r.int(0, w)
    const y = L.top + r.int(6, 40)
    g.ellipse(x, y, r.int(10, 18), 4, 'rgba(255,255,255,0.8)')
    g.ellipse(x + 6, y - 3, 7, 4, 'rgba(255,255,255,0.8)')
  }
}

function interior(g: Surface, L: StallLayout, m: Mood) {
  const { w, h } = L
  g.rect(0, 0, w, h, m.wall)
  g.dither(0, 0, w, L.top + 30, null, m.wallD, 0.35)
  // Warm light from above.
  g.ditherCircle(w / 2, L.top + 40, w * 0.55, m.wallL, 0.35, 0.8)
  g.rect(0, L.counterY - 6, w, h, m.floor)
}

// ---------------------------------------------------------------------------
// Kind specific back layers

type Painter = (g: Surface, L: StallLayout, m: Mood) => void

function rowsFor(g: Surface, L: StallLayout, m: Mood, kind: StallKind) {
  const st = KIND_STYLE[kind]
  const x0 = 2
  const x1 = L.w - 2
  const row = (style: RowStyle, y: number, n: number) => {
    if (style === 'shelf') shelfBoard(g, x0, x1, y, m)
    else if (style === 'hooks') hookRail(g, x0, x1, y - 27, n, m)
    else clothesRail(g, x0, x1, y - 27)
  }
  const nA = L.slots.filter((s) => s.row === 'A').length
  const nB = L.slots.filter((s) => s.row === 'B').length
  row(st.rows.A, L.rowA, nA)
  row(st.rows.B, L.rowB, nB)
  const c = st.rows.C
  if (c === 'shelf') {
    shelfBoard(g, 0, L.side, L.rowC, m)
    shelfBoard(g, L.w - L.side, L.w, L.rowC, m)
  } else {
    const n = L.slots.filter((s) => s.row === 'C').length / 2
    hookRail(g, 0, L.side, L.rowC - 26, n, m)
    hookRail(g, L.w - L.side, L.w, L.rowC - 26, n, m)
  }
}

const BACK: Record<StallKind, Painter> = {
  icecream(g, L, m) {
    skyAndPlace(g, L, m, 11)
    // Cart back panel with a pastel menu board.
    g.rect(4, L.rowA + 4, L.w - 8, L.counterY - L.rowA, '#fff4f8')
    g.rect(4, L.rowA + 4, L.w - 8, 2, '#ffd6e0')
    for (let y = L.rowA + 10; y < L.counterY; y += 6) g.hline(6, L.w - 7, y, '#ffe8ee')
    // Big umbrella.
    const cx = L.w / 2
    const ut = L.top + 2
    const ub = L.top + L.awningH + 4
    g.poly([[-8, ub], [cx, ut], [L.w + 8, ub]], m.awn[0])
    for (let i = 0; i < 9; i++) {
      if (i % 2) continue
      const xa = -8 + ((L.w + 16) / 9) * i
      const xb = xa + (L.w + 16) / 9
      g.poly([[xa, ub], [cx, ut], [xb, ub]], m.awn[1])
    }
    scallop(g, -8, L.w + 8, ub, m.awn[0], m.awn[1], (L.w + 16) / 9, 4)
    g.rect(cx - 1, ut - 4, 2, 5, '#e8709e')
    g.circle(cx, ut - 5, 2, '#ffd54f')
    g.rect(cx - 1, ub + 2, 2, L.rowA - ub, '#c9c9d4')
    rowsFor(g, L, m, 'icecream')
  },
  amulet(g, L, m) {
    interior(g, L, m)
    // Teak panelling and a shrine niche behind the NPC.
    for (let x = 0; x < L.w; x += 12) g.vline(x, L.top, L.counterY, m.wallD)
    const cx = L.w / 2
    g.rect(cx - 22, L.top + 30, 44, 40, '#3a1c18')
    g.poly([[cx - 26, L.top + 30], [cx, L.top + 14], [cx + 26, L.top + 30]], m.awn[0])
    g.line(cx - 26, L.top + 30, cx, L.top + 14, m.trim)
    g.line(cx + 26, L.top + 30, cx, L.top + 14, m.trim)
    g.circle(cx, L.top + 46, 16, 'rgba(255,213,79,0.22)')
    g.circle(cx, L.top + 46, 10, 'rgba(255,230,140,0.3)')
    // Gold ornament frieze.
    g.rect(0, L.top + 4, L.w, 6, m.awn[0])
    for (let x = 2; x < L.w; x += 6) {
      g.px(x, L.top + 6, m.trim)
      g.px(x + 1, L.top + 7, m.trim)
      g.px(x + 2, L.top + 6, m.trim)
    }
    g.hline(0, L.w, L.top + 4, m.trim)
    g.hline(0, L.w, L.top + 10, mix(m.trim, P.ink, 0.4))
    // Hanging lamp glow.
    for (const x of [L.w * 0.18, L.w * 0.82]) {
      g.vline(x, L.top + 10, L.top + 18, '#3a2838')
      g.ellipse(x, L.top + 20, 4, 3, '#ffd54f')
      g.circle(x, L.top + 24, 12, 'rgba(255,226,122,0.16)')
    }
    rowsFor(g, L, m, 'amulet')
  },
  noodle(g, L, m) {
    interior(g, L, m)
    // White tiles.
    for (let y = L.top + 10; y < L.counterY; y += 6) g.hline(0, L.w, y, m.wallD)
    for (let y = L.top + 10; y < L.counterY; y += 6) for (let x = (y / 6) % 2 ? 0 : 3; x < L.w; x += 6) g.vline(x, y, y + 5, m.wallD)
    stripedAwning(g, L, m)
    // Menu boards with prices.
    for (const [x, c] of [[8, '#e8514a'], [L.w - 38, '#43905a']] as [number, string][]) {
      g.rect(x, L.top + L.awningH + 2, 30, 14, c)
      g.frame(x, L.top + L.awningH + 2, 30, 14, '#ffd54f')
      g.hline(x + 3, x + 16, L.top + L.awningH + 6, '#fffaf0')
      g.hline(x + 3, x + 22, L.top + L.awningH + 10, '#fffaf0')
      g.hline(x + 20, x + 26, L.top + L.awningH + 6, '#ffd54f')
    }
    rowsFor(g, L, m, 'noodle')
  },
  mart(g, L, m) {
    interior(g, L, m)
    // Fluorescent ceiling and the brand light box.
    g.rect(0, L.top, L.w, 18, '#5a8de0')
    g.hline(0, L.w, L.top, '#9fd0ff')
    g.rect(0, L.top + 17, L.w, 3, '#3d63b5')
    const lx = Math.round(L.w / 2 - 14)
    g.rect(lx - 1, L.top + 3, 30, 12, '#3fa06e')
    martLogo(g, lx, L.top + 4)
    for (const [i, c] of ['#f58f35', '#3fa06e', '#e8514a'].entries()) g.rect(0, L.top + 20 + i, L.w, 1, c)
    // Metal shelving uprights.
    for (const x of [1, L.w - 3]) g.rect(x, L.top + 23, 2, L.counterY - L.top - 23, '#a8a8b8')
    g.rect(3, L.top + 26, L.w - 6, L.rowB - L.top - 20, '#f4f6f8')
    // Price strips on shelf fronts are drawn with the rows.
    rowsFor(g, L, m, 'mart')
    for (const y of [L.rowA, L.rowB]) {
      g.rect(2, y + 3, L.w - 4, 2, '#ffd54f')
      for (let x = 10; x < L.w - 6; x += 30) g.rect(x, y + 3, 6, 2, '#e8514a')
    }
    // Fridge glimpse behind the NPC.
    const fx = L.npcX + 6
    g.rect(fx, L.rowB + 6, 56, L.counterY - L.rowB, '#6d6478')
    g.rect(fx + 2, L.rowB + 8, 52, L.counterY - L.rowB, '#e8f8ff')
    for (let y = L.rowB + 16; y < L.counterY; y += 8) g.hline(fx + 2, fx + 53, y, '#a8a8b8')
  },
  souvenir(g, L, m) {
    skyAndPlace(g, L, m, 23)
    // Kiosk walls and a pegboard.
    g.rect(2, L.top + 8, L.w - 4, L.counterY - L.top, m.wall)
    pegboard(g, 4, L.top + L.awningH + 2, L.w - 4, L.rowA + 2, '#e8d0a0')
    g.rect(2, L.top, L.w - 4, 10, m.awn[0])
    for (let x = 4; x < L.w - 4; x += 10) g.rect(x, L.top + 3, 5, 4, m.awn[1])
    g.hline(2, L.w - 3, L.top + 9, mix(m.awn[0], P.ink, 0.35))
    stripedAwning(g, { ...L, top: L.top + 4, awningH: L.awningH - 6 }, m)
    // Flags.
    for (let x = 8; x < L.w; x += 14) {
      g.poly([[x, L.top + L.awningH], [x + 6, L.top + L.awningH], [x + 3, L.top + L.awningH + 5]], ['#e8514a', '#ffd54f', '#6cc36a', '#5a8de0'][(x / 14) % 4 | 0])
    }
    posts(g, L, m.wood, m.woodD)
    rowsFor(g, L, m, 'souvenir')
  },
  snack(g, L, m) {
    skyAndPlace(g, L, m, 37)
    g.rect(4, L.rowA - 4, L.w - 8, L.counterY - L.rowA + 4, 'rgba(255,250,240,0.55)')
    stripedAwning(g, L, m)
    posts(g, L, m.wood, m.woodD)
    // Hanging plastic-bag bundles and a bunch of bananas.
    rowsFor(g, L, m, 'snack')
  },
  costume(g, L, m) {
    interior(g, L, m)
    // Thai pattern wallpaper.
    for (let y = L.top + 12; y < L.counterY; y += 10)
      for (let x = (y / 10) % 2 ? 0 : 5; x < L.w; x += 10) {
        g.px(x, y, m.wallD)
        g.px(x + 1, y + 1, m.wallD)
        g.px(x - 1, y + 1, m.wallD)
        g.px(x, y + 2, m.wallD)
      }
    // Drapes.
    for (const side of [0, 1]) {
      const x0 = side ? L.w - 16 : 0
      for (let x = x0; x < x0 + 16; x++) g.vline(x, L.top, L.counterY, (x - x0) % 4 < 2 ? m.awn[0] : mix(m.awn[0], P.ink, 0.2))
      g.rect(x0, L.top + 40, 16, 3, m.trim)
    }
    g.rect(0, L.top, L.w, 8, m.awn[0])
    scallop(g, 0, L.w, L.top + 8, m.awn[0], m.awn[1], 10, 3)
    // Mirror with bulbs behind the NPC.
    const cx = L.w / 2
    g.ellipse(cx, L.rowB + 30, 26, 32, m.trim)
    g.ellipse(cx, L.rowB + 30, 23, 29, '#d4f1ff')
    g.line(cx - 12, L.rowB + 12, cx - 4, L.rowB + 4, '#ffffff')
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI
      g.circle(cx + Math.cos(a) * 25, L.rowB + 30 + Math.sin(a) * 31, 1.5, '#fff3a6')
    }
    rowsFor(g, L, m, 'costume')
  },
  teahouse(g, L, m) {
    interior(g, L, m)
    // Round moon window with a bamboo view.
    const cx = L.w / 2
    const cy = L.rowB + 28
    g.circle(cx, cy, 30, m.woodD)
    g.circle(cx, cy, 27, '#bfe3c8')
    for (let x = cx - 22; x < cx + 24; x += 7) {
      g.vline(x, cy - 26, cy + 26, '#6cc36a')
      g.px(x + 1, cy - 10, '#43905a')
      g.px(x - 1, cy + 4, '#43905a')
    }
    g.ditherCircle(cx, cy, 27, '#ffffff', 0.25)
    // Tiled eave with gold trim.
    g.rect(0, L.top, L.w, 12, m.awn[0])
    for (let x = 0; x < L.w; x += 6) g.rect(x, L.top + 2, 3, 10, mix(m.awn[0], P.ink, 0.25))
    g.rect(0, L.top + 12, L.w, 3, m.trim)
    g.hline(0, L.w, L.top + 15, mix(m.trim, P.ink, 0.4))
    // Couplet scrolls.
    for (const x of [6, L.w - 12]) {
      g.rect(x, L.top + 22, 6, 34, '#e8514a')
      for (let y = L.top + 25; y < L.top + 54; y += 6) g.rect(x + 2, y, 2, 3, m.trim)
    }
    rowsFor(g, L, m, 'teahouse')
  },
  rooster(g, L, m) {
    skyAndPlace(g, L, m, 51)
    // Red-gold shrine canopy.
    g.rect(0, L.top + 4, L.w, 10, m.wood)
    for (let x = 0; x < L.w; x += 8) g.rect(x + 2, L.top + 6, 4, 6, m.trim)
    scallop(g, 0, L.w, L.top + 14, m.awn[0], m.awn[1], 8, 4)
    g.rect(2, L.top + 18, L.w - 4, L.counterY - L.top - 18, mix(m.wall, '#ffd54f', 0.15))
    // Marigold garlands.
    for (let x = 6; x < L.w; x += 24) {
      for (let k = 0; k < 7; k++) g.circle(x + k * 2, L.top + 20 + Math.sin(k / 2) * 3, 1.4, k % 2 ? '#ffb03a' : '#ffd23f')
    }
    posts(g, L, m.wood, m.woodD)
    rowsFor(g, L, m, 'rooster')
  },
}

// ---------------------------------------------------------------------------
// Counters (front layer)

const FRONT: Record<StallKind, Painter> = {
  icecream(g, L) {
    const y = L.counterY
    g.rect(2, y - 2, L.w - 4, 6, '#dfe3ea')
    g.hline(2, L.w - 3, y - 2, '#ffffff')
    g.rect(4, y + 4, L.w - 8, L.counterH - 10, '#fff4f8')
    for (let x = 4; x < L.w - 4; x++) if (Math.floor(x / 6) % 2) g.vline(x, y + 4, y + 8, '#ff9fc0')
    g.rect(4, y + L.counterH - 8, L.w - 8, 2, '#f0c8d6')
    g.circle(22, y + L.counterH - 2, 7, '#5a5a66')
    g.circle(22, y + L.counterH - 2, 3, '#c9c9d4')
    g.circle(L.w - 22, y + L.counterH - 2, 7, '#5a5a66')
    g.circle(L.w - 22, y + L.counterH - 2, 3, '#c9c9d4')
    // Cartoon cone logo.
    const cx = L.w / 2
    g.poly([[cx - 5, y + 16], [cx + 5, y + 16], [cx, y + 28]], '#e0a060')
    g.circle(cx, y + 14, 5, '#ffd6e0')
    g.circle(cx - 3, y + 12, 3, '#fff1d6')
    g.px(cx + 1, y + 11, '#e8514a')
  },
  amulet(g, L, m) {
    const y = L.counterY - 8
    // Glass display case: wooden frame, red velvet bed, glass shine.
    g.rect(0, y, L.w, L.counterH + 12, m.counterD)
    g.rect(2, y + 2, L.w - 4, 16, '#8e1f2a')
    g.dither(2, y + 2, L.w - 4, 16, null, '#b8343f', 0.3)
    g.rect(2, y + 2, L.w - 4, 16, 'rgba(210,240,255,0.18)')
    for (let x = 6; x < L.w; x += 26) g.line(x, y + 17, x + 10, y + 3, 'rgba(255,255,255,0.45)')
    g.hline(0, L.w, y, m.trim)
    g.rect(0, y + 18, L.w, 3, m.counterL)
    g.rect(0, y + 21, L.w, L.counterH, m.counter)
    for (let x = 8; x < L.w; x += 20) {
      g.rect(x, y + 25, 12, 10, m.counterD)
      g.frame(x, y + 25, 12, 10, m.trim)
    }
  },
  noodle(g, L, m) {
    const y = L.counterY
    // Steel cart with a glass cabinet on the left.
    g.rect(0, y - 1, L.w, 5, m.counterL)
    g.hline(0, L.w, y - 1, '#ffffff')
    g.rect(0, y + 4, L.w, L.counterH, m.counter)
    for (let x = 4; x < L.w; x += 8) g.vline(x, y + 6, y + L.counterH, m.counterD)
    g.rect(8, y + 10, L.w - 16, 14, '#e8514a')
    g.rect(10, y + 12, L.w - 20, 10, '#ffd54f')
    g.hline(14, L.w - 14, y + 17, '#e8514a')
  },
  mart(g, L) {
    const y = L.counterY
    g.rect(0, y - 1, L.w, 5, '#f4f2ee')
    g.hline(0, L.w, y - 1, '#ffffff')
    g.rect(0, y + 4, L.w, L.counterH, '#fffaf0')
    for (const [i, c] of ['#f58f35', '#3fa06e', '#e8514a'].entries()) g.rect(0, y + 12 + i * 2, L.w, 2, c)
    martLogo(g, Math.round(L.w / 2 - 13), y + 20)
    g.rect(0, y + L.counterH, L.w, 4, '#bdb2ae')
  },
  souvenir(g, L, m) {
    const y = L.counterY
    g.rect(0, y - 1, L.w, 5, m.counterL)
    g.hline(0, L.w, y - 1, '#fff1d6')
    g.rect(0, y + 4, L.w, L.counterH, m.counter)
    for (let x = 0; x < L.w; x += 10) g.vline(x, y + 4, y + L.counterH, m.counterD)
    g.rect(10, y + 12, L.w - 20, 12, m.awn[0])
    g.rect(12, y + 14, L.w - 24, 8, '#fffaf0')
    for (let x = 16; x < L.w - 16; x += 8) g.rect(x, y + 16, 4, 4, ['#e8514a', '#ffd54f', '#6cc36a', '#5a8de0'][(x / 8) % 4 | 0])
  },
  snack(g, L, m) {
    const y = L.counterY
    g.rect(0, y - 1, L.w, 5, m.counterL)
    g.hline(0, L.w, y - 1, '#f3dcb2')
    g.rect(0, y + 4, L.w, L.counterH, m.counter)
    for (let x = 0; x < L.w; x += 7) g.vline(x, y + 4, y + L.counterH, m.counterD)
    g.rect(0, y + 4, L.w, 2, m.counterD)
    g.circle(18, y + L.counterH, 8, '#4a3128')
    g.circle(18, y + L.counterH, 3, '#9a6a45')
    g.circle(L.w - 18, y + L.counterH, 8, '#4a3128')
    g.circle(L.w - 18, y + L.counterH, 3, '#9a6a45')
  },
  costume(g, L, m) {
    const y = L.counterY
    g.rect(0, y - 1, L.w, 5, m.trim)
    g.hline(0, L.w, y - 1, '#fff3a6')
    g.rect(0, y + 4, L.w, L.counterH, m.counter)
    for (let x = 0; x < L.w; x += 12) {
      g.poly([[x, y + 4], [x + 12, y + 4], [x + 6, y + 12]], m.awn[0])
      g.px(x + 6, y + 10, m.trim)
    }
    g.rect(0, y + 20, L.w, 2, m.trim)
  },
  teahouse(g, L, m) {
    const y = L.counterY
    g.rect(0, y - 1, L.w, 5, m.counterL)
    g.hline(0, L.w, y - 1, mix(m.counterL, '#ffffff', 0.3))
    g.rect(0, y + 4, L.w, L.counterH, m.counter)
    for (let x = 6; x < L.w - 6; x += 24) {
      g.rect(x, y + 10, 18, 16, m.counterD)
      g.frame(x, y + 10, 18, 16, m.trim)
      g.circle(x + 9, y + 18, 4, m.trim)
      g.circle(x + 9, y + 18, 2.5, m.counterD)
    }
  },
  rooster(g, L, m) {
    const y = L.counterY
    g.rect(0, y - 1, L.w, 5, '#ffd54f')
    g.hline(0, L.w, y - 1, '#fff3a6')
    g.rect(0, y + 4, L.w, L.counterH, m.counter)
    g.rect(0, y + 4, L.w, 3, m.counterD)
    // Lucky cloth with a gold fringe.
    for (let x = 0; x < L.w; x += 3) g.vline(x, y + L.counterH - 6, y + L.counterH - 2, '#ffd54f')
    for (let x = 12; x < L.w - 10; x += 22) {
      g.circle(x, y + 18, 5, '#ffd54f')
      g.circle(x, y + 18, 3.5, m.counterD)
      g.px(x, y + 18, '#ffd54f')
    }
  },
}

/** Baked back layer (everything behind the NPC). */
export function bakeStallBack(kind: StallKind, L: StallLayout): HTMLCanvasElement {
  return bake(L.w, L.h, (g) => {
    BACK[kind](g, L, MOOD[kind])
    backProps(g, kind, L)
    signBoard(g, L, kind)
  })
}

/** Baked front layer (the counter, drawn over the NPC). */
export function bakeStallFront(kind: StallKind, L: StallLayout): HTMLCanvasElement {
  return bake(L.w, L.h, (g) => {
    g.rect(0, L.counterY + L.counterH, L.w, L.h, MOOD[kind].floor)
    g.dither(0, L.counterY + L.counterH, L.w, 6, null, 'rgba(58,40,56,0.3)', 0.5)
    FRONT[kind](g, L, MOOD[kind])
    frontProps(g, kind, L)
  })
}

// ---------------------------------------------------------------------------
// Fixed props (not for sale): steaming pot, grill, till, lanterns, statues…

function backProps(g: Surface, kind: StallKind, L: StallLayout) {
  if (kind === 'teahouse') {
    for (const x of [L.w * 0.22, L.w * 0.78]) drawLantern(g, x, L.top + 18, 0)
  }
}

function frontProps(g: Surface, kind: StallKind, L: StallLayout) {
  const y = L.counterY
  if (kind === 'noodle') {
    // Big soup pot at the left end and a condiment caddy on the right.
    g.rect(1, y - 16, 22, 17, '#c9c9d4')
    g.rect(1, y - 16, 22, 2, '#f2f2f6')
    g.vline(21, y - 14, y, '#9898a8')
    g.ellipse(12, y - 16, 11, 3, '#9898a8')
    g.ellipse(12, y - 16, 9, 2, '#f3dd9a')
  }
  if (kind === 'mart') {
    // Till and a bun steamer.
    g.rect(L.w - 26, y - 14, 22, 14, '#5a5a66')
    g.rect(L.w - 24, y - 12, 18, 6, '#9fe0b0')
    g.hline(L.w - 22, L.w - 10, y - 9, '#3f9a4a')
    g.rect(L.w - 30, y - 4, 30, 4, '#80808e')
  }
}

export function drawLantern(g: Surface, x: number, y: number, swing: number) {
  const sx = x + swing
  g.line(x, y - 8, sx, y - 2, '#3a2838')
  g.ellipse(sx, y + 4, 6, 6, '#e8514a')
  g.ellipse(sx - 2, y + 2, 2, 3, '#ff8a7a')
  g.rect(sx - 4, y - 2, 8, 2, '#ffd54f')
  g.rect(sx - 4, y + 9, 8, 2, '#ffd54f')
  for (let i = 0; i < 3; i++) g.vline(sx - 1 + i, y + 11, y + 15, '#ffd54f')
  g.vline(sx, y + 2, y + 7, '#ffd54f')
}

/** Small offering rooster statue for shelf fillers. */
function miniRooster(g: Surface, x: number, y: number, body: Color) {
  g.ellipse(x, y - 1, 7, 1.6, '#e0bb8a')
  g.poly([[x + 1, y - 7], [x + 6, y - 16], [x + 7, y - 9]], '#2f77a8')
  g.poly([[x + 2, y - 8], [x + 4, y - 15], [x + 5, y - 9]], '#43905a')
  g.ellipse(x, y - 6, 5, 3.5, body)
  g.ellipse(x + 1, y - 6, 2.5, 2, mix(body, P.ink, 0.2))
  g.thickLine(x - 3, y - 7, x - 4, y - 11, 2.4, body)
  g.circle(x - 4, y - 12, 2, body)
  g.rect(x - 5, y - 15, 2, 2, '#e8514a')
  g.px(x - 4, y - 12, P.ink)
  g.px(x - 7, y - 12, '#ffd54f')
  g.vline(x - 1, y - 3, y - 1, '#ffd54f')
  g.vline(x + 1, y - 3, y - 1, '#ffd54f')
}

// ---------------------------------------------------------------------------
// Animated extras, drawn every frame on top of the baked layers.

export function drawStallFx(g: Surface, kind: StallKind, L: StallLayout, t: number, front: boolean) {
  const y = L.counterY
  if (!front) {
    if (kind === 'teahouse') for (const [i, x] of [L.w * 0.22, L.w * 0.78].entries()) drawLantern(g, x, L.top + 18, Math.round(Math.sin(t * 1.6 + i) * 1.4))
    if (kind === 'amulet') {
      // Incense smoke curling up by the shrine niche.
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.35 + i / 6) % 1
        g.px(L.w / 2 + 14 + Math.sin(k * 8 + i) * 2, L.top + 64 - k * 30, `rgba(255,250,240,${(1 - k) * 0.5})`)
      }
    }
    if (kind === 'mart' && Math.sin(t * 13) > 0.97) g.rect(0, L.top, L.w, 17, 'rgba(255,255,255,0.12)')
    return
  }
  if (kind === 'noodle') steam(g, 12, y - 18, t, 14)
  if (kind === 'teahouse') steam(g, L.w - 18, y - 12, t, 8)
  if (kind === 'snack') {
    // Charcoal grill smoke at the left end.
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.45 + i / 5) % 1
      g.ellipse(14 + Math.sin(k * 6 + i) * 3, y - 12 - k * 34, 2 + k * 4, 1.5 + k * 3, `rgba(220,215,210,${(1 - k) * 0.45})`)
    }
  }
  if (kind === 'icecream') {
    // Cold mist over the tubs.
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.3 + i / 4) % 1
      g.px(L.w * (0.25 + i * 0.17) + Math.sin(t + i) * 2, y - 2 - k * 6, `rgba(255,255,255,${(1 - k) * 0.7})`)
    }
  }
}

function steam(g: Surface, x: number, y: number, t: number, n: number) {
  for (let i = 0; i < n; i++) {
    const k = (t * 0.5 + i / n) % 1
    const sx = x + Math.sin(k * 7 + i * 1.7) * (2 + k * 4)
    g.ellipse(sx, y - k * 26, 1.2 + k * 2.4, 1 + k * 2, `rgba(255,255,255,${(1 - k) * 0.55})`)
  }
}

// ---------------------------------------------------------------------------
// Containers the goods sit in (drawn under each product).

export function drawContainer(g: Surface, kind: StallKind, s: StallSlot, i: number) {
  const st = KIND_STYLE[kind]
  if (s.role === 'counter') {
    const x = s.x
    const y = s.y
    if (st.counter === 'tubs') {
      g.ellipse(x, y - 1, 12, 3.5, '#9898a8')
      g.ellipse(x, y - 1.5, 10.5, 2.6, ['#fff1d6', '#ffd6e0', '#c8f0cf', '#8a5a32'][i % 4])
    } else if (st.counter === 'bowls') {
      g.ellipse(x, y - 1, 12, 3, '#9898a8')
      g.ellipse(x, y - 1.5, 11, 2.2, '#dfe3ea')
    } else if (st.counter === 'steamers') {
      g.ellipse(x, y - 1, 12, 3.5, '#b8844a')
      g.ellipse(x, y - 1.5, 10.5, 2.5, '#e0bb8a')
    } else if (st.counter === 'plates') {
      g.ellipse(x, y - 1, 12, 3, mix(MOOD[kind].trim, P.ink, 0.2))
      g.ellipse(x, y - 1.5, 10.5, 2.2, '#fffaf0')
    } else {
      g.rect(x - 12, y - 3, 24, 4, '#e8dcc0')
      g.rect(x - 11, y - 3, 22, 2, '#fffaf0')
      g.hline(x - 12, x + 11, y + 1, '#b8a88c')
    }
  } else if (s.role === 'case') {
    g.ellipse(s.x, s.y - 2, 11, 2.5, 'rgba(58,20,20,0.35)')
  } else if (s.role === 'shelf') {
    g.ellipse(s.x, s.y, 10, 1.5, 'rgba(58,40,56,0.22)')
  }
}

/** Decorative fillers for empty slots so shelves never look bare. */
export function drawFiller(g: Surface, kind: StallKind, s: StallSlot, i: number) {
  const r = new Rng(`fill:${kind}:${s.row}:${i}`)
  const x = s.x
  const y = s.y
  if (s.role === 'hook' || s.role === 'rack') {
    if (kind === 'costume' || s.role === 'rack') {
      // Hanger with a folded sash.
      const c = r.pick(['#e8709e', '#ffd54f', '#5a8de0', '#43905a', '#e8514a'])
      g.line(x - 5, y + 5, x, y + 2, '#a8a8b8')
      g.line(x + 5, y + 5, x, y + 2, '#a8a8b8')
      g.rect(x - 5, y + 5, 10, 16, c)
      g.rect(x - 5, y + 5, 2, 16, mix(c, '#ffffff', 0.3))
      g.hline(x - 5, x + 4, y + 12, mix(c, '#ffd54f', 0.6))
      return
    }
    // A string of mini garlands / keyrings.
    const cols = ['#ffd23f', '#f58f35', '#ff9fc0', '#fffaf0']
    g.vline(x, y + 3, y + 8, '#a8a8b8')
    for (let k = 0; k < 5; k++) g.circle(x, y + 9 + k * 2.4, 1.6, cols[(k + i) % cols.length])
    g.px(x, y + 21, '#e8514a')
    return
  }
  if (s.role === 'counter' || s.role === 'case') {
    if (kind === 'amulet' || s.role === 'case') {
      g.ellipse(x, y - 6, 3, 4, '#c28e5c')
      g.ellipse(x, y - 6, 2, 3, '#e9c46a')
      g.ellipse(x + 7, y - 5, 2.5, 3, '#9a9aa8')
      g.ellipse(x - 7, y - 5, 2.5, 3, '#e9c46a')
      return
    }
    // Stack of bowls / cups.
    for (let k = 0; k < 3; k++) {
      g.ellipse(x, y - 2 - k * 3, 7, 2, k % 2 ? '#fffaf0' : '#f0e6d6')
      g.hline(x - 6, x + 6, y - 2 - k * 3, '#5a8de0')
    }
    return
  }
  // Shelf filler depends on the stall.
  switch (kind) {
    case 'mart':
      for (let k = 0; k < 4; k++) {
        const c = r.pick(['#e8514a', '#5a8de0', '#ffd54f', '#3fa06e', '#f58f35'])
        g.rect(x - 9 + k * 5, y - 10, 4, 10, c)
        g.rect(x - 9 + k * 5, y - 10, 4, 2, '#fffaf0')
      }
      break
    case 'noodle':
    case 'teahouse':
      g.rect(x - 7, y - 12, 14, 12, 'rgba(210,240,255,0.7)')
      g.rect(x - 6, y - 8, 12, 8, r.pick(['#ffd54f', '#e8514a', '#8a5a32', '#6cc36a']))
      g.rect(x - 7, y - 14, 14, 2, '#e8514a')
      break
    case 'amulet':
      g.rect(x - 6, y - 14, 12, 14, '#4a2a20')
      g.poly([[x - 6, y - 14], [x, y - 18], [x + 6, y - 14]], '#8e2a2a')
      g.circle(x, y - 7, 3, '#ffd54f')
      g.ditherCircle(x, y - 7, 5, '#ffe27a', 0.4)
      break
    case 'rooster':
      if (i % 2) miniRooster(g, x, y, r.pick(['#e8514a', '#ffd54f', '#fffaf0']))
      else
        for (let k = 0; k < 3; k++) {
          g.rect(x - 8 + k * 6, y - 10, 3, 10, '#e8514a')
          g.rect(x - 8 + k * 6, y - 12, 3, 2, '#fffaf0')
          g.px(x - 7 + k * 6, y - 14, '#ff9fc0')
        }
      break
    default: {
      // Potted plant or a jar of sweets.
      if (r.chance(0.5)) {
        g.rect(x - 4, y - 6, 8, 6, '#c86a3a')
        g.hline(x - 4, x + 3, y - 6, '#e88a5a')
        g.ellipse(x, y - 10, 6, 4, '#5ea653')
        g.ellipse(x - 2, y - 11, 3, 2, '#86c95f')
      } else {
        g.rect(x - 6, y - 12, 12, 12, 'rgba(210,240,255,0.75)')
        for (let k = 0; k < 6; k++) g.circle(x - 3 + (k % 3) * 3, y - 3 - Math.floor(k / 3) * 3, 1.3, r.pick(['#ff9fc0', '#ffd54f', '#86c95f', '#e8514a']))
        g.rect(x - 7, y - 14, 14, 2, '#e8514a')
      }
    }
  }
}
