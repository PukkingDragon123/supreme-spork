// Dev page for the walkable worlds (dev-world.html).
//   ?area=wat|shrine|river|mountain   pick an area
//   ?phase=dawn|day|golden|dusk|night force the time of day (handled in sky.ts)
//   ?x=&y=                             spawn point
//   ?cam=x,y                           free camera position (world px)
//   ?chrome=1                          draw mock HUD chrome (64px top, 84px bottom)
//   ?pickups=1                         scatter test pickups on the map's pickup spots
//   ?sprites=1&zoom=3                  sprite sheet of the temple art instead
// window.__world exposes the scene for scripted screenshots.

import { Stage } from '../engine/stage'
import { WorldScene } from '../scenes/world'
import { mapFor } from '../scenes/maps'
import { game } from '../game/state'
import type { AreaId } from '../game/data/areas'
import type { Sprite } from '../engine/sprite'
import { DEV_SPRITES } from './worldSprites'

const q = new URLSearchParams(location.search)
const host = document.getElementById('host')!
const log = document.getElementById('log')!

function sheet() {
  host.remove()
  const root = document.createElement('div')
  root.id = 'sprites'
  document.body.appendChild(root)
  const zoom = +(q.get('zoom') ?? 3)
  const only = q.get('only')
  for (const [name, make] of Object.entries(DEV_SPRITES)) {
    if (only && !name.includes(only)) continue
    const wrap = document.createElement('div')
    wrap.style.display = 'inline-block'
    wrap.style.margin = '4px'
    const label = document.createElement('div')
    label.textContent = name
    wrap.appendChild(label)
    const s: Sprite = make()
    const c = document.createElement('canvas')
    c.width = s.w * zoom
    c.height = s.h * zoom
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(s.canvas, 0, 0, s.w * zoom, s.h * zoom)
    wrap.appendChild(c)
    root.appendChild(wrap)
  }
}

function world() {
  const area = (q.get('area') ?? 'wat') as AreaId
  const map = mapFor(area)
  const spawn = q.has('x') ? { x: +q.get('x')!, y: +q.get('y')! } : undefined
  const pickups = q.has('pickups')
    ? map.pickupSpots.map((p, i) => ({ id: 'p' + i, kind: (['wood', 'cloth', 'clay', 'gold', 'flower'] as const)[i % 5], x: p.x, y: p.y }))
    : []
  const stage = new Stage(host, { targetWidth: +(q.get('tw') ?? 180) })
  const scene = new WorldScene(
    map,
    game.value.player.look,
    {
      onArrive: (t) => (log.textContent = 'arrive ' + (t.kind === 'hotspot' ? t.hotspot.id : 'dog ' + t.id)),
      onMove: () => undefined,
      onPickup: (id, kind) => (log.textContent = `pickup ${id} ${kind}`),
      onNear: (h) => (log.textContent = 'near ' + (h?.id ?? '-')),
      onSay: q.has('pixelbubbles') ? undefined : () => undefined,
    },
    { spawn, pickups, companion: q.get('dog') },
  )
  stage.setScene(scene)
  stage.start()
  if (q.has('cam')) {
    const [cx, cy] = q.get('cam')!.split(',').map(Number)
    scene.lookAt(cx, cy)
  }
  if (q.has('chrome')) {
    const top = document.createElement('div')
    top.className = 'chrome'
    Object.assign(top.style, { left: '8px', top: '8px', width: '150px', height: '52px' })
    const coins = document.createElement('div')
    coins.className = 'chrome'
    Object.assign(coins.style, { right: '8px', top: '8px', width: '96px', height: '40px' })
    const bot = document.createElement('div')
    bot.className = 'chrome'
    Object.assign(bot.style, { left: '8px', right: '8px', bottom: '8px', height: '72px' })
    document.body.append(top, coins, bot)
  }
  const bad = map.pickupSpots.filter((p) => !scene.grid.freeAt(p.x, p.y))
  if (bad.length) console.warn('unwalkable pickup spots', JSON.stringify(bad))
  for (const h of map.hotspots) if (!scene.grid.freeAt(h.at.x, h.at.y)) console.warn('hotspot at blocked', h.id)
  // Reference DOM overlay for scenery speech bubbles (Thai text).
  const layer = document.createElement('div')
  Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', font: '500 13px Mitr, sans-serif' })
  document.body.appendChild(layer)
  const pool: HTMLDivElement[] = []
  const tick = () => {
    const bs = scene.speechBubbles()
    while (pool.length < bs.length) {
      const d = document.createElement('div')
      Object.assign(d.style, { position: 'absolute', transform: 'translate(-50%, -100%)', background: '#fffaf0', color: '#3a2838', border: '2px solid #3a2838', borderRadius: '10px', padding: '2px 8px', whiteSpace: 'nowrap', boxShadow: '0 2px 0 rgba(58,40,56,.3)' })
      layer.appendChild(d)
      pool.push(d)
    }
    pool.forEach((d, i) => {
      const b = bs[i]
      d.style.display = b ? 'block' : 'none'
      if (!b) return
      const [x, y] = stage.toCss(b.x, b.y)
      d.textContent = b.text
      d.style.left = x + 'px'
      d.style.top = y + 'px'
      d.style.opacity = String(b.alpha)
    })
    requestAnimationFrame(tick)
  }
  tick()
  ;(window as unknown as Record<string, unknown>).__world = scene
  ;(window as unknown as Record<string, unknown>).__stage = stage
}

if (q.has('sprites')) sheet()
else world()
