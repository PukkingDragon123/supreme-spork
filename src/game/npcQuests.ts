// NPC quest engine. Quest givers are world hotspots: free-standing NPCs
// (`npc:<id>`, see data/questNpcs.ts) and shop keepers (`shop:<placeShopId>`).
// Accept a quest → its steps advance, in order, from tracked game events
// (onTrack) → walk back to the giver and turn it in for coins, merit, items,
// outfits, pets and collectibles.
//
// Rules
// - Steps are sequential: an event only counts for the first unfinished step.
// - `step.map` limits a step to one map (its interiors `<map>:<room>` count).
// - `step.npc` limits an `npc_talk` step to talking with that giver.
// - `requires` chains quests; `level` gates them (shown as a grey "!");
//   `repeat: 'daily'` quests come back the next day.
// - Collectible rewards go through a pluggable granter (setCollectibleGranter);
//   until one is plugged in they wait in `npcQuests.pending`.

import { signal } from '@preact/signals'
import { game, mutate, type GameState } from './state'
import { addCoins, addMerit, onTrack, track } from './actions'
import { levelFromMerit } from './economy'
import { dayKey } from './time'
import { toast } from './events'
import { mapId } from '../ui/store'
import { NPC_QUESTS, NPC_QUEST_BY_ID } from './data/npcQuests'
import type { NpcQuestDef, NpcQuestReward, NpcQuestStep } from './data/npcQuestTypes'
import type { GameEvent } from './data/quests'
import { OUTFIT_BY_ID } from './data/outfits'
import { PET_BY_ID } from './data/pets'
import { ITEM_BY_ID } from './data/items'
import { emptyNpcQuests, type NpcQuestProgress, type NpcQuestsState } from './npcQuestState'

export type QuestStatus =
  /** `requires` not done yet (hidden). */
  | 'locked'
  /** Chain is open but the player's level is too low (grey "!"). */
  | 'level'
  | 'available'
  | 'active'
  /** Every step done: return to the giver. */
  | 'ready'
  /** One-off quest already turned in. */
  | 'done'
  /** Daily quest already turned in today. */
  | 'cooldown'

export type MarkerKind = 'quest' | 'locked' | 'turnin' | 'progress' | 'shop' | 'talk'

export interface QuestMarker {
  kind: MarkerKind
  /** Level needed (for 'locked'). */
  level?: number
}

export interface QuestCtx {
  /** Map the player is on. */
  map: string
  /** Giver hotspot being talked to right now (for `npc_talk` steps). */
  npc?: string | null
}

export interface QuestTick {
  id: string
  step: number
  /** This event finished the step. */
  done: boolean
  /** Every step is now done. */
  ready: boolean
}

export interface GrantedReward {
  coins: number
  merit: number
  items: Record<string, number>
  outfits: string[]
  pets: string[]
  collectibles: Record<string, number>
  /** Coins paid instead of outfits/pets the player already owned. */
  dupeCoins: number
}

const qs = (s: GameState): NpcQuestsState => s.npcQuests ?? emptyNpcQuests()

// ---------------------------------------------------------------------------
// Registry lookups

let byGiverCache: { n: number; map: Map<string, NpcQuestDef[]> } | null = null

/** All quests a giver hotspot (`npc:<id>` / `shop:<id>`) offers, in data order. */
export function questsByGiver(giver: string): NpcQuestDef[] {
  if (!byGiverCache || byGiverCache.n !== NPC_QUESTS.length) {
    const map = new Map<string, NpcQuestDef[]>()
    for (const q of NPC_QUESTS) {
      const l = map.get(q.giver) ?? []
      l.push(q)
      map.set(q.giver, l)
    }
    byGiverCache = { n: NPC_QUESTS.length, map }
  }
  return byGiverCache.map.get(giver) ?? []
}

export function questById(id: string): NpcQuestDef | undefined {
  return NPC_QUEST_BY_ID[id]
}

/** Every giver hotspot id that has quests. */
export function questGivers(): string[] {
  questsByGiver('')
  return [...byGiverCache!.map.keys()]
}

// ---------------------------------------------------------------------------
// Status

/** Index of the first unfinished step (steps.length when all are done). */
export function stepIndex(def: NpcQuestDef, prog: NpcQuestProgress): number {
  for (let i = 0; i < def.steps.length; i++) if ((prog.p[i] ?? 0) < def.steps[i].target) return i
  return def.steps.length
}

export function stepsDone(def: NpcQuestDef, prog: NpcQuestProgress): boolean {
  return stepIndex(def, prog) >= def.steps.length
}

export function questStatus(def: NpcQuestDef, s: GameState = game.value, day = dayKey()): QuestStatus {
  const q = qs(s)
  const a = q.active[def.id]
  if (a) return stepsDone(def, a) ? 'ready' : 'active'
  if (def.repeat === 'daily') {
    if (q.last[def.id] === day) return 'cooldown'
  } else if (q.done[def.id]) return 'done'
  if (def.requires?.some((r) => !q.done[r])) return 'locked'
  if ((def.level ?? 1) > levelFromMerit(s.merit).level) return 'level'
  return 'available'
}

export function progressOf(id: string, s: GameState = game.value): NpcQuestProgress | null {
  return qs(s).active[id] ?? null
}

/** Accepted quests (newest first). */
export function activeQuests(s: GameState = game.value): { def: NpcQuestDef; prog: NpcQuestProgress; status: QuestStatus }[] {
  return Object.entries(qs(s).active)
    .map(([id, prog]) => ({ def: NPC_QUEST_BY_ID[id], prog }))
    .filter((x): x is { def: NpcQuestDef; prog: NpcQuestProgress } => !!x.def)
    .sort((a, b) => b.prog.at - a.prog.at)
    .map((x) => ({ ...x, status: stepsDone(x.def, x.prog) ? ('ready' as const) : ('active' as const) }))
}

const MARKER_RANK: Record<QuestStatus, number> = { ready: 5, available: 4, active: 3, level: 2, locked: 0, done: 0, cooldown: 0 }

/**
 * The quest a giver should talk about first: ready > available > active >
 * level-locked. Null when there is nothing to offer.
 */
export function focusQuest(giver: string, s: GameState = game.value): { def: NpcQuestDef; status: QuestStatus } | null {
  let best: { def: NpcQuestDef; status: QuestStatus } | null = null
  const day = dayKey()
  for (const def of questsByGiver(giver)) {
    const status = questStatus(def, s, day)
    const r = MARKER_RANK[status]
    if (!r) continue
    if (!best || r > MARKER_RANK[best.status] || (status === 'level' && best.status === 'level' && (def.level ?? 1) < (best.def.level ?? 1))) best = { def, status }
  }
  return best
}

/** Quests at a giver the player can act on now (to turn in, to accept or in progress). */
export function actionableQuests(giver: string, s: GameState = game.value): { def: NpcQuestDef; status: QuestStatus }[] {
  const day = dayKey()
  return questsByGiver(giver)
    .map((def) => ({ def, status: questStatus(def, s, day) }))
    .filter((x) => x.status === 'ready' || x.status === 'available' || x.status === 'active')
    .sort((a, b) => MARKER_RANK[b.status] - MARKER_RANK[a.status])
}

let markerCache: { s: GameState; day: string; m: Map<string, QuestMarker | null> } | null = null

/** World marker for a giver hotspot (null for hotspots that are not givers or shops). */
export function giverMarker(giver: string, s: GameState = game.value): QuestMarker | null {
  const f = focusQuest(giver, s)
  if (f) {
    if (f.status === 'ready') return { kind: 'turnin' }
    if (f.status === 'available') return { kind: 'quest' }
    if (f.status === 'active') return { kind: 'progress' }
    if (f.status === 'level') return { kind: 'locked', level: f.def.level ?? 1 }
  }
  if (giver.startsWith('shop:')) return { kind: 'shop' }
  if (giver.startsWith('npc:')) return { kind: 'talk' }
  return null
}

/** Marker function for WorldScene.setMarkers (memoised per state object). */
export function questMarkerFor(hotspotId: string): QuestMarker | null {
  if (!hotspotId.startsWith('npc:') && !hotspotId.startsWith('shop:')) return null
  const s = game.value
  const day = dayKey()
  if (!markerCache || markerCache.s !== s || markerCache.day !== day) markerCache = { s, day, m: new Map() }
  let v = markerCache.m.get(hotspotId)
  if (v === undefined) {
    v = giverMarker(hotspotId, s)
    markerCache.m.set(hotspotId, v)
  }
  return v
}

// ---------------------------------------------------------------------------
// Progress from tracked events

export function stepMapMatches(want: string | undefined, cur: string): boolean {
  return !want || cur === want || cur.startsWith(`${want}:`)
}

export function stepMatches(step: NpcQuestStep, event: GameEvent, ctx: QuestCtx): boolean {
  if (step.event !== event) return false
  if (!stepMapMatches(step.map, ctx.map)) return false
  if (step.npc && step.npc !== ctx.npc) return false
  return true
}

/** Place-visit steps are done as soon as you stand in that place. */
function settle(def: NpcQuestDef, prog: NpcQuestProgress, ctx: QuestCtx) {
  for (let i = stepIndex(def, prog); i < def.steps.length; i = stepIndex(def, prog)) {
    const st = def.steps[i]
    if (st.event !== 'place_visit' || !st.map || !stepMapMatches(st.map, ctx.map)) break
    prog.p[i] = st.target
  }
}

/**
 * Apply one tracked event to every accepted quest in a (draft) state.
 * Pure apart from mutating `d`; returns what changed.
 */
export function applyQuestEvent(d: GameState, event: GameEvent, amount: number, ctx: QuestCtx): QuestTick[] {
  const ticks: QuestTick[] = []
  const q = qs(d)
  for (const [id, prog] of Object.entries(q.active)) {
    const def = NPC_QUEST_BY_ID[id]
    if (!def) continue
    const i = stepIndex(def, prog)
    if (i >= def.steps.length) continue
    const step = def.steps[i]
    if (!stepMatches(step, event, ctx)) continue
    const gain = event === 'login' ? 1 : Math.max(0, amount)
    if (gain <= 0) continue
    while (prog.p.length < def.steps.length) prog.p.push(0)
    prog.p[i] = Math.min(step.target, (prog.p[i] ?? 0) + gain)
    const done = prog.p[i] >= step.target
    if (done) settle(def, prog, ctx)
    ticks.push({ id, step: i, done, ready: stepsDone(def, prog) })
  }
  return ticks
}

function wouldTick(s: GameState, event: GameEvent, ctx: QuestCtx): boolean {
  for (const [id, prog] of Object.entries(qs(s).active)) {
    const def = NPC_QUEST_BY_ID[id]
    if (!def) continue
    const i = stepIndex(def, prog)
    if (i < def.steps.length && stepMatches(def.steps[i], event, ctx)) return true
  }
  return false
}

/** Last quest progress (the HUD pill pulses and plays a sound on it). */
export const questPulse = signal<(QuestTick & { t: number }) | null>(null)

let talking: string | null = null

export function currentCtx(): QuestCtx {
  return { map: mapId.value, npc: talking }
}

function onEvent(event: GameEvent, amount: number) {
  const ctx = currentCtx()
  if (!wouldTick(game.value, event, ctx)) return
  let ticks: QuestTick[] = []
  mutate((d) => {
    d.npcQuests = qs(d)
    ticks = applyQuestEvent(d, event, amount, ctx)
  })
  for (const tk of ticks) {
    const def = NPC_QUEST_BY_ID[tk.id]
    if (!def) continue
    if (tk.ready) toast(`เควสต์ “${def.title}” ครบแล้ว! กลับไปหา${def.npcName}รับรางวัล`, 'scroll')
    else if (tk.done) toast(`สำเร็จ: ${def.steps[tk.step].text}`, 'check')
    questPulse.value = { ...tk, t: Date.now() }
  }
}

let unhook: (() => void) | null = null

/** Start listening to tracked events (idempotent; runs on import). */
export function installNpcQuests() {
  if (!unhook) unhook = onTrack(onEvent)
}
installNpcQuests()

// ---------------------------------------------------------------------------
// Talking, accepting, abandoning, turning in

/** Record a conversation with a giver (counts for `npc_talk` steps and dailies). */
export function talkTo(giver: string) {
  if (!qs(game.value).met.includes(giver)) {
    mutate((d) => {
      d.npcQuests = qs(d)
      d.npcQuests.met.push(giver)
    })
  }
  talking = giver
  try {
    track('npc_talk')
  } finally {
    talking = null
  }
}

export function acceptQuest(id: string): boolean {
  const def = NPC_QUEST_BY_ID[id]
  if (!def || questStatus(def) !== 'available') return false
  const ctx = currentCtx()
  mutate((d) => {
    d.npcQuests = qs(d)
    const prog: NpcQuestProgress = { p: def.steps.map(() => 0), at: Date.now() }
    settle(def, prog, ctx)
    d.npcQuests.active[id] = prog
    d.npcQuests.tracked = id
  })
  return true
}

export function abandonQuest(id: string): boolean {
  if (!qs(game.value).active[id]) return false
  mutate((d) => {
    d.npcQuests = qs(d)
    delete d.npcQuests.active[id]
    if (d.npcQuests.tracked === id) d.npcQuests.tracked = newestActive(d)
  })
  return true
}

export function setTracked(id: string | null) {
  mutate((d) => {
    d.npcQuests = qs(d)
    d.npcQuests.tracked = id && d.npcQuests.active[id] ? id : null
  })
}

function newestActive(d: GameState): string | null {
  let best: string | null = null
  let at = -1
  for (const [id, p] of Object.entries(qs(d).active)) if (p.at > at && NPC_QUEST_BY_ID[id]) (best = id), (at = p.at)
  return best
}

type Granter = (id: string, n: number) => void
let collectibleGranter: Granter | null = null

/** Plug in the collectibles module; rewards that were waiting are handed over now. */
export function setCollectibleGranter(fn: Granter | null) {
  collectibleGranter = fn
  const pending = qs(game.value).pending
  if (!fn || !Object.keys(pending).length) return
  mutate((d) => {
    d.npcQuests = qs(d)
    d.npcQuests.pending = {}
  })
  for (const [id, n] of Object.entries(pending)) fn(id, n)
}

/** Coins paid when an outfit/pet reward is already owned. */
export function dupeValue(kind: 'outfit' | 'pet', id: string): number {
  const price = kind === 'outfit' ? (OUTFIT_BY_ID[id]?.price ?? 0) : (PET_BY_ID[id]?.price ?? 0)
  return Math.max(20, Math.round(price * 0.5))
}

function grant(r: NpcQuestReward): GrantedReward {
  const s = game.value
  const out: GrantedReward = { coins: 0, merit: 0, items: {}, outfits: [], pets: [], collectibles: {}, dupeCoins: 0 }
  for (const o of r.outfits ?? []) {
    if (!OUTFIT_BY_ID[o]) continue
    if (s.outfits.includes(o)) out.dupeCoins += dupeValue('outfit', o)
    else out.outfits.push(o)
  }
  for (const p of r.pets ?? []) {
    if (!PET_BY_ID[p]) continue
    if (s.pets.includes(p)) out.dupeCoins += dupeValue('pet', p)
    else out.pets.push(p)
  }
  for (const [id, n] of Object.entries(r.items ?? {})) if (ITEM_BY_ID[id] && n > 0) out.items[id] = n
  for (const [id, n] of Object.entries(r.collectibles ?? {})) if (n > 0) out.collectibles[id] = n
  mutate((d) => {
    for (const [id, n] of Object.entries(out.items)) {
      if (id === 'lottery_ticket') d.daily.lotteryExtra += n
      else d.inventory[id] = (d.inventory[id] ?? 0) + n
    }
    for (const o of out.outfits) d.outfits.push(o)
    for (const p of out.pets) {
      d.pets.push(p)
      if (!d.pet) d.pet = p
    }
    if (!collectibleGranter) {
      d.npcQuests = qs(d)
      for (const [id, n] of Object.entries(out.collectibles)) d.npcQuests.pending[id] = (d.npcQuests.pending[id] ?? 0) + n
    }
  })
  if (collectibleGranter) for (const [id, n] of Object.entries(out.collectibles)) collectibleGranter(id, n)
  out.coins = addCoins(r.coins + out.dupeCoins, { boost: true })
  out.merit = r.merit ? addMerit(r.merit) : 0
  return out
}

/** Turn in a finished quest at its giver. Returns what was granted. */
export function turnInQuest(id: string, o: { silent?: boolean } = {}): GrantedReward | null {
  const def = NPC_QUEST_BY_ID[id]
  if (!def || questStatus(def) !== 'ready') return null
  mutate((d) => {
    d.npcQuests = qs(d)
    const q = d.npcQuests
    delete q.active[id]
    q.done[id] = (q.done[id] ?? 0) + 1
    q.last[id] = dayKey()
    if (q.tracked === id) q.tracked = newestActive(d)
  })
  const got = grant(def.reward)
  track('npc_quest')
  if (!o.silent) toast(`ส่งเควสต์ “${def.title}” +${got.coins} คอยน์`, 'coin')
  return got
}

// ---------------------------------------------------------------------------
// Helpers for the UI

export interface TrackedInfo {
  def: NpcQuestDef
  prog: NpcQuestProgress
  index: number
  step: NpcQuestStep | null
  ready: boolean
}

export function trackedInfo(s: GameState = game.value): TrackedInfo | null {
  const q = qs(s)
  const id = q.tracked && q.active[q.tracked] ? q.tracked : newestActive(s)
  if (!id) return null
  const def = NPC_QUEST_BY_ID[id]
  const prog = q.active[id]
  if (!def || !prog) return null
  const index = stepIndex(def, prog)
  return { def, prog, index, step: def.steps[index] ?? null, ready: index >= def.steps.length }
}

/** Where "นำทาง" should lead for a quest: the giver when ready, else the current step. */
export function questNavTarget(def: NpcQuestDef, prog: NpcQuestProgress | null): { map: string | null; hotspot: string | null; step: NpcQuestStep | null } {
  if (!prog) return { map: def.map, hotspot: def.giver, step: null }
  const i = stepIndex(def, prog)
  const step = def.steps[i]
  if (!step) return { map: def.map, hotspot: def.giver, step: null }
  if (step.npc) return { map: step.map ?? giverMap(step.npc) ?? def.map, hotspot: step.npc, step }
  return { map: step.map ?? null, hotspot: step.nav ?? null, step }
}

/** Map a giver stands on (from any of its quests). */
export function giverMap(giver: string): string | null {
  return questsByGiver(giver)[0]?.map ?? null
}

/** Total coins a quest pays (for previews). */
export function rewardCoins(def: NpcQuestDef): number {
  return def.reward.coins
}

/** Quest counts for the log header. */
export function questStats(s: GameState = game.value) {
  const q = qs(s)
  const done = Object.keys(q.done).filter((id) => NPC_QUEST_BY_ID[id]).length
  const total = NPC_QUESTS.length
  return { done, total, active: Object.keys(q.active).length, turnedIn: Object.values(q.done).reduce((a, b) => a + b, 0) }
}
