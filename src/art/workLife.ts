// Little ambient critters and props for the job and kitchen scenes that the
// shared character art does not have: dragonflies, a frog on a lily pad, a
// gecko on the wall, incense smoke curls, a heart bubble and a "zzz".

import type { Surface } from '../engine/pixel'
import { P } from './palette'

const INK = P.ink

/** Dragonfly (แมลงปอ) hovering; wings blur on alternate frames. */
export function drawDragonfly(g: Surface, x: number, y: number, t: number, dir = 1, color = '#4fb0e0') {
  const X = Math.round(x)
  const Y = Math.round(y)
  const f = Math.floor(t * 24) % 2
  // Body.
  for (let i = 0; i < 6; i++) g.px(X - dir * i, Y, i === 0 ? INK : i % 2 ? color : '#2a6fa0')
  g.px(X + dir, Y, INK)
  g.px(X + dir, Y - 1, '#ffd54f')
  // Wings.
  g.alpha(0.75)
  if (f) {
    g.hline(X - 3, X + 1, Y - 2, '#e6fbff')
    g.hline(X - 3, X + 1, Y + 2, '#e6fbff')
  } else {
    g.hline(X - 2, X, Y - 1, '#e6fbff')
    g.hline(X - 2, X, Y + 1, '#e6fbff')
    g.px(X - 3, Y - 3, '#e6fbff')
    g.px(X - 3, Y + 3, '#e6fbff')
  }
  g.alpha(1)
}

/** Green frog sitting (croaks with a puffed throat when `croak` > 0). */
export function drawFrog(g: Surface, x: number, y: number, croak: number, flip = false) {
  const X = Math.round(x)
  const Y = Math.round(y)
  const s = flip ? -1 : 1
  g.ellipse(X, Y, 5, 3, INK)
  g.ellipse(X, Y - 0.5, 4, 2.2, '#6cc36a')
  g.ellipse(X - s, Y - 1, 2, 1, '#9ed86a')
  // Eyes.
  for (const ex of [-2, 2]) {
    g.rect(X + ex - 1, Y - 4, 3, 3, INK)
    g.px(X + ex, Y - 3, '#fffaf0')
  }
  if (croak > 0) {
    g.ellipse(X + s * 2, Y + 2, 2 + croak * 1.5, 1.6 + croak, INK)
    g.ellipse(X + s * 2, Y + 2, 1.4 + croak * 1.5, 1 + croak, '#fff3c8')
  }
  g.px(X - 4, Y + 2, '#3f8a4f')
  g.px(X + 4, Y + 2, '#3f8a4f')
}

/** Gecko (จิ้งจก) clinging to a wall, head up. */
export function drawGecko(g: Surface, x: number, y: number, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  const w = Math.round(Math.sin(t * 3) * 1)
  const c = '#c9b38a'
  const d = '#8a7458'
  g.rect(X - 1, Y - 5, 3, 9, INK)
  g.vline(X, Y - 4, Y + 3, c)
  g.px(X, Y - 5, c)
  g.px(X - 1, Y - 4, INK)
  g.px(X + 1, Y - 4, INK)
  for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.px(X + dx, Y + dy, d)
  g.line(X, Y + 4, X + w, Y + 8, d)
}

/** A rising, curling thread of incense smoke. */
export function drawIncenseSmoke(g: Surface, x: number, y: number, t: number, h = 26, alpha = 0.45) {
  g.alpha(alpha)
  for (let i = 0; i < h; i++) {
    const k = i / h
    const sx = x + Math.sin(t * 1.4 + i * 0.28) * (1 + k * 4)
    g.px(Math.round(sx), Math.round(y - i), k > 0.7 ? '#cfc6d8' : '#e8e2f0')
  }
  g.alpha(1)
}

/** Tiny heart bubble (for a purring cat or a happy kid). */
export function drawHeartPop(g: Surface, x: number, y: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  g.px(X - 1, Y, '#ff6f91')
  g.px(X + 1, Y, '#ff6f91')
  g.hline(X - 1, X + 1, Y + 1, '#ff6f91')
  g.px(X, Y + 2, '#ff6f91')
}

/** "z" letters drifting up from a sleeper. */
export function drawZzz(g: Surface, x: number, y: number, t: number) {
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.6 + i * 0.5) % 1
    const X = Math.round(x + ph * 5 + i * 2)
    const Y = Math.round(y - ph * 10)
    g.alpha(1 - ph)
    g.hline(X, X + 2, Y, '#fffaf0')
    g.px(X + 1, Y + 1, '#fffaf0')
    g.hline(X, X + 2, Y + 2, '#fffaf0')
    g.alpha(1)
  }
}
