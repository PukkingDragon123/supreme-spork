// ไหว้เทพ – choose offerings the deity loves, light incense and pray to
// receive a timed blessing.

import { useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { avatarSprite, type AvatarLook } from '../art/avatar'
import { drawDeity, deityAura } from '../art/deities'
import { iconSprite } from '../art/icons'
import { P } from '../art/palette'
import { drawCandle } from '../art/interior'
import { game, mutate } from '../game/state'
import { addBuff, addMerit, count, track, useItem } from '../game/actions'
import { DEITY_BY_ID, type Deity } from '../game/data/deities'
import { ITEMS, ITEM_BY_ID } from '../game/data/items'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Icon } from '../ui/components/common'
import { toast } from '../game/events'
import { sfx, haptic } from '../engine/audio'
import { drawGlow } from '../scenes/sky'

const OFFER_IDS = ITEMS.filter((i) => i.category === 'offering' && i.id !== 'gold_leaf').map((i) => i.id).concat(['lotus', 'dessert', 'egg'])

class ShrineScene implements Scene {
  w = 160
  h = 320
  t = 0
  offerings: string[] = []
  lit = false
  charge = 0
  blessT = -1
  particles = new Particles()
  private bg: HTMLCanvasElement | null = null
  constructor(
    public deity: Deity,
    public look: AvatarLook,
  ) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get deityBase() {
    return Math.round(this.h * 0.5)
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const cx = Math.round(w / 2)
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h, ['#4a1826', '#7e2436', '#8e2a3c'])
      for (let y = 6; y < h * 0.6; y += 10)
        for (let x = ((y / 10) % 2) * 5; x < w; x += 10) g.px(x, y, '#a8453c')
      // Shrine arch.
      g.rect(cx - 50, 20, 100, 6, P.gold)
      g.rect(cx - 50, 20, 6, this.deityBase + 10 - 20, P.gold)
      g.rect(cx + 44, 20, 6, this.deityBase + 10 - 20, P.gold)
      g.rect(cx - 44, 26, 88, this.deityBase - 16, '#5e1a2c')
      // Altar.
      const ay = this.deityBase
      g.rect(cx - 46, ay, 92, 8, P.redD)
      g.rect(cx - 46, ay, 92, 2, P.gold)
      g.rect(cx - 40, ay + 8, 80, 30, '#6e1f30')
      for (let x = cx - 38; x < cx + 38; x += 6) g.px(x, ay + 20, P.gold)
      // Offering table.
      const ty = Math.round(h * 0.66)
      g.rect(cx - 44, ty, 88, 5, '#c28e5c')
      g.rect(cx - 44, ty, 88, 1, '#e0bb8a')
      g.rect(cx - 40, ty + 5, 4, 20, '#9a6a45')
      g.rect(cx + 36, ty + 5, 4, 20, '#9a6a45')
      g.rect(0, Math.round(h * 0.78), w, h, '#9a6a45')
      for (let y = Math.round(h * 0.78) + 4; y < h; y += 6) g.hline(0, w - 1, y, '#8a5c3b')
    })
    return this.bg
  }
  bless() {
    this.blessT = 0
    this.particles.confetti(this.w / 2, this.deityBase - 40, 30, ['#fff3a6', deityAura(this.deity.id), '#ffffff'])
  }
  update(dt: number) {
    this.t += dt
    if (this.lit && Math.random() < dt * 6)
      this.particles.add({ kind: 'smoke', x: this.w / 2 + rand(-4, 4), y: this.h * 0.66 - 22, vx: rand(-1, 1), vy: rand(-10, -6), max: rand(1.8, 2.8), color: '#f3eefa' })
    if (this.charge > 0 && Math.random() < dt * 25 * this.charge) this.particles.sparkles(this.w / 2 + rand(-30, 30), this.deityBase - rand(10, 70), 1, '#fff3a6')
    if (this.blessT >= 0) {
      this.blessT += dt
      if (Math.random() < dt * 20) this.particles.sparkles(this.w / 2 + rand(-40, 40), this.deityBase - rand(0, 90), 1, deityAura(this.deity.id))
    }
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    g.draw(this.background(), 0, 0)
    const cx = Math.round(w / 2)
    const glow = 0.4 + this.charge * 0.6 + (this.blessT >= 0 ? 0.6 : 0)
    drawGlow(g, cx, this.deityBase - 40, 48, glow, deityAura(this.deity.id))
    drawDeity(g, this.deity.id, cx, this.deityBase, 2, this.t)
    // Offerings on the table.
    const ty = Math.round(h * 0.66)
    this.offerings.forEach((id, i) => {
      const it = ITEM_BY_ID[id]
      const ic = iconSprite(it?.icon ?? 'gift')
      const x = cx - 40 + i * 16 + (i >= 2 ? 34 : 0)
      g.ellipse(x + 8, ty, 8, 2, P.gold)
      g.draw(ic.canvas, x, ty - 15)
    })
    // Candles and incense holder.
    drawCandle(g, cx - 12, ty, 12, this.t, this.lit)
    drawCandle(g, cx + 12, ty, 12, this.t, this.lit)
    g.rect(cx - 5, ty - 6, 10, 6, P.goldD)
    g.rect(cx - 5, ty - 6, 10, 1, P.gold)
    for (let i = -1; i <= 1; i++) {
      g.vline(cx + i * 2, ty - 22, ty - 7, '#c0392b')
      if (this.lit) g.px(cx + i * 2, ty - 23, Math.sin(this.t * 9 + i) > 0 ? '#ffd54f' : '#ff8a3d')
    }
    if (this.lit) {
      drawGlow(g, cx - 12, ty - 14, 8, 0.8)
      drawGlow(g, cx + 12, ty - 14, 8, 0.8)
    }
    // The worshipper.
    const s = avatarSprite(this.look, 'back', this.charge > 0 || this.blessT >= 0 ? 'wai' : 'stand')
    g.drawScaled(s.canvas, Math.round(cx - s.w), Math.round(h - 8 - s.h * 2), 2)
    this.particles.render(g)
  }
}

export function DeityActivity({ req }: { req: ActivityRequest }) {
  const deity = DEITY_BY_ID[(req.params?.deity as string) ?? 'ganesha'] ?? DEITY_BY_ID.ganesha
  const look = game.value.player.look
  const { host, scene } = useStage(() => new ShrineScene(deity, look), { targetWidth: 160 })
  const [step, setStep] = useState<'offer' | 'light' | 'pray'>('offer')
  const [chosen, setChosen] = useState<string[]>([])
  const [charge, setCharge] = useState(0)
  const [result, setResult] = useState<ResultData | null>(null)
  const [buy, setBuy] = useState(false)
  const timer = useRef<number | null>(null)
  const visitedToday = (game.value.daily.counts[`deity:${deity.id}`] ?? 0) > 0

  const toggle = (id: string) => {
    if (deity.avoid?.includes(id)) {
      toast(`${deity.name}ไม่รับของคาว ลองถวายผลไม้หรือดอกไม้นะ`, 'lotus', 'warn')
      return
    }
    if (chosen.includes(id)) setChosen(chosen.filter((c) => c !== id))
    else if (chosen.length < 3) setChosen([...chosen, id])
    sfx.tap()
    if (scene.current) scene.current.offerings = chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id].slice(0, 3)
  }

  const start = () => {
    if (timer.current) return
    const t0 = performance.now()
    timer.current = window.setInterval(() => {
      const c = Math.min(1, (performance.now() - t0) / 2500)
      setCharge(c)
      if (scene.current) scene.current.charge = c
      if (c >= 1) finish()
    }, 50)
  }
  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    if (charge < 1) {
      setCharge(0)
      if (scene.current) scene.current.charge = 0
    }
  }
  const finish = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    const sc = scene.current
    let favs = 0
    let others = 0
    const used: string[] = []
    for (const id of chosen) {
      if (!useItem(id)) continue
      used.push(id)
      if (deity.favorites.includes(id)) favs++
      else others++
    }
    const base = 10 + favs * 6 + others * 2
    const m = addMerit(base, { key: `deity:${deity.id}`, free: 1, area: deity.area })
    track('deity')
    const lines: string[] = []
    if (!visitedToday) {
      const b = deity.blessing
      if (b.kind === 'lucky') {
        mutate((d) => {
          d.daily.lotteryExtra += 1
        })
      } else addBuff(b.kind === 'animal' ? 'animal' : b.kind, b.mult, b.minutes, `deity:${deity.id}`)
      lines.push(`ได้รับพร: ${b.text}`)
    } else lines.push('วันนี้รับพรแล้ว บุญที่ได้จะลดลงเมื่อไหว้ซ้ำ')
    if (favs > 0) lines.push(`ถวายของโปรด ${favs} อย่าง ท่านพอใจมาก!`)
    if (sc) {
      sc.charge = 0
      sc.bless()
    }
    sfx.levelUp()
    haptic(40)
    setTimeout(() => setResult({ title: `ไหว้${deity.name}แล้ว`, merit: m, icon: 'deity', lines }), 1600)
    void used
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={`${deity.name} · ${deity.title}`} onClose={closeActivity} />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {step === 'offer' && (
              <>
                <div class="subtitle">เลือกของถวาย (สูงสุด 3 อย่าง)</div>
                <div class="small muted">♥ = ของโปรดของ{deity.name} ได้บุญเพิ่ม</div>
                <div class="tray">
                  {OFFER_IDS.map((id) => {
                    const it = ITEM_BY_ID[id]
                    if (!it) return null
                    const n = count(id)
                    const fav = deity.favorites.includes(id)
                    return (
                      <button key={id} class={`panel tray-item ${fav ? 'fav' : ''} ${chosen.includes(id) ? 'selected' : ''}`} disabled={n <= 0} onClick={() => toggle(id)}>
                        <Icon name={it.icon} size={28} />
                        <span>{it.name}</span>
                        <span class="qty num">x{n}</span>
                      </button>
                    )
                  })}
                </div>
                <div class="row">
                  <Btn tone="paper" class="grow" onClick={() => setBuy(true)}>
                    ซื้อของถวาย
                  </Btn>
                  <Btn tone="green" class="grow" onClick={() => setStep('light')}>
                    {chosen.length ? 'ถวายของ' : 'ไหว้เลย'}
                  </Btn>
                </div>
              </>
            )}
            {step === 'light' && (
              <>
                <div class="subtitle">จุดเทียนและธูปบูชา</div>
                <div class="small muted">{deity.about}</div>
                <Btn
                  tone="green"
                  block
                  onClick={() => {
                    if (scene.current) scene.current.lit = true
                    sfx.candle()
                    setStep('pray')
                  }}
                >
                  <Icon name="incense" size={18} /> จุดธูปเทียน
                </Btn>
              </>
            )}
            {step === 'pray' && (
              <>
                {deity.mantra ? (
                  <div class="mantra">
                    <div class="small muted">คาถาบูชา</div>
                    {deity.mantra}
                  </div>
                ) : (
                  <div class="small muted">ตั้งนะโม ๓ จบ แล้วตั้งจิตอธิษฐานขอพร</div>
                )}
                <button
                  class="btn big green block hold-btn"
                  style={{ ['--charge' as string]: `${charge * 100}%` }}
                  onPointerDown={start}
                  onPointerUp={stop}
                  onPointerLeave={stop}
                  onPointerCancel={stop}
                >
                  <Icon name="wai" size={22} />
                  <span>กดค้างเพื่ออธิษฐาน</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {buy && <QuickBuy ids={deity.favorites.filter((f) => ITEM_BY_ID[f])} title={`ของโปรด${deity.name}`} onClose={() => setBuy(false)} />}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}
