// Validation for everything that arrives from other players (presence and
// event payloads). All of it is UNTRUSTED: shapes are checked, numbers are
// clamped, strings are cut and cleaned of control / invisible characters,
// and ids are re-checked against the game's own catalogues (unknown → the
// default). The UI renders the results as text only (textContent / canvas).

import type { AvatarLook } from '../art/avatar'
import { DEFAULT_LOOK } from '../art/avatar'
import { HAIR_COLORS, SKIN_TONES } from '../art/palette'
import { OUTFIT_BY_ID, type Slot } from '../game/data/outfits'
import { PET_BY_ID } from '../game/data/pets'
import { PROVINCE_BY_ID } from '../game/data/provinces'
import { ITEM_BY_ID } from '../game/data/items'
import { COLLECTIBLE_BY_ID } from '../game/data/collectibles'
import type { NetPlayer } from './net'

export const NET_LIMITS = {
  name: 24,
  chat: 60,
  doing: 32,
  map: 48,
  /** Coordinates are clamped to this box (maps are much smaller). */
  coord: 4096,
  level: 999,
  /** Lines in one trade offer and units per line. */
  tradeLines: 6,
  tradeQty: 20,
  /** A single gift: units and total shop value. */
  giftQty: 5,
  giftValue: 60,
  /** Gifts accepted / sent per day, trades per day, merit-giving สาธุ per day. */
  giftsInDaily: 8,
  giftsOutDaily: 8,
  tradesDaily: 20,
  sathuInDaily: 10,
} as const

export type Face = NetPlayer['face']
export const FACES: Face[] = ['up', 'down', 'left', 'right']

const FACE_COUNT = 6

// ---------------------------------------------------------------------------
// Text

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Clean untrusted text: drop control, format (zero-width, bidi), private-use
 * and unassigned characters (keeping single emoji joiners), cap stacked
 * combining marks, collapse whitespace and cut to `max` UTF-16 units
 * without splitting a surrogate pair.
 */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  let s = v.length > max * 4 ? v.slice(0, max * 4) : v
  s = s
    .replace(/[\p{Cc}\p{Co}\p{Cn}]/gu, ' ')
    .replace(/(?!‍)\p{Cf}/gu, '')
    .replace(/‍{2,}/g, '‍')
    .replace(/(\p{M}{3})\p{M}+/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length > max) {
    s = s.slice(0, max)
    if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1)
    s = s.trim()
  }
  return s
}

// A small, family-friendly filter (Thai and English). Letters may be split
// by spaces, dots or dashes, and repeated; matches become ***.
const BAD_WORDS = [
  'เหี้ย', 'เหี่ย', 'เชี่ย', 'ควย', 'เย็ด', 'สัส', 'ไอ้สัตว์', 'อีสัตว์', 'สัตว์นรก', 'อีดอก', 'ดอกทอง', 'ส้นตีน', 'ระยำ', 'จัญไร',
  'หน้าหี', 'กะหรี่', 'แม่มึง', 'พ่อมึง', 'ไอ้เวร', 'อีเวร', 'ไอ้ควาย', 'อีควาย', 'ชาติหมา', 'มึงตาย',
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'asshole', 'bastard', 'whore', 'slut', 'nigger', 'nigga', 'retard',
]

const LEET: Record<string, string> = { a: '[a@4]', e: '[e3]', i: '[i1!|]', o: '[o0]', s: '[s$5]', u: '[uv*]', t: '[t7]' }
const SEP = '[\\s._\\-*~]*'

function wordPattern(w: string): string {
  return Array.from(w)
    .map((ch) => `${LEET[ch] ?? ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}+`)
    .join(SEP)
}

const BAD_RE = new RegExp(BAD_WORDS.map(wordPattern).join('|'), 'giu')

export function filterProfanity(s: string): string {
  return s.replace(BAD_RE, '***')
}

export function hasProfanity(s: string): boolean {
  BAD_RE.lastIndex = 0
  const hit = BAD_RE.test(s)
  BAD_RE.lastIndex = 0
  return hit
}

/** Clean + filter a chat line; null when nothing is left. */
export function cleanChat(v: unknown): string | null {
  const s = filterProfanity(cleanText(v, NET_LIMITS.chat))
  return s && s.replace(/[*\s]/g, '') ? s : null
}

export function cleanName(v: unknown): string | null {
  const s = filterProfanity(cleanText(v, NET_LIMITS.name))
  return s || null
}

// ---------------------------------------------------------------------------
// Ids and numbers

export function cleanMapId(v: unknown): string | null {
  return typeof v === 'string' && v.length <= NET_LIMITS.map && /^[a-z0-9][a-z0-9_-]*(:[a-z0-9][a-z0-9_-]*)?$/.test(v) ? v : null
}

/** A map id as a room name: ^[a-z0-9][a-z0-9_.-]{0,47}$ (colons become dots). */
export function roomName(mapId: string): string {
  const s = `map-${mapId.toLowerCase().replace(/:/g, '.').replace(/[^a-z0-9_.-]/g, '_')}`
  return s.slice(0, 48)
}

export function cleanCoord(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return Math.round(Math.max(0, Math.min(NET_LIMITS.coord, v)) * 10) / 10
}

export function cleanFace(v: unknown): Face {
  return FACES.includes(v as Face) ? (v as Face) : 'down'
}

export function cleanLevel(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.min(NET_LIMITS.level, Math.floor(v))) : 1
}

export function cleanPet(v: unknown): string | null {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(PET_BY_ID, v) ? v : null
}

export function cleanFriendCode(v: unknown): string | null {
  return typeof v === 'string' && /^BD-[A-Z0-9]{6}$/.test(v) ? v : null
}

export function cleanProvince(v: unknown): string | null {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(PROVINCE_BY_ID, v) ? v : null
}

/** A peer id as the transports use it (opaque, short, safe as a map key). */
export function cleanPeerId(v: unknown): string | null {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : null
}

function intIn(v: unknown, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < max ? v : fallback
}

const LOOK_SLOTS: [keyof AvatarLook, Slot][] = [
  ['hair', 'hair'],
  ['top', 'top'],
  ['bottom', 'bottom'],
  ['head', 'head'],
  ['neck', 'neck'],
  ['hand', 'hand'],
  ['shoes', 'shoes'],
  ['back', 'back'],
  ['suit', 'suit'],
]

/** Rebuild a look from untrusted data: every outfit id must exist and fit its slot. */
export function cleanLook(v: unknown): AvatarLook {
  const r = isObj(v) ? v : {}
  const out: AvatarLook = {
    ...DEFAULT_LOOK,
    gender: r.gender === 'm' ? 'm' : 'f',
    skin: intIn(r.skin, SKIN_TONES.length, DEFAULT_LOOK.skin),
    face: intIn(r.face, FACE_COUNT, 0),
    hairColor: intIn(r.hairColor, HAIR_COLORS.length, 0),
  }
  for (const [key, slot] of LOOK_SLOTS) {
    const id = r[key]
    const ok = typeof id === 'string' && Object.prototype.hasOwnProperty.call(OUTFIT_BY_ID, id) && OUTFIT_BY_ID[id].slot === slot
    ;(out as unknown as Record<string, unknown>)[key] = ok ? id : (DEFAULT_LOOK as unknown as Record<string, unknown>)[key] ?? null
  }
  return out
}

/** A look as presence data: only set slots, no nulls. */
export function encodeLook(l: AvatarLook): Record<string, string | number> {
  const out: Record<string, string | number> = { gender: l.gender, skin: l.skin, face: l.face, hairColor: l.hairColor }
  for (const [key] of LOOK_SLOTS) {
    const v = l[key]
    if (typeof v === 'string' && v) out[key] = v
  }
  return out
}

// ---------------------------------------------------------------------------
// Presence

/** What this client publishes about itself. */
export interface MeState {
  name: string
  level: number
  look: AvatarLook
  pet: string | null
  /** '' when not on a world map (at home, in menus). */
  map: string
  x: number
  y: number
  face: Face
  moving: boolean
  doing: string | null
  friendCode: string | null
  province: string | null
  /** Invisible to others (no presence published). */
  hidden: boolean
}

export function defaultMe(): MeState {
  return { name: '', level: 1, look: { ...DEFAULT_LOOK }, pet: null, map: '', x: 0, y: 0, face: 'down', moving: false, doing: null, friendCode: null, province: null, hidden: false }
}

/** Merge a NetApi.setMe patch into our own state (cleaning our own strings too). */
export function applyMePatch(me: MeState, patch: Partial<Omit<NetPlayer, 'id'>> & { hidden?: boolean }): MeState {
  const n: MeState = { ...me }
  if (patch.name !== undefined) n.name = cleanText(patch.name, NET_LIMITS.name)
  if (patch.level !== undefined) n.level = cleanLevel(patch.level)
  if (patch.look !== undefined) n.look = cleanLook(patch.look)
  if (patch.pet !== undefined) n.pet = cleanPet(patch.pet)
  if (patch.map !== undefined) n.map = patch.map === '' ? '' : cleanMapId(patch.map) ?? ''
  if (patch.x !== undefined) n.x = cleanCoord(patch.x) ?? n.x
  if (patch.y !== undefined) n.y = cleanCoord(patch.y) ?? n.y
  if (patch.face !== undefined) n.face = cleanFace(patch.face)
  if (patch.moving !== undefined) n.moving = !!patch.moving
  if (patch.doing !== undefined) n.doing = cleanText(patch.doing, NET_LIMITS.doing) || null
  if (patch.friendCode !== undefined) n.friendCode = cleanFriendCode(patch.friendCode)
  if (patch.province !== undefined) n.province = cleanProvince(patch.province)
  if (patch.hidden !== undefined) n.hidden = !!patch.hidden
  return n
}

/** Small lobby presence: enough for the "who is online everywhere" list. */
export function lobbyPresence(me: MeState): Record<string, string | number> {
  const out: Record<string, string | number> = { v: 1, n: me.name || 'ผู้เล่น', lv: me.level, m: me.map }
  if (me.friendCode) out.fc = me.friendCode
  return out
}

/** Full presence inside a map room: position, look, pet, activity. */
export function mapPresence(me: MeState): Record<string, unknown> {
  const out: Record<string, unknown> = {
    v: 1,
    n: me.name || 'ผู้เล่น',
    lv: me.level,
    m: me.map,
    lk: encodeLook(me.look),
    x: me.x,
    y: me.y,
    f: me.face,
    mv: me.moving ? 1 : 0,
  }
  if (me.pet) out.pt = me.pet
  if (me.doing) out.d = me.doing
  if (me.friendCode) out.fc = me.friendCode
  if (me.province) out.pr = me.province
  return out
}

export interface PeerInfo {
  name: string
  level: number
  map: string
  friendCode: string | null
  /** Present only in map-room presence. */
  full?: {
    look: AvatarLook
    pet: string | null
    x: number
    y: number
    face: Face
    moving: boolean
    doing: string | null
    province: string | null
  }
}

/** Parse lobby or map presence; null when it doesn't describe a player. */
export function parsePresence(raw: unknown): PeerInfo | null {
  if (!isObj(raw)) return null
  const name = cleanName(raw.n)
  const map = raw.m === '' ? '' : cleanMapId(raw.m)
  if (!name || map === null) return null
  const info: PeerInfo = { name, level: cleanLevel(raw.lv), map, friendCode: cleanFriendCode(raw.fc) }
  const x = cleanCoord(raw.x)
  const y = cleanCoord(raw.y)
  if (x !== null && y !== null && map) {
    info.full = {
      look: cleanLook(raw.lk),
      pet: cleanPet(raw.pt),
      x,
      y,
      face: cleanFace(raw.f),
      moving: raw.mv === 1 || raw.mv === true,
      doing: raw.d ? filterProfanity(cleanText(raw.d, NET_LIMITS.doing)) || null : null,
      province: cleanProvince(raw.pr),
    }
  }
  return info
}

/** Build a NetPlayer from parsed presence (falls back to a default look off-map). */
export function toNetPlayer(id: string, info: PeerInfo, extra: { guest?: boolean; accountName?: string | null } = {}): NetPlayer {
  const f = info.full
  return {
    id,
    name: info.name,
    level: info.level,
    look: f?.look ?? { ...DEFAULT_LOOK },
    pet: f?.pet ?? null,
    map: info.map,
    x: f?.x ?? 0,
    y: f?.y ?? 0,
    face: f?.face ?? 'down',
    moving: f?.moving ?? false,
    doing: f?.doing ?? null,
    friendCode: info.friendCode,
    province: f?.province ?? null,
    guest: !!extra.guest,
    accountName: extra.accountName ? cleanText(extra.accountName, 40) || null : null,
  }
}

// ---------------------------------------------------------------------------
// Event payloads

export const EMOTES = ['wai', 'heart', 'sathu', 'laugh', 'dance'] as const
export type Emote = (typeof EMOTES)[number]

export function parseChat(d: unknown): { text: string } | null {
  if (!isObj(d)) return null
  const text = cleanChat(d.text)
  return text ? { text } : null
}

export function parseEmote(d: unknown): { e: Emote } | null {
  return isObj(d) && EMOTES.includes(d.e as Emote) ? { e: d.e as Emote } : null
}

export function parseSathu(d: unknown): { to: string } | null {
  const to = isObj(d) ? cleanPeerId(d.to) : null
  return to ? { to } : null
}

export function parsePing(d: unknown): { to: string; w: 'wave' } | null {
  const to = isObj(d) ? cleanPeerId(d.to) : null
  return to ? { to, w: 'wave' } : null
}

export type GiftMsg = { t: 'offer'; to: string; gid: string; id: string; n: number } | { t: 'ack'; to: string; gid: string; ok: boolean; why?: GiftRefusal }

export type GiftRefusal = 'cap' | 'value' | 'unknown' | 'off'

export function cleanToken(v: unknown): string | null {
  return typeof v === 'string' && /^[a-z0-9]{4,24}$/.test(v) ? v : null
}

/** A gift is one shop item (inventory), a few units, worth at most NET_LIMITS.giftValue. */
export function giftValue(id: string, n: number): number {
  const it = ITEM_BY_ID[id]
  return it ? it.price * n : Infinity
}

export function giftable(id: string): boolean {
  const it = ITEM_BY_ID[id]
  return !!it && it.price > 0 && id !== 'lottery_ticket'
}

export function parseGift(d: unknown): GiftMsg | null {
  if (!isObj(d)) return null
  const to = cleanPeerId(d.to)
  const gid = cleanToken(d.gid)
  if (!to || !gid) return null
  if (d.t === 'offer') {
    const id = typeof d.id === 'string' ? d.id : ''
    const n = typeof d.n === 'number' && Number.isInteger(d.n) ? d.n : 0
    if (!giftable(id) || n < 1 || n > NET_LIMITS.giftQty) return null
    return { t: 'offer', to, gid, id, n }
  }
  if (d.t === 'ack') {
    const why = ['cap', 'value', 'unknown', 'off'].includes(d.why as string) ? (d.why as GiftRefusal) : undefined
    return { t: 'ack', to, gid, ok: d.ok === true, ...(why ? { why } : {}) }
  }
  return null
}

// ---------------------------------------------------------------------------
// Trade lines (items and collectibles)

export type TradeKind = 'item' | 'collectible'

export interface TradeLine {
  k: TradeKind
  id: string
  n: number
}

export function tradeable(k: TradeKind, id: string): boolean {
  if (k === 'item') return Object.prototype.hasOwnProperty.call(ITEM_BY_ID, id) && id !== 'lottery_ticket'
  return Object.prototype.hasOwnProperty.call(COLLECTIBLE_BY_ID, id) && COLLECTIBLE_BY_ID[id].tradeable !== false
}

/** Validate and merge offer lines: known tradeable ids, 1..tradeQty each, at most tradeLines. */
export function cleanLines(v: unknown): TradeLine[] | null {
  if (!Array.isArray(v) || v.length > NET_LIMITS.tradeLines * 2) return null
  const merged = new Map<string, TradeLine>()
  for (const raw of v) {
    if (!isObj(raw)) return null
    const k = raw.k === 'item' || raw.k === 'collectible' ? raw.k : null
    const id = typeof raw.id === 'string' ? raw.id : ''
    const n = typeof raw.n === 'number' && Number.isInteger(raw.n) ? raw.n : 0
    if (!k || !tradeable(k, id) || n < 1) return null
    const key = `${k}:${id}`
    const prev = merged.get(key)
    merged.set(key, { k, id, n: Math.min(NET_LIMITS.tradeQty, (prev?.n ?? 0) + n) })
  }
  if (merged.size > NET_LIMITS.tradeLines) return null
  return [...merged.values()]
}

/** Random short token for gift / trade ids. */
export function newToken(len = 10): string {
  const chars = 'abcdefghijkmnopqrstuvwxyz23456789'
  const b = new Uint8Array(len)
  const c = globalThis.crypto
  if (c?.getRandomValues) c.getRandomValues(b)
  else for (let i = 0; i < len; i++) b[i] = Math.floor(Math.random() * 256)
  return Array.from(b, (x) => chars[x % chars.length]).join('')
}
