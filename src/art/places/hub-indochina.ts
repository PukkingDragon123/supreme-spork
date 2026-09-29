// ตลาดอินโดจีน มุกดาหาร – the Mekong with Savannakhet (Laos) on the far bank
// and the Second Friendship Bridge, the riverside promenade, the Mukdahan
// Tower (หอแก้วมุกดาหาร) with its glass top, mookata tables and a silk loom.

import type { Surface } from '../../engine/pixel'
import { ditherOn } from '../../engine/pixel'
import { hprop, hsh, INK, mix, ramp, type HubProp } from './hub-kit'

/** The Mekong: wide, silty and fast, with current streaks (baked). */
export function mekong(g: Surface, y0: number, y1: number, w: number, night: boolean) {
  const deep = night ? '#2a3a5a' : '#8a7a5a'
  const mid = night ? '#34466a' : '#a8946a'
  const light = night ? '#5a6a8a' : '#c8b488'
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / (y1 - y0)
    const c = mix(night ? '#3a4a70' : '#b09c70', mid, f)
    g.hline(0, w - 1, y, c)
  }
  for (let j = y0; j < y1; j++)
    for (let i = 0; i < w; i++) {
      const n = Math.sin(i * 0.05 + j * 0.3) + Math.sin(j * 0.17 - i * 0.02)
      if (n > 1.5 && ditherOn(i, j, 0.5)) g.px(i, j, light)
      else if (n < -1.4 && ditherOn(i, j, 0.5)) g.px(i, j, deep)
    }
  for (let k = 0; k < (w * (y1 - y0)) / 50; k++) {
    const v = hsh(k, 41, 2)
    const x = v % w
    const y = y0 + ((v * 7 + k * 17) % (y1 - y0))
    g.hline(x, x + 3 + (k % 4), y, k % 3 ? light : night ? '#8a9ac0' : '#e8dcb8')
  }
}

/** Savannakhet on the far bank: trees, roofs, a gold stupa and the bridge (baked). */
export function farBank(g: Surface, y0: number, y1: number, w: number, night: boolean) {
  const tree = night ? '#2a4a3a' : '#5e8a5a'
  const treeL = night ? '#3a5a4a' : '#7aa86a'
  g.rect(0, y1 - 8, w, 8, night ? '#4a4050' : '#b8a888')
  for (let x = 0; x < w; x += 6) {
    const h = 8 + (hsh(x, 5) % 10)
    g.circle(x + 3, y1 - 8 - h / 2, 5, tree)
    g.px(x + 2, y1 - 11 - h / 2, treeL)
  }
  // Low buildings and a gold stupa.
  for (let x = 20; x < w - 40; x += 34) {
    const bw = 12 + (hsh(x, 3) % 10)
    g.rect(x, y1 - 20, bw, 10, night ? '#6a6070' : '#e8e0d4')
    g.poly([[x - 1, y1 - 20], [x + bw / 2, y1 - 26], [x + bw + 1, y1 - 20]], night ? '#6a4a4a' : '#c8543a')
    if (night) g.px(x + 3, y1 - 16, '#ffe7a8')
  }
  const sx = Math.round(w * 0.4)
  for (let i = 0; i < 16; i++) g.hline(sx - Math.round((1 - i / 16) * 5), sx + Math.round((1 - i / 16) * 5), y1 - 12 - i, night ? '#c9b070' : '#ffd54f')
  // The Second Friendship Bridge far to the right.
  const by = y0 + 10
  g.hline(w - 120, w - 1, by, night ? '#8a86a0' : '#e8e4ec')
  g.hline(w - 120, w - 1, by + 1, night ? '#5a5670' : '#b8b4c4')
  for (let x = w - 116; x < w; x += 14) {
    g.vline(x, by + 2, y1 - 6, night ? '#6a6680' : '#c8c4d0')
    for (let k = 0; k < 12; k++) g.px(x + k, by + 2 + Math.round(Math.sin((k / 12) * Math.PI) * 3), night ? '#6a6680' : '#d0ccd8')
  }
  if (night) for (let x = w - 118; x < w; x += 6) g.px(x, by - 1, '#fff3a6')
}

/** Mukdahan Tower (หอแก้วมุกดาหาร): white nine-sided shaft, glass top (anchor: centre ground). */
export function mukdahanTower(night = false): HubProp {
  const W = 56
  const H = 178
  return hprop(`ic:tower:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const WH = ramp('#fbf6ee')
    // Wide base pavilion with steps.
    g.rect(2, H - 20, W - 4, 20, WH.b)
    g.rect(W - 14, H - 20, 12, 20, WH.d)
    g.hline(2, W - 3, H - 20, WH.L)
    for (let x = 6; x < W - 6; x += 7) g.rect(x, H - 16, 4, 10, night ? '#ffe7a8' : '#8fb6d0')
    g.rect(0, H - 4, W, 4, '#e0d8cc')
    // Shaft (slightly tapering, faceted).
    for (let y = 44; y < H - 20; y++) {
      const f = (y - 44) / (H - 64)
      const half = 7 + f * 3
      g.hline(Math.round(cx - half), Math.round(cx + half), y, WH.b)
      g.hline(Math.round(cx + half * 0.25), Math.round(cx + half), y, WH.d)
      g.px(Math.round(cx - half * 0.5), y, WH.L)
      g.px(Math.round(cx + half), y, WH.D)
    }
    for (let y = 60; y < H - 24; y += 22) g.hline(cx - 9, cx + 9, y, '#e8b830')
    // The observation deck: a glass drum.
    g.rect(cx - 14, 30, 28, 14, night ? '#fff6c8' : '#9fd8f0')
    for (let x = cx - 13; x < cx + 14; x += 4) g.vline(x, 31, 43, night ? '#e8d890' : '#6ab0d0')
    g.hline(cx - 15, cx + 14, 30, WH.L)
    g.hline(cx - 15, cx + 14, 44, WH.D)
    // Crystal ball on top with a gold spire.
    g.circle(cx, 20, 10, night ? '#e8f4ff' : '#c8e8f8')
    g.circle(cx, 20, 9, night ? '#fffaf0' : '#dff4ff')
    g.circle(cx - 3, 17, 3, '#ffffff')
    g.ellipse(cx, 29, 11, 2, '#e8b830')
    g.vline(cx, 2, 10, '#ffd54f')
    g.px(cx, 1, '#fff3a6')
    hooks.ball = [{ x: cx, y: 20 }]
    hooks.deck = [{ x: cx, y: 37 }]
  })
}

/** A mookata (หมูกระทะ) table: dome grill with a soup moat, stools, plates (anchor: centre). */
export function mookataTable(seed = 0): HubProp {
  return hprop(`ic:mookata:${seed}`, 36, 22, 18, 21, (g, hooks) => {
    for (const x of [2, 30]) {
      g.ellipse(x + 2, 15, 2.5, 1.2, seed % 2 ? '#e8514a' : '#3d63b5')
      g.rect(x + 1, 16, 1, 4, INK)
      g.rect(x + 3, 16, 1, 4, INK)
    }
    g.rect(7, 8, 22, 4, '#fffaf0')
    g.hline(7, 28, 8, '#ffffff')
    g.rect(8, 12, 1, 8, '#8a8480')
    g.rect(27, 12, 1, 8, '#8a8480')
    // Charcoal bucket + dome.
    g.ellipse(18, 8, 7, 2.6, '#8a8480')
    g.ellipse(18, 7.5, 6, 2, '#e0bb8a')
    g.ellipse(18, 6, 4, 2.4, '#5a5566')
    g.px(17, 5, '#8c8187')
    for (let i = 0; i < 5; i++) g.px(15 + i * 1.5, 6 - (i % 2), '#e8a0a0')
    // Plates of pork and veg.
    g.ellipse(10, 9, 2, 1, '#e8a0a0')
    g.ellipse(26, 9, 2, 1, '#6cc36a')
    hooks.smoke = [{ x: 18, y: 3 }]
  })
}

/** A wooden silk loom (anchor: centre ground). */
export function loomSprite(): HubProp {
  return hprop('ic:loom', 40, 30, 20, 29, (g) => {
    const T = ramp('#8a5a3a')
    g.rect(2, 4, 2, 25, T.b)
    g.rect(36, 4, 2, 25, T.b)
    g.rect(2, 4, 36, 2, T.L)
    g.rect(4, 12, 32, 1, T.d)
    // Warp threads and the woven cloth.
    for (let x = 6; x < 34; x += 2) g.vline(x, 6, 16, '#f0e0c8')
    for (let y = 16; y < 24; y++) for (let x = 6; x < 34; x++) g.px(x, y, (Math.floor(x / 3) + y) % 4 === 0 ? '#ffd54f' : y % 3 === 0 ? '#3d63b5' : '#b8343f')
    g.rect(4, 24, 32, 2, T.d)
    g.rect(4, 27, 32, 2, T.D)
  })
}
