// Dev-only preview of the temple mini-game action poses and the HD monk:
// open /dev-temple.html while running vite. ?z=4 zoom, ?p=name,name (or
// monk) to filter, ?l=0,1,2 picks the sample looks.
import { dollSprite, dollDefaultLook } from '../art/doll'
import type { AvatarLook } from '../art/avatar'
import { hdMonkSprite, type HdMonkFrame } from '../art/minigames/monk'
import { T_POSE_NAMES, tPoseViews, tWrist, tp, type TPose } from '../art/poses/temple'
import type { Sprite } from '../engine/sprite'

const root = document.getElementById('g')!
const params = new URLSearchParams(location.search)
const Z = Number(params.get('z') ?? 4)
const only = params.get('p')?.split(',')

window.addEventListener('error', (e) => {
  document.getElementById('err')!.textContent += `${e.message}\n`
})

const LOOKS: AvatarLook[] = [
  dollDefaultLook('m'),
  dollDefaultLook('f'),
  { ...dollDefaultLook('f'), top: 'top_white', bottom: 'bot_sarong', hair: 'hair_bun' } as AvatarLook,
]

const grid = document.createElement('div')
grid.className = 'row'
root.appendChild(grid)

function cell(s: Sprite, label: string, mark?: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = s.w
  c.height = s.h
  c.style.width = `${s.w * Z}px`
  c.style.height = `${s.h * Z}px`
  const ctx = c.getContext('2d')!
  ctx.drawImage(s.canvas, 0, 0)
  mark?.(ctx)
  const el = document.createElement('div')
  el.className = 'cell'
  el.appendChild(c)
  const l = document.createElement('div')
  l.textContent = label
  el.appendChild(l)
  grid.appendChild(el)
}

if (!only || only.includes('monk')) {
  const frames: ['side' | 'front', HdMonkFrame, boolean][] = [
    ['side', 'stand', false],
    ['side', 'walk1', false],
    ['side', 'walk2', false],
    ['side', 'receive', false],
    ['side', 'receive', true],
    ['front', 'stand', false],
    ['front', 'bless', false],
    ['front', 'chant', true],
  ]
  for (const [view, fr, nov] of frames) cell(hdMonkSprite(view, fr, { novice: nov, skin: nov ? 2 : 1, fill: 2 }), `monk ${view} ${fr}${nov ? ' nov' : ''}`)
}

const lookIdx = (params.get('l') ?? '0,1,2').split(',').map(Number)
for (const name of T_POSE_NAMES as TPose[]) {
  if (only && !only.includes(name)) continue
  for (const view of tPoseViews(name))
    for (const look of lookIdx.map((i) => LOOKS[i]))
      cell(dollSprite(look, tp(name), { view }), `${name} ${view[0]}`, (ctx) => {
        for (const side of [1, -1] as const) {
          const w = tWrist(name, view, side, look.gender)
          if (!w) continue
          ctx.fillStyle = side === 1 ? 'rgba(255,0,0,0.7)' : 'rgba(0,160,255,0.7)'
          ctx.fillRect(Math.floor(w[0]), Math.floor(w[1]), 1, 1)
        }
      })
}
