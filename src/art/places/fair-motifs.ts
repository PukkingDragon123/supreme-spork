// Collectible motifs of the temple fair (14×14, painted in the item's
// palette): goldfish in a bag, the pink teddy, the shy ghost, the likay hero,
// the ferris wheel, the mascot duck, the carousel's golden ring, the likay
// money garland, a bumper car and a ramwong fan. Registered on import.

import { registerMotifs, type MP } from '../collectibles'
import type { Surface } from '../../engine/pixel'

const INK = '#3a2838'

registerMotifs({
  goldfish(g: Surface, p: MP) {
    // A water bag with a knot, the fish inside.
    g.ellipse(7, 8.5, 5.5, 5, '#bfe8ff')
    g.ellipse(6.6, 8.1, 4.8, 4.3, '#e2f6ff')
    g.rect(5, 1, 4, 2, p.a)
    g.px(6, 3, p.aD)
    g.px(7, 3, p.aD)
    g.ellipse(7, 9, 2.6, 1.8, p.m)
    g.poly([[9, 9], [11.5, 7], [11.5, 11]], p.mL)
    g.px(6, 8, p.d)
    g.px(5, 9, p.mD)
    g.px(4, 5, '#ffffff')
    g.px(4, 6, '#ffffff')
  },
  teddy(g: Surface, p: MP) {
    g.circle(3.5, 2.5, 1.6, p.mD)
    g.circle(10.5, 2.5, 1.6, p.mD)
    g.circle(7, 5, 3.6, p.m)
    g.circle(7, 10.5, 3.6, p.m)
    g.ellipse(7, 10.5, 1.8, 1.8, p.mL)
    g.px(5, 4, INK)
    g.px(9, 4, INK)
    g.px(7, 6, INK)
    g.hline(5, 9, 7, p.a)
    g.px(3, 11, p.mD)
    g.px(11, 11, p.mD)
  },
  ghost(g: Surface, p: MP) {
    g.circle(7, 5.5, 4.5, p.d)
    g.rect(2.5, 5.5, 9, 6, p.d)
    for (let i = 0; i < 4; i++) g.circle(3.5 + i * 2.4, 11.5, 1.3, p.d)
    g.px(5, 5, INK)
    g.px(9, 5, INK)
    g.rect(6, 7, 3, 2, INK)
    g.px(4, 7, '#ff9fc0')
    g.px(10, 7, '#ff9fc0')
    g.px(4, 3, '#ffffff')
    g.px(12, 2, p.a)
    g.px(13, 1, p.a)
  },
  likay(g: Surface, p: MP) {
    // Sequinned hero with a feathered crown.
    g.rect(4, 8, 6, 5, p.m)
    for (let i = 0; i < 4; i++) g.px(5 + (i % 2) * 3, 9 + Math.floor(i / 2) * 2, p.a)
    g.circle(7, 5.5, 2.4, '#f0d0b0')
    g.rect(4, 1.5, 6, 2, p.a)
    g.line(8, 1, 12, -1, p.d)
    g.line(8, 2, 12, 1, p.d)
    g.px(6, 5, INK)
    g.px(8, 5, INK)
    g.px(3, 10, '#f0d0b0')
    g.px(11, 7, '#f0d0b0')
  },
  ferriswheel(g: Surface, p: MP) {
    g.line(7, 6, 3, 13, p.mD)
    g.line(7, 6, 11, 13, p.mD)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      g.px(Math.round(7 + Math.cos(a) * 5), Math.round(6 + Math.sin(a) * 5), p.mL)
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      g.line(7, 6, Math.round(7 + Math.cos(a) * 5), Math.round(6 + Math.sin(a) * 5), p.m)
      g.rect(Math.round(7 + Math.cos(a) * 5) - 1, Math.round(6 + Math.sin(a) * 5), 2, 2, i % 2 ? p.a : p.d)
    }
    g.px(7, 6, p.a)
  },
  duck(g: Surface, p: MP) {
    g.ellipse(6, 9.5, 5, 3.5, p.m)
    g.circle(9.5, 5, 2.8, p.m)
    g.rect(11.5, 5, 2.5, 1.5, p.a)
    g.px(10, 4, INK)
    g.px(4, 8, p.mL)
    g.hline(2, 10, 13, p.d)
  },
  goldring(g: Surface, p: MP) {
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2
      const x = 7 + Math.cos(a) * 4.8
      const y = 7 + Math.sin(a) * 4.8
      g.circle(x, y, 1.1, Math.sin(a) < -0.2 ? p.mL : Math.cos(a) > 0.5 ? p.mD : p.m)
    }
    g.px(4, 3, '#ffffff')
    g.px(12, 2, p.a)
    g.px(1, 11, p.a)
  },
  moneygarland(g: Surface, p: MP) {
    // A garland of folded banknotes.
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * 0.1 + (i / 9) * Math.PI * 0.8
      const x = 7 + Math.cos(a) * 5.5
      const y = 2 + Math.sin(a) * 9
      g.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 2, i % 2 ? p.m : p.mL)
      g.px(Math.round(x), Math.round(y) - 1, p.a)
    }
    g.circle(7, 11.5, 1.8, p.d)
    g.vline(7, 12, 13, p.d)
  },
  bumpercar(g: Surface, p: MP) {
    g.ellipse(7, 10, 6, 3, '#2a2830')
    g.ellipse(7, 9, 5.5, 2.6, p.m)
    g.circle(7, 6, 2, '#f0d0b0')
    g.rect(5, 3, 4, 2, p.d)
    g.vline(3, 1, 8, '#8a8480')
    g.px(2, 1, p.a)
    g.px(4, 0, p.a)
    g.px(11, 9, p.mL)
  },
  fan(g: Surface, p: MP) {
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI
      g.line(7, 11, Math.round(7 + Math.cos(a) * 6), Math.round(10 + Math.sin(a) * 7), i % 2 ? p.m : p.mL)
    }
    g.circle(7, 6, 1.8, p.a)
    g.px(7, 6, p.d)
    g.rect(6, 11, 2, 3, p.dD)
  },
})
