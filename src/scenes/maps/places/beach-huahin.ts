// หาดหัวหิน (Hua Hin Beach): Thailand's oldest seaside resort. Horses
// walk the beach with riders, the granite boulders that gave the town its
// name sit at the water's edge, the standing Buddha of Khao Takiap faces
// the sea from its hill to the south, and the way onto the beach passes the
// red-and-cream royal waiting pavilion in the style of Hua Hin station.
// Grilled squid and an ice-cream tricycle.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { Gags } from '../../gags'
import { Smoke, TapZones, Traffic } from '../../life'
import { road, sidewalk } from '../common'
import { Monkeys } from './south_life'
import { footprintTrail, iceCart, isle, lampPost, lounger, rocks, SAND, sandShadow, seaAlmond, squidGrill, swimFlag, trashBins, turtleHatchery, umbrella, photoFrame, hooksAt, boardwalk } from '../../../art/places/beach-kit'
import { beachSala, hillWithChedi, huaHinPavilion, standingBuddha } from '../../../art/places/beach-landmarks'
import { buildBeach, gameSpot, hs, route } from './beach-common'
import { Horses, Kites } from './beach-life'
import { buriedDadGag, castleKidGag, kiteKidGag, lobsterTouristGag, sleepyUncleGag, sunbatherGag, walkingVendorGag } from './beach-gags'

const ID = 'beach_huahin'
const W = 360
const H = 840
const SKY = 56
const SAND_TO = 640
const shore = (x: number) => 288 + Math.sin(x * 0.014 + 2) * 8 + Math.sin(x * 0.051) * 4
const SALA = { x: 318, y: 372 }
const PAV = { x: 180, y: 720 }

function paint(g: Surface, night: boolean) {
  isle(g, 120, SKY + 3, 16, 5, night, { sand: true })
  // Khao Takiap rising from the sea to the south, the standing Buddha on its flank.
  hillWithChedi(g, W - 30, SKY + 2, 52, 40, night, false)
  hillWithChedi(g, W + 10, SKY + 2, 34, 28, night, false)
  const sand = night ? SAND.night : SAND.golden
  footprintTrail(g, [[40, 330], [120, 336], [200, 328], [300, 334]], sand)
  footprintTrail(g, [[60, 350], [140, 358], [240, 350], [330, 360]], sand)
  for (const [x, y] of [[150, 452], [196, 448], [242, 456]] as [number, number][]) sandShadow(g, x + 6, y + 2, 16, 5)
  // Hoof prints along the horse track.
  for (let x = 20; x < 340; x += 7) {
    g.px(x, 372 + (x % 2), sand.dark)
    g.px(x + 1, 372 + (x % 2), sand.dark)
  }
  // Seawall, lawn and the road behind the pavilion.
  g.rect(0, SAND_TO - 6, W, 10, night ? '#8a8478' : '#c8bca8')
  for (let x = 0; x < W; x += 12) g.vline(x, SAND_TO - 6, SAND_TO + 3, night ? '#6a6458' : '#a89c88')
  g.rect(0, SAND_TO + 4, W, 60, night ? '#5a6e52' : '#9ac070')
  for (let i = 0; i < 300; i++) g.px((i * 83) % W, SAND_TO + 4 + ((i * 37) % 60), i % 2 ? (night ? '#4a5e44' : '#7aa058') : night ? '#6a7e60' : '#b8d88a')
  sidewalk(g, 0, 744, W, 20)
  road(g, 0, 764, W, H - 764)
  boardwalk(g, 168, 610, 24, 40, night)
}

export function huahinMap(): MapDef {
  const pav = huaHinPavilion(false)
  const pavN = huaHinPavilion(true)
  const sala = beachSala(false, '#c8343f')
  const salaN = beachSala(true, '#c8343f')
  const grill = squidGrill()
  const ice = iceCart()
  const spots = [
    gameSpot('turtle', 60, 520),
    gameSpot('cleanup', 250, 560),
    gameSpot('shells', 150, 340),
    gameSpot('chedi', 90, 420),
    gameSpot('photo', 330, 470, { board: false, rect: { x: 312, y: 428, w: 38, h: 46 }, at: { x: 331, y: 482 } }),
  ]
  const LAMPS: [number, number][] = [
    [40, 700],
    [110, 700],
    [250, 700],
    [320, 700],
  ]
  const props: PlacedProp[] = [
    { sprite: pav, night: pavN, x: PAV.x, y: PAV.y },
    { sprite: sala, night: salaN, x: SALA.x, y: SALA.y },
    { sprite: standingBuddha(), x: W - 44, y: SKY - 8 },
    { sprite: rocks(2, true), x: 36, y: Math.round(shore(36)) + 2 },
    { sprite: rocks(1, true), x: 78, y: Math.round(shore(78)) - 4 },
    { sprite: rocks(0), x: 60, y: Math.round(shore(60)) + 10 },
    { sprite: turtleHatchery(), x: 60, y: 506 },
    { sprite: swimFlag(), x: 120, y: 322 },
    { sprite: swimFlag(), x: 250, y: 318 },
    { sprite: umbrella('#fffaf0', '#3d63b5'), x: 152, y: 452 },
    { sprite: umbrella('#fffaf0', '#e8514a', 1), x: 198, y: 448 },
    { sprite: umbrella('#fffaf0', '#43905a'), x: 244, y: 456 },
    { sprite: lounger('#3d63b5'), x: 146, y: 474 },
    { sprite: lounger('#e8514a'), x: 204, y: 470 },
    { sprite: lounger('#43905a'), x: 250, y: 478 },
    { sprite: grill, x: 100, y: 606, shadow: [16, 3] },
    { sprite: ice, x: 270, y: 612, shadow: [14, 3] },
    { sprite: trashBins(), x: 276, y: 566, shadow: [10, 2] },
    { sprite: photoFrame('#c8343f', '#fff1d6'), x: 331, y: 472 },
    { sprite: seaAlmond(1), x: 40, y: 612 },
    { sprite: seaAlmond(2), x: 330, y: 616 },
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
    sandTo: SAND_TO,
    paint,
    props,
    obstacles: [
      { x: 14, y: Math.round(shore(36)) - 14, w: 44, h: 16 },
      { x: 60, y: Math.round(shore(78)) - 22, w: 36, h: 18 },
      { x: 46, y: Math.round(shore(60)) + 2, w: 28, h: 8 },
      { x: SALA.x - 24, y: SALA.y - 10, w: 48, h: 11 },
      { x: 36, y: 492, w: 48, h: 16 },
      { x: 134, y: 446, w: 130, h: 34 },
      { x: 84, y: 596, w: 32, h: 12 },
      { x: 254, y: 600, w: 32, h: 14 },
      { x: 312, y: 464, w: 38, h: 10 },
      { x: 36, y: 606, w: 8, h: 8 },
      { x: 326, y: 610, w: 8, h: 8 },
      { x: 0, y: SAND_TO - 6, w: 166, h: 10 },
      { x: 194, y: SAND_TO - 6, w: 166, h: 10 },
      { x: PAV.x - 40, y: PAV.y - 20, w: 26, h: 20 },
      { x: PAV.x + 14, y: PAV.y - 20, w: 26, h: 20 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      { x: 0, y: 764, w: W, h: H - 764 },
      ...spots.flatMap((s) => s.obstacles),
    ],
    hotspots: [
      hs('incense', 'ศาลากราบพระเขาตะเกียบ', 'หันไปทางพระพุทธรูปยืน จุดธูปขอพร', 'incense', { x: SALA.x - 22, y: SALA.y - 40, w: 44, h: 42 }, { x: SALA.x - 4, y: SALA.y + 10 }, { marker: { x: SALA.x, y: SALA.y - 44 } }),
      hs('shop:beach_huahin_squid', 'หมึกย่างลุงชัยหัวหิน', 'หมึกย่าง ข้าวโพดปิ้ง', 'shop', { x: 84, y: 576, w: 32, h: 32 }, { x: 100, y: 618 }, { marker: { x: 100, y: 574 } }),
      hs('shop:beach_huahin_icecream', 'ไอติมรถเข็นกริ๊ง ๆ', 'ไอติมกะทิ น้ำมะม่วงปั่น', 'dessert', { x: 254, y: 576, w: 34, h: 36 }, { x: 270, y: 626 }, { marker: { x: 272, y: 574 } }),
      ...spots.map((s) => s.hotspot),
      hs('gate', 'สถานีหัวหิน (ทางออก)', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: PAV.x - 14, y: PAV.y - 40, w: 28, h: 40 }, { x: PAV.x, y: PAV.y - 8 }, { face: 'down', marker: { x: PAV.x, y: PAV.y - 46 }, near: 12 }),
    ],
    spawn: { x: 180, y: 540 },
    camBias: 0.78,
    palms: [
      { x: 20, y: 560, v: 2 },
      { x: 180, y: 590, v: 0 },
      { x: 344, y: 540, v: 1, flip: true },
    ],
    moored: [{ x: 300, y: Math.round(shore(300)) - 22, hull: '#5aa9e8', ribbons: ['#e8514a', '#fffaf0'] }],
    routes: [route('longtail', 180, 190, 140, 12, 70, 20), route('jetski', 200, 240, 80, 14, 14, 2, '#43905a')],
    crabHoles: [
      { x: 120, y: 320 },
      { x: 210, y: 316 },
      { x: 290, y: 324 },
    ],
    swimmers: [{ x: 200, y: Math.round(shore(200)) - 18 }],
    dog: { x: 220, y: 520, range: { x: 110, y: 320, w: 220, h: 240 }, coat: 'spotted' },
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 30, r: 24 })),
      ...hooksAt(pav, 'lamp', PAV.x, PAV.y).map((p) => ({ x: p.x, y: p.y, r: 24, color: '#ffd88a' })),
      { x: SALA.x, y: SALA.y - 16, r: 26, color: '#ffd88a' },
      { x: 100, y: 596, r: 22, color: '#ffb35a' },
      { x: W - 44, y: SKY - 32, r: 18, color: '#ffe7a0' },
    ],
    wander: [
      { x: 110, y: 320, w: 220, h: 80 },
      { x: 100, y: 500, w: 220, h: 80 },
    ],
    pois: [
      { x: SALA.x - 4, y: SALA.y + 10, face: 'up' },
      { x: 100, y: 618, face: 'up' },
      { x: 270, y: 626, face: 'up' },
      { x: 331, y: 482, face: 'up' },
    ],
    pickupSpots: [
      { x: 130, y: 400 },
      { x: 300, y: 420 },
      { x: 150, y: 560 },
      { x: 320, y: 580 },
    ],
    vendors: [{ x: 112, y: 600 }],
    life(s) {
      return [
        new Traffic(s, [
          { y: 790, dir: 1 },
          { y: 820, dir: -1 },
        ]),
        new Horses(s, [
          { x0: 30, x1: 300, y: 380 },
          { x0: 320, x1: 120, y: 398, coat: '#f0e8dc' },
        ]),
        new Monkeys(s, [
          { x: 300, y: SALA.y + 14, range: 14 },
          { x: 340, y: SALA.y + 26, baby: true, range: 8 },
        ]),
        new Smoke(s, [{ x: 100, y: 594 }], 6),
        new Kites(s, [
          { x: 210, y: 590, color: '#ffd23f', tail: '#e8514a' },
          { x: 136, y: 560, color: '#5aa9e8', tail: '#fffaf0' },
        ]),
        new Gags(s, [
          sunbatherGag(196, 510, ['หัวหินลมเย็นที่สุด', 'ขออีกห้านาที~', 'ผิวแทนสวยยัง?'], ['#3d63b5', '#fffaf0']),
          buriedDadGag(120, 540),
          castleKidGag(250, 520),
          sleepyUncleGag(300, 500),
          lobsterTouristGag(200, 410, { x0: 150, x1: 260, speed: 7 }),
          walkingVendorGag('sarong', 40, 300, 346),
          kiteKidGag(210, 598),
          kiteKidGag(136, 568),
        ]),
        new TapZones([
          {
            rect: { x: W - 90, y: SKY - 50, w: 90, h: 60 },
            fn: (x) => {
              s.say(pick(['เขาตะเกียบ พระยืนหันหน้าสู่ทะเล', 'บนเขามีลิงเยอะมาก', 'ขึ้นไปดูวิวหัวหินได้ทั้งเมือง']), x, SKY, 2.6)
              sfx.tap()
            },
          },
        ]),
      ]
    },
  })
}
