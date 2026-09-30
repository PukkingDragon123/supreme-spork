// หยอดตู้ทำบุญ – stand at the temple donation box and drop Boon Coins through
// the slot one after another for merit.

import { useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import type { AvatarLook } from '../art/avatar'
import { drawHallInterior, drawBuddha, drawArch, drawAltar } from '../art/interior'
import { drawPlayer, drawSpinCoin, handAt, Juice, lightPool, motes, softGlow, vignette } from '../art/minigames/temple'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { donateBox } from '../game/actions'
import { closeActivity, coinStoreOpen, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { Btn, Coin, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { PraiseLayer, TempleResult, praise, type TempleResultData } from './temple-ui'

const AMOUNTS = [5, 10, 20, 50, 100]
const S = 2

interface Flying {
  x0: number
  y0: number
  t: number
  delay: number
  spin: number
}

class BoxScene implements Scene {
  w = 150
  h = 320
  t = 0
  coins: Flying[] = []
  queue = 0
  particles = new Particles()
  juice = new Juice()
  shake = 0
  dropT = 0
  cheerT = 0
  onCoin?: () => void
  private bg: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get footY() {
    return Math.round(this.h * 0.73)
  }
  get playerX() {
    return Math.round(this.w * 0.3)
  }
  get boxX() {
    return Math.round(this.w * 0.68)
  }
  get slotY() {
    return this.footY - 70
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      const { floorY } = drawHallInterior(g, w, h, 0)
      const cx = Math.round(w / 2)
      const baseY = floorY - 72
      drawArch(g, cx, baseY + 10, 40, 80)
      drawBuddha(g, cx, baseY, 0.9)
      drawAltar(g, cx, baseY, 90)
      g.ctx.fillStyle = 'rgba(30,18,40,0.25)'
      g.ctx.fillRect(0, 0, w, h)
    })
    return this.bg
  }
  /** Queue `n` coins to fly from the hand into the slot. */
  drop(n: number) {
    const k = Math.min(12, Math.max(3, Math.round(n / 8)))
    this.queue += k
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    this.shake = Math.max(0, this.shake - dt * 4)
    this.dropT = Math.max(0, this.dropT - dt)
    this.cheerT = Math.max(0, this.cheerT - dt)
    // release queued coins one by one with a flick of the wrist
    if (this.queue > 0 && this.dropT <= 0.05) {
      this.queue--
      this.dropT = 0.2
      this.coins.push({ x0: 0, y0: 0, t: -1, delay: 0.06, spin: rand(0, 6) })
      tsfx.swish(1.6)
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i]
      if (c.delay > 0) {
        c.delay -= dt
        continue
      }
      c.t += dt / 0.34
      c.spin += dt * 16
      if (c.t >= 1) {
        this.coins.splice(i, 1)
        sfx.coin()
        tsfx.plink()
        this.shake = 1
        this.juice.shake(0.06)
        this.particles.sparkles(this.boxX, this.slotY, 4)
        this.particles.add({ kind: 'coin', x: this.boxX + rand(-4, 4), y: this.slotY - 2, vy: -20, g: 80, max: 0.3 })
        haptic(6)
        this.onCoin?.()
      }
    }
    motes(this.particles, dt, this.w, this.footY, 2, '#ffe7a0')
    this.particles.update(dt)
  }
  render(g: Surface) {
    this.juice.begin(g)
    g.draw(this.background(), 0, 0)
    const bx = this.boxX
    const sy = this.slotY
    const fy = this.footY
    const dx = Math.round(Math.sin(this.t * 60) * this.shake)
    lightPool(g, (this.playerX + bx) / 2, fy, 56, '#ffe7a0', 0.8)
    // Donation box on its stand.
    g.ellipse(bx, fy - 1, 26, 3, 'rgba(30,14,30,0.3)')
    g.rect(bx - 22 + dx, fy - 22, 5, 22, '#6e4a35')
    g.rect(bx + 17 + dx, fy - 22, 5, 22, '#6e4a35')
    g.rect(bx - 26 + dx, sy - 4, 52, 6, '#7e2436')
    g.rect(bx - 26 + dx, sy - 4, 52, 1, P.gold)
    g.rect(bx - 24 + dx, sy + 2, 48, 46, '#b8343f')
    g.rect(bx - 24 + dx, sy + 2, 3, 46, P.redL)
    g.rect(bx + 19 + dx, sy + 2, 5, 46, '#8e2a3c')
    g.rect(bx - 24 + dx, sy + 44, 48, 4, '#7e2436')
    g.rect(bx - 10 + dx, sy - 3, 20, 2, P.ink)
    softGlow(g, bx + dx, sy - 2, 10, 0.5 + this.shake * 0.5, '#fff3a6')
    // Emblem: a lotus in a gold wheel.
    const ey = sy + 24
    g.circle(bx + dx, ey, 12, P.gold)
    g.circle(bx + dx, ey, 9.5, P.goldD)
    g.circle(bx + dx, ey, 8, P.gold)
    g.poly(
      [
        [bx - 5 + dx, ey + 4],
        [bx + dx, ey - 6],
        [bx + 5 + dx, ey + 4],
      ],
      P.pink,
    )
    g.rect(bx - 6 + dx, ey + 4, 12, 2, P.leaf)
    softGlow(g, bx, ey, 20, 0.35)
    // Lotus sign above the box.
    for (const ox of [-14, 0, 14]) {
      g.poly(
        [
          [bx + ox - 4, sy - 14],
          [bx + ox, sy - 24],
          [bx + ox + 4, sy - 14],
        ],
        ox === 0 ? P.pinkD : P.pink,
      )
      g.rect(bx + ox - 5, sy - 14, 10, 2, P.leaf)
    }
    // The player dropping coins.
    const pose = this.cheerT > 0 ? 'cheer' : this.dropT > 0.1 ? 'coin_drop' : 'coin_hold'
    const pl = drawPlayer(g, this.look, pose, 'back', this.playerX, fy, { scale: S })
    const [hx, hy] = handAt(pl, -1)
    if (pose === 'coin_hold' && this.queue > 0) drawSpinCoin(g, hx + 2, hy - 5, this.t * 6, 3)
    for (const c of this.coins) {
      if (c.delay > 0) continue
      if (c.t < 0) {
        c.x0 = hx + 2
        c.y0 = hy - 6
        c.t = 0
      }
      const u = c.t
      const x = c.x0 + (bx - c.x0) * u
      const y = c.y0 + (sy - 4 - c.y0) * u - Math.sin(u * Math.PI) * 16
      drawSpinCoin(g, x, y, c.spin, 3)
    }
    this.particles.render(g)
    vignette(g, '#1b0a14', 0.45)
    this.juice.end(g)
  }
}

export function DonateActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new BoxScene(look), { targetWidth: 150 })
  const [total, setTotal] = useState(0)
  const [merit, setMerit] = useState(0)
  const [result, setResult] = useState<TempleResultData | null>(null)
  void req

  const give = (n: number) => {
    const m = donateBox(n)
    if (m <= 0) return
    const sc = scene.current
    sc?.drop(n)
    haptic(15)
    const before = total
    setTotal((t) => t + n)
    setMerit((x) => x + m)
    setTimeout(() => sc?.particles.popText(sc.boxX, sc.slotY - 30, `+${m}`), 700)
    const after = before + n
    for (const [mark, word] of [
      [50, 'ใจบุญสุด ๆ!'],
      [100, 'เศรษฐีบุญ!'],
      [300, 'บุญล้นตู้!'],
    ] as const)
      if (before < mark && after >= mark && sc) {
        setTimeout(() => {
          praise(stage.current, sc.boxX - 10, sc.slotY - 44, word, 'gold', true)
          tsfx.praise()
          sc.cheerT = 0.9
          sc.particles.confetti(sc.boxX, sc.slotY, 30)
        }, 900)
      }
  }

  const close = () => {
    if (merit > 0) setResult({ title: 'ทำบุญบำรุงวัดแล้ว', merit, icon: 'coin', pose: 'wai', lines: [`หยอดตู้ ${total} บุญคอยน์`, 'ร่วมเป็นค่าน้ำค่าไฟ ค่าบำรุงวัดให้อยู่คู่ชุมชน'] })
    else closeActivity()
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="ตู้ทำบุญบำรุงวัด" onClose={close} />
      <PraiseLayer />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            <div class="subtitle">ตู้ทำบุญค่าน้ำค่าไฟ บำรุงวัด</div>
            <div class="small muted">
              ทุก 1 คอยน์ ได้ 1.5 บุญ · วันนี้หยอดแล้ว <Coin n={total} size={14} /> · มี <Coin n={game.value.coins} size={14} />
            </div>
            <div class="row" style={{ justifyContent: 'center', gap: '4px' }}>
              {AMOUNTS.map((n) => (
                <Btn key={n} size="small" class="grow" style={{ minWidth: 0, padding: '0 2px' }} onClick={() => give(n)} disabled={game.value.coins < n} silent>
                  <Coin n={n} size={14} />
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
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}
