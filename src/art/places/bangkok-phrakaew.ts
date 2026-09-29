// Bangkok group – วัดพระศรีรัตนศาสดาราม (Wat Phra Kaew) landmarks:
// the gilded Phra Si Rattana chedi, the Phra Mondop, the Royal Pantheon's
// prang, the Angkor Wat model, gold chedis held up by demons and monkeys,
// the glass-mosaic ubosot, the bell tower, the Ramakien mural galleries and
// the spired gallery gate.

import { mix, type Color, type Surface } from '../../engine/pixel'
import { P } from '../palette'
import { GOLD, WHITE, ROOF, roofBand, bargeBoard, hangHong, gable, lacquerPanel, crown, nagaRail, type Building, type Pt } from '../temple'
import { bbuild, bprop, BK, hsh, blobShadow } from './bangkok'
import type { Prop } from '../props'
import { GOLD5, WHITE5, STONE5, litRow, bellDome, squareTier, ringStack, spire, prangTower, mosaicColumn, grandHall, type Ramp5 } from './bangkok-arch'

const GLASS: Color[] = ['#5ab8e8', '#62d0a0', '#e8514a', '#fffaf0', '#8fb6ff']

// ---------------------------------------------------------------------------
// พระศรีรัตนเจดีย์ – the great golden bell chedi.

export function srirattanaChedi(): Building {
  const W = 88
  const H = 200
  return bbuild('wpk:chedi', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    // Platform tiers.
    squareTier(g, cx, H - 11, 10, 42, WHITE5, BK.redD)
    g.hline(cx - 41, cx + 40, H - 6, GOLD.d)
    squareTier(g, cx, H - 19, 8, 36, GOLD5, GOLD.D)
    squareTier(g, cx, H - 26, 7, 31, GOLD5, GOLD.D)
    squareTier(g, cx, H - 31, 5, 27, GOLD5, GOLD.DD)
    // Lotus moulding.
    let y = H - 32
    for (let i = 0; i < 7; i++) {
      const half = 26 - i * 0.6
      litRow(g, cx, y - i, half, GOLD5, { bias: i === 3 ? 1 : 0 })
      if (i === 1 || i === 5) for (let x = Math.round(cx - half) + 1; x < cx + half - 1; x += 3) g.px(x, y - i, GOLD.D)
    }
    y -= 7
    // Three rings.
    for (const half of [24.5, 23, 21.5]) {
      litRow(g, cx, y, half, GOLD5, { bias: -0.6 })
      litRow(g, cx, y - 1, half, GOLD5)
      litRow(g, cx, y - 2, half - 1, GOLD5, { bias: 1.2 })
      y -= 3
    }
    // The bell, tiled in gold mosaic.
    const bellH = 54
    bellDome(g, cx, y, 26, bellH, GOLD5, 2.3, true)
    // A ring of glints across the bell.
    for (let i = 8; i < bellH - 6; i += 6) {
      const t = i / bellH
      const half = 26 * Math.sqrt(1 - Math.pow(t, 2.3))
      g.px(Math.round(cx - half * 0.55), y - i, '#ffffff')
    }
    glints.push({ x: cx - 12, y: y - 26 }, { x: cx - 16, y: y - 12 })
    y -= bellH
    // Harmika with little arched niches.
    g.hline(cx - 11, cx + 10, y, GOLD.D)
    for (let i = 1; i <= 8; i++) litRow(g, cx, y - i, 10, GOLD5, { bias: i === 1 || i === 8 ? -0.8 : 0 })
    for (let x = cx - 8; x < cx + 8; x += 4) {
      g.rect(x, y - 6, 2, 3, GOLD.DD)
      g.px(x, y - 7, GOLD.D)
    }
    y -= 9
    // Colonnade (เสาหาน).
    litRow(g, cx, y, 9, GOLD5, { bias: -0.8 })
    for (let i = 1; i < 9; i++) {
      for (let x = cx - 8; x < cx + 8; x++) {
        const col = (x - cx + 64) % 4 < 2
        g.px(x, y - i, col ? (x < cx ? GOLD.l : GOLD.d) : GOLD.DD)
      }
    }
    y -= 9
    litRow(g, cx, y, 9.5, GOLD5, { bias: -0.8 })
    y -= 1
    // Rings and spire.
    y = ringStack(g, cx, y, 10, 7.5, 2.2, GOLD5, 3)
    const tip = spire(g, cx, y, 30, 2.2, GOLD5)
    glints.push(tip, { x: cx - 6, y: y + 24 })
    // Front staircase with gilded rails.
    for (let i = 0; i < 10; i++) {
      const sy = H - 32 + i * 3
      g.rect(cx - 6, sy, 12, 3, i % 2 ? WHITE.b : WHITE.d)
      g.hline(cx - 6, cx + 5, sy, '#ffffff')
    }
    for (const s of [-1, 1]) {
      g.line(cx + s * 7, H - 34, cx + s * 8, H - 2, GOLD.b)
      g.line(cx + s * 8, H - 34, cx + s * 9, H - 2, GOLD.D)
    }
    // Little portico at the top of the stairs.
    g.rect(cx - 6, H - 44, 12, 11, BK.redDD)
    g.rect(cx - 4, H - 42, 8, 9, '#4a2838')
    crown(g, cx, H - 44, 14, 12)
    hooks.glints = glints
    hooks.top = [{ x: tip.x, y: tip.y }]
  })
}

// ---------------------------------------------------------------------------
// พระมณฑป – square library with a many-tiered gold roof.

export function phraMondop(): Building {
  const W = 84
  const H = 184
  return bbuild('wpk:mondop', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    squareTier(g, cx, H - 11, 10, 40, WHITE5, BK.redD)
    squareTier(g, cx, H - 21, 10, 34, GOLD5, GOLD.D)
    // Body walls: dark green glass mosaic with a gold lattice.
    const top = H - 60
    const bot = H - 21
    for (let y = top; y < bot; y++)
      for (let x = cx - 29; x < cx + 29; x++) {
        const d = (x + y) % 6
        const e = (x - y + 120) % 6
        let c = x > cx + 18 ? '#155a3a' : '#1f7a4e'
        if (d === 0 || e === 0) c = x > cx + 18 ? GOLD.D : GOLD.d
        else if (d === 3 && e === 3) c = GLASS[(x * 7 + y) % GLASS.length]
        g.px(x, y, c)
      }
    // Gold corner pilasters.
    for (const x of [cx - 30, cx - 24, cx + 21, cx + 27]) mosaicColumn(g, x, top, bot, 3, ['#62d0a0', '#fffaf0'])
    // Portico with a gold gable over the door.
    g.rect(cx - 12, top + 8, 24, bot - top - 8, '#155a3a')
    for (const x of [cx - 13, cx + 10]) mosaicColumn(g, x, top + 8, bot, 3)
    lacquerPanel(g, cx - 5, bot - 20, 10, 20, false, 2)
    crown(g, cx, bot - 21, 14, 10)
    glints.push(...gable(g, cx, top - 10, 15, top + 8, { field: '#155a3a', fieldD: '#0e3a26', sparkA: '#62d0a0', sparkB: GOLD.l, motif: 'emblem', thick: 2 }))
    // Front stairs with gold naga rails.
    for (let i = 0; i < 7; i++) {
      const sy = H - 21 + i * 3
      g.rect(cx - 7, sy, 14, 3, i % 2 ? WHITE.b : WHITE.d)
      g.hline(cx - 7, cx + 6, sy, '#ffffff')
    }
    for (const s of [-1, 1]) nagaRail(g, cx + s * 8, H - 24, cx + s * 10, H - 2, s, GOLD.d, GOLD.l)
    // Cornice.
    for (let i = 0; i < 4; i++) litRow(g, cx, top - 1 - i, 33 - i, GOLD5, { bias: i === 0 ? 1 : i === 3 ? -1 : 0 })
    g.hline(cx - 33, cx + 32, top, BK.redD)
    // Stepped roof tiers (ชั้นลด) with small gables and hooks.
    let y = top - 5
    for (let i = 0; i < 7; i++) {
      const half = 31 - i * 3.2
      const th = 7 - Math.floor(i / 3)
      for (let k = 0; k < th; k++) {
        const hh = half - k * 0.9
        for (let x = Math.round(cx - hh); x < cx + hh; x++) {
          const u = (x - cx) / hh
          let c = k < 2 ? GOLD.b : (x + k) % 3 === 0 ? '#2c7552' : '#3f9a6b'
          if (u > 0.6) c = k < 2 ? GOLD.d : '#2c7552'
          if (u < -0.8) c = k < 2 ? GOLD.l : '#62b88a'
          g.px(x, y - k, c)
        }
      }
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      // End hooks and a centre gable.
      for (const s of [-1, 1]) {
        const ex = Math.round(cx + s * half)
        g.px(ex, y - th, GOLD.b)
        g.px(ex + s, y - th - 1, GOLD.l)
        g.px(ex + s, y - th - 2, GOLD.b)
      }
      const gh = th + 3
      g.poly(
        [
          [cx - 5, y - 1],
          [cx, y - gh],
          [cx + 5, y - 1],
        ],
        GOLD.b,
      )
      g.px(cx, y - gh + 2, BK.redD)
      g.px(cx, y - gh - 1, GOLD.L)
      glints.push({ x: Math.round(cx - half) - 1, y: y - th - 1 })
      y -= th
    }
    y = ringStack(g, cx, y, 9, 8, 2, GOLD5, 3)
    const tip = spire(g, cx, y, 26, 2, GOLD5)
    glints.push(tip)
    hooks.glints = glints
  })
}

// ---------------------------------------------------------------------------
// ปราสาทพระเทพบิดร – cruciform pantheon crowned with a gilded ceramic prang.

const PANTHEON5: Ramp5 = ['#fff8d8', '#ffe89a', '#f5c96a', '#d9a044', '#b0762a']

export function prasatThepBidon(night = false): Building {
  const W = 116
  const H = 186
  return bbuild(`wpk:prasat:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    // Prang over the crossing.
    squareTier(g, cx, 100, 14, 20, PANTHEON5, GOLD.D)
    glints.push(...prangTower(g, cx, 100, 96, 18, { body: PANTHEON5, porcelain: ['#5ab8e8', '#e8514a', '#62d0a0'], leaf: GOLD.l, ledge: GOLD.D, tiers: 7, niche: BK.redDD }))
    // Side wings with long roofs.
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 6 : cx + 26
      const x1 = s < 0 ? cx - 26 : W - 7
      for (let y = 118; y < 140; y++) {
        const t = (y - 118) / 22
        const a = Math.round(x0 + (s < 0 ? 6 * (1 - t) : 0))
        const b = Math.round(x1 - (s > 0 ? 6 * (1 - t) : 0))
        g.rect(a, y, b - a, 1, (y - 118) % 3 === 2 ? ROOF.orange.fieldD : ROOF.orange.field)
        if (y > 136) g.rect(a, y, b - a, 1, y > 138 ? ROOF.orange.borderD : ROOF.orange.border)
      }
      g.hline(x0 + (s < 0 ? 6 : 0), x1 - (s > 0 ? 6 : 0), 118, GOLD.b)
      hangHong(g, s < 0 ? x0 - 1 : x1 + 1, 141, s)
      bargeBoard(g, s < 0 ? x0 + 6 : x1 - 6, 118, s < 0 ? x0 : x1, 140, 2, false)
      // Wing walls.
      g.rect(s < 0 ? x0 + 2 : cx + 26, 140, s < 0 ? cx - 28 - x0 : x1 - cx - 28, 30, WHITE.d)
      for (let x = (s < 0 ? x0 + 8 : cx + 32); x < (s < 0 ? cx - 30 : x1 - 4); x += 10) {
        crown(g, x + 2, 149, 8, 7)
        lacquerPanel(g, x, 150, 5, 12, night, 2)
      }
    }
    // Front portico gable.
    roofBand(g, cx, 102, cx - 32, 140, 9, ROOF.orange)
    roofBand(g, cx, 102, cx + 32, 140, 9, ROOF.orange)
    glints.push(...gable(g, cx, 102, 32, 140, { field: '#2f4fa8', fieldD: '#1a2c6e', sparkA: '#8fb6ff', sparkB: GOLD.l, motif: 'narai' }))
    g.rect(cx - 30, 141, 60, 30, WHITE.d)
    g.rect(cx - 30, 141, 60, 3, WHITE.DD)
    for (const x of [cx - 28, cx - 12, cx + 9, cx + 25]) mosaicColumn(g, x, 143, 171, 4, ['#5ab8e8', GOLD.l])
    lacquerPanel(g, cx - 6, 150, 12, 21, night, 2)
    crown(g, cx, 149, 18, 12)
    // Platform and stairs.
    squareTier(g, cx, 171, 12, 56, WHITE5, BK.redD)
    for (let i = 0; i < 5; i++) {
      const sy = 171 + i * 3
      g.rect(cx - 9 - i, sy, 18 + i * 2, 3, i % 2 ? WHITE.b : WHITE.d)
      g.hline(cx - 9 - i, cx + 8 + i, sy, '#ffffff')
    }
    hooks.glints = glints
    hooks.bells = [
      { x: 5, y: 145 },
      { x: W - 6, y: 145 },
      { x: cx - 33, y: 144 },
      { x: cx + 33, y: 144 },
    ]
  })
}

// ---------------------------------------------------------------------------
// Model of Angkor Wat (commissioned by King Rama IV).

export function angkorModel(): Prop {
  const W = 72
  const H = 50
  return bprop('wpk:angkor', W, H, W >> 1, H - 1, (g) => {
    const cx = W >> 1
    const S5: Ramp5 = ['#e8e2d4', '#cfc6b2', '#b3a992', '#968c78', '#746b5c']
    // Stone table.
    squareTier(g, cx, H - 9, 9, 35, STONE5)
    g.hline(cx - 34, cx + 33, H - 5, '#8c8187')
    // Galleries, three levels.
    squareTier(g, cx, H - 17, 8, 31, S5)
    for (let x = cx - 28; x < cx + 28; x += 3) g.rect(x, H - 14, 1, 3, '#746b5c')
    squareTier(g, cx, H - 23, 6, 23, S5)
    for (let x = cx - 20; x < cx + 20; x += 3) g.rect(x, H - 21, 1, 2, '#746b5c')
    squareTier(g, cx, H - 28, 5, 15, S5)
    // Lotus-bud towers (quincunx).
    const bud = (x: number, baseY: number, h: number, half: number) => {
      for (let i = 0; i < h; i++) {
        const t = i / h
        const hh = Math.max(0.6, half * Math.sin(Math.min(1, (1 - t) * 1.25) * Math.PI * 0.5) * (1 - t * 0.35))
        litRow(g, x, baseY - i, hh, S5, { bias: i % 3 === 0 ? 0.8 : 0 })
      }
      g.px(x, baseY - h - 1, S5[2])
    }
    bud(cx - 11, H - 28, 12, 3.5)
    bud(cx + 11, H - 28, 12, 3.5)
    bud(cx - 22, H - 23, 10, 3.5)
    bud(cx + 22, H - 23, 10, 3.5)
    bud(cx, H - 28, 20, 5)
    // Moss.
    for (let i = 0; i < 20; i++) g.px(cx - 28 + Math.floor(hsh(i, 3) * 56), H - 17 + Math.floor(hsh(i, 4) * 12), '#8aa870')
  })
}

// ---------------------------------------------------------------------------
// พระสุวรรณเจดีย์ – gold chedis carried by demons and monkeys.

export function suwannaChedi(flip = false): Building {
  const W = 38
  const H = 92
  return bbuild(`wpk:suwanna:${flip ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    squareTier(g, cx, H - 8, 8, 17, WHITE5, BK.redD)
    // Supporters: yaksha and monkeys crouching with raised arms.
    const figs: [number, Color, Color][] = [
      [-10, flip ? '#fffaf0' : '#3fae6a', flip ? '#d6cfc0' : '#2a7f4e'],
      [0, flip ? '#3fae6a' : '#fffaf0', flip ? '#2a7f4e' : '#d6cfc0'],
      [10, '#e0564a', '#a83a3a'],
    ]
    for (const [dx, c, cd] of figs) {
      const x = cx + dx
      const by = H - 9
      g.rect(x - 3, by - 5, 6, 5, c)
      g.rect(x - 4, by - 2, 2, 2, cd)
      g.rect(x + 2, by - 2, 2, 2, cd)
      g.rect(x - 3, by - 10, 6, 5, c)
      g.px(x + 2, by - 9, cd)
      g.ellipse(x, by - 12, 2.6, 2.4, c)
      g.px(x - 1, by - 13, P.ink)
      g.px(x + 1, by - 13, P.ink)
      g.px(x, by - 11, '#ffffff')
      g.line(x - 3, by - 9, x - 4, by - 16, c)
      g.line(x + 3, by - 9, x + 4, by - 16, cd)
      g.rect(x - 1, by - 16, 3, 1, GOLD.b)
    }
    // Ledge they carry.
    for (let i = 0; i < 3; i++) litRow(g, cx, H - 26 + i, 16 - i, GOLD5, { bias: i === 0 ? -0.7 : 0.4 })
    // Redented gold tiers and bell.
    squareTier(g, cx, H - 34, 7, 12, GOLD5, GOLD.D)
    squareTier(g, cx, H - 39, 5, 10, GOLD5, GOLD.D)
    let y = H - 40
    for (let i = 0; i < 3; i++) litRow(g, cx, y - i, 9 - i * 0.5, GOLD5, { bias: i === 1 ? 1 : 0 })
    y -= 3
    bellDome(g, cx, y, 9, 15, GOLD5, 1.7, true)
    y -= 15
    y = ringStack(g, cx, y, 7, 4, 1.5, GOLD5, 3)
    const tip = spire(g, cx, y, 14, 1.4, GOLD5)
    hooks.glints = [tip, { x: cx - 4, y: H - 48 }]
  })
}

// ---------------------------------------------------------------------------
// The ubosot of the Emerald Buddha: gilded walls, glass-mosaic pillars,
// three roof tiers and a frieze of garudas holding nagas.

export function wpkUbosot(night = false): Building {
  return grandHall({
    key: 'wpk',
    hw: 58,
    roof: ROOF.orange,
    roof2: ROOF.orange,
    field: '#2f4fa8',
    fieldD: '#1a2c6e',
    field2: '#2f4fa8',
    field2D: '#1a2c6e',
    wall: '#f3cf6e',
    wallD: '#c8923a',
    cols: 'mosaic',
    frieze: 'garuda',
    doors: 3,
    tiers: 3,
    stairs: 'naga',
    night,
  })
}

// ---------------------------------------------------------------------------
// หอระฆัง – bell tower clad in coloured glass with a prasat roof.

export function wpkBellTower(): Building {
  const W = 50
  const H = 110
  return bbuild('wpk:belltower', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    squareTier(g, cx, H - 10, 10, 22, WHITE5, BK.redD)
    // Lower body in porcelain.
    const b0 = H - 42
    for (let y = b0; y < H - 10; y++)
      for (let x = cx - 16; x < cx + 16; x++) {
        let c = x > cx + 9 ? WHITE.D : WHITE.b
        if ((x + y) % 5 === 0 && (x - y + 60) % 5 === 0) c = GLASS[(x + y) % GLASS.length]
        g.px(x, y, c)
      }
    for (const x of [cx - 17, cx + 14]) mosaicColumn(g, x, b0, H - 10, 3)
    g.rect(cx - 5, H - 30, 10, 20, GOLD.d)
    g.rect(cx - 4, H - 29, 8, 19, '#4a3048')
    crown(g, cx, H - 30, 12, 9)
    for (let i = 0; i < 3; i++) litRow(g, cx, b0 - 1 - i, 19 - i, GOLD5, { bias: i === 0 ? 1 : -0.5 })
    // Open belfry.
    const bT = b0 - 24
    g.rect(cx - 15, bT, 30, 21, '#4a3048')
    for (const x of [cx - 16, cx - 7, cx + 4, cx + 13]) mosaicColumn(g, x, bT, b0 - 3, 3)
    g.rect(cx - 16, bT + 2, 32, 2, BK.redD)
    g.hline(cx - 16, cx + 15, bT + 2, GOLD.l)
    hooks.bell = [{ x: cx, y: bT + 5 }]
    // Prasat roof: stepped tiers and spire.
    let y = bT
    for (let i = 0; i < 5; i++) {
      const half = 19 - i * 3
      for (let k = 0; k < 5; k++) litRow(g, cx, y - k, half - k * 0.6, k < 2 ? GOLD5 : (['#8fe0b8', '#62b88a', '#3f9a6b', '#2c7552', '#1e4a3a'] as Ramp5))
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      for (const s of [-1, 1]) {
        g.px(Math.round(cx + s * half), y - 5, GOLD.b)
        g.px(Math.round(cx + s * (half + 1)), y - 6, GOLD.l)
      }
      y -= 5
    }
    y = ringStack(g, cx, y, 6, 5, 1.5, GOLD5, 3)
    const tip = spire(g, cx, y, 14, 1.5, GOLD5)
    hooks.glints = [tip, { x: cx - 19, y: bT - 6 }, { x: cx + 19, y: bT - 6 }]
    hooks.bells = [
      { x: cx - 20, y: bT + 1 },
      { x: cx + 20, y: bT + 1 },
    ]
  })
}

// ---------------------------------------------------------------------------
// Hermit doctor (ฤๅษีชีวกโกมารภัจจ์) – people pray here for good health.

export function hermitDoctor(): Prop {
  return bprop('wpk:hermitdoc', 30, 40, 15, 39, (g) => {
    const cx = 15
    squareTier(g, cx, 32, 7, 13, WHITE5, BK.redD)
    // Offering table with garlands.
    g.rect(4, 30, 22, 2, GOLD.d)
    for (let x = 5; x < 25; x += 3) g.px(x, 29, x % 2 ? '#f58f35' : '#fffaf0')
    // Dark bronze seated hermit.
    const B = '#4a3a3a'
    const Bl = '#6e5a58'
    g.ellipse(cx, 27, 8, 3, B)
    g.rect(cx - 5, 15, 10, 12, B)
    g.rect(cx - 5, 15, 3, 12, Bl)
    g.rect(cx - 5, 21, 10, 4, '#7a5a3a')
    for (let x = cx - 4; x < cx + 5; x += 2) g.px(x, 22, '#e0b060')
    g.ellipse(cx + 1, 20, 3, 2, Bl)
    g.ellipse(cx, 11, 4, 4, B)
    g.px(cx - 2, 10, Bl)
    g.rect(cx - 2, 13, 5, 4, '#d8d0c8') // beard
    for (let i = 0; i < 7; i++) g.rect(cx - 3 + (i >> 1), 7 - i, Math.max(1, 7 - i), 1, i % 2 ? '#7a5a3a' : B)
    // Garlands draped on him.
    for (let x = cx - 4; x <= cx + 4; x++) g.px(x, 17 + Math.round(Math.abs(x - cx) * 0.4), x % 2 ? '#f58f35' : '#ffd23f')
    g.px(cx + 5, 26, '#ff9fc0')
  })
}

/** Holy-water bowl with lotus buds (people dip a lotus and sprinkle their heads). */
export function lotusBasin(): Prop {
  return bprop('wpk:lotusbasin', 34, 26, 17, 25, (g) => {
    const cx = 17
    g.rect(cx - 5, 17, 10, 8, WHITE.b)
    g.rect(cx + 2, 17, 3, 8, WHITE.D)
    g.rect(cx - 7, 22, 14, 3, WHITE.d)
    g.ellipse(cx, 13, 15, 6, GOLD.d)
    g.ellipse(cx, 12, 15, 5, GOLD.b)
    g.ellipse(cx, 11.5, 13, 4, '#5ab8d4')
    g.ellipse(cx - 3, 11, 6, 2, '#8fd8ea')
    g.hline(cx - 13, cx - 4, 16, GOLD.l)
    // Floating lotus and petals.
    for (const [x, y, c] of [
      [cx - 7, 11, '#ff9fc0'],
      [cx + 5, 12, '#fffaf0'],
      [cx + 1, 10, '#ff9fc0'],
    ] as [number, number, Color][]) {
      g.px(x, y, c)
      g.px(x + 1, y, c)
      g.px(x, y - 1, mix(c, '#ffffff', 0.4))
    }
    // Lotus buds in a stand beside it.
    for (let i = 0; i < 4; i++) {
      const x = cx + 9 + i * 2
      g.vline(x, 3 + (i % 2), 9, '#43905a')
      g.rect(x - 1 + (i % 2), 1 + (i % 2), 2, 3, '#ff9fc0')
    }
  })
}

// ---------------------------------------------------------------------------
// Ramakien mural gallery (พระระเบียง) seen from the courtyard.

const MURAL_SKY = ['#f4e6c4', '#e8d8b0']

/** Paint a stretch of Ramakien mural into x..x+w, y..y+h. */
export function muralPanel(g: Surface, x: number, y: number, w: number, h: number, seed: number) {
  // Background: warm paper sky, blue-green hills and ochre ground.
  g.gradientV(x, y, w, h, [MURAL_SKY[0], MURAL_SKY[1], '#b8cc9a', '#8fb07a'], 3)
  for (let i = 0; i < w; i += 1) {
    const hy = y + Math.round(h * 0.45 + Math.sin((x + i) * 0.13 + seed) * 3 + Math.sin((x + i) * 0.05) * 2)
    g.vline(x + i, hy, y + Math.round(h * 0.62), '#6f9a7a')
  }
  g.rect(x, y + Math.round(h * 0.62), w, Math.ceil(h * 0.38), '#c9b27a')
  for (let i = 0; i < w; i += 3) g.px(x + i, y + Math.round(h * 0.62) + ((i * 7) % 4), '#b09a62')
  // A palace with gold spires in some panels.
  const r = (k: number) => hsh(seed, k, 21)
  if (r(0) < 0.55) {
    const px = x + 4 + Math.floor(r(1) * (w - 22))
    const py = y + Math.round(h * 0.62)
    g.rect(px, py - 9, 16, 9, '#fffaf0')
    g.rect(px + 2, py - 6, 3, 6, BK.redDD)
    g.rect(px + 10, py - 6, 3, 6, BK.redDD)
    for (let i = 0; i < 8; i++) g.rect(px + 8 - (7 - i), py - 10 - i, (7 - i) * 2 + 1 - 0, 1, i % 2 ? GOLD.d : BK.red)
    g.vline(px + 8, py - 22, py - 17, GOLD.b)
    g.px(px + 8, py - 23, GOLD.L)
  } else {
    // Trees.
    for (let t = 0; t < 3; t++) {
      const tx = x + 4 + Math.floor(r(2 + t) * (w - 8))
      const ty = y + Math.round(h * 0.55) + Math.floor(r(5 + t) * 4)
      g.vline(tx, ty - 2, ty + 4, '#6e4a35')
      g.circle(tx, ty - 4, 3, '#3f7a52')
      g.px(tx - 1, ty - 5, '#6fa870')
    }
  }
  // Rows of little figures: monkey army vs. demon army.
  const fy = y + h - 6
  const n = Math.floor(w / 5)
  for (let i = 0; i < n; i++) {
    const fx = x + 2 + i * 5 + Math.floor(r(10 + i) * 2)
    const army = r(40 + i) < 0.5
    const body = army ? (['#fffaf0', '#e8514a', '#3fae6a', '#f5b83a'] as Color[])[i % 4] : (['#3fae6a', '#3d63b5', '#9270dc', '#e0564a'] as Color[])[i % 4]
    g.rect(fx, fy - 4, 2, 3, body)
    g.px(fx, fy - 5, army ? body : GOLD.b)
    g.px(fx + 1, fy - 5, body)
    g.px(fx, fy - 1, '#5a3d4f')
    g.px(fx + 1, fy - 1, '#5a3d4f')
    if (i % 3 === 0) g.vline(fx + 2, fy - 8, fy - 2, GOLD.D) // spear
    if (!army && i % 4 === 1) g.px(fx, fy - 6, GOLD.b)
  }
  // Hero figure: white Hanuman or green Thotsakan larger.
  if (r(60) < 0.6) {
    const hx = x + 6 + Math.floor(r(61) * (w - 14))
    const hy = y + Math.round(h * 0.62) - 1
    const white = r(62) < 0.5
    const c = white ? '#ffffff' : '#3fae6a'
    g.rect(hx, hy - 7, 4, 6, c)
    g.ellipse(hx + 2, hy - 9, 2, 2, c)
    g.px(hx + 2, hy - 12, GOLD.b)
    g.px(hx + 2, hy - 11, GOLD.b)
    g.rect(hx - 1, hy - 1, 2, 2, c)
    g.rect(hx + 3, hy - 1, 2, 2, c)
    g.line(hx + 4, hy - 6, hx + 8, hy - 10, c)
    g.vline(hx + 8, hy - 14, hy - 8, GOLD.b)
  }
  // Gold highlights (gilded details).
  for (let k = 0; k < w / 6; k++) g.px(x + Math.floor(r(80 + k) * w), y + Math.floor(r(120 + k) * h * 0.6), GOLD.b)
}

/**
 * North gallery: roof, mural wall and floor (baked). The front posts are
 * separate props (galleryPost) so people walking inside sort correctly.
 * The walkable floor is baseY-16 … baseY.
 */
export function galleryBack(g: Surface, x0: number, x1: number, baseY: number, seed = 0) {
  const w = x1 - x0
  const floorY = baseY - 16
  const eave = baseY - 46
  // Floor (worn marble).
  g.rect(x0, floorY, w, 16, '#efe6d6')
  for (let y = floorY; y < baseY; y += 5) g.hline(x0, x1 - 1, y, '#dccdb6')
  for (let x = x0; x < x1; x += 9) g.vline(x, floorY, baseY - 1, '#dccdb6')
  g.hline(x0, x1 - 1, baseY - 1, '#c9b69a')
  // Dado and verse placards.
  g.rect(x0, floorY - 6, w, 6, BK.redDD)
  g.hline(x0, x1 - 1, floorY - 6, GOLD.d)
  g.hline(x0, x1 - 1, floorY - 1, GOLD.D)
  // Mural wall in panels.
  let x = x0
  let k = 0
  while (x < x1) {
    const pw = Math.min(x1 - x, 44 + Math.floor(hsh(k, seed) * 20))
    muralPanel(g, x, eave, pw, floorY - 6 - eave, seed * 31 + k)
    // Placard below.
    g.rect(x + pw / 2 - 6, floorY - 5, 12, 4, '#241a2b')
    for (let i = 0; i < 3; i++) g.hline(x + pw / 2 - 5, x + pw / 2 - 5 + 6 + (i % 2) * 3, floorY - 4 + (i === 2 ? 1 : 0), GOLD.d)
    g.vline(x + pw - 1, eave, floorY - 7, GOLD.D)
    x += pw
    k++
  }
  // Shadow under the eave.
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(58,40,56,0.25)'
  g.ctx.fillRect(x0 - g.ox, eave - g.oy, w, 4)
  g.ctx.restore()
  // Roof: long tiled strip with a gold ridge.
  const ridge = baseY - 70
  for (let y = ridge; y < eave; y++) {
    const e = eave - y
    let c: Color = ROOF.orange.field
    if (e <= 2) c = e === 1 ? ROOF.orange.borderD : ROOF.orange.border
    else if ((y - ridge) % 3 === 2) c = ROOF.orange.fieldD
    g.rect(x0, y, w, 1, c)
    if (e > 2 && (y - ridge) % 3 === 1) for (let xx = x0 + ((y >> 1) % 4); xx < x1; xx += 4) g.px(xx, y, ROOF.orange.fieldL)
  }
  // Upper roof tier (stepped).
  for (let y = ridge; y < ridge + 7; y++) g.rect(x0, y, w, 1, y < ridge + 2 ? ROOF.green.field : y === ridge + 6 ? ROOF.orange.borderD : ROOF.green.fieldD)
  g.hline(x0, x1 - 1, ridge - 1, GOLD.b)
  g.hline(x0, x1 - 1, ridge - 2, GOLD.d)
  for (let xx = x0 + 8; xx < x1; xx += 16) {
    g.px(xx, ridge - 3, GOLD.b)
    g.px(xx, ridge - 4, GOLD.l)
  }
  // Eave bargeboard with little gold tips.
  g.hline(x0, x1 - 1, eave, GOLD.d)
  for (let xx = x0 + 4; xx < x1; xx += 8) g.px(xx, eave + 1, GOLD.b)
}

/** White gallery post with a gilded lotus capital. */
export function galleryPost(): Prop {
  return bprop('wpk:gpost', 6, 46, 3, 45, (g) => {
    g.rect(1, 3, 4, 41, WHITE.b)
    g.vline(1, 3, 43, '#ffffff')
    g.vline(4, 3, 43, WHITE.D)
    g.rect(0, 1, 6, 2, GOLD.b)
    g.hline(0, 5, 1, GOLD.L)
    g.rect(1, 3, 4, 1, BK.redD)
    g.rect(0, 42, 6, 3, GOLD.d)
    g.hline(0, 5, 42, GOLD.l)
    g.rect(0, 0, 6, 1, GOLD.D)
  })
}

/** Gallery seen from outside: white wall with small windows under a long roof. */
export function galleryOuter(len: number): Prop {
  const H = 52
  return bprop(`wpk:gouter:${len}`, len, H, 0, H - 1, (g) => {
    const eave = 22
    g.rect(0, eave, len, H - eave, WHITE.b)
    g.hline(0, len - 1, eave + 1, WHITE.DD)
    g.hline(0, len - 1, eave + 2, WHITE.D)
    g.rect(0, H - 5, len, 4, WHITE.d)
    g.hline(0, len - 1, H - 5, '#ffffff')
    g.hline(0, len - 1, H - 1, WHITE.DD)
    for (let x = 8; x < len - 6; x += 18) {
      g.rect(x, eave + 9, 6, 11, GOLD.d)
      g.rect(x + 1, eave + 10, 4, 10, BK.redDD)
      g.vline(x + 3, eave + 10, eave + 19, '#4a1a28')
      g.px(x + 2, eave + 8, GOLD.b)
      g.px(x + 3, eave + 7, GOLD.l)
    }
    for (let y = 2; y < eave; y++) {
      const e = eave - y
      let c: Color = ROOF.orange.field
      if (e <= 2) c = e === 1 ? ROOF.orange.borderD : ROOF.orange.border
      else if (y % 3 === 2) c = ROOF.orange.fieldD
      g.rect(0, y, len, 1, c)
      if (e > 2 && y % 3 === 1) for (let x = (y >> 1) % 4; x < len; x += 4) g.px(x, y, ROOF.orange.fieldL)
    }
    g.hline(0, len - 1, 1, GOLD.b)
    g.hline(0, len - 1, 0, GOLD.d)
    g.hline(0, len - 1, eave, GOLD.d)
  })
}

/** Side gallery roof strip running north–south (seen from above), baked. */
export function galleryRoofV(g: Surface, x: number, y0: number, y1: number, w: number, innerRight: boolean) {
  for (let i = 0; i < w; i++) {
    const e = innerRight ? w - 1 - i : i
    let c: Color = ROOF.orange.field
    if (e <= 2) c = e === 1 ? ROOF.orange.borderD : e === 0 ? ROOF.orange.borderD : ROOF.orange.border
    else if (i % 3 === 2) c = ROOF.orange.fieldD
    g.rect(x + i, y0, 1, y1 - y0, c)
  }
  for (let y = y0; y < y1; y += 4) for (let i = 1; i < w - 3; i += 3) g.px(x + (innerRight ? i : w - 1 - i), y + (i % 2), ROOF.orange.fieldL)
  const ridge = innerRight ? x + 3 : x + w - 4
  g.vline(ridge, y0, y1 - 1, GOLD.b)
  g.vline(ridge + 1, y0, y1 - 1, GOLD.d)
  blobShadow(g, innerRight ? x + w + 2 : x - 2, (y0 + y1) / 2, 3, (y1 - y0) / 2, 0.14)
}

/** Gallery gate (ซุ้มประตู) with a tall crown spire; the opening is x 20..44. */
export function galleryGate(): Building {
  const W = 66
  const H = 126
  return bbuild('wpk:ggate', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const open0 = cx - 12
    const open1 = cx + 12
    const archTop = H - 44
    // Piers.
    for (const [a, b] of [
      [0, open0],
      [open1, W],
    ]) {
      for (let y = archTop - 6; y < H; y++)
        for (let x = a; x < b; x++) {
          const u = (x - a) / (b - a)
          g.px(x, y, u < 0.15 ? '#ffffff' : u > 0.8 ? WHITE.D : WHITE.b)
        }
      g.rect(a + 5, archTop + 6, b - a - 10, 26, BK.redD)
      for (let y = archTop + 9; y < archTop + 30; y += 4) g.px(a + (b - a) / 2, y, GOLD.b)
      g.rect(a, H - 5, b - a, 4, WHITE.d)
      g.hline(a, b - 1, H - 5, '#ffffff')
    }
    // Arch.
    for (let x = open0; x < open1; x++) {
      const t = (x - open0) / (open1 - open0 - 1)
      const ay = archTop + Math.round(Math.pow(Math.abs(t - 0.5) * 2, 2) * 6) - 2
      g.vline(x, archTop - 8, ay, WHITE.b)
      g.px(x, ay, GOLD.b)
      g.px(x, ay + 1, GOLD.D)
    }
    // Lintel with porcelain.
    for (let y = archTop - 14; y < archTop - 6; y++) litRow(g, cx, y, 33, WHITE5)
    for (let x = 3; x < W - 3; x += 4) {
      g.px(x, archTop - 11, GLASS[(x >> 2) % GLASS.length])
      g.px(x + 1, archTop - 10, GOLD.b)
    }
    g.hline(0, W - 1, archTop - 14, GOLD.b)
    // Stepped crown spire (ยอดมงกุฎ).
    let y = archTop - 14
    for (let i = 0; i < 6; i++) {
      const half = 26 - i * 3.6
      for (let k = 0; k < 6; k++) {
        const hh = half - k * 0.5
        for (let x = Math.round(cx - hh); x < cx + hh; x++) {
          const u = (x - cx) / hh
          let c: Color = k < 2 ? GOLD.b : u > 0.55 ? WHITE.D : WHITE.b
          if (k >= 2 && (x + y + k) % 4 === 0) c = GLASS[(x + i) % GLASS.length]
          if (k < 2 && u > 0.6) c = GOLD.d
          g.px(x, y - k, c)
        }
      }
      for (const s of [-1, 1]) {
        g.px(Math.round(cx + s * half), y - 6, GOLD.b)
        g.px(Math.round(cx + s * (half + 1)), y - 7, GOLD.l)
      }
      y -= 6
    }
    y = ringStack(g, cx, y, 6, 5, 1.6, GOLD5, 3)
    const tip = spire(g, cx, y, 16, 1.6, GOLD5)
    hooks.glints = [tip, { x: cx - 26, y: archTop - 20 }, { x: cx + 25, y: archTop - 20 }]
  })
}

/** Distant Grand Palace spires and the Chakri Maha Prasat over the wall (baked). */
export function palaceSkyline(g: Surface, baseY: number, w: number, night: boolean) {
  const far = night ? '#7a80b0' : '#c9d6e8'
  const farD = night ? '#646a9c' : '#aebfd8'
  const gold = night ? '#c9b070' : '#f0d890'
  const spireAt = (x: number, h: number, half: number) => {
    for (let i = 0; i < h; i++) {
      const t = i / h
      const hw = Math.max(0.5, half * (1 - t) * (i % 4 === 0 ? 1.15 : 1))
      g.rect(Math.round(x - hw), baseY - i, Math.max(1, Math.round(hw * 2)), 1, i < h * 0.3 ? far : gold)
    }
  }
  // Chakri Maha Prasat: European body, three Thai spires.
  const cx = Math.round(w * 0.72)
  g.rect(cx - 34, baseY - 16, 68, 16, far)
  for (let x = cx - 32; x < cx + 32; x += 5) g.rect(x, baseY - 12, 2, 5, farD)
  for (const [dx, h] of [
    [-26, 36],
    [0, 52],
    [26, 36],
  ])
    spireAt(cx + dx, h + 16, 7)
  // Dusit Maha Prasat spire and other roofs.
  spireAt(Math.round(w * 0.28), 60, 8)
  g.rect(Math.round(w * 0.28) - 16, baseY - 10, 32, 10, far)
  spireAt(Math.round(w * 0.45), 34, 5)
}
