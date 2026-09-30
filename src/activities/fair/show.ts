// Base for the fair's rides and shows (ferris wheel, carousel, claw machine,
// likay): a JobScene without scoring. It adds a HUD tip, an optional action
// button the shell draws above the HUD (📸, เชียร์!), a souvenir won this go
// and a photo snapped from the stage canvas.

import { JobScene } from '../jobs/base'

export interface ShowAction {
  label: string
  icon: string
  /** Glow and wiggle: now is the moment. */
  hot?: boolean
  disabled?: boolean
}

export abstract class FairShow extends JobScene {
  /** Collectible won this go (`once`: only if not owned yet). */
  prize: { id: string; once?: boolean } | null = null
  /** A snapshot taken during the go (data URL), shown on the result card. */
  photo: string | null = null
  /** Set by the shell: snapshot of the stage canvas. */
  snap?: () => string | null
  /** HUD line. */
  abstract tip(): string
  action(): ShowAction | null {
    return null
  }
  onAction(): void {}
  progress() {
    return Math.min(1, this.elapsed / this.duration)
  }
  goalText() {
    return this.tip()
  }
  /** Rides end on their own; they are never "complete" early. */
  complete() {
    return false
  }
}
