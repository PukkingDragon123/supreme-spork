// Quest layer for the walkable worlds:
// - mergeQuestNpcs(map): adds the quest-giver NPCs registered for a map
//   (src/game/data/questNpcs.ts) as `npc:<id>` hotspots plus a Life system
//   that draws them (avatar or monk sprites) with small idle animations.
// - drawWorldMarker(): the floating quest markers drawn above givers and
//   shops — gold "!" (quest), grey "!" + level (locked), gold "?" (turn in),
//   grey "?" (in progress), a shop bag and a speech bubble (talk).
// WorldScene takes a marker function via setMarkers(fn).

import type { Surface } from '../engine/pixel'
import { makeSprite, type Sprite } from '../engine/sprite'
import { DEFAULT_LOOK, type AvatarLook, type Pose } from '../art/avatar'
import { monkSprite, noviceSweepSprite } from '../art/characters'
import { drawShadow } from '../art/props'
import { drawPerson, type Extra } from './gags'
import { drawGlow } from './sky'
import { npcAt, questNpcsOn, type QuestNpc } from '../game/data/questNpcs'
import type { Life } from './life'
import type { Facing, Hotspot, MapDef, WorldScene } from './world'

export type WorldMarkerKind = 'quest' | 'locked' | 'turnin' | 'progress' | 'shop' | 'talk'

export interface WorldMarker {
  kind: WorldMarkerKind
  /** Level needed (shown under a grey "!"). */
  level?: number
}

/** Supplied by the UI: which marker (if any) floats above a hotspot. */
export type MarkerFn = (hotspotId: string) => WorldMarker | null

// ---------------------------------------------------------------------------
// Map merge

export function npcLook(n: Pick<QuestNpc, 'look'>): AvatarLook {
  return { ...DEFAULT_LOOK, ...(n.look ?? {}) }
}

export function npcHotspot(n: QuestNpc): Hotspot {
  const at = npcAt(n)
  const dx = n.x - at.x
  const dy = n.y - at.y
  const face: Facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy < 0 ? 'up' : 'down'
  return {
    id: `npc:${n.id}`,
    label: n.name,
    hint: n.role,
    icon: n.icon ?? 'scroll',
    rect: { x: n.x - 8, y: n.y - 28, w: 16, h: 32 },
    at,
    face,
    marker: { x: n.x, y: n.y - 33 },
    near: 16,
  }
}

/** A copy of the map with its quest NPCs merged in (the original is untouched). */
export function mergeQuestNpcs(map: MapDef): MapDef {
  const npcs = questNpcsOn(map.id).filter((n) => !map.hotspots.some((h) => h.id === `npc:${n.id}`))
  if (!npcs.length) return map
  const baseLife = map.life
  return {
    ...map,
    hotspots: [...map.hotspots, ...npcs.map(npcHotspot)],
    life: (s) => [...(baseLife?.(s) ?? []), new QuestNpcs(s, npcs)],
  }
}

// ---------------------------------------------------------------------------
// NPC drawing

interface NpcState {
  n: QuestNpc
  look: AvatarLook
  t: number
  /** Seconds left of the current idle gesture. */
  gesture: number
  next: number
  flip: boolean
}

export class QuestNpcs implements Life {
  private list: NpcState[]
  constructor(
    private s: WorldScene,
    npcs: QuestNpc[],
  ) {
    this.list = npcs.map((n, i) => ({ n, look: npcLook(n), t: i * 0.7, gesture: 0, next: 2 + ((i * 1.7) % 4), flip: false }))
  }

  update(dt: number) {
    const p = this.s.player
    for (const st of this.list) {
      st.t += dt
      st.next -= dt
      st.gesture = Math.max(0, st.gesture - dt)
      if (st.next <= 0) {
        st.next = 4 + Math.random() * 5
        st.gesture = 0.9
      }
      const d = Math.hypot(p.x - st.n.x, p.y - st.n.y)
      if (d < 40 && Math.abs(p.x - st.n.x) > 6) st.flip = p.x < st.n.x
    }
  }

  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const st of this.list) {
      if (!this.s.onScreen(st.n.x, st.n.y - 12, 30)) continue
      add(st.n.y, () => this.draw(this.s.gfx, st, t))
    }
  }

  private draw(g: Surface, st: NpcState, t: number) {
    const { n } = st
    const p = this.s.player
    const near = Math.hypot(p.x - n.x, p.y - n.y) < 30
    const sprite = n.sprite ?? 'person'
    if (sprite !== 'person') {
      const novice = sprite === 'novice'
      const skin = n.look?.skin ?? 2
      let s: Sprite
      if (novice && n.idle === 'sweep' && !near) s = noviceSweepSprite((Math.floor(t * 3) % 2) as 0 | 1, st.flip)
      else s = monkSprite('front', near || st.gesture > 0 ? 'bless' : 'stand', { novice, skin })
      drawShadow(g, n.x, n.y, 6, 2)
      const ox = novice && n.idle === 'sweep' && !near ? 9 : s.w / 2
      g.draw(s.canvas, Math.round(n.x - ox), Math.round(n.y - s.h + 1))
      return
    }
    let pose: Pose = 'stand'
    if (near) pose = Math.floor(t * 1.2) % 5 === 0 ? 'wai' : 'happy'
    else if (st.gesture > 0) pose = n.idle === 'wai' ? 'wai' : n.idle === 'wave' ? 'happy' : 'stand'
    const extras: Extra[] = []
    if (n.prop) extras.push(n.prop)
    if (n.idle === 'phone' && !near && !n.look?.hand) extras.push('phone')
    drawPerson(g, st.look, { x: n.x, y: n.y, flip: st.flip, moving: false, react: 0, t }, 'front', extras, pose)
  }
}

// ---------------------------------------------------------------------------
// Marker art

const INK = '#2a1a12'

const BANG = ['.wY.', 'wYYy', 'YYYy', 'YYYy', 'YYyy', '.Yy.', '.Yy.', '....', '.wY.', '.Yy.']
const QMARK = ['.wYYY.', 'wYyyYy', 'Yy..Yy', '...wYy', '..wYy.', '..Yy..', '..Yy..', '......', '..wY..', '..Yy..']
const BAG = ['..hhh..', '.h...h.', 'wPPPPPp', 'PPPPPPp', 'PPPtPPp', 'PPPPPPp', 'pppppp.']
const TALK = ['.wwwwwww.', 'wwwwwwwww', 'wwdwdwdww', 'wwwwwwwww', '.wwwwwww.', '..ww.....', '..w......']

const GOLD = { w: '#fffbe0', Y: '#ffd84a', y: '#e8a020' }
const SILVER = { w: '#ffffff', Y: '#d9dce6', y: '#9a9fb2' }

const spriteCache = new Map<string, Sprite>()
function art(key: string, rows: string[], pal: Record<string, string>, outline = INK): Sprite {
  let s = spriteCache.get(key)
  if (!s) {
    s = makeSprite(rows, pal, { outline, outlineCorners: true })
    spriteCache.set(key, s)
  }
  return s
}

export function markerSprite(kind: WorldMarkerKind): Sprite {
  switch (kind) {
    case 'quest':
      return art('q!', BANG, GOLD)
    case 'locked':
      return art('q!grey', BANG, SILVER, '#3a3848')
    case 'turnin':
      return art('q?', QMARK, GOLD)
    case 'progress':
      return art('q?grey', QMARK, SILVER, '#3a3848')
    case 'shop':
      return art('qbag', BAG, { h: '#7a4a26', P: '#ff8fb0', p: '#d65f86', w: '#ffd0de', t: '#fff3a6' })
    case 'talk':
      return art('qtalk', TALK, { w: '#fffaf0', d: '#7a5a6a' }, '#3a2838')
  }
}

/** 3×5 digits for the level tag under a locked marker. */
const DIGITS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  v: ['...', '#.#', '#.#', '#.#', '.#.'],
}

function drawTag(g: Surface, text: string, cx: number, y: number) {
  const w = text.length * 4 + 3
  const x = Math.round(cx - w / 2)
  g.rect(x, y, w, 9, '#3a3848')
  g.rect(x + 1, y + 1, w - 2, 7, '#f2f3f8')
  for (let i = 0; i < text.length; i++) {
    const rows = DIGITS[text[i]]
    if (!rows) continue
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (rows[r][c] === '#') g.px(x + 2 + i * 4 + c, y + 2 + r, '#4a4658')
  }
}

/**
 * Draw one marker with its feet at (x, y) in world coords. `hi` = the player
 * is next to it / it is selected (bigger bounce, level tag).
 */
export function drawWorldMarker(g: Surface, m: WorldMarker, x: number, y: number, t: number, hi: boolean) {
  const s = markerSprite(m.kind)
  const big = m.kind === 'quest' || m.kind === 'turnin'
  const speed = big ? 4 : 2.5
  const amp = big ? (hi ? 2.2 : 1.5) : 1
  const bob = Math.round(Math.sin(t * speed + x * 0.1) * amp)
  const top = Math.round(y - s.h + 1 + bob)
  const left = Math.round(x - s.w / 2)
  if (big) {
    drawGlow(g, x, y - s.h / 2 + bob, 10, 0.55 + Math.sin(t * 3) * 0.15, '#ffe27a')
    // Soft floor dot so it reads as floating.
    g.alpha(0.25)
    g.rect(Math.round(x - 2), Math.round(y + 3), 4, 1, INK)
    g.alpha(1)
  }
  g.draw(s.canvas, left, top)
  if (big && (Math.floor(t * 2 + x) % 3 === 0)) {
    // A twinkle on the shoulder of the glyph.
    const k = (t * 2 + x) % 1
    const sx = left + s.w - 1
    const sy = top + 1
    g.alpha(Math.sin(k * Math.PI))
    g.px(sx, sy, '#ffffff')
    g.px(sx - 1, sy, '#fff3a6')
    g.px(sx + 1, sy, '#fff3a6')
    g.px(sx, sy - 1, '#fff3a6')
    g.px(sx, sy + 1, '#fff3a6')
    g.alpha(1)
  }
  if (m.kind === 'locked' && m.level && hi) drawTag(g, `Lv${m.level}`, x, top - 11)
}
