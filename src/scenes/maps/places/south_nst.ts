// วัดพระมหาธาตุวรมหาวิหาร นครศรีธรรมราช – the great white bell chedi with its
// gold-plated spire rises inside a cloister lined with golden Buddha images.
// South of the cloister gate stands the Wihan Luang (walk inside), then the
// outer court with a nang talung shadow-puppet stage, the Chatukham amulet
// market and a khanom la stall, down to the gate on Ratchadamnoen road.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { road, sidewalk } from '../common'
import { EaveBells, Flames, Glints, Smoke, SunRays, TapZones, TowerBell, Traffic, CloudShadows, Butterflies, Flags } from '../../life'
import { Gags, drawPerson, gagFx, drawPhoneMonk, type Gag } from '../../gags'
import { arecaPalm, crotonBush, leafPile, potPlant, rainTree, sandGround, broomSprite, tableSet } from '../../../art/places/south'
import { amuletStall, cloisterBay, galleryWall, khanomLaStall, mahathatChedi, miniChedi, nangTalungStage, standingGuardian, viharnSprite, SAFFRON } from '../../../art/places/south_nst'
import { at, hooks, look, personGag, shakeTree } from './south_common'
import { Motes, ShadowPuppets } from './south_life'

const W = 296
const H = 1010
const CX = 148
const CHEDI = { x: CX, y: 384 }
const VIHARN = { x: CX, y: 700 }
const TOWER = { x: 270, y: 668 }
const COURT_GATE = { x: CX, y: 482 }
const GATE = { x: CX, y: 962 }
const STAGE = { x: 52, y: 812 }
const AMULET = { x: 238, y: 796 }
const KHANOM = { x: 58, y: 900 }
const RAIN = { x: 34, y: 646 }
const URN = { x: CX, y: 740 }

const BACK_BAYS = [46, 114, 182, 250]
const SIDE_BAYS = [246, 280, 314, 348, 382, 416, 450]
const MINIS: [number, number, number][] = [
  [62, 238, 0],
  [234, 238, 1],
  [62, 432, 2],
  [90, 440, 3],
  [206, 440, 4],
  [234, 432, 5],
  [104, 236, 3],
  [192, 236, 2],
]
const LAMPS: [number, number][] = [
  [118, 530],
  [178, 530],
  [118, 780],
  [178, 780],
  [118, 900],
  [178, 900],
]
const PALMS: [number, number, number][] = [
  [18, 566, 0],
  [276, 760, 1],
  [16, 740, 0],
  [282, 900, 1],
]

function bake(g: Surface, night: boolean) {
  // Far skyline: the Nakhon hills and trees.
  g.poly(
    [
      [0, 100],
      [40, 82],
      [90, 92],
      [150, 78],
      [210, 90],
      [296, 80],
      [296, 104],
      [0, 104],
    ],
    night ? '#5a6aa0' : '#a8c0d8',
  )
  G.treeLine(g, 96, W, G.LEAVES.far, 13)
  G.treeLine(g, 110, W, G.LEAVES.deep, 17)
  sandGround(g, 0, 124, W, 842, 5, '#eadbb8')
  // --- cloister court (ลานประทักษิณ) ---
  G.paving(g, 12, 196, 272, 272, 10, 'grey')
  G.weather(g, 12, 196, 272, 272, 4, 1.4)
  G.groundShadow(g, CX, 372, 90, 14, 0.8)
  // Circumambulation ring worn into the stones.
  g.alpha(0.25)
  g.ellipse(CX, 392, 96, 16, '#c9bfb8')
  g.alpha(1)
  // --- outer grounds ---
  G.lawn(g, 8, 500, 40, 200, 9)
  G.lawn(g, 248, 700, 40, 60, 10)
  G.paving(g, 118, 496, 60, 16, 8)
  G.paving(g, 20, 506, 256, 44, 8)
  G.weather(g, 20, 506, 256, 44, 5, 1)
  G.paving(g, 8, 550, 38, 200, 8)
  G.paving(g, 250, 550, 38, 110, 8)
  G.paving(g, 124, 700, 48, 262, 8)
  G.weather(g, 124, 700, 48, 262, 6, 1)
  G.paving(g, 20, 740, 256, 30, 8)
  G.mandala(g, URN.x, 750, 22)
  G.groundShadow(g, VIHARN.x, 690, 100, 10, 0.6)
  // Audience mats in front of the puppet stage.
  for (let i = 0; i < 3; i++) {
    const y = 826 + i * 9
    g.rect(22, y, 62, 7, i % 2 ? '#e0bb8a' : '#d8b078')
    for (let x = 24; x < 84; x += 3) g.px(x, y + 3, '#c9a06a')
  }
  // Flower beds.
  G.flowerBed(g, 100, 800, 18, 36, ['#f58f35', '#ffd23f', '#e8514a'], 2)
  G.flowerBed(g, 178, 800, 18, 36, ['#ff9fc0', '#fffaf0', '#f58f35'], 3)
  // Leaves under the rain tree (job:sweep_leaves) and around the court.
  G.groundShadow(g, RAIN.x, RAIN.y - 6, 42, 10, 0.8)
  leafPile(g, 30, 662, 14, 3)
  leafPile(g, 56, 668, 8, 5)
  leafPile(g, 16, 690, 7, 8)
  G.leafLitter(g, 8, 600, 40, 120, 30, 2)
  G.puddle(g, 150, 860, 5, 1.8)
  G.puddle(g, 264, 540, 4, 1.4)
  // Saffron cloth pieces tied round the little chedis.
  // --- street outside (Ratchadamnoen road) ---
  sidewalk(g, 0, 962, W, 12)
  road(g, 0, 974, W, 36)
  if (night) for (let x = 10; x < W; x += 40) g.px(x, 968, '#ffe7a8')
}

function gags(): Gag[] {
  const collector = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_polo', bottom: 'bot_khaki', neck: 'neck_amulet_big', head: 'head_glasses' })
  const auntie = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_floral', bottom: 'bot_sarong' })
  const carriers = [look({ gender: 'f', top: 'top_white' }), look({ gender: 'm', top: 'top_white' }), look({ gender: 'f', top: 'top_white' })]
  const kid1 = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_tee_boon' })
  const kid2 = look({ gender: 'f', hair: 'hair_twin', hairColor: 1, top: 'top_school_f' })
  const tourist = look({ gender: 'f', hair: 'hair_ponytail', hairColor: 3, top: 'top_hawaii', head: 'head_sunhat' })
  let loupe = 0
  return [
    // The amulet collector squinting through his loupe.
    {
      x: 206,
      y: 818,
      lines: ['ขอส่องหน่อยนะ… องค์นี้ของแท้แน่นอน!', 'จตุคามรามเทพ รุ่นแรกปี 30 หายากมาก', 'กล้องส่องพระ 10 เท่า ของรักของหวงเลย', 'ห้อยพระเต็มคอ แคล้วคลาดปลอดภัย~', 'เช่าบูชาไหมครับ ราคามิตรภาพ'],
      draw: (g, p) => {
        drawPerson(g, collector, p, 'front')
        // Loupe held up to one eye, glinting.
        const lx = p.x + 3
        const ly = p.y - 21 - (p.react > 0 ? 1 : 0)
        g.rect(lx, ly, 3, 3, '#3a3040')
        g.px(lx + 1, ly + 1, Math.floor(p.t * 2) % 3 === 0 ? '#ffffff' : '#9fd0ff')
        g.px(lx + 1, ly + 3, '#3a3040')
        g.px(lx + 1, ly + 4, '#f0bd90')
        if (loupe > 0) g.px(lx + 1, ly - 1, '#fff3a6')
      },
      react: (s, x, y) => {
        loupe = 1
        s.particles.sparkles(x + 4, y - 22, 5, '#fff3a6', 4)
        sfx.sparkle()
      },
    },
    personGag(auntie, 40, 912, ['ขนมลาทอดใหม่ ๆ จ้า', 'หรอยจังฮู้!', 'ข้าวยำปักษ์ใต้ด้วยไหมลูก', 'ขนมลาต้องใส่ในงานสารทเดือนสิบนะ'], { z: -1 }),
    // Kids watching the nang talung on the mats.
    personGag(kid1, 40, 840, ['ไอ้เท่งตลกมากเลย!', 'ฮ่า ๆ ๆ ๆ', 'อยากเล่นหนังตะลุงบ้าง'], { view: 'back' }),
    personGag(kid2, 66, 849, ['หนูนุ้ยน่ารัก~', 'คืนนี้เล่นเรื่องอะไรคะ?', 'ปรบมือ ๆ!'], { view: 'back' }),
    // The yearly แห่ผ้าขึ้นธาตุ: carrying the long saffron cloth round the chedi.
    {
      x: 80,
      y: 452,
      w: 50,
      h: 30,
      walk: { x0: 70, x1: 210, speed: 7 },
      lines: ['แห่ผ้าขึ้นธาตุ~ สาธุ!', 'ช่วยกันถือผ้าพระบฏหน่อยจ้า', 'บุญใหญ่ของชาวนครเลยนะ', 'ผ้ายาวเป็นร้อยเมตรเลย!'],
      draw: (g, p) => {
        const dir = p.flip ? -1 : 1
        const pts = [-16, 0, 16].map((d) => p.x + d)
        carriers.forEach((lk, i) => drawPerson(g, lk, { ...p, x: pts[i], t: p.t + i * 0.3 }, 'side'))
        // Cloth held overhead, gently rippling.
        for (let x = pts[0] - 8; x <= pts[2] + 8; x++) {
          const yy = p.y - 25 + Math.round(Math.sin(x * 0.4 + p.t * 5 * dir) * 1)
          g.px(x, yy, SAFFRON.b)
          g.px(x, yy + 1, SAFFRON.d)
          if (x % 5 === 0) g.px(x, yy, SAFFRON.L)
        }
        g.vline(pts[2] + 8, p.y - 25, p.y - 20, SAFFRON.D)
      },
      react: (s, x, y) => s.particles.sparkles(x, y - 28, 8, '#ffd070', 12),
    },
    personGag(tourist, 150, 520, ['สวยมาก! ยอดทองคำเลย', 'Wow, golden spire!', 'ถ่ายรูปคู่เจดีย์ให้หน่อยค่ะ'], { view: 'back', extras: ['selfie'], react: (s, x, y) => gagFx.flash(s, x, y) }),
    { x: 264, y: 724, lines: ['เจริญพร~', 'วันนี้พระธาตุสวยนะโยม', 'อาตมาดูหนังตะลุงออนไลน์อยู่'], draw: (g, p) => drawPhoneMonk(g, p) },
  ]
}

export function nstMahathatMap(): MapDef {
  const chedi = mahathatChedi()
  const viharn = viharnSprite({ key: 'nst', w: 188, roof: T.ROOF.red, roof2: T.ROOF.orange, field: '#b8343f', fieldD: '#7e2436' })
  const viharnN = viharnSprite({ key: 'nst', w: 188, roof: T.ROOF.red, roof2: T.ROOF.orange, field: '#b8343f', fieldD: '#7e2436', night: true })
  const gate = T.gateSprite()
  const tower = T.bellTowerSprite(T.ROOF.red)
  const stage = nangTalungStage()
  const stageN = nangTalungStage(true)
  const amulet = amuletStall()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const backBay = cloisterBay(68, 5, 'back')
  const sideBay = cloisterBay(36, 2, 'side')
  const sc = stage.hooks.screen
  const screen = { x: STAGE.x + sc[0].x, y: STAGE.y + sc[0].y, w: sc[1].x - sc[0].x, h: sc[1].y - sc[0].y }
  const props: PlacedProp[] = [
    // Cloister: back gallery behind the chedi, side galleries stepping forward.
    ...BACK_BAYS.map((x) => ({ sprite: backBay, x, y: 204 })),
    ...SIDE_BAYS.map((y) => ({ sprite: sideBay, x: 30, y })),
    ...SIDE_BAYS.map((y) => ({ sprite: sideBay, x: 266, y })),
    { sprite: chedi, x: CHEDI.x, y: CHEDI.y },
    ...MINIS.map(([x, y, v]) => ({ sprite: miniChedi(v), x, y })),
    // Front gallery wall with the court gate.
    { sprite: galleryWall(98), x: 12, y: 484 },
    { sprite: galleryWall(98), x: 186, y: 484 },
    { sprite: gate, x: COURT_GATE.x, y: COURT_GATE.y },
    { sprite: standingGuardian('#6c8cd8'), x: 104, y: 500 },
    { sprite: standingGuardian('#e0584a'), x: 192, y: 500 },
    // Wihan Luang (sorted a little early so the player can climb to the door).
    { sprite: viharn, night: viharnN, x: VIHARN.x, y: VIHARN.y, z: -28 },
    { sprite: tower, x: TOWER.x, y: TOWER.y },
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 122, y: 736 },
    { sprite: F.candleStandSprite(), x: 174, y: 736 },
    { sprite: F.donationSprite(), x: 196, y: 712, shadow: [6, 2] },
    { sprite: stage, night: stageN, x: STAGE.x, y: STAGE.y },
    { sprite: amulet, x: AMULET.x, y: AMULET.y },
    { sprite: khanomLaStall(), x: KHANOM.x, y: KHANOM.y },
    { sprite: tableSet('#43905a'), x: 104, y: 926 },
    { sprite: tableSet('#e8514a'), x: 226, y: 900 },
    { sprite: G.frangipani(2), x: 258, y: 940, id: 'fr3' },
    { sprite: rainTree(0), x: RAIN.x, y: RAIN.y, id: 'rain' },
    { sprite: broomSprite(), x: 50, y: 648 },
    { sprite: G.frangipani(3), x: 270, y: 560, id: 'fr2' },
    ...PALMS.map(([x, y, v]) => ({ sprite: arecaPalm(v), x, y })),
    { sprite: crotonBush(0), x: 108, y: 770 },
    { sprite: crotonBush(1), x: 188, y: 770 },
    { sprite: potPlant(2), x: 118, y: 690 },
    { sprite: potPlant(3), x: 178, y: 690 },
    { sprite: potPlant(1), x: 128, y: 956 },
    { sprite: potPlant(0), x: 168, y: 956 },
    { sprite: T.wallSprite(110), x: 0, y: 962 },
    { sprite: T.wallSprite(110), x: 186, y: 962 },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: 'nst_mahathat',
    place: 'nst_mahathat',
    area: 'wat',
    w: W,
    h: H,
    skyH: 112,
    ground: '#eadbb8',
    camBias: 0.62,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 124 },
      // Cloister galleries.
      { x: 12, y: 150, w: 272, h: 56 },
      { x: 10, y: 206, w: 38, h: 250 },
      { x: 248, y: 206, w: 38, h: 250 },
      { x: 0, y: 124, w: 12, h: 380 },
      { x: 284, y: 124, w: 12, h: 380 },
      // The chedi base and its little chedis.
      { x: 70, y: 352, w: 156, h: 30 },
      ...MINIS.map(([x, y]) => ({ x: x - 8, y: y - 5, w: 16, h: 6 })),
      // Front gallery wall either side of the court gate.
      { x: 0, y: 470, w: 112, h: 16 },
      { x: 184, y: 470, w: 112, h: 16 },
      { x: 98, y: 494, w: 12, h: 8 },
      { x: 186, y: 494, w: 12, h: 8 },
      // Wihan Luang with its stairs left open.
      { x: 54, y: 560, w: 188, h: 116 },
      { x: 54, y: 676, w: 76, h: 12 },
      { x: 166, y: 676, w: 76, h: 12 },
      { x: 124, y: 688, w: 8, h: 12 },
      { x: 164, y: 688, w: 8, h: 12 },
      { x: 250, y: 630, w: 40, h: 40 },
      { x: URN.x - 10, y: URN.y - 8, w: 20, h: 9 },
      { x: 115, y: 730, w: 14, h: 7 },
      { x: 167, y: 730, w: 14, h: 7 },
      { x: 190, y: 706, w: 12, h: 7 },
      { x: 112, y: 684, w: 12, h: 7 },
      { x: 172, y: 684, w: 12, h: 7 },
      // Stage, stalls, tree and beds.
      { x: 18, y: 778, w: 68, h: 36 },
      { x: 210, y: 772, w: 56, h: 26 },
      { x: 34, y: 882, w: 50, h: 20 },
      { x: 92, y: 918, w: 24, h: 10 },
      { x: 214, y: 892, w: 24, h: 10 },
      { x: 255, y: 936, w: 6, h: 5 },
      { x: RAIN.x - 5, y: RAIN.y - 6, w: 10, h: 7 },
      { x: 46, y: 644, w: 8, h: 5 },
      { x: 100, y: 800, w: 18, h: 36 },
      { x: 178, y: 800, w: 18, h: 36 },
      { x: 267, y: 556, w: 6, h: 5 },
      ...PALMS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      { x: 100, y: 766, w: 16, h: 5 },
      { x: 180, y: 766, w: 16, h: 5 },
      { x: 122, y: 950, w: 12, h: 7 },
      { x: 162, y: 950, w: 12, h: 7 },
      // Outer wall and street.
      { x: 0, y: 948, w: 112, h: 16 },
      { x: 184, y: 948, w: 112, h: 16 },
      { x: 0, y: 972, w: W, h: 38 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      { id: 'chedi', label: 'พระบรมธาตุเจดีย์', hint: 'เวียนเทียนรอบองค์พระธาตุ ยอดทองคำ', icon: 'sparkle', rect: { x: 70, y: 60, w: 156, h: 322 }, at: { x: CX, y: 394 }, face: 'up', marker: { x: CX, y: 290 }, beacon: true, near: 16 },
      { id: 'job:wipe_statues', label: 'เช็ดพระระเบียงคด', hint: 'อาสาเช็ดพระพุทธรูปรอบวิหารคด', icon: 'sparkle', rect: { x: 12, y: 300, w: 36, h: 70 }, at: { x: 58, y: 336 }, face: 'left', marker: { x: 30, y: 300 } },
      { id: 'door:nst_mahathat:viharn', label: 'พระวิหารหลวง', hint: 'เดินเข้าไปกราบพระประธานในวิหาร', icon: 'door', rect: { x: 128, y: 640, w: 40, h: 40 }, at: { x: CX, y: 682 }, face: 'up', marker: { x: CX, y: 636 }, near: 8 },
      { id: 'incense', label: 'กระถางธูปหน้าวิหาร', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 134, y: 712, w: 28, h: 30 }, at: { x: CX, y: 756 }, face: 'up', marker: { x: CX, y: 710 } },
      { id: 'donation', label: 'ตู้ทำบุญบูรณะพระธาตุ', hint: 'ร่วมบุญบูรณะองค์พระธาตุ', icon: 'coin', rect: { x: 188, y: 686, w: 16, h: 28 }, at: { x: 196, y: 722 }, face: 'up', marker: { x: 196, y: 684 } },
      { id: 'big_bell', label: 'หอระฆัง', hint: 'ตีระฆังใหญ่ให้ดังกังวาน', icon: 'bell', rect: { x: 248, y: 580, w: 44, h: 90 }, at: { x: 266, y: 680 }, face: 'up', marker: { x: TOWER.x, y: 578 } },
      { id: 'shop:nst_mahathat_amulet', label: 'แผงพระเครื่อง & หนังตะลุง', hint: 'จตุคามรามเทพ หนังตะลุงจิ๋ว กล้องส่องพระ', icon: 'shop', rect: { x: 210, y: 752, w: 56, h: 46 }, at: { x: 238, y: 808 }, face: 'up', marker: { x: AMULET.x, y: 750 } },
      { id: 'shop:nst_mahathat_khanomla', label: 'ร้านขนมลาป้าจ๋วน', hint: 'ขนมลา ข้าวยำปักษ์ใต้ ชาชัก', icon: 'dessert', rect: { x: 34, y: 860, w: 50, h: 42 }, at: { x: 58, y: 912 }, face: 'up', marker: { x: KHANOM.x, y: 858 } },
      { id: 'job:sweep_leaves', label: 'กวาดใบจามจุรี', hint: 'อาสากวาดใบไม้ใต้ต้นจามจุรี', icon: 'broom', rect: { x: 8, y: 652, w: 60, h: 30 }, at: { x: 32, y: 686 }, face: 'up', marker: { x: 34, y: 650 } },
      { id: 'gate', label: 'ประตูวัด', hint: 'ถนนราชดำเนิน · กลับบ้าน หรือไปวัดอื่น', icon: 'map', rect: { x: 126, y: 900, w: 44, h: 62 }, at: { x: CX, y: 950 }, face: 'down', marker: { x: CX, y: 890 }, near: 12 },
    ],
    spawn: { x: CX, y: 930, face: 'up' },
    entries: { 'nst_mahathat:viharn': { x: CX, y: 692, face: 'down' } },
    pickupSpots: [
      { x: 60, y: 300 },
      { x: 236, y: 300 },
      { x: 110, y: 410 },
      { x: 190, y: 410 },
      { x: 30, y: 530 },
      { x: 266, y: 530 },
      { x: 26, y: 640 },
      { x: 90, y: 760 },
      { x: 200, y: 850 },
      { x: 150, y: 880 },
      { x: 230, y: 930 },
      { x: 150, y: 820 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: CX, y: 240, r: 60, color: '#ffe7a0' },
      { x: CX, y: 120, r: 20, color: '#ffe7a0' },
      { x: CX, y: 650, r: 30 },
      { x: screen.x + screen.w / 2, y: screen.y + screen.h / 2, r: 34, color: '#ffcf7a' },
      { x: URN.x, y: 724, r: 10, color: '#ff9a5a' },
      { x: AMULET.x, y: 780, r: 18, color: '#ffe7a8' },
      { x: KHANOM.x, y: 886, r: 16, color: '#ffe7a8' },
      { x: GATE.x, y: 924, r: 24 },
      { x: TOWER.x, y: 618, r: 12 },
      ...BACK_BAYS.map((x) => ({ x, y: 190, r: 16, color: '#ffcf7a' })),
    ],
    life(s) {
      const glints = [...hooks(chedi, CHEDI, 'glints'), ...hooks(viharn, VIHARN, 'glints'), ...hooks(gate, COURT_GATE, 'glints'), ...hooks(tower, TOWER, 'glints'), ...hooks(amulet, AMULET, 'glints')]
      for (const x of BACK_BAYS) glints.push(...hooks(backBay, { x, y: 204 }, 'glints').filter((_, i) => i % 2 === 0))
      return [
        new Glints(s, glints, 1.6),
        new EaveBells(s, hooks(viharn, VIHARN, 'bells'), VIHARN.y),
        new EaveBells(s, hooks(gate, COURT_GATE, 'bells'), COURT_GATE.y),
        new EaveBells(s, hooks(gate, GATE, 'bells'), GATE.y),
        new EaveBells(s, hooks(tower, TOWER, 'bells'), TOWER.y),
        new TowerBell(s, at(TOWER, tower.hooks.bell[0]).x, at(TOWER, tower.hooks.bell[0]).y, { x: TOWER.x - 20, y: TOWER.y - 88, w: 40, h: 88 }, TOWER.y),
        Flames.candles(s, 122, 736),
        Flames.candles(s, 174, 736),
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 7),
        new Smoke(s, [{ x: KHANOM.x + 11, y: KHANOM.y - 28 }], 2),
        new ShadowPuppets(s, screen, STAGE.y, [
          ['ไอ้เท่งมาแล้วโว้ย!', 'พุงป่องเพราะกินขนมลา ฮ่า ๆ', 'แหลงใต้ให้ฟังหม้าย? หรอยจังฮู้!'],
          ['หนูนุ้ยเองจ้า~', 'ไปไหว้พระธาตุกันเถอะเท่ง', 'ไอ้เท่งเอ้ย อย่าแย่งขนมหนู!'],
          ['ฤาษีเปิดโรง: ขอให้ผู้ชมเป็นสุข~', 'ตึ่ง ตึ่ง ตึ่ง! (เสียงทับ)'],
        ]),
        new Flags(s, [
          { x: 24, y: 482, kind: 'dharma', sortY: 520 },
          { x: 272, y: 482, kind: 'thai', sortY: 520 },
        ]),
        new Gags(s, gags()),
        new Motes(s, { x: 100, y: 150, w: 96, h: 200 }, 0.8),
        new Butterflies(s, [
          { x: 100, y: 800, w: 18, h: 36 },
          { x: 178, y: 800, w: 18, h: 36 },
        ], 4),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [
          { y: 988, dir: 1 },
          { y: 1004, dir: -1 },
        ]),
        new TapZones([
          shakeTree(s, 'rain', RAIN.x, RAIN.y - 10, 84, ['#9ed86a', '#ffb3cf']),
          shakeTree(s, 'fr2', 270, 568, 40, ['#ffc4d8', '#ffe45e'], 'petal'),
          shakeTree(s, 'fr3', 258, 948, 40, ['#ffc4d8', '#ffe45e'], 'petal'),
          {
            // The golden spire twinkles when tapped.
            rect: { x: CX - 12, y: 60, w: 24, h: 170 },
            fn: () => {
              s.particles.sparkles(CX, 120 + rand(-30, 30), 12, '#fff3a6', 14)
              sfx.chime()
            },
          },
          {
            rect: { x: 12, y: 150, w: 272, h: 56 },
            fn: (x) => {
              s.particles.sparkles(x, 180, 5, '#fff3a6', 6)
              sfx.bell(Math.floor(Math.random() * 8))
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.5) s.particles.add({ kind: 'leaf', x: RAIN.x + rand(-40, 40), y: RAIN.y - 70 + rand(-10, 10), vx: rand(-4, 4), vy: rand(6, 10), max: 3, color: '#9ed86a', color2: '#5eae55' })
      if (s.isNight() && Math.random() < dt * 1.2) s.particles.add({ kind: 'sparkle', x: CX + rand(-50, 50), y: rand(140, 300), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 52, y: 390, w: 190, h: 30 },
      { x: 24, y: 510, w: 248, h: 36 },
      { x: 130, y: 710, w: 40, h: 200 },
      { x: 24, y: 750, w: 250, h: 16 },
      { x: 12, y: 560, w: 30, h: 140 },
    ],
    pois: [
      { x: 132, y: 394, face: 'up' },
      { x: 164, y: 394, face: 'up' },
      { x: 58, y: 336, face: 'left' },
      { x: 238, y: 336, face: 'right' },
      { x: 140, y: 756, face: 'up' },
      { x: 156, y: 756, face: 'up' },
      { x: 238, y: 810, face: 'up' },
      { x: 52, y: 838, face: 'up' },
      { x: CX, y: 530, face: 'up' },
    ],
    fireflies: [
      { x: 8, y: 560, w: 40, h: 160 },
      { x: 8, y: 600, w: 50, h: 90 },
    ],
    monkPath: [
      [CX, 700],
      [CX, 760],
      [CX, 948],
      [CX, 990],
      [W + 20, 990],
    ],
    birds: { x: 60, y: 396, w: 180, h: 24 },
    cats: [
      { x: 88, y: 560, pose: 'sleep', color: '#fbf3e4' },
      { x: 272, y: 850, pose: 'loaf', color: '#f5a55a' },
    ],
    novice: { x: 128, y: 780, w: 40, h: 100 },
    vendors: [{ x: 238, y: 780 }],
    dogs: ['somo'],
    visitors: 5,
  }
}
