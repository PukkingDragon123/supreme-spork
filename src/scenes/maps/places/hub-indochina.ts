// ตลาดอินโดจีน มุกดาหาร (Indochina Market, Mukdahan) – hub market on the
// Mekong. The riverside promenade with a green naga balustrade looks across
// to Savannakhet and the Friendship Bridge; the long covered market sells
// silk, ceramics and wind-up toys; the food court has naem nueang, Lao
// coffee and smoking mookata tables; the Mukdahan Tower stands over it all.

import type { MapDef, PlacedProp, WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { tukTuk } from '../../../art/props'
import { NAGA_GREEN, nagaHeadsSprite, serpent } from '../../../art/places/northisan'
import { CloudShadows, Glints, SunRays, TapZones, Traffic, type Life } from '../../life'
import { Gags, type Gag } from '../../gags'
import { booth, clothesGoods, concrete, foodCart, jarGoods, noticeBoard, potGoods, silkGoods, tiles, toyGoods, noodleGoods, stool, hooksAt } from '../../../art/places/hub-kit'
import { marketHall, type Bay } from '../../../art/places/hub-chatuchak'
import { drawBoat } from '../../../art/places/hub-damnoen'
import { farBank, loomSprite, mekong, mookataTable, mukdahanTower } from '../../../art/places/hub-indochina'
import { road } from '../common'
import { HubArrival, Hawkers, OrangeCats, giverGag, hs, hubChat, look, personGag, tradePairGag } from './hub-common'

const ID = 'hub_indochina'
const W = 320
const H = 960
const RIVER = { top: 84, bot: 206 }
const PROM = 236
const HALL_Y = 356
const TOWER = { x: 262, y: 700 }
const bayX = (cx: number, i: number) => cx - 56 + i * 28

const HALL_L: Bay[] = [
  { back: silkGoods(), counter: silkGoods(), sign: '#b8343f', wall: '#f4e8dc' },
  { back: clothesGoods(['#b8343f', '#3d63b5', '#ffd54f', '#6a4fb0'], 21), counter: silkGoods() },
  { back: potGoods(), counter: potGoods(), sign: '#3d63b5' },
  { back: clothesGoods(['#43905a', '#fffaf0', '#e8514a'], 22), counter: jarGoods(['#8a4a2a', '#e0bb8a']) },
  { back: jarGoods(['#e8514a', '#ffd23f']), counter: toyGoods() },
]
const HALL_R: Bay[] = [
  { back: toyGoods(), counter: toyGoods(), sign: '#f58f35' },
  { back: toyGoods(), counter: jarGoods(['#ff9fc0', '#9fd0ff', '#ffe27a']), sign: '#e8514a' },
  { back: potGoods(), counter: potGoods() },
  { back: clothesGoods(['#3a3040', '#9fd0ff', '#fffaf0'], 23), counter: toyGoods() },
  { back: jarGoods(['#6a3020', '#c9a06a']), counter: jarGoods(['#fff6c8', '#8a4a2a']), sign: '#6a3020' },
]

function bake(g: Surface, night: boolean) {
  farBank(g, 30, RIVER.top, W, night)
  mekong(g, RIVER.top, RIVER.bot, W, night)
  // Riverbank wall and the promenade.
  g.rect(0, RIVER.bot, W, 8, night ? '#6a6070' : '#b8b0a8')
  g.hline(0, W - 1, RIVER.bot, night ? '#8a8090' : '#d8d0c8')
  tiles(g, 0, RIVER.bot + 8, W, PROM - RIVER.bot + 22, 8, night ? '#a8a0a0' : '#e8e0d4', night ? '#a09898' : '#dcd4c8', 5)
  // Green naga along the balustrade.
  const pts: [number, number][] = []
  for (let x = 30; x <= W; x += 8) pts.push([x, RIVER.bot + 12 + Math.sin(x * 0.09) * 1.5])
  serpent(g, pts, 5, NAGA_GREEN, 3)
  concrete(g, 0, PROM + 30, W, 540, 21, night ? '#b0a8a0' : '#d8d0c4', 0)
  // Food court floor.
  tiles(g, 150, 420, 170, 130, 10, '#e0d0b8', '#d4c4ac', 11)
  // Tower plaza.
  g.ellipse(TOWER.x, TOWER.y - 4, 50, 16, night ? '#9a9090' : '#e8e0d4')
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    g.px(Math.round(TOWER.x + Math.cos(a) * 40), Math.round(TOWER.y - 4 + Math.sin(a) * 12), ['#ff9fc0', '#ffd23f', '#e8514a'][k % 3])
  }
  g.rect(0, 812, W, 3, '#bdb2ae')
  road(g, 0, 815, W, H - 815)
}

/** Cargo and ferry boats on the Mekong. */
class RiverBoats implements Life {
  private boats: { x: number; y: number; dir: 1 | -1; v: number; kind: 'longtail' | 'fruit' | 'empty'; seed: number }[] = []
  constructor(private s: WorldScene) {
    for (let i = 0; i < 3; i++) this.boats.push({ x: rand(0, W), y: [128, 160, 188][i], dir: i % 2 ? -1 : 1, v: rand(6, 14), kind: (['longtail', 'fruit', 'empty'] as const)[i], seed: i * 7 })
  }
  update(dt: number) {
    for (const b of this.boats) {
      b.x += b.v * b.dir * dt
      if (b.x > W + 60) b.x = -60
      if (b.x < -60) b.x = W + 60
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const b of this.boats) if (this.s.onScreen(b.x, b.y, 40)) add(b.y, () => drawBoat(this.s.gfx, b.x, b.y, t, b.kind, b.dir, { seed: b.seed, tourists: b.kind === 'longtail' ? [look({}), look({ head: 'head_sunhat' })] : undefined }))
  }
}

function gags(): Gag[] {
  const khampong = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_sabai', bottom: 'bot_sin_mudmee' })
  const nguyen = look({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_tee_white', bottom: 'bot_khaki', head: 'head_ngob_pomelo' })
  const champa = look({ gender: 'f', hair: 'hair_ponytail', hairColor: 0, top: 'top_polo', bottom: 'bot_sin_mudmee', head: 'head_sunhat', neck: 'neck_lanyard' })
  const coffee = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_vendor', head: 'head_vendorband' })
  const sunset = look({ gender: 'm', hair: 'hair_curtain', hairColor: 0, top: 'top_hoodie', bottom: 'bot_jeans' })
  const sunset2 = look({ gender: 'f', hair: 'hair_long', hairColor: 1, top: 'top_cardigan', bottom: 'bot_skirt' })
  return [
    giverGag(khampong, 56, 606, ['ผ้าผืนนี้แม่ทอสามเดือนเด้อ', 'ลายนาคเกี้ยว ลายดั้งเดิม', 'ลูกช่วยแม่หน่อยได้บ่'], {
      pose: 'sit',
      over: (g, p) => {
        const k = Math.floor(p.t * 3) % 2
        g.px(p.x + 7 + k * 2, p.y - 12, '#ffd54f')
      },
    }),
    giverGag(nguyen, 130, 446, ['แหนมเนืองต้องห่อแน่น ๆ', 'ผักเยอะ ๆ ดีต่อสุขภาพ', 'ช่วยลุงชิมสูตรใหม่หน่อย']),
    giverGag(champa, 196, 246, ['สะบายดี! ยินดีต้อนรับสู่ริมโขง', 'ฝั่งโน้นคือสะหวันนะเขต ประเทศลาว', 'หนูพาเที่ยวได้เด้อ']),
    personGag(coffee, 216, 460, ['กาแฟลาวข้น ๆ ค่ะ', 'ใส่นมข้นเยอะ ๆ ไหม', 'ดริปถุงผ้าแบบดั้งเดิม'], { view: 'front', z: 1 }),
    personGag(sunset, 90, 244, ['พระอาทิตย์ตกหลังฝั่งลาว สวยมาก', 'ลมโขงเย็นสบาย', 'ถ่ายรูปกับพญานาคหน่อย'], { view: 'back', extras: ['selfie'] }),
    personGag(sunset2, 110, 246, ['โขงกว้างมากเลย', 'เรือข้ามฟากไปลาวลำนั้น', 'หมูกระทะริมโขงต่อไหม'], { view: 'back' }),
    tradePairGag(60, 520, { hair: 'hair_bob', top: 'top_sabai' }, { hair: 'hair_short', top: 'top_polo' }, ['แลกผ้าไหมผืนจิ๋วกับหอแก้วไหม', 'ดีลค่ะ 🤝', 'เข็มกลัดพญานาคเหลือไหม']),
  ]
}

export function indochinaMap(): MapDef {
  const tower = mukdahanTower()
  const towerN = mukdahanTower(true)
  const hallL = marketHall('icL', HALL_L, { roof: '#3d8a8a', number: '1' })
  const hallR = marketHall('icR', HALL_R, { roof: '#c8a040', number: '2' })
  const hallLn = marketHall('icL', HALL_L, { roof: '#3d8a8a', number: '1', night: true })
  const hallRn = marketHall('icR', HALL_R, { roof: '#c8a040', number: '2', night: true })
  const naem = booth({ key: 'ic_naem', w: 52, roof: '#e8514a', roof2: '#ffd54f', wall: '#fff1d6', back: jarGoods(['#6cc36a', '#e8514a', '#ffd23f']), counter: noodleGoods(), skirt: '#e8514a', sign: '#b8343f' })
  const khaojee = foodCart('ic_khaojee', { body: '#3d63b5', parasol: ['#e8514a', '#ffd23f'], goods: jarGoods(['#e0bb8a', '#c9a06a']) })
  const coffeeCart = foodCart('ic_coffee', { body: '#6e4a35', parasol: ['#43905a', '#fffaf0'], goods: jarGoods(['#6a3020', '#fff6c8']) })
  const board = noticeBoard('ic', '#3d8a8a')
  const naga = nagaHeadsSprite(NAGA_GREEN, 5, true, 'ic')
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [
    [40, 250],
    [120, 250],
    [220, 250],
    [300, 250],
    [140, 700],
  ]
  const MK = [
    { x: 194, y: 520, seed: 0 },
    { x: 246, y: 522, seed: 1 },
    { x: 298, y: 520, seed: 2 },
    { x: 220, y: 560, seed: 3 },
    { x: 280, y: 562, seed: 4 },
  ]
  const props: PlacedProp[] = [
    { sprite: naga, x: 16, y: RIVER.bot + 24 },
    { sprite: F.benchSprite(), x: 160, y: 262 },
    { sprite: F.benchSprite(), x: 260, y: 262 },
    { sprite: hallL, night: hallLn, x: 72, y: HALL_Y },
    { sprite: hallR, night: hallRn, x: 248, y: HALL_Y },
    { sprite: naem, x: 130, y: 432 },
    { sprite: khaojee, x: 60, y: 434 },
    { sprite: coffeeCart, x: 212, y: 440 },
    ...MK.map((m) => ({ sprite: mookataTable(m.seed), x: m.x, y: m.y })),
    { sprite: booth({ key: 'ic_mkt_tent', w: 60, roof: '#e8514a', roof2: '#fffaf0', wall: '#3a3040', back: jarGoods(['#e8a0a0', '#6cc36a']), counter: jarGoods(['#e8a0a0', '#fffaf0']), skirt: '#b8343f', sign: '#ffd23f' }), x: 284, y: 476 },
    { sprite: loomSprite(), x: 84, y: 612 },
    { sprite: booth({ key: 'ic_silk2', w: 52, roof: '#6a4fb0', wall: '#f4ecff', back: silkGoods(), counter: silkGoods(), skirt: '#6a4fb0' }), x: 40, y: 700 },
    { sprite: tower, night: towerN, x: TOWER.x, y: TOWER.y },
    { sprite: board, x: 160, y: 640, shadow: [12, 3] },
    { sprite: G.bodhiTree2(), x: 130, y: 776 },
    { sprite: tukTuk(), x: 40, y: 800 },
    { sprite: tukTuk(), x: 290, y: 800 },
    { sprite: stool('#3d63b5'), x: 110, y: 460 },
    { sprite: stool('#e8514a'), x: 150, y: 462 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: ID,
    place: ID,
    area: 'river',
    w: W,
    h: H,
    skyH: 40,
    ground: '#d8d0c4',
    camBias: 0.58,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: RIVER.bot + 16 },
      { x: 0, y: RIVER.bot + 12, w: 34, h: 16 },
      { x: 148, y: 258, w: 24, h: 5 },
      { x: 248, y: 258, w: 24, h: 5 },
      { x: 0, y: HALL_Y - 50, w: 144, h: 52 },
      { x: 176, y: HALL_Y - 50, w: 144, h: 52 },
      { x: 104, y: 410, w: 52, h: 23 },
      { x: 41, y: 424, w: 38, h: 11 },
      { x: 193, y: 430, w: 38, h: 11 },
      ...MK.map((m) => ({ x: m.x - 12, y: m.y - 12, w: 24, h: 8 })),
      { x: 254, y: 454, w: 60, h: 23 },
      { x: 64, y: 598, w: 40, h: 15 },
      { x: 14, y: 678, w: 52, h: 23 },
      { x: TOWER.x - 28, y: TOWER.y - 22, w: 56, h: 23 },
      { x: 146, y: 630, w: 28, h: 11 },
      { x: 124, y: 770, w: 14, h: 7 },
      { x: 24, y: 790, w: 32, h: 11 },
      { x: 274, y: 790, w: 32, h: 11 },
      { x: 104, y: 456, w: 12, h: 5 },
      { x: 144, y: 458, w: 12, h: 5 },
      { x: 0, y: 812, w: W, h: H - 812 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      hs('shop:hub_indochina_silk', 'ผ้าไหมแม่ใหญ่คำพอง', 'ผ้าไหมมัดหมี่ · กาแฟลาว', 'shirt', { x: bayX(72, 0) - 13, y: HALL_Y - 44, w: 26, h: 44 }, { x: bayX(72, 0), y: HALL_Y + 8 }, { marker: { x: bayX(72, 0), y: HALL_Y - 30 } }),
      hs('shop:hub_indochina_toys', 'ของเล่นจีนร้อยแปด', 'ของเล่นไขลาน · ข้าวจี่ · กาแฟลาว', 'gift', { x: bayX(248, 1) - 13, y: HALL_Y - 44, w: 26, h: 44 }, { x: bayX(248, 1), y: HALL_Y + 8 }, { marker: { x: bayX(248, 1), y: HALL_Y - 30 } }),
      hs('shop:hub_indochina_naem', 'แหนมเนืองลุงเหงียน', 'แหนมเนือง · ข้าวจี่ปาเต้', 'curry', { x: 106, y: 390, w: 48, h: 42 }, { x: 132, y: 444 }, { marker: { x: 130, y: 388 } }),
      hs('shop:hub_indochina_mookata', 'หมูกระทะริมโขงเจ๊นก', 'หมูกระทะ · ส้มตำ', 'curry', { x: 256, y: 432, w: 56, h: 44 }, { x: 284, y: 490 }, { marker: { x: 284, y: 430 } }),
      hs('npc:ic_khampong', 'แม่ใหญ่คำพอง', 'ช่างทอผ้าไหม', 'friends', { x: 48, y: 580, w: 16, h: 30 }, { x: 52, y: 622 }, { marker: { x: 56, y: 570 }, near: 14 }),
      hs('npc:ic_nguyen', 'ลุงเหงียน', 'เจ้าของร้านแหนมเนือง', 'friends', { x: 122, y: 416, w: 16, h: 32 }, { x: 130, y: 460 }, { marker: { x: 130, y: 404 }, near: 14 }),
      hs('npc:ic_champa', 'น้องจำปา', 'ไกด์ริมโขง', 'friends', { x: 188, y: 216, w: 16, h: 32 }, { x: 196, y: 258 }, { marker: { x: 196, y: 204 }, near: 14 }),
      hs(`board:${ID}`, 'บอร์ดข่าวตลาดอินโดจีน', 'กิจกรรมวันนี้ · ร้านเด่น · ใครตามหาอะไร', 'scroll', { x: 144, y: 606, w: 32, h: 34 }, { x: 160, y: 652 }, { marker: { x: 160, y: 604 } }),
      hs('gate', 'ทางออกตลาดอินโดจีน', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: 170, y: 776, w: 48, h: 36 }, { x: 194, y: 800 }, { face: 'down', marker: { x: 194, y: 774 }, near: 12 }),
    ],
    spawn: { x: 194, y: 790, face: 'up' },
    entries: {},
    pickupSpots: [
      { x: 60, y: 240 },
      { x: 280, y: 240 },
      { x: 150, y: 380 },
      { x: 30, y: 500 },
      { x: 170, y: 590 },
      { x: 100, y: 680 },
      { x: 200, y: 740 },
      { x: 300, y: 620 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: 72, y: HALL_Y - 24, r: 40, color: '#ffcf7a' },
      { x: 248, y: HALL_Y - 24, r: 40, color: '#ffcf7a' },
      ...MK.map((m) => ({ x: m.x, y: m.y - 14, r: 12, color: '#ff9a5a' })),
      ...hooksAt(tower, 'ball', TOWER.x, TOWER.y).map((p) => ({ x: p.x, y: p.y, r: 24, color: '#e8f4ff' })),
      ...hooksAt(tower, 'deck', TOWER.x, TOWER.y).map((p) => ({ x: p.x, y: p.y, r: 18, color: '#fff6c8' })),
    ],
    remoteChat: hubChat(ID),
    life(s) {
      return [
        new HubArrival(s),
        new RiverBoats(s),
        new Gags(s, gags()),
        new OrangeCats(s, [
          { x: 150, y: 256, pose: 'sleep' },
          { x: 230, y: 610, pose: 'loaf' },
        ]),
        new Hawkers(s, [
          ...HALL_L.map((_, i) => ({ x: bayX(72, i), y: HALL_Y - 30, lines: ['ผ้าไหมทอมือเด้อ', 'เลือกก่อนเด้อ', 'ราคาเป็นกันเอง', 'ของจากลาวแท้ ๆ'] })),
          ...HALL_R.map((_, i) => ({ x: bayX(248, i), y: HALL_Y - 30, lines: ['ของเล่นไขลานจ้า!', 'ถ้วยชามจากเวียดนาม', 'ถูก ๆ ร้อยแปด!'] })),
          { x: 284, y: 440, lines: ['เตาร้อนแล้วจ้า!', 'หมูสามชั้นจัดเต็ม!'] },
        ]),
        new Glints(s, hooksAt(tower, 'ball', TOWER.x, TOWER.y), 1.1),
        new CloudShadows(s, 2),
        new SunRays(s),
        new Traffic(s, [
          { y: 846, dir: 1 },
          { y: 900, dir: -1 },
        ]),
        new TapZones([
          {
            rect: { x: 0, y: RIVER.top, w: W, h: RIVER.bot - RIVER.top },
            fn: (x, y) => {
              s.say(pick(['แม่น้ำโขง กั้นไทยกับลาว', 'ฝั่งโน้นสะหวันนะเขต!', 'สะพานมิตรภาพแห่งที่สองอยู่ทางขวา', 'ลมโขงเย็นสบาย~']), x, y, 2.2)
              sfx.splash()
            },
          },
          {
            rect: { x: TOWER.x - 16, y: TOWER.y - 178, w: 32, h: 150 },
            fn: () => {
              s.say(pick(['หอแก้วมุกดาหาร สูง 65 เมตร!', 'ขึ้นไปบนสุดเห็นลาวชัดเลย', 'ลูกแก้วบนยอดวิบวับ']), TOWER.x, TOWER.y - 182, 2.4)
              s.particles.sparkles(TOWER.x, TOWER.y - 158, 10, '#e8f4ff', 12)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 5) {
        const m = pick(MK)
        if (s.onScreen(m.x, m.y, 10)) s.particles.add({ kind: 'smoke', x: m.x + rand(-2, 2), y: m.y - 18, vx: rand(-3, 3), vy: rand(-12, -6), max: 1.5, color: '#f0e8e8', size: 2 })
      }
    },
    wander: [
      { x: 40, y: 226, w: 260, h: 30 },
      { x: 150, y: 300, w: 20, h: 470 },
      { x: 20, y: 370, w: 280, h: 24 },
      { x: 20, y: 470, w: 150, h: 90 },
      { x: 100, y: 660, w: 100, h: 90 },
    ],
    pois: [
      ...[0, 1, 2, 3, 4].map((i) => ({ x: bayX(72, i), y: HALL_Y + 10, face: 'up' as const })),
      ...[0, 1, 2, 3, 4].map((i) => ({ x: bayX(248, i), y: HALL_Y + 10, face: 'up' as const })),
      { x: 60, y: 226, face: 'up' },
      { x: 240, y: 226, face: 'up' },
      { x: 130, y: 446, face: 'up' },
      { x: 212, y: 452, face: 'up' },
      { x: TOWER.x - 30, y: TOWER.y + 6, face: 'up' },
    ],
    cats: [],
    vendors: [
      { x: 16, y: HALL_Y - 8 },
      { x: 100, y: HALL_Y - 8 },
      { x: 220, y: HALL_Y - 8 },
      { x: 300, y: HALL_Y - 8 },
      { x: 300, y: 470 },
    ],
    dogs: ['mali'],
    visitors: 12,
  }
}
