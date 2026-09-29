// ตลาดน้ำดำเนินสะดวก (Damnoen Saduak Floating Market) – hub market. Two
// canals packed with paddle boats: buy boat noodles, fruit and kanom krok
// straight from the boats moored at the decks, feed the fish at the pier,
// cross the arched bridges, and watch the water monitor swim across while
// the whole market shouts "ตัวเงินตัวทอง!".

import type { MapDef, PlacedProp } from '../../world'
import type { WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { tukTuk } from '../../../art/props'
import { rainTree, salaSprite, ROOF } from '../../../art/places/south'
import { road } from '../common'
import { CloudShadows, SunRays, TapZones, Traffic, type Life } from '../../life'
import { Gags, type Gag } from '../../gags'
import { canalWater, clothesGoods, concrete, eatTable, fruitGoods, noticeBoard, planks, tarpStall, basket, hooksAt, type Goods } from '../../../art/places/hub-kit'
import { canalBridge, deckEdge, dnGate, drawBoat, drawHyacinth, drawMonitor, photoBoard, pierSteps, vanSprite, woodRow, type BoatKind } from '../../../art/places/hub-damnoen'
import { HubArrival, Hawkers, OrangeCats, giverGag, hs, hubChat, look, personGag, tradePairGag } from './hub-common'
import type { AvatarLook } from '../../../art/avatar'

const ID = 'hub_damnoen'
const W = 320
const H = 910
const C1 = { top: 208, bot: 290 }
const C2 = { top: 604, bot: 682 }
const BR1 = { x: 264, y: 300 }
const BR2 = { x: 60, y: 692 }
const GATE = { x: 160, y: 822 }

const hatGoods: Goods = (g, x0, x1, y) => {
  for (let x = x0 + 3; x <= x1 - 3; x += 7) {
    g.rect(x - 3, y - 3, 7, 1, '#e0c080')
    g.rect(x - 2, y - 4, 5, 1, '#e8cc90')
    g.px(x, y - 5, '#c9a06a')
  }
}

function bake(g: Surface, night: boolean) {
  G.treeLine(g, 70, W, G.LEAVES.far, 51)
  G.treeLine(g, 84, W, G.LEAVES.deep, 53)
  g.rect(0, 100, W, 16, night ? '#2e4a3a' : '#5e9a66')
  woodRow(g, 0, W, 172, 7, night)
  planks(g, 0, 172, W, C1.top - 172, 3)
  deckEdge(g, 0, W, C1.top, false)
  canalWater(g, 0, C1.top, W, C1.bot - C1.top, night, 2)
  planks(g, 0, C1.bot, W, 32, 4)
  deckEdge(g, 0, W, C1.bot, true)
  // Land between the canals: packed earth with a paved path.
  concrete(g, 0, 322, W, C2.top - 20 - 322, 5, night ? '#a89a88' : '#d8c8a8', 0)
  g.rect(0, 440, W, 14, night ? '#b0a898' : '#e4d8c0')
  planks(g, 0, C2.top - 20, W, 20, 6)
  deckEdge(g, 0, W, C2.top, false)
  canalWater(g, 0, C2.top, W, C2.bot - C2.top, night, 4)
  planks(g, 0, C2.bot, W, 30, 8)
  deckEdge(g, 0, W, C2.bot, true)
  pierSteps(g, 116, C2.top - 2, 28)
  // Parking and the road.
  concrete(g, 0, 712, W, 110, 9, night ? '#a8a0a0' : '#cfc6bd', 28)
  for (let x = 20; x < W; x += 34) g.rect(x, 738, 1, 22, '#fffaf0')
  g.rect(0, 820, W, 3, '#bdb2ae')
  road(g, 0, 823, W, 87)
  // Photo cut-out board spot (face holes) on the land strip.
  g.rect(118, 546, 40, 2, night ? '#6a6060' : '#b8a888')
}

/** Boats on the canals: moored shop boats bob, others paddle past; a long-tail zooms by. */
class CanalBoats implements Life {
  boats: { x: number; y: number; dir: 1 | -1; kind: BoatKind; v: number; moving: boolean; seed: number; looks?: AvatarLook[]; lines: string[] }[] = []
  private next = 3
  constructor(
    private s: WorldScene,
    moored: { x: number; y: number; dir: 1 | -1; kind: BoatKind; lines: string[] }[],
    private lanes: { y: number; dir: 1 | -1 }[],
  ) {
    for (const m of moored) this.boats.push({ ...m, v: 0, moving: false, seed: Math.floor(rand(0, 99)) })
    for (const L of lanes) for (let i = 0; i < 2; i++) this.spawn(L, rand(0, W))
  }
  private spawn(L: { y: number; dir: 1 | -1 }, x?: number) {
    const kind = pick<BoatKind>(['fruit', 'fruit', 'coconut', 'flower', 'tourist', 'tourist', 'noodle', 'longtail'])
    const tour = kind === 'tourist' || kind === 'longtail'
    this.boats.push({
      x: x ?? (L.dir > 0 ? -40 : W + 40),
      y: L.y,
      dir: L.dir,
      kind,
      v: kind === 'longtail' ? 46 : rand(7, 12),
      moving: true,
      seed: Math.floor(rand(0, 99)),
      looks: tour ? [look({ head: 'head_sunhat' }), look({}), look({ hand: 'hand_phone' }), look({})] : undefined,
      lines: tour ? ['ว้าว ตลาดน้ำจริง ๆ!', 'Amazing!', 'ถ่ายรูปหน่อย 📸', 'เรือโยกเยกจัง'] : ['ผลไม้จ้า ผลไม้!', 'มะม่วงหวาน ๆ จ้า', 'แวะก่อนจ้า~', 'ขอทางหน่อยจ้า'],
    })
  }
  update(dt: number, t: number) {
    this.next -= dt
    if (this.next <= 0) {
      this.next = rand(5, 10)
      if (this.boats.filter((b) => b.moving).length < 9) this.spawn(pick(this.lanes))
    }
    for (const b of this.boats) {
      if (!b.moving) continue
      b.x += b.v * b.dir * dt
      if (b.kind === 'longtail' && Math.random() < dt * 20 && this.s.onScreen(b.x, b.y, 20)) {
        this.s.particles.add({ kind: 'drop', x: b.x - b.dir * 44, y: b.y + 2, vx: -b.dir * rand(10, 30), vy: rand(-20, -8), g: 60, max: 0.5, color: '#d4f1e0' })
      }
      if (Math.random() < dt * 0.5 && this.s.onScreen(b.x, b.y, 0)) this.s.particles.add({ kind: 'dot', x: b.x - b.dir * 26, y: b.y + 3, vx: -b.dir * 4, vy: 0, max: 1, color: '#8cc4a6' })
    }
    this.boats = this.boats.filter((b) => !b.moving || (b.x > -80 && b.x < W + 80))
    void t
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const b of this.boats) {
      if (!this.s.onScreen(b.x, b.y, 40)) continue
      add(b.y, () => drawBoat(this.s.gfx, b.x, b.y, t, b.kind, b.dir, { tourists: b.looks, moving: b.moving, seed: b.seed }))
    }
  }
  tap(x: number, y: number): boolean {
    for (const b of this.boats) {
      if (Math.abs(x - b.x) < 26 && y > b.y - 18 && y < b.y + 4) {
        this.s.say(pick(b.lines), b.x, b.y - 20, 2)
        for (let i = 0; i < 5; i++) this.s.particles.add({ kind: 'drop', x: b.x + rand(-20, 20), y: b.y + 2, vx: rand(-10, 10), vy: rand(-24, -10), g: 80, max: 0.6, color: '#d4f1e0' })
        sfx.splash()
        return true
      }
    }
    return false
  }
}

/** The water monitor (ตัวเงินตัวทอง) swims across a canal; the whole market shouts. */
class WaterMonitor implements Life {
  private m: { x: number; y: number; tx: number; ty: number; ang: number; fade: number; dive: boolean } | null = null
  private next = rand(9, 16)
  private shouts: { at: number; text: string; x: number; y: number }[] = []
  private t = 0
  constructor(
    private s: WorldScene,
    private canals: { top: number; bot: number }[],
    private yellers: { x: number; y: number }[],
  ) {}
  update(dt: number, t: number) {
    this.t = t
    for (const sh of this.shouts) if (sh.at <= t) this.s.say(sh.text, sh.x, sh.y, 2.2)
    this.shouts = this.shouts.filter((sh) => sh.at > t)
    const m = this.m
    if (!m) {
      this.next -= dt
      if (this.next > 0) return
      // Pick a canal that's on screen right now.
      const vis = this.canals.filter((c) => this.s.onScreen(160, (c.top + c.bot) / 2, -20))
      if (!vis.length) {
        this.next = 3
        return
      }
      const c = pick(vis)
      const down = Math.random() < 0.5
      const x = this.s.camX + rand(30, this.s.vw - 30)
      const y0 = down ? c.top + 6 : c.bot - 6
      const y1 = down ? c.bot - 4 : c.top + 4
      const tx = x + rand(-30, 30)
      this.m = { x, y: y0, tx, ty: y1, ang: Math.atan2(y1 - y0, tx - x), fade: 0, dive: false }
      this.shoutAll()
      return
    }
    if (m.dive) {
      m.fade += dt * 1.5
      if (m.fade >= 1) this.finish()
      return
    }
    const dx = m.tx - m.x
    const dy = m.ty - m.y
    const d = Math.hypot(dx, dy)
    if (d < 1.5) {
      // Climbs out onto the bank and slips away.
      m.dive = true
      return
    }
    const sp = 9 * dt
    m.x += (dx / d) * sp
    m.y += (dy / d) * sp
    if (Math.random() < dt * 6) this.s.particles.add({ kind: 'dot', x: m.x - Math.cos(m.ang) * 8, y: m.y - Math.sin(m.ang) * 6, vx: rand(-4, 4), vy: rand(-2, 2), max: 0.9, color: '#b0dcc4' })
  }
  private finish() {
    this.m = null
    this.next = rand(60, 110)
  }
  private shoutAll() {
    const m = this.m!
    const texts = ['ตัวเงินตัวทอง!!', 'ตัวเงินตัวทอง!', 'ตัวเงินตัวทองงง!!', 'นั่น! ตัวเงินตัวทอง!', 'ตัวเงินตัวทองว่ายน้ำ!']
    const near = this.yellers.filter((p) => this.s.onScreen(p.x, p.y, -10)).sort(() => Math.random() - 0.5)
    const pts = [{ x: m.x, y: m.y - 12 }, ...near.slice(0, 3)]
    pts.forEach((p, i) => this.shouts.push({ at: this.t + 0.2 + i * 0.45, text: texts[(i + Math.floor(rand(0, 5))) % texts.length], x: p.x, y: p.y - (i === 0 ? 0 : 30) }))
    sfx.splash()
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const m = this.m
    if (!m) return
    add(m.y - 2, () => {
      const g = this.s.gfx
      // V-shaped wake.
      g.alpha(0.5 * (1 - m.fade))
      for (let i = 4; i < 20; i += 2) {
        const bx = m.x - Math.cos(m.ang) * i
        const by = m.y - Math.sin(m.ang) * i * 0.8
        const px = -Math.sin(m.ang) * (i * 0.4)
        const py = Math.cos(m.ang) * (i * 0.3)
        g.px(Math.round(bx + px), Math.round(by + py), '#d4f1e0')
        g.px(Math.round(bx - px), Math.round(by - py), '#d4f1e0')
      }
      g.alpha(1)
      drawMonitor(g, m.x, m.y, t, m.ang, m.fade)
    })
  }
  tap(x: number, y: number): boolean {
    const m = this.m
    if (!m || m.dive) return false
    if (Math.hypot(x - m.x, y - m.y) > 16) return false
    m.dive = true
    this.s.say(pick(['มันดำน้ำหนีไปแล้ว!', 'บ๊ายบาย ตัวเงินตัวทอง~', 'ขอให้รวย ๆ นะ!']), m.x, m.y - 14, 2.2)
    for (let i = 0; i < 8; i++) this.s.particles.add({ kind: 'drop', x: m.x + rand(-4, 4), y: m.y, vx: rand(-14, 14), vy: rand(-26, -10), g: 80, max: 0.6, color: '#d4f1e0' })
    sfx.splash()
    return true
  }
}

class Hyacinths implements Life {
  private items: { x: number; y: number; v: number; seed: number }[] = []
  constructor(private s: WorldScene) {
    for (let i = 0; i < 7; i++) {
      const c = i % 2 ? C1 : C2
      this.items.push({ x: rand(0, W), y: rand(c.top + 14, c.bot - 10), v: rand(1.5, 3) * (i % 3 ? 1 : -1), seed: i * 7 })
    }
  }
  update(dt: number) {
    for (const h of this.items) {
      h.x += h.v * dt
      if (h.x > W + 10) h.x = -10
      if (h.x < -10) h.x = W + 10
    }
  }
  ground(g: Surface) {
    for (const h of this.items) if (this.s.onScreen(h.x, h.y, 10)) drawHyacinth(g, h.x, h.y, h.seed)
  }
}

function gags(): Gag[] {
  const somjai = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_mohom', bottom: 'bot_sarong', head: 'head_ngob_pomelo' })
  const jaew = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman' })
  const kla = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_tee_boon', bottom: 'bot_denim_shorts' })
  const sugar = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_floral', bottom: 'bot_sin_mudmee', head: 'head_vendorband' })
  const hats = look({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_mohom', bottom: 'bot_khaki' })
  const tour1 = look({ gender: 'f', hair: 'hair_ponytail', hairColor: 3, top: 'top_tank', bottom: 'bot_elephant', head: 'head_sunhat' })
  const tour2 = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_hawaii', bottom: 'bot_cargo' })
  return [
    giverGag(somjai, 36, 306, ['ก๋วยเตี๋ยวเรือชามจิ๋วจ้า!', 'ป้าพายเรือขายมาสามสิบปีแล้วนะ', 'ลูกช่วยป้าหน่อยได้ไหมจ๊ะ']),
    giverGag(jaew, 96, 580, ['ปลาสวายในคลองตัวใหญ่นะหลาน', 'ลุงแจวเรือมาตั้งแต่ตีห้า', 'ช่วยลุงให้อาหารปลาหน่อย']),
    giverGag(kla, 292, 334, ['พี่ ๆ! เห็นตัวเงินตัวทองไหม!', 'หนูนับได้ห้าตัวแล้ววันนี้', 'ตะโกนดัง ๆ ด้วยนะ!']),
    personGag(sugar, 236, 470, ['เคี่ยวน้ำตาลมะพร้าวสด ๆ จ้า', 'หอมไหมลูก ชิมได้', 'ต้องกวนสามชั่วโมงเลยนะ'], {
      view: 'side',
      over: (g, p) => {
        const a = Math.sin(p.t * 4) * 2
        g.line(p.x + 5, p.y - 12, Math.round(p.x + 11 + a), p.y - 6, '#9a6a45')
      },
      react: (s, x, y) => {
        for (let i = 0; i < 5; i++) s.particles.add({ kind: 'smoke', x: x + 14 + rand(-3, 3), y: y - 10, vx: rand(-3, 3), vy: rand(-12, -6), max: 1.2, color: '#fffaf0', size: 2 })
        sfx.pour(0.5)
      },
    }),
    personGag(hats, 88, 432, ['งอบใบลานจ้า กันแดดกันฝน!', 'ใส่แล้วเหมือนแม่ค้าตลาดน้ำเลย', 'ใบละห้าสิบ สองใบแปดสิบ'], { view: 'front', z: 1 }),
    personGag(tour1, 150, 316, ['ขอรูปคู่กับเรือหน่อยค่ะ 📸', 'ตลาดน้ำสวยมากกก', 'ก๋วยเตี๋ยวเรืออร่อยสุด ๆ'], { view: 'back', extras: ['selfie'] }),
    personGag(tour2, 208, 190, ['Floating market!', 'ซื้อมะม่วงจากเรือ ยื่นมาด้วยไม้ยาว ๆ', 'สนุกมากครับ'], { view: 'front', walk: { x0: 140, x1: 240, speed: 8 } }),
    tradePairGag(150, 520, { hair: 'hair_bob', top: 'top_mohom' }, { hair: 'hair_curtain', top: 'top_tee_black' }, ['แลกเข็มกลัดงอบกับโปสการ์ดไหม', 'ดีล! 🤝', 'ตุ๊กตาตัวเงินตัวทองหายากนะ']),
  ]
}

export function damnoenMap(): MapDef {
  const br1 = canalBridge(C1.bot - C1.top + 10)
  const br1n = canalBridge(C1.bot - C1.top + 10, true)
  const br2 = canalBridge(C2.bot - C2.top + 10)
  const br2n = canalBridge(C2.bot - C2.top + 10, true)
  const hatStall = tarpStall({ key: 'dn_hats', w: 50, tarp: '#43905a', tarp2: '#fffaf0', goods: hatGoods, ground: fruitGoods(['#e0c080', '#c9a06a'], 2) })
  const fruitStall = tarpStall({ key: 'dn_fruit', w: 48, tarp: '#e8514a', tarp2: '#fffaf0', goods: fruitGoods(['#ffd23f', '#6a3a5a', '#e8514a', '#f58f35']) })
  const sugarStove = tarpStall({ key: 'dn_sugar', w: 44, tarp: '#3d63b5', goods: (g, x0, x1, y) => {
    g.ellipse((x0 + x1) / 2, y - 2, 12, 3, '#3a3040')
    g.ellipse((x0 + x1) / 2, y - 2.5, 10, 2, '#c88a3a')
  } })
  const board = noticeBoard('dn', '#8a5a3a')
  const gate = dnGate()
  const gateN = dnGate(true)
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [
    [20, 330],
    [300, 330],
    [20, 574],
    [300, 574],
  ]
  const props: PlacedProp[] = [
    { sprite: G.coconutPalm(0), x: 30, y: 112 },
    { sprite: G.coconutPalm(1), x: 150, y: 110 },
    { sprite: G.coconutPalm(0), x: 290, y: 112 },
    { sprite: br1, night: br1n, x: BR1.x, y: BR1.y },
    { sprite: br2, night: br2n, x: BR2.x, y: BR2.y },
    { sprite: hatStall, x: 88, y: 424 },
    { sprite: fruitStall, x: 30, y: 424 },
    { sprite: sugarStove, x: 262, y: 460 },
    { sprite: eatTable('#fffaf0', '#e8514a'), x: 120, y: 360 },
    { sprite: eatTable('#fffaf0', '#5a8de0'), x: 190, y: 364 },
    { sprite: salaSprite({ key: 'dn_sala', w: 52, colH: 18, cols: 'white', roof: ROOF.green }), x: 250, y: 560 },
    { sprite: board, x: 200, y: 548, shadow: [12, 3] },
    { sprite: rainTree(0), x: 40, y: 560, id: 't1' },
    { sprite: G.coconutPalm(1), x: 100, y: 500, id: 't2' },
    { sprite: basket('#6cc36a'), x: 60, y: 436 },
    { sprite: basket('#ffd23f'), x: 114, y: 438 },
    // Entrance.
    { sprite: gate, night: gateN, x: GATE.x, y: GATE.y },
    { sprite: vanSprite('#fffaf0'), x: 40, y: 760 },
    { sprite: vanSprite('#9fd0ff'), x: 90, y: 762 },
    { sprite: vanSprite('#ffe27a'), x: 250, y: 758 },
    { sprite: tukTuk(), x: 290, y: 806 },
    { sprite: G.coconutPalm(1), x: 8, y: 816 },
    { sprite: G.bananaPlant(), x: 214, y: 816 },
    // More stalls on the land strip.
    { sprite: tarpStall({ key: 'dn_orchid', w: 48, tarp: '#c8a0ff', tarp2: '#fffaf0', goods: fruitGoods(['#ff9fc0', '#c8a0ff', '#fffaf0'], 2) }), x: 142, y: 424 },
    { sprite: tarpStall({ key: 'dn_tees', w: 48, tarp: '#5a8de0', tarp2: '#fffaf0', goods: clothesGoods(['#3d63b5', '#e8514a', '#ffd23f', '#43905a'], 3) }), x: 196, y: 424 },
    { sprite: tarpStall({ key: 'dn_coco', w: 46, tarp: '#f58f35', goods: fruitGoods(['#6cc36a', '#86c95f', '#8a5a3a'], 3) }), x: 296, y: 428 },
    { sprite: photoBoard(), x: 138, y: 548 },
    { sprite: eatTable('#fffaf0', '#43905a'), x: 60, y: 362 },
    { sprite: eatTable('#fffaf0', '#e8514a'), x: 246, y: 362 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const tapTrees = [['t1', 40, 560]] as const
  return {
    id: ID,
    place: ID,
    area: 'river',
    w: W,
    h: H,
    skyH: 78,
    ground: '#cfc6bd',
    camBias: 0.58,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 178 },
      { x: 0, y: C1.top, w: BR1.x - 13, h: C1.bot - C1.top },
      { x: BR1.x + 13, y: C1.top, w: W - BR1.x - 13, h: C1.bot - C1.top },
      { x: 0, y: C2.top, w: BR2.x - 13, h: C2.bot - C2.top },
      { x: BR2.x + 13, y: C2.top, w: W - BR2.x - 13, h: C2.bot - C2.top },
      { x: BR1.x - 17, y: C1.top - 6, w: 4, h: C1.bot - C1.top + 14 },
      { x: BR1.x + 13, y: C1.top - 6, w: 4, h: C1.bot - C1.top + 14 },
      { x: BR2.x - 17, y: C2.top - 6, w: 4, h: C2.bot - C2.top + 14 },
      { x: BR2.x + 13, y: C2.top - 6, w: 4, h: C2.bot - C2.top + 14 },
      { x: 64, y: 416, w: 48, h: 10 },
      { x: 7, y: 416, w: 46, h: 10 },
      { x: 241, y: 452, w: 42, h: 10 },
      { x: 105, y: 354, w: 30, h: 7 },
      { x: 175, y: 358, w: 30, h: 7 },
      { x: 216, y: 540, w: 70, h: 22 },
      { x: 186, y: 538, w: 28, h: 11 },
      { x: 35, y: 554, w: 10, h: 7 },
      { x: 96, y: 494, w: 8, h: 6 },
      { x: 54, y: 430, w: 12, h: 7 },
      { x: 108, y: 432, w: 12, h: 7 },
      { x: 118, y: 416, w: 48, h: 10 },
      { x: 172, y: 416, w: 48, h: 10 },
      { x: 273, y: 420, w: 46, h: 10 },
      { x: 120, y: 542, w: 36, h: 7 },
      { x: 45, y: 356, w: 30, h: 7 },
      { x: 231, y: 356, w: 30, h: 7 },
      { x: GATE.x - 47, y: GATE.y - 6, w: 12, h: 7 },
      { x: GATE.x + 35, y: GATE.y - 6, w: 12, h: 7 },
      { x: 18, y: 750, w: 44, h: 11 },
      { x: 68, y: 752, w: 44, h: 11 },
      { x: 228, y: 748, w: 44, h: 11 },
      { x: 276, y: 796, w: 30, h: 11 },
      { x: 4, y: 810, w: 8, h: 6 },
      { x: 210, y: 810, w: 8, h: 6 },
      { x: 0, y: 818, w: GATE.x - 48, h: 92 },
      { x: GATE.x + 48, y: 818, w: W - GATE.x - 48, h: 92 },
      { x: 0, y: 823, w: W, h: 87 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      hs('shop:hub_damnoen_noodle', 'เรือก๋วยเตี๋ยวป้าสมใจ', 'ก๋วยเตี๋ยวเรือชามจิ๋ว · ผัดไทยเรือ', 'curry', { x: 46, y: 262, w: 48, h: 26 }, { x: 70, y: 300 }, { marker: { x: 70, y: 258 } }),
      hs('shop:hub_damnoen_fruit', 'เรือผลไม้ยายเพียร', 'มะม่วง มังคุด มะพร้าวน้ำหอม', 'fruit', { x: 146, y: 262, w: 48, h: 26 }, { x: 170, y: 300 }, { marker: { x: 170, y: 258 } }),
      hs('shop:hub_damnoen_krok', 'เรือขนมครกน้าแดง', 'ขนมครกกะทิสด ร้อน ๆ', 'dessert', { x: 186, y: 604, w: 48, h: 22 }, { x: 210, y: 594 }, { face: 'down', marker: { x: 210, y: 598 } }),
      hs('shop:hub_damnoen_hats', 'ร้านงอบริมคลอง', 'งอบใบลาน · มะพร้าวน้ำหอม', 'shop', { x: 64, y: 384, w: 48, h: 42 }, { x: 88, y: 436 }, { marker: { x: 88, y: 382 } }),
      hs('river_fish', 'ท่าน้ำให้อาหารปลา', 'โปรยขนมปังให้ปลาสวายในคลอง', 'fishfood', { x: 114, y: 590, w: 32, h: 28 }, { x: 130, y: 596 }, { face: 'down', marker: { x: 130, y: 588 } }),
      hs('npc:dn_somjai', 'ป้าสมใจ', 'แม่ค้าเรือก๋วยเตี๋ยว', 'friends', { x: 28, y: 276, w: 16, h: 32 }, { x: 36, y: 318 }, { marker: { x: 36, y: 264 }, near: 14 }),
      hs('npc:dn_jaew', 'ลุงแจว', 'คนแจวเรือแห่งคลองดำเนินฯ', 'friends', { x: 88, y: 550, w: 16, h: 32 }, { x: 96, y: 592 }, { marker: { x: 96, y: 538 }, near: 14 }),
      hs('npc:dn_kla', 'น้องกล้า', 'เด็กริมคลอง นักล่าตัวเงินตัวทอง', 'friends', { x: 284, y: 304, w: 16, h: 32 }, { x: 292, y: 346 }, { marker: { x: 292, y: 292 }, near: 14 }),
      hs(`board:${ID}`, 'บอร์ดข่าวตลาดน้ำ', 'กิจกรรมวันนี้ · เรือเด่น · ใครตามหาอะไร', 'scroll', { x: 184, y: 514, w: 32, h: 34 }, { x: 200, y: 560 }, { marker: { x: 200, y: 512 } }),
      hs('gate', 'ทางออกตลาดน้ำ', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: GATE.x - 28, y: GATE.y - 58, w: 56, h: 60 }, { x: GATE.x, y: GATE.y - 8 }, { face: 'down', marker: { x: GATE.x, y: GATE.y - 64 }, near: 12 }),
    ],
    spawn: { x: GATE.x, y: 796, face: 'up' },
    entries: {},
    pickupSpots: [
      { x: 40, y: 190 },
      { x: 200, y: 196 },
      { x: 110, y: 312 },
      { x: 220, y: 400 },
      { x: 30, y: 480 },
      { x: 280, y: 520 },
      { x: 180, y: 700 },
      { x: 150, y: 740 },
      { x: 220, y: 790 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      ...hooksAt(br1, 'lamps', BR1.x, BR1.y).map((p) => ({ x: p.x, y: p.y, r: 10, color: '#fff3a6' })),
      ...hooksAt(br2, 'lamps', BR2.x, BR2.y).map((p) => ({ x: p.x, y: p.y, r: 10, color: '#fff3a6' })),
      { x: 60, y: 150, r: 26, color: '#ffcf7a' },
      { x: 160, y: 150, r: 26, color: '#ffcf7a' },
      { x: 260, y: 150, r: 26, color: '#ffcf7a' },
      { x: 88, y: 404, r: 18, color: '#ffe7a8' },
      { x: 262, y: 440, r: 18, color: '#ffb35a' },
      { x: GATE.x, y: GATE.y - 50, r: 30, color: '#fff3a6' },
    ],
    remoteChat: hubChat(ID),
    life(s) {
      const boats = new CanalBoats(
        s,
        [
          { x: 70, y: 284, dir: 1, kind: 'noodle', lines: ['ก๋วยเตี๋ยวเรือจ้า!', 'น้ำตกหรือน้ำใส?', 'ชามเล็กจิ๋ว สั่งเยอะ ๆ'] },
          { x: 170, y: 284, dir: -1, kind: 'fruit', lines: ['มังคุดหวาน ๆ จ้า', 'มะม่วงสุกพร้อมกิน', 'ผลไม้สดจากสวน!'] },
          { x: 118, y: 286, dir: 1, kind: 'coconut', lines: ['มะพร้าวน้ำหอมจ้า', 'เผาหอม ๆ เลย'] },
          { x: 56, y: 226, dir: -1, kind: 'flower', lines: ['ดอกไม้ไหว้พระจ้า', 'มาลัยสวย ๆ'] },
          { x: 214, y: 226, dir: 1, kind: 'fruit', lines: ['เงาะโรงเรียนจ้า!', 'ส้มโอหวานอมเปรี้ยว'] },
          { x: 210, y: 616, dir: -1, kind: 'krok', lines: ['ขนมครกจ้า ร้อน ๆ', 'หอมกะทิ!'] },
          { x: 262, y: 618, dir: 1, kind: 'coconut', lines: ['มะพร้าวเย็น ๆ จ้า'] },
          { x: 250, y: 676, dir: -1, kind: 'noodle', lines: ['ผัดไทยเรือจ้า!', 'ห่อใบตองให้'] },
        ],
        [
          { y: 248, dir: 1 },
          { y: 266, dir: -1 },
          { y: 640, dir: -1 },
          { y: 658, dir: 1 },
        ],
      )
      const yellers = [
        { x: 36, y: 306 },
        { x: 96, y: 580 },
        { x: 292, y: 334 },
        { x: 150, y: 316 },
        { x: 236, y: 470 },
        { x: 88, y: 432 },
        { x: 70, y: 280 },
        { x: 170, y: 280 },
        { x: 210, y: 612 },
      ]
      return [
        new HubArrival(s),
        new Hyacinths(s),
        boats,
        new WaterMonitor(s, [C1, C2], yellers),
        new Gags(s, gags()),
        new OrangeCats(s, [
          { x: 178, y: 360, pose: 'loaf' },
          { x: 30, y: 196, pose: 'sleep' },
        ]),
        new Hawkers(s, [
          { x: 70, y: 262, lines: ['ก๋วยเตี๋ยวเรือจ้า~', 'ชามละนิดเดียว!', 'หมูหรือเนื้อจ๊ะ'] },
          { x: 170, y: 262, lines: ['ผลไม้จ้า ผลไม้!', 'มะม่วงหวานเจี๊ยบ', 'ชิมก่อนได้จ้า'] },
          { x: 210, y: 594, lines: ['ขนมครกจ้า~', 'ร้อน ๆ หอม ๆ'] },
          { x: 60, y: 150, lines: ['เชิญชมก่อนจ้า', 'ของที่ระลึกจ้า', 'พัดสาน กระเป๋าผ้า!'] },
          { x: 200, y: 150, lines: ['ช้างไม้แกะมือ', 'เสื้อตลาดน้ำตัวละร้อย!'] },
        ]),
        new CloudShadows(s, 2),
        new SunRays(s),
        new Traffic(s, [
          { y: 848, dir: 1 },
          { y: 882, dir: -1 },
        ]),
        new TapZones([
          ...tapTrees.map(([id, x, y]) => ({
            rect: { x: x - 40, y: y - 70, w: 80, h: 50 },
            fn: () => {
              s.shake(id)
              s.drop(x, y - 44, 50, 6, '#9ed86a', '#5eae55', 'leaf')
              if (Math.random() < 0.6) s.burstBirds(x, y - 50, 2)
              sfx.whoosh()
            },
          })),
          {
            rect: { x: 118, y: 514, w: 40, h: 34 },
            fn: (x, y) => {
              s.particles.sparkles(x, y, 12, '#ffffff', 10)
              s.say(pick(['แชะ! สวยเหมือนแม่ค้าตัวจริง', 'เอาหน้าใส่ช่องแล้วยิ้ม~', 'หนึ่ง สอง สาม... แชะ!']), 138, 510, 2)
              sfx.click()
            },
          },
          {
            rect: { x: 116, y: C2.top, w: 28, h: 30 },
            fn: (x, y) => {
              for (let i = 0; i < 6; i++) s.particles.add({ kind: 'drop', x: x + rand(-6, 6), y: y + 4, vx: rand(-12, 12), vy: rand(-26, -10), g: 80, max: 0.6, color: '#d4f1e0' })
              s.say(pick(['ปลาสวายตัวเบ้อเริ่ม!', 'ปลามาเป็นฝูงเลย', 'จ๋อม!']), x, y - 6, 1.8)
              sfx.plop()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 2) {
        const p = pick([{ x: 75, y: 270 }, { x: 255, y: 662 }])
        if (s.onScreen(p.x, p.y, 10)) s.particles.add({ kind: 'smoke', x: p.x + rand(-2, 2), y: p.y, vx: rand(-3, 3), vy: rand(-10, -6), max: 1.2, color: '#fffaf0', size: 2 })
      }
      if (Math.random() < dt * 1.5) s.particles.add({ kind: 'smoke', x: 262 + rand(-6, 6), y: 440, vx: rand(-3, 3), vy: rand(-10, -5), max: 1.4, color: '#f6ecd8', size: 2 })
    },
    wander: [
      { x: 10, y: 178, w: 300, h: 24 },
      { x: 10, y: 296, w: 300, h: 22 },
      { x: 10, y: 330, w: 300, h: 60 },
      { x: 100, y: 470, w: 100, h: 70 },
      { x: 10, y: 588, w: 300, h: 12 },
      { x: 10, y: 690, w: 300, h: 18 },
      { x: 110, y: 720, w: 100, h: 70 },
    ],
    pois: [
      { x: 70, y: 300, face: 'up' },
      { x: 170, y: 300, face: 'up' },
      { x: 118, y: 300, face: 'up' },
      { x: 56, y: 204, face: 'down' },
      { x: 214, y: 204, face: 'down' },
      { x: 210, y: 594, face: 'down' },
      { x: 262, y: 594, face: 'down' },
      { x: 88, y: 438, face: 'up' },
      { x: 30, y: 438, face: 'up' },
      { x: 262, y: 472, face: 'up' },
      { x: 130, y: 596, face: 'down' },
      { x: 60, y: 186, face: 'up' },
      { x: 180, y: 186, face: 'up' },
    ],
    cats: [],
    vendors: [
      { x: 30, y: 414 },
      { x: 20, y: 162 },
      { x: 140, y: 162 },
      { x: 250, y: 162 },
    ],
    dogs: [],
    visitors: 12,
  }
}
