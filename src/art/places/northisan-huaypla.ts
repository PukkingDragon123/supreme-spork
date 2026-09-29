// วัดห้วยปลากั้ง, Chiang Rai – the enormous white seated Guanyin on her
// pedestal, the nine-tiered Chinese-Lanna pagoda ringed by little chedis,
// Chinese dragon staircases, guardian lions, the bronze incense cauldron,
// a red paifang gate and a tea & dumpling pavilion.

import { createCanvas, type Color, type Surface } from '../../engine/pixel'
import { cached } from '../../engine/sprite'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, slice, type Ramp } from '../temple'
import { deitySculpt } from '../hall'
import { bld, block, GOLDR, hsh, WHITER, stallProp, type Built, type NagaPal, type Pt } from './northisan'
import type { Prop } from '../props'

export const CHINA_RED = { L: '#ff7a6a', b: '#d8403a', d: '#a82e30', D: '#7a2028' }
export const TILE_GREEN = { L: '#8ad0a0', b: '#3f9a6b', d: '#2c7552', D: '#1e5a42' }
export const DRAGON: NagaPal = { b: '#3fae6a', d: '#2c8a52', D: '#1e5a42', L: '#8ae0a0', belly: '#ffe27a', bellyD: '#e9a53a', crest: '#e8514a', crestL: '#ff9a7a', gems: ['#ffe27a', '#ffffff', '#9fe8ff'] }

// ---------------------------------------------------------------------------
// The giant white Guanyin: the sculpted deity (hall.ts), scaled up and
// re-lit in pure white porcelain tones.

const WHITE_RAMP = ['#8a94b8', '#a8b2d0', '#c4cce2', '#dce2f0', '#eef1f8', '#f8f9fc', '#ffffff']

export function giantGuanyinProp(s = 3.2): Prop {
  return cached(`hpk:guanyin:${s}`, () => {
    const sc = deitySculpt('guanyin', s)
    const src = sc.canvas
    const c = createCanvas(src.width, src.height)
    const ctx = c.getContext('2d')!
    ctx.drawImage(src, 0, 0)
    const img = ctx.getImageData(0, 0, c.width, c.height)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 20) continue
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const L = (r * 0.3 + g * 0.55 + b * 0.15) / 255
      if (L < 0.2) {
        // Keep the outline, cooled to a soft blue-grey.
        d[i] = 0x5a
        d[i + 1] = 0x62
        d[i + 2] = 0x88
        continue
      }
      const k = Math.min(WHITE_RAMP.length - 1, Math.max(0, Math.round((L - 0.2) / 0.75 * (WHITE_RAMP.length - 1))))
      const hex = WHITE_RAMP[k]
      d[i] = parseInt(hex.slice(1, 3), 16)
      d[i + 1] = parseInt(hex.slice(3, 5), 16)
      d[i + 2] = parseInt(hex.slice(5, 7), 16)
    }
    ctx.putImageData(img, 0, 0)
    return { canvas: c, w: c.width, h: c.height, ax: sc.ox, ay: sc.oy } as Prop
  }) as Prop
}

/** Tall white pedestal building with a lotus throne; the entrance door is in front. */
export function guanyinPedestalSprite(): Built {
  const W = 180
  const H = 84
  return bld('hpk:pedestal', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Stepped white base.
    block(g, 4, H - 10, W - 8, 10, 3, WHITER)
    block(g, 16, H - 38, W - 32, 28, 2, WHITER)
    // Red and gold band with windows.
    g.rect(16, H - 32, W - 32, 5, CHINA_RED.b)
    g.hline(16, W - 17, H - 32, GOLD.b)
    g.hline(16, W - 17, H - 28, GOLD.d)
    for (let x = 26; x < W - 26; x += 14) {
      if (Math.abs(x + 3 - cx) < 16) continue
      g.rect(x, H - 24, 6, 10, CHINA_RED.d)
      g.rect(x + 1, H - 23, 4, 9, '#5a2030')
      g.px(x + 2, H - 25, GOLD.b)
    }
    // Lotus throne: back row of pink-tipped petals, front row of white.
    const rows: [number, number, number, Color, Color][] = [
      [H - 42, 13, 20, '#ffd0de', '#f58ab4'],
      [H - 38, 15, 18, '#ffffff', '#ffc4d8'],
    ]
    rows.forEach(([base, n, ph, body, tip], r) => {
      for (let i = 0; i < n; i++) {
        const px = 14 + (i + (r ? 0 : 0.5)) * ((W - 28) / n)
        const hw = 7
        for (let k = 0; k < ph; k++) {
          const t = k / ph
          const half = hw * Math.sin(Math.min(1, (1 - t) * 1.25) * Math.PI * 0.5) * (t > 0.85 ? 0.4 : 1)
          const c = t > 0.7 ? tip : t > 0.55 ? mixHex(body, tip, 0.5) : body
          g.hline(Math.round(px - half), Math.round(px + half), base - k, c)
        }
        g.vline(Math.round(px), base - ph + 4, base - 2, mixHex(body, '#c8a0b0', 0.4))
        g.px(Math.round(px - 3), base - ph * 0.5, '#ffffff')
      }
    })
    // Entrance door with a red arch and a gold name board.
    g.rect(cx - 11, H - 36, 22, 26, CHINA_RED.b)
    g.rect(cx - 9, H - 34, 18, 24, '#3a2030')
    g.rect(cx - 8, H - 32, 16, 22, '#5a3040')
    g.px(cx - 1, H - 22, GOLD.b)
    g.px(cx, H - 22, GOLD.b)
    g.rect(cx - 7, H - 44, 14, 6, GOLD.d)
    g.rect(cx - 6, H - 43, 12, 4, CHINA_RED.d)
    for (let x = cx - 4; x <= cx + 4; x += 4) g.px(x, H - 42, GOLD.L)
    hooks.door = [{ x: cx, y: H - 12 }]
    hooks.glints = [{ x: cx, y: H - 44 }]
  })
}

// ---------------------------------------------------------------------------
// Nine-tiered pagoda (เจดีย์ ๙ ชั้น).

function chineseRoof(g: Surface, cx: number, y: number, half: number, depth: number) {
  // Tiled roof with upturned corners (มุมงอน) and a gold ridge.
  for (let k = 0; k < depth; k++) {
    const hw = half - (depth - k) * 0.9
    const c = k === depth - 1 ? CHINA_RED.D : k % 2 ? CHINA_RED.b : CHINA_RED.d
    g.hline(Math.round(cx - hw), Math.round(cx + hw), y + k, c)
  }
  g.hline(Math.round(cx - half + depth * 0.9), Math.round(cx + half - depth * 0.9), y - 1, GOLD.b)
  // Curled eave tips.
  for (const s of [-1, 1]) {
    const ex = Math.round(cx + s * half)
    g.px(ex, y + depth - 2, CHINA_RED.b)
    g.px(ex + s, y + depth - 3, GOLD.b)
    g.px(ex + s, y + depth - 4, GOLD.L)
    g.px(ex, y + depth, GOLD.d)
  }
  // Underside shadow.
  g.hline(Math.round(cx - half + 2), Math.round(cx + half - 2), y + depth, '#5a2030')
}

export function ninePagodaSprite(): Built {
  const W = 96
  const H = 214
  return bld('hpk:pagoda', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    let y = H - 1
    // Platform tiers.
    for (const [h, half] of [
      [8, 46],
      [6, 42],
    ] as const) {
      y -= h
      block(g, Math.round(cx - half), y, Math.round(half * 2), h, 2, WHITER)
      g.hline(Math.round(cx - half) + 1, Math.round(cx + half) - 2, y + h - 2, CHINA_RED.b)
    }
    // Nine tiers.
    for (let i = 0; i < 9; i++) {
      const half = 34 - i * 2.8
      const bh = i === 0 ? 16 : 10 - Math.floor(i / 3)
      y -= bh
      // Body segment: white with red door / windows.
      for (let k = 0; k < bh; k++) slice(g, cx, y + k, half - 4, WHITER, 0.3)
      if (i === 0) {
        g.rect(cx - 6, y + 4, 12, bh - 4, CHINA_RED.b)
        g.rect(cx - 4, y + 6, 8, bh - 6, '#4a2030')
        g.rect(cx - 5, y + 2, 10, 2, GOLD.b)
      } else {
        for (const wx of [-half * 0.45, 0, half * 0.45]) {
          g.rect(Math.round(cx + wx) - 1, y + 2, 3, bh - 4, CHINA_RED.d)
          g.px(Math.round(cx + wx), y + 2, GOLD.b)
        }
      }
      // Roof over this tier.
      const depth = 5 - Math.floor(i / 4)
      y -= depth
      chineseRoof(g, cx, y, half + 3, depth)
      glints.push({ x: Math.round(cx - half - 4), y: y + depth - 4 }, { x: Math.round(cx + half + 4), y: y + depth - 4 })
    }
    // Burmese bell spire in gold.
    const bell = 16
    for (let i = 0; i < bell; i++) {
      const t = i / bell
      slice(g, cx, y - i, 9 * Math.sqrt(Math.max(0, 1 - t * t * 0.9)) * (1 - t * 0.2), GOLDR, 0.35)
    }
    y -= bell
    for (let i = 0; i < 18; i++) slice(g, cx, y - i, Math.max(0.6, 3.6 - i * 0.18), GOLDR, 0.5)
    // Hti umbrella.
    y -= 18
    g.hline(cx - 3, cx + 2, y, GOLD.b)
    g.hline(cx - 2, cx + 1, y - 1, GOLD.L)
    g.vline(cx, y - 5, y - 2, GOLD.d)
    g.px(cx, y - 6, '#ffffff')
    glints.push({ x: cx, y: y - 6 }, { x: cx - 4, y: y + 22 })
    hooks.glints = glints
  })
}

/** Little white chedi (twelve ring the pagoda). */
export function miniChediSprite(): Built {
  return bld('hpk:minichedi', 16, 30, 8, 29, (g) => {
    block(g, 1, 24, 14, 6, 2, WHITER)
    for (let i = 0; i < 9; i++) slice(g, 8, 23 - i, 6 * Math.sqrt(Math.max(0, 1 - Math.pow(i / 9, 2))), WHITER, 0.3)
    for (let i = 0; i < 10; i++) slice(g, 8, 14 - i, Math.max(0.6, 2 - i * 0.14), GOLDR, 0.5)
    g.px(8, 3, '#ffffff')
  })
}

// ---------------------------------------------------------------------------
// Chinese dragon (มังกร) heads for the stair ends, guardian lions, cauldron.

export function dragonHeadSprite(): Built {
  const W = 40
  const H = 44
  return bld('hpk:dragon', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Plinth.
    block(g, 6, H - 8, W - 12, 8, 2, WHITER)
    const b = H - 8
    // Neck rising and curling.
    for (let i = 0; i < 18; i++) {
      const y = b - i
      const x = cx + Math.sin(i * 0.25) * 3
      g.circle(x, y, 5, DRAGON.D)
      g.circle(x - 0.5, y - 0.5, 4.4, DRAGON.b)
      g.px(Math.round(x + 2), y, DRAGON.belly)
      if (i % 3 === 0) g.px(Math.round(x - 3), y, DRAGON.L)
      if (i % 2 === 0) g.px(Math.round(x), y - 5, DRAGON.crest)
    }
    // Head.
    const hy = b - 26
    g.ellipse(cx, hy, 10, 7, DRAGON.D)
    g.ellipse(cx - 0.5, hy - 0.5, 9.4, 6.4, DRAGON.b)
    g.ellipse(cx - 3, hy - 3, 4, 2, DRAGON.L)
    // Snout and open jaws.
    g.rect(cx - 6, hy + 2, 12, 5, DRAGON.b)
    g.rect(cx - 5, hy + 5, 10, 3, '#c8384a')
    g.px(cx - 5, hy + 5, '#ffffff')
    g.px(cx + 4, hy + 5, '#ffffff')
    g.circle(cx, hy + 6, 1.5, '#ffe27a')
    // Eyes.
    for (const s of [-1, 1]) {
      g.circle(cx + s * 4, hy - 2, 2, '#ffffff')
      g.px(cx + s * 4, hy - 2, P.ink)
    }
    // Horns, mane and whiskers.
    for (const s of [-1, 1]) {
      g.line(cx + s * 4, hy - 6, cx + s * 8, hy - 14, GOLD.b)
      g.px(cx + s * 8, hy - 15, GOLD.L)
      for (let k = 0; k < 5; k++) g.line(cx + s * (7 + k), hy - 4 + k * 2, cx + s * (12 + k), hy - 8 + k * 3, k % 2 ? DRAGON.crest : DRAGON.crestL)
      g.line(cx + s * 5, hy + 4, cx + s * 14, hy + 9, GOLD.d)
    }
    hooks.glints = [{ x: cx - 8, y: hy - 15 }, { x: cx + 8, y: hy - 15 }]
    hooks.mouth = [{ x: cx, y: hy + 6 }]
  })
}

/** Chinese guardian lion (สิงโตหิน) on a plinth. */
export function stoneLionSprite(): Built {
  return bld('hpk:lion', 26, 34, 13, 33, (g) => {
    const S = { L: '#e8e0d8', b: '#c9bfb8', d: '#a89e98', D: '#8c8187' }
    block(g, 2, 26, 22, 8, 2, S)
    g.ellipse(13, 21, 8, 6, S.d)
    g.ellipse(12, 20, 7, 5, S.b)
    g.circle(13, 11, 7, S.d)
    g.circle(12.5, 10.5, 6.4, S.b)
    // Curly mane.
    for (let a = 0; a < 12; a++) g.px(Math.round(13 + Math.cos(a / 2) * 7), Math.round(11 + Math.sin(a / 2) * 7), S.D)
    g.px(10, 9, P.ink)
    g.px(15, 9, P.ink)
    g.rect(11, 13, 4, 2, S.D)
    g.px(12, 14, '#e8514a')
    // Paw on a ball.
    g.circle(20, 22, 3, S.L)
    g.px(19, 21, '#ffffff')
    g.rect(5, 24, 4, 3, S.b)
  })
}

/** Bronze Chinese incense cauldron (กระถางธูปจีน) on three legs. */
export function cauldronSprite(): Built {
  return bld('hpk:cauldron', 34, 30, 17, 29, (g, hooks) => {
    const B = { L: '#d8a86a', b: '#a8784a', d: '#7a5234', D: '#553722' }
    for (const x of [7, 17, 27]) g.rect(x - 1, 22, 3, 8, B.d)
    g.ellipse(17, 17, 15, 8, B.D)
    g.ellipse(17, 16, 15, 7.5, B.b)
    g.ellipse(13, 13, 6, 3, B.L)
    // Rim, handles and sand with incense.
    g.ellipse(17, 10, 14, 3, B.d)
    g.ellipse(17, 10, 12, 2.2, '#c8b89a')
    for (let x = 8; x < 27; x += 2) {
      g.vline(x, 3 + (x % 3), 9, '#8a2335')
      g.px(x, 3 + (x % 3), '#ff9a5a')
    }
    g.rect(0, 11, 4, 3, B.d)
    g.rect(30, 11, 4, 3, B.d)
    // Dragon relief.
    for (let x = 6; x < 29; x++) g.px(x, 17 + Math.round(Math.sin(x * 0.6)), GOLD.d)
    hooks.smoke = [{ x: 17, y: 4 }]
  })
}

/** Red candle rack (Chinese style, tall red candles). */
export function redCandleRack(): Built {
  return bld('hpk:redcandles', 34, 22, 17, 21, (g, hooks) => {
    g.rect(1, 13, 32, 3, GOLD.d)
    g.hline(1, 32, 13, GOLD.L)
    g.rect(3, 16, 2, 6, GOLD.D)
    g.rect(29, 16, 2, 6, GOLD.D)
    const flames: Pt[] = []
    for (let i = 0; i < 9; i++) {
      const x = 3 + i * 3.4
      const h = 6 + (i % 3) * 2
      g.rect(Math.round(x), 13 - h, 2, h, CHINA_RED.b)
      g.px(Math.round(x), 13 - h, CHINA_RED.L)
      g.px(Math.round(x) + 1, 12 - h + 4, GOLD.b)
      flames.push({ x: Math.round(x), y: 12 - h })
    }
    hooks.flames = flames
  })
}

/** Red paifang gate with green tiled roofs. */
export function paifangSprite(): Built {
  const W = 88
  const H = 72
  return bld('hpk:paifang', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const posts = [8, 26, W - 29, W - 11]
    for (const x of posts) {
      g.rect(x, 24, 4, H - 28, CHINA_RED.b)
      g.vline(x, 24, H - 5, CHINA_RED.L)
      g.vline(x + 3, 24, H - 5, CHINA_RED.D)
      block(g, x - 2, H - 6, 8, 6, 2, { L: '#e8e0d8', b: '#c9bfb8', d: '#a89e98', D: '#8c8187' })
    }
    // Beams with gold name board.
    g.rect(4, 26, W - 8, 4, CHINA_RED.d)
    g.rect(4, 36, W - 8, 3, CHINA_RED.d)
    g.hline(4, W - 5, 26, GOLD.b)
    g.rect(cx - 14, 28, 28, 9, GOLD.d)
    g.rect(cx - 13, 29, 26, 7, '#2a3470')
    for (let x = cx - 10; x < cx + 10; x += 3) g.rect(x, 31, 2, 3, GOLD.b)
    // Tiled roofs.
    const roof = (x0: number, x1: number, y: number) => {
      for (let k = 0; k < 7; k++) g.hline(x0 + (6 - k), x1 - (6 - k), y + k, k === 6 ? TILE_GREEN.D : k % 2 ? TILE_GREEN.b : TILE_GREEN.d)
      g.hline(x0 + 6, x1 - 6, y - 1, GOLD.b)
      for (const [ex, s] of [
        [x0 - 1, -1],
        [x1 + 1, 1],
      ] as const) {
        g.px(ex, y + 4, TILE_GREEN.b)
        g.px(ex + s, y + 3, GOLD.b)
        g.px(ex + s, y + 2, GOLD.L)
      }
    }
    roof(2, 34, 18)
    roof(W - 35, W - 3, 18)
    roof(20, W - 21, 8)
    // Pearl and dragons on the ridge.
    g.circle(cx, 5, 2, '#ff9a5a')
    g.px(cx - 1, 4, '#ffe27a')
    for (const s of [-1, 1]) {
      g.line(cx + s * 4, 6, cx + s * 12, 6, TILE_GREEN.L)
      g.px(cx + s * 12, 5, GOLD.b)
    }
    hooks.glints = [{ x: cx, y: 4 }, { x: 1, y: 20 }, { x: W - 2, y: 20 }]
  })
}

/** Chinese tea & dumpling stall with steamer baskets. */
export function teaStallSprite(): Built {
  return stallProp('hpk:tea', {
    w: 52,
    awning: ['#d8403a', '#ffd23f'],
    wood: { L: '#c9956a', b: '#9a6a45', d: '#6e4a35', D: '#4a3128' },
    sign: '#d8403a',
    signArt: (g, x, y) => {
      g.rect(x + 2, y + 1, 3, 3, '#ffd23f')
      g.rect(x + 7, y + 1, 3, 3, '#ffd23f')
      g.rect(x + 12, y + 1, 3, 3, '#ffd23f')
    },
    goods: (g, x, y, w) => {
      // Stacked bamboo steamers with a puff of steam.
      for (let i = 0; i < 3; i++) {
        g.rect(x + 2, y - 4 - i * 3, 12, 3, i % 2 ? '#d8b070' : '#c9a04c')
        g.hline(x + 2, x + 13, y - 4 - i * 3, '#e8c890')
      }
      g.rect(x + 3, y - 13, 10, 2, '#b89050')
      // Teapot and cups.
      g.ellipse(x + 22, y - 3, 4, 3, '#6a8ad0')
      g.rect(x + 20, y - 7, 4, 2, '#6a8ad0')
      g.line(x + 26, y - 4, x + 28, y - 6, '#6a8ad0')
      for (let i = 0; i < 3; i++) g.rect(x + 31 + i * 4, y - 2, 3, 2, '#fffaf0')
      // Salapao buns.
      for (let i = 0; i < 3; i++) {
        g.circle(x + w - 8 + i * 3, y - 2, 1.6, '#fffaf0')
        g.px(x + w - 8 + i * 3, y - 3, '#e8514a')
      }
    },
  })
}

/** Bonsai in a glazed pot (water_plants job props). */
export function bonsaiSprite(v = 0): Built {
  return bld(`hpk:bonsai:${v}`, 22, 22, 11, 21, (g) => {
    g.rect(3, 15, 16, 6, v % 2 ? '#3a60a8' : '#2c7552')
    g.hline(3, 18, 15, v % 2 ? '#6a8ad0' : '#6cc38e')
    g.rect(5, 21, 12, 1, '#3a3040')
    g.thickLine(11, 15, 9, 9, 2, '#6e4a35')
    g.thickLine(9, 9, 13, 5, 1.6, '#6e4a35')
    for (const [x, y, r] of [
      [6, 8, 3.5],
      [13, 4, 3.5],
      [16, 9, 3],
    ] as const) {
      g.circle(x, y, r, '#2f6f4b')
      g.circle(x - 1, y - 1, r * 0.7, '#5eae55')
    }
  })
}

/** A clump of bamboo. */
export function bambooSprite(v = 0): Built {
  const W = 30
  const H = 60
  return bld(`hpk:bamboo:${v}`, W, H, W / 2, H - 1, (g) => {
    const stems = [6, 11, 15, 19, 24]
    stems.forEach((x, i) => {
      const top = 6 + ((i * 7 + v * 3) % 12)
      const lean = (i - 2) * 0.12
      for (let y = top; y < H; y++) {
        const xx = Math.round(x + (H - y) * lean)
        g.rect(xx, y, 2, 1, (y - top) % 9 === 0 ? '#6a9a3a' : i % 2 ? '#8ac04a' : '#a8d060')
        if ((y - top) % 9 === 0) g.px(xx - 1, y, '#5a8a30')
      }
      // Leaf sprays.
      for (let k = 0; k < 4; k++) {
        const ly = top + 4 + k * 10
        const lx = Math.round(x + (H - ly) * lean)
        const dir = (k + i) % 2 ? 1 : -1
        g.line(lx, ly, lx + dir * 6, ly + 2, '#5eae55')
        g.line(lx, ly + 1, lx + dir * 5, ly + 4, '#3f8a4f')
        g.px(lx + dir * 6, ly + 2, '#9ed86a')
      }
    })
  })
}

/** Big round red lantern (for the Chinese courtyard; drawn by the scene). */
export function drawRedLantern(g: Surface, x: number, y: number, lit: boolean) {
  g.vline(x, y - 3, y - 1, '#3a3040')
  g.rect(x - 2, y - 1, 5, 1, GOLD.d)
  g.ellipse(x + 0.5, y + 3, 3.5, 3, lit ? '#ff6a4a' : CHINA_RED.b)
  g.px(x - 1, y + 2, lit ? '#ffd0a0' : CHINA_RED.L)
  g.rect(x - 2, y + 6, 5, 1, GOLD.d)
  g.vline(x, y + 7, y + 9, GOLD.b)
}

// ---------------------------------------------------------------------------
// Interior pieces (inside the statue).

/** Painted panels of Guanyin's many forms along the walls. */
export function guanyinMurals(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#fff6ee')
  const n = Math.floor(w / 26)
  for (let i = 0; i < n; i++) {
    const px = x + 4 + i * 26
    g.rect(px, y + 4, 22, h - 10, GOLD.d)
    g.rect(px + 1, y + 5, 20, h - 12, ['#bfe0f0', '#f0d8e8', '#d8f0d8', '#f8ecc8'][i % 4])
    // A tiny white-robed Guanyin in each panel, on a cloud or a dragon or a lotus.
    const fx = px + 11
    const fy = y + h - 12
    g.ellipse(fx, fy, 6, 2, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#6cc38e' : '#ff9fc0')
    g.rect(fx - 2, fy - 9, 5, 8, '#ffffff')
    g.circle(fx, fy - 11, 2, '#ffe7d3')
    g.circle(fx, fy - 12, 4, '#fff3a6')
    g.circle(fx, fy - 11, 2, '#ffe7d3')
    g.px(fx, fy - 13, '#ffffff')
  }
  g.hline(x, x + w - 1, y + h - 3, CHINA_RED.b)
}

/** Elevator doors with a floor indicator (the lift gag). */
export function liftSprite(): Built {
  return bld('hpk:lift', 26, 40, 13, 39, (g) => {
    g.rect(0, 0, 26, 40, '#bdb2ae')
    g.rect(2, 8, 22, 32, '#8a8480')
    g.rect(3, 9, 9, 31, '#c9cfd8')
    g.rect(14, 9, 9, 31, '#c9cfd8')
    g.vline(3, 9, 39, '#ffffff')
    g.vline(14, 9, 39, '#ffffff')
    g.rect(8, 2, 10, 4, '#241a2b')
    g.px(10, 3, '#ff6a4a')
    g.px(12, 3, '#ff6a4a')
    g.px(14, 3, '#ff6a4a')
    g.rect(24, 18, 2, 4, '#ffd23f')
  })
}

export const HPK_ART: Record<string, () => { canvas: HTMLCanvasElement; w: number; h: number }> = {
  guanyin: () => giantGuanyinProp(),
  pedestal: () => guanyinPedestalSprite(),
  pagoda: () => ninePagodaSprite(),
  minichedi: () => miniChediSprite(),
  dragon: () => dragonHeadSprite(),
  lion: () => stoneLionSprite(),
  cauldron: () => cauldronSprite(),
  redcandles: () => redCandleRack(),
  paifang: () => paifangSprite(),
  tea: () => teaStallSprite(),
  bonsai: () => bonsaiSprite(),
  bamboo: () => bambooSprite(),
  lift: () => liftSprite(),
  murals: () => bld('hpk:muraltest', 110, 40, 0, 0, (g) => guanyinMurals(g, 0, 0, 110, 40), false),
}

export { hsh, mixHex }
export type { Color, Ramp }
