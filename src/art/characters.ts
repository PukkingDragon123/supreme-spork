// Non-player characters: monks, novices, temple dogs, cats and birds.

import { createCanvas } from '../engine/pixel'
import { cached, makeSprite, outlineCanvas, type Sprite } from '../engine/sprite'
import { P, SKIN_TONES } from './palette'

const HEADROOM = 4

function paintInto(ctx: CanvasRenderingContext2D, rows: string[], oy: number, pal: Record<string, string>, ox = 0) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const k = row[x]
      if (k === '.' || k === ' ') continue
      const c = pal[k]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(x + ox, y + oy, 1, 1)
    }
  }
}

function flipCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height)
  const ctx = c.getContext('2d')!
  ctx.translate(src.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(src, 0, 0)
  return c
}

// ---------------------------------------------------------------------------
// Monks (พระ) and novices (เณร)

const MONK_HEAD_FRONT = [
  '....qqqqqqqq....',
  '...qQQqqqqqqq...',
  '..qQqqqqqqqqqq..',
  '..qqqqqqqqqqqd..',
  '..sssssssssssd..',
  '..sssssssssssd..',
  '..ssssssssssss..',
  '..ssEEssssEEsd..',
  '..sBBssssssBBd..',
  '...ssssmmsssd...',
  '....sssssssd....',
]
const MONK_HEAD_SIDE = [
  '....qqqqqqqq....',
  '...qQQqqqqqqq...',
  '..qQqqqqqqqqqq..',
  '..qqqqqqqqqqqq..',
  '..ssssssssssss..',
  '..ssssddssssss..',
  '..ssssdsssssss..',
  '..sssssssssEEs..',
  '..dssssssBBsss..',
  '...dssssssssm...',
  '....dsssssss....',
]
const MONK_HEAD_BACK = [
  '....qqqqqqqq....',
  '...qQQqqqqqqq...',
  '..qQqqqqqqqqqq..',
  '..qqqqqqqqqqqq..',
  '..qqqqqqqqqqqq..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '...sssssssssd...',
  '....ddssssdd....',
]

// Robe draped over both shoulders (ห่มคลุม) for the alms round.
const ROBE_FRONT = [
  '....ooofCooo....',
  '...ooooffoooO...',
  '...oooooffooO...',
  '...ooooooffoO...',
  '...oooooooofO...',
  '...ooooooooOO...',
  '...ooooooooOO...',
  '...ooooooooOO...',
  '....oooooooO....',
]
const ROBE_SIDE = [
  '.....ooooooC....',
  '....ooooofooo...',
  '....oooofooooo..',
  '....ooofoooooo..',
  '....oofooooooo..',
  '....ooooooooOO..',
  '....ooooooooO...',
  '....ooooooooO...',
  '.....oooooooO...',
]
const ROBE_BACK = [
  '....oooooooo....',
  '...oooooooooO...',
  '...ofoooooooO...',
  '...oofooooooO...',
  '...ooofoooooO...',
  '...oooofooooO...',
  '...ooooofoooO...',
  '...ooooooooOO...',
  '....oooooooO....',
]
const MONK_FEET: Record<string, string> = {
  front: '....FFF..FFF....',
  side: '.....FFFFF......',
  walk1: '...FFF...FFF....',
  walk2: '.....FFFFF......',
}

// The alms bowl (บาตร) held at the belly.
const BOWL_FRONT = ['....HkkkkkkH....', '.....kKkkkk.....', '......kkkk......']
const BOWL_FRONT_OPEN = ['....HrrrrrrH....', '.....kKkkkk.....', '......kkkk......']
const BOWL_SIDE = ['..........Hkkk..', '.........kKkkkk.', '..........kkkk..']
const BOWL_SIDE_OPEN = ['..........Hrrr..', '.........kKkkkk.', '..........kkkk..']

export type MonkPose = 'stand' | 'walk1' | 'walk2' | 'receive' | 'bless'

export function monkSprite(view: 'front' | 'side' | 'back', pose: MonkPose, opts: { novice?: boolean; skin?: number; flip?: boolean } = {}): Sprite {
  const key = `monk:${view}:${pose}:${opts.novice ? 1 : 0}:${opts.skin ?? 2}:${opts.flip ? 1 : 0}`
  return cached(key, () => {
    const skin = SKIN_TONES[opts.skin ?? 2]
    const c = createCanvas(16, 27)
    const ctx = c.getContext('2d')!
    const pal: Record<string, string> = {
      s: skin.b,
      d: skin.d,
      q: mixHex(skin.b, '#b7a9c9', 0.22),
      Q: mixHex(skin.l, '#ffffff', 0.25),
      E: P.ink,
      e: '#fffaf0',
      B: opts.novice ? P.blush : mixHex(skin.b, P.blush, 0.45),
      m: '#b8606a',
      o: '#ee9136',
      O: '#c7661f',
      f: '#d87a28',
      C: skin.b,
      F: skin.d,
      H: skin.b,
      k: '#3d3445',
      K: '#6d6478',
      r: '#fffaf0',
    }
    const bob = pose === 'walk2' ? -1 : 0
    const y0 = HEADROOM + 2 + bob
    const head = view === 'front' ? MONK_HEAD_FRONT : view === 'side' ? MONK_HEAD_SIDE : MONK_HEAD_BACK
    const robe = view === 'front' ? ROBE_FRONT : view === 'side' ? ROBE_SIDE : ROBE_BACK
    const feet = view === 'side' ? (pose === 'walk1' ? MONK_FEET.walk1 : pose === 'walk2' ? MONK_FEET.walk2 : MONK_FEET.side) : MONK_FEET.front
    paintInto(ctx, [feet], HEADROOM + 22, pal)
    paintInto(ctx, robe, HEADROOM + 13 + bob, pal)
    if (view !== 'back') {
      const open = pose === 'receive'
      const bowl = view === 'front' ? (open ? BOWL_FRONT_OPEN : BOWL_FRONT) : open ? BOWL_SIDE_OPEN : BOWL_SIDE
      paintInto(ctx, bowl, HEADROOM + 16 + bob, pal)
      if (pose === 'bless' && view === 'front') {
        // Hands raised together for the blessing.
        paintInto(ctx, ['.......HH.......', '.......HH.......'], HEADROOM + 13, pal)
      }
    }
    paintInto(ctx, head, y0, pal)
    let out = outlineCanvas(c, P.ink)
    if (opts.novice) out = shrink(out)
    if (opts.flip) return { canvas: flipCanvas(out.canvas), w: out.w, h: out.h }
    return out
  })
}

/** Novices are drawn a little shorter by removing two robe rows. */
function shrink(s: Sprite): Sprite {
  const c = createCanvas(s.w, s.h)
  const ctx = c.getContext('2d')!
  // Keep the top (head) and the bottom (feet), drop rows 21-22 of the robe.
  const cut = 21
  ctx.drawImage(s.canvas, 0, 0, s.w, cut, 0, 2, s.w, cut)
  ctx.drawImage(s.canvas, 0, cut + 2, s.w, s.h - cut - 2, 0, cut + 2, s.w, s.h - cut - 2)
  return { canvas: c, w: s.w, h: s.h }
}

/** Novice sweeping leaves with a coconut-rib broom (เณรกวาดลานวัด). */
export function noviceSweepSprite(frame: 0 | 1, flip = false): Sprite {
  return cached(`novice-sweep:${frame}:${flip ? 1 : 0}`, () => {
    const base = monkSprite('side', frame === 0 ? 'stand' : 'walk2', { novice: true })
    const c = createCanvas(base.w + 6, base.h)
    const ctx = c.getContext('2d')!
    ctx.drawImage(base.canvas, 0, 0)
    // Broom handle and bristles.
    const broom = frame === 0
      ? ['......w', '.....w.', '....w..', '...w...', '..w....', '.yyy...', 'yyyyy..']
      : ['.......w', '......w.', '.....w..', '....w...', '....w...', '..yyyy..', '.yyyyyy.']
    paintInto(ctx, broom, base.h - 9, { w: '#9a6a45', y: '#d9b25f' }, base.w - 4)
    const s = { canvas: c, w: c.width, h: c.height }
    return flip ? { canvas: flipCanvas(c), w: s.w, h: s.h } : s
  })
}

// ---------------------------------------------------------------------------
// Temple dogs (หมาวัด)

export interface DogCoat {
  id: string
  base: string
  dark: string
  light: string
  spot?: string
}

export const DOG_COATS: DogCoat[] = [
  { id: 'tan', base: '#e0a868', dark: '#b87c43', light: '#fbe3bf' },
  { id: 'black', base: '#4a3f55', dark: '#2f2838', light: '#8a7d96' },
  { id: 'white', base: '#fbf3e4', dark: '#dccdb6', light: '#ffffff' },
  { id: 'spotted', base: '#fbf3e4', dark: '#dccdb6', light: '#ffffff', spot: '#9a6a45' },
  { id: 'brown', base: '#9a6a45', dark: '#6e4a35', light: '#d9a57a' },
  { id: 'cream', base: '#f3d6a0', dark: '#d4ae70', light: '#fff4dc' },
]

// Side view facing right. B base, b dark, w light belly/muzzle, e eye,
// n nose, t tail, s spot, k tongue.
const DOG_STAND = [
  '..........b..b..',
  '.........bBbbBb.',
  '.........BBBBBB.',
  '.t.......BBeBBwn',
  '.tt.....bBBBwwww',
  '..tBBBBBBBBBBw..',
  '..BBsBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BwwwwwwwwwwB..',
  '..BB.B....B.BB..',
  '..ww.w....w.ww..',
]
const DOG_WALK1 = [
  '..........b..b..',
  '.........bBbbBb.',
  '.........BBBBBB.',
  '.t.......BBeBBwn',
  't.t.....bBBBwwww',
  '..tBBBBBBBBBBw..',
  '..BBsBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BwwwwwwwwwwB..',
  '.BB...B..B...BB.',
  '.ww...w..w...ww.',
]
const DOG_SIT = [
  '..........b..b..',
  '.........bBbbBb.',
  '.........BBBBBB.',
  '.........BBeBBwn',
  '........bBBBwwww',
  '......BBBBBBBw..',
  '.....BBsBBBBBB..',
  '.t..BBBBBBBwBB..',
  '.tt.BBBBBBBwBB..',
  '..tBBBBBBBBwBB..',
  '...wwwBBBBww.ww.',
]
const DOG_SIT_WAG = [
  '..........b..b..',
  '.........bBbbBb.',
  '.........BBBBBB.',
  '.........BBeBBwn',
  '........bBBBwwwk',
  '......BBBBBBBw..',
  '.....BBsBBBBBB..',
  '....BBBBBBBwBB..',
  't...BBBBBBBwBB..',
  '.ttBBBBBBBBwBB..',
  '...wwwBBBBww.ww.',
]
const DOG_SLEEP = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '....bBBBBBBb....',
  '..bBBBsBBBBBBb..',
  '.tBBBBBBBBBBbBb.',
  '.tBBBBBBBBBBBBBe',
  '..tBBBBBBBBBwwwn',
  '...wwwwwwwwwww..',
]
const DOG_EAT = [
  '................',
  '................',
  '..........b..b..',
  '.t.......bBbbBb.',
  '.tt.....bBBBBBB.',
  '..tBBBBBBBBBeBB.',
  '..BBsBBBBBBBBBw.',
  '..BBBBBBBBBBBwwn',
  '..BwwwwwwwwwwBw.',
  '..BB.B....B.BB..',
  '..ww.w....w.ww..',
]

export type DogPose = 'stand' | 'walk1' | 'sit' | 'wag' | 'sleep' | 'eat'
const DOG_MAPS: Record<DogPose, string[]> = {
  stand: DOG_STAND,
  walk1: DOG_WALK1,
  sit: DOG_SIT,
  wag: DOG_SIT_WAG,
  sleep: DOG_SLEEP,
  eat: DOG_EAT,
}

export function dogSprite(coat: DogCoat, pose: DogPose, flip = false): Sprite {
  return cached(`dog:${coat.id}:${pose}:${flip ? 1 : 0}`, () => {
    const pal = {
      B: coat.base,
      b: coat.dark,
      w: coat.light,
      t: coat.base,
      s: coat.spot ?? coat.base,
      e: P.ink,
      n: P.ink,
      k: '#ff8fa3',
    }
    const s = makeSprite(DOG_MAPS[pose], pal, { outline: P.ink })
    return flip ? { canvas: flipCanvas(s.canvas), w: s.w, h: s.h } : s
  })
}

// Big close-up dog for the feeding mini game (front view, sitting).
const BIGDOG = [
  '...bb..................bb...',
  '..bBBb................bBBb..',
  '..bBBBb..............bBBBb..',
  '..bBBBBb............bBBBBb..',
  '..bBBBBBbBBBBBBBBBBbBBBBBb..',
  '...bBBBBBBBBBBBBBBBBBBBBb...',
  '....BBBBBBBBBBBBBBBBBBBB....',
  '...BBBBBBBBBBBBBBBBBBBBBB...',
  '...BBBBBBBBBBBBBBBBBBBBBB...',
  '..BBBBBEEBBBBBBBBBBEEBBBBB..',
  '..BBBBBEeBBBBBBBBBBEeBBBBB..',
  '..BBBBBEEBBBBBBBBBBEEBBBBB..',
  '..BBBRRBBBBwwwwwwBBBBRRBBB..',
  '..BBBBBBBBwwwwwwwwBBBBBBBB..',
  '...BBBBBBwwwwnnwwwwBBBBBB...',
  '...BBBBBBwwwnnnnwwwBBBBBB...',
  '....BBBBBwwwwnnwwwwBBBBB....',
  '.....BBBBwwwMwwMwwwBBBB.....',
  '......BBBBwwwMMwwwBBBB......',
  '.......BBBBBBBBBBBBBB.......',
  '......BBBBBwwwwwwBBBBB......',
  '.....BBBBBwwwwwwwwBBBBB.....',
  '....BBBBBBwwwwwwwwBBBBBB....',
  '....BBBBBBwwwwwwwwBBBBBB....',
  '...BBBBBBBwwwwwwwwBBBBBBB...',
  '...BBBBBBBwwwwwwwwBBBBBBB...',
  '...BBwwBBBBwwwwwwBBBBwwBB...',
  '...wwwwwBBBBBBBBBBBBwwwww...',
]

export type BigDogFace = 'idle' | 'blink' | 'happy' | 'eat' | 'tongue'

export function bigDogSprite(coat: DogCoat, face: BigDogFace): Sprite {
  return cached(`bigdog:${coat.id}:${face}`, () => {
    const rows = BIGDOG.map((r) => r)
    if (face === 'blink' || face === 'happy') {
      rows[9] = '..BBBBBBBBBBBBBBBBBBBBBBBB..'
      rows[10] = '..BBBBBEEBBBBBBBBBBEEBBBBB..'
      rows[11] = '..BBBBEBBEBBBBBBBBEBBEBBBB..'
      if (face === 'blink') rows[11] = '..BBBBBBBBBBBBBBBBBBBBBBBB..'
    }
    if (face === 'tongue' || face === 'happy') {
      rows[18] = '......BBBBwwwMMwwwBBBB......'
      rows[19] = '.......BBBBBwkkwBBBBBB......'.slice(0, 28)
    }
    if (face === 'eat') {
      rows[17] = '.....BBBBwwwMMMMwwwBBBB.....'
      rows[18] = '......BBBBwwMkkMwwBBBB......'
    }
    const pal = {
      B: coat.base,
      b: coat.dark,
      w: coat.light,
      E: P.ink,
      e: '#fffaf0',
      n: P.ink,
      M: '#5a3d4f',
      R: '#ff9aa6',
      k: '#ff8fa3',
    }
    const spotRows = coat.spot
      ? rows.map((r, y) =>
          r
            .split('')
            .map((ch, x) => (ch === 'B' && ((x > 18 && x < 23 && y > 3 && y < 9) || (x > 4 && x < 9 && y > 20 && y < 25)) ? 'S' : ch))
            .join(''),
        )
      : rows
    return makeSprite(spotRows, { ...pal, S: coat.spot ?? coat.base }, { outline: P.ink })
  })
}

// ---------------------------------------------------------------------------
// Temple cat (แมววัด) and small birds.

const CAT_LOAF = ['.b...b..', '.bb.bb..', '.BBBBBt.', 'BeBBeBBt', 'BBwnwBBt', '.BBBBBB.']
const CAT_SLEEP = ['........', '........', '..bBBb..', '.BBBBBBt', 'BBBBBBBt', '.wwBBBB.']

export function catSprite(pose: 'loaf' | 'sleep', color = '#f5a55a'): Sprite {
  return cached(`cat:${pose}:${color}`, () =>
    makeSprite(pose === 'loaf' ? CAT_LOAF : CAT_SLEEP, { B: color, b: mixHex(color, '#3a2838', 0.3), t: color, w: '#fffaf0', e: P.ink, n: '#ff8fa3' }, { outline: P.ink }),
  )
}

const BIRD_A = ['.bb.', 'bbbw', '.bb.']
const BIRD_B = ['....', '.bb.', 'bbbw']
const BIRD_FLY = ['w..w', '.bb.', '.bb.']

export function birdSprite(frame: 'a' | 'b' | 'fly', color = '#9c8474'): Sprite {
  return cached(`bird:${frame}:${color}`, () =>
    makeSprite(frame === 'a' ? BIRD_A : frame === 'b' ? BIRD_B : BIRD_FLY, { b: color, w: '#f0a040' }, { outline: P.ink }),
  )
}

// ---------------------------------------------------------------------------

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t)
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t)
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)
}
