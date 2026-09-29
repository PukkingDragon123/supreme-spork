// Lanna art for วัดพระธาตุลำปางหลวง and วัดภูมินทร์ (Nan): low sweeping teak
// halls with stepped roofs and gilded gables, the golden chedi behind its
// bronze railing with parasols, the Ho Phra Phutthabat (camera obscura), the
// sacred bodhi propped up by hundreds of wooden crutches, a fortress wall
// with a stucco arch gate, horse carriages, rooster bowls and khao taen,
// Wat Phumin's cruciform ubosot carried by two nagas, tung banners, the
// four-faced Buddha group and the famous whispering-couple mural.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import type { Prop } from '../props'
import { GOLD, WHITE, roofBand, type RoofRamp } from '../temple'
import { buddhaSculpt, drawBuddhaHD } from '../hall'
import { canopy, LEAVES } from '../garden'
import { BR, bricks, build, drawSculpt, hsh, paintTower, spr, stallBuilder, type Building, type Pt, type Seg } from './historic'

export const LANNA_ROOF: RoofRamp = { field: '#8a5236', fieldD: '#633a28', fieldL: '#b07048', border: '#d8a848', borderD: '#9a6a2a', under: '#3a2018' }
export const NAN_ROOF: RoofRamp = { field: '#7a6a62', fieldD: '#5a4c48', fieldL: '#a09088', border: '#d8a848', borderD: '#9a6a2a', under: '#3a2c2a' }

/** Lanna gable (หน้าแหนบ): red field divided by teak beams, gilded carving, thin barge boards. */
export function lannaGable(g: Surface, cx: number, apex: number, hw: number, base: number, field: Color = '#9a2a2a'): Pt[] {
  const h = base - apex
  for (let y = apex; y <= base; y++) {
    const half = ((y - apex) / h) * hw
    g.rect(Math.round(cx - half), y, Math.round(half * 2) + 1, 1, field)
  }
  // Teak frame: beams and posts.
  const wood = '#5a3424'
  for (const k of [0.45, 0.75]) {
    const y = Math.round(apex + h * k)
    const half = k * hw
    g.hline(Math.round(cx - half), Math.round(cx + half), y, wood)
    g.hline(Math.round(cx - half), Math.round(cx + half), y + 1, GOLD.D)
  }
  for (const f of [-0.5, 0, 0.5]) g.vline(Math.round(cx + f * hw * 0.9), Math.round(apex + h * (Math.abs(f) + 0.3)), base, wood)
  // Gilded carving dots and sun-burst at the centre.
  for (let y = apex + 3; y < base - 1; y += 2)
    for (let x = Math.round(cx - hw); x <= cx + hw; x += 2) {
      const half = ((y - apex) / h) * hw - 2
      if (Math.abs(x - cx) > half) continue
      if (hsh(x, y, 3) % 3 === 0) g.px(x + ((y >> 1) & 1), y, hsh(x, y, 4) % 2 ? GOLD.b : GOLD.d)
    }
  g.circle(cx, apex + h * 0.62, Math.max(2, hw * 0.12), GOLD.b)
  g.px(cx, Math.round(apex + h * 0.62) - 1, GOLD.L)
  // Barge boards with little naga crest bumps.
  for (const s of [-1, 1]) {
    for (let i = 0; i <= hw; i++) {
      const x = cx + s * i
      const y = Math.round(apex + (i / hw) * h)
      g.px(x, y - 1, GOLD.b)
      g.px(x, y, '#6e4a35')
      if (i % 4 === 2) g.px(x, y - 2, GOLD.l)
    }
    // Upturned end (หางหงส์ ล้านนา).
    g.px(cx + s * (hw + 1), base - 1, GOLD.b)
    g.px(cx + s * (hw + 2), base - 2, GOLD.l)
  }
  // Finial (ช่อฟ้า / ปราสาทเฟื้อง).
  g.vline(cx, apex - 5, apex - 1, GOLD.b)
  g.px(cx - 1, apex - 3, GOLD.d)
  g.px(cx + 1, apex - 3, GOLD.d)
  g.px(cx, apex - 6, GOLD.L)
  return [
    { x: cx, y: apex - 6 },
    { x: cx - hw - 2, y: base - 2 },
    { x: cx + hw + 2, y: base - 2 },
  ]
}

export interface LannaHallOpts {
  key: string
  w: number
  /** Central gable layers (1–3). */
  tiers: number
  /** Stepped-down wing layers each side. */
  steps: number
  open?: boolean
  roof?: RoofRamp
  night?: boolean
  base?: number
  nagaColor?: Color
  wallH?: number
}

/** Low, sweeping Lanna viharn (front view). Anchor = bottom of the stairs. Hooks: glints, bells, candles, inside. */
export function lannaHallSprite(o: LannaHallOpts): Building {
  const W = o.w + 40
  const roof = o.roof ?? LANNA_ROOF
  const base = o.base ?? 10
  const wallH = o.wallH ?? 22
  const hw0 = Math.round(o.w * 0.26)
  const gableH = Math.round(hw0 * 0.95)
  const H = base + 12 + wallH + gableH + o.tiers * 14 + 20
  return build(`lannahall:${o.key}:${o.night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const gy = H - 1
    const floor = gy - 12
    const eave = floor - base - wallH
    const glints: Pt[] = []
    const bells: Pt[] = []
    // Stepped wing roofs, from the outermost (lowest) inward.
    for (let k = o.steps; k >= 1; k--) {
      for (const s of [-1, 1]) {
        const ax = cx + s * (hw0 - 4 + (k - 1) * 10)
        const ay = eave - gableH + (k - 1) * 10 + 10
        const bx = cx + s * (o.w / 2 + 8 + (k - 1) * 4)
        const by = eave + 2 + (k - 1) * 2
        roofBand(g, ax, ay, bx, by, 10, roof, 3)
        g.line(ax, ay, bx, by, GOLD.d)
        g.px(bx + s, by - 1, GOLD.b)
        g.px(bx + s * 2, by - 2, GOLD.l)
        bells.push({ x: bx, y: by + 3 })
        glints.push({ x: bx + s * 2, y: by - 2 })
      }
    }
    // Central stacked gables (back one highest).
    for (let t = o.tiers - 1; t >= 0; t--) {
      const hw = hw0 - t * 6
      const b = eave - t * 13
      const a = b - Math.round(hw * 0.95)
      roofBand(g, cx, a, cx - hw - 6, b + 6, 9, roof, 3)
      roofBand(g, cx, a, cx + hw + 6, b + 6, 9, roof, 3)
      glints.push(...lannaGable(g, cx, a, hw, b, t === 0 ? '#9a2a2a' : '#7a2020'))
    }
    // Body: open sides with low walls and red lacquer posts, or solid walls.
    const wl = cx - Math.round(o.w / 2)
    const wr = cx + Math.round(o.w / 2)
    const inside = o.night ? '#6a3a20' : '#2a1614'
    g.rect(wl, eave + 3, wr - wl, floor - base - eave - 3, o.open ? inside : WHITE.d)
    if (o.open) {
      // Glimpse of the gilded ku and candles in the dark interior.
      g.rect(cx - 6, eave + 6, 12, 12, GOLD.d)
      g.poly(
        [
          [cx - 6, eave + 6],
          [cx, eave + 1],
          [cx + 6, eave + 6],
        ],
        GOLD.b,
      )
      g.rect(cx - 2, eave + 10, 4, 6, '#5a2a14')
      for (const x of [cx - 20, cx - 12, cx + 12, cx + 20]) g.px(x, eave + 14, o.night ? '#fff3a6' : '#ffb35a')
      g.rect(wl, floor - base - 7, wr - wl, 7, WHITE.b)
      g.hline(wl, wr - 1, floor - base - 7, WHITE.L)
      for (let x = wl; x < wr; x += 6) g.px(x + 3, floor - base - 4, GOLD.d)
      for (let x = wl + 2; x < wr; x += Math.round((wr - wl) / 7)) {
        g.rect(x, eave + 3, 3, floor - base - eave - 10, '#8a2432')
        g.px(x, eave + 5, GOLD.b)
        g.px(x + 1, eave + 9, GOLD.b)
      }
    } else {
      for (let x = wl + 10; x < wr - 8; x += 16) {
        g.rect(x, eave + 8, 6, 10, '#6e4a35')
        g.rect(x + 1, eave + 9, 4, 8, o.night ? '#ffe7a8' : '#8a2432')
      }
    }
    g.rect(wl, eave + 2, wr - wl, 2, '#5a3424')
    // Platform and stairs.
    g.rect(wl - 6, floor - base, wr - wl + 12, base, WHITE.b)
    g.hline(wl - 6, wr + 5, floor - base, WHITE.L)
    g.hline(wl - 6, wr + 5, floor - 1, WHITE.D)
    for (let x = wl - 6; x < wr + 6; x += 3) g.px(x, floor - base + 3, GOLD.d)
    for (let i = 0; i < 6; i++) {
      const y = floor - base + 2 + i * 3.4
      const half = 8 + i
      g.rect(cx - half, Math.round(y), half * 2 + 1, 3, WHITE.b)
      g.hline(cx - half, cx + half, Math.round(y), WHITE.L)
    }
    const naga = o.nagaColor ?? '#4fb06a'
    for (const s of [-1, 1]) {
      for (let i = 0; i < 20; i++) {
        const x = cx + s * (10 + i * 0.35)
        const y = floor - base + i
        g.rect(Math.round(x) - 1, Math.round(y), 3, 2, naga)
        if (i % 3 === 0) g.px(Math.round(x), Math.round(y), GOLD.b)
      }
      // Rearing naga head.
      const hx = cx + s * 17
      const hy = gy - 10
      g.circle(hx, hy, 3.5, naga)
      g.px(hx + s, hy - 1, P.ink)
      g.rect(hx - 3, hy - 7, 7, 3, GOLD.b)
      g.px(hx, hy - 8, GOLD.L)
    }
    hooks.glints = glints
    hooks.bells = bells
    hooks.candles = [
      { x: cx - 12, y: floor - base - 2 },
      { x: cx + 12, y: floor - base - 2 },
    ]
    hooks.inside = [{ x: cx, y: eave + 12 }]
  })
}

// ---------------------------------------------------------------------------
// Lampang Luang.

/** Phra That Lampang Luang: gilded Lanna chedi behind a bronze railing with corner parasols. */
export function goldenChediSprite(): Building {
  const w = 74
  const h = 196
  const W = w + 30
  const H = h + 8
  return build('lamchedi', W, H, W >> 1, H - 1, (g, hooks) => {
    const gy = H - 1 - 8
    const gold = (x: number, y: number, light: number) => {
      const plate = (x + (y >> 1)) % 5 === 0 || y % 4 === 0
      const k = light - (plate ? 0.08 : 0)
      return k > 0.66 ? GOLD.L : k > 0.5 ? GOLD.l : k > 0.36 ? GOLD.b : k > 0.22 ? GOLD.d : GOLD.D
    }
    const segs: Seg[] = [
      { h: 12, half: () => w / 2, ledge: true },
      { h: 10, half: () => w / 2 - 5, ledge: true },
      { h: 10, half: () => w / 2 - 10, ledge: true },
      { h: 6, half: () => w * 0.32, round: true, ledge: true },
      { h: 6, half: () => w * 0.29, round: true, ledge: true },
      { h: 6, half: () => w * 0.26, round: true, ledge: true },
      { h: 40, half: (t) => w * 0.3 * Math.sqrt(Math.max(0.05, 1 - t * t * 0.88)), round: true },
      { h: 8, half: () => w * 0.12, ledge: true },
      { h: 62, half: (t) => Math.max(0.8, w * 0.1 * (1 - t * 0.9)), round: true, paint: (_x, y, _u, _t, b) => (y % 4 === 0 ? mixHex(b, '#8a5222', 0.4) : null) },
      { h: 10, half: () => 0.8, round: true },
    ]
    const tw = paintTower(g, W / 2, gy, segs, gold, { ledgeLight: GOLD.L, ledgeShade: GOLD.d })
    // Gilded parasol (ฉัตร) at the top.
    const ty = tw.tops[tw.tops.length - 1]
    for (let i = 0; i < 4; i++) g.hline(W / 2 - 4 + i, W / 2 + 4 - i, ty + 18 - i * 5, GOLD.L)
    // Bronze railing (รั้วทองเหลือง) around the base with corner parasols.
    const fy = H - 1
    g.rect(2, fy - 12, W - 4, 2, '#9c6634')
    g.hline(2, W - 3, fy - 12, '#ecc47c')
    g.rect(2, fy - 4, W - 4, 2, '#7f4d28')
    for (let x = 3; x < W - 2; x += 3) {
      g.vline(x, fy - 11, fy - 2, x % 2 ? '#b98244' : '#d4a25a')
      g.px(x, fy - 13, '#ecc47c')
    }
    for (const x of [3, W - 4]) {
      g.rect(x - 1, fy - 34, 2, 32, '#9c6634')
      for (let i = 0; i < 4; i++) g.hline(x - 5 + i, x + 5 - i, fy - 32 + i * 5, '#d4a25a')
      g.px(x, fy - 36, GOLD.L)
    }
    hooks.glints = [
      { x: Math.round(W / 2), y: ty - 2 },
      { x: Math.round(W / 2) - 12, y: tw.tops[6] - 20 },
      { x: Math.round(W / 2) + 8, y: tw.tops[8] - 30 },
    ]
    hooks.fence = [{ x: Math.round(W / 2), y: fy }]
  })
}

/** Sacred bodhi (ต้นศรีมหาโพธิ์) held up by countless wooden crutches (ไม้ค้ำศรี). */
export function proppedBodhiSprite(): Building {
  const W = 110
  const H = 104
  return build('proppedbodhi', W, H, 55, H - 1, (g, hooks) => {
    const gy = H - 1
    g.ellipse(55, gy - 3, 30, 5, WHITE.D)
    g.ellipse(55, gy - 4, 29, 4.5, WHITE.b)
    for (let y = 50; y < gy - 4; y++) g.rect(49 - Math.round((y - 50) * 0.1), y, 12 + Math.round((y - 50) * 0.2), 1, y % 3 ? '#a08a7a' : '#8a7466')
    for (const [x1, y1] of [
      [20, 36],
      [92, 34],
      [55, 22],
    ] as [number, number][])
      g.thickLine(55, 56, x1, y1, 4, '#8a7466')
    // Dozens of crutches, many wrapped in cloth.
    for (let i = 0; i < 26; i++) {
      const v = hsh(i, 3, 5)
      const x0 = 12 + (i * 3.4) + (v % 3)
      const x1 = 26 + (v % 58)
      const y1 = 34 + (v % 16)
      g.line(x0, gy - 4, x1, y1, i % 2 ? '#c9a070' : '#9a6a45')
      g.px(x1 - 1, y1, '#c9a070')
      g.px(x1 + 1, y1, '#c9a070')
      if (i % 3 === 0) {
        const my = Math.round((gy - 4 + y1) / 2)
        const mx = Math.round((x0 + x1) / 2)
        g.rect(mx - 1, my, 3, 2, ['#e8514a', '#ffd23f', '#fffaf0'][i % 3])
      }
    }
    canopy(
      g,
      [
        [55, 28, 22],
        [28, 34, 15],
        [82, 34, 15],
        [38, 14, 13],
        [72, 14, 13],
        [55, 8, 10],
      ],
      LEAVES.bodhi,
      13,
    )
    hooks.canopy = [{ x: 55, y: 24 }]
  })
}

/** Ho Phra Phutthabat – the little Lanna pavilion where the chedi appears upside down. */
export function hoPhutthabatSprite(): Building {
  const W = 44
  const H = 56
  return build('hopbat', W, H, 22, H - 1, (g, hooks) => {
    const gy = H - 1
    g.rect(4, gy - 8, 36, 8, WHITE.b)
    g.hline(4, 39, gy - 8, WHITE.L)
    g.rect(8, 24, 28, gy - 32, WHITE.d)
    g.rect(32, 24, 4, gy - 32, WHITE.D)
    g.rect(18, 32, 8, 15, '#1a1014')
    g.px(22, 30, '#fff3a6')
    // Tiered Lanna roof.
    for (let i = 0; i < 3; i++) {
      const y = 24 - i * 7
      const hw = 20 - i * 5
      for (let k = 0; k < 7; k++) g.hline(22 - hw + k, 22 + hw - k, y - k, k % 3 === 0 ? LANNA_ROOF.fieldD : LANNA_ROOF.field)
      g.px(22 - hw - 1, y, GOLD.b)
      g.px(22 + hw + 1, y, GOLD.b)
    }
    g.vline(22, 0, 4, GOLD.b)
    g.px(22, 0, GOLD.L)
    hooks.hole = [{ x: 22, y: 30 }]
  })
}

/** Brick fortress wall segment with a crenellated Lanna top. */
export function fortWallSprite(len: number, seed = 0): Prop {
  return spr(`fortwall:${len}:${seed}`, len, 30, 0, 29, (g) => {
    bricks(g, 0, 8, len, 22, { seed, light: 0.52, slope: 0, moss: 0.3 })
    g.hline(0, len - 1, 7, BR.L)
    for (let x = 0; x < len; x += 8) {
      bricks(g, x, 1, 5, 7, { seed: seed + x, light: 0.62 })
      g.hline(x, x + 4, 0, BR.L)
    }
    g.hline(0, len - 1, 29, BR.D)
  })
}

/** Stucco arch gate (ซุ้มประตูโขง) with layered pediments. Hooks: glints. */
export function khongGateSprite(): Building {
  const W = 64
  const H = 86
  return build('khong', W, H, 32, H - 1, (g, hooks) => {
    const gy = H - 1
    const cx = 32
    const tiers: [number, number, number][] = [
      [gy - 42, 30, 12],
      [gy - 54, 24, 11],
      [gy - 65, 18, 10],
      [gy - 75, 12, 9],
    ]
    g.rect(4, gy - 42, 56, 42, WHITE.b)
    g.rect(4, gy - 42, 5, 42, WHITE.L)
    g.rect(55, gy - 42, 5, 42, WHITE.D)
    for (const [y, hw, h] of tiers) {
      g.rect(cx - hw, y - h, hw * 2, h, WHITE.b)
      g.hline(cx - hw, cx + hw - 1, y - h, WHITE.L)
      g.hline(cx - hw, cx + hw - 1, y - 1, WHITE.D)
      // Stucco flame fringe and gold dots.
      for (let x = cx - hw; x < cx + hw; x += 3) {
        g.px(x, y - h - 1, WHITE.d)
        g.px(x + 1, y - h - 2, WHITE.L)
        g.px(x + 1, y - h + 3, GOLD.d)
      }
      g.px(cx - hw - 1, y - 2, GOLD.b)
      g.px(cx + hw, y - 2, GOLD.b)
    }
    g.vline(cx, 0, 8, GOLD.b)
    g.px(cx, 0, GOLD.L)
    // Opening.
    for (let y = gy - 32; y <= gy; y++) {
      const k = y - (gy - 32)
      const hw = k < 8 ? Math.round(10 * Math.sqrt(1 - ((8 - k) / 8) ** 2)) : 10
      g.hline(cx - hw, cx + hw, y, y > gy - 8 ? '#ecd6ac' : '#b8a888')
    }
    g.rect(cx - 3, gy - 22, 6, 8, GOLD.d)
    hooks.glints = [
      { x: cx, y: 0 },
      { x: cx - 30, y: gy - 44 },
      { x: cx + 30, y: gy - 44 },
    ]
  })
}

/** Lampang horse carriage (รถม้า) with flowers, side view facing right. */
export function horseCarriageSprite(frame: number): Prop {
  const f = ((frame % 4) + 4) % 4
  return spr(`horsecart:${f}`, 60, 38, 30, 37, (g) => {
    // Carriage body.
    g.rect(4, 14, 26, 12, '#3a5a9a')
    g.hline(4, 29, 14, '#6a8ad0')
    g.rect(4, 24, 26, 2, '#2a3a6a')
    g.rect(8, 16, 16, 6, '#fff1d6')
    // Canopy and flowers.
    g.rect(2, 3, 30, 3, '#3a3040')
    g.hline(2, 31, 3, '#5a5068')
    for (const x of [4, 29]) g.rect(x, 6, 1, 8, '#8c8187')
    for (let x = 3; x < 31; x += 3) g.px(x, 2, x % 2 ? '#ff9fc0' : '#ffd23f')
    // Wheels (big rear, small front).
    const spin = f * 0.8
    for (const [x, y, r] of [
      [12, 29, 7],
      [30, 32, 4],
    ] as [number, number, number][]) {
      g.circle(x, y, r, '#6e4a35')
      g.circle(x, y, r - 1.2, 'rgba(0,0,0,0)')
      g.circle(x, y, r - 1.5, '#f3dcb2')
      for (let k = 0; k < 4; k++) {
        const a = spin + (k * Math.PI) / 4
        g.line(x - Math.cos(a) * (r - 1), y - Math.sin(a) * (r - 1), x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), '#6e4a35')
      }
      g.px(x, y, '#3a3040')
    }
    // Driver with a hat.
    g.rect(30, 11, 4, 6, '#fffaf0')
    g.circle(32, 9, 2, '#f0bd90')
    g.rect(29, 6, 7, 2, '#3a3040')
    g.rect(31, 5, 3, 1, '#3a3040')
    // Shafts and horse.
    g.line(32, 22, 44, 20, '#6e4a35')
    const lg = [0, 2, 0, -2][f]
    const H = '#8a5a3a'
    const HD = '#6e4230'
    g.rect(40 - lg, 26, 2, 11, HD)
    g.rect(52 + lg, 26, 2, 11, HD)
    g.ellipse(47, 22, 8, 5, H)
    g.ellipse(46, 20, 6, 3, '#a87050')
    g.rect(42 + lg, 26, 2, 11, H)
    g.rect(50 - lg, 26, 2, 11, H)
    g.thickLine(53, 20, 56, 12, 3, H)
    g.ellipse(57, 11, 3, 2, H)
    g.px(58, 10, P.ink)
    g.line(53, 14, 51, 20, '#3a3040')
    g.line(39, 19, 37, 26, '#3a3040')
    // Plume.
    g.px(55, 8, '#e8514a')
    g.px(55, 7, '#ffd23f')
  })
}

/** Rooster-bowl (ชามตราไก่) stall. */
export function chickenBowlStallSprite(): Prop {
  return stallBuilder('chickenbowl', {
    w: 50,
    kind: 'awning',
    roof: ['#e8514a', '#fffaf0'],
    body: '#9a6a45',
    goods: (g, x0, y0, w) => {
      const bowl = (x: number, y: number) => {
        g.ellipse(x, y, 4, 2.5, '#ffffff')
        g.ellipse(x, y + 1, 3.5, 1.6, '#eeeeee')
        g.px(x - 1, y, '#e8514a')
        g.px(x, y - 1, '#e8514a')
        g.px(x + 1, y, '#3a8a4a')
        g.hline(x - 3, x + 3, y - 2, '#3d63b5')
      }
      for (let i = 0; i < 5; i++) {
        bowl(x0 + 6 + i * 9, y0 - 3)
        if (i % 2 === 0) bowl(x0 + 6 + i * 9, y0 - 7)
      }
      // A big rooster sign.
      g.rect(x0 + w / 2 - 5, y0 - 20, 10, 9, '#fffaf0')
      g.rect(x0 + w / 2 - 2, y0 - 17, 4, 4, '#e8514a')
      g.px(x0 + w / 2 - 1, y0 - 19, '#e8514a')
      g.px(x0 + w / 2 + 2, y0 - 15, '#3a8a4a')
    },
  })
}

/** Khao taen (ข้าวแต๋น – Lampang rice crackers) stall. */
export function khaoTaenStallSprite(): Prop {
  return stallBuilder('khaotaen', {
    w: 44,
    kind: 'umbrella',
    roof: ['#6cc36a', '#fff1d6'],
    body: '#c28e5c',
    goods: (g, x0, y0, w) => {
      for (let i = 0; i < 6; i++) {
        const x = x0 + 5 + (i % 3) * 12
        const y = y0 - 3 - Math.floor(i / 3) * 5
        g.ellipse(x + 3, y, 4, 2, '#f8e8b8')
        g.px(x + 2, y, '#8a4a20')
        g.px(x + 4, y - 1, '#8a4a20')
        g.px(x + 3, y + 1, '#c07830')
      }
      g.rect(x0 + w - 8, y0 - 12, 5, 12, '#d4f1ff')
      g.rect(x0 + w - 7, y0 - 10, 3, 8, '#f8e8b8')
    },
  })
}

// ---------------------------------------------------------------------------
// Wat Phumin, Nan.

/** Cruciform ubosot carried by two nagas (front/south view). Hooks: glints, bells, candles. */
export function phuminUbosotSprite(night = false): Building {
  const W = 190
  const H = 176
  return build(`phumin:${night ? 1 : 0}`, W, H, 95, H - 1, (g, hooks) => {
    const cx = 95
    const gy = H - 1
    const floor = gy - 22
    const roof = NAN_ROOF
    const glints: Pt[] = []
    const bells: Pt[] = []
    // Side arms (east/west): their gables face sideways, we see the long roof slopes.
    for (const s of [-1, 1]) {
      const x0 = cx + s * 26
      const x1 = cx + s * 88
      for (let k = 0; k < 2; k++) {
        const ry = 70 + k * 16
        for (let y = ry; y < ry + 18; y++) {
          const c = (y - ry) % 3 === 0 ? roof.fieldD : y - ry < 3 ? roof.fieldL : roof.field
          g.hline(Math.min(x0, x1 + s * k * 4), Math.max(x0, x1 + s * k * 4), y, c)
        }
        g.hline(Math.min(x0, x1), Math.max(x0, x1), ry + 17, GOLD.d)
        bells.push({ x: x1 + s * k * 4, y: ry + 20 })
      }
      // Side-arm gable end seen at an angle.
      const gx = x1 + s * 2
      for (let i = 0; i < 26; i++) g.vline(gx + s * 0, 66 + i, 66 + i, '#9a2a2a')
      g.rect(Math.min(gx, gx + s * 6), 66, 6, 36, '#9a2a2a')
      for (let y = 68; y < 100; y += 3) g.px(gx + s * 3, y, GOLD.b)
      g.vline(gx + s * 6, 60, 102, GOLD.d)
      glints.push({ x: gx + s * 6, y: 60 })
      // Side-arm walls and doors (east and west entrances).
      g.rect(Math.min(x0, x1), 102, Math.abs(x1 - x0), floor - 102, WHITE.d)
      g.rect(Math.min(x0, x1), 102, Math.abs(x1 - x0), 3, WHITE.DD)
      const dx = cx + s * 64
      g.rect(dx - 5, floor - 22, 10, 22, night ? '#ffe7a8' : '#7e2436')
      g.rect(dx - 6, floor - 24, 12, 2, GOLD.b)
      for (let y = floor - 20; y < floor; y += 4) g.px(dx, y, GOLD.b)
    }
    // Central roof mass and the little spire (ยอดมณฑป).
    for (let y = 26; y < 76; y++) {
      const hw = 12 + (y - 26) * 0.8
      g.hline(Math.round(cx - hw), Math.round(cx + hw), y, (y - 26) % 4 === 0 ? roof.fieldD : roof.field)
    }
    for (let i = 0; i < 5; i++) g.hline(cx - 6 + i, cx + 6 - i, 24 - i * 3, i % 2 ? GOLD.d : GOLD.b)
    g.vline(cx, 4, 12, GOLD.b)
    g.px(cx, 3, GOLD.L)
    glints.push({ x: cx, y: 3 })
    // Front (south) arm: stepped Lanna gables.
    for (let t = 1; t >= 0; t--) {
      const hw = 32 - t * 6
      const b = 96 - t * 14
      const a = b - 28
      roofBand(g, cx, a, cx - hw - 8, b + 8, 9, roof, 3)
      roofBand(g, cx, a, cx + hw + 8, b + 8, 9, roof, 3)
      glints.push(...lannaGable(g, cx, a, hw, b, t ? '#7a2020' : '#9a2a2a'))
    }
    // Front arm walls, the south door and windows.
    g.rect(cx - 26, 100, 52, floor - 100, WHITE.b)
    g.rect(cx - 26, 100, 52, 3, WHITE.DD)
    g.rect(cx - 7, floor - 26, 14, 26, night ? '#ffe7a8' : '#7e2436')
    g.rect(cx - 9, floor - 29, 18, 3, GOLD.b)
    g.vline(cx, floor - 26, floor - 1, GOLD.D)
    for (let y = floor - 23; y < floor; y += 4) {
      g.px(cx - 4, y, GOLD.b)
      g.px(cx + 3, y, GOLD.b)
    }
    for (const x of [cx - 19, cx + 15]) {
      g.rect(x, floor - 22, 5, 10, '#6e4a35')
      g.rect(x + 1, floor - 21, 3, 8, night ? '#ffe7a8' : '#8a2432')
    }
    // Platform.
    g.rect(8, floor, W - 16, 8, WHITE.b)
    g.hline(8, W - 9, floor, WHITE.L)
    for (let x = 8; x < W - 8; x += 3) g.px(x, floor + 3, GOLD.d)
    g.hline(8, W - 9, floor + 7, WHITE.D)
    // The two nagas: bodies run along the base, heads rear up at the front stair.
    const N = '#3f9a5a'
    const ND = '#2c6e44'
    for (const s of [-1, 1]) {
      for (let x = 10; x < 86; x++) {
        const px = cx + s * (100 - x)
        const y = floor + 9 + Math.round(Math.sin(x * 0.22) * 1.5)
        g.rect(px, y, 1, 5, N)
        g.px(px, y + 4, ND)
        if (x % 3 === 0) g.px(px, y + 1, GOLD.b)
        if (x % 3 === 1) g.px(px, y + 2, '#fff1c4')
      }
      // Tails curling up at the far corners.
      const tx = cx + s * 90
      g.thickLine(tx, floor + 10, tx + s * 4, floor - 6, 3, N)
      g.px(tx + s * 4, floor - 8, GOLD.b)
      // Heads rearing at the front.
      const hx = cx + s * 18
      g.thickLine(cx + s * 14, gy - 2, hx, gy - 20, 5, N)
      g.circle(hx + s, gy - 22, 5, N)
      g.circle(hx + s, gy - 23, 4, '#5cbf73')
      g.px(hx + s * 3, gy - 24, P.ink)
      g.rect(hx - 4, gy - 32, 10, 4, GOLD.b)
      for (let i = 0; i < 5; i++) g.px(hx - 4 + i * 2, gy - 33, GOLD.L)
      g.px(hx + s * 5, gy - 20, '#e8514a')
    }
    // Front stair between the nagas.
    for (let i = 0; i < 5; i++) {
      const y = floor + 8 + i * 3
      g.rect(cx - 9 - i, y, 19 + i * 2, 3, WHITE.b)
      g.hline(cx - 9 - i, cx + 9 + i, y, WHITE.L)
    }
    hooks.glints = glints
    hooks.bells = bells
    hooks.candles = [
      { x: cx - 12, y: floor - 3 },
      { x: cx + 12, y: floor - 3 },
    ]
  })
}

/** Nan-style drum/bell tower (หอกลอง). */
export function drumTowerSprite(): Prop {
  return spr('drumtower', 36, 70, 18, 69, (g) => {
    for (const x of [6, 28]) g.rect(x, 30, 3, 40, '#6e4a35')
    g.rect(4, 44, 28, 3, '#8a5e40')
    g.rect(4, 64, 28, 6, WHITE.b)
    // Big drum.
    g.ellipse(18, 38, 9, 6, '#b8343f')
    g.ellipse(14, 38, 3, 5.5, '#f3dcb2')
    g.hline(10, 26, 38, GOLD.d)
    for (let i = 0; i < 4; i++) {
      const y = 30 - i * 7
      const hw = 17 - i * 4
      for (let k = 0; k < 7; k++) g.hline(18 - hw + k, 18 + hw - k, y - k, k % 3 === 0 ? NAN_ROOF.fieldD : NAN_ROOF.field)
      g.px(18 - hw - 1, y, GOLD.b)
      g.px(18 + hw + 1, y, GOLD.b)
    }
    g.vline(18, 0, 4, GOLD.b)
  })
}

/** Nan hand-woven cloth stall (ผ้าทอลายน้ำไหล). */
export function clothStallSprite(): Prop {
  return stallBuilder('nancloth', {
    w: 50,
    kind: 'awning',
    roof: ['#3d63b5', '#fffaf0'],
    body: '#8a5e40',
    goods: (g, x0, y0, w) => {
      g.hline(x0 + 3, x0 + w - 4, y0 - 22, '#6e4a35')
      const cols: [Color, Color][] = [
        ['#3d63b5', '#fffaf0'],
        ['#b8343f', '#ffd23f'],
        ['#3a3040', '#e8514a'],
        ['#6cc36a', '#fffaf0'],
        ['#9270dc', '#ffd23f'],
        ['#e8514a', '#3d63b5'],
      ]
      cols.forEach(([a, b], i) => {
        const x = x0 + 4 + i * 7
        g.rect(x, y0 - 21, 6, 15, a)
        // Flowing-water zigzags (ลายน้ำไหล).
        for (let y = y0 - 19; y < y0 - 7; y += 3) {
          g.px(x + 1 + ((y >> 1) % 3), y, b)
          g.px(x + 2 + ((y >> 1) % 3), y + 1, b)
        }
      })
      for (let i = 0; i < 4; i++) {
        const [a, b] = cols[(i + 2) % cols.length]
        g.rect(x0 + 4 + i * 11, y0 - 4, 9, 4, a)
        g.hline(x0 + 4 + i * 11, x0 + 12 + i * 11, y0 - 3, b)
      }
    },
  })
}

/** Nan golden orange (ส้มสีทอง) stall. */
export function orangeStallSprite(): Prop {
  return stallBuilder('nanorange', {
    w: 42,
    kind: 'umbrella',
    roof: ['#f58f35', '#fff1d6'],
    body: '#c28e5c',
    goods: (g, x0, y0, w) => {
      for (let i = 0; i < 14; i++) {
        const x = x0 + 5 + (i % 7) * 5
        const y = y0 - 2 - Math.floor(i / 7) * 3
        g.circle(x, y, 2.2, i % 3 ? '#f5a030' : '#e8b030')
        g.px(x - 1, y - 1, '#ffd070')
      }
      g.rect(x0 + w - 8, y0 - 8, 6, 8, '#fffaf0')
      g.rect(x0 + w - 7, y0 - 6, 4, 5, '#f5a030')
    },
  })
}

/** Lanna tung banner (ตุง) on a bamboo pole. */
export function drawTung(g: Surface, x: number, y: number, t: number, color: Color, seed = 0) {
  g.vline(x, y - 50, y, '#c8b060')
  g.hline(x - 3, x + 3, y - 50, '#c8b060')
  for (let i = 0; i < 30; i++) {
    const sway = Math.round(Math.sin(t * 1.6 + i * 0.25 + seed) * (i / 12))
    const c = i % 8 < 1 ? '#fffaf0' : color
    g.hline(x + 1 + sway, x + 5 + sway, y - 49 + i, c)
    if (i % 8 === 4) g.px(x + 3 + sway, y - 49 + i, GOLD.b)
  }
  const tail = Math.round(Math.sin(t * 1.6 + seed + 7) * 3)
  g.px(x + 2 + tail, y - 18, color)
  g.px(x + 4 + tail, y - 18, color)
}

// ---------------------------------------------------------------------------
// Wat Phumin interior pieces.

/** The four Buddhas seated back to back around a central pillar (south face in front). */
export function fourBuddhasSprite(): Building {
  const W = 150
  const H = 136
  return build('fourbuddhas', W, H, 75, H - 1, (g, hooks) => {
    const cx = 75
    const gy = H - 1
    // Square gilded throne.
    const tiers: [number, number][] = [
      [9, 66],
      [8, 60],
      [7, 54],
    ]
    let y = gy
    for (const [h, hw] of tiers) {
      y -= h
      g.rect(cx - hw, y, hw * 2, h, P.redD)
      g.rect(cx - hw, y, hw * 2, 2, GOLD.b)
      g.hline(cx - hw, cx + hw - 1, y, GOLD.L)
      for (let x = cx - hw + 3; x < cx + hw - 3; x += 4) g.px(x, y + 5, GOLD.l)
    }
    const seat = y - 1
    // Central pillar behind (north face hidden).
    g.rect(cx - 8, 10, 16, seat - 10, GOLD.d)
    g.rect(cx - 8, 10, 5, seat - 10, GOLD.b)
    for (let i = 0; i < 4; i++) g.hline(cx - 10 + i, cx + 10 - i, 10 - i * 2, GOLD.b)
    // East and west images seen from the side (smaller, darker gold).
    const side = buddhaSculpt('lanna', 0.56)
    for (const s of [-1, 1]) {
      const c = document.createElement('canvas')
      c.width = side.canvas.width
      c.height = side.canvas.height
      const ctx = c.getContext('2d')!
      ctx.globalAlpha = 1
      ctx.drawImage(side.canvas, 0, 0)
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = 'rgba(80,30,10,0.28)'
      ctx.fillRect(0, 0, c.width, c.height)
      drawSculpt(g, { canvas: c, ox: side.ox, oy: side.oy }, cx + s * 40, seat - 4)
    }
    // The south-facing principal image in front.
    drawBuddhaHD(g, cx, seat, 0.74, 'lanna')
    hooks.glints = [
      { x: cx, y: seat - 66 },
      { x: cx - 40, y: seat - 50 },
      { x: cx + 40, y: seat - 50 },
    ]
    hooks.candles = [
      { x: cx - 58, y: gy - 26 },
      { x: cx + 58, y: gy - 26 },
    ]
  })
}

/** Tai Lue mural panel with the whispering couple (ปู่ม่านย่าม่าน) and village life. */
export function drawWhisperMural(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#e8d8b4')
  g.rect(x, y, w, 3, '#9a3a2c')
  g.rect(x, y + h - 3, w, 3, '#9a3a2c')
  // Soft landscape.
  for (let i = 0; i < w; i += 11) g.circle(x + i, y + h - 12 + ((i * 7) % 5), 5, '#a8c090')
  // Village figures in Tai Lue dress.
  const fig = (fx: number, fy: number, top: Color, skirt: Color, female: boolean) => {
    g.rect(fx - 1, fy - 12, 3, 3, '#e8c498')
    g.hline(fx - 1, fx + 1, fy - 13, '#2a1e20')
    if (female) g.px(fx + 2, fy - 13, '#2a1e20')
    g.rect(fx - 2, fy - 9, 5, 4, top)
    g.rect(fx - 2, fy - 5, 5, 5, skirt)
    if (female) for (let k = 0; k < 5; k++) g.px(fx - 2 + k, fy - 3, '#e8514a')
  }
  for (let i = 0; i < 6; i++) {
    const fx = x + 10 + i * 16
    if (fx > x + w * 0.45 && fx < x + w * 0.8) continue
    fig(fx, y + h - 5, ['#3f7d5f', '#e9e1c8', '#4f6fa8'][i % 3], ['#6a4a8a', '#9a3a2c', '#3a3040'][i % 3], i % 2 === 0)
  }
  // The couple, larger: he leans in to whisper in her ear.
  const cx = Math.round(x + w * 0.62)
  const by = y + h - 5
  // Woman (ย่าม่าน).
  g.rect(cx + 4, by - 22, 5, 5, '#f0cca0')
  g.rect(cx + 3, by - 24, 7, 2, '#2a1e20')
  g.px(cx + 9, by - 25, '#2a1e20')
  g.px(cx + 5, by - 20, '#2a1e20')
  g.px(cx + 6, by - 18, '#e89088')
  g.rect(cx + 3, by - 17, 7, 6, '#fffaf0')
  g.rect(cx + 3, by - 11, 7, 11, '#6a2a5a')
  for (let k = 0; k < 7; k++) g.px(cx + 3 + k, by - 6, '#e8b44a')
  // Man (ปู่ม่าน), bare-chested with tattooed thighs, cloth over the shoulder.
  g.rect(cx - 4, by - 23, 5, 5, '#e0b488')
  g.rect(cx - 4, by - 25, 5, 2, '#2a1e20')
  g.px(cx, by - 21, '#2a1e20')
  g.rect(cx - 5, by - 18, 6, 7, '#e0b488')
  g.line(cx - 5, by - 18, cx, by - 12, '#9a3a2c')
  g.rect(cx - 5, by - 11, 6, 4, '#3a2a5a')
  g.rect(cx - 5, by - 7, 6, 7, '#5a4a6a')
  // His hand at her ear.
  g.line(cx, by - 16, cx + 3, by - 21, '#e0b488')
  // Little speech marks and a heart.
  g.px(cx + 2, by - 27, '#9a3a2c')
  g.px(cx + 3, by - 28, '#9a3a2c')
  g.px(cx + 5, by - 29, '#e8709e')
  g.px(cx + 4, by - 30, '#e8709e')
  g.px(cx + 6, by - 30, '#e8709e')
}

export { WHITE, GOLD }
