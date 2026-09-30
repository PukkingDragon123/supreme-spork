// บ้านผีสิง (map fair_temple:ghost) – walk through the fair's haunted house:
// three dark rooms seen by the light of a candle around you. Six cute ghosts
// jump out as you pass (sheet ghost, smiling doll, a skeleton doing ramwong,
// a krahang flapping by, Mae Nak's long arm, a lost jiangshi): screen jolt,
// flash, a squeak, a joke. Find all six for the brave certificate
// (fair_brave_cert); walking out the far door counts as a fair ride.

import type { MapDef, PlacedProp, WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { haptic } from '../../../engine/audio'
import type { Life } from '../../life'
import { Flames } from '../../life'
import { track } from '../../../game/actions'
import { grantCollectible, ownedCount } from '../../../game/collectibles'
import { toast } from '../../../game/events'
import { mapId, mode } from '../../../ui/store'
import { fairSfx } from '../../../activities/fair/sound'
import { bakeGhostHouse, coffin, dollShelf, drawDollGhost, drawFog, drawJiangshi, drawKrahang, drawNakArm, drawSheetGhost, drawSkeleton, ghostCandle, gravestone, GH_H, GH_W, nakTable, wardrobe } from '../../../art/places/fair-ghost'
import { hs } from './hub-common'

const ID = 'fair_temple:ghost'
const W = GH_W
const H = GH_H
const EXIT = { x: W / 2, y: 62 }

type ScareKind = 'sheet' | 'doll' | 'skeleton' | 'krahang' | 'nak' | 'jiangshi'

interface Scare {
  kind: ScareKind
  /** Trigger zone: the rooms are narrow, so you can't sneak past. */
  zone: { x: number; y: number; w: number; h: number }
  /** Where the ghost appears. */
  gx: number
  gy: number
  line: string[]
  t: number
  found: boolean
}

export const GHOST_COUNT = 6

/** Is the player (px, py) inside a scare's trigger zone? */
export function inScare(px: number, py: number, s: { zone: { x: number; y: number; w: number; h: number } }) {
  const z = s.zone
  return px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h
}

const live = (s: WorldScene) => mode.value === 'world' && mapId.value === s.map.id

class Scares implements Life {
  private list: Scare[] = [
    { kind: 'sheet', zone: { x: 12, y: 360, w: 176, h: 32 }, gx: 30, gy: 336, line: ['บู้ววว… ขอโทษค่ะ ตกใจเองเลย', 'แฮ่! (ผีผ้าห่มขี้อาย)'], t: 0, found: false },
    { kind: 'doll', zone: { x: 110, y: 316, w: 78, h: 30 }, gx: 172, gy: 328, line: ['มาเล่นกับหนูไหมคะ~', 'หนูชื่อน้องบุญเรือนค่ะ (หัวหมุน)'], t: 0, found: false },
    { kind: 'krahang', zone: { x: 110, y: 250, w: 78, h: 40 }, gx: -20, gy: 214, line: ['ผีกระหังบินผ่านจ้า~ ขอทางหน่อย!', 'กระด้งใหม่ บินลื่นมาก!'], t: 0, found: false },
    { kind: 'skeleton', zone: { x: 12, y: 176, w: 98, h: 80 }, gx: 104, gy: 232, line: ['รำวงกับผมหน่อยครับ ตึ่ง ตึ่ง!', 'ผอมไปหน่อย แต่รำเก่งนะ'], t: 0, found: false },
    { kind: 'nak', zone: { x: 12, y: 104, w: 176, h: 40 }, gx: 133, gy: 66, line: ['พี่มากขา~ มะนาวตกค่ะ', 'แขนยาวแค่นี้เอง (สามเมตร)'], t: 0, found: false },
    { kind: 'jiangshi', zone: { x: 12, y: 50, w: 176, h: 40 }, gx: 30, gy: 96, line: ['ขอโทษครับ หลงมาจากงานศาลเจ้า', 'ทางออกอยู่ทางไหนครับ (กระโดด)'], t: 0, found: false },
  ]
  private flashT = 0
  private jolt = 0
  private out = false
  constructor(private s: WorldScene) {}
  get found() {
    return this.list.filter((x) => x.found).length
  }
  private trigger(sc: Scare) {
    sc.found = true
    sc.t = 0.001
    this.flashT = 0.35
    this.jolt = 0.35
    fairSfx.scare()
    haptic(40)
    const p = this.s.player
    const gy = sc.kind === 'krahang' ? sc.gy : sc.gy
    this.s.say(pick(sc.line), sc.kind === 'krahang' ? W / 2 : sc.gx, gy - 34, 2.4)
    setTimeout(() => this.s.say(pick(['กรี๊ดดดด!!', 'แม่จ๋าาา!', 'ตกใจหมดเลย!', 'ว้ายยย! (แต่น่ารักอะ)']), p.x, p.y - 32, 1.8), 450)
    const n = this.found
    setTimeout(() => {
      if (n >= GHOST_COUNT) {
        this.s.say('เจอผีครบทุกตัว! คนกล้าตัวจริง!', this.s.camX + this.s.vw / 2, this.s.camY + this.s.vh * 0.3, 2.8)
        if (live(this.s) && ownedCount('fair_brave_cert') === 0) {
          grantCollectible('fair_brave_cert')
        }
        this.s.particles.sparkles(p.x, p.y - 20, 16, '#c8ff8a', 14)
      } else this.s.say(`เจอผีแล้ว ${n}/${GHOST_COUNT}`, this.s.camX + this.s.vw / 2, this.s.camY + this.s.vh * 0.3, 1.6)
    }, 1200)
  }
  update(dt: number) {
    const p = this.s.player
    this.flashT = Math.max(0, this.flashT - dt)
    if (this.jolt > 0) {
      this.jolt -= dt
      this.s.camX += rand(-3, 3)
      this.s.camY += rand(-3, 3)
    }
    for (const sc of this.list) {
      if (sc.t > 0) sc.t += dt
      if (!sc.found && inScare(p.x, p.y, sc)) this.trigger(sc)
    }
    if (!this.out && Math.hypot(p.x - EXIT.x, p.y - EXIT.y) < 20) {
      this.out = true
      if (live(this.s)) {
        track('fair_game')
        if (this.found < GHOST_COUNT) toast(`ออกจากบ้านผีสิงแล้ว! เจอผี ${this.found}/${GHOST_COUNT} ตัว`, 'moon', 'info')
      }
      this.s.say(this.found >= GHOST_COUNT ? 'รอดแล้ววว! ได้ใบประกาศคนกล้าด้วย' : 'รอดออกมาได้! ยังมีผีที่ยังไม่เจอนะ~', p.x, p.y - 32, 2.4)
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const sc of this.list) {
      if (sc.t <= 0) {
        // Before it pops: a hint (glowing eyes, a rattle) for some of them.
        if (sc.kind === 'doll' && this.s.onScreen(sc.gx, sc.gy, 20)) add(sc.gy + 1, () => drawDollGhost(this.s.gfx, sc.gx, sc.gy, 0, t))
        if (sc.kind === 'skeleton' && this.s.onScreen(sc.gx, sc.gy, 20)) add(sc.gy, () => drawSkeleton(this.s.gfx, sc.gx, sc.gy, 0.1, 0))
        continue
      }
      const k = Math.min(1, sc.t * 4)
      const live2 = sc.t < 4
      if (!live2 && sc.kind !== 'doll' && sc.kind !== 'skeleton') continue
      add(sc.gy + 2, () => {
        const g = this.s.gfx
        switch (sc.kind) {
          case 'sheet':
            drawSheetGhost(g, sc.gx + Math.min(24, sc.t * 20), sc.gy, k, t)
            break
          case 'doll':
            drawDollGhost(g, sc.gx, sc.gy, live2 ? k : 0.2, t)
            break
          case 'skeleton':
            drawSkeleton(g, sc.gx, sc.gy, 1, live2 ? t : t * 0.3)
            break
          case 'krahang':
            drawKrahang(g, sc.gx + sc.t * 70, sc.gy - 10 + Math.sin(sc.t * 3) * 6, k, t)
            break
          case 'nak': {
            const len = Math.min(52, sc.t * 90) - Math.max(0, sc.t - 2.6) * 60
            if (len > 0) drawNakArm(g, sc.gx, sc.gy, len, t)
            break
          }
          case 'jiangshi': {
            const hop = (sc.t * 1.6) % 1
            drawJiangshi(g, sc.gx + Math.floor(sc.t * 1.6) * 12 + hop * 12, sc.gy, hop, t)
            break
          }
        }
      })
    }
    // The dropped lime waiting for Mae Nak.
    const nak = this.list.find((x) => x.kind === 'nak')
    if (nak && (nak.t <= 0 || nak.t < 1.8) && this.s.onScreen(133, 120, 10)) add(120, () => this.s.gfx.circle(133, 119, 2, '#8ad060'))
  }
  ground(g: Surface, t: number) {
    drawFog(g, 12, 180, W - 24, 110, t)
    drawFog(g, 12, 330, W - 24, 90, t + 10)
  }
  over(g: Surface) {
    // Candle-light: dark everywhere except a soft circle round you.
    const ctx = g.ctx
    const p = this.s.player
    const x = p.x - g.ox
    const y = p.y - 14 - g.oy
    const grad = ctx.createRadialGradient(x, y, 16, x, y, 84)
    grad.addColorStop(0, 'rgba(10,4,18,0)')
    grad.addColorStop(1, 'rgba(10,4,18,0.8)')
    ctx.save()
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, g.w, g.h)
    ctx.restore()
  }
  glow(g: Surface) {
    if (this.flashT > 0) {
      g.setCamera(0, 0)
      g.alpha(Math.min(0.55, this.flashT * 1.6))
      g.rect(0, 0, g.w, g.h, '#e8fff0')
      g.alpha(1)
      g.setCamera(this.s.camX, this.s.camY)
    }
  }
}

export function ghostMap(): MapDef {
  const graves = [
    { x: 36, y: 214, v: 0 },
    { x: 62, y: 262, v: 1 },
    { x: 126, y: 206, v: 2 },
    { x: 140, y: 240, v: 3 },
    { x: 30, y: 290, v: 4 },
  ]
  const candles: [number, number][] = [
    [70, 330],
    [130, 330],
    [96, 196],
    [176, 280],
    [30, 130],
    [170, 150],
  ]
  const props: PlacedProp[] = [
    { sprite: wardrobe(), x: 30, y: 356 },
    { sprite: dollShelf(), x: 172, y: 336 },
    { sprite: coffin(), x: 176, y: 424 },
    { sprite: coffin(), x: 170, y: 214 },
    ...graves.map((q) => ({ sprite: gravestone(q.v), x: q.x, y: q.y })),
    { sprite: nakTable(), x: 60, y: 110 },
    ...candles.map(([x, y]) => ({ sprite: ghostCandle(), x, y })),
  ]
  return {
    id: ID,
    place: 'fair_temple',
    area: 'wat',
    indoor: true,
    indoorLight: 0.95,
    w: W,
    h: H,
    skyH: 0,
    ground: '#140c1c',
    camBias: 0.55,
    bake: (g) => bakeGhostHouse(g),
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 50 },
      { x: 0, y: 0, w: 12, h: H },
      { x: W - 12, y: 0, w: 12, h: H },
      { x: 0, y: 430, w: W / 2 - 16, h: 10 },
      { x: W / 2 + 16, y: 430, w: W / 2 - 16, h: 10 },
      // Walls between rooms (doorways left open).
      { x: 0, y: 300, w: 144, h: 16 },
      { x: 188, y: 300, w: 12, h: 16 },
      { x: 0, y: 160, w: 12, h: 16 },
      { x: 56, y: 160, w: 144, h: 16 },
      // Furniture.
      { x: 17, y: 344, w: 26, h: 13 },
      { x: 155, y: 330, w: 34, h: 7 },
      { x: 167, y: 416, w: 18, h: 9 },
      { x: 161, y: 206, w: 18, h: 9 },
      ...graves.map((q) => ({ x: q.x - 7, y: q.y - 4, w: 14, h: 5 })),
      { x: 45, y: 104, w: 30, h: 7 },
      ...candles.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      hs('door:fair_temple', 'ทางออกบ้านผีสิง', 'ออกไปเที่ยวงานต่อ (หายใจทัน)', 'door', { x: W / 2 - 14, y: 18, w: 28, h: 30 }, { x: W / 2, y: 58 }, { marker: { x: W / 2, y: 14 }, near: 12 }),
    ],
    entries: { fair_temple: { x: W / 2, y: 414, face: 'up' } },
    spawn: { x: W / 2, y: 414, face: 'up' },
    pickupSpots: [],
    lights: [
      ...candles.map(([x, y]) => ({ x, y: y - 14, r: 16, color: '#ffb35a' })),
      { x: W / 2, y: 20, r: 26, color: '#8aff9a' },
      { x: 133, y: 58, r: 20, color: '#c8d8ff' },
      { x: 160, y: 188, r: 24, color: '#e8f0c8' },
    ],
    life(s) {
      return [new Scares(s), new Flames(s, candles.map(([x, y]) => ({ x: x - 1, y: y - 13 })))]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 1.5) s.particles.add({ kind: 'firefly', x: rand(20, W - 20), y: rand(60, H - 30), vx: rand(-4, 4), vy: rand(-3, 3), max: rand(2, 4), color: '#c8ff8a' })
    },
    wander: [
      { x: 60, y: 350, w: 80, h: 60 },
      { x: 80, y: 200, w: 60, h: 80 },
    ],
    pois: [
      { x: 100, y: 380, face: 'up' },
      { x: 100, y: 240, face: 'up' },
    ],
    cats: [],
    dogs: [],
    visitors: 2,
  }
}
