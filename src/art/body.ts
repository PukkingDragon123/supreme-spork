// Body & face customisation shared by the HD doll (art/doll.ts), the world
// sprite (art/avatar.ts), character creation / dress-up and the online look
// validator. Every field is optional on AvatarLook: a missing value means
// "the default for this body preset" (boys get a squarer jaw and thick
// straight brows, girls a round face and soft arched brows), so old saves and
// hand-written NPC looks keep working unchanged.
//
// Height and build are applied as a pixel *reshape* after an avatar frame is
// composed (columns inside the torso and legs are duplicated or dropped, rows
// in the chest and thighs are duplicated or dropped). Because it runs on the
// finished frame, every top, bottom, suit and hat fits every body.

import type { AvatarLook, BodyType } from './avatar'

export interface BodyOption {
  id: number
  name: string
}

const opts = (...names: string[]): readonly BodyOption[] => names.map((name, id) => ({ id, name }))

/** ความสูง: index 2 is the classic height. */
export const HEIGHTS = opts('ตัวจิ๋ว', 'ตัวเล็ก', 'สูงปกติ', 'สูงโปร่ง')
/** รูปร่าง */
export const BUILDS = opts('ผอมเพรียว', 'สมส่วน', 'จ้ำม่ำ', 'บึกบึน')
/** รูปหน้า */
export const FACE_SHAPES = opts('หน้ากลม', 'หน้าเหลี่ยม', 'หน้าวี', 'แก้มป่อง')
/** คิ้ว */
export const BROWS = opts('คิ้วโก่ง', 'คิ้วหนาตรง', 'คิ้วบาง', 'คิ้วเข้ม', 'คิ้วตก')
/** จมูก */
export const NOSES = opts('ไม่มีจมูก', 'จมูกจุด', 'จมูกโด่ง')
/** ปาก */
export const MOUTHS = opts('ยิ้มแมว', 'ยิ้มกว้าง', 'ปากจิ๋ว', 'ยิ้มมุมปาก', 'ฟันกระต่าย')
/** หนวดเครา */
export const BEARDS = opts('ไม่มี', 'เคราเขียว ๆ', 'หนวดจิ๋ว', 'เคราแพะ', 'เคราเต็ม')
/** กระ / ไฝ (freckles and mole positions) */
export const MARKS = opts('ไม่มี', 'ตกกระ', 'ไฝใต้ตา', 'ไฝเสน่ห์', 'ไฝแก้ม', 'ไฝคาง')
/** สีตา */
export const EYE_COLORS = opts('น้ำตาล', 'ดำขลับ', 'เฮเซล', 'เทาหม่น', 'ฟ้าใส', 'เขียวมรกต', 'อำพัน')
/** ขนาดตา */
export const EYE_SIZES = opts('ตาเล็ก', 'ตาปกติ', 'ตาโต')
/** ชั้นตา */
export const EYELIDS = opts('ตามแบบตา', 'ชั้นเดียว', 'สองชั้น', 'ตาปรือ')
/** ขนตา */
export const LASHES = opts('ตามเพศ', 'มีขนตา', 'ไม่มีขนตา')
/** ประกายตา */
export const SHINES = opts('วิบวับ', 'ประกายคู่', 'ประกายโต', 'ตาด้าน')
/** สีคิ้ว */
export const BROW_COLORS = opts('ตามสีผม', 'ดำ', 'น้ำตาลเข้ม', 'น้ำตาลอ่อน', 'เทา')
/** แก้ม (blush level) */
export const BLUSHES = opts('ไม่ปัดแก้ม', 'ระเรื่อ', 'อมชมพู', 'แก้มแดง')
/** สีปาก */
export const LIPS = opts('ธรรมชาติ', 'ชมพูหวาน', 'แดงสด', 'ส้มพีช', 'นู้ด', 'เบอร์รี่')
/** ของแต่งหน้า (not outfits) */
export const FACE_DECOS = opts('ไม่มี', 'ลักยิ้ม', 'พลาสเตอร์', 'สติ๊กเกอร์ธงไทย', 'สติ๊กเกอร์หัวใจ', 'สติ๊กเกอร์ดาว')

/** Number of eye styles (AvatarLook.face), matching doll.ts FACE_STYLES. */
export const EYE_COUNT = 9

/** Iris colours by EYE_COLORS index: pupil (dark) and iris light; boys' brown has a warmer glint. */
export const IRIS: { p: string; i: string; im?: string; s: string }[] = [
  { p: '#4a2a48', i: '#b8657f', im: '#a0705a', s: '#5a3838' },
  { p: '#241a26', i: '#5a4a5e', s: '#2a2030' },
  { p: '#4a3420', i: '#b08a48', s: '#6a4a28' },
  { p: '#3a3e4c', i: '#9aa4b8', s: '#4a5060' },
  { p: '#243c78', i: '#5c9ae0', s: '#2e4c8a' },
  { p: '#1e5038', i: '#56b27a', s: '#286044' },
  { p: '#6a3814', i: '#e0a040', s: '#7a4a1a' },
]
/** Brow colours (index 0 = hair colour). */
export const BROW_HEX = [null, '#2a1e2a', '#4a2e22', '#8a5e3c', '#6a6670'] as const
/** Lip colours: main, soft corner (index 0 = the classic mouth). */
export const LIP_HEX = ['#a8435a', '#e0607e', '#d8283c', '#ec7a52', '#b0705e', '#8a2a5a'] as const

export interface BodyLook {
  height: number
  build: number
  faceShape: number
  brows: number
  nose: number
  mouth: number
  beard: number
  marks: number
  eyeColor: number
  eyeSize: number
  eyelid: number
  lashes: number
  shine: number
  browColor: number
  blush: number
  lips: number
  faceDeco: number
}

export const BODY_KEYS = ['height', 'build', 'faceShape', 'brows', 'nose', 'mouth', 'beard', 'marks', 'eyeColor', 'eyeSize', 'eyelid', 'lashes', 'shine', 'browColor', 'blush', 'lips', 'faceDeco'] as const
export type BodyKey = (typeof BODY_KEYS)[number]

export const BODY_OPTIONS: Record<BodyKey, readonly BodyOption[]> = {
  height: HEIGHTS,
  build: BUILDS,
  faceShape: FACE_SHAPES,
  brows: BROWS,
  nose: NOSES,
  mouth: MOUTHS,
  beard: BEARDS,
  marks: MARKS,
  eyeColor: EYE_COLORS,
  eyeSize: EYE_SIZES,
  eyelid: EYELIDS,
  lashes: LASHES,
  shine: SHINES,
  browColor: BROW_COLORS,
  blush: BLUSHES,
  lips: LIPS,
  faceDeco: FACE_DECOS,
}

/** The look a body preset starts with. */
export function bodyDefaults(g: BodyType): BodyLook {
  const face = { eyeColor: 0, eyeSize: 1, eyelid: 0, lashes: 0, shine: 0, browColor: 0, lips: 0, faceDeco: 0 }
  return g === 'm'
    ? { height: 2, build: 1, faceShape: 1, brows: 1, nose: 0, mouth: 0, beard: 0, marks: 0, blush: 1, ...face }
    : { height: 2, build: 1, faceShape: 0, brows: 0, nose: 0, mouth: 0, beard: 0, marks: 0, blush: 2, ...face }
}

const intIn = (v: unknown, n: number): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n ? v : undefined)

/** Resolved body fields of a look (missing or bad values → preset default). */
export function bodyOf(look: Partial<AvatarLook> | null | undefined): BodyLook {
  const l = (look ?? {}) as Record<string, unknown>
  const d = bodyDefaults(l.gender === 'm' ? 'm' : 'f')
  const out = { ...d }
  for (const k of BODY_KEYS) out[k] = intIn(l[k], BODY_OPTIONS[k].length) ?? d[k]
  return out
}

/** Fill in / clamp the body fields of a look (old saves, remote players). */
export function normalizeBody<T extends Partial<AvatarLook>>(look: T): T & BodyLook {
  const out = { ...look, ...bodyOf(look) } as T & BodyLook
  // first body-options build stored rosy cheeks as marks 4; that's blush 3 now
  const raw = look as Partial<AvatarLook>
  if (raw.marks === 4 && raw.blush === undefined) {
    out.marks = 0
    out.blush = 3
  }
  const face = (look as { face?: unknown }).face
  ;(out as { face?: number }).face = intIn(face, EYE_COUNT) ?? 0
  return out
}

/**
 * Switching body preset: features still on the old preset's defaults follow
 * the new preset, anything the player picked by hand stays.
 */
export function switchGender(look: AvatarLook, g: BodyType): Partial<AvatarLook> {
  const cur = bodyOf(look)
  const from = bodyDefaults(look.gender)
  const to = bodyDefaults(g)
  const patch: Partial<AvatarLook> = { gender: g }
  for (const k of BODY_KEYS) if (cur[k] === from[k]) (patch as Record<string, number>)[k] = to[k]
  // no beard on the girl preset unless it was picked by hand after the switch
  return patch
}

// ---------------------------------------------------------------------------
// Reshape plans (pure; used by both renderers and unit-tested)

/** Height offsets in rows for the world sprite / HD doll, by HEIGHTS index. */
export const SPRITE_HEIGHT = [-2, -1, 0, 1] as const
export const DOLL_HEIGHT = [-4, -2, 0, 2] as const

export interface ReshapePlan {
  /** Source frame size. */
  w: number
  h: number
  /** Output height (feet stay on the bottom row). */
  outH: number
  /** Columns added (+) or removed (−) per side, by source row. */
  widen: (y: number) => number
  /** Left / right seam columns: content left of `xl` and right of `xr` moves out. */
  xl: number
  xr: number
  /** Sides that widen (side views only grow forward). */
  left: boolean
  right: boolean
  /** Rows to duplicate (+n) or drop (−n), in source rows. */
  rows: { at: number; n: number }[]
}

/** Source column for output column x of a row widened by n (−1 = empty). */
export function srcCol(x: number, n: number, xl: number, xr: number, w: number, left = true, right = true): number {
  const nl = left ? n : 0
  const nr = right ? n : 0
  let s: number
  if (x <= xl) {
    s = nl >= 0 ? (x <= xl - nl ? x + nl : xl) : x + nl
  } else if (x >= xr) {
    s = nr >= 0 ? (x >= xr + nr ? x - nr : xr) : x - nr
  } else s = x
  return s >= 0 && s < w ? s : -1
}

/** Source rows of the output frame, bottom-aligned (−1 = empty row). */
export function srcRows(h: number, outH: number, ops: { at: number; n: number }[]): number[] {
  const list: number[] = []
  const sorted = ops.filter((o) => o.n !== 0)
  for (let y = 0; y < h; y++) {
    const op = sorted.find((o) => o.at === y)
    if (op && op.n < 0) continue
    // a removal run covers rows at .. at+|n|-1
    if (sorted.some((o) => o.n < 0 && y > o.at && y < o.at - o.n)) continue
    list.push(y)
    if (op && op.n > 0) for (let i = 0; i < op.n; i++) list.push(y)
  }
  const out: number[] = new Array(outH).fill(-1)
  for (let i = 0; i < outH; i++) {
    const j = list.length - (outH - i)
    out[i] = j >= 0 ? list[j] : -1
  }
  return out
}

/** Flat source index for every output pixel (−1 = transparent). */
export function reshapeIndex(p: ReshapePlan): Int32Array {
  const rows = srcRows(p.h, p.outH, p.rows)
  const out = new Int32Array(p.w * p.outH).fill(-1)
  for (let y = 0; y < p.outH; y++) {
    const sy = rows[y]
    if (sy < 0) continue
    const n = p.widen(sy)
    for (let x = 0; x < p.w; x++) {
      const sx = n ? srcCol(x, n, p.xl, p.xr, p.w, p.left, p.right) : x
      if (sx >= 0) out[y * p.w + x] = sy * p.w + sx
    }
  }
  return out
}

/** True when a plan changes nothing (skip the copy). */
export function planIsIdentity(p: ReshapePlan, rowsFrom: number): boolean {
  if (p.outH !== p.h || p.rows.some((r) => r.n)) return false
  for (let y = rowsFrom; y < p.h; y++) if (p.widen(y)) return false
  return true
}

/**
 * Extra columns per side for a body region. Boys have broader shoulders
 * (torso + arms one pixel wider); sturdy adds another pixel on the torso,
 * chubby widens everything below the neck, slim takes a pixel off (the tiny
 * world sprite has no pixel to spare, so there slim only undoes the boy's extra).
 */
export function bodyWiden(g: BodyType, build: number, region: 'torso' | 'legs', target: 'doll' | 'sprite'): number {
  let n = 0
  if (region === 'torso') {
    if (g === 'm') n++
    if (build === 3) n++
  }
  if (build === 2) n++
  if (build === 0 && (target === 'doll' || (region === 'torso' && g === 'm'))) n--
  return n
}
