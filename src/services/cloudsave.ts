// Cloud save. Signed-in Supabase users keep one save row in the `saves`
// table (see supabase/schema.sql); everyone else gets NoCloudSave and plays
// from the device save only. Calls never throw: failures return null/false.

import type { AuthProvider } from './auth'
import { SupabaseAuthProvider, auth, supabaseConfig } from './auth'

export interface CloudSave {
  readonly enabled: boolean
  load(): Promise<{ data: string; updatedAt: number } | null>
  save(data: string, updatedAt: number): Promise<boolean>
}

export class NoCloudSave implements CloudSave {
  readonly enabled = false
  async load(): Promise<null> {
    return null
  }
  async save(_data: string, _updatedAt: number): Promise<boolean> {
    return false
  }
}

export class SupabaseCloudSave implements CloudSave {
  readonly enabled = true
  private readonly url: string

  constructor(
    url: string,
    private readonly anonKey: string,
    private readonly getToken: () => Promise<string | null>,
    private readonly getUserId: () => string | null,
  ) {
    this.url = url.replace(/\/+$/, '')
  }

  private headers(token: string): Record<string, string> {
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  async load(): Promise<{ data: string; updatedAt: number } | null> {
    try {
      const id = this.getUserId()
      const token = id ? await this.getToken() : null
      if (!id || !token) return null
      const res = await fetch(`${this.url}/rest/v1/saves?user_id=eq.${encodeURIComponent(id)}&select=data,updated_at`, {
        headers: this.headers(token),
      })
      if (!res.ok) return null
      const rows = await res.json()
      const row = Array.isArray(rows) ? rows[0] : null
      if (!row || row.data == null) return null
      const updatedAt = Date.parse(row.updated_at)
      return {
        data: typeof row.data === 'string' ? row.data : JSON.stringify(row.data),
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
      }
    } catch {
      return null
    }
  }

  async save(data: string, updatedAt: number): Promise<boolean> {
    try {
      const id = this.getUserId()
      const token = id ? await this.getToken() : null
      if (!id || !token) return false
      // Store objects as real jsonb; anything else goes in as a jsonb string.
      let value: unknown = data
      try {
        const parsed = JSON.parse(data)
        if (parsed && typeof parsed === 'object') value = parsed
      } catch {
        /* not JSON: keep the raw string */
      }
      const res = await fetch(`${this.url}/rest/v1/saves`, {
        method: 'POST',
        headers: { ...this.headers(token), Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: id, data: value, updated_at: new Date(updatedAt).toISOString() }),
      })
      return res.ok
    } catch {
      return false
    }
  }
}

type Stamp = { updatedAt: number } | null | undefined

/** Which save to keep: the newer one wins, ties stay local. */
export function pickNewer(local: Stamp, remote: Stamp): 'local' | 'remote' {
  if (!remote) return 'local'
  if (!local) return 'remote'
  const l = Number.isFinite(local.updatedAt) ? local.updatedAt : 0
  const r = Number.isFinite(remote.updatedAt) ? remote.updatedAt : 0
  return r > l ? 'remote' : 'local'
}

export function createCloudSave(p: AuthProvider): CloudSave {
  if (p.kind !== 'supabase') return new NoCloudSave()
  const config = p instanceof SupabaseAuthProvider ? { url: p.url, anonKey: p.anonKey } : supabaseConfig()
  if (!config) return new NoCloudSave()
  return new SupabaseCloudSave(
    config.url,
    config.anonKey,
    async () => (p.token ? p.token() : null),
    () => p.current()?.id ?? null,
  )
}

let cloud: CloudSave | null = null

export function setCloudSave(c: CloudSave) {
  cloud = c
}

export function cloudSave(): CloudSave {
  return (cloud ??= createCloudSave(auth()))
}
