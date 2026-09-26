// Dev-only cutscene player: open /dev-cutscene.html while running `npm run dev`.
// Query params: s=intro|title|arrival, area=wat|river|mountain|shrine,
// first=1, t=<seconds> (seek + freeze for deterministic screenshots),
// dev=phone|tall|tabletL|tabletP (box size).
import '@fontsource/mali/thai-500.css'
import '@fontsource/mali/latin-500.css'
import { Stage, type Scene } from '../engine/stage'
import { unlockAudio } from '../engine/audio'
import { DEFAULT_LOOK, type AvatarLook } from '../art/avatar'
import { IntroCutscene } from '../scenes/cutscenes/intro'
import { TitleScene } from '../scenes/cutscenes/title'
import { ArrivalCutscene } from '../scenes/cutscenes/arrival'

type Area = 'wat' | 'shrine' | 'river' | 'mountain'

const q = new URLSearchParams(location.search)
const state = {
  s: q.get('s') ?? 'intro',
  area: (q.get('area') ?? 'wat') as Area,
  first: q.get('first') === '1',
  dev: q.get('dev') ?? 'phone',
  t: q.has('t') ? Number(q.get('t')) : null,
  look: Number(q.get('look') ?? 0),
}

const SIZES: Record<string, [number, number]> = {
  phone: [390, 844],
  tall: [430, 932],
  small: [360, 640],
  tabletL: [1024, 640],
  tabletP: [640, 1024],
}

const LOOKS: AvatarLook[] = [
  { ...DEFAULT_LOOK, hair: 'hair_long', top: 'top_sabai', bottom: 'bot_sarong', skin: 0, hairColor: 0, head: 'head_frangipani', neck: 'neck_garland' },
  DEFAULT_LOOK,
  { ...DEFAULT_LOOK, gender: 'm', hair: 'hair_short', top: 'top_floral', bottom: 'bot_elephant', skin: 2, hairColor: 1 },
  { ...DEFAULT_LOOK, hair: 'hair_twin', top: 'top_overalls', bottom: 'bot_pinkskirt', skin: 1, hairColor: 4, head: 'head_dogears' },
]

const box = document.getElementById('box') as HTMLDivElement
const cap = document.getElementById('cap') as HTMLDivElement
const bar = document.getElementById('bar') as HTMLDivElement
const info = document.getElementById('info') as HTMLDivElement
const panels = document.getElementById('panels') as HTMLDivElement
const logoBox = document.getElementById('logo') as HTMLDivElement
const skipBtn = document.getElementById('skip') as HTMLButtonElement

let stage: Stage | null = null
let scene: (Scene & { skip?(): void; seek?(t: number): void; logoRect?: { x: number; y: number; w: number; h: number } }) | null = null
let tStart = performance.now()

function go(patch: Partial<typeof state>) {
  Object.assign(state, patch)
  const p = new URLSearchParams()
  p.set('s', state.s)
  if (state.s === 'arrival') p.set('area', state.area)
  if (state.first) p.set('first', '1')
  if (state.dev !== 'phone') p.set('dev', state.dev)
  if (state.look) p.set('look', String(state.look))
  history.replaceState(null, '', '?' + p.toString())
  build()
}

function button(label: string, on: boolean, fn: () => void) {
  const b = document.createElement('button')
  b.textContent = label
  if (on) b.className = 'on'
  b.onclick = () => {
    unlockAudio()
    fn()
  }
  bar.appendChild(b)
}

function toolbar() {
  bar.innerHTML = ''
  button('intro', state.s === 'intro', () => go({ s: 'intro', t: null }))
  button('title', state.s === 'title', () => go({ s: 'title', t: null }))
  for (const a of ['wat', 'river', 'mountain', 'shrine'] as Area[]) button(`arrival ${a}`, state.s === 'arrival' && state.area === a, () => go({ s: 'arrival', area: a, t: null }))
  button(`first-time: ${state.first ? 'on' : 'off'}`, state.first, () => go({ first: !state.first, t: null }))
  button('replay', false, () => go({ t: null }))
  const sel = document.createElement('select')
  for (const k of Object.keys(SIZES)) {
    const o = document.createElement('option')
    o.value = k
    o.textContent = `${k} ${SIZES[k].join('×')}`
    if (k === state.dev) o.selected = true
    sel.appendChild(o)
  }
  sel.onchange = () => go({ dev: sel.value })
  bar.appendChild(sel)
  button(`look ${state.look}`, false, () => go({ look: (state.look + 1) % LOOKS.length, t: null }))
}

function build() {
  toolbar()
  stage?.destroy()
  stage = null
  const [w, h] = SIZES[state.dev] ?? SIZES.phone
  box.style.width = `${w}px`
  box.style.height = `${h}px`
  cap.classList.remove('on')
  cap.textContent = ''
  const ev = {
    onCaption(text: string | null) {
      if (text) cap.textContent = text
      cap.classList.toggle('on', !!text)
    },
    onDone() {
      info.textContent += `  · onDone at ${((performance.now() - tStart) / 1000).toFixed(2)}s`
    },
  }
  if (state.s === 'title') scene = new TitleScene()
  else if (state.s === 'arrival') scene = new ArrivalCutscene({ look: LOOKS[state.look] ?? DEFAULT_LOOK, area: state.area, first: state.first }, ev)
  else scene = new IntroCutscene(ev)
  panels.style.display = state.s === 'title' ? 'flex' : 'none'
  skipBtn.style.display = state.s === 'title' ? 'none' : 'block'
  stage = new Stage(box, { targetWidth: 200 })
  stage.el.style.zIndex = '0'
  stage.setScene(scene)
  info.textContent = `virtual ${stage.width}×${stage.height} @${stage.scale}x`
  tStart = performance.now()
  if (state.t !== null && scene.seek) {
    cap.style.transition = 'none'
    scene.seek(state.t)
    const g = stage.surface
    g.reset()
    g.setCamera(0, 0)
    scene.render(g)
    info.textContent += `  · frozen at t=${state.t}`
  } else stage.start()
  const lr = scene.logoRect
  if (lr && stage) {
    const [x, y] = stage.toCss(lr.x, lr.y)
    const [x2, y2] = stage.toCss(lr.x + lr.w, lr.y + lr.h)
    Object.assign(logoBox.style, { display: q.has('rect') ? 'block' : 'none', left: `${x}px`, top: `${y}px`, width: `${x2 - x}px`, height: `${y2 - y}px` })
  } else logoBox.style.display = 'none'
}

skipBtn.onclick = () => scene?.skip?.()
build()
;(window as unknown as { __cut: unknown }).__cut = { go, get scene() { return scene }, get stage() { return stage } }
