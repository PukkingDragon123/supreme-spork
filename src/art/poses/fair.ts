// Temple-fair action poses for the HD doll (prefix `act_f_`): throwing darts,
// aiming the cork gun, tossing rings, scooping goldfish, working the claw,
// eating fair snacks, riding (sitting in a gondola / on a carousel horse),
// driving a bumper car, dancing ramwong, cheering and getting scared.
//
// Registered once on import. Scenes draw the player with
//   dollSprite(look, 'act_f_throw', { view: 'back' })
// and use `fairHand()` to put a held prop (dart, ring, food…) in the hand.

import { registerDollPose, restingArm, type ArmDef, type DollView, type PoseDef } from '../doll'
import type { AvatarLook } from '../avatar'

type Views = { front?: PoseDef; back?: PoseDef }

const rest = (dy = 0): { L: ArmDef; R: ArmDef } => ({ L: restingArm(dy, 1), R: restingArm(dy, -1) })

/** Mirror a pose left↔right (the doll is 32 px wide). */
function mirror(p: PoseDef): PoseDef {
  const flip = (a: ArmDef | null): ArmDef | null =>
    a && {
      ...a,
      s: [32 - a.s[0], a.s[1]],
      e: [32 - a.e[0], a.e[1]],
      w: [32 - a.w[0], a.w[1]],
    }
  return { ...p, L: flip(p.R), R: flip(p.L) }
}

const RAMWONG_A: PoseDef = {
  dy: 0,
  L: { s: [8.5, 25], e: [4.5, 21.5], w: [6.5, 16.5], k: [0.5, 0.3], hand: 'open', z: 'top' },
  R: { s: [23.5, 25], e: [26.8, 28.5], w: [26, 32], k: [0.6, 0.4], hand: 'open', z: 'front' },
  legs: 'stand',
  expr: 'serene',
}

const RIDE_FRONT: PoseDef = {
  dy: 10,
  L: { s: [8.5, 35], e: [5.5, 31.5], w: [6.5, 26.5], k: [0.6, 0.4], hand: 'fist', z: 'front' },
  R: { s: [23.5, 35], e: [23.5, 40], w: [19, 43.5], k: [1, 0], hand: 'none', z: 'front' },
  legs: 'sitF',
  expr: 'happy',
}

export const FAIR_POSES: Record<`act_f_${string}`, Views> = {
  // --- Booth games (seen from behind, facing the booth) ---
  /** Dart ready: throwing hand cocked by the ear. */
  act_f_ready: {
    back: { dy: 0, L: restingArm(0, 1), R: { s: [23.5, 25], e: [27.8, 22.5], w: [26.2, 17.5], k: [0.6, 0.4], hand: 'fist', z: 'top' }, legs: 'stand', expr: 'smile' },
  },
  /** Dart released: arm flung forward and up. */
  act_f_throw: {
    back: {
      dy: 0,
      L: { s: [8.5, 25], e: [6.5, 29.5], w: [5, 32.5], k: [0.8, 0.6], hand: 'open', z: 'back' },
      R: { s: [23.5, 25], e: [24.8, 19.5], w: [22.6, 13.5], k: [0.5, 0.3], hand: 'open', z: 'top' },
      legs: 'stand',
      expr: 'open',
    },
  },
  /** Cork gun shouldered, both hands up in front. */
  act_f_aim: {
    back: {
      dy: 0,
      L: { s: [8.5, 25], e: [6.5, 28.5], w: [12.5, 25.5], k: [0.6, 0.3], hand: 'fist', z: 'top' },
      R: { s: [23.5, 25], e: [26.5, 27.5], w: [20.5, 23.5], k: [0.6, 0.3], hand: 'fist', z: 'top' },
      legs: 'stand',
      expr: 'smile',
    },
  },
  /** Ring toss wind-up: arm swung low and back. */
  act_f_toss_a: {
    back: { dy: 0, L: restingArm(0, 1), R: { s: [23.5, 25], e: [25.8, 29.5], w: [27.8, 33.5], k: [0.8, 0.6], hand: 'fist', z: 'top' }, legs: 'stand', expr: 'smile' },
  },
  /** Ring toss release: arm swung up and forward. */
  act_f_toss_b: {
    back: { dy: 0, L: restingArm(0, 1), R: { s: [23.5, 25], e: [26.2, 21.5], w: [24.5, 16.5], k: [0.5, 0.3], hand: 'open', z: 'top' }, legs: 'stand', expr: 'open' },
  },
  /** Leaning over the goldfish tub with the paper scoop. */
  act_f_scoop: {
    back: {
      dy: 1,
      L: { s: [8.5, 26], e: [6, 30], w: [9, 33.5], k: [0.8, 0.6], hand: 'rest', z: 'top' },
      R: { s: [23.5, 26], e: [27, 29.5], w: [27.5, 34], k: [0.8, 0.6], hand: 'fist', z: 'top' },
      legs: 'stand',
      expr: 'smile',
    },
  },
  /** Claw machine: joystick in one hand, the other on the button. */
  act_f_claw: {
    back: {
      dy: 0,
      L: { s: [8.5, 25], e: [6.2, 29.5], w: [8.5, 32.5], k: [0.8, 0.6], hand: 'open', z: 'top' },
      R: { s: [23.5, 25], e: [26.2, 29.5], w: [24.8, 32.5], k: [0.8, 0.6], hand: 'fist', z: 'top' },
      legs: 'stand',
      expr: 'smile',
    },
  },
  /** Big win: both fists up. */
  act_f_cheer: {
    front: {
      dy: 0,
      L: { s: [8.5, 25], e: [4.5, 22], w: [5, 16.5], k: [0.5, 0.3], hand: 'fist', z: 'top' },
      R: { s: [23.5, 25], e: [27.5, 22], w: [27, 16.5], k: [0.5, 0.3], hand: 'fist', z: 'top' },
      legs: 'stand',
      expr: 'happy',
    },
    back: {
      dy: 0,
      L: { s: [8.5, 25], e: [4.5, 22], w: [5, 16.5], k: [0.5, 0.3], hand: 'fist', z: 'top' },
      R: { s: [23.5, 25], e: [27.5, 22], w: [27, 16.5], k: [0.5, 0.3], hand: 'fist', z: 'top' },
      legs: 'stand',
      expr: 'happy',
    },
  },
  /** Oops (a miss): shrug with open hands. */
  act_f_oops: {
    front: {
      dy: 0,
      L: { s: [8.5, 25], e: [4.5, 28.5], w: [2.5, 25.5], k: [0.6, 0.4], hand: 'open', z: 'front' },
      R: { s: [23.5, 25], e: [27.5, 28.5], w: [29.5, 25.5], k: [0.6, 0.4], hand: 'open', z: 'front' },
      legs: 'stand',
      expr: 'think',
    },
    back: {
      dy: 0,
      L: { s: [8.5, 25], e: [4.5, 28.5], w: [2.5, 25.5], k: [0.6, 0.4], hand: 'open', z: 'top' },
      R: { s: [23.5, 25], e: [27.5, 28.5], w: [29.5, 25.5], k: [0.6, 0.4], hand: 'open', z: 'top' },
      legs: 'stand',
      expr: 'think',
    },
  },

  // --- Food carts ---
  /** Bite: food up to the mouth. */
  act_f_eat: {
    front: { dy: 0, L: restingArm(0, 1), R: { s: [23.5, 25], e: [26, 29.5], w: [19, 20.5], k: [0.6, 0.3], hand: 'fist', z: 'top' }, legs: 'stand', expr: 'open' },
  },
  /** Chewing, food held at the chest, very happy. */
  act_f_chew: {
    front: { dy: 0, L: restingArm(0, 1), R: { s: [23.5, 25], e: [26.5, 29.5], w: [22, 26], k: [0.6, 0.3], hand: 'fist', z: 'front' }, legs: 'stand', expr: 'happy' },
  },

  // --- Rides ---
  /** Sitting in a gondola / on a horse, one hand on the pole. */
  act_f_ride: { front: RIDE_FRONT },
  /** Same, waving with the free hand. */
  act_f_ride_wave: {
    front: { ...RIDE_FRONT, R: { s: [23.5, 35], e: [27.2, 31.5], w: [28, 26.5], k: [0.5, 0.3], hand: 'open', z: 'top' }, expr: 'open' },
  },
  /** Both hands up (top of the wheel, fireworks!). */
  act_f_ride_cheer: {
    front: {
      ...RIDE_FRONT,
      L: { s: [8.5, 35], e: [4.8, 31.5], w: [4.5, 26], k: [0.5, 0.3], hand: 'open', z: 'top' },
      R: { s: [23.5, 35], e: [27.2, 31.5], w: [27.5, 26], k: [0.5, 0.3], hand: 'open', z: 'top' },
      expr: 'happy',
    },
  },
  /** Bumper car: both hands on the wheel. */
  act_f_drive: {
    front: {
      dy: 10,
      L: { s: [8.5, 35], e: [8, 39.5], w: [12.5, 38], k: [0.6, 0.2], hand: 'fist', z: 'front' },
      R: { s: [23.5, 35], e: [24, 39.5], w: [19.5, 38], k: [0.6, 0.2], hand: 'fist', z: 'front' },
      legs: 'sitF',
      expr: 'smile',
    },
  },
  /** Bumper car: BONK! arms flung up. */
  act_f_bonk: {
    front: {
      dy: 10,
      L: { s: [8.5, 35], e: [4.5, 32], w: [3.5, 27.5], k: [0.5, 0.3], hand: 'open', z: 'top' },
      R: { s: [23.5, 35], e: [27.5, 32], w: [28.5, 27.5], k: [0.5, 0.3], hand: 'open', z: 'top' },
      legs: 'sitF',
      expr: 'open',
    },
  },

  // --- Shows and the dance floor ---
  /** Ramwong: left hand up in a จีบ, right hand low. */
  act_f_ramwong_a: { front: RAMWONG_A },
  /** Ramwong: the mirrored step. */
  act_f_ramwong_b: { front: mirror(RAMWONG_A) },
  /** Sitting on the mat watching likay (from behind). */
  act_f_watch: {
    back: {
      dy: 10,
      L: { s: [8.5, 35], e: [8, 39.5], w: [11, 42.5], hand: 'none', z: 'back' },
      R: { s: [23.5, 35], e: [24, 39.5], w: [21, 42.5], hand: 'none', z: 'back' },
      legs: 'sitB',
      expr: 'smile',
    },
  },
  /** Sitting and cheering the likay hero, arms up. */
  act_f_watch_cheer: {
    back: {
      dy: 10,
      L: { s: [8.5, 35], e: [4.8, 31.5], w: [5, 26], k: [0.5, 0.3], hand: 'fist', z: 'top' },
      R: { s: [23.5, 35], e: [27.2, 31.5], w: [27, 26], k: [0.5, 0.3], hand: 'fist', z: 'top' },
      legs: 'sitB',
      expr: 'happy',
    },
  },
  /** Likay: singing, one hand held out to the audience. */
  act_f_likay_sing: {
    front: {
      dy: 0,
      L: { s: [8.5, 25], e: [4, 26.5], w: [1.5, 23.5], k: [0.6, 0.4], hand: 'open', z: 'front' },
      R: { s: [23.5, 25], e: [23, 30], w: [19.5, 28.5], k: [0.6, 0.2], hand: 'open', z: 'front' },
      legs: 'stand',
      expr: 'open',
    },
  },
  /** Likay: THE sequinned pose – one arm flung up, the other on the hip. */
  act_f_likay_pose: {
    front: {
      dy: 0,
      L: { s: [8.5, 25], e: [4.5, 21], w: [3.5, 15], k: [0.5, 0.3], hand: 'open', z: 'top' },
      R: { s: [23.5, 25], e: [28, 28], w: [24.5, 31.5], k: [0.8, 0.5], hand: 'fist', z: 'front' },
      legs: 'stand',
      expr: 'happy',
    },
  },
  /** Likay: a sword stroke (the sword is drawn by the scene). */
  act_f_likay_fight: {
    front: {
      dy: 0,
      L: restingArm(0, 1, 'back', 'fist'),
      R: { s: [23.5, 25], e: [27.5, 21.5], w: [30, 17.5], k: [0.5, 0.3], hand: 'fist', z: 'top' },
      legs: 'stand',
      expr: 'think',
    },
  },
  /** Jump scare! Hands to the cheeks. */
  act_f_scared: {
    front: {
      dy: 0,
      L: { s: [8.5, 25], e: [6.5, 28.5], w: [10.5, 21.5], k: [0.6, 0.3], hand: 'open', z: 'top' },
      R: { s: [23.5, 25], e: [25.5, 28.5], w: [21.5, 21.5], k: [0.6, 0.3], hand: 'open', z: 'top' },
      legs: 'stand',
      expr: 'open',
    },
  },
}

export type FairPose = keyof typeof FAIR_POSES

for (const [name, views] of Object.entries(FAIR_POSES) as [`act_f_${string}`, Views][]) registerDollPose(name, (view) => views[view] ?? null)

/** Base pose used when a fair pose has no layout for a view (keeps callers simple). */
export function fairPoseDef(name: string, view: DollView): PoseDef | null {
  return FAIR_POSES[name as FairPose]?.[view] ?? null
}

/**
 * Wrist of the hand holding things (the screen-right arm, `R`) in sprite
 * pixels (the 1 px outline included), following the girl doll's narrower
 * shoulders. Falls back to the resting hand for unknown poses.
 */
export function fairHand(name: string, view: DollView, look: Pick<AvatarLook, 'gender'>, side: 'R' | 'L' = 'R'): { x: number; y: number } {
  const def = fairPoseDef(name, view)
  const arm = (def ? def[side] : null) ?? rest()[side]
  const k = arm.k ?? [1, 1]
  const sx = side === 'L' ? 1 : -1
  const shift = look.gender === 'f' ? sx * k[1] : 0
  return { x: Math.round(arm.w[0] + shift) + 1, y: Math.round(arm.w[1] + (look.gender === 'f' ? 0.5 * k[1] : 0)) + 1 }
}
