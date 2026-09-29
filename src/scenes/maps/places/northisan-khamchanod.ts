// คำชะโนด, Udon Thani.
//   kham_chanod          – the offering market on the shore, shoes off at the
//                          naga bridge, the long bridge over the wetland and the
//                          misty island forest of chanod palms: naga well, the
//                          great coiled naga, naga-root trees and the shrine.
//   kham_chanod:shrine   – the shrine room of Pu Si Suttho & Ya Si Pathumma,
//                          heaped with bai sri, marigolds and red soda.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { road } from '../common'
import { drawPerson, Gags, type Gag } from '../../gags'
import { Butterflies, Flames, Glints, Lanterns, Smoke, TapZones } from '../../life'
import { tukTuk } from '../../../art/props'
import {
  nagaHeadsSprite,
  NAGA_GREEN,
  serpent,
  shoeRack,
  baiSriSprite,
  marigoldPile,
  candleRack,
  offeringTable,
  donationBox,
  bakeRoom,
  roomGeo,
  carpet,
  hooksAt,
  hsh,
  mossGround,
  water,
  bld,
  block,
  GOLD,
  LACQUER,
  type RoomOpts,
} from '../../../art/places/northisan'
import {
  chanodPalmSprite,
  nagaRootTreeSprite,
  nagaWellSprite,
  nagaStatueSprite,
  nagaShrineSprite,
  nagaKingSprite,
  redSodaRow,
  offeringStallSprite,
  bridgeArchSprite,
} from '../../../art/places/northisan-khamchanod'
import { drawCostumed, drawMist, hs, look, Shuttle, SwimFish } from './northisan-common'

const W = 300
const H = 1090
const CX = 150
const SHR = { x: CX, y: 236 }
const STAT = { x: 236, y: 348 }
const WELL = { x: 66, y: 346 }
const NTREE = { x: 62, y: 452 }
const NTREE2 = { x: 246, y: 450 }
const WET = { y0: 488, y1: 896 }
const BR = { x0: 139, x1: 161 }
const SHORE = { y0: 896, y1: 1040 }

const PALMS: [number, number, number][] = [
  [14, 150, 0], [52, 120, 1], [96, 100, 2], [206, 104, 1], [250, 124, 0], [290, 150, 2],
  [10, 230, 1], [40, 260, 2], [276, 238, 0], [296, 290, 1], [12, 330, 0], [290, 380, 2],
  [20, 410, 1], [284, 440, 0], [110, 290, 0], [196, 296, 1], [114, 420, 2], [192, 424, 0],
  [30, 190, 2], [270, 190, 1], [124, 150, 0], [178, 140, 2],
]

function bakeKC(g: Surface, night: boolean) {
  // Canopy above the island (no sky, just green gloom).
  g.rect(0, 0, W, 60, night ? '#1e3a30' : '#3a6a4a')
  G.treeLine(g, 20, W, { L: '#6aa888', b: '#4f8a70', d: '#3d705c', D: '#2c5a4a' }, 11)
  G.treeLine(g, 44, W, { L: '#5e9a6a', b: '#3f7a52', d: '#2f6040', D: '#224a32' }, 12)
  // Island floor: dark moss, leaf litter, roots.
  mossGround(g, 0, 60, W, WET.y0 - 40, 7, '#4a7e4a')
  G.leafLitter(g, 20, 250, 260, 220, 160, 9)
  // Wetland all around the south of the island.
  water(g, 0, WET.y0 - 10, W, WET.y1 - WET.y0 + 20, night, { deep: night ? '#1e3a4a' : '#3a7a7a', mid: night ? '#2a4a5a' : '#4a9090', light: night ? '#4a6a7a' : '#8ac8c0', seed: 3 })
  // Irregular island shore.
  for (let x = 0; x < W; x++) {
    const y = WET.y0 - 6 + Math.round(Math.sin(x * 0.08) * 4 + Math.sin(x * 0.21) * 2)
    g.vline(x, y - 4, y, '#6a5a40')
    g.px(x, y - 5, '#8a7a50')
  }
  // Lily pads, lotus, water hyacinth and reeds.
  for (let i = 0; i < 70; i++) {
    const v = hsh(i, 21)
    const x = v % W
    const y = WET.y0 + 10 + ((v >> 3) % (WET.y1 - WET.y0 - 20))
    if (Math.abs(x - CX) < 20) continue
    G.lilyPad(g, x, y, 2 + (v % 3), i)
    if (v % 5 === 0) {
      g.ellipse(x + 1, y - 2, 1.5, 2.2, v % 2 ? '#ff9fc0' : '#fffaf0')
      g.px(x + 1, y - 4, '#ffe0ea')
    }
  }
  for (let i = 0; i < 16; i++) {
    const v = hsh(i, 33)
    const x = (v % 2 ? 10 + (v % 90) : 200 + (v % 90))
    const y = WET.y0 + 20 + ((v >> 4) % (WET.y1 - WET.y0 - 40))
    G.reeds(g, x, y, 4 + (v % 3))
  }
  // Island clearing and the path of tamped earth.
  g.ctx.save()
  g.ctx.globalAlpha = 0.6
  g.ellipse(CX, 360, 118, 98, '#6a8a4a')
  g.ctx.restore()
  for (let y = SHR.y - 4; y < WET.y0 - 2; y++) g.hline(CX - 12, CX + 11, y, (y % 6) ? '#b8a88a' : '#a8987a')
  for (const [x0, x1, y] of [[WELL.x + 16, CX - 12, 350], [CX + 12, STAT.x - 20, 356], [NTREE.x + 20, CX - 12, 456], [CX + 12, NTREE2.x - 20, 456]] as const) {
    for (let x = x0; x < x1; x++) g.vline(x, y - 6, y + 6, (x % 6) ? '#b8a88a' : '#a8987a')
  }
  G.paving(g, CX - 50, SHR.y - 4, 100, 16, 6, 'grey')
  // Naga bridge across the wetland.
  g.rect(BR.x0 - 6, WET.y0 - 12, BR.x1 - BR.x0 + 12, WET.y1 - WET.y0 + 24, '#8c8187')
  g.rect(BR.x0 - 5, WET.y0 - 12, BR.x1 - BR.x0 + 10, WET.y1 - WET.y0 + 22, '#e4ddd6')
  for (let y = WET.y0 - 12; y < WET.y1 + 10; y += 8) g.hline(BR.x0 - 5, BR.x1 + 4, y, '#cfc6c0')
  // Reflection of the bridge in the water.
  g.ctx.save()
  g.ctx.globalAlpha = 0.25
  g.rect(BR.x0 - 6, WET.y0, BR.x1 - BR.x0 + 12, WET.y1 - WET.y0, '#ffffff')
  g.ctx.restore()
  for (const [x, s] of [[BR.x0 - 5, 1], [BR.x1 + 5, -1]] as const) {
    const pts: [number, number][] = []
    for (let y = WET.y0 - 8; y < WET.y1 + 20; y += 3) pts.push([x + Math.sin(y * 0.06) * 1.4 * s, y - 2 - Math.abs(Math.sin(y * 0.05)) * 3])
    serpent(g, pts, 7, NAGA_GREEN, s > 0 ? 1 : 5)
  }
  // Shore: paved landing, market and road.
  G.lawn(g, 0, WET.y1 + 4, W, SHORE.y1 - WET.y1, 41)
  for (let x = 0; x < W; x++) {
    const y = WET.y1 + 2 + Math.round(Math.sin(x * 0.1) * 2)
    g.vline(x, y, y + 3, '#8a7a50')
  }
  G.paving(g, 50, SHORE.y0 + 10, 200, SHORE.y1 - SHORE.y0 - 10, 8, 'grey')
  G.weather(g, 50, SHORE.y0 + 10, 200, SHORE.y1 - SHORE.y0 - 10, 4, 1)
  G.puddle(g, 208, 1020, 5, 2)
  // Flip-flops left behind at the bridge (everyone walks barefoot).
  const cols = ['#e8514a', '#5a8de0', '#ffd23f', '#6cc36a', '#ff9fc0']
  for (let i = 0; i < 12; i++) {
    const x = 70 + (hsh(i, 5) % 160)
    const y = SHORE.y0 + 24 + (hsh(i, 6) % 12)
    if (Math.abs(x - CX) < 16) continue
    g.rect(x, y, 2, 3, cols[i % cols.length])
    g.rect(x + 3, y, 2, 3, cols[i % cols.length])
  }
  road(g, 0, SHORE.y1, W, H - SHORE.y1)
}

function kcGags(): Gag[] {
  const devotee = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_white', bottom: 'bot_sin_mudmee' })
  const devotee2 = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_white', bottom: 'bot_black' })
  const lotto = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_floral', bottom: 'bot_sarong', head: 'head_sunhat' })
  const elder = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman' })
  const kid = look({ gender: 'f', hair: 'hair_twin', top: 'top_tee_lotus', bottom: 'bot_denim_shorts' })
  const guard = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_scout', bottom: 'bot_khaki' })
  const seller = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_mohom', bottom: 'bot_sin_mudmee' })
  let frogHop = 0
  return [
    {
      x: STAT.x - 16, y: STAT.y + 14, lines: ['พ่อปู่ศรีสุทโธ ช่วยลูกด้วยเถิด', 'ขอให้ถูกหวยงวดนี้สักใบ~', 'ถวายน้ำแดงให้ท่านแล้วนะ'],
      draw: (g, p) => drawPerson(g, devotee, p, 'back', [], p.react > 0 ? 'bow' : 'wai'),
    },
    {
      x: CX + 24, y: SHR.y + 18, lines: ['สาธุ~ ขอให้ค้าขายร่ำรวย', 'ถวายบายศรีแล้วสบายใจ', 'ที่นี่ขลังจริง ๆ นะ'],
      draw: (g, p) => drawPerson(g, devotee2, p, 'back', [], 'kneel'),
    },
    {
      x: 96, y: 1000, lines: ['เลขเด็ดคำชะโนด! ใบละ 80 ค่ะ', 'เลขพญานาคให้มา… ๙ ๙ ๙!', 'เมื่อคืนฝันเห็นงูใหญ่ใช่ไหมคะ?'],
      draw: (g, p) => {
        drawPerson(g, lotto, p)
        g.rect(p.x - 12, p.y - 16, 7, 12, '#fffaf0')
        g.frame(p.x - 12, p.y - 16, 7, 12, '#e8514a')
        for (let k = 0; k < 4; k++) g.hline(p.x - 11, p.x - 7, p.y - 14 + k * 3, '#5a8de0')
      },
    },
    {
      x: 104, y: 440, lines: ['ที่นี่คือเมืองบาดาล ประตูสู่โลกพญานาค', 'เกาะนี้ลอยน้ำได้นะหลาน น้ำท่วมแค่ไหนก็ไม่จม', 'ต้นชะโนดมีที่นี่ที่เดียวในอีสาน'],
      draw: (g, p) => drawCostumed(g, elder, p, 'isan', p.react > 0 ? 'happy' : 'sit'),
    },
    {
      x: 196, y: 460, lines: ['รอยพญานาค! ตรงนี้!', 'พี่ ๆ ดูสิ รากไม้เป็นรูปงู!', 'หนูไม่กลัวหรอก… นิดเดียว'],
      draw: (g, p) => drawPerson(g, kid, p, 'front'),
    },
    {
      x: CX + 30, y: SHORE.y0 + 22, lines: ['ถอดรองเท้าก่อนข้ามสะพานนะครับ', 'เดินเท้าเปล่า สำรวมกายวาจานะครับ', 'ห้ามส่งเสียงดังบนเกาะครับ'],
      draw: (g, p) => drawPerson(g, guard, p, 'front'),
    },
    { x: 70, y: 1016 - 7, z: -1, lines: ['บายศรีสวย ๆ ค่ะ ถวายพ่อปู่', 'พวงมาลัยดาวเรืองจ้า', 'น้ำแดงสามขวด ถวายพญานาคค่ะ'], draw: (g, p) => drawCostumed(g, seller, p, 'isan') },
    {
      x: 56, y: 600, w: 12, h: 10, lines: ['อ๊บ!', 'อ๊บ อ๊บ~', 'อ๊บ! (กระโดดหนี)'],
      draw: (g, p) => {
        const hop = p.react > 0 ? Math.round(Math.abs(Math.sin(p.react * 6)) * 4) : 0
        G.lilyPad(g, p.x, p.y, 4, 2)
        g.ellipse(p.x, p.y - 2 - hop, 2.5, 1.8, '#5eae55')
        g.px(p.x - 1, p.y - 4 - hop, '#241a2b')
        g.px(p.x + 1, p.y - 4 - hop, '#241a2b')
        g.px(p.x - 1, p.y - 5 - hop, '#9ed86a')
        g.px(p.x + 1, p.y - 5 - hop, '#9ed86a')
      },
      react: () => {
        frogHop++
        sfx.plop()
      },
    },
  ]
}

export function khamChanodMap(): MapDef {
  const shrine = nagaShrineSprite()
  const shrineN = nagaShrineSprite(true)
  const statue = nagaStatueSprite()
  const well = nagaWellSprite()
  const ntree = nagaRootTreeSprite()
  const heads = nagaHeadsSprite(NAGA_GREEN, 7, true)
  const arch = bridgeArchSprite()
  const rack = candleRack('kc', 9)
  const RACKS = [
    { x: CX - 40, y: SHR.y + 30 },
    { x: CX + 40, y: SHR.y + 30 },
  ]
  const HEADS = [
    { x: 108, y: 956, flip: false },
    { x: 192, y: 956, flip: true },
  ]
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [[CX - 20, 420], [CX + 20, 420], [CX - 20, 300], [CX + 20, 300], [70, 1030], [230, 1030]]
  const STALL = { x: 70, y: 1016 }
  const STALL2 = { x: 230, y: 1012 }
  const props: PlacedProp[] = [
    { sprite: shrine, night: shrineN, x: SHR.x, y: SHR.y },
    { sprite: statue, x: STAT.x, y: STAT.y },
    { sprite: well, x: WELL.x, y: WELL.y },
    { sprite: ntree, x: NTREE.x, y: NTREE.y, id: 'ntree' },
    { sprite: ntree, x: NTREE2.x, y: NTREE2.y, flip: true, id: 'ntree2' },
    ...PALMS.map(([x, y, v], i) => ({ sprite: chanodPalmSprite(v), x, y, flip: i % 2 === 1, id: 'palm' + i })),
    ...RACKS.map((r) => ({ sprite: rack, x: r.x, y: r.y })),
    { sprite: F.urnSprite(), x: CX, y: SHR.y + 32, shadow: [10, 2] as [number, number] },
    { sprite: baiSriSprite(1), x: CX - 22, y: SHR.y + 12 },
    { sprite: baiSriSprite(1), x: CX + 22, y: SHR.y + 12 },
    { sprite: marigoldPile(24, 1), x: STAT.x - 4, y: STAT.y + 6 },
    { sprite: redSodaRow(6), x: STAT.x + 20, y: STAT.y + 8 },
    { sprite: baiSriSprite(1), x: STAT.x - 26, y: STAT.y + 4 },
    { sprite: offeringTable('kcW', 26, ['egg', 'lotus', 'water', 'lotus']), x: WELL.x + 26, y: WELL.y + 6 },
    { sprite: marigoldPile(16, 3), x: NTREE.x + 10, y: NTREE.y + 4 },
    ...HEADS.map((h) => ({ sprite: heads, x: h.x, y: h.y, flip: h.flip })),
    { sprite: arch, x: CX, y: WET.y1 + 6 },
    { sprite: shoeRack('kcL', 30), x: 82, y: SHORE.y0 + 26 },
    { sprite: shoeRack('kcR', 30, false), x: 218, y: SHORE.y0 + 26 },
    { sprite: offeringStallSprite(), x: STALL.x, y: STALL.y },
    { sprite: F.stallSprite(), x: STALL2.x, y: STALL2.y },
    { sprite: tukTuk(), x: 250, y: SHORE.y1 + 20 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
    { sprite: donationBox('kc', '#3f9a6b'), x: CX + 60, y: SHR.y + 16 },
  ]
  return {
    id: 'kham_chanod',
    place: 'kham_chanod',
    area: 'mountain',
    w: W,
    h: H,
    skyH: 0,
    ground: '#4a7e4a',
    camBias: 0.6,
    entries: { 'kham_chanod:shrine': { x: SHR.x, y: SHR.y + 12, face: 'down' } },
    bake: bakeKC,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: SHR.y + 4 },
      // Island forest around the clearing.
      { x: 0, y: SHR.y, w: CX - 50, h: 94 },
      { x: CX + 50, y: SHR.y, w: W - CX - 50, h: 96 },
      { x: 0, y: 330, w: 36, h: WET.y0 - 330 },
      { x: W - 36, y: 330, w: 36, h: WET.y0 - 330 },
      { x: 0, y: WET.y0 - 8, w: BR.x0, h: WET.y1 - WET.y0 + 12 },
      { x: BR.x1, y: WET.y0 - 8, w: W - BR.x1, h: WET.y1 - WET.y0 + 12 },
      // Island features.
      { x: WELL.x - 20, y: WELL.y - 18, w: 40, h: 18 },
      { x: STAT.x - 28, y: STAT.y - 12, w: 56, h: 14 },
      { x: NTREE.x - 30, y: NTREE.y - 14, w: 60, h: 16 },
      { x: NTREE2.x - 30, y: NTREE2.y - 14, w: 60, h: 16 },
      ...PALMS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      ...RACKS.map((r) => ({ x: r.x - 16, y: r.y - 6, w: 32, h: 7 })),
      { x: CX - 10, y: SHR.y + 24, w: 20, h: 9 },
      { x: CX - 30, y: SHR.y + 4, w: 16, h: 9 },
      { x: CX + 14, y: SHR.y + 4, w: 16, h: 9 },
      { x: CX + 54, y: SHR.y + 10, w: 12, h: 7 },
      { x: WELL.x + 12, y: WELL.y, w: 28, h: 7 },
      // Shore.
      { x: 0, y: WET.y1, w: 50, h: SHORE.y1 - WET.y1 },
      { x: 250, y: WET.y1, w: 50, h: SHORE.y1 - WET.y1 },
      { x: 50, y: WET.y1, w: BR.x0 - 50, h: 10 },
      { x: BR.x1, y: WET.y1, w: 250 - BR.x1, h: 10 },
      { x: BR.x0 - 26, y: WET.y1 - 4, w: 12, h: 12 },
      { x: BR.x1 + 14, y: WET.y1 - 4, w: 12, h: 12 },
      ...HEADS.map((h) => ({ x: h.x - 19, y: h.y - 14, w: 38, h: 15 })),
      { x: 66, y: SHORE.y0 + 18, w: 32, h: 9 },
      { x: 202, y: SHORE.y0 + 18, w: 32, h: 9 },
      { x: STALL.x - 26, y: STALL.y - 16, w: 52, h: 17 },
      { x: STALL2.x - 24, y: STALL2.y - 14, w: 48, h: 15 },
      { x: 0, y: SHORE.y1 + 4, w: W, h: H - SHORE.y1 - 4 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      hs('door:kham_chanod:shrine', 'ศาลพ่อปู่ศรีสุทโธ แม่ย่าศรีปทุมมา', 'เข้าไปกราบสักการะในศาล', 'door', { x: SHR.x - 12, y: SHR.y - 42, w: 24, h: 42 }, { x: SHR.x, y: SHR.y + 6 }, { marker: { x: SHR.x, y: SHR.y - 118 }, beacon: true, near: 8 }),
      hs('naga', 'พญานาคเจ็ดเศียร', 'ถวายบายศรี ขอโชคลาภจากพญานาค', 'deity', { x: STAT.x - 30, y: STAT.y - 84, w: 60, h: 84 }, { x: STAT.x - 6, y: STAT.y + 18 }, { marker: { x: STAT.x, y: STAT.y - 88 } }),
      hs('holy_water', 'บ่อน้ำศักดิ์สิทธิ์', 'ตักน้ำพญานาคประพรมเสริมสิริมงคล', 'vessel', { x: WELL.x - 22, y: WELL.y - 44, w: 44, h: 44 }, { x: WELL.x + 12, y: WELL.y + 12 }, { marker: { x: WELL.x, y: WELL.y - 46 } }),
      hs('tree', 'ต้นไม้รากพญานาค', 'ขูดหาเลขมงคลจากรากไม้ประหลาด', 'powder', { x: NTREE.x - 34, y: NTREE.y - 84, w: 68, h: 84 }, { x: NTREE.x + 32, y: NTREE.y + 6 }, { marker: { x: NTREE.x, y: NTREE.y - 88 } }),
      hs('job:sweep_leaves', 'ทางเดินในป่าชะโนด', 'กวาดใบชะโนดที่ร่วงบนทางเดิน', 'broom', { x: CX + 14, y: 440, w: 60, h: 30 }, { x: CX + 40, y: 460 }, { marker: { x: CX + 44, y: 438 } }),
      hs('job:feed_catfish', 'ปลาในบึงรอบเกาะ', 'โปรยอาหารให้ปลาจากสะพานนาค', 'broom', { x: 60, y: 640, w: 80, h: 60 }, { x: BR.x0 + 4, y: 670 }, { face: 'left', marker: { x: 100, y: 638 } }),
      hs('job:arrange_shoes', 'ที่ถอดรองเท้า', 'จัดรองเท้าให้เป็นระเบียบ ก่อนเดินเท้าเปล่าข้ามสะพาน', 'broom', { x: 64, y: SHORE.y0 + 6, w: 36, h: 22 }, { x: 100, y: SHORE.y0 + 36 }),
      hs('shop:kham_chanod_offerings', 'ร้านบายศรีแม่นาง', 'บายศรี ดาวเรือง น้ำแดง ของถวายพญานาค', 'shop', { x: STALL.x - 26, y: STALL.y - 50, w: 52, h: 50 }, { x: STALL.x + 30, y: STALL.y + 4 }, { marker: { x: STALL.x, y: STALL.y - 54 } }),
      hs('flower_stall', 'ร้านดอกไม้ธูปเทียน', 'ดอกไม้ ธูปเทียน ของถวาย', 'garland', { x: STALL2.x - 24, y: STALL2.y - 46, w: 48, h: 46 }, { x: STALL2.x - 28, y: STALL2.y + 6 }, { marker: { x: STALL2.x, y: STALL2.y - 50 } }),
      hs('gate', 'ลานจอดรถ', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: 110, y: SHORE.y1 - 16, w: 80, h: 20 }, { x: CX, y: SHORE.y1 - 4 }, { face: 'down', marker: { x: CX, y: SHORE.y1 - 20 }, near: 12 }),
    ],
    spawn: { x: CX, y: SHORE.y1 - 8, face: 'up' },
    pickupSpots: [
      { x: 60, y: 400 }, { x: 240, y: 404 }, { x: CX, y: 330 }, { x: 110, y: 350 }, { x: 200, y: 470 },
      { x: CX, y: 600 }, { x: CX, y: 780 }, { x: 60, y: 960 }, { x: 240, y: 960 }, { x: CX + 40, y: 1030 },
    ],
    lights: [
      { x: SHR.x, y: SHR.y - 30, r: 40, color: '#ffe7a0' },
      ...RACKS.map((r) => ({ x: r.x, y: r.y - 10, r: 16, color: '#ffb35a' })),
      { x: STAT.x, y: STAT.y - 50, r: 30, color: '#b4f0a0' },
      { x: WELL.x, y: WELL.y - 14, r: 22, color: '#9fe8ff' },
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 18 })),
      { x: CX, y: WET.y1 - 20, r: 20, color: '#b4f0a0' },
      { x: STALL.x, y: STALL.y - 30, r: 18, color: '#ffcf7a' },
      { x: STALL2.x, y: STALL2.y - 30, r: 16, color: '#ffb3cf' },
      { x: CX, y: SHR.y + 24, r: 10, color: '#ff9a5a' },
    ],
    life(s) {
      return [
        new Glints(s, [
          ...hooksAt(shrine, 'glints', SHR.x, SHR.y),
          ...hooksAt(statue, 'glints', STAT.x, STAT.y),
          ...HEADS.flatMap((h) => hooksAt(heads, 'glints', h.x, h.y)),
          ...hooksAt(well, 'glints', WELL.x, WELL.y),
          ...hooksAt(arch, 'glints', CX, WET.y1 + 6),
        ], 1.4),
        new SwimFish(s, [
          { x: 10, y: WET.y0 + 10, w: BR.x0 - 24, h: WET.y1 - WET.y0 - 20 },
          { x: BR.x1 + 14, y: WET.y0 + 10, w: W - BR.x1 - 24, h: WET.y1 - WET.y0 - 20 },
        ], 14),
        new Shuttle(s, [[40, 560], [96, 620], [60, 720], [30, 800], [90, 860], [40, 560]], 5, (g, x, y, t) => {
          const bob = Math.round(Math.sin(t * 2 + x * 0.1))
          g.poly([[x - 12, y - 3 + bob], [x + 12, y - 3 + bob], [x + 8, y + 2 + bob], [x - 8, y + 2 + bob]], '#8a5a32')
          g.hline(x - 12, x + 12, y - 3 + bob, '#c28e5c')
          // Fisherman with a cast net.
          g.rect(x - 2, y - 13 + bob, 4, 9, '#3a3a78')
          g.rect(x - 2, y - 17 + bob, 4, 4, '#c89a78')
          g.hline(x - 4, x + 3, y - 18 + bob, '#e0c890')
          g.line(x + 2, y - 11 + bob, x + 8, y - 16 + bob, '#c89a78')
        }, { loop: true, lines: ['หว่านแหเช้านี้ได้ปลาเยอะ', 'จ๋อม! ได้ปลานิลตัวโต', 'ที่นี่ห้ามจับปลาใกล้เกาะนะ'], hit: { w: 24, h: 20 } }),
        ...RACKS.map((r) => new Flames(s, hooksAt(rack, 'flames', r.x, r.y), r.y)),
        new Smoke(s, [{ x: CX, y: SHR.y + 22 }], 8),
        new Lanterns(s, [
          { x0: CX - 50, y0: SHR.y + 2, x1: CX + 50, y1: SHR.y + 2, n: 8, sag: 6, colors: ['#6cc36a', '#ffd23f', '#e8514a'] },
          { x0: BR.x0 - 20, y0: WET.y1 - 30, x1: BR.x1 + 20, y1: WET.y1 - 30, n: 5, sag: 4, colors: ['#6cc36a', '#ffd23f'] },
        ]),
        new Gags(s, kcGags()),
        new Butterflies(s, [{ x: 40, y: 300, w: 220, h: 150 }], 4),
        new TapZones([
          ...PALMS.map(([x, y], i) => ({
            rect: { x: x - 20, y: y - 90, w: 40, h: 40 },
            fn: () => {
              s.shake('palm' + i)
              s.drop(x, y - 70, 30, 3, '#5eae55', '#3f8a4f', 'leaf')
              if (Math.random() < 0.5) s.burstBirds(x, y - 76, 2)
              sfx.whoosh()
            },
          })),
          {
            rect: { x: STAT.x - 30, y: STAT.y - 84, w: 60, h: 40 },
            fn: () => {
              s.particles.sparkles(STAT.x, STAT.y - 64, 12, '#b4f0a0', 16)
              s.say(['ฟ่อ~ (พญานาคพยักหน้า)', 'ใครทำดี พญานาคคุ้มครอง', 'แสงสีเขียววาบ!'][Math.floor(Math.random() * 3)], STAT.x, STAT.y - 90)
              sfx.sparkle()
            },
          },
          ...HEADS.map((h) => ({
            rect: { x: h.x - 26, y: h.y - 70, w: 52, h: 50 },
            fn: () => {
              s.particles.sparkles(h.x, h.y - 58, 10, '#9fe8ff', 12)
              s.say(['ยินดีต้อนรับสู่เมืองบาดาล', 'ถอดรองเท้าแล้วหรือยัง?'][Math.floor(Math.random() * 2)], h.x, h.y - 74)
              sfx.sparkle()
            },
          })),
        ]),
      ]
    },
    overlay(g, t) {
      drawMist(g, t, 0, W, [120, 200, 280, 360, 430], 0.3, '#e8fff0')
      drawMist(g, t * 0.7, 0, W, [540, 700, 860], 0.18)
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.6) {
        const [x, y] = PALMS[Math.floor(Math.random() * PALMS.length)]
        if (s.onScreen(x, y - 60, 40)) s.particles.add({ kind: 'leaf', x: x + rand(-14, 14), y: y - 70, vx: rand(-4, 4), vy: rand(5, 9), max: 3, color: '#5eae55', color2: '#3f8a4f' })
      }
      // Faint green naga light rising from the well now and then.
      if (Math.random() < dt * 0.8) s.particles.add({ kind: 'sparkle', x: WELL.x + rand(-10, 10), y: WELL.y - 16, vy: rand(-8, -4), max: rand(1, 1.8), color: '#b4f0a0', drag: 0.3 })
    },
    wander: [
      { x: 44, y: 340, w: 212, h: 120 },
      { x: BR.x0 + 2, y: WET.y0, w: BR.x1 - BR.x0 - 4, h: WET.y1 - WET.y0 },
      { x: 56, y: SHORE.y0 + 40, w: 188, h: 80 },
    ],
    pois: [
      { x: SHR.x - 10, y: SHR.y + 16, face: 'up' },
      { x: STAT.x - 6, y: STAT.y + 18, face: 'up' },
      { x: WELL.x + 12, y: WELL.y + 12, face: 'up' },
      { x: NTREE.x + 32, y: NTREE.y + 6, face: 'left' },
      { x: CX, y: 700, face: 'left' },
      { x: STALL.x + 30, y: STALL.y + 4, face: 'up' },
      { x: STALL2.x - 28, y: STALL2.y + 6, face: 'up' },
    ],
    fireflies: [
      { x: 20, y: 250, w: 260, h: 220 },
      { x: 0, y: WET.y0, w: W, h: 200 },
    ],
    cats: [{ x: 266, y: 1000, pose: 'loaf', color: '#5a4a5e' }],
    dogs: ['dang'],
    visitors: 7,
  }
}

// ===========================================================================
// Inside the shrine.

const IW = 216
const IH = 276
const ROOM: RoomOpts = {
  w: IW,
  h: IH,
  wallTop: 20,
  wallH: 72,
  side: 10,
  front: 14,
  door: { x: IW / 2, w: 30 },
  floor: 'redtile',
  wall: { L: '#8ad0a0', b: '#3f9a6b', d: '#2c7552', D: '#1e5a42' },
  dado: '#1e4a3a',
}

function nagaWall(g: Surface, x: number, y: number, w: number, h: number) {
  // Painted naga undulating through the waves of the underworld (บาดาล).
  for (let j = 0; j < h; j++) {
    const t = j / h
    g.hline(x, x + w - 1, y + j, t < 0.5 ? '#3f9a6b' : '#2c8a80')
  }
  for (let i = 0; i < w; i += 6) for (let k = 0; k < 3; k++) g.px(x + i + k, y + h - 6 + Math.round(Math.sin((i + k) * 0.5) * 2), '#8ae0cc')
  for (const [yy, ph, c] of [[y + 20, 0, '#ffd23f'], [y + 42, 2, '#e8b83a']] as const) {
    const pts: [number, number][] = []
    for (let xx = x + 4; xx < x + w - 4; xx += 2) pts.push([xx, yy + Math.sin(xx * 0.07 + ph) * 6])
    for (const [px, py] of pts) {
      g.circle(px, py, 2.4, '#8a5222')
      g.circle(px, py - 0.5, 1.8, c)
    }
  }
  // Gold stars/scales.
  for (let i = 0; i < 40; i++) g.px(x + (hsh(i, 1) % w), y + (hsh(i, 2) % (h - 8)), '#fff3a6')
}

export function khamChanodShrineMap(): MapDef {
  const geo = roomGeo(ROOM)
  const king = nagaKingSprite(false)
  const queen = nagaKingSprite(true)
  const K = { x: IW / 2 - 30, y: 128 }
  const Q = { x: IW / 2 + 30, y: 128 }
  const dais = bld('kc:dais', 140, 20, 70, 19, (g) => {
    block(g, 1, 4, 138, 15, 3, LACQUER)
    g.hline(1, 138, 4, GOLD.L)
    g.hline(1, 138, 7, GOLD.d)
    for (let x = 6; x < 134; x += 6) {
      g.px(x, 11, GOLD.b)
      g.px(x + 1, 12, '#9fe8ff')
      g.px(x + 2, 11, GOLD.b)
    }
  })
  const rack = candleRack('kcI', 10)
  const RACKS = [
    { x: 44, y: 170 },
    { x: IW - 44, y: 170 },
  ]
  const table = offeringTable('kcI', 60, ['baisri', 'water', 'egg', 'garland', 'lotus', 'water', 'baisri', 'fruit'])
  const props: PlacedProp[] = [
    { sprite: dais, x: IW / 2, y: 136 },
    { sprite: king, x: K.x, y: K.y },
    { sprite: queen, x: Q.x, y: Q.y },
    { sprite: table, x: IW / 2, y: 158 },
    { sprite: baiSriSprite(1.4), x: IW / 2 - 56, y: 154 },
    { sprite: baiSriSprite(1.4), x: IW / 2 + 56, y: 154 },
    { sprite: marigoldPile(28, 5), x: IW / 2 - 22, y: 166 },
    { sprite: marigoldPile(28, 6), x: IW / 2 + 22, y: 166 },
    { sprite: redSodaRow(8), x: IW / 2, y: 170 },
    ...RACKS.map((r) => ({ sprite: rack, x: r.x, y: r.y })),
    { sprite: donationBox('kcI', '#3f9a6b'), x: 176, y: 246 },
    { sprite: F.urnSprite(), x: IW / 2, y: 196, shadow: [10, 2] as [number, number] },
  ]
  return {
    id: 'kham_chanod:shrine',
    place: 'kham_chanod',
    area: 'mountain',
    indoor: true,
    indoorLight: 0.9,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#14221c',
    camBias: 0.55,
    entries: { kham_chanod: { x: IW / 2, y: IH - 22, face: 'up' } },
    bake(g) {
      bakeRoom(g, { ...ROOM, void: '#14221c' }, nagaWall, 9)
      carpet(g, IW / 2 - 20, 204, 40, IH - 218, '#b8343f', GOLD.d)
      for (const x of [50, IW - 80]) carpet(g, x, 206, 30, 40, '#e8b83a', '#b8742a')
    },
    props,
    obstacles: [
      ...geo.obstacles,
      { x: IW / 2 - 70, y: 110, w: 140, h: 28 },
      { x: IW / 2 - 64, y: 144, w: 128, h: 30 },
      ...RACKS.map((r) => ({ x: r.x - 18, y: r.y - 6, w: 36, h: 7 })),
      { x: IW / 2 - 10, y: 188, w: 20, h: 9 },
      { x: 170, y: 240, w: 12, h: 7 },
    ],
    hotspots: [
      hs('pray', 'พ่อปู่ศรีสุทโธ แม่ย่าศรีปทุมมา', 'สวดมนต์ บูชาพญานาค ขอพรโชคลาภ', 'pray', { x: IW / 2 - 60, y: 30, w: 120, h: 110 }, { x: IW / 2, y: 206 }, { marker: { x: IW / 2, y: 30 }, beacon: true }),
      hs('job:light_candles', 'ราวเทียนบูชา', 'จุดเทียนถวายแสงสว่างแด่พญานาค', 'broom', { x: 24, y: 152, w: 40, h: 22 }, { x: 44, y: 182 }),
      hs('job:mop_floor', 'พื้นศาล', 'ถูพื้นให้สะอาดรับผู้มาสักการะ', 'broom', { x: 130, y: 206, w: 60, h: 40 }, { x: 150, y: 226 }, { marker: { x: 160, y: 204 } }),
      hs('donation', 'ตู้ทำบุญ', 'ร่วมทำบุญบำรุงศาล', 'coin', { x: 169, y: 226, w: 14, h: 22 }, { x: 176, y: 256 }),
      hs('door:kham_chanod', 'ประตูศาล', 'ออกไปป่าคำชะโนด', 'door', { x: IW / 2 - 15, y: IH - 18, w: 30, h: 18 }, { x: IW / 2, y: IH - 10 }, { face: 'down', near: 10 }),
    ],
    spawn: { x: IW / 2, y: IH - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: K.x, y: 70, r: 34, color: '#ffe7a0' },
      { x: Q.x, y: 70, r: 34, color: '#b4f0a0' },
      ...RACKS.map((r) => ({ x: r.x, y: r.y - 10, r: 18, color: '#ffb35a' })),
      { x: IW / 2, y: 184, r: 12, color: '#ff9a5a' },
      { x: IW / 2, y: IH - 8, r: 22, color: '#e8fff0' },
    ],
    life(s) {
      const guardian = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sin_mudmee' })
      return [
        new Glints(s, [...hooksAt(king, 'glints', K.x, K.y), ...hooksAt(queen, 'glints', Q.x, Q.y)], 1.8),
        ...RACKS.map((r) => new Flames(s, hooksAt(rack, 'flames', r.x, r.y), r.y)),
        new Flames(s, hooksAt(table, 'flames', IW / 2, 158), 158),
        new Smoke(s, [{ x: IW / 2, y: 182 }], 8),
        new Gags(s, [
          {
            x: 30, y: 226, lines: ['ร่างทรงบอกว่าท่านพอใจบายศรีวันนี้', 'จุดธูปเก้าดอกนะหนู', 'ขออะไรต้องแก้บนด้วยนะ'],
            draw: (g, p) => drawPerson(g, guardian, p, 'front', [], p.react > 0 ? 'happy' : 'sit'),
          },
        ]),
      ]
    },
    overlay(g, t) {
      drawMist(g, t, 0, IW, [120, 180], 0.14, '#e8fff0')
    },
    ambient(s, dt) {
      if (Math.random() < dt * 1.2) s.particles.add({ kind: 'sparkle', x: IW / 2 + rand(-60, 60), y: rand(40, 130), vy: rand(-5, -2), max: rand(0.8, 1.6), color: Math.random() < 0.5 ? '#b4f0a0' : '#fff3a6', drag: 0.3 })
    },
    wander: [{ x: 60, y: 200, w: 96, h: 50 }],
    pois: [
      { x: IW / 2 - 12, y: 208, face: 'up' },
      { x: IW / 2 + 12, y: 208, face: 'up' },
      { x: 62, y: 214, face: 'up' },
      { x: IW - 62, y: 214, face: 'up' },
    ],
    dogs: [],
    visitors: 4,
  }
}

export const KC_MAPS: Record<string, () => MapDef> = {
  kham_chanod: khamChanodMap,
  'kham_chanod:shrine': khamChanodShrineMap,
}
