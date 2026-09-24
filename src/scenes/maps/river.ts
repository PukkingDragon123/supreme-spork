// วัดริมน้ำ – an old riverside temple: boat alms, catfish and krathong.

import type { MapDef } from '../world'
import { drawUbosot, drawNagaStairs, ROOFS } from '../../art/buildings'
import * as props from '../../art/props'
import { grass, stoneTiles, treeLine, slabPath } from './common'
import { P } from '../../art/palette'
import { rand } from '../../engine/rng'

const W = 224
const H = 500

export function riverMap(): MapDef {
  return {
    id: 'river',
    w: W,
    h: H,
    skyH: 40,
    ground: P.grass,
    bake(g, night) {
      treeLine(g, 36, W, P.leafD, P.leaf)
      // River.
      g.gradientV(0, 48, W, 132, ['#5fb3d0', '#4a95c0', '#3a7fb0'], 6)
      for (let y = 52; y < 180; y += 5) for (let x = (y * 7) % 13; x < W; x += 17) g.rect(x, y, 6, 1, '#7fcbe0')
      // Far bank reeds.
      for (let x = 0; x < W; x += 5) g.vline(x, 44, 50 + (x % 3), P.leafD)
      // Stone embankment and steps (ท่าน้ำ).
      g.rect(0, 180, W, 8, P.stone)
      g.rect(0, 180, W, 2, P.stoneL)
      for (let i = 0; i < 4; i++) {
        g.rect(20 + i * 2, 188 + i * 4, 56 - i * 4, 4, i % 2 ? P.stoneL : P.stone)
      }
      // Wooden pier.
      g.rect(92, 150, 40, 40, '#9a6a45')
      for (let x = 92; x < 132; x += 6) g.vline(x, 150, 189, '#7a5238')
      g.rect(92, 150, 40, 2, '#c28e5c')
      for (const x of [92, 129]) g.rect(x, 186, 3, 6, '#6e4a35')
      grass(g, 0, 188, W, H - 188, 21)
      slabPath(g, 100, 190, 24, 300)
      stoneTiles(g, 40, 380, 144, 44)
      drawUbosot(g, 112, 380, { wallW: 84, wallH: 32, gableH: 28, depth: 18, roof: ROOFS.blue, wall: '#f3e7d3', wallD: '#dccab0', night })
      drawNagaStairs(g, 112, 380, 4, 22, '#e0bb8a', '#ffd54f')
    },
    props: [
      { sprite: props.palmTree(), x: 12, y: 230 },
      { sprite: props.palmTree(), x: 210, y: 236, flip: true },
      { sprite: props.bananaTree(), x: 196, y: 300 },
      { sprite: props.bananaTree(), x: 26, y: 330 },
      { sprite: props.bush(1), x: 86, y: 250 },
      { sprite: props.bush(2), x: 140, y: 262 },
      { sprite: props.lampPost(), x: 88, y: 200 },
      { sprite: props.lampPost(), x: 136, y: 200 },
      { sprite: props.frangipaniTree(1), x: 170, y: 214, shadow: [12, 3] },
      { sprite: props.flowerStall(), x: 176, y: 446 },
      { sprite: props.incenseUrn(), x: 112, y: 420, shadow: [8, 2] },
    ],
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      { x: 0, y: 150, w: 92, h: 36 },
      { x: 132, y: 150, w: 92, h: 36 },
      { x: 60, y: 300, w: 104, h: 80 },
      { x: 104, y: 413, w: 16, h: 8 },
      { x: 154, y: 434, w: 44, h: 12 },
      { x: 10, y: 226, w: 5, h: 4 },
      { x: 208, y: 232, w: 5, h: 4 },
      { x: 0, y: 490, w: W, h: 10 },
    ],
    hotspots: [
      { id: 'boat_alms', label: 'ท่าน้ำตักบาตร', hint: 'พระพายเรือมาบิณฑบาต', icon: 'bowl', rect: { x: 92, y: 150, w: 40, h: 40 }, at: { x: 112, y: 176 }, face: 'up', marker: { x: 112, y: 150 } },
      { id: 'river_fish', label: 'ให้อาหารปลาสวาย', hint: 'ปลาตัวโตรออยู่ริมน้ำ', icon: 'bread', rect: { x: 140, y: 150, w: 70, h: 40 }, at: { x: 168, y: 196 }, face: 'up', marker: { x: 176, y: 160 } },
      { id: 'krathong', label: 'ลอยกระทง', hint: 'ลอยความทุกข์ไปกับสายน้ำ', icon: 'krathong', rect: { x: 16, y: 170, w: 64, h: 40 }, at: { x: 48, y: 206 }, face: 'up', marker: { x: 48, y: 170 } },
      { id: 'hall', label: 'อุโบสถเก่าริมน้ำ', hint: 'กราบพระ สวดมนต์ ขอพร', icon: 'temple', rect: { x: 84, y: 330, w: 56, h: 64 }, at: { x: 112, y: 394 }, face: 'up', marker: { x: 112, y: 324 } },
      { id: 'flower_stall', label: 'ร้านกระทงป้าบุญ', hint: 'กระทง ขนมปังให้ปลา', icon: 'krathong', rect: { x: 154, y: 414, w: 46, h: 34 }, at: { x: 176, y: 456 }, face: 'up', marker: { x: 176, y: 412 } },
      { id: 'sign', label: 'ป้ายบอกทาง', hint: 'เดินทางไปวัดอื่น', icon: 'map', rect: { x: 96, y: 460, w: 32, h: 30 }, at: { x: 112, y: 476 }, face: 'down', marker: { x: 112, y: 462 } },
    ],
    spawn: { x: 112, y: 470, face: 'up' },
    lights: [
      { x: 88, y: 180, r: 16 },
      { x: 136, y: 180, r: 16 },
      { x: 112, y: 362, r: 18 },
      { x: 176, y: 430, r: 14 },
    ],
    decor(g, t) {
      // Boats drifting and catfish swirling near the steps.
      const bx = ((t * 6) % (W + 60)) - 30
      g.poly(
        [
          [bx - 14, 96],
          [bx + 14, 96],
          [bx + 10, 102],
          [bx - 10, 102],
        ],
        '#8a5a32',
      )
      g.hline(bx - 14, bx + 14, 96, '#c28e5c')
      for (let i = 0; i < 6; i++) {
        const a = t * 0.8 + i
        const x = 176 + Math.cos(a) * 18
        const y = 168 + Math.sin(a * 1.3) * 6
        g.rect(x, y, 4, 2, '#8f97a8')
        g.px(x + (Math.cos(a) > 0 ? 4 : -1), y, '#5e6577')
      }
      for (let i = 0; i < 4; i++) {
        const ph = Math.floor(t * 1.2 + i * 2)
        g.px(20 + ((ph * 41) % 180), 60 + ((ph * 29) % 110), '#d4f5fa')
      }
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.8) s.particles.add({ kind: 'ripple', x: rand(10, W - 10), y: rand(60, 170), max: 1.2, size: 8, color: '#b3eef4' })
      if (Math.random() < dt * 5) s.particles.add({ kind: 'smoke', x: 112 + rand(-4, 4), y: 404, vx: rand(-2, 2), vy: rand(-9, -5), max: 2, color: '#efeaf4' })
    },
    wander: [
      { x: 100, y: 200, w: 24, h: 180 },
      { x: 20, y: 200, w: 180, h: 30 },
      { x: 44, y: 424, w: 136, h: 20 },
    ],
    pois: [
      { x: 104, y: 180, face: 'up' },
      { x: 48, y: 206, face: 'up' },
      { x: 112, y: 396, face: 'up' },
      { x: 168, y: 196, face: 'up' },
    ],
    birds: { x: 100, y: 230, w: 60, h: 40 },
    dogs: ['dang'],
    visitors: 3,
  }
}
