// Shared vessels for the food icons: plates, rooster bowls, iced cups and
// bottles, all shaded with the food kit.

import { mix } from '../engine/pixel'
import { M, Pix, type Ramp } from './foodKit'

// ---------------------------------------------------------------------------
// Shared vessels

/** Round plate seen from the front; the food sits around y = cy - 1. */
export function plate(k: Pix, cy = 11, gold = false, rim = '#8fb8ee') {
  const p = gold ? M.gold : M.plate
  // Underside, blue-rimmed enamel top, then the white well.
  k.ell(8, cy + 0.8, 7, 2.6, p.s)
  k.ell(8, cy, 7, 2.5, gold ? p.m : mix(rim, '#ffffff', 0.45))
  k.ell(8, cy - 0.2, 6.6, 2.1, gold ? p.l : mix(rim, '#ffffff', 0.7))
  k.ell(8, cy + 0.1, 5.4, 1.6, gold ? p.hi : mix(rim, '#ffffff', 0.8))
  k.hline(6, 10, Math.round(cy + 2.8), p.d)
}

/** Rooster bowl (ชามตราไก่) with a deep opening. Returns the soup-surface y. */
export function bowl(k: Pix, top = 7, gold = false, soup?: Ramp): number {
  const b = gold ? M.gold : M.plate
  k.form(b, (m) => m.poly([[1, top], [15, top], [13.5, 11.5], [11, 13.6], [5, 13.6], [2.5, 11.5]], '#000'), 'cyl')
  k.hline(5, 10, 14, b.s)
  // Green band and the red rooster.
  if (!gold) {
    k.hline(3, 12, top + 5, '#6cbf5c')
    k.hline(4, 11, top + 6, '#4f9e4c')
    k.px(4, top + 3, '#e8514a')
    k.px(5, top + 3, '#e8514a')
    k.px(5, top + 2, '#ff7a6a')
    k.px(4, top + 4, '#e9a53a')
    k.px(11, top + 3, '#43905a')
    k.px(12, top + 2, '#6cbf5c')
    k.px(10, top + 2, '#6cbf5c')
  } else {
    k.hline(3, 12, top + 5, M.gold.d)
    k.px(5, top + 3, M.gold.hi)
  }
  // Rim, the shaded inner wall and the food surface.
  k.ell(8, top, 7, 2.4, b.hi)
  k.ell(8, top + 0.3, 6, 1.8, b.s)
  k.ell(8, top + 0.7, 6, 1.5, b.d)
  if (soup) {
    k.ell(8, top + 1.1, 5.4, 1.2, soup.m)
    k.hline(5, 8, top + 1, soup.l)
    k.px(11, top + 1, soup.hi)
  }
  return top
}

/** Clear plastic cup with a dome lid, a straw and condensation drops. */
export function cup(k: Pix, drink: Ramp, o: { top?: number; layer?: Ramp; ice?: boolean; straw?: string; lid?: boolean } = {}) {
  const top = o.top ?? 4
  const strawC = o.straw ?? '#ff6f91'
  // Straw behind the lid.
  k.thick(11, 0.5, 9.5, top + 2, 0.6, strawC)
  k.px(11, 0, mix(strawC, '#ffffff', 0.5))
  k.form(M.glass, (m) => m.poly([[3, top], [13, top], [12, 14], [4, 14]], '#000'), 'cyl')
  k.form(drink, (m) => m.poly([[3.4, top + 2], [12.6, top + 2], [11.8, 13.6], [4.2, 13.6]], '#000'), 'cyl')
  if (o.layer) k.form(o.layer, (m) => m.poly([[3.4, top + 2], [12.6, top + 2], [12.4, top + 4.5], [3.6, top + 4.5]], '#000'), 'cyl')
  if (o.ice) {
    k.px(6, top + 6, M.ice.l)
    k.px(7, top + 6, M.ice.m)
    k.px(9, top + 8, M.ice.l)
    k.px(6, top + 9, M.ice.m)
  }
  // Rim.
  k.hline(3, 12, top, M.glass.hi)
  k.hline(4, 11, top + 1, M.glass.l)
  if (o.lid) k.form(M.glass, (m) => m.ell(8, top, 5, 2.5, '#000'), 'ball', { rim: false })
  // Condensation.
  k.drop(11, top + 6, '#ffffff', drink.l)
  k.drop(5, top + 9, '#ffffff')
  k.drop(10, top + 10, mix('#ffffff', drink.l, 0.4))
}

/** Tall glass bottle (น้ำแดง, นม, น้ำดื่ม). */
export function bottle(k: Pix, liquid: Ramp, label: Ramp, cap: Ramp) {
  k.form(liquid, (m) => {
    m.rect(5, 6, 6, 8, '#000')
    m.poly([[6, 3], [10, 3], [11, 6], [5, 6]], '#000')
  }, 'cyl')
  k.form(cap, (m) => m.rect(6, 1, 4, 2, '#000'), 'bevel')
  k.form(label, (m) => m.rect(5, 8, 6, 3, '#000'), 'cyl')
}

/** Bamboo skewer stick. */
export function stick(k: Pix, x0: number, y0: number, x1: number, y1: number) {
  k.line(x0, y0, x1, y1, M.wood.l)
}

