// Bronze temple bells drawn at HD resolution (matching the player's doll),
// swinging from a pivot at the crown, with decorative bands and a glow for
// the bell you should strike next.

import { mix, type Surface } from '../../engine/pixel'
import { drawRing } from '../../engine/particles'
import { P } from '../palette'

const BR = { l: '#ffe89a', b: '#e9b44a', s: '#b8742a', d: '#7a4a1e', band: '#fff3a6' }

/**
 * Bell hanging from (x, top). `h` is its height in pixels; `swing` the
 * horizontal offset of the lip (it shears from the crown). `lit` 0..1 warms it.
 */
export function drawTempleBell(g: Surface, x: number, top: number, h: number, swing: number, lit = 0, big = false) {
  const w = Math.round(h * 0.9)
  const crown = Math.max(2, Math.round(h * 0.14))
  // crown loop
  const cy = top
  g.rect(Math.round(x - crown / 2) + Math.round(swing * 0.05), cy, crown, crown, BR.d)
  g.rect(Math.round(x - crown / 2) + 1 + Math.round(swing * 0.05), cy + 1, Math.max(1, crown - 2), Math.max(1, crown - 2), mix(BR.s, '#3a2838', 0.2))
  const bodyTop = cy + crown - 1
  const H = h - crown
  const light = (c: string) => (lit > 0 ? mix(c, '#fff8d8', lit * 0.45) : c)
  for (let r = 0; r <= H; r++) {
    const t = r / H
    let hw: number
    if (t < 0.22) hw = 0.28 + 0.3 * Math.sqrt(t / 0.22)
    else if (t < 0.88) hw = 0.58 + 0.28 * Math.pow((t - 0.22) / 0.66, 1.6)
    else hw = 0.86 + (t - 0.88) * 1.2
    hw = Math.min(1, hw) * (w / 2)
    const off = Math.round(swing * t)
    const y = bodyTop + r
    const x0 = Math.round(x - hw) + off
    const x1 = Math.round(x + hw) + off
    const span = x1 - x0
    if (span <= 0) continue
    const band = (t > 0.3 && t < 0.3 + 2.2 / H) || (t > 0.72 && t < 0.72 + 1.2 / H) || t > 0.9
    for (let xx = x0; xx < x1; xx++) {
      const u = (xx - x0) / span
      let c = u < 0.14 ? BR.l : u < 0.62 ? BR.b : u < 0.86 ? BR.s : BR.d
      if (band) c = u < 0.5 ? (t > 0.9 ? BR.s : BR.band) : t > 0.9 ? BR.d : BR.b
      if (!band && u > 0.2 && u < 0.26) c = '#fff8d8'
      g.px(xx, y, light(c))
    }
    g.px(x0 - 1, y, P.ink)
    g.px(x1, y, P.ink)
  }
  // lip underside and outline top
  const lipOff = Math.round(swing)
  g.hline(Math.round(x - w / 2) + lipOff, Math.round(x + w / 2) + lipOff - 1, bodyTop + H + 1, P.ink)
  if (big) {
    // lotus-petal relief and an inscription band
    const midY = bodyTop + Math.round(H * 0.5)
    for (let i = -3; i <= 3; i++) {
      const px = x + i * (w / 9) + Math.round(swing * 0.5)
      g.px(px, midY, BR.d)
      g.px(px - 1, midY + 1, BR.d)
      g.px(px + 1, midY + 1, BR.d)
    }
    for (let i = 0; i < w * 0.6; i += 3) g.px(Math.round(x - w * 0.3 + i + swing * 0.34), bodyTop + Math.round(H * 0.34) + 1, BR.d)
  }
  // clapper peeking out below
  g.rect(Math.round(x + swing * 1.1) - 1, bodyTop + H + 1, 2, Math.max(1, Math.round(h * 0.08)), '#6e4a35')
}

/** Shrinking cue ring that lands on the bell exactly on the beat. */
export function drawBeatCue(g: Surface, x: number, y: number, phase: number, r0: number) {
  const r = r0 * (1 + (1 - phase) * 1.4)
  g.alpha(0.35 + phase * 0.55)
  drawRing(g, x, y, r, r * 0.9, '#fff3a6')
  drawRing(g, x, y, r + 1, r * 0.9 + 1, '#ffd54f')
  g.alpha(1)
}
