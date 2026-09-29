// Dev page for the north & isan place maps (dev-northisan.html): renders every
// map of the group as a full overview image.
//   ?map=doi_suthep,doi_suthep:terrace   only these maps (any registered id works)
//   ?z=2                                  zoom
//   ?phase=night                          force the time of day (sky.ts)
//   ?t=4                                  seconds of simulation before the snapshot
//   ?hot=1  draw hotspot rects + ids      ?obs=1  draw obstacles / nav grid
//   ?live=1 keep animating (otherwise one still frame per map)
//   ?check=1 report unreachable hotspots / blocked spawn points
//   ?art=1  sprite sheet of the group's new art (?only=<substring>)

import { Surface } from '../engine/pixel'
import { WorldScene } from '../scenes/world'
import { mapFor } from '../scenes/maps'
import { MAPS } from '../scenes/maps/places/northisan'
import { game } from '../game/state'
import { ART as SHARED } from '../art/places/northisan'
import { DOI_ART } from '../art/places/northisan-doi'
import { RK_ART } from '../art/places/northisan-rongkhun'
import { HPK_ART } from '../art/places/northisan-huaypla'
import { KC_ART } from '../art/places/northisan-khamchanod'
import { TP_ART } from '../art/places/northisan-phanom'
import { YM_ART } from '../art/places/northisan-yamo'

const ART: Record<string, () => { canvas: HTMLCanvasElement; w: number; h: number }> = { ...SHARED, ...prefix('doi_', DOI_ART), ...prefix('rk_', RK_ART), ...prefix('hpk_', HPK_ART), ...prefix('kc_', KC_ART), ...prefix('tp_', TP_ART), ...prefix('ym_', YM_ART) }
function prefix(p: string, o: Record<string, () => { canvas: HTMLCanvasElement; w: number; h: number }>) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [p + k, v]))
}

const q = new URLSearchParams(location.search)
const root = document.getElementById('root')!
const z = +(q.get('z') ?? 2)
const pre = +(q.get('t') ?? 3)
const ids = q.get('map')?.split(',') ?? Object.keys(MAPS)

function overlay(g: Surface, scene: WorldScene) {
  const m = scene.map
  if (q.has('obs')) {
    g.alpha(0.35)
    for (const r of m.obstacles) g.rect(r.x, r.y, r.w, r.h, '#ff2050')
    for (const [cx, cy, rx, ry] of m.ellipses ?? []) g.ellipse(cx, cy, rx, ry, '#ff2050')
    g.alpha(1)
    for (let y = 0; y < m.h; y += 4) for (let x = 0; x < m.w; x += 4) if (!scene.grid.freeAt(x + 2, y + 2)) g.px(x + 2, y + 2, '#ff0040')
  }
  if (q.has('hot')) {
    for (const h of m.hotspots) {
      g.frame(h.rect.x, h.rect.y, h.rect.w, h.rect.h, h.id.startsWith('door:') ? '#40c0ff' : h.id.startsWith('job:') ? '#80ff80' : h.id.startsWith('shop:') ? '#ffa040' : '#ffff40')
      g.rect(h.at.x - 1, h.at.y - 1, 3, 3, '#ff00ff')
    }
  }
}

function labels(wrap: HTMLElement, scene: WorldScene) {
  if (!q.has('hot')) return
  for (const h of scene.map.hotspots) {
    const d = document.createElement('div')
    d.textContent = h.id
    Object.assign(d.style, { position: 'absolute', left: h.rect.x * z + 'px', top: h.rect.y * z + 'px', font: '10px monospace', color: '#fff', background: 'rgba(0,0,0,.55)', padding: '0 2px', pointerEvents: 'none' })
    wrap.appendChild(d)
  }
}

function artSheet() {
  const only = q.get('only')
  for (const [name, make] of Object.entries(ART)) {
    if (only && !name.includes(only)) continue
    const s = make()
    const card = document.createElement('div')
    card.className = 'card'
    const b = document.createElement('b')
    b.textContent = `${name} ${s.w}×${s.h}`
    card.appendChild(b)
    const c = document.createElement('canvas')
    c.width = s.w * z
    c.height = s.h * z
    c.dataset.map = 'art_' + name
    c.style.background = q.get('bg') ?? '#86c95f'
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(s.canvas, 0, 0, c.width, c.height)
    card.appendChild(c)
    root.appendChild(card)
  }
}

if (q.has('art')) artSheet()
else for (const id of ids) {
  const map = mapFor(id)
  const card = document.createElement('div')
  card.className = 'card'
  const title = document.createElement('b')
  title.textContent = `${id}  ${map.w}×${map.h}${map.indoor ? ' (indoor)' : ''}`
  card.appendChild(title)
  const wrap = document.createElement('div')
  wrap.style.position = 'relative'
  card.appendChild(wrap)
  root.appendChild(card)
  const scene = new WorldScene(map, game.value.player.look, { onArrive: () => undefined, onSay: () => undefined })
  scene.resize(map.w, map.h)
  scene.lookAt(0, 0)
  if (q.has('check')) {
    const bad: string[] = []
    const sp = map.spawn
    for (const st of [sp, ...Object.values(map.entries ?? {})]) if (!scene.grid.freeAt(st.x, st.y)) bad.push(`start(${st.x},${st.y}) blocked`)
    for (const h of map.hotspots) if (!scene.grid.find(sp.x, sp.y, h.at.x, h.at.y)) bad.push(`${h.id} unreachable`)
    for (const st of Object.values(map.entries ?? {})) if (!scene.grid.find(sp.x, sp.y, st.x, st.y)) bad.push(`entry(${st.x},${st.y}) unreachable`)
    const d = document.createElement('pre')
    d.className = 'check'
    d.textContent = `${id}: ${bad.length ? bad.join('; ') : 'OK'}`
    card.appendChild(d)
  }
  const g = new Surface(map.w, map.h)
  const out = document.createElement('canvas')
  out.width = map.w * z
  out.height = map.h * z
  out.dataset.map = id
  wrap.appendChild(out)
  labels(wrap, scene)
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  let t = 0
  for (let i = 0; i < pre * 30; i++) {
    t += 1 / 30
    scene.update(1 / 30, t)
  }
  const frame = () => {
    scene.render(g)
    overlay(g, scene)
    ctx.drawImage(g.canvas, 0, 0, out.width, out.height)
  }
  frame()
  if (q.has('live')) {
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      scene.update(dt, t)
      frame()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }
}
document.body.dataset.ready = '1'
