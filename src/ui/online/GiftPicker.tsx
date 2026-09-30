// Pick an item from your bag to hand to a real player (capped per day and
// by value; the item leaves your bag only while the gift is on its way and
// comes back if they can't take it).

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { ITEM_BY_ID } from '../../game/data/items'
import { NET_LIMITS, giftValue, giftable } from '../../services/netValidate'
import { PBtn, Slot, Window } from '../components/kit'
import { Coin } from '../components/common'
import { findPlayer, giftProblem, giftsLeftToday, sendGift } from './onlineHub'
import { giftFor } from './onlineStore'
import './online.css'

export function GiftPicker({ id }: { id: string }) {
  const [pick, setPick] = useState<string | null>(null)
  const [n, setN] = useState(1)
  const p = findPlayer(id)
  if (!p) return null
  const inv = game.value.inventory
  const items = Object.entries(inv)
    .filter(([k, c]) => c > 0 && giftable(k) && giftValue(k, 1) <= NET_LIMITS.giftValue)
    .sort((a, b) => (ITEM_BY_ID[a[0]].category > ITEM_BY_ID[b[0]].category ? 1 : -1))
  const item = pick ? ITEM_BY_ID[pick] : null
  const max = item ? Math.max(1, Math.min(NET_LIMITS.giftQty, inv[item.id] ?? 0, Math.floor(NET_LIMITS.giftValue / Math.max(1, item.price)))) : 1
  const qty = Math.min(n, max)
  const problem = item ? giftProblem(item.id, qty) : null
  const left = giftsLeftToday()
  const close = () => (giftFor.value = null)
  return (
    <Window title="ส่งของขวัญ" icon="gift" tone="gold" onClose={close} class="ol-win ol-gift-win">
      <p class="ol-trade-with">
        ให้ <b>{p.name}</b> <span class="chip green small">ผู้เล่นจริง</span>
      </p>
      <p class="small muted">เลือกของจากกระเป๋า 1 อย่าง · ครั้งละไม่เกิน {NET_LIMITS.giftQty} ชิ้น มูลค่าไม่เกิน {NET_LIMITS.giftValue} คอยน์ · วันนี้ส่งได้อีก {left} ครั้ง</p>
      {!items.length && <p class="small muted center">กระเป๋าว่างเปล่า ลองซื้อของทำบุญที่ร้านค้าก่อนนะ</p>}
      <div class="slot-grid ol-gift-grid">
        {items.map(([k, c]) => (
          <Slot
            key={k}
            icon={ITEM_BY_ID[k].icon}
            count={c}
            active={pick === k}
            title={ITEM_BY_ID[k].name}
            size={54}
            onClick={() => {
              setPick(k)
              setN(1)
            }}
          />
        ))}
      </div>
      {item && (
        <div class="panel card ol-gift-sel">
          <div class="grow col" style={{ gap: '0' }}>
            <b>{item.name}</b>
            <span class="small muted">{item.desc}</span>
          </div>
          <div class="ol-qty">
            <button class="btn wood small icon-btn" aria-label="ลดจำนวน" disabled={qty <= 1} onClick={() => setN(Math.max(1, qty - 1))}>
              −
            </button>
            <b class="num">{qty}</b>
            <button class="btn wood small icon-btn" aria-label="เพิ่มจำนวน" disabled={qty >= max} onClick={() => setN(Math.min(max, qty + 1))}>
              +
            </button>
          </div>
          <span class="small">
            มูลค่า <Coin n={item.price * qty} size={14} />
          </span>
        </div>
      )}
      {problem && <p class="small ol-warn">{problem}</p>}
      <PBtn
        tone="gold"
        block
        icon="gift"
        disabled={!item || !!problem}
        onClick={() => {
          if (item && sendGift(p.id, item.id, qty)) close()
        }}
      >
        ส่งของขวัญ
      </PBtn>
    </Window>
  )
}
