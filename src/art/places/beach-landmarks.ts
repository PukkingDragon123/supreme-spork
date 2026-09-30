// Landmarks of the six beaches: the golden Big Buddha of Koh Fan (Samui),
// Phra Nang cave shrine and the limestone karsts (Railay), the golden
// mermaid on her rock and Khao Tang Kuan (Samila), the red shrine of Chao
// Mae Sam Muk on its headland (Bang Saen), the red-and-cream royal waiting
// pavilion and the standing Buddha of Khao Takiap (Hua Hin), and the gate
// of Wat Suwan Khiri Wong (Patong).

import { ditherOn, type Color, type Surface } from '../../engine/pixel'
import { bprop, hsh, INK, mix, type BeachProp } from './beach-kit'

/** Point-in-polygon (even-odd). */
export function inPoly(poly: [number, number][], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const GOLD = { L: '#fff0a0', b: '#f4c542', d: '#d49a2a', D: '#9a6a1a' }

// ---------------------------------------------------------------------------
// Samui: พระใหญ่เกาะฟาน

/** The golden seated Buddha (Mara-vijaya) on its white terrace with naga stairs. */
export function bigBuddhaSamui(): BeachProp {
  const W = 96
  const H = 110
  return bprop('bigbuddha-samui', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // White terrace with red roofed corners and a naga staircase.
    g.rect(8, 78, 80, 18, '#f4f0ec')
    g.rect(8, 78, 80, 3, '#ffffff')
    g.hline(8, 87, 95, '#c8c0c4')
    for (let x = 10; x < 86; x += 6) g.rect(x, 82, 3, 10, '#e0d8dc')
    g.rect(2, 94, 92, 15, '#ece6e2')
    g.hline(2, 93, 94, '#ffffff')
    g.hline(2, 93, 108, '#b8b0b4')
    // Stairs.
    for (let y = 96; y < 109; y += 2) g.hline(cx - 9 + (108 - y) / 3, cx + 9 - (108 - y) / 3, y, y % 4 ? '#fffaf0' : '#d8d0d4')
    // Naga balustrades (green scales, gold crests).
    for (const s of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const x = cx + s * (11 + i * 0.2)
        const y = 108 - i * 1.4
        g.rect(Math.round(x) - 1, Math.round(y), 3, 2, i % 2 ? '#43a86a' : '#2f8a54')
      }
      g.circle(cx + s * 12, 90, 3, '#43a86a')
      g.px(cx + s * 12, 88, GOLD.b)
      g.px(cx + s * 13, 89, GOLD.b)
      g.px(cx + s * 11, 90, INK)
    }
    // Base lotus throne.
    g.ellipse(cx, 76, 30, 5, GOLD.D)
    g.ellipse(cx, 74, 30, 5, GOLD.d)
    for (let i = -28; i <= 28; i += 5) g.poly([[cx + i - 3, 76], [cx + i, 69], [cx + i + 3, 76]], i % 10 ? GOLD.b : GOLD.L)
    // Crossed legs.
    g.ellipse(cx, 66, 26, 8, GOLD.d)
    g.ellipse(cx - 1, 64.5, 25, 7, GOLD.b)
    g.ellipse(cx - 9, 62, 10, 3, GOLD.L)
    // Body and robe.
    g.poly([[cx - 18, 64], [cx - 16, 36], [cx - 9, 28], [cx + 9, 28], [cx + 16, 36], [cx + 18, 64]], GOLD.b)
    g.poly([[cx - 18, 64], [cx - 16, 36], [cx - 9, 28], [cx - 4, 28], [cx - 8, 64]], GOLD.L)
    g.line(cx + 4, 28, cx + 14, 62, GOLD.d)
    g.line(cx + 6, 29, cx + 16, 60, GOLD.d)
    // Left hand in the lap, right hand touching the earth.
    g.ellipse(cx - 2, 58, 7, 3, GOLD.L)
    g.thickLine(cx + 14, 44, cx + 17, 62, 3, GOLD.b)
    g.ellipse(cx + 16, 64, 3, 2, GOLD.L)
    // Head: curls, ushnisha, flame finial, long ears.
    g.rect(cx - 4, 25, 8, 4, GOLD.d)
    g.ellipse(cx, 18, 9, 10, GOLD.b)
    g.ellipse(cx - 3, 16, 5, 6, GOLD.L)
    for (let y = 8; y < 14; y += 2) for (let x = -7; x <= 7; x += 2) if (x * x + (y - 12) * (y - 12) < 60) g.px(cx + x + (y % 4 ? 1 : 0), y, GOLD.d)
    g.ellipse(cx, 6, 4, 3, GOLD.b)
    g.poly([[cx - 2, 5], [cx, -1], [cx + 2, 5]], GOLD.b)
    g.px(cx, -1, '#fffaf0')
    g.rect(cx - 10, 16, 2, 8, GOLD.d)
    g.rect(cx + 8, 16, 2, 8, GOLD.d)
    // Serene face.
    g.hline(cx - 5, cx - 2, 18, GOLD.D)
    g.hline(cx + 2, cx + 5, 18, GOLD.D)
    g.px(cx, 21, GOLD.d)
    g.hline(cx - 2, cx + 2, 23, GOLD.D)
    // Glints.
    for (const [x, y] of [[cx - 12, 40], [cx - 6, 14], [cx - 20, 64]] as [number, number][]) g.px(x, y, '#ffffff')
    hooks.face = [{ x: cx, y: 18 }]
    hooks.glow = [{ x: cx, y: 40 }]
    hooks.base = [{ x: cx, y: 100 }]
  })
}

/** Bells on a red rail (Big Buddha terrace). */
export function bellRail(n = 5): BeachProp {
  return bprop(`bb-bells:${n}`, n * 8 + 6, 18, (n * 8 + 6) / 2, 17, (g) => {
    const w = n * 8 + 6
    g.rect(1, 2, w - 2, 2, '#c8343f')
    g.vline(1, 2, 17, '#8a2a2a')
    g.vline(w - 2, 2, 17, '#8a2a2a')
    for (let i = 0; i < n; i++) {
      const x = 5 + i * 8
      g.vline(x, 4, 6, '#8a8480')
      g.poly([[x - 3, 12], [x - 2, 7], [x + 2, 7], [x + 3, 12]], GOLD.b)
      g.px(x - 1, 8, GOLD.L)
      g.hline(x - 3, x + 3, 12, GOLD.D)
    }
  })
}

// ---------------------------------------------------------------------------
// Railay: หน้าผาหินปูนและถ้ำพระนาง

/** Paint a limestone karst cliff mass (baked) — orange/grey streaked rock with jungle on top and stalactites. */
export function karstCliff(g: Surface, pts: [number, number][], night: boolean, seed = 0) {
  const rock = night ? '#6a5a66' : '#d09a6a'
  const rockL = night ? '#7e6e78' : '#e8b888'
  const rockD = night ? '#4a3e4c' : '#9a6a4a'
  const grey = night ? '#5a5a66' : '#a8a09a'
  g.poly(pts, rockD)
  g.poly(pts.map(([x, y]) => [x + 2, y + 1] as [number, number]), rock)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  // Vertical tufa curtains: column bands of light/dark rock, grey and orange stains.
  const orange = night ? '#7a5a5a' : '#c07a4a'
  for (let x = x0; x <= x1; x++) {
    const v = hsh(x >> 2, 3, seed)
    const band = v % 5
    for (let y = y0; y <= y1; y++) {
      if (!inPoly(pts, x, y)) continue
      const wob = Math.round(Math.sin(y * 0.07 + (x >> 2)) * 1.5)
      const b2 = hsh((x + wob) >> 2, 3, seed) % 5
      let c = b2 === 0 ? rockD : b2 === 1 ? rockL : b2 === 2 ? orange : rock
      const n = Math.sin(x * 0.13 + y * 0.03 + seed) + Math.sin(y * 0.05 - x * 0.02)
      if (n > 1.3 && ditherOn(x, y, 0.6)) c = grey
      if (!inPoly(pts, x + 3, y) && ditherOn(x, y, 0.6)) c = rockD
      if (hsh(x, y, seed) < 6) c = rockD
      g.px(x, y, c)
      void band
    }
  }
  // Ledges with little bushes clinging on.
  for (let ly = y0 + 30; ly < y1 - 20; ly += 34 + (hsh(ly, 1, seed) % 14)) {
    for (let x = x0; x <= x1; x++) {
      const y = ly + Math.round(Math.sin(x * 0.12 + ly) * 2)
      if (!inPoly(pts, x, y)) continue
      g.px(x, y, rockD)
      g.px(x, y - 1, rockL)
      const v = hsh(x, ly, seed)
      if (v < 90) {
        g.circle(x, y - 2, 2.2, night ? '#1e3a34' : '#3f7a4f')
        g.px(x - 1, y - 3, night ? '#305248' : '#6aae64')
      }
    }
  }
  // Stalactite drips along the overhang.
  for (let x = x0 + 4; x < x1 - 4; x += 5) {
    const v = hsh(x, 5, seed)
    const len = 4 + (v % 9)
    const top = y1 - 24 - (v % 20)
    for (let k = 0; k < len; k++) g.px(x, top + k, k === len - 1 ? rockL : grey)
  }
}

/** A rounded cap of jungle for the top of a karst (baked). */
export function jungleCap(g: Surface, x: number, y: number, w: number, night: boolean, seed = 0) {
  const D = night ? '#1e3a34' : '#2c6a45'
  const B = night ? '#2a4a40' : '#43905a'
  const L = night ? '#34584a' : '#6cc36a'
  for (let i = 0; i < w; i += 6) {
    const v = hsh(i, seed, 2)
    const r = 5 + (v % 5)
    g.circle(x + i, y + (v % 4), r, D)
    g.circle(x + i - 1, y - 1 + (v % 4), r - 1, B)
    g.circle(x + i - 2, y - 2 + (v % 4), r * 0.45, L)
  }
  // Hanging vines.
  for (let i = 3; i < w; i += 9) {
    const len = 8 + (hsh(i, seed, 8) % 14)
    for (let k = 0; k < len; k++) g.px(x + i + Math.round(Math.sin(k * 0.5)), y + 6 + k, k % 3 ? B : D)
  }
}

/** Phra Nang cave mouth: dark cave, a small wooden shrine, garlands, ribbons and flowers. */
export function phraNangShrine(night: boolean): BeachProp {
  return bprop(`phranang:${night ? 1 : 0}`, 72, 56, 36, 55, (g, hooks) => {
    // Cave mouth.
    g.ellipse(36, 40, 34, 22, '#4a3a40')
    g.ellipse(36, 42, 30, 18, '#2a2028')
    g.ellipse(36, 46, 24, 12, night ? '#3a2a30' : '#1e161e')
    for (let x = 6; x < 66; x += 5) g.vline(x, 20, 20 + (hsh(x, 2) % 8), '#8a7a7a')
    // Sand floor into the cave.
    g.ellipse(36, 52, 30, 4, '#e0c89a')
    // Small shrine house on a post.
    g.rect(33, 32, 6, 20, '#8a5a3a')
    g.rect(25, 22, 22, 12, '#c8343f')
    g.rect(27, 24, 18, 9, night ? '#ffd88a' : '#f0c890')
    g.poly([[22, 23], [36, 13], [50, 23]], '#b8343f')
    g.hline(22, 50, 23, GOLD.b)
    g.px(36, 12, GOLD.b)
    // Seated princess figure (small, respectful) inside.
    g.rect(34, 26, 4, 5, '#fffaf0')
    g.circle(36, 25, 1.6, '#f0c8a0')
    g.px(36, 23, GOLD.b)
    // Garlands, flowers and silk ribbons (ผ้าแพร) tied around.
    const rib = ['#e8514a', '#ffd23f', '#43905a', '#ff9fc0', '#5aa9e8']
    for (let i = 0; i < 9; i++) {
      const x = 12 + i * 6
      g.line(x, 30, x + 1, 44, rib[i % rib.length])
      g.line(x + 1, 30, x + 2, 42, mix(rib[i % rib.length], '#ffffff', 0.3))
    }
    for (let i = 0; i < 10; i++) {
      const x = 14 + i * 5
      g.circle(x, 48 + (i % 2), 1.6, i % 2 ? '#fffaf0' : '#f58f35')
      g.px(x, 47 + (i % 2), '#ffd23f')
    }
    // Incense urn and candles.
    g.rect(31, 44, 10, 5, GOLD.d)
    g.hline(31, 40, 44, GOLD.L)
    for (const x of [33, 36, 39]) g.vline(x, 39, 43, '#e8514a')
    hooks.smoke = [{ x: 36, y: 38 }]
    hooks.candle = [{ x: 30, y: 44 }, { x: 42, y: 44 }]
  })
}

// ---------------------------------------------------------------------------
// Samila: นางเงือกทอง และเขาตังกวน

/** The golden mermaid combing her hair on a rock. */
export function goldenMermaid(): BeachProp {
  return bprop('mermaid', 48, 50, 24, 49, (g, hooks) => {
    // Rocks.
    g.ellipse(24, 42, 22, 8, '#5e5a68')
    g.ellipse(22, 40, 19, 6, '#8a8494')
    g.ellipse(16, 38, 9, 3, '#aaa4b4')
    g.ellipse(34, 44, 9, 4, '#6e6a78')
    // Tail curling right to the fin.
    g.thickLine(18, 34, 30, 37, 5, GOLD.d)
    g.thickLine(18, 33, 30, 36, 4, GOLD.b)
    g.thickLine(30, 36, 36, 30, 3, GOLD.b)
    g.poly([[35, 30], [42, 24], [40, 32], [44, 34]], GOLD.d)
    g.poly([[35, 30], [41, 25], [39, 31]], GOLD.L)
    for (const x of [20, 24, 28]) g.px(x, 34, GOLD.D)
    // Torso leaning back.
    g.thickLine(17, 33, 18, 20, 4, GOLD.b)
    g.thickLine(16, 32, 17, 21, 2, GOLD.L)
    // Head and long flowing hair.
    g.circle(19, 16, 4, GOLD.b)
    g.circle(18, 15, 2, GOLD.L)
    g.thickLine(16, 14, 11, 30, 2.5, GOLD.d)
    g.thickLine(15, 13, 12, 27, 1.5, GOLD.b)
    // Arm raised combing.
    g.thickLine(20, 21, 25, 13, 2, GOLD.b)
    g.rect(24, 11, 4, 2, GOLD.D)
    g.px(19, 15, GOLD.D)
    g.px(21, 15, GOLD.D)
    // Garlands left by visitors on the rock.
    for (let i = 0; i < 6; i++) g.circle(12 + i * 4, 44 + (i % 2), 1.5, i % 2 ? '#fffaf0' : '#f58f35')
    g.px(26, 16, '#ffffff')
    hooks.glint = [{ x: 18, y: 14 }]
  })
}

/** A far headland hill with a chedi on top (Khao Tang Kuan, baked). */
export function hillWithChedi(g: Surface, cx: number, base: number, rw: number, rh: number, night: boolean, chedi = true) {
  const D = night ? '#1e3a34' : '#3f7a4f'
  const B = night ? '#27463c' : '#5a9a5e'
  const L = night ? '#305248' : '#7cc06a'
  // Upper half only: the hill rises from the horizon line at `base`.
  const half = (r: number, h: number, c: Color, dx = 0) => {
    const pts: [number, number][] = []
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI
      pts.push([cx + dx + Math.cos(a) * r, base + Math.sin(a) * h])
    }
    g.poly(pts, c)
  }
  half(rw, rh, D)
  half(rw - 3, rh - 3, B, -2)
  for (let i = -rw + 6; i < rw - 6; i += 5) g.circle(cx + i, base - rh * 0.75 * Math.sqrt(Math.max(0, 1 - (i / rw) ** 2)) + 3, 2.5, L)
  g.hline(Math.round(cx - rw), Math.round(cx + rw), base, night ? '#18283a' : '#2c5a3e')
  if (!chedi) return
  const top = base - rh
  const w = night ? '#b8b0c8' : '#fffaf0'
  g.rect(cx - 4, top - 2, 8, 3, w)
  g.ellipse(cx, top - 4, 3, 2.5, w)
  g.vline(cx, top - 12, top - 6, night ? '#c8b060' : GOLD.b)
  g.px(cx, top - 13, GOLD.L)
}

// ---------------------------------------------------------------------------
// Bang Saen: เขาสามมุข และศาลเจ้าแม่สามมุข

/** A green headland falling into the sea (baked), with rocks at its foot. */
export function headland(g: Surface, pts: [number, number][], night: boolean, seed = 0) {
  const D = night ? '#1e3a34' : '#356e48'
  const B = night ? '#28483e' : '#4a8a58'
  const L = night ? '#305248' : '#6aae64'
  g.poly(pts, D)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  for (let k = 0; k < 140; k++) {
    const v = hsh(k, seed, 6)
    const x = Math.min(...xs) + (v % Math.max(1, Math.max(...xs) - Math.min(...xs)))
    const y = Math.min(...ys) + ((v * 7 + k * 13) % Math.max(1, Math.max(...ys) - Math.min(...ys)))
    if (!inPoly(pts, x, y)) continue
    g.circle(x, y, 3 + (v % 3), k % 3 ? B : L)
  }
}

/** The red Chinese shrine of Chao Mae Sam Muk with lanterns and a gold roof ridge. */
export function samMukShrine(night: boolean): BeachProp {
  return bprop(`sammuk:${night ? 1 : 0}`, 64, 52, 32, 51, (g, hooks) => {
    // Platform and steps.
    g.rect(2, 42, 60, 9, '#d8d0c8')
    g.hline(2, 61, 42, '#fffaf0')
    for (let y = 44; y < 51; y += 2) g.hline(24, 40, y, '#c0b8b0')
    // Red hall with columns.
    g.rect(8, 22, 48, 20, '#c8343f')
    for (const x of [10, 22, 41, 53]) g.rect(x, 22, 3, 20, '#a02a33')
    g.rect(26, 26, 12, 16, night ? '#ffc86a' : '#5a2a2a')
    g.rect(27, 27, 10, 3, GOLD.b)
    // Twin-ridged roof with upturned eaves and dragons.
    g.poly([[2, 23], [8, 14], [56, 14], [62, 23]], '#e8b040')
    g.poly([[4, 23], [9, 16], [55, 16], [60, 23]], '#d88a2a')
    for (let x = 6; x < 60; x += 3) g.vline(x, 17, 22, '#b86a1a')
    g.hline(2, 62, 23, '#8a4a1a')
    g.px(1, 21, '#e8b040')
    g.px(62, 21, '#e8b040')
    g.rect(10, 11, 44, 3, '#43905a')
    g.circle(32, 9, 3, GOLD.b)
    g.px(32, 7, '#e8514a')
    for (const s of [-1, 1]) {
      g.line(32 + s * 6, 10, 32 + s * 18, 9, '#43a86a')
      g.px(32 + s * 18, 8, '#43a86a')
    }
    // Hanging red lanterns.
    for (const x of [14, 50]) {
      g.vline(x, 23, 26, '#8a4a1a')
      g.ellipse(x, 29, 3, 3.5, night ? '#ff6a4a' : '#e8514a')
      g.hline(x - 2, x + 2, 26, GOLD.b)
      g.hline(x - 2, x + 2, 32, GOLD.b)
    }
    // Incense burner.
    g.rect(29, 38, 6, 4, GOLD.d)
    hooks.smoke = [{ x: 32, y: 37 }]
    hooks.lanterns = [{ x: 14, y: 29 }, { x: 50, y: 29 }]
  })
}

// ---------------------------------------------------------------------------
// Hua Hin: พลับพลาสถานีรถไฟ และพระยืนเขาตะเกียบ

/** The red-and-cream Thai-style royal waiting pavilion (station style), used as the beach gate. */
export function huaHinPavilion(night: boolean): BeachProp {
  return bprop(`hh-pavilion:${night ? 1 : 0}`, 80, 64, 40, 63, (g, hooks) => {
    const red = '#c8343f'
    const redD = '#8e2530'
    const cream = '#fff1d6'
    const creamD = '#e8d4b0'
    // Deck and steps.
    g.rect(4, 54, 72, 9, '#b08a6a')
    g.hline(4, 75, 54, '#d8b890')
    for (let y = 56; y < 63; y += 2) g.hline(30, 50, y, '#8a6a4a')
    // Walls with arched openings, cream with red frames.
    g.rect(8, 32, 64, 22, cream)
    g.hline(8, 71, 32, '#ffffff')
    for (const x of [10, 24, 50, 64]) {
      g.rect(x, 36, 8, 16, redD)
      g.rect(x + 1, 37, 6, 15, night ? '#ffd88a' : '#6a3a3a')
      g.ellipse(x + 4, 37, 3, 2, redD)
    }
    g.rect(34, 36, 12, 18, redD)
    g.rect(35, 37, 10, 17, night ? '#ffe0a0' : '#8a4a3a')
    // Carved fretwork eave.
    for (let x = 8; x < 72; x += 2) g.px(x, 33 + (x % 4 ? 0 : 1), creamD)
    // Tiered roofs: red with cream trim and chofa finials.
    const roof = (y: number, w: number, h: number) => {
      g.poly([[40 - w, y + h], [40 - w + 6, y], [40 + w - 6, y], [40 + w, y + h]], red)
      g.poly([[40 - w + 2, y + h - 1], [40 - w + 7, y + 1], [40 - 2, y + 1], [40 - 6, y + h - 1]], mix(red, '#ffffff', 0.18))
      g.hline(40 - w, 40 + w, y + h, cream)
      g.hline(40 - w, 40 + w, y + h + 1, redD)
      g.px(40 - w - 1, y + h - 2, cream)
      g.px(40 + w + 1, y + h - 2, cream)
    }
    roof(20, 40, 11)
    roof(10, 28, 9)
    roof(2, 16, 7)
    g.vline(40, -1, 2, GOLD.b)
    // Station sign plank.
    g.rect(30, 26, 20, 5, cream)
    g.hline(32, 47, 28, redD)
    hooks.lamp = [{ x: 40, y: 44 }, { x: 14, y: 44 }, { x: 68, y: 44 }]
  })
}

/** The standing Buddha of Khao Takiap facing the sea (on its hill, baked-in via prop). */
export function standingBuddha(): BeachProp {
  return bprop('takiap-buddha', 24, 60, 12, 59, (g, hooks) => {
    g.rect(4, 52, 16, 7, '#e8e0d8')
    g.hline(4, 19, 52, '#ffffff')
    g.rect(6, 48, 12, 4, GOLD.d)
    // Robe falling straight, hands at the chest (blessing).
    g.poly([[7, 48], [8, 16], [16, 16], [17, 48]], GOLD.b)
    g.poly([[7, 48], [8, 16], [11, 16], [10, 48]], GOLD.L)
    g.line(14, 18, 16, 46, GOLD.d)
    g.rect(10, 22, 5, 4, GOLD.L)
    // Head.
    g.ellipse(12, 11, 4, 5, GOLD.b)
    g.ellipse(11, 10, 2, 3, GOLD.L)
    g.poly([[11, 6], [12, 1], [13, 6]], GOLD.b)
    g.px(12, 0, '#fffaf0')
    g.hline(10, 11, 11, GOLD.D)
    g.hline(13, 14, 11, GOLD.D)
    g.px(9, 15, '#ffffff')
    hooks.glow = [{ x: 12, y: 24 }]
  })
}

// ---------------------------------------------------------------------------
// Patong: ซุ้มประตูวัดสุวรรณคีรีวงก์

export function watPatongGate(night: boolean): BeachProp {
  return bprop(`patong-gate:${night ? 1 : 0}`, 60, 56, 30, 55, (g, hooks) => {
    const w = '#fffaf0'
    const wD = '#e0d4c4'
    for (const x of [4, 48]) {
      g.rect(x, 20, 8, 36, w)
      g.vline(x + 7, 20, 55, wD)
      g.rect(x - 1, 50, 10, 6, wD)
      g.rect(x + 2, 26, 4, 18, '#c8343f')
      g.px(x + 3, 30, GOLD.b)
    }
    // Tiered Thai roof across the top.
    g.rect(4, 14, 52, 7, w)
    g.hline(4, 55, 20, GOLD.d)
    g.poly([[0, 15], [10, 5], [50, 5], [60, 15]], '#c8343f')
    g.poly([[8, 7], [30, -1], [52, 7]], '#2f6fa8')
    g.hline(0, 60, 15, GOLD.b)
    g.hline(8, 52, 7, GOLD.b)
    g.px(0, 13, GOLD.b)
    g.px(60, 13, GOLD.b)
    g.vline(30, -3, 0, GOLD.b)
    // Name plaque.
    g.rect(20, 9, 20, 5, GOLD.b)
    g.hline(22, 37, 11, INK)
    if (night) for (const x of [8, 52]) g.rect(x - 1, 22, 2, 2, '#fff3a6')
    hooks.lamp = [{ x: 8, y: 23 }, { x: 52, y: 23 }]
  })
}

/** A small white sala with a tiered roof (merit spot / donation). */
export function beachSala(night: boolean, roof: Color = '#c8343f'): BeachProp {
  return bprop(`bsala:${roof}:${night ? 1 : 0}`, 48, 44, 24, 43, (g, hooks) => {
    g.rect(2, 36, 44, 7, '#e0d4c4')
    g.hline(2, 45, 36, '#fffaf0')
    for (const x of [5, 20, 27, 41]) g.rect(x, 18, 3, 18, '#fffaf0')
    g.rect(8, 28, 32, 8, night ? '#ffd88a' : '#f0e0c4')
    g.poly([[0, 19], [8, 9], [40, 9], [48, 19]], roof)
    g.poly([[10, 10], [24, 1], [38, 10]], mix(roof, INK, 0.2))
    g.hline(0, 48, 19, GOLD.b)
    g.hline(10, 38, 10, GOLD.b)
    g.px(24, 0, GOLD.b)
    hooks.lamp = [{ x: 24, y: 24 }]
  })
}
