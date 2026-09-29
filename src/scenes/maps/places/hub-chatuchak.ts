// ตลาดนัดจตุจักร (Chatuchak Weekend Market) – hub market. Long covered
// halls of tiny shop bays (vintage, plants, pants, toys), the pets zone, the
// blind-box queue at "ป๊อปบุญ", the clock tower plaza with coconut ice cream
// and hippo balloons, the food corner (mango sticky rice, the giant pan) and
// the entrance arch by the road, with the skytrain gliding past the park.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { tukTuk } from '../../../art/props'
import { chaYenSprite, mooPingSprite, winStandSprite } from '../../../art/modern'
import { bangkokPanorama } from '../../../art/places/bangkok-city'
import { drawSkytrain } from '../../../art/cinematic'
import { rainTree } from '../../../art/places/south'
import { road } from '../common'
import { CloudShadows, SunRays, TapZones, Traffic, Glints } from '../../life'
import { Gags, drawPerson, gagFx, type Gag } from '../../gags'
import {
  booth,
  boxGoods,
  clothesGoods,
  concrete,
  crates,
  drain,
  eatTable,
  fruitGoods,
  jarGoods,
  lanternGoods,
  menuBoard,
  noticeBoard,
  pantsGoods,
  plantGoods,
  plushGoods,
  potGoods,
  shade,
  stool,
  tiles,
  toyGoods,
  hooksAt,
  pennants,
} from '../../../art/places/hub-kit'
import { roofscape, sneakerMat, clockTower, coconutCart, drawClockHands, fishTanks, giantPan, infoBooth, jjGate, mangoStand, mannequin, marketHall, matchaGoods, petCages, vintageRack, viaduct, type Bay } from '../../../art/places/hub-chatuchak'
import { BlindBoxQueue, HippoBalloons, HubArrival, Hawkers, OrangeCats, giverGag, hs, hubChat, look, personGag, tradePairGag, hippoKidOverlay } from './hub-common'

const ID = 'hub_chatuchak'
const W = 320
const H = 1090
const CX = 160
const ROW_A = 212
const ROW_B = 330
const TOWER = { x: CX, y: 540 }
const ROW_C = 722
const ROW_D = 852
const GATE = { x: CX, y: 1012 }
const HALL_W = 144
const bayX = (cx: number, i: number) => cx - 56 + i * 28

const HALL_A_L: Bay[] = [
  { back: clothesGoods(['#3d63b5', '#b8343f', '#fffaf0', '#3a3040', '#c8a060'], 1), counter: toyGoods(), sign: '#e8514a' },
  { back: clothesGoods(['#2a4a8a', '#3d63b5', '#5a8de0'], 2), counter: fruitGoods(['#3a3040', '#6a6374'], 1) },
  { back: clothesGoods(['#ff9fc0', '#fffaf0', '#c8a0ff', '#ffe27a'], 3), counter: boxGoods() },
  { back: clothesGoods(['#3a3040', '#fffaf0', '#6a8a5a'], 4), counter: jarGoods(['#e8514a', '#ffd23f']) },
  { back: lanternGoods(), counter: potGoods() },
]
const HALL_A_R: Bay[] = [
  { back: plantGoods(), counter: plantGoods(), wall: '#dfe8d8', sign: '#43905a' },
  { back: plantGoods(), counter: plantGoods(), wall: '#dfe8d8', sign: '#6cc36a' },
  { back: potGoods(), counter: potGoods(), sign: '#c8704c' },
  { back: lanternGoods(), counter: jarGoods(['#ff9fc0', '#9fd0ff', '#fffaf0']), sign: '#e8709e' },
  { back: clothesGoods(['#e0bb8a', '#c28e5c', '#fffaf0'], 5), counter: toyGoods(), sign: '#f58f35' },
]
const HALL_C_L: Bay[] = [
  { back: clothesGoods(['#6a4fb0', '#3d63b5', '#e8514a', '#43905a'], 6), counter: pantsGoods(), sign: '#6a4fb0' },
  { back: plushGoods('hippo'), counter: plushGoods('hippo'), wall: '#f0dcd0', sign: '#ff9fc0' },
  { back: clothesGoods(['#fffaf0', '#ffe27a', '#9fd0ff'], 7), counter: fruitGoods(['#e0c080', '#c9a06a'], 2) },
  { back: jarGoods(['#ffd23f', '#6cc36a', '#ff9fc0']), counter: jarGoods(['#fffaf0', '#c8a0ff']) },
  { back: clothesGoods(['#3a3040', '#e8514a', '#fffaf0', '#43905a'], 8), counter: toyGoods() },
]
const HALL_D_L: Bay[] = [
  { back: boxGoods(), counter: toyGoods(), sign: '#c8a0ff' },
  { back: potGoods(), counter: potGoods() },
  { back: lanternGoods(), counter: lanternGoods() },
  { back: clothesGoods(['#c28e5c', '#6e4a35', '#e0bb8a'], 9), counter: jarGoods(['#8a5a3a', '#c28e5c']) },
  { back: toyGoods(), counter: boxGoods() },
]
const HALL_D_R: Bay[] = [
  { back: jarGoods(['#8a4a2a', '#e0bb8a', '#c9a06a']), counter: fruitGoods(['#8a4a2a', '#c28e5c'], 1), sign: '#b8742a' },
  { back: jarGoods(['#e8514a', '#f58f35', '#ffd23f']), counter: jarGoods(['#6cc36a', '#ffd23f']) },
  { back: matchaGoods(), counter: matchaGoods(), sign: '#43905a' },
  { back: clothesGoods(['#fffaf0', '#ff9fc0', '#9fd0ff'], 10), counter: potGoods() },
  { back: lanternGoods(), counter: jarGoods(['#fff6c8', '#ffcf5a']) },
]

function bake(g: Surface, night: boolean) {
  bangkokPanorama(g, 22, 90, W, night)
  viaduct(g, 58, W, night)
  G.treeLine(g, 84, W, G.LEAVES.far, 41)
  G.treeLine(g, 96, W, G.LEAVES.deep, 43)
  concrete(g, 0, 104, W, 916, 3, night ? '#b8b0b0' : '#d2c9c0', 26)
  // The endless sections behind: rows of market roofs, a covered passage in the middle.
  roofscape(g, 100, 148, W, night, [140, 180])
  g.rect(140, 100, 40, 48, night ? '#3a3040' : '#4a3a40')
  for (let x = 142; x < 178; x += 6) g.rect(x, 112, 4, 3, ['#ffd23f', '#e8514a', '#9fd0ff', '#ff9fc0', '#6cc36a', '#fffaf0'][((x - 142) / 6) % 6])
  g.hline(140, 179, 100, '#8a8480')
  sneakerMat(g, 18, 778, 46, 20)
  sneakerMat(g, 76, 782, 36, 16)
  // Covered lanes are a little darker (roof shade).
  shade(g, 0, ROW_A, W, 50, 0.08)
  shade(g, 0, ROW_B, W, 50, 0.08)
  shade(g, 0, ROW_C, W, 66, 0.06)
  shade(g, 0, ROW_D, W, 48, 0.08)
  // Main walkway (red paving) from the gate to the top halls.
  tiles(g, 144, 148, 32, 872, 8, '#c8705a', '#b8604e', 5)
  // Clock tower plaza: concentric paving rings.
  for (let r = 96; r > 0; r -= 8) {
    g.ellipse(TOWER.x, TOWER.y - 14, r, r * 0.72, r % 16 === 0 ? '#e8d8c0' : '#dccab0')
  }
  g.ellipse(TOWER.x, TOWER.y - 14, 34, 24, '#c8b498')
  g.ellipse(TOWER.x, TOWER.y - 14, 30, 21, '#e8d8c0')
  // Flower ring round the tower.
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2
    const x = Math.round(TOWER.x + Math.cos(a) * 27)
    const y = Math.round(TOWER.y - 14 + Math.sin(a) * 19)
    g.px(x, y, ['#ff9fc0', '#ffd23f', '#e8514a', '#fffaf0'][k % 4])
    g.px(x + 1, y, '#5ea653')
  }
  // Painted lane numbers (ซอย) and drains.
  for (const y of [ROW_A + 44, ROW_B + 44, ROW_C + 60, ROW_D + 42]) {
    drain(g, 20, y)
    drain(g, 290, y)
  }
  drain(g, 60, 940, true)
  drain(g, 262, 950, true)
  // Entrance forecourt and kerb.
  tiles(g, 0, 984, W, 36, 6, '#d8d0c8', '#c8c0b8', 9)
  g.rect(0, 1018, W, 3, '#bdb2ae')
  road(g, 0, 1021, W, 69)
  if (night) for (let x = 12; x < W; x += 40) g.px(x, 1016, '#ffe7a8')
}

function gags(): Gag[] {
  const win = look({ gender: 'f', hair: 'hair_curly', hairColor: 2, top: 'top_retro_floral', bottom: 'bot_jeans', head: 'head_heartshades' })
  const som = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', bottom: 'bot_elephant', head: 'head_catears' })
  const guide = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_polo', bottom: 'bot_khaki', neck: 'neck_lanyard', head: 'head_sunhat' })
  const jo = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_chef', bottom: 'bot_chef', head: 'head_chefhat' })
  const pants = look({ gender: 'm', hair: 'hair_twoblock', hairColor: 0, top: 'top_tee_black', bottom: 'bot_elephant_purple' })
  const mango = look({ gender: 'f', hair: 'hair_ponytail', hairColor: 0, top: 'top_vendor', bottom: 'bot_black', head: 'head_vendorband' })
  const coco = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_hawaii', bottom: 'bot_denim_shorts' })
  const kid = look({ gender: 'f', hair: 'hair_twin', hairColor: 0, top: 'top_tee_boon', bottom: 'bot_pinkskirt' })
  const dab = look({ gender: 'm', hair: 'hair_curtain', hairColor: 1, top: 'top_hoodie', bottom: 'bot_joggers', head: 'head_heartshades' })
  const lost = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_hawaii_elephant', bottom: 'bot_cargo', head: 'head_sunhat' })
  const bags = look({ gender: 'f', hair: 'hair_long', hairColor: 1, top: 'top_tank', bottom: 'bot_elephant', hand: 'hand_tote' })
  const balloonMan = look({ gender: 'm', hair: 'hair_buzz', hairColor: 0, top: 'top_tee_hiw', bottom: 'bot_fisherman' })
  return [
    giverGag(win, 64, 238, ['ปี 2026 คือ 2016 ใหม่นะคะ!', 'เสื้อตัวนี้เจ๊ใส่ไปงานพรอมปี 2016', 'ลูกค้าจ๋า ช่วยเจ๊หน่อยได้ไหม~']),
    giverGag(som, 252, 356, ['เจ้าส้มโอ! แกไปไหนอีกแล้ว!', 'แมวส้มทุกตัวสมองก้อนเดียวกันนะรู้ไหม', 'หนูช่วยป้าตามแมวหน่อยได้ไหม']),
    giverGag(guide, 198, 566, ['หลงทางใช่ไหมครับ ทุกคนหลงที่นี่ 555', 'มองหาหอนาฬิกาไว้ ไม่หลงแน่นอน', 'จตุจักรมีกว่าหมื่นห้าพันร้านนะ!'], {
      over: (g, p) => {
        g.vline(p.x + 6, p.y - 34, p.y - 14, '#8a8480')
        g.rect(p.x + 7, p.y - 34, 7, 5, '#ffd23f')
        g.px(p.x + 9, p.y - 32, '#e8514a')
      },
    }),
    personGag(jo, 262, 740, ['ข้าวผัดกระทะยักษ์ครับ!', 'กระทะนี้เลี้ยงคนได้ทั้งซอย!', 'โชว์ผัดรอบต่อไปอีกห้านาที!'], {
      view: 'back',
      z: 1,
      over: (g, p) => {
        const a = Math.sin(p.t * (p.react > 0 ? 14 : 5)) * 3
        g.line(p.x + 5, p.y - 14, Math.round(p.x + 9 + a), p.y - 22, '#8a8480')
        g.rect(Math.round(p.x + 8 + a), p.y - 24, 4, 2, '#bdb2ae')
      },
      react: (s, x, y) => {
        for (let i = 0; i < 8; i++) s.particles.add({ kind: 'dot', x: x + rand(-10, 10), y: y - 28, vx: rand(-20, 20), vy: rand(-40, -20), g: 90, max: 0.7, color: pick(['#f5c840', '#ff7a5a', '#6cc36a']) })
        sfx.scratch()
      },
    }),
    personGag(pants, 16, 740, ['กางเกงช้างตัวละร้อย!', 'สามตัวสองร้อยห้าสิบ ใส่สบายสุด ๆ', 'ฝรั่งใส่ คนไทยก็ใส่!'], { view: 'front' }),
    personGag(mango, 200, 740, ['ข้าวเหนียวมะม่วงที่ไปดังถึงเวทีคอนเสิร์ตเมืองนอก!', 'รุ่นใหม่ โรยพิสตาชิโอ ของมันต้องมี', 'มะม่วงน้ำดอกไม้หวานฉ่ำจ้า'], { view: 'front', z: 1 }),
    personGag(coco, 108, 486, ['ไอติมมะพร้าวลูกละหกสิบ... เอ้ย ยี่สิบห้าคอยน์!', 'ร้อนนักก็กินไอติม', 'ท็อปปิ้งข้าวเหนียวถั่วลิสงเพิ่มได้'], {
      over: (g, p) => {
        g.circle(p.x + 6, p.y - 12, 2.5, '#8a5a3a')
        g.circle(p.x + 6, p.y - 14, 2, '#fffaf0')
      },
    }),
    personGag(kid, 220, 612, ['หนูได้ตุ๊กตาหมูดึ๋งแล้ว!', 'หมูดึ๋งกัดหนูเบา ๆ ด้วย 555', 'แม่ขาซื้ออีกตัวได้ไหมคะ'], { over: hippoKidOverlay }),
    {
      x: 116,
      y: 612,
      lines: ['ปี 2026 คือ 2016 ใหม่!', 'ใครยังจำท่านี้ได้บ้าง!', 'เสื้อฮู้ดตัวนี้ซื้อปี 2016 ยังใส่ได้!'],
      draw: (g, p) => {
        drawPerson(g, dab, p, 'front', [], p.react > 0 ? 'offer' : undefined)
        if (p.react > 0) {
          // The dab.
          g.line(p.x - 8, p.y - 22, p.x - 2, p.y - 18, '#f0bd90')
          g.line(p.x + 2, p.y - 18, p.x + 8, p.y - 24, '#f0bd90')
        }
      },
      react: (s, x, y) => gagFx.flash(s, x, y),
    },
    personGag(lost, 40, 600, ['Where is... clock tower?', 'แผนที่นี้อ่านยังไงครับ', 'เดินมาสามรอบแล้วเจอร้านเดิม!'], { extras: ['phone'] }),
    personGag(bags, 188, 890, ['ถุงเต็มมือแล้ว ยังไม่หมดโครงการเลย', 'กางเกงช้างห้าตัว เผื่อเพื่อน!', 'ใครก็ได้ช่วยถือหน่อย'], {
      walk: { x0: 184, x1: 290, speed: 12 },
      over: (g, p) => {
        g.rect(p.x - 9, p.y - 12, 4, 5, '#ffd23f')
        g.rect(p.x + 5, p.y - 12, 4, 5, '#e8514a')
        g.rect(p.x + 6, p.y - 14, 4, 4, '#5a8de0')
      },
    }),
    personGag(balloonMan, 236, 486, ['ลูกโป่งหมูดึ๋งจ้า!', 'ระวังลอยนะหนู ผูกข้อมือไว้', 'ลูกโป่งฮิปโป เด้งดึ๋ง ๆ'], { view: 'front' }),
    personGag(look({ gender: 'm', hair: 'hair_twoblock', top: 'top_tee_grey', bottom: 'bot_jeans_black', head: 'head_vendorband' }), 66, 804, ['รองเท้ามือสองสภาพนางฟ้า!', 'คู่ละร้อยห้าสิบ ลองได้เลย', 'รุ่นหายาก หาไม่ได้แล้วนะ'], { pose: 'sit' }),
    personGag(look({ gender: 'f', hair: 'hair_bun', top: 'top_vendor', head: 'head_vendorband' }), 118, 970, ['หมูปิ้งไม้ละสิบ!', 'ข้าวเหนียวร้อน ๆ จ้า', 'หอมไหมล่ะ~'], { view: 'front', z: 1 }),
    tradePairGag(96, 426, { hair: 'hair_bob', top: 'top_tee_black' }, { hair: 'hair_ponytail', top: 'top_hoodie_over' }, ['แลกลาบุ๊บลาบั๊บสีม่วงกับตัวเงินตัวทองไหม', 'ดีลลล 🤝', 'ของแรร์นะอันนี้!']),
    tradePairGag(236, 426, { hair: 'hair_curtain', top: 'top_varsity' }, { hair: 'hair_wavy', top: 'top_cardigan' }, ['มีพวงกุญแจหอนาฬิกาไหม', 'แลกกับแม่เหล็กแมวส้มสองอันก็ได้', 'จบดีล ขอบคุณค้าบ']),
  ]
}

export function chatuchakMap(): MapDef {
  const tower = clockTower()
  const towerN = clockTower(true)
  const hallAL = marketHall('aL', HALL_A_L, { roof: '#5a8ac0', number: '1' })
  const hallAR = marketHall('aR', HALL_A_R, { roof: '#5aa878', number: '2' })
  const hallCL = marketHall('cL', HALL_C_L, { roof: '#d0784a', number: '7' })
  const hallDL = marketHall('dL', HALL_D_L, { roof: '#8a78c0', number: '9' })
  const hallDR = marketHall('dR', HALL_D_R, { roof: '#c8a040', number: '11' })
  const hallALn = marketHall('aL', HALL_A_L, { roof: '#5a8ac0', number: '1', night: true })
  const hallARn = marketHall('aR', HALL_A_R, { roof: '#5aa878', number: '2', night: true })
  const hallCLn = marketHall('cL', HALL_C_L, { roof: '#d0784a', number: '7', night: true })
  const hallDLn = marketHall('dL', HALL_D_L, { roof: '#8a78c0', number: '9', night: true })
  const hallDRn = marketHall('dR', HALL_D_R, { roof: '#c8a040', number: '11', night: true })
  const popboon = booth({ key: 'popboon', w: 56, roof: '#c8a0ff', roof2: '#ffd6e0', wall: '#fff1f6', back: boxGoods(), counter: boxGoods(), skirt: '#ff9fc0', sign: '#ff6f91', valance: ['#ffffff', '#c8a0ff'] })
  const hippoShop = booth({ key: 'hippo', w: 52, roof: '#9fd0ff', wall: '#f0e8f8', back: plushGoods('hippo'), counter: plushGoods('mix'), skirt: '#b4a8c8', sign: '#8a8098', valance: ['#ff9fc0', '#fffaf0'] })
  const petShop = booth({ key: 'pets', w: 46, roof: '#f58f35', wall: '#fff1d6', back: plushGoods('bear'), counter: jarGoods(['#c9a06a', '#f58f35']), skirt: '#43905a', sign: '#e8514a' })
  const cages = petCages()
  const tanks = fishTanks()
  const coco = coconutCart()
  const pan = giantPan()
  const mango = mangoStand()
  const gate = jjGate()
  const gateN = jjGate(true)
  const board = noticeBoard('jj', '#3d63b5')
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [
    [140, 404],
    [180, 404],
    [140, 660],
    [180, 660],
    [140, 930],
    [180, 930],
  ]
  const hall = (s: typeof hallAL, n: typeof hallAL, x: number, y: number): PlacedProp => ({ sprite: s, night: n, x, y })
  const props: PlacedProp[] = [
    hall(hallAL, hallALn, 72, ROW_A),
    hall(hallAR, hallARn, 248, ROW_A),
    hall(hallCL, hallCLn, 72, ROW_C),
    hall(hallDL, hallDLn, 72, ROW_D),
    hall(hallDR, hallDRn, 248, ROW_D),
    // Lane A: vintage racks and mannequins in front of the halls.
    { sprite: vintageRack(0), x: 22, y: 250 },
    { sprite: vintageRack(3), x: 116, y: 252 },
    { sprite: mannequin('#e8514a', '#6a4fb0'), x: 132, y: 228 },
    { sprite: mannequin('#fffaf0', '#3d63b5', false), x: 188, y: 228 },
    { sprite: crates(3, '#5a8de0', 1), x: 300, y: 250 },
    { sprite: F.benchSprite(), x: 230, y: 256 },
    // Row B.
    { sprite: popboon, x: 40, y: ROW_B },
    { sprite: hippoShop, x: 112, y: ROW_B },
    { sprite: petShop, x: 210, y: ROW_B },
    { sprite: cages, x: 258, y: ROW_B },
    { sprite: tanks, x: 300, y: ROW_B },
    // Plaza.
    { sprite: tower, night: towerN, x: TOWER.x, y: TOWER.y },
    { sprite: coco, x: 84, y: 488 },
    { sprite: board, x: 248, y: 634, shadow: [12, 3] },
    { sprite: F.benchSprite(), x: 86, y: 626 },
    { sprite: F.benchSprite(), x: 58, y: 430 },
    { sprite: F.benchSprite(), x: 270, y: 590 },
    { sprite: infoBooth(), x: 30, y: 548 },
    { sprite: rainTree(1), x: 20, y: 420, id: 't1' },
    { sprite: rainTree(0), x: 300, y: 424, id: 't2' },
    { sprite: rainTree(0), x: 16, y: 668, id: 't3' },
    { sprite: rainTree(1), x: 304, y: 664, id: 't4' },
    // Row C: food corner.
    { sprite: mango, x: 200, y: ROW_C },
    { sprite: pan, x: 262, y: ROW_C - 6 },
    { sprite: menuBoard('pan', '#3a3040'), x: 300, y: ROW_C },
    { sprite: eatTable('#fffaf0', '#e8514a'), x: 214, y: 776 },
    { sprite: eatTable('#fffaf0', '#5a8de0'), x: 276, y: 780 },
    { sprite: stool('#e8514a'), x: 240, y: 792 },
    { sprite: crates(2, '#43905a', 4), x: 306, y: 800 },
    // Entrance.
    { sprite: gate, night: gateN, x: GATE.x, y: GATE.y },
    { sprite: winStandSprite(), x: 272, y: 968 },
    { sprite: tukTuk(), x: 60, y: 1000 },
    { sprite: rainTree(1), x: 24, y: 930, id: 't5' },
    { sprite: rainTree(0), x: 300, y: 920, id: 't6' },
    { sprite: mooPingSprite(), x: 118, y: 954 },
    { sprite: chaYenSprite(), x: 204, y: 950 },
    { sprite: crates(3, '#e8514a', 7), x: 222, y: 904 },
    { sprite: crates(2, '#5a8de0', 3), x: 100, y: 904 },
    { sprite: G.shrub(0), x: 96, y: 1012 },
    { sprite: G.shrub(1), x: 226, y: 1012 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const bayHs = (cx: number, gy: number, i: number, id: string, label: string, hint: string, icon: string) =>
    hs(`shop:${id}`, label, hint, icon, { x: bayX(cx, i) - 13, y: gy - 44, w: 26, h: 44 }, { x: bayX(cx, i), y: gy + 8 }, { marker: { x: bayX(cx, i), y: gy - 30 } })
  const clock = hooksAt(tower, 'clock', TOWER.x, TOWER.y)[0]
  const trainY = 57
  return {
    id: ID,
    place: ID,
    area: 'wat',
    w: W,
    h: H,
    skyH: 96,
    ground: '#d2c9c0',
    camBias: 0.6,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      { x: 101, y: 946, w: 34, h: 9 },
      { x: 187, y: 942, w: 34, h: 9 },
      { x: 215, y: 898, w: 14, h: 7 },
      { x: 93, y: 898, w: 14, h: 7 },
      { x: 0, y: ROW_A - 50, w: HALL_W, h: 52 },
      { x: 176, y: ROW_A - 50, w: HALL_W, h: 52 },
      { x: 12, y: 244, w: 20, h: 8 },
      { x: 106, y: 246, w: 20, h: 8 },
      { x: 128, y: 222, w: 9, h: 7 },
      { x: 184, y: 222, w: 9, h: 7 },
      { x: 292, y: 238, w: 16, h: 13 },
      { x: 218, y: 252, w: 24, h: 5 },
      { x: 10, y: ROW_B - 22, w: 60, h: 24 },
      { x: 84, y: ROW_B - 22, w: 56, h: 24 },
      { x: 185, y: ROW_B - 22, w: 50, h: 24 },
      { x: 232, y: ROW_B - 22, w: 88, h: 24 },
      // Tower plinth and the flower ring.
      { x: TOWER.x - 20, y: TOWER.y - 30, w: 40, h: 30 },
      { x: 62, y: 474, w: 44, h: 15 },
      { x: 234, y: 624, w: 28, h: 11 },
      { x: 74, y: 622, w: 24, h: 5 },
      { x: 46, y: 426, w: 24, h: 5 },
      { x: 258, y: 586, w: 24, h: 5 },
      { x: 16, y: 530, w: 28, h: 19 },
      { x: 15, y: 414, w: 10, h: 7 },
      { x: 295, y: 418, w: 10, h: 7 },
      { x: 11, y: 662, w: 10, h: 7 },
      { x: 299, y: 658, w: 10, h: 7 },
      { x: 0, y: ROW_C - 50, w: HALL_W, h: 52 },
      { x: 178, y: ROW_C - 18, w: 44, h: 19 },
      { x: 237, y: ROW_C - 20, w: 50, h: 15 },
      { x: 293, y: ROW_C - 6, w: 14, h: 7 },
      { x: 199, y: 770, w: 30, h: 7 },
      { x: 261, y: 774, w: 30, h: 7 },
      { x: 300, y: 790, w: 14, h: 11 },
      { x: 0, y: ROW_D - 50, w: HALL_W, h: 52 },
      { x: 176, y: ROW_D - 50, w: HALL_W, h: 52 },
      // Entrance: arch pillars, fences and the parked tuk-tuk.
      { x: GATE.x - 56, y: GATE.y - 8, w: 14, h: 9 },
      { x: GATE.x + 42, y: GATE.y - 8, w: 14, h: 9 },
      { x: 0, y: 1004, w: 104, h: 16 },
      { x: 216, y: 1004, w: 104, h: 16 },
      { x: 248, y: 956, w: 50, h: 13 },
      { x: 19, y: 924, w: 10, h: 7 },
      { x: 295, y: 914, w: 10, h: 7 },
      { x: 0, y: 1020, w: W, h: 70 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      bayHs(72, ROW_A, 0, 'hub_chatuchak_vintage', 'ร้านวินเทจโซน 2016', 'เสื้อยุค 2016 กลับมาฮิต · มัทฉะ ชาเย็น', 'shirt'),
      hs('shop:hub_chatuchak_blindbox', 'ป๊อปบุญ กล่องสุ่ม', 'ต่อคิวซื้อกล่องสุ่ม (พาโรดี้) · โซดากล่องสุ่ม', 'gift', { x: 14, y: ROW_B - 48, w: 52, h: 48 }, { x: 40, y: ROW_B + 8 }, { marker: { x: 40, y: ROW_B - 50 } }),
      hs('shop:hub_chatuchak_hippo', 'ร้านตุ๊กตาหมูดึ๋ง', 'ฮิปโปแคระสุดไวรัล · แพนเค้กหน้าหมูดึ๋ง', 'heart', { x: 88, y: ROW_B - 48, w: 48, h: 48 }, { x: 112, y: ROW_B + 8 }, { marker: { x: 112, y: ROW_B - 50 } }),
      hs('shop:hub_chatuchak_pets', 'โซนสัตว์เลี้ยงป้าส้ม', 'ดูน้องหมาน้องแมว · ไอติมหน้าแมวส้ม', 'paw', { x: 188, y: ROW_B - 48, w: 44, h: 48 }, { x: 210, y: ROW_B + 8 }, { marker: { x: 210, y: ROW_B - 50 } }),
      hs('shop:hub_chatuchak_coconut', 'ไอติมมะพร้าว', 'ไอติมกะทิในลูกมะพร้าว · ชาเย็น', 'dessert', { x: 64, y: 444, w: 40, h: 46 }, { x: 84, y: 496 }, { marker: { x: 84, y: 442 } }),
      bayHs(72, ROW_C, 0, 'hub_chatuchak_pants', 'กางเกงช้างทุกสีทุกไซส์', 'ตัวละร้อย! · ไอติมมะพร้าว', 'shirt'),
      hs('shop:hub_chatuchak_mango', 'ข้าวเหนียวมะม่วงแม่วรรณ', 'ข้าวเหนียวมะม่วงพิสตาชิโอ · มัทฉะลาเต้', 'dessert', { x: 180, y: ROW_C - 40, w: 40, h: 40 }, { x: 200, y: ROW_C + 10 }, { marker: { x: 200, y: ROW_C - 42 } }),
      hs('shop:hub_chatuchak_paella', 'ข้าวผัดกระทะยักษ์ลุงโจ้', 'ข้าวผัดซีฟู้ดกระทะใหญ่เท่าล้อรถ', 'curry', { x: 238, y: ROW_C - 34, w: 50, h: 30 }, { x: 262, y: ROW_C + 8 }, { marker: { x: 262, y: ROW_C - 36 } }),
      hs('npc:jj_win', 'เจ๊วิน', 'เจ้าของร้านวินเทจ · มีเรื่องอยากให้ช่วย', 'friends', { x: 56, y: 208, w: 16, h: 32 }, { x: 64, y: 252 }, { marker: { x: 64, y: 196 }, near: 14 }),
      hs('npc:jj_som', 'ป้าส้ม', 'คนรักแมวส้ม · แมวหายอีกแล้ว', 'friends', { x: 244, y: 326, w: 16, h: 32 }, { x: 252, y: 370 }, { marker: { x: 252, y: 314 }, near: 14 }),
      hs('npc:jj_guide', 'พี่ไกด์ต้น', 'ไกด์หอนาฬิกา · พาสปอร์ตนักช้อป', 'friends', { x: 190, y: 536, w: 16, h: 32 }, { x: 198, y: 580 }, { marker: { x: 198, y: 524 }, near: 14 }),
      hs(`board:${ID}`, 'บอร์ดข่าวตลาด', 'กิจกรรมวันนี้ · ร้านเด่น · ใครตามหาอะไร', 'scroll', { x: 232, y: 600, w: 32, h: 34 }, { x: 248, y: 646 }, { marker: { x: 248, y: 598 } }),
      hs('gate', 'ทางออกตลาดนัดจตุจักร', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: GATE.x - 30, y: GATE.y - 60, w: 60, h: 62 }, { x: GATE.x, y: GATE.y - 8 }, { face: 'down', marker: { x: GATE.x, y: GATE.y - 66 }, near: 12 }),
    ],
    spawn: { x: GATE.x, y: 980, face: 'up' },
    entries: {},
    pickupSpots: [
      { x: 30, y: 280 },
      { x: 290, y: 276 },
      { x: 150, y: 360 },
      { x: 60, y: 520 },
      { x: 270, y: 520 },
      { x: 120, y: 650 },
      { x: 40, y: 790 },
      { x: 150, y: 890 },
      { x: 290, y: 890 },
      { x: 100, y: 960 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: clock.x, y: clock.y, r: 16, color: '#fff6c8' },
      { x: TOWER.x, y: TOWER.y - 60, r: 30, color: '#ffe7a0' },
      { x: 72, y: ROW_A - 24, r: 40, color: '#ffcf7a' },
      { x: 248, y: ROW_A - 24, r: 40, color: '#ffcf7a' },
      { x: 40, y: ROW_B - 24, r: 24, color: '#ffc8f0' },
      { x: 112, y: ROW_B - 24, r: 22, color: '#ffe7a8' },
      { x: 250, y: ROW_B - 24, r: 30, color: '#ffe7a8' },
      { x: 72, y: ROW_C - 24, r: 40, color: '#ffcf7a' },
      { x: 230, y: ROW_C - 20, r: 36, color: '#ffcf7a' },
      { x: 72, y: ROW_D - 24, r: 40, color: '#ffcf7a' },
      { x: 248, y: ROW_D - 24, r: 40, color: '#ffcf7a' },
      { x: GATE.x, y: GATE.y - 48, r: 36, color: '#fff3a6' },
    ],
    remoteChat: hubChat(ID),
    life(s) {
      return [
        new HubArrival(s),
        new Gags(s, gags()),
        new BlindBoxQueue(s, 40, ROW_B + 20, 1, 7),
        new HippoBalloons(s, [
          { x: 244, y: 474 },
          { x: 248, y: 476, color: '#9fd0ff' },
          { x: 252, y: 474, color: '#ff9fc0' },
          { x: 224, y: 604 },
        ]),
        new OrangeCats(s, [
          { x: 64, y: 244, pose: 'sleep' },
          { x: 88, y: 623, pose: 'loaf' },
          { x: 290, y: 346, pose: 'sit' },
          { x: 120, y: 850, pose: 'sleep' },
        ]),
        new Hawkers(s, [
          ...HALL_A_L.map((_, i) => ({ x: bayX(72, i), y: ROW_A - 30, lines: ['เชิญเลือกก่อนค่ะ~', 'ลดราคา ๆ!', 'ตัวสุดท้ายแล้วนะ', 'ของวินเทจแท้ปี 2016!'] })),
          ...HALL_A_R.map((_, i) => ({ x: bayX(248, i), y: ROW_A - 30, lines: ['แคคตัสน่ารัก ๆ', 'ต้นไม้ฟอกอากาศจ้า', 'กระถางทำมือ!'] })),
          ...HALL_C_L.map((_, i) => ({ x: bayX(72, i), y: ROW_C - 30, lines: ['ตัวละร้อย!', 'ถูกกว่านี้ไม่มีแล้ว', 'เชิญชมก่อนได้'] })),
          ...HALL_D_L.map((_, i) => ({ x: bayX(72, i), y: ROW_D - 30, lines: ['อาร์ตทอยทำมือ!', 'ของเล่นสะสมจ้า', 'แวะก่อนน้า'] })),
          ...HALL_D_R.map((_, i) => ({ x: bayX(248, i), y: ROW_D - 30, lines: ['ชิมก่อนได้ค่ะ', 'มัทฉะแก้วละสามสิบ', 'ของฝากครบ!'] })),
        ]),
        new Glints(s, hooksAt(tower, 'glints', TOWER.x, TOWER.y), 1.4),
        new CloudShadows(s, 2),
        new SunRays(s),
        new Traffic(s, [
          { y: 1044, dir: 1 },
          { y: 1072, dir: -1 },
        ]),
        new TapZones([
          {
            rect: { x: TOWER.x - 16, y: TOWER.y - 124, w: 32, h: 70 },
            fn: () => {
              const d = new Date()
              s.say(`ตอนนี้ ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} น. แล้วน้า`, TOWER.x, TOWER.y - 126, 2.4)
              s.particles.sparkles(clock.x, clock.y, 8, '#fff3a6', 10)
              sfx.bell(2)
            },
          },
          {
            rect: { x: 232, y: ROW_B - 30, w: 88, h: 30 },
            fn: (x) => {
              s.say(pick(['เหมียว~', 'โฮ่ง!', 'จิ๊บ ๆ', 'ปลาทองว่ายวน ๆ']), x, ROW_B - 34, 1.8)
              s.particles.hearts(x, ROW_B - 20, 2)
              sfx.sparkle()
            },
          },
          ...[['t1', 20, 420], ['t2', 300, 424], ['t3', 16, 668], ['t4', 304, 664], ['t5', 24, 930], ['t6', 300, 920]].map(([id, x, y]) => ({
            rect: { x: (x as number) - 40, y: (y as number) - 70, w: 80, h: 50 },
            fn: () => {
              s.shake(id as string)
              s.drop(x as number, (y as number) - 44, 50, 6, '#9ed86a', '#5eae55', 'leaf')
              if (Math.random() < 0.6) s.burstBirds(x as number, (y as number) - 50, 2)
              sfx.whoosh()
            },
          })),
        ]),
      ]
    },
    decor(g, t) {
      // Skytrain gliding along the viaduct.
      const k = (t * 0.035) % 1.6
      const x = -120 + k * (W + 240) / 1.6
      drawSkytrain(g, x, trainY, 3, 0.8, { body: '#f4f6fa', stripe: '#3d8a6a', roof: '#c8ccd8', win: '#5a6a8a', dark: '#3a3f5a' })
    },
    overlay(g, t) {
      drawClockHands(g, clock.x, clock.y)
      // Bunting over the main walkway and the lanes.
      const cols = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0']
      pennants(g, 140, ROW_A + 6, 180, ROW_A + 6, 4, cols, t)
      pennants(g, 140, ROW_B + 8, 180, ROW_B + 8, 4, cols, t + 1)
      pennants(g, 140, ROW_C + 6, 180, ROW_C + 6, 4, cols, t + 2)
      pennants(g, 140, ROW_D + 6, 180, ROW_D + 6, 4, cols, t + 3)
      pennants(g, 110, 408, 210, 408, 8, cols, t + 4)
    },
    ambient(s, dt) {
      const steam = hooksAt(pan, 'steam', 262, ROW_C - 6)
      if (Math.random() < dt * 3) {
        const p = pick(steam)
        s.particles.add({ kind: 'smoke', x: p.x + rand(-3, 3), y: p.y, vx: rand(-3, 3), vy: rand(-12, -6), max: rand(1, 1.6), color: '#fffaf0', size: 2 })
      }
      if (Math.random() < dt * 1.2) {
        const b = pick(hooksAt(tanks, 'bubbles', 300, ROW_B))
        s.particles.add({ kind: 'dot', x: b.x + rand(-2, 2), y: b.y, vx: 0, vy: -6, max: 0.6, color: '#e8fbff' })
      }
      const cold = hooksAt(coco, 'cold', 84, 488)[0]
      if (Math.random() < dt * 1.5) s.particles.add({ kind: 'smoke', x: cold.x + rand(-8, 8), y: cold.y + 4, vx: rand(-4, 4), vy: rand(-3, 2), max: 0.8, color: '#e8f8ff', size: 1 })
    },
    wander: [
      { x: 10, y: 262, w: 300, h: 40 },
      { x: 10, y: 380, w: 300, h: 34 },
      { x: 150, y: 110, w: 20, h: 880 },
      { x: 50, y: 440, w: 70, h: 190 },
      { x: 200, y: 440, w: 70, h: 150 },
      { x: 10, y: 736, w: 150, h: 60 },
      { x: 10, y: 862, w: 300, h: 40 },
      { x: 60, y: 920, w: 200, h: 60 },
    ],
    pois: [
      ...[0, 1, 2, 3, 4].map((i) => ({ x: bayX(72, i), y: ROW_A + 10, face: 'up' as const })),
      ...[0, 1, 2, 3, 4].map((i) => ({ x: bayX(248, i), y: ROW_A + 10, face: 'up' as const })),
      ...[0, 1, 2, 3, 4].map((i) => ({ x: bayX(72, i), y: ROW_C + 10, face: 'up' as const })),
      ...[0, 2, 4].map((i) => ({ x: bayX(72, i), y: ROW_D + 10, face: 'up' as const })),
      ...[1, 3].map((i) => ({ x: bayX(248, i), y: ROW_D + 10, face: 'up' as const })),
      { x: 112, y: ROW_B + 10, face: 'up' },
      { x: 210, y: ROW_B + 10, face: 'up' },
      { x: 262, y: ROW_B + 10, face: 'up' },
      { x: 84, y: 498, face: 'up' },
      { x: 150, y: 560, face: 'up' },
      { x: 172, y: 560, face: 'up' },
      { x: 200, y: ROW_C + 12, face: 'up' },
      { x: 262, y: ROW_C + 10, face: 'up' },
    ],
    birds: { x: 110, y: 580, w: 100, h: 40 },
    cats: [],
    vendors: [
      { x: 16, y: ROW_A - 8 },
      { x: 128, y: ROW_A - 8 },
      { x: 220, y: ROW_A - 8 },
      { x: 100, y: ROW_C - 8 },
      { x: 44, y: ROW_D - 8 },
      { x: 276, y: ROW_D - 8 },
      { x: 204, y: ROW_B - 10 },
    ],
    dogs: [],
    visitors: 12,
  }
}
