// เวียนเทียน – walk three times clockwise around the golden chedi holding
// flowers, incense and a candle, keeping the chedi on your right.

import { useEffect, useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { avatarSprite, type AvatarLook, type Pose, type View } from '../art/avatar'
import { drawChedi } from '../art/buildings'
import { P } from '../art/palette'
import { game } from '../game/state'
import { addMerit, track } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { sfx, haptic } from '../engine/audio'
import { drawGlow, drawSky } from '../scenes/sky'

const ROUNDS = 3

class CircleScene implements Scene {
  w = 160
  h = 320
  t = 0
  angle = Math.PI / 2
  progress = 0
  walking = 0
  particles = new Particles()
  npcs: { a: number; look: AvatarLook; speed: number }[] = []
  onRound?: (n: number) => void
  private lastPointer: number | null = null
  private bg: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {
    const others: AvatarLook[] = [
      { gender: 'f', face: 1, skin: 2, hairColor: 0, hair: 'hair_long', top: 'top_white', bottom: 'bot_sarong' },
      { gender: 'm', face: 0, skin: 0, hairColor: 1, hair: 'hair_short', top: 'top_white', bottom: 'bot_khaki' },
      { gender: 'f', face: 2, skin: 3, hairColor: 0, hair: 'hair_bun', top: 'top_lace', bottom: 'bot_skirt' },
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
    return this.h * 0.56
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
      g.rect(0, h * 0.34, w, h, '#3a3450')
      // Stone terrace and walkway ring.
      g.ellipse(this.cx, this.cy, this.rx + 16, this.ry + 8, '#5e5561')
      g.ellipse(this.cx, this.cy, this.rx + 8, this.ry + 4, '#8c8187')
      g.ellipse(this.cx, this.cy, this.rx - 8, this.ry - 4, '#5e5561')
      // Candles along the walkway.
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        const x = this.cx + Math.cos(a) * (this.rx + 12)
        const y = this.cy + Math.sin(a) * (this.ry + 6)
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
    const before = Math.floor(this.progress / (Math.PI * 2))
    this.progress += d
    this.angle += d
    this.walking = 0.3
    const after = Math.floor(this.progress / (Math.PI * 2))
    if (after > before && after <= ROUNDS) this.onRound?.(after)
  }
  update(dt: number) {
    this.t += dt
    this.walking = Math.max(0, this.walking - dt)
    for (const n of this.npcs) n.a += n.speed * dt
    for (let i = 0; i < 2; i++)
      if (Math.random() < dt * 3) {
        const a = rand(0, Math.PI * 2)
        this.particles.add({ kind: 'firefly', x: this.cx + Math.cos(a) * rand(0, this.rx), y: this.cy - rand(20, 120), vx: rand(-3, 3), vy: rand(-5, -1), max: rand(2, 4), color: '#fff3a6' })
      }
    this.particles.update(dt)
  }
  private walkerPose(a: number, moving: boolean, t: number): { view: View; flip: boolean; pose: Pose } {
    // Tangent of clockwise motion.
    const vx = -Math.sin(a)
    const vy = Math.cos(a)
    let view: View = 'side'
    let flip = vx < 0
    if (Math.abs(vy) * 1.6 > Math.abs(vx)) {
      view = vy > 0 ? 'front' : 'back'
      flip = false
    }
    const cycle: Pose[] = ['walk1', 'pass', 'walk2', 'pass']
    return { view, flip, pose: moving ? cycle[Math.floor(t * 8) % 4] : 'wai' }
  }
  render(g: Surface) {
    const { w, h } = this
    drawSky(g, 0, 0, w, Math.round(h * 0.36), 'night', this.t)
    g.draw(this.background(), 0, 0)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const x = this.cx + Math.cos(a) * (this.rx + 12)
      const y = this.cy + Math.sin(a) * (this.ry + 6)
      g.px(x, y - 4, Math.sin(this.t * 9 + i) > 0 ? '#ffd54f' : '#fff3a6')
      drawGlow(g, x, y - 4, 6, 0.7)
    }
    type D = { y: number; draw: () => void }
    const list: D[] = []
    const addWalker = (a: number, look: AvatarLook, moving: boolean) => {
      const x = this.cx + Math.cos(a) * this.rx
      const y = this.cy + Math.sin(a) * this.ry
      const p = this.walkerPose(a, moving, this.t + a)
      list.push({
        y,
        draw: () => {
          const s = avatarSprite(look, p.view, p.pose, { flip: p.flip, barefoot: true })
          g.draw(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h + 1))
          // Candle in hand.
          g.px(x + (p.flip ? -4 : 4), y - 14, '#ffd54f')
          drawGlow(g, x + (p.flip ? -4 : 4), y - 14, 5, 0.8)
        },
      })
    }
    for (const n of this.npcs) addWalker(n.a, n.look, true)
    addWalker(this.angle, this.look, this.walking > 0)
    // The chedi sits at the centre of the ring.
    list.push({ y: this.cy, draw: () => drawChedi(g, this.cx, Math.round(this.cy + 6), { gold: true, scale: 1.25 }) })
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()
    drawGlow(g, this.cx, this.cy - 60, 40, 0.45, '#ffe7a0')
    this.particles.render(g)
    void P
  }
}

export function CircleActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene } = useStage(() => new CircleScene(look), { targetWidth: 160 })
  const [rounds, setRounds] = useState(0)
  const [result, setResult] = useState<ResultData | null>(null)
  void req
  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.onRound = (n) => {
      setRounds(n)
      sfx.bell(n + 1)
      haptic(20)
      sc.particles.sparkles(sc.cx, sc.cy - 40, 16)
      if (n >= ROUNDS) {
        const m = addMerit(15, { key: 'circle', free: 1, area: 'mountain' })
        track('circle_chedi')
        setTimeout(() => setResult({ title: 'เวียนเทียนครบ ๓ รอบ', merit: m, icon: 'sparkle', lines: ['รอบแรกระลึกถึงพระพุทธ รอบสองพระธรรม รอบสามพระสงฆ์'] }), 800)
      }
    }
  }, [scene.current])
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="เวียนเทียนรอบพระธาตุ" onClose={closeActivity} />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            <div class="subtitle">
              {rounds === 0 ? 'รอบที่ ๑ ระลึกถึงพระพุทธคุณ' : rounds === 1 ? 'รอบที่ ๒ ระลึกถึงพระธรรมคุณ' : 'รอบที่ ๓ ระลึกถึงพระสังฆคุณ'}
            </div>
            <div class="small muted">ลากนิ้ววนตามเข็มนาฬิกา ให้องค์พระธาตุอยู่ทางขวามือ · {Math.min(rounds, ROUNDS)}/{ROUNDS} รอบ</div>
          </div>
        </div>
      )}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}
