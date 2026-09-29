// Dev page for the southern place maps (dev-south.html): renders every map of
// the `south` group (plus the home temple maps it touches) as a full overview.
//   ?map=<id>        only this map (e.g. ai_khai, wat_chalong:chedi)
//   ?scale=2         zoom factor (default 1, or 2 for a single map)
//   ?debug=1         overlay obstacles, hotspot rects, `at` points and ids
//   ?t=6             seconds of simulation before the snapshot
//   ?phase=night     time of day (handled by sky.ts)

import { Surface } from '../engine/pixel'
import { WorldScene } from '../scenes/world'
import { mapFor } from '../scenes/maps'
import { MAPS } from '../scenes/maps/places/south'
import { game } from '../game/state'

const q = new URLSearchParams(location.search)
const root = document.getElementById('root')!
const nav = document.getElementById('nav')!

const EXTRA = ['wat', 'river']
const ids = q.get('map') ? [q.get('map')!] : [...Object.keys(MAPS), ...EXTRA]
const scale = +(q.get('scale') ?? (q.get('map') ? 2 : 1))
const debug = q.has('debug')
const pre = +(q.get('t') ?? 4)

for (const id of [...Object.keys(MAPS), ...EXTRA]) {
  const a = document.createElement('a')
  a.href = `?map=${encodeURIComponent(id)}${debug ? '&debug=1' : ''}`
  a.textContent = id
  nav.appendChild(a)
}

function overview(id: string) {
  const map = mapFor(id)
  const scene = new WorldScene(map, game.value.player.look, { onArrive: () => undefined, onSay: () => undefined }, { pickups: [] })
  const g = new Surface(map.w, map.h)
  scene.resize(map.w, map.h)
  const dt = 1 / 30
  let t = 0
  for (let i = 0; i < pre / dt; i++) {
    t += dt
    scene.update(dt, t)
  }
  scene.render(g)
  const c = document.createElement('canvas')
  c.width = map.w * scale
  c.height = map.h * scale
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(g.canvas, 0, 0, c.width, c.height)
  if (debug) {
    ctx.save()
    ctx.scale(scale, scale)
    ctx.fillStyle = 'rgba(255,40,60,0.28)'
    for (let y = 0; y < scene.grid.rows; y++)
      for (let x = 0; x < scene.grid.cols; x++) if (scene.grid.blocked[y * scene.grid.cols + x]) ctx.fillRect(x * 4, y * 4, 4, 4)
    ctx.lineWidth = 1 / scale
    for (const h of map.hotspots) {
      ctx.strokeStyle = h.id.startsWith('door:') ? '#6cf0ff' : h.id.startsWith('job:') ? '#9dff6a' : h.id.startsWith('shop:') ? '#ff9fe0' : '#ffe27a'
      ctx.strokeRect(h.rect.x + 0.5, h.rect.y + 0.5, h.rect.w - 1, h.rect.h - 1)
      ctx.fillStyle = scene.grid.freeAt(h.at.x, h.at.y) ? '#00ffff' : '#ff0000'
      ctx.fillRect(h.at.x - 1, h.at.y - 1, 3, 3)
      ctx.fillStyle = '#ffffff'
      ctx.font = `${Math.max(4, 8 / scale)}px sans-serif`
      ctx.fillText(h.id, h.rect.x + 1, h.rect.y + 7)
    }
    ctx.fillStyle = '#ff00ff'
    for (const p of map.pickupSpots) ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(map.spawn.x - 2, map.spawn.y - 2, 4, 4)
    for (const e of Object.values(map.entries ?? {})) {
      ctx.fillStyle = '#6cf0ff'
      ctx.fillRect(e.x - 2, e.y - 2, 4, 4)
    }
    ctx.restore()
  }
  const card = document.createElement('div')
  card.className = 'card'
  const label = document.createElement('b')
  label.textContent = `${id}  (${map.w}×${map.h})`
  card.append(label, c)
  root.appendChild(card)
  // Sanity checks in the console.
  for (const h of map.hotspots) if (!scene.grid.freeAt(h.at.x, h.at.y)) console.warn(id, 'hotspot at blocked', h.id)
  for (const p of map.pickupSpots) if (!scene.grid.freeAt(p.x, p.y)) console.warn(id, 'pickup blocked', p.x, p.y)
  for (const [from, e] of Object.entries(map.entries ?? {})) if (!scene.grid.freeAt(e.x, e.y)) console.warn(id, 'entry blocked', from)
  for (const h of map.hotspots) {
    if (!h.id.startsWith('door:')) continue
    const to = h.id.slice(5)
    const target = mapFor(to)
    if (!target.entries?.[id]) console.warn(id, 'door target has no entry back', to)
  }
  if (!map.indoor && !map.hotspots.some((h) => h.id === 'gate')) console.warn(id, 'no gate hotspot')
  for (const h of map.hotspots) {
    const path = scene.grid.find(map.spawn.x, map.spawn.y, h.at.x, h.at.y)
    if (!path) console.warn(id, 'unreachable hotspot', h.id)
  }
}

for (const id of ids) {
  try {
    overview(id)
  } catch (e) {
    console.error(id, e)
  }
}
;(window as unknown as Record<string, unknown>).__southReady = true
