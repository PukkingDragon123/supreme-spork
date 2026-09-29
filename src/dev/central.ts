// Dev page for the central-region place maps (dev-central.html): renders
// every map (outdoor + interiors) as one full overview image.
//   ?only=<substring>   only maps whose id contains this
//   ?scale=1|2|3        integer zoom (default 1)
//   ?phase=night|dusk…  time of day (see sky.ts)
//   ?debug=1            overlay blocked cells (dark), hotspot rects (blue), `at` points and entries
//   ?crop=x,y,w,h       only this part of each map
// window.__central exposes the scenes for scripted checks.

import { Surface } from '../engine/pixel'
import { WorldScene } from '../scenes/world'
import { MAPS } from '../scenes/maps/places/central'
import { game } from '../game/state'

const q = new URLSearchParams(location.search)
const root = document.getElementById('root')!
const scale = +(q.get('scale') ?? 1)
const only = q.get('only')
const scenes: Record<string, WorldScene> = {}
const problems: string[] = []

for (const [id, make] of Object.entries(MAPS)) {
  if (only && !only.split(',').some((o) => (o.endsWith('$') ? id === o.slice(0, -1) : id.includes(o)))) continue
  const map = make()
  const scene = new WorldScene(map, game.value.player.look, { onArrive: () => undefined, onSay: () => undefined }, {})
  scenes[id] = scene
  scene.resize(map.w, map.h)
  let t = 0
  for (let i = 0; i < 40; i++) {
    t += 1 / 30
    scene.update(1 / 30, t)
  }
  const surf = new Surface(map.w, map.h)
  scene.render(surf)
  const g = surf
  for (const h of map.hotspots) if (!scene.grid.freeAt(h.at.x, h.at.y)) problems.push(`${id}: hotspot ${h.id} at blocked cell`)
  for (const p of map.pickupSpots) if (!scene.grid.freeAt(p.x, p.y)) problems.push(`${id}: pickup ${p.x},${p.y} blocked`)
  for (const [from, e] of Object.entries(map.entries ?? {})) if (!scene.grid.freeAt(e.x, e.y)) problems.push(`${id}: entry from ${from} blocked`)
  if (!scene.grid.freeAt(map.spawn.x, map.spawn.y)) problems.push(`${id}: spawn blocked`)
  for (const h of map.hotspots) {
    const path = scene.grid.find(map.spawn.x, map.spawn.y, h.at.x, h.at.y)
    if (!path) problems.push(`${id}: hotspot ${h.id} unreachable from spawn`)
  }
  if (q.has('debug')) {
    g.ctx.save()
    g.ctx.globalAlpha = 0.35
    g.ctx.fillStyle = '#200010'
    for (let y = 0; y < map.h; y += 4) for (let x = 0; x < map.w; x += 4) if (!scene.grid.freeAt(x + 2, y + 2)) g.ctx.fillRect(x, y, 4, 4)
    g.ctx.globalAlpha = 1
    g.ctx.strokeStyle = '#3aa0ff'
    for (const h of map.hotspots) g.ctx.strokeRect(h.rect.x + 0.5, h.rect.y + 0.5, h.rect.w, h.rect.h)
    g.ctx.fillStyle = '#00ffea'
    for (const h of map.hotspots) g.ctx.fillRect(h.at.x - 1, h.at.y - 1, 3, 3)
    g.ctx.fillStyle = '#ff00ff'
    for (const e of Object.values(map.entries ?? {})) g.ctx.fillRect(e.x - 1, e.y - 1, 3, 3)
    g.ctx.fillStyle = '#ffff00'
    for (const p of map.pickupSpots) g.ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
    g.ctx.restore()
  }
  const wrap = document.createElement('div')
  wrap.className = 'map'
  const h3 = document.createElement('h3')
  h3.textContent = `${id} (${map.w}×${map.h})`
  wrap.appendChild(h3)
  let [cx, cy, cw, ch] = [0, 0, map.w, map.h]
  if (q.has('crop')) [cx, cy, cw, ch] = q.get('crop')!.split(',').map(Number)
  const c = document.createElement('canvas')
  c.width = cw * scale
  c.height = ch * scale
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(surf.canvas, cx, cy, cw, ch, 0, 0, cw * scale, ch * scale)
  wrap.appendChild(c)
  root.appendChild(wrap)
}
if (problems.length) {
  const pre = document.createElement('pre')
  pre.style.color = '#ff8a7a'
  pre.textContent = problems.join('\n')
  document.body.prepend(pre)
  console.warn(problems.join('\n'))
}
;(window as unknown as Record<string, unknown>).__central = scenes
