// คำชะโนด, Udon Thani – the sacred island forest of the naga: chanod fan
// palms, strange naga-root trees tied with ribbons, the naga well, the
// shrine of Pu Si Suttho and Ya Si Pathumma, the long naga bridge over the
// wetland and the marigold & bai sri offering stalls.

import type { Color } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, slice, bargeBoard, roofBand, hangHong, gable, type RoofRamp } from '../temple'
import { bld, block, GOLDR, hsh, WHITER, NAGA_GREEN, NAGA_GOLD, nagaHeadsSprite, stallProp, type Built, type NagaPal, type Pt } from './northisan'

const ISAN_ROOF: RoofRamp = { field: '#e8b83a', fieldD: '#c9902a', fieldL: '#ffe07a', border: '#e8514a', borderD: '#b8343f', under: '#7a4a1a' }

// ---------------------------------------------------------------------------
// Forest.

/** ต้นชะโนด – a tall fan palm. */
export function chanodPalmSprite(v = 0): Built {
  const W = 64
  const H = 88 + (v % 3) * 8
  return bld(`kc:palm:${v}`, W, H, W / 2, H - 1, (g) => {
    const cx = W / 2 + ((v % 2) ? 2 : -2)
    // Trunk with old leaf-base rings, slightly curved.
    for (let y = 22; y < H; y++) {
      const t = (y - 22) / (H - 22)
      const x = Math.round(cx + Math.sin(t * 2 + v) * 2)
      const half = 2.2 + t * 0.8
      g.hline(Math.round(x - half), Math.round(x + half), y, (y + v) % 5 === 0 ? '#5e4c40' : '#7e6450')
      g.px(Math.round(x - half), y, '#9a8068')
      if ((y + v) % 7 === 0) g.px(Math.round(x + half), y, '#4a3a30')
    }
    // Moss on the trunk.
    for (let i = 0; i < 12; i++) {
      const y = H - 6 - ((i * 13 + v * 5) % (H - 30))
      g.px(Math.round(cx + Math.sin(y) * 2), y, '#6fa050')
    }
    // Crown of fan leaves radiating from the top (a darker back layer first).
    const top = 24
    const fan = (a: number, len: number, cols: [Color, Color, Color]) => {
      const ex = cx + Math.cos(a) * len
      const ey = top + Math.sin(a) * len * 0.72 + 2
      g.line(cx, top + 2, ex * 0.35 + cx * 0.65, ey * 0.35 + (top + 2) * 0.65, '#5e8a40')
      for (let k = -4; k <= 4; k++) {
        const aa = a + k * 0.075
        const l = len - Math.abs(k) * 1.1
        g.line(cx + Math.cos(aa) * len * 0.3, top + 2 + Math.sin(aa) * len * 0.22, cx + Math.cos(aa) * l, top + 2 + Math.sin(aa) * l * 0.72, k < -1 ? cols[0] : k < 2 ? cols[1] : cols[2])
      }
      g.px(Math.round(ex), Math.round(ey), '#b4e486')
    }
    for (let i = 0; i < 9; i++) fan(Math.PI * 0.95 + (i / 8) * Math.PI * 1.1, 20 + (hsh(i, v, 7) % 5), ['#2f6f4b', '#3f8a4f', '#244f3e'])
    for (let i = 0; i < 12; i++) fan(Math.PI * 0.85 + (i / 11) * Math.PI * 1.3 + (hsh(i, v) % 20) / 100, 22 + (hsh(i, v, 2) % 7), ['#5eae55', '#86c95f', '#3f8a4f'])
    // Drooping skirt of old fans.
    for (const s2 of [-1, 1]) for (let k = 0; k < 6; k++) g.line(cx, top + 4, cx + s2 * (14 + k * 1.5), top + 16 + k * 2, k % 2 ? '#7a8a50' : '#9a9a5a')
    g.circle(cx, top + 2, 3, '#4a7a3a')
  })
}

/** Strange tree whose roots coil like nagas, tied with seven-colour ribbons. */
export function nagaRootTreeSprite(): Built {
  const W = 76
  const H = 84
  return bld('kc:nagatree', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const bark = { L: '#a89880', b: '#7e6a58', d: '#5e4c40', D: '#443830' }
    // Roots snaking over the ground, ending in little naga heads.
    const roots: [number, number, number][] = [
      [-1, 30, 0.4],
      [1, 32, -0.3],
      [-1, 22, -0.6],
      [1, 20, 0.7],
    ]
    roots.forEach(([s, len, ph], i) => {
      let px = cx
      let py = H - 8
      for (let k = 0; k < len; k++) {
        const x = cx + s * k
        const y = H - 8 + Math.sin(k * 0.35 + ph) * 3 + (i > 1 ? -3 : 0)
        g.circle(x, y, 2.2, bark.d)
        g.circle(x - 0.4, y - 0.5, 1.6, bark.b)
        if (k % 3 === 0) g.px(Math.round(x), Math.round(y) - 1, '#6fa050')
        px = x
        py = y
      }
      // Head.
      g.ellipse(px + s * 2, py - 1, 3, 2.2, bark.b)
      g.px(Math.round(px + s * 3), Math.round(py - 2), '#ffd23f')
      g.px(Math.round(px + s * 1), Math.round(py - 4), GOLD.b)
    })
    // Twisted trunk.
    for (let y = 26; y < H - 6; y++) {
      const t = (y - 26) / (H - 32)
      const x = cx + Math.sin(t * 5) * 3
      const half = 5 + t * 3
      slice(g, x, y, half, bark, 0.3)
      if (y % 4 === 0) g.px(Math.round(x + Math.sin(y) * half * 0.6), y, bark.D)
    }
    // Ribbons of seven colours round the trunk.
    const cols = ['#e8514a', '#f58f35', '#ffd23f', '#6cc36a', '#5a8de0', '#3a3a78', '#b394f0']
    for (let k = 0; k < 7; k++) {
      const y = H - 30 + k * 2
      const x = cx + Math.sin(((y - 26) / (H - 32)) * 5) * 3
      g.hline(Math.round(x - 8), Math.round(x + 7), y, cols[k])
    }
    g.line(cx + 6, H - 30, cx + 10, H - 22, cols[0])
    g.line(cx + 7, H - 29, cx + 12, H - 23, cols[2])
    // Heavy dark canopy with hanging moss.
    const leaf = { L: '#86c080', b: '#4f8a52', d: '#35683f', D: '#244a30' }
    for (const [x, y, r] of [
      [14, 18, 12],
      [34, 10, 14],
      [56, 14, 13],
      [26, 26, 10],
      [48, 26, 10],
    ] as const) {
      g.circle(x, y + 1, r, leaf.D)
      g.circle(x, y, r, leaf.d)
      g.circle(x - 2, y - 2, r * 0.75, leaf.b)
      g.circle(x - 4, y - 4, r * 0.3, leaf.L)
    }
    for (let i = 0; i < 9; i++) {
      const x = 8 + i * 7
      const len = 6 + (hsh(i, 3) % 8)
      g.vline(x, 26 + (i % 3) * 2, 26 + len + (i % 3) * 2, '#8ab870')
    }
    hooks.glints = [{ x: cx, y: H - 28 }]
  })
}

/** The naga well (บ่อน้ำศักดิ์สิทธิ์): a round well with a naga coiled on its rim. */
export function nagaWellSprite(): Built {
  const W = 46
  const H = 44
  return bld('kc:well', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    g.ellipse(cx, H - 12, 20, 9, '#8c8187')
    g.ellipse(cx, H - 13, 20, 9, '#d8d0c8')
    g.ellipse(cx, H - 14, 16, 6, '#3a6a8a')
    g.ellipse(cx, H - 13, 14, 4.5, '#4a8ab0')
    g.hline(cx - 6, cx - 1, H - 15, '#9fe0ff')
    g.rect(cx - 20, H - 13, 40, 8, '#d8d0c8')
    g.hline(cx - 20, cx + 19, H - 6, '#a89e98')
    for (let x = cx - 18; x < cx + 18; x += 5) g.vline(x, H - 12, H - 7, '#c0b6b0')
    // Naga coiled round the rim, head rising at the back.
    const p = NAGA_GREEN
    for (let a = 0.2; a < Math.PI * 1.8; a += 0.08) {
      const x = cx + Math.cos(a) * 19
      const y = H - 13 + Math.sin(a) * 8 - 2
      g.circle(x, y, 2, p.d)
      g.px(Math.round(x), Math.round(y) - 1, p.b)
      if (Math.round(a * 12) % 4 === 0) g.px(Math.round(x), Math.round(y) - 3, p.crest)
    }
    const hx = cx + Math.cos(0.2) * 19
    for (let k = 0; k < 16; k++) g.circle(hx - k * 0.2, H - 15 - k, 2.4, p.b)
    g.ellipse(hx - 3, H - 32, 4, 3, p.b)
    g.px(hx - 5, H - 33, P.ink)
    g.hline(Math.round(hx - 6), Math.round(hx - 2), H - 36, p.crest)
    g.px(hx - 4, H - 38, p.crestL)
    // Ladle and a bowl of flowers.
    g.line(cx - 12, H - 16, cx - 18, H - 30, '#c9a04c')
    g.ellipse(cx - 18, H - 31, 3, 1.5, '#c9a04c')
    hooks.glints = [{ x: cx - 4, y: H - 15 }, { x: Math.round(hx - 4), y: H - 38 }]
  })
}

/** Big coiled naga statue (the island's guardian), gold and green. */
export function nagaStatueSprite(): Built {
  const W = 64
  const H = 86
  return bld('kc:nagastatue', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    block(g, 6, H - 8, W - 12, 8, 2, WHITER)
    g.hline(7, W - 8, H - 4, GOLD.d)
    // Coils.
    const p = NAGA_GOLD
    for (let i = 0; i < 3; i++) {
      const y = H - 12 - i * 7
      g.ellipse(cx + 2, y, 22 - i * 4, 5, p.D)
      g.ellipse(cx + 1, y - 1, 21 - i * 4, 4.4, p.d)
      g.ellipse(cx, y - 2, 18 - i * 4, 3, p.b)
      for (let k = -3; k <= 3; k++) g.px(cx + k * (5 - i), y - 3, p.L)
    }
    // Seven-headed hood on top.
    const hood = nagaHeadsSprite(NAGA_GOLD, 7, false, 'kcstatue')
    g.draw(hood.canvas, Math.round(cx - hood.ax), H - 30 - hood.ay + 8)
    hooks.glints = hood.hooks.glints?.map((h) => ({ x: cx + h.x, y: H - 30 + 8 + h.y })) ?? []
  })
}

// ---------------------------------------------------------------------------
// The shrine of Pu Si Suttho & Ya Si Pathumma.

export function nagaShrineSprite(night = false): Built {
  const W = 132
  const H = 118
  return bld(`kc:shrine:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    const floor = H - 10
    block(g, 6, floor, W - 12, 10, 3, WHITER)
    g.hline(7, W - 8, floor + 5, GOLD.d)
    // Walls.
    const wt = floor - 32
    g.rect(16, wt, W - 32, 32, '#fffaf0')
    g.rect(W - 28, wt, 12, 32, '#ece0cc')
    g.rect(16, floor - 6, W - 32, 6, '#3f9a6b')
    for (let x = 18; x < W - 18; x += 4) g.px(x, floor - 4, GOLD.b)
    for (const wx of [24, W - 34]) {
      g.rect(wx - 1, wt + 6, 12, 16, GOLD.d)
      g.rect(wx, wt + 7, 10, 14, night ? '#ffd98a' : '#3f9a6b')
      if (!night) for (let k = 0; k < 3; k++) g.px(wx + 2 + k * 3, wt + 10 + k * 3, GOLD.b)
    }
    // Door.
    const dw = 22
    g.rect(cx - dw / 2 - 2, wt + 2, dw + 4, 30, GOLD.d)
    g.rect(cx - dw / 2, wt + 4, dw, 28, night ? '#ffcf7a' : '#2c6a45')
    if (!night) {
      g.vline(cx, wt + 4, floor, '#1e4a3a')
      for (let y = wt + 7; y < floor - 2; y += 4) for (let x = cx - dw / 2 + 2; x < cx + dw / 2 - 1; x += 3) if (((x + y) >> 1) % 2) g.px(x, y, GOLD.b)
    }
    // Pillars.
    for (const px of [18, 32, W - 36, W - 22]) {
      g.rect(px, wt - 4, 4, 36, '#fffaf0')
      g.vline(px + 3, wt - 4, floor, '#dccab0')
      g.rect(px - 1, wt - 4, 6, 2, GOLD.b)
    }
    // Lao/Isan roof: steep with a gold field and red border, and a tall gold spire.
    const r1 = wt - 2
    for (const s of [-1, 1]) {
      roofBand(g, cx + s * 30, r1 - 20, cx + s * 64, r1 + 4, 12, ISAN_ROOF, 3)
      bargeBoard(g, cx + s * 30, r1 - 20, cx + s * 64, r1 + 4, 2)
      hangHong(g, cx + s * 65, r1 + 5, s)
    }
    roofBand(g, cx, r1 - 52, cx - 44, r1 + 2, 10, ISAN_ROOF, 3)
    roofBand(g, cx, r1 - 52, cx + 44, r1 + 2, 10, ISAN_ROOF, 3)
    glints.push(...gable(g, cx, r1 - 50, 38, r1, { field: '#3f9a6b', fieldD: '#1e4a3a', sparkA: GOLD.l, sparkB: '#9fe8ff', motif: 'emblem', thick: 3 }))
    // Naga heads rearing from the eave corners.
    for (const s of [-1, 1]) {
      const nx = cx + s * 66
      g.rect(nx - 2, r1 - 2, 4, 6, NAGA_GREEN.b)
      g.px(nx + s * 2, r1 - 1, P.ink)
      g.px(nx, r1 - 4, GOLD.b)
      g.px(nx + s, r1 - 5, GOLD.L)
    }
    // Front stairs with naga balustrades.
    for (let i = 0; i < 4; i++) g.rect(cx - 14 + i, floor + 2 + i * 2, 28 - i * 2, 2, i % 2 ? '#ece0cc' : '#fffaf0')
    for (const s of [-1, 1]) {
      const nx = cx + s * 18
      for (let k = 0; k < 10; k++) g.rect(nx - 2, floor - 2 + k, 4, 1, k % 2 ? NAGA_GREEN.b : NAGA_GREEN.d)
      g.rect(nx - 3, floor - 7, 6, 5, NAGA_GREEN.b)
      g.px(nx + s * 2, floor - 6, P.ink)
      for (let k = 0; k < 3; k++) g.px(nx - 1 + k, floor - 8 - (k % 2), GOLD.b)
    }
    hooks.glints = glints
    hooks.door = [{ x: cx, y: floor - 10 }]
  })
}

/** Naga king or queen statue for the shrine room: crowned, gold, under a 7-headed hood. */
export function nagaKingSprite(queen: boolean): Built {
  const W = 58
  const H = 92
  return bld(`kc:king:${queen ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Hood behind.
    const hood = nagaHeadsSprite(queen ? NAGA_GREEN : NAGA_GOLD, 7, false, queen ? 'kcq' : 'kck')
    g.draw(hood.canvas, Math.round(cx - hood.ax), H - 22 - hood.ay)
    // Coiled tail as the seat.
    const p: NagaPal = queen ? NAGA_GREEN : NAGA_GOLD
    for (let i = 0; i < 2; i++) {
      const y = H - 6 - i * 6
      g.ellipse(cx, y, 20 - i * 3, 5, p.D)
      g.ellipse(cx - 1, y - 1, 19 - i * 3, 4, p.b)
      for (let k = -3; k <= 3; k++) g.px(cx + k * 5, y - 2, p.L)
    }
    // Figure: gold body, sash, crown.
    const G2 = GOLDR
    const b = H - 16
    for (let y = b - 20; y < b; y++) slice(g, cx, y, 6 + (y - (b - 20)) * 0.2, G2, 0.35)
    g.line(cx - 6, b - 16, cx + 5, b - 4, queen ? '#e8514a' : '#3f9a6b')
    g.line(cx - 6, b - 15, cx + 5, b - 3, queen ? '#ff8a7a' : '#6cc38e')
    // Arms holding a crystal ball / lotus.
    g.rect(cx - 9, b - 14, 4, 8, G2.d)
    g.rect(cx + 5, b - 14, 4, 8, G2.d)
    if (queen) {
      g.ellipse(cx, b - 8, 3, 3.5, '#ff9fc0')
      g.px(cx, b - 11, '#ffe0ea')
    } else {
      g.circle(cx, b - 8, 3, '#9fe8ff')
      g.px(cx - 1, b - 9, '#ffffff')
    }
    // Head and crown (ชฎา).
    g.circle(cx, b - 25, 5, G2.b)
    g.px(cx - 2, b - 25, '#8a5222')
    g.px(cx + 2, b - 25, '#8a5222')
    g.hline(cx - 1, cx + 1, b - 22, '#b8742a')
    for (let i = 0; i < 12; i++) slice(g, cx, b - 30 - i, Math.max(0.6, 4.5 - i * 0.36), G2, 0.45)
    g.px(cx, b - 43, '#ffffff')
    // Garlands draped by devotees.
    for (let i = 0; i < 9; i++) g.px(cx - 4 + i, b - 18 + Math.round(Math.sin((i / 8) * Math.PI) * 3), i % 2 ? '#ffd23f' : '#f58f35')
    hooks.glints = [{ x: cx, y: b - 43 }, ...(hood.hooks.glints ?? []).map((h) => ({ x: cx + h.x, y: H - 22 + h.y }))]
  })
}

/** Rows of red soda bottles (a favourite offering to the naga). */
export function redSodaRow(n = 6): Built {
  return bld(`kc:soda:${n}`, n * 4 + 2, 12, (n * 4 + 2) / 2, 11, (g) => {
    for (let i = 0; i < n; i++) {
      const x = 1 + i * 4
      g.rect(x, 3, 3, 8, '#e8514a')
      g.rect(x + 1, 1, 1, 2, '#e8514a')
      g.px(x, 4, '#ff9a8a')
      g.vline(x + 1, 0, 2, '#ffffff')
      g.px(x + 2, 6, '#b8343f')
    }
  })
}

// ---------------------------------------------------------------------------
// Offering stall.

export function offeringStallSprite(): Built {
  return stallProp('kc:offer', {
    w: 54,
    awning: ['#f58f35', '#ffd23f'],
    sign: '#3f9a6b',
    signArt: (g, x, y) => {
      for (let i = 0; i < 4; i++) g.circle(x + 3 + i * 4, y + 2, 1.3, i % 2 ? '#ffd23f' : '#f58f35')
    },
    goods: (g, x, y, w) => {
      // Marigold garlands hanging.
      for (let i = 0; i < 6; i++) {
        const gx = x + 3 + i * 7
        for (let k = 0; k < 7; k++) g.px(gx + Math.round(Math.sin(k * 0.5) * 1), y - 18 + k, k % 2 ? '#ffb13b' : '#f58f35')
        g.px(gx, y - 11, '#e8514a')
      }
      // Bai sri cones, red soda and little naga figurines.
      for (let i = 0; i < 3; i++) {
        const bx = x + 3 + i * 8
        for (let k = 0; k < 7; k++) g.hline(bx + Math.round(k / 3), bx + 5 - Math.round(k / 3), y - 1 - k, k % 3 ? '#6cc36a' : '#fffaf0')
        g.px(bx + 2, y - 8, '#f58f35')
      }
      for (let i = 0; i < 4; i++) {
        g.rect(x + 28 + i * 3, y - 6, 2, 6, '#e8514a')
        g.px(x + 28 + i * 3, y - 7, '#ffffff')
      }
      g.rect(x + w - 8, y - 6, 5, 6, NAGA_GOLD.b)
      g.px(x + w - 6, y - 7, NAGA_GOLD.crest)
    },
  })
}

/** Name arch over the start of the naga bridge. */
export function bridgeArchSprite(): Built {
  const W = 78
  const H = 64
  return bld('kc:arch', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    for (const x of [4, W - 12]) {
      block(g, x, 18, 8, H - 18, 0, WHITER)
      g.rect(x - 1, H - 5, 10, 5, '#d8d0c8')
    }
    // Two serpent bodies arching over and meeting at the crest.
    for (const s of [-1, 1]) {
      for (let k = 0; k <= 30; k++) {
        const t = k / 30
        const x = cx + s * (32 - t * 30)
        const y = 22 - Math.sin(t * Math.PI * 0.5) * 14
        g.circle(x, y, 3, NAGA_GREEN.d)
        g.circle(x - 0.5, y - 0.5, 2.4, NAGA_GREEN.b)
        if (k % 3 === 0) g.px(Math.round(x), Math.round(y) - 3, GOLD.b)
      }
    }
    g.circle(cx, 6, 3, '#9fe8ff')
    g.px(cx - 1, 5, '#ffffff')
    // Name board.
    g.rect(cx - 20, 20, 40, 10, GOLD.d)
    g.rect(cx - 19, 21, 38, 8, '#2c6a45')
    for (let x = cx - 15; x < cx + 15; x += 3) g.rect(x, 23, 2, 4, GOLD.b)
    hooks.glints = [{ x: cx, y: 5 }]
  })
}

export const KC_ART: Record<string, () => { canvas: HTMLCanvasElement; w: number; h: number }> = {
  palm0: () => chanodPalmSprite(0),
  palm1: () => chanodPalmSprite(1),
  palm2: () => chanodPalmSprite(2),
  nagatree: () => nagaRootTreeSprite(),
  well: () => nagaWellSprite(),
  statue: () => nagaStatueSprite(),
  shrine: () => nagaShrineSprite(),
  shrineN: () => nagaShrineSprite(true),
  king: () => nagaKingSprite(false),
  queen: () => nagaKingSprite(true),
  soda: () => redSodaRow(),
  stall: () => offeringStallSprite(),
  arch: () => bridgeArchSprite(),
}

export { ISAN_ROOF, mixHex }
export type { Color }
