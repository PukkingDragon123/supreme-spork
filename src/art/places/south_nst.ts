// Wat Phra Mahathat Woramahawihan, Nakhon Si Thammarat: the great white
// Sri Lankan-style bell chedi with its gold-plated spire, elephant-ringed base
// and saffron cloth, the little chedis (เจดีย์ราย), the cloister of Buddha
// images (วิหารคด), the Wihan Luang, a nang talung stage and the amulet market.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, WHITE, ROOF, slice, tier, roofBand, bargeBoard, hangHong, chofa, gable, column, crown, lacquerPanel, valance, nagaRail, type Ramp, type RoofRamp, type Pt } from '../temple'
import { buildProp, hash, GOLD_R, WHITE_R, BRONZE_R, type Building } from './south'

const CHEDI_WHITE: Ramp = { L: '#ffffff', b: '#f7f4ee', d: '#e2dcd2', D: '#c4bab0' }
const STAINED: Ramp = { L: '#f4f0ea', b: '#e0dad0', d: '#c8beb2', D: '#a89c92' }
const SAFFRON = { L: '#ffd070', b: '#f5a623', d: '#d8801a', D: '#a85a14' }

/** A shaded ring of a round masonry body (wider slice with mouldings). */
function ring(g: Surface, cx: number, y: number, half: number, r: Ramp, lit = 0.3) {
  slice(g, cx, y, half, r, lit)
}

/** Elephant fore-body (ช้างล้อม) emerging from the base, facing the viewer. */
function elephant(g: Surface, x: number, y: number) {
  const E: Ramp = { L: '#ffffff', b: '#f0ece6', d: '#d8d0c8', D: '#b0a8a0' }
  // Head.
  g.rect(x - 4, y - 9, 9, 7, E.b)
  g.hline(x - 4, x + 4, y - 9, E.L)
  // Ears.
  g.rect(x - 6, y - 8, 2, 5, E.d)
  g.rect(x + 5, y - 8, 2, 5, E.D)
  // Eyes.
  g.px(x - 2, y - 6, P.ink2)
  g.px(x + 2, y - 6, P.ink2)
  // Trunk curling down, tusks.
  g.rect(x, y - 3, 2, 3, E.b)
  g.px(x + 1, y - 3, E.d)
  g.px(x - 1, y - 1, '#fffdf0')
  g.px(x + 2, y - 1, '#fffdf0')
  // Forelegs.
  g.rect(x - 4, y - 2, 2, 3, E.d)
  g.rect(x + 3, y - 2, 2, 3, E.D)
  // Gold headdress.
  g.hline(x - 3, x + 3, y - 10, GOLD.b)
  g.px(x, y - 11, GOLD.l)
}

/** The Phra Borommathat chedi (anchor: foot of the base, centre). */
export function mahathatChedi(): Building {
  const W = 160
  const H = 340
  return buildProp('nst:chedi2', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    let y = H - 1
    // --- square base (ฐานทักษิณ) with the ring of elephants ---
    const bH = 26
    y -= bH
    tier(g, cx, y, bH, 76, STAINED, P.redD)
    g.hline(cx - 75, cx + 74, y + 2, GOLD.d)
    g.hline(cx - 75, cx + 74, y + bH - 4, WHITE.D)
    for (let x = cx - 68; x <= cx + 68; x += 12) {
      // Shadowed niche so each elephant stands out from the base.
      g.rect(x - 6, y + bH - 15, 13, 13, '#b8aca0')
      g.rect(x - 5, y + bH - 16, 11, 1, '#a09488')
      elephant(g, x, y + bH - 3)
    }
    // Rain streaks / lichen on the old masonry.
    for (let i = 0; i < 40; i++) {
      const v = hash(i, 7, 3)
      const x = cx - 74 + (v % 148)
      g.vline(x, y + 3, y + 6 + (v % 5), '#cfc4b8')
    }
    // --- upper square terraces ---
    for (const [h, half] of [
      [13, 64],
      [7, 56],
    ] as const) {
      y -= h
      tier(g, cx, y, h, half, CHEDI_WHITE, GOLD.d)
      if (h > 10) {
        // Arched niches with little golden Buddha images.
        for (let x = cx - half + 8; x < cx + half - 6; x += 12) {
          g.rect(x - 3, y + 3, 7, 8, '#6a3a3e')
          g.px(x - 2, y + 2, '#6a3a3e')
          g.px(x, y + 1, GOLD.d)
          g.rect(x - 1, y + 2, 3, 1, '#6a3a3e')
          g.rect(x - 2, y + 8, 5, 2, GOLD.b)
          g.rect(x - 1, y + 5, 3, 3, GOLD.b)
          g.px(x, y + 4, GOLD.l)
          g.px(x - 1, y + 5, GOLD.L)
          g.hline(x - 3, x + 3, y + 11, GOLD.d)
        }
      } else for (let x = cx - half + 4; x < cx + half - 3; x += 6) g.px(x, y + Math.round(h / 2), GOLD.b)
    }
    // --- mouldings (มาลัยเถา) ---
    for (const half of [50, 47, 44]) {
      y -= 1
      ring(g, cx, y, half, CHEDI_WHITE)
      g.hline(Math.round(cx - half) + 2, Math.round(cx + half) - 3, y, '#ffffff')
      y -= 2
      ring(g, cx, y, half - 1, { ...CHEDI_WHITE, b: CHEDI_WHITE.d, L: CHEDI_WHITE.b })
      ring(g, cx, y + 1, half - 1, CHEDI_WHITE)
    }
    // Lotus band.
    y -= 1
    ring(g, cx, y, 42, GOLD_R)
    for (let x = cx - 41; x < cx + 41; x += 3) g.px(x, y, GOLD.D)
    // --- the bell (องค์ระฆัง), broad and low like the Sri Lankan stupas ---
    const bellH = 78
    const bellW = 46
    const base = y
    for (let i = 1; i <= bellH; i++) {
      const t = i / bellH
      const half = bellW * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.5)
      ring(g, cx, base - i, half, CHEDI_WHITE, 0.3)
    }
    // Soft highlight curve and age stains.
    for (let i = 6; i < bellH - 8; i++) {
      const t = i / bellH
      const half = bellW * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.5)
      g.px(Math.round(cx - half * 0.55), base - i, '#ffffff')
      g.px(Math.round(cx - half * 0.55) + 1, base - i, '#ffffff')
      if (i % 3 === 0) g.px(Math.round(cx + half * 0.7), base - i, CHEDI_WHITE.D)
    }
    for (let i = 0; i < 26; i++) {
      const v = hash(i, 11, 5)
      const yy = base - 4 - (v % 40)
      const t = (base - yy) / bellH
      const half = bellW * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.5)
      const x = Math.round(cx - half + 3 + ((v >> 4) % Math.max(1, Math.round(half * 2 - 6))))
      g.vline(x, yy, yy + 2 + (v % 3), '#e6ded2')
    }
    // Saffron cloth (ผ้าพระบฏ) wrapped round the bell, with folds and tails.
    const clothY = base - 22
    for (let k = 0; k < 7; k++) {
      const yy = clothY + k
      const t = (base - yy) / bellH
      const half = bellW * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.5) + 0.5
      const x0 = Math.round(cx - half)
      const x1 = Math.round(cx + half)
      for (let x = x0; x <= x1; x++) {
        const sag = Math.round(Math.sin(((x - x0) / Math.max(1, x1 - x0)) * Math.PI * 5) * 1.2)
        const c = k === 0 ? SAFFRON.L : k > 5 ? SAFFRON.D : (x - x0) / (x1 - x0) > 0.75 ? SAFFRON.d : SAFFRON.b
        g.px(x, yy + sag, c)
      }
    }
    for (const sd of [-1, 1]) {
      const tx = cx + sd * 30
      for (let j = 0; j < 16; j++) g.px(tx + sd * Math.round(j * 0.25), clothY + 6 + j, j % 3 ? SAFFRON.b : SAFFRON.d)
      g.px(tx + sd * 4, clothY + 22, SAFFRON.D)
    }
    // Gold garland swags on the upper bell.
    for (let x = -30; x <= 30; x++) {
      const sw = Math.round(Math.abs(Math.sin((x / 30) * Math.PI * 1.5)) * 3)
      g.px(cx + x, base - 40 + sw, GOLD.d)
    }
    y = base - bellH
    // --- harmika (บัลลังก์) ---
    const hw = 14
    for (let i = 0; i < 10; i++) {
      const band = i === 0 || i === 9 || i === 5
      slice(g, cx, y - i, hw + (i === 9 ? 2 : 0), band ? GOLD_R : CHEDI_WHITE, 0.3)
    }
    g.rect(cx - 8, y - 7, 16, 3, GOLD.d)
    for (let x = cx - 7; x < cx + 8; x += 3) g.px(x, y - 6, GOLD.L)
    y -= 11
    // --- gold-plated spire: rings (ปล้องไฉน) then the long pli (ปลียอด) ---
    const nr = 20
    for (let i = 0; i < nr; i++) {
      const half = 13 - (i * 9) / nr
      ring(g, cx, y, half, GOLD_R, 0.35)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      ring(g, cx, y - 1, half, GOLD_R, 0.35)
      ring(g, cx, y - 2, half - 0.4, GOLD_R, 0.35)
      if (i % 4 === 1) glints.push({ x: Math.round(cx - half * 0.5), y: y - 1 })
      y -= 3
    }
    // Lotus bud collar.
    for (let i = 0; i < 6; i++) ring(g, cx, y - i, 3.8 - Math.abs(i - 2.5) * 0.5, GOLD_R, 0.4)
    y -= 6
    const pli = 112
    for (let i = 0; i < pli; i++) {
      const half = 3.6 * Math.pow(1 - i / pli, 0.9) + 0.35
      ring(g, cx, y - i, half, GOLD_R, 0.5)
      if (i % 18 === 9) g.hline(Math.round(cx - half), Math.round(cx + half), y - i, GOLD.D)
    }
    y -= pli
    // Crystal orb and umbrella tip.
    g.px(cx - 1, y, GOLD.l)
    g.px(cx, y, '#ffffff')
    g.px(cx - 1, y - 1, '#ffffff')
    g.rect(cx - 2, y - 3, 4, 1, GOLD.b)
    g.px(cx - 1, y - 4, GOLD.L)
    glints.push({ x: cx, y: y - 1 }, { x: cx - 1, y: y + 30 }, { x: cx, y: y + 60 })
    hooks.glints = glints
    hooks.top = [{ x: cx, y: y - 4 }]
    hooks.bell = [{ x: cx, y: base - 30 }]
  })
}

/** Small attendant chedi (เจดีย์ราย): white, some weathered, gold tips. */
export function miniChedi(v = 0): Building {
  const H = 38 + (v % 3) * 4
  return buildProp(`nst:mini:${v}`, 20, H, 10, H - 1, (g) => {
    const R = v % 4 === 3 ? STAINED : CHEDI_WHITE
    let y = H - 1
    y -= 5
    tier(g, 10, y, 5, 9, R, v % 2 ? P.redD : undefined)
    y -= 3
    tier(g, 10, y, 3, 7, R)
    for (const half of [6, 5.5]) {
      y -= 1
      slice(g, 10, y, half, R)
    }
    const bh = 9 + (v % 3)
    const base = y
    for (let i = 1; i <= bh; i++) slice(g, 10, base - i, 5.5 * Math.sqrt(Math.max(0, 1 - Math.pow(i / bh, 2.4))), R, 0.32)
    g.px(8, base - 4, '#ffffff')
    y = base - bh
    slice(g, 10, y, 2.5, R)
    slice(g, 10, y - 1, 2.8, v % 2 ? GOLD_R : R)
    y -= 2
    const gold = v % 3 !== 1
    for (let i = 0; i < H - (H - y) - 2 && y - i > 1; i++) {
      const half = Math.max(0.5, 2.2 - i * 0.14)
      slice(g, 10, y - i, half, gold ? GOLD_R : R, 0.45)
    }
    g.px(10, 1, gold ? GOLD.L : '#ffffff')
    if (R === STAINED) {
      g.px(7, H - 8, '#8ab860')
      g.px(12, H - 4, '#8ab860')
      g.px(9, base - 2, '#a8c890')
    }
  })
}

/** One bay of the cloister (วิหารคด): roof, white posts and golden Buddhas inside. */
export function cloisterBay(len: number, buddhas: number, key = ''): Building {
  const W = len
  const H = 50
  return buildProp(`nst:bay2:${len}:${buddhas}:${key}`, W, H, W / 2, H - 1, (g, hooks) => {
    const floor = H - 5
    const top = 14
    // Shaded interior wall with a faded mural band.
    g.rect(0, top, W, floor - top, '#5a2a34')
    g.rect(0, top, W, 3, '#3a1a26')
    for (let x = 1; x < W; x += 5) g.px(x, top + 4, (x >> 2) % 2 ? '#c8a060' : '#8a6a50')
    const glints: Pt[] = []
    const step = W / buddhas
    for (let i = 0; i < buddhas; i++) {
      const x = Math.round(step * (i + 0.5))
      const b = floor - 4
      // White pedestal.
      g.rect(x - 5, b, 11, 4, WHITE.b)
      g.hline(x - 5, x + 5, b, '#ffffff')
      g.hline(x - 5, x + 5, b + 3, WHITE.D)
      g.px(x, b + 2, P.redD)
      // Flame-edged halo.
      g.circle(x + 0.5, b - 15, 5, '#8e3040')
      g.circle(x + 0.5, b - 15, 4, '#b0404c')
      g.px(x, b - 21, GOLD.d)
      // Crossed legs, torso with robe, head with curls and flame.
      for (let yy = b - 4; yy < b; yy++) slice(g, x + 0.5, yy, 5, GOLD_R, 0.35)
      g.hline(x - 4, x + 4, b - 1, GOLD.D)
      for (let yy = b - 11; yy < b - 4; yy++) slice(g, x + 0.5, yy, 2.2 + (yy - (b - 11)) * 0.35, GOLD_R, 0.35)
      g.line(x - 1, b - 10, x + 3, b - 5, GOLD.D)
      g.rect(x - 1, b - 15, 4, 4, GOLD.b)
      g.px(x - 1, b - 15, GOLD.L)
      g.px(x + 2, b - 12, GOLD.d)
      g.px(x, b - 13, GOLD.D)
      g.px(x + 1, b - 13, GOLD.D)
      g.rect(x, b - 16, 2, 1, GOLD.d)
      g.px(x, b - 17, GOLD.l)
      g.px(x, b - 18, GOLD.L)
      // Some images wear a saffron sash.
      if ((i + len) % 3 === 0) {
        g.line(x - 2, b - 10, x + 2, b - 5, SAFFRON.b)
        g.px(x + 3, b - 6, SAFFRON.d)
      }
      glints.push({ x, y: b - 18 })
    }
    // Posts.
    for (const x of [0, W - 4]) {
      g.rect(x, top, 4, floor - top, WHITE.b)
      g.rect(x + 3, top, 1, floor - top, WHITE.D)
      g.rect(x - 1, top, 6, 2, GOLD.b)
    }
    // Floor edge.
    g.rect(0, floor, W, 4, CHEDI_WHITE.b)
    g.hline(0, W - 1, floor, '#ffffff')
    g.hline(0, W - 1, floor + 3, CHEDI_WHITE.D)
    // Roof (tiles).
    const roof: RoofRamp = ROOF.red
    for (let y = 3; y <= top; y++) {
      const t = (y - 3) / (top - 3)
      const a = Math.round(-2 + (1 - t) * 3)
      const bb = Math.round(W + 1 - (1 - t) * 3)
      const edge = top - y
      let c = roof.field
      if (edge < 2) c = edge === 0 ? roof.borderD : roof.border
      else if ((y - 3) % 3 === 2) c = roof.fieldD
      g.rect(a, y, bb - a, 1, c)
      if (edge >= 2 && (y - 3) % 3 === 1) for (let x = a + ((y >> 1) % 4); x < bb; x += 4) g.px(x, y, roof.fieldL)
    }
    g.hline(1, W - 2, 2, GOLD.b)
    g.hline(1, W - 2, 1, GOLD.d)
    valance(g, 4, W - 5, top + 1)
    hooks.glints = glints
  })
}

/** Outer face of the cloister: a white wall with little windows under a tiled roof. */
export function galleryWall(len: number): Building {
  const W = len
  const H = 38
  return buildProp(`nst:gwall:${len}`, W, H, 0, H - 1, (g) => {
    const roof: RoofRamp = ROOF.red
    for (let y = 3; y <= 15; y++) {
      const edge = 15 - y
      let c = roof.field
      if (edge < 2) c = edge === 0 ? roof.borderD : roof.border
      else if ((y - 3) % 3 === 2) c = roof.fieldD
      g.rect(0, y, W, 1, c)
      if (edge >= 2 && (y - 3) % 3 === 1) for (let x = (y >> 1) % 4; x < W; x += 4) g.px(x, y, roof.fieldL)
    }
    g.hline(0, W - 1, 2, GOLD.b)
    g.hline(0, W - 1, 1, GOLD.d)
    g.rect(0, 16, W, 18, WHITE.b)
    g.hline(0, W - 1, 16, WHITE.DD)
    g.hline(0, W - 1, 17, WHITE.D)
    for (let x = 6; x < W - 4; x += 12) {
      g.rect(x, 21, 4, 8, '#5a3d4f')
      g.px(x + 1, 20, '#5a3d4f')
      g.px(x + 2, 20, '#5a3d4f')
      g.rect(x - 1, 29, 6, 1, GOLD.d)
      g.px(x + 1, 23, GOLD.d)
    }
    g.rect(0, 33, W, 4, WHITE.d)
    g.hline(0, W - 1, 33, '#ffffff')
    g.hline(0, W - 1, 36, WHITE.DD)
  })
}

// ---------------------------------------------------------------------------
// Big viharn (Wihan Luang style), a wider hall than the home ubosot.

export interface ViharnOpts {
  key: string
  w: number
  roof?: RoofRamp
  roof2?: RoofRamp
  field?: Color
  fieldD?: Color
  night?: boolean
  /** Open front showing statues (Luang Pho Chaem hall). */
  open?: (g: Surface, x0: number, x1: number, top: number, floor: number) => void
  doors?: number
}

/** A grand viharn with a stacked roof, porch gable and colonnade. Anchor: stair foot. */
export function viharnSprite(o: ViharnOpts): Building {
  const W = o.w
  const cx = Math.round(W / 2)
  const roof = o.roof ?? ROOF.red
  const roof2 = o.roof2 ?? ROOF.orange
  const field = o.field ?? '#b8343f'
  const fieldD = o.fieldD ?? '#7e2436'
  const HW2 = Math.round(W * 0.3)
  const HW1 = Math.round(W * 0.25)
  const A2 = 18
  const B2 = A2 + Math.round(HW2 * 1.05)
  const A1 = B2 - 18
  const B1 = A1 + Math.round(HW1 * 0.95)
  const colTop = B1 + 4
  const floor = colTop + 36
  const H = floor + 26
  return buildProp(`viharn:${o.key}:${o.night ? 1 : 0}`, W, H, cx, H - 2, (g, hooks) => {
    const glints: Pt[] = []
    const bells: Pt[] = []
    const ground = H - 2
    // Roof mass backing.
    g.poly(
      [
        [cx, A2 - 6],
        [cx + HW2 + 30, B2 + 30],
        [cx - HW2 - 30, B2 + 30],
      ],
      mixHex(fieldD, '#3a2838', 0.2),
    )
    roofBand(g, cx, A2, cx - HW2, B2, 12, roof2)
    roofBand(g, cx, A2, cx + HW2, B2, 12, roof2)
    g.vline(cx, A2 - 12, A2, GOLD.D)
    chofa(g, cx, A2 - 12, 8, 1)
    glints.push({ x: cx + 1, y: A2 - 20 })
    // Three wing tiers on each side.
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const ax = cx + s * (HW2 - 8 + k * 8)
        const ay = B2 - 16 + k * 14
        const bx = cx + s * (HW2 + 12 + k * 12)
        const by = B2 + 2 + k * 14
        roofBand(g, ax, ay, bx, by, 9, k === 0 ? roof2 : roof)
        bargeBoard(g, ax, ay, bx, by, 3)
        hangHong(g, bx + s, by + 1, s)
        glints.push({ x: bx + s * 3, y: by - 3 })
        bells.push({ x: bx + s, y: by + 4 })
      }
    }
    glints.push(...gable(g, cx, A2, HW2, B2, { field: '#3d63b5', fieldD: '#26306e', sparkA: '#8fb6ff', sparkB: '#ffd6e0', motif: 'emblem' }))
    roofBand(g, cx, A1, cx - HW1, B1, 9, roof)
    roofBand(g, cx, A1, cx + HW1, B1, 9, roof)
    glints.push(...gable(g, cx, A1, HW1, B1, { field, fieldD, sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'narai' }))
    bells.push({ x: cx - HW1 - 2, y: B1 + 4 }, { x: cx + HW1 + 2, y: B1 + 4 })
    // Walls in the colonnade shade.
    const wallL = cx - HW2 - 34
    const wallR = cx + HW2 + 34
    g.rect(wallL, B1 + 1, wallR - wallL, floor - B1 - 1, WHITE.d)
    g.rect(wallL, B1 + 1, wallR - wallL, 3, WHITE.DD)
    g.rect(wallL, B1 + 4, wallR - wallL, 2, WHITE.D)
    g.rect(cx - HW1 - 4, B1, (HW1 + 4) * 2 + 1, 1, GOLD.l)
    g.rect(cx - HW1 - 4, B1 + 1, (HW1 + 4) * 2 + 1, 2, P.redD)
    g.rect(cx - HW1 - 4, B1 + 3, (HW1 + 4) * 2 + 1, 1, GOLD.D)
    if (o.open) {
      o.open(g, cx - HW1 + 4, cx + HW1 - 4, B1 + 6, floor)
    } else {
      // Doors with crowns.
      const n = o.doors ?? 3
      for (let i = 0; i < n; i++) {
        const dx = cx + (i - (n - 1) / 2) * 22
        const dw = i === (n - 1) / 2 ? 12 : 10
        const dh = i === (n - 1) / 2 ? 24 : 20
        crown(g, dx, floor - dh - 1, dw + 6, 12)
        lacquerPanel(g, Math.round(dx - dw / 2), floor - dh, dw, dh, !!o.night, 2)
      }
    }
    const windows: Pt[] = []
    for (let wx = wallL + 10; wx < cx - HW1 - 6; wx += 16) {
      for (const s of [-1, 1]) {
        const x = s < 0 ? wx : W - wx
        crown(g, x, floor - 23, 10, 8)
        lacquerPanel(g, x - 3, floor - 22, 6, 13, !!o.night, 2)
        windows.push({ x, y: floor - 16 })
      }
    }
    // Columns across the front.
    for (let x = wallL + 2; x <= wallR - 6; x += 16) {
      if (Math.abs(x + 2 - cx) < 8) continue
      column(g, x, Math.abs(x - cx) < HW1 + 4 ? colTop : B2 + 34, floor, 4)
    }
    valance(g, cx - HW1 + 6, cx - 10, colTop - 1)
    valance(g, cx + 10, cx + HW1 - 6, colTop - 1)
    // Platform.
    const px0 = wallL - 6
    const pw = wallR - wallL + 12
    g.rect(px0, floor, pw, 14, WHITE.b)
    g.hline(px0, px0 + pw - 1, floor, WHITE.L)
    g.rect(px0, floor + 3, pw, 4, P.redD)
    for (let x = px0 + 1; x < px0 + pw; x += 4) g.px(x, floor + 5, GOLD.b)
    g.hline(px0, px0 + pw - 1, floor + 13, WHITE.D)
    for (let x = px0; x < px0 + pw; x++) {
      const k = (x - px0) % 3
      g.px(x, floor + 1, k === 1 ? GOLD.l : WHITE.d)
      g.px(x, floor + 8, k === 1 ? GOLD.d : WHITE.D)
    }
    // Wide stairs with naga balustrades.
    const steps = 6
    for (let i = 0; i < steps; i++) {
      const y0 = Math.round(floor + 1 + (i * (ground - floor)) / steps)
      const y1 = Math.round(floor + 1 + ((i + 1) * (ground - floor)) / steps)
      const half = 14 + i
      g.rect(cx - half, y0, half * 2 + 1, y1 - y0, WHITE.b)
      g.hline(cx - half, cx + half, y0, WHITE.L)
      g.hline(cx - half, cx + half, y1 - 1, WHITE.D)
    }
    for (const s of [-1, 1]) nagaRail(g, cx + s * 16, floor - 4, cx + s * 21, ground, s)
    hooks.glints = glints
    hooks.bells = bells
    hooks.windows = windows
    hooks.door = [{ x: cx, y: floor - 10 }]
    hooks.floor = [{ x: cx, y: floor }]
  })
}

// ---------------------------------------------------------------------------
// Nang talung stage, amulet stall, khanom la stall.

/** Raised shadow-puppet stage hut (โรงหนังตะลุง). Screen rect in hooks.screen (top-left) + hooks.screenBR. */
export function nangTalungStage(night = false): Building {
  const W = 70
  const H = 62
  return buildProp(`nst:talung:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Stilts and the raised floor.
    for (const x of [4, W - 7, cx - 1]) g.rect(x, 40, 3, 21, '#6e4a35')
    g.rect(1, 38, W - 2, 4, '#9a6a45')
    g.hline(1, W - 2, 38, '#c28e5c')
    // Skirt cloth under the stage.
    for (let x = 2; x < W - 2; x++) g.vline(x, 42, 52, Math.floor(x / 4) % 2 ? '#e8514a' : '#ffd23f')
    g.hline(2, W - 3, 52, '#b8343f')
    // Walls & the white screen in a painted frame.
    g.rect(4, 12, W - 8, 26, '#5a3d4f')
    const sx = 11
    const sy = 15
    const sw = W - 22
    const sh = 21
    g.rect(sx - 3, sy - 3, sw + 6, sh + 6, '#e8b44a')
    for (let x = sx - 3; x < sx + sw + 3; x += 3) {
      g.px(x, sy - 3, '#e8514a')
      g.px(x + 1, sy + sh + 2, '#3d63b5')
    }
    for (let y = sy - 3; y < sy + sh + 3; y += 3) {
      g.px(sx - 3, y, '#3d63b5')
      g.px(sx + sw + 2, y + 1, '#e8514a')
    }
    g.rect(sx, sy, sw, sh, night ? '#fff1c0' : '#fff8e8')
    // Roof: thatched nipa gable.
    const thatch = { L: '#d8b878', b: '#b89458', d: '#94703c', D: '#6e5028' }
    for (let y = 0; y < 13; y++) {
      const half = 10 + y * 2.3
      g.rect(Math.round(cx - half), y, Math.round(half * 2), 1, y % 3 === 0 ? thatch.d : thatch.b)
      for (let x = Math.round(cx - half); x < cx + half; x += 3) g.px(x + (y % 2), y, thatch.L)
    }
    g.hline(cx - 40, cx + 39, 13, thatch.D)
    for (let x = cx - 38; x < cx + 38; x += 2) g.px(x, 14, thatch.d)
    // Sign board: หนังตะลุง.
    g.rect(cx - 12, 2, 24, 7, '#fffaf0')
    g.frame(cx - 12, 2, 24, 7, '#b8343f')
    g.hline(cx - 9, cx + 8, 5, '#b8343f')
    g.hline(cx - 6, cx + 4, 7, '#5a3d4f')
    // Drums (ทับ) and gong by the stage.
    g.ellipse(8, 58, 4, 2, '#8a5a32')
    g.rect(5, 54, 7, 4, '#b0703f')
    g.ellipse(8, 54, 3.5, 1.4, '#f3dcb2')
    g.circle(W - 9, 55, 3.5, BRONZE_R.b)
    g.px(W - 10, 54, BRONZE_R.L)
    hooks.screen = [
      { x: sx, y: sy },
      { x: sx + sw, y: sy + sh },
    ]
  })
}

/** Leather shadow puppet (souvenir) silhouette, coloured. */
function puppet(g: Surface, x: number, y: number, c: Color, kind: number) {
  const d = mixHex(c, '#3a2838', 0.35)
  g.vline(x, y + 8, y + 13, '#6e4a35')
  if (kind === 0) {
    // Crowned hero.
    g.rect(x - 1, y + 2, 3, 6, c)
    g.px(x, y, GOLD.b)
    g.px(x, y + 1, GOLD.b)
    g.px(x - 2, y + 4, d)
    g.px(x + 2, y + 3, d)
    g.px(x + 3, y + 2, d)
  } else {
    // Pot-bellied clown.
    g.rect(x - 2, y + 3, 4, 5, c)
    g.rect(x - 1, y + 1, 2, 2, c)
    g.px(x - 3, y + 2, d)
    g.px(x + 2, y + 6, d)
  }
  g.px(x, y + 4, '#fff3a6')
}

/** Amulet & shadow-puppet souvenir stall (พระเครื่อง จตุคามรามเทพ · หนังตะลุง). */
export function amuletStall(): Building {
  const W = 56
  const H = 46
  return buildProp('nst:amulet', W, H, W / 2, H - 1, (g, hooks) => {
    // Back rail with hanging puppets.
    g.rect(2, 4, 2, 40, '#6e4a35')
    g.rect(W - 4, 4, 2, 40, '#6e4a35')
    g.rect(2, 4, W - 4, 2, '#9a6a45')
    const cols = ['#e8514a', '#3d63b5', '#e8b44a', '#43905a', '#b8343f', '#9270dc']
    for (let i = 0; i < 7; i++) puppet(g, 7 + i * 7, 6, cols[i % cols.length], i % 2)
    // Red cloth awning edge.
    for (let x = 2; x < W - 2; x++) g.px(x, 3, x % 4 < 2 ? '#e8514a' : '#ffd23f')
    // Sign.
    g.rect(W / 2 - 14, 20, 28, 6, '#b8343f')
    g.frame(W / 2 - 14, 20, 28, 6, GOLD.d)
    g.hline(W / 2 - 11, W / 2 + 10, 22, GOLD.l)
    g.hline(W / 2 - 8, W / 2 + 6, 24, '#fffaf0')
    // Glass-top counter with rows of round Chatukham amulets.
    g.rect(2, 28, W - 4, 4, '#d4f1ff')
    g.hline(2, W - 3, 28, '#ffffff')
    g.rect(2, 32, W - 4, 10, '#8a5a32')
    g.hline(2, W - 3, 32, '#c28e5c')
    for (let x = 5; x < W - 4; x += 5)
      for (const y of [29, 31]) {
        const k = hash(x, y, 2) % 4
        const c = [GOLD.b, BRONZE_R.b, '#d8d8e0', '#5a3d4f'][k]
        g.px(x, y, c)
        g.px(x + 1, y, mixHex(c, '#ffffff', 0.4))
      }
    // Big display Chatukham medallion on a stand.
    g.circle(W - 12, 24, 5, GOLD.d)
    g.circle(W - 12, 24, 4, GOLD.b)
    g.circle(W - 12, 24, 2, GOLD.D)
    g.px(W - 13, 23, GOLD.L)
    for (let a = 0; a < 8; a++) g.px(Math.round(W - 12 + Math.cos(a * 0.785) * 3.5), Math.round(24 + Math.sin(a * 0.785) * 3.5), GOLD.L)
    // Loupe (กล้องส่องพระ) on the counter.
    g.circle(9, 26, 2, '#9fd0ff')
    g.px(8, 25, '#ffffff')
    g.line(10, 27, 12, 28, '#3a3040')
    for (const x of [5, W - 7]) g.rect(x, 42, 2, 3, '#6e4a35')
    hooks.glints = [{ x: W - 13, y: 23 }]
  })
}

/** Khanom la (ขนมลา) & southern rice salad stall with a lace-sweet display. */
export function khanomLaStall(): Building {
  const W = 50
  const H = 42
  return buildProp('nst:khanomla', W, H, W / 2, H - 1, (g, hooks) => {
    g.rect(3, 10, 2, 31, '#6e4a35')
    g.rect(W - 5, 10, 2, 31, '#6e4a35')
    for (let y = 2; y < 11; y++) {
      const inset = Math.round((10 - y) * 0.6)
      for (let x = inset; x < W - inset; x++) g.px(x, y, Math.floor((x - inset) / 6) % 2 ? '#fffaf0' : '#43905a')
    }
    for (let x = 0; x < W; x += 6) g.rect(x + 1, 11, 4, 1, Math.floor(x / 6) % 2 ? '#fffaf0' : '#43905a')
    // Counter.
    g.rect(2, 26, W - 4, 3, '#e0bb8a')
    g.hline(2, W - 3, 26, '#f3dcb2')
    g.rect(2, 29, W - 4, 11, '#c28e5c')
    for (let x = 5; x < W - 3; x += 6) g.vline(x, 30, 39, '#9a6a45')
    // Stacks of khanom la: golden lace nets folded into squares.
    for (let i = 0; i < 4; i++) {
      const x = 5 + i * 8
      for (let j = 0; j < 3; j++) {
        const y = 23 - j * 2
        g.rect(x, y, 7, 2, j % 2 ? '#f0b040' : '#ffd070')
        for (let k = 0; k < 7; k += 2) g.px(x + k, y, '#c07a20')
      }
    }
    // Khao yam bowl (blue rice) + herbs.
    g.ellipse(W - 10, 24, 5, 2.5, '#fffaf0')
    g.ellipse(W - 10, 23, 4, 1.6, '#7a86d8')
    g.px(W - 12, 22, '#86c95f')
    g.px(W - 9, 22, '#f58f35')
    // Pan frying on a burner, hooks for steam.
    g.rect(W - 18, 17, 8, 2, '#3a3040')
    g.px(W - 19, 16, '#9a9aa8')
    // Price card.
    g.rect(W / 2 - 8, 31, 16, 6, '#fffaf0')
    g.hline(W / 2 - 6, W / 2 + 5, 33, P.redD)
    hooks.steam = [{ x: W - 14, y: 15 }]
  })
}

/** Tall bronze standing Buddha (Phra Song Ma gatekeeper feel) for the court gate. */
export function standingGuardian(skin: Color): Building {
  return buildProp(`nst:guard:${skin}`, 18, 44, 9, 43, (g) => {
    const R: Ramp = { L: mixHex(skin, '#ffffff', 0.35), b: skin, d: mixHex(skin, '#3a2838', 0.25), D: mixHex(skin, '#3a2838', 0.45) }
    tier(g, 9, 38, 5, 8, WHITE_R, P.redD)
    for (let y = 22; y < 38; y++) slice(g, 9, y, 3 + (y > 32 ? 1 : 0), R, 0.35)
    for (let y = 12; y < 22; y++) slice(g, 9, y, 4.5 - Math.abs(y - 16) * 0.2, R, 0.35)
    g.circle(9, 8, 3.2, R.b)
    g.px(8, 7, R.L)
    // Crown and club.
    for (let i = 0; i < 6; i++) g.rect(9 - Math.max(0, 3 - Math.floor(i / 2)), 4 - i, Math.max(1, 7 - i), 1, i % 2 ? GOLD.d : GOLD.b)
    g.vline(15, 10, 36, '#6e4a35')
    g.rect(14, 8, 3, 4, GOLD.d)
    g.hline(5, 13, 22, GOLD.b)
    g.px(7, 9, '#fffaf0')
    g.px(11, 9, '#fffaf0')
  })
}

export { SAFFRON }
