// เซียมซี – shake the fortune-stick cup until one stick falls out.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { drawText } from '../engine/font'
import { drawHallInterior, drawBuddha, drawArch, drawAltar } from '../art/interior'
import { P } from '../art/palette'
import { game } from '../game/state'
import { addMerit, recordFortune, spendCoins, track } from '../game/actions'
import { FORTUNES, toThaiDigits, type Fortune } from '../game/data/fortunes'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { Btn, Coin, Icon, Modal } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawGlow } from '../scenes/sky'

const PRICE_EXTRA = 5

class SiamsiScene implements Scene {
  w = 160
  h = 320
  t = 0
  shake = 0
  angle = 0
  falling: { x: number; y: number; vy: number; rot: number; n: number; landed: boolean } | null = null
  particles = new Particles()
  private bg: HTMLCanvasElement | null = null
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      const { floorY } = drawHallInterior(g, w, h, 0)
      const cx = Math.round(w / 2)
      drawArch(g, cx, floorY - 80, 44, 92)
      drawBuddha(g, cx, floorY - 90, 1)
      drawAltar(g, cx, floorY - 90, 110)
      g.ctx.fillStyle = 'rgba(30,18,40,0.45)'
      g.ctx.fillRect(0, 0, w, h)
    })
    return this.bg
  }
  drop(n: number) {
    this.falling = { x: this.w / 2 + 4, y: this.h * 0.52, vy: -70, rot: 0, n, landed: false }
  }
  update(dt: number) {
    this.t += dt
    if (this.shake > 0) this.angle = Math.sin(this.t * 26) * 0.18 * this.shake
    else this.angle *= 0.8
    const f = this.falling
    if (f && !f.landed) {
      f.vy += 260 * dt
      f.y += f.vy * dt
      f.x += 30 * dt
      f.rot += dt * 5
      const ground = this.h * 0.82
      if (f.y > ground) {
        f.y = ground
        f.landed = true
        sfx.click()
        this.particles.sparkles(f.x, f.y, 10)
      }
    }
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    g.draw(this.background(), 0, 0)
    const cx = Math.round(w / 2)
    const cupTop = Math.round(h * 0.46)
    const cupH = 46
    const cupW = 26
    const pivot = cupTop + cupH
    const shear = Math.tan(this.angle)
    // Sticks (drawn first so the cup covers their base).
    for (let i = 0; i < 11; i++) {
      const baseX = cx - 10 + i * 2
      const len = 16 + ((i * 7) % 9) + (this.shake > 0 ? Math.round(Math.sin(this.t * 30 + i) * 2) : 0)
      for (let y = cupTop - len; y < cupTop + 6; y++) {
        const off = Math.round((y - pivot) * shear)
        g.px(baseX + off, y, y < cupTop - len + 3 ? '#e8514a' : '#e8c38a')
      }
    }
    // Cup body with gold bands.
    for (let y = cupTop; y < cupTop + cupH; y++) {
      const off = Math.round((y - pivot) * shear)
      const rel = y - cupTop
      const band = rel < 3 || (rel > 20 && rel < 24) || rel > cupH - 4
      g.rect(cx - cupW / 2 + off, y, cupW, 1, band ? P.gold : '#c0392b')
      g.px(cx - cupW / 2 + off + 3, y, band ? P.goldL : '#e8514a')
      g.px(cx + cupW / 2 + off - 3, y, band ? P.goldD : '#8e2a3c')
      g.px(cx - cupW / 2 + off - 1, y, P.ink)
      g.px(cx + cupW / 2 + off, y, P.ink)
    }
    g.rect(cx - cupW / 2 - 1, cupTop + cupH, cupW + 2, 1, P.ink)
    // Hands holding the cup.
    const skin = '#f0bd90'
    for (const side of [-1, 1]) {
      const hx = cx + side * (cupW / 2 + 3)
      const off = Math.round((cupTop + 30 - pivot) * shear)
      g.rect(hx - 3 + off, cupTop + 26, 6, 10, skin)
      g.rect(hx - 3 + off, cupTop + 26, 6, 1, P.ink)
      g.rect(side < 0 ? hx - 8 + off : hx + 2 + off, cupTop + 32, 6, 18, skin)
    }
    drawGlow(g, cx, cupTop + 20, 30, this.shake * 0.6)
    // Falling stick with its number.
    const f = this.falling
    if (f) {
      const len = 26
      const dx = Math.cos(f.landed ? 0.05 : f.rot)
      const dy = Math.sin(f.landed ? 0.05 : f.rot)
      for (let i = 0; i < len; i++) g.rect(f.x + dx * (i - len / 2), f.y + dy * (i - len / 2), 2, 2, i > len - 4 ? '#e8514a' : '#e8c38a')
      if (f.landed) {
        const label = String(f.n)
        g.rect(f.x - 8, f.y - 16, label.length * 4 + 5, 9, '#fffaf0')
        g.frame(f.x - 8, f.y - 16, label.length * 4 + 5, 9, P.ink)
        drawText(g, label, f.x - 6, f.y - 14, P.redD)
      }
    }
    this.particles.render(g)
  }
}

export function SiamsiActivity({ req }: { req: ActivityRequest }) {
  const { host, scene } = useStage(() => new SiamsiScene(), { targetWidth: 160 })
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
    if (Math.random() < 0.5) sfx.rattle()
    haptic(8)
    setProgress((p) => {
      const n = Math.min(1, p + 0.045)
      if (n >= 1 && !done.current) {
        done.current = true
        stop()
        const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
        sc.drop(f.n)
        setTimeout(() => {
          const m = addMerit(3, { key: 'siamsi', free: 1 })
          track('siamsi')
          recordFortune(f.n)
          setMerit(m)
          setFortune(f)
          sfx.chime()
        }, 1300)
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
    if (scene.current) scene.current.falling = null
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="เสี่ยงเซียมซี" onClose={closeActivity} />
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
                <span>เขย่า ๆ ๆ</span>
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
