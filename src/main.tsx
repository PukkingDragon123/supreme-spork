import { render } from 'preact'
import '@fontsource/mitr/thai-400.css'
import '@fontsource/mitr/latin-400.css'
import '@fontsource/mitr/thai-500.css'
import '@fontsource/mitr/latin-500.css'
import '@fontsource/mitr/thai-600.css'
import '@fontsource/mitr/latin-600.css'
import '@fontsource/pixelify-sans/latin-500.css'
import '@fontsource/pixelify-sans/latin-600.css'
import './styles/base.css'
import './styles/app.css'
import { App } from './ui/App'
import { game, loadState, migrate, persistNow, replaceState } from './game/state'
import { ensureDaily, isAreaUnlocked } from './game/actions'
import { area } from './ui/store'

game.value = loadState()
// Dev convenience: ?skipintro jumps straight into the temple.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('skipintro')) game.value = { ...game.value, onboarded: true }
ensureDaily()
if (isAreaUnlocked(game.value.lastArea)) area.value = game.value.lastArea
if (import.meta.env.DEV) {
  // Handy hooks for smoke tests and debugging in the browser console.
  import('./ui/store').then((m) => {
    ;(window as unknown as Record<string, unknown>).__boondee = { ...m, game }
  })
  const q = new URLSearchParams(location.search)
  const act = q.get('act')
  if (act) import('./ui/store').then((m) => m.openActivity(act as never, Object.fromEntries([...q.entries()].filter(([k]) => k !== 'act' && k !== 'skipintro'))))
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
