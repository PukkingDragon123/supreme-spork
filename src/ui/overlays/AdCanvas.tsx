// Animated placeholder for a rewarded video ad (demo provider only).

import { useEffect, useRef } from 'preact/hooks'
import { Stage, type Scene } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { Particles } from '../../engine/particles'
import { bigDogSprite, DOG_COATS } from '../../art/characters'
import { P } from '../../art/palette'

class AdScene implements Scene {
  w = 120
  h = 200
  t = 0
  p = new Particles()
  resize(w: number, h: number) {
    this.w = w
    this.h = h
  }
  update(dt: number) {
    this.t += dt
    if (Math.random() < dt * 8) this.p.sparkles(Math.random() * this.w, Math.random() * this.h * 0.7, 1, P.goldL)
    this.p.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    g.gradientV(0, 0, w, h, ['#ffe3a0', '#ffc4d8', '#a4dcff'])
    // Sun rays.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + this.t * 0.2
      g.line(w / 2, h * 0.38, w / 2 + Math.cos(a) * w, h * 0.38 + Math.sin(a) * w, i % 2 ? '#fff3a6' : '#ffe9b8')
    }
    // Rice bag.
    const bx = Math.round(w / 2 - 26)
    const by = Math.round(h * 0.34 + Math.sin(this.t * 3) * 2)
    g.rect(bx, by, 36, 46, '#fffaf0')
    g.rect(bx, by, 36, 6, '#e8514a')
    g.rect(bx + 4, by + 12, 28, 20, '#ffd54f')
    g.rect(bx + 6, by + 14, 24, 16, '#fff3a6')
    g.circle(bx + 18, by + 22, 5, '#86c95f')
    g.rect(bx, by + 40, 36, 6, '#e3d8c6')
    g.frame(bx, by, 36, 46, P.ink)
    // Mascot dog.
    const dog = bigDogSprite(DOG_COATS[0], Math.floor(this.t * 2) % 3 === 0 ? 'happy' : 'tongue')
    g.draw(dog.canvas, bx + 30, Math.round(h * 0.42 + Math.abs(Math.sin(this.t * 4)) * -6))
    // Ground.
    g.rect(0, Math.round(h * 0.62), w, h, '#86c95f')
    g.rect(0, Math.round(h * 0.62), w, 2, '#b4e486')
    this.p.render(g)
  }
}

export function AdCanvas() {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const st = new Stage(host.current!, { targetWidth: 120 })
    st.setScene(new AdScene())
    st.start()
    return () => st.destroy()
  }, [])
  return <div class="stage-host" ref={host} />
}
