// Dev page for the home scene: open /dev-house.html while running vite.
// Query params: ?phase=night &mode=edit &place=bed_teak &ghost=3,1 &focus=mirror
//               &cat=1 &full=1 &on=1 &wp=wp_kanok &fl=fl_terrazzo &inset=120
import { Stage } from '../engine/stage'
import { Surface } from '../engine/pixel'
import { HouseScene, drawRoomStill } from '../scenes/house'
import { DEFAULT_LOOK, type AvatarLook } from '../art/avatar'
import {
  addToStorage,
  cosyTier,
  defaultHouse,
  placeFurniture,
  roomScore,
  setFloor,
  setWallpaper,
  storeFurniture,
  unlockSurface,
  type HouseState,
} from '../game/house'
import { CRAFTABLE, FLOORS, FURNITURE, MATERIALS, WALLPAPERS } from '../game/data/furniture'
import { furnitureSprite, furnitureThumb, materialSprite, surfaceThumb } from '../art/furniture'
import type { Phase } from '../game/time'
import type { Sprite } from '../engine/sprite'

const q = new URLSearchParams(location.search)
let house: HouseState = defaultHouse()
for (const f of CRAFTABLE) house = addToStorage(house, f.id, 2)
for (const s of [...WALLPAPERS, ...FLOORS]) house = unlockSurface(house, s.id)
if (q.get('wp')) house = setWallpaper(house, q.get('wp')!)
if (q.get('fl')) house = setFloor(house, q.get('fl')!)
if (q.get('full')) {
  // A decorated showcase room.
  const put = (id: string, x: number, y: number, flip = false) => (house = placeFurniture(house, id, x, y, flip))
  put('clock_wall', 8, 0)
  put('garland_hang', 3, 2)
  put('frames_trio', 0, 0)
  put('lamp_lanna', 2, 3)
  put('lamp_paper', 6, 0)
  put('cat_sleepy', 5, 4)
  put('fan_stand', 0, 3)
  put('aquarium', 0, 7)
  put('cushion_khwan', 6, 5)
  put('tv_flat', 8, 3)
  put('altar_table', 2, 6)
  put('lotus_pot', 9, 7)
  put('chair_rattan', 4, 3)
  put('bookshelf', 4, 7)
}
const looks: AvatarLook[] = [
  DEFAULT_LOOK,
  { ...DEFAULT_LOOK, hair: 'hair_long', top: 'top_sabai', bottom: 'bot_sarong', neck: 'neck_garland', head: 'head_frangipani' },
  { ...DEFAULT_LOOK, gender: 'm', hair: 'hair_short', top: 'top_floral', bottom: 'bot_elephant', skin: 2 },
]
let li = 0
let picked: string | null = null
const log = document.getElementById('log')!
const say = (s: string) => (log.textContent = s)
const scene = new HouseScene(house, looks[0], {
  onInteract: (k, uid) => say(`interact ${k} ${uid}`),
  onEditPick: (uid) => {
    picked = uid
    say(`picked ${uid} (Move / Store)`)
  },
  onPlaced: (id, x, y, f, next) => {
    house = next
    say(`placed ${id} @${x},${y} flip=${f} score=${roomScore(house)}`)
  },
  onMoved: (uid, x, y, f, next) => {
    house = next
    say(`moved ${uid} @${x},${y} flip=${f}`)
  },
  onGhostChange: (g) => g && say(`ghost ${g.id} ${g.x},${g.y} ${g.valid ? 'OK' : 'INVALID'}`),
})
const stage = new Stage(document.getElementById('phone')!, { targetWidth: 168 })
stage.setScene(scene)
stage.start()
;(window as unknown as { scene: HouseScene }).scene = scene
if (q.get('phase')) scene.setPhase(q.get('phase') as Phase)
if (q.get('inset')) scene.setInsets(16, Number(q.get('inset')))
if (q.get('mode') === 'edit') scene.setMode('edit')
if (q.get('place')) {
  scene.startPlacing(q.get('place')!)
  if (q.get('ghost')) {
    const [x, y] = q.get('ghost')!.split(',').map(Number)
    scene.setGhostPos(x, y)
  }
}
if (q.get('on')) for (const p of house.placed) scene.setOn(p.uid, true)
if (q.get('focus') === 'mirror') {
  scene.playerAt(1, 2)
  scene.setFocus('mirror')
}

const bar = document.getElementById('bar')!
const btn = (label: string, fn: () => void) => {
  const b = document.createElement('button')
  b.textContent = label
  b.onclick = fn
  bar.appendChild(b)
}
btn('Live', () => scene.setMode('live'))
btn('Edit', () => scene.setMode('edit'))
let pi = 0
btn('Place next', () => {
  const f = CRAFTABLE[pi++ % CRAFTABLE.length]
  scene.startPlacing(f.id)
})
btn('Flip', () => scene.flipGhost())
btn('Confirm', () => say(`confirm → ${scene.confirmGhost()}`))
btn('Cancel', () => scene.cancelPlacing())
btn('Move picked', () => picked && scene.startMoving(picked))
btn('Store picked', () => {
  if (!picked) return
  house = storeFurniture(house, picked)
  scene.setHouse(house)
  picked = null
})
btn('Mirror', () => scene.setFocus(scene.focus === 'mirror' ? 'room' : 'mirror'))
btn('Next look', () => scene.setLook(looks[++li % looks.length]))
for (const p of ['dawn', 'day', 'golden', 'dusk', 'night'] as Phase[]) btn(p, () => scene.setPhase(p))
let wi = 0
btn('Wallpaper', () => {
  house = setWallpaper(house, WALLPAPERS[++wi % WALLPAPERS.length].id)
  scene.setHouse(house)
})
let fi = 0
btn('Floor', () => {
  house = setFloor(house, FLOORS[++fi % FLOORS.length].id)
  scene.setHouse(house)
})
btn('Score', () => {
  const s = roomScore(house)
  say(`ความน่าอยู่ ${s} — ${cosyTier(s).name}`)
})

if (q.get('cat')) {
  const root = document.getElementById('cat')!
  const Z = Number(q.get('z') ?? 3)
  const show = (title: string, sprites: Sprite[], z = Z) => {
    const h = document.createElement('h3')
    h.textContent = title
    root.appendChild(h)
    const row = document.createElement('div')
    row.className = 'row'
    for (const s of sprites) {
      const c = document.createElement('canvas')
      c.width = s.w
      c.height = s.h
      c.style.width = `${s.w * z}px`
      c.style.height = `${s.h * z}px`
      c.getContext('2d')!.drawImage(s.canvas, 0, 0)
      row.appendChild(c)
    }
    root.appendChild(row)
  }
  show('furniture', FURNITURE.filter((f) => f.id !== 'window_big').map((f) => furnitureSprite(f.id)))
  show(
    'frames',
    ['fan_stand', 'cat_sleepy', 'plant_monstera', 'lamp_paper', 'speaker', 'door'].flatMap((id) => [0, 1, 2, 3].map((k) => furnitureSprite(id, false, k))),
  )
  show('thumbs', FURNITURE.map((f) => furnitureThumb(f.id)), 3)
  show('materials', MATERIALS.map((m) => materialSprite(m.id)), 4)
  show('surfaces', [...WALLPAPERS, ...FLOORS].map((s) => surfaceThumb(s.id)), 3)
  const still = new Surface(120, 160)
  drawRoomStill(still, 120, 160, house, { focus: 'mirror', night: true })
  const still2 = new Surface(86, 97)
  drawRoomStill(still2, 86, 97, house, {})
  show('stills', [{ canvas: still.canvas, w: 120, h: 160 }, { canvas: still2.canvas, w: 86, h: 97 }], 2)
}
