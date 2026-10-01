// Action poses for the beach mini-games (prefix act_b_). Built from wrist
// targets like the work poses (src/art/poses/work.ts): give each arm the
// doll-space point its hand should reach and the elbow bends outwards.
// Kneeling poses shift the whole upper body down by 9 px (legs 'kneelF').
//
// Doll space: 32 × 50, shoulders at (8.5, 25) and (23.5, 25), feet at y≈49.
// Sprites carry a 1 px outline, so sprite = doll + 1.

import { dollJoint, registerDollPose, restingArm, type ArmDef, type DollPose, type DollView, type Expr, type Hand, type LegsKind, type PoseDef, type Pt } from '../doll'

type Side = 'L' | 'R'

interface Arm {
  w: Pt
  hand?: Hand
  z?: ArmDef['z']
  e?: Pt
}

interface BeachPoseSpec {
  name: `act_b_${string}`
  view: DollView
  L: Arm | 'rest' | null
  R: Arm | 'rest' | null
  expr: Expr
  kneel?: boolean
  /** Sitting astride (banana boat): body down 10 px, sitting legs. */
  sit?: boolean
  legs?: LegsKind
}

const SH: Record<Side, Pt> = { L: [8.5, 25], R: [23.5, 25] }
const ARM = 7.4

function elbow(side: Side, s: Pt, w: Pt): Pt {
  const dx = w[0] - s[0]
  const dy = w[1] - s[1]
  const d = Math.hypot(dx, dy) || 1
  let px = -dy / d
  let py = dx / d
  const out = side === 'L' ? -1 : 1
  if (px * out + py * 0.5 < 0) {
    px = -px
    py = -py
  }
  const k = Math.max(0.6, Math.sqrt(Math.max(0, (ARM / 2) ** 2 - (d / 2) ** 2)))
  return [s[0] + dx * 0.55 + px * k, s[1] + dy * 0.55 + py * k]
}

const SPECS = new Map<string, BeachPoseSpec>()

function arm(side: Side, a: Arm | 'rest' | null, view: DollView, dy: number): ArmDef | null {
  if (a === null) return null
  if (a === 'rest') return restingArm(dy, side === 'L' ? 1 : -1, 'back', 'rest')
  const s: Pt = [SH[side][0], SH[side][1] + dy]
  const w: Pt = [a.w[0], a.w[1] + dy]
  return { s, e: a.e ? [a.e[0], a.e[1] + dy] : elbow(side, s, w), w, k: [1, 0], hand: a.hand ?? 'none', z: a.z ?? (view === 'front' ? 'front' : 'back') }
}

/** Register (once) and return the pose name. */
export function beachPose(p: BeachPoseSpec): BeachPoseSpec['name'] {
  if (SPECS.has(p.name)) return p.name
  SPECS.set(p.name, p)
  registerDollPose(p.name, (view): PoseDef | null => {
    if (view !== p.view) return null
    const dy = p.kneel ? 9 : p.sit ? 10 : 0
    const legs: LegsKind = p.legs ?? (p.kneel ? (view === 'front' ? 'kneelF' : 'kneelB') : p.sit ? (view === 'front' ? 'sitF' : 'sitB') : 'stand')
    return { dy, L: arm('L', p.L, view, dy), R: arm('R', p.R, view, dy), legs, expr: p.expr }
  })
  return p.name
}

/** Wrist of a beach pose in sprite space (un-flipped), or null. */
export function beachWrist(name: string, side: Side, gender: 'm' | 'f' = 'm'): Pt | null {
  const p = SPECS.get(name)
  const a = p?.[side]
  if (!p || !a) return null
  const dy = p.kneel ? 9 : p.sit ? 10 : 0
  const sd = side === 'L' ? 1 : -1
  // compose space → sprite pixels (v5 proportions, build, outline)
  if (a === 'rest') return dollJoint({ gender }, name as DollPose, p.view, sd, restingArm(dy, sd))
  return dollJoint({ gender }, name as DollPose, p.view, sd, { w: [a.w[0], a.w[1] + dy], k: [1, 0] })
}

// ---------------------------------------------------------------------------

export const BP = {
  // ก่อเจดีย์ทราย: holding the bucket over the pile, flipping it, patting sand.
  bucketUp: beachPose({ name: 'act_b_bucket_up', view: 'front', L: { w: [11, 18], z: 'top', hand: 'fist' }, R: { w: [21, 18], z: 'top', hand: 'fist' }, expr: 'think' }),
  bucketFlip: beachPose({ name: 'act_b_bucket_flip', view: 'front', L: { w: [11.5, 30], z: 'front', hand: 'fist' }, R: { w: [20.5, 30], z: 'front', hand: 'fist' }, expr: 'open' }),
  pat0: beachPose({ name: 'act_b_pat_0', view: 'front', L: { w: [10, 36], z: 'front', hand: 'open' }, R: { w: [22, 33], z: 'front', hand: 'open' }, expr: 'smile', kneel: true }),
  pat1: beachPose({ name: 'act_b_pat_1', view: 'front', L: { w: [10, 33], z: 'front', hand: 'open' }, R: { w: [22, 36], z: 'front', hand: 'open' }, expr: 'happy', kneel: true }),
  kneelWai: beachPose({ name: 'act_b_kneel_wai', view: 'front', L: { w: [15.2, 23], z: 'top', hand: 'none', e: [9, 27] }, R: { w: [16.8, 23], z: 'top', hand: 'none', e: [23, 27] }, expr: 'serene', kneel: true }),
  plant: beachPose({ name: 'act_b_plant', view: 'front', L: 'rest', R: { w: [26, 30], z: 'front', hand: 'fist' }, expr: 'happy', kneel: true }),
  // เก็บขยะ: grabber reaching down, holding the bag up.
  grab: beachPose({ name: 'act_b_grab', view: 'front', L: { w: [7, 34], z: 'front', hand: 'fist' }, R: { w: [25, 36], z: 'front', hand: 'fist' }, expr: 'think' }),
  grabUp: beachPose({ name: 'act_b_grab_up', view: 'front', L: { w: [7, 34], z: 'front', hand: 'fist' }, R: { w: [25, 26], z: 'front', hand: 'fist' }, expr: 'happy' }),
  carry: beachPose({ name: 'act_b_carry', view: 'front', L: { w: [7, 34], z: 'front', hand: 'fist' }, R: { w: [24, 33], z: 'front', hand: 'fist' }, expr: 'smile' }),
  carryBack: beachPose({ name: 'act_b_carry_b', view: 'back', L: { w: [7, 34], z: 'back', hand: 'fist' }, R: { w: [24, 33], z: 'back', hand: 'fist' }, expr: 'smile' }),
  // ปล่อยเต่า: red torch forward, shooing arms.
  torch: beachPose({ name: 'act_b_torch', view: 'back', L: 'rest', R: { w: [24, 20], z: 'top', hand: 'fist' }, expr: 'smile' }),
  shoo0: beachPose({ name: 'act_b_shoo_0', view: 'back', L: { w: [3, 15], z: 'top', hand: 'open' }, R: { w: [24, 20], z: 'top', hand: 'fist' }, expr: 'open' }),
  shoo1: beachPose({ name: 'act_b_shoo_1', view: 'back', L: { w: [6, 20], z: 'top', hand: 'open' }, R: { w: [24, 20], z: 'top', hand: 'fist' }, expr: 'open' }),
  // เก็บเปลือกหอย: bucket in one hand, reaching with the other.
  bucket: beachPose({ name: 'act_b_bucket', view: 'front', L: { w: [7, 33], z: 'front', hand: 'fist' }, R: 'rest', expr: 'smile' }),
  reach: beachPose({ name: 'act_b_reach', view: 'front', L: { w: [7, 33], z: 'front', hand: 'fist' }, R: { w: [27, 31], z: 'front', hand: 'open' }, expr: 'open', kneel: true }),
  // ดำน้ำ: arms forward (drawn rotated as a swimmer).
  swim0: beachPose({ name: 'act_b_swim_0', view: 'front', L: { w: [10, 12], z: 'top', hand: 'open' }, R: { w: [22, 12], z: 'top', hand: 'open' }, expr: 'happy' }),
  swim1: beachPose({ name: 'act_b_swim_1', view: 'front', L: { w: [6, 16], z: 'top', hand: 'open' }, R: { w: [26, 16], z: 'top', hand: 'open' }, expr: 'happy' }),
  // บานาน่าโบ๊ต: seen from behind, gripping the handle / arms up.
  hold: beachPose({ name: 'act_b_hold', view: 'back', L: { w: [13, 34], z: 'back', hand: 'fist' }, R: { w: [19, 34], z: 'back', hand: 'fist' }, expr: 'open', sit: true }),
  yay: beachPose({ name: 'act_b_yay', view: 'back', L: { w: [3, 14], z: 'top', hand: 'open' }, R: { w: [29, 14], z: 'top', hand: 'open' }, expr: 'happy', sit: true }),
  wobble: beachPose({ name: 'act_b_wobble', view: 'back', L: { w: [2, 22], z: 'top', hand: 'open' }, R: { w: [30, 28], z: 'top', hand: 'open' }, expr: 'open', sit: true }),
  // จุดถ่ายรูป.
  peace: beachPose({ name: 'act_b_peace', view: 'front', L: 'rest', R: { w: [24, 15], z: 'top', hand: 'open' }, expr: 'happy' }),
  heart: beachPose({ name: 'act_b_heart', view: 'front', L: { w: [13, 9], z: 'top', hand: 'open' }, R: { w: [19, 9], z: 'top', hand: 'open' }, expr: 'happy' }),
  jump: beachPose({ name: 'act_b_jump', view: 'front', L: { w: [2, 13], z: 'top', hand: 'open' }, R: { w: [30, 13], z: 'top', hand: 'open' }, expr: 'happy' }),
  point: beachPose({ name: 'act_b_point', view: 'front', L: 'rest', R: { w: [30, 22], z: 'top', hand: 'open' }, expr: 'open' }),
}

export type BeachPoseName = (typeof BP)[keyof typeof BP]
