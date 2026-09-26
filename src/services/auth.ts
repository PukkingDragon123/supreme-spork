// Accounts. Two providers share one interface: LocalAuthProvider keeps
// device-only accounts (PBKDF2-hashed passwords in localStorage) and
// SupabaseAuthProvider talks to Supabase GoTrue over plain fetch. The app
// picks Supabase when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.

export type Gender = 'male' | 'female' | 'other'

export interface Account {
  id: string
  email: string
  name: string
  gender: Gender
  createdAt: number
  provider: 'local' | 'supabase'
  emailVerified: boolean
}

export type AuthError =
  | 'invalid_email'
  | 'weak_password'
  | 'name_required'
  | 'email_taken'
  | 'wrong_credentials'
  | 'email_unconfirmed'
  | 'network'
  | 'not_configured'
  | 'unknown'

export type AuthResult =
  | { ok: true; account: Account; needsConfirmation?: boolean }
  | { ok: false; error: AuthError; message: string }

export interface AuthProvider {
  readonly kind: 'local' | 'supabase'
  /** Restore a saved session (call once at startup). */
  restore(): Promise<Account | null>
  current(): Account | null
  signUp(input: { email: string; password: string; name: string; gender: Gender }): Promise<AuthResult>
  signIn(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
  updateProfile(patch: Partial<Pick<Account, 'name' | 'gender'>>): Promise<AuthResult>
  resetPassword(email: string): Promise<{ ok: boolean; message: string }>
  /** Access token for cloud calls (supabase only). */
  token?(): Promise<string | null>
}

export type AuthFailure = { error: AuthError; message: string }

export const ACCOUNTS_KEY = 'boondee.accounts.v1'
export const SESSION_KEY = 'boondee.session.v1'

const MESSAGES: Record<AuthError, string> = {
  invalid_email: 'อีเมลไม่ถูกต้อง',
  weak_password: 'รหัสผ่านอย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข',
  name_required: 'กรุณาใส่ชื่อเล่น',
  email_taken: 'อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบแทนนะ',
  wrong_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  email_unconfirmed: 'กรุณายืนยันอีเมลก่อน ลองเช็กกล่องจดหมายดูนะ',
  network: 'เชื่อมต่อไม่ได้ ลองตรวจอินเทอร์เน็ตแล้วลองใหม่นะ',
  not_configured: 'ยังไม่ได้ตั้งค่าระบบบัญชีออนไลน์',
  unknown: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ',
}

const SIGNED_OUT = 'กรุณาเข้าสู่ระบบก่อนนะ'
const NO_CRYPTO = 'อุปกรณ์นี้ไม่รองรับการเข้ารหัส ลองเปิดผ่าน https นะ'

function fail(error: AuthError, message = MESSAGES[error]): { ok: false; error: AuthError; message: string } {
  return { ok: false, error, message }
}

// ---------------------------------------------------------------------------
// Validation.

export function normalizeEmail(e: string): string {
  return String(e ?? '').trim().toLowerCase()
}

export function validateEmail(e: string): AuthFailure | null {
  const v = normalizeEmail(e)
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return { error: 'invalid_email', message: MESSAGES.invalid_email }
  return null
}

export function validatePassword(p: string): AuthFailure | null {
  const v = String(p ?? '')
  if (v.length > 72) return { error: 'weak_password', message: 'รหัสผ่านยาวได้ไม่เกิน 72 ตัว' }
  if (v.length < 8 || !/\p{L}/u.test(v) || !/\p{Nd}/u.test(v)) return { error: 'weak_password', message: MESSAGES.weak_password }
  return null
}

export function validateName(n: string): AuthFailure | null {
  const len = Array.from(String(n ?? '').trim()).length
  if (len === 0) return { error: 'name_required', message: MESSAGES.name_required }
  if (len > 24) return { error: 'name_required', message: 'ชื่อเล่นยาวได้ไม่เกิน 24 ตัวอักษร' }
  return null
}

function normGender(g: unknown): Gender {
  return g === 'male' || g === 'female' ? g : 'other'
}

// ---------------------------------------------------------------------------
// Storage (falls back to memory when localStorage is unavailable).

const memory = new Map<string, string>()

export const authStorage = {
  get(key: string): string | null {
    try {
      const v = globalThis.localStorage?.getItem(key)
      if (v != null) return v
    } catch {
      /* storage blocked */
    }
    return memory.get(key) ?? null
  },
  set(key: string, value: string) {
    memory.set(key, value)
    try {
      globalThis.localStorage?.setItem(key, value)
    } catch {
      /* storage blocked: keep the in-memory copy */
    }
  },
  remove(key: string) {
    memory.delete(key)
    try {
      globalThis.localStorage?.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

function readJson(key: string): unknown {
  const raw = authStorage.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Crypto helpers.

const PBKDF2_ITERATIONS = 100_000

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('no_crypto')
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256)
  return new Uint8Array(bits)
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function newId(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ---------------------------------------------------------------------------
// Local (device-only) accounts.

interface LocalRecord extends Account {
  salt: string
  hash: string
}

function publicAccount(r: LocalRecord): Account {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    gender: normGender(r.gender),
    createdAt: r.createdAt,
    provider: 'local',
    emailVerified: false,
  }
}

export class LocalAuthProvider implements AuthProvider {
  readonly kind = 'local'
  private account: Account | null = null

  private records(): LocalRecord[] {
    const list = readJson(ACCOUNTS_KEY)
    if (!Array.isArray(list)) return []
    return list.filter((r): r is LocalRecord => !!r && typeof r.id === 'string' && typeof r.email === 'string' && typeof r.hash === 'string')
  }

  private saveRecords(list: LocalRecord[]) {
    authStorage.set(ACCOUNTS_KEY, JSON.stringify(list))
  }

  private startSession(r: LocalRecord): Account {
    this.account = publicAccount(r)
    authStorage.set(SESSION_KEY, JSON.stringify({ provider: 'local', id: r.id }))
    return this.account
  }

  async restore(): Promise<Account | null> {
    const s = readJson(SESSION_KEY) as { provider?: string; id?: string } | null
    const rec = s?.provider === 'local' ? this.records().find((r) => r.id === s.id) : undefined
    this.account = rec ? publicAccount(rec) : null
    return this.account
  }

  current(): Account | null {
    return this.account
  }

  async signUp(input: { email: string; password: string; name: string; gender: Gender }): Promise<AuthResult> {
    const bad = validateEmail(input.email) ?? validatePassword(input.password) ?? validateName(input.name)
    if (bad) return fail(bad.error, bad.message)
    const email = normalizeEmail(input.email)
    if (this.records().some((r) => r.email === email)) return fail('email_taken')
    let salt: Uint8Array<ArrayBuffer>
    let hash: Uint8Array
    try {
      salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
      hash = await pbkdf2(input.password, salt)
    } catch {
      return fail('unknown', NO_CRYPTO)
    }
    // Re-read after the slow hash in case another sign-up won the race.
    const list = this.records()
    if (list.some((r) => r.email === email)) return fail('email_taken')
    const rec: LocalRecord = {
      id: newId(),
      email,
      name: input.name.trim(),
      gender: normGender(input.gender),
      createdAt: Date.now(),
      provider: 'local',
      emailVerified: false,
      salt: toBase64(salt),
      hash: toBase64(hash),
    }
    this.saveRecords([...list, rec])
    return { ok: true, account: this.startSession(rec) }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const bad = validateEmail(email)
    if (bad) return fail(bad.error, bad.message)
    const rec = this.records().find((r) => r.email === normalizeEmail(email))
    if (!rec || !password) return fail('wrong_credentials')
    try {
      const hash = await pbkdf2(password, fromBase64(rec.salt))
      if (!sameBytes(hash, fromBase64(rec.hash))) return fail('wrong_credentials')
    } catch {
      return fail('unknown', NO_CRYPTO)
    }
    return { ok: true, account: this.startSession(rec) }
  }

  async signOut(): Promise<void> {
    this.account = null
    authStorage.remove(SESSION_KEY)
  }

  async updateProfile(patch: Partial<Pick<Account, 'name' | 'gender'>>): Promise<AuthResult> {
    if (!this.account) return fail('unknown', SIGNED_OUT)
    if (patch.name !== undefined) {
      const bad = validateName(patch.name)
      if (bad) return fail(bad.error, bad.message)
    }
    const list = this.records()
    const rec = list.find((r) => r.id === this.account!.id)
    if (!rec) return fail('unknown', SIGNED_OUT)
    if (patch.name !== undefined) rec.name = patch.name.trim()
    if (patch.gender !== undefined) rec.gender = normGender(patch.gender)
    this.saveRecords(list)
    this.account = publicAccount(rec)
    return { ok: true, account: this.account }
  }

  async resetPassword(_email: string): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: 'บัญชีบนเครื่องนี้รีเซ็ตรหัสผ่านทางอีเมลไม่ได้ ถ้าลืมรหัสผ่าน ต้องสมัครบัญชีใหม่นะ' }
  }
}

// ---------------------------------------------------------------------------
// Supabase (GoTrue REST, no SDK).

// GoTrue JSON bodies are loosely shaped; read them defensively.
type Body = Record<string, any>

interface StoredSession {
  access_token: string
  refresh_token: string
  /** Seconds since the epoch, as GoTrue reports it. */
  expires_at: number
  user: Body
}

function toSession(b: Body | null | undefined): StoredSession | null {
  if (!b || typeof b.access_token !== 'string' || !b.user?.id) return null
  const expiresAt = typeof b.expires_at === 'number' ? b.expires_at : Math.floor(Date.now() / 1000) + (Number(b.expires_in) || 3600)
  return { access_token: b.access_token, refresh_token: String(b.refresh_token ?? ''), expires_at: expiresAt, user: b.user }
}

function supabaseAccount(u: Body, fallback?: { email: string; name: string; gender: Gender }): Account {
  const meta: Body = u.user_metadata ?? {}
  return {
    id: String(u.id ?? ''),
    email: normalizeEmail(u.email ?? fallback?.email ?? ''),
    name: String(meta.name ?? fallback?.name ?? ''),
    gender: normGender(meta.gender ?? fallback?.gender),
    createdAt: Date.parse(u.created_at) || Date.now(),
    provider: 'supabase',
    emailVerified: !!(u.email_confirmed_at || u.confirmed_at),
  }
}

/** Map a GoTrue error response to an AuthError. */
function supabaseError(status: number, b: Body | null): { ok: false; error: AuthError; message: string } {
  const code = String(b?.error_code ?? b?.error ?? '')
  const text = String(b?.msg ?? b?.message ?? b?.error_description ?? '')
  if (/email not confirmed/i.test(text) || code === 'email_not_confirmed') return fail('email_unconfirmed')
  if (/already (registered|exists)/i.test(text) || code === 'user_already_exists' || code === 'email_exists') return fail('email_taken')
  if (/invalid login credentials/i.test(text) || code === 'invalid_credentials' || code === 'invalid_grant') return fail('wrong_credentials')
  if (code === 'weak_password' || /password (should|must|is too)/i.test(text)) return fail('weak_password')
  if (code === 'email_address_invalid' || /invalid format|validate email/i.test(text)) return fail('invalid_email')
  if (code === 'signup_disabled') return fail('unknown', 'ขณะนี้ปิดรับสมัครบัญชีใหม่ชั่วคราว')
  if (status === 429 || code.startsWith('over_')) return fail('unknown', 'ส่งคำขอบ่อยเกินไป รอสักครู่แล้วลองใหม่นะ')
  return fail('unknown')
}

export class SupabaseAuthProvider implements AuthProvider {
  readonly kind = 'supabase'
  readonly url: string
  readonly anonKey: string
  private session: StoredSession | null = null
  private account: Account | null = null
  private refreshing: Promise<void> | null = null

  constructor(url: string, anonKey: string) {
    this.url = url.replace(/\/+$/, '')
    this.anonKey = anonKey
  }

  /** Returns null when the request never reached the server. */
  private async request(method: string, path: string, body?: unknown, bearer?: string | null): Promise<{ status: number; body: Body | null } | null> {
    let res: Response
    try {
      res = await fetch(`${this.url}${path}`, {
        method,
        headers: {
          apikey: this.anonKey,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer || this.anonKey}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: typeof globalThis.AbortSignal?.timeout === 'function' ? AbortSignal.timeout(15_000) : undefined,
      })
    } catch {
      return null
    }
    let json: Body | null = null
    try {
      json = await res.json()
    } catch {
      /* empty body */
    }
    return { status: res.status, body: json }
  }

  private setSession(s: StoredSession | null) {
    this.session = s
    this.account = s ? supabaseAccount(s.user) : null
    if (s) authStorage.set(SESSION_KEY, JSON.stringify(s))
    else authStorage.remove(SESSION_KEY)
  }

  private expiresSoon(s: StoredSession): boolean {
    return s.expires_at * 1000 - Date.now() < 60_000
  }

  private refresh(): Promise<void> {
    return (this.refreshing ??= this.doRefresh().finally(() => {
      this.refreshing = null
    }))
  }

  private async doRefresh() {
    const s = this.session
    if (!s) return
    if (!s.refresh_token) {
      if (s.expires_at * 1000 <= Date.now()) this.setSession(null)
      return
    }
    const r = await this.request('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token })
    if (!r || this.session !== s) return // offline (keep the old session) or signed out meanwhile
    const next = r.status < 300 ? toSession(r.body) : null
    if (next) this.setSession(next)
    else if (r.status >= 400 && r.status < 500) this.setSession(null)
  }

  async restore(): Promise<Account | null> {
    const saved = readJson(SESSION_KEY) as Body | null
    const s = saved && typeof saved.refresh_token === 'string' ? toSession(saved) : null
    this.session = s
    this.account = s ? supabaseAccount(s.user) : null
    if (s && this.expiresSoon(s)) await this.refresh()
    return this.account
  }

  current(): Account | null {
    return this.account
  }

  async token(): Promise<string | null> {
    if (this.session && this.expiresSoon(this.session)) await this.refresh()
    const s = this.session
    return s && s.expires_at * 1000 > Date.now() ? s.access_token : null
  }

  async signUp(input: { email: string; password: string; name: string; gender: Gender }): Promise<AuthResult> {
    const bad = validateEmail(input.email) ?? validatePassword(input.password) ?? validateName(input.name)
    if (bad) return fail(bad.error, bad.message)
    const email = normalizeEmail(input.email)
    const name = input.name.trim()
    const gender = normGender(input.gender)
    const r = await this.request('POST', '/auth/v1/signup', { email, password: input.password, data: { name, gender } })
    if (!r) return fail('network')
    if (r.status >= 300 || !r.body) return supabaseError(r.status, r.body)
    const session = toSession(r.body) ?? toSession(r.body.session)
    if (session) {
      this.setSession(session)
      return { ok: true, account: this.account! }
    }
    // Email confirmation is on: GoTrue returns just the user, no session.
    const user: Body = r.body.user ?? r.body
    // An existing address comes back as an obfuscated user with no identities.
    if (Array.isArray(user.identities) && user.identities.length === 0) return fail('email_taken')
    return { ok: true, account: supabaseAccount(user, { email, name, gender }), needsConfirmation: true }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const bad = validateEmail(email)
    if (bad) return fail(bad.error, bad.message)
    if (!password) return fail('wrong_credentials')
    const r = await this.request('POST', '/auth/v1/token?grant_type=password', { email: normalizeEmail(email), password })
    if (!r) return fail('network')
    const session = r.status < 300 ? toSession(r.body) : null
    if (!session) return supabaseError(r.status, r.body)
    this.setSession(session)
    return { ok: true, account: this.account! }
  }

  async signOut(): Promise<void> {
    const s = this.session
    this.setSession(null)
    if (s) await this.request('POST', '/auth/v1/logout', {}, s.access_token)
  }

  async updateProfile(patch: Partial<Pick<Account, 'name' | 'gender'>>): Promise<AuthResult> {
    if (patch.name !== undefined) {
      const bad = validateName(patch.name)
      if (bad) return fail(bad.error, bad.message)
    }
    const token = await this.token()
    const s = this.session
    if (!token || !s) return fail('unknown', SIGNED_OUT)
    const data: Record<string, string> = {}
    if (patch.name !== undefined) data.name = patch.name.trim()
    if (patch.gender !== undefined) data.gender = normGender(patch.gender)
    const r = await this.request('PUT', '/auth/v1/user', { data }, token)
    if (!r) return fail('network')
    if (r.status >= 300 || !r.body?.id) return supabaseError(r.status, r.body)
    if (this.session !== s) return fail('unknown', SIGNED_OUT)
    this.setSession({ ...s, user: r.body })
    return { ok: true, account: this.account! }
  }

  async resetPassword(email: string): Promise<{ ok: boolean; message: string }> {
    const bad = validateEmail(email)
    if (bad) return { ok: false, message: bad.message }
    const r = await this.request('POST', '/auth/v1/recover', { email: normalizeEmail(email) })
    if (!r) return { ok: false, message: MESSAGES.network }
    if (r.status >= 300) return { ok: false, message: supabaseError(r.status, r.body).message }
    return { ok: true, message: 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว ลองเช็กกล่องจดหมายนะ' }
  }
}

// ---------------------------------------------------------------------------
// Provider selection.

/** Supabase settings from the Vite env, or null when not configured. */
export function supabaseConfig(): { url: string; anonKey: string } | null {
  let url: unknown
  let anonKey: unknown
  try {
    const env = import.meta.env
    url = env?.VITE_SUPABASE_URL
    anonKey = env?.VITE_SUPABASE_ANON_KEY
  } catch {
    /* no import.meta.env outside Vite */
  }
  if (typeof url !== 'string' || typeof anonKey !== 'string' || !url.trim() || !anonKey.trim()) return null
  return { url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim() }
}

export function createAuthProvider(config = supabaseConfig()): AuthProvider {
  return config ? new SupabaseAuthProvider(config.url, config.anonKey) : new LocalAuthProvider()
}

let provider: AuthProvider | null = null

export function setAuthProvider(p: AuthProvider) {
  provider = p
}

export function auth(): AuthProvider {
  return (provider ??= createAuthProvider())
}
