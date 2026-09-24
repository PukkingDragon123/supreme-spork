import { Fragment } from 'preact'
// กรวดน้ำ – pour water slowly while reciting the dedication verse.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import type { Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { SKIN_TONES } from '../art/palette'
import { GOLD } from '../art/interior'
import { game } from '../game/state'
import { addMerit, markDedicated, track } from '../game/actions'
import { DEDICATION, DEDICATE_TARGETS } from '../game/data/chants'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { sfx } from '../engine/audio'
import { drawGlow } from '../scenes/sky'

class PourScene implements Scene {
  w = 160
  h = 320
  t = 0
  pouring = false
  level = 0
  particles = new Particles()
  constructor(private skin: string, private skinD: string) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
  }
  update(dt: number) {
    this.t += dt
    if (this.pouring) {
      this.level = Math.min(1, this.level + dt / 9)
      const sx = this.w / 2 + 8
      const sy = this.h * 0.4 + 6
      for (let i = 0; i < 3; i++)
        this.particles.add({ kind: 'drop', x: sx + rand(-0.5, 0.5), y: sy + rand(0, 4), vy: rand(60, 80), max: 0.5, color: '#9fe3f2', color2: '#d4f5fa', size: 2 })
    }
    this.particles.list = this.particles.list.filter((p) => !(p.kind === 'drop' && p.y > this.bowlSurface()))
    if (this.level > 0.98 && Math.random() < dt * 6) this.particles.sparkles(this.w / 2 + rand(-18, 18), this.bowlSurface(), 1, '#fff3a6')
    this.particles.update(dt)
  }
  bowlSurface() {
    return this.h * 0.72 - this.level * 14
  }
  render(g: Surface) {
    const { w, h } = this
    g.gradientV(0, 0, w, h, ['#3b2a4a', '#5a3d5f', '#8a5a6a'])
    drawGlow(g, w / 2, h * 0.55, 60, 0.5, '#ffcf7a')
    const cx = Math.round(w / 2)
    // Glass bowl (ขันรองน้ำ).
    const by = Math.round(h * 0.72)
    g.ellipse(cx, by + 10, 30, 6, 'rgba(0,0,0,0.25)')
    g.poly(
      [
        [cx - 28, by - 16],
        [cx + 28, by - 16],
        [cx + 22, by + 6],
        [cx - 22, by + 6],
      ],
      'rgba(214,240,250,0.55)',
    )
    const surf = Math.round(this.bowlSurface())
    if (this.level > 0) {
      g.poly(
        [
          [cx - 26 + (by - surf) * 0.2, surf],
          [cx + 26 - (by - surf) * 0.2, surf],
          [cx + 22, by + 5],
          [cx - 22, by + 5],
        ],
        'rgba(120,210,226,0.85)',
      )
      g.hline(cx - 22, cx + 22, surf, '#d4f5fa')
    }
    g.hline(cx - 28, cx + 28, by - 16, '#fffaf0')
    g.rect(cx - 8, by + 6, 16, 6, GOLD.dark)
    // Water vessel (เต้าน้ำ) held by two hands, tilted while pouring.
    const vx = cx - 14
    const vy = Math.round(h * 0.38)
    const tilt = this.pouring ? 1 : 0
    g.ellipse(vx, vy + 8, 14, 11, GOLD.dark)
    g.ellipse(vx - 1, vy + 7, 12, 9, GOLD.base)
    g.ellipse(vx - 5, vy + 3, 4, 3, GOLD.light)
    g.rect(vx - 6, vy - 6, 12, 5, GOLD.dark)
    g.rect(vx - 8, vy - 8, 16, 3, GOLD.base)
    g.line(vx + 10, vy + 4, vx + 22, vy - 2 + tilt * 6, GOLD.dark)
    g.line(vx + 10, vy + 5, vx + 22, vy - 1 + tilt * 6, GOLD.base)
    // Hands.
    g.rect(vx - 22, vy + 2, 10, 14, this.skin)
    g.rect(vx - 22, vy + 14, 10, 2, this.skinD)
    g.rect(vx + 4, vy + 14, 14, 8, this.skin)
    g.rect(vx + 4, vy + 20, 14, 2, this.skinD)
    // Right index finger touching the stream (traditional gesture).
    g.rect(vx + 20, vy + 12, 2, 6, this.skin)
    this.particles.render(g)
  }
}

export function DedicateActivity({ req }: { req: ActivityRequest }) {
  const skin = SKIN_TONES[game.value.player.look.skin] ?? SKIN_TONES[1]
  const { host, scene } = useStage(() => new PourScene(skin.b, skin.d), { targetWidth: 160 })
  const [target, setTarget] = useState(DEDICATE_TARGETS[0].id)
  const [progress, setProgress] = useState(0)
  const [pouring, setPouring] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const timer = useRef<number | null>(null)
  const words = DEDICATION.lines.join(' ').split(/\s+/)
  void req

  const start = () => {
    if (timer.current || result) return
    setPouring(true)
    if (scene.current) scene.current.pouring = true
    let last = performance.now()
    let sound = 0
    timer.current = window.setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      sound -= dt
      if (sound <= 0) {
        sfx.pour(0.9)
        sound = 0.8
      }
      setProgress((p) => {
        const n = Math.min(1, p + dt / 9)
        if (n >= 1) finish()
        return n
      })
    }, 60)
  }
  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPouring(false)
    if (scene.current) scene.current.pouring = false
  }
  const finish = () => {
    stop()
    const label = DEDICATE_TARGETS.find((t) => t.id === target)?.label ?? ''
    const m = addMerit(10, { key: 'dedicate', free: 1 })
    track('dedicate')
    markDedicated()
    sfx.chime()
    setResult({ title: 'กรวดน้ำอุทิศส่วนกุศลแล้ว', merit: m, icon: 'vessel', lines: [`อุทิศบุญให้${label}`, DEDICATION.meaning], doubleable: true })
  }
  useEffect(() => () => stop(), [])
  const spoken = Math.floor(progress * words.length)
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="กรวดน้ำอุทิศส่วนกุศล" onClose={closeActivity} />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            <div class="subtitle">อุทิศบุญกุศลนี้ให้...</div>
            <div class="row wrap" style={{ justifyContent: 'center' }}>
              {DEDICATE_TARGETS.map((t) => (
                <button key={t.id} class={`tab ${target === t.id ? 'active' : ''}`} onClick={() => (sfx.tap(), setTarget(t.id))} disabled={pouring}>
                  {t.label}
                </button>
              ))}
            </div>
            <div class="dedicate-verse">
              {words.map((w, i) => (
                <Fragment key={i}>
                  <span class={`w ${i < spoken ? 'done' : i === spoken && pouring ? 'on' : ''}`}>
                    {w}
                  </span>{' '}
                </Fragment>
              ))}
            </div>
            <button
              class="btn big block hold-btn"
              style={{ ['--charge' as string]: `${progress * 100}%` }}
              onPointerDown={start}
              onPointerUp={stop}
              onPointerLeave={stop}
              onPointerCancel={stop}
            >
              <span>{pouring ? 'ค่อย ๆ รินน้ำ...' : 'กดค้างเพื่อรินน้ำ'}</span>
            </button>
            <div class="small muted">รินน้ำช้า ๆ ให้ต่อเนื่อง พร้อมตั้งจิตอุทิศบุญ</div>
          </div>
        </div>
      )}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}

