// Bangkok group – ศาลท้าวมหาพรหม เอราวัณ (Erawan Shrine) at Ratchaprasong:
// the golden four-faced Brahma in its glittering pavilion, marigold heaps and
// wooden elephants, Thai classical dancers, the BTS skytrain overhead, the
// malls with LED screens and the rainbow of Bangkok taxis.

import { mix, type Color, type Surface } from '../../engine/pixel'
import { cached, type Sprite } from '../../engine/sprite'
import { bake } from '../../engine/pixel'
import { outlineCanvas } from '../../engine/sprite'
import { P } from '../palette'
import { GOLD, type Building, type Pt } from '../temple'
import type { Prop } from '../props'
import { bbuild, bprop, BK, hsh } from './bangkok'
import { GOLD5, WHITE5, litRow, squareTier, ringStack, spire, mosaicColumn } from './bangkok-arch'

// ---------------------------------------------------------------------------
// The four-faced Brahma (พระพรหมสี่หน้า) – golden, seated, eight arms.

export function drawBrahma(g: Surface, cx: number, baseY: number) {
  const G = GOLD
  // Lotus pedestal.
  for (let i = 0; i < 5; i++) litRow(g, cx, baseY - i, 12 - i * 0.6, GOLD5, { bias: i === 2 ? 1 : 0 })
  for (let x = cx - 11; x <= cx + 11; x += 3) {
    g.px(x, baseY - 2, '#ff9fc0')
    g.px(x, baseY - 3, '#ffd6e0')
  }
  const y0 = baseY - 5
  // Crossed legs.
  g.ellipse(cx, y0 - 3, 11, 3.5, G.d)
  g.ellipse(cx - 1, y0 - 4, 9, 2.5, G.b)
  // Body.
  for (let y = y0 - 18; y < y0 - 5; y++) litRow(g, cx, y, 5.5 - (y < y0 - 14 ? 0 : 0.5), GOLD5)
  g.rect(cx - 5, y0 - 11, 10, 2, BK.red)
  g.px(cx - 1, y0 - 12, '#62d0a0')
  // Eight arms fanned out holding sceptre, lotus, conch, rosary, book…
  const arms: [number, number, Color][] = [
    [-11, -19, BK.red],
    [-13, -14, '#fffaf0'],
    [-12, -9, '#5a8de0'],
    [-8, -6, G.l],
    [11, -19, '#3fae6a'],
    [13, -14, '#fffaf0'],
    [12, -9, '#e8709e'],
    [8, -6, G.l],
  ]
  for (const [ax, ay, c] of arms) {
    g.line(cx + Math.sign(ax) * 4, y0 - 15, cx + ax, y0 + ay, G.d)
    g.px(cx + ax, y0 + ay, G.b)
    g.px(cx + ax + Math.sign(ax), y0 + ay - 1, c)
  }
  // Three visible faces (the fourth looks away) and their crowns.
  for (const [dx, r, c] of [
    [-6, 2.6, G.d],
    [6, 2.6, G.d],
    [0, 3.4, G.b],
  ] as [number, number, Color][]) {
    const fy = y0 - 22
    g.ellipse(cx + dx, fy, r, r + 0.4, c)
    g.px(cx + dx - 1, fy, G.DD)
    g.px(cx + dx + 1, fy, G.DD)
    if (dx === 0) g.hline(cx - 1, cx + 1, fy + 2, G.D)
    const ch = dx === 0 ? 11 : 7
    for (let i = 0; i < ch; i++) {
      const hw = Math.max(0.5, (dx === 0 ? 3.2 : 2.2) - i * 0.28)
      g.rect(Math.round(cx + dx - hw), fy - r - 1 - i, Math.max(1, Math.round(hw * 2)), 1, i % 3 === 0 ? G.D : G.b)
    }
    g.px(cx + dx, fy - r - ch - 1, G.L)
  }
}

/** The Erawan shrine pavilion with Brahma inside, on its marble platform. */
export function brahmaShrine(): Building {
  const W = 96
  const H = 128
  return bbuild('era:shrine', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    // Marble platform with a low gilded rail.
    squareTier(g, cx, H - 12, 12, 46, WHITE5, GOLD.d)
    for (let x = 4; x < W - 4; x += 5) {
      g.rect(x, H - 18, 2, 6, GOLD.b)
      g.px(x, H - 19, GOLD.L)
    }
    g.hline(3, W - 4, H - 18, GOLD.d)
    // Pavilion floor.
    squareTier(g, cx, H - 20, 6, 30, GOLD5, BK.redD)
    // Four gilded columns and the sanctum.
    const floor = H - 20
    const top = floor - 44
    g.rect(cx - 26, top, 52, 44, '#7e2436')
    for (let y = top + 2; y < floor; y += 4) for (let x = cx - 24; x < cx + 24; x += 4) g.px(x + ((y >> 2) % 2) * 2, y, GOLD.D)
    drawBrahma(g, cx, floor - 2)
    for (const x of [cx - 28, cx - 18, cx + 15, cx + 25]) mosaicColumn(g, x, top, floor, 3, ['#5ab8e8', '#e8514a', '#62d0a0'])
    // Garland swags between the columns.
    for (let x = cx - 24; x < cx + 24; x++) {
      const k = (x - cx + 24) % 12
      const sag = Math.round(Math.sin((k / 12) * Math.PI) * 4)
      g.px(x, top + 4 + sag, x % 2 ? '#f58f35' : '#ffd23f')
    }
    // Ornate gable and stepped spire (the pavilion is gilded all over).
    g.poly(
      [
        [cx - 34, top + 1],
        [cx, top - 24],
        [cx + 34, top + 1],
      ],
      GOLD.d,
    )
    g.poly(
      [
        [cx - 28, top - 1],
        [cx, top - 19],
        [cx + 28, top - 1],
      ],
      '#2f4fa8',
    )
    for (let y = top - 16; y < top - 1; y += 2) for (let x = cx - 24; x < cx + 24; x += 3) if (Math.abs(x - cx) < ((y - (top - 19)) / 18) * 26) g.px(x + ((y >> 1) % 2), y, (x + y) % 5 ? GOLD.b : '#8fb6ff')
    g.ellipse(cx, top - 8, 4, 3, GOLD.l)
    g.px(cx, top - 8, BK.red)
    for (const s of [-1, 1]) {
      g.line(cx, top - 24, cx + s * 34, top + 1, GOLD.l)
      g.px(cx + s * 35, top + 2, GOLD.b)
      g.px(cx + s * 36, top, GOLD.l)
    }
    let y = top - 22
    for (let i = 0; i < 6; i++) {
      const half = 18 - i * 2.5
      for (let k = 0; k < 4; k++) litRow(g, cx, y - k, half - k * 0.4, GOLD5, { tiles: true })
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      for (const s of [-1, 1]) {
        g.px(Math.round(cx + s * half), y - 4, GOLD.L)
        g.px(Math.round(cx + s * (half + 1)), y - 5, GOLD.b)
      }
      glints.push({ x: Math.round(cx - half), y: y - 4 })
      y -= 4
    }
    y = ringStack(g, cx, y, 4, 3, 1.2, GOLD5, 2)
    const tip = spire(g, cx, y, 10, 1.3, GOLD5)
    glints.push(tip, { x: cx - 4, y: floor - 30 })
    hooks.glints = glints
    hooks.brahma = [{ x: cx, y: floor - 20 }]
    hooks.bells = [
      { x: cx - 36, y: top + 3 },
      { x: cx + 36, y: top + 3 },
    ]
  })
}

/** Heap of marigold and jasmine garlands left as offerings (baked decal). */
export function garlandHeap(g: Surface, cx: number, cy: number, w: number, seed = 0) {
  for (let i = 0; i < w * 1.4; i++) {
    const x = cx + (hsh(i, seed) - 0.5) * w
    const y = cy + (hsh(seed, i) - 0.5) * w * 0.35
    const c = ['#f58f35', '#ffbb66', '#ffd23f', '#fffaf0', '#e8514a'][Math.floor(hsh(i, seed, 2) * 5)]
    g.ellipse(x, y, 2.6, 1.6, mix(c, '#3a2838', 0.2))
    g.ellipse(x, y - 0.5, 2.2, 1.2, c)
    g.px(Math.round(x), Math.round(y) - 1, '#b05a1a')
  }
}

// ---------------------------------------------------------------------------
// Thai classical dancers (นางรำ) – four animation frames.

export type DancerFrame = 0 | 1 | 2 | 3

export function dancerSprite(frame: DancerFrame, variant = 0, flip = false): Sprite {
  return cached(`bk:dancer:${frame}:${variant}:${flip ? 1 : 0}`, () => {
    const W = 20
    const H = 34
    const cloth = (['#e8514a', '#3fae6a', '#e8709e', '#5a8de0'] as Color[])[variant % 4]
    const clothD = mix(cloth, '#3a2838', 0.35)
    const skin = (['#f6c9a0', '#f0bd90', '#e8b080'] as Color[])[variant % 3]
    const skinD = mix(skin, '#8a5a3a', 0.3)
    const c = bake(W, H, (g) => {
      const cx = 10
      const lift = frame === 1 || frame === 3 ? 1 : 0
      // Legs and feet (one lifted in frames 1 & 3).
      g.rect(cx - 3, H - 6, 2, 5, skin)
      if (lift) {
        g.line(cx + 2, H - 9, cx + 5, H - 6, skin)
        g.line(cx + 5, H - 6, cx + 4, H - 3, skin)
      } else g.rect(cx + 1, H - 6, 2, 5, skin)
      g.hline(cx - 4, cx - 1, H - 1, skinD)
      if (!lift) g.hline(cx + 1, cx + 4, H - 1, skinD)
      // Pha nung (wrapped skirt) with a gold hem.
      for (let y = H - 14; y < H - 5; y++) {
        const hw = 4 - (y > H - 8 ? 1 : 0)
        g.rect(cx - hw, y, hw * 2 + (lift ? 1 : 0), 1, y % 3 ? cloth : clothD)
      }
      g.hline(cx - 4, cx + 3, H - 14, GOLD.b)
      g.hline(cx - 3, cx + 3, H - 6, GOLD.b)
      // Hanging front flap (ชายไหว).
      g.rect(cx - 1, H - 14, 2, 8, GOLD.d)
      // Bodice with gold collar (สังวาล) and epaulettes.
      g.rect(cx - 3, H - 21, 6, 7, cloth)
      g.rect(cx - 3, H - 21, 6, 2, GOLD.b)
      g.line(cx - 3, H - 21, cx + 2, H - 15, GOLD.l)
      g.line(cx + 3, H - 21, cx - 2, H - 15, GOLD.l)
      for (const s of [-1, 1]) {
        g.px(cx + s * 4, H - 21, GOLD.b)
        g.px(cx + s * 5, H - 22, GOLD.l)
      }
      // Arms – the characteristic flexed hands (มือจีบ / ตั้งวง).
      const pose: [number, number, number, number][] =
        frame === 0
          ? [
              [-4, -20, -8, -25],
              [4, -20, 8, -16],
            ]
          : frame === 1
            ? [
                [-4, -20, -7, -14],
                [4, -20, 7, -27],
              ]
            : frame === 2
              ? [
                  [-4, -20, -8, -22],
                  [4, -20, 8, -22],
                ]
              : [
                  [-4, -20, -2, -26],
                  [4, -20, 2, -26],
                ]
      for (const [ax, ay, bx, by] of pose) {
        const mx = (ax + bx) / 2 + Math.sign(ax) * 2
        const my = (ay + by) / 2 + 1
        g.line(cx + ax, H + ay, cx + mx, H + my, skin)
        g.line(cx + mx, H + my, cx + bx, H + by, skin)
        // Fingers bent back.
        g.px(cx + bx + Math.sign(bx || ax), H + by - 1, skin)
        g.px(cx + bx + Math.sign(bx || ax) * 2, H + by - 2, skinD)
        g.px(cx + mx, H + my, GOLD.b)
      }
      // Head.
      g.circle(cx, H - 25, 3, skin)
      g.px(cx - 1, H - 25, P.ink)
      g.px(cx + 1, H - 25, P.ink)
      g.px(cx, H - 23, '#e8709e')
      g.px(cx - 2, H - 24, '#ff9aa6')
      g.px(cx + 2, H - 24, '#ff9aa6')
      // Chada crown.
      g.rect(cx - 3, H - 29, 6, 2, GOLD.b)
      for (let i = 0; i < 6; i++) g.rect(cx - 2 + (i >> 1), H - 30 - i, Math.max(1, 5 - i), 1, i % 2 ? GOLD.d : GOLD.l)
      g.px(cx, H - 36 + 1, GOLD.L)
      for (const s of [-1, 1]) g.px(cx + s * 4, H - 27, GOLD.b)
    })
    const o = outlineCanvas(c, P.ink)
    if (!flip) return o
    const f = bake(o.w, o.h, (g) => g.draw(o.canvas, 0, 0, true))
    return { canvas: f, w: o.w, h: o.h }
  })
}

/** Musician playing the ranat xylophone (for the dance troupe). */
export function musicianSprite(frame: 0 | 1): Sprite {
  return cached(`bk:ranat:${frame}`, () =>
    outlineCanvas(
      bake(30, 22, (g) => {
        // Boat-shaped ranat.
        g.poly(
          [
            [2, 14],
            [28, 14],
            [24, 20],
            [6, 20],
          ],
          '#8a5a3a',
        )
        g.hline(2, 28, 14, '#b07a52')
        for (let x = 5; x < 26; x += 2) g.rect(x, 12, 1, 2, '#e0bb8a')
        // Player sitting behind.
        g.rect(12, 4, 7, 7, '#fffaf0')
        g.circle(15, 2, 2.6, '#e0a878')
        g.rect(13, 0, 5, 1, '#3b2f40')
        g.line(12, 7, frame ? 8 : 10, 11, '#e0a878')
        g.line(19, 7, frame ? 22 : 20, 11, '#e0a878')
        g.px(frame ? 8 : 10, 12, '#6e4a35')
        g.px(frame ? 22 : 20, 12, '#6e4a35')
        g.rect(11, 10, 9, 3, '#3a3040')
      }),
      P.ink,
    ),
  )
}

// ---------------------------------------------------------------------------
// City: BTS skytrain guideway, malls with LED screens, modern street lamps.

/** Guideway pillar (T-shaped concrete) – anchor at the base. */
export function btsPillar(h: number): Prop {
  return bprop(`era:btspillar:${h}`, 30, h, 15, h - 1, (g) => {
    g.rect(11, 8, 8, h - 8, '#c9c3cc')
    g.vline(11, 8, h - 1, '#e8e4ee')
    g.vline(18, 8, h - 1, '#a8a2b0')
    g.rect(0, 0, 30, 8, '#bdb6c2')
    g.hline(0, 29, 0, '#e8e4ee')
    g.hline(0, 29, 7, '#8c8699')
    g.rect(9, h - 4, 12, 4, '#a8a2b0')
    // Posters on the pillar.
    g.rect(12, h - 26, 6, 10, '#ffd23f')
    g.rect(13, h - 25, 4, 4, '#e8514a')
  })
}

/** Paint the elevated guideway beam across [x0, x1] at screen y (overlay). */
export function drawGuideway(g: Surface, x0: number, x1: number, y: number) {
  g.rect(x0, y, x1 - x0, 12, '#c9c3cc')
  g.hline(x0, x1 - 1, y, '#f0ecf2')
  g.hline(x0, x1 - 1, y + 1, '#e2dde6')
  g.rect(x0, y + 9, x1 - x0, 3, '#8c8699')
  // Parapet with the noise barrier.
  g.rect(x0, y - 4, x1 - x0, 4, '#b8b2c0')
  for (let x = x0; x < x1; x += 6) g.vline(x, y - 4, y - 1, '#9a94a4')
  g.hline(x0, x1 - 1, y - 5, '#e8e4ee')
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(40,30,50,0.18)'
  g.ctx.fillRect(x0 - g.ox, y + 12 - g.oy, x1 - x0, 3)
  g.ctx.restore()
}

export const BTS_PAL = { body: '#f4f2f8', stripe: '#3fae6a', roof: '#c9c3d0', win: '#9fd8ff', dark: '#4a4458' }

/** A mall facade with glass floors, a canopy and an LED screen area (baked). Returns the screen rect. */
export function mallFacade(g: Surface, x: number, gy: number, w: number, h: number, v: number, night: boolean): { x: number; y: number; w: number; h: number } {
  const top = gy - h
  const body = (['#dcd3ee', '#cfe8e6', '#f2e2d0'] as Color[])[v % 3]
  g.rect(x, top, w, h, body)
  g.rect(x + w - 4, top, 4, h, mix(body, '#3a2838', 0.2))
  // Glass curtain wall bands.
  for (let y = top + 6; y < gy - 22; y += 9) {
    g.rect(x + 3, y, w - 7, 6, night ? '#ffe7a8' : '#8fc4e8')
    for (let i = x + 3; i < x + w - 4; i += 5) g.vline(i, y, y + 5, night ? '#ffcf7a' : '#6fa8d0')
    g.hline(x + 3, x + w - 5, y, night ? '#fff6d6' : '#c8ecff')
    if (!night) for (let i = x + 6; i < x + w - 6; i += 11) g.line(i, y + 5, i + 3, y + 1, '#dff4ff')
  }
  // Ground floor canopy and shop windows.
  g.rect(x, gy - 22, w, 4, '#5a5068')
  g.hline(x, x + w - 1, gy - 22, '#8c8699')
  g.rect(x + 2, gy - 18, w - 4, 18, night ? '#ffe7a8' : '#b8e0f4')
  for (let i = x + 2; i < x + w - 2; i += 14) g.vline(i, gy - 18, gy - 1, '#8c8699')
  // Shoppers' silhouettes inside.
  for (let i = x + 6; i < x + w - 6; i += 9) {
    g.rect(i, gy - 8, 2, 6, mix(body, '#3a2838', 0.5))
    g.px(i, gy - 10, mix(body, '#3a2838', 0.5))
  }
  // Sign band.
  const sy = top + 2
  g.rect(x + w / 2 - 20, sy, 40, 5, night ? '#ff6fa0' : '#e8514a')
  for (let i = x + w / 2 - 17; i < x + w / 2 + 17; i += 3) g.px(i, sy + 2, '#fffaf0')
  // LED screen.
  const scr = { x: x + 8, y: top + 12, w: Math.min(56, w - 20), h: 30 }
  g.rect(scr.x - 2, scr.y - 2, scr.w + 4, scr.h + 4, '#3a3040')
  return scr
}

/** Animated LED billboard content (drawn every frame, cheap). */
export function drawLED(g: Surface, r: { x: number; y: number; w: number; h: number }, t: number, seed = 0) {
  const scene = Math.floor((t + seed * 3) / 4) % 4
  const k = ((t + seed * 3) % 4) / 4
  if (scene === 0) {
    g.gradientV(r.x, r.y, r.w, r.h, ['#ff6fa0', '#ffb35a'], 3)
    g.circle(r.x + r.w * (0.2 + k * 0.6), r.y + r.h / 2, 7, '#fffaf0')
    g.rect(r.x + 4, r.y + r.h - 8, r.w - 8, 3, '#fff3a6')
  } else if (scene === 1) {
    g.rect(r.x, r.y, r.w, r.h, '#3d63b5')
    for (let i = 0; i < 6; i++) g.rect(r.x + 4 + i * 8, r.y + r.h - 6 - ((i * 7 + Math.floor(t * 6)) % 16), 5, 4, '#6cf0c0')
    g.hline(r.x + 4, r.x + r.w - 5, r.y + 5, '#ffffff')
  } else if (scene === 2) {
    g.rect(r.x, r.y, r.w, r.h, '#2a2440')
    // Elephant mascot waving.
    g.ellipse(r.x + r.w / 2, r.y + r.h / 2 + 3, 9, 7, '#9fd0ff')
    g.circle(r.x + r.w / 2 + 7, r.y + r.h / 2 - 2, 5, '#9fd0ff')
    g.px(r.x + r.w / 2 + 8, r.y + r.h / 2 - 3, '#2a2440')
    g.line(r.x + r.w / 2 + 11, r.y + r.h / 2, r.x + r.w / 2 + 12, r.y + r.h / 2 + 6 + Math.round(Math.sin(t * 6) * 2), '#9fd0ff')
    for (let i = 0; i < 5; i++) g.px(r.x + 4 + ((i * 13 + Math.floor(t * 10)) % (r.w - 8)), r.y + 4 + ((i * 7) % 8), '#fff3a6')
  } else {
    g.gradientV(r.x, r.y, r.w, r.h, ['#62d0a0', '#3fae6a'], 3)
    const tx = r.x + r.w - ((t * 30) % (r.w + 40))
    for (let i = 0; i < 8; i++) g.rect(tx + i * 6, r.y + r.h / 2 - 2, 4, 5, '#fffaf0')
  }
}

/** Modern street lamp (double arm). */
export function cityLamp(night = false): Prop {
  return bprop(`era:citylamp:${night ? 1 : 0}`, 22, 50, 11, 49, (g) => {
    g.rect(10, 6, 3, 43, '#6a6478')
    g.vline(10, 6, 48, '#8c8699')
    g.rect(8, 46, 7, 3, '#5a5068')
    g.hline(2, 20, 6, '#6a6478')
    for (const x of [2, 17]) {
      g.rect(x, 6, 4, 3, '#5a5068')
      g.rect(x, 9, 4, 1, night ? '#fff3a6' : '#e8e4ee')
    }
  })
}

// ---------------------------------------------------------------------------
// Bangkok taxis and buses (side view, facing right).

export type CarKind = 'taxiPink' | 'taxiGreen' | 'taxiBlue' | 'taxiOrange' | 'bus' | 'van'

export function carSprite(kind: CarKind): Sprite {
  return cached(`bk:car:${kind}`, () => {
    if (kind === 'bus') {
      return outlineCanvas(
        bake(60, 22, (g) => {
          g.rect(1, 3, 58, 14, '#e8514a')
          g.rect(1, 3, 58, 2, '#ff8a7a')
          g.rect(1, 12, 58, 3, '#fff1d6')
          for (let x = 4; x < 52; x += 7) g.rect(x, 5, 5, 6, '#9fd8ff')
          g.rect(53, 5, 5, 9, '#9fd8ff')
          g.circle(12, 18, 3, '#3a3040')
          g.circle(48, 18, 3, '#3a3040')
          g.px(12, 18, '#bdb2ae')
          g.px(48, 18, '#bdb2ae')
          g.rect(20, 7, 12, 3, '#ffd23f')
        }),
        P.ink,
      )
    }
    const body = { taxiPink: '#ff6fa0', taxiGreen: '#6cc36a', taxiBlue: '#5a8de0', taxiOrange: '#f58f35', van: '#fffaf0' }[kind]
    const two = kind === 'taxiGreen'
    return outlineCanvas(
      bake(34, 16, (g) => {
        g.rect(1, 6, 32, 6, two ? '#ffd23f' : body)
        g.rect(1, 9, 32, 3, body)
        g.poly(
          [
            [8, 6],
            [11, 1],
            [24, 1],
            [28, 6],
          ],
          two ? '#6cc36a' : body,
        )
        g.poly(
          [
            [10, 6],
            [12, 2],
            [17, 2],
            [17, 6],
          ],
          '#bfe6f5',
        )
        g.poly(
          [
            [19, 6],
            [19, 2],
            [23, 2],
            [26, 6],
          ],
          '#bfe6f5',
        )
        if (kind !== 'van') {
          g.rect(14, 0, 6, 1, '#fffaf0')
          g.px(16, 0, '#e8514a')
        }
        g.circle(8, 12, 2.6, '#3a3040')
        g.circle(26, 12, 2.6, '#3a3040')
        g.px(8, 12, '#bdb2ae')
        g.px(26, 12, '#bdb2ae')
        g.px(32, 8, '#fff3a6')
        g.px(1, 8, '#e8514a')
        g.hline(2, 31, 6, mix(body, '#ffffff', 0.35))
      }),
      P.ink,
    )
  })
}
