// หาดป่าตอง ภูเก็ต (Patong Beach): Phuket's liveliest bay. Row after row of
// umbrellas and loungers, jet skis lined up on the sand, a banana boat and a
// parasail over the Andaman, hawkers with som tam baskets and piles of
// sarongs, massage under the trees, the beach road with its shop signs
// glowing at night, a fire show, and the gate of Wat Suwan Khiri Wong.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { Gags } from '../../gags'
import { TapZones, Traffic } from '../../life'
import { road, sidewalk } from '../common'
import { footprintTrail, jetski, lampPost, lounger, massageMats, SAND, sandShadow, sarongRack, seaAlmond, seafoodStall, swimFlag, trashBins, umbrella, photoFrame, hooksAt, lifeguardTower, INK, mix, rentalBoard } from '../../../art/places/beach-kit'
import { beachSala, headland, watPatongGate } from '../../../art/places/beach-landmarks'
import { buildBeach, gameSpot, hs, route } from './beach-common'
import { FireShow } from './beach-life'
import { castleKidGag, lifeguardGag, lobsterTouristGag, massageGag, selfieGag, sleepyUncleGag, sunbatherGag, walkingVendorGag } from './beach-gags'

const ID = 'beach_patong'
const W = 380
const H = 860
const SKY = 56
const SAND_TO = 640
const shore = (x: number) => 298 + Math.sin(x * 0.009 + 0.3) * 10 + Math.sin(x * 0.046 + 2) * 3
const GATE = { x: 54, y: 716 }
const SALA = { x: 40, y: 612 }

function paint(g: Surface, night: boolean) {
  // Green headlands closing the bay on both sides.
  headland(g, [[0, SKY - 18], [40, SKY - 22], [70, SKY - 4], [60, SKY + 14], [0, SKY + 18]], night, 1)
  headland(g, [[W, SKY - 26], [W - 50, SKY - 20], [W - 90, SKY - 2], [W - 70, SKY + 12], [W, SKY + 20]], night, 5)
  const sand = night ? SAND.night : SAND.golden
  footprintTrail(g, [[190, 630], [210, 520], [180, 420], [200, 320]], sand)
  footprintTrail(g, [[330, 610], [300, 480], [320, 330]], sand)
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) sandShadow(g, 100 + i * 44 + 6, 404 + r * 60 + 2, 16, 5)
  // Beach road: sidewalk with trees, then shops whose signs light up at night.
  sidewalk(g, 0, SAND_TO, W, 30)
  road(g, 0, SAND_TO + 30, W, 60)
  const signs = ['#e8514a', '#5aa9e8', '#ffd23f', '#ff6f91', '#43b8a8', '#b37cf0']
  for (let i = 0; i < 7; i++) {
    const x = 110 + i * 40
    const wall = ['#f0e0c8', '#e0d0e8', '#d8ecf0'][i % 3]
    g.rect(x, SAND_TO + 90, 38, H - SAND_TO - 90, wall)
    g.rect(x + 3, SAND_TO + 110, 32, 30, night ? '#ffd88a' : '#6a7a8a')
    g.rect(x + 3, SAND_TO + 96, 32, 10, night ? mix(signs[i % 6], '#ffffff', 0.35) : signs[i % 6])
    g.hline(x + 6, x + 30, SAND_TO + 100, night ? '#ffffff' : '#fffaf0')
    g.hline(x + 8, x + 26, SAND_TO + 103, night ? '#fff3a6' : mix(signs[i % 6], '#ffffff', 0.4))
    g.vline(x, SAND_TO + 90, H, mix(wall, INK, 0.25))
  }
  // Temple wall of Wat Suwan Khiri Wong on the left.
  g.rect(0, SAND_TO + 90, 108, H - SAND_TO - 90, night ? '#8a8478' : '#fffaf0')
  for (let x = 0; x < 108; x += 12) g.rect(x, SAND_TO + 86, 8, 4, night ? '#8a8478' : '#fffaf0')
  g.hline(0, 107, SAND_TO + 96, '#c8343f')
}

export function patongMap(): MapDef {
  const gate = watPatongGate(false)
  const gateN = watPatongGate(true)
  const sala = beachSala(false, '#2f6fa8')
  const salaN = beachSala(true, '#2f6fa8')
  const tower = lifeguardTower()
  const spots = [
    gameSpot('banana', 250, 350),
    gameSpot('cleanup', 150, 560),
    gameSpot('snorkel', 340, 360),
    gameSpot('shells', 60, 350),
    gameSpot('photo', 350, 540, { board: false, rect: { x: 332, y: 498, w: 38, h: 46 }, at: { x: 351, y: 552 } }),
  ]
  const rows: PlacedProp[] = []
  const cols: [string, string][] = [['#e8514a', '#fffaf0'], ['#3d63b5', '#fffaf0'], ['#ffd23f', '#fffaf0'], ['#43b8a8', '#fffaf0'], ['#ff6f91', '#fffaf0'], ['#f58f35', '#fffaf0']]
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 44
      const y = 404 + r * 60
      rows.push({ sprite: umbrella(cols[(i + r * 2) % 6][0], cols[(i + r * 2) % 6][1], (i + r) % 2), x, y })
      rows.push({ sprite: lounger(cols[(i + 1) % 6][0]), x: x - 8, y: y + 24 })
      rows.push({ sprite: lounger(cols[(i + 3) % 6][0]), x: x + 8, y: y + 24 })
    }
  const LAMPS: [number, number][] = [
    [130, 638],
    [220, 638],
    [310, 638],
  ]
  const props: PlacedProp[] = [
    { sprite: gate, night: gateN, x: GATE.x, y: GATE.y },
    { sprite: sala, night: salaN, x: SALA.x, y: SALA.y },
    { sprite: tower, x: 60, y: 450 },
    { sprite: swimFlag(), x: 170, y: 330 },
    { sprite: swimFlag(true), x: 300, y: 334 },
    ...[196, 218, 240].map((x) => ({ sprite: jetski(pick(['#ffd23f', '#e8514a', '#5aa9e8'])), x, y: Math.round(shore(x)) + 10 })),
    { sprite: rentalBoard('jetski'), x: 270, y: 344 },
    { sprite: seafoodStall(['#ff6f91', '#fffaf0'], 'drinks'), x: 176, y: 600, shadow: [22, 3] },
    { sprite: sarongRack(), x: 250, y: 602 },
    { sprite: massageMats(), x: 330, y: 604 },
    { sprite: seaAlmond(0), x: 330, y: 590 },
    { sprite: trashBins(), x: 172, y: 566, shadow: [10, 2] },
    { sprite: photoFrame('#43b8a8', '#ff6f91'), x: 351, y: 542 },
    ...rows,
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
      { x: GATE.x - 34, y: GATE.y - 8, w: 16, h: 8 },
      { x: GATE.x + 18, y: GATE.y - 8, w: 16, h: 8 },
      { x: SALA.x - 24, y: SALA.y - 10, w: 48, h: 11 },
      { x: 40, y: 436, w: 40, h: 16 },
      { x: 150, y: 588, w: 52, h: 14 },
      { x: 226, y: 590, w: 48, h: 12 },
      { x: 304, y: 590, w: 54, h: 16 },
      { x: 158, y: 558, w: 28, h: 10 },
      { x: 332, y: 534, w: 38, h: 10 },
      ...[196, 218, 240].map((x) => ({ x: x - 9, y: Math.round(shore(x)) + 4, w: 18, h: 8 })),
      ...rows.filter((_, i) => i % 3 === 0).map((c) => ({ x: c.x - 16, y: c.y - 3, w: 32, h: 28 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      { x: 0, y: SAND_TO + 30, w: 30, h: H },
      { x: 80, y: SAND_TO + 30, w: W - 80, h: H },
      ...spots.flatMap((s) => s.obstacles),
    ],
    hotspots: [
      hs('incense', 'ศาลาวัดสุวรรณคีรีวงก์', 'จุดธูปไหว้พระ ขอพรให้ปลอดภัยในทะเล', 'incense', { x: SALA.x - 22, y: SALA.y - 40, w: 44, h: 42 }, { x: SALA.x, y: SALA.y + 10 }, { marker: { x: SALA.x, y: SALA.y - 44 } }),
      hs('donation', 'ตู้ทำบุญวัดป่าตอง', 'ร่วมทำบุญบำรุงวัด', 'coin', { x: GATE.x - 16, y: GATE.y - 50, w: 32, h: 50 }, { x: GATE.x, y: GATE.y + 8 }, { marker: { x: GATE.x, y: GATE.y - 54 }, face: 'up' }),
      hs('shop:beach_patong_somtam', 'ส้มตำหาบเร่พี่ต่าย', 'ส้มตำปูม้า ข้าวโพดปิ้ง', 'shop', { x: 152, y: 566, w: 48, h: 36 }, { x: 176, y: 612 }, { marker: { x: 176, y: 562 } }),
      hs('shop:beach_patong_hat', 'หมวกกับผ้าปาเต๊ะเจ๊นก', 'หมวกสานคาดแว่น ผ้าปาเต๊ะ', 'shirt', { x: 228, y: 568, w: 44, h: 34 }, { x: 250, y: 614 }, { marker: { x: 250, y: 564 } }),
      hs('shop:beach_patong_massage', 'นวดใต้ร่มไม้ป่าตอง', 'นวดไทย นวดน้ำมัน', 'lotus', { x: 306, y: 584, w: 50, h: 22 }, { x: 330, y: 616 }, { marker: { x: 330, y: 580 } }),
      ...spots.map((s) => s.hotspot),
      hs('gate', 'ทางออกถนนเลียบหาด', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: 30, y: SAND_TO + 30, w: 50, h: 40 }, { x: 55, y: SAND_TO + 50 }, { face: 'down', marker: { x: 55, y: SAND_TO + 26 }, near: 12 }),
    ],
    spawn: { x: 200, y: 540 },
    camBias: 0.78,
    palms: [
      { x: 20, y: 560, v: 0 },
      { x: 96, y: 600, v: 1 },
      { x: 280, y: 560, v: 2, flip: true },
      { x: 366, y: 470, v: 1, flip: true },
    ],
    routes: [route('banana', 220, 200, 120, 24, 24, 0, '#ff6f91'), route('parasail', 200, 150, 140, 20, 40, 10, '#3d63b5'), route('jetski', 120, 250, 70, 14, 10, 4, '#ffd23f'), route('jetski', 300, 240, 50, 12, 9, 2, '#e8514a')],
    crabHoles: [
      { x: 100, y: 330 },
      { x: 150, y: 336 },
      { x: 330, y: 330 },
    ],
    swimmers: [
      { x: 140, y: Math.round(shore(140)) - 16 },
      { x: 186, y: Math.round(shore(186)) - 26 },
      { x: 300, y: Math.round(shore(300)) - 18 },
      { x: 90, y: Math.round(shore(90)) - 20 },
    ],
    dog: { x: 120, y: 540, range: { x: 40, y: 320, w: 300, h: 250 }, coat: 'brown' },
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 30, r: 24 })),
      ...hooksAt(gate, 'lamp', GATE.x, GATE.y).map((p) => ({ x: p.x, y: p.y, r: 16, color: '#fff3a6' })),
      { x: SALA.x, y: SALA.y - 16, r: 24, color: '#ffd88a' },
      ...[130, 170, 210, 250, 290, 330, 370].map((x) => ({ x, y: SAND_TO + 100, r: 26, color: ['#ff6f91', '#5aa9e8', '#ffd23f', '#b37cf0'][x % 4] })),
    ],
    wander: [
      { x: 40, y: 320, w: 320, h: 70 },
      { x: 40, y: 530, w: 300, h: 40 },
      { x: 30, y: 480, w: 60, h: 80 },
    ],
    pois: [
      { x: SALA.x, y: SALA.y + 10, face: 'up' },
      { x: 176, y: 612, face: 'up' },
      { x: 250, y: 614, face: 'up' },
      { x: 351, y: 552, face: 'up' },
    ],
    pickupSpots: [
      { x: 80, y: 380 },
      { x: 340, y: 400 },
      { x: 120, y: 550 },
      { x: 300, y: 550 },
    ],
    vendors: [
      { x: 188, y: 592 },
      { x: 262, y: 596 },
    ],
    visitors: 7,
    life(s) {
      return [
        new Traffic(s, [
          { y: 690, dir: 1 },
          { y: 716, dir: -1 },
        ]),
        new FireShow(s, 230, 540),
        new Gags(s, [
          sunbatherGag(120, 540, ['อันดามันสวยที่สุด!', 'แดดภูเก็ตแรงมาก', 'ตากแดดอีกด้าน~'], ['#ff6f91', '#fffaf0']),
          castleKidGag(300, 538),
          sleepyUncleGag(90, 500),
          lobsterTouristGag(250, 370, { x0: 200, x1: 320, speed: 9 }),
          lobsterTouristGag(120, 380),
          selfieGag(340, 380, ['พาราเซลบินผ่านพอดี!', 'รูปนี้ลงไอจีแน่นอน', 'เห็นเจ็ตสกีข้างหลังไหม']),
          lifeguardGag(60, hooksAt(tower, 'guard', 60, 450)[0].y),
          massageGag(324, 598),
          walkingVendorGag('somtam', 40, 340, 392),
          walkingVendorGag('sarong', 350, 60, 520),
          walkingVendorGag('icecream', 80, 330, 336),
        ]),
        new TapZones([
          {
            rect: { x: 80, y: SAND_TO + 90, w: W - 80, h: 60 },
            fn: (x, y) => {
              s.say(pick(['ถนนเลียบหาดป่าตอง คึกคักทั้งคืน', 'ร้านเปิดถึงเช้าเลย!', 'ซื้อของฝากก่อนกลับนะ']), x, y, 2.4)
              sfx.tap()
            },
          },
        ]),
      ]
    },
  })
}
