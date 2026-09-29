// Dev page for the Bangkok place maps (dev-bangkok.html).
//   (default)            full overview of every Bangkok map (?scale=1)
//   ?map=<id>[,<id>]     only these maps (e.g. wat_pho,wat_pho:viharn)
//   ?phase=night         force the time of day (handled in sky.ts)
//   ?grid=1              overlay blocked cells, hotspots, entries and spawn
//   ?crop=x,y,w,h        render only a region of each map
//   ?t=3                 seconds of simulated time before the snapshot
//   ?sprites=1&zoom=2    sprite sheet of the Bangkok art instead
// window.__bk exposes the scenes for scripted checks.

import { Surface } from '../engine/pixel'
import type { Sprite } from '../engine/sprite'
import { WorldScene } from '../scenes/world'
import { MAPS } from '../scenes/maps/places/bangkok'
import { game } from '../game/state'
import * as BK from '../art/places/bangkok'
import * as WPK from '../art/places/bangkok-phrakaew'
import * as INT from '../art/places/bangkok-interior'
import * as PHO from '../art/places/bangkok-pho'
import * as ARUN from '../art/places/bangkok-arun'

const BANGKOK_SPRITES: Record<string, () => Sprite> = {
  arunTower: () => ARUN.arunTower(),
  arunMinor: () => ARUN.minorPrang(),
  arunMondop: () => ARUN.arunMondop(),
  arunUbosot: () => ARUN.arunUbosot(),
  arunGate: () => ARUN.arunGate(),
  arunPier: () => ARUN.pierSprite(90),
  arunFerry: () => ARUN.ferrySprite(),
  arunBarge: () => ARUN.riceBarge(),
  arunCruise: () => ARUN.cruiseSprite(true),
  phoViharn: () => PHO.recliningViharn(),
  phoViharnN: () => PHO.recliningViharn(true),
  phoChediG: () => PHO.greatChedi('green'),
  phoChediW: () => PHO.greatChedi('white'),
  phoChediY: () => PHO.greatChedi('yellow'),
  phoChediB: () => PHO.greatChedi('blue'),
  phoRai0: () => PHO.smallChedi(0),
  phoRai1: () => PHO.smallChedi(1),
  phoRai2: () => PHO.smallChedi(2),
  phoCloister: () => PHO.buddhaCloister(120),
  phoRock: () => PHO.rockery(0),
  phoRock1: () => PHO.rockery(1),
  phoTortoise: () => PHO.tortoise(),
  phoMassage: () => PHO.massageMat(0),
  intEmerald: () => {
    const b = INT.emeraldBuddha()
    return { canvas: b.canvas, w: b.canvas.width, h: b.canvas.height }
  },
  intThrone: () => INT.emeraldThrone(),
  intCrowned: () => INT.crownedBuddha(),
  intChand: () => INT.chandelierSprite(),
  intReclining: () => INT.recliningBuddha(),
  intBowls: () => INT.bowlBench(30),
  intCoin: () => INT.coinBooth(),
  intPillar: () => INT.paintedPillar(80, 'red'),
  intPillarM: () => INT.paintedPillar(80, 'mosaic'),
  intPillarF: () => INT.paintedPillar(80, 'flower'),
  intAltar: () => INT.altarTable(),
  intCandle: () => INT.floorCandle(),
  wpkChedi: () => WPK.srirattanaChedi(),
  wpkMondop: () => WPK.phraMondop(),
  wpkPrasat: () => WPK.prasatThepBidon(),
  wpkAngkor: () => WPK.angkorModel(),
  wpkSuwanna: () => WPK.suwannaChedi(),
  wpkUbosot: () => WPK.wpkUbosot(),
  wpkUbosotN: () => WPK.wpkUbosot(true),
  wpkBell: () => WPK.wpkBellTower(),
  wpkHermit: () => WPK.hermitDoctor(),
  wpkBasin: () => WPK.lotusBasin(),
  wpkGate: () => WPK.galleryGate(),
  wpkOuter: () => WPK.galleryOuter(80),
  wpkPost: () => WPK.galleryPost(),
  yakThotsakan: () => BK.giantYaksha('thotsakan'),
  yakSahat: () => BK.giantYaksha('sahatsadecha'),
  yakSuriya: () => BK.giantYaksha('suriyaphop'),
  yakWirun: () => BK.giantYaksha('wirunchambang'),
  yakMaiyarap: () => BK.giantYaksha('maiyarap'),
  yakInthora: () => BK.giantYaksha('inthorachit'),
  kinnari: () => BK.kinnaraSprite(),
  kinnara: () => BK.kinnaraSprite(true),
  stoneWarrior: () => BK.stoneGuardian('warrior'),
  stoneScholar: () => BK.stoneGuardian('scholar'),
  stoneFarang: () => BK.stoneGuardian('farang'),
  stoneLion: () => BK.stoneGuardian('lion'),
  singha: () => BK.singhaSprite(),
  hermit0: () => BK.hermitSprite(0),
  hermit1: () => BK.hermitSprite(1),
  hermit2: () => BK.hermitSprite(2),
  hermit3: () => BK.hermitSprite(3),
  sala: () => BK.salaSprite({ w: 80, mats: true }),
  salaWhite: () => BK.salaSprite({ w: 60, posts: 'white', floor: 'white', roof: BK.ROOF.green }),
  iceCart: () => BK.iceCreamCart(),
  amulet: () => BK.amuletStall(),
  balm: () => BK.balmStall(),
  costume: () => BK.costumeRack(),
  garland: () => BK.garlandStand(),
  danceBooth: () => BK.danceBooth(),
  foodNoodle: () => BK.streetFoodCart('noodle'),
  foodPork: () => BK.streetFoodCart('pork'),
  drink: () => BK.drinkCart(),
  ticket: () => BK.ticketBooth(),
  signNoPhoto: () => BK.signBoard('nophoto'),
  signDress: () => BK.signBoard('dress'),
  shoeRack: () => BK.shoeRack(),
  table: () => BK.plasticTable(),
  elephants: () => BK.woodElephants(6, 1),
}

const q = new URLSearchParams(location.search)
const root = document.getElementById('root')!

function card(label: string, c: HTMLCanvasElement, extra = '') {
  const wrap = document.createElement('div')
  wrap.className = 'card'
  const l = document.createElement('div')
  l.className = 'label'
  l.textContent = label
  wrap.appendChild(l)
  wrap.appendChild(c)
  if (extra) {
    const e = document.createElement('div')
    e.style.maxWidth = c.width + 'px'
    e.style.fontSize = '10px'
    e.style.opacity = '0.8'
    e.textContent = extra
    wrap.appendChild(e)
  }
  root.appendChild(wrap)
}

function scaled(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.round(src.width * k)
  c.height = Math.round(src.height * k)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = k < 1
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return c
}

function sheet() {
  const zoom = +(q.get('zoom') ?? 2)
  const only = q.get('only')
  for (const [name, make] of Object.entries(BANGKOK_SPRITES)) {
    if (only && !name.includes(only)) continue
    const s: Sprite = make()
    const c = document.createElement('canvas')
    c.width = s.w
    c.height = s.h
    c.getContext('2d')!.drawImage(s.canvas, 0, 0)
    card(`${name} ${s.w}×${s.h}`, scaled(c, zoom))
  }
}

function overview() {
  const scale = +(q.get('scale') ?? 1)
  const ids = q.get('map')?.split(',') ?? Object.keys(MAPS)
  const simT = +(q.get('t') ?? 2)
  const scenes: Record<string, WorldScene> = {}
  for (const id of ids) {
    const make = MAPS[id]
    if (!make) continue
    const map = make()
    const scene = new WorldScene(map, game.value.player.look, { onArrive: () => undefined, onSay: () => undefined }, {})
    scenes[id] = scene
    scene.resize(map.w, map.h)
    for (let t = 0; t < simT; t += 0.1) scene.update(0.1, t)
    const surf = new Surface(map.w, map.h)
    scene.render(surf)
    const g = surf
    if (q.has('grid')) {
      const gr = scene.grid
      g.ctx.fillStyle = 'rgba(255,0,60,0.28)'
      for (let y = 0; y < gr.rows; y++) for (let x = 0; x < gr.cols; x++) if (gr.blocked[y * gr.cols + x]) g.ctx.fillRect(x * gr.cell, y * gr.cell, gr.cell, gr.cell)
      for (const h of map.hotspots) {
        g.ctx.strokeStyle = h.id.startsWith('door:') ? '#ff40ff' : h.id.startsWith('job:') ? '#40ff80' : h.id.startsWith('shop:') ? '#ffb000' : '#00e0ff'
        g.ctx.strokeRect(h.rect.x + 0.5, h.rect.y + 0.5, h.rect.w - 1, h.rect.h - 1)
        g.ctx.fillStyle = scene.grid.freeAt(h.at.x, h.at.y) ? '#ffff00' : '#ff0000'
        g.ctx.fillRect(h.at.x - 1, h.at.y - 1, 3, 3)
      }
      for (const e of Object.values(map.entries ?? {})) {
        g.ctx.fillStyle = '#ff40ff'
        g.ctx.fillRect(e.x - 2, e.y - 2, 5, 5)
      }
      g.ctx.fillStyle = '#00ff00'
      g.ctx.fillRect(map.spawn.x - 2, map.spawn.y - 2, 5, 5)
    }
    let c = surf.canvas
    if (q.has('crop')) {
      const [x, y, w, h] = q.get('crop')!.split(',').map(Number)
      const cc = document.createElement('canvas')
      cc.width = w
      cc.height = h
      cc.getContext('2d')!.drawImage(c, x, y, w, h, 0, 0, w, h)
      c = cc
    }
    const bad: string[] = []
    for (const h of map.hotspots) if (!scene.grid.freeAt(h.at.x, h.at.y)) bad.push(h.id)
    for (const p of map.pickupSpots) if (!scene.grid.freeAt(p.x, p.y)) bad.push(`pickup@${p.x},${p.y}`)
    for (const [k, e] of Object.entries(map.entries ?? {})) if (!scene.grid.freeAt(e.x, e.y)) bad.push(`entry:${k}`)
    if (!scene.grid.freeAt(map.spawn.x, map.spawn.y)) bad.push('spawn')
    if (bad.length) console.warn(id, 'blocked:', bad.join(' '))
    card(`${id} ${map.w}×${map.h}`, scaled(c, scale), map.hotspots.map((h) => h.id).join(' · ') + (bad.length ? `  ⚠ blocked: ${bad.join(' ')}` : ''))
  }
  ;(window as unknown as Record<string, unknown>).__bk = scenes
}

if (q.has('sprites')) sheet()
else overview()
