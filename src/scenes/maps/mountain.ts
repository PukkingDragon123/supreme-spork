// วัดบนดอย – golden chedi above a sea of mist, reached by a naga staircase.

import type { MapDef } from '../world'
import { drawChedi, drawShrine, ROOFS } from '../../art/buildings'
import { drawDeity } from '../../art/deities'
import * as props from '../../art/props'
import { grass, stoneTiles, treeLine } from './common'
import { P } from '../../art/palette'
import { rand } from '../../engine/rng'

const W = 224
const H = 560

export function mountainMap(): MapDef {
  return {
    id: 'mountain',
    w: W,
    h: H,
    skyH: 70,
    ground: '#6fa85a',
    bake(g) {
      // Distant blue mountains.
      for (let x = -20; x < W + 20; x += 34) {
        g.poly(
          [
            [x - 30, 78],
            [x + 6, 40 + ((x * 7) % 14)],
            [x + 44, 78],
          ],
          '#8aa6d8',
        )
      }
      for (let x = -10; x < W + 20; x += 28) {
        g.poly(
          [
            [x - 24, 86],
            [x + 4, 58 + ((x * 5) % 12)],
            [x + 32, 86],
          ],
          '#6f8fc8',
        )
      }
      treeLine(g, 84, W, '#2f6f4b', '#43905a')
      grass(g, 0, 92, W, H - 92, 33)
      // Upper terrace with the golden chedi.
      stoneTiles(g, 24, 176, 176, 52)
      drawChedi(g, 112, 190, { gold: true, scale: 1.45 })
      // Naga staircase down the middle.
      for (let i = 0; i < 44; i++) {
        const y = 228 + i * 5
        g.rect(92, y, 40, 5, i % 2 ? '#e4ddd6' : '#f3ede6')
        g.hline(92, 131, y + 4, '#cfc6c0')
      }
      for (const side of [-1, 1]) {
        const x = 112 + side * 24
        for (let y = 228; y < 450; y += 2) {
          g.rect(x - 2, y, 5, 2, (y / 2) % 4 === 0 ? P.gold : '#43a86a')
        }
        // Naga heads at the bottom of the stairs.
        g.rect(x - 4, 440, 9, 14, '#43a86a')
        g.rect(x - 6, 432, 13, 9, P.gold)
        g.px(x - 4, 434, P.gold)
        g.px(x + 4, 434, P.gold)
        g.px(x, 430, P.gold)
        g.px(x - 2, 444, P.redL)
        g.px(x + 2, 444, P.redL)
      }
      stoneTiles(g, 40, 456, 144, 40)
      // Naga shrine on the left and bell pavilion on the right.
      drawShrine(g, 46, 320, { w: 44, h: 40, roof: ROOFS.gold, back: '#4a2a3a' })
      drawDeity(g, 'naga', 46, 312, 1, 0)
      // Viewpoint railing at the bottom left.
      g.rect(8, 512, 70, 3, '#9a6a45')
      for (let x = 10; x < 78; x += 8) g.rect(x, 504, 2, 10, '#9a6a45')
    },
    props: [
      { sprite: props.pineTree(), x: 12, y: 150 },
      { sprite: props.pineTree(), x: 212, y: 150 },
      { sprite: props.pineTree(), x: 18, y: 240 },
      { sprite: props.pineTree(), x: 206, y: 400 },
      { sprite: props.pineTree(), x: 190, y: 250 },
      { sprite: props.bellRow(1), x: 176, y: 334 },
      { sprite: props.bush(2), x: 76, y: 470 },
      { sprite: props.bush(1), x: 150, y: 470 },
      { sprite: props.lampPost(), x: 84, y: 454 },
      { sprite: props.lampPost(), x: 140, y: 454 },
    ],
    obstacles: [
      { x: 0, y: 0, w: W, h: 96 },
      { x: 70, y: 96, w: 84, h: 94 },
      { x: 20, y: 270, w: 52, h: 52 },
      { x: 156, y: 322, w: 40, h: 12 },
      { x: 84, y: 228, w: 6, h: 222 },
      { x: 134, y: 228, w: 6, h: 222 },
      { x: 0, y: 514, w: 80, h: 4 },
      { x: 10, y: 146, w: 5, h: 4 },
      { x: 210, y: 146, w: 5, h: 4 },
      { x: 0, y: 550, w: W, h: 10 },
    ],
    hotspots: [
      { id: 'chedi', label: 'พระธาตุทองคำ', hint: 'เวียนเทียน ๓ รอบ', icon: 'sparkle', rect: { x: 80, y: 100, w: 64, h: 92 }, at: { x: 112, y: 212 }, face: 'up', marker: { x: 112, y: 98 } },
      { id: 'big_bell', label: 'ระฆังใหญ่บนดอย', hint: 'เสียงก้องไปทั่วหุบเขา', icon: 'bell', rect: { x: 150, y: 290, w: 52, h: 46 }, at: { x: 176, y: 344 }, face: 'up', marker: { x: 176, y: 288 } },
      { id: 'naga', label: 'ศาลพญานาค', hint: 'ผู้พิทักษ์สายน้ำ ให้โชคลาภ', icon: 'deity', rect: { x: 22, y: 262, w: 48, h: 60 }, at: { x: 46, y: 332 }, face: 'up', marker: { x: 46, y: 262 } },
      { id: 'view', label: 'จุดชมทะเลหมอก', hint: 'นั่งสมาธิรับลมเย็น', icon: 'meditate', rect: { x: 8, y: 490, w: 72, h: 28 }, at: { x: 44, y: 524 }, face: 'up', marker: { x: 44, y: 492 } },
      { id: 'sign', label: 'ป้ายบอกทาง', hint: 'ลงดอยไปวัดอื่น', icon: 'map', rect: { x: 160, y: 500, w: 40, h: 30 }, at: { x: 176, y: 520 }, face: 'down', marker: { x: 180, y: 502 } },
    ],
    spawn: { x: 112, y: 520, face: 'up' },
    lights: [
      { x: 112, y: 140, r: 30, color: '#ffe7a0' },
      { x: 84, y: 434, r: 14 },
      { x: 140, y: 434, r: 14 },
      { x: 46, y: 296, r: 16, color: '#b4e486' },
    ],
    decor(g, t) {
      // Drifting mist bands.
      g.ctx.save()
      g.ctx.globalAlpha = 0.35
      for (let i = 0; i < 4; i++) {
        const y = 96 + i * 120 + Math.sin(t * 0.2 + i) * 6
        const x = ((t * (4 + i) + i * 50) % (W + 120)) - 60
        g.ellipse(x, y, 50, 6, '#f5f7ff')
        g.ellipse(x + 40, y + 4, 36, 5, '#f5f7ff')
      }
      g.ctx.restore()
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.6) s.particles.add({ kind: 'leaf', x: rand(0, W), y: rand(100, 200), vx: rand(-4, 4), vy: rand(6, 10), max: 3, color: '#43905a', color2: '#86c95f' })
    },
    wander: [
      { x: 30, y: 196, w: 160, h: 26 },
      { x: 96, y: 230, w: 32, h: 220 },
      { x: 44, y: 460, w: 136, h: 32 },
    ],
    pois: [
      { x: 104, y: 214, face: 'up' },
      { x: 120, y: 214, face: 'up' },
      { x: 46, y: 334, face: 'up' },
      { x: 176, y: 346, face: 'up' },
    ],
    birds: { x: 40, y: 460, w: 140, h: 30 },
    novice: { x: 30, y: 196, w: 60, h: 24 },
    dogs: ['cocoa'],
    visitors: 3,
  }
}
