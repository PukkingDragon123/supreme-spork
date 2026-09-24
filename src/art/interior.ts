// Inside the ordination hall: the principal Buddha image, altar, candles,
// murals and warm window light. Drawn respectfully and without cartooning
// the Buddha image itself.

import type { Color, Surface } from '../engine/pixel'
import { P } from './palette'
import { mixHex } from './characters'

export interface GoldPalette {
  base: Color
  light: Color
  dark: Color
  deep: Color
  line: Color
}

export const GOLD: GoldPalette = { base: '#ffd54f', light: '#fff3a6', dark: '#e9a53a', deep: '#b8742a', line: '#9a5a22' }
export const BRONZE: GoldPalette = { base: '#a8805a', light: '#c9a17a', dark: '#8a6444', deep: '#6a4a34', line: '#553a2a' }

/**
 * Seated Buddha image (meditation posture). (cx, baseY) is where the crossed
 * legs rest on the lotus base. `s` scales the whole figure.
 */
export function drawBuddha(g: Surface, cx: number, baseY: number, s = 1, pal: GoldPalette = GOLD) {
  const X = (v: number) => cx + v * s
  const Y = (v: number) => baseY - v * s
  // Crossed legs / lap.
  g.poly(
    [
      [X(-29), Y(0)],
      [X(29), Y(0)],
      [X(27), Y(7)],
      [X(20), Y(13)],
      [X(-20), Y(13)],
      [X(-27), Y(7)],
    ],
    pal.base,
  )
  g.poly(
    [
      [X(6), Y(0)],
      [X(29), Y(0)],
      [X(27), Y(7)],
      [X(20), Y(13)],
      [X(8), Y(12)],
    ],
    pal.dark,
  )
  // Folds of the robe over the legs.
  g.line(X(-24), Y(4), X(-6), Y(8), pal.dark)
  g.line(X(6), Y(8), X(24), Y(4), pal.deep)
  // Torso.
  g.poly(
    [
      [X(-15), Y(12)],
      [X(15), Y(12)],
      [X(17), Y(36)],
      [X(12), Y(43)],
      [X(-12), Y(43)],
      [X(-17), Y(36)],
    ],
    pal.base,
  )
  // Robe covering the image's left shoulder (viewer's right).
  g.poly(
    [
      [X(-14), Y(26)],
      [X(10), Y(43)],
      [X(12), Y(43)],
      [X(17), Y(36)],
      [X(15), Y(12)],
      [X(-6), Y(12)],
    ],
    pal.dark,
  )
  // Sash (สังฆาฏิ) hanging from the shoulder.
  g.poly(
    [
      [X(4), Y(42)],
      [X(9), Y(42)],
      [X(8), Y(18)],
      [X(4), Y(16)],
    ],
    pal.deep,
  )
  g.line(X(-14), Y(26), X(10), Y(43), pal.line)
  // Arms resting on the lap.
  g.poly(
    [
      [X(-17), Y(36)],
      [X(-22), Y(28)],
      [X(-22), Y(15)],
      [X(-15), Y(11)],
      [X(-14), Y(20)],
    ],
    pal.base,
  )
  g.poly(
    [
      [X(17), Y(36)],
      [X(22), Y(28)],
      [X(22), Y(15)],
      [X(15), Y(11)],
      [X(14), Y(20)],
    ],
    pal.dark,
  )
  // Hands in meditation.
  g.ellipse(X(0), Y(13), 8 * s, 2.6 * s, pal.light)
  g.ellipse(X(0), Y(12.5), 6 * s, 1.6 * s, pal.base)
  // Neck.
  g.rect(X(-4), Y(47), 8 * s, 5 * s, pal.base)
  g.hline(X(-4), X(3), Y(45), pal.dark)
  // Ears (long lobes).
  g.rect(X(-11), Y(60), 3 * s, 12 * s, pal.dark)
  g.rect(X(8), Y(60), 3 * s, 12 * s, pal.deep)
  // Head.
  g.ellipse(X(0), Y(56), 9.2 * s, 10.5 * s, pal.base)
  g.ellipse(X(2), Y(55), 7 * s, 9 * s, mixHex(pal.base, pal.dark, 0.35))
  g.ellipse(X(-1), Y(56), 7 * s, 9.4 * s, pal.base)
  // Hair curls.
  for (let yy = 62; yy <= 67; yy += 2)
    for (let xx = -8; xx <= 8; xx += 2) {
      const inHead = (xx * xx) / 81 + ((yy - 56) * (yy - 56)) / 110 <= 1
      if (inHead && yy >= 62) g.px(X(xx + ((yy / 2) % 2)), Y(yy), pal.dark)
    }
  // Ushnisha and flame finial (รัศมี).
  g.ellipse(X(0), Y(67), 4.5 * s, 2.6 * s, pal.base)
  g.poly(
    [
      [X(-3), Y(68)],
      [X(0), Y(80)],
      [X(1.5), Y(77)],
      [X(3), Y(68)],
    ],
    pal.base,
  )
  g.line(X(0), Y(79), X(0), Y(69), pal.light)
  // Serene face: downcast eyes, brows, nose and a gentle smile.
  g.line(X(-6), Y(58.5), X(-2), Y(58), pal.line)
  g.line(X(2), Y(58), X(6), Y(58.5), pal.line)
  g.line(X(-5), Y(55.5), X(-2), Y(55.5), pal.deep)
  g.line(X(2), Y(55.5), X(5), Y(55.5), pal.deep)
  g.vline(X(0), Y(56), Y(52), pal.dark)
  g.line(X(-2), Y(49.5), X(2), Y(49.5), pal.deep)
  // Highlights.
  g.px(X(-5), Y(62), pal.light)
  g.px(X(-4), Y(63), pal.light)
  g.line(X(-12), Y(40), X(-15), Y(33), pal.light)
  g.line(X(-24), Y(8), X(-18), Y(11), pal.light)
}

/** Back view of the image (for applying gold leaf behind it – ปิดทองหลังพระ). */
export function drawBuddhaBack(g: Surface, cx: number, baseY: number, s = 1, pal: GoldPalette = GOLD) {
  const X = (v: number) => cx + v * s
  const Y = (v: number) => baseY - v * s
  g.poly(
    [
      [X(-29), Y(0)],
      [X(29), Y(0)],
      [X(24), Y(10)],
      [X(-24), Y(10)],
    ],
    pal.dark,
  )
  g.poly(
    [
      [X(-17), Y(8)],
      [X(17), Y(8)],
      [X(20), Y(36)],
      [X(13), Y(44)],
      [X(-13), Y(44)],
      [X(-20), Y(36)],
    ],
    pal.base,
  )
  g.line(X(-16), Y(38), X(12), Y(12), pal.dark)
  g.line(X(-15), Y(37), X(13), Y(11), pal.dark)
  g.rect(X(-4), Y(48), 8 * s, 5 * s, pal.base)
  g.rect(X(-11), Y(60), 3 * s, 11 * s, pal.dark)
  g.rect(X(8), Y(60), 3 * s, 11 * s, pal.dark)
  g.ellipse(X(0), Y(57), 9.4 * s, 10.5 * s, pal.base)
  for (let yy = 49; yy <= 66; yy += 2)
    for (let xx = -8; xx <= 8; xx += 2) {
      const inHead = (xx * xx) / 85 + ((yy - 57) * (yy - 57)) / 112 <= 1
      if (inHead) g.px(X(xx + ((yy / 2) % 2)), Y(yy), pal.dark)
    }
  g.ellipse(X(0), Y(67), 4.5 * s, 2.6 * s, pal.base)
  g.poly(
    [
      [X(-3), Y(68)],
      [X(0), Y(80)],
      [X(1.5), Y(77)],
      [X(3), Y(68)],
    ],
    pal.base,
  )
}

/** Lotus throne and tiered golden altar (ฐานชุกชี) under the image. */
export function drawAltar(g: Surface, cx: number, topY: number, w: number, s = 1) {
  // Lotus petals.
  const pw = Math.round(64 * s)
  for (let i = 0; i < 9; i++) {
    const x = cx - pw / 2 + (i + 0.5) * (pw / 9)
    g.poly(
      [
        [x - 4 * s, topY + 8 * s],
        [x, topY],
        [x + 4 * s, topY + 8 * s],
      ],
      i % 2 ? '#f7b3c8' : '#ffd6e0',
    )
    g.px(x, topY + 2 * s, '#fff3f6')
  }
  g.rect(cx - pw / 2, topY + 8 * s, pw, 3 * s, GOLD.dark)
  // Tiers.
  let y = topY + 11 * s
  const tiers = [0.62, 0.78, 1]
  for (const f of tiers) {
    const tw = Math.round(w * f)
    const th = Math.round(9 * s)
    g.rect(cx - tw / 2, y, tw, th, P.redD)
    g.rect(cx - tw / 2, y, tw, Math.max(1, Math.round(s)), GOLD.base)
    g.rect(cx - tw / 2, y + th - Math.max(1, Math.round(s)), tw, Math.max(1, Math.round(s)), GOLD.dark)
    for (let x = cx - tw / 2 + 3; x < cx + tw / 2 - 2; x += 5) {
      g.px(x, y + Math.round(th / 2), GOLD.base)
      g.px(x + 1, y + Math.round(th / 2) - 1, GOLD.dark)
    }
    y += th
  }
  return y
}

/** Golden arch frame behind the image (ซุ้มเรือนแก้ว) with naga ends. */
export function drawArch(g: Surface, cx: number, baseY: number, halfW: number, h: number) {
  for (let t = 0; t <= 1; t += 0.004) {
    const a = Math.PI * t
    const x = cx - Math.cos(a) * halfW
    const y = baseY - Math.sin(a) * h - Math.max(0, 1 - Math.abs(t - 0.5) * 6) * 8
    g.rect(x - 1, y - 1, 3, 3, GOLD.dark)
    g.px(x, y, GOLD.base)
  }
  for (let t = 0; t <= 1; t += 0.05) {
    const a = Math.PI * t
    const x = cx - Math.cos(a) * (halfW + 3)
    const y = baseY - Math.sin(a) * (h + 3) - Math.max(0, 1 - Math.abs(t - 0.5) * 6) * 8
    g.px(x, y - 1, GOLD.light)
    g.px(x, y - 2, GOLD.base)
  }
  // Naga heads at the ends.
  for (const side of [-1, 1]) {
    const x = cx + side * halfW
    g.rect(x - 3, baseY - 8, 6, 8, GOLD.base)
    g.rect(x - 4, baseY - 12, 8, 5, GOLD.dark)
    g.px(x - 2 * side, baseY - 10, P.ink)
  }
}

export function drawCandle(g: Surface, x: number, baseY: number, h: number, t: number, lit = true) {
  g.rect(x - 1, baseY - h, 3, h, '#fff3d6')
  g.rect(x + 1, baseY - h, 1, h, '#e8d6b0')
  if (!lit) return
  const f = Math.sin(t * 13 + x) > 0 ? 0 : 1
  g.px(x, baseY - h - 1, '#ffb347')
  g.px(x, baseY - h - 2 - f, '#ffd54f')
  g.px(x, baseY - h - 3 - f, '#fff3a6')
  g.px(x + (f ? 1 : 0), baseY - h - 4, '#fff3a6')
}

export function drawCandleStand(g: Surface, x: number, baseY: number, t: number) {
  g.rect(x - 1, baseY - 34, 2, 34, GOLD.dark)
  g.rect(x - 6, baseY - 2, 12, 2, GOLD.deep)
  g.rect(x - 4, baseY - 36, 8, 2, GOLD.base)
  drawCandle(g, x, baseY - 36, 10, t)
}

export function drawVase(g: Surface, x: number, baseY: number, flower: Color) {
  g.rect(x - 2, baseY - 7, 5, 7, GOLD.base)
  g.rect(x + 1, baseY - 7, 2, 7, GOLD.dark)
  g.rect(x - 3, baseY - 8, 7, 1, GOLD.dark)
  g.vline(x, baseY - 12, baseY - 8, P.leaf)
  g.circle(x - 2, baseY - 12, 2, flower)
  g.circle(x + 2, baseY - 13, 2, flower)
  g.circle(x, baseY - 15, 2, mixHex(flower, '#ffffff', 0.3))
}

/** Full hall interior background sized to the stage. Returns layout anchors. */
export function drawHallInterior(g: Surface, w: number, h: number, t: number) {
  const wall = '#8e2a3c'
  const wallD = '#6e1f30'
  g.rect(0, 0, w, h, wall)
  // Gold diamond wallpaper.
  for (let y = 4; y < h * 0.62; y += 8)
    for (let x = ((y / 8) % 2) * 4; x < w; x += 8) {
      g.px(x, y, '#c9853a')
      g.px(x - 1, y + 1, '#a66a36')
      g.px(x + 1, y + 1, '#a66a36')
    }
  // Murals on the side walls.
  const mw = Math.max(24, Math.round(w * 0.18))
  const my = Math.round(h * 0.14)
  const mh = Math.round(h * 0.22)
  for (const x0 of [11, w - mw - 11]) {
    g.rect(x0, my, mw, mh, '#f6e7c1')
    g.rect(x0, my + mh * 0.55, mw, mh * 0.45, '#b9d79a')
    g.rect(x0, my, mw, mh * 0.35, '#bfe0f0')
    for (let i = 0; i < 4; i++) {
      const px = x0 + 4 + ((i * 11) % (mw - 8))
      g.rect(px, my + mh * 0.5, 2, 4, i % 2 ? P.red : P.blue)
      g.px(px, my + mh * 0.5 - 1, '#f0c9a0')
    }
    g.poly(
      [
        [x0 + mw * 0.2, my + mh * 0.55],
        [x0 + mw * 0.45, my + mh * 0.28],
        [x0 + mw * 0.7, my + mh * 0.55],
      ],
      '#7fae6a',
    )
    g.frame(x0 - 1, my - 1, mw + 2, mh + 2, GOLD.dark)
  }
  // Windows with light beams.
  const wy = Math.round(h * 0.42)
  for (const x0 of [12, w - 26]) {
    g.rect(x0, wy, 14, 20, '#ffe7a8')
    g.rect(x0 + 6, wy, 2, 20, GOLD.deep)
    g.frame(x0 - 1, wy - 1, 16, 22, GOLD.dark)
  }
  // Floor.
  const fy = Math.round(h * 0.62)
  g.rect(0, fy, w, h - fy, '#9a6a45')
  for (let y = fy + 3; y < h; y += 6) g.hline(0, w - 1, y, '#8a5c3b')
  g.rect(0, fy - 2, w, 2, wallD)
  // Red carpet runner.
  const cw = Math.round(w * 0.46)
  g.poly(
    [
      [w / 2 - cw * 0.35, fy],
      [w / 2 + cw * 0.35, fy],
      [w / 2 + cw / 2, h],
      [w / 2 - cw / 2, h],
    ],
    '#b8343f',
  )
  g.line(w / 2 - cw * 0.35 + 2, fy, w / 2 - cw / 2 + 2, h, GOLD.base)
  g.line(w / 2 + cw * 0.35 - 2, fy, w / 2 + cw / 2 - 2, h, GOLD.base)
  // Columns.
  for (const x of [2, w - 8]) {
    g.rect(x, 0, 6, fy, '#f3e3c3')
    g.rect(x + 4, 0, 2, fy, '#d8c3a0')
    g.rect(x - 1, fy - 6, 8, 6, GOLD.dark)
    for (let y = 10; y < fy - 10; y += 14) g.rect(x + 1, y, 4, 2, GOLD.base)
  }
  void t
  return { floorY: fy }
}

/** Soft diagonal light beams and dust motes on top of the scene. */
export function drawLightBeams(g: Surface, w: number, h: number, t: number) {
  g.ctx.save()
  g.ctx.globalAlpha = 0.12
  g.ctx.fillStyle = '#fff3c4'
  const wy = Math.round(h * 0.42)
  for (const [x0, dir] of [
    [12, 1],
    [w - 26, -1],
  ] as [number, number][]) {
    g.ctx.beginPath()
    g.ctx.moveTo(x0, wy)
    g.ctx.lineTo(x0 + 14, wy)
    g.ctx.lineTo(x0 + 14 + dir * 40, h)
    g.ctx.lineTo(x0 + dir * 40, h)
    g.ctx.closePath()
    g.ctx.fill()
  }
  g.ctx.restore()
  for (let i = 0; i < 10; i++) {
    const x = (i * 37 + t * 3 * (i % 2 ? 1 : -1)) % w
    const y = h * 0.45 + ((i * 53 + t * 4) % (h * 0.5))
    if (Math.sin(t * 2 + i) > 0) g.px((x + w) % w, y, '#fff3c4')
  }
}
