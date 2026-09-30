// หาดไร่เลย์ กระบี่ (Railay Beach): only reachable by long-tail boat. A
// towering limestone karst closes the beach on the left with Phra Nang
// cave at its foot (a small shrine to the princess who protects seafarers,
// hung with garlands and silk ribbons), climbers on the cliff, more karst
// islets on the horizon, long-tails with ribbons on their bows lined up
// along the water, a smoothie boat and a souvenir hut.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { Gags, type Gag } from '../../gags'
import { Flames, Smoke, TapZones } from '../../life'
import { Monkeys } from './south_life'
import { beachBar, footprintTrail, isle, lampPost, lounger, SAND, sandShadow, seaAlmond, trashBins, turtleHatchery, umbrella, photoFrame, hooksAt, longtailBoat } from '../../../art/places/beach-kit'
import { jungleCap, karstCliff, phraNangShrine } from '../../../art/places/beach-landmarks'
import { buildBeach, gameSpot, hs, route } from './beach-common'
import { castleKidGag, lobsterTouristGag, selfieGag, sleepyUncleGag, sunbatherGag, walkingVendorGag, look } from './beach-gags'
import { drawPerson } from '../../gags'

const ID = 'beach_railay'
const W = 360
const H = 780
const SKY = 56
const SAND_TO = 600
const shore = (x: number) => 312 + Math.sin(x * 0.013 + 0.8) * 9 + Math.sin(x * 0.05) * 3
const CAVE = { x: 70, y: 392 }
const CLIFF: [number, number][] = [[0, SKY - 48], [26, SKY - 54], [60, SKY - 40], [92, SKY - 10], [118, SKY + 60], [132, SKY + 170], [128, SKY + 260], [120, SKY + 330], [96, SKY + 352], [40, SKY + 356], [0, SKY + 356]]

function paint(g: Surface, night: boolean) {
  isle(g, 190, SKY + 2, 14, 30, night, { karst: true })
  isle(g, 232, SKY + 2, 9, 20, night, { karst: true })
  isle(g, 300, SKY + 2, 18, 26, night, { karst: true })
  karstCliff(g, CLIFF, night, 4)
  jungleCap(g, 0, SKY - 50, 96, night, 2)
  // Right-hand karst wall.
  karstCliff(g, [[W, SKY - 30], [W - 30, SKY - 20], [W - 44, SKY + 40], [W - 40, SKY + 120], [W - 20, SKY + 200], [W, SKY + 210]], night, 9)
  jungleCap(g, W - 36, SKY - 26, 40, night, 6)
  const sand = night ? SAND.night : SAND.white
  footprintTrail(g, [[200, 590], [180, 480], [120, 420], [CAVE.x + 10, CAVE.y + 14]], sand)
  for (const [x, y] of [[190, 440], [236, 436]] as [number, number][]) sandShadow(g, x + 6, y + 2, 16, 5)
  // Jungle behind the beach (resort path).
  g.rect(0, SAND_TO, W, H - SAND_TO, night ? '#1e3a34' : '#3f7a4f')
  for (let i = 0; i < 70; i++) {
    const x = (i * 53) % W
    const y = SAND_TO + 10 + ((i * 29) % (H - SAND_TO - 10))
    g.circle(x, y, 8, i % 3 ? (night ? '#28483e' : '#4a8a58') : night ? '#305248' : '#6aae64')
  }
  g.rect(166, SAND_TO, 28, H - SAND_TO, night ? '#8a7a66' : '#d8c09a')
}

/** A climber on a rope halfway up the cliff (tap: "อย่ามองลงข้างล่าง!"). */
function climberGag(x: number, y: number): Gag {
  const lk = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_white', head: 'head_cap' })
  return {
    x,
    y,
    w: 14,
    h: 28,
    z: 400,
    lines: ['อย่ามองลงข้างล่าง... มองไปแล้ว!', 'ไร่เลย์คือสวรรค์นักปีนผา', 'อีกนิดเดียวถึงยอด!', 'แขนล้าแล้ว ช่วยด้วยยย'],
    draw: (g, p) => {
      g.vline(p.x, p.y - 120, p.y - 20, '#fffaf0')
      const up = Math.round(Math.sin(p.t * 0.6) * 6)
      drawPerson(g, lk, { ...p, y: p.y + up, moving: false }, 'back', [], 'offer')
    },
    react: (s, gx, gy) => {
      for (let i = 0; i < 4; i++) s.particles.add({ kind: 'dot', x: gx + rand(-3, 3), y: gy - 4, vx: rand(-6, 6), vy: 10, g: 120, max: 0.8, color: '#c8a888' })
      sfx.scratch()
    },
  }
}

export function railayMap(): MapDef {
  const shrine = phraNangShrine(false)
  const shrineN = phraNangShrine(true)
  const hut = beachBar(false, '#ff9fc0')
  const hutN = beachBar(true, '#ff9fc0')
  const shakeBoat = longtailBoat('#e8e0d4', ['#ffd23f', '#e8514a', '#43905a'], '#ff9fc0')
  const spots = [
    gameSpot('snorkel', 250, 368),
    gameSpot('cleanup', 190, 540),
    gameSpot('shells', 160, 356),
    gameSpot('turtle', 300, 480),
    gameSpot('photo', 330, 420, { board: false, rect: { x: 312, y: 378, w: 38, h: 46 }, at: { x: 331, y: 432 } }),
  ]
  const shakeY = Math.round(shore(212)) - 4
  const props: PlacedProp[] = [
    { sprite: shrine, night: shrineN, x: CAVE.x, y: CAVE.y },
    { sprite: hut, night: hutN, x: 290, y: 584, shadow: [30, 4] },
    { sprite: shakeBoat, x: 212, y: shakeY },
    { sprite: turtleHatchery(), x: 290, y: 520 },
    { sprite: umbrella('#43b8a8', '#fffaf0'), x: 190, y: 440 },
    { sprite: umbrella('#ff9fc0', '#fffaf0', 1), x: 236, y: 436 },
    { sprite: lounger('#43b8a8'), x: 184, y: 462 },
    { sprite: lounger('#ff9fc0'), x: 242, y: 458 },
    { sprite: trashBins(), x: 212, y: 546, shadow: [10, 2] },
    { sprite: photoFrame('#d89060', '#43b8a8'), x: 331, y: 422 },
    { sprite: seaAlmond(1), x: 140, y: 590 },
    { sprite: seaAlmond(2), x: 226, y: 596 },
    { sprite: lampPost(false), night: lampPost(true), x: 160, y: 596 },
    { sprite: lampPost(false), night: lampPost(true), x: 200, y: 596 },
    ...spots.flatMap((s) => s.props),
  ]
  return buildBeach({
    id: ID,
    w: W,
    h: H,
    skyH: SKY,
    shore,
    sandTo: SAND_TO,
    surf: [120, W - 30],
    paint,
    props,
    obstacles: [
      { x: 0, y: SKY, w: 124, h: 336 },
      { x: 0, y: SKY + 330, w: 104, h: 18 },
      { x: 124, y: SKY, w: 10, h: 250 },
      { x: W - 44, y: SKY, w: 44, h: 220 },
      { x: CAVE.x - 34, y: CAVE.y - 14, w: 68, h: 12 },
      { x: 258, y: 570, w: 64, h: 16 },
      { x: 180, y: shakeY - 10, w: 60, h: 12 },
      { x: 268, y: 506, w: 48, h: 16 },
      { x: 176, y: 434, w: 76, h: 30 },
      { x: 198, y: 538, w: 28, h: 10 },
      { x: 312, y: 414, w: 38, h: 10 },
      { x: 136, y: 584, w: 8, h: 8 },
      { x: 222, y: 590, w: 8, h: 8 },
      { x: 0, y: SAND_TO + 4, w: 166, h: H },
      { x: 194, y: SAND_TO + 4, w: W, h: H },
      ...spots.flatMap((s) => s.obstacles),
    ],
    hotspots: [
      hs('incense', 'ถ้ำพระนาง', 'ไหว้เจ้าแม่ผู้คุ้มครองคนเดินเรือ ถวายพวงมาลัยอย่างสำรวม', 'incense', { x: CAVE.x - 30, y: CAVE.y - 52, w: 60, h: 54 }, { x: CAVE.x, y: CAVE.y + 18 }, { marker: { x: CAVE.x, y: CAVE.y - 56 } }),
      hs('shop:beach_railay_shake', 'น้ำปั่นบนเรือหางยาว', 'น้ำมะม่วงปั่น มะพร้าว ข้าวโพด', 'tea', { x: 186, y: shakeY - 24, w: 50, h: 24 }, { x: 212, y: shakeY + 10 }, { marker: { x: 214, y: shakeY - 26 } }),
      hs('shop:beach_railay_souvenir', 'ของที่ระลึกไร่เลย์', 'โปสการ์ด เรือจิ๋ว เสื้อลายทะเล', 'shop', { x: 262, y: 540, w: 56, h: 46 }, { x: 290, y: 594 }, { marker: { x: 290, y: 536 } }),
      ...spots.map((s) => s.hotspot),
      hs('gate', 'ท่าเรือหางยาว (ทางออก)', 'นั่งเรือกลับ หรือไปที่อื่น', 'map', { x: 166, y: SAND_TO, w: 28, h: 40 }, { x: 180, y: SAND_TO + 24 }, { face: 'down', marker: { x: 180, y: SAND_TO - 4 }, near: 12 }),
    ],
    spawn: { x: 190, y: 510 },
    camBias: 0.78,
    palms: [
      { x: 150, y: 500, v: 1 },
      { x: 340, y: 560, v: 2, flip: true },
    ],
    moored: [
      { x: 150, y: Math.round(shore(150)) - 14, hull: '#8a5a3a', ribbons: ['#e8514a', '#ffd23f', '#43905a'], canopy: '#3d63b5' },
      { x: 280, y: Math.round(shore(280)) - 8, hull: '#6e4a35', ribbons: ['#ff9fc0', '#fffaf0', '#5aa9e8'], flip: true },
      { x: 330, y: Math.round(shore(330)) - 24, hull: '#9a6a45', ribbons: ['#e8514a', '#fffaf0'], canopy: '#e8514a', flip: true },
    ],
    routes: [route('longtail', 230, 210, 80, 16, 36, 4)],
    crabHoles: [
      { x: 170, y: 340 },
      { x: 240, y: 336 },
      { x: 300, y: 344 },
    ],
    swimmers: [
      { x: 200, y: Math.round(shore(200)) - 26 },
      { x: 260, y: Math.round(shore(260)) - 18 },
    ],
    dog: { x: 240, y: 500, range: { x: 140, y: 350, w: 180, h: 200 }, coat: 'tan' },
    lights: [
      { x: 160, y: 566, r: 22 },
      { x: 200, y: 566, r: 22 },
      ...hooksAt(hut, 'lamp', 290, 584).map((p) => ({ x: p.x, y: p.y, r: 28, color: '#ffcf7a' })),
      ...hooksAt(shrine, 'candle', CAVE.x, CAVE.y).map((p) => ({ x: p.x, y: p.y, r: 14, color: '#ffb35a' })),
      { x: CAVE.x, y: CAVE.y - 20, r: 34, color: '#ffc86a' },
    ],
    wander: [
      { x: 150, y: 350, w: 150, h: 60 },
      { x: 150, y: 480, w: 140, h: 60 },
    ],
    pois: [
      { x: CAVE.x, y: CAVE.y + 12, face: 'up' },
      { x: 290, y: 594, face: 'up' },
      { x: 212, y: shakeY + 10, face: 'up' },
      { x: 331, y: 432, face: 'up' },
    ],
    pickupSpots: [
      { x: 150, y: 420 },
      { x: 270, y: 420 },
      { x: 240, y: 520 },
      { x: 110, y: 420 },
    ],
    vendors: [{ x: 290, y: 572 }],
    life(s) {
      return [
        new Smoke(s, hooksAt(shrine, 'smoke', CAVE.x, CAVE.y), 5),
        new Flames(s, hooksAt(shrine, 'candle', CAVE.x, CAVE.y)),
        new Monkeys(s, [
          { x: 120, y: CAVE.y + 30, range: 14 },
          { x: 140, y: CAVE.y + 40, baby: true, range: 8 },
        ]),
        new Gags(s, [
          climberGag(118, 250),
          climberGag(128, 200),
          sunbatherGag(236, 500, ['ไร่เลย์สวยเหมือนภาพวาด', 'ขออยู่ที่นี่ตลอดไป~', 'น้ำสีมรกตจริง ๆ'], ['#43b8a8', '#fffaf0']),
          castleKidGag(170, 520),
          sleepyUncleGag(250, 540),
          lobsterTouristGag(220, 380, { x0: 170, x1: 300, speed: 7 }),
          selfieGag(CAVE.x + 44, CAVE.y + 20, ['เบา ๆ นะ ที่นี่ศักดิ์สิทธิ์', 'ถ่ายจากข้างนอกพอ ไม่รบกวนท่าน', 'หน้าผาสูงมาก!']),
          walkingVendorGag('icecream', 160, 300, 400),
        ]),
        new TapZones([
          {
            rect: { x: 150, y: SKY - 40, w: 180, h: 44 },
            fn: (x) => {
              s.say(pick(['เกาะหินปูนโผล่กลางทะเล', 'ทะเลกระบี่ใสมาก', 'ไปเกาะปอดะก็ได้นะ']), x, SKY, 2.4)
              sfx.tap()
            },
          },
        ]),
      ]
    },
  })
}
