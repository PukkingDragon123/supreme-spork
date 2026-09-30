import { Fragment } from 'preact'
// Inside the ordination hall (อุโบสถ): chant, meditate, bow, and jump to
// wishes, fortune sticks, gold leaf and merit dedication.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import type { AvatarLook } from '../art/avatar'
import type { BaseDollPose } from '../art/doll'
import { drawPlayer, godRays, Juice, lightPool, motes, softGlow, vignette } from '../art/minigames/temple'
import { Critters, Crowd } from '../art/minigames/scenery'
import { tsfx } from '../art/minigames/sfx'
import { drawAltar, drawArch, drawBuddha, drawCandleStand, drawHallInterior, drawLightBeams, drawVase } from '../art/interior'
import { game, level } from '../game/state'
import { addMerit, track } from '../game/actions'
import { CHANTS, type Chant } from '../game/data/chants'
import { closeActivity, openActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage, type ResultData } from './kit'
import { Btn, Icon, Bar } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { PraiseLayer, TempleResult, praise, type TempleResultData } from './temple-ui'

type Mode = 'idle' | 'chant' | 'meditate' | 'bow'

export class HallScene implements Scene {
  w = 160
  h = 320
  t = 0
  mode: Mode = 'idle'
  particles = new Particles()
  juice = new Juice()
  private bg: HTMLCanvasElement | null = null
  critters = new Critters()
  crowd = new Crowd()
  private lifeInit = false
  private bowT = -1
  private bowCount = 0
  private bowDone = 0
  private bowTotal = 0
  onBowDone?: () => void
  /** Called as each prostration touches the floor (1-based). */
  onBowTouch?: (n: number) => void
  calm = 0
  breath = 0
  /** Short pulse each time a word is chanted. */
  chantPulse = 0
  npcs: AvatarLook[] = []

  constructor(public look: AvatarLook) {
    this.npcs = [
      { gender: 'f', face: 1, skin: 2, hairColor: 0, hair: 'hair_long', top: 'top_white', bottom: 'bot_sarong', shoes: null, head: null, neck: null, hand: null, back: null },
      { gender: 'm', face: 0, skin: 0, hairColor: 1, hair: 'hair_short', top: 'top_white', bottom: 'bot_black', shoes: null, head: null, neck: null, hand: null, back: null },
    ]
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    if (!this.lifeInit) {
      this.lifeInit = true
      this.crowd.add({ monk: 'monk', x: w - 18, y: this.floorY + 16 })
      this.critters.cat(16, this.floorY + 24, '#f5a55a', 'sleep')
    }
  }

  get floorY() {
    return Math.round(this.h * 0.62)
  }

  get buddhaBase() {
    return this.floorY - 40
  }

  get footY() {
    return Math.round(this.h * 0.8)
  }

  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      const { floorY } = drawHallInterior(g, w, h, 0)
      const cx = Math.round(w / 2)
      const baseY = floorY - 40
      drawArch(g, cx, baseY + 10, 44, 92)
      drawBuddha(g, cx, baseY, 1)
      drawAltar(g, cx, baseY, 110)
      drawVase(g, cx - 30, baseY + 20, '#ffd23f')
      drawVase(g, cx + 30, baseY + 20, '#ff9fc0')
    })
    return this.bg
  }

  bow(times = 1, done?: () => void) {
    this.bowCount = times
    this.bowTotal = times
    this.bowDone = 0
    this.bowT = 0
    this.onBowDone = done
  }

  pulse() {
    this.chantPulse = 1
  }

  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    this.chantPulse = Math.max(0, this.chantPulse - dt * 3)
    if (this.bowT >= 0) {
      const before = this.bowT
      this.bowT += dt
      // forehead, palms and knees touch the floor (เบญจางคประดิษฐ์)
      if (before < 0.5 && this.bowT >= 0.5) {
        this.bowDone++
        sfx.click()
        tsfx.pat()
        this.juice.shake(0.06)
        const [x, y] = [this.w / 2, this.footY - 10]
        this.particles.sparkles(x, y - 10, 6, '#fff3a6')
        if (this.bowTotal > 1) this.onBowTouch?.(this.bowDone)
      }
      if (this.bowT > 1.3) {
        this.bowCount--
        if (this.bowCount > 0) this.bowT = 0
        else {
          this.bowT = -1
          this.onBowDone?.()
        }
      }
    }
    const cx = this.w / 2
    if (Math.random() < dt * 5)
      this.particles.add({ kind: 'smoke', x: cx + rand(-2, 2), y: this.buddhaBase + 14, vx: rand(-1, 1), vy: rand(-8, -5), max: rand(1.6, 2.6), color: '#f3eefa' })
    if (this.mode === 'meditate') {
      this.calm = Math.min(1, this.calm + dt * 0.25)
      if (Math.random() < dt * 4) this.particles.add({ kind: 'firefly', x: rand(0, this.w), y: rand(this.h * 0.3, this.h), vx: rand(-2, 2), vy: rand(-6, -2), max: rand(3, 5), color: '#fff3a6' })
    } else this.calm = Math.max(0, this.calm - dt)
    motes(this.particles, dt, this.w, this.floorY, 2.5, '#fff3a6')
    this.critters.update(dt, this.w)
    this.crowd.update(dt)
    this.particles.update(dt)
  }

  private pose(): BaseDollPose {
    if (this.bowT >= 0) {
      const p = this.bowT
      return p > 0.28 && p < 0.95 ? 'bow' : 'kneelWai'
    }
    if (this.mode === 'meditate') return 'sit'
    if (this.mode === 'chant') return 'kneelWai'
    return 'kneel'
  }

  render(g: Surface) {
    const { w, h } = this
    this.juice.begin(g)
    g.draw(this.background(), 0, 0)
    const cx = Math.round(w / 2)
    const fy = this.floorY
    godRays(g, cx, this.buddhaBase - 40, h * 0.6, this.t, '#fff3c4', 0.05 + this.calm * 0.08 + this.chantPulse * 0.05, 10)
    drawCandleStand(g, cx - 50, fy + 4, this.t)
    drawCandleStand(g, cx + 50, fy + 4, this.t)
    softGlow(g, cx - 50, fy - 34, 12, 0.8, '#ffcf7a')
    softGlow(g, cx + 50, fy - 34, 12, 0.8, '#ffcf7a')
    softGlow(g, cx, this.buddhaBase - 40, 44, 0.35 + this.calm * 0.6 + this.chantPulse * 0.3, '#fff3a6')
    drawLightBeams(g, w, h, this.t)
    // Fellow worshippers kneeling further back.
    const npcY = Math.round(fy + (h - fy) * 0.3)
    this.npcs.forEach((look, i) => {
      const pose: BaseDollPose = this.mode === 'meditate' ? 'sit' : this.bowT >= 0 && i === 0 ? this.pose() : Math.sin(this.t * 0.4 + i * 2) > 0.7 ? 'kneelWai' : 'kneel'
      drawPlayer(g, look, pose, 'back', i === 0 ? cx - 44 : cx + 44, npcY, { barefoot: true })
    })
    lightPool(g, cx, this.footY, 50, '#ffe7a0', 0.7 + this.calm)
    // The player, close to the camera.
    const breathe = this.mode === 'meditate' ? Math.round(this.breath) : 0
    const bob = this.chantPulse > 0.6 ? -1 : 0
    this.critters.render(g)
    this.crowd.render(g)
    drawPlayer(g, this.look, this.pose(), 'back', cx, this.footY, { scale: 2, barefoot: true, bob: bob - breathe })
    if (this.calm > 0) {
      g.ctx.save()
      g.ctx.globalAlpha = this.calm * 0.35
      g.ctx.fillStyle = '#1b1530'
      g.ctx.fillRect(0, 0, w, h)
      g.ctx.restore()
      softGlow(g, cx, this.buddhaBase - 40, 50, this.calm, '#ffe7a0')
      const r = 22 + this.breath * 14
      softGlow(g, cx, this.footY - 40, r, this.calm * 0.9, '#fff3c4')
    }
    this.particles.render(g)
    vignette(g, '#1b0a14', 0.45)
    this.juice.end(g)
  }
}

// ---------------------------------------------------------------------------

type View = 'menu' | 'chantList' | 'chanting' | 'meditateSetup' | 'meditating' | 'bowing'

export function HallActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new HallScene(look), { targetWidth: 160 })
  const [view, setView] = useState<View>(req.id === 'meditate' ? 'meditateSetup' : req.id === 'chant' ? 'chantList' : 'menu')
  const [chant, setChant] = useState<Chant | null>(null)
  const [result, setResult] = useState<TempleResultData | null>(null)
  const [minutes, setMinutes] = useState(1)
  useEffect(() => {
    if (scene.current) scene.current.look = look
  }, [look])
  const setMode = (m: Mode) => scene.current && (scene.current.mode = m)
  const close = () => closeActivity()
  const direct = req.id !== 'hall'
  const back = () => {
    setMode('idle')
    if (direct) closeActivity()
    else setView('menu')
  }

  return (
    <div class="activity hall">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="ในอุโบสถ · พระประธาน" onClose={view === 'menu' ? close : back} backLabel={view === 'menu' ? 'ออกจากโบสถ์' : 'กลับ'} />
      {view === 'menu' && (
        <div class="act-bottom">
          <div class="panel hall-menu">
            <div class="small muted center">ถอดรองเท้า นั่งพับเพียบ ตั้งจิตให้สงบ</div>
            <div class="grid3">
              <HallBtn icon="book" label="สวดมนต์" onClick={() => setView('chantList')} />
              <HallBtn icon="meditate" label="นั่งสมาธิ" onClick={() => setView('meditateSetup')} />
              <HallBtn
                icon="wai"
                label="กราบพระ"
                onClick={() => {
                  setView('bowing')
                  setMode('idle')
                  const sc = scene.current
                  if (!sc) return
                  sc.onBowTouch = (n) => {
                    praise(stage.current, sc.w / 2, sc.footY - 70, ['กราบพระพุทธ', 'กราบพระธรรม', 'กราบพระสงฆ์'][n - 1] ?? 'สาธุ', 'gold')
                    sfx.bell(n + 1)
                  }
                  sc.bow(3, () => {
                    const m = addMerit(3, { key: 'bow', free: 1 })
                    haptic(20)
                    setTimeout(() => setResult({ title: 'กราบพระรัตนตรัย ๓ ครั้ง', merit: m, icon: 'wai', pose: 'wai', lines: ['กราบพระพุทธ พระธรรม พระสงฆ์ ด้วยใจเคารพ'], doubleable: false }), 400)
                  })
                }}
              />
              <HallBtn icon="incense" label="ขอพร" onClick={() => openActivity('wish', { place: 'hall', back: 'hall' })} />
              <HallBtn icon="fortune" label="เซียมซี" onClick={() => openActivity('siamsi', { back: 'hall' })} />
              <HallBtn icon="goldleaf" label="ปิดทองพระ" onClick={() => openActivity('gold_leaf', { back: 'hall' })} />
            </div>
          </div>
        </div>
      )}
      {view === 'bowing' && !result && (
        <div class="act-bottom">
          <div class="panel act-tip">กราบแบบเบญจางคประดิษฐ์ ๓ ครั้ง...</div>
        </div>
      )}
      {view === 'chantList' && (
        <ChantList
          onPick={(c) => {
            setChant(c)
            setView('chanting')
            setMode('chant')
          }}
        />
      )}
      {view === 'chanting' && chant && (
        <Chanting
          chant={chant}
          scene={scene.current}
          onDone={(r) => {
            setMode('idle')
            setResult({ ...r, pose: 'kneelWai' })
          }}
        />
      )}
      {view === 'meditateSetup' && (
        <div class="act-bottom">
          <div class="panel hall-menu">
            <div class="subtitle center">นั่งสมาธิ ภาวนา "พุท-โธ"</div>
            <div class="small muted center">หายใจเข้า "พุท" หายใจออก "โธ" ปล่อยใจตามลมหายใจ</div>
            <div class="row" style={{ justifyContent: 'center' }}>
              {[1, 3, 5, 10].map((m) => (
                <button key={m} class={`tab ${minutes === m ? 'active' : ''}`} onClick={() => (sfx.tap(), setMinutes(m))}>
                  {m} นาที
                </button>
              ))}
            </div>
            <Btn
              tone="green"
              block
              onClick={() => {
                setView('meditating')
                setMode('meditate')
                sfx.bell(0)
              }}
            >
              เริ่มนั่งสมาธิ
            </Btn>
          </div>
        </div>
      )}
      {view === 'meditating' && (
        <Meditation
          minutes={minutes}
          scene={scene.current}
          onDone={(r) => {
            setMode('idle')
            setResult({ ...r, pose: 'sit' })
          }}
        />
      )}
      <PraiseLayer />
      {result && (
        <TempleResult
          r={result}
          onDone={() => {
            setResult(null)
            back()
          }}
        />
      )}
    </div>
  )
}

function HallBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button class="panel hall-btn" onClick={() => (sfx.tap(), onClick())}>
      <Icon name={icon} size={30} />
      <span>{label}</span>
    </button>
  )
}

function ChantList({ onPick }: { onPick: (c: Chant) => void }) {
  const lv = level.value.level
  const counts = game.value.daily.counts
  return (
    <div class="act-bottom">
      <div class="panel chant-list scroll">
        <div class="subtitle center">เลือกบทสวดมนต์</div>
        {CHANTS.map((c) => {
          const locked = (c.level ?? 1) > lv
          const done = (counts[`chant:${c.id}`] ?? 0) > 0
          return (
            <button key={c.id} class="panel chant-item" disabled={locked} onClick={() => (sfx.tap(), onPick(c))}>
              <Icon name={locked ? 'lock' : done ? 'check' : 'book'} size={24} />
              <div class="grow" style={{ textAlign: 'left' }}>
                <div class="subtitle">{c.name}</div>
                <div class="small muted">{locked ? `ปลดล็อกที่เลเวล ${c.level}` : c.short}</div>
              </div>
              <span class="chip pink small">+{c.merit} บุญ</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Token {
  text: string
  line: number
  bow: boolean
}

function tokenize(c: Chant): Token[] {
  const out: Token[] = []
  c.lines.forEach((l, li) => {
    for (const w of l.split(/\s+/).filter(Boolean)) {
      if (w === '(กราบ)') {
        if (out.length) out[out.length - 1].bow = true
      } else out.push({ text: w, line: li, bow: false })
    }
  })
  return out
}

function Chanting({ chant, scene, onDone }: { chant: Chant; scene: HallScene | null; onDone: (r: ResultData) => void }) {
  const tokens = useMemo(() => tokenize(chant), [chant.id])
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(false)
  const busy = useRef(false)
  const lineRef = useRef<HTMLDivElement>(null)
  const finished = i >= tokens.length

  const advance = () => {
    if (busy.current || finished) return
    const tk = tokens[i]
    sfx.hum(i)
    haptic(6)
    scene?.pulse()
    scene?.particles.sparkles((scene.w ?? 160) / 2 + rand(-20, 20), (scene.h ?? 300) * 0.3 + rand(-20, 20), 1, '#fff3a6')
    const next = i + 1
    if (tk.bow) {
      busy.current = true
      scene?.bow(1, () => {
        busy.current = false
      })
    }
    setI(next)
    if (next >= tokens.length) {
      setTimeout(() => {
        const m = addMerit(chant.merit, { key: `chant:${chant.id}`, free: 1 })
        track('chant')
        sfx.bell(2)
        onDone({ title: `สวด${chant.name.replace('บท', 'บท')} จบแล้ว`, merit: m, icon: 'book', lines: [chant.meaning] })
      }, 700)
    }
  }

  useEffect(() => {
    if (!auto || finished) return
    const id = setInterval(() => advance(), 520)
    return () => clearInterval(id)
  })

  useEffect(() => {
    const el = lineRef.current?.querySelector('.w.on')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [i])

  const pct = Math.round((i / tokens.length) * 100)
  return (
    <>
      <button class="tap-zone" onClick={advance} aria-label="สวดคำถัดไป" />
      <div class="act-bottom">
        <div class="panel chant-panel">
          <div class="row">
            <div class="subtitle grow">{chant.name}</div>
            <span class="small num">{pct}%</span>
          </div>
          <Bar value={i} max={tokens.length} tone="pink" />
          <div class="chant-text scroll" ref={lineRef}>
            {chant.lines.map((_, li) => (
              <div class="chant-line" key={li}>
                {tokens.map((t, ti) =>
                  t.line === li ? (
                    <Fragment key={ti}>
                      <span class={`w ${ti < i ? 'done' : ti === i ? 'on' : ''}`}>
                        {t.text}
                        {t.bow && <span class="bow-mark"> (กราบ)</span>}
                      </span>{' '}
                    </Fragment>
                  ) : null,
                )}
              </div>
            ))}
          </div>
          <div class="row">
            <Btn tone="paper" class="grow" onClick={() => setAuto(!auto)}>
              {auto ? 'หยุดอัตโนมัติ' : 'สวดอัตโนมัติ'}
            </Btn>
            <Btn tone="green" class="grow" onClick={advance} disabled={finished} silent>
              สวด ๑ คำ
            </Btn>
          </div>
          <div class="small muted center">แตะที่จอเพื่อสวดทีละคำ ตามจังหวะใจ</div>
        </div>
      </div>
    </>
  )
}

function Meditation({ minutes, scene, onDone }: { minutes: number; scene: HallScene | null; onDone: (r: ResultData) => void }) {
  const [elapsed, setElapsed] = useState(0)
  const total = minutes * 60
  const start = useRef(performance.now())
  useEffect(() => {
    const id = setInterval(() => {
      const e = (performance.now() - start.current) / 1000
      setElapsed(e)
      if (scene) scene.breath = (Math.sin((e / 8) * Math.PI * 2 - Math.PI / 2) + 1) / 2
      if (e >= total) {
        clearInterval(id)
        finish(total)
      }
    }, 100)
    return () => clearInterval(id)
  }, [])
  const finish = (secs: number) => {
    const full = Math.floor(secs / 60)
    const m = full > 0 ? addMerit(5 * full, { key: 'meditate', free: 20 }) : 0
    track('meditate_sec', Math.round(secs))
    sfx.bell(0)
    onDone({
      title: full > 0 ? `นั่งสมาธิ ${full} นาที` : 'ใจสงบขึ้นแล้ว',
      merit: m,
      icon: 'meditate',
      lines: [full > 0 ? 'จิตที่สงบเป็นบุญอันประเสริฐ' : 'นั่งให้ครบอย่างน้อย 1 นาทีเพื่อรับบุญ'],
    })
  }
  const cycle = (elapsed % 8) / 8
  const inhale = cycle < 0.5
  const left = Math.max(0, total - elapsed)
  const mm = Math.floor(left / 60)
  const ss = Math.floor(left % 60)
  const scale = 0.7 + 0.3 * (scene?.breath ?? 0)
  return (
    <>
      <div class="act-center">
        <div class="breath" style={{ transform: `scale(${scale})` }}>
          <span>{inhale ? 'พุท' : 'โธ'}</span>
        </div>
      </div>
      <div class="act-bottom">
        <div class="panel act-tip">
          <div class="subtitle">{inhale ? 'หายใจเข้า... พุท' : 'หายใจออก... โธ'}</div>
          <div class="num title">
            {mm}:{String(ss).padStart(2, '0')}
          </div>
          <Btn tone="paper" onClick={() => finish(elapsed)}>
            จบการนั่งสมาธิ
          </Btn>
        </div>
      </div>
    </>
  )
}
