import { render } from 'preact'
import '@fontsource/mali/thai-400.css'
import '@fontsource/mali/latin-400.css'
import '@fontsource/mali/thai-500.css'
import '@fontsource/mali/latin-500.css'
import '@fontsource/mali/thai-600.css'
import '@fontsource/mali/latin-600.css'
import '@fontsource/pixelify-sans/latin-500.css'
import '@fontsource/pixelify-sans/latin-600.css'
import './styles/base.css'
import './styles/app.css'
import './styles/kit.css'
import './styles/v2.css'
import { App } from './ui/App'
import { installSkins } from './ui/skin'
import { game, loadState, migrate, persistNow, replaceState } from './game/state'
import { ensureDaily, isAreaUnlocked } from './game/actions'
import { area, mode } from './ui/store'
import { initAccount } from './ui/account'

installSkins()
game.value = loadState()
const q0 = new URLSearchParams(location.search)
// Dev convenience: ?skipintro jumps straight into the temple (?house for the home).
const skip = import.meta.env.DEV && q0.has('skipintro')
if (skip) game.value = { ...game.value, onboarded: true, account: game.value.account ?? { kind: 'guest', id: null, email: null } }
ensureDaily()
if (isAreaUnlocked(game.value.lastArea)) area.value = game.value.lastArea
mode.value = skip ? (q0.has('house') ? 'house' : 'world') : game.value.seen.intro ? 'title' : 'intro'
if (import.meta.env.DEV && q0.get('mode')) mode.value = q0.get('mode') as never
void initAccount()
if (import.meta.env.DEV) {
  // Handy hooks for smoke tests and debugging in the browser console.
  import('./ui/store').then((m) => {
    ;(window as unknown as Record<string, unknown>).__boondee = { ...m, game }
  })
  const q = new URLSearchParams(location.search)
  const act = q.get('act')
  if (act) import('./ui/store').then((m) => m.openActivity(act as never, Object.fromEntries([...q.entries()].filter(([k]) => k !== 'act' && k !== 'skipintro'))))
  const pn = q.get('panel')
  if (pn) import('./ui/store').then((m) => (m.panel.value = pn as never))
  const pray = q.get('pray')
  if (pray) import('./ui/store').then((m) => (m.prayStage.value = pray))
  const t = q.get('tab')
  if (t) import('./ui/store').then((m) => (m.tab.value = t as never))
  const ar = q.get('area')
  if (ar) area.value = ar as never
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persistNow()
  else ensureDaily()
})
window.addEventListener('pagehide', persistNow)

// In the shareable single-file preview, keep progress across live republishes
// when the host offers a hot-reload snapshot (optional; storage still works).
type Hot = { snapshot?: (fn: () => unknown) => void; ready?: (cb: (data: unknown) => void) => void; data?: unknown }
const hot = __SINGLE_FILE__ ? ((window as unknown as { claude?: { hot?: Hot } }).claude?.hot ?? null) : null

function start(data: unknown) {
  const save = (data as { save?: string } | null)?.save
  if (save) {
    try {
      replaceState(migrate(JSON.parse(save)))
      ensureDaily()
    } catch {
      /* ignore a bad snapshot */
    }
  }
  render(<App />, document.getElementById('app')!)
}

try {
  hot?.snapshot?.(() => ({ save: JSON.stringify(game.value) }))
} catch {
  /* snapshot is optional */
}
if (hot?.ready) hot.ready(start)
else start(hot?.data ?? {})

// Offline support for the installable PWA (not used by the single-file preview).
if (import.meta.env.PROD && !__SINGLE_FILE__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined)
  })
}
