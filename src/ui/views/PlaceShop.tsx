// A location shop: snacks with small timed blessings, place-exclusive
// cosmetics (only sold here) and, at the 7-บุญ mart, groceries for
// ตักบาตร and cooking.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { SNACK_BY_ID, shopFor } from '../../game/data/placeShops'
import { PLACE_BY_ID } from '../../game/data/places'
import { OUTFITS } from '../../game/data/outfits'
import { ITEMS } from '../../game/data/items'
import { addBuff, buyItem, buyOutfitAnywhere, equip, ownsOutfit, spendCoins } from '../../game/actions'
import { openPanel, placeShopId } from '../store'
import { PBtn, Tabs, Window } from '../components/kit'
import { Coin, Icon } from '../components/common'
import { thumbFor, applyItem } from '../DressUp'
import { toast } from '../../game/events'
import { sfx } from '../../engine/audio'
import { level } from '../../game/state'

type T = 'snack' | 'fashion' | 'grocery'

export function PlaceShopWindow() {
  const id = placeShopId.value ?? 'mart'
  const shop = shopFor(id)
  const s = game.value
  const lv = level.value.level
  const exclusives = OUTFITS.filter((o) => shop.place && (o as { shopOnly?: string }).shopOnly === shop.place)
  const groceries = shop.mart ? ITEMS.filter((it) => (it.category === 'alms' || (it.category as string) === 'ingredient') && (it.price ?? 0) > 0) : []
  const tabs = [
    ...(groceries.length ? [{ id: 'grocery' as T, label: 'ของใช้/วัตถุดิบ', icon: 'bowl' }] : []),
    { id: 'snack' as T, label: 'ของกิน', icon: 'dessert' },
    ...(exclusives.length ? [{ id: 'fashion' as T, label: 'ของที่นี่เท่านั้น', icon: 'shirt' }] : []),
  ]
  const [t, setT] = useState<T>(tabs[0].id)
  const place = shop.place ? PLACE_BY_ID[shop.place] : null
  const close = () => openPanel(null)

  return (
    <Window title={shop.name} icon="shop" tone="gold" onClose={close} wide>
      <div class="panel shop-greet small">
        <b>{shop.npc}:</b> “{shop.greeting}”
        {place && <div class="muted">ร้านประจำ{place.name}</div>}
      </div>
      <Tabs tabs={tabs} value={t} onChange={setT} />
      <div class="ptab-body list">
        {t === 'snack' &&
          shop.snacks.map((sid) => {
            const sn = SNACK_BY_ID[sid]
            if (!sn) return null
            return (
              <div class="panel card" key={sid}>
                <Icon name={sn.icon} size={34} />
                <div class="grow">
                  <b class="small">{sn.name}</b>
                  <div class="small muted">{sn.desc}</div>
                  <span class="chip green small">
                    {sn.buff.kind === 'merit' ? 'บุญ' : sn.buff.kind === 'coin' ? 'เหรียญ' : 'บุญสัตว์'} x{sn.buff.mult} · {sn.buff.minutes} นาที
                  </span>
                </div>
                <PBtn
                  tone="gold"
                  size="small"
                  onClick={() => {
                    if (!spendCoins(sn.price)) return
                    addBuff(sn.buff.kind, sn.buff.mult, sn.buff.minutes, `snack:${sn.id}`)
                    sfx.munch()
                    toast(`อร่อยจัง! ${sn.name} ช่วยเพิ่มพลังบุญ`, sn.icon)
                  }}
                >
                  <Coin n={sn.price} size={14} />
                </PBtn>
              </div>
            )
          })}
        {t === 'fashion' &&
          exclusives.map((o) => {
            const own = ownsOutfit(o.id)
            const locked = (o.level ?? 1) > lv
            return (
              <div class="panel card" key={o.id}>
                <img class="px shop-thumb" src={thumbFor(applyItem(s.player.look, o, o.slot as never), o.slot)} alt="" width={56} height={56} />
                <div class="grow">
                  <b class="small">{o.name}</b>
                  <div class="small muted">{o.desc}</div>
                  <span class="chip gold small">มีขายที่นี่ที่เดียว</span>
                </div>
                {own ? (
                  <PBtn tone="paper" size="small" onClick={() => (equip(o.slot, o.id), sfx.tap())}>
                    ใส่
                  </PBtn>
                ) : locked ? (
                  <span class="chip small">
                    <Icon name="lock" size={12} /> Lv.{o.level}
                  </span>
                ) : (
                  <PBtn
                    tone="gold"
                    size="small"
                    onClick={() => {
                      if (buyOutfitAnywhere(o.id)) {
                        equip(o.slot, o.id)
                        sfx.purchase()
                        toast(`ได้${o.name}แล้ว ของหายากเลยนะ!`, 'shirt')
                      }
                    }}
                  >
                    <Coin n={o.price} size={14} />
                  </PBtn>
                )}
              </div>
            )
          })}
        {t === 'grocery' &&
          groceries.map((it) => (
            <div class="panel card" key={it.id}>
              <Icon name={it.icon} size={34} />
              <div class="grow">
                <b class="small">{it.name}</b>
                <div class="small muted">{it.desc}</div>
                <span class="small muted">มีอยู่ {s.inventory[it.id] ?? 0}</span>
              </div>
              <PBtn
                tone="gold"
                size="small"
                onClick={() => {
                  if (buyItem(it.id)) sfx.coins()
                }}
              >
                <Coin n={it.price} size={14} />
              </PBtn>
            </div>
          ))}
      </div>
    </Window>
  )
}
