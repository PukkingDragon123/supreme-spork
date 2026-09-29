// Phuket: Wat Chalong (the three-storey Phra Mahathat chedi holding a relic,
// the firecracker furnace, Luang Pho Chaem's hall of gilded statues, Hokkien
// noodles and oh-aew) and the Big Buddha on Nakkerd hill (the white marble
// giant, marble terrace with bells and wishing tiles, sea views, monkeys).

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, WHITE, ROOF, slice, tier, crown, lacquerPanel, hangHong, nagaRail, type Ramp, type RoofRamp, type Pt } from '../temple'
import { canopy, LEAVES } from '../garden'
import { buildProp, hash, pushCart, awningStall, GOLD_R, WHITE_R, MARBLE_R, BRONZE_R, type Building } from './south'
import { buddhaHD, HD_MARBLE } from './south_interior'

// ---------------------------------------------------------------------------
// Wat Chalong – Phra Mahathat Chedi.

/** A tiled roof skirt between two half-widths (a storey's eave). */
function skirt(g: Surface, cx: number, yTop: number, rows: number, halfTop: number, halfBot: number, r: RoofRamp, glints: Pt[]) {
  for (let i = 0; i < rows; i++) {
    const t = i / Math.max(1, rows - 1)
    const half = halfTop + (halfBot - halfTop) * t
    const y = yTop + i
    const edge = rows - 1 - i
    let c = r.field
    if (edge < 2) c = edge === 0 ? r.borderD : r.border
    else if (i % 3 === 2) c = r.fieldD
    g.rect(Math.round(cx - half), y, Math.round(half * 2), 1, c)
    if (edge >= 2 && i % 3 === 1) for (let x = Math.round(cx - half) + (i % 4); x < cx + half; x += 4) g.px(x, y, r.fieldL)
    g.px(Math.round(cx - half), y, GOLD.b)
    g.px(Math.round(cx + half) - 1, y, GOLD.d)
  }
  // Gold ridge at the top and upturned corners.
  g.hline(Math.round(cx - halfTop), Math.round(cx + halfTop) - 1, yTop, GOLD.b)
  hangHong(g, Math.round(cx - halfBot) - 1, yTop + rows, -1)
  hangHong(g, Math.round(cx + halfBot), yTop + rows, 1)
  glints.push({ x: Math.round(cx - halfBot) - 3, y: yTop + rows - 3 }, { x: Math.round(cx + halfBot) + 2, y: yTop + rows - 3 })
}

/** White storey wall with arched blue windows (and an optional door). */
function storey(g: Surface, cx: number, yTop: number, h: number, half: number, step: number, door: boolean, night: boolean) {
  for (let y = yTop; y < yTop + h; y++) slice(g, cx, y, half, WHITE_R, 0.3)
  g.hline(Math.round(cx - half), Math.round(cx + half) - 1, yTop, WHITE.DD)
  g.hline(Math.round(cx - half), Math.round(cx + half) - 1, yTop + 1, WHITE.D)
  const wh = Math.max(6, Math.round(h * 0.52))
  const wy = yTop + Math.round((h - wh) / 2) + 1
  for (let x = cx - half + step / 2; x < cx + half - 3; x += step) {
    if (door && Math.abs(x - cx) < 10) continue
    const wx = Math.round(x)
    g.rect(wx - 2, wy, 5, wh, GOLD.d)
    g.rect(wx - 1, wy + 1, 3, wh - 1, night ? '#ffe7a8' : '#4f7fd0')
    g.px(wx, wy, GOLD.l)
    g.px(wx - 1, wy + 1, night ? '#fff6d6' : '#8fb6ff')
  }
  // Pilasters.
  for (let x = cx - half + 1; x < cx + half; x += step) g.vline(Math.round(x), yTop + 2, yTop + h - 1, WHITE.d)
  if (door) {
    crown(g, cx, yTop + 5, 16, 10)
    lacquerPanel(g, cx - 6, yTop + h - 18, 12, 18, night, 2)
    g.rect(cx - 8, yTop + h - 19, 16, 1, GOLD.b)
  }
}

/** Phra Mahathat Chedi of Wat Chalong (anchor: stair foot). */
export function chalongChedi(night = false): Building {
  const W = 164
  const H = 236
  return buildProp(`chalong:chedi:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    let y = H - 1
    // Front stairs.
    for (let i = 0; i < 5; i++) {
      const yy = y - (i + 1) * 2
      g.rect(cx - 16 + i, yy, 32 - i * 2, 2, i % 2 ? WHITE.b : '#ffffff')
      g.hline(cx - 16 + i, cx + 15 - i, yy + 1, WHITE.D)
    }
    nagaRail(g, cx - 18, y - 12, cx - 20, y, -1)
    nagaRail(g, cx + 18, y - 12, cx + 20, y, 1)
    y -= 10
    // Plinth.
    tier(g, cx, y - 6, 6, 78, WHITE_R, P.redD)
    y -= 6
    // Storey 1 with the door.
    storey(g, cx, y - 34, 34, 70, 14, true, night)
    y -= 34
    skirt(g, cx, y - 13, 13, 56, 78, ROOF.red, glints)
    y -= 13
    storey(g, cx, y - 22, 22, 52, 13, false, night)
    y -= 22
    skirt(g, cx, y - 11, 11, 40, 60, ROOF.red, glints)
    y -= 11
    storey(g, cx, y - 16, 16, 36, 12, false, night)
    y -= 16
    skirt(g, cx, y - 9, 9, 26, 42, ROOF.orange, glints)
    y -= 9
    // Upper chedi: square base, bell, rings, gold spire.
    tier(g, cx, y - 5, 5, 22, WHITE_R, GOLD.d)
    y -= 5
    const bellH = 24
    const base = y
    for (let i = 1; i <= bellH; i++) slice(g, cx, base - i, 19 * Math.pow(Math.max(0, 1 - Math.pow(i / bellH, 2.2)), 0.5), WHITE_R, 0.32)
    for (let x = -16; x <= 16; x++) g.px(cx + x, base - 8 + Math.round(Math.abs(Math.sin(x * 0.3)) * 2), GOLD.d)
    y = base - bellH
    for (let i = 0; i < 4; i++) slice(g, cx, y - i, 7, i % 3 === 0 ? GOLD_R : WHITE_R)
    y -= 4
    for (let i = 0; i < 9; i++) {
      const half = 6 - i * 0.45
      slice(g, cx, y, half, GOLD_R, 0.4)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      slice(g, cx, y - 1, half, GOLD_R, 0.4)
      slice(g, cx, y - 2, half - 0.3, GOLD_R, 0.4)
      y -= 3
    }
    for (let i = 0; i < 28; i++) slice(g, cx, y - i, 2 * (1 - i / 28) + 0.35, GOLD_R, 0.5)
    y -= 28
    g.px(cx - 1, y, '#ffffff')
    g.px(cx, y - 1, GOLD.L)
    glints.push({ x: cx, y: y + 2 }, { x: cx - 3, y: y + 30 }, { x: cx, y: y + 16 })
    hooks.glints = glints
    hooks.door = [{ x: cx, y: H - 30 }]
    hooks.top = [{ x: cx, y }]
  })
}

/** Firecracker furnace (เตาจุดประทัด) – soot-blackened kiln with a glowing mouth. */
export function firecrackerFurnace(): Building {
  return buildProp('chalong:furnace', 46, 52, 23, 51, (g, hooks) => {
    const cx = 23
    // Red paper debris around.
    for (let i = 0; i < 70; i++) {
      const v = hash(i, 5, 8)
      g.px(2 + (v % 42), 44 + ((v >> 5) % 7), v % 3 ? '#e8514a' : '#b8343f')
    }
    // Kiln dome.
    const R: Ramp = { L: '#d8ccc4', b: '#b0a4a0', d: '#8a7e7e', D: '#5e5458' }
    for (let i = 0; i < 30; i++) {
      const t = i / 30
      slice(g, cx, 46 - i, 18 * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.2))) + 1, R, 0.3)
    }
    // Soot.
    for (let i = 0; i < 40; i++) {
      const v = hash(i, 9, 2)
      g.px(cx - 12 + (v % 24), 20 + ((v >> 4) % 18), v % 2 ? '#4a4048' : '#6a5e62')
    }
    // Glowing arched mouth.
    g.rect(cx - 7, 32, 14, 14, '#2a1a1a')
    g.circle(cx, 32, 7, '#2a1a1a')
    g.rect(cx - 5, 36, 10, 10, '#b8343f')
    g.rect(cx - 4, 39, 8, 7, '#f58f35')
    g.rect(cx - 2, 41, 4, 5, '#ffd23f')
    g.px(cx, 40, '#fff3a6')
    // Chimney pipe.
    g.rect(cx - 3, 4, 6, 14, '#6a5e62')
    g.rect(cx - 4, 3, 8, 2, '#4a4048')
    g.vline(cx - 2, 5, 17, '#8a7e7e')
    // Sign.
    g.rect(1, 22, 10, 7, '#ffd23f')
    g.frame(1, 22, 10, 7, '#b8343f')
    g.hline(3, 8, 24, '#b8343f')
    g.hline(3, 7, 26, '#3a2838')
    hooks.mouth = [{ x: cx, y: 42 }]
    hooks.chimney = [{ x: cx, y: 2 }]
  })
}

/** A gilded seated monk statue (Luang Pho), covered in gold leaf. */
export function drawGoldMonk(g: Surface, cx: number, baseY: number, k: number, fan = false) {
  const S = (v: number) => Math.round(v * k)
  // Lap.
  g.ellipse(cx, baseY - S(3), S(9), S(3.4), GOLD.D)
  g.ellipse(cx, baseY - S(3.4), S(8.4), S(3), GOLD.b)
  g.hline(cx - S(7), cx + S(7), baseY - S(5), GOLD.l)
  // Body with robe over the left shoulder.
  for (let y = baseY - S(14); y < baseY - S(5); y++) slice(g, cx, y, S(5) + (y - (baseY - S(14))) * 0.25, GOLD_R, 0.35)
  g.line(cx - S(5), baseY - S(13), cx + S(3), baseY - S(6), GOLD.D)
  g.rect(cx + S(2), baseY - S(13), S(3), S(5), GOLD.l)
  // Hands.
  g.rect(cx - S(2), baseY - S(7), S(4), S(2), GOLD.l)
  // Head.
  g.circle(cx, baseY - S(17), S(3.6), GOLD.b)
  g.px(cx - S(1.5), baseY - S(19), GOLD.L)
  g.hline(cx - S(2), cx - S(1), baseY - S(17), GOLD.D)
  g.hline(cx + S(1), cx + S(2), baseY - S(17), GOLD.D)
  g.px(cx - S(4), baseY - S(17), GOLD.d)
  g.px(cx + S(4), baseY - S(17), GOLD.d)
  // Gold-leaf flakes.
  for (let i = 0; i < Math.round(8 * k); i++) {
    const v = hash(i, cx, 4)
    g.px(cx - S(6) + (v % Math.max(1, S(12))), baseY - S(16) + ((v >> 4) % Math.max(1, S(12))), i % 2 ? '#fff8d8' : GOLD.L)
  }
  if (fan) {
    g.vline(cx + S(7), baseY - S(22), baseY - S(4), '#6e4a35')
    g.ellipse(cx + S(7), baseY - S(22), S(3), S(4), '#f58f35')
    g.px(cx + S(7), baseY - S(23), '#ffd23f')
  }
}

/** Open front of Luang Pho Chaem's hall: three gilded monk statues on a stepped altar. */
export function chaemHallInner(g: Surface, x0: number, x1: number, top: number, floor: number) {
  const cx = Math.round((x0 + x1) / 2)
  g.rect(x0, top, x1 - x0, floor - top, '#6a2a2a')
  for (let y = top + 2; y < floor - 12; y += 4)
    for (let x = x0 + 2; x < x1 - 1; x += 5) if (hash(x, y, 6) % 3 === 0) g.px(x + (y % 8 ? 0 : 2), y, GOLD.d)
  // Stepped altar.
  g.rect(x0 + 4, floor - 12, x1 - x0 - 8, 12, P.redD)
  g.hline(x0 + 4, x1 - 5, floor - 12, GOLD.b)
  g.rect(cx - 18, floor - 17, 36, 5, P.redD)
  g.hline(cx - 18, cx + 17, floor - 17, GOLD.b)
  // Luang Pho Chuang, Luang Pho Chaem (centre, with fan), Luang Pho Guam.
  drawGoldMonk(g, cx - 22, floor - 12, 1)
  drawGoldMonk(g, cx + 22, floor - 12, 1)
  drawGoldMonk(g, cx, floor - 17, 1.25, true)
  // Candles, garlands and flowers.
  for (const x of [cx - 34, cx - 10, cx + 10, cx + 34]) {
    g.rect(x, floor - 6, 1, 4, '#fff4d6')
    g.px(x, floor - 7, '#ffb35a')
  }
  for (let i = x0 + 6; i < x1 - 6; i += 2) g.px(i, floor - 3, (i >> 1) % 2 ? '#f58f35' : '#ffd23f')
}

/** Hokkien noodle (หมี่ฮกเกี้ยน) stall with a wok and steaming pot. */
export function hokkienStall(): Building {
  return awningStall({
    key: 'hokkien',
    canopy: ['#e8514a', '#fffaf0'],
    sign: '#b8343f',
    w: 52,
    goods: (g, x0, x1, y) => {
      // Charcoal stove + wok.
      g.rect(x0 + 2, y - 4, 14, 5, '#5a5068')
      g.ellipse(x0 + 9, y - 5, 7, 2, '#3a3040')
      g.ellipse(x0 + 9, y - 6, 5.5, 1.3, '#ffd23f')
      for (let i = 0; i < 5; i++) g.px(x0 + 6 + i, y - 6 - (i % 2), '#f5c030')
      g.px(x0 + 12, y - 7, '#e8514a')
      g.px(x0 + 7, y - 7, '#86c95f')
      // Soup pot.
      g.rect(x1 - 16, y - 8, 10, 9, '#d8d8e0')
      g.hline(x1 - 16, x1 - 7, y - 8, '#ffffff')
      g.ellipse(x1 - 11, y - 8, 4.5, 1, '#c9a04c')
      // Bowls and yellow noodle bundles.
      for (let i = 0; i < 3; i++) {
        g.rect(x0 + 20 + i * 6, y - 2, 5, 2, '#fffaf0')
        g.rect(x0 + 21 + i * 6, y - 3, 3, 1, '#f5c030')
      }
    },
  })
}

/** Oh-aew (โอ๋เอ๋ว) dessert cart: banana-jelly block, shaved ice, red syrup. */
export function ohAewCart(): Building {
  return pushCart('ohaew', ['#ff9fc0', '#fffaf0'], '#4f7fd0', (g, x, y) => {
    // Big wobbly jelly block.
    g.rect(x + 1, y + 1, 9, 5, '#e8dcc0')
    g.hline(x + 1, x + 9, y + 1, '#fff8e8')
    g.px(x + 3, y + 3, '#ffffff')
    // Bowls of oh-aew with red syrup and beans.
    for (let i = 0; i < 2; i++) {
      const bx = x + 13 + i * 7
      g.rect(bx, y + 3, 6, 3, '#fffaf0')
      g.rect(bx + 1, y + 1, 4, 2, '#fff4f4')
      g.px(bx + 2, y + 1, '#e8514a')
      g.px(bx + 3, y + 2, '#e8514a')
      g.px(bx + 1, y + 2, '#8a3a3a')
    }
  })
}

/** Phuket's wooden "bus" (รถโพถ้อง) in bright paint, parked by the gate. */
export function bothongBus(): Building {
  return buildProp('chalong:bus', 72, 40, 36, 39, (g) => {
    const body = '#3d8ad0'
    // Chassis & wheels.
    g.rect(2, 30, 68, 4, '#3a3040')
    for (const x of [14, 56]) {
      g.circle(x, 34, 4, '#3a3040')
      g.circle(x, 34, 1.6, '#bdb2ae')
    }
    // Wooden body with painted panels.
    g.rect(2, 12, 58, 18, body)
    g.rect(2, 12, 58, 2, '#8fc4f0')
    for (let x = 4; x < 58; x += 8) {
      g.rect(x, 15, 6, 7, '#fff3c0')
      g.rect(x, 15, 6, 1, '#6e4a35')
      g.px(x + 2, 18, '#f0bd90')
    }
    g.rect(2, 23, 58, 2, '#ffd23f')
    g.rect(2, 25, 58, 5, '#e8514a')
    for (let x = 4; x < 58; x += 6) g.px(x, 27, '#fff3a6')
    // Cab.
    g.rect(58, 14, 12, 16, '#e8514a')
    g.rect(60, 16, 8, 6, '#d4f1ff')
    g.px(69, 26, '#fff3a6')
    // Roof rack with baskets.
    g.rect(2, 9, 60, 3, '#6e4a35')
    g.rect(8, 5, 10, 4, '#c9a06a')
    g.rect(24, 6, 8, 3, '#e8b44a')
    g.rect(40, 5, 12, 4, '#9a6a45')
    for (let x = 8; x < 18; x += 2) g.px(x, 5, '#e0bb8a')
  })
}

// ---------------------------------------------------------------------------
// Wat Chalong interior pieces.

/** The relic (พระบรมสารีริกธาตุ) in a crystal stupa under a glass dome on a gold stand. */
export function relicShrine(): Building {
  return buildProp('chalong:relic', 40, 56, 20, 55, (g, hooks) => {
    const cx = 20
    tier(g, cx, 49, 6, 18, GOLD_R, GOLD.D)
    tier(g, cx, 43, 6, 14, { L: '#e05a52', b: '#b8343f', d: '#8e2433', D: '#6e1a2a' }, GOLD.d)
    // Glass dome.
    g.ellipse(cx, 30, 12, 13, '#cfeaf6')
    g.ellipse(cx, 30, 11, 12, '#e8f8ff')
    g.rect(cx - 12, 30, 24, 13, '#e8f8ff')
    g.rect(cx - 12, 30, 1, 13, '#cfeaf6')
    g.rect(cx + 11, 30, 1, 13, '#cfeaf6')
    // Crystal & gold reliquary stupa.
    for (let y = 26; y < 42; y++) slice(g, cx, y, 1 + Math.max(0, (y - 26) * 0.32), GOLD_R, 0.4)
    g.circle(cx, 34, 4, GOLD.b)
    g.circle(cx, 34, 2, '#ffffff')
    g.px(cx - 1, 33, '#9fd0ff')
    for (let y = 16; y < 26; y++) g.px(cx, y, y % 3 ? GOLD.l : GOLD.D)
    // Shine.
    g.line(cx - 8, 22, cx - 6, 40, '#ffffff')
    hooks.relic = [{ x: cx, y: 34 }]
    hooks.glints = [
      { x: cx, y: 16 },
      { x: cx, y: 34 },
    ]
  })
}

// ---------------------------------------------------------------------------
// Phuket Big Buddha.

/** The 45 m white marble Big Buddha on its lotus pedestal with the shrine door. */
export function bigBuddha(): Building {
  const s = 1.8
  const b = buddhaHD('sukhothai', s, HD_MARBLE)
  const W = 232
  const bh = Math.round(97 * s)
  const pedH = 58
  const H = bh + pedH + 8
  return buildProp('bb:bigbuddha', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const foot = H - 1
    // Pedestal: three marble tiers with the shrine door and stairs.
    tier(g, cx, foot - 20, 20, 112, MARBLE_R, '#b8b2c4')
    tier(g, cx, foot - 34, 14, 96, MARBLE_R, '#b8b2c4')
    tier(g, cx, foot - 44, 10, 84, MARBLE_R)
    // Lotus petals (up & down).
    for (let x = cx - 82; x < cx + 82; x++) {
      const k = (x - (cx - 82)) % 6
      const hgt = k < 3 ? k + 1 : 6 - k
      for (let j = 0; j < hgt + 1; j++) g.px(x, foot - 45 - j, j === hgt ? '#ffffff' : k === 3 ? '#e8e6ee' : '#d8d4e0')
    }
    for (let x = cx - 70; x < cx + 70; x++) {
      const k = (x - (cx - 70)) % 6
      const hgt = k < 3 ? k + 1 : 6 - k
      for (let j = 0; j < hgt; j++) g.px(x, foot - 52 + j + 3, j === 0 ? '#ffffff' : '#e8e6ee')
    }
    // Door into the shrine room.
    const dx = cx
    g.rect(dx - 9, foot - 30, 18, 22, '#3a3448')
    g.circle(dx, foot - 30, 9, '#3a3448')
    g.rect(dx - 7, foot - 28, 14, 20, '#5a5068')
    g.rect(dx - 5, foot - 26, 10, 18, '#ffe7a8')
    g.px(dx, foot - 38, GOLD.b)
    for (let a = 0; a < 16; a++) g.px(Math.round(dx + Math.cos(Math.PI + (a / 15) * Math.PI) * 10), Math.round(foot - 30 + Math.sin(Math.PI + (a / 15) * Math.PI) * 10), GOLD.d)
    // Stairs.
    for (let i = 0; i < 4; i++) g.rect(cx - 16 - i * 2, foot - 8 + i * 2, 32 + i * 4, 2, i % 2 ? '#f4f3f7' : '#ffffff')
    // Marble joints on the tiers.
    for (let y = foot - 19; y < foot - 1; y += 6) for (let x = cx - 110; x < cx + 110; x += 14) g.vline(x + ((y / 6) % 2 ? 7 : 0), y, y + 5, '#d8d4e0')
    // The Buddha.
    const seat = foot - pedH + 2
    g.draw(b.canvas, cx - b.ox, seat - b.oy)
    hooks.chest = [{ x: cx, y: seat - Math.round(bh * 0.45) }]
    hooks.head = [{ x: cx, y: seat - Math.round(bh * 0.9) }]
    hooks.door = [{ x: cx, y: foot - 20 }]
    hooks.glints = [
      { x: cx, y: seat - bh + 4 },
      { x: cx - 30, y: seat - 20 },
      { x: cx + 26, y: seat - 50 },
    ]
  })
}

/** The 12 m golden brass Buddha beside the marble giant. */
export function goldenBuddha(): Building {
  const s = 0.62
  const b = buddhaHD('sukhothai', s)
  const W = 72
  const H = Math.round(97 * s) + 30
  return buildProp('bb:golden', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const foot = H - 1
    tier(g, cx, foot - 14, 14, 34, MARBLE_R, '#b8b2c4')
    tier(g, cx, foot - 22, 8, 28, GOLD_R, GOLD.D)
    g.draw(b.canvas, cx - b.ox, foot - 22 - b.oy + 2)
    hooks.head = [{ x: cx, y: foot - 22 - Math.round(97 * s * 0.9) }]
  })
}

/** Marble balustrade with a bar of bells above (bells drawn by RackBells). */
export function bellRail(len: number): Building {
  return buildProp(`bb:rail:${len}`, len, 30, 0, 29, (g, hooks) => {
    // Posts + bar for the bells.
    for (const x of [0, len - 3]) {
      g.rect(x, 2, 3, 27, MARBLE_R.b)
      g.vline(x + 2, 2, 28, MARBLE_R.D)
      g.rect(x - 1, 1, 5, 2, GOLD.b)
    }
    g.rect(0, 3, len, 2, GOLD.d)
    g.hline(0, len - 1, 3, GOLD.l)
    // Balustrade.
    g.rect(0, 18, len, 3, '#ffffff')
    g.hline(0, len - 1, 20, MARBLE_R.d)
    for (let x = 3; x < len - 2; x += 4) {
      g.rect(x, 21, 2, 6, MARBLE_R.b)
      g.px(x + 1, 22, MARBLE_R.D)
    }
    g.rect(0, 27, len, 2, MARBLE_R.d)
    // Ribbons tied on the bar.
    for (let x = 6; x < len - 4; x += 9) {
      const c = ['#e8514a', '#ffd23f', '#5a8de0', '#ff9fc0', '#6cc36a'][Math.floor(x / 9) % 5]
      g.vline(x, 5, 8, c)
      g.px(x + 1, 8, c)
    }
    hooks.bells = Array.from({ length: Math.max(1, Math.floor((len - 8) / 8)) }, (_, i) => ({ x: 7 + i * 8, y: 5 }))
  })
}

/** Wall of signed marble wishing tiles (แผ่นหินอ่อนเขียนคำอธิษฐาน). */
export function wishTiles(w = 40): Building {
  return buildProp(`bb:tiles:${w}`, w, 30, w / 2, 29, (g) => {
    g.rect(0, 26, w, 3, '#bdb2ae')
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < Math.floor(w / 7); c++) {
        const x = c * 7 + (r % 2 ? 2 : 0)
        const y = 20 - r * 6
        if (x + 6 > w) continue
        g.rect(x, y, 6, 5, '#ffffff')
        g.hline(x, x + 5, y + 4, '#d8d4e0')
        const v = hash(x, y, 3)
        const ink = ['#3d63b5', '#e8514a', '#3a2838', '#43905a', '#9270dc'][v % 5]
        g.hline(x + 1, x + 3 + (v % 2), y + 1, ink)
        g.hline(x + 1, x + 2 + (v % 3), y + 3, ink)
        if (v % 4 === 0) g.px(x + 4, y + 2, '#ff6f91')
      }
  })
}

/** The tile-signing booth: blank tiles, marker cups and a sign. */
export function tileBooth(): Building {
  return awningStall({
    key: 'tiles',
    canopy: ['#fffaf0', '#e8b44a'],
    sign: '#e9a53a',
    w: 50,
    goods: (g, x0, x1, y) => {
      for (let i = 0; i < 4; i++) {
        g.rect(x0 + 2 + i * 7, y - 3 - (i % 2), 6, 4, '#ffffff')
        g.hline(x0 + 2 + i * 7, x0 + 7 + i * 7, y - (i % 2), '#d8d4e0')
      }
      for (let i = 0; i < 3; i++) {
        g.rect(x1 - 14 + i * 5, y - 3, 3, 4, '#5a8de0')
        g.vline(x1 - 13 + i * 5, y - 7, y - 4, ['#e8514a', '#3a2838', '#43905a'][i])
      }
    },
  })
}

/** Old scaffolding left from the pedestal works. */
export function scaffold(h = 80): Building {
  return buildProp(`bb:scaffold:${h}`, 34, h, 17, h - 1, (g) => {
    for (const x of [2, 16, 30]) g.rect(x, 2, 2, h - 2, '#9a9aa8')
    for (let y = 8; y < h - 2; y += 14) {
      g.rect(0, y, 34, 2, '#c28e5c')
      g.hline(0, 33, y, '#e0bb8a')
      g.line(2, y, 16, y + 12, '#80808e')
    }
    g.rect(6, h - 16, 8, 6, '#5a8de0')
    g.rect(20, 10, 10, 2, '#ffd23f')
  })
}

/** Paint the view down Nakkerd hill: jungle tops, Chalong bay, islands and boats. */
export function seaView(g: Surface, x: number, y: number, w: number, h: number, night: boolean) {
  const sea = night ? ['#2a3468', '#1e2850', '#162040'] : ['#8fd8f0', '#4aa8d8', '#2f80c0']
  g.gradientV(x, y, w, h, sea, 8)
  // Glitter.
  for (let j = 0; j < h; j += 3)
    for (let i = (j * 7) % 11; i < w; i += 13) g.rect(x + i, y + j, 3, 1, night ? '#3a4a88' : '#c8f0ff')
  // Islands (Koh Lone, Koh Hae…).
  const isle = (cx: number, cy: number, rw: number, rh: number) => {
    g.ellipse(cx, cy, rw + 1, rh * 0.5, night ? '#1e2840' : '#e8e0c8')
    g.ellipse(cx, cy - 1, rw, rh, night ? '#2a3a48' : '#3f8a5f')
    g.ellipse(cx - rw * 0.3, cy - rh * 0.4, rw * 0.5, rh * 0.5, night ? '#34485a' : '#5eae55')
  }
  isle(x + w * 0.62, y + h * 0.35, 26, 9)
  isle(x + w * 0.88, y + h * 0.55, 14, 6)
  isle(x + w * 0.3, y + h * 0.7, 10, 4)
  // Long-tail boats.
  for (const [bx, by] of [
    [x + w * 0.45, y + h * 0.6],
    [x + w * 0.75, y + h * 0.8],
  ]) {
    g.rect(bx - 4, by, 9, 2, '#8a5a32')
    g.px(bx + 5, by - 1, '#8a5a32')
    g.px(bx - 3, by + 2, '#ffffff')
  }
}

/** Dense jungle canopy tops seen from above on the hillside (baked). */
export function jungleTops(g: Surface, x: number, y: number, w: number, h: number, seed: number) {
  const blobs: [number, number, number][] = []
  for (let j = 0; j < h; j += 10)
    for (let i = -6; i < w + 6; i += 12) {
      const v = hash(i, j, seed)
      blobs.push([x + i + (v % 6), y + j + ((v >> 3) % 5), 8 + (v % 5)])
    }
  canopy(g, blobs, LEAVES.deep, seed)
  for (let i = 0; i < w; i += 20) {
    const v = hash(i, 1, seed)
    if (v % 2) continue
    // Palm crowns poking out.
    const px = x + i + (v % 10)
    const py = y + 4 + (v % Math.max(1, h - 8))
    for (let a = 0; a < 6; a++) g.line(px, py, px + Math.round(Math.cos(a) * 7), py + Math.round(Math.sin(a) * 3), LEAVES.palm.b)
  }
}

export { ROOF, BRONZE_R, mixHex, type Color }
