// Feeds the tutorial machine: tracked game events (onTrack) plus UI signals
// derived from the app's navigation signals and state (bag opened, prayer
// started, map opened, furniture mode, a daily reward claimed…). Also
// starts the tutorial for new saves and picks the walk-to spot.

import { computed, effect } from '@preact/signals'
import { game } from '../../game/state'
import { onTrack } from '../../game/actions'
import { dayKey } from '../../game/time'
import { currentStep, loanStillNeeded, type TutUi } from '../../game/botnoiTutorial'
import { lendFor, loanStep, onTutorialStep, reclaimLoan, startTutorial, tutorialInput } from '../../game/botnoi'
import { activity } from '../store'
import { houseEditing, mapId, mapOpen, mode, panel, prayStage, tab } from '../store'
import { worldScene } from '../TempleView'
import { botFocus, botSay, popupsAllowed } from './botStore'
import { STEP_UI } from './tutorialSteps'
import { botSfx } from './botSfx'
import { botFollower } from './botWorld'
import { toast } from '../../game/events'

/** The running step (null when the tutorial is not active). */
export const tutStep = computed(() => currentStep(game.value.botnoi))

/** Tutorial running right now (tips wait while it is). */
export const tutActive = computed(() => game.value.botnoi?.tut === 'active')

// Deferred so effects never write the state they are reading.
const ui = (id: TutUi) => queueMicrotask(() => tutorialInput({ kind: 'ui', id }))

/** The glowing walk-to spot for the "walk" step (world coordinates). */
export let walkSpot: { x: number; y: number; map: string } | null = null

function pickWalkSpot(): { x: number; y: number; map: string } | null {
  const sc = worldScene()
  if (!sc) return null
  const p = sc.player
  const tries: [number, number][] = [
    [0, 36],
    [26, 30],
    [-26, 30],
    [34, 0],
    [-34, 0],
    [0, -34],
    [30, -26],
    [-30, -26],
    [0, 52],
  ]
  for (const [dx, dy] of tries) {
    const x = Math.round(p.x + dx)
    const y = Math.round(p.y + dy)
    if (x < 8 || y < 8 || x > sc.map.w - 8 || y > sc.map.h - 8) continue
    if (!sc.grid.freeAt(x, y) || !sc.grid.find(p.x, p.y, x, y)) continue
    // stay clear of hotspots so tapping the ring just walks
    if (sc.map.hotspots.some((h) => x >= h.rect.x - 4 && x <= h.rect.x + h.rect.w + 4 && y >= h.rect.y - 4 && y <= h.rect.y + h.rect.h + 4)) continue
    return { x, y, map: mapId.value }
  }
  return { x: Math.round(p.x), y: Math.round(p.y + 20), map: mapId.value }
}

/** Current walk spot, re-picked when missing or on another map. */
export function ensureWalkSpot() {
  if (!walkSpot || walkSpot.map !== mapId.value) walkSpot = pickWalkSpot()
  return walkSpot
}

let installed = false

export function installTutorial() {
  if (installed) return
  installed = true

  onTrack((event) => {
    if (game.value.botnoi?.tut === 'active') tutorialInput({ kind: 'event', event })
  })

  // Transitions of the navigation signals → UI signals.
  let pPanel = panel.value
  effect(() => {
    const p = panel.value
    const was = pPanel
    pPanel = p
    if (p === was) return
    if (p === 'bag') ui('bag_open')
    if (was === 'bag') ui('bag_close')
    if (p === 'pray') ui('pray_open')
    // Closing the stage map without starting (a start sets prayStage in the same tick).
    if (was === 'pray' && !prayStage.value) setTimeout(() => !prayStage.value && panel.value !== 'pray' && ui('pray_close'), 0)
  })
  let pPray = prayStage.value
  effect(() => {
    const v = prayStage.value
    const was = pPray
    pPray = v
    if (v && !was) ui('pray_start')
    if (!v && was) ui('pray_quit')
  })
  let pTab = tab.value
  effect(() => {
    const t = tab.value
    if (t === pTab) return
    pTab = t
    if (t === 'quests') ui('quests_open')
    if (t === 'shop') ui('shop_open')
  })
  let pMap = mapOpen.value
  effect(() => {
    const m = mapOpen.value
    if (m === pMap) return
    pMap = m
    ui(m ? 'map_open' : 'map_close')
  })
  effect(() => {
    if (mode.value === 'house') ui('house')
  })
  let pEdit = houseEditing.value
  effect(() => {
    const e = houseEditing.value
    if (e === pEdit) return
    pEdit = e
    ui(e ? 'edit_on' : 'edit_off')
  })
  // Daily claims and the shop gift, from state changes.
  const claims = () => {
    const d = game.value.daily
    return d.quests.filter((q) => q.claimed).length + (d.bonusClaimed ? 1 : 0) + (d.loginClaimed ? 1 : 0) + (d.monthlyClaimed ? 1 : 0) + d.ads
  }
  let pClaims = claims()
  let pGift = game.value.shop.giftDay
  effect(() => {
    void game.value
    const c = claims()
    if (c > pClaims) ui('claimed')
    pClaims = c
    const g = game.value.shop.giftDay
    if (g !== pGift && g === dayKey()) ui('gift')
    pGift = g
  })

  // New saves: start on reaching the temple.
  effect(() => {
    const st = game.value.botnoi
    if (mode.value === 'world' && st?.tut === 'new' && game.value.onboarded && popupsAllowed()) queueMicrotask(() => game.value.botnoi?.tut === 'new' && startTutorial(false))
  })

  // Step changes: praise, sound, reset per-step helpers.
  onTutorialStep((from, to) => {
    botFocus.value = null
    if (to === 'walk') walkSpot = null
    // A new save's bag is empty: Bot Noi lends what this step needs (and takes it back after).
    lendFor(to)
    if (!from || !to) return
    const praise = STEP_UI[from]?.praise
    if (praise) {
      botSay(praise)
      if (!botFollower() || mode.value !== 'world') toast(`บอทน้อย: ${praise}`, 'sparkle', 'info')
    }
    botSfx.done()
  })

  // Take back a loan once its step is over and no mini-game is using it.
  setInterval(() => {
    const ls = loanStep()
    if (!ls || ls === 'kept' || activity.value) return
    if (game.value.botnoi.tut !== 'active' || !loanStillNeeded(ls, tutStep.value?.id ?? null)) reclaimLoan()
  }, 500)

  // Walk step: done once the player reaches the ring.
  setInterval(() => {
    const st = tutStep.value
    if (st?.id !== 'walk' || mode.value !== 'world') return
    const sp = ensureWalkSpot()
    const sc = worldScene()
    if (!sp || !sc) return
    if (Math.hypot(sc.player.x - sp.x, sc.player.y - sp.y) < 9) ui('walked')
  }, 150)
}
