// ขูดเลข – wai to Mae Takhian, sprinkle baby powder on the sacred tree's bark
// and rub it with your palm until lucky numbers appear. You see yourself from
// over the shoulder, reaching up to the trunk. For fun only; nothing here is
// a bet.

import { useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, ditherOn, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import type { AvatarLook } from '../art/avatar'
import { drawPlayer, handAt, impactBurst, Juice, motes, softGlow, vignette, type TPose } from '../art/minigames/temple'
import { tsfx } from '../art/minigames/sfx'
import { game, mutate } from '../game/state'
import { addMerit, adsLeft, lotteryLeft, rewardAd, spendCoins, useLottery } from '../game/actions'
import { toThaiDigits } from '../game/data/fortunes'
import { ads } from '../services/ads'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { Btn, Coin, Icon, Modal } from '../ui/components/common'
import { toast } from '../game/events'
import { sfx, haptic } from '../engine/audio'
import { PraiseLayer, banner } from './temple-ui'

const EXTRA_PRICE = 15

// 5×7 digits for the embossed numbers.
const D57: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
}

class TreeScene implements Scene {
  w = 150
  h = 320
  t = 0
  three = '000'
  two = '00'
  active = false
  revealed = false
  particles = new Particles()
  juice = new Juice()
  onProgress?: (p: number) => void
  onReveal?: () => void
  /** Pointer while rubbing (null when the finger is up). */
  finger: [number, number] | null = null
  rubT = 0
  waiT = 0
  sprinkleT = 0
  revealT = 0
  private bark: HTMLCanvasElement | null = null
  private cell = 2
  private mask: Uint8Array = new Uint8Array(0)
  private cols = 0
  private rows = 0
  private down = false
  private strokes: Uint8Array = new Uint8Array(0)
  private zoneCanvas: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bark = null
    this.setupMask()
  }
  get zone() {
    const zw = Math.min(this.w - 20, 116)
    return { x: Math.round((this.w - zw) / 2), y: Math.round(this.h * 0.29), w: zw, h: 76 }
  }
  /** Top of the over-the-shoulder player sprite (2x). */
  get playerFoot() {
    const z = this.zone
    return Math.max(Math.round(this.h * 0.5), z.y + z.h + 2) + 104
  }
  get playerX() {
    return Math.round(this.w * 0.3)
  }
  private setupMask() {
    const z = this.zone
    this.cols = Math.ceil(z.w / this.cell)
    this.rows = Math.ceil(z.h / this.cell)
    this.mask = new Uint8Array(this.cols * this.rows)
  }
  /** Wai to ask permission, then sprinkle powder over the bark. */
  prepare() {
    this.waiT = 0.9
    this.sprinkleT = 0
    setTimeout(() => {
      this.sprinkleT = 1.1
      tsfx.puff()
      setTimeout(() => tsfx.puff(), 350)
    }, 700)
  }
  begin(three: string, two: string) {
    this.three = three
    this.two = two
    this.active = true
    this.revealed = false
    this.revealT = 0
    this.setupMask()
    const z = this.zone
    this.strokes = new Uint8Array(z.w * z.h)
    for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) this.strokes[y * z.w + x] = this.stroke(z.x + x, z.y + y) ? 1 : 0
    this.zoneCanvas = bake(z.w, z.h, (g) => {
      for (let y = 0; y < z.h; y++)
        for (let x = 0; x < z.w; x++) if (this.strokes[y * z.w + x] && ditherOn(x, y, 0.12)) g.px(x, y, '#6e5040')
    })
  }

  /** Paint one revealed mask cell into the cached zone canvas. */
  private paintCell(cx: number, cy: number) {
    const z = this.zone
    const ctx = this.zoneCanvas?.getContext('2d')
    if (!ctx) return
    for (let yy = 0; yy < this.cell; yy++)
      for (let xx = 0; xx < this.cell; xx++) {
        const x = cx * this.cell + xx
        const y = cy * this.cell + yy
        if (x >= z.w || y >= z.h) continue
        ctx.fillStyle = this.strokes[y * z.w + x] ? '#4a3128' : ditherOn(x, y, 0.8) ? '#f7f2ea' : '#e9dfd2'
        ctx.fillRect(x, y, 1, 1)
      }
  }
  /** Is (x, y) on a digit stroke? */
  private stroke(x: number, y: number): boolean {
    const z = this.zone
    const S = 3
    const row = (text: string, top: number) => {
      const wTot = text.length * 5 * S + (text.length - 1) * 4
      const left = z.x + Math.round((z.w - wTot) / 2)
      if (y < top || y >= top + 7 * S) return false
      for (let i = 0; i < text.length; i++) {
        const gx = left + i * (5 * S + 4)
        if (x >= gx && x < gx + 5 * S) {
          const gl = D57[text[i]]
          return gl[Math.floor((y - top) / S)][Math.floor((x - gx) / S)] === '#'
        }
      }
      return false
    }
    return row(this.three, z.y + 6) || row(this.two, z.y + 6 + 7 * S + 8)
  }
  private barkLayer() {
    if (this.bark) return this.bark
    const { w, h } = this
    this.bark = bake(w, h, (g) => {
      g.rect(0, 0, w, h, '#7a5a48')
      for (let x = 0; x < w; x++) {
        const n = Math.sin(x * 0.9) + Math.sin(x * 0.37 + 1)
        for (let y = 0; y < h; y++) {
          const v = n + Math.sin(y * 0.05 + x * 0.3) * 0.6
          if (v > 1.2) g.px(x, y, '#5e4436')
          else if (v < -1.3) g.px(x, y, '#937060')
        }
      }
      // Round trunk shading at both sides.
      for (let x = 0; x < 16; x++) {
        g.alpha(0.5 * (1 - x / 16))
        g.vline(x, 0, h, '#2e1e18')
        g.vline(w - 1 - x, 0, h, '#2e1e18')
      }
      g.alpha(1)
      // Three-colour cloth wrapped around the trunk.
      const cy = Math.round(h * 0.14)
      const cols = ['#e8514a', '#ffd23f', '#6cc36a']
      cols.forEach((c, i) => {
        g.rect(0, cy + i * 7, w, 7, c)
        g.hline(0, w - 1, cy + i * 7 + 6, 'rgba(58,40,56,0.35)')
        for (let x = (i * 3) % 7; x < w; x += 7) g.px(x, cy + i * 7 + 2, 'rgba(255,255,255,0.35)')
      })
      // Garland hanging from the cloth.
      for (let x = 10; x < w - 10; x += 4) {
        const y = cy + 22 + Math.round(Math.sin(((x - 10) / (w - 20)) * Math.PI) * 10)
        g.circle(x, y, 1.6, x % 8 < 4 ? P.orange : P.yellow)
      }
      // Roots and ground offerings (mostly under the panel).
      g.rect(0, Math.round(h * 0.84), w, h, '#6b4f41')
      g.rect(0, Math.round(h * 0.9), w, h, '#86c95f')
      for (let i = 0; i < 4; i++) {
        const x = 16 + i * 36
        g.rect(x, Math.round(h * 0.86), 10, 8, i % 2 ? '#ff9fc0' : '#ffd6e0')
        g.rect(x + 3, Math.round(h * 0.84), 4, 3, '#fcd0b1')
      }
      // Faint embossed number frame.
      const z = this.zone
      g.frame(z.x - 2, z.y - 2, z.w + 4, z.h + 4, '#6b4f41')
      g.frame(z.x - 3, z.y - 3, z.w + 6, z.h + 6, '#8a6a58')
    })
    return this.bark
  }
  pointer(e: PointerInfo) {
    if (e.type === 'down') this.down = true
    if (e.type === 'up' || e.type === 'cancel') {
      this.down = false
      this.finger = null
    }
    if (!this.down || !this.active || this.revealed) return
    this.finger = [e.x, e.y]
    const z = this.zone
    const r = 7
    let changed = 0
    for (let dy = -r; dy <= r; dy += 1)
      for (let dx = -r; dx <= r; dx += 1) {
        if (dx * dx + dy * dy > r * r) continue
        const cx = Math.floor((e.x + dx - z.x) / this.cell)
        const cy = Math.floor((e.y + dy - z.y) / this.cell)
        if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) continue
        const i = cy * this.cols + cx
        if (!this.mask[i]) {
          this.mask[i] = 1
          this.paintCell(cx, cy)
          changed++
        }
      }
    if (changed) {
      this.rubT = 0.25
      if (Math.random() < 0.3) sfx.scratch()
      if (Math.random() < 0.5) this.particles.add({ kind: 'dot', x: e.x + rand(-4, 4), y: e.y, vx: rand(-8, 8), vy: rand(-4, 10), g: 40, max: 0.6, color: '#fffaf0' })
      if (Math.random() < 0.15) this.particles.add({ kind: 'smoke', x: e.x + rand(-3, 3), y: e.y, vx: rand(-4, 4), vy: rand(-8, -2), max: 0.8, color: '#ffffff', size: 2 })
      let n = 0
      for (let i = 0; i < this.mask.length; i++) n += this.mask[i]
      const p = n / this.mask.length
      this.onProgress?.(p)
      if (p > 0.55) this.reveal()
    }
  }
  reveal() {
    if (this.revealed) return
    this.revealed = true
    this.revealT = 0
    for (let cy = 0; cy < this.rows; cy++) for (let cx = 0; cx < this.cols; cx++) if (!this.mask[cy * this.cols + cx]) this.paintCell(cx, cy)
    this.mask.fill(1)
    const z = this.zone
    this.particles.confetti(z.x + z.w / 2, z.y + z.h / 2, 40, ['#fff3a6', '#ffd54f', '#ffffff', '#ff9fc0'])
    impactBurst(this.particles, z.x + z.w / 2, z.y + z.h / 2, '#fff3a6', 16)
    this.juice.shake(0.3)
    this.juice.flash('#fff8d8', 0.2)
    this.juice.hitstop(0.08)
    sfx.chime()
    tsfx.shimmer()
    haptic(40)
    this.onReveal?.()
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    this.rubT = Math.max(0, this.rubT - dt)
    this.waiT = Math.max(0, this.waiT - dt)
    if (this.revealed) this.revealT += dt
    if (this.sprinkleT > 0) {
      this.sprinkleT -= dt
      const z = this.zone
      for (let i = 0; i < 3; i++) this.particles.add({ kind: 'dot', x: z.x + rand(0, z.w), y: z.y - 6 + rand(-4, 4), vy: rand(20, 50), vx: rand(-6, 6), g: 30, max: rand(0.8, 1.6), color: '#ffffff' })
      if (Math.random() < 0.5) this.particles.add({ kind: 'smoke', x: z.x + rand(0, z.w), y: z.y + rand(0, z.h), vx: rand(-4, 4), vy: rand(-6, 2), max: 1.2, color: '#ffffff', size: 2 })
    }
    if (this.revealed && Math.random() < dt * 10) {
      const z = this.zone
      this.particles.sparkles(z.x + rand(0, z.w), z.y + rand(0, z.h), 1, '#fff3a6')
    }
    motes(this.particles, dt, this.w, this.h * 0.7, 1.5, '#fff8d8')
    this.particles.update(dt)
  }
  render(g: Surface) {
    this.juice.begin(g)
    g.draw(this.barkLayer(), 0, 0)
    // a warm shaft of light across the trunk
    g.ctx.save()
    g.ctx.globalCompositeOperation = 'lighter'
    g.ctx.globalAlpha = 0.07
    g.ctx.fillStyle = '#fff3c4'
    g.ctx.beginPath()
    g.ctx.moveTo(this.w * 0.55 - g.ox, -g.oy)
    g.ctx.lineTo(this.w - g.ox, -g.oy)
    g.ctx.lineTo(this.w * 0.35 - g.ox, this.h - g.oy)
    g.ctx.lineTo(-g.ox, this.h - g.oy)
    g.ctx.fill()
    g.ctx.restore()
    const z = this.zone
    if (this.active && this.zoneCanvas) g.draw(this.zoneCanvas, z.x, z.y)
    if (this.revealed) softGlow(g, z.x + z.w / 2, z.y + z.h / 2, 60, 0.5 + Math.sin(this.t * 3) * 0.15, '#fff3a6')
    vignette(g, '#1b1008', 0.5)
    // The player seen over the shoulder, reaching up to the bark.
    const f = this.finger
    let pose: TPose | 'wai' | 'stand' = 'stand'
    let flip = false
    if (this.waiT > 0) pose = 'wai'
    else if (this.sprinkleT > 0) pose = 'powder'
    else if (f) {
      flip = f[0] < this.playerX - 4
      pose = this.rubT > 0 ? (Math.floor(this.t * 9) % 2 ? 'rub_a' : 'rub_b') : 'rub_b'
    } else if (this.revealed && this.revealT < 2) pose = 'cheer'
    const pl = drawPlayer(g, this.look, pose, 'back', this.playerX, this.playerFoot, { scale: 2, flip, shadow: false })
    if (pose === 'powder') {
      // shaking a bottle of baby powder
      const [hx, hy] = handAt(pl, -1)
      const shake = Math.round(Math.sin(this.t * 30) * 2)
      g.rect(hx - 4 + shake, hy - 14, 8, 14, '#fff3f8')
      g.rect(hx - 4 + shake, hy - 14, 8, 3, '#ff9fc0')
      g.rect(hx - 2 + shake, hy - 17, 4, 3, '#e8709e')
      g.rect(hx - 3 + shake, hy - 9, 6, 4, '#bfe6f2')
    }
    if (f) {
      // palm and powder puff on the bark under your finger
      const [x, y] = f
      g.ellipse(x, y, 5, 4, '#ffffff')
      g.ellipse(x - 1, y - 1, 3, 2.4, '#fff3f8')
      g.px(x + 2, y + 2, '#e9dfd2')
      softGlow(g, x, y, 7, 0.5, '#ffffff')
    }
    this.particles.render(g)
    this.juice.end(g)
  }
}

export function LotteryActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new TreeScene(look), { targetWidth: 150 })
  const [nums, setNums] = useState<{ two: string; three: string } | null>(null)
  const [progress, setProgress] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [merit, setMerit] = useState(0)
  const left = lotteryLeft()
  void req

  const start = () => {
    const n = useLottery('tree')
    if (!n) return
    setNums(n)
    setRevealed(false)
    setProgress(0)
    const sc = scene.current
    if (!sc) return
    sc.prepare()
    sc.begin(n.three, n.two)
    sc.onProgress = (p) => setProgress(p)
    sc.onReveal = () => {
      setProgress(1)
      setMerit(addMerit(3, { key: 'lottery', free: 1 }))
      banner(stage.current, 'เลขมาแล้ว!', 'gold')
      setTimeout(() => setRevealed(true), 1500)
    }
    sfx.whoosh()
  }

  const extraByAd = async () => {
    const r = await ads().showRewarded('extra_lottery')
    if (!r.rewarded) return
    rewardAd('bonus')
    mutate((d) => {
      d.daily.lotteryExtra += 1
    })
    toast('ได้สิทธิ์ขูดเลขเพิ่ม 1 ครั้ง', 'powder')
  }
  const extraByCoins = () => {
    if (!spendCoins(EXTRA_PRICE)) return
    mutate((d) => {
      d.daily.lotteryExtra += 1
    })
    toast('ได้สิทธิ์ขูดเลขเพิ่ม 1 ครั้ง', 'powder')
  }

  const copy = async () => {
    if (!nums) return
    const text = `เลขมงคลจากต้นตะเคียนวัดศรีบุญดี: ${nums.three} / ${nums.two} (บุญดี)`
    try {
      await navigator.clipboard.writeText(text)
      toast('คัดลอกเลขแล้ว', 'check')
    } catch {
      toast(text, 'number', 'info')
    }
  }

  const log = game.value.lotteryLog.slice(0, 5)
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="ขูดเลขต้นตะเคียนทอง" onClose={closeActivity} />
      <PraiseLayer />
      <div class="act-bottom" style={nums && revealed ? { display: 'none' } : undefined}>
        <div class="panel act-tip">
          {!nums ? (
            <>
              <div class="subtitle">ไหว้ขอขมาแม่ตะเคียน แล้วโรยแป้งลูบต้น</div>
              <div class="small muted">วันนี้เหลือสิทธิ์ {left} ครั้ง</div>
              {left > 0 ? (
                <Btn tone="green" block onClick={start}>
                  <Icon name="powder" size={18} /> ไหว้ แล้วโรยแป้ง
                </Btn>
              ) : (
                <div class="row">
                  {adsLeft() > 0 && (
                    <Btn tone="blue" class="grow" onClick={extraByAd}>
                      <Icon name="tv" size={16} /> ดูโฆษณา +1
                    </Btn>
                  )}
                  <Btn tone="paper" class="grow" onClick={extraByCoins}>
                    +1 ครั้ง <Coin n={EXTRA_PRICE} />
                  </Btn>
                </div>
              )}
            </>
          ) : !revealed ? (
            <>
              <div class="subtitle">ใช้นิ้วลูบแป้งบนเปลือกไม้</div>
              <div class="bar" style={{ margin: '6px 4px' }}>
                <span style={{ width: `${Math.min(100, (progress / 0.55) * 100)}%` }} />
              </div>
              <Btn tone="paper" block onClick={() => scene.current?.reveal()}>
                ลูบแรง ๆ ทีเดียว
              </Btn>
            </>
          ) : null}
          {log.length > 0 && !nums && (
            <div class="small muted">
              สมุดเลขเด็ด: {log.map((l) => l.nums.join('/')).join(' · ')}
            </div>
          )}
        </div>
      </div>
      {nums && revealed && (
        <Modal onClose={closeActivity}>
          <div class="center col">
            <div class="small muted">เลขมงคลวันนี้จากต้นตะเคียนทอง</div>
            <div class="lucky-row">
              {nums.three.split('').map((d, i) => (
                <span class="lucky-digit" key={i}>
                  {d}
                </span>
              ))}
            </div>
            <div class="lucky-row small2">
              {nums.two.split('').map((d, i) => (
                <span class="lucky-digit pink" key={i}>
                  {d}
                </span>
              ))}
            </div>
            <div class="subtitle">
              {toThaiDigits(nums.three)} · {toThaiDigits(nums.two)}
            </div>
            {merit > 0 && <div class="small">ขอบคุณแม่ตะเคียน +{merit} บุญ</div>}
            <div class="small muted">เลขมงคลเพื่อความบันเทิงและเป็นกำลังใจเท่านั้น ไม่ใช่การชี้นำการเสี่ยงโชค</div>
            <div class="row">
              <Btn tone="paper" class="grow" onClick={copy}>
                คัดลอกเลข
              </Btn>
              <Btn
                tone="green"
                class="grow"
                onClick={() => {
                  setNums(null)
                  if (scene.current) scene.current.active = false
                }}
              >
                ขูดอีกครั้ง
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
