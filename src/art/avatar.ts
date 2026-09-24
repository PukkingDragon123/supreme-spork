// Layered chibi avatar. Body parts are authored once as region-coded pixel
// maps; clothing items only supply colours, sleeve types and patterns, so a
// handful of maps produce every outfit in every pose.

import { createCanvas } from '../engine/pixel'
import { cached, outlineCanvas, paintRows, type Sprite } from '../engine/sprite'
import { HAIR_COLORS, P, SKIN_TONES } from './palette'
import { OUTFIT_BY_ID, type BottomArt, type Pattern, type TopArt } from '../game/data/outfits'

export interface AvatarLook {
  skin: number
  hairColor: number
  hair: string
  top: string
  bottom: string
  head?: string | null
  neck?: string | null
  hand?: string | null
}

export type View = 'front' | 'back' | 'side'
export type Pose = 'stand' | 'walk1' | 'walk2' | 'pass' | 'wai' | 'kneel' | 'bow' | 'sit' | 'offer' | 'happy'

export const FRAME_W = 16
export const FRAME_H = 27
/** Rows of empty space above the head for buns and hats. */
const HEADROOM = 4

export const DEFAULT_LOOK: AvatarLook = {
  skin: 1,
  hairColor: 0,
  hair: 'hair_bob',
  top: 'top_white',
  bottom: 'bot_khaki',
  head: null,
  neck: null,
  hand: null,
}

// ---------------------------------------------------------------------------
// Head (skin + face). Rows are in body coordinates (head top = row 0).

const HEAD_FRONT = [
  '................',
  '................',
  '....ssssssss....',
  '...ssssssssss...',
  '..ssssssssssss..',
  '..sssssssssssd..',
  '..sssssssssssd..',
  '..sssssssssssd..',
  '..sseEsssseEsd..',
  '..ssEEssssEEsd..',
  '..sBBssssssBBd..',
  '...ssssmmsssd...',
  '....sssssssd....',
]

const HEAD_FRONT_CLOSED = [
  '................',
  '................',
  '....ssssssss....',
  '...ssssssssss...',
  '..ssssssssssss..',
  '..sssssssssssd..',
  '..sssssssssssd..',
  '..sssssssssssd..',
  '..ssssssssssss..',
  '..ssEEssssEEsd..',
  '..sBBssssssBBd..',
  '...ssssmmsssd...',
  '....sssssssd....',
]

const HEAD_SIDE = [
  '................',
  '................',
  '....ssssssss....',
  '...ssssssssss...',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssddsseEss..',
  '..ssssdsssEEss..',
  '..dssssssBBsss..',
  '...dssssssssm...',
  '....dsssssss....',
]

const HEAD_BACK = [
  '................',
  '................',
  '....ssssssss....',
  '...ssssssssss...',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '...sssssssssd...',
  '....ddssssdd....',
]

// ---------------------------------------------------------------------------
// Hair. h = base, H = highlight, d = dark, x = skin shadow, r = ribbon,
// w = jasmine white, g = leaf green. Maps may start above row 0 (see `y`).

interface HairSet {
  front: { y: number; rows: string[] }
  back: { y: number; rows: string[] }
  side: { y: number; rows: string[] }
  /** Drawn behind the body in front view (long hair). */
  behind?: { y: number; rows: string[] }
  behindSide?: { y: number; rows: string[] }
}

const HAIR: Record<string, HairSet> = {
  bob: {
    front: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhxxhxxhxxhhd.',
        '.dhh........hhd.',
        '.dh..........hd.',
        '.dh..........hd.',
        '.dd..........dd.',
      ],
    },
    back: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhdhhhhhhhd.',
        '.dhhhhhhhhdhhhd.',
        '.ddhhhhhhhhhhdd.',
        '...dddddddddd...',
      ],
    },
    side: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhxhhhd.',
        '.dhhhhhhh.......',
        '.dhhhhhhd.......',
        '.dhhhhhd........',
        '..ddhhd.........',
      ],
    },
  },
  short: {
    front: {
      y: 0,
      rows: [
        '.......dd.......',
        '....ddhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '..dhHhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dxhhxhhxhhxd..',
        '..d..........d..',
      ],
    },
    back: {
      y: 0,
      rows: [
        '.......dd.......',
        '....ddhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..ddhhhhhhhhdd..',
        '...dddhhhhddd...',
      ],
    },
    side: {
      y: 0,
      rows: [
        '.......dd.......',
        '....ddhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '..dhhhhhhhhhhhd.',
        '..dhhhhhhhhhhhd.',
        '..dhhhhhhhhhxd..',
        '..dhhhhhdxx.xd..',
        '..dhhhd.........',
        '..dhhd..........',
        '...dd...........',
      ],
    },
  },
  long: {
    front: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhxxhxxhxxhhd.',
        '.dhh........hhd.',
        '.dhh........hhd.',
        '.dhd........dhd.',
        '.dhd........dhd.',
        '.dhd........dhd.',
      ],
    },
    behind: {
      y: 12,
      rows: [
        '.dhd........dhd.',
        '.dhhd......dhhd.',
        '.dhhd......dhhd.',
        '.dhhd......dhhd.',
        '.dhhd......dhhd.',
        '..dhd......dhd..',
        '..dd........dd..',
      ],
    },
    back: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhdhhhhhhhd.',
        '.dhhhhhhhhdhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '..dhhhhhhhhhhd..',
        '..dhhhhdhhhhhd..',
        '..dhhhhhhhhhhd..',
        '...dhhhhhhhhd...',
        '...dhhhhhhhhd...',
        '....dddddddd....',
      ],
    },
    side: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhxhhhd.',
        '.dhhhhhhh.......',
        '.dhhhhhhd.......',
        '.dhhhhhhd.......',
        '.dhhhhhd........',
        '.dhhhhhd........',
        '.dhhhhd.........',
        '.dhhhhd.........',
        '.dhhhd..........',
        '..dhhd..........',
        '..ddd...........',
      ],
    },
  },
  bun: {
    front: {
      y: -4,
      rows: [
        '......dddd......',
        '.....dhHhhd.....',
        '.....dhhhhd.....',
        '......dhhd......',
        '....ddrrrrdd....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '..dhHhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhx....xhhd..',
        '..dhx......xhd..',
        '..dh........hd..',
        '..d..........d..',
        '..d..........d..',
      ],
    },
    back: {
      y: -4,
      rows: [
        '......dddd......',
        '.....dhHhhd.....',
        '.....dhhhhd.....',
        '......dhhd......',
        '....ddrrrrdd....',
        '...dhhhhhhhhd...',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..ddhhhhhhhhdd..',
        '...ddhhhhhhdd...',
      ],
    },
    side: {
      y: -4,
      rows: [
        '....dddd........',
        '...dhHhhd.......',
        '...dhhhhd.......',
        '....dhhd........',
        '....drrrrdd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '..dhhhhhhhhhhhd.',
        '..dhhhhhhhhhhhd.',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhx....',
        '..dhhhhhd.......',
        '..dhhhhd........',
        '..dhhhd.........',
        '...dd...........',
      ],
    },
  },
  twin: {
    front: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        'rdhhhhhhhhhhhhdr',
        'hdhhxxhxxhxxhhdh',
        'hdhh........hhdh',
        'dh............hd',
        'dh............hd',
        '.d............d.',
      ],
    },
    back: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        'rdhhhhhhhhhhhhdr',
        'hdhhhhhhhhhhhhdh',
        'hdhhhhhhhhhhhhdh',
        'dhhhhhhhhhhhhhhd',
        'dh.dhhhhhhhhd.hd',
        '.d..dddddddd..d.',
      ],
    },
    side: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        'rdhhhhhhhhhhhhd.',
        'hdhhhhhhhhxhhhd.',
        'hdhhhhhhh.......',
        'dhhhhhhhd.......',
        'dh.dhhhd........',
        '.d..dd..........',
      ],
    },
  },
  jook: {
    front: {
      y: -4,
      rows: [
        '......dddd......',
        '.....dhHhhd.....',
        '.....wwgwww.....',
        '......dhhd......',
        '.....dhhhhd.....',
        '....dxxxxxxd....',
      ],
    },
    back: {
      y: -4,
      rows: [
        '......dddd......',
        '.....dhHhhd.....',
        '.....wwwgww.....',
        '......dhhd......',
        '.....dhhhhd.....',
        '....dxxxxxxd....',
      ],
    },
    side: {
      y: -4,
      rows: [
        '.....dddd.......',
        '....dhHhhd......',
        '....wwgwww......',
        '.....dhhd.......',
        '....dhhhhd......',
        '...dxxxxxxd.....',
      ],
    },
  },
}

// ---------------------------------------------------------------------------
// Torso. T = top, t = top shade, C = collar, A = upper arm, a = forearm,
// H = hand. Placed at body row 13.

const TORSO: Record<string, string[]> = {
  front: [
    '....ATTCCTTA....',
    '...AATTTTTTAA...',
    '...AATTTTTtAA...',
    '...aaTTTTTtaa...',
    '...HHTTTTTtHH...',
    '.....TTTTTt.....',
  ],
  frontWai: [
    '....ATTHHTTA....',
    '...AATTHHTTAA...',
    '...AAaaHHaaAA...',
    '...aaTTTTTtaa...',
    '.....TTTTTt.....',
    '.....TTTTTt.....',
  ],
  frontSit: [
    '....ATTCCTTA....',
    '...AATTTTTTAA...',
    '...AATTTTTtAA...',
    '...aaTTTTTtaa...',
    '....aHHTTHHa....',
    '.....TTTTTt.....',
  ],
  back: [
    '....ATTTTTTA....',
    '...AATTTTTTAA...',
    '...AATTTTTtAA...',
    '...aaTTTTTtaa...',
    '...HHTTTTTtHH...',
    '.....TTTTTt.....',
  ],
  backWai: [
    '....ATTTTTTA....',
    '...AATTTTTTAA...',
    '...aaTTTTTtaa...',
    '....aTTTTTta....',
    '.....TTTTTt.....',
    '.....TTTTTt.....',
  ],
  side: [
    '.....TTTTTC.....',
    '.....TTAATT.....',
    '.....TTAATt.....',
    '.....TTaaTt.....',
    '.....TTHHTt.....',
    '.....TTTTTt.....',
  ],
  sideFwd: [
    '.....TTTTTC.....',
    '.....TTTAAT.....',
    '.....TTTAAt.....',
    '.....TTTTaa.....',
    '.....TTTTHH.....',
    '.....TTTTTt.....',
  ],
  sideBack: [
    '.....TTTTTC.....',
    '.....TAATTT.....',
    '.....AATTTt.....',
    '....aaTTTTt.....',
    '....HHTTTTt.....',
    '.....TTTTTt.....',
  ],
  sideOffer: [
    '.....TTTTTC.....',
    '.....TTTTAAAaa..',
    '.....TTTTTTaHH..',
    '.....TTTTTt.....',
    '.....TTTTTt.....',
    '.....TTTTTt.....',
  ],
}

// Legs: W = waist, L = thigh, K = shin, F = foot. Placed at body row 19.
const LEGS: Record<string, string[]> = {
  front: ['.....WWWWWW.....', '.....LL..LL.....', '.....KK..KK.....', '....FFF..FFF....'],
  frontWalk1: ['.....WWWWWW.....', '.....LL..LL.....', '....FFF..KK.....', '.........FFF....'],
  frontWalk2: ['.....WWWWWW.....', '.....LL..LL.....', '.....KK..FFF....', '....FFF.........'],
  side: ['.....WWWWWW.....', '......LLLL......', '......KKKK......', '......FFFFF.....'],
  sideWalk1: ['.....WWWWWW.....', '.....LL..LL.....', '....KK....KK....', '...FFF....FFF...'],
  sideWalk2: ['.....WWWWWW.....', '......LLLL......', '......KKKK......', '.....FFFFF......'],
  // Kneeling seen from behind: folded thighs and bare soles.
  kneelBack: ['....WWWWWWWW....', '...FFLLLLLLFF...'],
  // Cross-legged, front view.
  sit: ['....WWWWWWWW....', '..LLLLLLLLLLLL..', '..FFKKKKKKKKFF..'],
  sitBack: ['....WWWWWWWW....', '..LLLLLLLLLLLL..', '..FF........FF..'],
}

// Prostration (กราบ) seen from behind – a small rounded mound.
const BOW_BACK = {
  hair: ['......dhhd......', '.....dhhhhd.....', '....dhHhhhhd....'],
  torso: [
    '...TTTTTTTTTT...',
    '..TTTTTTTTTTTT..',
    '..TTTTTTTTTTTt..',
    '..TTTTTTTTTTTt..',
  ],
  legs: ['..WWWWWWWWWWWW..', '..FFLLLLLLLLFF..'],
}

// ---------------------------------------------------------------------------
// Accessories.

interface AccArt {
  front?: { y: number; rows: string[] }
  back?: { y: number; rows: string[] }
  side?: { y: number; rows: string[] }
  pal: Record<string, string>
  /** Draw behind the head (e.g. hat brims are in front, bags behind). */
  layer?: 'top' | 'neck' | 'hand'
}

const ACC: Record<string, AccArt> = {
  jasmine: {
    front: { y: 5, rows: ['............ww..', '...........wyww.', '............wg..'] },
    side: { y: 5, rows: ['.....ww.........', '....wyww........', '.....wg.........'] },
    back: { y: 5, rows: ['..ww............', '.wwyw...........', '..gw............'] },
    pal: { w: '#fffaf0', y: '#ffe45e', g: '#6cc36a' },
  },
  frangipani: {
    front: { y: 3, rows: ['...........pp...', '..........pyyp..', '...........pp...'] },
    side: { y: 3, rows: ['......pp........', '.....pyyp.......', '......pp........'] },
    back: { y: 3, rows: ['...pp...........', '..pyyp..........', '...pp...........'] },
    pal: { p: '#ffb3cf', y: '#fff09a' },
  },
  ngob: {
    front: {
      y: -3,
      rows: ['.......dd.......', '.....dhhhhd.....', '...dhhhhhhhhd...', '.dhhhhhhhhhhhhd.', 'dbbbbbbbbbbbbbbd'],
    },
    side: {
      y: -3,
      rows: ['.......dd.......', '.....dhhhhd.....', '...dhhhhhhhhd...', '.dhhhhhhhhhhhhd.', 'dbbbbbbbbbbbbbbd'],
    },
    back: {
      y: -3,
      rows: ['.......dd.......', '.....dhhhhd.....', '...dhhhhhhhhd...', '.dhhhhhhhhhhhhd.', 'dbbbbbbbbbbbbbbd'],
    },
    pal: { d: '#a8733a', h: '#f0cf8a', b: '#8a5a32' },
  },
  dogears: {
    front: { y: 0, rows: ['.bb..........bb.', 'bBBb........bBBb', 'bBBb........bBBb', '.bb..........bb.'] },
    side: { y: 0, rows: ['....bb..........', '...bBBb.........', '...bBBb.........', '....bb..........'] },
    back: { y: 0, rows: ['.bb..........bb.', 'bBBb........bBBb', 'bBBb........bBBb', '.bb..........bb.'] },
    pal: { b: '#9a6a45', B: '#e0a868' },
  },
  lotus: {
    front: { y: -3, rows: ['.......pp.......', '....p.pPPp.p....', '....ppPPPPpp....', '.....gggggg.....'] },
    side: { y: -3, rows: ['......pp........', '...p.pPPp.p.....', '...ppPPPPpp.....', '....gggggg......'] },
    back: { y: -3, rows: ['.......pp.......', '....p.pPPp.p....', '....ppPPPPpp....', '.....gggggg.....'] },
    pal: { p: '#e8709e', P: '#ffc4d8', g: '#43905a' },
  },
  glasses: {
    front: { y: 7, rows: ['...kkkk..kkkk...', '...k..kkkk..k...', '...kkkk..kkkk...'] },
    side: { y: 7, rows: ['.........kkkk...', '.....kkkkk..k...', '.........kkkk...'] },
    pal: { k: '#5a3d4f' },
  },
  garland: {
    front: { y: 12, rows: ['....oy....yo....', '....oyoyoyoy....', '......oyyo......', '.......rr.......'] },
    side: { y: 12, rows: ['.....oyoyo......', '........oy......', '........yo......'] },
    back: { y: 12, rows: ['....oyoyoyoy....'] },
    pal: { o: '#f58f35', y: '#ffd23f', r: '#e8514a' },
  },
  scarf: {
    front: { y: 12, rows: ['....rbrbrbrb....', '....brbrbrbr....', '.........rb.....', '.........br.....'] },
    side: { y: 12, rows: ['.....rbrbrb.....', '.....brbrbr.....', '....rb..........'] },
    back: { y: 12, rows: ['....rbrbrbrb....', '....brbrbrbr....'] },
    pal: { r: '#e8514a', b: '#3d63b5' },
  },
  yam: {
    front: {
      y: 13,
      rows: ['.....s..........', '......s.........', '.......s........', '........s.......', '.........s......', '..........brrb..', '..........rggr..', '..........rrrr..'],
    },
    side: { y: 13, rows: ['.....s..........', '.....s..........', '.....s..........', '...brrb.........', '...rggr.........', '...rrrr.........'] },
    back: {
      y: 13,
      rows: ['..........s.....', '.........s......', '........s.......', '.......s........', '......s.........', '..brrb..........', '..rggr..........', '..rrrr..........'],
    },
    pal: { s: '#b8343f', b: '#7e2436', r: '#e8514a', g: '#ffd54f' },
  },
  umbrella: {
    front: { y: 15, rows: ['............fp..', '...........fppf.', '............ww..', '............w...'] },
    side: { y: 15, rows: ['...........fp...', '..........fppf..', '...........ww...', '...........w....'] },
    back: { y: 15, rows: ['..fp............', '.fppf...........', '..ww............', '...w............'] },
    pal: { f: '#e8709e', p: '#ffd6e0', w: '#c28e5c' },
  },
}

// ---------------------------------------------------------------------------
// Colour resolution.

function patternHit(p: Pattern | undefined, x: number, y: number): 0 | 1 | 2 {
  switch (p) {
    case 'dots':
      return (x + (y % 4 === 0 ? 0 : 2)) % 4 === 0 && y % 2 === 0 ? 1 : 0
    case 'floral':
      if ((x * 3 + y * 5) % 11 === 0) return 1
      if ((x * 3 + y * 5) % 11 === 5) return 2
      return 0
    case 'plaid':
      if (x % 3 === 0 && y % 3 === 0) return 2
      return x % 3 === 0 || y % 3 === 0 ? 1 : 0
    case 'stripes':
      return y % 2 === 0 ? 1 : 0
    case 'thai':
      return (x + y) % 3 === 0 && y % 2 === 1 ? 1 : 0
    case 'elephant':
      return (x + y * 2) % 5 === 0 ? 1 : 0
    case 'lace':
      return y % 2 === 0 && x % 2 === 0 ? 1 : 0
    case 'check':
      return (x + y) % 2 === 0 ? 1 : 0
    default:
      return 0
  }
}

interface Resolved {
  skin: (typeof SKIN_TONES)[number]
  hair: (typeof HAIR_COLORS)[number]
  top: TopArt
  bottom: BottomArt
  barefoot: boolean
}

function resolve(look: AvatarLook, barefoot: boolean): Resolved {
  const top = OUTFIT_BY_ID[look.top]?.top ?? OUTFIT_BY_ID.top_white.top!
  const bottom = OUTFIT_BY_ID[look.bottom]?.bottom ?? OUTFIT_BY_ID.bot_khaki.bottom!
  return {
    skin: SKIN_TONES[look.skin] ?? SKIN_TONES[1],
    hair: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0],
    top,
    bottom,
    barefoot,
  }
}

const SHOE = '#6e4a35'

function topColor(r: Resolved, code: string, x: number, y: number): string | null {
  const t = r.top
  switch (code) {
    case 'T':
    case 't': {
      const hit = patternHit(t.pattern, x, y)
      if (hit === 1 && t.patternColor) return t.patternColor
      if (hit === 2 && t.patternColor2) return t.patternColor2
      return code === 'T' ? t.main : t.shade
    }
    case 'C':
      return t.extra === 'buttons' ? t.main : t.trim && t.pattern !== 'plaid' ? r.skin.b : r.skin.b
    case 'A':
      return t.sleeve === 'none' ? r.skin.b : t.main
    case 'a':
      return t.sleeve === 'long' ? t.main : r.skin.b
    case 'H':
      return r.skin.b
    case 's':
      return r.skin.b
  }
  return null
}

function legColor(r: Resolved, code: string, x: number, y: number): string | null {
  const b = r.bottom
  const pat = (base: string) => {
    const hit = patternHit(b.pattern, x, y)
    return hit && b.patternColor ? b.patternColor : base
  }
  const shade = x >= 8
  switch (code) {
    case 'W':
      return pat(b.main)
    case 'L':
      if (b.kind === 'pants' || b.kind === 'loose' || b.kind === 'jong') return pat(shade ? b.shade : b.main)
      return r.skin.b
    case 'K':
      if (b.kind === 'pants' || b.kind === 'loose') return pat(shade ? b.shade : b.main)
      return r.skin.b
    case 'F':
      return r.barefoot ? r.skin.d : SHOE
  }
  return null
}

// ---------------------------------------------------------------------------
// Composition.

function paint(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  oy: number,
  color: (code: string, x: number, y: number) => string | null,
  ox = 0,
) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const k = row[x]
      if (k === '.' || k === ' ') continue
      const c = color(k, x + ox, y + oy)
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(x + ox, y + oy + HEADROOM, 1, 1)
    }
  }
}

function hairColorFn(r: Resolved, ribbon = '#e8514a') {
  return (k: string) => {
    switch (k) {
      case 'h':
        return r.hair.b
      case 'H':
        return r.hair.l
      case 'd':
        return r.hair.d
      case 'x':
        return r.skin.d
      case 'r':
        return ribbon
      case 'w':
        return '#fffaf0'
      case 'g':
        return '#6cc36a'
    }
    return null
  }
}

function headColorFn(r: Resolved) {
  return (k: string) => {
    switch (k) {
      case 's':
        return r.skin.b
      case 'd':
        return r.skin.d
      case 'E':
        return '#3a2838'
      case 'e':
        return '#fffaf0'
      case 'B':
        return P.blush
      case 'm':
        return '#c65a6a'
    }
    return null
  }
}

/** Skirt / sarong overlays for front, back and side views. */
function paintBottomOverlay(ctx: CanvasRenderingContext2D, r: Resolved, view: View, legsY: number) {
  const b = r.bottom
  const col = (x: number, y: number, base: string) => {
    const hit = patternHit(b.pattern, x, y)
    return hit && b.patternColor ? b.patternColor : base
  }
  const put = (x: number, y: number, c: string) => {
    ctx.fillStyle = c
    ctx.fillRect(x, y + HEADROOM, 1, 1)
  }
  if (b.kind === 'skirt') {
    const rows = view === 'side' ? [[5, 10], [5, 11]] : [[5, 10], [4, 11]]
    rows.forEach(([a, z], j) => {
      for (let x = a; x <= z; x++) put(x, legsY + 1 + j, col(x, legsY + 1 + j, x >= 9 ? b.shade : b.main))
    })
  } else if (b.kind === 'sarong') {
    for (let j = 1; j <= 2; j++) {
      const a = view === 'side' ? 6 : 5
      const z = view === 'side' ? 9 : 10
      for (let x = a; x <= z; x++) put(x, legsY + j, j === 2 && b.hem ? b.hem : col(x, legsY + j, x >= 9 ? b.shade : b.main))
    }
  } else if (b.kind === 'jong') {
    if (view !== 'side') {
      for (let x = 4; x <= 11; x++) put(x, legsY + 1, x >= 8 ? b.shade : b.main)
      if (b.hem) {
        put(4, legsY + 2, b.hem)
        put(5, legsY + 2, b.hem)
        put(6, legsY + 2, b.hem)
        put(9, legsY + 2, b.hem)
        put(10, legsY + 2, b.hem)
        put(11, legsY + 2, b.hem)
      }
    } else {
      for (let x = 5; x <= 10; x++) put(x, legsY + 1, b.main)
    }
  } else if (b.kind === 'loose' && view !== 'side') {
    put(4, legsY + 2, col(4, legsY + 2, b.main))
    put(11, legsY + 2, col(11, legsY + 2, b.shade))
  }
}

function paintTopExtras(ctx: CanvasRenderingContext2D, r: Resolved, view: View, pose: Pose) {
  const t = r.top
  if (!t.extra) return
  const c = t.extraColor ?? P.gold
  const put = (x: number, y: number, col = c) => {
    ctx.fillStyle = col
    ctx.fillRect(x, y + HEADROOM, 1, 1)
  }
  const Y = 13
  if (view === 'front' && pose !== 'wai') {
    switch (t.extra) {
      case 'sabai':
        for (let i = 0; i < 6; i++) {
          put(5 + i, Y + i)
          if (i < 5) put(6 + i, Y + i, i % 2 ? c : '#fff3a6')
        }
        break
      case 'buttons':
        put(7, Y + 1)
        put(7, Y + 3)
        put(7, Y + 5)
        break
      case 'overalls':
        for (let y = Y + 2; y <= Y + 5; y++) for (let x = 6; x <= 9; x++) put(x, y)
        put(5, Y)
        put(10, Y)
        put(5, Y + 1)
        put(10, Y + 1)
        put(6, Y + 2, '#ffd54f')
        put(9, Y + 2, '#ffd54f')
        break
      case 'hood':
        for (let x = 5; x <= 10; x++) put(x, Y, c)
        put(4, Y, c)
        put(11, Y, c)
        break
      case 'logo':
        put(7, Y + 2)
        put(8, Y + 2)
        put(6, Y + 3)
        put(7, Y + 3, '#fffaf0')
        put(8, Y + 3, '#fffaf0')
        put(9, Y + 3)
        break
    }
  } else if (view === 'back') {
    if (t.extra === 'hood') {
      for (let y = Y; y <= Y + 2; y++) for (let x = 6; x <= 9; x++) put(x, y, y === Y + 2 ? t.shade : c)
      put(5, Y, c)
      put(10, Y, c)
    } else if (t.extra === 'overalls') {
      put(6, Y)
      put(9, Y)
      put(6, Y + 1)
      put(9, Y + 1)
      for (let x = 6; x <= 9; x++) put(x, Y + 2)
      for (let y = Y + 3; y <= Y + 5; y++) for (let x = 5; x <= 10; x++) put(x, y)
    } else if (t.extra === 'sabai') {
      for (let i = 0; i < 6; i++) put(10 - i, Y + i)
    }
  } else if (view === 'side') {
    if (t.extra === 'sabai') {
      put(6, Y)
      put(7, Y + 1)
      put(8, Y + 2)
    } else if (t.extra === 'hood') {
      put(5, Y, c)
      put(6, Y, c)
      put(5, Y + 1, c)
    } else if (t.extra === 'overalls') {
      for (let y = Y + 2; y <= Y + 5; y++) for (let x = 7; x <= 10; x++) put(x, y)
      put(9, Y)
      put(9, Y + 1)
    } else if (t.extra === 'buttons') {
      put(10, Y + 1)
      put(10, Y + 3)
    }
  }
}

function paintAcc(ctx: CanvasRenderingContext2D, id: string | null | undefined, view: View, dy: number) {
  if (!id) return
  const item = OUTFIT_BY_ID[id]
  const art = item?.acc ? ACC[item.acc] : undefined
  if (!art) return
  const part = art[view]
  if (!part) return
  paint(ctx, part.rows, part.y + dy, (k) => art.pal[k] ?? null)
}

export interface AvatarRenderOptions {
  barefoot?: boolean
  frame?: number
}

/** Compose an avatar frame (unoutlined 16×27 canvas). */
export function composeAvatar(look: AvatarLook, view: View, pose: Pose, opts: AvatarRenderOptions = {}): HTMLCanvasElement {
  const r = resolve(look, opts.barefoot ?? false)
  const c = createCanvas(FRAME_W, FRAME_H)
  const ctx = c.getContext('2d')!
  const hairItem = OUTFIT_BY_ID[look.hair]
  const hair = HAIR[hairItem?.hair ?? 'bob'] ?? HAIR.bob
  const hcol = hairColorFn(r)
  const head = headColorFn(r)
  const tcol = (k: string, x: number, y: number) => topColor(r, k, x, y)
  const lcol = (k: string, x: number, y: number) => legColor(r, k, x, y)

  if (pose === 'bow') {
    // Prostration seen from behind.
    paint(ctx, BOW_BACK.legs, 21, lcol)
    paint(ctx, BOW_BACK.torso, 17, tcol)
    paint(ctx, BOW_BACK.hair, 14, hcol)
    return c
  }

  // Vertical offset of head+torso for lower poses.
  const low = pose === 'kneel' ? 3 : pose === 'sit' ? 3 : 0
  const bob = pose === 'pass' ? -1 : 0
  const dy = low + bob

  // Hair behind the body.
  if (view === 'front' && hair.behind && pose !== 'sit') paint(ctx, hair.behind.rows, hair.behind.y + dy, hcol)

  // Legs.
  let legs: string[]
  let legsY = 19
  if (pose === 'kneel') {
    legs = LEGS.kneelBack
    legsY = 21
  } else if (pose === 'sit') {
    legs = view === 'back' ? LEGS.sitBack : LEGS.sit
    legsY = 21
  } else if (view === 'side') {
    legs = pose === 'walk1' ? LEGS.sideWalk1 : pose === 'walk2' ? LEGS.sideWalk2 : LEGS.side
  } else {
    legs = pose === 'walk1' ? LEGS.frontWalk1 : pose === 'walk2' ? LEGS.frontWalk2 : LEGS.front
  }
  paint(ctx, legs, legsY, lcol)
  if (pose !== 'kneel' && pose !== 'sit') paintBottomOverlay(ctx, r, view, legsY)

  // Torso.
  let torso: string[]
  if (view === 'front') torso = pose === 'wai' ? TORSO.frontWai : pose === 'sit' ? TORSO.frontSit : TORSO.front
  else if (view === 'back') torso = pose === 'wai' || pose === 'kneel' || pose === 'sit' ? TORSO.backWai : TORSO.back
  else
    torso =
      pose === 'offer' ? TORSO.sideOffer : pose === 'walk1' ? TORSO.sideFwd : pose === 'walk2' ? TORSO.sideBack : TORSO.side
  paint(ctx, torso, 13 + dy, tcol)
  if (dy === 0) paintTopExtras(ctx, r, view, pose)
  else {
    // Re-use extras with the offset by drawing onto a temp context.
    const tmp = createCanvas(FRAME_W, FRAME_H)
    paintTopExtras(tmp.getContext('2d')!, r, view, pose)
    ctx.drawImage(tmp, 0, dy)
  }

  // Neck accessories sit on top of the torso.
  if (hairItem && view !== 'back') paintAcc(ctx, look.neck, view, dy)
  if (view === 'back') paintAcc(ctx, look.neck, view, dy)

  // Head.
  const headRows = view === 'front' ? (pose === 'happy' || pose === 'wai' ? HEAD_FRONT_CLOSED : HEAD_FRONT) : view === 'side' ? HEAD_SIDE : HEAD_BACK
  paint(ctx, headRows, dy, head)

  // Long hair behind in side view is part of the side map.
  const hv = view === 'front' ? hair.front : view === 'back' ? hair.back : hair.side
  paint(ctx, hv.rows, hv.y + dy, hcol)

  // Hood ears poke up from behind when wearing the hoodie (back view).
  paintAcc(ctx, look.head, view, dy)
  paintAcc(ctx, look.hand, view, dy)
  return c
}

/** Outlined, cached avatar sprite. `flip` mirrors side views to face left. */
export function avatarSprite(look: AvatarLook, view: View, pose: Pose, opts: AvatarRenderOptions & { flip?: boolean } = {}): Sprite {
  const key = `av:${lookKey(look)}:${view}:${pose}:${opts.barefoot ? 1 : 0}:${opts.flip ? 1 : 0}`
  return cached(key, () => {
    const comp = composeAvatar(look, view, pose, opts)
    const s = outlineCanvas(comp, P.ink)
    if (!opts.flip) return s
    const f = createCanvas(s.w, s.h)
    const ctx = f.getContext('2d')!
    ctx.translate(s.w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(s.canvas, 0, 0)
    return { canvas: f, w: s.w, h: s.h }
  })
}

export function lookKey(l: AvatarLook): string {
  return [l.skin, l.hairColor, l.hair, l.top, l.bottom, l.head ?? '', l.neck ?? '', l.hand ?? ''].join('|')
}

/** Portrait (head and shoulders) for lists and leaderboards. */
export function avatarPortrait(look: AvatarLook): Sprite {
  const key = `portrait:${lookKey(look)}`
  return cached(key, () => {
    const full = avatarSprite(look, 'front', 'stand')
    // Crop an 18×18 square around the head (skipping the headroom rows).
    const top = look.hair === 'hair_bun' || look.hair === 'hair_jook' || look.head === 'head_ngob' || look.head === 'head_lotus' ? 1 : 3
    const c = createCanvas(18, 18)
    const ctx = c.getContext('2d')!
    ctx.drawImage(full.canvas, 0, top, 18, 18, 0, 0, 18, 18)
    return { canvas: c, w: 18, h: 18 }
  })
}

// Re-exported so the sprite gallery can list them.
export const HAIR_STYLES = Object.keys(HAIR)
export { paintRows }
