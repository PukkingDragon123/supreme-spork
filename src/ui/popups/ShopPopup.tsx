// Quick shop: a compact bottom sheet with today's free gift, the daily
// deals and a few everyday items to buy in one tap, plus "ดูร้านทั้งหมด".
// Opens from the HUD coin pill's shop button and from Bot Noi's menu.

import { game } from '../../game/state'
import { claimGift, dailyDeals, dealBought, buyDeal, giftText } from '../../game/shop'
import { buyItem, count } from '../../game/actions'
import { ITEM_BY_ID } from '../../game/data/items'
import { toast } from '../../game/events'
import { GiftCard, EntryThumb } from '../shop/ShopCards'
import { PBtn } from '../components/kit'
import { Coin, Icon } from '../components/common'
import { PT, TONE_TEXT } from '../pixeltext'
import { sfx } from '../../engine/audio'
import { openShop } from '../store'
import { shopPopupOpen } from './popupStore'

/** Everyday things for making merit. */
const QUICK = ['incense', 'garland', 'rice', 'banana', 'fish_food', 'dog_food']

export function ShopPopup() {
  void game.value
  const close = () => (sfx.close(), (shopPopupOpen.value = false))
  const deals = dailyDeals()
  return (
    <div class="pp-sheet-back" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="pp-sheet" role="dialog" aria-label="ร้านค้าด่วน">
        <div class="pp-sheet-head">
          <Icon name="shop" size={22} />
          <PT text="ร้านค้าด่วน" size={14} weight={600} {...TONE_TEXT.ink} />
          <span class="grow" />
          <span class="pp-coins">
            <Icon name="coin" size={16} /> <b class="num">{game.value.coins.toLocaleString('en-US')}</b>
          </span>
          <button class="btn red icon-btn small" aria-label="ปิด" onClick={close}>
            <Icon name="close" size={14} />
          </button>
        </div>
        <GiftCard
          onClaim={() => {
            const g = claimGift()
            if (g) {
              sfx.coins(4)
              toast(`ของขวัญฟรี: ${giftText(g)}`, g.icon)
            }
          }}
        />
        {deals.length > 0 && (
          <>
            <div class="pp-label">ดีลวันนี้</div>
            <div class="pp-deals">
              {deals.map((d) => {
                const sold = dealBought(d)
                return (
                  <div class={`pp-deal ${sold ? 'sold' : ''}`} key={d.id}>
                    <span class="pp-off">-{d.off}%</span>
                    <EntryThumb kind={d.kind} id={d.itemId} size={48} />
                    <button class="btn gold small" disabled={sold} onClick={() => buyDeal(d) && (sfx.purchase(), toast('ซื้อแล้ว! อยู่ในกระเป๋าแล้วนะ', 'bag'))}>
                      {sold ? '✓' : <Coin n={d.price} size={13} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
        <div class="pp-label">ของทำบุญ</div>
        <div class="pp-quick">
          {QUICK.filter((id) => ITEM_BY_ID[id]).map((id) => {
            const it = ITEM_BY_ID[id]
            return (
              <button key={id} class="pp-q" onClick={() => (buyItem(id) ? sfx.coin() : sfx.error())} aria-label={`ซื้อ${it.name}`}>
                <Icon name={it.icon} size={26} />
                <span class="pp-qname">{it.name}</span>
                <span class="pp-qhave num">มี {count(id)}</span>
                <Coin n={it.price} size={12} />
              </button>
            )
          })}
        </div>
        <PBtn tone="green" block icon="shop" onClick={() => ((shopPopupOpen.value = false), openShop('featured'))}>
          ดูร้านทั้งหมด
        </PBtn>
      </div>
    </div>
  )
}
