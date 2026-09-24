// ขูดเลข – rub baby powder on the sacred tree's bark until lucky numbers
// appear. For fun only; nothing here is a bet.

import { useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, ditherOn, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import { game, mutate } from '../game/state'
import { addMerit, adsLeft, lotteryLeft, rewardAd, spendCoins, useLottery } from '../game/actions'
import { toThaiDigits } from '../game/data/fortunes'
import { ads } from '../services/ads'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { Btn, Coin, Icon, Modal } from '../ui/components/common'
import { toast } from '../game/events'
import { sfx, haptic } from '../engine/audio'

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
  onProgress?: (p: number) => void
  onReveal?: () => void
  private bark: HTMLCanvasElement | null = null
  private cell = 2
  private mask: Uint8Array = new Uint8Array(0)
  private cols = 0
  private rows = 0
  private down = false
  private strokes: Uint8Array = new Uint8Array(0)
  private zoneCanvas: HTMLCanvasElement | null = null
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bark = null
    this.setupMask()
  }
  get zone() {
    const zw = Math.min(this.w - 20, 116)
    return { x: Math.round((this.w - zw) / 2), y: Math.round(this.h * 0.36), w: zw, h: 76 }
  }
  private setupMask() {
    const z = this.zone
    this.cols = Math.ceil(z.w / this.cell)
    this.rows = Math.ceil(z.h / this.cell)
    this.mask = new Uint8Array(this.cols * this.rows)
  }
  begin(three: string, two: string) {
    this.three = three
    this.two = two
    this.active = true
    this.revealed = false
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
      // Three-colour cloth wrapped around the trunk.
      const cy = Math.round(h * 0.2)
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
      // Roots and ground offerings.
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
    })
    return this.bark
  }
  pointer(e: PointerInfo) {
    if (e.type === 'down') this.down = true
    if (e.type === 'up' || e.type === 'cancel') this.down = false
    if (!this.down || !this.active || this.revealed) return
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
      if (Math.random() < 0.3) sfx.scratch()
      if (Math.random() < 0.4) this.particles.add({ kind: 'dot', x: e.x + rand(-4, 4), y: e.y, vx: rand(-8, 8), vy: rand(-4, 10), g: 40, max: 0.6, color: '#fffaf0' })
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
    for (let cy = 0; cy < this.rows; cy++) for (let cx = 0; cx < this.cols; cx++) if (!this.mask[cy * this.cols + cx]) this.paintCell(cx, cy)
    this.mask.fill(1)
    const z = this.zone
    this.particles.confetti(z.x + z.w / 2, z.y + z.h / 2, 40, ['#fff3a6', '#ffd54f', '#ffffff', '#ff9fc0'])
    sfx.chime()
    haptic(40)
    this.onReveal?.()
  }
  update(dt: number) {
    this.t += dt
    if (this.revealed && Math.random() < dt * 10) {
      const z = this.zone
      this.particles.sparkles(z.x + rand(0, z.w), z.y + rand(0, z.h), 1, '#fff3a6')
    }
    this.particles.update(dt)
  }
  render(g: Surface) {
    g.draw(this.barkLayer(), 0, 0)
    const z = this.zone
    if (this.active && this.zoneCanvas) g.draw(this.zoneCanvas, z.x, z.y)
    this.particles.render(g)
  }
}

export function LotteryActivity({ req }: { req: ActivityRequest }) {
  const { host, scene } = useStage(() => new TreeScene(), { targetWidth: 150 })
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
    sc.begin(n.three, n.two)
    sc.onProgress = (p) => setProgress(p)
    sc.onReveal = () => {
      setRevealed(true)
      setMerit(addMerit(3, { key: 'lottery', free: 1 }))
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
      <div class="act-bottom">
        <div class="panel act-tip">
          {!nums ? (
            <>
              <div class="subtitle">ไหว้ขอขมาแม่ตะเคียน แล้วโรยแป้งลูบต้น</div>
              <div class="small muted">วันนี้เหลือสิทธิ์ {left} ครั้ง</div>
              {left > 0 ? (
                <Btn tone="green" block onClick={start}>
                  <Icon name="powder" size={18} /> โรยแป้ง
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
