// ตลาดนัดจตุจักร – the clock tower (หอนาฬิกา) in the middle, long covered
// market halls split into bays, the pets zone, coconut ice cream, the giant
// paella-style pan, mango sticky rice, vintage racks, the entrance arch and
// the skytrain viaduct behind the park trees.

import type { Color, Surface } from '../../engine/pixel'
import { hprop, hsh, INK, INK2, mix, ramp, type Goods, type HubProp } from './hub-kit'

// ---------------------------------------------------------------------------
// Clock tower.

/** The Chatuchak clock tower (anchor: centre of the plinth's front step). */
export function clockTower(night = false): HubProp {
  const W = 48
  const H = 124
  return hprop(`jj:clock:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const WH = ramp('#fbf4e6')
    const TR = ramp('#e8514a')
    // Round plinth with steps.
    for (let i = 0; i < 3; i++) {
      const y = H - 3 - i * 3
      g.ellipse(cx, y, 22 - i * 3, 4 - i * 0.6, i % 2 ? '#d8cfc4' : '#e8e0d4')
      g.ellipse(cx, y - 1, 21 - i * 3, 3 - i * 0.6, i % 2 ? '#ece4d8' : '#f6f0e6')
    }
    const baseY = H - 11
    // Shaft (slightly tapering) with vertical grooves.
    const shaftTop = 40
    for (let y = shaftTop; y < baseY; y++) {
      const f = (y - shaftTop) / (baseY - shaftTop)
      const half = 7 + f * 2
      g.hline(Math.round(cx - half), Math.round(cx + half), y, WH.b)
      g.hline(Math.round(cx + half * 0.3), Math.round(cx + half), y, WH.d)
      g.px(Math.round(cx + half), y, WH.D)
      g.px(Math.round(cx - half), y, WH.L)
      if (y % 2 === 0) {
        g.px(Math.round(cx - half * 0.45), y, WH.d)
        g.px(Math.round(cx + half * 0.1), y, mix(WH.d, INK, 0.1))
      }
    }
    // Red bands and slit windows.
    for (const y of [baseY - 4, 74, 56]) {
      g.hline(cx - 10, cx + 10, y, TR.b)
      g.hline(cx - 10, cx + 10, y + 1, TR.d)
    }
    for (const y of [62, 80, 92]) {
      g.rect(cx - 1, y, 3, 7, night ? '#ffe7a8' : '#6a8ab0')
      g.px(cx - 1, y, night ? '#fff6d6' : '#9fc0e0')
    }
    // Door at the base.
    g.rect(cx - 4, baseY - 12, 9, 12, '#8a5a3a')
    g.rect(cx - 3, baseY - 11, 7, 11, night ? '#c89050' : '#6e4a35')
    g.vline(cx, baseY - 11, baseY - 1, '#4a3128')
    g.poly([[cx - 5, baseY - 12], [cx, baseY - 16], [cx + 5, baseY - 12]], TR.b)
    // Clock head (wider box) with the face.
    const hy = 18
    g.rect(cx - 13, hy, 27, 24, WH.b)
    g.rect(cx + 6, hy, 8, 24, WH.d)
    g.hline(cx - 14, cx + 14, hy - 1, WH.D)
    g.hline(cx - 14, cx + 14, hy + 24, WH.D)
    g.hline(cx - 14, cx + 14, hy + 25, TR.d)
    g.rect(cx - 15, hy + 22, 31, 2, TR.b)
    // Face.
    const fy = hy + 11
    g.circle(cx, fy, 9, '#3d63b5')
    g.circle(cx, fy, 8, night ? '#fff6c8' : '#fffaf0')
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      const r = k % 3 === 0 ? 6.5 : 7
      g.px(Math.round(cx + Math.cos(a) * r), Math.round(fy + Math.sin(a) * r), k % 3 === 0 ? INK : '#8c8187')
    }
    // Cornice + tiered roof with spire.
    g.rect(cx - 16, hy - 4, 33, 3, WH.L)
    g.hline(cx - 16, cx + 16, hy - 2, WH.D)
    const RF = ramp('#3d8a6a')
    for (let i = 0; i < 9; i++) {
      const y = hy - 5 - i
      const half = 16 - i * 1.4
      g.hline(Math.round(cx - half), Math.round(cx + half), y, i % 3 === 2 ? RF.d : RF.b)
      g.px(Math.round(cx + half), y, RF.D)
      g.px(Math.round(cx - half), y, RF.L)
    }
    g.rect(cx - 5, hy - 17, 11, 3, WH.b)
    g.hline(cx - 5, cx + 5, hy - 15, WH.D)
    for (let i = 0; i < 10; i++) {
      const half = Math.max(0, 4 - i * 0.45)
      g.hline(Math.round(cx - half), Math.round(cx + half), hy - 18 - i, i < 6 ? RF.b : '#ffd54f')
    }
    g.vline(cx, 0, hy - 27, '#ffd54f')
    g.px(cx, 0, '#fff3a6')
    hooks.clock = [{ x: cx, y: fy }]
    hooks.glints = [{ x: cx, y: 2 }, { x: cx - 12, y: hy - 4 }]
  })
}

/** Clock hands showing the real local time (drawn every frame). */
export function drawClockHands(g: Surface, x: number, y: number, now = new Date()) {
  const m = now.getMinutes() + now.getSeconds() / 60
  const h = (now.getHours() % 12) + m / 60
  const am = (m / 60) * Math.PI * 2 - Math.PI / 2
  const ah = (h / 12) * Math.PI * 2 - Math.PI / 2
  g.line(x, y, Math.round(x + Math.cos(ah) * 4), Math.round(y + Math.sin(ah) * 4), INK)
  g.line(x, y, Math.round(x + Math.cos(am) * 6), Math.round(y + Math.sin(am) * 6), INK2)
  const as = (now.getSeconds() / 60) * Math.PI * 2 - Math.PI / 2
  g.px(Math.round(x + Math.cos(as) * 6), Math.round(y + Math.sin(as) * 6), '#e8514a')
  g.px(x, y, '#e8514a')
}

// ---------------------------------------------------------------------------
// Market halls: a long corrugated roof over a row of little shop bays.

export interface Bay {
  back?: Goods
  counter?: Goods
  skirt?: Color
  /** Bay back-wall colour. */
  wall?: Color
  /** Little shop sign colour on the fascia. */
  sign?: Color
}

/** A covered hall of shop bays (anchor bottom-centre). Hooks: `bays` (bay centres at the counter). */
export function marketHall(key: string, bays: Bay[], o: { roof: Color; bay?: number; night?: boolean; number?: string } = { roof: '#6a9ac0' }): HubProp {
  const bw = o.bay ?? 28
  const W = bays.length * bw + 4
  const H = 56
  return hprop(`jj:hall:${key}:${o.night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const RF = ramp(o.roof)
    // Roof (two sheets with a ridge) seen from the front-top.
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x < W; x++) {
        const rib = (x + (y > 6 ? 2 : 0)) % 4
        let c = y < 7 ? RF.d : RF.b
        if (rib === 0) c = mix(c, '#ffffff', 0.28)
        else if (rib === 3) c = mix(c, INK, 0.18)
        g.px(x, y, c)
      }
    }
    g.hline(0, W - 1, 0, RF.L)
    g.hline(0, W - 1, 7, RF.D)
    for (let x = 3; x < W; x += 11) g.px(x, 3 + (x % 3), mix(RF.d, '#c86a3a', 0.5))
    // Fascia beam.
    g.rect(0, 14, W, 4, '#e8e2dc')
    g.hline(0, W - 1, 17, '#a8a2a8')
    bays.forEach((b, i) => {
      const x0 = 2 + i * bw
      const cx = x0 + bw / 2
      const wall = b.wall ?? ['#e8dccb', '#dfe8d8', '#f0dcd0', '#dcdcec'][i % 4]
      const shadeWall = mix(wall, INK, o.night ? 0.12 : 0.28)
      g.rect(x0, 18, bw, 22, shadeWall)
      for (let x = x0 + 3; x < x0 + bw - 2; x += 6) g.vline(x, 18, 39, mix(shadeWall, INK, 0.12))
      if (o.night) {
        g.alpha(0.3)
        g.rect(x0 + 1, 18, bw - 2, 22, '#ffcf7a')
        g.alpha(1)
      }
      b.back?.(g, x0 + 2, x0 + bw - 3, 20)
      // Sign plate on the fascia.
      const sc = b.sign ?? ['#e8514a', '#ffd23f', '#43905a', '#3d63b5', '#f58f35', '#e8709e'][hsh(i, key.length) % 6]
      g.rect(cx - 8, 14, 16, 4, sc)
      g.hline(cx - 6, cx + 5, 15, mix(sc, '#ffffff', 0.6))
      // Counter.
      const sk = b.skirt ?? ['#c28e5c', '#5a8de0', '#e8514a', '#6cc36a', '#fffaf0'][hsh(i, key.length, 3) % 5]
      const sr = ramp(sk)
      g.rect(x0 + 1, 40, bw - 2, 3, '#f0e8dc')
      g.hline(x0 + 1, x0 + bw - 2, 40, '#ffffff')
      g.rect(x0 + 2, 43, bw - 4, 12, sr.b)
      g.hline(x0 + 2, x0 + bw - 3, 43, sr.d)
      g.hline(x0 + 2, x0 + bw - 3, 54, sr.D)
      g.vline(x0 + bw / 2, 44, 53, sr.d)
      b.counter?.(g, x0 + 2, x0 + bw - 3, 40)
      // Post between bays.
      g.rect(x0, 14, 1, 41, '#8a8480')
    })
    g.rect(W - 2, 14, 1, 41, '#8a8480')
    if (o.number) {
      // Section number plate (blue, big) at the left end.
      g.rect(2, 2, 12, 9, '#2f5fb0')
      g.frame(2, 2, 12, 9, '#fffaf0')
      g.rect(5, 4, 2, 5, '#fffaf0')
      g.rect(9, 4, 2, 5, '#fffaf0')
    }
    hooks.bays = bays.map((_, i) => ({ x: 2 + i * bw + bw / 2, y: 40 }))
  })
}

// ---------------------------------------------------------------------------
// Pets zone.

/** Stacked pet cages: bunnies, kittens, puppies, a hamster wheel. */
export function petCages(): HubProp {
  return hprop('jj:cages', 50, 40, 25, 39, (g, hooks) => {
    g.rect(1, 36, 48, 3, '#8a8480')
    const cage = (x: number, y: number, w: number, h: number, fill: (cx: number, cy: number) => void) => {
      g.rect(x, y, w, h, '#f0ece6')
      fill(x + w / 2, y + h - 1)
      for (let i = x; i <= x + w; i += 2) g.vline(i, y, y + h - 1, '#a8a2a8')
      g.frame(x, y, w + 1, h, '#6a6374')
      g.hline(x, x + w, y + h, '#6a6374')
    }
    cage(2, 20, 14, 15, (cx, cy) => {
      // Bunny.
      g.ellipse(cx, cy - 3, 4, 3, '#fffaf0')
      g.rect(cx + 1, cy - 11, 1, 5, '#fffaf0')
      g.rect(cx + 3, cy - 10, 1, 4, '#fffaf0')
      g.px(cx + 2, cy - 5, INK)
      g.px(cx + 1, cy - 9, '#ff9fc0')
    })
    cage(18, 20, 14, 15, (cx, cy) => {
      // Kitten (orange, of course).
      g.ellipse(cx, cy - 3, 4, 3, '#f58f35')
      g.circle(cx + 2, cy - 7, 2.5, '#f58f35')
      g.px(cx + 1, cy - 10, '#f58f35')
      g.px(cx + 4, cy - 10, '#f58f35')
      g.px(cx + 1, cy - 7, INK)
      g.px(cx + 3, cy - 7, INK)
      g.hline(cx - 3, cx - 1, cy - 4, '#d0661f')
    })
    cage(34, 20, 14, 15, (cx, cy) => {
      // Puppy.
      g.ellipse(cx, cy - 3, 4, 3, '#e0a868')
      g.circle(cx - 2, cy - 7, 2.5, '#e0a868')
      g.rect(cx - 5, cy - 8, 2, 3, '#b87c43')
      g.px(cx - 3, cy - 7, INK)
      g.px(cx - 1, cy - 7, INK)
      g.px(cx - 2, cy - 5, '#e8709e')
    })
    cage(8, 3, 16, 15, (cx, cy) => {
      // Hamster wheel.
      g.circle(cx, cy - 6, 5, '#ff9fc0')
      g.circle(cx, cy - 6, 3.5, '#f0ece6')
      g.ellipse(cx, cy - 2, 2, 1.5, '#e0bb8a')
      g.px(cx + 1, cy - 3, INK)
    })
    cage(26, 3, 16, 15, (cx, cy) => {
      // Two lovebirds on a perch.
      g.hline(cx - 5, cx + 5, cy - 6, '#9a6a45')
      g.circle(cx - 2, cy - 8, 2, '#6cc36a')
      g.circle(cx + 3, cy - 8, 2, '#ffd23f')
      g.px(cx - 3, cy - 9, '#e8514a')
      g.px(cx + 4, cy - 9, '#e8514a')
    })
    hooks.cages = [{ x: 9, y: 28 }, { x: 25, y: 28 }, { x: 41, y: 28 }]
  })
}

/** Aquarium shelf with little fish tanks. */
export function fishTanks(): HubProp {
  return hprop('jj:tanks', 40, 34, 20, 33, (g, hooks) => {
    g.rect(1, 12, 38, 2, '#9a6a45')
    g.rect(1, 30, 38, 3, '#9a6a45')
    g.rect(2, 14, 1, 16, '#6e4a35')
    g.rect(37, 14, 1, 16, '#6e4a35')
    const tanks: [number, number][] = [
      [3, 1],
      [15, 1],
      [27, 1],
      [3, 17],
      [15, 17],
      [27, 17],
    ]
    const fish = ['#f58f35', '#e8514a', '#ffd23f', '#5a8de0', '#ff9fc0', '#6cf0c0']
    tanks.forEach(([x, y], i) => {
      g.rect(x, y, 10, 11, '#9fd8f0')
      g.rect(x, y, 10, 2, '#d4f1ff')
      g.rect(x, y + 9, 10, 2, '#c9a06a')
      g.frame(x, y, 10, 11, '#5a7a90')
      g.px(x + 2, y + 8, '#43905a')
      g.px(x + 2, y + 7, '#43905a')
      g.px(x + 7, y + 8, '#43905a')
      const c = fish[i % fish.length]
      g.rect(x + 3 + (i % 3), y + 4 + (i % 2) * 2, 3, 2, c)
      g.px(x + 2 + (i % 3), y + 4 + (i % 2) * 2, mix(c, INK, 0.3))
    })
    // Hanging bags of fish (clip on the side).
    g.vline(0, 0, 8, '#8a8480')
    g.ellipse(0, 10, 2, 3, '#d4f1ff')
    g.px(0, 10, '#f58f35')
    hooks.bubbles = tanks.map(([x, y]) => ({ x: x + 5, y: y + 6 }))
  })
}

// ---------------------------------------------------------------------------
// Food.

/** Coconut ice cream cart: coconut shells, a freezer, a striped parasol. */
export function coconutCart(): HubProp {
  return hprop('jj:coconut', 44, 46, 22, 45, (g, hooks) => {
    // Parasol.
    for (let i = 0; i < 9; i++) {
      const half = 20 * (0.28 + (i / 9) * 0.72)
      for (let x = Math.round(22 - half); x < 22 + half; x++) g.px(x, 2 + i, Math.floor((x + 40) / 4) % 2 ? '#6cc36a' : '#fffaf0')
    }
    g.px(22, 1, '#ffd54f')
    g.vline(22, 11, 24, '#8a8480')
    // Freezer box.
    g.rect(5, 26, 34, 12, '#fffaf0')
    g.hline(5, 38, 26, '#ffffff')
    g.rect(5, 36, 34, 2, '#bdb2ae')
    g.rect(9, 29, 26, 4, '#5a8de0')
    g.hline(11, 32, 30, '#9fd0ff')
    // Coconut shells on top, one open with a scoop.
    for (const [x, open] of [[10, false], [17, true], [26, false], [33, true]] as const) {
      g.circle(x, 23, 3.5, '#6e4a35')
      g.circle(x, 22.5, 3, '#8a5a3a')
      if (open) {
        g.ellipse(x, 21, 3, 1.2, '#fffaf0')
        g.circle(x, 19, 2, '#fffaf0')
        g.px(x - 1, 18, '#ffffff')
        g.px(x + 1, 19, '#c9a06a')
      } else g.px(x - 1, 21, '#a87050')
    }
    // Wheels.
    g.circle(10, 40, 3.5, '#3a3040')
    g.circle(34, 40, 3.5, '#3a3040')
    g.px(10, 40, '#bdb2ae')
    g.px(34, 40, '#bdb2ae')
    // A green coconut pile.
    for (const [x, y] of [[1, 42], [4, 43], [2, 39]]) g.circle(x, y, 2.5, '#6cc36a')
    hooks.cold = [{ x: 22, y: 20 }]
  })
}

/** The giant pan of seafood fried rice (paella-style show pan). */
export function giantPan(): HubProp {
  return hprop('jj:pan', 50, 30, 25, 29, (g, hooks) => {
    // Burner stand.
    g.rect(10, 18, 30, 10, '#3a3040')
    g.hline(10, 39, 18, '#5a5068')
    for (let x = 12; x < 38; x += 3) g.px(x, 17, x % 2 ? '#ff7a3a' : '#ffd23f')
    // Pan.
    g.ellipse(25, 12, 24, 7, '#3a3040')
    g.ellipse(25, 11.5, 22, 6, '#e8b830')
    g.ellipse(25, 11, 19, 4.6, '#f5c840')
    // Toppings: shrimp, mussels, peas, lemon.
    for (let k = 0; k < 22; k++) {
      const v = hsh(k, 11, 2)
      const a = (k / 22) * Math.PI * 2 + (v % 7) * 0.1
      const r = 5 + (v % 13)
      const x = Math.round(25 + Math.cos(a) * r)
      const y = Math.round(11 + Math.sin(a) * r * 0.26)
      if (k % 4 === 0) {
        g.px(x, y, '#ff7a5a')
        g.px(x + 1, y, '#ff9a7a')
      } else if (k % 4 === 1) g.px(x, y, '#3a3040')
      else if (k % 4 === 2) g.px(x, y, '#6cc36a')
      else g.px(x, y, '#ffe45e')
    }
    // Handles.
    g.rect(0, 10, 3, 2, '#3a3040')
    g.rect(47, 10, 3, 2, '#3a3040')
    hooks.steam = [{ x: 18, y: 8 }, { x: 30, y: 7 }, { x: 25, y: 10 }]
  })
}

/** Mango sticky rice stand: a mango pyramid, sticky rice tubs, a price sign. */
export function mangoStand(): HubProp {
  return hprop('jj:mango', 44, 40, 22, 39, (g) => {
    g.rect(2, 22, 40, 3, '#f0e8dc')
    g.hline(2, 41, 22, '#ffffff')
    g.rect(3, 25, 38, 14, '#ffd23f')
    g.hline(3, 40, 25, '#e9a53a')
    for (let x = 6; x < 40; x += 6) g.vline(x, 26, 38, '#e9a53a')
    // Mango pyramid.
    const M = ['#ffc83a', '#ffb02a', '#ffd86a']
    let row = 0
    for (let n = 6; n > 0; n--, row++) {
      for (let i = 0; i < n; i++) {
        const x = 7 + row * 2 + i * 4
        const y = 20 - row * 3
        g.ellipse(x, y, 2.2, 1.6, M[(i + row) % 3])
        g.px(x - 1, y - 1, '#fff0b0')
      }
    }
    // Sticky rice tubs + coconut milk.
    g.rect(31, 15, 8, 7, '#fffaf0')
    g.rect(31, 15, 8, 2, '#c8e8f0')
    g.rect(33, 11, 5, 4, '#f6ecd8')
    g.px(34, 11, '#ffffff')
    // Menu sign.
    g.rect(4, 2, 16, 9, '#43905a')
    g.frame(4, 2, 16, 9, '#fffaf0')
    g.hline(6, 17, 5, '#fffaf0')
    g.hline(6, 13, 7, '#ffe27a')
    g.vline(12, 11, 21, '#8a8480')
  })
}

/** A little matcha stall: green cups in a row. */
export function matchaGoods(): Goods {
  return (g, x0, x1, y) => {
    for (let x = x0 + 2; x <= x1 - 3; x += 5) {
      g.rect(x, y - 6, 4, 6, '#d4f1ff')
      g.rect(x, y - 4, 4, 4, '#7cb850')
      g.hline(x, x + 3, y - 4, '#a8d878')
      g.px(x + 3, y - 8, '#43905a')
      g.px(x + 3, y - 7, '#43905a')
    }
  }
}

// ---------------------------------------------------------------------------
// Vintage zone.

/** A rolling rail of vintage clothes (jeans, band tees, jackets). */
export function vintageRack(seed = 0): HubProp {
  return hprop(`jj:rack:${seed}`, 30, 30, 15, 29, (g) => {
    g.rect(2, 3, 1, 25, '#8a8480')
    g.rect(27, 3, 1, 25, '#8a8480')
    g.hline(1, 28, 3, '#b0aab0')
    g.hline(0, 4, 28, '#6a6374')
    g.hline(25, 29, 28, '#6a6374')
    const cols = ['#3d63b5', '#2a4a8a', '#3a3040', '#b8343f', '#fffaf0', '#6a8a5a', '#c8a060', '#5a8de0']
    for (let k = 0; k < 6; k++) {
      const x = 4 + k * 4
      const c = cols[(k + seed) % cols.length]
      const jeans = (k + seed) % 3 === 0
      g.px(x + 1, 4, '#8a8480')
      if (jeans) {
        g.rect(x, 5, 3, 17, c)
        g.vline(x + 1, 12, 21, mix(c, INK, 0.3))
        g.px(x, 6, '#ffd23f')
      } else {
        g.rect(x - 1, 5, 5, 11, c)
        g.px(x + 1, 8, (k + seed) % 2 ? '#ffd23f' : '#e8514a')
        g.vline(x + 3, 5, 15, mix(c, INK, 0.25))
      }
    }
  })
}

/** A mannequin wearing elephant pants (or a vintage look). */
export function mannequin(top: Color, bottom: Color, pattern = true): HubProp {
  return hprop(`jj:manq:${top}:${bottom}`, 12, 30, 6, 29, (g) => {
    g.rect(5, 26, 2, 3, '#8a8480')
    g.hline(2, 9, 29, '#6a6374')
    g.circle(6, 3, 2.5, '#f0e0d0')
    g.rect(5, 5, 2, 2, '#f0e0d0')
    g.rect(2, 7, 8, 8, top)
    g.rect(1, 8, 1, 6, top)
    g.rect(10, 8, 1, 6, top)
    g.vline(9, 7, 14, mix(top, INK, 0.25))
    g.rect(2, 15, 8, 11, bottom)
    g.vline(6, 18, 25, mix(bottom, INK, 0.35))
    if (pattern) {
      for (let y = 16; y < 26; y += 3) {
        g.px(3 + (y % 2), y, '#ffd23f')
        g.px(8 - (y % 2), y + 1, '#fffaf0')
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Entrance, info booth, skytrain.

/** Market entrance arch with a big green sign board (anchor: centre ground). */
export function jjGate(night = false): HubProp {
  const W = 110
  const H = 64
  return hprop(`jj:gate:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    for (const x of [4, W - 12]) {
      g.rect(x, 18, 8, H - 18, '#e8e2dc')
      g.rect(x + 5, 18, 3, H - 18, '#c8c0c0')
      g.rect(x - 1, H - 6, 10, 6, '#bdb2ae')
      g.hline(x, x + 7, 30, '#e8514a')
      g.hline(x, x + 7, 31, '#b8343f')
    }
    // Beam and sign.
    g.rect(0, 10, W, 10, '#2f7a4f')
    g.hline(0, W - 1, 10, '#5ab07a')
    g.hline(0, W - 1, 19, '#1e5a3a')
    g.rect(cx - 36, 1, 72, 18, '#2f7a4f')
    g.frame(cx - 36, 1, 72, 18, '#ffd54f')
    // Squiggle "Thai lettering" and a big clock-tower logo.
    for (let i = 0; i < 9; i++) {
      const x = cx - 26 + i * 6
      g.rect(x, 6, 4, 1, night ? '#fff6c8' : '#fffaf0')
      g.rect(x + (i % 2) * 3, 7, 1, 3, night ? '#fff6c8' : '#fffaf0')
      g.px(x + 1, 5, night ? '#fff6c8' : '#fffaf0')
    }
    g.hline(cx - 22, cx + 22, 13, '#ffe27a')
    g.hline(cx - 18, cx + 14, 15, '#b4e486')
    g.rect(cx - 33, 4, 5, 12, '#fffaf0')
    g.rect(cx - 32, 2, 3, 2, '#e8514a')
    g.px(cx - 31, 7, '#3d63b5')
    // Bulbs along the beam.
    for (let x = 3; x < W - 2; x += 6) g.px(x, 21, night ? '#fff3a6' : '#e8d4a0')
    hooks.bulbs = Array.from({ length: Math.floor((W - 5) / 6) + 1 }, (_, i) => ({ x: 3 + i * 6, y: 21 }))
  })
}

/** Information / lost-and-found booth. */
export function infoBooth(): HubProp {
  return hprop('jj:info', 30, 36, 15, 35, (g) => {
    g.rect(2, 12, 26, 23, '#fffaf0')
    g.rect(22, 12, 6, 23, '#e8e0d4')
    g.rect(4, 15, 18, 9, '#9fd0ff')
    g.hline(4, 21, 15, '#d4f1ff')
    g.rect(2, 25, 26, 2, '#3d63b5')
    g.poly([[0, 12], [15, 3], [30, 12]], '#3d63b5')
    g.hline(3, 27, 11, '#2a4a8a')
    g.circle(15, 7, 2.5, '#fffaf0')
    g.rect(14, 6, 2, 3, '#3d63b5')
    g.px(15, 5, '#3d63b5')
  })
}

/** BTS-style viaduct across the sky band (baked). */
export function viaduct(g: Surface, y: number, w: number, night: boolean) {
  const deck = night ? '#8a86a0' : '#d8d4dc'
  const deckD = night ? '#5a5670' : '#aaa4b4'
  const pillar = night ? '#6a6680' : '#c4c0cc'
  for (let x = 16; x < w; x += 60) {
    g.rect(x, y + 6, 7, 40, pillar)
    g.vline(x + 5, y + 6, y + 45, deckD)
    g.rect(x - 3, y + 5, 13, 3, deckD)
  }
  g.rect(0, y, w, 6, deck)
  g.hline(0, w - 1, y, night ? '#a8a4bc' : '#f0eef2')
  g.hline(0, w - 1, y + 5, deckD)
  for (let x = 0; x < w; x += 3) g.px(x, y - 1, deckD)
}

/** Far rows of market roofs (the endless sections), baked into the ground. */
export function roofscape(g: Surface, y0: number, y1: number, w: number, night: boolean, gap?: [number, number]) {
  const cols = ['#5a8ac0', '#5aa878', '#d0784a', '#8a78c0', '#c8a040', '#6a9ac0', '#b8604e']
  let row = 0
  for (let y = y0; y < y1; y += 12, row++) {
    for (let x = -((row * 17) % 40); x < w; x += 40) {
      if (gap && x + 40 > gap[0] && x < gap[1]) continue
      const c = cols[hsh(x + 400, row, 5) % cols.length]
      const r = ramp(night ? mix(c, '#2a2a4a', 0.35) : c)
      for (let j = 0; j < 12; j++) {
        for (let i = 0; i < 40; i++) {
          const X = x + i
          if (X < 0 || X >= w) continue
          const rib = (i + j) % 4
          let cc = j < 5 ? r.d : r.b
          if (rib === 0) cc = mix(cc, '#ffffff', 0.22)
          else if (rib === 3) cc = mix(cc, INK, 0.16)
          g.px(X, y + j, cc)
        }
      }
      g.hline(Math.max(0, x), Math.min(w - 1, x + 39), y, r.L)
      g.hline(Math.max(0, x), Math.min(w - 1, x + 39), y + 11, r.D)
      g.vline(x, y, y + 11, INK2)
      if (hsh(x + 400, row, 9) % 3 === 0) {
        // Section number plate.
        g.rect(x + 14, y + 3, 9, 6, '#2f5fb0')
        g.hline(x + 16, x + 20, y + 5, '#fffaf0')
      }
    }
  }
}

/** Second-hand sneakers laid out on a ground tarp (baked). */
export function sneakerMat(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#5a8de0')
  g.frame(x, y, w, h, '#3d63b5')
  const cols = ['#fffaf0', '#e8514a', '#3a3040', '#ffd23f', '#6cc36a', '#ff9fc0']
  let k = 0
  for (let j = y + 3; j < y + h - 3; j += 6)
    for (let i = x + 3; i < x + w - 6; i += 8) {
      const c = cols[k++ % cols.length]
      g.rect(i, j, 5, 3, c)
      g.rect(i + 3, j - 1, 2, 1, c)
      g.hline(i, i + 4, j + 2, '#bdb2ae')
      g.px(i + 1, j + 1, mix(c, INK, 0.3))
    }
}
