// HD monk (พระ) on his alms round, drawn at the same resolution as the
// player's doll so the two read well side by side in ตักบาตร: side view
// walking with the covered bowl, receiving (lid off), and front view for the
// blessing. Novices (สามเณร) are a little shorter.

import { createCanvas, mix, Surface } from '../../engine/pixel'
import { cached, outlineCanvas, type Sprite } from '../../engine/sprite'
import { P, SKIN_TONES } from '../palette'

export type HdMonkFrame = 'stand' | 'walk1' | 'walk2' | 'receive' | 'bless' | 'chant'

export const HD_MONK_W = 32
export const HD_MONK_H = 54

const O = '#ee9136'
const OL = '#ffb35c'
const OD = '#c7661f'
const ODD = '#9e4f1a'
const BOWL = '#3d3445'
const BOWL_L = '#6d6478'
const BOWL_D = '#2a2230'
const STRAP = '#a8561d'

/**
 * Side view faces left (flip for right). `fill` 0..3 shows food in the open
 * bowl while receiving.
 */
export function hdMonkSprite(view: 'side' | 'front', frame: HdMonkFrame, o: { skin?: number; novice?: boolean; flip?: boolean; fill?: number } = {}): Sprite {
  const fill = Math.min(3, o.fill ?? 0)
  const key = `hdmonk:${view}:${frame}:${o.skin ?? 1}:${o.novice ? 1 : 0}:${o.flip ? 1 : 0}:${frame === 'receive' ? fill : 0}`
  return cached(key, () => {
    const W = HD_MONK_W - 2
    const H = HD_MONK_H - 2
    const g = new Surface(W, H)
    const sk = SKIN_TONES[o.skin ?? 1]
    if (view === 'side') drawSide(g, sk, frame, fill)
    else drawFront(g, sk, frame)
    let c = g.canvas
    if (o.novice) c = shorten(c, 31, 4)
    const out = outlineCanvas(c, P.ink)
    if (!o.flip) return out
    const f = createCanvas(out.w, out.h)
    const ctx = f.getContext('2d')!
    ctx.translate(out.w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(out.canvas, 0, 0)
    return { canvas: f, w: out.w, h: out.h }
  })
}

/** Where the bowl mouth is, in sprite pixels (side view facing left, before flip). */
export function hdMonkBowl(novice = false): [number, number] {
  return [8, novice ? 30 : 26]
}

type Skin = (typeof SKIN_TONES)[number]

const HR = 9 // chibi head radius, to match the doll's big head

function head(g: Surface, sk: Skin, cx: number, cy: number, side: boolean) {
  g.ellipse(cx, cy, HR, HR - 0.2, sk.b)
  // shaved scalp: a faint cool tint on the crown
  for (let y = Math.floor(cy - HR); y < cy - 3; y++)
    for (let x = Math.floor(cx - HR); x < cx + HR; x++) {
      const dx = (x + 0.5 - cx) / HR
      const dy = (y + 0.5 - cy) / HR
      if (dx * dx + dy * dy < 0.92 && (x + y) % 2 === 0) g.px(x, y, mix(sk.b, '#7a6a86', 0.28))
    }
  // back-of-head shade
  for (let y = Math.floor(cy - HR + 1); y < cy + HR; y++) {
    const dy = (y + 0.5 - cy) / HR
    if (Math.abs(dy) > 1) continue
    const xr = Math.round(cx + HR * Math.sqrt(1 - dy * dy)) - 1
    g.px(xr, y, sk.d)
    if (y > cy + 2) g.px(xr - 1, y, mix(sk.b, sk.d, 0.5))
    if (!side) g.px(Math.round(cx - HR * Math.sqrt(1 - dy * dy)), y, mix(sk.b, sk.d, 0.4))
  }
  g.px(cx - 4, cy - 6, mix(sk.b, '#ffffff', 0.45))
  g.px(cx - 3, cy - 6, mix(sk.b, '#ffffff', 0.3))
  g.px(cx - 4, cy - 5, mix(sk.b, '#ffffff', 0.3))
}

function drawSide(g: Surface, sk: Skin, frame: HdMonkFrame, fill: number) {
  const bob = frame === 'walk2' ? -1 : 0
  // feet
  const foot = (x: number, y: number, raised = false) => {
    g.rect(x, y, 5, 2, sk.b)
    g.rect(x + 3, y, 2, 2, sk.d)
    if (raised) g.px(x + 4, y - 1, sk.d)
  }
  if (frame === 'walk1') {
    foot(5, 50)
    foot(17, 49, true)
  } else if (frame === 'walk2') {
    foot(10, 50)
    foot(13, 50)
  } else {
    foot(9, 50)
    foot(14, 50)
  }
  // robe body (both shoulders covered for the alms round)
  const hemL = frame === 'walk1' ? 7 : 8
  const hemR = frame === 'walk1' ? 24 : 23
  g.poly(
    [
      [10, 17 + bob],
      [21, 17 + bob],
      [hemR, 50],
      [hemL, 50],
    ],
    O,
  )
  g.ellipse(15.5, 19.5 + bob, 6.8, 3.4, O)
  // shade along the back, light along the front
  for (let y = 17 + bob; y < 50; y++) {
    const t = (y - 17 - bob) / (33 - bob)
    const xr = Math.round(21 + (hemR - 21) * t)
    const xl = Math.round(10 + (hemL - 10) * t)
    g.rect(xr - 3, y, 3, 1, OD)
    g.px(xl, y, OL)
    if (y > 20) g.px(xl + 1, y, y % 3 === 0 ? OL : O)
  }
  g.rect(hemL, 48, hemR - hemL, 2, OD)
  g.hline(hemL + 1, hemR - 1, 49, ODD)
  // cloth folds sweeping from the shoulder
  g.line(19, 20 + bob, 13, 34, OD)
  g.line(20, 26 + bob, 15, 44, OD)
  g.line(18, 21 + bob, 12, 33, OL)
  // shoulder strap of the bowl sling
  g.line(19, 18 + bob, 9, 27 + bob, STRAP)
  g.line(20, 18 + bob, 10, 27 + bob, ODD)
  // bowl held at the belly, in front (left)
  const by = 30 + bob
  g.ellipse(7.5, by, 6.2, 5, BOWL)
  g.ellipse(6, by - 1.5, 3.4, 2.2, BOWL_L)
  g.px(4, by - 2, '#9a91a4')
  g.hline(3, 11, by + 4, BOWL_D)
  if (frame === 'receive') {
    // lid off: the dark mouth, maybe some food
    g.ellipse(7.5, by - 4.4, 5.6, 1.9, BOWL_D)
    g.hline(3, 12, by - 3, BOWL_L)
    if (fill > 0) {
      g.ellipse(7.5, by - 4.8, 4.2, 1.2, '#fffaf0')
      if (fill > 1) g.px(6, by - 5, '#ffd54f')
      if (fill > 2) g.px(9, by - 5, '#6cc36a')
    }
  } else {
    // domed lid with a knob
    g.ellipse(7.5, by - 4.6, 5.4, 2, '#4d4458')
    g.hline(4, 10, by - 5, BOWL_L)
    g.rect(7, by - 7, 2, 1, BOWL_L)
  }
  // forearm and hand over the rim
  g.rect(11, by - 3, 4, 3, O)
  g.rect(12, by - 1, 3, 3, sk.b)
  g.px(14, by + 1, sk.d)
  g.rect(2, by - 1, 2, 3, sk.b)
  // neck + head (facing left)
  g.rect(14, 16 + bob, 4, 3, sk.d)
  head(g, sk, 14.5, 9.5 + bob, true)
  // ear
  g.rect(18, 9 + bob, 2, 4, sk.d)
  g.px(18, 10 + bob, sk.b)
  g.px(18, 11 + bob, sk.b)
  // face
  const eyeOpen = frame !== 'receive'
  if (eyeOpen) {
    g.rect(8, 9 + bob, 2, 3, P.ink)
    g.px(8, 9 + bob, '#7a5a6a')
  } else {
    g.hline(7, 9, 11 + bob, P.ink)
    g.px(6, 10 + bob, P.ink)
  }
  g.rect(10, 13 + bob, 2, 1, P.blush)
  g.hline(6, 7, 15 + bob, '#b8606a')
  g.px(5, 11 + bob, sk.b)
  g.px(5, 12 + bob, sk.d)
}

function drawFront(g: Surface, sk: Skin, frame: HdMonkFrame) {
  g.rect(9, 49, 5, 2, sk.b)
  g.rect(17, 49, 5, 2, sk.b)
  g.px(13, 50, sk.d)
  g.px(21, 50, sk.d)
  g.poly(
    [
      [9, 17],
      [22, 17],
      [24, 49],
      [7, 49],
    ],
    O,
  )
  g.ellipse(15.5, 19.5, 7.2, 3.4, O)
  for (let y = 18; y < 49; y++) {
    const t = (y - 17) / 32
    g.rect(Math.round(22 + 2 * t) - 3, y, 3, 1, OD)
    g.px(Math.round(9 - 2 * t), y, OL)
  }
  // draped edge across the chest and folds
  g.line(9, 19, 21, 30, OL)
  g.line(10, 19, 22, 31, OD)
  g.line(12, 33, 11, 47, OD)
  g.line(19, 34, 20, 47, OD)
  g.rect(7, 47, 17, 2, OD)
  g.hline(8, 23, 48, ODD)
  if (frame === 'bless' || frame === 'chant') {
    // bowl hung in its sling at the side; hands together in front
    g.line(9, 18, 23, 31, STRAP)
    g.ellipse(23.5, 34, 4.4, 3.6, BOWL)
    g.ellipse(22.5, 33, 2.2, 1.4, BOWL_L)
    g.rect(14, 22, 4, 7, sk.b)
    g.rect(16, 22, 2, 7, sk.d)
    g.px(14, 22, mix(sk.b, '#ffffff', 0.3))
    g.rect(12, 27, 3, 3, O)
    g.rect(17, 27, 3, 3, OD)
  } else {
    g.ellipse(15.5, 33, 6.8, 4.6, BOWL)
    g.ellipse(13.5, 31.5, 3.2, 1.8, BOWL_L)
    g.ellipse(15.5, 29, 5.8, 1.8, '#4d4458')
    g.rect(15, 26.5, 2, 1, BOWL_L)
    g.rect(7, 31, 3, 3, sk.b)
    g.rect(21, 31, 3, 3, sk.b)
  }
  g.rect(14, 16, 4, 3, sk.d)
  g.rect(5, 9, 2, 4, sk.d)
  g.rect(25, 9, 2, 4, sk.d)
  head(g, sk, 15.5, 9.5, false)
  // serene closed eyes and a small mouth (open on chant beats)
  g.hline(10, 12, 11, P.ink)
  g.px(9, 10, P.ink)
  g.hline(19, 21, 11, P.ink)
  g.px(22, 10, P.ink)
  g.rect(9, 13, 2, 1, P.blush)
  g.rect(21, 13, 2, 1, P.blush)
  if (frame === 'chant') g.rect(15, 14, 2, 2, '#8e3a4c')
  else g.hline(15, 16, 15, '#b8606a')
}

/** Remove `n` rows starting at `at` (squashes the robe for novices). */
function shorten(src: HTMLCanvasElement, at: number, n: number): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height)
  const ctx = c.getContext('2d')!
  ctx.drawImage(src, 0, 0, src.width, at, 0, n, src.width, at)
  ctx.drawImage(src, 0, at + n, src.width, src.height - at - n, 0, at + n, src.width, src.height - at - n)
  return c
}
