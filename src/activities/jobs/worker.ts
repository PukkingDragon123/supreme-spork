// The player's avatar inside a job or kitchen scene: follows a target with a
// springy walk (little step bob and dust puffs), blinks, and plays short
// reactions (cheer, thumbs up, oops, phew) on top of whatever work pose the
// scene sets each frame.

import type { Surface } from '../../engine/pixel'
import type { Particles } from '../../engine/particles'
import { rand } from '../../engine/rng'
import { game } from '../../game/state'
import type { AvatarLook } from '../../art/avatar'
import type { DollPose, DollView } from '../../art/doll'
import { WP, type Side } from '../../art/poses/work'
import { drawFist, drawWorker, wristAt, type FaceFx } from '../../art/workActor'
import { shadow } from '../../art/jobs'

export type Reaction = 'cheer' | 'thumbs' | 'oops' | 'phew'

export class Worker {
  look: AvatarLook
  x: number
  y: number
  tx: number
  ty: number
  /** Spring rate toward the target (1/s). */
  follow = 14
  view: DollView = 'front'
  pose: DollPose = 'stand'
  flip = false
  face: FaceFx = 'none'
  apron = false
  clipY: number | undefined
  shadow = true
  speed = 0
  private blinkT = rand(1.5, 3.5)
  private blinking = 0
  private step = 0
  private react: { kind: Reaction; t: number } | null = null
  t = 0

  constructor(x: number, y: number, look?: AvatarLook) {
    this.look = look ?? game.value.player.look
    this.x = this.tx = x
    this.y = this.ty = y
  }

  /** Walk toward a feet position. */
  goTo(x: number, y: number) {
    this.tx = x
    this.ty = y
  }

  /** Jump straight to a feet position. */
  place(x: number, y: number) {
    this.x = this.tx = x
    this.y = this.ty = y
  }

  reactWith(kind: Reaction, t = 1.2) {
    this.react = { kind, t }
  }

  get reacting(): Reaction | null {
    return this.react?.kind ?? null
  }

  update(dt: number, particles?: Particles) {
    this.t += dt
    const k = 1 - Math.exp(-dt * this.follow)
    const ox = this.x
    const oy = this.y
    this.x += (this.tx - this.x) * k
    this.y += (this.ty - this.y) * k
    const v = Math.hypot(this.x - ox, this.y - oy) / Math.max(1e-3, dt)
    this.speed += (v - this.speed) * Math.min(1, dt * 12)
    if (this.speed > 12) {
      const before = Math.floor(this.step)
      this.step += dt * Math.min(9, 3 + this.speed / 20)
      if (Math.floor(this.step) !== before && particles && this.speed > 30)
        particles.add({ kind: 'smoke', x: this.x + rand(-4, 4), y: this.y - 1, vx: rand(-6, 6), vy: rand(-8, -3), max: 0.45, color: '#e8dcc8', size: 1 })
    }
    this.blinkT -= dt
    if (this.blinking > 0) this.blinking -= dt
    if (this.blinkT <= 0) {
      this.blinking = 0.12
      this.blinkT = rand(2, 4.5)
    }
    if (this.react) {
      this.react.t -= dt
      if (this.react.t <= 0) this.react = null
    }
  }

  /** 0/1 px step bob while walking. */
  get bob() {
    return this.speed > 12 && Math.floor(this.step * 2) % 2 === 0 ? 1 : 0
  }

  /** The pose actually shown (a reaction overrides the work pose). */
  get shownPose(): DollPose {
    const r = this.react?.kind
    if (!r) return this.pose
    if (this.view === 'back') return r === 'cheer' || r === 'thumbs' ? WP.cheerBack : this.pose
    return r === 'cheer' ? WP.cheer : r === 'thumbs' ? WP.thumbs : r === 'oops' ? WP.oops : WP.phew
  }

  get fx(): FaceFx {
    const r = this.react?.kind
    if (r === 'oops') return 'sweat'
    if (r === 'phew') return 'sweat'
    if (r === 'thumbs' || r === 'cheer') return this.face === 'none' ? 'sparkle' : this.face
    return this.face
  }

  get feetY() {
    return Math.round(this.y) - this.bob
  }

  /** World position of a wrist in the current pose. */
  wrist(side: Side): [number, number] {
    return wristAt(this.shownPose, side, Math.round(this.x), this.feetY, this.flip)
  }

  draw(g: Surface) {
    const x = Math.round(this.x)
    const y = this.feetY
    if (this.shadow && this.clipY === undefined) shadow(g, x, Math.round(this.y) + 1, 9, 2.6, 0.6)
    const pose = this.shownPose
    drawWorker(g, this.look, pose, x, y, {
      view: this.view,
      flip: this.flip,
      blink: this.blinking > 0 && !this.react,
      apron: this.apron,
      clipY: this.clipY,
      face: this.fx,
      t: this.t,
    })
    if (this.react?.kind === 'thumbs' && this.view === 'front') {
      const [wx, wy] = this.wrist('R')
      drawFist(g, this.look, wx, wy, 'up')
    }
  }

  /** Fists over a held tool. */
  fists(g: Surface, sides: Side[] = ['L', 'R']) {
    for (const s of sides) {
      const [wx, wy] = this.wrist(s)
      drawFist(g, this.look, wx, wy)
    }
  }
}
