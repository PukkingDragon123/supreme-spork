// The player at a fair booth, seen from behind at the bottom of the scene
// (over-the-shoulder), in an `act_f_*` pose, plus helpers to put things in
// their hand: the held dart, the ring, the cork gun.

import type { Surface } from '../../engine/pixel'
import { game } from '../../game/state'
import { dollSprite, DOLL_H, DOLL_W, type DollPose } from '../../art/doll'
import { fairHand } from '../../art/poses/fair'
import { drawShadow } from '../../art/props'

export interface Placed {
  /** Top-left of the doll sprite. */
  x: number
  y: number
  /** The holding (screen-right) hand. */
  hand: { x: number; y: number }
  /** The other hand. */
  hand2: { x: number; y: number }
}

/** Where the doll goes for a pose: centred on `cx`, feet `feetBelow` px under `bottom`. */
export function placePlayer(pose: DollPose, cx: number, bottom: number, feetBelow = 14, view: 'front' | 'back' = 'back'): Placed {
  const look = game.value.player.look
  const x = Math.round(cx - DOLL_W / 2)
  const y = Math.round(bottom + feetBelow - DOLL_H)
  const h = fairHand(pose, view, look, 'R')
  const h2 = fairHand(pose, view, look, 'L')
  return { x, y, hand: { x: x + h.x, y: y + h.y }, hand2: { x: x + h2.x, y: y + h2.y } }
}

/** Draw the player at a booth (back view) and return where their hands are. */
export function drawPlayer(g: Surface, pose: DollPose, cx: number, bottom: number, o: { feetBelow?: number; view?: 'front' | 'back'; dx?: number; dy?: number } = {}): Placed {
  const view = o.view ?? 'back'
  const p = placePlayer(pose, cx + (o.dx ?? 0), bottom + (o.dy ?? 0), o.feetBelow ?? 14, view)
  const sp = dollSprite(game.value.player.look, pose, { view })
  drawShadow(g, cx, bottom + (o.feetBelow ?? 14) - 1, 12, 3)
  g.draw(sp.canvas, p.x, p.y)
  return p
}

/** A toy cork gun held at (bx, by), pointing at (tx, ty); `recoil` 0..1 kicks it back. */
export function drawHeldGun(g: Surface, bx: number, by: number, tx: number, ty: number, recoil: number) {
  const ang = Math.atan2(ty - by, tx - bx)
  const back = recoil * 4
  const sx = bx - Math.cos(ang) * (6 + back)
  const sy = by - Math.sin(ang) * (6 + back)
  const ex = bx + Math.cos(ang) * (24 - back)
  const ey = by + Math.sin(ang) * (24 - back)
  g.thickLine(sx, sy, ex, ey, 5, '#5a3a2a')
  g.thickLine(sx, sy, ex, ey, 3, '#8a5a3a')
  g.line(sx + 1, sy, ex + 1, ey, '#a8784a')
  g.circle(Math.round(ex), Math.round(ey), 2.6, '#3a3040')
  g.px(Math.round(ex), Math.round(ey), '#c8a878')
  if (recoil > 0.6) {
    g.px(Math.round(ex + Math.cos(ang) * 4), Math.round(ey + Math.sin(ang) * 4), '#fff3a6')
    g.px(Math.round(ex + Math.cos(ang) * 6 + 1), Math.round(ey + Math.sin(ang) * 6), '#ffffff')
  }
}
