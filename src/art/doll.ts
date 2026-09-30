// HD "doll" avatar: a 32×50 chibi (34×52 with outline) used by the dress-up
// screen, the HUD portrait and the prayer scene. The small 16×27 sprite in
// avatar.ts is still used for walking around the world.
//
// Everything is procedural. Parts are painted back-to-front into a pixel
// buffer as *layers*; when a layer is committed, its edge pixels that touch
// something already painted become a darker "line" colour, so overlapping
// parts (arm over torso, fringe over face...) separate cleanly. The whole
// silhouette then gets a 1px ink outline.

import { createCanvas, mix } from '../engine/pixel'
import { cached, outlineCanvas, type Sprite } from '../engine/sprite'
import { HAIR_COLORS, P, SKIN_TONES } from './palette'
import { OUTFIT_BY_ID, SUIT_FACE_ACCS, suitGarments, type BottomArt, type Pattern, type ShoeArt, type SuitArt, type SuitKind, type TopArt } from '../game/data/outfits'
import { lookKey, type AvatarLook } from './avatar'
import { bodyOf, bodyWiden, BROW_HEX, DOLL_HEIGHT, IRIS, LIP_HEX, planIsIdentity, reshapeIndex, type BodyLook, type ReshapePlan } from './body'

export type BaseDollPose = 'stand' | 'wave' | 'wai' | 'happy' | 'think' | 'kneel' | 'kneelWai' | 'bow' | 'sit'
/**
 * Built-in poses plus action poses registered by other modules with
 * `registerDollPose('act_<name>', …)` (e.g. mini-games showing the player
 * tossing food, striking a bell, sweeping).
 */
export type DollPose = BaseDollPose | `act_${string}`
export type DollView = 'front' | 'back'

const IW = 32
const IH = 50
/** Frame width including the 1px outline. */
export const DOLL_W = IW + 2
/** Frame height including the 1px outline. Feet/knees rest on the bottom row. */
export const DOLL_H = IH + 2

/** Eye styles, indexed by AvatarLook.face. */
export const FACE_STYLES = [
  { id: 0, name: 'ตากลมวิบวับ' },
  { id: 1, name: 'ตายิ้มหยี' },
  { id: 2, name: 'ตาปรือชิล ๆ' },
  { id: 3, name: 'ตาคมเท่' },
  { id: 4, name: 'ตาแมวเฉี่ยว' },
  { id: 5, name: 'ตาโตใสแป๋ว' },
  { id: 6, name: 'ตาหวานวิ้ง' },
  { id: 7, name: 'ตาอัลมอนด์' },
  { id: 8, name: 'ตาเข้มมุ่งมั่น' },
] as const

export const DOLL_POSES: DollPose[] = ['stand', 'wave', 'wai', 'happy', 'think', 'kneel', 'kneelWai', 'bow', 'sit']

// ---------------------------------------------------------------------------
// Colours

const INK = P.ink
const WHITE = '#ffffff'
const EYE_K = '#2a1a2c'
const MOUTH = '#a8435a'
const TONGUE = '#ff8f9c'

interface Mat {
  l: string
  b: string
  s: string
  d: string
}

function mat(b: string, s?: string, l?: string): Mat {
  const sh = s ?? mix(b, INK, 0.22)
  return { l: l ?? mix(b, '#ffffff', 0.35), b, s: sh, d: mix(sh, INK, 0.5) }
}

// ---------------------------------------------------------------------------
// Raster

const N4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const TAG = { none: 0, skin: 1, face: 2, hair: 3, cloth: 4, eye: 5, deco: 6 }

const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < IW && y < IH

class Buf {
  c: (string | null)[] = new Array(IW * IH).fill(null)
  t = new Uint8Array(IW * IH)
  put(x: number, y: number, col: string | null | undefined, tag = TAG.deco) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (!col || !inb(x, y)) return
    const i = y * IW + x
    this.c[i] = col
    this.t[i] = tag
  }
  get(x: number, y: number) {
    return inb(x, y) ? this.c[y * IW + x] : null
  }
  tag(x: number, y: number) {
    return inb(x, y) ? this.t[y * IW + x] : 0
  }
  /** Body reshape applied when rasterising (height / build, art/body.ts). */
  plan: ReshapePlan | null = null
  canvas(): HTMLCanvasElement {
    const p = this.plan
    const idx = p && !planIsIdentity(p, 0) ? reshapeIndex(p) : null
    const H = idx ? p!.outH : IH
    const cv = createCanvas(IW, H)
    const ctx = cv.getContext('2d')!
    for (let i = 0; i < IW * H; i++) {
      const c = idx ? (idx[i] >= 0 ? this.c[idx[i]] : null) : this.c[i]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(i % IW, Math.floor(i / IW), 1, 1)
    }
    return cv
  }
}

class Layer {
  m = new Map<number, string>()
  put(x: number, y: number, c: string | null | undefined) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (!c || !inb(x, y)) return
    this.m.set(y * IW + x, c)
  }
  has(x: number, y: number) {
    return inb(x, y) && this.m.has(y * IW + x)
  }
  get(x: number, y: number) {
    return inb(x, y) ? this.m.get(y * IW + x) : undefined
  }
  del(x: number, y: number) {
    if (inb(x, y)) this.m.delete(y * IW + x)
  }
  shift(dx: number, dy: number): Layer {
    const L = new Layer()
    for (const [i, c] of this.m) L.put((i % IW) + dx, Math.floor(i / IW) + dy, c)
    return L
  }
}

/** Paint a layer; edge pixels touching earlier paint become `line`. */
function commit(b: Buf, L: Layer, line: string | null, tag: number) {
  const out: [number, string][] = []
  for (const [i, c] of L.m) {
    let col = c
    if (line) {
      const x = i % IW
      const y = (i - x) / IW
      for (const [dx, dy] of N4) {
        const nx = x + dx
        const ny = y + dy
        if (!inb(nx, ny)) continue
        const ni = ny * IW + nx
        if (!L.m.has(ni) && b.c[ni] !== null) {
          col = line
          break
        }
      }
    }
    out.push([i, col])
  }
  for (const [i, col] of out) {
    b.c[i] = col
    b.t[i] = tag
  }
}

/** Build a layer from region-coded rows. */
function rowsLayer(rows: string[], ox: number, oy: number, pal: (ch: string, x: number, y: number) => string | null | undefined, L = new Layer()): Layer {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j]
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '.' || ch === ' ') continue
      L.put(ox + i, oy + j, pal(ch, ox + i, oy + j))
    }
  }
  return L
}

// ---------------------------------------------------------------------------
// Patterns (absolute pixel coordinates so they don't swim between poses)

const ELEPHANT = ['.###..', '#####.', '##.##.', '#..#..']
const FLOWER = ['.1.', '121', '.1.']
const HIBISCUS = ['.11..', '1111.', '11211', '.111.', '..3..']
const BATIK = ['.1.1.', '11211', '.222.', '11211', '.1.1.']
const STAR = ['.1.', '111', '.1.']
const MOON = ['11', '.1']

function patHD(p: Pattern | undefined, x: number, y: number): 0 | 1 | 2 | 3 {
  switch (p) {
    case 'dots':
      return y % 4 === 1 && (x + (Math.floor(y / 4) % 2) * 2) % 4 === 1 ? 1 : 0
    case 'stripes':
      return y % 3 === 0 ? 1 : 0
    case 'plaid': {
      const a = x % 4 === 1
      const c = y % 4 === 1
      return a && c ? 2 : a || c ? 1 : 0
    }
    case 'check':
      return (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? 1 : 0
    case 'lace':
      return (y % 3 === 0 && x % 2 === 0) || (y % 3 === 1 && x % 4 === 1) ? 1 : 0
    case 'thai': {
      const u = (x + y) % 6
      const v = (((x - y) % 6) + 6) % 6
      if (u === 3 && v === 3) return 2
      return u === 0 || v === 0 ? 1 : 0
    }
    case 'floral': {
      const ty = Math.floor(y / 5)
      const tx = (x + (ty % 2) * 3) % 6
      const ry = y % 5
      if (ry < 3 && tx < 3) {
        const ch = FLOWER[ry][tx]
        return ch === '1' ? 1 : ch === '2' ? 2 : 0
      }
      return 0
    }
    case 'hawaii': {
      const ty = Math.floor(y / 7)
      const tx = (x + (ty % 2) * 4) % 8
      const ry = y % 7
      if (ry < 5 && tx < 5) {
        const ch = HIBISCUS[ry][tx]
        return ch === '1' ? 1 : ch === '2' ? 0 : ch === '3' ? 2 : 0
      }
      return tx === 6 && ry === 5 ? 2 : 0
    }
    case 'elephant': {
      const ty = Math.floor(y / 6)
      const tx = (x + (ty % 2) * 4) % 8
      const ry = y % 6
      if (ry < 4 && tx < 6) return ELEPHANT[ry][tx] === '#' ? 1 : 0
      return 0
    }
    case 'silk':
      return (x + y * 2) % 9 === 0 || (x + y * 2) % 9 === 1 ? 1 : 0
    case 'denim':
      return (x + y) % 3 === 0 ? 1 : 0
    case 'knit':
      return (x + (y % 2)) % 2 === 0 && y % 2 === 0 ? 1 : 0
    case 'sequin':
      if ((x * 5 + y * 3) % 13 === 0) return 2
      return (x + y) % 2 === 0 && (x * 3 + y) % 4 === 0 ? 1 : 0
    case 'batik': {
      const ty = Math.floor(y / 7)
      const tx = (x + (ty % 2) * 4) % 8
      const ry = y % 7
      if (ry < 5 && tx < 5) {
        const ch = BATIK[ry][tx]
        return ch === '1' ? 1 : ch === '2' ? 2 : 0
      }
      return (tx === 6 && ry === 6) || (tx === 7 && ry === 5) ? 1 : 0
    }
    case 'mudmee': {
      // ikat diamonds with a bright core, banded every 8 rows
      const u = x % 5
      const v = y % 4
      if (y % 8 === 7) return 2
      const d = Math.abs(u - 2) + Math.abs(v - 1.5)
      if (d < 0.6) return 2
      return d > 1.4 && d < 2.1 ? 1 : 0
    }
    case 'stars': {
      const ty = Math.floor(y / 6)
      const tx = (x + (ty % 2) * 4) % 8
      const ry = y % 6
      if (ry < 3 && tx < 3) return STAR[ry][tx] === '1' ? 1 : 0
      if (ry >= 3 && ry < 5 && tx >= 5 && tx < 7) return MOON[ry - 3][tx - 5] === '1' ? 2 : 0
      return 0
    }
    case 'bands':
      return y === 28 || y === 29 ? 1 : y === 31 ? 2 : 0
    case 'scale': {
      // overlapping half-round scales with the odd golden glint
      const ty = Math.floor(y / 3)
      const tx = (x + (ty % 2) * 2) % 4
      if ((x * 7 + y * 3) % 31 === 0) return 2
      return (y % 3 === 2 && tx !== 0) || (y % 3 === 1 && (tx === 0 || tx === 3)) ? 1 : 0
    }
    case 'wave': {
      // stepped zig-zag bands (ซิ่นลายน้ำไหล)
      const band = Math.floor(y / 4)
      const ry = y % 4
      if (ry === 3) return 0
      const zig = (x + band * 2) % 8
      const h = zig < 4 ? zig : 7 - zig
      return h === ry ? (band % 2 ? 2 : 1) : 0
    }
    case 'grill':
      // diagonal char marks + a few fatty highlights
      if ((x + y) % 6 === 0 && y % 5 !== 0) return 1
      return (x * 3 + y * 2) % 23 === 0 ? 2 : 0
    default:
      return 0
  }
}

// ---------------------------------------------------------------------------
// Resolved look

interface Res {
  g: 'm' | 'f'
  face: number
  sk: Mat
  blush: string
  hr: Mat & { shine: string; stub: string; stub2: string }
  top: TopArt
  bottom: BottomArt
  shoes: ShoeArt | null
  hair: string
  head: string | null
  neck: string | null
  hand: string | null
  back: string | null
  bare: boolean
  /** Worn full-body suit, if any. */
  suit: SuitArt | null
  /** Body & face options (art/body.ts). */
  body: BodyLook
  /** Torso widening per side and the row it starts at (arms above it are pre-shifted). */
  bw: number
  bwY: number
}

function resolve(look: AvatarLook, bare: boolean): Res {
  const tone = SKIN_TONES[look.skin] ?? SKIN_TONES[1]
  const hc = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]
  const sk: Mat = { l: tone.l, b: tone.b, s: mix(tone.b, tone.d, 0.6), d: mix(tone.d, INK, 0.4) }
  const acc = (id: string | null | undefined) => (id ? OUTFIT_BY_ID[id]?.acc ?? null : null)
  const suit = (look.suit && OUTFIT_BY_ID[look.suit]?.suit) || null
  const g = suit ? suitGarments(suit) : null
  const headAcc = acc(look.head)
  return {
    g: look.gender === 'm' ? 'm' : 'f',
    face: look.face ?? 0,
    sk,
    blush: mix(tone.b, P.blush, 0.6),
    hr: {
      l: hc.l,
      b: hc.b,
      s: mix(hc.b, hc.d, 0.55),
      d: mix(hc.d, INK, 0.35),
      shine: mix(hc.l, '#ffffff', 0.55),
      stub: mix(hc.b, tone.b, 0.22),
      stub2: mix(hc.b, tone.b, 0.4),
    },
    top: g?.top ?? OUTFIT_BY_ID[look.top]?.top ?? OUTFIT_BY_ID.top_white.top!,
    bottom: g?.bottom ?? OUTFIT_BY_ID[look.bottom]?.bottom ?? OUTFIT_BY_ID.bot_khaki.bottom!,
    shoes: g?.shoes ?? (look.shoes ? OUTFIT_BY_ID[look.shoes]?.shoes ?? null : null),
    hair: OUTFIT_BY_ID[look.hair]?.hair ?? 'bob',
    // hoods and headdresses hide hats; glasses and face paint stay
    head: suit && headAcc && !SUIT_FACE_ACCS.has(headAcc) ? null : headAcc,
    neck: acc(look.neck),
    hand: acc(look.hand),
    back: acc(look.back),
    // onesie booties stay on when kneeling at the temple
    bare: bare && !g?.shoes,
    suit,
    body: bodyOf(look),
    bw: 0,
    bwY: 24,
  }
}

const DEFAULT_SHOE: ShoeArt = { kind: 'shoe', main: '#8a5a3c', shade: '#6e4a35', sole: '#4a3128', accent: '#b07a52' }

// ---------------------------------------------------------------------------
// Head & face. Stand coordinates: skull rows 6..23, columns 6..25.

const HEAD_TOP = 6
/** Skull spans (rows 6..23) by FACE_SHAPES index: round, square, V, chubby cheeks. */
const FACE_SPANS: [number, number][][] = [
  [[11, 20], [9, 22], [8, 23], [7, 24], [7, 24], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [7, 24], [8, 23], [9, 22], [10, 21], [12, 19]],
  [[11, 20], [9, 22], [8, 23], [7, 24], [7, 24], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [7, 24], [8, 23], [10, 21]],
  [[11, 20], [9, 22], [8, 23], [7, 24], [7, 24], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [7, 24], [8, 23], [9, 22], [11, 20], [12, 19], [14, 17]],
  [[11, 20], [9, 22], [8, 23], [7, 24], [7, 24], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [6, 25], [5, 26], [5, 26], [6, 25], [7, 24], [9, 22], [11, 20]],
]
const spansOf = (r: Res) => FACE_SPANS[r.body.faceShape] ?? FACE_SPANS[0]

function drawHead(b: Buf, r: Res, dy: number, view: DollView) {
  // ears (behind the face edge)
  const ear = new Layer()
  for (const [x0, s] of [
    [4, 1],
    [27, -1],
  ] as const) {
    const xi = x0
    const xo = x0 + s
    ear.put(xo, 15 + dy, r.sk.b)
    ear.put(xi, 16 + dy, r.sk.b)
    ear.put(xo, 16 + dy, view === 'front' ? r.sk.s : r.sk.b)
    ear.put(xi, 17 + dy, r.sk.b)
    ear.put(xo, 17 + dy, view === 'front' ? r.sk.s : r.sk.b)
    ear.put(xo, 18 + dy, r.sk.b)
  }
  commit(b, ear, r.sk.d, TAG.skin)
  const L = new Layer()
  const spans = spansOf(r)
  spans.forEach(([x0, x1], j) => {
    const y = HEAD_TOP + j + dy
    for (let x = x0; x <= x1; x++) {
      let c = r.sk.b
      if (view === 'front') {
        if (x === x1 && j >= 8) c = r.sk.s
        if (j === spans.length - 1) c = r.sk.s
      } else if (x >= x1 - 1 && j >= 6) c = r.sk.s
      L.put(x, y, c)
    }
  })
  commit(b, L, r.sk.d, view === 'front' ? TAG.face : TAG.skin)
}

// Eye maps for the viewer-left eye (top-left at x=10,y=15). k dark outline,
// p pupil (dark iris), i iris light, w white shine, l lash, s lid skin,
// c lid crease. The right eye is mirrored; `keep` keeps shines on the same
// side in both eyes (light comes from one direction).
interface EyeMap {
  rows: string[]
  ox?: number
  oy?: number
  /** Keep shine pixels at the same relative spot in both eyes. */
  keep?: boolean
  lash?: [number, number]
  /** Arc / line eyes: no iris, so colour, size and lid options don't apply. */
  arc?: boolean
}

const EYES: EyeMap[] = [
  // 0 round sparkly
  { rows: ['.kk.', 'kwpk', 'kwpk', 'kppk', 'kiik', '.kk.'], keep: true, lash: [-1, 1] },
  // 1 gentle smile arcs
  { rows: ['....', '.kk.', 'k..k', 'k..k', '....'], oy: 1, lash: [-1, 1], arc: true },
  // 2 calm / sleepy: heavy lid, half-visible iris
  { rows: ['....', 'ssss', 'kkkk', 'kwpk', 'kiik', '.kk.'], keep: true, lash: [-1, 2] },
  // 3 sharp cool: slanted upper lid
  { rows: ['k....', 'kkkkk', '.wppk', '.ppik', '..kk.'], ox: -1, oy: 1, keep: true },
  // 4 cat-eye with a lash flick
  { rows: ['l....', 'lkkkk', '.kwpk', '.kppk', '.kiik', '..kk.'], ox: -1, keep: true },
  // 5 big glassy eyes with double shine
  { rows: ['.kkk.', 'kwwpk', 'kwppk', 'kpppk', 'kiiwk', '.kkk.'], ox: -1, keep: true, lash: [-1, 1] },
  // 6 sweet sparkle: shine top and a twinkle below
  { rows: ['.kk.', 'kwpk', 'kppk', 'kpwk', 'kiik', '.kk.'], keep: true, lash: [-1, 1] },
  // 7 almond: long and gentle
  { rows: ['.kkkk', 'kwwpk', 'kwpik', 'kpiik', '.kkk.'], ox: -1, oy: 1, keep: true, lash: [-1, 1] },
  // 8 determined: lid dips toward the nose
  { rows: ['kk..', 'kkkk', 'kwpk', 'kwpk', 'kiik', '.kk.'], keep: true, lash: [-1, 1] },
]

const EYE_CLOSED: EyeMap = { rows: ['....', '....', 'k..k', '.kk.'], oy: 2, arc: true }
const EYE_HAPPY: EyeMap = { rows: ['....', '.kk.', 'k..k', '....'], oy: 1, arc: true }
const EYE_BLINK: EyeMap = { rows: ['....', '....', '....', 'kkkk'], oy: 1, arc: true }

export type Expr = 'smile' | 'open' | 'serene' | 'happy' | 'think'

const setCh = (row: string, i: number, ch: string) => row.slice(0, i) + ch + row.slice(i + 1)

/**
 * The player's open eye: the style map plus body options — boys get a
 * defined flat upper lid and sit a pixel lower (room for brows), then size,
 * lid and shine tweaks. Lashes are resolved separately (see eyeLashes).
 */
function buildEye(r: Res): EyeMap {
  const f = r.body
  const base = EYES[r.face] ?? EYES[0]
  if (base.arc) return r.g === 'm' ? { ...base, oy: (base.oy ?? 0) + 1 } : base
  let rows = base.rows.slice()
  let ox = base.ox ?? 0
  let oy = base.oy ?? 0
  const w0 = rows[0].length
  // span of the first solid row below the top (where the lid sits)
  const extent = (j: number) => {
    const row = rows[j] ?? ''
    const a = row.search(/[^.]/)
    let b2 = row.length - 1
    while (b2 >= 0 && row[b2] === '.') b2--
    return [a, b2] as const
  }
  const fillRow = (j: number, ch: string, from = j + 1) => {
    const [a, b2] = extent(from)
    if (a < 0) return
    let row = rows[j]
    for (let i = a; i <= b2; i++) if (row[i] !== 'l') row = setCh(row, i, ch)
    rows[j] = row
  }
  const top = rows.findIndex((row) => /[kp]/.test(row))
  if (r.g === 'm') {
    // flat, defined upper lid instead of the rounded top
    if (/^\.k+\.$/.test(rows[top])) fillRow(top, 'k')
    oy += 1
  }
  // eyelid style
  if (f.eyelid === 1) {
    fillRow(top, 'k')
    // the heavier lid hides the top shine: move it down a row
    const j = top + 1
    if (rows[j] && rows[j + 1]) {
      for (let i = 0; i < w0; i++) {
        if (rows[j][i] === 'w' && /[pi]/.test(rows[j + 1][i])) {
          rows[j] = setCh(rows[j], i, 'k')
          rows[j + 1] = setCh(rows[j + 1], i, 'w')
        } else if (rows[j][i] === 'p') rows[j] = setCh(rows[j], i, 'k')
      }
    }
  } else if (f.eyelid === 2) {
    // a soft crease above the lid, leaning to the outer corner
    const [a, b2] = extent(top)
    let crease = '.'.repeat(w0)
    for (let i = Math.max(0, a - 1); i < b2; i++) crease = setCh(crease, i, 'c')
    rows = [crease, ...rows]
    oy -= 1
  } else if (f.eyelid === 3 && base !== EYES[2]) {
    fillRow(top, 's')
    fillRow(top + 1, 'k', top + 1)
  }
  // size
  const lidRows = f.eyelid === 2 ? 1 : 0
  if (f.eyeSize === 0 && rows.length - lidRows >= 5) {
    // drop a repeated middle row (or the one above the bottom)
    let j = rows.findIndex((row, i) => i > top + lidRows && i < rows.length - 2 && row === rows[i - 1])
    if (j < 0) j = rows.length - 2
    rows.splice(j, 1)
    oy += 1
  } else if (f.eyeSize === 2) {
    const mid = Math.floor((top + lidRows + rows.length) / 2)
    rows.splice(mid, 0, rows[mid])
    // widen through the pupil column
    const c = Math.floor(w0 / 2)
    rows = rows.map((row) => row.slice(0, c) + row[c] + row.slice(c))
    ox -= 1
  }
  // shine
  const W = rows[0].length
  if (f.shine === 3) rows = rows.map((row) => row.replace(/w/g, 'p'))
  else if (f.shine === 2) {
    rows = rows.map((row, j) => {
      let out = row
      for (let i = 0; i < W - 1; i++) if (row[i] === 'w' && row[i + 1] === 'p' && j > 0 && rows[j - 1][i] !== 'w') out = setCh(out, i + 1, 'w')
      return out
    })
  } else if (f.shine === 1) {
    // a twinkle low on the far side of the iris
    for (let j = rows.length - 3; j >= 1; j--) {
      const i = W - 2
      if (rows[j][i] === 'p' || rows[j][i] === 'i') {
        rows[j] = setCh(rows[j], i, 'w')
        break
      }
    }
  }
  const lash = base.lash ? ([base.lash[0], base.lash[1] + (rows.length > base.rows.length && f.eyelid === 2 ? 1 : 0)] as [number, number]) : undefined
  return { ...base, rows, ox, oy, lash }
}

/** Lashes: girls by default, anyone who turns them on, nobody who turns them off. */
function eyeLashes(r: Res) {
  const l = r.body.lashes
  return l === 1 || (l === 0 && r.g === 'f')
}

function drawEye(b: Buf, e: EyeMap, left: boolean, dy: number, r: Res, lashOk: boolean) {
  const w = e.rows[0].length
  const baseX = 10 + (e.ox ?? 0)
  const oy = 15 + (e.oy ?? 0) + dy
  const iris = IRIS[r.body.eyeColor] ?? IRIS[0]
  const lashes = eyeLashes(r)
  const irisLight = r.g === 'm' && iris.im ? iris.im : iris.i
  const col = (ch: string) =>
    ch === 'k'
      ? EYE_K
      : ch === 'p'
        ? iris.p
        : ch === 'i'
          ? irisLight
          : ch === 'w'
            ? WHITE
            : ch === 'l'
              ? INK
              : ch === 's'
                ? r.sk.s
                : ch === 'c'
                  ? mix(r.sk.s, r.sk.d, 0.55)
                  : null
  for (let j = 0; j < e.rows.length; j++) {
    for (let i = 0; i < w; i++) {
      let ch = e.rows[j][i]
      if (!left) {
        ch = e.rows[j][w - 1 - i]
        if (e.keep) {
          const orig = e.rows[j][i]
          if (ch === 'w' && orig !== 'w') ch = 'p'
          if (orig === 'w' && ch !== '.') ch = 'w'
        }
      }
      if (ch === '.') continue
      if (ch === 'l' && !lashes) continue
      // viewer-left eye at x=10.., right eye mirrored around 15.5
      const x = left ? baseX + i : 31 - (baseX + w - 1) + i
      b.put(x, oy + j, col(ch), ch === 'c' || ch === 's' ? TAG.face : TAG.eye)
    }
  }
  // boys: the upper lid line runs a pixel past the outer corner (defined, not girly)
  if (r.g === 'm' && !e.arc && !lashes) {
    const j = e.rows.findIndex((row) => /^k{3,}/.test(row.replace(/^\./, '')))
    if (j >= 0 && e.rows[j][0] !== '.') b.put(left ? baseX - 1 : 31 - (baseX - 1), oy + j, EYE_K, TAG.eye)
  }
  if (lashes && lashOk && e.lash) {
    const [lx, ly] = e.lash
    const x = left ? baseX + lx : 31 - (baseX + lx)
    b.put(x, oy + ly, INK, TAG.eye)
    // lashes turned on: a second flick for drama
    if (r.body.lashes === 1) b.put(left ? x - 1 : x + 1, oy + ly - 1, INK, TAG.eye)
  }
}

/** Brow colour: the hair's dark tone unless a colour was picked. */
function browCol(r: Res): string {
  return BROW_HEX[r.body.browColor] ?? r.hr.d
}

/** Brows drawn under the fringe (the classic soft arch; mostly hidden). */
function drawBrowsUnder(b: Buf, r: Res, dy: number, expr: Expr) {
  const bc = browCol(r)
  if (r.body.brows !== 0) return
  if (r.g === 'm') {
    for (const x of [10, 11, 12, 13]) {
      b.put(x, 13 + dy, bc)
      b.put(31 - x, 13 + dy, bc)
    }
  } else {
    b.put(10, 14 + dy, bc)
    b.put(11, 13 + dy, bc)
    b.put(12, 13 + dy, bc)
    b.put(21, 14 + dy, bc)
    b.put(20, 13 + dy, bc)
    b.put(19, 13 + dy, bc)
  }
  if (expr === 'think') {
    b.put(19, 12 + dy, bc)
    b.put(20, 12 + dy, bc)
  }
}

/** Brow styles that show through the fringe (drawn after the hair). */
function drawBrowsOver(b: Buf, r: Res, dy: number, expr: Expr) {
  const st = r.body.brows
  if (st === 0 || hoodedR(r)) return
  const base = browCol(r)
  const bc = mix(base, INK, 0.25)
  const lite = mix(base, r.sk.b, 0.3)
  // [x, row] for the viewer-left brow; mirrored for the right one
  const px: [number, number, string][] =
    st === 1
      ? [[10, 14, bc], [11, 14, bc], [12, 14, bc], [13, 14, bc], [10, 13, bc], [11, 13, bc], [12, 13, bc], [13, 13, lite]]
      : st === 2
        ? [[11, 14, lite], [12, 14, lite]]
        : st === 3
          ? [[9, 13, bc], [10, 13, bc], [11, 13, bc], [12, 14, bc], [13, 14, bc], [11, 14, bc], [10, 14, lite]]
          : [[10, 14, bc], [11, 14, bc], [12, 13, bc], [13, 13, bc]]
  // sit just above the eye's top edge (one skin row between) below the fringe
  const e = buildEye(r)
  const first = e.rows.findIndex((row) => /[^.sc]/.test(row))
  const low = Math.min(15, 15 + (e.oy ?? 0) + Math.max(0, first) - 2) - 14
  const up = low + (expr === 'happy' ? -1 : 0)
  for (const [x, y, c] of px) {
    b.put(x, y + dy + up, c, TAG.face)
    // the thinking brow rises on one side only
    b.put(31 - x, y + dy + up + (expr === 'think' ? -1 : 0), c, TAG.face)
  }
}

/** Cheek blush by level (BLUSHES): none, faint, classic, rosy. */
function drawBlush(b: Buf, r: Res, dy: number) {
  const lv = r.body.blush
  if (!lv) return
  const cx = r.body.faceShape === 3 ? -1 : 0
  const both = (x: number, y: number, c: string) => {
    b.put(x + cx, y + dy, c, TAG.face)
    b.put(31 - x - cx, y + dy, c, TAG.face)
  }
  if (lv === 1) for (const x of [8, 9]) both(x, 21, mix(r.sk.b, P.blush, 0.3))
  else if (lv === 2) {
    for (const x of [7, 8, 9]) both(x, 21, r.blush)
    both(8, 20, mix(r.sk.b, P.blush, 0.35))
  } else {
    for (const x of [6, 7, 8, 9, 10]) both(x, 21, r.blush)
    for (const x of [7, 8, 9]) both(x, 20, mix(r.sk.b, P.blush, 0.5))
  }
}

/** Dimples, a plaster or a cheek sticker (FACE_DECOS). */
function drawFaceDeco(b: Buf, r: Res, dy: number) {
  const d = r.body.faceDeco
  const put = (x: number, y: number, c: string) => b.put(x, y + dy, c, TAG.face)
  if (d === 1) {
    put(13, 22, r.sk.s)
    put(18, 22, r.sk.s)
  } else if (d === 2) {
    // a plaster across the viewer-right cheek
    const tape = '#f7dfb6'
    const pad = '#e2b884'
    for (const [x, y] of [
      [21, 19],
      [22, 19],
      [23, 19],
      [24, 20],
      [20, 20],
      [21, 20],
      [22, 20],
      [23, 20],
    ])
      put(x, y, x === 22 || (x === 21 && y === 20) ? pad : tape)
    put(20, 19, mix(tape, INK, 0.25))
    put(24, 19, mix(tape, INK, 0.25))
    put(22, 21, mix(tape, INK, 0.25))
  } else if (d === 3) {
    // Thai flag sticker on the viewer-left cheek: red, white, blue, white, red
    const band = ['#e8414f', '#ffffff', '#2e4aa8', '#ffffff', '#e8414f']
    band.forEach((c, j) => {
      for (let x = 7; x <= 9; x++) put(x, 17 + j, c)
    })
  } else if (d === 4) {
    const h = '#ff4f86'
    const hl = '#ffb3c9'
    for (const [x, y, c] of [
      [7, 19, h],
      [9, 19, h],
      [6, 19, h],
      [10, 19, h],
      [6, 20, h],
      [7, 20, hl],
      [8, 20, h],
      [9, 20, h],
      [10, 20, h],
      [7, 21, h],
      [8, 21, h],
      [9, 21, h],
      [8, 22, h],
    ] as [number, number, string][])
      put(x, y, c)
  } else if (d === 5) {
    const s = '#ffd23f'
    const sd = '#e8a21c'
    for (const [x, y, c] of [
      [8, 18, s],
      [7, 19, s],
      [8, 19, '#fff3a6'],
      [9, 19, s],
      [6, 19, s],
      [10, 19, s],
      [7, 20, s],
      [8, 20, s],
      [9, 20, sd],
      [7, 21, sd],
      [9, 21, sd],
    ] as [number, number, string][])
      put(x, y, c)
  }
}

function drawFace(b: Buf, r: Res, dy: number, expr: Expr, blink: boolean) {
  const f = r.body
  drawBrowsUnder(b, r, dy, expr)
  let e: EyeMap = buildEye(r)
  let lash = true
  const low = r.g === 'm' ? 1 : 0
  if (expr === 'happy') {
    e = { ...EYE_HAPPY, oy: (EYE_HAPPY.oy ?? 0) + low }
    lash = false
  } else if (expr === 'serene') {
    e = { ...EYE_CLOSED, oy: (EYE_CLOSED.oy ?? 0) + low }
    lash = false
  } else if (blink) {
    e = { ...EYE_BLINK, oy: (EYE_BLINK.oy ?? 0) + low + (f.eyeSize === 2 ? 1 : 0) }
    lash = false
  }
  drawEye(b, e, true, dy, r, lash)
  drawEye(b, e, false, dy, r, lash)
  drawBlush(b, r, dy)
  // cheek shine
  b.put(7 + (f.faceShape === 3 ? -1 : 0), 19 + dy, r.sk.l, TAG.face)
  // freckles & moles
  const dot = mix(r.sk.d, '#8a4f3a', 0.4)
  const mole = '#4a2f33'
  if (f.marks === 1)
    for (const [x, y] of [
      [9, 19],
      [11, 20],
      [8, 20],
      [10, 21],
    ]) {
      b.put(x, y + dy, dot, TAG.face)
      b.put(31 - x, y + dy, dot, TAG.face)
    }
  if (f.marks === 2) b.put(20, 21 + dy, mole, TAG.face)
  if (f.marks === 3) b.put(19, 23 + dy, mole, TAG.face)
  if (f.marks === 4) b.put(23, 19 + dy, mole, TAG.face)
  if (f.marks === 5) b.put(17, 23 + dy, mix(mole, r.sk.b, 0.2), TAG.face)
  drawFaceDeco(b, r, dy)
  // nose
  if (f.nose === 1) b.put(16, 20 + dy, r.sk.s, TAG.face)
  if (f.nose === 2) {
    b.put(16, 19 + dy, r.sk.s, TAG.face)
    b.put(16, 20 + dy, r.sk.s, TAG.face)
    b.put(15, 20 + dy, mix(r.sk.s, r.sk.d, 0.5), TAG.face)
    b.put(15, 18 + dy, r.sk.l, TAG.face)
  }
  // mouth
  const lip: string = LIP_HEX[f.lips] ?? MOUTH
  const m = (x: number, y: number, c = lip) => b.put(x, y + dy, c, TAG.eye)
  const soft = mix(lip, r.sk.b, 0.45)
  switch (expr) {
    case 'open':
    case 'happy':
      m(14, 22)
      m(15, 22)
      m(16, 22)
      m(17, 22)
      m(15, 23, TONGUE)
      m(16, 23, TONGUE)
      if (f.mouth === 4) {
        m(15, 22, WHITE)
        m(16, 22, WHITE)
      }
      break
    case 'think':
      m(16, 22)
      m(17, 22)
      break
    case 'serene':
      m(15, 22)
      m(16, 22)
      break
    default:
      switch (f.mouth) {
        case 1: // wide grin
          m(13, 21, soft)
          m(14, 22)
          m(15, 22)
          m(16, 22)
          m(17, 22)
          m(18, 21, soft)
          break
        case 2: // tiny
          m(15, 22, soft)
          m(16, 22)
          break
        case 3: // smirk
          m(14, 22, soft)
          m(15, 22)
          m(16, 22)
          m(17, 21)
          m(18, 20, soft)
          break
        case 4: // bunny teeth
          m(14, 21, soft)
          m(15, 22)
          m(16, 22)
          m(17, 21, soft)
          m(15, 23, WHITE)
          m(16, 23, WHITE)
          break
        default:
          m(14, 21, soft)
          m(15, 22)
          m(16, 22)
          m(17, 21, soft)
      }
      // coloured lips get a tiny gloss
      if (f.lips && f.mouth !== 2) m(15, 22, mix(lip, WHITE, 0.35))
  }
  drawBeard(b, r, dy)
}

/** Stubble, moustache, goatee or a full short beard in the hair colour. */
function drawBeard(b: Buf, r: Res, dy: number) {
  const k = r.body.beard
  if (!k) return
  const spans = spansOf(r)
  const hair = r.hr.b
  const hairS = r.hr.s
  const stub = mix(r.sk.b, r.hr.d, 0.3)
  const stub2 = mix(r.sk.b, r.hr.d, 0.18)
  const put = (x: number, y: number, c: string) => {
    if (b.tag(x, y + dy) === TAG.eye) return
    b.put(x, y + dy, c, TAG.face)
  }
  const jaw = (j: number) => spans[j] ?? spans[spans.length - 1]
  if (k === 1 || k === 4) {
    // along the jaw: last two rows + the cheeks' lower edge
    for (let j = 15; j <= 17; j++) {
      const [x0, x1] = jaw(j)
      for (let x = x0; x <= x1; x++) {
        if (j === 15 && x > x0 + 1 && x < x1 - 1) continue
        put(x, HEAD_TOP + j, k === 4 ? ((x + j) % 3 === 0 ? hairS : hair) : (x + j) % 2 ? stub : stub2)
      }
    }
  }
  if (k === 4) {
    // sideburns and the moustache
    for (let j = 11; j <= 14; j++) {
      const [x0, x1] = jaw(j)
      put(x0, HEAD_TOP + j, hair)
      put(x1, HEAD_TOP + j, hairS)
      if (j >= 13) {
        put(x0 + 1, HEAD_TOP + j, hair)
        put(x1 - 1, HEAD_TOP + j, hairS)
      }
    }
  }
  if (k === 2 || k === 4) {
    for (const x of [13, 14, 15, 16, 17, 18]) put(x, 21, x === 13 || x === 18 ? hairS : hair)
  }
  if (k === 3) {
    for (const x of [14, 15, 16, 17]) put(x, 23, hair)
    put(15, 24, hair)
    put(16, 24, hairS)
  }
}

// ---------------------------------------------------------------------------
// Hair. Maps are in stand coordinates (32 columns). Codes: # auto-shaded,
// H light, S shine, s shade, d dark strand, b base, k stubble, r ribbon,
// q accent, w white, g green, 1/2 clip colours.

interface HairPart {
  y: number
  rows: string[]
}

interface HairDef {
  /** Drawn behind the body in front view. */
  behind?: HairPart[]
  front: HairPart[]
  back: HairPart[]
  accent?: string
  accent2?: string
  /** Ears visible in front view (short styles). */
  ears?: boolean
}

const CROWN = [
  '...........##########...........',
  '.........##############.........',
  '.......##################.......',
  '......####################......',
  '.....######################.....',
]
const CROWN_W = [
  '...........##########...........',
  '.........##############.........',
  '.......##################.......',
  '......####################......',
  '.....######################.....',
  '....########################....',
]

const HAIR: Record<string, HairDef> = {
  bob: {
    behind: [{ y: 18, rows: ['....########################....', '....########################....', '.....######################.....', '......####################......', '.......##################.......'] }],
    front: [
      {
        y: 3,
        rows: [
          ...CROWN_W,
          '....########################....',
          '....########################....',
          '....##########d#############....',
          '....#####d#########d########....',
          '....####d###d#####d###d#####....',
          '....####.##..##..##..##.####....',
          '....####................####....',
          '....####................####....',
          '....#s##................##s#....',
          '....#s##................##s#....',
          '....#ss#................#ss#....',
          '.....#ss................ss#.....',
          '......#s................s#......',
        ],
      },
    ],
    back: [
      {
        y: 3,
        rows: [
          ...CROWN_W,
          '....########################....',
          '....########################....',
          '....########################....',
          '....########################....',
          '....########################....',
          '....########################....',
          '....#####d#######d######d###....',
          '....####d#####d#####d####d##....',
          '....###d####d######d####d###....',
          '....###d####d#####d#####d###....',
          '....##s####s######s####s####....',
          '....#s####s######s#####s####....',
          '.....s####s######s#####s###.....',
          '......ssssssssssssssssssss......',
        ],
      },
    ],
  },
  short: {
    ears: true,
    front: [
      {
        y: 2,
        rows: [
          '..............##..##............',
          ...CROWN,
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....##d#########d#########.....',
          '.....##..##d######d########.....',
          '.....##.....#####d#########.....',
          '.....#.........###d#######......',
          '.....#.............######.......',
          '....................##s.........',
        ],
      },
    ],
    back: [
      {
        y: 2,
        rows: [
          '..............##..##............',
          ...CROWN,
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######d######d########.....',
          '.....#####d#####d#####d####.....',
          '.....####d####d######d#####.....',
          '.....###s####s#####s####s##.....',
          '......##s###s#####s####s##......',
          '.......#ss##s####s###ss##.......',
          '........ssssssssssssssss........',
          '..........ssssssssssss..........',
        ],
      },
    ],
  },
  long: {
    behind: [
      {
        y: 14,
        rows: [
          '....########################....',
          '....########################....',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '...##########################...',
          '....########################....',
          '....########################....',
          '....########################....',
          '....########################....',
          '.....######################.....',
          '.....##.####.####.####.####.....',
          '......#..##...##...##...##......',
        ],
      },
    ],
    front: [
      {
        y: 3,
        rows: [
          ...CROWN_W,
          '....########################....',
          '....########################....',
          '....##########d#############....',
          '....#####d#########d########....',
          '....####d###d#####d###d#####....',
          '....####.##..##..##..##.####....',
          '....####................####....',
          '....####................####....',
          '....#s##................##s#....',
          '....#s##................##s#....',
          '....#s##................##s#....',
          '....#ss#................#ss#....',
          '....#ss##..............##ss#....',
          '.....#ss#..............#ss#.....',
          '.....#ss##............##ss#.....',
          '......#ss##..........##ss#......',
          '......#ss##..........##ss#......',
          '.......#ss#..........#ss#.......',
          '.......#ss#..........#ss#.......',
          '.......#ss#..........#ss#.......',
          '........#s#..........#s#........',
          '........#s............s#........',
          '.........s............s.........',
        ],
      },
    ],
    back: [
      {
        y: 3,
        rows: [
          ...CROWN_W,
          '....########################....',
          '....########################....',
          '....########################....',
          '....########################....',
          '....########################....',
          '....########################....',
          '....#####d#######d######d###....',
          '....####d#####d#####d####d##....',
          '....###d####d######d####d###....',
          '....###d####d#####d#####d###....',
          '....###d####d#####d#####d###....',
          '.....##d####d#####d#####d##.....',
          '......#d####d#####d#####d#......',
          '.......#####d#####d######.......',
          '.......#####d#####d######.......',
          '.......##s##d##s##d##s###.......',
          '.......##s##d##s##d##s###.......',
          '.......##s##s##s##s##s###.......',
          '.......##s##s##s##s##s###.......',
          '.......#ss#ss#ss#ss#ss#s#.......',
          '.......#ss#ss#ss#ss#ss#s#.......',
          '........ss.ss.ss.ss.ss.s........',
        ],
      },
    ],
  },
  bun: {
    accent: '#e8514a',
    front: [
      {
        y: 0,
        rows: [
          '............########............',
          '...........##H#######...........',
          '...........##########...........',
          '...........rrrrrrrrrr...........',
          '.........##############.........',
          '.......##################.......',
          '......####################......',
          '.....######################.....',
          '.....######################.....',
          '.....#########d############.....',
          '.....#####d#######d########.....',
          '.....######################.....',
          '.....###.##..##..##..##.###.....',
          '.....##..................##.....',
          '.....#s..................s#.....',
          '.....#s..................s#.....',
          '.....#s..................s#.....',
          '......s..................s......',
        ],
      },
    ],
    back: [
      { y: 0, rows: [
          '............########............',
          '...........##H#######...........',
          '...........##########...........',
          '...........rrrrrrrrrr...........',
          '.........##############.........',
          '.......##################.......',
          '......####################......',
          '.....######d######d########.....',
          '.....######d######d########.....',
          '.....#####d########d#######.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '......####################......',
          '.......##################.......',
          '.........##############.........',
        ] },
    ],
  },
  twin: {
    accent: '#e8514a',
    front: [
      {
        y: 3,
        rows: [
          ...CROWN,
          '##...######################...##',
          '###..######################..###',
          '.##r########################r##.',
          '..#r########################r#..',
          '....##########d#############....',
          '....####d###d#####d###d#####....',
          '....####.##..##..##..##.####....',
          '....####................####....',
          '....#s##................##s#....',
          '....#ss#................#ss#....',
          '.....#s..................s#.....',
        ],
      },
    ],
    back: [
      { y: 3, rows: [
          ...CROWN,
          '##...######################...##',
          '###..######################..###',
          '.##r########################r##.',
          '..#r########################r#..',
          '....######d#######d#########....',
          '....#####d#######d##########....',
          '....########################....',
          '....########################....',
          '.....######################.....',
          '.......##################.......',
        ] },
    ],
  },
  jook: {
    ears: true,
    front: [
      {
        y: 0,
        rows: [
          '..............####..............',
          '.............##H###.............',
          '............wgwwgwwg............',
          '.............######.............',
          '..............####..............',
          '..............####..............',
          '...........kkkkkkkkkk...........',
          '.........kkkkkkkkkkkkkk.........',
          '........kkkkkkkkkkkkkkkk........',
          '.......kkkkkkkkkkkkkkkkkk.......',
          '.......kkkkkkkkkkkkkkkkkk.......',
          '......kkkkk..........kkkkk......',
          '......kk................kk......',
        ],
      },
    ],
    back: [
      {
        y: 0,
        rows: [
          '..............####..............',
          '.............##H###.............',
          '............wgwwgwwg............',
          '.............######.............',
          '..............####..............',
          '..............####..............',
          '...........kkkkkkkkkk...........',
          '.........kkkkkkkkkkkkkk.........',
          '........kkkkkkkkkkkkkkkk........',
          '.......kkkkkkkkkkkkkkkkkk.......',
          '.......kkkkkkkkkkkkkkkkkk.......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '.......kkkkkkkkkkkkkkkkkk.......',
          '........kkkkkkkkkkkkkkkk........',
        ],
      },
    ],
  },
  twoblock: {
    ears: true,
    front: [
      {
        y: 1,
        rows: [
          '............########............',
          '..........############..........',
          '........################........',
          '.......##################.......',
          '......####################......',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....#####d#######d########.....',
          '.....####d###d##d###d######.....',
          '......k###d##d####d##d###k......',
          '......k.##.####..####.##.k......',
          '......k..#..##....##..#..k......',
          '......k..................k......',
        ],
      },
    ],
    back: [
      {
        y: 1,
        rows: [
          '............########............',
          '..........############..........',
          '........################........',
          '.......##################.......',
          '......####################......',
          '.....######################.....',
          '.....######################.....',
          '.....######d######d########.....',
          '.....#####d######d######d##.....',
          '.....####d######d######d###.....',
          '.....###s######s######s####.....',
          '.....##s######s######s#####.....',
          '.....ssssssssssssssssssssss.....',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '.......kkkkkkkkkkkkkkkkkk.......',
          '.........kkkkkkkkkkkkkk.........',
        ],
      },
    ],
  },
  curtain: {
    front: [
      {
        y: 3,
        rows: [
          ...CROWN,
          '.....##########dd##########.....',
          '.....#########d..d#########.....',
          '.....########d....d########.....',
          '.....#######d......d#######.....',
          '.....######d........d######.....',
          '.....#####d..........d#####.....',
          '.....####d............d####.....',
          '.....###d..............d###.....',
          '.....#s#................#s#.....',
          '.....#s#................#s#.....',
          '.....#ss................ss#.....',
          '......ss................ss......',
        ],
      },
    ],
    back: [
      {
        y: 3,
        rows: [
          ...CROWN,
          '.....#############d########.....',
          '.....######################.....',
          '.....######d######d########.....',
          '.....#####d######d######d##.....',
          '.....####d######d######d###.....',
          '.....####d######d######d###.....',
          '.....###s######s######s####.....',
          '.....##s######s######s#####.....',
          '.....#s######s######s######.....',
          '.....#s######s######s######.....',
          '......ss####s######s#####s......',
          '.......sssssssssssssssssss......',
          '.........ssssssssssssss.........',
        ],
      },
    ],
  },
  buzz: {
    ears: true,
    front: [
      {
        y: 5,
        rows: [
          '..........############..........',
          '........################........',
          '.......##################.......',
          '......####################......',
          '......####################......',
          '......####################......',
          '......#kk.k..k.kk.k..k.kk#......',
          '......kk................kk......',
        ],
      },
    ],
    back: [
      {
        y: 5,
        rows: [
          '..........############..........',
          '........################........',
          '.......##################.......',
          '......####################......',
          '......####################......',
          '......####################......',
          '......####################......',
          '......####################......',
          '......####################......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '......kkkkkkkkkkkkkkkkkkkk......',
          '.......kkkkkkkkkkkkkkkkkk.......',
          '........kkkkkkkkkkkkkkkk........',
        ],
      },
    ],
  },
  ponytail: {
    accent: '#ff7eaa',
    ears: false,
    behind: [
      {
        y: 6,
        rows: [
          '..........................###...',
          '...........................###..',
          '...........................####.',
          '............................###.',
          '............................###.',
          '............................###.',
          '...........................####.',
          '...........................###..',
          '..........................####..',
          '..........................###...',
          '.........................####...',
          '.........................###....',
          '........................###.....',
          '........................##......',
          '.......................##.......',
        ],
      },
    ],
    front: [
      {
        y: 3,
        rows: [
          ...CROWN,
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....#########d############.....',
          '.....#######d#####d##...###.....',
          '.....######d####d......##s#.....',
          '.....####d###d...........#s.....',
          '.....###d##..............s......',
          '.....##d#.......................',
          '.....#s.........................',
          '.....#s.........................',
          '.....#s.........................',
          '......s.........................',
        ],
      },
    ],
    back: [
      { y: 3, rows: [
          ...CROWN,
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '......####################......',
          '.......##################.......',
          '.........##############.........',
        ] },
      { y: 10, rows: [
          '..............rrrr..............',
          '.............######.............',
          '............########............',
          '............########............',
          '............########............',
          '............########............',
          '............########............',
          '............########............',
          '............########............',
          '............########............',
          '............########............',
          '............########............',
          '............########............',
          '.............######.............',
          '.............######.............',
          '..............####..............',
          '..............####..............',
          '...............##...............',
        ] },
    ],
  },
  wavy: {
    behind: [
      {
        y: 13,
        rows: [
          '...##########################...',
          '..############################..',
          '..############################..',
          '.##############################.',
          '.##############################.',
          '..############################..',
          '..############################..',
          '.##############################.',
          '.##############################.',
          '..############################..',
          '..############################..',
          '.##############################.',
          '.##############################.',
          '..############################..',
          '..############################..',
          '...##########################...',
          '...##########################...',
          '....#####.#####.#####.######....',
          '.....###...###...###...####.....',
        ],
      },
    ],
    front: [
      {
        y: 3,
        rows: [
          ...CROWN_W,
          '....########################....',
          '....######d#################....',
          '....#######...d#############....',
          '....######.......d##########....',
          '....#####..........d########....',
          '....####..............d#####....',
          '...####.................####....',
          '...####.................#####...',
          '....####................#####...',
          '....####...............#####....',
          '...####................####.....',
          '...#####...............#####....',
          '....#####.............#####.....',
          '....#####..............#####....',
          '.....####.............#####.....',
          '......####...........####.......',
          '.....####.............####......',
          '.....####.............####......',
          '......####...........####.......',
          '.......###...........###........',
          '......###.............###.......',
          '.......##.............##........',
        ],
      },
    ],
    back: [
      {
        y: 3,
        rows: [
          ...CROWN_W,
          '....########################....',
          '....######d#################....',
          '....####d######d######d#####....',
          '...####d######d######d######....',
          '...####d#######d######d######...',
          '....####d#######d######d#####...',
          '....####d######d######d#####....',
          '...####d######d######d#####.....',
          '...####d#######d######d#####....',
          '....####d#######d######d###.....',
          '.....####d#####d######d####.....',
          '......###d####d######d###.......',
          '.......##d#####d######d##.......',
          '......###d######d######d##......',
          '......###s#######s######s#......',
          '.......##s######s######s##......',
          '.......###s######s######s##.....',
          '......###s######s######s##......',
          '......##s######s######s###......',
          '.......##s######s######s##......',
          '........#ss####ss####ss##.......',
          '........s.sss...sss..sss........',
        ],
      },
    ],
  },
  schoolgirl: {
    accent: '#ff9fc0',
    accent2: '#7fd3b5',
    behind: [{ y: 17, rows: ['....########################....', '....########################....', '.....######################.....'] }],
    front: [
      {
        y: 3,
        rows: [
          ...CROWN_W,
          '....########################....',
          '....########################....',
          '....#111####################....',
          '....##222###################....',
          '....#####.###.####.###.#####....',
          '....####..#.#..##..#.#..####....',
          '....####................####....',
          '....####................####....',
          '....#s##................##s#....',
          '....#s##................##s#....',
          '....#sss................sss#....',
        ],
      },
    ],
    back: [
      {
        y: 3,
        rows: [
          ...CROWN_W,
          '....########################....',
          '....########################....',
          '....########################....',
          '....######d#######d#####d###....',
          '....#####d######d######d####....',
          '....####d######d######d#####....',
          '....###s######s######s######....',
          '....##s######s######s#######....',
          '....#s######s######s#######s....',
          '....#s######s######s#######s....',
          '....ssssssssssssssssssssssss....',
        ],
      },
    ],
  },
  braid: {
    accent: '#e8514a',
    ears: false,
    front: [
      {
        y: 3,
        rows: [
          ...CROWN,
          '.....##########dd##########.....',
          '.....#########d##d#########.....',
          '.....#######dd....dd#######.....',
          '.....#####dd........dd#####.....',
          '.....####d............d####.....',
          '.....###d..............d###.....',
          '.....##s................s##.....',
          '.....#s..................s#.....',
          '.....#s..................s#.....',
        ],
      },
      {
        y: 16,
        rows: [
          '......................###.......',
          '......................####......',
          '.....................#HH#s......',
          '.....................s##ss......',
          '......................sss.......',
          '.....................#HH#s......',
          '.....................s##ss......',
          '......................sss.......',
          '.....................#HH#s......',
          '.....................s##ss......',
          '......................sss.......',
          '.....................#HH#s......',
          '.....................s##ss......',
          '......................sss.......',
          '......................rrr.......',
          '.....................##H#.......',
          '.....................#H##s......',
          '......................#ss.......',
        ],
      },
    ],
    back: [
      { y: 3, rows: [
          ...CROWN,
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '.....######################.....',
          '......####################......',
          '.......##################.......',
          '.........######dd######.........',
        ] },
      { y: 15, rows: [
          '..............####..............',
          '.............#HH#s..............',
          '.............s##ss..............',
          '..............sss...............',
          '.............#HH#s..............',
          '.............s##ss..............',
          '..............sss...............',
          '.............#HH#s..............',
          '.............s##ss..............',
          '..............sss...............',
          '.............#HH#s..............',
          '.............s##ss..............',
          '..............sss...............',
          '.............#HH#s..............',
          '.............s##ss..............',
          '..............sss...............',
          '..............rrr...............',
          '.............##H#...............',
          '.............#H##s..............',
          '..............#ss...............',
        ] },
    ],
  },
  curly: {
    behind: [{ y: 16, rows: [
          '.##############################.',
          '.##############################.',
          '..############################..',
          '..############################..',
          '...###.####..######..####.###...',
          '....#...##....####....##...#....',
        ] }],
    front: [{ y: 1, rows: [
          '.........##..######..##.........',
          '.......##################.......',
          '.....######################.....',
          '....########################....',
          '...##########################...',
          '..############################..',
          '..############################..',
          '..############################..',
          '.##############################.',
          '.##############################.',
          '.####H###H###H####H###H###H####.',
          '.###d#H#d#H#d#H##H#d#H#d#H#d###.',
          '.####.##.#.##.#..#.##.#.##.####.',
          '.######..#....#..#....#..######.',
          '.######..................######.',
          '..#####..................#####..',
          '.######..................######.',
          '.#ss###..................###ss#.',
          '..#sss....................sss#..',
          '..#ss......................ss#..',
          '...s........................s...',
        ] }],
    back: [{ y: 1, rows: [
          '.........##..######..##.........',
          '.......##################.......',
          '.....######################.....',
          '....########################....',
          '...##########################...',
          '..############################..',
          '..############################..',
          '..############################..',
          '.##############################.',
          '.##############################.',
          '.###H###H###H######H###H###H###.',
          '.##H#d#H#d#H#d#HH#d#H#d#H#d#H##.',
          '.###d###d###d######d###d###d###.',
          '.##H#s#H#s#H#s#HH#s#H#s#H#s#H##.',
          '.###s###s###s######s###s###s###.',
          '.##s#s#s#s#s#s#ss#s#s#s#s#s#s##.',
          '..##s###s###s######s###s###s##..',
          '..#ss#ss#ss#ss#ss#ss#ss#ss#ss#..',
          '...ssssssssssssssssssssssssss...',
          '.....ssssssssssssssssssssss.....',
          '......s..sss..ssss..sss..s......',
        ] }],
  },

}

export const DOLL_HAIR_STYLES = Object.keys(HAIR)

function hairColour(r: Res, def: HairDef, ch: string, x: number, t: number, y: number, kind: 'front' | 'back' | 'behind'): string | null {
  const h = r.hr
  switch (ch) {
    case 'H':
      return h.l
    case 'S':
      return h.shine
    case 's':
      return h.s
    case 'd':
      return h.d
    case 'b':
      return h.b
    case 'k':
      return (x * 3 + y * 5) % 11 === 0 ? h.stub2 : h.stub
    case 'r':
      return def.accent ?? '#e8514a'
    case 'q':
      return def.accent2 ?? '#ffd54f'
    case 'w':
      return '#fffaf0'
    case 'g':
      return '#6cc36a'
    case '1':
      return def.accent ?? '#ff9fc0'
    case '2':
      return def.accent2 ?? '#7fd3b5'
  }
  // '#': auto shading
  if (kind === 'behind') return x >= 16 ? mix(h.s, h.d, 0.35) : h.s
  const ringT = kind === 'front' ? 3 : 3
  if (t === ringT && x >= 7 && x <= 24 && (x + y) % 5 !== 0) {
    if (x >= 9 && x <= 11) return h.shine
    return h.l
  }
  if (t === ringT - 1 && x >= 10 && x <= 13) return h.l
  if (x >= 24 && t >= 4) return h.s
  if (kind === 'back' && y >= 17) return x % 3 === 0 ? h.s : h.b
  if (kind === 'front' && y >= 17) return h.s
  return h.b
}

function hairLayer(r: Res, def: HairDef, part: HairPart, dx: number, dy: number, kind: 'front' | 'back' | 'behind'): Layer {
  const L = new Layer()
  const w = Math.max(...part.rows.map((s) => s.length))
  const top: number[] = []
  for (let x = 0; x < w; x++) {
    top[x] = part.rows.findIndex((s) => s[x] !== undefined && s[x] !== '.')
  }
  part.rows.forEach((row, j) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.' || ch === ' ') continue
      const y = part.y + j
      const c = hairColour(r, def, ch, x, j - top[x], y, kind)
      L.put(x + dx, y + dy, c)
    }
  })
  return L
}

function drawHairParts(b: Buf, r: Res, parts: HairPart[] | undefined, dy: number, kind: 'front' | 'back' | 'behind', dx = 0) {
  if (!parts) return
  const def = HAIR[r.hair] ?? HAIR.bob
  for (const p of parts) {
    const L = hairLayer(r, def, p, dx, dy, kind)
    commit(b, L, kind === 'behind' ? r.hr.d : r.hr.d, TAG.hair)
    if (kind === 'front') {
      // soft shadow cast by the hair onto the face
      for (const i of L.m.keys()) {
        const x = i % IW
        const y = Math.floor(i / IW)
        if (b.tag(x, y + 1) === TAG.face) b.put(x, y + 1, r.sk.s, TAG.face)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Bodies

export type Pt = [number, number]
export type Hand = 'rest' | 'open' | 'fist' | 'chin' | 'none'

export interface ArmDef {
  s: Pt
  e: Pt
  w: Pt
  /** How much the elbow / wrist follow the gender shoulder offset. */
  k?: [number, number]
  hand: Hand
  z: 'back' | 'front' | 'top'
}

export type LegsKind = 'stand' | 'kneelF' | 'kneelB' | 'sitF' | 'sitB' | 'bow'

export interface PoseDef {
  dy: number
  L: ArmDef | null
  R: ArmDef | null
  legs: LegsKind
  expr: Expr
  wai?: 'chest' | null
  lap?: boolean
}

const armStand = (dy: number, side: 1 | -1, z: ArmDef['z'] = 'back', hand: Hand = 'rest'): ArmDef => {
  const cx = side === 1 ? 8.5 : 23.5
  return { s: [cx, 25 + dy], e: [cx - 0.2 * side, 29.5 + dy], w: [cx - 0.4 * side, 32 + dy], hand, z }
}

/**
 * Extra poses. A registered pose gets a joint layout per view (return null to
 * fall back to standing for that view). Coordinates are in the 32-px-wide doll
 * space used by the built-in poses below; `armStand` shows the resting arms.
 */
const EXTRA_POSES = new Map<string, (view: DollView) => PoseDef | null>()

export function registerDollPose(name: `act_${string}`, def: (view: DollView) => PoseDef | null) {
  EXTRA_POSES.set(name, def)
}

/** Resting arm helper for pose authors (side 1 = screen-left arm). */
export function restingArm(dy: number, side: 1 | -1, z: ArmDef['z'] = 'back', hand: Hand = 'rest'): ArmDef {
  return armStand(dy, side, z, hand)
}

function poseDef(pose: DollPose, view: DollView): PoseDef {
  const extra = EXTRA_POSES.get(pose)?.(view)
  if (extra) return extra
  if (view === 'back') {
    switch (pose) {
      case 'kneel':
        return {
          dy: 9,
          L: { s: [8.5, 34], e: [7.8, 38.5], w: [10.5, 41], hand: 'none', z: 'back' },
          R: { s: [23.5, 34], e: [24.2, 38.5], w: [21.5, 41], hand: 'none', z: 'back' },
          legs: 'kneelB',
          expr: 'serene',
        }
      case 'kneelWai':
      case 'wai':
        return {
          dy: pose === 'wai' ? 0 : 9,
          L: { s: [8.5, 25 + (pose === 'wai' ? 0 : 9)], e: [6.2, 27 + (pose === 'wai' ? 0 : 9)], w: [11, 20 + (pose === 'wai' ? 0 : 9)], k: [0.5, 0], hand: 'none', z: 'back' },
          R: { s: [23.5, 25 + (pose === 'wai' ? 0 : 9)], e: [25.8, 27 + (pose === 'wai' ? 0 : 9)], w: [21, 20 + (pose === 'wai' ? 0 : 9)], k: [0.5, 0], hand: 'none', z: 'back' },
          legs: pose === 'wai' ? 'stand' : 'kneelB',
          expr: 'serene',
        }
      case 'sit':
        return {
          dy: 10,
          L: { s: [8.5, 35], e: [8, 39.5], w: [11, 42.5], hand: 'none', z: 'back' },
          R: { s: [23.5, 35], e: [24, 39.5], w: [21, 42.5], hand: 'none', z: 'back' },
          legs: 'sitB',
          expr: 'serene',
        }
      case 'bow':
        return { dy: 0, L: null, R: null, legs: 'bow', expr: 'serene' }
      default:
        return { dy: 0, L: armStand(0, 1), R: armStand(0, -1), legs: 'stand', expr: 'smile' }
    }
  }
  switch (pose) {
    case 'wave':
      return {
        dy: 0,
        L: { s: [8.5, 25], e: [4, 22.5], w: [3.5, 18], k: [0.5, 0.3], hand: 'open', z: 'top' },
        R: armStand(0, -1),
        legs: 'stand',
        expr: 'open',
      }
    case 'wai':
      return {
        dy: 0,
        L: { s: [8.5, 25], e: [9, 30.5], w: [13.5, 29.5], k: [0.5, 0], hand: 'none', z: 'front' },
        R: { s: [23.5, 25], e: [23, 30.5], w: [18.5, 29.5], k: [0.5, 0], hand: 'none', z: 'front' },
        legs: 'stand',
        expr: 'serene',
        wai: 'chest',
      }
    case 'happy':
      return {
        dy: 0,
        L: { s: [8.5, 25], e: [5, 23.5], w: [4, 19.5], k: [0.5, 0.3], hand: 'open', z: 'top' },
        R: { s: [23.5, 25], e: [27, 23.5], w: [28, 19.5], k: [0.5, 0.3], hand: 'open', z: 'top' },
        legs: 'stand',
        expr: 'happy',
      }
    case 'think':
      return {
        dy: 0,
        L: { s: [8.5, 25], e: [9.5, 30.5], w: [20, 31], k: [0.5, 0], hand: 'rest', z: 'front' },
        R: { s: [23.5, 25], e: [24, 30.5], w: [20.5, 25.5], k: [0.8, 0], hand: 'chin', z: 'front' },
        legs: 'stand',
        expr: 'think',
      }
    case 'kneel':
      return {
        dy: 9,
        L: { s: [8.5, 34], e: [8, 38.5], w: [10.5, 42], k: [1, 0.5], hand: 'rest', z: 'front' },
        R: { s: [23.5, 34], e: [24, 38.5], w: [21.5, 42], k: [1, 0.5], hand: 'rest', z: 'front' },
        legs: 'kneelF',
        expr: 'smile',
      }
    case 'kneelWai':
      return {
        dy: 9,
        L: { s: [8.5, 34], e: [9, 39.5], w: [13.5, 38.5], k: [0.5, 0], hand: 'none', z: 'front' },
        R: { s: [23.5, 34], e: [23, 39.5], w: [18.5, 38.5], k: [0.5, 0], hand: 'none', z: 'front' },
        legs: 'kneelF',
        expr: 'serene',
        wai: 'chest',
      }
    case 'sit':
      return {
        dy: 10,
        L: { s: [8.5, 35], e: [8.5, 40], w: [13, 43.5], k: [1, 0], hand: 'none', z: 'front' },
        R: { s: [23.5, 35], e: [23.5, 40], w: [19, 43.5], k: [1, 0], hand: 'none', z: 'front' },
        legs: 'sitF',
        expr: 'serene',
        lap: true,
      }
    case 'bow':
      // Seen from the front a prostration is just the top of the head; use the back composition.
      return { dy: 0, L: null, R: null, legs: 'bow', expr: 'serene' }
    default:
      return { dy: 0, L: armStand(0, 1), R: armStand(0, -1), legs: 'stand', expr: 'smile' }
  }
}

// ---- top materials

function topMats(t: TopArt) {
  const body = mat(t.main, t.shade)
  const j = t.jacket
  const jacket = j ? mat(j.main, j.shade) : null
  const sleeve = j ? mat(j.sleeve ?? j.main, j.sleeveShade ?? j.shade) : body
  return { body, jacket, sleeve }
}

function clothCol(m: Mat, p: Pattern | undefined, pc: string | undefined, pc2: string | undefined, x: number, y: number, shade: boolean, light = false): string {
  const hit = patHD(p, x, y)
  if (hit === 1 && pc) return shade ? mix(pc, m.s, 0.35) : pc
  if ((hit === 2 || hit === 3) && (pc2 ?? pc)) return shade ? mix((pc2 ?? pc)!, m.s, 0.35) : (pc2 ?? pc)!
  return shade ? m.s : light ? m.l : m.b
}

function hemRow(t: TopArt): number {
  const h = t.hem ?? 'out'
  return h === 'tucked' ? 33 : h === 'long' ? 36 : 35
}

function torsoSpan(r: Res, y: number): [number, number] | null {
  const t = r.top
  const f = r.g === 'f'
  const over = t.fit === 'oversized' ? 1 : 0
  if (y < 24 || y > hemRow(t)) return null
  let x0 = f ? 11 : 10
  let x1 = f ? 20 : 21
  if (y === 24) {
    x0 += 1
    x1 -= 1
  } else {
    x0 -= over
    x1 += over
  }
  if (f && t.fit === 'fitted' && (y === 30 || y === 31)) {
    x0 += 1
    x1 -= 1
  }
  if (y >= 34 && !over) {
    x0 = Math.min(x0, 10)
    x1 = Math.max(x1, 21)
  }
  return [x0, x1]
}

// ---- arms

function segInfo(px: number, py: number, a: Pt, c: Pt) {
  const vx = c[0] - a[0]
  const vy = c[1] - a[1]
  const L2 = vx * vx + vy * vy || 1
  let t = ((px - a[0]) * vx + (py - a[1]) * vy) / L2
  t = Math.max(0, Math.min(1, t))
  const qx = a[0] + vx * t
  const qy = a[1] + vy * t
  return { d: Math.hypot(px - qx, py - qy), t, ox: px - qx, oy: py - qy }
}

const HANDS: Record<Exclude<Hand, 'none'>, { rows: string[]; ax: number; ay: number }> = {
  rest: { rows: ['HHh', 'HHh', '.h.'], ax: -1, ay: 0 },
  open: { rows: ['H.H.', 'HHHH', 'HHHh', 'HHHh', '.HH.'], ax: -2, ay: -4 },
  fist: { rows: ['HHh', 'HHh'], ax: -1, ay: -1 },
  chin: { rows: ['H..', 'HHh', 'HHh', '.h.'], ax: -1, ay: -2 },
}

function shiftArm(a0: ArmDef, r: Res, side: 1 | -1): ArmDef {
  // Joints raised above the shoulder line miss the body reshape (which widens
  // rows from the shoulders down), so move them out by hand to keep arms whole.
  const pre = (p: Pt): Pt => (r.bw && p[1] < r.bwY ? [p[0] - side * r.bw, p[1]] : p)
  const a: ArmDef = r.bw ? { ...a0, s: pre(a0.s), e: pre(a0.e), w: pre(a0.w) } : a0
  if (r.g === 'm') return a
  const [ke, kw] = a.k ?? [1, 1]
  const sx = side
  return {
    ...a,
    s: [a.s[0] + sx, a.s[1] + 0.5],
    e: [a.e[0] + sx * ke, a.e[1] + 0.5 * ke],
    w: [a.w[0] + sx * kw, a.w[1] + 0.5 * kw],
  }
}

function drawArm(b: Buf, r: Res, arm: ArmDef, side: 1 | -1) {
  const a = shiftArm(arm, r, side)
  const t = r.top
  const m = topMats(t)
  const sleeve = m.sleeve
  const long = t.jacket ? true : t.sleeve === 'long'
  const cov = t.extra === 'sabai' && side === 1 ? -1 : t.sleeve === 'none' && !t.jacket ? -1 : long ? 1.95 : 0.6
  const rad = t.fit === 'oversized' ? 1.75 : 1.5
  const skin = new Layer()
  const cloth = new Layer()
  const xs = [a.s[0], a.e[0], a.w[0]]
  const ys = [a.s[1], a.e[1], a.w[1]]
  const x0 = Math.floor(Math.min(...xs) - 3)
  const x1 = Math.ceil(Math.max(...xs) + 3)
  const y0 = Math.floor(Math.min(...ys) - 3)
  const y1 = Math.ceil(Math.max(...ys) + 3)
  const pc = t.jacket ? t.jacket.patternColor : t.patternColor
  const pat = t.jacket ? t.jacket.pattern : t.pattern
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const u = segInfo(px, py, a.s, a.e)
      const f = segInfo(px, py, a.e, a.w)
      const useU = u.d <= f.d
      const s = useU ? u : f
      const tt = useU ? u.t : 1 + f.t
      const rr = useU ? rad : rad - 0.05
      if (s.d > rr) continue
      const dot = s.ox * 0.8 + s.oy * 0.6
      const shade = dot > 0.55
      const light = dot < -0.9
      skin.put(x, y, shade ? r.sk.s : r.sk.b)
      if (tt <= cov) {
        let c = clothCol(sleeve, pat, pc, undefined, x, y, shade, light)
        const cuff = t.jacket ? t.jacket.trim && (t.jacket.kind === 'varsity' || t.jacket.kind === 'sukajan') ? t.jacket.trim : undefined : t.cuff
        if (cuff && tt > cov - 0.28) c = shade ? mix(cuff, INK, 0.2) : cuff
        cloth.put(x, y, c)
      }
    }
  }
  const pawM = r.suit?.paws ? mat(r.suit.paws) : null
  const paw = new Layer()
  if (a.hand !== 'none') {
    const h = HANDS[a.hand]
    const hx = Math.floor(a.w[0]) + (side === 1 ? h.ax : -h.ax - h.rows[0].length + 1)
    const hy = Math.floor(a.w[1]) + h.ay
    h.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = side === 1 ? row[i] : row[row.length - 1 - i]
        if (ch === '.') continue
        if (pawM) paw.put(hx + i, hy + j, ch === 'h' ? pawM.s : pawM.b)
        else skin.put(hx + i, hy + j, ch === 'h' ? r.sk.s : r.sk.b)
      }
    })
  }
  commit(b, skin, r.sk.d, TAG.skin)
  if (pawM) commit(b, paw, pawM.d, TAG.cloth)
  commit(b, cloth, sleeve.d, TAG.cloth)
  if (r.neck === 'prajiad' && side === 1) {
    // red cloth armband (ประเจียด) tied round the upper arm, tails hanging
    const band = new Layer()
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const u = segInfo(x + 0.5, y + 0.5, a.s, a.e)
        if (u.d <= rad + 0.35 && u.t > 0.42 && u.t < 0.72) band.put(x, y, u.t < 0.52 ? '#ff8a7a' : (x + y) % 3 === 0 ? '#ffd54f' : '#e8514a')
      }
    }
    const kx = Math.round(a.s[0] + (a.e[0] - a.s[0]) * 0.6) - 2
    const ky = Math.round(a.s[1] + (a.e[1] - a.s[1]) * 0.6)
    band.put(kx + 1, ky, '#e8514a')
    band.put(kx, ky + 1, '#b8343f')
    band.put(kx + 1, ky + 2, '#e8514a')
    commit(b, band, null, TAG.deco)
  }
}

// ---- legs


function bottomHem(bt: BottomArt): number {
  const byLen = { mini: 38, short: 40, knee: 41, midi: 43, long: 45 } as const
  if (bt.length) return byLen[bt.length]
  switch (bt.kind) {
    case 'shorts':
      return 40
    case 'pleated':
      return 41
    case 'skirt':
      return 45
    case 'jong':
      return 41
    case 'sarong':
      return 46
    default:
      return 46
  }
}

function botCol(r: Res, x: number, y: number, shade: boolean): string {
  const bt = r.bottom
  const m = mat(bt.main, bt.shade)
  return clothCol(m, bt.pattern, bt.patternColor, bt.patternColor2 ?? bt.patternColor, x, y, shade)
}

const isSkirt = (k: BottomArt['kind']) => k === 'skirt' || k === 'pleated' || k === 'sarong'

function drawShoesStand(b: Buf, r: Res, view: DollView) {
  const sh = r.shoes ?? DEFAULT_SHOE
  const bare = r.bare
  for (const side of [1, -1] as const) {
    // left foot columns 10..14, right 17..21 (toes point slightly outwards)
    const X = (i: number) => (side === 1 ? 14 - i : 17 + i) // i=0 inner .. 4 outer
    const L = new Layer()
    const skinFoot = () => {
      for (let i = 0; i <= 3; i++) L.put(X(i), 47, i === 0 ? r.sk.s : r.sk.b)
      for (let i = 0; i <= 4; i++) L.put(X(i), 48, i === 0 ? r.sk.s : r.sk.b)
      for (let i = 0; i <= 4; i++) L.put(X(i), 49, view === 'front' && i % 2 === 1 ? r.sk.s : r.sk.b)
    }
    if (bare) {
      skinFoot()
      commit(b, L, r.sk.d, TAG.skin)
      continue
    }
    const m = mat(sh.main, sh.shade)
    const sole = sh.sole ?? m.d
    const acc = sh.accent ?? m.l
    switch (sh.kind) {
      case 'flipflop':
      case 'sandal': {
        skinFoot()
        commit(b, L, r.sk.d, TAG.skin)
        const S = new Layer()
        for (let i = 0; i <= 4; i++) S.put(X(i), 49, sole)
        S.put(X(5), 49, sole)
        commit(b, S, mix(sole, INK, 0.4), TAG.cloth)
        if (sh.kind === 'flipflop') {
          b.put(X(2), 48, sh.main)
          b.put(X(1), 47, sh.main)
          b.put(X(3), 47, sh.main)
          b.put(X(2), 49, sh.shade)
        } else {
          for (let i = 0; i <= 4; i++) b.put(X(i), 48, i % 2 ? sh.shade : sh.main)
          for (let i = 1; i <= 3; i++) b.put(X(i), 46, sh.main)
        }
        break
      }
      case 'boot':
        // drawn after the garment (see drawBoots)
        break
      case 'flipper':
        drawV4Flipper(b, sh, view, X)
        break
      case 'wrap': {
        skinFoot()
        commit(b, L, r.sk.d, TAG.skin)
        const Wr = new Layer()
        for (let i = 0; i <= 3; i++) {
          Wr.put(X(i), 45, i % 2 ? m.b : m.s)
          Wr.put(X(i), 46, i % 2 ? m.s : m.b)
        }
        for (let i = 1; i <= 3; i++) Wr.put(X(i), 48, i === 2 ? acc : m.b)
        commit(b, Wr, m.d, TAG.cloth)
        break
      }
      case 'heel': {
        for (let i = 0; i <= 3; i++) L.put(X(i), 46, i === 0 ? r.sk.s : r.sk.b)
        for (let i = 0; i <= 3; i++) L.put(X(i), 47, i === 0 ? r.sk.s : r.sk.b)
        commit(b, L, r.sk.d, TAG.skin)
        const S = new Layer()
        for (let i = 0; i <= 4; i++) S.put(X(i), 48, i === 0 ? m.s : i === 2 && view === 'front' ? acc : m.b)
        S.put(X(1), 47, m.b)
        S.put(X(2), 47, m.b)
        for (let i = 0; i <= 2; i++) S.put(X(i), 49, sole)
        S.put(X(4), 49, sole)
        commit(b, S, m.d, TAG.cloth)
        break
      }
      case 'slipper': {
        const S = new Layer()
        for (let y = 45; y <= 49; y++) {
          const [a, z] = y === 45 ? [0, 4] : [-1, 5]
          for (let i = a; i <= z; i++) S.put(X(i), y, y === 49 ? sole : (i + y) % 3 === 0 ? '#ffffff' : i >= 4 ? m.s : m.b)
        }
        for (const i of [0, 3]) {
          S.put(X(i), 43, m.b)
          S.put(X(i), 44, acc)
          S.put(X(i + 1), 43, m.b)
          S.put(X(i + 1), 44, m.b)
        }
        commit(b, S, m.d, TAG.cloth)
        if (view === 'front') {
          b.put(X(1), 47, INK, TAG.cloth)
          b.put(X(3), 47, INK, TAG.cloth)
          b.put(X(2), 48, acc, TAG.cloth)
        }
        break
      }
      case 'clog': {
        const S = new Layer()
        for (let y = 45; y <= 49; y++) {
          const [a, z] = y === 45 ? [0, 3] : y === 46 ? [-1, 4] : [-1, 5]
          for (let i = a; i <= z; i++) S.put(X(i), y, y === 49 ? sole : i >= 4 || i === -1 ? m.s : y === 46 && i === 1 ? m.l : m.b)
        }
        commit(b, S, m.d, TAG.cloth)
        if (view === 'front') {
          for (const [i, y] of [[0, 47], [2, 47], [4, 47], [1, 48], [3, 48]] as Pt[]) b.put(X(i), y, m.s, TAG.cloth)
          b.put(X(2), 46, acc, TAG.cloth)
          b.put(X(3), 46, mix(acc, '#ffffff', 0.5), TAG.cloth)
          b.put(X(1), 47, side === 1 ? '#aeb4c8' : '#ffd54f', TAG.cloth)
        }
        break
      }
      default: {
        const high = sh.kind === 'hightop'
        const top = high ? 44 : 47
        for (let y = top; y <= 49; y++) {
          const w = y === 47 ? 3 : y >= 48 ? 5 : 3
          for (let i = 0; i <= w; i++) {
            let c = i === 0 ? m.s : m.b
            if (y === 49) c = sole
            if (view === 'front' && y === 47 && i === 2 && (sh.kind === 'shoe' || sh.kind === 'maryjane')) c = m.l
            if (view === 'front' && y === 48 && i === 3 && (sh.kind === 'shoe' || sh.kind === 'maryjane')) c = acc
            if ((sh.kind === 'sneaker' || high) && y === 48 && (i === 2 || i === 3)) c = acc
            if ((sh.kind === 'sneaker' || high) && view === 'front' && y === 47 && i === 1) c = m.l
            if (high && (y === 44 || y === 45) && i === 3) c = acc
            L.put(X(i), y, c)
          }
        }
        if (sh.kind === 'maryjane') for (let i = 0; i <= 3; i++) L.put(X(i), 47, i === 0 ? m.d : m.s)
        if (sh.glow) for (let i = 0; i <= 5; i++) L.put(X(i), 49, sh.glow[(i + (side === 1 ? 0 : 2)) % sh.glow.length])
        commit(b, L, m.d, TAG.cloth)
        if (sh.glow && view === 'front') {
          b.put(X(6), 48, mix(sh.glow[0], '#ffffff', 0.5), TAG.deco)
          b.put(X(5), 47, mix(sh.glow[1 % sh.glow.length], '#ffffff', 0.6), TAG.deco)
        }
      }
    }
  }
}

function drawLegsStand(b: Buf, r: Res, view: DollView) {
  const bt = r.bottom
  const hem = bottomHem(bt)
  // bare legs
  const skin = new Layer()
  for (let y = 34; y <= 46; y++) {
    for (const [a, z] of [
      [11, 14],
      [17, 20],
    ]) {
      for (let x = a; x <= z; x++) skin.put(x, y, x === z ? r.sk.s : r.sk.b)
    }
    if (y <= 37) for (let x = 10; x <= 21; x++) skin.put(x, y, r.sk.b)
  }
  commit(b, skin, r.sk.d, TAG.skin)
  // socks
  const sh = r.shoes
  if (!r.bare && sh?.sock) {
    const S = new Layer()
    const h = sh.sockH ?? 1
    for (let y = 47 - h; y <= 46; y++)
      for (const [a, z] of [
        [11, 14],
        [17, 20],
      ])
        for (let x = a; x <= z; x++) S.put(x, y, x === z ? mix(sh.sock, INK, 0.12) : sh.sock)
    commit(b, S, mix(sh.sock, INK, 0.3), TAG.cloth)
  }
  drawShoesStand(b, r, view)
  // garment
  const m = mat(bt.main, bt.shade)
  const G = new Layer()
  if (isSkirt(bt.kind)) {
    const bottom = bt.kind === 'sarong' ? 46 : hem
    for (let y = 34; y <= bottom; y++) {
      const k = y - 34
      const flare = bt.kind === 'sarong' ? (y >= 44 ? 0 : 0) : bt.kind === 'pleated' ? Math.floor(k / 2) : Math.floor(k / 3)
      const x0 = 10 - Math.min(flare, bt.kind === 'pleated' ? 3 : 3)
      const x1 = 21 + Math.min(flare, 3)
      for (let x = x0; x <= x1; x++) {
        let shade = x >= x1 - 1
        if (bt.kind === 'pleated' && y >= 36) {
          const rel = (x - x0) % 3
          shade = rel === 2 || x >= x1
        }
        let c = botCol(r, x, y, shade)
        if (bt.kind === 'sarong') {
          if (y === 35) c = m.s
          if (bt.hem && y >= 44) c = y === 44 ? mix(bt.hem, INK, 0.25) : (x + y) % 3 === 0 ? mix(bt.hem, '#ffffff', 0.4) : bt.hem
          if (x === 13 && y >= 36 && y < 44) c = m.s
        }
        if (y === bottom && bt.kind !== 'sarong') c = shade ? m.d : m.s
        G.put(x, y, c)
      }
    }
  } else {
    // pants-like
    const loose = bt.kind === 'loose' || bt.kind === 'jong'
    const legBot = bt.kind === 'jong' ? 41 : hem
    for (let y = 34; y <= legBot; y++) {
      const crotch = bt.kind === 'jong' ? 41 : loose ? 39 : bt.kind === 'shorts' ? 37 : 37
      if (y <= crotch) {
        const w = loose && y > 36 ? 1 : 0
        for (let x = 10 - w; x <= 21 + w; x++) G.put(x, y, botCol(r, x, y, x >= 20 + w || x === 15))
        continue
      }
      const spans: [number, number][] =
        bt.detail === 'muay' && y >= 39
          ? [
              [9, 15],
              [16, 22],
            ]
          : bt.kind === 'shorts'
          ? [
              [10, 15],
              [16, 21],
            ]
          : loose
            ? y >= legBot - 1
              ? [
                  [10, 14],
                  [17, 21],
                ]
              : [
                  [9, 15],
                  [16, 22],
                ]
            : [
                [10, 14],
                [17, 21],
              ]
      for (const [a, z] of spans) {
        for (let x = a; x <= z; x++) {
          let c = botCol(r, x, y, x >= z - (loose ? 1 : 0))
          if (bt.kind === 'shorts' && (x === 15 || x === 16)) c = m.s
          if (loose && y === legBot && bt.hem) c = bt.hem
          if (bt.detail === 'jogger' && y >= legBot - 1) c = y === legBot ? m.s : mix(m.b, INK, 0.08)
          if (bt.detail === 'fray' && y === legBot) c = (x + y) % 2 ? mix(m.b, '#ffffff', 0.5) : m.l
          G.put(x, y, c)
        }
      }
    }
  }
  commit(b, G, m.d, TAG.cloth)
  // details
  const put = (x: number, y: number, c: string) => b.put(x, y, c, TAG.cloth)
  if (bt.kind === 'pants' || bt.kind === 'shorts') {
    if (bt.detail === 'crease') {
      for (let y = 39; y <= 45; y++) {
        put(12, y, m.l)
        put(19, y, mix(m.b, '#ffffff', 0.15))
      }
    }
    if (bt.detail === 'denim' || bt.detail === 'fray') {
      const st = bt.stitch ?? '#e9b25a'
      put(11, 35, st)
      put(12, 36, st)
      put(20, 35, st)
      put(19, 36, st)
      put(15, 35, m.s)
      put(15, 36, m.s)
      put(16, 36, st)
      if (bt.detail === 'denim') {
        put(11, 45, m.l)
        put(12, 45, m.l)
        put(18, 45, m.l)
        put(19, 45, m.l)
      }
    }
    if (bt.detail === 'cargo') {
      for (const x0 of [9, 19]) {
        for (let y = 39; y <= 42; y++) for (let x = x0 + 1; x <= x0 + 2; x++) put(x, y, y === 39 ? m.d : m.s)
        put(x0 + 1, 40, m.b)
      }
    }
    if (bt.detail === 'jogger') {
      put(15, 35, bt.stripe ?? '#fffaf0')
      put(16, 36, bt.stripe ?? '#fffaf0')
      if (bt.stripe) for (let y = 38; y <= 44; y++) put(10, y, bt.stripe)
    }
  }
  if (bt.detail === 'muay') {
    for (let y = 37; y <= 40; y++) {
      put(12, y, mix(m.b, '#ffffff', 0.45))
      put(18, y, mix(m.b, '#ffffff', 0.3))
    }
    for (const x of [9, 22]) for (let y = 39; y <= 40; y++) put(x, y, bt.band ?? P.gold)
  }
  if (bt.detail === 'ripped') {
    for (const x0 of [12, 18]) {
      put(x0, 40, '#fbfcff'); put(x0 + 1, 40, m.l)
      put(x0, 41, r.sk.b); put(x0 + 1, 41, r.sk.b)
      put(x0 - 1, 41, '#e9edf5')
      put(x0, 42, m.l); put(x0 + 1, 42, '#fbfcff')
    }
  }
  if (bt.detail === 'pads') {
    for (const [a, z] of [[11, 14], [17, 20]]) for (let y = 40; y <= 42; y++) for (let x = a; x <= z; x++) put(x, y, y === 41 ? bt.stripe ?? '#aeb4c8' : x === z ? '#8a8496' : '#aeb4c8')
  }
  if (bt.kind === 'jong') {
    for (let y = 36; y <= 41; y++) put(15, y, m.d)
    if (bt.hem) for (let x = 9; x <= 22; x++) put(x, 41, bt.hem)
  }
  if (bt.belt) {
    for (let x = 10; x <= 21; x++) put(x, 34, x >= 20 ? mix(bt.belt, INK, 0.3) : bt.belt)
    if (bt.buckle) {
      put(15, 34, bt.buckle)
      put(16, 34, mix(bt.buckle, INK, 0.25))
    }
  } else if (bt.kind === 'loose' || bt.kind === 'sarong' || bt.kind === 'jong') {
    for (let x = 10; x <= 21; x++) put(x, 34, m.s)
  }
  drawBoots(b, r, view)
}

// Special leg poses. W seat, T thigh, K knee/shin, F foot/sole; lowercase = shade.
const LEGMAPS: Record<'kneelF' | 'kneelB' | 'sitF' | 'sitB', { y: number; rows: string[] }[]> = {
  kneelF: [
    { y: 42, rows: ['..........WWWWWWWWWWWW..........', '.........WWWWWWWWWWWWWW.........'] },
    { y: 44, rows: ['........TTTTTTT.................', '.......TTTTTTTT.................', '.......TTTTTTTt.................', '.......KKKKKKKk.................', '.......KKKKKKKk.................', '........KKKKKk..................'] },
    { y: 44, rows: ['................TTTTTTT.........', '................TTTTTTTT........', '................TTTTTTTt........', '................KKKKKKKk........', '................KKKKKKKk........', '.................KKKKKk.........'] },
  ],
  kneelB: [
    { y: 42, rows: ['..........WWWWWWWWWWWW..........', '.........WWWWWWWWWWWWWW.........', '........TWWWWWWWWWWWWWWt........', '........TWWWWWWWWWWWWWWt........', '........TTWWWWWWWWWWWWtt........'] },
    { y: 46, rows: ['.........FFFFF....FFFFf.........', '.........FFFFF....FFFFf.........', '.........FFFFf....FFFFf.........', '..........fff......fff..........'] },
  ],
  sitF: [
    { y: 43, rows: ['..........WWWWWWWWWWWW..........', '.......TTTTTTTTTTTTTTTTTT.......', '.....TTTTTTTTTTTTTTTTTTTTTT.....', '....TTTTTTTTTTTTTTTTTTTTTTTt....'] },
    { y: 46, rows: ['....TTTKKKKKKKKKKKKKKKKKKTTt....', '...TTTKKKKKKKKKKKKKKKKKKKKTtt...', '...TTKKKKKKKKKKKKKKKKKKKKKKtt...', '....FFFkkkkkkkkkkkkkkkkkkFFF....'] },
    { y: 46, rows: ['................KKKKKKKKKk......', '.............KKKKKKKKKKKKk......', '..........KKKKKKKKKKKKKKk.......', '.........kkkkkkkkkkkkkkk........'] },
  ],
  sitB: [
    { y: 43, rows: ['..........WWWWWWWWWWWW..........', '.........WWWWWWWWWWWWWW.........', '......TTTWWWWWWWWWWWWWWTTt......', '....TTTTTWWWWWWWWWWWWWWTTTtt....', '...TTTTTTWWWWWWWWWWWWWWTTTTtt...', '...KKKKKKWWWWWWWWWWWWWWKKKKkk...', '....KKKKKKKKKKKKKKKKKKKKKKkk....'] },
  ],
}

function drawLegsSpecial(b: Buf, r: Res, kind: 'kneelF' | 'kneelB' | 'sitF' | 'sitB') {
  const bt = r.bottom
  const m = mat(bt.main, bt.shade)
  const longCover = !(bt.kind === 'shorts' || ((bt.kind === 'skirt' || bt.kind === 'pleated') && bottomHem(bt) <= 41) || bt.kind === 'jong')
  const sh = r.shoes ?? DEFAULT_SHOE
  for (const part of LEGMAPS[kind]) {
    let skinLine = false
    const L = rowsLayer(part.rows, 0, part.y, (ch, x, y) => {
      const low = ch === ch.toLowerCase()
      const C = ch.toUpperCase()
      if (C === 'W' || C === 'T') return botCol(r, x, y, low)
      if (C === 'K') {
        if (longCover) return botCol(r, x, y, low)
        skinLine = true
        return low ? r.sk.s : r.sk.b
      }
      if (C === 'F') {
        if (r.bare || kind === 'sitF') {
          skinLine = true
          return low ? r.sk.s : mix(r.sk.b, r.sk.l, 0.5)
        }
        if (sh.kind === 'wrap') {
          skinLine = true
          return low ? r.sk.s : y % 2 ? sh.main : mix(r.sk.b, r.sk.l, 0.5)
        }
        return low ? mix(sh.sole ?? sh.shade, INK, 0.2) : sh.sole ?? sh.shade
      }
      return null
    })
    commit(b, L, skinLine && !longCover ? r.sk.d : m.d, TAG.cloth)
  }
  if (bt.detail === 'muay' && (kind === 'kneelF' || kind === 'sitF' || kind === 'kneelB' || kind === 'sitB')) {
    const y = kind === 'kneelF' || kind === 'kneelB' ? 42 : 43
    for (let x = 10; x <= 21; x++) b.put(x, y, bt.band ?? P.gold, TAG.cloth)
    for (let x = 11; x <= 20; x += 2) b.put(x, y, bt.bandText ?? P.red, TAG.cloth)
  }
  if (bt.belt && (kind === 'kneelF' || kind === 'sitF')) {
    const y = kind === 'kneelF' ? 42 : 43
    for (let x = 10; x <= 21; x++) b.put(x, y, bt.belt)
    if (bt.buckle) b.put(15, y, bt.buckle)
  }
  if ((kind === 'kneelF' || kind === 'sitF') && !longCover && isSkirt(bt.kind)) {
    // skirt hem across the thighs
    const y = kind === 'kneelF' ? 46 : 45
    for (let x = 7; x <= 24; x++) if (b.tag(x, y) === TAG.cloth) b.put(x, y, m.d)
  }
}

// ---- torso

function drawTorso(b: Buf, r: Res, dy: number, view: DollView) {
  const t = r.top
  const { body } = topMats(t)
  const L = new Layer()
  for (let y = 24; y <= hemRow(t); y++) {
    const sp = torsoSpan(r, y)
    if (!sp) continue
    const [x0, x1] = sp
    for (let x = x0; x <= x1; x++) {
      const shade = x >= x1 - 1 || (y === 24 && view === 'front') || y === hemRow(t)
      const light = view === 'front' && x === x0 + 1 && y >= 25 && y <= 27
      L.put(x, y + dy, clothCol(body, t.pattern, t.patternColor, t.patternColor2, x, y, shade, light))
    }
  }
  commit(b, L, body.d, TAG.cloth)
}

const put = (b: Buf, x: number, y: number, c: string | undefined | null) => b.put(x, y, c, TAG.cloth)

// Tiny 3×5 digits for jersey numbers.
const DIGITS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
}

const GRAPHICS: Record<string, string[]> = {
  lotus: ['..1..', '.121.', '11211', '.111.', 'g.g.g'],
  heart: ['11.11', '12111', '11111', '.111.', '..1..'],
  star: ['..1..', '11211', '.111.', '.1.1.'],
  elephant: ['.111..', '111111', '1211.1', '1..1..'],
  // บุญ in pixels
  boon: ['1.1..1...1.1', '1.1..1.1.111', '111.11.1.1.1', '...1....11.1', '..2.....'],
  // หิว
  hiw: ['..111.....', '.1...1....', '..........', '1...1..111', '1...1.1..1', '1..11....1', '1.1.1....1', '11..1....1'],
  // อย่า / กวน
  yakuan: ['......2...', '.11.1.1.11', '1.1.1.1..1', '1.1.111..1', '111...1..1', '..........', '111..11.1.1', '1.1.1.1.1.1', '1.1...1.1.1', '1.1...1.111'],
  // บุญ / มา
  boonma: ['1.1..1...1.1', '1.1..1.1.111', '111.11.1.1.1', '...1....11.1', '..2.........', '...1..1.11..', '...1..1..1..', '...11.1..1..', '...1.11..1..'],
  // ไม่ + chilli / เผ็ด
  // a fighting rooster like the statues at Ai Khai's shrine
  aikhai: ['.22.....', '.111...3', '211.1.33', '.11111.3', '..11113.', '..1111..', '...2.2..'],
  maiphet: ['11.....2....', '.1.1..1..33.', '.1.1..1.222.', '.1.1.11.22..', '.1.11.1.2...', '11..........', '.......1....', '1.1...1.111.', '1.1...1...1.', '1.1.1.1.1.1.', '11.1.1..111.'],
}

function drawGraphic(b: Buf, key: string, cx: number, y: number, c1: string, c2: string, clip?: (x: number, y: number) => boolean) {
  const g = GRAPHICS[key]
  if (!g) return
  const w = Math.max(...g.map((s) => s.length))
  const x0 = Math.round(cx - w / 2)
  g.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '.') continue
      if (clip && !clip(x0 + i, y + j)) continue
      put(b, x0 + i, y + j, ch === '1' ? c1 : ch === '2' ? c2 : ch === 'g' ? c2 : ch === '3' ? '#43905a' : ch === 'k' ? EYE_K : c1)
    }
  })
}

const NAGA = ['..11.....', '.1221....', '.11.1..1.', '....11.21', '.1...1111', '121...11.', '.11111...', '..111....']

function drawTopFront(b: Buf, r: Res, dy: number) {
  const t = r.top
  const { body, jacket } = topMats(t)
  const Y = (y: number) => y + dy
  const f = r.g === 'f'
  const collar = t.collar ?? 'crew'
  const cc = t.collarColor ?? (t.trim && collar !== 'shirt' && collar !== 'bua' ? t.trim : mix(body.b, '#ffffff', 0.4))
  const ccm = mat(cc, mix(cc, body.s, 0.6))
  const skin = r.sk
  const hem = hemRow(t)

  // neckline
  switch (collar) {
    case 'crew':
    case 'hood':
      for (let x = 14; x <= 17; x++) put(b, x, Y(24), skin.s)
      put(b, 13, Y(24), cc === body.b ? body.s : ccm.s)
      put(b, 18, Y(24), cc === body.b ? body.s : ccm.s)
      for (let x = 14; x <= 17; x++) put(b, x, Y(25), t.trim && collar === 'crew' && t.trim !== body.b ? ccm.s : body.s)
      break
    case 'v':
    case 'jersey': {
      for (let x = 13; x <= 18; x++) put(b, x, Y(24), skin.s)
      for (let x = 14; x <= 17; x++) put(b, x, Y(25), skin.b)
      put(b, 15, Y(26), skin.b)
      put(b, 16, Y(26), skin.b)
      const tc = collar === 'jersey' ? t.trim ?? cc : body.s
      put(b, 12, Y(24), tc)
      put(b, 13, Y(25), tc)
      put(b, 14, Y(26), tc)
      put(b, 15, Y(27), tc)
      put(b, 16, Y(27), tc)
      put(b, 17, Y(26), tc)
      put(b, 18, Y(25), tc)
      put(b, 19, Y(24), tc)
      if (collar === 'jersey') {
        put(b, 13, Y(24), cc)
        put(b, 18, Y(24), cc)
      }
      break
    }
    case 'shirt':
    case 'camp':
    case 'polo': {
      const open = collar === 'camp' || (collar === 'shirt' && !t.tie)
      put(b, 15, Y(24), skin.s)
      put(b, 16, Y(24), skin.s)
      if (open) {
        put(b, 15, Y(25), skin.b)
        put(b, 16, Y(25), skin.b)
        if (collar === 'camp') {
          put(b, 15, Y(26), skin.b)
          put(b, 16, Y(26), skin.b)
        }
      }
      // collar flaps
      const flap = collar === 'polo' ? [[12, 24], [13, 24], [14, 24], [13, 25], [14, 25]] : [[11, 24], [12, 24], [13, 24], [14, 24], [12, 25], [13, 25], [14, 25], [14, 26]]
      if (collar === 'camp') flap.push([13, 26], [14, 27])
      for (const [x, y] of flap) {
        put(b, x, Y(y), ccm.b)
        put(b, 31 - x, Y(y), ccm.b)
      }
      // flap edges
      const edge = collar === 'polo' ? [[12, 25], [14, 26]] : [[11, 25], [12, 26], [13, 26], [14, 27]]
      if (collar !== 'camp') {
        const ec = mix(body.s, INK, 0.5)
        for (const [x, y] of edge) {
          put(b, x, Y(y), ec)
          put(b, 31 - x, Y(y), ec)
        }
      }
      put(b, 14, Y(24), ccm.l)
      break
    }
    case 'bua': {
      put(b, 15, Y(24), skin.s)
      put(b, 16, Y(24), skin.s)
      const pts: [number, number][] = [
        [11, 24], [12, 24], [13, 24], [14, 24],
        [10, 25], [11, 25], [12, 25], [13, 25], [14, 25],
        [10, 26], [11, 26], [12, 26], [13, 26], [14, 26],
        [11, 27], [12, 27], [13, 27],
      ]
      for (const [x, y] of pts) {
        put(b, x, Y(y), y === 24 ? ccm.l : ccm.b)
        put(b, 31 - x, Y(y), y === 24 ? ccm.l : ccm.b)
      }
      for (const [x, y] of [[10, 27], [11, 28], [12, 28], [13, 28], [14, 27], [15, 25], [15, 26]] as [number, number][]) {
        put(b, x, Y(y), body.d)
        put(b, 31 - x, Y(y), body.d)
      }
      break
    }
    case 'mandarin':
      for (let x = 13; x <= 18; x++) put(b, x, Y(24), x === 18 ? ccm.s : ccm.b)
      put(b, 15, Y(24), ccm.s)
      break
    case 'none':
      break
  }

  // jacket layered over
  if (t.jacket && jacket) {
    const j = t.jacket
    const J = new Layer()
    for (let y = 24; y <= Math.max(hem, 35); y++) {
      const sp = torsoSpan(r, Math.min(y, 35)) ?? [10, 21]
      const [x0, x1] = [Math.min(sp[0], 10), Math.max(sp[1], 21)]
      const open = y <= 25 ? 3 : y <= 28 ? 2 : 1
      for (let x = x0; x <= x1; x++) {
        if (x >= 15 - open + 1 && x <= 16 + open - 1) continue
        const shade = x >= x1 - 1 || x === 16 + open
        let c = clothCol(jacket, j.pattern, j.patternColor, undefined, x, y, shade)
        if ((j.kind === 'varsity' || j.kind === 'sukajan') && y >= 34) c = y % 2 ? j.trim ?? jacket.l : mix(j.trim ?? jacket.l, INK, 0.2)
        if (j.kind === 'cardigan' && (x === 15 - open || x === 16 + open)) c = j.trim ?? jacket.l
        J.put(x, Y(y), c)
      }
    }
    commit(b, J, jacket.d, TAG.cloth)
    if (j.kind === 'denim') {
      // collar + chest pockets + buttons
      for (const x of [11, 12]) {
        put(b, x, Y(24), jacket.l)
        put(b, 31 - x, Y(24), jacket.l)
      }
      put(b, 12, Y(25), jacket.l)
      put(b, 19, Y(25), jacket.l)
      for (const x0 of [10, 18]) {
        put(b, x0 + 1, Y(28), jacket.d)
        put(b, x0 + 2, Y(28), jacket.d)
        put(b, x0 + 1, Y(29), jacket.s)
        put(b, x0 + 2, Y(29), jacket.s)
      }
      put(b, 12, Y(29), '#e9b25a')
      put(b, 19, Y(29), '#e9b25a')
    } else if (j.kind === 'cardigan') {
      for (const y of [28, 30, 32]) put(b, 18, Y(y), mix(j.trim ?? '#ffffff', INK, 0.25))
    } else if (j.kind === 'varsity' || j.kind === 'sukajan') {
      for (const x of [12, 13]) {
        put(b, x, Y(24), j.trim)
        put(b, 31 - x, Y(24), j.trim)
      }
      if (j.emblem === 'letter') {
        const L = ['###', '#.#', '##.', '#.#', '###']
        L.forEach((row, jj) => {
          for (let i = 0; i < 3; i++) if (row[i] === '#') put(b, 10 + i + (f ? 1 : 0), Y(27 + jj), i === 2 ? j.emblemColor2 : j.emblemColor)
        })
      } else if (j.emblem === 'naga') {
        put(b, 19, Y(27), j.emblemColor)
        put(b, 18, Y(28), j.emblemColor)
        put(b, 19, Y(29), j.emblemColor2)
        put(b, 20, Y(28), j.emblemColor2)
      }
    }
  }

  // placket / buttons
  const btn = t.buttonColor ?? mix(body.b, '#ffffff', 0.5)
  if (!t.jacket && (t.placket === 'buttons' || t.extra === 'buttons')) {
    const start = collar === 'camp' ? 27 : collar === 'bua' ? 28 : 25
    for (let y = start; y <= Math.min(hem - 1, 33); y++) {
      put(b, 16, Y(y), body.s)
      if ((y - start) % 2 === 1) put(b, 15, Y(y), btn)
    }
    if (t.trim && t.extra === 'buttons' && collar === 'mandarin') for (let y = 25; y < hem; y++) put(b, 16, Y(y), t.trim)
  } else if (t.placket === 'half') {
    for (let y = 25; y <= 27; y++) put(b, 16, Y(y), body.s)
    put(b, 15, Y(25), btn)
    put(b, 15, Y(27), btn)
  } else if (t.placket === 'zip') {
    for (let y = 25; y < hem; y++) put(b, 15, Y(y), body.s)
  }

  // pockets
  if (t.pocket === 'chest' || t.pocket === 'chest2') {
    const xs = t.pocket === 'chest2' ? [f ? 12 : 11, 17] : [17]
    for (const x0 of xs) {
      for (let y = 27; y <= 30; y++) for (let x = x0; x <= x0 + 3; x++) {
        const edge = y === 27 || y === 30 || x === x0 || x === x0 + 3
        if (edge) put(b, x, Y(y), y === 27 ? body.s : mix(body.b, body.s, 0.6))
      }
      if (t.pocket === 'chest2') {
        for (let x = x0; x <= x0 + 3; x++) put(b, x, Y(27), body.s)
        put(b, x0 + 1, Y(28), btn)
      }
    }
  } else if (t.pocket === 'lower2') {
    for (const x0 of [f ? 11 : 10, 18]) {
      for (let x = x0; x <= x0 + 3; x++) put(b, x, Y(31), body.s)
      put(b, x0, Y(32), body.s)
      put(b, x0 + 3, Y(32), body.s)
    }
  } else if (t.pocket === 'kangaroo') {
    for (let x = 12; x <= 19; x++) put(b, x, Y(31), body.s)
    put(b, 11, Y(32), body.s)
    put(b, 20, Y(32), body.s)
    put(b, 11, Y(33), body.s)
    put(b, 20, Y(33), body.s)
    for (let x = 12; x <= 19; x++) put(b, x, Y(34), mix(body.b, body.s, 0.5))
  }

  // school initials & name
  if (t.emblem === 'school') {
    const ec = t.emblemColor ?? '#3d63b5'
    const side = t.emblemSide ?? 'r'
    if (side === 'r') {
      put(b, 18, Y(t.pocket ? 28 : 27), ec)
      put(b, 19, Y(t.pocket ? 28 : 27), ec)
      put(b, 18, Y(t.pocket ? 29 : 28), ec)
      if (t.nameTag) for (const x of [11, 12, 14]) put(b, x + (f ? 1 : 0), Y(27), ec)
    } else {
      const x0 = f ? 12 : 11
      put(b, x0, Y(29), ec)
      put(b, x0 + 1, Y(29), ec)
      put(b, x0 + 2, Y(28), ec)
      if (t.nameTag) for (const x of [0, 1, 3]) put(b, x0 + x, Y(31), ec)
    }
  } else if (t.emblem === 'crest') {
    put(b, 18, Y(27), t.emblemColor ?? P.red)
    put(b, 19, Y(27), '#ffffff')
    put(b, 18, Y(28), '#ffffff')
    put(b, 19, Y(28), t.emblemColor ?? P.red)
    put(b, 18, Y(29), mix(t.emblemColor ?? P.red, INK, 0.3))
  }
  if (t.stripe) {
    // shoulder trim
    for (const x of [11, 12]) {
      put(b, x, Y(25), t.stripe)
      put(b, 31 - x, Y(25), mix(t.stripe, INK, 0.2))
    }
  }

  // graphics
  const gk = t.graphic ?? (t.extra === 'logo' ? 'lotus' : undefined)
  if (gk && !t.jacket) {
    const big = gk === 'hiw' || gk === 'yakuan' || gk === 'boonma' || gk === 'maiphet'
    const clip = (x: number, y: number) => {
      const sp = torsoSpan(r, y - dy)
      return !!sp && x >= sp[0] && x <= sp[1]
    }
    drawGraphic(b, gk, 16, Y(big ? 26 : 27), t.graphicColor ?? t.extraColor ?? P.pink, t.graphicColor2 ?? P.leaf, clip)
  }

  // ties
  if (t.tie === 'tie') {
    const tc = t.tieColor ?? NAVY_D
    const ts = t.tieColor2 ?? mix(tc, INK, 0.3)
    put(b, 15, Y(24), ts)
    put(b, 16, Y(24), ts)
    for (let y = 25; y <= 31; y++) {
      put(b, 15, Y(y), tc)
      put(b, 16, Y(y), ts)
    }
    put(b, 15, Y(32), ts)
  } else if (t.tie === 'bow') {
    const tc = t.tieColor ?? NAVY_D
    const ts = t.tieColor2 ?? mix(tc, INK, 0.3)
    for (const [x, y, c] of [
      [15, 25, ts], [16, 25, ts], [13, 24, tc], [14, 25, tc], [17, 25, tc], [18, 24, tc], [13, 25, tc], [18, 25, ts],
      [14, 26, tc], [14, 27, tc], [13, 28, ts], [17, 26, ts], [17, 27, ts], [18, 28, ts],
    ] as [number, number, string][]) put(b, x, Y(y), c)
  } else if (t.tie === 'scarf') {
    const tc = t.tieColor ?? P.gold
    const t2 = t.tieColor2 ?? P.red
    for (let x = 11; x <= 20; x++) put(b, x, Y(24), x % 3 === 0 ? t2 : tc)
    for (const [x, y] of [[13, 25], [14, 25], [17, 25], [18, 25], [14, 26], [17, 26]] as [number, number][]) put(b, x, Y(y), tc)
    put(b, 15, Y(26), '#8a5a32')
    put(b, 16, Y(26), '#6e4a35')
    put(b, 15, Y(27), tc)
    put(b, 16, Y(27), t2)
    put(b, 15, Y(28), tc)
    put(b, 16, Y(28), tc)
    put(b, 15, Y(29), t2)
  }
  if (t.epaulets) {
    for (const x of [11, 12]) {
      put(b, x, Y(24), body.s)
      put(b, 31 - x, Y(24), body.s)
    }
  }
  if (t.pin) {
    put(b, f ? 12 : 11, Y(26), t.pin)
    put(b, f ? 13 : 12, Y(26), mix(t.pin, '#ffffff', 0.4))
    put(b, f ? 12 : 11, Y(27), mix(t.pin, INK, 0.3))
  }

  // legacy extras
  const ec = t.extraColor ?? P.gold
  if (t.extra === 'sabai') {
    // bare viewer-left shoulder, gold sash from the right shoulder to the left hip
    for (let x = 10; x <= 14; x++) put(b, x, Y(24), null)
    for (let i = 0; i < 10; i++) {
      const y = 24 + i
      const xc = 20 - i
      for (let k = -1; k <= 2; k++) {
        const x = xc + k
        if (x < 10 || x > 21) continue
        put(b, x, Y(y), k === 2 ? mix(ec, INK, 0.3) : (x + y) % 3 === 0 ? '#fff3a6' : ec)
      }
    }
    for (let y = 24; y <= 26; y++) for (let x = 10; x <= 13 - (y - 24); x++) b.put(x, Y(y), skin.b, TAG.skin)
  } else if (t.extra === 'overalls') {
    const oc = mat(ec)
    for (let y = 29; y <= hem; y++) for (let x = 12; x <= 19; x++) put(b, x, Y(y), x >= 18 ? oc.s : oc.b)
    for (let y = 24; y <= 28; y++) {
      put(b, 12, Y(y), oc.b)
      put(b, 19, Y(y), oc.s)
    }
    put(b, 12, Y(29), P.gold)
    put(b, 19, Y(29), P.gold)
    for (let x = 14; x <= 17; x++) put(b, x, Y(30), oc.s)
  } else if (t.extra === 'sash') {
    for (let i = 0; i < 9; i++) put(b, 11 + i, Y(25 + i), ec)
  }
  drawTopLayersFront(b, r, dy)
  if (collar === 'hood') {
    const dc = t.trim ?? '#fffaf0'
    put(b, 14, Y(26), dc)
    put(b, 14, Y(27), dc)
    put(b, 17, Y(26), dc)
    put(b, 17, Y(27), dc)
    put(b, 14, Y(28), mix(dc, INK, 0.2))
    put(b, 17, Y(28), mix(dc, INK, 0.2))
  }
}

const NAVY_D = '#2a2f55'

function drawTopBack(b: Buf, r: Res, dy: number) {
  const t = r.top
  const { body, jacket } = topMats(t)
  const Y = (y: number) => y + dy
  const collar = t.collar ?? 'crew'
  const cc = t.collarColor ?? mix(body.b, '#ffffff', 0.4)
  const hem = hemRow(t)
  if (t.jacket && jacket) {
    const J = new Layer()
    for (let y = 24; y <= Math.max(hem, 35); y++) {
      const sp = torsoSpan(r, Math.min(y, 35)) ?? [10, 21]
      for (let x = Math.min(sp[0], 10); x <= Math.max(sp[1], 21); x++) {
        let c = clothCol(jacket, t.jacket.pattern, t.jacket.patternColor, undefined, x, y, x >= 20)
        if ((t.jacket.kind === 'varsity' || t.jacket.kind === 'sukajan') && (y >= 34 || y === 24)) c = t.jacket.trim ?? jacket.l
        J.put(x, Y(y), c)
      }
    }
    commit(b, J, jacket.d, TAG.cloth)
    const j = t.jacket
    if (j.emblem === 'naga') {
      NAGA.forEach((row, jj) => {
        for (let i = 0; i < row.length; i++) {
          const ch = row[i]
          if (ch === '.') continue
          put(b, 11 + i, Y(26 + jj), ch === '1' ? j.emblemColor : j.emblemColor2)
        }
      })
    } else if (j.emblem === 'letter') {
      drawGraphic(b, 'star', 16, Y(27), j.emblemColor ?? '#fff', j.emblemColor2 ?? P.gold)
    } else if (j.kind === 'denim') {
      for (let x = 11; x <= 20; x++) put(b, x, Y(28), jacket.s)
      put(b, 13, Y(29), jacket.s)
      put(b, 18, Y(29), jacket.s)
    }
    return
  }
  if (collar === 'shirt' || collar === 'polo' || collar === 'camp' || collar === 'mandarin') {
    for (let x = 12; x <= 19; x++) put(b, x, Y(24), x >= 18 ? mix(cc, body.s, 0.6) : cc)
  } else if (collar === 'bua') {
    for (let y = 24; y <= 27; y++) for (let x = 11 + (y === 27 ? 1 : 0); x <= 20 - (y === 27 ? 1 : 0); x++) put(b, x, Y(y), y === 27 ? body.d : x >= 19 ? mix(cc, body.s, 0.6) : cc)
    for (let x = 12; x <= 19; x++) put(b, x, Y(28), body.s)
  } else if (collar === 'hood') {
    const hc = mat(t.main, t.shade)
    for (let y = 24; y <= 29; y++) {
      const w = y === 29 ? 2 : y === 28 ? 3 : 4
      for (let x = 16 - w; x <= 15 + w; x++) put(b, x, Y(y), y === 29 || x === 15 + w ? hc.d : y === 24 ? hc.l : hc.s)
    }
    if (t.extra === 'hood') {
      const ec = t.extraColor ?? P.brown
      for (const x of [11, 12]) {
        put(b, x, Y(25), ec)
        put(b, x, Y(26), ec)
        put(b, 31 - x, Y(25), ec)
        put(b, 31 - x, Y(26), ec)
      }
    }
  } else if (collar === 'jersey') {
    for (let x = 13; x <= 18; x++) put(b, x, Y(24), t.trim ?? cc)
  }
  if (t.tie === 'scarf') {
    const tc = t.tieColor ?? P.gold
    for (let y = 24; y <= 28; y++) {
      const w = 28 - y
      for (let x = 16 - w; x <= 15 + w; x++) put(b, x, Y(y), (x + y) % 5 === 0 ? t.tieColor2 ?? P.red : tc)
    }
  }
  if (t.number) {
    const n = t.number
    const w = n.length * 4 - 1
    let x = 16 - Math.ceil(w / 2)
    for (const ch of n) {
      const d = DIGITS[ch]
      if (d)
        d.forEach((row, jj) => {
          for (let i = 0; i < 3; i++) if (row[i] === '#') put(b, x + i, Y(26 + jj), t.numberColor ?? '#fff')
        })
      x += 4
    }
  }
  const ec = t.extraColor ?? P.gold
  if (t.extra === 'sabai') {
    for (let y = 24; y <= 33; y++) for (let x = 18; x <= 20; x++) put(b, x, Y(y), x === 20 ? mix(ec, INK, 0.3) : (x + y) % 3 === 0 ? '#fff3a6' : ec)
  } else if (t.extra === 'overalls') {
    const oc = mat(ec)
    for (let i = 0; i < 5; i++) {
      put(b, 12 + i, Y(24 + i), oc.b)
      put(b, 19 - i, Y(24 + i), oc.s)
    }
    for (let y = 30; y <= hem; y++) for (let x = 11; x <= 20; x++) put(b, x, Y(y), x >= 19 ? oc.s : oc.b)
  }
  if (t.extra === 'buttons' || t.emblem === 'school') {
    // yoke seam
    for (let x = 12; x <= 19; x++) put(b, x, Y(26), mix(body.b, body.s, 0.5))
  }
  drawTopLayersBack(b, r, dy)
}

// ---------------------------------------------------------------------------
// Accessories (head items use the head offset dy)

function drawHeadAcc(b: Buf, _r: Res, key: string | null, view: DollView, dy: number, stage: 'under' | 'over') {
  if (!key) return
  const L = new Layer()
  const p = (x: number, y: number, c: string) => L.put(x, y + dy, c)
  const done = (line: string) => commit(b, L, line, TAG.deco)
  const front = view === 'front'
  switch (key) {
    case 'glasses':
    case 'sunglasses':
    case 'sunsetshades':
    case 'mirrorshades': {
      if (!front || stage !== 'over') return
      const k = key === 'mirrorshades' ? '#8a8496' : key === 'sunsetshades' ? '#e8709e' : '#4a3246'
      for (const x0 of [9, 18]) {
        for (let i = 0; i < 5; i++) {
          b.put(x0 + i, 14 + dy, k)
          b.put(x0 + i, 20 + dy, k)
        }
        for (let y = 15; y <= 19; y++) {
          b.put(x0 - 1 + (y === 15 || y === 19 ? 1 : 0), y + dy, k)
          b.put(x0 + 5 - (y === 15 || y === 19 ? 1 : 0), y + dy, k)
        }
        if (key === 'sunglasses') {
          for (let y = 15; y <= 19; y++) for (let x = x0 + (y === 15 || y === 19 ? 1 : 0); x <= x0 + 4 - (y === 15 || y === 19 ? 1 : 0); x++) b.put(x, y + dy, y <= 16 ? '#4d4466' : '#2e2840')
          b.put(x0 + 1, 15 + dy, '#9fd0ff')
        } else if (key === 'sunsetshades') {
          // Beach souvenir: lenses fading sunset orange to pink, a sun glint.
          const SS = ['#ffd23f', '#ffb347', '#ff8f6a', '#ff6f91', '#e8558a']
          for (let y = 15; y <= 19; y++) for (let x = x0 + (y === 15 || y === 19 ? 1 : 0); x <= x0 + 4 - (y === 15 || y === 19 ? 1 : 0); x++) b.put(x, y + dy, SS[y - 15])
          b.put(x0 + 1, 15 + dy, '#fff6c8')
          b.put(x0 + 3, 18 + dy, '#ffd6e0')
        } else if (key === 'mirrorshades') {
          // chrome lenses with a rainbow sheen
          const MR = ['#f4f8ff', '#cfe0f5', '#a9c2e6', '#ffc4e6', '#8fb0dc']
          for (let y = 15; y <= 19; y++) for (let x = x0 + (y === 15 || y === 19 ? 1 : 0); x <= x0 + 4 - (y === 15 || y === 19 ? 1 : 0); x++) b.put(x, y + dy, MR[(y - 15 + (x - x0 === 3 ? 1 : 0)) % MR.length])
          b.put(x0 + 1, 15 + dy, '#ffffff')
        } else b.put(x0 + 1, 15 + dy, '#e6f6ff')
      }
      b.put(14, 16 + dy, k)
      b.put(15, 15 + dy, k)
      b.put(16, 15 + dy, k)
      b.put(17, 16 + dy, k)
      b.put(5, 16 + dy, k)
      b.put(26, 16 + dy, k)
      return
    }
    case 'jasmine':
      if (stage !== 'over') return
      if (front) {
        p(24, 12, '#fffaf0'); p(25, 12, '#fffaf0'); p(24, 13, '#ffe45e'); p(25, 13, '#fffaf0'); p(26, 13, '#fffaf0'); p(25, 14, '#fffaf0'); p(24, 14, '#6cc36a'); p(23, 15, '#43905a')
      } else {
        p(6, 12, '#fffaf0'); p(7, 12, '#fffaf0'); p(7, 13, '#ffe45e'); p(6, 13, '#fffaf0'); p(5, 13, '#fffaf0'); p(6, 14, '#fffaf0'); p(7, 14, '#6cc36a')
      }
      return done('#8c8187')
    case 'frangipani': {
      if (stage !== 'over') return
      const x0 = front ? 22 : 5
      const F = ['.pp.', 'pPyp', 'pyPp', '.pp.']
      F.forEach((row, j) => { for (let i = 0; i < 4; i++) { const ch = row[i]; if (ch !== '.') p(x0 + i, 8 + j, ch === 'p' ? '#ff9fc0' : ch === 'P' ? '#ffd6e0' : '#fff09a') } })
      return done('#c24f7e')
    }
    case 'clips': {
      if (stage !== 'over') return
      const cols = ['#ff9fc0', '#7fd3b5', '#ffd54f']
      cols.forEach((c, i) => {
        const x = front ? 20 + i * 2 : 7 + i * 2
        p(x, 9 + i, c); p(x + 1, 9 + i, c); p(x + 2, 9 + i, mix(c, INK, 0.25))
      })
      return
    }
    case 'ribbon': {
      if (stage !== 'over') return
      const R = ['rr....rr', 'rRr..rRr', 'rrrKKrrr', 'rRr..rRr', 'rr....rr', '...rr...', '..r..r..']
      const x0 = front ? 19 : 12
      const y0 = front ? 1 : 8
      R.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.') p(x0 + i, y0 + j, ch === 'r' ? '#e8514a' : ch === 'R' ? '#ff8a7a' : '#b8343f') } })
      return done('#7e2436')
    }
    case 'cap': {
      if (stage !== 'over') return
      const c = mat('#34467e', '#263461')
      for (let y = 2; y <= 9; y++) {
        const w = [6, 8, 9, 10, 10, 11, 11, 11][y - 2]
        for (let x = 16 - w; x <= 15 + w; x++) p(x, y, x >= 15 + w - 1 ? c.s : y === 3 && x < 14 ? c.l : c.b)
      }
      if (front) {
        for (let x = 4; x <= 27; x++) p(x, 10, x >= 24 ? '#1f2a52' : '#2a3868')
        for (let x = 6; x <= 25; x++) p(x, 11, '#1b2448')
        p(14, 6, '#ff9fc0'); p(15, 5, '#ff9fc0'); p(16, 5, '#ff9fc0'); p(17, 6, '#ff9fc0'); p(15, 6, '#ffd6e0'); p(16, 6, '#ffd6e0'); p(15, 7, '#6cc36a'); p(16, 7, '#6cc36a')
      } else {
        for (let x = 13; x <= 18; x++) p(x, 9, '#1b2448')
        p(15, 8, '#e0dce8'); p(16, 8, '#e0dce8')
      }
      return done(c.d)
    }
    case 'headphones': {
      if (stage !== 'over') return
      const k = '#4a3f55'
      for (let x = 7; x <= 24; x++) {
        const y = x < 10 || x > 21 ? 4 : 2
        p(x, y, k); p(x, y + 1, x < 16 ? '#8a7f9a' : '#6a5f7a')
      }
      for (const x of [6, 7, 24, 25]) for (let y = 5; y <= 11; y++) if (!((x === 7 || x === 24) && y < 8)) p(x, y, k)
      for (const x0 of [3, 25]) for (let y = 12; y <= 18; y++) for (let x = x0; x <= x0 + 3; x++) p(x, y, x === x0 + 1 && y >= 13 && y <= 17 ? '#ff9fc0' : y === 12 || y === 18 ? '#6a5f7a' : k)
      return done('#2a2230')
    }
    case 'ngob': {
      if (stage !== 'over') return
      const lt = '#f0cf8a', md = '#d9ae66', dk = '#a8733a'
      for (let y = 0; y <= 6; y++) {
        const w = [3, 5, 7, 8, 9, 10, 10][y]
        for (let x = 16 - w; x <= 15 + w; x++) p(x, y, (x + y) % 3 === 0 ? md : x >= 13 + w ? md : lt)
      }
      for (let x = 1; x <= 30; x++) p(x, 7, x % 2 ? lt : md)
      for (let x = 0; x <= 31; x++) p(x, 8, x >= 26 ? dk : md)
      for (let x = 6; x <= 25; x++) p(x, 6, '#8a5a32')
      return done(dk)
    }
    case 'dogears': {
      if (stage !== 'over') return
      for (const x0 of [5, 22]) {
        const E = ['.bb.', 'bBBb', 'bBBb', 'bBBb', '.bb.']
        E.forEach((row, j) => { for (let i = 0; i < 4; i++) { const ch = row[i]; if (ch !== '.') p(x0 + i, j + 1, ch === 'b' ? '#9a6a45' : '#e0a868') } })
      }
      return done('#6e4a35')
    }
    case 'lotus': {
      if (stage !== 'over') return
      const Lo = ['......pp......', '...p.pPPp.p...', '..ppPpPPpPpp..', '..pPPPPPPPPp..', '...gggggggg...']
      Lo.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.') p(9 + i, j, ch === 'p' ? '#e8709e' : ch === 'P' ? '#ffc4d8' : '#43905a') } })
      return done('#a8436e')
    }
    default:
      drawHeadAccNew(b, _r, key, view, dy, stage)
  }
}

function drawBodyAcc(b: Buf, _r: Res, key: string | null, view: DollView, dy: number) {
  if (!key) return
  const L = new Layer()
  const p = (x: number, y: number, c: string) => L.put(x, y + dy, c)
  const front = view === 'front'
  switch (key) {
    case 'garland': {
      const pts: [number, number][] = front
        ? [[11, 24], [12, 25], [12, 26], [13, 27], [14, 28], [15, 28], [16, 28], [17, 28], [18, 27], [19, 26], [19, 25], [20, 24]]
        : [[11, 24], [12, 24], [13, 25], [14, 25], [15, 25], [16, 25], [17, 25], [18, 25], [19, 24], [20, 24]]
      pts.forEach(([x, y], i) => p(x, y, i % 2 ? '#ffd23f' : '#f58f35'))
      if (front) {
        p(15, 29, '#e8514a'); p(16, 29, '#e8514a'); p(15, 30, '#fffaf0'); p(16, 30, '#6cc36a')
      }
      commit(b, L, '#b8742a', TAG.deco)
      return
    }
    case 'scarf': {
      for (let x = 11; x <= 20; x++) { p(x, 24, (x % 3 === 0) ? '#3d63b5' : '#e8514a'); p(x, 25, (x % 3 === 1) ? '#ffd54f' : '#e8514a') }
      if (front) for (let y = 26; y <= 31; y++) { p(18, y, y % 3 === 0 ? '#3d63b5' : '#e8514a'); p(19, y, y % 3 === 1 ? '#ffd54f' : '#b8343f') }
      else for (let y = 26; y <= 28; y++) { p(12, y, '#e8514a'); p(13, y, '#3d63b5') }
      commit(b, L, '#7e2436', TAG.deco)
      return
    }
    case 'waistsash': {
      const y0 = 33
      for (let x = 9; x <= 22; x++) { p(x, y0, (x % 3 === 0) ? '#3d63b5' : '#e8514a'); p(x, y0 + 1, (x % 3 === 1) ? '#ffd54f' : '#b8343f') }
      const kx = front ? 20 : 11
      p(kx, y0 + 2, '#e8514a'); p(kx + 1, y0 + 2, '#3d63b5'); p(kx, y0 + 3, '#e8514a'); p(kx + 1, y0 + 4, '#b8343f'); p(kx - 1, y0 + 3, '#3d63b5')
      commit(b, L, '#7e2436', TAG.deco)
      return
    }
    case 'amulet': {
      if (!front) {
        for (let x = 13; x <= 18; x++) p(x, 24, '#e9b949')
        commit(b, L, null, TAG.deco)
        return
      }
      for (const [x, y] of [[12, 24], [13, 25], [14, 26], [17, 26], [18, 25], [19, 24]] as [number, number][]) p(x, y, '#e9b949')
      p(15, 27, '#e9b949'); p(16, 27, '#e9b949')
      p(15, 28, '#ffd54f'); p(16, 28, '#b8742a'); p(15, 29, '#b8742a'); p(16, 29, '#8a5a32')
      commit(b, L, null, TAG.deco)
      return
    }
    case 'yam': {
      if (front) {
        for (let i = 0; i < 9; i++) p(12 + i, 24 + i, '#b8343f')
        for (let y = 32; y <= 37; y++) for (let x = 20; x <= 25; x++) p(x, y, y === 32 ? '#7e2436' : y === 34 || y === 36 ? '#ffd54f' : x === 25 ? '#b8343f' : '#e8514a')
        for (const x of [21, 24]) p(x, 38, '#ffd54f')
      } else {
        for (let i = 0; i < 9; i++) p(19 - i, 24 + i, '#b8343f')
        for (let y = 32; y <= 37; y++) for (let x = 6; x <= 11; x++) p(x, y, y === 32 ? '#7e2436' : y === 34 || y === 36 ? '#ffd54f' : '#e8514a')
      }
      commit(b, L, '#7e2436', TAG.deco)
      return
    }
    default:
      drawBodyAccNew(b, key, view, dy)
  }
}

/** Hand-held items drawn near the viewer-right hand (x≈23, y≈33). */
function drawHandItem(b: Buf, key: string | null, view: DollView, hx: number, hy: number, stage: 'behind' | 'over', mirror = false) {
  if (!key) return
  const L = new Layer()
  const p = (x: number, y: number, c: string) => L.put(mirror ? IW - 1 - (hx + x) : hx + x, hy + y, c)
  switch (key) {
    case 'umbrella': {
      if (stage !== 'over') return
      // furled Bo Sang paper parasol held like a cane
      const P1 = ['.w.', '.p.', '.p.', 'pPp', 'pPp', 'pPq', 'pPq', 'yyy', 'pPq', 'pPq', 'pPq', '.q.', '.h.', '.h.', '.h.', '.h.', 'hh.']
      P1.forEach((row, j) => {
        for (let i = 0; i < 3; i++) {
          const ch = row[i]
          if (ch === '.') continue
          p(2 + i, j - 16, ch === 'w' ? '#fff3a6' : ch === 'p' ? '#ff9fc0' : ch === 'P' ? '#ffd6e0' : ch === 'q' ? '#e8709e' : ch === 'y' ? '#ffd54f' : '#9a6a45')
        }
      })
      commit(b, L, '#a8436e', TAG.deco)
      return
    }
    case 'lotusbud': {
      if (stage !== 'over') return
      const Bd = ['.p.', 'pPp', 'pPp', 'ppp', '.g.', '.g.', '.g.']
      Bd.forEach((row, j) => { for (let i = 0; i < 3; i++) { const ch = row[i]; if (ch !== '.') p(i - 1, j - 6, ch === 'p' ? '#e8709e' : ch === 'P' ? '#ffc4d8' : '#43905a') } })
      commit(b, L, '#8e3a5e', TAG.deco)
      return
    }
    case 'chayen': {
      if (stage !== 'over') return
      const C = ['..s..', '..s..', '.www.', 'wwwww', 'ooooo', 'OoooO', 'oOOoo', '.ooo.', '.bbb.']
      C.forEach((row, j) => { for (let i = 0; i < 5; i++) { const ch = row[i]; if (ch !== '.') p(i - 1, j - 7, ch === 's' ? '#e8514a' : ch === 'w' ? '#fff3e6' : ch === 'o' ? '#f58f35' : ch === 'O' ? '#ffbb66' : '#6e4a35') } })
      commit(b, L, '#8a4a2a', TAG.deco)
      return
    }
    default:
      if (stage === 'over') drawHandItemNew(b, key, hx, hy, mirror)
  }
  void view
}

// ---------------------------------------------------------------------------
// Lifestyle pack: work sets, costumes, snacks, gadgets and back items.

/** Layer from a row map with a direct palette; `mirror` flips it horizontally in place. */
function mapLayer(rows: string[], ox: number, oy: number, pal: Record<string, string>, mirror = false, L = new Layer()): Layer {
  const w = Math.max(...rows.map((s) => s.length))
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '.' || ch === ' ') continue
      const c = pal[ch]
      if (c) L.put(mirror ? ox + w - 1 - i : ox + i, oy + j, c)
    }
  })
  return L
}

/** A left-side map plus its mirror image on the right half of the frame. */
function pairLayer(rows: string[], ox: number, oy: number, pal: Record<string, string>, L = new Layer()): Layer {
  const w = Math.max(...rows.map((s) => s.length))
  mapLayer(rows, ox, oy, pal, false, L)
  mapLayer(rows, IW - ox - w, oy, pal, true, L)
  return L
}

/** Commit only onto empty pixels, i.e. behind everything already painted. */
function commitBehind(b: Buf, L: Layer, line: string | null, tag = TAG.deco) {
  const F = new Layer()
  for (const [i, c] of L.m) if (b.c[i] === null) F.m.set(i, c)
  commit(b, F, line, tag)
}

// ---- head -----------------------------------------------------------------

function helmetLayer(dy: number, main: string, stripe: string, rim: string, view: DollView): Layer {
  const m = mat(main)
  const L = new Layer()
  const W = [5, 7, 9, 10, 11, 11, 12, 12, 12, 12]
  for (let y = 1; y <= 10; y++) {
    const w = W[y - 1]
    for (let x = 16 - w; x <= 15 + w; x++) {
      let c = x >= 13 + w ? m.s : m.b
      if (y <= 5 && x >= 16 - w + 1 && x <= 16 - w + 3 && y >= 3) c = m.l
      if (x === 15 || x === 16) c = x === 16 ? mix(stripe, INK, 0.2) : stripe
      if (y === 10) c = m.s
      L.put(x, y + dy, c)
    }
  }
  for (let x = 4; x <= 27; x++) L.put(x, 11 + dy, x >= 24 ? mix(rim, INK, 0.3) : rim)
  for (let x = 5; x <= 26; x++) L.put(x, 12 + dy, mix(rim, INK, 0.4))
  if (view === 'front') {
    const strap = mix(rim, '#ffffff', 0.15)
    for (const [x, y] of [[5, 13], [5, 14], [5, 15], [5, 16], [5, 17], [6, 18], [6, 19], [7, 20], [8, 21], [9, 22], [10, 23]] as Pt[]) {
      L.put(x, y + dy, strap)
      L.put(31 - x, y + dy, strap)
    }
  }
  return L
}

function drawHeadAccNew(b: Buf, r: Res, key: string, view: DollView, dy: number, stage: 'under' | 'over'): boolean {
  const L = new Layer()
  const p = (x: number, y: number, c: string) => L.put(x, y + dy, c)
  const front = view === 'front'
  const done = (line: string | null) => commit(b, L, line, TAG.deco)
  switch (key) {
    case 'helmet':
    case 'helmetcute': {
      if (stage !== 'over') return true
      const cute = key === 'helmetcute'
      const H = helmetLayer(dy, cute ? '#ffb3cf' : '#f4f5fa', cute ? '#fffaf0' : '#e8514a', cute ? '#b9657f' : '#3a3547', view)
      if (cute) {
        const ear = ['.p...', '.pp..', 'pPpp.', 'pPPpp']
        pairLayer(ear, 7, -1 + dy, { p: '#ff9fc0', P: '#ffe0ea' }, H)
        if (front) {
          // cute face sticker
          for (const [x, y, c] of [[19, 5, '#fffaf0'], [20, 5, '#fffaf0'], [19, 6, '#fffaf0'], [20, 6, '#fffaf0'], [21, 6, '#fffaf0'], [20, 7, '#fffaf0']] as [number, number, string][]) H.put(x, y + dy, c)
        }
      }
      commit(b, H, cute ? '#8e3a5e' : '#8a8496', TAG.deco)
      return true
    }
    case 'sunhat': {
      if (stage !== 'over') return true
      const lt = '#f5d796'
      const md = '#e0b86a'
      const dk = '#b88a44'
      for (let y = 0; y <= 6; y++) {
        const w = [4, 6, 7, 8, 8, 8, 8][y]
        for (let x = 16 - w; x <= 15 + w; x++) p(x, y + 1, (x + y) % 3 === 0 ? md : x >= 13 + w ? md : lt)
      }
      for (let x = 8; x <= 23; x++) {
        p(x, 6, x % 4 === 0 ? '#ffd6e0' : '#ff7eaa')
        p(x, 7, '#e8709e')
      }
      if (front) {
        p(10, 5, '#fffaf0'); p(11, 5, '#ffe45e'); p(12, 5, '#fffaf0'); p(11, 4, '#fffaf0'); p(11, 6, '#fffaf0')
      } else {
        for (const [x, y] of [[20, 8], [21, 9], [21, 10], [22, 11], [19, 8], [18, 9], [18, 10]] as Pt[]) p(x, y, '#ff7eaa')
      }
      for (let x = 1; x <= 30; x++) p(x, 8, (x + 1) % 3 === 0 ? md : lt)
      for (let x = 0; x <= 31; x++) p(x, 9, x % 3 === 0 ? md : x >= 26 ? md : lt)
      for (let x = 1; x <= 30; x++) p(x, 10, dk)
      done(mix(dk, INK, 0.3))
      return true
    }
    case 'beachstraw': {
      // Beach souvenir: woven straw hat, sky-blue ribbon, shades strapped on the crown, a hibiscus.
      if (stage !== 'over') return true
      const lt = '#f7df9e'
      const md = '#e4bf70'
      const dk = '#b98c45'
      for (let y = 0; y <= 6; y++) {
        const w = [4, 6, 7, 8, 8, 8, 8][y]
        for (let x = 16 - w; x <= 15 + w; x++) p(x, y + 1, (x + y * 2) % 4 === 0 || (x - y) % 5 === 0 ? md : x >= 13 + w ? md : lt)
      }
      for (let x = 8; x <= 23; x++) {
        p(x, 6, x % 5 === 0 ? '#9fdcff' : '#5ab4e8')
        p(x, 7, '#3a8cc8')
      }
      if (front) {
        for (const x0 of [10, 17]) {
          for (let x = x0; x < x0 + 5; x++) {
            p(x, 3, '#2e2840')
            p(x, 4, x === x0 + 1 ? '#9fd0ff' : '#4d4466')
            p(x, 5, '#2e2840')
          }
        }
        p(15, 4, '#2e2840')
        p(16, 4, '#2e2840')
        const HB = ['.pp.', 'pPyp', 'pPPp', '.pp.']
        HB.forEach((row, j) => {
          for (let i = 0; i < 4; i++) if (row[i] !== '.') p(22 + i, 4 + j, row[i] === 'p' ? '#ff4f7b' : row[i] === 'P' ? '#ff9fc0' : '#ffe45e')
        })
        p(21, 7, '#43905a')
      } else {
        // Ribbon tails fluttering at the back.
        for (const [x, y] of [[19, 8], [20, 9], [20, 10], [21, 11], [18, 8], [17, 9], [17, 10]] as Pt[]) p(x, y, '#3a8cc8')
      }
      for (let x = 1; x <= 30; x++) p(x, 8, (x + 1) % 3 === 0 ? md : lt)
      for (let x = 0; x <= 31; x++) p(x, 9, x % 3 === 0 ? md : x >= 26 ? md : lt)
      for (let x = 1; x <= 30; x++) p(x, 10, x % 4 === 1 ? mix(dk, INK, 0.15) : dk)
      done(mix(dk, INK, 0.3))
      return true
    }
    case 'vendorband': {
      if (stage !== 'over') return true
      const c1 = '#ff7eaa'
      const c2 = '#fffaf0'
      for (let x = 5; x <= 26; x++) for (let y = 9; y <= 11; y++) p(x, y, (x * 2 + y) % 5 === 0 ? c2 : (x + y) % 5 === 2 ? '#ffe45e' : y === 11 ? '#e8709e' : c1)
      if (front) {
        const K = ['.kk.', 'kKKk', 'kKKk', '.kk.', '.k.k', 'k..k']
        mapLayer(K, 25, 8 + dy, { k: '#e8709e', K: c1 }, false, L)
      } else {
        const K = ['.kk.kk.', 'kKKkKKk', '.kk.kk.', '..k.k..', '..k..k.', '.k...k.']
        mapLayer(K, 12, 9 + dy, { k: '#e8709e', K: c1 }, false, L)
      }
      done('#b9476e')
      return true
    }
    case 'chefhat': {
      if (stage !== 'over') return true
      const w0 = '#fbfcff'
      const s0 = '#dfe3ee'
      const PUFF = [
        '......wwww....wwww......',
        '....wwwWWwwwwwwWWwww....',
        '..wwwwWWwwwwwwwWwwwwww..',
        '.wwwwWwwwwwwwwwwwwwwwws.',
        'wwwwwwwwwswwwwwwswwwwwss',
        '.wwwwwwwwwwwwwwwwwwwwss.',
        '...wwssssssssssssssss...',
      ]
      mapLayer(PUFF, 4, dy, { w: w0, W: '#ffffff', s: s0 }, false, L)
      for (let y = 7; y <= 10; y++) for (let x = 8; x <= 23; x++) p(x, y, y === 10 ? s0 : x >= 22 ? s0 : x % 3 === 0 ? '#eef1f8' : w0)
      done('#aab3cc')
      return true
    }
    case 'catears': {
      if (stage !== 'over') return true
      const E = ['.o....', '.oo...', '.oPo..', 'oPPoo.', 'oPPPoo', 'oooood']
      pairLayer(E, 5, dy, { o: '#f58f35', P: '#ffc4d8', d: '#d0661f' }, L)
      done('#a8531f')
      return true
    }
    case 'bunnyears': {
      if (stage !== 'over') return true
      const pal = { w: '#fbfcff', P: '#ffb3cf', s: '#e6e9f2' }
      mapLayer(['.ww.', 'wPPw', 'wPPw', 'wPPw', 'wPPs', 'wPPs', '.ws.'], front ? 8 : 20, dy, pal, false, L)
      mapLayer(['.....wwww.', '...wwPPPPw', '..wPPwwws.', '.wPPw.....', '.wPs......', '..s.......'], front ? 18 : 4, dy + 1, pal, !front, L)
      done('#b9a3b8')
      return true
    }
    case 'flowercrown': {
      if (stage !== 'over') return true
      const spots: [number, number, number][] = [
        [6, 9, 0], [9, 6, 1], [13, 4, 2], [17, 4, 0], [21, 5, 1], [24, 8, 2],
      ]
      const kinds = [
        { a: '#f58f35', c: '#ffd23f' },
        { a: '#fffaf0', c: '#ffe45e' },
        { a: '#ff7eaa', c: '#ffd6e0' },
      ]
      // leafy vine along the crown
      const vine: Pt[] = [[5, 10], [6, 9], [7, 8], [8, 7], [9, 6], [10, 5], [11, 5], [12, 4], [13, 4], [14, 3], [15, 3], [16, 3], [17, 3], [18, 4], [19, 4], [20, 5], [21, 5], [22, 6], [23, 7], [24, 8], [25, 9], [26, 10]]
      vine.forEach(([x, y], i) => p(x, y + 1, i % 3 === 0 ? '#86c95f' : '#5ea653'))
      for (const [cx, cy, k] of spots) {
        const f = kinds[(k + (front ? 0 : 1)) % 3]
        const FL = ['.aa.', 'aCca', 'acca', '.aa.']
        FL.forEach((row, j) => { for (let i = 0; i < 4; i++) { const ch = row[i]; if (ch !== '.') p(cx - 1 + i, cy - 1 + j, ch === 'a' ? f.a : ch === 'C' ? '#ffffff' : f.c) } })
      }
      done(null)
      for (const [cx, cy] of spots) b.put(cx - 1, cy + 2 + dy, '#8e5a3a', TAG.deco)
      return true
    }
    case 'turban': {
      if (stage !== 'over') return true
      const cols = ['#e8514a', '#3d63b5', '#ffd54f']
      for (let y = 1; y <= 10; y++) {
        const w = [6, 8, 10, 11, 12, 12, 12, 12, 12, 12][y - 1]
        for (let x = 16 - w; x <= 15 + w; x++) {
          const a = x % 4 === 1
          const bb = (y + 1) % 4 === 1
          let c = a && bb ? '#fffaf0' : a || bb ? cols[1] : (x + y) % 8 === 0 ? cols[2] : cols[0]
          if (y === 10 || x >= 14 + w) c = mix(c, INK, 0.25)
          p(x, y, c)
        }
      }
      if (front) mapLayer(['.rr.', 'rbbr', 'rbrr', '.rr.'], 14, dy - 1, { r: '#e8514a', b: '#3d63b5' }, false, L)
      else mapLayer(['..rr..', '.rbbr.', '..rr..', '.r..r.', '.r...r'], 13, 9 + dy, { r: '#e8514a', b: '#3d63b5' }, false, L)
      done('#7e2436')
      return true
    }
    case 'heartshades': {
      if (!front || stage !== 'over') return true
      const HRT = ['.hh.hh.', 'hHhhhhh', 'hHhhhhh', '.hhhhh.', '..hhh..', '...h...']
      pairLayer(HRT, 8, 14 + dy, { h: '#ff5e8a', H: '#ffd6e0' }, L)
      done('#b8343f')
      for (const [x, y] of [[15, 15], [16, 15], [6, 16], [7, 15], [5, 16], [24, 15], [25, 16], [26, 16]] as Pt[]) b.put(x, y + dy, '#b8343f', TAG.deco)
      return true
    }
    case 'nerdglasses': {
      if (!front || stage !== 'over') return true
      const k = '#2e2840'
      for (const x0 of [8, 18]) {
        for (let x = x0; x <= x0 + 5; x++) {
          b.put(x, 14 + dy, k, TAG.deco)
          b.put(x, 15 + dy, k, TAG.deco)
          b.put(x, 21 + dy, k, TAG.deco)
        }
        for (let y = 14; y <= 21; y++) {
          b.put(x0, y + dy, k, TAG.deco)
          b.put(x0 + 5, y + dy, k, TAG.deco)
        }
        b.put(x0 + 1, 16 + dy, '#e6f6ff', TAG.deco)
      }
      for (const x of [14, 15, 16, 17]) {
        b.put(x, 16 + dy, x === 15 || x === 16 ? '#fbfcff' : '#e6e9f2', TAG.deco)
        b.put(x, 17 + dy, x === 15 || x === 16 ? '#dfe3ee' : '#fbfcff', TAG.deco)
      }
      b.put(6, 16 + dy, k, TAG.deco)
      b.put(7, 16 + dy, k, TAG.deco)
      b.put(24, 16 + dy, k, TAG.deco)
      b.put(25, 16 + dy, k, TAG.deco)
      return true
    }
    case 'dinsor': {
      if (!front || stage !== 'under') return true
      // finger-swiped powder streaks on both cheeks, a dab on the nose and chin
      const w = '#ffffff'
      const w2 = '#dfe5ef'
      const streak: Pt[] = [[6, 19], [7, 20], [8, 21], [9, 22], [7, 18], [8, 19], [9, 20], [10, 21], [9, 18], [10, 19], [11, 20]]
      for (const [x, y] of streak) {
        b.put(x, y + dy, w, TAG.face)
        b.put(31 - x, y + dy, w, TAG.face)
        b.put(x + 1, y + 1 + dy, w2, TAG.face)
        b.put(30 - x, y + 1 + dy, w2, TAG.face)
      }
      for (const [x, y] of [[15, 19], [16, 19], [15, 20], [14, 23], [15, 23], [16, 23], [17, 23]] as Pt[]) b.put(x, y + dy, (x + y) % 2 ? w : w2, TAG.face)
      return true
    }
    case 'mongkol': {
      if (stage !== 'over') return true
      const w = '#fbfcff'
      const rr = '#e8514a'
      const arc = front ? [4, 4, 5, 5, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 5, 5, 4, 4] : [5, 6, 6, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 6, 6, 5]
      arc.forEach((yy, i) => {
        const x = 5 + i
        p(x, yy + 2, (x >> 1) % 2 ? w : '#ff8a7a')
        p(x, yy + 3, (x >> 1) % 2 ? rr : w)
        p(x, yy + 4, (x >> 1) % 2 ? '#b8343f' : '#d6dcec')
      })
      if (front) {
        for (const [x, y] of [[15, 7], [16, 7], [15, 6], [16, 6], [16, 5], [15, 4], [16, 3]] as Pt[]) p(x, y, (y % 2) ? w : rr)
      } else {
        for (let y = 12; y <= 24; y++) {
          p(15, y, y % 2 ? w : rr)
          p(16, y, y % 2 ? rr : w)
        }
        p(15, 25, rr); p(16, 25, rr); p(14, 26, rr); p(17, 26, rr)
      }
      done(null)
      return true
    }
    case 'chada': {
      if (stage !== 'over') return true
      const g = mat('#ffd54f', '#e9a53a')
      const CH = [
        '.......gg.......',
        '......gGgg......',
        '......gggs......',
        '.....gGrggs.....',
        '.....gggggs.....',
        '....gGgggggs....',
        '...ggGggeggss...',
        '..gggggggggggs..',
        '.gGrgggegggrggs.',
        'ssssssssssssssss',
      ]
      mapLayer(CH, 8, dy - 1, { g: g.b, G: g.l, s: g.s, r: '#e8514a', e: '#5ee0a0' }, false, L)
      for (let x = 7; x <= 24; x++) p(x, 9, x % 3 === 0 ? '#e8514a' : g.s)
      const EAR = ['..g.', '.gG.', 'gGg.', 'gGg.', '.gg.', '..g.', '..r.']
      pairLayer(EAR, 1, 12 + dy, { g: g.b, G: g.l, r: '#e8514a' }, L)
      done(g.d)
      return true
    }
    case 'likay': {
      if (stage !== 'over') return true
      const g = mat('#ffd54f', '#e9a53a')
      for (let x = 6; x <= 25; x++) for (let y = 6; y <= 8; y++) p(x, y, y === 8 ? g.s : (x + y) % 4 === 0 ? '#fff3a6' : g.b)
      for (const x of [8, 12, 19, 23]) p(x, 7, x % 2 ? '#5ee0a0' : '#e8514a')
      // big diamond at the front
      mapLayer(['..c..', '.cWc.', 'cWccc', '.ccc.', '..c..'], 13, 3 + dy, { c: '#7fe0ff', W: '#ffffff' }, false, L)
      const PL = [
        '........ffff..',
        '......ffFFFFf.',
        '.....fFFFFFFFf',
        '....fFFFffFFFf',
        '...fFFFf..fFFf',
        '..fFFFf....ff.',
        '.fFFFf........',
        '.fFFf.........',
        '..ff..........',
      ]
      mapLayer(PL, front ? 16 : 2, dy - 1, { f: '#ff7eaa', F: '#fffaf0' }, !front, L)
      const DROP = ['w', 'p', 'w', 'p', 'W']
      mapLayer(DROP, 5, 9 + dy, { w: '#fffaf0', p: '#ffd6e0', W: '#ffd54f' }, false, L)
      mapLayer(DROP, 26, 9 + dy, { w: '#fffaf0', p: '#ffd6e0', W: '#ffd54f' }, false, L)
      done('#a8436e')
      return true
    }
    case 'spacehelmet': {
      if (stage !== 'over') return true
      const cx = 15.5
      const cy = 14
      const ring = new Layer()
      const glass = new Layer()
      for (let y = -1; y <= 29; y++) {
        for (let x = 0; x < IW; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
          if (d > 14.8) continue
          const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx)
          if (d > 13.6) ring.put(x, y + dy, ang > -0.6 && ang < 2.2 ? '#a9b8d0' : '#d6e0f0')
          else if (d > 11.2 && d < 12.4 && ang < -1.9 && ang > -2.9) ring.put(x, y + dy, '#ffffff')
          else glass.put(x, y + dy, d > 12.5 ? '#cfe1f6' : '#dcebfa')
        }
      }
      // collar ring
      for (let y = 24; y <= 26; y++) for (let x = 9; x <= 22; x++) ring.put(x, y + dy, y === 26 ? '#6c6678' : y === 24 ? '#c9ccda' : '#aeb4c8')
      commitBehind(b, glass, null, TAG.deco)
      commit(b, ring, '#6c7a96', TAG.deco)
      return true
    }
    case 'sleepcap': {
      if (stage !== 'over') return true
      const s = '#7fb0de'
      const S = '#fffaf0'
      const CAP = [
        '..........ss..........',
        '........ssSSss........',
        '......sSSssSSsss......',
        '....ssSSssSSssSSss....',
        '...sSSssSSssSSssSSsss.',
        '..sSSssSSssSSssSSssSss',
        '..........s......sSSsS',
        '...................sss',
      ]
      mapLayer(CAP, front ? 4 : 6, dy, { s, S }, !front, L)
      for (let x = 5; x <= 26; x++) {
        p(x, 7, (x + 1) % 3 === 0 ? '#e6e9f2' : S)
        p(x, 8, x % 3 === 0 ? '#e6e9f2' : S)
      }
      const px = front ? 26 : 1
      mapLayer(['.yy.', 'yYyy', 'yyyy', '.yy.'], px, 8 + dy, { y: '#ffe45e', Y: '#fff3a6' }, false, L)
      done('#4f73b4')
      return true
    }
  }
  void r
  return drawSouvenirHead(b, key, view, dy, stage) || drawV4Head(b, r, key, view, dy, stage) || drawExtraHead(b, key, view, dy, stage)
}

/** Head accessories drawn from pixel rows by other modules (e.g. Bot Noi's antenna headband, art/botnoi.ts). */
export interface DollHeadRows {
  front: { x: number; y: number; rows: string[] }
  back?: { x: number; y: number; rows: string[] }
  pal: Record<string, string>
  /** Edge line colour where it overlaps the hair. */
  line?: string
}
const EXTRA_HEAD: Record<string, DollHeadRows> = {}

export function registerDollHeadAcc(key: string, art: DollHeadRows) {
  EXTRA_HEAD[key] = art
}

function drawExtraHead(b: Buf, key: string, view: DollView, dy: number, stage: 'under' | 'over'): boolean {
  const a = EXTRA_HEAD[key]
  if (!a) return false
  if (stage !== 'over') return true
  const part = view === 'back' ? (a.back ?? a.front) : a.front
  commit(b, mapLayer(part.rows, part.x, part.y + dy, a.pal), a.line ?? null, TAG.deco)
  return true
}

/** Surgical mask – drawn after the face, before the front hair. */
function drawMask(b: Buf, dy: number) {
  const L = new Layer()
  const c = '#cfe6f7'
  const d = '#a9cbe6'
  for (let y = 20; y <= 24; y++) {
    const [x0, x1] = y === 24 ? [11, 20] : y === 20 ? [10, 21] : [9, 22]
    for (let x = x0; x <= x1; x++) L.put(x, y + dy, y === 21 || y === 23 ? (x % 3 === 0 ? c : d) : x >= x1 - 1 ? d : c)
  }
  for (const [x, y] of [[5, 17], [6, 18], [7, 19], [8, 20], [26, 17], [25, 18], [24, 19], [23, 20]] as Pt[]) L.put(x, y + dy, '#eef1f8')
  commit(b, L, '#7f96b8', TAG.deco)
}

// ---- body / neck ------------------------------------------------------------

function drawBodyAccNew(b: Buf, key: string, view: DollView, dy: number): boolean {
  const L = new Layer()
  const p = (x: number, y: number, c: string) => L.put(x, y + dy, c)
  const front = view === 'front'
  switch (key) {
    case 'lanyard': {
      const s = '#3d63b5'
      if (!front) {
        for (let x = 13; x <= 18; x++) p(x, 24, s)
        commit(b, L, '#2e3a6b', TAG.deco)
        return true
      }
      for (const [x, y] of [[12, 24], [12, 25], [13, 26], [13, 27], [14, 28], [14, 29], [19, 24], [19, 25], [18, 26], [18, 27], [17, 28], [17, 29]] as Pt[]) p(x, y, s)
      const CARD = ['kkkk', 'bbbb', 'wfww', 'wwww', 'wllw', 'wwww']
      mapLayer(CARD, 14, 29 + dy, { k: '#2e3a6b', b: '#5a8de0', w: '#fbfcff', f: '#e0bb8a', l: '#9fb0cc' }, false, L)
      commit(b, L, '#2e3a6b', TAG.deco)
      return true
    }
    case 'amuletbig': {
      const g = '#ffd23f'
      const G = '#e9a53a'
      if (!front) {
        for (let x = 12; x <= 19; x++) { p(x, 24, x % 2 ? g : G); p(x, 25, x % 2 ? G : g) }
        commit(b, L, '#b8742a', TAG.deco)
        return true
      }
      for (let i = 0; i <= 5; i++) {
        p(11 + i, 24 + i, i % 2 ? g : G); p(12 + i, 24 + i, i % 2 ? G : g)
        p(20 - i, 24 + i, i % 2 ? g : G); p(19 - i, 24 + i, i % 2 ? G : g)
      }
      const AM = ['.ggg.', 'gkkkg', 'gkyKg', 'gkkkg', '.ggg.']
      mapLayer(AM, 13, 30 + dy, { g, k: '#6e4a35', y: '#ffe45e', K: '#9a6a45' }, false, L)
      mapLayer(['.g.', 'gkg', '.g.'], 10, 27 + dy, { g, k: '#6e4a35' }, false, L)
      mapLayer(['.g.', 'gkg', '.g.'], 19, 27 + dy, { g, k: '#6e4a35' }, false, L)
      commit(b, L, null, TAG.deco)
      return true
    }
    case 'prajiad':
      return true
  }
  return drawSouvenirNeck(b, key, view, dy)
}

// ---- hand-held --------------------------------------------------------------

function drawHandItemNew(b: Buf, key: string, hx: number, hy: number, mirror: boolean): boolean {
  const L = new Layer()
  const p = (x: number, y: number, c: string) => L.put(mirror ? IW - 1 - (hx + x) : hx + x, hy + y, c)
  const map = (rows: string[], ox: number, oy: number, pal: Record<string, string>) => {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]
        if (ch !== '.' && pal[ch]) p(ox + i, oy + j, pal[ch])
      }
    })
  }
  let line: string = INK
  switch (key) {
    case 'tote': {
      map(['.h...h.', '.h...h.', 'h.....h'], -1, 0, { h: '#c9a06b' })
      for (let y = 3; y <= 11; y++) for (let x = -2; x <= 5; x++) {
        const e = y >= 5 && y <= 8 && x >= -1 && x <= 4 ? ELEPHANT[y - 5]?.[x + 1] === '#' : false
        p(x, y, e ? '#e8514a' : y === 11 ? '#dccba6' : x === 5 ? '#e6d6b3' : '#f3e6c8')
      }
      p(0, 6, '#fffaf0')
      line = '#8a6a3a'
      break
    }
    case 'bubbletea': {
      map(
        ['...k.', '..k..', '.www.', 'wWwww', 'bbbbb', 'bBbbb', 'bbbbb', 'bkbkb', 'kbkbk', '.kkk.'],
        -1,
        -9,
        { k: '#3a2838', w: '#fff3e6', W: '#ffffff', b: '#c9a07a', B: '#e3c29c' },
      )
      line = '#7a5a3a'
      break
    }
    case 'selfie': {
      for (let i = 0; i <= 17; i++) p(1 + Math.round(i * 0.3), -1 - i, i % 5 === 0 ? '#4a4458' : '#6a6478')
      map(['pppp', 'pbbp', 'pbwp', 'pbbp', 'pbbp', 'pppp'], 5, -25, { p: '#ff9fc0', b: '#9fd0ff', w: '#fbfcff' })
      line = '#5a3d4f'
      break
    }
    case 'minifan': {
      map(['h', 'h', 'h', 'H', 'h', 'h'], 1, -5, { h: '#ff9fc0', H: '#ffd6e0' })
      const cx = 1.5
      const cy = -9.5
      for (let y = -14; y <= -5; y++) for (let x = -3; x <= 6; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        if (d > 4.6) continue
        const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx)
        if (d > 3.7) p(x, y, '#7fd3b5')
        else if (d < 1.1) p(x, y, '#ff9fc0')
        else if (Math.sin(ang * 3) > 0.2) p(x, y, '#fbfcff')
        else p(x, y, '#c8f0e6')
      }
      line = '#3f9f86'
      break
    }
    case 'parasol': {
      for (let y = -27; y <= 0; y++) p(1, y, y === 0 ? '#4a3128' : '#6e4a35')
      p(0, 0, '#4a3128')
      const cx = 1
      for (let y = -33; y <= -24; y++) {
        const k = y + 33
        const w = [2, 5, 8, 10, 11, 12, 12, 13, 13, 13][k]
        for (let x = cx - w; x <= cx + w; x++) {
          const dxr = (x - cx) / (k + 1)
          const rib = Math.abs(dxr * 3 - Math.round(dxr * 3)) < 0.12
          let c = rib ? '#ffd54f' : (x + y) % 5 === 0 ? '#e9a53a' : '#c0392f'
          if (k === 9) c = x % 2 ? '#ffd54f' : '#8e2533'
          if (k === 0) c = '#ffd54f'
          p(x, y, c)
        }
      }
      line = '#7e2436'
      break
    }
    case 'watergun': {
      map(
        ['..ttt....', '.tTwt....', '.ttwt....', 'oooooooon', 'oOoooooon', '.oog.....', '..gg.....', '..gg.....'],
        -2,
        -6,
        { t: '#5ebcff', T: '#bfe6ff', w: '#8fd4ff', o: '#f58f35', O: '#ffbb66', n: '#e8514a', g: '#5ea653' },
      )
      p(8, -5, '#bfe6ff')
      p(9, -6, '#8fd4ff')
      line = '#b8542a'
      break
    }
    case 'grocery': {
      map(
        ['.pp.', 'p..p', '.wwww', 'wcccw', 'wcgcw', 'wcccw', 'wccgw', '.www.'],
        -1,
        0,
        { p: '#ff7eaa', w: '#eef6fb', c: '#f58f35', g: '#6cc36a' },
      )
      map(['.p.', 'www', 'wyw', 'www'], 3, 3, { p: '#ff7eaa', w: '#eef6fb', y: '#fff3a6' })
      line = '#8aa0b8'
      break
    }
    case 'phone': {
      map(['pppp', 'pbbp', 'pwbp', 'pbwp', 'pbbp', 'pppp'], -1, -7, { p: '#ff9fc0', b: '#9fd0ff', w: '#fbfcff' })
      line = '#8e3a5e'
      break
    }
    case 'patongo': {
      map(['y..y.', 'Yy.yY', '.yYy.', 'bbbbbb', 'bBbbbb', 'bbbbbb', 'bbbBbb', 'bbbbbb', 'Bbbbbb'], -2, -4, { y: '#e9a53a', Y: '#ffd98a', b: '#c9a06b', B: '#a8804e' })
      line = '#6e4a35'
      break
    }
    case 'krathong': {
      map(
        ['...f....', '...F....', '...w....', '...w.i..', '.yowoy..', 'oyoyoyo.', 'gGgGgGgG', '.gggggg.'],
        -3,
        -9,
        { f: '#ffbb66', F: '#fff3a6', w: '#fffaf0', i: '#b8742a', y: '#ffd23f', o: '#f58f35', g: '#5ea653', G: '#86c95f' },
      )
      line = '#2f6f4b'
      break
    }
    case 'lookchin': {
      for (let y = -16; y <= 1; y++) p(1, y, '#f0d2a0')
      for (const by of [-16, -12, -8]) map(['.bb.', 'bBsb', 'bbbs', '.bs.'], 0, by, { b: '#a8703f', B: '#d69a5e', s: '#e8514a' })
      p(3, -5, '#e8514a')
      line = '#7a4a2a'
      break
    }
    default:
      return drawSouvenirHand(b, key, hx, hy, mirror)
  }
  commit(b, L, line, TAG.deco)
  return true
}

// ---- tops -------------------------------------------------------------------

/** Mini 3×5 digits on a patch. */
function drawNumber(b: Buf, n: string, cx: number, y: number, col: string) {
  const w = n.length * 4 - 1
  let x = Math.round(cx - w / 2)
  for (const ch of n) {
    const d = DIGITS[ch]
    if (d) d.forEach((row, jj) => { for (let i = 0; i < 3; i++) if (row[i] === '#') put(b, x + i, y + jj, col) })
    x += 4
  }
}

function drawTopLayersFront(b: Buf, r: Res, dy: number) {
  const t = r.top
  const f = r.g === 'f'
  const Y = (y: number) => y + dy
  const hem = hemRow(t)
  const skin = r.sk
  const [tx0, tx1] = [f ? 11 : 10, f ? 20 : 21]
  // tank top: deep scoop + bare shoulders
  if (t.collar === 'tank') {
    const trim = t.collarColor ?? mix(t.main, INK, 0.15)
    for (const [x, y] of [[14, 24], [15, 24], [16, 24], [17, 24], [14, 25], [15, 25], [16, 25], [17, 25], [15, 26], [16, 26]] as Pt[]) b.put(x, Y(y), skin.b, TAG.skin)
    for (const x of [tx0 + 1, tx0 + 2, tx1 - 2, tx1 - 1]) b.put(x, Y(24), skin.b, TAG.skin)
    for (const x of [tx0, tx0 + 1, tx1 - 1, tx1]) b.put(x, Y(25), skin.b, TAG.skin)
    for (const [x, y] of [[13, 24], [13, 25], [14, 26], [15, 27], [16, 27], [17, 26], [18, 25], [18, 24], [tx0 + 2, 25], [tx1 - 2, 25], [tx0, 26], [tx1, 26]] as Pt[]) put(b, x, Y(y), trim)
  }
  // double-breasted chef coat
  if (t.placket === 'double') {
    const btn = t.buttonColor ?? INK
    for (let y = 25; y <= Math.min(hem - 1, 34); y++) put(b, f ? 18 : 19, Y(y), mix(t.shade, INK, 0.1))
    for (const y of [27, 30, 33]) {
      put(b, f ? 13 : 12, Y(y), btn)
      put(b, f ? 17 : 17, Y(y), btn)
    }
    for (let x = 12; x <= 19; x++) put(b, x, Y(25), mix(t.main, t.shade, 0.5))
  }
  // vest
  const v = t.vest
  if (v) {
    const vm = mat(v.main, v.shade)
    const V = new Layer()
    for (let y = 24; y <= hem; y++) {
      const sp = torsoSpan(r, y)
      if (!sp) continue
      const open = y <= 25 ? 2 : y <= 27 ? 1 : y <= 28 ? 0 : -1
      for (let x = sp[0]; x <= sp[1]; x++) {
        if (open >= 0 && x >= 15 - open && x <= 16 + open) continue
        if (y === 24 && (x === sp[0] || x === sp[1])) continue
        let c = x >= sp[1] - 1 ? vm.s : vm.b
        if (v.trim && (y === 31 || y === 32)) c = y === 31 ? v.trim : mix(v.trim, INK, 0.12)
        V.put(x, Y(y), c)
      }
    }
    commit(b, V, vm.d, TAG.cloth)
    const px = f ? 16 : 17
    for (let y = 26; y <= 29; y++) for (let x = px; x <= px + 3; x++) put(b, x, Y(y), v.patchColor ?? '#fffaf0')
    if (v.number) {
      const nc = v.numberColor ?? INK
      put(b, px + 1, Y(27), nc); put(b, px + 2, Y(27), nc); put(b, px + 1, Y(28), nc); put(b, px + 2, Y(28), mix(nc, '#ffffff', 0.5))
    }
    put(b, f ? 12 : 11, Y(33), vm.d)
  }
  // apron
  const ap = t.apron
  if (ap) {
    const am = mat(ap.main, ap.shade)
    const strap = ap.strap ?? am.d
    const A = new Layer()
    for (let y = 27; y <= 42; y++) {
      const [x0, x1] = y < 33 ? [12, 19] : y < 34 ? [11, 20] : y < 40 ? [10, 21] : [9, 22]
      for (let x = x0; x <= x1; x++) {
        const cell = clothCol(am, ap.pattern, ap.patternColor, undefined, x, y, x >= x1 - 1)
        A.put(x, Y(y), y === 42 ? am.s : cell)
      }
    }
    commit(b, A, am.d, TAG.cloth)
    for (const [x, y] of [[12, 26], [13, 25], [13, 24], [19, 26], [18, 25], [18, 24]] as Pt[]) put(b, x, Y(y), strap)
    for (let x = 8; x <= 23; x++) if (x < 11 || x > 20) put(b, x, Y(33), strap)
    put(b, 8, Y(34), strap)
    put(b, 23, Y(34), strap)
    if (ap.pocket) {
      for (let y = 35; y <= 38; y++) for (let x = 12; x <= 19; x++) put(b, x, Y(y), y === 35 ? mix(am.s, INK, 0.3) : x >= 18 ? am.s : mix(am.b, am.s, 0.4))
      put(b, 15, Y(36), '#ffd54f')
      put(b, 16, Y(36), '#e9a53a')
      put(b, 17, Y(37), '#e8514a')
    }
  }
  // costume trims
  const ec = t.extraColor ?? P.gold
  const g = mat(ec)
  if (t.extra === 'likay' || t.extra === 'khon') {
    const SH = t.extra === 'likay' ? ['g.....', 'gg....', '.gg...', '.ggGg.', '..gggg', '...ggs'] : ['.g....', '.gg...', '..gGg.', '..gggs']
    const sy = t.extra === 'likay' ? 19 : 21
    commit(b, pairLayer(SH, 4, Y(sy), { g: g.b, G: '#e8514a', s: g.s }), g.d, TAG.cloth)
    if (t.extra === 'likay') {
      for (let x = 12; x <= 19; x++) put(b, x, Y(24), x % 3 === 0 ? '#e8514a' : x % 3 === 1 ? g.l : g.b)
      for (let i = 0; i < 10; i++) {
        const y = 25 + i
        for (let k = 0; k <= 1; k++) {
          const x = 19 - i + k
          if (x < tx0 || x > tx1) continue
          put(b, x, Y(y), k ? mix(ec, INK, 0.25) : (x + y) % 3 === 0 ? '#fff3a6' : '#ff9fc0')
        }
      }
      for (let x = tx0; x <= tx1; x++) put(b, x, Y(33), (x + 1) % 3 === 0 ? g.l : g.b)
      put(b, 15, Y(33), '#7fe0ff'); put(b, 16, Y(33), '#7fe0ff'); put(b, 15, Y(32), g.l); put(b, 16, Y(34), g.s)
    } else {
      const rows: [number, number, number][] = [[24, tx0, tx1], [25, tx0, tx1], [26, 12, 19], [27, 13, 18], [28, 14, 17]]
      for (const [y, a, z] of rows) for (let x = a; x <= z; x++) put(b, x, Y(y), y === 28 ? g.s : (x + y) % 3 === 0 ? '#e8514a' : (x + y) % 3 === 1 ? g.l : g.b)
      put(b, 15, Y(29), '#e8514a'); put(b, 16, Y(29), '#5ee0a0'); put(b, 15, Y(30), g.s); put(b, 16, Y(30), g.s)
      for (let x = tx0; x <= tx1; x++) put(b, x, Y(33), x % 2 ? g.b : g.s)
      put(b, 15, Y(33), '#e8514a'); put(b, 16, Y(33), '#e8514a')
    }
  } else if (t.extra === 'astro') {
    const cc = t.collarColor ?? '#aeb4c8'
    for (let x = tx0 - 1; x <= tx1 + 1; x++) put(b, x, Y(24), x >= tx1 ? mix(cc, INK, 0.3) : cc)
    for (let y = 27; y <= 31; y++) for (let x = 12; x <= 19; x++) put(b, x, Y(y), y === 27 || y === 31 || x === 12 || x === 19 ? '#6c6678' : '#8a8496')
    put(b, 13, Y(29), '#e8514a'); put(b, 14, Y(29), '#ffe45e'); put(b, 15, Y(29), '#5ee0a0')
    put(b, 17, Y(28), '#9fd0ff'); put(b, 18, Y(28), '#9fd0ff'); put(b, 17, Y(30), '#fbfcff'); put(b, 18, Y(30), '#fbfcff')
    for (let y = 32; y <= hem; y++) put(b, 16, Y(y), '#aeb4c8')
    // flag patch
    const fx = f ? 18 : 19
    put(b, fx, Y(25), '#e8514a'); put(b, fx + 1, Y(25), '#e8514a'); put(b, fx, Y(26), '#fbfcff'); put(b, fx + 1, Y(26), '#3d63b5')
  }
  drawV4TopExtra(b, r, dy, 'front')
}

function drawTopLayersBack(b: Buf, r: Res, dy: number) {
  const t = r.top
  const f = r.g === 'f'
  const Y = (y: number) => y + dy
  const hem = hemRow(t)
  const [tx0, tx1] = [f ? 11 : 10, f ? 20 : 21]
  if (t.collar === 'tank') {
    for (const x of [14, 15, 16, 17]) b.put(x, Y(24), r.sk.s, TAG.skin)
    for (const x of [tx0 + 1, tx0 + 2, tx1 - 2, tx1 - 1]) b.put(x, Y(24), r.sk.b, TAG.skin)
    for (const x of [tx0, tx1]) b.put(x, Y(25), r.sk.b, TAG.skin)
    for (const x of [13, 18]) put(b, x, Y(24), t.collarColor ?? mix(t.main, INK, 0.15))
    for (const x of [14, 15, 16, 17]) put(b, x, Y(25), t.collarColor ?? mix(t.main, INK, 0.15))
  }
  const v = t.vest
  if (v) {
    const vm = mat(v.main, v.shade)
    const V = new Layer()
    for (let y = 25; y <= hem; y++) {
      const sp = torsoSpan(r, y)
      if (!sp) continue
      for (let x = sp[0]; x <= sp[1]; x++) V.put(x, Y(y), v.trim && (y === 33 || y === 34) ? (y === 33 ? v.trim : mix(v.trim, INK, 0.12)) : x >= sp[1] - 1 ? vm.s : vm.b)
    }
    commit(b, V, vm.d, TAG.cloth)
    for (let y = 26; y <= 32; y++) for (let x = 11; x <= 20; x++) put(b, x, Y(y), y === 32 || x === 20 ? mix(v.patchColor ?? '#fffaf0', INK, 0.12) : v.patchColor ?? '#fffaf0')
    if (v.number) drawNumber(b, v.number, 16, Y(27), v.numberColor ?? INK)
  }
  const ap = t.apron
  if (ap) {
    const strap = ap.strap ?? mix(ap.shade, INK, 0.3)
    for (let x = 13; x <= 18; x++) put(b, x, Y(24), strap)
    for (let x = tx0; x <= tx1; x++) put(b, x, Y(33), strap)
    for (const [x, y] of [[13, 32], [14, 32], [13, 34], [14, 34], [17, 32], [18, 32], [17, 34], [18, 34], [15, 33], [16, 33], [14, 35], [14, 36], [17, 35], [17, 36], [13, 37], [18, 37]] as Pt[]) put(b, x, Y(y), strap)
    for (const x of [9, 22]) for (let y = 34; y <= 40; y++) put(b, x, Y(y), mix(ap.main, INK, x === 22 ? 0.2 : 0))
  }
  const ec = t.extraColor ?? P.gold
  const g = mat(ec)
  if (t.extra === 'likay' || t.extra === 'khon') {
    const SH = t.extra === 'likay' ? ['g.....', 'gg....', '.gg...', '.gggg.', '..gggg', '...ggs'] : ['.g....', '.gg...', '..ggg.', '..gggs']
    commit(b, pairLayer(SH, 4, Y(t.extra === 'likay' ? 19 : 21), { g: g.b, s: g.s }), g.d, TAG.cloth)
    for (let x = tx0; x <= tx1; x++) {
      put(b, x, Y(24), (x + 1) % 3 === 0 ? '#e8514a' : g.b)
      if (t.extra === 'khon') put(b, x, Y(25), x % 2 ? g.l : g.b)
      put(b, x, Y(33), (x + 1) % 3 === 0 ? g.l : g.b)
    }
  } else if (t.extra === 'astro') {
    for (let x = tx0 - 1; x <= tx1 + 1; x++) put(b, x, Y(24), t.collarColor ?? '#aeb4c8')
  }
  drawV4TopExtra(b, r, dy, 'back')
}

// ---- back slot ----------------------------------------------------------------

const ANGEL_WING = [
  '.......wwww.',
  '.....wwWWWww',
  '...wwWWwwwww',
  '..wWWwwwwwww',
  '.wWwwwwwwwww',
  '.wWwwwwwwwww',
  'wWwwwwwwwwww',
  'wwwwwwwwwwww',
  'wwwwswwwwwww',
  'wswwwswwwwww',
  '.wwswwwswwww',
  '.wwwwswwwsww',
  '..swwwwswwww',
  '..wwswwwwsww',
  '...wwwswwww.',
  '....wswwwsw.',
  '.....wwswww.',
  '......wwww..',
  '.......ww...',
]
const BUTTERFLY_WING = [
  '..pppp......',
  '.pPPPPpp....',
  'pPyyPPPPpp..',
  'pPyyPPPPPPp.',
  'pPPPPPPcPPPp',
  '.pPPPPPPPPPp',
  '..ppPPPPPPpp',
  '....pppppPp.',
  '....cCCCcp..',
  '...cCyyCCc..',
  '...cCyyCCc..',
  '....cCCCc...',
  '.....ccc....',
]
const WING_PAL = { w: '#fbfcff', W: '#ffffff', s: '#d6dcec' }
const BF_PAL = { p: '#e8709e', P: '#ff9fc0', y: '#ffe45e', c: '#8a64d6', C: '#b98ae6' }
const BAG_MAP = [
  '....kkkk....',
  '...k....k...',
  '.ssssssssss.',
  'smmmmmmmmmms',
  'smpmmpmmpmms',
  'smmmmggmmmms',
  'ssssssggssss',
  'smmmmmmmmmms',
  'smpmmpmmpmms',
  'smmmmmmmmmms',
  'smmmmmmmmmms',
  '.ssssssssss.',
]
const SCHOOLBAG_MAP = [
  '....kkkk....',
  '...k....k...',
  '.ssssssssss.',
  'smmmmmmmmmms',
  'smmmmggmmmms',
  'smmmmggmmmms',
  'ssssssssssss',
  'smmmmmmmmmms',
  'smmppppppmms',
  'smmmmmmmmmms',
  'smmmmmmmmmms',
  '.ssssssssss.',
]

function backKey(r: Res): string | null {
  return r.back
}

function drawAura(b: Buf, cx: number, cy: number, rad: number) {
  const L = new Layer()
  for (let y = 0; y < IH; y++) {
    for (let x = 0; x < IW; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (d > rad) continue
      const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx)
      const ray = Math.cos(ang * 12) > 0.7
      let c = '#fff6c4'
      if (d > rad - 1.2) c = '#e9a53a'
      else if (d > rad - 2.4) c = ray ? '#fff3a6' : '#ffd54f'
      else if (ray && d > rad * 0.45) c = '#fffbe3'
      L.put(x, y, c)
    }
  }
  commitBehind(b, L, null, TAG.deco)
  // sparkles
  for (const [sx, sy] of [[3, cy - rad * 0.5], [28, cy - rad * 0.2], [5, cy + rad * 0.55]] as Pt[]) {
    const x = Math.round(sx)
    const y = Math.round(sy)
    if (b.get(x, y) === '#fff6c4' || b.get(x, y) === '#fffbe3') b.put(x, y, '#ffffff', TAG.deco)
  }
}

/**
 * Back items. `stage`: 'behind' (fills empty pixels behind the doll),
 * 'body' (over the torso, under the hair – back view) and 'top' (last).
 */
function drawBackItem(b: Buf, r: Res, view: DollView, dy: number, stage: 'behind' | 'body' | 'top') {
  const key = backKey(r)
  if (!key) return
  const front = view === 'front'
  switch (key) {
    case 'aura':
      if (stage === 'behind') drawAura(b, 15.5, 16 + dy, 15.5)
      return
    case 'angel':
    case 'butterfly': {
      const rows = key === 'angel' ? ANGEL_WING : BUTTERFLY_WING
      const pal = key === 'angel' ? WING_PAL : BF_PAL
      const line = key === 'angel' ? '#aab3cc' : '#a8436e'
      if (front && stage === 'behind') commitBehind(b, pairLayer(rows, 0, (key === 'angel' ? 15 : 17) + dy, pal), line)
      if (!front && stage === 'body') commit(b, pairLayer(rows, 3, (key === 'angel' ? 17 : 19) + dy, pal), line, TAG.deco)
      return
    }
    case 'thaibag':
    case 'schoolbag': {
      const thai = key === 'thaibag'
      const pal = thai ? { k: '#7e2436', m: '#c0392f', s: '#8e2533', p: '#ffd54f', g: '#ffd54f' } : { k: '#212a52', m: '#2e3a6b', s: '#212a52', p: '#fbfcff', g: '#e9b949' }
      if (front && stage === 'body') {
        const f = r.g === 'f'
        for (const x of f ? [12, 19] : [11, 20]) for (let y = 24; y <= 31; y++) put(b, x, y + dy, y === 29 ? '#d8d4e6' : pal.k)
        for (const x of f ? [13, 18] : [12, 19]) put(b, x, 24 + dy, pal.k)
      }
      if (!front && stage === 'body') {
        const L = mapLayer(thai ? BAG_MAP : SCHOOLBAG_MAP, 10, 25 + dy, pal)
        if (thai) for (let y = 29; y <= 35; y++) for (let x = 11; x <= 20; x++) if ((x + y) % 4 === 0 && L.has(x, y + dy) && y !== 31) L.put(x, y + dy, (x + y) % 8 === 0 ? '#ffd54f' : '#e9a53a')
        commit(b, L, mix(pal.s, INK, 0.4), TAG.deco)
      }
      if (front && stage === 'behind') {
        // bag peeks out at the sides
        const L = new Layer()
        for (let y = 26; y <= 36; y++) { L.put(9, y + dy, pal.s); L.put(22, y + dy, pal.s) }
        commitBehind(b, L, mix(pal.s, INK, 0.4))
      }
      return
    }
    case 'flag': {
      const L = new Layer()
      const px = front ? 25 : 6
      const dir = front ? 1 : -1
      if ((front && stage === 'behind') || (!front && stage === 'top')) {
        for (let y = 1; y <= 36; y++) L.put(px, y + dy, y % 6 === 0 ? '#c28e5c' : '#9a6a45')
        L.put(px, dy, '#ffd54f')
        const FL = ['rrrrrr', 'yyyyyy', 'rrrrr.', 'gggg..', 'rrrrr.', 'yyyyyy', 'rrrrrr', '...rr.'.replace('...rr.', 'rr..rr')]
        FL.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.put(px + dir * (1 + i), 2 + j + dy, row[i] === 'r' ? '#e8514a' : row[i] === 'y' ? '#ffd54f' : '#5ea653') })
        if (front) commitBehind(b, L, '#6e4a35')
        else commit(b, L, '#6e4a35', TAG.deco)
      }
      return
    }
    case 'oxygen': {
      const pal = { w: '#f4f5fa', W: '#c9ccda', k: '#8a8496', r: '#e8514a', g: '#5ee0a0', h: '#6c6678' }
      if (front && stage === 'behind') {
        commitBehind(b, pairLayer(['.ww.', 'wwwW', 'wwwW', 'wwwW'], 8, 20 + dy, pal), '#8a8496')
      }
      if (!front && stage === 'body') {
        const T = [
          '.ww......ww.',
          'wwwW....wwwW',
          'wwwWkkkkwwwW',
          'wwwWkrgkwwwW',
          'wwwWkkkkwwwW',
          'wwwWhhhhwwwW',
          'wwwW....wwwW',
          'wwwW....wwwW',
          'wwwW....wwwW',
          'wwwW....wwwW',
          '.WW......WW.',
        ]
        commit(b, mapLayer(T, 10, 24 + dy, pal), '#6c6678', TAG.deco)
      }
      return
    }
    default:
      drawV4Back(b, r, key, view, dy, stage)
  }
}

/** Back items on the prostration mound (bow pose). */
function drawBackBow(b: Buf, r: Res, stage: 'behind' | 'top') {
  const key = backKey(r)
  if (!key) return
  if (key === 'aura') {
    if (stage === 'behind') drawAura(b, 15.5, 33, 15.5)
    return
  }
  if (stage !== 'top') return
  switch (key) {
    case 'angel':
    case 'butterfly': {
      const rows = (key === 'angel' ? ANGEL_WING : BUTTERFLY_WING).slice(0, key === 'angel' ? 13 : 11)
      commit(b, pairLayer(rows, 3, 26, key === 'angel' ? WING_PAL : BF_PAL), key === 'angel' ? '#aab3cc' : '#a8436e', TAG.deco)
      return
    }
    case 'thaibag':
    case 'schoolbag': {
      const thai = key === 'thaibag'
      const pal = thai ? { k: '#7e2436', m: '#c0392f', s: '#8e2533', p: '#ffd54f', g: '#ffd54f' } : { k: '#212a52', m: '#2e3a6b', s: '#212a52', p: '#fbfcff', g: '#e9b949' }
      commit(b, mapLayer((thai ? BAG_MAP : SCHOOLBAG_MAP).slice(2), 10, 30, pal), mix(pal.s, INK, 0.4), TAG.deco)
      return
    }
    case 'flag': {
      const L = new Layer()
      for (let y = 12; y <= 34; y++) L.put(24, y, '#9a6a45')
      const FL = ['rrrrrr', 'yyyyyy', 'rrrrr.', 'gggg..', 'rrrrr.', 'yyyyyy', 'rr..rr']
      FL.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.put(25 + i, 12 + j, row[i] === 'r' ? '#e8514a' : row[i] === 'y' ? '#ffd54f' : '#5ea653') })
      commit(b, L, '#6e4a35', TAG.deco)
      return
    }
    case 'oxygen': {
      const pal = { w: '#f4f5fa', W: '#c9ccda', k: '#8a8496', r: '#e8514a', g: '#5ee0a0', h: '#6c6678' }
      commit(b, mapLayer(['wwwWkkkkwwwW', 'wwwWkrgkwwwW', 'wwwWkkkkwwwW', 'wwwW....wwwW', 'wwwW....wwwW', '.WW......WW.'], 10, 31, pal), '#6c6678', TAG.deco)
      return
    }
    default:
      drawV4BackBow(b, key, stage)
  }
}

// ---- shoes ------------------------------------------------------------------

/** The tall satin waistband of Thai boxing shorts sits over the shirt hem. */
function drawMuayBand(b: Buf, r: Res, dy: number, view: DollView) {
  const bt = r.bottom
  if (bt.detail !== 'muay') return
  const band = bt.band ?? '#ffd54f'
  const tc = bt.bandText ?? P.red
  const L = new Layer()
  for (let y = 33; y <= 36; y++) for (let x = 10; x <= 21; x++) L.put(x, y + dy, y === 36 ? mix(band, INK, 0.25) : x >= 20 ? mix(band, INK, 0.12) : y === 33 ? mix(band, '#ffffff', 0.35) : band)
  commit(b, L, mix(band, INK, 0.45), TAG.cloth)
  if (view === 'front') {
    // มวยไทย lettering
    const TXT = ['.1.1.11.1.1.', '1.11.1..11.1']
    TXT.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') b.put(10 + i, 34 + j + dy, tc, TAG.cloth) })
  } else for (let x = 11; x <= 20; x += 3) b.put(x, 34 + dy, tc, TAG.cloth)
}

/** Tall boots are drawn over the trouser legs. */
function drawBoots(b: Buf, r: Res, view: DollView) {
  const sh = r.shoes
  if (!sh || r.bare || sh.kind !== 'boot') return
  const m = mat(sh.main, sh.shade)
  for (const side of [1, -1] as const) {
    const X = (i: number) => (side === 1 ? 14 - i : 17 + i)
    const L = new Layer()
    for (let y = 40; y <= 49; y++) {
      const w = y >= 47 ? 4 : 3
      const i0 = y === 40 ? -1 : 0
      for (let i = i0; i <= w; i++) {
        let c = i === 0 ? m.s : i === w ? m.s : m.b
        if (y === 40) c = sh.accent ?? m.l
        if (y === 41) c = mix(m.b, INK, 0.15)
        if (i === 1 && y >= 42 && y <= 46 && view === 'front') c = m.l
        if (y === 49) c = sh.sole ?? m.d
        L.put(X(i), y, c)
      }
    }
    if (sh.accent && view === 'front') L.put(X(2), 47, sh.accent)
    commit(b, L, m.d, TAG.cloth)
  }
}

// ---------------------------------------------------------------------------
// Bow (กราบ) seen from behind – special composition

const BOW_ARMS = [
  '.....HH..................HH.....',
  '....HHHh................HHHh....',
  '....AAAa................AAAa....',
  '....AAAa................AAAa....',
  '....AAAa................AAAa....',
  '....AAAa................AAAa....',
  '....AAAa................AAAa....',
  '.....AAa................AAa.....',
]
const BOW_SEAT = [
  '.........WWWWWWWWWWWWWw.........',
  '........WWWWWWWWWWWWWWww........',
  '........WWWWWWWWWWWWWWww........',
  '........WWWWWWWWWWWWWWww........',
  '.........WWWWWWWWWWWWww.........',
  '..........WWWWWWWWWWww..........',
]

function drawBow(b: Buf, r: Res) {
  const t = r.top
  const { body, sleeve } = topMats(t)
  const sh = r.shoes ?? DEFAULT_SHOE
  const def = HAIR[r.hair] ?? HAIR.bob
  // head crown (furthest away, peeking beyond the shoulders)
  const tall = r.hair === 'bun' || r.hair === 'jook' || r.hair === 'ponytail' || r.hair === 'twin'
  const crownRows = ['............########............', '..........############..........', '.........##############.........', '........################........', '........################........', '........################........']
  if (r.hair === 'bun' || r.hair === 'jook') crownRows.unshift('.............######.............', '..............####..............')
  if (r.hair === 'curly') crownRows.unshift('..........##..####..##..........')
  const code = r.hair === 'jook' || r.hair === 'buzz' ? 'k' : '#'
  const rows = crownRows.map((row, j) => ((r.hair === 'jook' && j < 2) ? row : row.replace(/#/g, code)))
  const crownY = 29 - rows.length + (tall ? 0 : 0)
  if (r.suit && hoodedR(r)) {
    // the hood's crown instead of hair
    const hs = r.suit
    const hm = mat(hs.main, hs.shade)
    const HR = crownRows.slice(-6)
    commit(b, rowsLayer(HR, 0, 29 - HR.length, (_ch, x, y) => clothCol(hm, hs.pattern, hs.patternColor, hs.patternColor2, x, y, x >= 21, x <= 11 && y <= 25)), hm.d, TAG.cloth)
    drawSuitBow(b, r, 'crown')
  } else {
    commit(b, hairLayer(r, def, { y: crownY, rows }, 0, 0, 'back'), r.hr.d, TAG.hair)
    if (r.hair === 'bun') for (let x = 13; x <= 18; x++) b.put(x, crownY + 2, def.accent ?? P.red, TAG.hair)
    if (r.suit) drawSuitCrownBow(b, r)
  }
  // forearms flat on the floor either side of the head
  const armCov = t.jacket || t.sleeve === 'long'
  const hmat = handMat(r)
  commit(b, rowsLayer(BOW_ARMS, 0, 27, (ch, x, y) => {
    if (ch === 'H' || ch === 'h') return ch === 'h' ? hmat.s : hmat.b
    return armCov ? clothCol(sleeve, t.pattern, t.patternColor, t.patternColor2, x, y, ch === 'a') : ch === 'a' ? r.sk.s : r.sk.b
  }), armCov ? sleeve.d : r.sk.d, TAG.cloth)
  // rounded back
  const bodyM = t.jacket ? mat(t.jacket.main, t.jacket.shade) : t.vest ? mat(t.vest.main, t.vest.shade) : body
  const Bk = new Layer()
  for (let y = 28; y <= 42; y++) {
    const dy = (y + 0.5 - 35.5) / 7.2
    if (Math.abs(dy) > 1) continue
    const half = 9.6 * Math.sqrt(1 - dy * dy)
    for (let x = Math.round(15.5 - half); x < Math.round(15.5 + half); x++) {
      const nx = (x + 0.5 - 15.5) / 9.6
      const shade = nx + dy * 0.6 > 0.45
      const light = nx + dy < -0.75
      Bk.put(x, y, clothCol(bodyM, t.jacket ? t.jacket.pattern : t.pattern, t.jacket ? t.jacket.patternColor : t.patternColor, t.patternColor2, x, y, shade, light))
    }
  }
  commit(b, Bk, bodyM.d, TAG.cloth)
  // spine / seam
  for (let y = 30; y <= 40; y++) if (y % 2) put(b, 16, y, mix(bodyM.b, bodyM.s, 0.5))
  if (t.number) {
    let x = 16 - Math.ceil((t.number.length * 4 - 1) / 2)
    for (const ch of t.number) {
      const d = DIGITS[ch]
      if (d) d.forEach((row, jj) => { for (let i = 0; i < 3; i++) if (row[i] === '#') put(b, x + i, 32 + jj, t.numberColor ?? '#fff') })
      x += 4
    }
  }
  if (t.jacket?.emblem === 'naga') {
    NAGA.forEach((row, jj) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.') put(b, 11 + i, 31 + jj, ch === '1' ? t.jacket!.emblemColor : t.jacket!.emblemColor2) } })
  }
  if (t.extra === 'sabai') for (let y = 29; y <= 40; y++) { put(b, 19, y, t.extraColor ?? P.gold); put(b, 20, y, mix(t.extraColor ?? P.gold, INK, 0.3)) }
  if (t.vest) {
    for (let y = 31; y <= 37; y++) for (let x = 11; x <= 20; x++) put(b, x, y, t.vest.patchColor ?? '#fffaf0')
    if (t.vest.number) drawNumber(b, t.vest.number, 16, 32, t.vest.numberColor ?? INK)
    if (t.vest.trim) for (let x = 8; x <= 23; x++) if (b.tag(x, 39) === TAG.cloth) put(b, x, 39, t.vest.trim)
  }
  if (t.apron) {
    const st = t.apron.strap ?? mix(t.apron.shade, INK, 0.3)
    for (let x = 7; x <= 24; x++) if (b.tag(x, 38) === TAG.cloth) put(b, x, 38, st)
    for (const [x, y] of [[14, 37], [13, 36], [17, 37], [18, 36], [14, 39], [17, 39], [15, 40], [16, 40]] as Pt[]) put(b, x, y, st)
  }
  if (t.extra === 'likay' || t.extra === 'khon') for (let x = 7; x <= 24; x++) if (b.tag(x, 39) === TAG.cloth) put(b, x, 39, (x % 3 === 0 ? '#fff3a6' : t.extraColor ?? P.gold))
  if (r.suit) drawSuitBow(b, r, 'back')
  // long hair spilling forward over the shoulders / a tail on the back
  if ((r.hair === 'ponytail' || r.hair === 'braid') && !hoodedR(r)) {
    const Lh = new Layer()
    for (let y = 28; y <= 34; y++) for (let x = 14; x <= 17; x++) Lh.put(x, y, x === 14 ? r.hr.l : x === 17 ? r.hr.s : (y % 3 === 0 && r.hair === 'braid') ? r.hr.s : r.hr.b)
    commit(b, Lh, r.hr.d, TAG.hair)
  }
  // seat on the heels, then the soles (closest to us)
  const bm = mat(r.bottom.main, r.bottom.shade)
  commit(b, rowsLayer(BOW_SEAT, 0, 40, (ch, x, y) => botCol(r, x, y, ch === 'w')), bm.d, TAG.cloth)
  const F = rowsLayer(['.........FFFFF....FFFFf.........', '.........FFFFF....FFFFf.........', '.........FFFFf....FFFFf.........', '..........fff......fff..........'], 0, 46, (ch) => {
    const low = ch === 'f'
    if (r.bare) return low ? r.sk.s : mix(r.sk.b, r.sk.l, 0.5)
    return low ? mix(sh.sole ?? sh.shade, INK, 0.2) : sh.sole ?? sh.shade
  })
  commit(b, F, r.bare ? r.sk.d : mix(sh.sole ?? sh.shade, INK, 0.5), TAG.cloth)
  if (r.suit) {
    drawSuitTail(b, r, 'back', 'bow')
    if (r.suit.shimmer) drawSuitShimmer(b)
  }
}

// ---------------------------------------------------------------------------
// Full-body suits (ชุดมาสคอต). The suit's synthetic top / bottom / booties go
// through the normal pipeline, so every pose works; these add the hood (which
// replaces the hair and frames the face), belly, tail, spikes...
// Palette codes: m s l d suit main/shade/light/dark, b B L belly, a A e accent,
// c C accent2, w W white, k K ink, p P pink, r R red, y Y gold, G g rooster
// green, n N brown, f F h hair.

type SPal = Record<string, string>

function suitPalD(r: Res, s: SuitArt): SPal {
  const m = mat(s.main, s.shade)
  const bm = mat(s.belly ?? mix(s.main, '#ffffff', 0.6))
  const am = mat(s.accent ?? s.shade)
  const cm = mat(s.accent2 ?? '#fffaf0')
  return {
    m: m.b, s: m.s, l: m.l, d: m.d,
    b: bm.b, B: bm.s, L: bm.l,
    a: am.b, A: am.s, e: am.l,
    c: cm.b, C: cm.s,
    w: '#fffaf0', W: '#ffffff', k: EYE_K, K: INK,
    p: P.pink, P: P.pinkD, r: P.red, R: P.redD, y: P.gold, Y: P.goldD,
    G: '#2f5a4a', g: '#4a8a70', n: '#8a5a3c', N: '#5a3a28',
    f: r.hr.b, F: r.hr.s, h: r.hr.l,
  }
}

const hoodedR = (r: Res) => !!r.suit && r.suit.head !== 'crown'

// Hood geometry in stand coordinates.
const HOOD_E = { x: 15.5, y: 14.6, rx: 12.4, ry: 11.2 }
const OPEN_E = { x: 15.5, y: 19.3, rx: 8.7, ry: 6.8 }
const ell = (x: number, y: number, e: { x: number; y: number; rx: number; ry: number }, grow = 0) =>
  ((x + 0.5 - e.x) / (e.rx + grow)) ** 2 + ((y + 0.5 - e.y) / (e.ry + grow)) ** 2 <= 1
const inHood = (x: number, y: number, e = HOOD_E) => y <= 24 && ell(x, y, e)
/** Per-kind hood outline (a banana is tall and pointy). */
const HOOD_SHAPE: Partial<Record<SuitKind, { x: number; y: number; rx: number; ry: number }>> = {
  banana: { x: 15.5, y: 13.6, rx: 11.8, ry: 12.8 },
}
const inOpening = (x: number, y: number) => ell(x, y, OPEN_E)

/** Paint a row map with palette codes (optionally mirrored), committed with `line`. */
function smap(b: Buf, rows: string[], ox: number, oy: number, pal: SPal, line: string | null, opts: { mirror?: boolean; pair?: boolean; behind?: boolean; tag?: number } = {}) {
  const L = opts.pair ? pairLayer(rows, ox, oy, pal) : mapLayer(rows, ox, oy, pal, !!opts.mirror)
  if (opts.behind) commitBehind(b, L, line, opts.tag ?? TAG.deco)
  else commit(b, L, line, opts.tag ?? TAG.deco)
}

/** A tapering tube along a polyline (tails). */
function tubeLayer(pts: Pt[], r0: number, r1: number, col: (t: number, oy: number, nd: number, x: number, y: number) => string | null, L = new Layer()): Layer {
  const lens: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    lens.push(l)
    total += l
  }
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const R = Math.max(r0, r1) + 1
  for (let y = Math.floor(Math.min(...ys) - R); y <= Math.ceil(Math.max(...ys) + R); y++) {
    for (let x = Math.floor(Math.min(...xs) - R); x <= Math.ceil(Math.max(...xs) + R); x++) {
      let best = { d: 1e9, t: 0, oy: 0 }
      let acc = 0
      for (let i = 1; i < pts.length; i++) {
        const u = segInfo(x + 0.5, y + 0.5, pts[i - 1], pts[i])
        if (u.d < best.d) best = { d: u.d, t: (acc + u.t * lens[i - 1]) / (total || 1), oy: u.oy }
        acc += lens[i - 1]
      }
      const rad = r0 + (r1 - r0) * best.t
      if (best.d > rad) continue
      const c = col(best.t, best.oy / Math.max(rad, 0.01), best.d / Math.max(rad, 0.01), x, y)
      if (c) L.put(x, y, c)
    }
  }
  return L
}

/** Point and upward normal at parameter t along a polyline. */
function alongPath(pts: Pt[], t: number): { p: Pt; n: Pt } {
  const lens: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    lens.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    total += lens[i - 1]
  }
  let want = t * total
  for (let i = 1; i < pts.length; i++) {
    if (want <= lens[i - 1] || i === pts.length - 1) {
      const k = lens[i - 1] ? Math.min(1, want / lens[i - 1]) : 0
      const a = pts[i - 1]
      const c = pts[i]
      const dx = (c[0] - a[0]) / (lens[i - 1] || 1)
      const dyy = (c[1] - a[1]) / (lens[i - 1] || 1)
      // normal pointing "up" (negative y)
      let n: Pt = [dyy, -dx]
      if (n[1] > 0) n = [-n[0], -n[1]]
      return { p: [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k], n }
    }
    want -= lens[i - 1]
  }
  return { p: pts[pts.length - 1], n: [0, -1] }
}

// ---- tails -------------------------------------------------------------------


interface TailDef {
  pts: Pt[]
  low?: Pt[]
  r0: number
  r1: number
}

const TAILS: Partial<Record<SuitKind, TailDef>> = {
  trex: { pts: [[0, 0], [3, 5], [8, 9], [13, 9]], low: [[0, 0], [5, 3], [10, 4], [14, 2]], r0: 3.4, r1: 0.9 },
  shark: { pts: [[0, 0], [4, 4], [8, 6]], low: [[0, 0], [5, 2], [9, 2]], r0: 2.4, r1: 1.4 },
  cat: { pts: [[0, 0], [5, 3], [10, 1], [12, -5], [10, -10]], low: [[0, 0], [6, 2], [11, 0], [13, -5], [11, -9]], r0: 1.4, r1: 1.4 },
  penguin: { pts: [[0, 0], [1, 3]], r0: 2.2, r1: 0.7 },
  elephant: { pts: [[0, 0], [1, 4], [3, 7]], low: [[0, 0], [4, 2], [7, 2]], r0: 0.8, r1: 0.7 },
  liondance: { pts: [[0, 0], [4, 4], [9, 5], [12, 1]], low: [[0, 0], [5, 2], [10, 2], [13, -1]], r0: 2.6, r1: 1.9 },
  naga: { pts: [[0, 0], [3, 6], [9, 9], [14, 7], [15, 2], [12, -1]], low: [[0, 0], [4, 3], [10, 4], [14, 2], [14, -2], [11, -3]], r0: 3.1, r1: 0.9 },
}

function seatFor(view: DollView, legs: LegsKind): Pt {
  if (legs === 'stand') return [15.5, view === 'back' ? 36 : 37]
  if (legs === 'bow') return [15.5, 45]
  return [15.5, legs === 'sitF' || legs === 'sitB' ? 45 : 44]
}

/** Tail: behind the doll in front view, over the body in back view / bow. */
function drawSuitTail(b: Buf, r: Res, view: DollView, legs: LegsKind) {
  const s = r.suit!
  const pal = suitPalD(r, s)
  const low = legs !== 'stand'
  const [sx, sy] = seatFor(view, legs)
  const behind = view === 'front'
  const put = (L: Layer) => (behind ? commitBehind(b, L, pal.d) : commit(b, L, pal.d, TAG.deco))
  const m = mat(s.main, s.shade)
  if (s.kind === 'bunny') {
    // a cotton-ball tail only shows from behind
    if (behind) return
    const L = new Layer()
    for (let y = -4; y <= 4; y++)
      for (let x = -4; x <= 4; x++) {
        const d = Math.hypot(x + 0.5, y + 0.5)
        if (d > 3.3) continue
        L.put(sx + x, sy + y - (low ? 1 : 0), (x + y) % 3 === 0 && d > 1.5 ? '#f0dde4' : d < 1.6 && y < 0 ? '#ffffff' : x + y > 2 ? '#ecd6de' : '#fffaf5')
      }
    commit(b, L, '#d8b4c2', TAG.deco)
    return
  }
  if (s.kind === 'chicken') {
    const fans: [Pt[], string, string][] = [
      [[[0, 0], [6, -2], [10, -8], [9, -14]], pal.G, pal.g],
      [[[0, 0], [7, 0], [12, -4], [14, -10]], pal.r, pal.R],
      [[[0, 0], [6, 2], [12, 1], [15, -4]], pal.G, pal.g],
      [[[0, 0], [5, 3], [10, 4], [13, 2]], pal.y, pal.Y],
    ]
    for (const [pts, c1, c2] of fans) {
      const P2 = pts.map(([x, y]) => [sx + x, sy - 2 + (low ? y * 0.55 : y)] as Pt)
      put(tubeLayer(P2, 1.6, 0.8, (_t, oy) => (oy > 0.2 ? c2 : c1)))
    }
    return
  }
  const def = TAILS[s.kind]
  if (!def) return
  const rel = low ? def.low ?? def.pts.map(([x, y]) => [x, y * 0.35] as Pt) : def.pts
  const pts = rel.map(([x, y]) => [sx + x, sy + y] as Pt)
  const bellyUnder = s.kind === 'trex' || s.kind === 'naga'
  const L = tubeLayer(pts, def.r0, def.r1, (t, oy, nd, x, y) => {
    if (s.kind === 'cat') {
      if (t > 0.9) return pal.b
      return Math.floor(t * 14) % 3 === 0 ? pal.c : oy > 0.3 ? m.s : m.b
    }
    if (s.kind === 'liondance') {
      const fur = (x * 3 + y * 5) % 7
      return t > 0.82 ? (fur < 3 ? pal.W : pal.c) : fur === 0 ? pal.y : fur < 3 ? pal.c : oy > 0.4 ? pal.C : pal.c
    }
    if (s.kind === 'elephant') return oy > 0 ? m.s : m.b
    if (bellyUnder && oy > 0.45) return (x + y) % 3 === 0 ? pal.B : pal.b
    if (s.kind === 'naga') {
      const hit = patHD('scale', x, y)
      if (hit === 1) return mix(pal.m, s.patternColor ?? pal.l, 0.6)
    }
    return oy < -0.45 && nd > 0.3 ? m.l : oy > 0.25 ? m.s : m.b
  })
  if (s.kind === 'elephant') {
    const e = pts[pts.length - 1]
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [-1, 1]] as Pt[]) L.put(e[0] + x, e[1] + y, '#6a5f7a')
  }
  if (s.kind === 'shark') {
    // crescent tail fin
    const e = pts[pts.length - 1]
    const FIN = low ? ['..mm', '.mm.', 'mm..', '.mm.', '..mm'] : ['...m', '..mm', '.mm.', 'mm..', '.mm.', '..ms', '...s']
    mapLayer(FIN, Math.round(e[0]), Math.round(e[1]) - Math.floor(FIN.length / 2), { m: m.b, s: m.s }, false, L)
  }
  put(L)
  // spikes / fins along the top of the tail
  if (s.kind === 'trex' || s.kind === 'naga') {
    const S = new Layer()
    const n = s.kind === 'trex' ? 5 : 6
    for (let i = 0; i < n; i++) {
      const t = 0.12 + (i / n) * 0.8
      const { p, n: nn } = alongPath(pts, t)
      const rad = def.r0 + (def.r1 - def.r0) * t
      const h = s.kind === 'trex' ? 2.6 - i * 0.35 : 2
      for (let k = 0; k <= h; k += 0.5) {
        const w = (1 - k / (h + 0.6)) * 1.3
        for (let q = -w; q <= w; q += 0.5) {
          const x = p[0] + nn[0] * (rad + k) + -nn[1] * q
          const y = p[1] + nn[1] * (rad + k) + nn[0] * q
          S.put(x, y, q > 0.2 ? pal.A : pal.a)
        }
      }
    }
    behind ? commitBehind(b, S, mix(pal.A, INK, 0.4)) : commit(b, S, mix(pal.A, INK, 0.4), TAG.deco)
  }
}

// ---- hood ------------------------------------------------------------------

/** Pixels of the hood right next to the face opening (width 1 or 2). */
function rimAt(x: number, y: number, w: number) {
  return inHood(x, y) && !inOpening(x, y) && ell(x, y, OPEN_E, w)
}

function drawSuitHood(b: Buf, r: Res, view: DollView, dy: number) {
  const s = r.suit!
  const pal = suitPalD(r, s)
  const m = mat(s.main, s.shade)
  const front = view === 'front'
  const k = s.kind
  if (s.head === 'crown') {
    drawSuitCrown(b, r, view, dy)
    return
  }
  // things behind / above the hood
  suitHoodBits(b, r, pal, view, dy, 'behind')
  const L = new Layer()
  const he = HOOD_SHAPE[k] ?? HOOD_E
  for (let y = 0; y <= 26; y++) {
    for (let x = 0; x < IW; x++) {
      if (!inHood(x, y, he)) continue
      if (k === 'banana' && y < 6 && Math.abs(x + 0.5 - 15.5) > (y + 1) * 1.6) continue
      if (front && inOpening(x, y)) continue
      const nx = (x + 0.5 - he.x) / he.rx
      const ny = (y + 0.5 - he.y) / he.ry
      const shade = nx > 0.62 || nx + ny * 0.6 > 0.95
      const light = nx + ny < -0.95 && nx < -0.25
      let c = clothCol(m, s.pattern, s.patternColor, s.patternColor2, x, y, shade, light)
      if (k === 'liondance' && !shade) c = light ? m.l : m.b
      L.put(x, y + dy, c)
    }
  }
  commit(b, L, m.d, TAG.cloth)
  if (!front) {
    suitHoodBits(b, r, pal, view, dy, 'over')
    return
  }
  // hair fringe peeking out
  if (SUIT_FRINGE.has(k)) {
    const F = new Layer()
    for (let y = 11; y <= 14; y++)
      for (let x = 6; x <= 25; x++) {
        if (!inOpening(x, y)) continue
        if (y === 14 && x % 3 === 0) continue
        if (y === 14 && (x < 10 || x > 21)) continue
        F.put(x, y + dy, y === 12 && x >= 11 && x <= 14 ? r.hr.l : x >= 20 ? r.hr.s : r.hr.b)
      }
    commit(b, F, r.hr.d, TAG.hair)
    for (const i of F.m.keys()) {
      const x = i % IW
      const y = Math.floor(i / IW)
      if (b.tag(x, y + 1) === TAG.face) b.put(x, y + 1, r.sk.s, TAG.face)
    }
  }
  // rim around the face
  const rim = SUIT_RIM[k]
  if (rim) {
    const R = new Layer()
    for (let y = 8; y <= 26; y++)
      for (let x = 4; x <= 27; x++) {
        if (!rimAt(x, y, rim.w)) continue
        const c = rim.col(pal, x, y, r)
        if (c) R.put(x, y + dy, c)
      }
    commit(b, R, rim.line ? rim.line(pal) : null, TAG.cloth)
  }
  suitHoodBits(b, r, pal, view, dy, 'over')
}

const SUIT_FRINGE = new Set<SuitKind>(['frog', 'cat', 'penguin', 'bunny', 'chicken', 'elephant', 'durian', 'banana', 'mango', 'moopin', 'naga'])

const SUIT_RIM: Partial<Record<SuitKind, { w: number; col: (p: SPal, x: number, y: number, r: Res) => string | null; line?: (p: SPal) => string }>> = {
  // shark: pink gums with white teeth pointing into the mouth
  shark: { w: 1.6, col: (p, x, y) => (inOpening(x, y + 1) || inOpening(x, y - 1) ? (x % 2 === 0 ? p.W : p.c) : p.c), line: (p) => mix(p.c, INK, 0.4) },
  penguin: { w: 2.2, col: (p) => p.b },
  banana: { w: 1.5, col: (p, x, y) => ((x + y) % 5 === 0 ? p.B : p.b) },
  liondance: { w: 2.4, col: (p, x, y) => ((x * 3 + y * 5) % 7 === 0 ? p.y : (x + y) % 3 === 0 ? p.C : p.c), line: (p) => mix(p.C, INK, 0.3) },
  trex: { w: 0.9, col: (p, x, y) => (y < 16 ? ((x + 1) % 3 === 0 ? null : p.c) : null) },
}

/** Kind-specific hood decorations. 'behind' = poking out behind the hood edge. */
function suitHoodBits(b: Buf, r: Res, p: SPal, view: DollView, dy: number, stage: 'behind' | 'over') {
  const s = r.suit!
  const front = view === 'front'
  const k = s.kind
  const Y = (y: number) => y + dy
  const beh = stage === 'behind'
  if (drawV4SuitHood(b, r, p, view, dy, stage)) return
  switch (k) {
    case 'trex': {
      if (beh) {
        smap(b, ['..aa..', '.aaAa.', 'aaaAAa', 'aaaAAa'], 13, Y(0), p, mix(p.A, INK, 0.4))
        if (!front) return
        return
      }
      if (front) {
        // eye bumps on top, nostrils, teeth along the brim
        smap(b, ['dd....', '.ddd..', '..kWk.', '..kkk.', '...k..'], 6, Y(5), p, null, { pair: true })
        for (const x of [13, 14, 17, 18]) b.put(x, Y(9), x === 13 || x === 18 ? p.d : p.s, TAG.cloth)
        for (let x = 9; x <= 22; x++) {
          let y0 = 11
          while (y0 < 18 && !inOpening(x, y0)) y0++
          if (y0 >= 17) continue
          b.put(x, Y(y0), '#ffffff', TAG.deco)
          if (x % 3 !== 2) b.put(x, Y(y0 + 1), x % 3 === 0 ? '#e6e9f2' : '#ffffff', TAG.deco)
        }
      } else {
        for (const y of [5, 10, 15, 20]) smap(b, ['.aa.', 'aaAa', '.aA.'], 14, Y(y), p, mix(p.A, INK, 0.4))
      }
      return
    }
    case 'shark': {
      if (beh) {
        smap(b, front ? ['..m.', '.mm.', '.mms', 'mmms', 'mmms'] : ['..m.', '.ml.', '.mls', 'mmls', 'mmms'], 14, Y(-1), p, p.d)
        return
      }
      if (front) {
        for (const x of [5, 26]) {
          b.put(x, Y(13), p.k, TAG.deco)
          b.put(x, Y(14), p.k, TAG.deco)
          b.put(x + (x < 16 ? 1 : -1), Y(13), p.W, TAG.deco)
        }
        for (const [x, y] of [[4, 17], [4, 18], [6, 18], [6, 19], [4, 20]] as Pt[]) {
          b.put(x, Y(y), p.d, TAG.deco)
          b.put(31 - x, Y(y), p.d, TAG.deco)
        }
      } else {
        for (let y = 5; y <= 14; y++) b.put(16, Y(y), p.s, TAG.deco)
      }
      return
    }
    case 'frog': {
      if (beh) return
      const EYE = ['..mmmm..', '.mwwwwm.', 'mwwWwwwm', 'mwwkkkwm', 'mwwkkkwm', '.mwwkwm.', '..mmmm..']
      const EYEB = ['..mmmm..', '.mmmmmm.', 'mmmlmmmm', 'mmllmmms', 'mmmmmmms', '.mmmmss.', '..ssss..']
      smap(b, front ? EYE : EYEB, 5, Y(-1), p, p.d, { pair: true })
      if (front) {
        for (const x of [5, 6]) {
          b.put(x, Y(20), p.p, TAG.deco)
          b.put(31 - x, Y(20), p.p, TAG.deco)
        }
      } else {
        for (const [x, y] of [[9, 12], [10, 12], [21, 9], [14, 17], [15, 17], [20, 19]] as Pt[]) b.put(x, Y(y), p.s, TAG.deco)
      }
      return
    }
    case 'cat': {
      if (beh) return
      const EAR = front ? ['m.....', 'mm....', 'mam...', 'maam..', 'maaamm', 'mmmmmm'] : ['m.....', 'mm....', 'mmm...', 'mmmm..', 'mmmmmm', 'mmmmmm']
      smap(b, EAR, 4, Y(0), p, p.d, { pair: true })
      const stripes: Pt[] = front ? [[13, 6], [13, 7], [15, 5], [15, 6], [16, 5], [16, 6], [18, 6], [18, 7], [4, 15], [5, 15], [4, 18], [26, 15], [27, 15], [27, 18]] : [[13, 6], [13, 7], [15, 5], [15, 6], [16, 5], [16, 6], [18, 6], [18, 7], [10, 12], [11, 12], [20, 12], [21, 12], [15, 16], [16, 16], [8, 18], [23, 18]]
      for (const [x, y] of stripes) b.put(x, Y(y), p.c, TAG.deco)
      if (front) {
        const wk = '#8a4a2a'
        for (const [x, y] of [[3, 17], [4, 17], [5, 18], [3, 20], [4, 20], [5, 20]] as Pt[]) {
          b.put(x, Y(y), wk, TAG.deco)
          b.put(31 - x, Y(y), wk, TAG.deco)
        }
      }
      return
    }
    case 'penguin': {
      if (beh || !front) return
      smap(b, ['.aaaa.', 'aeaaaa', '.aAAa.', '..AA..'], 13, Y(8), p, mix(p.A, INK, 0.4))
      for (const x of [10, 20]) {
        b.put(x, Y(8), p.k, TAG.deco)
        b.put(x + 1, Y(8), p.k, TAG.deco)
        b.put(x, Y(9), p.k, TAG.deco)
        b.put(x + 1, Y(9), p.k, TAG.deco)
        b.put(x, Y(8), p.W, TAG.deco)
      }
      return
    }
    case 'bunny': {
      if (beh) return
      const UP = ['.mm.', 'mppm', 'mppm', 'mppm', 'mppm', 'mpps', 'mpps', 'mmss', '.ms.']
      const FLOP = ['...mmmmm..', '..mppppmm.', '.mppmmmmss', 'mppm...ss.', 'mpm.......', 'mps.......', 'mms.......', '.ms.......']
      const UPB = UP.map((row) => row.replace(/p/g, 'm'))
      const FLOPB = FLOP.map((row) => row.replace(/p/g, 'm'))
      smap(b, front ? UP : UPB, front ? 8 : 20, Y(-1), p, p.d, { mirror: !front })
      smap(b, front ? FLOP : FLOPB, front ? 18 : 4, Y(0), p, p.d, { mirror: !front })
      return
    }
    case 'chicken': {
      if (beh) {
        smap(b, ['..a...a...', '.aAa.aAa.a', 'aaaaaaaaaa', '.aaaaaaaa.', '..aaaaaa..'], 11, Y(0), p, p.R)
        return
      }
      if (front) {
        smap(b, ['.cccc.', 'cWcccC', '.cCCC.', '..CC..'], 13, Y(8), p, mix(p.C, INK, 0.4))
        smap(b, ['aa', 'aA', '.A'], 15, Y(12), p, p.R)
        for (const x of [10, 20]) {
          b.put(x, Y(8), p.k, TAG.deco)
          b.put(x + 1, Y(8), p.k, TAG.deco)
          b.put(x + 1, Y(9), p.k, TAG.deco)
          b.put(x, Y(9), p.k, TAG.deco)
        }
      }
      return
    }
    case 'elephant': {
      if (beh) return
      const EAR = front
        ? ['..mmmm.', '.mmmmmm', 'mmppppm', 'mppppmm', 'mppppmm', 'mppppmm', 'mppppmm', 'mmpppmm', '.mmppmm', '..mmmmm', '...mmm.']
        : ['..ssss.', '.ssmmms', 'ssmmmms', 'smmmmms', 'smmmmms', 'smmmmms', 'smmmmms', 'ssmmmms', '.ssmmms', '..sssss', '...sss.']
      smap(b, EAR, 0, Y(8), p, p.d, { pair: true })
      if (front) {
        smap(b, ['.lms.', '.lms.', '.lds.', '.lms.', '.lds.', '.lmms', '..lmm', '...ls'], 13, Y(4), p, p.d)
        for (const x of [10, 20]) {
          b.put(x, Y(8), p.k, TAG.deco)
          b.put(x + 1, Y(8), p.k, TAG.deco)
          b.put(x, Y(9), p.k, TAG.deco)
          b.put(x + 1, Y(9), p.k, TAG.deco)
          b.put(x, Y(8), p.W, TAG.deco)
        }
        smap(b, ['w.', 'ww'], 11, Y(11), p, '#b9b4c8')
        smap(b, ['.w', 'ww'], 19, Y(11), p, '#b9b4c8')
      }
      return
    }
    case 'durian': {
      if (beh) {
        // husk spikes all round the hood
        const S = new Layer()
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2
          if (Math.sin(a) > 0.75) continue
          for (let k2 = 0; k2 <= 2; k2 += 0.5) {
            const w = (1 - k2 / 2.4) * 1.2
            for (let q = -w; q <= w; q += 0.5) {
              const ex = HOOD_E.x + Math.cos(a) * (HOOD_E.rx + k2) - Math.sin(a) * q
              const ey = HOOD_E.y + Math.sin(a) * (HOOD_E.ry + k2) + Math.cos(a) * q
              if (ey > 24) continue
              S.put(ex, ey + dy, q > 0.3 ? p.d : p.s)
            }
          }
        }
        commit(b, S, mix(p.d, INK, 0.3), TAG.deco)
        smap(b, ['.n..', '.nn.', '.nN.', 'nnNN'], 14, Y(0), p, p.N)
        return
      }
      return
    }
    case 'banana': {
      if (beh) return
      // the fruit's tip, and a few soft flesh strands
      smap(b, ['.N', 'nN'], 15, Y(0), p, p.N)
      for (const x of front ? [10, 21] : [10, 16, 21]) for (let y = 5; y <= 9; y++) b.put(x, Y(y), mix(p.m, p.s, 0.5), TAG.deco)
      return
    }
    case 'mango': {
      if (beh) return
      // a big scored mango lying on the head + a leaf
      const M = new Layer()
      for (let y = -1; y <= 8; y++)
        for (let x = 6; x <= 26; x++) {
          const u = (x + 0.5 - 16) / 9.2
          const v = (y + 0.5 - 4.5 - u * 1.2) / 3.6
          if (u * u + v * v > 1) continue
          const score = (x + y) % 4 === 0 || (x - y + 40) % 4 === 0
          M.put(x, y + dy, v > 0.55 ? p.A : score && v > -0.6 ? mix(p.a, p.A, 0.55) : v < -0.5 && u < 0.2 ? p.e : p.a)
        }
      commit(b, M, mix(p.A, INK, 0.35), TAG.deco)
      smap(b, ['..cc.', '.cCcc', 'cCcc.', 'cc...'], 22, Y(-1), p, mix(p.C, INK, 0.4))
      // coconut cream drips and mung beans on the rice
      for (const [x, y] of (front ? [[7, 9], [7, 10], [24, 9], [24, 10], [24, 11], [10, 8], [21, 8]] : [[8, 9], [8, 10], [22, 9], [15, 9], [15, 10], [15, 11]]) as Pt[]) b.put(x, Y(y), '#ffffff', TAG.deco)
      for (const [x, y] of (front ? [[6, 13], [25, 15], [5, 19], [26, 21]] : [[10, 14], [20, 13], [14, 18], [24, 19], [7, 17]]) as Pt[]) b.put(x, Y(y), p.y, TAG.deco)
      return
    }
    case 'moopin': {
      if (beh) {
        const S = new Layer()
        for (let y = -1; y <= 6; y++) {
          S.put(15, y + dy, '#f3e3b8')
          S.put(16, y + dy, y % 3 === 0 ? '#c9ae72' : '#e0c890')
        }
        commit(b, S, '#9a7a45', TAG.deco)
        return
      }
      const streak: Pt[] = front ? [[8, 8], [9, 8], [10, 7], [20, 7], [21, 7], [22, 8], [6, 13], [25, 13]] : [[8, 9], [9, 9], [10, 8], [20, 8], [21, 8], [13, 15], [14, 15], [18, 18], [19, 18]]
      for (const [x, y] of streak) b.put(x, Y(y), p.c, TAG.deco)
      for (const [x, y] of [[11, 5], [12, 5], [19, 10]] as Pt[]) b.put(x, Y(y), mix(p.l, '#ffffff', 0.4), TAG.deco)
      return
    }
    case 'liondance': {
      if (beh) {
        smap(b, ['..aa..', '.aeaA.', '.aaaA.', 'aaaaAA'], 13, Y(-1), p, mix(p.A, INK, 0.4))
        return
      }
      // fluffy fur band along the top
      const Fz = new Layer()
      for (let x = 5; x <= 26; x++) {
        let y0 = 0
        while (y0 < 12 && !inHood(x, y0)) y0++
        const h = 2 + ((x * 7) % 3)
        for (let y = y0 - 1; y <= y0 + h - 1; y++) Fz.put(x, y + dy, (x + y) % 4 === 0 ? p.C : (x * 3 + y) % 7 === 0 ? p.y : p.c)
      }
      commit(b, Fz, mix(p.C, INK, 0.3), TAG.deco)
      if (front) {
        const EYE = ['kkkk..', 'kwwwwk', 'wwWkkw', 'wwkkkw', '.wwww.']
        smap(b, EYE, 6, Y(6), p, p.K, { pair: true })
        smap(b, ['.ww.', 'wWcw', 'wccw', '.ww.'], 14, Y(8), { ...p, w: '#c9d6ea', c: '#e6f0fb' }, '#8a96b0')
        for (const x of [2, 28]) smap(b, ['yy', 'yY'], x, Y(12), p, p.Y)
      } else {
        smap(b, ['.yy.', 'yyyY', '.YY.'], 14, Y(12), p, p.Y)
      }
      return
    }
    case 'yak': {
      if (beh) return
      // tiered crown (มงกุฎ) on the hood
      const g = mat('#ffd54f', '#e9a53a')
      const CR = [
        '.......gg.......',
        '......gGgg......',
        '......gggs......',
        '.....gGrggs.....',
        '.....gggggs.....',
        '....gGgggggs....',
        '...ggGggeggss...',
        '..gggggggggggs..',
        '.gGrgggegggrggs.',
        'ssssssssssssssss',
      ]
      smap(b, CR, 8, Y(-1), { g: g.b, G: g.l, s: g.s, r: P.red, e: '#5ee0a0' }, g.d)
      if (front) {
        // bulging giant eyes and red brows on the hood, tusks by the chin
        smap(b, ['rrr...', '.www..', 'wwkkw.', '.www..'], 8, Y(9), { ...p, r: P.red }, p.K, { pair: true })
        for (const [x, y] of [[10, 22], [10, 21], [11, 20]] as Pt[]) {
          b.put(x, Y(y), '#ffffff', TAG.deco)
          b.put(31 - x, Y(y), '#ffffff', TAG.deco)
        }
        for (const x of [2, 28]) smap(b, ['gg', 'gG', 'gg', '.r', '.g'], x, Y(14), { g: g.b, G: g.l, r: P.red }, g.d)
      }
      return
    }
    case 'naga': {
      if (beh) {
        const CREST = ['.......a......', '......aa...a..', '.....aea..aa..', '....aeaa.aea..', '...aeaAaaeaa.a', '..aaaAAaaAaaaa', '.aaaAAAaAAaaa.']
        smap(b, CREST, 9, Y(-1), p, mix(p.A, INK, 0.4))
        return
      }
      if (front) {
        smap(b, ['.kkk.', 'kWWkk', 'kWkkk', '.kkk.'], 8, Y(7), p, null, { pair: true })
        for (const [x, y] of [[3, 21], [2, 22], [2, 23], [3, 24]] as Pt[]) {
          b.put(x, Y(y), p.a, TAG.deco)
          b.put(31 - x, Y(y), p.a, TAG.deco)
        }
      } else {
        for (const y of [6, 11, 16]) smap(b, ['.aa.', 'aeaA', '.aA.'], 14, Y(y), p, mix(p.A, INK, 0.4))
      }
      return
    }
  }
}

/** Headdresses of the `crown` suits (the hair stays visible). */
function drawSuitCrown(b: Buf, r: Res, view: DollView, dy: number) {
  const s = r.suit!
  drawV4SuitCrown(b, r, view, dy)
  if (s.kind === 'ramkaebon') {
    drawHeadAcc(b, r, 'chada', view, dy, 'over')
    return
  }
  if (s.kind === 'nangkwak') {
    const g = mat('#ffd54f', '#e9a53a')
    const CR = ['....gg....', '...gGgs...', '...grgs...', '..gGggss..', '.gggrgggs.', 'gGgggggggs', 'srsgsgsrss']
    smap(b, CR, 11, dy + 1, { g: g.b, G: g.l, s: g.s, r: P.red }, g.d)
    if (view === 'front') {
      // red flower tucked by the ear
      smap(b, ['.rr.', 'rRyr', '.rr.'], 23, dy + 11, { r: '#e8514a', R: '#ff8a7a', y: '#ffd54f' }, '#7e2436')
    }
  }
}

/** The headdress peeking over the hair on the prostration mound. */
function drawSuitCrownBow(b: Buf, r: Res) {
  if (drawV4SuitCrownBow(b, r)) return
  const g = mat('#ffd54f', '#e9a53a')
  const tall = r.suit!.kind === 'ramkaebon'
  const CR = tall ? ['..gg..', '..gg..', '.gGgs.', '.gggs.', 'gGrggs', 'ssssss'] : ['.gg.', 'gGgs', 'grgs', 'ssss']
  smap(b, CR, tall ? 13 : 14, tall ? 17 : 20, { g: g.b, G: g.l, s: g.s, r: P.red }, g.d)
}

// ---- body --------------------------------------------------------------------

function ellLayer(cx: number, cy: number, rx: number, ry: number, col: (x: number, y: number, u: number, v: number) => string | null, L = new Layer()): Layer {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx
      const v = (y + 0.5 - cy) / ry
      if (u * u + v * v > 1) continue
      const c = col(x, y, u, v)
      if (c) L.put(x, y, c)
    }
  return L
}

/** Peel flaps hanging from the waist (pale inside curling over, yellow outside, brown tips). */
function drawBananaFlaps(b: Buf, p: SPal, y0: number) {
  const line = mix(p.C, INK, 0.4)
  smap(b, ['...bbb', '..bbbc', '.bbccc', '.bccC.', 'bccC..', 'ccC...', 'cC....', 'nn....'], 4, y0, p, line, { pair: true })
  smap(b, ['.bbbbbb.', 'bbbbbbbb', '.cccccC.', '.ccccCC.', '..cccC..', '..cccC..', '...cC...', '...cC...', '...nn...'], 12, y0, p, line)
}

/** Belly, chest trims and back spikes over the suit's torso. */
function drawSuitBody(b: Buf, r: Res, view: DollView, dy: number, pd: PoseDef) {
  const s = r.suit!
  const p = suitPalD(r, s)
  const front = view === 'front'
  const Y = (y: number) => y + dy
  const k = s.kind
  const standing = pd.legs === 'stand'
  if (drawV4SuitBody(b, r, p, view, dy, standing)) return
  // the belly patch stretches over the legs only when standing
  const belly = (rx: number, ry: number, cy: number, col: (x: number, y: number, u: number, v: number) => string | null) => {
    const L = ellLayer(15.5, Y(cy), rx, ry, col)
    // stops at the crotch when standing, at the suit's hem when kneeling / sitting
    const yMax = Y(standing ? 37 : 36)
    for (const i of [...L.m.keys()]) {
      const x = i % IW
      const y = Math.floor(i / IW)
      if (y > yMax || b.c[i] === null || b.tag(x, y) !== TAG.cloth) L.m.delete(i)
    }
    commit(b, L, mix(p.B, INK, 0.25), TAG.cloth)
  }
  if (front) {
    switch (k) {
      case 'trex':
        belly(4.6, 6.2, 33, (_x, y, u) => ((y - dy) % 3 === 0 ? p.B : u > 0.55 ? p.B : p.b))
        // tiny T-rex arms with claws
        smap(b, ['.mm..', 'mmmm.', 'smmmw', '..w.w'], 8, Y(28), p, p.d, { pair: true })
        break
      case 'shark':
      case 'frog':
      case 'bunny':
      case 'cat':
        belly(k === 'shark' ? 5 : 4.4, k === 'shark' ? 6.6 : 5.6, 33, (_x, _y, u) => (u > 0.6 ? p.B : p.b))
        if (k === 'shark') for (const x of [12, 19]) b.put(x, Y(27), p.d, TAG.deco)
        break
      case 'penguin':
        belly(5.6, 8, 33, (_x, _y, u, v) => (u + v * 0.3 > 0.7 ? p.B : p.b))
        break
      case 'chicken':
      case 'liondance': {
        if (k === 'liondance') belly(4.2, 5.5, 31, (x, y) => ((x + y) % 4 === 0 ? p.Y : (x * 3 + y) % 5 === 0 ? p.e : p.b))
        // golden neck cape (hackles) / fur collar
        const C = new Layer()
        for (let y = 24; y <= 29; y++)
          for (let x = 8; x <= 23; x++) {
            const edge = 27 + ((x * 5) % 3) - (Math.abs(x - 15.5) > 6 ? 1 : 0)
            if (y > edge) continue
            if (b.c[y * IW + x + dy * IW] === null) continue
            C.put(x, Y(y), k === 'liondance' ? ((x + y) % 3 === 0 ? p.C : p.c) : y === edge ? p.B : (x + y) % 4 === 0 ? p.L : p.b)
          }
        commit(b, C, mix(k === 'liondance' ? p.C : p.B, INK, 0.3), TAG.cloth)
        break
      }
      case 'durian': {
        belly(4.2, 5, 31, (x, y, u, v) => (u * u + v * v > 0.7 ? p.s : (x + y) % 4 === 0 ? p.B : (x * 3 - y) % 5 === 0 ? p.c : p.b))
        break
      }
      case 'banana':
        drawBananaFlaps(b, p, Y(32))
        break
      case 'mango': {
        for (const [x, y] of [[12, 25], [12, 26], [19, 25], [19, 26], [19, 27], [15, 25], [16, 25]] as Pt[]) b.put(x, Y(y), '#ffffff', TAG.cloth)
        for (const [x, y] of [[13, 29], [18, 31], [14, 33], [20, 28], [11, 31]] as Pt[]) b.put(x, Y(y), p.y, TAG.cloth)
        break
      }
      case 'moopin': {
        for (const y of [28, 33]) for (let x = 8; x <= 23; x++) if (b.tag(x, Y(y)) === TAG.cloth) b.put(x, Y(y), p.d, TAG.cloth)
        for (const [x, y] of [[12, 26], [13, 26], [18, 30], [11, 35]] as Pt[]) b.put(x, Y(y), mix(p.l, '#ffffff', 0.4), TAG.cloth)
        break
      }
      case 'yak': {
        const g = mat('#ffd54f', '#e9a53a')
        // กรองคอ collar, ทับทรวง pendant, belt
        const C = new Layer()
        for (let x = 10; x <= 21; x++) {
          C.put(x, Y(24), (x + 1) % 3 === 0 ? P.red : g.b)
          C.put(x, Y(25), x % 2 ? g.l : g.b)
          if (x >= 12 && x <= 19) C.put(x, Y(26), g.s)
        }
        mapLayer(['.gg.', 'gGrg', 'grgg', '.gs.'], 14, Y(27), { g: g.b, G: g.l, r: P.red, s: g.s }, false, C)
        for (let x = 9; x <= 22; x++) {
          C.put(x, Y(34), x === 15 || x === 16 ? P.red : g.b)
          C.put(x, Y(35), g.s)
        }
        for (const i of [...C.m.keys()]) if (b.c[i] === null) C.m.delete(i)
        commit(b, C, g.d, TAG.cloth)
        break
      }
      case 'naga':
        belly(3.8, 6.6, 33, (_x, y) => ((y - dy) % 3 === 0 ? p.B : p.b))
        break
      case 'nangkwak':
      case 'ramkaebon': {
        const g = mat('#ffd54f', '#e9a53a')
        const C = new Layer()
        for (let x = 12; x <= 19; x++) C.put(x, Y(24), x % 2 ? g.l : g.b)
        for (let x = 13; x <= 18; x++) C.put(x, Y(25), g.b)
        C.put(15, Y(26), P.red)
        C.put(16, Y(26), g.s)
        commit(b, C, g.d, TAG.deco)
        break
      }
    }
    return
  }
  // back view
  switch (k) {
    case 'trex':
      for (const y of [26, 31]) smap(b, ['.aa.', 'aaAa', '.aA.'], 14, Y(y), p, mix(p.A, INK, 0.4))
      break
    case 'naga':
      for (const y of [26, 31]) smap(b, ['.aa.', 'aeaA', '.aA.'], 14, Y(y), p, mix(p.A, INK, 0.4))
      break
    case 'elephant': {
      // ผ้าคลุมหลังช้าง: red saddle cloth with a gold border and tassels
      const L = new Layer()
      for (let y = 25; y <= 34; y++)
        for (let x = 10; x <= 21; x++) {
          const border = y === 25 || y === 34 || x === 10 || x === 21
          const dia = Math.abs(x - 15.5) + Math.abs(y - 29.5) < 3
          L.put(x, Y(y), border ? (x + y) % 2 ? P.gold : P.goldD : dia ? ((x + y) % 2 ? P.gold : '#fff3a6') : (x + y) % 4 === 0 ? P.redD : p.c)
        }
      for (const x of [10, 13, 18, 21]) {
        L.put(x, Y(35), P.gold)
        L.put(x, Y(36), P.goldD)
      }
      commit(b, L, P.redDD, TAG.deco)
      break
    }
    case 'chicken':
    case 'liondance': {
      const C = new Layer()
      for (let y = 24; y <= 29; y++)
        for (let x = 8; x <= 23; x++) {
          const edge = 28 + ((x * 5) % 3) - (Math.abs(x - 15.5) > 6 ? 2 : 0)
          if (y > edge || b.c[(y + dy) * IW + x] === null) continue
          C.put(x, Y(y), k === 'liondance' ? ((x + y) % 3 === 0 ? p.C : p.c) : y === edge ? p.B : (x + y) % 4 === 0 ? p.L : p.b)
        }
      commit(b, C, mix(k === 'liondance' ? p.C : p.B, INK, 0.3), TAG.cloth)
      break
    }
    case 'banana':
      drawBananaFlaps(b, p, Y(32))
      break
    case 'durian':
      for (const [x, y] of [[8, 27], [23, 29], [7, 33], [24, 34]] as Pt[]) smap(b, ['.d', 'dd'], x, Y(y), p, null)
      break
    case 'moopin':
      for (const y of [28, 33]) for (let x = 8; x <= 23; x++) if (b.tag(x, Y(y)) === TAG.cloth) b.put(x, Y(y), p.d, TAG.cloth)
      break
    case 'yak': {
      const g = mat('#ffd54f', '#e9a53a')
      for (let x = 10; x <= 21; x++) {
        put(b, x, Y(24), g.b)
        put(b, x, Y(34), g.b)
        put(b, x, Y(35), g.s)
      }
      break
    }
    case 'nangkwak':
    case 'ramkaebon':
      for (let x = 13; x <= 18; x++) put(b, x, Y(24), '#ffd54f')
      break
  }
}

/** Premium glints on the suit (only on cloth pixels). */
function drawSuitShimmer(b: Buf) {
  const pts: Pt[] = [[7, 9], [22, 6], [5, 17], [26, 19], [11, 28], [20, 31], [9, 36], [22, 40], [14, 44], [18, 25]]
  for (const [x, y] of pts) {
    if (b.tag(x, y) !== TAG.cloth) continue
    b.put(x, y, '#ffffff', TAG.cloth)
    if (b.tag(x + 1, y) === TAG.cloth) b.put(x + 1, y, '#dffcef', TAG.cloth)
  }
}

/** Suit bits on the prostration mound (hood crown, spikes, cape, saddle, tail). */
function drawSuitBow(b: Buf, r: Res, stage: 'crown' | 'back') {
  const s = r.suit!
  const p = suitPalD(r, s)
  const k = s.kind
  if (drawV4SuitBow(b, r, p, stage)) return
  if (stage === 'crown') {
    // features on the hood crown (crown rows ≈ 23..28, centre x 15.5)
    switch (k) {
      case 'trex':
        smap(b, ['..aa..', '.aaAa.', 'aaaAAa'], 13, 20, p, mix(p.A, INK, 0.4))
        break
      case 'shark':
        smap(b, ['..m.', '.ml.', '.mls', 'mmls'], 14, 19, p, p.d)
        break
      case 'frog':
        smap(b, ['.mmm.', 'mmlmm', 'mmmms', '.sss.'], 8, 21, p, p.d, { pair: true })
        break
      case 'cat':
        smap(b, ['m...', 'mm..', 'mmm.', 'mmmm'], 8, 21, p, p.d, { pair: true })
        break
      case 'bunny':
        smap(b, ['.mm.', 'mmmm', 'mmmm', 'mmms', '.ms.'], 10, 19, p, p.d)
        smap(b, ['.mm.', 'mmmm', 'mmms', '.ss.'], 18, 20, p, p.d)
        break
      case 'chicken':
        smap(b, ['.a..a..a.', 'aAaaAaaAa', '.aaaaaaa.'], 11, 20, p, p.R)
        break
      case 'elephant':
        smap(b, ['.ss.', 'smms', 'smms', 'smms', '.ss.'], 5, 24, p, p.d, { pair: true })
        break
      case 'durian':
        smap(b, ['.n.', 'nnN'], 14, 21, p, p.N)
        for (const x of [8, 11, 20, 23]) smap(b, ['.d.', 'ddd'], x, 22, p, null)
        break
      case 'banana':
        smap(b, ['.N', 'nN'], 15, 21, p, p.N)
        break
      case 'mango':
        smap(b, ['.....cc', '.aaaaCc', 'aaeaaaa', 'aaaaaAA', '.AAAAA.'], 11, 20, p, mix(p.A, INK, 0.35))
        break
      case 'moopin': {
        const S = new Layer()
        for (let y = 17; y <= 24; y++) {
          S.put(15, y, '#f3e3b8')
          S.put(16, y, '#e0c890')
        }
        commit(b, S, '#9a7a45', TAG.deco)
        break
      }
      case 'liondance':
        smap(b, ['.aa.', 'aeaA', 'aaAA'], 14, 20, p, mix(p.A, INK, 0.4))
        for (let x = 9; x <= 22; x++) b.put(x, 23 + (x % 2), (x + 1) % 3 ? p.c : p.C, TAG.deco)
        break
      case 'yak': {
        const g = mat('#ffd54f', '#e9a53a')
        smap(b, ['...gg...', '..gGgs..', '..gggs..', '.gGrggs.', 'gggggggs', 'ssssssss'], 12, 18, { g: g.b, G: g.l, s: g.s, r: P.red }, g.d)
        break
      }
      case 'naga':
        smap(b, ['...a....', '..aa..a.', '.aea.aa.', 'aeaAaeaa', 'aaAAaaAa'], 12, 19, p, mix(p.A, INK, 0.4))
        break
    }
    return
  }
  // on the rounded back
  switch (k) {
    case 'trex':
    case 'naga':
      for (const y of [30, 35]) smap(b, ['.aa.', k === 'naga' ? 'aeaA' : 'aaAa', '.aA.'], 14, y, p, mix(p.A, INK, 0.4))
      break
    case 'elephant': {
      const L = new Layer()
      for (let y = 31; y <= 38; y++)
        for (let x = 10; x <= 21; x++) {
          const border = y === 31 || y === 38 || x === 10 || x === 21
          L.put(x, y, border ? ((x + y) % 2 ? P.gold : P.goldD) : Math.abs(x - 15.5) + Math.abs(y - 34.5) < 2.6 ? P.gold : p.c)
        }
      commit(b, L, P.redDD, TAG.deco)
      break
    }
    case 'chicken':
    case 'liondance':
      for (let x = 8; x <= 23; x++) for (let y = 28; y <= 30 + ((x * 5) % 2); y++) if (b.tag(x, y) === TAG.cloth) b.put(x, y, k === 'liondance' ? ((x + y) % 3 ? p.c : p.C) : (x + y) % 4 ? p.b : p.L, TAG.cloth)
      break
    case 'durian':
      for (const [x, y] of [[6, 33], [25, 33], [8, 29], [23, 29], [7, 38], [24, 38]] as Pt[]) smap(b, ['.d.', 'ddd'], x, y, p, null)
      break
    case 'banana':
      drawBananaFlaps(b, p, 37)
      break
    case 'moopin':
      for (const y of [32, 37]) for (let x = 6; x <= 25; x++) if (b.tag(x, y) === TAG.cloth) b.put(x, y, p.d, TAG.cloth)
      break
    case 'mango':
      for (const [x, y] of [[12, 31], [19, 33], [15, 36], [10, 36], [21, 38]] as Pt[]) b.put(x, y, p.y, TAG.cloth)
      break
  }
}

// ---------------------------------------------------------------------------
// Place-exclusive souvenirs (sold only at that place's shop).

function drawSouvenirHead(b: Buf, key: string, view: DollView, dy: number, stage: 'under' | 'over'): boolean {
  const L = new Layer()
  const front = view === 'front'
  const Y = (y: number) => y + dy
  const done = (line: string | null) => commit(b, L, line, TAG.deco)
  const map = (rows: string[], ox: number, oy: number, pal: Record<string, string>, mirror = false) => mapLayer(rows, ox, Y(oy), pal, mirror, L)
  const pair = (rows: string[], ox: number, oy: number, pal: Record<string, string>) => pairLayer(rows, ox, Y(oy), pal, L)
  const g = mat('#ffd54f', '#e9a53a')
  switch (key) {
    case 'yakhat': {
      // a cap shaped like a guardian giant's head, gold crown on top
      if (stage !== 'over') return true
      const f = mat('#d8584a', '#b23d3f')
      for (let y = 2; y <= 11; y++) {
        const w = [6, 8, 9, 10, 10, 11, 11, 11, 11, 11][y - 2]
        for (let x = 16 - w; x <= 15 + w; x++) L.put(x, Y(y), x >= 14 + w ? f.s : y <= 4 && x < 12 ? f.l : f.b)
      }
      map(['.......gg.......', '......gGgs......', '......grgs......', '.....gGgggs.....', '....ggggggss....', '..gGgrgggrggss..', 'ssssssssssssssss'], 8, -2, { g: g.b, G: g.l, s: g.s, r: P.red })
      if (front) {
        pair(['kkk...', '.www..', 'wwkkw.', '.www..'], 8, 5, { k: '#6e2433', w: '#fffaf0' })
        for (let x = 11; x <= 20; x++) L.put(x, Y(10), '#6e2433')
        for (const x of [12, 19]) {
          L.put(x, Y(9), '#ffffff')
          L.put(x, Y(8), '#ffffff')
        }
        pair(['gg', 'gG', '.g'], 3, 10, { g: g.b, G: g.l })
      } else {
        for (let x = 6; x <= 25; x++) L.put(x, Y(10), x % 3 === 0 ? P.red : g.b)
      }
      done('#7e2436')
      return true
    }
    case 'massageband': {
      if (stage !== 'over') return true
      for (let x = 5; x <= 26; x++) for (let y = 9; y <= 11; y++) L.put(x, Y(y), y === 11 ? '#dfe3ee' : x >= 24 ? '#e6e9f2' : '#fbfcff')
      // herbal compress ball (ลูกประคบ) tucked by the knot
      const kx = front ? 23 : 4
      map(['..tt..', '.tTtt.', 'tTtttd', 'ttttdd', '.tddd.', '..ww..', '.w..w.'], kx, 4, { t: '#c9c08a', T: '#e6dfaa', d: '#a09a62', w: '#fbfcff' }, !front)
      if (!front) map(['.ww.ww.', 'w..w..w', '..w..w.'], 12, 11, { w: '#fbfcff' })
      done('#8a8496')
      return true
    }
    case 'chadaprang': {
      if (stage !== 'over') return true
      // corncob prang tower in stone with porcelain flowers, gold tip
      const st = mat('#eadfcb', '#cdbc9f')
      const PR = [
        '.....gg.....',
        '....gGgg....',
        '....sSss....',
        '....s1sd....',
        '...sSs2sd...',
        '...tttttt...',
        '..sS3ss1sd..',
        '..s1ss2ssd..',
        '..tttttttt..',
        '.sSs2ss3ssd.',
        'gggggggggggg',
        'rgrgrgrgrgrg',
      ]
      map(PR, 10, -1, { g: g.b, G: g.l, s: st.b, S: st.l, d: st.s, t: mix(st.s, INK, 0.2), '1': '#ff9fc0', '2': '#5aa9e8', '3': '#ffd54f', r: P.red })
      const EAR = ['..s.', '.sS.', 'sSs.', 's1s.', '.ss.', '..s.', '..r.']
      pair(EAR, 1, 10, { s: st.b, S: st.l, '1': '#5aa9e8', r: P.red })
      done(st.s)
      return true
    }
    case 'ngobpomelo': {
      if (stage !== 'over') return true
      const lt = '#e6d9a0'
      const md = '#c9b878'
      const dk = '#9a8a52'
      for (let y = 0; y <= 6; y++) {
        const w = [3, 5, 7, 8, 9, 10, 10][y]
        for (let x = 16 - w; x <= 15 + w; x++) L.put(x, Y(y + 1), (x + y) % 3 === 0 ? md : x >= 13 + w ? md : lt)
      }
      for (let x = 1; x <= 30; x++) L.put(x, Y(8), x % 2 ? lt : md)
      for (let x = 0; x <= 31; x++) L.put(x, Y(9), x >= 26 ? dk : md)
      for (let x = 6; x <= 25; x++) L.put(x, Y(7), '#6cc36a')
      // a little pomelo with leaves on the brim
      map(['...ll.', '.ppPl.', 'pppPp.', 'ppppd.', '.pdd..'], front ? 22 : 5, 3, { p: '#d6e87a', P: '#f3f8c8', d: '#a8c04a', l: '#43905a' }, !front)
      done(dk)
      return true
    }
    case 'ratears': {
      if (stage !== 'over') return true
      const E = ['..oooo..', '.oOOOOo.', 'oOppppOo', 'oOppppOo', 'oOpPppOo', 'oOppppOo', '.oOppOo.', '..oooo..']
      pair(E, 3, -1, { o: '#8f86a6', O: '#b8b0cc', p: '#ffb3cf', P: '#ffe0ea' })
      for (let x = 8; x <= 23; x++) L.put(x, Y(front ? 5 : 6), x % 2 ? '#8f86a6' : '#a8a0bc')
      done('#5a5270')
      return true
    }
    case 'pineapple': {
      if (stage !== 'over') return true
      const y1 = '#ffc93c'
      const y2 = '#f0a92a'
      for (let y = 3; y <= 11; y++) {
        const w = [7, 9, 10, 11, 11, 11, 11, 11, 10][y - 3]
        for (let x = 16 - w; x <= 15 + w; x++) {
          const dia = (x + y) % 4 === 0 || (x - y + 40) % 4 === 0
          L.put(x, Y(y), dia ? '#c07a1f' : x >= 13 + w ? y2 : (x + y) % 4 === 2 && (x - y + 40) % 4 === 2 ? '#fff0a0' : y1)
        }
      }
      map(['..l..l..l..', '.lLl.lL.lLl', '..lLllLlL..', '.llLLLLLll.', 'lLlLLLLlLl.'], 10, -2, { l: '#43905a', L: '#86c95f' })
      done('#8a5a1f')
      return true
    }
    case 'doibeanie': {
      if (stage !== 'over') return true
      const r1 = '#c0392f'
      const r2 = '#8e2533'
      for (let y = 2; y <= 11; y++) {
        const w = [6, 8, 9, 10, 11, 11, 12, 12, 12, 12][y - 2]
        for (let x = 16 - w; x <= 15 + w; x++) {
          let c = x >= 14 + w ? r2 : (x + y) % 2 === 0 ? '#d24a3f' : r1
          if (y >= 9) c = y === 10 && x % 4 === 1 ? '#c0392f' : y === 9 && x % 4 === 3 ? '#e6e9f2' : '#fbfcff'
          if (y === 6 && x % 4 === 2) c = '#fbfcff'
          if (y === 5 && x % 4 === 2) c = '#e6e9f2'
          L.put(x, Y(y), c)
        }
      }
      map(['.www.', 'wWwww', 'wwwwd', '.wdd.'], 14, -1, { w: '#fbfcff', W: '#ffffff', d: '#dfe3ee' })
      done('#6e2433')
      return true
    }
    case 'carriagehat': {
      if (stage !== 'over') return true
      const hb = mat('#9a6a45', '#6e4a35')
      for (let y = 1; y <= 8; y++) {
        const w = [5, 7, 8, 8, 8, 8, 9, 9][y - 1]
        for (let x = 16 - w; x <= 15 + w; x++) L.put(x, Y(y), y === 1 && (x === 15 || x === 16) ? hb.s : x >= 14 + w ? hb.s : y <= 3 && x < 13 ? hb.l : hb.b)
      }
      for (let x = 7; x <= 24; x++) {
        L.put(x, Y(7), x === 21 ? '#ffd54f' : '#e8514a')
        L.put(x, Y(8), '#b8343f')
      }
      for (let x = 1; x <= 30; x++) L.put(x, Y(9), x >= 26 ? hb.s : hb.b)
      for (let x = 0; x <= 31; x++) L.put(x, Y(10), x <= 2 || x >= 29 ? hb.b : hb.s)
      if (!front) map(['rr.', '.rr', '.r.'], 20, 8, { r: '#e8514a' })
      done(hb.d)
      return true
    }
    case 'gamecock': {
      if (stage !== 'over') return true
      // a fighting rooster riding on the head: comb, beak, wattle, rainbow tail
      const bm = mat('#e0703a', '#b8542a')
      // tail feathers arching up behind
      map(['...GG.', '..GaaG', '.GayaG', 'GGa.G.', 'Ga....', 'G.....'], front ? 21 : 5, 0, { G: '#2f5a4a', a: '#e8514a', y: '#ffd54f' }, !front)
      // the rooster's head as a cap, golden hackles round the rim
      for (let y = 2; y <= 11; y++) {
        const w = [5, 7, 8, 9, 9, 10, 10, 10, 10, 10][y - 2]
        for (let x = 16 - w; x <= 15 + w; x++) L.put(x, Y(y), y >= 10 ? ((x + y) % 2 ? '#ffd54f' : '#f2a33a') : x >= 14 + w ? bm.s : (x + y) % 4 === 0 ? '#f2a33a' : y <= 4 && x < 13 ? bm.l : bm.b)
      }
      map(['.a..a..a.', 'aAa.aAaaA', 'aaaaaaaaa', '.aaaaaaa.'], 11, -1, { a: '#e8514a', A: '#ff8a7a' })
      if (front) {
        pair(['.kk', 'kWk', 'kkk'], 10, 4, { k: '#2a1a2c', W: '#ffffff' })
        map(['.yyyy.', 'yWyyyY', '.yyYY.', '..YY..'], 13, 7, { y: '#ffd54f', Y: '#e9a53a', W: '#fff3a6' })
        map(['rr', 'rR', '.R'], 15, 11, { r: '#e8514a', R: '#b8343f' })
      }
      done('#7e3a1f')
      return true
    }
    case 'beachhat': {
      if (stage !== 'over') return true
      const bl = mat('#6fc7e8', '#3f9fcb')
      for (let y = 1; y <= 7; y++) {
        const w = [6, 8, 9, 9, 9, 10, 10][y - 1]
        for (let x = 16 - w; x <= 15 + w; x++) {
          const fl = patHD('hawaii', x + 3, y + 2)
          L.put(x, Y(y), fl === 1 ? '#ff9fc0' : fl === 2 ? '#fffaf0' : x >= 14 + w ? bl.s : bl.b)
        }
      }
      for (let x = 5; x <= 26; x++) L.put(x, Y(8), '#fffaf0')
      for (let y = 9; y <= 11; y++) {
        const w = 12 + (y - 9)
        for (let x = 16 - w; x <= 15 + w; x++) L.put(x, Y(y), y === 11 ? bl.s : (x + y) % 5 === 0 ? '#ff9fc0' : bl.l)
      }
      done(bl.d)
      return true
    }
  }
  return false
}

function drawSouvenirNeck(b: Buf, key: string, view: DollView, dy: number): boolean {
  const L = new Layer()
  const front = view === 'front'
  const Y = (y: number) => y + dy
  const map = (rows: string[], ox: number, oy: number, pal: Record<string, string>, mirror = false) => mapLayer(rows, ox, Y(oy), pal, mirror, L)
  // thin strings of beads read better without the auto line: shading is painted in
  const done = () => commit(b, L, null, TAG.deco)
  switch (key) {
    case 'marigoldbig': {
      // fat garland of marigold pompoms with a rose-and-jasmine tassel
      const pts: Pt[] = front
        ? [[10, 24], [10, 26], [11, 28], [13, 29], [15, 30], [17, 30], [19, 29], [21, 28], [22, 26], [22, 24]]
        : [[10, 24], [12, 25], [14, 26], [16, 26], [18, 26], [20, 25], [22, 24]]
      pts.forEach(([x, y], i) => map(['.oo.', 'oyOo', 'oOod', '.dd.'], x - 2, y - 1, { o: i % 2 ? '#f58f35' : '#ff9f3a', y: '#ffd23f', O: '#ffbb66', d: '#c8571f' }))
      if (front) map(['.rr.', 'rRrR', '.rr.', '.ww.', '.gw.', '.w..', '.w..'], 14, 31, { r: '#e8514a', R: '#ff8a7a', w: '#fffaf0', g: '#6cc36a' })
      done()
      return true
    }
    case 'goldchain': {
      const g = '#ffd23f'
      const G = '#e9a53a'
      const D = '#b8742a'
      if (!front) {
        for (let x = 10; x <= 21; x++) {
          L.put(x, Y(24), x % 2 ? g : G)
          L.put(x, Y(25), x % 2 ? D : g)
        }
        done()
        return true
      }
      // chunky curb links down to a big "96.5%" gold plate
      for (let i = 0; i <= 6; i++) {
        for (const [x0, s] of [[10, 1], [21, -1]] as Pt[]) {
          const x = x0 + i * s
          L.put(x, Y(24 + i), i % 2 ? g : '#fff3a6')
          L.put(x + s, Y(24 + i), i % 2 ? D : G)
        }
      }
      map(['.DDDD.', 'DgggGD', 'DgWWGD', 'DgggGD', '.DDDD.'], 13, 30, { g, G, D, W: '#fff3a6' })
      done()
      return true
    }
    case 'moneygarland': {
      const cols = ['#ff9fc0', '#6cc36a', '#9fd0ff', '#b98ae6']
      const pts: Pt[] = front
        ? [[10, 24], [11, 26], [12, 28], [14, 29], [17, 29], [19, 28], [20, 26], [21, 24]]
        : [[10, 24], [13, 25], [16, 25], [19, 25], [21, 24]]
      pts.forEach(([x, y], i) => map(['ccw', 'cdc'], x - 1, y, { c: cols[i % 4], d: mix(cols[i % 4], INK, 0.3), w: '#ffffff' }))
      if (front) {
        // fan of folded notes
        map(['.a.b.c.', 'aabbccd', 'Aabbcd.', '.Abcd..', '...w...', '...w...'], 12, 30, { a: cols[0], A: mix(cols[0], INK, 0.25), b: cols[1], c: cols[2], d: cols[3], w: '#ffd54f' })
      }
      done()
      return true
    }
    case 'nagascale': {
      const gr = '#2fa88a'
      const gd = '#1f7a64'
      const g = '#ffd54f'
      if (!front) {
        for (let x = 10; x <= 21; x++) {
          L.put(x, Y(24), x % 2 ? gr : g)
          L.put(x, Y(25), gd)
        }
        done()
        return true
      }
      for (let i = 0; i <= 5; i++) {
        for (const [x0, s] of [[10, 1], [21, -1]] as Pt[]) {
          L.put(x0 + i * s, Y(24 + i), i % 2 ? g : gr)
          L.put(x0 + i * s + s, Y(24 + i), gd)
        }
      }
      // little naga-head pendant with a gold crest
      map(['.g.g.', 'gGgGg', 'dtttd', 'tWktt', 'ttttd', '.tdd.', '..g..'], 13, 29, { g, G: '#fff3a6', t: gr, d: gd, W: '#ffffff', k: '#2a1a2c' })
      done()
      return true
    }
    case 'pakaomasash': {
      // ผ้าขาวม้า draped from one shoulder to the other hip
      const c1 = '#e8514a'
      const c2 = '#3d63b5'
      for (let i = 0; i < 12; i++) {
        const y = 24 + i
        const xc = front ? 11 + i : 20 - i
        for (let k = 0; k <= 3; k++) {
          const x = xc + (front ? k - 1 : 1 - k)
          const a = (x + y) % 3 === 0
          const bb = (x - y + 60) % 3 === 0
          L.put(x, Y(y), k === 3 ? '#8e2533' : a && bb ? '#fffaf0' : a || bb ? c2 : c1)
        }
      }
      map(['rb', 'br', '.r', '.b', '.r'], front ? 22 : 8, 35, { r: c1, b: c2 })
      done()
      return true
    }
    case 'yantmedal': {
      const cord = '#c0392f'
      if (!front) {
        for (let x = 11; x <= 20; x++) L.put(x, Y(24), x % 2 ? cord : '#8e2533')
        done()
        return true
      }
      for (let i = 0; i <= 4; i++) {
        L.put(11 + i, Y(24 + i), cord)
        L.put(20 - i, Y(24 + i), cord)
      }
      // big round medal with a yant pattern
      map(['..DDDD..', '.DgggYD.', 'DgkYYkgD', 'DgYkkYgD', 'DgkYYkgD', 'DgYkkYgD', '.DgggGD.', '..DDDD..'], 12, 28, { D: '#8a5a1f', g: '#ffd54f', Y: '#fff3a6', G: '#e9a53a', k: '#b8742a' })
      done()
      return true
    }
  }
  return drawV4Neck(b, key, view, dy)
}

function drawSouvenirHand(b: Buf, key: string, hx: number, hy: number, mirror: boolean): boolean {
  const L = new Layer()
  const p = (x: number, y: number, c: string) => L.put(mirror ? IW - 1 - (hx + x) : hx + x, hy + y, c)
  const map = (rows: string[], ox: number, oy: number, pal: Record<string, string>) => {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]
        if (ch !== '.' && pal[ch]) p(ox + i, oy + j, pal[ch])
      }
    })
  }
  let line: string = INK
  switch (key) {
    case 'karipap':
      // golden curry puff with a crimped edge
      map(['..cc.c.c.', '.oooooooc', 'oOoooooo.', 'oooOoooo.', '.ooooood.', '..dddd...'], -3, -5, { o: '#f0b458', O: '#ffd98a', c: '#d0883a', d: '#c07a3a' })
      line = '#8a5a2a'
      break
    case 'pakbung':
      // a plate of stir-fried morning glory mid-flight
      map(['.g..G..g.', 'gGg.gG.gG', '.gGgGgGg.', '..r.gG.r.', '...gGg...', '....g....'], -3, -18, { g: '#43905a', G: '#86c95f', r: '#e8514a' })
      map(['.....g...', '....G....'], -3, -12, { g: '#43905a', G: '#86c95f' })
      map(['wwwwwww', '.ddddd.'], -2, -1, { w: '#fbfcff', d: '#c9d6ea' })
      line = '#2f6f4b'
      break
    default:
      return drawV4Hand(b, key, hx, hy, mirror)
  }
  commit(b, L, line, TAG.deco)
  return true
}

// ---------------------------------------------------------------------------
// v4 cosmetics: starter & flood packs, battle-pass "ผู้ประสบภัย" / "กู้ภัย"
// sets and the Thai soft-power pop-culture drop (data: game/data/cosmetics.ts).

const V4 = {
  gold: mat('#ffd54f', '#e9a53a', '#fff3a6'),
  steel: mat('#c9d3e0', '#9aa6b8', '#f0f5fb'),
  orange: mat('#ff7a1a', '#d4580c', '#ffb066'),
  duck: mat('#ffd23f', '#e0a820', '#fff3a6'),
  rope: '#ff5fa8',
  refl: '#e8eef8',
  navy: '#2e3a6b',
}

Object.assign(GRAPHICS, {
  // a fortune-teller's crystal ball on a gold stand, stars around it
  mutelu: ['2.....2', '..111..', '.11111.', '1111111', '11k1111', '.11111.', '..222..', '.22222.'],
  // a grumpy baby pygmy hippo face
  hippo: ['.1...1.', '1111111', '1k111k1', '1111111', '2111112', '.11111.', '..1k1..'],
})

/**
 * Commit a thin decoration crisply: no auto line on the pixels themselves
 * (a 1px stroke would turn entirely into line colour), plus an optional 1px
 * `ring` wherever it sits on top of earlier paint.
 */
function commitCrisp(b: Buf, L: Layer, ring: string | null, tag = TAG.deco) {
  if (ring) {
    const R = new Layer()
    for (const i of L.m.keys()) {
      const x = i % IW
      const y = (i - x) / IW
      for (const [dx, dy] of N4) {
        const nx = x + dx
        const ny = y + dy
        if (!inb(nx, ny) || L.has(nx, ny) || b.c[ny * IW + nx] === null) continue
        R.put(nx, ny, ring)
      }
    }
    commit(b, R, null, tag)
  }
  commit(b, L, null, tag)
}

/** Head items of the v4 drop. */
function drawV4Head(b: Buf, r: Res, key: string, view: DollView, dy: number, stage: 'under' | 'over'): boolean {
  const L = new Layer()
  const front = view === 'front'
  const Y = (y: number) => y + dy
  const p = (x: number, y: number, c: string) => L.put(x, Y(y), c)
  const map = (rows: string[], ox: number, oy: number, pal: Record<string, string>, mirror = false) => mapLayer(rows, ox, Y(oy), pal, mirror, L)
  const pair = (rows: string[], ox: number, oy: number, pal: Record<string, string>) => pairLayer(rows, ox, Y(oy), pal, L)
  const done = (line: string | null) => commit(b, L, line, TAG.deco)
  /** A centred dome: widths per row starting at y0. */
  const dome = (y0: number, widths: number[], col: (x: number, y: number, w: number, j: number) => string | null) => {
    widths.forEach((w, j) => {
      for (let x = 16 - w; x <= 15 + w; x++) {
        const c = col(x, y0 + j, w, j)
        if (c) p(x, y0 + j, c)
      }
    })
  }
  switch (key) {
    case 'elephanthat': {
      if (stage !== 'over') return true
      const g = mat('#aaa5c8', '#8a84ab', '#d2cee6')
      // big floppy ears first
      const E = new Layer()
      for (const s of [-1, 1] as const) {
        const cx = 15.5 + s * 11.2
        ellLayer(cx, Y(12.5), 4.1, 5.8, (_x, _y, u, v) => {
          const inner = front && u * u * 1.6 + v * v < 0.5 && u * s > -0.35
          if (inner) return v > 0.35 ? '#f59abb' : '#ffc4d8'
          return u * s > 0.55 || v > 0.72 ? g.s : v < -0.6 ? g.l : g.b
        }, E)
      }
      commit(b, E, g.d, TAG.deco)
      dome(1, [5, 7, 9, 10, 11, 11, 12, 12, 12], (x, y, w) => (x >= 13 + w || y === 9 ? g.s : y <= 4 && x <= 16 - w + 3 ? g.l : g.b))
      // red and gold head cloth band (crisp, so the thin rows keep their colour)
      const band = () => {
        const B = new Layer()
        for (let x = 4; x <= 27; x++) {
          B.put(x, Y(10), x % 4 === 0 ? V4.gold.b : '#d8434f')
          B.put(x, Y(11), x % 2 ? V4.gold.b : V4.gold.s)
        }
        commitCrisp(b, B, '#7e2436')
      }
      if (front) {
        map(['...gg...', '..grrg..', '.grryrg.', 'gggggggg'], 12, -1, { g: V4.gold.b, r: '#d8434f', y: '#fff3a6' })
        for (const x of [10, 20]) {
          p(x, 6, EYE_K); p(x + 1, 6, EYE_K); p(x, 7, EYE_K); p(x + 1, 7, EYE_K); p(x, 6, WHITE)
        }
        p(8, 8, '#ffb3cf'); p(23, 8, '#ffb3cf')
        // tusks
        p(13, 9, '#fffaf0'); p(18, 9, '#fffaf0')
        done(g.d)
        band()
        // curled-up trunk over the fringe
        const T = tubeLayer([[15.5, Y(6.5)], [15.5, Y(10)], [16.3, Y(12.6)], [18.5, Y(13.2)], [20.2, Y(11.4)]], 1.8, 1, (t, oy) => (Math.floor(t * 9) % 2 === 1 ? g.b : oy > 0.3 ? g.b : oy < -0.4 ? '#e6e3f2' : g.l))
        commit(b, T, g.d, TAG.deco)
        b.put(20, Y(10), '#ff9fc0', TAG.deco)
        b.put(21, Y(11), '#ff9fc0', TAG.deco)
      } else {
        // ceremonial cloth draped down the back of the head
        for (let y = 3; y <= 13; y++)
          for (let x = 11; x <= 20; x++) {
            if (y >= 12 && (x + y) % 2) continue
            const border = x === 11 || x === 20 || y === 13 || y === 3
            p(x, y, border ? (x + y) % 2 ? V4.gold.b : V4.gold.s : Math.abs(x - 15.5) + Math.abs(y - 8) < 3 ? V4.gold.b : '#d8434f')
          }
        done(g.d)
        band()
      }
      return true
    }
    case 'basin': {
      if (stage !== 'over') return true
      const st = V4.steel
      dome(2, [6, 8, 9, 10, 11, 11, 12, 12], (x, y, w, j) => {
        if (x >= 13 + w) return st.s
        if (j >= 1 && (x === 16 - w + 2 || x === 16 - w + 3)) return st.l
        if (j >= 2 && j <= 4 && x === 20) return '#ffffff'
        return (x === 19 && y === 5) || (x === 18 && y === 6) ? st.s : st.b
      })
      for (let x = 3; x <= 28; x++) p(x, 10, x >= 25 ? st.b : st.l)
      for (let x = 2; x <= 29; x++) p(x, 11, x >= 26 ? st.s : x % 5 === 0 ? st.l : st.b)
      for (let x = 3; x <= 28; x++) p(x, 12, st.d)
      done(st.d)
      // pink straw rope tied under the chin
      const RL = new Layer()
      if (front) {
        const R: Pt[] = [[6, 13], [6, 14], [7, 15], [7, 16], [7, 17], [7, 18], [7, 19], [8, 20], [9, 21], [10, 22], [11, 22], [12, 23]]
        for (const [x, y] of R) {
          RL.put(x, Y(y), V4.rope)
          RL.put(31 - x, Y(y), V4.rope)
        }
        mapLayer(['rr..rr', '.rRRr.', 'rr..rr'], 13, Y(23), { r: V4.rope, R: '#ffb3d6' }, false, RL)
      } else for (const x of [6, 25]) for (let y = 13; y <= 16; y++) RL.put(x, Y(y), V4.rope)
      commitCrisp(b, RL, null)
      return true
    }
    case 'rescuehelmet': {
      if (stage !== 'over') return true
      const H = helmetLayer(dy, '#fbfcff', V4.orange.b, '#3a3547', view)
      // reflective band around the crown
      for (let x = 5; x <= 26; x++) if (H.has(x, Y(8)) && x !== 15 && x !== 16) H.put(x, Y(8), x % 3 === 0 ? '#c9d3e0' : V4.refl)
      if (front) mapLayer(['.kkkk.', 'kyYYyk', 'kyYyyk', '.kkkk.'], 13, Y(2), { k: '#3a3547', y: '#ffe45e', Y: '#fffbd0' }, false, H)
      else mapLayer(['rrrr', 'rwwr'], 14, Y(5), { r: V4.orange.b, w: V4.refl }, false, H)
      commit(b, H, '#8a8496', TAG.deco)
      return true
    }
    case 'tomyum': {
      if (stage !== 'over') return true
      const br = mat('#e9b949', '#c08a2a', '#fff0a0')
      // soup surface with bubbles, lemongrass, chilli and a leaf
      for (let x = 7; x <= 24; x++) p(x, 2, x % 4 === 1 ? '#ffb066' : x % 7 === 3 ? '#fff3e6' : '#f0662e')
      for (let x = 5; x <= 26; x++) p(x, 3, x >= 24 ? br.b : br.l)
      const rows: [number, number][] = [[5, 26], [5, 26], [6, 25], [6, 25], [7, 24], [8, 23]]
      rows.forEach(([a, z], j) => {
        const y = 4 + j
        for (let x = a; x <= z; x++) p(x, y, y === 6 ? (x % 3 ? br.s : br.l) : x >= z - 1 ? br.s : x <= a + 1 ? br.l : br.b)
      })
      for (let x = 9; x <= 22; x++) p(x, 10, br.d)
      // handles
      for (const [x, y] of [[3, 4], [4, 4], [3, 5], [3, 6], [4, 6], [27, 4], [28, 4], [28, 5], [27, 6], [28, 6]] as Pt[]) p(x, y, br.s)
      // the chimney of the หม้อไฟ
      for (let y = 0; y <= 2; y++) for (let x = 14; x <= 17; x++) p(x, y, y === 0 ? '#6e4a35' : x === 14 ? br.l : x === 17 ? br.s : br.b)
      // shrimps hanging over the rim
      map(['..rr', '.rRr', 'rR..', 'rr..', '.rk.'], 3, 0, { r: '#f0662e', R: '#ffa060', k: '#3a2838' })
      map(['rr..', 'rRr.', '..Rr', '..rr', '.kr.'], 25, 0, { r: '#f0662e', R: '#ffa060', k: '#3a2838' })
      p(20, 0, '#86c95f'); p(20, 1, '#5ea653'); p(21, 1, '#86c95f')
      p(10, 1, '#e8514a'); p(11, 1, '#b8343f')
      p(23, 1, '#43905a'); p(24, 2, '#43905a')
      done(br.d)
      // steam
      for (const [x, y] of [[12, 0], [19, 0]] as Pt[]) if (!b.get(x, Y(y))) b.put(x, Y(y), '#ffffff', TAG.deco)
      return true
    }
    case 'mangohat': {
      if (stage !== 'over') return true
      // banana-leaf plate
      for (let x = 3; x <= 28; x++) {
        p(x, 9, x % 5 === 0 ? '#86c95f' : '#5ea653')
        p(x, 10, x >= 26 ? '#3f7f45' : '#4a9a50')
      }
      for (let x = 4; x <= 27; x++) p(x, 11, '#3f7f45')
      // sticky rice mound with coconut cream
      const rice = [4, 6, 8, 9, 10, 10]
      rice.forEach((w, j) => {
        const y = 3 + j
        for (let x = 13 - w; x <= 12 + w; x++) p(x, y, j <= 1 ? '#fff8e8' : (x * 3 + y) % 5 === 0 ? '#e6e3da' : x >= 11 + w ? '#e9e6f0' : '#fbfcff')
      })
      for (let x = 3; x <= 28; x++) p(x, 8, (x * 3) % 5 === 0 ? '#e6e3da' : x >= 26 ? '#e9e6f0' : '#fbfcff')
      p(8, 5, '#fff8e8'); p(8, 6, '#fff8e8'); p(15, 6, '#fff8e8')
      for (const [x, y] of [[10, 3], [13, 4], [7, 6], [16, 5], [11, 7]] as Pt[]) p(x, y, '#ffd54f')
      // a whole mango cheek on top
      ellLayer(20.5, Y(4.2), 7.2, 3.2, (x, y, u, v) => {
        const score = v < 0.4 && ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0)
        return v > 0.55 ? '#e9a53a' : v < -0.45 && u < 0.3 ? '#ffe68a' : score ? '#f5b52e' : '#ffc93c'
      }, L)
      p(26, 3, '#b8c93a'); p(27, 4, '#8fae3a')
      map(['.gg', 'gG.'], 26, 1, { g: '#5ea653', G: '#86c95f' })
      done('#9a6a2a')
      return true
    }
    case 'mookata': {
      if (stage !== 'over') return true
      const pan = mat('#4a4458', '#35303f', '#6a6478')
      // broth moat with veggies around the dome
      for (let x = 2; x <= 29; x++) {
        p(x, 8, x % 6 === 0 ? '#5ea653' : x % 6 === 3 ? '#fbfcff' : x % 9 === 1 ? '#ffb02e' : '#d98a3a')
        p(x, 9, x >= 27 ? pan.s : pan.b)
        p(x, 10, pan.s)
      }
      p(1, 8, pan.b); p(30, 8, pan.b); p(1, 9, pan.s); p(30, 9, pan.s)
      dome(1, [3, 5, 7, 8, 9, 10, 11], (x, y, w) => ((y + x) % 2 === 0 && y >= 3 && Math.abs(x - 15.5) < w - 1 ? '#2a2530' : x >= 13 + w ? pan.s : x <= 17 - w ? pan.l : pan.b))
      // sizzling pork belly slices and a lump of fat on top
      map(['pwpp', 'pppw'], 9, 3, { p: '#f08a8a', w: '#fff0f0' })
      map(['pwpp', 'ppwp'], 18, 5, { p: '#e87a7a', w: '#fff0f0' })
      map(['pp', 'wp'], 12, 6, { p: '#f08a8a', w: '#fff0f0' })
      p(15, 0, '#fff8d8'); p(16, 0, '#fff0b0'); p(15, 1, '#fff8d8'); p(16, 1, '#f5e6a8')
      done('#231f2a')
      return true
    }
    case 'platu': {
      if (stage !== 'over') return true
      // bamboo basket-weave band
      for (let x = 5; x <= 26; x++) {
        p(x, 8, (x % 2 ? '#e6c89a' : '#c9a06b'))
        p(x, 9, (x % 2 ? '#a8804e' : '#c9a06b'))
      }
      commitCrisp(b, L, '#6e4a2e')
      // two mackerels with the famous bent neck, heads down into the band:
      // silver belly, blue-grey back, yellow gill line, big round eye
      const FISH = ['........TT', '.......TtT', '..bbbbbbt.', '.bbsssssy.', 'bWksssy...', 'bkks......', '.ss.......']
      const pal = { b: '#6f8aa6', s: '#eef3f8', W: '#ffffff', k: '#1f2a38', t: '#8a9cb0', T: '#c3cfdc', y: '#e0d25a' }
      const F = new Layer()
      mapLayer(FISH, 4, Y(1), pal, false, F)
      mapLayer(FISH, 18, Y(1), pal, true, F)
      commitCrisp(b, F, '#2e3a4a')
      return true
    }
    case 'malaibun': {
      if (stage !== 'over') return true
      const hr = r.hr
      const jas = '#fffaf0'
      const mari = '#ffb02e'
      const rose = '#e8514a'
      if (front) {
        // bun peeking over the crown, garland around it
        ellLayer(15.5, Y(2.2), 4.6, 3.2, (_x, _y, u, v) => (u > 0.45 || v > 0.5 ? hr.s : u < -0.3 && v < -0.2 ? hr.l : hr.b), L)
        done(hr.d)
        // garland wrapped round the bun + a tassel (อุบะ) hanging by the ear
        const U = new Layer()
        for (let x = 10; x <= 21; x++) {
          U.put(x, Y(4), x % 3 === 0 ? mari : x % 3 === 1 ? jas : x === 17 ? rose : '#f5f0dc')
          U.put(x, Y(5), x % 3 === 1 ? mari : x % 3 === 2 ? jas : '#f5f0dc')
        }
        for (const [x, y, c] of [[22, 5, jas], [22, 6, jas], [23, 7, '#f5f0dc'], [23, 8, jas], [23, 9, jas], [24, 10, '#f5f0dc'], [24, 11, rose], [23, 12, rose], [24, 12, '#ff8a7a'], [24, 13, '#5ea653']] as [number, number, string][]) U.put(x, Y(y), c)
        commitCrisp(b, U, hr.d)
      } else {
        ellLayer(15.5, Y(4.5), 5.2, 4.3, (x, y, u, v) => (u > 0.5 || v > 0.55 ? hr.s : u < -0.35 && v < -0.2 ? hr.l : (x + y) % 5 === 0 ? hr.s : hr.b), L)
        done(hr.d)
        const U = new Layer()
        for (let x = 10; x <= 21; x++) {
          U.put(x, Y(8), x % 3 === 0 ? mari : x % 3 === 1 ? jas : '#f5f0dc')
          U.put(x, Y(9), x % 3 === 1 ? mari : x % 3 === 2 ? jas : rose)
        }
        for (let y = 10; y <= 17; y++) {
          U.put(15, Y(y), y % 2 ? jas : '#f5f0dc')
          U.put(16, Y(y), y % 3 === 0 ? mari : jas)
        }
        for (const [x, y, c] of [[15, 18, rose], [16, 18, rose], [15, 19, '#5ea653'], [16, 19, '#43905a']] as [number, number, string][]) U.put(x, Y(y), c)
        commitCrisp(b, U, hr.d)
      }
      return true
    }
    case 'curlers': {
      if (stage !== 'over') return true
      const cols = ['#ff9fc0', '#8fc4ff', '#ffe45e', '#7fd3b5']
      const spots: Pt[] = front ? [[6, 6], [10, 3], [14, 1], [18, 3], [22, 6], [12, 6], [17, 6]] : [[6, 6], [10, 3], [14, 1], [18, 3], [22, 6], [9, 8], [14, 6], [19, 8], [11, 11], [17, 11]]
      spots.forEach(([x, y], i) => {
        const c = cols[i % cols.length]
        const m = mat(c)
        map(['.cc.', 'cCcc', 'cccs', '.ss.'], x, y, { c: m.b, C: m.l, s: m.s })
        if (front) p(x + 1, y + 2, mix(m.s, INK, 0.3))
      })
      commitCrisp(b, L, mix(r.hr.d, INK, 0.3))
      return true
    }
    case 'hippoears': {
      if (stage !== 'over') return true
      const g = mat('#a99db8', '#877a99', '#cfc6dc')
      for (let x = 6; x <= 25; x++) {
        p(x, 8, x >= 23 ? g.s : g.b)
        p(x, 9, g.s)
      }
      pair(['.gg.', 'gppg', 'gpPg', '.gg.'], 6, 3, { g: g.b, p: front ? '#ff9fc0' : g.s, P: front ? '#ffb3cf' : g.s })
      commitCrisp(b, L, g.d)
      return true
    }
  }
  return false
}

/** Neck / body items of the v4 drop. */
function drawV4Neck(b: Buf, key: string, view: DollView, dy: number): boolean {
  const L = new Layer()
  const front = view === 'front'
  const Y = (y: number) => y + dy
  const p = (x: number, y: number, c: string) => L.put(x, Y(y), c)
  const map = (rows: string[], ox: number, oy: number, pal: Record<string, string>, mirror = false) => mapLayer(rows, ox, Y(oy), pal, mirror, L)
  const V: Pt[] = [[12, 24], [12, 25], [13, 26], [13, 27], [14, 28]]
  switch (key) {
    case 'whistle': {
      const c = '#ff8a2a'
      if (!front) {
        for (let x = 13; x <= 18; x++) p(x, 24, c)
        commitCrisp(b, L, null)
        return true
      }
      for (const [x, y] of V) {
        p(x, y, c)
        p(31 - x, y, c)
      }
      commitCrisp(b, L, null)
      const W = mapLayer(['..ww...', '.ooooOk', 'oOoooos', '.osss..'], 12, Y(28), { o: '#ff8a2a', O: '#ffc080', s: '#d06018', w: '#c9ccda', k: '#3a2838' })
      commitCrisp(b, W, '#8a3a10')
      return true
    }
    case 'saimu': {
      const beads = ['#e8514a', '#ffb02e', '#ffe45e', '#5ea653', '#5a8de0', '#8a64d6', '#ff9fc0']
      if (!front) {
        for (let x = 11; x <= 20; x++) p(x, 24, beads[x % beads.length])
        commit(b, L, null, TAG.deco)
        return true
      }
      const path: Pt[] = [[11, 24], [11, 25], [12, 26], [12, 27], [13, 28], [14, 29]]
      path.forEach(([x, y], i) => {
        p(x, y, beads[i % beads.length])
        p(31 - x, y, beads[(i + 3) % beads.length])
      })
      // gold takrut and a purple crystal ball
      map(['gGGGGg', '.pPPp.', '.pWpp.', '.pppq.', '..qq..'], 13, 29, { g: V4.gold.s, G: V4.gold.b, p: '#9a70dc', P: '#c9a8f0', W: '#ffffff', q: '#6a4ab0' })
      commit(b, L, null, TAG.deco)
      return true
    }
    case 'sabaigenz': {
      const c = mat('#8a4fd6', '#6a36b0', '#b98ae6')
      const band = (x0: number, y0: number, dir: 1 | -1, n: number) => {
        for (let i = 0; i < n; i++)
          for (let w = 0; w < 3; w++) {
            const x = x0 + dir * i + w
            const y = y0 + i
            p(x, y, (i + w) % 4 === 0 ? V4.gold.b : w === 2 ? c.s : i % 4 === 2 ? c.l : c.b)
          }
      }
      if (front) band(9, 24, 1, 11)
      else {
        band(19, 24, -1, 11)
        for (let y = 24; y <= 37; y++) for (let x = 19; x <= 21; x++) p(x, y, (x + y) % 4 === 0 ? V4.gold.b : x === 21 ? c.s : c.b)
        for (const x of [19, 21]) p(x, 38, V4.gold.b)
      }
      commit(b, L, c.d, TAG.deco)
      return true
    }
    case 'towel': {
      const st = (y: number) => (y % 2 ? '#5ab4e8' : '#fbfcff')
      for (let x = 12; x <= 19; x++) p(x, 23, st(x))
      if (front) {
        for (let y = 24; y <= 31; y++) for (const x of [11, 12, 13]) p(x, y, y === 31 ? '#dfe3ee' : st(y))
        for (let y = 24; y <= 29; y++) for (const x of [18, 19, 20]) p(x, y, y === 29 ? '#dfe3ee' : st(y + 1))
      } else for (let x = 11; x <= 20; x++) { p(x, 24, st(x + 1)); p(x, 25, st(x)) }
      commit(b, L, '#3f86b8', TAG.deco)
      return true
    }
  }
  return false
}

/** Hand-held items of the v4 drop, relative to the resting hand. */
function drawV4Hand(b: Buf, key: string, hx: number, hy: number, mirror: boolean): boolean {
  const L = new Layer()
  const p = (x: number, y: number, c: string) => L.put(mirror ? IW - 1 - (hx + x) : hx + x, hy + y, c)
  const map = (rows: string[], ox: number, oy: number, pal: Record<string, string>) => {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]
        if (ch !== '.' && pal[ch]) p(ox + i, oy + j, pal[ch])
      }
    })
  }
  let line: string = INK
  switch (key) {
    case 'bailer':
      map(['...wwwwww.', 'hhpppppppp', '..pPPPPPps', '...pPPPps.', '....ssss..'], -1, -1, { p: '#ff7eb6', P: '#ffb3d6', s: '#d9508f', h: '#ff7eb6', w: '#9fd8ff' })
      line = '#a8306a'
      break
    case 'megaphone':
      map(['......rw', '....wwrW', '..wwwwrW', 'kkwwwwrW', '..wwwwrW', '....wwrW', '......rw'], -1, -9, { w: '#fbfcff', W: '#d9dfec', r: '#e8514a', k: '#4a4458' })
      for (let y = -3; y <= 0; y++) p(1, y, '#6a6478')
      line = '#6a6478'
      break
    case 'lotusbouquet': {
      const bud = { p: '#e8709e', P: '#ffc4d8', g: '#43905a' }
      for (let y = -7; y <= 0; y++) { p(0, y, '#43905a'); p(1, y, '#5ea653') }
      map(['.p.', 'pPp', 'pPp', '.p.', '.g.'], -3, -12, bud)
      map(['.p.', 'pPp', 'pPp', 'pPp', '.p.', '.g.'], -1, -14, bud)
      map(['.p.', 'pPp', 'pPp', '.p.', '.g.'], 2, -11, bud)
      for (let y = -6; y <= 2; y++) {
        const w = y < -2 ? 3 : 2
        for (let x = 1 - w; x <= w; x++) p(x, y, y === -2 ? '#ff5fa8' : x === w ? '#b89868' : '#d9b98a')
      }
      line = '#2f6f4b'
      break
    }
    case 'ringlight': {
      for (let i = 0; i <= 14; i++) p(1 + Math.round(i * 0.25), -1 - i, i % 5 === 0 ? '#4a4458' : '#6a6478')
      const cx = 5
      const cy = -21
      for (let y = -27; y <= -15; y++)
        for (let x = -1; x <= 11; x++) {
          const d = Math.hypot(x - cx, y - cy)
          if (d >= 3.6 && d <= 5.4) p(x, y, d > 4.8 ? '#e6ecf5' : '#fffbe6')
        }
      map(['kkk', 'kbk', 'kbk', 'kkk'], 4, -23, { k: '#3a3547', b: '#9fd0ff' })
      line = '#8a8496'
      break
    }
    case 'jellybag':
      map(['.h....h.', '.h....h.', 'h......h', 'mmmmmmmm', 'mWmmmmmM', 'mWmgGmmM', 'mmmggmmM', 'mmpmmmmM', 'mmmmmmMM', '.MMMMMM.'], -2, -1, { h: '#ff9fc0', m: '#aef0e0', M: '#7fd8c2', W: '#ffffff', g: '#ffd54f', G: '#e9a53a', p: '#ff9fc0' })
      line = '#4fb89c'
      break
    case 'dubaichoc':
      map(['.g.gg.', 'gggGgg', 'cgcccg', 'cCcccc', 'ccCccc', 'cccCcc', 'cCcccc', 'ffffff', 'fFffff'], -2, -9, { c: '#6e4228', C: '#8a5634', g: '#9ccf5a', G: '#c9ec8a', f: '#e9b949', F: '#fff0a0' })
      p(4, -5, '#9ccf5a'); p(4, -4, '#9ccf5a')
      line = '#3f2414'
      break
    case 'krapaobox':
      map(['....ww....', '...wYYw...', '..wwYYww..', '.rwwbgbwb.', 'kkkkkkkkkk', '.kKKKKKKk.', '..kkkkkk..'], -4, -6, { w: '#fffaf0', Y: '#ffb02e', b: '#8a5a3a', g: '#43905a', r: '#e8514a', k: '#c9a06b', K: '#e0bf8a' })
      line = '#7a5a2a'
      break
    default:
      return false
  }
  commit(b, L, line, TAG.deco)
  return true
}

/** Ring / band around the waist (front half or back half). */
function waistRing(cy: number, rx: number, ry: number, thick: number, half: 'near' | 'far', col: (u: number, v: number, x: number, y: number) => string): Layer {
  const L = new Layer()
  for (let y = Math.floor(cy - ry - thick); y <= Math.ceil(cy + ry + thick); y++)
    for (let x = 0; x < IW; x++) {
      const u = (x + 0.5 - 15.5) / (rx + thick)
      const v = (y + 0.5 - cy) / (ry + thick)
      if (u * u + v * v > 1) continue
      const ui = (x + 0.5 - 15.5) / rx
      const vi = (y + 0.5 - (cy - thick * 0.6)) / ry
      if (ui * ui + vi * vi < 1) continue
      if (half === 'near' && y + 0.5 < cy - 0.8) continue
      if (half === 'far' && y + 0.5 >= cy - 0.8) continue
      L.put(x, y, col(u, v, x, y))
    }
  return L
}

const DUCK_HEAD = ['..yyy...', '.yyyyy..', 'oyWkyy..', 'ooyyyy..', '.yyyyys.', '..yyys..', '..yys...', '..yys...']
const BLINDBOX = ['.e....e.', '.eE..Ee.', '.eE..Ee.', '.ffffff.', 'ffFFFFff', 'fFkFFkFf', 'fFFFFFFf', 'fmTmTmTf', '.ffffff.', '.f.ff.f.']

/** Back-slot items of the v4 drop ('behind' / 'body' / 'top' as in drawBackItem). */
function drawV4Back(b: Buf, r: Res, key: string, view: DollView, dy: number, stage: 'behind' | 'body' | 'top') {
  const front = view === 'front'
  const Y = (y: number) => y + dy
  const duckPal = { y: V4.duck.b, s: V4.duck.s, o: '#ff8a2a', k: EYE_K, W: WHITE }
  switch (key) {
    case 'duckring': {
      const d = V4.duck
      const col = (u: number, v: number, x: number) => (v < -0.45 ? d.l : v > 0.6 || u > 0.8 ? d.s : (x % 7 === 2 ? '#fff9d0' : d.b))
      if (stage === 'behind') {
        commitBehind(b, waistRing(Y(35), 9, 2.2, 2.4, 'far', col), mix(d.s, INK, 0.4))
        if (!front) commitBehind(b, mapLayer(DUCK_HEAD.map((row) => row.replace(/[okW]/g, 'y')), 23, Y(27), duckPal, true), mix(d.s, INK, 0.4))
      }
      if (stage === 'body') {
        commit(b, waistRing(Y(35), 9, 2.2, 2.4, 'near', col), mix(d.s, INK, 0.4), TAG.deco)
        if (front) commit(b, mapLayer(DUCK_HEAD, 2, Y(27), duckPal), mix(d.s, INK, 0.4), TAG.deco)
      }
      return
    }
    case 'rescuetube': {
      const ring = (cx: number, cy: number, ro: number, ri: number) =>
        ellLayer(cx, cy, ro, ro, (x, y, u, v) => {
          if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < ri) return null
          const a = Math.atan2(v, u)
          const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2
          const base = seg ? '#fbfcff' : '#e8514a'
          const sh = u + v > 0.55
          return sh ? mix(base, INK, 0.18) : u + v < -0.9 ? mix(base, '#ffffff', 0.35) : base
        })
      if (front && stage === 'behind') commitBehind(b, ring(15.5, Y(30.5), 8, 4), '#7e2436')
      if (front && stage === 'body') {
        const S = new Layer()
        for (let i = 0; i <= 10; i++) {
          S.put(20 - i, Y(24 + i), '#e0d6c0')
          S.put(21 - i, Y(24 + i), '#c9bca0')
        }
        for (const i of [...S.m.keys()]) if (b.c[i] === null) S.m.delete(i)
        commitCrisp(b, S, null)
      }
      if (!front && stage === 'body') {
        const R = ring(15.5, Y(30.5), 8, 4)
        for (const [x, y] of [[8, 30], [23, 30], [15, 23], [16, 38]] as Pt[]) R.put(x, Y(y), '#8a8496')
        commit(b, R, '#7e2436', TAG.deco)
      }
      return
    }
    case 'paddle': {
      const wood = mat('#c28e5c', '#9a6a45', '#e0b27a')
      const P2 = (flip: boolean) => {
        const L = new Layer()
        const fx = (x: number) => (flip ? IW - 1 - x : x)
        for (let i = 0; i <= 30; i++) {
          const x = 26 - i * 0.62
          const y = 5 + i
          L.put(fx(Math.round(x)), Y(y), wood.b)
          L.put(fx(Math.round(x) + 1), Y(y), wood.s)
          if (i >= 22) for (let w = -2; w <= 2; w++) L.put(fx(Math.round(x) + w), Y(y), w === -2 ? wood.l : w === 2 ? wood.s : (i + w) % 5 === 0 ? wood.s : wood.b)
        }
        L.put(fx(26), Y(4), wood.d)
        L.put(fx(27), Y(4), wood.d)
        return L
      }
      if (front && stage === 'behind') commitBehind(b, P2(false), wood.d)
      if (!front && stage === 'top') commit(b, P2(true), wood.d, TAG.deco)
      return
    }
    case 'thaiteabag': {
      const tea = (y: number) => (y <= 27 ? '#fff0dc' : y <= 30 ? '#ffb066' : y <= 33 ? '#f58f35' : '#d9702a')
      const cup = () => {
        const L = new Layer()
        for (let y = 23; y <= 38; y++) {
          const inset = y <= 24 ? 1 : Math.floor((y - 25) / 5)
          for (let x = 10 + inset; x <= 21 - inset; x++) {
            let c = y <= 24 ? (x >= 19 ? '#c9d6e6' : '#eef6fb') : tea(y)
            if (y >= 35 && y <= 37 && (x + y) % 2 === 0 && x > 10 + inset && x < 21 - inset) c = y === 35 && x % 4 === 0 ? '#6a5a70' : '#2e2840'
            if (y > 24 && x === 10 + inset + 1) c = mix(c, '#ffffff', 0.45)
            if (y > 24 && x === 21 - inset) c = mix(c, INK, 0.2)
            L.put(x, Y(y), c)
          }
        }
        return L
      }
      const straw = (flip: boolean) => {
        const L = new Layer()
        for (let i = 0; i <= 10; i++) {
          const x = 20 + Math.round(i * 0.3)
          const y = 24 - i
          const fx = flip ? IW - 1 - x : x
          L.put(fx, Y(y), i % 3 === 0 ? '#fbfcff' : '#ff5fa8')
          L.put(fx + (flip ? -1 : 1), Y(y), i % 3 === 0 ? '#e6e9f2' : '#d63f86')
        }
        return L
      }
      if (front && stage === 'body') {
        const f = r.g === 'f'
        for (const x of f ? [12, 19] : [11, 20]) for (let y = 24; y <= 31; y++) put(b, x, Y(y), '#b8742a')
      }
      if (front && stage === 'behind') {
        commitBehind(b, straw(true), '#8e2a5a')
        const S = new Layer()
        for (let y = 26; y <= 36; y++) { S.put(9, Y(y), tea(y)); S.put(22, Y(y), tea(y)) }
        commitBehind(b, S, '#a8541f')
      }
      if (!front && stage === 'body') {
        commitCrisp(b, straw(false), '#8e2a5a')
        commit(b, cup(), '#a8541f', TAG.deco)
      }
      return
    }
    case 'blindbox': {
      const pal = { e: '#b58a70', E: '#ffb3cf', f: '#c7a58a', F: '#f1dcc6', k: EYE_K, m: '#6e2433', T: '#ffffff' }
      if (front && stage === 'body') {
        const f = r.g === 'f'
        for (const x of f ? [12, 19] : [11, 20]) for (let y = 24; y <= 31; y++) put(b, x, Y(y), '#ff9fc0')
      }
      if (front && stage === 'behind') {
        const C = new Layer()
        C.put(8, Y(32), V4.gold.b); C.put(7, Y(33), V4.gold.s)
        mapLayer(BLINDBOX, 1, Y(34), pal, false, C)
        commitBehind(b, C, '#6e4a35')
      }
      if (!front && stage === 'body') {
        const bag = new Layer()
        for (let y = 26; y <= 34; y++) for (let x = 11; x <= 20; x++) bag.put(x, Y(y), y === 29 ? '#e88aae' : x >= 19 || y === 34 ? '#e88aae' : '#ffb3cf')
        bag.put(15, Y(29), V4.gold.b)
        commit(b, bag, '#b9577e', TAG.deco)
        const C = new Layer()
        C.put(20, Y(35), V4.gold.b)
        mapLayer(BLINDBOX, 17, Y(36), pal, false, C)
        commit(b, C, '#6e4a35', TAG.deco)
      }
      return
    }
  }
}

/** v4 back items on the prostration mound. */
function drawV4BackBow(b: Buf, key: string, stage: 'behind' | 'top') {
  if (stage !== 'top') return
  switch (key) {
    case 'duckring': {
      const d = V4.duck
      commit(b, waistRing(40, 10, 2, 2.2, 'near', (_u, v) => (v < -0.4 ? d.l : v > 0.6 ? d.s : d.b)), mix(d.s, INK, 0.4), TAG.deco)
      return
    }
    case 'rescuetube': {
      const R = ellLayer(15.5, 34, 6.5, 5, (_x, _y, u, v) => {
        if (u * u + v * v < 0.3) return null
        const seg = Math.floor(((Math.atan2(v, u) + Math.PI) / (Math.PI * 2)) * 8) % 2
        return seg ? '#fbfcff' : '#e8514a'
      })
      commit(b, R, '#7e2436', TAG.deco)
      return
    }
    case 'paddle': {
      const L = new Layer()
      for (let i = 0; i <= 18; i++) {
        L.put(8 + i, 26 + Math.round(i * 0.7), '#c28e5c')
        L.put(8 + i, 27 + Math.round(i * 0.7), '#9a6a45')
      }
      commit(b, L, '#6e4a35', TAG.deco)
      return
    }
    case 'thaiteabag':
      commit(b, mapLayer(['.wwwwwwww.', 'oooooooooo', 'OOOOOOOOOO', 'OkOkOkOkOO', 'OOkOkOkOkO'], 11, 31, { w: '#eef6fb', o: '#ffb066', O: '#f58f35', k: '#2e2840' }), '#a8541f', TAG.deco)
      return
    case 'blindbox':
      commit(b, mapLayer(['pppppppp', 'pPPpPPpp', 'pppppppp'], 12, 32, { p: '#ffb3cf', P: '#e88aae' }), '#b9577e', TAG.deco)
      return
  }
}

/** Life-vest buckles and rescue-unit emblems over the vest. */
function drawV4TopExtra(b: Buf, r: Res, dy: number, view: DollView) {
  const t = r.top
  if (t.extra !== 'lifevest' && t.extra !== 'rescue') return
  const Y = (y: number) => y + dy
  const f = r.g === 'f'
  if (t.extra === 'lifevest') {
    for (const y of view === 'front' ? [27] : [28]) {
      const sp = torsoSpan(r, y)
      if (!sp) continue
      for (let x = sp[0]; x <= sp[1]; x++) put(b, x, Y(y), '#2e2840')
    }
    if (view === 'front') {
      for (const y of [27, 31]) {
        put(b, 15, Y(y), '#c9ccda')
        put(b, 16, Y(y), '#9aa0b0')
      }
      // puffy collar behind the neck
      for (const x of [12, 13, 18, 19]) put(b, x, Y(23), V4.orange.b)
    }
    return
  }
  // rescue: unit emblem (navy disc, orange cross) on the chest patch / big on the back
  if (view === 'front') {
    const px = f ? 16 : 17
    mapLayer(['.bb.', 'bRRb', 'bRRb', '.bb.'], px, Y(26), { b: V4.navy, R: V4.orange.b }, false).m.forEach((c, i) => put(b, i % IW, Math.floor(i / IW), c))
  } else {
    const E = ['...bbbb...', '..bRRRRb..', '.bRRwwRRb.', 'bRwwwwwwRb', 'bRRRwwRRRb', '.bRRwwRRb.', '..bbbbbb..']
    mapLayer(E, 11, Y(26), { b: V4.navy, R: V4.orange.b, w: '#fbfcff' }).m.forEach((c, i) => put(b, i % IW, Math.floor(i / IW), c))
  }
}

/** Swim fins (ตีนกบ): a foot pocket plus a wide ribbed blade spreading outwards. */
function drawV4Flipper(b: Buf, sh: ShoeArt, view: DollView, X: (i: number) => number) {
  const m = mat(sh.main, sh.shade)
  const strap = sh.accent ?? INK
  const L = new Layer()
  for (let y = 45; y <= 49; y++) {
    const [a, z] = y <= 46 ? [0, 3] : y === 47 ? [0, 5] : y === 48 ? [-1, 7] : [-1, 8]
    for (let i = a; i <= z; i++) {
      let c = i >= 4 ? (i % 2 ? m.b : m.l) : i === 0 ? m.s : m.b
      if (y === 49) c = i >= 4 ? (i % 2 ? m.s : m.b) : sh.sole ?? m.d
      if (y === 46 && view === 'front') c = strap
      L.put(X(i), y, c)
    }
  }
  commit(b, L, m.d, TAG.cloth)
  if (view === 'front') b.put(X(2), 47, m.l, TAG.cloth)
}

// ---- suits ------------------------------------------------------------------

Object.assign(TAILS, {
  hippo: { pts: [[0, 0], [1, 3]], r0: 1.2, r1: 0.7 },
  monitor: { pts: [[0, 0], [3, 5], [8, 8], [14, 8], [17, 5]], low: [[0, 0], [5, 2], [11, 3], [16, 2], [18, 0]], r0: 2.8, r1: 0.6 },
  butterbear: { pts: [[0, 0], [0.5, 1]], r0: 2.2, r1: 1.8 },
} satisfies Partial<Record<SuitKind, TailDef>>)
for (const k of ['hippo', 'monitor', 'capybara', 'butterbear'] as SuitKind[]) SUIT_FRINGE.add(k)
Object.assign(SUIT_RIM, {
  scuba: { w: 1.4, col: (p: SPal) => p.b, line: (p: SPal) => mix(p.B, INK, 0.3) },
  monitor: { w: 1.1, col: (p: SPal, x: number, y: number) => (y > 16 ? ((x + y) % 3 === 0 ? p.B : p.b) : null) },
} satisfies Partial<typeof SUIT_RIM>)

const V4_SUIT_KINDS = new Set<SuitKind>(['scuba', 'rescue', 'hippo', 'monitor', 'capybara', 'butterbear'])

/** Hood decorations of the v4 suits ('behind' pokes out behind the hood). */
function drawV4SuitHood(b: Buf, r: Res, p: SPal, view: DollView, dy: number, stage: 'behind' | 'over'): boolean {
  if (!V4_SUIT_KINDS.has(r.suit!.kind)) return false
  v4SuitHood(b, r, p, view, dy, stage)
  return true
}

function v4SuitHood(b: Buf, r: Res, p: SPal, view: DollView, dy: number, stage: 'behind' | 'over') {
  const s = r.suit!
  const front = view === 'front'
  const Y = (y: number) => y + dy
  const beh = stage === 'behind'
  switch (s.kind) {
    case 'scuba': {
      if (beh) return
      if (front) {
        // mask frame with glass glints (the eyes stay visible)
        const M = new Layer()
        for (let y = 13; y <= 20; y++)
          for (let x = 7; x <= 24; x++) {
            const u = (x + 0.5 - 15.5) / 9
            const v = (y + 0.5 - 16.8) / 4.2
            const d = u * u + v * v
            if (d > 1 || d < 0.62) continue
            M.put(x, Y(y), y <= 14 ? p.a : '#2d3650')
          }
        M.put(15, Y(14), '#2d3650'); M.put(16, Y(14), '#2d3650')
        M.put(9, Y(15), p.c); M.put(10, Y(15), '#ffffff'); M.put(20, Y(15), p.c)
        commit(b, M, '#141826', TAG.deco)
        // snorkel on the right side
        smap(b, ['.aa', '.aA', '.aA', '.aA', '.aA', '.aA', '.aA', '.aA', '.aA', 'aaA', 'kk.'], 24, Y(4), p, mix(p.A, INK, 0.4))
      } else {
        for (let y = 4; y <= 14; y++) b.put(y % 2 ? 15 : 16, Y(y), p.b, TAG.deco)
        smap(b, ['aa.', 'Aa.', 'Aa.', 'Aa.', 'Aa.', 'Aa.', 'Aa.', 'Aa.'], 5, Y(4), p, mix(p.A, INK, 0.4))
      }
      return
    }
    case 'hippo': {
      if (beh) return
      const EAR = ['.mm.', 'mppm', 'mppm', '.mm.']
      smap(b, front ? EAR : EAR.map((row) => row.replace(/p/g, 'm')), 7, Y(1), { ...p, p: p.a }, p.d, { pair: true })
      if (front) {
        // eye bumps, nostrils and blush on the hood
        for (const x of [10, 20]) {
          b.put(x, Y(5), p.k, TAG.deco); b.put(x + 1, Y(5), p.k, TAG.deco); b.put(x, Y(5), p.W, TAG.deco)
        }
        for (const x of [14, 17]) b.put(x, Y(8), p.d, TAG.deco)
        for (const [x, y] of [[4, 17], [5, 17], [4, 18], [26, 17], [27, 17], [27, 18]] as Pt[]) b.put(x, Y(y), p.a, TAG.deco)
      }
      return
    }
    case 'monitor': {
      if (beh) return
      if (front) {
        // snout ridge with nostrils, beady eyes, a flicking forked tongue
        smap(b, ['.mmmm.', 'mmllmm', 'mkmmkm'], 13, Y(1), p, p.d)
        for (const x of [8, 22]) smap(b, ['mmm', 'mWk', 'mkk'], x, Y(5), p, p.d)
        smap(b, ['..c..', '..c..', '.c.c.'], 13, Y(4), p, mix(p.c, INK, 0.3))
        for (const [x, y] of [[6, 11], [25, 11], [5, 15], [26, 15]] as Pt[]) b.put(x, Y(y), p.a, TAG.deco)
      } else for (const y of [3, 7, 11, 15]) for (let x = 12; x <= 19; x++) if ((x + y) % 3 === 0) b.put(x, Y(y), p.a, TAG.deco)
      return
    }
    case 'capybara': {
      if (beh) {
        // the famous yuzu balanced on top, with a leaf
        smap(b, ['...gg.', '.aaag.', 'aeaaaA', 'aaaaAA', '.aAAA.'], 13, Y(-2), p, mix(p.A, INK, 0.4))
        return
      }
      smap(b, ['mm.', 'mpm', '.m.'].map((row) => (front ? row : row.replace('p', 'm'))), 6, Y(3), { ...p, p: p.d }, p.d, { pair: true })
      if (front) {
        // calm half-closed eyes and a big square nose on the hood
        for (const x of [10, 20]) { b.put(x, Y(7), p.k, TAG.deco); b.put(x + 1, Y(7), p.k, TAG.deco) }
        smap(b, ['.dddd.', 'dkddkd', '.dddd.'], 13, Y(8), p, null)
      }
      return
    }
    case 'butterbear': {
      if (beh) return
      const EAR = front ? ['.mmm.', 'mbbbm', 'mbbbm', '.mmm.'] : ['.mmm.', 'mmmmm', 'mmmmm', '.mmm.']
      smap(b, EAR, 4, Y(1), p, p.d, { pair: true })
      if (front) {
        // blue ribbon on one ear, round eyes and a little snout on the hood
        smap(b, ['aa.aa', 'aAaAa', '.aaa.', 'a...a'], 21, Y(-1), p, mix(p.A, INK, 0.4))
        for (const x of [10, 20]) { b.put(x, Y(7), p.k, TAG.deco); b.put(x + 1, Y(7), p.k, TAG.deco); b.put(x, Y(8), p.k, TAG.deco); b.put(x + 1, Y(8), p.k, TAG.deco); b.put(x, Y(7), p.W, TAG.deco) }
        smap(b, ['.bbbb.', 'bbkkbb', '.bbbb.'], 13, Y(8), p, mix(p.B, INK, 0.3))
        for (const x of [6, 25]) b.put(x, Y(10), p.p, TAG.deco)
      }
      return
    }
  }
}

/** Belly panels, chest emblems and back gear of the v4 suits. */
function drawV4SuitBody(b: Buf, r: Res, p: SPal, view: DollView, dy: number, standing: boolean): boolean {
  if (!V4_SUIT_KINDS.has(r.suit!.kind)) return false
  v4SuitBody(b, r, p, view, dy, standing)
  return true
}

function v4SuitBody(b: Buf, r: Res, p: SPal, view: DollView, dy: number, standing: boolean) {
  const s = r.suit!
  const Y = (y: number) => y + dy
  const front = view === 'front'
  const onCloth = (L: Layer) => {
    for (const i of [...L.m.keys()]) if (b.c[i] === null || b.t[i] !== TAG.cloth) L.m.delete(i)
    return L
  }
  const belly = (rx: number, ry: number, cy: number, col: (x: number, y: number, u: number, v: number) => string | null) => {
    const L = ellLayer(15.5, Y(cy), rx, ry, col)
    const yMax = Y(standing ? 37 : 36)
    for (const i of [...L.m.keys()]) if (Math.floor(i / IW) > yMax) L.m.delete(i)
    commit(b, onCloth(L), mix(p.B, INK, 0.25), TAG.cloth)
  }
  switch (s.kind) {
    case 'scuba': {
      if (front) {
        // air tank peeking out behind the shoulders
        const T = mapLayer(['.aa.', 'aeaA', 'aaaA', 'kkkk', 'aaaA'], 22, Y(21), p)
        mapLayer(['.aa.', 'aeaA', 'aaaA', 'kkkk', 'aaaA'], 6, Y(21), p, false, T)
        commitBehind(b, T, mix(p.A, INK, 0.4))
        // teal side panels and a chest zip
        const Z = new Layer()
        for (let y = 25; y <= 36; y++) {
          Z.put(11, Y(y), p.b)
          Z.put(20, Y(y), p.b)
          if (y <= 33) Z.put(16, Y(y), y % 2 ? '#8a94a8' : '#c9d3e0')
        }
        commit(b, onCloth(Z), null, TAG.cloth)
      } else {
        // yellow air tank with black straps
        smap(b, ['..kk..', '.aeaa.', 'aeaaaA', 'aeaaaA', 'kkkkkk', 'aeaaaA', 'aeaaaA', 'aeaaaA', 'kkkkkk', 'aeaaaA', '.aaaA.'], 13, Y(24), p, mix(p.A, INK, 0.4))
      }
      return
    }
    case 'rescue': {
      const R = new Layer()
      for (const y of front ? [30, 31] : [31, 32]) {
        const sp = torsoSpan(r, y)
        if (!sp) continue
        for (let x = sp[0]; x <= sp[1]; x++) R.put(x, Y(y), y % 2 ? '#c9d3e0' : V4.refl)
      }
      commit(b, onCloth(R), null, TAG.cloth)
      if (front) {
        const f = r.g === 'f'
        smap(b, ['.bb.', 'bRRb', 'bRRb', '.bb.'], f ? 16 : 17, Y(25), { b: V4.navy, R: '#fbfcff' }, null)
        for (let x = f ? 12 : 11; x <= (f ? 14 : 13); x++) put(b, x, Y(27), '#fbfcff')
      } else smap(b, ['...bbbb...', '..bRRRRb..', '.bRRwwRRb.', 'bRwwwwwwRb', '.bRRwwRRb.', '..bbbbbb..'], 11, Y(24), { b: V4.navy, R: V4.orange.l, w: '#fbfcff' }, null)
      return
    }
    case 'hippo':
    case 'capybara':
    case 'butterbear':
      if (front) belly(s.kind === 'hippo' ? 5 : 4.4, s.kind === 'hippo' ? 6.4 : 5.6, 33, (_x, _y, u) => (u > 0.6 ? p.B : p.b))
      if (front && s.kind === 'butterbear') smap(b, ['aa..aa', 'aAaaAa', 'aa..aa'], 13, Y(24), p, mix(p.A, INK, 0.4))
      return
    case 'monitor':
      if (front) belly(4, 6.6, 33, (_x, y) => ((y - dy) % 2 === 0 ? p.B : p.b))
      else for (const y of [26, 30, 34]) smap(b, ['.a.a.', 'a.a.a'], 13, Y(y), p, null)
      return
  }
}

/** Crowns of v4 'crown' suits (the rescue suit's built-in helmet). */
function drawV4SuitCrown(b: Buf, r: Res, view: DollView, dy: number) {
  if (r.suit!.kind === 'rescue') drawV4Head(b, r, 'rescuehelmet', view, dy, 'over')
}

function drawV4SuitCrownBow(b: Buf, r: Res) {
  if (r.suit!.kind !== 'rescue') return false
  smap(b, ['...wwww...', '.wwwrrwww.', 'wwwwrrwwww', 'kkkkkkkkkk'], 11, 20, { w: '#fbfcff', r: V4.orange.b, k: '#3a3547' }, '#8a8496')
  return true
}

/** v4 suit bits on the prostration mound. */
function drawV4SuitBow(b: Buf, r: Res, p: SPal, stage: 'crown' | 'back'): boolean {
  const k = r.suit!.kind
  if (!V4_SUIT_KINDS.has(k)) return false
  if (stage === 'crown') {
    if (k === 'hippo') smap(b, ['.mm.', 'mmmm', '.mm.'], 8, 22, p, p.d, { pair: true })
    if (k === 'capybara') smap(b, ['..gg', 'aaag', 'aeaA', '.AA.'], 14, 18, p, mix(p.A, INK, 0.4))
    if (k === 'butterbear') smap(b, ['.mmm.', 'mmmmm', '.mmm.'], 7, 21, p, p.d, { pair: true })
    if (k === 'monitor') for (const x of [11, 15, 19]) b.put(x, 24, p.a, TAG.deco)
    return true
  }
  if (k === 'scuba') smap(b, ['.aeaa.', 'aeaaaA', 'kkkkkk', 'aeaaaA', '.aaaA.'], 13, 29, p, mix(p.A, INK, 0.4))
  if (k === 'rescue') for (let x = 7; x <= 24; x++) if (b.tag(x, 36) === TAG.cloth) b.put(x, 36, V4.refl, TAG.cloth)
  return true
}

// ---------------------------------------------------------------------------
// Composition

/**
 * Height / build reshape for this pose (art/body.ts). Rows from the shoulders
 * down get wider (torso+arms, then legs); chest and thigh rows are doubled or
 * dropped for height. Sets r.bw so raised arms are pre-shifted to match.
 */
function bodyPlan(r: Res, dy: number, legs: LegsKind): ReshapePlan {
  const b = r.body
  const wT = bodyWiden(r.g, b.build, 'torso', 'doll')
  const wL = bodyWiden(r.g, b.build, 'legs', 'doll')
  const d = DOLL_HEIGHT[b.height] ?? 0
  const bow = legs === 'bow'
  const stand = legs === 'stand'
  const torsoY = bow ? 30 : 24 + dy
  // the top's hem (hands hang to ~34) ends the torso band when standing
  const legY = bow ? 30 : stand ? Math.max(hemRow(r.top), 34) + 1 : 42
  r.bw = bow ? 0 : wT
  r.bwY = torsoY
  const rows: { at: number; n: number }[] = []
  if (!bow && d) {
    const half = d / 2
    if (stand) rows.push({ at: 29 + dy, n: half }, { at: 41, n: half })
    else rows.push({ at: 29 + dy, n: d })
  }
  return {
    w: IW,
    h: IH,
    outH: IH + Math.max(0, d),
    widen: (y) => (y >= legY ? wL : y >= torsoY ? wT : 0),
    xl: 12,
    xr: 19,
    left: true,
    right: true,
    rows,
  }
}

function compose(look: AvatarLook, pose: DollPose, view: DollView, blink: boolean, bare: boolean): Buf {
  const r = resolve(look, bare)
  const b = new Buf()
  if (pose === 'bow') {
    b.plan = bodyPlan(r, 0, 'bow')
    drawBow(b, r)
    drawBackBow(b, r, 'top')
    drawBackBow(b, r, 'behind')
    return b
  }
  let pd = poseDef(pose, view)
  // boys cheer with fists pumped instead of open jazz hands
  if (r.g === 'm' && pose === 'happy') pd = { ...pd, L: pd.L && { ...pd.L, hand: 'fist' }, R: pd.R && { ...pd.R, hand: 'fist' } }
  const dy = pd.dy
  b.plan = bodyPlan(r, dy, pd.legs)
  const hair = HAIR[r.hair] ?? HAIR.bob
  const handFree = view === 'front' && pd.R?.hand === 'rest' && pd.legs === 'stand'
  const handPos: [number, number] = [r.g === 'f' ? 22 : 23, 33]

  if (view === 'front') {
    // hair & hood behind the body
    if (!hoodedR(r)) drawHairParts(b, r, hair.behind, dy, 'behind')
    if (handFree && r.hand === 'umbrella') drawHandItem(b, r.hand, view, handPos[0], handPos[1], 'behind')
    if (r.top.collar === 'hood') {
      const hc = mat(r.top.main, r.top.shade)
      const Hd = new Layer()
      for (let y = 21; y <= 24; y++) for (let x = 9; x <= 22; x++) if (!(y === 21 && (x < 11 || x > 20))) Hd.put(x, y + dy, x >= 20 ? hc.s : hc.b)
      if (r.top.extra === 'hood') {
        for (const x of [8, 9, 22, 23]) for (let y = 19; y <= 22; y++) Hd.put(x, y + dy, r.top.extraColor ?? P.brown)
      }
      commit(b, Hd, hc.d, TAG.cloth)
    }
  } else if (r.hand === 'umbrella' && pd.legs === 'stand') {
    drawHandItem(b, r.hand, view, 9, 33, 'behind')
  }

  // legs
  if (pd.legs === 'stand') drawLegsStand(b, r, view)
  else drawLegsSpecial(b, r, pd.legs as 'kneelF' | 'kneelB' | 'sitF' | 'sitB')

  const arms: [ArmDef | null, 1 | -1][] = [
    [pd.L, 1],
    [pd.R, -1],
  ]
  for (const [a, s] of arms) if (a && a.z === 'back') drawArm(b, r, a, s)

  // neck
  const N = new Layer()
  const [n0, n1] = r.g === 'f' ? [14, 17] : [13, 18]
  for (let y = 22; y <= 25; y++) for (let x = n0; x <= n1; x++) N.put(x, y + dy, r.sk.s)
  commit(b, N, r.sk.d, TAG.skin)

  drawTorso(b, r, dy, view)
  if (view === 'front') drawTopFront(b, r, dy)
  else drawTopBack(b, r, dy)
  if (pd.legs === 'stand') drawMuayBand(b, r, dy, view)
  if (r.suit) {
    drawSuitBody(b, r, view, dy, pd)
    if (view === 'back') drawSuitTail(b, r, view, pd.legs)
  }
  drawBackItem(b, r, view, dy, 'body')
  const waistAcc = r.neck === 'waistsash'
  if (waistAcc) drawBodyAcc(b, r, r.neck, view, dy)
  if (r.hand === 'yam') drawBodyAcc(b, r, 'yam', view, dy)

  for (const [a, s] of arms) if (a && a.z === 'front') drawArm(b, r, a, s)
  if (view === 'front' && pd.wai) drawWaiHands(b, r, dy)
  if (view === 'front' && pd.lap) drawLapHands(b, r, dy)
  if (!waistAcc) drawBodyAcc(b, r, r.neck, view, dy)

  // head
  drawHead(b, r, dy, view)
  if (view === 'front') {
    drawFace(b, r, dy, pd.expr, blink)
    if (r.neck === 'mask') drawMask(b, dy)
    drawHeadAcc(b, r, r.head, view, dy, 'under')
    if (hoodedR(r)) drawSuitHood(b, r, view, dy)
    else {
      drawHairParts(b, r, hair.front, dy, 'front')
      if (r.suit) drawSuitCrown(b, r, view, dy)
    }
    drawBrowsOver(b, r, dy, pd.expr)
  } else if (hoodedR(r)) drawSuitHood(b, r, view, dy)
  else {
    drawHairParts(b, r, hair.back, dy, 'back')
    if (r.suit) drawSuitCrown(b, r, view, dy)
  }
  drawHeadAcc(b, r, r.head, view, dy, 'over')

  for (const [a, s] of arms) if (a && a.z === 'top') drawArm(b, r, a, s)
  if (handFree && r.hand && r.hand !== 'yam') drawHandItem(b, r.hand, view, handPos[0], handPos[1], 'over')
  // seen from behind the held item swaps sides
  if (view === 'back' && pd.legs === 'stand' && r.hand && r.hand !== 'yam' && r.hand !== 'umbrella') drawHandItem(b, r.hand, view, handPos[0], handPos[1], 'over', true)
  drawBackItem(b, r, view, dy, 'top')
  drawBackItem(b, r, view, dy, 'behind')
  if (r.suit) {
    if (view === 'front') drawSuitTail(b, r, view, pd.legs)
    if (r.suit.shimmer) drawSuitShimmer(b)
  }
  return b
}

/** Skin of the hands, or the suit's mitten paws. */
function handMat(r: Res): Mat {
  return r.suit?.paws ? mat(r.suit.paws) : r.sk
}

function drawWaiHands(b: Buf, r: Res, dy: number) {
  const h = handMat(r)
  const rows = ['.HH.', 'HHHh', 'HHHh', 'HHhh', 'HHhh', 'HHhh']
  const L = rowsLayer(rows, 14, 24 + dy, (ch) => (ch === 'h' ? h.s : h.b))
  commit(b, L, h.d, TAG.skin)
  b.put(15, 26 + dy, h.s, TAG.skin)
  b.put(15, 27 + dy, h.s, TAG.skin)
}

function drawLapHands(b: Buf, r: Res, dy: number) {
  const h = handMat(r)
  const rows = ['.HHHHHH.', 'HHHHHHHh', '.hhhhhh.']
  commit(b, rowsLayer(rows, 12, 32 + dy, (ch) => (ch === 'h' ? h.s : h.b)), h.d, TAG.skin)
}

// ---------------------------------------------------------------------------
// Public API

export interface DollOptions {
  view?: DollView
  blink?: boolean
  flip?: boolean
  barefoot?: boolean
}

/** Outlined, cached HD doll frame (DOLL_W × DOLL_H). */
export function dollSprite(look: AvatarLook, pose: DollPose, opts: DollOptions = {}): Sprite {
  const view = opts.view ?? (pose === 'bow' ? 'back' : 'front')
  const key = `doll:${lookKey(look)}:${pose}:${view}:${opts.blink ? 1 : 0}:${opts.flip ? 1 : 0}:${opts.barefoot ? 1 : 0}`
  return cached(key, () => {
    const buf = compose(look, pose, view, !!opts.blink, !!opts.barefoot)
    const s = outlineCanvas(buf.canvas(), INK)
    if (!opts.flip) return s
    const f = createCanvas(s.w, s.h)
    const ctx = f.getContext('2d')!
    ctx.translate(s.w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(s.canvas, 0, 0)
    return { canvas: f, w: s.w, h: s.h }
  })
}

/** Head-and-shoulders crop of the front standing doll for round portraits. */
export function dollPortrait(look: AvatarLook, size = 28): Sprite {
  const key = `dollp:${lookKey(look)}:${size}`
  return cached(key, () => {
    const full = dollSprite(look, 'stand')
    const ctx0 = full.canvas.getContext('2d')!
    const data = ctx0.getImageData(0, 0, full.w, full.h).data
    let topRow = 0
    outer: for (let y = 0; y < full.h; y++) for (let x = 6; x < full.w - 6; x++) if (data[(y * full.w + x) * 4 + 3] > 20) { topRow = y; break outer }
    // keep the chin + a little collar in frame
    const sy = Math.max(0, Math.min(topRow, 31 - size))
    const sx = Math.round(full.w / 2 - size / 2)
    const c = createCanvas(size, size)
    const ctx = c.getContext('2d')!
    ctx.drawImage(full.canvas, sx, sy, size, size, 0, 0, size, size)
    return { canvas: c, w: size, h: size }
  })
}

/** A nice default look for each body preset. */
export function dollDefaultLook(gender: 'm' | 'f'): AvatarLook {
  return gender === 'm'
    ? { gender: 'm', skin: 1, face: 0, hairColor: 0, hair: 'hair_twoblock', top: 'top_school_m', bottom: 'bot_school_navy', shoes: 'shoes_school', head: null, neck: null, hand: null, back: null }
    : { gender: 'f', skin: 1, face: 0, hairColor: 0, hair: 'hair_schoolgirl', top: 'top_school_f', bottom: 'bot_school_skirt', shoes: 'shoes_school', head: null, neck: null, hand: null, back: null }
}
