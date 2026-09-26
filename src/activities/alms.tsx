// ตักบาตร – monks walk by on their alms round (or paddle up by boat at the
// riverside temple) and you place food in their bowls.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { avatarSprite, type AvatarLook } from '../art/avatar'
import { monkSprite } from '../art/characters'
import { iconSprite } from '../art/icons'
import { P } from '../art/palette'
import { treeLine } from '../scenes/maps/common'
import { game } from '../game/state'
import { addMerit, count, track, useItem } from '../game/actions'
import { ITEMS, ITEM_BY_ID } from '../game/data/items'
import { ALMS_BLESSING } from '../game/data/chants'
import { hourOf, isAlmsMorning } from '../game/time'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawSky } from '../scenes/sky'

const ALMS_ITEMS = ITEMS.filter((i) => i.category === 'alms').map((i) => i.id)
const PER_MONK = 3

interface Monk {
  x: number
  target: number
  skin: number
  novice: boolean
  state: 'walk' | 'wait' | 'receive' | 'leave' | 'bless' | 'gone'
  filled: number
  anim: number
}

interface Flying {
  icon: string
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  done: () => void
}

class AlmsScene implements Scene {
  w = 170
  h = 320
  t = 0
  monks: Monk[] = []
  flying: Flying[] = []
  particles = new Particles()
  offerT = 0
  blessing = false
  private bg: HTMLCanvasElement | null = null
  onReady?: (i: number) => void
  onAllServed?: () => void

  constructor(
    public look: AvatarLook,
    public boat: boolean,
    public morning: boolean,
  ) {}

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    if (!this.monks.length) this.spawn()
  }

  get groundY() {
    return Math.round(this.h * 0.7)
  }
  get playerX() {
    return Math.round(this.w * 0.26)
  }
  get standX() {
    return this.playerX + 44
  }

  private spawn() {
    const skins = [2, 1, 3, 1]
    this.monks = skins.map((skin, i) => ({
      x: this.w + 20 + i * 34,
      target: this.standX + i * 30,
      skin,
      novice: i === 3,
      state: 'walk',
      filled: 0,
      anim: Math.random(),
    }))
  }

  current(): Monk | null {
    return this.monks.find((m) => m.state === 'receive') ?? null
  }

  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const gy = this.groundY
    this.bg = bake(w, h, (g) => {
      g.rect(0, 0, w, h, 'rgba(0,0,0,0)')
      if (this.boat) {
        treeLine(g, Math.round(h * 0.4), w, P.leafD, P.leaf)
        g.rect(0, Math.round(h * 0.44), w, gy - Math.round(h * 0.44) + 40, P.waterD)
        for (let y = Math.round(h * 0.46); y < h; y += 5) for (let x = (y * 7) % 11; x < w; x += 13) g.rect(x, y, 5, 1, P.water)
        // Wooden pier where the player kneels.
        g.rect(0, gy - 2, this.playerX + 28, 12, '#9a6a45')
        for (let x = 0; x < this.playerX + 28; x += 7) g.vline(x, gy - 2, gy + 9, '#7a5238')
        g.rect(0, gy - 2, this.playerX + 28, 2, '#c28e5c')
        for (const x of [6, this.playerX + 20]) g.rect(x, gy + 8, 3, h - gy, '#6e4a35')
      } else {
        // Temple wall, trees and sidewalk.
        treeLine(g, Math.round(h * 0.33), w, P.leafD, P.leaf)
        const wy = Math.round(h * 0.4)
        g.rect(0, wy, w, gy - wy - 8, '#fffaf0')
        g.rect(0, wy, w, 4, P.redD)
        g.hline(0, w - 1, wy + 4, P.gold)
        for (let x = 6; x < w; x += 14) {
          g.rect(x, wy + 10, 6, 8, '#eadfcb')
          g.px(x + 2, wy + 13, P.goldD)
          g.px(x + 3, wy + 13, P.goldD)
        }
        g.rect(0, gy - 8, w, 8, '#e3d8c6')
        g.rect(0, gy - 1, w, h - gy + 1, '#d9d2cc')
        for (let y = gy + 4; y < gy + 30; y += 6) g.hline(0, w - 1, y, '#c6bdb8')
        g.rect(0, gy + 30, w, 3, P.stoneD)
        g.rect(0, gy + 33, w, h - gy - 33, '#6d6478')
        // Mat under the player.
        g.rect(this.playerX - 22, gy - 3, 40, 5, '#e0bb8a')
        g.hline(this.playerX - 21, this.playerX + 16, gy - 2, P.red)
        // Little table with rice pot.
        g.rect(this.playerX - 30, gy - 12, 14, 3, '#9a6a45')
        g.rect(this.playerX - 29, gy - 9, 2, 8, '#6e4a35')
        g.rect(this.playerX - 19, gy - 9, 2, 8, '#6e4a35')
        g.rect(this.playerX - 28, gy - 20, 10, 8, P.stone)
        g.rect(this.playerX - 28, gy - 20, 10, 2, P.stoneL)
        g.ellipse(this.playerX - 23, gy - 21, 4, 1.5, '#fffaf0')
      }
    })
    return this.bg
  }

  give(icon: string, onLand: () => void) {
    const m = this.current()
    if (!m) return false
    this.offerT = 0.5
    const s = 2
    this.flying.push({
      icon,
      x0: this.playerX + 12,
      y0: this.groundY - 34,
      x1: m.x - 8,
      y1: this.groundY - 26 * s + 22,
      t: 0,
      done: onLand,
    })
    sfx.whoosh()
    return true
  }

  next() {
    const m = this.current()
    if (!m) return
    m.state = 'leave'
    const waiting = this.monks.filter((x) => x.state === 'wait' || x.state === 'walk')
    waiting.forEach((x, i) => (x.target = this.standX + i * 30))
  }

  startBlessing() {
    this.blessing = true
    const alive = this.monks
    alive.forEach((m, i) => {
      m.state = 'bless'
      m.x = this.w * 0.42 + i * 26
    })
  }

  update(dt: number) {
    this.t += dt
    this.offerT = Math.max(0, this.offerT - dt)
    for (const m of this.monks) {
      m.anim += dt
      if (m.state === 'walk' || m.state === 'wait') {
        if (m.x > m.target + 0.5) {
          m.state = 'walk'
          m.x = Math.max(m.target, m.x - 22 * dt)
        } else {
          const first = this.monks.find((x) => x.state === 'walk' || x.state === 'wait')
          if (first === m && !this.current() && !this.blessing) {
            m.state = 'receive'
            sfx.click()
            this.onReady?.(this.monks.indexOf(m))
          } else m.state = 'wait'
        }
      } else if (m.state === 'leave') {
        m.x -= 26 * dt
        if (m.x < -30) m.state = 'gone'
      }
    }
    if (!this.blessing && this.monks.every((m) => m.state === 'gone')) {
      this.onAllServed?.()
      this.onAllServed = undefined
    }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i]
      f.t += dt / 0.55
      if (f.t >= 1) {
        this.flying.splice(i, 1)
        this.particles.sparkles(f.x1 + 4, f.y1, 10)
        f.done()
      }
    }
    if (this.blessing && Math.random() < dt * 6) this.particles.sparkles(rand(this.w * 0.35, this.w), rand(this.h * 0.35, this.groundY - 20), 1, '#fff3a6')
    this.particles.update(dt)
  }

  render(g: Surface) {
    const { w, h } = this
    drawSky(g, 0, 0, w, Math.round(h * 0.45), this.morning ? 'dawn' : 'day', this.t)
    g.draw(this.background(), 0, 0)
    const gy = this.groundY
    // Monks (2x), facing left toward the player.
    for (const m of this.monks) {
      if (m.state === 'gone') continue
      let s
      if (m.state === 'bless') s = monkSprite('front', 'bless', { novice: m.novice, skin: m.skin })
      else if (m.state === 'receive') s = monkSprite('side', 'receive', { novice: m.novice, skin: m.skin, flip: true })
      else if (m.state === 'walk' || m.state === 'leave') s = monkSprite('side', Math.floor(m.anim * 4) % 2 ? 'walk1' : 'walk2', { novice: m.novice, skin: m.skin, flip: true })
      else s = monkSprite('side', 'stand', { novice: m.novice, skin: m.skin, flip: true })
      const by = this.boat && m.state !== 'bless' ? gy + 6 + Math.round(Math.sin(this.t * 2 + m.x) * 1) : gy
      if (this.boat && m.state !== 'bless') this.drawBoat(g, m.x, by)
      g.drawScaled(s.canvas, Math.round(m.x - s.w), Math.round(by - s.h * 2 + 2), 2)
    }
    // Player.
    const pose = this.blessing ? 'wai' : this.offerT > 0 ? 'offer' : 'stand'
    const view = this.blessing ? 'front' : 'side'
    const ps = avatarSprite(this.look, view, pose, { barefoot: true })
    g.drawScaled(ps.canvas, Math.round(this.playerX - ps.w), Math.round(gy - ps.h * 2 + 2), 2)
    // Flying items.
    for (const f of this.flying) {
      const t = f.t
      const x = f.x0 + (f.x1 - f.x0) * t
      const y = f.y0 + (f.y1 - f.y0) * t - Math.sin(t * Math.PI) * 26
      const ic = iconSprite(f.icon)
      g.draw(ic.canvas, Math.round(x - 8), Math.round(y - 8))
    }
    this.particles.render(g)
    void h
  }

  private drawBoat(g: Surface, x: number, y: number) {
    g.poly(
      [
        [x - 44, y - 8],
        [x + 20, y - 8],
        [x + 14, y + 2],
        [x - 38, y + 2],
      ],
      '#8a5a32',
    )
    g.hline(x - 44, x + 20, y - 8, '#c28e5c')
    g.line(x + 10, y - 30, x + 26, y + 6, '#6e4a35')
  }
}

export function AlmsActivity({ req }: { req: ActivityRequest }) {
  const boat = !!req.params?.boat
  const morning = isAlmsMorning(hourOf())
  const look = game.value.player.look
  const { host, scene } = useStage(() => new AlmsScene(look, boat, morning), { targetWidth: 170 })
  const [ready, setReady] = useState(false)
  const [monkIdx, setMonkIdx] = useState(0)
  const [given, setGiven] = useState(0)
  const [total, setTotal] = useState(0)
  const [phase, setPhase] = useState<'serve' | 'bless' | 'done'>('serve')
  const [result, setResult] = useState<ResultData | null>(null)
  const [buy, setBuy] = useState(false)
  const [scoop, setScoop] = useState<null | { fill: number; holding: boolean }>(null)
  const scoopTimer = useRef<number | null>(null)
  const meritRef = useRef(0)
  const itemsRef = useRef(0)
  const noItems = ALMS_ITEMS.every((id) => count(id) <= 0)

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.onReady = (i) => {
      setReady(true)
      setMonkIdx(i)
      setGiven(0)
    }
    sc.onAllServed = () => blessing()
  }, [scene.current])

  const blessing = () => {
    const sc = scene.current
    if (!sc) return
    setPhase('bless')
    sc.startBlessing()
    sfx.hum(0)
    setTimeout(() => sfx.bell(1), 800)
    setTimeout(() => {
      const bonus = itemsRef.current > 0 ? addMerit(10, { key: 'alms', free: 2, morning: true, area: boat ? 'river' : 'wat' }) : 0
      if (itemsRef.current > 0) {
        track('alms')
        track('alms_item', itemsRef.current)
      }
      meritRef.current += bonus
      setPhase('done')
      setResult({
        title: itemsRef.current > 0 ? 'ตักบาตรเสร็จแล้ว' : 'พระให้พรแล้ว',
        merit: meritRef.current,
        icon: 'bowl',
        lines: [
          `ถวายภัตตาหาร ${itemsRef.current} อย่าง`,
          morning ? 'ตักบาตรยามเช้า ได้บุญ x2' : 'ตักบาตรช่วง 05:00-09:00 ได้บุญ x2',
          'พระสงฆ์อนุโมทนา: ' + ALMS_BLESSING.split(' ').slice(0, 4).join(' ') + '...',
        ],
      })
    }, 5200)
  }

  const giveItem = (id: string, bonus = 0) => {
    const sc = scene.current
    const it = ITEM_BY_ID[id]
    if (!sc || !it || !ready) return
    if (!useItem(id)) {
      setBuy(true)
      return
    }
    const ok = sc.give(it.icon, () => {
      const m = addMerit(it.merit + bonus, { key: 'alms_item', free: 12, morning: true, area: boat ? 'river' : 'wat' })
      meritRef.current += m
      itemsRef.current += 1
      setTotal(meritRef.current)
      sc.particles.popText(sc.standX - 8, sc.groundY - 70, `+${m}`)
      sfx.merit()
      haptic(10)
    })
    if (!ok) return
    const n = given + 1
    setGiven(n)
    if (n >= PER_MONK) {
      setReady(false)
      setTimeout(() => sc.next(), 700)
    }
  }

  const pick = (id: string) => {
    if (id === 'rice') {
      setScoop({ fill: 0, holding: false })
      return
    }
    giveItem(id)
  }

  const scoopStart = () => {
    if (scoopTimer.current) return
    setScoop((s) => (s ? { ...s, holding: true } : s))
    scoopTimer.current = window.setInterval(() => {
      setScoop((s) => (s ? { ...s, fill: Math.min(1.2, s.fill + 0.03) } : s))
    }, 40)
  }
  const scoopEnd = () => {
    if (scoopTimer.current) clearInterval(scoopTimer.current)
    scoopTimer.current = null
    setScoop((s) => {
      if (!s || !s.holding) return s
      const perfect = s.fill >= 0.75 && s.fill <= 1
      if (s.fill > 0.15) {
        giveItem('rice', perfect ? 2 : 0)
        if (perfect) scene.current?.particles.popText(scene.current.playerX + 10, scene.current.groundY - 64, 'x1.5!', '#ffe45e')
      }
      return null
    })
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={boat ? 'ตักบาตรทางเรือ' : 'ตักบาตรหน้าวัด'} onClose={closeActivity} />
      {phase === 'serve' && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {noItems ? (
              <>
                <div class="subtitle">ยังไม่มีของใส่บาตร</div>
                <Btn tone="green" block onClick={() => setBuy(true)}>
                  <Icon name="shop" size={18} /> ซื้อของใส่บาตร
                </Btn>
              </>
            ) : ready ? (
              <>
                <div class="subtitle">
                  ถวายแด่{monkIdx === 3 ? 'สามเณร' : `พระรูปที่ ${monkIdx + 1}`} ({given}/{PER_MONK})
                </div>
                <div class="small muted">{morning ? 'ตักบาตรยามเช้า บุญ x2' : 'แตะของที่ต้องการถวาย'} · ได้บุญแล้ว {total}</div>
              </>
            ) : (
              <div class="subtitle">พระสงฆ์กำลังเดินบิณฑบาตมา...</div>
            )}
            <div class="tray">
              {ALMS_ITEMS.map((id) => {
                const it = ITEM_BY_ID[id]
                const n = count(id)
                return (
                  <button key={id} class="panel tray-item" disabled={n <= 0 || !ready} onClick={() => (sfx.tap(), pick(id))}>
                    <Icon name={it.icon} size={30} />
                    <span>{it.name}</span>
                    <span class="qty num">x{n}</span>
                  </button>
                )
              })}
            </div>
            <div class="row">
              <Btn tone="paper" class="grow" onClick={() => setBuy(true)}>
                ซื้อเพิ่ม
              </Btn>
              <Btn
                tone="green"
                class="grow"
                disabled={!ready || given === 0}
                onClick={() => {
                  setReady(false)
                  scene.current?.next()
                }}
              >
                นิมนต์รูปถัดไป
              </Btn>
            </div>
          </div>
        </div>
      )}
      {phase === 'bless' && (
        <div class="act-bottom">
          <div class="panel act-tip blessing">
            <div class="small muted">พระสงฆ์ให้พร · ผู้ใส่บาตรพนมมือรับพร</div>
            <div class="bless-text">{ALMS_BLESSING}</div>
          </div>
        </div>
      )}
      {scoop && (
        <div class="modal-backdrop" onPointerUp={scoopEnd}>
          <div class="panel modal center">
            <div class="subtitle">ตักข้าวใส่บาตร</div>
            <div class="small muted">กดค้างเพื่อตัก ปล่อยเมื่อข้าวเต็มทัพพี (ช่องสีทอง)</div>
            <div class="scoop-meter">
              <span class="scoop-zone" />
              <span class="scoop-fill" style={{ height: `${Math.min(100, (scoop.fill / 1.2) * 100)}%` }} />
            </div>
            <button class="btn big green block" onPointerDown={scoopStart} onPointerUp={scoopEnd} onPointerLeave={scoopEnd} style={{ touchAction: 'none' }}>
              {scoop.fill > 1 ? 'ล้นแล้ว!' : 'กดค้าง ตักข้าว'}
            </button>
          </div>
        </div>
      )}
      {buy && <QuickBuy ids={ALMS_ITEMS} title="ร้านของใส่บาตร" onClose={() => setBuy(false)} />}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}

