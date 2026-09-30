// ไหว้เทพ – set the deity's favourite offerings on the table, light the
// candles and incense, raise the incense in a wai and hold your prayer until
// the deity glows and the blessing bursts over you.

import { useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import type { AvatarLook } from '../art/avatar'
import { drawDeity, deityAura } from '../art/deities'
import { iconSprite } from '../art/icons'
import { P } from '../art/palette'
import { drawCandle } from '../art/interior'
import { drawPlayer, godRays, handAt, incenseSmoke, Juice, lightPool, motes, softGlow, vignette, type Placed, type TPose } from '../art/minigames/temple'
import { tsfx } from '../art/minigames/sfx'
import type { Stars } from '../art/minigames/rules'
import { game, mutate } from '../game/state'
import { addBuff, addMerit, count, track, useItem } from '../game/actions'
import { DEITY_BY_ID, type Deity } from '../game/data/deities'
import { ITEMS, ITEM_BY_ID } from '../game/data/items'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Icon } from '../ui/components/common'
import { toast } from '../game/events'
import { sfx, haptic } from '../engine/audio'
import { PraiseLayer, StatusPill, TempleResult, banner, praise, type TempleResultData } from './temple-ui'

const OFFER_IDS = ITEMS.filter((i) => i.category === 'offering' && i.id !== 'gold_leaf').map((i) => i.id).concat(['lotus', 'dessert', 'egg'])

type Phase = 'offer' | 'light' | 'pray' | 'bless'

class ShrineScene implements Scene {
  w = 160
  h = 320
  t = 0
  offerings: string[] = []
  lit = false
  phase: Phase = 'offer'
  charge = 0
  blessT = -1
  flying: { id: string; t: number }[] = []
  lightT = 0
  particles = new Particles()
  juice = new Juice()
  private placed: Placed | null = null
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
    return Math.round(this.h * 0.48)
  }
  get tableY() {
    return Math.round(this.h * 0.6)
  }
  get footY() {
    return Math.round(this.h * 0.74)
  }
  get playerX() {
    return Math.round(this.w / 2 - 30)
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const cx = Math.round(w / 2)
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h, ['#4a1826', '#7e2436', '#8e2a3c'])
      for (let y = 6; y < h * 0.6; y += 10) for (let x = ((y / 10) % 2) * 5; x < w; x += 10) g.px(x, y, '#a8453c')
      // Shrine arch with a scalloped gold frame.
      const top = 30
      g.rect(cx - 50, top, 100, 6, P.gold)
      for (let x = cx - 48; x < cx + 48; x += 6) g.circle(x + 3, top + 7, 2.5, P.goldD)
      g.rect(cx - 50, top, 6, this.deityBase + 10 - top, P.gold)
      g.rect(cx + 44, top, 6, this.deityBase + 10 - top, P.gold)
      g.rect(cx - 50, top, 2, this.deityBase + 10 - top, P.goldL)
      g.rect(cx - 44, top + 6, 88, this.deityBase - top - 4, '#5e1a2c')
      g.poly([[cx - 56, top + 1], [cx, top - 22], [cx + 56, top + 1]], '#c0392b')
      g.poly([[cx - 46, top - 2], [cx, top - 18], [cx + 46, top - 2]], P.orange)
      g.line(cx - 56, top + 1, cx, top - 22, P.gold)
      g.line(cx, top - 22, cx + 56, top + 1, P.gold)
      // Hanging marigold garlands down the pillars.
      for (const x of [cx - 47, cx + 47])
        for (let y = top + 8; y < this.deityBase; y += 3) g.circle(x, y, 1.6, (y / 3) % 2 ? P.orange : P.yellow)
      // Altar.
      const ay = this.deityBase
      g.rect(cx - 46, ay, 92, 8, P.redD)
      g.rect(cx - 46, ay, 92, 2, P.gold)
      g.rect(cx - 40, ay + 8, 80, 22, '#6e1f30')
      for (let x = cx - 38; x < cx + 38; x += 6) g.px(x, ay + 18, P.gold)
      // Floor tiles.
      const fy = Math.round(h * 0.64)
      g.rect(0, fy, w, h - fy, '#9a6a45')
      for (let y = fy + 4, k = 0; y < h; y += 5 + k, k++) g.hline(0, w - 1, y, '#8a5c3b')
      for (let i = -6; i <= 6; i++) g.line(cx + i * 10, fy, cx + i * 30, h, '#8a5c3b')
      // Red lanterns.
      for (const x of [14, w - 14]) {
        g.vline(x, 0, 16, '#3a2838')
        g.ellipse(x, 24, 7, 8, '#c0392b')
        g.ellipse(x - 2, 22, 2, 4, '#ff6a5a')
        g.rect(x - 4, 15, 8, 2, P.gold)
        g.rect(x - 4, 31, 8, 2, P.gold)
        g.vline(x, 33, 38, P.gold)
      }
    })
    return this.bg
  }
  /** Drop an offering from the player's hand onto the table. */
  place(id: string) {
    this.flying.push({ id, t: 0 })
    tsfx.swish(1)
  }
  bless() {
    this.blessT = 0
    this.phase = 'bless'
    this.particles.confetti(this.w / 2, this.deityBase - 40, 40, ['#fff3a6', deityAura(this.deity.id), '#ffffff'])
    this.juice.shake(0.35)
    this.juice.flash(deityAura(this.deity.id), 0.3)
  }
  private slotX(i: number) {
    const cx = Math.round(this.w / 2)
    return cx - 40 + i * 16 + (i >= 2 ? 34 : 0)
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    this.lightT = Math.max(0, this.lightT - dt)
    const cx = this.w / 2
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i]
      f.t += dt / 0.55
      if (f.t >= 1) {
        this.flying.splice(i, 1)
        const k = this.offerings.indexOf(f.id)
        this.particles.sparkles(this.slotX(Math.max(0, k)) + 8, this.tableY - 6, 8, deityAura(this.deity.id))
        sfx.plop()
      }
    }
    if (this.lit) {
      incenseSmoke(this.particles, dt, cx, this.tableY - 22, 5)
      for (const [x, y] of this.heldTips()) incenseSmoke(this.particles, dt, x, y - 1, 3)
    }
    if (this.charge > 0 && Math.random() < dt * 25 * this.charge) this.particles.sparkles(cx + rand(-30, 30), this.deityBase - rand(10, 70), 1, '#fff3a6')
    if (this.blessT >= 0) {
      this.blessT += dt
      if (Math.random() < dt * 20) this.particles.sparkles(cx + rand(-40, 40), this.deityBase - rand(0, 90), 1, deityAura(this.deity.id))
      if (this.blessT < 1.2 && Math.random() < dt * 12)
        this.particles.add({ kind: 'sparkle', x: this.playerX + rand(-10, 10), y: this.footY - rand(10, 50), vy: -20, max: 0.8, color: deityAura(this.deity.id) })
    }
    motes(this.particles, dt, this.w, this.footY, 2, '#ffe0a0')
    this.particles.update(dt)
  }
  private pose(): { pose: TPose | 'happy' | 'stand'; view: 'front' | 'back'; flip: boolean } {
    if (this.phase === 'bless') return { pose: this.blessT > 0.5 ? 'happy' : 'incense_wai', view: this.blessT > 0.5 ? 'front' : 'back', flip: false }
    if (this.flying.length) return { pose: 'offer_up', view: 'back', flip: false }
    if (this.phase === 'light' || this.lightT > 0) return { pose: 'incense_light', view: 'back', flip: true }
    if (this.phase === 'pray') return { pose: 'incense_wai', view: 'back', flip: false }
    return { pose: 'stand', view: 'back', flip: false }
  }
  /** Tips of the incense in the player's hands (when holding them). */
  private heldTips(): [number, number][] {
    const p = this.placed
    if (!p || !this.lit || p.pose !== 'incense_wai' || p.view !== 'back') return []
    const [lx, ly] = handAt(p, 1)
    const [rx, ry] = handAt(p, -1)
    const x = (lx + rx) / 2
    const y = (ly + ry) / 2
    return [0, 1, 2].map((i) => [x - 2 + i * 2 + (i - 1), y - 22 + Math.abs(i - 1)])
  }
  render(g: Surface) {
    const { w, h } = this
    this.juice.begin(g)
    g.draw(this.background(), 0, 0)
    const cx = Math.round(w / 2)
    const aura = deityAura(this.deity.id)
    const glow = 0.4 + this.charge * 0.6 + (this.blessT >= 0 ? 0.6 : 0)
    godRays(g, cx, this.deityBase - 40, h * 0.55, this.t, aura, 0.05 + this.charge * 0.1 + (this.blessT >= 0 ? 0.1 : 0), 12)
    softGlow(g, cx, this.deityBase - 40, 48, glow, aura)
    drawDeity(g, this.deity.id, cx, this.deityBase, 2, this.t)
    // Offering table.
    const ty = this.tableY
    g.rect(cx - 44, ty, 88, 5, '#c28e5c')
    g.rect(cx - 44, ty, 88, 1, '#e0bb8a')
    g.rect(cx - 40, ty + 5, 4, 20, '#9a6a45')
    g.rect(cx + 36, ty + 5, 4, 20, '#9a6a45')
    g.rect(cx - 44, ty + 5, 88, 2, '#8e2a3c')
    this.offerings.forEach((id, i) => {
      if (this.flying.some((f) => f.id === id)) return
      const it = ITEM_BY_ID[id]
      const ic = iconSprite(it?.icon ?? 'gift')
      const x = this.slotX(i)
      g.ellipse(x + 8, ty, 8, 2, P.gold)
      g.draw(ic.canvas, x, ty - 15)
      if (this.deity.favorites.includes(id)) {
        const b = Math.sin(this.t * 4 + i) > 0 ? 1 : 0
        g.px(x + 13, ty - 17 - b, '#ff6f91')
        g.px(x + 15, ty - 17 - b, '#ff6f91')
        g.rect(x + 13, ty - 16 - b, 3, 1, '#ff6f91')
        g.px(x + 14, ty - 15 - b, '#ff6f91')
      }
    })
    // Candles and the incense holder.
    drawCandle(g, cx - 12, ty, 12, this.t, this.lit)
    drawCandle(g, cx + 12, ty, 12, this.t, this.lit)
    g.rect(cx - 5, ty - 6, 10, 6, P.goldD)
    g.rect(cx - 5, ty - 6, 10, 1, P.gold)
    for (let i = -1; i <= 1; i++) {
      g.vline(cx + i * 2, ty - 22, ty - 7, '#c0392b')
      if (this.lit) g.px(cx + i * 2, ty - 23, Math.sin(this.t * 9 + i) > 0 ? '#ffd54f' : '#ff8a3d')
    }
    if (this.lit) {
      softGlow(g, cx - 12, ty - 14, 8, 0.8)
      softGlow(g, cx + 12, ty - 14, 8, 0.8)
    }
    lightPool(g, this.playerX, this.footY, 40, aura, 0.5 + this.charge)
    // The worshipper.
    const { pose, view, flip } = this.pose()
    if (this.blessT >= 0) softGlow(g, this.playerX, this.footY - 26, 22, Math.max(0, 1 - this.blessT * 0.3), aura)
    const pl = drawPlayer(g, this.look, pose, view, this.playerX, this.footY, { flip, t: this.t, bob: this.lightT > 0.2 ? -1 : 0 })
    this.placed = pl
    // Held things.
    if (pose === 'offer_up' && this.flying.length) {
      // the offering leaves the hand and arcs onto the table
      const f = this.flying[0]
      const [hx, hy] = handAt(pl, -1)
      const k = Math.max(0, this.offerings.indexOf(f.id))
      const tx = this.slotX(k) + 8
      const tyy = ty - 8
      const u = f.t
      const x = hx + (tx - hx) * u
      const y = hy - 6 + (tyy - (hy - 6)) * u - Math.sin(u * Math.PI) * 14
      g.draw(iconSprite(ITEM_BY_ID[f.id]?.icon ?? 'gift').canvas, Math.round(x - 8), Math.round(y - 8))
    } else if (pose === 'incense_light') {
      const [hx, hy] = handAt(pl, 1)
      for (let i = 0; i < 3; i++) {
        const tx = hx + 8 + i
        const tyy = hy - 6 + i
        g.line(hx, hy, tx, tyy, '#c0392b')
        if (this.lit) g.px(tx, tyy - 1, '#ffd54f')
      }
    } else if (pose === 'incense_wai' && view === 'back') {
      const [lx, ly] = handAt(pl, 1)
      const [rx, ry] = handAt(pl, -1)
      const bx = (lx + rx) / 2
      const by = (ly + ry) / 2
      this.heldTips().forEach(([x, y], i) => {
        g.line(bx - 1 + i, by, x, y, i % 2 ? '#c0392b' : '#a8313f')
        g.px(x, y - 1, Math.sin(this.t * 11 + i) > 0 ? '#ffd54f' : '#ff8a3d')
        softGlow(g, x, y - 1, 3, 0.9, '#ff9a5a')
      })
    }
    if (this.charge > 0) softGlow(g, this.playerX, this.footY - 30, 16 + this.charge * 24, this.charge, aura)
    this.particles.render(g)
    vignette(g, '#1b0a14', 0.5)
    this.juice.end(g)
  }
}

export function DeityActivity({ req }: { req: ActivityRequest }) {
  const deity = DEITY_BY_ID[(req.params?.deity as string) ?? 'ganesha'] ?? DEITY_BY_ID.ganesha
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new ShrineScene(deity, look), { targetWidth: 160 })
  const [step, setStep] = useState<'offer' | 'light' | 'pray'>('offer')
  const [chosen, setChosen] = useState<string[]>([])
  const [charge, setCharge] = useState(0)
  const [result, setResult] = useState<TempleResultData | null>(null)
  const [buy, setBuy] = useState(false)
  const timer = useRef<number | null>(null)
  const visitedToday = (game.value.daily.counts[`deity:${deity.id}`] ?? 0) > 0

  const go = (s: 'offer' | 'light' | 'pray') => {
    setStep(s)
    if (scene.current) scene.current.phase = s
  }

  const toggle = (id: string) => {
    if (deity.avoid?.includes(id)) {
      toast(`${deity.name}ไม่รับของคาว ลองถวายผลไม้หรือดอกไม้นะ`, 'lotus', 'warn')
      return
    }
    const sc = scene.current
    let next = chosen
    if (chosen.includes(id)) next = chosen.filter((c) => c !== id)
    else if (chosen.length < 3) next = [...chosen, id]
    setChosen(next)
    sfx.tap()
    if (sc) {
      sc.offerings = next
      if (next.includes(id) && !chosen.includes(id)) {
        sc.place(id)
        if (deity.favorites.includes(id)) setTimeout(() => praise(stage.current, sc.w / 2, sc.tableY - 30, 'ของโปรด!', 'pink'), 500)
      }
    }
  }

  const start = () => {
    if (timer.current) return
    const t0 = performance.now()
    timer.current = window.setInterval(() => {
      const c = Math.min(1, (performance.now() - t0) / 2500)
      setCharge(c)
      if (scene.current) {
        scene.current.charge = c
        if (Math.random() < 0.08) scene.current.juice.shake(0.03 * c)
      }
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
    for (const id of chosen) {
      if (!useItem(id)) continue
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
    banner(stage.current, visitedToday ? 'สาธุ!' : 'ได้รับพรแล้ว!', 'gold')
    const stars = Math.min(3, 1 + favs) as Stars
    setTimeout(() => setResult({ title: `ไหว้${deity.name}แล้ว`, merit: m, icon: 'deity', stars, pose: 'wai', lines }), 2000)
  }

  const stepNo = step === 'offer' ? 1 : step === 'light' ? 2 : 3
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={`${deity.name} · ${deity.title}`} onClose={closeActivity} />
      <PraiseLayer />
      {!result && <StatusPill text={['ถวายของ', 'จุดธูปเทียน', 'อธิษฐาน'][stepNo - 1]} dots={3} on={stepNo} />}
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
                  <Btn tone="green" class="grow" onClick={() => go('light')}>
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
                  silent
                  onClick={() => {
                    const sc = scene.current
                    if (sc) {
                      sc.lit = true
                      sc.lightT = 0.4
                      sc.particles.sparkles(sc.w / 2 - 12, sc.tableY - 14, 8, '#ffb347')
                      sc.particles.sparkles(sc.w / 2 + 12, sc.tableY - 14, 8, '#ffb347')
                    }
                    tsfx.ignite()
                    setTimeout(() => go('pray'), 700)
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
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}
