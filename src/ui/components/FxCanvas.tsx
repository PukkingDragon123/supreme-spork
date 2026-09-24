// A small pixel canvas that plays celebratory particles (confetti, sparkles).

import { useEffect, useRef } from 'preact/hooks'
import { Stage, type Scene } from '../../engine/stage'
import { Particles } from '../../engine/particles'
import type { Surface } from '../../engine/pixel'

class FxScene implements Scene {
  p = new Particles()
  w = 100
  h = 100
  t = 0
  constructor(private mode: 'confetti' | 'sparkle' | 'coins') {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    if (this.mode === 'confetti') {
      this.p.confetti(w / 2, h * 0.45, 70)
      this.p.confetti(w * 0.2, h * 0.6, 30)
      this.p.confetti(w * 0.8, h * 0.6, 30)
    }
  }
  update(dt: number) {
    this.t += dt
    if (this.mode === 'sparkle' && Math.random() < dt * 14) this.p.sparkles(Math.random() * this.w, Math.random() * this.h, 1)
    if (this.mode === 'coins' && Math.random() < dt * 10)
      this.p.add({ kind: 'coin', x: Math.random() * this.w, y: -4, vy: 30 + Math.random() * 30, g: 60, max: 3 })
    if (this.mode === 'confetti' && this.t < 1.2 && Math.random() < dt * 20) this.p.sparkles(Math.random() * this.w, Math.random() * this.h * 0.6, 1)
    this.p.update(dt)
  }
  render(g: Surface) {
    g.clear()
    this.p.render(g)
  }
}

export function FxCanvas({ mode = 'confetti' }: { mode?: 'confetti' | 'sparkle' | 'coins' }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const st = new Stage(host.current!, { targetWidth: 140 })
    st.setScene(new FxScene(mode))
    st.el.style.pointerEvents = 'none'
    st.start()
    return () => st.destroy()
  }, [mode])
  return <div class="fx-canvas" ref={host} />
}
