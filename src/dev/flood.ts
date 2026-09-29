// Dev art sheet for the flood event: open /dev-flood.html while running vite
// (?z=<zoom>, ?t=<time> freezes the animation clock).
import { Surface } from '../engine/pixel'
import * as F from '../art/flood'
import { EVENT_ICON_NAMES, eventIconSprite } from '../art/eventIcons'
import { FloodSim, type SurvivorKind } from '../activities/flood/sim'

const q = new URLSearchParams(location.search)
const Z = Number(q.get('z') ?? 3)
const W = 260
const H = 520
const el = document.getElementById('c') as HTMLCanvasElement
el.style.width = `${W * Z}px`
el.style.height = `${H * Z}px`
const g = new Surface(W, H, el)
const sim = new FloodSim({ seed: 'dev', w: 195 })
const kinds: SurvivorKind[] = ['granny', 'kid', 'man', 'woman', 'uncle', 'auntie', 'cat', 'vipcat', 'dog', 'chicken', 'buffalo']

function frame(t: number) {
  g.reset()
  g.clear('#3a3448')
  // Row 1: survivors (both frames) + happy.
  let x = 4
  for (const k of kinds) {
    for (let f = 0; f < 2; f++) {
      const s = F.survivorSprite(k, f)
      g.draw(s.canvas, x, 4)
      x += s.w + 1
    }
    x += 2
    if (x > W - 30) break
  }
  x = 4
  for (const k of kinds) {
    const s = F.survivorSprite(k, 0, true)
    g.draw(s.canvas, x, 24)
    x += s.w + 3
  }
  const crew = F.rescuerSprite(0)
  g.draw(crew.canvas, x + 2, 24)
  const tub = F.rescueDogSprite(0)
  g.draw(tub.canvas, x + 16, 24)
  const monk = F.monkSprite(1)
  g.draw(monk.canvas, x + 32, 24)
  // Row 2: big placeholders + icons.
  g.draw(F.rescuerBigSprite().canvas, 4, 44)
  g.draw(F.rescueDogBigSprite().canvas, 28, 52)
  x = 56
  let y = 44
  for (const n of EVENT_ICON_NAMES) {
    g.draw(eventIconSprite(n).canvas, x, y)
    x += 18
    if (x > W - 18) (x = 56), (y += 18)
  }
  // Water strip with houses at several flood levels.
  const wy = 110
  F.drawWater(g, 0, wy, W, 120, t, [{ y: wy + 100, h: 20, dir: 1, speed: 20 }], 0.2)
  const styles = ['stilt', 'hut', 'shop', 'tuktuk', 'shed', 'mound'] as const
  styles.forEach((st, i) => {
    const h = { ...sim.houses[0], style: st, x: 22 + i * 42, y: wy + 58, w: st === 'shop' ? 34 : st === 'tuktuk' ? 22 : 28, tone: i }
    F.drawHouse(g, h, (i % 3) * 0.3, t)
    const geo = F.houseGeom(st)
    const s = F.survivorSprite(kinds[i], Math.floor(t * 3))
    g.draw(s.canvas, h.x - Math.floor(s.w / 2), h.y - geo.top - s.h + 2)
  })
  // Water things.
  const oy = wy + 90
  F.drawObstacle(g, { kind: 'palm', x: 14, y: oy + 18, r: 6 }, t)
  F.drawObstacle(g, { kind: 'pole', x: 34, y: oy + 18, r: 3 }, t)
  F.drawObstacle(g, { kind: 'banana', x: 52, y: oy + 18, r: 6 }, t)
  const dk = ['log', 'tire', 'fridge', 'sofa', 'barrel'] as const
  dk.forEach((kind, i) => F.drawDebris(g, { id: i, kind, x: 76 + i * 20, y: oy + 14, vx: 0, vy: 0, r: 6, spin: 0 }, t))
  const fk = ['ring', 'bowl', 'duck', 'chair'] as const
  fk.forEach((kind, i) => F.drawFloaty(g, { id: i, kind, x: 184 + i * 18, y: oy + 14, vx: 0, vy: 0, ph: i }, t))
  // Row: rafts, powers, lizard.
  const ry = wy + 150
  F.drawWater(g, 0, ry - 12, W, 110, t, [], 0.3)
  const rk = ['ring', 'basin', 'door', 'basket'] as const
  rk.forEach((kind, i) => {
    F.drawRaft(g, 14 + i * 22, ry, kind)
    const s = F.survivorSprite(kinds[i + 5], 0)
    g.drawPart(s.canvas, 0, 0, s.w, s.h - 4, 14 + i * 22 - Math.floor(s.w / 2), ry - s.h + 3)
  })
  ;(['rice', 'dog', 'ring'] as const).forEach((kind, i) => F.drawPower(g, { id: i, kind, x: 110 + i * 22, y: ry, t: 0, life: 99 }, t))
  F.drawLizard(g, { x: 200, y: ry, dir: 1, t, dove: false }, t)
  // Boats at angles with crew and passengers.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const bx = 22 + i * 40
    const by = ry + 50
    const seats = F.drawHull(g, bx, by, a, t, 20)
    void seats
    const pax: SurvivorKind[] = ['kid', 'cat', 'granny', 'dog']
    const list: [number, number, SurvivorKind | 'crew'][] = [0, 1, 2].map((k) => [...F.seatPos(bx, by, a, k), pax[(k + i) % 4]] as [number, number, SurvivorKind])
    list.push([...F.seatPos(bx, by, a, 3), 'crew'])
    list.sort((p, q2) => p[1] - q2[1])
    for (const [sx, sy, who] of list) {
      const s = who === 'crew' ? F.rescuerSprite(0) : F.survivorSprite(who, 0)
      g.drawPart(s.canvas, 0, 0, s.w, s.h - 4, Math.round(sx - s.w / 2), Math.round(sy - s.h + 5))
    }
  }
  // Hill + banner.
  const hill = F.bakeHill(195, 100)
  g.draw(hill, 0, 330)
  const ban = F.floodBanner(160, 72)
  g.draw(ban, 0, 444)
}

const T = q.get('t')
if (T) frame(Number(T))
else {
  const loop = (now: number) => {
    frame(now / 1000)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
