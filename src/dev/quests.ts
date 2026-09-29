// Dev page for quest givers (dev-quests.html): renders a close-up of every
// quest NPC and quest-giving shop on its map, with the floating markers, and
// sanity-checks each spot (walkable feet and talk spot, reachable from the
// spawn, not on top of another hotspot).
//   ?only=<substring>   only maps whose id contains this
//   ?scale=2|3          zoom (default 3)
//   ?level=<n>          player level for the markers (default 1)
//   ?full=<mapId>       the whole map with NPCs (scale 1)
//   ?debug=1            overlay blocked cells and hotspot rects
// window.__quests exposes the scenes and the problem list for scripted checks.

import { Surface } from '../engine/pixel'
import { WorldScene } from '../scenes/world'
import { mapFor } from '../scenes/maps'
import { game, defaultState } from '../game/state'
import { meritForLevel } from '../game/economy'
import { allQuestNpcs, npcAt } from '../game/data/questNpcs'
import { questGivers, questMarkerFor } from '../game/npcQuests'
import { NPC_QUESTS } from '../game/data/npcQuests'

const q = new URLSearchParams(location.search)
const root = document.getElementById('root')!
const scale = +(q.get('scale') ?? 3)
const only = q.get('only')
const lvl = +(q.get('level') ?? 1)
game.value = { ...defaultState(), onboarded: true, merit: meritForLevel(lvl) }

const problems: string[] = []
const scenes: Record<string, WorldScene> = {}

const givers = questGivers()
// NPC maps plus the maps of quest-giving shops.
const maps = new Set<string>([...allQuestNpcs().map((n) => n.map), ...NPC_QUESTS.map((d) => d.map)])

function sceneFor(id: string): WorldScene {
  let sc = scenes[id]
  if (sc) return sc
  const map = mapFor(id)
  sc = new WorldScene(map, game.value.player.look, { onArrive: () => undefined, onSay: () => undefined }, {})
  sc.setMarkers(questMarkerFor)
  sc.resize(map.w, map.h)
  let t = 0
  for (let i = 0; i < 40; i++) {
    t += 1 / 30
    sc.update(1 / 30, t)
  }
  scenes[id] = sc
  return sc
}

function check(id: string, sc: WorldScene) {
  const m = sc.map
  for (const n of allQuestNpcs().filter((x) => x.map === id)) {
    const at = npcAt(n)
    if (!sc.grid.freeAt(n.x, n.y)) problems.push(`${id}: ${n.id} stands on a blocked cell`)
    if (!sc.grid.freeAt(at.x, at.y)) problems.push(`${id}: ${n.id} talk spot blocked`)
    if (!sc.grid.find(m.spawn.x, m.spawn.y, at.x, at.y)) problems.push(`${id}: ${n.id} unreachable from spawn`)
    for (const h of m.hotspots) {
      if (h.id === `npc:${n.id}`) continue
      if (Math.hypot(h.at.x - at.x, h.at.y - at.y) < 14) problems.push(`${id}: ${n.id} talk spot too close to ${h.id}`)
    }
  }
  for (const d of NPC_QUESTS) {
    if (d.map !== id) continue
    if (!m.hotspots.some((h) => h.id === d.giver)) problems.push(`${id}: giver ${d.giver} of ${d.id} not on map`)
  }
}

function render(sc: WorldScene): Surface {
  const m = sc.map
  const surf = new Surface(m.w, m.h)
  sc.render(surf)
  if (q.has('debug')) {
    const g = surf.ctx
    g.save()
    g.globalAlpha = 0.35
    g.fillStyle = '#200010'
    for (let y = 0; y < m.h; y += 4) for (let x = 0; x < m.w; x += 4) if (!sc.grid.freeAt(x + 2, y + 2)) g.fillRect(x, y, 4, 4)
    g.globalAlpha = 1
    g.strokeStyle = '#3aa0ff'
    for (const h of m.hotspots) g.strokeRect(h.rect.x + 0.5, h.rect.y + 0.5, h.rect.w, h.rect.h)
    g.fillStyle = '#00ffea'
    for (const h of m.hotspots) g.fillRect(h.at.x - 1, h.at.y - 1, 3, 3)
    g.restore()
  }
  return surf
}

function crop(surf: Surface, cx: number, cy: number, w: number, h: number, label: string) {
  const x0 = Math.max(0, Math.min(surf.canvas.width - w, Math.round(cx - w / 2)))
  const y0 = Math.max(0, Math.min(surf.canvas.height - h, Math.round(cy - h / 2)))
  const c = document.createElement('canvas')
  c.width = w * scale
  c.height = h * scale
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(surf.canvas, x0, y0, w, h, 0, 0, w * scale, h * scale)
  const wrap = document.createElement('div')
  wrap.className = 'shot'
  const t = document.createElement('div')
  t.textContent = label
  wrap.append(t, c)
  root.appendChild(wrap)
}

const full = q.get('full')
if (full) {
  const sc = sceneFor(full)
  check(full, sc)
  const surf = render(sc)
  crop(surf, sc.map.w / 2, sc.map.h / 2, sc.map.w, sc.map.h, full)
} else {
  for (const id of [...maps].sort()) {
    if (only && !id.includes(only)) continue
    const sc = sceneFor(id)
    check(id, sc)
    const surf = render(sc)
    for (const h of sc.map.hotspots) {
      if (!h.id.startsWith('npc:') && !givers.includes(h.id)) continue
      const mk = h.marker ?? { x: h.rect.x + h.rect.w / 2, y: h.rect.y - 4 }
      crop(surf, (h.at.x + mk.x) / 2, (h.at.y + mk.y) / 2, 110, Math.max(80, Math.abs(h.at.y - mk.y) + 40), `${id} · ${h.id}`)
    }
  }
}

if (problems.length) {
  const pre = document.createElement('pre')
  pre.style.color = '#ff8a7a'
  pre.textContent = problems.join('\n')
  document.body.prepend(pre)
  console.warn(problems.join('\n'))
}
;(window as unknown as Record<string, unknown>).__quests = { scenes, problems }
