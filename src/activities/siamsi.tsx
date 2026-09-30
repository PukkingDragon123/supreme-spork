// เซียมซี – kneel before the Buddha and shake the fortune-stick cup until a
// single stick works its way out and clatters onto the floor.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { drawText } from '../engine/font'
import { rand } from '../engine/rng'
import { drawHallInterior, drawBuddha, drawArch, drawAltar, drawCandleStand } from '../art/interior'
import { P, SKIN_TONES } from '../art/palette'
import type { AvatarLook } from '../art/avatar'
import { drawPlayer, drawStick, godRays, handAt, impactBurst, Juice, lightPool, motes, softGlow, vignette } from '../art/minigames/temple'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { addMerit, recordFortune, spendCoins, track } from '../game/actions'
import { FORTUNES, toThaiDigits, type Fortune } from '../game/data/fortunes'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { Btn, Coin, Icon, Modal } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { PraiseLayer, banner } from './temple-ui'

const PRICE_EXTRA = 5
const S = 2

class SiamsiScene implements Scene {
  w = 160
  h = 320
  t = 0
  shake = 0
  angle = 0
  progress = 0
  falling: { x: number; y: number; vx: number; vy: number; rot: number; vr: number; n: number; landed: boolean; bounces: number } | null = null
  landedT = 0
  particles = new Particles()
  juice = new Juice()
  private bg: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get footY() {
    return Math.round(this.h * 0.74)
  }
  get floorY() {
    return this.footY + 3
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      const { floorY } = drawHallInterior(g, w, h, 0)
      const cx = Math.round(w / 2)
      const baseY = floorY - 64
      drawArch(g, cx, baseY + 10, 44, 92)
      drawBuddha(g, cx, baseY, 1)
      drawAltar(g, cx, baseY, 110)
      g.ctx.fillStyle = 'rgba(30,18,40,0.38)'
      g.ctx.fillRect(0, 0, w, h)
    })
    return this.bg
  }
  /** Mouth of the cup in stage pixels. */
  private cupMouth(): [number, number] {
    const [cx, bottom] = this.cupBase()
    const top = bottom - 22
    return [cx + Math.round((top - bottom) * Math.tan(this.angle)), top]
  }
  private cupAt: [number, number] = [80, 200]
  private cupBase(): [number, number] {
    return this.cupAt
  }
  drop(n: number) {
    const [mx, my] = this.cupMouth()
    this.falling = { x: mx + 4, y: my - 10, vx: 24, vy: -110, rot: -1.2, vr: 9, n, landed: false, bounces: 0 }
    tsfx.swish(1.4)
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    const base = -0.45
    if (this.shake > 0) {
      this.angle = base + Math.sin(this.t * 28) * 0.2 * this.shake
      if (Math.random() < dt * 20) this.particles.add({ kind: 'dot', x: this.cupMouth()[0] + rand(-6, 6), y: this.cupMouth()[1] - rand(4, 16), vx: rand(-10, 10), vy: rand(-20, -5), g: 60, max: 0.3, color: '#fff3a6' })
    } else this.angle += (base - this.angle) * Math.min(1, dt * 8)
    const f = this.falling
    if (f && !f.landed) {
      f.vy += 300 * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.rot += f.vr * dt
      if (f.y > this.floorY) {
        f.y = this.floorY
        if (f.bounces < 2 && f.vy > 60) {
          f.vy = -f.vy * 0.35
          f.vx *= 0.5
          f.vr *= -0.5
          f.bounces++
          tsfx.clack()
          this.juice.shake(0.12)
        } else {
          f.landed = true
          f.rot = 0.08
          this.landedT = 0
          tsfx.clack()
          impactBurst(this.particles, f.x, f.y, '#fff3a6', 14)
          this.juice.shake(0.2)
          this.juice.hitstop(0.06)
        }
      }
    }
    if (f?.landed) {
      this.landedT += dt
      if (Math.random() < dt * 10) this.particles.sparkles(f.x + rand(-12, 12), f.y + rand(-6, 2), 1, '#fff3a6')
    }
    motes(this.particles, dt, this.w, this.footY, 2, '#fff3a6')
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    this.juice.begin(g)
    g.draw(this.background(), 0, 0)
    const cx = Math.round(w / 2)
    godRays(g, cx, this.footY - 150, h * 0.7, this.t, '#fff3c4', 0.06 + this.shake * 0.05, 10)
    drawCandleStand(g, 16, this.footY - 30, this.t)
    drawCandleStand(g, w - 16, this.footY - 30, this.t)
    softGlow(g, 16, this.footY - 76, 10, 0.8, '#ffcf7a')
    softGlow(g, w - 16, this.footY - 76, 10, 0.8, '#ffcf7a')
    lightPool(g, cx, this.floorY, 56, '#ffe7a0', 0.8)
    // The player, kneeling and shaking the cup.
    const f = this.falling
    const pose = f?.landed ? 'ss_happy' : this.shake > 0 ? (Math.floor(this.t * 14) % 2 ? 'ss_shake_a' : 'ss_shake_b') : 'ss_hold'
    const bob = this.shake > 0 ? (Math.floor(this.t * 14) % 2 ? -1 : 0) : f?.landed ? -Math.round(Math.abs(Math.sin(this.landedT * 8)) * 2 * Math.max(0, 1 - this.landedT)) : 0
    const pl = drawPlayer(g, this.look, pose, 'front', cx, this.footY, { scale: S, t: this.t, barefoot: true, bob })
    // The cup between the hands.
    const [lx, ly] = handAt(pl, 1)
    const [rx, ry] = handAt(pl, -1)
    const hx = Math.round((lx + rx) / 2)
    const hy = Math.round((ly + ry) / 2)
    this.drawCup(g, hx + 7, hy + 9)
    // hands gripping the lower cup
    const skin = SKIN_TONES[this.look.skin] ?? SKIN_TONES[1]
    const sh = Math.tan(this.angle)
    for (const [x, y] of [
      [hx + 7 - 8 + Math.round(-5 * sh), hy + 3],
      [hx + 7 + 8 + Math.round(-5 * sh), hy + 4],
    ]) {
      g.rect(x - 3, y - 2, 6, 5, P.ink)
      g.rect(x - 2, y - 1, 4, 3, skin.b)
      g.rect(x - 2, y + 1, 4, 1, skin.d)
    }
    if (this.shake > 0) {
      // motion lines either side of the cup
      g.alpha(0.6)
      const k = Math.floor(this.t * 14) % 2 ? 1 : -1
      g.vline(hx - 16 + k, hy - 16, hy - 6, '#fffaf0')
      g.vline(hx + 16 + k, hy - 16, hy - 6, '#fffaf0')
      g.alpha(1)
    }
    // The falling stick with its number once it lands.
    if (f) {
      if (f.landed) softGlow(g, f.x, f.y - 2, 16, 0.8 + Math.sin(this.t * 6) * 0.2, '#fff3a6')
      drawStick(g, f.x, f.y - 1, f.landed ? f.rot : f.rot, 26)
      if (f.landed && this.landedT > 0.25) {
        const label = String(f.n)
        const bx = Math.round(f.x - 8)
        const by = Math.round(f.y - 20 - Math.max(0, 1 - this.landedT * 3) * 6)
        g.rect(bx, by, label.length * 4 + 5, 9, '#fffaf0')
        g.frame(bx, by, label.length * 4 + 5, 9, P.ink)
        drawText(g, label, bx + 2, by + 2, P.redD)
      }
    }
    this.particles.render(g)
    vignette(g, '#1b0a14', 0.5)
    this.juice.end(g)
  }
  /** Red bamboo cup with gold bands, sticks fanning from the mouth. */
  private drawCup(g: Surface, cx: number, bottom: number) {
    const cupH = 22
    const cupW = 12
    this.cupAt = [cx, bottom]
    const top = bottom - cupH
    const shear = Math.tan(this.angle)
    const rise = Math.round(this.progress * 12)
    for (let i = 0; i < 9; i++) {
      const baseX = cx - 4 + i
      const chosen = i === 6
      const len = 7 + ((i * 7) % 5) + (this.shake > 0 ? Math.round(Math.sin(this.t * 34 + i) * 2) : 0) + (chosen ? rise : 0)
      if (chosen && this.falling) continue
      for (let y = top - len; y < top + 3; y++) {
        const off = Math.round((y - bottom) * shear)
        g.rect(baseX + off, y, 1, 1, y < top - len + 3 ? '#e8514a' : i % 2 ? '#e8c38a' : '#f3d9a8')
      }
      if (chosen && rise > 4) softGlow(g, baseX + Math.round((top - len - bottom) * shear), top - len, 5, 0.6, '#fff3a6')
    }
    for (let y = top; y < bottom; y++) {
      const off = Math.round((y - bottom) * shear)
      const rel = y - top
      const band = rel < 2 || (rel > 10 && rel < 13) || rel > cupH - 3
      g.rect(cx - cupW / 2 + off, y, cupW, 1, band ? P.gold : '#c0392b')
      g.rect(cx - cupW / 2 + off + 2, y, 2, 1, band ? P.goldL : '#e8514a')
      g.rect(cx + cupW / 2 + off - 3, y, 2, 1, band ? P.goldD : '#8e2a3c')
      g.px(cx - cupW / 2 + off - 1, y, P.ink)
      g.px(cx + cupW / 2 + off, y, P.ink)
    }
    g.rect(cx - cupW / 2 - 1, bottom, cupW + 2, 1, P.ink)
    // Chinese-style character plate on the cup
    const off = Math.round((top + 8 - bottom) * shear)
    g.rect(cx - 2 + off, top + 4, 5, 5, P.gold)
    g.rect(cx + off, top + 5, 1, 3, '#8e2a3c')
  }
}

export function SiamsiActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new SiamsiScene(look), { targetWidth: 160 })
  const [shaking, setShaking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fortune, setFortune] = useState<Fortune | null>(null)
  const [merit, setMerit] = useState(0)
  const timer = useRef<number | null>(null)
  const done = useRef(false)
  const usedToday = (game.value.daily.counts.siamsi ?? 0) > 0
  const [paid, setPaid] = useState(!usedToday)
  void req

  const tick = () => {
    const sc = scene.current
    if (!sc || done.current) return
    sc.shake = 1
    sc.juice.shake(0.06)
    if (Math.random() < 0.5) sfx.rattle()
    haptic(8)
    setProgress((p) => {
      const n = Math.min(1, p + 0.045)
      sc.progress = n
      if (n >= 1 && !done.current) {
        done.current = true
        stop()
        const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
        sc.drop(f.n)
        setTimeout(() => banner(stage.current, `ใบที่ ${toThaiDigits(f.n)}!`, 'gold'), 700)
        setTimeout(() => {
          const m = addMerit(3, { key: 'siamsi', free: 1 })
          track('siamsi')
          recordFortune(f.n)
          setMerit(m)
          setFortune(f)
          sfx.chime()
        }, 1700)
      }
      return n
    })
  }
  const start = () => {
    if (timer.current || done.current) return
    setShaking(true)
    timer.current = window.setInterval(tick, 90)
  }
  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setShaking(false)
    if (scene.current) scene.current.shake = 0
  }
  useEffect(() => {
    // Shake the phone to shake the cup (where motion events are allowed).
    let last = 0
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const mag = Math.abs(a.x ?? 0) + Math.abs(a.y ?? 0) + Math.abs(a.z ?? 0)
      if (mag > 28 && performance.now() - last > 80 && paid) {
        last = performance.now()
        tick()
        setTimeout(() => scene.current && !timer.current && (scene.current.shake = 0), 200)
      }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => {
      window.removeEventListener('devicemotion', onMotion)
      stop()
    }
  }, [paid])

  const again = () => {
    if (!spendCoins(PRICE_EXTRA)) return
    done.current = false
    setFortune(null)
    setProgress(0)
    if (scene.current) {
      scene.current.falling = null
      scene.current.progress = 0
    }
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="เสี่ยงเซียมซี" onClose={closeActivity} />
      <PraiseLayer />
      {!fortune && (
        <div class="act-bottom">
          {paid ? (
            <div class="panel act-tip">
              <div class="subtitle">ตั้งจิตอธิษฐาน แล้วเขย่ากระบอกเซียมซี</div>
              <div class="small muted">กดค้าง หรือเขย่าโทรศัพท์ จนไม้เซียมซีหล่นออกมา ๑ อัน</div>
              <div class="bar pink" style={{ margin: '8px 4px' }}>
                <span style={{ width: `${progress * 100}%` }} />
              </div>
              <button
                class={`btn big block hold-btn ${shaking ? 'green' : ''}`}
                style={{ ['--charge' as string]: `${progress * 100}%` }}
                onPointerDown={start}
                onPointerUp={stop}
                onPointerLeave={stop}
                onPointerCancel={stop}
              >
                <span>{progress > 0.7 ? 'อีกนิด! เขย่า ๆ ๆ' : 'เขย่า ๆ ๆ'}</span>
              </button>
            </div>
          ) : (
            <div class="panel act-tip">
              <div class="subtitle">วันนี้เสี่ยงเซียมซีไปแล้ว</div>
              <div class="small muted">เสี่ยงใหม่ได้วันพรุ่งนี้ หรือทำบุญค่าเซียมซี</div>
              <Btn tone="green" block onClick={() => spendCoins(PRICE_EXTRA) && setPaid(true)}>
                เสี่ยงอีกครั้ง <Coin n={PRICE_EXTRA} />
              </Btn>
            </div>
          )}
        </div>
      )}
      {fortune && (
        <Modal onClose={closeActivity}>
          <div class="fortune">
            <div class="fortune-head">
              <span class="fortune-no">ใบที่ {toThaiDigits(fortune.n)}</span>
              <span class={`chip ${fortune.level === 'ระวัง' ? 'pink' : fortune.level === 'ปานกลาง' ? 'blue' : 'gold'}`}>{fortune.level}</span>
            </div>
            <div class="fortune-poem">“{fortune.poem}”</div>
            <div class="fortune-grid">
              <div>
                <b>การงาน</b> {fortune.work}
              </div>
              <div>
                <b>การเงิน</b> {fortune.money}
              </div>
              <div>
                <b>ความรัก</b> {fortune.love}
              </div>
              <div>
                <b>สุขภาพ</b> {fortune.health}
              </div>
            </div>
            <div class="panel soft fortune-advice">
              <Icon name="sparkle" size={16} /> {fortune.advice}
            </div>
            {merit > 0 && <div class="small muted center">ได้รับ +{merit} บุญ</div>}
            <div class="small muted center">คำทำนายเพื่อเป็นกำลังใจ โปรดใช้วิจารณญาณ</div>
            <div class="row">
              <Btn tone="paper" class="grow" onClick={again}>
                เสี่ยงใหม่ <Coin n={PRICE_EXTRA} />
              </Btn>
              <Btn tone="green" class="grow" onClick={closeActivity}>
                สาธุ
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
