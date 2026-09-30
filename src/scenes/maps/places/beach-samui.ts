// หาดบ่อผุด เกาะสมุย (Bophut Beach, Koh Samui): soft sand in front of the old
// Fisherman's Village (wooden shophouses on stilts), a causeway out over
// the water to Koh Fan where the golden Big Buddha sits on its white naga
// terrace with a rail of bells, snorkel boats, a coconut stand, the sarong
// auntie and a fire show on the sand at night.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { Gags } from '../../gags'
import { Smoke, TapZones } from '../../life'
import { beachBar, boardwalk, coconutCart, footprintTrail, isle, lampPost, lounger, SAND, sandShadow, sarongRack, seaAlmond, trashBins, turtleHatchery, umbrella, photoFrame, hooksAt, INK, mix } from '../../../art/places/beach-kit'
import { bellRail, bigBuddhaSamui } from '../../../art/places/beach-landmarks'
import { buildBeach, gameSpot, hs, route } from './beach-common'
import { FireShow } from './beach-life'
import { buriedDadGag, castleKidGag, lobsterTouristGag, massageGag, selfieGag, sleepyUncleGag, sunbatherGag, walkingVendorGag } from './beach-gags'

const ID = 'beach_samui'
const W = 360
const H = 800
const SKY = 56
const SAND_TO = 620
const shore = (x: number) => 318 + Math.sin(x * 0.012 + 1.4) * 8 + Math.sin(x * 0.05) * 3
const ISLE = { cx: 276, cy: 168, rx: 70, ry: 34 }
const BUDDHA = { x: 276, y: 186 }
const CAUSE = { x: 262, w: 22, y0: 196 }

function paint(g: Surface, night: boolean) {
  isle(g, 60, SKY + 3, 30, 9, night)
  isle(g, 110, SKY + 3, 14, 5, night, { sand: true })
  // Koh Fan: rocky island edge, sand terrace, trees behind the Buddha.
  const { cx, cy, rx, ry } = ISLE
  g.ellipse(cx, cy + 4, rx + 4, ry + 4, night ? '#3a3a4e' : '#8a8494')
  g.ellipse(cx, cy + 2, rx + 2, ry + 2, night ? '#4a4a5a' : '#b0aabb')
  g.ellipse(cx, cy, rx, ry, night ? '#8a8272' : '#f0e0bc')
  for (let i = -rx + 8; i < rx - 8; i += 7) g.circle(cx + i, cy - ry + 10 + Math.abs(i) * 0.12, 7, night ? '#1e3a34' : '#3f7a4f')
  for (let i = -rx + 10; i < rx - 10; i += 9) g.circle(cx + i - 1, cy - ry + 8 + Math.abs(i) * 0.12, 4, night ? '#28483e' : '#5eae55')
  g.rect(cx - 50, cy + 14, 100, 26, night ? '#b8b0b4' : '#ece6e2')
  g.hline(cx - 50, cx + 49, cy + 14, night ? '#c8c0c4' : '#ffffff')
  // The causeway over the water.
  boardwalk(g, CAUSE.x, CAUSE.y0, CAUSE.w, Math.round(shore(CAUSE.x + 11)) - CAUSE.y0 + 6, night)
  for (let y = CAUSE.y0 + 6; y < shore(CAUSE.x); y += 16) {
    g.rect(CAUSE.x - 2, y, 2, 6, '#6e4a35')
    g.rect(CAUSE.x + CAUSE.w, y, 2, 6, '#6e4a35')
  }
  const sand = night ? SAND.night : SAND.white
  footprintTrail(g, [[180, 600], [220, 480], [270, 360], [272, 330]], sand)
  for (const [x, y] of [[70, 440], [116, 436], [160, 446]] as [number, number][]) sandShadow(g, x + 6, y + 2, 16, 5)
  // Fisherman's Village: old wooden shophouses along the back.
  for (let i = 0; i < 6; i++) {
    const x = i * 60
    const wall = ['#b07a52', '#c89060', '#9a6a45'][i % 3]
    g.rect(x + 2, SAND_TO + 10, 56, 60, wall)
    for (let k = 0; k < 56; k += 4) g.vline(x + 2 + k, SAND_TO + 10, SAND_TO + 69, mix(wall, INK, 0.18))
    g.poly([[x, SAND_TO + 12], [x + 30, SAND_TO - 4], [x + 60, SAND_TO + 12]], ['#8a3a2a', '#6a4a3a', '#a04a2a'][i % 3])
    for (const wx of [x + 10, x + 38]) {
      g.rect(wx, SAND_TO + 22, 12, 12, night ? '#ffd88a' : '#4a3a3a')
      g.vline(wx + 6, SAND_TO + 22, SAND_TO + 33, wall)
    }
    g.rect(x + 22, SAND_TO + 44, 16, 26, night ? '#ffc86a' : '#3a2a2a')
    if (i % 2) {
      g.rect(x + 8, SAND_TO + 40, 44, 3, '#e8514a')
      for (let k = 0; k < 44; k += 4) g.px(x + 8 + k, SAND_TO + 43, '#fffaf0')
    }
  }
  g.rect(0, SAND_TO + 70, W, H - SAND_TO - 70, night ? '#6a6478' : '#8a8490')
  for (let x = 0; x < W; x += 8) g.vline(x, SAND_TO + 70, H, night ? '#5a5468' : '#7a7480')
}

export function samuiMap(): MapDef {
  const buddha = bigBuddhaSamui()
  const bells = bellRail(5)
  const bar = beachBar(false, '#43b8a8')
  const barN = beachBar(true, '#43b8a8')
  const spots = [
    gameSpot('snorkel', 300, 350),
    gameSpot('chedi', 60, 380),
    gameSpot('shells', 180, 360),
    gameSpot('turtle', 330, 470),
    gameSpot('photo', 230, 470, { board: false, rect: { x: 212, y: 428, w: 38, h: 46 }, at: { x: 231, y: 482 } }),
  ]
  const LAMPS: [number, number][] = [
    [CAUSE.x - 4, 230],
    [CAUSE.x + CAUSE.w + 4, 230],
    [CAUSE.x - 4, 290],
    [CAUSE.x + CAUSE.w + 4, 290],
  ]
  const props: PlacedProp[] = [
    { sprite: buddha, x: BUDDHA.x, y: BUDDHA.y },
    { sprite: bells, x: BUDDHA.x - 58, y: BUDDHA.y + 8 },
    { sprite: bells, x: BUDDHA.x + 58, y: BUDDHA.y + 8 },
    { sprite: bar, night: barN, x: 60, y: 600, shadow: [30, 4] },
    { sprite: coconutCart(), x: 150, y: 596, shadow: [16, 3] },
    { sprite: sarongRack(), x: 300, y: 596 },
    { sprite: turtleHatchery(), x: 318, y: 510 },
    { sprite: umbrella('#43b8a8', '#fffaf0'), x: 70, y: 440 },
    { sprite: umbrella('#ff9fc0', '#fffaf0', 1), x: 116, y: 436 },
    { sprite: umbrella('#ffd23f', '#fffaf0'), x: 160, y: 446 },
    { sprite: lounger('#43b8a8'), x: 64, y: 462 },
    { sprite: lounger('#ff9fc0'), x: 122, y: 458 },
    { sprite: lounger('#ffd23f'), x: 166, y: 468 },
    { sprite: trashBins(), x: 200, y: 560, shadow: [10, 2] },
    { sprite: photoFrame('#ffd23f', '#e8514a'), x: 231, y: 472 },
    { sprite: seaAlmond(0), x: 220, y: 600 },
    ...LAMPS.map(([x, y]) => ({ sprite: lampPost(false), night: lampPost(true), x, y })),
    ...spots.flatMap((s) => s.props),
  ]
  const cleanup = gameSpot('cleanup', 110, 560)
  props.push(...cleanup.props)
  return buildBeach({
    id: ID,
    w: W,
    h: H,
    skyH: SKY,
    shore,
    sandTo: SAND_TO,
    paint,
    props,
    openWater: [
      { x: ISLE.cx - 50, y: ISLE.cy + 14, w: 100, h: 26 },
      { x: CAUSE.x, y: ISLE.cy + 14, w: CAUSE.w, h: 400 },
    ],
    obstacles: [
      { x: BUDDHA.x - 34, y: BUDDHA.y - 20, w: 68, h: 18 },
      { x: BUDDHA.x - 80, y: BUDDHA.y + 2, w: 44, h: 8 },
      { x: BUDDHA.x + 36, y: BUDDHA.y + 2, w: 44, h: 8 },
      { x: 26, y: 588, w: 68, h: 14 },
      { x: 134, y: 588, w: 32, h: 12 },
      { x: 278, y: 588, w: 44, h: 10 },
      { x: 294, y: 496, w: 48, h: 16 },
      { x: 56, y: 432, w: 120, h: 38 },
      { x: 212, y: 464, w: 38, h: 10 },
      { x: 216, y: 594, w: 8, h: 8 },
      { x: 186, y: 552, w: 28, h: 10 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      { x: 0, y: SAND_TO + 8, w: 150, h: H - SAND_TO },
      { x: 210, y: SAND_TO + 8, w: 150, h: H - SAND_TO },
      { x: 150, y: SAND_TO + 70, w: 60, h: H - SAND_TO - 70 },
      ...spots.flatMap((s) => s.obstacles),
      ...cleanup.obstacles,
    ],
    hotspots: [
      hs('incense', 'พระใหญ่เกาะฟาน', 'กราบพระพุทธรูปองค์ทอง จุดธูปขอพร', 'incense', { x: BUDDHA.x - 30, y: BUDDHA.y - 110, w: 60, h: 112 }, { x: BUDDHA.x - 2, y: BUDDHA.y + 16 }, { marker: { x: BUDDHA.x, y: BUDDHA.y - 114 }, beacon: true }),
      hs('bells', 'ระฆังรอบลานพระใหญ่', 'ตีระฆังให้ครบแถว เสียงก้องไปทั้งอ่าว', 'bell', { x: BUDDHA.x - 80, y: BUDDHA.y - 12, w: 44, h: 22 }, { x: BUDDHA.x - 50, y: BUDDHA.y + 16 }, { marker: { x: BUDDHA.x - 58, y: BUDDHA.y - 14 } }),
      hs('shop:beach_samui_coconut', 'มะพร้าวสมุยพี่หนุ่ม', 'มะพร้าว น้ำปั่น ไอติมกะทิ', 'shop', { x: 132, y: 556, w: 36, h: 40 }, { x: 150, y: 608 }, { marker: { x: 150, y: 554 } }),
      hs('shop:beach_samui_sarong', 'ผ้าปาเต๊ะป้าจันทร์', 'ผ้าปาเต๊ะลายชบา ของที่ระลึก', 'shirt', { x: 278, y: 562, w: 44, h: 36 }, { x: 300, y: 608 }, { marker: { x: 300, y: 558 } }),
      cleanup.hotspot,
      ...spots.map((s) => s.hotspot),
      hs('gate', 'ทางออกหมู่บ้านชาวประมง', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: 160, y: 620, w: 40, h: 40 }, { x: 180, y: 652 }, { face: 'down', marker: { x: 180, y: 620 }, near: 12 }),
    ],
    spawn: { x: 180, y: 540 },
    camBias: 0.78,
    palms: [
      { x: 20, y: 520, v: 0 },
      { x: 250, y: 560, v: 1, flip: true },
      { x: 346, y: 410, v: 2, flip: true },
      { x: 200, y: 402, v: 1 },
    ],
    moored: [
      { x: 330, y: Math.round(shore(330)) - 18, hull: '#43b8a8', ribbons: ['#e8514a', '#ffd23f', '#43905a'], canopy: '#e8514a', flip: true },
      { x: 60, y: Math.round(shore(60)) - 20, hull: '#8a5a3a', ribbons: ['#ff9fc0', '#fffaf0'] },
    ],
    routes: [route('longtail', 140, 230, 90, 12, 50, 8), route('jetski', 110, 270, 50, 10, 11, 1, '#ff6f91')],
    crabHoles: [
      { x: 40, y: 344 },
      { x: 130, y: 350 },
      { x: 220, y: 340 },
    ],
    swimmers: [
      { x: 110, y: Math.round(shore(110)) - 18 },
      { x: 210, y: Math.round(shore(210)) - 20 },
    ],
    dog: { x: 100, y: 520, range: { x: 20, y: 340, w: 230, h: 220 }, coat: 'white' },
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 30, r: 20, color: '#ffd88a' })),
      ...hooksAt(bar, 'lamp', 60, 600).map((p) => ({ x: p.x, y: p.y, r: 30, color: '#ffcf7a' })),
      { x: BUDDHA.x, y: BUDDHA.y - 60, r: 60, color: '#ffe7a0' },
      { x: 180, y: SAND_TO + 40, r: 40, color: '#ffc86a' },
    ],
    wander: [
      { x: 20, y: 340, w: 230, h: 80 },
      { x: 20, y: 500, w: 240, h: 70 },
      { x: BUDDHA.x - 40, y: BUDDHA.y + 12, w: 80, h: 10 },
    ],
    pois: [
      { x: BUDDHA.x - 2, y: BUDDHA.y + 16, face: 'up' },
      { x: 150, y: 608, face: 'up' },
      { x: 300, y: 608, face: 'up' },
      { x: 231, y: 482, face: 'up' },
    ],
    pickupSpots: [
      { x: 40, y: 400 },
      { x: 240, y: 400 },
      { x: 90, y: 520 },
      { x: BUDDHA.x + 30, y: BUDDHA.y + 18 },
    ],
    vendors: [
      { x: 164, y: 590 },
      { x: 312, y: 598 },
    ],
    life(s) {
      return [
        new FireShow(s, 150, 510),
        new Smoke(s, [{ x: BUDDHA.x - 2, y: BUDDHA.y + 10 }], 4),
        new Gags(s, [
          sunbatherGag(110, 500, ['น้ำสมุยใสมาก', 'ตากแดดแล้วไปดำน้ำต่อ', 'อย่าบังแดดนะ~'], ['#43b8a8', '#fffaf0']),
          buriedDadGag(40, 540),
          castleKidGag(170, 520),
          sleepyUncleGag(200, 470),
          lobsterTouristGag(60, 370, { x0: 30, x1: 150, speed: 8 }),
          selfieGag(BUDDHA.x + 22, BUDDHA.y + 16, ['ขอรูปกับพระใหญ่หน่อย', 'ต้องแต่งกายสุภาพนะ คลุมไหล่แล้ว!', 'สาธุ~ แล้วค่อยถ่ายรูป']),
          massageGag(96, 520),
          walkingVendorGag('icecream', 30, 240, 400),
        ]),
        new TapZones([
          {
            rect: { x: 20, y: SKY - 10, w: 120, h: 30 },
            fn: (x) => {
              s.say(pick(['เกาะพะงันอยู่ทางนั้น', 'มองเห็นเกาะเต่าไกล ๆ ด้วยนะ', 'เรือไปเกาะเต่าออกตอนเช้า']), x, SKY + 12, 2.4)
              sfx.tap()
            },
          },
        ]),
      ]
    },
  })
}
