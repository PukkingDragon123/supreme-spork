import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCOUNTS_KEY,
  LocalAuthProvider,
  SESSION_KEY,
  SupabaseAuthProvider,
  authStorage,
  validateEmail,
  validateName,
  validatePassword,
} from '../auth'
import { SupabaseCloudSave, pickNewer } from '../cloudsave'

beforeEach(() => {
  authStorage.remove(ACCOUNTS_KEY)
  authStorage.remove(SESSION_KEY)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('validators', () => {
  it('accepts a normal email and trims / lowercases it', () => {
    expect(validateEmail('  Boon@Example.COM ')).toBeNull()
  })

  it('rejects malformed emails', () => {
    for (const e of ['', 'boon', 'boon@', '@example.com', 'boon@example', 'bo on@example.com']) {
      expect(validateEmail(e)?.error).toBe('invalid_email')
    }
    expect(validateEmail('x')?.message).toBe('อีเมลไม่ถูกต้อง')
  })

  it('needs 8+ chars with a letter and a digit', () => {
    expect(validatePassword('abcd1234')).toBeNull()
    expect(validatePassword('บุญดี2569')).toBeNull()
    expect(validatePassword('abc123')?.error).toBe('weak_password')
    expect(validatePassword('abcdefgh')?.error).toBe('weak_password')
    expect(validatePassword('12345678')?.message).toBe('รหัสผ่านอย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข')
  })

  it('needs a trimmed name of 1–24 chars', () => {
    expect(validateName('บุญมา')).toBeNull()
    expect(validateName('   ')?.message).toBe('กรุณาใส่ชื่อเล่น')
    expect(validateName('a'.repeat(24))).toBeNull()
    expect(validateName('a'.repeat(25))?.error).toBe('name_required')
  })
})

describe('LocalAuthProvider', () => {
  const input = { email: ' Boon@Example.com ', password: 'merit1234', name: ' บุญมา ', gender: 'female' as const }

  it('signs up and becomes the current account', async () => {
    const p = new LocalAuthProvider()
    const r = await p.signUp(input)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.account).toMatchObject({ email: 'boon@example.com', name: 'บุญมา', gender: 'female', provider: 'local', emailVerified: false })
    expect(r.account.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(p.current()).toEqual(r.account)
    // Passwords are stored hashed, never in plain text.
    expect(authStorage.get(ACCOUNTS_KEY)).not.toContain('merit1234')
  })

  it('rejects a duplicate email', async () => {
    const p = new LocalAuthProvider()
    await p.signUp(input)
    const r = await p.signUp({ ...input, email: 'BOON@example.com' })
    expect(r).toEqual({ ok: false, error: 'email_taken', message: 'อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบแทนนะ' })
  })

  it('validates input before signing up', async () => {
    const r = await new LocalAuthProvider().signUp({ ...input, password: 'short' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('weak_password')
  })

  it('rejects a wrong password and unknown emails', async () => {
    const p = new LocalAuthProvider()
    await p.signUp(input)
    await p.signOut()
    const wrong = await p.signIn('boon@example.com', 'merit9999')
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) expect(wrong.error).toBe('wrong_credentials')
    const unknown = await p.signIn('nobody@example.com', 'merit1234')
    expect(unknown.ok).toBe(false)
    if (!unknown.ok) expect(unknown.error).toBe('wrong_credentials')
    expect(p.current()).toBeNull()
  })

  it('signs in with the right password', async () => {
    const p = new LocalAuthProvider()
    const up = await p.signUp(input)
    await p.signOut()
    const r = await p.signIn('BOON@example.com ', 'merit1234')
    expect(r.ok).toBe(true)
    if (r.ok && up.ok) expect(r.account.id).toBe(up.account.id)
    expect(p.current()?.email).toBe('boon@example.com')
  })

  it('signs out', async () => {
    const p = new LocalAuthProvider()
    await p.signUp(input)
    await p.signOut()
    expect(p.current()).toBeNull()
    expect(await new LocalAuthProvider().restore()).toBeNull()
  })

  it('restores the saved session', async () => {
    const p = new LocalAuthProvider()
    const up = await p.signUp(input)
    const again = new LocalAuthProvider()
    expect(again.current()).toBeNull()
    const restored = await again.restore()
    expect(up.ok).toBe(true)
    if (up.ok) expect(restored).toEqual(up.account)
    expect(again.current()).toEqual(restored)
  })

  it('updates the profile and keeps it', async () => {
    const p = new LocalAuthProvider()
    await p.signUp(input)
    const r = await p.updateProfile({ name: ' ต้นกล้า ', gender: 'male' })
    expect(r.ok).toBe(true)
    expect(p.current()).toMatchObject({ name: 'ต้นกล้า', gender: 'male' })
    const bad = await p.updateProfile({ name: '' })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error).toBe('name_required')
    expect((await new LocalAuthProvider().restore())?.name).toBe('ต้นกล้า')
  })

  it('cannot reset passwords by email', async () => {
    const r = await new LocalAuthProvider().resetPassword('boon@example.com')
    expect(r.ok).toBe(false)
    expect(r.message).toBeTruthy()
  })
})

describe('SupabaseAuthProvider', () => {
  const URL = 'https://demo.supabase.co/'
  const KEY = 'anon-key'
  const user = {
    id: '6f1c1d1e-0000-4000-8000-000000000001',
    email: 'boon@example.com',
    created_at: '2026-09-01T00:00:00Z',
    email_confirmed_at: '2026-09-01T00:00:00Z',
    user_metadata: { name: 'บุญมา', gender: 'female' },
    identities: [{ id: 'x' }],
  }
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  function mockFetch(...replies: (Response | Error)[]) {
    const fn = vi.fn(async (_url: string, _init: RequestInit) => {
      const next = replies.shift()
      if (!next || next instanceof Error) throw next ?? new Error('no reply')
      return next
    })
    vi.stubGlobal('fetch', fn)
    return fn
  }

  it('maps a successful sign-up to an account and session', async () => {
    const now = Math.floor(Date.now() / 1000)
    const fetch = mockFetch(reply(200, { access_token: 'at1', refresh_token: 'rt1', expires_in: 3600, expires_at: now + 3600, user }))
    const p = new SupabaseAuthProvider(URL, KEY)
    const r = await p.signUp({ email: ' Boon@Example.com', password: 'merit1234', name: ' บุญมา ', gender: 'female' })
    expect(r).toEqual({
      ok: true,
      account: {
        id: user.id,
        email: 'boon@example.com',
        name: 'บุญมา',
        gender: 'female',
        createdAt: Date.parse(user.created_at),
        provider: 'supabase',
        emailVerified: true,
      },
    })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://demo.supabase.co/auth/v1/signup')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ apikey: KEY, 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` })
    expect(JSON.parse(String(init.body))).toEqual({ email: 'boon@example.com', password: 'merit1234', data: { name: 'บุญมา', gender: 'female' } })
    expect(p.current()?.id).toBe(user.id)
    expect(await p.token()).toBe('at1')
    expect(JSON.parse(authStorage.get(SESSION_KEY)!)).toMatchObject({ access_token: 'at1', refresh_token: 'rt1', expires_at: now + 3600 })
  })

  it('flags sign-ups that need email confirmation', async () => {
    mockFetch(reply(200, { ...user, email_confirmed_at: null, user_metadata: {} }))
    const p = new SupabaseAuthProvider(URL, KEY)
    const r = await p.signUp({ email: 'boon@example.com', password: 'merit1234', name: 'บุญมา', gender: 'female' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.needsConfirmation).toBe(true)
    expect(r.account).toMatchObject({ id: user.id, name: 'บุญมา', emailVerified: false })
    expect(p.current()).toBeNull()
  })

  it('maps "User already registered" to email_taken', async () => {
    mockFetch(reply(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' }))
    const r = await new SupabaseAuthProvider(URL, KEY).signUp({ email: 'boon@example.com', password: 'merit1234', name: 'บุญมา', gender: 'other' })
    expect(r).toEqual({ ok: false, error: 'email_taken', message: 'อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบแทนนะ' })
  })

  it('maps login errors', async () => {
    mockFetch(
      reply(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' }),
      reply(400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' }),
    )
    const p = new SupabaseAuthProvider(URL, KEY)
    const a = await p.signIn('boon@example.com', 'merit1234')
    const b = await p.signIn('boon@example.com', 'merit1234')
    expect(a.ok ? null : a.error).toBe('wrong_credentials')
    expect(b.ok ? null : b.error).toBe('email_unconfirmed')
  })

  it('maps a fetch failure to network', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    const r = await new SupabaseAuthProvider(URL, KEY).signIn('boon@example.com', 'merit1234')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('network')
  })

  it('refreshes a token that is about to expire', async () => {
    const now = Math.floor(Date.now() / 1000)
    const fetch = mockFetch(
      reply(200, { access_token: 'old', refresh_token: 'rt1', expires_at: now + 30, user }),
      reply(200, { access_token: 'new', refresh_token: 'rt2', expires_at: now + 3600, user }),
    )
    const p = new SupabaseAuthProvider(URL, KEY)
    await p.signIn('boon@example.com', 'merit1234')
    expect(await p.token()).toBe('new')
    const [url, init] = fetch.mock.calls[1]
    expect(url).toBe('https://demo.supabase.co/auth/v1/token?grant_type=refresh_token')
    expect(JSON.parse(String(init.body))).toEqual({ refresh_token: 'rt1' })
  })
})

describe('cloud save', () => {
  it('picks the newer save, ties stay local', () => {
    expect(pickNewer({ updatedAt: 2 }, { updatedAt: 1 })).toBe('local')
    expect(pickNewer({ updatedAt: 1 }, { updatedAt: 2 })).toBe('remote')
    expect(pickNewer({ updatedAt: 5 }, { updatedAt: 5 })).toBe('local')
    expect(pickNewer(null, { updatedAt: 1 })).toBe('remote')
    expect(pickNewer({ updatedAt: 1 }, null)).toBe('local')
  })

  it('upserts and loads through PostgREST without throwing', async () => {
    const calls: [string, RequestInit][] = []
    const at = Date.parse('2026-09-26T01:02:03.456Z')
    const replies = [new Response(null, { status: 201 }), new Response(JSON.stringify([{ data: { merit: 7 }, updated_at: '2026-09-26T01:02:03.456+00:00' }]), { status: 200 })]
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push([url, init])
      return replies.shift()!
    })
    const c = new SupabaseCloudSave('https://demo.supabase.co', 'k', async () => 'tok', () => 'u1')
    expect(await c.save('{"merit":7}', at)).toBe(true)
    expect(calls[0][0]).toBe('https://demo.supabase.co/rest/v1/saves')
    expect(calls[0][1].headers).toMatchObject({ Prefer: 'resolution=merge-duplicates', Authorization: 'Bearer tok', apikey: 'k' })
    expect(JSON.parse(String(calls[0][1].body))).toEqual({ user_id: 'u1', data: { merit: 7 }, updated_at: '2026-09-26T01:02:03.456Z' })
    expect(await c.load()).toEqual({ data: '{"merit":7}', updatedAt: at })
    expect(calls[1][0]).toBe('https://demo.supabase.co/rest/v1/saves?user_id=eq.u1&select=data,updated_at')

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline')
    })
    expect(await c.load()).toBeNull()
    expect(await c.save('{}', at)).toBe(false)
  })
})
