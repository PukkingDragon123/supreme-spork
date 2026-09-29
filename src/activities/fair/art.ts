// Pixel art for the temple-fair mini-games and the prize booth: balloons,
// darts, rings and bottles, cork-gun prizes, the crosshair, booth backdrops,
// the prize ticket and the prize-booth icons.

import { bake, type Color, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas, type Sprite } from '../../engine/sprite'
import { mixHex } from '../../art/characters'

export const INK = '#3a2838'
const mix = mixHex

/** Booth backdrop: dark tent, striped valance, bulbs and a sign board. */
export function boothBackdrop(w: number, h: number, top: number, color: Color, board: Color): HTMLCanvasElement {
  return bake(w, h, (g) => {
    g.gradientV(0, 0, w, h, ['#1e1830', '#2b2340', '#3a2c48'])
    // Tent side panels.
    for (let x = 0; x < w; x += 12) g.rect(x, 0, 6, h, 'rgba(255,255,255,0.03)')
    // Striped valance with scallops.
    const vy = Math.max(0, top - 18)
    for (let x = 0; x < w; x += 8) {
      const c = Math.floor(x / 8) % 2 ? color : '#fffaf0'
      g.rect(x, vy, 8, 10, c)
      g.poly([[x, vy + 10], [x + 8, vy + 10], [x + 4, vy + 14]], c)
    }
    g.hline(0, w - 1, vy, mix(color, '#ffffff', 0.4))
    // Back board.
    g.rect(8, top, w - 16, h - top - 40, board)
    g.frame(8, top, w - 16, h - top - 40, mix(board, INK, 0.45))
    for (let i = 0; i < 90; i++) {
      const v = (i * 2654435761) >>> 0
      g.px(10 + (v % (w - 20)), top + 2 + ((v >>> 9) % Math.max(1, h - top - 44)), mix(board, INK, 0.12))
    }
    // Counter at the bottom.
    g.rect(0, h - 40, w, 6, '#fff1d6')
    g.hline(0, w - 1, h - 40, '#ffffff')
    g.rect(0, h - 34, w, 34, color)
    for (let x = 4; x < w; x += 12) g.rect(x, h - 30, 6, 26, mix(color, INK, 0.2))
  })
}

/** String of bulbs across the top of a booth (drawn every frame). */
export function drawBulbs(g: Surface, w: number, y: number, t: number) {
  const cols = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#ffb35a', '#c8a0ff']
  for (let x = 4, i = 0; x < w; x += 9, i++) {
    const yy = y + Math.round(Math.sin((x / w) * Math.PI) * 3)
    const on = (Math.floor(t * 4) + i) % 3 !== 0
    g.px(x, yy - 1, '#4a3848')
    g.rect(x - 1, yy, 3, 3, on ? cols[i % cols.length] : mix(cols[i % cols.length], '#2b2340', 0.6))
    if (on) g.px(x, yy, '#ffffff')
  }
}

// ---------------------------------------------------------------------------
// Balloon darts.

export type BalloonKind = 'normal' | 'gold' | 'hippo' | 'steel'

export const BALLOON_COLORS: Color[] = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0', '#c8a0ff', '#f58f35']

/** A balloon centred at (x, y) with radius r. */
export function drawBalloon(g: Surface, x: number, y: number, r: number, color: Color, kind: BalloonKind, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  if (kind === 'hippo') {
    const body = '#b4a8c8'
    g.ellipse(X, Y, r + 1, r, mix(body, INK, 0.3))
    g.ellipse(X, Y - 0.5, r, r - 1, body)
    g.ellipse(X + 1, Y + 2, r * 0.55, r * 0.35, mix(body, '#ffffff', 0.25))
    g.px(X, Y + 2, INK)
    g.px(X + 2, Y + 2, INK)
    g.px(X - 2, Y - 1, INK)
    g.px(X + 3, Y - 1, INK)
    g.px(X - r + 1, Y + 1, '#ff9fc0')
    g.px(X + r - 1, Y + 1, '#ff9fc0')
    g.px(X - r + 2, Y - r + 1, mix(body, INK, 0.3))
    g.px(X + r - 2, Y - r + 1, mix(body, INK, 0.3))
    g.px(X - 2, Y - 3, '#ffffff')
  } else {
    const c = kind === 'gold' ? '#ffd54f' : kind === 'steel' ? '#aeb4c4' : color
    g.ellipse(X, Y, r, r + 1, mix(c, INK, 0.35))
    g.ellipse(X, Y - 0.5, r - 0.6, r + 0.3, c)
    g.ellipse(X - r * 0.35, Y - r * 0.4, r * 0.3, r * 0.4, mix(c, '#ffffff', 0.55))
    if (kind === 'gold' && Math.floor(t * 5 + x) % 4 === 0) g.px(X + 2, Y - 2, '#ffffff')
    if (kind === 'steel') {
      g.hline(X - r + 2, X + r - 2, Y, mix(c, INK, 0.2))
      g.px(X - 2, Y - 2, '#ffffff')
      g.px(X + 2, Y + 2, '#6a7080')
    }
  }
  // Knot and string.
  g.px(X, Y + r + 1, mix(color, INK, 0.3))
  g.vline(X, Y + r + 2, Y + r + 5, '#f0e8dc')
}

/** A dart (flying or stuck). (x, y) = tip, angle in radians (pointing to the tip). */
export function drawDart(g: Surface, x: number, y: number, ang: number, len = 10) {
  const dx = Math.cos(ang)
  const dy = Math.sin(ang)
  const bx = x - dx * len
  const by = y - dy * len
  g.line(Math.round(x), Math.round(y), Math.round(bx), Math.round(by), '#8a8480')
  g.px(Math.round(x), Math.round(y), '#e4ddd6')
  // Feathers.
  const px = -dy
  const py = dx
  g.line(Math.round(bx), Math.round(by), Math.round(bx - dx * 3 + px * 2), Math.round(by - dy * 3 + py * 2), '#e8514a')
  g.line(Math.round(bx), Math.round(by), Math.round(bx - dx * 3 - px * 2), Math.round(by - dy * 3 - py * 2), '#ffd23f')
}

// ---------------------------------------------------------------------------
// Ring toss.

/** A bottle / peg at (x, y = base) scaled by s (perspective). */
export function drawBottle(g: Surface, x: number, y: number, s: number, color: Color, gold = false) {
  const w = Math.max(3, Math.round(7 * s))
  const h = Math.max(5, Math.round(17 * s))
  const X = Math.round(x)
  const Y = Math.round(y)
  const c = gold ? '#ffd54f' : color
  g.rect(X - Math.floor(w / 2), Y - h, w, h, mix(c, INK, 0.25))
  g.rect(X - Math.floor(w / 2), Y - h, Math.max(1, w - 1), h - 1, c)
  g.vline(X - Math.floor(w / 2), Y - h + 1, Y - 2, mix(c, '#ffffff', 0.45))
  const nh = Math.max(2, Math.round(6 * s))
  const nw = Math.max(2, Math.round(3 * s))
  g.rect(X - Math.floor(nw / 2), Y - h - nh, nw, nh, c)
  g.rect(X - Math.floor(nw / 2) - (s > 0.8 ? 1 : 0), Y - h - nh - 1, nw + (s > 0.8 ? 2 : 0), 1, gold ? '#fff3a6' : '#e8514a')
}

/** A ring seen from the front at scale s (ellipse). */
export function drawRing(g: Surface, x: number, y: number, s: number, color: Color = '#ffd23f', tilt = 0.45) {
  const rx = Math.max(2, 8 * s)
  const ry = Math.max(1, rx * tilt)
  const n = Math.max(14, Math.round(rx * 5))
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const px = Math.round(x + Math.cos(a) * rx)
    const py = Math.round(y + Math.sin(a) * ry)
    g.px(px, py, Math.sin(a) > 0 ? color : mix(color, INK, 0.3))
    if (s > 0.9) g.px(px, py + 1, mix(color, INK, 0.45))
  }
}

// ---------------------------------------------------------------------------
// Cork gun.

export type CorkPrizeKind = 'can' | 'candy' | 'doll' | 'teddy' | 'duck' | 'hippo'

/** A shelf prize standing on y (bottom centre), knocked by `lean` (-1..1). */
export function drawCorkPrize(g: Surface, x: number, y: number, kind: CorkPrizeKind, lean: number, color: Color, t: number) {
  const X = Math.round(x + lean * 3)
  const Y = Math.round(y)
  if (kind === 'can') {
    g.rect(X - 3, Y - 9, 7, 9, color)
    g.hline(X - 3, X + 3, Y - 9, '#e4ddd6')
    g.hline(X - 3, X + 3, Y - 5, '#fffaf0')
    g.vline(X - 3, Y - 8, Y - 1, mix(color, '#ffffff', 0.4))
  } else if (kind === 'candy') {
    g.rect(X - 5, Y - 8, 11, 8, color)
    g.frame(X - 5, Y - 8, 11, 8, mix(color, INK, 0.35))
    g.rect(X - 2, Y - 6, 5, 4, '#fffaf0')
    g.px(X, Y - 5, '#e8514a')
  } else if (kind === 'doll') {
    g.rect(X - 3, Y - 8, 7, 8, color)
    g.circle(X, Y - 11, 3, '#f0d0b0')
    g.rect(X - 3, Y - 15, 7, 2, '#3a2838')
    g.px(X - 1, Y - 11, INK)
    g.px(X + 1, Y - 11, INK)
  } else if (kind === 'teddy') {
    g.circle(X, Y - 7, 7, mix(color, INK, 0.2))
    g.circle(X, Y - 7.5, 6, color)
    g.circle(X, Y - 17, 5, color)
    g.circle(X - 4, Y - 21, 2, color)
    g.circle(X + 4, Y - 21, 2, color)
    g.px(X - 2, Y - 18, INK)
    g.px(X + 2, Y - 18, INK)
    g.px(X, Y - 16, INK)
    g.ellipse(X, Y - 7, 3, 3, mix(color, '#ffffff', 0.4))
    g.rect(X - 3, Y - 13, 7, 1, '#e8514a')
  } else if (kind === 'hippo') {
    g.ellipse(X, Y - 5, 7, 5, '#8a8098')
    g.ellipse(X + 5, Y - 7, 4, 3.5, '#8a8098')
    g.px(X + 7, Y - 6, '#ff9fc0')
    g.px(X + 5, Y - 9, INK)
    g.px(X - 1, Y - 9, '#b4a8c8')
    g.rect(X - 5, Y - 1, 2, 1, '#5a5068')
    g.rect(X + 3, Y - 1, 2, 1, '#5a5068')
  } else {
    // Duck on the conveyor.
    const bob = Math.round(Math.sin(t * 6 + x) * 0.6)
    g.ellipse(X, Y - 4 + bob, 5, 3.5, '#ffd23f')
    g.circle(X + 4, Y - 8 + bob, 2.6, '#ffd23f')
    g.rect(X + 6, Y - 8 + bob, 3, 1, '#f58f35')
    g.px(X + 4, Y - 9 + bob, INK)
    g.px(X - 3, Y - 5 + bob, '#fff3a6')
  }
}

/** The swaying crosshair. */
export function drawCrosshair(g: Surface, x: number, y: number, t: number, hot: boolean) {
  const X = Math.round(x)
  const Y = Math.round(y)
  const c = hot ? '#ff6f91' : '#fff3a6'
  const r = 7 + (Math.floor(t * 6) % 2)
  for (const [col, rr, off] of [
    [INK, r + 1, 1],
    [c, r, 0],
  ] as const) {
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2
      if (i % 8 === 0) continue
      g.px(Math.round(X + Math.cos(a) * rr), Math.round(Y + Math.sin(a) * rr), col)
    }
    g.rect(X - 12 - off, Y - off, 7 + off, 1 + off * 2, col)
    g.rect(X + 5, Y - off, 7 + off, 1 + off * 2, col)
    g.rect(X - off, Y - 12 - off, 1 + off * 2, 7 + off, col)
    g.rect(X - off, Y + 5, 1 + off * 2, 7 + off, col)
  }
  g.px(X, Y, '#ffffff')
}

/** The cork gun seen from behind at the bottom, pointing at (tx, ty). */
export function drawCorkGun(g: Surface, bx: number, by: number, tx: number, ty: number, recoil: number) {
  const ang = Math.atan2(ty - by, tx - bx)
  const len = 34 - recoil * 6
  const ex = bx + Math.cos(ang) * len
  const ey = by + Math.sin(ang) * len
  g.thickLine(bx, by, ex, ey, 5, '#6e4a35')
  g.thickLine(bx, by, ex, ey, 3, '#8a5a3a')
  g.circle(Math.round(ex), Math.round(ey), 2.5, '#3a3040')
  g.px(Math.round(ex), Math.round(ey), '#c8a878')
  // Hands.
  g.circle(Math.round(bx + Math.cos(ang) * 8), Math.round(by + Math.sin(ang) * 8) + 2, 3, '#f0bd90')
  g.circle(Math.round(bx), Math.round(by) + 3, 3.5, '#f0bd90')
}

// ---------------------------------------------------------------------------
// Tickets and prize icons (DOM).

/** The fair prize ticket (ตั๋วรางวัล), 16×10. */
export function ticketSprite(): Sprite {
  return cached('fair:ticket', () => {
    const c = bake(16, 10, (g) => {
      g.rect(0, 0, 16, 10, '#f58f35')
      g.rect(1, 1, 14, 8, '#ffb35a')
      g.ctx.clearRect(0, 3, 1, 4)
      g.ctx.clearRect(15, 3, 1, 4)
      for (let y = 1; y < 9; y += 2) g.px(11, y, '#c86a2a')
      g.rect(3, 3, 6, 1, '#fff3a6')
      g.rect(3, 5, 4, 1, '#fff3a6')
      g.px(13, 4, '#fff3a6')
      g.px(13, 6, '#fff3a6')
    })
    return outlineCanvas(c, INK)
  })
}

const ICON_DRAW: Record<string, (g: Surface) => void> = {
  coins(g) {
    for (const [x, y] of [
      [8, 15],
      [14, 13],
      [11, 9],
    ]) {
      g.circle(x, y, 5, '#e9a53a')
      g.circle(x, y - 0.5, 4, '#ffd54f')
      g.rect(x - 1, y - 2, 2, 3, '#fff3a6')
    }
  },
  goldfish(g) {
    g.ellipse(11, 12, 8, 9, '#d4f1ff')
    g.ellipse(11, 12, 7, 8, '#e8f8ff')
    g.rect(8, 2, 6, 3, '#ff9fc0')
    g.ellipse(11, 13, 4, 2.5, '#f58f35')
    g.poly([[14, 13], [18, 10], [18, 16]], '#ff9a5a')
    g.px(9, 12, INK)
    g.px(7, 8, '#ffffff')
  },
  ghost(g) {
    g.circle(11, 9, 7, '#fffaf0')
    g.rect(4, 9, 15, 8, '#fffaf0')
    for (let i = 0; i < 4; i++) g.circle(5 + i * 4, 17, 2, '#fffaf0')
    g.px(8, 8, INK)
    g.px(14, 8, INK)
    g.rect(10, 11, 3, 2, INK)
    g.vline(11, 0, 2, '#ffd54f')
    g.circle(11, 0, 1, '#ffd54f')
  },
  hippo(g) {
    g.ellipse(11, 12, 9, 7, '#8a8098')
    g.ellipse(13, 15, 5, 3, '#b4a8c8')
    g.px(4, 5, '#8a8098')
    g.px(18, 5, '#8a8098')
    g.circle(4, 6, 2, '#8a8098')
    g.circle(18, 6, 2, '#8a8098')
    g.px(8, 10, INK)
    g.px(15, 10, INK)
    g.px(12, 15, INK)
    g.px(14, 15, INK)
    g.px(4, 13, '#ff9fc0')
    g.px(19, 13, '#ff9fc0')
    g.px(7, 7, '#d0c8e0')
  },
  lookchin(g) {
    g.line(4, 20, 16, 2, '#e0c080')
    for (const [x, y] of [
      [13, 6],
      [10, 10],
      [7, 14],
    ])
      g.circle(x, y, 3, '#c8784a')
    g.px(12, 5, '#f0a070')
    g.px(9, 9, '#f0a070')
  },
  teddy(g) {
    g.circle(11, 14, 7, '#ff9fc0')
    g.circle(11, 6, 5, '#ff9fc0')
    g.circle(6, 2, 2, '#ff9fc0')
    g.circle(16, 2, 2, '#ff9fc0')
    g.px(9, 5, INK)
    g.px(13, 5, INK)
    g.px(11, 7, INK)
    g.ellipse(11, 14, 3, 3, '#ffd6e0')
    g.rect(7, 10, 9, 1, '#e8514a')
  },
  duck(g) {
    g.ellipse(10, 14, 8, 6, '#ffd23f')
    g.circle(15, 7, 4, '#ffd23f')
    g.rect(18, 7, 3, 2, '#f58f35')
    g.px(15, 6, INK)
    g.rect(5, 18, 10, 2, '#5a8de0')
    g.px(7, 12, '#fff3a6')
  },
  likay(g) {
    g.rect(7, 10, 9, 10, '#e8514a')
    for (let i = 0; i < 6; i++) g.px(8 + (i % 3) * 3, 12 + Math.floor(i / 3) * 4, '#ffd54f')
    g.circle(11, 7, 3.5, '#f0d0b0')
    g.rect(7, 1, 9, 3, '#ffd54f')
    g.line(11, 1, 17, -3, '#fffaf0')
    g.px(10, 7, INK)
    g.px(12, 7, INK)
  },
  likayhat(g) {
    g.rect(5, 12, 13, 5, '#ffd54f')
    g.hline(5, 17, 12, '#fff3a6')
    for (let i = 0; i < 5; i++) g.px(6 + i * 3, 14, ['#e8514a', '#6cf0c0', '#9fd0ff'][i % 3])
    g.line(11, 12, 7, 1, '#fffaf0')
    g.line(12, 12, 16, 0, '#ff9fc0')
    g.line(11, 12, 11, 2, '#fffaf0')
  },
  ferriswheel(g) {
    g.circle(11, 10, 9, '#6a5a9a')
    g.circle(11, 10, 8, '#2b2340')
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.line(11, 10, Math.round(11 + Math.cos(a) * 8), Math.round(10 + Math.sin(a) * 8), '#8a86c0')
      g.px(Math.round(11 + Math.cos(a) * 8), Math.round(10 + Math.sin(a) * 8), ['#ff6f91', '#ffd23f', '#6cf0c0'][i % 3])
    }
    g.line(11, 10, 5, 21, '#8a86c0')
    g.line(11, 10, 17, 21, '#8a86c0')
  },
  star(g) {
    g.poly([[11, 1], [14, 8], [21, 8], [15, 13], [17, 20], [11, 16], [5, 20], [7, 13], [1, 8], [8, 8]], '#ffd54f')
    g.px(10, 6, '#fff3a6')
  },
}

/** 24×24 outlined prize icon for the prize booth, by art motif. */
export function prizeIcon(motif: string): Sprite {
  return cached(`fair:prize:${motif}`, () => {
    const draw = ICON_DRAW[motif] ?? ICON_DRAW.star
    const c = bake(22, 22, (g) => draw(g))
    return outlineCanvas(c, INK)
  })
}

/** Hub passport stamp (visited or not), 22×22. */
export function stampSprite(icon: 'jj' | 'dn' | 'mk' | 'tp' | 'ky' | 'ic', on: boolean): Sprite {
  return cached(`fair:stamp:${icon}:${on ? 1 : 0}`, () => {
    const col = { jj: '#3d63b5', dn: '#43905a', mk: '#e8514a', tp: '#b8543a', ky: '#e9a53a', ic: '#3d8a8a' }[icon]
    const c = bake(22, 22, (g) => {
      const main = on ? col : '#bdb2ae'
      g.circle(11, 11, 10, main)
      g.circle(11, 11, 8, on ? '#fffaf0' : '#e4ddd6')
      g.circle(11, 11, 7, main)
      g.circle(11, 11, 6, on ? mix(col, '#ffffff', 0.85) : '#ece6e0')
      const fg = on ? col : '#bdb2ae'
      if (icon === 'jj') {
        g.rect(10, 5, 3, 11, fg)
        g.circle(11, 7, 2.5, fg)
        g.px(11, 7, '#fffaf0')
      } else if (icon === 'dn') {
        g.poly([[4, 12], [18, 12], [16, 15], [6, 15]], fg)
        g.rect(10, 7, 3, 5, fg)
      } else if (icon === 'mk') {
        g.rect(7, 6, 8, 10, fg)
        g.rect(8, 7, 6, 3, '#fffaf0')
        g.hline(5, 17, 17, fg)
      } else if (icon === 'tp') {
        for (let x = 5; x < 18; x += 3) g.rect(x, 8, 2, 2, fg)
        g.rect(5, 10, 13, 6, fg)
        g.rect(9, 12, 5, 4, '#fffaf0')
      } else if (icon === 'ky') {
        g.circle(11, 11, 4, fg)
        g.rect(9, 14, 1, 3, fg)
        g.rect(12, 14, 1, 3, fg)
      } else {
        g.rect(10, 7, 3, 9, fg)
        g.circle(11, 6, 3, fg)
        g.hline(6, 16, 16, fg)
      }
    })
    return outlineCanvas(c, on ? INK : '#8c8187')
  })
}
