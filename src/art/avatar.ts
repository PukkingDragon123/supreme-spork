// Layered chibi avatar. Body parts are authored once as region-coded pixel
// maps; clothing items only supply colours, sleeve types and patterns, so a
// handful of maps produce every outfit in every pose.

import { createCanvas } from '../engine/pixel'
import { cached, outlineCanvas, paintRows, type Sprite } from '../engine/sprite'
import { HAIR_COLORS, P, SKIN_TONES } from './palette'
import { OUTFIT_BY_ID, type BottomArt, type Pattern, type ShoeArt, type TopArt } from '../game/data/outfits'

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
}

function resolve(look: AvatarLook, barefoot: boolean): Resolved {
  const top = OUTFIT_BY_ID[look.top]?.top ?? OUTFIT_BY_ID.top_white.top!
  const bottom = OUTFIT_BY_ID[look.bottom]?.bottom ?? OUTFIT_BY_ID.bot_khaki.bottom!
  return {
    skin: SKIN_TONES[look.skin] ?? SKIN_TONES[1],
    hair: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0],
    top,
    bottom,
    shoes: look.shoes ? OUTFIT_BY_ID[look.shoes]?.shoes ?? null : null,
    barefoot,
    view: 'front',
  }
}

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
  switch (code) {
    case 'T':
    case 't': {
      const j = t.jacket
      if (j && (r.view === 'back' || r.view === 'side' || x <= 6 || x >= 9)) return code === 'T' ? j.main : j.shade
      const hit = patternHit(t.pattern, x, y)
      if (hit === 1 && t.patternColor) return t.patternColor
      if (hit === 2 && t.patternColor2) return t.patternColor2
      return code === 'T' ? t.main : t.shade
    }
    case 'C':
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
      }
      return t.extra === 'buttons' ? t.main : r.skin.b
    case 'A':
      if (t.jacket) return t.jacket.sleeve ?? t.jacket.main
      return t.sleeve === 'none' ? r.skin.b : t.cuff && t.sleeve === 'short' && y >= 15 ? t.cuff : t.main
    case 'a':
      if (t.jacket) return t.jacket.sleeve ?? t.jacket.main
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
  const sh = r.shoes
  const sock = !r.barefoot && sh?.sock && (sh.sockH ?? 1) >= 2 ? sh.sock : null
  switch (code) {
    case 'W':
      if (b.belt && y === 19) return x === 7 || x === 8 ? b.buckle ?? b.belt : b.belt
      return pat(b.main)
    case 'L':
      if (b.kind === 'pants' || b.kind === 'loose' || b.kind === 'jong' || b.kind === 'shorts') return pat(shade ? b.shade : b.main)
      return r.skin.b
    case 'K':
      if (b.kind === 'pants' || (b.kind === 'loose' && b.length !== 'midi')) return pat(shade ? b.shade : b.main)
      return sock ?? r.skin.b
    case 'F':
      if (r.barefoot) return r.skin.d
      if (!sh) return SHOE
      if (sh.kind === 'flipflop' || sh.kind === 'sandal') return x % 2 ? sh.main : r.skin.b
      return sh.main
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

function paintTopExtras(ctx: CanvasRenderingContext2D, r: Resolved, view: View, pose: Pose) {
  paintTopDetails(ctx, r, view, pose)
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
  const closed = pose === 'happy' || pose === 'wai'
  let headRows = view === 'front' ? (closed ? HEAD_FRONT_CLOSED : HEAD_FRONT) : view === 'side' ? HEAD_SIDE : HEAD_BACK
  if (!closed && view !== 'back') headRows = faceRows(headRows, look.face ?? 0, look.gender, view === 'front' ? [4, 10] : [10])
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
  return [l.gender, l.skin, l.face, l.hairColor, l.hair, l.top, l.bottom, l.head ?? '', l.neck ?? '', l.hand ?? '', l.shoes ?? ''].join('|')
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
