// ให้อาหารน้องหมาวัด – feed and pet a temple dog; best friends follow you.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { bigDogSprite, DOG_COATS, type BigDogFace, type DogCoat } from '../art/characters'
import { P } from '../art/palette'
import { game } from '../game/state'
import { count, dogState, feedDog, petDog, setCompanion } from '../game/actions'
import { DOG_BY_ID, MAX_HEARTS } from '../game/data/dogs'
import { ITEM_BY_ID } from '../game/data/items'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Hearts, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawGlow } from '../scenes/sky'

const FOODS = ['dog_food', 'chicken']

class DogScene implements Scene {
  w = 150
  h = 320
  t = 0
  face: BigDogFace = 'idle'
  eating = 0
  happy = 0
  bowl = 0
  pour = 0
  particles = new Particles()
  onPet?: () => void
  private petAccum = 0
  private bg: HTMLCanvasElement | null = null
  constructor(public coat: DogCoat) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get scale() {
    return 3
  }
  get dogX() {
    return Math.round(this.w / 2 - 45)
  }
  get dogY() {
    return Math.round(this.h * 0.64 - 90)
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h * 0.55, ['#ffe9c4', '#ffd9a0'])
      // Sala posts and railing.
      for (const x of [6, w - 14]) {
        g.rect(x, 0, 8, h * 0.62, '#fffaf0')
        g.rect(x + 6, 0, 2, h * 0.62, '#e3d8c6')
        g.rect(x - 1, h * 0.62 - 6, 10, 6, P.goldD)
      }
      g.rect(0, h * 0.5, w, 3, '#9a6a45')
      for (let x = 18; x < w - 18; x += 10) g.rect(x, h * 0.5, 2, h * 0.12, '#c28e5c')
      // Distant garden.
      g.rect(14, h * 0.42, w - 28, h * 0.08, '#86c95f')
      for (let x = 18; x < w - 18; x += 14) g.circle(x, h * 0.42, 6, '#5ea653')
      // Wooden floor.
      const fy = Math.round(h * 0.62)
      g.rect(0, fy, w, h - fy, '#c28e5c')
      for (let y = fy + 4; y < h; y += 7) g.hline(0, w - 1, y, '#a8774a')
      for (let y = fy; y < h; y += 7) for (let x = (y * 13) % 29; x < w; x += 29) g.vline(x, y, y + 6, '#a8774a')
    })
    return this.bg
  }
  feed() {
    this.pour = 1
    this.bowl = 1
    this.eating = 2.8
    sfx.munch()
  }
  pointer(e: PointerInfo) {
    if (e.type !== 'move' && e.type !== 'down') return
    const s = this.scale
    const inDog = e.x > this.dogX + 2 * s && e.x < this.dogX + 26 * s && e.y > this.dogY && e.y < this.dogY + 20 * s
    if (!inDog || this.eating > 0) return
    this.petAccum += Math.hypot(e.dx, e.dy)
    this.happy = 1.2
    if (Math.random() < 0.25) this.particles.hearts(e.x, e.y - 4, 1)
    if (this.petAccum > 90) {
      this.petAccum = 0
      this.onPet?.()
    }
  }
  update(dt: number) {
    this.t += dt
    this.pour = Math.max(0, this.pour - dt)
    if (this.pour > 0 && Math.random() < 0.8) {
      this.particles.add({ kind: 'dot', x: this.w / 2 + rand(-3, 3), y: this.h * 0.64, vy: rand(20, 40), max: 0.25, color: '#9a6a45' })
    }
    if (this.eating > 0) {
      this.eating -= dt
      this.face = 'eat'
      if (Math.random() < dt * 4) sfx.munch()
      if (Math.random() < dt * 8) this.particles.add({ kind: 'dot', x: this.w / 2 + rand(-10, 10), y: this.h * 0.66, vx: rand(-10, 10), vy: rand(-20, -5), g: 60, max: 0.5, color: '#c28e5c' })
      if (this.eating <= 0) {
        this.bowl = 0
        this.happy = 2
        this.particles.hearts(this.w / 2, this.dogY + 10, 5)
        sfx.bark()
      }
    } else if (this.happy > 0) {
      this.happy -= dt
      this.face = Math.floor(this.t * 4) % 2 ? 'happy' : 'tongue'
    } else {
      this.face = Math.sin(this.t * 1.3) > 0.97 ? 'blink' : 'idle'
    }
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    g.draw(this.background(), 0, 0)
    const s = this.scale
    const bob = this.eating > 0 ? Math.round(Math.abs(Math.sin(this.t * 10)) * 2) : Math.round(Math.sin(this.t * 2) * 1)
    // Wagging tail behind the dog.
    const wag = Math.sin(this.t * (this.happy > 0 ? 16 : 6)) * (this.happy > 0 ? 6 : 3)
    const tx = this.dogX + 23 * s
    const ty = this.dogY + 25 * s
    for (let i = 0; i < 7; i++) {
      const k = i / 6
      const x = tx + i * 3 + wag * k
      const y = ty - i * 3 - k * k * 6
      g.circle(x, y, 3.2 - k, P.ink)
      g.circle(x, y, 2.4 - k, i > 4 ? this.coat.light : this.coat.base)
    }
    // Shadow.
    g.ellipse(w / 2, this.dogY + 29 * s, 40, 6, 'rgba(90,50,30,0.25)')
    const spr = bigDogSprite(this.coat, this.face)
    g.drawScaled(spr.canvas, this.dogX, this.dogY + bob + (this.eating > 0 ? 6 : 0), s)
    // Bowl.
    const bx = Math.round(w / 2)
    const by = Math.round(h * 0.7)
    g.ellipse(bx, by + 4, 20, 5, 'rgba(90,50,30,0.3)')
    g.poly(
      [
        [bx - 18, by - 5],
        [bx + 18, by - 5],
        [bx + 14, by + 4],
        [bx - 14, by + 4],
      ],
      P.red,
    )
    g.ellipse(bx, by - 5, 18, 4, P.redD)
    if (this.bowl > 0) {
      g.ellipse(bx, by - 6, 14, 3, '#9a6a45')
      for (let i = 0; i < 10; i++) g.px(bx - 10 + ((i * 7) % 20), by - 7 + (i % 3), '#c28e5c')
    }
    g.hline(bx - 12, bx + 12, by - 1, P.redL)
    if (this.happy > 0) drawGlow(g, w / 2, this.dogY + 30, 30, 0.5, '#ffd6e0')
    this.particles.render(g)
  }
}

export function DogActivity({ req }: { req: ActivityRequest }) {
  const id = (req.params?.dog as string) ?? 'somo'
  const def = DOG_BY_ID[id] ?? DOG_BY_ID.somo
  const coat = DOG_COATS.find((c) => c.id === def.coat) ?? DOG_COATS[0]
  const { host, scene } = useStage(() => new DogScene(coat), { targetWidth: 150 })
  const [buy, setBuy] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const merit = useRef(0)
  const st = dogState(id)
  const isCompanion = game.value.companion === id

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.onPet = () => {
      const m = petDog(id)
      if (m > 0) {
        merit.current += m
        sfx.bark()
        haptic(15)
        setMsg(`น้อง${def.name}ชอบมาก! ความสนิท +1`)
      } else setMsg(`น้อง${def.name}ยิ้มแก้มปริ`)
    }
  }, [scene.current])

  const feed = (food: string) => {
    if (count(food) <= 0) {
      setBuy(true)
      return
    }
    const r = feedDog(id, food)
    if (r.full) {
      setMsg(`น้อง${def.name}อิ่มแล้ววันนี้ พรุ่งนี้มาใหม่นะ`)
      sfx.bark()
      return
    }
    if (!r.ok) return
    merit.current += r.merit
    scene.current?.feed()
    setMsg(`น้อง${def.name}กินอย่างเอร็ดอร่อย +${r.merit} บุญ`)
    setTimeout(() => scene.current?.particles.popText(scene.current.w / 2, scene.current.dogY, `+${r.merit}`), 2800)
  }

  const close = () => {
    if (merit.current > 0)
      setResult({ title: `ใจดีกับน้อง${def.name}`, merit: merit.current, icon: 'dog', lines: ['ให้อาหารสัตว์ที่ไม่มีเจ้าของ เป็นทานที่ยิ่งใหญ่'], doubleable: false })
    else closeActivity()
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={`น้อง${def.name}`} onClose={close} />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            <div class="row" style={{ justifyContent: 'center' }}>
              <span class="subtitle">ความสนิท</span>
              <Hearts value={st.hearts} max={MAX_HEARTS} />
            </div>
            <div class="small muted">{msg ?? `${def.about} · ลูบหัวน้องด้วยการลากนิ้วบนตัวน้อง`}</div>
            <div class="tray" style={{ justifyContent: 'center' }}>
              {FOODS.map((f) => {
                const it = ITEM_BY_ID[f]
                return (
                  <button key={f} class="panel tray-item" onClick={() => (sfx.tap(), feed(f))}>
                    <Icon name={it.icon} size={30} />
                    <span>{it.name}</span>
                    <span class="qty num">x{count(f)}</span>
                  </button>
                )
              })}
            </div>
            {st.hearts >= MAX_HEARTS ? (
              <Btn tone="green" block onClick={() => setCompanion(isCompanion ? null : id)}>
                <Icon name="paw" size={18} /> {isCompanion ? `ให้น้อง${def.name}พักที่วัด` : `ชวนน้อง${def.name}เดินด้วยกัน`}
              </Btn>
            ) : (
              <div class="small muted">ให้อาหารวันละไม่เกิน 3 มื้อ · สนิทครบ 5 หัวใจแล้วน้องจะเดินตามคุณ</div>
            )}
          </div>
        </div>
      )}
      {buy && <QuickBuy ids={FOODS} title="อาหารน้องหมา" onClose={() => setBuy(false)} />}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}
