// วัดศรีบุญดี – the neighbourhood temple where every player starts.

import type { MapDef } from '../world'
import { drawChedi, drawNagaStairs, drawUbosot } from '../../art/buildings'
import * as props from '../../art/props'
import { drawBunting, lotusFlower, lotusPad } from '../../art/props'
import { grass, mat, pole, pond, road, sidewalk, slabPath, steppingStones, stoneTiles, treeLine } from './common'
import { P } from '../../art/palette'
import { rand } from '../../engine/rng'
import { outlineCanvas } from '../../engine/sprite'

const W = 224
const H = 576

const POND: [number, number, number, number][] = [
  [52, 262, 38, 22],
  [36, 252, 22, 14],
  [70, 274, 22, 13],
]

const KOI = [
  { r: 20, s: 0.35, p: 0, c: P.orange },
  { r: 14, s: -0.5, p: 2, c: '#fffaf0' },
  { r: 26, s: 0.25, p: 4, c: P.red },
  { r: 10, s: 0.6, p: 1, c: P.gold },
]

export function watMap(): MapDef {
  return {
    id: 'wat',
    w: W,
    h: H,
    skyH: 44,
    ground: P.grass,
    bake(g, night) {
      // Back tree line against the sky.
      treeLine(g, 36, W)
      grass(g, 0, 44, W, 408, 11)
      // Chedis behind the hall.
      drawChedi(g, 22, 122, { scale: 0.72 })
      drawChedi(g, 202, 122, { scale: 0.72 })
      // Paved plaza, path and side paths.
      stoneTiles(g, 26, 148, 172, 58)
      slabPath(g, 100, 206, 24, 246)
      steppingStones(g, [
        [128, 240],
        [136, 244],
        [146, 247],
        [96, 262],
        [88, 266],
        [128, 318],
        [138, 320],
        [150, 322],
        [96, 392],
        [86, 396],
        [76, 399],
      ])
      // Pond with lotus.
      pond(g, POND)
      for (const [x, y, r] of [
        [30, 248, 3],
        [44, 244, 2],
        [74, 280, 3],
        [62, 268, 2],
        [22, 258, 2],
        [80, 268, 2],
      ] as [number, number, number][]) {
        const pad = lotusPad(r)
        g.draw(pad.canvas, x - r, y - r)
      }
      const fl = lotusFlower()
      g.draw(fl.canvas, 30, 244)
      g.draw(fl.canvas, 73, 275)
      // The ordination hall.
      drawUbosot(g, 112, 150, { night })
      drawNagaStairs(g, 112, 150)
      // Bunting poles.
      pole(g, 70, 232, 22)
      pole(g, 153, 232, 22)
      pole(g, 70, 376, 22)
      pole(g, 153, 376, 22)
      // Front wall with the gate opening.
      const wallL = props.wallSegment(92)
      const wallR = props.wallSegment(92)
      g.draw(wallL.canvas, 0, 452)
      g.draw(wallR.canvas, 132, 452)
      // Street.
      sidewalk(g, 0, 472, W, 30)
      g.rect(0, 502, W, 2, P.stoneD)
      road(g, 0, 504, W, 56)
      g.rect(0, 560, W, 2, P.stoneD)
      sidewalk(g, 0, 562, W, 14)
      mat(g, 96, 480, 32, 10)
      // Alms tray on the mat.
      g.ellipse(112, 485, 5, 2, '#c9a04c')
      g.ellipse(112, 484, 3, 1.5, P.white)
    },
    props: [
      { sprite: props.incenseUrn(), x: 112, y: 190, shadow: [8, 2] },
      { sprite: props.donationBox(), x: 148, y: 178, shadow: [6, 2] },
      { sprite: props.lampPost(), x: 30, y: 204 },
      { sprite: props.lampPost(), x: 194, y: 204 },
      { sprite: props.bellRow(5), x: 172, y: 236 },
      { sprite: props.holyWaterPavilion(), x: 178, y: 304 },
      { sprite: props.frangipaniTree(0), x: 88, y: 330, shadow: [12, 3] },
      { sprite: props.frangipaniTree(1), x: 138, y: 334, shadow: [12, 3] },
      { sprite: props.sacredTree(), x: 44, y: 392 },
      { sprite: props.sala(), x: 170, y: 420 },
      { sprite: props.bush(1), x: 94, y: 226 },
      { sprite: props.bush(0), x: 130, y: 226 },
      { sprite: props.bush(2), x: 94, y: 300 },
      { sprite: props.bush(0), x: 130, y: 296 },
      { sprite: props.bush(1), x: 92, y: 430 },
      { sprite: props.bush(2), x: 132, y: 430 },
      { sprite: props.bush(0), x: 12, y: 300 },
      { sprite: props.bush(2), x: 214, y: 346 },
      { sprite: props.bananaTree(), x: 12, y: 440 },
      { sprite: props.frangipaniTree(1), x: 212, y: 446, shadow: [12, 3] },
      { sprite: props.guardianStatue(), x: 78, y: 436 },
      { sprite: props.guardianStatue(), x: 146, y: 436, flip: true },
      { sprite: props.templeGate(), x: 112, y: 472 },
      { sprite: props.lampPost(), x: 8, y: 500 },
      { sprite: props.lampPost(), x: 216, y: 500 },
      { sprite: props.flowerStall(), x: 42, y: 498 },
      { sprite: props.foodStall(), x: 184, y: 498 },
      { sprite: props.tukTuk(), x: 44, y: 552 },
      { sprite: signpost(), x: 212, y: 342 },
    ],
    obstacles: [
      { x: 0, y: 0, w: W, h: 44 },
      { x: 40, y: 44, w: 144, h: 106 },
      { x: 0, y: 44, w: 40, h: 82 },
      { x: 184, y: 44, w: 40, h: 82 },
      { x: 104, y: 183, w: 16, h: 8 },
      { x: 143, y: 174, w: 10, h: 5 },
      { x: 139, y: 228, w: 66, h: 8 },
      { x: 158, y: 292, w: 40, h: 12 },
      { x: 30, y: 378, w: 28, h: 14 },
      { x: 130, y: 400, w: 80, h: 20 },
      { x: 85, y: 326, w: 6, h: 4 },
      { x: 135, y: 330, w: 6, h: 4 },
      { x: 68, y: 428, w: 20, h: 8 },
      { x: 136, y: 428, w: 20, h: 8 },
      { x: 0, y: 452, w: 93, h: 20 },
      { x: 131, y: 452, w: 93, h: 20 },
      { x: 20, y: 486, w: 44, h: 12 },
      { x: 160, y: 486, w: 48, h: 12 },
      { x: 26, y: 540, w: 34, h: 12 },
      { x: 210, y: 336, w: 5, h: 6 },
      { x: 28, y: 199, w: 5, h: 5 },
      { x: 192, y: 199, w: 5, h: 5 },
      { x: 6, y: 496, w: 5, h: 4 },
      { x: 214, y: 496, w: 5, h: 4 },
      { x: 0, y: 570, w: W, h: 6 },
    ],
    ellipses: POND.map(([x, y, rx, ry]) => [x, y, rx + 2, ry + 2] as [number, number, number, number]),
    hotspots: [
      { id: 'alms', label: 'ลานตักบาตร', hint: 'ถวายภัตตาหารแด่พระสงฆ์', icon: 'bowl', rect: { x: 94, y: 474, w: 36, h: 20 }, at: { x: 112, y: 494 }, face: 'up', marker: { x: 134, y: 480 } },
      { id: 'food_stall', label: 'ร้านป้าแดง', hint: 'ซื้อของใส่บาตร', icon: 'shop', rect: { x: 160, y: 462, w: 48, h: 36 }, at: { x: 184, y: 506 }, face: 'up', marker: { x: 184, y: 462 } },
      { id: 'flower_stall', label: 'ร้านยายศรี', hint: 'ดอกไม้ ธูปเทียน ของถวาย', icon: 'garland', rect: { x: 18, y: 464, w: 46, h: 34 }, at: { x: 42, y: 506 }, face: 'up', marker: { x: 42, y: 462 } },
      { id: 'guardian', label: 'ท้าวเวสสุวรรณ', hint: 'ผู้พิทักษ์ประตูวัด', icon: 'deity', rect: { x: 66, y: 392, w: 24, h: 44 }, at: { x: 78, y: 446 }, face: 'up', marker: { x: 78, y: 390 } },
      { id: 'tree', label: 'ต้นตะเคียนทอง', hint: 'ขูดเลขมงคล', icon: 'powder', rect: { x: 10, y: 312, w: 70, h: 80 }, at: { x: 50, y: 402 }, face: 'up', marker: { x: 44, y: 348 } },
      { id: 'pond', label: 'บ่อปลาคาร์ฟ', hint: 'ให้อาหารปลา', icon: 'koi', rect: { x: 12, y: 236, w: 82, h: 54 }, at: { x: 98, y: 268 }, face: 'left', marker: { x: 52, y: 236 } },
      { id: 'bells', label: 'ระฆังแห่งบุญ', hint: 'ตีระฆังให้ดังกังวาน', icon: 'bell', rect: { x: 137, y: 192, w: 70, h: 44 }, at: { x: 172, y: 246 }, face: 'up', marker: { x: 172, y: 190 } },
      { id: 'holy_water', label: 'โอ่งน้ำมนต์', hint: 'ตักน้ำมนต์เสริมสิริมงคล', icon: 'vessel', rect: { x: 156, y: 254, w: 44, h: 50 }, at: { x: 178, y: 314 }, face: 'up', marker: { x: 178, y: 252 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ทำบุญค่าน้ำค่าไฟวัด', icon: 'coin', rect: { x: 140, y: 156, w: 16, h: 22 }, at: { x: 148, y: 188 }, face: 'up', marker: { x: 148, y: 156 } },
      { id: 'hall', label: 'อุโบสถ', hint: 'กราบพระ สวดมนต์ ขอพร ปิดทอง', icon: 'temple', rect: { x: 88, y: 100, w: 48, h: 64 }, at: { x: 112, y: 168 }, face: 'up', marker: { x: 112, y: 104 } },
      { id: 'incense', label: 'กระถางธูปหน้าโบสถ์', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 102, y: 170, w: 20, h: 22 }, at: { x: 112, y: 200 }, face: 'up', marker: { x: 124, y: 172 } },
      { id: 'sala', label: 'ศาลาการเปรียญ', hint: 'กลุ่มทำบุญ และกองบุญการกุศล', icon: 'group', rect: { x: 128, y: 360, w: 84, h: 60 }, at: { x: 170, y: 430 }, face: 'up', marker: { x: 170, y: 358 } },
      { id: 'sign', label: 'ป้ายบอกทาง', hint: 'เดินทางไปวัดอื่น ๆ', icon: 'map', rect: { x: 202, y: 318, w: 20, h: 26 }, at: { x: 206, y: 350 }, face: 'up', marker: { x: 212, y: 318 } },
    ],
    spawn: { x: 112, y: 496, face: 'up' },
    lights: [
      { x: 30, y: 184, r: 26 },
      { x: 194, y: 184, r: 26 },
      { x: 8, y: 478, r: 28 },
      { x: 216, y: 478, r: 28 },
      { x: 112, y: 132, r: 30 },
      { x: 76, y: 120, r: 12 },
      { x: 148, y: 120, r: 12 },
      { x: 42, y: 480, r: 14, color: '#ffb3cf' },
      { x: 184, y: 480, r: 14 },
      { x: 112, y: 176, r: 10, color: '#ff9a5a' },
    ],
    decor(g, t) {
      // Koi silhouettes and shimmer in the pond.
      for (const k of KOI) {
        const a = t * k.s + k.p
        const x = 52 + Math.cos(a) * k.r
        const y = 262 + Math.sin(a * 1.3) * k.r * 0.45
        const dx = -Math.sin(a) * k.s
        const dir = dx > 0 ? 1 : -1
        g.px(x, y, k.c)
        g.px(x - dir, y, k.c)
        g.px(x - dir * 2, y, k.c)
        g.px(x - dir * 3, y + (Math.sin(t * 8 + k.p) > 0 ? 1 : 0), k.c)
      }
      for (let i = 0; i < 6; i++) {
        const ph = Math.floor(t * 1.5 + i * 1.7)
        const x = 24 + ((ph * 37 + i * 13) % 56)
        const y = 250 + ((ph * 23 + i * 7) % 24)
        if ((ph + i) % 3 === 0) g.px(x, y, '#e6fbff')
      }
    },
    overlay(g, t) {
      drawBunting(g, 71, 211, 154, 211, t, 7)
      drawBunting(g, 71, 355, 154, 355, t + 1, 7)
    },
    ambient(s, dt) {
      if (Math.random() < dt * 7) {
        s.particles.add({ kind: 'smoke', x: 112 + rand(-5, 5), y: 172, vx: rand(-2, 2), vy: rand(-9, -5), max: rand(1.4, 2.4), color: '#efeaf4', size: Math.random() < 0.4 ? 2 : 1 })
      }
      if (Math.random() < dt * 0.5) {
        const [x, y] = Math.random() < 0.5 ? [88, 306] : [138, 310]
        s.particles.add({ kind: 'petal', x: x + rand(-12, 12), y: y + rand(-8, 4), vx: rand(-3, 3), vy: rand(6, 10), max: rand(2, 3), color: '#fffaf0', color2: '#ffe45e' })
      }
      if (Math.random() < dt * 0.4) {
        s.particles.add({ kind: 'leaf', x: 44 + rand(-30, 30), y: 330 + rand(-14, 10), vx: rand(-4, 4), vy: rand(6, 11), max: rand(2, 3.5), color: '#6cb85c', color2: '#3f8a4f' })
      }
    },
    wander: [
      { x: 30, y: 152, w: 160, h: 50 },
      { x: 100, y: 210, w: 24, h: 230 },
      { x: 10, y: 300, w: 80, h: 10 },
      { x: 60, y: 404, w: 100, h: 40 },
      { x: 130, y: 330, w: 70, h: 26 },
    ],
    pois: [
      { x: 106, y: 200, face: 'up' },
      { x: 118, y: 200, face: 'up' },
      { x: 104, y: 168, face: 'up' },
      { x: 120, y: 168, face: 'up' },
      { x: 164, y: 246, face: 'up' },
      { x: 186, y: 314, face: 'up' },
      { x: 98, y: 256, face: 'left' },
      { x: 60, y: 404, face: 'up' },
    ],
    monkPath: { y: 482, x0: -20, x1: W + 20 },
    birds: { x: 40, y: 156, w: 140, h: 44 },
    cats: [{ x: 188, y: 405, pose: 'sleep', color: '#f5a55a' }],
    novice: { x: 34, y: 156, w: 60, h: 40 },
    dogs: ['somo', 'thuadam', 'mali'],
    visitors: 3,
  }
}

let _sign: props.Prop | null = null
function signpost(): props.Prop {
  if (_sign) return _sign
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 26
  const ctx = c.getContext('2d')!
  const put = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col
    ctx.fillRect(x, y, w, h)
  }
  put(7, 8, 2, 18, '#9a6a45')
  put(1, 2, 14, 7, '#e0bb8a')
  put(1, 2, 14, 1, '#f3dcb2')
  put(1, 8, 14, 1, '#b8844a')
  put(3, 4, 7, 1, '#9a6a45')
  put(3, 6, 5, 1, '#9a6a45')
  put(11, 4, 2, 3, P.red)
  put(0, 12, 12, 5, '#e0bb8a')
  put(0, 16, 12, 1, '#b8844a')
  put(2, 14, 6, 1, '#9a6a45')
  const o = outlineCanvas(c, P.ink)
  _sign = { ...o, ax: 9, ay: 26 }
  return _sign
}
