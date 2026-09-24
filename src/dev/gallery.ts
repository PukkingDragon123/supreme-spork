// Dev-only sprite gallery: open /gallery.html while running `npm run dev`.
import { avatarSprite, DEFAULT_LOOK, type AvatarLook, type Pose, type View } from '../art/avatar'
import type { Sprite } from '../engine/sprite'

const root = document.getElementById('g')!
const params = new URLSearchParams(location.search)
const Z = Number(params.get('z') ?? 5)

function show(title: string, sprites: Sprite[], zoom = Z) {
  const h = document.createElement('h3')
  h.textContent = title
  root.appendChild(h)
  const row = document.createElement('div')
  row.className = 'row'
  for (const s of sprites) {
    const c = document.createElement('canvas')
    c.width = s.w
    c.height = s.h
    c.style.width = `${s.w * zoom}px`
    c.style.height = `${s.h * zoom}px`
    c.getContext('2d')!.drawImage(s.canvas, 0, 0)
    row.appendChild(c)
  }
  root.appendChild(row)
}

const looks: [string, AvatarLook][] = [
  ['default', DEFAULT_LOOK],
  ['short/floral', { ...DEFAULT_LOOK, hair: 'hair_short', top: 'top_floral', bottom: 'bot_elephant', skin: 2, hairColor: 1, head: 'head_ngob' }],
  ['long/sabai', { ...DEFAULT_LOOK, hair: 'hair_long', top: 'top_sabai', bottom: 'bot_sarong', skin: 0, hairColor: 0, head: 'head_frangipani', neck: 'neck_garland' }],
  ['bun/mohom', { ...DEFAULT_LOOK, hair: 'hair_bun', top: 'top_mohom', bottom: 'bot_jong', skin: 3, hairColor: 2, hand: 'hand_yam' }],
  ['twin/overalls', { ...DEFAULT_LOOK, hair: 'hair_twin', top: 'top_overalls', bottom: 'bot_pinkskirt', skin: 1, hairColor: 4, head: 'head_dogears' }],
  ['jook/hoodie', { ...DEFAULT_LOOK, hair: 'hair_jook', top: 'top_hoodie', bottom: 'bot_black', skin: 1, hairColor: 0, neck: 'neck_pakaoma', head: 'head_glasses' }],
  ['day tops', { ...DEFAULT_LOOK, hair: 'hair_bob', top: 'top_day2', bottom: 'bot_skirt', hairColor: 5, head: 'head_lotus', hand: 'hand_umbrella' }],
]

const views: [View, Pose][] = [
  ['front', 'stand'],
  ['front', 'walk1'],
  ['front', 'pass'],
  ['front', 'walk2'],
  ['front', 'wai'],
  ['front', 'happy'],
  ['front', 'sit'],
  ['side', 'stand'],
  ['side', 'walk1'],
  ['side', 'pass'],
  ['side', 'walk2'],
  ['side', 'offer'],
  ['back', 'stand'],
  ['back', 'walk1'],
  ['back', 'wai'],
  ['back', 'kneel'],
  ['back', 'bow'],
  ['back', 'sit'],
]

const section = params.get('s') ?? 'avatar'
if (section === 'avatar') {
  for (const [name, look] of looks) {
    show(name, views.map(([v, p]) => avatarSprite(look, v, p, { barefoot: p === 'kneel' || p === 'sit' })))
  }
}

// Extra sections are registered by other modules during development.
const extra = (window as unknown as { __gallery?: Record<string, (show: (title: string, sprites: Sprite[], zoom?: number) => void) => void> }).__gallery
if (extra?.[section]) extra[section](show)

export { show }

import { monkSprite, noviceSweepSprite, dogSprite, DOG_COATS, bigDogSprite, catSprite, birdSprite } from '../art/characters'
if (section === 'npc') {
  show('monks', [
    monkSprite('front', 'stand'),
    monkSprite('front', 'receive'),
    monkSprite('front', 'bless'),
    monkSprite('side', 'stand'),
    monkSprite('side', 'walk1'),
    monkSprite('side', 'walk2'),
    monkSprite('side', 'receive'),
    monkSprite('back', 'stand'),
    monkSprite('front', 'stand', { novice: true }),
    monkSprite('side', 'walk1', { novice: true }),
    noviceSweepSprite(0),
    noviceSweepSprite(1),
  ])
  for (const coat of DOG_COATS) show('dog ' + coat.id, (['stand', 'walk1', 'sit', 'wag', 'sleep', 'eat'] as const).map((p) => dogSprite(coat, p)))
  show('bigdog', DOG_COATS.slice(0, 4).flatMap((c) => [bigDogSprite(c, 'idle'), bigDogSprite(c, 'happy'), bigDogSprite(c, 'eat')]), 4)
  show('cats birds', [catSprite('loaf'), catSprite('sleep'), catSprite('loaf', '#fbf3e4'), birdSprite('a'), birdSprite('b'), birdSprite('fly')])
}

import { bake } from '../engine/pixel'
import { drawUbosot, drawNagaStairs, drawChedi, drawShrine, ROOFS } from '../art/buildings'
import * as props from '../art/props'
if (section === 'env') {
  const scene = bake(260, 300, (g) => {
    g.rect(0, 0, 260, 300, '#86c95f')
    drawChedi(g, 40, 120, {})
    drawChedi(g, 220, 120, { gold: true, scale: 0.8 })
    drawUbosot(g, 130, 140, {})
    drawNagaStairs(g, 130, 140)
    drawShrine(g, 50, 290, {})
    drawShrine(g, 130, 290, { roof: ROOFS.blue })
    drawShrine(g, 210, 290, { roof: ROOFS.gold })
  })
  show('buildings', [{ canvas: scene, w: 260, h: 300 }], 3)
  show('props', [
    props.frangipaniTree(0), props.frangipaniTree(1), props.sacredTree(), props.bodhiTree(), props.palmTree(), props.pineTree(), props.bananaTree(), props.bush(0), props.bush(1), props.bush(2),
  ], 3)
  show('props2', [
    props.bellRow(5), props.incenseUrn(), props.donationBox(), props.holyWaterPavilion(), props.guardianStatue(), props.lampPost(), props.flowerStall(), props.foodStall(), props.tukTuk(), props.templeGate(), props.sala(), props.lotusPad(3), props.lotusFlower(),
  ], 3)
}

import { ICON_NAMES, iconSprite } from '../art/icons'
if (section === 'icons') {
  show('icons', ICON_NAMES.map((n) => iconSprite(n)), 4)
  const labels = document.createElement('div')
  labels.style.fontSize = '11px'
  labels.textContent = ICON_NAMES.join(' · ')
  root.appendChild(labels)
}

import { drawHallInterior, drawBuddha, drawBuddhaBack, drawAltar, drawArch, drawCandleStand, drawVase, drawLightBeams, BRONZE } from '../art/interior'
if (section === 'hall') {
  const W2 = 170, H2 = 360
  const scene = bake(W2, H2, (g) => {
    const { floorY } = drawHallInterior(g, W2, H2, 0)
    const cx = W2 / 2
    const baseY = floorY - 40
    drawArch(g, cx, baseY + 10, 44, 92)
    drawBuddha(g, cx, baseY, 1)
    drawAltar(g, cx, baseY, 110)
    drawCandleStand(g, cx - 50, floorY + 4, 0)
    drawCandleStand(g, cx + 50, floorY + 4, 0)
    drawVase(g, cx - 30, baseY + 20, '#ffd23f')
    drawVase(g, cx + 30, baseY + 20, '#ff9fc0')
    drawLightBeams(g, W2, H2, 0)
  })
  show('hall', [{ canvas: scene, w: W2, h: H2 }], 3)
  const b2 = bake(160, 110, (g) => {
    g.rect(0, 0, 160, 110, '#6e1f30')
    drawBuddha(g, 40, 90, 1, BRONZE)
    drawBuddhaBack(g, 120, 90, 1)
  })
  show('buddha variants', [{ canvas: b2, w: 160, h: 110 }], 4)
}

import { drawDeity } from '../art/deities'
if (section === 'deities') {
  const ids = ['vessavana', 'ganesha', 'brahma', 'guanyin', 'lakshmi', 'naga']
  const c = bake(ids.length * 90, 120, (g) => {
    g.rect(0, 0, ids.length * 90, 120, '#7e2436')
    ids.forEach((id, i) => drawDeity(g, id, 45 + i * 90, 112, 2, 0))
  })
  show('deities x2', [{ canvas: c, w: ids.length * 90, h: 120 }], 2)
  const c1 = bake(ids.length * 44, 64, (g) => {
    g.rect(0, 0, ids.length * 44, 64, '#7e2436')
    ids.forEach((id, i) => drawDeity(g, id, 22 + i * 44, 60, 1, 0))
  })
  show('deities x1', [{ canvas: c1, w: ids.length * 44, h: 64 }], 4)
}

// App icon renderer used by scripts/gen-icons.mjs.
import { iconSprite as _icon } from '../art/icons'
if (section === 'appicon') {
  const drawIcon = () =>
    bake(24, 24, (g) => {
      g.gradientV(0, 0, 24, 24, ['#ffe3a0', '#ffc0a8', '#ff9fc0'], 3)
      g.ditherCircle(12, 11, 10, '#fff3c4', 0.9)
      g.rect(0, 19, 24, 5, '#86c95f')
      g.rect(0, 19, 24, 1, '#b4e486')
      g.ellipse(5, 22, 4, 1.5, '#43905a')
      g.ellipse(19, 22.5, 4, 1.5, '#43905a')
      g.draw(_icon('lotus').canvas, 4, 3)
      g.px(3, 4, '#ffffff')
      g.px(20, 6, '#ffffff')
      g.px(19, 3, '#fff3a6')
    })
  const out: Record<string, string> = {}
  for (const [name, size, pad] of [
    ['icon-192', 192, 0],
    ['icon-512', 512, 0],
    ['maskable-512', 512, 1],
    ['apple-touch-icon', 180, 0],
  ] as [string, number, number][]) {
    const src = drawIcon()
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#ffc0a8'
    ctx.fillRect(0, 0, size, size)
    const inner = pad ? Math.floor((size * 0.8) / 24) * 24 : Math.floor(size / 24) * 24
    const off = Math.round((size - inner) / 2)
    ctx.drawImage(src, off, off, inner, inner)
    out[name] = c.toDataURL('image/png')
    c.style.width = '128px'
    root.appendChild(c)
  }
  ;(window as unknown as { __icons: Record<string, string> }).__icons = out
}
