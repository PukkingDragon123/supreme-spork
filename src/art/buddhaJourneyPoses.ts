// Doll action poses for the journey map: a two-frame arm swing used while the
// player's avatar walks along the road to the next stage (the body bobs in
// the view to sell the steps).

import { registerDollPose, type ArmDef, type DollView, type PoseDef } from './doll'

const arm = (s: [number, number], e: [number, number], w: [number, number], z: ArmDef['z']): ArmDef => ({ s, e, w, hand: 'rest', z })

function walk(frame: 0 | 1) {
  return (view: DollView): PoseDef => {
    const a = frame === 0 ? 1 : -1
    // Screen-left arm (L) swings out while the right one tucks in, then swap.
    const L = arm([8.5, 25], [8.5 - 1.6 * a, 29.2], [8.2 - 2.4 * a, 31.6 - a * 0.8], view === 'back' ? 'back' : a > 0 ? 'back' : 'front')
    const R = arm([23.5, 25], [23.5 - 1.6 * a, 29.2], [23.8 - 2.4 * a, 31.6 + a * 0.8], view === 'back' ? 'back' : a > 0 ? 'front' : 'back')
    return { dy: 0, L, R, legs: 'stand', expr: 'happy' }
  }
}

registerDollPose('act_bj_walk1', walk(0))
registerDollPose('act_bj_walk2', walk(1))

export const BJ_WALK_POSES = ['act_bj_walk1', 'act_bj_walk2'] as const
