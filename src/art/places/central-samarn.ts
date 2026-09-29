// วัดสมานรัตนาราม (ฉะเชิงเทรา): the giant pink พระพิฆเนศปางนอนเอกเขนก lying on
// its side by the Bang Pakong river, rows of มุสิกะ rat statues in the seven
// weekday colours (whisper your wish into a rat's ear!), colourful deity
// statues, a Hindu-Chinese shrine hall and a fish-feeding pier.

import type { Surface } from '../../engine/pixel'
import { P, DAY_COLORS } from '../palette'
import { mixHex } from '../characters'
import { GOLD, WHITE, type Building, type Pt } from '../temple'
import type { Prop } from '../props'
import { drawDeity } from '../deities'
import { block, building, Cap, clamp01, Ell, prop, RAMPS, sculpted, stallProp, type Prim } from './central'

const RED = ['#3a0e14', '#5e1820', '#86222c', '#a82e36', '#c8403e', '#e05a4a', '#f07e62', '#fca888', '#ffd0b8']
const IVORY = ['#6a5a50', '#8a7a6a', '#a8988a', '#c4b6a6', '#dcd0c0', '#ece4d6', '#f6f0e6', '#fffaf2', '#ffffff']

// ---------------------------------------------------------------------------
// The reclining Ganesha (local origin = centre of the platform top, y up).

function ganeshaPrims(): Prim[] {
  const pink = 0
  const gold = 1
  const cloth = 2
  const ivory = 3
  return [
    // Legs: the lower leg along the ground, the upper leg bent over it.
    Cap([-104, 10, 0], [-52, 13, 4], 11, 14, 1, pink),
    Ell(-108, 9, 4, 10, 8, 9, 2, pink),
    Cap([-44, 26, 8], [-86, 34, 14], 16, 12, 3, cloth, 0.8),
    Cap([-86, 34, 14], [-102, 18, 16], 11, 10, 4, pink),
    Ell(-104, 13, 18, 9, 6, 7, 5, pink),
    // Dhoti over the hips and the great round belly.
    Ell(-38, 28, 0, 32, 25, 22, 6, cloth),
    Ell(4, 32, 10, 42, 30, 28, 7, pink),
    Ell(-6, 26, 20, 16, 10, 12, 7, pink),
    // Sash (ผ้าคาด) around the belly.
    Cap([-30, 12, 22], [-26, 54, 18], 3, 3, 8, gold),
    // Chest and shoulder rising to the right.
    Ell(40, 48, 2, 28, 26, 20, 9, pink),
    // The arm propping up the head: elbow on a cushion, hand at the cheek.
    Ell(58, 10, 6, 18, 8, 12, 10, gold),
    Cap([62, 14, 10], [68, 46, 14], 9, 7.5, 11, pink),
    Ell(68, 50, 16, 6, 6, 5, 12, pink),
    // Head, ears, crown.
    Ell(74, 72, 6, 22, 22, 18, 13, pink),
    Ell(56, 76, -4, 16, 21, 5, 14, pink),
    Ell(94, 76, -4, 14, 20, 5, 15, pink),
    Cap([74, 90, 4], [74, 116, 4], 11, 3, 16, gold),
    Ell(74, 91, 6, 13, 4, 10, 17, gold),
    // Trunk curling down across the chest toward the sweets.
    Cap([74, 62, 20], [64, 44, 26], 7, 5.5, 18, pink),
    Cap([64, 44, 26], [50, 36, 30], 5.5, 4, 18, pink),
    Ell(47, 37, 31, 3.6, 3.4, 3, 18, pink),
    // Tusks.
    Cap([66, 60, 20], [60, 54, 24], 2.2, 1.4, 19, ivory),
    Cap([82, 60, 20], [86, 52, 22], 1.8, 1.2, 20, ivory),
    // Upper arms: one holds a bowl of ขนมโมทกะ, one rests on the belly with a lotus.
    Cap([30, 66, 6], [8, 72, 10], 7, 6, 21, pink),
    Ell(2, 74, 12, 9, 5, 8, 22, gold),
    Ell(0, 80, 12, 6, 4, 6, 23, gold),
    Cap([36, 58, 16], [20, 44, 32], 7, 6, 24, pink),
    Ell(16, 42, 34, 5, 5, 4, 25, pink),
    // Anklets and armlets.
    Ell(-96, 13, 12, 3, 8, 8, 26, gold),
    Ell(64, 32, 13, 9, 3, 9, 27, gold),
  ]
}

export function recliningGanesha(s: number) {
  const q = Math.round(s * 40) / 40
  return sculpted(`samarn-ganesha:${q}`, () => ({
    prims: ganeshaPrims(),
    s: q,
    x0: -120,
    x1: 112,
    y0: -1,
    y1: 118,
    ramps: [RAMPS.pink, RAMPS.gold, RED, IVORY],
    rim: 0.2,
    ambient: 0.1,
    spec: [12, 0.4],
    gloss: [0.8, 1.3, 0.5, 1],
    outline: '#4a1a30',
    lineDepth: 3,
    detail(d) {
      // Eyes (kind, half closed), brows and a smile under the trunk.
      d.curve(64, 70, (x) => 76 - 0.2 * (x - 67) * (x - 67), -3)
      d.curve(78, 84, (x) => 76 - 0.2 * (x - 81) * (x - 81), -3)
      d.curve(62, 72, (x) => 81 + 0.6 * (1 - ((x - 67) / 5) ** 2), -2)
      d.curve(76, 86, (x) => 81 + 0.6 * (1 - ((x - 81) / 5) ** 2), -2)
      const [bi, bj] = d.px(74, 84)
      d.paint(bi, bj, 1, 7)
      d.paint(bi + 1, bj, 1, 7)
      d.paint(bi, bj + 1, 2, 6)
      // Trunk rings.
      for (let k = 0; k < 6; k++) {
        const t = k / 6
        d.line(72 - t * 20, 58 - t * 20, 78 - t * 20, 62 - t * 20, -1)
      }
      // Dhoti folds and belly button.
      for (const x of [-56, -44, -32, -20]) d.line(x, 8, x + 6, 48, -1)
      const [ni, nj] = d.px(8, 28)
      d.add(ni, nj, -3)
      d.add(ni + 1, nj, -2)
      // Crown tiers.
      for (let y = 94; y < 114; y += 4) d.curve(66, 82, () => y, -2)
      // Ear edges.
      d.curve(42, 56, (x) => 70 + (x - 42) * 0.1, -1)
    },
  }))
}

/** Stone platform (ฐาน) with a lotus band that the Ganesha lies on. */
export function drawGaneshaPlatform(g: Surface, cx: number, topY: number, w: number) {
  const S = RAMPS.stone
  g.ellipse(cx, topY, w / 2, 10, S[6])
  g.ellipse(cx - 20, topY - 1, w / 2 - 30, 6, S[7])
  for (let y = topY; y < topY + 16; y++) {
    const half = w / 2 - (y - topY) * 0.2
    for (let x = Math.round(cx - half); x < cx + half; x++) {
      const u = (x - cx) / half
      g.px(x, y, S[Math.round(clamp01(0.62 - u * 0.25 - (y === topY + 7 ? 0.15 : 0)) * 8)])
    }
  }
  for (let x = cx - w / 2 + 4; x < cx + w / 2 - 4; x += 5) {
    g.px(x, topY + 3, '#ff9fc0')
    g.px(x + 1, topY + 2, '#ffd6e0')
    g.px(x, topY + 11, GOLD.d)
  }
  g.hline(cx - w / 2, cx + w / 2 - 1, topY + 15, S[2])
}

// ---------------------------------------------------------------------------
// มุสิกะ (the rat) statues in weekday colours.

/** A rat statue on a little pedestal with a coin box. `day` 0 = Sunday. */
export function ratStatueSprite(day: number, big = false): Prop {
  const c = DAY_COLORS[day % 7]
  const k = big ? 2 : 1
  const W = 20 * k
  const H = 26 * k
  return prop(`samarn-rat:${day}:${big ? 1 : 0}`, W, H, W >> 1, H - 1, (g) => {
    const X = (v: number) => v * k
    // Pedestal and coin box.
    g.rect(X(3), X(19), X(14), X(6), '#f4ece4')
    g.hline(X(3), X(17) - 1, X(19), '#ffffff')
    g.rect(X(3), X(24), X(14), k, '#c9bfb8')
    g.rect(X(12), X(20), X(4), X(3), '#b8343f')
    g.rect(X(13), X(20), X(2), k, '#3a2838')
    // Body (seated, facing viewer).
    g.ellipse(X(9), X(15), X(5), X(5), c.shade)
    g.ellipse(X(8.6), X(14.4), X(4.4), X(4.4), c.hex)
    g.ellipse(X(8), X(13.6), X(2.2), X(2.4), c.light)
    // Head with big round ears (the ones you whisper into).
    g.circle(X(9), X(8), X(4), c.hex)
    g.circle(X(8.4), X(7.4), X(2.4), c.light)
    for (const s of [-1, 1]) {
      g.circle(X(9 + s * 4.4), X(4.4), X(2.6), c.shade)
      g.circle(X(9 + s * 4.4), X(4.4), X(1.6), '#ffd6e0')
    }
    g.px(X(7), X(8), P.ink)
    g.px(X(11), X(8), P.ink)
    if (big) {
      g.px(X(7) + 1, X(8), P.ink)
      g.px(X(11) + 1, X(8), P.ink)
    }
    g.rect(X(8.5), X(10), k * 2, k, '#ff6f91')
    for (const s of [-1, 1]) g.hline(X(9 + s * 2), X(9 + s * 5), X(10), mixHex(c.shade, '#3a2838', 0.3))
    // Paws holding a sweet, tail curling round.
    g.circle(X(9), X(15), X(1.6), GOLD.b)
    g.px(X(9) - 1, X(15) - 1, GOLD.L)
    for (let i = 0; i < 6; i++) g.px(X(14 + Math.cos(i * 0.6) * 2), X(18 - i * 0.6), c.shade)
  })
}

/** Colourful deity statue on a pedestal (uses the shrine deity art). */
export function deityStatueSprite(id: string): Prop {
  return prop(`samarn-deity:${id}`, 40, 70, 20, 69, (g) => {
    block(g, 20, 58, 11, 16, RAMPS.white)
    g.rect(5, 66, 30, 2, GOLD.d)
    drawDeity(g, id, 20, 58, 1, 0)
  })
}

// ---------------------------------------------------------------------------
// The Hindu-Chinese shrine hall.

export function shrineHallSprite(night = false): Building {
  const W = 128
  const H = 110
  return building(`samarn-shrine:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const floor = 90
    // Platform and steps.
    g.rect(6, floor, W - 12, 10, '#f4ece4')
    g.hline(6, W - 7, floor, '#ffffff')
    g.rect(6, floor + 4, W - 12, 2, '#b8343f')
    for (let i = 0; i < 3; i++) g.rect(cx - 14 - i * 2, floor + 10 + i * 3, 28 + i * 4, 3, i % 2 ? '#e4ddd6' : '#f2eee9')
    // Walls: red with gold dragons on the posts and a round moon door.
    g.rect(14, 44, W - 28, floor - 44, '#c8403e')
    g.rect(14, 44, W - 28, 3, '#86222c')
    for (const x of [14, 36, W - 40, W - 18]) {
      g.rect(x, 44, 4, floor - 44, '#a82e36')
      for (let y = 48; y < floor; y += 5) g.px(x + 1 + ((y / 5) % 2), y, GOLD.b)
    }
    g.circle(cx, floor - 18, 16, GOLD.d)
    g.circle(cx, floor - 18, 14, night ? '#ffd88a' : '#4a1a20')
    g.rect(cx - 14, floor - 18, 28, 18, night ? '#ffd88a' : '#4a1a20')
    g.rect(cx - 16, floor - 18, 2, 18, GOLD.d)
    g.rect(cx + 14, floor - 18, 2, 18, GOLD.d)
    if (!night) g.ellipse(cx, floor - 10, 6, 7, '#b8742a')
    hooks.door = [{ x: cx, y: floor }]
    // Round lattice windows.
    for (const s of [-1, 1]) {
      const wx = cx + s * 38
      g.circle(wx, floor - 26, 7, GOLD.d)
      g.circle(wx, floor - 26, 6, night ? '#ffcf7a' : '#6a2a2a')
      for (let a = 0; a < 6; a++) g.line(wx, floor - 26, wx + Math.cos(a * 1.05) * 6, floor - 26 + Math.sin(a * 1.05) * 6, GOLD.b)
    }
    // Chinese roof with upturned eaves, yellow-orange tiles and a pearl ridge.
    const eaveY = 44
    const ridgeY = 16
    for (let x = 2; x < W - 2; x++) {
      const u = (x - cx) / (cx - 2)
      const lift = Math.pow(Math.abs(u), 6) * 10
      const top = ridgeY + 6
      const bot = eaveY - lift
      for (let y = Math.round(top); y < bot; y++) {
        const k = (y - top) / Math.max(1, bot - top)
        let c = k < 0.12 ? '#e0a526' : x % 4 === 0 ? '#d08a2a' : y % 3 === 0 ? '#f0b83a' : '#f7c84c'
        if (bot - y < 3) c = '#3f9a6b'
        g.px(x, y, c)
      }
      g.px(x, Math.round(bot), '#277253')
    }
    // Ridge with a flaming pearl and two dragons.
    g.rect(20, ridgeY + 2, W - 40, 5, '#3f9a6b')
    g.hline(20, W - 21, ridgeY + 2, '#6cc38e')
    g.circle(cx, ridgeY - 1, 4, '#e8514a')
    g.px(cx - 1, ridgeY - 2, '#ffd0b8')
    for (const s of [-1, 1]) {
      for (let i = 0; i < 26; i++) {
        const x = cx + s * (8 + i)
        const y = ridgeY + 1 - Math.round(Math.sin(i * 0.5) * 2.5)
        g.px(x, y, i % 3 ? '#3f9a6b' : GOLD.b)
        g.px(x, y - 1, '#6cc38e')
      }
      g.rect(cx + s * 34 - 2, ridgeY - 5, 5, 6, '#3f9a6b')
      g.px(cx + s * 34, ridgeY - 6, GOLD.b)
      g.rect(20 + (s > 0 ? W - 44 : 0), ridgeY - 2, 4, 6, '#3f9a6b')
    }
    // Hanging lanterns at the eaves.
    const glints: Pt[] = [{ x: cx, y: ridgeY - 4 }]
    hooks.glints = glints
    hooks.lanterns = [
      { x: 22, y: eaveY + 2 },
      { x: W - 22, y: eaveY + 2 },
    ]
  })
}

// ---------------------------------------------------------------------------
// Shops.

/** Rat-wish coin booth: coin trays, rat keychains and tiny rat figurines. */
export function ratBoothSprite(): Prop {
  return stallProp('samarn-ratbooth', {
    w: 50,
    awning: ['#ff9fc0', '#fffaf0'],
    counter: '#e8709e',
    goods(g, x0, y, w) {
      // Coin trays.
      for (let i = 0; i < 3; i++) {
        g.ellipse(x0 + 7 + i * 5, y - 1, 3, 1.4, '#c9a04c')
        for (let k = 0; k < 3; k++) g.px(x0 + 6 + i * 5 + k, y - 2, k % 2 ? GOLD.L : GOLD.b)
      }
      // Mini rats in the seven colours.
      for (let i = 0; i < 7; i++) {
        const c = DAY_COLORS[i]
        const rx = x0 + w - 30 + (i % 4) * 7
        const ry = y - 2 - Math.floor(i / 4) * 5
        g.circle(rx, ry, 2, c.hex)
        g.px(rx - 2, ry - 2, c.shade)
        g.px(rx + 2, ry - 2, c.shade)
        g.px(rx, ry, P.ink)
      }
    },
    sign(g, cx, y) {
      g.rect(cx - 7, y - 1, 14, 6, '#fffaf0')
      g.circle(cx - 2, y + 2, 2, '#9a9aa8')
      g.px(cx - 4, y, '#9a9aa8')
      g.px(cx, y, '#9a9aa8')
      g.circle(cx + 4, y + 2, 1.6, GOLD.b)
    },
  })
}

/** Marigold (ดาวเรือง) garland stall – Ganesha's favourite flower. */
export function marigoldStallSprite(): Prop {
  return stallProp('samarn-marigold', {
    w: 48,
    awning: ['#f58f35', '#ffd23f'],
    counter: '#c28e5c',
    goods(g, x0, y, w) {
      for (let i = 0; i < 9; i++) {
        const mx = x0 + 4 + (i % 5) * 4
        const my = y - 2 - Math.floor(i / 5) * 4
        g.circle(mx, my, 2, i % 2 ? '#f58f35' : '#ffd23f')
        g.px(mx, my, '#e0661f')
      }
      // Garlands and bananas/sugarcane for Ganesha.
      for (let i = 0; i < 3; i++) {
        const gx = x0 + w - 18 + i * 6
        g.circle(gx, y + 5, 2.6, '#f58f35')
        g.circle(gx, y + 5, 1.2, '#ffd23f')
      }
      g.rect(x0 + w - 14, y - 6, 3, 6, '#ffe45e')
      g.rect(x0 + w - 10, y - 5, 3, 5, '#ffe45e')
      g.vline(x0 + w - 5, y - 10, y, '#9ab85a')
      g.vline(x0 + w - 4, y - 10, y, '#6a8a3a')
    },
    sign(g, cx, y) {
      g.rect(cx - 7, y - 1, 14, 6, '#fffaf0')
      g.circle(cx - 3, y + 2, 2, '#f58f35')
      g.circle(cx + 2, y + 2, 2, '#ffd23f')
    },
  })
}

export { WHITE, DAY_COLORS }
