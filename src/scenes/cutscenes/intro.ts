// TEMP stand-in (replaced by the cinematic implementation).
import type { Scene } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
export interface CutsceneEvents { onCaption?(text: string | null): void; onDone?(): void }
export class IntroCutscene implements Scene {
  t = 0
  private done = false
  constructor(private ev: CutsceneEvents) {
    ev.onCaption?.('ทุกเช้าที่กรุงเทพฯ…')
  }
  skip() {
    if (!this.done) (this.done = true), this.ev.onDone?.()
  }
  update(dt: number) {
    this.t += dt
    if (this.t > 3) this.skip()
  }
  render(g: Surface) {
    g.gradientV(0, 0, g.w, g.h, ['#2c2f63', '#f6a15b'])
  }
}
