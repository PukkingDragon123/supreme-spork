// Dev page for the Thai travel map: open /dev-thaimap.html while running vite.
// Query params: ?base=1&z=2 (whole baked map), ?cat=1 (icon catalogue),
// ?focus=<placeId>, ?sel=<placeId>, ?zoom=2, ?all=1 (everything unlocked),
// ?stars=12, ?current=<id>, ?visited=a,b,c, ?t=<seconds to pre-run>.
import '@fontsource/mali/thai-600.css'
import '@fontsource/mali/latin-600.css'
import { thaiMapArt, mapLabels, placeIconArt, ICON_IDS } from '../art/thaimap'
import { Stage } from '../engine/stage'
import { ThaiMapScene, placeIcon } from '../scenes/thaimap'
import { ALL_PLACES, PLACE_BY_ID } from '../game/data/places'
import { spriteDataUrl } from '../engine/sprite'

const q = new URLSearchParams(location.search)
const cat = document.getElementById('cat')!
const phone = document.getElementById('phone')!
const card = document.getElementById('card')!
const bar = document.getElementById('bar')!
const log = document.getElementById('log')!

await Promise.race([
  Promise.all([document.fonts.load('600 9px Mali', 'ก')]),
  new Promise((r) => setTimeout(r, 1500)),
])

function showCanvas(c: HTMLCanvasElement, z: number, parent: HTMLElement = cat) {
  const el = document.createElement('canvas')
  el.width = c.width * z
  el.height = c.height * z
  const ctx = el.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(c, 0, 0, el.width, el.height)
  parent.appendChild(el)
  return el
}

if (q.get('base')) {
  phone.style.display = 'none'
  const z = Number(q.get('z') ?? 2)
  const art = thaiMapArt()
  const el = showCanvas(art.base, z)
  const ctx = el.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  if (!q.get('nolabels')) ctx.drawImage(mapLabels(), 0, 0, el.width, el.height)
} else if (q.get('cat')) {
  phone.style.display = 'none'
  const z = Number(q.get('z') ?? 4)
  for (const locked of [false, true]) {
    const row = document.createElement('div')
    row.className = 'row'
    for (const id of ICON_IDS) {
      const cell = document.createElement('div')
      cell.className = 'cell'
      showCanvas(placeIconArt(id, locked).canvas, z, cell)
      const t = document.createElement('div')
      t.textContent = PLACE_BY_ID[id]?.name ?? id
      cell.appendChild(t)
      row.appendChild(cell)
    }
    cat.appendChild(row)
  }
} else {
  const tb = performance.now()
  thaiMapArt()
  mapLabels()
  console.log(`bake ${Math.round(performance.now() - tb)}ms`)
  const stage = new Stage(phone, { targetWidth: 200 })
  const all = !!q.get('all')
  let stars = Number(q.get('stars') ?? 12)
  const unlocked = (id: string) => all || (PLACE_BY_ID[id]?.stars ?? 99) <= stars
  const visited = (q.get('visited') ?? 'wat,wat_phra_kaew,wat_pho,wat_arun,erawan,pathom_chedi').split(',').filter(Boolean)
  const scene = new ThaiMapScene(
    { unlocked, current: q.get('current') ?? 'wat_arun', visited, night: !!q.get('night') },
    {
      onSelect: (id) => showCard(id),
      onDeselect: () => showCard(null),
    },
  )
  const showCard = (id: string | null) => {
    if (!id) {
      card.style.display = 'none'
      scene.setInsets(0, 0)
      return
    }
    const p = PLACE_BY_ID[id]
    card.style.display = 'block'
    const open = unlocked(id)
    card.innerHTML = `<img src="${spriteDataUrl(placeIcon(id), 3)}"><b>${p.name}</b><div class="muted">${p.en} · ${p.province}</div><div>${p.tagline}</div><div class="muted">${p.about}</div><div>ขอพร: ${p.wishFor.join(' · ')}</div><div class="muted">${p.tip}</div><div>${open ? 'ไปเลย ▶' : `🔒 ★${p.stars} หรือ ${p.coins} คอยน์`}</div>`
    const h = card.getBoundingClientRect().height + 8
    scene.setInsets(0, Math.round(h / stage.cssScale))
    scene.focus(id)
  }
  ;(window as unknown as { __scene: ThaiMapScene; __stage: Stage }).__scene = scene
  ;(window as unknown as { __stage: Stage }).__stage = stage
  stage.setScene(scene)
  stage.start()
  if (q.get('zoom')) scene.setZoom(Number(q.get('zoom')))
  if (q.get('focus')) scene.focus(q.get('focus')!, true)
  if (q.get('sel')) {
    scene.select(q.get('sel')!)
    showCard(q.get('sel'))
    scene.focus(q.get('sel')!, true)
  }
  const pre = Number(q.get('t') ?? 0)
  if (pre > 0) for (let i = 0; i < pre * 60; i++) scene.update(1 / 60, i / 60)
  const btn = (label: string, fn: () => void) => {
    const b = document.createElement('button')
    b.textContent = label
    b.onclick = fn
    bar.appendChild(b)
  }
  btn('zoom 1×', () => scene.setZoom(1))
  btn('zoom 2×', () => scene.setZoom(2))
  btn('+5★', () => {
    stars += 5
    scene.setState({ unlocked })
    log.textContent = `stars ${stars}`
  })
  btn('close card', () => {
    scene.select(null)
    showCard(null)
  })
  for (const p of ALL_PLACES)
    btn(p.name, () => {
      scene.select(p.id)
      showCard(p.id)
    })
}
