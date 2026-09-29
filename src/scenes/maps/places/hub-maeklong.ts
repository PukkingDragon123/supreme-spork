// ตลาดร่มหุบ แม่กลอง (Maeklong Railway Market) – hub market. The railway
// runs straight through the market: every ~80 seconds the crossing bell
// rings, vendors shout "หุบร่ม!", the awnings fold back in a wave and the
// ground trays of ปลาทู slide away as the train creeps through (arriving at
// the station, waiting, then leaving again). Stand on the rails and you get
// shooed aside. Everything reopens right behind the last car.

import type { MapDef, PlacedProp, WorldScene } from '../../world'
import type { Color, Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import { CloudShadows, SunRays, TapZones, type Life } from '../../life'
import { Gags, gagFx, type Gag } from '../../gags'
import { concrete, crates, basket, fruitGoods, jarGoods, menuBoard, noticeBoard, platuGoods, railTrack, tiles, hooksAt, type Goods } from '../../../art/places/hub-kit'
import { bufferStop, crossingSignal, drawAwning, drawTray, drawTrain, platuStack, sideFacade, stallTable, stationBuilding } from '../../../art/places/hub-maeklong'
import { fairSfx } from '../../../activities/fair/sound'
import { HubArrival, Hawkers, OrangeCats, giverGag, hs, hubChat, look, personGag } from './hub-common'

const ID = 'hub_maeklong'
const W = 300
const H = 1090
const CX = 150
const TRACK_TOP = 132
const STOP = 214
const MARKET_TOP = 250
const MARKET_BOT = 990
const SLOT = 46
const SLOTS = Array.from({ length: Math.floor((MARKET_BOT - MARKET_TOP) / SLOT) }, (_, i) => MARKET_TOP + 24 + i * SLOT)
const LT = 62
const RT = 238
// Kept clear of the bottom ~50px, which sits under the hotbar.
const GATE = { x: 60, y: 1030 }

/** Shared train status (read by the notice board). */
export const MK_TRAIN = { phase: 'idle' as 'idle' | 'warn' | 'in' | 'dwell' | 'out', eta: 20 }

const AWN: [Color, Color][] = [
  ['#e8514a', '#fffaf0'],
  ['#3d63b5', '#5a8de0'],
  ['#43905a', '#fffaf0'],
  ['#f58f35', '#ffd23f'],
  ['#5a8de0', '#fffaf0'],
  ['#e8709e', '#fffaf0'],
  ['#8a78c0', '#c8a0ff'],
]
type TrayKind = 'platu' | 'veg' | 'fruit' | 'shrimp' | 'chili'
const TRAYS: TrayKind[] = ['platu', 'veg', 'fruit', 'platu', 'shrimp', 'chili', 'platu', 'veg']

const vegGoods: Goods = fruitGoods(['#5ea653', '#86c95f', '#e8514a', '#f58f35'], 2)
const TABLE_GOODS: Goods[] = [platuGoods(), vegGoods, fruitGoods(['#e8514a', '#ffd23f', '#6a3a5a'], 2), jarGoods(['#f58f35', '#e8514a']), platuGoods(), fruitGoods(['#ff9a7a', '#f07a5a'], 1)]

function bake(g: Surface, night: boolean) {
  G.treeLine(g, 64, W, G.LEAVES.far, 61)
  G.treeLine(g, 78, W, G.LEAVES.deep, 63)
  concrete(g, 0, 92, W, H - 92, 11, night ? '#b0a8a0' : '#cdc4ba', 0)
  // Station platform area.
  tiles(g, 0, 150, W, 90, 8, '#e0d6ca', '#d4c8bc', 3)
  railTrack(g, CX, TRACK_TOP, H, 7)
  bufferStop(g, CX, TRACK_TOP + 6)
  // Wet market floor: puddles and fish scales near the trays.
  for (let k = 0; k < 40; k++) {
    const y = MARKET_TOP + ((k * 97) % (MARKET_BOT - MARKET_TOP))
    const x = k % 2 ? 118 + (k % 5) : 176 + (k % 4)
    g.alpha(0.25)
    g.ellipse(x, y, 5 + (k % 4), 2, '#6a8aa0')
    g.alpha(1)
  }
  sideFacade(g, 0, 30, MARKET_TOP - 10, MARKET_BOT, 1, 3, night)
  sideFacade(g, 270, 30, MARKET_TOP - 10, MARKET_BOT, -1, 5, night)
  // Bottom plaza.
  tiles(g, 0, MARKET_BOT, W, H - MARKET_BOT, 6, '#d8d0c8', '#c8c0b8', 13)
  railTrack(g, CX, MARKET_BOT, H, 8)
}

// ---------------------------------------------------------------------------
// The train gag.

class RailwayMarket implements Life {
  private phase: 'idle' | 'warn' | 'in' | 'dwell' | 'out' = 'idle'
  private timer = 18
  private lead = H + 150
  private dir: 1 | -1 = -1
  private fold: number[][]
  private shouted = new Set<number>()
  private t = 0
  constructor(private s: WorldScene) {
    this.fold = [SLOTS.map(() => 0), SLOTS.map(() => 0)]
    MK_TRAIN.phase = 'idle'
    MK_TRAIN.eta = this.timer
  }
  /** Train extents [top, bottom] (inclusive of both cars). */
  private extent(): [number, number] {
    const len = 62 * 2 + 3 + 8
    return this.dir > 0 ? [this.lead - len, this.lead] : [this.lead, this.lead + len]
  }
  private active() {
    return this.phase === 'in' || this.phase === 'dwell' || this.phase === 'out'
  }
  update(dt: number, t: number) {
    this.t = t
    this.timer -= dt
    const s = this.s
    switch (this.phase) {
      case 'idle':
        MK_TRAIN.eta = Math.max(0, this.timer + 6)
        if (this.timer <= 0) this.warn(-1)
        break
      case 'warn':
        MK_TRAIN.eta = Math.max(0, this.timer)
        if (this.timer <= 0) {
          this.phase = this.dir < 0 ? 'in' : 'out'
          if (this.dir < 0) this.lead = H + 20
          fairSfx.horn()
        }
        break
      case 'in':
        this.lead -= 30 * dt
        if (this.lead <= STOP) {
          this.lead = STOP
          this.phase = 'dwell'
          this.timer = 12
          if (s.onScreen(CX, STOP, 40)) s.say(pick(['ถึงสถานีแม่กลองแล้วครับ!', 'สถานีปลายทาง แม่กลอง~']), CX, STOP - 20, 2.4)
        }
        break
      case 'dwell':
        if (this.timer <= 0) this.warn(1)
        break
      case 'out':
        this.lead += 30 * dt
        if (this.lead - 140 > H + 20) {
          this.phase = 'idle'
          this.timer = rand(55, 75)
          this.lead = H + 150
        }
        break
    }
    MK_TRAIN.phase = this.phase
    // Awnings fold as the train comes near and reopen right behind it.
    const [top, bot] = this.extent()
    SLOTS.forEach((y, i) => {
      let want = 0
      if (this.active()) {
        const ahead = this.dir < 0 ? y > top - 90 && y < bot + 24 : y < bot + 90 && y > top - 24
        if (ahead) want = 1
      } else if (this.phase === 'warn') {
        // The siren: slots nearest the approaching end start pulling in.
        const fromBottom = this.dir < 0
        const reach = (1 - this.timer / 6) * 260
        if (fromBottom ? y > MARKET_BOT - reach : y < STOP + 90 + reach) want = 1
      }
      for (const side of [0, 1]) {
        const f = this.fold[side][i]
        const sp = want > f ? 2.2 : 1.2
        const nf = f + Math.sign(want - f) * Math.min(Math.abs(want - f), sp * dt * (side ? 1.1 : 1))
        if (nf >= 0.95 && f < 0.95 && !this.shouted.has(i) && s.onScreen(CX, y, 0) && Math.random() < 0.35) {
          this.shouted.add(i)
          s.say(pick(['หุบร่มม!', 'รถไฟมาแล้ว!', 'ถอยหน่อยจ้า!', 'เก็บของ ๆ!']), side ? RT : LT, y - 30, 1.8)
        }
        if (nf <= 0.05 && f > 0.05) this.shouted.delete(i)
        this.fold[side][i] = nf
      }
    })
    // Shoo the player off the rails.
    if (this.active()) {
      const p = s.player
      if (Math.abs(p.x - CX) < 16 && p.y > top - 6 && p.y < bot + 6) {
        p.x = p.x < CX ? CX - 18 : CX + 18
        p.path = []
        s.say(pick(['เกือบโดนรถไฟ!', 'หลบก่อน ๆ!', 'ยืนชิดแผงไว้นะ!']), p.x, p.y - 34, 1.6)
        s.particles.sparkles(p.x, p.y - 14, 6, '#fff3a6', 8)
        sfx.whoosh()
      }
    }
  }
  private warn(dir: 1 | -1) {
    this.dir = dir
    this.phase = 'warn'
    this.timer = 6
    this.shouted.clear()
    const s = this.s
    const sy = dir < 0 ? Math.min(MARKET_BOT - 40, s.camY + s.vh - 60) : Math.max(MARKET_TOP + 20, s.camY + 60)
    if (s.onScreen(CX, sy, 200)) {
      s.say(dir < 0 ? pick(['รถไฟกำลังมา! หุบร่ม~', 'ปู๊น ๆ รถไฟเข้าแล้ว!']) : pick(['รถไฟจะออกแล้ว!', 'ถอยห่างจากรางนะ!']), CX, sy - 40, 2.6)
      fairSfx.crossing(8)
    }
  }
  foldAt(side: 0 | 1, i: number) {
    return this.fold[side][i]
  }
  ground(g: Surface) {
    // Trays beside the rails slide away as the awnings fold.
    SLOTS.forEach((y, i) => {
      if (!this.s.onScreen(CX, y, 30)) return
      const fl = this.fold[0][i]
      const fr = this.fold[1][i]
      drawTray(g, 124 - fl * 7, y - 4, TRAYS[i % TRAYS.length], i)
      drawTray(g, 176 + fr * 7, y - 4, TRAYS[(i + 3) % TRAYS.length], i + 50)
      if (i % 2 === 0) drawTray(g, 112 - fl * 4, y + 8, TRAYS[(i + 5) % TRAYS.length], i + 90)
    })
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (this.phase === 'idle' || (this.phase === 'warn' && this.dir < 0)) return
    const [top, bot] = this.extent()
    if (!this.s.onScreen(CX, (top + bot) / 2, 140)) return
    add(bot, () => drawTrain(this.s.gfx, CX, this.lead, this.dir, t, this.s.isNight()))
  }
  over(g: Surface, t: number) {
    const w = Math.abs(this.s.wind())
    SLOTS.forEach((y, i) => {
      if (!this.s.onScreen(CX, y - 30, 30)) return
      drawAwning(g, 44, CX - 2, y, 9, AWN[i % AWN.length], this.fold[0][i], t, w)
      drawAwning(g, 256, CX + 2, y + 2, 9, AWN[(i + 3) % AWN.length], this.fold[1][i], t + 1, w)
    })
    // Crossing lights flash while the train is around.
    if (this.phase !== 'idle' && Math.floor(this.t * 3) % 2) {
      for (const p of [{ x: 120, y: 986 }, { x: 180, y: 986 }]) {
        g.px(p.x - 3, p.y - 23, '#ff5040')
        g.px(p.x + 3, p.y - 23, '#ff5040')
      }
    }
  }
  tap(x: number, y: number): boolean {
    if (!this.active() && this.phase !== 'warn') return false
    const [top, bot] = this.extent()
    if (Math.abs(x - CX) > 16 || y < top - 4 || y > bot + 4) return false
    this.s.say(pick(['ปู๊นนน!', 'ขอทางหน่อยครับ~', 'รถไฟเชื่องมาก วิ่งช้ากว่าคนเดิน']), CX, y - 20, 1.8)
    fairSfx.horn()
    return true
  }
}

function gags(): Gag[] {
  const piak = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman', head: 'head_vendorband' })
  const master = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_office', bottom: 'bot_slacks_grey', head: 'head_helmet' })
  const cam = look({ gender: 'f', hair: 'hair_ponytail', hairColor: 1, top: 'top_flannel', bottom: 'bot_cargo', head: 'head_sunhat' })
  const selfie = look({ gender: 'f', hair: 'hair_long', hairColor: 3, top: 'top_tank', bottom: 'bot_denim_shorts' })
  const selfie2 = look({ gender: 'm', hair: 'hair_curtain', hairColor: 0, top: 'top_hawaii', bottom: 'bot_joggers' })
  const auntie = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', bottom: 'bot_sarong', head: 'head_vendorband' })
  return [
    giverGag(piak, 98, 444, ['ปลาทูแม่กลอง หน้างอคอหัก!', 'ตัวไหนหน้าไม่งอ ลุงไม่ขาย', 'รถไฟจะมาแล้ว ช่วยลุงหน่อย!']),
    giverGag(master, 104, 208, ['ขบวนต่อไปอีกไม่นานครับ', 'สถานีแม่กลอง ปลายทางสายนี้', 'อย่ายืนบนรางนะครับ'], {
      over: (g, p) => {
        g.line(p.x + 5, p.y - 14, p.x + 8, p.y - 20, '#8a8480')
        g.rect(p.x + 7, p.y - 24, 4, 4, '#e8514a')
      },
    }),
    giverGag(cam, 204, 782, ['ผมรอช็อตนี้มาสามวันแล้ว!', 'รถไฟ + ร่มหุบ = ภาพเทพ', 'ขอยืมพื้นที่หน่อยนะครับ'], {
      over: (g, p) => {
        g.rect(p.x - 3, p.y - 16, 6, 4, '#3a3040')
        g.px(p.x, p.y - 15, '#9fd0ff')
      },
    }),
    personGag(selfie, 196, 380, ['ถ่ายคลิปรถไฟ ๆ!', 'ลงติ๊กต็อกแน่นอน', 'ร่มหุบเร็วมาก!'], { view: 'side', extras: ['selfie'], react: (s, x, y) => gagFx.flash(s, x, y) }),
    personGag(selfie2, 104, 636, ['รถไฟวิ่งผ่านจริงด้วย!', 'ใกล้มาก ๆ เลย', 'Wow, so close!'], { view: 'side', extras: ['phone'] }),
    personGag(auntie, 34, 580, ['ผักสด ๆ จ้า', 'รถไฟผ่านวันละแปดเที่ยว ชินแล้ว', 'ของวางชิดรางไม่เคยโดนสักที (โม้)'], { view: 'side', pose: 'sit' }),
    {
      x: 126,
      y: 520,
      lines: ['แมวส้มขโมยปลาทู!!', 'จับมันไว้!', 'ปลาทูตัวที่สามของวันแล้วนะ!'],
      draw: (g, p) => {
        // An orange cat with a mackerel, ready to bolt.
        const run = p.react > 0
        const x = p.x + (run ? Math.round((1.6 - p.react) * 20) : 0)
        g.ellipse(x, p.y - 3, 4, 2.5, '#f58f35')
        g.circle(x + 4, p.y - 6, 2.5, '#f58f35')
        g.px(x + 3, p.y - 9, '#f58f35')
        g.px(x + 6, p.y - 9, '#f58f35')
        g.px(x + 4, p.y - 6, '#3a2838')
        g.rect(x + 6, p.y - 5, 4, 1, '#9fb4c8')
        g.px(x + 10, p.y - 6, '#6e8aa4')
        g.line(x - 4, p.y - 3, x - 7, p.y - 7 + Math.round(Math.sin(p.t * 6)), '#f58f35')
        if (run) {
          g.px(x - 3, p.y, '#d0661f')
          g.px(x + 2, p.y, '#d0661f')
        }
      },
      react: (s) => {
        s.particles.add({ kind: 'dot', x: 126, y: 516, vx: 20, vy: -10, max: 0.6, color: '#9fb4c8' })
        sfx.scratch()
      },
    },
  ]
}

export function maeklongMap(): MapDef {
  const station = stationBuilding()
  const stationN = stationBuilding(true)
  const board = noticeBoard('mk', '#f0c040')
  const signal = crossingSignal()
  const tables: PlacedProp[] = []
  SLOTS.forEach((y, i) => {
    tables.push({ sprite: stallTable(`l${i % 6}`, TABLE_GOODS[i % 6], AWN[i % AWN.length][0]), x: LT, y: y })
    tables.push({ sprite: stallTable(`r${i % 6}`, TABLE_GOODS[(i + 2) % 6], AWN[(i + 3) % AWN.length][0]), x: RT, y: y + 2 })
  })
  const props: PlacedProp[] = [
    { sprite: station, night: stationN, x: 66, y: 204 },
    { sprite: board, x: 226, y: 226, shadow: [12, 3] },
    { sprite: G.coconutPalm(0), x: 250, y: 150 },
    { sprite: G.coconutPalm(1), x: 290, y: 176 },
    { sprite: platuStack(), x: 206, y: 196 },
    { sprite: crates(3, '#5a8de0', 3), x: 280, y: 232 },
    ...tables,
    { sprite: signal, x: 120, y: 988 },
    { sprite: signal, x: 180, y: 988, flip: true },
    { sprite: basket('#9fb4c8'), x: 88, y: 1010 },
    // Green signpost at the market exit.
    { sprite: menuBoard('mk_exit', '#3d8a6a'), x: GATE.x - 18, y: GATE.y - 4, shadow: [6, 2] },
    { sprite: crates(2, '#e8514a', 5), x: 240, y: 1020 },
    { sprite: G.shrub(0), x: 20, y: 1040 },
    { sprite: G.shrub(1), x: 280, y: 1042 },
  ]
  const shopHs = (side: 0 | 1, i: number, id: string, label: string, hint: string, icon: string) => {
    const y = SLOTS[i]
    const x = side ? RT : LT
    return hs(`shop:${id}`, label, hint, icon, { x: x - 17, y: y - 20, w: 34, h: 22 }, { x: side ? x - 30 : x + 30, y: y - 4 }, { face: side ? 'right' : 'left', marker: { x, y: y - 24 } })
  }
  return {
    id: ID,
    place: ID,
    area: 'river',
    w: W,
    h: H,
    skyH: 72,
    ground: '#cdc4ba',
    camBias: 0.55,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      { x: 4, y: 150, w: 124, h: 54 },
      { x: 212, y: 216, w: 28, h: 11 },
      { x: 196, y: 188, w: 20, h: 9 },
      { x: 272, y: 222, w: 16, h: 11 },
      { x: 246, y: 144, w: 8, h: 6 },
      { x: 286, y: 170, w: 8, h: 6 },
      { x: 0, y: MARKET_TOP - 10, w: 30, h: MARKET_BOT - MARKET_TOP + 10 },
      { x: 270, y: MARKET_TOP - 10, w: 30, h: MARKET_BOT - MARKET_TOP + 10 },
      ...SLOTS.flatMap((y) => [
        { x: LT - 17, y: y - 10, w: 34, h: 11 },
        { x: RT - 17, y: y - 8, w: 34, h: 11 },
      ]),
      { x: 116, y: 982, w: 8, h: 7 },
      { x: 176, y: 982, w: 8, h: 7 },
      { x: 81, y: 1004, w: 14, h: 7 },
      { x: GATE.x - 23, y: GATE.y - 8, w: 10, h: 5 },
      { x: 233, y: 1010, w: 14, h: 11 },
      { x: 14, y: 1034, w: 12, h: 7 },
      { x: 274, y: 1036, w: 12, h: 7 },
      { x: 0, y: H - 6, w: W, h: 6 },
    ],
    hotspots: [
      shopHs(0, 3, 'hub_maeklong_platu', 'แผงปลาทูลุงเปี๊ยก', 'ปลาทูแม่กลองหน้างอคอหัก', 'curry'),
      shopHs(1, 6, 'hub_maeklong_fruit', 'ผลไม้ริมรางป้าหน่อย', 'ลิ้นจี่ค่อม · น้ำตาลมะพร้าว', 'fruit'),
      shopHs(0, 10, 'hub_maeklong_kanom', 'ขนมไทยแม่กลอง', 'ขนมตาล · น้ำตาลมะพร้าวแท้', 'dessert'),
      hs('npc:mk_piak', 'ลุงเปี๊ยก', 'พ่อค้าปลาทูประจำราง', 'friends', { x: 90, y: 414, w: 16, h: 32 }, { x: 98, y: 456 }, { marker: { x: 98, y: 402 }, near: 14 }),
      hs('npc:mk_master', 'นายสถานี', 'นายสถานีแม่กลอง', 'friends', { x: 96, y: 178, w: 16, h: 32 }, { x: 108, y: 222 }, { marker: { x: 104, y: 166 }, near: 14 }),
      hs('npc:mk_cam', 'พี่กล้อง', 'ช่างภาพสายรถไฟ', 'friends', { x: 196, y: 752, w: 16, h: 32 }, { x: 204, y: 794 }, { marker: { x: 204, y: 740 }, near: 14 }),
      hs(`board:${ID}`, 'บอร์ดข่าวตลาดร่มหุบ', 'ตารางรถไฟ · กิจกรรมวันนี้ · ใครตามหาอะไร', 'scroll', { x: 210, y: 192, w: 32, h: 34 }, { x: 226, y: 238 }, { marker: { x: 226, y: 190 } }),
      hs('gate', 'ทางออกตลาดร่มหุบ', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: GATE.x - 22, y: GATE.y - 30, w: 44, h: 32 }, { x: GATE.x, y: GATE.y }, { face: 'down', marker: { x: GATE.x, y: GATE.y - 34 }, near: 12 }),
    ],
    spawn: { x: GATE.x + 10, y: 1012, face: 'up' },
    entries: {},
    pickupSpots: [
      { x: 180, y: 180 },
      { x: 100, y: 300 },
      { x: 200, y: 420 },
      { x: 100, y: 560 },
      { x: 200, y: 680 },
      { x: 100, y: 820 },
      { x: 200, y: 930 },
      { x: 150, y: 1018 },
    ],
    lights: [
      ...hooksAt(station, 'lamp', 66, 204).map((p) => ({ x: p.x, y: p.y, r: 20, color: '#ffe7a8' })),
      ...SLOTS.filter((_, i) => i % 2 === 0).flatMap((y) => [
        { x: 90, y: y - 28, r: 20, color: '#ffe7a8' },
        { x: 210, y: y - 26, r: 20, color: '#ffe7a8' },
      ]),
      { x: 226, y: 200, r: 16, color: '#ffe7a8' },
    ],
    remoteChat: hubChat(ID),
    life(s) {
      return [
        new HubArrival(s),
        new RailwayMarket(s),
        new Gags(s, gags()),
        new OrangeCats(s, [
          { x: 180, y: 204, pose: 'sleep' },
          { x: 214, y: 1024, pose: 'loaf' },
        ]),
        new Hawkers(
          s,
          SLOTS.flatMap((y, i) => [
            { x: LT, y: y - 22, lines: ['ปลาทูสด ๆ จ้า!', 'ผักบุ้งกำละสิบ', 'กุ้งแม่น้ำตัวโต ๆ', 'ชิมได้ก่อนจ้า'] },
            { x: RT, y: y - 20, lines: ['ลิ้นจี่หวาน ๆ', 'หอยแมลงภู่สด ๆ', 'พริกแกงทำเอง', i % 2 ? 'ของฝากแม่กลองจ้า' : 'ถูกกว่าในเมือง!'] },
          ]),
          [3, 7],
        ),
        new CloudShadows(s, 2),
        new SunRays(s),
        new TapZones([
          {
            rect: { x: 4, y: 140, w: 124, h: 50 },
            fn: () => {
              s.say(pick([`รถไฟขบวนต่อไปอีก ~${Math.ceil(MK_TRAIN.eta)} วินาที`, 'สถานีแม่กลอง ปลายทางสายแม่กลอง', 'ตั๋วไปมหาชัยสิบบาท!']), 66, 136, 2.4)
              sfx.bell(1)
            },
          },
        ]),
      ]
    },
    wander: [
      { x: 84, y: MARKET_TOP + 10, w: 34, h: MARKET_BOT - MARKET_TOP - 30 },
      { x: 182, y: MARKET_TOP + 10, w: 34, h: MARKET_BOT - MARKET_TOP - 30 },
      { x: 170, y: 160, w: 90, h: 60 },
      { x: 20, y: 992, w: 90, h: 40 },
      { x: 196, y: 1000, w: 80, h: 40 },
    ],
    pois: SLOTS.flatMap((y, i) =>
      i % 2 === 0
        ? [
            { x: LT + 30, y: y - 2, face: 'left' as const },
            { x: RT - 30, y: y, face: 'right' as const },
          ]
        : [],
    ),
    cats: [],
    vendors: SLOTS.filter((_, i) => i % 3 === 0).flatMap((y) => [
      { x: LT - 12, y: y - 12 },
      { x: RT + 12, y: y - 10 },
    ]),
    dogs: [],
    visitors: 12,
  }
}
