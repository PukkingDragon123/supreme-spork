// UI glue for NPC quests: the dialog signal, reply choices for shop givers,
// giver names/portraits and "นำทาง" navigation (walk, change room or travel).

import { signal } from '@preact/signals'
import { game } from '../../game/state'
import { activeQuests, actionableQuests, focusQuest, progressOf, questById, questNavTarget, stepIndex } from '../../game/npcQuests'
import type { NpcQuestStep } from '../../game/data/npcQuestTypes'
import type { GameEvent } from '../../game/data/quests'
import { questNpc, SHOP_KEEPER_LOOKS } from '../../game/data/questNpcs'
import { shopFor } from '../../game/data/placeShops'
import { HOME_PLACES, PLACE_BY_ID } from '../../game/data/places'
import type { AreaId } from '../../game/data/areas'
import { isAreaUnlocked, setArea } from '../../game/actions'
import { totalStars } from '../../game/prayer'
import { toast } from '../../game/events'
import { hasMap, mapFor } from '../../scenes/maps'
import { mergeQuestNpcs, npcLook } from '../../scenes/questLayer'
import { DEFAULT_LOOK, type AvatarLook } from '../../art/avatar'
import { activity, arrived, goHome, goTemple, mapId, mapOpen, mode, panel, tab } from '../store'
import { travelTo, worldScene } from '../TempleView'

// ---------------------------------------------------------------------------
// Dialog

export interface QuestDialogReq {
  giver: string
  /** Quest to open straight away (else the giver picks). */
  quest?: string
  n: number
}

export const questDialog = signal<QuestDialogReq | null>(null)
let seq = 0

/** Givers that are not standing on a map (e.g. Bot Noi `bot:botnoi`) and open their own UI. */
const floatingGivers = new Map<string, () => void>()

export function registerFloatingGiver(giver: string, open: () => void) {
  floatingGivers.set(giver, open)
}

/** Open the conversation sheet with a quest giver (`npc:<id>` / `shop:<id>`). */
export function openQuestDialog(giver: string, quest?: string) {
  arrived.value = null
  const floating = floatingGivers.get(giver)
  if (floating) return floating()
  questDialog.value = { giver, quest, n: ++seq }
}

export function closeQuestDialog() {
  questDialog.value = null
}

/** Screen the quest log opens on (set before switching to the quests tab). */
export const questTab = signal<'daily' | 'npc' | 'badges'>('daily')

export interface GiverInfo {
  name: string
  role: string
  kind: 'person' | 'monk' | 'novice'
  look: AvatarLook
  skin: number
  lines: string[]
}

export function giverInfo(giver: string): GiverInfo {
  if (giver.startsWith('npc:')) {
    const n = questNpc(giver)
    if (n) return { name: n.name, role: n.role, kind: n.sprite ?? 'person', look: npcLook(n), skin: n.look?.skin ?? 2, lines: n.lines }
  }
  const id = giver.slice(giver.indexOf(':') + 1)
  const shop = shopFor(id)
  const look = { ...DEFAULT_LOOK, gender: 'f' as const, hair: 'hair_bun', top: 'top_vendor', bottom: 'bot_sarong', ...(SHOP_KEEPER_LOOKS[id] ?? {}) }
  return { name: shop.npc, role: shop.name, kind: 'person', look, skin: look.skin, lines: [shop.greeting] }
}

// ---------------------------------------------------------------------------
// Reply choices for shop keepers (the stall scene shows them as extra buttons)

export interface QuestChoice {
  /** Short button label, e.g. 'รับเควสต์'. */
  label: string
  /** Quest title (or a hint) for a second line / tooltip. */
  detail: string
  icon: string
  kind: 'turnin' | 'quest' | 'progress' | 'deliver' | 'locked'
  onPick: () => void
}

/**
 * The quest reply a shop keeper offers right now, as at most one choice
 * (empty when none): turn in > deliver > new quest > in progress > locked.
 * Picking it opens the conversation sheet (with a menu when several apply).
 */
export function questChoicesFor(shopId: string): QuestChoice[] {
  const giver = `shop:${shopId}`
  const open = (quest?: string) => () => openQuestDialog(giver, quest)
  const list = actionableQuests(giver)
  const deliveries = activeQuests().filter((a) => {
    const st = a.def.steps[stepIndex(a.def, a.prog)]
    return st?.event === 'npc_talk' && st.npc === giver
  })
  const several = list.length + deliveries.length > 1
  const ready = list.find((x) => x.status === 'ready')
  if (ready) return [{ label: 'ส่งเควสต์', detail: ready.def.title, icon: 'gift', kind: 'turnin', onPick: open(several ? undefined : ready.def.id) }]
  if (deliveries.length) return [{ label: 'ส่งของ/ส่งข่าว', detail: deliveries[0].def.title, icon: 'gift', kind: 'deliver', onPick: open() }]
  const avail = list.find((x) => x.status === 'available')
  if (avail) return [{ label: 'รับเควสต์', detail: avail.def.title, icon: 'scroll', kind: 'quest', onPick: open(several ? undefined : avail.def.id) }]
  const active = list.find((x) => x.status === 'active')
  if (active) return [{ label: 'คุยเรื่องเควสต์', detail: active.def.title, icon: 'scroll', kind: 'progress', onPick: open(several ? undefined : active.def.id) }]
  const f = focusQuest(giver)
  if (f?.status === 'level') return [{ label: `เควสต์ Lv ${f.def.level ?? 1}`, detail: f.def.title, icon: 'lock', kind: 'locked', onPick: open() }]
  return []
}

// ---------------------------------------------------------------------------
// Navigation

const DEITIES = ['guardian', 'ganesha', 'brahma', 'guanyin', 'lakshmi', 'naga']
const EVENT_SPOTS: Partial<Record<GameEvent, (id: string) => boolean>> = {
  alms: (id) => id === 'alms' || id === 'boat_alms',
  alms_item: (id) => id === 'alms' || id === 'boat_alms',
  dish_alms: (id) => id === 'alms' || id === 'boat_alms',
  koi_fed: (id) => id === 'pond' || id === 'job:feed_fish',
  catfish_fed: (id) => id === 'river_fish' || id === 'job:feed_catfish',
  bell: (id) => id === 'bells' || id === 'big_bell',
  bell_round: (id) => id === 'bells' || id === 'big_bell',
  wish: (id) => id === 'incense',
  siamsi: (id) => id === 'hall' || id === 'hall_mountain',
  gold_leaf: (id) => id === 'hall' || id === 'hall_mountain',
  gold_back: (id) => id === 'hall' || id === 'hall_mountain',
  chant: (id) => id.startsWith('pray') || id === 'hall' || id === 'hall_mountain',
  prayer_pass: (id) => id.startsWith('pray') || id === 'hall' || id === 'hall_mountain',
  meditate_sec: (id) => id === 'view' || id === 'hall' || id === 'hall_mountain',
  deity: (id) => DEITIES.includes(id),
  holy_water: (id) => id === 'holy_water',
  lottery: (id) => id === 'tree',
  donate: (id) => id === 'donation',
  krathong: (id) => id === 'krathong',
  circle_chedi: (id) => id === 'chedi',
  job: (id) => id.startsWith('job:'),
  stall_buy: (id) => id.startsWith('shop:'),
  fair_game: (id) => id.includes('fair'),
}

function hotspotsOf(map: string): string[] {
  if (!hasMap(map)) return []
  return mergeQuestNpcs(mapFor(map)).hotspots.map((h) => h.id)
}

/** Best hotspot on a map for a step (its `nav`, its NPC, or a spot matching the event). */
export function spotFor(map: string, step: NpcQuestStep | null, preferred: string | null): string | null {
  const ids = hotspotsOf(map)
  if (preferred && ids.includes(preferred)) return preferred
  if (step?.npc && ids.includes(step.npc)) return step.npc
  const f = step ? EVENT_SPOTS[step.event] : undefined
  return (f && ids.find(f)) || null
}

const MAP_ROOT: Record<string, string> = { mart: 'wat' }
const rootOf = (map: string) => MAP_ROOT[map] ?? map.split(':')[0]

/** Waiting to walk somewhere once a map has loaded. */
let pendingNav: { map: string; hotspot: string | null } | null = null

function closeUi() {
  questDialog.value = null
  panel.value = null
  activity.value = null
  arrived.value = null
  tab.value = 'temple'
}

function walkTo(hotspot: string | null) {
  if (!hotspot) return
  // Shops: stop in front so both the shop and its quest replies show.
  if (hotspot.startsWith('shop:')) worldScene()?.goTo(hotspot)
  else travelTo(hotspot)
}

function placeOpen(root: string): boolean {
  const home = HOME_PLACES[root as AreaId]
  if (home) return isAreaUnlocked(root as AreaId)
  const p = PLACE_BY_ID[root]
  return !!p && (totalStars() >= p.stars || game.value.places.bought.includes(p.id))
}

/** Go to a hotspot on any map: walk if here, change room, or travel there. */
export function goToSpot(map: string, hotspot: string | null) {
  closeUi()
  const floating = hotspot ? floatingGivers.get(hotspot) : undefined
  if (floating) return floating()
  if (mode.value === 'world' && mapId.value === map) return walkTo(hotspot)
  if (mode.value === 'world' && rootOf(mapId.value) === rootOf(map) && hasMap(map)) {
    pendingNav = { map, hotspot }
    mapId.value = map
    return
  }
  const root = rootOf(map)
  const home = HOME_PLACES[root as AreaId]
  const place = home ?? PLACE_BY_ID[root]
  if (!place) return
  if (!placeOpen(root)) {
    toast(`ยังไปไม่ได้ ปลดล็อก${place.name}ในแผนที่ก่อนนะ`, 'lock', 'warn')
    mapOpen.value = true
    return
  }
  pendingNav = { map, hotspot }
  toast(`ออกเดินทางไป${place.name}`, 'map', 'info')
  if (home) {
    setArea(root as AreaId)
    goTemple(root as AreaId, null)
  } else goTemple(place.scene, place.id)
}

/** Called whenever the world map changes: finish a pending navigation. */
export function resumeNav() {
  const p = pendingNav
  if (!p || mode.value !== 'world') return
  if (mapId.value !== p.map) {
    if (rootOf(mapId.value) === rootOf(p.map) && hasMap(p.map)) mapId.value = p.map
    else pendingNav = null
    return
  }
  pendingNav = null
  setTimeout(() => walkTo(p.hotspot), 450)
}

/** "นำทาง" for a quest: to the current step's spot, or back to the giver. */
export function navigateQuest(id: string) {
  const def = questById(id)
  if (!def) return
  const t = questNavTarget(def, progressOf(id))
  const step = t.step
  const wantHome = t.hotspot === 'home' || step?.nav === 'home' || (step?.event === 'cook' && !step.map)
  if (wantHome) {
    closeUi()
    toast('กลับบ้านไปทำอาหารที่ครัวกันเลย!', 'home', 'info')
    goHome()
    return
  }
  if (!step) return goToSpot(def.map, def.giver)
  if (step.event === 'trade' || step.nav === 'market') {
    closeUi()
    panel.value = 'market'
    return
  }
  if (t.map) return goToSpot(t.map, spotFor(t.map, step, t.hotspot))
  // Doable anywhere: prefer a spot right here, else the giver's map.
  const here = mode.value === 'world' ? spotFor(mapId.value, step, t.hotspot) : null
  if (here) return goToSpot(mapId.value, here)
  const there = spotFor(def.map, step, t.hotspot)
  if (there) return goToSpot(def.map, there)
  closeUi()
  toast(step.event === 'dog_pet' || step.event === 'dog_fed' ? 'แตะน้องหมาในวัดได้เลย' : `ภารกิจ: ${step.text}`, 'scroll', 'info')
}
