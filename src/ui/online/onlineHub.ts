// Game glue for online play: publishes your presence, turns incoming
// chat / emotes / สาธุ / gifts / pokes / trades into game effects, and
// offers the actions the online UI calls. Works through the `net` facade, so
// it can be installed at startup before any transport is ready.

import { game, level, mutate, type GameState } from '../../game/state'
import { addMerit, track } from '../../game/actions'
import { notify, toast } from '../../game/events'
import { dayKey } from '../../game/time'
import { ITEM_BY_ID } from '../../game/data/items'
import { COLLECTIBLE_BY_ID } from '../../game/data/collectibles'
import { addToCollection, removeFromCollection } from '../../game/collectibles'
import { AREA_BY_ID, type AreaId } from '../../game/data/areas'
import { PLACE_BY_ID } from '../../game/data/places'
import { placeAccess } from '../../game/homeland'
import { sfx, haptic } from '../../engine/audio'
import { lookKey } from '../../art/avatar'
import { net, type NetMessage, type NetPlayer, type NetTopic } from '../../services/net'
import { rollOnlineDay } from '../../services/netState'
import {
  NET_LIMITS,
  cleanChat,
  giftValue,
  giftable,
  newToken,
  parseChat,
  parseEmote,
  parseGift,
  parsePing,
  parseSathu,
  type Emote,
  type TradeLine,
} from '../../services/netValidate'
import { parseTradeMsg, tradeActive, tradeStep, type TradeInput } from '../../services/netTrade'
import { activity, goTemple, mapId, mode, prayStage } from '../store'
import { worldScene } from '../TempleView'
import { hasMap } from '../../scenes/maps'
import { isAreaUnlocked, setArea } from '../../game/actions'
import {
  BUBBLE_MS,
  EMOTE_INFO,
  EMOTE_MS,
  bubbles,
  cardPeer,
  chatLog,
  emotes,
  giftFor,
  muted,
  netSummary,
  pushChat,
  trade,
  tradeOpen,
} from './onlineStore'

// ---------------------------------------------------------------------------
// Helpers

const now = () => Date.now()

function withDay(fn: (d: GameState) => void) {
  mutate((d) => {
    d.online = rollOnlineDay(d.online, dayKey())
    fn(d)
  })
}

function todays(s: GameState = game.value) {
  return rollOnlineDay(s.online, dayKey())
}

/** Players on the map you are standing on. */
export function playersHere(): NetPlayer[] {
  const sc = mode.value === 'world' ? worldScene() : null
  return sc ? net.players(sc.map.id) : []
}

export function findPlayer(id: string): NetPlayer | null {
  return net.player?.(id) ?? null
}

function nameOf(id: string): string {
  return findPlayer(id)?.name ?? 'ผู้เล่น'
}

/** Short Thai name of a map for lists ("วัดศรีบุญดี", "ตลาดนัดจตุจักร · ข้างใน"). */
export function mapLabel(id: string): string {
  if (!id) return 'ไม่ได้อยู่ในแผนที่'
  const [base, room] = id.split(':')
  const name = PLACE_BY_ID[base]?.name ?? AREA_BY_ID[base as AreaId]?.name ?? base
  return room ? `${name} · ข้างใน` : name
}

/** Per-key cooldowns (ms timestamps). */
const cool = new Map<string, number>()
function cooled(key: string, ms: number): boolean {
  const t = cool.get(key) ?? 0
  if (now() < t) return false
  cool.set(key, now() + ms)
  return true
}

/** Incoming rate limit: at most `n` events per `ms` per key. */
const rate = new Map<string, number[]>()
function allow(key: string, n: number, ms: number): boolean {
  const t = now()
  const list = (rate.get(key) ?? []).filter((x) => t - x < ms)
  if (list.length >= n) {
    rate.set(key, list)
    return false
  }
  list.push(t)
  rate.set(key, list)
  return true
}

// ---------------------------------------------------------------------------
// Chat and emotes

/** Thai names of the online topics (for "this room doesn't allow …" notes). */
export const TOPIC_LABEL: Record<NetTopic, string> = {
  chat: 'แชท',
  emote: 'อีโมต',
  sathu: 'สาธุ',
  fair: 'เกมงานวัด',
  dance: 'เต้น',
  gift: 'ของขวัญ',
  trade: 'แลกของ',
  ping: 'ทักทาย',
}

/** Connected, visible, and (when given) allowed to send on this topic. */
export function canTalk(topic?: NetTopic): boolean {
  return net.online() && !game.value.online.hidden && !(topic && net.denied?.().includes(topic))
}

/** Send a chat line (cleaned and filtered). Returns false when nothing was sent. */
export function sendChat(raw: string): boolean {
  const text = cleanChat(raw)
  if (!text || !canTalk('chat')) return false
  if (!allow('chat-out', 3, 5000)) {
    toast('พิมพ์ช้าลงหน่อยนะ ใจเย็น ๆ', 'info', 'info')
    return false
  }
  if (net.denied?.().includes('chat')) {
    toast('ห้องนี้ยังไม่เปิดให้แชท', 'lock', 'warn')
    return false
  }
  net.send('chat', { text })
  bubbles.set('me', { text, at: now(), until: now() + BUBBLE_MS })
  pushChat({ from: 'me', name: game.value.player.name, text, at: now() })
  sfx.click()
  return true
}

export function sendEmote(e: Emote): boolean {
  if (!canTalk('emote') || !cooled('emote', 900)) return false
  net.send('emote', { e })
  showEmote('me', e)
  pushChat({ from: 'me', name: game.value.player.name, text: EMOTE_INFO[e].label, at: now(), emote: e })
  return true
}

function showEmote(key: string, e: Emote) {
  const t = now()
  emotes.set(key, { e, at: t, until: t + EMOTE_MS })
  const sc = worldScene()
  if (!sc) return
  const pos = key === 'me' ? [sc.player.x, sc.player.y] : sc.remoteWorldPos?.(key)
  if (!pos) return
  const [x, y] = pos
  if (e === 'heart') sc.particles.hearts(x, y - 26, 4)
  else if (e === 'sathu' || e === 'wai') sc.particles.sparkles(x, y - 24, 6, '#fff3a6', 8)
  else if (e === 'dance') sc.particles.sparkles(x, y - 14, 5, '#ffd1dc', 10)
  if (key === 'me') {
    // Emotes face the camera.
    if (!sc.player.moving) sc.player.facing = 'down'
    if (e === 'heart') sfx.sparkle()
    else if (e === 'sathu' || e === 'wai') sfx.chime()
    else sfx.tap()
  }
}

function onChat(m: NetMessage<unknown>) {
  if (m.me || muted.value.has(m.from)) return
  const d = parseChat(m.data)
  if (!d || !allow(`chat:${m.from}`, 4, 6000)) return
  const p = playersHere().find((x) => x.id === m.from)
  if (!p) return
  bubbles.set(m.from, { text: d.text, at: now(), until: now() + BUBBLE_MS })
  pushChat({ from: m.from, name: p.name, text: d.text, at: now() })
  sfx.click()
}

function onEmote(m: NetMessage<unknown>) {
  if (m.me || muted.value.has(m.from)) return
  const d = parseEmote(m.data)
  if (!d || !allow(`emote:${m.from}`, 4, 5000)) return
  const p = playersHere().find((x) => x.id === m.from)
  if (!p) return
  showEmote(m.from, d.e)
  pushChat({ from: m.from, name: p.name, text: EMOTE_INFO[d.e].label, at: now(), emote: d.e })
}

// ---------------------------------------------------------------------------
// สาธุ (both sides earn a little merit)

export function sathuReady(peer: string): boolean {
  return (cool.get(`sathu:${peer}`) ?? 0) <= now()
}

export function sendSathu(peer: string): boolean {
  if (!canTalk('sathu')) return false
  if (!cooled(`sathu:${peer}`, 30_000)) {
    toast('เพิ่งสาธุให้คนนี้ไป รอสักครู่นะ', 'wai', 'info')
    return false
  }
  net.send('sathu', { to: peer })
  showEmote('me', 'sathu')
  const earn = todays().sathuOut < NET_LIMITS.sathuInDaily
  withDay((d) => (d.online.sathuOut += 1))
  track('sathu')
  const got = earn ? addMerit(2, { key: 'net_sathu', free: 10 }) : 0
  toast(got ? `สาธุให้${nameOf(peer)} อนุโมทนาบุญ +${got} บุญ` : `สาธุให้${nameOf(peer)}แล้ว`, 'wai')
  return true
}

function onSathu(m: NetMessage<unknown>) {
  if (m.me) return
  const d = parseSathu(m.data)
  if (!d || !allow(`sathu:${m.from}`, 3, 10_000)) return
  if (!muted.value.has(m.from) && playersHere().some((x) => x.id === m.from)) showEmote(m.from, 'sathu')
  if (d.to !== net.selfId?.() || muted.value.has(m.from)) return
  const earn = todays().sathuIn < NET_LIMITS.sathuInDaily && allow(`sathu-merit:${m.from}`, 1, 30_000)
  if (!earn) return
  withDay((dd) => (dd.online.sathuIn += 1))
  const got = addMerit(1, { key: 'net_sathu_in', free: 10 })
  sfx.chime()
  haptic(20)
  toast(`${nameOf(m.from)} สาธุให้คุณ 🙏 +${got} บุญ`, 'wai')
}

// ---------------------------------------------------------------------------
// ทักทาย (a poke across maps)

export function sendWave(peer: string): boolean {
  if (!canTalk('ping')) return false
  if (!cooled(`wave:${peer}`, 15_000)) {
    toast('เพิ่งทักไป รอเขาตอบก่อนนะ', 'info', 'info')
    return false
  }
  net.send('ping', { to: peer, w: 'wave' })
  sfx.tap()
  toast(`ทักทาย${nameOf(peer)}แล้ว 👋`, 'friends')
  return true
}

function onPing(m: NetMessage<unknown>) {
  if (m.me || muted.value.has(m.from)) return
  const d = parsePing(m.data)
  if (!d || d.to !== net.selfId?.() || !allow(`ping:${m.from}`, 1, 15_000)) return
  const p = findPlayer(m.from)
  if (!p) return
  sfx.chime()
  toast(`👋 ${p.name} ทักทายคุณ (อยู่ที่${mapLabel(p.map)})`, 'friends', 'info')
}

// ---------------------------------------------------------------------------
// Gifts: escrow on send, handed over on receipt (capped), refunded on refusal / timeout

const pendingGifts = new Map<string, { peer: string; id: string; n: number; at: number }>()
const seenGifts = new Set<string>()
const GIFT_TIMEOUT = 20_000

export function giftsLeftToday(): number {
  return Math.max(0, NET_LIMITS.giftsOutDaily - todays().giftsOut - pendingGifts.size)
}

/** Can this item be gifted in this amount? Returns a Thai reason when not. */
export function giftProblem(id: string, n: number): string | null {
  if (!giftable(id)) return 'ของชิ้นนี้ส่งเป็นของขวัญไม่ได้'
  if (n < 1 || n > NET_LIMITS.giftQty) return `ส่งได้ครั้งละ 1–${NET_LIMITS.giftQty} ชิ้น`
  if (giftValue(id, n) > NET_LIMITS.giftValue) return `ของขวัญต่อครั้งมูลค่าไม่เกิน ${NET_LIMITS.giftValue} คอยน์`
  if ((game.value.inventory[id] ?? 0) < n) return 'ของในกระเป๋าไม่พอ'
  if (giftsLeftToday() <= 0) return 'วันนี้ส่งของขวัญครบแล้ว พรุ่งนี้ส่งได้อีกนะ'
  return null
}

export function sendGift(peer: string, id: string, n: number): boolean {
  if (!canTalk('gift')) return false
  const bad = giftProblem(id, n)
  if (bad) {
    toast(bad, 'gift', 'warn')
    return false
  }
  const gid = newToken(10)
  mutate((d) => {
    d.inventory[id] = (d.inventory[id] ?? 0) - n
    if (d.inventory[id] <= 0) delete d.inventory[id]
  })
  pendingGifts.set(gid, { peer, id, n, at: now() })
  net.send('gift', { t: 'offer', to: peer, gid, id, n })
  sfx.whoosh()
  toast(`กำลังส่ง${ITEM_BY_ID[id].name} ×${n} ให้${nameOf(peer)}…`, 'gift', 'info')
  return true
}

function refundGift(gid: string, why: string) {
  const g = pendingGifts.get(gid)
  if (!g) return
  pendingGifts.delete(gid)
  mutate((d) => {
    d.inventory[g.id] = (d.inventory[g.id] ?? 0) + g.n
  })
  toast(`${why} คืน${ITEM_BY_ID[g.id]?.name ?? 'ของ'}ให้แล้ว`, 'gift', 'warn')
}

const GIFT_WHY: Record<string, string> = {
  cap: 'อีกฝ่ายรับของขวัญวันนี้ครบแล้ว',
  value: 'ของขวัญมีมูลค่าเกินกำหนด',
  unknown: 'อีกฝ่ายรับของชิ้นนี้ไม่ได้',
  off: 'อีกฝ่ายปิดรับของขวัญอยู่',
}

function onGift(m: NetMessage<unknown>) {
  if (m.me) return
  const d = parseGift(m.data)
  const self = net.selfId?.()
  if (!d || d.to !== self) return
  if (d.t === 'ack') {
    const g = pendingGifts.get(d.gid)
    if (!g || g.peer !== m.from) return
    if (!d.ok) return refundGift(d.gid, GIFT_WHY[d.why ?? 'unknown'] ?? 'ส่งไม่สำเร็จ')
    pendingGifts.delete(d.gid)
    withDay((dd) => (dd.online.giftsOut += 1))
    sfx.purchase()
    toast(`ส่ง${ITEM_BY_ID[g.id]?.name} ×${g.n} ให้${nameOf(m.from)}แล้ว 🎁`, 'gift')
    return
  }
  // An offer to us: validate, cap, hand over once.
  const key = `${m.from}:${d.gid}`
  if (seenGifts.has(key)) return
  seenGifts.add(key)
  const reply = (ok: boolean, why?: string) => net.send('gift', { t: 'ack', to: m.from, gid: d.gid, ok, ...(why ? { why } : {}) })
  const sender = findPlayer(m.from)
  if (!sender || muted.value.has(m.from) || !allow(`gift:${m.from}`, 3, 60_000)) return reply(false, 'off')
  if (giftValue(d.id, d.n) > NET_LIMITS.giftValue) return reply(false, 'value')
  if (todays().giftsIn >= NET_LIMITS.giftsInDaily) return reply(false, 'cap')
  withDay((dd) => {
    dd.online.giftsIn += 1
    dd.inventory[d.id] = (dd.inventory[d.id] ?? 0) + d.n
  })
  reply(true)
  sfx.coins(3)
  notify({ kind: 'reward', title: `${sender.name} ส่งของขวัญให้!`, merit: 0, coins: 0, items: { [d.id]: d.n }, note: 'ของขวัญจากผู้เล่นจริงที่ออนไลน์อยู่ อย่าลืมขอบคุณเขานะ' })
}

// ---------------------------------------------------------------------------
// Trades

function owns(lines: TradeLine[], s: GameState = game.value): boolean {
  return lines.every((l) =>
    l.k === 'item' ? (s.inventory[l.id] ?? 0) >= l.n : COLLECTIBLE_BY_ID[l.id]?.tradeable !== false && (s.collection.owned[l.id] ?? 0) >= l.n,
  )
}

function give(d: GameState, lines: TradeLine[]) {
  for (const l of lines) {
    if (l.k === 'item') d.inventory[l.id] = (d.inventory[l.id] ?? 0) + l.n
    else addToCollection(d, l.id, l.n)
  }
}

function take(d: GameState, lines: TradeLine[]) {
  for (const l of lines) {
    if (l.k === 'item') {
      d.inventory[l.id] = Math.max(0, (d.inventory[l.id] ?? 0) - l.n)
      if (!d.inventory[l.id]) delete d.inventory[l.id]
    } else removeFromCollection(d, l.id, l.n)
  }
}

export function lineName(l: TradeLine): string {
  return l.k === 'item' ? ITEM_BY_ID[l.id]?.name ?? l.id : COLLECTIBLE_BY_ID[l.id]?.name ?? l.id
}

/** Feed an input into the trade machine and apply what it asks for. */
export function tradeDo(input: TradeInput) {
  const res = tradeStep(trade.value, input, {
    now: now(),
    owns: (l) => owns(l),
    canReceive: () => todays().trades < NET_LIMITS.tradesDaily,
  })
  trade.value = res.s
  for (const msg of res.send) net.send('trade', msg)
  for (const fx of res.fx) {
    if (fx.kind === 'escrow') mutate((d) => take(d, fx.lines))
    else if (fx.kind === 'refund' && fx.lines.length) mutate((d) => give(d, fx.lines))
    else if (fx.kind === 'receive') {
      withDay((d) => {
        give(d, fx.lines)
        d.online.trades += 1
      })
      const cols = fx.lines.filter((l) => l.k === 'collectible').reduce((a, l) => a + l.n, 0)
      track('trade')
      if (cols) track('collectible', cols)
      // The trade window shows what changed hands.
      sfx.purchase()
      haptic(30)
      tradeOpen.value = true
    } else if (fx.kind === 'incoming') {
      sfx.chime()
      haptic(20)
      tradeOpen.value = true
    }
  }
  if (res.s.phase === 'closed' && trade.value === res.s && res.s.reason) {
    const why: Record<string, string> = {
      declined: 'อีกฝ่ายไม่สะดวกแลกตอนนี้',
      busy: 'อีกฝ่ายกำลังแลกกับคนอื่นอยู่',
      cancelled: 'ยกเลิกการแลกแล้ว',
      they_cancelled: 'อีกฝ่ายยกเลิกการแลก',
      timeout: 'หมดเวลาแลกของ',
      gone: 'อีกฝ่ายออฟไลน์ไปแล้ว',
      not_owned: 'ของที่เสนอไม่อยู่ในกระเป๋าแล้ว',
      cap: 'วันนี้แลกของครบแล้ว',
    }
    if (input.kind !== 'reset') toast(why[res.s.reason] ?? 'การแลกจบแล้ว', 'market', 'info')
  }
}

export function startTrade(peer: string) {
  if (!canTalk('trade')) return
  if (tradeActive(trade.value)) {
    tradeOpen.value = true
    return
  }
  if (todays().trades >= NET_LIMITS.tradesDaily) {
    toast('วันนี้แลกของครบแล้ว พรุ่งนี้มาใหม่นะ', 'market', 'warn')
    return
  }
  tradeDo({ kind: 'request', peer, tid: newToken(12) })
  tradeOpen.value = true
}

function onTrade(m: NetMessage<unknown>) {
  if (m.me) return
  const msg = parseTradeMsg(m.data)
  if (!msg || msg.to !== net.selfId?.() || !allow(`trade:${m.from}`, 20, 10_000)) return
  if (msg.t === 'req' && (muted.value.has(m.from) || !findPlayer(m.from))) {
    net.send('trade', { t: 'decline', tid: msg.tid, to: m.from, why: 'no' })
    return
  }
  tradeDo({ kind: 'recv', from: m.from, msg })
}

// ---------------------------------------------------------------------------
// Friends met online

export function isOnlineFriend(code: string | null | undefined): boolean {
  return !!code && game.value.online.friends.some((f) => f.code === code)
}

export function addOnlineFriend(p: NetPlayer): boolean {
  const code = p.friendCode
  if (!code || code === game.value.player.friendCode || isOnlineFriend(code)) return false
  mutate((d) => {
    d.online.friends = [...d.online.friends, { code, name: p.name, at: now() }].slice(-100)
  })
  sfx.sparkle()
  toast(`เพิ่ม${p.name}เป็นเพื่อนสายบุญแล้ว!`, 'friends')
  return true
}

export function toggleMute(peer: string) {
  const next = new Set(muted.value)
  if (next.has(peer)) next.delete(peer)
  else next.add(peer)
  muted.value = next
  if (next.has(peer)) {
    bubbles.delete(peer)
    chatLog.value = chatLog.value.filter((l) => l.from !== peer)
  }
}

// ---------------------------------------------------------------------------
// ไปหา: travel to another player's map

export type GoResult = 'here' | 'ok' | 'locked' | 'unknown'

export function goToPlayerMap(map: string): GoResult {
  const sc = mode.value === 'world' ? worldScene() : null
  if (sc && sc.map.id === map) return 'here'
  const base = map.split(':')[0]
  const inside = mode.value === 'world' && sc && sc.map.id.split(':')[0] === base
  if (inside && hasMap(map)) {
    sfx.whoosh()
    mapId.value = map
    return 'ok'
  }
  const a = AREA_BY_ID[base as AreaId]
  const p = PLACE_BY_ID[base]
  if (p?.home || (a && !p)) {
    if (!isAreaUnlocked(base as AreaId)) return 'locked'
    sfx.whoosh()
    setArea(base as AreaId)
    goTemple(base as AreaId, null)
    return 'ok'
  }
  if (p) {
    if (!placeAccess(game.value, p.id).open) return 'locked'
    sfx.whoosh()
    goTemple(p.scene, p.id)
    return 'ok'
  }
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Publishing our own presence

const DOING: Partial<Record<string, string>> = {
  alms: 'กำลังตักบาตร',
  chant: 'กำลังสวดมนต์',
  meditate: 'กำลังนั่งสมาธิ',
  wish: 'กำลังอธิษฐาน',
  siamsi: 'กำลังเสี่ยงเซียมซี',
  holy_water: 'กำลังตักน้ำมนต์',
  deity: 'กำลังไหว้ขอพร',
  lottery: 'กำลังขูดเลข',
  koi: 'กำลังให้อาหารปลา',
  dog: 'กำลังเล่นกับน้องหมา',
  bells: 'กำลังตีระฆัง',
  gold_leaf: 'กำลังปิดทอง',
  donate: 'กำลังทำบุญ',
  dedicate: 'กำลังกรวดน้ำ',
  krathong: 'กำลังลอยกระทง',
  circle: 'กำลังเวียนเทียน',
  hall: 'กำลังไหว้พระในโบสถ์',
  job: 'กำลังทำงานพิเศษ',
  cook: 'กำลังทำอาหาร',
  fair: 'กำลังเล่นเกมงานวัด',
  hub: 'กำลังดูบอร์ดตลาด',
}

let lastDoing: string | null | undefined
let lastKey = ''

function publish() {
  if (net.kind() === 'offline') return
  const s = game.value
  const sc = mode.value === 'world' ? worldScene() : null
  const patch: Parameters<typeof net.setMe>[0] & { hidden?: boolean } = {
    name: s.player.name,
    level: level.value.level,
    look: s.player.look,
    pet: s.pet,
    map: sc ? sc.map.id : '',
    friendCode: s.player.friendCode,
    province: s.online.shareProvince ? s.homeland.province : null,
    hidden: s.online.hidden,
  }
  if (sc) {
    patch.x = Math.round(sc.player.x * 10) / 10
    patch.y = Math.round(sc.player.y * 10) / 10
    patch.face = sc.player.facing
    patch.moving = sc.player.moving
  }
  const key = JSON.stringify(patch)
  if (key !== lastKey) {
    lastKey = key
    net.setMe(patch)
  }
  const doing = prayStage.value
    ? 'กำลังสวดมนต์'
    : mode.value === 'house'
      ? 'พักอยู่ที่บ้าน'
      : mode.value === 'arrival'
        ? 'กำลังเดินทาง'
        : activity.value
          ? DOING[activity.value.id] ?? null
          : null
  if (doing !== lastDoing) {
    lastDoing = doing
    net.setMe({ doing })
  }
}

let lastSummary = ''

function summarize() {
  const sc = mode.value === 'world' ? worldScene() : null
  const all = net.everyone()
  const here = sc ? net.players(sc.map.id).length : 0
  const kind = net.kind()
  const status = net.status?.() ?? 'offline'
  const denied = net.denied?.() ?? []
  // Re-render lists only when who / where / what changed (not on every step someone takes).
  const key = `${kind}|${status}|${here}|${denied.join(',')}|${all.map((p) => `${p.id}:${p.name}:${p.level}:${p.map}:${p.doing ?? ''}:${p.accountName ?? ''}:${p.pet ?? ''}:${lookKey(p.look)}`).join(';')}`
  if (key !== lastSummary) {
    lastSummary = key
    netSummary.value = { kind, status, count: all.length, here, denied, rev: netSummary.value.rev + 1 }
  }
  // The host refused a topic for this viewer (e.g. view-only access): say so once, undo what can't finish.
  const fresh = denied.filter((t) => !deniedSeen.has(t))
  if (fresh.length) {
    for (const t of fresh) deniedSeen.add(t)
    toast(`ห้องนี้ให้คุณดูได้อย่างเดียวสำหรับ${fresh.map((t) => TOPIC_LABEL[t]).join(' ')} เจ้าของเกมเปิดสิทธิ์ให้ได้`, 'lock', 'warn')
    // What we showed optimistically never reached anyone: take it back.
    if (fresh.includes('chat')) {
      bubbles.delete('me')
      chatLog.value = chatLog.value.filter((l) => l.from !== 'me' || !!l.emote)
    }
    if (fresh.includes('emote')) {
      emotes.delete('me')
      chatLog.value = chatLog.value.filter((l) => l.from !== 'me' || !l.emote)
    }
    if (fresh.includes('gift')) for (const gid of [...pendingGifts.keys()]) refundGift(gid, 'ส่งของขวัญในห้องนี้ไม่ได้')
    if (fresh.includes('trade') && tradeActive(trade.value)) tradeDo({ kind: 'gone', peer: trade.value.peer ?? '' })
  }
  // A trade partner who vanished for good ends the trade.
  const t = trade.value
  if (tradeActive(t) && t.peer && !findPlayer(t.peer)) {
    goneSince ??= now()
    if (now() - goneSince > 6000) tradeDo({ kind: 'gone', peer: t.peer })
  } else goneSince = null
  // The open card follows its player; close it when they leave.
  if (cardPeer.value && !findPlayer(cardPeer.value)) cardPeer.value = null
  if (giftFor.value && !findPlayer(giftFor.value)) giftFor.value = null
}

let goneSince: number | null = null
const deniedSeen = new Set<NetTopic>()
let installed = false

/** Wire online play into the game (idempotent). */
export function installOnline() {
  if (installed) return
  installed = true
  net.on('chat', onChat)
  net.on('emote', onEmote)
  net.on('sathu', onSathu)
  net.on('ping', onPing)
  net.on('gift', onGift)
  net.on('trade', onTrade)
  let queued = false
  net.onChange(() => {
    if (queued) return
    queued = true
    setTimeout(() => {
      queued = false
      summarize()
    }, 120)
  })
  setInterval(publish, 100)
  setInterval(() => {
    // Gift escrow timeouts, trade timeouts, a periodic summary refresh.
    for (const [gid, g] of pendingGifts) if (now() - g.at > GIFT_TIMEOUT) refundGift(gid, 'อีกฝ่ายไม่ตอบรับ')
    if (tradeActive(trade.value)) tradeDo({ kind: 'tick' })
    for (const [k, b] of bubbles) if (now() > b.until) bubbles.delete(k)
    for (const [k, e] of emotes) if (now() > e.until) emotes.delete(k)
    summarize()
  }, 1000)
  // Going to another map clears the chat of the old one.
  let lastMap = ''
  setInterval(() => {
    const sc = mode.value === 'world' ? worldScene() : null
    const m = sc?.map.id ?? ''
    if (m !== lastMap) {
      lastMap = m
      chatLog.value = []
      for (const k of [...bubbles.keys()]) if (k !== 'me') bubbles.delete(k)
    }
  }, 500)
}
