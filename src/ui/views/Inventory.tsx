// กระเป๋า – the full inventory: everything the player owns in one grid with
// search, sort and category filters, rarity borders and count badges, and a
// detail side-sheet with Use / Wear / Walk / Place / Sell-in-market actions.

import { effect } from '@preact/signals'
import { useMemo, useState } from 'preact/hooks'
import { game, level, mutate } from '../../game/state'
import { ITEM_BY_ID } from '../../game/data/items'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { PET_BY_ID, perkText } from '../../game/data/pets'
import { INV_KINDS, INV_KIND_INFO, INV_SORTS, collectInventory, countByKind, filterInventory, inventoryHooks, sortInventory, stampOwned, type InvEntry, type InvKind, type InvSort } from '../../game/inventory'
import { RARITY } from '../../game/shop'
import { equip, setPet } from '../../game/actions'
import { baseValue, listItem, MAX_LISTINGS, owned as marketOwned, type TradeKind } from '../../game/market'
import { cookingUnlocked, COOKING_LEVEL } from '../../game/cooking'
import { materialSprite, furnitureThumb } from '../../art/furniture'
import { petIcon } from '../../art/pets'
import { lookKey } from '../../art/avatar'
import type { MaterialId } from '../../game/materials'
import { spriteDataUrl } from '../../engine/sprite'
import { toast } from '../../game/events'
import { sfx } from '../../engine/audio'
import { goHome, openActivity, openPanel, openShop, mode, type ActivityId } from '../store'
import { Window } from '../components/kit'
import { Coin, Icon } from '../components/common'
import { PT } from '../pixeltext'
import { thumbFor } from '../DressUp'
import { tryOn, RAR_LABEL } from '../shop/ShopCards'
import { wear } from '../shop/flow'
import { PixelAnim, drawDollAndPet, drawPet, drawRays } from '../shop/PixelAnim'
import './inventory.css'

// ---------------------------------------------------------------------------
// Keep "first owned" times up to date for the newest-first sort. Runs for the
// whole session (this module is loaded with the panel router).

let stampTimer: ReturnType<typeof setTimeout> | undefined
effect(() => {
  const s = game.value
  if (!s.onboarded) return
  if (stampTimer) clearTimeout(stampTimer)
  stampTimer = setTimeout(() => {
    const next = stampOwned(game.value, Date.now())
    if (next)
      mutate((d) => {
        d.shop.got = next
      })
  }, 250)
})

const NEW_MS = 24 * 3600_000

// ---------------------------------------------------------------------------

function useThumb(e: InvEntry): string {
  const look = game.value.player.look
  return useMemo(() => {
    switch (e.kind) {
      case 'material':
        return spriteDataUrl(materialSprite(e.id as MaterialId), 3)
      case 'furniture':
        return spriteDataUrl(furnitureThumb(e.id), 2)
      case 'pet':
        return spriteDataUrl(petIcon(e.id), 3)
      case 'outfit': {
        const o = OUTFIT_BY_ID[e.id]
        return o ? thumbFor(tryOn(look, o), o.slot) : ''
      }
      case 'collectible':
        return inventoryHooks.collectibles.icon?.(e.id) ?? ''
      default:
        return ''
    }
  }, [e.kind, e.id, e.kind === 'outfit' ? lookKey(look) : ''])
}

function Thumb({ e, size }: { e: InvEntry; size: number }) {
  const url = useThumb(e)
  if (e.kind === 'item' || e.kind === 'ingredient' || e.kind === 'dish') return <Icon name={ITEM_BY_ID[e.id]?.icon ?? 'gift'} size={Math.round(size * 0.78)} />
  if (!url) return <Icon name={INV_KIND_INFO[e.kind].icon === 'star' ? 'star' : 'gift'} size={Math.round(size * 0.7)} />
  return <img class="px inv-thumb" src={url} alt="" width={size} height={size} draggable={false} />
}

function rar(e: InvEntry): Record<string, string> {
  return { '--rar': RARITY[e.rarity].color }
}

// ---------------------------------------------------------------------------

export function InventoryWindow({ onClose }: { onClose: () => void }) {
  const s = game.value
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<InvSort>('newest')
  const [kinds, setKinds] = useState<Set<InvKind>>(new Set())
  const [sel, setSel] = useState<string | null>(null)
  const all = useMemo(() => collectInventory(s), [s])
  const counts = countByKind(all)
  const list = sortInventory(filterInventory(all, kinds, q), sort)
  const picked = sel ? all.find((e) => e.key === sel) ?? null : null
  const toggle = (k: InvKind | 'all') => {
    sfx.tap()
    if (k === 'all') return setKinds(new Set())
    const n = new Set(kinds)
    if (n.has(k)) n.delete(k)
    else n.add(k)
    setKinds(n)
  }
  const now = Date.now()
  const pad = Math.max(0, 20 - list.length)
  return (
    <Window title="กระเป๋า" icon="bag" tone="gold" onClose={onClose} full class="inv-win">
      <div class="inv-top">
        <label class="inv-search">
          <span class="inv-mag" aria-hidden="true" />
          <input type="search" value={q} placeholder="ค้นหาของในกระเป๋า..." onInput={(ev) => setQ((ev.target as HTMLInputElement).value)} aria-label="ค้นหา" />
          {q && (
            <button class="inv-clear" onClick={() => (sfx.tap(), setQ(''))} aria-label="ล้างคำค้นหา">
              ×
            </button>
          )}
        </label>
        <label class="inv-sort">
          <span class="small">เรียง</span>
          <select value={sort} onChange={(ev) => (sfx.tap(), setSort((ev.target as HTMLSelectElement).value as InvSort))} aria-label="เรียงลำดับ">
            {INV_SORTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div class="inv-filters" role="group" aria-label="กรองตามประเภท">
        <button class={`inv-chip ${kinds.size === 0 ? 'on' : ''}`} aria-pressed={kinds.size === 0} onClick={() => toggle('all')}>
          ทั้งหมด <b class="num">{all.length}</b>
        </button>
        {INV_KINDS.map((k) => (
          <button key={k} class={`inv-chip ${kinds.has(k) ? 'on' : ''} ${counts[k] ? '' : 'empty'}`} aria-pressed={kinds.has(k)} onClick={() => toggle(k)}>
            <span class="inv-check" aria-hidden="true">
              {kinds.has(k) ? '✓' : ''}
            </span>
            <Icon name={INV_KIND_INFO[k].icon} size={16} />
            {INV_KIND_INFO[k].label}
            <b class="num">{counts[k]}</b>
          </button>
        ))}
      </div>
      <div class="inv-grid">
        {list.map((e) => (
          <button key={e.key} class={`inv-slot rar-${e.rarity} ${sel === e.key ? 'on' : ''} ${e.active ? 'active' : ''}`} style={rar(e)} onClick={() => (sfx.tap(), setSel(e.key))} title={e.name} aria-label={`${e.name}${e.count > 1 ? ` ${e.count} ชิ้น` : ''}`}>
            <Thumb e={e} size={44} />
            {e.count > 1 && <span class="inv-count num">{e.count > 999 ? '999+' : e.count}</span>}
            {e.active && <span class="inv-active">✓</span>}
            {e.got > 1 && now - e.got < NEW_MS && <span class="inv-new">ใหม่</span>}
          </button>
        ))}
        {Array.from({ length: pad }, (_, i) => (
          <span key={`pad${i}`} class="inv-slot empty" aria-hidden="true" />
        ))}
      </div>
      {!list.length && (
        <p class="small muted center">
          {q ? `ไม่เจอ "${q}" ในกระเป๋า` : 'ยังไม่มีของในหมวดนี้'} ·{' '}
          <button class="inv-link" onClick={() => (onClose(), openShop('featured'))}>
            ไปร้านค้า
          </button>
        </p>
      )}
      {picked && <DetailSheet e={picked} onClose={() => (sfx.close(), setSel(null))} onLeave={onClose} />}
    </Window>
  )
}

// ---------------------------------------------------------------------------
// Detail side-sheet

interface Act {
  label: string
  icon: string
  tone: 'green' | 'gold' | 'pink' | 'blue' | 'paper' | 'wood'
  run: () => void
  disabled?: boolean
  note?: string
}

const OFFERING_DEITY = new Set(['incense', 'garland', 'rose', 'fruit', 'laddu', 'milk', 'redsoda', 'boiled_egg', 'elephant', 'tea'])

function activityFor(id: string): { act: ActivityId; params?: Record<string, string | boolean> } | null {
  const it = ITEM_BY_ID[id]
  if (!it) return null
  if (it.category === 'alms' || it.category === 'dish') return { act: 'alms' }
  if (id === 'gold_leaf') return { act: 'gold_leaf' }
  if (OFFERING_DEITY.has(id)) return { act: 'deity' }
  if (id === 'fish_food') return { act: 'koi' }
  if (id === 'catfish_food') return { act: 'koi', params: { river: true } }
  if (id === 'dog_food' || id === 'chicken') return { act: 'dog' }
  if (id === 'krathong') return { act: 'krathong' }
  if (id === 'lottery_ticket') return { act: 'lottery' }
  if (it.category === 'ingredient') return { act: 'cook' }
  return null
}

function actionsFor(e: InvEntry, leave: () => void): Act[] {
  const s = game.value
  const out: Act[] = []
  const go = (fn: () => void) => () => {
    sfx.open()
    leave()
    fn()
  }
  switch (e.kind) {
    case 'item':
    case 'dish':
    case 'ingredient': {
      const a = activityFor(e.id)
      if (a) {
        const locked = a.act === 'cook' && !cookingUnlocked(s)
        const label = a.act === 'alms' ? 'ใช้ตักบาตร' : a.act === 'cook' ? 'ไปทำอาหาร' : a.act === 'deity' ? 'ใช้ไหว้พระ' : a.act === 'gold_leaf' ? 'ไปปิดทอง' : a.act === 'koi' || a.act === 'dog' ? 'ให้อาหารสัตว์' : a.act === 'krathong' ? 'ไปลอยกระทง' : 'ใช้เลย'
        out.push({ label, icon: 'play', tone: 'green', disabled: locked, note: locked ? `ปลดล็อกทำอาหารที่ Lv.${COOKING_LEVEL}` : undefined, run: go(() => openActivity(a.act, a.params)) })
      }
      const cat = ITEM_BY_ID[e.id]?.category
      if (cat === 'alms' || cat === 'offering' || cat === 'animal' || cat === 'special') out.push({ label: 'ซื้อเพิ่ม', icon: 'shop', tone: 'gold', run: go(() => openShop(cat)) })
      break
    }
    case 'material':
      out.push({ label: 'ไปโต๊ะช่างไม้', icon: 'hammer', tone: 'wood', run: () => (sfx.open(), openPanel('craft')) })
      break
    case 'outfit': {
      const o = OUTFIT_BY_ID[e.id]
      if (!o) break
      if (e.active) {
        const canOff = ['head', 'neck', 'hand', 'shoes', 'back', 'suit'].includes(o.slot)
        if (canOff) out.push({ label: 'ถอดออก', icon: 'close', tone: 'paper', run: () => (sfx.tap(), equip(o.slot, null)) })
        else out.push({ label: 'ใส่อยู่แล้ว', icon: 'check', tone: 'paper', disabled: true, run: () => undefined })
      } else out.push({ label: o.slot === 'suit' ? 'สวมชุดมาสคอต' : 'ใส่เลย', icon: 'shirt', tone: 'pink', run: () => (sfx.sparkle(), wear(e.id), toast(`ใส่${o.name}แล้ว`, 'shirt')) })
      out.push({ label: 'ห้องแต่งตัว', icon: 'user', tone: 'paper', run: go(() => openPanel('dress')) })
      break
    }
    case 'pet':
      out.push(
        e.active
          ? { label: 'ให้พักก่อน', icon: 'bed', tone: 'paper', run: () => (sfx.tap(), setPet(null)) }
          : { label: 'พาไปด้วย', icon: 'paw', tone: 'green', run: () => (sfx.sparkle(), setPet(e.id), toast(`${PET_BY_ID[e.id]?.name ?? ''}เดินตามแล้ว`, 'paw')) },
      )
      break
    case 'furniture':
      out.push({
        label: 'จัดวางในบ้าน',
        icon: 'home',
        tone: 'green',
        run: go(() => {
          if (mode.value !== 'house') goHome()
          toast('กดปุ่ม "แต่งบ้าน" แล้วเลือกจากกล่องเก็บของเพื่อวาง', 'home', 'info')
        }),
      })
      break
    case 'collectible': {
      const open = inventoryHooks.collectibles.open
      if (open) out.push({ label: 'ดูในสมุดสะสม', icon: 'book', tone: 'blue', run: go(() => open(e.id)) })
      break
    }
  }
  return out
}

function tradeKindOf(e: InvEntry): TradeKind | null {
  if (e.kind === 'material') return 'mat'
  if (e.kind === 'item' || e.kind === 'ingredient' || e.kind === 'dish') return 'item'
  if (e.kind === 'furniture') return 'furniture'
  return null
}

function SellForm({ e }: { e: InvEntry }) {
  const tk = tradeKindOf(e)
  const have = tk ? marketOwned(tk, e.id) : 0
  const [qty, setQty] = useState(1)
  const unit = tk ? baseValue(tk, e.id) : 0
  const [price, setPrice] = useState<number | null>(null)
  if (!tk || have < 1) return null
  const n = Math.min(qty, have)
  const p = price ?? Math.max(1, Math.round(unit * n))
  const full = game.value.market.mine.length >= MAX_LISTINGS
  return (
    <div class="inv-sell">
      <div class="inv-sell-head">
        <Icon name="market" size={18} /> <b>ขายในตลาดนัด</b>
        <span class="grow" />
        <span class="small muted">ราคากลาง ~{unit}/ชิ้น</span>
      </div>
      <div class="inv-sell-row">
        <span class="small">จำนวน</span>
        <button class="inv-step" onClick={() => (sfx.tap(), setQty(Math.max(1, n - 1)), setPrice(null))} aria-label="ลดจำนวน">
          −
        </button>
        <b class="num">{n}</b>
        <button class="inv-step" onClick={() => (sfx.tap(), setQty(Math.min(have, n + 1)), setPrice(null))} aria-label="เพิ่มจำนวน">
          +
        </button>
        <span class="grow" />
        <span class="small">ราคา</span>
        <input class="inv-price num" type="number" min={1} value={p} onInput={(ev) => setPrice(Math.max(1, Math.round(Number((ev.target as HTMLInputElement).value) || 1)))} aria-label="ราคารวม" />
      </div>
      <button
        class="btn gold block small"
        disabled={full}
        onClick={() => {
          if (listItem(tk, e.id, n, p)) {
            sfx.purchase()
            toast(`วางขาย${e.name} x${n} ที่ตลาดแล้ว`, 'market')
            setQty(1)
            setPrice(null)
          }
        }}
      >
        <Icon name="market" size={16} /> {full ? `แผงเต็มแล้ว (${MAX_LISTINGS})` : 'วางขายที่แผงของฉัน'}
      </button>
    </div>
  )
}

function DetailSheet({ e, onClose, onLeave }: { e: InvEntry; onClose: () => void; onLeave: () => void }) {
  const s = game.value
  const acts = actionsFor(e, onLeave)
  const it = ITEM_BY_ID[e.id]
  const pet = e.kind === 'pet' ? PET_BY_ID[e.id] : null
  const o = e.kind === 'outfit' ? OUTFIT_BY_ID[e.id] : null
  const tall = e.kind === 'outfit' || e.kind === 'pet'
  return (
    <div class="inv-sheet-wrap" onClick={(ev) => ev.target === ev.currentTarget && onClose()}>
      <aside class={`inv-sheet rar-${e.rarity}`} style={rar(e)} role="dialog" aria-label={e.name}>
        <button class="btn red icon-btn small inv-sheet-x" onClick={onClose} aria-label="ปิด">
          <Icon name="close" size={14} />
        </button>
        <div class="inv-hero">
          {tall ? (
            <PixelAnim
              w={64}
              h={58}
              scale={2}
              draw={(ctx, t) => {
                drawRays(ctx, t, 32, 30, 50, 'rgba(255, 255, 255, 0.35)', 10)
                if (o) drawDollAndPet(ctx, t, tryOn(s.player.look, o), null, 32, 56)
                else if (pet) drawPet(ctx, t, pet.id, 32, 54)
              }}
            />
          ) : (
            <span class="inv-hero-icon">
              <Thumb e={e} size={72} />
            </span>
          )}
        </div>
        <div class="inv-tags">
          <span class="inv-rar">{RAR_LABEL[e.rarity]}</span>
          <span class="inv-kind">
            <Icon name={INV_KIND_INFO[e.kind].icon} size={14} /> {INV_KIND_INFO[e.kind].label}
          </span>
        </div>
        <PT text={e.name} size={12} weight={600} color="#3b2616" />
        {e.sub && <div class="small muted">{e.sub}</div>}
        <p class="small inv-desc">{e.desc}</p>
        <div class="inv-facts small">
          {e.count > 1 && (
            <span>
              มี <b class="num">{e.count}</b> ชิ้น
            </span>
          )}
          {it && it.merit > 0 && <span>+{it.merit} บุญ/ชิ้น</span>}
          {pet && <span class="inv-perk">{perkText(pet.perk)}</span>}
          {o && o.price > 0 && !o.exclusive && (
            <span>
              ราคาร้าน <Coin n={o.price} size={12} />
            </span>
          )}
          {o?.exclusive && <span class="inv-excl">ของพิเศษ · ขายไม่ได้</span>}
          {e.active && <span class="inv-on">ใช้อยู่ตอนนี้</span>}
          {e.got > 1 && <span class="muted">ได้มาเมื่อ {new Date(e.got).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>}
          {o && (o.level ?? 1) > level.value.level && <span>Lv.{o.level}</span>}
        </div>
        <div class="inv-acts">
          {acts.map((a) => (
            <button key={a.label} class={`btn ${a.tone} small`} disabled={a.disabled} onClick={a.run}>
              <Icon name={a.icon} size={16} /> {a.label}
            </button>
          ))}
        </div>
        {acts.find((a) => a.note) && <div class="small muted">{acts.find((a) => a.note)!.note}</div>}
        <SellForm key={e.key} e={e} />
      </aside>
    </div>
  )
}
