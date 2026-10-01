// Action poses for the volunteer-job and kitchen mini-games (prefix act_w_).
//
// Poses are built from wrist targets: give each arm the doll-space point its
// hand should reach and the elbow is bent outwards automatically. Tool-holding
// families (two-handed sticks at any lean, one-handed reaches in any
// direction) are registered lazily the first time a scene asks for them, so a
// scene can pick the frame that matches its tool angle every frame.
//
// Doll space: 32 × 50, shoulders at (8.5, 25) and (23.5, 25), feet at y≈49.
// Sprites carry a 1 px outline, so sprite = doll + 1.

import { dollJoint, dollPoint, registerDollPose, restingArm, type ArmDef, type DollPose, type DollView, type Expr, type Hand, type PoseDef, type Pt } from '../doll'

export type Side = 'L' | 'R'

/** Wrist target for one arm. */
export interface ArmSpec {
  w: Pt
  hand?: Hand
  z?: ArmDef['z']
  /** Override the auto elbow. */
  e?: Pt
  /** Elbow bend direction: 1 = outwards/down (default), -1 = inwards. */
  bend?: 1 | -1
}

export interface WorkPose {
  name: `act_w_${string}`
  view: DollView
  L: ArmSpec | 'rest' | null
  R: ArmSpec | 'rest' | null
  expr: Expr
}

const SHOULDER: Record<Side, Pt> = { L: [8.5, 25], R: [23.5, 25] }
const ARM_LEN = 7.4

/** Auto elbow: half way along, pushed out (away from the body) and down. */
function elbowFor(side: Side, w: Pt, bend: 1 | -1 = 1): Pt {
  const s = SHOULDER[side]
  const dx = w[0] - s[0]
  const dy = w[1] - s[1]
  const d = Math.hypot(dx, dy) || 1
  const mx = s[0] + dx * 0.55
  const my = s[1] + dy * 0.55
  let px = -dy / d
  let py = dx / d
  const outX = side === 'L' ? -1 : 1
  if ((px * outX + py * 0.5) * bend < 0) {
    px = -px
    py = -py
  }
  const k = Math.max(0.6, Math.sqrt(Math.max(0, (ARM_LEN / 2) ** 2 - (d / 2) ** 2)))
  return [mx + px * k, my + py * k]
}

function armDef(side: Side, spec: ArmSpec | 'rest' | null, view: DollView): ArmDef | null {
  if (spec === null) return null
  if (spec === 'rest') return restingArm(0, side === 'L' ? 1 : -1, 'back', 'rest')
  const s = SHOULDER[side]
  return {
    s: [s[0], s[1]],
    e: spec.e ?? elbowFor(side, spec.w, spec.bend),
    w: spec.w,
    // Wrists stay put on both body presets so held tools line up exactly.
    k: [1, 0],
    hand: spec.hand ?? 'none',
    z: spec.z ?? (view === 'front' ? 'front' : 'back'),
  }
}

const POSES = new Map<string, WorkPose>()

/** Register (once) and return the pose name. Also registers `<name>_na` without arms (used to slip an apron under the arms). */
export function workPose(p: WorkPose): WorkPose['name'] {
  if (POSES.has(p.name)) return p.name
  POSES.set(p.name, p)
  const def = (bare: boolean) => (view: DollView): PoseDef | null => {
    if (view !== p.view) return null
    return {
      dy: 0,
      L: bare ? null : armDef('L', p.L, view),
      R: bare ? null : armDef('R', p.R, view),
      legs: 'stand',
      expr: p.expr,
    }
  }
  registerDollPose(p.name, def(false))
  registerDollPose(`${p.name}_na`, def(true))
  return p.name
}

export function poseInfo(name: string): WorkPose | undefined {
  return POSES.get(name)
}

/** Wrist of a registered work pose in sprite space (0..DOLL_W, un-flipped). */
export function wristOf(name: string, side: Side, gender: 'm' | 'f' = 'm'): Pt | null {
  const p = POSES.get(name)
  const a = p?.[side]
  if (!p || !a) return null
  const sd = side === 'L' ? 1 : -1
  // compose space → sprite pixels (v5 proportions, build, outline)
  if (a === 'rest') return dollJoint({ gender }, name as DollPose, p.view, sd, restingArm(0, sd))
  return dollJoint({ gender }, name as DollPose, p.view, sd, { w: a.w, k: [1, 0] })
}

// ---------------------------------------------------------------------------
// Families

const q = (v: number, step: number) => Math.round(v / step)

/**
 * Two hands on a stick (broom, mop, duster) seen from the front. `lean` is the
 * handle angle from vertical (positive = top of the handle to the right, so the
 * working end sits down-left). Quantised; returns the pose, the handle axis
 * point (doll-sprite space) and the quantised lean actually used.
 */
export function gripPose(lean: number, frame = 0, expr: Expr = 'smile'): { name: WorkPose['name']; lean: number; c: Pt } {
  const step = 0.16
  const i = Math.max(-6, Math.min(6, q(lean, step)))
  const a = i * step
  const sx = Math.sin(a)
  const cy = Math.cos(a)
  // Hold point shifts slightly with the swing frame.
  const cx0 = 16 + sx * 2.5 + (frame ? -0.8 * Math.sign(a || 1) : 0)
  const cy0 = 31.5 + (frame ? 0.8 : 0)
  const up: Pt = [cx0 + sx * 3.6, cy0 - cy * 3.6]
  const lo: Pt = [cx0 - sx * 3.2, cy0 + cy * 3.2]
  const upper: Side = a >= 0 ? 'R' : 'L'
  const lower: Side = upper === 'R' ? 'L' : 'R'
  const arms = upper === 'R' ? { R: { w: up }, L: { w: lo } } : { L: { w: up }, R: { w: lo } }
  const name = workPose({ name: `act_w_grip_${i}_${frame}_${expr}`, view: 'front', ...arms, expr })
  void lower
  // the hold point in sprite pixels (v5 proportions), like the wrists
  return { name, lean: a, c: dollPoint({ gender: 'm' }, name, 'front', cx0, cy0) }
}

/**
 * One arm reaching toward an angle (radians, 0 = screen right, π/2 = down),
 * the other resting or doing `other`. Quantised to 16 directions.
 */
export function reachPose(view: DollView, side: Side, ang: number, dist = 8, expr: Expr = 'smile', other: ArmSpec | 'rest' | null = 'rest'): WorkPose['name'] {
  const n = 16
  const i = ((q(ang, (Math.PI * 2) / n) % n) + n) % n
  const a = (i / n) * Math.PI * 2
  const d = Math.round(dist)
  const s = SHOULDER[side]
  const w: Pt = [s[0] + Math.cos(a) * d, s[1] + Math.sin(a) * d]
  const otherSide: Side = side === 'L' ? 'R' : 'L'
  const otherKey = other === 'rest' ? 'r' : other === null ? 'n' : `${other.w[0]}x${other.w[1]}`
  const arms = side === 'L' ? { L: { w } as ArmSpec, R: other } : { R: { w } as ArmSpec, L: other }
  void otherSide
  return workPose({ name: `act_w_reach_${view}_${side}_${i}_${d}_${expr}_${otherKey}`, view, ...arms, expr })
}

// ---------------------------------------------------------------------------
// Fixed poses

export const WP = {
  /** Holding a dustpan / shoe pair low in front. */
  carry: workPose({ name: 'act_w_carry', view: 'front', L: { w: [12, 34] }, R: { w: [20, 34] }, expr: 'smile' }),
  /** Lifting something to chest height. */
  lift: workPose({ name: 'act_w_lift', view: 'front', L: { w: [11.5, 29.5] }, R: { w: [20.5, 29.5] }, expr: 'open' }),
  /** Holding something up over the head (onto a high shelf). */
  liftHigh: workPose({ name: 'act_w_lift_hi', view: 'front', L: { w: [12.5, 31], z: 'front' }, R: { w: [28, 13.5], z: 'top' }, expr: 'open' }),
  /** Seen from behind: winding up a toss (right hand low and back). */
  tossBack0: workPose({ name: 'act_w_toss_b0', view: 'back', L: { w: [10, 30], z: 'back' }, R: { w: [27.5, 33], z: 'top', hand: 'fist' }, expr: 'smile' }),
  /** Seen from behind: releasing the toss (hand up and forward). */
  tossBack1: workPose({ name: 'act_w_toss_b1', view: 'back', L: { w: [10, 30], z: 'back' }, R: { w: [27.5, 15], z: 'top', hand: 'open' }, expr: 'smile' }),
  /** Seen from behind: holding the feed scoop in the left hand, idle. */
  scoopBack: workPose({ name: 'act_w_scoop_b', view: 'back', L: { w: [9.5, 30], z: 'back' }, R: 'rest', expr: 'smile' }),
  /** Big thumbs up (right hand raised; the thumb is drawn by the actor). */
  thumbs: workPose({ name: 'act_w_thumbs', view: 'front', L: { w: [10.5, 31.5], z: 'front', e: [7, 30] }, R: { w: [27, 21], z: 'top' }, expr: 'happy' }),
  /** Both fists up. */
  cheer: workPose({ name: 'act_w_cheer', view: 'front', L: { w: [3.5, 17], z: 'top', hand: 'fist' }, R: { w: [28.5, 17], z: 'top', hand: 'fist' }, expr: 'happy' }),
  /** Seen from behind: both fists up. */
  cheerBack: workPose({ name: 'act_w_cheer_b', view: 'back', L: { w: [3.5, 17], z: 'top', hand: 'fist' }, R: { w: [28.5, 17], z: 'top', hand: 'fist' }, expr: 'happy' }),
  /** Hands on the cheeks: oh no! */
  oops: workPose({ name: 'act_w_oops', view: 'front', L: { w: [7.5, 21.5], z: 'top', hand: 'open' }, R: { w: [24.5, 21.5], z: 'top', hand: 'open' }, expr: 'open' }),
  /** Wiping the brow: phew. */
  phew: workPose({ name: 'act_w_phew', view: 'front', L: 'rest', R: { w: [21, 12.5], z: 'top', hand: 'open', bend: 1 }, expr: 'smile' }),
  /** Tasting: spoon at the mouth. */
  taste: workPose({ name: 'act_w_taste', view: 'front', L: { w: [11, 33], z: 'front' }, R: { w: [19.5, 25.5], z: 'top', hand: 'fist' }, expr: 'serene' }),
  /** Kitchen: knife raised / chopped down, left hand steadying the food. */
  chopUp: workPose({ name: 'act_w_chop_0', view: 'front', L: { w: [11, 35], z: 'front' }, R: { w: [25.5, 26.5], z: 'front' }, expr: 'think' }),
  chopDown: workPose({ name: 'act_w_chop_1', view: 'front', L: { w: [11, 35], z: 'front' }, R: { w: [21.5, 35.5], z: 'front' }, expr: 'open' }),
  /** Kitchen: both hands low on the counter (resting / ready). */
  ready: workPose({ name: 'act_w_ready', view: 'front', L: { w: [11.5, 34.5], z: 'front' }, R: { w: [20.5, 34.5], z: 'front' }, expr: 'smile' }),
  /** Kitchen: shaking a bottle over the pan. */
  shake0: workPose({ name: 'act_w_shake_0', view: 'front', L: { w: [11, 34], z: 'front' }, R: { w: [23, 28], z: 'front' }, expr: 'open' }),
  shake1: workPose({ name: 'act_w_shake_1', view: 'front', L: { w: [11, 34], z: 'front' }, R: { w: [22, 31], z: 'front' }, expr: 'open' }),
}

/** Stir frames: right hand circling over the pan, left hand on the handle. */
export function stirPose(phase: number, expr: Expr = 'open'): WorkPose['name'] {
  const i = ((Math.round((phase / (Math.PI * 2)) * 8) % 8) + 8) % 8
  const a = (i / 8) * Math.PI * 2
  return workPose({
    name: `act_w_stir_${i}_${expr}`,
    view: 'front',
    L: { w: [10.5, 34.5], z: 'front' },
    R: { w: [20 + Math.cos(a) * 2.5, 33.5 + Math.sin(a) * 1.4], z: 'front' },
    expr,
  })
}

/** Rolling dough between the palms (both hands circling at the chest). */
export function rollPose(phase: number): WorkPose['name'] {
  const i = ((Math.round((phase / (Math.PI * 2)) * 6) % 6) + 6) % 6
  const a = (i / 6) * Math.PI * 2
  return workPose({
    name: `act_w_roll_${i}`,
    view: 'front',
    L: { w: [13 + Math.cos(a) * 1.5, 31.5 + Math.sin(a) * 1], z: 'front' },
    R: { w: [19 - Math.cos(a) * 1.5, 31.5 - Math.sin(a) * 1], z: 'front' },
    expr: 'open',
  })
}
