// Dev page for the prayer hall scene: open /dev-prayer.html while running vite.
// URL params: temple, deity, phase, voice, focus, sim (seconds to pre-run),
// pose, zones=1, hits=perfect,good,…, bow=1, finale=1, panel=0, view=buddha.
import { buddhaSculpt } from '../art/hall'
import { DEFAULT_LOOK } from '../art/avatar'
import { Stage } from '../engine/stage'
import { PrayerHallScene, type HallTemple, type KneelPose, type PrayerPhase, type ShrineDeity } from '../scenes/prayer'

const q = new URLSearchParams(location.search)
const inspect = document.getElementById('inspect')!
const panel = document.getElementById('panel')!
const host = document.getElementById('host')!

function showCanvas(c: HTMLCanvasElement, zoom: number) {
  const el = document.createElement('canvas')
  el.width = c.width
  el.height = c.height
  el.style.width = `${c.width * zoom}px`
  el.style.height = `${c.height * zoom}px`
  el.getContext('2d')!.drawImage(c, 0, 0)
  inspect.appendChild(el)
}

if (q.get('view') === 'buddha') {
  inspect.style.display = 'block'
  const z = Number(q.get('z') ?? 4)
  for (const style of ['sukhothai', 'antique', 'lanna'] as const) showCanvas(buddhaSculpt(style, Number(q.get('s') ?? 1)).canvas, z)
} else {
  let temple = (q.get('temple') ?? 'wat') as HallTemple
  let deity = (q.get('deity') ?? 'ganesha') as ShrineDeity
  const stage = new Stage(host, { targetWidth: Number(q.get('tw') ?? 200) })
  ;(window as unknown as { __stage: Stage }).__stage = stage
  let scene!: PrayerHallScene
  let voice = Number(q.get('voice') ?? 0)
  let focus = Number(q.get('focus') ?? 0)
  let autoVoice = q.get('auto') === '1'
  const log = document.createElement('div')

  const make = () => {
    scene = new PrayerHallScene({ temple, look: DEFAULT_LOOK, deity })
    scene.onReady = () => (log.textContent = `onReady @ ${scene.t.toFixed(2)}s`)
    stage.setScene(scene)
    ;(window as unknown as { __scene: PrayerHallScene }).__scene = scene
    scene.setVoice(voice)
    scene.setFocus(focus)
  }
  make()
  const apply = () => {
    const ph = q.get('phase') as PrayerPhase | null
    if (ph) scene.setPhase(ph)
    const pose = q.get('pose') as KneelPose | null
    if (pose) scene.setPose(pose)
    const sim = Number(q.get('sim') ?? 0)
    for (let i = 0; i < sim * 60; i++) {
      if (autoVoice) scene.setVoice(0.5 + 0.5 * Math.sin(i / 9))
      scene.update(1 / 60, i / 60)
    }
    if (q.get('bow') === '1') {
      scene.bow()
      for (let i = 0; i < Number(q.get('bowt') ?? 0.7) * 60; i++) scene.update(1 / 60, 0)
    }
    const hits = q.get('hits')
    if (hits) {
      hits.split(',').forEach((hq) => scene.hit(hq as never))
      for (let i = 0; i < Number(q.get('hitt') ?? 0.5) * 60; i++) scene.update(1 / 60, 0)
    }
    if (q.get('finale') === '1') {
      scene.finale()
      for (let i = 0; i < Number(q.get('fint') ?? 1.2) * 60; i++) scene.update(1 / 60, 0)
    }
  }
  apply()
  if (q.get('still') !== '1') stage.start()
  else {
    scene.render(stage.surface)
  }

  // Controls.
  const section = (title: string) => {
    const h = document.createElement('h4')
    h.textContent = title
    panel.appendChild(h)
  }
  const btn = (label: string, fn: () => void) => {
    const b = document.createElement('button')
    b.textContent = label
    b.onclick = fn
    panel.appendChild(b)
    return b
  }
  const slider = (label: string, val: number, fn: (v: number) => void) => {
    const l = document.createElement('div')
    l.textContent = `${label}: ${val.toFixed(2)}`
    const r = document.createElement('input')
    r.type = 'range'
    r.min = '0'
    r.max = '1'
    r.step = '0.01'
    r.value = String(val)
    r.oninput = () => {
      const v = Number(r.value)
      l.textContent = `${label}: ${v.toFixed(2)}`
      fn(v)
    }
    panel.appendChild(l)
    panel.appendChild(r)
  }
  const toggle = btn('☰', () => panel.classList.toggle('hidden'))
  toggle.className = 'toggle'
  section('temple')
  for (const t of ['wat', 'river', 'mountain', 'home', 'shrine'] as HallTemple[])
    btn(t, () => {
      temple = t
      make()
    })
  for (const d of ['ganesha', 'guanyin', 'lakshmi'] as ShrineDeity[])
    btn(d, () => {
      temple = 'shrine'
      deity = d
      make()
    })
  section('phase')
  for (const p of ['enter', 'ready', 'chant', 'bow', 'finale'] as PrayerPhase[]) btn(p, () => scene.setPhase(p))
  section('actions')
  btn('bow', () => scene.bow(() => (log.textContent = 'bow done')))
  btn('bow ×3', () => {
    let n = 0
    for (let i = 0; i < 3; i++) scene.bow(() => (log.textContent = `bow ${++n}/3`))
  })
  btn('finale', () => scene.finale())
  for (const hq of ['perfect', 'good', 'ok', 'miss'] as const) btn(hq, () => scene.hit(hq))
  section('pose')
  for (const p of ['kneel', 'wai', 'bow', 'sit'] as KneelPose[]) btn(p, () => scene.setPose(p))
  section('voice / focus')
  slider('voice', voice, (v) => {
    voice = v
    scene.setVoice(v)
  })
  slider('focus', focus, (v) => {
    focus = v
    scene.setFocus(v)
  })
  btn('auto voice', () => (autoVoice = !autoVoice))
  btn('auto chant', () => {
    scene.setPhase('chant')
    autoVoice = true
    let i = 0
    const id = setInterval(() => {
      const r = Math.random()
      scene.hit(r < 0.35 ? 'perfect' : r < 0.7 ? 'good' : r < 0.9 ? 'ok' : 'miss')
      focus = Math.min(1, focus + 0.05)
      scene.setFocus(focus)
      if (++i > 30) clearInterval(id)
    }, 450)
  })
  btn('zones', () => document.querySelectorAll('.zones').forEach((z) => ((z as HTMLElement).style.display = (z as HTMLElement).style.display === 'none' ? '' : 'none')))
  panel.appendChild(log)
  let tick = 0
  setInterval(() => {
    if (!autoVoice) return
    tick++
    scene.setVoice(Math.max(0, 0.45 + 0.4 * Math.sin(tick / 3) + (Math.random() - 0.5) * 0.3))
  }, 50)
  if (q.get('zones') === '1')
    for (const c of ['top', 'bot']) {
      const z = document.createElement('div')
      z.className = `zones ${c}`
      document.body.appendChild(z)
    }
  if (q.get('panel') === '0') panel.style.display = 'none'
}
