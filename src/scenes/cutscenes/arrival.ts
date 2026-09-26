// TEMP stand-in (replaced by the cinematic implementation).
import type { Scene } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import type { AvatarLook } from '../../art/avatar'
import type { CutsceneEvents } from './intro'
export class ArrivalCutscene implements Scene {
  t = 0
  private done = false
  constructor(
    public opts: { look: AvatarLook; area: 'wat' | 'shrine' | 'river' | 'mountain'; first: boolean },
    private ev: CutsceneEvents,
  ) {
    ev.onCaption?.(opts.area)
  }
  skip() {
    if (!this.done) (this.done = true), this.ev.onCaption?.(null), this.ev.onDone?.()
  }
  update(dt: number) {
    this.t += dt
    if (this.t > 2) this.skip()
  }
  render(g: Surface) {
    g.gradientV(0, 0, g.w, g.h, ['#8fd0f0', '#fff3a6'])
  }
}
