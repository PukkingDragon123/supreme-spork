// TEMP stand-in (replaced by the cinematic implementation).
import type { Scene } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
export class TitleScene implements Scene {
  t = 0
  logoRect?: { x: number; y: number; w: number; h: number }
  update(dt: number) {
    this.t += dt
  }
  render(g: Surface) {
    g.gradientV(0, 0, g.w, g.h, ['#f6a15b', '#ffd98a', '#8fcf7a'])
  }
}
