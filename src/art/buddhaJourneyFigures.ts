// Figures for the Buddha-journey map.
//
// The Buddha (and the Bodhisatta) is shown as Thai murals do: a serene gold
// figure with the ushnisha and flame finial (รัศมีเปลว), elongated ears and a
// robe over the left shoulder, never comic. These are "sculpted" with the
// same little analytic 3D renderer as the prayer-hall images (hall.ts) in the
// canonical postures (ปาง): subduing Māra, meditation, first sermon,
// standing, holding the bowl and the Parinibbāna. Everyone else is hand
// pixelled, in the livelier manner murals use for ordinary people.

import { createCanvas, type Surface } from '../engine/pixel'
import { cached, makeSprite, type Palette, type Sprite } from '../engine/sprite'
import { buddhaSculpt, GOLD_RAMP, sculpt, type Sculpted, type SculptDetail, type SculptOpts } from './hall'
import { J } from './buddhaJourneyPaint'

type Prim = SculptOpts['prims'][number]
type V3 = [number, number, number]

const E = (x: number, y: number, z: number, rx: number, ry: number, rz: number, part: number, minY?: number): Prim => ({ t: 0, x, y, z, rx, ry, rz, part, minY })
const C = (a: V3, b: V3, ra: number, rb: number, part: number, minY?: number, zk = 1): Prim => ({
  t: 1,
  ax: a[0],
  ay: a[1],
  az: a[2],
  bx: b[0],
  by: b[1],
  bz: b[2],
  ra,
  rb,
  part,
  minY,
  zk,
})
const M = (m: number, ...ps: Prim[]): Prim[] => {
  for (const p of ps) p.m = m
  return ps
}

/** Cloth ramp (royal red) for the prince's garments; index 0 is the outline. */
const RED_RAMP = ['#3a0e0a', '#5e1810', '#7e2016', '#9c2c1c', '#b8382a', '#cf4a32', '#e0643e', '#ef8a5a', '#f8b48a'] as const
/** Pillow / couch cloth. */
const CLOTH_RAMP = ['#2a1020', '#4a1830', '#6a2440', '#8a3050', '#a83e60', '#c25272', '#d86e88', '#e890a4', '#f4b8c4'] as const

// ---------------------------------------------------------------------------
// Face and head detail shared by the poses (a simplified buddhaDetail)

function headDetail(d: SculptDetail, hx: number, hy: number) {
  const fine = d.s >= 0.5
  // Curls on the hair and ushnisha (parts 3 above the hairline, 7).
  const hairline = (x: number) => hy + 8.4 - 0.022 * (x - hx) * (x - hx)
  d.each((i, j, lx, ly, part) => {
    const hair = (part === 3 && ly > hairline(lx)) || part === 7
    if (!hair) return
    if ((i + j) % 2 === 0) d.add(i, j, -1)
  })
  d.curve(hx - 8.4, hx + 8.4, hairline, -2)
  // Downcast eyes and a gentle smile.
  d.curve(hx - 6.2, hx - 2.1, (x) => hy + 3.1 - 0.09 * (x - hx + 4.2) * (x - hx + 4.2), -3)
  d.curve(hx + 2.1, hx + 6.2, (x) => hy + 3.1 - 0.09 * (x - hx - 4.2) * (x - hx - 4.2), -3)
  d.line(hx + 0.7, hy + 5, hx + 0.7, hy + 0.4, -1)
  d.line(hx - 2.2, hy - 2.6, hx + 2.2, hy - 2.6, -2)
  if (fine) d.curve(hx - 3.7, hx + 3.7, (x) => hy - 12.4 + 0.03 * (x - hx) * (x - hx), -1)
}

/** Head, neck, ears, ushnisha and flame finial at head centre (hx, hy). */
function headPrims(hx: number, hy: number, z = 2): Prim[] {
  return [
    E(hx, hy, z, 9, 10.8, 9, 3),
    E(hx, hy - 6.2, z + 1.6, 6, 4.8, 6.4, 3),
    C([hx - 8.7, hy + 4.2, z - 1.5], [hx - 9.4, hy - 6.6, z - 0.5], 1.05, 1.6, 8),
    C([hx + 8.7, hy + 4.2, z - 1.5], [hx + 9.4, hy - 6.6, z - 0.5], 1.05, 1.6, 8),
    E(hx, hy + 11.1, z - 0.5, 6.2, 4.6, 5.5, 7),
    C([hx, hy + 14.5, z - 0.5], [hx, hy + 33.5, z - 0.5], 2.9, 0.35, 11),
  ]
}

/** Crossed legs (the lap) shared by the seated postures. */
function lapPrims(): Prim[] {
  return [
    E(0, 7.4, 0, 31, 7.6, 11, 1, 0),
    E(-28.5, 6.2, 3, 10, 6.6, 9.5, 1, 0),
    E(28.5, 6.2, 3, 10, 6.6, 9.5, 1, 0),
    C([28, 5.5, 6], [-8, 7, 8], 4.6, 4.2, 1, 0),
    C([-29, 7.6, 9], [12, 10.8, 13], 4.8, 3.8, 9, 0),
    E(18.6, 11.8, 13.6, 6.8, 2.8, 3, 10),
  ]
}

function torsoPrims(sh = 1, thin = 1): Prim[] {
  return [
    E(0, 17, 1.5, 11 * sh * thin, 7, 8.4 * thin, 2),
    C([0, 18, 0.5], [0, 33, 0.5], 9.6 * sh * thin, 14.2 * sh * thin, 2, undefined, 0.62),
    E(0, 35.5, 1, 16.4 * sh, 11.5 * thin, 8.4 * thin, 2),
    C([-15.4 * sh, 40.6, 0], [0, 43.2, 0], 5 * thin, 5 * thin, 2, undefined, 0.9),
    C([15.4 * sh, 40.6, 0], [0, 43.2, 0], 5 * thin, 5 * thin, 2, undefined, 0.9),
    C([0, 43, 0.5], [0, 50, 1.5], 4.4 * thin, 4 * thin, 2),
  ]
}

function robeDetail(d: SculptDetail, s: number) {
  // Robe edge across the chest leaving the right shoulder bare.
  const robe = (x: number) => 30.5 + ((x + 14) / 19.5) * 15 - 0.02 * (x + 4) * (x + 4)
  d.curve(-14, 5.2, robe, -2)
  d.curve(-13.5, 4.8, (x) => robe(x) - 1 / s, 1)
  // Sash over the left shoulder.
  d.line(4.4, 45.5, 4.4, 20.5, -2)
  d.line(9.2, 44.5, 9.2, 20.5, -1)
}

const figCache = new Map<string, Sculpted>()
function sculptOnce(key: string, make: () => Sculpted): Sculpted {
  let r = figCache.get(key)
  if (!r) {
    r = make()
    figCache.set(key, r)
  }
  return r
}

export type SeatedPose = 'earth' | 'meditate' | 'teach' | 'fasting'

/** A seated gold Buddha / Bodhisatta; lap bottom centre = origin. */
export function seatedBuddha(pose: SeatedPose, s: number): Sculpted {
  if (pose === 'earth') return buddhaSculpt('sukhothai', s)
  const q = Math.round(s * 40) / 40
  return sculptOnce(`seat:${pose}:${q}`, () => {
    const thin = pose === 'fasting' ? 0.72 : 1
    const arms: Prim[] = []
    const armR = 4.1 * thin
    // Image's left arm (viewer's right) rests in the lap in every pose here.
    arms.push(C([17.4, 41.4, 0], [22, 27, 2], 5.1 * thin, armR, 5), C([22, 27, 2], [6, 15, 10], 4 * thin, 3 * thin, 5))
    if (pose === 'teach') {
      // Right hand raised before the chest (วิตรรกะ: teaching).
      arms.push(C([-17.4, 41.4, 0], [-23, 28, 4], 5.1, 4.1, 4), C([-23, 28, 4], [-15.5, 38.5, 11], 4, 3, 4), E(-15, 42, 12, 2.8, 4, 2.4, 6))
      arms.push(E(3, 14.4, 11.4, 6, 2.6, 3, 6))
    } else {
      // Both hands in the lap (สมาธิ).
      arms.push(C([-17.4, 41.4, 0], [-22, 27, 2], 5.1 * thin, armR, 4), C([-22, 27, 2], [-6, 15, 10], 4 * thin, 3 * thin, 4))
      arms.push(E(0, 14.2, 11.4, 7, 2.6, 3, 6), E(0.5, 15.6, 12.4, 6, 2, 2.4, 6))
    }
    const prims = [...lapPrims(), ...torsoPrims(1, thin), ...headPrims(0, 60), ...arms]
    return sculpt({
      prims,
      s: q,
      x0: -38,
      x1: 38,
      y0: -1,
      y1: 96,
      ramps: [GOLD_RAMP],
      rim: 0.34,
      spec: [14, 0.55],
      detail: (d) => {
        headDetail(d, 0, 60)
        robeDetail(d, d.s)
        if (pose === 'fasting') {
          // Ribs and hollow cheeks, drawn gently.
          for (let k = 0; k < 4; k++) d.curve(-7, 7, (x) => 36 - k * 3.2 + 0.05 * x * x, -1)
          d.line(-5.5, 56, -5, 53, -1)
          d.line(5.5, 56, 5, 53, -1)
        }
      },
    })
  })
}

export type StandPose = 'abhaya' | 'bowl'

/** A standing gold Buddha; feet centre = origin. */
export function standingBuddha(pose: StandPose, s: number): Sculpted {
  const q = Math.round(s * 40) / 40
  return sculptOnce(`stand:${pose}:${q}`, () => {
    const prims: Prim[] = [
      // Robe to the ankles, feet peeping out.
      E(-5, 2, 6, 4.4, 2.4, 4, 12),
      E(5, 2, 6, 4.4, 2.4, 4, 12),
      C([0, 6, 0.5], [0, 52, 0.5], 13, 10.5, 1, 0, 0.7),
      E(0, 58, 1, 11.5, 8, 7.5, 2),
      C([0, 60, 0.5], [0, 78, 0.5], 9.2, 13.4, 2, undefined, 0.62),
      E(0, 80, 1, 15.6, 10.5, 8, 2),
      C([-14.6, 85, 0], [0, 87.2, 0], 4.8, 4.8, 2, undefined, 0.9),
      C([14.6, 85, 0], [0, 87.2, 0], 4.8, 4.8, 2, undefined, 0.9),
      C([0, 87, 0.5], [0, 94, 1.5], 4.2, 3.8, 2),
      ...headPrims(0, 104),
    ]
    if (pose === 'abhaya') {
      // Right hand raised, palm out (ประทานอภัย / ห้ามญาติ); left arm down.
      prims.push(C([-16.6, 85, 0], [-20, 68, 3], 4.8, 3.9, 4), C([-20, 68, 3], [-15, 80, 11], 3.8, 2.9, 4), E(-14.5, 84, 12, 2.9, 4.2, 2.2, 6))
      prims.push(C([16.6, 85, 0], [19.5, 66, 1], 4.8, 3.9, 5), C([19.5, 66, 1], [18.5, 48, 3], 3.8, 3, 5), E(18.2, 44.5, 3.5, 2.6, 3.8, 2.4, 6))
    } else {
      // Holding the alms bowl before the body (อุ้มบาตร).
      prims.push(C([-16.6, 85, 0], [-18.5, 68, 4], 4.8, 3.9, 4), C([-18.5, 68, 4], [-7, 62, 12], 3.8, 3, 4))
      prims.push(C([16.6, 85, 0], [18.5, 68, 4], 4.8, 3.9, 5), C([18.5, 68, 4], [7, 62, 12], 3.8, 3, 5))
      prims.push(...M(1, E(0, 61, 13, 9, 6.5, 5, 13)))
    }
    return sculpt({
      prims,
      s: q,
      x0: -26,
      x1: 26,
      y0: -1,
      y1: 139,
      ramps: [GOLD_RAMP, pose === 'bowl' ? ['#140c0a', '#24160e', '#342016', '#462c1e', '#5a3a26', '#6e4a30', '#86603e', '#a07a50', '#bc9a6a'] : GOLD_RAMP],
      rim: 0.34,
      spec: [14, 0.5],
      detail: (d) => {
        headDetail(d, 0, 104)
        // Robe folds and hem.
        d.line(-11, 8, 11, 8, -2)
        d.curve(-12, 12, (x) => 60 + 0.01 * x * x, -1)
        for (const x of [-6, 0, 6]) d.line(x, 12, x * 1.2, 50, -1)
        const robe = (x: number) => 75 + ((x + 14) / 19.5) * 14 - 0.02 * (x + 4) * (x + 4)
        d.curve(-14, 5, robe, -2)
      },
    })
  })
}

/**
 * The Parinibbāna: lying on the right side, head on a pillow to the viewer's
 * left, left arm along the body; origin = centre of the body's underside.
 */
export function recliningBuddha(s: number): Sculpted {
  const q = Math.round(s * 40) / 40
  return sculptOnce(`recline:${q}`, () => {
    // The head's "up" points to -x (towards the pillow end).
    const hx = -44
    const hy = 22
    const prims: Prim[] = [
      // Pillow (หมอนขวาน) under the head.
      ...M(1, C([-60, 7, 0], [-38, 7, 0], 8, 8, 20, 0, 0.8)),
      // Body under the robe: shoulders → hips → legs stacked, feet at the right.
      E(-24, 16, 1, 15, 11, 9, 2),
      C([-24, 14, 1], [6, 11, 1], 10.5, 10, 2, undefined, 0.8),
      E(8, 11, 1, 12, 9.5, 9, 1),
      C([8, 8, 1], [52, 7, 2], 8.5, 6.2, 1, undefined, 0.8),
      C([8, 13, 5], [52, 12, 5], 7.5, 5.8, 1, undefined, 0.8),
      E(56, 9.5, 5, 3.4, 6, 3.8, 12),
      // Left arm lying along the body.
      C([-28, 24, 8], [-2, 20, 10], 4.2, 3.4, 5),
      C([-2, 20, 10], [22, 17, 10], 3.4, 2.8, 5),
      E(25, 16.5, 10, 3.6, 2.4, 2.4, 6),
      // Right arm tucked forward along the pillow.
      C([-34, 12, 10], [-48, 8, 12], 3.8, 3.2, 4),
      // Neck and head.
      C([-32, 20, 3], [-38, 21, 3], 4.6, 4.2, 2),
      E(hx, hy, 3, 10.8, 9, 9, 3),
      E(hx + 6.2, hy - 0.5, 4.6, 4.8, 6, 6.4, 3),
      C([hx - 4.2, hy - 8.7, 1.5], [hx + 6.6, hy - 9.4, 2.5], 1.05, 1.6, 8),
      E(hx - 11.1, hy, 2.5, 4.6, 6.2, 5.5, 7),
      C([hx - 14.5, hy, 2.5], [hx - 33, hy + 1, 2.5], 2.9, 0.35, 11),
    ]
    return sculpt({
      prims,
      s: q,
      x0: -80,
      x1: 62,
      y0: -2,
      y1: 36,
      ramps: [GOLD_RAMP, CLOTH_RAMP],
      rim: 0.3,
      spec: [14, 0.5],
      detail: (d) => {
        // Hair curls, closed eyes and the robe folds.
        d.each((i, j, lx, _ly, part) => {
          if ((part === 3 && lx < hx - 5) || part === 7) if ((i + j) % 2 === 0) d.add(i, j, -1)
        })
        d.line(hx + 2.4, hy + 2.2, hx + 2.4, hy + 5.5, -3)
        d.line(hx + 2.4, hy - 2.2, hx + 2.4, hy - 5.5, -3)
        d.line(hx + 7.6, hy - 2, hx + 7.6, hy + 2, -2)
        for (const x of [-10, 20, 36]) d.line(x, 3, x + 3, 18, -1)
        d.line(-36, 4, 60, 2, -1)
      },
    })
  })
}

/**
 * Prince Siddhattha (the Bodhisatta before his renunciation): gold skin,
 * royal red cloth. 'palace' is seated and crowned with hands in the lap;
 * 'sword' has put the crown aside and raises the sword to cut his topknot.
 * Origin = lap bottom centre.
 */
export function princeSculpt(pose: 'palace' | 'sword', s: number): Sculpted {
  const q = Math.round(s * 40) / 40
  return sculptOnce(`prince:${pose}:${q}`, () => {
    const hy = 60
    const prims: Prim[] = [
      ...M(1, ...lapPrims()),
      ...torsoPrims(1, 0.95),
      // Head and ears with ornaments.
      E(0, hy, 2, 9, 10.8, 9, 3),
      E(0, hy - 6.2, 3.6, 6, 4.8, 6.4, 3),
      C([-8.7, hy + 4.2, 0.5], [-9.4, hy - 6.6, 1.5], 1.05, 1.6, 8),
      C([8.7, hy + 4.2, 0.5], [9.4, hy - 6.6, 1.5], 1.05, 1.6, 8),
      E(-9.6, hy - 9, 2, 1.6, 2.4, 1.6, 14),
      E(9.6, hy - 9, 2, 1.6, 2.4, 1.6, 14),
      // Necklace and armlets.
      C([-9, 44, 6], [9, 44, 6], 1.6, 1.6, 15),
    ]
    if (pose === 'palace') {
      // Crown (ชฎา): a band and a tall tapering spire.
      prims.push(E(0, hy + 9, 2, 9.2, 3.2, 8.4, 16), C([0, hy + 10, 2], [0, hy + 36, 2], 7.4, 0.6, 16))
      prims.push(C([-17.4, 41.4, 0], [-22, 27, 2], 5.1, 4.1, 4), C([-22, 27, 2], [-6, 15, 10], 4, 3, 4))
      prims.push(C([17.4, 41.4, 0], [22, 27, 2], 5.1, 4.1, 5), C([22, 27, 2], [6, 15, 10], 4, 3, 5))
      prims.push(E(0, 14.2, 11.4, 7, 2.6, 3, 6))
    } else {
      // Black topknot held up in the left hand; sword raised in the right.
      prims.push(...M(3, E(0, hy + 8, 1, 8.6, 5, 7.6, 17), E(4, hy + 15, 2, 4, 4.4, 3.6, 17)))
      prims.push(C([-17.4, 41.4, 0], [-26, 55, 3], 5.1, 4.1, 4), C([-26, 55, 3], [-21, 72, 6], 4, 3, 4), E(-20.5, 74, 6.5, 3.2, 3.4, 3, 6))
      prims.push(...M(2, C([-20.5, 76, 6.5], [-12, 108, 6.5], 1.6, 0.8, 18)), ...M(0, C([-24.5, 75.5, 6.5], [-16.5, 77.5, 6.5], 1.3, 1.3, 19)))
      prims.push(C([17.4, 41.4, 0], [24, 55, 2], 5.1, 4.1, 5), C([24, 55, 2], [10, 70, 5], 4, 3, 5), E(8, 71, 6, 3, 3.2, 3, 6))
    }
    return sculpt({
      prims,
      s: q,
      x0: -38,
      x1: 38,
      y0: -1,
      y1: pose === 'palace' ? 98 : 110,
      ramps: [GOLD_RAMP, RED_RAMP, ['#101820', '#28323c', '#48525c', '#6a747e', '#8e98a2', '#b0bac4', '#ccd6de', '#e4ecf2', '#ffffff'], ['#0a0808', '#141010', '#1e1818', '#282020', '#342a28', '#403430', '#4c3e38', '#5a4a42', '#6a584e']],
      rim: 0.34,
      spec: [14, 0.55],
      detail: (d) => {
        // Downcast eyes and a calm mouth.
        d.curve(-6.2, -2.1, (x) => hy + 3.1 - 0.09 * (x + 4.2) * (x + 4.2), -3)
        d.curve(2.1, 6.2, (x) => hy + 3.1 - 0.09 * (x - 4.2) * (x - 4.2), -3)
        d.line(-2.2, hy - 2.6, 2.2, hy - 2.6, -2)
        if (pose === 'palace') for (let k = 0; k < 4; k++) d.curve(-7, 7, (x) => hy + 13 + k * 5 + 0.02 * x * x, -2)
        // Sash across the lap.
        d.curve(-24, 24, (x) => 12 + 0.004 * x * x, -2)
      },
    })
  })
}

/**
 * The newborn prince standing on a lotus, right hand raised to the sky and
 * the left pointing to the earth; origin = between the feet.
 */
export function babyBuddha(s: number): Sculpted {
  const q = Math.round(s * 40) / 40
  return sculptOnce(`baby:${q}`, () =>
    sculpt({
      prims: [
        C([-4.2, 1, 2], [-4.5, 24, 2], 3.8, 4.6, 1),
        C([4.2, 1, 2], [4.5, 24, 2], 3.8, 4.6, 1),
        E(0, 34, 2.5, 10.5, 13, 8.5, 2),
        E(0, 46, 1.5, 11, 7, 7, 2),
        C([0, 48, 1], [0, 54, 1.5], 3.6, 3.4, 2),
        E(0, 63, 2, 10.5, 11, 9.5, 3),
        C([-9.8, 66, 0.5], [-10.4, 58, 1.5], 1.2, 1.8, 8),
        C([9.8, 66, 0.5], [10.4, 58, 1.5], 1.2, 1.8, 8),
        ...M(1, E(0, 75, 1, 4.6, 4.2, 4, 7)),
        // Right hand to the sky, left hand to the earth.
        C([-10.5, 48, 1], [-15, 64, 2.5], 3.4, 2.9, 4),
        C([-15, 64, 2.5], [-13.5, 82, 3.5], 2.9, 2.3, 4),
        C([-13.5, 82, 3.5], [-13.2, 91, 3.5], 1.3, 0.9, 6),
        C([10.5, 48, 1], [14.5, 34, 3], 3.4, 2.9, 5),
        C([14.5, 34, 3], [15.5, 20, 4], 2.9, 2.3, 5),
        C([15.5, 20, 4], [15.6, 13, 4], 1.3, 0.9, 6),
      ],
      s: q,
      x0: -22,
      x1: 22,
      y0: -1,
      y1: 95,
      ramps: [GOLD_RAMP, ['#0a0808', '#141010', '#1e1818', '#282020', '#342a28', '#403430', '#4c3e38', '#5a4a42', '#6a584e']],
      rim: 0.34,
      spec: [14, 0.5],
      detail: (d) => {
        d.curve(-6, -2.2, (x) => 64 - 0.08 * (x + 4) * (x + 4), -3)
        d.curve(2.2, 6, (x) => 64 - 0.08 * (x - 4) * (x - 4), -3)
        d.line(-2, 58.4, 2, 58.4, -2)
      },
    }),
  )
}

/** Draw a sculpted figure with its origin at (x, y). */
export function drawSculpt(g: Surface, f: Sculpted, x: number, y: number) {
  g.draw(f.canvas, Math.round(x) - f.ox, Math.round(y) - f.oy)
}

// ---------------------------------------------------------------------------
// Hand-pixelled people and animals

const INK = J.ink
const BASE: Palette = {
  o: INK,
  s: J.skin,
  S: J.skinD,
  k: J.hair,
  g: J.gold,
  G: J.goldL,
  d: J.goldD,
  y: J.goldLL,
  r: J.red,
  R: J.redD,
  l: J.redL,
  w: J.white,
  W: J.whiteD,
  e: J.green,
  E: '#1f5a36',
  b: J.blue,
  B: '#1c3266',
  p: J.pink,
  P: J.pinkD,
  c: J.robe,
  C: J.robeD,
  u: J.robeL,
  n: '#8a8480',
  N: '#5a5652',
  m: '#6a4028',
  M: '#43281a',
  t: '#3fa06a',
  T: '#2a7a4e',
  v: '#e8e0d0',
  a: '#b8b0a4',
}

function spr(key: string, rows: string[], pal: Palette = BASE): Sprite {
  return cached(`bj:${key}`, () => makeSprite(rows, pal))
}

/** Draw a sprite with its bottom-centre at (x, y). */
export function drawSprite(g: Surface, s: Sprite, x: number, y: number, flip = false) {
  g.draw(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h), flip)
}

/** Baby Siddhattha: a small gold child pointing up to the sky. */
export function babySprite(): Sprite {
  return spr('baby', [
    '....o....',
    '...oyo...',
    '..ogggo..',
    '.ogGGGgo.',
    '.ogGdGgo.',
    '.ogGGGgo.',
    '..ogggo..',
    '..oyggo.o',
    '.oygggooy',
    'oyggggggo',
    'oggoggo..',
    '.oogggo..',
    '..ogggo..',
    '..ogdgo..',
    '..og.go..',
    '..oo.oo..',
  ])
}

/** Queen Māyā standing, right arm raised to hold a branch. */
export function mayaSprite(): Sprite {
  return spr('maya', [
    '........oo..',
    '.......ogo..',
    '.......oso..',
    '...oo..oso..',
    '..ogGo.oso..',
    '..ogggo.so..',
    '..okkko.So..',
    '.oksssko.o..',
    '.oksSsko.o..',
    '..osssoo.o..',
    '..oddgssso..',
    '.orrgGgrro..',
    '.orrrgrrSo..',
    '.orrrrrro...',
    '..oeeeeo....',
    '..oeEeeo....',
    '..oeeEeo....',
    '.oeeeEeeo...',
    '.oeeeeEeo...',
    '.oeeeeeEo...',
    'oeeeeeeeeo..',
    'oeEeeeeeeo..',
    'oggggggggo..',
    '.oooooooo...',
  ])
}

/** A lady attendant kneeling, hands joined. */
export function attendantSprite(c = 'b'): Sprite {
  return spr(`att:${c}`, [
    '...ooo...',
    '..okkko..',
    '.okssso..',
    '.oksSso..',
    '..osso...',
    '.oddgdo..',
    'o' + c + c + 'ss' + c + 'o..',
    'o' + c + c + c + 'S' + c + 'o..',
    'o' + c + c + c + c + c + c + 'o.',
    'owwwwwwwo',
    'oooooooo.',
  ])
}

/** A deva (เทวดา) floating on a cloud with a flower offering. */
export function devaSprite(): Sprite {
  return spr('deva', [
    '....o.....',
    '...ogo....',
    '...ogo....',
    '..ogggo...',
    '..osSso...',
    '..ossso.o.',
    '.oddgdo.op',
    'oeeggeeoso',
    'oeeseeeoo.',
    '.oeeeeo...',
    '.orrrrro..',
    'oorrrrroo.',
    '..ooooo...',
  ])
}

/** An old man bent over his cane (เทวทูต: ความแก่). */
export function oldManSprite(): Sprite {
  return spr('old', [
    '...ooo.....',
    '..ovvvo....',
    '..ossso....',
    '..osSso....',
    '...ooso....',
    '..owwwo....',
    '.owwwwwo...',
    'owwwwwwso..',
    '.owwwwwoo..',
    '..owwwo.m..',
    '..owWwo.m..',
    '..oS.So.m..',
    '..oo.oo.m..',
  ])
}

/** Someone sick lying on a mat with a relative beside (ความเจ็บ). */
export function sickSprite(): Sprite {
  return spr('sick', [
    '...............ooo..',
    '..............okkko.',
    '..............ossso.',
    '...............osso.',
    '..............obbbbo',
    'ooooooo......obbbbbo',
    'osssooooooooo.obbbo.',
    'osSSowwwwwwwwwo.obo.',
    'oaaaaaaaaaaaaaaoobbo',
    'ommmmmmmmmmmmmmmoooo',
    '.oooooooooooooooo...',
  ])
}

/** A shrouded body on a bier, garland and a candle (ความตาย, shown gently). */
export function bierSprite(): Sprite {
  return spr('bier', [
    '..................o.',
    '.................ogo',
    '..pp..pp..pp.....oGo',
    '.oppooppooppoooo.owo',
    'owwwwwwwwwwwwwwwoowo',
    'owvvvvvvvvvvvvvwo.wo',
    'owwwwwwwwwwwwwwwo.wo',
    'ommmmmmmmmmmmmmmmoWo',
    '.om...........om.ooo',
    '.oo...........oo....',
  ])
}

/** A samana (ascetic) standing calmly with his bowl (สมณะ). */
export function samanaSprite(): Sprite {
  return spr('samana', [
    '...ooo...',
    '..osSso..',
    '..ossso..',
    '..osSso..',
    '...oso...',
    '..occco..',
    '.occcCco.',
    '.ocsocco.',
    '.oMMMcCo.',
    '.occcCco.',
    '.occcCco.',
    '.occcCco.',
    '.occcCco.',
    '..os.so..',
    '..oo.oo..',
  ])
}

/** Channa, the faithful charioteer, holding the horse's tail. */
export function channaSprite(): Sprite {
  return spr('channa', [
    '...ooo..',
    '..okkko.',
    '..ossso.',
    '..osSso.',
    '...oso..',
    '..orrro.',
    '.orrrrso',
    '.osrrro.',
    '..obbbo.',
    '..obBbo.',
    '..os.so.',
    '..oo.oo.',
  ])
}

/** Kanthaka, the white horse, with the prince riding (gold, crowned). */
export function kanthakaSprite(frame: 0 | 1): Sprite {
  const legs =
    frame === 0
      ? ['....ow.o......ow.o...', '....ow.o.....ow..o...', '...owo..o....owo..o..', '...oo...oo...oo...oo.']
      : ['.....owo.......owo...', '....ow..o.....ow.o...', '...owo...o...owo..o..', '...oo....oo..oo...oo.']
  return spr(`kan:${frame}`, [
    '..........o..........',
    '.........ogo.........',
    '........ogGgo........',
    '........ogggo........',
    '........oGGGo........',
    '........ogdgo.....oo.',
    '.......ogggggo...owwo',
    '......oggrgrggo.owwvo',
    '......ogrrrrrgo.owvo.',
    '....oooorrrrroooowwo.',
    '...owwwwwrrrwwwwwwwo.',
    '..owvwwwwrrrwwwwwwo..',
    '.owvwwwwwwwwwwwwwo...',
    '.owwwwwwwwwwwwwwwo...',
    'owwvwwwwwwwwwwwwvo...',
    'owo.owwwwwwwwwwwo....',
    '.o..owwwoooowwwwo....',
    ...legs,
  ])
}

/** Indra (green-skinned in Thai art) playing the three-stringed lute. */
export function indraSprite(): Sprite {
  const pal = { ...BASE, s: '#4fa86a', S: '#2f7a4a' }
  return spr(
    'indra',
    [
      '.....o.......',
      '....ogo......',
      '....ogo......',
      '...ogggo.....',
      '...osSso.....',
      '...ossso.....',
      '..oddgddo....',
      '.oggsggso....',
      '.orrsrrrosoo.',
      '.orrrrrmmmmmo',
      '.orrrrmmdmmmo',
      '..orrromvvvo.',
      '.oooooooooo..',
    ],
    pal,
  )
}

/** Sujātā kneeling with the golden tray of milk-rice. */
export function sujataSprite(): Sprite {
  return spr('sujata', [
    '.......ooooo.',
    '......oGgggGo',
    '......oywywyo',
    '...ooo.ooooo.',
    '..okkko.ooo..',
    '.okssso.oso..',
    '.oksSso.oso..',
    '..osso.oso...',
    '.oppppsso....',
    'oppPppppo....',
    'oppppPppo....',
    'orrrrrrrro...',
    'ooooooooo....',
  ])
}

/** The golden tray (ถาดทอง) floating on the water. */
export function traySprite(): Sprite {
  return spr('tray', ['..ooooo..', '.oGyGyGo.', 'ogggggggo', '.oddddo..'.padEnd(9, '.'), '..oooo...'])
}

/** Sotthiya the grass-cutter with his bundles of kusa grass. */
export function sotthiyaSprite(): Sprite {
  const pal = { ...BASE, h: '#a8c46a', H: '#6a8a3a' }
  return spr(
    'sotthiya',
    [
      '....ooo.......',
      '...okkko......',
      '...ossso......',
      '...osSso......',
      '....oso.......',
      '..owwwwoooo...',
      '.owwwwsohhHo..',
      '.owswwohhhhHo.',
      '..owwwohHhhho.',
      '..omwmo.ohhHo.',
      '..owwwo..ooo..',
      '..os.so.......',
      '..oo.oo.......',
    ],
    pal,
  )
}

/** Mae Thorani (พระแม่ธรณี) wringing the water from her long hair. */
export function thoraniSprite(): Sprite {
  const pal = { ...BASE, s: '#f0c89a', S: '#c9966a', k: '#1a1418' }
  return spr(
    'thorani',
    [
      '......o.......',
      '.....ogo......',
      '.....ogo......',
      '....ogggo.....',
      '....oGgGo.....',
      '...okssskoo...',
      '...oksSskkko..',
      '...okssskoko..',
      '...oddgddoko..',
      '..ogeeeeegoko.',
      '.osseeeeesskko',
      '.osoeegeeoosko',
      '..o.eeeee.okko',
      '...oeeEeeo.oko',
      '...oeeeeeo.oko',
      '..oeeeEeeeo.o.',
      '..oeeeeEeeo...',
      '..oeeeeeeeo...',
      '.oeeeeeEeeeo..',
      '.oeeEeeeeeeo..',
      '.oggggggggggo.',
      '..oooooooooo..',
    ],
    pal,
  )
}

/** Mae Thorani, larger: crowned, wringing her long hair over her right shoulder. */
export function thoraniBigSprite(): Sprite {
  const pal = { ...BASE, s: '#f4d2a8', S: '#d4a478', k: '#1c1418', K: '#3a2c30', e: '#3f9a62', E: '#2a6e46', w: '#dff4ff' }
  return spr(
    'thorani2',
    [
      '.........o..........',
      '........oyo.........',
      '........ogo.........',
      '.......ogGgo........',
      '.......oGgGo........',
      '.......ogrgo........',
      '......odgGgdo.......',
      '......okkkkkoo......',
      '.....okssssskko.....',
      '.....oksdsdskKko....',
      '.....okssssskkKo....',
      '......osSSSokkkKo...',
      '.......osssokkkko...',
      '......oddgddookKko..',
      '.....oGsseessoKkko..',
      '....osseeeeessokkKo.',
      '...ossoeegeeosssKko.',
      '...oso.oeeeeoossskko',
      '...oo..oeeeeo.ossKko',
      '.......oeeEeeo.okkko',
      '......oeeeeeeo..okwo',
      '......oeeEeeeo..owo.',
      '.....oeeeeEeeeo..o..',
      '.....oeeeeeEeeo.....',
      '.....oeEeeeeeeo.....',
      '....oeeeEeeeeeeo....',
      '....oeeeeeeEeeeo....',
      '....oggggggggggo....',
      '...ogdgdgdgdgdgdo...',
      '....oooooooooooo....',
    ],
    pal,
  )
}

/** A royal chariot with a gold canopy, the prince inside and a white horse. */
export function chariotSprite(): Sprite {
  const pal = { ...BASE, v: '#ffffff' }
  return spr(
    'chariot',
    [
      '....................o.......',
      '...................ogo......',
      '..................oGGGo.....',
      '.................ogggggo....',
      '................ogggggggo...',
      '.................o.oGo.o....',
      '...................oGo......',
      '..oo..............oGGGo.....',
      '.owwo............ooyGyoo....',
      'owvwo...........orrrrrrro...',
      '.owwoooooooooooooRrrrrrRo...',
      '..owwwwwwwwwo...oommmmmoo...',
      '..owvwwwwwwwwoooommmmmmmo...',
      '...owwwwwwwwwo..oMMMMMMMo...',
      '...ow.ow..ow.wo...ooooo.....',
      '...ow..ow.ow..o..ogdddgo....',
      '..owo..owowo....odgoogdo....',
      '..oo...oooo......ogdddgo....',
      '..................ooooo.....',
    ],
    pal,
  )
}

/** Māra (พญามาร) on the elephant Girimekhala, weapons raised. */
export function maraSprite(): Sprite {
  const pal = { ...BASE, s: '#4a6a8a', S: '#2e4a6a', n: '#6e6a8a', N: '#48445e', v: '#f0ece0' }
  return spr(
    'mara',
    [
      '..........o.o.o.............',
      '..........ogogo.............',
      '.........ogggggo............',
      '....oo...osSsSso...oo.......',
      '...oddo..osssssoo.oddo......',
      '....oso.oorrrrrosooso.......',
      '.....osoorrrrrrrosso........',
      '......oorrrrrrrroo..........',
      '....ooooorRrrRrooooooo......',
      '...onnnnnnnnnnnnnnnnnnoo....',
      '..onnnnnnnnnnnnnnnnnnnnno...',
      '.onnNnnnnnnnnnnnnnnnnnnnno..',
      '.onnnnnnnnnnnnnnnnnnnnnnnno.',
      'onvvnnnnnnnnnnnnnnnnnnnnnno.',
      'onvonnnnnnnnnnnnnnnnnnnnnNo.',
      '.onoNnnnnnnnnnnnnnnnnnnnNo..',
      '.onoonnNnnnnnnnnnnnnnNnnNo..',
      '..onoonnno...onnno.onnno....',
      '...o..onno...onno..onno.....',
      '......onno...onno..onno.....',
      '......oooo...oooo..oooo.....',
    ],
    pal,
  )
}

/** One of Māra's soldiers tumbling in the flood. */
export function soldierSprite(k: number): Sprite {
  const pal = { ...BASE, s: k % 2 ? '#6a8a4a' : '#8a5a9a', S: k % 2 ? '#4a6a2a' : '#5e3a6e' }
  return spr(
    `sold:${k % 2}`,
    k % 2
      ? ['..o....o', '.odo..ogo', '..oooo.o.', '.osssso..', 'osrrrso..', '.orrrro..', 'oso..oso.', 'oo....oo.']
      : ['o.....o..', 'ogo.oo.o.', '.oossso..', '..osSso..', '.orrrrro.', 'osorrros.', '.o.oo.o..', '...oo....'],
    pal,
  )
}

/** A seated ascetic / disciple, hands joined (for the five ascetics). */
export function discipleSprite(view: 'side' | 'back', flip = false): Sprite {
  const rows =
    view === 'side'
      ? ['..ooo..', '.oSsso.', '.ossso.', '..osSo.', '.occco.', 'occsso.', 'occcco.', 'occcCco', 'oooooo.']
      : ['..ooo..', '.oSSSo.', '.oSSSo.', '..oSo..', '.occco.', 'occccco', 'occCcco', 'occcCco', 'ooooooo']
  const s = spr(`disc:${view}`, rows)
  if (!flip) return s
  return cached(`bj:disc:${view}:f`, () => {
    const c = createCanvas(s.w, s.h)
    const ctx = c.getContext('2d')!
    ctx.translate(s.w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(s.canvas, 0, 0)
    return { canvas: c, w: s.w, h: s.h }
  })
}

/** A deer standing or resting. */
export function deerSprite(pose: 'stand' | 'rest' | 'graze'): Sprite {
  const pal = { ...BASE, m: '#c98a4e', M: '#9a6030', v: '#f4e2c4' }
  const rows =
    pose === 'rest'
      ? ['.o.o.......', '.omo.......', 'ommmo......', 'oMmmoooooo.', '.oommmmmmmo', '..ommvmmvmo', '..oommmmmMo', '...oooooooo']
      : pose === 'graze'
        ? ['...........', '..ooooooo..', '.ommmmmvmo.', 'omvmmmmmmo.', 'omo.ommmmo.', 'ooo.omo.omo', '.o..omo.omo', '....oo..oo.']
        : ['o.o........', 'omo........', 'ommo.......', 'oMmmoooooo.', '.oommmmvmmo', '..ommmmmmmo', '..omo.omo..', '..omo.omo..', '..oo..oo...']
  return spr(`deer:${pose}`, rows, pal)
}

/** An elephant kneeling in homage (Nālāgiri tamed). */
export function elephantKneelSprite(): Sprite {
  const pal = { ...BASE, n: '#8e8a94', N: '#646070', v: '#f0ece0' }
  return spr(
    'nalagiri',
    [
      '.........ooooooooo...',
      '......oonnnnnnnnnnoo.',
      '....oonnnnnnnnnnnnnno',
      '...onNnnnnnnnnnnnnnno',
      '..onnnonnnnnnnnnnnnno',
      '..onnnonnnnnnnnnnnnno',
      '.onnnnonnnnnnnnnnnNno',
      '.onvnnonnnnnnnnnnNnno',
      'onnvnnnonnnnnnnnnnnno',
      'onno.onNnnnnnnnnnnno.',
      'onno.onnnnoooonnnnno.',
      '.oo..onnnnnoonnnnnno.',
      '.....oooooooooooooo..',
    ],
    pal,
  )
}

/** A monk seated in meditation (for Veḷuvana and the Parinibbāna). */
export function monkSeatedSprite(view: 'front' | 'back'): Sprite {
  return spr(
    `monkseat:${view}`,
    view === 'front'
      ? ['..ooo..', '.osSso.', '.ossso.', '..oso..', '.occco.', 'occsCco', 'ocsscco', 'occcCco', 'ooooooo']
      : ['..ooo..', '.oSSSo.', '.oSSSo.', '..oSo..', '.occco.', 'occcCco', 'occcCco', 'occcCco', 'ooooooo'],
  )
}

/** A small monk walking on his alms round with his bowl (side view, facing right). */
export function monkWalkSprite(frame: 0 | 1): Sprite {
  return spr(`monkwalk:${frame}`, [
    '..ooo...',
    '.oSSso..',
    '.osssso.',
    '..osso..',
    '.occco..',
    'occcCo..',
    'occcsMo.',
    'occcMMMo',
    'occcCoo.',
    '.occCo..',
    '.occco..',
    frame ? '.os.so..' : '..oso...',
    frame ? '.oo.oo..' : '..ooo...',
  ])
}

/** Anāthapiṇḍika's cart of gold coins. */
export function goldCartSprite(): Sprite {
  return spr('cart', [
    '...oooooooo....',
    '..ogyGgGyGgo...',
    '.ogGgdgGgGgdo..',
    'ommmmmmmmmmmmo.',
    'oMmmmmmmmmmmMoo',
    '.oooooooooooo.m',
    '..oNo....oNo..m',
    '..ooo....ooo...',
  ])
}

/** A villager kneeling to offer food into a monk's bowl. */
export function offeringSprite(): Sprite {
  return spr('offer', [
    '...ooo.....',
    '..okkko....',
    '..ossso....',
    '..osSso..o.',
    '...oso..ogo',
    '..obbboosoo',
    '.obbbbbso..',
    '.obbbbbo...',
    '.orrrrro...',
    'orrrrrrro..',
    'ooooooooo..',
  ])
}
