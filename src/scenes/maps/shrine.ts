// ลานเทพรวมใจ – a plaza of four deity shrines.

import type { MapDef } from '../world'
import { drawShrine, ROOFS } from '../../art/buildings'
import { drawDeity } from '../../art/deities'
import * as props from '../../art/props'
import { grass, stoneTiles, treeLine, pole } from './common'
import { drawBunting } from '../../art/props'
import { P } from '../../art/palette'
import { rand } from '../../engine/rng'

const W = 224
const H = 440

const SHRINES = [
  { id: 'ganesha', x: 58, y: 160, roof: ROOFS.red },
  { id: 'brahma', x: 166, y: 160, roof: ROOFS.gold },
  { id: 'guanyin', x: 58, y: 284, roof: ROOFS.blue },
  { id: 'lakshmi', x: 166, y: 284, roof: ROOFS.orange },
]

const LABELS: Record<string, [string, string]> = {
  ganesha: ['ศาลพระพิฆเนศ', 'เทพแห่งความสำเร็จ'],
  brahma: ['ศาลพระพรหม', 'ขอพรให้สมหวังทุกด้าน'],
  guanyin: ['ศาลเจ้าแม่กวนอิม', 'เมตตาต่อสรรพสัตว์'],
  lakshmi: ['ศาลพระแม่ลักษมี', 'ความรักและความมั่งคั่ง'],
}

export function shrineMap(): MapDef {
  return {
    id: 'shrine',
    w: W,
    h: H,
    skyH: 50,
    ground: P.grass,
    bake(g, night) {
      treeLine(g, 44, W)
      grass(g, 0, 50, W, H - 50, 7)
      stoneTiles(g, 20, 176, 184, 40)
      stoneTiles(g, 96, 60, 32, 360)
      stoneTiles(g, 20, 300, 184, 34)
      for (const s of SHRINES) {
        drawShrine(g, s.x, s.y, { roof: s.roof, w: 50, h: 44 })
        drawDeity(g, s.id, s.x, s.y - 8, 1, 0)
        if (night) {
          g.rect(s.x - 20, s.y - 48, 2, 2, '#ffe7a8')
          g.rect(s.x + 18, s.y - 48, 2, 2, '#ffe7a8')
        }
      }
      pole(g, 26, 230, 24)
      pole(g, 196, 230, 24)
      // Low wall at the entrance.
      const wl = props.wallSegment(84)
      g.draw(wl.canvas, 0, 402)
      g.draw(wl.canvas, 140, 402)
    },
    props: [
      { sprite: props.incenseUrn(), x: 112, y: 244, shadow: [8, 2] },
      { sprite: props.frangipaniTree(0), x: 16, y: 100, shadow: [12, 3] },
      { sprite: props.frangipaniTree(1), x: 210, y: 100, shadow: [12, 3] },
      { sprite: props.bush(1), x: 12, y: 380 },
      { sprite: props.bush(2), x: 212, y: 380 },
      { sprite: props.bush(0), x: 90, y: 200 },
      { sprite: props.bush(0), x: 134, y: 200 },
      { sprite: props.lampPost(), x: 90, y: 360 },
      { sprite: props.lampPost(), x: 134, y: 360 },
      { sprite: props.flowerStall(), x: 44, y: 392 },
      { sprite: props.templeGate(), x: 112, y: 422 },
    ],
    obstacles: [
      { x: 0, y: 0, w: W, h: 60 },
      ...SHRINES.map((s) => ({ x: s.x - 30, y: s.y - 60, w: 60, h: 60 })),
      { x: 104, y: 237, w: 16, h: 8 },
      { x: 0, y: 402, w: 83, h: 20 },
      { x: 141, y: 402, w: 83, h: 20 },
      { x: 22, y: 382, w: 44, h: 12 },
      { x: 14, y: 96, w: 6, h: 4 },
      { x: 208, y: 96, w: 6, h: 4 },
      { x: 0, y: 432, w: W, h: 8 },
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
        marker: { x: s.x, y: s.y - 70 },
      })),
      { id: 'incense', label: 'กระถางธูปกลางลาน', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 100, y: 222, w: 24, h: 24 }, at: { x: 112, y: 254 }, face: 'up', marker: { x: 124, y: 226 } },
      { id: 'flower_stall', label: 'ร้านของไหว้', hint: 'ของโปรดเทพแต่ละองค์', icon: 'garland', rect: { x: 20, y: 358, w: 48, h: 36 }, at: { x: 44, y: 398 }, face: 'up', marker: { x: 44, y: 358 } },
      { id: 'sign', label: 'ป้ายบอกทาง', hint: 'กลับวัดศรีบุญดี หรือไปวัดอื่น', icon: 'map', rect: { x: 96, y: 380, w: 32, h: 44 }, at: { x: 112, y: 396 }, face: 'down', marker: { x: 112, y: 374 } },
    ],
    spawn: { x: 112, y: 396, face: 'up' },
    lights: [
      ...SHRINES.map((s) => ({ x: s.x, y: s.y - 30, r: 22, color: '#ffcf7a' })),
      { x: 90, y: 340, r: 14 },
      { x: 134, y: 340, r: 14 },
      { x: 112, y: 232, r: 10, color: '#ff9a5a' },
    ],
    overlay(g, t) {
      drawBunting(g, 27, 208, 197, 208, t, 8)
    },
    ambient(s, dt) {
      if (Math.random() < dt * 6)
        s.particles.add({ kind: 'smoke', x: 112 + rand(-5, 5), y: 226, vx: rand(-2, 2), vy: rand(-9, -5), max: rand(1.4, 2.4), color: '#efeaf4' })
      if (Math.random() < dt * 0.6) s.particles.add({ kind: 'petal', x: rand(0, W), y: rand(60, 120), vx: rand(-3, 3), vy: rand(6, 10), max: 3, color: '#ffc4d8', color2: '#fffaf0' })
    },
    wander: [
      { x: 24, y: 180, w: 176, h: 32 },
      { x: 100, y: 70, w: 24, h: 320 },
      { x: 24, y: 304, w: 176, h: 26 },
    ],
    pois: [
      { x: 58, y: 172, face: 'up' },
      { x: 166, y: 172, face: 'up' },
      { x: 58, y: 296, face: 'up' },
      { x: 166, y: 296, face: 'up' },
      { x: 112, y: 256, face: 'up' },
    ],
    birds: { x: 30, y: 180, w: 160, h: 30 },
    dogs: ['khanom'],
    visitors: 4,
  }
}
