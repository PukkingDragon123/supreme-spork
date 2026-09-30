// Bot Noi in the world: a WorldScene follower (scene.followers) that hovers
// beside the player on the side away from the pet, bobs on its jet, points
// at whatever the tutorial wants, shows a "!"/"?" when it has a quest and
// does little idle gags (scanning a flower, getting dizzy, charging on a
// sunbeam, dozing off). Tap him to open his menu.

import type { Surface } from '../../engine/pixel'
import type { Life } from '../../scenes/life'
import type { WorldScene } from '../../scenes/world'
import { drawGlow } from '../../scenes/sky'
import { drawWorldMarker } from '../../scenes/questLayer'
import { drawShadow } from '../../art/props'
import { botnoiSprite, type BotArm, type BotExpr } from '../../art/botnoi'
import { game } from '../../game/state'
import { focusQuest } from '../../game/npcQuests'
import { BOTNOI_GIVER } from '../../game/data/npcQuests/botnoi'
import { botAllowedInWorld, botFocus, botSayQueue, openBotMenu } from './botStore'
import { GAG_LINES } from './botLines'
import { botSfx } from './botSfx'
import { haptic } from '../../engine/audio'

type Gag = 'scan' | 'dizzy' | 'charge' | 'sleep' | null

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

/** Does Bot Noi have something to hand out? ('?' ready to turn in, '!' new quest). */
export function botQuestMark(): 'turnin' | 'quest' | null {
  const f = focusQuest(BOTNOI_GIVER)
  if (!f) return null
  if (f.status === 'ready') return 'turnin'
  if (f.status === 'available') return 'quest'
  return null
}

export class BotFollower implements Life {
  x: number
  y: number
  /** Hover height above the ground point. */
  z = 12
  flip = false
  private side = -1
  private sideT = 0
  private t = 0
  private idle = 0
  private gag: Gag = null
  private gagT = 0
  private nextGag = 14 + Math.random() * 8
  private blinkT = 2
  private happyT = 0
  private lastPX = 0
  private lastPY = 0
  private markCache: { s: unknown; v: 'turnin' | 'quest' | null } = { s: null, v: null }

  constructor(private s: WorldScene) {
    const p = s.player
    this.x = p.x - 14
    this.y = p.y - 2
    this.lastPX = p.x
    this.lastPY = p.y
  }

  private get visible() {
    return !game.value.botnoi?.hidden && botAllowedInWorld()
  }

  /** Screen (virtual px) position of his head, for DOM overlays. */
  screenPos(): [number, number] {
    return [this.x - this.s.camX, this.y - this.z - 12 - this.s.camY]
  }

  private say(text: string) {
    this.s.say(text, this.x, this.y - this.z - 18, 2.8)
  }

  cheer() {
    this.happyT = 1.6
    this.s.particles.hearts(this.x, this.y - this.z - 16, 3, '#7ff3dd')
  }

  update(dt: number, t: number) {
    this.t = t
    const p = this.s.player
    const moved = Math.hypot(p.x - this.lastPX, p.y - this.lastPY) > 0.5
    this.lastPX = p.x
    this.lastPY = p.y
    if (moved) {
      this.idle = 0
      if (this.gag && this.gag !== 'dizzy') this.gag = null
    } else this.idle += dt
    if (this.happyT > 0) this.happyT -= dt
    this.blinkT -= dt
    if (this.blinkT < -0.14) this.blinkT = 2 + Math.random() * 3

    const said = botSayQueue.shift()
    if (said && this.visible) {
      this.say(said.text)
      this.happyT = Math.max(this.happyT, 1.2)
    }

    // Where to hover: next to the tutorial's focus, else beside the player
    // (on the side away from the pet).
    const focus = botFocus.value
    let tx: number
    let ty: number
    if (focus) {
      const dx = p.x - focus.x
      const dy = p.y - focus.y
      const d = Math.hypot(dx, dy) || 1
      const k = Math.min(1, 22 / d)
      tx = focus.x + dx * k + (Math.abs(dx) < 6 ? 14 : 0)
      ty = focus.y + dy * k
      this.flip = focus.x < tx
    } else {
      const pet = this.s.petWorldPos()
      const want = pet ? (pet.x < p.x ? 1 : -1) : p.facing === 'left' ? 1 : p.facing === 'right' ? -1 : this.side
      if (want !== this.side) {
        this.sideT += dt
        if (this.sideT > 0.7) (this.side = want), (this.sideT = 0)
      } else this.sideT = 0
      tx = p.x + this.side * 15
      ty = p.y - 3
      if (Math.abs(tx - this.x) > 1.5) this.flip = tx < this.x
      else this.flip = p.x < this.x
    }
    const d = Math.hypot(tx - this.x, ty - this.y)
    if (d > 110) {
      this.x = tx
      this.y = ty
    } else {
      const k = 1 - Math.exp(-dt * (d > 40 ? 6 : 3.5))
      this.x += (tx - this.x) * k
      this.y += (ty - this.y) * k
    }
    this.z = 12 + Math.sin(t * 2.6) * 1.5 + (this.gag === 'charge' ? 3 : 0)

    // Idle gags.
    if (this.gag) {
      this.gagT -= dt
      if (this.gag === 'dizzy' && Math.random() < dt * 6) this.s.particles.add({ kind: 'sparkle', x: this.x + (Math.random() - 0.5) * 12, y: this.y - this.z - 18, vy: -6, max: 0.6, color: '#fff3a6' })
      if (this.gagT <= 0) this.gag = null
    } else if (!focus && this.visible && this.idle > 5) {
      this.nextGag -= dt
      if (this.nextGag <= 0) {
        this.nextGag = 16 + Math.random() * 14
        const night = this.s.isNight()
        const g: Gag = this.idle > 45 ? 'sleep' : pick(['scan', 'dizzy', 'charge'] as Gag[])
        this.startGag(g, night)
      }
    }
  }

  private startGag(g: Gag, night: boolean) {
    this.gag = g
    this.gagT = g === 'sleep' ? 20 : g === 'dizzy' ? 2.2 : 3.2
    if (g === 'scan') this.say(pick(GAG_LINES.scan))
    else if (g === 'dizzy') (this.say(pick(GAG_LINES.dizzy)), botSfx.dizzy())
    else if (g === 'charge') this.say(pick(night ? GAG_LINES.moon : GAG_LINES.charge))
    else if (g === 'sleep') this.say(pick(GAG_LINES.sleep))
  }

  private look(): { expr: BotExpr; arm: BotArm; flip: boolean } {
    const focus = botFocus.value
    let flip = this.flip
    if (this.gag === 'dizzy') flip = Math.floor(this.t * 10) % 2 === 0
    const expr: BotExpr =
      this.gag === 'dizzy'
        ? 'dizzy'
        : this.gag === 'scan'
          ? 'scan'
          : this.gag === 'sleep'
            ? 'sleepy'
            : this.gag === 'charge'
              ? 'happy'
              : this.happyT > 0
                ? 'happy'
                : this.blinkT < 0
                  ? 'blink'
                  : focus
                    ? 'normal'
                    : 'normal'
    const arm: BotArm = focus ? 'point' : this.happyT > 0 ? 'cheer' : this.gag === 'charge' ? 'cheer' : this.s.player.moving && Math.floor(this.t * 0.5) % 5 === 0 ? 'wave' : 'down'
    return { expr, arm, flip }
  }

  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (!this.visible) return
    add(this.y, () => {
      const g = this.s.gfx
      const { expr, arm, flip } = this.look()
      const sp = botnoiSprite({ expr, arm, flip, flame: Math.floor(t * 12), glow: Math.sin(t * 3) > 0, phase: Math.floor(t * 6) })
      drawShadow(g, this.x, this.y, 4, 1.2, 'rgba(58,40,56,0.2)')
      const top = Math.round(this.y - this.z - sp.h + 4)
      if (this.gag === 'scan') this.drawScan(g, t, top)
      g.draw(sp.canvas, Math.round(this.x - sp.w / 2), top)
      if (this.gag === 'sleep' && Math.floor(t * 1.2) % 2 === 0) {
        g.px(this.x + 7, top - 1, '#e2e8ff')
        g.px(this.x + 8, top - 3, '#e2e8ff')
      }
    })
  }

  private drawScan(g: Surface, t: number, top: number) {
    // a cyan cone sweeping the ground in front of him
    const dir = this.flip ? -1 : 1
    const cx = this.x + dir * 2
    const cy = top + 9
    const sweep = Math.sin(t * 5) * 6
    g.alpha(0.35)
    for (let i = 0; i < 12; i++) {
      const k = i / 12
      const x = cx + dir * (4 + k * 10)
      const y = cy + k * (this.z + 2) + sweep * k * 0.3
      g.rect(Math.round(x), Math.round(y - k * 3), 1, Math.max(1, Math.round(k * 6)), '#7ff3dd')
    }
    g.alpha(1)
  }

  over(g: Surface, t: number) {
    if (!this.visible || this.gag !== 'charge') return
    // sunbeam from above
    const x = Math.round(this.x)
    const y0 = Math.round(this.y - this.z - 60)
    g.alpha(0.18 + Math.sin(t * 4) * 0.05)
    g.rect(x - 4, y0, 9, 50, this.s.isNight() ? '#c9d8ff' : '#fff3a6')
    g.alpha(0.3)
    g.rect(x - 2, y0, 5, 50, '#ffffff')
    g.alpha(1)
    // battery above the head
    const by = Math.round(this.y - this.z - 30)
    g.frame(x - 5, by, 10, 5, '#3a2838')
    g.px(x + 5, by + 2, '#3a2838')
    const fill = Math.min(8, Math.floor((3.2 - this.gagT) * 3))
    g.rect(x - 4, by + 1, Math.max(1, fill), 3, fill > 5 ? '#7fe07a' : '#ffd24a')
  }

  glow(g: Surface, t: number, light: number) {
    if (!this.visible) return
    const { expr } = this.look()
    void expr
    const top = this.y - this.z - 19 + 4
    const tip = 0.35 + Math.max(0, Math.sin(t * 3)) * 0.5 + light * 0.4
    drawGlow(g, this.x, top + 1, 4, tip, '#ff9fc6')
    drawGlow(g, this.x, this.y - this.z + 2, 3, 0.35 + light * 0.5, '#ffb566')
    // Quest marker: "!" for a new quest, "?" to hand one in.
    const s = game.value
    if (this.markCache.s !== s) this.markCache = { s, v: botQuestMark() }
    const mk = this.markCache.v
    if (mk && !botFocus.value && this.gag !== 'sleep') drawWorldMarker(g, { kind: mk }, this.x, top - 4, t, false)
  }

  tap(wx: number, wy: number): boolean {
    if (!this.visible) return false
    const top = this.y - this.z - 19 + 4
    if (Math.abs(wx - this.x) > 10 || wy < top - 6 || wy > this.y - this.z + 4) return false
    if (this.gag === 'sleep') this.say('ปิ๊บ! ตื่นแล้วครับ ๆ')
    this.gag = null
    this.idle = 0
    this.cheer()
    botSfx.chirp()
    haptic(10)
    openBotMenu('home')
    return true
  }
}

const followers = new WeakMap<WorldScene, BotFollower>()

/** Add Bot Noi to a world scene (TempleView calls this for every map). */
export function attachBotnoi(scene: WorldScene): BotFollower {
  let f = followers.get(scene)
  if (!f) {
    f = new BotFollower(scene)
    followers.set(scene, f)
    scene.followers.push(f)
  }
  current = f
  return f
}

let current: BotFollower | null = null

/** The follower on the current world map (null in the house / menus). */
export function botFollower(): BotFollower | null {
  return current
}
