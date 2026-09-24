import type { Surface, Color } from './pixel'

// A tiny 3x5 bitmap font for numbers that float above the world
// (e.g. "+12" merit). Thai text is always rendered by the DOM instead.

const GLYPHS: Record<string, string[]> = {
  '0': ['.#.', '#.#', '#.#', '#.#', '.#.'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '##.', '#.#', '.#.'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['.#.', '#.#', '.#.', '#.#', '.#.'],
  '9': ['.#.', '#.#', '.##', '..#', '##.'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
  x: ['...', '#.#', '.#.', '#.#', '...'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '.': ['...', '...', '...', '...', '.#.'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  ' ': ['...', '...', '...', '...', '...'],
  L: ['#..', '#..', '#..', '#..', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  E: ['###', '#..', '##.', '#..', '###'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
}

export function textWidth(text: string): number {
  return text.length === 0 ? 0 : text.length * 4 - 1
}

/** Draw pixel text with an optional 1px outline for legibility. */
export function drawText(g: Surface, text: string, x: number, y: number, color: Color, outline?: Color) {
  const put = (ox: number, oy: number, c: Color) => {
    let cx = x + ox
    for (const ch of text) {
      const gl = GLYPHS[ch] ?? GLYPHS['?']
      for (let r = 0; r < 5; r++) {
        const row = gl[r]
        for (let i = 0; i < 3; i++) if (row[i] === '#') g.px(cx + i, y + oy + r, c)
      }
      cx += 4
    }
  }
  if (outline) {
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      put(ox, oy, outline)
  }
  put(0, 0, color)
}
