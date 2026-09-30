// หาดสมิหลา สงขลา (Samila Beach): a long white beach shaded by casuarinas,
// the golden mermaid combing her hair on the rocks at the water's edge,
// Koh Nu and Koh Maeo (the rat and cat islands) on the horizon, Khao Tang
// Kuan with its chedi to the north, the turtle hatchery, massage mats under
// the pines and a coconut cart.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { Gags } from '../../gags'
import { TapZones } from '../../life'
import { road, sidewalk } from '../common'
import { boardwalk, casuarina, coconutCart, footprintTrail, isle, lampPost, lifeguardTower, lounger, massageMats, photoFrame, rocks, SAND, sandShadow, seaAlmond, swimFlag, trashBins, turtleHatchery, umbrella, hooksAt } from '../../../art/places/beach-kit'
import { goldenMermaid, hillWithChedi } from '../../../art/places/beach-landmarks'
import { buildBeach, gameSpot, hs, route } from './beach-common'
import { Kites } from './beach-life'
import { buriedDadGag, castleKidGag, kiteKidGag, lifeguardGag, lobsterTouristGag, massageGag, selfieGag, sleepyUncleGag, sunbatherGag, walkingVendorGag } from './beach-gags'

const ID = 'beach_samila'
const W = 360
const H = 820
const SKY = 56
const SAND_TO = 640
const shore = (x: number) => 292 + Math.sin(x * 0.011 + 0.6) * 12 + Math.sin(x * 0.047) * 4
const MERMAID = { x: 300, y: Math.round(shore(300)) + 6 }

function paint(g: Surface, night: boolean) {
  // Horizon: Koh Nu (the rat) and Koh Maeo (the cat), Khao Tang Kuan to the north.
  isle(g, 96, SKY + 3, 22, 8, night, { sand: true })
  g.ellipse(80, SKY - 3, 6, 5, night ? '#2a3c4c' : '#3f7a4f')
  isle(g, 150, SKY + 4, 12, 5, night)
  g.ellipse(144, SKY, 3, 4, night ? '#2a3c4c' : '#3f7a4f')
  hillWithChedi(g, W - 24, SKY + 1, 44, 30, night)
  const sand = night ? SAND.night : SAND.white
  // Old footprint trails and towel shadows.
  footprintTrail(g, [[40, 600], [80, 520], [150, 470], [210, 390], [240, 330]], sand)
  footprintTrail(g, [[320, 610], [280, 540], [300, 420], [300, 330]], sand)
  for (const [x, y] of [[138, 432], [178, 436], [218, 430]] as [number, number][]) sandShadow(g, x + 6, y + 2, 16, 5)
  // Back of the beach: casuarina grove on sparse grass, a walkway, the beach road.
  g.rect(0, SAND_TO, W, 70, night ? '#6a7a5e' : '#b8c880')
  for (let i = 0; i < 400; i++) {
    const x = (i * 97) % W
    const y = SAND_TO + ((i * 53) % 70)
    g.px(x, y, i % 3 ? (night ? '#5a6a50' : '#9ab060') : night ? '#8a9a70' : '#e0d8a0')
  }
  g.rect(0, SAND_TO - 4, W, 6, night ? '#a09a88' : '#e8dcc0')
  sidewalk(g, 0, 710, W, 24)
  road(g, 0, 734, W, 86)
  boardwalk(g, 168, 604, 24, 110, night)
}

export function samilaMap(): MapDef {
  const hatch = turtleHatchery()
  const tower = lifeguardTower()
  const cart = coconutCart()
  const mats = massageMats()
  const spots = [
    gameSpot('turtle', 96, 482, { board: true }),
    gameSpot('cleanup', 230, 560),
    gameSpot('shells', 250, 356),
    gameSpot('chedi', 60, 380),
    gameSpot('photo', 330, 452, { board: false, rect: { x: 312, y: 408, w: 38, h: 46 }, at: { x: 331, y: 462 } }),
  ]
  const LAMPS: [number, number][] = [
    [30, 708],
    [120, 708],
    [240, 708],
    [330, 708],
  ]
  const props: PlacedProp[] = [
    { sprite: goldenMermaid(), x: MERMAID.x, y: MERMAID.y, id: 'mermaid' },
    { sprite: rocks(2, true), x: 262, y: Math.round(shore(262)) + 4 },
    { sprite: rocks(1), x: 336, y: Math.round(shore(336)) + 2 },
    { sprite: hatch, x: 60, y: 470 },
    { sprite: tower, x: 190, y: 360 },
    { sprite: swimFlag(), x: 150, y: 338 },
    { sprite: swimFlag(), x: 236, y: 330 },
    { sprite: umbrella('#e8514a', '#fffaf0'), x: 140, y: 432 },
    { sprite: umbrella('#5aa9e8', '#fffaf0', 1), x: 180, y: 436 },
    { sprite: umbrella('#ffd23f', '#43905a'), x: 220, y: 430 },
    { sprite: lounger('#5aa9e8'), x: 132, y: 452 },
    { sprite: lounger('#ff9fc0'), x: 186, y: 456 },
    { sprite: lounger('#ffd23f'), x: 226, y: 450 },
    { sprite: trashBins(), x: 252, y: 566, shadow: [10, 2] },
    { sprite: photoFrame('#43b8a8', '#ffd23f'), x: 331, y: 452 },
    { sprite: cart, x: 110, y: 606, shadow: [16, 3] },
    { sprite: mats, x: 268, y: 612 },
    { sprite: seaAlmond(0), x: 272, y: 596 },
    ...[
      [16, 650],
      [60, 668],
      [100, 648],
      [140, 676],
      [214, 664],
      [250, 648],
      [300, 676],
      [346, 654],
      [30, 700],
      [330, 700],
    ].map(([x, y], i) => ({ sprite: casuarina(i % 3), x, y })),
    ...LAMPS.map(([x, y]) => ({ sprite: lampPost(false), night: lampPost(true), x, y })),
    ...spots.flatMap((s) => s.props),
  ]
  const trunk = (x: number, y: number) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })
  return buildBeach({
    id: ID,
    w: W,
    h: H,
    skyH: SKY,
    shore,
    sandTo: SAND_TO,
    paint,
    props,
    obstacles: [
      { x: MERMAID.x - 22, y: MERMAID.y - 14, w: 44, h: 16 },
      { x: 246, y: Math.round(shore(262)) - 10, w: 32, h: 16 },
      { x: 326, y: Math.round(shore(336)) - 6, w: 22, h: 10 },
      { x: 36, y: 456, w: 48, h: 16 },
      { x: 172, y: 346, w: 36, h: 16 },
      { x: 124, y: 428, w: 110, h: 28 },
      { x: 94, y: 596, w: 32, h: 12 },
      { x: 244, y: 600, w: 50, h: 12 },
      { x: 312, y: 444, w: 38, h: 10 },
      ...[16, 60, 100, 140, 214, 250, 300, 346].map((x, i) => trunk(x, [650, 668, 648, 676, 664, 648, 676, 654][i])),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      { x: 0, y: 734, w: W, h: H - 734 },
      ...spots.flatMap((s) => s.obstacles),
    ],
    hotspots: [
      hs('incense', 'นางเงือกทอง', 'ขอพรนางเงือกทอง สัญลักษณ์เมืองสงขลา', 'incense', { x: MERMAID.x - 22, y: MERMAID.y - 48, w: 44, h: 50 }, { x: MERMAID.x - 14, y: MERMAID.y + 12 }, { marker: { x: MERMAID.x, y: MERMAID.y - 52 }, face: 'right' }),
      hs('shop:beach_samila_coconut', 'มะพร้าวใต้ต้นสนก๊ะเยาะ', 'มะพร้าวเย็น ส้มตำปูม้า', 'shop', { x: 92, y: 568, w: 36, h: 40 }, { x: 110, y: 618 }, { marker: { x: 110, y: 566 } }),
      hs('shop:beach_samila_massage', 'นวดใต้ต้นสนป้านี', 'นวดเท้า นวดตัว ใต้ร่มสน', 'lotus', { x: 244, y: 588, w: 50, h: 26 }, { x: 268, y: 624 }, { marker: { x: 268, y: 584 } }),
      ...spots.map((s) => s.hotspot),
      hs('gate', 'ทางออกหาดสมิหลา', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: 160, y: 708, w: 40, h: 26 }, { x: 180, y: 724 }, { face: 'down', marker: { x: 180, y: 704 }, near: 12 }),
    ],
    spawn: { x: 180, y: 500 },
    camBias: 0.78,
    palms: [
      { x: 20, y: 560, v: 0 },
      { x: 330, y: 560, v: 1, flip: true },
      { x: 160, y: 586, v: 2 },
    ],
    moored: [
      { x: 40, y: Math.round(shore(40)) - 14, hull: '#3d63b5', ribbons: ['#e8514a', '#ffd23f', '#fffaf0'] },
      { x: 120, y: Math.round(shore(120)) - 20, hull: '#e8514a', ribbons: ['#ffd23f', '#43905a', '#5aa9e8'], flip: true },
    ],
    routes: [route('longtail', 200, 205, 150, 14, 60, 0), route('jetski', 230, 210, 70, 20, 16, 3, '#e8514a')],
    crabHoles: [
      { x: 70, y: 330 },
      { x: 150, y: 348 },
      { x: 210, y: 336 },
      { x: 320, y: 340 },
    ],
    swimmers: [
      { x: 170, y: Math.round(shore(170)) - 18 },
      { x: 214, y: Math.round(shore(214)) - 24 },
    ],
    dog: { x: 150, y: 520, range: { x: 30, y: 330, w: 280, h: 240 }, coat: 'cream' },
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 30, r: 24 })),
      { x: MERMAID.x, y: MERMAID.y - 20, r: 30, color: '#ffd88a' },
      { x: 110, y: 592, r: 20, color: '#ffe7a8' },
    ],
    wander: [
      { x: 20, y: 320, w: 320, h: 60 },
      { x: 20, y: 380, w: 100, h: 180 },
      { x: 240, y: 380, w: 100, h: 180 },
      { x: 20, y: 520, w: 320, h: 60 },
    ],
    pois: [
      { x: MERMAID.x - 14, y: MERMAID.y + 12, face: 'right' },
      { x: 110, y: 618, face: 'up' },
      { x: 268, y: 624, face: 'up' },
      { x: 96, y: 492, face: 'up' },
      { x: 331, y: 462, face: 'up' },
    ],
    pickupSpots: [
      { x: 40, y: 420 },
      { x: 280, y: 400 },
      { x: 150, y: 540 },
      { x: 320, y: 590 },
      { x: 200, y: 480 },
    ],
    vendors: [{ x: 124, y: 600 }],
    life(s) {
      return [
        new Gags(s, [
          sunbatherGag(152, 490, ['ขอตากแดดอีกด้านนะ', 'ผิวแทนต้องเท่ากันทั้งสองด้าน!', 'ร้อนแต่ฟิน~']),
          buriedDadGag(40, 540),
          castleKidGag(214, 510),
          sleepyUncleGag(300, 520),
          lobsterTouristGag(120, 360, { x0: 90, x1: 170, speed: 8 }),
          selfieGag(MERMAID.x - 36, MERMAID.y + 14, ['รูปที่ 200 แล้ว ยังไม่พอใจ!', 'มุมนี้นางเงือกสวยสุด', 'ถ่ายให้หน่อยได้ไหมคะ~']),
          lifeguardGag(190, hooksAt(tower, 'guard', 190, 360)[0].y),
          walkingVendorGag('icecream', 40, 320, 400),
          walkingVendorGag('somtam', 300, 60, 548),
          massageGag(262, 606),
          kiteKidGag(200, 620),
        ]),
        new Kites(s, [{ x: 204, y: 612, color: '#e8514a', tail: '#ffd23f' }]),
        new TapZones([
          {
            rect: { x: 60, y: SKY, w: 110, h: 34 },
            fn: (x) => {
              s.say(pick(['เกาะหนู เกาะแมว ตำนานแมวไล่หนูจนกลายเป็นเกาะ', 'แมวกับหนูหนีกันจนเป็นหิน!', 'ลูกแก้วของเศรษฐีตกลงทะเลกลายเป็นหาดทราย']), x, SKY + 30, 2.6)
              sfx.tap()
            },
          },
          {
            rect: { x: 300, y: SKY, w: 60, h: 50 },
            fn: (x) => {
              s.say(pick(['เขาตังกวน มีพระเจดีย์บนยอดเขา', 'ขึ้นลิฟต์ไปชมวิวเมืองสงขลาได้นะ']), x, SKY + 40, 2.4)
              sfx.tap()
            },
          },
        ]),
      ]
    },
  })
}
