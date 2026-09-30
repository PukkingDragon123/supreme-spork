// Dev-only food & plush sheet: open /dev-food.html. Every food, drink,
// ingredient, dish and snack icon at 1×, 2× and 3× on a light and a dark
// background, plus the plush collectibles. `?z=6&g=<group>` shows one
// group big for close inspection; `?bg=dark` picks the dark panel only.
import { iconSprite } from '../art/icons'
import { FOOD_ICON_IDS } from '../art/cooking'
import { snackSprite } from '../art/stallGoods'
import { collectibleSprite } from '../art/collectibles'
import { COLLECTIBLES } from '../game/data/collectibles'
import { SNACKS } from '../game/data/placeShops'
import type { Sprite } from '../engine/sprite'
import { FOOD_KIT_NAMES } from '../art/foodIcons'

const root = document.getElementById('g')!
const q = new URLSearchParams(location.search)
const Z = Number(q.get('z') ?? 0)
const only = q.get('g')
const bgOnly = q.get('bg')

const ALMS = ['rice', 'sticky', 'curry', 'egg', 'dessert', 'banana', 'water', 'fruit', 'laddu', 'milk', 'redsoda', 'boiledegg', 'tea', 'fishfood', 'dogfood', 'chicken', 'bread', 'sangkhathan']

const groups: [string, [string, () => Sprite][]][] = [
  ['alms', ALMS.map((n) => [n, () => iconSprite(n)])],
  ['cook', FOOD_ICON_IDS.map((n) => [n, () => iconSprite(n)])],
  ['snacks', SNACKS.map((s) => [s.id, () => snackSprite(s.id, s.icon)])],
  ['extras', FOOD_KIT_NAMES.filter((n) => !ALMS.includes(n) && !FOOD_ICON_IDS.includes(n) && !SNACKS.some((s) => s.id === n)).map((n) => [n, () => iconSprite(n)])],
  ['plush', COLLECTIBLES.filter((c) => c.kind === 'plush').map((c) => [c.id, () => collectibleSprite(c)])],
]

function cv(s: Sprite, z: number) {
  const c = document.createElement('canvas')
  c.width = s.w
  c.height = s.h
  c.style.width = `${s.w * z}px`
  c.style.height = `${s.h * z}px`
  c.getContext('2d')!.drawImage(s.canvas, 0, 0)
  return c
}

for (const [name, list] of groups) {
  if (only && only !== name) continue
  for (const bg of ['light', 'dark']) {
    if (bgOnly && bgOnly !== bg) continue
    const h = document.createElement('h2')
    h.textContent = `${name} (${list.length}) · ${bg}`
    root.appendChild(h)
    const sheet = document.createElement('div')
    sheet.className = `sheet ${bg} ${Z ? 'zoom' : ''}`
    for (const [id, make] of list) {
      const cell = document.createElement('div')
      cell.className = 'cell'
      const imgs = document.createElement('div')
      imgs.className = 'imgs'
      const s = make()
      for (const z of Z ? [Z] : [1, 2, 3]) imgs.appendChild(cv(s, z))
      cell.appendChild(imgs)
      const l = document.createElement('span')
      l.textContent = id
      cell.appendChild(l)
      sheet.appendChild(cell)
    }
    root.appendChild(sheet)
  }
}
