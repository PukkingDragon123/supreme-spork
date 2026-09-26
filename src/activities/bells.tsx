// ตีระฆัง – tap each of the nine bells; on the mountain, swing the log
// against the great bell.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles, drawRing } from '../engine/particles'
import { rand } from '../engine/rng'
import { drawBell } from '../art/props'
import { P } from '../art/palette'
import { treeLine } from '../scenes/maps/common'
import { addMerit, track } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { Btn } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawSky } from '../scenes/sky'
import { currentPhase } from '../scenes/sky'

interface Bell {
  x: number
  y: number
  swing: number
  vel: number
  rung: boolean
  idx: number
}

class BellScene implements Scene {
  w = 160
  h = 320
  t = 0
  bells: Bell[] = []
  particles = new Particles()
  hits: { x: number; y: number; t: number }[] = []
  rings: { x: number; y: number; t: number }[] = []
  onRing?: (b: Bell) => void
  charge = 0
  logX = 0
  private bg: HTMLCanvasElement | null = null
  constructor(public big: boolean) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    this.layout()
  }
  private layout() {
    const { w, h } = this
    if (this.big) {
      this.bells = [{ x: w / 2, y: h * 0.28, swing: 0, vel: 0, rung: false, idx: 0 }]
      return
    }
    const rows = [5, 4]
    const out: Bell[] = []
    let idx = 0
    rows.forEach((n, r) => {
      const y = Math.round(h * (0.24 + r * 0.2))
      const gap = Math.floor((w - 20) / n)
      for (let i = 0; i < n; i++) {
        const prev = this.bells[idx]
        out.push({ x: Math.round(10 + gap * (i + 0.5)), y, swing: 0, vel: 0, rung: prev?.rung ?? false, idx })
        idx++
      }
    })
    this.bells = out
  }
  get beamYs() {
    return [Math.round(this.h * 0.24) - 8, Math.round(this.h * 0.44) - 8]
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      treeLine(g, Math.round(h * 0.62), w, P.leafD, P.leaf)
      g.rect(0, Math.round(h * 0.66), w, h, P.grass)
      g.rect(0, Math.round(h * 0.72), w, h, '#e4ddd6')
      for (let y = Math.round(h * 0.72); y < h; y += 8) g.hline(0, w - 1, y, '#d2c9c3')
      // Roof edge at the top.
      g.rect(0, 0, w, 14, P.orange)
      for (let y = 2; y < 14; y += 3) g.hline(0, w - 1, y, P.orangeD)
      g.rect(0, 14, w, 2, P.leaf)
      for (let x = 4; x < w; x += 10) {
        g.px(x, 16, P.gold)
        g.px(x, 17, P.gold)
      }
      if (!this.big) {
        for (const by of this.beamYs) {
          g.rect(0, by, w, 5, '#b8343f')
          g.rect(0, by, w, 1, P.redL)
          g.rect(0, by + 4, w, 1, '#7e2436')
        }
        g.rect(2, 16, 5, h * 0.6, '#b8343f')
        g.rect(w - 7, 16, 5, h * 0.6, '#b8343f')
      } else {
        g.rect(w / 2 - 40, h * 0.12, 80, 6, '#7e2436')
        g.rect(w / 2 - 44, h * 0.12, 6, h * 0.58, '#7e2436')
        g.rect(w / 2 + 38, h * 0.12, 6, h * 0.58, '#7e2436')
      }
    })
    return this.bg
  }
  pointer(e: PointerInfo) {
    if (this.big || e.type !== 'down') return
    let best: Bell | null = null
    let bd = 16
    for (const b of this.bells) {
      const d = Math.hypot(e.x - b.x, e.y - (b.y + 9))
      if (d < bd) {
        bd = d
        best = b
      }
    }
    if (best) this.strike(best, e.x < best.x ? 1 : -1)
  }
  strike(b: Bell, dir: number) {
    b.vel += dir * 26
    b.rung = true
    this.hits.push({ x: b.x - dir * 8, y: b.y + 10, t: 0.25 })
    this.rings.push({ x: b.x, y: b.y + 9, t: 0 })
    this.particles.sparkles(b.x, b.y + 10, 5, P.goldL)
    if (this.big) sfx.bigBell()
    else sfx.bell(b.idx)
    haptic(this.big ? 40 : 12)
    this.onRing?.(b)
  }
  releaseLog() {
    const b = this.bells[0]
    if (!b) return
    const power = this.charge
    this.charge = 0
    if (power < 0.2) return
    this.strike(b, -1)
    b.vel = -8 - power * 12
  }
  update(dt: number) {
    this.t += dt
    for (const b of this.bells) {
      // Damped spring.
      b.vel += -b.swing * 60 * dt
      b.vel *= Math.pow(0.12, dt)
      b.swing += b.vel * dt
    }
    for (const hh of this.hits) hh.t -= dt
    this.hits = this.hits.filter((hh) => hh.t > 0)
    for (const r of this.rings) r.t += dt
    this.rings = this.rings.filter((r) => r.t < (this.big ? 2.4 : 1))
    this.logX = this.big ? -this.charge * 26 : 0
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    drawSky(g, 0, 0, w, Math.round(h * 0.7), currentPhase(), this.t)
    g.draw(this.background(), 0, 0)
    const scale = this.big ? 5 : 2
    for (const b of this.bells) {
      // Rope.
      g.vline(b.x, b.y - (this.big ? 20 : 4), b.y, '#6e4a35')
      drawBell(g, b.x, b.y, Math.round(b.swing), scale)
      if (!this.big && b.rung) g.px(b.x, b.y - 6, '#ff6f91')
    }
    if (this.big) {
      // Hanging log striker.
      const b = this.bells[0]
      const lx = b.x + 28 + this.logX
      const ly = b.y + 22
      g.vline(lx - 12, h * 0.12 + 6, ly - 2, '#6e4a35')
      g.vline(lx + 12, h * 0.12 + 6, ly - 2, '#6e4a35')
      g.rect(lx - 14, ly - 3, 34, 7, '#8a5a32')
      g.rect(lx - 14, ly - 3, 34, 2, '#b8844a')
      g.circle(lx - 14, ly, 3.5, '#6e4a35')
    }
    for (const r of this.rings) {
      const rr = r.t * (this.big ? 60 : 36)
      g.alpha(Math.max(0, 1 - r.t / (this.big ? 2.4 : 1)))
      drawRing(g, r.x, r.y, rr, rr * 0.6, '#fff3a6')
      g.alpha(1)
    }
    for (const hh of this.hits) {
      g.rect(hh.x - 2, hh.y - 1, 5, 3, '#9a6a45')
      g.line(hh.x, hh.y, hh.x + (hh.x < w / 2 ? -6 : 6), hh.y + 8, '#6e4a35')
    }
    this.particles.render(g)
  }
}

export function BellsActivity({ req }: { req: ActivityRequest }) {
  const big = !!req.params?.big
  const { host, scene } = useStage(() => new BellScene(big), { targetWidth: 160 })
  const [rung, setRung] = useState(0)
  const [rounds, setRounds] = useState(0)
  const [merit, setMerit] = useState(0)
  const [result, setResult] = useState<ResultData | null>(null)
  const hold = useRef<number | null>(null)
  const [charge, setCharge] = useState(0)

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.onRing = () => {
      const m = addMerit(big ? 3 : 1, { key: big ? 'bigbell' : 'bell', free: big ? 9 : 27, area: big ? 'mountain' : 'wat' })
      track('bell')
      setMerit((x) => x + m)
      sc.particles.popText(sc.w / 2 + rand(-30, 30), sc.h * 0.62, `+${m}`)
      if (!big) {
        const n = sc.bells.filter((b) => b.rung).length
        setRung(n)
        if (n === sc.bells.length) {
          const bonus = addMerit(5, { key: 'bell_round', free: 3 })
          track('bell_round')
          setMerit((x) => x + bonus)
          setRounds((r) => r + 1)
          sfx.chime()
          sc.particles.confetti(sc.w / 2, sc.h * 0.5, 40)
          setTimeout(() => {
            for (const b of sc.bells) b.rung = false
            setRung(0)
          }, 900)
        }
      }
    }
  }, [scene.current])

  const startCharge = () => {
    if (hold.current) return
    hold.current = window.setInterval(() => {
      const sc = scene.current
      if (!sc) return
      sc.charge = Math.min(1, sc.charge + 0.04)
      setCharge(sc.charge)
    }, 40)
  }
  const release = () => {
    if (hold.current) clearInterval(hold.current)
    hold.current = null
    scene.current?.releaseLog()
    setCharge(0)
  }

  const close = () => {
    if (merit > 0) setResult({ title: big ? 'เสียงระฆังใหญ่ก้องทั่วดอย' : 'เสียงระฆังดังกังวาน', merit, icon: 'bell', lines: ['ขอให้ชื่อเสียงดีงามดังไกลเหมือนเสียงระฆัง'] })
    else closeActivity()
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={big ? 'ตีระฆังใหญ่บนดอย' : 'ตีระฆัง ๙ ใบ'} onClose={close} />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {big ? (
              <>
                <div class="subtitle">ดึงไม้ตีระฆังแล้วปล่อย</div>
                <div class="small muted">กดค้างเพื่อเหวี่ยงไม้ ยิ่งค้างนาน เสียงยิ่งดัง · +{merit} บุญ</div>
                <button
                  class="btn big green block hold-btn"
                  style={{ ['--charge' as string]: `${charge * 100}%` }}
                  onPointerDown={startCharge}
                  onPointerUp={release}
                  onPointerLeave={release}
                  onPointerCancel={release}
                >
                  <span>กดค้าง แล้วปล่อย</span>
                </button>
              </>
            ) : (
              <>
                <div class="subtitle">แตะระฆังให้ครบทั้ง ๙ ใบ</div>
                <div class="small muted">
                  ตีแล้ว {rung}/9 ใบ · ครบ {rounds} รอบ · +{merit} บุญ
                </div>
              </>
            )}
            <Btn tone="paper" block onClick={close}>
              เสร็จแล้ว
            </Btn>
          </div>
        </div>
      )}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}
