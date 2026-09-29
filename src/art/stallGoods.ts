// Goods on stall shelves: hand-drawn snacks (bowls, skewers, drinks,
// desserts…), grocery icons and outfit displays (a crop of the doll wearing
// the item, like a mannequin), all as outlined sprites.

import { bake, createCanvas, mix, type Color, type Surface } from '../engine/pixel'
import { cached, outlineCanvas, spriteDataUrl, type Sprite } from '../engine/sprite'
import type { AvatarLook } from './avatar'
import { dollSprite } from './doll'
import { iconSprite } from './icons'
import { OUTFIT_BY_ID } from '../game/data/outfits'
import { P } from './palette'

const INK = P.ink

type Family = 'coconut' | 'drink' | 'skewer' | 'bowl' | 'plate' | 'bamboo' | 'dessert' | 'fruit' | 'bun' | 'steamer' | 'eggs' | 'jar' | 'cane' | 'bag' | 'towel'

/** Snack id → how it is drawn and its colours [main, accent, detail]. */
const SNACK_ART: Record<string, [Family, string, string, string]> = {
  icecream_coconut: ['coconut', '#fff1d6', '#8a5a32', '#86c95f'],
  chayen: ['drink', '#f58f35', '#fff1d6', '#ff5a8a'],
  moo_ping: ['skewer', '#a8543a', '#fbf7ee', '#6e2a1c'],
  khao_lam: ['bamboo', '#5ea653', '#fbf7ee', '#8a5a32'],
  roti_saimai: ['dessert', '#ff9fc0', '#fff1d6', '#86c95f'],
  kluay_tak: ['fruit', '#c9782a', '#ffd84a', '#6e4a35'],
  khao_soi: ['bowl', '#f0a830', '#fff1d6', '#e8514a'],
  som_tam: ['plate', '#c8e58a', '#e8413a', '#f58f35'],
  pad_mee: ['plate', '#e8b070', '#86c95f', '#e8514a'],
  dumpling: ['steamer', '#fffaf0', '#e8b070', '#43905a'],
  hokkien: ['plate', '#ffd84a', '#e8514a', '#86c95f'],
  oh_aew: ['dessert', '#e8514a', '#fff1d6', '#b3e4f4'],
  yaowarat: ['bowl', '#f3dd9a', '#ffd84a', '#e8514a'],
  boiled_egg: ['eggs', '#fffaf0', '#ffd84a', '#e8514a'],
  coconut_sugar: ['fruit', '#d9964a', '#f3dcb2', '#8a5a32'],
  dried_squid: ['skewer', '#f0c090', '#e8514a', '#8a5a32'],
  mango_sticky: ['dessert', '#ffcf3a', '#fbf7ee', '#86c95f'],
  khanom_jak: ['skewer', '#6a5a3a', '#8a7a4a', '#3a2838'],
  pomelo: ['fruit', '#b4e486', '#ffb8cf', '#5ea653'],
  kalamae: ['dessert', '#6e3a24', '#9a5a34', '#fff1d6'],
  sugarcane: ['cane', '#c8b850', '#86c95f', '#8a7a3a'],
  khanom_la: ['dessert', '#ffcf5a', '#e9a53a', '#fff1d6'],
  cha_chak: ['drink', '#d9a878', '#fffaf0', '#8a5a32'],
  khao_yam: ['plate', '#8fb0f5', '#86c95f', '#f58f35'],
  red_soda: ['drink', '#e8414a', '#ffffff', '#86c95f'],
  mee_hoon: ['bowl', '#f58f35', '#fff1d6', '#e8514a'],
  baba_sweets: ['dessert', '#86c95f', '#ff9fc0', '#fff1d6'],
  thai_massage: ['towel', '#fffaf0', '#86c95f', '#ff9fc0'],
  herbal_balm: ['jar', '#43905a', '#ffd54f', '#e8514a'],
  matoom: ['drink', '#e9a53a', '#fff3a6', '#86c95f'],
  chrysanthemum: ['drink', '#f3dd9a', '#fffaf0', '#86c95f'],
  chestnut: ['bag', '#8a5a32', '#e8514a', '#fff1d6'],
  kanom_pang: ['dessert', '#e8c080', '#6cc36a', '#fffaf0'],
  sai_ua: ['skewer', '#a8543a', '#86c95f', '#6e2a1c'],
  salapao: ['bun', '#fffaf0', '#e8514a', '#f0e6d6'],
  gai_yang: ['skewer', '#c86a2a', '#fbf7ee', '#8a3a1a'],
}

function draw(g: Surface, fam: Family, m: Color, a: Color, d: Color) {
  const mD = mix(m, INK, 0.3)
  const mL = mix(m, '#ffffff', 0.4)
  switch (fam) {
    case 'coconut':
      g.ellipse(9, 12, 7, 4.5, '#8a5a32')
      g.ellipse(9, 11.5, 6, 3.5, '#b87a4a')
      g.ellipse(9, 9.5, 6.5, 2, '#fffaf0')
      g.circle(7, 7, 3.2, m)
      g.circle(11, 7.5, 3, '#ffd6e0')
      g.circle(9, 5, 2.8, mL)
      for (const [x, y] of [[7, 4], [10, 6], [8, 8]] as [number, number][]) g.px(x, y, a)
      g.px(12, 5, d)
      g.px(13, 4, d)
      g.line(13, 2, 11, 6, '#ffd54f')
      break
    case 'drink':
      g.line(11, 0, 9, 5, d)
      g.line(12, 0, 10, 5, mix(d, '#ffffff', 0.3))
      g.poly([[4, 4], [14, 4], [13, 16], [5, 16]], 'rgba(230,245,255,0.9)')
      g.poly([[4.6, 7], [13.4, 7], [12.8, 16], [5.2, 16]], m)
      g.poly([[4.6, 7], [7, 7], [6.5, 16], [5.2, 16]], mL)
      g.rect(5, 6, 8, 2, a)
      g.px(8, 10, '#ffffff')
      g.px(10, 12, '#ffffff')
      g.hline(4, 13, 4, '#ffffff')
      break
    case 'skewer':
      for (const [dx, dy] of [[0, 0], [3, 2]] as [number, number][]) {
        g.line(2 + dx, 15 + dy, 15 + dx, 2 + dy, '#e0bb8a')
        for (let k = 0; k < 3; k++) {
          const cx = 7 + dx + k * 2.6
          const cy = 10 + dy - k * 2.6
          g.ellipse(cx, cy, 2.3, 1.9, mD)
          g.ellipse(cx - 0.4, cy - 0.4, 1.8, 1.4, m)
          g.px(cx - 1, cy - 1, mL)
        }
      }
      g.ellipse(4, 14, 3.5, 2.5, a)
      g.px(3, 13, '#ffffff')
      g.px(6, 5, d)
      break
    case 'bowl':
      g.ellipse(9, 8, 8, 2.5, '#5a8de0')
      g.ellipse(9, 8, 7, 1.8, m)
      g.poly([[1, 8], [17, 8], [14, 15], [4, 15]], '#fffaf0')
      g.hline(2, 16, 9, '#5a8de0')
      g.rect(6, 15, 6, 2, '#d6d0c4')
      for (let k = 0; k < 4; k++) g.hline(4 + k, 13 - k, 7 - k * 0.5, mix(a, INK, 0.05 * k))
      g.px(5, 7, d)
      g.px(12, 6, d)
      g.px(10, 7, '#6cc36a')
      g.px(7, 6, '#6cc36a')
      g.line(11, 0, 16, 7, '#9a6a45')
      g.line(13, 0, 17, 5, '#c28e5c')
      break
    case 'plate':
      g.ellipse(9, 12, 8.5, 3.5, '#d6d0c4')
      g.ellipse(9, 11.5, 8, 3, '#fffaf0')
      g.ellipse(9, 10, 6, 3, m)
      for (let k = 0; k < 8; k++) g.px(4 + k * 1.4, 9 + (k % 3), mix(m, INK, 0.2))
      g.px(6, 8, a)
      g.px(11, 9, a)
      g.px(9, 7, a)
      g.px(13, 10, d)
      g.px(8, 11, d)
      g.ellipse(14, 12, 2, 1, '#86c95f')
      break
    case 'bamboo':
      g.thickLine(4, 16, 13, 2, 5, m)
      g.thickLine(4, 16, 13, 2, 2.5, mix(m, '#ffffff', 0.2))
      for (const k of [0.3, 0.65]) g.line(3 + k * 9 - 2, 16 - k * 14 - 1, 3 + k * 9 + 2, 16 - k * 14 + 1, mD)
      g.circle(13.5, 2.5, 2.4, a)
      g.px(13, 2, '#ffffff')
      g.circle(3, 15, 1.4, d)
      break
    case 'dessert':
      g.ellipse(9, 13, 8, 3, '#e8dcc0')
      g.ellipse(9, 12.5, 7.5, 2.5, '#fffaf0')
      g.ellipse(8, 9, 5, 3.5, mD)
      g.ellipse(7.6, 8.4, 4.5, 3, m)
      g.ellipse(6, 7, 1.8, 1, mL)
      g.ellipse(12, 10, 3, 2, a)
      g.px(11, 9, mix(a, '#ffffff', 0.5))
      g.px(4, 10, d)
      g.px(10, 6, d)
      break
    case 'fruit':
      g.ellipse(9, 14, 8, 2.5, '#c8a878')
      for (const [x, y] of [[5, 10], [12, 10], [8.5, 6.5]] as [number, number][]) {
        g.circle(x, y, 3.8, mD)
        g.circle(x - 0.4, y - 0.4, 3.2, m)
        g.px(x - 1.5, y - 1.5, mL)
      }
      g.px(9, 3, d)
      g.px(10, 2, d)
      g.px(6, 10, a)
      g.px(12, 11, a)
      break
    case 'bun':
      for (const [x, y] of [[5, 11], [12, 11], [8.5, 7]] as [number, number][]) {
        g.circle(x, y, 4, mix(m, INK, 0.12))
        g.circle(x - 0.3, y - 0.3, 3.5, m)
        g.px(x, y - 1, a)
        g.px(x - 1.5, y - 1.5, '#ffffff')
      }
      g.ellipse(9, 15, 8, 1.5, d)
      break
    case 'steamer':
      g.rect(2, 8, 14, 8, '#c28e5c')
      g.ellipse(9, 8, 7, 2.2, '#e0bb8a')
      for (let x = 3; x < 16; x += 2) g.vline(x, 9, 15, '#9a6a45')
      g.rect(2, 11, 14, 1, '#8a5a32')
      for (const x of [6, 9, 12]) {
        g.circle(x, 6, 2, m)
        g.px(x, 5, a)
      }
      g.px(4, 3, 'rgba(255,255,255,0.7)')
      g.px(13, 2, 'rgba(255,255,255,0.7)')
      g.px(9, 1, d)
      break
    case 'eggs':
      g.rect(1, 11, 16, 5, '#e0bb8a')
      g.hline(1, 16, 11, '#f3dcb2')
      for (const [x, y] of [[4, 9], [9, 9], [14, 9], [6.5, 6], [11.5, 6]] as [number, number][]) {
        g.ellipse(x, y, 2.4, 3, mix(m, INK, 0.12))
        g.ellipse(x - 0.3, y - 0.3, 2, 2.6, m)
        g.px(x - 1, y - 1, '#ffffff')
      }
      g.rect(7, 13, 4, 2, d)
      break
    case 'jar':
      g.rect(5, 3, 8, 3, a)
      g.hline(5, 12, 3, mix(a, '#ffffff', 0.4))
      g.rect(4, 6, 10, 10, m)
      g.rect(4, 6, 3, 10, mix(m, '#ffffff', 0.3))
      g.rect(6, 9, 6, 4, '#fffaf0')
      g.px(8, 10, d)
      g.px(9, 11, d)
      break
    case 'cane':
      for (const x of [5, 9, 13]) {
        g.rect(x - 1, 3, 3, 13, m)
        g.vline(x - 1, 3, 15, mix(m, '#ffffff', 0.4))
        for (const y of [6, 10, 14]) g.hline(x - 1, x + 1, y, d)
      }
      g.poly([[9, 3], [6, 0], [12, 0]], a)
      break
    case 'bag':
      g.poly([[4, 5], [14, 5], [15, 16], [3, 16]], '#fffaf0')
      g.rect(3, 12, 12, 4, a)
      g.hline(4, 13, 5, '#e8dcc0')
      for (const [x, y] of [[6, 4], [9, 3], [12, 4], [8, 5], [11, 5]] as [number, number][]) {
        g.circle(x, y, 1.8, m)
        g.px(x, y - 1, mix(m, '#ffffff', 0.4))
      }
      break
    case 'towel':
      g.rect(2, 8, 14, 8, m)
      g.rect(2, 8, 14, 2, '#ffffff')
      g.hline(2, 15, 12, mix(m, INK, 0.12))
      g.circle(12, 6, 3, a)
      g.circle(12, 6, 1.5, mix(a, INK, 0.2))
      g.circle(6, 5, 2.5, d)
      g.px(6, 4, '#ffffff')
      break
  }
}

/** Outlined snack sprite (20×20); unknown snacks fall back to their icon. */
export function snackSprite(id: string, icon = 'dessert'): Sprite {
  const art = SNACK_ART[id]
  if (!art) return iconSprite(icon)
  return cached(`snack:${id}`, () => outlineCanvas(bake(18, 18, (g) => draw(g, art[0], art[1], art[2], art[3])), INK))
}

export function snackUrl(id: string, icon = 'dessert', scale = 3): string {
  return spriteDataUrl(snackSprite(id, icon), scale)
}

/** Grocery / alms items: the item icon. */
export function grocerySprite(icon: string): Sprite {
  return iconSprite(icon)
}

/** A calm mannequin that models outfits on the rack. */
export const MANNEQUIN: AvatarLook = {
  gender: 'f',
  skin: 0,
  face: 2,
  hairColor: 0,
  hair: 'hair_bob',
  top: 'top_white',
  bottom: 'bot_khaki',
  head: null,
  neck: null,
  hand: null,
  shoes: null,
  back: null,
  suit: null,
}

function wearing(o: { id: string; slot: string }, base: AvatarLook): AvatarLook {
  const l = { ...base }
  const slot = o.slot
  if (slot === 'hair') l.hair = o.id
  else if (slot === 'top') l.top = o.id
  else if (slot === 'bottom') l.bottom = o.id
  else if (slot === 'head') l.head = o.id
  else if (slot === 'neck') l.neck = o.id
  else if (slot === 'hand') l.hand = o.id
  else if (slot === 'shoes') l.shoes = o.id
  else if (slot === 'back') l.back = o.id
  else if (slot === 'suit') l.suit = o.id
  return l
}

/** Pixels of `a` that differ from `b`, trimmed and re-outlined. */
function isolate(a: HTMLCanvasElement, b: HTMLCanvasElement): Sprite | null {
  const w = a.width
  const h = a.height
  const da = a.getContext('2d')!.getImageData(0, 0, w, h).data
  const db = b.getContext('2d')!.getImageData(0, 0, w, h).data
  const out = createCanvas(w, h)
  const ctx = out.getContext('2d')!
  const img = ctx.createImageData(w, h)
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let i = 0; i < w * h; i++) {
    const k = i * 4
    if (da[k + 3] < 20) continue
    const same = db[k + 3] > 20 && Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) < 12
    if (same) continue
    // Drop the old ink outline around the body; the new outline is added below.
    if (da[k] < 70 && da[k + 1] < 50 && da[k + 2] < 70) continue
    img.data[k] = da[k]
    img.data[k + 1] = da[k + 1]
    img.data[k + 2] = da[k + 2]
    img.data[k + 3] = 255
    const x = i % w
    const y = (i / w) | 0
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  if (x1 < 0) return null
  ctx.putImageData(img, 0, 0)
  const cw = x1 - x0 + 1
  const ch = y1 - y0 + 1
  const trimmed = createCanvas(cw, ch)
  trimmed.getContext('2d')!.drawImage(out, x0, y0, cw, ch, 0, 0, cw, ch)
  return outlineCanvas(trimmed, INK)
}

function half(s: Sprite): Sprite {
  const c = createCanvas(Math.ceil(s.w / 2), Math.ceil(s.h / 2))
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(s.canvas, 0, 0, s.w, s.h, 0, 0, c.width, c.height)
  return { canvas: c, w: c.width, h: c.height }
}

/**
 * Just the outfit piece, cut out of a mannequin wearing it (a hat, a shirt,
 * a necklace…). Big pieces such as full costumes are shown at half size.
 */
export function outfitDisplaySprite(id: string, base: AvatarLook = MANNEQUIN): Sprite {
  const o = OUTFIT_BY_ID[id]
  if (!o) return iconSprite('shirt')
  return cached(`outfitdisp:${id}:${base.gender}:${base.skin}`, () => {
    const view = o.slot === 'back' ? 'back' : 'front'
    const withIt = dollSprite(wearing(o, base), 'stand', { view, blink: true })
    const without = dollSprite(base, 'stand', { view, blink: true })
    const cut = isolate(withIt.canvas, without.canvas) ?? iconSprite('shirt')
    return cut.w > 40 || cut.h > 44 ? half(cut) : cut
  })
}
