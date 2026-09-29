// Dev page for the "historic" place maps (dev-historic.html): renders every
// map of the group as a full overview image.
//   ?maps=id1,id2     only these map ids (any registered map works, e.g. wat)
//   ?scale=2          integer zoom (default 2)
//   ?phase=night      force the time of day (handled in sky.ts)
//   ?debug=1          overlay obstacles, hotspots, entries and pickup spots
//   ?t=3              seconds of simulated time before the snapshot
// window.__done is set once every map has been drawn (for screenshots).

import { Surface } from '../engine/pixel'
import { WorldScene } from '../scenes/world'
import { mapFor } from '../scenes/maps'
import { MAPS } from '../scenes/maps/places/historic'
import { game } from '../game/state'

const q = new URLSearchParams(location.search)
const root = document.getElementById('root')!
const scale = +(q.get('scale') ?? 2)
const ids = q.get('maps')?.split(',') ?? Object.keys(MAPS)
const debug = q.has('debug')
const simT = +(q.get('t') ?? 3)

function renderMap(id: string) {
  const map = mapFor(id)
  const scene = new WorldScene(map, game.value.player.look, { onArrive: () => undefined, onSay: () => undefined })
  scene.interactive = debug
  scene.resize(map.w, map.h)
  const g = new Surface(map.w, map.h)
  let t = 0
  for (let i = 0; i < simT * 20; i++) {
    t += 0.05
    scene.update(0.05, t)
  }
  scene.resize(map.w, map.h)
  scene.render(g)
  if (debug) {
    g.setCamera(0, 0)
    g.alpha(0.35)
    for (const r of map.obstacles) g.rect(r.x, r.y, r.w, r.h, '#ff2050')
    for (const [cx, cy, rx, ry] of map.ellipses ?? []) g.ellipse(cx, cy, rx, ry, '#ff2050')
    g.alpha(1)
    for (const h of map.hotspots) {
      g.frame(h.rect.x, h.rect.y, h.rect.w, h.rect.h, h.id.startsWith('job:') ? '#40e0ff' : h.id.startsWith('shop:') ? '#ff80ff' : '#ffe040')
      g.rect(h.at.x - 1, h.at.y - 1, 3, 3, scene.grid.freeAt(h.at.x, h.at.y) ? '#40ff80' : '#ff0000')
    }
    for (const e of Object.values(map.entries ?? {})) g.rect(e.x - 2, e.y - 2, 5, 5, '#ff00ff')
    g.rect(map.spawn.x - 2, map.spawn.y - 2, 5, 5, '#00ff00')
    for (const p of map.pickupSpots) g.rect(p.x - 1, p.y - 1, 3, 3, scene.grid.freeAt(p.x, p.y) ? '#ffffff' : '#ff0000')
  }
  const card = document.createElement('div')
  card.className = 'card'
  const label = document.createElement('div')
  label.className = 't'
  label.textContent = `${id}  ${map.w}×${map.h}${map.indoor ? ' (indoor)' : ''}`
  const c = document.createElement('canvas')
  c.width = map.w * scale
  c.height = map.h * scale
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(g.canvas, 0, 0, map.w * scale, map.h * scale)
  card.append(label, c)
  root.appendChild(card)
  // Sanity checks.
  for (const h of map.hotspots) if (!scene.grid.freeAt(h.at.x, h.at.y)) console.warn(id, 'hotspot at blocked', h.id)
  for (const p of map.pickupSpots) if (!scene.grid.freeAt(p.x, p.y)) console.warn(id, 'pickup blocked', p.x, p.y)
  for (const [from, e] of Object.entries(map.entries ?? {})) if (!scene.grid.freeAt(e.x, e.y)) console.warn(id, 'entry blocked', from)
  if (!scene.grid.freeAt(map.spawn.x, map.spawn.y)) console.warn(id, 'spawn blocked')
  // Every hotspot must be reachable from the spawn.
  for (const h of map.hotspots) if (!scene.grid.find(map.spawn.x, map.spawn.y, h.at.x, h.at.y)) console.warn(id, 'unreachable', h.id)
}

for (const id of ids) {
  try {
    renderMap(id)
  } catch (e) {
    console.error(id, e)
  }
}
;(window as unknown as Record<string, unknown>).__done = true
