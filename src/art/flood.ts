// Art for the หนีภัยน้ำท่วม event: the flooded village (stilt houses, a
// ร้านชำ, a tuk-tuk under water, poles and palm tops), villagers and animals
// waiting on the roofs, floating junk, the rescue boat with its crew and the
// temple on the hill. Everything is drawn procedurally at pixel resolution.

import { bake, mix, type Surface } from '../engine/pixel'
import { cached, outlineCanvas, type Sprite } from '../engine/sprite'
import type { SurvivorKind, House, Obstacle, Debris, Floaty, PowerUp, Lizard, Lane } from '../activities/flood/sim'

const OUT = '#2a1f26'

export const FW = {
  water: '#7d8866',
  waterD: '#65704f',
  waterDD: '#525c40',
  waterL: '#98a27c',
  waterHi: '#c3c69c',
  foam: '#e6e3c4',
  lane: '#8f9a74',
  sky0: '#39405a',
  sky1: '#56607c',
  sky2: '#7a849a',
  cloud: '#2d3349',
  grass: '#5ea653',
  grassD: '#43905a',
  grassDD: '#2f6f4b',
  dirt: '#b58a5a',
  dirtD: '#8a6440',
}

const SKIN = ['#f6d2b0', '#e8b48a', '#c98e62']

function spr(key: string, w: number, h: number, draw: (g: Surface) => void): Sprite {
  return cached(`flood:${key}`, () => outlineCanvas(bake(w, h, draw), OUT))
}

// ---------------------------------------------------------------------------
// Villagers (front view, ~11×13 before the outline)

interface PersonLook {
  skin: string
  hair: string
  style: 'short' | 'long' | 'bun' | 'bald' | 'curly' | 'tuft'
  shirt: string
  shirt2?: string
  pants: string
  kid?: boolean
  hold?: 'radio' | 'doll' | 'rooster'
}

function person(g: Surface, o: PersonLook, frame: number, happy: boolean) {
  const dy = o.kid ? 2 : 0
  const s = o.skin
  // Head.
  g.rect(3, 1 + dy, 5, 4, s)
  g.rect(3, 0 + dy, 5, 2, o.hair)
  if (o.style === 'long') {
    g.rect(2, 1 + dy, 1, 5, o.hair)
    g.rect(8, 1 + dy, 1, 5, o.hair)
  } else if (o.style === 'bun') {
    g.rect(4, -1 + dy, 3, 2, o.hair)
    g.px(2, 2 + dy, o.hair)
    g.px(8, 2 + dy, o.hair)
  } else if (o.style === 'bald') {
    g.rect(3, 0 + dy, 5, 1, s)
    g.px(3, 1 + dy, o.hair)
    g.px(7, 1 + dy, o.hair)
  } else if (o.style === 'curly') {
    g.rect(2, 0 + dy, 7, 2, o.hair)
    g.px(2, 2 + dy, o.hair)
    g.px(8, 2 + dy, o.hair)
    g.px(4, -1 + dy, o.hair)
    g.px(6, -1 + dy, o.hair)
  } else if (o.style === 'tuft') {
    g.px(5, -1 + dy, o.hair)
  }
  // Face.
  if (happy) {
    g.px(4, 3 + dy, OUT)
    g.px(6, 3 + dy, OUT)
    g.px(4, 2 + dy, s)
  } else {
    g.px(4, 2 + dy, OUT)
    g.px(6, 2 + dy, OUT)
  }
  g.px(5, 4 + dy, happy ? '#c0504a' : mix(s, OUT, 0.4))
  g.px(3, 3 + dy, '#f4a0a0')
  g.px(7, 3 + dy, '#f4a0a0')
  // Body.
  const by = 5 + dy
  const bh = o.kid ? 3 : 4
  g.rect(3, by, 5, bh, o.shirt)
  if (o.shirt2) g.rect(3, by + bh - 1, 5, 1, o.shirt2)
  // Legs.
  const ly = by + bh
  const lh = o.kid ? 2 : 3
  g.rect(3, ly, 2, lh, o.pants)
  g.rect(6, ly, 2, lh, o.pants)
  g.px(3, ly + lh - 1, mix(o.pants, OUT, 0.35))
  g.px(7, ly + lh - 1, mix(o.pants, OUT, 0.35))
  // Left arm (or a held thing), right arm waving.
  if (o.hold === 'radio') {
    g.rect(0, by + 1, 4, 3, '#4a4652')
    g.px(1, by + 2, '#d7d3c8')
    g.px(2, by + 2, '#e9a53a')
    g.vline(0, by - 2, by, '#8c8187')
    g.px(3, by + 1, s)
  } else if (o.hold === 'doll') {
    g.rect(0, by, 3, 4, '#ff9fc0')
    g.rect(0, by - 1, 3, 2, '#ffd6e0')
    g.px(1, by - 1, OUT)
    g.px(3, by + 1, s)
  } else if (o.hold === 'rooster') {
    g.rect(0, by, 4, 3, '#d0461f')
    g.rect(-1, by - 2, 2, 3, '#e8b030')
    g.px(-1, by - 3, '#e8514a')
    g.px(-2, by - 1, '#f2c14e')
    g.rect(3, by - 1, 1, 3, '#2d6a3e')
    g.px(4, by - 2, '#1d4a3a')
    g.px(3, by + 2, s)
  } else {
    g.vline(2, by, by + 2, s)
  }
  if (frame === 0) {
    g.vline(8, by - 3, by, s)
    g.px(8, by - 4, s)
  } else {
    g.px(8, by, s)
    g.px(9, by - 1, s)
    g.px(9, by - 2, s)
    g.px(10, by - 3, s)
  }
}

const LOOKS: Partial<Record<SurvivorKind, PersonLook>> = {
  man: { skin: SKIN[1], hair: '#2a2228', style: 'short', shirt: '#3d63b5', pants: '#3a3f4f' },
  woman: { skin: SKIN[0], hair: '#2a2228', style: 'long', shirt: '#e8709e', pants: '#6a4b8a' },
  kid: { skin: SKIN[0], hair: '#2a2228', style: 'tuft', shirt: '#ffd54f', pants: '#e8514a', kid: true },
  granny: { skin: SKIN[1], hair: '#d9d4dc', style: 'bun', shirt: '#9270dc', shirt2: '#6e52b0', pants: '#4a3d6a', hold: 'radio' },
  uncle: { skin: SKIN[2], hair: '#8c8187', style: 'bald', shirt: '#f2efe6', shirt2: '#e8514a', pants: '#2f4f8f', hold: 'rooster' },
  auntie: { skin: SKIN[1], hair: '#3a2430', style: 'curly', shirt: '#f58f35', shirt2: '#ffd54f', pants: '#43905a', hold: 'doll' },
}

function cat(g: Surface, fur: string, dark: string, belly: string, frame: number, patch?: string, big = false) {
  // Sitting cat, 9×8.
  g.rect(2, 3, 5, 5, fur)
  if (big) g.rect(1, 4, 7, 4, fur)
  g.rect(2, 0, 5, 4, fur)
  g.px(2, -1, fur)
  g.px(6, -1, fur)
  g.px(2, 0, dark)
  g.px(6, 0, dark)
  g.px(3, 1, OUT)
  g.px(5, 1, OUT)
  g.px(4, 2, '#f4a0a0')
  g.rect(3, 5, 3, 3, belly)
  if (patch) {
    g.rect(5, 0, 2, 2, patch)
    g.rect(2, 4, 2, 2, patch)
  }
  g.px(3, 3, dark)
  g.px(5, 3, dark)
  // Tail.
  if (frame === 0) {
    g.px(7, 6, fur)
    g.px(8, 5, fur)
    g.px(8, 4, dark)
  } else {
    g.px(7, 6, fur)
    g.px(8, 6, fur)
    g.px(9, 5, dark)
  }
}

function dog(g: Surface, frame: number, vest = false) {
  const fur = '#c28e5c'
  g.rect(2, 3, 6, 5, fur)
  g.rect(2, 0, 6, 4, fur)
  g.rect(1, 0, 2, 3, '#8a5a30')
  g.rect(7, 0, 2, 3, '#8a5a30')
  g.rect(4, 4, 3, 3, '#fff1d6')
  g.px(3, 1, OUT)
  g.px(6, 1, OUT)
  g.rect(4, 2, 2, 1, OUT)
  if (frame === 1) g.px(5, 3, '#ff8a9a')
  if (vest) {
    g.rect(2, 4, 6, 3, '#f58f35')
    g.rect(2, 5, 6, 1, '#fff3a6')
  }
  g.px(8, 6, fur)
  g.px(9, frame ? 4 : 5, fur)
}

function chicken(g: Surface, frame: number) {
  g.rect(1, 2, 5, 4, '#fffaf0')
  g.rect(2, 0, 3, 3, '#fffaf0')
  g.px(3, -1, '#e8514a')
  g.px(4, -1, '#e8514a')
  g.px(3, 1, OUT)
  g.px(5, 1, '#f2a23f')
  g.px(3, 2, '#e8514a')
  g.rect(0, frame ? 2 : 3, 2, 2, '#e4ddd6')
  g.px(2, 6, '#f2a23f')
  g.px(4, 6, '#f2a23f')
}

function buffalo(g: Surface, frame: number) {
  const b = '#5a5563'
  const bd = '#433f4c'
  g.rect(3, 3, 11, 5, b)
  g.rect(3, 7, 11, 1, bd)
  g.rect(4, 8, 2, 2, bd)
  g.rect(11, 8, 2, 2, bd)
  g.rect(7, 8, 2, 2 - frame, bd)
  // Head.
  g.rect(0, 2, 5, 5, b)
  g.rect(0, 5, 3, 2, '#8c8187')
  g.px(0, 5, '#ff9aa6')
  g.px(2, 3, OUT)
  // Horns.
  g.px(1, 1, '#e4ddd6')
  g.px(0, 0, '#e4ddd6')
  g.px(4, 1, '#e4ddd6')
  g.px(5, 0, '#e4ddd6')
  g.px(6, 0, '#bdb2ae')
  // Tail.
  g.px(14, 3, bd)
  g.px(15, 4 + frame, bd)
  g.px(9, 4, '#6d6878')
}

/** Survivor sprite: frame 0/1 waving, `happy` once saved. */
export function survivorSprite(kind: SurvivorKind, frame: number, happy = false): Sprite {
  const f = frame & 1
  return cached(`flood:sv:${kind}:${f}:${happy ? 1 : 0}`, () => {
    const look = LOOKS[kind]
    let c: HTMLCanvasElement
    if (look) c = bake(14, 14, (g) => (g.setCamera(-2, -1), person(g, look, happy ? (f ? 0 : 1) : f, happy)))
    else if (kind === 'cat') c = bake(12, 10, (g) => (g.setCamera(-1, -1), cat(g, '#f2a23f', '#c8741f', '#fff1d6', f)))
    else if (kind === 'vipcat') c = bake(12, 10, (g) => (g.setCamera(-1, -1), cat(g, '#fffaf0', '#8c8187', '#fffaf0', f, '#f2a23f', true)))
    else if (kind === 'dog') c = bake(12, 10, (g) => (g.setCamera(-1, -1), dog(g, f)))
    else if (kind === 'chicken') c = bake(9, 9, (g) => (g.setCamera(-1, -2), chicken(g, f)))
    else c = bake(17, 12, (g) => (g.setCamera(-1, -1), buffalo(g, f)))
    return outlineCanvas(c, OUT)
  })
}

/** The rescue dog (ตูบกู้ภัย) in its little vest: speed boost buddy. */
export function rescueDogSprite(frame: number): Sprite {
  return cached(`flood:tub:${frame & 1}`, () => outlineCanvas(bake(12, 10, (g) => (g.setCamera(-1, -1), dog(g, frame & 1, true))), OUT))
}

// ---------------------------------------------------------------------------
// The rescue crew (หน่วยกู้ภัย): white/orange helmet, orange reflective vest.

export function rescuerSprite(frame: number): Sprite {
  return spr(`crew:${frame & 1}`, 11, 12, (g) => {
    g.setCamera(-1, -1)
    // Helmet.
    g.rect(2, 0, 6, 3, '#fffaf0')
    g.rect(2, 2, 6, 1, '#f58f35')
    g.px(1, 2, '#fffaf0')
    g.px(8, 2, '#fffaf0')
    g.px(4, 0, '#e4ddd6')
    // Face.
    g.rect(3, 3, 4, 3, SKIN[1])
    g.px(3, 4, OUT)
    g.px(6, 4, OUT)
    g.px(4, 5, '#c0504a')
    // Vest.
    g.rect(2, 6, 6, 4, '#f58f35')
    g.rect(2, 8, 6, 1, '#fff3a6')
    g.vline(4, 6, 9, '#2f3f6a')
    g.vline(5, 6, 9, '#2f3f6a')
    // Arm on the tiller.
    g.rect(8, 7 - (frame & 1), 2, 1, '#2f3f6a')
    g.px(9, 8 - (frame & 1), SKIN[1])
  })
}

/** Standing rescuer in the full kit (hub art / premium preview placeholder). */
export function rescuerBigSprite(): Sprite {
  return spr('crewbig', 20, 30, (g) => {
    const skin = SKIN[1]
    // Helmet.
    g.ellipse(10, 5, 6, 5, '#fffaf0')
    g.rect(4, 5, 12, 2, '#f58f35')
    g.rect(3, 7, 14, 1, '#e4ddd6')
    g.px(8, 2, '#ffffff')
    g.px(9, 2, '#ffffff')
    // Face.
    g.rect(6, 8, 8, 6, skin)
    g.px(8, 10, OUT)
    g.px(11, 10, OUT)
    g.rect(9, 12, 2, 1, '#c0504a')
    g.px(7, 11, '#f4a0a0')
    g.px(12, 11, '#f4a0a0')
    // Jacket.
    g.rect(4, 14, 12, 9, '#f58f35')
    g.rect(4, 18, 12, 2, '#fff3a6')
    g.rect(9, 14, 2, 9, '#2f3f6a')
    g.rect(2, 15, 2, 7, '#f58f35')
    g.rect(16, 15, 2, 7, '#f58f35')
    g.rect(2, 22, 2, 1, skin)
    g.rect(16, 22, 2, 1, skin)
    g.rect(2, 18, 2, 1, '#fff3a6')
    g.rect(16, 18, 2, 1, '#fff3a6')
    // Pants and boots.
    g.rect(5, 23, 4, 4, '#2f3f6a')
    g.rect(11, 23, 4, 4, '#2f3f6a')
    g.rect(4, 27, 5, 2, '#2a2830')
    g.rect(11, 27, 5, 2, '#2a2830')
    g.rect(5, 25, 4, 1, '#fff3a6')
    g.rect(11, 25, 4, 1, '#fff3a6')
    // Whistle.
    g.px(12, 15, '#ffd54f')
  })
}

/** Big police rescue dog placeholder for the premium preview. */
export function rescueDogBigSprite(): Sprite {
  return spr('tubbig', 22, 18, (g) => {
    const fur = '#8a5a30'
    const tan = '#c28e5c'
    g.rect(6, 7, 13, 7, tan)
    g.rect(16, 5, 4, 5, tan)
    g.rect(2, 1, 8, 8, tan)
    g.rect(1, 0, 3, 5, fur)
    g.rect(8, 0, 3, 5, fur)
    g.rect(2, 1, 8, 3, fur)
    g.rect(0, 5, 4, 3, tan)
    g.px(0, 5, OUT)
    g.px(4, 3, OUT)
    g.px(7, 3, OUT)
    g.rect(1, 7, 3, 1, '#ff8a9a')
    // Goggles.
    g.rect(3, 2, 6, 2, '#4ab0d8')
    g.px(4, 2, '#d4f1ff')
    // Vest.
    g.rect(6, 7, 11, 5, '#f58f35')
    g.rect(6, 9, 11, 1, '#fff3a6')
    g.rect(10, 7, 3, 2, '#3d63b5')
    // Legs.
    g.rect(7, 14, 2, 3, fur)
    g.rect(15, 14, 2, 3, fur)
    g.rect(19, 4, 2, 2, fur)
  })
}

// ---------------------------------------------------------------------------
// Houses (3/4 view). Geometry per style: how tall the flood-able part is and
// where the roof top (where people stand) sits above the ground line.

export interface HouseGeom {
  /** Stilts + walls height (the water rises over this before the roof). */
  body: number
  /** Roof top where survivors stand, above the ground line. */
  top: number
  /** Water already covering the ground at level 0. */
  start: number
}

export function houseGeom(style: House['style']): HouseGeom {
  switch (style) {
    case 'shop':
      return { body: 22, top: 24, start: 3 }
    case 'tuktuk':
      return { body: 12, top: 13, start: 7 }
    case 'shed':
      return { body: 12, top: 19, start: 2 }
    case 'mound':
      return { body: 7, top: 7, start: 0 }
    case 'hut':
      return { body: 16, top: 27, start: 3 }
    default:
      return { body: 22, top: 33, start: 4 }
  }
}

const WALLS = ['#b98a58', '#a8764a', '#c9a06a', '#9e7550']
const ROOFS = ['#8fa3b0', '#b8563f', '#7f95a3', '#a6553f']

function drawStilt(g: Surface, x0: number, y: number, w: number, tone: number, thatch: boolean) {
  const stilt = thatch ? 7 : 10
  const wall = thatch ? 9 : 12
  const wallTop = y - stilt - wall
  // Stilts.
  for (const sx of [x0 + 2, x0 + Math.round(w / 2) - 1, x0 + w - 4]) g.rect(sx, y - stilt, 2, stilt, '#6e4a35')
  g.rect(x0, y - stilt - 1, w, 2, '#6e4a35')
  // Wall planks.
  const wc = WALLS[tone % WALLS.length]
  g.rect(x0 + 1, wallTop, w - 2, wall, wc)
  for (let yy = wallTop + 2; yy < y - stilt - 1; yy += 3) g.rect(x0 + 1, yy, w - 2, 1, mix(wc, OUT, 0.18))
  // Window with shutters, and a door.
  const wx = x0 + 4
  g.rect(wx, wallTop + 3, 6, 5, '#3a2c34')
  g.rect(wx + 1, wallTop + 4, 4, 3, '#ffd88a')
  g.rect(wx - 2, wallTop + 3, 2, 5, '#5ea653')
  g.rect(wx + 6, wallTop + 3, 2, 5, '#5ea653')
  g.rect(x0 + w - 9, wallTop + 3, 5, wall - 3, '#6e4a35')
  g.px(x0 + w - 6, wallTop + 7, '#ffd54f')
  // Roof.
  const rh = thatch ? 11 : 11
  const rt = wallTop - rh
  if (thatch) {
    g.poly(
      [
        [x0 - 3, wallTop + 1],
        [x0 + w / 2, rt],
        [x0 + w + 3, wallTop + 1],
      ],
      '#c9a45a',
    )
    for (let k = 0; k < 4; k++) g.line(x0 - 1 + k * 2, wallTop, x0 + w / 2, rt + 1, '#a8843e')
    for (let k = 0; k < 4; k++) g.line(x0 + w + 1 - k * 2, wallTop, x0 + w / 2, rt + 1, '#e0c07a')
    g.rect(x0 - 3, wallTop, w + 6, 1, '#8a6a30')
  } else {
    const rc = ROOFS[tone % ROOFS.length]
    g.poly(
      [
        [x0 - 3, wallTop + 1],
        [x0 + 3, rt],
        [x0 + w - 3, rt],
        [x0 + w + 3, wallTop + 1],
      ],
      rc,
    )
    for (let xx = x0 - 1; xx < x0 + w + 2; xx += 3) g.line(xx, wallTop, xx + (xx < x0 + w / 2 ? 3 : -3) * 0.5, rt + 1, mix(rc, OUT, 0.2))
    g.rect(x0 + 3, rt, w - 6, 2, mix(rc, '#ffffff', 0.25))
    g.rect(x0 - 3, wallTop, w + 6, 1, mix(rc, OUT, 0.4))
  }
}

function drawShop(g: Surface, x0: number, y: number, w: number, sign?: CanvasImageSource & { width: number; height: number }) {
  const top = y - 24
  g.rect(x0, top, w, 24, '#e4ddd6')
  // Flat roof with a parapet.
  g.rect(x0 - 1, top, w + 2, 2, '#bdb2ae')
  g.rect(x0 - 1, top, w + 2, 1, '#f2efe6')
  // Sign board: "ร้านชำ" is printed on it by the pixel-text renderer.
  g.rect(x0 + 1, top + 2, w - 2, 9, '#23407a')
  g.rect(x0 + 2, top + 3, w - 4, 7, '#3d63b5')
  if (sign && sign.width) g.draw(sign, Math.round(x0 + w / 2 - sign.width / 2), Math.round(top + 3 + (7 - sign.height) / 2))
  // Striped awning.
  for (let k = 0; k < w + 4; k++) g.rect(x0 - 2 + k, top + 11, 1, 3, Math.floor(k / 3) % 2 ? '#fffaf0' : '#e8514a')
  // Roller shutter (ประตูเหล็กม้วน) half open, snacks hanging inside.
  g.rect(x0 + 3, top + 14, w - 6, 10, '#8c8187')
  for (let yy = top + 15; yy < top + 19; yy += 2) g.rect(x0 + 3, yy, w - 6, 1, '#a79ca2')
  g.rect(x0 + 3, top + 19, w - 6, 5, '#3a2c34')
  g.px(x0 + 6, top + 19, '#ffd54f')
  g.px(x0 + 10, top + 19, '#ff9fc0')
  g.px(x0 + 14, top + 19, '#86c95f')
  g.px(x0 + 18, top + 19, '#ffd54f')
}

function drawTuktuk(g: Surface, x0: number, y: number, w: number) {
  // Mostly under water already: body, canopy and the famous triangle front.
  g.rect(x0 + 1, y - 9, w - 2, 9, '#3d63b5')
  g.rect(x0 + 1, y - 9, w - 2, 2, '#5a8de0')
  g.rect(x0 + 3, y - 7, 6, 4, '#c8e0f0')
  g.poly(
    [
      [x0 - 1, y - 3],
      [x0 + 3, y - 10],
      [x0 + 3, y - 3],
    ],
    '#e8514a',
  )
  // Canopy roof with stripes.
  g.rect(x0, y - 13, w, 4, '#ffd54f')
  for (let k = 0; k < w; k += 4) g.rect(x0 + k, y - 13, 2, 4, '#e8514a')
  g.rect(x0, y - 13, w, 1, '#fff3a6')
  g.rect(x0 + w - 3, y - 9, 1, 6, '#2a2830')
}

function drawShed(g: Surface, x0: number, y: number, w: number) {
  // Chicken coop on short legs.
  g.rect(x0 + 2, y - 4, 2, 4, '#6e4a35')
  g.rect(x0 + w - 4, y - 4, 2, 4, '#6e4a35')
  g.rect(x0 + 1, y - 12, w - 2, 8, '#b98a58')
  for (let xx = x0 + 3; xx < x0 + w - 2; xx += 3) g.vline(xx, y - 12, y - 5, '#9a6a45')
  g.rect(x0 + 5, y - 10, 5, 4, '#3a2c34')
  g.poly(
    [
      [x0 - 2, y - 11],
      [x0 + w / 2, y - 19],
      [x0 + w + 2, y - 11],
    ],
    '#d8b86a',
  )
  g.rect(x0 - 2, y - 12, w + 4, 1, '#a8843e')
}

function drawMound(g: Surface, x: number, y: number, w: number, cover: number) {
  const k = Math.max(0, 1 - cover * 0.85)
  if (k <= 0.05) return
  g.ellipse(x, y - 2, (w / 2) * k + 2, 5 * k + 1, FW.grassDD)
  g.ellipse(x, y - 3, (w / 2) * k, 4 * k + 1, FW.grass)
  g.ellipse(x - 2, y - 4, (w / 3) * k, 2 * k + 0.5, '#86c95f')
  if (k > 0.4) {
    // Haystack.
    g.ellipse(x + w / 3 - 2, y - 5, 4, 4, '#e0c07a')
    g.px(x + w / 3 - 3, y - 7, '#fff3a6')
  }
}

/** Water surface rectangle with a lighter rim, used to "sink" things. */
/** Flood water colour: a touch darker as the level rises. */
export function waterTint(level: number): string {
  return mix(FW.water, FW.waterD, Math.max(0, Math.min(1, level)) * 0.35)
}

export function waterBand(g: Surface, x: number, y: number, w: number, h: number, t: number, tint: string = FW.water) {
  if (h <= 0) return
  g.rect(x, y, w, h, tint)
  g.rect(x, y, w, 1, FW.waterHi)
  for (let k = 0; k < w; k += 5) {
    const o = Math.floor(t * 3 + k) % 5
    g.px(x + k + o, y + 1, FW.waterL)
  }
}

/**
 * A house with the flood water drawn over its lower part. `cover` is how
 * much of the body (0..1) is under water.
 */
export function drawHouse(g: Surface, h: House, cover: number, t: number, level = 0, sign?: CanvasImageSource & { width: number; height: number }) {
  const x0 = Math.round(h.x - h.w / 2)
  const y = Math.round(h.y)
  const geo = houseGeom(h.style)
  // Reflection / shadow on the water.
  g.ditherCircle(h.x, y + 2, h.w / 2 + 3, FW.waterDD, 0.6, 0.3)
  if (h.style === 'mound') {
    drawMound(g, h.x, y, h.w, cover)
    return
  }
  if (h.style === 'shop') drawShop(g, x0, y, h.w, sign)
  else if (h.style === 'tuktuk') drawTuktuk(g, x0, y, h.w)
  else if (h.style === 'shed') drawShed(g, x0, y, h.w)
  else drawStilt(g, x0, y, h.w, h.tone, h.style === 'hut')
  const wh = Math.round(geo.start + (geo.body - geo.start) * cover)
  waterBand(g, x0 - 3, y - wh, h.w + 6, wh + 2, t + h.id, waterTint(level))
  // Ripples hugging the walls.
  const f = Math.floor(t * 4 + h.id) % 3
  g.px(x0 - 4 - f, y - wh + 1, FW.foam)
  g.px(x0 + h.w + 3 + f, y - wh + 1, FW.foam)
}

// ---------------------------------------------------------------------------
// Things in the water

export function drawObstacle(g: Surface, o: Obstacle, t: number) {
  const x = Math.round(o.x)
  const y = Math.round(o.y)
  g.ditherCircle(x, y + 1, o.r + 2, FW.waterDD, 0.7, 0.4)
  if (o.kind === 'pole') {
    g.rect(x - 1, y - 30, 3, 31, '#bdb2ae')
    g.rect(x - 1, y - 30, 1, 31, '#e4ddd6')
    g.rect(x - 6, y - 27, 13, 2, '#8c8187')
    g.px(x - 6, y - 28, '#5a8de0')
    g.px(x + 6, y - 28, '#5a8de0')
    g.rect(x - 2, y - 20, 5, 4, '#625867')
  } else if (o.kind === 'palm') {
    const sway = Math.round(Math.sin(t * 1.3 + o.x) * 1.5)
    g.rect(x - 1, y - 12, 3, 13, '#8a6440')
    for (let k = 0; k < 12; k += 3) g.rect(x - 1, y - k, 3, 1, '#6e4a35')
    const cx = x + sway
    const cy = y - 13
    for (const [dx, dy] of [
      [-9, 2],
      [9, 2],
      [-7, -4],
      [7, -4],
      [0, -7],
      [-4, 5],
      [4, 5],
    ])
      g.thickLine(cx, cy, cx + dx, cy + dy, 2, dy > 3 ? '#2f6f4b' : '#43905a')
    g.circle(cx - 1, cy + 1, 1.5, '#6e4a35')
    g.circle(cx + 1, cy + 1, 1.5, '#8a6440')
  } else if (o.kind === 'banana') {
    const sway = Math.round(Math.sin(t * 1.1 + o.y) * 1)
    g.rect(x - 1, y - 6, 2, 7, '#86a45a')
    for (const [dx, dy, c] of [
      [-8, -6, '#5ea653'],
      [8, -7, '#43905a'],
      [-5, -12, '#86c95f'],
      [5, -12, '#5ea653'],
    ] as [number, number, string][])
      g.thickLine(x, y - 6, x + dx + sway, y + dy, 3, c)
  } else {
    g.rect(x - 1, y - 12, 2, 13, '#6e4a35')
    g.rect(x - 7, y - 16, 14, 7, '#fffaf0')
  }
  const r = Math.floor(t * 2 + o.x) % 3
  g.hline(x - o.r - r, x + o.r + r, y + 1, FW.foam)
}

export function drawDebris(g: Surface, d: Debris, t: number) {
  const x = Math.round(d.x)
  const y = Math.round(d.y + Math.sin(t * 2 + d.id) * 1)
  g.ditherCircle(x, y + 2, d.r + 2, FW.waterDD, 0.7, 0.4)
  switch (d.kind) {
    case 'log':
      g.rect(x - 8, y - 2, 16, 5, '#8a6440')
      g.rect(x - 8, y - 2, 16, 1, '#b58a5a')
      g.ellipse(x + 8, y + 0.5, 2, 2.5, '#d8b07a')
      g.px(x + 8, y, '#8a6440')
      g.px(x - 3, y + 1, '#6e4a35')
      break
    case 'tire':
      g.circle(x, y, 4.5, '#2a2830')
      g.circle(x, y, 2, FW.waterD)
      g.px(x - 3, y - 2, '#5a5563')
      break
    case 'fridge':
      g.rect(x - 5, y - 6, 10, 10, '#f2efe6')
      g.rect(x - 5, y - 6, 10, 1, '#ffffff')
      g.rect(x - 5, y - 1, 10, 1, '#bdb2ae')
      g.rect(x + 2, y - 4, 1, 2, '#8c8187')
      g.rect(x + 2, y + 1, 1, 2, '#8c8187')
      break
    case 'sofa':
      g.rect(x - 7, y - 4, 14, 7, '#b8343f')
      g.rect(x - 7, y - 5, 14, 3, '#e8514a')
      g.rect(x - 8, y - 3, 2, 6, '#7e2436')
      g.rect(x + 6, y - 3, 2, 6, '#7e2436')
      break
    default:
      g.rect(x - 4, y - 5, 8, 9, '#3d63b5')
      g.rect(x - 4, y - 3, 8, 1, '#5a8de0')
      g.rect(x - 4, y + 1, 8, 1, '#5a8de0')
  }
  waterBand(g, x - d.r - 2, y + 2, d.r * 2 + 4, 2, t)
}

export function drawFloaty(g: Surface, f: Floaty, t: number) {
  const x = Math.round(f.x)
  const y = Math.round(f.y + Math.sin(t * 2.4 + f.ph) * 1)
  g.ditherCircle(x, y + 2, 5, FW.waterDD, 0.6, 0.4)
  if (f.kind === 'ring') {
    g.ellipse(x, y, 5, 3.5, '#ff9fc0')
    g.ellipse(x, y, 2, 1.3, FW.waterD)
    g.px(x - 4, y - 1, '#fffaf0')
    g.px(x + 3, y + 2, '#fffaf0')
  } else if (f.kind === 'bowl') {
    // ขัน: silver bowl with a gold rim.
    g.ellipse(x, y, 5, 3, '#bdb2ae')
    g.ellipse(x, y - 1, 4, 2, '#e4ddd6')
    g.ellipse(x, y - 1, 2.5, 1, '#8c8187')
    g.hline(x - 4, x + 4, y - 3, '#e9a53a')
  } else if (f.kind === 'duck') {
    g.ellipse(x, y, 4, 3, '#ffd54f')
    g.circle(x + 2, y - 3, 2, '#ffd54f')
    g.px(x + 4, y - 3, '#f58f35')
    g.px(x + 5, y - 3, '#f58f35')
    g.px(x + 2, y - 4, OUT)
    g.px(x - 3, y - 2, '#fff3a6')
  } else {
    g.rect(x - 4, y - 3, 8, 5, '#e8514a')
    g.rect(x - 4, y - 6, 8, 3, '#b8343f')
    g.px(x - 3, y - 5, '#ff8a7a')
  }
  waterBand(g, x - 6, y + 2, 12, 1, t + f.ph)
}

/** Floaty under a drifting survivor. */
export function drawRaft(g: Surface, x: number, y: number, kind: 'ring' | 'basin' | 'door' | 'basket') {
  if (kind === 'ring') {
    g.ellipse(x, y, 7, 3.5, '#f58f35')
    g.ellipse(x, y, 4, 1.8, FW.waterD)
    g.px(x - 6, y - 1, '#fffaf0')
    g.px(x + 5, y + 1, '#fffaf0')
  } else if (kind === 'basin') {
    g.ellipse(x, y, 7, 3.5, '#bdb2ae')
    g.ellipse(x, y - 1, 6, 2.5, '#e4ddd6')
  } else if (kind === 'door') {
    g.rect(x - 7, y - 3, 14, 6, '#9a6a45')
    g.rect(x - 7, y - 3, 14, 1, '#c28e5c')
    g.px(x + 4, y, '#ffd54f')
  } else {
    g.ellipse(x, y, 8, 3.5, '#c9a45a')
    for (let k = -6; k <= 6; k += 3) g.vline(x + k, y - 2, y + 2, '#a8843e')
  }
}

export function drawPower(g: Surface, p: PowerUp, t: number) {
  const x = Math.round(p.x)
  const y = Math.round(p.y + Math.sin(t * 3 + p.id) * 1.5)
  const blink = p.life - p.t < 3 && Math.floor(t * 8) % 2 === 0
  if (blink) return
  // Glow ring.
  const r = 8 + Math.sin(t * 5) * 1
  g.ditherCircle(x, y, r, '#fff3a6', 0.5)
  if (p.kind === 'rice') {
    // ข้าวกล่อง: white foam box, rice and a basil leaf.
    g.rect(x - 5, y - 3, 10, 6, '#fffaf0')
    g.rect(x - 5, y - 4, 10, 2, '#e4ddd6')
    g.rect(x - 3, y - 3, 6, 2, '#fff1d6')
    g.px(x + 1, y - 3, '#43905a')
    g.px(x - 1, y - 2, '#e8514a')
    g.rect(x - 5, y + 2, 10, 1, '#bdb2ae')
  } else if (p.kind === 'dog') {
    const s = rescueDogSprite(Math.floor(t * 4))
    g.draw(s.canvas, x - Math.floor(s.w / 2), y - Math.floor(s.h / 2))
  } else {
    g.ellipse(x, y, 6, 4, '#f58f35')
    g.ellipse(x, y, 3, 1.8, FW.waterD)
    g.rect(x - 6, y - 1, 2, 2, '#fffaf0')
    g.rect(x + 4, y - 1, 2, 2, '#fffaf0')
  }
}

export function drawLizard(g: Surface, lz: Lizard, t: number) {
  // ตัวเงินตัวทอง swimming: long dark body with yellow spots.
  const x = Math.round(lz.x)
  const y = Math.round(lz.y)
  const d = lz.dir
  const w = Math.sin(t * 8) * 1.5
  g.ditherCircle(x, y + 1, 8, FW.waterDD, 0.5, 0.3)
  for (let k = 0; k < 14; k++) {
    const xx = x - d * k
    const yy = y + Math.round(Math.sin(t * 8 - k * 0.6) * (k / 7))
    g.rect(xx, yy, 1, k < 9 ? 3 : 2, k % 3 === 1 && k < 9 ? '#d6c24a' : '#4a5a3a')
  }
  g.rect(x + d * 1, y, 3 * d, 2, '#4a5a3a')
  g.px(x + d * 2, y, '#e8e060')
  g.px(x + d * 4, y + 1, '#e8514a')
  g.px(x - d * 3, y + 3 + Math.round(w), '#4a5a3a')
  g.px(x - d * 6, y - 1 - Math.round(w), '#4a5a3a')
  g.hline(x - d * 14, x + d * 3, y + 3, FW.waterHi)
}

// ---------------------------------------------------------------------------
// Water, currents and the temple hill

/** Animated water for the visible part of the world. */
export function drawWater(g: Surface, x0: number, y0: number, w: number, h: number, t: number, lanes: Lane[], level: number) {
  g.rect(x0, y0, w, h, waterTint(level))
  // Sparse ripple glints on a stable pseudo-random grid.
  const y1 = y0 + h
  for (let gy = Math.floor(y0 / 9) * 9; gy < y1; gy += 9) {
    for (let gx = 0; gx < w; gx += 13) {
      const hsh = ((gx * 73856093) ^ (gy * 19349663)) >>> 0
      const ph = (hsh % 1000) / 1000
      const k = (t * 0.6 + ph) % 1
      if (k > 0.6) continue
      const xx = gx + (hsh % 11)
      const yy = gy + ((hsh >> 5) % 7)
      if (yy < y0 || yy >= y1) continue
      const len = k < 0.3 ? 2 : 3
      g.hline(xx, xx + len, yy, k < 0.15 ? FW.waterHi : FW.waterL)
    }
  }
  // Currents: moving streaks and chevrons.
  for (const ln of lanes) {
    if (ln.y + ln.h < y0 || ln.y - ln.h > y1) continue
    g.dither(0, ln.y - ln.h / 2, w, ln.h, null, FW.lane, 0.35)
    for (let k = 0; k < 9; k++) {
      const row = ln.y - ln.h / 2 + 3 + ((k * 7) % Math.max(1, ln.h - 5))
      const len = 6 + ((k * 5) % 7)
      const speed = ln.speed * (0.8 + (k % 3) * 0.2)
      const span = w + 30
      let x = ((k * 53 + t * speed * ln.dir) % span + span) % span - 15
      g.hline(x, x + len, row, k % 2 ? FW.waterHi : FW.foam)
    }
    for (let k = 0; k < 4; k++) {
      const span = w + 20
      const cx = ((k * (span / 4) + t * ln.speed * 0.6 * ln.dir) % span + span) % span - 10
      const cy = ln.y
      const c = '#b8bc92'
      g.px(cx, cy - 2, c)
      g.px(cx + ln.dir, cy - 1, c)
      g.px(cx + 2 * ln.dir, cy, c)
      g.px(cx + ln.dir, cy + 1, c)
      g.px(cx, cy + 2, c)
    }
  }
}

/** Sky, hill and the temple (ศูนย์พักพิงวัด) – world rows 0..shoreY+6. */
export function bakeHill(w: number, shoreY: number): HTMLCanvasElement {
  const H = shoreY + 8
  return bake(w, H, (g) => {
    g.gradientV(0, 0, w, 44, [FW.sky0, FW.sky1, FW.sky2], 5)
    // Storm clouds.
    for (let k = 0; k < 7; k++) {
      const cx = ((k * 41) % (w + 20)) - 10
      g.ellipse(cx, 8 + (k % 3) * 5, 18, 6, FW.cloud)
      g.ellipse(cx + 8, 6 + (k % 2) * 4, 12, 5, '#3a4260')
    }
    // Far trees.
    for (let x = 0; x < w; x += 7) g.ellipse(x + 3, 42, 6, 4 + ((x * 7) % 3), '#34604a')
    // Hill down to a muddy bank; below the bank stays transparent for the water.
    for (let x = 0; x < w; x += 2) {
      const yy = shoreY - 4 + Math.round(Math.sin(x * 0.21) * 1.5 + Math.sin(x * 0.07) * 1.5)
      g.rect(x, 44, 2, yy - 44, FW.grass)
      g.rect(x, yy, 2, 4, FW.dirt)
      g.rect(x, yy, 2, 1, FW.grassDD)
      g.rect(x, yy + 3, 2, 1, FW.dirtD)
    }
    g.dither(0, 44, w, 6, null, FW.grassD, 0.4)
    for (let k = 0; k < 40; k++) {
      const x = (k * 37) % w
      const y = 50 + ((k * 13) % Math.max(4, shoreY - 58))
      g.px(x, y, '#86c95f')
      g.px(x + 1, y - 1, '#86c95f')
    }
    // Path and steps down to the pier.
    const cx = Math.round(w / 2)
    g.rect(cx - 5, 62, 10, shoreY - 62, '#d8c9a8')
    for (let y = 66; y < shoreY; y += 4) g.rect(cx - 5, y, 10, 1, '#b8a888')
    // Temple (โบสถ์): white base, two-tier red roof, gold chofa.
    const tx = cx - 22
    g.rect(tx, 40, 44, 22, '#f2efe6')
    g.rect(tx, 58, 44, 4, '#d8d1c8')
    for (let k = 0; k < 4; k++) g.rect(tx + 5 + k * 10, 46, 4, 9, '#b8343f')
    g.rect(cx - 4, 47, 8, 11, '#e9a53a')
    g.rect(cx - 3, 48, 6, 10, '#b8742a')
    g.poly(
      [
        [tx - 5, 42],
        [tx + 6, 26],
        [tx + 38, 26],
        [tx + 49, 42],
      ],
      '#c0392b',
    )
    g.poly(
      [
        [tx + 2, 30],
        [tx + 12, 16],
        [tx + 32, 16],
        [tx + 42, 30],
      ],
      '#e8514a',
    )
    g.rect(tx - 5, 41, 54, 2, '#e9a53a')
    g.rect(tx + 2, 29, 40, 2, '#e9a53a')
    g.poly(
      [
        [cx - 9, 26],
        [cx, 12],
        [cx + 9, 26],
      ],
      '#ffd54f',
    )
    g.poly(
      [
        [cx - 6, 25],
        [cx, 16],
        [cx + 6, 25],
      ],
      '#e9a53a',
    )
    g.px(cx, 10, '#ffd54f')
    g.px(cx, 11, '#ffd54f')
    g.px(tx - 6, 40, '#ffd54f')
    g.px(tx + 50, 40, '#ffd54f')
    g.px(tx + 12, 14, '#ffd54f')
    g.px(tx + 31, 14, '#ffd54f')
    // Relief tents (blue tarp with a red cross) either side.
    for (const [x, dir] of [
      [8, 1],
      [w - 32, -1],
    ] as [number, number][]) {
      g.poly(
        [
          [x, 66],
          [x + 12, 56],
          [x + 24, 66],
        ],
        '#3d63b5',
      )
      g.rect(x + 1, 66, 22, 8, '#5a8de0')
      g.rect(x + 1, 66, 22, 1, '#2f4f8f')
      g.rect(x + 10, 68, 4, 1, '#e8514a')
      g.rect(x + 11, 67, 2, 3, '#e8514a')
      g.vline(x + (dir > 0 ? 1 : 22), 66, 74, '#2f4f8f')
    }
    // Pier.
    g.rect(cx - 8, shoreY - 2, 16, 10, '#9a6a45')
    for (let x = cx - 8; x < cx + 8; x += 3) g.vline(x, shoreY - 2, shoreY + 7, '#6e4a35')
    g.rect(cx - 8, shoreY - 2, 16, 1, '#c28e5c')
  })
}

/** A small monk waving at the pier (welcomes each boat). */
export function monkSprite(frame: number): Sprite {
  return spr(`monk:${frame & 1}`, 10, 13, (g) => {
    g.setCamera(-1, -1)
    g.rect(2, 0, 5, 4, SKIN[1])
    g.px(3, 2, OUT)
    g.px(5, 2, OUT)
    g.px(4, 3, '#c0504a')
    g.rect(1, 4, 7, 7, '#e9892e')
    g.rect(1, 4, 3, 7, '#f5a54a')
    g.rect(2, 11, 2, 1, SKIN[1])
    g.rect(5, 11, 2, 1, SKIN[1])
    if (frame & 1) {
      g.px(8, 4, SKIN[1])
      g.px(8, 3, SKIN[1])
      g.px(9, 2, SKIN[1])
    } else g.vline(8, 2, 5, SKIN[1])
  })
}

// ---------------------------------------------------------------------------
// The boat (top-down hull, rotated; crew and passengers stay upright)

const HULL: [number, number][] = [
  [14, 0],
  [9, -6],
  [-11, -6],
  [-14, -4],
  [-14, 4],
  [-11, 6],
  [9, 6],
]

function rot(pts: [number, number][], x: number, y: number, a: number, s = 1): [number, number][] {
  const c = Math.cos(a)
  const n = Math.sin(a)
  // Squash vertically a touch for the 3/4 view.
  return pts.map(([px, py]) => [x + (px * c - py * n) * s, y + (px * n + py * c) * s * 0.8])
}

/** Hull, wake and motor. Returns seat positions (bow → stern) for passengers. */
export function drawHull(g: Surface, x: number, y: number, a: number, t: number, moving: number): [number, number][] {
  g.ditherCircle(x, y + 3, 15, FW.waterDD, 0.6, 0.45)
  g.poly(rot(HULL, x, y + 1, a, 1.14), OUT)
  g.poly(rot(HULL, x, y, a, 1.06), '#f58f35')
  g.poly(rot(HULL, x, y, a, 0.9), '#fffaf0')
  g.poly(rot(HULL, x, y, a, 0.76), '#d9cdb4')
  // Benches.
  for (const bx of [4, -3]) {
    const b = rot(
      [
        [bx - 1, -5],
        [bx + 1, -5],
        [bx + 1, 5],
        [bx - 1, 5],
      ],
      x,
      y,
      a,
    )
    g.poly(b, '#9a6a45')
  }
  // Motor at the stern.
  const [mx, my] = rot([[-16, 0]], x, y, a)[0]
  g.rect(mx - 2, my - 3, 4, 5, '#3a3f4f')
  g.rect(mx - 2, my - 3, 4, 1, '#5a6070')
  if (moving > 8) {
    const k = Math.floor(t * 12) % 2
    g.px(mx - Math.cos(a) * 4, my - Math.sin(a) * 3 + k, FW.foam)
  }
  return [-1, -1, -1].map((_, i) => rot([[7 - i * 7, 0]], x, y, a)[0]) as [number, number][]
}

/** Bow position (for the rescue dog rope while boosting). */
export function bowOf(x: number, y: number, a: number): [number, number] {
  return rot([[17, 0]], x, y, a)[0]
}

/** Seat k (0 = bow) position; seats past the third squeeze in along the rim. */
export function seatPos(x: number, y: number, a: number, k: number): [number, number] {
  const along = [8, 2, -4, -9, 5, -1][k % 6]
  const side = k >= 4 ? (k === 4 ? -3 : 3) : 0
  return rot([[along, side]], x, y, a)[0]
}

// ---------------------------------------------------------------------------
// Hub banner

export function floodBanner(w: number, h: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    g.gradientV(0, 0, w, h * 0.55, ['#2d3349', '#4a5570', '#7a849a'], 5)
    for (let k = 0; k < 8; k++) g.ellipse(((k * 29) % (w + 20)) - 5, 6 + (k % 3) * 5, 16, 6, '#262b3f')
    // Lightning bolt.
    g.thickLine(w * 0.78, 0, w * 0.74, 12, 2, '#fff3a6')
    g.thickLine(w * 0.74, 12, w * 0.8, 14, 2, '#fff3a6')
    g.thickLine(w * 0.8, 14, w * 0.75, 26, 1.5, '#fff3a6')
    // Temple on the far hill.
    g.ellipse(w * 0.84, h * 0.56, w * 0.24, 10, '#43905a')
    g.rect(w * 0.8, h * 0.36, 16, 10, '#f2efe6')
    g.poly(
      [
        [w * 0.8 - 3, h * 0.37],
        [w * 0.8 + 8, h * 0.24],
        [w * 0.8 + 19, h * 0.37],
      ],
      '#e8514a',
    )
    // Water.
    const wy = Math.round(h * 0.55)
    g.rect(0, wy, w, h - wy, FW.water)
    for (let k = 0; k < 30; k++) g.hline((k * 37) % w, ((k * 37) % w) + 3, wy + 3 + ((k * 11) % (h - wy - 4)), k % 3 ? FW.waterL : FW.waterHi)
    // Houses half under water.
    const hs: [number, number, number][] = [
      [10, wy + 6, 0],
      [44, wy + 10, 1],
      [118, wy + 8, 2],
    ]
    for (const [x, y, tone] of hs) {
      drawStilt(g, x, y, 26, tone, tone === 1)
      waterBand(g, x - 3, y - 14, 32, 16, tone)
    }
    // A cat on a roof and a kid waving.
    const catS = survivorSprite('cat', 0)
    g.draw(catS.canvas, 16, wy + 6 - 33 - catS.h + 2)
    const kid = survivorSprite('kid', 1)
    g.draw(kid.canvas, 124, wy + 8 - 33 - kid.h + 2)
    // The rescue boat.
    const bx = Math.round(w * 0.46)
    const by = Math.round(h * 0.8)
    drawHull(g, bx, by, -0.25, 0, 20)
    const crew = rescuerSprite(0)
    const [sx, sy] = seatPos(bx, by, -0.25, 3)
    g.draw(crew.canvas, Math.round(sx - crew.w / 2), Math.round(sy - crew.h + 3))
    const dogS = survivorSprite('dog', 1)
    const [dx, dy] = seatPos(bx, by, -0.25, 0)
    g.draw(dogS.canvas, Math.round(dx - dogS.w / 2), Math.round(dy - dogS.h + 3))
    // Floating duck and ring.
    drawFloaty(g, { id: 1, kind: 'duck', x: w * 0.22, y: h * 0.86, vx: 0, vy: 0, ph: 0 }, 0)
    drawFloaty(g, { id: 2, kind: 'ring', x: w * 0.7, y: h * 0.9, vx: 0, vy: 0, ph: 1 }, 0)
    // Rain.
    for (let k = 0; k < 70; k++) {
      const x = (k * 53) % w
      const y = (k * 29) % h
      g.line(x, y, x - 2, y + 4, 'rgba(210,225,240,0.55)')
    }
  })
}
