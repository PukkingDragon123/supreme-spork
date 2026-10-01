// Action poses for the temple mini-games (the player's HD doll doing the
// thing: lifting food to a monk's bowl, tossing koi food, swinging a bell
// striker, shaking a siamsi cup...). Registered with the doll as `act_t_*`.
//
// Coordinates are in the 32-px doll space used by src/art/doll.ts. Shoulders
// sit at y 25 when standing (34 when kneeling, dy 9). `L` is always the arm on
// the screen-left, `R` the screen-right one, in both views. Props held in the
// hands are drawn by the scenes at `tWrist()`.

import { DOLL_W, dollJoint, registerDollPose, restingArm, type ArmDef, type DollView, type Hand, type PoseDef, type Pt } from '../doll'

export type TPose =
  | 'alms_hold'
  | 'alms_give'
  | 'alms_scoop'
  | 'toss_ready'
  | 'toss_throw'
  | 'bell_ready'
  | 'bell_up'
  | 'bell_hit'
  | 'log_hold'
  | 'log_pull'
  | 'log_push'
  | 'incense_hold'
  | 'incense_light'
  | 'incense_wai'
  | 'incense_plant'
  | 'offer_up'
  | 'ss_hold'
  | 'ss_shake_a'
  | 'ss_shake_b'
  | 'ss_happy'
  | 'rub_a'
  | 'rub_b'
  | 'powder'
  | 'press_a'
  | 'press_b'
  | 'leaf_hold'
  | 'coin_hold'
  | 'coin_drop'
  | 'candle_walk'
  | 'candle_walk_b'
  | 'ladle_up'
  | 'ladle_dip'
  | 'pour_head'
  | 'kt_raise'
  | 'kt_lower'
  | 'kt_push'
  | 'pet_a'
  | 'pet_b'
  | 'feed_pour'
  | 'cheer'

type ArmSpec = [Pt, Pt, Pt, Hand, ArmDef['z'], [number, number]?]

interface Spec {
  dy?: number
  legs?: PoseDef['legs']
  expr?: PoseDef['expr']
  wai?: boolean
  L?: ArmSpec | 'rest' | null
  R?: ArmSpec | 'rest' | null
}

const K = 9 // kneeling drop

const arm = (a: ArmSpec | 'rest' | null | undefined, side: 1 | -1, dy: number): ArmDef | null => {
  if (a === null) return null
  if (a === undefined || a === 'rest') return restingArm(dy, side)
  const [s, e, w, hand, z, k] = a
  return { s, e, w, hand, z, k }
}

/** Mirror an arm spec across the doll's centre line (L ↔ R). */
const mirror = (a: ArmSpec): ArmSpec => [[31 - a[0][0] + 1, a[0][1]], [31 - a[1][0] + 1, a[1][1]], [31 - a[2][0] + 1, a[2][1]], a[3], a[4], a[5]]

// Shared arm shapes -----------------------------------------------------------

// Front: both hands meeting at the chest, a little right of centre.
const F_HOLD_L: ArmSpec = [[8.5, 25], [10, 30.5], [16.5, 30], 'fist', 'front', [0.5, 0]]
const F_HOLD_R: ArmSpec = [[23.5, 25], [24.5, 30.5], [20.5, 29.5], 'fist', 'front', [0.5, 0]]

const SPECS: Record<TPose, { front?: Spec; back?: Spec }> = {
  // ตักบาตร: hold the food at the chest, then reach it out to the monk on the right.
  alms_hold: {
    front: { L: F_HOLD_L, R: F_HOLD_R, expr: 'smile' },
  },
  alms_give: {
    front: {
      L: [[8.5, 25], [12, 30], [21.5, 28.5], 'fist', 'front', [0.6, 0.2]],
      R: [[23.5, 25], [27, 27.5], [29.5, 24.5], 'fist', 'top', [0.5, 0.3]],
      expr: 'happy',
    },
  },
  alms_scoop: {
    front: {
      L: [[8.5, 25], [10, 30.5], [15.5, 31], 'fist', 'front', [0.5, 0]],
      R: [[23.5, 25], [27, 26], [29, 22], 'fist', 'top', [0.5, 0.3]],
      expr: 'open',
    },
  },
  // Koi food: the bag in the left hand, the right arm winds up / throws.
  toss_ready: {
    back: {
      L: [[8.5, 25], [6.5, 29], [8.5, 31.5], 'fist', 'back'],
      R: [[23.5, 25], [26.5, 28.5], [27.5, 31.5], 'fist', 'top'],
      expr: 'smile',
    },
  },
  toss_throw: {
    back: {
      L: [[8.5, 25], [6.5, 29], [8.5, 31.5], 'fist', 'back'],
      R: [[23.5, 25], [27.5, 22], [29, 17.5], 'open', 'top', [0.5, 0.3]],
      expr: 'open',
    },
  },
  // Bell striker in the right hand.
  bell_ready: {
    back: { L: 'rest', R: [[23.5, 25], [26, 29], [27.5, 31], 'fist', 'top'] },
  },
  bell_up: {
    back: { L: 'rest', R: [[23.5, 25], [27.5, 22.5], [28.5, 18], 'fist', 'top', [0.5, 0.3]] },
  },
  bell_hit: {
    back: { L: 'rest', R: [[23.5, 25], [27, 21], [25, 16.5], 'fist', 'top', [0.5, 0.3]] },
  },
  // Big bell log: seen from the front, holding the rope to the left.
  log_hold: {
    front: {
      L: [[8.5, 25], [6, 29.5], [3.5, 28], 'fist', 'front', [0.5, 0.3]],
      R: [[23.5, 25], [20, 30], [6.5, 29], 'fist', 'front', [0.6, 0.3]],
      expr: 'smile',
    },
  },
  log_pull: {
    front: {
      L: [[8.5, 25], [9, 30.5], [7, 31.5], 'fist', 'front', [0.5, 0.3]],
      R: [[23.5, 25], [22, 30.5], [10, 31], 'fist', 'front', [0.6, 0.3]],
      expr: 'think',
    },
  },
  log_push: {
    front: {
      L: [[8.5, 25], [4.5, 27], [1, 26.5], 'fist', 'top', [0.5, 0.3]],
      R: [[23.5, 25], [16, 28.5], [4, 27.5], 'fist', 'front', [0.6, 0.3]],
      expr: 'open',
    },
  },
  // Incense: held up in a wai, lit at the candle on the left, planted in the bowl.
  incense_hold: {
    back: { L: [[8.5, 25], [6.5, 29], [10.5, 29], 'none', 'back'], R: [[23.5, 25], [25.5, 29], [21.5, 29], 'none', 'back'] },
  },
  incense_light: {
    back: {
      L: [[8.5, 25], [5, 28.5], [1.5, 27], 'fist', 'top', [0.5, 0.3]],
      R: [[23.5, 25], [25.5, 29], [21.5, 30], 'none', 'back'],
    },
  },
  incense_wai: {
    back: {
      L: [[8.5, 25], [6.2, 27], [11, 20], 'none', 'back', [0.5, 0]],
      R: [[23.5, 25], [25.8, 27], [21, 20], 'none', 'back', [0.5, 0]],
      expr: 'serene',
    },
  },
  incense_plant: {
    back: {
      L: [[8.5, 25], [5, 28], [2.5, 31.5], 'fist', 'top', [0.5, 0.3]],
      R: [[23.5, 25], [25.5, 29], [21.5, 30], 'none', 'back'],
    },
  },
  // Holding an offering up and forward (back view, right arm).
  offer_up: {
    back: { L: 'rest', R: [[23.5, 25], [27.5, 23], [29, 19], 'fist', 'top', [0.5, 0.3]] },
  },
  // เซียมซี: kneeling, both hands on the cup at the chest, shaking.
  ss_hold: {
    front: {
      dy: K,
      legs: 'kneelF',
      L: [[8.5, 34], [9.5, 39], [13.5, 38.5], 'fist', 'front', [0.5, 0]],
      R: [[23.5, 34], [22.5, 39], [18.5, 38.5], 'fist', 'front', [0.5, 0]],
      expr: 'serene',
    },
  },
  ss_shake_a: {
    front: {
      dy: K,
      legs: 'kneelF',
      L: [[8.5, 34], [9, 38.5], [12.5, 37], 'fist', 'front', [0.5, 0]],
      R: [[23.5, 34], [22, 39], [17.5, 37.5], 'fist', 'front', [0.5, 0]],
      expr: 'think',
    },
  },
  ss_shake_b: {
    front: {
      dy: K,
      legs: 'kneelF',
      L: [[8.5, 34], [10, 39], [14.5, 37.5], 'fist', 'front', [0.5, 0]],
      R: [[23.5, 34], [23, 38.5], [19.5, 37], 'fist', 'front', [0.5, 0]],
      expr: 'think',
    },
  },
  ss_happy: {
    front: {
      dy: K,
      legs: 'kneelF',
      L: [[8.5, 34], [9.5, 39], [13.5, 38.5], 'fist', 'front', [0.5, 0]],
      R: [[23.5, 34], [22.5, 39], [18.5, 38.5], 'fist', 'front', [0.5, 0]],
      expr: 'happy',
    },
  },
  // Rubbing powder on the tree / pressing gold leaf: right arm up to the surface.
  rub_a: {
    back: { L: 'rest', R: [[23.5, 25], [27, 22], [26, 16.5], 'open', 'top', [0.5, 0.3]] },
  },
  rub_b: {
    back: { L: 'rest', R: [[23.5, 25], [28, 22.5], [29.5, 17.5], 'open', 'top', [0.5, 0.3]] },
  },
  powder: {
    back: { L: 'rest', R: [[23.5, 25], [27.5, 23.5], [28.5, 19], 'fist', 'top', [0.5, 0.3]] },
  },
  press_a: {
    back: { L: [[8.5, 25], [6.5, 29], [9.5, 31], 'none', 'back'], R: [[23.5, 25], [27, 22], [26, 16.5], 'open', 'top', [0.5, 0.3]] },
  },
  press_b: {
    back: { L: [[8.5, 25], [6.5, 29], [9.5, 31], 'none', 'back'], R: [[23.5, 25], [27.5, 21.5], [27.5, 15.5], 'open', 'top', [0.5, 0.3]] },
  },
  leaf_hold: {
    back: { L: 'rest', R: [[23.5, 25], [27, 27], [28, 23], 'fist', 'top', [0.5, 0.3]] },
  },
  // Donation box: a coin pinched in the right hand, dropped into the slot.
  coin_hold: {
    back: { L: 'rest', R: [[23.5, 25], [27, 27.5], [28, 23.5], 'fist', 'top', [0.5, 0.3]] },
  },
  coin_drop: {
    back: { L: 'rest', R: [[23.5, 25], [27.5, 22], [27.5, 17], 'open', 'top', [0.5, 0.3]] },
  },
  // เวียนเทียน: candle, incense and lotus held together at the chest.
  candle_walk: {
    front: {
      L: [[8.5, 25], [9, 30.5], [14, 29.5], 'none', 'front', [0.5, 0]],
      R: [[23.5, 25], [23, 30.5], [18, 29.5], 'none', 'front', [0.5, 0]],
      expr: 'serene',
      wai: true,
    },
    back: {
      L: [[8.5, 25], [6.5, 29], [10.5, 29.5], 'none', 'back', [0.5, 0]],
      R: [[23.5, 25], [25.5, 29], [21.5, 29.5], 'none', 'back', [0.5, 0]],
      expr: 'serene',
    },
  },
  candle_walk_b: {
    front: {
      L: [[8.5, 25], [9, 30], [14, 29], 'none', 'front', [0.5, 0]],
      R: [[23.5, 25], [23, 30], [18, 29], 'none', 'front', [0.5, 0]],
      expr: 'smile',
      wai: true,
    },
    back: {
      L: [[8.5, 25], [6.8, 28.5], [10.5, 29], 'none', 'back', [0.5, 0]],
      R: [[23.5, 25], [25.2, 28.5], [21.5, 29], 'none', 'back', [0.5, 0]],
      expr: 'serene',
    },
  },
  // Holy water: ladle in the right hand, dipped into the jar on the right.
  ladle_up: {
    back: { L: 'rest', R: [[23.5, 25], [27.5, 24], [30, 21], 'fist', 'top', [0.5, 0.3]] },
  },
  ladle_dip: {
    back: { L: 'rest', R: [[23.5, 25], [27.5, 28], [30.5, 30.5], 'fist', 'top', [0.5, 0.3]] },
  },
  // Pouring the ladle over your own head (front view), left hand in a half wai.
  pour_head: {
    front: {
      L: [[8.5, 25], [9.5, 30.5], [14.5, 29], 'open', 'front', [0.5, 0]],
      R: [[23.5, 25], [27.5, 21.5], [25, 16], 'fist', 'top', [0.5, 0.3]],
      expr: 'serene',
    },
  },
  // Krathong: raised to the forehead for the wish, lowered to the water, pushed off.
  kt_raise: {
    back: {
      dy: K,
      legs: 'kneelB',
      L: [[8.5, 34], [5.5, 31], [7, 27], 'fist', 'top', [0.5, 0.3]],
      R: [[23.5, 34], [26.5, 31], [25, 27], 'fist', 'top', [0.5, 0.3]],
      expr: 'serene',
    },
  },
  kt_lower: {
    back: {
      dy: K,
      legs: 'kneelB',
      L: [[8.5, 34], [7.5, 38.5], [10.5, 41], 'none', 'back'],
      R: [[23.5, 34], [27, 37.5], [30, 39], 'fist', 'top', [0.5, 0.3]],
      expr: 'serene',
    },
  },
  kt_push: {
    back: {
      dy: K,
      legs: 'kneelB',
      L: [[8.5, 34], [7.5, 38.5], [10.5, 41], 'none', 'back'],
      R: [[23.5, 34], [27.5, 35], [30.5, 32.5], 'open', 'top', [0.5, 0.3]],
      expr: 'smile',
    },
  },
  // Temple dog: kneeling, patting the dog on the right; pouring its food.
  pet_a: {
    front: {
      dy: K,
      legs: 'kneelF',
      L: [[8.5, 34], [8, 38.5], [10.5, 42], 'rest', 'front', [1, 0.5]],
      R: [[23.5, 34], [27.5, 32], [31, 29.5], 'open', 'top', [0.5, 0.3]],
      expr: 'happy',
    },
  },
  pet_b: {
    front: {
      dy: K,
      legs: 'kneelF',
      L: [[8.5, 34], [8, 38.5], [10.5, 42], 'rest', 'front', [1, 0.5]],
      R: [[23.5, 34], [28, 33], [31.5, 31.5], 'open', 'top', [0.5, 0.3]],
      expr: 'happy',
    },
  },
  feed_pour: {
    front: {
      dy: K,
      legs: 'kneelF',
      L: [[8.5, 34], [12, 38.5], [21, 36.5], 'fist', 'front', [0.6, 0.2]],
      R: [[23.5, 34], [27, 36], [29.5, 33], 'fist', 'top', [0.5, 0.3]],
      expr: 'smile',
    },
  },
  cheer: {
    front: {
      L: [[8.5, 25], [5, 23.5], [4, 19.5], 'open', 'top', [0.5, 0.3]],
      R: [[23.5, 25], [27, 23.5], [28, 19.5], 'open', 'top', [0.5, 0.3]],
      expr: 'happy',
    },
    back: {
      L: [[8.5, 25], [5, 23.5], [4, 19.5], 'open', 'top', [0.5, 0.3]],
      R: [[23.5, 25], [27, 23.5], [28, 19.5], 'open', 'top', [0.5, 0.3]],
      expr: 'happy',
    },
  },
}

function build(sp: Spec): PoseDef {
  const dy = sp.dy ?? 0
  return {
    dy,
    L: arm(sp.L, 1, dy),
    R: arm(sp.R, -1, dy),
    legs: sp.legs ?? 'stand',
    expr: sp.expr ?? 'smile',
    wai: sp.wai ? 'chest' : null,
  }
}

const BUILT = new Map<string, PoseDef>()
function def(name: TPose, view: DollView): PoseDef | null {
  const k = `${name}:${view}`
  if (BUILT.has(k)) return BUILT.get(k)!
  const s = SPECS[name]
  const sp = s[view] ?? (view === 'back' ? null : null)
  if (!sp) return null
  const d = build(sp)
  BUILT.set(k, d)
  return d
}

let registered = false
/** Register every temple pose with the doll (idempotent; runs on import). */
export function registerTemplePoses() {
  if (registered) return
  registered = true
  for (const name of Object.keys(SPECS) as TPose[]) {
    registerDollPose(`act_t_${name}`, (view) => def(name, view))
    // Face variants (happy / focused / surprised...) for the same body pose.
    for (const e of EXPRS)
      registerDollPose(`act_t_${name}__${e}`, (view) => {
        const d = def(name, view)
        return d ? { ...d, expr: e } : null
      })
  }
}

/** Faces a temple pose can wear: 'think' reads as focused, 'open' as surprised. */
export const EXPRS = ['smile', 'happy', 'think', 'open', 'serene'] as const
export type TExpr = (typeof EXPRS)[number]
registerTemplePoses()

/** Every temple pose name. */
export const T_POSE_NAMES = Object.keys(SPECS) as TPose[]
export const isTPose = (name: string): name is TPose => name in SPECS

export const tp = (name: TPose) => `act_t_${name}` as const

/** Views a pose was authored for. */
export function tPoseViews(name: TPose): DollView[] {
  return (['front', 'back'] as DollView[]).filter((v) => !!SPECS[name][v])
}

/**
 * Wrist position of one arm in *sprite* pixels (the outlined DOLL_W×DOLL_H
 * frame), including the narrower shoulders of the female body. `side` 1 is
 * the screen-left arm, -1 the screen-right one. Returns the centre of the hand.
 */
export function tWrist(name: TPose, view: DollView, side: 1 | -1, gender: 'm' | 'f' = 'm', flip = false): [number, number] | null {
  const d = def(name, view)
  const a = d ? (side === 1 ? d.L : d.R) : null
  if (!a) return null
  // compose space → sprite pixels (girls' shoulders, v5 proportions, outline)
  const [x, y] = dollJoint({ gender }, tp(name), view, side, a)
  return [flip ? DOLL_W - x : x, y]
}

export { mirror as mirrorArm }
