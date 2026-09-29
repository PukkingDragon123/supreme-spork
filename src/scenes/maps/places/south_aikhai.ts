// วัดเจดีย์ (ไอ้ไข่) อ.สิชล นครศรีธรรมราช – the child spirit Ai Khai grants
// wishes fast, and people say thanks with rooster statues: thousands of them,
// every size and colour, packed on terraces round the plaza, plus red soda,
// soldier dolls and toy guns. Firecrackers pop in the cage, live chickens
// strut between the statues, and a giant rooster waits for your selfie.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import { GOLD } from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { road, sidewalk } from '../common'
import { Butterflies, CloudShadows, EaveBells, Flames, Flags, Glints, Smoke, SunRays, TapZones, Traffic } from '../../life'
import { Gags, drawPerson, gagFx, drawPhoneMonk, type Gag } from '../../gags'
import { arecaPalm, crotonBush, potPlant, salaSprite, sandGround, flagString, hash } from '../../../art/places/south'
import { aiKhaiStatue, brickChedi, CROWD, dollsRow, drawAiKhai, drawBigRooster, drawRooster, firecrackerCage, giantRooster, lotteryStall, roosterBank, roosterRow, roosterStall, sodaTable } from '../../../art/places/south_aikhai'
import { hooks, look, personGag, shakeTree } from './south_common'
import { Chickens, Firecrackers } from './south_life'

const W = 300
const H = 900
const CX = 150
const SALA = { x: CX, y: 300 }
const CHEDI = { x: 58, y: 262 }
const TREE = { x: 252, y: 268 }
const STATUE = { x: CX, y: 470 }
const URN = { x: CX, y: 502 }
const CAGE = { x: 258, y: 360 }
const GIANT = { x: 72, y: 736 }
const RSTALL = { x: 234, y: 706 }
const LOTTO = { x: 238, y: 790 }
const GATE = { x: CX, y: 862 }

/** Rooster banks: [x, footY, width, tiers, seed]. */
const BANKS: [number, number, number, number, number][] = [
  [48, 392, 72, 4, 1],
  [48, 470, 72, 3, 2],
  [52, 566, 80, 4, 3],
  [252, 444, 72, 3, 4],
  [250, 536, 76, 4, 5],
  [104, 632, 44, 2, 6],
  [196, 632, 44, 2, 7],
  [50, 836, 70, 3, 8],
]

/** Short rooster rows lining the aisle and the walls: [x, y, len, seed, size]. */
const ROWS: [number, number, number, number, 0 | 1 | 2][] = [
  ...[676, 698, 720, 742, 764, 786].flatMap((y, i) => [
    [112, y, 22, i, 1] as [number, number, number, number, 0 | 1 | 2],
    [188, y, 22, i + 20, 1] as [number, number, number, number, 0 | 1 | 2],
  ]),
  [44, 330, 64, 40, 1],
  [256, 836, 56, 41, 2],
]

function bake(g: Surface, night: boolean) {
  G.treeLine(g, 88, W, G.LEAVES.far, 21)
  G.treeLine(g, 102, W, G.LEAVES.deep, 23)
  sandGround(g, 0, 118, W, 746, 9, '#ecdcb8')
  G.lawn(g, 0, 118, W, 90, 5)
  // Plaza paving and the aisle down the middle.
  G.paving(g, 8, 312, 284, 340, 8)
  G.weather(g, 8, 312, 284, 340, 7, 0.8)
  G.paving(g, 124, 652, 52, 210, 8)
  G.mandala(g, CX, 510, 24)
  // A sea of rooster statues filling the back field (baked – thousands!).
  for (let row = 0; row < 14; row++) {
    const y = 128 + row * 8
    const size = (row < 5 ? 0 : 1) as 0 | 1
    const step = size ? 7 : 5
    for (let x = 4 + (row % 2) * 3; x < W - 3; x += step) {
      const v = hash(x, row, 3)
      if (v % 13 === 0) continue
      drawRooster(g, x + (v % 2), y, size, CROWD[v % CROWD.length], x > CX)
    }
  }
  // Low white fence in front of the rooster field.
  g.rect(0, 234, W, 5, '#fffaf0')
  g.hline(0, W - 1, 234, '#ffffff')
  g.hline(0, W - 1, 238, '#d2bfa2')
  for (let x = 2; x < W; x += 12) g.rect(x, 230, 3, 9, '#fffaf0')
  for (let x = 2; x < W; x += 12) g.px(x + 1, 229, '#e8514a')
  for (let row = 0; row < 4; row++)
    for (let x = 6; x < 294; x += 6) {
      if (x > 20 && x < 280) continue
      const v = hash(x, row + 9, 3)
      drawRooster(g, x, 330 + row * 60 + (v % 8), 0, CROWD[v % CROWD.length], x > 150)
    }
  // Red firecracker paper everywhere near the cage (job:sweep_leaves → sweep it!).
  for (let i = 0; i < 420; i++) {
    const v = ((i + 11) * 2654435761) >>> 0
    const a = (v % 628) / 100
    const d = Math.sqrt(((v >>> 10) % 1000) / 1000)
    const x = Math.round(CAGE.x - 6 + Math.cos(a) * d * 44)
    const y = Math.round(CAGE.y + 12 + Math.sin(a) * d * 16)
    g.px(x, y, (v >>> 4) % 3 ? '#e8514a' : '#b8343f')
    if ((v >>> 7) % 4 === 0) g.px(x + 1, y, '#ffd23f')
  }
  for (let i = 0; i < 160; i++) {
    const v = ((i + 77) * 2654435761) >>> 0
    g.px(12 + (v % 276), 320 + ((v >>> 9) % 330), (v >>> 3) % 2 ? '#e8514a' : '#ff8a7a')
  }
  G.groundShadow(g, SALA.x, 296, 70, 8, 0.7)
  G.groundShadow(g, GIANT.x, GIANT.y - 4, 40, 8, 0.6)
  // Flower beds with marigolds by the gate.
  G.flowerBed(g, 96, 812, 22, 12, ['#f58f35', '#ffd23f'], 4)
  G.flowerBed(g, 182, 812, 22, 12, ['#f58f35', '#ffd23f'], 5)
  // Bunting over the plaza.
  flagString(g, 8, 318, 292, 318, 10, ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0'])
  // Street.
  sidewalk(g, 0, 862, W, 10)
  road(g, 0, 872, W, 28)
  if (night) for (let x = 20; x < W; x += 50) g.px(x, 866, '#ffe7a8')
}

/** Inside of the open shrine sala: tiers of roosters round Ai Khai's glass case. */
function salaInner(g: Surface, x0: number, x1: number, floor: number, beam: number) {
  const cx = Math.round((x0 + x1) / 2)
  g.rect(x0, beam, x1 - x0, floor - beam, '#f3e2b8')
  for (let t = 0; t < 4; t++) {
    const y = floor - 6 - t * 7
    g.rect(x0, y, x1 - x0, 2, '#cfc8c4')
    for (let x = x0 + 3 + (t % 2) * 3; x < x1 - 2; x += t < 2 ? 7 : 5) {
      if (Math.abs(x - cx) < 14) continue
      const v = hash(x, t, 12)
      drawRooster(g, x, y - 1, t < 2 ? 1 : 0, CROWD[v % CROWD.length], x > cx)
    }
  }
  // Glass case with Ai Khai.
  g.rect(cx - 11, beam + 6, 22, floor - beam - 6, '#d4f1ff')
  g.frame(cx - 12, beam + 5, 24, floor - beam - 5, GOLD.d)
  drawAiKhai(g, cx, floor - 3, 0.8, 'stand')
  g.line(cx - 8, beam + 8, cx - 3, floor - 4, '#ffffff')
  // Garlands on the case.
  for (let i = 0; i < 9; i++) g.px(cx - 10 + i * 2.5, beam + 6 + Math.round(Math.sin(i * 0.8) * 2 + 2), i % 2 ? '#f58f35' : '#ffd23f')
}

/** Delivery pickup with a huge rooster statue in the bed. */
function drawPickup(g: Surface, x: number, y: number, t: number, react: number) {
  const shake = react > 0 ? Math.round(Math.sin(t * 40)) : 0
  const X = x + shake
  g.rect(X - 22, y - 12, 32, 6, '#e8e8f0')
  g.rect(X + 10, y - 16, 12, 10, '#5a8de0')
  g.rect(X + 13, y - 15, 7, 4, '#d4f1ff')
  g.rect(X - 22, y - 6, 44, 3, '#3a3040')
  g.circle(X - 14, y - 2, 3, '#3a3040')
  g.circle(X + 14, y - 2, 3, '#3a3040')
  g.px(X - 14, y - 2, '#bdb2ae')
  g.px(X + 14, y - 2, '#bdb2ae')
  g.px(X + 22, y - 10, '#fff3a6')
  drawBigRooster(g, X - 8, y - 12, 1.1, 'gold', false)
  // Ribbon on the statue.
  g.px(X - 6, y - 26, '#e8514a')
  g.px(X - 5, y - 27, '#e8514a')
}

function gags(fire: () => void): Gag[] {
  const uncle = look({ gender: 'm', hair: 'hair_buzz', hairColor: 0, top: 'top_hawaii', bottom: 'bot_khaki', neck: 'neck_amulet' })
  const kid = look({ gender: 'f', hair: 'hair_twin', hairColor: 0, top: 'top_tee_boon', bottom: 'bot_denim_shorts' })
  const carrier = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_tee_white', bottom: 'bot_jeans' })
  const lady = look({ gender: 'f', hair: 'hair_ponytail', hairColor: 1, top: 'top_floral', bottom: 'bot_sarong' })
  const selfie = look({ gender: 'f', hair: 'hair_long', hairColor: 3, top: 'top_tee_lotus', head: 'head_sunglasses' })
  let dance = 0
  return [
    {
      x: 110,
      y: 540,
      lines: ['ถูกหวยรางวัลที่หนึ่ง! ขอบคุณไอ้ไข่!!', 'บนไว้ไก่ 99 ตัว แก้บนวันนี้เลย!', 'จุดประทัดฉลอง ปัง ๆ ๆ!', 'ไอ้ไข่ให้เลขเด็ดจริง ๆ นะ'],
      draw: (g, p) => {
        const hop = p.react > 0 || Math.floor(p.t * 2) % 5 === 0 ? -Math.round(Math.abs(Math.sin(p.t * 10)) * 2) : 0
        drawPerson(g, uncle, { ...p, y: p.y + hop }, 'front', [], p.react > 0 && Math.floor(p.t * 6) % 2 ? 'happy' : 'stand')
        if (dance > 0 || p.react > 0) {
          g.rect(p.x + 6, p.y - 16 + hop, 5, 3, '#fffaf0')
          g.hline(p.x + 7, p.x + 9, p.y - 15 + hop, '#3d63b5')
        }
      },
      react: (s, x, y) => {
        dance = 1
        fire()
        s.particles.confetti(x, y - 24, 24)
        sfx.coins(4)
      },
    },
    personGag(kid, 92, 474, ['น้ำแดงให้ไอ้ไข่ค่ะ!', 'ไอ้ไข่ชอบน้ำแดงนะ', 'ขอให้หาน้องแมวเจอ~', 'ซู้ดดด~ หวานชื่นใจ'], { extras: ['drink'], view: 'back' }),
    {
      x: 130,
      y: 648,
      walk: { x0: 132, x1: 170, speed: 6 },
      h: 40,
      lines: ['แก้บนครับ! ตัวที่ 99 แล้ว', 'หนักเหมือนกันนะเนี่ย ฮึบ!', 'ของหายได้คืน ขอบคุณไอ้ไข่!'],
      draw: (g, p) => {
        drawPerson(g, carrier, p, 'front', [], 'offer')
        drawRooster(g, p.x, p.y - 26, 2, 'red', p.flip)
      },
      react: (s, x, y) => s.particles.sparkles(x, y - 36, 6, '#fff3a6', 8),
    },
    {
      x: 206,
      y: 478,
      lines: ['ปืนของเล่นให้ไอ้ไข่เล่นจ้า', 'ไอ้ไข่เป็นเด็ก ชอบของเล่นนะ', 'ปิ้ว ๆ! (ยิงลมเล่น)'],
      draw: (g, p) => {
        drawPerson(g, lady, p, 'back')
        g.rect(p.x + 3, p.y - 14, 5, 2, '#f58f35')
        g.px(p.x + 4, p.y - 12, '#f58f35')
      },
      react: (s, x, y) => {
        s.particles.popText(x + 8, y - 26, 'ปิ้ว!', '#fff3a6', '#f58f35')
        sfx.click()
      },
    },
    personGag(selfie, 112, 750, ['ถ่ายกับไก่ยักษ์! แชะ!', 'ใหญ่กว่าคนอีก!', 'ลงไอจีเลย #ไอ้ไข่'], { view: 'back', extras: ['selfie'], react: (s, x, y) => gagFx.flash(s, x, y) }),
    { x: 196, y: 330, lines: ['เจริญพร~', 'ไอ้ไข่เป็นเด็กวัดเจดีย์แต่โบราณ', 'ขอแล้วได้ไว แต่ต้องแก้บนนะโยม'], draw: (g, p) => drawPhoneMonk(g, p) },
    {
      x: 64,
      y: 884,
      w: 48,
      h: 34,
      lines: ['ส่งไก่ปูนปั้นครับ! ตัวใหญ่สุดในอำเภอ', 'ปี๊น ๆ! หลีกหน่อยครับ', 'ไก่ทองคำ (ทาสีทอง) ส่งด่วน!'],
      draw: (g, p) => drawPickup(g, p.x, p.y, p.t, p.react),
      react: () => sfx.tap(),
    },
  ]
}

export function aiKhaiMap(): MapDef {
  const sala = salaSprite({ key: 'aikhai', w: 110, colH: 44, roof: T.ROOF.red, cols: 'red', inner: salaInner })
  const statue = aiKhaiStatue(2.2, 'wave')
  const chedi = brickChedi()
  const cage = firecrackerCage()
  const giant = giantRooster()
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const lamps: [number, number][] = [
    [120, 560],
    [180, 560],
    [120, 700],
    [180, 700],
  ]
  const fireSpot = hooks(cage, CAGE, 'fire')[0]
  const props: PlacedProp[] = [
    { sprite: chedi, x: CHEDI.x, y: CHEDI.y },
    { sprite: G.takhianTree(), x: TREE.x, y: TREE.y, id: 'tree' },
    { sprite: sala, x: SALA.x, y: SALA.y },
    { sprite: cage, x: CAGE.x, y: CAGE.y },
    ...BANKS.map(([x, y, w, t, sd]) => ({ sprite: roosterBank(w, t, sd), x, y })),
    ...ROWS.map(([x, y, len, sd, sz]) => ({ sprite: roosterRow(len, sd, sz), x, y })),
    { sprite: roosterRow(112, 50, 0, false), x: 56, y: 845 },
    { sprite: roosterRow(112, 51, 0, false), x: 244, y: 845 },
    { sprite: statue, x: STATUE.x, y: STATUE.y },
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 124, y: 500 },
    { sprite: F.candleStandSprite(), x: 176, y: 500 },
    { sprite: sodaTable(40), x: 106, y: 454 },
    { sprite: dollsRow(40), x: 194, y: 454 },
    { sprite: F.donationSprite(), x: 186, y: 320, shadow: [6, 2] },
    { sprite: giant, x: GIANT.x, y: GIANT.y, id: 'giant' },
    { sprite: roosterStall(), x: RSTALL.x, y: RSTALL.y },
    { sprite: lotteryStall(), x: LOTTO.x, y: LOTTO.y },
    { sprite: arecaPalm(0), x: 16, y: 660 },
    { sprite: arecaPalm(1), x: 284, y: 640 },
    { sprite: arecaPalm(0), x: 290, y: 850 },
    { sprite: crotonBush(0), x: 136, y: 204 },
    { sprite: potPlant(2), x: 118, y: 846 },
    { sprite: potPlant(3), x: 182, y: 846 },
    { sprite: T.wallSprite(112), x: 0, y: 862 },
    { sprite: T.wallSprite(112), x: 188, y: 862 },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...lamps.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: 'ai_khai',
    place: 'ai_khai',
    area: 'wat',
    w: W,
    h: H,
    skyH: 100,
    ground: '#ecdcb8',
    camBias: 0.62,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 240 },
      ...ROWS.map(([x, y, len]) => ({ x: x - len / 2, y: y - 5, w: len, h: 6 })),
      { x: 22, y: 236, w: 72, h: 28 },
      { x: 236, y: 250, w: 32, h: 16 },
      { x: 86, y: 250, w: 128, h: 42 },
      { x: 88, y: 292, w: 44, h: 10 },
      { x: 168, y: 292, w: 44, h: 10 },
      { x: 236, y: 330, w: 42, h: 32 },
      ...BANKS.map(([x, y, w, t]) => ({ x: x - w / 2, y: y - t * 9 - 6, w, h: t * 9 + 6 })),
      { x: STATUE.x - 22, y: STATUE.y - 14, w: 44, h: 15 },
      { x: URN.x - 10, y: URN.y - 8, w: 20, h: 9 },
      { x: 117, y: 494, w: 14, h: 7 },
      { x: 169, y: 494, w: 14, h: 7 },
      { x: 86, y: 440, w: 40, h: 14 },
      { x: 174, y: 440, w: 40, h: 14 },
      { x: 180, y: 314, w: 12, h: 7 },
      { x: GIANT.x - 40, y: GIANT.y - 26, w: 80, h: 27 },
      { x: RSTALL.x - 28, y: RSTALL.y - 14, w: 56, h: 15 },
      { x: LOTTO.x - 22, y: LOTTO.y - 12, w: 44, h: 13 },
      { x: 13, y: 657, w: 6, h: 4 },
      { x: 281, y: 637, w: 6, h: 4 },
      { x: 96, y: 812, w: 22, h: 12 },
      { x: 182, y: 812, w: 22, h: 12 },
      { x: 112, y: 840, w: 12, h: 7 },
      { x: 176, y: 840, w: 12, h: 7 },
      { x: 0, y: 848, w: 114, h: 16 },
      { x: 186, y: 848, w: 114, h: 16 },
      { x: 0, y: 870, w: W, h: 30 },
      ...lamps.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      { id: 'door:ai_khai:shrine', label: 'ศาลาไอ้ไข่', hint: 'เข้าไปไหว้ขอพรไอ้ไข่', icon: 'door', rect: { x: 132, y: 240, w: 36, h: 56 }, at: { x: CX, y: 304 }, face: 'up', marker: { x: CX, y: 236 }, near: 10 },
      { id: 'incense', label: 'ไหว้รูปปั้นไอ้ไข่', hint: 'จุดธูปขอพร ขอแล้วได้ไว', icon: 'incense', rect: { x: 124, y: 370, w: 52, h: 110 }, at: { x: CX, y: 520 }, face: 'up', marker: { x: CX, y: 366 } },
      { id: 'tree', label: 'ต้นตะเคียนเลขเด็ด', hint: 'ขูดเลขมงคลลุ้นโชค', icon: 'powder', rect: { x: 220, y: 180, w: 64, h: 84 }, at: { x: 230, y: 290 }, face: 'up', marker: { x: TREE.x, y: 180 } },
      { id: 'donation', label: 'ตู้ทำบุญวัดเจดีย์', hint: 'ร่วมทำบุญบำรุงวัด', icon: 'coin', rect: { x: 178, y: 294, w: 16, h: 28 }, at: { x: 186, y: 330 }, face: 'up', marker: { x: 186, y: 292 } },
      { id: 'job:sweep_leaves', label: 'กวาดเศษประทัด', hint: 'อาสากวาดกระดาษประทัดแดงเต็มลาน', icon: 'broom', rect: { x: 214, y: 362, w: 76, h: 20 }, at: { x: 226, y: 382 }, face: 'right', marker: { x: 250, y: 364 } },
      { id: 'job:wipe_statues', label: 'เช็ดตุ๊กตาไก่ชน', hint: 'อาสาปัดฝุ่นไก่ปูนปั้นนับร้อยตัว', icon: 'chicken', rect: { x: 12, y: 432, w: 72, h: 40 }, at: { x: 92, y: 478 }, face: 'left', marker: { x: 48, y: 430 } },
      { id: 'shop:ai_khai_rooster', label: 'ร้านไก่ชนแก้บน', hint: 'ตุ๊กตาไก่ชนทุกขนาด ทุกสี', icon: 'shop', rect: { x: 206, y: 658, w: 58, h: 50 }, at: { x: 234, y: 718 }, face: 'up', marker: { x: RSTALL.x, y: 656 } },
      { id: 'shop:ai_khai_lottery', label: 'แผงลอตเตอรี่เลขเด็ด', hint: 'ลุ้นโชคกับเลขไอ้ไข่', icon: 'number', rect: { x: 216, y: 746, w: 46, h: 46 }, at: { x: 238, y: 802 }, face: 'up', marker: { x: LOTTO.x, y: 744 } },
      { id: 'gate', label: 'ประตูวัดเจดีย์', hint: 'กลับบ้าน หรือไปวัดอื่น', icon: 'map', rect: { x: 128, y: 800, w: 44, h: 62 }, at: { x: CX, y: 850 }, face: 'down', marker: { x: CX, y: 792 }, near: 12 },
    ],
    spawn: { x: CX, y: 830, face: 'up' },
    entries: { 'ai_khai:shrine': { x: CX, y: 312, face: 'down' } },
    pickupSpots: [
      { x: 110, y: 340 },
      { x: 200, y: 360 },
      { x: 150, y: 590 },
      { x: 104, y: 600 },
      { x: 30, y: 700 },
      { x: 150, y: 760 },
      { x: 200, y: 830 },
      { x: 270, y: 600 },
      { x: 110, y: 318 },
      { x: 24, y: 300 },
    ],
    lights: [
      ...lamps.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: SALA.x, y: 262, r: 40, color: '#ffcf7a' },
      { x: STATUE.x, y: 420, r: 30, color: '#ffe7a0' },
      { x: URN.x, y: 486, r: 10, color: '#ff9a5a' },
      { x: RSTALL.x, y: 680, r: 18, color: '#ffe7a8' },
      { x: LOTTO.x, y: 770, r: 16, color: '#ffe7a8' },
      { x: GATE.x, y: 826, r: 24 },
    ],
    life(s) {
      const fcRef = new Firecrackers(s, [{ x: fireSpot.x, y: fireSpot.y, every: [6, 12] }], { x: CAGE.x - 20, y: CAGE.y - 36, w: 40, h: 36 })
      return [
        fcRef,
        new Chickens(s, { x: 100, y: 540, w: 100, h: 90 }, 4, 6),
        new Glints(s, [...hooks(sala, SALA, 'glints'), ...hooks(chedi, CHEDI, 'glints'), ...hooks(gate, GATE, 'glints'), ...hooks(statue, STATUE, 'head')], 1),
        new EaveBells(s, hooks(sala, SALA, 'bells'), SALA.y),
        new EaveBells(s, hooks(gate, GATE, 'bells'), GATE.y),
        Flames.candles(s, 124, 500),
        Flames.candles(s, 176, 500),
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 8),
        new Flags(s, [
          { x: 10, y: 300, kind: 'color', sortY: 330 },
          { x: 290, y: 300, kind: 'color', sortY: 330 },
        ]),
        new Gags(s, gags(() => fcRef.fire(fireSpot.x, fireSpot.y, 18))),
        new Butterflies(s, [{ x: 20, y: 150, w: 260, h: 60 }], 4),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [{ y: 894, dir: -1 }]),
        new TapZones([
          shakeTree(s, 'tree', TREE.x, TREE.y - 20, 70, ['#5eae55', '#3f8a4f']),
          {
            // The giant rooster crows for your photo.
            rect: { x: GIANT.x - 34, y: GIANT.y - 90, w: 60, h: 80 },
            fn: () => {
              s.say('เอ้ก อี เอ้ก เอ้กกก!!!', GIANT.x + 10, GIANT.y - 86, 2.4)
              s.shake('giant')
              gagFx.flash(s, GIANT.x, GIANT.y - 50)
              s.particles.hearts(GIANT.x + 12, GIANT.y - 80, 3)
            },
          },
          {
            rect: { x: STATUE.x - 20, y: STATUE.y - 100, w: 40, h: 90 },
            fn: () => {
              s.say(pick(['ขอแล้วได้ไว~', 'ไอ้ไข่เองจ้า!', 'แก้บนด้วยไก่ชนนะ!']), STATUE.x, STATUE.y - 104, 2.2)
              s.particles.sparkles(STATUE.x, STATUE.y - 70, 10, '#fff3a6', 12)
              sfx.chime()
            },
          },
          {
            rect: { x: 86, y: 430, w: 40, h: 24 },
            fn: (x, y) => {
              s.particles.popText(x, y - 8, 'ซู้ดด~', '#fff2a0', '#b8343f')
              for (let i = 0; i < 4; i++) s.particles.add({ kind: 'dot', x: x + rand(-4, 4), y: y - 6, vy: rand(-16, -8), max: 0.8, color: '#ffd6e0' })
              sfx.gulp()
            },
          },
          ...BANKS.map(([x, y, w, t]) => ({
            rect: { x: x - w / 2, y: y - t * 9 - 20, w, h: t * 9 + 20 },
            fn: (tx: number, ty: number) => {
              s.say(pick(['เอ้ก!', 'กุ๊ก ๆ', 'เอ้ก อี เอ้ก!', 'ตัวนี้แก้บนถูกหวย!', 'ตัวนี้ของหายได้คืน!']), tx, ty - 6, 1.6)
              s.particles.add({ kind: 'petal', x: tx, y: ty, vx: rand(-8, 8), vy: rand(-14, -6), max: 1.2, color: '#e8514a', color2: '#ffd23f' })
              sfx.tap()
            },
          })),
        ]),
      ]
    },
    ambient(s, dt) {
      // Drifting firecracker smoke clouds high over the plaza.
      if (Math.random() < dt * 0.3) s.particles.add({ kind: 'smoke', x: rand(180, 290), y: rand(300, 340), vx: rand(2, 6), vy: rand(-6, -2), max: rand(3, 5), color: '#f4eef4', size: 2 })
      if (s.isNight() && Math.random() < dt * 0.8) s.particles.add({ kind: 'sparkle', x: STATUE.x + rand(-20, 20), y: rand(380, 460), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 100, y: 330, w: 100, h: 100 },
      { x: 100, y: 520, w: 100, h: 90 },
      { x: 130, y: 660, w: 40, h: 170 },
      { x: 20, y: 600, w: 70, h: 90 },
    ],
    pois: [
      { x: 140, y: 522, face: 'up' },
      { x: 160, y: 522, face: 'up' },
      { x: 150, y: 314, face: 'up' },
      { x: 92, y: 478, face: 'left' },
      { x: 208, y: 480, face: 'right' },
      { x: 234, y: 720, face: 'up' },
      { x: 238, y: 804, face: 'up' },
      { x: 106, y: 752, face: 'left' },
    ],
    fireflies: [{ x: 10, y: 130, w: 280, h: 80 }],
    birds: { x: 110, y: 580, w: 80, h: 40 },
    cats: [{ x: 272, y: 760, pose: 'sleep', color: '#f5a55a' }],
    vendors: [
      { x: 222, y: 690 },
      { x: 250, y: 776 },
    ],
    dogs: ['khanom'],
    visitors: 5,
  }
}

