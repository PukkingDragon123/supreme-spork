// Real online play (shared contract). The default is OFFLINE (no-op); the
// online module installs a real transport with `setNet()`:
//  - inside the claude.ai artifact viewer: the `room` capability
//    (everyone viewing the published game right now);
//  - on a self-hosted web build: a realtime backend (e.g. Supabase Realtime)
//    when configured.
// Simulated crowds (services/presence.ts) remain for when nobody real is on.
//
// Everything received is UNTRUSTED data from other players: render it as
// text only, clamp lengths, never execute or inject it as HTML.

import type { AvatarLook } from '../art/avatar'

/** Event topics (keep ≤ 16; the artifact declares them open to players). */
export type NetTopic = 'chat' | 'emote' | 'sathu' | 'fair' | 'dance' | 'gift' | 'trade' | 'ping'
export const NET_TOPICS: NetTopic[] = ['chat', 'emote', 'sathu', 'fair', 'dance', 'gift', 'trade', 'ping']

export interface NetPlayer {
  /** Stable per open game (peer id). */
  id: string
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
}

export interface NetMessage<T = unknown> {
  from: string
  topic: NetTopic
  data: T
  me: boolean
}

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
}

export let net: NetApi = offline

export function setNet(impl: NetApi) {
  net = impl
}
