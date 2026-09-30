// Collectible motifs for the beach group (shells, sea finds and beach
// souvenirs), drawn on the shared 14×14 motif grid and registered with the
// collectible art (src/art/collectibles.ts). Imported for its side effect by
// the beach maps group so the art exists before any collection book opens.

import { mix, type Surface } from '../engine/pixel'
import { registerMotif, type MotifRamp } from './collectibles'
import { P } from './palette'

const INK = P.ink
const W = '#fffaf0'

type Pt = [number, number]

function clam(g: Surface, p: MotifRamp) {
  const body: Pt[] = [[7, 1.5], [10.5, 3.5], [13, 7.5], [12, 11.5], [2, 11.5], [1, 7.5], [3.5, 3.5]]
  g.poly(body, p.mD)
  g.poly(body.map(([x, y]) => [x + (x < 7 ? 0.6 : -0.6), y + (y < 7 ? 0.7 : -0.6)] as Pt), p.m)
  // Growth rings.
  for (const [r, c] of [[3, p.a], [5.5, p.a], [8, mix(p.a, p.m, 0.5)]] as [number, string][]) {
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (1.05 + (i / 16) * 0.9)
      const x = 7 + Math.cos(a) * r * 0.85
      const y = 2.5 - Math.sin(a) * r * 0.95
      if (y > 2 && y < 11.5) g.px(x, y, c)
    }
  }
  g.px(4, 5, p.mL)
  g.px(5, 4, p.mL)
  g.px(4, 6, p.mL)
  g.circle(7, 2.4, 1, p.d)
  g.hline(3, 11, 12, p.mDD)
}

function cowrie(g: Surface, p: MotifRamp) {
  g.ellipse(7, 7.5, 6.2, 4.6, p.mD)
  g.ellipse(6.8, 7, 5.8, 4.1, p.m)
  g.ellipse(5.5, 5.6, 3.2, 1.6, p.mL)
  for (const [x, y] of [[4, 8], [7, 9], [10, 7], [9, 5], [6, 6], [11, 9], [3, 6]] as Pt[]) {
    g.px(x, y, p.a)
    if ((x + y) % 2) g.px(x + 1, y, p.aD)
  }
  // The toothed slit along the belly.
  g.hline(3, 11, 11, p.mDD)
  for (let x = 4; x <= 10; x += 2) g.px(x, 10, W)
  g.px(4, 4, p.d)
  g.px(5, 4, W)
}

function scallop(g: Surface, p: MotifRamp) {
  const cx = 7
  const cy = 12
  const rim: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI
    const r = 6.3 + (i % 2 ? 0.6 : 0)
    rim.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.05])
  }
  g.poly([[cx, cy], ...rim], p.mD)
  g.poly([[cx, cy - 0.5], ...rim.map(([x, y]) => [x + (x < cx ? 0.5 : -0.5), y + 0.6] as Pt)], p.m)
  for (let i = 1; i < 12; i += 2) {
    const a = Math.PI + (i / 12) * Math.PI
    g.line(cx, cy - 1, cx + Math.cos(a) * 5.6, cy + Math.sin(a) * 5.8, p.aD)
  }
  for (let i = 2; i < 12; i += 4) {
    const a = Math.PI + (i / 12) * Math.PI
    g.px(cx + Math.cos(a) * 4.5, cy + Math.sin(a) * 4.7, p.mL)
  }
  // Hinge ears.
  g.rect(3, 11, 3, 2, p.mD)
  g.rect(8, 11, 3, 2, p.mD)
  g.rect(3, 11, 2, 1, p.m)
  g.rect(9, 11, 2, 1, p.m)
  g.px(4, 6, p.d)
}

function sanddollar(g: Surface, p: MotifRamp) {
  g.circle(7, 7, 6.2, p.mD)
  g.circle(6.8, 6.8, 5.6, p.m)
  g.circle(5.6, 5.4, 2.4, mix(p.m, W, 0.35))
  // Five-petal flower.
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2
    const x = 7 + Math.cos(a) * 2.6
    const y = 7 + Math.sin(a) * 2.6
    g.line(7 + Math.cos(a) * 1, 7 + Math.sin(a) * 1, x, y, p.aD)
    g.px(Math.round(7 + Math.cos(a) * 3.4), Math.round(7 + Math.sin(a) * 3.4), p.a)
  }
  g.px(7, 7, p.mDD)
  for (const [x, y] of [[3, 10], [11, 10], [7, 12]] as Pt[]) g.px(x, y, p.mDD)
}

function conch(g: Surface, p: MotifRamp, sacred = false, flip = false) {
  const X = (x: number) => (flip ? 14 - x : x)
  const poly = (pts: Pt[], c: string) => g.poly(pts.map(([x, y]) => [X(x), y] as Pt), c)
  // Spire (top-left) and body.
  poly([[2, 3], [5, 1], [9, 2], [12, 5], [13, 9], [10, 13], [6, 12], [3, 9], [1, 6]], p.mD)
  poly([[2.6, 3.5], [5, 1.8], [8.6, 2.6], [11.5, 5.5], [12.3, 9], [9.8, 12.2], [6.3, 11.4], [3.6, 8.6], [1.8, 6]], p.m)
  // Spiral whorls.
  g.line(X(2), 4, X(6), 2.5, p.mDD)
  g.line(X(3), 6, X(9), 3.5, p.mDD)
  g.px(X(4), 3, p.mL)
  g.px(X(6), 4, p.mL)
  // The glossy pink aperture.
  poly([[8, 6], [11, 7], [11.5, 10], [9, 12], [7.5, 9]], p.a)
  poly([[8.5, 7], [10.5, 8], [10.5, 10], [9, 11]], p.aL)
  if (sacred) {
    // Gold filigree cap and band.
    g.line(X(3), 8, X(8), 5, p.a)
    g.line(X(3.5), 9, X(8), 6, mix(p.a, W, 0.4))
    g.px(X(5), 1, p.a)
    g.px(X(4), 2, p.a)
    g.px(X(12), 1, W)
    g.px(X(12), 0, p.aL)
    g.px(X(13), 1, p.aL)
    g.px(X(11), 1, p.aL)
    g.px(X(12), 2, p.aL)
  } else {
    // Knobbly spikes along the shoulder.
    for (const [x, y] of [[4, 1], [7, 1], [10, 2], [12, 4]] as Pt[]) {
      g.px(X(x), y - 1, p.mD)
      g.px(X(x), y, p.m)
    }
  }
}

function pearl(g: Surface, p: MotifRamp) {
  // Open oyster shell holding the pearl.
  g.ellipse(7, 10.5, 6.2, 2.8, p.dD)
  g.ellipse(7, 10, 5.6, 2.2, p.d)
  g.ellipse(7, 9.8, 4.4, 1.5, mix(p.d, W, 0.4))
  g.circle(7, 6.5, 4, mix(p.m, p.a, 0.6))
  g.circle(6.8, 6.3, 3.5, p.m)
  g.circle(6, 5.4, 1.8, mix(p.m, W, 0.6))
  g.px(5, 4, W)
  g.px(6, 4, W)
  g.px(9, 8, p.a)
  g.px(8, 9, p.a)
}

function seaglass(g: Surface, p: MotifRamp) {
  const body: Pt[] = [[3, 3], [8, 1.5], [12, 4], [12.5, 9], [9, 12.5], [3.5, 11.5], [1.5, 7]]
  g.poly(body, p.aD)
  g.poly(body.map(([x, y]) => [x + (x < 7 ? 0.7 : -0.7), y + (y < 7 ? 0.7 : -0.7)] as Pt), p.m)
  g.poly([[4, 4], [7.5, 3], [6, 6], [3.5, 7]], p.d)
  for (const [x, y] of [[9, 6], [7, 9], [10, 9], [5, 9], [8, 11]] as Pt[]) g.px(x, y, mix(p.m, W, 0.45))
  g.px(4, 4, W)
}

function swimring(g: Surface, p: MotifRamp) {
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    for (let r = 3.2; r <= 6.2; r += 0.5) {
      const x = 7 + Math.cos(a) * r
      const y = 7 + Math.sin(a) * r
      const seg = Math.floor(((a + Math.PI / 8) / (Math.PI * 2)) * 4) % 2
      const shade = r > 5.4 || (a > 0.2 && a < 2.4) ? 1 : 0
      const base = seg ? p.a : p.m
      g.px(x, y, shade ? mix(base, INK, 0.22) : base)
    }
  }
  g.px(3, 4, W)
  g.px(4, 3, W)
  g.px(5, 3, mix(p.m, W, 0.6))
  // Rope loops.
  g.px(1, 7, p.d)
  g.px(13, 7, p.d)
  g.px(7, 1, p.d)
}

function monkey(g: Surface, p: MotifRamp) {
  g.circle(2.5, 6.5, 1.8, p.mD)
  g.circle(11.5, 6.5, 1.8, p.mD)
  g.circle(2.5, 6.5, 0.9, p.a)
  g.circle(11.5, 6.5, 0.9, p.a)
  g.circle(7, 6.5, 5, p.mD)
  g.circle(7, 6.2, 4.6, p.m)
  g.ellipse(7, 8.2, 3.6, 3, p.a)
  g.ellipse(7, 5.5, 3.6, 1.6, p.a)
  // Stolen sunglasses.
  g.rect(3, 5, 3, 2, p.d)
  g.rect(8, 5, 3, 2, p.d)
  g.hline(6, 8, 5, p.d)
  g.px(4, 5, '#9fd0ff')
  g.px(9, 5, '#9fd0ff')
  g.px(6, 9, INK)
  g.px(8, 9, INK)
  g.hline(6, 8, 10, mix(p.a, INK, 0.5))
  g.px(5, 2, p.mL)
}

function station(g: Surface, p: MotifRamp) {
  // Tiered Thai-style pavilion roof (red) with gold trim, cream walls.
  g.rect(1, 12, 12, 2, p.mDD)
  g.rect(2, 8, 10, 4, p.a)
  for (const x of [2, 5, 8, 11]) g.vline(x, 8, 11, mix(p.a, INK, 0.3))
  g.rect(6, 9, 2, 3, p.mD)
  g.poly([[0, 8], [3, 5], [11, 5], [14, 8]], p.m)
  g.hline(0, 13, 8, p.d)
  g.poly([[3, 5], [5, 2.5], [9, 2.5], [11, 5]], p.mD)
  g.hline(3, 10, 5, p.d)
  g.poly([[5, 2.5], [7, 0.5], [9, 2.5]], p.m)
  g.px(7, 0, p.d)
  g.px(0, 7, p.d)
  g.px(13, 7, p.d)
  g.px(4, 3, p.mL)
}

function horse(g: Surface, p: MotifRamp) {
  // Body, legs and head (facing right).
  g.ellipse(6.5, 7.5, 4.5, 2.6, p.mD)
  g.ellipse(6.3, 7.1, 4.1, 2.2, p.m)
  g.thickLine(9.5, 6.5, 11.5, 2.5, 2.2, p.m)
  g.ellipse(12, 2.8, 1.8, 1.2, p.m)
  g.px(13, 3, p.mD)
  g.px(11, 2, INK)
  for (const x of [3, 5, 8, 10]) g.vline(x, 9, 12, p.mD)
  for (const x of [3, 5, 8, 10]) g.px(x, 12, INK)
  // Mane and tail.
  g.line(10, 1, 9, 5, p.d)
  g.line(2, 7, 0, 10, p.d)
  // Red tassel bridle and saddle cloth.
  g.px(11, 3, p.a)
  g.px(12, 4, p.a)
  g.rect(5, 5, 3, 2, p.a)
  g.px(5, 7, p.aD)
  g.px(4, 6, p.mL)
}

function mermaid(g: Surface, p: MotifRamp) {
  // Rock.
  g.ellipse(7, 12.2, 6.5, 2, mix(p.d, INK, 0.35))
  g.ellipse(6.5, 11.6, 5.6, 1.5, p.d)
  // Tail curling to the right with a fin.
  g.thickLine(5, 9, 9.5, 10.5, 2.4, p.m)
  g.thickLine(9.5, 10.5, 11.5, 8.5, 1.8, p.m)
  g.poly([[11, 8.5], [13.5, 6.5], [12.5, 9.5]], p.mD)
  for (const x of [6, 8]) g.px(x, 10, p.mD)
  // Torso, head, long hair and the comb raised.
  g.thickLine(5, 9, 5.5, 5, 2.2, p.m)
  g.circle(5.5, 3.5, 1.9, p.m)
  g.line(4, 3, 3, 8, p.mD)
  g.line(3.5, 2.5, 2.5, 7, p.mD)
  g.line(7, 4.5, 8.5, 2.5, p.m)
  g.px(9, 2, p.a)
  g.px(9, 1, p.a)
  g.px(5, 2, p.mL)
  g.px(4, 6, p.mL)
}

function coconut(g: Surface, p: MotifRamp) {
  g.circle(7, 8, 5.6, p.mD)
  g.circle(6.8, 7.8, 5.2, p.m)
  g.ellipse(7, 3.6, 3.4, 1.5, p.a)
  g.ellipse(7, 3.6, 2.2, 0.8, mix(p.a, p.d, 0.3))
  g.circle(4.8, 6.4, 1.6, mix(p.m, W, 0.4))
  // Straw and a paper umbrella.
  g.line(8, 3, 11, -0.5, '#e8514a')
  g.px(11, 0, '#e8514a')
  g.line(4, 3, 3, 0, p.d)
  g.hline(1, 5, 0, '#ffd23f')
  g.px(3, -1, '#ffd23f')
  g.hline(4, 10, 13, p.mDD)
}

function sunset(g: Surface, p: MotifRamp) {
  g.rect(0, 0, 14, 7, p.a)
  g.rect(0, 3, 14, 4, mix(p.a, p.m, 0.5))
  g.circle(7, 7.5, 3.8, p.d)
  g.circle(7, 7.5, 2.6, mix(p.d, W, 0.4))
  g.rect(0, 8, 14, 6, mix(p.a, INK, 0.25))
  for (let y = 9; y < 14; y += 2) g.hline(7 - (y - 7), 7 + (y - 7), y, p.m)
  g.hline(1, 3, 10, mix(p.a, W, 0.3))
  g.hline(10, 12, 12, mix(p.a, W, 0.3))
  // Palm silhouette.
  g.vline(12, 3, 9, INK)
  g.line(12, 3, 9, 2, INK)
  g.line(12, 3, 14, 1, INK)
  g.line(12, 3, 10, 5, INK)
}

function karst(g: Surface, p: MotifRamp) {
  g.rect(0, 11, 14, 3, p.a)
  g.hline(1, 5, 12, mix(p.a, W, 0.45))
  g.poly([[1, 11], [2, 5], [4, 1.5], [7, 1], [9, 3], [10, 7], [12, 8], [13, 11]], p.mD)
  g.poly([[1.8, 11], [2.8, 5], [4.5, 2.2], [6.8, 1.8], [8.3, 3.5], [9.3, 7.2], [11.5, 8.6], [12.3, 11]], p.m)
  for (const x of [4, 6, 8]) g.vline(x, 4, 10, mix(p.m, INK, 0.3))
  // Jungle top and a hanging vine.
  g.ellipse(5.5, 1.6, 3, 1.2, p.d)
  g.ellipse(11, 8, 1.8, 0.9, p.d)
  g.px(3, 5, p.mL)
  g.px(3, 6, p.mL)
}

let done = false
/** Register the beach motifs (idempotent). */
export function registerBeachMotifs() {
  if (done) return
  done = true
  registerMotif('clam', clam)
  registerMotif('cowrie', cowrie)
  registerMotif('scallop', scallop)
  registerMotif('sanddollar', sanddollar)
  registerMotif('conch', (g, p) => conch(g, p))
  registerMotif('sacredconch', (g, p) => conch(g, p, true, true))
  registerMotif('pearl', pearl)
  registerMotif('seaglass', seaglass)
  registerMotif('swimring', swimring)
  registerMotif('monkey', monkey)
  registerMotif('station', station)
  registerMotif('horse', horse)
  registerMotif('mermaid', mermaid)
  registerMotif('coconut', coconut)
  registerMotif('sunset', sunset)
  registerMotif('karst', karst)
}

registerBeachMotifs()
