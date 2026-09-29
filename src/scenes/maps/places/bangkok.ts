// Bangkok places – unique walkable maps for วัดพระแก้ว, วัดโพธิ์, วัดอรุณฯ,
// ศาลพระพรหมเอราวัณ, ภูเขาทอง (วัดสระเกศ) and วัดไตรมิตรฯ, each with at
// least one room you can walk into (`<placeId>:<room>`), signature statues
// and landmarks, place shops, side-job spots and chatty locals.

import type { MapDef, PlacedProp, Hotspot } from '../../world'
import { randomVisitorLook, type WorldScene } from '../../world'
import type { Rect } from '../../pathfind'
import type { AvatarLook } from '../../../art/avatar'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as F from '../../../art/templeprops'
import * as T from '../../../art/temple'
import * as G from '../../../art/garden'
import * as BK from '../../../art/places/bangkok'
import * as WPK from '../../../art/places/bangkok-phrakaew'
import * as INT from '../../../art/places/bangkok-interior'
import * as PHO from '../../../art/places/bangkok-pho'
import * as ARUN from '../../../art/places/bangkok-arun'
import { longtailSprite, drawSkytrain } from '../../../art/cinematic'
import * as ERA from '../../../art/places/bangkok-erawan'
import * as CITY from '../../../art/places/bangkok-city'
import { tukTuk } from '../../../art/props'
import { monkSprite } from '../../../art/characters'
import { drawShadow } from '../../../art/props'
import { drawGlow } from '../../sky'
import { drawPerson, Gags, gagFx, type Gag, type GagPose } from '../../gags'
import { Butterflies, CloudShadows, EaveBells, Flames, Flags, Glints, KoiPond, Lanterns, RackBells, Smoke, SunRays, TapZones, TowerBell, Traffic, type Life } from '../../life'

// ---------------------------------------------------------------------------
// Small helpers shared by every Bangkok map.

type Pt = { x: number; y: number }

function look(o: Partial<AvatarLook>): AvatarLook {
  return { ...randomVisitorLook(), head: null, neck: null, hand: null, ...o }
}

/** Obstacle for a prop footprint centred on x with its base at y. */
function foot(x: number, y: number, w: number, h = 6): Rect {
  return { x: Math.round(x - w / 2), y: Math.round(y - h + 1), w: Math.round(w), h }
}

function hooks(b: BK.Building, name: string, at: Pt): Pt[] {
  return BK.hookAt(b, name, at.x, at.y)
}

/** A tap zone that says its lines in turn (scenery chatter), with an optional effect. */
function talk(s: WorldScene, rect: Rect, lines: string[], fx?: (x: number, y: number) => void) {
  let i = Math.floor(Math.random() * lines.length)
  return {
    rect,
    fn: (x: number, y: number) => {
      s.say(lines[i++ % lines.length], rect.x + rect.w / 2, rect.y - 2)
      fx?.(x, y)
    },
  }
}

/** Shake a tree prop and drop leaves/petals. */
function shakeTree(s: WorldScene, id: string, x: number, y: number, w: number, c: [string, string], kind: 'leaf' | 'petal' = 'leaf') {
  return {
    rect: { x: x - w / 2, y: y - 64, w, h: 46 },
    fn: () => {
      s.shake(id)
      s.drop(x, y - 36, w * 0.7, 6, c[0], c[1], kind)
      if (Math.random() < 0.6) s.burstBirds(x, y - 44, 1 + Math.floor(Math.random() * 3))
      sfx.whoosh()
    },
  }
}

function hs(id: string, label: string, hint: string, icon: string, rect: Rect, at: Pt, face: Hotspot['face'] = 'up', extra: Partial<Hotspot> = {}): Hotspot {
  return { id, label, hint, icon, rect, at, face, marker: { x: rect.x + rect.w / 2, y: rect.y - 3 }, ...extra }
}

/** A person standing still (vendor / guard) drawn as a gag. */
function person(x: number, y: number, lk: AvatarLook, lines: string[], o: Partial<Gag> & { view?: 'front' | 'back' | 'side'; pose?: Parameters<typeof drawPerson>[5] } = {}): Gag {
  return {
    x,
    y,
    lines,
    draw: (g, p) => drawPerson(g, lk, p, o.view ?? 'front', [], p.react > 0 && !o.pose ? undefined : o.pose),
    ...o,
  }
}

// ---------------------------------------------------------------------------
// Wat Phra Kaew (outdoor)

const PK = {
  W: 360,
  H: 1040,
  gallery: 196,
  terrTop: 226,
  terrFront: 388,
  terrFace: 12,
  chedi: { x: 92, y: 360 },
  mondop: { x: 184, y: 336 },
  prasat: { x: 274, y: 364 },
  angkor: { x: 182, y: 384 },
  ubosot: { x: 180, y: 682 },
  bell: { x: 306, y: 560 },
  south: 872,
  gate: { x: 180, y: 872 },
  yakL: { x: 132, y: 912 },
  yakR: { x: 228, y: 912 },
}

function pkGags(): Gag[] {
  const guide = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_polo', bottom: 'bot_black', head: 'head_cap' })
  const followers = [
    look({ gender: 'm', head: 'head_sunhat', top: 'top_hawaii', bottom: 'bot_khaki' }),
    look({ gender: 'f', hand: 'hand_parasol', top: 'top_tee_white', bottom: 'bot_elephant' }),
    look({ gender: 'm', head: 'head_sunglasses', top: 'top_stripe', bottom: 'bot_jeans' }),
    look({ gender: 'f', head: 'head_cap', top: 'top_floral', bottom: 'bot_sarong' }),
  ]
  const guard = look({ gender: 'm', hair: 'hair_buzz', top: 'top_raj', bottom: 'bot_black' })
  const dress = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_tank', bottom: 'bot_sarong' })
  const auntie = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_vendor', bottom: 'bot_sin_mudmee', head: 'head_vendorband' })
  const amulet = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_polo', bottom: 'bot_khaki', head: 'head_glasses' })
  const selfie = look({ gender: 'f', hair: 'hair_long', top: 'top_sabai', bottom: 'bot_jong' })
  const kid = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_lotus', bottom: 'bot_denim_shorts', hand: 'hand_bubbletea' })
  const photog = look({ gender: 'm', hair: 'hair_short', hairColor: 2, top: 'top_flannel', bottom: 'bot_cargo', head: 'head_cap' })
  const royalGuard = (g: Surface, p: GagPose) => {
    drawPerson(g, guard, p, 'front', [], 'stand')
    // Tall white helmet with a red plume.
    g.rect(p.x - 3, p.y - 31, 7, 5, '#fffaf0')
    g.rect(p.x - 4, p.y - 27, 9, 1, '#e8e4ee')
    g.px(p.x, p.y - 33, '#e8514a')
    g.px(p.x, p.y - 32, '#e8514a')
    g.vline(p.x + 5, p.y - 22, p.y - 6, '#8c8187')
    g.px(p.x + 5, p.y - 23, '#e8e4ee')
  }
  return [
    // Tour group following a flag.
    {
      x: 120,
      y: 1000,
      walk: { x0: 70, x1: 290, speed: 7 },
      w: 16,
      h: 36,
      lines: ['ทางนี้ค่ะ~ ตามธงสีชมพูนะคะ', 'This way please! วัดพระแก้วค่ะ', 'อย่าเพิ่งถ่ายรูปนานนะคะ เดี๋ยวหลงกัน!', 'ห้องน้ำอยู่ขวามือค่ะ'],
      draw: (g, p) => {
        const dir = p.flip ? 1 : -1
        followers.forEach((lk, i) => drawPerson(g, lk, { ...p, x: p.x + dir * (12 + i * 10), y: p.y + (i % 2 ? 3 : -2), t: p.t + i * 0.3, react: 0 }, 'front'))
        drawPerson(g, guide, p, 'front')
        const fx = p.x + (p.flip ? -5 : 5)
        g.vline(fx, p.y - 40, p.y - 12, '#8c8187')
        const wave = Math.floor(p.t * 4) % 2
        g.rect(fx + (p.flip ? -7 : 1), p.y - 40 + wave, 6, 4, '#ff6fa0')
        g.px(fx + (p.flip ? -4 : 3), p.y - 39 + wave, '#fffaf0')
      },
    },
    // Royal guard standing perfectly still by the gate.
    {
      x: 104,
      y: 900,
      lines: ['…', '(ไม่ขยับแม้แต่นิดเดียว)', '…(กะพริบตา)', '(ยืนตรงอย่างสง่างาม)'],
      draw: (g, p) => royalGuard(g, { ...p, react: 0 }),
    },
    // Dress-code check.
    person(256, 902, look({ gender: 'f', hair: 'hair_bun', top: 'top_office_f', bottom: 'bot_pencil', neck: 'neck_lanyard' }), [
      'ขาสั้นไม่ได้นะคะ เช่าผ้าถุงด้านหน้าได้เลยค่ะ',
      'Please cover your shoulders, thank you ka~',
      'รองเท้าแตะต้องมีสายรัดส้นนะคะ',
      'แต่งกายสุภาพ เข้าวัดสบายใจค่ะ',
    ]),
    {
      x: 292,
      y: 944,
      lines: ['ใส่ผ้าถุงครั้งแรก เย็นสบายดีแฮะ!', 'Is this... a skirt? Nice!', 'เดินแล้วกลัวหลุดจัง'],
      draw: (g, p) => drawPerson(g, dress, p, 'front'),
    },
    // Ice-cream auntie behind her cart.
    person(58, 952, auntie, ['ไอติมกะทิสด ๆ จ้า เย็นชื่นใจ~', 'ใส่ข้าวเหนียว ลูกชิด ถั่วลิสงไหมลูก?', 'กินในลูกมะพร้าวอร่อยสุด!', 'ร้อน ๆ แบบนี้ต้องไอติมจ้า'], { z: -2 }),
    person(300, 956, amulet, ['พระเครื่องที่ระลึก ของดีวัดพระแก้วครับ', 'พวงกุญแจช้าง ห้าอันร้อยครับ', 'เลือกดูก่อนได้ครับ ไม่ซื้อไม่ว่า'], { z: -2 }),
    {
      x: 150,
      y: 452,
      lines: ['แชะ! สวยทุกมุมเลย', 'ชุดไทยกับวัดพระแก้ว ต้องลงไอจี!', 'ขอถ่ายอีกรูปนะ ยิ้ม~'],
      draw: (g, p) => drawPerson(g, selfie, p, 'back', ['selfie']),
      react: (sc, x, y) => gagFx.flash(sc, x, y),
    },
    {
      x: 86,
      y: 988,
      lines: ['ไอติมกะทิอร่อยที่สุดในโลก!', 'หนาวฟัน~', 'แม่ขาซื้ออีกลูก!'],
      draw: (g, p) => drawPerson(g, kid, p, 'front', ['drink']),
    },
    {
      x: 222,
      y: 790,
      lines: ['ช็อตนี้ต้องติดยอดปรางค์ด้วย', 'แสงกำลังดีเลย!', 'ขยับซ้ายนิดนึงครับ'],
      draw: (g, p) => drawPerson(g, photog, p, 'back', ['selfie']),
      react: (sc, x, y) => gagFx.flash(sc, x, y),
    },
  ]
}

function pkBake(g: Surface, night: boolean) {
  const { W } = PK
  WPK.palaceSkyline(g, 132, W, night)
  // North gallery with the Ramakien murals.
  WPK.galleryBack(g, 0, W, PK.gallery, 3)
  // Courtyard marble.
  BK.marble(g, 22, PK.gallery, W - 44, PK.south - 46 - PK.gallery, 1, 12, 'grey')
  // The raised terrace (ฐานไพที) with the three great monuments.
  const tx0 = 40
  const tx1 = W - 40
  BK.marble(g, tx0, PK.terrTop, tx1 - tx0, PK.terrFront - PK.terrTop, 2, 10, 'white')
  BK.platformFace(g, tx0, PK.terrFront, tx1 - tx0, PK.terrFace, BK.WHITER, BK.BK.redD)
  for (const x of [134, 230]) {
    BK.stairs(g, x, PK.terrFront - 2, PK.terrFront + PK.terrFace + 4, 11, BK.WHITER, 3, 2)
    g.vline(x - 13, PK.terrFront - 4, PK.terrFront + PK.terrFace + 3, BK.GOLD.d)
    g.vline(x + 12, PK.terrFront - 4, PK.terrFront + PK.terrFace + 3, BK.GOLD.D)
  }
  BK.balustrade(g, tx0, 122, PK.terrFront, BK.WHITER, 4)
  BK.balustrade(g, 146, 218, PK.terrFront, BK.WHITER, 4)
  BK.balustrade(g, 242, tx1, PK.terrFront, BK.WHITER, 4)
  BK.blobShadow(g, PK.chedi.x, PK.chedi.y - 6, 44, 8, 0.16)
  BK.blobShadow(g, PK.prasat.x, PK.prasat.y - 6, 50, 8, 0.16)
  // Ubosot enclosure: sema posts and a lotus-mandala in front.
  G.mandala(g, PK.ubosot.x, PK.ubosot.y + 34, 26)
  BK.blobShadow(g, PK.ubosot.x, PK.ubosot.y - 20, 100, 10, 0.15)
  // Side galleries (roofs seen from above).
  WPK.galleryRoofV(g, 0, PK.gallery, PK.south - 30, 22, true)
  WPK.galleryRoofV(g, W - 22, PK.gallery, PK.south - 30, 22, false)
  // Outside: the Grand Palace lawn and the paved approach.
  const oy = PK.south
  G.lawn(g, 0, oy, W, PK.H - oy, 17)
  G.paving(g, 150, oy, 60, PK.H - oy, 10, 'grey')
  G.weather(g, 150, oy, 60, PK.H - oy, 4, 0.6)
  BK.granite(g, 0, PK.H - 58, W, 58, 5)
  G.hedge(g, 0, oy + 70, 120, 5)
  G.hedge(g, 240, oy + 70, 120, 5)
  G.leafLitter(g, 10, oy + 20, 110, 60, 60, 2)
  G.leafLitter(g, 250, oy + 20, 100, 60, 50, 3)
  for (const [x, y] of PK_TREES) G.groundShadow(g, x, y - 4, 30, 7, 0.6)
  G.puddle(g, 190, PK.H - 30, 5, 1.8)
}

const PK_TREES: [number, number][] = [
  [30, 952],
  [330, 952],
]
const PK_TOPI: [number, number, number][] = [
  [110, 944, 0],
  [250, 944, 2],
  [18, 1004, 1],
  [342, 1004, 0],
]
const PK_LAMPS: [number, number][] = [
  [148, 986],
  [212, 986],
  [40, 800],
  [320, 800],
  [40, 430],
  [320, 430],
]

export function watPhraKaewMap(): MapDef {
  const { W, H } = PK
  const chedi = WPK.srirattanaChedi()
  const mondop = WPK.phraMondop()
  const prasat = WPK.prasatThepBidon()
  const prasatN = WPK.prasatThepBidon(true)
  const ubosot = WPK.wpkUbosot()
  const ubosotN = WPK.wpkUbosot(true)
  const bell = WPK.wpkBellTower()
  const gate = WPK.galleryGate()
  const suwL = WPK.suwannaChedi()
  const suwR = WPK.suwannaChedi(true)
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const post = WPK.galleryPost()
  const kinnari = BK.kinnaraSprite()
  const kinnara = BK.kinnaraSprite(true)

  const props: PlacedProp[] = [
    // Gallery posts along the mural walk.
    ...Array.from({ length: 18 }, (_, i) => ({ sprite: post, x: 10 + i * 20, y: PK.gallery })),
    // The terrace monuments.
    { sprite: chedi, x: PK.chedi.x, y: PK.chedi.y, id: 'chedi' },
    { sprite: mondop, x: PK.mondop.x, y: PK.mondop.y },
    { sprite: prasat, night: prasatN, x: PK.prasat.x, y: PK.prasat.y },
    { sprite: suwL, x: 222, y: 384 },
    { sprite: suwR, x: 324, y: 386 },
    { sprite: WPK.angkorModel(), x: PK.angkor.x, y: PK.angkor.y, id: 'angkor' },
    { sprite: kinnari, x: 50, y: 386, id: 'kin1' },
    { sprite: kinnara, x: 114, y: 386, id: 'kin2' },
    { sprite: kinnari, x: 152, y: 386, id: 'kin3' },
    { sprite: kinnara, x: 250, y: 386, id: 'kin4' },
    // The ubosot and its court.
    { sprite: ubosot, night: ubosotN, x: PK.ubosot.x, y: PK.ubosot.y },
    { sprite: BK.singhaSprite(), x: 142, y: 700 },
    { sprite: BK.singhaSprite(true), x: 218, y: 700 },
    { sprite: BK.shoeRack(28), x: 108, y: 694 },
    { sprite: BK.shoeRack(28, false), x: 252, y: 694 },
    { sprite: BK.signBoard('shoes'), x: 86, y: 696 },
    { sprite: BK.signBoard('nophoto'), x: 274, y: 696 },
    { sprite: F.urnSprite(), x: PK.ubosot.x, y: 734, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 150, y: 732 },
    { sprite: F.candleStandSprite(), x: 210, y: 732 },
    { sprite: WPK.lotusBasin(), x: 98, y: 752 },
    { sprite: F.donationSprite(), x: 262, y: 744, shadow: [6, 2] },
    { sprite: WPK.hermitDoctor(), x: 52, y: 622, id: 'hermit' },
    { sprite: bell, x: PK.bell.x, y: PK.bell.y },
    { sprite: BK.salaSprite({ w: 50, roof: BK.ROOF.orange, posts: 'white', floor: 'white' }), x: 52, y: 502 },
    { sprite: T.semaSprite(), x: 72, y: 664 },
    { sprite: T.semaSprite(), x: 288, y: 664 },
    { sprite: T.semaSprite(), x: 72, y: 540 },
    { sprite: T.semaSprite(), x: 288, y: 480 },
    { sprite: G.topiary(0), x: 36, y: 736 },
    { sprite: G.topiary(2), x: 324, y: 736 },
    { sprite: F.offeringSprite(), x: 52, y: 628 },
    // South gallery with the spired gate and the giant guardians.
    { sprite: WPK.galleryOuter(148), x: 0, y: PK.south },
    { sprite: WPK.galleryOuter(148), x: 212, y: PK.south },
    { sprite: gate, x: PK.gate.x, y: PK.gate.y },
    { sprite: BK.giantYaksha('thotsakan'), x: PK.yakL.x, y: PK.yakL.y, id: 'yakL' },
    { sprite: BK.giantYaksha('sahatsadecha'), x: PK.yakR.x, y: PK.yakR.y, id: 'yakR' },
    // Palace lawn.
    ...PK_TREES.map(([x, y], i) => ({ sprite: G.takhianTree(), x, y, id: 'tree' + i })),
    ...PK_TOPI.map(([x, y, v]) => ({ sprite: G.topiary(v), x, y })),
    { sprite: BK.iceCreamCart(), x: 58, y: 964 },
    { sprite: BK.amuletStall(), x: 300, y: 966 },
    { sprite: BK.signBoard('dress'), x: 272, y: 904 },
    { sprite: BK.ticketBooth(), x: 250, y: 1024 },
    { sprite: F.flagPoleSprite(44), x: 128, y: 1024 },
    { sprite: F.flagPoleSprite(44), x: 232, y: 1024 },
    ...PK_LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]

  const obstacles: Rect[] = [
    { x: 0, y: 0, w: W, h: 180 },
    // Gallery posts.
    ...Array.from({ length: 18 }, (_, i) => foot(10 + i * 20, PK.gallery, 6, 4)),
    // Side galleries.
    { x: 0, y: PK.gallery, w: 22, h: PK.south - PK.gallery },
    { x: W - 22, y: PK.gallery, w: 22, h: PK.south - PK.gallery },
    // Terrace: the monuments' footprints and the face except the stairs.
    { x: 40, y: PK.terrTop + 4, w: W - 80, h: 130 },
    { x: 46, y: 330, w: 92, h: 34 },
    { x: 140, y: 300, w: 88, h: 40 },
    { x: 216, y: 330, w: 104, h: 36 },
    { x: 40, y: PK.terrFront - 1, w: 82, h: PK.terrFace + 3 },
    { x: 146, y: PK.terrFront - 1, w: 72, h: PK.terrFace + 3 },
    { x: 242, y: PK.terrFront - 1, w: W - 282, h: PK.terrFace + 3 },
    foot(PK.angkor.x, PK.angkor.y, 60, 12),
    foot(222, 384, 30, 8),
    foot(324, 386, 30, 8),
    ...[50, 114, 152, 250].map((x) => foot(x, 386, 14, 5)),
    // Ubosot.
    { x: 84, y: 560, w: 192, h: 126 },
    { x: 84, y: 686, w: 76, h: 12 },
    { x: 200, y: 686, w: 76, h: 12 },
    foot(142, 700, 16, 6),
    foot(218, 700, 16, 6),
    foot(108, 694, 28, 5),
    foot(252, 694, 28, 5),
    foot(PK.ubosot.x, 734, 20, 7),
    foot(150, 732, 14, 5),
    foot(210, 732, 14, 5),
    foot(98, 752, 30, 8),
    foot(262, 744, 12, 6),
    foot(52, 622, 26, 8),
    foot(PK.bell.x, PK.bell.y, 44, 20),
    { x: 26, y: 470, w: 52, h: 34 },
    foot(72, 664, 12, 5),
    foot(288, 664, 12, 5),
    foot(72, 540, 12, 5),
    foot(288, 480, 12, 5),
    foot(36, 736, 10, 5),
    foot(324, 736, 10, 5),
    foot(86, 696, 6, 3),
    foot(274, 696, 6, 3),
    // South gallery (the gate opening stays free).
    { x: 0, y: PK.south - 40, w: 166, h: 42 },
    { x: 194, y: PK.south - 40, w: 166, h: 42 },
    foot(PK.yakL.x, PK.yakL.y, 40, 10),
    foot(PK.yakR.x, PK.yakR.y, 40, 10),
    // Lawn furniture.
    ...PK_TREES.map(([x, y]) => foot(x, y, 26, 12)),
    ...PK_TOPI.map(([x, y]) => foot(x, y, 10, 5)),
    { x: 0, y: PK.south + 70, w: 120, h: 7 },
    { x: 240, y: PK.south + 70, w: 120, h: 7 },
    foot(58, 964, 44, 10),
    foot(300, 966, 46, 10),
    foot(272, 904, 6, 3),
    foot(250, 1024, 32, 10),
    foot(128, 1024, 6, 4),
    foot(232, 1024, 6, 4),
    ...PK_LAMPS.map(([x, y]) => foot(x, y, 6, 4)),
  ]

  const hotspots: Hotspot[] = [
    hs('door:wat_phra_kaew:ubosot', 'เข้าพระอุโบสถ', 'กราบพระแก้วมรกต (ถอดรองเท้าก่อนนะ)', 'temple', { x: 158, y: 600, w: 44, h: 100 }, { x: PK.ubosot.x, y: 708 }, 'up', { beacon: true, marker: { x: PK.ubosot.x, y: 592 }, near: 14 }),
    hs('incense', 'จุดธูปบูชาพระแก้ว', 'ธูปเทียนดอกบัวหน้าโบสถ์', 'incense', { x: 166, y: 712, w: 28, h: 26 }, { x: PK.ubosot.x, y: 746 }),
    hs('holy_water', 'ขันน้ำมนต์ดอกบัว', 'จุ่มดอกบัวประพรมน้ำมนต์', 'vessel', { x: 82, y: 732, w: 32, h: 24 }, { x: 98, y: 764 }),
    hs('donation', 'ตู้บริจาคบำรุงวัด', 'ร่วมทำบุญบำรุงพระอาราม', 'coin', { x: 254, y: 722, w: 16, h: 24 }, { x: 262, y: 756 }),
    hs('chedi', 'พระศรีรัตนเจดีย์', 'เวียนเทียนรอบเจดีย์ทอง', 'sparkle', { x: 52, y: 170, w: 80, h: 190 }, { x: 92, y: 380 }, 'up', { marker: { x: 92, y: 164 } }),
    hs('bells', 'หอระฆังประดับกระจก', 'ตีระฆังให้ดังไกล', 'bell', { x: 284, y: 452, w: 44, h: 110 }, { x: PK.bell.x - 18, y: 578 }, 'up', { marker: { x: PK.bell.x, y: 448 } }),
    hs('job:arrange_shoes', 'ชั้นวางรองเท้า', 'ช่วยจัดรองเท้าให้เป็นระเบียบ', 'broom', { x: 94, y: 680, w: 28, h: 16 }, { x: 108, y: 706 }),
    hs('job:wipe_statues', 'รูปปั้นกินรีทอง', 'ช่วยเช็ดฝุ่นรูปปั้นให้เงางาม', 'broom', { x: 40, y: 346, w: 22, h: 42 }, { x: 60, y: 404 }, 'up'),
    hs('job:sweep_leaves', 'ใบไม้ใต้ต้นมะขาม', 'ช่วยกวาดลานให้สะอาด', 'broom', { x: 6, y: 880, w: 60, h: 76 }, { x: 44, y: 972 }),
    hs('shop:wat_phra_kaew_icecream', 'ไอติมกะทิป้าศรี', 'ไอติมกะทิในลูกมะพร้าว', 'shop', { x: 36, y: 916, w: 44, h: 48 }, { x: 80, y: 978 }),
    hs('shop:wat_phra_kaew_amulet', 'แผงของที่ระลึก', 'พระเครื่อง พวงกุญแจ ของที่ระลึก', 'shop', { x: 276, y: 922, w: 48, h: 44 }, { x: 282, y: 980 }),
    hs('gate', 'ประตูพระบรมมหาราชวัง', 'กลับบ้าน / ไปที่อื่น', 'map', { x: 150, y: 1000, w: 60, h: 40 }, { x: 180, y: 1030 }, 'down', { near: 12 }),
  ]

  return {
    id: 'wat_phra_kaew',
    place: 'wat_phra_kaew',
    area: 'wat',
    w: W,
    h: H,
    skyH: 130,
    ground: '#e2dfdc',
    camBias: 0.62,
    bake: pkBake,
    props,
    obstacles,
    hotspots,
    entries: { 'wat_phra_kaew:ubosot': { x: PK.ubosot.x, y: 716, face: 'down' } },
    spawn: { x: 180, y: 1010, face: 'up' },
    pickupSpots: [
      { x: 60, y: 210 },
      { x: 300, y: 212 },
      { x: 30, y: 460 },
      { x: 330, y: 470 },
      { x: 120, y: 420 },
      { x: 250, y: 430 },
      { x: 40, y: 790 },
      { x: 320, y: 780 },
      { x: 130, y: 800 },
      { x: 110, y: 1010 },
      { x: 300, y: 1010 },
      { x: 20, y: 900 },
    ],
    lights: [
      ...PK_LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: PK.ubosot.x, y: 620, r: 44 },
      { x: PK.ubosot.x - 60, y: 630, r: 18 },
      { x: PK.ubosot.x + 60, y: 630, r: 18 },
      { x: PK.chedi.x, y: 290, r: 40, color: '#ffe7a0' },
      { x: PK.prasat.x, y: 300, r: 34, color: '#ffe7a0' },
      { x: PK.mondop.x, y: 280, r: 30, color: '#ffe7a0' },
      { x: PK.ubosot.x, y: 724, r: 10, color: '#ff9a5a' },
      { x: PK.gate.x, y: 820, r: 26 },
      { x: 58, y: 930, r: 14, color: '#ffb3cf' },
      { x: 300, y: 934, r: 14, color: '#ffcf7a' },
    ],
    life(s) {
      const glints = [
        ...hooks(chedi, 'glints', PK.chedi),
        ...hooks(mondop, 'glints', PK.mondop),
        ...hooks(prasat, 'glints', PK.prasat),
        ...hooks(ubosot, 'glints', PK.ubosot),
        ...hooks(gate, 'glints', PK.gate),
        ...hooks(bell, 'glints', PK.bell),
        ...hooks(suwL, 'glints', { x: 222, y: 384 }),
        ...hooks(suwR, 'glints', { x: 324, y: 386 }),
      ]
      const murals = [
        'ทศกัณฐ์ลักพานางสีดาไปกรุงลงกา',
        'หนุมานถวายแหวนแด่นางสีดา',
        'พระรามจองถนนข้ามมหาสมุทร',
        'หนุมานเผากรุงลงกา ไฟลุกท่วม!',
        'ศึกพรหมาสตร์ – อินทรชิตแผลงศร',
        'พิเภกถวายตัวต่อพระราม',
        'จิตรกรรมรามเกียรติ์ 178 ห้อง ยาวรอบระเบียง',
      ]
      const bellTop = hooks(bell, 'bell', PK.bell)[0]
      const lifes: Life[] = [
        new Glints(s, glints, 1.6),
        new EaveBells(s, hooks(ubosot, 'bells', PK.ubosot), PK.ubosot.y),
        new EaveBells(s, hooks(prasat, 'bells', PK.prasat), PK.prasat.y),
        new EaveBells(s, hooks(bell, 'bells', PK.bell), PK.bell.y),
        new TowerBell(s, bellTop.x, bellTop.y, { x: PK.bell.x - 16, y: PK.bell.y - 80, w: 32, h: 30 }, PK.bell.y),
        ...hooks(ubosot, 'candles', PK.ubosot).map((c) => new Flames(s, [c], PK.ubosot.y)),
        Flames.candles(s, 150, 732),
        Flames.candles(s, 210, 732),
        new Smoke(s, [{ x: PK.ubosot.x, y: 720 }], 8),
        new Flags(s, [
          { x: 128, y: 980, kind: 'thai', sortY: 1024 },
          { x: 232, y: 980, kind: 'dharma', sortY: 1024 },
        ]),
        new Butterflies(s, [
          { x: 10, y: 890, w: 120, h: 60 },
          { x: 240, y: 890, w: 110, h: 60 },
        ], 4),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Gags(s, pkGags()),
        new TapZones([
          ...Array.from({ length: 8 }, (_, i) => talk(s, { x: i * 45, y: 150, w: 45, h: 30 }, [murals[(i * 3) % murals.length], murals[(i * 3 + 1) % murals.length]])),
          talk(s, { x: PK.yakL.x - 18, y: PK.yakL.y - 94, w: 36, h: 86 }, ['ข้าคือทศกัณฐ์! เฝ้าประตูนี้มากว่าสองร้อยปี', 'ฮ่า ๆ ๆ ไม่ต้องกลัว ยักษ์ใจดี', 'ใส่ขาสั้นห้ามผ่าน! …ล้อเล่น'], () => {
            s.shake('yakL')
            sfx.bigBell()
          }),
          talk(s, { x: PK.yakR.x - 18, y: PK.yakR.y - 94, w: 36, h: 86 }, ['สหัสเดชะผู้มีพันหน้า! (โชว์แค่หน้าเดียว)', 'ยืนนานขาเมื่อยเหมือนกันนะ', 'เข้าไปกราบพระแก้วให้ได้บุญเยอะ ๆ'], () => {
            s.shake('yakR')
            sfx.bigBell()
          }),
          talk(s, { x: PK.angkor.x - 32, y: PK.angkor.y - 46, w: 64, h: 44 }, ['นครวัดจำลอง สร้างสมัยรัชกาลที่ 4', 'ย่อส่วนมาให้ชมถึงที่เลย', 'ปราสาทหินหกองค์… นับได้ไหม?'], (x, y) => s.particles.sparkles(x, y, 6, '#fff3a6', 6)),
          talk(s, { x: 40, y: 594, w: 26, h: 30 }, ['ขอให้สุขภาพแข็งแรงนะลูก', 'หมอชีวกฯ บิดาแห่งการแพทย์แผนไทย', 'กินผักเยอะ ๆ นอนให้พอ'], (x, y) => s.particles.hearts(x, y, 2)),
          ...[50, 114, 152, 250].map((x, i) =>
            talk(s, { x: x - 10, y: 346, w: 20, h: 40 }, [i % 2 ? 'กินนร ครึ่งคนครึ่งหงส์' : 'กินรีร่ายรำอยู่หน้าฐาน', 'วิ้ง~ ทองอร่าม'], () => {
              s.shake('kin' + (i + 1))
              s.particles.sparkles(x, 356, 6, '#fff3a6', 6)
              sfx.chime()
            }),
          ),
          {
            rect: { x: PK.chedi.x - 30, y: PK.chedi.y - 196, w: 60, h: 160 },
            fn: () => {
              s.particles.sparkles(PK.chedi.x - 2, PK.chedi.y - 150, 12, '#fff3a6', 12)
              sfx.chime()
            },
          },
          ...PK_TREES.map(([x, y], i) => shakeTree(s, 'tree' + i, x, y, 70, ['#5eae55', '#3f8a4f'])),
        ]),
      ]
      return lifes
    },
    ambient(s, dt) {
      if (s.isNight() && Math.random() < dt * 1.4) s.particles.add({ kind: 'sparkle', x: rand(40, 320), y: rand(180, 360), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
      if (Math.random() < dt * 0.4) {
        const [x, y] = PK_TREES[Math.floor(Math.random() * PK_TREES.length)]
        s.particles.add({ kind: 'leaf', x: x + rand(-30, 30), y: y - 60 + rand(-10, 10), vx: rand(-4, 4), vy: rand(6, 11), max: rand(2.5, 3.5), color: '#6cb85c', color2: '#3f8a4f' })
      }
    },
    wander: [
      { x: 30, y: 404, w: 300, h: 40 },
      { x: 30, y: 710, w: 300, h: 80 },
      { x: 60, y: 880, w: 240, h: 110 },
      { x: 20, y: 184, w: 320, h: 8 },
    ],
    pois: [
      { x: 172, y: 746, face: 'up' },
      { x: 190, y: 748, face: 'up' },
      { x: 160, y: 712, face: 'up' },
      { x: 200, y: 712, face: 'up' },
      { x: 92, y: 380, face: 'up' },
      { x: 182, y: 398, face: 'up' },
      { x: 60, y: 190, face: 'up' },
      { x: 200, y: 190, face: 'up' },
      { x: 300, y: 190, face: 'up' },
      { x: 98, y: 764, face: 'up' },
      { x: 180, y: 930, face: 'up' },
      { x: 80, y: 980, face: 'up' },
    ],
    birds: { x: 170, y: 930, w: 60, h: 40 },
    cats: [{ x: 330, y: 780, pose: 'sleep', color: '#fbf3e4' }],
    dogs: [],
    visitors: 11,
  }
}

// ---------------------------------------------------------------------------
// Interiors: shared room shell (ceiling, mural back wall, side walls, floor).

interface RoomOpts {
  w: number
  h: number
  wallH: number
  side?: number
  ceiling?: string
  mural?: 'red' | 'cream' | 'blue'
  sideColor?: string
  floor?: 'marble' | 'teak' | 'terrazzo'
  carpet?: { x: number; y: number; w: number; h: number; c?: string }
  seed?: number
}

function roomShell(g: Surface, o: RoomOpts & { doorX?: number }) {
  const side = o.side ?? 14
  INT.templeFloor(g, 0, o.wallH, o.w, o.h - o.wallH, o.floor ?? 'marble', o.seed ?? 0)
  INT.muralWall(g, side, 14, o.w - side * 2, o.wallH - 20, o.seed ?? 0, o.mural ?? 'cream')
  // Dado along the bottom of the back wall.
  g.rect(side, o.wallH - 6, o.w - side * 2, 6, '#6e1a26')
  g.hline(side, o.w - side - 1, o.wallH - 6, BK.GOLD.d)
  for (let x = side + 2; x < o.w - side; x += 5) g.px(x, o.wallH - 3, BK.GOLD.b)
  INT.starCeiling(g, 0, 0, o.w, 14, o.ceiling)
  INT.sideWall(g, 0, 14, o.h - 10, side, o.sideColor ?? '#7e2436')
  INT.sideWall(g, o.w - side, 14, o.h - 10, side, o.sideColor ?? '#7e2436')
  // Wall shadow onto the floor.
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(58,40,56,0.18)'
  g.ctx.fillRect(side, o.wallH, o.w - side * 2, 3)
  g.ctx.fillRect(side, o.wallH, 3, o.h - o.wallH)
  g.ctx.fillRect(o.w - side - 3, o.wallH, 3, o.h - o.wallH)
  g.ctx.restore()
  if (o.carpet) INT.carpet(g, o.carpet.x, o.carpet.y, o.carpet.w, o.carpet.h, o.carpet.c)
  // Doorway threshold at the bottom.
  const dx = o.doorX ?? o.w / 2
  g.rect(dx - 16, o.h - 8, 32, 8, '#3a2838')
  g.rect(dx - 14, o.h - 8, 28, 2, '#fff1c8')
  g.hline(dx - 16, dx + 15, o.h - 9, BK.GOLD.d)
}

/** Dust motes floating in the light, and occasional sparkles on gold. */
function motes(s: WorldScene, dt: number, area: Rect, rate = 1.2) {
  if (Math.random() < dt * rate) s.particles.add({ kind: 'dot', x: rand(area.x, area.x + area.w), y: rand(area.y, area.y + area.h), vx: rand(-2, 2), vy: rand(-3, 1), max: rand(2, 4), color: '#fff3c8' })
}

/** Chandeliers drawn over everything with a warm glow. */
function chandeliers(s: WorldScene, pts: Pt[]): Life {
  const spr = INT.chandelierSprite()
  return {
    over: (g) => {
      for (const p of pts) if (s.onScreen(p.x, p.y + 20, 40)) g.draw(spr.canvas, p.x - spr.ax, p.y - spr.ay)
    },
    glow: (g, t) => {
      for (const [i, p] of pts.entries()) {
        if (!s.onScreen(p.x, p.y + 20, 40)) continue
        drawGlow(g, p.x, p.y + 20, 26, 0.55 + Math.sin(t * 2 + i) * 0.05, '#fff0c8')
        if (Math.random() < 0.05) s.particles.add({ kind: 'sparkle', x: p.x + rand(-12, 12), y: p.y + rand(8, 34), vy: rand(-4, 2), max: rand(0.5, 1), color: '#ffffff', drag: 0.5 })
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Wat Phra Kaew: inside the ubosot of the Emerald Buddha.

function pkUbosotMap(): MapDef {
  const W = 260
  const H = 400
  const throne = INT.emeraldThrone()
  const TH = { x: 130, y: 238 }
  const pillar = INT.paintedPillar(250, 'mosaic')
  const pillars: Pt[] = [
    { x: 30, y: 300 },
    { x: 230, y: 300 },
    { x: 30, y: 372 },
    { x: 230, y: 372 },
  ]
  const worship: [number, number, 'kneel' | 'wai' | 'bow'][] = [
    [96, 300, 'kneel'],
    [118, 304, 'wai'],
    [150, 302, 'kneel'],
    [172, 306, 'bow'],
    [84, 330, 'wai'],
    [196, 328, 'kneel'],
    [136, 334, 'kneel'],
  ]
  const looks = worship.map((_, i) => look({ gender: i % 2 ? 'm' : 'f', top: ['top_white', 'top_mohom', 'top_thaisilk', 'top_polo'][i % 4], bottom: ['bot_skirt', 'bot_black', 'bot_sin_mudmee', 'bot_slacks_grey'][i % 4] }))
  const staff = look({ gender: 'f', hair: 'hair_bun', top: 'top_office_f', bottom: 'bot_pencil', neck: 'neck_lanyard' })
  const tourist = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_hawaii', bottom: 'bot_sarong', head: 'head_sunglasses' })
  const kid = look({ gender: 'f', hair: 'hair_twin', top: 'top_school_f', bottom: 'bot_school_skirt' })
  const gags: Gag[] = [
    ...worship.map(([x, y, pose], i) => ({
      x,
      y,
      lines: ['(สวดมนต์เบา ๆ) อิติปิโส…', '(กราบสามครั้ง)', 'ขอให้ครอบครัวแข็งแรง…', '(อธิษฐานในใจ)'],
      draw: (g: Surface, p: GagPose) => drawPerson(g, looks[i], p, 'back', [], pose),
    })),
    person(220, 360, staff, ['ห้ามถ่ายรูปในพระอุโบสถนะคะ', 'นั่งพับเพียบ อย่าชี้เท้าไปทางพระนะคะ', 'เชิญกราบพระแก้วได้เลยค่ะ'], { z: 0 }),
    {
      x: 64,
      y: 350,
      lines: ['ขอถ่ายรูปแค่รูปเดียว…', 'อุ๊ย ห้ามถ่ายเหรอครับ ขอโทษครับ!', '(เก็บกล้องอย่างเร็ว)'],
      draw: (g, p) => drawPerson(g, tourist, p, 'back', p.react > 0 ? [] : ['selfie']),
      react: (sc) => sc.say('ห้ามถ่ายรูปค่ะ~', 220, 330),
    },
    person(170, 350, kid, ['แม่… พระแก้วอยู่ข้างบนสุดเลย!', 'องค์เล็กนิดเดียว แต่สวยจัง', 'ชุดทรงเปลี่ยนตามฤดูด้วยนะ!'], { view: 'back' }),
  ]
  const candles = [INT.floorCandle(), INT.floorCandle()]
  const props: PlacedProp[] = [
    { sprite: throne, x: TH.x, y: TH.y },
    { sprite: INT.crownedBuddha(), x: 44, y: 218 },
    { sprite: INT.crownedBuddha(true), x: 216, y: 218 },
    { sprite: candles[0], x: 84, y: 246 },
    { sprite: candles[1], x: 176, y: 246 },
    { sprite: INT.altarTable(46), x: TH.x, y: 262 },
    { sprite: INT.altarTable(30, false), x: 86, y: 266 },
    { sprite: INT.altarTable(30, false), x: 174, y: 266 },
    { sprite: F.donationSprite(), x: 222, y: 286, shadow: [6, 2] },
    { sprite: BK.signBoard('nophoto'), x: 40, y: 290 },
    ...pillars.map((p) => ({ sprite: pillar, x: p.x, y: p.y })),
  ]
  return {
    id: 'wat_phra_kaew:ubosot',
    place: 'wat_phra_kaew',
    area: 'wat',
    indoor: true,
    indoorLight: 0.85,
    w: W,
    h: H,
    skyH: 0,
    ground: '#f2ede6',
    camBias: 0.55,
    bake: (g) => roomShell(g, { w: W, h: H, wallH: 150, mural: 'red', carpet: { x: 110, y: 262, w: 40, h: 130 }, seed: 7 }),
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 156 },
      { x: 0, y: 0, w: 16, h: H },
      { x: W - 16, y: 0, w: 16, h: H },
      { x: 62, y: 150, w: 136, h: 92 },
      foot(44, 218, 26, 60),
      foot(216, 218, 26, 60),
      foot(84, 246, 8, 5),
      foot(176, 246, 8, 5),
      foot(TH.x, 262, 46, 10),
      foot(86, 266, 30, 8),
      foot(174, 266, 30, 8),
      foot(222, 286, 12, 6),
      foot(40, 290, 6, 3),
      ...pillars.map((p) => foot(p.x, p.y, 10, 6)),
      { x: 0, y: H - 6, w: W / 2 - 18, h: 6 },
      { x: W / 2 + 18, y: H - 6, w: W / 2 - 18, h: 6 },
    ],
    hotspots: [
      hs('pray', 'กราบพระแก้วมรกต', 'สวดมนต์ อธิษฐานต่อพระพุทธมหามณีรัตนปฏิมากร', 'pray', { x: 100, y: 200, w: 60, h: 80 }, { x: TH.x, y: 284 }, 'up', { beacon: true, marker: { x: TH.x, y: 60 } }),
      hs('donation', 'ตู้ทำบุญในโบสถ์', 'ร่วมบุญบำรุงพระอาราม', 'coin', { x: 214, y: 264, w: 16, h: 24 }, { x: 222, y: 298 }),
      hs('job:mop_floor', 'พื้นหินอ่อนในโบสถ์', 'ช่วยถูพื้นให้เงาวับ', 'broom', { x: 40, y: 330, w: 40, h: 40 }, { x: 60, y: 372 }),
      hs('door:wat_phra_kaew', 'ออกจากพระอุโบสถ', 'กลับไปลานวัด', 'map', { x: W / 2 - 16, y: H - 20, w: 32, h: 20 }, { x: W / 2, y: H - 6 }, 'down', { near: 10 }),
    ],
    entries: { wat_phra_kaew: { x: W / 2, y: H - 22, face: 'up' } },
    spawn: { x: W / 2, y: H - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: TH.x, y: 90, r: 50, color: '#fff0c8' },
      { x: TH.x, y: 170, r: 40, color: '#ffe7a0' },
      { x: 44, y: 170, r: 22, color: '#ffe7a0' },
      { x: 216, y: 170, r: 22, color: '#ffe7a0' },
      { x: 84, y: 214, r: 10, color: '#ffb35a' },
      { x: 176, y: 214, r: 10, color: '#ffb35a' },
    ],
    life(s) {
      return [
        new Glints(s, hooks(throne, 'glints', TH), 2.2),
        new Flames(s, [
          { x: 84, y: 246 - 34 },
          { x: 176, y: 246 - 34 },
        ]),
        chandeliers(s, [
          { x: 72, y: 150 },
          { x: 188, y: 150 },
        ]),
        new Gags(s, gags),
        new TapZones([
          talk(s, { x: TH.x - 16, y: 60, w: 32, h: 50 }, ['พระแก้วมรกต ประดิษฐานบนบุษบกทองคำ', 'ชุดทรงฤดูร้อน ประดับเพชรพลอยงามระยับ', 'พระพุทธรูปคู่บ้านคู่เมืองไทย'], (x, y) => s.particles.sparkles(x, y, 8, '#b6f5cf', 8)),
          talk(s, { x: 30, y: 130, w: 28, h: 90 }, ['พระพุทธยอดฟ้าจุฬาโลก', 'ทรงเครื่องต้นอย่างกษัตริย์'], (x, y) => s.particles.sparkles(x, y, 6, '#fff3a6', 6)),
          talk(s, { x: 202, y: 130, w: 28, h: 90 }, ['พระพุทธเลิศหล้านภาลัย', 'ทองคำทั้งองค์ งามมาก'], (x, y) => s.particles.sparkles(x, y, 6, '#fff3a6', 6)),
        ]),
      ]
    },
    ambient(s, dt) {
      motes(s, dt, { x: 60, y: 60, w: 140, h: 220 }, 2)
    },
    wander: [{ x: 70, y: 290, w: 120, h: 70 }],
    pois: [
      { x: 110, y: 290, face: 'up' },
      { x: 150, y: 292, face: 'up' },
      { x: 130, y: 320, face: 'up' },
    ],
    dogs: [],
    visitors: 2,
  }
}

// ---------------------------------------------------------------------------
// Wat Pho (outdoor)

const PO = {
  W: 340,
  H: 1000,
  viharn: { x: 140, y: 300 },
  plat: { top: 372, front: 548, face: 10 },
  chedis: [
    { tone: 'green' as const, x: 70, y: 524 },
    { tone: 'white' as const, x: 136, y: 504 },
    { tone: 'yellow' as const, x: 204, y: 504 },
    { tone: 'blue' as const, x: 270, y: 524 },
  ],
  pond: [
    [72, 652, 46, 20],
    [40, 684, 24, 12],
    [104, 682, 26, 13],
  ] as [number, number, number, number][],
  bodhi: { x: 298, y: 640 },
  sala: { x: 278, y: 776 },
  cloister: { x: 144, y: 716, len: 102 },
  wall: 900,
  gate: { x: 170, y: 900 },
}

const PO_RAI: [number, number, number][] = [
  [104, 542, 0],
  [170, 512, 1],
  [238, 542, 2],
  [284, 214, 3],
  [306, 232, 0],
  [326, 214, 1],
  [296, 262, 2],
  [318, 280, 3],
  [22, 344, 1],
  [318, 344, 2],
]
const PO_LAMPS: [number, number][] = [
  [110, 336],
  [230, 336],
  [150, 872],
  [190, 872],
  [30, 780],
  [140, 780],
]

function poGags(): Gag[] {
  const masseuse = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_pakaoma', bottom: 'bot_fisherman', neck: 'neck_lanyard' })
  const tuk = look({ gender: 'm', hair: 'hair_short', top: 'top_hawaii_elephant', bottom: 'bot_khaki', head: 'head_sunglasses' })
  const school = [0, 1, 2].map((i) => look({ gender: i % 2 ? 'f' : 'm', top: i % 2 ? 'top_school_f' : 'top_school_m', bottom: i % 2 ? 'bot_school_skirt' : 'bot_school_navy', hair: i % 2 ? 'hair_schoolgirl' : 'hair_buzz' }))
  const teacher = look({ gender: 'f', hair: 'hair_bob', top: 'top_office_f', bottom: 'bot_skirt', head: 'head_glasses' })
  const balm = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', bottom: 'bot_sin_mudmee' })
  const yoga = look({ gender: 'm', hair: 'hair_long', hairColor: 3, top: 'top_tank', bottom: 'bot_elephant' })
  return [
    {
      x: 250,
      y: 800,
      walk: { x0: 236, x1: 316, speed: 6 },
      lines: ['นวดไหมคะ~ นวดแผนไทยต้นตำรับวัดโพธิ์!', 'ปวดหลังไหมคะ? กดจุดนิดเดียวหายเลย', 'นวดเท้า 30 นาที สบายจนหลับเลยค่ะ', 'อุ๊ย เส้นตึงมาก! ต้องนวดด่วน~'],
      draw: (g, p) => drawPerson(g, masseuse, p, 'front'),
      react: (sc, x, y) => {
        sc.particles.hearts(x, y - 26, 2)
        sfx.hum(2)
      },
    },
    {
      x: 276,
      y: 766,
      w: 30,
      h: 16,
      lines: ['โอ๊ย… สบาย… อั๊ก!', 'ตรงนั้นแหละ… อ๊าย!', 'Oh my god… so good…', 'ครอก… ฟี้… (หลับไปแล้ว)'],
      draw: () => undefined,
      react: (sc, x, y) => sc.particles.add({ kind: 'sparkle', x, y: y - 10, vy: -8, max: 0.8, color: '#ffffff' }),
    },
    {
      x: 206,
      y: 952,
      w: 34,
      h: 26,
      lines: ['ตุ๊ก ๆ ครับ! ไปท่าเตียนข้ามฟากวัดอรุณฯ ไหม', 'ไปวัดพระแก้วต่อ ใกล้นิดเดียว', 'ปรื๊นนน~ ขึ้นมาเลยครับ'],
      draw: (g, p) => {
        drawPerson(g, tuk, { ...p, x: p.x + 18 }, 'front')
      },
    },
    {
      x: 60,
      y: 820,
      walk: { x0: 30, x1: 150, speed: 9 },
      w: 16,
      lines: ['เดินเป็นแถวนะนักเรียน!', 'ใครจำได้ พระนอนยาวกี่เมตร?', '46 เมตรค่ะคุณครู!'],
      draw: (g, p) => {
        const dir = p.flip ? 1 : -1
        school.forEach((lk, i) => drawPerson(g, lk, { ...p, x: p.x + dir * (11 + i * 9), y: p.y + (i % 2 ? 2 : -1), t: p.t + i * 0.4, react: 0 }, 'front'))
        drawPerson(g, teacher, p, 'front')
      },
    },
    person(48, 846, balm, ['ยาหม่องวัดโพธิ์ หอมเย็นชื่นใจจ้า', 'ลูกประคบสมุนไพร ช่วยคลายปวดเมื่อย', 'ทาขมับนิดเดียว สดชื่นทั้งวัน!'], { z: -2 }),
    {
      x: 150,
      y: 610,
      lines: ['ท่าฤๅษีดัดตน ยืดหลังดีมาก…', 'โอ๊ย! ขาติดคอแล้ว ใครช่วยที', 'ฝึกตามรูปปั้นฤๅษี 80 ท่า!'],
      draw: (g, p) => drawPerson(g, yoga, p, 'front', [], p.react > 0 ? 'happy' : Math.floor(p.t * 0.7) % 2 ? 'wai' : 'offer'),
    },
  ]
}

function poBake(g: Surface, night: boolean) {
  const { W, H } = PO
  G.treeLine(g, 96, W, G.LEAVES.far, 7)
  G.treeLine(g, 110, W, G.LEAVES.deep, 11)
  // Distant roofs of the royal quarter.
  g.poly(
    [
      [240, 104],
      [262, 70],
      [284, 104],
    ],
    night ? '#8a7a70' : '#e89a5a',
  )
  g.vline(262, 56, 70, night ? '#c9b070' : '#f0d890')
  BK.granite(g, 0, 120, W, PO.wall - 120, 3)
  G.weather(g, 0, 120, W, PO.wall - 120, 5, 0.5)
  // Great chedi platform.
  BK.marble(g, 30, PO.plat.top, W - 60, PO.plat.front - PO.plat.top, 4, 12, 'white')
  BK.platformFace(g, 30, PO.plat.front, W - 60, PO.plat.face, BK.WHITER, BK.BK.redD)
  BK.stairs(g, 170, PO.plat.front - 2, PO.plat.front + PO.plat.face + 5, 12, BK.WHITER, 3, 2)
  BK.balustrade(g, 30, 156, PO.plat.front, BK.WHITER, 4)
  BK.balustrade(g, 184, W - 30, PO.plat.front, BK.WHITER, 4)
  for (const c of PO.chedis) BK.blobShadow(g, c.x, c.y - 4, 30, 6, 0.14)
  // Khao Mor pond garden with lawn around.
  G.lawn(g, 0, 596, 140, 150, 9)
  G.pondBed(g, PO.pond)
  for (const [x, y, r] of [
    [38, 646, 3],
    [96, 660, 2.5],
    [30, 686, 2.5],
    [116, 688, 3],
    [80, 640, 2],
  ] as [number, number, number][])
    G.lilyPad(g, x, y, r, x)
  G.reeds(g, 18, 668, 5)
  G.reeds(g, 128, 676, 4)
  // Bodhi tree platform.
  G.lawn(g, 244, 590, 96, 110, 13)
  g.ellipse(PO.bodhi.x, PO.bodhi.y + 4, 30, 9, '#d8d0cb')
  g.ellipse(PO.bodhi.x, PO.bodhi.y + 3, 28, 8, '#efe8e0')
  G.leafLitter(g, 250, 610, 90, 70, 60, 4)
  // Massage sala lawn edge and the approach path.
  G.paving(g, 150, 580, 40, PO.wall - 580, 8, 'grey')
  G.flowerBed(g, 150, 780, 8, 70, ['#ff9fc0', '#fffaf0', '#e8514a'], 1)
  G.flowerBed(g, 184, 780, 8, 70, ['#f58f35', '#ffd23f'], 2)
  G.mandala(g, 170, 350, 20)
  // Street outside the wall.
  BK.sidewalk(g, 0, PO.wall, W, 30, 2)
  BK.kerbStripes(g, 0, PO.wall + 28, W, '#fffaf0', '#e8514a')
  BK.asphalt(g, 0, PO.wall + 30, W, 42, { lanes: 2, seed: 4 })
  BK.kerbStripes(g, 0, PO.wall + 72, W, '#fffaf0', '#e8514a')
  BK.sidewalk(g, 0, PO.wall + 74, W, H - PO.wall - 74, 3)
  G.puddle(g, 60, PO.wall + 14, 5, 1.6)
}

function watPhoMap(): MapDef {
  const { W, H } = PO
  const viharn = PHO.recliningViharn()
  const viharnN = PHO.recliningViharn(true)
  const chedis = PO.chedis.map((c) => PHO.greatChedi(c.tone))
  const gate = WPK.galleryGate()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const doorX = PO.viharn.x - 126 + 136
  const props: PlacedProp[] = [
    { sprite: viharn, night: viharnN, x: PO.viharn.x, y: PO.viharn.y },
    ...PO.chedis.map((c, i) => ({ sprite: chedis[i], x: c.x, y: c.y })),
    ...PO_RAI.map(([x, y, v]) => ({ sprite: PHO.smallChedi(v), x, y })),
    { sprite: BK.shoeRack(28), x: doorX - 26, y: 316 },
    { sprite: BK.shoeRack(28, false), x: doorX + 26, y: 316 },
    { sprite: BK.signBoard('shoes'), x: doorX - 46, y: 318 },
    { sprite: F.urnSprite(), x: 170, y: 356, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 146, y: 354 },
    { sprite: F.candleStandSprite(), x: 194, y: 354 },
    { sprite: BK.stoneGuardian('warrior'), x: 150, y: 562 },
    { sprite: BK.stoneGuardian('warrior', true), x: 190, y: 562 },
    // Khao Mor garden.
    { sprite: PHO.rockery(0), x: 70, y: 656 },
    { sprite: PHO.rockery(1), x: 106, y: 690 },
    { sprite: PHO.tortoise(), x: 46, y: 694 },
    { sprite: BK.hermitSprite(0), x: 16, y: 626 },
    { sprite: BK.hermitSprite(1), x: 130, y: 624 },
    { sprite: BK.hermitSprite(2), x: 18, y: 726 },
    { sprite: BK.hermitSprite(3), x: 126, y: 730 },
    // Cloister of gilded Buddhas.
    { sprite: PHO.buddhaCloister(PO.cloister.len), x: PO.cloister.x - PO.cloister.len / 2, y: PO.cloister.y },
    // Bodhi tree and the massage sala.
    { sprite: G.bodhiTree2(), x: PO.bodhi.x, y: PO.bodhi.y, id: 'bodhi' },
    { sprite: BK.salaSprite({ w: 84, roof: BK.ROOF.orange, mats: true }), x: PO.sala.x, y: PO.sala.y },
    { sprite: PHO.massageMat(0), x: 262, y: 766 },
    { sprite: PHO.massageMat(1), x: 298, y: 766 },
    { sprite: BK.signBoard('info'), x: 238, y: 790 },
    // Entrance court.
    { sprite: BK.balmStall(), x: 56, y: 858 },
    { sprite: BK.drinkCart(), x: 112, y: 860 },
    { sprite: BK.ticketBooth(), x: 290, y: 866 },
    { sprite: BK.stoneGuardian('farang'), x: 132, y: 896 },
    { sprite: BK.stoneGuardian('scholar', true), x: 208, y: 896 },
    { sprite: T.wallSprite(148), x: 0, y: PO.wall },
    { sprite: T.wallSprite(148), x: 192, y: PO.wall },
    { sprite: gate, x: PO.gate.x, y: PO.gate.y },
    { sprite: G.coconutPalm(0), x: 14, y: 360 },
    { sprite: G.frangipani(2), x: 26, y: 580 },
    { sprite: G.frangipani(1), x: 226, y: 588 },
    { sprite: G.topiary(1), x: 320, y: 872 },
    { sprite: G.coconutPalm(1), x: 330, y: 998 },
    ...PO_LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const obstacles: Rect[] = [
    { x: 0, y: 0, w: W, h: 124 },
    { x: 16, y: 240, w: 250, h: 62 },
    ...PO_RAI.map(([x, y]) => foot(x, y, 18, 8)),
    { x: 30, y: PO.plat.top, w: W - 60, h: 130 },
    ...PO.chedis.map((c) => foot(c.x, c.y, 46, 18)),
    { x: 30, y: PO.plat.front - 1, w: 126, h: PO.plat.face + 3 },
    { x: 184, y: PO.plat.front - 1, w: W - 214, h: PO.plat.face + 3 },
    foot(doorX - 26, 316, 28, 5),
    foot(doorX + 26, 316, 28, 5),
    foot(doorX - 46, 318, 6, 3),
    foot(170, 356, 20, 7),
    foot(146, 354, 14, 5),
    foot(194, 354, 14, 5),
    foot(150, 562, 14, 6),
    foot(190, 562, 14, 6),
    foot(16, 626, 14, 5),
    foot(130, 624, 14, 5),
    foot(18, 726, 14, 5),
    foot(126, 730, 14, 5),
    { x: PO.cloister.x - PO.cloister.len / 2, y: PO.cloister.y - 40, w: PO.cloister.len, h: 42 },
    foot(PO.bodhi.x, PO.bodhi.y, 30, 10),
    { x: PO.sala.x - 42, y: PO.sala.y - 30, w: 84, h: 32 },
    foot(238, 790, 6, 3),
    foot(56, 858, 44, 10),
    foot(112, 860, 34, 8),
    foot(290, 866, 30, 10),
    foot(132, 896, 14, 6),
    foot(208, 896, 14, 6),
    { x: 0, y: PO.wall - 12, w: 150, h: 14 },
    { x: 190, y: PO.wall - 12, w: 150, h: 14 },
    { x: 150, y: 780, w: 8, h: 70 },
    { x: 184, y: 780, w: 8, h: 70 },
    foot(14, 360, 8, 6),
    foot(26, 580, 6, 4),
    foot(226, 588, 6, 4),
    foot(320, 872, 10, 5),
    { x: 0, y: PO.wall + 30, w: W, h: 42 },
    { x: 0, y: H - 6, w: W, h: 6 },
    ...PO_LAMPS.map(([x, y]) => foot(x, y, 6, 4)),
  ]
  const hotspots: Hotspot[] = [
    hs('door:wat_pho:viharn', 'เข้าวิหารพระนอน', 'พระพุทธไสยาสยาว 46 เมตร (ถอดรองเท้าก่อน)', 'temple', { x: doorX - 12, y: 236, w: 24, h: 66 }, { x: doorX, y: 314 }, 'up', { beacon: true, marker: { x: doorX, y: 230 }, near: 14 }),
    hs('incense', 'กระถางธูปหน้าวิหาร', 'จุดธูปขอพรให้สุขภาพดี', 'incense', { x: 156, y: 334, w: 28, h: 24 }, { x: 170, y: 368 }),
    hs('chedi', 'พระมหาเจดีย์สี่รัชกาล', 'เวียนเทียนรอบพระมหาเจดีย์', 'sparkle', { x: 110, y: 340, w: 120, h: 170 }, { x: 170, y: 532 }, 'up', { marker: { x: 170, y: 336 } }),
    hs('pond', 'สระเขามอ', 'ให้อาหารปลาในสระหินจำลอง', 'koi', { x: 26, y: 628, w: 96, h: 64 }, { x: 140, y: 660 }, 'left', { marker: { x: 72, y: 624 } }),
    hs('job:feed_fish', 'ปลาในสระเขามอ', 'ช่วยให้อาหารปลาตามเวลา', 'broom', { x: 20, y: 690, w: 44, h: 20 }, { x: 58, y: 716 }, 'up'),
    hs('job:arrange_shoes', 'รองเท้าหน้าวิหาร', 'ช่วยจัดรองเท้านักท่องเที่ยว', 'broom', { x: doorX + 12, y: 302, w: 28, h: 16 }, { x: doorX + 26, y: 326 }),
    hs('job:sweep_leaves', 'ใบโพธิ์ร่วงใต้ต้น', 'ช่วยกวาดใบโพธิ์', 'broom', { x: 262, y: 580, w: 72, h: 70 }, { x: PO.bodhi.x - 18, y: 660 }),
    hs('shop:wat_pho_massage', 'ศาลานวดแผนไทย', 'โรงเรียนนวดวัดโพธิ์ต้นตำรับ', 'shop', { x: PO.sala.x - 42, y: PO.sala.y - 48, w: 84, h: 50 }, { x: PO.sala.x, y: PO.sala.y + 14 }),
    hs('shop:wat_pho_balm', 'ร้านยาหม่องสมุนไพร', 'ยาหม่อง ลูกประคบ น้ำมันเหลือง', 'shop', { x: 34, y: 814, w: 44, h: 44 }, { x: 60, y: 872 }),
    hs('gate', 'ประตูวัดโพธิ์', 'กลับบ้าน / ไปที่อื่น', 'map', { x: 150, y: 870, w: 40, h: 44 }, { x: 170, y: 918 }, 'down', { near: 12 }),
  ]
  return {
    id: 'wat_pho',
    place: 'wat_pho',
    area: 'wat',
    w: W,
    h: H,
    skyH: 112,
    ground: '#d8d2cc',
    camBias: 0.62,
    bake: poBake,
    props,
    obstacles,
    ellipses: PO.pond.map(([x, y, rx, ry]) => [x, y, rx + 3, ry + 3] as [number, number, number, number]),
    hotspots,
    entries: { 'wat_pho:viharn': { x: doorX, y: 330, face: 'down' } },
    spawn: { x: 170, y: 920, face: 'up' },
    pickupSpots: [
      { x: 20, y: 320 },
      { x: 300, y: 320 },
      { x: 250, y: 360 },
      { x: 90, y: 360 },
      { x: 110, y: 570 },
      { x: 240, y: 570 },
      { x: 210, y: 620 },
      { x: 200, y: 750 },
      { x: 20, y: 760 },
      { x: 240, y: 840 },
      { x: 30, y: 986 },
      { x: 300, y: 988 },
    ],
    lights: [
      ...PO_LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      ...hooks(viharn, 'door', PO.viharn).map((p) => ({ x: p.x, y: p.y, r: 16 })),
      ...PO.chedis.map((c) => ({ x: c.x, y: c.y - 90, r: 26, color: '#ffe7a0' })),
      { x: 170, y: 344, r: 10, color: '#ff9a5a' },
      { x: PO.sala.x, y: PO.sala.y - 24, r: 22, color: '#ffcf7a' },
      { x: 56, y: 836, r: 14, color: '#ffe7a0' },
      { x: PO.gate.x, y: 850, r: 24 },
    ],
    life(s) {
      const glints = [...hooks(viharn, 'glints', PO.viharn), ...PO.chedis.flatMap((c, i) => hooks(chedis[i], 'glints', c)), ...hooks(gate, 'glints', PO.gate)]
      return [
        new KoiPond(s, PO.pond, { koi: 8, dragonflies: 2, lotus: [[40, 650, true], [96, 662], [118, 686, true], [30, 684]] }),
        new Glints(s, glints, 1.4),
        new EaveBells(s, hooks(viharn, 'bells', PO.viharn), PO.viharn.y),
        new EaveBells(s, BK.hookAt(BK.salaSprite({ w: 84, roof: BK.ROOF.orange, mats: true }), 'bells', PO.sala.x, PO.sala.y), PO.sala.y),
        Flames.candles(s, 146, 354),
        Flames.candles(s, 194, 354),
        new Smoke(s, [{ x: 170, y: 342 }], 7),
        new Butterflies(s, [
          { x: 10, y: 600, w: 130, h: 50 },
          { x: 244, y: 600, w: 90, h: 60 },
        ], 5),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [
          { y: PO.wall + 46, dir: 1 },
          { y: PO.wall + 66, dir: -1 },
        ]),
        new Gags(s, poGags()),
        new TapZones([
          shakeTree(s, 'bodhi', PO.bodhi.x, PO.bodhi.y - 10, 80, ['#9ed86a', '#5eae55']),
          ...PO.chedis.map((c, i) =>
            talk(s, { x: c.x - 16, y: c.y - 150, w: 32, h: 130 }, [
              ['พระมหาเจดีย์สีเขียว ของรัชกาลที่ 1', 'กระเบื้องสีเขียวประดับดอกไม้'][i === 0 ? 0 : 1],
              ['เจดีย์สีขาว ของรัชกาลที่ 2', 'เจดีย์สีเหลือง ของรัชกาลที่ 3', 'เจดีย์สีน้ำเงิน ของรัชกาลที่ 4'][Math.max(0, i - 1)],
              'ประดับกระเบื้องเคลือบเป็นลายดอกไม้ทั้งองค์',
            ], (x, y) => {
              s.particles.sparkles(x, y, 8, '#fff3a6', 8)
              sfx.chime()
            }),
          ),
          ...[
            [16, 626],
            [130, 624],
            [18, 726],
            [126, 730],
          ].map(([x, y]) =>
            talk(s, { x: x - 10, y: y - 30, w: 20, h: 30 }, ['ท่าฤๅษีดัดตน แก้ปวดหลังปวดเอว', 'ยืดเส้นยืดสายทุกวัน อายุยืน', 'ลองทำตามดูสิ… ระวังขาพันกันนะ!'], (px, py) => s.particles.hearts(px, py, 1)),
          ),
          talk(s, { x: 124, y: 856, w: 18, h: 42 }, ['Good day! ข้ามากับเรือสำเภาจีน', 'ตุ๊กตาอับเฉาหินแกรนิต ใส่หมวกทรงสูง', 'หมวกข้า… ไม่ใช่หมวกนักมายากลนะ'], () => sfx.tap()),
          talk(s, { x: 200, y: 856, w: 18, h: 42 }, ['ขุนนางจีนเฝ้าประตูวัดโพธิ์', 'ถือป้ายหยกไว้ทั้งวันเลย'], () => sfx.tap()),
          talk(s, { x: PO.cloister.x - 50, y: PO.cloister.y - 50, w: 100, h: 44 }, ['พระระเบียงมีพระพุทธรูปเรียงราย 394 องค์', 'สงบร่มเย็นจังเลย'], (x, y) => s.particles.sparkles(x, y, 6, '#fff3a6', 6)),
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.5) s.particles.add({ kind: 'leaf', x: PO.bodhi.x + rand(-34, 34), y: PO.bodhi.y - 70 + rand(-10, 10), vx: rand(-4, 4), vy: rand(6, 11), max: rand(2.5, 3.5), color: '#9ed86a', color2: '#5eae55' })
      if (s.isNight() && Math.random() < dt) s.particles.add({ kind: 'sparkle', x: rand(40, 300), y: rand(330, 480), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 20, y: 316, w: 300, h: 40 },
      { x: 150, y: 580, w: 40, h: 290 },
      { x: 200, y: 700, w: 30, h: 150 },
      { x: 20, y: 760, w: 120, h: 60 },
      { x: 30, y: 510, w: 280, h: 30 },
    ],
    pois: [
      { x: doorX - 8, y: 328, face: 'up' },
      { x: 164, y: 370, face: 'up' },
      { x: 176, y: 370, face: 'up' },
      { x: 120, y: 534, face: 'up' },
      { x: 220, y: 534, face: 'up' },
      { x: 140, y: 664, face: 'left' },
      { x: 180, y: 728, face: 'up' },
      { x: 60, y: 872, face: 'up' },
      { x: 280, y: 800, face: 'up' },
    ],
    monkPath: [
      [170, 330],
      [170, 880],
      [170, 930],
      [-20, 930],
    ],
    birds: { x: 190, y: 600, w: 50, h: 60 },
    cats: [
      { x: 150, y: 612, pose: 'loaf', color: '#f5a55a' },
      { x: 310, y: 820, pose: 'sleep', color: '#5a4a5e' },
    ],
    novice: { x: 200, y: 600, w: 36, h: 120 },
    novices: 1,
    dogs: ['khanom'],
    visitors: 9,
  }
}

// ---------------------------------------------------------------------------
// Wat Pho: inside the viharn of the reclining Buddha.

function poViharnMap(): MapDef {
  const W = 560
  const H = 300
  const doorX = 40
  const buddha = INT.recliningBuddha()
  const BU = { x: 292, y: 190 }
  const pillar = INT.paintedPillar(206, 'flower')
  const pillarXs = [40, 128, 216, 304, 392, 480]
  const bowlsX = 70
  const guide = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_polo', bottom: 'bot_black', head: 'head_cap' })
  const coinLady = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sin_mudmee' })
  const kid = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_lotus', bottom: 'bot_denim_shorts' })
  const tourists = [0, 1, 2].map((i) => look({ gender: i % 2 ? 'f' : 'm', top: ['top_hawaii', 'top_stripe', 'top_tee_white'][i], bottom: ['bot_elephant', 'bot_sarong', 'bot_khaki'][i], head: i === 1 ? 'head_sunhat' : null }))
  const clerk = look({ gender: 'm', hair: 'hair_buzz', top: 'top_white', bottom: 'bot_black' })
  const gags: Gag[] = [
    {
      x: 150,
      y: 236,
      walk: { x0: 120, x1: 420, speed: 6 },
      lines: ['พระพุทธไสยาส ยาว 46 เมตร สูง 15 เมตรค่ะ', 'ฝ่าพระบาทประดับมุก เป็นภาพมงคล 108 ประการ', 'เชิญถ่ายรูปได้ค่ะ ระวังเสาด้วยนะคะ~', 'พระเศียรหนุนพระหัตถ์ขวาค่ะ'],
      draw: (g, p) => {
        const dir = p.flip ? 1 : -1
        tourists.forEach((lk, i) => drawPerson(g, lk, { ...p, x: p.x + dir * (12 + i * 11), y: p.y + (i % 2 ? 3 : -2), t: p.t + i * 0.5, react: 0 }, 'back', i === 0 ? ['selfie'] : []))
        drawPerson(g, guide, p, 'front')
      },
    },
    {
      x: 300,
      y: 262,
      walk: { x0: 90, x1: 500, speed: 4 },
      lines: ['กริ๊ง… กริ๊ง… ครบ 108 บาตรแล้ว!', 'หยอดทีละเหรียญ ใจสงบดี', 'ขอให้ร่ำรวย สุขภาพแข็งแรง'],
      draw: (g, p) => {
        drawPerson(g, coinLady, p, 'back')
        if (!p.moving && Math.floor(p.t * 3) % 3 === 0) g.px(p.x + 3, p.y + 6, '#ffd54f')
      },
      react: () => sfx.coins(3),
    },
    {
      x: 470,
      y: 250,
      lines: ['…106, 107, 108! นับบาตรครบแล้ว!', 'พระบาทใหญ่กว่าบ้านหนูอีก!', 'ถ่ายรูปกับพระบาทให้หน่อยครับ'],
      draw: (g, p) => drawPerson(g, kid, p, 'front'),
    },
    person(32, 252, clerk, ['แลกเหรียญหยอดบาตรครับ ขันละ 20 บาท', 'เหรียญ 108 เหรียญ ครบทุกบาตรพอดี', 'รับถุงใส่รองเท้าด้วยนะครับ'], { z: -1 }),
  ]
  const props: PlacedProp[] = [
    { sprite: buddha, x: BU.x, y: BU.y },
    ...pillarXs.map((x) => ({ sprite: pillar, x, y: 206 })),
    { sprite: INT.bowlBench(108, 4), x: bowlsX, y: 290, z: 4 },
    { sprite: INT.coinBooth(), x: 34, y: 238 },
    { sprite: BK.signBoard('coins'), x: 62, y: 236 },
    { sprite: INT.altarTable(40), x: 120, y: 204 },
    { sprite: INT.floorCandle(), x: 96, y: 208 },
    { sprite: INT.floorCandle(), x: 144, y: 208 },
  ]
  return {
    id: 'wat_pho:viharn',
    place: 'wat_pho',
    area: 'wat',
    indoor: true,
    indoorLight: 0.75,
    w: W,
    h: H,
    skyH: 0,
    ground: '#e8e0d6',
    camBias: 0.5,
    bake: (g) => {
      roomShell(g, { w: W, h: H, wallH: 116, mural: 'cream', floor: 'terrazzo', doorX, seed: 11 })
      INT.carpet(g, 60, 208, 460, 8, '#b8343f')
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 196 },
      { x: 0, y: 0, w: 16, h: H },
      { x: W - 16, y: 0, w: 16, h: H },
      ...pillarXs.map((x) => foot(x, 206, 10, 6)),
      { x: bowlsX, y: 280, w: 108 * 4 + 8, h: 12 },
      foot(34, 238, 32, 10),
      foot(62, 236, 6, 3),
      foot(120, 204, 40, 8),
      { x: 0, y: H - 6, w: doorX - 18, h: 6 },
      { x: doorX + 18, y: H - 6, w: W - doorX - 18, h: 6 },
    ],
    hotspots: [
      hs('pray', 'กราบพระพุทธไสยาส', 'สวดมนต์ขอพรให้สุขภาพแข็งแรง', 'pray', { x: 90, y: 60, w: 70, h: 140 }, { x: 120, y: 222 }, 'up', { beacon: true, marker: { x: 124, y: 70 } }),
      hs('donation', 'หยอดเหรียญ 108 บาตร', 'หยอดเหรียญลงบาตรให้ครบ 108 ใบ', 'coin', { x: 90, y: 270, w: 120, h: 20 }, { x: 150, y: 270 }, 'down'),
      hs('job:polish_brass', 'บาตรทองเหลือง 108 ใบ', 'ช่วยขัดบาตรให้เงาวับ', 'broom', { x: 340, y: 270, w: 120, h: 20 }, { x: 400, y: 270 }, 'down'),
      hs('door:wat_pho', 'ออกจากวิหาร', 'กลับไปลานวัดโพธิ์', 'map', { x: doorX - 16, y: H - 22, w: 32, h: 22 }, { x: doorX, y: H - 8 }, 'down', { near: 10 }),
    ],
    entries: { wat_pho: { x: doorX + 8, y: H - 26, face: 'up' } },
    spawn: { x: doorX + 8, y: H - 26, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: 124, y: 110, r: 46, color: '#fff0c8' },
      { x: 300, y: 130, r: 60, color: '#ffe7a0' },
      { x: 468, y: 140, r: 40, color: '#ffe7a0' },
      { x: 96, y: 174, r: 10, color: '#ffb35a' },
      { x: 144, y: 174, r: 10, color: '#ffb35a' },
    ],
    life(s) {
      return [
        new Glints(s, hooks(buddha, 'glints', BU), 2),
        new Flames(s, [
          { x: 96, y: 175 },
          { x: 144, y: 175 },
        ]),
        new Gags(s, gags),
        new TapZones([
          talk(s, { x: 60, y: 50, w: 90, h: 80 }, ['พระพักตร์ยิ้มอ่อนโยน…', 'พระเศียรหนุนพระหัตถ์ ดูสบายจัง', 'องค์พระก่อด้วยอิฐ ลงรักปิดทองทั้งองค์'], (x, y) => s.particles.sparkles(x, y, 10, '#fff3a6', 10)),
          talk(s, { x: 450, y: 70, w: 40, h: 90 }, ['ฝ่าพระบาทประดับมุก ลายมงคล 108 ประการ', 'นิ้วพระบาทยาวเท่ากันทุกนิ้ว', 'วิบวับ~ มุกสะท้อนแสง'], (x, y) => s.particles.sparkles(x, y, 12, '#dff4ff', 10)),
          {
            rect: { x: bowlsX, y: 272, w: 108 * 4, h: 18 },
            fn: (x, y) => {
              sfx.coin()
              s.particles.add({ kind: 'sparkle', x, y: y - 6, vy: -10, max: 0.6, color: '#ffe38a' })
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      motes(s, dt, { x: 60, y: 40, w: 440, h: 160 }, 3)
    },
    wander: [{ x: 60, y: 226, w: 440, h: 36 }],
    pois: [
      { x: 110, y: 228, face: 'up' },
      { x: 250, y: 232, face: 'up' },
      { x: 400, y: 232, face: 'up' },
      { x: 480, y: 236, face: 'up' },
      { x: 200, y: 262, face: 'down' },
    ],
    dogs: [],
    visitors: 5,
  }
}

// ---------------------------------------------------------------------------
// Wat Arun (outdoor): the prang with terraces you can climb, the ubosot with
// its giant guardians, costume rental, and the Chao Phraya pier.

/** Obstacles for a region where only `free(x, y)` cells are walkable. */
function maskRects(x0: number, y0: number, x1: number, y1: number, free: (x: number, y: number) => boolean, cell = 4): Rect[] {
  const out: Rect[] = []
  for (let y = y0; y < y1; y += cell) {
    let run = -1
    for (let x = x0; x <= x1; x += cell) {
      const blocked = x < x1 && !free(x + cell / 2, y + cell / 2)
      if (blocked && run < 0) run = x
      if (!blocked && run >= 0) {
        out.push({ x: run, y, w: x - run, h: cell })
        run = -1
      }
    }
  }
  return out
}

const inR = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h

const AR = {
  W: 360,
  H: 1040,
  tower: { x: 180, y: 478 },
  t3: { x0: 120, x1: 240, top: 474, front: 494, face: 12 },
  t2: { x0: 92, x1: 268, top: 506, front: 530, face: 16 },
  t1: { x0: 60, x1: 300, top: 546, front: 574, face: 20 },
  ground: 594,
  ubosot: { x: 96, y: 768 },
  gate: { x: 96, y: 806 },
  river: 884,
  pier: { x: 150, w: 100 },
}

const AR_WALK: Rect[] = [
  { x: 124, y: 480, w: 112, h: 12 },
  { x: 96, y: 510, w: 168, h: 18 },
  { x: 64, y: 550, w: 232, h: 22 },
  { x: 175, y: 488, w: 10, h: 24 },
  { x: 174, y: 524, w: 12, h: 30 },
  { x: 173, y: 568, w: 14, h: 30 },
]

const AR_TREES: [number, number, number][] = [
  [326, 720, 1],
  [236, 744, 3],
  [20, 860, 2],
  [340, 860, 0],
]

function arGags(): Gag[] {
  const rent = look({ gender: 'f', hair: 'hair_bun', top: 'top_chitralada', bottom: 'bot_sin_mudmee', head: 'head_jasmine' })
  const posers = [
    look({ gender: 'f', hair: 'hair_long', top: 'top_sabai', bottom: 'bot_jong', head: 'head_chada' }),
    look({ gender: 'f', hair: 'hair_bun', hairColor: 3, top: 'top_borompiman', bottom: 'bot_sin_mudmee', head: 'head_frangipani' }),
    look({ gender: 'm', hair: 'hair_short', top: 'top_raj', bottom: 'bot_jong' }),
  ]
  const photog = look({ gender: 'm', hair: 'hair_short', hairColor: 1, top: 'top_tee_black', bottom: 'bot_jeans', head: 'head_cap' })
  const climber = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_hawaii', bottom: 'bot_elephant' })
  const ferry = look({ gender: 'f', hair: 'hair_bob', top: 'top_polo', bottom: 'bot_black', head: 'head_sunhat' })
  const fishFood = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_white', bottom: 'bot_fisherman' })
  const kid = look({ gender: 'f', hair: 'hair_twin', top: 'top_tee_lotus', bottom: 'bot_skirt' })
  return [
    person(262, 690, rent, ['เช่าชุดไทยค่ะ ชั่วโมงละ 200 แถมทำผม!', 'ชุดไทยจักรี ชุดสไบ มีทุกไซส์ค่ะ', 'ถ่ายรูปคู่พระปรางค์ สวยปังแน่นอน'], { z: -2 }),
    {
      x: 210,
      y: 640,
      lines: ['ยิ้ม~ แชะ! สวยมาก', 'ชุดไทยกับพระปรางค์ ปังสุด', 'ขออีกรูป ทำท่ารำด้วย!'],
      draw: (g, p) => {
        drawPerson(g, posers[0], { ...p, x: p.x - 12 }, 'front', [], Math.floor(p.t * 0.5) % 2 ? 'wai' : 'happy')
        drawPerson(g, posers[1], { ...p, x: p.x + 2 }, 'front', [], Math.floor(p.t * 0.5 + 1) % 2 ? 'offer' : 'stand')
        drawPerson(g, posers[2], { ...p, x: p.x + 16 }, 'front', [], 'stand')
      },
      w: 40,
    },
    {
      x: 212,
      y: 676,
      lines: ['ขยับซ้ายหน่อย~ ให้ติดยอดปรางค์', '3… 2… 1… แชะ!', 'แสงตอนเย็นสวยที่สุดเลย'],
      draw: (g, p) => drawPerson(g, photog, p, 'back', ['selfie']),
      react: (sc, x, y) => gagFx.flash(sc, x, y),
    },
    {
      x: 150,
      y: 520,
      lines: ['บันไดชันมาก! ขาสั่นแล้ว…', 'ขึ้นมาแล้วลงยังไงเนี่ย!', 'วิวสวยคุ้มเหนื่อย!'],
      draw: (g, p) => drawPerson(g, climber, p, 'front'),
    },
    person(262, 858, ferry, ['เรือข้ามฟากไปท่าเตียน 5 บาทจ้า', 'เรือมาทุก 10 นาที', 'ระวังก้าวลงเรือนะคะ'], { z: -2 }),
    person(126, 858, fishFood, ['ขนมปังให้ปลาจ้า ถุงละ 10', 'ปลาสวายตัวโตเท่าแขน!', 'ให้อาหารปลาได้บุญนะหนู'], { z: -2 }),
    {
      x: 144,
      y: 876,
      lines: ['ปลาตัวใหญ่มากกก!', 'มาเร็ว ๆ ปลาจ๋า', 'ว้าย! กระโดดมางับ!'],
      draw: (g, p) => drawPerson(g, kid, p, 'back'),
    },
  ]
}

function arBake(g: Surface) {
  const { W, H } = AR
  G.treeLine(g, 118, W, G.LEAVES.far, 5)
  G.treeLine(g, 132, W, G.LEAVES.deep, 9)
  BK.granite(g, 0, 140, W, AR.river - 140, 6)
  G.weather(g, 0, 140, W, AR.river - 140, 7, 0.4)
  // Lawns with trees at the sides of the prang court.
  G.lawn(g, 0, 150, 56, 440, 3)
  G.lawn(g, 304, 150, 56, 440, 4)
  // Terraces of the prang (lowest first so the upper ones sit on top).
  for (const t of [AR.t1, AR.t2, AR.t3]) BK.blobShadow(g, AR.tower.x, t.front + t.face, (t.x1 - t.x0) / 2 + 4, 4, 0.12)
  ARUN.arunTerrace(g, AR.t1.x0, AR.t1.x1, AR.t1.top, AR.t1.front, AR.t1.face, 1)
  ARUN.arunTerrace(g, AR.t2.x0, AR.t2.x1, AR.t2.top, AR.t2.front, AR.t2.face, 2)
  ARUN.arunTerrace(g, AR.t3.x0, AR.t3.x1, AR.t3.top, AR.t3.front, AR.t3.face, 3)
  ARUN.arunStairs(g, 180, AR.t3.front - 8, AR.t3.front + AR.t3.face + 2, 5)
  ARUN.arunStairs(g, 180, AR.t2.front - 8, AR.t2.front + AR.t2.face + 2, 6)
  ARUN.arunStairs(g, 180, AR.t1.front - 8, AR.t1.front + AR.t1.face + 2, 7)
  // Paved approach from the pier.
  G.paving(g, 160, AR.ground + 2, 40, AR.river - AR.ground - 40, 8, 'grey')
  G.mandala(g, AR.ubosot.x, AR.gate.y + 14, 18)
  G.leafLitter(g, 220, 700, 130, 80, 50, 6)
  for (const [x, y] of AR_TREES) G.groundShadow(g, x, y - 3, 16, 4, 0.6)
  // Riverside promenade and embankment.
  BK.marble(g, 0, AR.river - 38, W, 38, 8, 12, 'grey')
  g.rect(0, AR.river - 2, W, 4, '#9f9791')
  g.hline(0, W - 1, AR.river - 2, '#d6d0cb')
  BK.riverWater(g, 0, AR.river + 2, W, H - AR.river - 2, 3)
  // Reflection of the prang on the water.
  g.ctx.save()
  g.ctx.globalAlpha = 0.12
  g.ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 60; i++) {
    const t = i / 60
    const hw = 30 * (1 - t) + 2
    g.ctx.fillRect(Math.round(180 - hw) - g.ox, AR.river + 6 + i * 2 - g.oy, Math.round(hw * 2), 1)
  }
  g.ctx.restore()
}

/** Boats on the Chao Phraya: long-tails, a rice barge, the ferry and (at night) dinner cruises. */
class RiverTraffic implements Life {
  private boats: { kind: 'longtail' | 'barge' | 'cruise'; x: number; y: number; v: number }[] = []
  private next = 1
  private ferry = { y: 0, state: 'dock' as 'dock' | 'out' | 'back', t: 8 }
  private longtail: { canvas: HTMLCanvasElement; w: number; h: number }
  constructor(
    private s: WorldScene,
    private top: number,
    private pier: { x: number; y: number },
  ) {
    this.longtail = longtailSprite()
  }
  update(dt: number) {
    this.next -= dt
    if (this.next <= 0) {
      this.next = rand(4, 9)
      const night = this.s.isNight()
      const kind = night && Math.random() < 0.5 ? 'cruise' : Math.random() < 0.7 ? 'longtail' : 'barge'
      const dir = Math.random() < 0.5 ? 1 : -1
      const v = (kind === 'longtail' ? rand(40, 60) : kind === 'barge' ? 7 : 12) * dir
      const y = this.top + rand(60, 140)
      this.boats.push({ kind, x: dir > 0 ? -80 : this.s.map.w + 80, y, v })
    }
    for (const b of this.boats) {
      b.x += b.v * dt
      if (b.kind === 'longtail' && Math.random() < dt * 8) this.s.particles.add({ kind: 'ripple', x: b.x - Math.sign(b.v) * 30, y: b.y, max: 0.8, size: 6, color: '#dff4ee' })
    }
    this.boats = this.boats.filter((b) => b.x > -100 && b.x < this.s.map.w + 100)
    // Ferry leaves the pier, crosses out of view, comes back.
    const f = this.ferry
    f.t -= dt
    if (f.state === 'dock' && f.t <= 0) f.state = 'out'
    if (f.state === 'out') {
      f.y += 16 * dt
      if (f.y > 170) {
        f.state = 'back'
        f.t = 6
      }
    } else if (f.state === 'back' && f.t <= 0) {
      f.y -= 16 * dt
      if (f.y <= 0) {
        f.y = 0
        f.state = 'dock'
        f.t = rand(10, 16)
      }
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const g = this.s.gfx
    for (const b of this.boats) {
      if (!this.s.onScreen(b.x, b.y, 80)) continue
      add(b.y, () => {
        const bob = Math.round(Math.sin(t * 3 + b.x * 0.05))
        const spr = b.kind === 'longtail' ? this.longtail : b.kind === 'barge' ? ARUN.riceBarge() : ARUN.cruiseSprite(this.s.isNight())
        g.draw(spr.canvas, Math.round(b.x - spr.w / 2), Math.round(b.y - spr.h + 2 + bob), b.v < 0)
      })
    }
    const fy = this.pier.y + this.ferry.y
    if (this.s.onScreen(this.pier.x, fy, 60)) {
      add(fy, () => {
        const spr = ARUN.ferrySprite()
        const bob = Math.round(Math.sin(t * 2.2))
        g.draw(spr.canvas, Math.round(this.pier.x - spr.ax - this.ferry.y * 0.4), Math.round(fy - spr.ay + bob))
      })
    }
  }
  glow(g: Surface, _t: number, light: number) {
    if (light < 0.4) return
    for (const b of this.boats) if (b.kind === 'cruise' && this.s.onScreen(b.x, b.y, 60)) drawGlow(g, b.x, b.y - 10, 30, light * 0.6, '#ffe7a8')
  }
}

function watArunMap(): MapDef {
  const { W, H } = AR
  const tower = ARUN.arunTower()
  const minor = ARUN.minorPrang()
  const mondop = ARUN.arunMondop()
  const ubosot = ARUN.arunUbosot()
  const ubosotN = ARUN.arunUbosot(true)
  const gate = ARUN.arunGate()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const lamps: [number, number][] = [
    [150, 846],
    [210, 846],
    [40, 846],
    [320, 846],
  ]
  const minors: Pt[] = [
    { x: 84, y: 472 },
    { x: 276, y: 472 },
    { x: 34, y: 612 },
    { x: 326, y: 612 },
  ]
  const mondops: Pt[] = [
    { x: 116, y: 562 },
    { x: 244, y: 562 },
  ]
  const pierY = AR.river + 44
  const props: PlacedProp[] = [
    { sprite: tower, x: AR.tower.x, y: AR.tower.y },
    ...minors.map((p) => ({ sprite: minor, x: p.x, y: p.y })),
    ...mondops.map((p) => ({ sprite: mondop, x: p.x, y: p.y })),
    { sprite: BK.stoneGuardian('warrior'), x: 158, y: 606 },
    { sprite: BK.stoneGuardian('warrior', true), x: 202, y: 606 },
    { sprite: BK.stoneGuardian('scholar'), x: 62, y: 590 },
    { sprite: BK.stoneGuardian('scholar', true), x: 298, y: 590 },
    { sprite: ubosot, night: ubosotN, x: AR.ubosot.x, y: AR.ubosot.y },
    { sprite: gate, x: AR.gate.x, y: AR.gate.y },
    { sprite: BK.giantYaksha('sahatsadecha'), x: 58, y: 812, id: 'yakW' },
    { sprite: BK.giantYaksha('thotsakan'), x: 134, y: 812, id: 'yakG' },
    { sprite: BK.costumeRack(), x: 286, y: 700 },
    { sprite: BK.signBoard('info'), x: 312, y: 704 },
    ...AR_TREES.map(([x, y, v]) => ({ sprite: G.frangipani(v), x, y, id: 'fr' + x })),
    { sprite: G.coconutPalm(0), x: 18, y: 300 },
    { sprite: G.coconutPalm(1), x: 342, y: 330 },
    { sprite: G.bougainvillea(0), x: 330, y: 560 },
    { sprite: G.bougainvillea(1), x: 26, y: 540 },
    { sprite: F.benchSprite(), x: 60, y: 866 },
    { sprite: F.benchSprite(), x: 300, y: 868 },
    { sprite: BK.ticketBooth(), x: 280, y: 852 },
    { sprite: BK.drinkCart(), x: 112, y: 852 },
    { sprite: ARUN.pierSprite(AR.pier.w), x: AR.pier.x, y: pierY },
    ...lamps.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const walk = (x: number, y: number) => AR_WALK.some((r) => inR(r, x, y))
  const obstacles: Rect[] = [
    { x: 0, y: 0, w: W, h: 148 },
    // Behind the prang and the terraces (except the walkable terrace tops and stairs).
    { x: 0, y: 148, w: W, h: 290 },
    ...maskRects(0, 438, W, AR.ground, walk),
    ...minors.slice(2).map((p) => foot(p.x, p.y, 40, 12)),
    ...mondops.map((p) => foot(p.x, p.y, 30, 16)),
    foot(158, 606, 14, 6),
    foot(202, 606, 14, 6),
    foot(62, 590, 14, 6),
    foot(298, 590, 14, 6),
    { x: 22, y: 690, w: 148, h: 82 },
    { x: 70, y: 778, w: 12, h: 30 },
    { x: 110, y: 778, w: 12, h: 30 },
    foot(58, 812, 40, 10),
    foot(134, 812, 40, 10),
    foot(286, 700, 52, 10),
    foot(312, 704, 6, 3),
    ...AR_TREES.map(([x, y]) => foot(x, y, 6, 4)),
    foot(18, 300, 8, 6),
    foot(342, 330, 8, 6),
    foot(330, 560, 20, 6),
    foot(26, 540, 20, 6),
    foot(60, 866, 20, 5),
    foot(300, 868, 20, 5),
    foot(280, 852, 30, 10),
    foot(112, 852, 34, 8),
    // River (the pier deck is walkable).
    { x: 0, y: AR.river, w: AR.pier.x, h: H - AR.river },
    { x: AR.pier.x + AR.pier.w, y: AR.river, w: W - AR.pier.x - AR.pier.w, h: H - AR.river },
    { x: AR.pier.x, y: pierY - 2, w: AR.pier.w, h: H - pierY + 2 },
    { x: AR.pier.x, y: AR.river, w: 10, h: 30 },
    { x: AR.pier.x + AR.pier.w - 10, y: AR.river, w: 10, h: 30 },
    ...lamps.map(([x, y]) => foot(x, y, 6, 4)),
  ]
  const hotspots: Hotspot[] = [
    hs('view', 'ระเบียงชั้นบนพระปรางค์', 'นั่งสมาธิชมแม่น้ำเจ้าพระยา', 'meditate', { x: 190, y: 470, w: 40, h: 24 }, { x: 206, y: 486 }, 'down', { marker: { x: 212, y: 466 } }),
    hs('door:wat_arun:ubosot', 'เข้าพระอุโบสถ', 'กราบพระประธาน พระพุทธธรรมมิศรราชฯ', 'temple', { x: 80, y: 700, w: 32, h: 110 }, { x: AR.gate.x, y: 822 }, 'up', { beacon: true, marker: { x: AR.ubosot.x, y: 612 }, near: 14 }),
    hs('shop:wat_arun_costume', 'ร้านเช่าชุดไทย', 'ชุดไทย ชฎา ถ่ายรูปกับพระปรางค์', 'shop', { x: 260, y: 656, w: 52, h: 46 }, { x: 270, y: 716 }),
    hs('river_fish', 'ให้อาหารปลาที่ท่าน้ำ', 'ปลาสวายตัวโตรออยู่ใต้ท่า', 'bread', { x: 100, y: 880, w: 44, h: 24 }, { x: 134, y: 876 }),
    hs('job:feed_catfish', 'ปลาสวายหน้าท่าเรือ', 'ช่วยโปรยอาหารปลาให้ทั่ว', 'broom', { x: 256, y: 880, w: 44, h: 24 }, { x: 266, y: 876 }),
    hs('job:sweep_leaves', 'ลานใต้ต้นลีลาวดี', 'ช่วยกวาดดอกไม้ใบไม้', 'broom', { x: 222, y: 700, w: 40, h: 46 }, { x: 236, y: 756 }),
    hs('gate', 'ท่าเรือวัดอรุณ', 'ขึ้นเรือกลับบ้าน / ไปที่อื่น', 'map', { x: AR.pier.x + 10, y: AR.river, w: AR.pier.w - 20, h: 40 }, { x: 200, y: AR.river + 26 }, 'down', { near: 12 }),
  ]
  return {
    id: 'wat_arun',
    place: 'wat_arun',
    area: 'river',
    w: W,
    h: H,
    skyH: 150,
    ground: '#d8d2cc',
    camBias: 0.6,
    bake: (g) => arBake(g),
    props,
    obstacles,
    hotspots,
    entries: { 'wat_arun:ubosot': { x: AR.gate.x, y: 832, face: 'down' } },
    spawn: { x: 200, y: AR.river + 20, face: 'up' },
    pickupSpots: [
      { x: 20, y: 640 },
      { x: 340, y: 650 },
      { x: 240, y: 620 },
      { x: 120, y: 620 },
      { x: 200, y: 780 },
      { x: 330, y: 790 },
      { x: 30, y: 870 },
      { x: 240, y: 870 },
      { x: 90, y: 560 },
      { x: 250, y: 516 },
    ],
    lights: [
      ...lamps.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: AR.tower.x, y: 380, r: 70, color: '#ffe7c8' },
      { x: AR.tower.x, y: 260, r: 40, color: '#ffe7c8' },
      ...minors.map((p) => ({ x: p.x, y: p.y - 70, r: 30, color: '#ffe7c8' })),
      { x: AR.ubosot.x, y: 700, r: 36 },
      { x: 286, y: 670, r: 16, color: '#ffb3cf' },
      { x: 200, y: AR.river + 10, r: 22, color: '#9fe0ff' },
    ],
    life(s) {
      const glints = [...hooks(tower, 'glints', AR.tower), ...minors.flatMap((p) => hooks(minor, 'glints', p)), ...mondops.flatMap((p) => hooks(mondop, 'glints', p)), ...hooks(ubosot, 'glints', AR.ubosot), ...hooks(gate, 'glints', AR.gate)]
      return [
        new Glints(s, glints, 1.6),
        new EaveBells(s, hooks(ubosot, 'bells', AR.ubosot), AR.ubosot.y),
        ...hooks(ubosot, 'candles', AR.ubosot).map((c) => new Flames(s, [c], AR.ubosot.y)),
        new RiverTraffic(s, AR.river, { x: 200, y: pierY + 8 }),
        {
          ground: (g: Surface, t: number) => {
            // Sparkles drifting on the water.
            for (let i = 0; i < 14; i++) {
              const ph = t * 0.6 + i * 1.7
              const x = ((i * 53 + t * (8 + (i % 3) * 4)) % (W + 20)) - 10
              const y = AR.river + 10 + ((i * 29) % (H - AR.river - 20))
              if (Math.sin(ph) > 0.2) g.hline(x, x + 2 + (i % 3), y, '#e8fff8')
            }
          },
        },
        new Butterflies(s, [
          { x: 220, y: 690, w: 120, h: 60 },
          { x: 0, y: 200, w: 56, h: 300 },
        ], 4),
        new CloudShadows(s, 2),
        new SunRays(s),
        new Gags(s, arGags()),
        new TapZones([
          ...AR_TREES.map(([x, y]) => shakeTree(s, 'fr' + x, x, y + 10, 40, ['#fffaf0', '#ffd23f'], 'petal')),
          talk(s, { x: 150, y: 220, w: 60, h: 250 }, ['พระปรางค์ประดับถ้วยชามกระเบื้องจีนนับแสนชิ้น', 'สูงราว 80 เมตร สัญลักษณ์ของแม่น้ำเจ้าพระยา', 'มียักษ์และลิงแบกฐานพระปรางค์อยู่รอบ ๆ', 'ตอนเย็นแสงส่องสวยที่สุด!'], (x, y) => {
            s.particles.sparkles(x, y, 10, '#ffffff', 10)
            sfx.chime()
          }),
          talk(s, { x: 40, y: 716, w: 36, h: 90 }, ['สหัสเดชะ ยักษ์ขาวเฝ้าวัดอรุณฯ', 'ได้ยินว่ายักษ์วัดโพธิ์มาท้าตีกัน… จนท่าเตียนราบเลย!', 'อย่าเล่าให้ยักษ์วัดโพธิ์ฟังนะ'], () => s.shake('yakW')),
          talk(s, { x: 116, y: 716, w: 36, h: 90 }, ['ทศกัณฐ์ยักษ์เขียว ใจดีนะจ๊ะ', 'เฝ้าโบสถ์มาตั้งแต่สมัยรัชกาลที่ 2', 'ถ่ายรูปกับข้าได้ ไม่คิดตังค์'], () => s.shake('yakG')),
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.8) s.particles.add({ kind: 'ripple', x: rand(10, W - 10), y: rand(AR.river + 20, H - 10), max: 1.2, size: 8, color: '#c8f4ea' })
      if (Math.random() < dt * 0.4) {
        const [x, y] = AR_TREES[Math.floor(Math.random() * AR_TREES.length)]
        s.particles.add({ kind: 'petal', x: x + rand(-14, 14), y: y - 34, vx: rand(-3, 3), vy: rand(6, 10), max: 3, color: '#fffaf0', color2: '#ffe45e' })
      }
    },
    wander: [
      { x: 20, y: AR.river - 34, w: 320, h: 26 },
      { x: 160, y: 600, w: 40, h: 240 },
      { x: 200, y: 620, w: 120, h: 60 },
      { x: 70, y: 552, w: 220, h: 18 },
    ],
    pois: [
      { x: 180, y: 604, face: 'up' },
      { x: 170, y: 556, face: 'up' },
      { x: 200, y: 516, face: 'up' },
      { x: 96, y: 826, face: 'up' },
      { x: 250, y: 720, face: 'up' },
      { x: 60, y: 876, face: 'down' },
      { x: 300, y: 876, face: 'down' },
    ],
    birds: { x: 190, y: 800, w: 120, h: 30 },
    cats: [{ x: 330, y: 610, pose: 'loaf', color: '#fbf3e4' }],
    dogs: ['dang'],
    visitors: 8,
  }
}

// ---------------------------------------------------------------------------
// Wat Arun: inside the ubosot.

function arUbosotMap(): MapDef {
  const W = 240
  const H = 330
  const alt = { x: 120, y: 196 }
  const pillar = INT.paintedPillar(230, 'red')
  const pillars: Pt[] = [
    { x: 34, y: 250 },
    { x: 206, y: 250 },
    { x: 34, y: 316 },
    { x: 206, y: 316 },
  ]
  const monkLook = { novice: false, skin: 2 }
  const people: [number, number, 'kneel' | 'wai' | 'bow'][] = [
    [96, 258, 'kneel'],
    [120, 262, 'wai'],
    [146, 258, 'bow'],
    [80, 286, 'wai'],
    [160, 288, 'kneel'],
  ]
  const looks = people.map((_, i) => look({ gender: i % 2 ? 'f' : 'm', top: ['top_white', 'top_thaisilk', 'top_polo', 'top_mohom'][i % 4], bottom: ['bot_black', 'bot_sin_mudmee', 'bot_slacks_grey', 'bot_skirt'][i % 4] }))
  const gags: Gag[] = [
    ...people.map(([x, y, pose], i) => ({
      x,
      y,
      lines: ['(กราบพระเบญจางคประดิษฐ์)', 'สาธุ~', 'ขอให้ชีวิตรุ่งโรจน์ดั่งรุ่งอรุณ'],
      draw: (g: Surface, p: GagPose) => drawPerson(g, looks[i], p, 'back', [], pose),
    })),
    {
      x: 188,
      y: 214,
      lines: ['เจริญพร~ ขอให้เจริญรุ่งเรือง', '(ประพรมน้ำมนต์) ซ่า~', 'ขอให้มีความสุขทุกวันนะโยม'],
      draw: (g, p) => {
        const sp = monkSprite('front', p.react > 0 ? 'bless' : 'stand', monkLook)
        drawShadow(g, p.x, p.y, 6, 2)
        g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 1))
      },
      react: (sc, x, y) => {
        for (let i = 0; i < 6; i++) sc.particles.add({ kind: 'drop', x: x - 10, y: y - 20, vx: rand(-30, -10), vy: rand(-20, 0), g: 80, max: 0.6, color: '#c8f4fa' })
        sfx.splash()
      },
    },
  ]
  const buddhaBase = INT.arunAltar()
  const props: PlacedProp[] = [
    { sprite: buddhaBase, x: alt.x, y: alt.y },
    { sprite: INT.altarTable(44), x: alt.x, y: 222 },
    { sprite: INT.floorCandle(), x: 80, y: 228 },
    { sprite: INT.floorCandle(), x: 160, y: 228 },
    { sprite: F.candleStandSprite(), x: 58, y: 236 },
    { sprite: INT.altarTable(28, false), x: 190, y: 234 },
    ...pillars.map((p) => ({ sprite: pillar, x: p.x, y: p.y })),
  ]
  return {
    id: 'wat_arun:ubosot',
    place: 'wat_arun',
    area: 'river',
    indoor: true,
    indoorLight: 0.8,
    w: W,
    h: H,
    skyH: 0,
    ground: '#f2ede6',
    camBias: 0.55,
    bake: (g) => roomShell(g, { w: W, h: H, wallH: 140, mural: 'blue', sideColor: '#3a4e8a', ceiling: '#26306e', carpet: { x: 102, y: 230, w: 36, h: 92, c: '#3d63b5' }, seed: 5 }),
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 146 },
      { x: 0, y: 0, w: 16, h: H },
      { x: W - 16, y: 0, w: 16, h: H },
      { x: 60, y: 140, w: 120, h: 60 },
      foot(alt.x, 222, 44, 10),
      foot(80, 228, 8, 5),
      foot(160, 228, 8, 5),
      foot(58, 236, 14, 5),
      foot(190, 234, 28, 8),
      ...pillars.map((p) => foot(p.x, p.y, 10, 6)),
      { x: 0, y: H - 6, w: W / 2 - 18, h: 6 },
      { x: W / 2 + 18, y: H - 6, w: W / 2 - 18, h: 6 },
    ],
    hotspots: [
      hs('pray', 'กราบพระประธาน', 'สวดมนต์ขอให้ชีวิตรุ่งโรจน์', 'pray', { x: 90, y: 150, w: 60, h: 70 }, { x: alt.x, y: 244 }, 'up', { beacon: true, marker: { x: alt.x, y: 70 } }),
      hs('job:light_candles', 'เชิงเทียนบูชาพระ', 'ช่วยจุดเทียนให้สว่างไสว', 'broom', { x: 48, y: 214, w: 20, h: 24 }, { x: 58, y: 250 }),
      hs('door:wat_arun', 'ออกจากพระอุโบสถ', 'กลับไปลานพระปรางค์', 'map', { x: W / 2 - 16, y: H - 20, w: 32, h: 20 }, { x: W / 2, y: H - 6 }, 'down', { near: 10 }),
    ],
    entries: { wat_arun: { x: W / 2, y: H - 22, face: 'up' } },
    spawn: { x: W / 2, y: H - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: alt.x, y: 100, r: 50, color: '#fff0c8' },
      { x: 80, y: 196, r: 10, color: '#ffb35a' },
      { x: 160, y: 196, r: 10, color: '#ffb35a' },
      { x: 58, y: 226, r: 10, color: '#ffb35a' },
    ],
    life(s) {
      return [
        new Glints(s, hooks(buddhaBase, 'glints', alt), 1.6),
        new Flames(s, [
          { x: 80, y: 195 },
          { x: 160, y: 195 },
        ]),
        Flames.candles(s, 58, 236),
        new Gags(s, gags),
        new TapZones([
          talk(s, { x: alt.x - 24, y: 60, w: 48, h: 80 }, ['พระพุทธธรรมมิศรราชโลกนาถดิลก', 'ว่ากันว่าพระพักตร์ปั้นโดยรัชกาลที่ 2', 'ใต้ฐานบรรจุพระบรมอัฐิรัชกาลที่ 2'], (x, y) => s.particles.sparkles(x, y, 8, '#fff3a6', 8)),
        ]),
      ]
    },
    ambient(s, dt) {
      motes(s, dt, { x: 50, y: 50, w: 140, h: 180 }, 2)
    },
    wander: [{ x: 70, y: 260, w: 100, h: 50 }],
    pois: [
      { x: 110, y: 262, face: 'up' },
      { x: 136, y: 268, face: 'up' },
    ],
    dogs: [],
    visitors: 2,
  }
}

// ---------------------------------------------------------------------------
// Erawan Shrine (Ratchaprasong): shrine platform, dancers, BTS overhead.

const EW = {
  W: 320,
  H: 760,
  mallY: 200,
  bts: 170,
  road1: 244,
  plaza: { y0: 322, y1: 658 },
  shrine: { x: 160, y: 520 },
  sala: { x: 262, y: 438 },
  road2: 700,
}

/** Taxis, buses and tuk-tuks in several lanes (Bangkok traffic). */
class CityTraffic implements Life {
  private cars: { x: number; lane: number; v: number; kind: ERA.CarKind | 'tuk' }[] = []
  private next = 0.5
  constructor(
    private s: WorldScene,
    private lanes: { y: number; dir: 1 | -1 }[],
  ) {}
  update(dt: number) {
    this.next -= dt
    if (this.next <= 0) {
      this.next = rand(1.2, 3.2)
      const lane = Math.floor(Math.random() * this.lanes.length)
      const L = this.lanes[lane]
      const kind = (['taxiPink', 'taxiPink', 'taxiGreen', 'taxiBlue', 'taxiOrange', 'bus', 'van', 'tuk'] as const)[Math.floor(Math.random() * 8)]
      const v = (kind === 'bus' ? 22 : kind === 'tuk' ? 34 : rand(28, 44)) * L.dir
      this.cars.push({ x: L.dir > 0 ? -70 : this.s.map.w + 70, lane, v, kind })
    }
    for (const c of this.cars) {
      // Stop-and-go: slow down near the car ahead.
      const ahead = this.cars.find((o) => o !== c && o.lane === c.lane && (o.x - c.x) * Math.sign(c.v) > 0 && Math.abs(o.x - c.x) < 44)
      c.x += c.v * dt * (ahead ? 0.3 : 1)
    }
    this.cars = this.cars.filter((c) => c.x > -90 && c.x < this.s.map.w + 90)
  }
  sorted(add: (y: number, draw: () => void) => void) {
    for (const c of this.cars) {
      const L = this.lanes[c.lane]
      if (!this.s.onScreen(c.x, L.y, 70)) continue
      add(L.y, () => {
        const spr = c.kind === 'tuk' ? tukTukProp() : ERA.carSprite(c.kind)
        this.s.gfx.draw(spr.canvas, Math.round(c.x - spr.w / 2), L.y - spr.h + 1, c.v < 0)
      })
    }
  }
  tap(x: number, y: number) {
    for (const c of this.cars) {
      const L = this.lanes[c.lane]
      if (Math.abs(x - c.x) < 18 && y > L.y - 16 && y < L.y + 2) {
        this.s.say(['ปี๊น ปี๊น!', 'ไปไหนครับ? แท็กซี่ครับ', 'รถติดอีกแล้ว…', 'ไฟแดงนานจัง~'][Math.floor(Math.random() * 4)], c.x, L.y - 18)
        sfx.tap()
        return true
      }
    }
    return false
  }
}

function tukTukProp() {
  return tukTuk()
}

/** The BTS skytrain gliding along the overhead guideway every so often. */
class Skytrain implements Life {
  private x = -200
  private dir: 1 | -1 = 1
  private wait = 3
  constructor(
    private s: WorldScene,
    private y: number,
  ) {}
  update(dt: number) {
    if (this.wait > 0) {
      this.wait -= dt
      if (this.wait <= 0) {
        this.dir = Math.random() < 0.5 ? 1 : -1
        this.x = this.dir > 0 ? -150 : this.s.map.w + 20
        if (this.s.onScreen(this.s.map.w / 2, this.y, 200)) sfx.whoosh()
      }
      return
    }
    this.x += this.dir * 70 * dt
    if (this.x > this.s.map.w + 160 || this.x < -170) this.wait = rand(6, 12)
  }
  over(g: Surface) {
    ERA.drawGuideway(g, 0, this.s.map.w, this.y)
    if (this.wait <= 0) drawSkytrain(g, this.x, this.y - 4, 4, this.s.isNight() ? 1 : 0, ERA.BTS_PAL)
  }
  glow(g: Surface, _t: number, light: number) {
    if (light > 0.4 && this.wait <= 0) for (let i = 0; i < 4; i++) drawGlow(g, this.x + 17 + i * 36, this.y - 9, 14, light * 0.4, '#dff4ff')
  }
}

function ewGags(): Gag[] {
  const garland = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_vendor', bottom: 'bot_sin_mudmee', head: 'head_vendorband' })
  const booth = look({ gender: 'f', hair: 'hair_bob', top: 'top_office_f', bottom: 'bot_pencil', neck: 'neck_lanyard' })
  const office = look({ gender: 'm', hair: 'hair_twoblock', top: 'top_office', bottom: 'bot_slacks_grey', neck: 'neck_lanyard' })
  const tourist = look({ gender: 'f', hair: 'hair_long', hairColor: 3, top: 'top_tee_white', bottom: 'bot_denim_shorts', head: 'head_sunhat' })
  const lottery = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_polo', bottom: 'bot_khaki', head: 'head_cap' })
  const dancer = (x: number, v: number, ph: number): Gag => ({
    x,
    y: 452,
    w: 14,
    h: 32,
    lines: ['(รำถวายท้าวมหาพรหม)', 'รำแก้บนให้คุณพี่ที่สอบติดค่ะ~', 'ยิ้มหวาน ๆ มือจีบ ตั้งวง!', 'รำมาตั้งแต่เช้า ยังไม่เมื่อยเลย'],
    draw: (g, p) => {
      const fr = (Math.floor(p.t * 1.6 + ph) % 4) as ERA.DancerFrame
      const sp = ERA.dancerSprite(fr, v, Math.floor(p.t * 0.4 + ph) % 2 === 0)
      drawShadow(g, p.x, p.y, 5, 1.5)
      const bob = fr === 1 || fr === 3 ? -1 : 0
      g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 1 + bob))
    },
    react: (sc, px, py) => sc.particles.sparkles(px, py - 30, 6, '#fff3a6', 6),
  })
  return [
    dancer(236, 0, 0),
    dancer(254, 1, 1),
    dancer(272, 2, 2),
    dancer(290, 3, 3),
    {
      x: 300,
      y: 426,
      w: 30,
      h: 22,
      lines: ['ติ๊ง ต่อง ติ๊ง~ (เพลงสาธุการ)', 'ระนาดเอกขอเสียงหน่อย!'],
      draw: (g, p) => {
        const sp = ERA.musicianSprite((Math.floor(p.t * 4) % 2) as 0 | 1)
        g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 1))
      },
      react: () => sfx.chime(),
    },
    person(52, 614, garland, ['พวงมาลัยดาวเรืองจ้า ถวายพระพรหม', 'ชุดไหว้ธูป 9 ดอก เทียน มาลัย 4 พวงจ้า', 'ไหว้ให้ครบสี่หน้านะลูก เวียนขวา~'], { z: -2 }),
    person(238, 626, booth, ['จองรำแก้บนคะ? 2 คน 260 บาท', '8 คน รำชุดใหญ่ ไฟกะพริบ! (ล้อเล่นค่ะ)', 'รับบัตรคิวด้านนี้เลยค่ะ~', 'บนไว้ว่าอะไรคะ? บอกกระซิบได้นะ'], { z: -2 }),
    {
      x: 110,
      y: 574,
      lines: ['ขอให้โปรเจกต์ผ่าน… สาธุ', 'ลาพักเที่ยงมาไหว้ ทันพอดี', 'สัญญาว่าถ้าได้เลื่อนขั้นจะมารำแก้บน!'],
      draw: (g, p) => drawPerson(g, office, p, 'back', [], 'wai'),
    },
    {
      x: 200,
      y: 600,
      lines: ['Four faces! Which one do I pray first?', 'เริ่มจากหน้าแรก แล้วเวียนตามเข็มนาฬิกาค่ะ', 'Wow, so many garlands!'],
      draw: (g, p) => drawPerson(g, tourist, p, 'back', ['selfie']),
      react: (sc, x, y) => gagFx.flash(sc, x, y),
    },
    person(290, 690, lottery, ['เลขเด็ดจากศาลพระพรหม!', 'ใบละ 80 ครับ ทุกงวด', 'เลขสวย ๆ ท้ายเก้าครับ'], { z: -1 }),
  ]
}

function ewBake(g: Surface, night: boolean, screens: { x: number; y: number; w: number; h: number }[]) {
  const { W, H } = EW
  // Malls along Rama I / Ploenchit.
  screens.length = 0
  screens.push(ERA.mallFacade(g, -4, EW.mallY, 116, 150, 0, night))
  screens.push(ERA.mallFacade(g, 112, EW.mallY, 100, 176, 1, night))
  screens.push(ERA.mallFacade(g, 212, EW.mallY, 112, 140, 2, night))
  BK.sidewalk(g, 0, EW.mallY, W, EW.road1 - EW.mallY - 2, 1)
  BK.kerbStripes(g, 0, EW.road1 - 2, W)
  BK.asphalt(g, 0, EW.road1, W, 48, { lanes: 3, seed: 2 })
  BK.kerbStripes(g, 0, EW.road1 + 48, W)
  BK.sidewalk(g, 0, EW.road1 + 50, W, EW.plaza.y0 - EW.road1 - 50, 2)
  // Shrine plaza: marble, a gilded fence, trees in planters.
  BK.marble(g, 14, EW.plaza.y0, W - 28, EW.plaza.y1 - EW.plaza.y0, 9, 12, 'warm')
  for (let x = 14; x < W - 14; x += 4) {
    g.rect(x, EW.plaza.y0 - 2, 2, 5, BK.GOLD.d)
    g.px(x, EW.plaza.y0 - 3, BK.GOLD.l)
  }
  g.hline(14, W - 15, EW.plaza.y0 - 2, BK.GOLD.b)
  G.mandala(g, EW.shrine.x, EW.shrine.y + 38, 24)
  BK.blobShadow(g, EW.shrine.x, EW.shrine.y - 4, 50, 8, 0.18)
  // Garland heaps and offerings around the shrine platform.
  ERA.garlandHeap(g, EW.shrine.x - 40, EW.shrine.y - 2, 22, 1)
  ERA.garlandHeap(g, EW.shrine.x + 40, EW.shrine.y - 2, 22, 2)
  ERA.garlandHeap(g, EW.shrine.x - 50, EW.shrine.y - 40, 16, 3)
  ERA.garlandHeap(g, EW.shrine.x + 50, EW.shrine.y - 40, 16, 4)
  // Dance floor in front of the sala.
  g.rect(222, 440, 84, 18, '#c9965e')
  for (let x = 222; x < 306; x += 6) g.vline(x, 440, 457, '#b07a4a')
  g.frame(222, 440, 84, 18, '#8a5a3a')
  // Bottom: sidewalk and Ratchadamri road.
  BK.sidewalk(g, 0, EW.plaza.y1, W, EW.road2 - EW.plaza.y1 - 2, 4)
  BK.kerbStripes(g, 0, EW.road2 - 2, W)
  BK.asphalt(g, 0, EW.road2, W, H - EW.road2, { lanes: 2, seed: 5 })
  BK.zebra(g, 130, EW.road2 + 2, 60, H - EW.road2 - 4)
  BK.zebra(g, 130, EW.road1 + 2, 60, 44)
}

function erawanMap(): MapDef {
  const { W, H } = EW
  const shrine = ERA.brahmaShrine()
  const sala = BK.salaSprite({ w: 84, roof: BK.ROOF.gold, floor: 'wood', posts: BK.BK.redD })
  const lamp = ERA.cityLamp()
  const lampN = ERA.cityLamp(true)
  const screens: { x: number; y: number; w: number; h: number }[] = []
  const pillars = [40, 160, 280]
  const lamps: [number, number][] = [
    [22, 330],
    [298, 330],
    [22, 650],
    [298, 650],
  ]
  const trees: [number, number][] = [
    [30, 470],
    [30, 560],
  ]
  const props: PlacedProp[] = [
    { sprite: shrine, x: EW.shrine.x, y: EW.shrine.y },
    { sprite: sala, x: EW.sala.x, y: EW.sala.y },
    { sprite: BK.woodElephants(6, 1), x: 104, y: 546, id: 'ele1' },
    { sprite: BK.woodElephants(5, 2), x: 214, y: 552, id: 'ele2' },
    { sprite: BK.woodElephants(4, 3), x: 90, y: 402 },
    { sprite: BK.woodElephants(4, 4), x: 206, y: 398 },
    { sprite: F.urnSprite(), x: 132, y: 580, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 190, y: 580 },
    { sprite: F.candleStandSprite(), x: 206, y: 582 },
    { sprite: BK.garlandStand(), x: 52, y: 636 },
    { sprite: BK.danceBooth(), x: 240, y: 646 },
    ...trees.map(([x, y]) => ({ sprite: G.bodhiTree2(), x, y })),
    ...pillars.map((x) => ({ sprite: ERA.btsPillar(76), x, y: EW.road1 - 4 })),
    { sprite: F.spiritHouseSprite(), x: 300, y: 560 },
    ...lamps.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const obstacles: Rect[] = [
    { x: 0, y: 0, w: W, h: EW.mallY + 6 },
    ...pillars.map((x) => foot(x, EW.road1 - 4, 10, 6)),
    { x: 0, y: EW.road1, w: 128, h: 50 },
    { x: 192, y: EW.road1, w: 128, h: 50 },
    { x: 0, y: EW.plaza.y0 - 4, w: 128, h: 5 },
    { x: 192, y: EW.plaza.y0 - 4, w: 128, h: 5 },
    { x: EW.shrine.x - 48, y: EW.shrine.y - 42, w: 96, h: 44 },
    { x: EW.sala.x - 42, y: EW.sala.y - 28, w: 84, h: 30 },
    foot(104, 546, 48, 8),
    foot(214, 552, 42, 8),
    foot(90, 402, 36, 8),
    foot(206, 398, 36, 8),
    foot(132, 580, 20, 7),
    foot(190, 580, 14, 5),
    foot(206, 582, 14, 5),
    foot(52, 636, 50, 10),
    foot(240, 646, 44, 10),
    ...trees.map(([x, y]) => foot(x, y, 28, 10)),
    foot(300, 560, 12, 8),
    { x: 0, y: EW.road2, w: 128, h: H - EW.road2 },
    { x: 192, y: EW.road2, w: 128, h: H - EW.road2 },
    { x: 0, y: H - 6, w: W, h: 6 },
    ...lamps.map(([x, y]) => foot(x, y, 6, 4)),
  ]
  const hotspots: Hotspot[] = [
    hs('pray', 'ท้าวมหาพรหม (พักตร์แรก)', 'ไหว้ขอพร เวียนตามเข็มนาฬิกา', 'pray', { x: EW.shrine.x - 26, y: 420, w: 52, h: 80 }, { x: EW.shrine.x, y: 560 }, 'up', { beacon: true, marker: { x: EW.shrine.x, y: 440 } }),
    hs('brahma', 'พระพรหมพักตร์ที่สอง', 'ถวายมาลัย ธูป 9 ดอก ให้ครบสี่หน้า', 'deity', { x: EW.shrine.x + 30, y: 470, w: 22, h: 50 }, { x: EW.shrine.x + 58, y: 504 }, 'left'),
    hs('incense', 'กระถางธูปหน้าศาล', 'จุดธูปขอพรให้สมหวัง', 'incense', { x: 118, y: 556, w: 28, h: 26 }, { x: 132, y: 592 }),
    hs('job:light_candles', 'เชิงเทียนหน้าศาล', 'ช่วยจุดเทียนและเก็บเทียนที่ดับ', 'broom', { x: 184, y: 560, w: 30, h: 24 }, { x: 198, y: 596 }),
    hs('job:wipe_statues', 'ช้างไม้แก้บน', 'ช่วยเช็ดช้างไม้ให้สะอาด', 'broom', { x: 80, y: 526, w: 50, h: 22 }, { x: 104, y: 558 }),
    hs('shop:erawan_garland', 'ร้านพวงมาลัย', 'มาลัยดาวเรือง ชุดไหว้ ช้างไม้', 'shop', { x: 28, y: 598, w: 50, h: 40 }, { x: 60, y: 650 }),
    hs('shop:erawan_dance', 'จองรำแก้บน', 'จ้างคณะรำถวาย (มีโปรฯ!)', 'shop', { x: 220, y: 600, w: 42, h: 46 }, { x: 222, y: 656 }),
    hs('gate', 'ป้ายรถเมล์ / BTS ชิดลม', 'กลับบ้าน / ไปที่อื่น', 'map', { x: 130, y: 660, w: 60, h: 40 }, { x: 160, y: 684 }, 'down', { near: 12 }),
  ]
  return {
    id: 'erawan',
    place: 'erawan',
    area: 'shrine',
    w: W,
    h: H,
    skyH: 90,
    ground: '#d6cfca',
    camBias: 0.6,
    bake: (g, night) => ewBake(g, night, screens),
    props,
    obstacles,
    hotspots,
    spawn: { x: 160, y: 680, face: 'up' },
    pickupSpots: [
      { x: 40, y: 360 },
      { x: 280, y: 370 },
      { x: 70, y: 470 },
      { x: 250, y: 500 },
      { x: 160, y: 620 },
      { x: 280, y: 610 },
      { x: 60, y: 215 },
      { x: 260, y: 220 },
      { x: 110, y: 680 },
    ],
    lights: [
      ...lamps.map(([x, y]) => ({ x: x - 7, y: y - 40, r: 22 })),
      { x: EW.shrine.x, y: 470, r: 46, color: '#ffe7a0' },
      { x: EW.sala.x, y: 420, r: 30, color: '#ffcf7a' },
      { x: 132, y: 566, r: 12, color: '#ff9a5a' },
      { x: 198, y: 568, r: 10, color: '#ffb35a' },
      { x: 60, y: 110, r: 50, color: '#ffb3e0' },
      { x: 160, y: 100, r: 50, color: '#b3e8ff' },
      { x: 266, y: 120, r: 50, color: '#ffe7a8' },
    ],
    life(s) {
      return [
        new Glints(s, hooks(shrine, 'glints', EW.shrine), 1.8),
        new EaveBells(s, [...hooks(shrine, 'bells', EW.shrine), ...hooks(sala, 'bells', EW.sala)], EW.shrine.y),
        Flames.candles(s, 190, 580),
        Flames.candles(s, 206, 582),
        new Smoke(s, [{ x: 132, y: 566 }], 16),
        {
          update: (dt: number) => {
            // Incense haze drifting over the whole shrine.
            if (Math.random() < dt * 3) s.particles.add({ kind: 'smoke', x: EW.shrine.x + rand(-40, 40), y: EW.shrine.y + rand(-10, 30), vx: rand(-3, 3), vy: rand(-8, -4), max: rand(2, 3.5), color: '#f4eef8', size: 2 })
          },
          ground: (g: Surface, t: number) => {
            screens.forEach((r, i) => s.onScreen(r.x + r.w / 2, r.y + r.h / 2, 40) && ERA.drawLED(g, r, t, i))
          },
          glow: (g: Surface, _t: number, light: number) => {
            if (light > 0.3) for (const r of screens) drawGlow(g, r.x + r.w / 2, r.y + r.h / 2, 34, light * 0.5, '#ffd0f0')
          },
        } as Life,
        new CityTraffic(s, [
          { y: EW.road1 + 14, dir: 1 },
          { y: EW.road1 + 30, dir: -1 },
          { y: EW.road1 + 46, dir: -1 },
          { y: EW.road2 + 22, dir: 1 },
          { y: EW.road2 + 46, dir: -1 },
        ]),
        new Skytrain(s, EW.bts),
        new Gags(s, ewGags()),
        new TapZones([
          talk(s, { x: EW.shrine.x - 14, y: 460, w: 28, h: 40 }, ['ท้าวมหาพรหม สี่พักตร์ แปดกร', 'ประทานพรทุกทิศ ทั้งการงาน ความรัก โชคลาภ', 'ไหว้ครบสี่หน้า เวียนตามเข็มนาฬิกานะ'], (x, y) => {
            s.particles.sparkles(x, y, 12, '#fff3a6', 10)
            sfx.chime()
          }),
          talk(s, { x: 80, y: 526, w: 50, h: 22 }, ['ช้างไม้แก้บน… มีเป็นร้อยตัว!', 'ปู๊น~ (ช้างไม้ทำเสียงไม่ได้หรอก)'], () => s.shake('ele1')),
          talk(s, { x: 190, y: 530, w: 46, h: 22 }, ['คนสมหวังเยอะจริง ๆ ช้างเต็มลานเลย'], () => s.shake('ele2')),
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.6) s.particles.add({ kind: 'petal', x: rand(60, 260), y: rand(380, 460), vx: rand(-3, 3), vy: rand(4, 8), max: 3, color: '#f58f35', color2: '#ffd23f' })
    },
    wander: [
      { x: 30, y: 590, w: 260, h: 30 },
      { x: 30, y: 340, w: 260, h: 40 },
      { x: 20, y: 210, w: 280, h: 24 },
      { x: 20, y: 664, w: 280, h: 28 },
    ],
    pois: [
      { x: 150, y: 562, face: 'up' },
      { x: 170, y: 564, face: 'up' },
      { x: 216, y: 504, face: 'left' },
      { x: 104, y: 500, face: 'right' },
      { x: 160, y: 372, face: 'down' },
      { x: 250, y: 470, face: 'up' },
    ],
    birds: { x: 40, y: 330, w: 240, h: 30 },
    dogs: [],
    visitors: 12,
  }
}

// ---------------------------------------------------------------------------
// Golden Mount (Wat Saket): the hill with the spiral stairway.

const GM = {
  W: 320,
  H: 1100,
  chedi: { x: 160, y: 250 },
  path: [
    [160, 268],
    [262, 312],
    [262, 330],
    [62, 420],
    [62, 440],
    [262, 530],
    [262, 550],
    [62, 640],
    [62, 660],
    [230, 750],
    [160, 820],
    [160, 900],
  ] as [number, number][],
  base: 880,
}

function segDist(px: number, py: number, pts: [number, number][]): number {
  let best = Infinity
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const vx = bx - ax
    const vy = by - ay
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)))
    best = Math.min(best, Math.hypot(px - ax - vx * t, py - ay - vy * t))
  }
  return best
}

function gmBake(g: Surface, night: boolean) {
  const { W, H } = GM
  // City skyline around the hill.
  CITY.bangkokPanorama(g, 70, 170, W, night)
  // The artificial hill: layered green mound with rocks.
  const hill = (x: number, y: number) => {
    const t = (y - 230) / (GM.base - 230)
    const half = 40 + t * 125
    return Math.abs(x - 160) < half && y > 230
  }
  G.lawn(g, 0, 170, W, GM.base - 170, 21)
  G.treeLine(g, 180, W, G.LEAVES.deep, 12)
  for (let y = 226; y < GM.base + 4; y++) {
    const t = (y - 226) / (GM.base - 226)
    const half = 40 + Math.sqrt(t) * 128
    g.hline(Math.round(160 - half) - 2, Math.round(160 + half) + 1, y, '#3f7a52')
    for (let x = Math.round(160 - half); x < 160 + half; x++) {
      const n = BK.hsh(x >> 1, y >> 1, 3)
      g.px(x, y, n < 0.08 ? '#3f7a52' : n > 0.93 ? '#8fd070' : (x + y) % 7 === 0 ? '#5e9a5a' : '#6fb060')
    }
  }
  void hill
  for (let i = 0; i < 70; i++) {
    const y = 250 + Math.floor(BK.hsh(i, 1) * 600)
    const t = (y - 226) / (GM.base - 226)
    const x = 160 + (BK.hsh(i, 2) - 0.5) * (80 + Math.sqrt(t) * 240)
    g.ellipse(x, y, 4, 3, '#a8a098')
    g.ellipse(x - 1, y - 1, 3, 2, '#d0c9c0')
  }
  // Waterfall down the rocks.
  g.rect(104, 470, 8, 60, '#9fd8f0')
  g.vline(106, 470, 529, '#dff4ff')
  g.ellipse(108, 532, 14, 5, '#78c8e2')
  // The spiral stairway.
  CITY.stairPath(g, GM.path, 18)
  // Summit terrace.
  BK.marble(g, 96, 200, 128, 60, 5, 10, 'white')
  BK.platformFace(g, 96, 260, 128, 8, BK.WHITER, BK.BK.redD)
  // Wat Saket grounds at the foot.
  BK.granite(g, 0, GM.base, W, H - GM.base, 8)
  G.lawn(g, 0, GM.base + 10, 70, 150, 5)
  G.lawn(g, 250, GM.base + 10, 70, 150, 6)
  G.leafLitter(g, 0, GM.base + 20, 70, 120, 60, 7)
  G.paving(g, 140, GM.base, 40, H - GM.base, 8, 'grey')
}

function gmGags(): Gag[] {
  const tired = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_grey', bottom: 'bot_track', head: 'head_cap' })
  const granny = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sin_mudmee', hand: 'hand_fan' })
  const drinks = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_vendor', bottom: 'bot_black', head: 'head_sunhat' })
  const cloth = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_white', bottom: 'bot_khaki' })
  const runner = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_pe', bottom: 'bot_joggers' })
  return [
    person(200, 474, tired, ['แฮ่ก… แฮ่ก… อีกกี่ขั้นเนี่ย', 'ขั้นที่ 200… หรือ 199 ก็ไม่รู้แล้ว', 'ชีวิตจะสูงขึ้น… ขาก็สั่นขึ้น!']),
    person(120, 606, granny, ['ยายขึ้นทุกวันพระ แข็งแรงดี!', 'เดินช้า ๆ ไม่ต้องรีบนะหลาน', 'ลมบนเขาเย็นสบาย'], { view: 'side' }),
    {
      x: 150,
      y: 700,
      walk: { x0: 90, x1: 210, speed: 20 },
      lines: ['วิ่งขึ้นเขาทองทุกเช้า!', 'คาร์ดิโอสายบุญ!', 'หลบหน่อยค่า~'],
      draw: (g, p) => drawPerson(g, runner, p, 'front'),
    },
    person(262, 948, drinks, ['น้ำเย็น ๆ จ้า ขึ้นเขาเหนื่อยไหม?', 'น้ำมะตูม น้ำเก๊กฮวย ขวดละ 20', 'ขาลงค่อยซื้อก็ได้นะจ๊ะ'], { z: -2 }),
    person(62, 952, cloth, ['ผ้าแดงห่มองค์พระเจดีย์ครับ', 'ร่วมบุญห่มผ้าแดง งานวัดภูเขาทอง', 'ดอกบัว ธูปเทียน มีครบครับ'], { z: -2 }),
  ]
}

function goldenMountMap(): MapDef {
  const { W, H } = GM
  const chedi = CITY.goldenMountChedi(true)
  const rails: { x: number; y: number }[] = [
    { x: 160, y: 356 },
    { x: 160, y: 586 },
  ]
  const rail = CITY.bellRail(10)
  const ubosot = ARUN.arunUbosot()
  const hillTrees: [number, number, number][] = [
    [110, 300, 0],
    [220, 380, 1],
    [30, 520, 0],
    [290, 600, 1],
    [120, 500, 2],
    [210, 640, 3],
    [40, 760, 1],
    [280, 800, 0],
    [100, 720, 2],
  ]
  const lamps: [number, number][] = [
    [130, 920],
    [190, 920],
  ]
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const props: PlacedProp[] = [
    { sprite: chedi, x: GM.chedi.x, y: GM.chedi.y },
    ...rails.map((r) => ({ sprite: rail, x: r.x, y: r.y })),
    { sprite: CITY.gongSprite(), x: 80, y: 646 },
    { sprite: CITY.vultureStatue(), x: 240, y: 520, id: 'vulture' },
    { sprite: F.buddhaStatueSprite(), x: 40, y: 430 },
    { sprite: BK.hermitSprite(0), x: 280, y: 322 },
    { sprite: CITY.bonsaiPot(0), x: 244, y: 750 },
    { sprite: CITY.bonsaiPot(1), x: 262, y: 742 },
    ...hillTrees.map(([x, y, v]) => ({ sprite: v % 2 ? G.frangipani(v) : G.bougainvillea(v % 2), x, y, id: 'ht' + x })),
    { sprite: ubosot, x: 60, y: 1070 },
    { sprite: BK.drinkCart(), x: 262, y: 962 },
    { sprite: BK.amuletStall(), x: 62, y: 964 },
    { sprite: BK.ticketBooth(), x: 214, y: 900 },
    { sprite: G.takhianTree(), x: 290, y: 1060, id: 'tak' },
    { sprite: G.coconutPalm(0), x: 14, y: 900 },
    ...lamps.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const walk = (x: number, y: number) => segDist(x, y, GM.path) < 8
  const obstacles: Rect[] = [
    { x: 0, y: 0, w: W, h: 200 },
    { x: 0, y: 200, w: W, h: 60 },
    ...maskRects(0, 260, W, GM.base, walk),
    foot(80, 646, 10, 4),
    foot(214, 900, 30, 10),
    foot(262, 962, 34, 8),
    foot(62, 964, 46, 10),
    { x: 0, y: 1000, w: 130, h: 100 },
    foot(290, 1060, 26, 12),
    foot(14, 900, 8, 6),
    ...lamps.map(([x, y]) => foot(x, y, 6, 4)),
    { x: 0, y: H - 6, w: W, h: 6 },
  ]
  const hotspots: Hotspot[] = [
    hs('door:golden_mount:summit', 'ขึ้นลานยอดภูเขาทอง', 'ขั้นสุดท้ายสู่พระบรมบรรพต', 'temple', { x: 130, y: 110, w: 60, h: 150 }, { x: 160, y: 272 }, 'up', { beacon: true, marker: { x: 160, y: 100 }, near: 14 }),
    hs('bells', 'แถวระฆังริมทางขึ้น', 'ตีระฆังเรียงรายขอพร', 'bell', { x: 120, y: 330, w: 80, h: 28 }, { x: 160, y: 372 }, 'up'),
    hs('view', 'จุดชมวิวกลางทาง', 'นั่งพักชมวิวกรุงเทพฯ', 'meditate', { x: 246, y: 520, w: 30, h: 30 }, { x: 258, y: 540 }, 'down'),
    hs('job:water_plants', 'สวนบนเนินเขา', 'ช่วยรดน้ำต้นไม้ไม้ดัด', 'broom', { x: 236, y: 722, w: 36, h: 30 }, { x: 222, y: 748 }),
    hs('job:sweep_leaves', 'ลานวัดสระเกศ', 'ช่วยกวาดใบไม้ตีนเขา', 'broom', { x: 264, y: 1000, w: 50, h: 60 }, { x: 250, y: 1060 }),
    hs('shop:golden_mount_drinks', 'ร้านน้ำเย็นตีนเขา', 'น้ำมะตูม เก๊กฮวย น้ำเย็น', 'shop', { x: 244, y: 918, w: 36, h: 44 }, { x: 240, y: 976 }),
    hs('shop:golden_mount_redcloth', 'ร้านผ้าแดงและของที่ระลึก', 'ผ้าแดงห่มเจดีย์ ระฆังจิ๋ว', 'shop', { x: 40, y: 920, w: 46, h: 44 }, { x: 90, y: 976 }),
    hs('gate', 'ประตูวัดสระเกศ', 'กลับบ้าน / ไปที่อื่น', 'map', { x: 130, y: 1050, w: 60, h: 50 }, { x: 160, y: 1086 }, 'down', { near: 12 }),
  ]
  return {
    id: 'golden_mount',
    place: 'golden_mount',
    area: 'mountain',
    w: W,
    h: H,
    skyH: 120,
    ground: '#d8d2cc',
    camBias: 0.6,
    bake: gmBake,
    props,
    obstacles,
    hotspots,
    entries: { 'golden_mount:summit': { x: 172, y: 276, face: 'down' } },
    spawn: { x: 160, y: 1080, face: 'up' },
    pickupSpots: [
      { x: 212, y: 352 },
      { x: 100, y: 404 },
      { x: 200, y: 504 },
      { x: 110, y: 618 },
      { x: 150, y: 700 },
      { x: 200, y: 950 },
      { x: 146, y: 1040 },
      { x: 230, y: 1010 },
    ],
    lights: [
      ...lamps.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: GM.chedi.x, y: 180, r: 60, color: '#ffe7a0' },
      ...GM.path.filter((_, i) => i % 2 === 0).map(([x, y]) => ({ x, y: y - 6, r: 12, color: '#fff0c0' })),
    ],
    life(s) {
      const ringBells = rails.map((r) => {
        const pts = hooks(rail, 'bells', r)
        return new RackBells(s, pts, { x: r.x - 38, y: r.y - 28, w: 76, h: 26 }, r.y)
      })
      return [
        new Glints(s, hooks(chedi, 'glints', GM.chedi), 1.4),
        ...ringBells,
        new CloudShadows(s, 3),
        new SunRays(s),
        new Butterflies(s, [
          { x: 60, y: 400, w: 200, h: 300 },
          { x: 250, y: 900, w: 70, h: 100 },
        ], 6),
        new Gags(s, gmGags()),
        {
          ground: (g: Surface, t: number) => {
            for (let i = 0; i < 6; i++) {
              const y = 470 + ((t * 40 + i * 11) % 60)
              g.px(105 + (i % 3) * 2, y, '#ffffff')
            }
          },
        },
        new TapZones([
          talk(s, { x: 70, y: 620, w: 22, h: 30 }, ['โก๊ง~~~', 'เสียงฆ้องดังไปทั้งเขา!'], () => sfx.bigBell()),
          talk(s, { x: 230, y: 488, w: 22, h: 34 }, ['แร้งวัดสระเกศในตำนาน…', 'ตอนนี้ข้ากินมังสวิรัติแล้วนะ', '(รูปปั้นเฉย ๆ ไม่ต้องกลัว)'], () => s.shake('vulture')),
          talk(s, { x: 130, y: 110, w: 60, h: 100 }, ['พระบรมบรรพต ภูเขาทองสูง 58 เมตร', 'ประดิษฐานพระบรมสารีริกธาตุ', 'ขึ้นบันได 344 ขั้น ชีวิตก็สูงขึ้น!'], (x, y) => s.particles.sparkles(x, y, 10, '#fff3a6', 10)),
          ...hillTrees.map(([x, y, v]) => shakeTree(s, 'ht' + x, x, y + 10, 36, v % 2 ? ['#fffaf0', '#ffd23f'] : ['#ff6fa0', '#ffd6e0'], 'petal')),
          shakeTree(s, 'tak', 290, 1040, 70, ['#5eae55', '#3f8a4f']),
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 2) s.particles.add({ kind: 'smoke', x: 108 + rand(-10, 10), y: 530, vx: rand(-4, 4), vy: rand(-6, -2), max: 1.4, color: '#e8f8ff' })
    },
    wander: [
      { x: 140, y: 900, w: 40, h: 160 },
      { x: 90, y: 940, w: 140, h: 40 },
    ],
    pois: [
      { x: 160, y: 372, face: 'up' },
      { x: 258, y: 540, face: 'down' },
      { x: 90, y: 976, face: 'up' },
      { x: 160, y: 910, face: 'up' },
    ],
    birds: { x: 150, y: 1000, w: 90, h: 40 },
    cats: [{ x: 110, y: 1020, pose: 'sleep', color: '#f5a55a' }],
    dogs: ['somo'],
    visitors: 7,
  }
}

// ---------------------------------------------------------------------------
// Golden Mount: the summit terrace around the golden chedi.

function gmSummitMap(): MapDef {
  const W = 260
  const H = 320
  const chedi = CITY.goldenMountChedi(true)
  const CH = { x: 130, y: 238 }
  const rail = CITY.bellRail(6)
  const rails: Pt[] = [
    { x: 36, y: 270 },
    { x: 224, y: 270 },
  ]
  const monk = { novice: false, skin: 1 }
  const couple = [look({ gender: 'f', hair: 'hair_long', top: 'top_floral', bottom: 'bot_skirt' }), look({ gender: 'm', hair: 'hair_short', top: 'top_polo', bottom: 'bot_jeans' })]
  const gags: Gag[] = [
    {
      x: 60,
      y: 176,
      w: 30,
      lines: ['วิวกรุงเทพฯ 360 องศา สวยจัง!', 'เห็นวัดสุทัศน์กับเสาชิงช้าด้วย', 'ขึ้นมาเหนื่อยแต่คุ้มมาก'],
      draw: (g, p) => {
        drawPerson(g, couple[0], { ...p, x: p.x - 6 }, 'back')
        drawPerson(g, couple[1], { ...p, x: p.x + 6 }, 'back', ['selfie'])
      },
      react: (sc, x, y) => gagFx.flash(sc, x, y),
    },
    {
      x: 200,
      y: 290,
      lines: ['เจริญพร~ ขึ้นมาถึงยอดแล้ว เก่งมาก', 'ขอให้ชีวิตสูงขึ้นเหมือนภูเขาทองนะโยม'],
      draw: (g, p) => {
        const sp = monkSprite('front', p.react > 0 ? 'bless' : 'stand', monk)
        drawShadow(g, p.x, p.y, 6, 2)
        g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 1))
      },
    },
  ]
  return {
    id: 'golden_mount:summit',
    place: 'golden_mount',
    area: 'mountain',
    w: W,
    h: H,
    skyH: 120,
    ground: '#f2ede6',
    camBias: 0.55,
    bake(g, night) {
      CITY.bangkokPanorama(g, 70, 168, W, night)
      BK.marble(g, 0, 168, W, H - 168, 3, 12, 'white')
      BK.balustrade(g, 0, W - 1, 172, BK.WHITER, 8, 5)
      g.rect(0, 172, W, 2, BK.GOLD.d)
      BK.blobShadow(g, CH.x, CH.y - 4, 60, 8, 0.16)
      G.mandala(g, CH.x, CH.y + 30, 20)
      // Stairwell down.
      g.rect(W / 2 - 18, H - 12, 36, 12, '#5a5068')
      for (let i = 0; i < 4; i++) g.hline(W / 2 - 16, W / 2 + 15, H - 11 + i * 3, '#8c8699')
    },
    props: [
      { sprite: chedi, x: CH.x, y: CH.y },
      ...rails.map((r) => ({ sprite: rail, x: r.x, y: r.y })),
      { sprite: F.candleStandSprite(), x: 104, y: 262 },
      { sprite: F.candleStandSprite(), x: 156, y: 262 },
      { sprite: F.urnSprite(), x: 130, y: 268, shadow: [10, 2] },
      { sprite: INT.altarTable(34), x: 60, y: 226 },
      { sprite: F.donationSprite(), x: 206, y: 230 },
    ],
    obstacles: [
      { x: 0, y: 0, w: W, h: 178 },
      { x: CH.x - 54, y: CH.y - 40, w: 108, h: 42 },
      ...rails.map((r) => foot(r.x, r.y, 50, 5)),
      foot(104, 262, 14, 5),
      foot(156, 262, 14, 5),
      foot(130, 268, 20, 7),
      foot(60, 226, 34, 8),
      foot(206, 230, 12, 6),
      { x: 0, y: H - 4, w: W / 2 - 18, h: 4 },
      { x: W / 2 + 18, y: H - 4, w: W / 2 - 18, h: 4 },
    ],
    hotspots: [
      hs('pray', 'สักการะพระบรมสารีริกธาตุ', 'สวดมนต์บนยอดภูเขาทอง', 'pray', { x: 100, y: 100, w: 60, h: 130 }, { x: CH.x, y: 284 }, 'up', { beacon: true, marker: { x: CH.x, y: 96 } }),
      hs('chedi', 'เวียนรอบเจดีย์ทอง', 'เดินเวียนเทียนสามรอบ', 'sparkle', { x: 176, y: 196, w: 30, h: 40 }, { x: 196, y: 250 }, 'left'),
      hs('view', 'ระเบียงชมวิว', 'นั่งสมาธิชมกรุงเทพฯ จากที่สูง', 'meditate', { x: 20, y: 150, w: 60, h: 30 }, { x: 40, y: 186 }, 'up'),
      hs('bells', 'ระฆังรอบลาน', 'ตีระฆังบนยอดเขา', 'bell', { x: 200, y: 246, w: 50, h: 26 }, { x: 224, y: 284 }, 'up'),
      hs('job:polish_brass', 'ระฆังทองเหลือง', 'ช่วยขัดระฆังให้เงางาม', 'broom', { x: 12, y: 246, w: 50, h: 26 }, { x: 36, y: 284 }, 'up'),
      hs('door:golden_mount', 'บันไดลงเขา', 'กลับลงไปตามทางวน', 'map', { x: W / 2 - 18, y: H - 20, w: 36, h: 20 }, { x: W / 2, y: H - 6 }, 'down', { near: 10 }),
    ],
    entries: { golden_mount: { x: W / 2, y: H - 24, face: 'up' } },
    spawn: { x: W / 2, y: H - 24, face: 'up' },
    pickupSpots: [
      { x: 30, y: 210 },
      { x: 230, y: 200 },
    ],
    lights: [
      { x: CH.x, y: 170, r: 60, color: '#ffe7a0' },
      { x: 104, y: 246, r: 10, color: '#ffb35a' },
      { x: 156, y: 246, r: 10, color: '#ffb35a' },
    ],
    life(s) {
      return [
        new Glints(s, hooks(chedi, 'glints', CH), 1.8),
        ...rails.map((r) => new RackBells(s, hooks(rail, 'bells', r), { x: r.x - 26, y: r.y - 28, w: 52, h: 26 }, r.y)),
        Flames.candles(s, 104, 262),
        Flames.candles(s, 156, 262),
        new Smoke(s, [{ x: 130, y: 254 }], 6),
        new Gags(s, gags),
        new SunRays(s),
        new TapZones([talk(s, { x: 0, y: 70, w: W, h: 96 }, ['ไกลลิบ ๆ คือตึกใบหยก', 'หลังคาวัดสุทัศน์กับเสาชิงช้า', 'ลมเย็นสบายบนยอดเขา~'])]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.5) s.particles.add({ kind: 'petal', x: rand(0, W), y: rand(170, 200), vx: rand(6, 12), vy: rand(-2, 3), max: 3, color: '#f58f35', color2: '#ffd23f' })
    },
    wander: [{ x: 20, y: 186, w: 220, h: 100 }],
    pois: [
      { x: 40, y: 186, face: 'up' },
      { x: 120, y: 284, face: 'up' },
      { x: 220, y: 190, face: 'up' },
    ],
    birds: { x: 40, y: 190, w: 180, h: 20 },
    dogs: [],
    visitors: 4,
  }
}

// ---------------------------------------------------------------------------
// Wat Traimit and Yaowarat.

const TM = {
  W: 320,
  H: 960,
  mondop: { x: 160, y: 430 },
  wall: 610,
  gate: { x: 160, y: 700 },
  rowY: 800,
  road: 850,
}

function tmGags(): Gag[] {
  const cook = look({ gender: 'm', hair: 'hair_buzz', top: 'top_chef', bottom: 'bot_black', head: 'head_chefhat' })
  const auntie = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', bottom: 'bot_black' })
  const gold = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_raj', bottom: 'bot_slacks_grey', head: 'head_glasses' })
  const foodie = look({ gender: 'f', hair: 'hair_bob', top: 'top_tee_black', bottom: 'bot_jeans', hand: 'hand_phone' })
  const kid = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_lotus', bottom: 'bot_denim_shorts', hand: 'hand_lookchin' })
  return [
    person(84, 828, cook, ['ก๋วยเตี๋ยวลูกชิ้นปลา ร้อน ๆ ครับ!', 'เกาเหลาเครื่องในใส่ไข่ไหม?', 'ร้านนี้เปิดมาสามรุ่นแล้ว!'], { z: -2 }),
    person(236, 830, auntie, ['เกาลัดคั่วหอม ๆ จ้า', 'ขนมปังปิ้งสังขยาใบเตย', 'ซื้อสองแถมหนึ่งจ้า~'], { z: -2 }),
    person(130, 796, gold, ['ห้างทองครับ รับซื้อ-ขาย ทองคำแท้', 'ทองขึ้นอีกแล้ววันนี้!', 'แผ่นทองปิดพระก็มีครับ']),
    {
      x: 180,
      y: 838,
      walk: { x0: 20, x1: 300, speed: 10 },
      lines: ['รีวิวร้านนี้ห้าดาว!', 'อิ่มแล้ว… แต่ยังกินได้อีก', 'เยาวราชตอนกลางคืนไฟสวยมาก!'],
      draw: (g, p) => drawPerson(g, foodie, p, 'front', ['phone']),
    },
    {
      x: 200,
      y: 660,
      lines: ['หลวงพ่อทองคำหนักห้าตันครึ่ง!', 'เคยถูกพอกปูนซ่อนไว้ ไม่มีใครรู้เลย', 'ขอให้รวย ๆ เฮง ๆ'],
      draw: (g, p) => drawPerson(g, kid, p, 'front', ['drink']),
    },
  ]
}

function tmBake(g: Surface, night: boolean): Pt[] {
  const { W, H } = TM
  CITY.bangkokPanorama(g, 60, 150, W, night)
  BK.marble(g, 0, 150, W, TM.wall - 150, 6, 12, 'white')
  G.mandala(g, TM.mondop.x, TM.mondop.y + 30, 24)
  // Plaza with the Chinatown gate.
  BK.granite(g, 0, TM.wall, W, TM.rowY - 60 - TM.wall, 9)
  G.paving(g, 140, TM.wall, 40, TM.rowY - TM.wall, 8, 'grey')
  // Shophouses (with a soi gap in the middle) and the sidewalk.
  const signs = [...CITY.yaowaratRow(g, 0, 140, TM.rowY, 12, night), ...CITY.yaowaratRow(g, 182, W + 10, TM.rowY, 31, night)]
  BK.granite(g, 140, TM.rowY - 66, 42, 66, 2)
  BK.sidewalk(g, 0, TM.rowY, W, TM.road - TM.rowY - 2, 5)
  BK.kerbStripes(g, 0, TM.road - 2, W, '#fffaf0', '#e8514a')
  BK.asphalt(g, 0, TM.road, W, 50, { lanes: 2, yellow: true, seed: 7 })
  BK.kerbStripes(g, 0, TM.road + 50, W, '#fffaf0', '#e8514a')
  BK.sidewalk(g, 0, TM.road + 52, W, H - TM.road - 52, 6)
  return signs
}

function watTraimitMap(): MapDef {
  const { W, H } = TM
  const mondop = CITY.traimitMondop()
  const mondopN = CITY.traimitMondop(true)
  const gate = CITY.chinaGate()
  const hall = ARUN.arunUbosot()
  let signs: Pt[] = []
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const lamps: [number, number][] = [
    [110, 480],
    [210, 480],
    [30, 600],
    [290, 600],
  ]
  const props: PlacedProp[] = [
    { sprite: mondop, night: mondopN, x: TM.mondop.x, y: TM.mondop.y },
    { sprite: F.urnSprite(), x: 160, y: 486, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 134, y: 484 },
    { sprite: F.candleStandSprite(), x: 186, y: 484 },
    { sprite: CITY.bonsaiPot(0), x: 40, y: 470 },
    { sprite: CITY.bonsaiPot(1), x: 62, y: 476 },
    { sprite: CITY.bonsaiPot(0), x: 258, y: 476 },
    { sprite: CITY.bonsaiPot(1), x: 280, y: 470 },
    { sprite: G.bodhiTree2(), x: 286, y: 560, id: 'bodhi' },
    { sprite: F.spiritHouseSprite(), x: 30, y: 540 },
    { sprite: BK.singhaSprite(), x: 120, y: 450 },
    { sprite: BK.singhaSprite(true), x: 200, y: 450 },
    { sprite: T.wallSprite(140), x: 0, y: TM.wall },
    { sprite: T.wallSprite(140), x: 180, y: TM.wall },
    { sprite: T.gateSprite(), x: 160, y: TM.wall },
    { sprite: gate, x: TM.gate.x, y: TM.gate.y },
    { sprite: BK.streetFoodCart('noodle'), x: 84, y: 842 },
    { sprite: BK.streetFoodCart('chestnut'), x: 236, y: 842 },
    { sprite: BK.plasticTable(), x: 40, y: 836 },
    { sprite: BK.plasticTable(), x: 290, y: 838 },
    { sprite: BK.streetFoodCart('toast'), x: 300, y: 690 },
    { sprite: BK.plasticTable(), x: 262, y: 700 },
    ...lamps.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  void hall
  const obstacles: Rect[] = [
    { x: 0, y: 0, w: W, h: 160 },
    { x: 80, y: 300, w: 160, h: 118 },
    { x: 146, y: 418, w: 28, h: 4 },
    { x: 80, y: 418, w: 60, h: 14 },
    { x: 180, y: 418, w: 60, h: 14 },
    foot(160, 486, 20, 7),
    foot(134, 484, 14, 5),
    foot(186, 484, 14, 5),
    ...[40, 62, 258, 280].map((x) => foot(x, 474, 14, 5)),
    foot(286, 560, 30, 10),
    foot(30, 540, 12, 8),
    foot(120, 450, 16, 6),
    foot(200, 450, 16, 6),
    { x: 0, y: TM.wall - 12, w: 142, h: 14 },
    { x: 178, y: TM.wall - 12, w: 142, h: 14 },
    ...[8, 26, 72, 90].map((dx) => ({ x: TM.gate.x - 52 + dx, y: TM.gate.y - 6, w: 6, h: 6 })),
    // Shophouse fronts (the soi stays open).
    { x: 0, y: TM.rowY - 66, w: 140, h: 62 },
    { x: 182, y: TM.rowY - 66, w: W - 182, h: 62 },
    foot(84, 842, 44, 8),
    foot(236, 842, 44, 8),
    foot(40, 836, 26, 6),
    foot(290, 838, 26, 6),
    foot(300, 690, 44, 8),
    foot(262, 700, 26, 6),
    { x: 0, y: TM.road, w: 140, h: 50 },
    { x: 180, y: TM.road, w: 140, h: 50 },
    { x: 0, y: H - 6, w: W, h: 6 },
    ...lamps.map(([x, y]) => foot(x, y, 6, 4)),
  ]
  const hotspots: Hotspot[] = [
    hs('door:wat_traimit:hall', 'ขึ้นพระมหามณฑป', 'กราบหลวงพ่อทองคำชั้นบนสุด', 'temple', { x: 140, y: 250, w: 40, h: 170 }, { x: 160, y: 440 }, 'up', { beacon: true, marker: { x: 160, y: 200 }, near: 14 }),
    hs('incense', 'กระถางธูปหน้ามณฑป', 'จุดธูปขอให้ค้าขายรุ่งเรือง', 'incense', { x: 146, y: 462, w: 28, h: 26 }, { x: 160, y: 500 }),
    hs('job:water_plants', 'ไม้ดัดในกระถางลายคราม', 'ช่วยรดน้ำไม้ดัด', 'broom', { x: 30, y: 450, w: 42, h: 26 }, { x: 52, y: 492 }),
    hs('job:sweep_leaves', 'ใบโพธิ์ร่วงหน้าวัด', 'ช่วยกวาดลานวัด', 'broom', { x: 256, y: 500, w: 60, h: 60 }, { x: 260, y: 578 }),
    hs('shop:wat_traimit_streetfood', 'สตรีทฟู้ดเยาวราช', 'ก๋วยเตี๋ยว เกาลัด ขนมปังปิ้ง', 'shop', { x: 62, y: 800, w: 46, h: 44 }, { x: 110, y: 846 }),
    hs('shop:wat_traimit_gold', 'ห้างทองเยาวราช', 'แผ่นทองปิดพระ เครื่องประดับทองคำ', 'shop', { x: 108, y: 740, w: 30, h: 56 }, { x: 128, y: 808 }),
    hs('gate', 'ถนนเยาวราช', 'เรียกแท็กซี่กลับบ้าน / ไปที่อื่น', 'map', { x: 140, y: TM.road, w: 40, h: 50 }, { x: 160, y: TM.road + 60 }, 'down', { near: 12 }),
  ]
  return {
    id: 'wat_traimit',
    place: 'wat_traimit',
    area: 'wat',
    w: W,
    h: H,
    skyH: 150,
    ground: '#d6cfca',
    camBias: 0.6,
    bake: (g, night) => {
      signs = tmBake(g, night)
    },
    props,
    obstacles,
    hotspots,
    entries: { 'wat_traimit:hall': { x: 160, y: 452, face: 'down' } },
    spawn: { x: 160, y: TM.road + 70, face: 'up' },
    pickupSpots: [
      { x: 60, y: 520 },
      { x: 240, y: 520 },
      { x: 100, y: 580 },
      { x: 220, y: 640 },
      { x: 60, y: 680 },
      { x: 20, y: 820 },
      { x: 300, y: 930 },
    ],
    lights: [
      ...lamps.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: TM.mondop.x, y: 260, r: 60, color: '#ffe7a0' },
      { x: TM.gate.x, y: 650, r: 40, color: '#ff9a8a' },
      { x: 84, y: 812, r: 18, color: '#ffcf7a' },
      { x: 236, y: 812, r: 18, color: '#ffcf7a' },
      ...[20, 70, 120, 200, 250, 300].map((x) => ({ x, y: 770, r: 20, color: ['#ff4f7a', '#ffd23f', '#4fd8ff', '#6cf07a', '#ff8a3a'][x % 5] })),
    ],
    life(s) {
      const neon = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: 14 + i * 40 + (i > 3 ? 12 : 0), y: 790, v: i }))
      return [
        new Glints(s, [...hooks(mondop, 'glints', TM.mondop), ...hooks(gate, 'glints', TM.gate)], 1.6),
        Flames.candles(s, 134, 484),
        Flames.candles(s, 186, 484),
        new Smoke(s, [{ x: 160, y: 472 }], 8),
        new Smoke(s, [
          { x: 90, y: 818 },
          { x: 240, y: 818 },
        ], 5),
        {
          // Neon signs hanging over the sidewalk; bright again after the night tint.
          sorted: (add: (y: number, d: () => void) => void) => {
            for (const n of neon) if (s.onScreen(n.x, n.y - 20, 30)) add(n.y + 4, () => {
              const sp = CITY.neonSign(n.v, s.isNight())
              s.gfx.draw(sp.canvas, n.x - sp.ax, n.y - sp.ay)
            })
          },
          glow: (g: Surface, t: number, light: number) => {
            if (light < 0.4) return
            for (const n of neon) {
              if (!s.onScreen(n.x, n.y - 20, 30)) continue
              const sp = CITY.neonSign(n.v, true)
              if ((Math.floor(t * 3) + n.v) % 11 !== 0) g.draw(sp.canvas, n.x - sp.ax, n.y - sp.ay)
              drawGlow(g, n.x, n.y - sp.h / 2, 16, light * 0.5, ['#ff4f7a', '#ffd23f', '#4fd8ff', '#6cf07a', '#ff8a3a'][n.v % 5])
            }
          },
        } as Life,
        new Lanterns(s, [
          { x0: 60, y0: 640, x1: 260, y1: 640, n: 10, sag: 10, colors: ['#e8514a'] },
          { x0: 0, y0: 740, x1: 140, y1: 740, n: 6, sag: 6, colors: ['#e8514a', '#ffd23f'] },
          { x0: 182, y0: 740, x1: 320, y1: 740, n: 6, sag: 6, colors: ['#e8514a', '#ffd23f'] },
        ]),
        new CityTraffic(s, [
          { y: TM.road + 22, dir: 1 },
          { y: TM.road + 46, dir: -1 },
        ]),
        new Gags(s, tmGags()),
        new TapZones([
          shakeTree(s, 'bodhi', 286, 540, 70, ['#9ed86a', '#5eae55']),
          talk(s, { x: 110, y: 610, w: 100, h: 40 }, ['ซุ้มประตูเฉลิมพระเกียรติ ประตูสู่เยาวราช', 'หลังคากระเบื้องเขียว มังกรคาบแก้ว', 'ยินดีต้อนรับสู่ไชน่าทาวน์!'], (x, y) => s.particles.sparkles(x, y, 8, '#ffd23f', 8)),
          talk(s, { x: 90, y: 200, w: 140, h: 200 }, ['พระมหามณฑปหินอ่อนสี่ชั้น', 'หลวงพ่อทองคำอยู่ชั้นบนสุด', 'ชั้นล่างมีพิพิธภัณฑ์เยาวราชด้วย'], (x, y) => s.particles.sparkles(x, y, 8, '#fff3a6', 8)),
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.3) s.particles.add({ kind: 'leaf', x: 286 + rand(-30, 30), y: 490, vx: rand(-4, 4), vy: rand(6, 11), max: 3, color: '#9ed86a', color2: '#5eae55' })
      void signs
    },
    wander: [
      { x: 20, y: 500, w: 280, h: 90 },
      { x: 20, y: 812, w: 280, h: 30 },
      { x: 40, y: 640, w: 240, h: 60 },
    ],
    pois: [
      { x: 152, y: 500, face: 'up' },
      { x: 168, y: 500, face: 'up' },
      { x: 110, y: 850, face: 'up' },
      { x: 128, y: 808, face: 'up' },
      { x: 160, y: 710, face: 'up' },
    ],
    birds: { x: 60, y: 520, w: 200, h: 40 },
    cats: [
      { x: 150, y: 780, pose: 'loaf', color: '#fbf3e4' },
      { x: 50, y: 560, pose: 'sleep', color: '#f5a55a' },
    ],
    dogs: ['thuadam'],
    visitors: 10,
  }
}

// ---------------------------------------------------------------------------
// Wat Traimit: the top floor with Luang Pho Thong Kham, the Golden Buddha.

function tmHallMap(): MapDef {
  const W = 240
  const H = 320
  const alt = INT.principalAltar('traimit', { s: 0.86, arch: '#8a1e2c', archD: '#b8343f', W: 150, H: 196 })
  const AL = { x: 120, y: 214 }
  const people: [number, number, 'kneel' | 'wai' | 'bow'][] = [
    [92, 262, 'wai'],
    [118, 266, 'kneel'],
    [148, 262, 'bow'],
    [104, 290, 'kneel'],
  ]
  const looks = people.map((_, i) => look({ gender: i % 2 ? 'm' : 'f', top: ['top_thaisilk', 'top_white', 'top_mohom', 'top_polo'][i], bottom: ['bot_sin_mudmee', 'bot_black', 'bot_skirt', 'bot_khaki'][i] }))
  const tourist = look({ gender: 'm', hair: 'hair_short', hairColor: 2, top: 'top_hawaii', bottom: 'bot_khaki', head: 'head_sunglasses' })
  const gags: Gag[] = [
    ...people.map(([x, y, pose], i) => ({
      x,
      y,
      lines: ['ขอให้ค้าขายร่ำรวย เงินทองไหลมา', '(กราบสามครั้ง)', 'สาธุ~ เฮง ๆ รวย ๆ'],
      draw: (g: Surface, p: GagPose) => drawPerson(g, looks[i], p, 'back', [], pose),
    })),
    {
      x: 196,
      y: 286,
      lines: ['Solid gold?! Five and a half tons?!', 'ทองทั้งองค์เลยเหรอเนี่ย!', 'เงาจนเห็นหน้าตัวเองเลย'],
      draw: (g, p) => drawPerson(g, tourist, p, 'back'),
    },
  ]
  return {
    id: 'wat_traimit:hall',
    place: 'wat_traimit',
    area: 'wat',
    indoor: true,
    indoorLight: 0.85,
    w: W,
    h: H,
    skyH: 0,
    ground: '#f2ede6',
    camBias: 0.55,
    bake: (g) => roomShell(g, { w: W, h: H, wallH: 130, mural: 'red', sideColor: '#e8e4de', ceiling: '#8a1e2c', carpet: { x: 100, y: 236, w: 40, h: 76 }, seed: 13 }),
    props: [
      { sprite: alt, x: AL.x, y: AL.y },
      { sprite: INT.altarTable(40), x: AL.x, y: 240 },
      { sprite: INT.floorCandle(), x: 70, y: 230 },
      { sprite: INT.floorCandle(), x: 170, y: 230 },
      { sprite: CITY.goldPlaque(), x: 44, y: 252 },
      { sprite: CITY.stuccoCase(), x: 200, y: 250 },
      { sprite: F.donationSprite(), x: 40, y: 296, shadow: [6, 2] },
      { sprite: INT.paintedPillar(220, 'white'), x: 22, y: 316 },
      { sprite: INT.paintedPillar(220, 'white'), x: 218, y: 316 },
    ],
    obstacles: [
      { x: 0, y: 0, w: W, h: 136 },
      { x: 0, y: 0, w: 16, h: H },
      { x: W - 16, y: 0, w: 16, h: H },
      { x: 46, y: 130, w: 148, h: 86 },
      foot(AL.x, 240, 40, 8),
      foot(70, 230, 8, 5),
      foot(170, 230, 8, 5),
      foot(44, 252, 6, 3),
      foot(200, 250, 30, 8),
      foot(40, 296, 12, 6),
      foot(22, 316, 10, 6),
      foot(218, 316, 10, 6),
      { x: 0, y: H - 6, w: W / 2 - 18, h: 6 },
      { x: W / 2 + 18, y: H - 6, w: W / 2 - 18, h: 6 },
    ],
    hotspots: [
      hs('pray', 'กราบหลวงพ่อทองคำ', 'สวดมนต์ขอพรเรื่องเงินทองและการค้า', 'pray', { x: 80, y: 60, w: 80, h: 150 }, { x: AL.x, y: 262 }, 'up', { beacon: true, marker: { x: AL.x, y: 60 } }),
      hs('donation', 'ตู้ทำบุญ', 'ร่วมบุญบำรุงพระอาราม', 'coin', { x: 32, y: 276, w: 16, h: 22 }, { x: 40, y: 306 }),
      hs('job:mop_floor', 'พื้นหินอ่อนชั้นบนสุด', 'ช่วยถูพื้นให้สะอาดเงางาม', 'broom', { x: 150, y: 280, w: 50, h: 30 }, { x: 170, y: 300 }),
      hs('door:wat_traimit', 'ลงจากพระมหามณฑป', 'กลับลงไปลานวัด', 'map', { x: W / 2 - 16, y: H - 20, w: 32, h: 20 }, { x: W / 2, y: H - 6 }, 'down', { near: 10 }),
    ],
    entries: { wat_traimit: { x: W / 2, y: H - 22, face: 'up' } },
    spawn: { x: W / 2, y: H - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: AL.x, y: 110, r: 60, color: '#fff0c8' },
      { x: 70, y: 197, r: 10, color: '#ffb35a' },
      { x: 170, y: 197, r: 10, color: '#ffb35a' },
    ],
    life(s) {
      return [
        new Glints(s, hooks(alt, 'glints', AL), 2.6),
        new Flames(s, [
          { x: 70, y: 197 },
          { x: 170, y: 197 },
        ]),
        chandeliers(s, [
          { x: 50, y: 136 },
          { x: 190, y: 136 },
        ]),
        new Gags(s, gags),
        new TapZones([
          talk(s, { x: AL.x - 28, y: 60, w: 56, h: 90 }, ['หลวงพ่อทองคำ ทองคำบริสุทธิ์หนัก 5.5 ตัน', 'ศิลปะสุโขทัย งามสง่า', 'เคยถูกพอกปูนไว้ จนปูนกะเทาะในปี 2498'], (x, y) => {
            s.particles.sparkles(x, y, 12, '#fff3a6', 12)
            sfx.chime()
          }),
          talk(s, { x: 186, y: 228, w: 30, h: 22 }, ['เปลือกปูนที่เคยห่อหุ้มองค์พระ', 'ซ่อนทองไว้ใต้ปูนหลายร้อยปี!']),
          talk(s, { x: 34, y: 232, w: 20, h: 20 }, ['หลวงพ่อทองคำ (พระพุทธมหาสุวรรณปฏิมากร)', 'หนักราว 5.5 ตัน']),
        ]),
      ]
    },
    ambient(s, dt) {
      motes(s, dt, { x: 50, y: 60, w: 140, h: 160 }, 2)
    },
    wander: [{ x: 70, y: 270, w: 100, h: 30 }],
    pois: [
      { x: 110, y: 270, face: 'up' },
      { x: 136, y: 272, face: 'up' },
    ],
    dogs: [],
    visitors: 2,
  }
}

// ---------------------------------------------------------------------------

export const MAPS: Record<string, () => MapDef> = {
  wat_phra_kaew: watPhraKaewMap,
  'wat_phra_kaew:ubosot': pkUbosotMap,
  wat_pho: watPhoMap,
  'wat_pho:viharn': poViharnMap,
  wat_arun: watArunMap,
  'wat_arun:ubosot': arUbosotMap,
  erawan: erawanMap,
  golden_mount: goldenMountMap,
  'golden_mount:summit': gmSummitMap,
  wat_traimit: watTraimitMap,
  'wat_traimit:hall': tmHallMap,
}
