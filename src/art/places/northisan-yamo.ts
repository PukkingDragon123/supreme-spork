// อนุสาวรีย์ท้าวสุรนารี (ย่าโม), Nakhon Ratchasima – the bronze heroine with
// her sword on a tall plinth, the old Chumphon Gate and city wall with its
// moat, the Pleng Korat singers' stage, and pad mee Korat at the night market.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, slice, roofBand, bargeBoard, hangHong, gable, ROOF, type Ramp } from '../temple'
import { bld, block, hsh, WHITER, stallProp, type Built, type Pt } from './northisan'

export const BRONZE: Ramp = { L: '#d4a25a', b: '#9c6634', d: '#7f4d28', D: '#553722' }

/** Ya Mo in bronze on her tall plinth: hair bun, sabai, sword held point-down. */
export function yaMoStatueSprite(): Built {
  const W = 60
  const H = 150
  return bld('ym:statue', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    // Stepped granite plinth with a bronze plaque.
    const S: Ramp = { L: '#f0ece6', b: '#d8d0c8', d: '#bfb6b0', D: '#9a918c' }
    block(g, 2, H - 10, W - 4, 10, 3, S)
    block(g, 8, H - 60, W - 16, 50, 3, S)
    g.rect(cx - 10, H - 46, 20, 16, BRONZE.d)
    g.rect(cx - 9, H - 45, 18, 14, BRONZE.b)
    for (let y = H - 42; y < H - 33; y += 3) g.hline(cx - 6, cx + 5, y, BRONZE.L)
    block(g, 5, H - 64, W - 10, 5, 2, S)
    const b = H - 64
    // Feet and chong kraben.
    g.rect(cx - 6, b - 4, 5, 4, BRONZE.d)
    g.rect(cx + 1, b - 4, 5, 4, BRONZE.D)
    for (let y = b - 22; y < b - 4; y++) slice(g, cx, y, 7 + (y - (b - 22)) * 0.1, BRONZE, 0.3)
    g.vline(cx, b - 16, b - 5, BRONZE.D)
    // Torso with the sabai sash.
    for (let y = b - 40; y < b - 22; y++) slice(g, cx, y, 6 - Math.abs(y - (b - 32)) * 0.05, BRONZE, 0.35)
    g.line(cx - 6, b - 38, cx + 6, b - 25, BRONZE.D)
    g.line(cx - 5, b - 38, cx + 6, b - 26, BRONZE.L)
    // Arms resting on the sword hilt in front.
    g.rect(cx - 9, b - 36, 4, 12, BRONZE.b)
    g.rect(cx + 5, b - 36, 4, 12, BRONZE.d)
    g.rect(cx - 5, b - 26, 10, 3, BRONZE.b)
    // Sword, point down.
    g.vline(cx, b - 26, b - 2, '#e4e0d8')
    g.vline(cx + 1, b - 24, b - 3, '#a8a098')
    g.hline(cx - 3, cx + 3, b - 26, BRONZE.L)
    // Head with a bun.
    g.circle(cx, b - 45, 5, BRONZE.b)
    g.circle(cx - 1.5, b - 46.5, 2.2, BRONZE.L)
    g.circle(cx, b - 51, 2.6, BRONZE.d)
    g.px(cx + 2, b - 45, BRONZE.D)
    g.px(cx - 2, b - 45, BRONZE.D)
    glints.push({ x: cx - 2, y: b - 48 }, { x: cx, y: b - 20 }, { x: cx - 7, y: b - 34 })
    // Garlands of marigold hung on her arms by devotees.
    for (let i = 0; i < 11; i++) g.px(cx - 5 + i, b - 28 + Math.round(Math.sin((i / 10) * Math.PI) * 4), i % 2 ? '#ffd23f' : '#f58f35')
    hooks.glints = glints
  })
}

/** Chumphon Gate: brick-and-plaster tower gate with a Thai roof on the old city wall. */
export function chumphonGateSprite(night = false): Built {
  const W = 104
  const H = 98
  return bld(`ym:gate:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const WALL: Ramp = { L: '#fff6ea', b: '#efe2cc', d: '#d8c6a8', D: '#b8a080' }
    block(g, 4, 40, W - 8, H - 40, 0, WALL)
    // Weathered brick showing through.
    for (let i = 0; i < 40; i++) {
      const x = 6 + (hsh(i, 2) % (W - 12))
      const y = 44 + (hsh(i, 3) % (H - 48))
      g.rect(x, y, 4, 2, '#c8805a')
      g.px(x, y, '#a8603a')
    }
    // Crenellations (ใบเสมาเชิงเทิน).
    for (let x = 4; x < W - 6; x += 8) {
      block(g, x, 34, 6, 7, 1, WALL)
      g.px(x + 2, 34, '#ffffff')
    }
    // Archway.
    for (let x = cx - 14; x < cx + 14; x++) {
      const t = (x - (cx - 14)) / 27
      const ay = 62 - Math.round(Math.sin(t * Math.PI) * 10)
      g.vline(x, ay, H - 1, night ? '#ffcf7a' : '#4a3040')
      g.px(x, ay - 1, WALL.D)
    }
    if (!night) g.rect(cx - 10, 70, 20, H - 71, '#6a4a3a')
    // The tower pavilion on top with a Thai roof.
    block(g, cx - 22, 18, 44, 18, 0, WALL)
    for (const px of [cx - 20, cx - 8, cx + 5, cx + 17]) g.rect(px, 20, 3, 16, '#b8343f')
    const r = ROOF.red
    roofBand(g, cx, 2, cx - 32, 20, 7, r)
    roofBand(g, cx, 2, cx + 32, 20, 7, r)
    const gl = gable(g, cx, 3, 24, 19, { field: P.redD, fieldD: P.redDD, sparkA: GOLD.l, sparkB: '#8fb6ff', motif: 'emblem', thick: 2 })
    for (const s of [-1, 1]) {
      bargeBoard(g, cx + s * 24, 19, cx + s * 33, 22, 2)
      hangHong(g, cx + s * 34, 23, s)
    }
    // Name board.
    g.rect(cx - 14, 42, 28, 7, GOLD.d)
    g.rect(cx - 13, 43, 26, 5, '#2a3470')
    for (let x = cx - 10; x < cx + 10; x += 3) g.rect(x, 44, 2, 3, GOLD.b)
    hooks.glints = gl
  })
}

/** Plain stretch of the old city wall. */
export function cityWallSprite(len: number): Built {
  return bld(`ym:wall:${len}`, len, 40, 0, 39, (g) => {
    const WALL: Ramp = { L: '#fff6ea', b: '#efe2cc', d: '#d8c6a8', D: '#b8a080' }
    g.rect(0, 8, len, 32, WALL.b)
    g.hline(0, len - 1, 8, WALL.L)
    g.rect(0, 34, len, 6, WALL.d)
    for (let x = 0; x < len - 4; x += 8) {
      g.rect(x, 1, 6, 8, WALL.b)
      g.hline(x, x + 5, 1, WALL.L)
    }
    for (let i = 0; i < len / 6; i++) {
      const x = hsh(i, len) % Math.max(1, len - 4)
      const y = 12 + (hsh(i, 5) % 20)
      g.rect(x, y, 4, 2, '#c8805a')
    }
  })
}

/** Open sala where Pleng Korat singers perform (a vow-fulfilment stage). */
export function korarStageSprite(): Built {
  const W = 70
  const H = 50
  return bld('ym:stage', W, H, W / 2, H - 1, (g) => {
    block(g, 2, H - 8, W - 4, 8, 3, { L: '#c9956a', b: '#a86b3e', d: '#84502e', D: '#5e3822' })
    for (const x of [5, W - 8]) g.rect(x, 16, 3, H - 24, '#b8343f')
    for (let y = 2; y < 17; y++) {
      const inset = Math.round((17 - y) * 1.2)
      g.hline(inset, W - 1 - inset, y, y === 16 ? '#5e1830' : y % 3 === 2 ? ROOF.red.fieldD : ROOF.red.field)
    }
    g.hline(19, W - 20, 1, GOLD.b)
    // Colourful valance and a banner.
    for (let x = 6; x < W - 6; x += 4) g.rect(x, 17, 3, 3, ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a'][(x / 4) % 4])
    g.rect(W / 2 - 12, 22, 24, 6, '#fffaf0')
    for (let x = W / 2 - 9; x < W / 2 + 9; x += 3) g.px(x, 25, '#b8343f')
  })
}

/** Pad mee Korat stall with a wok and baskets of noodles. */
export function padMeeStallSprite(): Built {
  return stallProp('ym:padmee', {
    w: 54,
    awning: ['#b394f0', '#fffaf0'],
    sign: '#ffd23f',
    signArt: (g, x, y) => {
      g.ellipse(x + 8, y + 3, 5, 2, '#c9803a')
      for (let i = 0; i < 4; i++) g.px(x + 5 + i * 2, y + 2, '#fffaf0')
    },
    goods: (g, x, y, w) => {
      // Big wok over a flame.
      g.ellipse(x + 10, y - 2, 8, 3, '#3a3040')
      g.ellipse(x + 10, y - 3, 7, 2, '#c9803a')
      for (let i = 0; i < 6; i++) g.px(x + 5 + i * 2, y - 4, '#e8a05a')
      g.px(x + 8, y - 4, '#6cc36a')
      g.px(x + 12, y - 4, '#e8514a')
      g.line(x + 18, y - 3, x + 22, y - 8, '#8a8480')
      // Baskets of white mee Korat noodles.
      for (let i = 0; i < 3; i++) {
        g.ellipse(x + 28 + i * 7, y - 2, 3, 2, '#c9a04c')
        g.ellipse(x + 28 + i * 7, y - 3, 2.4, 1, '#fffaf0')
      }
      g.rect(x + w - 6, y - 4, 5, 4, '#fffaf0')
      g.hline(x + w - 6, x + w - 2, y - 4, '#5a8de0')
    },
  })
}

/** Night-market stall (generic, many colours of goods). */
export function nightStallSprite(v: number): Built {
  const aw: [Color, Color][] = [['#e8514a', '#fffaf0'], ['#5a8de0', '#fffaf0'], ['#6cc36a', '#ffd23f'], ['#ff9fc0', '#fffaf0']]
  return stallProp(`ym:night:${v}`, {
    w: 44,
    awning: aw[v % aw.length],
    umbrella: v % 2 === 1,
    goods: (g, x, y, w) => {
      for (let i = 0; i < w - 4; i += 4) {
        const c = ['#ffd23f', '#e8514a', '#fffaf0', '#86c95f', '#c9803a', '#ff9fc0'][(i / 4 + v) % 6]
        g.rect(x + 2 + i, y - 3, 3, 3, c)
        g.px(x + 2 + i, y - 3, mixHex(c, '#ffffff', 0.5))
      }
    },
  })
}

/** Interior: a battle mural of Thung Samrit, painted in earthy tones. */
export function battleMural(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#f0e0c0')
  g.rect(x, y + h - 14, w, 14, '#c8b080')
  for (let i = 0; i < w; i += 3) g.px(x + i, y + h - 16 + (i % 4), '#8ab060')
  // Villagers with torches and spears charging.
  for (let i = 0; i < 12; i++) {
    const px = x + 8 + i * ((w - 16) / 11)
    const py = y + h - 16
    g.rect(px - 1, py - 8, 3, 6, i % 3 ? '#3a3a78' : '#b8343f')
    g.circle(px, py - 10, 1.5, '#c89a78')
    g.line(px + 2, py - 6, px + 4, py - 14, '#6e4a35')
    if (i % 3 === 0) g.px(px + 4, py - 15, '#ff9a4a')
  }
  // Ya Mo leading on horseback in the middle.
  const mx = x + w / 2
  g.ellipse(mx, y + h - 22, 8, 4, '#8a5a3a')
  g.rect(mx - 1, y + h - 34, 3, 8, '#b8343f')
  g.circle(mx, y + h - 36, 2, '#c89a78')
  g.line(mx + 2, y + h - 32, mx + 8, y + h - 40, '#e4e0d8')
  g.frame(x, y, w, h, GOLD.d)
}

export const YM_ART: Record<string, () => { canvas: HTMLCanvasElement; w: number; h: number }> = {
  statue: () => yaMoStatueSprite(),
  gate: () => chumphonGateSprite(),
  wall: () => cityWallSprite(80),
  stage: () => korarStageSprite(),
  padmee: () => padMeeStallSprite(),
  night0: () => nightStallSprite(0),
  night1: () => nightStallSprite(1),
  mural: () => bld('ym:muraltest', 160, 60, 0, 0, (g) => battleMural(g, 0, 0, 160, 60), false),
}

export { WHITER }
