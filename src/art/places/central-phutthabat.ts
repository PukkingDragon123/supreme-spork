// วัดพระพุทธบาท (สระบุรี): the Buddha's Footprint in a green-and-gold tiered
// mondop on the hilltop, reached by naga staircases; corridors of bells to
// strike for luck, cheeky macaques stealing snacks, Saraburi souvenirs.

import type { Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, WHITE, crown, lacquerPanel, type Building, type Pt } from '../temple'
import type { Prop } from '../props'
import { block, building, clamp01, dth, hash, lathe, prop, RAMPS, stallProp } from './central'

const GREEN = { L: '#8ee0a8', b: '#3fae6e', d: '#2c8252', D: '#1e5a3a' }

/** The mondop over the Footprint. Anchor = foot of its stairs. */
export function mondopSprite(night = false): Building {
  const W = 156
  const H = 236
  return building(`phutthabat-mondop:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    const bells: Pt[] = []
    const floor = H - 30
    // High redented base (ฐานสิงห์) with gold mouldings.
    block(g, cx, floor, 22, 70, RAMPS.white)
    for (let x = cx - 69; x < cx + 69; x += 4) {
      g.px(x, floor + 5, GOLD.d)
      g.px(x + 1, floor + 4, GOLD.b)
      g.px(x, floor + 15, GOLD.d)
    }
    g.rect(cx - 70, floor + 9, 140, 3, '#b8343f')
    // Body: gold walls with green glass mosaic pilasters and a mother-of-pearl door.
    const bodyT = floor - 48
    for (let y = bodyT; y < floor; y++)
      for (let x = cx - 44; x < cx + 44; x++) {
        const u = (x - cx) / 44
        g.px(x, y, RAMPS.gold[Math.round(clamp01(0.62 - u * 0.3 + dth(x, y) * 0.15) * 7)])
      }
    for (const px of [cx - 44, cx - 24, cx + 20, cx + 40]) {
      g.rect(px, bodyT, 4, floor - bodyT, GREEN.d)
      for (let y = bodyT + 1; y < floor; y += 3) g.px(px + 1 + (y % 2), y, GREEN.L)
      g.rect(px - 1, bodyT, 6, 2, GOLD.l)
    }
    crown(g, cx, floor - 34, 22, 14)
    lacquerPanel(g, cx - 8, floor - 32, 16, 32, night, 2)
    if (!night) {
      // Mother-of-pearl: black lacquer with iridescent flecks.
      g.rect(cx - 8, floor - 32, 16, 32, '#1e1a2a')
      for (let i = 0; i < 60; i++) {
        const x = cx - 7 + Math.floor(hash(i, 1, 3) * 14)
        const y = floor - 31 + Math.floor(hash(i, 2, 3) * 30)
        g.px(x, y, ['#e8f4ff', '#c8e0ff', '#ffe0f0', '#d8fff0'][i % 4])
      }
      g.vline(cx - 1, floor - 32, floor - 1, '#3a3050')
    }
    hooks.door = [{ x: cx, y: floor }]
    for (const s of [-1, 1]) {
      crown(g, cx + s * 32, floor - 28, 10, 8)
      g.rect(cx + s * 32 - 4, floor - 27, 8, 14, night ? '#ffcf7a' : '#1e1a2a')
      if (!night) for (let i = 0; i < 12; i++) g.px(cx + s * 32 - 3 + (i % 6), floor - 26 + Math.floor(i / 2) * 2, '#c8e0ff')
    }
    // Seven tiers of green-glazed roofs with gold edges, then the golden spire.
    let y = bodyT
    const tiers = 7
    for (let i = 0; i < tiers; i++) {
      const half = 66 - i * 8
      const th = 13 - Math.floor(i / 2)
      const top = y - th
      for (let yy = top; yy < y; yy++) {
        const k = (yy - top) / th
        const hw = half * (0.62 + k * 0.38)
        for (let x = Math.round(cx - hw); x < cx + hw; x++) {
          let c = GREEN.b
          if (yy === y - 1 || yy === y - 2) c = GOLD.b
          else if ((yy - top) % 3 === 0) c = GREEN.d
          else if (x > cx + hw * 0.55) c = GREEN.d
          else if (x < cx - hw * 0.5 && (x + yy) % 3 === 0) c = GREEN.L
          g.px(x, yy, c)
        }
      }
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y - 1, GOLD.D)
      // Upturned gold finials (ช่อฟ้า) at the tier corners.
      for (const s of [-1, 1]) {
        const fx = Math.round(cx + s * half)
        g.px(fx, y - 3, GOLD.b)
        g.px(fx + s, y - 4, GOLD.l)
        g.px(fx + s, y - 5, GOLD.b)
        glints.push({ x: fx + s, y: y - 5 })
        if (i < 3) bells.push({ x: fx, y: y + 1 })
      }
      // A small gable at the tier's front.
      g.poly(
        [
          [cx - 8 + i, y - 2],
          [cx, top - 2],
          [cx + 8 - i, y - 2],
        ],
        GOLD.d,
      )
      g.poly(
        [
          [cx - 6 + i, y - 3],
          [cx, top + 1],
          [cx + 6 - i, y - 3],
        ],
        '#b8343f',
      )
      y = top + 3
    }
    // Spire (ยอด) with rings and a crystal tip.
    lathe(g, cx, y - 46, y + 2, (yy) => 1 + ((yy - (y - 46)) / 48) * 9, RAMPS.gold, { rowH: 4, spec: 0.6, specPow: 6, ambient: 0.2 })
    g.px(cx, y - 48, '#ffffff')
    g.px(cx, y - 47, GOLD.L)
    glints.push({ x: cx, y: y - 47 }, { x: cx - 3, y: y - 20 })
    hooks.glints = glints
    hooks.bells = bells
    // Front steps into the mondop.
    for (let i = 0; i < 7; i++) {
      const yy = floor + 1 + i * 4
      const hw = 14 + i
      g.rect(cx - hw, yy, hw * 2, 4, WHITE.b)
      g.hline(cx - hw, cx + hw - 1, yy, '#ffffff')
      g.hline(cx - hw, cx + hw - 1, yy + 3, WHITE.D)
    }
  })
}

/** Five-headed bronze naga at the foot of the staircase. Anchor = base. */
export function nagaHeadsSprite(flip = false): Prop {
  return prop(`phutthabat-naga:${flip ? 1 : 0}`, 34, 40, 17, 39, (g) => {
    const B = RAMPS.green
    // Coiled body rising from a plinth.
    block(g, 17, 32, 7, 15, RAMPS.white)
    for (let y = 14; y < 32; y++) {
      const half = 5 + (32 - y) * 0.1
      for (let x = Math.round(17 - half); x < 17 + half; x++) g.px(x, y, B[Math.round(clamp01(0.7 - ((x - 17) / half) * 0.35) * 8)])
      if (y % 3 === 0) g.px(17 - 1, y, GOLD.b)
    }
    // Hood of five heads fanning out.
    for (let k = -2; k <= 2; k++) {
      const hx = 17 + k * 6
      const hy = 8 + Math.abs(k) * 2
      g.circle(hx, hy, 3.4, B[5])
      g.circle(hx - 1, hy - 1, 2, B[7])
      g.px(hx - 1, hy, '#ffe45e')
      g.px(hx + 1, hy, '#ffe45e')
      g.rect(hx - 1, hy - 5, 3, 2, GOLD.b)
      g.px(hx, hy - 6, GOLD.L)
      g.line(hx, hy + 3, 17, 16, B[3])
    }
    g.ellipse(17, 16, 9, 3, B[4])
    for (let x = 9; x < 26; x += 2) g.px(x, 16, GOLD.d)
  })
}

/** A tall row of bells along the corridor (ระเบียงระฆัง). Bells are animated by RackBells at hooks.bells. */
export function bellCorridorSprite(n = 8): Building {
  const W = n * 9 + 10
  const H = 50
  return building(`phutthabat-bellcorr:${n}`, W, H, W >> 1, H - 1, (g, hooks) => {
    g.rect(0, H - 6, W, 6, '#e4ddd6')
    g.hline(0, W - 1, H - 6, '#ffffff')
    for (let x = 1; x < W; x += Math.floor((W - 4) / 3)) {
      g.rect(x, 12, 3, H - 18, '#b8343f')
      g.px(x, 12, '#e8514a')
    }
    g.rect(0, 10, W, 4, '#7e2436')
    g.hline(0, W - 1, 10, GOLD.l)
    // Green tiled roof.
    for (let y = 0; y < 10; y++) {
      const inset = (10 - y) * 0.6
      for (let x = Math.round(inset); x < W - inset; x++) g.px(x, y, y === 9 ? GOLD.b : y % 3 === 0 ? GREEN.d : GREEN.b)
    }
    hooks.bells = Array.from({ length: n }, (_, i) => ({ x: 9 + i * 9, y: 15 }))
  })
}

/** Long-tailed macaque sitting (or scampering with loot). */
export function drawMonkey(g: Surface, x: number, y: number, t: number, o: { flip?: boolean; loot?: string; eat?: boolean; run?: boolean } = {}) {
  const k = o.flip ? -1 : 1
  const fur = '#9a8272'
  const furD = '#6e5a4e'
  const face = '#f0b8a0'
  const bob = o.run ? Math.round(Math.abs(Math.sin(t * 12)) * 2) : 0
  // Tail.
  for (let i = 0; i < 8; i++) g.px(x - k * (4 + i * 0.7), y - 2 - Math.round(Math.sin(i * 0.5 + t * 2) * 2) - i * 0.4, furD)
  // Body and legs.
  g.ellipse(x, y - 5 - bob, 4, 4, fur)
  g.ellipse(x + k, y - 5 - bob, 2, 3, '#b8a090')
  g.rect(x - 3, y - 2, 2, 2, furD)
  g.rect(x + 1, y - 2, 2, 2, furD)
  // Head.
  g.circle(x + k * 2, y - 11 - bob, 3.2, fur)
  g.ellipse(x + k * 2.6, y - 10.6 - bob, 2, 1.8, face)
  g.px(x + k * 2, y - 11 - bob, P.ink)
  g.px(x + k * 3.6, y - 11 - bob, P.ink)
  g.px(x + k * 0, y - 13 - bob, furD)
  // Arms and loot.
  if (o.loot) {
    g.rect(x + k * 4, y - 8 - bob, 3, 4, o.loot)
    g.px(x + k * 4, y - 9 - bob, mixHex(o.loot, '#ffffff', 0.4))
  }
  if (o.eat && Math.floor(t * 4) % 2) g.px(x + k * 4, y - 10, '#ffe45e')
}

/** Saraburi souvenir stall: Tai Yuan woven cloth, mini bells, walking sticks and kalamae. */
export function souvenirStallSprite(): Prop {
  return stallProp('phutthabat-souvenir', {
    w: 54,
    awning: ['#3fae6e', '#ffd23f'],
    counter: '#9a6a45',
    goods(g, x0, y, w) {
      // Folded Tai Yuan (ผ้าทอไทยวน) cloth with bright stripes (left).
      for (let i = 0; i < 3; i++) {
        const cy = y - 3 - i * 3
        g.rect(x0 + 3, cy, 12, 3, ['#b8343f', '#3d63b5', '#e8a83a'][i])
        for (let x = x0 + 3; x < x0 + 15; x += 2) g.px(x, cy + 1, '#ffd23f')
      }
      // Mini bells on a stand.
      for (let i = 0; i < 3; i++) {
        const bx = x0 + 22 + i * 5
        g.vline(bx, y - 9, y - 6, '#6e4a35')
        g.rect(bx - 1, y - 6, 3, 3, GOLD.b)
        g.px(bx - 1, y - 6, GOLD.L)
      }
      g.hline(x0 + 20, x0 + 34, y - 9, '#6e4a35')
      // Walking sticks leaning (right) and kalamae parcels on the counter.
      for (let i = 0; i < 3; i++) g.line(x0 + w - 12 + i * 3, y + 10, x0 + w - 9 + i * 3, y - 14, i % 2 ? '#8a5a3a' : '#b08a5a')
      for (let i = 0; i < 4; i++) {
        g.rect(x0 + 8 + i * 8, y + 4, 6, 3, '#5a3a22')
        g.px(x0 + 9 + i * 8, y + 4, '#9ab85a')
      }
    },
    sign(g, cx, y) {
      g.rect(cx - 7, y - 1, 14, 6, '#fffaf0')
      g.rect(cx - 5, y + 1, 3, 3, GOLD.b)
      g.rect(cx, y + 1, 5, 3, '#b8343f')
    },
  })
}

// ---------------------------------------------------------------------------
// Interior pieces.

/** The gilded Footprint sunk in the floor, heaped with coins and gold leaf. */
export function drawFootprint(g: Surface, cx: number, cy: number, len: number, t0 = 0) {
  const wid = len * 0.4
  const inside = (x: number, y: number) => {
    const u = (y - cy) / (len / 2)
    if (Math.abs(u) > 1) return false
    // Wider at the toes (top), heel rounded at the bottom.
    const half = (wid / 2) * (u < 0 ? 1 - 0.1 * u * u : Math.sqrt(1 - u * u) * 0.95 + 0.05)
    return Math.abs(x - cx) <= half
  }
  // Mother-of-pearl frame.
  for (let y = Math.round(cy - len / 2 - 6); y < cy + len / 2 + 6; y++)
    for (let x = Math.round(cx - wid / 2 - 8); x < cx + wid / 2 + 8; x++) g.px(x, y, hash(x, y, 4) < 0.15 ? ['#e8f4ff', '#ffe0f0', '#d8fff0'][(x + y) % 3] : '#1e1a2a')
  g.frame(Math.round(cx - wid / 2 - 8), Math.round(cy - len / 2 - 6), Math.round(wid + 16), Math.round(len + 12), GOLD.b)
  for (let y = Math.round(cy - len / 2 - 2); y < cy + len / 2 + 2; y++)
    for (let x = Math.round(cx - wid / 2 - 3); x < cx + wid / 2 + 3; x++) {
      if (!inside(x, y)) continue
      const d = hash(x, y, 7 + t0)
      let c: string = RAMPS.gold[Math.round(clamp01(0.55 + ((cx - x) / wid) * 0.3 + dth(x, y) * 0.2) * 7)]
      if (d < 0.1) c = '#fff8d8'
      else if (d > 0.93) c = '#c9c3d6'
      g.px(x, y, c)
    }
  // Toes.
  for (let i = 0; i < 5; i++) {
    const tx = cx - wid / 2 + 3 + i * ((wid - 6) / 4)
    g.circle(tx, cy - len / 2 - 1, 2.4, RAMPS.gold[6])
    g.px(tx - 1, cy - len / 2 - 2, '#fff8d8')
  }
  // The dharma wheel mark in the middle.
  g.circle(cx, cy, wid * 0.22, GOLD.D)
  g.circle(cx, cy, wid * 0.16, GOLD.b)
  for (let a = 0; a < 8; a++) g.line(cx, cy, cx + Math.cos(a * 0.785) * wid * 0.2, cy + Math.sin(a * 0.785) * wid * 0.2, GOLD.D)
  // Scattered coins.
  for (let i = 0; i < 30; i++) {
    const x = cx - wid / 2 + hash(i, 5) * wid
    const y = cy - len / 2 + hash(i, 6) * len
    if (!inside(x, y)) continue
    g.px(x, y, i % 2 ? '#e4ddd6' : '#c9a04c')
    g.px(x + 1, y, i % 2 ? '#9a90a8' : '#8a6a2a')
  }
}

/** Woven silver mats (เสื่อเงิน) covering the mondop floor. */
export function silverMatFloor(g: Surface, x: number, y: number, w: number, h: number) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const X = x + i
      const Y = y + j
      const weave = ((X >> 1) + (Y >> 1)) % 2
      const base = weave ? '#d8d4e0' : '#c4c0d0'
      g.px(X, Y, (X + Y) % 7 === 0 ? '#f4f2fa' : (X * 3 + Y) % 11 === 0 ? '#a8a4b8' : base)
    }
  for (let j = 0; j < h; j += 24) g.hline(x, x + w - 1, y + j, '#9a96aa')
}

export { GREEN }
