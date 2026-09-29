// วัดพระธาตุพนม, Nakhon Phanom – the tall white-and-gold Lao-style that on
// its square terraces, the cloister wall, the victory arch on the avenue to
// the Mekong, Laos on the far bank, fire boats (ไหลเรือไฟ), the khaen player
// and the som tam & grilled chicken stall.

import type { Color, Surface } from '../../engine/pixel'
import { mixHex } from '../characters'
import { GOLD, slice, type Ramp } from '../temple'
import { bld, block, GOLDR, hsh, WHITER, LACQUER, stallProp, type Built, type Pt } from './northisan'

/**
 * Phra That Phanom: a square, redented, lotus-bud tower – white with gold
 * reliefs, crowned by a gold spire and a gold umbrella. 96×224.
 */
export function thatSprite(): Built {
  const W = 98
  const H = 226
  return bld('tp:that', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    let y = H - 1
    // Square terraces with gold railings.
    for (const [h, half] of [
      [8, 46],
      [8, 40],
      [7, 35],
    ] as const) {
      y -= h
      block(g, Math.round(cx - half), y, Math.round(half * 2), h, 2, WHITER)
      g.hline(Math.round(cx - half) + 1, Math.round(cx + half) - 2, y + 2, GOLD.b)
      for (let x = Math.round(cx - half) + 3; x < cx + half - 3; x += 4) g.px(x, y + 4, GOLD.d)
    }
    // Tall lower body (เรือนธาตุ) with gold relief panels and niches.
    const bodyH = 46
    y -= bodyH
    for (let k = 0; k < bodyH; k++) slice(g, cx, y + k, 28 - k * 0.06, WHITER, 0.3)
    for (const px of [-18, 0, 18]) {
      g.rect(cx + px - 5, y + 8, 10, 30, GOLD.d)
      g.rect(cx + px - 4, y + 9, 8, 28, px === 0 ? '#e8b83a' : '#f5c542')
      for (let yy = y + 11; yy < y + 35; yy += 4) {
        g.px(cx + px - 2, yy, GOLD.L)
        g.px(cx + px + 1, yy + 1, GOLD.D)
        g.px(cx + px, yy + 2, GOLD.l)
      }
      g.px(cx + px, y + 6, GOLD.L)
      glints.push({ x: cx + px, y: y + 6 })
    }
    g.hline(Math.round(cx - 28), Math.round(cx + 27), y, GOLD.b)
    g.hline(Math.round(cx - 28), Math.round(cx + 27), y + bodyH - 2, GOLD.d)
    // Lotus-bud tower tapering up (square in plan, curved profile).
    const budH = 96
    const bb = y
    for (let i = 1; i <= budH; i++) {
      const t = i / budH
      const half = 25 * (1 - t) * (1 + Math.sin(t * Math.PI) * 0.45) + 2
      const gold = t > 0.55
      slice(g, cx, bb - i, half, gold ? GOLDR : WHITER, 0.32)
      // Redent edges.
      g.px(Math.round(cx - half * 0.5), bb - i, gold ? GOLD.L : '#ffffff')
      g.px(Math.round(cx + half * 0.5), bb - i, gold ? GOLD.d : '#ece0cc')
      if (i % 10 === 0) g.hline(Math.round(cx - half) + 1, Math.round(cx + half) - 2, bb - i, gold ? GOLD.D : GOLD.d)
    }
    glints.push({ x: cx - 8, y: bb - 60 }, { x: cx - 4, y: bb - 80 })
    y = bb - budH
    // Spire and umbrella.
    for (let i = 0; i < 18; i++) slice(g, cx, y - i, Math.max(0.6, 2.2 - i * 0.09), GOLDR, 0.5)
    y -= 18
    for (let i = 0; i < 4; i++) {
      g.hline(cx - 5 + i, cx + 4 - i, y - i * 3, GOLD.b)
      g.hline(cx - 4 + i, cx + 3 - i, y - i * 3 - 1, GOLD.L)
    }
    y -= 12
    g.px(cx, y, '#ffffff')
    glints.push({ x: cx, y })
    hooks.glints = glints
  })
}

/** Victory arch on the avenue to the Mekong (white, Lao style). */
export function laoArchSprite(): Built {
  const W = 84
  const H = 76
  return bld('tp:arch', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    for (const x0 of [2, W - 22]) {
      block(g, x0, 20, 20, H - 20, 0, WHITER)
      for (let y = 26; y < H - 4; y += 8) g.hline(x0 + 3, x0 + 16, y, GOLD.d)
    }
    block(g, 2, 14, W - 4, 14, 2, WHITER)
    g.hline(3, W - 4, 20, GOLD.b)
    // Arch opening.
    for (let x = 22; x < W - 22; x++) {
      const t = (x - 22) / (W - 45)
      const ay = 40 - Math.round(Math.sin(t * Math.PI) * 10)
      g.vline(x, ay, H - 1, '#bfe0f0')
      g.px(x, ay - 1, GOLD.b)
    }
    // Lotus-bud towers on top.
    for (const tx of [12, cx, W - 12]) {
      for (let i = 0; i < 12; i++) slice(g, tx, 13 - i, Math.max(0.6, (tx === cx ? 7 : 5) * (1 - i / 12)), i > 6 ? GOLDR : WHITER, 0.4)
      g.px(tx, 0, '#ffffff')
    }
    hooks.glints = [{ x: cx, y: 0 }, { x: 12, y: 1 }, { x: W - 12, y: 1 }]
  })
}

/** Cloister gallery wall segment seen from outside (white with a red roof). */
export function cloisterSprite(len: number): Built {
  const H = 30
  return bld(`tp:cloister:${len}`, len, H, 0, H - 1, (g) => {
    for (let y = 0; y < 10; y++) g.hline(0, len - 1, y, y === 9 ? LACQUER.D : y % 3 === 2 ? LACQUER.d : LACQUER.b)
    g.hline(0, len - 1, 0, GOLD.b)
    g.rect(0, 10, len, H - 10, '#fffaf0')
    g.hline(0, len - 1, H - 1, '#d2bfa2')
    for (let x = 6; x < len - 4; x += 12) {
      g.rect(x, 15, 4, 8, GOLD.d)
      g.rect(x + 1, 16, 2, 7, '#8a2335')
    }
  })
}

/** Som tam, gai yang and sticky rice stall. */
export function somTamStallSprite(): Built {
  return stallProp('tp:somtam', {
    w: 54,
    awning: ['#6cc36a', '#fffaf0'],
    sign: '#e8514a',
    signArt: (g, x, y) => {
      g.rect(x + 2, y + 1, 5, 3, '#86c95f')
      g.rect(x + 9, y + 1, 7, 3, '#c9803a')
    },
    goods: (g, x, y, w) => {
      // Clay mortar with papaya strips.
      g.ellipse(x + 6, y - 3, 5, 3, '#8a5a3a')
      g.ellipse(x + 6, y - 4, 4, 1.5, '#b4e486')
      g.line(x + 9, y - 10, x + 6, y - 4, '#c9a070')
      // Grill with chickens on bamboo skewers.
      g.rect(x + 14, y - 3, 18, 3, '#3a3040')
      for (let i = 0; i < 3; i++) {
        g.ellipse(x + 17 + i * 6, y - 5, 2.5, 2, '#c9803a')
        g.px(x + 16 + i * 6, y - 6, '#e8a05a')
        g.vline(x + 17 + i * 6, y - 9, y - 7, '#d8c080')
      }
      // Kratip sticky-rice baskets.
      for (let i = 0; i < 3; i++) {
        g.rect(x + w - 16 + i * 5, y - 5, 4, 5, '#c9a04c')
        g.hline(x + w - 16 + i * 5, x + w - 13 + i * 5, y - 3, '#a8803a')
      }
    },
  })
}

/** A fire boat (เรือไฟ) with a glowing pattern, drawn by the scene. */
export function drawFireBoat(g: Surface, x: number, y: number, t: number, lit: boolean) {
  const X = Math.round(x)
  const Y = Math.round(y)
  g.poly([[X - 22, Y - 2], [X + 22, Y - 2], [X + 16, Y + 3], [X - 16, Y + 3]], '#5a3a2a')
  g.hline(X - 22, X + 21, Y - 2, '#8a5a3a')
  // Bamboo frame with lamps shaped like a naga and a that.
  const pts: [number, number][] = []
  for (let i = -18; i <= 18; i += 2) pts.push([X + i, Y - 6 - Math.round(Math.sin((i + 18) / 36 * Math.PI) * 8)])
  for (let i = 0; i < 12; i++) pts.push([X, Y - 6 - i * 2])
  pts.push([X - 6, Y - 20], [X + 6, Y - 20], [X - 3, Y - 26], [X + 3, Y - 26])
  pts.forEach(([px, py], i) => {
    const on = lit && Math.sin(t * 5 + i) > -0.6
    g.px(px, py, on ? (i % 3 ? '#ffe07a' : '#ff9a4a') : '#8a6a4a')
  })
}

/** Far bank of the Mekong: Laos (hills, palms and a Lao temple roof). */
export function laosBank(g: Surface, x: number, y: number, w: number, h: number, night: boolean) {
  const hill = night ? '#3a4478' : '#8ab4a0'
  const hill2 = night ? '#2e3a6a' : '#6a9a80'
  for (let i = 0; i < w; i++) {
    const hh = 10 + Math.round(Math.sin((x + i) * 0.03) * 6 + Math.sin((x + i) * 0.11) * 2)
    g.vline(x + i, y + h - hh - 8, y + h, hill)
    const h2 = 5 + Math.round(Math.sin((x + i) * 0.07 + 2) * 3)
    g.vline(x + i, y + h - h2, y + h, hill2)
  }
  // Village roofs and a little Lao temple with a gold that.
  for (let k = 0; k < 9; k++) {
    const hx = x + 10 + ((hsh(k, 4) % (w - 20)))
    g.rect(hx, y + h - 6, 5, 3, night ? '#4a4a7a' : '#e8d8c0')
    g.rect(hx - 1, y + h - 8, 7, 2, night ? '#3a3a6a' : '#b8604a')
    if (night && k % 2 === 0) g.px(hx + 2, y + h - 5, '#ffe07a')
  }
  const tx = x + w * 0.62
  g.rect(tx - 8, y + h - 10, 16, 6, night ? '#4a4a7a' : '#fffaf0')
  g.poly([[tx - 10, y + h - 10], [tx, y + h - 18], [tx + 10, y + h - 10]], night ? '#6a3a4a' : '#c8503a')
  for (let i = 0; i < 12; i++) slice(g, tx + 16, y + h - 6 - i, Math.max(0.5, 3 * (1 - i / 12)), GOLDR, 0.4)
  g.hline(x, x + w - 1, y + h - 1, night ? '#5a6a9a' : '#c8b890')
}

export const TP_ART: Record<string, () => { canvas: HTMLCanvasElement; w: number; h: number }> = {
  that: () => thatSprite(),
  arch: () => laoArchSprite(),
  cloister: () => cloisterSprite(80),
  somtam: () => somTamStallSprite(),
  boat: () => bld('tp:boattest', 50, 34, 0, 0, (g) => drawFireBoat(g, 25, 30, 0, true), false),
  bank: () => bld('tp:banktest', 160, 40, 0, 0, (g) => laosBank(g, 0, 0, 160, 40, false), false),
}

export { mixHex }
export type { Color, Ramp }
