// Account session glue: sign up / log in / guest play, one save slot per
// account, and (for Supabase accounts) cloud save sync.

import { signal } from '@preact/signals'
import { auth, type Account, type AuthResult, type Gender } from '../services/auth'
import { cloudSave, createCloudSave, setCloudSave } from '../services/cloudsave'
import { pickNewer } from '../services/cloudsave'
import { game, loadState, migrate, persistListeners, persistNow, replaceState, storage, useSaveSlot, SAVE_KEY, mutate } from '../game/state'
import { ensureDaily } from '../game/actions'
import { mode } from './store'

export const session = signal<Account | null>(null)
export const authReady = signal(false)

const GUEST_FLAG = 'boondee.guest.v1'

function guestChosen(): boolean {
  try {
    return window.localStorage.getItem(GUEST_FLAG) === '1'
  } catch {
    return false
  }
}

function setGuestChosen(v: boolean) {
  try {
    if (v) window.localStorage.setItem(GUEST_FLAG, '1')
    else window.localStorage.removeItem(GUEST_FLAG)
  } catch {
    /* ignore */
  }
}

/** Anyone "in": a signed-in account, or a player who chose to play as a guest. */
export function hasIdentity(): boolean {
  return !!session.value || guestChosen() || !!game.value.account
}

let cloudTimer: ReturnType<typeof setTimeout> | undefined
persistListeners.push((data) => {
  if (!session.value || !cloudSave().enabled) return
  if (cloudTimer) clearTimeout(cloudTimer)
  cloudTimer = setTimeout(() => void cloudSave().save(data, Date.now()), 8000)
})

/** Switch to an account's slot. A brand-new account adopts the current guest progress. */
async function enterAccount(a: Account, adoptGuest: boolean) {
  persistNow()
  setCloudSave(createCloudSave(auth()))
  const slot = `${SAVE_KEY}:${a.id}`
  let raw = storage.load(slot)
  if (!raw && adoptGuest) raw = storage.load(SAVE_KEY)
  const cloud = cloudSave().enabled ? await cloudSave().load() : null
  let state = raw ? migrate(JSON.parse(raw)) : loadState(slot)
  if (cloud) {
    const localStamp = raw ? { updatedAt: state.savedAt ?? 0 } : null
    if (pickNewer(localStamp, cloud) === 'remote') {
      try {
        state = migrate(JSON.parse(cloud.data))
      } catch {
        /* keep local */
      }
    }
  }
  useSaveSlot(a.id)
  state.account = { kind: a.provider, id: a.id, email: a.email }
  if (!state.onboarded || state.player.name === 'สายบุญ') state.player = { ...state.player, name: a.name || state.player.name }
  replaceState(state)
  ensureDaily()
  persistNow()
  session.value = a
}

export async function initAccount() {
  try {
    const a = await auth().restore()
    if (a) await enterAccount(a, false)
  } catch {
    /* offline or storage blocked: play locally */
  }
  authReady.value = true
}

export async function signUp(input: { email: string; password: string; name: string; gender: Gender }): Promise<AuthResult> {
  const r = await auth().signUp(input)
  if (r.ok && !r.needsConfirmation) {
    await enterAccount(r.account, true)
    mutate((d) => {
      d.player.name = input.name.trim()
      d.player.look = { ...d.player.look, gender: input.gender === 'male' ? 'm' : 'f' }
    })
    setGuestChosen(false)
  }
  return r
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const r = await auth().signIn(email, password)
  if (r.ok) {
    await enterAccount(r.account, false)
    setGuestChosen(false)
  }
  return r
}

export function playAsGuest() {
  setGuestChosen(true)
  if (!game.value.account)
    mutate((d) => {
      d.account = { kind: 'guest', id: null, email: null }
    })
}

export async function signOut() {
  persistNow()
  if (session.value && cloudSave().enabled) await cloudSave().save(JSON.stringify(game.value), Date.now())
  try {
    await auth().signOut()
  } catch {
    /* ignore */
  }
  session.value = null
  setGuestChosen(false)
  useSaveSlot(null)
  replaceState(loadState(SAVE_KEY))
  ensureDaily()
  mode.value = 'title'
}
