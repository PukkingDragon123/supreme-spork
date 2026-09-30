// ปิดทอง – you stand before the Buddha image holding a sheet of gold leaf and
// press it on with your fingertips, front or back (ปิดทองหลังพระ). Seen over
// your shoulder; the leaf follows your finger and the gold spreads under it.

import { useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, createCanvas, ditherOn, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { drawBuddha, drawBuddhaBack, BRONZE, GOLD, drawCandleStand } from '../art/interior'
import { P } from '../art/palette'
import type { AvatarLook } from '../art/avatar'
import { drawLeafSheet, drawPlayer, godRays, handAt, impactBurst, Juice, motes, softGlow, vignette, type TPose } from '../art/minigames/temple'
import { starsFrom } from '../art/minigames/rules'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { addMerit, count, track, useItem } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { Btn, Icon } from '../ui/components/common'
import { QuickBuy } from './quickbuy'
import { sfx, haptic } from '../engine/audio'
import { PraiseLayer, TempleResult, banner, praise, type TempleResultData } from './temple-ui'

const SHEET_CAPACITY = 900

class GoldScene implements Scene {
  w = 160
  h = 320
  t = 0
  back = false
  sheet = 0
  /** Pixels of this sheet that landed on bare bronze (not already gilded). */
  fresh = 0
  particles = new Particles()
  juice = new Juice()
  finger: [number, number] | null = null
  pressT = 0
  doneT = 0
  turnT = 0
  onSheetUsed?: () => void
  private layers: Record<string, HTMLCanvasElement> = {}
  private masks: Record<string, HTMLCanvasElement> = {}
  private pointerDown = false
  private tmp: HTMLCanvasElement | null = null
  private bg: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {}
  resize(w: number, h: number) {
    this.tmp = null
    this.bg = null
    this.w = w
    this.h = h
    this.layers = {}
    this.masks = {}
  }
  get cx() {
    return Math.round(this.w / 2)
  }
  get baseY() {
    return Math.round(this.h * 0.6)
  }
  get playerX() {
    return Math.round(this.w * 0.22)
  }
  get playerFoot() {
    return Math.round(this.h * 0.6) + 104
  }
  private layer(kind: 'bronze' | 'gold', back: boolean) {
    const k = `${kind}:${back}`
    if (!this.layers[k]) {
      this.layers[k] = bake(this.w, this.h, (g) => {
        const pal = kind === 'gold' ? GOLD : BRONZE
        if (back) drawBuddhaBack(g, this.cx, this.baseY, 1.35, pal)
        else drawBuddha(g, this.cx, this.baseY, 1.35, pal)
      })
    }
    return this.layers[k]
  }
  private mask(back: boolean) {
    const k = String(back)
    if (!this.masks[k]) this.masks[k] = createCanvas(this.w, this.h)
    return this.masks[k]
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const cx = this.cx
    const by = this.baseY
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h, ['#3a1220', '#6e1f30', '#8e2a3c'])
      for (let y = 6; y < h * 0.6; y += 10) for (let x = ((y / 10) % 2) * 5; x < w; x += 10) g.px(x, y, '#9a3a44')
      // Pedestal draped in cloth, with gilt-flecked panels.
      g.rect(cx - 50, by, 100, 10, '#b8343f')
      g.rect(cx - 50, by, 100, 2, P.gold)
      g.rect(cx - 44, by + 10, 88, h - by - 10, '#7e2436')
      for (let x = cx - 44; x < cx + 44; x += 6) g.px(x, by + 5, P.gold)
      for (let i = 0; i < 9; i++) {
        const x = cx - 40 + i * 10
        g.poly([[x, by + 22], [x + 5, by + 13], [x + 10, by + 22]], i % 2 ? '#c0392b' : '#a8313f')
        g.line(x, by + 22, x + 5, by + 13, P.goldD)
        g.line(x + 5, by + 13, x + 10, by + 22, P.goldD)
      }
      g.rect(cx - 44, by + 22, 88, 2, P.goldD)
      // Old gold leaf flakes stuck around the base by earlier visitors.
      for (let i = 0; i < 30; i++) g.px(cx - 40 + ((i * 37) % 80), by + 12 + ((i * 13) % 30), i % 3 ? P.goldD : P.gold)
    })
    return this.bg
  }
  pointer(e: PointerInfo) {
    if (e.type === 'down') this.pointerDown = true
    if (e.type === 'up' || e.type === 'cancel') {
      this.pointerDown = false
      this.finger = null
    }
    if (!this.pointerDown || this.sheet <= 0) return
    if (e.type !== 'down' && e.type !== 'move') return
    this.finger = [e.x, e.y]
    const mc = this.mask(this.back).getContext('2d', { willReadFrequently: true })!
    const body = this.layer('bronze', this.back).getContext('2d', { willReadFrequently: true })!
    const r = 5
    const x0 = Math.round(e.x - r)
    const y0 = Math.round(e.y - r)
    const size = r * 2 + 1
    const data = body.getImageData(x0, y0, size, size).data
    const had = mc.getImageData(x0, y0, size, size).data
    let painted = 0
    let fresh = 0
    mc.fillStyle = '#fff'
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue
        const x = Math.round(e.x + dx)
        const y = Math.round(e.y + dy)
        const i = ((dy + r) * size + (dx + r)) * 4 + 3
        if (data[i] > 0 && (dx * dx + dy * dy < (r - 2) * (r - 2) || ditherOn(x, y, 0.5))) {
          if (!had[i]) fresh++
          mc.fillRect(x, y, 1, 1)
          painted++
        }
      }
    if (painted > 0) {
      this.pressT = 0.2
      this.sheet -= painted
      this.fresh += fresh
      if (Math.random() < 0.3) this.particles.sparkles(e.x, e.y, 1, P.goldL)
      if (Math.random() < 0.15) sfx.scratch()
      if (Math.random() < 0.08) tsfx.pat()
      if (this.sheet <= 0) {
        this.sheet = 0
        this.finger = null
        this.doneT = 1.4
        impactBurst(this.particles, e.x, e.y, '#fff3a6', 14)
        this.juice.shake(0.2)
        this.juice.flash('#fff3a6', 0.18)
        this.onSheetUsed?.()
      }
    }
  }
  /** Walk around to the other side of the image. */
  turn(back: boolean) {
    this.back = back
    this.turnT = 0.5
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    this.pressT = Math.max(0, this.pressT - dt)
    this.doneT = Math.max(0, this.doneT - dt)
    this.turnT = Math.max(0, this.turnT - dt)
    motes(this.particles, dt, this.w, this.baseY, 2.5, '#ffe7a0')
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    this.juice.begin(g)
    g.draw(this.background(), 0, 0)
    const cx = this.cx
    const by = this.baseY
    godRays(g, cx, by - 70, h * 0.6, this.t, '#ffcf7a', 0.06, 10)
    softGlow(g, cx, by - 60, 60, 0.35, '#ffcf7a')
    drawCandleStand(g, 14, by + 10, this.t)
    drawCandleStand(g, w - 14, by + 10, this.t)
    softGlow(g, 14, by - 36, 10, 0.8, '#ffcf7a')
    softGlow(g, w - 14, by - 36, 10, 0.8, '#ffcf7a')
    const slide = this.turnT > 0 ? Math.round(Math.sin((this.turnT / 0.5) * Math.PI) * 10) : 0
    g.draw(this.layer('bronze', this.back), slide, 0)
    // Gold where the mask has been rubbed.
    if (!this.tmp) this.tmp = createCanvas(w, h)
    const tmp = this.tmp
    const tc = tmp.getContext('2d')!
    tc.globalCompositeOperation = 'source-over'
    tc.clearRect(0, 0, w, h)
    tc.drawImage(this.layer('gold', this.back), 0, 0)
    tc.globalCompositeOperation = 'destination-in'
    tc.drawImage(this.mask(this.back), 0, 0)
    // a glint sweeping across the gilded parts
    tc.globalCompositeOperation = 'source-atop'
    tc.fillStyle = 'rgba(255,255,255,0.55)'
    const gx = ((this.t * 40) % (w + 80)) - 40
    tc.beginPath()
    tc.moveTo(gx, 0)
    tc.lineTo(gx + 6, 0)
    tc.lineTo(gx - 40, h)
    tc.lineTo(gx - 46, h)
    tc.fill()
    g.draw(tmp, slide, 0)
    if (Math.sin(this.t * 3) > 0.9) this.particles.sparkles(cx + (Math.random() - 0.5) * 50, by - 20 - Math.random() * 80, 1, '#ffffff')
    vignette(g, '#1b0a14', 0.5)
    // The player over the shoulder, gold leaf in hand.
    const f = this.finger
    let pose: TPose = 'leaf_hold'
    let flip = false
    if (this.doneT > 0) pose = 'cheer'
    else if (f) {
      flip = f[0] < this.playerX - 4
      pose = this.pressT > 0 ? (Math.floor(this.t * 8) % 2 ? 'press_a' : 'press_b') : 'press_b'
    }
    const pl = drawPlayer(g, this.look, pose, 'back', this.playerX, this.playerFoot, { scale: 2, flip, shadow: false })
    if (pose === 'leaf_hold' && this.sheet > 0) {
      const [hx, hy] = handAt(pl, -1)
      drawLeafSheet(g, hx + 1, hy - 7, this.t, 2)
      softGlow(g, hx, hy - 7, 8, 0.6, '#fff3a6')
    }
    if (f) {
      // the leaf under your fingertip, getting smaller as it's used
      const k = Math.max(0.3, this.sheet / SHEET_CAPACITY)
      const s = Math.max(1, Math.round(3 * k))
      g.rect(f[0] - s, f[1] - s, s * 2 + 1, s * 2 + 1, P.gold)
      g.rect(f[0] - s, f[1] - s, s, s, P.goldL)
      softGlow(g, f[0], f[1], 8, 0.7, '#fff3a6')
    }
    this.particles.render(g)
    this.juice.end(g)
  }
}

export function GoldLeafActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new GoldScene(look), { targetWidth: 160 })
  const [back, setBack] = useState(false)
  const [active, setActive] = useState(false)
  const [sheets, setSheets] = useState(0)
  const [left, setLeft] = useState(SHEET_CAPACITY)
  const [result, setResult] = useState<TempleResultData | null>(null)
  const [buy, setBuy] = useState(false)
  const [backDone, setBackDone] = useState(false)
  void req

  const useSheet = () => {
    if (!useItem('gold_leaf')) {
      setBuy(true)
      return
    }
    const sc = scene.current
    if (!sc) return
    sc.sheet = SHEET_CAPACITY
    sc.fresh = 0
    setActive(true)
    setLeft(SHEET_CAPACITY)
    sfx.sparkle()
    const poll = window.setInterval(() => {
      if (!scene.current || scene.current.sheet <= 0) clearInterval(poll)
      else setLeft(scene.current.sheet)
    }, 120)
    sc.onSheetUsed = () => {
      clearInterval(poll)
      setActive(false)
      setLeft(0)
      setSheets((n) => n + 1)
      haptic(20)
      const m = addMerit(12, { key: 'gold_leaf', free: 5 })
      track('gold_leaf')
      sfx.chime()
      const spread = sc.fresh / SHEET_CAPACITY
      const stars = starsFrom(spread, [0.2, 0.55, 0.8])
      if (stars >= 3) praise(stage.current, sc.w / 2, sc.h * 0.3, 'ทั่วถึงงดงาม!', 'gold')
      banner(stage.current, 'ปิดทองแล้ว!', 'gold')
      const common = { merit: m, icon: 'goldleaf', stars, lines: [] as string[] }
      setTimeout(() => {
        if (sc.back) {
          track('gold_back')
          setBackDone(true)
          setResult({ ...common, title: 'ปิดทองหลังพระ', lines: ['ทำความดีโดยไม่หวังให้ใครเห็น', 'แต่ความดีนั้นงดงามและยิ่งใหญ่เสมอ'] })
        } else setResult({ ...common, title: 'ปิดทององค์พระแล้ว', lines: ['ขอให้ชีวิตรุ่งเรืองดั่งทองคำ', stars >= 2 ? 'ปิดได้ทั่วองค์ สวยมาก' : 'ลองกระจายทองให้ทั่ว ๆ นะ'] })
      }, 900)
    }
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={back ? 'ปิดทองหลังพระ' : 'ปิดทององค์พระ'} onClose={closeActivity} />
      <PraiseLayer />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {active ? (
              <>
                <div class="subtitle">ใช้นิ้วกดแผ่นทองลงบนองค์พระ</div>
                <div class="small muted">กระจายให้ทั่ว ส่วนที่ยังไม่มีทองได้ดาวมากกว่า</div>
                <div class="bar" style={{ margin: '6px 4px' }}>
                  <span style={{ width: `${(left / SHEET_CAPACITY) * 100}%` }} />
                </div>
              </>
            ) : (
              <>
                <div class="subtitle">{back ? 'ด้านหลังองค์พระ ที่ไม่มีใครเห็น' : 'องค์พระพุทธรูปศักดิ์สิทธิ์'}</div>
                <div class="small muted">มีทองคำเปลว {count('gold_leaf')} แผ่น · ปิดไปแล้ว {sheets} แผ่น</div>
                <div class="row">
                  <Btn
                    tone="paper"
                    class="grow"
                    onClick={() => {
                      const b = !back
                      setBack(b)
                      scene.current?.turn(b)
                      sfx.whoosh()
                    }}
                  >
                    {back ? 'หันด้านหน้า' : 'ไปด้านหลังองค์พระ'}
                  </Btn>
                  <Btn tone="green" class="grow" onClick={useSheet}>
                    <Icon name="goldleaf" size={18} /> ใช้ทองคำเปลว
                  </Btn>
                </div>
                {backDone && <div class="small center">ปลดล็อกเหรียญตรา “ปิดทองหลังพระ” แล้ว</div>}
              </>
            )}
          </div>
        </div>
      )}
      {buy && <QuickBuy ids={['gold_leaf']} title="ทองคำเปลวหมดแล้ว" onClose={() => setBuy(false)} />}
      {result && <TempleResult r={result} onDone={() => setResult(null)} again={{ label: 'ปิดทองอีกแผ่น', run: () => (setResult(null), useSheet()) }} />}
    </div>
  )
}
