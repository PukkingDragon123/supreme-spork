// Tools held by the player's avatar in the job and kitchen scenes, drawn from
// the hand (grip) to a working tip so they always connect to the fist.

import type { Surface } from '../engine/pixel'
import { P } from './palette'
import { glow } from './workFx'

const INK = P.ink

function outlined(g: Surface, x0: number, y0: number, x1: number, y1: number, w: number, c: string) {
  g.thickLine(x0, y0, x1, y1, w + 2, INK)
  g.thickLine(x0, y0, x1, y1, w, c)
}

/** Long-neck candle lighter: grip in the hand at (hx, hy), flame at (tx, ty). */
export function drawLongLighter(g: Surface, hx: number, hy: number, tx: number, ty: number, t: number, lit: boolean) {
  const dx = tx - hx
  const dy = ty - hy
  const L = Math.hypot(dx, dy) || 1
  const ux = dx / L
  const uy = dy / L
  // Steel neck.
  const nx = hx + ux * 5
  const ny = hy + uy * 5
  outlined(g, nx, ny, tx - ux * 1.5, ty - uy * 1.5, 1, '#c8ccd8')
  g.line(nx + 0.5, ny, tx - ux * 2 + 0.5, ty - uy * 2, '#8a8e9e')
  // Red plastic grip with a trigger.
  outlined(g, hx - ux * 3, hy - uy * 3, hx + ux * 5, hy + uy * 5, 3, '#e8514a')
  g.line(hx - ux * 2 - 0.6, hy - uy * 2, hx + ux * 4 - 0.6, hy + uy * 4, '#ff8a7a')
  g.px(Math.round(hx + uy * 2), Math.round(hy - ux * 2), '#ffd54f')
  if (!lit) return
  const f = Math.sin(t * 21) > 0 ? 1 : 0
  glow(g, tx, ty - 2, 16, 0.75, '#ffb050')
  g.ellipse(tx, ty - 2, 2.4, 3.6 + f, '#ff7a24')
  g.ellipse(tx, ty - 2.4, 1.6, 2.8 + f * 0.5, '#ffd54f')
  g.ellipse(tx, ty - 1, 0.9, 1.3, '#9fd0ff')
  g.px(Math.round(tx), Math.round(ty - 6 - f), '#ffb347')
}

/** Soft cloth tied on a pole (ผ้าพันไม้) for wiping up high; cloth bundle at (tx, ty). */
export function drawClothPole(g: Surface, hx: number, hy: number, tx: number, ty: number, t: number, swish = 0, color = '#ffd54f') {
  const dx = tx - hx
  const dy = ty - hy
  const L = Math.hypot(dx, dy) || 1
  const ux = dx / L
  const uy = dy / L
  const bx = tx - ux * 5
  const by = ty - uy * 5
  outlined(g, hx - ux * 3, hy - uy * 3, bx, by, 2, '#c9a45a')
  g.line(hx - ux * 3, hy - uy * 3, bx, by, '#ecd08a')
  const wig = Math.sin(t * 24) * swish
  const X = Math.round(tx + wig)
  const Y = Math.round(ty)
  const dark = color === '#ffd54f' ? '#e0a526' : '#b8343f'
  const light = color === '#ffd54f' ? '#fff3a6' : '#ff8a7a'
  const blobs: [number, number, number][] = [
    [-3, -1, 4],
    [3, -2, 4],
    [0, 3, 4.5],
    [-4 + wig, 4, 3],
    [4, 4 - wig, 3],
  ]
  for (const [ox, oy, r] of blobs) g.circle(X + ox, Y + oy, r + 1, INK)
  for (const [ox, oy, r] of blobs) g.circle(X + ox, Y + oy, r, color)
  g.circle(X - 2, Y - 2, 1.8, light)
  g.line(X - 3, Y + 2, X + 2, Y + 4, dark)
  g.line(X + 1, Y - 1, X + 4, Y + 1, dark)
  // Tie where the cloth meets the pole.
  g.rect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3, '#e8514a')
}

/** Feather duster (ไม้ขนไก่): handle from the hand, fluffy head at (tx, ty). */
export function drawDuster(g: Surface, hx: number, hy: number, tx: number, ty: number, t: number, swish = 0) {
  const dx = tx - hx
  const dy = ty - hy
  const L = Math.hypot(dx, dy) || 1
  const ux = dx / L
  const uy = dy / L
  const bx = tx - ux * 7
  const by = ty - uy * 7
  outlined(g, hx - ux * 3, hy - uy * 3, bx, by, 2, '#c9a45a')
  g.line(hx - ux * 3, hy - uy * 3, bx, by, '#ecd08a')
  // Feathers: a puffy spray of warm browns and a red band.
  const cols = ['#8a4a2a', '#b8643a', '#e0904a', '#f4c070', '#6e3a24']
  const px = -uy
  const py = ux
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const r = 4.5 + ((i * 5) % 3)
    const wig = Math.sin(t * 14 + i) * (0.6 + swish)
    const fx = tx + Math.cos(a) * r + px * wig
    const fy = ty + Math.sin(a) * r * 0.9 + py * wig
    g.thickLine(bx, by, fx, fy, 3, INK)
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const r = 4.5 + ((i * 5) % 3)
    const wig = Math.sin(t * 14 + i) * (0.6 + swish)
    g.line(bx, by, tx + Math.cos(a) * r + px * wig, ty + Math.sin(a) * r * 0.9 + py * wig, cols[i % cols.length])
  }
  g.circle(tx, ty, 3.5, '#b8643a')
  g.circle(tx - 1, ty - 1, 2, '#e0904a')
  g.rect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3, '#e8514a')
}

/** Polishing cloth bunched in a hand at (x, y). */
export function drawClothWad(g: Surface, x: number, y: number, t: number, rub: number, color = '#e8514a') {
  const w = Math.sin(t * 30) * rub
  const X = Math.round(x + w)
  const Y = Math.round(y)
  g.ellipse(X, Y + 1, 6, 4.2, INK)
  g.ellipse(X, Y + 1, 5, 3.4, color)
  g.ellipse(X - 1.5, Y, 2.5, 1.6, '#ff8a7a')
  g.px(X + 3, Y + 3, '#b8343f')
  // A loose corner flapping.
  g.line(X + 4, Y + 3, X + 7 + w, Y + 6, INK)
  g.line(X + 4, Y + 2, X + 6 + w, Y + 5, color)
}

/** Wok spatula (ตะหลิว) / ladle / whisk / spoon from the hand to its working end. */
export function drawCookTool(g: Surface, kind: 'turner' | 'ladle' | 'whisk' | 'spoon' | 'knife', hx: number, hy: number, tx: number, ty: number) {
  const dx = tx - hx
  const dy = ty - hy
  const L = Math.hypot(dx, dy) || 1
  const ux = dx / L
  const uy = dy / L
  if (kind === 'knife') {
    // Short cleaver pointing along the arm.
    const ex = hx + ux * 11
    const ey = hy + uy * 11
    outlined(g, hx - ux * 3, hy - uy * 3, hx + ux * 2, hy + uy * 2, 2, '#9a6a45')
    const px = -uy
    const py = ux
    const pts: [number, number][] = [
      [hx + ux * 2 - px * 1, hy + uy * 2 - py * 1],
      [ex - px * 1, ey - py * 1],
      [ex + px * 4, ey + py * 4],
      [hx + ux * 2 + px * 4, hy + uy * 2 + py * 4],
    ]
    g.poly(pts.map(([x, y]) => [x + (x > hx ? 1 : -1) * 0.6, y + (y > hy ? 1 : -1) * 0.6] as [number, number]), INK)
    g.poly(pts, '#dfe3ea')
    g.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#ffffff')
    return
  }
  const headR = kind === 'spoon' ? 3 : kind === 'whisk' ? 4 : 5
  const bx = tx - ux * headR
  const by = ty - uy * headR
  outlined(g, hx - ux * 3, hy - uy * 3, bx, by, kind === 'whisk' ? 2 : 1.6, kind === 'whisk' ? '#e8514a' : kind === 'spoon' ? '#d0d0da' : '#9a6a45')
  if (kind === 'turner') {
    const px = -uy
    const py = ux
    const pts: [number, number][] = [
      [bx - px * 4, by - py * 4],
      [bx + px * 4, by + py * 4],
      [tx + ux * 2 + px * 4, ty + uy * 2 + py * 4],
      [tx + ux * 2 - px * 4, ty + uy * 2 - py * 4],
    ]
    g.poly(pts.map(([x, y]) => [x + Math.sign(x - tx) * 0.8, y + Math.sign(y - ty) * 0.8] as [number, number]), INK)
    g.poly(pts, '#d0d0da')
    g.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#f2f2f6')
  } else if (kind === 'ladle') {
    g.ellipse(tx, ty, 5, 3.6, INK)
    g.ellipse(tx, ty, 4, 2.8, '#a8a8b8')
    g.ellipse(tx, ty - 0.6, 3, 1.6, '#e4e4ec')
  } else if (kind === 'whisk') {
    g.ellipse(tx, ty, 3.4, 5, INK)
    g.ellipse(tx, ty, 2.4, 4, '#d0d0da')
    g.ellipse(tx, ty, 1.2, 3, '#a8a8b8')
  } else {
    g.ellipse(tx, ty, 3.2, 2.4, INK)
    g.ellipse(tx, ty, 2.4, 1.7, '#e4e4ec')
  }
}
