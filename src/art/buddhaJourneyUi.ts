// UI pixel art for the Buddha-journey stage select: lotus stage nodes (locked
// / open / passed / 3★ gold / boss lotus / final stupa) and the mural-style
// frames (red lacquer with gold กระจัง, used as CSS border images).

import { bake, type Surface } from '../engine/pixel'
import { J } from './buddhaJourneyPaint'

export type NodeLook = 'locked' | 'open' | 'passed' | 'perfect'

const urlCache = new Map<string, string>()
function once(key: string, make: () => HTMLCanvasElement): string {
  let u = urlCache.get(key)
  if (!u) {
    u = make().toDataURL()
    urlCache.set(key, u)
  }
  return u
}

// Locked: grey stone. Open: a white lotus waiting. Passed: pink, in bloom.
// Three stars: a golden lotus.
const NODE_PAL: Record<NodeLook, { petal: string; petalD: string; petalL: string; face: string; faceD: string; faceL: string; rim: string }> = {
  locked: { petal: '#a39888', petalD: '#7a6e62', petalL: '#c9c0b2', face: '#d2cabe', faceD: '#aca294', faceL: '#ece6dc', rim: '#5a5048' },
  open: { petal: '#fbf3e4', petalD: '#e0cfb4', petalL: '#ffffff', face: '#ffe58a', faceD: '#f2c54e', faceL: '#fffbe0', rim: '#b87a22' },
  passed: { petal: '#f59ab8', petalD: '#d0607e', petalL: '#fcd2e0', face: '#fff4d8', faceD: '#f0d8a4', faceL: '#ffffff', rim: '#9a3a5a' },
  perfect: { petal: '#f7c84c', petalD: '#c98a24', petalL: '#fff1a8', face: '#fff6c8', faceD: '#ffe58a', faceL: '#ffffff', rim: '#8a5a1a' },
}

/** Lotus petal outline: plump, with a pointed tip, from radius r0 to r1 along angle a. */
function petal(cx: number, cy: number, a: number, r0: number, r1: number, wid: number): [number, number][] {
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const side = (sgn: number) => {
    const out: [number, number][] = []
    for (let k = 0; k <= 8; k++) {
      const t = sgn > 0 ? k / 8 : 1 - k / 8
      const u = r0 + (r1 - r0) * t
      const hw = wid * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)), 0.7) * (1 - t * t * 0.35)
      out.push([cx + ca * u - sa * hw * sgn, cy + sa * u + ca * hw * sgn])
    }
    return out
  }
  return [...side(1), [cx + ca * r1, cy + sa * r1], ...side(-1)]
}

function petalRing(g: Surface, cx: number, cy: number, n: number, r0: number, r1: number, wid: number, fill: string, light: string, rot = 0) {
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2
      const pts = petal(cx, cy, a, r0 * 0.3, r1, wid)
      if (pass === 0) {
        for (const [ox, oy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
          g.poly(
            pts.map(([x, y]) => [x + ox, y + oy] as [number, number]),
            J.ink,
          )
      } else {
        g.poly(pts, fill)
        // A light vein down the petal.
        for (let u = r0 + 0.5; u < r1 - 1.5; u += 1) g.px(Math.floor(cx + Math.cos(a) * u), Math.floor(cy + Math.sin(a) * u), light)
      }
    }
}

/** A stage node: a lotus-pad disc (22×22 art px). */
export function nodeSprite(look: NodeLook): string {
  return once(`node:${look}`, () =>
    bake(24, 24, (g) => {
      const p = NODE_PAL[look]
      const c = 12
      if (look === 'locked') {
        // A plain stone disc with a faint lotus carved in it.
        g.circle(c, c + 1, 10.5, J.ink)
        g.circle(c, c, 10.5, J.ink)
        g.circle(c, c, 9.5, p.petalD)
        g.circle(c - 0.5, c - 0.5, 8.6, p.petal)
        g.circle(c - 1, c - 1, 6.5, p.petalL)
        g.circle(c - 0.5, c - 0.5, 5.6, p.face)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8
          g.px(Math.round(c + Math.cos(a) * 7.6), Math.round(c + Math.sin(a) * 7.6), p.petalD)
        }
        g.px(c - 5, c - 4, p.faceL)
        g.px(c - 4, c - 5, p.faceL)
        return
      }
      petalRing(g, c, c, 8, 6, 11.6, 3.4, p.petalD, p.petal, Math.PI / 8)
      petalRing(g, c, c, 8, 5, 10.2, 3.1, p.petal, p.petalL, 0)
      g.circle(c, c, 6.2, J.ink)
      g.circle(c, c, 5.4, p.rim)
      g.circle(c, c, 4.6, p.faceD)
      g.circle(c - 0.5, c - 0.5, 4, p.face)
      g.px(c - 3, c - 2, p.faceL)
      g.px(c - 2, c - 3, p.faceL)
      if (look === 'perfect') {
        g.px(c + 7, c - 8, '#ffffff')
        g.px(c + 8, c - 9, '#fffbe0')
        g.px(c + 6, c - 9, '#fffbe0')
        g.px(c + 7, c - 10, '#fffbe0')
        g.px(c + 7, c - 7, '#fffbe0')
      }
    }),
  )
}

/** Boss node: a big open lotus (32×30 art px). */
export function bossSprite(look: NodeLook): string {
  return once(`boss:${look}`, () =>
    bake(34, 32, (g) => {
      const locked = look === 'locked'
      const gold = look === 'perfect'
      const cx = 17
      const cy = 16
      const back = locked ? '#7a6e62' : gold ? '#c98a24' : '#d0607e'
      const outer = locked ? '#a89c90' : gold ? '#f2c54e' : '#f38fb0'
      const outerL = locked ? '#cfc6ba' : gold ? '#ffe58a' : '#fcd2e0'
      const inner = locked ? '#c2b8ac' : gold ? '#ffe58a' : '#f9b7cc'
      const innerL = locked ? '#e0d8ce' : gold ? '#fff6c8' : '#ffe6ee'
      petalRing(g, cx, cy, 10, 9, 16, 4, back, outer, -Math.PI / 2 + Math.PI / 10)
      petalRing(g, cx, cy, 10, 8, 14.5, 3.8, outer, outerL, -Math.PI / 2)
      petalRing(g, cx, cy, 8, 6, 11, 3.2, inner, innerL, -Math.PI / 2 + Math.PI / 8)
      const p = NODE_PAL[look === 'locked' ? 'locked' : look === 'open' ? 'open' : look]
      g.circle(cx, cy, 7, J.ink)
      g.circle(cx, cy, 6.2, locked ? p.rim : J.goldD)
      g.circle(cx, cy, 5.4, locked ? p.faceD : J.goldM)
      g.circle(cx - 0.5, cy - 0.5, 4.8, locked ? p.face : J.goldL)
      g.px(cx - 3, cy - 3, '#ffffff')
      g.px(cx - 2, cy - 4, '#ffffff')
      if (!locked)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          g.px(Math.round(cx + Math.cos(a) * 4.2), Math.round(cy + Math.sin(a) * 4.2), J.goldD)
        }
    }),
  )
}

/** The last stage: a golden stupa with a round plate for the number (32×40). */
export function stupaSprite(look: NodeLook): string {
  return once(`stupa:${look}`, () =>
    bake(34, 42, (g) => {
      const locked = look === 'locked'
      const c = locked ? '#b9ae9e' : J.gold
      const cL = locked ? '#ddd4c6' : J.goldL
      const cD = locked ? '#8a7e70' : J.goldD
      const x = 17
      // Spire.
      for (let i = 0; i < 12; i++) {
        const w = Math.max(1, Math.round(4 * (1 - i / 12)))
        g.rect(x - Math.floor(w / 2) - 1, 12 - i, w + 2, 1, J.ink)
        g.rect(x - Math.floor(w / 2), 12 - i, w, 1, i % 3 === 0 ? cL : c)
      }
      g.px(x, 0, locked ? '#ffffff' : J.goldLL)
      g.rect(x - 4, 12, 9, 4, J.ink)
      g.rect(x - 3, 13, 7, 2, c)
      // Bell.
      g.ellipse(x, 26, 12, 12, J.ink)
      g.ellipse(x, 26, 11, 11, c)
      g.ellipse(x - 3, 23, 5, 6, cL)
      g.rect(x + 6, 22, 2, 8, cD)
      // Base tiers.
      g.rect(x - 15, 33, 31, 4, J.ink)
      g.rect(x - 14, 34, 29, 2, c)
      g.hline(x - 14, x + 14, 34, cL)
      g.rect(x - 16, 37, 33, 5, J.ink)
      g.rect(x - 15, 38, 31, 3, cD)
      g.hline(x - 15, x + 15, 38, c)
      // Number plate.
      g.circle(x, 26, 7, J.ink)
      g.circle(x, 26, 6, locked ? '#c9c0b2' : '#fff4d8')
    }),
  )
}

// ---------------------------------------------------------------------------
// Frames (CSS border images)

/** Red lacquer frame with gold lines and a กระจัง row; 18×18, slice 6. */
export function muralFrame(): string {
  return once('frame', () =>
    bake(18, 18, (g) => {
      const P = '#f6e7c4'
      g.rect(1, 0, 16, 18, J.ink)
      g.rect(0, 1, 18, 16, J.ink)
      g.rect(1, 1, 16, 16, J.goldM)
      g.rect(2, 2, 14, 14, J.lac)
      g.rect(2, 2, 14, 1, J.lacL)
      g.rect(2, 2, 1, 14, J.lacL)
      g.rect(3, 15, 13, 1, J.lacD)
      g.rect(15, 3, 1, 13, J.lacD)
      g.rect(4, 4, 10, 10, J.gold)
      g.rect(5, 5, 8, 8, P)
      // กระจัง teeth: small gold triangles pointing into the panel.
      for (let i = 5; i < 13; i += 2) {
        g.px(i, 5, J.goldD)
        g.px(5, i, J.goldD)
        g.px(i, 12, J.goldD)
        g.px(12, i, J.goldD)
      }
      // Corner studs.
      for (const [x, y] of [
        [1, 1],
        [16, 1],
        [1, 16],
        [16, 16],
      ])
        g.px(x, y, J.goldLL)
    }),
  )
}

/** Cartouche with pointed ends for chapter titles; 32×16, slices 5 / 11. */
export function cartouche(night = false): string {
  return once(`cart:${night ? 1 : 0}`, () =>
    bake(32, 16, (g) => {
      const body = night ? '#23305e' : J.lac
      const bodyL = night ? '#34448a' : J.lacL
      const pts: [number, number][] = [
        [0, 8],
        [8, 1],
        [24, 1],
        [32, 8],
        [24, 15],
        [8, 15],
      ]
      g.poly(pts, J.ink)
      g.poly(
        [
          [2, 8],
          [9, 2],
          [23, 2],
          [30, 8],
          [23, 14],
          [9, 14],
        ],
        J.goldM,
      )
      g.poly(
        [
          [4, 8],
          [10, 3],
          [22, 3],
          [28, 8],
          [22, 13],
          [10, 13],
        ],
        body,
      )
      g.hline(10, 21, 4, bodyL)
      g.px(6, 8, J.goldL)
      g.px(25, 8, J.goldL)
    }),
  )
}

/** Lacquer tile with gold flowers (ลายรดน้ำ-ish) for header backgrounds; 16×16. */
export function lacquerTile(): string {
  return once('lacq', () =>
    bake(16, 16, (g) => {
      g.rect(0, 0, 16, 16, J.lacD)
      for (const [x, y] of [
        [3, 3],
        [11, 11],
      ]) {
        g.px(x, y, J.goldM)
        g.px(x - 1, y, J.goldD)
        g.px(x + 1, y, J.goldD)
        g.px(x, y - 1, J.goldD)
        g.px(x, y + 1, J.goldD)
      }
      g.px(11, 3, J.goldDD)
      g.px(3, 11, J.goldDD)
    }),
  )
}

/** Parchment tile (card body). */
export function parchTile(): string {
  return once('parch', () =>
    bake(16, 16, (g) => {
      g.rect(0, 0, 16, 16, '#f6e7c4')
      for (const [x, y] of [
        [2, 5],
        [9, 2],
        [13, 9],
        [5, 12],
        [11, 14],
      ])
        g.px(x, y, '#ecd9aa')
      g.px(7, 8, '#fbf1d8')
      g.px(14, 3, '#fbf1d8')
    }),
  )
}
