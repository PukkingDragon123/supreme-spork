// Shared helpers for the southern place maps (group `south`).

import type { AvatarLook } from '../../../art/avatar'
import type { Surface } from '../../../engine/pixel'
import { sfx } from '../../../engine/audio'
import { rand } from '../../../engine/rng'
import { monkSprite } from '../../../art/characters'
import { drawShadow } from '../../../art/props'
import { randomVisitorLook, type WorldScene } from '../../world'
import { drawPerson, type Gag, type GagPose, type Extra } from '../../gags'
import { seatedMonkSprite } from '../../../art/places/south'
import type { Building } from '../../../art/places/south'
import type { Rect } from '../../pathfind'

export function look(o: Partial<AvatarLook>): AvatarLook {
  return { ...randomVisitorLook(), ...o }
}

export function at(p: { x: number; y: number }, h: { x: number; y: number }) {
  return { x: p.x + h.x, y: p.y + h.y }
}

/** Hook points of a placed building in world space. */
export function hooks(b: Building, p: { x: number; y: number }, name: string) {
  return (b.hooks[name] ?? []).map((h) => at(p, h))
}

/** A TapZones entry that shakes a tree prop and drops petals/leaves. */
export function shakeTree(s: WorldScene, id: string, x: number, y: number, w: number, petal: [string, string], kind: 'petal' | 'leaf' = 'leaf') {
  return {
    rect: { x: x - w / 2, y: y - 60, w, h: 44 } as Rect,
    fn: () => {
      s.shake(id)
      s.drop(x, y - 34, w * 0.7, 6, petal[0], petal[1], kind)
      if (Math.random() < 0.7) s.burstBirds(x, y - 40, 1 + Math.floor(Math.random() * 3))
      sfx.whoosh()
    },
  }
}

/** A monk seated in meditation who chants when tapped. */
export function seatedMonkGag(x: number, y: number, lines: string[], skin = 1, fan = false, lift = 0): Gag {
  return {
    x,
    y,
    w: 16,
    h: 20 + lift,
    lines,
    draw: (g: Surface, p: GagPose) => {
      const chant = p.react > 0 ? Math.floor(p.t * 4) % 2 : Math.floor(p.t * 0.7) % 7 === 0 ? 1 : 0
      const sp = seatedMonkSprite(chant as 0 | 1, skin, fan)
      const y0 = p.y - lift
      g.draw(sp.canvas, p.x - sp.ax, y0 - sp.ay)
      if (p.react > 0 && Math.floor(p.t * 3) % 2) {
        // Little music-note chant marks.
        g.px(p.x + 7, y0 - 22, '#fff3a6')
        g.px(p.x + 8, y0 - 23, '#fff3a6')
        g.px(p.x + 8, y0 - 24, '#fff3a6')
      }
    },
    react: (s, gx, gy) => {
      s.particles.sparkles(gx, gy - 16, 4, '#fff3a6', 6)
      sfx.hum(2)
    },
  }
}

/** A standing monk who sprinkles holy water (ประพรมน้ำมนต์) when tapped. */
export function blessingMonkGag(x: number, y: number, lines: string[], skin = 2): Gag {
  return {
    x,
    y,
    lines,
    draw: (g, p) => {
      const sp = monkSprite('front', p.react > 0 ? 'bless' : 'stand', { skin })
      drawShadow(g, p.x, p.y, 6, 2)
      g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 1))
      // Silver bowl and the whisk of grass.
      g.rect(p.x + 4, p.y - 12, 4, 2, '#d8d8e0')
      g.px(p.x + 5, p.y - 13, '#9fd0ff')
      if (p.react > 0) g.line(p.x + 6, p.y - 14, p.x + 9 + Math.round(Math.sin(p.t * 20) * 2), p.y - 20, '#c9a86a')
    },
    react: (s, gx, gy) => {
      for (let i = 0; i < 10; i++) s.particles.add({ kind: 'drop', x: gx + 8, y: gy - 20, vx: rand(-30, 30), vy: rand(-40, -16), g: 90, max: 0.8, color: '#c8f4fa' })
      s.particles.sparkles(gx, gy - 20, 4, '#e8fbff', 8)
      sfx.splash()
    },
  }
}

/** A person gag (vendor, visitor…) with optional props and view. */
export function personGag(lk: AvatarLook, x: number, y: number, lines: string[], o: { view?: 'front' | 'back' | 'side'; extras?: Extra[]; walk?: Gag['walk']; z?: number; react?: Gag['react']; h?: number } = {}): Gag {
  return {
    x,
    y,
    z: o.z,
    h: o.h,
    lines,
    walk: o.walk,
    draw: (g, p) => drawPerson(g, lk, p, o.view ?? 'front', o.extras ?? []),
    react: o.react,
  }
}

/** Sprite-backed gag (statue/stall/sign) that bounces on tap. */
export function spriteGag(b: Building, x: number, y: number, lines: string[], react?: Gag['react'], wh?: [number, number]): Gag {
  return {
    x,
    y,
    w: wh?.[0] ?? Math.min(b.w, 30),
    h: wh?.[1] ?? Math.min(b.h, 40),
    lines,
    draw: (g, p) => {
      const hop = p.react > 1.3 ? -1 : 0
      g.draw(b.canvas, p.x - b.ax, p.y - b.ay + hop)
    },
    react,
  }
}
