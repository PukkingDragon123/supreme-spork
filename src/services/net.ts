// Real online play (shared contract). The default is OFFLINE (no-op); the
// online module installs a real transport with `setNet()`:
//  - inside the artifact viewer: the host's `room` capability
//    (everyone viewing the published game right now);
//  - on a self-hosted web build: Supabase Realtime (services/realtime*.ts)
//    when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
// Simulated crowds (services/presence.ts) remain for when nobody real is on.
//
// `net` is a stable facade: listeners registered with `net.on()` /
// `net.onChange()` before a transport is installed (or across a transport
// swap) keep working, so systems may subscribe at startup.
//
// Everything received is UNTRUSTED data from other players: render it as
// text only, clamp lengths, never execute or inject it as HTML
// (services/netValidate.ts has the validators).

import type { AvatarLook } from '../art/avatar'

/** Event topics (keep ≤ 16; the artifact declares them open to players). */
export type NetTopic = 'chat' | 'emote' | 'sathu' | 'fair' | 'dance' | 'gift' | 'trade' | 'ping'
export const NET_TOPICS: NetTopic[] = ['chat', 'emote', 'sathu', 'fair', 'dance', 'gift', 'trade', 'ping']
/** Topics heard only by players on the same map; the rest reach everyone online. */
export const MAP_TOPICS: NetTopic[] = ['chat', 'emote', 'sathu', 'fair', 'dance']

export interface NetPlayer {
  /** Stable per open game (peer id). */
  id: string
  /** In-game nickname the player chose themselves (display only). */
  name: string
  level: number
  look: AvatarLook
  pet?: string | null
  map: string
  x: number
  y: number
  face: 'up' | 'down' | 'left' | 'right'
  /** Short activity label ("กำลังปาลูกโป่ง") shown under the name. */
  doing?: string | null
  /** Invited from outside the owner's organization (display only). */
  guest?: boolean
  /** Account name vouched for by the host (artifact room only; absent when unknown). */
  accountName?: string | null
  /** In-game friend code (BD-XXXXXX) the player shares for "add friend". */
  friendCode?: string | null
  /** Home province id, when the player chose to share it. */
  province?: string | null
  /** Walking right now (for the walk animation). */
  moving?: boolean
}

export interface NetMessage<T = unknown> {
  from: string
  topic: NetTopic
  data: T
  me: boolean
}

export type NetStatus = 'offline' | 'connecting' | 'online' | 'error'

export interface NetApi {
  /** Transport name for the UI: 'room' (artifact), 'realtime' (self-hosted) or 'offline'. */
  kind(): 'room' | 'realtime' | 'offline'
  /** Connected to other real players right now. */
  online(): boolean
  /** Real players on a map (excluding you). */
  players(map: string): NetPlayer[]
  /** Everyone real online, all maps (excluding you). */
  everyone(): NetPlayer[]
  onChange(fn: () => void): () => void
  /** Update your own presence (position, map, look, activity). Coalesced by the transport. */
  setMe(patch: Partial<Omit<NetPlayer, 'id'>>): void
  send<T>(topic: NetTopic, data: T): void
  on<T>(topic: NetTopic, fn: (msg: NetMessage<T>) => void): () => void
  /** Your own peer id (null offline). */
  selfId?(): string | null
  /** Connection state for the UI. */
  status?(): NetStatus
  /** A player by peer id (any map), or null. */
  player?(id: string): NetPlayer | null
  /** Topics this viewer may not send on (the host refused them). */
  denied?(): NetTopic[]
}

const offline: NetApi = {
  kind: () => 'offline',
  online: () => false,
  players: () => [],
  everyone: () => [],
  onChange: () => () => {},
  setMe: () => {},
  send: () => {},
  on: () => () => {},
  selfId: () => null,
  status: () => 'offline',
  player: () => null,
  denied: () => [],
}

// ---------------------------------------------------------------------------
// Facade: forwards to the installed transport and keeps listeners across swaps.

type AnyFn = (msg: NetMessage<unknown>) => void

let impl: NetApi = offline
const topicSubs = new Map<NetTopic, Set<AnyFn>>()
const changeSubs = new Set<() => void>()
let unbind: (() => void)[] = []
const bound = new Set<NetTopic>()

function fireChange() {
  for (const fn of [...changeSubs]) {
    try {
      fn()
    } catch (e) {
      console.error(e)
    }
  }
}

function bindTopic(topic: NetTopic) {
  if (bound.has(topic)) return
  bound.add(topic)
  unbind.push(
    impl.on(topic, (msg) => {
      for (const fn of [...(topicSubs.get(topic) ?? [])]) {
        try {
          fn(msg)
        } catch (e) {
          console.error(e)
        }
      }
    }),
  )
}

function bindAll() {
  unbind.push(impl.onChange(fireChange))
  for (const t of topicSubs.keys()) bindTopic(t)
}

bindAll()

export const net: NetApi = {
  kind: () => impl.kind(),
  online: () => impl.online(),
  players: (map) => impl.players(map),
  everyone: () => impl.everyone(),
  onChange(fn) {
    changeSubs.add(fn)
    return () => void changeSubs.delete(fn)
  },
  setMe: (patch) => impl.setMe(patch),
  send: (topic, data) => impl.send(topic, data),
  on<T>(topic: NetTopic, fn: (msg: NetMessage<T>) => void) {
    let set = topicSubs.get(topic)
    if (!set) topicSubs.set(topic, (set = new Set()))
    const f = fn as AnyFn
    set.add(f)
    bindTopic(topic)
    return () => void set.delete(f)
  },
  selfId: () => impl.selfId?.() ?? null,
  status: () => impl.status?.() ?? (impl.online() ? 'online' : impl.kind() === 'offline' ? 'offline' : 'connecting'),
  player: (id) => impl.player?.(id) ?? impl.everyone().find((p) => p.id === id) ?? null,
  denied: () => impl.denied?.() ?? [],
}

/** Install a transport (pass nothing to go back offline). Existing listeners move over. */
export function setNet(next: NetApi = offline) {
  for (const u of unbind) u()
  unbind = []
  bound.clear()
  impl = next === net ? offline : next
  bindAll()
  fireChange()
}

/** The installed transport itself (tests and diagnostics). */
export function netTransport(): NetApi {
  return impl
}
