// Layered chibi avatar. Body parts are authored once as region-coded pixel
// maps; clothing items only supply colours, sleeve types and patterns, so a
// handful of maps produce every outfit in every pose.

import { createCanvas } from '../engine/pixel'
import { cached, outlineCanvas, paintRows, type Sprite } from '../engine/sprite'
import { HAIR_COLORS, P, SKIN_TONES } from './palette'
import { OUTFIT_BY_ID, SUIT_FACE_ACCS, suitGarments, type BottomArt, type Pattern, type ShoeArt, type SuitArt, type SuitKind, type TopArt } from '../game/data/outfits'

export type BodyType = 'm' | 'f'

export interface AvatarLook {
  /** Body/face preset chosen at character creation. */
  gender: BodyType
  skin: number
  /** Eye style index. */
  face: number
  hairColor: number
  hair: string
  top: string
  bottom: string
  head?: string | null
  neck?: string | null
  hand?: string | null
  shoes?: string | null
  /** Back slot (wings, backpacks, aura...). */
  back?: string | null
  /** Full-body suit (slot 'suit'): replaces top + bottom (+ hair for hooded suits) while worn. */
  suit?: string | null
}

export type View = 'front' | 'back' | 'side'
export type Pose = 'stand' | 'walk1' | 'walk2' | 'pass' | 'wai' | 'kneel' | 'bow' | 'sit' | 'offer' | 'happy'

export const FRAME_W = 16
export const FRAME_H = 27
/** Rows of empty space above the head for buns and hats. */
const HEADROOM = 4

export const DEFAULT_LOOK: AvatarLook = {
  gender: 'f',
  skin: 1,
  face: 0,
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

  twoblock: {
    front: {
      y: -1,
      rows: [
        '.....dddddd.....',
        '....dhhHHhhd....',
        '...dhhHHhhhhd...',
        '..dhhHhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..kdhhdhhdhhdk..',
        '..kxhxxhxxhxxk..',
        '..k..........k..',
      ],
    },
    back: {
      y: -1,
      rows: [
        '.....dddddd.....',
        '....dhhHHhhd....',
        '...dhhHHhhhhd...',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dddddddddddd..',
        '..kkkkkkkkkkkk..',
        '..kkkkkkkkkkkk..',
        '...kkkkkkkkkk...',
      ],
    },
    side: {
      y: -1,
      rows: [
        '.....dddddd.....',
        '....dhhHHhhd....',
        '...dhhHHhhhhd...',
        '..dhhhhhhhhhhhd.',
        '..dhhhhhhhhhhhd.',
        '..dhhhhhhhhhhhd.',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhxd..',
        '..kkkkkk..xx....',
        '..kkkkk.........',
        '...kk...........',
      ],
    },
  },
  curtain: {
    front: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhddhhhhhd.',
        '.dhhhhx..xhhhhd.',
        '.dhhhx....xhhhd.',
        '.dhhx......xhhd.',
        '.dh..........hd.',
        '.dh..........hd.',
      ],
    },
    back: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhdhhhhhhhd.',
        '.dhhhhhhhhdhhhd.',
        '..ddhhhhhhhhdd..',
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
        '.dhhhhhhhhhxhhd.',
        '.dhhhhhhhhx..hd.',
        '.dhhhhhhh.......',
        '.dhhhhhhd.......',
        '..dhhhhd........',
      ],
    },
  },
  buzz: {
    front: {
      y: 1,
      rows: ['.....dddddd.....', '...ddhhhhhhdd...', '..dhhHHhhhhhhd..', '..dhhhhhhhhhhd..', '..dkkkkkkkkkkd..', '..k..........k..'],
    },
    back: {
      y: 1,
      rows: [
        '.....dddddd.....',
        '...ddhhhhhhdd...',
        '..dhhHHhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dhhhhhhhhhhd..',
        '..dkkkkkkkkkkd..',
        '..kkkkkkkkkkkk..',
        '...kkkkkkkkkk...',
      ],
    },
    side: {
      y: 1,
      rows: ['.....dddddd.....', '...ddhhhhhhdd...', '..dhhHHhhhhhhd..', '..dhhhhhhhhhhd..', '..dhhhhhhhkkkd..', '..dhhhhhk.......', '..dkkkk.........', '...kk...........'],
    },
  },
  ponytail: {
    front: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhdd',
        '.dhhhhhhhhhhhhdh',
        '.dhhhhhhhhxxhhdh',
        '.dhhxxxxx...xhdh',
        '.dhx..........dh',
        '.dh............d',
      ],
    },
    back: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhhhhrrhhhhhd.',
        '.dhhhhdhhdhhhhd.',
        '.dhhhhdhhdhhhhd.',
        '..ddhdhhhhdhdd..',
        '.....dhHhhd.....',
        '.....dhhhhd.....',
        '.....dhhhhd.....',
        '......dhhd......',
        '......dhhd......',
        '.......dd.......',
      ],
    },
    side: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        'drhhhhhhhhhhhhd.',
        'hdhhhhhhhhhhhhd.',
        'hdhhhhhhhhxhhhd.',
        'hddhhhhhh.......',
        'dhhdhhhhd.......',
        '.dhhdhhd........',
        '.dhhd...........',
        '..dhd...........',
        '...d............',
      ],
    },
  },
  wavy: {
    front: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhdhhhhhhhhd.',
        '.dhhx..xxhhhhhd.',
        '.dhh.......xhhd.',
        'dhh.........hhd.',
        '.dhh........dhhd',
        'dhhd........dhd.',
        '.dhhd......dhhd.',
        'dhhd........dhhd',
      ],
    },
    behind: {
      y: 13,
      rows: ['.dhhd......dhhd.', 'dhhd........dhhd', '.dhhd......dhhd.', 'dhhd........dhhd', '.dhhd......dhhd.', '..dd........dd..'],
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
        '.dhhdhhhhhdhhhd.',
        'dhhhhdhhhhhdhhhd',
        '.dhhhhdhhhhhdhd.',
        'dhhhdhhhhhdhhhhd',
        '.dhhhhdhhhhhdhd.',
        'dhhhdhhhhhdhhhhd',
        '.dhhhhdhhhhhdhd.',
        '..dhhhhhhhhhhd..',
        '.dhhhhhhhhhhhhd.',
        '..dhhdhhhhdhhd..',
        '...dhhhhhhhhd...',
        '....dd.dd.dd....',
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
        '.dhhhhhhhhxhhhd.',
        'dhhhhhhhh.......',
        '.dhhhhhhd.......',
        'dhhhhhhd........',
        '.dhhhhhd........',
        'dhhhhhd.........',
        '.dhhhhd.........',
        'dhhhhd..........',
        '.dhhd...........',
        '..dd............',
      ],
    },
  },
  schoolgirl: {
    front: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhHhhhhhhhhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dhrqhhhhhhhhhd.',
        '.dhhxhxxhxxhxhd.',
        '.dhh........hhd.',
        '.dhh........hhd.',
        '.ddd........ddd.',
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
        '.dhhhhdhhhhdhhd.',
        '.dhhhhhhhhhhhhd.',
        '.dddddddddddddd.',
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
        '.dhhhhhhhrqhhhd.',
        '.dhhhhhhhhxhhhd.',
        '.dhhhhhhh.......',
        '.dhhhhhhd.......',
        '.ddddddd........',
      ],
    },
  },
  braid: {
    front: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHddhhhhd..',
        '.dhhHhd..dhhhhd.',
        '.dhhhd....dhhhd.',
        '.dhhx......xhhd.',
        '.dhx........xhd.',
        '.dh..........hd.',
        '.............dhd',
        '.............hHd',
        '.............dhd',
        '.............hHd',
        '.............drd',
        '..............h.',
      ],
    },
    back: {
      y: 0,
      rows: [
        '................',
        '.....dhhhhd.....',
        '...dhhHHhhhhd...',
        '..dhhHHhhhhhhd..',
        '.dhhhhhhhhhhhhd.',
        '.dhhhhhdhhhhhhd.',
        '.dhhhhhdhhhhhhd.',
        '.dhhhhhdhhhhhhd.',
        '..ddhhhhhhhhdd..',
        '.....ddhHddd....',
        '......dhhd......',
        '......dHhd......',
        '......dhhd......',
        '......dHhd......',
        '......drrd......',
        '.......hh.......',
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
        '.dhhhhhhhhxhhhd.',
        '.dhhhhhhh.......',
        '.dhhhhhhd.......',
        '..dhhhhd........',
        '..dHhd..........',
        '..dhhd..........',
        '..dHhd..........',
        '..drrd..........',
        '...hh...........',
      ],
    },
  },
  curly: {
    front: {
      y: -1,
      rows: [
        '....d.dd.dd.d...',
        '...dhhhhhhhhhd..',
        '..dhhHhhHhhHhhd.',
        '.dhhhhhhhhhhhhhd',
        'dhhHhhHhhHhhHhhd',
        'dhhhhhhhhhhhhhhd',
        'dhhdhhdhhdhhdhhd',
        'dhhhxxhxxhxxhhhd',
        'dhhh........hhhd',
        '.dhh........hhd.',
        'dhhd........dhhd',
        '.dd..........dd.',
      ],
    },
    back: {
      y: -1,
      rows: [
        '....d.dd.dd.d...',
        '...dhhhhhhhhhd..',
        '..dhhHhhHhhHhhd.',
        '.dhhhhhhhhhhhhhd',
        'dhhHhhHhhHhhHhhd',
        'dhhhhhhhhhhhhhhd',
        'dhhdhhdhhdhhdhhd',
        'dhHhhHhhHhhHhhhd',
        'dhhhhhhhhhhhhhhd',
        'dhhdhhdhhdhhdhhd',
        '.dhhhhhhhhhhhhd.',
        'dhhhhhhhhhhhhhhd',
        '.dhdhhdhhdhhdhd.',
        '..dd.dd.dd.dd...',
      ],
    },
    side: {
      y: -1,
      rows: [
        '....d.dd.dd.d...',
        '...dhhhhhhhhhd..',
        '..dhhHhhHhhHhhd.',
        '.dhhhhhhhhhhhhhd',
        'dhhHhhHhhHhhHhhd',
        'dhhhhhhhhhhhhhhd',
        'dhhdhhdhhdhxhhhd',
        'dhhhhhhhhx..xhd.',
        'dhhhhhhhh.......',
        '.dhhhhhhd.......',
        'dhhhhhhd........',
        '.dd.dd..........',
      ],
    },
  },
}

const HAIR_RIBBON: Record<string, string> = { ponytail: '#ff7eaa', schoolgirl: '#ff9fc0', braid: '#e8514a' }

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
  /** Painted before the head (e.g. the glass of a space helmet). */
  under?: { front?: { y: number; rows: string[] }; back?: { y: number; rows: string[] }; side?: { y: number; rows: string[] } }
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
  clips: {
    front: { y: 5, rows: ['..........pm....', '...........y....'] },
    side: { y: 5, rows: ['......pm........'] },
    back: { y: 5, rows: ['....mp..........'] },
    pal: { p: '#ff9fc0', m: '#7fd3b5', y: '#ffd54f' },
  },
  ribbon: {
    front: { y: 0, rows: ['..........r.r...', '...........R....', '..........r.r...'] },
    side: { y: 1, rows: ['.r.r............', '..R.............', '.r.r............'] },
    back: { y: 3, rows: ['.....rr.rr......', '......rRr.......', '.....rr.rr......'] },
    pal: { r: '#e8514a', R: '#b8343f' },
  },
  sunglasses: {
    front: { y: 7, rows: ['...kkkk..kkkk...', '...kbbkkkkbbk...', '...kkkk..kkkk...'] },
    side: { y: 7, rows: ['.........kkkk...', '.....kkkkkbbk...', '.........kkkk...'] },
    pal: { k: '#2e2840', b: '#6a6aa0' },
  },
  cap: {
    front: { y: -1, rows: ['.....cccccc.....', '...cccccccccc...', '..ccccpccccccc..', '..cccccccccccc..', '.vvvvvvvvvvvvvv.'] },
    side: { y: -1, rows: ['.....cccccc.....', '...cccccccccc...', '..cccccccccccc..', '..cccccccccccc..', '..cccccccccvvvvv'] },
    back: { y: -1, rows: ['.....cccccc.....', '...cccccccccc...', '..cccccccccccc..', '..cccccccccccc..', '..ccccc..ccccc..'] },
    pal: { c: '#34467e', v: '#1f2a52', p: '#ff9fc0' },
  },
  headphones: {
    front: { y: 1, rows: ['....kkkkkkkk....', '...k........k...', '..k..........k..', '..k..........k..', '..k..........k..', '..k..........k..', '.pp..........pp.', '.kk..........kk.', '.kk..........kk.'] },
    side: { y: 1, rows: ['....kkkkkkkk....', '...k........k...', '..k.........k...', '..k.........k...', '..k.........k...', '..k.........k...', '......pp........', '......kk........', '......kk........'] },
    back: { y: 1, rows: ['....kkkkkkkk....', '...k........k...', '..k..........k..', '..k..........k..', '..k..........k..', '..k..........k..', '.kk..........kk.', '.kk..........kk.', '.kk..........kk.'] },
    pal: { k: '#4a3f55', p: '#ff9fc0' },
  },
  waistsash: {
    front: { y: 19, rows: ['....rbrbrbrb....', '..........rb....', '..........b.....'] },
    side: { y: 19, rows: ['.....rbrbrb.....', '....rb..........'] },
    back: { y: 19, rows: ['....rbrbrbrb....', '.....rb.........'] },
    pal: { r: '#e8514a', b: '#3d63b5' },
  },
  amulet: {
    front: { y: 13, rows: ['......y..y......', '.......yy.......', '.......go.......'] },
    side: { y: 13, rows: ['.........y......', '..........g.....'] },
    back: { y: 13, rows: ['......yyyy......'] },
    pal: { y: '#e9b949', g: '#ffd54f', o: '#b8742a' },
  },
  lotusbud: {
    front: { y: 14, rows: ['.............p..', '............pPp.', '.............g..', '.............g..'] },
    side: { y: 15, rows: ['............p...', '...........pPp..', '............g...'] },
    back: { y: 14, rows: ['..p.............', '.pPp............', '..g.............', '..g.............'] },
    pal: { p: '#e8709e', P: '#ffc4d8', g: '#43905a' },
  },
  chayen: {
    front: { y: 14, rows: ['.............r..', '............www.', '............ooo.', '............oOo.', '.............o..'] },
    side: { y: 14, rows: ['............r...', '...........www..', '...........ooo..', '...........oOo..'] },
    back: { y: 14, rows: ['..r.............', '.www............', '.ooo............', '.oOo............'] },
    pal: { r: '#e8514a', w: '#fff3e6', o: '#f58f35', O: '#ffbb66' },
  },
  umbrella: {
    front: { y: 15, rows: ['............fp..', '...........fppf.', '............ww..', '............w...'] },
    side: { y: 15, rows: ['...........fp...', '..........fppf..', '...........ww...', '...........w....'] },
    back: { y: 15, rows: ['..fp............', '.fppf...........', '..ww............', '...w............'] },
    pal: { f: '#e8709e', p: '#ffd6e0', w: '#c28e5c' },
  },
}

// ---- lifestyle pack accessories -------------------------------------------

const HELMET_ROWS = [
  '.....wwwwww.....',
  '...wwwwrrwwww...',
  '..wWwwwrrwwwww..',
  '.wWwwwwrrwwwwwd.',
  '.wwwwwwrrwwwwwd.',
  '.wwwwwwrrwwwwwd.',
  '.kkkkkkkkkkkkkk.',
]
const HELMET_STRAP = ['..k..........k..', '..k..........k..', '..k..........k..', '...k........k...']
const HELMET_SIDE = [
  '.....wwwwww.....',
  '...wwwwwwwwww...',
  '..wWrrrrrrrrww..',
  '.wWwwwwwwwwwwwd.',
  '.wwwwwwwwwwwwwd.',
  '.wwwwwwwwwwwwkk.',
  '.kkkkkkkkkkk....',
  '.......k........',
  '.......k........',
  '........k.......',
]
const SPACE_GLASS = ['................', '.....GGGGGG.....', '...GGGGGGGGGG...', '..GGGGGGGGGGGG..', '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '..GGGGGGGGGGGG..']
const CAT_EARS = ['..p..........p..', '.ppp........ppp.', '.pPp........pPp.']

Object.assign(ACC, {
  helmet: {
    front: { y: -1, rows: [...HELMET_ROWS, ...HELMET_STRAP] },
    back: { y: -1, rows: HELMET_ROWS },
    side: { y: -1, rows: HELMET_SIDE },
    pal: { w: '#f4f5fa', W: '#ffffff', r: '#e8514a', d: '#c9ccda', k: '#3a3547' },
  },
  helmetcute: {
    front: { y: -4, rows: [...CAT_EARS, ...HELMET_ROWS, ...HELMET_STRAP] },
    back: { y: -4, rows: [...CAT_EARS, ...HELMET_ROWS] },
    side: { y: -4, rows: ['.....p..........', '....ppp.........', '....pPp.........', ...HELMET_SIDE] },
    pal: { w: '#ffb3cf', W: '#ffe0ea', r: '#fffaf0', d: '#e8889f', k: '#8e3a5e', p: '#ff9fc0', P: '#ffe0ea' },
  },
  sunhat: {
    front: { y: -1, rows: ['.....hhhhhh.....', '....hhHhhhhh....', '....hhhhhhhh....', '....rrrrrrrr....', 'hhhhhhhhhhhhhhhh', '.dddddddddddddd.'] },
    back: { y: -1, rows: ['.....hhhhhh.....', '....hhHhhhhh....', '....hhhhhhhh....', '....rrrrrrrrrr..', 'hhhhhhhhhhhhhrhh', '.ddddddddddddrd.', '.............r..'] },
    side: { y: -1, rows: ['.....hhhhhh.....', '....hhHhhhhh....', '....hhhhhhhh....', '....rrrrrrrr....', 'hhhhhhhhhhhhhhhh', '.dddddddddddddd.'] },
    pal: { h: '#f0cf8a', H: '#fff3c4', d: '#c9a05a', r: '#ff7eaa' },
  },
  vendorband: {
    front: { y: 4, rows: ['..............kk', '.ppqpppqpppqppkk', '.pppppppppppppk.', '..............kk'] },
    back: { y: 4, rows: ['................', '.ppqpppqpppqppp.', '.pppppppkkpppppp', '.......k..k.....'] },
    side: { y: 4, rows: ['................', '.ppqpppqpppqppp.', 'kkpppppppppppp..', 'k...............'] },
    pal: { p: '#ff7eaa', q: '#fffaf0', k: '#e8514a' },
  },
  chefhat: {
    front: { y: -4, rows: ['....ww.ww.ww....', '...wwwwwwwwww...', '...wwwWwwwWww...', '...wwwwwwwwww...', '....wwwwwwww....', '....dddddddd....', '....dddddddd....'] },
    back: { y: -4, rows: ['....ww.ww.ww....', '...wwwwwwwwww...', '...wwwWwwwWww...', '...wwwwwwwwww...', '....wwwwwwww....', '....dddddddd....', '....dddddddd....'] },
    side: { y: -4, rows: ['.....ww.ww......', '...wwwwwwwwww...', '...wwWwwwWwww...', '...wwwwwwwwww...', '....wwwwwwww....', '....dddddddd....', '....dddddddd....'] },
    pal: { w: '#fbfcff', W: '#dfe3ee', d: '#e9ecf5' },
  },
  catears: {
    front: { y: -2, rows: CAT_EARS },
    back: { y: -2, rows: ['..p..........p..', '.ppp........ppp.', '.ppp........ppp.'] },
    side: { y: -2, rows: ['......p.........', '.....ppp........', '.....pPp........'] },
    pal: { p: '#f58f35', P: '#ffc4d8' },
  },
  bunnyears: {
    front: { y: -4, rows: ['...ww...........', '..wPw.....wwww..', '..wPw....wPPPww.', '..wPw....ww.....', '...ww...ww......'] },
    back: { y: -4, rows: ['...........ww...', '..wwww.....wPw..', '.wwPPPw....wPw..', '.....ww....wPw..', '......ww...ww...'] },
    side: { y: -4, rows: ['.....ww.........', '....wPw..www....', '....wPw.wPPww...', '....wPwww.......', '.....ww.........'] },
    pal: { w: '#fbfcff', P: '#ffb3cf' },
  },
  flowercrown: {
    front: { y: 0, rows: ['...pp.oo.ww.pp..', '..gpPgoOgwWgpPg.', '...g..g..g..g...'] },
    back: { y: 0, rows: ['...ww.pp.oo.ww..', '..gwWgpPgoOgwWg.', '...g..g..g..g...'] },
    side: { y: 0, rows: ['....pp.oo.ww....', '...gpPgoOgwWg...', '....g..g..g.....'] },
    pal: { p: '#ff7eaa', P: '#ffd6e0', o: '#f58f35', O: '#ffd23f', w: '#fffaf0', W: '#fff3a6', g: '#5ea653' },
  },
  turban: {
    front: { y: -2, rows: ['.......rb.......', '......brrb......', '...rbrbrbrbrb...', '..brbybrbybrbr..', '.rbrbrbrbrbrbrb.', '.brybrbrybrbryr.', '.rrrrrrrrrrrrrr.'] },
    back: { y: -2, rows: ['.......rb.......', '......brrb......', '...rbrbrbrbrb...', '..brbybrbybrbr..', '.rbrbrbrbrbrbrb.', '.brybrbrybrbryr.', '.rrrrrrrrrrrrrr.'] },
    side: { y: -2, rows: ['......rb........', '.....brrb.......', '...rbrbrbrbrb...', '..brbybrbybrbr..', '.rbrbrbrbrbrbrb.', '.brybrbrybrbryr.', '.rrrrrrrrrrrrrr.'] },
    pal: { r: '#e8514a', b: '#3d63b5', y: '#ffd54f' },
  },
  heartshades: {
    front: { y: 7, rows: ['..hh.hhkkhh.hh..', '..hHhhh..hHhhh..', '...hhh....hhh...', '....h......h....'] },
    side: { y: 7, rows: ['.........hh.hh..', '.....kkkkhHhhh..', '..........hhh...', '...........h....'] },
    pal: { h: '#ff5e8a', H: '#ffd6e0', k: '#3a2838' },
  },
  nerdglasses: {
    front: { y: 7, rows: ['..kkkkk..kkkkk..', '..kl..kwwkl..k..', '..k...kwwk...k..', '..kkkkk..kkkkk..'] },
    side: { y: 7, rows: ['.........kkkkk..', '.....kkkkkl..k..', '.........k...k..', '.........kkkkk..'] },
    pal: { k: '#2e2840', l: '#e6f6ff', w: '#fbfcff' },
  },
  dinsor: {
    front: { y: 9, rows: ['.......w........', '...www.ww..www..', '....w......w....'] },
    side: { y: 9, rows: ['................', '.........www.w..', '..........w.....'] },
    pal: { w: '#fbfcff' },
  },
  mongkol: {
    front: { y: 2, rows: ['.......ww.......', '..wrwrwrwrwrwr..'] },
    back: { y: 3, rows: ['..wrwrwrwrwrwr..', '.......rw.......', '.......wr.......', '.......rw.......', '........w.......'] },
    side: { y: 3, rows: ['..wrwrwrwrwrwr..', '..rw............', '..wr............', '...w............'] },
    pal: { w: '#fbfcff', r: '#e8514a' },
  },
  chada: {
    front: { y: -4, rows: ['.......yy.......', '.......yy.......', '......yGyy......', '......yyyy......', '.....yyryyy.....', '....yyyyyyyy....', '...ydyyGyydyy...', '..yyyyyyyyyyyy..', '................', '................', '.y............y.', 'yy............yy', '.y............y.'] },
    back: { y: -4, rows: ['.......yy.......', '.......yy.......', '......yyyy......', '......yyyy......', '.....yyyyyy.....', '....yyyyyyyy....', '...ydyydyydyy...', '..yyyyyyyyyyyy..'] },
    side: { y: -4, rows: ['.......yy.......', '.......yy.......', '......yGyy......', '......yyyy......', '.....yyryyy.....', '....yyyyyyyy....', '...ydyyGyydyy...', '..yyyyyyyyyyyy..', '................', '................', '.......y........', '......yy........', '.......y........'] },
    pal: { y: '#ffd54f', d: '#b8742a', G: '#5ee0a0', r: '#e8514a' },
  },
  likay: {
    front: { y: -4, rows: ['..........ffff..', '.........fFFFf..', '.........fFFf...', '........fFf.....', '....yyyyyfyyy...', '...yrygyrygyry..', '..yyyyyyyyyyyy..'] },
    back: { y: -4, rows: ['..ffff..........', '..fFFFf.........', '...fFFf.........', '.....fFf........', '...yyyfyyyyy....', '..yyyyyyyyyyyy..', '..yyyyyyyyyyyy..'] },
    side: { y: -4, rows: ['........ffff....', '.......fFFFf....', '.......fFFf.....', '......fFf.......', '....yyyfyyyy....', '...yrygyrygyy...', '..yyyyyyyyyyyy..'] },
    pal: { y: '#ffd54f', r: '#e8514a', g: '#5ee0a0', f: '#ff7eaa', F: '#fffaf0' },
  },
  spacehelmet: {
    under: {
      front: { y: -3, rows: SPACE_GLASS },
      back: { y: -3, rows: SPACE_GLASS },
      side: { y: -3, rows: SPACE_GLASS },
    },
    front: { y: -3, rows: ['....gggggggg....', '..gg........gg..', '.g..W.........g.', '.g.W..........g.', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', '.g............g.', '.g............g.', '..gggggggggggg..', '...kkkkkkkkkk...'] },
    back: { y: -3, rows: ['....gggggggg....', '..gg........gg..', '.g..........W.g.', '.g..........W.g.', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', '.g............g.', '.g............g.', '..gggggggggggg..', '...kkkkkkkkkk...'] },
    side: { y: -3, rows: ['....gggggggg....', '..gg........gg..', '.g.........W..g.', '.g........W...g.', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', 'g..............g', '.g............g.', '.g............g.', '..gggggggggggg..', '...kkkkkkkkkk...'] },
    pal: { g: '#c9d6ea', G: '#dcebfa', W: '#ffffff', k: '#8a8496' },
  },
  sleepcap: {
    front: { y: -3, rows: ['.......ss.......', '.....sSsSs......', '....sSsSsSsss...', '...sSsSsSsSsss..', '..wwwwwwwwwwwsss', '..............sP', '..............PP'] },
    back: { y: -3, rows: ['.......ss.......', '......sSsSs.....', '...sssSsSsSs....', '..sssSsSsSsSs...', 'ssswwwwwwwwwww..', 'Ps..............', 'PP..............'] },
    side: { y: -3, rows: ['.......ss.......', '.....sSsSs......', '....sSsSsSs.....', '...sSsSsSsSs....', 'sssswwwwwwwwww..', 'Ps..............', 'PP..............'] },
    pal: { s: '#7fb0de', S: '#fffaf0', w: '#fffaf0', P: '#ffe45e' },
  },

  // neck / body
  lanyard: {
    front: { y: 13, rows: ['.....b....b.....', '......b..b......', '.......bb.......', '.......ww.......', '.......wc.......'] },
    side: { y: 13, rows: ['.........b......', '..........b.....', '..........w.....'] },
    back: { y: 13, rows: ['......bbbb......'] },
    pal: { b: '#3d63b5', w: '#fbfcff', c: '#e8514a' },
  },
  prajiad: {
    front: { y: 15, rows: ['...rr...........'] },
    back: { y: 15, rows: ['...........rr...'] },
    side: { y: 15, rows: ['.......rr.......'] },
    pal: { r: '#e8514a' },
  },
  mask: {
    front: { y: 9, rows: ['...k........k...', '...wwwwwwwwww...', '....wdwwwwdw....', '.....wwwwww.....'] },
    side: { y: 9, rows: ['......k.........', '......kwwwwww...', '.......wwdwww...', '........wwww....'] },
    pal: { w: '#cfe6f7', d: '#a9cbe6', k: '#9fb0cc' },
  },
  amuletbig: {
    front: { y: 13, rows: ['....yy....yy....', '.....yyyyyy.....', '.....o.oo.o.....', '.......oo.......'] },
    side: { y: 13, rows: ['........yy......', '.........yo.....'] },
    back: { y: 13, rows: ['....yyyyyyyy....'] },
    pal: { y: '#ffd23f', o: '#b8742a' },
  },

  // hand
  tote: {
    front: { y: 17, rows: ['...........b..b.', '...........b..b.', '...........ccccc', '...........cecec', '...........ccccc'] },
    side: { y: 17, rows: ['.......b..b.....', '.......b..b.....', '......ccccc.....', '......cecec.....', '......ccccc.....'] },
    back: { y: 17, rows: ['.b..b...........', '.b..b...........', 'ccccc...........', 'cecec...........', 'ccccc...........'] },
    pal: { b: '#c9a06b', c: '#f3e6c8', e: '#e8514a' },
  },
  bubbletea: {
    front: { y: 13, rows: ['.............k..', '............www.', '............bbb.', '............bbb.', '............kbk.', '.............k..'] },
    side: { y: 13, rows: ['............k...', '...........www..', '...........bbb..', '...........kbk..'] },
    back: { y: 13, rows: ['..k.............', '.www............', '.bbb............', '.bbb............', '.kbk............'] },
    pal: { k: '#3a2838', w: '#fff3e6', b: '#c9a07a' },
  },
  selfie: {
    front: { y: 8, rows: ['..............pp', '..............pb', '..............pp', '..............k.', '.............k..', '.............k..', '.............k..', '............k...', '............k...'] },
    side: { y: 8, rows: ['............pp..', '............pb..', '............pp..', '............k...', '...........k....', '...........k....', '..........k.....', '.........k......', '.........k......'] },
    back: { y: 8, rows: ['pp..............', 'bp..............', 'pp..............', '.k..............', '..k.............', '..k.............', '..k.............', '...k............', '...k............'] },
    pal: { p: '#ff9fc0', b: '#9fd0ff', k: '#6a6478' },
  },
  minifan: {
    front: { y: 11, rows: ['............mmm.', '...........m.w.m', '...........mwwwm', '...........m.w.m', '............mmm.', '.............h..', '.............h..'] },
    side: { y: 11, rows: ['...........mmm..', '..........m.w.m.', '..........mwwwm.', '..........m.w.m.', '...........mmm..', '............h...', '............h...'] },
    back: { y: 11, rows: ['.mmm............', 'm.w.m...........', 'mwwwm...........', 'm.w.m...........', '.mmm............', '..h.............', '..h.............'] },
    pal: { m: '#7fd3b5', w: '#fbfcff', h: '#ff9fc0' },
  },
  parasol: {
    front: { y: -4, rows: ['..........rrr...', '........rryyyrr.', '.......rryrrryrr', '.......yryryryry', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '.............k..', '.............k..'] },
    back: { y: -4, rows: ['...rrr..........', '.rryyyrr........', 'rryrrryrr.......', 'yryryryry.......', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '.k..............', '..k.............', '..k.............'] },
    side: { y: -4, rows: ['..........rrr...', '........rryyyrr.', '.......rryrrryrr', '.......yryryryry', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '..............k.', '.............k..', '............k...', '...........k....', '..........k.....', '.........k......'] },
    pal: { r: '#c0392f', y: '#ffd54f', k: '#6e4a35' },
  },
  watergun: {
    front: { y: 14, rows: ['............bb..', '............bbd.', '...........ooooo', '............g...'] },
    side: { y: 14, rows: ['..........bb....', '..........bb.d..', '.........ooooo..', '..........g.....'] },
    back: { y: 14, rows: ['..bb............', '.dbb............', 'ooooo...........', '...g............'] },
    pal: { b: '#5ebcff', d: '#bfe6ff', o: '#f58f35', g: '#5ea653' },
  },
  grocery: {
    front: { y: 17, rows: ['............pp..', '...........wccw.', '...........cgcc.', '...........wccw.'] },
    side: { y: 17, rows: ['........pp......', '.......wccw.....', '.......cgcc.....', '.......wccw.....'] },
    back: { y: 17, rows: ['..pp............', '.wccw...........', '.ccgc...........', '.wccw...........'] },
    pal: { p: '#ff9fc0', w: '#eef6fb', c: '#f58f35', g: '#6cc36a' },
  },
  phone: {
    front: { y: 14, rows: ['............pp..', '............bp..', '............bp..'] },
    side: { y: 14, rows: ['...........pp...', '...........bp...', '...........bp...'] },
    back: { y: 14, rows: ['..pp............', '..pp............', '..pp............'] },
    pal: { p: '#ff9fc0', b: '#9fd0ff' },
  },
  patongo: {
    front: { y: 15, rows: ['............y.y.', '............yyy.', '...........bbbb.', '...........bBbb.', '...........bbbb.'] },
    side: { y: 15, rows: ['...........y.y..', '...........yyy..', '..........bbbb..', '..........bBbb..', '..........bbbb..'] },
    back: { y: 15, rows: ['.y.y............', '.yyy............', '.bbbb...........', '.bbBb...........', '.bbbb...........'] },
    pal: { y: '#e9a53a', b: '#c9a06b', B: '#a8804e' },
  },
  krathong: {
    front: { y: 13, rows: ['.............f..', '.............w..', '...........yoyo.', '..........gGgGg.'] },
    side: { y: 13, rows: ['............f...', '............w...', '..........yoyo..', '.........gGgGg..'] },
    back: { y: 13, rows: ['..f.............', '..w.............', '.oyoy...........', '.gGgGg..........'] },
    pal: { f: '#ffbb66', w: '#fffaf0', y: '#ffd23f', o: '#f58f35', g: '#5ea653', G: '#86c95f' },
  },
  lookchin: {
    front: { y: 11, rows: ['.............s..', '............bsb.', '............bbb.', '............bsb.', '.............k..', '.............k..'] },
    side: { y: 11, rows: ['............s...', '...........bsb..', '...........bbb..', '...........bsb..', '............k...', '............k...'] },
    back: { y: 11, rows: ['..s.............', '.bsb............', '.bbb............', '.bsb............', '..k.............', '..k.............'] },
    pal: { b: '#9a6a45', s: '#e8514a', k: '#e0bb8a' },
  },
} satisfies Record<string, AccArt>)

// ---- place-exclusive souvenirs --------------------------------------------------

/** Mirror a 16-wide row map (front art held in the other hand when seen from behind). */
const flipRows = (rows: string[]) => rows.map((r) => r.split('').reverse().join(''))

const KARIPAP = ['............c.c.', '...........oooo.', '...........oOoo.', '............dd..']
const PAKBUNG = ['............g.G.', '...........gGgg.', '............rG..', '................', '...........wwww.', '............dd..']

Object.assign(ACC, {
  yakhat: {
    front: { y: -3, rows: ['.......aa.......', '......aAAa......', '.....aaaaaa.....', '....rrrrrrrr....', '..rrrrrrrrrrrr..', '.rrwwrrrrrrwwrr.', '.rrwkrrrrrrkwrr.', '.rrrrwkkkkwrrrr.'] },
    back: { y: -3, rows: ['.......aa.......', '......aAAa......', '.....aaaaaa.....', '....rrrrrrrr....', '..rrrrrrrrrrrr..', '.rrrrrrrrrrrrrr.', '.aaaaaaaaaaaaaa.'] },
    side: { y: -3, rows: ['.......aa.......', '......aAAa......', '.....aaaaaa.....', '....rrrrrrrr....', '..rrrrrrrrrrrr..', '.rrrrrrrrrwwrr..', '.rrrrrrrrrwkrr..', '.rrrrrrrrkkkwr..'] },
    pal: { a: '#ffd54f', A: '#e9a53a', r: '#d8584a', w: '#fffaf0', k: '#6e2433' },
  },
  massageband: {
    front: { y: 3, rows: ['............tt..', '...........tTtt.', '.wwwwwwwwwwtttt.', '............dd..'] },
    back: { y: 5, rows: ['.wwwwwwwwwwwwww.', '......w..w......', '.....w....w.....'] },
    side: { y: 3, rows: ['..tt............', '.tTtt...........', '.ttttwwwwwwwwww.', '..dd............'] },
    pal: { w: '#fbfcff', t: '#c9c08a', T: '#e6dfaa', d: '#a09a62' },
  },
  chadaprang: {
    front: { y: -4, rows: ['.......yy.......', '.......ss.......', '......s1ss......', '......ss2s......', '.....s3ss1s.....', '....ss1ss2ss....', '...s2ss3ss1ss...', '..yyyyyyyyyyyy..', '................', '................', '.s............s.', 'ss............ss', '.r............r.'] },
    back: { y: -4, rows: ['.......yy.......', '.......ss.......', '......ss1s......', '......s2ss......', '.....s1ss3s.....', '....ss2ss1ss....', '...ss1ss3ss2s...', '..yyyyyyyyyyyy..'] },
    side: { y: -4, rows: ['.......yy.......', '.......ss.......', '......s1ss......', '......ss2s......', '.....s3ss1s.....', '....ss1ss2ss....', '...s2ss3ss1ss...', '..yyyyyyyyyyyy..', '................', '................', '.......s........', '......ss........', '.......r........'] },
    pal: { y: '#ffd54f', s: '#eadfcb', '1': '#ff9fc0', '2': '#5aa9e8', '3': '#ffd54f', r: '#e8514a' },
  },
  ngobpomelo: {
    front: { y: -4, rows: ['.......pl.......', '.....dpphd......', '...dhhhhhhhhd...', '.dhhghhhhhhghhd.', 'dbbbbbbbbbbbbbbd'] },
    back: { y: -4, rows: ['.......lp.......', '......dhppd.....', '...dhhhhhhhhd...', '.dhhghhhhhhghhd.', 'dbbbbbbbbbbbbbbd'] },
    side: { y: -4, rows: ['.......pl.......', '.....dpphd......', '...dhhhhhhhhd...', '.dhhghhhhhhghhd.', 'dbbbbbbbbbbbbbbd'] },
    pal: { d: '#9a8a52', h: '#e6d9a0', b: '#c9b878', p: '#d6e87a', l: '#43905a', g: '#6cc36a' },
  },
  ratears: {
    front: { y: -2, rows: ['.oo..........oo.', 'oppo........oppo', 'oppo........oppo', '.oo..........oo.'] },
    back: { y: -2, rows: ['.oo..........oo.', 'oooo........oooo', 'oooo........oooo', '.oo..........oo.'] },
    side: { y: -2, rows: ['.....oo.........', '....oppo........', '....oppo........', '.....oo.........'] },
    pal: { o: '#8f86a6', p: '#ffb3cf' },
  },
  pineapple: {
    front: { y: -4, rows: ['....l.l..l.l....', '.....lLllLl.....', '......lLLl......', '....yyyyyyyy....', '...ycycycycyc...', '..yyyyyyyyyyyy..', '..ycycycycycyc..'] },
    back: { y: -4, rows: ['....l.l..l.l....', '.....lLllLl.....', '......lLLl......', '....yyyyyyyy....', '...ycycycycyc...', '..yyyyyyyyyyyy..', '..ycycycycycyc..'] },
    side: { y: -4, rows: ['.....l.l..l.....', '......lLlLl.....', '......lLLl......', '....yyyyyyyy....', '...ycycycycyc...', '..yyyyyyyyyyyy..', '..ycycycycycyc..'] },
    pal: { l: '#43905a', L: '#86c95f', y: '#ffc93c', c: '#c07a1f' },
  },
  doibeanie: {
    front: { y: -3, rows: ['.......ww.......', '......wwww......', '....rrrrrrrr....', '...rrwrrrrwrr...', '..rrrrrrrrrrrr..', '..wwwwwwwwwwww..', '..wrwrwrwrwrwr..'] },
    back: { y: -3, rows: ['.......ww.......', '......wwww......', '....rrrrrrrr....', '...rrwrrrrwrr...', '..rrrrrrrrrrrr..', '..wwwwwwwwwwww..', '..wrwrwrwrwrwr..'] },
    side: { y: -3, rows: ['......ww........', '.....wwww.......', '....rrrrrrrr....', '...rrwrrrrwrr...', '..rrrrrrrrrrrr..', '..wwwwwwwwwwww..', '..wrwrwrwrwrwr..'] },
    pal: { r: '#c0392f', w: '#fbfcff' },
  },
  carriagehat: {
    front: { y: -3, rows: ['.....hhhhhh.....', '....hHhhhhhh....', '....hhhhhhhh....', '....rrrrrryr....', 'hhhhhhhhhhhhhhhh', '.dddddddddddddd.'] },
    back: { y: -3, rows: ['.....hhhhhh.....', '....hHhhhhhh....', '....hhhhhhhh....', '....rrrrrrrrrr..', 'hhhhhhhhhhhhhrhh', '.ddddddddddddrd.'] },
    side: { y: -3, rows: ['.....hhhhhh.....', '....hHhhhhhh....', '....hhhhhhhh....', '....rrrrrrrr....', 'hhhhhhhhhhhhhhhh', '.dddddddddddddd.'] },
    pal: { h: '#9a6a45', H: '#c28e5c', r: '#e8514a', y: '#ffd54f', d: '#6e4a35' },
  },
  mirrorshades: {
    front: { y: 7, rows: ['...kkkk..kkkk...', '...kWbkkkkWbk...', '...kkkk..kkkk...'] },
    side: { y: 7, rows: ['.........kkkk...', '.....kkkkkWbk...', '.........kkkk...'] },
    pal: { k: '#8a8496', W: '#f4f8ff', b: '#a9c2e6' },
  },
  gamecock: {
    front: { y: -4, rows: ['......a.a.....G.', '......aaaa...GaG', '....oooooooo.Gy.', '...okoooookooo..', '...oooyyooooooo.', '..yyyyyrryyyyyy.'] },
    back: { y: -4, rows: ['.G.....a.a......', 'GaG...aaaa......', '.yG.oooooooo....', '..ooooooooooo...', '.ooooooooooooo..', '.yyyyyyyyyyyyyy.'] },
    side: { y: -4, rows: ['......a.a.......', 'G.....aaaa......', 'aG..oooooooo....', '.yGooooooookoy..', '..oooooooooooyy.', '..yyyyyyyyyyyr..'] },
    pal: { a: '#e8514a', G: '#2f5a4a', y: '#ffd54f', o: '#e0703a', k: '#2a1a2c', r: '#e8514a' },
  },
  beachhat: {
    front: { y: -2, rows: ['.....bbbbbb.....', '....bpbbwbbb....', '....bbbbpbbb....', '....wwwwwwww....', '..BBBBBBBBBBBB..', '.BBpBBBBBBBpBBB.'] },
    back: { y: -2, rows: ['.....bbbbbb.....', '....bbwbbpbb....', '....bpbbbbbb....', '....wwwwwwww....', '..BBBBBBBBBBBB..', '.BBBBBpBBBBBBBB.'] },
    side: { y: -2, rows: ['.....bbbbbb.....', '....bpbbwbbb....', '....bbbbpbbb....', '....wwwwwwww....', '..BBBBBBBBBBBB..', '.BBpBBBBBBBpBBB.'] },
    pal: { b: '#6fc7e8', p: '#ff9fc0', w: '#fffaf0', B: '#a9dff2' },
  },
  // Beach souvenirs (data/beachOutfits.ts).
  beachstraw: {
    front: { y: -2, rows: ['.....hhhhhh.....', '....hkkhhkkh....', '....hhhhhhfh....', '....rrrrrrrr....', 'hhhhhhhhhhhhhhhh', '.dddddddddddddd.'] },
    back: { y: -2, rows: ['.....hhhhhh.....', '....hhHhhhhh....', '....hhhhhhhh....', '....rrrrrrrrrr..', 'hhhhhhhhhhhhhrhh', '.ddddddddddddrd.', '.............r..'] },
    side: { y: -2, rows: ['.....hhhhhh.....', '....hhHhhhkk....', '....hhhhhhhf....', '....rrrrrrrr....', 'hhhhhhhhhhhhhhhh', '.dddddddddddddd.'] },
    pal: { h: '#f4d890', H: '#fff3c4', d: '#c9a05a', r: '#5ab4e8', k: '#2e2840', f: '#ff4f7b' },
  },
  sunsetshades: {
    front: { y: 7, rows: ['...kkkk..kkkk...', '...kopkkkkopk...', '...kkkk..kkkk...'] },
    side: { y: 7, rows: ['.........kkkk...', '.....kkkkkopk...', '.........kkkk...'] },
    pal: { k: '#e8709e', o: '#ffb347', p: '#ff6f91' },
  },

  // neck
  marigoldbig: {
    front: { y: 12, rows: ['...oyoy..yoyo...', '...oyoyoyoyoy...', '....oyoyoyoy....', '......oyyo......', '.......rr.......', '.......ww.......'] },
    side: { y: 12, rows: ['.....oyoyoy.....', '.....oyoyoyo....', '.........oy.....', '.........yo.....'] },
    back: { y: 12, rows: ['...oyoyoyoyoy...', '....oyoyoyoy....'] },
    pal: { o: '#f58f35', y: '#ffd23f', r: '#e8514a', w: '#fffaf0' },
  },
  goldchain: {
    front: { y: 13, rows: ['....yy....yy....', '.....yy..yy.....', '......yyyy......', '......yWWy......', '......yyyy......'] },
    side: { y: 13, rows: ['.........yy.....', '..........yy....', '..........yW....'] },
    back: { y: 13, rows: ['.....yyyyyy.....'] },
    pal: { y: '#ffd23f', W: '#fff3a6' },
  },
  moneygarland: {
    front: { y: 13, rows: ['....pg....bp....', '.....bp..gb.....', '......pgbp......', '......gbpg......', '.......yy.......'] },
    side: { y: 13, rows: ['.........pg.....', '..........bp....', '..........gb....'] },
    back: { y: 13, rows: ['.....pgbpgb.....'] },
    pal: { p: '#ff9fc0', g: '#6cc36a', b: '#9fd0ff', y: '#ffd54f' },
  },
  nagascale: {
    front: { y: 13, rows: ['.....t....t.....', '......y..y......', '.......tt.......', '.......yk.......'] },
    side: { y: 13, rows: ['.........t......', '..........y.....', '..........t.....'] },
    back: { y: 13, rows: ['.....tytyty.....'] },
    pal: { t: '#2fa88a', y: '#ffd54f', k: '#2a1a2c' },
  },
  pakaomasash: {
    front: { y: 13, rows: ['....rb..........', '.....br.........', '......rb........', '.......br.......', '........rb......', '.........br.....'] },
    side: { y: 13, rows: ['.........rb.....', '........br......', '.......rb.......', '......br........'] },
    back: { y: 13, rows: ['..........br....', '.........rb.....', '........br......', '.......rb.......', '......br........', '.....rb.........'] },
    pal: { r: '#e8514a', b: '#3d63b5' },
  },
  yantmedal: {
    front: { y: 13, rows: ['.....r....r.....', '......r..r......', '......gYYg......', '......YkkY......', '......gYYg......'] },
    side: { y: 13, rows: ['.........r......', '..........gY....', '..........Yk....'] },
    back: { y: 13, rows: ['.....rrrrrr.....'] },
    pal: { r: '#c0392f', g: '#e9a53a', Y: '#ffd54f', k: '#b8742a' },
  },

  // hand
  karipap: {
    front: { y: 15, rows: KARIPAP },
    side: { y: 15, rows: KARIPAP.map((r) => r.slice(1) + '.') },
    back: { y: 15, rows: flipRows(KARIPAP) },
    pal: { c: '#d0883a', o: '#f0b458', O: '#ffd98a', d: '#c07a3a' },
  },
  pakbung: {
    front: { y: 11, rows: PAKBUNG },
    side: { y: 11, rows: PAKBUNG.map((r) => r.slice(1) + '.') },
    back: { y: 11, rows: flipRows(PAKBUNG) },
    pal: { g: '#43905a', G: '#86c95f', r: '#e8514a', w: '#fbfcff', d: '#c9d6ea' },
  },
} satisfies Record<string, AccArt>)

// ---- v4 cosmetics (packs, battle pass, pop-culture drop) ----------------------

const ELE_PAL = { g: '#ffd54f', r: '#d8434f', m: '#aaa5c8', e: '#8a84ab', E: '#ffc4d8', k: '#2a1a2c', T: '#aaa5c8', t: '#8a84ab' }

Object.assign(ACC, {
  // head
  elephanthat: {
    front: { y: -3, rows: ['.......gg.......', '......grrg......', '....mmmmmmmm....', '..emmmmmmmmmme..', 'eemmkmmmmmmkmmee', 'eEmmmmmTTmmmmmEe', 'eErgrgrTTrgrgrEe', 'eE.....TT.....Ee', '.e......Tt....e.', '.........T......'] },
    back: { y: -3, rows: ['.......gg.......', '......grrg......', '....mmmmmmmm....', '..emmmmmmmmmme..', 'eemmmmmmmmmmmmee', 'eemmmmmmmmmmmmee', 'eergrgrgrgrgrgee', 'ee....rggr....ee', '.e....rrrr....e.', '......grrg......'] },
    side: { y: -3, rows: ['......gg........', '.....grrg.......', '....mmmmmmmm....', '..emmmmmmmmmm...', '.eemmmmmmmkmm...', '.eEmmmmmmmmmmT..', '.eErgrgrgrgrgT..', '.eE..........T..', '..e..........Tt.', '.............t..'] },
    pal: ELE_PAL,
  },
  basin: {
    front: { y: -2, rows: ['.....ssssss.....', '....sWsssssd....', '...sWsssssssd...', '..sWssssssssdd..', 'llllllllllllllll', '.dddddddddddddd.', '.r............r.', '.r............r.'] },
    back: { y: -2, rows: ['.....ssssss.....', '....sssssssd....', '...sssWssssssd..', '..ssssWsssssdd..', 'llllllllllllllll', '.dddddddddddddd.', '.r............r.', '.r............r.'] },
    side: { y: -2, rows: ['.....ssssss.....', '....sWsssssd....', '...sWsssssssd...', '..sWssssssssdd..', 'llllllllllllllll', '.dddddddddddddd.', '........r.......', '........r.......', '.........r......', '.........r......'] },
    pal: { s: '#c9d3e0', W: '#f8fbff', d: '#8a96a8', l: '#eef3fa', r: '#ff5fa8' },
  },
  rescuehelmet: {
    front: { y: -1, rows: ['.....wwwwww.....', '...wwwwyywwww...', '..wWwwkyykwwww..', '.wWwwwwrrwwwwwd.', '.aaaaaaaaaaaaaa.', '.wwwwwwrrwwwwwd.', '.kkkkkkkkkkkkkk.', ...HELMET_STRAP] },
    back: { y: -1, rows: ['.....wwwwww.....', '...wwwwrrwwww...', '..wWwwwrrwwwww..', '.wWwwwwrrwwwwwd.', '.aaaaaaaaaaaaaa.', '.wwwwwwrrwwwwwd.', '.kkkkkkkkkkkkkk.'] },
    side: { y: -1, rows: ['.....wwwwww.....', '...wwwwwwwyy....', '..wWrrrrrrrryk..', '.wWwwwwwwwwwwwd.', '.aaaaaaaaaaaaaa.', '.wwwwwwwwwwwwkk.', '.kkkkkkkkkkk....', '.......k........', '.......k........', '........k.......'] },
    pal: { w: '#fbfcff', W: '#ffffff', r: '#ff7a1a', d: '#c9ccda', k: '#3a3547', y: '#ffe45e', a: '#dfe8f5' },
  },
  tomyum: {
    front: { y: -4, rows: ['.......kk.......', '.r....bkbl....r.', 'rRoooobkboooooRr', 'r.bbbbbbbbbbbb.r', '...bBbbbbbbbd...', '...bbbbbbbbbd...', '....dddddddd....'] },
    back: { y: -4, rows: ['.......kk.......', '.r....bkb.....r.', 'rRoooobkboooooRr', 'r.bbbbbbbbbbbb.r', '...bbbbbbbbbd...', '...bbbbbbbbbd...', '....dddddddd....'] },
    side: { y: -4, rows: ['.......kk.......', '.r....bkbl......', 'rRoooobkbooooo..', 'r.bbbbbbbbbbbb..', '...bBbbbbbbbd...', '...bbbbbbbbbd...', '....dddddddd....'] },
    pal: { k: '#6e4a35', b: '#e9b949', B: '#fff0a0', d: '#b8802a', o: '#f0662e', r: '#f0662e', R: '#ffa060', l: '#86c95f' },
  },
  mangohat: {
    front: { y: -4, rows: ['..........g.....', '......yyyyyy....', '.....yYyyyyyo...', '...wwwyyyyyo....', '..wcwwwwwwwwd...', '.wwwjwwwjwwwwd..', 'gggggggggggggggg', '.GGGGGGGGGGGGGG.'] },
    back: { y: -4, rows: ['.....g..........', '....yyyyyy......', '...oyyyyyYy.....', '....oyyyyywww...', '...dwwwwwwwwcw..', '..dwwwwjwwwjwww.', 'gggggggggggggggg', '.GGGGGGGGGGGGGG.'] },
    side: { y: -4, rows: ['..........g.....', '......yyyyyy....', '.....yYyyyyyo...', '...wwwyyyyyo....', '..wcwwwwwwwwd...', '.wwwjwwwjwwwwd..', 'gggggggggggggggg', '.GGGGGGGGGGGGGG.'] },
    pal: { y: '#ffc93c', Y: '#ffe68a', o: '#e9a53a', w: '#fbfcff', c: '#fff8e8', j: '#ffd54f', d: '#dfe3ee', g: '#5ea653', G: '#3f7f45' },
  },
  mookata: {
    front: { y: -3, rows: ['.......ff.......', '.....kpwkk......', '....kkkkkpwk....', '...kkkkkkkkkk...', '..kkpwkkkkkkkk..', 'oovoowooovoowooo', '.nnnnnnnnnnnnnn.'] },
    back: { y: -3, rows: ['.......ff.......', '......kkpwk.....', '....kpwkkkkk....', '...kkkkkkkkkk...', '..kkkkkkkpwkkk..', 'oowoovoowoovoooo', '.nnnnnnnnnnnnnn.'] },
    side: { y: -3, rows: ['.......ff.......', '.....kpwkk......', '....kkkkkpwk....', '...kkkkkkkkkk...', '..kkpwkkkkkkkk..', 'oovoowooovoowooo', '.nnnnnnnnnnnnnn.'] },
    pal: { f: '#fff0b0', k: '#4a4458', p: '#f08a8a', w: '#fff0f0', o: '#d98a3a', v: '#5ea653', n: '#35303f' },
  },
  platu: {
    front: { y: -2, rows: ['..bbb.TTTT.bbb..', '.bssssT..Tssssb.', '.ks..........sk.', '..wwwwwwwwwwww..'] },
    back: { y: -2, rows: ['..bbb.TTTT.bbb..', '.bbbbbT..Tbbbbb.', '.kb..........bk.', '..wwwwwwwwwwww..'] },
    side: { y: -2, rows: ['......bbb.TT....', '.....bssssT.....', '.....ks.........', '..wwwwwwwwwwww..'] },
    pal: { b: '#5f7890', s: '#c9d6e6', k: '#2e3a4a', T: '#8a9cb0', w: '#c9a06b' },
  },
  malaibun: {
    front: { y: -3, rows: ['......hhhh......', '.....hHhhhh.....', '.....wowrow.....', '............ow..', '.............w..', '.............w..', '.............r..'] },
    back: { y: -3, rows: ['......hhhh......', '.....hHhhhhh....', '.....hhhhhhh....', '....wowrowow....', '.......ww.......', '.......wo.......', '.......ww.......', '.......rr.......'] },
    side: { y: -3, rows: ['.....hhhh.......', '....hHhhhh......', '....wowrow......', '...ow...........', '...w............', '...r............'] },
    pal: { h: '#3a2a2e', H: '#6a5058', w: '#fffaf0', o: '#ffb02e', r: '#e8514a' },
  },
  curlers: {
    front: { y: -2, rows: ['......pppp......', '...bbb....yyy...', '..bbbb.mm.yyyy..', '...........ppp..', '.yy............'] },
    back: { y: -2, rows: ['......pppp......', '...bbb....yyy...', '..bbbb.mm.yyyy..', '...mmm.pp.bbb...', '..yyy.bbb.mmmm..', '...pp.yyy.ppp...'] },
    side: { y: -2, rows: ['.....pppp.......', '...bbb...yyy....', '..bbbb.mm.yyy...', '.pp.............'] },
    pal: { p: '#ff9fc0', b: '#8fc4ff', y: '#ffe45e', m: '#7fd3b5' },
  },
  hippoears: {
    front: { y: -1, rows: ['..gg........gg..', '.gpg........gpg.', '..gggggggggggg..'] },
    back: { y: -1, rows: ['..gg........gg..', '.ggg........ggg.', '..gggggggggggg..'] },
    side: { y: -1, rows: ['.....gg.........', '....gpg.........', '..gggggggggggg..'] },
    pal: { g: '#a99db8', p: '#ff9fc0' },
  },

  // neck
  whistle: {
    front: { y: 13, rows: ['....o......o....', '.....o....o.....', '......oooo......', '......OOOk......'] },
    side: { y: 13, rows: ['.........o......', '..........oo....'] },
    back: { y: 13, rows: ['.....oooooo.....'] },
    pal: { o: '#ff8a2a', O: '#ffc080', k: '#3a2838' },
  },
  saimu: {
    front: { y: 13, rows: ['....rn....gb....', '.....yo..pv.....', '......gGGb......', '.......vv.......'] },
    side: { y: 13, rows: ['.........rn.....', '..........yG....', '..........v.....'] },
    back: { y: 13, rows: ['....rnygbvpr....'] },
    pal: { r: '#e8514a', n: '#ffb02e', y: '#ffe45e', g: '#5ea653', b: '#5a8de0', v: '#9a70dc', p: '#ff9fc0', G: '#e9a53a' },
  },
  sabaigenz: {
    front: { y: 13, rows: ['....ss..........', '.....sy.........', '......ss........', '.......ys.......', '........ss......'] },
    side: { y: 13, rows: ['.......ss.......', '........ys......', '.........ss.....'] },
    back: { y: 13, rows: ['..........ss....', '.........ys.....', '........ss......', '.......ys.......', '..........ss....', '..........ys....'] },
    pal: { s: '#8a4fd6', y: '#ffd54f' },
  },
  towel: {
    front: { y: 12, rows: ['.....bwbwbw.....', '.....w....b.....', '.....b....w.....', '.....w..........'] },
    side: { y: 12, rows: ['......bwbwb.....', '..........w.....', '..........b.....'] },
    back: { y: 12, rows: ['.....bwbwbw.....', '.....wbwbwb.....'] },
    pal: { b: '#5ab4e8', w: '#fbfcff' },
  },

  // hand
  bailer: {
    front: { y: 16, rows: ['...........pppp.', '..........hpPPpp', '............pps.', '..............w.'] },
    side: { y: 16, rows: ['..........pppp..', '.........hpPPpp.', '...........pps..'] },
    back: { y: 16, rows: ['.pppp...........', 'ppPPph..........', '.spp............'] },
    pal: { p: '#ff7eb6', P: '#ffb3d6', s: '#d9508f', h: '#ff7eb6', w: '#9fd8ff' },
  },
  megaphone: {
    front: { y: 13, rows: ['..............rw', '............wwrW', '...........kwwrW', '............wwrW', '............k.rw', '............k...'] },
    side: { y: 13, rows: ['.............rw.', '...........wwrW.', '..........kwwrW.', '...........wwrW.', '...........k.rw.'] },
    back: { y: 13, rows: ['wr..............', 'Wrww............', 'Wrwwk...........', 'Wrww............', 'wr.k............'] },
    pal: { w: '#fbfcff', W: '#d9dfec', r: '#e8514a', k: '#6a6478' },
  },
  lotusbouquet: {
    front: { y: 9, rows: ['............p...', '...........pPp.p', '..........p.p.pP', '..........pPg.g.', '...........gcg..', '...........ccc..', '............c...'] },
    side: { y: 9, rows: ['...........p....', '..........pPp.p.', '.........p.p.pP.', '.........pPg.g..', '..........gcg...', '..........ccc...'] },
    back: { y: 9, rows: ['...p............', 'p.pPp...........', 'Pp.p.p..........', '.g.gPp..........', '..gcg...........', '..ccc...........'] },
    pal: { p: '#e8709e', P: '#ffc4d8', g: '#43905a', c: '#d9b98a' },
  },
  ringlight: {
    front: { y: 5, rows: ['............www.', '...........w...w', '...........w.b.w', '...........w...w', '............www.', '.............k..', '.............k..', '............k...', '............k...', '............k...'] },
    side: { y: 5, rows: ['..........www...', '.........w...w..', '.........w.b.w..', '.........w...w..', '..........www...', '...........k....', '...........k....', '..........k.....', '..........k.....'] },
    back: { y: 5, rows: ['.www............', 'w...w...........', 'w.b.w...........', 'w...w...........', '.www............', '..k.............', '..k.............', '...k............', '...k............'] },
    pal: { w: '#fffbe6', b: '#3a3547', k: '#6a6478' },
  },
  jellybag: {
    front: { y: 16, rows: ['...........h..h.', '...........h..h.', '...........mmmmm', '...........mWgmM', '...........mmmmM'] },
    side: { y: 16, rows: ['.......h..h.....', '.......h..h.....', '......mmmmm.....', '......mWgmM.....', '......mmmmM.....'] },
    back: { y: 16, rows: ['.h..h...........', '.h..h...........', 'mmmmm...........', 'mWgmM...........', 'mmmmM...........'] },
    pal: { h: '#ff9fc0', m: '#aef0e0', M: '#7fd8c2', W: '#ffffff', g: '#ffd54f' },
  },
  dubaichoc: {
    front: { y: 12, rows: ['............gg..', '............cgg.', '............cCc.', '............cCc.', '............ff..'] },
    side: { y: 12, rows: ['...........gg...', '...........cgg..', '...........cCc..', '...........cCc..', '...........ff...'] },
    back: { y: 12, rows: ['..gg............', '.ggc............', '.cCc............', '.cCc............', '..ff............'] },
    pal: { c: '#6e4228', C: '#8a5634', g: '#9ccf5a', f: '#e9b949' },
  },
  krapaobox: {
    front: { y: 15, rows: ['............wY..', '...........bgwwb', '...........kkkkk', '............KKK.'] },
    side: { y: 15, rows: ['...........wY...', '..........bgwwb.', '..........kkkkk.', '...........KKK..'] },
    back: { y: 15, rows: ['..Yw............', 'bwwgb...........', 'kkkkk...........', '.KKK............'] },
    pal: { w: '#fffaf0', Y: '#ffb02e', b: '#8a5a3a', g: '#43905a', k: '#c9a06b', K: '#a8804e' },
  },
} satisfies Record<string, AccArt>)

// ---- back slot ---------------------------------------------------------------

interface BackPart {
  y: number
  rows: string[]
  /** Paint over the body instead of behind it. */
  over?: boolean
}

interface BackArt {
  front?: BackPart
  back?: BackPart
  side?: BackPart
  /** On the prostration mound (bow pose, seen from behind). */
  bow?: BackPart
  pal: Record<string, string>
}

const WINGS_FRONT = ['.ww..........ww.', 'wwWw........wWww', 'wWWw........wWWw', 'wWww........wwWw', '.wWw........wWw.', '..ww........ww..', '...w........w...']
const WINGS_BACK = ['ww............ww', 'wWww........wwWw', '.wWWw......wWWw.', '..wWWww..wwWWw..', '...wWWw..wWWw...', '....ww....ww....', '.....w....w.....']
const WINGS_SIDE = ['..ww............', '.wWww...........', 'wWWww...........', 'wWWw............', 'wWw.............', '.ww.............']
const WINGS_BOW = ['ww............ww', 'wWw..........wWw', '.wWww......wwWw.', '..wWWw....wWWw..']
const BF_FRONT = ['pp............pp', 'pPp..........pPp', 'pyPp........pPyp', 'pPPp........pPPp', '.pp..........pp.', 'cCc..........cCc', '.cc..........cc.']
const BF_BACK = ['pp............pp', 'pPpp........ppPp', 'pyPPp......pPPyp', '.pPPPpp..ppPPPp.', '..ppp......ppp..', '.cCcc......ccCc.', '..cc........cc..']
const BF_SIDE = ['pp..............', 'pPp.............', 'pyPp............', 'pPPp............', '.pp.............', 'cCc.............', '.cc.............']
const BF_BOW = ['pp............pp', 'pyPp........pPyp', '.pPPpp....ppPPp.', '..cCc......cCc..']
const BAG_STRAPS: BackPart = { y: 13, over: true, rows: ['.....k....k.....', '.....k....k.....', '.....k....k.....'] }
const BAG_BACK: BackPart = { y: 13, over: true, rows: ['......kkkk......', '.....ssssss.....', '.....mpmmpm.....', '.....mmgmmm.....', '.....mpmmpm.....', '.....smmmms.....', '......ssss......'] }
const BAG_SIDE: BackPart = { y: 13, over: true, rows: ['......k.........', '...ss.k.........', '..smm.k.........', '..smp...........', '..smm...........', '...ss...........'] }
const BAG_BOW: BackPart = { y: 16, over: true, rows: ['.....ssssss.....', '.....mpmmpm.....', '.....mmgmmm.....'] }

const BACK: Record<string, BackArt> = {
  angel: {
    front: { y: 11, rows: WINGS_FRONT },
    back: { y: 11, rows: WINGS_BACK, over: true },
    side: { y: 11, rows: WINGS_SIDE },
    bow: { y: 14, rows: WINGS_BOW, over: true },
    pal: { w: '#fbfcff', W: '#dfe4f2' },
  },
  butterfly: {
    front: { y: 10, rows: BF_FRONT },
    back: { y: 10, rows: BF_BACK, over: true },
    side: { y: 10, rows: BF_SIDE },
    bow: { y: 14, rows: BF_BOW, over: true },
    pal: { p: '#ff7eaa', P: '#b98ae6', y: '#ffe45e', c: '#5ec8e8', C: '#bff0ff' },
  },
  thaibag: {
    front: BAG_STRAPS,
    back: BAG_BACK,
    side: BAG_SIDE,
    bow: BAG_BOW,
    pal: { k: '#7e2436', m: '#c0392f', s: '#8e2533', p: '#ffd54f', g: '#ffd54f' },
  },
  schoolbag: {
    front: BAG_STRAPS,
    back: BAG_BACK,
    side: BAG_SIDE,
    bow: BAG_BOW,
    pal: { k: '#212a52', m: '#2e3a6b', s: '#212a52', p: '#2e3a6b', g: '#fbfcff' },
  },
  flag: {
    front: { y: -4, rows: ['........rrrrrk..', '.........yyyyk..', '........rrrrrk..', ...Array(17).fill('.............k..')] },
    back: { y: -4, over: true, rows: ['..krrrrr........', '..kyyyy.........', '..krrrrr........', ...Array(17).fill('..k.............')] },
    side: { y: -4, rows: ['...krrrrr.......', '...kyyyy........', '...krrrrr.......', ...Array(17).fill('...k............')] },
    bow: { y: 5, over: true, rows: ['.......rrrrrk...', '........yyyyk...', '.......rrrrrk...', ...Array(9).fill('............k...')] },
    pal: { r: '#e8514a', y: '#ffd54f', k: '#9a6a45' },
  },
  oxygen: {
    front: { y: 11, rows: ['...ww......ww...', '...wW......wW...'] },
    back: { y: 12, over: true, rows: ['.....wW..wW.....', '....wwWkkwwW....', '....wwWrgwwW....', '....wwWkkwwW....', '....wwWkkwwW....', '.....ww..ww.....'] },
    side: { y: 12, rows: ['..wW............', '.wwW............', '.wwW............', '.wwW............', '.wwW............', '..ww............'] },
    bow: { y: 15, over: true, rows: ['....wwWkkwwW....', '....wwWrgwwW....', '....wwWkkwwW....'] },
    pal: { w: '#f4f5fa', W: '#c9ccda', k: '#8a8496', r: '#e8514a', g: '#5ee0a0' },
  },
}

// ---- v4 back items ------------------------------------------------------------

/** A 1px-wide diagonal pole (with a wider blade at the far end) as 16-wide rows. */
function poleRows(x0: number, y0: number, x1: number, y1: number, bladeFrom: number, top: string, blade: string, pole: string): { y: number; rows: string[] } {
  const n = y1 - y0
  const rows: string[] = []
  for (let j = 0; j <= n; j++) {
    const x = Math.round(x0 + ((x1 - x0) * j) / n)
    const row = new Array(16).fill('.')
    const t = j / n
    if (t >= bladeFrom) {
      for (let w = -1; w <= 1; w++) if (x + w >= 0 && x + w < 16) row[x + w] = blade
    } else row[x] = j === 0 ? top : pole
    rows.push(row.join(''))
  }
  return { y: y0, rows }
}

const PADDLE_FRONT = poleRows(13, 5, 2, 22, 0.72, 'k', 'b', 'w')
const PADDLE_BACK = poleRows(2, 5, 13, 22, 0.72, 'k', 'b', 'w')

Object.assign(BACK, {
  duckring: {
    front: { y: 15, over: true, rows: ['.yy.............', 'oyk.............', '.yy.............', '.yllllllllllll..', 'yyyyyyyyyyyyyyy.', '.ssssssssssssss.'] },
    back: { y: 15, over: true, rows: ['.............yy.', '.............yyy', '.............yy.', '..llllllllllllly', '.yyyyyyyyyyyyyyy', '.ssssssssssssss.'] },
    side: { y: 15, over: true, rows: ['...........yy...', '...........kyo..', '...........yy...', '...llllllllll...', '..yyyyyyyyyyy...', '..sssssssssss...'] },
    bow: { y: 20, over: true, rows: ['.llllllllllllll.', 'yyyyyyyyyyyyyyyy'] },
    pal: { y: '#ffd23f', l: '#fff3a6', s: '#e0a820', o: '#ff8a2a', k: '#2a1a2c' },
  },
  rescuetube: {
    front: { y: 13, over: true, rows: ['.........k......', '........k.......', '.......k........', '......k.........', '.....k..........'] },
    back: { y: 12, over: true, rows: ['......rrww......', '.....r....w.....', '....r......w....', '....w......r....', '....w......r....', '.....w....r.....', '......wwrr......'] },
    side: { y: 12, rows: ['..rw............', '.r..............', '.w..............', '.w..............', '.r..............', '..wr............'] },
    bow: { y: 15, over: true, rows: ['......rrww......', '.....r....w.....', '.....w....r.....', '......wwrr......'] },
    pal: { r: '#e8514a', w: '#fbfcff', k: '#e0d6c0' },
  },
  paddle: {
    front: PADDLE_FRONT,
    back: { ...PADDLE_BACK, over: true },
    side: { y: 5, rows: poleRows(2, 5, 3, 22, 0.72, 'k', 'b', 'w').rows },
    bow: { y: 12, over: true, rows: ['..w.............', '...w............', '....w...........', '.....w..........', '......w.........', '.......bb.......', '........bb......'] },
    pal: { w: '#c28e5c', b: '#e0b27a', k: '#6e4a35' },
  },
  thaiteabag: {
    front: { ...BAG_STRAPS, rows: BAG_STRAPS.rows },
    back: { y: 8, over: true, rows: ['...........p....', '...........w....', '..........p.....', '..........p.....', '.........w......', '.....wwwwww.....', '.....oOoooo.....', '.....oooooo.....', '.....OOOOOO.....', '.....OkOkOO.....', '.....kOkOkO.....', '......OOOO......'] },
    side: { y: 13, rows: ['..ww............', '.oOo............', '.ooo............', '.OOO............', '.kOk............', '..O.............'] },
    bow: { y: 16, over: true, rows: ['.....wwwwww.....', '.....oOoooo.....', '.....OkOkOO.....'] },
    pal: { p: '#ff5fa8', w: '#eef6fb', o: '#ffb066', O: '#f58f35', k: '#2e2840' },
  },
  blindbox: {
    front: { y: 16, rows: ['..g.............', '.e.e............', '.fff............', '.kfk............', '.fTf............', '.f.f............'] },
    back: { y: 13, over: true, rows: ['.....pppppp.....', '.....pPPPPp.....', '.....pppppp.....', '.....ppppppg....', '..........e.e...', '..........fff...', '..........kfk...', '..........fTf...', '..........f.f...'] },
    side: { y: 14, rows: ['.pppp...........', '.pPPp...........', '.pppp...........', '..g.............', '.e.e............', '.fff............', '.kfk............', '.fTf............'] },
    bow: { y: 16, over: true, rows: ['.....pppppp.....', '.....pPPPPp.....'] },
    pal: { p: '#ffb3cf', P: '#e88aae', g: '#ffd54f', e: '#b58a70', f: '#c7a58a', k: '#2a1a2c', T: '#ffffff' },
  },
} satisfies Record<string, BackArt>)

/** Golden merit halo (รัศมี) drawn behind everything. */
function paintAura(ctx: CanvasRenderingContext2D, cx: number, cy: number, rad: number) {
  for (let y = -HEADROOM; y < FRAME_H - HEADROOM; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (d > rad + 0.5) continue
      const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx)
      const ray = Math.abs(Math.sin(ang * 6)) > 0.8
      ctx.fillStyle = d > rad - 0.8 ? (ray ? '#fff3a6' : '#e9a53a') : d > rad - 2 ? '#ffd54f' : '#fff3a6'
      ctx.fillRect(x, y + HEADROOM, 1, 1)
    }
  }
}

function paintBack(ctx: CanvasRenderingContext2D, id: string | null | undefined, part: 'front' | 'back' | 'side' | 'bow', dy: number, over: boolean) {
  if (!id) return
  const key = OUTFIT_BY_ID[id]?.acc
  if (!key) return
  if (key === 'aura') {
    if (over) return
    if (part === 'bow') paintAura(ctx, 7.5, 18, 7.6)
    else paintAura(ctx, 7.5, 6 + dy, 8.2)
    return
  }
  const art = BACK[key]
  const p = art?.[part]
  if (!p || !!p.over !== over) return
  paint(ctx, p.rows, p.y + dy, (k) => art.pal[k] ?? null)
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
    case 'hawaii':
      if ((x * 2 + y * 3) % 7 === 0) return 1
      if ((x * 2 + y * 3) % 7 === 3) return 2
      return 0
    case 'silk':
      return (x + y) % 4 === 0 ? 1 : 0
    case 'sequin':
      if ((x * 5 + y * 3) % 7 === 0) return 1
      if ((x * 5 + y * 3) % 7 === 4) return 2
      return 0
    case 'batik':
      if ((x + y * 2) % 6 === 0) return 1
      return (x * 2 + y) % 7 === 3 ? 2 : 0
    case 'mudmee':
      return (x + y) % 4 === 0 || (x - y + 40) % 4 === 0 ? 1 : 0
    case 'stars':
      if ((x * 3 + y * 5) % 9 === 0) return 1
      return (x * 3 + y * 5) % 9 === 5 ? 2 : 0
    case 'bands':
      // relative torso rows (see topColor)
      return y === 2 ? 1 : y === 3 ? 2 : 0
    case 'scale':
      if ((x * 3 + y * 5) % 17 === 0) return 2
      return y % 2 === 0 && (x + (Math.floor(y / 2) % 2) * 2) % 4 === 0 ? 1 : 0
    case 'wave':
      return y % 3 === 0 ? ((x + Math.floor(y / 3)) % 4 < 2 ? 1 : 2) : 0
    case 'grill':
      if (y % 3 === 1 && (x + y) % 4 < 2) return 1
      return (x * 2 + y) % 11 === 0 ? 2 : 0
    case 'denim':
    case 'knit':
      return 0
    default:
      return 0
  }
}

interface Resolved {
  skin: (typeof SKIN_TONES)[number]
  hair: (typeof HAIR_COLORS)[number]
  top: TopArt
  bottom: BottomArt
  shoes: ShoeArt | null
  barefoot: boolean
  view: View
  /** Vertical body offset of the current pose (kneel / sit). */
  dy: number
  /** Worn full-body suit, if any. */
  suit: SuitArt | null
}

function resolve(look: AvatarLook, barefoot: boolean): Resolved {
  const suit = (look.suit && OUTFIT_BY_ID[look.suit]?.suit) || null
  const g = suit ? suitGarments(suit) : null
  const top = g?.top ?? OUTFIT_BY_ID[look.top]?.top ?? OUTFIT_BY_ID.top_white.top!
  const bottom = g?.bottom ?? OUTFIT_BY_ID[look.bottom]?.bottom ?? OUTFIT_BY_ID.bot_khaki.bottom!
  return {
    skin: SKIN_TONES[look.skin] ?? SKIN_TONES[1],
    hair: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0],
    top,
    bottom,
    shoes: g?.shoes ?? (look.shoes ? OUTFIT_BY_ID[look.shoes]?.shoes ?? null : null),
    // onesie booties stay on when kneeling at the temple
    barefoot: barefoot && !g?.shoes,
    view: 'front',
    dy: 0,
    suit,
  }
}

/** Hooded suits hide the hair and most hats. */
const hooded = (r: Resolved) => !!r.suit && r.suit.head !== 'crown'

const SHOE = '#6e4a35'

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => {
    const x = (pa >> sh) & 255
    const y = (pb >> sh) & 255
    return Math.round(x + (y - x) * t)
  }
  return '#' + [ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function topColor(r: Resolved, code: string, x: number, y: number): string | null {
  const t = r.top
  const ry = y - 13 - r.dy
  switch (code) {
    case 'T':
    case 't': {
      const j = t.jacket
      if (j && (r.view === 'back' || r.view === 'side' || x <= 6 || x >= 9)) return code === 'T' ? j.main : j.shade
      const v = t.vest
      if (v && !(r.view === 'front' && ry <= 1 && (x === 7 || x === 8))) {
        if (r.view === 'front' && ry === 4 && v.trim) return v.trim
        return code === 'T' ? v.main : v.shade
      }
      if (t.collar === 'tank' && ry === 0) {
        if (r.view === 'side') return x === 6 || x === 7 ? t.main : r.skin.b
        return x === 5 || x === 10 ? t.main : r.skin.b
      }
      const hit = t.pattern === 'bands' ? patternHit('bands', x, ry) : patternHit(t.pattern, x, y)
      if (hit === 1 && t.patternColor) return t.patternColor
      if (hit === 2 && t.patternColor2) return t.patternColor2
      return code === 'T' ? t.main : t.shade
    }
    case 'C':
      if (r.suit && hooded(r)) return r.suit.main
      if (t.vest && !t.jacket) return t.collarColor ?? t.main
      switch (t.collar) {
        case 'shirt':
        case 'polo':
        case 'camp':
        case 'bua':
          return t.collarColor ?? mixHex(t.main, '#ffffff', 0.5)
        case 'mandarin':
          return t.collarColor ?? t.main
        case 'jersey':
          return t.trim ?? r.skin.b
        case 'hood':
          return t.shade
        case 'tank':
          return r.skin.b
      }
      if (t.extra === 'khon' || t.extra === 'likay') return t.extraColor ?? P.gold
      if (t.extra === 'astro') return t.collarColor ?? t.shade
      return t.extra === 'buttons' ? t.main : r.skin.b
    case 'A':
      if (t.jacket) return t.jacket.sleeve ?? t.jacket.main
      return t.sleeve === 'none' ? r.skin.b : t.cuff && t.sleeve === 'short' && ry >= 2 ? t.cuff : t.main
    case 'a':
      if (t.jacket) return t.jacket.sleeve ?? t.jacket.main
      if (t.sleeve === 'long' && t.cuff && ry >= 3) return t.cuff
      return t.sleeve === 'long' ? t.main : r.skin.b
    case 'H':
      return r.suit?.paws ?? r.skin.b
    case 's':
      return r.skin.b
  }
  return null
}

function legColor(r: Resolved, code: string, x: number, y: number): string | null {
  const b = r.bottom
  const pat = (base: string) => {
    const hit = patternHit(b.pattern, x, y)
    if (hit === 2 && b.patternColor2) return b.patternColor2
    return hit && b.patternColor ? b.patternColor : base
  }
  const shade = x >= 8
  const sh = r.barefoot ? null : r.shoes
  const sock = sh?.sock && (sh.sockH ?? 1) >= 2 ? sh.sock : null
  const ry = y - 19
  switch (code) {
    case 'W':
      if (b.detail === 'muay' && b.band) return b.bandText && (x === 7 || x === 9) ? b.bandText : b.band
      if (b.belt && y === 19) return x === 7 || x === 8 ? b.buckle ?? b.belt : b.belt
      return pat(b.main)
    case 'L':
      if (b.kind === 'pants' || b.kind === 'loose' || b.kind === 'jong' || b.kind === 'shorts') return pat(shade ? b.shade : b.main)
      return r.skin.b
    case 'K': {
      const boot = sh?.kind === 'boot' && ry >= 2
      if (boot) return x === 5 || x === 10 ? sh.shade : sh.main
      if (b.kind === 'pants' || (b.kind === 'loose' && b.length !== 'midi')) {
        if (b.detail === 'ripped' && ry === 2 && (x === 6 || x === 9)) return r.skin.b
        if (b.detail === 'pads' && ry === 2) return b.stripe ?? '#aeb4c8'
        return pat(shade ? b.shade : b.main)
      }
      if (sh?.kind === 'wrap') return x % 2 ? sh.main : r.skin.b
      return sock ?? r.skin.b
    }
    case 'F':
      if (r.barefoot) return r.skin.d
      if (!sh) return SHOE
      switch (sh.kind) {
        case 'flipflop':
        case 'sandal':
          return x % 2 ? sh.main : r.skin.b
        case 'wrap':
          return x === 5 || x === 10 ? sh.main : r.skin.b
        case 'slipper':
          return x === 4 || x === 11 ? sh.accent ?? sh.main : sh.main
        case 'clog':
          return x === 5 || x === 10 ? sh.accent ?? sh.main : sh.main
        case 'heel':
          return x === 6 || x === 9 ? sh.shade : sh.main
      }
      if (sh.glow) return x === 4 || x === 11 ? sh.glow[0] : x === 6 || x === 9 ? sh.glow[2 % sh.glow.length] : sh.main
      return sh.main
  }
  return null
}

// ---------------------------------------------------------------------------
// Full-body suits (ชุดมาสคอต). The suit's synthetic top / bottom / booties are
// painted by the normal pipeline (so every pose works); these maps add the
// hood, belly, tail, spikes... Rows are absolute body rows.
// Codes: m main (patterned), s shade, l light, d dark, b belly, B belly shade,
// a accent, A accent shade, c accent2, C accent2 shade, w white, W sparkle,
// k ink, p pink, r red, y gold, G rooster green, n brown, f/F hair fringe.

type SRows = [number, string[]]

interface SuitSm {
  /** Hair fringe peeking out under the hood. */
  fringe?: boolean
  /** Colour code for the hood rim around the face (fur, teeth, lining). */
  rim?: string
  /** Rim only on the sides/bottom (keeps the fringe row). */
  rimSides?: boolean
  front?: SRows[]
  back?: SRows[]
  side?: SRows[]
  bodyFront?: SRows[]
  bodyBack?: SRows[]
  bodySide?: SRows[]
  /** Tail seen from behind while standing (rows from `tailY`); also drawn behind the body in other views. */
  tail?: string[]
  tailY?: number
  /** Ridge of spikes down the back of a kneeling / bowing body. */
  ridge?: boolean
  /** Ears / fins / crowns over the hood crown of the prostration mound (absolute rows). */
  bow?: SRows[]
}

const HOOD_FRONT = [
  '.....mmmmmm.....',
  '...mmmmmmmmmm...',
  '..mllmmmmmmmms..',
  '.mllmmmmmmmmmss.',
  '.mlmmmmmmmmmmss.',
  '.mmmmmmmmmmmmss.',
  '.mmmmffffffmmss.',
  '.mmmf......fmss.',
  '.mm..........ss.',
  '.mm..........ss.',
  '.mm..........ss.',
  '..mm........ss..',
  '...mm......ss...',
]
const HOOD_RIM_FRONT = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....RRRRRR.....',
  '...rr......rr...',
  '..r..........r..',
  '..r..........r..',
  '..r..........r..',
  '...r........r...',
  '....r......r....',
]
const HOOD_BACK = [
  '.....mmmmmm.....',
  '...mmmmmmmmmm...',
  '..mmmmmmmmmmms..',
  '.mmmmmmmmmmmmss.',
  '.mmmmmmmmmmmmss.',
  '.mmmmmmmmmmmmss.',
  '.mmmmmmmmmmmmss.',
  '.mmmmmmmmmmmmss.',
  '.mmmmmmmmmmmmss.',
  '.mmmmmmmmmmmmss.',
  '.mmmmmmmmmmmmss.',
  '..mmmmmmmmmmss..',
  '...ssmmmmmmss...',
]
const HOOD_SIDE = [
  '.....mmmmmm.....',
  '...mmmmmmmmmm...',
  '..mllmmmmmmmmm..',
  '.mllmmmmmmmmmmm.',
  '.mlmmmmmmmmmmmm.',
  '.smmmmmmmmmmmmm.',
  '.smmmmmmmmffffm.',
  '.smmmmmmmf......',
  '.smmmmmm........',
  '.smmmmmm........',
  '.ssmmmmm........',
  '..ssmmmm........',
  '...ssmm.........',
]
const HOOD_RIM_SIDE = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........RRRR..',
  '.........r......',
  '.......r........',
  '.......r........',
  '.......r........',
  '.......r........',
  '......r.........',
]
/** Hood crown on the prostration mound (bow pose). */
const HOOD_BOW = ['......mmmm......', '.....mmmmmm.....', '....mmmmmmms....']

/** v4 suits (spread into SUIT_SM below). */
const V4_SUIT_SM: Record<'scuba' | 'rescue' | 'hippo' | 'monitor' | 'capybara' | 'butterbear', SuitSm> = {
  scuba: {
    rim: 'b',
    front: [
      [1, ['.............aa.', '.............aA.', '.............aA.', '.............aA.', '.............aA.', '.............aA.']],
      [7, ['...kkkkkkkkkk...', '...k..c.....k...', '...k........k...', '...kkkkkkkkkk...']],
    ],
    back: [[1, ['.aa.............', '.Aa.............', '.Aa.............', '.Aa.............', '.Aa.............']]],
    side: [
      [1, ['..aa............', '..aA............', '..aA............', '..aA............']],
      [7, ['.........kkkkk..', '.........k.c.k..', '.........k...k..', '.........kkkkk..']],
    ],
    bodyFront: [[14, ['.....b....b.....', '.....b....b.....', '.....b....b.....']]],
    bodyBack: [[13, ['......aaaa......', '......awaa......', '......kkkk......', '......awaA......', '......awaA......', '.......aA.......']]],
    bodySide: [[13, ['...aa...........', '...aw...........', '...kk...........', '...aA...........']]],
    bow: [[13, ['......awaa......', '......kkkk......']]],
  },
  rescue: {
    bodyFront: [[14, ['.........cc.....']], [16, ['.....aaaaaa.....']]],
    bodyBack: [[14, ['......cmmc......']], [16, ['.....aaaaaa.....']]],
    bodySide: [[16, ['.....aaaaa......']]],
  },
  hippo: {
    fringe: true,
    front: [
      [-1, ['...mm......mm...', '...ma......am...']],
      [2, ['....k......k....']],
      [4, ['......d..d......']],
      [9, ['.a............a.']],
    ],
    back: [[-1, ['...mm......mm...', '...mm......mm...']]],
    side: [[-1, ['.....mm.........', '.....ma.........']], [2, ['..........k.....']], [4, ['.............d..']]],
    bodyFront: [[14, ['......bbbb......', '.....bbbbbb.....', '.....bbbbbb.....', '......bbbb......']]],
    bodySide: [[14, ['.........bb.....', '.........bbb....', '.........bb.....']]],
    tail: ['.......mm.......', '........m.......'],
    tailY: 18,
    bow: [[12, ['...mm......mm...']]],
  },
  monitor: {
    fringe: true,
    front: [
      [-4, ['......c..c......', '.......cc.......', '......mmmm......', '.....mllmmm.....']],
      [3, ['...k........k...']],
    ],
    back: [[-2, ['......mmmm......', '.....mmmmmm.....']], [3, ['.......a........']], [6, ['........a.......']]],
    side: [[-3, ['..............c.', '.............c..', '.........mmmm...']], [3, ['..........k.....']]],
    bodyFront: [[14, ['......bbbb......', '......BBBB......', '......bbbb......', '......BBBB......', '......bbbb......']]],
    bodyBack: [[14, ['.......a........']], [17, ['........a.......']]],
    bodySide: [[14, ['.........bb.....', '.........BB.....', '.........bb.....']]],
    tail: ['.......ll.......', '........lla.....', '.........llla...', '..........llll..', '............lll.', '.............ll.'],
    tailY: 17,
    bow: [[12, ['......mmmm......']]],
  },
  capybara: {
    fringe: true,
    front: [
      [-4, ['.......GG.......', '......aaaG......', '.....aaaaa......', '......aaa.......']],
      [0, ['.mm..........mm.']],
      [3, ['....kk....kk....']],
      [5, ['......dddd......']],
    ],
    back: [[-4, ['.......GG.......', '......aaaG......', '.....aaaaa......', '......aaa.......']], [0, ['.mm..........mm.']]],
    side: [[-4, ['......GG........', '.....aaaG.......', '....aaaaa.......', '.....aaa........']], [0, ['....mm..........']], [3, ['..........kk....']], [5, ['.............dd.']]],
    bodyFront: [[14, ['......bbbb......', '.....bbbbbb.....', '.....bbbbbb.....', '......bbbb......']]],
    bodySide: [[14, ['.........bb.....', '.........bbb....', '.........bb.....']]],
    bow: [[10, ['.......GG.......', '......aaaG......', '......aaa.......']]],
  },
  butterbear: {
    fringe: true,
    front: [
      [-2, ['...........aaa..', '..mmm......mmmm.', '..mbm......mbm..']],
      [3, ['....k......k....']],
      [5, ['......bkkb......']],
    ],
    back: [[-2, ['..aaa...........', '..mmm......mmm..', '..mmm......mmm..']]],
    side: [[-2, ['........aaa.....', '......mmm.......', '......mbm.......']], [3, ['..........k.....']], [5, ['.............bk.']]],
    bodyFront: [[13, ['......aaaa......']], [15, ['......bbbb......', '.....bbbbbb.....', '......bbbb......']]],
    bodySide: [[14, ['.........bb.....', '.........bbb....']]],
    tail: ['.......mm.......', '.......mm.......'],
    tailY: 18,
    bow: [[12, ['..mmm......mmm..']]],
  },
}

const SUIT_SM: Record<SuitKind, SuitSm> = {
  ...V4_SUIT_SM,
  trex: {
    front: [
      [-2, ['.......aa.......', '...ww.aAAa.ww...', '...wk......kw...']],
      [4, ['......d..d......']],
      [7, ['.....w.ww.w.....']],
    ],
    back: [
      [-2, ['.......aa.......', '......aAAa......']],
      [2, ['.......aA.......']],
      [5, ['.......aA.......']],
      [8, ['.......aA.......']],
    ],
    side: [
      [-2, ['...aa...........', '..aAAa..ww......', '........wk......']],
      [2, ['.aA.............']],
      [5, ['aA..............']],
      [7, ['..........w.w...']],
    ],
    bodyFront: [[14, ['......bbbb......', '.....sBBBBs.....', '.....wbbbbw.....', '......BBBB......', '......bbbb......']]],
    bodyBack: [
      [14, ['.......aA.......']],
      [17, ['.......aA.......']],
    ],
    bodySide: [[15, ['..........sw....', '..........b.....']]],
    tail: ['.......ll.......', '......llla......', '.......lllaa....', '........llllaa..', '.........mllllA.', '..........bbmmm.'],
    tailY: 17,
    ridge: true,
    bow: [[12, ['.......aa.......', '......aAAa......']]],
  },
  shark: {
    rim: 'teeth',
    front: [
      [-3, ['........m.......', '.......mm.......', '......mmm.......']],
      [5, ['.k............k.']],
      [7, ['.d............d.', '.d............d.']],
    ],
    back: [[-3, ['........m.......', '.......ms.......', '......mms.......']]],
    side: [
      [-3, ['.....m..........', '.....mm.........', '.....mms........']],
      [5, ['........k.......']],
      [8, ['...d.d..........']],
    ],
    bodyFront: [[14, ['......bbbb......', '.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbb.....', '......bbbb......']]],
    bodySide: [[14, ['..........bb....', '.........bbb....', '.........bbb....', '..........bb....']]],
    tail: ['..............l.', '.......ll....ll.', '........llllll..', '.........llll...', '............ll..', '.............l..'],
    tailY: 16,
    bow: [[11, ['........m.......', '.......mm.......', '......mms.......']]],
  },
  frog: {
    fringe: true,
    front: [
      [-3, ['..www......www..', '.wwkkw....wkkww.', '.mwwwm....mwwwm.', '..mmm......mmm..']],
      [9, ['.p............p.']],
    ],
    back: [
      [-2, ['..sss......sss..', '.mmmmm....mmmmm.']],
      [3, ['....d......d....']],
      [7, ['......d..d......']],
    ],
    side: [[-3, ['.......www......', '......wwkkw.....', '......mwwwm.....', '.......mmm......']], [9, ['.........p......']]],
    bodyFront: [[14, ['......bbbb......', '.....bbbbbb.....', '.....bbbbbb.....', '......bbbb......']]],
    bodyBack: [[15, ['.....d....d.....']], [17, ['.......d........']]],
    bodySide: [[14, ['.........bb.....', '.........bbb....', '.........bb.....']]],
    bow: [[12, ['...sss....sss...', '...mmm....mmm...']]],
  },
  cat: {
    fringe: true,
    front: [
      [-2, ['..m..........m..', '.mam........mam.', '.mmm........mmm.']],
      [2, ['.......cc.......', '......c..c......']],
      [9, ['k..............k', '.k............k.']],
    ],
    back: [
      [-2, ['..m..........m..', '.mmm........mmm.', '.mmm........mmm.']],
      [2, ['.......cc.......', '......c..c......', '.....c....c.....']],
    ],
    side: [[-2, ['.......m........', '......mam.......', '......mmm.......']], [3, ['...c.c..........']], [9, ['...............k']]],
    bodyFront: [[14, ['......bbbb......', '......bbbb......', '......bbbb......', '.......bb.......']]],
    bodyBack: [[14, ['.....c....c.....']], [16, ['......c..c......']]],
    tail: ['..............b.', '.............mc.', '.............mm.', '.............cm.', '............mm..', '...........mc...', '.........mmm....', '........mc......'],
    tailY: 13,
    bow: [[12, ['....m......m....', '...mam....mam...']]],
  },
  penguin: {
    fringe: true,
    rim: 'b',
    rimSides: true,
    front: [
      [3, ['.....k....k.....']],
      [5, ['......aaaa......', '.......AA.......']],
    ],
    side: [[3, ['.........k......']], [5, ['..........aaa...', '..........AA....']]],
    bodyFront: [[13, ['......bbbb......', '.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbB.....', '......bbbB......']]],
    bodySide: [[14, ['.........bb.....', '.........bbb....', '.........bbb....', '.........bb.....']]],
    tail: ['.......ll.......', '.......mms......', '........ss......'],
    tailY: 18,
  },
  bunny: {
    fringe: true,
    front: [
      [-4, ['...mmm..........', '...mam......mm..', '...mam.....maam.', '...mam....mams..', '....m.....mm....']],
      [4, ['.......aa.......']],
    ],
    back: [[-4, ['..........mmm...', '..mm......mmm...', '.mmmm.....mmm...', '..smmm....mmm...', '....mm.....m....']]],
    side: [[-4, ['......mmm.......', '......mam.mm....', '......mammaam...', '......mamm......', '.......m........']], [4, ['.............a..']]],
    bodyFront: [[14, ['......bbbb......', '......bbbb......', '......bbbb......', '.......bb.......']]],
    tail: ['.......WW.......', '......WWWW......', '.......WW.......'],
    tailY: 18,
    bow: [[10, ['......mm........', '.....mmm.mmm....', '.....mm...mmm...', '......m....m....']]],
  },
  chicken: {
    fringe: true,
    front: [
      [-3, ['......a..a......', '.....aaaaaa.....', '......aAAa......']],
      [3, ['.....k....k.....']],
      [5, ['.......cc.......', '.......cC.......', '.......a........']],
    ],
    back: [[-3, ['......a..a......', '.....aaaaaa.....', '......aAAa......']]],
    side: [[-3, ['......a.a.......', '.....aaaaa......', '......aAA.......']], [4, ['.............cc.', '.............cC.', '.............a..']]],
    bodyFront: [[13, ['...bbbbbbbbbb...', '....bbbbbbbb....', '......bBBb......']]],
    bodyBack: [[13, ['...bbbbbbbbbb...', '....bbbbbbbb....', '.....bbbbbb.....']]],
    bodySide: [[13, ['....bbbbbbb.....', '.....bbbbb......']]],
    tail: ['............GG..', '...........GaaG.', '...........GyaG.', '..........GGaa..', '..........GGa...', '.........GGy....', '........GG......'],
    tailY: 13,
    bow: [[12, ['......a..a......', '......aaaa......']]],
  },
  elephant: {
    fringe: true,
    front: [
      [2, ['mmmm........mmmm', 'maam........maam', 'maam........maam', 'maam........maam', 'mmam........mamm', '.mm..........mm.']],
      [1, ['.......sd.......', '.......sd.......', '.......sd.......', '.......sd.......', '.......sd.......', '.......ssd......', '........sd......']],
      [4, ['.....k....k.....']],
      [6, ['......w..w......']],
    ],
    back: [[2, ['ssss........ssss', 'smms........smms', 'smms........smms', 'smms........smms', 'sssm........msss', '.ss..........ss.']]],
    side: [[2, ['...mmmm.........', '...maaam........', '...maaam........', '...mmaam........', '....mmm.........']], [4, ['..........k.....']], [5, ['.............sd.', '..............sd', '...............s']]],
    bodyBack: [[13, ['....yyyyyyyy....', '....ycccccCy....', '....ccycyccC....', '....ycccccCy....', '....yyyyyyyy....']]],
    bodySide: [[13, ['.....yyyyy......', '.....ccycc......', '.....yyyyy......']]],
    tail: ['........s.......', '........s.......', '.........s......', '.........k......'],
    tailY: 18,
    bow: [[14, ['.sss........sss.', '.smms......smms.', '..ss........ss..']]],
  },
  durian: {
    fringe: true,
    front: [
      [-3, ['.......n........', '.......nn.......']],
      [-1, ['....d.d..d.d....']],
      [3, ['d..............d']],
      [6, ['d..............d']],
      [9, ['d..............d']],
    ],
    back: [
      [-3, ['.......n........', '.......nn.......']],
      [-1, ['....d.d..d.d....']],
      [3, ['d..............d']],
      [6, ['d..............d']],
      [9, ['d..............d']],
    ],
    side: [[-3, ['.......n........', '.......nn.......']], [-1, ['....d.d.d.d.....']], [3, ['d...............']], [7, ['d...............']]],
    bodyFront: [
      [14, ['..d...bbbb...d..', '.....bBbbBb.....', '..d..bbBbbb..d..', '......bbbb......']],
      [18, ['..d..........d..']],
    ],
    bodyBack: [[14, ['..d..........d..']], [16, ['..d..........d..']], [18, ['..d..........d..']]],
    bodySide: [[14, ['....d...........']], [17, ['....d...........']]],
    ridge: true,
    bow: [[12, ['.......n........', '.....d.nnd......']], [16, ['.d............d.']], [19, ['d..............d']]],
  },
  banana: {
    fringe: true,
    front: [[-3, ['........n.......', '.......mn.......', '......mmm.......']], [3, ['....s......s....']]],
    back: [[-3, ['........n.......', '.......mn.......', '......mmm.......']], [4, ['.......s........']]],
    side: [[-3, ['.......n........', '......mn........', '.....mmm........']]],
    // peel flaps hanging from the waist
    bodyFront: [[18, ['..ccc.cccc.ccc..', '..cC..cccC..Cc..', '..C....cC....C..', '..n....nn....n..']]],
    bodyBack: [[18, ['..ccc.cccc.ccc..', '..cC..cccC..Cc..', '..C....cC....C..', '..n....nn....n..']]],
    bodySide: [[18, ['....cc.ccc......', '...cC...cC......', '...n.....n......']]],
    bow: [[11, ['........n.......', '.......mn.......', '......mmm.......']], [19, ['.cc..cccccc..cc.', '.n....nnnn....n.']]],
  },
  mango: {
    fringe: true,
    front: [
      [-3, ['.........cc.....', '....aaaaaCc.....', '...aAaaAaaa.....', '..aaaaAaaaaA....']],
      [2, ['......y.....y...']],
      [3, ['..W.........W...', '..W.............']],
      [5, ['...y.......y....']],
    ],
    back: [[-3, ['.....cc.........', '.....cCaaaaa....', '.....aaaAaaAa...', '....AaaaaAaaaa..']], [4, ['....y....y......']], [8, ['......y....y....']]],
    side: [[-3, ['......cc........', '..aaaaCc........', '.aAaaAaaa.......', 'aaaaaAaaaa......']], [4, ['..y.............']]],
    bodyFront: [
      [13, ['....WWWWWWWW....', '.....W.W..W.....', '.......W........']],
      [16, ['......y...y.....']],
      [18, ['.....y.....y....']],
    ],
    bodyBack: [[13, ['....WWWWWWWW....']], [15, ['......y...y.....']], [17, ['.....y....y.....']]],
    bow: [[11, ['.......cc.......', '....aaaaCc......', '...aAaaAaaa.....']], [18, ['...y......y.....']]],
  },
  moopin: {
    fringe: true,
    front: [
      [-4, ['.......a........', '.......a........', '.......a........', '.......a........']],
      [2, ['...cc.....cc....']],
      [4, ['.....cc.........']],
    ],
    back: [[-4, ['........a.......', '........a.......', '........a.......', '........a.......']], [3, ['...cc......cc...']]],
    side: [[-4, ['.......a........', '.......a........', '.......a........', '.......a........']], [3, ['...cc...........']]],
    bodyFront: [
      [14, ['......l.........']],
      [15, ['.....dddddd.....']],
      [17, ['.....dddddd.....']],
      [20, ['.......a........', '.......a........', '.......a........']],
    ],
    bodyBack: [[15, ['.....dddddd.....']], [17, ['.....dddddd.....']]],
    bodySide: [[15, ['.....dddddd.....']], [17, ['.....dddddd.....']]],
    bow: [[9, ['........a.......', '........a.......', '........a.......', '........a.......', '........a.......']], [18, ['..dddddddddddd..']]],
  },
  liondance: {
    rim: 'c',
    front: [
      [-3, ['.......aa.......', '......aAAa......', '......aaaa......']],
      [-1, ['.cc..........cc.', 'ccc..kkkkkk..ccc']],
      [1, ['...wwk....kww...', '...kkk....kkk...']],
      [4, ['.......WW.......']],
      [6, ['y..............y']],
    ],
    back: [[-3, ['.......aa.......', '......aAAa......', '......aaaa......']], [-1, ['.cc..........cc.', 'ccc..........ccc']], [5, ['c..............c']], [9, ['c..............c']]],
    side: [[-3, ['.......aa.......', '......aAAa......', '......aaaa......']], [-1, ['...cc...........', '..ccc...........']], [1, ['.........wwk....', '.........kkk....']], [6, ['...............y']]],
    bodyFront: [[14, ['......bbbb......', '......bBBb......', '......bbbb......']], [18, ['.....cccccc.....']]],
    bodyBack: [[18, ['.....cccccc.....']]],
    bodySide: [[18, ['.....cccccc.....']]],
    tail: ['..........cc....', '.........cycc...', '..........ccyc..', '...........ccc..', '............c...'],
    tailY: 17,
    bow: [[11, ['.......aa.......', '......aAAa......', '..cc..aaaa..cc..']]],
  },
  yak: {
    front: [
      [-4, ['.......aa.......', '.......aa.......', '......aAAa......', '.....aaaaaa.....', '....aAaaaaAa....']],
      [2, ['....rr....rr....', '....wwk..kww....']],
      [6, ['.....aaaaaa.....']],
      [10, ['...w........w...', '...w........w...']],
    ],
    back: [[-4, ['.......aa.......', '.......aa.......', '......aAAa......', '.....aaaaaa.....', '....aAaaaaAa....']], [6, ['.aaaaaaaaaaaaaa.']]],
    side: [[-4, ['.......aa.......', '.......aa.......', '......aAAa......', '.....aaaaaa.....', '....aAaaaaAa....']], [2, ['..........rr....', '..........wk....']], [6, ['.aaaaaaaaaaaaa..']], [10, ['.........w......', '.........w......']]],
    bodyFront: [[13, ['....bbbbbbbb....', '.....bbbbbb.....', '......bAAb......', '.......bb.......']], [18, ['.....aaaaaa.....']]],
    bodyBack: [[13, ['....bbbbbbbb....']], [18, ['.....aaaaaa.....']]],
    bodySide: [[13, ['.....bbbbb......', '.......bbb......']], [18, ['.....aaaaaa.....']]],
    bow: [[9, ['.......aa.......', '.......aa.......', '......aAAa......', '.....aaaaaa.....', '....aAaaaaAa....']], [17, ['..bbbbbbbbbbbb..']]],
  },
  nangkwak: {
    bodyFront: [[13, ['.....aaaaaa.....']], [16, ['...aa......aa...']]],
    bodyBack: [[13, ['.....aaaaaa.....']], [16, ['...aa......aa...']]],
    bodySide: [[13, ['.....aaaaa......']]],
  },
  ramkaebon: {
    bodyFront: [[16, ['...aa......aa...']]],
    bodyBack: [[16, ['...aa......aa...']]],
  },
  naga: {
    fringe: true,
    front: [
      [-4, ['........a.......', '.......aa..a....', '......aaa.aa....', '.....aAaaaa.....']],
      [3, ['....wk....kw....']],
    ],
    back: [[-4, ['........a.......', '.......aa..a....', '......aaa.aa....', '.....aAaaaa.....']], [2, ['.......aA.......']], [5, ['.......aA.......']], [8, ['.......aA.......']]],
    side: [[-4, ['.......a........', '......aa..a.....', '.....aaa.aa.....', '....aAaaaa......']], [3, ['.........wk.....']]],
    bodyFront: [[14, ['......bbbb......', '......BBBB......', '......bbbb......', '......BBBB......', '......bbbb......']]],
    bodyBack: [[14, ['.......aA.......']], [17, ['.......aA.......']]],
    bodySide: [[14, ['.........bb.....', '.........BB.....', '.........bb.....']]],
    tail: ['.............aa.', '............ll..', '...........ll...', '.......ll..ll...', '........lllll...', '..........bb....'],
    tailY: 17,
    ridge: true,
    bow: [[11, ['........a.......', '.......aa.a.....', '......aaaaa.....']]],
  },
}

/** Headdresses of the `crown` suits (hair stays visible). */
const SUIT_CROWN: Partial<Record<SuitKind, { front: SRows; back: SRows; side: SRows }>> = {
  // v4: the rescue uniform's built-in safety helmet with a head lamp
  rescue: {
    front: [-1, ['.....wwwwww.....', '...wwwwyywwww...', '..wWwwkyykwwww..', '.wwwwwwmmwwwwww.', '.aaaaaaaaaaaaaa.', '.wwwwwwmmwwwwww.', '.kkkkkkkkkkkkkk.']],
    back: [-1, ['.....wwwwww.....', '...wwwwmmwwww...', '..wWwwwmmwwwww..', '.wwwwwwmmwwwwww.', '.aaaaaaaaaaaaaa.', '.wwwwwwmmwwwwww.', '.kkkkkkkkkkkkkk.']],
    side: [-1, ['.....wwwwww.....', '...wwwwwwwyy....', '..wWmmmmmmmmyk..', '.wwwwwwwwwwwwww.', '.aaaaaaaaaaaaaa.', '.wwwwwwwwwwwwkk.', '.kkkkkkkkkkk....']],
  },
  nangkwak: {
    front: [-3, ['.......aa.......', '......aAAa......', '.....aaraaa.....', '....aAaaaaAa....']],
    back: [-3, ['.......aa.......', '......aAAa......', '.....aaaaaa.....', '....aAaaaaAa....']],
    side: [-3, ['.......aa.......', '......aAAa......', '.....aaraaa.....', '....aAaaaaAa....']],
  },
  ramkaebon: {
    front: [-4, ['.......aa.......', '.......aa.......', '......aAaa......', '......aaaa......', '.....aaraaa.....', '....aaaaaaaa....', '...aAaaAaaAaa...']],
    back: [-4, ['.......aa.......', '.......aa.......', '......aaaa......', '......aaaa......', '.....aaaaaa.....', '....aaaaaaaa....', '...aAaaAaaAaa...']],
    side: [-4, ['.......aa.......', '.......aa.......', '......aAaa......', '......aaaa......', '.....aaraaa.....', '....aaaaaaaa....', '...aAaaAaaAaa...']],
  },
}


function suitPal(r: Resolved, s: SuitArt): Record<string, string> {
  const belly = s.belly ?? mixHex(s.main, '#ffffff', 0.6)
  const acc = s.accent ?? s.shade
  const acc2 = s.accent2 ?? '#fffaf0'
  return {
    m: s.main,
    s: s.shade,
    l: mixHex(s.main, '#ffffff', 0.35),
    d: mixHex(s.shade, P.ink, 0.35),
    b: belly,
    B: mixHex(belly, s.shade, 0.3),
    a: acc,
    A: mixHex(acc, P.ink, 0.3),
    c: acc2,
    C: mixHex(acc2, P.ink, 0.25),
    w: '#fffaf0',
    W: '#ffffff',
    k: P.ink,
    p: P.pink,
    r: P.red,
    y: P.gold,
    G: '#2f5a4a',
    n: '#6e4a35',
    f: r.hair.b,
    F: r.hair.d,
  }
}

/** Colour of a hood / overlay code at (x, y); `m` carries the suit pattern. */
function suitColor(s: SuitArt, pal: Record<string, string>, fringe: boolean) {
  return (k: string, x: number, y: number): string | null => {
    if (k === 'm' && s.pattern) {
      const hit = patternHit(s.pattern, x, y)
      if (hit === 1 && s.patternColor) return s.patternColor
      if (hit === 2 && s.patternColor2) return s.patternColor2
    }
    if ((k === 'f' || k === 'F') && !fringe) return pal.m
    return pal[k] ?? null
  }
}

function paintRowsList(ctx: CanvasRenderingContext2D, list: SRows[] | undefined, dy: number, col: (k: string, x: number, y: number) => string | null) {
  if (!list) return
  for (const [y, rows] of list) paint(ctx, rows, y + dy, col)
}

/** Hood (or crown) of the current suit in place of the hair. */
function paintSuitHead(ctx: CanvasRenderingContext2D, r: Resolved, view: View, dy: number, hcol: (k: string) => string | null, hair: HairSet) {
  const s = r.suit!
  const art = SUIT_SM[s.kind]
  const pal = suitPal(r, s)
  const col = suitColor(s, pal, !!art.fringe)
  if (s.head === 'crown') {
    const hv = view === 'front' ? hair.front : view === 'back' ? hair.back : hair.side
    paint(ctx, hv.rows, hv.y + dy, hcol)
    const cr = SUIT_CROWN[s.kind]
    if (cr) {
      const [y, rows] = cr[view]
      paint(ctx, rows, y + dy, col)
    }
    return
  }
  paint(ctx, view === 'front' ? HOOD_FRONT : view === 'back' ? HOOD_BACK : HOOD_SIDE, dy, col)
  if (art.rim && view !== 'back') {
    const rimCol = (k: string, x: number, y: number): string | null => {
      if (k === 'R' && art.rimSides) return null
      if (art.rim === 'teeth') {
        // shark: white teeth on top and bottom, pink gums at the sides
        const ry = y - dy
        if (ry >= 11 || k === 'R') return (x + ry) % 2 ? pal.w : pal.c
        return pal.c
      }
      return pal[art.rim!] ?? null
    }
    paint(ctx, view === 'front' ? HOOD_RIM_FRONT : HOOD_RIM_SIDE, dy, rimCol)
  }
  paintRowsList(ctx, view === 'front' ? art.front : view === 'back' ? art.back : art.side, dy, col)
}

/** Belly, chest trims and spikes painted over the suit's torso. */
function paintSuitBody(ctx: CanvasRenderingContext2D, r: Resolved, view: View, pose: Pose, dy: number) {
  const s = r.suit!
  const art = SUIT_SM[s.kind]
  const pal = suitPal(r, s)
  const col = suitColor(s, pal, false)
  if (view === 'front') {
    // arms folded for a wai / sit cover the chest; keep the belly under them
    if (pose === 'wai') {
      const tmp = createCanvas(FRAME_W, FRAME_H)
      const tctx = tmp.getContext('2d')!
      paintRowsList(tctx, art.bodyFront, dy, col)
      tctx.clearRect(5, 13 + dy + HEADROOM, 6, 3)
      ctx.drawImage(tmp, 0, 0)
    } else paintRowsList(ctx, art.bodyFront, dy, col)
  } else if (view === 'back') paintRowsList(ctx, art.bodyBack, dy, col)
  else paintRowsList(ctx, art.bodySide, dy, col)
}

/**
 * Paint a tail map; pixels bordering the body (inside `x0..x1`) get the dark
 * shade so a same-coloured tail still reads against the suit.
 */
function paintTailRows(ctx: CanvasRenderingContext2D, rows: string[], y0: number, col: (k: string, x: number, y: number) => string | null, dark: string, x0: number, x1: number) {
  const at = (x: number, y: number) => (y >= 0 && y < rows.length && x >= 0 && x < rows[y].length ? rows[y][x] : '.')
  paint(ctx, rows, y0, (k, x, y) => {
    const j = y - y0
    const edge = N4S.some(([dx, dy]) => at(x + dx, j + dy) === '.' && x + dx >= x0 && x + dx <= x1 && y + dy <= 22)
    return edge && 'mlsb'.includes(k) ? dark : col(k, x, y)
  })
}

const N4S: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/** Tail: behind the body (front / side views) or over it (back view). */
function paintSuitTail(ctx: CanvasRenderingContext2D, r: Resolved, view: View, pose: Pose, stage: 'behind' | 'over') {
  const s = r.suit!
  const art = SUIT_SM[s.kind]
  if (!art.tail) return
  if ((view === 'back') !== (stage === 'over')) return
  const pal = suitPal(r, s)
  const col = suitColor(s, pal, false)
  const low = pose === 'kneel' || pose === 'sit'
  // kneeling / sitting: the tail lies flat on the floor
  const rows = low ? art.tail.slice(-3) : art.tail
  const y0 = low ? 20 : art.tailY ?? 18
  if (view === 'side') {
    // mirrored, trailing behind (to the left)
    paintTailRows(ctx, rows.map((row) => row.split('').reverse().join('')), y0 - 1, col, pal.d, 5, 10)
  } else paintTailRows(ctx, rows, y0, col, pal.d, 3, 12)
}

/** Premium shimmer: fixed glints inside the silhouette (hood + torso). */
const SPARKLES: Record<View, [number, number][]> = {
  front: [[4, 2], [12, 4], [3, 14], [12, 16], [10, 18]],
  back: [[4, 3], [11, 1], [12, 5], [3, 15], [9, 17], [6, 14]],
  side: [[3, 3], [6, 10], [9, 1], [6, 15], [8, 17]],
}

function paintSuitSparkle(ctx: CanvasRenderingContext2D, view: View, dy: number) {
  ctx.fillStyle = '#ffffff'
  for (const [x, y] of SPARKLES[view]) ctx.fillRect(x, y + dy + HEADROOM, 1, 1)
}

/** The prostration mound in a suit: hood crown, spikes, tail. */
function paintSuitBow(ctx: CanvasRenderingContext2D, r: Resolved, stage: 'crown' | 'over') {
  const s = r.suit!
  const art = SUIT_SM[s.kind]
  const pal = suitPal(r, s)
  const col = suitColor(s, pal, false)
  if (stage === 'crown') {
    if (s.head === 'crown') return false
    paint(ctx, HOOD_BOW, 14, col)
    // ears / fins / crowns peeking over the crown
    paintRowsList(ctx, art.bow, 0, col)
    return true
  }
  if (art.ridge) for (const y of [17, 19]) paint(ctx, ['.......aA.......'], y, col)
  if (s.kind === 'elephant') paint(ctx, ['....yyyyyyyy....', '....ccycyccC....'], 17, col)
  if (s.kind === 'chicken') paint(ctx, ['..bbbbbbbbbbbb..'], 17, col)
  if (art.tail) paintTailRows(ctx, art.tail.slice(-3), 20, col, pal.d, 2, 13)
  if (s.shimmer) {
    ctx.fillStyle = '#ffffff'
    for (const [x, y] of [[5, 15], [4, 18], [10, 19], [11, 17]]) ctx.fillRect(x, y + HEADROOM, 1, 1)
  }
  return true
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
      case 'q':
        return '#7fd3b5'
      case 'k':
        return mixHex(r.hair.b, r.skin.b, 0.35)
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

/**
 * Eye-style / body-preset tweaks on the 2×2 eyes of the small head (rows 7–9).
 * `cols` are the left columns of each eye.
 */
function faceRows(rows: string[], face: number, gender: BodyType, cols: number[]): string[] {
  const out = rows.slice()
  const set = (y: number, x: number, ch: string) => {
    out[y] = out[y].slice(0, x) + ch + out[y].slice(x + 1)
  }
  for (const c of cols) {
    const outer = c < 8 ? c - 1 : c + 2
    switch (face) {
      case 1: // smile arcs
        set(8, c, 's')
        set(8, c + 1, 's')
        break
      case 2: // sleepy: heavy lid, no shine
        set(8, c, 'E')
        set(8, c + 1, 'E')
        set(7, c, 'd')
        set(7, c + 1, 'd')
        break
      case 3: // sharp
        set(8, c, 'E')
        set(8, c + 1, 'E')
        set(9, c, c < 8 ? 's' : 'E')
        set(9, c + 1, c < 8 ? 'E' : 's')
        break
      case 4: // cat-eye lash
        set(7, outer, 'E')
        break
      case 5: // big eyes
        set(7, c, 'E')
        set(7, c + 1, 'E')
        set(8, c, 'e')
        break
    }
    if (gender === 'f' && face !== 4 && face !== 1) set(8, outer, 'E')
  }
  return out
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
  if (b.kind === 'skirt' || b.kind === 'pleated') {
    const short = b.length === 'mini' || b.length === 'short' || b.length === 'knee'
    const rows = (view === 'side' ? [[5, 10], [5, 11]] : [[5, 10], [4, 11]]).slice(0, short ? 1 : 2)
    rows.forEach(([a, z], j) => {
      for (let x = a; x <= z; x++) put(x, legsY + 1 + j, col(x, legsY + 1 + j, x >= 9 || (b.kind === 'pleated' && x % 2 === 1) ? b.shade : b.main))
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
  } else if (b.detail === 'muay') {
    // flared satin legs with a shiny stripe
    if (view !== 'side') {
      put(4, legsY + 1, b.main)
      put(11, legsY + 1, b.shade)
      put(5, legsY + 1, mixHex(b.main, '#ffffff', 0.45))
    } else put(11, legsY + 1, b.shade)
  }
}

/** Details from the richer TopArt params (school shirts, ties, jerseys...). */
function paintTopDetails(ctx: CanvasRenderingContext2D, r: Resolved, view: View, pose: Pose) {
  const t = r.top
  const put = (x: number, y: number, col: string | undefined) => {
    if (!col) return
    ctx.fillStyle = col
    ctx.fillRect(x, y + HEADROOM, 1, 1)
  }
  const Y = 13
  if (view === 'front' && pose !== 'wai') {
    if (t.tie === 'tie') {
      put(7, Y, t.tieColor)
      put(7, Y + 1, t.tieColor)
      put(7, Y + 2, t.tieColor)
      put(7, Y + 3, t.tieColor2 ?? t.tieColor)
    } else if (t.tie === 'bow') {
      put(6, Y + 1, t.tieColor)
      put(7, Y + 1, t.tieColor2 ?? t.tieColor)
      put(8, Y + 1, t.tieColor)
    } else if (t.tie === 'scarf') {
      put(6, Y, t.tieColor)
      put(9, Y, t.tieColor)
      put(7, Y + 1, t.tieColor)
      put(8, Y + 1, t.tieColor2 ?? t.tieColor)
    }
    if (t.emblem === 'school') put(t.emblemSide === 'l' ? 6 : 9, Y + 2, t.emblemColor ?? '#3d63b5')
    else if (t.emblem === 'crest') put(9, Y + 2, t.emblemColor)
    if (t.pocket === 'chest') put(9, Y + 3, t.shade)
    if (t.pin) put(6, Y + 2, t.pin)
    if (t.graphic) {
      put(7, Y + 2, t.graphicColor)
      put(8, Y + 2, t.graphicColor2 ?? t.graphicColor)
    }
    if (t.jacket) {
      put(7, Y + 1, t.main)
      put(8, Y + 1, t.main)
      if (t.jacket.emblem === 'letter') put(6, Y + 2, t.jacket.emblemColor)
    }
    if (t.collar === 'jersey' || t.collar === 'v') put(7, Y + 1, t.trim ?? t.shade)
    if (t.pocket === 'kangaroo') for (let x = 6; x <= 9; x++) put(x, Y + 4, t.shade)
  } else if (view === 'back') {
    if (t.number) {
      put(7, Y + 2, t.numberColor)
      put(8, Y + 2, t.numberColor)
      put(7, Y + 3, t.numberColor)
      put(8, Y + 4, t.numberColor)
    }
    if (t.jacket?.emblem === 'naga') {
      put(6, Y + 2, t.jacket.emblemColor)
      put(7, Y + 3, t.jacket.emblemColor)
      put(8, Y + 2, t.jacket.emblemColor2)
      put(9, Y + 3, t.jacket.emblemColor)
    }
    if (t.collar === 'shirt' || t.collar === 'polo' || t.collar === 'bua' || t.collar === 'mandarin') {
      for (let x = 6; x <= 9; x++) put(x, Y, t.collarColor ?? mixHex(t.main, '#ffffff', 0.5))
    }
    if (t.collar === 'hood' && t.extra !== 'hood') for (let x = 6; x <= 9; x++) put(x, Y + 1, t.shade)
  } else if (view === 'side') {
    if (t.tie === 'tie') put(10, Y + 1, t.tieColor)
    if (t.emblem === 'school' || t.emblem === 'crest') put(9, Y + 2, t.emblemColor)
    if (t.jacket) put(10, Y + 2, t.main)
  }
}

/** Vests, aprons and costume trims of the lifestyle pack. */
function paintTopLayers(ctx: CanvasRenderingContext2D, r: Resolved, view: View, pose: Pose) {
  const t = r.top
  const put = (x: number, y: number, col: string | undefined) => {
    if (!col) return
    ctx.fillStyle = col
    ctx.fillRect(x, y + HEADROOM, 1, 1)
  }
  const Y = 13
  const wai = pose === 'wai'
  const v = t.vest
  if (v) {
    if (view === 'back') {
      // big number patch
      for (let y = Y + 1; y <= Y + 3; y++) for (let x = 6; x <= 9; x++) put(x, y, v.patchColor ?? '#fffaf0')
      put(6, Y + 2, v.numberColor)
      put(7, Y + 1, v.numberColor)
      put(8, Y + 2, v.numberColor)
      put(9, Y + 1, v.numberColor)
      if (v.trim) for (let x = 5; x <= 10; x++) put(x, Y + 4, v.trim)
    } else if (view === 'front' && !wai) {
      put(9, Y + 2, v.patchColor ?? '#fffaf0')
      put(9, Y + 3, v.numberColor)
    } else if (view === 'side') {
      put(9, Y + 2, v.patchColor ?? '#fffaf0')
      if (v.trim) for (let x = 5; x <= 10; x++) put(x, Y + 4, v.trim)
    }
  }
  const ap = t.apron
  if (ap) {
    const cell = (x: number, y: number) => ((ap.pattern === 'check' || ap.pattern === 'plaid') && (x + y) % 2 === 0 && ap.patternColor ? ap.patternColor : x >= 9 ? ap.shade : ap.main)
    if (view === 'front') {
      put(6, Y, ap.strap ?? ap.shade)
      put(9, Y, ap.strap ?? ap.shade)
      const y0 = wai ? Y + 3 : Y + 1
      for (let y = y0; y <= Y + 7; y++) for (let x = 6; x <= 9; x++) put(x, y, cell(x, y))
      for (const x of [5, 10]) for (let y = Y + 4; y <= Y + 7; y++) put(x, y, cell(x, y))
      if (ap.pocket) {
        put(7, Y + 5, ap.shade)
        put(8, Y + 5, ap.shade)
      }
      put(5, Y + 4, ap.strap ?? ap.shade)
      put(10, Y + 4, ap.strap ?? ap.shade)
    } else if (view === 'back') {
      for (let x = 5; x <= 10; x++) put(x, Y + 5, ap.strap ?? ap.shade)
      put(7, Y + 6, ap.strap ?? ap.shade)
      put(8, Y + 6, ap.strap ?? ap.shade)
      put(7, Y, ap.strap ?? ap.shade)
      put(8, Y, ap.strap ?? ap.shade)
    } else {
      for (let y = Y + 1; y <= Y + 7; y++) put(10, y, cell(10, y))
      for (let x = 5; x <= 9; x++) put(x, Y + 5, ap.strap ?? ap.shade)
    }
  }
  const ec = t.extraColor ?? P.gold
  if (t.extra === 'likay' || t.extra === 'khon') {
    // jewelled shoulder pieces (อินทรธนู) curling up
    if (view !== 'side') {
      put(3, Y - 1, ec)
      put(12, Y - 1, ec)
      put(3, Y, ec)
      put(4, Y, ec)
      put(11, Y, ec)
      put(12, Y, ec)
    } else {
      put(8, Y - 1, ec)
      put(7, Y, ec)
      put(8, Y, ec)
    }
    if (view === 'front' && !wai) {
      for (let x = 6; x <= 9; x++) put(x, Y, ec)
      if (t.extra === 'khon') {
        for (let x = 5; x <= 10; x++) put(x, Y + 1, x === 5 || x === 10 ? mixHex(ec, '#000000', 0.25) : ec)
        put(7, Y + 2, '#e8514a')
        put(8, Y + 2, '#7fd3b5')
      } else {
        put(7, Y + 1, '#ff5e8a')
        put(8, Y + 1, ec)
        for (let x = 5; x <= 10; x++) put(x, Y + 5, ec)
      }
    } else if (view === 'back') {
      for (let x = 6; x <= 9; x++) put(x, Y, ec)
      if (t.extra === 'likay') for (let x = 5; x <= 10; x++) put(x, Y + 5, ec)
    }
  } else if (t.extra === 'astro') {
    if (view === 'front' && !wai) {
      for (let x = 6; x <= 9; x++) put(x, Y + 2, '#6c6678')
      put(6, Y + 2, '#e8514a')
      put(7, Y + 2, '#ffe45e')
      put(8, Y + 2, '#5ee0a0')
      put(3, Y + 1, '#e8514a')
      put(4, Y + 1, ec)
    } else if (view === 'side') {
      put(7, Y + 1, '#e8514a')
      put(8, Y + 1, ec)
    }
  }
  if (t.placket === 'double' && view === 'front' && !wai) {
    for (const y of [Y + 1, Y + 3]) {
      put(6, y, t.buttonColor)
      put(9, y, t.buttonColor)
    }
  }
}

function paintTopExtras(ctx: CanvasRenderingContext2D, r: Resolved, view: View, pose: Pose) {
  paintTopDetails(ctx, r, view, pose)
  paintTopLayers(ctx, r, view, pose)
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

function paintAccUnder(ctx: CanvasRenderingContext2D, id: string | null | undefined, view: View, dy: number) {
  if (!id) return
  const art = ACC[OUTFIT_BY_ID[id]?.acc ?? '']
  const part = art?.under?.[view]
  if (part) paint(ctx, part.rows, part.y + dy, (k) => art.pal[k] ?? null)
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

/** v4 swim fins: widen the lowest row of feet outwards (forwards in side view). */
function paintFins(ctx: CanvasRenderingContext2D, legs: string[], legsY: number, view: View, sh: ShoeArt) {
  let j = legs.length - 1
  while (j >= 0 && !legs[j].includes('F')) j--
  if (j < 0) return
  const row = legs[j]
  const y = legsY + j + HEADROOM
  ctx.fillStyle = sh.shade
  for (let x = 0; x < row.length; x++) {
    if (row[x] !== 'F') continue
    const leftEnd = x === 0 || row[x - 1] !== 'F'
    const rightEnd = x === row.length - 1 || row[x + 1] !== 'F'
    if (view === 'side') {
      if (rightEnd) ctx.fillRect(x + 1, y, 2, 1)
    } else {
      if (leftEnd && x < 8) ctx.fillRect(x - 1, y, 1, 1)
      if (rightEnd && x >= 8) ctx.fillRect(x + 1, y, 1, 1)
    }
  }
}

export interface AvatarRenderOptions {
  barefoot?: boolean
  frame?: number
}

/** Compose an avatar frame (unoutlined 16×27 canvas). */
export function composeAvatar(look: AvatarLook, view: View, pose: Pose, opts: AvatarRenderOptions = {}): HTMLCanvasElement {
  const r = resolve(look, opts.barefoot ?? false)
  r.view = view
  const c = createCanvas(FRAME_W, FRAME_H)
  const ctx = c.getContext('2d')!
  const hairItem = OUTFIT_BY_ID[look.hair]
  const hair = HAIR[hairItem?.hair ?? 'bob'] ?? HAIR.bob
  const hcol = hairColorFn(r, HAIR_RIBBON[hairItem?.hair ?? ''] ?? '#e8514a')
  const head = headColorFn(r)
  const tcol = (k: string, x: number, y: number) => topColor(r, k, x, y)
  const lcol = (k: string, x: number, y: number) => legColor(r, k, x, y)

  if (pose === 'bow') {
    // Prostration seen from behind.
    paintBack(ctx, look.back, 'bow', 0, false)
    paint(ctx, BOW_BACK.legs, 21, lcol)
    paint(ctx, BOW_BACK.torso, 17, tcol)
    if (!(r.suit && paintSuitBow(ctx, r, 'crown'))) paint(ctx, BOW_BACK.hair, 14, hcol)
    if (r.suit) paintSuitBow(ctx, r, 'over')
    paintBack(ctx, look.back, 'bow', 0, true)
    return c
  }

  // Vertical offset of head+torso for lower poses.
  const low = pose === 'kneel' ? 3 : pose === 'sit' ? 3 : 0
  const bob = pose === 'pass' ? -1 : 0
  const dy = low + bob
  r.dy = dy

  // Things worn on the back that sit behind the body (wings, aura...).
  paintBack(ctx, look.back, view, dy, false)
  if (r.suit) paintSuitTail(ctx, r, view, pose, 'behind')

  // Hair behind the body.
  if (view === 'front' && hair.behind && pose !== 'sit' && !hooded(r)) paint(ctx, hair.behind.rows, hair.behind.y + dy, hcol)

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
  if (!r.barefoot && r.shoes?.kind === 'flipper' && pose !== 'kneel' && pose !== 'sit') paintFins(ctx, legs, legsY, view, r.shoes)
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

  if (r.suit) {
    paintSuitBody(ctx, r, view, pose, dy)
    paintSuitTail(ctx, r, view, pose, 'over')
  }

  // Neck accessories sit on top of the torso (a face mask goes on after the head).
  const mask = look.neck === 'neck_mask'
  if (!mask && hairItem && view !== 'back') paintAcc(ctx, look.neck, view, dy)
  if (!mask && view === 'back') paintAcc(ctx, look.neck, view, dy)
  // Backpacks, wings seen from behind...
  paintBack(ctx, look.back, view, dy, true)
  // Hooded / crowned suits hide hats (glasses and face paint stay).
  const headAcc = r.suit && !SUIT_FACE_ACCS.has(OUTFIT_BY_ID[look.head ?? '']?.acc ?? '') ? null : look.head
  paintAccUnder(ctx, headAcc, view, dy)

  // Head.
  const closed = pose === 'happy' || pose === 'wai'
  let headRows = view === 'front' ? (closed ? HEAD_FRONT_CLOSED : HEAD_FRONT) : view === 'side' ? HEAD_SIDE : HEAD_BACK
  if (!closed && view !== 'back') headRows = faceRows(headRows, look.face ?? 0, look.gender, view === 'front' ? [4, 10] : [10])
  paint(ctx, headRows, dy, head)

  // Long hair behind in side view is part of the side map.
  if (r.suit) paintSuitHead(ctx, r, view, dy, hcol, hair)
  else {
    const hv = view === 'front' ? hair.front : view === 'back' ? hair.back : hair.side
    paint(ctx, hv.rows, hv.y + dy, hcol)
  }

  if (mask) paintAcc(ctx, look.neck, view, dy)
  paintAcc(ctx, headAcc, view, dy)
  paintAcc(ctx, look.hand, view, dy)
  if (r.suit?.shimmer) paintSuitSparkle(ctx, view, dy)
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
  return [l.gender, l.skin, l.face, l.hairColor, l.hair, l.top, l.bottom, l.head ?? '', l.neck ?? '', l.hand ?? '', l.shoes ?? '', l.back ?? '', l.suit ?? ''].join('|')
}

/** Portrait (head and shoulders) for lists and leaderboards. */
export function avatarPortrait(look: AvatarLook): Sprite {
  const key = `portrait:${lookKey(look)}`
  return cached(key, () => {
    const full = avatarSprite(look, 'front', 'stand')
    // Crop an 18×18 square around the head (skipping the headroom rows).
    const tall = ['elephanthat', 'tomyum', 'mangohat', 'mookata', 'malaibun', 'curlers', 'ngob', 'lotus', 'chefhat', 'chada', 'likay', 'bunnyears', 'spacehelmet', 'helmetcute', 'sleepcap', 'yakhat', 'chadaprang', 'ngobpomelo', 'pineapple', 'gamecock', 'doibeanie', 'carriagehat']
    const top = look.hair === 'hair_bun' || look.hair === 'hair_jook' || !!look.suit || tall.includes(OUTFIT_BY_ID[look.head ?? '']?.acc ?? '') ? 1 : 3
    const c = createCanvas(18, 18)
    const ctx = c.getContext('2d')!
    ctx.drawImage(full.canvas, 0, top, 18, 18, 0, 0, 18, 18)
    return { canvas: c, w: 18, h: 18 }
  })
}

// Re-exported so the sprite gallery can list them.
export const HAIR_STYLES = Object.keys(HAIR)
export { paintRows }
