// Little popups on top of the game: "ได้รับของใหม่!" whenever something new
// lands in the bag, and a short, cute level-up card (it replaces the big
// level-up window). One at a time, queued and merged, tap to dismiss.

import { useEffect, useState } from 'preact/hooks'
import { effect } from '@preact/signals'
import { game, type GameState } from '../../game/state'
import { notices, dismiss } from '../../game/events'
import { ITEM_BY_ID } from '../../game/data/items'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { FURNITURE_BY_ID } from '../../game/data/furniture'
import { PET_BY_ID } from '../../game/data/pets'
import { furnitureThumb } from '../../art/furniture'
import { petIcon } from '../../art/pets'
import { spriteDataUrl } from '../../engine/sprite'
import { sfx, haptic } from '../../engine/audio'
import { Icon } from '../components/common'
import { PT, TONE_TEXT } from '../pixeltext'
import { thumbFor } from '../DressUp'
import { mode } from '../store'
import { tutCelebrate } from '../botnoi/GiftReveal'
import { ShopPopup } from './ShopPopup'
import { diffGot, popPopup, popupQueue, pushPopup, shopPopupOpen, type GotEntry, type Popup } from './popupStore'
import './popups.css'

type Snap = { inventory: Record<string, number>; outfits: string[]; storage: Record<string, number>; pets: string[]; created: number; loan: unknown; finished: number }
const snap = (s: GameState): Snap => ({ inventory: { ...s.inventory }, outfits: [...s.outfits], storage: { ...(s.house?.storage ?? {}) }, pets: [...s.pets], created: s.createdAt, loan: s.botnoi?.loan ?? null, finished: s.botnoi?.finished ?? 0 })

let installed = false
let quietUntil = 0
function install() {
  if (installed) return
  installed = true
  let prev = snap(game.value)
  effect(() => {
    const s = game.value
    const next = snap(s)
    const before = prev
    prev = next
    const m = mode.value
    // A different save (sign-in, cloud load) or not in the game yet: no popups.
    if (before.created !== next.created || (m !== 'world' && m !== 'house')) return
    // Bot Noi's loans (taken back later) and the tutorial finale (it has its own big reveal) are not "new".
    if (before.finished !== next.finished) quietUntil = Date.now() + 1500
    if (JSON.stringify(before.loan) !== JSON.stringify(next.loan) || Date.now() < quietUntil) return
    const got = diffGot(before, next)
    // The tutorial's finale has its own big reveal; a whole-save swap is not "new items".
    if (!got.length || tutCelebrate.value || got.length > 14) return
    queueMicrotask(() => pushPopup({ kind: 'got', items: got }))
  })
  // Level-ups: short card instead of the big window.
  const handled = new Set<number>()
  effect(() => {
    for (const q of notices.value) {
      if (q.notice.kind !== 'levelup' || handled.has(q.id)) continue
      handled.add(q.id)
      const n = q.notice
      queueMicrotask(() => {
        dismiss(q.id)
        pushPopup({ kind: 'level', level: n.level, coins: n.coins })
      })
    }
  })
}

export function PopupHost() {
  install()
  const p = popupQueue.value[0]
  return (
    <>
      {shopPopupOpen.value && <ShopPopup />}
      {p && <PopupCard key={p.key} p={p} />}
    </>
  )
}

function gotThumb(e: GotEntry): preact.JSX.Element {
  if (e.kind === 'outfit') {
    const o = OUTFIT_BY_ID[e.id]
    if (o) return <img class="px" src={thumbFor({ ...game.value.player.look, [o.slot]: o.id }, o.slot)} alt="" width={36} height={36} />
  }
  if (e.kind === 'furniture' && FURNITURE_BY_ID[e.id]) return <img class="px" src={spriteDataUrl(furnitureThumb(e.id), 2)} alt="" width={36} height={36} />
  if (e.kind === 'pet' && PET_BY_ID[e.id]) return <img class="px" src={spriteDataUrl(petIcon(e.id), 2)} alt="" width={36} height={36} />
  return <Icon name={ITEM_BY_ID[e.id]?.icon ?? 'gift'} size={32} />
}

function gotName(e: GotEntry): string {
  if (e.kind === 'outfit') return OUTFIT_BY_ID[e.id]?.name ?? e.id
  if (e.kind === 'furniture') return FURNITURE_BY_ID[e.id]?.name ?? e.id
  if (e.kind === 'pet') return `น้อง${PET_BY_ID[e.id]?.name ?? e.id}`
  return ITEM_BY_ID[e.id]?.name ?? e.id
}

function PopupCard({ p }: { p: Popup }) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    if (p.kind === 'level') (sfx.levelUp(), haptic(30))
    else sfx.sparkle()
  }, [])
  useEffect(() => {
    // Auto-dismiss; merged items reset the timer.
    const t = setTimeout(() => setOut(true), p.kind === 'level' ? 2600 : 2300)
    return () => clearTimeout(t)
  }, [p.kind === 'got' ? p.items.length : 0])
  useEffect(() => {
    if (!out) return
    const t = setTimeout(popPopup, 220)
    return () => clearTimeout(t)
  }, [out])
  const close = () => setOut(true)
  if (p.kind === 'level')
    return (
      <button class={`pp-card level ${out ? 'out' : ''}`} onClick={close} aria-label={`เลเวลอัป ${p.level}`}>
        <span class="pp-burst">
          <Icon name="lotus" size={40} />
        </span>
        <span class="pp-body">
          <PT text={`เลเวลอัป! Lv.${p.level}`} size={14} weight={600} {...TONE_TEXT.gold} />
          <span class="pp-sub">
            บุญเต็มแก้วแล้ว! {p.coins > 0 && <b class="num">+{p.coins}</b>} {p.coins > 0 && <Icon name="coin" size={14} />}
          </span>
        </span>
      </button>
    )
  const shown = p.items.slice(0, 4)
  return (
    <button class={`pp-card got ${out ? 'out' : ''}`} onClick={close} aria-label="ได้รับของใหม่">
      <span class="pp-icons">
        {shown.map((e, i) => (
          <span class="pp-ico" key={`${e.kind}:${e.id}`} style={{ animationDelay: `${i * 80}ms` }}>
            {gotThumb(e)}
            {e.n > 1 && <b class="pp-n num">x{e.n}</b>}
          </span>
        ))}
      </span>
      <span class="pp-body">
        <PT text="ได้รับของใหม่!" size={13} weight={600} {...TONE_TEXT.gold} />
        <span class="pp-sub">
          {shown.map(gotName).join(' · ')}
          {p.items.length > shown.length ? ` +${p.items.length - shown.length}` : ''}
        </span>
      </span>
    </button>
  )
}
