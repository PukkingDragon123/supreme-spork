// ตลาดนัดสายบุญ – buy from other players' stalls and run your own.

import { useEffect, useMemo, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { MATERIAL_IDS, type MaterialId } from '../../game/materials'
import { ITEM_BY_ID } from '../../game/data/items'
import { FURNITURE_BY_ID } from '../../game/data/furniture'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import {
  baseValue,
  browseListings,
  buyListing,
  cancelListing,
  collectSales,
  listItem,
  MARKET_FEE,
  MAX_LISTINGS,
  owned,
  soldCount,
  tradeName,
  type Listing,
  type TradeKind,
} from '../../game/market'
import { materialSprite, furnitureThumb } from '../../art/furniture'
import { spriteDataUrl } from '../../engine/sprite'
import { simulatedProfile } from '../../services/social'
import { openPanel } from '../store'
import { PBtn, Slot, Tabs, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Coin, Icon, Portrait } from '../components/common'
import { thumbFor, applyItem } from '../DressUp'
import { toast } from '../../game/events'
import { sfx } from '../../engine/audio'
import { COLLECTIBLE_BY_ID, RARITY_INFO } from '../../game/data/collectibles'
import { collectibleUrl } from '../../art/collectibles'
import './collection.css'

function TradeIcon({ kind, id, size = 40 }: { kind: TradeKind; id: string; size?: number }) {
  const look = game.value.player.look
  const src = useMemo(() => {
    if (kind === 'mat') return spriteDataUrl(materialSprite(id as MaterialId), 3)
    if (kind === 'furniture') return spriteDataUrl(furnitureThumb(id), 2)
    if (kind === 'collectible') return collectibleUrl(id, 2)
    if (kind === 'outfit') {
      const o = OUTFIT_BY_ID[id]
      return o ? thumbFor(applyItem(look, o, o.slot as never), o.slot) : ''
    }
    return ''
  }, [kind, id])
  if (kind === 'item') return <Icon name={ITEM_BY_ID[id]?.icon ?? 'gift'} size={size} />
  return <img class="px" src={src} alt="" width={size} height={size} />
}

type MTab = 'buy' | 'sell' | 'mine'

export function MarketWindow() {
  const [t, setT] = useState<MTab>('buy')
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [])
  const sold = soldCount()
  return (
    <Window title="ตลาดนัดสายบุญ" icon="market" tone="gold" onClose={() => openPanel(null)} wide>
      <p class="small muted">ซื้อขายวัสดุ ของทำบุญ เฟอร์นิเจอร์ ชุด และของสะสมกับผู้เล่นคนอื่น · ค่าธรรมเนียมตลาด {Math.round(MARKET_FEE * 100)}%</p>
      <Tabs
        tabs={[
          { id: 'buy', label: 'ซื้อ', icon: 'coin' },
          { id: 'sell', label: 'ขายของ', icon: 'market' },
          { id: 'mine', label: 'แผงของฉัน', icon: 'bag', badge: sold },
        ]}
        value={t}
        onChange={setT}
      />
      <div class="ptab-body">
        {t === 'buy' && <BuyTab />}
        {t === 'sell' && <SellTab onListed={() => setT('mine')} />}
        {t === 'mine' && <MineTab />}
      </div>
    </Window>
  )
}

function BuyTab() {
  const [, force] = useState(0)
  const list = browseListings()
  const [filter, setFilter] = useState<TradeKind | 'all'>('all')
  const shown = list.filter((l) => filter === 'all' || l.kind === filter)
  const buy = (l: Listing) => {
    if (buyListing(l)) {
      sfx.purchase()
      toast(`ซื้อ${tradeName(l.kind, l.itemId)}จาก${l.seller.name}แล้ว`, 'market')
      force((n) => n + 1)
    }
  }
  return (
    <>
      <div class="row dress-styles">
        {(
          [
            ['all', 'ทั้งหมด'],
            ['mat', 'วัสดุ'],
            ['item', 'ของทำบุญ'],
            ['furniture', 'เฟอร์นิเจอร์'],
            ['outfit', 'ชุด'],
            ['collectible', 'ของสะสม'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} class={`chip ${filter === id ? 'green' : ''}`} onClick={() => (sfx.tap(), setFilter(id))}>
            {label}
          </button>
        ))}
      </div>
      <div class="list">
        {shown.map((l) => {
          const fair = baseValue(l.kind, l.itemId) * l.qty
          const deal = l.price < fair * 0.92
          return (
            <div class="panel card market-row" key={l.id}>
              <span class="market-icon">
                <TradeIcon kind={l.kind} id={l.itemId} />
              </span>
              <div class="grow col" style={{ gap: '0' }}>
                <b class="small">
                  {tradeName(l.kind, l.itemId)} ×{l.qty}
                </b>
                <span class="small muted row" style={{ gap: '4px' }}>
                  <Portrait look={simulatedProfile(l.seller.code).look} size={18} /> แผงของ{l.seller.name}
                </span>
                {deal && <span class="chip green small deal">ราคาดี!</span>}
                {l.kind === 'collectible' && COLLECTIBLE_BY_ID[l.itemId] && <RarityTag id={l.itemId} />}
              </div>
              <PBtn tone="gold" size="small" onClick={() => buy(l)}>
                <Coin n={l.price} size={14} />
              </PBtn>
            </div>
          )
        })}
        {!shown.length && <p class="small muted center">แผงหมวดนี้หมดแล้ว รอสักพักจะมีคนมาวางขายใหม่</p>}
      </div>
      <p class="small muted center">แผงในตลาดเปลี่ยนทุกชั่วโมง</p>
    </>
  )
}

function RarityTag({ id }: { id: string }) {
  const r = RARITY_INFO[COLLECTIBLE_BY_ID[id].rarity]
  return (
    <span class="market-rar" style={{ background: r.color, color: r.dark }}>
      {'★'.repeat(r.stars)} {r.name}
    </span>
  )
}

function SellTab({ onListed }: { onListed: () => void }) {
  const s = game.value
  const options: { kind: TradeKind; id: string; n: number }[] = [
    ...MATERIAL_IDS.map((m) => ({ kind: 'mat' as const, id: m, n: s.materials[m] ?? 0 })),
    ...Object.entries(s.inventory)
      .filter(([id, n]) => n > 0 && ITEM_BY_ID[id])
      .map(([id, n]) => ({ kind: 'item' as const, id, n })),
    ...Object.entries(s.house.storage)
      .filter(([id, n]) => n > 0 && FURNITURE_BY_ID[id])
      .map(([id, n]) => ({ kind: 'furniture' as const, id, n })),
    ...Object.keys(s.collection.owned)
      .filter((id) => COLLECTIBLE_BY_ID[id])
      .map((id) => ({ kind: 'collectible' as const, id, n: owned('collectible', id, s) })),
  ].filter((o) => o.n > 0)
  const [pick, setPick] = useState<{ kind: TradeKind; id: string } | null>(options[0] ?? null)
  const have = pick ? owned(pick.kind, pick.id) : 0
  const [qty, setQty] = useState(1)
  const unit = pick ? baseValue(pick.kind, pick.id) : 0
  const [price, setPrice] = useState(unit)
  useEffect(() => {
    setQty(1)
    setPrice(unit)
  }, [pick?.kind, pick?.id])
  const suggested = unit * qty
  const list = () => {
    if (!pick) return
    if (listItem(pick.kind, pick.id, qty, price)) {
      sfx.coins()
      toast('วางขายแล้ว! รอคนมาซื้อนะ', 'market')
      onListed()
    }
  }
  if (!options.length)
    return <p class="small muted center">ยังไม่มีของให้ขาย · เก็บวัสดุรอบวัด ทำอาหาร หรือสร้างเฟอร์นิเจอร์ก่อนนะ</p>
  return (
    <>
      <div class="slot-grid">
        {options.map((o) => (
          <Slot key={`${o.kind}:${o.id}`} size={56} count={o.n} active={pick?.kind === o.kind && pick.id === o.id} onClick={() => setPick({ kind: o.kind, id: o.id })} title={tradeName(o.kind, o.id)}>
            <TradeIcon kind={o.kind} id={o.id} size={32} />
          </Slot>
        ))}
      </div>
      {pick && (
        <div class="panel sell-form">
          <PT text={tradeName(pick.kind, pick.id)} size={13} weight={600} {...TONE_TEXT.ink} />
          <div class="row">
            <span class="small">จำนวน</span>
            <span class="grow" />
            <PBtn tone="paper" size="small" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="ลด">
              −
            </PBtn>
            <b class="num">{qty}</b>
            <PBtn tone="paper" size="small" onClick={() => setQty(Math.min(have, qty + 1))} aria-label="เพิ่ม">
              +
            </PBtn>
          </div>
          <div class="row">
            <span class="small">ราคารวม</span>
            <span class="grow" />
            <PBtn tone="paper" size="small" onClick={() => setPrice(Math.max(1, Math.round(price * 0.9)))} aria-label="ลดราคา">
              −
            </PBtn>
            <Coin n={price} size={16} />
            <PBtn tone="paper" size="small" onClick={() => setPrice(Math.round(price * 1.1) + 1)} aria-label="เพิ่มราคา">
              +
            </PBtn>
          </div>
          <div class="row small muted">
            ราคาแนะนำ {suggested} · ได้รับ {Math.floor(price * (1 - MARKET_FEE))}
            <span class="grow" />
            <button class="chip" onClick={() => (sfx.tap(), setPrice(suggested))}>
              ใช้ราคาแนะนำ
            </button>
          </div>
          <p class="small muted">{price > suggested * 1.4 ? 'ตั้งราคาสูง อาจขายช้าหลายชั่วโมง' : price < suggested * 0.8 ? 'ราคาถูกมาก ขายออกเร็วแน่นอน' : 'ราคาพอดี น่าจะขายได้ภายในไม่กี่นาที'}</p>
          <PBtn tone="green" block icon="market" onClick={list} disabled={game.value.market.mine.length >= MAX_LISTINGS}>
            วางขาย
          </PBtn>
        </div>
      )}
    </>
  )
}

function MineTab() {
  const s = game.value
  const now = Date.now()
  const sold = soldCount(s)
  return (
    <div class="list">
      {sold > 0 && (
        <PBtn tone="gold" block icon="coin" onClick={() => (sfx.coins(), collectSales())}>
          รับเงินจากการขาย ({sold} รายการ)
        </PBtn>
      )}
      {s.market.mine.map((l) => {
        const done = l.soldAt <= now
        const mins = Math.max(1, Math.round((l.soldAt - now) / 60_000))
        return (
          <div class={`panel card market-row ${done ? 'gold' : ''}`} key={l.id}>
            <span class="market-icon">
              <TradeIcon kind={l.kind} id={l.itemId} />
            </span>
            <div class="grow col" style={{ gap: '0' }}>
              <b class="small">
                {tradeName(l.kind, l.itemId)} ×{l.qty}
              </b>
              <span class="small muted">{done ? 'ขายแล้ว! กดรับเงินได้เลย' : `กำลังมีคนสนใจ… (ประมาณ ${mins} นาที)`}</span>
            </div>
            <Coin n={l.price} size={14} />
            {!done && (
              <PBtn tone="paper" size="small" onClick={() => (sfx.tap(), cancelListing(l.id))}>
                เก็บคืน
              </PBtn>
            )}
          </div>
        )
      })}
      {!s.market.mine.length && <p class="small muted center">แผงยังว่าง ไปที่แท็บ "ขายของ" เพื่อวางขาย</p>}
      <p class="small muted center">
        ขายไปแล้วรวม <Coin n={s.market.earned} size={12} /> · วางได้ {MAX_LISTINGS} รายการ
      </p>
    </div>
  )
}

