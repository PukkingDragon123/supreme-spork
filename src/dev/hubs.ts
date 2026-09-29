// Dev page for the hub markets and the temple fair (dev-hubs.html): renders
// every map of the `hubs` group as a full overview and runs sanity checks.
//   ?map=<id>        only this map (e.g. hub_maeklong, fair_temple)
//   ?scale=2         zoom factor (default 1, or 2 for a single map)
//   ?debug=1         overlay obstacles, hotspot rects, `at` points and ids
//   ?t=6             seconds of simulation before the snapshot
//   ?phase=night     time of day (handled by sky.ts)
// Checks (listed under each map and in the console, `window.__hubChecks`):
// hotspot `at` points free and reachable from the spawn, pickups/entries
// free, doors lead back, a gate exists, every `shop:` has a stall entry,
// every `npc:` has a quest, the notice board exists, `fair:` games are known.

import { Surface } from '../engine/pixel'
import { WorldScene } from '../scenes/world'
import { mapFor } from '../scenes/maps'
import { MAPS } from '../scenes/maps/places/hubs'
import { game } from '../game/state'
import { PLACE_SHOPS, SNACK_BY_ID } from '../game/data/placeShops'
import { HUB_QUESTS } from '../game/data/npcQuests/hubs'
import { FAIR_GAMES, HUB_META } from '../game/hubs'
import { PLACE_BY_ID } from '../game/data/places'
import { HUB_COLLECTIBLE_BY_ID } from '../game/data/collectibles/hubs'

const q = new URLSearchParams(location.search)
const root = document.getElementById('root')!
const nav = document.getElementById('nav')!

const ids = q.get('map') ? [q.get('map')!] : Object.keys(MAPS)
const scale = +(q.get('scale') ?? (q.get('map') ? 2 : 1))
const debug = q.has('debug')
const pre = +(q.get('t') ?? 4)
const report: Record<string, string[]> = {}

for (const id of Object.keys(MAPS)) {
  const a = document.createElement('a')
  a.href = `?map=${encodeURIComponent(id)}${debug ? '&debug=1' : ''}`
  a.textContent = id
  nav.appendChild(a)
}

function checks(id: string, scene: WorldScene): string[] {
  const map = scene.map
  const out: string[] = []
  const warn = (s: string) => out.push(s)
  for (const h of map.hotspots) if (!scene.grid.freeAt(h.at.x, h.at.y)) warn(`hotspot at blocked: ${h.id}`)
  for (const p of map.pickupSpots) if (!scene.grid.freeAt(p.x, p.y)) warn(`pickup blocked ${p.x},${p.y}`)
  for (const p of map.pickupSpots) if (!scene.grid.find(map.spawn.x, map.spawn.y, p.x, p.y)) warn(`pickup unreachable ${p.x},${p.y}`)
  for (const [from, e] of Object.entries(map.entries ?? {})) if (!scene.grid.freeAt(e.x, e.y)) warn(`entry blocked from ${from}`)
  if (!scene.grid.freeAt(map.spawn.x, map.spawn.y)) warn('spawn blocked')
  for (const h of map.hotspots) {
    if (!h.id.startsWith('door:')) continue
    const to = h.id.slice(5)
    const target = mapFor(to)
    if (!target.entries?.[id]) warn(`door target has no entry back: ${to}`)
  }
  if (!map.indoor && !map.hotspots.some((h) => h.id === 'gate')) warn('no gate hotspot')
  for (const h of map.hotspots) if (!scene.grid.find(map.spawn.x, map.spawn.y, h.at.x, h.at.y)) warn(`unreachable hotspot ${h.id}`)
  // Hub contracts.
  if (!PLACE_BY_ID[id]) warn('no place entry for this map id')
  if (!HUB_META[id]) warn('no HUB_META entry')
  if (!map.hotspots.some((h) => h.id === `board:${id}`)) warn('no notice board hotspot')
  const shops = map.hotspots.filter((h) => h.id.startsWith('shop:'))
  if (shops.length < 3) warn(`only ${shops.length} shop hotspots`)
  for (const h of shops) {
    const sid = h.id.slice(5)
    const shop = PLACE_SHOPS[sid]
    if (!shop) warn(`shop without PLACE_SHOPS entry: ${sid}`)
    else {
      if (shop.place !== id) warn(`shop ${sid} place is ${shop.place}`)
      for (const sn of shop.snacks) if (!SNACK_BY_ID[sn]) warn(`shop ${sid} unknown snack ${sn}`)
    }
  }
  const npcs = map.hotspots.filter((h) => h.id.startsWith('npc:'))
  if (npcs.length < 2 || npcs.length > 4) warn(`${npcs.length} quest givers (want 2-4)`)
  for (const h of npcs) {
    const qs = HUB_QUESTS.filter((x) => x.giver === h.id)
    if (!qs.length) warn(`npc without quest: ${h.id}`)
    for (const x of qs) if (x.map !== id) warn(`quest ${x.id} map is ${x.map}`)
  }
  for (const x of HUB_QUESTS.filter((x) => x.map === id)) {
    if (!npcs.some((h) => h.id === x.giver)) warn(`quest ${x.id}: giver ${x.giver} not on map`)
    for (const c of Object.keys(x.reward.collectibles ?? {})) if (!HUB_COLLECTIBLE_BY_ID[c]) warn(`quest ${x.id}: unknown collectible ${c}`)
  }
  for (const h of map.hotspots.filter((h) => h.id.startsWith('fair:'))) {
    const g = h.id.slice(5)
    if (g !== 'prizes' && !(g in FAIR_GAMES)) warn(`unknown fair game ${g}`)
  }
  const ids = map.hotspots.map((h) => h.id)
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
  if (dup.length) warn(`duplicate hotspot ids: ${dup.join(', ')}`)
  return out
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
      ctx.strokeStyle = h.id.startsWith('door:') ? '#6cf0ff' : h.id.startsWith('npc:') ? '#9dff6a' : h.id.startsWith('shop:') ? '#ff9fe0' : h.id.startsWith('fair:') ? '#ffb35a' : '#ffe27a'
      ctx.strokeRect(h.rect.x + 0.5, h.rect.y + 0.5, h.rect.w - 1, h.rect.h - 1)
      ctx.fillStyle = scene.grid.freeAt(h.at.x, h.at.y) ? '#00ffff' : '#ff0000'
      ctx.fillRect(h.at.x - 1, h.at.y - 1, 3, 3)
      ctx.fillStyle = '#ffffff'
      ctx.font = `${Math.max(4, 8 / scale)}px sans-serif`
      ctx.fillText(h.id.replace(/^shop:hub_[a-z]+_|^shop:fair_temple_/, 'shop:'), h.rect.x + 1, h.rect.y + 7)
    }
    ctx.fillStyle = '#ff00ff'
    for (const p of map.pickupSpots) ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(map.spawn.x - 2, map.spawn.y - 2, 4, 4)
    ctx.restore()
  }
  const card = document.createElement('div')
  card.className = 'card'
  const label = document.createElement('b')
  label.textContent = `${id}  (${map.w}×${map.h}) · ${map.hotspots.length} hotspots`
  const res = checks(id, scene)
  report[id] = res
  for (const r of res) console.warn(id, r)
  const list = document.createElement('div')
  list.className = res.length ? 'checks' : 'checks ok'
  list.textContent = res.length ? res.map((r) => `✗ ${r}`).join('\n') : '✓ all checks passed'
  card.append(label, list, c)
  root.appendChild(card)
}

for (const id of ids) {
  try {
    overview(id)
  } catch (e) {
    console.error(id, e)
    report[id] = [`error: ${(e as Error).message}`]
  }
}
;(window as unknown as Record<string, unknown>).__hubChecks = report
;(window as unknown as Record<string, unknown>).__hubsReady = true
