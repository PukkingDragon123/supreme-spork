// Crisp pixel text for Thai (and Latin): the string is drawn with the UI font
// on a tiny canvas, its anti-aliasing is thresholded away and an outline or
// drop shadow is added, then the result is shown as a pixelated image at an
// integer scale. Used for titles, buttons, the HUD and captions; long body
// text stays in the regular (smooth) font for readability.

import { signal } from '@preact/signals'
import type { JSX } from 'preact'
import { createCanvas } from '../engine/pixel'

export const fontsReady = signal(false)

if (typeof document !== 'undefined' && document.fonts) {
  const want = ['500 12px Mali', '600 12px Mali', '400 12px Mali']
  Promise.all(want.map((f) => document.fonts.load(f, 'กขคabc123').catch(() => [])))
    .then(() => document.fonts.ready)
    .then(() => (fontsReady.value = true))
    .catch(() => (fontsReady.value = true))
  // Never block forever on a font that fails to arrive.
  setTimeout(() => (fontsReady.value = true), 2500)
}

export interface PixelTextStyle {
  /** Font family override (defaults to the pixel UI font). */
  family?: string
  size?: number
  weight?: 400 | 500 | 600
  color?: string
  /** 1px outline colour (8-neighbour, rounded). */
  outline?: string | null
  /** 1px drop shadow colour, drawn under the glyphs (and outline). */
  shadow?: string | null
  /** Alpha threshold 0–255 for turning anti-aliased edges into pixels. */
  threshold?: number
}

interface Rendered {
  url: string
  w: number
  h: number
}

const cache = new Map<string, Rendered>()
const metrics = new Map<string, { asc: number; desc: number }>()

let scratch: HTMLCanvasElement | null = null
function ctx2d(): CanvasRenderingContext2D {
  if (!scratch) scratch = createCanvas(8, 8)
  return scratch.getContext('2d', { willReadFrequently: true })!
}

export const PIXEL_FAMILY = 'Mali'

function fontOf(size: number, weight: number, family = PIXEL_FAMILY) {
  return `${weight} ${size}px '${family}', 'Noto Sans Thai', sans-serif`
}

/** Fixed line box per size so labels of different text line up. */
function lineBox(size: number, weight: number, family?: string) {
  const k = `${family}:${size}:${weight}:${fontsReady.peek() ? 1 : 0}`
  let m = metrics.get(k)
  if (!m) {
    const c = ctx2d()
    c.font = fontOf(size, weight, family)
    const probe = c.measureText('ปั้ญู่ฐุ๊Ág')
    m = {
      asc: Math.ceil(probe.actualBoundingBoxAscent || size * 0.95),
      desc: Math.ceil(probe.actualBoundingBoxDescent || size * 0.35),
    }
    metrics.set(k, m)
  }
  return m
}

export function renderPixelText(text: string, st: PixelTextStyle = {}): Rendered {
  const size = st.size ?? 13
  const weight = st.weight ?? 500
  const color = st.color ?? '#3b2616'
  const outline = st.outline ?? null
  const shadow = st.shadow ?? null
  const threshold = st.threshold ?? (weight >= 600 ? 120 : weight >= 500 ? 100 : 90)
  const family = st.family
  const key = [text, family, size, weight, color, outline, shadow, threshold, fontsReady.peek() ? 1 : 0].join('\u0001')
  const hit = cache.get(key)
  if (hit) return hit

  const c = ctx2d()
  c.font = fontOf(size, weight, family)
  const { asc, desc } = lineBox(size, weight, family)
  const pad = 1
  const tw = Math.max(1, Math.ceil(c.measureText(text).width))
  const w = tw + pad * 2
  const h = asc + desc + pad * 2 + (shadow ? 1 : 0)

  const glyph = createCanvas(w, h)
  const g = glyph.getContext('2d', { willReadFrequently: true })!
  g.font = fontOf(size, weight, family)
  g.textBaseline = 'alphabetic'
  g.fillStyle = '#000'
  g.fillText(text, pad, pad + asc)
  const src = g.getImageData(0, 0, w, h).data
  const solid = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) solid[i] = src[i * 4 + 3] >= threshold ? 1 : 0

  const out = g.createImageData(w, h)
  const d = out.data
  const put = (i: number, hex: string) => {
    d[i * 4] = parseInt(hex.slice(1, 3), 16)
    d[i * 4 + 1] = parseInt(hex.slice(3, 5), 16)
    d[i * 4 + 2] = parseInt(hex.slice(5, 7), 16)
    d[i * 4 + 3] = 255
  }
  const at = (m: Uint8Array, x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] >= 1
  // Pixels reachable from the border: outline/shadow never fill the tiny
  // enclosed holes (loops of ม, ต, ฅ…) that keep Thai letters distinct.
  const outside = new Uint8Array(w * h)
  if (outline || shadow) {
    const stack: number[] = []
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
    while (stack.length) {
      const i = stack.pop()!
      if (outside[i] || solid[i]) continue
      outside[i] = 1
      const x = i % w
      if (x > 0) stack.push(i - 1)
      if (x < w - 1) stack.push(i + 1)
      if (i >= w) stack.push(i - w)
      if (i < w * (h - 1)) stack.push(i + w)
    }
  }
  // 1 = glyph, 2 = outline, 3 = shadow.
  const mask = solid.slice()
  if (outline)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (solid[i] || !outside[i]) continue
        for (let dy = -1; dy <= 1 && !mask[i]; dy++) for (let dx = -1; dx <= 1; dx++) if (at(solid, x + dx, y + dy)) (mask[i] = 2), (dx = 2)
      }
  if (shadow)
    for (let y = h - 1; y > 0; y--)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (!mask[i] && outside[i] && mask[i - w] && mask[i - w] !== 3) mask[i] = 3
      }
  for (let i = 0; i < w * h; i++) {
    const m = mask[i]
    if (m === 1) put(i, color)
    else if (m === 2) put(i, outline!)
    else if (m === 3) put(i, shadow!)
  }
  g.putImageData(out, 0, 0)
  const r = { url: glyph.toDataURL(), w, h }
  if (cache.size > 800) cache.clear()
  cache.set(key, r)
  return r
}

export type PTProps = PixelTextStyle & {
  text: string | number
  /** CSS pixels per text pixel. */
  scale?: number
  class?: string
  style?: JSX.CSSProperties
  title?: string
}

/** Pixel text as an image. The alt text keeps it readable for screen readers. */
export function PT({ text, scale = 2, class: cls, style, title, ...st }: PTProps) {
  // Subscribe so labels re-render once the real font has loaded.
  void fontsReady.value
  const s = String(text)
  if (!s) return null
  const r = renderPixelText(s, st)
  return (
    <img
      class={`pt ${cls ?? ''}`}
      src={r.url}
      width={r.w * scale}
      height={r.h * scale}
      alt={s}
      title={title}
      draggable={false}
      style={style}
    />
  )
}

/** Text colours that match each button/plate tone. */
export const TONE_TEXT: Record<string, PixelTextStyle> = {
  green: { color: '#fff6dc', shadow: '#1f4a26' },
  gold: { color: '#5a3410', shadow: '#ffe58a' },
  red: { color: '#fff1e6', shadow: '#6e2018' },
  blue: { color: '#f2f8ff', shadow: '#1f3f70' },
  wood: { color: '#fff1d6', shadow: '#5a3418' },
  paper: { color: '#3b2616', shadow: null },
  pink: { color: '#fff4f8', shadow: '#8e3a5c' },
  dark: { color: '#fff1d6', shadow: '#150d18' },
  title: { color: '#fff6dc', outline: '#1f4a26' },
  ink: { color: '#3b2616' },
}
