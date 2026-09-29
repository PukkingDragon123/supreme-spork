// Storefront cards: rarity-framed items and pets, limited-time deals,
// bundles with a preview strip, the daily free gift and the special packs
// (starter elephant pack and the animated "หนีภัยน้ำท่วม" flood pack).

import type { ComponentChildren } from 'preact'
import { useMemo } from 'preact/hooks'
import { game, level } from '../../game/state'
import { OUTFIT_BY_ID, type OutfitItem, type Slot } from '../../game/data/outfits'
import { PET_BY_ID, perkText } from '../../game/data/pets'
import { ITEM_BY_ID } from '../../game/data/items'
import type { SpecialOffer } from '../../game/data/store'
import { lookKey, type AvatarLook } from '../../art/avatar'
import { petIcon } from '../../art/pets'
import { spriteDataUrl } from '../../engine/sprite'
import { applyItem, thumbFor } from '../DressUp'
import { BEST_SELLERS, RARITY, bundleMissing, bundlePrice, dealBought, entryOf, giftReady, nextGift, owns, fmtCountdown, msUntilReset, isNewOutfit, type Bundle, type Deal, type EntryKind, type Rarity } from '../../game/shop'
import { Coin, Icon } from '../components/common'
import { PT } from '../pixeltext'
import { PixelAnim, drawDollAndPet, drawPet, drawTwinkles, ellipse } from './PixelAnim'
import { checkoutBusy, offerOwnedAll, openConfirm } from './flow'
import { sfx } from '../../engine/audio'

export const RAR_LABEL: Record<Rarity, string> = { common: 'ธรรมดา', rare: 'หายาก', epic: 'ล้ำค่า', legend: 'ตำนาน' }

export function rarStyle(r: Rarity): Record<string, string> {
  return { '--rar': RARITY[r].color }
}

/** The current look trying on an outfit (garments take a worn suit off). */
export function tryOn(look: AvatarLook, o: OutfitItem): AvatarLook {
  const l = applyItem(look, o, o.slot as Slot)
  if (l.suit && o.slot !== 'suit' && ['top', 'bottom', 'hair', 'head'].includes(o.slot)) l.suit = null
  return l
}

/** Thumbnail image of an outfit on the player, or a pet icon. */
export function EntryThumb({ kind, id, size = 64 }: { kind: EntryKind; id: string; size?: number }) {
  const look = game.value.player.look
  const url = useMemo(() => {
    if (kind === 'pet') return spriteDataUrl(petIcon(id), 3)
    const o = OUTFIT_BY_ID[id]
    return o ? thumbFor(tryOn(look, o), o.slot) : ''
  }, [kind, id, lookKey(look)])
  return <img class={`px sh-thumb ${kind === 'pet' ? 'pet' : ''}`} src={url} alt="" width={size} height={size} draggable={false} />
}

function Ribbon({ kind, children }: { kind: 'new' | 'hot' | 'sale' | 'pack' | 'limited'; children: ComponentChildren }) {
  return <span class={`sh-ribbon ${kind}`}>{children}</span>
}

/** Ribbons for an entry: new, best seller or a deal discount. */
function ribbonsFor(kind: EntryKind, id: string, off?: number) {
  if (off) return <Ribbon kind="sale">-{off}%</Ribbon>
  const o = kind === 'outfit' ? OUTFIT_BY_ID[id] : null
  if (o && isNewOutfit(o)) return <Ribbon kind="new">ใหม่!</Ribbon>
  if (kind === 'pet' && ['orange_cat', 'water_monitor', 'capybara', 'pygmy_hippo', 'blindbox_monster', 'butter_bear'].includes(id)) return <Ribbon kind="new">ใหม่!</Ribbon>
  if (BEST_SELLERS.has(id)) return <Ribbon kind="hot">ขายดี</Ribbon>
  return null
}

/** A rarity-framed card for an outfit or pet. */
export function ItemCard({ kind, id, deal, wide }: { kind: EntryKind; id: string; deal?: Deal; wide?: boolean }) {
  const e = entryOf(kind, id)
  if (!e) return null
  const s = game.value
  const have = owns(kind, id, s)
  const locked = e.level > level.value.level
  const pet = kind === 'pet' ? PET_BY_ID[id] : null
  const exclusive = kind === 'outfit' ? !!OUTFIT_BY_ID[id]?.exclusive || !!OUTFIT_BY_ID[id]?.premium : !!pet?.exclusive || !!pet?.premium
  const price = deal ? deal.price : e.price
  return (
    <button
      class={`sh-card rar-${e.rarity} ${wide ? 'wide' : ''} ${have ? 'owned' : ''}`}
      style={rarStyle(e.rarity)}
      onClick={() => openConfirm(deal ? { kind: 'deal', deal } : { kind, id })}
      aria-label={`${e.name} ${have ? 'มีแล้ว' : `${price} คอยน์`}`}
    >
      {ribbonsFor(kind, id, deal?.off)}
      <span class="sh-card-art">
        <EntryThumb kind={kind} id={id} size={wide ? 72 : 64} />
        {locked && !have && (
          <span class="sh-lock">
            <Icon name="lock" size={14} /> Lv.{e.level}
          </span>
        )}
      </span>
      <span class="sh-rar-tag">{RAR_LABEL[e.rarity]}</span>
      <span class="sh-card-name">{e.name}</span>
      {pet && <span class="sh-perk">{perkText(pet.perk)}</span>}
      <span class={`sh-price ${have ? 'have' : ''}`}>
        {have ? (
          <>
            <Icon name="check" size={14} /> มีแล้ว
          </>
        ) : exclusive ? (
          <>
            <Icon name="gift" size={14} /> ของพิเศษ
          </>
        ) : (
          <>
            {deal && <s class="num">{deal.was}</s>}
            <Coin n={price} size={14} />
          </>
        )}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Daily free gift

export function GiftCard({ onClaim }: { onClaim: () => void }) {
  const s = game.value
  const ready = giftReady(s)
  const g = nextGift(s)
  const day = (s.shop.gifts % 7) + 1
  return (
    <div class={`sh-gift ${ready ? 'ready' : ''}`}>
      <span class="sh-gift-box">
        <Icon name="gift" size={40} />
      </span>
      <div class="grow">
        <PT text={ready ? 'ของขวัญฟรีวันนี้!' : 'รับของขวัญแล้ว'} size={11} weight={600} color="#fff6dc" shadow="#8e3a5c" />
        <div class="small sh-gift-sub">
          {ready ? (
            <>
              วันที่ {day}/7 · <Icon name={g.icon} size={14} /> {g.label}
            </>
          ) : (
            <>พรุ่งนี้มีของใหม่ · อีก {fmtCountdown(msUntilReset())}</>
          )}
        </div>
      </div>
      <button class={`btn ${ready ? 'green' : 'paper'} small`} disabled={!ready} onClick={() => (sfx.tap(), onClaim())}>
        {ready ? 'รับฟรี' : '✓'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bundles

export function BundleCard({ b }: { b: Bundle }) {
  const s = game.value
  const missing = bundleMissing(b, s)
  const price = bundlePrice(b, s)
  const done = !missing.length
  return (
    <button class={`sh-bundle theme-${b.theme} ${done ? 'owned' : ''}`} onClick={() => openConfirm({ kind: 'bundle', id: b.id })}>
      {!done && <span class="sh-ribbon sale">-{b.off}%</span>}
      <div class="sh-bundle-head">
        <PT text={b.name} size={11} weight={600} color="#fff6dc" shadow="#3b2616" />
      </div>
      <div class="sh-strip">
        {b.items.map((id) => {
          const e = entryOf(OUTFIT_BY_ID[id] ? 'outfit' : 'pet', id)
          if (!e) return null
          const have = owns(e.kind, id, s)
          return (
            <span key={id} class={`sh-strip-slot rar-${e.rarity} ${have ? 'have' : ''}`} style={rarStyle(e.rarity)} title={e.name}>
              <EntryThumb kind={e.kind} id={id} size={48} />
              {have && <span class="sh-strip-check">✓</span>}
            </span>
          )
        })}
      </div>
      <div class="sh-bundle-foot">
        <span class="small">{b.desc}</span>
        <span class="sh-price">
          {done ? (
            <>
              <Icon name="check" size={14} /> ครบเซ็ต
            </>
          ) : (
            <>
              <s class="num">{missing.reduce((n, e) => n + e.price, 0)}</s>
              <Coin n={price} size={14} />
            </>
          )}
        </span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Deals

export function DealsRow({ deals }: { deals: Deal[] }) {
  return (
    <div class="sh-row">
      {deals.map((d) => (
        <div key={d.id} class={`sh-deal ${dealBought(d) ? 'sold' : ''}`}>
          <ItemCard kind={d.kind} id={d.itemId} deal={dealBought(d) ? undefined : d} />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Special packs (real money, sandboxed)

function Contents({ o }: { o: SpecialOffer }) {
  const s = game.value
  return (
    <div class="sh-contents">
      <span class="sh-cslot coins">
        <Icon name="coinbag" size={30} />
        <span class="sh-cq num">{o.coins}</span>
        <span class="sh-cname">คอยน์</span>
      </span>
      {(o.outfits ?? []).map((id) => {
        const it = OUTFIT_BY_ID[id]
        return (
          <span key={id} class={`sh-cslot ${s.outfits.includes(id) ? 'have' : ''}`}>
            <EntryThumb kind="outfit" id={id} size={40} />
            <span class="sh-cname">{it?.name ?? id}</span>
          </span>
        )
      })}
      {(o.pets ?? []).map((id) => (
        <span key={id} class={`sh-cslot pet ${s.pets.includes(id) ? 'have' : ''}`}>
          <EntryThumb kind="pet" id={id} size={40} />
          <span class="sh-cname">{PET_BY_ID[id]?.name ?? id}</span>
        </span>
      ))}
      {Object.entries(o.items ?? {}).map(([id, n]) => (
        <span key={id} class="sh-cslot">
          <Icon name={ITEM_BY_ID[id]?.icon ?? 'gift'} size={30} />
          <span class="sh-cq num">x{n}</span>
          <span class="sh-cname">{ITEM_BY_ID[id]?.name ?? id}</span>
        </span>
      ))}
    </div>
  )
}

/** Coin value of what a pack contains (for the "worth" strike price). */
export function packWorthTHB(o: SpecialOffer): number {
  const coins = o.coins + (o.outfits ?? []).reduce((n, id) => n + (OUTFIT_BY_ID[id]?.price ?? 0), 0) + (o.pets ?? []).reduce((n, id) => n + (PET_BY_ID[id]?.price ?? 0), 0)
  // 100 coins ≈ ฿35 in the coin packs
  return Math.max(o.priceTHB, Math.round((coins * 0.35) / 10) * 10 - 1)
}

function packLook(o: SpecialOffer, look: AvatarLook): AvatarLook {
  let l = { ...look }
  for (const id of o.outfits ?? []) {
    const it = OUTFIT_BY_ID[id]
    if (it) l = tryOn(l, it)
  }
  return l
}

function BuyPackBtn({ o }: { o: SpecialOffer }) {
  const done = offerOwnedAll(o)
  return (
    <button class={`btn ${done ? 'paper' : 'green'} sh-pack-buy`} disabled={done || !!checkoutBusy.value} onClick={() => (sfx.tap(), openConfirm({ kind: 'pack', id: o.id }))}>
      {done ? <PT text="มีครบแล้ว" size={11} weight={600} color="#3b2616" /> : <PT text={`ซื้อเลย ฿${o.priceTHB}`} size={12} weight={600} color="#fff6dc" shadow="#1f4a26" />}
    </button>
  )
}

/** Starter pack: shows the avatar in the elephant hat and pants with ช้างน้อย. */
export function StarterPackCard({ o }: { o: SpecialOffer }) {
  const look = game.value.player.look
  const pl = packLook(o, look)
  const pet = o.pets?.[0] ?? null
  const worth = packWorthTHB(o)
  const off = Math.round((1 - o.priceTHB / worth) * 100)
  return (
    <div class="sh-pack starter">
      <span class="sh-ribbon limited">ครั้งเดียวเท่านั้น</span>
      <span class="sh-burst">
        <b>-{off}%</b>
      </span>
      <div class="sh-pack-title">
        <PT text="แพ็กเริ่มต้นช้างน้อย" size={12} weight={600} color="#fff6dc" outline="#7e2436" />
      </div>
      <div class="sh-pack-top">
        <PixelAnim
          w={76}
          h={58}
          scale={2}
          class="sh-pack-art"
          draw={(ctx, t) => {
            drawTwinkles(ctx, t, 76, 58, 7, '#fff3a6', 3)
            drawDollAndPet(ctx, t, pl, pet, 26, 55, { petSide: 1 })
          }}
        />
        <div class="sh-pack-copy">
          <div class="small">ช้างน้อยใส่กางเกงช้างเดินตามทุกที่ ใส่ชุดคู่กันน่ารักสุด ๆ</div>
          <div class="sh-worth">
            มูลค่า <s>฿{worth}</s> <b>฿{o.priceTHB}</b>
          </div>
        </div>
      </div>
      <div class="small sh-get">ได้รับทั้งหมดนี้:</div>
      <Contents o={o} />
      <BuyPackBtn o={o} />
    </div>
  )
}

/** Flood water with waves, bubbles, a floating slipper and a rubber duck. */
export function drawFlood(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, rise: number) {
  const level = h - Math.min(1, t / 1.6) * rise
  const wave = (x: number, k: number) => Math.sin(x * 0.18 + t * 2.2 + k) * 1.6 + Math.sin(x * 0.07 - t * 1.3) * 1.2
  for (let x = 0; x < w; x++) {
    const top = Math.round(level + wave(x, 0))
    for (let y = Math.max(0, top); y < h; y++) {
      const d = y - top
      ctx.fillStyle = d === 0 ? 'rgba(220, 245, 255, 0.95)' : d < 3 ? 'rgba(120, 190, 230, 0.8)' : 'rgba(70, 130, 190, 0.72)'
      ctx.fillRect(x, y, 1, 1)
    }
    // a second, lighter wave line
    const t2 = Math.round(level + 5 + wave(x, 2))
    if (t2 < h && (x + Math.floor(t * 6)) % 7 < 3) {
      ctx.fillStyle = 'rgba(200, 235, 255, 0.55)'
      ctx.fillRect(x, t2, 1, 1)
    }
  }
  // rising bubbles
  ctx.fillStyle = 'rgba(235, 250, 255, 0.9)'
  for (let i = 0; i < 7; i++) {
    const bx = (i * 37 + 11) % w
    const ph = (t * 0.6 + i * 0.31) % 1
    const by = h - ph * (h - level + 4)
    if (by > level + 1) ctx.fillRect(Math.round(bx + Math.sin(t * 3 + i) * 1.5), Math.round(by), 1, 1)
  }
  // floating debris: a slipper and a leaf drifting across, and a rubber duck bobbing
  const drift = (sp: number, off: number) => ((t * sp + off) % (w + 20)) - 10
  const sx = drift(9, 20)
  const sy = level + wave(sx, 0) - 1
  ctx.fillStyle = '#5a8de0'
  ctx.fillRect(Math.round(sx), Math.round(sy), 5, 2)
  ctx.fillStyle = '#fbfcff'
  ctx.fillRect(Math.round(sx) + 1, Math.round(sy) - 1, 1, 1)
  ctx.fillRect(Math.round(sx) + 3, Math.round(sy) - 1, 1, 1)
  const lx = drift(6, 70)
  ctx.fillStyle = '#5ea653'
  ctx.fillRect(Math.round(lx), Math.round(level + wave(lx, 0)) - 1, 3, 1)
  ctx.fillRect(Math.round(lx) + 1, Math.round(level + wave(lx, 0)) - 2, 2, 1)
  const dx = Math.round(w * 0.72 + Math.sin(t * 0.7) * 6)
  const dy = Math.round(level + wave(dx, 0))
  ellipse(ctx, dx, dy - 2, 4, 2.4, '#ffd23f')
  ellipse(ctx, dx + 3, dy - 5, 2.2, 2.2, '#ffd23f')
  ctx.fillStyle = '#ff8a2a'
  ctx.fillRect(dx + 5, dy - 5, 2, 1)
  ctx.fillStyle = '#2a1a2c'
  ctx.fillRect(dx + 3, dy - 6, 1, 1)
  ctx.fillStyle = '#fff3a6'
  ctx.fillRect(dx - 2, dy - 3, 2, 1)
}

/** "หนีภัยน้ำท่วม": blinking hazard sign and rising flood water over the card. */
export function FloodPackCard({ o }: { o: SpecialOffer }) {
  const look = game.value.player.look
  const pl = packLook(o, look)
  const pet = o.pets?.[0] ?? null
  const worth = packWorthTHB(o)
  return (
    <div class="sh-pack flood">
      <span class="sh-hazard" aria-hidden="true">
        <span class="sh-hazard-tri">
          <span class="sh-hazard-in" />
          <b>!</b>
        </span>
      </span>
      <span class="sh-hazard-tape" aria-hidden="true" />
      <div class="sh-pack-title">
        <span class="sh-warn-label">แพ็กพิเศษ · เตือนภัย!</span>
        <PT text="หนีภัยน้ำท่วม" size={13} weight={600} color="#fff6dc" outline="#1f3f70" />
      </div>
      <div class="sh-pack-top">
        <PixelAnim
          w={76}
          h={58}
          scale={2}
          class="sh-pack-art"
          draw={(ctx, t) => {
            drawTwinkles(ctx, t, 76, 40, 4, '#dff4ff', 7)
            drawDollAndPet(ctx, t, pl, null, 24, 55)
            if (pet) drawPet(ctx, t, pet, 55, 50)
          }}
        />
        <div class="sh-pack-copy">
          <div class="small">เตรียมตัวหนีน้ำให้เท่ ชุดดำน้ำครบเซ็ต พร้อมปลากัดลอยฟ่องคู่ใจ</div>
          <div class="sh-worth">
            มูลค่า <s>฿{worth}</s> <b>฿{o.priceTHB}</b>
          </div>
        </div>
        <PixelAnim w={108} h={22} scale={3} class="sh-flood-rise" draw={(ctx, t) => drawFlood(ctx, t, 108, 22, 15)} />
      </div>
      <Contents o={o} />
      <BuyPackBtn o={o} />
      <PixelAnim w={112} h={46} scale={3} class="sh-flood-water" draw={(ctx, t) => drawFlood(ctx, t, 112, 46, 20)} />
    </div>
  )
}

/** Any other special offer (pets, costume sets, the monthly pass). */
export function OfferCard({ o }: { o: SpecialOffer }) {
  const done = offerOwnedAll(o)
  const firstPet = o.pets?.[0]
  const firstOutfit = o.outfits?.[0]
  return (
    <button class={`sh-offer ${done ? 'owned' : ''}`} onClick={() => openConfirm({ kind: 'pack', id: o.id })}>
      {o.monthly ? <Ribbon kind="hot">คุ้มสุด</Ribbon> : <Ribbon kind="pack">แพ็ก</Ribbon>}
      <span class="sh-offer-art">{firstPet ? <EntryThumb kind="pet" id={firstPet} size={56} /> : firstOutfit ? <EntryThumb kind="outfit" id={firstOutfit} size={56} /> : <Icon name="calendar" size={44} />}</span>
      <span class="grow sh-offer-copy">
        <b>{o.name}</b>
        <span class="small muted">{o.desc}</span>
      </span>
      <span class="sh-baht num">{done ? '✓' : `฿${o.priceTHB}`}</span>
    </button>
  )
}

/** A pet shown bigger in a row (featured / pet tab hero). */
export function PetShowcase({ id }: { id: string }) {
  return (
    <PixelAnim
      w={44}
      h={42}
      scale={2}
      draw={(ctx, t) => {
        drawTwinkles(ctx, t, 44, 42, 4, '#fff3a6', id.length)
        drawPet(ctx, t, id, 22, 40)
      }}
    />
  )
}
