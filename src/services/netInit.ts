// Picks the online transport at startup:
//  1. inside the artifact viewer: the host's `room` capability;
//  2. a self-hosted build with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: Supabase Realtime;
//  3. otherwise offline (simulated crowds only).
// In dev, `?roomshim` installs a BroadcastChannel stand-in for the room so two
// tabs can play together (see netShim.ts).

import { signal } from '@preact/signals'
import { setNet } from './net'
import { connectRoom } from './netRoom'
import { RealtimeNet } from './realtimeNet'
import { auth, supabaseConfig } from './auth'

/** 'probing' while we look for a transport (the room can take up to 10 s to answer). */
export const netBoot = signal<'probing' | 'ready'>('probing')

let started = false

export async function initNet(): Promise<void> {
  if (started) return
  started = true
  try {
    if (import.meta.env.DEV) {
      const q = new URLSearchParams(location.search)
      if (q.has('roomshim')) (await import('./netShim')).installRoomShim(q)
    }
    const room = await connectRoom()
    if (room) {
      setNet(room)
      return
    }
    const cfg = supabaseConfig()
    if (cfg && typeof WebSocket !== 'undefined') {
      setNet(new RealtimeNet({ url: cfg.url, anonKey: cfg.anonKey, token: async () => (auth().token ? auth().token!() : null) }))
    }
  } catch (e) {
    console.warn('online play unavailable', e)
  } finally {
    netBoot.value = 'ready'
  }
}
