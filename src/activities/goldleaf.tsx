// ปิดทอง – rub gold leaf onto a Buddha image, front or back (ปิดทองหลังพระ).

import { useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, createCanvas, ditherOn, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { drawBuddha, drawBuddhaBack, BRONZE, GOLD } from '../art/interior'
import { P } from '../art/palette'
import { addMerit, count, track, useItem } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { Btn, Icon } from '../ui/components/common'
import { QuickBuy } from './quickbuy'
import { sfx, haptic } from '../engine/audio'
import { drawGlow } from '../scenes/sky'

const SHEET_CAPACITY = 900

class GoldScene implements Scene {
  w = 160
  h = 320
  t = 0
  back = false
  sheet = 0
  particles = new Particles()
  onSheetUsed?: () => void
  private layers: Record<string, HTMLCanvasElement> = {}
  private masks: Record<string, HTMLCanvasElement> = {}
  private pointerDown = false
  private tmp: HTMLCanvasElement | null = null
  resize(w: number, h: number) {
    this.tmp = null
    this.w = w
    this.h = h
    this.layers = {}
    this.masks = {}
  }
  get cx() {
    return Math.round(this.w / 2)
  }
  get baseY() {
    return Math.round(this.h * 0.62)
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
  pointer(e: PointerInfo) {
    if (e.type === 'down') this.pointerDown = true
    if (e.type === 'up' || e.type === 'cancel') this.pointerDown = false
    if (!this.pointerDown || this.sheet <= 0) return
    if (e.type !== 'down' && e.type !== 'move') return
    const m = this.mask(this.back).getContext('2d')!
    const body = this.layer('bronze', this.back).getContext('2d')!
    const r = 5
    const data = body.getImageData(Math.round(e.x - r), Math.round(e.y - r), r * 2 + 1, r * 2 + 1).data
    let painted = 0
    m.fillStyle = '#fff'
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue
        const x = Math.round(e.x + dx)
        const y = Math.round(e.y + dy)
        const a = data[((dy + r) * (r * 2 + 1) + (dx + r)) * 4 + 3]
        if (a > 0 && (dx * dx + dy * dy < (r - 2) * (r - 2) || ditherOn(x, y, 0.5))) {
          m.fillRect(x, y, 1, 1)
          painted++
        }
      }
    if (painted > 0) {
      this.sheet -= painted
      if (Math.random() < 0.3) this.particles.sparkles(e.x, e.y, 1, P.goldL)
      if (Math.random() < 0.15) sfx.scratch()
      if (this.sheet <= 0) {
        this.sheet = 0
        this.onSheetUsed?.()
      }
    }
  }
  update(dt: number) {
    this.t += dt
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    g.gradientV(0, 0, w, h, ['#4a1826', '#6e1f30', '#8e2a3c'])
    // Pedestal and cloth.
    const cx = this.cx
    const by = this.baseY
    g.rect(cx - 50, by, 100, 10, '#b8343f')
    g.rect(cx - 50, by, 100, 2, P.gold)
    g.rect(cx - 44, by + 10, 88, h - by - 10, '#7e2436')
    for (let x = cx - 44; x < cx + 44; x += 6) g.px(x, by + 5, P.gold)
    drawGlow(g, cx, by - 60, 60, 0.35, '#ffcf7a')
    g.draw(this.layer('bronze', this.back), 0, 0)
    // Gold where the mask has been rubbed.
    if (!this.tmp) this.tmp = createCanvas(w, h)
    const tmp = this.tmp
    const tc = tmp.getContext('2d')!
    tc.globalCompositeOperation = 'source-over'
    tc.clearRect(0, 0, w, h)
    tc.drawImage(this.layer('gold', this.back), 0, 0)
    tc.globalCompositeOperation = 'destination-in'
    tc.drawImage(this.mask(this.back), 0, 0)
    g.draw(tmp, 0, 0)
    // Twinkles on the gold.
    if (Math.sin(this.t * 3) > 0.9) this.particles.sparkles(cx + (Math.random() - 0.5) * 50, by - 20 - Math.random() * 80, 1, '#ffffff')
    this.particles.render(g)
  }
}

export function GoldLeafActivity({ req }: { req: ActivityRequest }) {
  const { host, scene } = useStage(() => new GoldScene(), { targetWidth: 160 })
  const [back, setBack] = useState(false)
  const [active, setActive] = useState(false)
  const [sheets, setSheets] = useState(0)
  const [result, setResult] = useState<ResultData | null>(null)
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
    setActive(true)
    sfx.sparkle()
    sc.onSheetUsed = () => {
      setActive(false)
      setSheets((n) => n + 1)
      haptic(20)
      const m = addMerit(12, { key: 'gold_leaf', free: 5 })
      track('gold_leaf')
      sfx.chime()
      if (sc.back) {
        track('gold_back')
        setBackDone(true)
        setResult({
          title: 'ปิดทองหลังพระ',
          merit: m,
          icon: 'goldleaf',
          lines: ['ทำความดีโดยไม่หวังให้ใครเห็น', 'แต่ความดีนั้นงดงามและยิ่งใหญ่เสมอ'],
        })
      } else {
        setResult({ title: 'ปิดทององค์พระแล้ว', merit: m, icon: 'goldleaf', lines: ['ขอให้ชีวิตรุ่งเรืองดั่งทองคำ'] })
      }
    }
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={back ? 'ปิดทองหลังพระ' : 'ปิดทององค์พระ'} onClose={closeActivity} />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {active ? (
              <>
                <div class="subtitle">ใช้นิ้วถูแผ่นทองลงบนองค์พระ</div>
                <div class="small muted">ถูให้ทั่วจนทองคำเปลวแผ่นนี้หมด</div>
              </>
            ) : (
              <>
                <div class="subtitle">{back ? 'ด้านหลังองค์พระ ที่ไม่มีใครเห็น' : 'องค์พระพุทธรูปศักดิ์สิทธิ์'}</div>
                <div class="small muted">มีทองคำเปลว {count('gold_leaf')} แผ่น · ปิดไปแล้ว {sheets} แผ่น</div>
                <div class="row">
                  <Btn tone="paper" class="grow" onClick={() => {
                    const b = !back
                    setBack(b)
                    if (scene.current) scene.current.back = b
                    sfx.whoosh()
                  }}>
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
      {result && <ResultCard r={result} onDone={() => setResult(null)} again={{ label: 'ปิดทองอีกแผ่น', run: () => (setResult(null), useSheet()) }} />}
    </div>
  )
}
