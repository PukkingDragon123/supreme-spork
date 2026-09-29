// ตลาดร่มหุบ แม่กลอง – the station at the end of the line, the diesel
// railcar seen from above, market awnings that fold back when the train
// comes (drawn every frame with a `fold` amount), ground trays of ปลาทู and
// vegetables beside the rails, stall tables and the side shop façades.

import type { Color, Surface } from '../../engine/pixel'
import { hprop, hsh, INK, INK2, mix, ramp, type Goods, type HubProp } from './hub-kit'

// ---------------------------------------------------------------------------
// Station.

/** Maeklong railway station building (anchor: centre of the platform edge). */
export function stationBuilding(night = false): HubProp {
  const W = 124
  const H = 70
  return hprop(`mk:station:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const wall = ramp('#f4e8c8')
    // Platform.
    g.rect(0, H - 12, W, 12, '#d8cfc4')
    g.hline(0, W - 1, H - 12, '#f0e8dc')
    g.rect(0, H - 3, W, 3, '#f0c040')
    for (let x = 0; x < W; x += 6) g.rect(x, H - 3, 3, 3, '#3a3040')
    // Building.
    g.rect(10, 22, W - 20, H - 34, wall.b)
    g.rect(W - 28, 22, 18, H - 34, wall.d)
    g.hline(10, W - 11, 22, wall.L)
    for (let x = 18; x < W - 20; x += 16) {
      g.rect(x, 30, 9, 16, '#6e4a35')
      g.rect(x + 1, 31, 7, 14, night ? '#ffe7a8' : '#8fb6d0')
      g.vline(x + 4, 31, 44, '#6e4a35')
    }
    // Ticket window + door.
    g.rect(W / 2 - 8, 34, 16, 24, '#8a5a3a')
    g.rect(W / 2 - 6, 36, 12, 22, night ? '#c89050' : '#4a3128')
    // Roof: wide hipped roof in red tiles.
    const R = ramp('#c8543a')
    for (let y = 4; y < 22; y++) {
      const inset = Math.round((22 - y) * 1.1)
      for (let x = inset; x < W - inset; x++) g.px(x, y, (x + y) % 5 === 0 ? R.d : y < 8 ? R.L : R.b)
    }
    g.hline(0, W - 1, 21, R.D)
    g.hline(20, W - 21, 4, R.L)
    // Station name board (blue with white squiggles) and a clock.
    g.rect(W / 2 - 28, 10, 56, 9, '#fffaf0')
    g.frame(W / 2 - 28, 10, 56, 9, '#3d63b5')
    for (let i = 0; i < 7; i++) {
      const x = W / 2 - 22 + i * 7
      g.rect(x, 13, 5, 1, '#3d63b5')
      g.rect(x + (i % 2) * 4, 14, 1, 3, '#3d63b5')
    }
    g.circle(W / 2, 3, 3, '#fffaf0')
    g.px(W / 2, 2, INK)
    g.px(W / 2 + 1, 3, INK)
    // Platform benches and a bell post.
    g.rect(18, H - 18, 18, 3, '#9a6a45')
    g.rect(W - 38, H - 18, 18, 3, '#9a6a45')
    g.vline(W - 12, H - 30, H - 13, '#8a8480')
    g.circle(W - 12, H - 31, 2, '#ffd54f')
    hooks.bell = [{ x: W - 12, y: H - 31 }]
    hooks.lamp = [{ x: 30, y: 24 }, { x: W - 30, y: 24 }]
  })
}

/** End-of-line buffer stop (baked). */
export function bufferStop(g: Surface, cx: number, y: number) {
  g.rect(cx - 12, y - 6, 24, 6, '#e8514a')
  for (let x = cx - 12; x < cx + 12; x += 6) g.rect(x, y - 6, 3, 6, '#fffaf0')
  g.rect(cx - 10, y, 3, 4, '#5e5a64')
  g.rect(cx + 7, y, 3, 4, '#5e5a64')
}

// ---------------------------------------------------------------------------
// The train (seen from above; runs along the vertical track at x = cx).

const TR = { roof: '#d8dce4', roofD: '#a8acb8', body: '#f0c040', bodyD: '#c89a28', stripe: '#e8514a', blue: '#3d63b5', win: '#6a8ab0', dark: '#3a3040' }

/**
 * Two-car railcar. `lead` = y of the leading end, `dir` = +1 moving down
 * (front at the bottom), -1 moving up. `t` animates the headlights.
 */
export function drawTrain(g: Surface, cx: number, lead: number, dir: 1 | -1, t: number, night: boolean) {
  const CAR = 62
  const half = 13
  for (let c = 0; c < 2; c++) {
    const a = lead - dir * c * (CAR + 3)
    const b = a - dir * CAR
    const y0 = Math.round(Math.min(a, b))
    const y1 = Math.round(Math.max(a, b))
    // Shadow.
    g.alpha(0.25)
    g.rect(cx - half - 1, y0 + 3, half * 2 + 3, y1 - y0, '#1e141e')
    g.alpha(1)
    // Body sides peeking out.
    g.rect(cx - half, y0, half * 2, y1 - y0, TR.body)
    g.vline(cx - half, y0, y1, TR.bodyD)
    g.vline(cx + half - 1, y0, y1, TR.bodyD)
    // Side windows (dots) and the red/blue stripes.
    for (let y = y0 + 6; y < y1 - 6; y += 6) {
      g.px(cx - half, y, night ? '#ffe7a8' : TR.win)
      g.px(cx + half - 1, y, night ? '#ffe7a8' : TR.win)
    }
    g.vline(cx - half + 1, y0 + 2, y1 - 2, TR.stripe)
    g.vline(cx + half - 2, y0 + 2, y1 - 2, TR.blue)
    // Yellow shoulders, then the roof with vents and an AC box.
    g.rect(cx - half + 2, y0 + 1, half * 2 - 4, y1 - y0 - 2, TR.body)
    g.rect(cx - half + 5, y0 + 2, half * 2 - 10, y1 - y0 - 4, TR.roof)
    g.vline(cx - half + 5, y0 + 2, y1 - 3, '#f0f2f6')
    g.vline(cx + half - 6, y0 + 2, y1 - 3, TR.roofD)
    g.vline(cx - half + 3, y0 + 3, y1 - 3, TR.stripe)
    g.vline(cx + half - 4, y0 + 3, y1 - 3, TR.stripe)
    for (let y = y0 + 10; y < y1 - 10; y += 14) {
      g.rect(cx - 5, y, 10, 6, TR.roofD)
      g.rect(cx - 4, y + 1, 8, 4, '#c0c4ce')
      g.hline(cx - 3, cx + 2, y + 3, TR.roofD)
    }
    // Ends: the leading end of the first car has the cab face.
    const front = c === 0
    const endY = dir > 0 ? y1 : y0
    if (front) {
      const fy = dir > 0 ? y1 - 1 : y0 - 7
      g.rect(cx - half, fy, half * 2, 8, TR.body)
      g.rect(cx - half + 3, fy + (dir > 0 ? 1 : 3), half * 2 - 6, 3, night ? '#9fc0e0' : TR.win)
      g.hline(cx - half, cx + half - 1, fy + (dir > 0 ? 5 : 1), TR.stripe)
      const on = night || Math.floor(t * 2) % 2 === 0
      g.rect(cx - half + 1, fy + (dir > 0 ? 6 : 0), 3, 2, on ? '#fff6c8' : '#e8e0c0')
      g.rect(cx + half - 4, fy + (dir > 0 ? 6 : 0), 3, 2, on ? '#fff6c8' : '#e8e0c0')
      g.rect(cx - 2, fy + (dir > 0 ? 6 : 0), 4, 2, '#3a3040')
    } else {
      g.hline(cx - half, cx + half - 1, endY, TR.bodyD)
    }
    // Gangway between the cars.
    if (c === 0) {
      const gy = dir > 0 ? y0 - 3 : y1
      g.rect(cx - 5, gy, 10, 3, TR.dark)
    }
  }
}

// ---------------------------------------------------------------------------
// Awnings over the track.

/**
 * A market awning (กันสาด) anchored at the stall post (x0) reaching toward
 * x1 when open. `fold` 0 = open, 1 = pulled back. `y` is the ground line of
 * its shade; the fabric hangs `h` px above.
 */
export function drawAwning(g: Surface, x0: number, x1: number, y: number, depth: number, cols: [Color, Color], fold: number, t: number, wind = 0) {
  const f = Math.max(0, Math.min(1, fold))
  const dir = x1 > x0 ? 1 : -1
  const reach = Math.abs(x1 - x0) * (1 - f * 0.78)
  const tip = Math.round(x0 + dir * reach)
  const top = y - 30
  const flap = Math.round(Math.sin(t * 3 + x0) * 0.6 * wind)
  // Support arms (bamboo) from the post to the tip.
  g.line(x0, top + 14, tip, top + 2 + flap, '#c9a06a')
  g.line(x0, top + 14 + depth, tip, top + 2 + depth + flap, '#b08a52')
  // Fabric panel (seen from above-front): stripes run across the reach.
  const a = Math.min(x0, tip)
  const b = Math.max(x0, tip)
  const bunch = f > 0.05
  for (let x = a; x <= b; x++) {
    const k = Math.floor(Math.abs(x - x0) / (bunch ? 3 : 6))
    const c = k % 2 ? cols[1] : cols[0]
    const sag = Math.round(Math.sin(((x - a) / Math.max(1, b - a)) * Math.PI) * 1.5)
    g.vline(x, top + sag + flap * (Math.abs(x - x0) / Math.max(1, reach)), top + depth + sag, c)
    if (bunch && k % 2 === 0) g.px(x, top + sag + 1, mix(c, INK, 0.25))
  }
  g.hline(a, b, top + depth + 1, mix(cols[0], INK, 0.4))
  // Scalloped tip edge.
  for (let yy = top; yy < top + depth; yy += 3) g.px(tip + dir, yy + 1, cols[(yy / 3) % 2 ? 0 : 1])
  // Rope / hook at the tip.
  g.px(tip, top + depth + 2, '#8a8480')
}

/** A round tray (กระด้ง) of goods on the ground beside the rails. */
export function drawTray(g: Surface, x: number, y: number, kind: 'platu' | 'veg' | 'fruit' | 'shrimp' | 'chili', seed = 0) {
  const X = Math.round(x)
  const Y = Math.round(y)
  g.ellipse(X, Y, 7, 3, '#8a6a3a')
  g.ellipse(X, Y - 0.5, 6, 2.4, '#d8b068')
  for (let i = 0; i < 7; i++) {
    const v = hsh(i, seed, 3)
    const px = X - 4 + (i % 4) * 3
    const py = Y - 1 - Math.floor(i / 4)
    if (kind === 'platu') {
      g.rect(px, py - 1, 2, 1, '#9fb4c8')
      g.px(px + 2, py - 1, '#6e8aa4')
      g.px(px, py - 2, '#d8e4ee')
    } else if (kind === 'veg') g.px(px, py - 1, v % 2 ? '#5ea653' : '#86c95f')
    else if (kind === 'fruit') g.px(px, py - 1, v % 2 ? '#e8514a' : '#ffd23f')
    else if (kind === 'shrimp') g.px(px, py - 1, v % 2 ? '#ff9a7a' : '#f07a5a')
    else g.px(px, py - 1, v % 2 ? '#e8514a' : '#43905a')
  }
}

/** Side stall table running along the track (anchor: bottom centre). */
export function stallTable(key: string, goods: Goods, cloth: Color = '#5a8de0'): HubProp {
  return hprop(`mk:table:${key}`, 34, 20, 17, 19, (g) => {
    const C = ramp(cloth)
    g.rect(1, 6, 32, 4, '#e8e2dc')
    g.hline(1, 32, 6, '#ffffff')
    g.rect(2, 10, 30, 8, C.b)
    g.hline(2, 31, 10, C.d)
    for (let x = 4; x < 32; x += 5) g.vline(x, 11, 17, C.d)
    g.hline(2, 31, 17, C.D)
    goods(g, 2, 31, 6)
  })
}

/** Side-on shophouse façades lining the market (baked strip from y0 to y1). */
export function sideFacade(g: Surface, x: number, w: number, y0: number, y1: number, facing: 1 | -1, seed: number, night: boolean) {
  const cols = ['#f0e0c0', '#e8d4b0', '#d8e4d0', '#f4d8c8']
  for (let y = y0; y < y1; y += 44) {
    const h = Math.min(44, y1 - y)
    const c = cols[hsh(y, seed) % cols.length]
    const r = ramp(night ? mix(c, '#2a2a4a', 0.3) : c)
    g.rect(x, y, w, h, r.b)
    g.hline(x, x + w - 1, y, r.D)
    // Door opening facing the market, with goods glow.
    const dx = facing > 0 ? x + w - 12 : x
    g.rect(dx, y + 8, 12, h - 12, night ? '#6a5040' : '#4a3a40')
    for (let k = 0; k < 4; k++) g.rect(dx + 2 + (k % 2) * 5, y + 12 + k * 6, 3, 3, ['#ffd23f', '#e8514a', '#9fd0ff', '#6cc36a'][(k + hsh(y, seed, 1)) % 4])
    if (night) {
      g.alpha(0.3)
      g.rect(dx, y + 8, 12, h - 12, '#ffcf7a')
      g.alpha(1)
    }
    // Upper roof edge (corrugated) toward the market.
    for (let yy = y; yy < y + h; yy++) g.px(facing > 0 ? x + w - 1 : x, yy, yy % 3 ? '#a8a2b0' : '#c8c4cc')
    // Sign.
    g.rect(facing > 0 ? x + 2 : x + w - 8, y + 4, 6, 14, ['#e8514a', '#3d63b5', '#43905a', '#f58f35'][hsh(y, seed, 2) % 4])
    g.vline(facing > 0 ? x + 4 : x + w - 6, y + 6, y + 15, '#fffaf0')
  }
}

/** Railway crossing signal with a warning bell (anchor bottom). */
export function crossingSignal(): HubProp {
  return hprop('mk:signal', 14, 40, 7, 39, (g, hooks) => {
    g.rect(6, 8, 2, 31, '#fffaf0')
    for (let y = 10; y < 38; y += 6) g.rect(6, y, 2, 3, '#e8514a')
    g.poly([[1, 4], [13, 12], [12, 13], [0, 5]], '#fffaf0')
    g.poly([[13, 4], [1, 12], [0, 11], [12, 3]], '#fffaf0')
    g.line(1, 4, 12, 12, '#e8514a')
    g.rect(2, 14, 10, 5, '#3a3040')
    g.circle(4, 16, 1.5, '#6a3030')
    g.circle(10, 16, 1.5, '#6a3030')
    g.circle(7, 22, 2, '#ffd54f')
    hooks.lights = [{ x: 4, y: 16 }, { x: 10, y: 16 }]
  })
}

/** Little white fish in a bamboo steamer basket stack (ปลาทูเข่ง). */
export function platuStack(): HubProp {
  return hprop('mk:platustack', 20, 18, 10, 17, (g) => {
    for (let i = 0; i < 3; i++) {
      const y = 15 - i * 4
      g.ellipse(10, y, 8 - i, 2.5, '#c9a06a')
      g.ellipse(10, y - 0.5, 7 - i, 1.8, '#e0c080')
      for (let f = 0; f < 4 - i; f++) {
        g.rect(5 + i + f * 3, y - 2, 2, 1, '#9fb4c8')
        g.px(5 + i + f * 3, y - 3, '#6e8aa4')
      }
    }
    g.px(10, 2, INK2)
  })
}
