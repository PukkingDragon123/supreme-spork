// วัดฉลอง (วัดไชยธาราราม) ภูเก็ต – the three-storey Phra Mahathat chedi that
// holds a relic of the Buddha (walk inside), Luang Pho Chaem's hall with the
// three gilded monk statues, and the famous firecracker furnace that bangs
// all day. Hokkien noodles and oh-aew by the gate, a Phuket wooden bus outside.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { road, sidewalk } from '../common'
import { Butterflies, CloudShadows, EaveBells, Flames, Flags, Glints, RackBells, Smoke, SunRays, TapZones, Traffic } from '../../life'
import { Gags, drawPerson, gagFx, type Gag } from '../../gags'
import { arecaPalm, crotonBush, leafPile, potPlant, rainTree, sandGround, tableSet, wateringCanSprite, broomSprite } from '../../../art/places/south'
import { viharnSprite } from '../../../art/places/south_nst'
import { bothongBus, chaemHallInner, chalongChedi, firecrackerFurnace, hokkienStall, ohAewCart } from '../../../art/places/south_phuket'
import { at, hooks, look, personGag, shakeTree } from './south_common'
import { Firecrackers, Motes } from './south_life'

const W = 300
const H = 960
const CX = 150
const CHEDI = { x: CX, y: 346 }
const URN = { x: CX, y: 384 }
const HALL = { x: 86, y: 566 }
const FURNACE = { x: 240, y: 484 }
const RACK = { x: 232, y: 596 }
const RAIN = { x: 250, y: 712 }
const MEE = { x: 56, y: 770 }
const OHAEW = { x: 110, y: 790 }
const GATE = { x: CX, y: 924 }
const LAMPS: [number, number][] = [
  [120, 430],
  [180, 430],
  [120, 640],
  [180, 640],
  [120, 850],
  [180, 850],
]

function bake(g: Surface, night: boolean) {
  G.treeLine(g, 96, W, G.LEAVES.far, 31)
  G.treeLine(g, 110, W, G.LEAVES.deep, 37)
  G.lawn(g, 0, 124, W, 800, 17)
  // Chedi terrace.
  G.paving(g, 28, 220, 244, 186, 8, 'grey')
  G.kerb(g, 28, 220, 244, 186)
  G.weather(g, 28, 220, 244, 186, 3, 0.8)
  G.mandala(g, URN.x, 396, 24)
  G.groundShadow(g, CHEDI.x, 340, 90, 10, 0.7)
  // Paths.
  G.paving(g, 126, 406, 48, 520, 8)
  G.weather(g, 126, 406, 48, 520, 6, 0.8)
  G.paving(g, 20, 568, 260, 36, 8)
  G.paving(g, 190, 440, 90, 70, 8, 'grey')
  // Soot and red paper round the firecracker furnace.
  for (let i = 0; i < 360; i++) {
    const v = ((i + 3) * 2654435761) >>> 0
    const a = (v % 628) / 100
    const d = Math.sqrt(((v >>> 10) % 1000) / 1000)
    const x = Math.round(FURNACE.x + Math.cos(a) * d * 40)
    const y = Math.round(FURNACE.y + 6 + Math.sin(a) * d * 14)
    g.px(x, y, (v >>> 4) % 4 === 0 ? '#5a5058' : (v >>> 4) % 3 ? '#e8514a' : '#b8343f')
  }
  // Low safety fence round the furnace.
  for (let x = 206; x < 276; x += 6) g.rect(x, 504, 2, 6, '#fffaf0')
  g.hline(206, 275, 505, '#e8514a')
  // Stall ground (sand) and the market lane.
  sandGround(g, 12, 730, 110, 100, 3, '#eadbb8')
  // Flower beds along the path (job:water_plants) – freshly watered soil is darker.
  G.flowerBed(g, 108, 660, 14, 50, ['#ff9fc0', '#fffaf0', '#e8514a'], 6)
  G.flowerBed(g, 178, 660, 14, 50, ['#f58f35', '#ffd23f', '#ff9fc0'], 7)
  // Leaves under the rain tree (job:sweep_leaves).
  G.groundShadow(g, RAIN.x, RAIN.y - 6, 44, 10, 0.8)
  leafPile(g, 240, 726, 14, 5)
  leafPile(g, 268, 722, 8, 9)
  leafPile(g, 222, 740, 7, 13)
  G.puddle(g, 150, 700, 5, 2)
  // Street.
  sidewalk(g, 0, 924, W, 10)
  road(g, 0, 934, W, 26)
  if (night) for (let x = 20; x < W; x += 50) g.px(x, 928, '#ffe7a8')
}

function gags(boom: () => void): Gag[] {
  const kebaya = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_lace', bottom: 'bot_batik', hand: 'hand_fan' })
  const tourist = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_hawaii', bottom: 'bot_cargo', head: 'head_sunhat' })
  const tourist2 = look({ gender: 'f', hair: 'hair_ponytail', hairColor: 3, top: 'top_tank', bottom: 'bot_sarong' })
  const fireman = look({ gender: 'm', hair: 'hair_buzz', hairColor: 0, top: 'top_tee_white', bottom: 'bot_fisherman' })
  const cook = look({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_chef', head: 'head_vendorband' })
  const auntie = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_floral', bottom: 'bot_sin_mudmee' })
  return [
    {
      x: 214,
      y: 494,
      lines: ['จุดประทัดแก้บนครับ! ปัง ๆ ๆ', 'หลวงพ่อแช่มช่วยให้หายป่วยเลย', 'ถอยห่าง ๆ หน่อยนะครับ!'],
      draw: (g, p) => drawPerson(g, fireman, p, 'side', [], p.react > 0 ? 'offer' : undefined),
      react: () => boom(),
    },
    {
      x: 188,
      y: 530,
      lines: ['ดังมาก! (ปิดหู)', 'So loud! ปังไม่หยุดเลย', 'หูอื้อไปหมดแล้ว~'],
      draw: (g, p) => {
        drawPerson(g, tourist, p, 'front')
        // Hands pressed over the ears.
        g.rect(p.x - 5, p.y - 21, 2, 3, '#f0bd90')
        g.rect(p.x + 3, p.y - 21, 2, 3, '#f0bd90')
      },
    },
    personGag(kebaya, 150, 470, ['สวัสดีเจ้า~ ชุดบาบ๋ายะหยาภูเก็ต', 'มาไหว้หลวงพ่อแช่มทุกตรุษจีน', 'ลองโอ๋เอ๋วหรือยัง? อร่อยนะ'], { view: 'front' }),
    personGag(tourist2, 90, 604, ['Luang Pho Chaem~', 'ขอยืมผ้าถุงมานุ่งค่ะ', 'สวยมาก!'], { view: 'back', extras: ['selfie'], react: (s, x, y) => gagFx.flash(s, x, y) }),
    personGag(cook, 56, 758, ['หมี่ฮกเกี้ยนร้อน ๆ ครับ!', 'ใส่หมูแดงไข่ลวกไหม?', 'สูตรบาบ๋าแท้ ๆ'], { z: -1 }),
    personGag(auntie, 126, 784, ['โอ๋เอ๋วเย็น ๆ ชื่นใจจ้า', 'วุ้นกล้วยน้ำแดง ไสน้ำแข็ง', 'ร้อนนักกินโอ๋เอ๋วสิลูก'], { z: -1 }),
    {
      x: 230,
      y: 950,
      w: 64,
      h: 36,
      lines: ['รถโพถ้องครับ! ไปเมืองเก่าไหม?', 'นั่งสบาย ลมเย็น ๆ', 'ปี๊น ๆ~'],
      draw: (g, p) => {
        const b = bothongBus()
        g.draw(b.canvas, p.x - b.ax + (p.react > 0 ? Math.round(Math.sin(p.t * 40)) : 0), p.y - b.ay)
      },
      react: (s, x, y) => {
        sfx.tap()
        for (let i = 0; i < 4; i++) s.particles.add({ kind: 'smoke', x: x - 34, y: y - 6, vx: rand(-10, -4), vy: rand(-4, 0), max: 0.9, color: '#c9c0c8', size: 2 })
      },
    },
  ]
}

export function chalongMap(): MapDef {
  const chedi = chalongChedi()
  const chediN = chalongChedi(true)
  const hall = viharnSprite({ key: 'chaem', w: 150, roof: T.ROOF.orange, roof2: T.ROOF.red, field: '#3d63b5', fieldD: '#26306e', open: chaemHallInner })
  const hallN = viharnSprite({ key: 'chaem', w: 150, roof: T.ROOF.orange, roof2: T.ROOF.red, field: '#3d63b5', fieldD: '#26306e', open: chaemHallInner, night: true })
  const furnace = firecrackerFurnace()
  const rack = T.bellRackSprite(9)
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const mouth = hooks(furnace, FURNACE, 'mouth')[0]
  const chimney = hooks(furnace, FURNACE, 'chimney')[0]
  const props: PlacedProp[] = [
    { sprite: chedi, night: chediN, x: CHEDI.x, y: CHEDI.y, z: -14 },
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 124, y: 382 },
    { sprite: F.candleStandSprite(), x: 176, y: 382 },
    { sprite: F.donationSprite(), x: 196, y: 372, shadow: [6, 2] },
    { sprite: potPlant(1), x: 46, y: 236 },
    { sprite: potPlant(0), x: 254, y: 236 },
    { sprite: potPlant(2), x: 46, y: 396 },
    { sprite: potPlant(3), x: 254, y: 396 },
    { sprite: hall, night: hallN, x: HALL.x, y: HALL.y },
    { sprite: furnace, x: FURNACE.x, y: FURNACE.y },
    { sprite: rack, x: RACK.x, y: RACK.y },
    { sprite: rainTree(1), x: RAIN.x, y: RAIN.y, id: 'rain' },
    { sprite: broomSprite(), x: 276, y: 716 },
    { sprite: wateringCanSprite(), x: 102, y: 716 },
    { sprite: G.frangipani(2), x: 30, y: 660, id: 'fr1' },
    { sprite: G.frangipani(0), x: 270, y: 380, id: 'fr2' },
    { sprite: G.coconutPalm(0), x: 16, y: 420 },
    { sprite: G.coconutPalm(1), x: 286, y: 640 },
    { sprite: arecaPalm(1), x: 20, y: 250 },
    { sprite: arecaPalm(0), x: 282, y: 260 },
    { sprite: crotonBush(0), x: 196, y: 690 },
    { sprite: crotonBush(1), x: 30, y: 706 },
    { sprite: hokkienStall(), x: MEE.x, y: MEE.y },
    { sprite: ohAewCart(), x: OHAEW.x, y: OHAEW.y },
    { sprite: tableSet('#e8514a'), x: 34, y: 830 },
    { sprite: rainTree(0), x: 40, y: 200, id: 'rt1' },
    { sprite: rainTree(1), x: 262, y: 206, id: 'rt2' },
    { sprite: G.bodhiTree2(), x: 232, y: 872, id: 'bodhi' },
    { sprite: F.benchSprite(), x: 216, y: 820 },
    { sprite: F.spiritHouseSprite(), x: 276, y: 812 },
    { sprite: potPlant(2), x: 118, y: 910 },
    { sprite: potPlant(3), x: 182, y: 910 },
    { sprite: tableSet('#5a8de0'), x: 86, y: 842 },
    { sprite: T.wallSprite(112), x: 0, y: 924 },
    { sprite: T.wallSprite(112), x: 188, y: 924 },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: 'wat_chalong',
    place: 'wat_chalong',
    area: 'wat',
    w: W,
    h: H,
    skyH: 112,
    ground: '#86c95f',
    camBias: 0.62,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 124 },
      // The chedi, with its front stairs left open.
      { x: 70, y: 200, w: 160, h: 132 },
      { x: 70, y: 332, w: 64, h: 14 },
      { x: 166, y: 332, w: 64, h: 14 },
      { x: URN.x - 10, y: URN.y - 8, w: 20, h: 9 },
      { x: 117, y: 376, w: 14, h: 7 },
      { x: 169, y: 376, w: 14, h: 7 },
      { x: 190, y: 366, w: 12, h: 7 },
      { x: 40, y: 230, w: 12, h: 7 },
      { x: 248, y: 230, w: 12, h: 7 },
      { x: 40, y: 390, w: 12, h: 7 },
      { x: 248, y: 390, w: 12, h: 7 },
      // Luang Pho Chaem's hall (open front, stairs at the middle).
      { x: 12, y: 470, w: 148, h: 82 },
      { x: 12, y: 552, w: 58, h: 12 },
      { x: 102, y: 552, w: 58, h: 12 },
      { x: 218, y: 460, w: 44, h: 28 },
      { x: 204, y: 504, w: 72, h: 6 },
      { x: RACK.x - 42, y: RACK.y - 10, w: 84, h: 11 },
      { x: RAIN.x - 5, y: RAIN.y - 6, w: 10, h: 7 },
      { x: 108, y: 660, w: 14, h: 50 },
      { x: 178, y: 660, w: 14, h: 50 },
      { x: 27, y: 656, w: 6, h: 5 },
      { x: 267, y: 376, w: 6, h: 5 },
      { x: 12, y: 416, w: 8, h: 6 },
      { x: 282, y: 636, w: 8, h: 6 },
      { x: 17, y: 246, w: 6, h: 5 },
      { x: 279, y: 256, w: 6, h: 5 },
      { x: 188, y: 684, w: 16, h: 6 },
      { x: 22, y: 700, w: 16, h: 6 },
      { x: MEE.x - 25, y: MEE.y - 14, w: 50, h: 15 },
      { x: OHAEW.x - 18, y: OHAEW.y - 12, w: 36, h: 13 },
      { x: 22, y: 820, w: 24, h: 10 },
      { x: 35, y: 194, w: 10, h: 7 },
      { x: 257, y: 200, w: 10, h: 7 },
      { x: 206, y: 856, w: 52, h: 18 },
      { x: 206, y: 816, w: 20, h: 5 },
      { x: 270, y: 804, w: 12, h: 9 },
      { x: 112, y: 904, w: 12, h: 7 },
      { x: 176, y: 904, w: 12, h: 7 },
      { x: 74, y: 832, w: 24, h: 10 },
      { x: 0, y: 910, w: 114, h: 16 },
      { x: 186, y: 910, w: 114, h: 16 },
      { x: 0, y: 932, w: W, h: 28 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      { id: 'door:wat_chalong:chedi', label: 'พระมหาธาตุเจดีย์', hint: 'ขึ้นไปกราบพระบรมสารีริกธาตุชั้นบนสุด', icon: 'door', rect: { x: 136, y: 300, w: 28, h: 44 }, at: { x: CX, y: 340 }, face: 'up', marker: { x: CX, y: 296 }, near: 8 },
      { id: 'incense', label: 'กระถางธูปหน้าพระธาตุ', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 136, y: 356, w: 28, h: 30 }, at: { x: CX, y: 400 }, face: 'up', marker: { x: CX, y: 354 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ร่วมทำบุญวัดฉลอง', icon: 'coin', rect: { x: 188, y: 346, w: 16, h: 28 }, at: { x: 196, y: 382 }, face: 'up', marker: { x: 196, y: 344 } },
      { id: 'hall', label: 'หลวงพ่อแช่ม', hint: 'ปิดทองหลวงพ่อแช่ม · เสี่ยงเซียมซีวัดฉลอง', icon: 'goldleaf', rect: { x: 40, y: 470, w: 92, h: 80 }, at: { x: HALL.x, y: 576 }, face: 'up', marker: { x: HALL.x, y: 468 }, beacon: true, near: 14 },
      { id: 'bells', label: 'ระฆังเก้าใบ', hint: 'ตีระฆังให้ดังกังวาน', icon: 'bell', rect: { x: 190, y: 552, w: 84, h: 46 }, at: { x: RACK.x, y: 608 }, face: 'up', marker: { x: RACK.x, y: 550 } },
      { id: 'shop:wat_chalong_mee', label: 'ร้านหมี่ฮกเกี้ยนลุงเอี่ยม', hint: 'หมี่ฮกเกี้ยน หมี่หุ้นต้มสูตรบาบ๋า', icon: 'curry', rect: { x: 30, y: 728, w: 52, h: 42 }, at: { x: MEE.x, y: 782 }, face: 'up', marker: { x: MEE.x, y: 726 } },
      { id: 'shop:wat_chalong_ohaew', label: 'โอ๋เอ๋วป้าหลิน', hint: 'โอ๋เอ๋ว น้ำแข็งไส ขนมบาบ๋า', icon: 'dessert', rect: { x: 90, y: 744, w: 40, h: 46 }, at: { x: OHAEW.x, y: 802 }, face: 'up', marker: { x: OHAEW.x, y: 742 } },
      { id: 'job:sweep_leaves', label: 'กวาดใบจามจุรี', hint: 'อาสากวาดใบไม้ลานวัด', icon: 'broom', rect: { x: 214, y: 716, w: 64, h: 28 }, at: { x: 240, y: 748 }, face: 'up', marker: { x: 244, y: 714 } },
      { id: 'job:water_plants', label: 'รดน้ำแปลงดอกไม้', hint: 'อาสารดน้ำดอกไม้ริมทางเดิน', icon: 'water', rect: { x: 106, y: 656, w: 18, h: 56 }, at: { x: 132, y: 686 }, face: 'left', marker: { x: 115, y: 654 } },
      { id: 'gate', label: 'ประตูวัดฉลอง', hint: 'กลับบ้าน หรือไปวัดอื่น', icon: 'map', rect: { x: 128, y: 862, w: 44, h: 62 }, at: { x: CX, y: 912 }, face: 'down', marker: { x: CX, y: 856 }, near: 12 },
    ],
    spawn: { x: CX, y: 890, face: 'up' },
    entries: { 'wat_chalong:chedi': { x: CX, y: 352, face: 'down' } },
    pickupSpots: [
      { x: 60, y: 300 },
      { x: 240, y: 300 },
      { x: 40, y: 380 },
      { x: 200, y: 420 },
      { x: 100, y: 440 },
      { x: 180, y: 620 },
      { x: 30, y: 620 },
      { x: 200, y: 780 },
      { x: 160, y: 760 },
      { x: 270, y: 840 },
      { x: 40, y: 880 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: CHEDI.x, y: 250, r: 50, color: '#ffe7a0' },
      { x: CHEDI.x, y: 320, r: 20 },
      { x: HALL.x, y: 530, r: 36, color: '#ffcf7a' },
      { x: mouth.x, y: mouth.y, r: 16, color: '#ff9a5a' },
      { x: URN.x, y: 370, r: 10, color: '#ff9a5a' },
      { x: MEE.x, y: 752, r: 16, color: '#ffe7a8' },
      { x: OHAEW.x, y: 768, r: 14, color: '#ffe7a8' },
      { x: GATE.x, y: 888, r: 24 },
    ],
    life(s) {
      const fc = new Firecrackers(s, [{ x: mouth.x, y: mouth.y - 2, every: [4, 9] }], { x: FURNACE.x - 23, y: FURNACE.y - 52, w: 46, h: 52 })
      return [
        fc,
        new Smoke(s, [chimney], 5),
        new Glints(s, [...hooks(chedi, CHEDI, 'glints'), ...hooks(hall, HALL, 'glints'), ...hooks(gate, GATE, 'glints')], 1.4),
        new EaveBells(s, hooks(hall, HALL, 'bells'), HALL.y),
        new EaveBells(s, hooks(gate, GATE, 'bells'), GATE.y),
        new RackBells(s, (rack.hooks.bells ?? []).map((h) => at(RACK, h)), { x: RACK.x - 42, y: RACK.y - 44, w: 84, h: 44 }, RACK.y),
        Flames.candles(s, 124, 382),
        Flames.candles(s, 176, 382),
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 7),
        new Smoke(s, [{ x: MEE.x + 10, y: MEE.y - 28 }], 3),
        new Flags(s, [
          { x: 34, y: 212, kind: 'dharma', sortY: 240 },
          { x: 266, y: 212, kind: 'thai', sortY: 240 },
        ]),
        new Gags(s, gags(() => fc.fire(mouth.x, mouth.y - 2, 20))),
        new Motes(s, { x: 110, y: 130, w: 80, h: 190 }, 0.6),
        new Butterflies(s, [
          { x: 108, y: 660, w: 14, h: 50 },
          { x: 178, y: 660, w: 14, h: 50 },
        ], 4),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [{ y: 952, dir: 1 }]),
        new TapZones([
          shakeTree(s, 'rain', RAIN.x, RAIN.y - 10, 84, ['#9ed86a', '#ffb3cf']),
          shakeTree(s, 'rt1', 40, 190, 84, ['#9ed86a', '#ffb3cf']),
          shakeTree(s, 'rt2', 262, 196, 84, ['#9ed86a', '#5eae55']),
          shakeTree(s, 'bodhi', 232, 842, 80, ['#9ed86a', '#5eae55']),
          shakeTree(s, 'fr1', 30, 668, 40, ['#ffc4d8', '#ffe45e'], 'petal'),
          shakeTree(s, 'fr2', 270, 388, 40, ['#fffaf0', '#ffd23f'], 'petal'),
          {
            rect: { x: 100, y: 110, w: 100, h: 120 },
            fn: () => {
              s.particles.sparkles(CX, 150 + rand(-20, 20), 10, '#fff3a6', 14)
              sfx.chime()
            },
          },
          {
            rect: { x: 40, y: 510, w: 92, h: 40 },
            fn: () => {
              s.say(pick(['สาธุ~ หลวงพ่อแช่มคุ้มครอง', 'ทองคำเปลวเต็มองค์เลย', 'หลวงพ่อช่วยให้หายเจ็บป่วย']), HALL.x, 506, 2.2)
              s.particles.sparkles(HALL.x, 530, 8, '#fff3a6', 12)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) s.particles.add({ kind: 'leaf', x: RAIN.x + rand(-40, 40), y: RAIN.y - 70 + rand(-10, 10), vx: rand(-4, 4), vy: rand(6, 10), max: 3, color: '#9ed86a', color2: '#5eae55' })
      // Firecracker smoke haze drifting over the grounds.
      if (Math.random() < dt * 0.5) s.particles.add({ kind: 'smoke', x: FURNACE.x + rand(-20, 20), y: FURNACE.y - 30, vx: rand(-8, -2), vy: rand(-6, -2), max: rand(3, 5), color: '#f0eaf0', size: 2 })
    },
    wander: [
      { x: 40, y: 380, w: 220, h: 20 },
      { x: 130, y: 420, w: 40, h: 480 },
      { x: 24, y: 574, w: 250, h: 26 },
      { x: 150, y: 740, w: 120, h: 80 },
    ],
    pois: [
      { x: 140, y: 400, face: 'up' },
      { x: 160, y: 400, face: 'up' },
      { x: 76, y: 578, face: 'up' },
      { x: 96, y: 578, face: 'up' },
      { x: RACK.x, y: 610, face: 'up' },
      { x: 200, y: 530, face: 'up' },
      { x: MEE.x, y: 784, face: 'up' },
      { x: OHAEW.x, y: 804, face: 'up' },
    ],
    fireflies: [{ x: 190, y: 640, w: 100, h: 100 }],
    monkPath: [
      [CX, 352],
      [CX, 910],
      [CX, 944],
      [-20, 944],
    ],
    birds: { x: 40, y: 380, w: 220, h: 20 },
    cats: [{ x: 196, y: 400, pose: 'loaf', color: '#f5a55a' }],
    novice: { x: 128, y: 430, w: 44, h: 120 },
    vendors: [{ x: 110, y: 776 }],
    dogs: ['mali'],
    visitors: 5,
  }
}
