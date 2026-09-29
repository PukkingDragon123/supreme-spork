// A tiny animated pixel canvas for shop banners, cards and the purchase
// modals: `draw(ctx, t)` runs every animation frame on a native-resolution
// canvas that CSS scales up crisply. Stops when unmounted and draws a single
// frame when `still` (or when the player asked for reduced motion).

import { useEffect, useRef } from 'preact/hooks'
import { game } from '../../game/state'
import { dollSprite, type DollPose } from '../../art/doll'
import { petSprite, type PetAnim, type PetFacing } from '../../art/pets'
import type { AvatarLook } from '../../art/avatar'
import { PET_BY_ID } from '../../game/data/pets'

export type DrawFn = (ctx: CanvasRenderingContext2D, t: number) => void

export function PixelAnim({ w, h, scale = 3, draw, still, class: cls, style }: { w: number; h: number; scale?: number; draw: DrawFn; still?: boolean; class?: string; style?: Record<string, string | number> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    const t0 = performance.now()
    const once = still || game.value.settings.reduceMotion
    let raf = 0
    const frame = (now: number) => {
      ctx.clearRect(0, 0, w, h)
      try {
        drawRef.current(ctx, once ? 1.2 : (now - t0) / 1000)
      } catch {
        /* never let a drawing hiccup break the shop */
      }
      if (!once) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [w, h, still])
  return <canvas ref={ref} width={w} height={h} class={`pixel-canvas sh-anim ${cls ?? ''}`} style={{ width: `${w * scale}px`, height: `${h * scale}px`, ...style }} aria-hidden="true" />
}

// ---------------------------------------------------------------------------
// Drawing helpers

export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx
      const v = (y + 0.5 - cy) / ry
      if (u * u + v * v <= 1) ctx.fillRect(x, y, 1, 1)
    }
}

/**
 * The doll showing off an outfit: stands, blinks, waves now and then and hops
 * with joy; `pet` trots in place next to it. `x` is the doll's centre,
 * `ground` the row its feet rest on.
 */
export function drawDollAndPet(ctx: CanvasRenderingContext2D, t: number, look: AvatarLook, pet: string | null, x: number, ground: number, opts: { petSide?: 1 | -1; pose?: DollPose; view?: 'front' | 'back'; hop?: boolean } = {}) {
  const cyc = t % 6
  const pose: DollPose = opts.pose ?? (cyc > 4.2 && cyc < 5.4 ? 'wave' : cyc > 2.2 && cyc < 2.9 ? 'happy' : 'stand')
  const blink = t % 3.4 > 3.25
  const s = dollSprite(look, pose, { view: opts.view ?? 'front', blink })
  const hop = opts.hop !== false && pose === 'happy' ? -Math.round(Math.abs(Math.sin((cyc - 2.2) * 9)) * 2) : 0
  ellipse(ctx, x, ground, 11, 2, 'rgba(40, 20, 10, 0.25)')
  ctx.drawImage(s.canvas, Math.round(x - s.w / 2), ground - s.h + 1 + hop)
  if (pet) drawPet(ctx, t, pet, x + (opts.petSide ?? 1) * 24, ground)
}

/** A pet idling / hopping in place (scale-2 sprite), bottom-centred at (x, ground). */
export function drawPet(ctx: CanvasRenderingContext2D, t: number, pet: string, x: number, ground: number, opts: { facing?: PetFacing; scale?: 1 | 2 } = {}) {
  const cyc = t % 5
  const anim: PetAnim = cyc > 3.6 ? 'happy' : cyc > 2.4 && cyc < 3.4 ? 'walk' : 'idle'
  const frame = Math.floor(t * (anim === 'walk' ? 8 : anim === 'happy' ? 4 : 2))
  const ps = petSprite(pet, opts.facing ?? 'down', anim, frame, { scale: opts.scale ?? 2 })
  if (!PET_BY_ID[pet]?.flying) ellipse(ctx, x, ground, 8, 1.6, 'rgba(40, 20, 10, 0.22)')
  ctx.drawImage(ps.canvas, Math.round(x - ps.w / 2), ground - ps.h + 1)
}

/** Soft rotating light rays behind a showcased item. */
export function drawRays(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number, r: number, color: string, n = 10) {
  ctx.save()
  ctx.fillStyle = color
  const a0 = t * 0.6
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a - 0.13) * r, cy + Math.sin(a - 0.13) * r)
    ctx.lineTo(cx + Math.cos(a + 0.13) * r, cy + Math.sin(a + 0.13) * r)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** Twinkling 4-point sparkles scattered over the canvas. */
export function drawTwinkles(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, n = 6, color = '#fffbe0', seed = 1) {
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    const k = Math.sin(seed * 12.9 + i * 78.2) * 43758.5
    const fx = k - Math.floor(k)
    const k2 = Math.sin(seed * 4.1 + i * 31.7) * 12543.1
    const fy = k2 - Math.floor(k2)
    const ph = (t * 1.4 + i * 0.37) % 1
    if (ph > 0.6) continue
    const x = Math.round(fx * (w - 4)) + 2
    const y = Math.round(fy * (h - 4)) + 2
    ctx.fillRect(x, y, 1, 1)
    if (ph > 0.15 && ph < 0.45) {
      ctx.fillRect(x - 1, y, 1, 1)
      ctx.fillRect(x + 1, y, 1, 1)
      ctx.fillRect(x, y - 1, 1, 1)
      ctx.fillRect(x, y + 1, 1, 1)
    }
  }
}
