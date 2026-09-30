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
import './ui/wiring'
import { installSkins } from './ui/skin'
import { game, loadState, migrate, persistNow, replaceState, useSaveSlot } from './game/state'
import { ensureDaily, isAreaUnlocked } from './game/actions'
import { area, mapId, mode } from './ui/store'
import { initAccount } from './ui/account'
import { initNet } from './services/netInit'
import { installOnline } from './ui/online/onlineHub'

installSkins()
const q0 = new URLSearchParams(location.search)
// Dev: ?slot=a keeps a separate save per tab (two-tab online testing).
if (import.meta.env.DEV && q0.get('slot')) useSaveSlot(`dev-${q0.get('slot')}`)
game.value = loadState()
// Dev convenience: ?skipintro jumps straight into the temple (?house for the home).
const skip = import.meta.env.DEV && q0.has('skipintro')
if (skip) game.value = { ...game.value, onboarded: true, account: game.value.account ?? { kind: 'guest', id: null, email: null } }
ensureDaily()
if (isAreaUnlocked(game.value.lastArea)) area.value = game.value.lastArea
mapId.value = area.value
mode.value = skip ? (q0.has('house') ? 'house' : 'world') : game.value.seen.intro ? 'title' : 'intro'
if (import.meta.env.DEV && q0.get('mode')) mode.value = q0.get('mode') as never
void initAccount()
// Online play with real players (artifact room or self-hosted realtime; offline otherwise).
installOnline()
void initNet()
// Build the Thailand map art while idle so the map opens instantly.
setTimeout(() => {
  const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1500))
  idle(() => void import('./art/thaimap').then((m) => m.prewarmThaiMap()))
}, 4000)
if (import.meta.env.DEV) {
  // Handy hooks for smoke tests and debugging in the browser console.
  Promise.all([import('./ui/store'), import('./ui/TempleView')]).then(([m, tv]) => {
    ;(window as unknown as Record<string, unknown>).__boondee = { ...m, game, travelTo: tv.travelTo, worldScene: tv.worldScene }
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
  if (ar) (area.value = ar as never), (mapId.value = ar)
  const mp = q.get('map')
  if (mp) mapId.value = mp
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
