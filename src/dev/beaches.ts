// Dev page for the beaches (dev-beaches.html): renders every beach map as a
// full overview and runs sanity checks.
//   ?map=<id>        only this map (e.g. beach_samila)
//   ?scale=2         zoom factor (default 1, or 2 for a single map)
//   ?debug=1         overlay obstacles, water, hotspot rects, `at` points and ids
//   ?t=6             seconds of simulation before the snapshot
//   ?phase=golden    time of day (handled by sky.ts)
// Checks (listed under each map, in the console and in `window.__beachChecks`):
// hotspot `at` points free and reachable from the spawn, pickups free and
// reachable, doors lead back, a gate exists, every `shop:` has a stall with
// known snacks, every `beach:<game>` is a known game listed for the beach
// (and every listed game has a hotspot), a merit landmark exists, quest
// givers stand on free, reachable ground and have quests, water exists.

import { Surface } from '../engine/pixel'
import { WorldScene } from '../scenes/world'
import { mapFor } from '../scenes/maps'
import { MAPS } from '../scenes/maps/places/beaches'
import { game } from '../game/state'
import { PLACE_SHOPS, SNACK_BY_ID } from '../game/data/placeShops'
import { PLACE_BY_ID } from '../game/data/places'
import { BEACH_GAMES, BEACH_META, type BeachGameId, type BeachId } from '../game/data/beaches'
import { NPC_QUESTS } from '../game/data/npcQuests'
import { npcAt, questNpcsOn } from '../game/data/questNpcs'

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
  const reach = (x: number, y: number) => !!scene.grid.find(map.spawn.x, map.spawn.y, x, y)
  for (const h of map.hotspots) if (!scene.grid.freeAt(h.at.x, h.at.y)) warn(`hotspot at blocked: ${h.id}`)
  for (const h of map.hotspots) if (!reach(h.at.x, h.at.y)) warn(`unreachable hotspot ${h.id}`)
  for (const p of map.pickupSpots) if (!scene.grid.freeAt(p.x, p.y)) warn(`pickup blocked ${p.x},${p.y}`)
  for (const p of map.pickupSpots) if (!reach(p.x, p.y)) warn(`pickup unreachable ${p.x},${p.y}`)
  if (!scene.grid.freeAt(map.spawn.x, map.spawn.y)) warn('spawn blocked')
  for (const h of map.hotspots) {
    if (!h.id.startsWith('door:')) continue
    const to = h.id.slice(5)
    if (!mapFor(to).entries?.[id]) warn(`door target has no entry back: ${to}`)
  }
  if (!map.hotspots.some((h) => h.id === 'gate')) warn('no gate hotspot')
  if (PLACE_BY_ID[id]?.kind !== 'beach') warn('no beach place entry for this map id')
  const meta = BEACH_META[id as BeachId]
  if (!meta) warn('no BEACH_META entry')
  const games = map.hotspots.filter((h) => h.id.startsWith('beach:')).map((h) => h.id.slice(6))
  for (const g of games) {
    if (!(g in BEACH_GAMES)) warn(`unknown beach game ${g}`)
    else if (meta && !meta.games.includes(g as BeachGameId)) warn(`game ${g} not listed in BEACH_META`)
  }
  for (const g of meta?.games ?? []) if (!games.includes(g)) warn(`listed game without hotspot: ${g}`)
  if (!map.hotspots.some((h) => ['incense', 'donation', 'bells', 'alms'].includes(h.id))) warn('no merit landmark hotspot')
  const shops = map.hotspots.filter((h) => h.id.startsWith('shop:'))
  if (shops.length < 2) warn(`only ${shops.length} shop hotspots`)
  for (const h of shops) {
    const sid = h.id.slice(5)
    const shop = PLACE_SHOPS[sid]
    if (!shop) warn(`shop without PLACE_SHOPS entry: ${sid}`)
    else {
      if (shop.place !== id) warn(`shop ${sid} place is ${shop.place}`)
      for (const sn of shop.snacks) if (!SNACK_BY_ID[sn]) warn(`shop ${sid} unknown snack ${sn}`)
    }
  }
  const npcs = questNpcsOn(id)
  if (npcs.length < 2) warn(`${npcs.length} quest givers (want 2+)`)
  for (const n of npcs) {
    const at = npcAt(n)
    if (!scene.grid.freeAt(at.x, at.y)) warn(`npc ${n.id} stand spot blocked`)
    else if (!reach(at.x, at.y)) warn(`npc ${n.id} unreachable`)
    if (!NPC_QUESTS.some((x) => x.giver === `npc:${n.id}`)) warn(`npc without quest: ${n.id}`)
  }
  if (!map.water?.length) warn('no water rects')
  const all = map.hotspots.map((h) => h.id)
  const dup = all.filter((x, i) => all.indexOf(x) !== i)
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
    ctx.strokeStyle = '#40a0ff'
    ctx.lineWidth = 1 / scale
    for (const w of map.water ?? []) ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1)
    for (const h of map.hotspots) {
      ctx.strokeStyle = h.id.startsWith('beach:') ? '#6cf0ff' : h.id.startsWith('npc:') ? '#9dff6a' : h.id.startsWith('shop:') ? '#ff9fe0' : '#ffe27a'
      ctx.strokeRect(h.rect.x + 0.5, h.rect.y + 0.5, h.rect.w - 1, h.rect.h - 1)
      ctx.fillStyle = scene.grid.freeAt(h.at.x, h.at.y) ? '#00ffff' : '#ff0000'
      ctx.fillRect(h.at.x - 1, h.at.y - 1, 3, 3)
      ctx.fillStyle = '#ffffff'
      ctx.font = `${Math.max(4, 8 / scale)}px sans-serif`
      ctx.fillText(h.id.replace(/^shop:beach_[a-z]+_/, 'shop:'), h.rect.x + 1, h.rect.y + 7)
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
;(window as unknown as Record<string, unknown>).__beachChecks = report
;(window as unknown as Record<string, unknown>).__beachesReady = true
