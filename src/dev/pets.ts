// Dev-only pet preview: open /dev-pets.html while running `npm run dev`.
// Query params:
//   ?s=icons,scene,small,big (comma separated, default all)
//   &ids=naga,dragon (limit to some pets)   &z=4 (zoom for 1× sprites)
//   &f=down,side,up  &a=idle,walk,happy,sleep (limit facings / anims)
import { petFrames, petIcon, petSprite, type PetAnim, type PetFacing } from '../art/pets'
import { dollDefaultLook, dollSprite } from '../art/doll'
import { avatarSprite } from '../art/avatar'
import { PETS, RARITY, perkText } from '../game/data/pets'
import type { Sprite } from '../engine/sprite'

const root = document.getElementById('g')!
const params = new URLSearchParams(location.search)
const Z = Number(params.get('z') ?? 4)
const BZ = Number(params.get('bz') ?? 2)
const section = params.get('s') ?? 'all'
const want = (s: string) => section === 'all' || section.split(',').includes(s)
const idFilter = params.get('ids')?.split(',')
const pets = PETS.filter((p) => !idFilter || idFilter.includes(p.id))

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
function title(t: string) {
  const h = document.createElement('h3')
  h.textContent = t
  root.appendChild(h)
}
function row() {
  const r = document.createElement('div')
  r.className = 'row'
  root.appendChild(r)
  return r
}
function cell(parent: HTMLElement, label: string, sprites: [Sprite, number][], cls = '') {
  const c = document.createElement('div')
  c.className = 'cell ' + cls
  const p = document.createElement('div')
  p.className = 'pair'
  for (const [s, z] of sprites) p.appendChild(canvasOf(s, z))
  c.appendChild(p)
  const l = document.createElement('div')
  l.textContent = label
  c.appendChild(l)
  parent.appendChild(c)
  return c
}

const F = dollDefaultLook('f')
const M = dollDefaultLook('m')
const ANIMS = (params.get('a')?.split(',') ?? ['idle', 'walk', 'happy', 'sleep']) as PetAnim[]
const FACINGS = (params.get('f')?.split(',') ?? ['down', 'side', 'up']) as PetFacing[]

if (want('icons')) {
  title('shop icons (24×24) @3×')
  const r = row()
  for (const p of pets) {
    const c = cell(r, '', [[petIcon(p.id), 3]], 'card')
    c.lastElementChild!.innerHTML = `<div class="n">${p.name}</div><div style="color:${RARITY[p.rarity].color}">${RARITY[p.rarity].name}${p.premium ? ' (premium)' : ''}</div><div>${p.price} · ${perkText(p.perk)}</div>`
  }
}

if (want('scene')) {
  title('1× next to the small avatar (@4×)')
  const r = row()
  for (const p of pets) {
    cell(
      r,
      p.id,
      [
        [avatarSprite(p.id.length % 2 ? M : F, 'front', 'stand'), Z],
        [petSprite(p.id, 'down', 'idle', 0), Z],
        [petSprite(p.id, 'side', 'walk', 0, { flip: true }), Z],
      ],
      'grass',
    )
  }
  title(`2× next to the HD doll (@${BZ}×)`)
  const r2 = row()
  for (const p of pets) {
    cell(r2, p.id, [
      [dollSprite(p.id.length % 2 ? M : F, 'stand'), BZ],
      [petSprite(p.id, 'down', 'idle', 0, { scale: 2 }), BZ],
      [petSprite(p.id, 'side', 'idle', 0, { scale: 2, flip: true }), BZ],
    ])
  }
}

for (const [sec, scale, z] of [
  ['small', 1, Z],
  ['big', 2, Math.max(2, Z / 2)],
] as const) {
  if (!want(sec)) continue
  for (const p of pets) {
    title(`${p.name} (${p.id}) – scale ${scale}`)
    const r = row()
    for (const f of FACINGS) {
      for (const a of ANIMS) {
        const n = petFrames(a)
        const sp: [Sprite, number][] = []
        for (let i = 0; i < n; i++) sp.push([petSprite(p.id, f, a, i, { scale }), z])
        cell(r, `${f} ${a}`, sp)
      }
    }
  }
}
