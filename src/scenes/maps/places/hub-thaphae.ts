// ถนนคนเดินท่าแพ (Tha Phae Gate & the Sunday Walking Street) – hub market.
// Outside the red-brick gate: the pigeon plaza, a busker with a ซึง, foot-
// massage chairs, a roti cart and the moat; through the gate: the walking
// street under strings of Lanna lanterns, craft stalls (Bo Sang umbrellas,
// lanterns, wood carvings), khao soi, and a Lanna viharn at the far end.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { woodElephants } from '../../../art/places/bangkok'
import { CloudShadows, Glints, Lanterns, SunRays, TapZones, Traffic } from '../../life'
import { Gags, drawPerson, type Gag } from '../../gags'
import { booth, canalWater, clothesGoods, foodCart, grillGoods, jarGoods, lanternGoods, noodleGoods, noticeBoard, potGoods, tiles, toyGoods, silkGoods, hooksAt } from '../../../art/places/hub-kit'
import { sideFacade, stallTable } from '../../../art/places/hub-maeklong'
import { bosangStall, doiSuthep, gateDoor, lannaViharn, massageChairs, redTruck, thaPhaeWall } from '../../../art/places/hub-thaphae'
import { road } from '../common'
import { HubArrival, Hawkers, OrangeCats, giverGag, hs, hubChat, look, personGag, tradePairGag } from './hub-common'

const ID = 'hub_thaphae'
const W = 320
const H = 1070
const CX = 160
const VIHARN = { x: CX, y: 180 }
const ROWS = [244, 304, 364, 424, 484, 544]
const LX = 62
const RX = 258
const WALL_Y = 668
const GAP: [number, number] = [120, 200]
const MOAT = { top: 934, bot: 972 }

function bake(g: Surface, night: boolean) {
  doiSuthep(g, 26, 82, W, night)
  G.treeLine(g, 80, W, G.LEAVES.deep, 71)
  // Walking street (closed road) with a centre line of old paving.
  tiles(g, 0, 96, W, WALL_Y - 96, 10, night ? '#8a8494' : '#bcb4b0', night ? '#827c8c' : '#b0a8a4', 7)
  g.rect(36, 186, W - 72, WALL_Y - 186, night ? '#6a6374' : '#8a8290')
  for (let y = 196; y < WALL_Y; y += 16) g.rect(CX - 1, y, 2, 8, night ? '#a8a080' : '#e8e0c0')
  sideFacade(g, 0, 36, 186, WALL_Y - 46, 1, 21, night)
  sideFacade(g, 284, 36, 186, WALL_Y - 46, -1, 23, night)
  // Temple forecourt.
  tiles(g, 60, 150, 200, 40, 8, '#e8e0d4', '#dcd2c4', 9)
  thaPhaeWall(g, WALL_Y, W, GAP[0], GAP[1], night)
  // Plaza outside the gate (pigeon square) + a round fountain pool.
  tiles(g, 0, WALL_Y, W, MOAT.top - WALL_Y, 12, night ? '#a8a0a0' : '#dcd4cc', night ? '#a09898' : '#d0c8c0', 11)
  g.ellipse(CX, 876, 30, 12, '#8a8290')
  g.ellipse(CX, 875, 28, 10.5, night ? '#34528a' : '#78c8e0')
  g.ellipse(CX, 874, 22, 7, night ? '#46708a' : '#a4e0f0')
  canalWater(g, 0, MOAT.top, W, MOAT.bot - MOAT.top, night, 9)
  // Bridge over the moat.
  tiles(g, 136, MOAT.top - 2, 48, MOAT.bot - MOAT.top + 4, 6, '#e8e0d4', '#dcd2c4', 4)
  g.hline(136, 183, MOAT.top - 2, '#b8543a')
  g.hline(136, 183, MOAT.bot + 1, '#b8543a')
  road(g, 0, MOAT.bot + 2, W, H - MOAT.bot - 2)
}

function gags(): Gag[] {
  const kham = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_hilltribe', bottom: 'bot_sin_nan' })
  const sueng = look({ gender: 'm', hair: 'hair_wavy', hairColor: 0, top: 'top_mohom', bottom: 'bot_fisherman', head: 'head_doi_beanie' })
  const khaosoi = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_vendor', head: 'head_vendorband' })
  const painter = look({ gender: 'm', hair: 'hair_ponytail', hairColor: 0, top: 'top_white_artist', bottom: 'bot_jeans' })
  const massage1 = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_hawaii', bottom: 'bot_cargo' })
  const tourist = look({ gender: 'f', hair: 'hair_long', hairColor: 3, top: 'top_tank', bottom: 'bot_elephant', head: 'head_sunhat' })
  const pigeonKid = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_tee_boon', bottom: 'bot_denim_shorts' })
  return [
    giverGag(kham, 110, 486, ['ปี้น้องมาแอ่วเจียงใหม่ก๋า', 'โคมนี้แม่อุ๊ยทำเองเจ้า', 'ช่วยแม่อุ๊ยหน่อยได้ก่อเจ้า']),
    giverGag(sueng, 196, 770, ['เพลงนี้ชื่อ "ข้าวซอยไม่ใส่ผักกาดดอง"', 'ดีดซึงมาสิบปีครับ', 'ฟังจบแล้วอย่าลืมทำบุญนะ'], {
      pose: 'sit',
      over: (g, p) => {
        // The ซึง (Lanna lute) and an open hat for tips.
        const strum = Math.round(Math.sin(p.t * 10))
        g.ellipse(p.x + 1, p.y - 8, 3, 2, '#c9a06a')
        g.line(p.x + 3, p.y - 9, p.x + 9, p.y - 15, '#8a5a3a')
        g.px(p.x - 1, p.y - 9 + strum, '#fffaf0')
        g.ellipse(p.x - 10, p.y, 4, 1.5, '#6e4a35')
        g.px(p.x - 11, p.y - 1, '#ffd54f')
        if (Math.floor(p.t * 2) % 2) {
          g.px(p.x + 8, p.y - 24, '#fff3a6')
          g.px(p.x + 9, p.y - 25, '#fff3a6')
          g.vline(p.x + 10, p.y - 29, p.y - 25, '#fff3a6')
        }
      },
    }),
    personGag(khaosoi, 62, 318, ['ข้าวซอยน้ำข้นเจ้า', 'เผ็ดน้อยเผ็ดมาก?', 'กินกับผักกาดดองหอมแดงเน้อ'], { view: 'front', z: 1 }),
    personGag(painter, 236, 440, ['วาดชื่อบนร่มให้ฟรีเจ้า', 'ร่มบ่อสร้างกระดาษสาแท้', 'ลายดอกไม้ลายช้างก็มี'], {
      view: 'side',
      over: (g, p) => {
        const a = Math.sin(p.t * 5) * 2
        g.line(p.x + 4, p.y - 13, Math.round(p.x + 9 + a), p.y - 17, '#6e4a35')
        g.px(Math.round(p.x + 9 + a), p.y - 17, '#e8514a')
      },
    }),
    {
      x: 250,
      y: 724,
      w: 60,
      h: 20,
      lines: ['โอ๊ยยย ตรงนั้นแหละ!', 'นวดเท้าสามสิบนาที หลับไปยี่สิบนาที', 'มือหนักมากก ดีมาก!', 'Ouch! ...Good!'],
      draw: (g, p) => {
        // Tourists reclining with their feet up, therapists at work.
        for (let i = 0; i < 3; i++) {
          const x = p.x - 22 + i * 16
          const sp = drawPersonFlat(g, i === 1 ? tourist : massage1, x, p.y - 2)
          void sp
          const k = Math.round(Math.sin(p.t * (p.react > 0 ? 14 : 5) + i) * 1)
          g.rect(x + 9, p.y - 8 + k, 3, 3, '#f0bd90')
        }
      },
      react: (s, x, y) => {
        s.particles.sparkles(x, y - 16, 6, '#fff3a6', 8)
        sfx.rattle()
      },
    },
    personGag(pigeonKid, 118, 790, ['นกพิราบเยอะมากกก!', 'ไล่นกเล่นดีกว่า', 'บินกันใหญ่เลย!'], {
      walk: { x0: 90, x1: 230, speed: 16 },
      react: (s, x, y) => s.burstBirds(x, y - 10, 5),
    }),
    tradePairGag(210, 590, { hair: 'hair_bob', top: 'top_hilltribe' }, { hair: 'hair_curtain', top: 'top_flannel' }, ['แลกโคมจิ๋วกับร่มบ่อสร้างไหม', 'ดีลลล 🤝', 'ของแรร์จากเชียงใหม่!']),
  ]
}

/** A reclining figure (massage chair) drawn from the avatar, lying back. */
function drawPersonFlat(g: Surface, lk: ReturnType<typeof look>, x: number, y: number) {
  drawPerson(g, lk, { x: x + 5, y, flip: false, moving: false, react: 0, t: 0 }, 'side', [], 'sit')
  return null
}

export function thaphaeMap(): MapDef {
  const viharn = lannaViharn()
  const viharnN = lannaViharn(true)
  const board = noticeBoard('tp', '#b8543a')
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const khaosoi = booth({ key: 'tp_khaosoi', w: 48, roof: '#e8514a', wall: '#fff1d6', back: jarGoods(['#ffd23f', '#e8514a']), counter: noodleGoods(), skirt: '#ffd23f', sign: '#b8343f' })
  const lanterns = booth({ key: 'tp_lantern', w: 48, roof: '#ffcf5a', wall: '#fff1d6', back: lanternGoods(), counter: lanternGoods(), skirt: '#e8514a', valance: ['#ffcf5a', '#e8514a'] })
  const silver = booth({ key: 'tp_silver', w: 48, roof: '#5a8de0', wall: '#e8e8f4', back: jarGoods(['#dcdce8', '#c8c8d8']), counter: toyGoods(), skirt: '#3d63b5' })
  const bags = booth({ key: 'tp_bags', w: 48, roof: '#43905a', wall: '#f0e8d8', back: clothesGoods(['#b8343f', '#3d63b5', '#ffd23f', '#3a3040'], 11), counter: silkGoods(), skirt: '#6a4a8a' })
  const soap = booth({ key: 'tp_soap', w: 48, roof: '#ff9fc0', wall: '#fff1f6', back: jarGoods(['#ff9fc0', '#fffaf0', '#c8a0ff']), counter: jarGoods(['#fffaf0', '#ffe27a']), skirt: '#e8709e' })
  const pottery = booth({ key: 'tp_pottery', w: 48, roof: '#c8704c', wall: '#f0e0d0', back: potGoods(), counter: potGoods(), skirt: '#8a5a3a' })
  const saiua = foodCart('tp_saiua', { body: '#b8543a', parasol: ['#e8514a', '#fffaf0'], goods: grillGoods('#b8543a') })
  const roti = foodCart('tp_roti', { body: '#43905a', parasol: ['#ffd23f', '#fffaf0'], goods: jarGoods(['#fff6c8', '#ffd23f']) })
  const longan = foodCart('tp_longan', { body: '#f58f35', parasol: ['#6cc36a', '#fffaf0'], goods: jarGoods(['#e8d4a0', '#d8c080']) })
  const left = [khaosoi, lanterns, silver, bags, soap, pottery]
  const LAMPS: [number, number][] = [
    [40, 700],
    [280, 700],
    [40, 910],
    [280, 910],
  ]
  const props: PlacedProp[] = [
    { sprite: viharn, night: viharnN, x: VIHARN.x, y: VIHARN.y },
    { sprite: F.donationSprite(), x: 222, y: 180, shadow: [6, 2] },
    { sprite: G.bodhiTree2(), x: 36, y: 180 },
    { sprite: G.frangipani(1), x: 290, y: 176 },
    // Stalls in two rows along the street + the centre table row.
    ...ROWS.map((y, i) => ({ sprite: i === 3 ? lanterns : left[i === 1 ? 0 : (i + 1) % left.length], x: LX, y })),
    ...ROWS.map((y, i) => ({ sprite: i === 3 ? bosangStall() : [bags, soap, silver, bags, pottery, lanterns][i], x: RX, y })),
    ...ROWS.map((y, i) => ({ sprite: stallTable(`tp${i}`, [lanternGoods(), toyGoods(), jarGoods(['#ff9fc0', '#9fd0ff']), potGoods(), silkGoods(), toyGoods()][i], ['#e8514a', '#3d63b5', '#43905a', '#f58f35', '#6a4a8a', '#e8709e'][i]), x: CX, y: y + 6 })),
    { sprite: woodElephants(4, 3), x: CX, y: 604 },
    { sprite: F.spiritHouseSprite(), x: 60, y: 612 },
    { sprite: gateDoor(false), x: GAP[0], y: WALL_Y },
    { sprite: gateDoor(true), x: GAP[1], y: WALL_Y },
    // Plaza.
    { sprite: massageChairs(4), x: 250, y: 726 },
    { sprite: roti, x: 84, y: 770 },
    { sprite: saiua, x: 40, y: 836 },
    { sprite: longan, x: 280, y: 790 },
    { sprite: board, x: 262, y: 858, shadow: [12, 3] },
    { sprite: redTruck(), x: 60, y: 1000 },
    { sprite: redTruck(), x: 262, y: 1002, flip: true },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: ID,
    place: ID,
    area: 'mountain',
    w: W,
    h: H,
    skyH: 84,
    ground: '#bcb4b0',
    camBias: 0.58,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      { x: 104, y: 140, w: 112, h: 40 },
      { x: 214, y: 172, w: 14, h: 9 },
      { x: 26, y: 172, w: 20, h: 9 },
      { x: 284, y: 170, w: 12, h: 7 },
      { x: 0, y: 186, w: 36, h: WALL_Y - 186 },
      { x: 284, y: 186, w: 36, h: WALL_Y - 186 },
      ...ROWS.flatMap((y) => [
        { x: LX - 24, y: y - 20, w: 48, h: 21 },
        { x: RX - 24, y: y - 20, w: 48, h: 21 },
        { x: CX - 17, y: y - 4, w: 34, h: 11 },
      ]),
      { x: CX - 16, y: 596, w: 32, h: 9 },
      { x: 48, y: 602, w: 24, h: 11 },
      // The wall (the gate gap stays open).
      { x: 0, y: WALL_Y - 46, w: GAP[0], h: 46 },
      { x: GAP[1], y: WALL_Y - 46, w: W - GAP[1], h: 46 },
      { x: GAP[0] - 16, y: WALL_Y - 54, w: 16, h: 54 },
      { x: GAP[1], y: WALL_Y - 54, w: 16, h: 54 },
      { x: 216, y: 716, w: 68, h: 11 },
      { x: 65, y: 760, w: 38, h: 11 },
      { x: 21, y: 826, w: 38, h: 11 },
      { x: 261, y: 780, w: 38, h: 11 },
      { x: 248, y: 848, w: 28, h: 11 },
      { x: CX - 30, y: 866, w: 60, h: 18 },
      { x: 0, y: MOAT.top, w: 136, h: MOAT.bot - MOAT.top },
      { x: 184, y: MOAT.top, w: W - 184, h: MOAT.bot - MOAT.top },
      { x: 0, y: MOAT.bot + 2, w: W, h: H - MOAT.bot - 2 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      hs('shop:hub_thaphae_khaosoi', 'ข้าวซอยแม่คำปัน', 'ข้าวซอย · ขนมจีนน้ำเงี้ยว · ไส้อั่ว', 'curry', { x: LX - 22, y: ROWS[1] - 44, w: 44, h: 44 }, { x: LX, y: ROWS[1] + 10 }, { marker: { x: LX, y: ROWS[1] - 46 } }),
      hs('shop:hub_thaphae_umbrella', 'ร่มบ่อสร้างวาดสด', 'ร่มกระดาษสาวาดมือ · น้ำลำไย', 'shop', { x: RX - 22, y: ROWS[3] - 42, w: 44, h: 42 }, { x: RX, y: ROWS[3] + 10 }, { marker: { x: RX, y: ROWS[3] - 44 } }),
      hs('shop:hub_thaphae_roti', 'โรตีป้าเฮาะ', 'โรตีกล้วยไข่ · น้ำลำไยเย็น', 'dessert', { x: 66, y: 730, w: 36, h: 40 }, { x: 84, y: 782 }, { marker: { x: 84, y: 728 } }),
      hs('incense', 'ศาลริมถนน', 'จุดธูปอธิษฐานกับแสงโคม', 'incense', { x: 48, y: 578, w: 24, h: 34 }, { x: 80, y: 610 }, { face: 'left', marker: { x: 60, y: 576 } }),
      hs('donation', 'ตู้ทำบุญหน้าวิหาร', 'ร่วมทำบุญวัดกลางเมือง', 'coin', { x: 214, y: 156, w: 16, h: 24 }, { x: 222, y: 192 }, { marker: { x: 222, y: 154 } }),
      hs('npc:tp_kham', 'แม่อุ๊ยคำ', 'ช่างทำโคมล้านนา', 'friends', { x: 102, y: 456, w: 16, h: 32 }, { x: 110, y: 498 }, { marker: { x: 110, y: 444 }, near: 14 }),
      hs('npc:tp_sueng', 'น้องซึง', 'นักดนตรีเปิดหมวก', 'friends', { x: 188, y: 740, w: 16, h: 32 }, { x: 196, y: 784 }, { marker: { x: 196, y: 732 }, near: 14 }),
      hs(`board:${ID}`, 'บอร์ดข่าวถนนคนเดิน', 'กิจกรรมวันนี้ · ร้านเด่น · ใครตามหาอะไร', 'scroll', { x: 246, y: 824, w: 32, h: 34 }, { x: 262, y: 870 }, { marker: { x: 262, y: 822 } }),
      hs('gate', 'ป้ายรถแดง', 'ขึ้นรถแดงกลับบ้าน หรือไปที่อื่น', 'map', { x: 136, y: 962, w: 48, h: 36 }, { x: CX, y: 966 }, { face: 'down', marker: { x: CX, y: 958 }, near: 12 }),
    ],
    spawn: { x: CX, y: 950, face: 'up' },
    entries: {},
    pickupSpots: [
      { x: 110, y: 210 },
      { x: 210, y: 270 },
      { x: 110, y: 390 },
      { x: 210, y: 510 },
      { x: 100, y: 600 },
      { x: 240, y: 606 },
      { x: 150, y: 720 },
      { x: 200, y: 900 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: VIHARN.x, y: VIHARN.y - 30, r: 40, color: '#ffcf7a' },
      ...ROWS.flatMap((y) => [
        { x: LX, y: y - 28, r: 24, color: '#ffcf7a' },
        { x: RX, y: y - 28, r: 24, color: '#ffcf7a' },
      ]),
      { x: 60, y: 610, r: 14, color: '#ff9a5a' },
      { x: CX, y: 640, r: 30, color: '#ffe7a0' },
    ],
    remoteChat: hubChat(ID),
    life(s) {
      return [
        new HubArrival(s),
        new Lanterns(
          s,
          [214, 274, 334, 394, 454, 514, 574].map((y, i) => ({ x0: 36, y0: y, x1: 284, y1: y + (i % 2 ? 4 : -2), n: 12, sag: 9, colors: ['#ffcf5a', '#e8514a', '#f58f35', '#fffaf0'] })),
        ),
        new Gags(s, gags()),
        new OrangeCats(s, [
          { x: 100, y: 188, pose: 'sleep' },
          { x: 300, y: 740, pose: 'loaf' },
        ]),
        new Hawkers(s, [
          ...ROWS.map((y) => ({ x: LX, y: y - 30, lines: ['งานทำมือเจ้า', 'แวะชมก่อนเน้อ', 'ของฝากเจียงใหม่!', 'ลดให้เจ้า~'] })),
          ...ROWS.map((y) => ({ x: RX, y: y - 30, lines: ['ย่ามปักมือเจ้า', 'สบู่ดอกไม้หอม ๆ', 'เลือกก่อนได้เจ้า', 'ถูก ๆ เจ้า'] })),
          { x: 40, y: 810, lines: ['ไส้อั่วแคบหมูเจ้า!', 'หอมสมุนไพร'] },
          { x: 280, y: 766, lines: ['น้ำลำไยเย็น ๆ เจ้า'] },
        ]),
        new Glints(s, hooksAt(viharn, 'glints', VIHARN.x, VIHARN.y), 1.2),
        new CloudShadows(s, 2),
        new SunRays(s),
        new Traffic(s, [
          { y: 1030, dir: 1 },
          { y: 1056, dir: -1 },
        ]),
        new TapZones([
          {
            rect: { x: 0, y: WALL_Y - 54, w: W, h: 50 },
            fn: (x) => {
              s.say(pick(['ประตูท่าแพ สร้างมาตั้งแต่สมัยพญามังราย', 'อิฐแดงก้อนนี้เก่ามากเลยนะ', 'ถ่ายรูปหน้าประตูท่าแพ ต้องมี!']), x, WALL_Y - 58, 2.4)
              s.burstBirds(x, WALL_Y - 40, 3)
              sfx.tap()
            },
          },
          {
            rect: { x: CX - 30, y: 858, w: 60, h: 24 },
            fn: (x, y) => {
              for (let i = 0; i < 8; i++) s.particles.add({ kind: 'drop', x: x + rand(-8, 8), y, vx: rand(-14, 14), vy: rand(-30, -14), g: 80, max: 0.7, color: '#d4f1ff' })
              s.say(pick(['โยนเหรียญอธิษฐาน~', 'น้ำพุเย็นชื่นใจ']), CX, 850, 1.8)
              sfx.splash()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      // Fountain jets.
      if (Math.random() < dt * 14) s.particles.add({ kind: 'drop', x: CX + rand(-2, 2), y: 872, vx: rand(-10, 10), vy: rand(-34, -24), g: 70, max: 0.8, color: '#d4f1ff' })
      // Sai ua smoke.
      if (Math.random() < dt * 2.5) s.particles.add({ kind: 'smoke', x: 40 + rand(-6, 6), y: 812, vx: rand(-3, 3), vy: rand(-12, -6), max: 1.4, color: '#e8e0e0', size: 2 })
    },
    wander: [
      { x: 90, y: 196, w: 50, h: 400 },
      { x: 180, y: 196, w: 50, h: 400 },
      { x: 60, y: 690, w: 200, h: 40 },
      { x: 100, y: 790, w: 120, h: 60 },
      { x: 60, y: 890, w: 200, h: 36 },
    ],
    pois: [
      ...ROWS.flatMap((y) => [
        { x: LX + 4, y: y + 10, face: 'up' as const },
        { x: RX - 4, y: y + 10, face: 'up' as const },
        { x: CX, y: y + 16, face: 'up' as const },
      ]),
      { x: 84, y: 782, face: 'up' },
      { x: 280, y: 802, face: 'up' },
      { x: CX, y: 690, face: 'up' },
      { x: CX, y: 196, face: 'up' },
    ],
    birds: { x: 90, y: 700, w: 140, h: 120 },
    cats: [],
    vendors: [
      ...ROWS.filter((_, i) => i % 2 === 0).flatMap((y) => [
        { x: LX + 12, y: y - 14 },
        { x: RX - 12, y: y - 14 },
      ]),
      { x: 96, y: 758 },
    ],
    dogs: [],
    visitors: 12,
  }
}
