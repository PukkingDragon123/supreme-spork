// Animated hero banner carousel at the top of the shop: auto-advances,
// swipes, and each slide has a live pixel scene.

import { useEffect, useRef, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import type { AvatarLook } from '../../art/avatar'
import { PT } from '../pixeltext'
import { PixelAnim, drawDollAndPet, drawPet, drawRays, drawTwinkles, type DrawFn } from './PixelAnim'
import { drawFlood, tryOn } from './ShopCards'
import { sfx } from '../../engine/audio'

export interface Slide {
  id: string
  theme: string
  kicker: string
  title: string
  sub: string
  cta: string
  onCta: () => void
  art: DrawFn
}

export function dressed(look: AvatarLook, ids: string[]): AvatarLook {
  let l = { ...look }
  for (const id of ids) {
    const o = OUTFIT_BY_ID[id]
    if (o) l = tryOn(l, o)
  }
  return l
}

/** Slide art helpers. */
export const slideArt = {
  outfit: (look: AvatarLook, pet: string | null, rays: string): DrawFn => (ctx, t) => {
    drawRays(ctx, t, 30, 30, 60, rays, 9)
    drawTwinkles(ctx, t, 62, 58, 6, '#fffbe0', 4)
    drawDollAndPet(ctx, t, look, pet, pet ? 22 : 31, 56)
  },
  flood: (look: AvatarLook, pet: string | null): DrawFn => (ctx, t) => {
    drawTwinkles(ctx, t, 62, 40, 4, '#dff4ff', 9)
    drawDollAndPet(ctx, t, look, null, 24, 56)
    if (pet) drawPet(ctx, t, pet, 48, 46)
    drawFlood(ctx, t, 62, 58, 16)
  },
  pet: (pet: string, rays: string): DrawFn => (ctx, t) => {
    drawRays(ctx, t, 31, 34, 60, rays, 9)
    drawTwinkles(ctx, t, 62, 58, 7, '#fffbe0', 6)
    drawPet(ctx, t, pet, 31, 54)
  },
}

export function HeroBanner({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0)
  const drag = useRef<{ x: number; t: number } | null>(null)
  const n = slides.length
  const cur = n ? ((i % n) + n) % n : 0
  useEffect(() => {
    if (n < 2 || game.value.settings.reduceMotion) return
    const id = setInterval(() => setI((v) => v + 1), 5200)
    return () => clearInterval(id)
  }, [n, i])
  if (!n) return null
  const go = (d: number) => {
    sfx.whoosh()
    setI(cur + d)
  }
  return (
    <div
      class="sh-hero"
      onPointerDown={(e) => (drag.current = { x: e.clientX, t: Date.now() })}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (!d) return
        const dx = e.clientX - d.x
        if (Math.abs(dx) > 36) go(dx < 0 ? 1 : -1)
      }}
    >
      <div class="sh-hero-track" style={{ transform: `translateX(${-cur * 100}%)` }}>
        {slides.map((s, k) => (
          <div key={s.id} class={`sh-slide theme-${s.theme}`} aria-hidden={k !== cur}>
            <div class="sh-slide-copy">
              <span class="sh-kicker">{s.kicker}</span>
              <PT text={s.title} size={12} weight={600} color="#fff6dc" outline="#3b2616" />
              <span class="sh-slide-sub">{s.sub}</span>
              <button class="btn small sh-slide-cta" onClick={() => (sfx.open(), s.onCta())} tabIndex={k === cur ? 0 : -1}>
                <PT text={s.cta} size={10} weight={600} color="#5a3410" shadow="#ffe58a" />
              </button>
            </div>
            <PixelAnim w={62} h={58} scale={2} class="sh-slide-art" draw={s.art} still={k !== cur} />
          </div>
        ))}
      </div>
      <div class="sh-dots" role="tablist">
        {slides.map((s, k) => (
          <button key={s.id} class={`sh-dot ${k === cur ? 'on' : ''}`} aria-label={s.title} aria-selected={k === cur} onClick={() => (sfx.tap(), setI(k))} />
        ))}
      </div>
    </div>
  )
}
