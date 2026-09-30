// Pixel icons for online play (chat, laugh, dance, trade, wave, online),
// drawn like src/art/icons.ts on a 14×14 grid with an ink outline. Other
// names fall back to the game's own icon set.

import { bake, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas, spriteDataUrl } from '../../engine/sprite'
import { Icon } from '../components/common'

const INK = '#3a2838'

const DRAW: Record<string, (g: Surface) => void> = {
  chat: (g) => {
    g.rect(1, 2, 12, 8, '#fffaf0')
    g.rect(2, 1, 10, 10, '#fffaf0')
    g.poly([[4, 10], [8, 10], [3, 13]], '#fffaf0')
    g.rect(2, 9, 10, 1, '#e8d6b8')
    for (let i = 0; i < 3; i++) g.rect(3 + i * 3, 5, 2, 2, i === 1 ? '#ff6f91' : '#5a3d4f')
  },
  laugh: (g) => {
    g.circle(7, 7, 6, '#ffd34e')
    g.circle(6.4, 6.4, 5, '#ffe58a')
    g.line(3, 5, 5, 4, INK)
    g.line(5, 4, 6, 5, INK)
    g.line(8, 5, 9, 4, INK)
    g.line(9, 4, 11, 5, INK)
    g.poly([[3, 8], [11, 8], [7, 12]], '#a23a4a')
    g.rect(5, 10, 4, 1, '#ff9fc0')
    g.px(2, 3, '#7fc4ff')
    g.px(12, 3, '#7fc4ff')
  },
  dance: (g) => {
    g.rect(4, 2, 1, 8, INK)
    g.rect(4, 2, 7, 1, INK)
    g.rect(10, 2, 1, 7, INK)
    g.ellipse(3, 10, 2, 1.5, '#b394f0')
    g.ellipse(9, 9, 2, 1.5, '#ff9fc0')
    g.px(2, 9, '#e3d6ff')
    g.px(8, 8, '#ffe0ec')
    g.px(12, 12, '#fff3a6')
    g.px(1, 1, '#fff3a6')
  },
  trade: (g) => {
    g.rect(2, 3, 8, 3, '#7cc55e')
    g.poly([[9, 1], [13, 4.5], [9, 8]], '#7cc55e')
    g.rect(2, 3, 8, 1, '#b9e89a')
    g.rect(4, 9, 8, 3, '#f2a23f')
    g.poly([[5, 6], [1, 10.5], [5, 14]], '#f2a23f')
    g.rect(4, 9, 8, 1, '#ffd79a')
  },
  wave: (g) => {
    g.rect(4, 5, 7, 7, '#fcd0b1')
    g.rect(4, 2, 2, 5, '#fcd0b1')
    g.rect(6, 1, 2, 6, '#fcd0b1')
    g.rect(8, 2, 2, 5, '#fcd0b1')
    g.rect(10, 4, 2, 4, '#fcd0b1')
    g.rect(2, 7, 2, 3, '#fcd0b1')
    g.vline(6, 3, 6, '#eaa98d')
    g.vline(8, 3, 6, '#eaa98d')
    g.px(1, 3, '#7fc4ff')
    g.px(0, 5, '#7fc4ff')
    g.px(13, 2, '#7fc4ff')
  },
  online: (g) => {
    g.circle(7, 7, 6, '#4f9e4c')
    g.circle(6.5, 6.5, 4.8, '#7cc55e')
    g.rect(3, 4, 3, 2, '#b9e89a')
    g.rect(8, 8, 3, 2, '#b9e89a')
    g.px(4, 3, '#e8ffd8')
  },
  eye_off: (g) => {
    g.ellipse(7, 7, 6, 3.5, '#fffaf0')
    g.circle(7, 7, 2.2, '#5a3d4f')
    g.thickLine(1, 12, 12, 2, 2, '#e8514a')
  },
}

const urls = new Map<string, string>()

export function netIconUrl(name: string, scale = 3): string | null {
  const draw = DRAW[name]
  if (!draw) return null
  const key = `${name}@${scale}`
  let u = urls.get(key)
  if (!u) {
    const s = cached(`neticon:${name}`, () => outlineCanvas(bake(14, 14, draw), INK))
    u = spriteDataUrl(s, scale)
    urls.set(key, u)
  }
  return u
}

/** Online icon (falls back to the game's icon set). */
export function NIcon({ name, size = 22, class: cls }: { name: string; size?: number; class?: string }) {
  const scale = Math.max(1, Math.ceil((size * (window.devicePixelRatio || 1)) / 16))
  const url = netIconUrl(name, scale)
  if (!url) return <Icon name={name} size={size} class={cls} />
  return <img class={`px ${cls ?? ''}`} src={url} width={size} height={size} alt="" draggable={false} />
}
