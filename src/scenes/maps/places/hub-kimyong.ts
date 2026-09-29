// ตลาดกิมหยง หาดใหญ่ (Kim Yong Market, Hat Yai) – hub market. The old market
// building with its red sign band, a street of dried goods under red
// lanterns: Hat Yai fried chicken with a mound of fried shallots, dates in
// gold boxes, nuts and spices, roti with teh tarik, a Chinese shrine to
// light incense at, and shoppers from across the border with full bags.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { tukTuk } from '../../../art/props'
import { CloudShadows, Lanterns, Smoke, SunRays, TapZones, Traffic } from '../../life'
import { Gags, type Gag } from '../../gags'
import { booth, clothesGoods, concrete, crates, driedGoods, eatTable, foodCart, fruitGoods, jarGoods, noticeBoard, shophouses, silkGoods, tarpStall, tiles, toyGoods, hooksAt, wires } from '../../../art/places/hub-kit'
import { chickenGoods, chineseShrine, datesGoods, hangingChickens, hatYaiSkyline, kimYongBuilding, rotiGoods, sackGoods } from '../../../art/places/hub-kimyong'
import { road } from '../common'
import { HubArrival, Hawkers, OrangeCats, giverGag, hs, hubChat, look, personGag, tradePairGag } from './hub-common'

const ID = 'hub_kimyong'
const W = 320
const H = 900
const CX = 160
const BLDG = { x: CX, y: 236 }
const R1 = 330
const R2 = 440
const SHRINE = { x: 262, y: 574 }
const SH_Y = 720

function bake(g: Surface, night: boolean) {
  hatYaiSkyline(g, 20, 92, W, night)
  concrete(g, 0, 92, W, 700, 17, night ? '#b0a8a8' : '#d4ccc4', 0)
  tiles(g, 0, 236, W, 16, 6, '#e0d8d0', '#d0c8c0', 3)
  // The market street (asphalt) with painted parking bays.
  g.rect(136, 252, 48, 500, night ? '#6a6374' : '#8a8290')
  for (let y = 262; y < 740; y += 18) g.rect(CX - 1, y, 2, 8, night ? '#a8a080' : '#e8e0c0')
  shophouses(g, 0, 128, SH_Y, 11, night, { floors: 2 })
  shophouses(g, 192, 320, SH_Y, 13, night, { floors: 2 })
  tiles(g, 0, SH_Y, W, 64, 6, '#d8d0c8', '#c8c0b8', 5)
  g.rect(0, 782, W, 3, '#bdb2ae')
  road(g, 0, 785, W, H - 785)
  // Shrine forecourt.
  tiles(g, 222, 578, 84, 30, 6, '#e8d8c0', '#dccab0', 7)
}

function gags(): Gag[] {
  const din = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_white', bottom: 'bot_sarong', head: 'head_turban' })
  const siew = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_qipao', bottom: 'bot_black' })
  const ali = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_polo', bottom: 'bot_jeans', hand: 'hand_grocery' })
  const yah = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_vendor', bottom: 'bot_batik', head: 'head_vendorband' })
  const kalimah = look({ gender: 'f', hair: 'hair_long', hairColor: 0, top: 'top_baba', bottom: 'bot_batik', head: 'head_turban' })
  const shopper = look({ gender: 'f', hair: 'hair_wavy', hairColor: 1, top: 'top_floral', bottom: 'bot_skirt', hand: 'hand_tote' })
  return [
    giverGag(din, 226, 350, ['สลามัต~ อินทผลัมหวานที่สุด!', 'ชิมก่อนสามเม็ด ฟรี!', 'บังมีเรื่องให้ช่วยนิดนึง']),
    giverGag(siew, 36, 352, ['อาม่าขายที่นี่ห้าสิบปีแล้ว', 'หมึกแห้งอาม่าคัดเองทุกตัว', 'ลื้อช่วยอาม่าหน่อย'], { view: 'front' }),
    giverGag(ali, 196, 266, ['Hello! ผมมาจากปีนัง!', 'ไก่ทอดหาดใหญ่ best in the world', 'ช่วยผมหน่อยได้ไหม']),
    personGag(yah, 116, 344, ['ไก่ทอดหาดใหญ่ร้อน ๆ!', 'หอมเจียวเยอะ ๆ นะ', 'ข้าวเหนียวร้อนมาแล้ว'], {
      view: 'front',
      z: 1,
      react: (s, x, y) => {
        for (let i = 0; i < 8; i++) s.particles.add({ kind: 'dot', x: x + rand(-8, 8), y: y - 20, vx: rand(-14, 14), vy: rand(-30, -14), g: 80, max: 0.6, color: pick(['#e0a050', '#c86a2a', '#fff3a6']) })
        sfx.scratch()
      },
    }),
    personGag(kalimah, 208, 452, ['ชาชักฟองนุ่ม ๆ ค่ะ', 'ดูชาชักยาว ๆ นะคะ!', 'โรตีมะตะบะร้อน ๆ'], {
      view: 'front',
      z: 1,
      over: (g, p) => {
        // Teh tarik pull: tea arcing between two cups.
        const up = p.react > 0 ? 14 : 8 + Math.round(Math.sin(p.t * 2) * 2)
        g.rect(p.x + 5, p.y - 16 - up, 3, 3, '#bdb2ae')
        g.rect(p.x + 5, p.y - 10, 3, 3, '#bdb2ae')
        g.vline(p.x + 6, p.y - 13 - up, p.y - 11, '#d8a060')
      },
    }),
    personGag(shopper, 170, 520, ['ถุงเต็มมืออีกแล้ว!', 'ช็อกโกแลตข้ามแดนถูกมาก', 'เม็ดมะม่วงหิมพานต์สามกิโล!'], {
      walk: { x0: 140, x1: 190, speed: 9 },
      over: (g, p) => {
        g.rect(p.x - 9, p.y - 12, 4, 6, '#e8514a')
        g.rect(p.x + 5, p.y - 12, 4, 6, '#ffd23f')
      },
    }),
    tradePairGag(80, 520, { hair: 'hair_bob', top: 'top_baba' }, { hair: 'hair_short', top: 'top_polo' }, ['แลกพวงกุญแจไก่ทอดกับเข็มกลัดนาคไหม', 'ดีล! Terima kasih 🤝', 'สแตมป์กิมหยงหายากนะ']),
  ]
}

export function kimyongMap(): MapDef {
  const bldg = kimYongBuilding()
  const bldgN = kimYongBuilding(true)
  const shrine = chineseShrine()
  const shrineN = chineseShrine(true)
  const board = noticeBoard('ky', '#b8343f')
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const dried = booth({ key: 'ky_dried', w: 56, roof: '#3d63b5', wall: '#f0e8dc', back: driedGoods('mix'), counter: jarGoods(['#e0bb8a', '#c9a06a', '#8a4a2a']), skirt: '#e8514a', sign: '#b8343f' })
  const chicken = booth({ key: 'ky_chicken', w: 56, roof: '#ffd23f', roof2: '#e8514a', wall: '#fff1d6', back: hangingChickens(), counter: chickenGoods(), skirt: '#e8514a', sign: '#b8343f', valance: ['#e8514a', '#fffaf0'] })
  const dates = tarpStall({ key: 'ky_dates', w: 56, tarp: '#43905a', tarp2: '#ffd54f', goods: datesGoods(), ground: datesGoods() })
  const nuts = booth({ key: 'ky_nuts', w: 52, roof: '#f58f35', wall: '#f0e0d0', back: sackGoods(), counter: sackGoods(), skirt: '#8a5a3a' })
  const snacks = booth({ key: 'ky_snacks', w: 56, roof: '#c8a0ff', wall: '#f4ecff', back: toyGoods(), counter: jarGoods(['#6a3020', '#e8514a', '#ffd23f']), skirt: '#6a4fb0', sign: '#6a4fb0' })
  const squid = booth({ key: 'ky_squid', w: 56, roof: '#5a8de0', wall: '#f0e8dc', back: driedGoods('squid'), counter: driedGoods('fish'), skirt: '#3d63b5' })
  const spices = tarpStall({ key: 'ky_spice', w: 50, tarp: '#e8514a', tarp2: '#fffaf0', goods: sackGoods(), ground: fruitGoods(['#b8343f', '#f5c840', '#6cc36a'], 2) })
  const roti = foodCart('ky_roti', { body: '#3d63b5', parasol: ['#43905a', '#fffaf0'], goods: rotiGoods() })
  const LAMPS: [number, number][] = [
    [128, 270],
    [192, 270],
    [128, 600],
    [192, 600],
  ]
  const props: PlacedProp[] = [
    { sprite: bldg, night: bldgN, x: BLDG.x, y: BLDG.y },
    { sprite: dried, x: 40, y: R1 },
    { sprite: chicken, x: 104, y: R1 },
    { sprite: dates, x: 216, y: R1 },
    { sprite: nuts, x: 282, y: R1 },
    { sprite: snacks, x: 40, y: R2 },
    { sprite: squid, x: 104, y: R2 },
    { sprite: roti, x: 208, y: R2 },
    { sprite: spices, x: 280, y: R2 },
    { sprite: shrine, night: shrineN, x: SHRINE.x, y: SHRINE.y },
    { sprite: F.urnSprite(), x: SHRINE.x, y: SHRINE.y + 24, shadow: [10, 2] },
    { sprite: eatTable('#fffaf0', '#e8514a'), x: 46, y: 500 },
    { sprite: eatTable('#fffaf0', '#3d63b5'), x: 104, y: 504 },
    { sprite: board, x: 100, y: 590, shadow: [12, 3] },
    { sprite: crates(3, '#e8514a', 2), x: 230, y: 506 },
    { sprite: crates(2, '#5a8de0', 6), x: 14, y: 590 },
    { sprite: G.coconutPalm(0), x: 300, y: 250 },
    // Lower row: fruit, durian, batik sarongs, toys.
    { sprite: tarpStall({ key: 'ky_fruit', w: 50, tarp: '#f58f35', tarp2: '#fffaf0', goods: fruitGoods(['#ffd23f', '#6cc36a', '#e8514a'], 2) }), x: 40, y: 672 },
    { sprite: tarpStall({ key: 'ky_durian', w: 50, tarp: '#43905a', goods: fruitGoods(['#9ab050', '#b8c060', '#86a040'], 3) }), x: 100, y: 674 },
    { sprite: booth({ key: 'ky_batik', w: 52, roof: '#6a4fb0', wall: '#f4ecff', back: clothesGoods(['#b8343f', '#3d63b5', '#e9a53a', '#43905a'], 14), counter: silkGoods(), skirt: '#6a4fb0' }), x: 222, y: 672 },
    { sprite: tarpStall({ key: 'ky_toys', w: 50, tarp: '#5a8de0', tarp2: '#ffd23f', goods: toyGoods() }), x: 282, y: 674 },
    { sprite: tukTuk(), x: 60, y: 770 },
    { sprite: tukTuk(), x: 262, y: 772 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const row = (x: number, y: number, w = 56) => ({ x: x - w / 2, y: y - 22, w, h: 23 })
  return {
    id: ID,
    place: ID,
    area: 'wat',
    w: W,
    h: H,
    skyH: 92,
    ground: '#d4ccc4',
    camBias: 0.58,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 238 },
      row(40, R1),
      row(104, R1),
      { x: 188, y: R1 - 20, w: 56, h: 21 },
      row(282, R1, 52),
      row(40, R2),
      row(104, R2),
      { x: 189, y: R2 - 12, w: 38, h: 13 },
      { x: 255, y: R2 - 20, w: 50, h: 21 },
      { x: SHRINE.x - 34, y: SHRINE.y - 40, w: 68, h: 41 },
      { x: SHRINE.x - 10, y: SHRINE.y + 16, w: 20, h: 9 },
      { x: 31, y: 494, w: 30, h: 7 },
      { x: 89, y: 498, w: 30, h: 7 },
      { x: 86, y: 580, w: 28, h: 11 },
      { x: 223, y: 494, w: 14, h: 13 },
      { x: 7, y: 580, w: 14, h: 11 },
      { x: 296, y: 244, w: 8, h: 6 },
      { x: 15, y: 662, w: 50, h: 11 },
      { x: 75, y: 664, w: 50, h: 11 },
      { x: 196, y: 650, w: 52, h: 23 },
      { x: 257, y: 664, w: 50, h: 11 },
      { x: 0, y: SH_Y - 50, w: 128, h: 50 },
      { x: 192, y: SH_Y - 50, w: 128, h: 50 },
      { x: 44, y: 760, w: 32, h: 11 },
      { x: 246, y: 762, w: 32, h: 11 },
      { x: 0, y: 782, w: W, h: H - 782 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      hs('shop:hub_kimyong_chicken', 'ไก่ทอดหาดใหญ่เจ๊ยะ', 'ไก่ทอดโรยหอมเจียว ข้าวเหนียวร้อน', 'chicken', { x: 78, y: R1 - 48, w: 52, h: 48 }, { x: 104, y: R1 + 10 }, { marker: { x: 104, y: R1 - 50 } }),
      hs('shop:hub_kimyong_dates', 'อินทผลัมบังดีน', 'อินทผลัมเม็ดโต · เม็ดมะม่วงคั่ว', 'fruit', { x: 190, y: R1 - 44, w: 52, h: 44 }, { x: 206, y: R1 + 10 }, { marker: { x: 216, y: R1 - 46 } }),
      hs('shop:hub_kimyong_dried', 'ของแห้งกิมหยงเฮียหลี', 'หมึกแห้ง กุ้งแห้ง เม็ดมะม่วง', 'shop', { x: 14, y: R1 - 48, w: 52, h: 48 }, { x: 56, y: R1 + 10 }, { marker: { x: 40, y: R1 - 50 } }),
      hs('shop:hub_kimyong_roti', 'โรตีชาชักกะลีมะห์', 'ชาชัก · โรตีมะตะบะ', 'tea', { x: 190, y: R2 - 40, w: 36, h: 40 }, { x: 208, y: R2 + 10 }, { marker: { x: 208, y: R2 - 42 } }),
      hs('incense', 'ศาลเจ้าข้างตลาด', 'จุดธูปขอให้ค้าขายรุ่งเรือง', 'incense', { x: SHRINE.x - 24, y: SHRINE.y - 56, w: 48, h: 60 }, { x: SHRINE.x, y: SHRINE.y + 34 }, { marker: { x: SHRINE.x, y: SHRINE.y - 60 } }),
      hs('npc:ky_din', 'บังดีน', 'พ่อค้าอินทผลัม', 'friends', { x: 218, y: 320, w: 16, h: 32 }, { x: 236, y: 360 }, { marker: { x: 226, y: 308 }, near: 14 }),
      hs('npc:ky_siew', 'อาม่าซิ้ว', 'เจ้าของแผงของแห้งรุ่นแรก', 'friends', { x: 28, y: 322, w: 16, h: 32 }, { x: 36, y: 364 }, { marker: { x: 36, y: 310 }, near: 14 }),
      hs('npc:ky_ali', 'อาลี', 'นักช้อปข้ามแดนจากปีนัง', 'friends', { x: 188, y: 236, w: 16, h: 32 }, { x: 196, y: 278 }, { marker: { x: 196, y: 224 }, near: 14 }),
      hs(`board:${ID}`, 'บอร์ดข่าวตลาดกิมหยง', 'กิจกรรมวันนี้ · ร้านเด่น · ใครตามหาอะไร', 'scroll', { x: 84, y: 556, w: 32, h: 34 }, { x: 100, y: 602 }, { marker: { x: 100, y: 554 } }),
      hs('gate', 'ทางออกตลาดกิมหยง', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: 136, y: 740, w: 48, h: 40 }, { x: CX, y: 770 }, { face: 'down', marker: { x: CX, y: 738 }, near: 12 }),
    ],
    spawn: { x: CX, y: 756, face: 'up' },
    entries: {},
    pickupSpots: [
      { x: 20, y: 260 },
      { x: 290, y: 280 },
      { x: 60, y: 390 },
      { x: 250, y: 400 },
      { x: 150, y: 560 },
      { x: 40, y: 640 },
      { x: 290, y: 640 },
      { x: 150, y: 700 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      ...hooksAt(bldg, 'lamp', BLDG.x, BLDG.y).map((p) => ({ x: p.x, y: p.y, r: 30, color: '#ffcf7a' })),
      ...hooksAt(shrine, 'lanterns', SHRINE.x, SHRINE.y).map((p) => ({ x: p.x, y: p.y, r: 14, color: '#ff6a4a' })),
      { x: SHRINE.x, y: SHRINE.y - 20, r: 26, color: '#ffb35a' },
      { x: 104, y: R1 - 24, r: 26, color: '#ffe7a8' },
      { x: 216, y: R1 - 24, r: 24, color: '#ffe7a8' },
    ],
    remoteChat: hubChat(ID),
    life(s) {
      return [
        new HubArrival(s),
        new Lanterns(
          s,
          [272, 384, 494].map((y) => ({ x0: 10, y0: y, x1: 310, y1: y + 2, n: 14, sag: 8, colors: ['#e8514a', '#e8514a', '#ffd23f'] })),
        ),
        new Smoke(s, [{ x: SHRINE.x, y: SHRINE.y + 10 }], 7),
        new Gags(s, gags()),
        new OrangeCats(s, [
          { x: 150, y: 250, pose: 'sleep' },
          { x: 300, y: 600, pose: 'loaf' },
        ]),
        new Hawkers(s, [
          { x: 40, y: R1 - 30, lines: ['หมึกแห้งตัวโต ๆ', 'กุ้งแห้งสงขลาแท้', 'ชิมก่อนได้นะ'] },
          { x: 104, y: R1 - 30, lines: ['ไก่ทอดร้อน ๆ!', 'หอมเจียวเยอะ ๆ', 'หรอยจังฮู้!'] },
          { x: 282, y: R1 - 30, lines: ['เม็ดมะม่วงคั่วใหม่!', 'ถั่วทุกชนิดจ้า'] },
          { x: 40, y: R2 - 30, lines: ['ช็อกโกแลตข้ามแดน!', 'ขนมมาเลย์ถูกมาก'] },
          { x: 104, y: R2 - 30, lines: ['ปลาเค็มจ้า', 'หมึกหวานจ้า'] },
          { x: 280, y: R2 - 30, lines: ['เครื่องเทศครบ!', 'พริกแห้งหอม ๆ'] },
        ]),
        new CloudShadows(s, 2),
        new SunRays(s),
        new Traffic(s, [
          { y: 812, dir: 1 },
          { y: 856, dir: -1 },
        ]),
        new TapZones([
          {
            rect: { x: 40, y: 110, w: 240, h: 90 },
            fn: (x) => {
              s.say(pick(['ตลาดกิมหยง ตลาดเก่าคู่หาดใหญ่', 'ชั้นบนมีของแห้งอีกเพียบ', 'ขึ้นไปดูชั้นสองก่อนไหม']), x, 112, 2.2)
              sfx.tap()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      // Frying smoke from the chicken stall and the roti griddle.
      if (Math.random() < dt * 3) s.particles.add({ kind: 'smoke', x: 104 + rand(-10, 10), y: R1 - 20, vx: rand(-3, 3), vy: rand(-12, -6), max: 1.2, color: '#f6ecd8', size: 2 })
      if (Math.random() < dt * 1.5) s.particles.add({ kind: 'smoke', x: 204 + rand(-4, 4), y: R2 - 22, vx: rand(-2, 2), vy: rand(-10, -5), max: 1, color: '#fffaf0', size: 1 })
    },
    overlay(g) {
      wires(g, 0, 250, W, 254, 2)
    },
    wander: [
      { x: 20, y: 250, w: 280, h: 40 },
      { x: 136, y: 290, w: 48, h: 420 },
      { x: 20, y: 350, w: 260, h: 44 },
      { x: 20, y: 460, w: 200, h: 24 },
      { x: 140, y: 520, w: 80, h: 110 },
      { x: 20, y: 610, w: 280, h: 50 },
    ],
    pois: [
      { x: 40, y: R1 + 10, face: 'up' },
      { x: 104, y: R1 + 10, face: 'up' },
      { x: 216, y: R1 + 10, face: 'up' },
      { x: 282, y: R1 + 10, face: 'up' },
      { x: 40, y: R2 + 10, face: 'up' },
      { x: 104, y: R2 + 10, face: 'up' },
      { x: 208, y: R2 + 10, face: 'up' },
      { x: 280, y: R2 + 10, face: 'up' },
      { x: SHRINE.x, y: SHRINE.y + 36, face: 'up' },
      { x: 120, y: 252, face: 'up' },
      { x: 200, y: 252, face: 'up' },
    ],
    cats: [],
    vendors: [
      { x: 30, y: R1 - 10 },
      { x: 270, y: R1 - 10 },
      { x: 30, y: R2 - 10 },
      { x: 104, y: R2 - 10 },
      { x: 284, y: R2 - 10 },
    ],
    dogs: [],
    visitors: 12,
  }
}
