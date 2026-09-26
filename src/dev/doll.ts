// Dev-only HD doll preview: open /dev-doll.html while running `npm run dev`.
// Query params: ?s=poses|faces|hair|items|looks (comma separated, default all) &z=4
import { dollSprite, dollPortrait, dollDefaultLook, FACE_STYLES, type DollPose } from '../art/doll'
import { avatarSprite, type AvatarLook, type Pose, type View } from '../art/avatar'
import { OUTFITS } from '../game/data/outfits'
import type { Sprite } from '../engine/sprite'

const root = document.getElementById('g')!
const params = new URLSearchParams(location.search)
const Z = Number(params.get('z') ?? 4)
const section = params.get('s') ?? 'all'
const want = (s: string) => section === 'all' || section.split(',').includes(s)

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

function cell(parent: HTMLElement, label: string, sprites: [Sprite, number][]) {
  const c = document.createElement('div')
  c.className = 'cell'
  const p = document.createElement('div')
  p.className = 'pair'
  for (const [s, z] of sprites) p.appendChild(canvasOf(s, z))
  c.appendChild(p)
  const l = document.createElement('div')
  l.textContent = label
  c.appendChild(l)
  parent.appendChild(c)
}

const M = dollDefaultLook('m')
const F = dollDefaultLook('f')

const frontPoses: DollPose[] = ['stand', 'wave', 'wai', 'happy', 'think', 'kneel', 'kneelWai', 'sit']
const backPoses: DollPose[] = ['stand', 'kneel', 'kneelWai', 'bow', 'sit']
const smallFor: Record<string, [View, Pose]> = {
  stand: ['front', 'stand'],
  wave: ['front', 'happy'],
  wai: ['front', 'wai'],
  happy: ['front', 'happy'],
  think: ['front', 'stand'],
  kneel: ['back', 'kneel'],
  kneelWai: ['back', 'wai'],
  bow: ['back', 'bow'],
  sit: ['back', 'sit'],
}

if (want('poses')) {
  for (const [name, look] of [
    ['male', M],
    ['female', F],
  ] as [string, AvatarLook][]) {
    title(`${name} – front`)
    const r1 = row()
    for (const p of frontPoses) cell(r1, p, [[dollSprite(look, p), Z]])
    cell(r1, 'blink', [[dollSprite(look, 'stand', { blink: true }), Z]])
    cell(r1, 'portrait', [[dollPortrait(look), Z]])
    title(`${name} – back (barefoot) + small sprite`)
    const r2 = row()
    for (const p of backPoses) {
      const [v, sp] = smallFor[p]
      cell(r2, p, [
        [dollSprite(look, p, { view: 'back', barefoot: p !== 'stand' }), Z],
        [avatarSprite(look, v, sp, { barefoot: p !== 'stand' }), Z],
      ])
    }
  }
}

if (want('faces')) {
  title('face styles')
  const r = row()
  for (const f of FACE_STYLES) {
    cell(r, `${f.id} ${f.name}`, [
      [dollPortrait({ ...F, face: f.id }), Z],
      [dollPortrait({ ...M, face: f.id }), Z],
    ])
  }
}

if (want('hair')) {
  title('hair styles (front / back, doll + small)')
  const r = row()
  const hairs = OUTFITS.filter((o) => o.slot === 'hair')
  hairs.forEach((h, i) => {
    const look: AvatarLook = { ...(i % 2 ? M : F), hair: h.id, hairColor: i % 7, top: 'top_tee_white', bottom: 'bot_jeans', shoes: 'shoes_sneaker_white' }
    cell(r, h.name, [
      [dollSprite(look, 'stand'), Z],
      [dollSprite(look, 'stand', { view: 'back' }), Z],
      [avatarSprite(look, 'front', 'stand'), Z],
      [avatarSprite(look, 'back', 'stand'), Z],
    ])
  })
}

if (want('items')) {
  for (const slot of ['top', 'bottom', 'shoes', 'head', 'neck', 'hand'] as const) {
    title(`${slot} items (f / m / back, + small)`)
    const r = row()
    for (const o of OUTFITS.filter((x) => x.slot === slot)) {
      const f = { ...F, [slot]: o.id } as AvatarLook
      const m = { ...M, [slot]: o.id } as AvatarLook
      cell(r, o.name, [
        [dollSprite(f, 'stand'), Z],
        [dollSprite(m, 'stand'), Z],
        [dollSprite(m, 'stand', { view: 'back' }), Z],
        [avatarSprite(f, 'front', 'stand'), Z],
        [avatarSprite(m, 'side', 'walk1'), Z],
      ])
    }
  }
}

const COOL: [string, AvatarLook][] = [
  ['school boy', M],
  ['school girl', F],
  ['uni student m', { ...M, hair: 'hair_curtain', top: 'top_uni_m', bottom: 'bot_uni_slacks', shoes: 'shoes_school' }],
  ['uni student f', { ...F, hair: 'hair_long', hairColor: 1, top: 'top_uni_f', bottom: 'bot_uni_pleat', shoes: 'shoes_maryjane' }],
  ['elephant pants tourist', { ...F, skin: 0, hair: 'hair_bun', hairColor: 3, top: 'top_elephant', bottom: 'bot_elephant_purple', shoes: 'shoes_flipflop', head: 'head_sunglasses', hand: 'hand_chayen' }],
  ['hoodie + jeans', { ...M, hair: 'hair_twoblock', hairColor: 6, top: 'top_hoodie_over', bottom: 'bot_jeans', shoes: 'shoes_sneaker_white', head: 'head_headphones' }],
  ['jersey fan', { ...M, skin: 2, hair: 'hair_buzz', top: 'top_jersey', bottom: 'bot_denim_shorts', shoes: 'shoes_hightop', head: 'head_cap' }],
  ['thai silk', { ...F, skin: 2, hair: 'hair_braid', top: 'top_chitralada', bottom: 'bot_chitralada', shoes: 'shoes_sandal', head: 'head_jasmine' }],
  ['sukajan', { ...M, skin: 3, hair: 'hair_curly', face: 3, top: 'top_sukajan', bottom: 'bot_cargo', shoes: 'shoes_canvas_black' }],
  ['wavy cardigan', { ...F, hair: 'hair_wavy', hairColor: 4, face: 4, top: 'top_cardigan', bottom: 'bot_pinkskirt', shoes: 'shoes_sneaker_pastel', head: 'head_clips' }],
]

if (want('looks')) {
  title('cool looks')
  const r = row()
  for (const [n, l] of COOL) {
    cell(r, n, [
      [dollSprite(l, 'stand'), Z],
      [dollSprite(l, 'wave'), Z],
      [dollSprite(l, 'kneelWai', { view: 'back', barefoot: true }), Z],
      [dollSprite(l, 'bow', { view: 'back', barefoot: true }), Z],
      [avatarSprite(l, 'front', 'stand'), Z],
      [avatarSprite(l, 'back', 'bow', { barefoot: true }), Z],
    ])
  }
  title('2× readability')
  const r2 = row()
  for (const [n, l] of COOL) cell(r2, n, [[dollSprite(l, 'stand'), 2]])
}

// ?ids=top_jersey,bot_jeans – inspect specific items large (f / m / back).
const ids = params.get('ids')
if (ids) {
  title('selected')
  const r = row()
  for (const id of ids.split(',')) {
    const o = OUTFITS.find((x) => x.id === id)
    if (!o) continue
    const f = { ...F, [o.slot]: o.id } as AvatarLook
    const m = { ...M, [o.slot]: o.id } as AvatarLook
    cell(r, o.name, [
      [dollSprite(f, 'stand'), Z],
      [dollSprite(m, 'stand'), Z],
      [dollSprite(m, 'stand', { view: 'back' }), Z],
      [avatarSprite(f, 'front', 'stand'), Z],
    ])
  }
}
