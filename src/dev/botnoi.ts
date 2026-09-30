// Dev-only Bot Noi preview: open /dev-botnoi.html while running `npm run dev`.
//   ?z=6 (world sprite zoom)  &pz=4 (portrait zoom)  &s=world,portrait,scene
import { BOT_ARMS, BOT_EXPRS, botnoiPortrait, botnoiSprite, botnoiHeadIcon } from '../art/botnoi'
import { avatarSprite, DEFAULT_LOOK } from '../art/avatar'
import type { Sprite } from '../engine/sprite'

const root = document.getElementById('g')!
const q = new URLSearchParams(location.search)
const Z = Number(q.get('z') ?? 6)
const PZ = Number(q.get('pz') ?? 4)
const sec = q.get('s') ?? 'all'
const want = (s: string) => sec === 'all' || sec.split(',').includes(s)

window.addEventListener('error', (e) => {
  document.getElementById('err')!.textContent += `${e.message}\n`
})

function canvasOf(s: Sprite, z: number) {
  const c = document.createElement('canvas')
  c.width = s.w
  c.height = s.h
  c.style.width = `${s.w * z}px`
  c.style.height = `${s.h * z}px`
  c.getContext('2d')!.drawImage(s.canvas, 0, 0)
  return c
}

function cell(label: string, s: Sprite, z: number, cls = '') {
  const d = document.createElement('div')
  d.className = `cell ${cls}`
  d.appendChild(canvasOf(s, z))
  const t = document.createElement('span')
  t.textContent = label
  d.appendChild(t)
  return d
}

function section(title: string) {
  const h = document.createElement('h3')
  h.textContent = title
  root.appendChild(h)
  const r = document.createElement('div')
  r.className = 'row'
  root.appendChild(r)
  return r
}

if (want('world')) {
  const r = section('world: expressions')
  for (const e of BOT_EXPRS) r.appendChild(cell(e, botnoiSprite({ expr: e, glow: true }), Z))
  const r2 = section('world: arms / flame / flip')
  for (const a of BOT_ARMS) r2.appendChild(cell(a, botnoiSprite({ arm: a }), Z, 'grass'))
  for (let f = 0; f < 3; f++) r2.appendChild(cell(`flame ${f}`, botnoiSprite({ flame: f }), Z, 'night'))
  r2.appendChild(cell('flip point', botnoiSprite({ arm: 'point', flip: true }), Z, 'grass'))
  r2.appendChild(cell('head', botnoiHeadIcon('happy'), Z))
}
if (want('portrait')) {
  const r = section('portrait: expressions')
  for (const e of BOT_EXPRS) r.appendChild(cell(e, botnoiPortrait({ expr: e, glow: e === 'happy' }), PZ))
  const r2 = section('portrait: arms / talk')
  for (const a of BOT_ARMS) r2.appendChild(cell(a, botnoiPortrait({ arm: a, expr: 'happy' }), PZ, 'grass'))
  r2.appendChild(cell('talk', botnoiPortrait({ talk: true }), PZ))
  r2.appendChild(cell('glow night', botnoiPortrait({ glow: true, flame: 1 }), PZ, 'night'))
}
if (want('scene')) {
  const r = section('scale vs player (1x, zoom)')
  const c = document.createElement('canvas')
  c.width = 60
  c.height = 44
  c.style.width = `${60 * Z}px`
  c.style.height = `${44 * Z}px`
  c.style.imageRendering = 'pixelated'
  const g = c.getContext('2d')!
  g.fillStyle = '#b4e486'
  g.fillRect(0, 0, 60, 44)
  const p = avatarSprite(DEFAULT_LOOK, 'front', 'stand')
  g.drawImage(p.canvas, 14, 44 - p.h - 2)
  const b = botnoiSprite({ expr: 'happy', arm: 'wave', glow: true })
  g.drawImage(b.canvas, 36, 44 - p.h - 6)
  r.appendChild(c)
}
