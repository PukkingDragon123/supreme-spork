// หนีภัยน้ำท่วม – game rules. A flooded village scrolls vertically under a
// rescue boat: steer with a drag joystick, idle next to a roof (or a floating
// survivor) until the ring fills to take them aboard, and unload at the วัด
// on the hill at the top. Water rises all round long and floods the houses
// one by one; flooded survivors drift away on floaties until the helicopter
// team picks them up. Pure logic (no canvas) so it can be unit tested; the
// scene turns the emitted events into sound, particles and speech bubbles.

import { Rng } from '../../engine/rng'

export type SurvivorKind = 'granny' | 'kid' | 'man' | 'woman' | 'uncle' | 'auntie' | 'cat' | 'vipcat' | 'dog' | 'chicken' | 'buffalo'

export interface KindInfo {
  name: string
  animal: boolean
  seats: number
  points: number
  /** Seconds the boat has to idle next to them. */
  hold: number
  /** Lives counted for the rescue total (the uncle carries his rooster). */
  lives: number
  /** Said when they notice the boat. */
  call: string[]
  /** Said when they climb aboard. */
  board: string[]
}

export const KINDS: Record<SurvivorKind, KindInfo> = {
  granny: { name: 'ยายมา', animal: false, seats: 1, points: 16, hold: 0.85, lives: 1, call: ['หลานจ๋า ยายอยู่นี่!', 'ยายขอเอาวิทยุไปด้วยนะ'], board: ['ค่อย ๆ นะหลาน เข่ายายไม่ดี', 'วิทยุยายยังเปิดเพลงได้อยู่!'] },
  kid: { name: 'เด็กน้อย', animal: false, seats: 1, points: 12, hold: 0.4, lives: 1, call: ['พี่กู้ภัยมาแล้ว!', 'ทางนี้ครับ!'], board: ['เย่! ได้นั่งเรือ!', 'ขอบคุณครับพี่!'] },
  man: { name: 'ลุงชม', animal: false, seats: 1, points: 10, hold: 0.5, lives: 1, call: ['ช่วยด้วยครับ!', 'ทางนี้ ๆ!'], board: ['ขอบคุณมากครับ', 'รอดแล้ว!'] },
  woman: { name: 'พี่นิด', animal: false, seats: 1, points: 10, hold: 0.5, lives: 1, call: ['ทางนี้ค่ะ!', 'ช่วยด้วยค่า!'], board: ['ขอบคุณค่ะน้อง', 'โล่งอกไปที'] },
  uncle: { name: 'ลุงชัยกับไก่ชน', animal: false, seats: 1, points: 22, hold: 0.6, lives: 2, call: ['ไก่ชนแชมป์ตำบลต้องรอดนะ!', 'เอาไอ้แดงไปด้วย!'], board: ['เอ้กอี๊เอ้กเอ้ก!', 'ไอ้แดงบอกขอบใจ!'] },
  auntie: { name: 'ป้าแจ๋ว', animal: false, seats: 1, points: 12, hold: 0.6, lives: 1, call: ['ป้าไม่ไปถ้าไม่มีน้องตุ๊กตา!', 'ร้านชำป้าจมแล้ว!'], board: ['น้องตุ๊กตาปลอดภัยแล้ว', 'ขอบใจจ้ะหนู'] },
  cat: { name: 'เหมียว', animal: true, seats: 1, points: 8, hold: 0.45, lives: 1, call: ['เมี้ยว~', 'แง้ว!'], board: ['เมี้ยว (ขอบใจ)', 'ครืดดด'] },
  vipcat: { name: 'แมวท้องแก่', animal: true, seats: 1, points: 40, hold: 1.1, lives: 1, call: ['เมี้ยว… (ท้องแก่แล้ว)', 'VIP! อุ้มเบา ๆ'], board: ['VIP ปลอดภัย!', 'แมวท้องขึ้นเรือแล้ว!'] },
  dog: { name: 'น้องหมา', animal: true, seats: 1, points: 8, hold: 0.4, lives: 1, call: ['โฮ่ง!', 'บ๊อก ๆ!'], board: ['โฮ่ง ๆ (หางกระดิก)', 'แฮ่ก ๆ'] },
  chicken: { name: 'ไก่บ้าน', animal: true, seats: 1, points: 6, hold: 0.3, lives: 1, call: ['กุ๊ก ๆ!', 'กะต๊าก!'], board: ['กุ๊ก ๆ ๆ', 'กะต๊ากกก'] },
  buffalo: { name: 'เจ้าทุย', animal: true, seats: 2, points: 26, hold: 1.2, lives: 1, call: ['มอ~', 'มออออ!'], board: ['มอ~ (นั่งสองที่นะ)', 'เรือเอียงนิดนึง!'] },
}

export type SurvivorState = 'wait' | 'adrift' | 'aboard' | 'saved' | 'gone'

export interface Survivor {
  id: number
  kind: SurvivorKind
  family?: string
  state: SurvivorState
  x: number
  y: number
  vx: number
  vy: number
  house?: number
  /** Seconds adrift (they get picked up by the helicopter team eventually). */
  t: number
  life: number
  /** Swimming by itself (dog) instead of riding a floaty. */
  swim: boolean
  /** Floaty they cling to once their roof floods. */
  floaty: 'ring' | 'basin' | 'door' | 'basket'
  called: boolean
  /** Where they stand once saved (on the temple hill). */
  hx: number
  hy: number
}

export type HouseStyle = 'stilt' | 'shop' | 'tuktuk' | 'shed' | 'mound' | 'hut'

export interface House {
  id: number
  style: HouseStyle
  x: number
  /** Ground line (base of the stilts). */
  y: number
  w: number
  /** Level (0..1) at which the water reaches the roof. */
  floodAt: number
  danger: boolean
  flooded: boolean
  /** Where the boat docks to pick people up. */
  dx: number
  dy: number
  tone: number
}

export interface Lane {
  y: number
  h: number
  dir: 1 | -1
  speed: number
}

export interface Obstacle {
  kind: 'pole' | 'palm' | 'banana' | 'sign'
  x: number
  y: number
  r: number
}

export type DebrisKind = 'log' | 'tire' | 'fridge' | 'sofa' | 'barrel'

export interface Debris {
  id: number
  kind: DebrisKind
  x: number
  y: number
  vx: number
  vy: number
  r: number
  spin: number
}

export type FloatyKind = 'ring' | 'bowl' | 'duck' | 'chair'

export interface Floaty {
  id: number
  kind: FloatyKind
  x: number
  y: number
  vx: number
  vy: number
  ph: number
}

export type PowerKind = 'rice' | 'dog' | 'ring'

export interface PowerUp {
  id: number
  kind: PowerKind
  x: number
  y: number
  t: number
  life: number
}

export interface Lizard {
  x: number
  y: number
  dir: 1 | -1
  t: number
  dove: boolean
}

export interface Boat {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  stun: number
  inv: number
  boost: number
  seats: number
  aboard: number[]
}

export type SimEvent =
  | { type: 'pickup'; id: number; kind: SurvivorKind; x: number; y: number; line: string }
  | { type: 'call'; id: number; kind: SurvivorKind; x: number; y: number; line: string }
  | { type: 'full'; x: number; y: number }
  | { type: 'saved'; id: number; kind: SurvivorKind; x: number; y: number; points: number; trip: number }
  | { type: 'family'; name: string; x: number; y: number; bonus: number }
  | { type: 'trip'; n: number; x: number; y: number; bonus: number }
  | { type: 'danger'; house: number; x: number; y: number }
  | { type: 'flood'; house: number; x: number; y: number }
  | { type: 'heli'; id: number; kind: SurvivorKind; x: number; y: number; swam: boolean }
  | { type: 'crash'; x: number; y: number }
  | { type: 'bump'; x: number; y: number }
  | { type: 'squeak'; x: number; y: number }
  | { type: 'power'; kind: PowerKind; x: number; y: number }
  | { type: 'lightning' }
  | { type: 'lizard'; x: number; y: number }
  | { type: 'spawn'; kind: SurvivorKind | 'lizard'; x: number; y: number }
  | { type: 'allsaved'; bonus: number }
  | { type: 'hurry' }

export interface FloodSummary {
  score: number
  rescued: number
  people: number
  animals: number
  vip: number
  families: number
  bestTrip: number
  crashes: number
  powerups: number
  missed: number
  total: number
  timeBonus: number
  stars: 0 | 1 | 2 | 3
}

/** Rescues needed for 1, 2 and 3 stars. */
export const STAR_RESCUES: readonly [number, number, number] = [6, 12, 20]
export const ROUND_SECONDS = 90
export const WORLD_H = 660
export const SHORE_Y = 100
export const BASE_SEATS = 4
export const MAX_SEATS = 6
const SPEED = 64
const BOOST = 1.65
const PICK_R = 15
const PICK_SPEED = 42
const ADRIFT_LIFE = 15
const FAMILY_BONUS = 15

export interface SimOptions {
  w?: number
  seed?: string | number
  duration?: number
}

export interface Steer {
  x: number
  y: number
}

interface Spawn {
  at: number
  run: () => void
}

export class FloodSim {
  readonly w: number
  readonly h = WORLD_H
  readonly shoreY = SHORE_Y
  duration: number
  /** The water rises on the original clock (extra time from rice boxes is overtime). */
  readonly waterTime: number
  elapsed = 0
  level = 0
  done = false
  started = false
  rng: Rng
  boat: Boat
  survivors: Survivor[] = []
  houses: House[] = []
  lanes: Lane[] = []
  obstacles: Obstacle[] = []
  debris: Debris[] = []
  floaties: Floaty[] = []
  powers: PowerUp[] = []
  lizards: Lizard[] = []
  events: SimEvent[] = []
  score = 0
  crashes = 0
  powerups = 0
  families = 0
  bestTrip = 0
  timeBonus = 0
  /** Pickup ring: survivor id and 0..1 fill. */
  pick: { id: number; p: number } | null = null
  lightningIn = 8
  private unloadT = 0
  private trip = 0
  private fullCool = 0
  private seq = 1
  private spawns: Spawn[] = []
  private hurried = false
  private familySize: Record<string, number> = {}

  constructor(o: SimOptions = {}) {
    this.w = Math.max(150, Math.round(o.w ?? 195))
    this.duration = o.duration ?? ROUND_SECONDS
    this.waterTime = this.duration
    this.rng = new Rng(o.seed ?? Date.now())
    this.boat = { x: this.w / 2, y: SHORE_Y + 26, vx: 0, vy: 0, angle: Math.PI / 2, stun: 0, inv: 0, boost: 0, seats: BASE_SEATS, aboard: [] }
    this.layout()
  }

  // -------------------------------------------------------------------------
  // Village layout

  private layout() {
    const W = this.w
    const r = this.rng
    const jx = (f: number) => Math.round(f * W + r.range(-5, 5))
    const jf = (f: number) => Math.max(0.22, Math.min(0.97, f + r.range(-0.04, 0.04)))
    this.lanes = [
      { y: 214, h: 22, dir: r.chance(0.5) ? 1 : -1, speed: 20 },
      { y: 372, h: 24, dir: 1, speed: 25 },
      { y: 528, h: 22, dir: -1, speed: 27 },
    ]
    this.lanes[1].dir = (-this.lanes[0].dir) as 1 | -1
    this.lanes[2].dir = this.lanes[0].dir
    // Rows of houses between the currents; each row may be mirrored.
    type Spot = { style: HouseStyle; f: number; floodAt: number; who: SurvivorKind[]; family?: string; w?: number }
    const rows: { y: number; spots: Spot[] }[] = [
      {
        y: 176,
        spots: [
          { style: 'stilt', f: 0.26, floodAt: 0.9, who: ['uncle'] },
          { style: 'hut', f: 0.74, floodAt: 0.74, who: ['kid', 'cat'], family: 'น้องต้นกับเหมียว' },
        ],
      },
      {
        y: 330,
        spots: [
          { style: 'shop', f: 0.2, floodAt: 0.68, who: ['auntie', 'man'], family: 'ร้านชำป้าแจ๋ว', w: 34 },
          { style: 'mound', f: 0.54, floodAt: 0.5, who: ['buffalo'] },
          { style: 'stilt', f: 0.84, floodAt: 0.6, who: ['woman', 'dog'], family: 'พี่นิดกับเจ้าด่าง' },
        ],
      },
      {
        y: 482,
        spots: [
          { style: 'tuktuk', f: 0.18, floodAt: 0.34, who: ['vipcat'] },
          { style: 'stilt', f: 0.52, floodAt: 0.58, who: ['man', 'woman', 'kid'], family: 'บ้านลุงชม' },
          { style: 'shed', f: 0.85, floodAt: 0.44, who: ['chicken', 'chicken'] },
        ],
      },
      {
        y: 632,
        spots: [
          { style: 'stilt', f: 0.28, floodAt: 0.52, who: ['granny', 'kid', 'kid'], family: 'บ้านยายมา' },
          { style: 'hut', f: 0.76, floodAt: 0.8, who: ['cat', 'cat'] },
        ],
      },
    ]
    for (const row of rows) {
      const mirror = r.chance(0.5)
      for (const sp of row.spots) {
        const f = mirror ? 1 - sp.f : sp.f
        const w = sp.w ?? (sp.style === 'tuktuk' ? 22 : sp.style === 'mound' ? 30 : sp.style === 'shed' ? 26 : 28)
        const x = Math.max(w / 2 + 3, Math.min(W - w / 2 - 3, jx(f)))
        const id = this.houses.length
        const house: House = { id, style: sp.style, x, y: row.y, w, floodAt: jf(sp.floodAt), danger: false, flooded: false, dx: x, dy: row.y + 9, tone: r.int(0, 3) }
        this.houses.push(house)
        if (sp.family) this.familySize[sp.family] = sp.who.length
        sp.who.forEach((k, i) => {
          const n = sp.who.length
          const sx = x + (n === 1 ? 0 : (i - (n - 1) / 2) * Math.min(9, (w - 8) / Math.max(1, n - 1)))
          this.addSurvivor(k, sx, row.y, { house: id, family: sp.family })
        })
      }
    }
    // Poles and tree tops sticking out of the water.
    const obs: Obstacle[] = [
      { kind: 'palm', x: jx(0.5), y: 250, r: 6 },
      { kind: 'pole', x: jx(0.08), y: 268, r: 3 },
      { kind: 'pole', x: jx(0.92), y: 420, r: 3 },
      { kind: 'banana', x: jx(0.36), y: 418, r: 6 },
      { kind: 'palm', x: jx(0.7), y: 580, r: 6 },
      { kind: 'pole', x: jx(0.9), y: 140, r: 3 },
      { kind: 'banana', x: jx(0.08), y: 575, r: 5 },
    ]
    this.obstacles = obs.filter((o) => !this.houses.some((h) => Math.abs(h.x - o.x) < h.w / 2 + 8 && Math.abs(h.y - o.y) < 22))
    // Debris riding the currents.
    const kinds: DebrisKind[] = ['log', 'tire', 'fridge', 'sofa', 'barrel', 'log']
    this.lanes.forEach((ln, i) => {
      for (let k = 0; k < 2; k++) {
        const kind = kinds[(i * 2 + k) % kinds.length]
        this.debris.push({ id: this.seq++, kind, x: r.range(0, W) + k * W * 0.5, y: ln.y + r.range(-ln.h / 3, ln.h / 3), vx: ln.dir * ln.speed, vy: 0, r: kind === 'fridge' || kind === 'sofa' ? 7 : kind === 'log' ? 7 : 5, spin: r.range(0, 6) })
      }
    })
    // Bumpable bits and bobs.
    const fk: FloatyKind[] = ['ring', 'bowl', 'duck', 'chair', 'duck', 'ring', 'bowl']
    fk.forEach((kind, i) => this.floaties.push({ id: this.seq++, kind, x: r.range(12, W - 12), y: 130 + i * 72 + r.range(-10, 10), vx: r.range(-4, 4), vy: r.range(-2, 2), ph: r.range(0, 6) }))
    // Timeline of arrivals.
    const at = (t: number, run: () => void) => this.spawns.push({ at: t + r.range(-1.5, 1.5), run })
    at(9, () => this.swimmer('dog'))
    at(36, () => this.swimmer('dog'))
    at(61, () => this.swimmer('dog'))
    at(27, () => this.basket())
    at(21, () => this.lizard())
    at(57, () => this.lizard())
    at(15, () => this.power('rice'))
    at(29, () => this.power('dog'))
    at(41, () => this.power('ring'))
    at(51, () => this.power('rice'))
    at(69, () => this.power('dog'))
    this.spawns.sort((a, b) => a.at - b.at)
  }

  private addSurvivor(kind: SurvivorKind, x: number, y: number, o: Partial<Survivor> = {}): Survivor {
    const s: Survivor = {
      id: this.seq++,
      kind,
      state: 'wait',
      x,
      y,
      vx: 0,
      vy: 0,
      t: 0,
      life: ADRIFT_LIFE,
      swim: false,
      floaty: this.rng.pick(['ring', 'basin', 'door'] as const),
      called: false,
      hx: 0,
      hy: 0,
      ...o,
    }
    this.survivors.push(s)
    return s
  }

  private waterSpot(avoidLanes = true): [number, number] {
    for (let k = 0; k < 20; k++) {
      const x = this.rng.range(16, this.w - 16)
      const y = this.rng.range(this.shoreY + 30, this.h - 16)
      if (avoidLanes && this.laneAt(y)) continue
      if (this.houses.some((h) => Math.abs(h.x - x) < h.w / 2 + 6 && y > h.y - 30 && y < h.y + 12)) continue
      return [x, y]
    }
    return [this.w / 2, this.shoreY + 60]
  }

  private swimmer(kind: SurvivorKind) {
    const left = this.rng.chance(0.5)
    const [, y] = this.waterSpot()
    const x = left ? 6 : this.w - 6
    const s = this.addSurvivor(kind, x, y, { state: 'adrift', swim: true, vx: left ? 9 : -9, vy: this.rng.range(-2, 2), life: 20 })
    this.emit({ type: 'spawn', kind, x: s.x, y: s.y })
  }

  private basket() {
    const [x, y] = this.waterSpot()
    for (let i = 0; i < 2; i++) this.addSurvivor('chicken', x + (i ? 6 : -6), y, { state: 'adrift', floaty: 'basket', vx: this.rng.range(-3, 3), vy: this.rng.range(-2, 2), life: 18 })
    this.emit({ type: 'spawn', kind: 'chicken', x, y })
  }

  private lizard() {
    const dir = this.rng.chance(0.5) ? 1 : -1
    const [, y] = this.waterSpot()
    this.lizards.push({ x: dir > 0 ? -12 : this.w + 12, y, dir, t: 0, dove: false })
    this.emit({ type: 'spawn', kind: 'lizard', x: dir > 0 ? 8 : this.w - 8, y })
  }

  private power(kind: PowerKind) {
    const [x, y] = this.waterSpot(false)
    this.powers.push({ id: this.seq++, kind, x, y, t: 0, life: 14 })
  }

  private emit(e: SimEvent) {
    this.events.push(e)
  }

  /** Drain events emitted since the last call. */
  takeEvents(): SimEvent[] {
    const e = this.events
    this.events = []
    return e
  }

  // -------------------------------------------------------------------------
  // Queries

  laneAt(y: number): Lane | undefined {
    return this.lanes.find((l) => Math.abs(y - l.y) <= l.h / 2)
  }

  get timeLeft() {
    return Math.max(0, this.duration - this.elapsed)
  }

  seatsUsed(): number {
    return this.boat.aboard.reduce((n, id) => n + KINDS[this.byId(id)!.kind].seats, 0)
  }

  byId(id: number): Survivor | undefined {
    return this.survivors.find((s) => s.id === id)
  }

  /** How much of a house (0..1 up to its roof) is under water. */
  cover(h: House): number {
    return Math.min(1, this.level / h.floodAt)
  }

  rescued(): number {
    return this.survivors.filter((s) => s.state === 'saved').reduce((n, s) => n + KINDS[s.kind].lives, 0)
  }

  totalLives(): number {
    return this.survivors.reduce((n, s) => n + KINDS[s.kind].lives, 0)
  }

  /** Pickup point for a survivor. */
  dockOf(s: Survivor): [number, number] {
    if (s.state === 'wait' && s.house != null) {
      const h = this.houses[s.house]
      return [s.x, h.dy]
    }
    return [s.x, s.y]
  }

  stars(): 0 | 1 | 2 | 3 {
    const n = this.rescued()
    return n >= STAR_RESCUES[2] ? 3 : n >= STAR_RESCUES[1] ? 2 : n >= STAR_RESCUES[0] ? 1 : 0
  }

  summary(): FloodSummary {
    const saved = this.survivors.filter((s) => s.state === 'saved')
    const lives = (list: Survivor[]) => list.reduce((n, s) => n + KINDS[s.kind].lives, 0)
    const people = saved.filter((s) => !KINDS[s.kind].animal)
    return {
      score: Math.round(this.score),
      rescued: lives(saved),
      people: people.length,
      // The uncle's rooster counts as an animal saved.
      animals: saved.filter((s) => KINDS[s.kind].animal).length + saved.filter((s) => s.kind === 'uncle').length,
      vip: saved.filter((s) => s.kind === 'vipcat').length,
      families: this.families,
      bestTrip: this.bestTrip,
      crashes: this.crashes,
      powerups: this.powerups,
      missed: lives(this.survivors.filter((s) => s.state === 'gone' || s.state === 'wait' || s.state === 'adrift')),
      total: this.totalLives(),
      timeBonus: this.timeBonus,
      stars: this.stars(),
    }
  }

  // -------------------------------------------------------------------------
  // Tick

  update(dt: number, steer: Steer | null) {
    if (this.done) return
    dt = Math.min(0.05, Math.max(0, dt))
    if (this.started) {
      this.elapsed += dt
      this.level = Math.min(1, Math.pow(this.elapsed / (this.waterTime * 0.96), 1.08))
    }
    for (const sp of this.spawns) if (sp.at <= this.elapsed) sp.run()
    this.spawns = this.spawns.filter((sp) => sp.at > this.elapsed)
    this.fullCool -= dt
    if (this.started && !this.hurried && this.timeLeft <= 15) {
      this.hurried = true
      this.emit({ type: 'hurry' })
    }
    this.lightningIn -= dt
    if (this.lightningIn <= 0) {
      this.lightningIn = this.rng.range(9, 15)
      this.emit({ type: 'lightning' })
    }
    this.moveBoat(dt, this.started ? steer : null)
    this.floodHouses()
    this.moveWorld(dt)
    if (this.started) {
      this.pickup(dt, steer)
      this.unload(dt)
      this.collect()
    }
    if (this.started && this.elapsed >= this.duration) this.finish()
    else if (this.started && this.allResolved()) {
      this.timeBonus = Math.round(this.timeLeft * 2)
      this.score += this.timeBonus
      this.emit({ type: 'allsaved', bonus: this.timeBonus })
      this.finish()
    }
  }

  private allResolved(): boolean {
    return this.spawns.every((sp) => sp.at > this.duration) && this.boat.aboard.length === 0 && this.survivors.every((s) => s.state === 'saved' || s.state === 'gone')
  }

  /** End the round: whoever is still aboard is brought ashore; the helicopter team gets the rest. */
  finish() {
    if (this.done) return
    // Whoever is still aboard rides ashore after the whistle (no trip bonus).
    const late = [...this.boat.aboard]
    this.boat.aboard = []
    for (const id of late) this.save(id, 0)
    if (this.trip > 0) this.endTrip()
    this.bestTrip = Math.max(this.bestTrip, late.length)
    for (const s of this.survivors) if (s.state === 'wait' || s.state === 'adrift') s.state = 'gone'
    this.done = true
  }

  private moveBoat(dt: number, steer: Steer | null) {
    const b = this.boat
    b.stun = Math.max(0, b.stun - dt)
    b.inv = Math.max(0, b.inv - dt)
    b.boost = Math.max(0, b.boost - dt)
    const max = SPEED * (b.boost > 0 ? BOOST : 1) * (b.stun > 0 ? 0.25 : 1)
    let tx = 0
    let ty = 0
    if (steer) {
      const m = Math.min(1, Math.hypot(steer.x, steer.y))
      const a = Math.atan2(steer.y, steer.x)
      tx = Math.cos(a) * m * max
      ty = Math.sin(a) * m * max
    }
    const k = Math.min(1, dt * (steer ? 3.4 : 1.7))
    b.vx += (tx - b.vx) * k
    b.vy += (ty - b.vy) * k
    // Docking assist: let go near someone and the boat settles quickly.
    if (!steer && this.pick) {
      const f = Math.exp(-dt * 5)
      b.vx *= f
      b.vy *= f
    }
    const ln = this.laneAt(b.y)
    const drift = ln ? ln.dir * ln.speed * 0.85 : 0
    b.x += (b.vx + drift) * dt
    b.y += b.vy * dt
    const sp = Math.hypot(b.vx, b.vy)
    if (sp > 6) {
      const want = Math.atan2(b.vy, b.vx)
      let d = want - b.angle
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      b.angle += d * Math.min(1, dt * 8)
    }
    // Bounds: the hill at the top, the village edges elsewhere.
    b.x = Math.max(8, Math.min(this.w - 8, b.x))
    if (b.y < this.shoreY + 8) {
      b.y = this.shoreY + 8
      b.vy = Math.max(0, b.vy)
    }
    if (b.y > this.h - 8) {
      b.y = this.h - 8
      b.vy = Math.min(0, b.vy)
    }
    // Poles and tree tops.
    for (const o of this.obstacles) this.pushOut(o.x, o.y, o.r + 5, 0.35)
    // Tuk-tuks and mounds are solid; boats slip under the stilt houses (slowly).
    for (const h of this.houses) {
      const x0 = h.x - h.w / 2 - 2
      const x1 = h.x + h.w / 2 + 2
      const y0 = h.y - 7
      const y1 = h.y + 3
      if (b.x <= x0 || b.x >= x1 || b.y <= y0 || b.y >= y1) continue
      if (h.style === 'tuktuk' || h.style === 'mound') {
        this.pushOut(h.x, h.y - 2, h.w / 2 + 4, 0.3)
      } else {
        const f = Math.exp(-dt * 2.5)
        b.vx *= f
        b.vy *= f
      }
    }
  }

  private pushOut(x: number, y: number, r: number, bounce: number): boolean {
    const b = this.boat
    const dx = b.x - x
    const dy = b.y - y
    const d = Math.hypot(dx, dy)
    if (d >= r || d === 0) return false
    const nx = dx / d
    const ny = dy / d
    b.x = x + nx * r
    b.y = y + ny * r
    const vn = b.vx * nx + b.vy * ny
    if (vn < 0) {
      b.vx -= (1 + bounce) * vn * nx
      b.vy -= (1 + bounce) * vn * ny
      if (-vn > 28) this.emit({ type: 'bump', x: b.x, y: b.y })
    }
    return true
  }

  private floodHouses() {
    for (const h of this.houses) {
      if (!h.danger && this.level >= h.floodAt - 0.1 && this.survivors.some((s) => s.house === h.id && s.state === 'wait')) {
        h.danger = true
        this.emit({ type: 'danger', house: h.id, x: h.x, y: h.y - 30 })
      }
      if (!h.flooded && this.level >= h.floodAt) {
        h.flooded = true
        const left = this.survivors.filter((s) => s.house === h.id && s.state === 'wait')
        if (left.length) this.emit({ type: 'flood', house: h.id, x: h.x, y: h.y })
        left.forEach((s, i) => {
          s.state = 'adrift'
          s.x = h.x + (i - (left.length - 1) / 2) * 10
          s.y = h.dy + 4 + (i % 2) * 5
          const ln = this.laneAt(s.y)
          s.vx = ln ? ln.dir * 6 : this.rng.range(-5, 5)
          s.vy = this.rng.range(1, 5)
          s.t = 0
          s.life = ADRIFT_LIFE
        })
      }
    }
  }

  private moveWorld(dt: number) {
    const W = this.w
    for (const s of this.survivors) {
      if (s.state !== 'adrift') continue
      s.t += dt
      const ln = this.laneAt(s.y)
      const cx = ln ? ln.dir * ln.speed * 0.6 : 0
      s.x += (s.vx + cx) * dt
      s.y += s.vy * dt
      s.vy *= Math.exp(-dt * 0.4)
      if (s.x < 8) (s.x = 8), (s.vx = Math.abs(s.vx))
      if (s.x > W - 8) (s.x = W - 8), (s.vx = -Math.abs(s.vx))
      s.y = Math.max(this.shoreY + 22, Math.min(this.h - 10, s.y))
      if (s.t >= s.life) {
        s.state = 'gone'
        this.emit({ type: 'heli', id: s.id, kind: s.kind, x: s.x, y: s.y, swam: s.swim })
      }
    }
    for (const d of this.debris) {
      const ln = this.laneAt(d.y)
      d.vx += ((ln ? ln.dir * ln.speed : 0) - d.vx) * Math.min(1, dt * 0.8)
      d.x += d.vx * dt
      d.y += d.vy * dt
      d.vy *= Math.exp(-dt * 1.5)
      d.spin += dt * (d.vx > 0 ? 1 : -1)
      if (d.x > W + 20) d.x = -20
      if (d.x < -20) d.x = W + 20
      if (this.started && this.boat.inv <= 0) {
        const b = this.boat
        const dx = b.x - d.x
        const dy = b.y - d.y
        const dist = Math.hypot(dx, dy)
        if (dist < d.r + 6 && dist > 0) {
          b.stun = 0.7
          b.inv = 1.2
          b.vx = (dx / dist) * 70
          b.vy = (dy / dist) * 70
          d.vy -= (dy / dist) * 20
          this.crashes++
          if (this.pick) this.pick.p = 0
          this.emit({ type: 'crash', x: (b.x + d.x) / 2, y: (b.y + d.y) / 2 })
        }
      }
    }
    for (const f of this.floaties) {
      const ln = this.laneAt(f.y)
      f.x += (f.vx + (ln ? ln.dir * ln.speed * 0.5 : 0)) * dt
      f.y += f.vy * dt
      f.vx *= Math.exp(-dt * 0.6)
      f.vy *= Math.exp(-dt * 0.6)
      if (f.x > W + 10) f.x = -10
      if (f.x < -10) f.x = W + 10
      f.y = Math.max(this.shoreY + 16, Math.min(this.h - 8, f.y))
      const b = this.boat
      const dx = f.x - b.x
      const dy = f.y - b.y
      const d = Math.hypot(dx, dy)
      if (d < 9 && d > 0) {
        const sp = Math.hypot(b.vx, b.vy)
        f.vx += (dx / d) * (20 + sp * 0.6)
        f.vy += (dy / d) * (20 + sp * 0.6)
        if (f.kind === 'duck' && sp > 15) this.emit({ type: 'squeak', x: f.x, y: f.y })
      }
    }
    for (const lz of this.lizards) {
      lz.t += dt
      lz.x += lz.dir * 16 * dt
      lz.y += Math.sin(lz.t * 2) * 4 * dt
      if (!lz.dove && Math.hypot(lz.x - this.boat.x, lz.y - this.boat.y) < 12) {
        lz.dove = true
        this.score += 5
        this.emit({ type: 'lizard', x: lz.x, y: lz.y })
      }
    }
    this.lizards = this.lizards.filter((lz) => lz.x > -20 && lz.x < W + 20 && !lz.dove)
    for (const p of this.powers) p.t += dt
    this.powers = this.powers.filter((p) => p.t < p.life)
  }

  private pickup(dt: number, steer: Steer | null) {
    const b = this.boat
    if (b.stun > 0) {
      this.pick = null
      return
    }
    // Survivors notice the boat.
    for (const s of this.survivors) {
      if (s.called || (s.state !== 'wait' && s.state !== 'adrift')) continue
      const [x, y] = this.dockOf(s)
      if (Math.hypot(b.x - x, b.y - y) < 46) {
        s.called = true
        this.emit({ type: 'call', id: s.id, kind: s.kind, x: s.x, y: s.state === 'wait' ? s.y - 16 : s.y - 8, line: this.rng.pick(KINDS[s.kind].call) })
      }
    }
    let best: Survivor | null = null
    let bd = PICK_R
    for (const s of this.survivors) {
      if (s.state !== 'wait' && s.state !== 'adrift') continue
      const [x, y] = this.dockOf(s)
      const d = Math.hypot(b.x - x, b.y - y)
      if (d < bd) (bd = d), (best = s)
    }
    if (!best) {
      this.pick = null
      return
    }
    const info = KINDS[best.kind]
    if (this.seatsUsed() + info.seats > b.seats) {
      this.pick = null
      if (this.fullCool <= 0) {
        this.fullCool = 2.2
        this.emit({ type: 'full', x: b.x, y: b.y - 12 })
      }
      return
    }
    if (!this.pick || this.pick.id !== best.id) this.pick = { id: best.id, p: 0 }
    const slow = Math.hypot(b.vx, b.vy) < PICK_SPEED || !steer
    if (slow) this.pick.p += dt / info.hold
    else this.pick.p = Math.max(0, this.pick.p - dt * 1.5)
    if (this.pick.p >= 1) {
      const s = best
      s.state = 'aboard'
      b.aboard.push(s.id)
      this.pick = null
      this.emit({ type: 'pickup', id: s.id, kind: s.kind, x: s.x, y: s.y, line: this.rng.pick(info.board) })
    }
  }

  private unload(dt: number) {
    const b = this.boat
    const atShore = b.y < this.shoreY + 18
    if (!atShore) {
      if (this.trip > 0) this.endTrip()
      this.unloadT = 0.15
      return
    }
    if (!b.aboard.length) {
      if (this.trip > 0) this.endTrip()
      return
    }
    this.unloadT -= dt
    if (this.unloadT > 0) return
    this.unloadT = 0.24
    const id = b.aboard.shift()!
    this.trip++
    this.save(id, this.trip)
  }

  private endTrip() {
    if (this.trip >= 3) {
      const bonus = (this.trip - 2) * 5
      this.score += bonus
      this.emit({ type: 'trip', n: this.trip, x: this.boat.x, y: this.boat.y - 14, bonus })
    }
    this.bestTrip = Math.max(this.bestTrip, this.trip)
    this.trip = 0
  }

  private save(id: number, trip: number) {
    const s = this.byId(id)
    if (!s) return
    const info = KINDS[s.kind]
    s.state = 'saved'
    const savedCount = this.survivors.filter((x) => x.state === 'saved').length
    // Stand on the temple hill in little rows.
    s.hx = 18 + ((savedCount * 13) % Math.max(40, this.w - 36))
    s.hy = this.shoreY - 12 - (Math.floor((savedCount * 13) / Math.max(40, this.w - 36)) % 3) * 9
    const points = info.points + (trip > 1 ? (trip - 1) * 2 : 0)
    this.score += points
    this.emit({ type: 'saved', id, kind: s.kind, x: this.boat.x, y: this.boat.y - 10, points, trip })
    if (s.family) {
      const fam = this.survivors.filter((x) => x.family === s.family)
      if (fam.length === this.familySize[s.family] && fam.every((x) => x.state === 'saved')) {
        const bonus = FAMILY_BONUS * fam.length
        this.score += bonus
        this.families++
        this.emit({ type: 'family', name: s.family, x: this.boat.x, y: this.boat.y - 20, bonus })
      }
    }
  }

  private collect() {
    const b = this.boat
    for (const p of this.powers) {
      if (Math.hypot(p.x - b.x, p.y - b.y) > 11) continue
      p.life = 0
      this.powerups++
      if (p.kind === 'rice') this.duration += 6
      else if (p.kind === 'dog') b.boost = 6
      else if (p.kind === 'ring') b.seats = Math.min(MAX_SEATS, b.seats + 1)
      this.score += 5
      this.emit({ type: 'power', kind: p.kind, x: p.x, y: p.y })
    }
    this.powers = this.powers.filter((p) => p.life > 0)
  }
}

export function starsForRescued(n: number): 0 | 1 | 2 | 3 {
  return n >= STAR_RESCUES[2] ? 3 : n >= STAR_RESCUES[1] ? 2 : n >= STAR_RESCUES[0] ? 1 : 0
}
