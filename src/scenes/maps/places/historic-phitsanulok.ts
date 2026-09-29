// วัดใหญ่ พิษณุโลก (Wat Phra Si Rattana Mahathat) – the white central prang
// with its gilded top rises behind cloister galleries of golden images; the
// low three-tiered viharn of Phra Phuttha Chinnarat with its mother-of-pearl
// doors; outside the gate the Nan river promenade with raft houses, long-tail
// boats, catfish at the pier, the "flying morning glory" cook and the kluay
// tak stall.
//
// Maps: 'wat_yai_phitsanulok' and 'wat_yai_phitsanulok:viharn'.

import type { MapDef, PlacedProp, WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { road } from '../common'
import { longtailSprite } from '../../../art/cinematic'
import { drawPerson, Gags, gagFx, type Gag } from '../../gags'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Smoke, SunRays, TapZones, Traffic, type Life } from '../../life'
import * as PL from '../../../art/places/historic-phitsanulok'
import * as H from '../../../art/places/historic'
import * as I from '../../../art/places/historic-interior'
import { viharnSprite } from '../../../art/places/historic-halls'
import { DustMotes, foot, LightShafts, look, shakeTree } from './historic-common'

const ID = 'wat_yai_phitsanulok'
const VIHARN = 'wat_yai_phitsanulok:viharn'

const W = 300
const HH = 1000
const PRANG = { x: 150, y: 256 }
const VIH = { x: 150, y: 452 }
const GATE = { x: 150, y: 664 }
const WOK = { x: 196, y: 756 }
const CATCH = { x: 270, y: 760 }
const TREE1 = { x: 36, y: 590 }
const TREE2 = { x: 266, y: 600 }
const LAMPS: [number, number][] = [
  [118, 540],
  [182, 540],
  [60, 700],
  [240, 700],
]

function bakeGrounds(g: Surface, night: boolean) {
  G.treeLine(g, 100, W, G.LEAVES.far, 6)
  G.treeLine(g, 116, W, G.LEAVES.deep, 12)
  G.lawn(g, 0, 128, W, 530, 23)
  G.paving(g, 0, 250, W, 30, 8)
  G.paving(g, 40, 452, 220, 120, 8)
  G.kerb(g, 40, 452, 220, 120)
  G.mandala(g, 150, 500, 20)
  G.weather(g, 40, 452, 220, 120, 7, 0.6)
  G.paving(g, 136, 572, 28, 92, 8)
  H.shoesOnGround(g, 118, 460, 5, 3)
  H.shoesOnGround(g, 182, 462, 4, 4)
  G.groundShadow(g, TREE1.x, TREE1.y - 6, 40, 9, 0.7)
  G.groundShadow(g, TREE2.x, TREE2.y - 6, 40, 9, 0.7)
  G.leafLitter(g, 0, 560, 90, 90, 90, 5)
  G.leafLitter(g, 220, 570, 80, 80, 70, 6)
  G.flowerBed(g, 60, 610, 60, 8, ['#ff9fc0', '#fffaf0', '#e8514a'], 2)
  G.flowerBed(g, 180, 610, 60, 8, ['#f58f35', '#ffd23f'], 3)
  // Road and riverside promenade.
  G.paving(g, 0, 664, W, 16, 6, 'grey')
  road(g, 0, 680, W, 40)
  g.rect(0, 720, W, 2, '#8c8187')
  G.paving(g, 0, 722, W, 88, 6, 'grey')
  G.weather(g, 0, 722, W, 88, 8, 1)
  // River railing line and the pier.
  H.waterBand(g, 0, 812, W, 188, night, 4)
  g.rect(0, 808, W, 4, '#8c8187')
  g.hline(0, W - 1, 808, '#d8d0cb')
  g.rect(132, 808, 36, 30, '#9a6a45')
  for (let y = 810; y < 838; y += 4) g.hline(132, 167, y, '#c28e5c')
  g.rect(134, 838, 3, 8, '#6e4a35')
  g.rect(163, 838, 3, 8, '#6e4a35')
  // Reflections of the far bank lamps.
  for (let x = 10; x < W; x += 30) g.rect(x, 990, 8, 2, night ? '#ffe07a' : '#8fd0e8')
}

/** The flying morning-glory: the cook flings it high, the waiter catches it on a plate. */
class FlyingVeg implements Life {
  private t = -1
  private next = 4
  constructor(private s: WorldScene) {}
  launch() {
    if (this.t >= 0) return
    this.t = 0
    sfx.whoosh()
    this.s.say(['ผักบุ้งลอยฟ้า~ ไปแล้ว!', 'ฮึบ! รับให้ดีนะ!', 'ลอยฟ้าาา~'][Math.floor(Math.random() * 3)], WOK.x, WOK.y - 34)
  }
  update(dt: number) {
    if (this.t >= 0) {
      this.t += dt
      if (this.t >= 1.3) {
        this.t = -1
        this.next = rand(6, 10)
        this.s.particles.sparkles(CATCH.x - 6, CATCH.y - 20, 6, '#b8e070', 6)
        this.s.say(['รับได้! ปรบมือ~', 'หมับ! ไม่หกสักเส้น', 'เสิร์ฟร้อน ๆ ครับ'][Math.floor(Math.random() * 3)], CATCH.x, CATCH.y - 34)
        sfx.coin()
      }
    } else if ((this.next -= dt) <= 0) this.launch()
  }
  over(g: Surface) {
    if (this.t < 0) return
    const k = Math.min(1, this.t / 1.3)
    const x = WOK.x + (CATCH.x - 6 - WOK.x) * k
    const y = WOK.y - 16 - Math.sin(k * Math.PI) * 60 + (CATCH.y - WOK.y) * k
    for (let i = 0; i < 6; i++) {
      const a = this.t * 8 + i
      g.px(x + Math.cos(a) * 3, y + Math.sin(a * 1.3) * 2, i % 2 ? '#5ea653' : '#9ed86a')
    }
    g.px(x, y, '#e8514a')
  }
  tap(x: number, y: number) {
    if (Math.abs(x - WOK.x) < 16 && y > WOK.y - 34 && y < WOK.y + 4) {
      this.launch()
      return true
    }
    return false
  }
}

function plGags(): Gag[] {
  const cook = look({ gender: 'm', hair: 'hair_short', top: 'top_chef', bottom: 'bot_chef', head: 'head_chefhat' })
  const waiter = look({ gender: 'm', hair: 'hair_short', top: 'top_polo', bottom: 'bot_black' })
  const banana = look({ gender: 'f', hair: 'hair_bun', top: 'top_floral', bottom: 'bot_sarong', head: 'head_ngob' })
  const lady = look({ gender: 'f', hair: 'hair_long', top: 'top_white', bottom: 'bot_skirt', hand: 'hand_lotus' })
  const student = look({ gender: 'm', hair: 'hair_short', top: 'top_uni_m', bottom: 'bot_uni_slacks' })
  return [
    { x: WOK.x - 2, y: WOK.y - 6, z: -1, lines: ['ผักบุ้งไฟแดง ลอยฟ้า!', 'ต้องโยนให้สูงถึงจะอร่อย', 'แตะผมสิ แล้วจะโยนให้ดู'], draw: (g, p) => drawPerson(g, cook, p) },
    {
      x: CATCH.x, y: CATCH.y, lines: ['รับจานพร้อมครับ!', 'ฝึกมาสิบปี ไม่เคยพลาด', 'พิษณุโลกขึ้นชื่อเรื่องนี้เลยครับ'],
      draw: (g, p) => {
        drawPerson(g, waiter, p, 'front')
        g.ellipse(p.x - 6, p.y - 16, 4, 1.4, '#fffaf0')
        g.hline(p.x - 9, p.x - 3, p.y - 15, '#bdb2ae')
      },
    },
    { x: 96, y: 758, lines: ['กล้วยตากบางกระทุ่ม หวานฉ่ำจ้า', 'ตากแดดธรรมชาติ ไม่ใส่น้ำตาล', 'ชิมก่อนได้นะจ๊ะ'], draw: (g, p) => drawPerson(g, banana, p) },
    {
      x: 176, y: 520, lines: ['ขอให้ชนะอุปสรรคทุกอย่างค่ะ', 'หลวงพ่อพระพุทธชินราชงามที่สุดเลย', 'ดอกบัวนี้ถวายหลวงพ่อ'],
      draw: (g, p) => drawPerson(g, lady, p, 'back', [], 'wai'),
    },
    {
      x: 60, y: 540, walk: { x0: 50, x1: 130, speed: 7 }, lines: ['มาขอพรก่อนสอบ มน.!', 'แก้บนแล้วต้องมาไหว้อีก', 'ก๋วยเตี๋ยวห้อยขาอยู่ไหนนะ?'],
      draw: (g, p) => drawPerson(g, student, p, 'front'),
    },
  ]
}

export function phitsanulokMap(): MapDef {
  const prang = PL.whitePrangSprite()
  const gable = { field: '#c23a3f', fieldD: '#7e2436', sparkA: '#ff8a7a', sparkB: '#ffd23f', motif: 'narai' as const }
  const mk = (night: boolean) =>
    viharnSprite({
      key: 'chinnarat',
      w: 150,
      tiers: 3,
      roof: T.ROOF.red,
      roofBack: T.ROOF.red,
      gable,
      gableBack: { ...gable, motif: 'emblem' },
      wallH: 34,
      cols: 6,
      door: PL.pearlDoor,
      doorW: 14,
      doorH: 24,
      windows: 2,
      night,
      pitch: 0.7,
    })
  const vih = mk(false)
  const vihN = mk(true)
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const props: PlacedProp[] = [
    { sprite: prang, x: PRANG.x, y: PRANG.y, id: 'prang' },
    { sprite: PL.gallerySprite(110, 1), x: 0, y: 278 },
    { sprite: PL.gallerySprite(110, 2), x: 190, y: 278 },
    { sprite: T.chediSprite({ small: true }), x: 22, y: 250 },
    { sprite: T.chediSprite({ small: true, gold: true }), x: 278, y: 250 },
    { sprite: vih, night: vihN, x: VIH.x, y: VIH.y },
    { sprite: H.shoeRackSprite(true), x: 108, y: 466 },
    { sprite: H.shoeRackSprite(false), x: 192, y: 466 },
    { sprite: F.urnSprite(), x: 150, y: 516, shadow: [10, 2] },
    { sprite: PL.lotusTableSprite(), x: 106, y: 506 },
    { sprite: F.candleStandSprite(), x: 194, y: 506 },
    { sprite: T.bellRackSprite(7), x: 244, y: 540 },
    { sprite: F.donationSprite(), x: 62, y: 520, shadow: [6, 2] },
    { sprite: H.oldTree(11), x: TREE1.x, y: TREE1.y, id: 't1' },
    { sprite: H.oldTree(12, G.LEAVES.deep), x: TREE2.x, y: TREE2.y, id: 't2' },
    { sprite: H.broomSprite(), x: 58, y: 594 },
    { sprite: T.wallSprite(114), x: 0, y: GATE.y },
    { sprite: T.wallSprite(114), x: 186, y: GATE.y },
    { sprite: gate, x: GATE.x, y: GATE.y },
    { sprite: PL.kluayTakStallSprite(), x: 70, y: 764 },
    { sprite: PL.wokStandSprite(), x: WOK.x, y: WOK.y },
    { sprite: F.benchSprite(), x: 240, y: 790 },
    { sprite: PL.raftHouseSprite(0), x: 52, y: 890 },
    { sprite: PL.raftHouseSprite(1), x: 150, y: 944 },
    { sprite: PL.raftHouseSprite(2), x: 252, y: 900 },
    { sprite: G.coconutPalm(0), x: 10, y: 806 },
    { sprite: G.coconutPalm(1), x: 292, y: 806 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: ID,
    place: ID,
    area: 'wat',
    w: W,
    h: HH,
    skyH: 108,
    ground: '#86c95f',
    camBias: 0.6,
    bake: bakeGrounds,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 290 },
      { x: 60, y: 290, w: 180, h: 166 },
      { x: 0, y: 290, w: 60, h: 20 },
      { x: 240, y: 290, w: 60, h: 20 },
      foot(108, 466, 26, 8),
      foot(192, 466, 26, 8),
      foot(150, 516, 22, 8),
      foot(106, 506, 44, 6),
      foot(194, 506, 16, 6),
      { x: 210, y: 530, w: 70, h: 12 },
      foot(62, 520, 12, 6),
      foot(TREE1.x, TREE1.y, 16, 8),
      foot(TREE2.x, TREE2.y, 16, 8),
      { x: 60, y: 610, w: 60, h: 9 },
      { x: 180, y: 610, w: 60, h: 9 },
      { x: 0, y: GATE.y - 14, w: 130, h: 14 },
      { x: 170, y: GATE.y - 14, w: 130, h: 14 },
      { x: 0, y: 684, w: 136, h: 34 },
      { x: 164, y: 684, w: 136, h: 34 },
      foot(70, 764, 52, 14),
      foot(WOK.x, WOK.y, 24, 8),
      foot(240, 790, 20, 5),
      { x: 0, y: 806, w: 132, h: 194 },
      { x: 168, y: 806, w: 132, h: 194 },
      { x: 132, y: 840, w: 36, h: 160 },
      ...LAMPS.map(([x, y]) => foot(x, y, 6, 4)),
    ],
    hotspots: [
      { id: `door:${VIHARN}`, label: 'วิหารพระพุทธชินราช', hint: 'ผ่านบานประตูประดับมุก เข้าไปกราบหลวงพ่อ', icon: 'temple', rect: { x: 120, y: 330, w: 60, h: 126 }, at: { x: VIH.x, y: 462 }, face: 'up', marker: { x: VIH.x, y: 326 }, beacon: true, near: 12 },
      { id: 'incense', label: 'กระถางธูปหน้าวิหาร', hint: 'จุดธูปบูชาหลวงพ่อ', icon: 'incense', rect: { x: 136, y: 494, w: 28, h: 24 }, at: { x: 150, y: 528 }, face: 'up', marker: { x: 150, y: 490 } },
      { id: 'bells', label: 'ระฆังราวใหญ่', hint: 'ตีระฆังให้ดังกังวาน', icon: 'bell', rect: { x: 210, y: 500, w: 70, h: 42 }, at: { x: 244, y: 552 }, face: 'up', marker: { x: 244, y: 498 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ร่วมบำรุงวัดใหญ่', icon: 'coin', rect: { x: 54, y: 494, w: 16, h: 26 }, at: { x: 62, y: 530 }, face: 'up', marker: { x: 62, y: 492 } },
      { id: 'job:arrange_shoes', label: 'จัดรองเท้าหน้าวิหาร', hint: 'คนมากราบหลวงพ่อเยอะ รองเท้ากองเต็มเลย', icon: 'check', rect: { x: 94, y: 450, w: 28, h: 18 }, at: { x: 118, y: 474 }, face: 'left', marker: { x: 108, y: 448 } },
      { id: 'job:sweep_leaves', label: 'กวาดใบไม้ลานวัด', hint: 'ใบมะขามร่วงเต็มลาน', icon: 'broom', rect: { x: 10, y: 560, w: 60, h: 34 }, at: { x: 64, y: 602 }, face: 'left', marker: { x: 40, y: 556 } },
      { id: 'job:feed_catfish', label: 'ให้อาหารปลาที่ท่าน้ำ', hint: 'ปลาสวายแม่น้ำน่านรออยู่', icon: 'bread', rect: { x: 132, y: 808, w: 36, h: 40 }, at: { x: 150, y: 830 }, face: 'down', marker: { x: 150, y: 820 } },
      { id: 'river_fish', label: 'ท่าน้ำแม่น้ำน่าน', hint: 'โปรยขนมปังให้ปลาสวาย', icon: 'fishfood', rect: { x: 100, y: 812, w: 30, h: 30 }, at: { x: 124, y: 800 }, face: 'down', marker: { x: 116, y: 816 } },
      { id: `shop:${ID}_kluaytak`, label: 'กล้วยตากบางกระทุ่ม', hint: 'ของฝากขึ้นชื่อพิษณุโลก', icon: 'banana', rect: { x: 44, y: 724, w: 52, h: 40 }, at: { x: 70, y: 774 }, face: 'up', marker: { x: 70, y: 720 } },
      { id: 'gate', label: 'ประตูวัดใหญ่', hint: 'กลับบ้าน หรือไปวัดอื่น', icon: 'map', rect: { x: 128, y: 590, w: 44, h: 74 }, at: { x: GATE.x, y: 654 }, face: 'down', marker: { x: GATE.x, y: 586 }, near: 12 },
    ],
    spawn: { x: GATE.x, y: 654, face: 'up' },
    entries: { [VIHARN]: { x: VIH.x, y: 474, face: 'down' } },
    pickupSpots: [
      { x: 30, y: 470 },
      { x: 270, y: 470 },
      { x: 90, y: 560 },
      { x: 210, y: 580 },
      { x: 150, y: 630 },
      { x: 20, y: 740 },
      { x: 150, y: 780 },
      { x: 280, y: 740 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: VIH.x, y: 420, r: 30 },
      { x: 150, y: 506, r: 9, color: '#ff9a5a' },
      { x: PRANG.x, y: 140, r: 44, color: '#fff0c0' },
      { x: WOK.x, y: WOK.y - 8, r: 14, color: '#ff9a5a' },
      { x: 52, y: 872, r: 12, color: '#ffe07a' },
      { x: 150, y: 926, r: 12, color: '#ffe07a' },
      { x: 252, y: 882, r: 12, color: '#ffe07a' },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Glints(s, [...(prang.hooks.glints ?? []).map((h) => at(PRANG, h)), ...(vih.hooks.glints ?? []).map((h) => at(VIH, h)), ...(gate.hooks.glints ?? []).map((h) => at(GATE, h))], 1.1),
        new EaveBells(s, (vih.hooks.bells ?? []).map((h) => at(VIH, h)), VIH.y),
        ...(vih.hooks.candles ?? []).map((h) => new Flames(s, [at(VIH, h)], VIH.y)),
        Flames.candles(s, 194, 506),
        new Smoke(s, [{ x: 150, y: 498 }], 8),
        new Smoke(s, [{ x: WOK.x, y: WOK.y - 10 }], 3),
        new FlyingVeg(s),
        new Butterflies(s, [
          { x: 60, y: 590, w: 180, h: 30 },
          { x: 20, y: 470, w: 60, h: 40 },
        ], 5),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Gags(s, plGags()),
        new Traffic(s, [
          { y: 692, dir: 1 },
          { y: 710, dir: -1 },
        ]),
        {
          // Long-tail boats and ripples on the Nan river.
          ground(g: Surface, t: number) {
            const b = longtailSprite()
            const x1 = ((t * 14) % (W + 140)) - 70
            g.draw(b.canvas, Math.round(x1), 846 + Math.round(Math.sin(t * 2) * 0.6))
            const x2 = W + 70 - ((t * 9 + 160) % (W + 140))
            g.draw(b.canvas, Math.round(x2), 960, true)
            for (let i = 0; i < 7; i++) {
              const a = t * 0.8 + i
              const x = 150 + Math.cos(a) * 14
              const y = 856 + Math.sin(a * 1.3) * 5
              g.rect(x, y, 4, 2, '#6a7488')
            }
          },
        },
        new TapZones([
          shakeTree(s, 't1', TREE1.x, TREE1.y, 70, 76, ['#9ed86a', '#5eae55']),
          shakeTree(s, 't2', TREE2.x, TREE2.y, 70, 76, ['#9ed86a', '#5eae55']),
          {
            rect: { x: 110, y: 70, w: 80, h: 170 },
            fn: () => {
              s.particles.sparkles(PRANG.x, 90, 10, '#fff3a6', 14)
              s.say(['พระปรางค์ประธาน ยอดทองอร่าม', 'สร้างมาตั้งแต่สมัยสุโขทัย'][Math.floor(Math.random() * 2)], PRANG.x, 90)
              sfx.chime()
            },
          },
          {
            rect: { x: 0, y: 234, w: 300, h: 44 },
            fn: (x, y) => {
              s.particles.sparkles(x, y, 6, '#fff3a6', 6)
              sfx.chime()
            },
          },
          {
            rect: { x: 0, y: 820, w: 300, h: 180 },
            fn: (x, y) => {
              s.particles.add({ kind: 'ripple', x, y, max: 1.3, size: 12, color: '#e8fbff' })
              sfx.plop()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.8) s.particles.add({ kind: 'ripple', x: rand(10, W - 10), y: rand(830, 990), max: 1.2, size: 8, color: '#c8f4fa' })
    },
    wander: [
      { x: 50, y: 470, w: 200, h: 90 },
      { x: 136, y: 580, w: 28, h: 70 },
      { x: 10, y: 730, w: 280, h: 60 },
    ],
    pois: [
      { x: 140, y: 528, face: 'up' },
      { x: 160, y: 528, face: 'up' },
      { x: VIH.x, y: 474, face: 'up' },
      { x: 244, y: 552, face: 'up' },
      { x: 70, y: 774, face: 'up' },
      { x: 150, y: 800, face: 'down' },
    ],
    fireflies: [{ x: 0, y: 540, w: 300, h: 100 }],
    monkPath: [
      [VIH.x, 474],
      [150, 674],
      [150, 740],
      [-20, 740],
    ],
    birds: { x: 110, y: 540, w: 80, h: 30 },
    cats: [
      { x: 88, y: 470, pose: 'loaf', color: '#f5a55a' },
      { x: 250, y: 796, pose: 'sleep', color: '#fbf3e4' },
    ],
    novice: { x: 50, y: 540, w: 200, h: 60 },
    dogs: [],
    visitors: 6,
  }
}

// ---------------------------------------------------------------------------
// The viharn of Phra Phuttha Chinnarat.

const IW = 260
const IH = 430
const CH = { x: 130, y: 214 }

function bakeViharn(g: Surface) {
  g.rect(0, 0, IW, IH, '#1e1216')
  // Back wall: black lacquer and gold with a deep red field behind the image.
  I.lacquerWall(g, 18, 6, 224, 130, 5)
  g.rect(70, 12, 120, 124, '#521418')
  for (let i = 0; i < 60; i++) {
    const v = H.hsh(i, 2, 7)
    g.px(72 + (v % 116), 14 + ((v >> 4) % 118), i % 3 ? '#e9a53a' : '#ffd54f')
  }
  I.skirting(g, 18, 140, 224, '#3a0e12')
  // Side walls: red lacquer with narrow windows of light.
  I.teak(g, 0, 0, 18, IH, true, 'red', 3)
  I.teak(g, 242, 0, 18, IH, true, 'red', 4)
  for (const y of [180, 270, 350]) {
    g.rect(5, y, 8, 20, '#fff0c0')
    g.rect(247, y, 8, 20, '#fff0c0')
  }
  // Polished floor and the aisle.
  I.marbleFloor(g, 18, 140, 224, 270, '#e8dccc', '#cbbba6', 12)
  I.carpet(g, 112, 250, 36, 160, '#8a2432')
  I.mats(g, 30, 280, 5, 15)
  I.mats(g, 156, 280, 5, 15)
  I.mats(g, 30, 310, 5, 15)
  I.mats(g, 156, 310, 5, 15)
  // Front wall: the famous mother-of-pearl door leaves folded open.
  g.rect(0, 410, IW, 20, '#1e1216')
  I.lacquerWall(g, 18, 410, 86, 20, 9)
  I.lacquerWall(g, 156, 410, 86, 20, 10)
  PL.pearlDoor(g, 106, 412, 10, 18, false)
  PL.pearlDoor(g, 144, 412, 10, 18, false)
  g.rect(116, 410, 28, 20, '#fff0c0')
  g.rect(118, 412, 24, 18, '#cfe8a8')
}

export function phitsanulokViharnMap(): MapDef {
  const ch = PL.chinnaratSprite()
  const rackL = I.candleRackSprite(9)
  const rackR = I.candleRackSprite(9)
  const pillars: [number, number][] = [
    [66, 230],
    [194, 230],
    [66, 300],
    [194, 300],
    [66, 370],
    [194, 370],
  ]
  const props: PlacedProp[] = [
    { sprite: ch, x: CH.x, y: CH.y },
    { sprite: PL.smallBuddhaSprite(0.3), x: 38, y: 176 },
    { sprite: PL.smallBuddhaSprite(0.3), x: 222, y: 176 },
    { sprite: I.chatraSprite(70, 7), x: 56, y: 206 },
    { sprite: I.chatraSprite(70, 7), x: 204, y: 206 },
    ...pillars.map(([x, y]) => ({ sprite: I.pillarSprite(150, 'lacquer', 9), x, y })),
    { sprite: rackL, x: 92, y: 246 },
    { sprite: rackR, x: 168, y: 246 },
    { sprite: I.offeringTableSprite(36), x: 130, y: 248 },
    { sprite: I.lotusVaseSprite(), x: 110, y: 236 },
    { sprite: I.lotusVaseSprite(), x: 150, y: 236 },
    { sprite: F.candleStandSprite(), x: 36, y: 214 },
    { sprite: F.candleStandSprite(), x: 224, y: 214 },
    { sprite: I.moneyTreeSprite(), x: 226, y: 262 },
    { sprite: H.mopBucketSprite(), x: 40, y: 390 },
  ]
  return {
    id: VIHARN,
    place: ID,
    area: 'wat',
    indoor: true,
    indoorLight: 0.8,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#1e1216',
    camBias: 0.58,
    bake: bakeViharn,
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 222 },
      { x: 0, y: 0, w: 18, h: IH },
      { x: 242, y: 0, w: 18, h: IH },
      { x: 0, y: 412, w: 116, h: 18 },
      { x: 144, y: 412, w: 116, h: 18 },
      foot(92, 246, 44, 8),
      foot(168, 246, 44, 8),
      foot(130, 248, 36, 6),
      foot(110, 236, 10, 5),
      foot(150, 236, 10, 5),
      ...pillars.map(([x, y]) => foot(x, y, 14, 6)),
      foot(226, 262, 14, 6),
      foot(40, 390, 12, 5),
    ],
    hotspots: [
      { id: 'pray', label: 'พระพุทธชินราช', hint: 'กราบพระพุทธรูปที่งามที่สุดในแผ่นดิน', icon: 'pray', rect: { x: 70, y: 50, w: 120, h: 170 }, at: { x: 130, y: 266 }, face: 'up', marker: { x: CH.x, y: 70 }, beacon: true, near: 16 },
      { id: 'job:light_candles', label: 'จุดเทียนบูชาหลวงพ่อ', hint: 'ช่วยจุดเทียนบนราวทองเหลือง', icon: 'incense', rect: { x: 70, y: 226, w: 44, h: 20 }, at: { x: 92, y: 262 }, face: 'up', marker: { x: 92, y: 224 } },
      { id: 'job:polish_brass', label: 'ขัดเชิงเทียนทองเหลือง', hint: 'ขัดเชิงเทียนหน้าพระให้เงางาม', icon: 'sparkle', rect: { x: 24, y: 196, w: 24, h: 20 }, at: { x: 38, y: 232 }, face: 'up', marker: { x: 36, y: 194 } },
      { id: 'job:wipe_statues', label: 'เช็ดพระพุทธรูปองค์เล็ก', hint: 'ปัดฝุ่นพระข้างแท่นบูชา', icon: 'sparkle', rect: { x: 206, y: 144, w: 32, h: 36 }, at: { x: 214, y: 232 }, face: 'up', marker: { x: 222, y: 142 } },
      { id: 'job:mop_floor', label: 'ถูพื้นวิหาร', hint: 'พื้นหินขัดต้องเงาวับเสมอ', icon: 'broom', rect: { x: 26, y: 370, w: 40, h: 24 }, at: { x: 54, y: 396 }, face: 'left', marker: { x: 40, y: 368 } },
      { id: `door:${ID}`, label: 'ออกจากวิหาร', hint: 'กลับไปลานวัดใหญ่', icon: 'map', rect: { x: 116, y: 404, w: 28, h: 26 }, at: { x: 130, y: 424 }, face: 'down', marker: { x: 130, y: 406 }, near: 12 },
    ],
    spawn: { x: 130, y: 398, face: 'up' },
    entries: { [ID]: { x: 130, y: 398, face: 'up' } },
    pickupSpots: [],
    lights: [
      { x: CH.x, y: 120, r: 60, color: '#ffd890' },
      { x: 92, y: 236, r: 14, color: '#ffb35a' },
      { x: 168, y: 236, r: 14, color: '#ffb35a' },
      { x: 130, y: 418, r: 24, color: '#fff6d8' },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Flames(s, (rackL.hooks.flames ?? []).map((h) => at({ x: 92, y: 246 }, h)), 246),
        new Flames(s, (rackR.hooks.flames ?? []).map((h) => at({ x: 168, y: 246 }, h)), 246),
        Flames.candles(s, 36, 214),
        Flames.candles(s, 224, 214),
        new Glints(s, (ch.hooks.glints ?? []).map((h) => at(CH, h)), 1.4),
        new LightShafts(s, [
          { x: 116, y: 300, w: 28, h: 110, dx: 0, a: 0.06 },
          { x: 5, y: 180, w: 8, h: 60, dx: 40, a: 0.05 },
          { x: 247, y: 180, w: 8, h: 60, dx: -40, a: 0.05 },
        ]),
        new DustMotes(s, [{ x: 100, y: 60, w: 60, h: 150 }], 20),
        new Gags(s, viharnGags()),
        new TapZones([
          {
            rect: { x: 76, y: 40, w: 108, h: 120 },
            fn: () => {
              s.particles.sparkles(CH.x, 100, 14, '#fff3a6', 36)
              s.say(['ซุ้มเรือนแก้วลายเปลวเพลิง งามจับใจ', 'หล่อด้วยสำริดสมัยสุโขทัย', 'สาธุ~ ขอให้ชนะทุกอุปสรรค'][Math.floor(Math.random() * 3)], CH.x, 60)
              sfx.chime()
            },
          },
          {
            rect: { x: 100, y: 404, w: 60, h: 26 },
            fn: (x, y) => {
              s.say('บานประตูประดับมุกฝีมือช่างสมัยอยุธยา!', x, y - 10)
              s.particles.sparkles(x, y, 6, '#e0f4ff', 8)
            },
          },
        ]),
      ]
    },
    wander: [{ x: 30, y: 270, w: 200, h: 120 }],
    pois: [
      { x: 120, y: 268, face: 'up' },
      { x: 140, y: 268, face: 'up' },
      { x: 50, y: 290, face: 'up' },
      { x: 210, y: 290, face: 'up' },
    ],
    cats: [],
    dogs: [],
    visitors: 4,
  }
}

function viharnGags(): Gag[] {
  const granny = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' })
  const guide = look({ gender: 'm', hair: 'hair_short', top: 'top_polo', bottom: 'bot_khaki' })
  return [
    { x: 100, y: 292, lines: ['หลวงพ่อพุทธชินราช ช่วยลูกด้วย', 'ยายมาไหว้ทุกปีเลยจ้ะ', 'สาธุ สาธุ'], draw: (g, p) => drawPerson(g, granny, p, 'back', [], 'kneel'), react: (sc, x, y) => sc.particles.hearts(x, y - 20, 2) },
    {
      x: 210, y: 330, lines: ['ซุ้มเรือนแก้วปลายเป็นหัวมกรคายนาค', 'องค์พระหล่อราวปี พ.ศ. 1900', 'แสงเช้าส่ององค์พระ เรืองรองที่สุด'],
      draw: (g, p) => drawPerson(g, guide, p, 'front'),
      react: (sc, x, y) => gagFx.flash(sc, x, y),
    },
  ]
}
