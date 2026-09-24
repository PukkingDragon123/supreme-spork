// หยอดตู้ทำบุญ – drop Boon Coins into the temple donation box for merit.

import { useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import { game } from '../game/state'
import { donateBox } from '../game/actions'
import { closeActivity, coinStoreOpen, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { Btn, Coin, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawGlow } from '../scenes/sky'

const AMOUNTS = [5, 10, 20, 50, 100]

class BoxScene implements Scene {
  w = 150
  h = 320
  t = 0
  coins: { x: number; y: number; vy: number; delay: number; spin: number }[] = []
  particles = new Particles()
  shake = 0
  private bg: HTMLCanvasElement | null = null
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get slotY() {
    return Math.round(this.h * 0.42)
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const cx = Math.round(w / 2)
    const sy = this.slotY
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h, ['#fff1d6', '#f3dcb2', '#e0bb8a'])
      g.rect(0, h * 0.78, w, h, '#e4ddd6')
      for (let x = 0; x < w; x += 10) g.vline(x, h * 0.78, h - 1, '#d2c9c3')
      // Sign above the box.
      g.rect(cx - 44, sy - 62, 88, 26, '#b8343f')
      g.rect(cx - 42, sy - 60, 84, 22, '#fffaf0')
      g.frame(cx - 44, sy - 62, 88, 26, P.gold)
      // Box.
      g.rect(cx - 40, sy - 8, 80, 8, '#7e2436')
      g.rect(cx - 40, sy - 8, 80, 1, P.gold)
      g.rect(cx - 36, sy, 72, 70, '#b8343f')
      g.rect(cx - 36, sy, 4, 70, P.redL)
      g.rect(cx + 30, sy, 6, 70, '#8e2a3c')
      g.rect(cx - 14, sy - 6, 28, 3, P.ink)
      // Emblem.
      g.circle(cx, sy + 30, 14, P.gold)
      g.circle(cx, sy + 30, 11, P.goldD)
      g.circle(cx, sy + 30, 9, P.gold)
      g.poly(
        [
          [cx - 6, sy + 34],
          [cx, sy + 22],
          [cx + 6, sy + 34],
        ],
        P.pink,
      )
      g.rect(cx - 7, sy + 34, 14, 2, P.leaf)
      // Legs.
      g.rect(cx - 34, sy + 70, 6, 20, '#6e4a35')
      g.rect(cx + 28, sy + 70, 6, 20, '#6e4a35')
    })
    return this.bg
  }
  drop(n: number) {
    const k = Math.min(12, Math.max(3, Math.round(n / 8)))
    for (let i = 0; i < k; i++) this.coins.push({ x: this.w / 2 + rand(-6, 6), y: -10, vy: rand(40, 70), delay: i * 0.08, spin: rand(0, 6) })
  }
  update(dt: number) {
    this.t += dt
    this.shake = Math.max(0, this.shake - dt * 4)
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i]
      if (c.delay > 0) {
        c.delay -= dt
        continue
      }
      c.vy += 300 * dt
      c.y += c.vy * dt
      c.spin += dt * 12
      c.x += (this.w / 2 - c.x) * dt * 4
      if (c.y > this.slotY - 6) {
        this.coins.splice(i, 1)
        sfx.coin()
        this.shake = 1
        this.particles.sparkles(this.w / 2, this.slotY - 6, 3)
      }
    }
    this.particles.update(dt)
  }
  render(g: Surface) {
    const dx = Math.round(Math.sin(this.t * 60) * this.shake)
    g.draw(this.background(), dx, 0)
    const cx = Math.round(this.w / 2)
    const sy = this.slotY
    // Lotus emblems on the plaque.
    for (const ox of [-26, 0, 26]) {
      g.poly(
        [
          [cx + ox - 5, sy - 42],
          [cx + ox, sy - 56],
          [cx + ox + 5, sy - 42],
        ],
        ox === 0 ? P.pinkD : P.pink,
      )
      g.rect(cx + ox - 6, sy - 42, 12, 2, P.leaf)
    }
    drawGlow(g, cx, sy + 30, 22, 0.5)
    for (const c of this.coins) {
      if (c.delay > 0) continue
      const wv = Math.abs(Math.cos(c.spin))
      g.rect(c.x - 3 * wv, c.y - 3, Math.max(1, 6 * wv), 6, P.goldD)
      g.rect(c.x - 2 * wv, c.y - 2, Math.max(1, 4 * wv), 4, P.gold)
    }
    this.particles.render(g)
  }
}

export function DonateActivity({ req }: { req: ActivityRequest }) {
  const { host, scene } = useStage(() => new BoxScene(), { targetWidth: 150 })
  const [total, setTotal] = useState(0)
  const [merit, setMerit] = useState(0)
  const [result, setResult] = useState<ResultData | null>(null)
  void req

  const give = (n: number) => {
    const m = donateBox(n)
    if (m <= 0) return
    scene.current?.drop(n)
    haptic(15)
    setTotal((t) => t + n)
    setMerit((x) => x + m)
    setTimeout(() => scene.current?.particles.popText(scene.current.w / 2, scene.current.slotY - 20, `+${m}`), 500)
  }

  const close = () => {
    if (merit > 0) setResult({ title: 'ทำบุญบำรุงวัดแล้ว', merit, icon: 'coin', lines: [`หยอดตู้ ${total} บุญคอยน์`, 'ร่วมเป็นค่าน้ำค่าไฟ ค่าบำรุงวัดให้อยู่คู่ชุมชน'] })
    else closeActivity()
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="ตู้ทำบุญบำรุงวัด" onClose={close} />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            <div class="subtitle">ตู้ทำบุญค่าน้ำค่าไฟ บำรุงวัด</div>
            <div class="small muted">
              ทุก 1 คอยน์ ได้ 1.5 บุญ · วันนี้หยอดแล้ว <Coin n={total} size={14} /> · มี <Coin n={game.value.coins} size={14} />
            </div>
            <div class="row wrap" style={{ justifyContent: 'center' }}>
              {AMOUNTS.map((n) => (
                <Btn key={n} size="small" onClick={() => give(n)} disabled={game.value.coins < n} silent>
                  <Coin n={n} size={16} />
                </Btn>
              ))}
            </div>
            <div class="row">
              <Btn tone="paper" class="grow" onClick={() => (coinStoreOpen.value = true)}>
                <Icon name="coinbag" size={16} /> เติมบุญคอยน์
              </Btn>
              <Btn tone="green" class="grow" onClick={close}>
                เสร็จแล้ว
              </Btn>
            </div>
          </div>
        </div>
      )}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}
