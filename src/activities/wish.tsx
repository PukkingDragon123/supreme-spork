// ขอพร – light three incense sticks at the candle, offer flowers, raise the
// incense in a wai while you make your wish, then plant it in the urn and
// watch the wish float up.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import type { AvatarLook } from '../art/avatar'
import { drawAltar, drawArch, drawBuddha, drawHallInterior, drawCandle } from '../art/interior'
import { drawUbosot } from '../art/buildings'
import { iconSprite } from '../art/icons'
import { P } from '../art/palette'
import { drawPlayer, godRays, handAt, incenseSmoke, Juice, lightPool, motes, softGlow, vignette, type Placed, type TPose } from '../art/minigames/temple'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { addMerit, count, recordWish, track, useItem } from '../game/actions'
import { ITEM_BY_ID } from '../game/data/items'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { Btn, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { SKY } from '../scenes/sky'
import { PraiseLayer, StatusPill, TempleResult, banner, praise, type TempleResultData } from './temple-ui'

const CATS = ['การงาน', 'การเงิน', 'ความรัก', 'สุขภาพ', 'การเรียน', 'ครอบครัว', 'โชคลาภ']
const OFFERINGS = ['lotus', 'garland', 'rose', 'incense', 'fruit']

type Step = 'light' | 'offer' | 'wish' | 'pray' | 'plant' | 'done'

class WishScene implements Scene {
  w = 160
  h = 320
  t = 0
  lit = 0
  step: Step = 'light'
  lightT = 0
  charge = 0
  plantT = -1
  offer: { icon: string; t: number } | null = null
  offered: string | null = null
  orb: { x: number; y: number; t: number } | null = null
  particles = new Particles()
  juice = new Juice()
  private bg: HTMLCanvasElement | null = null
  constructor(
    public place: 'hall' | 'incense',
    public look: AvatarLook,
  ) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get footY() {
    return Math.round(this.h * 0.74)
  }
  get playerX() {
    return Math.round(this.w / 2 - 14)
  }
  get urnX() {
    return Math.round(this.w / 2 + 24)
  }
  /** Top of the sand in the incense urn. */
  get sandY() {
    return this.footY - 30
  }
  get candleX() {
    return this.playerX - 30
  }
  get flameY() {
    return this.footY - 27
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      if (this.place === 'hall') {
        const { floorY } = drawHallInterior(g, w, h, 0)
        const cx = Math.round(w / 2)
        const baseY = floorY - 58
        drawArch(g, cx, baseY + 10, 44, 92)
        drawBuddha(g, cx, baseY, 1)
        drawAltar(g, cx, baseY, 110)
      } else {
        g.gradientV(0, 0, w, h * 0.5, SKY.day.stops)
        const cx = Math.round(w / 2)
        drawUbosot(g, cx, Math.round(h * 0.52), {})
        g.rect(0, Math.round(h * 0.52), w, h, '#e4ddd6')
        for (let y = Math.round(h * 0.52) + 4, k = 0; y < h; y += 5 + k, k++) g.hline(0, w - 1, y, '#d2c9c3')
        for (let i = -6; i <= 6; i++) g.line(w / 2 + i * 10, Math.round(h * 0.52), w / 2 + i * 30, h, '#d8cfc9')
      }
    })
    return this.bg
  }
  lightNext() {
    if (this.lit >= 3) return
    this.lit++
    this.lightT = 0.35
    const [tx, ty] = this.stickTips()[this.lit - 1] ?? [this.candleX, this.flameY]
    this.particles.sparkles(tx, ty, 8, '#ffb347')
    this.juice.shake(0.08)
  }
  makeOffer(icon: string) {
    this.offer = { icon, t: 0 }
  }
  plant() {
    this.step = 'plant'
    this.plantT = 0
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    this.lightT = Math.max(0, this.lightT - dt)
    for (const [x, y] of this.stickTips().slice(0, this.lit)) incenseSmoke(this.particles, dt, x, y - 1, this.charge > 0 ? 9 : 4)
    if (this.offer) {
      this.offer.t += dt / 0.6
      if (this.offer.t >= 1) {
        this.offered = this.offer.icon
        this.offer = null
        this.particles.sparkles(this.urnX - 1, this.footY - 38, 10)
        sfx.plop()
      }
    }
    if (this.charge > 0 && Math.random() < dt * 24 * this.charge) this.particles.sparkles(this.playerX + rand(-18, 18), this.footY - 30 + rand(-26, 10), 1, '#fff3a6')
    if (this.plantT >= 0) {
      const before = this.plantT
      this.plantT += dt
      if (before < 0.55 && this.plantT >= 0.55) {
        this.particles.add({ kind: 'dot', x: this.urnX, y: this.sandY, vx: -10, vy: -12, g: 60, max: 0.4, color: '#e8d9b8' })
        this.particles.add({ kind: 'dot', x: this.urnX, y: this.sandY, vx: 10, vy: -12, g: 60, max: 0.4, color: '#e8d9b8' })
        tsfx.pat()
        this.juice.shake(0.1)
      }
      if (before < 0.9 && this.plantT >= 0.9) {
        this.step = 'done'
        this.orb = { x: this.urnX, y: this.sandY - 20, t: 0 }
      }
    }
    if (this.orb) {
      this.orb.t += dt
      this.orb.y -= dt * 55
      this.orb.x = this.w / 2 + Math.sin(this.orb.t * 3) * 8 + (this.urnX - this.w / 2) * Math.max(0, 1 - this.orb.t)
      if (Math.random() < dt * 30) this.particles.sparkles(this.orb.x, this.orb.y + 4, 1, '#fff3a6')
      if (this.orb.y < -20) this.orb = null
    }
    motes(this.particles, dt, this.w, this.footY, this.place === 'hall' ? 3 : 1.5, '#fff3a6')
    this.particles.update(dt)
  }

  private pose(): { pose: TPose | 'wai'; flip: boolean } {
    if (this.step === 'plant' && this.plantT < 0.9) return { pose: 'incense_plant', flip: true }
    if (this.step === 'done') return { pose: 'wai', flip: false }
    if (this.step === 'light') return { pose: 'incense_light', flip: false }
    if (this.step === 'offer' && this.offer) return { pose: 'offer_up', flip: false }
    return { pose: 'incense_wai', flip: false }
  }

  private placed: Placed | null = null
  /** Tips of the three incense sticks in the current pose. */
  private stickTips(): [number, number][] {
    const p = this.placed
    if (!p) return []
    const pose = this.pose()
    if (pose.pose === 'incense_light') {
      const [hx, hy] = handAt(p, 1)
      return [0, 1, 2].map((i) => [hx - 9 - i, hy - 5 + i * 1.5])
    }
    if (pose.pose === 'incense_plant' || this.step === 'done') {
      const planted = this.step === 'done' || this.plantT >= 0.55
      const baseX = this.urnX
      const baseY = planted ? this.sandY : this.sandY - 8 + Math.min(1, this.plantT / 0.55) * 8
      return [0, 1, 2].map((i) => [baseX - 2 + i * 2 + (i - 1), baseY - 16 + Math.abs(i - 1)])
    }
    if (pose.pose === 'offer_up') {
      const [hx, hy] = handAt(p, 1)
      return [0, 1, 2].map((i) => [hx - 2 + i * 1.5, hy - 14])
    }
    const [lx, ly] = handAt(p, 1)
    const [rx, ry] = handAt(p, -1)
    const x = (lx + rx) / 2
    const y = (ly + ry) / 2
    return [0, 1, 2].map((i) => [x - 2 + i * 2 + (i - 1), y - 22 + Math.abs(i - 1)])
  }

  private drawSticks(g: Surface, bases: [number, number][]) {
    const tips = this.stickTips()
    tips.forEach(([tx, ty], i) => {
      const [bx, by] = bases[i] ?? bases[0]
      g.line(bx, by, tx, ty, i % 2 ? '#c0392b' : '#a8313f')
      if (i < this.lit) {
        g.px(tx, ty - 1, Math.sin(this.t * 11 + i) > 0 ? '#ffd54f' : '#ff8a3d')
        g.px(tx, ty, '#ff6a3d')
        softGlow(g, tx, ty - 1, 3, 0.9, '#ff9a5a')
      }
    })
  }

  render(g: Surface) {
    const { w, h } = this
    this.juice.begin(g)
    g.draw(this.background(), 0, 0)
    const cx = Math.round(w / 2)
    if (this.place === 'hall') godRays(g, cx, this.footY - 120, h * 0.6, this.t, '#fff3c4', 0.08 + this.charge * 0.12, 10)
    else godRays(g, cx, h * 0.28, h * 0.6, this.t, '#fff8d8', 0.05 + this.charge * 0.1, 8)
    lightPool(g, this.playerX + 12, this.footY, 50, '#ffe7a0', 0.6 + this.charge)
    // Tall candle stand on the left, where you light the incense.
    const csx = this.candleX
    g.ellipse(csx, this.footY - 1, 7, 2, 'rgba(30,14,30,0.3)')
    g.rect(csx - 1, this.flameY + 6, 2, this.footY - this.flameY - 6, P.goldD)
    g.rect(csx - 5, this.footY - 3, 10, 3, P.goldDD)
    g.rect(csx - 4, this.flameY + 5, 8, 2, P.gold)
    drawCandle(g, csx, this.flameY + 5, 5, this.t, true)
    softGlow(g, csx, this.flameY - 2, 10, 0.9)
    // Incense urn on its stand, with candles either side and the flower tray.
    const ux = this.urnX
    const uy = this.footY - 18
    g.ellipse(ux, this.footY - 1, 16, 3, 'rgba(30,14,30,0.3)')
    g.rect(ux - 10, uy + 6, 20, this.footY - uy - 7, '#8e2a3c')
    g.rect(ux - 10, uy + 6, 20, 2, P.gold)
    g.ellipse(ux, uy + 5, 14, 4, '#8a6a2e')
    g.rect(ux - 12, uy - 8, 24, 12, '#c9a04c')
    g.rect(ux - 12, uy - 8, 24, 2, '#e3bf62')
    g.rect(ux - 12, uy - 3, 24, 1, '#9c7a3c')
    g.rect(ux + 7, uy - 8, 3, 12, '#a8803c')
    g.ellipse(ux, uy - 8, 12, 3, '#e8d9b8')
    for (let i = 0; i < 7; i++) g.px(ux - 9 + i * 3, uy - 8 + (i % 2), '#b89a6a')
    // old sticks already planted by other visitors
    for (let i = 0; i < 5; i++) g.vline(ux - 8 + i * 4, uy - 16 + (i % 2) * 3, uy - 9, '#8a3a3a')
    drawCandle(g, ux - 16, uy + 6, 10, this.t, true)
    drawCandle(g, ux + 16, uy + 6, 10, this.t, true)
    softGlow(g, ux - 16, uy - 6, 7, 0.8)
    softGlow(g, ux + 16, uy - 6, 7, 0.8)
    if (this.offered) {
      const ic = iconSprite(ITEM_BY_ID[this.offered]?.icon ?? this.offered)
      g.ellipse(ux, uy + 7, 7, 1.5, P.gold)
      g.draw(ic.canvas, ux - 8, uy - 6 - 3)
    }
    // The player.
    const { pose, flip } = this.pose()
    const pl = drawPlayer(g, this.look, pose, 'back', this.playerX + (flip ? 6 : 0), this.footY, { flip, barefoot: this.place === 'hall', bob: this.lightT > 0.2 ? -1 : 0 })
    this.placed = pl
    // incense in hand / in the urn
    if (this.step !== 'offer' || this.offer) {
      if (pose === 'incense_light') {
        const [hx, hy] = handAt(pl, 1)
        this.drawSticks(g, [[hx, hy], [hx, hy], [hx, hy]])
      } else if (pose === 'offer_up') {
        const [hx, hy] = handAt(pl, 1)
        this.drawSticks(g, [[hx, hy - 1], [hx, hy - 1], [hx, hy - 1]])
      } else if (pose === 'incense_wai') {
        const [lx, ly] = handAt(pl, 1)
        const [rx, ry] = handAt(pl, -1)
        const bx = (lx + rx) / 2
        const by = (ly + ry) / 2
        this.drawSticks(g, [[bx - 1, by], [bx, by], [bx + 1, by]])
      } else {
        const tips = this.stickTips()
        this.drawSticks(
          g,
          tips.map(([x, y]) => [x - (x - this.urnX) * 0.2, Math.max(y + 14, this.step === 'done' || this.plantT >= 0.55 ? this.sandY : y + 14)] as [number, number]),
        )
      }
    } else {
      const [lx, ly] = handAt(pl, 1)
      const [rx, ry] = handAt(pl, -1)
      const bx = (lx + rx) / 2
      const by = (ly + ry) / 2
      this.drawSticks(g, [[bx - 1, by], [bx, by], [bx + 1, by]])
    }
    // offering flying from the hand to the tray
    if (this.offer) {
      const [hx, hy] = handAt(pl, -1)
      const u = this.offer.t
      const x = hx + (this.urnX - hx) * u
      const y = hy - 6 + (uy - 10 - (hy - 6)) * u - Math.sin(u * Math.PI) * 14
      const ic = iconSprite(ITEM_BY_ID[this.offer.icon]?.icon ?? this.offer.icon)
      g.draw(ic.canvas, Math.round(x - 8), Math.round(y - 8))
    }
    if (this.charge > 0) {
      softGlow(g, this.playerX, this.footY - 30, 18 + this.charge * 26, this.charge, '#fff3a6')
      softGlow(g, cx, this.footY - 110, 20 + this.charge * 30, this.charge * 0.8, '#fff3c4')
    }
    if (this.orb) {
      softGlow(g, this.orb.x, this.orb.y, 12, 1, '#fff3a6')
      g.circle(this.orb.x, this.orb.y, 3, '#fffaf0')
      g.px(this.orb.x - 1, this.orb.y - 1, P.goldL)
    }
    this.particles.render(g)
    vignette(g, this.place === 'hall' ? '#1b0a14' : '#1b1026', 0.45)
    this.juice.end(g)
  }
}

export function WishActivity({ req }: { req: ActivityRequest }) {
  const place = (req.params?.place as string) === 'hall' ? 'hall' : 'incense'
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new WishScene(place, look), { targetWidth: 160 })
  const [step, setStep] = useState<'light' | 'offer' | 'wish' | 'pray'>('light')
  const [offer, setOffer] = useState<string | null>(null)
  const [cat, setCat] = useState(CATS[0])
  const [text, setText] = useState('')
  const [charge, setCharge] = useState(0)
  const [result, setResult] = useState<TempleResultData | null>(null)
  const holding = useRef<number | null>(null)
  const [lit, setLit] = useState(0)

  const go = (s: 'light' | 'offer' | 'wish' | 'pray') => {
    setStep(s)
    if (scene.current) scene.current.step = s
  }

  const light = () => {
    const sc = scene.current
    if (!sc || sc.lit >= 3) return
    sc.lightNext()
    tsfx.ignite()
    haptic(8)
    const n = sc.lit
    setLit(n)
    if (n >= 3) {
      praise(stage.current, sc.playerX, sc.footY - 70, 'จุดครบ ๓ ดอก', 'gold')
      setTimeout(() => go('offer'), 600)
    }
  }

  const startHold = () => {
    if (holding.current) return
    const t0 = performance.now()
    holding.current = window.setInterval(() => {
      const c = Math.min(1, (performance.now() - t0) / 2200)
      setCharge(c)
      if (scene.current) scene.current.charge = c
      if (c >= 1) finish()
    }, 50)
  }
  const endHold = () => {
    if (holding.current) clearInterval(holding.current)
    holding.current = null
    if (charge < 1) {
      setCharge(0)
      if (scene.current) scene.current.charge = 0
    }
  }
  const finish = () => {
    if (holding.current) clearInterval(holding.current)
    holding.current = null
    const sc = scene.current
    if (sc) {
      sc.charge = 0
      sc.plant()
    }
    tsfx.shimmer()
    setTimeout(() => {
      sfx.whoosh()
      banner(stage.current, 'สาธุ...', 'gold')
    }, 900)
    setTimeout(() => sfx.chime(), 1300)
    let bonus = 0
    if (offer && useItem(offer)) bonus = ITEM_BY_ID[offer]?.merit ?? 0
    const m = addMerit(8 + bonus, { key: 'wish', free: 3 })
    track('wish')
    recordWish(text, cat, place)
    setTimeout(
      () =>
        setResult({
          title: 'ส่งคำอธิษฐานแล้ว',
          merit: m,
          icon: 'incense',
          pose: 'wai',
          lines: [`ขอพรเรื่อง${cat}${text ? ` · "${text}"` : ''}`, 'ขอให้สมปรารถนาทุกประการ สาธุ'],
        }),
      2600,
    )
  }
  useEffect(() => () => endHold(), [])

  const offerNow = () => {
    const sc = scene.current
    if (offer && sc && count(offer) > 0) {
      sc.makeOffer(offer)
      tsfx.swish(0.9)
      setTimeout(() => go('wish'), 700)
    } else go('wish')
  }

  const stepNo = step === 'light' ? 1 : step === 'offer' ? 2 : step === 'wish' ? 3 : 4
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={place === 'hall' ? 'ขอพรพระประธาน' : 'จุดธูปขอพรหน้าโบสถ์'} onClose={closeActivity} />
      <PraiseLayer />
      {!result && <StatusPill text={['จุดธูป', 'ถวายดอกไม้', 'ตั้งจิต', 'อธิษฐาน'][stepNo - 1]} dots={4} on={stepNo} />}
      {!result && (
        <div class="act-bottom">
          {step === 'light' && (
            <div class="panel act-tip">
              <div class="subtitle">จุดธูป ๓ ดอกที่เทียน บูชาพระรัตนตรัย</div>
              <div class="small muted">จุดแล้ว {lit}/3 ดอก</div>
              <Btn tone="green" block onClick={light} silent>
                <Icon name="incense" size={18} /> จุดธูป
              </Btn>
            </div>
          )}
          {step === 'offer' && (
            <div class="panel act-tip">
              <div class="subtitle">ถวายดอกไม้ (ไม่บังคับ)</div>
              <div class="tray">
                {OFFERINGS.map((id) => {
                  const it = ITEM_BY_ID[id]
                  const n = count(id)
                  return (
                    <button key={id} class={`panel tray-item ${offer === id ? 'selected' : ''}`} disabled={n <= 0} onClick={() => (sfx.tap(), setOffer(offer === id ? null : id))}>
                      <Icon name={it.icon} size={28} />
                      <span>{it.name}</span>
                      <span class="qty num">x{n}</span>
                    </button>
                  )
                })}
              </div>
              <Btn tone="green" block onClick={offerNow}>
                {offer ? `ถวาย${ITEM_BY_ID[offer].name}` : 'ข้ามไปก่อน'}
              </Btn>
            </div>
          )}
          {step === 'wish' && (
            <div class="panel act-tip">
              <div class="subtitle">อยากขอพรเรื่องอะไร</div>
              <div class="row wrap" style={{ justifyContent: 'center' }}>
                {CATS.map((c) => (
                  <button key={c} class={`tab ${cat === c ? 'active' : ''}`} onClick={() => (sfx.tap(), setCat(c))}>
                    {c}
                  </button>
                ))}
              </div>
              <input
                id="wish-text"
                class="text-input"
                maxLength={80}
                placeholder="พิมพ์คำอธิษฐาน (เก็บไว้ในเครื่องคุณเท่านั้น)"
                value={text}
                onInput={(e) => setText((e.target as HTMLInputElement).value)}
              />
              <Btn tone="green" block onClick={() => go('pray')}>
                ตั้งจิตอธิษฐาน
              </Btn>
            </div>
          )}
          {step === 'pray' && (
            <div class="panel act-tip">
              <div class="subtitle">ยกธูปพนมมือ ตั้งจิตให้มั่น</div>
              <div class="small muted">กดค้างไว้จนแสงเต็ม แล้วปักธูปลงกระถาง</div>
              <button
                class="btn big green block hold-btn"
                style={{ ['--charge' as string]: `${charge * 100}%` }}
                onPointerDown={startHold}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onPointerCancel={endHold}
              >
                <Icon name="wai" size={22} />
                <span>อธิษฐาน</span>
              </button>
            </div>
          )}
        </div>
      )}
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}
