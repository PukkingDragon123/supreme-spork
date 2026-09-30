// Procedural pixel art for collectibles (ของสะสม). Every item is a kind
// base (keychain ring, postcard, snow globe, amulet locket…) around a 14×14
// motif (elephant, chedi, rooster, hippo…) painted in the item's palette.
// Epic and legendary items get a foil shimmer baked in; the UI adds a
// moving sheen on top. Unknown motifs fall back to a star.

import { bake, createCanvas, mix, type Color, type Surface } from '../engine/pixel'
import { cached, outlineCanvas, spriteDataUrl, type Sprite } from '../engine/sprite'
import { COLLECTIBLE_BY_ID } from '../game/data/collectibles'
import type { CollectibleDef, CollectibleKind } from '../game/data/collectibleTypes'
import { P } from './palette'
import { hasPlushArt, plushSprite } from './plush'

export const COLLECTIBLE_SIZE = 26

const INK = P.ink
const W = '#fffaf0'
const SKIN = '#f0bd90'
const SKIN_D = '#d6966c'

export interface MP {
  m: Color
  mL: Color
  mD: Color
  mDD: Color
  a: Color
  aL: Color
  aD: Color
  d: Color
  dD: Color
}

function ramp(pal: [string, string, string]): MP {
  const [m, a, d] = pal
  return {
    m,
    mL: mix(m, '#ffffff', 0.45),
    mD: mix(m, INK, 0.28),
    mDD: mix(m, INK, 0.55),
    a,
    aL: mix(a, '#ffffff', 0.45),
    aD: mix(a, INK, 0.3),
    d,
    dD: mix(d, INK, 0.3),
  }
}

export type Motif = (g: Surface, p: MP) => void

// Small helpers ---------------------------------------------------------------

/** Round-ish blob with a light top-left and a dark bottom-right rim. */
function blob(g: Surface, cx: number, cy: number, rx: number, ry: number, b: Color, l: Color, d: Color) {
  g.ellipse(cx, cy, rx, ry, d)
  g.ellipse(cx - 0.4, cy - 0.4, rx - 0.6, ry - 0.6, b)
  g.ellipse(cx - rx * 0.35, cy - ry * 0.4, Math.max(0.8, rx * 0.35), Math.max(0.6, ry * 0.3), l)
}

function eyes(g: Surface, x1: number, x2: number, y: number, shine = true) {
  g.px(x1, y, INK)
  g.px(x2, y, INK)
  if (shine) {
    g.px(x1, y - 1, INK)
    g.px(x2, y - 1, INK)
  }
}

function spire(g: Surface, x: number, top: number, bottom: number, c: Color, tip: Color) {
  g.vline(x, top, bottom, c)
  g.px(x, top - 1, tip)
}

/** Metal ring (a filled disc with a punched hole and a glint). */
function ring(g: Surface, cx: number, cy: number, r: number, hole: number, c: Color, glint: Color) {
  g.circle(cx, cy, r, c)
  const ctx = g.ctx
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(cx - g.ox, cy - g.oy, hole, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  g.px(cx - r + 1, cy - 1, glint)
  g.px(cx - 1, cy - r + 0.5, glint)
}

/** Seated Buddha silhouette (used by several motifs). */
function seated(g: Surface, p: MP, cx = 7, top = 1, face: Color = p.m) {
  spire(g, cx, top, top + 1, p.mD, p.d)
  g.circle(cx, top + 2.6, 1.3, p.mD)
  g.circle(cx, top + 4.6, 2.3, face)
  g.px(cx - 1, top + 4, p.mD)
  g.px(cx + 1, top + 4, p.mD)
  g.px(cx - 2, top + 5, p.mL)
  g.poly([[cx - 4, top + 7], [cx + 4, top + 7], [cx + 6, top + 11], [cx - 6, top + 11]], p.m)
  g.poly([[cx - 4, top + 7], [cx - 1, top + 7], [cx - 3, top + 11], [cx - 6, top + 11]], p.mL)
  g.line(cx + 1, top + 7, cx + 4, top + 11, p.mD)
  g.rect(cx - 2, top + 9, 4, 1, p.mD)
  g.rect(cx - 6, top + 11, 12, 1, p.mD)
}

// ---------------------------------------------------------------------------
// Motifs (14×14, drawn at 0,0)

const MOTIFS: Record<string, Motif> = {
  elephant(g, p) {
    g.rect(3, 10, 2, 3, p.mD)
    g.rect(10, 10, 2, 3, p.mD)
    g.ellipse(8, 7.5, 5.5, 3.6, p.mD)
    g.ellipse(7.6, 7.1, 5, 3.1, p.m)
    g.rect(5, 10, 2, 3, p.m)
    g.rect(8, 10, 2, 3, p.m)
    g.circle(3.6, 6, 3, p.m)
    g.ellipse(5.6, 5.8, 1.8, 2.4, p.mD)
    g.ellipse(5.4, 5.6, 1.2, 1.8, p.mL)
    g.vline(1, 6, 10, p.m)
    g.vline(0, 9, 11, p.m)
    g.px(1, 11, p.mD)
    g.px(2, 9, W)
    g.px(3, 5, INK)
    g.rect(7, 3, 5, 2, p.a)
    g.hline(7, 11, 5, p.aD)
    g.px(8, 6, p.d)
    g.px(10, 6, p.d)
    g.px(13, 7, p.mD)
    g.px(13, 8, p.mD)
    g.hline(5, 11, 4, p.aL)
  },
  tuktuk(g, p) {
    g.rect(1, 2, 12, 2, p.mD)
    g.rect(2, 1, 10, 1, p.m)
    g.rect(2, 4, 1, 5, INK)
    g.rect(11, 4, 1, 5, INK)
    g.rect(3, 4, 8, 3, '#d4f1ff')
    g.px(6, 4, INK)
    g.rect(1, 7, 12, 4, p.m)
    g.hline(1, 12, 7, p.mL)
    g.rect(1, 9, 12, 1, p.a)
    g.px(13, 8, p.d)
    g.px(12, 8, '#fff3a6')
    g.circle(3.5, 11.5, 2, INK)
    g.circle(10.5, 11.5, 2, INK)
    g.px(3, 11, P.stone)
    g.px(10, 11, P.stone)
  },
  chedi(g, p) {
    spire(g, 7, 1, 4, p.mD, p.d)
    g.rect(6, 3, 3, 2, p.m)
    g.hline(5, 9, 5, p.mD)
    g.ellipse(7, 8, 3.8, 3, p.m)
    g.rect(3, 8, 9, 2, p.m)
    g.ellipse(6, 7, 1.6, 1.8, p.mL)
    g.vline(10, 6, 9, p.mD)
    g.rect(2, 10, 11, 1, p.mD)
    g.rect(2, 11, 11, 1, p.a)
    g.rect(1, 12, 13, 2, p.mD)
    g.hline(1, 13, 12, p.m)
    g.px(7, 0, p.d)
  },
  prang(g, p) {
    g.poly([[3, 13], [11, 13], [10, 6], [8.5, 2], [5.5, 2], [4, 6]], p.m)
    g.poly([[3, 13], [6, 13], [6, 3], [5.5, 2], [4, 6]], p.mL)
    g.vline(10, 7, 12, p.mD)
    for (const y of [4, 7, 10]) {
      g.hline(4, 10, y, p.aD)
      g.px(5, y, p.a)
      g.px(7, y, p.d)
      g.px(9, y, p.a)
    }
    spire(g, 7, 0, 1, p.mD, p.d)
    g.rect(1, 12, 3, 2, p.mD)
    g.rect(10, 12, 3, 2, p.mD)
    g.rect(0, 13, 14, 1, p.mDD)
  },
  giant(g, p) {
    g.poly([[7, 0], [4.5, 4], [9.5, 4]], p.d)
    g.px(7, 1, P.goldL)
    g.rect(3, 4, 8, 1, p.d)
    g.ellipse(7, 7.5, 4.5, 3.8, p.m)
    g.ellipse(6, 6.5, 2.4, 1.6, mix(p.m, '#ffffff', 0.3))
    g.rect(3, 6, 3, 2, W)
    g.rect(8, 6, 3, 2, W)
    g.px(4, 6, INK)
    g.px(9, 6, INK)
    g.hline(3, 5, 5, INK)
    g.hline(8, 10, 5, INK)
    g.rect(4, 9, 6, 2, p.a)
    g.px(4, 8, W)
    g.px(9, 8, W)
    g.rect(2, 11, 10, 3, p.d)
    g.hline(2, 11, 12, p.a)
  },
  buddha(g, p) {
    // Halo (aura) behind the seated figure.
    g.circle(7, 5.5, 5.6, mix(p.aL, '#ffffff', 0.35))
    g.circle(7, 5.5, 4.6, mix(p.aL, '#ffffff', 0.6))
    seated(g, p)
  },
  reclining(g, p) {
    g.rect(0, 11, 14, 3, p.a)
    g.hline(0, 13, 11, p.aL)
    g.rect(0, 7, 3, 4, p.aD)
    g.ellipse(8.5, 9, 5.5, 2, p.m)
    g.ellipse(8, 8.4, 5, 1.2, p.mL)
    g.circle(3, 6.5, 2.2, p.m)
    g.px(3, 3, p.d)
    g.circle(3, 4.8, 1, p.mD)
    g.px(3, 7, p.mD)
    g.rect(12, 9, 2, 2, p.mD)
  },
  brahma(g, p) {
    g.poly([[7, 0], [5, 4], [9, 4]], p.m)
    g.px(7, 1, p.d)
    g.rect(4, 4, 6, 1, p.a)
    g.circle(3, 6.5, 2, p.mD)
    g.circle(11, 6.5, 2, p.mD)
    g.circle(7, 6.5, 2.8, p.m)
    g.px(6, 6, INK)
    g.px(8, 6, INK)
    g.px(2, 6, INK)
    g.px(12, 6, INK)
    g.px(7, 8, p.mD)
    g.poly([[2, 10], [12, 10], [13, 14], [1, 14]], p.m)
    g.rect(3, 10, 8, 1, p.a)
    g.px(7, 12, p.d)
  },
  mount(g, p) {
    g.ellipse(7, 13, 7, 6, p.a)
    g.ellipse(5, 11, 3, 2, mix(p.a, '#ffffff', 0.35))
    g.rect(3, 9, 8, 2, p.d)
    g.hline(3, 10, 9, mix(p.d, INK, 0.1))
    g.ellipse(7, 7, 2.2, 1.8, p.m)
    g.rect(5, 7, 5, 2, p.m)
    spire(g, 7, 2, 5, mix(p.m, INK, 0.25), p.m)
    g.px(6, 6, mix(p.m, '#ffffff', 0.5))
    g.line(2, 13, 5, 10, mix(p.a, INK, 0.3))
  },
  dragon(g, p) {
    const pts: [number, number][] = [[12, 12], [10, 10], [7, 11], [4, 10], [3, 7], [5, 4], [8, 4]]
    for (let i = 0; i + 1 < pts.length; i++) g.thickLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2.6, p.m)
    for (let i = 1; i < pts.length - 1; i++) g.px(pts[i][0], pts[i][1] - 1, p.a)
    for (const [x, y] of pts.slice(1, 5)) g.px(x, y + 1, p.aL)
    g.ellipse(9.5, 3.5, 2.8, 2, p.m)
    g.rect(11, 3, 3, 2, p.m)
    g.px(9, 2, INK)
    g.px(8, 1, p.a)
    g.px(7, 0, p.a)
    g.hline(12, 13, 5, p.d)
    g.px(13, 2, p.d)
    g.px(12, 12, p.a)
    g.px(13, 13, p.a)
  },
  longtail(g, p) {
    g.rect(0, 12, 14, 2, p.d)
    g.hline(1, 3, 12, mix(p.d, '#ffffff', 0.5))
    g.hline(8, 11, 13, mix(p.d, '#ffffff', 0.5))
    g.poly([[0, 7], [2, 10], [13, 10], [12, 12], [2, 12]], p.m)
    g.hline(2, 13, 10, p.mL)
    g.line(0, 6, 1, 9, p.mD)
    g.px(0, 5, p.a)
    g.px(1, 5, p.aL)
    g.px(0, 4, p.a)
    g.poly([[6, 6], [8, 3], [10, 6]], '#e8c46a')
    g.rect(7, 6, 2, 3, p.a)
    g.circle(4, 9, 1, p.a)
    g.circle(11, 9, 1, '#6cc36a')
  },
  footprint(g, p) {
    g.ellipse(7, 8, 4.8, 5.8, p.mD)
    g.ellipse(6.8, 7.8, 4.2, 5.2, p.m)
    for (const [x, y] of [[4, 2], [6, 1.5], [8, 1.5], [10, 2]] as [number, number][]) g.circle(x, y, 1, p.m)
    g.circle(7, 8, 2.2, p.a)
    g.circle(7, 8, 1.2, p.m)
    g.px(7, 8, p.d)
    for (const [x, y] of [[5, 5], [9, 5], [5, 11], [9, 11]] as [number, number][]) g.px(x, y, p.a)
    g.ellipse(5.5, 6, 1.2, 2, p.mL)
  },
  treehead(g, p) {
    g.ellipse(7, 3, 6, 3, p.a)
    g.ellipse(5, 2, 3, 1.5, mix(p.a, '#ffffff', 0.35))
    g.circle(7, 9, 3.5, p.m)
    for (let x = 4; x <= 10; x += 2) g.px(x, 6, mix(p.m, INK, 0.3))
    g.px(6, 9, INK)
    g.px(8, 9, INK)
    g.px(7, 11, mix(p.m, INK, 0.3))
    for (const x of [2, 3, 11, 12]) g.vline(x, 4, 13, p.d)
    g.line(3, 6, 5, 7, p.d)
    g.line(11, 6, 9, 7, p.d)
    g.line(2, 12, 5, 13, p.d)
    g.line(12, 12, 9, 13, p.d)
    g.hline(0, 13, 13, mix(p.d, INK, 0.3))
  },
  pants(g, p) {
    g.rect(3, 0, 8, 2, p.a)
    g.hline(3, 10, 1, mix(p.a, INK, 0.2))
    g.poly([[3, 2], [7, 2], [6, 13], [1, 13]], p.m)
    g.poly([[7, 2], [11, 2], [13, 13], [8, 13]], p.m)
    g.vline(7, 3, 6, p.mD)
    g.line(6, 6, 6, 13, p.mD)
    for (const [x, y] of [[3, 5], [4, 9], [10, 5], [10, 10], [2, 12]] as [number, number][]) {
      g.rect(x, y, 2, 1, p.a)
      g.px(x, y + 1, p.a)
    }
    g.hline(1, 6, 13, p.d)
    g.hline(8, 13, 13, p.d)
  },
  egg(g, p) {
    g.ellipse(7, 7.5, 5, 6, mix(p.m, INK, 0.12))
    g.ellipse(6.6, 7.1, 4.4, 5.4, p.m)
    g.ellipse(7, 8.5, 2.6, 2.6, mix(p.a, INK, 0.1))
    g.ellipse(6.7, 8.2, 2, 2, p.a)
    g.px(6, 7, mix(p.a, '#ffffff', 0.6))
    g.px(4, 4, '#ffffff')
    g.px(5, 3, '#ffffff')
    g.hline(3, 11, 13, p.d)
    g.px(2, 12, p.d)
    g.px(12, 12, p.d)
  },
  ganesha(g, p) {
    g.ellipse(9, 10, 5, 3, p.mD)
    g.ellipse(9, 9.6, 4.5, 2.6, p.m)
    g.rect(4, 12, 10, 2, p.a)
    g.circle(4.5, 6.5, 3.2, p.m)
    g.ellipse(1.5, 6.5, 1.5, 2.5, p.mD)
    g.ellipse(7.5, 6.5, 1.5, 2.5, p.mD)
    g.vline(4, 8, 11, p.m)
    g.px(5, 11, p.m)
    g.px(3, 5, INK)
    g.px(6, 5, INK)
    g.poly([[4.5, 0], [2.5, 3.5], [6.5, 3.5]], p.a)
    g.px(4, 1, mix(p.a, '#ffffff', 0.5))
    g.px(6, 8, W)
    g.px(11, 8, p.d)
    g.px(9, 8, p.mL)
  },
  rat(g, p) {
    g.circle(3, 3.5, 2.6, p.mD)
    g.circle(11, 3.5, 2.6, p.mD)
    g.circle(3, 3.5, 1.5, p.a)
    g.circle(11, 3.5, 1.5, p.a)
    g.ellipse(7, 8.5, 5, 4.5, p.m)
    g.ellipse(5.5, 7, 2, 1.5, p.mL)
    g.ellipse(7, 11, 3, 2, p.d)
    eyes(g, 5, 9, 8)
    g.px(7, 10, p.a)
    g.line(1, 9, 4, 10, p.mDD)
    g.line(13, 9, 10, 10, p.mDD)
    g.px(4, 10, p.a)
    g.px(10, 10, p.a)
  },
  mango(g, p) {
    g.ellipse(7, 11, 6.5, 2.5, mix(p.a, INK, 0.15))
    g.ellipse(7, 10.5, 6, 2.2, p.a)
    for (const x of [3, 6, 9, 11]) g.px(x, 10, mix(p.a, INK, 0.1))
    g.ellipse(7.5, 6.5, 5.5, 3.5, mix(p.m, INK, 0.2))
    g.ellipse(7.2, 6.1, 5, 3, p.m)
    g.ellipse(5.5, 5, 2, 1, mix(p.m, '#ffffff', 0.5))
    g.line(3, 7, 11, 5, mix(p.m, INK, 0.15))
    eyes(g, 6, 9, 7, false)
    g.px(7, 8, INK)
    g.px(8, 8, INK)
    g.px(5, 8, P.blush)
    g.px(10, 8, P.blush)
    g.poly([[10, 3], [13, 1], [12, 4]], p.d)
    g.px(12, 2, mix(p.d, '#ffffff', 0.4))
  },
  roti(g, p) {
    // A rolled crêpe with pink candy floss puffing out of both ends.
    g.circle(2.5, 10.5, 2.4, p.m)
    g.circle(11.5, 3.5, 2.4, p.m)
    g.px(1, 9, mix(p.m, '#ffffff', 0.5))
    g.px(12, 2, mix(p.m, '#ffffff', 0.5))
    g.thickLine(3.5, 10, 10.5, 4, 4.4, mix(p.a, INK, 0.2))
    g.thickLine(3.5, 9.6, 10.5, 3.6, 3.6, p.a)
    g.line(4, 8, 10, 3, mix(p.a, '#ffffff', 0.6))
    for (const [x, y] of [[5, 10], [7, 8], [9, 6]] as [number, number][]) g.px(x, y, mix(p.a, INK, 0.25))
    g.circle(1.5, 12, 1.2, mix(p.m, INK, 0.1))
    g.circle(13, 2, 1, mix(p.m, INK, 0.1))
    g.px(11, 11, p.d)
    g.px(12, 11, p.d)
    g.px(12, 12, p.d)
  },
  citrus(g, p) {
    g.circle(7, 8, 5.4, mix(p.m, INK, 0.25))
    g.circle(6.7, 7.7, 5, p.m)
    g.ellipse(5, 6, 2, 1.6, mix(p.m, '#ffffff', 0.5))
    for (const [x, y] of [[9, 9], [8, 11], [10, 7], [5, 10]] as [number, number][]) g.px(x, y, mix(p.m, INK, 0.12))
    g.vline(7, 1, 3, mix(p.a, INK, 0.4))
    g.poly([[7, 2], [11, 0], [12, 2], [9, 3]], p.a)
    g.px(10, 1, mix(p.a, '#ffffff', 0.4))
    g.rect(1, 12, 4, 2, p.d)
    g.px(3, 11, p.d)
  },
  bowl(g, p) {
    g.ellipse(7, 4.5, 6.5, 1.8, mix(p.m, INK, 0.2))
    g.ellipse(7, 4.6, 5.5, 1.1, mix(p.m, INK, 0.08))
    g.poly([[0.5, 4.5], [13.5, 4.5], [11, 11], [3, 11]], p.m)
    g.rect(4, 11, 6, 2, mix(p.m, INK, 0.15))
    g.hline(1, 12, 5, p.d)
    g.hline(2, 11, 10, p.d)
    // Rooster on the side.
    g.rect(5, 7, 3, 2, p.a)
    g.px(8, 6, p.a)
    g.px(8, 5, p.a)
    g.px(9, 6, '#ffd54f')
    g.line(4, 7, 3, 5, p.d)
    g.px(3, 6, p.d)
    g.px(6, 9, '#ffd54f')
    g.ellipse(4, 5, 1.2, 0.6, '#ffffff')
  },
  whitetemple(g, p) {
    g.rect(2, 9, 10, 4, p.m)
    g.rect(1, 13, 12, 1, p.a)
    g.rect(6, 10, 2, 3, p.a)
    g.poly([[1, 9], [7, 4], [13, 9]], p.d)
    g.poly([[3, 6], [7, 1], [11, 6]], p.m)
    g.line(1, 9, 7, 4, p.a)
    g.line(13, 9, 7, 4, p.a)
    g.line(3, 6, 7, 1, p.a)
    g.line(11, 6, 7, 1, p.a)
    g.px(7, 0, '#ffffff')
    g.px(0, 8, p.a)
    g.px(13, 8, p.a)
    g.px(2, 5, p.a)
    g.px(11, 5, p.a)
    for (const [x, y] of [[4, 10], [9, 10], [5, 7], [8, 7]] as [number, number][]) g.px(x, y, '#9fd0ff')
  },
  guanyin(g, p) {
    g.circle(7, 4, 4.4, mix(p.d, '#ffffff', 0.45))
    g.ellipse(7, 12.5, 5, 1.5, '#ff9fc0')
    g.hline(3, 11, 12, '#ffd6e0')
    g.poly([[5, 4], [9, 4], [10, 12], [4, 12]], p.m)
    g.poly([[5, 4], [7, 4], [6, 12], [4, 12]], mix(p.m, '#ffffff', 0.4))
    g.line(8, 5, 9, 11, p.a)
    g.circle(7, 3.5, 2.4, p.m)
    g.circle(7, 4, 1.6, SKIN)
    g.px(6, 4, SKIN_D)
    g.px(8, 4, SKIN_D)
    g.rect(9, 7, 2, 3, p.a)
    g.px(10, 6, '#6cc36a')
  },
  couple(g, p) {
    g.rect(0, 0, 14, 14, mix(p.m, '#ffffff', 0.55))
    g.circle(4, 5, 2.5, p.m)
    g.rect(2, 2, 4, 2, INK)
    g.px(4, 1, INK)
    g.px(5, 5, INK)
    g.rect(1, 8, 6, 6, p.a)
    g.circle(10, 6, 2.3, p.m)
    g.rect(8, 3, 4, 2, INK)
    g.px(9, 6, INK)
    g.rect(8, 9, 5, 5, p.d)
    g.px(6, 6, p.m)
    g.px(7, 6, p.m)
    g.px(7, 2, P.pink)
    g.px(8, 1, P.pink)
  },
  banana(g, p) {
    // A hand of sun-dried bananas: three plump crescents.
    for (const [ox, oy] of [[0, 3], [2, 1], [4, -1]] as [number, number][]) {
      const pts: [number, number][] = [[ox + 1, oy + 5], [ox + 3, oy + 9], [ox + 7, oy + 11], [ox + 11, oy + 10], [ox + 8, oy + 9], [ox + 5, oy + 7], [ox + 3, oy + 4]]
      g.poly(pts, p.m)
      g.line(ox + 3, oy + 6, ox + 7, oy + 9, p.a)
      g.line(ox + 3, oy + 9, ox + 7, oy + 11, mix(p.m, INK, 0.35))
    }
    g.rect(1, 6, 3, 3, p.d)
    g.px(2, 5, p.d)
  },
  umbrella(g, p) {
    g.poly([[0, 7], [3, 2], [7, 0], [11, 2], [14, 7]], p.m)
    g.poly([[0, 7], [3, 2], [7, 0], [5, 7]], mix(p.m, '#ffffff', 0.25))
    for (const x of [2, 5, 9, 12]) g.line(7, 0, x, 7, mix(p.m, INK, 0.3))
    g.hline(0, 13, 7, mix(p.m, INK, 0.35))
    g.circle(4, 4, 1.2, p.a)
    g.circle(10, 4, 1.2, p.a)
    g.px(7, 3, p.d)
    g.px(4, 4, '#ffffff')
    g.vline(7, 7, 12, '#8a5a32')
    g.px(6, 13, '#8a5a32')
    g.px(5, 12, '#8a5a32')
  },
  lantern(g, p) {
    g.circle(7, 7.5, 6.8, mix(p.aL, '#ffffff', 0.55))
    g.poly([[3, 3], [11, 3], [12, 11], [2, 11]], p.m)
    g.poly([[3, 3], [6, 3], [5, 11], [2, 11]], mix(p.m, '#ffffff', 0.35))
    g.ellipse(7, 3, 4, 1.5, mix(p.m, '#ffffff', 0.2))
    for (const y of [5, 8]) g.hline(3, 11, y, p.d)
    g.rect(4, 11, 6, 1, p.d)
    g.ellipse(7, 10, 2, 1, p.a)
    g.px(7, 12, '#fff3a6')
    g.px(7, 13, p.a)
  },
  noodle(g, p) {
    g.ellipse(7, 6, 6.5, 2, '#5a8de0')
    g.ellipse(7, 6, 5.8, 1.5, p.m)
    g.poly([[0.5, 6], [13.5, 6], [11, 12], [3, 12]], '#fffaf0')
    g.hline(1, 12, 7, '#5a8de0')
    g.rect(4, 12, 6, 1, '#d6d0c4')
    g.ellipse(7, 4.5, 3, 1.8, p.a)
    for (const x of [5, 7, 9]) g.px(x, 4, mix(p.a, INK, 0.2))
    g.px(4, 6, p.d)
    g.px(10, 5, p.d)
    g.px(9, 6, '#6cc36a')
    g.line(9, 0, 13, 5, '#9a6a45')
    g.line(11, 0, 14, 4, '#c28e5c')
  },
  pot(g, p) {
    g.rect(5, 1, 4, 2, p.mD)
    g.hline(4, 9, 1, p.m)
    g.ellipse(7, 8, 5.5, 5, p.mD)
    g.ellipse(6.6, 7.6, 5, 4.5, p.m)
    g.ellipse(5, 6, 1.8, 2.2, p.d)
    for (const x of [3, 6, 9, 11]) g.px(x, 9, p.a)
    g.hline(3, 11, 10, p.a)
    g.hline(4, 10, 7, mix(p.m, INK, 0.1))
    g.rect(4, 12, 6, 2, p.a)
  },
  naga(g, p) {
    const pts: [number, number][] = [[1, 13], [3, 10], [7, 11], [10, 9], [9, 6], [6, 5], [7, 2]]
    for (let i = 0; i + 1 < pts.length; i++) g.thickLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2.8, p.m)
    for (const [x, y] of pts.slice(1, 6)) {
      g.px(x, y, p.d)
      g.px(x + 1, y + 1, mix(p.m, INK, 0.25))
    }
    g.ellipse(9, 2.5, 3, 2, p.m)
    g.px(9, 2, INK)
    g.poly([[5, 3], [6, 0], [7, 2], [8, -1], [9, 1], [11, 0], [10, 2]], p.a)
    g.px(12, 3, '#e8514a')
    g.px(13, 3, '#e8514a')
  },
  that(g, p) {
    g.rect(2, 12, 10, 2, p.mD)
    g.rect(3, 9, 8, 3, p.m)
    g.poly([[4, 9], [10, 9], [9, 4], [5, 4]], p.m)
    g.poly([[4, 9], [6, 9], [6, 4], [5, 4]], mix(p.m, '#ffffff', 0.5))
    g.vline(9, 5, 8, mix(p.m, INK, 0.15))
    g.rect(5, 3, 4, 1, p.a)
    g.poly([[5.5, 3], [8.5, 3], [7, 0]], p.a)
    g.hline(3, 10, 10, p.a)
    g.px(7, 6, p.d)
    g.px(7, 10, p.d)
    g.hline(2, 11, 12, mix(p.m, INK, 0.2))
  },
  mortar(g, p) {
    g.line(9, 0, 12, 7, '#9a6a45')
    g.line(10, 0, 13, 6, '#c28e5c')
    g.ellipse(7, 7, 6, 1.8, mix(p.m, INK, 0.3))
    g.poly([[1, 7], [13, 7], [10, 12], [4, 12]], p.m)
    g.poly([[1, 7], [5, 7], [5, 12], [4, 12]], mix(p.m, '#ffffff', 0.25))
    g.rect(4, 12, 6, 2, mix(p.m, INK, 0.25))
    for (const [x, y] of [[4, 6], [6, 5], [8, 6], [5, 7]] as [number, number][]) g.px(x, y, p.a)
    g.px(9, 5, p.d)
    g.px(3, 6, p.d)
  },
  khaen(g, p) {
    const hs = [11, 8, 5, 3, 6, 9]
    hs.forEach((top, i) => {
      const x = 2 + i * 2
      g.rect(x, top, 2, 14 - top, p.m)
      g.vline(x, top, 13, mix(p.m, '#ffffff', 0.35))
      g.px(x, top, mix(p.m, INK, 0.3))
    })
    g.ellipse(7, 8, 4, 2, p.d)
    g.hline(4, 10, 7, mix(p.d, '#ffffff', 0.3))
    g.rect(2, 11, 12, 1, p.a)
  },
  buffalo(g, p) {
    g.poly([[0, 3], [2, 1], [4, 4], [2, 5]], p.d)
    g.poly([[14, 3], [12, 1], [10, 4], [12, 5]], p.d)
    g.ellipse(1.5, 6.5, 1.5, 1, p.mD)
    g.ellipse(12.5, 6.5, 1.5, 1, p.mD)
    g.ellipse(7, 7, 5, 4.5, p.m)
    g.ellipse(5.5, 5.5, 2, 1.5, mix(p.m, '#ffffff', 0.25))
    g.ellipse(7, 10.5, 3.5, 2.5, p.a)
    g.px(6, 10, mix(p.a, INK, 0.4))
    g.px(8, 10, mix(p.a, INK, 0.4))
    eyes(g, 5, 9, 7)
    g.rect(6, 13, 2, 1, '#ffd54f')
  },
  kratip(g, p) {
    g.line(3, 3, 7, 0, p.d)
    g.line(7, 0, 11, 3, p.d)
    g.ellipse(7, 4, 4.5, 1.5, p.mD)
    g.rect(2.5, 3, 9, 2, p.mD)
    g.rect(3, 5, 8, 8, p.m)
    for (let y = 5; y < 13; y++) for (let x = 3; x < 11; x++) if ((x + y) % 3 === 0) g.px(x, y, mix(p.m, INK, 0.2))
    g.rect(3, 8, 8, 1, p.a)
    g.hline(3, 10, 12, mix(p.m, INK, 0.3))
    g.rect(2, 13, 10, 1, p.mD)
  },
  fireball(g, p) {
    g.rect(0, 0, 14, 10, mix(p.a, INK, 0.45))
    g.rect(0, 10, 14, 4, p.a)
    g.hline(0, 13, 10, mix(p.a, '#ffffff', 0.4))
    for (const [x, y] of [[3, 6], [7, 3], [11, 7]] as [number, number][]) {
      g.vline(x, y + 1, 10, mix(p.m, INK, 0.2))
      g.circle(x, y, 1.6, p.m)
      g.px(x, y, '#ffffff')
    }
    g.px(1, 1, p.d)
    g.px(12, 2, p.d)
    g.px(5, 1, p.d)
    g.px(3, 12, p.m)
    g.px(11, 12, p.m)
  },
  dino(g, p) {
    g.ellipse(8, 9, 4.5, 3, p.m)
    g.thickLine(5, 8, 2, 3, 2.2, p.m)
    g.ellipse(2.5, 2, 2, 1.4, p.m)
    g.px(2, 1, INK)
    g.thickLine(12, 9, 14, 12, 1.6, p.m)
    g.rect(5, 11, 2, 3, mix(p.m, INK, 0.2))
    g.rect(10, 11, 2, 3, mix(p.m, INK, 0.2))
    g.ellipse(8, 10.5, 3, 1, p.d)
    for (const [x, y] of [[7, 7], [9, 7], [11, 8]] as [number, number][]) g.px(x, y, p.a)
    g.px(1, 3, '#ff9aa6')
  },
  rooster(g, p) {
    g.poly([[8, 7], [12, 1], [14, 4], [12, 10]], p.d)
    g.line(12, 1, 10, 7, mix(p.d, '#ffffff', 0.3))
    g.poly([[9, 3], [13, 0], [12, 3]], mix(p.d, INK, 0.25))
    g.ellipse(7, 8, 4.5, 3.2, p.m)
    g.ellipse(7.5, 8, 2.5, 1.8, mix(p.m, INK, 0.2))
    g.thickLine(4, 7, 3, 3, 2.2, p.m)
    g.circle(3, 2.5, 1.8, p.m)
    g.px(3, 2, INK)
    g.px(1, 3, p.a)
    g.px(0, 3, p.a)
    g.rect(2, 0, 2, 1, '#e8514a')
    g.px(4, 0, '#e8514a')
    g.px(2, 4, '#e8514a')
    g.vline(6, 11, 13, p.a)
    g.vline(8, 11, 13, p.a)
    g.px(5, 13, p.a)
    g.px(9, 13, p.a)
  },
  puppet(g, p) {
    g.vline(11, 0, 13, '#6e4a35')
    g.poly([[3, 3], [7, 1], [9, 3], [8, 7], [4, 7]], p.m)
    g.poly([[2, 5], [0, 7], [3, 7]], p.m)
    g.px(5, 3, p.d)
    g.px(6, 3, '#ffffff')
    g.rect(4, 7, 5, 6, p.m)
    for (const [x, y] of [[5, 9], [7, 9], [6, 11], [5, 5]] as [number, number][]) g.px(x, y, p.a)
    g.line(8, 8, 11, 6, p.m)
    g.line(4, 8, 2, 11, p.m)
    g.rect(3, 13, 7, 1, p.d)
    g.px(7, 0, p.a)
  },
  shophouse(g, p) {
    g.rect(0, 1, 14, 1, mix(p.m, INK, 0.3))
    g.rect(1, 2, 12, 12, p.m)
    g.rect(1, 2, 12, 1, mix(p.m, '#ffffff', 0.4))
    for (const x of [2, 6, 10]) {
      g.rect(x, 4, 2, 3, W)
      g.px(x, 4, p.d)
      g.px(x + 1, 4, p.d)
      g.rect(x, 5, 2, 2, mix(p.a, INK, 0.1))
    }
    g.rect(1, 8, 12, 1, p.a)
    for (const x of [2, 7]) {
      g.rect(x, 10, 4, 4, mix(p.m, INK, 0.35))
      g.px(x, 10, p.m)
      g.px(x + 3, 10, p.m)
    }
    g.px(6, 11, p.d)
  },
  durian(g, p) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.px(7 + Math.cos(a) * 6.2, 7.5 + Math.sin(a) * 6, mix(p.m, INK, 0.35))
    }
    g.ellipse(7, 7.5, 5.5, 5.2, mix(p.m, INK, 0.25))
    g.ellipse(6.7, 7.2, 5, 4.7, p.m)
    for (let y = 4; y < 12; y += 2) for (let x = 3 + (y % 4) / 2; x < 12; x += 2) g.px(x, y, mix(p.m, INK, 0.2))
    g.ellipse(5, 5, 1.6, 1.2, mix(p.m, '#ffffff', 0.4))
    eyes(g, 5, 9, 8, false)
    g.px(7, 9, INK)
    g.px(4, 9, P.blush)
    g.px(10, 9, P.blush)
    g.vline(7, 0, 2, p.d)
  },
  betta(g, p) {
    g.poly([[6, 7], [13, 1], [14, 8], [13, 13]], p.a)
    g.poly([[6, 7], [11, 3], [11, 11]], mix(p.a, p.m, 0.5))
    for (const [x1, y1, x2, y2] of [[8, 6, 13, 2], [8, 8, 13, 12], [8, 7, 13, 7]] as number[][]) g.line(x1, y1, x2, y2, mix(p.a, '#ffffff', 0.3))
    g.poly([[4, 5], [7, 1], [8, 5]], p.m)
    g.poly([[4, 9], [7, 13], [8, 9]], p.m)
    g.ellipse(4.5, 7, 3.5, 2.2, p.m)
    g.ellipse(3.5, 6.3, 1.6, 0.8, mix(p.m, '#ffffff', 0.4))
    g.px(2, 6, INK)
    g.px(3, 8, mix(p.m, INK, 0.3))
  },
  turtle(g, p) {
    g.ellipse(2, 3, 1.8, 1.2, p.d)
    g.ellipse(12, 3, 1.8, 1.2, p.d)
    g.ellipse(2.5, 11, 1.6, 1.2, p.d)
    g.ellipse(11.5, 11, 1.6, 1.2, p.d)
    g.circle(7, 1.5, 1.6, p.d)
    g.px(6, 1, INK)
    g.px(8, 1, INK)
    g.ellipse(7, 7.5, 5, 5, mix(p.m, INK, 0.25))
    g.ellipse(7, 7.2, 4.5, 4.6, p.m)
    for (const [x, y] of [[7, 5], [5, 8], [9, 8], [7, 10]] as [number, number][]) {
      g.rect(x - 1, y - 1, 2, 2, p.a)
      g.px(x, y, mix(p.m, INK, 0.2))
    }
    g.px(12, 12, p.d)
  },
  hippo(g, p) {
    g.circle(3.5, 2.5, 1.4, mix(p.m, INK, 0.2))
    g.circle(10.5, 2.5, 1.4, mix(p.m, INK, 0.2))
    blob(g, 7, 6.5, 5.5, 4.8, p.m, mix(p.m, '#ffffff', 0.5), mix(p.m, INK, 0.25))
    g.ellipse(7, 10, 5, 3, mix(p.m, '#ffffff', 0.2))
    g.ellipse(7, 9.6, 4.4, 2.4, mix(p.m, '#ffffff', 0.35))
    g.px(5, 9, mix(p.m, INK, 0.45))
    g.px(9, 9, mix(p.m, INK, 0.45))
    eyes(g, 4, 10, 6)
    g.px(2, 8, p.a)
    g.px(12, 8, p.a)
    g.px(3, 8, p.a)
    g.px(11, 8, p.a)
    g.hline(5, 9, 12, mix(p.m, INK, 0.3))
    g.px(6, 4, '#ffffff')
    g.px(7, 3, '#ffffff')
    g.rect(6, 12, 2, 1, W)
  },
  monitor(g, p) {
    g.thickLine(10, 8, 13, 12, 1.8, p.m)
    g.px(13, 13, p.m)
    g.px(12, 13, p.m)
    g.ellipse(7, 8, 4.5, 2.4, p.m)
    g.rect(3, 9, 2, 3, p.m)
    g.rect(9, 9, 2, 3, p.m)
    g.px(2, 12, p.d)
    g.px(10, 12, p.d)
    g.thickLine(3, 7, 1, 5, 2, p.m)
    g.ellipse(1.5, 4.5, 1.5, 1, p.m)
    g.px(1, 4, INK)
    g.line(0, 5, -1, 6, '#e8514a')
    for (const [x, y] of [[5, 7], [7, 7], [9, 7], [6, 9], [8, 9], [11, 10]] as [number, number][]) g.px(x, y, p.a)
    g.ellipse(7, 7, 3, 0.8, mix(p.m, '#ffffff', 0.25))
    g.px(4, 1, p.a)
    g.px(6, 0, p.a)
    g.px(5, 2, mix(p.a, '#ffffff', 0.5))
  },
  cat(g, p) {
    g.ellipse(7, 10, 4.5, 3.8, mix(p.m, INK, 0.2))
    g.ellipse(7, 9.8, 4, 3.4, p.m)
    g.poly([[2, 4], [3, 0], [6, 2]], p.m)
    g.poly([[12, 4], [11, 0], [8, 2]], p.m)
    g.px(3, 2, P.pink)
    g.px(11, 2, P.pink)
    g.ellipse(7, 4.8, 5, 3.6, p.m)
    for (const x of [6, 8]) g.vline(x, 1, 3, mix(p.m, INK, 0.3))
    g.ellipse(7, 6.5, 2.5, 1.5, p.a)
    eyes(g, 4, 10, 5, false)
    g.px(4, 4, INK)
    g.px(10, 4, INK)
    g.px(7, 6, P.pink)
    g.line(0, 6, 3, 6, mix(p.m, INK, 0.4))
    g.line(14, 6, 11, 6, mix(p.m, INK, 0.4))
    // Raised paw (a lucky wave).
    g.ellipse(12, 8.5, 1.5, 2, p.a)
    g.px(12, 7, mix(p.a, INK, 0.2))
    g.rect(5, 12, 4, 1, p.a)
    g.px(1, 11, mix(p.m, INK, 0.2))
    g.px(2, 12, mix(p.m, INK, 0.2))
    g.px(4, 9, mix(p.m, INK, 0.25))
    g.px(10, 11, mix(p.m, INK, 0.25))
  },
  monster(g, p) {
    g.ellipse(3.5, 2.5, 1.8, 3, p.m)
    g.ellipse(10.5, 2.5, 1.8, 3, p.m)
    g.vline(3, 1, 4, p.d)
    g.vline(10, 1, 4, p.d)
    blob(g, 7, 7.5, 5.5, 5, p.m, mix(p.m, '#ffffff', 0.3), mix(p.m, INK, 0.3))
    g.ellipse(7, 7.5, 4, 3.2, p.a)
    g.circle(5, 6.5, 1.3, INK)
    g.circle(9, 6.5, 1.3, INK)
    g.px(5, 6, '#ffffff')
    g.px(9, 6, '#ffffff')
    g.rect(4, 9, 6, 2, INK)
    for (const x of [4, 6, 8]) g.px(x, 9, '#ffffff')
    for (const x of [5, 7, 9]) g.px(x, 10, '#ffffff')
    g.px(3, 8, p.d)
    g.px(11, 8, p.d)
    g.rect(4, 12, 2, 2, mix(p.m, INK, 0.3))
    g.rect(8, 12, 2, 2, mix(p.m, INK, 0.3))
  },
  boba(g, p) {
    g.line(9, 0, 7, 4, '#ff9fc0')
    g.line(10, 0, 8, 4, '#ff5a8a')
    g.ellipse(7, 4, 4.5, 1.8, mix(p.d, INK, 0.1))
    g.ellipse(7, 3.6, 4, 1.4, p.d)
    g.px(5, 3, '#ffffff')
    g.poly([[2.5, 4.5], [11.5, 4.5], [10.5, 13], [3.5, 13]], p.m)
    g.poly([[2.5, 4.5], [5, 4.5], [5, 13], [3.5, 13]], mix(p.m, '#ffffff', 0.35))
    g.rect(3, 7, 8, 2, '#fffaf0')
    g.px(6, 7, '#e8514a')
    g.px(7, 8, '#e8514a')
    for (const [x, y] of [[4, 11], [6, 12], [8, 11], [9, 12], [5, 12], [7, 10]] as [number, number][]) g.px(x, y, p.a)
  },
  mookata(g, p) {
    g.ellipse(7, 9, 7, 3, mix(p.m, INK, 0.3))
    g.ellipse(7, 8.6, 6.4, 2.5, '#f3dd9a')
    for (const [x, y] of [[2, 9], [12, 9], [4, 10], [10, 10]] as [number, number][]) g.px(x, y, p.d)
    g.ellipse(7, 7, 4, 3.2, p.m)
    g.ellipse(6, 6, 2, 1.4, mix(p.m, '#ffffff', 0.4))
    for (const [x, y] of [[5, 5], [8, 4], [9, 7], [6, 8]] as [number, number][]) {
      g.rect(x, y, 2, 1, p.a)
      g.px(x, y + 1, mix(p.a, INK, 0.2))
    }
    g.rect(4, 11, 6, 3, '#8c8187')
    g.px(5, 12, '#ff8a3a')
    g.px(7, 12, '#e8514a')
    g.px(9, 12, '#ff8a3a')
  },
  yadom(g, p) {
    g.thickLine(3, 11, 10, 3, 4, p.m)
    g.thickLine(3, 11, 10, 3, 2, mix(p.m, '#ffffff', 0.3))
    g.thickLine(5, 9, 8, 5.5, 3.4, p.a)
    g.line(5, 8, 8, 5, p.d)
    g.thickLine(10, 3, 12, 1, 3, p.d)
    g.px(12, 1, mix(p.d, '#ffffff', 0.4))
    g.px(2, 12, mix(p.m, INK, 0.3))
  },
  toastie(g, p) {
    g.poly([[1, 12], [6, 2], [11, 12]], p.d)
    g.poly([[2, 11], [6, 3], [10, 11]], p.m)
    g.hline(2, 10, 8, p.a)
    g.px(3, 9, p.a)
    g.px(9, 9, p.a)
    g.px(9, 10, p.a)
    g.hline(3, 9, 9, '#ff9aa6')
    g.poly([[7, 13], [11, 4], [14, 13]], mix(p.d, INK, 0.1))
    g.poly([[8, 12], [11, 5], [13, 12]], mix(p.m, INK, 0.08))
    g.hline(9, 12, 10, p.a)
    for (const [x, y] of [[5, 5], [7, 7], [11, 8]] as [number, number][]) g.px(x, y, mix(p.m, INK, 0.25))
    g.vline(3, 0, 1, '#ffffff')
    g.vline(13, 1, 2, '#ffffff')
  },
  teabag(g, p) {
    g.ellipse(7, 1.5, 3, 1.5, p.d)
    g.rect(6, 1, 2, 1, '#ffffff')
    g.rect(5, 3, 4, 1, '#ff5a8a')
    g.poly([[5, 4], [9, 4], [12, 11], [10, 13], [4, 13], [2, 11]], p.m)
    g.poly([[5, 4], [7, 4], [5, 13], [4, 13], [2, 11]], mix(p.m, '#ffffff', 0.35))
    g.rect(3, 9, 8, 1, mix(p.m, '#ffffff', 0.55))
    for (const [x, y] of [[6, 7], [8, 9], [5, 10]] as [number, number][]) g.rect(x, y, 2, 1, p.a)
    g.line(9, 0, 8, 8, p.d)
  },
  motorbike(g, p) {
    g.circle(3, 11, 2.4, INK)
    g.circle(11, 11, 2.4, INK)
    g.px(3, 11, '#bdb2ae')
    g.px(11, 11, '#bdb2ae')
    g.poly([[3, 9], [11, 9], [12, 11], [3, 11]], p.a)
    g.rect(9, 7, 3, 2, p.a)
    g.px(12, 7, '#fff3a6')
    g.circle(6, 2.5, 2, p.d)
    g.rect(5, 3, 2, 1, SKIN)
    g.poly([[4, 4], [8, 4], [8, 9], [4, 9]], p.m)
    g.px(6, 6, INK)
    g.px(6, 5, INK)
    g.line(8, 5, 10, 7, SKIN)
  },
  dog(g, p) {
    g.ellipse(7, 10.5, 4.5, 3.2, mix(p.m, INK, 0.15))
    g.ellipse(7, 10.2, 4, 2.8, p.m)
    g.ellipse(2.5, 5, 1.6, 2.6, p.d)
    g.ellipse(11.5, 5, 1.6, 2.6, p.d)
    g.ellipse(7, 5.5, 4.5, 3.8, p.m)
    g.ellipse(7, 7.2, 2.4, 1.6, p.a)
    g.px(7, 6, INK)
    g.px(6, 8, INK)
    g.px(8, 8, INK)
    g.px(4, 5, INK)
    g.px(10, 5, INK)
    g.line(3, 3, 5, 4, INK)
    g.line(11, 3, 9, 4, INK)
    g.rect(5, 12, 4, 1, p.a)
  },
  currybag(g, p) {
    g.rect(6, 0, 2, 3, mix(p.m, '#ffffff', 0.5))
    g.rect(5, 2, 4, 1, p.d)
    g.poly([[6, 3], [8, 3], [12, 9], [11, 13], [3, 13], [2, 9]], p.m)
    g.poly([[6, 3], [7, 3], [5, 13], [3, 13], [2, 9]], mix(p.m, '#ffffff', 0.3))
    g.ellipse(9, 9, 1.4, 1, mix(p.m, INK, 0.3))
    g.px(5, 10, '#fff1d6')
    g.px(8, 11, '#e8413a')
    g.px(10, 7, '#3f9a4a')
    g.line(4, 5, 3, 8, '#ffffff')
  },
  gecko(g, p) {
    g.thickLine(7, 9, 11, 13, 1.6, p.m)
    g.ellipse(7, 7, 2.8, 3.6, p.m)
    g.ellipse(7, 2.6, 2.4, 2, p.m)
    g.px(5, 2, '#ffd54f')
    g.px(9, 2, '#ffd54f')
    g.px(5, 1, INK)
    g.px(9, 1, INK)
    for (const [x1, y1, x2, y2] of [[5, 5, 2, 3], [9, 5, 12, 3], [5, 9, 2, 11], [9, 9, 12, 11]] as number[][]) {
      g.line(x1, y1, x2, y2, p.m)
      g.px(x2, y2, p.d)
    }
    for (const [x, y] of [[6, 6], [8, 7], [7, 9], [6, 4], [9, 12]] as [number, number][]) g.px(x, y, p.a)
  },
  cupnoodle(g, p) {
    g.poly([[3, 3], [11, 3], [10, 13], [4, 13]], p.m)
    g.poly([[3, 3], [5, 3], [5, 13], [4, 13]], mix(p.m, '#ffffff', 0.4))
    g.rect(3, 7, 8, 2, p.a)
    g.px(6, 7, '#ffffff')
    g.px(8, 8, '#ffffff')
    g.ellipse(7, 3, 4, 1.2, p.d)
    for (const x of [5, 7, 9]) {
      g.line(x, 2, x - 1, 0, p.d)
      g.px(x - 1, 0, mix(p.d, INK, 0.2))
    }
    g.poly([[9, 3], [13, 1], [13, 3]], '#dfe3ea')
    g.line(11, 0, 13, 6, '#c28e5c')
  },
  somdej(g, p) {
    g.rect(1, 0, 12, 14, p.m)
    g.rect(1, 0, 12, 1, mix(p.m, '#ffffff', 0.4))
    g.poly([[2, 13], [2, 5], [7, 1], [12, 5], [12, 13]], mix(p.m, INK, 0.12))
    seated(g, { ...p, m: mix(p.m, '#ffffff', 0.2), mL: mix(p.m, '#ffffff', 0.5), mD: mix(p.m, INK, 0.3) }, 7, 2)
    g.hline(3, 11, 13, p.a)
  },
  monkcoin(g, p) {
    g.circle(7, 7, 6.5, p.mD)
    g.circle(7, 7, 5.6, p.m)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      g.px(7 + Math.cos(a) * 5, 7 + Math.sin(a) * 5, p.a)
    }
    g.circle(7, 5.5, 2, SKIN)
    g.px(6, 5, SKIN_D)
    g.px(8, 5, SKIN_D)
    g.poly([[3, 11], [11, 11], [9, 8], [5, 8]], '#f58f35')
    g.line(5, 8, 9, 11, '#d0661f')
  },
  takrut(g, p) {
    g.line(0, 12, 3, 9, '#e8514a')
    g.line(11, 2, 14, 0, '#e8514a')
    g.thickLine(3, 10, 11, 3, 4, p.mD)
    g.thickLine(3, 9.5, 11, 2.5, 3, p.m)
    g.line(4, 8, 10, 3, mix(p.m, '#ffffff', 0.5))
    for (const [x, y] of [[5, 8], [7, 6], [9, 5]] as [number, number][]) g.px(x, y, mix(p.m, INK, 0.4))
    g.circle(3, 10, 1.2, p.mD)
    g.circle(11, 3, 1.2, p.mD)
  },
  yant(g, p) {
    g.rect(1, 0, 12, 14, p.m)
    g.frame(1, 0, 12, 14, mix(p.m, INK, 0.2))
    for (let i = 0; i < 5; i++) {
      const x = 3 + i * 2
      for (let y = 2 + (i % 2); y < 12; y += 2) g.px(x + ((y >> 1) % 2), y, p.a)
      g.px(x, 1, p.a)
    }
    g.circle(10, 11, 1.4, p.d)
  },
  nangkwak(g, p) {
    g.poly([[7, 0], [5.5, 3], [8.5, 3]], p.a)
    g.circle(7, 4.5, 2.2, SKIN)
    g.rect(5, 2, 4, 1, INK)
    g.px(6, 4, INK)
    g.px(8, 4, INK)
    g.px(7, 6, '#e8514a')
    g.poly([[3, 7], [11, 7], [13, 13], [1, 13]], p.m)
    g.rect(3, 7, 8, 1, p.a)
    g.line(10, 8, 12, 5, SKIN)
    g.px(12, 4, SKIN)
    g.px(13, 4, SKIN)
    g.px(4, 10, p.a)
    g.px(9, 11, p.a)
    g.hline(1, 13, 13, mix(p.m, INK, 0.3))
  },
  lottery(g, p) {
    g.rect(1, 0, 5, 14, '#8a6a4a')
    g.vline(2, 0, 13, '#a88a64')
    g.rect(0, 5, 7, 3, p.m)
    g.rect(0, 6, 7, 1, p.d)
    g.px(7, 8, p.m)
    g.px(7, 9, p.d)
    g.rect(8, 2, 6, 4, p.a)
    g.rect(8, 8, 6, 4, p.a)
    g.hline(9, 12, 3, p.d)
    g.hline(9, 11, 4, INK)
    g.hline(9, 12, 9, p.d)
    g.hline(10, 12, 10, INK)
  },
  crystal(g, p) {
    g.circle(7, 6, 6.6, mix(p.d, '#ffffff', 0.55))
    g.poly([[3, 12], [11, 12], [9, 10], [5, 10]], p.a)
    g.rect(2, 12, 10, 2, mix(p.a, INK, 0.25))
    g.circle(7, 6, 4.5, mix(p.m, INK, 0.2))
    g.circle(7, 6, 4, p.m)
    g.poly([[4, 6], [7, 2], [10, 6], [7, 10]], mix(p.m, '#ffffff', 0.3))
    g.line(7, 2, 7, 10, mix(p.m, '#ffffff', 0.5))
    g.px(5, 4, '#ffffff')
    g.px(9, 7, p.d)
    g.px(6, 8, '#ff9fc0')
  },
  book(g, p) {
    g.rect(2, 1, 11, 13, mix(p.m, INK, 0.35))
    g.rect(2, 1, 10, 12, p.m)
    g.rect(12, 2, 1, 11, '#fffaf0')
    g.rect(2, 1, 2, 12, mix(p.m, INK, 0.2))
    g.frame(5, 3, 6, 8, p.a)
    g.poly([[8, 4], [10, 7], [8, 10], [6, 7]], p.a)
    g.px(8, 7, p.d)
    g.hline(5, 10, 1, p.d)
  },
  sala(g, p) {
    g.poly([[0, 7], [3, 3], [7, 0], [11, 3], [14, 7]], p.m)
    g.poly([[0, 7], [3, 3], [7, 0], [5, 7]], mix(p.m, '#ffffff', 0.25))
    g.line(0, 7, 7, 0, p.a)
    g.line(14, 7, 7, 0, p.a)
    g.px(0, 6, p.a)
    g.px(13, 6, p.a)
    g.px(7, 0, p.a)
    g.rect(1, 7, 12, 1, p.a)
    for (const x of [2, 5, 8, 11]) g.rect(x, 8, 1, 5, p.d)
    g.rect(0, 13, 14, 1, mix(p.d, INK, 0.3))
  },
  alms(g, p) {
    g.circle(10, 4, 3.4, mix(p.d, '#ffffff', 0.5))
    g.circle(10, 4, 2, p.d)
    g.rect(0, 12, 14, 2, '#b8a88c')
    for (const x of [2, 7, 12]) {
      g.circle(x, 6, 1.4, SKIN)
      g.poly([[x - 2, 8], [x + 2, 8], [x + 2, 12], [x - 2, 12]], p.m)
      g.line(x - 2, 8, x + 1, 12, mix(p.m, INK, 0.25))
      g.rect(x - 1, 9, 2, 1, INK)
    }
  },
  watergun(g, p) {
    g.rect(1, 5, 9, 3, p.m)
    g.rect(1, 5, 9, 1, mix(p.m, '#ffffff', 0.4))
    g.rect(10, 6, 2, 1, p.m)
    g.rect(3, 8, 3, 4, p.m)
    g.rect(4, 2, 4, 3, p.a)
    g.px(5, 2, mix(p.a, '#ffffff', 0.5))
    g.px(6, 9, INK)
    for (const [x, y] of [[12, 5], [13, 4], [13, 7], [12, 8], [13, 10]] as [number, number][]) g.px(x, y, p.d)
    g.rect(1, 3, 2, 2, mix(p.m, INK, 0.2))
  },
  khan(g, p) {
    g.ellipse(7, 4, 6.5, 2, mix(p.m, INK, 0.3))
    g.ellipse(7, 4, 5.8, 1.4, '#9fd0ff')
    g.px(5, 4, '#ffffff')
    g.poly([[0.5, 4], [13.5, 4], [11, 11], [3, 11]], p.m)
    g.poly([[0.5, 4], [4, 4], [4, 11], [3, 11]], mix(p.m, '#ffffff', 0.5))
    for (const x of [4, 7, 10]) {
      g.circle(x, 7, 1, p.a)
      g.px(x, 7, mix(p.m, '#ffffff', 0.3))
    }
    g.hline(1, 12, 4, p.d)
    g.rect(4, 11, 6, 2, p.d)
  },
  flowershirt(g, p) {
    g.poly([[0, 4], [4, 1], [10, 1], [14, 4], [12, 7], [11, 6], [11, 13], [3, 13], [3, 6], [2, 7]], p.m)
    g.poly([[5, 1], [7, 4], [9, 1]], '#fffaf0')
    g.vline(7, 4, 13, mix(p.m, INK, 0.2))
    for (const [x, y, c] of [[4, 5, p.a], [9, 7, p.d], [5, 10, p.d], [10, 11, p.a], [1, 4, p.a], [12, 4, p.d]] as [number, number, string][]) {
      g.px(x, y, c)
      g.px(x + 1, y, c)
      g.px(x, y + 1, c)
      g.px(x + 1, y + 1, mix(c, '#ffffff', 0.4))
    }
  },
  frog(g, p) {
    g.circle(3.5, 3.5, 2.3, p.m)
    g.circle(10.5, 3.5, 2.3, p.m)
    g.circle(3.5, 3.5, 1.3, '#ffffff')
    g.circle(10.5, 3.5, 1.3, '#ffffff')
    g.px(4, 3, INK)
    g.px(10, 3, INK)
    blob(g, 7, 8, 6, 4.5, p.m, mix(p.m, '#ffffff', 0.35), p.d)
    g.ellipse(7, 10, 3.5, 2.2, p.a)
    g.hline(4, 10, 7, p.d)
    g.px(3, 6, p.d)
    g.px(11, 6, p.d)
    g.px(3, 8, P.blush)
    g.px(11, 8, P.blush)
    g.rect(1, 12, 3, 2, p.m)
    g.rect(10, 12, 3, 2, p.m)
  },
  snail(g, p) {
    g.ellipse(7, 12, 6.5, 1.8, p.a)
    g.vline(1, 7, 11, p.a)
    g.vline(3, 8, 11, p.a)
    g.px(1, 6, INK)
    g.px(3, 7, INK)
    g.circle(8.5, 7.5, 4.5, mix(p.m, INK, 0.2))
    g.circle(8.3, 7.3, 4, p.m)
    g.circle(8.5, 7.5, 2.6, p.d)
    g.circle(8.5, 7.5, 1.6, p.m)
    g.px(8, 7, p.d)
    g.px(7, 5, mix(p.m, '#ffffff', 0.5))
    g.px(12, 1, '#5a8de0')
    g.px(12, 2, '#9fd0ff')
  },
  rainbow(g, p) {
    const cols = [p.m, '#f58f35', p.a, '#6cc36a', p.d]
    cols.forEach((c, i) => {
      g.ellipse(7, 12, 7 - i, 8 - i, c)
    })
    g.ctx.clearRect(5 - g.ox, 10 - g.oy, 5, 4)
    g.ctx.clearRect(0 - g.ox, 12 - g.oy, 14, 2)
    g.ellipse(2, 12, 2.4, 1.6, '#ffffff')
    g.ellipse(12, 12, 2.4, 1.6, '#ffffff')
    g.ellipse(3.5, 11, 1.6, 1.2, '#ffffff')
    g.ellipse(10.5, 11, 1.6, 1.2, '#ffffff')
  },
  candle(g, p) {
    g.ellipse(7, 1.5, 1, 1.8, '#ff9a3a')
    g.px(7, 1, '#fff3a6')
    g.vline(7, 3, 3, INK)
    g.rect(4, 4, 6, 7, p.m)
    g.rect(4, 4, 2, 7, mix(p.m, '#ffffff', 0.4))
    for (const [x, y] of [[6, 5], [8, 7], [6, 9], [8, 5]] as [number, number][]) {
      g.px(x, y, p.a)
      g.px(x + 1, y + 1, p.a)
    }
    g.poly([[2, 11], [12, 11], [13, 14], [1, 14]], p.a)
    g.hline(2, 11, 12, p.d)
    g.px(1, 11, p.d)
    g.px(12, 11, p.d)
  },
  krathong(g, p) {
    g.ellipse(7, 11, 7, 2.6, mix(p.m, INK, 0.3))
    g.ellipse(7, 10.5, 6.5, 2.2, p.m)
    for (let i = 0; i < 7; i++) {
      const x = 1.5 + i * 1.8
      g.poly([[x, 10], [x + 1, 7], [x + 2, 10]], i % 2 ? mix(p.m, '#ffffff', 0.25) : p.m)
    }
    g.circle(5, 7, 1.6, p.a)
    g.circle(9, 7, 1.6, p.a)
    g.circle(7, 6.5, 1.4, mix(p.a, '#ffffff', 0.3))
    g.vline(7, 2, 5, '#fffaf0')
    g.px(7, 1, p.d)
    g.px(7, 0, mix(p.d, '#ffffff', 0.5))
    g.vline(4, 3, 5, '#8a5a32')
    g.vline(10, 3, 5, '#8a5a32')
    g.px(4, 2, '#e8514a')
    g.px(10, 2, '#e8514a')
  },
  moon(g, p) {
    g.rect(0, 0, 14, 10, p.a)
    g.px(2, 2, '#ffffff')
    g.px(12, 1, '#ffffff')
    g.px(4, 6, '#ffffff')
    g.circle(8.5, 4.5, 3.8, p.m)
    g.px(9, 3, mix(p.m, INK, 0.12))
    g.px(7, 6, mix(p.m, INK, 0.12))
    g.rect(0, 10, 14, 4, p.d)
    g.hline(6, 11, 11, p.m)
    g.hline(7, 10, 12, mix(p.m, p.d, 0.5))
    g.ellipse(3, 11, 2, 1, '#5ea653')
    g.px(3, 9, '#ffd54f')
  },
  mist(g, p) {
    g.rect(0, 0, 14, 14, p.d)
    g.circle(10, 3, 1.8, '#fff3a6')
    g.poly([[0, 10], [4, 3], [7, 7], [10, 2], [14, 8], [14, 14], [0, 14]], p.m)
    g.poly([[4, 3], [3, 6], [5, 6]], mix(p.m, '#ffffff', 0.4))
    g.poly([[10, 2], [9, 5], [11, 5]], mix(p.m, '#ffffff', 0.4))
    g.rect(0, 9, 14, 2, p.a)
    g.rect(2, 8, 5, 1, p.a)
    g.rect(0, 12, 14, 2, p.a)
    g.rect(8, 11, 6, 1, p.a)
  },
  scarf(g, p) {
    g.thickLine(1, 3, 12, 3, 3.5, p.m)
    g.thickLine(10, 3, 9, 12, 3.5, p.m)
    for (const x of [3, 6, 9]) g.vline(x, 2, 4, p.a)
    for (const y of [6, 9]) g.hline(8, 11, y, p.a)
    for (const x of [8, 9, 10, 11]) g.vline(x, 12, 13, p.d)
    g.px(1, 2, mix(p.m, '#ffffff', 0.4))
  },
  flower(g, p) {
    g.line(0, 13, 6, 8, '#8a5a32')
    g.line(6, 8, 12, 5, '#8a5a32')
    for (const [cx, cy, r] of [[7, 6, 3], [11, 3, 2], [3, 10, 2]] as [number, number, number][]) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        g.circle(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75, r * 0.55, p.m)
      }
      g.circle(cx, cy, r * 0.35, p.d)
      g.px(cx - 1, cy - 1, p.a)
    }
  },
  firework(g, p) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const c = i % 3 === 0 ? p.m : i % 3 === 1 ? p.a : p.d
      g.line(7 + Math.cos(a) * 2, 7 + Math.sin(a) * 2, 7 + Math.cos(a) * 6, 7 + Math.sin(a) * 6, c)
      g.px(7 + Math.cos(a) * 6.8, 7 + Math.sin(a) * 6.8, '#ffffff')
    }
    g.circle(7, 7, 1.4, '#ffffff')
  },
  calendar(g, p) {
    g.rect(1, 2, 12, 12, p.m)
    g.rect(1, 2, 12, 3, p.a)
    g.px(4, 1, INK)
    g.px(10, 1, INK)
    g.rect(4, 6, 6, 4, p.d)
    g.px(6, 7, '#ffffff')
    for (let y = 11; y < 14; y += 2) for (let x = 2; x < 13; x += 2) g.px(x, y, mix(p.m, INK, 0.3))
    g.px(8, 11, p.a)
  },
  basket(g, p) {
    g.line(3, 6, 7, 0, p.a)
    g.line(11, 6, 7, 0, p.a)
    g.circle(5, 6, 2, p.a)
    g.circle(9, 6, 2, p.d)
    g.circle(7, 5, 1.8, '#6cc36a')
    g.poly([[1, 7], [13, 7], [11, 13], [3, 13]], p.m)
    for (let y = 8; y < 13; y += 2) g.hline(2, 11, y, mix(p.m, INK, 0.25))
    for (let x = 3; x < 12; x += 2) g.vline(x, 7, 12, mix(p.m, '#ffffff', 0.2))
    g.rect(6, 7, 2, 2, '#e8514a')
    g.px(5, 8, '#e8514a')
    g.px(8, 8, '#e8514a')
    g.line(2, 5, 3, 2, '#ffffff')
  },
  angpao(g, p) {
    g.rect(2, 1, 10, 13, p.m)
    g.rect(2, 1, 1, 13, mix(p.m, '#ffffff', 0.25))
    g.poly([[2, 1], [12, 1], [7, 5]], p.d)
    g.circle(7, 8.5, 2.6, p.a)
    g.hline(6, 8, 8, p.m)
    g.vline(7, 7, 10, p.m)
    g.hline(3, 11, 12, p.a)
  },
  lion(g, p) {
    g.ellipse(7, 7, 6.5, 6, p.a)
    g.ellipse(7, 7, 5.5, 5, p.m)
    g.rect(3, 3, 8, 2, p.d)
    g.vline(7, 0, 2, p.a)
    g.circle(4.5, 6, 1.6, '#ffffff')
    g.circle(9.5, 6, 1.6, '#ffffff')
    g.px(5, 6, INK)
    g.px(10, 6, INK)
    g.rect(4, 9, 6, 3, INK)
    for (const x of [4, 6, 8]) g.px(x, 9, '#ffffff')
    g.rect(5, 11, 4, 1, '#ff8f9c')
    g.hline(1, 3, 12, p.d)
    g.hline(10, 12, 12, p.d)
    g.px(7, 8, p.a)
  },
  ingot(g, p) {
    g.ellipse(7, 12, 6.5, 1.6, p.a)
    g.poly([[0, 6], [3, 9], [11, 9], [14, 6], [12, 11], [2, 11]], p.m)
    g.poly([[0, 6], [3, 9], [5, 9], [4, 11], [2, 11]], mix(p.m, '#ffffff', 0.4))
    g.ellipse(7, 6.5, 3.2, 2.8, p.m)
    g.ellipse(6, 5.5, 1.4, 1.2, p.d)
    g.hline(2, 12, 10, mix(p.m, INK, 0.3))
    g.px(12, 7, p.d)
  },
  star(g, p) {
    const pts: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 ? 2.8 : 6.5
      pts.push([7 + Math.cos(a) * r, 7.5 + Math.sin(a) * r])
    }
    g.poly(pts, p.mD)
    g.poly(pts.map(([x, y]) => [x - 0.4, y - 0.4]), p.m)
    g.px(6, 5, p.mL)
    g.px(5, 6, p.a)
  },
}

// Aliases for motif names other systems may use.
const ALIAS: Record<string, string> = { lotus: 'flower', fish: 'betta', temple: 'sala', hippo_bite: 'hippo', orange: 'citrus', stupa: 'chedi', cup: 'boba' }

export const MOTIF_NAMES = Object.keys(MOTIFS)

/** Add motifs from other systems (e.g. the temple fair's goldfish and teddy). Existing names win. */
export function registerMotifs(extra: Record<string, Motif>) {
  for (const [k, fn] of Object.entries(extra)) if (!MOTIFS[k]) MOTIFS[k] = fn
}

export function hasMotif(m: string): boolean {
  return !!MOTIFS[m] || !!ALIAS[m]
}

function motifFn(name: string): Motif {
  return MOTIFS[name] ?? MOTIFS[ALIAS[name] ?? ''] ?? MOTIFS.star
}

/** The motif alone on a 14×14 canvas. */
function motifCanvas(name: string, pal: [string, string, string]): HTMLCanvasElement {
  return bake(14, 14, (g) => motifFn(name)(g, ramp(pal)))
}

/** Recolour a canvas by brightness into a metal ramp (for amulets). */
function tint(src: HTMLCanvasElement, rampCols: string[]): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height)
  const ctx = c.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const cols = rampCols.map((h) => {
    const n = parseInt(h.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  })
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] < 20) continue
    const l = (img.data[i] * 0.3 + img.data[i + 1] * 0.55 + img.data[i + 2] * 0.15) / 255
    const k = cols[Math.min(cols.length - 1, Math.floor(l * cols.length))]
    img.data[i] = k[0]
    img.data[i + 1] = k[1]
    img.data[i + 2] = k[2]
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

const METAL_GOLD = ['#8a5222', '#b8742a', '#e9a53a', '#ffd54f', '#fff3a6']
const METAL_BRONZE = ['#4a3128', '#6e4a35', '#9a6a45', '#c28e5c', '#e8c49a']

// ---------------------------------------------------------------------------
// Kind bases (24×24; the outline makes the sprite 26×26)

type Base = (g: Surface, motif: HTMLCanvasElement, c: CollectibleDef, p: MP) => void

const BASES: Record<CollectibleKind, Base> = {
  figure(g, m, _c, p) {
    g.ellipse(12, 20.5, 8.5, 2.6, '#8c7a6a')
    g.rect(3.5, 20, 17, 2, '#8c7a6a')
    g.ellipse(12, 19.8, 8.5, 2.4, '#efe4d0')
    g.ellipse(12, 19.6, 7, 1.6, '#fffaf0')
    g.ellipse(12, 20, 5, 1, 'rgba(58,40,56,0.25)')
    g.hline(5, 19, 22, p.aD)
    g.draw(m, 5, 6)
  },
  keychain(g, m) {
    ring(g, 12, 3.5, 3.4, 1.9, '#a8a8b8', '#f2f2f6')
    for (let y = 7; y < 10; y++) g.px(12, y, y % 2 ? '#a8a8b8' : '#f2f2f6')
    g.draw(m, 5, 9)
  },
  magnet(g, m, _c, p) {
    g.rect(3, 5, 19, 17, mix(p.m, INK, 0.5))
    g.rect(2, 4, 19, 17, mix(p.m, INK, 0.2))
    g.rect(3, 5, 17, 15, mix(p.a, '#fffaf0', 0.8))
    g.rect(3, 5, 17, 1, '#ffffff')
    g.draw(m, 5, 5)
    g.hline(5, 18, 19, p.a)
    g.px(1, 4, mix(p.m, INK, 0.2))
  },
  postcard(g, m, _c, p) {
    g.rect(1, 4, 23, 18, '#d6c8ae')
    g.rect(0, 3, 23, 18, '#fffaf0')
    g.rect(1, 4, 15, 16, mix(p.m, '#a4dcff', 0.75))
    g.rect(1, 13, 15, 7, mix(p.a, '#c8f0cf', 0.7))
    g.draw(m, 2, 5)
    g.rect(17, 5, 5, 6, p.a)
    g.frame(17, 5, 5, 6, '#ffffff')
    g.px(19, 8, '#ffffff')
    for (const y of [13, 15, 17]) g.hline(17, 21, y, '#c8bca8')
  },
  amulet(g, m, c, p) {
    const metal = c.rarity === 'common' ? METAL_BRONZE : METAL_GOLD
    ring(g, 12, 2.5, 2.4, 1.2, metal[2], metal[4])
    g.ellipse(12, 13, 9.5, 10.5, metal[1])
    g.ellipse(12, 13, 8.5, 9.5, metal[3])
    g.ellipse(11.5, 12.5, 8, 9, metal[4])
    g.ellipse(12, 13, 7, 8, mix(p.m, '#5a1a1a', 0.75))
    g.draw(tint(m, metal), 5, 6)
    g.px(7, 6, 'rgba(255,255,255,0.8)')
    g.line(7, 8, 9, 5, 'rgba(255,255,255,0.35)')
  },
  plush(g, m) {
    g.draw(m, 5, 5)
    g.rect(16, 18, 5, 4, '#ffffff')
    g.rect(16, 18, 5, 1, '#e8514a')
    g.px(18, 20, '#e8709e')
    for (const [x, y] of [[4, 16], [20, 8]] as [number, number][]) {
      g.px(x, y, '#fff3a6')
    }
  },
  snowglobe(g, m, _c, p) {
    g.poly([[4, 19], [20, 19], [22, 23], [2, 23]], '#8a5a32')
    g.rect(3, 20, 18, 1, p.a)
    g.hline(4, 19, 19, '#c28e5c')
    g.circle(12, 10.5, 9.5, 'rgba(160,210,240,0.55)')
    const clip = createCanvas(24, 24)
    const cx = clip.getContext('2d')!
    cx.drawImage(m, 5, 4)
    cx.globalCompositeOperation = 'destination-in'
    cx.beginPath()
    cx.arc(12, 10.5, 8.6, 0, Math.PI * 2)
    cx.fill()
    g.draw(clip, 0, 0)
    for (const [x, y] of [[6, 7], [16, 5], [9, 13], [18, 11], [13, 3], [5, 12], [15, 15]] as [number, number][]) g.px(x, y, '#ffffff')
    g.line(6, 5, 9, 2, 'rgba(255,255,255,0.9)')
    g.px(5, 7, 'rgba(255,255,255,0.7)')
    g.ellipse(12, 18, 7, 1.2, 'rgba(255,255,255,0.35)')
  },
  stamp(g, m, _c, p) {
    g.rect(2, 2, 21, 21, '#c8bca8')
    g.rect(1, 1, 21, 21, '#fffaf0')
    for (let i = 1; i < 22; i += 2) {
      g.ctx.clearRect(i, 1, 1, 1)
      g.ctx.clearRect(i, 21, 1, 1)
      g.ctx.clearRect(1, i, 1, 1)
      g.ctx.clearRect(21, i, 1, 1)
    }
    g.rect(3, 3, 17, 17, mix(p.m, '#fffaf0', 0.62))
    g.draw(m, 4, 4)
    g.rect(15, 17, 4, 2, p.aD)
    g.px(16, 17, '#fffaf0')
  },
  pin(g, m) {
    // Die-cut enamel: the motif with a gold rim and a glossy glint.
    const s = outlineCanvas(m, '#e9a53a', true)
    g.draw(s.canvas, 4, 4)
    g.px(7, 6, '#ffffff')
    g.px(8, 5, 'rgba(255,255,255,0.7)')
  },
  relic(g, m, _c, p) {
    g.circle(12, 11, 9, 'rgba(255,236,150,0.35)')
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      for (let k = 8; k <= 11; k++) if (k % 2 === 0) g.px(12 + Math.cos(a) * k, 11 + Math.sin(a) * k, 'rgba(255,220,110,0.8)')
    }
    g.ellipse(12, 20, 10, 3, '#8e2a2a')
    g.ellipse(12, 19.3, 9.5, 2.5, '#c43a3a')
    g.ellipse(10, 18.8, 5, 1, '#e86060')
    for (const x of [2, 22]) {
      g.vline(x, 20, 23, p.a)
      g.px(x, 23, '#ffd54f')
    }
    g.draw(m, 5, 5)
  },
  toy(g, m, _c, p) {
    // A blind box with a big "?" behind the toy.
    g.rect(1, 9, 10, 13, mix(p.a, INK, 0.3))
    g.rect(1, 9, 10, 3, mix(p.a, '#ffffff', 0.25))
    g.rect(1, 12, 10, 10, p.a)
    g.hline(3, 7, 14, '#ffffff')
    g.vline(8, 14, 16, '#ffffff')
    g.hline(5, 7, 17, '#ffffff')
    g.vline(5, 17, 18, '#ffffff')
    g.px(5, 20, '#ffffff')
    g.draw(m, 9, 8)
    g.rect(20, 23, 3, 1, 'rgba(58,40,56,0.25)')
  },
  charm(g, m) {
    g.vline(12, 0, 4, '#e8514a')
    g.px(11, 1, '#e8514a')
    g.px(13, 1, '#e8514a')
    g.rect(11, 4, 3, 2, '#b8343f')
    g.draw(m, 5, 5)
    g.rect(11, 19, 3, 1, '#ffd54f')
    for (const x of [11, 12, 13]) g.vline(x, 20, 23, '#e8514a')
    g.px(12, 23, '#b8343f')
  },
}

function foil(g: Surface, c: CollectibleDef) {
  const legendary = c.rarity === 'legendary'
  const data = g.ctx.getImageData(0, 0, g.w, g.h).data
  // A diagonal rainbow glint across opaque pixels.
  const glint = ['rgba(255,255,255,0.55)', 'rgba(255,240,170,0.45)', 'rgba(200,170,255,0.4)']
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (data[(y * g.w + x) * 4 + 3] < 40) continue
      const d = x + y
      if (d === 14 || d === 15) g.px(x, y, glint[0])
      else if (d === 16) g.px(x, y, glint[legendary ? 2 : 1])
      else if (legendary && (d === 30 || d === 31)) g.px(x, y, glint[1])
    }
  const star = (x: number, y: number, col: string) => {
    g.px(x, y, '#ffffff')
    g.px(x - 1, y, col)
    g.px(x + 1, y, col)
    g.px(x, y - 1, col)
    g.px(x, y + 1, col)
  }
  star(2, 3, '#fff3a6')
  star(21, 16, legendary ? '#ffd6ff' : '#fff3a6')
  if (legendary) star(20, 2, '#fff3a6')
}

function build(c: CollectibleDef): HTMLCanvasElement {
  const p = ramp(c.art.palette)
  const m = motifCanvas(c.art.motif, c.art.palette)
  const epic = c.rarity === 'epic' || c.rarity === 'legendary' || c.art.foil
  return bake(24, 24, (g) => {
    ;(BASES[c.kind] ?? BASES.figure)(g, m, c, p)
    if (epic) foil(g, c)
  })
}

function defOf(c: CollectibleDef | string): CollectibleDef | null {
  return typeof c === 'string' ? COLLECTIBLE_BY_ID[c] ?? null : c
}

const FALLBACK: CollectibleDef = { id: '?', name: '?', desc: '', rarity: 'common', kind: 'figure', series: '', value: 0, art: { motif: 'star', palette: ['#ffd54f', '#e9a53a', '#fff3a6'] } }

/** Outlined collectible sprite (26×26). */
export function collectibleSprite(c: CollectibleDef | string): Sprite {
  const d = defOf(c) ?? FALLBACK
  return cached(`coll:${d.id}:${d.art.motif}:${d.art.palette.join()}`, () => {
    // Plushies get their own soft, stitched chibi art (art/plush.ts).
    const s = d.kind === 'plush' && hasPlushArt(d.art.motif) ? plushSprite(d) : outlineCanvas(build(d), INK)
    if (d.rarity !== 'legendary') return s
    // A soft golden halo behind legendary items (not outlined).
    const c = bake(s.w, s.h, (g) => {
      g.circle(13, 13, 12.5, 'rgba(255,214,90,0.28)')
      g.circle(13, 13, 10, 'rgba(255,240,170,0.4)')
      for (const [x, y] of [[1, 12], [24, 9], [13, 0], [4, 23]] as [number, number][]) g.px(x, y, '#fff3a6')
    })
    c.getContext('2d')!.drawImage(s.canvas, 0, 0)
    return { canvas: c, w: s.w, h: s.h }
  })
}

/** Flat silhouette for items not collected yet. */
export function collectibleSilhouette(c: CollectibleDef | string, color = '#b7a58a'): Sprite {
  const d = defOf(c) ?? FALLBACK
  return cached(`collsil:${d.id}:${color}`, () => {
    const s = collectibleSprite(d)
    const out = createCanvas(s.w, s.h)
    const ctx = out.getContext('2d')!
    ctx.drawImage(s.canvas, 0, 0)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, s.w, s.h)
    return { canvas: out, w: s.w, h: s.h }
  })
}

const urls = new Map<string, string>()

export function collectibleUrl(c: CollectibleDef | string, scale = 3, silhouette = false): string {
  const d = defOf(c) ?? FALLBACK
  const key = `${d.id}@${scale}:${silhouette ? 1 : 0}`
  let u = urls.get(key)
  if (!u) {
    u = spriteDataUrl(silhouette ? collectibleSilhouette(d) : collectibleSprite(d), scale)
    urls.set(key, u)
  }
  return u
}

/** Just the motif (16×16 with outline) – series tabs and small badges. */
export function motifSprite(motif: string, palette: [string, string, string]): Sprite {
  return cached(`motif:${motif}:${palette.join()}`, () => outlineCanvas(motifCanvas(motif, palette), INK))
}

export function motifUrl(motif: string, palette: [string, string, string], scale = 2): string {
  const key = `m:${motif}:${palette.join()}@${scale}`
  let u = urls.get(key)
  if (!u) {
    u = spriteDataUrl(motifSprite(motif, palette), scale)
    urls.set(key, u)
  }
  return u
}
