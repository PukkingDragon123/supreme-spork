// หาดบางแสน ชลบุรี (Bang Saen Beach): the closest beach to Bangkok. Rows
// of canvas sling chairs under striped umbrellas, stacks of white rubber
// rings for rent, steamed blue crabs, the green headland of Khao Sam Muk
// with the red shrine of Chao Mae Sam Muk at its foot and a troop of
// macaques who steal sunglasses, and a banana boat doing laps.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { Gags } from '../../gags'
import { Traffic } from '../../life'
import { Smoke, TapZones } from '../../life'
import { road, sidewalk } from '../common'
import { Monkeys } from './south_life'
import { boardwalk, casuarina, footprintTrail, isle, lampPost, ringStack, rocks, SAND, sandcastle, sandShadow, seafoodStall, slingChair, swimFlag, trashBins, umbrella, photoFrame, hooksAt, lifeguardTower } from '../../../art/places/beach-kit'
import { headland, samMukShrine } from '../../../art/places/beach-landmarks'
import { buildBeach, gameSpot, hs, route } from './beach-common'
import { buriedDadGag, castleKidGag, lifeguardGag, lobsterTouristGag, selfieGag, sleepyUncleGag, walkingVendorGag } from './beach-gags'

const ID = 'beach_bangsaen'
const W = 360
const H = 820
const SKY = 56
const SAND_TO = 650
const shore = (x: number) => 300 + Math.sin(x * 0.01) * 6 + Math.sin(x * 0.043 + 1) * 4 + Math.max(0, 110 - x) * 0.25
const SHRINE = { x: 64, y: 362 }
const HEAD: [number, number][] = [[0, SKY - 26], [30, SKY - 34], [62, SKY - 22], [96, SKY + 10], [118, SKY + 70], [124, SKY + 150], [112, SKY + 230], [92, SKY + 270], [60, SKY + 290], [0, SKY + 296]]

function paint(g: Surface, night: boolean) {
  isle(g, 230, SKY + 3, 26, 7, night, { sand: true })
  isle(g, 300, SKY + 2, 12, 5, night)
  headland(g, HEAD, night, 3)
  // Rocks where the headland meets the sea, and the stair path to the shrine.
  for (let i = 0; i < 12; i++) {
    const x = 80 + i * 4
    const y = SKY + 250 + i * 4
    g.ellipse(x, y, 6, 3, night ? '#4a4a5a' : '#8a8494')
    g.ellipse(x - 1, y - 1, 4, 2, night ? '#5a5a6a' : '#b0aabb')
  }
  const sand = night ? SAND.night : SAND.golden
  footprintTrail(g, [[200, 640], [230, 520], [260, 420], [250, 330]], sand)
  footprintTrail(g, [[120, 380], [170, 420], [200, 520]], sand)
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) sandShadow(g, 158 + i * 38 + 6, 420 + r * 56 + 2, 16, 5)
  // Beach road with the promenade wall and casuarinas.
  g.rect(0, SAND_TO - 6, W, 8, night ? '#9a9488' : '#e0d8c8')
  for (let x = 0; x < W; x += 10) g.vline(x, SAND_TO - 6, SAND_TO + 1, night ? '#8a8478' : '#c8c0b0')
  sidewalk(g, 0, SAND_TO + 2, W, 36)
  road(g, 0, SAND_TO + 38, W, H - SAND_TO - 38)
  boardwalk(g, 168, 606, 24, 44, night)
}

export function bangsaenMap(): MapDef {
  const shrine = samMukShrine(false)
  const shrineN = samMukShrine(true)
  const crab = seafoodStall(['#e8514a', '#fffaf0'], 'crab')
  const rings = seafoodStall(['#5aa9e8', '#fffaf0'], 'drinks')
  const tower = lifeguardTower()
  const spots = [
    gameSpot('banana', 300, 360),
    gameSpot('cleanup', 128, 560),
    gameSpot('shells', 220, 348),
    gameSpot('chedi', 330, 470),
    gameSpot('photo', 330, 580, { board: false, rect: { x: 312, y: 538, w: 38, h: 46 }, at: { x: 331, y: 592 } }),
  ]
  const chairs: PlacedProp[] = []
  const cols: [string, string][] = [['#e8514a', '#fffaf0'], ['#5aa9e8', '#fffaf0'], ['#ffd23f', '#e8514a'], ['#43905a', '#fffaf0'], ['#ff9fc0', '#fffaf0']]
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 5; i++) {
      const x = 158 + i * 38
      const y = 420 + r * 56
      chairs.push({ sprite: umbrella(cols[(i + r) % 5][0], cols[(i + r) % 5][1], i % 2), x, y })
      chairs.push({ sprite: slingChair(['#5aa9e8', '#e8514a', '#ffd23f'][(i + r) % 3]), x: x - 8, y: y + 12 })
      if ((i + r) % 2) chairs.push({ sprite: slingChair(['#ff9fc0', '#43905a'][i % 2]), x: x + 8, y: y + 12 })
    }
  const LAMPS: [number, number][] = [
    [30, 648],
    [130, 648],
    [230, 648],
    [330, 648],
  ]
  const props: PlacedProp[] = [
    { sprite: shrine, night: shrineN, x: SHRINE.x, y: SHRINE.y },
    { sprite: rocks(2, true), x: 124, y: Math.round(shore(124)) + 2 },
    { sprite: crab, x: 60, y: 610, shadow: [22, 3] },
    { sprite: rings, x: 262, y: 612, shadow: [22, 3] },
    { sprite: ringStack(6), x: 300, y: 620 },
    { sprite: ringStack(4), x: 226, y: 616 },
    { sprite: tower, x: 180, y: 370 },
    { sprite: swimFlag(), x: 140, y: 336 },
    { sprite: swimFlag(true), x: 262, y: 340 },
    { sprite: trashBins(), x: 150, y: 566, shadow: [10, 2] },
    { sprite: sandcastle(1), x: 300, y: 520 },
    { sprite: photoFrame('#ff9fc0', '#fffaf0'), x: 331, y: 582 },
    ...chairs,
    ...[20, 110, 240, 344].map((x, i) => ({ sprite: casuarina(i % 3), x, y: 646 - (i % 2) * 4 })),
    ...LAMPS.map(([x, y]) => ({ sprite: lampPost(false), night: lampPost(true), x, y })),
    ...spots.flatMap((s) => s.props),
  ]
  return buildBeach({
    id: ID,
    w: W,
    h: H,
    skyH: SKY,
    shore,
    sand: SAND.golden,
    surf: [118, W],
    sandTo: SAND_TO,
    paint,
    props,
    obstacles: [
      { x: 0, y: SKY, w: 100, h: 290 },
      { x: 100, y: SKY, w: 24, h: 250 },
      { x: SHRINE.x - 32, y: SHRINE.y - 22, w: 64, h: 12 },
      { x: 108, y: Math.round(shore(124)) - 12, w: 32, h: 14 },
      { x: 34, y: 598, w: 50, h: 14 },
      { x: 236, y: 600, w: 50, h: 14 },
      { x: 288, y: 610, w: 24, h: 10 },
      { x: 214, y: 606, w: 24, h: 10 },
      { x: 162, y: 356, w: 36, h: 16 },
      { x: 286, y: 510, w: 30, h: 10 },
      { x: 312, y: 574, w: 38, h: 10 },
      ...chairs.map((c) => ({ x: c.x - 5, y: c.y - 3, w: 10, h: 4 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      { x: 0, y: SAND_TO + 38, w: W, h: H - SAND_TO - 38 },
      ...spots.flatMap((s) => s.obstacles),
    ],
    hotspots: [
      hs('incense', 'ศาลเจ้าแม่สามมุข', 'จุดธูปไหว้เจ้าแม่ ขอให้เดินทางทะเลปลอดภัย', 'incense', { x: SHRINE.x - 28, y: SHRINE.y - 50, w: 56, h: 52 }, { x: SHRINE.x, y: SHRINE.y + 12 }, { marker: { x: SHRINE.x, y: SHRINE.y - 54 } }),
      hs('shop:beach_bangsaen_seafood', 'ปูม้านึ่งป้าแจ๋ว', 'ปูม้านึ่ง ส้มตำปูม้า มะพร้าว', 'shop', { x: 36, y: 574, w: 48, h: 38 }, { x: 60, y: 622 }, { marker: { x: 60, y: 570 } }),
      hs('shop:beach_bangsaen_ring', 'ห่วงยางเช่าพี่ตู่', 'ห่วงยาง ของที่ระลึกบางแสน', 'shop', { x: 238, y: 574, w: 48, h: 38 }, { x: 262, y: 624 }, { marker: { x: 262, y: 570 } }),
      ...spots.map((s) => s.hotspot),
      hs('gate', 'ทางออกหาดบางแสน', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: 160, y: 640, w: 40, h: 30 }, { x: 180, y: 672 }, { face: 'down', marker: { x: 180, y: 640 }, near: 12 }),
    ],
    spawn: { x: 180, y: 540 },
    camBias: 0.78,
    palms: [
      { x: 140, y: 610, v: 1 },
      { x: 340, y: 400, v: 2, flip: true },
    ],
    moored: [{ x: 160, y: Math.round(shore(160)) - 22, hull: '#3d63b5', ribbons: ['#e8514a', '#ffd23f', '#fffaf0'] }],
    routes: [route('banana', 250, 206, 110, 22, 22, 0, '#e8514a'), route('jetski', 220, 250, 60, 12, 12, 5, '#5aa9e8')],
    crabHoles: [
      { x: 150, y: 334 },
      { x: 210, y: 330 },
      { x: 330, y: 338 },
    ],
    swimmers: [
      { x: 200, y: Math.round(shore(200)) - 14 },
      { x: 236, y: Math.round(shore(236)) - 22 },
      { x: 290, y: Math.round(shore(290)) - 16 },
    ],
    dog: { x: 250, y: 540, range: { x: 130, y: 330, w: 210, h: 240 }, coat: 'black' },
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 30, r: 24 })),
      ...hooksAt(shrine, 'lanterns', SHRINE.x, SHRINE.y).map((p) => ({ x: p.x, y: p.y, r: 14, color: '#ff6a4a' })),
      { x: SHRINE.x, y: SHRINE.y - 20, r: 30, color: '#ffb35a' },
      { x: 60, y: 596, r: 22, color: '#ffe7a8' },
      { x: 262, y: 596, r: 22, color: '#ffe7a8' },
    ],
    wander: [
      { x: 130, y: 320, w: 220, h: 80 },
      { x: 130, y: 520, w: 200, h: 60 },
      { x: 30, y: 380, w: 100, h: 180 },
    ],
    pois: [
      { x: SHRINE.x, y: SHRINE.y + 12, face: 'up' },
      { x: 60, y: 622, face: 'up' },
      { x: 262, y: 624, face: 'up' },
      { x: 331, y: 592, face: 'up' },
    ],
    pickupSpots: [
      { x: 140, y: 400 },
      { x: 320, y: 420 },
      { x: 60, y: 480 },
      { x: 240, y: 560 },
    ],
    vendors: [
      { x: 72, y: 600 },
      { x: 274, y: 600 },
    ],
    life(s) {
      return [
        new Traffic(s, [{ y: 700, dir: 1 }, { y: 770, dir: -1 }]),
        new Monkeys(s, [
          { x: 30, y: SHRINE.y + 18, range: 16 },
          { x: 104, y: SHRINE.y + 6, range: 14 },
          { x: 96, y: SHRINE.y + 30, baby: true, range: 10 },
          { x: 20, y: 420, range: 20 },
        ]),
        new Smoke(s, hooksAt(shrine, 'smoke', SHRINE.x, SHRINE.y), 5),
        new Gags(s, [
          buriedDadGag(200, 540),
          castleKidGag(280, 522),
          sleepyUncleGag(196, 488),
          lobsterTouristGag(160, 360, { x0: 140, x1: 240, speed: 8 }),
          selfieGag(SHRINE.x + 34, SHRINE.y + 16, ['ลิงขโมยแว่นไปแล้ว ขอถ่ายอีกรูป!', 'เจ้าแม่สามมุขศักดิ์สิทธิ์มาก', 'มุมนี้เห็นทะเลทั้งอ่าว']),
          lifeguardGag(180, hooksAt(tower, 'guard', 180, 370)[0].y),
          walkingVendorGag('sarong', 140, 330, 404),
          walkingVendorGag('icecream', 320, 150, 536),
        ]),
        new TapZones([
          {
            rect: { x: 0, y: SKY - 30, w: 110, h: 90 },
            fn: (x, y) => {
              s.say(pick(['เขาสามมุข ตำนานรักสาวสามมุข', 'บนเขามีลิงแสมเป็นร้อยตัว!', 'ชาวประมงไหว้เจ้าแม่ก่อนออกเรือ']), x, y + 10, 2.6)
              sfx.tap()
            },
          },
        ]),
      ]
    },
  })
}
