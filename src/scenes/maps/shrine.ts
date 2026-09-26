// ลานเทพรวมใจ – a plaza of four deity shrines around a central incense urn.

import type { MapDef, PlacedProp } from '../world'
import { drawShrine, ROOFS } from '../../art/buildings'
import { drawDeity } from '../../art/deities'
import * as T from '../../art/temple'
import * as F from '../../art/templeprops'
import * as G from '../../art/garden'
import { road, sidewalk } from './common'
import { sfx } from '../../engine/audio'
import { rand } from '../../engine/rng'
import { Butterflies, CloudShadows, EaveBells, Flags, Glints, Lanterns, Smoke, SunRays, TapZones, Traffic } from '../life'

const W = 224
const H = 480

const SHRINES = [
  { id: 'ganesha', x: 58, y: 190, roof: ROOFS.red },
  { id: 'brahma', x: 166, y: 190, roof: ROOFS.gold },
  { id: 'guanyin', x: 58, y: 314, roof: ROOFS.blue },
  { id: 'lakshmi', x: 166, y: 314, roof: ROOFS.orange },
]

const LABELS: Record<string, [string, string]> = {
  ganesha: ['ศาลพระพิฆเนศ', 'เทพแห่งความสำเร็จ'],
  brahma: ['ศาลพระพรหม', 'ขอพรให้สมหวังทุกด้าน'],
  guanyin: ['ศาลเจ้าแม่กวนอิม', 'เมตตาต่อสรรพสัตว์'],
  lakshmi: ['ศาลพระแม่ลักษมี', 'ความรักและความมั่งคั่ง'],
}

const TREES = [
  { id: 't1', x: 14, y: 128, v: 0 },
  { id: 't2', x: 210, y: 128, v: 3 },
  { id: 't3', x: 14, y: 400, v: 2 },
  { id: 't4', x: 210, y: 404, v: 1 },
]

const GATE = { x: 112, y: 448 }
const URN = { x: 112, y: 262 }

export function shrineMap(): MapDef {
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const lamps: [number, number][] = [
    [92, 380],
    [132, 380],
    [92, 140],
    [132, 140],
  ]
  const props: PlacedProp[] = [
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 88, y: 258 },
    { sprite: F.candleStandSprite(), x: 136, y: 258 },
    { sprite: F.donationSprite(), x: 112, y: 222 },
    { sprite: F.stallSprite(), x: 44, y: 420 },
    { sprite: G.coconutPalm(0), x: 200, y: 96 },
    { sprite: G.coconutPalm(1), x: 22, y: 92 },
    { sprite: G.topiary(0), x: 16, y: 250 },
    { sprite: G.topiary(2), x: 208, y: 252 },
    { sprite: G.bougainvillea(0), x: 196, y: 434 },
    { sprite: F.lotusJarSprite('blue'), x: 86, y: 300 },
    { sprite: F.lotusJarSprite('green'), x: 138, y: 300 },
    { sprite: F.flagPoleSprite(40), x: 30, y: 250 },
    { sprite: F.flagPoleSprite(40), x: 194, y: 250 },
    { sprite: T.wallSprite(82), x: 0, y: 448 },
    { sprite: T.wallSprite(82), x: 142, y: 448 },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...TREES.map((t) => ({ sprite: G.frangipani(t.v), x: t.x, y: t.y, id: t.id })),
    ...lamps.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: 'shrine',
    w: W,
    h: H,
    skyH: 72,
    ground: '#86c95f',
    bake(g, night) {
      G.treeLine(g, 56, W, G.LEAVES.far, 2)
      G.treeLine(g, 70, W, G.LEAVES.deep, 5)
      G.lawn(g, 0, 88, W, H - 88 - 32, 7)
      G.paving(g, 18, 200, 188, 44, 8)
      G.paving(g, 96, 88, 32, 360, 8)
      G.paving(g, 18, 324, 188, 40, 8)
      G.mandala(g, URN.x, 272, 22)
      G.flowerBed(g, 76, 150, 14, 30, ['#f58f35', '#ffd23f'], 1)
      G.flowerBed(g, 134, 150, 14, 30, ['#ff9fc0', '#fffaf0'], 2)
      G.flowerBed(g, 76, 390, 14, 36, ['#e8514a', '#ffd23f'], 3)
      G.flowerBed(g, 134, 390, 14, 36, ['#f58f35', '#ff9fc0'], 4)
      for (const t of TREES) G.groundShadow(g, t.x, t.y, 15, 4, 0.6)
      for (const s of SHRINES) {
        G.groundShadow(g, s.x, s.y - 2, 34, 6, 0.6)
        drawShrine(g, s.x, s.y, { roof: s.roof, w: 50, h: 44 })
        drawDeity(g, s.id, s.x, s.y - 8, 1, 0)
        // Garlands on the shrine pillars.
        for (let i = 0; i < 5; i++) {
          g.px(s.x - 24, s.y - 40 + i * 3, i % 2 ? '#ffd23f' : '#f58f35')
          g.px(s.x + 23, s.y - 40 + i * 3, i % 2 ? '#ffd23f' : '#f58f35')
        }
        if (night) {
          g.rect(s.x - 20, s.y - 48, 2, 2, '#ffe7a8')
          g.rect(s.x + 18, s.y - 48, 2, 2, '#ffe7a8')
        }
      }
      sidewalk(g, 0, 448, W, 10)
      road(g, 0, 458, W, 22)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 96 },
      ...SHRINES.map((s) => ({ x: s.x - 30, y: s.y - 60, w: 60, h: 60 })),
      { x: 102, y: 255, w: 20, h: 9 },
      { x: 81, y: 252, w: 14, h: 7 },
      { x: 129, y: 252, w: 14, h: 7 },
      { x: 106, y: 216, w: 12, h: 7 },
      { x: 20, y: 408, w: 50, h: 14 },
      { x: 76, y: 150, w: 14, h: 30 },
      { x: 134, y: 150, w: 14, h: 30 },
      { x: 76, y: 390, w: 14, h: 36 },
      { x: 134, y: 390, w: 14, h: 36 },
      { x: 80, y: 294, w: 12, h: 7 },
      { x: 132, y: 294, w: 12, h: 7 },
      { x: 0, y: 434, w: 98, h: 16 },
      { x: 126, y: 434, w: 98, h: 16 },
      { x: 0, y: 452, w: W, h: 28 },
      ...TREES.map((t) => ({ x: t.x - 3, y: t.y - 3, w: 6, h: 4 })),
      ...lamps.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      ...SHRINES.map((s) => ({
        id: s.id,
        label: LABELS[s.id][0],
        hint: LABELS[s.id][1],
        icon: 'deity',
        rect: { x: s.x - 28, y: s.y - 70, w: 56, h: 72 },
        at: { x: s.x, y: s.y + 10 },
        face: 'up' as const,
        marker: { x: s.x, y: s.y - 72 },
      })),
      { id: 'incense', label: 'กระถางธูปกลางลาน', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 98, y: 236, w: 28, h: 28 }, at: { x: 112, y: 276 }, face: 'up', marker: { x: 112, y: 234 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ทำบุญบำรุงศาล', icon: 'coin', rect: { x: 104, y: 196, w: 16, h: 26 }, at: { x: 112, y: 230 }, face: 'up', marker: { x: 112, y: 194 } },
      { id: 'flower_stall', label: 'ร้านของไหว้', hint: 'ของโปรดเทพแต่ละองค์', icon: 'garland', rect: { x: 20, y: 376, w: 50, h: 44 }, at: { x: 44, y: 430 }, face: 'up', marker: { x: 44, y: 374 } },
      { id: 'gate', label: 'ประตูลาน', hint: 'กลับบ้าน', icon: 'map', rect: { x: 92, y: 392, w: 40, h: 56 }, at: { x: 112, y: 438 }, face: 'down', marker: { x: 112, y: 368 }, near: 12 },
    ],
    spawn: { x: 112, y: 290, face: 'up' },
    pickupSpots: [
      { x: 12, y: 284 },
      { x: 196, y: 282 },
      { x: 112, y: 330 },
      { x: 12, y: 164 },
      { x: 196, y: 150 },
      { x: 112, y: 176 },
      { x: 30, y: 380 },
      { x: 196, y: 380 },
      { x: 150, y: 426 },
    ],
    lights: [
      ...SHRINES.map((s) => ({ x: s.x, y: s.y - 30, r: 22, color: '#ffcf7a' })),
      ...lamps.map(([x, y]) => ({ x, y: y - 29, r: 18 })),
      { x: URN.x, y: 250, r: 12, color: '#ff9a5a' },
      { x: GATE.x, y: 412, r: 22 },
    ],
    life(s) {
      return [
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 7),
        new Glints(s, [...SHRINES.map((sh) => ({ x: sh.x, y: sh.y - 66 })), ...(gate.hooks.glints ?? []).map((h) => ({ x: GATE.x + h.x, y: GATE.y + h.y }))], 0.8),
        new EaveBells(s, (gate.hooks.bells ?? []).map((h) => ({ x: GATE.x + h.x, y: GATE.y + h.y })), GATE.y),
        ...SHRINES.map(
          (sh) =>
            new EaveBells(
              s,
              [
                { x: sh.x - 31, y: sh.y - 48 },
                { x: sh.x + 31, y: sh.y - 48 },
              ],
              sh.y,
            ),
        ),
        new Flags(s, [
          { x: 30, y: 208, kind: 'color', sortY: 250 },
          { x: 194, y: 208, kind: 'color', sortY: 250 },
        ]),
        new Lanterns(s, [
          { x0: 20, y0: 206, x1: 204, y1: 206, n: 12, sag: 7, colors: ['#e8514a', '#ffd23f'] },
          { x0: 94, y0: 348, x1: 134, y1: 348, n: 4, sag: 4 },
        ]),
        new Butterflies(s, [
          { x: 70, y: 140, w: 84, h: 44 },
          { x: 70, y: 380, w: 84, h: 44 },
        ], 5),
        new CloudShadows(s, 2),
        new SunRays(s),
        new Traffic(s, [{ y: 472, dir: 1 }]),
        new TapZones(
          TREES.map((t) => ({
            rect: { x: t.x - 20, y: t.y - 48, w: 40, h: 36 },
            fn: () => {
              s.shake(t.id)
              s.drop(t.x, t.y - 26, 28, 6, t.v >= 2 ? '#ffc4d8' : '#fffaf0', '#ffe45e')
              if (Math.random() < 0.7) s.burstBirds(t.x, t.y - 32, 2)
              sfx.whoosh()
            },
          })),
        ),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.6) s.particles.add({ kind: 'petal', x: rand(0, W), y: rand(100, 140), vx: rand(-3, 3), vy: rand(6, 10), max: 3, color: '#ffc4d8', color2: '#fffaf0' })
    },
    wander: [
      { x: 24, y: 204, w: 176, h: 36 },
      { x: 100, y: 100, w: 24, h: 330 },
      { x: 24, y: 328, w: 176, h: 32 },
    ],
    pois: [
      { x: 58, y: 202, face: 'up' },
      { x: 166, y: 202, face: 'up' },
      { x: 58, y: 326, face: 'up' },
      { x: 166, y: 326, face: 'up' },
      { x: 112, y: 278, face: 'up' },
    ],
    birds: { x: 30, y: 276, w: 164, h: 20 },
    cats: [{ x: 196, y: 226, pose: 'sleep', color: '#fbf3e4' }],
    vendors: [{ x: 76, y: 424 }],
    dogs: ['khanom'],
    visitors: 4,
  }
}
