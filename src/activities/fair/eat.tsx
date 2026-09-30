// Eat at a fair food cart (hotspot `fair:eat:<shopId>`): the cart and its
// vendor on a little stage, the menu from the place-shop system, and when
// you buy something your doll eats it right there – three big bites (or
// slurps), crumbs flying, a happy wiggle – and the snack's timed blessing
// kicks in (buySnack → addBuff).

import { useEffect, useRef, useState } from 'preact/hooks'
import type { Scene } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { Particles } from '../../engine/particles'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { game } from '../../game/state'
import { PLACE_SHOPS, SNACK_BY_ID, type Snack } from '../../game/data/placeShops'
import { buySnack } from '../../game/stalls'
import { toast } from '../../game/events'
import { activeBuffs } from '../../game/actions'
import { dollSprite, type DollPose } from '../../art/doll'
import { avatarSprite, type AvatarLook } from '../../art/avatar'
import { randomVisitorLook } from '../../scenes/world'
import { fairCart, type CartKind } from '../../art/places/fair'
import { snackUrl } from '../../art/stallGoods'
import { fairHand } from '../../art/poses/fair'
import { closeActivity, openPlaceShop } from '../../ui/store'
import { useStage } from '../kit'
import { PBtn, Window } from '../../ui/components/kit'
import { Coin } from '../../ui/components/common'
import { fairSfx } from './sound'

const BUFF_NAME = { merit: 'บุญ', coin: 'เหรียญ', animal: 'บุญสัตว์' } as const
const DRINKS = new Set(['fair_red_soda_bag', 'chayen', 'hub_ice_pop'])

/** Which cart art a fair shop uses. */
export function cartKindOf(shopId: string): CartKind {
  const k = shopId.replace('fair_temple_', '')
  const known: CartKind[] = ['icepop', 'saimai', 'lookchin', 'popcorn', 'quail', 'squid', 'tokyo', 'redsoda', 'pressed', 'takoyaki']
  return (known as string[]).includes(k) ? (k as CartKind) : 'popcorn'
}

/** The snack held in the hand, `left` = bites remaining (3 → 0). */
export function drawFood(g: Surface, id: string, x: number, y: number, left: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  const k = Math.max(0, left) / 3
  const stick = (len: number) => g.line(X, Y + 2, X, Y - len, '#e0c080')
  switch (id) {
    case 'hub_popcorn':
      g.poly([[X - 5, Y - 8], [X + 5, Y - 8], [X + 3, Y + 3], [X - 3, Y + 3]], '#fffaf0')
      for (let i = -4; i <= 4; i += 3) g.vline(X + i, Y - 7, Y + 2, '#e8514a')
      for (let i = 0; i < Math.round(6 * k) + 1; i++) g.circle(X - 4 + (i % 4) * 2.6, Y - 9 - Math.floor(i / 4) * 2, 1.4, i % 2 ? '#fff6d0' : '#ffe27a')
      break
    case 'fair_quail_egg':
    case 'hub_lookchin_tod':
      stick(14)
      for (let i = 0; i < Math.ceil(3 * k); i++) {
        const c = id === 'fair_quail_egg' ? '#fffaf0' : '#c8784a'
        g.circle(X, Y - 12 + i * 4, 2, c)
        g.px(X - 1, Y - 13 + i * 4, id === 'fair_quail_egg' ? '#ffd23f' : '#f0a070')
      }
      break
    case 'fair_squid_grill':
      stick(16)
      if (k > 0) {
        g.ellipse(X, Y - 11, 3, 5 * Math.max(0.4, k), '#e89a7a')
        for (let i = -2; i <= 2; i += 2) g.vline(X + i, Y - 7, Y - 3, '#d8826a')
        g.px(X - 1, Y - 13, '#ffd0b8')
      }
      break
    case 'fair_khanom_tokyo':
      g.rect(X - 2, Y - 10 + Math.round((1 - k) * 6), 5, Math.round(10 * k) + 2, '#e8b870')
      g.vline(X, Y - 9 + Math.round((1 - k) * 6), Y + 1, '#6cc36a')
      break
    case 'fair_takoyaki':
      g.poly([[X - 7, Y - 3], [X + 7, Y - 3], [X + 5, Y + 2], [X - 5, Y + 2]], '#c8a878')
      for (let i = 0; i < Math.ceil(4 * k); i++) g.circle(X - 4 + i * 2.8, Y - 4, 1.8, '#c8864a')
      g.line(X + 3, Y - 6, X + 7, Y - 12, '#e0c080')
      break
    case 'hub_sai_mai':
      stick(10)
      if (k > 0) g.circle(X, Y - 14, 4 + 3 * k, '#ffc0d8')
      break
    case 'hub_ice_pop':
      g.rect(X - 1, Y - 12 + Math.round((1 - k) * 8), 3, Math.round(10 * k) + 2, '#6cc3ff')
      g.px(X, Y - 11 + Math.round((1 - k) * 8), '#e8f8ff')
      break
    case 'fair_red_soda_bag':
      g.ellipse(X, Y - 3, 4, 5, '#ff4a5a')
      g.alpha(0.6)
      g.ellipse(X, Y - 3 + (1 - k) * 3, 3, 4 * Math.max(0.2, k), '#ff8090')
      g.alpha(1)
      g.line(X + 1, Y - 6, X + 3, Y - 16, '#6cc36a')
      break
    case 'fair_squid_pressed':
      g.rect(X - 4, Y - 12 + Math.round((1 - k) * 6), 8, Math.round(8 * k) + 2, '#f0c090')
      g.hline(X - 4, X + 3, Y - 4, '#d89060')
      break
    case 'chayen':
      g.rect(X - 3, Y - 8, 7, 10, '#f07a4a')
      g.rect(X - 3, Y - 8, 7, 2, '#ffe0c8')
      g.line(X + 1, Y - 8, X + 3, Y - 15, '#fffaf0')
      break
    default:
      g.ellipse(X, Y - 2, 5, 3, '#fffaf0')
      g.ellipse(X, Y - 3, 4, 1.5, '#e8a060')
  }
}

class EatScene implements Scene {
  w = 150
  h = 150
  t = 0
  particles = new Particles()
  food: string | null = null
  bites = 3
  private step = 0
  private stepT = 0
  private done = 0
  private me = game.value.player.look
  private vendor: AvatarLook
  private cart: ReturnType<typeof fairCart>
  constructor(shopId: string) {
    this.cart = fairCart(cartKindOf(shopId))
    this.vendor = { ...randomVisitorLook(), head: 'head_vendorband' }
  }
  resize(w: number, h: number) {
    this.w = w
    this.h = h
  }
  eat(id: string) {
    this.food = id
    this.bites = 3
    this.step = 0
    this.stepT = 0.5
    this.done = 0
  }
  get eating() {
    return !!this.food && this.bites > 0
  }
  update(dt: number) {
    this.t += dt
    this.particles.update(dt)
    this.done = Math.max(0, this.done - dt)
    if (!this.food || this.bites <= 0) return
    this.stepT -= dt
    if (this.stepT > 0) return
    this.step++
    const mouth = this.mouth()
    if (this.step % 2 === 1) {
      // Bite (or sip).
      this.stepT = 0.42
      const drink = DRINKS.has(this.food)
      if (drink) fairSfx.slurp()
      else sfx.munch()
      for (let i = 0; i < (drink ? 3 : 6); i++)
        this.particles.add({ kind: drink ? 'drop' : 'dot', x: mouth.x + rand(-2, 2), y: mouth.y, vx: rand(-20, 20), vy: rand(-30, -8), g: 80, max: 0.6, color: drink ? '#ff8090' : pick(['#e0c080', '#fff6d0', '#c8784a']) })
      haptic(8)
    } else {
      this.stepT = 0.5
      this.bites--
      if (this.bites <= 0) {
        this.done = 1.6
        this.particles.hearts(mouth.x, mouth.y - 8, 4)
        fairSfx.ding()
      }
    }
  }
  private feet() {
    return this.h - 6
  }
  private dollX() {
    return Math.round(this.w * 0.32)
  }
  private mouth() {
    return { x: this.dollX() + 2, y: this.feet() - 52 + 19 }
  }
  render(g: Surface) {
    const { w, h, t } = this
    g.gradientV(0, 0, w, h, ['#1a1a40', '#2a2a58', '#3a3048'])
    for (let i = 0; i < 18; i++) {
      const x = (i / 17) * w
      const y = 8 + Math.sin((i / 17) * Math.PI) * 8
      const on = (Math.floor(t * 4) + i) % 3 !== 0
      g.rect(Math.round(x), Math.round(y), 2, 2, on ? ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff'][i % 4] : '#3a3048')
    }
    g.rect(0, h - 12, w, 12, '#5a4a48')
    g.rect(0, h - 12, w, 2, '#6a5a58')
    // The vendor behind the cart, a bare bulb over it.
    const cx = Math.round(w * 0.7)
    const cy = h - 6
    const vs = avatarSprite(this.vendor, 'front', Math.floor(t * 1.2) % 4 === 0 ? 'happy' : 'stand')
    g.draw(vs.canvas, cx - Math.round(vs.w / 2) - 2, cy - 16 - vs.h + (Math.floor(t * 1.2) % 4 === 0 ? -1 : 0))
    const c = this.cart.base
    g.draw(c.canvas, cx - c.ax, cy - c.ay)
    g.ctx.save()
    g.ctx.globalCompositeOperation = 'lighter'
    g.alpha(0.5)
    g.draw(this.cart.lit.canvas, cx - this.cart.lit.ax, cy - this.cart.lit.ay)
    g.ctx.restore()
    g.alpha(1)
    // Steam.
    if (Math.random() < 0.08) this.particles.add({ kind: 'smoke', x: cx + rand(-8, 8), y: cy - 34, vy: -12, max: 1.2, color: '#f6ecd8', size: 2 })
    // You, eating.
    const eating = this.eating
    let pose: DollPose = 'stand'
    if (eating) pose = this.step % 2 === 1 ? 'act_f_eat' : 'act_f_chew'
    else if (this.done > 0) pose = 'happy'
    const sp = dollSprite(this.me, pose, { view: 'front', blink: Math.floor(t * 2) % 9 === 0 })
    const x0 = this.dollX() - Math.round(sp.w / 2)
    const y0 = this.feet() - sp.h + (this.done > 0 ? -Math.round(Math.abs(Math.sin(t * 10)) * 2) : 0)
    g.draw(sp.canvas, x0, y0)
    if (this.food && (eating || this.done > 0)) {
      const hp = fairHand(pose, 'front', this.me)
      if (pose === 'act_f_eat' || pose === 'act_f_chew') drawFood(g, this.food, x0 + hp.x, y0 + hp.y, this.bites)
    }
    this.particles.render(g)
  }
}

export function EatSheet({ shopId }: { shopId: string }) {
  const shop = PLACE_SHOPS[shopId]
  const snacks = (shop?.snacks ?? []).map((id) => SNACK_BY_ID[id]).filter((s): s is Snack => !!s)
  const { host, scene } = useStage(() => new EatScene(shopId), { targetWidth: 150 })
  const [, bump] = useState(0)
  const [last, setLast] = useState<Snack | null>(null)
  const busy = useRef(false)
  useEffect(() => {
    const iv = window.setInterval(() => {
      const sc = scene.current
      if (busy.current && sc && !sc.eating) {
        busy.current = false
        bump((n) => n + 1)
      }
    }, 150)
    return () => clearInterval(iv)
  }, [])
  const buy = (sn: Snack) => {
    if (busy.current) return
    if (!buySnack(sn)) return
    sfx.coin()
    busy.current = true
    scene.current?.eat(sn.id)
    setLast(sn)
    toast(`อร่อยจัง! ${sn.name} · ${BUFF_NAME[sn.buff.kind]} x${sn.buff.mult} ${sn.buff.minutes} นาที`, sn.icon)
    bump((n) => n + 1)
  }
  const buffs = activeBuffs().filter((b) => b.source.startsWith('snack:'))
  return (
    <Window
      title={shop?.name ?? 'ร้านของกิน'}
      icon="bowl"
      onClose={closeActivity}
      footer={
        <>
          <PBtn tone="paper" icon="shop" onClick={() => openPlaceShop(shopId)}>
            ดูร้าน
          </PBtn>
          <PBtn tone="green" onClick={closeActivity}>
            เที่ยวต่อ
          </PBtn>
        </>
      }
    >
      <div class="fairx-eat-stage" ref={host} />
      <p class="goal-main small">
        <b>{shop?.npc ?? 'แม่ค้า'}:</b> “{shop?.greeting ?? 'เชิญจ้า'}”
      </p>
      <div class="fairx-menu">
        {snacks.map((sn) => (
          <div class="panel fairx-menu-item" key={sn.id}>
            <img class="px" src={snackUrl(sn.id, sn.icon, 3)} alt="" width={40} height={40} />
            <div class="grow">
              <div class="fairx-name">{sn.name}</div>
              <div class="small muted">{sn.desc}</div>
              <span class="chip green small">{`${BUFF_NAME[sn.buff.kind]} x${sn.buff.mult} · ${sn.buff.minutes} นาที`}</span>
            </div>
            <PBtn tone={game.value.coins >= sn.price ? 'gold' : 'paper'} size="small" disabled={game.value.coins < sn.price} onClick={() => buy(sn)}>
              กิน <Coin n={sn.price} size={12} />
            </PBtn>
          </div>
        ))}
      </div>
      {last && <div class="small center muted">เพิ่งกิน{last.name}ไป · อิ่มบุญ!</div>}
      {buffs.length > 0 && (
        <div class="fairx-buffs small center">
          พลังของกินตอนนี้:{' '}
          {buffs.map((b) => (
            <span class="chip small" key={b.id}>
              {BUFF_NAME[b.kind as keyof typeof BUFF_NAME] ?? b.kind} x{b.mult} · อีก {Math.max(1, Math.ceil((b.until - Date.now()) / 60000))} นาที
            </span>
          ))}
        </div>
      )}
    </Window>
  )
}
