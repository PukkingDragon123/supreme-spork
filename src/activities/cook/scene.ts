// The close-up kitchen stage: a cosy backdrop, one station at a time and
// the step mini-games of a recipe, with slide transitions, sizzle, steam,
// sparkles and a little screen shake.

import type { Surface } from '../../engine/pixel'
import type { PointerInfo, Scene } from '../../engine/stage'
import { Particles } from '../../engine/particles'
import { rand } from '../../engine/rng'
import { sfx } from '../../engine/audio'
import { bakeKitchen, drawBits, drawPot, drawStove, drawFlames, kitchenSpots } from '../../art/cooking'
import { catPoseSprite } from '../../art/characters'
import { drawAt } from '../../art/jobs'
import { drawGecko, drawZzz } from '../../art/workLife'
import type { Bit, CookRecipe, Vessel } from '../../game/data/recipes'
import { chefFeet, makeGame, type Kitchen, type StepGame } from './games'
import { Worker } from '../jobs/worker'
import { WP } from '../../art/poses/work'
import { glow, sunRays, vignette } from '../../art/workFx'

export interface KitchenCallbacks {
  /** A new step started (index into recipe.steps). */
  onStep?(i: number, game: StepGame): void
  /** The current step finished with a 0..1 score. */
  onGrade?(i: number, score: number): void
  /** All steps done. */
  onFinish?(scores: number[]): void
}

const GRADE_TIME = 1.25
const SLIDE_TIME = 0.42

export class KitchenScene implements Scene, Kitchen {
  w = 180
  h = 360
  t = 0
  /** Screen area covered by the DOM top bar and bottom panel (virtual px). */
  insetTop = 30
  insetBottom = 72
  readonly particles = new Particles()
  recipe: CookRecipe | null = null
  index = -1
  game: StepGame | null = null
  private prev: StepGame | null = null
  phase: 'idle' | 'play' | 'grade' | 'slide' | 'done' = 'idle'
  private phaseT = 0
  scores: number[] = []
  private shakeT = 0
  private shakeAmp = 0
  private bg: HTMLCanvasElement | null = null
  private sizzleT = 0
  dishId = 'dish_kaijiao'
  cookVessel: Vessel = 'wok'
  carry: Bit[] = ['rice']
  cb: KitchenCallbacks = {}
  /** Something burnt during this recipe. */
  burnt = false
  /** The player cooking behind the counter, in an apron. */
  chef: Worker | null = null
  private bgBack = -1

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }

  get counterY() {
    return Math.max(96, Math.round(this.h * 0.32))
  }

  get cx() {
    return Math.round(this.w / 2)
  }

  get cy() {
    const top = this.counterY + 8
    const bot = this.h - this.insetBottom - 6
    return Math.round(top + Math.max(60, bot - top) * 0.44)
  }

  /** Back edge of the counter, just behind the station: the chef's waist. */
  get backY() {
    return this.cy - 36
  }

  shake(px = 1) {
    this.shakeT = 0.1
    this.shakeAmp = Math.max(this.shakeAmp, px)
  }

  sizzle() {
    if (this.sizzleT > 0) return
    this.sizzleT = 0.07
    sfx.scratch()
  }

  /** Start cooking a recipe from its first step. */
  start(recipe: CookRecipe, dishId: string) {
    this.recipe = recipe
    this.dishId = dishId
    this.index = -1
    this.scores = []
    this.burnt = false
    this.carry = ['rice']
    // The plating step serves from the last vessel something was cooked in.
    const cooking = recipe.steps.filter((s) => s.vessel && s.vessel !== 'board')
    this.cookVessel = cooking.length ? (cooking[cooking.length - 1].vessel as Vessel) : 'wok'
    this.next()
  }

  private next() {
    const r = this.recipe
    if (!r) return
    this.prev = this.game
    this.index++
    if (this.index >= r.steps.length) {
      // Keep the plated dish on screen behind the result card.
      this.game = this.prev
      this.prev = null
      this.phase = 'done'
      this.cb.onFinish?.(this.scores)
      return
    }
    const step = r.steps[this.index]
    // What is in the pan so far (seasoning shows it, plating serves it).
    const stirs = r.steps.slice(0, this.index).filter((s) => s.kind === 'stir' && s.items?.length)
    this.carry = step.kind === 'plate' || !stirs.length ? platingBits(r.id) : stirs[stirs.length - 1].items!
    this.game = makeGame(step, this)
    this.phase = this.prev ? 'slide' : 'play'
    this.phaseT = 0
    if (this.chef) this.chef.face = 'none'
    if (this.prev) sfx.whoosh()
    this.cb.onStep?.(this.index, this.game)
  }

  update(dt: number) {
    this.t += dt
    this.shakeT = Math.max(0, this.shakeT - dt)
    if (this.shakeT <= 0) this.shakeAmp = 0
    this.sizzleT -= dt
    this.phaseT += dt
    this.particles.update(dt)
    if (this.phase === 'slide' && this.phaseT >= SLIDE_TIME) {
      this.phase = 'play'
      this.phaseT = 0
      this.prev = null
    }
    const g = this.game
    if (g && this.phase !== 'slide' && this.phase !== 'idle') g.update(dt)
    if (g && this.phase === 'play' && g.done) {
      this.scores.push(g.score)
      this.phase = 'grade'
      this.phaseT = 0
      this.cb.onGrade?.(this.index, g.score)
      if (g.score >= 0.88) this.particles.sparkles(this.cx, this.cy - 20, 16, '#fff3a6', 30)
      this.chefReact(g.score)
    }
    this.updateChef(dt)
    if (this.phase === 'grade' && this.phaseT >= GRADE_TIME) this.next()
    if (this.phase === 'idle') {
      // Book view: a pot of rice soup simmering on the stove.
      if (Math.random() < dt * 4) this.particles.add({ kind: 'smoke', x: this.cx + rand(-18, 18), y: this.cy - 20, vx: rand(-3, 3), vy: rand(-16, -9), max: rand(1, 1.6), color: '#ffffff', size: 2, drag: 0.5 })
    }
  }

  private chefReact(score: number) {
    const c = this.chef
    if (!c) return
    if (score >= 0.88) c.reactWith('thumbs', GRADE_TIME)
    else if (score >= 0.66) c.reactWith('cheer', GRADE_TIME)
    else if (score >= 0.4) c.reactWith('phew', GRADE_TIME)
    else {
      c.face = this.burnt ? 'soot' : 'sweat'
      c.reactWith('oops', GRADE_TIME)
    }
  }

  private updateChef(dt: number) {
    if (!this.w) return
    if (!this.chef) {
      this.chef = new Worker(this.cx, chefFeet(this))
      this.chef.apron = true
      this.chef.shadow = false
    }
    const c = this.chef
    c.clipY = this.backY
    const g = this.game
    if (this.phase === 'play' && g) g.chefPose(c)
    else if (this.phase === 'idle') {
      c.pose = WP.ready
      c.face = 'none'
      c.goTo(this.cx + 18, chefFeet(this))
    } else if (this.phase === 'slide') {
      c.pose = WP.ready
      c.goTo(this.cx, chefFeet(this))
    }
    c.ty = chefFeet(this)
    c.update(dt)
  }

  render(g: Surface) {
    const { w, h } = this
    if (!this.bg || this.bgBack !== this.backY) {
      this.bg = bakeKitchen(w, h, this.backY)
      this.bgBack = this.backY
    }
    g.draw(this.bg, 0, 0)
    // Warm window light, a cat napping on the sill, a gecko, steam from the back pots.
    glow(g, w * 0.3, this.backY - 60, 70, 0.22, '#fff3c8')
    const k = kitchenSpots(w, this.backY)
    const catPose = Math.sin(this.t * 0.35) > 0.6 ? 'groom' : 'sleep'
    drawAt(g, catPoseSprite(catPose, '#f5a55a', true), k.sill[0], k.sill[1])
    if (catPose === 'sleep') drawZzz(g, k.sill[0] + 5, k.sill[1] - 9, this.t)
    drawGecko(g, w - 8, this.backY - 70 + Math.sin(this.t * 0.3) * 6, this.t)
    if (Math.random() < 0.15) this.particles.add({ kind: 'smoke', x: k.pot[0] + rand(-6, 6), y: k.pot[1] - 4, vx: rand(-3, 3), vy: rand(-14, -8), max: rand(0.9, 1.4), color: '#ffffff', size: 2, drag: 0.5 })
    if (Math.random() < 0.06) this.particles.add({ kind: 'smoke', x: k.cooker[0], y: k.cooker[1] - 4, vx: rand(-2, 2), vy: rand(-16, -10), max: 1.1, color: '#ffffff', size: 1, drag: 0.5 })
    this.chef?.draw(g)
    const sx = this.shakeAmp ? Math.round(rand(-this.shakeAmp, this.shakeAmp)) : 0
    const sy = this.shakeAmp ? Math.round(rand(-this.shakeAmp, this.shakeAmp) * 0.5) : 0
    if (this.phase === 'idle') {
      g.setCamera(sx, sy)
      drawStove(g, this.cx, this.cy + 12)
      drawFlames(g, this.cx, this.cy + 12, this.t, 0.5)
      const f = drawPot(g, this.cx, this.cy)
      drawBits(g, ['porridge', 'pork'], f.cx, f.cy, f.rx, f.ry, this.t * 0.4, 2)
    }
    if (this.phase === 'slide' && this.prev) {
      const k = easeInOut(Math.min(1, this.phaseT / SLIDE_TIME))
      g.setCamera(Math.round(k * w) + sx, sy)
      this.prev.draw(g)
      g.setCamera(Math.round((k - 1) * w) + sx, sy)
      this.game?.draw(g)
    } else if (this.game) {
      g.setCamera(sx, sy)
      this.game.draw(g)
      g.setCamera(0, 0)
      if (this.chef && (this.phase === 'play' || this.phase === 'grade' || this.phase === 'done') && !this.chef.reacting) this.game.drawHeld(g, this.chef)
    }
    g.setCamera(0, 0)
    this.particles.render(g)
    if (this.game && this.phase === 'play') this.game.drawCursor(g, this.t)
    sunRays(g, w, h, this.t, '#fff2c4', 0.1, 0)
    vignette(g, w, h, 0.18)
  }

  pointer(e: PointerInfo) {
    if (this.phase === 'play' && this.game) this.game.pointer(e)
  }
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/** What gets scooped onto the plate for each recipe. */
function platingBits(recipeId: string): Bit[] {
  switch (recipeId) {
    case 'kaijiao':
      return ['egg']
    case 'khaopad':
      return ['rice', 'egg', 'onion']
    case 'tomjued':
      return ['soup', 'tofu', 'cabbage', 'pork']
    case 'khaotom':
      return ['porridge', 'pork', 'onion']
    case 'kaprao':
      return ['pork', 'basil', 'chili']
    case 'khanomkrok':
      return ['batter']
    case 'bualoy':
      return ['coconut', 'dough']
    case 'padthai':
      return ['egg']
    case 'mango':
      return ['sticky']
    case 'kiaowan':
      return ['curry', 'chicken', 'basil']
  }
  return ['rice']
}
