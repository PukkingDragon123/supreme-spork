// วัดพระธาตุพนม, Nakhon Phanom.
//   that_phanom         – the cloister round the tall white-and-gold that, the
//                         viharn, the bodhi tree with the khaen player, the
//                         avenue with its victory arch and Isan food, down to
//                         the Mekong with Laos on the far bank (fire boats at night).
//   that_phanom:viharn  – the viharn interior with its Lao-style Buddha.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { drawPerson, Gags, type Gag } from '../../gags'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Lanterns, Smoke, SunRays, TapZones } from '../../life'
import { monkSprite } from '../../../art/characters'
import { drawShadow } from '../../../art/props'
import { altarSprite, buddhaProp, pillarSprite, bakeRoom, roomGeo, carpet, hooksAt, offeringTable, donationBox, lotusVase, baiSriSprite, candleRack, marigoldPile, water, hsh, GOLD, type RoomOpts } from '../../../art/places/northisan'
import { lannaViharnSprite } from '../../../art/places/northisan-doi'
import { thatSprite, laoArchSprite, cloisterSprite, somTamStallSprite, drawFireBoat, laosBank } from '../../../art/places/northisan-phanom'
import { Circlers, drawCostumed, hs, look, Notes, Shuttle, SwimFish, tune } from './northisan-common'

const W = 300
const H = 1010
const CX = 150
const THAT = { x: CX, y: 352 }
const CL = { y0: 118, y1: 384, x0: 26, x1: 274 }
const VIH = { x: CX, y: 548 }
const TREE = { x: 44, y: 486 }
const SALA = { x: 256, y: 480 }
const ARCH = { x: CX, y: 724 }
const BANK = 846 // promenade top
const RIVER = { y0: 872, y1: 948 }

function bakeTP(g: Surface, night: boolean) {
  G.treeLine(g, 90, W, G.LEAVES.far, 13)
  G.lawn(g, 0, 104, W, BANK - 104, 51)
  // Cloister courtyard (marble) and side galleries.
  g.rect(CL.x0, CL.y0, CL.x1 - CL.x0, CL.y1 - CL.y0, '#ece6de')
  for (let j = CL.y0; j < CL.y1; j += 12)
    for (let i = CL.x0; i < CL.x1; i += 12) {
      g.rect(i, j, 12, 12, ((i + j) / 12) % 2 ? '#f6f2ec' : '#ebe4da')
      g.px(i + 1, j + 1, '#ffffff')
    }
  for (const x of [CL.x0 - 12, CL.x1]) {
    g.rect(x, CL.y0 - 6, 12, CL.y1 - CL.y0 + 10, '#b8343f')
    for (let y = CL.y0 - 6; y < CL.y1 + 4; y += 3) g.hline(x, x + 11, y, y % 6 ? '#b8343f' : '#8a2335')
    g.vline(x === CL.x1 ? x : x + 11, CL.y0 - 6, CL.y1 + 4, GOLD.b)
  }
  // Circumambulation ring and terrace base.
  g.ctx.save()
  g.ctx.globalAlpha = 0.5
  g.ellipse(THAT.x, THAT.y - 24, 84, 50, '#d8c8b0')
  g.ctx.restore()
  g.rect(THAT.x - 50, THAT.y - 60, 100, 64, '#d8d0c8')
  g.rect(THAT.x - 48, THAT.y - 58, 96, 60, '#f4f1ee')
  // Temple grounds outside the cloister.
  G.paving(g, CX - 16, CL.y1, 32, BANK - CL.y1, 8)
  G.paving(g, 40, CL.y1 + 8, W - 80, 30, 8)
  G.paving(g, 60, VIH.y + 4, W - 120, 26, 8)
  G.groundShadow(g, TREE.x, TREE.y - 4, 40, 10, 0.6)
  G.leafLitter(g, TREE.x - 36, TREE.y - 20, 80, 40, 70, 3)
  G.flowerBed(g, CX - 44, 620, 24, 70, ['#f58f35', '#ffd23f', '#fffaf0'], 1)
  G.flowerBed(g, CX + 20, 620, 24, 70, ['#f58f35', '#ffd23f', '#fffaf0'], 2)
  G.paving(g, 20, 760, W - 40, 36, 8, 'grey')
  // Riverside promenade, steps down to the Mekong.
  G.paving(g, 0, BANK, W, RIVER.y0 - BANK, 6, 'grey')
  g.rect(0, BANK, W, 3, '#bdb2ae')
  for (let x = 0; x < W; x += 10) g.rect(x, BANK - 4, 2, 7, '#bdb2ae')
  for (let i = 0; i < 4; i++) g.rect(CX - 24 + i * 2, RIVER.y0 - 8 + i * 2, 48 - i * 4, 2, i % 2 ? '#d8d0c8' : '#e8e0d8')
  // The Mekong – wide, milky-brown, and Laos on the far side.
  water(g, 0, RIVER.y0, W, RIVER.y1 - RIVER.y0, night, { deep: night ? '#2a3050' : '#8a7a5a', mid: night ? '#34405e' : '#a8987a', light: night ? '#5a6a8a' : '#c8b898', seed: 7 })
  laosBank(g, 0, RIVER.y1 - 14, W, H - RIVER.y1 + 14, night)
  // Pier.
  g.rect(CX - 8, RIVER.y0, 16, 22, '#8a5a3a')
  for (let y = RIVER.y0; y < RIVER.y0 + 22; y += 3) g.hline(CX - 8, CX + 7, y, '#a86b3e')
}

function tpGags(notes: Notes): Gag[] {
  const khaen = look({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman' })
  const somtam = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_mohom', bottom: 'bot_sin_mudmee' })
  const lao = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_white', bottom: 'bot_sin_mudmee' })
  const kid = look({ gender: 'm', hair: 'hair_buzz', top: 'top_tee_boon', bottom: 'bot_denim_shorts' })
  const auntie = look({ gender: 'f', hair: 'hair_short', hairColor: 6, top: 'top_white', bottom: 'bot_sin_mudmee' })
  return [
    {
      x: TREE.x + 30, y: TREE.y + 14, w: 16, h: 30, lines: ['แคนเป่าลายสุดสะแนน~', 'ม่วนซื่นโฮแซว!', 'ฟังลายแคนแล้วคิดฮอดบ้านบ่?'],
      draw: (g, p) => {
        drawCostumed(g, khaen, p, 'isan', 'sit')
        // Khaen (bamboo mouth organ).
        for (let k = 0; k < 4; k++) g.vline(p.x - 3 + k * 2, p.y - 30, p.y - 14, k % 2 ? '#c9a04c' : '#d8b870')
        g.rect(p.x - 3, p.y - 18, 8, 3, '#6e4a35')
      },
      react: (s, x, y) => {
        notes.emit(x, y - 32, 4)
        tune([0, 2, 4, 5, 4, 2, 0])
        void s
      },
    },
    { x: 60, y: 780 - 7, z: -1, lines: ['ส้มตำปูปลาร้าแซ่บ ๆ จ้า', 'ไก่ย่างหอม ๆ ข้าวเหนียวร้อน ๆ', 'เผ็ดน้อยบ่ลูก?'], draw: (g, p) => drawCostumed(g, somtam, p, 'isan') },
    {
      x: 226, y: 820, lines: ['สะบายดี! มาจากฝั่งลาวเด้อ', 'กาแฟลาวหอม ๆ จ้า', 'ตลาดนัดไทยลาว วันจันทร์กับพฤหัสนะ'],
      draw: (g, p) => drawPerson(g, lao, p, 'front', ['drink']),
    },
    {
      x: 96, y: 862, lines: ['ฝั่งโน้นคือลาว!', 'ปลาบึกตัวใหญ่เท่าเรือเลย (มั้ง)', 'คืนนี้มีไหลเรือไฟ!'],
      draw: (g, p) => drawPerson(g, kid, p, 'front'),
    },
    {
      x: SALA.x - 22, y: SALA.y + 16, lines: ['บายศรีสู่ขวัญ ถวายองค์พระธาตุ', 'ขวัญเอ๋ย ขวัญมา~', 'ผูกแขนรับขวัญหน่อยไหมลูก'],
      draw: (g, p) => drawPerson(g, auntie, p, 'front', [], p.react > 0 ? 'offer' : 'sit'),
      react: (s, x, y) => s.particles.sparkles(x, y - 20, 6, '#fffaf0', 6),
    },
    {
      x: CX + 26, y: CL.y1 + 20, lines: ['พระธาตุพนมประจำปีวอกนะโยม', 'ข้างในมีพระอุรังคธาตุ', 'เวียนเทียนสามรอบนะ'],
      draw: (g, p) => {
        const sp = monkSprite('front', p.react > 0 ? 'bless' : 'stand', { skin: 2 })
        drawShadow(g, p.x, p.y, 6, 2)
        g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 1))
      },
    },
  ]
}

export function thatPhanomMap(): MapDef {
  const that = thatSprite()
  const vih = lannaViharnSprite()
  const vihN = lannaViharnSprite(true)
  const arch = laoArchSprite()
  const rack = candleRack('tp', 10)
  const RACKS = [
    { x: 50, y: 236 },
    { x: 250, y: 236 },
  ]
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [[CX - 24, 600], [CX + 24, 600], [CX - 24, 810], [CX + 24, 810], [40, BANK + 2], [260, BANK + 2]]
  const salaProp = F.stallSprite()
  const props: PlacedProp[] = [
    { sprite: cloisterSprite(CL.x1 - CL.x0 + 24), x: CL.x0 - 12, y: CL.y0 },
    { sprite: that, x: THAT.x, y: THAT.y },
    { sprite: F.urnSprite(), x: CX, y: THAT.y + 22, shadow: [10, 2] as [number, number] },
    ...RACKS.map((r) => ({ sprite: rack, x: r.x, y: r.y })),
    { sprite: baiSriSprite(1.2), x: CX - 30, y: THAT.y + 16 },
    { sprite: baiSriSprite(1.2), x: CX + 30, y: THAT.y + 16 },
    { sprite: cloisterSprite(CX - 20 - (CL.x0 - 12)), x: CL.x0 - 12, y: CL.y1 + 2 },
    { sprite: cloisterSprite(CL.x1 + 12 - (CX + 20)), x: CX + 20, y: CL.y1 + 2 },
    { sprite: vih, night: vihN, x: VIH.x, y: VIH.y },
    { sprite: G.bodhiTree2(), x: TREE.x, y: TREE.y, id: 'tptree' },
    { sprite: salaProp, x: SALA.x, y: SALA.y },
    { sprite: baiSriSprite(1), x: SALA.x - 8, y: SALA.y + 4 },
    { sprite: marigoldPile(14, 7), x: SALA.x + 10, y: SALA.y + 5 },
    { sprite: arch, x: ARCH.x, y: ARCH.y },
    { sprite: somTamStallSprite(), x: 60, y: 780 },
    { sprite: F.stallSprite(), x: 240, y: 780 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
    { sprite: G.coconutPalm(0), x: 14, y: 700 },
    { sprite: G.coconutPalm(1), x: 286, y: 690 },
    { sprite: G.frangipani(1), x: 270, y: 620 },
    { sprite: G.frangipani(2), x: 28, y: 610 },
    { sprite: donationBox('tp'), x: CX + 44, y: THAT.y + 18 },
  ]
  return {
    id: 'that_phanom',
    place: 'that_phanom',
    area: 'river',
    w: W,
    h: H,
    skyH: 100,
    ground: '#86c95f',
    camBias: 0.6,
    entries: { 'that_phanom:viharn': { x: VIH.x, y: VIH.y + 16, face: 'down' } },
    bake: bakeTP,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: CL.y0 + 4 },
      { x: 0, y: CL.y0, w: CL.x0, h: CL.y1 - CL.y0 + 10 },
      { x: CL.x1, y: CL.y0, w: W - CL.x1, h: CL.y1 - CL.y0 + 10 },
      { x: THAT.x - 50, y: THAT.y - 62, w: 100, h: 66 },
      { x: CX - 10, y: THAT.y + 14, w: 20, h: 9 },
      { x: CX - 40, y: THAT.y + 10, w: 20, h: 8 },
      { x: CX + 20, y: THAT.y + 10, w: 20, h: 8 },
      { x: CX + 38, y: THAT.y + 12, w: 12, h: 7 },
      ...RACKS.map((r) => ({ x: r.x - 18, y: r.y - 6, w: 36, h: 7 })),
      { x: 0, y: CL.y1 - 8, w: CX - 18, h: 12 },
      { x: CX + 18, y: CL.y1 - 8, w: W - CX - 18, h: 12 },
      { x: VIH.x - 68, y: VIH.y - 90, w: 136, h: 84 },
      { x: TREE.x - 30, y: TREE.y - 20, w: 60, h: 22 },
      { x: SALA.x - 24, y: SALA.y - 14, w: 48, h: 15 },
      { x: ARCH.x - 40, y: ARCH.y - 12, w: 20, h: 13 },
      { x: ARCH.x + 20, y: ARCH.y - 12, w: 20, h: 13 },
      { x: CX - 44, y: 620, w: 24, h: 70 },
      { x: CX + 20, y: 620, w: 24, h: 70 },
      { x: 34, y: 764, w: 52, h: 17 },
      { x: 216, y: 766, w: 48, h: 15 },
      { x: 0, y: RIVER.y0, w: CX - 8, h: H - RIVER.y0 },
      { x: CX + 8, y: RIVER.y0, w: W - CX - 8, h: H - RIVER.y0 },
      { x: CX - 8, y: RIVER.y0 + 22, w: 16, h: H },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      hs('chedi', 'องค์พระธาตุพนม', 'เวียนเทียนรอบองค์พระธาตุ ๓ รอบ', 'sparkle', { x: THAT.x - 30, y: THAT.y - 220, w: 60, h: 220 }, { x: CX, y: THAT.y + 40 }, { marker: { x: CX, y: THAT.y - 226 }, beacon: true }),
      hs('incense', 'กระถางธูปหน้าพระธาตุ', 'จุดธูป ถวายบายศรี', 'incense', { x: CX - 12, y: THAT.y, w: 24, h: 24 }, { x: CX, y: THAT.y + 34 }, { marker: { x: CX, y: THAT.y - 2 } }),
      hs('job:light_candles', 'ราวเทียนรอบลานพระธาตุ', 'จุดเทียนถวายองค์พระธาตุ', 'broom', { x: 30, y: 218, w: 40, h: 22 }, { x: 50, y: 248 }),
      hs('door:that_phanom:viharn', 'วิหารพระธาตุพนม', 'เข้าไปกราบพระประธาน', 'door', { x: VIH.x - 12, y: VIH.y - 44, w: 24, h: 44 }, { x: VIH.x, y: VIH.y + 6 }, { marker: { x: VIH.x, y: VIH.y - 48 }, near: 8 }),
      hs('job:sweep_leaves', 'ใต้ต้นโพธิ์', 'กวาดใบโพธิ์รอบลานวัด', 'broom', { x: TREE.x - 36, y: TREE.y - 70, w: 72, h: 72 }, { x: TREE.x + 8, y: TREE.y + 12 }, { marker: { x: TREE.x, y: TREE.y - 74 } }),
      hs('shop:that_phanom_somtam', 'ร้านส้มตำไก่ย่างแม่คำ', 'ส้มตำ ไก่ย่าง ข้าวเหนียว อาหารอีสาน', 'shop', { x: 36, y: 730, w: 50, h: 50 }, { x: 60, y: 796 }, { marker: { x: 60, y: 726 } }),
      hs('flower_stall', 'ร้านบายศรีและดอกไม้', 'บายศรี ดอกไม้ ธูปเทียน', 'garland', { x: 216, y: 734, w: 48, h: 46 }, { x: 240, y: 796 }, { marker: { x: 240, y: 730 } }),
      hs('river_fish', 'ริมโขง', 'ให้อาหารปลาในแม่น้ำโขง', 'bread', { x: 180, y: RIVER.y0, w: 90, h: 40 }, { x: 222, y: RIVER.y0 - 8 }, { face: 'down', marker: { x: 222, y: RIVER.y0 + 6 } }),
      hs('job:feed_catfish', 'ปลาบึกริมตลิ่ง', 'ช่วยให้อาหารปลาบึก ปลาสวาย', 'broom', { x: 30, y: RIVER.y0, w: 80, h: 40 }, { x: 70, y: RIVER.y0 - 8 }, { face: 'down', marker: { x: 70, y: RIVER.y0 + 6 } }),
      hs('krathong', 'ท่าน้ำริมโขง', 'ลอยกระทงถวายพระธาตุกลางโขง', 'krathong', { x: CX - 24, y: RIVER.y0 - 10, w: 48, h: 12 }, { x: CX + 14, y: RIVER.y0 - 6 }, { face: 'down', marker: { x: CX - 16, y: RIVER.y0 - 12 } }),
      hs('gate', 'ท่าเรือ', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: CX - 8, y: RIVER.y0, w: 16, h: 22 }, { x: CX, y: RIVER.y0 + 14 }, { face: 'down', marker: { x: CX, y: RIVER.y0 - 2 }, near: 12 }),
    ],
    spawn: { x: CX, y: BANK + 10, face: 'up' },
    pickupSpots: [
      { x: 50, y: 200 }, { x: 250, y: 200 }, { x: 60, y: 400 }, { x: 240, y: 404 }, { x: CX, y: 660 },
      { x: 100, y: 780 }, { x: 200, y: 790 }, { x: 30, y: 856 }, { x: 270, y: 858 }, { x: 120, y: 520 },
    ],
    lights: [
      { x: THAT.x, y: THAT.y - 120, r: 50, color: '#ffe7a0' },
      { x: THAT.x, y: THAT.y - 30, r: 40, color: '#fff3d6' },
      ...RACKS.map((r) => ({ x: r.x, y: r.y - 10, r: 16, color: '#ffb35a' })),
      { x: VIH.x, y: VIH.y - 30, r: 30 },
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 18 })),
      { x: ARCH.x, y: ARCH.y - 40, r: 26, color: '#ffe7a0' },
      { x: 60, y: 750, r: 18, color: '#ffcf7a' },
      { x: 240, y: 750, r: 16, color: '#ffb3cf' },
    ],
    life(s) {
      const notes = new Notes(s)
      return [
        new Glints(s, [...hooksAt(that, 'glints', THAT.x, THAT.y), ...hooksAt(vih, 'glints', VIH.x, VIH.y), ...hooksAt(arch, 'glints', ARCH.x, ARCH.y)], 1.8),
        new EaveBells(s, hooksAt(vih, 'bells', VIH.x, VIH.y), VIH.y),
        new Circlers(s, THAT.x, THAT.y - 26, 86, 52, 8, [{ top: 'top_white', bottom: 'bot_sin_mudmee', gender: 'f' }, { top: 'top_mohom' }]),
        ...RACKS.map((r) => new Flames(s, hooksAt(rack, 'flames', r.x, r.y), r.y)),
        new Smoke(s, [{ x: CX, y: THAT.y + 8 }], 7),
        new Smoke(s, [{ x: 70, y: 764 }], 3),
        new SwimFish(s, [{ x: 0, y: RIVER.y0 + 6, w: W, h: RIVER.y1 - RIVER.y0 - 24 }], 10, ['#6a5a40', '#5a4a36', '#7a6a50']),
        // Long-tail boat by day, fire boat at night, drifting on the Mekong.
        new Shuttle(s, [[-40, RIVER.y0 + 50], [W + 40, RIVER.y0 + 54]], 9, (g, x, y, t) => {
          if (s.isNight()) drawFireBoat(g, x, y, t, true)
          else {
            const bob = Math.round(Math.sin(t * 2 + x * 0.1))
            g.poly([[x - 18, y - 3 + bob], [x + 18, y - 3 + bob], [x + 12, y + 2 + bob], [x - 12, y + 2 + bob]], '#6e4a35')
            g.hline(x - 18, x + 18, y - 3 + bob, '#c28e5c')
            g.rect(x - 3, y - 10 + bob, 6, 7, '#e8514a')
            g.rect(x - 2, y - 14 + bob, 4, 4, '#c89a78')
          }
        }, { pause: 6, lines: ['ไหลเรือไฟ บูชาพระธาตุ~', 'ล่องโขงชมพระธาตุจ้า', 'ข้ามไปฝั่งลาวไหม?'], hit: { w: 40, h: 26 } }),
        notes,
        new Gags(s, tpGags(notes)),
        new Lanterns(s, [
          { x0: CL.x0, y0: CL.y0 + 16, x1: CL.x1, y1: CL.y0 + 16, n: 14, sag: 10, colors: ['#ffd23f', '#e8514a', '#fffaf0'] },
          { x0: CX - 40, y0: ARCH.y - 60, x1: CX - 16, y1: ARCH.y - 40, n: 3, sag: 3 },
        ]),
        new Butterflies(s, [{ x: CX - 44, y: 620, w: 88, h: 70 }], 5),
        new CloudShadows(s, 3),
        new SunRays(s),
        new TapZones([
          {
            rect: { x: THAT.x - 30, y: THAT.y - 220, w: 60, h: 160 },
            fn: () => {
              s.particles.sparkles(THAT.x, THAT.y - 160, 14, '#fff3a6', 16)
              s.say(['พระธาตุคู่บ้านคู่เมืองสองฝั่งโขง', 'สูง 53 เมตร ยอดทองคำ!', 'พระธาตุประจำปีวอก'][Math.floor(Math.random() * 3)], THAT.x, THAT.y - 228)
              sfx.chime()
            },
          },
          {
            rect: { x: TREE.x - 36, y: TREE.y - 80, w: 72, h: 56 },
            fn: () => {
              s.shake('tptree')
              s.drop(TREE.x, TREE.y - 50, 50, 6, '#9ed86a', '#5eae55', 'leaf')
              s.burstBirds(TREE.x, TREE.y - 60, 2)
              sfx.whoosh()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (s.isNight() && Math.random() < dt * 1.2) s.particles.add({ kind: 'sparkle', x: THAT.x + rand(-20, 20), y: rand(140, 330), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 34, y: 150, w: 232, h: 40 },
      { x: 34, y: 290, w: 232, h: 60 },
      { x: CX - 12, y: 400, w: 24, h: 440 },
      { x: 20, y: BANK + 4, w: W - 40, h: 16 },
    ],
    pois: [
      { x: CX - 10, y: THAT.y + 40, face: 'up' },
      { x: CX + 10, y: THAT.y + 40, face: 'up' },
      { x: 50, y: 248, face: 'up' },
      { x: 250, y: 248, face: 'up' },
      { x: VIH.x - 18, y: VIH.y + 12, face: 'up' },
      { x: 60, y: 796, face: 'up' },
      { x: 222, y: RIVER.y0 - 8, face: 'down' },
    ],
    monkPath: [
      [CX, CL.y1 + 10],
      [CX, BANK + 10],
      [-20, BANK + 10],
    ],
    birds: { x: 40, y: 770, w: 220, h: 20 },
    cats: [{ x: 262, y: 410, pose: 'sleep', color: '#fbf3e4' }],
    dogs: ['thuadam'],
    visitors: 6,
  }
}


// ===========================================================================
// The viharn.

const IW = 216
const IH = 280
const ROOM: RoomOpts = {
  w: IW,
  h: IH,
  wallTop: 20,
  wallH: 70,
  side: 10,
  front: 14,
  door: { x: IW / 2, w: 30 },
  floor: 'teak',
  wall: { L: '#fff6e0', b: '#f0e0c0', d: '#d8c098', D: '#b89868' },
  dado: '#8a2335',
}

function legendMural(g: Surface, x: number, y: number, w: number, h: number) {
  // The legend of the Urangkhathat: the Mekong, the that and pilgrims on boats.
  g.rect(x, y, w, h, '#f4e8cc')
  g.rect(x, y + h - 20, w, 12, '#8ab4c8')
  for (let i = 0; i < w; i += 5) g.px(x + i, y + h - 16 + (i % 3), '#c8e0ec')
  for (const bx of [x + 20, x + w - 40]) {
    g.poly([[bx, y + h - 20], [bx + 20, y + h - 20], [bx + 16, y + h - 16], [bx + 4, y + h - 16]], '#8a5a3a')
    g.rect(bx + 8, y + h - 28, 4, 8, '#ee9136')
  }
  const tx = x + w / 2
  for (let i = 0; i < 30; i++) {
    const half = 7 * (1 - i / 30) + 1
    g.hline(Math.round(tx - half), Math.round(tx + half), y + h - 22 - i, i > 16 ? GOLD.b : '#ffffff')
  }
  for (let i = 0; i < 8; i++) g.px(x + 10 + i * 24, y + 8 + (i % 2) * 4, '#ffd23f')
  g.frame(x, y, w, h, GOLD.d)
}

export function thatPhanomViharnMap(): MapDef {
  const geo = roomGeo(ROOM)
  const altar = altarSprite('tp', buddhaProp('antique', 0.66), { arch: 'thai', w: 96, tiers: 3 })
  const ALT = { x: IW / 2, y: 128 }
  const pil = pillarSprite('redgold', 70)
  const PIL: [number, number][] = [[42, 156], [IW - 42, 156], [42, 232], [IW - 42, 232]]
  const table = offeringTable('tpV', 44, ['candle', 'baisri', 'lotus', 'fruit', 'baisri', 'candle'])
  const rack = candleRack('tpV', 8)
  const props: PlacedProp[] = [
    { sprite: altar, x: ALT.x, y: ALT.y },
    { sprite: table, x: ALT.x, y: 148 },
    { sprite: baiSriSprite(1.4), x: ALT.x - 56, y: 132 },
    { sprite: baiSriSprite(1.4), x: ALT.x + 56, y: 132 },
    ...PIL.map(([x, y]) => ({ sprite: pil, x, y })),
    { sprite: rack, x: 64, y: 170 },
    { sprite: lotusVase(true), x: ALT.x - 38, y: 136 },
    { sprite: lotusVase(true), x: ALT.x + 38, y: 136 },
    { sprite: donationBox('tpV'), x: 170, y: 254 },
  ]
  return {
    id: 'that_phanom:viharn',
    place: 'that_phanom',
    area: 'river',
    indoor: true,
    indoorLight: 0.85,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#2b1d26',
    camBias: 0.55,
    entries: { that_phanom: { x: IW / 2, y: IH - 22, face: 'up' } },
    bake(g) {
      bakeRoom(g, ROOM, (gg, x, y, w, h) => legendMural(gg, x + 6, y + 4, w - 12, h - 8), 11)
      carpet(g, IW / 2 - 14, 160, 28, IH - 174, '#8a2335')
      carpet(g, 60, 196, 30, 44, '#e8a53a', '#b8742a')
      carpet(g, IW - 90, 196, 30, 44, '#e8a53a', '#b8742a')
    },
    props,
    obstacles: [
      ...geo.obstacles,
      { x: ALT.x - 48, y: 104, w: 96, h: 26 },
      { x: ALT.x - 22, y: 142, w: 44, h: 8 },
      { x: ALT.x - 66, y: 124, w: 20, h: 10 },
      { x: ALT.x + 46, y: 124, w: 20, h: 10 },
      ...PIL.map(([x, y]) => ({ x: x - 5, y: y - 4, w: 10, h: 5 })),
      { x: 50, y: 164, w: 28, h: 7 },
      { x: 164, y: 248, w: 12, h: 7 },
    ],
    hotspots: [
      hs('pray', 'พระประธานในวิหาร', 'กราบพระ สวดมนต์ ขอพรให้ครอบครัวสงบสุข', 'pray', { x: ALT.x - 40, y: 20, w: 80, h: 110 }, { x: ALT.x, y: 164 }, { marker: { x: ALT.x, y: 20 }, beacon: true }),
      hs('job:mop_floor', 'พื้นไม้วิหาร', 'ถูพื้นไม้ให้เงางาม', 'broom', { x: 140, y: 190, w: 50, h: 50 }, { x: 166, y: 216 }, { marker: { x: 166, y: 190 } }),
      hs('job:light_candles', 'ราวเทียน', 'จุดเทียนบูชาพระ', 'broom', { x: 46, y: 156, w: 36, h: 18 }, { x: 64, y: 182 }),
      hs('donation', 'ตู้ทำบุญ', 'ทำบุญบูรณะองค์พระธาตุ', 'coin', { x: 163, y: 236, w: 14, h: 20 }, { x: 170, y: 264 }),
      hs('door:that_phanom', 'ประตูวิหาร', 'ออกไปลานวัด', 'door', { x: IW / 2 - 15, y: IH - 18, w: 30, h: 18 }, { x: IW / 2, y: IH - 10 }, { face: 'down', near: 10 }),
    ],
    spawn: { x: IW / 2, y: IH - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ALT.x, y: 64, r: 44, color: '#ffe7a0' },
      { x: ALT.x, y: 140, r: 14, color: '#ffb35a' },
      { x: 64, y: 160, r: 16, color: '#ffb35a' },
      { x: IW / 2, y: IH - 8, r: 22, color: '#fff3d6' },
    ],
    life(s) {
      const elder = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sin_mudmee' })
      return [
        new Glints(s, hooksAt(altar, 'glints', ALT.x, ALT.y), 1.4),
        new Flames(s, hooksAt(altar, 'candles', ALT.x, ALT.y), ALT.y),
        new Flames(s, hooksAt(table, 'flames', ALT.x, 148), 148),
        new Flames(s, hooksAt(rack, 'flames', 64, 170), 170),
        new Smoke(s, [{ x: ALT.x, y: 138 }], 3),
        new Gags(s, [
          {
            x: 74, y: 222, lines: ['สาธุ~ ขอให้ลูกหลานอยู่ดีมีแฮง', 'ยายมาไหว้พระธาตุทุกปีเลย', 'ขวัญเอ๋ย ขวัญมา'],
            draw: (g, p) => drawPerson(g, elder, p, 'back', [], 'kneel'),
          },
        ]),
      ]
    },
    wander: [{ x: 60, y: 180, w: 96, h: 70 }],
    pois: [
      { x: ALT.x - 12, y: 168, face: 'up' },
      { x: ALT.x + 12, y: 168, face: 'up' },
      { x: IW - 76, y: 214, face: 'up' },
    ],
    dogs: [],
    visitors: 3,
  }
}

export const TP_MAPS: Record<string, () => MapDef> = {
  that_phanom: thatPhanomMap,
  'that_phanom:viharn': thatPhanomViharnMap,
}

void hsh
