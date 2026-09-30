// ให้อาหารน้องหมาวัด – kneel beside a temple dog, pour its food into the
// bowl and stroke its head; best friends follow you around.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { bigDogSprite, DOG_COATS, type BigDogFace, type DogCoat } from '../art/characters'
import { P } from '../art/palette'
import type { AvatarLook } from '../art/avatar'
import { iconSprite } from '../art/icons'
import { drawPlayer, handAt, Juice, lightPool, motes, softGlow, vignette, type TPose } from '../art/minigames/temple'
import { Critters, Crowd } from '../art/minigames/scenery'
import { TEMPLE_KID } from '../art/minigames/hosts'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { count, dogState, feedDog, petDog, setCompanion } from '../game/actions'
import { DOG_BY_ID, MAX_HEARTS } from '../game/data/dogs'
import { ITEM_BY_ID } from '../game/data/items'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Hearts, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { PraiseLayer, TempleResult, praise, type TempleResultData } from './temple-ui'

const FOODS = ['dog_food', 'chicken']
const DS = 2 // dog scale

class DogScene implements Scene {
  w = 150
  h = 320
  t = 0
  face: BigDogFace = 'idle'
  eating = 0
  happy = 0
  bowl = 0
  pour = 0
  pourIcon = 'dogfood'
  petT = 0
  boop = 0
  particles = new Particles()
  juice = new Juice()
  onPet?: () => void
  private petAccum = 0
  private bg: HTMLCanvasElement | null = null
  critters = new Critters()
  crowd = new Crowd()
  private lifeInit = false
  constructor(
    public coat: DogCoat,
    public look: AvatarLook,
  ) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    if (!this.lifeInit) {
      this.lifeInit = true
      this.crowd.add({ look: TEMPLE_KID, x: Math.round(w * 0.86), y: this.footY - 14, idle: 'stand', reactPose: 'cheer' })
      this.critters.cat(Math.round(w * 0.2), Math.round(h * 0.55) - 12, '#4a3f55', 'loaf').butterfly(Math.round(w * 0.4), Math.round(h * 0.35), '#ff9fc0').bird(Math.round(w * 0.7), Math.round(h * 0.55) - 12, 'sparrow')
    }
  }
  get footY() {
    return Math.round(this.h * 0.66)
  }
  get playerX() {
    return Math.round(this.w * 0.28)
  }
  get dogX() {
    return this.playerX + 14
  }
  get dogY() {
    return this.footY - 31 * DS + 2
  }
  get bowlX() {
    return this.dogX + 30
  }
  get bowlY() {
    return this.footY + 4
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h * 0.5, ['#ffe9c4', '#ffd9a0'])
      // Distant garden and a chedi through the sala.
      const gy = Math.round(h * 0.36)
      g.rect(14, gy, w - 28, h * 0.12, '#b4e486')
      for (let x = 18; x < w - 18; x += 14) g.circle(x, gy, 6, '#5ea653')
      const cx = Math.round(w * 0.68)
      g.poly([[cx - 9, gy], [cx, gy - 22], [cx + 9, gy]], '#fffaf0')
      g.poly([[cx + 1, gy], [cx, gy - 22], [cx + 9, gy]], '#e3d8c6')
      g.rect(cx - 11, gy - 2, 22, 3, '#fffaf0')
      g.rect(cx - 1, gy - 28, 2, 7, P.gold)
      // Sala posts, railing and roof beam.
      const fy = Math.round(h * 0.55)
      g.rect(0, 0, w, 10, '#8e2a3c')
      g.rect(0, 10, w, 2, P.gold)
      for (const x of [6, w - 14]) {
        g.rect(x, 12, 8, fy - 12, '#fffaf0')
        g.rect(x + 6, 12, 2, fy - 12, '#e3d8c6')
        g.rect(x - 1, fy - 6, 10, 6, P.goldD)
      }
      g.rect(0, fy - 12, w, 3, '#9a6a45')
      for (let x = 18; x < w - 18; x += 10) g.rect(x, fy - 12, 2, 12, '#c28e5c')
      // Wooden floor.
      g.rect(0, fy, w, h - fy, '#c28e5c')
      for (let y = fy + 4; y < h; y += 7) g.hline(0, w - 1, y, '#a8774a')
      for (let y = fy; y < h; y += 7) for (let x = (y * 13) % 29; x < w; x += 29) g.vline(x, y, y + 6, '#a8774a')
      // A woven mat where you sit.
      g.ellipse(this.playerX, this.footY, 30, 6, '#e0bb8a')
      g.ellipse(this.playerX, this.footY, 26, 4.5, '#d4a870')
    })
    return this.bg
  }
  feed(icon: string) {
    this.pour = 1.1
    this.pourIcon = icon
    tsfx.rustle()
    setTimeout(() => {
      this.bowl = 1
      this.eating = 2.8
      sfx.munch()
    }, 700)
  }
  pointer(e: PointerInfo) {
    if (e.type !== 'move' && e.type !== 'down') return
    const s = DS
    const inDog = e.x > this.dogX + 2 * s && e.x < this.dogX + 28 * s && e.y > this.dogY && e.y < this.dogY + 24 * s
    if (!inDog || this.eating > 0) return
    this.petAccum += Math.hypot(e.dx, e.dy)
    this.happy = 1.2
    this.petT = 0.3
    if (Math.random() < 0.25) this.particles.hearts(e.x, e.y - 4, 1)
    if (Math.random() < 0.1) tsfx.pat()
    if (this.petAccum > 90) {
      this.petAccum = 0
      this.boop = 1
      this.juice.shake(0.08)
      this.crowd.cheer('happy', 1)
      this.onPet?.()
    }
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    this.petT = Math.max(0, this.petT - dt)
    this.boop = Math.max(0, this.boop - dt * 4)
    if (this.pour > 0) {
      this.pour -= dt
      if (this.pour < 0.9 && this.pour > 0.2 && Math.random() < 0.9) {
        const [mx, my] = this.bagMouth
        this.particles.add({ kind: 'dot', x: mx + rand(-1, 1), y: my, vx: rand(4, 14), vy: rand(10, 30), g: 200, max: 0.45, color: Math.random() < 0.5 ? '#9a6a45' : '#c28e5c' })
      }
    }
    if (this.eating > 0) {
      this.eating -= dt
      this.face = 'eat'
      if (Math.random() < dt * 4) sfx.munch()
      if (Math.random() < dt * 8) this.particles.add({ kind: 'dot', x: this.bowlX + rand(-10, 10), y: this.bowlY - 6, vx: rand(-10, 10), vy: rand(-20, -5), g: 60, max: 0.5, color: '#c28e5c' })
      if (this.eating <= 0) {
        this.bowl = 0
        this.happy = 2
        this.particles.hearts(this.dogX + 28, this.dogY + 10, 5)
        sfx.bark()
        this.juice.shake(0.1)
      }
    } else if (this.happy > 0) {
      this.happy -= dt
      this.face = Math.floor(this.t * 4) % 2 ? 'happy' : 'tongue'
    } else {
      this.face = Math.sin(this.t * 1.3) > 0.97 ? 'blink' : 'idle'
    }
    motes(this.particles, dt, this.w, this.footY, 1.5, '#fff3c4')
    this.critters.update(dt, this.w)
    this.crowd.update(dt)
    this.particles.update(dt)
  }
  private bagMouth: [number, number] = [0, 0]
  render(g: Surface) {
    const { w } = this
    this.juice.begin(g)
    g.draw(this.background(), 0, 0)
    lightPool(g, this.dogX + 20, this.footY, 60, '#ffe7a0', 0.8)
    const s = DS
    const bob = this.eating > 0 ? Math.round(Math.abs(Math.sin(this.t * 10)) * 2) : Math.round(Math.sin(this.t * 2) * 1)
    // Wagging tail behind the dog.
    const wag = Math.sin(this.t * (this.happy > 0 ? 16 : 6)) * (this.happy > 0 ? 5 : 2)
    const tx = this.dogX + 23 * s
    const ty = this.dogY + 25 * s
    for (let i = 0; i < 6; i++) {
      const k = i / 5
      const x = tx + i * 2 + wag * k
      const y = ty - i * 2 - k * k * 4
      g.circle(x, y, 2.4 - k * 0.8, P.ink)
      g.circle(x, y, 1.8 - k * 0.8, i > 3 ? this.coat.light : this.coat.base)
    }
    g.ellipse(this.dogX + 14 * s, this.footY - 1, 26, 4, 'rgba(90,50,30,0.25)')
    const spr = bigDogSprite(this.coat, this.face)
    const squash = Math.round(this.boop * 3)
    g.drawScaled(spr.canvas, this.dogX, this.dogY + bob + squash + (this.eating > 0 ? 4 : 0), s)
    // Bowl in front of the dog.
    const bx = this.bowlX
    const by = this.bowlY
    g.ellipse(bx, by + 4, 16, 4, 'rgba(90,50,30,0.3)')
    g.poly(
      [
        [bx - 14, by - 4],
        [bx + 14, by - 4],
        [bx + 11, by + 4],
        [bx - 11, by + 4],
      ],
      P.red,
    )
    g.ellipse(bx, by - 4, 14, 3, P.redD)
    if (this.bowl > 0) {
      g.ellipse(bx, by - 5, 11, 2.4, '#9a6a45')
      for (let i = 0; i < 9; i++) g.px(bx - 8 + ((i * 7) % 16), by - 6 + (i % 2), '#c28e5c')
    }
    g.hline(bx - 10, bx + 10, by - 1, P.redL)
    if (this.happy > 0) softGlow(g, this.dogX + 28, this.dogY + 20, 30, 0.5, '#ffd6e0')
    // The player kneeling beside the dog.
    let pose: TPose | 'kneel' = 'kneel'
    if (this.pour > 0) pose = 'feed_pour'
    else if (this.petT > 0) pose = Math.floor(this.t * 8) % 2 ? 'pet_a' : 'pet_b'
    else if (this.happy > 0 || this.eating > 0) pose = 'kneel'
    this.critters.render(g)
    this.crowd.render(g)
    const pl = drawPlayer(g, this.look, pose, 'front', this.playerX, this.footY, { scale: 2, t: this.t, barefoot: true, shadow: false })
    if (pose === 'feed_pour') {
      const [lx, ly] = handAt(pl, 1)
      const [rx, ry] = handAt(pl, -1)
      // a paper bag of food tipped towards the bowl
      const cx = (lx + rx) / 2 + 2
      const cy = (ly + ry) / 2 - 2
      g.poly(
        [
          [cx - 7, cy - 6],
          [cx + 5, cy - 9],
          [cx + 9, cy + 1],
          [cx - 4, cy + 5],
        ],
        '#fffaf0',
      )
      g.poly(
        [
          [cx - 3, cy - 3],
          [cx + 4, cy - 5],
          [cx + 6, cy],
          [cx - 1, cy + 2],
        ],
        '#e8514a',
      )
      const ic = iconSprite(this.pourIcon)
      g.draw(ic.canvas, Math.round(cx - 8), Math.round(cy - 26))
      this.bagMouth = [cx + 9, cy + 1]
    }
    this.particles.render(g)
    vignette(g, '#3a2418', 0.3)
    this.juice.end(g)
    void w
  }
}

export function DogActivity({ req }: { req: ActivityRequest }) {
  const id = (req.params?.dog as string) ?? 'somo'
  const def = DOG_BY_ID[id] ?? DOG_BY_ID.somo
  const coat = DOG_COATS.find((c) => c.id === def.coat) ?? DOG_COATS[0]
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new DogScene(coat, look), { targetWidth: 150 })
  const [buy, setBuy] = useState(false)
  const [result, setResult] = useState<TempleResultData | null>(null)
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
        praise(stage.current, sc.dogX + 28, sc.dogY - 6, 'ถูกใจน้อง!', 'pink')
      } else {
        setMsg(`น้อง${def.name}ยิ้มแก้มปริ`)
        praise(stage.current, sc.dogX + 28, sc.dogY - 6, 'งื้ดด~', 'pink')
      }
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
    scene.current?.feed(ITEM_BY_ID[food]?.icon ?? 'dogfood')
    setMsg(`น้อง${def.name}กินอย่างเอร็ดอร่อย +${r.merit} บุญ`)
    setTimeout(() => {
      const sc = scene.current
      if (!sc) return
      sc.particles.popText(sc.dogX + 28, sc.dogY, `+${r.merit}`)
      praise(stage.current, sc.dogX + 28, sc.dogY - 10, 'อร่อยจัง!', 'gold')
    }, 3400)
  }

  const close = () => {
    if (merit.current > 0)
      setResult({ title: `ใจดีกับน้อง${def.name}`, merit: merit.current, icon: 'dog', pose: 'cheer', lines: ['ให้อาหารสัตว์ที่ไม่มีเจ้าของ เป็นทานที่ยิ่งใหญ่'], doubleable: false })
    else closeActivity()
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={`น้อง${def.name}`} onClose={close} />
      <PraiseLayer />
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
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}
