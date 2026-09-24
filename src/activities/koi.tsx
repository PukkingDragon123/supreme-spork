// ให้อาหารปลา – tap the pond to toss food; koi (or riverside catfish) swim
// over and gulp it up. Fish bodies are procedural so they bend as they swim.

import { useEffect, useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, ditherOn, type Surface } from '../engine/pixel'
import { Particles, drawRing } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import { lotusFlower } from '../art/props'
import { game, mutate } from '../game/state'
import { addMerit, count, track, useItem } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Icon } from '../ui/components/common'
import { toast } from '../game/events'
import { sfx, haptic } from '../engine/audio'

type Variety = { base: string; patch: string; patch2?: string; name: string }

const KOI: Variety[] = [
  { name: 'kohaku', base: '#fffaf0', patch: '#f0592b' },
  { name: 'sanke', base: '#fffaf0', patch: '#e8452f', patch2: '#2f2838' },
  { name: 'showa', base: '#2f2838', patch: '#e8452f', patch2: '#fffaf0' },
  { name: 'kigoi', base: '#ffd23f', patch: '#ffe98a' },
  { name: 'chagoi', base: '#b8844a', patch: '#9a6a3a' },
  { name: 'orange', base: '#ff8a3d', patch: '#ffb36a' },
  { name: 'asagi', base: '#8fb6d8', patch: '#e8452f' },
]
const GOLDEN: Variety = { name: 'ogon', base: '#ffd54f', patch: '#fff3a6' }
const CATFISH: Variety = { name: 'catfish', base: '#8f97a8', patch: '#b8bfcc', patch2: '#5e6577' }

interface Fish {
  x: number
  y: number
  a: number
  speed: number
  len: number
  v: Variety
  seed: number
  target: Pellet | null
  wiggle: number
  golden: boolean
  full: number
  gulp: number
}

interface Pellet {
  x: number
  y: number
  life: number
  taken: boolean
}

class PondScene implements Scene {
  w = 160
  h = 320
  t = 0
  fish: Fish[] = []
  pellets: Pellet[] = []
  particles = new Particles()
  pads: { x: number; y: number; r: number; flower: boolean; ph: number }[] = []
  turtle: { x: number; y: number; t: number } | null = null
  onThrow?: () => boolean
  onEat?: (f: Fish) => void
  private bg: HTMLCanvasElement | null = null
  constructor(public river: boolean) {}

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    if (!this.fish.length) this.spawn()
  }

  private spawn() {
    const n = this.river ? 8 : 7
    const golden = !this.river && Math.random() < 0.35
    for (let i = 0; i < n; i++) {
      const isGold = golden && i === 0
      this.fish.push({
        x: rand(20, this.w - 20),
        y: rand(40, this.h - 60),
        a: rand(0, Math.PI * 2),
        speed: rand(10, 16),
        len: this.river ? rand(20, 26) : rand(12, 17),
        v: this.river ? CATFISH : isGold ? GOLDEN : KOI[i % KOI.length],
        seed: rand(0, 10),
        target: null,
        wiggle: rand(0, 6),
        golden: isGold,
        full: 0,
        gulp: 0,
      })
    }
    for (let i = 0; i < 7; i++)
      this.pads.push({ x: rand(10, this.w - 10), y: rand(30, this.h - 40), r: rand(5, 9), flower: !this.river && i % 3 === 0, ph: rand(0, 6) })
  }

  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      const deep = this.river ? '#5f7f5a' : P.waterDD
      const mid = this.river ? '#7a9a62' : P.waterD
      const shallow = this.river ? '#9ab87a' : P.water
      g.rect(0, 0, w, h, mid)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const dx = (x - w / 2) / (w / 2)
          const dy = (y - h / 2) / (h / 2)
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 0.7 && ditherOn(x, y, (0.7 - d) * 1.6)) g.px(x, y, deep)
          if (d > 0.85 && ditherOn(x, y, (d - 0.85) * 3)) g.px(x, y, shallow)
        }
      // Pebbles on the bottom.
      for (let i = 0; i < 70; i++) {
        const x = (i * 97) % w
        const y = (i * 61) % h
        g.px(x, y, this.river ? '#6a8a52' : '#3a6f98')
      }
      // Stone rim along the top and bottom.
      for (let x = -4; x < w + 4; x += 9) {
        g.ellipse(x, 4, 7, 6, P.stoneD)
        g.ellipse(x, 3, 6, 5, P.stone)
        g.px(x - 2, 1, P.stoneL)
        g.ellipse(x + 4, h - 3, 7, 6, P.stoneD)
        g.ellipse(x + 4, h - 4, 6, 5, P.stone)
        g.px(x + 2, h - 7, P.stoneL)
      }
      if (this.river) {
        g.rect(0, 0, w, 10, '#9a6a45')
        for (let x = 0; x < w; x += 8) g.vline(x, 0, 9, '#7a5238')
      }
    })
    return this.bg
  }

  pointer(e: PointerInfo) {
    if (e.type !== 'down') return
    if (e.y < 14 || e.y > this.h - 12) return
    if (!this.onThrow?.()) return
    this.pellets.push({ x: e.x, y: e.y, life: 7, taken: false })
    this.particles.add({ kind: 'ripple', x: e.x, y: e.y, max: 0.9, size: 9, color: '#d4f5fa' })
    sfx.plop()
    haptic(6)
    // Nearby fish notice the food.
    for (const f of this.fish) if (!f.target && Math.hypot(f.x - e.x, f.y - e.y) < 90 && f.full < 1) f.target = this.pellets[this.pellets.length - 1]
  }

  update(dt: number) {
    this.t += dt
    const { w, h } = this
    for (const p of this.pellets) p.life -= dt
    this.pellets = this.pellets.filter((p) => p.life > 0 && !p.taken)
    for (const f of this.fish) {
      f.wiggle += dt * (f.target ? 12 : 7)
      f.full = Math.max(0, f.full - dt * 0.05)
      f.gulp = Math.max(0, f.gulp - dt)
      if (f.target && (f.target.taken || f.target.life <= 0)) f.target = null
      if (!f.target && f.full < 1) {
        let best: Pellet | null = null
        let bd = 70
        for (const p of this.pellets) {
          const d = Math.hypot(p.x - f.x, p.y - f.y)
          if (d < bd) {
            bd = d
            best = p
          }
        }
        f.target = best
      }
      let desired = f.a
      if (f.target) desired = Math.atan2(f.target.y - f.y, f.target.x - f.x)
      else desired = f.a + Math.sin(this.t * 0.7 + f.seed) * 0.8
      // Stay inside the pond.
      const m = 22
      if (f.x < m) desired = 0
      else if (f.x > w - m) desired = Math.PI
      if (f.y < m + 6) desired = Math.PI / 2
      else if (f.y > h - m) desired = -Math.PI / 2
      let da = desired - f.a
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      f.a += Math.max(-2.6 * dt, Math.min(2.6 * dt, da))
      const sp = f.target ? f.speed * 2.2 : f.speed
      f.x += Math.cos(f.a) * sp * dt
      f.y += Math.sin(f.a) * sp * dt
      if (f.target && Math.hypot(f.target.x - f.x, f.target.y - f.y) < 4) {
        f.target.taken = true
        f.target = null
        f.full += this.river ? 0.25 : 0.34
        f.gulp = 0.3
        sfx.gulp()
        this.particles.add({ kind: 'ripple', x: f.x, y: f.y, max: 0.6, size: 6, color: '#ffffff' })
        for (let i = 0; i < 3; i++) this.particles.add({ kind: 'dot', x: f.x + rand(-2, 2), y: f.y, vy: rand(-12, -6), max: 0.6, color: '#e6fbff' })
        this.particles.hearts(f.x, f.y - 6, f.golden ? 3 : 1, f.golden ? '#ffd54f' : '#ff6f91')
        this.onEat?.(f)
      }
    }
    // Lotus pads drift slowly.
    for (const p of this.pads) p.x += Math.sin(this.t * 0.2 + p.ph) * 0.03
    // A turtle occasionally paddles across.
    if (!this.river) {
      if (!this.turtle && Math.random() < dt * 0.03) this.turtle = { x: -12, y: rand(60, h - 60), t: 0 }
      if (this.turtle) {
        this.turtle.t += dt
        this.turtle.x += 7 * dt
        if (this.turtle.x > w + 14) this.turtle = null
      }
    }
    if (Math.random() < dt * 2) this.particles.add({ kind: 'sparkle', x: rand(0, w), y: rand(12, h - 12), max: 0.4, color: '#e6fbff' })
    this.particles.update(dt)
  }

  private drawFish(g: Surface, f: Fish) {
    const cos = Math.cos(f.a)
    const sin = Math.sin(f.a)
    const L = f.len
    const pts: [number, number, number][] = []
    for (let d = 0; d <= L; d += 1) {
      const t = d / L
      const lat = Math.sin(f.wiggle - d * 0.35) * (t * t) * (this.river ? 3 : 2.4)
      const x = f.x - cos * d - sin * lat
      const y = f.y - sin * d + cos * lat
      const r = t < 0.2 ? 1.6 + t * 6 : t < 0.55 ? 2.8 : Math.max(0.6, 2.8 - (t - 0.55) * 5.5)
      pts.push([x, y, (this.river ? 1.25 : 1) * r])
    }
    // Shadow on the pond floor.
    for (const [x, y, r] of pts) g.ellipse(x + 3, y + 4, r, r * 0.8, 'rgba(20,40,70,0.25)')
    // Fins near the head.
    const fx = f.x - cos * L * 0.25
    const fy = f.y - sin * L * 0.25
    const flap = Math.sin(f.wiggle * 1.5) * 1.2
    for (const side of [-1, 1]) {
      g.px(fx - sin * side * (4 + flap), fy + cos * side * (4 + flap), f.v.patch)
      g.px(fx - sin * side * 3, fy + cos * side * 3, f.v.base)
    }
    // Body.
    pts.forEach(([x, y, r], i) => {
      const t = i / L
      let c = f.v.base
      const n = Math.sin(i * 0.9 + f.seed * 3)
      if (n > 0.35) c = f.v.patch
      else if (f.v.patch2 && n < -0.6) c = f.v.patch2
      g.circle(x, y, r, c)
      if (t > 0.9) g.circle(x, y, r + 0.6, f.v.patch)
    })
    // Tail fin.
    const [tx, ty] = pts[pts.length - 1]
    const tw = Math.sin(f.wiggle) * 2
    g.line(tx, ty, tx - cos * 4 - sin * (3 + tw), ty - sin * 4 + cos * (3 + tw), f.v.patch)
    g.line(tx, ty, tx - cos * 4 + sin * (3 - tw), ty - sin * 4 - cos * (3 - tw), f.v.patch)
    // Eyes and mouth.
    g.px(f.x - cos * 1 - sin * 1.5, f.y - sin * 1 + cos * 1.5, P.ink)
    g.px(f.x - cos * 1 + sin * 1.5, f.y - sin * 1 - cos * 1.5, P.ink)
    if (f.gulp > 0) g.px(f.x + cos, f.y + sin, '#ff9aa6')
    if (this.river) {
      // Whiskers.
      g.line(f.x, f.y, f.x + cos * 3 - sin * 3, f.y + sin * 3 + cos * 3, '#5e6577')
      g.line(f.x, f.y, f.x + cos * 3 + sin * 3, f.y + sin * 3 - cos * 3, '#5e6577')
    }
    if (f.golden && Math.sin(this.t * 5 + f.seed) > 0.7) this.particles.sparkles(f.x, f.y, 1, '#fff3a6')
  }

  render(g: Surface) {
    g.draw(this.background(), 0, 0)
    for (const p of this.pellets) {
      const sink = Math.min(1, (7 - p.life) / 7)
      g.px(p.x, p.y, this.river ? '#e8c07a' : '#9a6a45')
      g.px(p.x + 1, p.y, this.river ? '#f0d49a' : '#c28e5c')
      if (this.river) g.px(p.x, p.y + 1, '#e8c07a')
      if (sink < 0.3) drawRing(g, p.x, p.y, 2 + sink * 6, 1 + sink * 3, '#d4f5fa')
    }
    for (const f of this.fish) this.drawFish(g, f)
    if (this.turtle) {
      const { x, y, t } = this.turtle
      const leg = Math.sin(t * 6) > 0 ? 1 : 0
      g.ellipse(x, y, 6, 5, '#5e8a4a')
      g.ellipse(x, y, 4.5, 3.5, '#7aa85a')
      g.px(x - 1, y - 1, '#9ac87a')
      g.circle(x + 7, y, 2, '#7aa85a')
      g.px(x + 8, y - 1, P.ink)
      g.px(x - 4 - leg, y - 5, '#6a9a52')
      g.px(x + 3 + leg, y - 5, '#6a9a52')
      g.px(x - 4 + leg, y + 5, '#6a9a52')
      g.px(x + 3 - leg, y + 5, '#6a9a52')
    }
    const fl = lotusFlower()
    for (const p of this.pads) {
      g.circle(p.x + 1, p.y + 2, p.r, 'rgba(20,50,40,0.3)')
      g.circle(p.x, p.y, p.r, P.leaf)
      g.circle(p.x - 0.5, p.y - 0.5, p.r - 1, P.grassD)
      g.line(p.x, p.y, p.x + p.r, p.y - 1, P.leafD)
      if (p.flower) g.draw(fl.canvas, p.x - 2, p.y - 3)
    }
    this.particles.render(g)
  }
}

export function KoiActivity({ req }: { req: ActivityRequest }) {
  const river = !!req.params?.river
  const foodId = river ? 'catfish_food' : 'fish_food'
  const { host, scene } = useStage(() => new PondScene(river), { targetWidth: 150 })
  const [fed, setFed] = useState(0)
  const [merit, setMerit] = useState(0)
  const [golden, setGolden] = useState(false)
  const [buy, setBuy] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const left = count(foodId)
  const freeAvailable = !game.value.daily.freeFishFood && !river

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.onThrow = () => {
      if (!useItem(foodId)) {
        setBuy(true)
        return false
      }
      return true
    }
    sc.onEat = (f) => {
      const base = f.golden ? 5 : 1
      const m = addMerit(base, { key: river ? 'catfish' : 'koi', free: 40, animal: true, area: river ? 'river' : 'home' })
      track(river ? 'catfish_fed' : 'koi_fed')
      if (f.golden) {
        setGolden(true)
        sfx.sparkle()
      }
      setFed((n) => n + 1)
      setMerit((n) => n + m)
      sc.particles.popText(f.x, f.y - 12, `+${m}`)
    }
    setGolden(sc.fish.some((f) => f.golden))
  }, [scene.current])

  const claimFree = () => {
    mutate((d) => {
      d.daily.freeFishFood = true
      d.inventory.fish_food = (d.inventory.fish_food ?? 0) + 12
    })
    sfx.coin()
    toast('รับอาหารปลาฟรี 1 ถุง (12 เม็ด)', 'fishfood')
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame
        title={river ? 'ให้อาหารปลาสวายริมน้ำ' : 'ให้อาหารปลาคาร์ฟ'}
        onClose={() => {
          if (fed > 0 && !result) setResult({ title: `ปลาอิ่มท้องแล้ว ${fed} คำ`, merit, icon: river ? 'bread' : 'koi', lines: ['ให้ทานแก่สัตว์ เป็นบุญที่ทำได้ทุกวัน'] })
          else closeActivity()
        }}
      />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            <div class="row" style={{ justifyContent: 'center' }}>
              <Icon name={river ? 'bread' : 'fishfood'} size={24} />
              <span class="subtitle">
                {river ? 'ขนมปัง' : 'อาหารปลา'} เหลือ <span class="num">{left}</span> ชิ้น
              </span>
            </div>
            <div class="small muted">
              แตะที่ผิวน้ำเพื่อโปรยอาหาร · ให้ไปแล้ว {fed} คำ +{merit} บุญ
              {golden && !river ? ' · มีปลาคาร์ฟทองในบ่อ!' : ''}
            </div>
            <div class="row">
              {freeAvailable && (
                <Btn tone="green" class="grow" onClick={claimFree}>
                  รับอาหารปลาฟรีวันนี้
                </Btn>
              )}
              {left <= 12 && (
                <Btn tone={freeAvailable ? 'paper' : 'green'} class="grow" onClick={() => setBuy(true)}>
                  ซื้อ{river ? 'ขนมปัง' : 'อาหารปลา'}
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
      {buy && <QuickBuy ids={[foodId]} title={river ? 'ขนมปังให้ปลา' : 'อาหารปลา'} onClose={() => setBuy(false)} />}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}
