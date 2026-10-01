// Cinematic art for the intro, title and arrival cutscenes: Bangkok at dawn,
// the alms round, a grand ubosot facade, lotus pond, vehicles and the logo.
// Everything is drawn procedurally; heavy layers are baked once per size.

import { bake, createCanvas, ditherOn, mix, Surface, type Color } from '../engine/pixel'
import { outlineCanvas, cached, type Sprite } from '../engine/sprite'
import { P, SKIN_TONES } from './palette'
import { composeAvatar, lookKey, type AvatarLook } from './avatar'
import { OUTFIT_BY_ID } from '../game/data/outfits'

// ---------------------------------------------------------------------------
// Palette (cinematic extras; the master palette lives in palette.ts)

export const C = {
  ink: '#3a2838',
  inkD: '#241a2b',
  night0: '#141238',
  night1: '#221e52',
  night2: '#3a2f6e',
  night3: '#5a4585',
  night4: '#7c5a93',
  // Temple gold
  goldL: '#fff6c2',
  gold: '#ffd54f',
  goldM: '#f5b83a',
  goldD: '#d98f2b',
  goldDD: '#a8621f',
  goldLine: '#7a3f1c',
  // Roof
  roofL: '#ffb066',
  roof: '#f08a3a',
  roofD: '#c9602a',
  roofDD: '#9a4323',
  roofEdge: '#3f9a6b',
  roofEdgeL: '#6cc38a',
  roofEdgeD: '#2a6f50',
  // Pediment
  ped: '#b8343f',
  pedD: '#8a2335',
  pedDD: '#5e1830',
  glassB: '#5ab8e8',
  glassG: '#62d0a0',
  // Walls
  wall: '#fffaf0',
  wallL: '#ffffff',
  wallS: '#efe4d2',
  wallD: '#d9c8b0',
  wallDD: '#b8a48c',
  // Lotus
  lotusL: '#fff0f5',
  lotus: '#ffb3cf',
  lotusM: '#f58ab4',
  lotusD: '#dc5f94',
  lotusDD: '#9a3a64',
  // Leaves and water
  padL: '#8fd06a',
  pad: '#5aa84e',
  padD: '#3c7d3e',
  padDD: '#24503a',
  saffron: '#ee9136',
  saffronD: '#c7661f',
} as const

// ---------------------------------------------------------------------------
// Small helpers

/** Deterministic hash → [0, 1). */
export function h01(n: number): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

/** Seeded generator for repeatable procedural layouts. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Bake and outline in one go. */
export function bakeOutlined(w: number, h: number, fn: (g: Surface) => void, color: Color = C.ink): Sprite {
  const c = bake(w, h, fn)
  return outlineCanvas(c, color)
}

/** Poly with a 1px outline drawn by offsetting the fill in four directions. */
export function polyOutlined(g: Surface, pts: [number, number][], fill: Color, line: Color = C.ink) {
  for (const [ox, oy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    g.poly(
      pts.map(([x, y]) => [x + ox, y + oy] as [number, number]),
      line,
    )
  g.poly(pts, fill)
}

/** Resample key colours into `n` evenly spaced gradient stops. */
export function ramp(keys: Color[], n: number): Color[] {
  const out: Color[] = []
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * (keys.length - 1)
    const k = Math.min(keys.length - 2, Math.floor(f))
    out.push(mix(keys[k], keys[k + 1], f - k))
  }
  return out
}

/** Sky gradient canvas (key colours are resampled into many dithered bands). */
export function bakeSky(w: number, h: number, stops: Color[], dither = 6, bands = 0): HTMLCanvasElement {
  const n = bands || Math.max(stops.length, Math.round(h / 22))
  return bake(w, h, (g) => g.gradientV(0, 0, w, h, ramp(stops, n), Math.min(dither, Math.floor(h / n / 1.5))))
}

/** Smooth additive glow (radial gradient) of any size. */
export function softGlow(g: Surface, x: number, y: number, r: number, strength: number, color: Color, squash = 1) {
  if (strength <= 0 || r <= 0) return
  const n = parseInt(color.slice(1), 16)
  const cr = (n >> 16) & 255
  const cg = (n >> 8) & 255
  const cb = n & 255
  const a = Math.min(1, strength)
  const cx = x - g.ox
  const cy = y - g.oy
  g.ctx.save()
  g.ctx.globalCompositeOperation = 'lighter'
  g.ctx.translate(cx, cy)
  g.ctx.scale(1, squash)
  const grad = g.ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  grad.addColorStop(0, `rgba(${cr},${cg},${cb},${0.45 * a})`)
  grad.addColorStop(0.35, `rgba(${cr},${cg},${cb},${0.2 * a})`)
  grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
  g.ctx.fillStyle = grad
  g.ctx.fillRect(-r, -r, r * 2, r * 2)
  g.ctx.restore()
}

/** Crescent moon (the dark part is cut out, so it works over any sky). */
export function drawCrescent(g: Surface, x: number, y: number, r: number, color: Color) {
  const key = `crescent:${r}:${color}`
  let c = crescentCache.get(key)
  if (!c) {
    const s = r * 2 + 4
    c = bake(s, s, (m) => {
      m.circle(s / 2, s / 2, r, color)
      m.circle(s / 2 - 1, s / 2 - 1, r * 0.55, mix(color, '#ffffff', 0.5))
      m.ctx.globalCompositeOperation = 'destination-out'
      m.circle(s / 2 + r * 0.5, s / 2 - r * 0.35, r * 0.88, '#000')
    })
    crescentCache.set(key, c)
  }
  g.draw(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2))
}
const crescentCache = new Map<string, HTMLCanvasElement>()

/** Long thin stratus clouds with a lit underside (sun below the horizon). */
export function bakeStratus(w: number, h: number, seed: number, n: number, body: Color, lit: Color, top: Color): HTMLCanvasElement {
  const r = seeded(seed)
  return bake(w, h, (g) => {
    for (let i = 0; i < n; i++) {
      const cy = Math.round(h * (0.15 + (i / n) * 0.8 + r() * 0.08))
      const cx = r() * w
      const len = 30 + r() * 70
      const th = 2 + Math.floor(r() * 3)
      const parts = 3 + Math.floor(r() * 3)
      for (let k = 0; k < parts; k++) {
        const px = cx + (k / parts - 0.5) * len
        const pl = len * (0.35 + r() * 0.3)
        const pt = th + (k === Math.floor(parts / 2) ? 1 : 0)
        g.rect(Math.round(px - pl / 2), cy - pt, Math.round(pl), pt, body)
        g.hline(Math.round(px - pl / 2) + 2, Math.round(px + pl / 2) - 3, cy - pt, top)
        g.hline(Math.round(px - pl / 2) + 1, Math.round(px + pl / 2) - 2, cy, lit)
      }
    }
  })
}

/** Four-point star glint (sparkle on gold). `k` 0..1 size envelope. */
export function glint(g: Surface, x: number, y: number, k: number, color: Color = '#fffbe0') {
  if (k <= 0.05) return
  const r = k > 0.66 ? 3 : k > 0.33 ? 2 : 1
  x = Math.round(x)
  y = Math.round(y)
  g.px(x, y, '#ffffff')
  for (let i = 1; i <= r; i++) {
    const c = i === r ? color : '#ffffff'
    g.px(x - i, y, c)
    g.px(x + i, y, c)
    g.px(x, y - i, c)
    g.px(x, y + i, c)
  }
  if (r >= 3) {
    g.px(x - 1, y - 1, color)
    g.px(x + 1, y - 1, color)
    g.px(x - 1, y + 1, color)
    g.px(x + 1, y + 1, color)
  }
}

/** Soft additive light rays fanning down from (x, y). */
export function drawRays(
  g: Surface,
  x: number,
  y: number,
  len: number,
  angle: number,
  spread: number,
  n: number,
  t: number,
  alpha = 0.1,
  color = '#fff3c4',
) {
  g.ctx.save()
  g.ctx.globalCompositeOperation = 'lighter'
  g.ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    const a = angle + (i / Math.max(1, n - 1) - 0.5) * spread
    const wob = Math.sin(t * 0.7 + i * 1.7) * 0.5 + 0.5
    const wA = 0.035 + h01(i * 7 + 3) * 0.05
    g.ctx.globalAlpha = alpha * (0.45 + wob * 0.55)
    const x0 = x - g.ox
    const y0 = y - g.oy
    g.ctx.beginPath()
    g.ctx.moveTo(x0, y0)
    g.ctx.lineTo(x0 + Math.cos(a - wA) * len, y0 + Math.sin(a - wA) * len)
    g.ctx.lineTo(x0 + Math.cos(a + wA) * len, y0 + Math.sin(a + wA) * len)
    g.ctx.closePath()
    g.ctx.fill()
  }
  g.ctx.restore()
}

/** Puffy pixel cloud (flat base, bumpy top) with a lit top and shaded base. */
export function bakeCloud(w: number, seed: number, light: Color, base: Color, shade: Color): HTMLCanvasElement {
  const r = seeded(seed)
  const h = Math.round(w * 0.42)
  return bake(w, h, (g) => {
    const by = h - 2
    const bumps = 3 + Math.floor(r() * 3)
    const shapes: [number, number, number][] = []
    for (let i = 0; i < bumps; i++) {
      const f = (i + 0.5) / bumps
      const rr = w * (0.13 + r() * 0.12) * (1 - Math.abs(f - 0.5) * 0.9)
      shapes.push([w * (0.12 + f * 0.76), by - rr * 0.35, rr])
    }
    for (const [x, y, rr] of shapes) g.ellipse(x, y + 1, rr + 1, rr * 0.8 + 1, shade)
    g.rect(w * 0.08, by - 3, w * 0.84, 4, shade)
    for (const [x, y, rr] of shapes) g.ellipse(x, y, rr, rr * 0.8, base)
    g.rect(w * 0.09, by - 4, w * 0.82, 3, base)
    for (const [x, y, rr] of shapes) g.ellipse(x - rr * 0.25, y - rr * 0.25, rr * 0.55, rr * 0.45, light)
    // Flat shaded underside.
    g.rect(w * 0.1, by - 1, w * 0.8, 1, shade)
  })
}

// ---------------------------------------------------------------------------
// Bangkok at dawn

export const DAWN_SKIES: Color[][] = [
  ['#0f0c2e', '#171544', '#221e55', '#342a69', '#4f3b7c', '#6d4c88'],
  ['#15133e', '#221f57', '#35306f', '#5a4486', '#9a5e90', '#d97c86'],
  ['#232a66', '#39407f', '#5d5695', '#9c6c9e', '#e98f92', '#ffc58c'],
]

interface Tower {
  x: number
  w: number
  h: number
  kind: number
}

/** Procedural skyline strip. Returns the silhouette and a separate lit-window layer. */
export function bakeSkyline(
  w: number,
  h: number,
  baseY: number,
  o: { seed: number; minH: number; maxH: number; body: Color; rim: Color; side?: Color; windows?: number; landmarks?: boolean; gap?: number },
): { body: HTMLCanvasElement; lights: HTMLCanvasElement } {
  const r = seeded(o.seed)
  const towers: Tower[] = []
  let x = -4
  while (x < w + 4) {
    const tw = 8 + Math.floor(r() * 16)
    const th = o.minH + Math.floor(r() * (o.maxH - o.minH))
    towers.push({ x, w: tw, h: th, kind: Math.floor(r() * 6) })
    x += tw + (o.gap ? Math.floor(r() * o.gap) : 0) - (r() < 0.4 ? 3 : 0)
  }
  if (o.landmarks) {
    // A few icons of the Bangkok skyline (loosely): a pixel-stepped
    // super-tall, a tower with a crown and mast, and a slim needle.
    towers.push({ x: Math.round(w * 0.62), w: 16, h: Math.round(o.maxH * 1.35), kind: 10 })
    towers.push({ x: Math.round(w * 0.2), w: 18, h: Math.round(o.maxH * 1.15), kind: 11 })
    towers.push({ x: Math.round(w * 0.86), w: 10, h: Math.round(o.maxH * 1.05), kind: 12 })
  }
  const lights = createCanvas(w, h)
  const lctx = lights.getContext('2d')!
  const body = bake(w, h, (g) => {
    for (const t of towers) {
      const top = baseY - t.h
      const x0 = t.x
      const x1 = t.x + t.w
      if (t.kind === 10) {
        // Stepped "pixel" super-tall: notches cut into the edges spiral up.
        g.rect(x0, top, t.w, t.h, o.body)
        // Cut-outs spiral up the tower and show the sky through it.
        g.ctx.save()
        g.ctx.globalCompositeOperation = 'destination-out'
        for (let y = top + 6; y < baseY - 24; y += 5) {
          const k = Math.floor((y - top) / 5) % 6
          if (k < 3) g.ctx.fillRect(x0, y, 2 + k, 3)
          else g.ctx.fillRect(x1 - (8 - k), y, 8 - k, 3)
        }
        g.ctx.fillRect(x0, top, 4, 3)
        g.ctx.fillRect(x1 - 6, top, 6, 2)
        g.ctx.restore()
        g.vline(x0 + 8, top - 8, top, o.body)
        g.hline(x0 + 4, x1 - 7, top, o.rim)
      } else if (t.kind === 11) {
        // Crowned tower with a mast.
        g.rect(x0, top + 10, t.w, t.h - 10, o.body)
        g.rect(x0 + 2, top + 5, t.w - 4, 5, o.body)
        g.rect(x0 + 5, top, t.w - 10, 5, o.body)
        g.vline(x0 + t.w / 2, top - 16, top, o.body)
        g.hline(x0, x1 - 1, top + 10, o.rim)
        g.hline(x0 + 2, x1 - 3, top + 5, o.rim)
        g.px(x0 + t.w / 2, top - 17, '#ff6f6f')
      } else if (t.kind === 12) {
        // Needle.
        g.poly(
          [
            [x0, baseY],
            [x0 + 2, top + 6],
            [x0 + t.w / 2, top],
            [x1 - 2, top + 6],
            [x1, baseY],
          ],
          o.body,
        )
        g.vline(x0 + t.w / 2, top - 10, top, o.body)
      } else {
        g.rect(x0, top, t.w, t.h, o.body)
        if (o.side) g.rect(x1 - 2, top, 2, t.h, o.side)
        switch (t.kind) {
          case 0:
            // Stepped crown.
            g.rect(x0 + 2, top - 3, t.w - 4, 3, o.body)
            g.hline(x0 + 2, x1 - 3, top - 3, o.rim)
            break
          case 1:
            // Antenna.
            g.vline(x0 + 3, top - 7, top, o.body)
            g.px(x0 + 3, top - 8, '#ff6f6f')
            break
          case 2:
            // Slanted top.
            g.poly(
              [
                [x0, top],
                [x1, top - 5],
                [x1, top],
              ],
              o.body,
            )
            break
          case 3:
            // Water tank on the roof.
            g.rect(x0 + 3, top - 3, 4, 3, o.body)
            break
        }
        g.hline(x0, x1 - 1, top, o.rim)
      }
      // Windows.
      if (o.windows) {
        const cols = Math.floor((t.w - 2) / 3)
        for (let yy = top + 3; yy < baseY - 2; yy += 3) {
          for (let c = 0; c < cols; c++) {
            const wx = x0 + 2 + c * 3
            if (wx >= x1 - 1) continue
            const hv = h01(wx * 131 + yy * 71 + o.seed)
            if (hv < o.windows) {
              lctx.fillStyle = hv < o.windows * 0.18 ? '#bfe3ff' : hv < o.windows * 0.55 ? '#ffd98a' : '#ffeab8'
              lctx.fillRect(wx, yy, t.kind % 2 ? 2 : 1, 1)
            } else if (hv < o.windows + 0.08) {
              g.px(wx, yy, o.rim)
            }
          }
        }
      }
    }
    g.rect(0, baseY, w, h - baseY, o.body)
  })
  return { body, lights }
}

/** Wat Arun-style prang (Khmer tower) with an optional warm floodlight. `s` scales. */
export function drawPrang(
  g: Surface,
  cx: number,
  baseY: number,
  hgt: number,
  pal: { body: Color; light: Color; shade: Color; dark: Color; accent?: Color; accent2?: Color },
) {
  const H = Math.round(hgt)
  const baseW = Math.round(H * 0.46)
  // Stepped terraces.
  const terr = 4
  let y = baseY
  for (let i = 0; i < terr; i++) {
    const tw = Math.round(baseW * (1 - i * 0.14))
    const th = Math.max(2, Math.round(H * 0.045))
    g.rect(cx - tw / 2, y - th, tw, th, pal.body)
    g.hline(cx - tw / 2, cx + tw / 2 - 1, y - th, pal.light)
    g.rect(cx + tw / 2 - Math.max(1, Math.round(tw * 0.12)), y - th, Math.max(1, Math.round(tw * 0.12)), th, pal.shade)
    g.hline(cx - tw / 2, cx + tw / 2 - 1, y - 1, pal.dark)
    y -= th
  }
  // Corncob tower body: width tapers with a rounded top.
  const towerH = Math.round(H * 0.62)
  const tw0 = Math.round(baseW * 0.5)
  const top = y - towerH
  for (let yy = 0; yy < towerH; yy++) {
    const f = yy / towerH // 0 bottom → 1 top
    const half = Math.max(1, tw0 / 2 * Math.pow(1 - f, 0.55) * (1 - f * 0.25))
    const ry = y - yy - 1
    const band = yy % 4
    const col = band === 0 ? pal.dark : band === 1 ? pal.light : pal.body
    g.rect(Math.round(cx - half), ry, Math.round(half * 2), 1, col)
    // Right side shade.
    const sh = Math.max(1, Math.round(half * 0.4))
    g.rect(Math.round(cx + half) - sh, ry, sh, 1, band === 0 ? pal.dark : pal.shade)
    // Porcelain dots.
    if (pal.accent && band === 2 && yy % 8 === 2) {
      for (let k = -Math.floor(half) + 1; k < half - 1; k += 3) g.px(Math.round(cx + k), ry, (k + yy) % 2 ? pal.accent : pal.accent2 ?? pal.accent)
    }
  }
  // Niche with a guardian at the base of the tower.
  const nh = Math.max(3, Math.round(H * 0.09))
  g.rect(cx - 1, y - nh, 3, nh, pal.dark)
  g.px(cx, y - nh - 1, pal.dark)
  // Spire.
  const sp = Math.round(H * 0.16)
  g.vline(cx, top - sp, top, pal.light)
  g.vline(cx + 1, top - sp + 3, top, pal.shade)
  g.px(cx - 1, top - sp + 3, pal.light)
  g.px(cx + 1, top - sp + 2, pal.light)
  g.px(cx - 1, top - sp + 2, pal.light)
  g.px(cx, top - sp - 1, pal.light)
}

/** Elevated skytrain guideway strip (beam + pillars) across `w`. */
export function bakeGuideway(w: number, h: number, beamY: number, groundY: number, body: Color, top: Color, pillar: Color): HTMLCanvasElement {
  return bake(w, h, (g) => {
    for (let x = 10; x < w; x += 38) {
      g.rect(x, beamY + 4, 4, groundY - beamY - 4, pillar)
      g.rect(x - 2, beamY + 4, 8, 2, pillar)
    }
    g.rect(0, beamY, w, 4, body)
    g.hline(0, w - 1, beamY, top)
    g.hline(0, w - 1, beamY + 3, pillar)
    // Rail parapet ticks.
    for (let x = 0; x < w; x += 3) g.px(x, beamY - 1, body)
  })
}

/** A skytrain of `cars` carriages; x is the rear, y the bottom of the car. */
export function drawSkytrain(g: Surface, x: number, y: number, cars: number, lit: number, pal: { body: Color; stripe: Color; roof: Color; win: Color; dark: Color }) {
  const cw = 34
  const ch = 10
  for (let i = 0; i < cars; i++) {
    const x0 = Math.round(x + i * (cw + 2))
    const front = i === cars - 1
    g.rect(x0, y - ch, cw, ch, pal.body)
    g.hline(x0 + 1, x0 + cw - 2, y - ch - 1, pal.roof)
    g.hline(x0, x0 + cw - 1, y - ch, pal.roof)
    if (front) {
      // Rounded nose with a headlight.
      g.rect(x0 + cw, y - ch + 1, 2, ch - 1, pal.body)
      g.rect(x0 + cw + 2, y - ch + 3, 1, ch - 4, pal.body)
      g.px(x0 + cw + 1, y - ch + 2, pal.win)
      g.px(x0 + cw + 2, y - 3, '#fffbe0')
    }
    if (i > 0) g.rect(x0 - 2, y - ch + 3, 2, ch - 5, pal.dark)
    // Doors and windows.
    for (let k = 0; k < 7; k++) {
      const wx = x0 + 2 + k * 5
      if (wx + 3 > x0 + cw - 1) break
      const door = k === 2 || k === 5
      g.rect(wx, y - ch + 2, 3, door ? 6 : 3, lit > 0.5 || k % 2 === 0 ? pal.win : pal.dark)
    }
    g.hline(x0, x0 + cw - 1, y - 3, pal.stripe)
    g.hline(x0, x0 + cw - 1, y - 2, pal.stripe)
    g.hline(x0, x0 + cw - 1, y - 1, pal.dark)
  }
}

/** Long-tail boat seen from the side (bow to the right). */
export function longtailSprite(passenger?: HTMLCanvasElement): Sprite {
  return cached(`longtail:${passenger ? 'p' : ''}`, () =>
    bakeOutlined(62, 22, (g) => {
      // Garland at the bow post.
      const hull = '#8a5a3a'
      const hullD = '#6a4230'
      const hullL = '#b07a52'
      g.poly(
        [
          [3, 12],
          [52, 12],
          [60, 4],
          [58, 3],
          [50, 17],
          [8, 17],
        ],
        hull,
      )
      g.hline(3, 52, 12, hullL)
      g.line(52, 12, 59, 4, hullL)
      g.hline(8, 50, 16, hullD)
      g.rect(10, 14, 38, 1, '#e8514a')
      g.rect(10, 15, 38, 1, '#ffd54f')
      // Bow garland ribbons.
      g.px(59, 3, '#e8514a')
      g.px(58, 2, '#ffd54f')
      g.px(60, 2, '#6cc36a')
      g.px(57, 4, '#ff9fc0')
      // Canopy posts and roof.
      g.vline(16, 4, 12, '#6a4230')
      g.vline(44, 4, 12, '#6a4230')
      g.rect(13, 2, 35, 2, '#3d63b5')
      g.hline(13, 47, 2, '#5a8de0')
      // Engine and long tail shaft.
      g.rect(2, 7, 6, 5, '#5a5566')
      g.rect(3, 6, 4, 1, '#8c8187')
      g.line(2, 12, -2, 19, '#8c8187')
    }),
  )
}

// ---------------------------------------------------------------------------
// The soi: shophouses, power pole, spirit house, villager

const UNIT_PALS = [
  { wall: '#f7e6c8', shade: '#dfc49e', trim: '#fff7e6' },
  { wall: '#cfe8d6', shade: '#a6cbb3', trim: '#effaf2' },
  { wall: '#f6c9b4', shade: '#d9a38c', trim: '#ffe6da' },
  { wall: '#fbe7a2', shade: '#e0c273', trim: '#fff6d2' },
  { wall: '#dcd3ee', shade: '#b9acd4', trim: '#f2eefc' },
]
const AWNINGS: [Color, Color][] = [
  ['#e8514a', '#fff1d6'],
  ['#5ea653', '#fffaf0'],
  ['#5a8de0', '#fffaf0'],
  ['#f58f35', '#fff1d6'],
  ['#e8709e', '#fffaf0'],
]

/** One Bangkok shophouse (ตึกแถว) unit, `x` is the left edge, `gy` the pavement line. */
export function drawShophouse(g: Surface, x: number, gy: number, w: number, variant: number, r: () => number) {
  const pal = UNIT_PALS[variant % UNIT_PALS.length]
  const [aw1, aw2] = AWNINGS[(variant * 3 + 1) % AWNINGS.length]
  const top = gy - 66
  const ink = '#4a3448'
  // Body.
  g.rect(x, top, w, 66, pal.wall)
  g.rect(x + w - 2, top, 2, 66, pal.shade)
  g.vline(x, top, gy - 1, mix(pal.wall, ink, 0.25))
  // Parapet and cornice.
  g.rect(x, top, w, 3, pal.trim)
  g.hline(x, x + w - 1, top + 3, pal.shade)
  g.hline(x, x + w - 1, top + 5, mix(pal.shade, ink, 0.2))
  if (variant % 3 === 0) {
    // Little stepped pediment with a date plaque.
    g.rect(x + w / 2 - 5, top - 3, 10, 3, pal.trim)
    g.rect(x + w / 2 - 2, top - 5, 4, 2, pal.trim)
    g.hline(x + w / 2 - 3, x + w / 2 + 2, top - 1, pal.shade)
  } else if (variant % 3 === 1) {
    // Water tank.
    g.rect(x + 4, top - 6, 6, 6, '#d8d2dc')
    g.rect(x + 4, top - 6, 6, 1, '#f0ecf2')
    g.rect(x + 9, top - 6, 1, 6, '#a8a2b0')
    g.vline(x + 5, top - 1, top, '#8c8699')
    g.vline(x + 8, top - 1, top, '#8c8699')
  } else {
    // TV antenna.
    g.vline(x + w - 7, top - 9, top, '#6a6478')
    g.hline(x + w - 10, x + w - 4, top - 7, '#6a6478')
    g.hline(x + w - 9, x + w - 5, top - 5, '#6a6478')
  }
  // Top floor: shuttered windows and breeze-block vents.
  const f3 = top + 7
  for (const wx of [x + 4, x + w - 12]) {
    g.rect(wx, f3, 8, 11, mix(pal.shade, ink, 0.35))
    g.rect(wx + 1, f3 + 1, 3, 10, '#8a5a3a')
    g.rect(wx + 4, f3 + 1, 3, 10, '#9a6a45')
    g.vline(wx + 2, f3 + 2, f3 + 9, '#6e4a35')
    g.vline(wx + 5, f3 + 2, f3 + 9, '#7a5238')
    g.hline(wx - 1, wx + 8, f3 + 11, pal.trim)
  }
  if (w > 26) {
    const vx = x + Math.round(w / 2) - 3
    for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) g.rect(vx + i * 3, f3 + 2 + j * 3, 2, 2, mix(pal.shade, ink, 0.2))
  }
  // Middle floor: grilled windows, a balcony with pot plants, an AC unit.
  const f2 = top + 24
  g.rect(x + 3, f2, w - 7, 12, mix(pal.shade, ink, 0.45))
  g.rect(x + 4, f2 + 1, w - 9, 10, '#7fa8c8')
  g.rect(x + 4, f2 + 1, w - 9, 3, '#a8cde6')
  // Grille (เหล็กดัด).
  for (let gx = x + 4; gx < x + w - 5; gx += 3) g.vline(gx, f2 + 1, f2 + 10, '#e8e2ec')
  g.hline(x + 4, x + w - 6, f2 + 5, '#e8e2ec')
  for (let gx = x + 5; gx < x + w - 6; gx += 6) {
    g.px(gx + 1, f2 + 3, '#e8e2ec')
    g.px(gx, f2 + 2, '#e8e2ec')
  }
  // Balcony slab and railing.
  g.rect(x + 1, f2 + 12, w - 3, 2, pal.trim)
  g.hline(x + 1, x + w - 3, f2 + 14, mix(pal.shade, ink, 0.3))
  g.hline(x + 2, x + w - 4, f2 + 7, '#6a6478')
  for (let bx = x + 2; bx < x + w - 3; bx += 2) g.vline(bx, f2 + 7, f2 + 11, '#6a6478')
  // Pot plants.
  const pots = 1 + Math.floor(r() * 3)
  for (let k = 0; k < pots; k++) {
    const px = x + 4 + Math.floor(r() * (w - 12))
    g.rect(px, f2 + 9, 4, 3, '#c9683a')
    g.hline(px, px + 3, f2 + 9, '#e08a5a')
    g.circle(px + 2, f2 + 7, 3, P.leaf)
    g.circle(px + 1.5, f2 + 6.5, 2, P.grass)
    if (r() < 0.7) {
      const fc = r() < 0.5 ? '#ff6fa0' : '#ffd23f'
      g.px(px + 1, f2 + 5, fc)
      g.px(px + 3, f2 + 6, fc)
    }
  }
  if (variant % 2 === 0) {
    // AC unit hanging on the wall.
    const ax = x + w - 9
    g.rect(ax, f2 - 6, 7, 5, '#f4f2f6')
    g.rect(ax, f2 - 2, 7, 1, '#c9c3d0')
    g.circle(ax + 4.5, f2 - 3.5, 1.6, '#8c8699')
    g.hline(ax + 1, ax + 2, f2 - 5, '#c9c3d0')
  } else {
    // Laundry on a line.
    g.hline(x + 2, x + w - 3, f2 - 3, '#6a6478')
    g.rect(x + 5, f2 - 3, 3, 4, '#ff9fc0')
    g.rect(x + 10, f2 - 3, 4, 3, '#9fd0ff')
    g.rect(x + 16, f2 - 3, 3, 5, '#fff1d6')
  }
  // Signboard with scribbled Thai lettering.
  const sy = gy - 32
  const sc = [aw1, '#3d63b5', '#e8514a', '#2f6f4b', '#f58f35'][(variant + 2) % 5]
  g.rect(x + 2, sy, w - 4, 6, sc)
  g.hline(x + 2, x + w - 3, sy, mix(sc, '#ffffff', 0.35))
  g.hline(x + 2, x + w - 3, sy + 5, mix(sc, ink, 0.35))
  for (let lx = x + 5; lx < x + w - 6; lx += 2 + Math.floor(r() * 2)) {
    g.px(lx, sy + 2 + Math.floor(r() * 2), '#fffaf0')
    if (r() < 0.5) g.px(lx, sy + 3, '#fffaf0')
  }
  // Ground floor: open shop or roller shutter.
  const f1 = gy - 24
  g.rect(x + 2, f1, w - 4, 24, mix(pal.shade, ink, 0.15))
  const open = variant % 3 !== 1
  if (open) {
    g.rect(x + 3, f1 + 3, w - 6, 21, '#5d3f44')
    g.rect(x + 3, f1 + 3, w - 6, 2, '#9a9aa8')
    for (let k = 0; k < 3; k++) {
      const sy2 = f1 + 7 + k * 5
      g.hline(x + 4, x + w - 5, sy2 + 3, '#8a5a3a')
      for (let gx = x + 5; gx < x + w - 5; gx += 2) g.rect(gx, sy2 + 1, 1, 2, ['#ffd23f', '#e8514a', '#6cc36a', '#9fd0ff', '#ff9fc0', '#fffaf0'][Math.floor(r() * 6)])
    }
    g.rect(x + Math.round(w / 2) - 1, f1 + 5, 2, 1, '#fff3c4')
  } else {
    g.rect(x + 3, f1 + 3, w - 6, 21, '#c2bccb')
    for (let yy = f1 + 4; yy < gy; yy += 2) g.hline(x + 3, x + w - 4, yy, '#a39cae')
    g.rect(x + w / 2 - 2, gy - 3, 4, 1, '#6a6478')
  }
  // Striped awning with a scalloped edge.
  const ay = f1 - 2
  for (let ax = x; ax < x + w; ax++) {
    const c = Math.floor((ax - x) / 3) % 2 ? aw2 : aw1
    g.vline(ax, ay, ay + 3, c)
    if ((ax - x) % 3 !== 1) g.px(ax, ay + 4, c)
  }
  g.hline(x, x + w - 1, ay, mix(aw1, '#ffffff', 0.3))
  g.alpha(0.25)
  g.hline(x, x + w - 1, ay + 5, ink)
  g.hline(x, x + w - 1, ay + 6, ink)
  g.alpha(1)
  g.rect(x + 1, gy - 1, w - 2, 1, mix(pal.shade, ink, 0.3))
}

/** A row of shophouses. */
export function bakeSoi(w: number, h: number, gy: number, seed: number): HTMLCanvasElement {
  const r = seeded(seed)
  return bake(w, h, (g) => {
    let x = -6
    let v = seed % 5
    while (x < w) {
      const uw = 26 + Math.floor(r() * 3) * 2
      drawShophouse(g, x, gy, uw, v++, r)
      x += uw
    }
  })
}

/** Catenary cable between two points. */
export function drawCable(g: Surface, x0: number, y0: number, x1: number, y1: number, s: number, c: Color) {
  const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / 2))
  let lx = x0
  let ly = y0
  for (let i = 1; i <= n; i++) {
    const f = i / n
    const x = x0 + (x1 - x0) * f
    const y = y0 + (y1 - y0) * f + s * 4 * f * (1 - f)
    g.line(lx, ly, x, y, c)
    lx = x
    ly = y
  }
}

/** Concrete power pole with a spaghetti of cables (a Bangkok signature). */
export function bakePowerLines(w: number, h: number, poleX: number, gy: number, poleH: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    const top = gy - poleH
    const cable = '#4a3a50'
    const cable2 = '#6a5a70'
    const arms = [top + 3, top + 8, top + 16, top + 24]
    let k = 0
    for (const ay of arms) {
      for (const dir of [-1, 1]) {
        const n = ay < top + 10 ? 2 : 1
        for (let j = 0; j < n; j++) {
          const x1 = dir < 0 ? -10 : w + 10
          const y1 = ay + (j - 1) * 5 + (dir < 0 ? 8 : 2) + (k % 3) * 2
          drawCable(g, poleX + dir * (j * 3 + 2), ay + j, x1, y1, 6 + ((k * 7) % 10), k % 3 === 0 ? cable2 : cable)
          k++
        }
      }
    }
    // A coil of spare cable hanging off the pole.
    for (let i = 0; i < 3; i++) g.ellipse(poleX + 5, top + 27 + i, 3.5, 4, i === 1 ? cable2 : cable)
    g.ctx.clearRect(poleX + 4, top + 26, 3, 5)
    // Pole.
    g.rect(poleX - 2, top, 4, poleH, '#bdb6c6')
    g.rect(poleX + 1, top, 1, poleH, '#8e879c')
    g.hline(poleX - 2, poleX + 1, top, '#e4dfea')
    for (let y = top + 8; y < gy; y += 7) g.px(poleX - 1, y, '#8e879c')
    // Cross arms with insulators.
    for (const ay of [top + 3, top + 8]) {
      g.rect(poleX - 7, ay, 14, 2, '#8e879c')
      for (const ix of [-6, -3, 3, 6]) {
        g.px(poleX + ix, ay - 1, '#fffaf0')
        g.px(poleX + ix, ay - 2, '#fffaf0')
      }
    }
    // Transformer drum.
    g.rect(poleX + 3, top + 13, 5, 8, '#9a98a8')
    g.rect(poleX + 3, top + 13, 5, 1, '#c9c6d2')
    g.rect(poleX + 7, top + 13, 1, 8, '#6a6478')
    g.rect(poleX + 2, top + 16, 1, 2, '#6a6478')
    g.rect(poleX - 3, gy - 3, 6, 3, '#8e879c')
  })
}

/** Foreground flowering branch hanging into frame (frangipani / bougainvillea). */
export function bakeBranch(w: number, h: number, seed: number, flower: Color, flowerL: Color, flip = false): HTMLCanvasElement {
  const r = seeded(seed)
  const c = bake(w, h, (g) => {
    const leaf = '#3f8a4f'
    const leafL = '#5fae5c'
    const leafD = '#2c6a45'
    // Main branch from the top-right corner curving down-left.
    const pts: [number, number][] = []
    for (let i = 0; i <= 12; i++) {
      const f = i / 12
      pts.push([w - 2 - f * w * 0.85, 2 + Math.sin(f * 2.4) * h * 0.55])
    }
    for (let i = 1; i < pts.length; i++) g.thickLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2.2 - i * 0.1, '#6e4a35')
    // Leaf clumps and flowers along the branch.
    for (let i = 2; i < pts.length; i++) {
      const [x, y] = pts[i]
      for (let k = 0; k < 3; k++) {
        const lx = x + (r() - 0.5) * 10
        const ly = y + (r() - 0.3) * 8
        g.ellipse(lx, ly, 3 + r() * 2, 2, leafD)
        g.ellipse(lx - 0.5, ly - 0.5, 2.5 + r() * 1.5, 1.5, k % 2 ? leaf : leafL)
      }
      if (i % 2 === 0) {
        const fx = x + (r() - 0.5) * 6
        const fy = y + 3 + r() * 3
        for (const [dx, dy] of [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ]) {
          g.px(fx + dx * 1.5, fy + dy * 1.5, flower)
          g.px(fx + dx, fy + dy, flower)
        }
        g.px(fx, fy, flowerL)
        g.px(fx + 1, fy - 1, flowerL)
      }
    }
  })
  if (!flip) return c
  return bake(w, h, (g) => g.draw(c, 0, 0, true))
}

/** Spirit house (ศาลพระภูมิ) on its pillar with marigold garlands. */
export function drawSpiritHouse(g: Surface, cx: number, gy: number) {
  const top = gy - 32
  g.rect(cx - 5, gy - 3, 10, 3, '#e4ddd6')
  g.rect(cx - 2, top + 12, 4, 18, '#fffaf0')
  g.rect(cx + 1, top + 12, 1, 18, '#dccfb8')
  g.rect(cx - 8, top + 10, 16, 2, '#fffaf0')
  g.hline(cx - 8, cx + 7, top + 11, '#dccfb8')
  g.rect(cx - 6, top + 2, 12, 8, '#e8514a')
  g.rect(cx - 6, top + 2, 12, 1, '#ffd54f')
  g.rect(cx - 2, top + 4, 4, 6, '#ffd54f')
  g.rect(cx - 1, top + 5, 2, 5, '#b8343f')
  g.vline(cx - 6, top + 2, top + 9, '#ffd54f')
  g.vline(cx + 5, top + 2, top + 9, '#ffd54f')
  g.poly(
    [
      [cx - 8, top + 3],
      [cx, top - 5],
      [cx + 8, top + 3],
    ],
    '#ffd54f',
  )
  g.poly(
    [
      [cx - 6, top + 2],
      [cx, top - 3],
      [cx + 6, top + 2],
    ],
    '#e8514a',
  )
  g.vline(cx, top - 9, top - 5, '#ffd54f')
  g.px(cx - 8, top + 2, '#ffd54f')
  g.px(cx + 8, top + 2, '#ffd54f')
  for (let i = -6; i <= 6; i += 2) g.px(cx + i, top + 10, i % 4 === 0 ? '#f58f35' : '#ffd23f')
  g.rect(cx + 4, top + 7, 2, 3, '#e8514a')
  g.px(cx + 5, top + 6, '#fffaf0')
  g.rect(cx - 6, top + 8, 2, 2, '#fffaf0')
}

/** Kneeling villager (side view, facing right) built from the avatar renderer. */
export function villagerSprite(look: AvatarLook, pose: 'offer' | 'stand'): Sprite {
  return cached(`villager:${lookKey(look)}:${pose}`, () => {
    const comp = composeAvatar(look, 'side', pose)
    const c = createCanvas(18, 27)
    const ctx = c.getContext('2d')!
    // Upper body (head + torso: 23 rows of the classic map, plus the v5 chest
    // row) sits on the kneeling legs below.
    const upper = 23 + 1
    ctx.drawImage(comp, 0, 0, 16, upper, 0, 24 - upper, 16, upper)
    const bot = OUTFIT_BY_ID[look.bottom]?.bottom
    const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[1]
    const pal: Record<string, string> = { L: bot?.main ?? '#8a6a55', K: bot?.shade ?? '#6a4a35', F: skin.d }
    const rows = ['....LLLLLLLLL.....', '..FFLLLLLLLLLL....', '..FFKKKKKKKKKKK...']
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]]
        if (!col) continue
        ctx.fillStyle = col
        ctx.fillRect(x, 24 + y, 1, 1)
      }
    })
    return outlineCanvas(c, C.ink)
  })
}

// ---------------------------------------------------------------------------
// Grand ubosot facade (front elevation), parametric in scale `s`.

interface GoldPal {
  l: Color
  b: Color
  m: Color
  d: Color
  dd: Color
  line: Color
}
const GOLDP: GoldPal = { l: C.goldL, b: C.gold, m: C.goldM, d: C.goldD, dd: C.goldDD, line: C.goldLine }

export interface FacadeInfo {
  canvas: HTMLCanvasElement
  /** Centre x and ground y inside the canvas. */
  cx: number
  gy: number
  /** Glint points (chofa tips, hang hong), canvas coordinates. */
  glints: [number, number][]
  /** Places where birds can perch (roof edges). */
  perches: [number, number][]
  /** Useful heights (canvas y). */
  doorTop: number
  wallTop: number
  peak: number
  top: number
}

/** Slender swan-neck finial (ช่อฟ้า) rising from a gable peak. Returns the tip. */
export function drawChofa(g: Surface, x: number, y: number, h: number, pal: GoldPal = GOLDP, dir = 1): [number, number] {
  const w = Math.max(1.2, h * 0.09)
  const pts: [number, number][] = [
    [x, y + 1],
    [x, y - h * 0.45],
    [x + dir * h * 0.05, y - h * 0.75],
    [x + dir * h * 0.16, y - h * 0.95],
    [x + dir * h * 0.3, y - h],
    [x + dir * h * 0.42, y - h * 0.9],
  ]
  for (let i = 1; i < pts.length; i++) g.thickLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], i > 3 ? Math.max(1, w * 0.7) : w, pal.b)
  for (let i = 1; i < 4; i++) g.line(pts[i - 1][0] - dir * Math.max(0, w / 2 - 0.5), pts[i - 1][1], pts[i][0] - dir * Math.max(0, w / 2 - 0.5), pts[i][1], pal.l)
  // Base collar.
  g.rect(x - w - 1, y - 2, w * 2 + 2, 2, pal.d)
  const tip = pts[4]
  return [Math.round(tip[0]), Math.round(tip[1])]
}

/** Upward curl at a barge-board end (หางหงส์). */
export function drawHangHong(g: Surface, x: number, y: number, size: number, dir: number, pal: GoldPal = GOLDP): [number, number] {
  const w = Math.max(1, size * 0.22)
  const pts: [number, number][] = [
    [x, y],
    [x + dir * size * 0.55, y - size * 0.1],
    [x + dir * size * 0.85, y - size * 0.55],
    [x + dir * size * 0.75, y - size * 0.95],
    [x + dir * size * 0.45, y - size * 1.05],
  ]
  for (let i = 1; i < pts.length; i++) g.thickLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], i > 2 ? Math.max(1, w * 0.7) : w, pal.b)
  g.px(Math.round(pts[2][0]), Math.round(pts[2][1]), pal.l)
  return [Math.round(pts[3][0]), Math.round(pts[3][1])]
}

/** Tiered pointed crown frame (ซุ้มทรงมงกุฎ) over a door or window. */
export function drawCrownFrame(g: Surface, cx: number, baseY: number, w: number, h: number, pal: GoldPal = GOLDP) {
  const tiers = 4
  let y = baseY
  let tw = w
  const th = Math.max(2, Math.round((h * 0.62) / tiers))
  for (let i = 0; i < tiers; i++) {
    g.rect(Math.round(cx - tw / 2), y - th, Math.round(tw), th, pal.b)
    g.hline(Math.round(cx - tw / 2), Math.round(cx + tw / 2) - 1, y - th, pal.l)
    g.hline(Math.round(cx - tw / 2), Math.round(cx + tw / 2) - 1, y - 1, pal.dd)
    // Little flame tips at the tier corners.
    g.px(Math.round(cx - tw / 2) - 1, y - th, pal.b)
    g.px(Math.round(cx + tw / 2), y - th, pal.b)
    if (tw > 8) for (let k = Math.round(cx - tw / 2) + 2; k < cx + tw / 2 - 2; k += 3) g.px(k, y - Math.ceil(th / 2), pal.d)
    y -= th
    tw *= 0.72
  }
  const sp = h - th * tiers
  g.poly(
    [
      [cx - tw / 2, y],
      [cx, y - sp],
      [cx + tw / 2, y],
    ],
    pal.b,
  )
  g.vline(Math.round(cx) - 1, Math.round(y - sp * 0.6), y - 1, pal.l)
}

/** Stylised gold deity (เทพพนม) in a flaming halo for the pediment. */
function drawPedimentDeity(g: Surface, cx: number, cy: number, r: number, pal: GoldPal, bg: Color) {
  // Flame halo.
  const n = 14
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    g.thickLine(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05, Math.max(1, r * 0.12), pal.b)
  }
  g.circle(cx, cy, r * 0.82, pal.d)
  g.circle(cx, cy, r * 0.7, bg)
  // Figure: crown spire, head, body with hands in prayer, lotus seat.
  const u = r / 10
  g.poly(
    [
      [cx - u * 2, cy - u * 3],
      [cx, cy - u * 9],
      [cx + u * 2, cy - u * 3],
    ],
    pal.b,
  )
  g.circle(cx, cy - u * 2, u * 2.2, pal.b)
  g.poly(
    [
      [cx - u * 3.5, cy + u * 5],
      [cx - u * 2, cy],
      [cx + u * 2, cy],
      [cx + u * 3.5, cy + u * 5],
    ],
    pal.b,
  )
  g.thickLine(cx, cy + u * 0.5, cx, cy + u * 3, Math.max(1, u * 1.2), pal.l)
  g.ellipse(cx, cy + u * 6, u * 5.5, u * 1.6, pal.m)
  for (let k = -4; k <= 4; k += 2) g.px(Math.round(cx + k * u), Math.round(cy + u * 6), pal.dd)
  g.px(Math.round(cx - u * 0.8), Math.round(cy - u * 2), pal.dd)
  g.px(Math.round(cx + u * 0.8), Math.round(cy - u * 2), pal.dd)
}

/** Gold spiral scroll (kranok) motif. */
function drawScroll(g: Surface, x: number, y: number, r: number, dir: number, pal: GoldPal) {
  const turns = 1.4
  const steps = Math.max(10, Math.round(r * 10))
  let lx = x
  let ly = y
  for (let i = 1; i <= steps; i++) {
    const f = i / steps
    const a = f * turns * Math.PI * 2
    const rr = r * (1 - f * 0.75)
    const px = x + dir * Math.cos(a) * rr
    const py = y - Math.sin(a) * rr
    if (r > 3) g.thickLine(lx, ly, px, py, 1.6, pal.b)
    else g.line(lx, ly, px, py, pal.b)
    lx = px
    ly = py
  }
  // Flame tail.
  g.line(x + dir * r, y, x + dir * r * 2.2, y - r * 1.4, pal.b)
  g.px(Math.round(x + dir * r * 2.2), Math.round(y - r * 1.4) - 1, pal.l)
}

/** Rearing naga (serpent) balustrade head in profile. Returns the crest tip. */
export function drawNaga(g: Surface, x: number, gy: number, h: number, dir: number, body = '#4fb06a', bodyD = '#35864f', belly = '#fff1c4'): [number, number] {
  const u = h / 40
  const X = (v: number) => x + dir * v * u
  const Y = (v: number) => gy - v * u
  const neck: [number, number][] = [
    [0, 0],
    [0.5, 8],
    [1.5, 16],
    [-1, 24],
    [0.5, 31],
  ]
  // Crest flames flowing back.
  for (const [cx2, cy2, w] of [
    [-6, 43, 1.6],
    [-9, 39, 1.4],
    [-10, 34, 1.2],
  ] as [number, number, number][]) {
    g.thickLine(X(-1), Y(34), X(cx2), Y(cy2), Math.max(1, w * u), C.gold)
    g.px(Math.round(X(cx2)), Math.round(Y(cy2)), C.goldL)
  }
  for (let i = 1; i < neck.length; i++) {
    const wA = (7 - i * 0.5) * u
    g.thickLine(X(neck[i - 1][0]), Y(neck[i - 1][1]), X(neck[i][0]), Y(neck[i][1]), wA + 1, bodyD)
    g.thickLine(X(neck[i - 1][0] - 0.4), Y(neck[i - 1][1]), X(neck[i][0] - 0.4), Y(neck[i][1]), wA, body)
    // Belly scutes on the front edge.
    g.thickLine(X(neck[i - 1][0] + 2.2), Y(neck[i - 1][1]), X(neck[i][0] + 2.2), Y(neck[i][1]), Math.max(1, wA * 0.3), belly)
  }
  for (let v = 3; v < 30; v += 4) g.px(Math.round(X(-1 + Math.sin(v) * 0.8)), Math.round(Y(v)), C.gold)
  // Head with an open mouth.
  g.poly(
    [
      [X(-4), Y(30)],
      [X(-3), Y(37)],
      [X(2), Y(39)],
      [X(8), Y(37)],
      [X(10), Y(34.5)],
      [X(5), Y(33)],
      [X(9), Y(30.5)],
      [X(4), Y(28.5)],
    ],
    body,
  )
  g.poly(
    [
      [X(5), Y(33.2)],
      [X(9.6), Y(34.2)],
      [X(8.4), Y(31)],
    ],
    '#e8514a',
  )
  g.px(Math.round(X(8.6)), Math.round(Y(33.6)), '#fffaf0')
  g.line(X(-3), Y(36), X(7), Y(37.3), C.gold)
  g.px(Math.round(X(3)), Math.round(Y(35.5)), C.inkD)
  g.px(Math.round(X(3) - dir), Math.round(Y(35.5)), '#fffaf0')
  return [Math.round(X(-6)), Math.round(Y(43))]
}

export function bakeGrandFacade(s: number, o: { sideTiers?: boolean; night?: boolean } = {}): FacadeInfo {
  const S = (v: number) => Math.round(v * s)
  const side = o.sideTiers !== false
  const W = S(side ? 380 : 262) + 6
  const H = S(342) + 8
  const cx = Math.floor(W / 2)
  const gy = H - 2
  const py = gy - S(28)
  const wt = py - S(84)
  const hw1 = S(118)
  const gh1 = S(148)
  const k = gh1 / hw1
  const th = Math.max(3, S(7))
  const peak1 = wt - gh1
  const d2 = S(24)
  const d3 = S(46)
  const glints: [number, number][] = []
  const perches: [number, number][] = []
  const G = GOLDP
  const lit = o.night ? '#ffd88a' : null

  const raw = bake(W, H, (g) => {
    // --- gable helper: barge board + fill below it (tile or tympanum) ---
    const gable = (pY: number, halfW: number, baseY: number, fill: 'tile' | 'red') => {
      for (let x = cx - halfW; x <= cx + halfW; x++) {
        const dx = Math.abs(x - cx)
        const yTop = Math.round(pY + dx * k)
        if (yTop > baseY) continue
        // Fill below the barge board.
        for (let y = yTop + th; y <= baseY; y++) {
          let c: Color
          if (fill === 'tile') {
            const r = y - yTop - th
            if (r < 2) c = r === 0 ? C.roofEdgeL : C.roofEdge
            else if (r === 2) c = C.roofEdgeD
            else c = (r - 3) % 3 === 2 ? C.roofD : (x % 4 === 0 && y % 2 === 0 ? C.roofD : (r - 3) % 3 === 0 ? C.roofL : C.roof)
          } else c = C.ped
          g.px(x, y, c)
        }
        // Barge board rows.
        for (let r = 0; r < th; r++) {
          const c = r === 0 ? G.l : r === th - 1 ? G.line : r === th - 2 ? G.d : r === 1 ? G.b : (x + r) % 5 === 0 ? G.m : G.b
          g.px(x, yTop + r, c)
        }
      }
      // ใบระกา fins along the top edge.
      const fw = Math.max(2, S(4))
      const fh = Math.max(2, S(5))
      const step = Math.max(3, S(6))
      for (const dir of [-1, 1]) {
        for (let dx = S(10); dx < halfW - S(8); dx += step) {
          const x0 = cx + dir * dx
          const y0 = pY + dx * k
          const x1 = cx + dir * (dx + fw)
          const y1 = pY + (dx + fw) * k
          if (y1 > baseY) break
          g.poly(
            [
              [x0, y0 + 1],
              [x1, y1 - fh],
              [x1, y1 + 1],
            ],
            G.b,
          )
          g.line(x0, y0, x1, y1 - fh, G.l)
          g.px(Math.round(x1), Math.round(y1 - fh), G.d)
        }
      }
    }

    // --- upper tiers (behind) ---
    gable(peak1 - d3, hw1, wt, 'tile')
    gable(peak1 - d2, hw1, wt, 'tile')

    // --- side tiers and galleries ---
    if (side) {
      for (const dir of [-1, 1]) {
        const tier = (xa: number, ya: number, xb: number, yb: number, depth: number) => {
          const x0 = cx + dir * xa
          const x1 = cx + dir * xb
          const n = Math.abs(x1 - x0)
          for (let i = 0; i <= n; i++) {
            const x = x0 + dir * i
            const yT = Math.round(ya + ((yb - ya) * i) / n)
            for (let r = 0; r < depth; r++) {
              let c: Color
              if (r === 0) c = G.b
              else if (r >= depth - 3) c = r === depth - 3 ? C.roofEdgeL : r === depth - 2 ? C.roofEdge : C.roofEdgeD
              else c = (r - 1) % 3 === 2 ? C.roofD : x % 4 === 0 && r % 2 ? C.roofD : C.roof
              g.px(x, yT + r, c)
            }
            g.px(x, yT + depth, G.d)
          }
          const tip = drawHangHong(g, x1, yb + depth, Math.max(3, S(9)), dir)
          glints.push(tip)
          perches.push([Math.round(cx + dir * (xa + xb) * 0.5), Math.round((ya + yb) / 2)])
        }
        // Gallery floor and columns.
        const gfy = gy - S(14)
        g.rect(dir < 0 ? cx - S(176) : cx + S(120), gfy, S(56), S(14), C.wall)
        g.rect(dir < 0 ? cx - S(176) : cx + S(120), gfy, S(56), 1, C.wallL)
        g.rect(dir < 0 ? cx - S(176) : cx + S(120), gy - S(4), S(56), S(4), C.wallD)
        g.rect(dir < 0 ? cx - S(176) : cx + S(120), gy - S(9), S(56), Math.max(1, S(2)), C.ped)
        for (const cxp of [136, 162]) {
          const x = cx + dir * S(cxp) - S(4)
          const topY = wt + S(dir > 0 ? 12 : 12) + S(cxp > 150 ? 22 : 0)
          g.rect(x, topY, S(8), gfy - topY, C.wall)
          g.rect(x + S(6), topY, S(2), gfy - topY, C.wallD)
          g.rect(x - 1, topY, S(8) + 2, Math.max(2, S(4)), G.b)
        }
        // Shaded gallery wall behind the columns.
        g.rect(dir < 0 ? cx - S(150) : cx + S(120), wt + S(12), S(30), gfy - wt - S(12), C.wallS)
        tier(92, wt - S(44), 152, wt + S(2), Math.max(6, S(13)))
        tier(146, wt + S(10), 178, wt + S(26), Math.max(5, S(11)))
      }
    }

    // --- main walls behind the portico ---
    const hw = S(108)
    g.rect(cx - hw, wt, hw * 2, py - wt, C.wallS)
    g.rect(cx - hw, wt, hw * 2, S(10), C.wallD)
    // Door with crown frame.
    const dw = S(30)
    const dTop = py - S(50)
    drawCrownFrame(g, cx, dTop, dw + S(10), S(34))
    g.rect(cx - dw / 2 - S(4), dTop, dw + S(8), py - dTop, G.b)
    g.rect(cx - dw / 2 - S(4), dTop, dw + S(8), 1, G.l)
    g.rect(cx - dw / 2, dTop + S(3), dw, py - dTop - S(3), lit ?? C.ped)
    if (!lit) {
      g.vline(cx, dTop + S(3), py - 1, C.pedDD)
      for (const lx of [cx - dw / 2 + S(2), cx + S(2)]) {
        const lw = dw / 2 - S(4)
        g.frame(lx, dTop + S(6), lw, py - dTop - S(10), G.d)
        // Lozenge lacquer pattern (ลายรดน้ำ).
        for (let yy = dTop + S(9); yy < py - S(6); yy += Math.max(2, S(4)))
          for (let xx = lx + 2; xx < lx + lw - 2; xx += Math.max(2, S(4))) g.px(xx + ((yy / Math.max(2, S(4))) % 2 ? 1 : 0), yy, G.b)
      }
    } else {
      g.rect(cx - S(3), dTop + S(14), S(6), py - dTop - S(18), '#fff3c4')
    }
    // Windows with smaller crowns.
    for (const dir of [-1, 1]) {
      const wx = cx + dir * S(67)
      const ww = S(14)
      const wTop = py - S(46)
      drawCrownFrame(g, wx, wTop, ww + S(6), S(18))
      g.rect(wx - ww / 2 - S(2), wTop, ww + S(4), S(30), G.b)
      g.rect(wx - ww / 2, wTop + S(2), ww, S(26), lit ?? C.ped)
      if (!lit) g.vline(wx, wTop + S(2), wTop + S(27), C.pedDD)
      g.rect(wx - ww / 2 - S(3), wTop + S(30), ww + S(6), Math.max(1, S(2)), G.d)
    }

    // --- portico beam and honeycomb valance ---
    const colXs = [-96, -38, 38, 96].map((v) => cx + S(v))
    const cw = Math.max(4, S(12))
    const beamH = Math.max(3, S(6))
    const bays: [number, number][] = [
      [cx - S(118), colXs[0] - cw / 2],
      [colXs[0] + cw / 2, colXs[1] - cw / 2],
      [colXs[1] + cw / 2, colXs[2] - cw / 2],
      [colXs[2] + cw / 2, colXs[3] - cw / 2],
      [colXs[3] + cw / 2, cx + S(118)],
    ]
    for (const [a, b] of bays) {
      const n = b - a
      for (let x = Math.round(a); x < b; x++) {
        const f = (x - a) / n
        const depth = Math.round(S(3) + S(11) * Math.pow(1 - Math.sin(Math.PI * f), 1.6))
        for (let y = 0; y < depth; y++) g.px(x, wt + beamH + y, (x + y) % 3 === 0 ? G.dd : (x + y) % 2 ? G.b : G.m)
        g.px(x, wt + beamH + depth, x % 2 ? G.l : G.d)
      }
    }
    // Columns.
    for (const x of colXs) {
      const x0 = Math.round(x - cw / 2)
      g.rect(x0, wt + beamH, cw, py - wt - beamH, C.wall)
      g.rect(x0, wt + beamH, 1, py - wt - beamH, C.wallL)
      g.rect(x0 + cw - Math.max(1, S(3)), wt + beamH, Math.max(1, S(3)), py - wt - beamH, C.wallD)
      // Lotus capital (บัวหัวเสา).
      const capH = Math.max(3, S(9))
      for (let y = 0; y < capH; y++) {
        const flare = Math.round((1 - y / capH) * S(3))
        g.hline(x0 - flare, x0 + cw - 1 + flare, wt + beamH + y, y % 3 === 0 ? G.l : y % 3 === 1 ? G.b : G.d)
      }
      for (let px = x0 - S(2); px < x0 + cw + S(2); px += Math.max(2, S(3))) g.px(px, wt + beamH + capH, G.b)
      // Base band.
      g.rect(x0 - 1, py - Math.max(2, S(6)), cw + 2, Math.max(2, S(6)), G.b)
      g.hline(x0 - 1, x0 + cw, py - Math.max(2, S(6)), G.l)
    }
    // Beam.
    g.rect(cx - S(118), wt, S(236), beamH, G.b)
    g.hline(cx - S(118), cx + S(118) - 1, wt, G.l)
    g.hline(cx - S(118), cx + S(118) - 1, wt + beamH - 1, G.dd)
    if (beamH >= 5) {
      g.rect(cx - S(116), wt + 2, S(232), beamH - 4, C.ped)
      for (let x = cx - S(114); x < cx + S(114); x += Math.max(2, S(4))) g.px(x, wt + Math.floor(beamH / 2), G.b)
    }

    // --- front gable with the pediment ---
    gable(peak1, hw1, wt - 1, 'red')
    // Inner gold frame line and shading.
    for (let y = peak1 + th + S(4); y < wt - 1; y++) {
      const half = Math.round((y - peak1) / k) - S(8)
      if (half <= 0) continue
      g.px(cx - half, y, G.d)
      g.px(cx + half, y, G.d)
      // Darker upper pediment.
      if (y < peak1 + th + S(30)) for (let x = cx - half + 1; x < cx + half; x++) if (ditherOn(x, y, 1 - (y - peak1 - th) / S(30))) g.px(x, y, C.pedD)
      // Glass mosaic dots.
      if (y % 3 === 0) for (let x = cx - half + 2; x < cx + half - 1; x += 3) if (h01(x * 31 + y * 17) < 0.35) g.px(x + (y % 2), y, h01(x + y) < 0.5 ? C.glassB : C.glassG)
    }
    // Carved gold: deity medallion and kranok scrolls.
    const my = wt - Math.round(gh1 * 0.36)
    const mr = Math.max(5, S(20))
    drawPedimentDeity(g, cx, my, mr, G, C.ped)
    // Rows of mirrored scrolls filling the pediment around the medallion.
    const rowGap = Math.max(5, S(15))
    for (let ry = wt - S(12); ry > peak1 + th + S(16); ry -= rowGap) {
      const half = (ry - peak1) / k - S(16)
      const step = Math.max(6, S(17))
      const row = Math.round((wt - ry) / rowGap)
      for (let dx = (row % 2 ? step * 0.5 : 0) + S(8); dx < half; dx += step) {
        if (Math.hypot(dx, ry - my) < mr * 1.25) continue
        for (const dir of [-1, 1]) drawScroll(g, cx + dir * dx, ry, Math.max(1.5, S(4.2)), dir, G)
      }
    }
    // Pediment base lintel.
    g.rect(cx - hw1 + S(8), wt - Math.max(2, S(4)), hw1 * 2 - S(16), Math.max(2, S(4)), G.b)
    g.hline(cx - hw1 + S(8), cx + hw1 - S(8), wt - Math.max(2, S(4)), G.l)

    // --- chofas and hang hong ---
    const ch = Math.max(8, S(30))
    glints.push(drawChofa(g, cx, peak1 - d3, ch))
    glints.push(drawChofa(g, cx, peak1 - d2, ch * 0.9))
    glints.push(drawChofa(g, cx, peak1, ch * 0.85))
    for (const dir of [-1, 1]) {
      glints.push(drawHangHong(g, cx + dir * hw1, wt - 1, Math.max(4, S(12)), dir))
      perches.push([cx + dir * Math.round(hw1 * 0.55), Math.round(peak1 + hw1 * 0.55 * k) - 1])
      perches.push([cx + dir * Math.round(hw1 * 0.3), Math.round(peak1 + hw1 * 0.3 * k) - 1])
    }

    // --- plinth (ฐานสิงห์) ---
    const pw = S(124)
    const ph = gy - py
    const bands: [number, Color][] = [
      [0.12, C.wallL],
      [0.2, 'lotusUp'],
      [0.22, C.pedD],
      [0.2, 'lotusDown'],
      [0.26, C.wall],
    ]
    let y = py
    for (const [f, c] of bands) {
      const bh = Math.max(1, Math.round(ph * f))
      if (c === 'lotusUp' || c === 'lotusDown') {
        g.rect(cx - pw, y, pw * 2, bh, C.wall)
        const pet = Math.max(3, S(5))
        for (let x = cx - pw; x < cx + pw; x += pet) {
          for (let r = 0; r < bh; r++) {
            const f2 = c === 'lotusUp' ? r / bh : 1 - r / bh
            const half = Math.round((pet / 2) * Math.sqrt(Math.max(0, f2)))
            g.hline(x + Math.floor(pet / 2) - half, x + Math.floor(pet / 2) + half - 1, y + r, r === 0 && c === 'lotusDown' ? G.d : G.b)
          }
          g.px(x + Math.floor(pet / 2), y + (c === 'lotusUp' ? bh - 1 : 0), G.l)
        }
      } else {
        g.rect(cx - pw, y, pw * 2, bh, c)
        if (c === C.pedD) for (let x = cx - pw + 2; x < cx + pw; x += Math.max(3, S(8))) {
          g.px(x, y + Math.floor(bh / 2), G.b)
          g.px(x - 1, y + Math.floor(bh / 2), G.d)
          g.px(x + 1, y + Math.floor(bh / 2), G.d)
        }
      }
      y += bh
    }
    g.rect(cx - pw, gy - Math.max(1, S(3)), pw * 2, Math.max(1, S(3)), C.wallD)
    g.rect(cx + pw - S(4), py, S(4), ph, 'rgba(58,40,56,0.12)')

    // --- stairs with naga balustrades ---
    const steps = Math.max(4, Math.round(ph / Math.max(3, S(4))))
    for (let i = 0; i < steps; i++) {
      const sy = py + Math.round((ph * i) / steps)
      const sh = Math.round((ph * (i + 1)) / steps) - Math.round((ph * i) / steps)
      const half = S(25) + Math.round((S(7) * i) / steps)
      g.rect(cx - half, sy, half * 2, sh, i % 2 ? C.wallS : C.wall)
      g.hline(cx - half, cx + half - 1, sy, C.wallL)
      g.hline(cx - half, cx + half - 1, sy + sh - 1, C.wallD)
    }
    for (const dir of [-1, 1]) {
      // Body sliding down along the stair side.
      const x0 = cx + dir * S(29)
      const x1 = cx + dir * S(38)
      const bw = Math.max(2, S(5))
      g.thickLine(x0, py - S(2), x1, gy - S(6), bw + 1, C.padDD)
      g.thickLine(x0, py - S(3), x1, gy - S(7), bw, '#4fb06a')
      for (let f = 0.05; f < 1; f += 0.12) g.px(Math.round(x0 + (x1 - x0) * f), Math.round(py - S(4) + (gy - S(7) - py) * f), G.b)
      // Rearing naga head facing outward.
      glints.push(drawNaga(g, x1 + dir * S(3), gy - S(3), Math.max(12, S(40)), dir))
    }
  })
  const out = outlineCanvas(raw, C.ink)
  return {
    canvas: out.canvas,
    cx: cx + 1,
    gy: gy + 1,
    glints: glints.map(([x, y]) => [x + 1, y + 1]),
    perches: perches.map(([x, y]) => [x + 1, y + 1]),
    doorTop: py - S(50) + 1,
    wallTop: wt + 1,
    peak: peak1 + 1,
    top: peak1 - d3 - S(30) + 1,
  }
}

// ---------------------------------------------------------------------------
// Lotus pond

type Pt = [number, number]

function petalPoly(cx: number, cy: number, a: number, L: number, Wp: number, u0: number, u1: number): Pt[] {
  const dx = Math.sin(a)
  const dy = -Math.cos(a)
  const nx = -dy
  const ny = dx
  const left: Pt[] = []
  const right: Pt[] = []
  const n = 10
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n
    const half = Wp * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)), 0.75) * (1 - u * 0.35)
    const px = cx + dx * L * u
    const py = cy + dy * L * u
    left.push([px - nx * half, py - ny * half])
    right.push([px + nx * half, py + ny * half])
  }
  return [...left, ...right.reverse()]
}

function drawPetal(g: Surface, cx: number, cy: number, a: number, L: number, Wp: number, shade: number) {
  const cols = [C.lotusL, C.lotus, C.lotusM, C.lotusD].map((c) => mix(c, C.lotusDD, shade * 0.35))
  g.poly(petalPoly(cx, cy, a, L + 1.2, Wp + 1.1, 0, 1), C.lotusDD)
  g.poly(petalPoly(cx, cy, a, L, Wp, 0, 1), cols[1])
  g.poly(petalPoly(cx, cy, a, L, Wp, 0, 0.35), cols[0])
  g.poly(petalPoly(cx, cy, a, L, Wp * 0.8, 0.62, 1), cols[2])
  g.poly(petalPoly(cx, cy, a, L, Wp * 0.5, 0.82, 1), cols[3])
  // Centre vein highlight.
  const dx = Math.sin(a)
  const dy = -Math.cos(a)
  g.line(cx + dx * L * 0.15, cy + dy * L * 0.15, cx + dx * L * 0.55, cy + dy * L * 0.55, mix(cols[0], '#ffffff', 0.5))
}

/** A lotus flower opening; `open` 0 (bud) → 1 (full bloom); `R` petal length. */
export function drawLotus(g: Surface, cx: number, cy: number, R: number, open: number) {
  const o = Math.max(0, Math.min(1, open))
  // Back petals (behind the centre).
  const back = [-0.55, -0.2, 0.2, 0.55]
  back.forEach((b, i) => drawPetal(g, cx, cy, b * (0.35 + o * 0.9), R * (0.82 + o * 0.1), R * 0.3, 0.6 - i * 0.05))
  // Seed pod and stamens appear as the flower opens.
  if (o > 0.35) {
    const k = (o - 0.35) / 0.65
    g.ellipse(cx, cy - R * 0.28, R * 0.28 * k + 1, R * 0.13 * k + 1, '#e9a53a')
    g.ellipse(cx, cy - R * 0.3, R * 0.24 * k + 0.5, R * 0.1 * k + 0.5, '#c9d86a')
    for (let i = -3; i <= 3; i++) g.px(Math.round(cx + i * R * 0.07 * k), Math.round(cy - R * 0.31), '#8a9a3a')
    for (let i = -4; i <= 4; i++) g.px(Math.round(cx + i * R * 0.085 * k), Math.round(cy - R * 0.2 + Math.abs(i) * 0.3), '#ffe45e')
  }
  // Middle and front petals.
  const mid = [-1, -0.45, 0.45, 1]
  mid.forEach((m) => drawPetal(g, cx, cy, m * (0.2 + o * 0.95), R * (0.9 + o * 0.08), R * 0.34, 0.25))
  const front = [-1, 0, 1]
  front.forEach((f) => drawPetal(g, cx, cy + R * 0.05, f * (0.12 + o * 1.35) + (f === 0 ? 0 : 0), R * (f === 0 ? 0.95 - o * 0.2 : 1), R * 0.36, 0))
  if (o > 0.6) {
    drawPetal(g, cx, cy + R * 0.08, -2.1 * o, R * 0.85, R * 0.3, 0.1)
    drawPetal(g, cx, cy + R * 0.08, 2.1 * o, R * 0.85, R * 0.3, 0.1)
  }
}

/** Lily pad with a notch. */
export function drawPad(g: Surface, cx: number, cy: number, r: number, notch: number) {
  const rr = Math.round(r)
  const na = Math.round(notch * 4) / 4
  const key = `pad:${rr}:${na}`
  let c = padCache.get(key)
  if (!c) {
    const W = rr * 2 + 6
    const H = Math.round(rr * 1.1) + 6
    c = bake(W, H, (p) => {
      const x = W / 2
      const y = H / 2 - 0.5
      const ry = rr * 0.55
      p.ellipse(x, y + 1, rr + 1, ry + 1, C.padDD)
      p.ellipse(x, y, rr, ry, C.pad)
      p.ellipse(x - rr * 0.2, y - ry * 0.2, rr * 0.7, ry * 0.6, mix(C.pad, C.padL, 0.4))
      for (let i = 0; i < 6; i++) {
        const va = na + 0.6 + i * 0.9
        p.line(x, y, x + Math.cos(va) * rr * 0.75, y + Math.sin(va) * ry * 0.75, C.padD)
      }
      p.hline(Math.round(x - rr * 0.5), Math.round(x - rr * 0.1), Math.round(y - ry * 0.6), C.padL)
      // Notch wedge cut out of the leaf.
      p.ctx.globalCompositeOperation = 'destination-out'
      p.poly(
        [
          [x, y],
          [x + Math.cos(na - 0.2) * (rr + 3), y + Math.sin(na - 0.2) * (ry + 3)],
          [x + Math.cos(na + 0.2) * (rr + 3), y + Math.sin(na + 0.2) * (ry + 3)],
        ],
        '#000',
      )
    })
    padCache.set(key, c)
  }
  g.draw(c, Math.round(cx - c.width / 2), Math.round(cy - c.height / 2))
}
const padCache = new Map<string, HTMLCanvasElement>()

const KOI_COATS = [
  { base: '#f58f35', spot: '#fffaf0', fin: '#ffc48a' },
  { base: '#fffaf0', spot: '#e8514a', fin: '#ffe6d6' },
  { base: '#ffd23f', spot: '#f58f35', fin: '#fff1b0' },
  { base: '#e8514a', spot: '#fffaf0', fin: '#ff9f8a' },
]

/** A koi drawn along a heading `a`, body wiggling with time `t`. */
export function drawKoi(g: Surface, x: number, y: number, a: number, t: number, coat: number, len = 14) {
  const k = KOI_COATS[coat % KOI_COATS.length]
  const seg2 = 7
  const pts: Pt[] = []
  for (let i = 0; i < seg2; i++) {
    const f = i / (seg2 - 1)
    const wig = Math.sin(t * 7 - f * 3) * f * 1.6
    const bx = x - Math.cos(a) * len * f + -Math.sin(a) * wig
    const by = y - Math.sin(a) * len * f * 0.6 + Math.cos(a) * wig * 0.6
    pts.push([bx, by])
  }
  // Tail fin.
  const tl = pts[seg2 - 1]
  g.ellipse(tl[0] - Math.cos(a) * 2, tl[1] - Math.sin(a) * 1.2, 2.2, 1.6, k.fin)
  // Pectoral fins.
  g.ellipse(pts[1][0] - Math.sin(a) * 2.5, pts[1][1] + Math.cos(a) * 1.6, 1.6, 1, k.fin)
  g.ellipse(pts[1][0] + Math.sin(a) * 2.5, pts[1][1] - Math.cos(a) * 1.6, 1.6, 1, k.fin)
  for (let i = seg2 - 1; i >= 0; i--) {
    const f = i / (seg2 - 1)
    const r = 2.4 * (1 - f * 0.7) + 0.4
    g.ellipse(pts[i][0], pts[i][1], r, r * 0.75, i === 2 || i === 4 ? k.spot : k.base)
  }
  g.px(Math.round(pts[0][0] + Math.cos(a)), Math.round(pts[0][1] + Math.sin(a) * 0.6), C.inkD)
}

// ---------------------------------------------------------------------------
// Logo

// "บุญดี" set in Mitr SemiBold at 46px, thresholded and hand-cleaned; run
// lengths alternate empty/filled starting with empty.
const LOGO_RLE = [
  '92 7', '92 7', '92 7', '79 20', '78 21', '78 21', '78 21', '78 21', '78 21', '78 20 1', '99', '99', '99',
  '1 7 9 8 10 13 13 8 11 13 6',
  '0 9 7 9 8 17 10 9 9 17 4',
  '0 9 7 9 6 20 9 9 7 20 3',
  '0 9 7 9 4 23 8 9 6 22 2',
  '0 9 7 9 3 25 7 9 5 24 1',
  '0 9 7 9 3 25 7 9 5 24 1',
  '0 9 7 9 3 11 4 11 6 9 4 12 3 11',
  '0 9 7 9 4 9 6 10 6 9 4 10 6 10',
  '0 9 7 9 4 9 7 9 6 9 4 9 8 9',
  '0 9 7 9 4 10 6 9 6 9 3 10 8 9',
  '0 9 7 9 4 10 6 9 6 9 3 9 9 9',
  '0 9 7 9 4 10 6 9 6 9 3 9 9 9',
  '0 9 7 9 4 10 6 9 6 9 3 9 9 9',
  '0 9 7 9 4 10 6 10 4 10 3 9 9 9',
  '0 9 7 9 4 10 6 24 3 9 9 9',
  '0 9 7 9 4 10 7 23 3 10 8 9',
  '0 10 6 9 4 10 7 23 4 9 8 9',
  '0 11 3 11 4 12 6 22 4 10 7 9',
  '1 24 4 13 6 21 4 14 3 9',
  '1 23 5 13 7 20 5 13 3 9',
  '2 22 5 13 10 17 5 13 3 9',
  '3 20 6 13 19 8 6 13 2 9',
  '4 17 9 12 7 3 8 9 7 12 2 9',
  '6 13 11 11 7 20 9 10 3 8 1',
  '48 20 31', '47 20 32', '15 9 23 20 32', '14 11 22 19 33', '14 11 24 15 35', '14 11 28 8 38',
  '14 11 74', '14 11 74', '15 10 74', '18 7 74', '18 7 74', '18 7 74', '18 7 74', '18 6 75',
]

function logoMask(): boolean[][] {
  return LOGO_RLE.map((r) => {
    const row: boolean[] = []
    r.split(' ').forEach((n, i) => {
      for (let k = 0; k < Number(n); k++) row.push(i % 2 === 1)
    })
    while (row.length < 99) row.push(false)
    return row
  })
}

const LATIN: Record<string, string[]> = {
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
}

/** Small spaced "BOONDEE" wordmark. */
export function wordmarkSprite(color: Color = '#fff6e4', outline: Color = C.ink): Sprite {
  return cached(`wordmark:${color}:${outline}`, () => {
    const text = 'BOONDEE'
    const w = text.length * 7 - 2
    const c = bake(w, 7, (g) => {
      ;[...text].forEach((ch, i) => {
        const rows = LATIN[ch]
        rows.forEach((row, y) => {
          for (let x = 0; x < 5; x++) if (row[x] === '#') g.px(i * 7 + x, y, color)
        })
      })
    })
    return outlineCanvas(c, outline, true)
  })
}

export interface LogoArt {
  canvas: HTMLCanvasElement
  w: number
  h: number
}

/** The บุญดี logo: gold gradient, white bevel, extruded base and a plum outline. */
export function logoArt(): LogoArt {
  const s = cached('logo-art', () => {
    const m = logoMask()
    const MW = 99
    const MH = m.length
    const ext = 3
    const pad = 3
    const W = MW + pad * 2
    const H = MH + pad * 2 + ext
    const on = (x: number, y: number) => y >= 0 && y < MH && x >= 0 && x < MW && m[y][x]
    const grad = ramp(['#fff7c8', '#ffe46a', '#ffc93a', '#f7a92c', '#ee8a26'], 12)
    const c = bake(W, H, (g) => {
      for (let d = ext; d >= 1; d--)
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (on(x, y)) g.px(x + pad, y + pad + d, d === ext ? '#8a3f1e' : '#b8581f')
      for (let y = 0; y < MH; y++) {
        const f = Math.min(1, Math.max(0, (y - 12) / 26))
        const base = grad[Math.min(grad.length - 1, Math.floor(f * grad.length))]
        for (let x = 0; x < MW; x++) {
          if (!on(x, y)) continue
          let col = base
          if (!on(x, y - 1)) col = '#ffffff'
          else if (!on(x, y - 2) || !on(x - 1, y)) col = mix(base, '#ffffff', 0.55)
          else if (!on(x, y + 1)) col = '#d9731f'
          else if (!on(x + 1, y)) col = mix(base, '#d9731f', 0.45)
          g.px(x + pad, y + pad, col)
        }
      }
    })
    const o1 = outlineCanvas(c, '#5a2a3a', true)
    const o2 = outlineCanvas(o1.canvas, '#3a1f2e', false)
    return o2
  })
  return { canvas: s.canvas, w: s.w, h: s.h }
}

const shineCache = new Map<string, Surface>()

/** Draw the logo with an optional diagonal shine band at progress `shine` (0..1). */
export function drawLogo(g: Surface, x: number, y: number, shine = -1) {
  const L = logoArt()
  if (shine <= 0 || shine >= 1) {
    g.draw(L.canvas, x, y)
    return
  }
  let t = shineCache.get('s')
  if (!t) {
    t = new Surface(L.w, L.h)
    shineCache.set('s', t)
  }
  t.reset()
  t.clear()
  t.ctx.drawImage(L.canvas, 0, 0)
  t.ctx.globalCompositeOperation = 'source-atop'
  const bx = -30 + shine * (L.w + 60)
  t.ctx.fillStyle = 'rgba(255,255,255,0.75)'
  t.ctx.beginPath()
  t.ctx.moveTo(bx, 0)
  t.ctx.lineTo(bx + 9, 0)
  t.ctx.lineTo(bx - 9, L.h)
  t.ctx.lineTo(bx - 18, L.h)
  t.ctx.closePath()
  t.ctx.fill()
  t.ctx.fillStyle = 'rgba(255,255,255,0.45)'
  t.ctx.fillRect(Math.round(bx + 12), 0, 3, L.h)
  t.ctx.globalCompositeOperation = 'source-over'
  g.draw(t.canvas, x, y)
}

/** Sunburst rays for the logo card. */
export function drawSunburst(g: Surface, cx: number, cy: number, r: number, n: number, rot: number, color: Color, alpha: number) {
  g.ctx.save()
  g.ctx.globalAlpha = alpha
  g.ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2
    const w = Math.PI / n / 1.6
    g.ctx.beginPath()
    g.ctx.moveTo(cx - g.ox, cy - g.oy)
    g.ctx.lineTo(cx - g.ox + Math.cos(a - w) * r, cy - g.oy + Math.sin(a - w) * r)
    g.ctx.lineTo(cx - g.ox + Math.cos(a + w) * r, cy - g.oy + Math.sin(a + w) * r)
    g.ctx.closePath()
    g.ctx.fill()
  }
  g.ctx.restore()
}

// ---------------------------------------------------------------------------
// Vehicles (side view, facing right). Each has a back layer (drawn before the
// passenger) and a front layer (drawn after), plus wheel positions.

export interface Vehicle {
  back: HTMLCanvasElement
  front: HTMLCanvasElement
  w: number
  h: number
  wheels: [number, number, number][]
  /** Where the passenger sprite's top-left goes. */
  seat: [number, number]
  /** Exhaust pipe position. */
  exhaust: [number, number]
}

export function drawWheel(g: Surface, x: number, y: number, r: number, spin: number) {
  g.circle(x, y, r + 0.6, C.inkD)
  g.circle(x, y, r - 0.4, '#3a3040')
  g.circle(x, y, r * 0.5, '#bdb2ae')
  const a = spin
  for (let i = 0; i < 2; i++) {
    const aa = a + (i * Math.PI) / 2
    g.px(Math.round(x + Math.cos(aa) * r * 0.75), Math.round(y + Math.sin(aa) * r * 0.75), '#6a6070')
    g.px(Math.round(x - Math.cos(aa) * r * 0.75), Math.round(y - Math.sin(aa) * r * 0.75), '#6a6070')
  }
  g.px(Math.round(x), Math.round(y), '#fffaf0')
}

const vehicles = new Map<string, Vehicle>()
function vcached(key: string, build: () => Vehicle): Vehicle {
  let v = vehicles.get(key)
  if (!v) {
    v = build()
    vehicles.set(key, v)
  }
  return v
}

export function tukTuk(): Vehicle {
  return vcached('tuktuk', () => {
    const W = 46
    const H = 30
    const body = '#3d7fd8'
    const bodyD = '#2a5aa8'
    const bodyL = '#8fc0ff'
    const back = bake(W, H, (g) => {
      // Canopy and posts.
      g.rect(1, 2, 38, 4, '#e8514a')
      g.hline(1, 38, 2, '#ff8a7a')
      g.hline(1, 38, 4, '#fffaf0')
      for (let x = 1; x < 39; x += 2) g.px(x, 6, '#e8514a')
      g.vline(2, 6, 18, '#6a6478')
      g.vline(26, 6, 18, '#6a6478')
      g.vline(37, 6, 14, '#6a6478')
      // Rear bench.
      g.rect(3, 9, 5, 10, '#7e2436')
      g.rect(3, 9, 5, 1, '#b8343f')
      // Driver.
      g.rect(30, 12, 6, 7, '#fffaf0')
      g.circle(33, 9.5, 3, '#cf9163')
      g.rect(30, 6, 7, 3, '#3b2f40')
      g.px(35, 10, C.inkD)
      // Windscreen.
      g.line(38, 6, 42, 14, '#bfe3ff')
    })
    const front = bake(W, H, (g) => {
      // Passenger panel and cab.
      g.poly(
        [
          [1, 17],
          [28, 17],
          [30, 15],
          [41, 15],
          [44, 19],
          [44, 24],
          [1, 24],
        ],
        body,
      )
      g.hline(1, 28, 17, bodyL)
      g.line(29, 16, 30, 15, bodyL)
      g.hline(30, 41, 15, bodyL)
      g.rect(1, 22, 43, 2, bodyD)
      g.rect(3, 19, 22, 1, '#ffd54f')
      g.rect(30, 18, 12, 1, '#ffd54f')
      // Chrome, headlight, fenders.
      g.rect(42, 17, 3, 3, '#fff6c8')
      g.rect(0, 20, 2, 3, '#e4ddd6')
      g.ellipse(9, 22, 6, 3, bodyD)
      g.ellipse(38, 22, 5.5, 3, bodyD)
      // Flower garland on the front.
      g.px(40, 14, '#ffd23f')
      g.px(41, 13, '#f58f35')
      g.px(39, 13, '#fffaf0')
    })
    return {
      back: outlineCanvas(back, C.ink).canvas,
      front: outlineCanvas(front, C.ink).canvas,
      w: W + 2,
      h: H + 2,
      wheels: [
        [10, 25, 4.5],
        [39, 25, 4.5],
      ],
      seat: [9, 2],
      exhaust: [1, 23],
    }
  })
}

export function songthaew(): Vehicle {
  return vcached('songthaew', () => {
    const W = 62
    const H = 32
    const red = '#d9453e'
    const redD = '#a8323a'
    const redL = '#ff8a7a'
    const back = bake(W, H, (g) => {
      g.rect(2, 5, 40, 17, '#5a2a3a')
      g.rect(4, 14, 36, 3, '#7e2436')
      g.rect(46, 8, 10, 7, '#3b2f40')
      g.circle(50, 11, 2.5, '#cf9163')
    })
    const front = bake(W, H, (g) => {
      // Roof over the bed.
      g.rect(1, 2, 42, 4, red)
      g.hline(1, 42, 2, redL)
      g.rect(1, 5, 42, 1, redD)
      // Bed walls with open windows.
      g.rect(1, 6, 42, 19, red)
      g.ctx.clearRect(4, 8, 36, 8)
      for (let x = 12; x < 40; x += 9) g.vline(x, 8, 15, redD)
      g.hline(4, 39, 8, redD)
      g.rect(1, 17, 42, 1, redL)
      g.rect(1, 23, 42, 2, redD)
      // Cab.
      g.poly(
        [
          [43, 6],
          [54, 6],
          [60, 14],
          [61, 24],
          [43, 24],
        ],
        red,
      )
      g.ctx.clearRect(46, 8, 8, 6)
      g.line(54, 7, 58, 13, '#bfe3ff')
      g.hline(43, 54, 6, redL)
      g.rect(43, 23, 18, 2, redD)
      g.rect(58, 17, 3, 3, '#fff6c8')
      g.rect(0, 20, 2, 4, '#e4ddd6')
      g.ellipse(14, 23, 6.5, 3, redD)
      g.ellipse(50, 23, 6.5, 3, redD)
      // Route sign on the roof.
      g.rect(14, 0, 16, 2, '#fffaf0')
      g.hline(16, 27, 1, '#3d63b5')
    })
    return {
      back: outlineCanvas(back, C.ink).canvas,
      front: outlineCanvas(front, C.ink).canvas,
      w: W + 2,
      h: H + 2,
      wheels: [
        [15, 26, 5],
        [51, 26, 5],
      ],
      seat: [22, -1],
      exhaust: [1, 24],
    }
  })
}

export function longtail(): Vehicle {
  return vcached('longtail', () => {
    const b = longtailSprite()
    const back = bake(b.w, b.h + 6, () => undefined)
    const front = bake(b.w, b.h + 6, (g) => g.draw(b.canvas, 0, 6))
    return { back, front, w: b.w, h: b.h + 6, wheels: [], seat: [22, 2], exhaust: [3, 12] }
  })
}

// ---------------------------------------------------------------------------
// Departure sets

/** A friendly low-rise condo with a glass lobby. Returns canvas + door rect. */
export function bakeCondo(w: number, gy: number, seed: number): { canvas: HTMLCanvasElement; door: [number, number, number, number] } {
  const r = seeded(seed)
  const cx = Math.round(w * 0.3)
  const bw = 64
  const x0 = cx - bw / 2
  const top = gy - 150
  const door: [number, number, number, number] = [cx - 9, gy - 26, 18, 26]
  const canvas = bake(w, gy + 2, (g) => {
    // Neighbouring shophouses.
    let x = -8
    let v = 1
    while (x < w) {
      if (x + 30 > x0 - 2 && x < x0 + bw + 2) {
        x = x0 + bw + 2
        continue
      }
      drawShophouse(g, x, gy, 28, v++, r)
      x += 28
    }
    // Tower.
    g.rect(x0, top, bw, gy - top, '#ece6f0')
    g.rect(x0 + bw - 6, top, 6, gy - top, '#cfc6d8')
    g.rect(x0, top, bw, 3, '#fffaf0')
    for (let y = top + 8; y < gy - 34; y += 14) {
      // Balcony with glass rail and a little plant.
      g.rect(x0 + 4, y, bw - 12, 9, '#9fc4e0')
      g.rect(x0 + 4, y, bw - 12, 3, '#c8e2f2')
      g.vline(x0 + bw / 2 - 2, y, y + 8, '#cfc6d8')
      g.rect(x0 + 2, y + 9, bw - 8, 2, '#fffaf0')
      g.rect(x0 + 3, y + 6, bw - 10, 3, 'rgba(210,240,255,0.7)')
      g.hline(x0 + 3, x0 + bw - 8, y + 6, '#fffaf0')
      if (r() < 0.6) {
        const px = x0 + 6 + Math.floor(r() * (bw - 20))
        g.circle(px, y + 5, 2.5, P.leaf)
        g.px(px, y + 3, '#ff9fc0')
      }
      if (r() < 0.5) g.rect(x0 + bw - 14, y + 1, 5, 4, '#f4f2f6')
    }
    // Lobby canopy, glass doors and sign.
    g.rect(x0 - 2, gy - 34, bw + 4, 4, '#8a7a90')
    g.hline(x0 - 2, x0 + bw + 1, gy - 34, '#b8aabe')
    g.rect(x0 + 4, gy - 30, bw - 8, 30, '#6a8aa8')
    g.rect(x0 + 4, gy - 30, bw - 8, 2, '#4a6a88')
    g.rect(cx - 14, gy - 42, 28, 6, '#3a2838')
    for (let k = 0; k < 6; k++) g.rect(cx - 11 + k * 4, gy - 40, 2, 2, '#ffd54f')
    // Plants by the entrance.
    for (const px of [x0 + 8, x0 + bw - 10]) {
      g.rect(px - 3, gy - 6, 6, 6, '#c9683a')
      g.circle(px, gy - 10, 5, P.leafD)
      g.circle(px - 1, gy - 11, 3.5, P.leaf)
    }
  })
  return { canvas, door }
}

/** Glass sliding doors, `open` 0..1. */
export function drawGlassDoors(g: Surface, x: number, y: number, w: number, h: number, open: number) {
  g.rect(x, y, w, h, '#fff1c4')
  softGlow(g, x + w / 2, y + h / 2, w, 0.6, '#ffe7a8')
  const half = w / 2
  const slide = Math.round(open * (half - 1))
  for (const dir of [-1, 1]) {
    const px = dir < 0 ? x - slide : x + half + slide
    g.rect(px, y, half, h, '#a8d0ec')
    g.rect(px, y, half, 1, '#dff1ff')
    g.line(px + 2, y + h - 4, px + half - 3, y + 3, '#dff1ff')
    g.vline(dir < 0 ? px + half - 1 : px, y, y + h - 1, '#6a8aa8')
  }
  g.frame(x - 1, y - 1, w + 2, h + 1, '#4a6a88')
}

/** Wooden river pier with a pavilion roof and a sign. */
export function bakePier(w: number, gy: number): HTMLCanvasElement {
  return bake(w, gy + 12, (g) => {
    // Pavilion.
    const px = Math.round(w * 0.3)
    g.rect(px - 30, gy - 34, 60, 3, '#e8514a')
    g.poly(
      [
        [px - 34, gy - 32],
        [px - 22, gy - 46],
        [px + 22, gy - 46],
        [px + 34, gy - 32],
      ],
      '#f08a3a',
    )
    for (let yy = gy - 44; yy < gy - 32; yy += 3) g.hline(px - 30 + (gy - 32 - yy), px + 30 - (gy - 32 - yy), yy, '#c9602a')
    g.hline(px - 34, px + 34, gy - 32, '#3f9a6b')
    for (const x of [px - 26, px - 8, px + 8, px + 26]) {
      g.rect(x - 1, gy - 31, 3, 31, '#9a6a45')
      g.px(x, gy - 31, '#c28e5c')
    }
    // Sign.
    g.rect(px - 12, gy - 29, 24, 5, '#2f6f4b')
    for (let k = 0; k < 8; k++) g.px(px - 10 + k * 3, gy - 27, '#fffaf0')
    // Deck planks over the water.
    g.rect(0, gy, w, 4, '#b07a52')
    for (let x = 0; x < w; x += 5) g.vline(x, gy, gy + 3, '#8a5a3a')
    g.hline(0, w - 1, gy, '#d9a57a')
    for (let x = 4; x < w; x += 22) g.rect(x, gy + 4, 3, 8, '#6a4230')
  })
}

// ---------------------------------------------------------------------------
// Ride strips

/** White temple wall with a red coping and golden flame spikes on each pier. */
export function drawTempleWall(g: Surface, x0: number, x1: number, gy: number, h: number) {
  g.rect(x0, gy - h, x1 - x0, h, C.wall)
  g.rect(x0, gy - h, x1 - x0, 2, C.ped)
  g.hline(x0, x1 - 1, gy - h, '#ff8a7a')
  g.hline(x0, x1 - 1, gy - h + 2, C.gold)
  g.rect(x0, gy - 3, x1 - x0, 3, C.wallD)
  for (let x = x0 + 4; x < x1 - 4; x += 16) {
    // Pier with an inset panel.
    g.rect(x, gy - h - 2, 6, h + 2, C.wall)
    g.rect(x + 5, gy - h - 2, 1, h + 2, C.wallD)
    g.rect(x + 1, gy - h + 5, 4, h - 10, C.wallS)
    // Gold flame spike (บัวยอดเสา).
    g.poly(
      [
        [x - 0.5, gy - h - 2],
        [x + 3, gy - h - 11],
        [x + 6.5, gy - h - 2],
      ],
      C.gold,
    )
    g.vline(x + 2, gy - h - 8, gy - h - 3, C.goldL)
    g.hline(x - 1, x + 6, gy - h - 2, C.goldD)
    g.px(x + 3, gy - h - 12, C.goldL)
  }
}

/** Distant blue mountain ridges. */
export function bakeMountains(w: number, h: number, baseY: number, seed: number, col: Color, colL: Color, amp: number): HTMLCanvasElement {
  const r = seeded(seed)
  const peaks: [number, number][] = []
  for (let x = -20; x < w + 40; x += 18 + r() * 26) peaks.push([x, baseY - amp * (0.4 + r() * 0.6)])
  return bake(w, h, (g) => {
    for (let x = 0; x < w; x++) {
      let y = baseY
      for (let i = 0; i + 1 < peaks.length; i++) {
        const [ax, ay] = peaks[i]
        const [bx, by] = peaks[i + 1]
        if (x >= ax && x < bx) {
          const f = (x - ax) / (bx - ax)
          y = ay + (by - ay) * (0.5 - Math.cos(f * Math.PI) / 2)
        }
      }
      g.vline(x, Math.round(y), h, col)
      g.px(x, Math.round(y), colL)
    }
  })
}

/** Simple pine for mountain scenes. */
export function drawPine(g: Surface, x: number, gy: number, h: number, dark: Color, light: Color) {
  g.rect(x - 1, gy - h * 0.2, 2, h * 0.2, '#6a4a3a')
  for (let i = 0; i < 4; i++) {
    const ty = gy - h * 0.15 - i * h * 0.2
    const hw = h * 0.28 * (1 - i * 0.18)
    g.poly(
      [
        [x - hw, ty],
        [x, ty - h * 0.34],
        [x + hw, ty],
      ],
      dark,
    )
    g.poly(
      [
        [x - hw * 0.7, ty - 1],
        [x, ty - h * 0.3],
        [x, ty - 1],
      ],
      light,
    )
  }
}

/** Wooden stilt house on the river bank. */
export function drawStiltHouse(g: Surface, x: number, gy: number, w: number, v: number) {
  const wall = ['#c28e5c', '#b07a52', '#d9a57a'][v % 3]
  const roof = ['#b8343f', '#6a5a70', '#3d63b5'][v % 3]
  for (let px = x + 2; px < x + w; px += 6) g.rect(px, gy - 10, 2, 12, '#6e4a35')
  g.rect(x, gy - 30, w, 20, wall)
  for (let px = x + 2; px < x + w; px += 3) g.vline(px, gy - 30, gy - 11, mix(wall, '#3a2838', 0.2))
  g.rect(x + 4, gy - 25, 7, 7, '#5d3f44')
  g.rect(x + w - 12, gy - 25, 7, 7, '#5d3f44')
  g.px(x + 7, gy - 22, '#ffd98a')
  g.poly(
    [
      [x - 3, gy - 30],
      [x + w / 2, gy - 42],
      [x + w + 3, gy - 30],
    ],
    roof,
  )
  g.hline(x - 3, x + w + 2, gy - 30, mix(roof, '#000000', 0.25))
  g.rect(x - 2, gy - 12, w + 4, 2, '#8a5a3a')
  if (v % 2 === 0) {
    g.rect(x + w - 6, gy - 16, 4, 4, '#e8514a')
    g.rect(x + w - 6, gy - 16, 4, 1, '#ff8a7a')
  }
}

// ---------------------------------------------------------------------------
// Temple gate and guardians

/** Yaksha guardian (ยักษ์วัด) standing with a club. `h` is total height. */
export function drawYaksha(g: Surface, cx: number, gy: number, h: number, skin: Color, dir: number) {
  const u = h / 64
  const X = (v: number) => cx + dir * v * u
  const Y = (v: number) => gy - v * u
  const skinD = mix(skin, '#1a1030', 0.3)
  const gold = C.gold
  const goldD = C.goldD
  const red = C.ped
  const R = (x0: number, y0: number, x1: number, y1: number, c: Color) =>
    g.rect(Math.round(Math.min(X(x0), X(x1))), Math.round(Y(y1)), Math.max(1, Math.round(Math.abs(X(x1) - X(x0)))), Math.max(1, Math.round(Y(y0) - Y(y1))), c)
  // Plinth.
  R(-12, -2, 12, 3, C.wallS)
  R(-12, 2, 12, 3, C.gold)
  // Legs in a wide stance.
  g.poly(
    [
      [X(-9), Y(3)],
      [X(-6), Y(18)],
      [X(-2), Y(18)],
      [X(-4), Y(3)],
    ],
    skin,
  )
  g.poly(
    [
      [X(9), Y(3)],
      [X(6), Y(18)],
      [X(2), Y(18)],
      [X(4), Y(3)],
    ],
    skinD,
  )
  R(-10, 3, -3, 5, gold)
  R(3, 3, 10, 5, gold)
  // Patterned lower garment.
  g.poly(
    [
      [X(-9), Y(17)],
      [X(-8), Y(30)],
      [X(8), Y(30)],
      [X(9), Y(17)],
    ],
    red,
  )
  for (let v = 19; v < 30; v += 3) for (let k = -7; k <= 7; k += 3) g.px(Math.round(X(k)), Math.round(Y(v)), gold)
  R(-9, 16, 9, 18, gold)
  // Armoured torso.
  g.poly(
    [
      [X(-8), Y(30)],
      [X(-9), Y(42)],
      [X(9), Y(42)],
      [X(8), Y(30)],
    ],
    gold,
  )
  g.poly(
    [
      [X(-5), Y(31)],
      [X(-6), Y(40)],
      [X(6), Y(40)],
      [X(5), Y(31)],
    ],
    goldD,
  )
  g.circle(X(0), Y(36), Math.max(1, 1.6 * u), red)
  R(-11, 40, 11, 43, gold)
  // Arms resting on the club.
  g.thickLine(X(-9), Y(41), X(-4), Y(31), Math.max(2, 3.2 * u), skin)
  g.thickLine(X(9), Y(41), X(4), Y(31), Math.max(2, 3.2 * u), skinD)
  // Club.
  R(-1, 3, 1, 32, '#8a3a2a')
  R(-2, 30, 2, 34, gold)
  g.circle(X(0), Y(32), Math.max(1.5, 2.6 * u), skin)
  // Head: bulging eyes and fangs.
  g.circle(X(0), Y(48), 6 * u, skin)
  g.rect(Math.round(X(-6)), Math.round(Y(48)), Math.round(12 * u), Math.round(3 * u), skin)
  for (const e of [-2.6, 2.6]) {
    g.circle(X(e), Y(49), Math.max(1, 1.8 * u), '#fffaf0')
    g.px(Math.round(X(e)), Math.round(Y(49)), C.inkD)
  }
  g.hline(Math.round(X(-3)), Math.round(X(3)), Math.round(Y(45)), '#7e2436')
  g.px(Math.round(X(-3)), Math.round(Y(45)) - 1, '#fffaf0')
  g.px(Math.round(X(3)), Math.round(Y(45)) - 1, '#fffaf0')
  R(-7, 50, -5, 54, gold)
  R(5, 50, 7, 54, gold)
  // Tall tiered crown (ชฎา).
  R(-6, 53, 6, 55, gold)
  for (let i = 0; i < 5; i++) {
    const hw = 5 - i
    R(-hw, 55 + i * 2, hw, 57 + i * 2, i % 2 ? goldD : gold)
  }
  g.thickLine(X(0), Y(65), X(0), Y(74), Math.max(1, 1.4 * u), gold)
  g.px(Math.round(X(0)), Math.round(Y(75)), C.goldL)
  g.px(Math.round(X(-3)), Math.round(Y(56)), '#62d0a0')
  g.px(Math.round(X(3)), Math.round(Y(56)), '#62d0a0')
}

/** Ornate temple gate (ซุ้มประตู). Returns doorway rect for see-through / doors. */
export function bakeGate(k: number): { canvas: HTMLCanvasElement; cx: number; gy: number; door: [number, number, number, number]; tip: [number, number] } {
  const S = (v: number) => Math.round(v * k)
  const W = S(110) + 4
  const H = S(150) + 4
  const cx = Math.floor(W / 2)
  const gy = H - 2
  const dw = S(40)
  const dh = S(62)
  const door: [number, number, number, number] = [cx - dw / 2, gy - dh, dw, dh]
  let tip: [number, number] = [cx, 0]
  const raw = bake(W, H, (g) => {
    // Pillars and wall mass.
    g.rect(cx - S(48), gy - S(80), S(96), S(80), C.wall)
    g.rect(cx + S(40), gy - S(80), S(8), S(80), C.wallD)
    for (const dx of [-44, 32]) {
      g.rect(cx + S(dx), gy - S(76), S(12), S(72), C.wallS)
      g.rect(cx + S(dx) + S(2), gy - S(70), S(8), S(56), C.wall)
      g.rect(cx + S(dx) + S(4), gy - S(56), S(4), S(12), C.gold)
    }
    g.rect(cx - S(50), gy - S(6), S(100), S(6), C.wallD)
    g.rect(cx - S(50), gy - S(9), S(100), Math.max(1, S(3)), C.ped)
    // Lintel.
    g.rect(cx - S(52), gy - S(86), S(104), S(8), C.gold)
    g.hline(cx - S(52), cx + S(52) - 1, gy - S(86), C.goldL)
    g.rect(cx - S(50), gy - S(83), S(100), S(3), C.ped)
    for (let x = cx - S(48); x < cx + S(48); x += Math.max(2, S(4))) g.px(x, gy - S(82), C.gold)
    // Crown spire.
    drawCrownFrame(g, cx, gy - S(86), S(80), S(64))
    tip = [cx, gy - S(150)]
    // Arch frame around the doorway.
    g.rect(door[0] - S(4), door[1] - S(4), dw + S(8), dh + S(4), C.gold)
    g.poly(
      [
        [door[0] - S(4), door[1] - S(3)],
        [cx, door[1] - S(16)],
        [door[0] + dw + S(4), door[1] - S(3)],
      ],
      C.gold,
    )
    g.hline(door[0] - S(4), door[0] + dw + S(3), door[1] - S(4), C.goldL)
    // Doorway is cut out so the courtyard shows through.
    g.ctx.clearRect(door[0], door[1], dw, dh)
    g.ctx.globalCompositeOperation = 'destination-out'
    g.poly(
      [
        [door[0], door[1] + 1],
        [cx, door[1] - S(10)],
        [door[0] + dw, door[1] + 1],
      ],
      '#000',
    )
    g.ctx.globalCompositeOperation = 'source-over'
  })
  const out = outlineCanvas(raw, C.ink)
  return { canvas: out.canvas, cx: cx + 1, gy: gy + 1, door: [door[0] + 1, door[1] + 1, dw, dh], tip: [tip[0] + 1, tip[1] + 1] }
}

/** Red-and-gold gate doors, `open` 0..1 (they swing inward and narrow). */
export function drawGateDoors(g: Surface, x: number, y: number, w: number, h: number, open: number) {
  const half = w / 2
  const leaf = Math.max(0, Math.round(half * (1 - open)))
  if (leaf <= 0) return
  for (const dir of [-1, 1]) {
    const lx = dir < 0 ? x : x + w - leaf
    g.rect(lx, y, leaf, h, C.ped)
    g.frame(lx, y, leaf, h, C.goldD)
    if (leaf > 6) {
      g.frame(lx + 2, y + 3, leaf - 4, h - 6, C.gold)
      for (let yy = y + 6; yy < y + h - 5; yy += 4) for (let xx = lx + 4; xx < lx + leaf - 3; xx += 4) g.px(xx + ((yy >> 2) % 2 ? 1 : 0), yy, C.gold)
    }
  }
}

