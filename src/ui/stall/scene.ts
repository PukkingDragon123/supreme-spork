// The first-person stall stage: backdrop, shelves full of goods, the
// shopkeeper behind the counter (idle breathing, blinking, gestures and a
// talking mouth), tap-to-lift products, page slides and purchase juice.

import { mix, type Surface } from '../../engine/pixel'
import type { PointerInfo, Scene } from '../../engine/stage'
import { Particles } from '../../engine/particles'
import { drawText } from '../../engine/font'
import { easeOutBack, easeOutCubic, clamp } from '../../engine/ease'
import type { Sprite } from '../../engine/sprite'
import { dollSprite, type DollPose } from '../../art/doll'
import { bakeStallBack, bakeStallFront, drawContainer, drawFiller, drawStallFx, stallLayout, type StallLayout, type StallSlot } from '../../art/stall'
import type { StallKind } from '../../game/data/placeShops'
import type { StallNpc } from '../../game/stalls'
import { RARITY_INFO } from '../../game/data/collectibles'
import { layoutPages, type Product, type ShelfPage } from './products'

export interface StallCallbacks {
  onPick?(slot: number, p: Product): void
  onTapNpc?(): void
  onTapEmpty?(): void
}

export type Emote = 'heart' | 'note' | 'sweat' | 'bang' | 'think' | 'anger' | 'coin' | 'sparkle'

const SLIDE = 0.38
const ENTER = 0.75

interface Flyer {
  sprite: Sprite
  x: number
  y: number
  tx: number
  ty: number
  t: number
}

export class StallScene implements Scene {
  w = 156
  h = 337
  t = 0
  insetTop = 26
  insetBottom = 72
  L!: StallLayout
  pages: ShelfPage[] = []
  page = 0
  private prevPage: number | null = null
  private slideT = 1
  private slideDir = 1
  selected: number | null = null
  private lift: number[] = []
  readonly particles = new Particles()
  private back: HTMLCanvasElement | null = null
  private front: HTMLCanvasElement | null = null
  private products: Product[] = []
  /** Collectibles the player already owns (no "new" star). */
  owned = new Set<string>()
  // NPC
  pose: DollPose = 'stand'
  private poseT = 0
  private blinkT = 2.5
  private idleT = 5
  talking = false
  private emote: { kind: Emote; t: number } | null = null
  private enterT = 0
  private flyers: Flyer[] = []
  private hop = 0
  cb: StallCallbacks = {}

  constructor(
    readonly kind: StallKind,
    readonly npc: StallNpc,
  ) {}

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.relayout()
  }

  setInsets(top: number, bottom: number) {
    if (top === this.insetTop && bottom === this.insetBottom) return
    this.insetTop = top
    this.insetBottom = bottom
    this.relayout()
  }

  private relayout() {
    this.L = stallLayout(this.kind, this.w, this.h, this.insetTop, this.insetBottom)
    this.back = null
    this.front = null
    this.lift = this.L.slots.map(() => 0)
    if (this.products.length) this.setProducts(this.products, true)
  }

  /** Replace the goods (keeps the current page when possible). */
  setProducts(products: Product[], keepPage = true) {
    const label = this.pages[this.page]?.label
    this.products = products
    this.pages = layoutPages(products, this.L.slots, this.w)
    const i = keepPage && label ? this.pages.findIndex((p) => p.label === label) : -1
    this.page = i >= 0 ? i : Math.min(this.page, this.pages.length - 1)
  }

  goPage(i: number) {
    if (i === this.page || i < 0 || i >= this.pages.length) return
    this.slideDir = i > this.page ? 1 : -1
    this.prevPage = this.page
    this.page = i
    this.slideT = 0
    this.selected = null
  }

  select(slot: number | null) {
    this.selected = slot
  }

  productAt(slot: number): Product | undefined {
    return this.pages[this.page]?.placed.get(slot)
  }

  /** NPC reaction: a pose for a moment plus an emote bubble. */
  react(pose: DollPose, emote?: Emote, secs = 1.3) {
    this.pose = pose
    this.poseT = secs
    if (emote) this.emote = { kind: emote, t: 1.6 }
    if (pose === 'happy') this.hop = 0.35
  }

  /** Celebrate a purchase from a slot: sparkles, hearts and the item flying to you. */
  bought(slot: number, rare: boolean) {
    const s = this.L.slots[slot]
    const p = this.productAt(slot)
    const [cx, cy] = this.itemCenter(s, p)
    this.particles.sparkles(cx, cy, rare ? 18 : 10, rare ? '#fff3a6' : '#ffffff', 14)
    if (p) this.flyers.push({ sprite: p.sprite(), x: cx, y: cy, tx: this.w / 2, ty: this.h + 10, t: 0 })
    const hx = this.L.npcX + 34
    const hy = this.L.npcY + 4
    this.particles.hearts(hx, hy, 3)
    if (rare) this.particles.confetti(this.w / 2, this.L.counterY - 20, 30)
  }

  /** Where the NPC's head / hands are (virtual px). */
  npcHead(): [number, number] {
    return [this.L.npcX + 34, this.L.npcY + 2]
  }
  npcHands(): [number, number] {
    return [this.L.npcX + 34, this.L.counterY - 6]
  }

  itemCenter(s: StallSlot, p?: Product): [number, number] {
    const sp = p?.sprite()
    const h = sp?.h ?? 16
    if (s.role === 'hook' || s.role === 'rack') return [s.x, s.y + 4 + h / 2]
    return [s.x, s.y - h / 2]
  }

  /** Item rectangle for hit tests and DOM anchoring. */
  itemRect(i: number): [number, number, number, number] | null {
    const s = this.L.slots[i]
    const p = this.productAt(i)
    if (!s || !p) return null
    const sp = p.sprite()
    const w = Math.max(sp.w, 14)
    const h = Math.max(sp.h, 14)
    const top = s.role === 'hook' || s.role === 'rack' ? s.y + 3 : s.y - h
    return [s.x - w / 2, top, w, h]
  }

  update(dt: number) {
    this.t += dt
    this.enterT = Math.min(1, this.enterT + dt / ENTER)
    this.slideT = Math.min(1, this.slideT + dt / SLIDE)
    if (this.slideT >= 1) this.prevPage = null
    for (let i = 0; i < this.lift.length; i++) this.lift[i] += ((this.selected === i ? 1 : 0) - this.lift[i]) * Math.min(1, dt * 14)
    if (this.poseT > 0) {
      this.poseT -= dt
      if (this.poseT <= 0) this.pose = 'stand'
    }
    this.hop = Math.max(0, this.hop - dt)
    this.blinkT -= dt
    if (this.blinkT < -0.14) this.blinkT = 2 + Math.random() * 3
    // Little idle gestures.
    this.idleT -= dt
    if (this.idleT <= 0) {
      this.idleT = 6 + Math.random() * 6
      if (this.pose === 'stand' && !this.talking) {
        const r = Math.random()
        if (r < 0.35) this.react('think', Math.random() < 0.5 ? 'note' : undefined, 1.4)
        else if (r < 0.6) this.react('happy', undefined, 0.6)
        else this.emote = { kind: 'note', t: 1.4 }
      }
    }
    if (this.emote) {
      this.emote.t -= dt
      if (this.emote.t <= 0) this.emote = null
    }
    // Sparkles on rare goods.
    const pg = this.pages[this.page]
    if (pg && this.slideT >= 1)
      for (const [i, p] of pg.placed) {
        if ((p.rarity === 'epic' || p.rarity === 'legendary') && Math.random() < dt * (p.rarity === 'legendary' ? 3 : 1.4)) {
          const r = this.itemRect(i)
          if (r) this.particles.sparkles(r[0] + Math.random() * r[2], r[1] + Math.random() * r[3], 1, p.rarity === 'legendary' ? '#fff3a6' : '#e2d2ff', 2)
        }
      }
    for (const f of this.flyers) f.t += dt / 0.8
    this.flyers = this.flyers.filter((f) => f.t < 1)
    this.particles.update(dt)
  }

  render(g: Surface) {
    const L = this.L
    if (!this.back) this.back = bakeStallBack(this.kind, L)
    if (!this.front) this.front = bakeStallFront(this.kind, L)
    g.clear('#2b2340')
    g.draw(this.back, 0, 0)
    drawStallFx(g, this.kind, L, this.t, false)
    // Goods behind the NPC.
    this.drawGoods(g, false)
    this.drawNpc(g)
    g.draw(this.front, 0, 0)
    this.drawGoods(g, true)
    drawStallFx(g, this.kind, L, this.t, true)
    for (const f of this.flyers) {
      const k = easeOutCubic(f.t)
      const x = f.x + (f.tx - f.x) * k
      const y = f.y + (f.ty - f.y) * k - Math.sin(f.t * Math.PI) * 30
      g.alpha(1 - f.t * 0.6)
      g.draw(f.sprite.canvas, Math.round(x - f.sprite.w / 2), Math.round(y - f.sprite.h / 2))
      g.alpha(1)
    }
    this.particles.render(g)
    if (this.emote) this.drawEmote(g)
    // Enter: fade from dark.
    if (this.enterT < 1) {
      g.alpha(1 - easeOutCubic(this.enterT))
      g.rect(0, 0, this.w, this.h, '#1c1424')
      g.alpha(1)
    }
  }

  private drawNpc(g: Surface) {
    const L = this.L
    const pop = easeOutBack(clamp((this.enterT - 0.15) / 0.7))
    const breathe = Math.round(Math.sin(this.t * 2.1) * 0.6)
    const hop = this.hop > 0 ? -Math.round(Math.sin((this.hop / 0.35) * Math.PI) * 4) : 0
    const y = L.npcY + breathe + hop + Math.round((1 - pop) * 60)
    const blink = this.blinkT < 0
    const s = dollSprite(this.npc.look, this.pose, { blink })
    // Soft shadow on the back wall.
    g.alpha(0.18)
    g.ellipse(L.npcX + 34, L.counterY - 2, 30, 5, '#3a2838')
    g.alpha(1)
    g.drawScaled(s.canvas, L.npcX, y, 2)
    // Talking mouth.
    if (this.talking && this.pose !== 'happy' && Math.floor(this.t * 7) % 2 === 0) {
      g.rect(L.npcX + 32, y + 44, 4, 2, '#8a3a4a')
      g.rect(L.npcX + 33, y + 46, 2, 1, '#ff8f9c')
    }
  }

  private drawEmote(g: Surface) {
    const e = this.emote!
    const [hx, hy] = this.npcHead()
    const x = hx + 26
    const y = hy + 4 - Math.round((1.6 - e.t) * 3)
    if (e.t < 0.3 && Math.floor(e.t * 20) % 2) return
    g.circle(x, y, 6, '#ffffff')
    g.ellipse(x - 5, y + 6, 2, 1.5, '#ffffff')
    g.px(x - 8, y + 8, '#ffffff')
    const ink = '#3a2838'
    switch (e.kind) {
      case 'heart':
        for (const [dx, dy] of [[-2, -1], [-1, -2], [1, -2], [2, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2], [0, -1]] as [number, number][]) g.px(x + dx, y + dy, '#ff6f91')
        break
      case 'note':
        g.vline(x + 1, y - 3, y + 1, ink)
        g.rect(x - 1, y + 1, 2, 2, ink)
        g.px(x + 2, y - 3, ink)
        g.px(x + 3, y - 2, ink)
        break
      case 'sweat':
        g.ellipse(x, y + 1, 2, 2.5, '#78d2e2')
        g.px(x, y - 2, '#78d2e2')
        g.px(x - 1, y, '#ffffff')
        break
      case 'anger':
        for (const [dx, dy] of [[-2, -2], [-1, -1], [1, -1], [2, -2], [-2, 2], [-1, 1], [1, 1], [2, 2]] as [number, number][]) g.px(x + dx, y + dy, '#e8514a')
        break
      case 'coin':
        g.circle(x, y, 3, '#e9a53a')
        g.circle(x, y, 2, '#ffd54f')
        g.px(x, y, '#e9a53a')
        break
      case 'sparkle':
        g.px(x, y, '#ffd54f')
        for (const d of [1, 2]) {
          g.px(x - d, y, '#ffd54f')
          g.px(x + d, y, '#ffd54f')
          g.px(x, y - d, '#ffd54f')
          g.px(x, y + d, '#ffd54f')
        }
        break
      default:
        drawText(g, e.kind === 'bang' ? '!' : '?', x - 1, y - 2, ink)
    }
  }

  private drawGoods(g: Surface, front: boolean) {
    const L = this.L
    const slide = this.prevPage !== null ? easeOutCubic(this.slideT) : 1
    const drawPage = (pi: number, dx: number) => {
      const pg = this.pages[pi]
      if (!pg) return
      L.slots.forEach((s, i) => {
        if (s.front !== front) return
        const p = pg.placed.get(i)
        const drop = Math.round((1 - easeOutBack(clamp((this.enterT - 0.25 - i * 0.02) / 0.5))) * -10)
        g.ox = -dx
        g.oy = -drop
        drawContainer(g, this.kind, s, i)
        if (p) this.drawProduct(g, s, i, p)
        else if (pi === this.page) drawFiller(g, this.kind, s, i)
        g.ox = 0
        g.oy = 0
      })
    }
    if (this.prevPage !== null) {
      drawPage(this.prevPage, Math.round(-this.slideDir * slide * this.w))
      drawPage(this.page, Math.round(this.slideDir * (1 - slide) * this.w))
    } else drawPage(this.page, 0)
  }

  private drawProduct(g: Surface, s: StallSlot, i: number, p: Product) {
    const sp = p.sprite()
    const lift = this.lift[i] ?? 0
    const up = Math.round(lift * (4 + Math.sin(this.t * 6) * 1))
    const hanging = s.role === 'hook' || s.role === 'rack'
    let x = Math.round(s.x - sp.w / 2)
    let y = hanging ? s.y + 4 - up : s.y - sp.h - up - (s.role === 'counter' ? 1 : 0)
    if (hanging) {
      const sway = Math.round(Math.sin(this.t * 1.6 + i * 1.3) * 0.7)
      x += sway
      // Hook wire or hanger.
      if (s.role === 'rack') {
        g.line(s.x - 6, y + 2, s.x, y - 2, '#a8a8b8')
        g.line(s.x + 6, y + 2, s.x, y - 2, '#a8a8b8')
        g.vline(s.x, y - 5, y - 2, '#a8a8b8')
      } else g.vline(s.x, s.y + 2, y + 1, '#c9c9d4')
      if (!p.hangs && p.kind !== 'outfit') {
        // Blister card with a hole.
        const col = p.rarity ? RARITY_INFO[p.rarity].color : '#fffaf0'
        g.rect(x - 2, y - 1, sp.w + 4, sp.h + 3, '#3a2838')
        g.rect(x - 1, y, sp.w + 2, sp.h + 1, col)
        g.rect(x - 1, y, sp.w + 2, 3, '#fffaf0')
        g.px(s.x, y + 1, '#3a2838')
        y += 2
      }
    }
    const soldOut = p.left === 0
    if (lift > 0.05) {
      // Lifted: white glow outline and a shadow.
      g.alpha(0.25 * lift)
      g.ellipse(s.x, hanging ? y + sp.h + 3 : s.y, sp.w / 2, 2, '#3a2838')
      g.alpha(1)
      g.alpha(lift)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) glowDraw(g, sp, x + dx, y + dy)
      g.alpha(1)
    }
    if (soldOut) g.alpha(0.45)
    g.draw(sp.canvas, x, y)
    g.alpha(1)
    if (s.role === 'case') {
      g.alpha(0.18)
      g.rect(x, y, sp.w, sp.h, '#d4f1ff')
      g.alpha(1)
    }
    if (soldOut) {
      // Red "sold out" tape.
      g.rect(x - 2, y + sp.h / 2 - 2, sp.w + 4, 5, '#e8514a')
      for (let k = x; k < x + sp.w; k += 4) g.rect(k, y + sp.h / 2, 2, 1, '#fffaf0')
    } else if (p.kind === 'collectible' && !this.owned.has(p.id)) {
      // A yellow star: not in your collection yet.
      const sx = x + sp.w - 3
      const sy = y + 1
      g.px(sx, sy - 1, '#3a2838')
      g.rect(sx - 1, sy, 3, 1, '#ffd54f')
      g.px(sx, sy - 1, '#ffd54f')
      g.px(sx, sy + 1, '#ffd54f')
      g.px(sx - 2, sy, '#3a2838')
      g.px(sx + 2, sy, '#3a2838')
    }
    // Price tag on the shelf edge for goods standing on boards.
    if (!hanging && s.role === 'shelf' && p.price) {
      const txt = String(p.price)
      const tw = txt.length * 4 + 1
      const tx = Math.round(s.x - tw / 2)
      const col = p.rarity ? RARITY_INFO[p.rarity].color : '#fffaf0'
      g.rect(tx - 2, s.y + 1, tw + 3, 9, '#3a2838')
      g.rect(tx - 1, s.y + 2, tw + 1, 7, col)
      g.hline(tx - 1, tx + tw - 1, s.y + 2, mix(col, '#ffffff', 0.5))
      drawText(g, txt, tx, s.y + 3, '#3a2838')
    }
  }

  pointer(e: PointerInfo) {
    if (e.type !== 'down') return
    if (this.enterT < 0.6) return
    const pg = this.pages[this.page]
    if (!pg) return
    // Front goods win over back goods.
    const order = [...pg.placed.keys()].sort((a, b) => Number(this.L.slots[b].front) - Number(this.L.slots[a].front))
    for (const i of order) {
      const r = this.itemRect(i)
      if (!r) continue
      const pad = 3
      if (e.x >= r[0] - pad && e.x <= r[0] + r[2] + pad && e.y >= r[1] - pad && e.y <= r[1] + r[3] + pad) {
        this.cb.onPick?.(i, pg.placed.get(i)!)
        return
      }
    }
    const L = this.L
    if (e.x > L.npcX + 8 && e.x < L.npcX + 60 && e.y > L.npcY && e.y < L.counterY) {
      this.cb.onTapNpc?.()
      return
    }
    this.cb.onTapEmpty?.()
  }
}

const glowCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()

function glowDraw(g: Surface, sp: Sprite, x: number, y: number) {
  let c = glowCache.get(sp.canvas)
  if (!c) {
    c = document.createElement('canvas')
    c.width = sp.w
    c.height = sp.h
    const ctx = c.getContext('2d')!
    ctx.drawImage(sp.canvas, 0, 0)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = '#fff6b0'
    ctx.fillRect(0, 0, sp.w, sp.h)
    glowCache.set(sp.canvas, c)
  }
  g.draw(c, x, y)
}
