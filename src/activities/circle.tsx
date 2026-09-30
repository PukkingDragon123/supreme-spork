// เวียนเทียน – walk three times clockwise around the golden chedi holding a
// candle, incense and a lotus, keeping the chedi on your right. Go gently:
// rushing blows your candle out.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import type { AvatarLook } from '../art/avatar'
import { drawChedi } from '../art/buildings'
import { P } from '../art/palette'
import { drawHeldCandle, drawLotusBud, drawPlayer, godRays, handAt, Juice, softGlow, vignette, type Placed } from '../art/minigames/temple'
import { tsfx } from '../art/minigames/sfx'
import type { Stars } from '../art/minigames/rules'
import { game } from '../game/state'
import { addMerit, track } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { sfx, haptic } from '../engine/audio'
import { drawGlow, drawSky } from '../scenes/sky'
import { PraiseLayer, StatusPill, TempleResult, banner, type TempleResultData } from './temple-ui'

const ROUNDS = 3
/** Walking faster than this (radians per second) makes the flame gutter. */
const GENTLE = 5

const ROUND_WORDS = ['ระลึกถึงพระพุทธคุณ', 'ระลึกถึงพระธรรมคุณ', 'ระลึกถึงพระสังฆคุณ']

class CircleScene implements Scene {
  w = 160
  h = 320
  t = 0
  angle = Math.PI / 2
  progress = 0
  walking = 0
  /** Candle flame strength 0..1; 0 = blown out. */
  flame = 1
  outT = 0
  outs = 0
  speed = 0
  done = false
  doneT = 0
  particles = new Particles()
  juice = new Juice()
  npcs: { a: number; look: AvatarLook; speed: number }[] = []
  onRound?: (n: number) => void
  onOut?: () => void
  private lastPointer: number | null = null
  private bg: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {
    const others: AvatarLook[] = [
      { gender: 'f', face: 1, skin: 2, hairColor: 0, hair: 'hair_long', top: 'top_white', bottom: 'bot_sarong', shoes: null, head: null, neck: null, hand: null, back: null },
      { gender: 'm', face: 0, skin: 0, hairColor: 1, hair: 'hair_short', top: 'top_white', bottom: 'bot_khaki', shoes: null, head: null, neck: null, hand: null, back: null },
      { gender: 'f', face: 2, skin: 3, hairColor: 0, hair: 'hair_bun', top: 'top_lace', bottom: 'bot_skirt', shoes: null, head: null, neck: null, hand: null, back: null },
    ]
    this.npcs = others.map((l, i) => ({ a: Math.PI / 2 + (i + 1) * 1.6, look: l, speed: 0.12 + i * 0.02 }))
  }
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get cx() {
    return this.w / 2
  }
  get cy() {
    return this.h * 0.57
  }
  get rx() {
    return this.w * 0.4
  }
  get ry() {
    return this.h * 0.12
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      // distant hills and temple roofs in the night
      for (let x = 0; x < w; x++) g.vline(x, Math.round(h * 0.33 - Math.sin(x * 0.05) * 5 - Math.sin(x * 0.13) * 2), Math.round(h * 0.36), '#262a5c')
      g.rect(0, h * 0.34, w, h, '#3a3450')
      // Stone terrace and walkway ring.
      g.ellipse(this.cx, this.cy, this.rx + 18, this.ry + 9, '#4e4659')
      g.ellipse(this.cx, this.cy, this.rx + 10, this.ry + 5, '#8c8187')
      g.ellipse(this.cx, this.cy - 1, this.rx + 8, this.ry + 4, '#9d9298')
      g.ellipse(this.cx, this.cy, this.rx - 8, this.ry - 4, '#5e5561')
      g.ellipse(this.cx, this.cy, this.rx - 10, this.ry - 5, '#6d6478')
      // Candles along the walkway.
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        const x = this.cx + Math.cos(a) * (this.rx + 13)
        const y = this.cy + Math.sin(a) * (this.ry + 7)
        g.rect(x, y - 3, 1, 3, '#fff3d6')
      }
    })
    return this.bg
  }
  pointer(e: PointerInfo) {
    if (e.type === 'up' || e.type === 'cancel') {
      this.lastPointer = null
      return
    }
    const a = Math.atan2((e.y - this.cy) / this.ry, (e.x - this.cx) / this.rx)
    if (this.lastPointer !== null) {
      let d = a - this.lastPointer
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      // Clockwise on screen means the angle increases (y points down).
      if (d > 0) this.advance(Math.min(d, 0.25))
    }
    this.lastPointer = a
  }
  advance(d: number) {
    if (this.done || this.outT > 0) return
    const before = Math.floor(this.progress / (Math.PI * 2))
    this.progress += d
    this.angle += d
    this.speed += d
    this.walking = 0.3
    const after = Math.floor(this.progress / (Math.PI * 2))
    if (after > before && after <= ROUNDS) this.onRound?.(after)
  }
  finish() {
    this.done = true
    this.doneT = 0
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    this.walking = Math.max(0, this.walking - dt)
    if (this.done) this.doneT += dt
    // Angular speed from recent movement, and its effect on the flame.
    const v = dt > 0 ? this.speed / dt : 0
    this.speed = 0
    if (this.outT > 0) {
      this.outT -= dt
      if (this.outT <= 0) {
        this.flame = 0.6
        tsfx.ignite()
        this.particles.sparkles(this.handPos()[0], this.handPos()[1] - 6, 8, '#ffb347')
      }
    } else if (v > GENTLE) {
      this.flame -= (v - GENTLE) * dt * 0.09
      if (Math.random() < dt * 20) this.particles.add({ kind: 'smoke', x: this.handPos()[0], y: this.handPos()[1] - 9, vx: rand(-6, 6), vy: rand(-10, -4), max: 0.6, color: '#c9cff0' })
      if (this.flame <= 0) {
        this.flame = 0
        this.outT = 1.3
        this.outs++
        sfx.candle()
        this.juice.shake(0.12)
        this.onOut?.()
      }
    } else this.flame = Math.min(1, this.flame + dt * 0.35)
    for (const n of this.npcs) n.a += n.speed * dt
    for (let i = 0; i < 2; i++)
      if (Math.random() < dt * 3) {
        const a = rand(0, Math.PI * 2)
        this.particles.add({ kind: 'firefly', x: this.cx + Math.cos(a) * rand(0, this.rx), y: this.cy - rand(20, 120), vx: rand(-3, 3), vy: rand(-5, -1), max: rand(2, 4), color: '#fff3a6' })
      }
    this.particles.update(dt)
  }
  private placed: Placed | null = null
  private handPos(): [number, number] {
    const p = this.placed
    if (!p) return [this.cx, this.cy]
    const [lx, ly] = handAt(p, 1)
    const [rx, ry] = handAt(p, -1)
    return [(lx + rx) / 2, (ly + ry) / 2]
  }
  render(g: Surface) {
    const { w, h } = this
    this.juice.begin(g)
    drawSky(g, 0, 0, w, Math.round(h * 0.36), 'night', this.t)
    g.draw(this.background(), 0, 0)
    godRays(g, this.cx, this.cy - 70, h * 0.5, this.t, '#ffe7a0', 0.05 + (this.done ? 0.08 : 0), 10)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const x = this.cx + Math.cos(a) * (this.rx + 13)
      const y = this.cy + Math.sin(a) * (this.ry + 7)
      g.px(x, y - 4, Math.sin(this.t * 9 + i) > 0 ? '#ffd54f' : '#fff3a6')
      softGlow(g, x, y - 4, 7, 0.8)
    }
    // Chevrons ahead of the player showing the way (clockwise).
    if (!this.done && this.walking <= 0) {
      for (let k = 1; k <= 3; k++) {
        const a = this.angle + k * 0.28 + ((this.t * 0.6) % 0.28)
        const x = this.cx + Math.cos(a) * this.rx
        const y = this.cy + Math.sin(a) * this.ry
        g.alpha(0.3 + 0.2 * (3 - k))
        g.circle(x, y, 1.5, '#fff3a6')
        g.alpha(1)
      }
    }
    type D = { y: number; draw: () => void }
    const list: D[] = []
    const addWalker = (a: number, look: AvatarLook, moving: boolean, me: boolean) => {
      const x = this.cx + Math.cos(a) * this.rx
      const y = this.cy + Math.sin(a) * this.ry
      // Moving clockwise: heading left along the front, right along the back.
      const front = Math.sin(a) > 0
      const view = front ? 'front' : 'back'
      const step = Math.floor((this.t + a) * 6) % 2
      const pose = me && this.done && this.doneT > 0.4 ? 'kneelWai' : moving && step ? 'candle_walk_b' : 'candle_walk'
      list.push({
        y,
        draw: () => {
          const pl = drawPlayer(g, look, pose, view, Math.round(x), Math.round(y), { t: me ? this.t : undefined, bob: moving && step ? -1 : 0, barefoot: true })
          if (me) this.placed = pl
          const [lx, ly] = handAt(pl, 1)
          const [rx, ry] = handAt(pl, -1)
          const hx = Math.round((lx + rx) / 2)
          const hy = Math.round((ly + ry) / 2)
          const flame = me ? this.flame : 1
          const lit = !me || this.outT <= 0
          if (view === 'front' && pose !== 'kneelWai') {
            drawLotusBud(g, hx - 2, hy - 3)
            g.vline(hx + 3, hy - 9, hy - 2, '#c0392b')
            drawHeldCandle(g, hx + 1, hy - 1, this.t + a, lit && flame > 0.05)
          } else if (lit) softGlow(g, hx, hy - 6, 10 + flame * 6, 0.6 + flame * 0.4, '#ffcf7a')
          if (me && lit && flame < 0.5 && Math.sin(this.t * 30) > 0) softGlow(g, hx, hy - 8, 5, 0.8, '#ff8a3d')
        },
      })
    }
    for (const n of this.npcs) addWalker(n.a, n.look, true, false)
    addWalker(this.angle, this.look, this.walking > 0, true)
    // The chedi sits at the centre of the ring.
    list.push({ y: this.cy, draw: () => drawChedi(g, this.cx, Math.round(this.cy + 6), { gold: true, scale: 1.25 }) })
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()
    drawGlow(g, this.cx, this.cy - 60, 40, 0.45 + (this.done ? 0.4 : 0), '#ffe7a0')
    if (this.done) {
      // the candle planted at the base of the chedi
      const bx = Math.round(this.cx + 4)
      const by = Math.round(this.cy + 8)
      drawHeldCandle(g, bx, by, this.t, true)
      drawLotusBud(g, bx - 4, by - 1)
      drawGlow(g, bx, by - 8, 14, 1, '#fff3a6')
    }
    this.particles.render(g)
    vignette(g, '#0e0c24', 0.5)
    this.juice.end(g)
    void P
  }
}

export function CircleActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new CircleScene(look), { targetWidth: 160 })
  const [rounds, setRounds] = useState(0)
  const [flame, setFlame] = useState(1)
  const [result, setResult] = useState<TempleResultData | null>(null)
  const outs = useRef(0)
  void req
  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    const id = window.setInterval(() => setFlame(sc.outT > 0 ? 0 : sc.flame), 120)
    sc.onOut = () => {
      outs.current = sc.outs
      banner(stage.current, 'เทียนดับ! ช้า ๆ นะ', 'pink')
    }
    sc.onRound = (n) => {
      setRounds(n)
      sfx.bell(n + 1)
      haptic(20)
      sc.particles.sparkles(sc.cx, sc.cy - 40, 16)
      sc.juice.shake(0.12)
      if (n < ROUNDS) banner(stage.current, `รอบที่ ${['๑', '๒', '๓'][n]}`, 'gold')
      if (n >= ROUNDS) {
        sc.finish()
        sc.particles.confetti(sc.cx, sc.cy - 30, 40, ['#fff3a6', '#ffd54f', '#ffffff'])
        tsfx.shimmer()
        banner(stage.current, 'ครบ ๓ รอบ สาธุ!', 'gold')
        const m = addMerit(15, { key: 'circle', free: 1, area: 'mountain' })
        track('circle_chedi')
        const stars = (sc.outs === 0 ? 3 : sc.outs === 1 ? 2 : 1) as Stars
        setTimeout(
          () =>
            setResult({
              title: 'เวียนเทียนครบ ๓ รอบ',
              merit: m,
              icon: 'sparkle',
              stars,
              pose: 'wai',
              lines: ['รอบแรกระลึกถึงพระพุทธ รอบสองพระธรรม รอบสามพระสงฆ์', sc.outs === 0 ? 'เปลวเทียนไม่ดับเลย ใจนิ่งมาก!' : `เทียนดับ ${sc.outs} ครั้ง`],
            }),
          1800,
        )
      }
    }
    return () => clearInterval(id)
  }, [scene.current])
  const r = Math.min(rounds, ROUNDS - 1)
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="เวียนเทียนรอบพระธาตุ" onClose={closeActivity} />
      <PraiseLayer />
      {!result && <StatusPill text={`รอบ ${Math.min(rounds, ROUNDS)}/${ROUNDS} · เปลวเทียน`} dots={5} on={Math.ceil(flame * 5)} />}
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            <div class="subtitle">
              รอบที่ {['๑', '๒', '๓'][r]} {ROUND_WORDS[r]}
            </div>
            <div class="small muted">ลากนิ้ววนตามเข็มนาฬิกาช้า ๆ ให้องค์พระธาตุอยู่ทางขวามือ · อย่าเร็วจนเทียนดับ</div>
          </div>
        </div>
      )}
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}
