// Cute plush (ตุ๊กตา) collectibles: soft chibi plushies drawn with the food
// kit's shaded forms on a 26×26 canvas (the collectible sprite size) –
// fuzzy soft shading, stitched seams, shiny button eyes, blush cheeks and a
// tiny sewn-in tag. Each motif reads the item's palette [main, accent,
// detail] so one plush design can come in several colourways. Used by
// art/collectibles.ts for every collectible of kind 'plush' whose motif is
// drawn here (others keep the generic motif-on-base art).

import { mix } from '../engine/pixel'
import type { Sprite } from '../engine/sprite'
import type { CollectibleDef } from '../game/data/collectibleTypes'
import { M, Pix, type Ramp } from './foodKit'

export const PLUSH_SIZE = 26

const EYE = '#2a1826'
const BLUSH = '#ff9aa6'
const BLUSH_L = '#ffc4cc'

/** Soft fabric ramp: gentle contrast, warm lights, plum shades. */
function soft(m: string): Ramp {
  return {
    hi: mix(m, '#ffffff', 0.62),
    l: mix(m, '#fff4e0', 0.28),
    m,
    s: mix(m, '#6a3a66', 0.24),
    d: mix(m, '#3a1c3a', 0.42),
  }
}

interface Pal {
  main: Ramp
  acc: Ramp
  det: Ramp
  /** Raw hex values. */
  raw: [string, string, string]
}

function pal(p: [string, string, string]): Pal {
  return { main: soft(p[0]), acc: soft(p[1]), det: soft(p[2]), raw: p }
}

// ---------------------------------------------------------------------------
// Pieces

/** Plush ball: soft light, no hard glint, a fuzzy highlight blob. */
function puff(k: Pix, cx: number, cy: number, rx: number, ry: number, r: Ramp, sep: boolean | 'down' = false) {
  k.ball(cx, cy, rx, ry, r, { lightAt: 0.5, spec: false, sep })
  if (rx >= 3) {
    k.on(cx - rx * 0.45, cy - ry * 0.55, r.hi)
    k.on(cx - rx * 0.45 + 1, cy - ry * 0.55, mix(r.hi, r.l, 0.5))
  }
}

/** Shiny button eye (2×2) with a white glint and a thread dimple. */
function eye(k: Pix, x: number, y: number, big = false) {
  k.rect(x, y, 2, big ? 3 : 2, EYE)
  k.px(x, y, '#ffffff')
  if (big) k.px(x + 1, y + 2, '#5a3a5a')
}

function blush(k: Pix, x: number, y: number) {
  k.px(x, y, BLUSH)
  k.px(x + 1, y, BLUSH_L)
}

/** Dotted stitch line from (x0,y0) to (x1,y1) in colour c. */
function stitch(k: Pix, x0: number, y0: number, x1: number, y1: number, c: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= n; i += 2) k.on(x0 + ((x1 - x0) * i) / Math.max(1, n), y0 + ((y1 - y0) * i) / Math.max(1, n), c)
}

/** Tiny sewn-in tag on the lower right. */
function tag(k: Pix, x = 20, y = 19) {
  k.form(M.paper, (m) => m.rect(x, y, 3, 4, '#000'), 'bevel')
  k.hline(x, x + 2, y, '#e8514a')
  k.px(x + 1, y + 2, '#ff9fc0')
}

/** Sitting chibi body: feet, round body with a stitched belly, arms. */
function body(k: Pix, p: Pal, belly: Ramp | null, o: { cy?: number; rx?: number; ry?: number; arms?: boolean; feet?: boolean } = {}) {
  const cy = o.cy ?? 18
  const rx = o.rx ?? 6.5
  const ry = o.ry ?? 4.6
  if (o.feet !== false) {
    puff(k, 9, cy + 3.6, 2.8, 1.9, p.main)
    puff(k, 17, cy + 3.6, 2.8, 1.9, p.main)
  }
  puff(k, 13, cy, rx, ry, p.main, 'down')
  if (belly) {
    k.form(belly, (m) => m.ell(13, cy + 0.6, rx * 0.56, ry * 0.66, '#000'), 'ball', { lightAt: 0.4, spec: false, rim: false })
    stitch(k, 13 - rx * 0.56 + 1, cy - ry * 0.3, 13 + rx * 0.56 - 1, cy - ry * 0.3, belly.s)
  }
  if (o.feet !== false) {
    k.px(8, cy + 4, p.acc.l)
    k.px(9, cy + 4, p.acc.m)
    k.px(16, cy + 4, p.acc.l)
    k.px(17, cy + 4, p.acc.m)
  }
  if (o.arms !== false) {
    puff(k, 6.4, cy - 0.4, 2.2, 2.6, p.main, true)
    puff(k, 19.6, cy - 0.4, 2.2, 2.6, p.main, true)
  }
}

/** Round head with a seam across the crown. */
function head(k: Pix, r: Ramp, cx = 13, cy = 10, rx = 8.4, ry = 6.6) {
  puff(k, cx, cy, rx, ry, r, 'down')
  stitch(k, cx, cy - ry + 1, cx, cy - ry + 3, r.s)
}

// ---------------------------------------------------------------------------
// Motifs

type PlushDraw = (k: Pix, p: Pal) => void

const PLUSH: Record<string, PlushDraw> = {
  hippo(k, p) {
    // หมูดึ๋ง: pygmy hippo, wide snout, tiny ears, rosy cheeks.
    body(k, p, soft(mix(p.raw[0], '#ffffff', 0.35)))
    puff(k, 7, 4.4, 1.8, 1.6, p.main)
    puff(k, 19, 4.4, 1.8, 1.6, p.main)
    k.px(7, 4, p.acc.m)
    k.px(19, 4, p.acc.m)
    head(k, p.main, 13, 10, 8.6, 6.2)
    const sn = soft(mix(p.raw[0], '#ffe8f0', 0.38))
    k.form(sn, (m) => m.ell(13, 13, 6, 3.2, '#000'), 'ball', { lightAt: 0.45, spec: false, rim: false })
    k.px(11, 12, sn.d)
    k.px(15, 12, sn.d)
    k.hline(12, 14, 15, sn.s)
    eye(k, 8, 8)
    eye(k, 16, 8)
    k.rect(5, 11, 2, 2, p.acc.m)
    k.px(5, 11, p.acc.l)
    k.rect(19, 11, 2, 2, p.acc.m)
    k.px(19, 11, p.acc.l)
    tag(k)
  },
  cat(k, p) {
    // แมวส้ม: pointy ears, forehead stripes, ω mouth, striped tail.
    k.form(p.main, (m) => m.thick(20, 20, 23, 14, 1.2, '#000'), 'ball', { lightAt: 0.5, spec: false })
    k.on(22, 16, p.main.s)
    k.on(21, 18, p.main.s)
    body(k, p, p.acc)
    k.form(p.main, (m) => {
      m.poly([[5, 8], [6, 1.5], [11, 5]], '#000')
      m.poly([[21, 8], [20, 1.5], [15, 5]], '#000')
    }, 'bevel')
    k.px(7, 4, BLUSH)
    k.px(19, 4, BLUSH)
    head(k, p.main, 13, 10.4, 8.6, 6.2)
    for (const x of [11, 13, 15]) k.vline(x, 5, 6, p.main.s)
    eye(k, 8.5, 9.5)
    eye(k, 15.5, 9.5)
    blush(k, 6, 12)
    blush(k, 18, 12)
    k.px(13, 12, BLUSH)
    k.px(12, 13, EYE)
    k.px(14, 13, EYE)
    k.px(13, 13, p.main.s)
    k.fx(3, 11, p.main.d)
    k.fx(23, 11, p.main.d)
    tag(k, 3, 19)
  },
  monkey(k, p) {
    // ลิงแสม (Khao Sam Muk): big side ears, pale heart-shaped face, stolen sunglasses.
    k.form(p.main, (m) => m.thick(20, 20, 24, 13, 1.1, '#000'), 'ball', { lightAt: 0.5, spec: false })
    body(k, p, p.acc)
    for (const x of [4.6, 21.4]) {
      puff(k, x, 10, 2.4, 2.6, p.main)
      k.ball(x, 10.2, 1.2, 1.4, p.acc, { spec: false })
    }
    head(k, p.main, 13, 10, 8, 6.4)
    k.form(p.acc, (m) => {
      m.ell(10.5, 10.5, 3.2, 3, '#000')
      m.ell(15.5, 10.5, 3.2, 3, '#000')
      m.ell(13, 13.4, 3.8, 2.4, '#000')
    }, 'ball', { spec: false, rim: false })
    k.rect(7, 8, 5, 2, p.det.m)
    k.rect(14, 8, 5, 2, p.det.m)
    k.hline(12, 14, 8, p.det.m)
    k.px(8, 8, p.det.l)
    k.px(15, 8, p.det.l)
    k.px(12, 13, EYE)
    k.px(14, 13, EYE)
    k.hline(12, 14, 14, p.acc.s)
    blush(k, 7, 12)
    blush(k, 19, 12)
    tag(k)
  },
  teddy(k, p) {
    // หมี: round ears, big muzzle, red bow tie.
    body(k, p, p.acc)
    for (const x of [6, 20]) {
      puff(k, x, 4.6, 2.8, 2.6, p.main)
      k.ball(x, 4.8, 1.4, 1.2, p.acc, { spec: false })
    }
    head(k, p.main)
    k.form(p.acc, (m) => m.ell(13, 12.6, 3.6, 2.6, '#000'), 'ball', { spec: false, rim: false })
    k.rect(12, 11, 3, 2, EYE)
    k.px(12, 11, '#6a4a5a')
    k.px(13, 14, EYE)
    eye(k, 8, 8.5)
    eye(k, 16, 8.5)
    blush(k, 5, 12)
    blush(k, 19, 12)
    // Bow tie.
    k.form(M.red, (m) => {
      m.poly([[9, 15], [13, 16.5], [9, 18]], '#000')
      m.poly([[17, 15], [13, 16.5], [17, 18]], '#000')
    }, 'bevel')
    k.px(13, 16, M.red.d)
    tag(k)
  },
  frog(k, p) {
    // กบหน้างง: bulging eyes on top, wide mouth, yellow belly.
    body(k, p, p.acc)
    head(k, p.main, 13, 11, 8.8, 5.6)
    for (const x of [7.5, 18.5]) {
      puff(k, x, 5.4, 3.2, 3, p.main)
      k.form(M.cream, (m) => m.ell(x, 5.6, 2.1, 2, '#000'), 'ball', { spec: false, rim: false })
    }
    k.rect(7, 5, 2, 2, EYE)
    k.px(7, 5, '#ffffff')
    k.rect(18, 6, 2, 2, EYE)
    k.px(18, 6, '#ffffff')
    // Puzzled mouth.
    k.line(8, 13, 11, 14, p.main.d)
    k.line(11, 14, 15, 13, p.main.d)
    k.line(15, 13, 18, 14, p.main.d)
    blush(k, 5, 12)
    blush(k, 19, 12)
    tag(k)
  },
  mango(k, p) {
    // ข้าวเหนียวมะม่วง: a mango plush napping on a sticky-rice cushion.
    const rice = soft(p.raw[1])
    k.form(rice, (m) => m.ell(13, 19.5, 10.5, 3.6, '#000'), 'ball', { lightAt: 0.4, spec: false })
    k.speckle(3, 17, 23, 22, rice.s, 10, 5)
    k.speckle(3, 17, 23, 22, rice.hi, 6, 9)
    k.form(p.main, (m) => m.poly([[3, 12], [6, 6], [12, 4], [19, 5], [23, 10], [22, 16], [16, 19], [7, 18.5], [3.5, 16]], '#000'), 'ball', { cx: 12, cy: 11, rx: 10, ry: 7.5, lightAt: 0.5, spec: false, sep: 'down' })
    k.px(8, 7, p.main.hi)
    k.px(9, 7, p.main.l)
    k.form(soft(p.raw[2]), (m) => m.poly([[17, 5], [21, 0.5], [23, 3], [19, 6]], '#000'), 'bevel')
    k.px(17, 4, M.brown.m)
    eye(k, 9, 11)
    eye(k, 15, 11)
    blush(k, 7, 14)
    blush(k, 16, 14)
    k.px(12, 14, EYE)
    k.px(13, 15, EYE)
    k.px(14, 14, EYE)
    stitch(k, 5, 13, 5, 16, p.main.s)
    tag(k, 21, 18)
  },
  dino(k, p) {
    // ไดโนน้อย wearing a checked ผ้าขาวม้า sash.
    k.form(p.main, (m) => m.thick(19, 20, 24, 17, 1.6, '#000'), 'ball', { lightAt: 0.5, spec: false })
    body(k, p, soft(mix(p.raw[0], '#fffaf0', 0.55)))
    // Sash.
    for (let i = 0; i < 12; i++) {
      const x = 7 + i
      const y = 14 + Math.round(i * 0.35)
      k.on(x, y, (i >> 1) % 2 ? p.acc.m : '#fffaf0')
      k.on(x, y + 1, (i >> 1) % 2 ? '#fffaf0' : p.acc.s)
    }
    // Back spikes.
    for (const [x, y] of [[9, 3], [13, 2], [17, 3]] as [number, number][]) k.form(p.acc, (m) => m.poly([[x - 1.8, y + 2.4], [x, y - 1], [x + 1.8, y + 2.4]], '#000'), 'bevel')
    head(k, p.main, 13, 9.6, 8.4, 6)
    eye(k, 8, 8)
    eye(k, 16, 8)
    k.px(11, 12, p.main.d)
    k.px(15, 12, p.main.d)
    k.hline(12, 14, 13, p.main.s)
    blush(k, 5, 11)
    blush(k, 19, 11)
    k.px(9, 13, '#ffffff')
    tag(k, 2, 19)
  },
  turtle(k, p) {
    // เต่าน้อย: peeking head, domed patterned shell, stubby legs.
    const skin = soft(mix(p.raw[0], '#c8f0a0', 0.45))
    puff(k, 6, 21, 2.6, 2, skin)
    puff(k, 20, 21, 2.6, 2, skin)
    puff(k, 13, 7, 6, 5, skin, 'down')
    eye(k, 9.5, 6)
    eye(k, 14.5, 6)
    blush(k, 8, 9)
    blush(k, 16, 9)
    k.hline(12, 14, 9, skin.d)
    k.form(p.main, (m) => m.ell(13, 16.4, 10, 6, '#000'), 'ball', { lightAt: 0.5, spec: false, sep: 'down' })
    k.form(p.acc, (m) => m.ell(13, 20.5, 10, 1.8, '#000'), 'bevel')
    for (const [x, y] of [[13, 13], [8, 16], [18, 16], [13, 18]] as [number, number][]) {
      k.form(soft(mix(p.raw[0], p.raw[1], 0.3)), (m) => m.ell(x, y, 2.4, 1.8, '#000'), 'ball', { spec: false, rim: false })
      stitch(k, x - 2, y, x + 2, y, p.main.d)
    }
    k.px(8, 13, p.main.hi)
    tag(k, 21, 15)
  },
  rat(k, p) {
    // หนูกระซิบพร: huge round ears, pointy pink nose, curly tail.
    k.line(20, 21, 23, 18, BLUSH)
    k.line(23, 18, 22, 15, BLUSH)
    body(k, p, soft(p.raw[2]))
    for (const x of [5.5, 20.5]) {
      puff(k, x, 5, 3.8, 3.8, p.main)
      k.ball(x, 5.4, 2.2, 2.2, p.acc, { spec: false })
    }
    head(k, p.main, 13, 11, 7.6, 6)
    eye(k, 9, 10)
    eye(k, 15, 10)
    k.form(p.acc, (m) => m.ell(13, 13.4, 1.4, 1, '#000'), 'ball')
    blush(k, 7, 13)
    blush(k, 17, 13)
    k.px(12, 15, EYE)
    k.px(14, 15, EYE)
    tag(k)
  },
  buffalo(k, p) {
    // ควายน้อย: curved cream horns, pink snout, fringe tuft.
    body(k, p, soft(mix(p.raw[0], '#ffffff', 0.4)))
    const horn = soft(p.raw[1])
    k.form(horn, (m) => {
      m.thick(6, 6, 2.5, 3, 1.1, '#000')
      m.thick(2.5, 3, 3.5, 0.8, 0.8, '#000')
      m.thick(20, 6, 23.5, 3, 1.1, '#000')
      m.thick(23.5, 3, 22.5, 0.8, 0.8, '#000')
    }, 'bevel')
    head(k, p.main, 13, 10.4, 8.4, 6.2)
    k.px(12, 4, p.main.d)
    k.px(14, 4, p.main.d)
    k.px(13, 5, p.main.d)
    const sn = soft(p.raw[2])
    k.form(sn, (m) => m.ell(13, 13.6, 4.6, 2.4, '#000'), 'ball', { spec: false, rim: false })
    k.px(11, 13, sn.d)
    k.px(15, 13, sn.d)
    eye(k, 8, 9)
    eye(k, 16, 9)
    blush(k, 5, 12)
    blush(k, 19, 12)
    tag(k)
  },
  durian(k, p) {
    // ทุเรียนหมอนทอง: soft spikes, tiny stem, sleepy smile.
    const r = p.main
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      k.form(r, (m) => m.poly([[13 + Math.cos(a - 0.2) * 8.4, 12.5 + Math.sin(a - 0.2) * 7.6], [13 + Math.cos(a) * 11, 12.5 + Math.sin(a) * 10], [13 + Math.cos(a + 0.2) * 8.4, 12.5 + Math.sin(a + 0.2) * 7.6]], '#000'), 'bevel')
    }
    puff(k, 13, 12.5, 9.2, 8.4, r)
    for (let y = 7; y <= 19; y += 3) for (let x = 7 + ((y / 3) % 2) * 1.5; x <= 19; x += 3) k.on(x, y, r.s)
    k.form(M.brown, (m) => m.rect(12, 1, 2, 3, '#000'), 'bevel')
    k.px(10, 13, EYE)
    k.px(11, 12, EYE)
    k.px(15, 12, EYE)
    k.px(16, 13, EYE)
    blush(k, 7, 15)
    blush(k, 17, 15)
    k.px(13, 16, p.acc.d)
    k.px(12, 15, p.acc.d)
    k.px(14, 15, p.acc.d)
    // A peek of creamy flesh through a split.
    k.form(p.acc, (m) => m.ell(13, 19.5, 3, 1.6, '#000'), 'ball', { spec: false, rim: false })
    tag(k, 20, 19)
  },
  lizard(k, p) {
    // ตัวเงินตัวทอง: dark monitor with golden spots and a forked tongue.
    k.form(p.main, (m) => {
      m.thick(19, 21, 23, 17, 1.8, '#000')
      m.thick(23, 17, 23, 12, 1.3, '#000')
    }, 'ball', { lightAt: 0.5, spec: false })
    body(k, p, null)
    head(k, p.main, 13, 10, 8, 5.8)
    // Golden rosette spots in neat rows.
    for (const [x, y] of [[8, 5], [13, 4], [18, 5], [5, 9], [21, 9], [8, 17], [18, 17], [13, 19], [22, 14]] as [number, number][]) {
      k.on(x, y, p.acc.m)
      k.on(x + 1, y, p.acc.s)
    }
    k.form(soft(mix(p.raw[0], '#fff6d0', 0.4)), (m) => m.ell(13, 13.4, 5, 1.8, '#000'), 'ball', { spec: false, rim: false })
    eye(k, 8, 8)
    eye(k, 16, 8)
    k.px(13, 15, '#ff6f91')
    k.px(13, 16, '#ff6f91')
    k.px(12, 17, '#ff6f91')
    k.px(14, 17, '#ff6f91')
    blush(k, 5, 11)
    blush(k, 19, 11)
    tag(k, 2, 19)
  },
  dog(k, p) {
    // หมาวัดหน้าบึ้ง: floppy ears, stern brows, secretly soft.
    body(k, p, p.acc)
    head(k, p.main, 13, 10.4, 8, 6.4)
    for (const x of [4.6, 21.4]) k.form(p.det, (m) => m.ell(x, 10, 2.4, 4.2, '#000'), 'ball', { spec: false, lightAt: 0.5 })
    k.form(p.acc, (m) => m.ell(13, 13.2, 3.8, 2.6, '#000'), 'ball', { spec: false, rim: false })
    k.rect(12, 11, 3, 2, EYE)
    k.px(12, 11, '#6a4a5a')
    eye(k, 8, 9)
    eye(k, 16, 9)
    k.line(7, 7, 10, 8, p.det.d)
    k.line(19, 7, 16, 8, p.det.d)
    k.hline(12, 14, 15, EYE)
    blush(k, 6, 12)
    blush(k, 18, 12)
    tag(k)
  },
  elephant(k, p) {
    // ช้างน้อย: big flappy ears, curled trunk, a red Thai saddle cloth.
    const ear = p.main
    for (const x of [4, 22]) {
      puff(k, x, 10, 4, 5.4, ear)
      k.ell(x, 10.4, 2.4, 3.6, mix(BLUSH_L, ear.m, 0.4))
    }
    body(k, p, null, { cy: 18.4 })
    // Saddle cloth.
    k.form(p.acc, (m) => m.poly([[8, 15], [18, 15], [19, 20], [7, 20]], '#000'), 'bevel')
    k.hline(8, 18, 19, M.gold.m)
    k.px(13, 17, M.gold.l)
    head(k, p.main, 13, 9.4, 7, 6)
    // Trunk curling up at the tip.
    k.form(p.main, (m) => {
      m.thick(13, 12, 13, 16, 1.5, '#000')
      m.thick(13, 16, 15.5, 16.5, 1.1, '#000')
    }, 'cyl', { sep: 'down' })
    for (const y of [13, 15]) k.on(12, y, p.main.s)
    k.px(16, 15, p.main.l)
    eye(k, 9, 8)
    eye(k, 15, 8)
    blush(k, 7, 11)
    blush(k, 17, 11)
    k.px(10, 13, '#fffaf0')
    k.px(16, 13, '#fffaf0')
    tag(k)
  },
  rooster(k, p) {
    // ไก่ชนนำโชค: red comb, yellow beak, glossy dark tail feathers.
    const tail = soft(p.raw[2])
    for (const [x1, y1] of [[23, 5], [24, 9], [22, 2]] as [number, number][]) k.form(tail, (m) => m.thick(17, 14, x1, y1, 1.6, '#000'), 'ball', { lightAt: 0.4, spec: false })
    body(k, p, soft(mix(p.raw[0], '#ffe8a0', 0.4)), { arms: false })
    puff(k, 6.4, 17, 2.6, 3.2, soft(mix(p.raw[0], p.raw[2], 0.3)), true)
    head(k, p.main, 12, 10, 7, 6)
    k.form(M.red, (m) => {
      m.ell(10, 3.6, 1.6, 1.8, '#000')
      m.ell(12.6, 3, 1.7, 2, '#000')
      m.ell(15, 3.8, 1.5, 1.6, '#000')
    }, 'ball', { spec: false })
    k.form(M.yolk, (m) => m.poly([[11, 11], [15, 11], [13, 14]], '#000'), 'bevel')
    k.form(M.red, (m) => m.ell(13, 15.6, 1.2, 1.6, '#000'), 'ball', { spec: false })
    eye(k, 8, 8)
    eye(k, 15, 8)
    blush(k, 6, 11)
    blush(k, 17, 11)
    k.form(M.yolk, (m) => {
      m.rect(8, 22, 2, 2, '#000')
      m.rect(16, 22, 2, 2, '#000')
    }, 'bevel')
    tag(k, 20, 18)
  },
  naga(k, p) {
    // พญานาคน้อย: coiled serpent with a golden crest and scale stitches.
    const r = p.main
    k.form(r, (m) => m.ell(13, 19.6, 10, 3.6, '#000'), 'ball', { lightAt: 0.5, spec: false })
    k.form(r, (m) => m.ell(13, 15.4, 7.6, 3, '#000'), 'ball', { lightAt: 0.5, spec: false, sep: 'down' })
    for (let x = 5; x <= 21; x += 3) stitch(k, x, 19, x + 1, 20, r.s)
    for (let x = 8; x <= 18; x += 3) k.on(x, 15, r.s)
    k.form(soft(p.raw[1]), (m) => m.ell(13, 20.6, 7, 1.2, '#000'), 'bevel')
    head(k, r, 13, 8.6, 6.6, 5.2)
    // Crest (หงอน) fanning up.
    k.form(soft(p.raw[2]), (m) => {
      m.poly([[8, 5], [7, 0.5], [10.5, 3.5]], '#000')
      m.poly([[13, 4], [13, -0.5], [15, 3.5], [11, 3.5]], '#000')
      m.poly([[18, 5], [19, 0.5], [15.5, 3.5]], '#000')
    }, 'bevel')
    k.px(13, 1, '#ffffff')
    eye(k, 9, 8)
    eye(k, 15, 8)
    blush(k, 7, 11)
    blush(k, 17, 11)
    k.px(13, 12, '#ff6f91')
    k.px(12, 13, '#ff6f91')
    k.px(14, 13, '#ff6f91')
    tag(k, 21, 17)
  },
  monster(k, p) {
    // ลาบูบุญ blind-box monster: tall bunny ears, fuzzy fur, toothy grin.
    body(k, p, null)
    for (const x of [8, 18]) {
      k.form(p.main, (m) => m.ell(x, 4.4, 2.2, 4.6, '#000'), 'ball', { lightAt: 0.5, spec: false })
      k.ell(x, 4.8, 1, 3, p.det.m)
    }
    head(k, p.main, 13, 11, 8, 6)
    k.form(soft(p.raw[1]), (m) => m.ell(13, 12, 5.4, 4, '#000'), 'ball', { spec: false, rim: false })
    k.speckle(4, 5, 22, 21, p.main.l, 10, 3, [p.main.m])
    eye(k, 9, 10, true)
    eye(k, 15, 10, true)
    // The famous mischievous grin: nine tiny teeth.
    k.hline(9, 17, 14, EYE)
    for (let x = 9; x <= 17; x++) k.px(x, 14, x % 2 ? '#ffffff' : '#f0e4e8')
    k.hline(10, 16, 15, EYE)
    blush(k, 7, 13)
    blush(k, 17, 13)
    tag(k)
  },
  mookata(k, p) {
    // ตุ๊กตาหมูกระทะ: a smiling brass dome grill in its moat of soup, pork
    // slices and a butter cube on top.
    const brass = soft('#e0b060')
    k.form(soft('#9a9aae'), (m) => m.ell(13, 19.2, 11, 4.2, '#000'), 'bevel')
    k.form(soft('#f8a860'), (m) => m.ell(13, 18.6, 9.6, 3, '#000'), 'ball', { lightAt: 0.4, spec: false, rim: false })
    k.px(5, 18, M.green.m)
    k.px(6, 19, M.green.l)
    k.px(20, 19, M.cream.l)
    k.px(19, 18, M.cream.m)
    k.form(brass, (m) => m.ell(13, 13, 8.4, 7.2, '#000'), 'ball', { lightAt: 0.5, spec: false, sep: 'down' })
    // Grill slots.
    for (const [x, y] of [[7, 10], [19, 10], [6, 14], [20, 14]] as [number, number][]) k.on(x, y, brass.d)
    // Pork belly slices with white fat stripes.
    for (const [x, y] of [[8.6, 7.4], [14, 6], [17.6, 8.4]] as [number, number][]) {
      k.form(soft(p.raw[1]), (m) => m.ell(x, y, 2.6, 1.4, '#000'), 'ball', { spec: false, rim: false })
      k.hline(Math.round(x - 1), Math.round(x + 1), Math.round(y), '#fff6f0')
    }
    k.form(M.yolk, (m) => m.rect(12, 3, 3, 2, '#000'), 'bevel')
    eye(k, 9, 12)
    eye(k, 15, 12)
    blush(k, 7, 15)
    blush(k, 17, 15)
    k.px(12, 15, EYE)
    k.px(13, 16, EYE)
    k.px(14, 15, EYE)
    k.fx(5, 4, 'rgba(238,230,242,0.9)')
    k.fx(6, 3, 'rgba(238,230,242,0.6)')
    k.fx(20, 3, 'rgba(238,230,242,0.9)')
    k.fx(21, 2, 'rgba(238,230,242,0.6)')
    tag(k, 21, 19)
  },
  friedegg(k, p) {
    // ตุ๊กตาไข่ดาว: squishy egg-white pillow, big smiling yolk.
    const w = soft(p.raw[1])
    k.form(w, (m) => {
      m.ell(12, 14, 10, 7, '#000')
      m.ell(18, 10, 5, 5, '#000')
      m.ell(6, 18, 4, 3.6, '#000')
    }, 'ball', { cx: 12.5, cy: 13, rx: 11, ry: 8.5, lightAt: 0.45, spec: false })
    // Crispy golden lace along the edge.
    for (const [x, y] of [[3, 17], [4, 20], [20, 18], [21, 15], [9, 21]] as [number, number][]) k.on(x, y, M.crispy.m)
    stitch(k, 4, 12, 7, 8, w.s)
    const y = soft(p.raw[0])
    k.form(y, (m) => m.ell(13, 13, 5.4, 4.6, '#000'), 'ball', { lightAt: 0.6, spec: false, sep: 'down' })
    k.px(10, 10, '#ffffff')
    k.px(11, 10, y.hi)
    eye(k, 10, 12)
    eye(k, 15, 12)
    blush(k, 8, 15)
    blush(k, 17, 15)
    k.px(12, 15, y.d)
    k.px(13, 16, y.d)
    k.px(14, 15, y.d)
    tag(k, 20, 19)
  },
}

// A giant loaf-shaped orange cat for แมวส้มยักษ์.
PLUSH.bigcat = (k, p) => {
  const r = p.main
  k.form(r, (m) => {
    m.ell(13, 15, 11.4, 7.6, '#000')
    m.poly([[4, 10], [5, 2], [10.5, 7]], '#000')
    m.poly([[22, 10], [21, 2], [15.5, 7]], '#000')
  }, 'ball', { cx: 13, cy: 13, rx: 12, ry: 10, lightAt: 0.5, spec: false })
  k.px(6, 5, BLUSH)
  k.px(20, 5, BLUSH)
  for (const x of [11, 13, 15]) k.vline(x, 8, 10, r.s)
  for (const y of [15, 18]) {
    k.line(2, y, 5, y + 1, r.s)
    k.line(24, y, 21, y + 1, r.s)
  }
  k.form(p.acc, (m) => m.ell(13, 18.6, 5.4, 3.2, '#000'), 'ball', { spec: false, rim: false })
  eye(k, 8, 12)
  eye(k, 16, 12)
  blush(k, 5, 15)
  blush(k, 19, 15)
  k.px(13, 14, BLUSH)
  k.px(12, 15, EYE)
  k.px(14, 15, EYE)
  // Paws tucked in front.
  puff(k, 9.5, 21.6, 2.6, 1.6, r)
  puff(k, 16.5, 21.6, 2.6, 1.6, r)
  tag(k, 21, 18)
}

// Aliases for motif names used by existing items.
const ALIAS: Record<string, string> = { bear: 'teddy', monitor: 'lizard', labubu: 'monster', egg: 'friedegg', pig: 'mookata' }

export const PLUSH_MOTIFS = Object.keys(PLUSH)

export function hasPlushArt(motif: string): boolean {
  return !!PLUSH[motif] || !!PLUSH[ALIAS[motif] ?? '']
}

/** Diagonal foil glint and twinkles for epic / legendary plushies. */
function foil(ctx: CanvasRenderingContext2D, w: number, h: number, legendary: boolean) {
  const img = ctx.getImageData(0, 0, w, h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (img.data[i + 3] < 200) continue
      const d = x + y
      const a = d === 15 || d === 16 ? 0.5 : d === 17 ? 0.3 : legendary && (d === 31 || d === 32) ? 0.4 : 0
      if (!a) continue
      img.data[i] += (255 - img.data[i]) * a
      img.data[i + 1] += (255 - img.data[i + 1]) * a
      img.data[i + 2] += (240 - img.data[i + 2]) * a
    }
  ctx.putImageData(img, 0, 0)
}

/** Finished 26×26 plush sprite for a collectible (outline, shadow, foil). */
export function plushSprite(c: CollectibleDef): Sprite {
  const k = new Pix(PLUSH_SIZE, PLUSH_SIZE)
  const draw = PLUSH[c.art.motif] ?? PLUSH[ALIAS[c.art.motif] ?? ''] ?? PLUSH.teddy
  draw(k, pal(c.art.palette))
  const epic = c.rarity === 'epic' || c.rarity === 'legendary' || !!c.art.foil
  if (epic) {
    const star = (x: number, y: number, col: string) => {
      k.fx(x, y, '#ffffff')
      k.fx(x - 1, y, col)
      k.fx(x + 1, y, col)
      k.fx(x, y - 1, col)
      k.fx(x, y + 1, col)
    }
    star(2, 3, '#fff3a6')
    star(23, 13, c.rarity === 'legendary' ? '#ffd6ff' : '#fff3a6')
  }
  const s = k.finish()
  if (epic) foil(s.canvas.getContext('2d')!, s.w, s.h, c.rarity === 'legendary')
  return s
}
