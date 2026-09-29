// ตลาดกิมหยง หาดใหญ่ – the old three-storey market building with its big
// red sign band, the fried-chicken stall (hanging golden chickens and a
// mountain of fried shallots), piles of dates in gold boxes, dried goods,
// a red Chinese shrine and the Hat Yai skyline.

import type { Color, Surface } from '../../engine/pixel'
import { hprop, hsh, mix, ramp, type Goods, type HubProp } from './hub-kit'

/** Kim Yong market building (anchor: centre of the ground-floor front). */
export function kimYongBuilding(night = false): HubProp {
  const W = 240
  const H = 140
  return hprop(`ky:bldg:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const wall = ramp(night ? '#c8bca0' : '#f0e4c4')
    // Main block.
    g.rect(0, 16, W, H - 16, wall.b)
    g.hline(0, W - 1, 16, wall.L)
    g.vline(W - 1, 16, H - 1, wall.D)
    // Vertical fins (brise-soleil) across the upper floors.
    for (let x = 6; x < W - 4; x += 10) {
      g.rect(x, 22, 3, 70, wall.L)
      g.vline(x + 2, 22, 91, wall.d)
    }
    // Upper-floor windows between fins.
    for (let f = 0; f < 2; f++)
      for (let x = 10; x < W - 8; x += 10) {
        const lit = night && hsh(x, f, 3) % 3 !== 0
        g.rect(x, 28 + f * 32, 5, 20, lit ? '#ffe7a8' : '#6a8aa4')
        g.hline(x, x + 4, 28 + f * 32, lit ? '#fff6d6' : '#9fc0d8')
      }
    // Floor ledges.
    g.rect(0, 56, W, 3, wall.d)
    g.rect(0, 88, W, 3, wall.d)
    // Roof parapet with a stepped centre.
    g.rect(W / 2 - 40, 4, 80, 13, wall.b)
    g.hline(W / 2 - 40, W / 2 + 39, 4, wall.L)
    g.rect(W / 2 - 30, 7, 60, 8, '#e8514a')
    for (let i = 0; i < 8; i++) {
      const x = W / 2 - 26 + i * 7
      g.rect(x, 9, 5, 1, '#ffd54f')
      g.rect(x + (i % 2) * 4, 10, 1, 3, '#ffd54f')
    }
    // Big sign band over the entrance.
    g.rect(10, 92, W - 20, 12, '#b8343f')
    g.hline(10, W - 11, 92, '#e8514a')
    g.hline(10, W - 11, 103, '#7e2436')
    for (let i = 0; i < 14; i++) {
      const x = 24 + i * 14
      g.rect(x, 96, 9, 1, '#ffd54f')
      g.rect(x + (i % 3) * 3, 97, 1, 4, '#ffd54f')
      g.px(x + 4, 95, '#ffd54f')
    }
    // Ground floor: wide open market mouth with stalls glowing inside.
    g.rect(8, 104, W - 16, H - 104, night ? '#4a3434' : '#3a2a30')
    for (let x = 12; x < W - 12; x += 16) {
      const c = ['#ffd23f', '#e8514a', '#9a6a45', '#f58f35', '#fffaf0', '#6cc36a'][hsh(x, 9) % 6]
      g.rect(x, 118, 12, 6, c)
      g.rect(x + 1, 116, 10, 2, mix(c, '#ffffff', 0.35))
      g.rect(x, 124, 12, 12, '#6a5048')
      if (night) {
        g.alpha(0.3)
        g.rect(x - 2, 108, 16, 28, '#ffcf7a')
        g.alpha(1)
      }
    }
    // Columns.
    for (let x = 8; x < W; x += 56) {
      g.rect(x, 104, 5, H - 104, wall.b)
      g.vline(x + 4, 104, H - 1, wall.d)
    }
    // Awning strip.
    for (let x = 8; x < W - 8; x++) g.px(x, 104, Math.floor(x / 5) % 2 ? '#3d63b5' : '#fffaf0')
    hooks.lamp = [{ x: 40, y: 110 }, { x: W / 2, y: 110 }, { x: W - 40, y: 110 }]
    hooks.door = [{ x: W / 2, y: H - 1 }]
  })
}

/** Hat Yai fried-chicken counter: golden chickens hanging, a wok, a mound of shallots. */
export function chickenGoods(): Goods {
  return (g, x0, x1, y) => {
    // Mound of fried shallots.
    g.ellipse(x0 + 7, y - 2, 6, 3, '#b87030')
    for (let i = 0; i < 10; i++) g.px(x0 + 2 + (i * 7) % 11, y - 3 - (i % 3), i % 2 ? '#e0a050' : '#8a4a20')
    // Fried chicken pieces on a tray.
    g.rect(x0 + 15, y - 3, x1 - x0 - 16, 3, '#bdb2ae')
    for (let x = x0 + 17; x < x1 - 2; x += 5) {
      g.ellipse(x, y - 4, 2.2, 1.6, '#c86a2a')
      g.px(x - 1, y - 5, '#f0a050')
    }
  }
}

/** Hanging whole fried chickens (back wall). */
export function hangingChickens(): Goods {
  return (g, x0, x1, y) => {
    g.hline(x0, x1, y, '#8a8480')
    for (let x = x0 + 4; x < x1 - 3; x += 8) {
      g.vline(x, y + 1, y + 2, '#8a8480')
      g.ellipse(x, y + 6, 3, 4, '#c86a2a')
      g.px(x - 1, y + 4, '#f0a050')
      g.rect(x - 2, y + 10, 1, 2, '#a85a20')
      g.rect(x + 1, y + 10, 1, 2, '#a85a20')
    }
  }
}

/** Dates in open gold boxes. */
export function datesGoods(): Goods {
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0; x <= x1 - 8; x += 9) {
      g.rect(x, y - 5, 8, 5, k % 2 ? '#ffd54f' : '#e9a53a')
      g.hline(x, x + 7, y - 5, '#fff3a6')
      for (let i = 0; i < 6; i++) g.ellipse(x + 1.5 + (i % 3) * 2.5, y - 6 - Math.floor(i / 3), 1.2, 0.8, i % 2 ? '#6a3020' : '#8a4a2a')
      k++
    }
  }
}

/** Sacks of nuts, spices and dried chilli. */
export function sackGoods(): Goods {
  const fills: Color[] = ['#e0bb8a', '#b8343f', '#f5c840', '#8a4a2a', '#6cc36a', '#fffaf0']
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0 + 3; x <= x1 - 3; x += 7) {
      g.rect(x - 3, y - 6, 6, 6, '#c9b08a')
      g.hline(x - 3, x + 2, y - 6, '#e0c8a0')
      g.ellipse(x, y - 6, 2.6, 1.2, fills[k % fills.length])
      g.px(x - 1, y - 7, mix(fills[k % fills.length], '#ffffff', 0.4))
      k++
    }
  }
}

/** Red Chinese shrine (ศาลเจ้า) with a curved roof and lanterns (anchor: centre ground). */
export function chineseShrine(night = false): HubProp {
  const W = 70
  const H = 66
  return hprop(`ky:shrine:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    g.rect(4, H - 8, W - 8, 8, '#d8cfc4')
    g.hline(4, W - 5, H - 8, '#f0e8dc')
    g.rect(10, 28, W - 20, H - 36, '#b8343f')
    g.rect(W - 18, 28, 8, H - 36, '#8a2335')
    g.rect(cx - 9, 34, 18, H - 42, night ? '#ffcf7a' : '#6a2030')
    g.rect(cx - 7, 36, 14, H - 44, night ? '#ffe7a8' : '#3a1820')
    g.circle(cx, 44, 3, '#ffd54f')
    for (const x of [14, W - 20]) {
      g.rect(x, 30, 5, H - 38, '#e8514a')
      g.vline(x + 1, 30, H - 9, '#ff8a70')
    }
    // Swallow-tail roof (curved ridge) in green tiles with gold dragons.
    const RF = ramp('#3f9a6b')
    for (let y = 12; y < 28; y++) {
      const half = 30 + (y - 12) * 0.5
      g.hline(Math.round(cx - half), Math.round(cx + half), y, y % 3 === 0 ? RF.d : RF.b)
    }
    g.hline(cx - 38, cx + 38, 27, RF.D)
    g.rect(cx - 24, 9, 48, 3, '#ffd54f')
    g.line(cx - 24, 9, cx - 32, 3, '#ffd54f')
    g.line(cx + 24, 9, cx + 32, 3, '#ffd54f')
    g.circle(cx, 7, 3, '#e8514a')
    g.px(cx, 3, '#ffd54f')
    // Name board.
    g.rect(cx - 12, 29, 24, 5, '#1e1a20')
    for (let x = cx - 9; x < cx + 9; x += 5) g.rect(x, 31, 3, 1, '#ffd54f')
    hooks.lanterns = [{ x: 12, y: 32 }, { x: W - 12, y: 32 }]
    hooks.urn = [{ x: cx, y: H - 4 }]
  })
}

/** Hat Yai skyline (baked into the sky band). */
export function hatYaiSkyline(g: Surface, y0: number, y1: number, w: number, night: boolean) {
  const far = night ? '#3a3f6a' : '#b8c4d8'
  const mid = night ? '#4a4f7a' : '#a0b0c8'
  for (let x = 0; x < w; x += 9) {
    const h = 14 + (hsh(x, 7) % 34)
    const bw = 7 + (hsh(x, 8) % 6)
    g.rect(x, y1 - h, bw, h, far)
    if (night) for (let yy = y1 - h + 2; yy < y1 - 2; yy += 3) for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (hsh(xx, yy, 2) % 3 === 0) g.px(xx, yy, '#ffe7a8')
  }
  for (let x = 0; x < w; x += 14) {
    const h = 8 + (hsh(x, 3) % 14)
    g.rect(x, y1 - h, 12, h, mid)
  }
  // A cable-car style hill (Hat Yai park) far right.
  g.ellipse(w - 40, y1, 50, 18, night ? '#2e4a4a' : '#6a9a78')
  void y0
}

/** Little push-cart for roti with a flat griddle. */
export function rotiGoods(): Goods {
  return (g, x0, x1, y) => {
    g.rect(x0 + 1, y - 3, 14, 3, '#3a3040')
    g.ellipse(x0 + 8, y - 3, 6, 1.4, '#e0a050')
    for (let x = x0 + 18; x < x1 - 2; x += 5) {
      g.rect(x, y - 4, 4, 4, '#fffaf0')
      g.px(x + 1, y - 3, '#f0c878')
    }
  }
}
