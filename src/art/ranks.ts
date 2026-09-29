// Pixel art for the temple ranking board: tier badges (C … SS shields with a
// crown for the top tiers), a trophy icon and a little province pin.

import { bake, mix, type Color, type Surface } from '../engine/pixel'
import { cached, outlineCanvas, type Sprite } from '../engine/sprite'
import { P } from './palette'
import { TIER_BY_ID, type TierId } from '../game/data/ranks'

const GLYPH: Record<string, string[]> = {
  C: ['.##', '#..', '#..', '#..', '.##'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
}

function glyph(g: Surface, ch: string, x: number, y: number, c: Color, shadow: Color) {
  const rows = GLYPH[ch]
  if (!rows) return
  for (let r = 0; r < rows.length; r++)
    for (let k = 0; k < rows[r].length; k++) {
      if (rows[r][k] !== '#') continue
      g.rect(x + k * 2, y + r * 2 + 1, 2, 2, shadow)
      g.rect(x + k * 2, y + r * 2, 2, 2, c)
    }
}

const grey = (c: Color) => mix(mix(c, '#9a9a9a', 0.75), '#6a6a72', 0.2)

/** Shield badge for a tier (about 22×22 incl. outline). `locked` greys it out. */
export function tierBadge(tier: TierId, locked = false): Sprite {
  return cached(`tierbadge:${tier}:${locked ? 1 : 0}`, () => {
    const [main0, light0, dark0] = TIER_BY_ID[tier].color
    const main = locked ? grey(main0) : main0
    const light = locked ? grey(light0) : light0
    const dark = locked ? grey(dark0) : dark0
    const top = tier === 'S' || tier === 'SS'
    const W = 20
    const H = 20
    const c = bake(W, H, (g) => {
      const y0 = top ? 4 : 1
      // Shield body.
      g.poly(
        [
          [1, y0],
          [W - 1, y0],
          [W - 1, y0 + 9],
          [W / 2, H],
          [1, y0 + 9],
        ],
        dark,
      )
      g.poly(
        [
          [2, y0 + 1],
          [W - 2, y0 + 1],
          [W - 2, y0 + 9],
          [W / 2, H - 2],
          [2, y0 + 9],
        ],
        main,
      )
      g.rect(3, y0 + 1, W - 6, 2, light)
      g.px(3, y0 + 3, light)
      // Crown for the top tiers.
      if (top) {
        const crown = locked ? grey('#ffd23f') : '#ffd23f'
        const crownD = locked ? grey('#d08a1f') : '#d08a1f'
        g.rect(5, 2, 10, 3, crownD)
        for (const x of [5, 9, 13]) {
          g.rect(x, 0, 2, 3, crown)
        }
        g.hline(5, 14, 3, crown)
        g.px(10, 1, locked ? grey('#ff6f91') : '#ff6f91')
      }
      const letters = tier.split('')
      const tw = letters.length * 6 + (letters.length - 1) * 1
      let x = Math.round((W - tw) / 2)
      const ly = y0 + 3
      for (const ch of letters) {
        glyph(g, ch, x, ly, locked ? '#e8e8e8' : '#fffaf0', dark)
        x += 7
      }
      // SS sparkle.
      if (tier === 'SS' && !locked) {
        g.px(1, 2, '#fffaf0')
        g.px(18, 1, '#fffaf0')
      }
    })
    return outlineCanvas(c, P.ink)
  })
}

/** 14×14 trophy for the ranking-board button. */
export function trophyIcon(): Sprite {
  return cached('rank:trophy', () => {
    const c = bake(14, 14, (g) => {
      g.rect(3, 1, 8, 6, '#ffd23f')
      g.rect(4, 7, 6, 1, '#ffd23f')
      g.rect(5, 8, 4, 1, '#e9a53a')
      g.rect(6, 9, 2, 2, '#e9a53a')
      g.rect(4, 11, 6, 2, '#b8742a')
      g.hline(4, 9, 11, '#e9a53a')
      g.rect(1, 2, 2, 1, '#e9a53a')
      g.rect(0, 2, 1, 3, '#e9a53a')
      g.rect(1, 5, 2, 1, '#e9a53a')
      g.rect(11, 2, 2, 1, '#e9a53a')
      g.rect(13, 2, 1, 3, '#e9a53a')
      g.rect(11, 5, 2, 1, '#e9a53a')
      g.vline(4, 1, 5, '#fff3a6')
      g.px(7, 3, '#e8514a')
      g.px(6, 4, '#e8514a')
      g.px(8, 4, '#e8514a')
      g.px(7, 5, '#e8514a')
    })
    return outlineCanvas(c, P.ink)
  })
}

/** 10×12 map pin for the home province tag. */
export function homePin(): Sprite {
  return cached('rank:homepin', () => {
    const c = bake(9, 11, (g) => {
      g.circle(4, 4, 4, '#e8514a')
      g.circle(3.5, 3.5, 2.6, '#ff8a7a')
      g.circle(4, 4, 1.5, '#fffaf0')
      g.poly(
        [
          [1, 6],
          [7, 6],
          [4, 10],
        ],
        '#e8514a',
      )
    })
    return outlineCanvas(c, P.ink)
  })
}
