// Purchase confirm modal (big animated preview) and the celebration reveal
// (item pops out with rays and confetti). Rendered into the phone frame via
// a portal so they sit above the shop window.

import { createPortal } from 'preact/compat'
import { useEffect, useState } from 'preact/hooks'
import { game, level } from '../../game/state'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { PET_BY_ID, perkText } from '../../game/data/pets'
import { COIN_PACKS, SPECIAL_OFFERS } from '../../game/data/store'
import { BUNDLES, RARITY, bundleMissing, bundlePrice, dealBought, entryOf, owns, buyable, type EntryKind, type Rarity } from '../../game/shop'
import type { AvatarLook } from '../../art/avatar'
import { Coin, Icon } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { PT } from '../pixeltext'
import { coinStoreOpen } from '../store'
import { PixelAnim, drawDollAndPet, drawPet, drawRays, drawTwinkles } from './PixelAnim'
import { EntryThumb, RAR_LABEL, drawFlood, packWorthTHB, rarStyle, tryOn } from './ShopCards'
import { buyBundleFlow, buyDealFlow, buyEntry, checkout, checkoutBusy, closeConfirm, offerOwnedAll, shopConfirm, shopReveal, useRevealed, type ConfirmReq, type RevealItem } from './flow'
import { sfx } from '../../engine/audio'
import './shop.css'

function portalTarget(): Element {
  return document.querySelector('.phone') ?? document.body
}

/** Look with every revealed / previewed outfit applied. */
function lookWith(items: RevealItem[], base: AvatarLook): AvatarLook {
  let l = { ...base }
  for (const it of items) {
    if (it.kind !== 'outfit') continue
    const o = OUTFIT_BY_ID[it.id]
    if (o) l = tryOn(l, o)
  }
  return l
}

const RAY: Record<Rarity, string> = {
  common: 'rgba(134, 201, 95, 0.28)',
  rare: 'rgba(90, 141, 224, 0.3)',
  epic: 'rgba(146, 112, 220, 0.32)',
  legend: 'rgba(255, 196, 64, 0.38)',
}

function Preview({ items, rarity, flood }: { items: RevealItem[]; rarity: Rarity; flood?: boolean }) {
  const s = game.value
  const look = lookWith(items, s.player.look)
  const pet = items.find((i) => i.kind === 'pet')?.id ?? null
  const onlyPet = !items.some((i) => i.kind === 'outfit') && !!pet
  const [spin, setSpin] = useState(false)
  return (
    <button class="sh-preview" style={rarStyle(rarity)} onClick={() => (sfx.whoosh(), setSpin((v) => !v))} aria-label="แตะเพื่อหมุนดูด้านหลัง">
      <PixelAnim
        w={96}
        h={64}
        scale={3}
        draw={(ctx, t) => {
          drawRays(ctx, t, 48, 34, 70, RAY[rarity], 12)
          drawTwinkles(ctx, t, 96, 64, 9, '#fffbe0', items.length + 2)
          if (onlyPet) {
            drawDollAndPet(ctx, t, s.player.look, null, 30, 61, { hop: false })
            drawPet(ctx, t, pet!, 64, 58)
          } else drawDollAndPet(ctx, t, look, pet, pet ? 38 : 48, 61, { view: spin ? 'back' : 'front', pose: spin ? 'stand' : undefined })
          if (flood) drawFlood(ctx, t, 96, 64, 14)
        }}
      />
      <span class="sh-preview-hint small">แตะเพื่อหมุน</span>
    </button>
  )
}

/** Where a granted-only item comes from. */
function sourceOf(kind: EntryKind, id: string): { text: string; pack?: string } {
  const pack = SPECIAL_OFFERS.find((o) => (kind === 'outfit' ? o.outfits : o.pets)?.includes(id))
  if (pack) return { text: `อยู่ใน${pack.name}`, pack: pack.id }
  const ex = kind === 'outfit' ? OUTFIT_BY_ID[id]?.exclusive : PET_BY_ID[id]?.exclusive
  if (ex === 'pass_free') return { text: 'รางวัลบัตรผ่านฤดูน้ำหลาก ระดับฟรี "ผู้ประสบภัย"' }
  if (ex === 'pass_premium') return { text: 'รางวัลบัตรผ่านฤดูน้ำหลาก ระดับพรีเมียม "กู้ภัย"' }
  if (ex === 'event') return { text: 'รางวัลจากกิจกรรมพิเศษ' }
  return { text: 'ของพิเศษ' }
}

function PriceButton({ price, was, onBuy, locked }: { price: number; was?: number; onBuy: () => void; locked?: number }) {
  const s = game.value
  if (locked) return <button class="btn paper grow" disabled>ปลดล็อกที่ Lv.{locked}</button>
  if (s.coins < price)
    return (
      <button class="btn green grow" onClick={() => (sfx.open(), closeConfirm(), (coinStoreOpen.value = true))}>
        <Icon name="coin" size={18} /> เติมคอยน์ (ขาด {price - s.coins})
      </button>
    )
  return (
    <button class="btn gold grow sh-buy" onClick={onBuy}>
      <PT text="ซื้อเลย" size={12} weight={600} color="#5a3410" shadow="#ffe58a" />
      {was && <s class="num small">{was}</s>}
      <Coin n={price} size={18} />
    </button>
  )
}

function ConfirmBody({ req }: { req: ConfirmReq }) {
  const s = game.value
  const lv = level.value.level
  if (req.kind === 'outfit' || req.kind === 'pet' || req.kind === 'deal') {
    const kind = req.kind === 'deal' ? req.deal.kind : req.kind
    const id = req.kind === 'deal' ? req.deal.itemId : req.id
    const deal = req.kind === 'deal' && !dealBought(req.deal) ? req.deal : null
    const e = entryOf(kind, id)
    if (!e) return null
    const have = owns(kind, id, s)
    const pet = kind === 'pet' ? PET_BY_ID[id] : null
    const canBuy = buyable(kind, id)
    const src = canBuy ? null : sourceOf(kind, id)
    return (
      <>
        <Preview items={[{ kind, id }]} rarity={e.rarity} />
        <div class="sh-m-head">
          <span class="sh-rar-chip" style={rarStyle(e.rarity)}>
            {RAR_LABEL[e.rarity]}
          </span>
          {deal && <span class="sh-rar-chip sale">ลด {deal.off}% วันนี้เท่านั้น</span>}
        </div>
        <PT text={e.name} size={13} weight={600} color="#3b2616" />
        <p class="small sh-m-desc">{e.desc}</p>
        {pet && (
          <div class="chip green">
            <Icon name="paw" size={14} /> {perkText(pet.perk)} ตลอดที่พาไปด้วย
          </div>
        )}
        <div class="row sh-m-actions">
          <button class="btn paper" onClick={() => (sfx.close(), closeConfirm())}>
            ไว้ก่อน
          </button>
          {have ? (
            <button class="btn paper grow" disabled>
              <Icon name="check" size={16} /> มีแล้ว
            </button>
          ) : src ? (
            src.pack ? (
              <button class="btn pink grow" onClick={() => (sfx.open(), (shopConfirm.value = { kind: 'pack', id: src.pack! }))}>
                <Icon name="gift" size={16} /> ดูแพ็ก
              </button>
            ) : (
              <button class="btn paper grow" disabled>
                <Icon name="lock" size={16} /> รับได้จากบัตรผ่าน
              </button>
            )
          ) : (
            <PriceButton price={deal ? deal.price : e.price} was={deal ? deal.was : undefined} locked={e.level > lv ? e.level : undefined} onBuy={() => (deal ? buyDealFlow(deal) : buyEntry(kind, id))} />
          )}
        </div>
        {src && <p class="small muted center">{src.text}</p>}
      </>
    )
  }
  if (req.kind === 'bundle') {
    const b = BUNDLES.find((x) => x.id === req.id)
    if (!b) return null
    const items = b.items.map((id) => ({ kind: (OUTFIT_BY_ID[id] ? 'outfit' : 'pet') as EntryKind, id }))
    const missing = bundleMissing(b, s)
    const price = bundlePrice(b, s)
    const lockedLv = Math.max(0, ...missing.map((e) => e.level))
    return (
      <>
        <Preview items={items} rarity="epic" />
        <PT text={b.name} size={13} weight={600} color="#3b2616" />
        <p class="small sh-m-desc">{b.desc}</p>
        <div class="sh-strip center">
          {items.map((it) => {
            const e = entryOf(it.kind, it.id)
            if (!e) return null
            return (
              <span key={it.id} class={`sh-strip-slot rar-${e.rarity} ${owns(it.kind, it.id, s) ? 'have' : ''}`} style={rarStyle(e.rarity)}>
                <EntryThumb kind={it.kind} id={it.id} size={48} />
              </span>
            )
          })}
        </div>
        <div class="row sh-m-actions">
          <button class="btn paper" onClick={() => (sfx.close(), closeConfirm())}>
            ไว้ก่อน
          </button>
          {missing.length ? (
            <PriceButton price={price} was={missing.reduce((n, e) => n + e.price, 0)} locked={lockedLv > level.value.level ? lockedLv : undefined} onBuy={() => buyBundleFlow(b.id)} />
          ) : (
            <button class="btn paper grow" disabled>
              <Icon name="check" size={16} /> มีครบเซ็ตแล้ว
            </button>
          )}
        </div>
      </>
    )
  }
  // real-money pack
  const coinPack = COIN_PACKS.find((p) => p.id === req.id)
  const offer = SPECIAL_OFFERS.find((o) => o.id === req.id)
  if (coinPack) {
    return (
      <>
        <div class="sh-coinpack-big">
          <Icon name={coinPack.art === 'chest' || coinPack.art === 'temple' ? 'chest' : 'coinbag'} size={72} />
        </div>
        <PT text={coinPack.name} size={13} weight={600} color="#3b2616" />
        <div class="row" style={{ justifyContent: 'center' }}>
          <span class="chip gold">
            <Coin n={coinPack.coins} size={18} />
          </span>
          {coinPack.bonus > 0 && <span class="chip pink">แถม +{coinPack.bonus}</span>}
        </div>
        <div class="row sh-m-actions">
          <button class="btn paper" onClick={() => (sfx.close(), closeConfirm())}>
            ไว้ก่อน
          </button>
          <button class="btn green grow" disabled={!!checkoutBusy.value} onClick={() => void checkout(coinPack.id)}>
            <PT text={`ซื้อ ฿${coinPack.priceTHB}`} size={12} weight={600} color="#fff6dc" shadow="#1f4a26" />
          </button>
        </div>
        <p class="small muted center">โหมดทดลอง: ไม่มีการตัดเงินจริง</p>
      </>
    )
  }
  if (!offer) return null
  const items: RevealItem[] = [...(offer.outfits ?? []).map((id) => ({ kind: 'outfit' as const, id })), ...(offer.pets ?? []).map((id) => ({ kind: 'pet' as const, id }))]
  const done = offerOwnedAll(offer)
  return (
    <>
      {items.length ? <Preview items={items} rarity="legend" flood={offer.tag === 'flood'} /> : <div class="sh-coinpack-big"><Icon name="calendar" size={72} /></div>}
      <PT text={offer.name} size={13} weight={600} color="#3b2616" />
      <p class="small sh-m-desc">{offer.desc}</p>
      <div class="sh-strip center">
        <span class="sh-strip-slot coins">
          <Icon name="coinbag" size={30} />
          <span class="sh-cq num">{offer.coins}</span>
        </span>
        {items.map((it) => {
          const e = entryOf(it.kind, it.id)
          if (!e) return null
          return (
            <span key={it.id} class={`sh-strip-slot rar-${e.rarity} ${owns(it.kind, it.id, s) ? 'have' : ''}`} style={rarStyle(e.rarity)} title={e.name}>
              <EntryThumb kind={it.kind} id={it.id} size={48} />
            </span>
          )
        })}
      </div>
      <div class="row sh-m-actions">
        <button class="btn paper" onClick={() => (sfx.close(), closeConfirm())}>
          ไว้ก่อน
        </button>
        <button class="btn green grow" disabled={done || !!checkoutBusy.value} onClick={() => void checkout(offer.id)}>
          <PT text={done ? 'มีครบแล้ว' : `ซื้อ ฿${offer.priceTHB}`} size={12} weight={600} color="#fff6dc" shadow="#1f4a26" />
          {!done && items.length > 0 && <s class="small num">฿{packWorthTHB(offer)}</s>}
        </button>
      </div>
      <p class="small muted center">โหมดทดลอง: ไม่มีการตัดเงินจริง · เวอร์ชันร้านค้าชำระผ่าน App Store / Google Play</p>
    </>
  )
}

export function ShopConfirm() {
  const req = shopConfirm.value
  if (!req) return null
  return createPortal(
    <div class="modal-backdrop sh-backdrop" onClick={(e) => e.target === e.currentTarget && (sfx.close(), closeConfirm())}>
      <div class="panel modal sh-modal" role="dialog" aria-label="ยืนยันการซื้อ">
        <ConfirmBody req={req} />
      </div>
    </div>,
    portalTarget(),
  )
}

// ---------------------------------------------------------------------------

export function ShopReveal() {
  const req = shopReveal.value
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!req) return
    setStep(0)
    const id = setTimeout(() => setStep(1), 650)
    return () => clearTimeout(id)
  }, [req])
  if (!req) return null
  const s = game.value
  const top = req.items.reduce<Rarity>((best, it) => {
    const e = entryOf(it.kind, it.id)
    return e && RARITY[e.rarity].order > RARITY[best].order ? e.rarity : best
  }, 'common')
  const close = () => {
    sfx.tap()
    shopReveal.value = null
  }
  const wearable = req.items.some((it) => (it.kind === 'outfit' ? !Object.values(s.player.look).includes(it.id) : s.pet !== it.id))
  const look = lookWith(req.items, s.player.look)
  const pet = req.items.find((i) => i.kind === 'pet')?.id ?? null
  return createPortal(
    <div class="sh-reveal" style={rarStyle(top)} onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="sh-reveal-rays" aria-hidden="true" />
      <FxCanvas mode="confetti" />
      <div class="sh-reveal-card" role="dialog" aria-label={req.title}>
        <div class="sh-reveal-title">
          <PT text={req.title} size={14} weight={600} color="#fff6dc" outline="#3b2616" />
        </div>
        <div class="sh-reveal-pop">
          {req.items.length ? (
            <PixelAnim
              w={80}
              h={62}
              scale={3}
              draw={(ctx, t) => {
                drawTwinkles(ctx, t, 80, 62, 10, '#fffbe0', 5)
                if (req.items.some((i) => i.kind === 'outfit')) drawDollAndPet(ctx, t + 2.2, look, pet, pet ? 30 : 40, 60)
                else drawPet(ctx, t + 3.7, pet!, 40, 58)
              }}
            />
          ) : (
            <span class="sh-reveal-coins">
              <Icon name="chest" size={96} />
            </span>
          )}
        </div>
        <div class={`sh-reveal-list ${step ? 'on' : ''}`}>
          {req.items.map((it, i) => {
            const e = entryOf(it.kind, it.id)
            if (!e) return null
            return (
              <span key={it.id} class={`sh-reveal-item rar-${e.rarity}`} style={{ ...rarStyle(e.rarity), animationDelay: `${i * 120}ms` }}>
                <EntryThumb kind={it.kind} id={it.id} size={40} />
                <span class="small">{e.name}</span>
              </span>
            )
          })}
          {!!req.coins && (
            <span class="sh-reveal-item coins">
              <Coin n={`+${req.coins}`} size={20} />
            </span>
          )}
        </div>
        {req.note && <div class="small sh-reveal-note">{req.note}</div>}
        <div class="row sh-m-actions">
          {wearable && req.items.length > 0 && (
            <button class="btn pink grow" onClick={() => (useRevealed(req.items), sfx.sparkle(), close())}>
              <Icon name="shirt" size={16} /> {req.items.some((i) => i.kind === 'outfit') ? 'ใส่เลย!' : 'พาไปด้วย!'}
            </button>
          )}
          <button class="btn green grow" onClick={close}>
            เยี่ยมไปเลย!
          </button>
        </div>
      </div>
    </div>,
    portalTarget(),
  )
}
