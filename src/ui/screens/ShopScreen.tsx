// ร้านค้า – offerings, alms food, animal food, boosts and area unlocks.

import { game, level } from '../../game/state'
import { ITEMS, BOOSTS, type ItemCategory } from '../../game/data/items'
import { AREAS } from '../../game/data/areas'
import { SPECIAL_OFFERS, AD_REWARD_COINS } from '../../game/data/store'
import { adsLeft, buyBoost, buyItem, count, isAreaUnlocked, rewardAd, unlockArea } from '../../game/actions'
import { ads } from '../../services/ads'
import { toast } from '../../game/events'
import { Btn, Coin, Icon } from '../components/common'
import { coinStoreOpen, shopSection, type ShopSection } from '../store'
import { sfx } from '../../engine/audio'

const SECTIONS: { id: ShopSection; label: string; icon: string }[] = [
  { id: 'alms', label: 'ของใส่บาตร', icon: 'bowl' },
  { id: 'offering', label: 'ของถวาย', icon: 'garland' },
  { id: 'animal', label: 'อาหารสัตว์', icon: 'paw' },
  { id: 'special', label: 'พิเศษ', icon: 'krathong' },
  { id: 'boost', label: 'บูสต์บุญ', icon: 'boost' },
  { id: 'area', label: 'ปลดล็อกวัด', icon: 'map' },
]

export function ShopScreen() {
  const sec = shopSection.value
  const s = game.value
  const lv = level.value.level
  const starter = SPECIAL_OFFERS.find((o) => o.oneTime)
  return (
    <div class="screen">
      <div class="screen-head">
        <Icon name="shop" size={32} />
        <div class="grow">
          <div class="title">ร้านค้าหน้าวัด</div>
          <div class="small muted">ป้าแดงกับยายศรียินดีต้อนรับจ้า</div>
        </div>
        <Btn tone="green" size="small" onClick={() => (coinStoreOpen.value = true)}>
          <Icon name="coin" size={16} /> เติม
        </Btn>
      </div>
      {!s.starterBought && starter && (
        <button class="panel promo" onClick={() => (sfx.open(), (coinStoreOpen.value = true))}>
          <span class="ribbon">คุ้มสุด ๆ</span>
          <Icon name="gift" size={40} />
          <div class="grow" style={{ textAlign: 'left' }}>
            <div class="subtitle">{starter.name} · ฿{starter.priceTHB}</div>
            <div class="small muted">{starter.desc}</div>
          </div>
        </button>
      )}
      <div class="tabs">
        {SECTIONS.map((t) => (
          <button key={t.id} class={`tab ${sec === t.id ? 'active' : ''}`} onClick={() => (sfx.tap(), (shopSection.value = t.id))}>
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>

      {sec === 'boost' ? (
        <div class="list">
          {BOOSTS.map((b) => (
            <div class="panel card" key={b.id}>
              <Icon name={b.icon} size={40} />
              <div class="grow">
                <div class="subtitle">{b.name}</div>
                <div class="small muted">{b.desc}</div>
              </div>
              <Btn size="small" onClick={() => buyBoost(b.id) && sfx.purchase()}>
                <Coin n={b.price} size={16} />
              </Btn>
            </div>
          ))}
          <div class="small muted center">บูสต์หลายอันทำงานพร้อมกันได้ · ดูเวลาที่เหลือได้ที่หน้าวัด</div>
        </div>
      ) : sec === 'area' ? (
        <div class="list">
          {AREAS.filter((a) => a.id !== 'home').map((a) => {
            const open = isAreaUnlocked(a.id)
            return (
              <div class="panel card" key={a.id}>
                <Icon name={open ? 'temple' : 'lock'} size={40} />
                <div class="grow">
                  <div class="subtitle">
                    {a.name} <span class="small muted">· {a.subtitle}</span>
                  </div>
                  <div class="small muted">{a.desc}</div>
                  {!open && <div class="small">ปลดล็อกฟรีที่เลเวล {a.unlockLevel} (ตอนนี้ Lv.{lv})</div>}
                </div>
                {open ? (
                  <span class="chip green">เปิดแล้ว</span>
                ) : (
                  <Btn size="small" onClick={() => unlockArea(a.id) && sfx.purchase()}>
                    <Coin n={a.unlockPrice} size={16} />
                  </Btn>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div class="grid2">
          {ITEMS.filter((i) => i.category === (sec as ItemCategory)).map((it) => {
            const locked = (it.level ?? 1) > lv
            return (
              <div class={`panel shop-item ${locked ? 'locked' : ''}`} key={it.id}>
                <Icon name={it.icon} size={44} />
                <div class="subtitle center">{it.name}</div>
                <div class="small muted center shop-desc">{it.desc}</div>
                <div class="small center">
                  มีอยู่ <b class="num">{it.id === 'lottery_ticket' ? s.daily.lotteryExtra : count(it.id)}</b>
                  {it.merit > 0 && <span class="muted"> · +{it.merit} บุญ</span>}
                </div>
                {locked ? (
                  <span class="chip">
                    <Icon name="lock" size={14} /> Lv.{it.level}
                  </span>
                ) : (
                  <Btn
                    size="small"
                    block
                    onClick={() => {
                      if (buyItem(it.id)) {
                        sfx.coin()
                        toast(`ซื้อ${it.name}${it.pack ? ` (${it.pack} ชิ้น)` : ''} แล้ว`, it.icon)
                      }
                    }}
                  >
                    <Coin n={it.price} size={16} />
                  </Btn>
                )}
              </div>
            )
          })}
        </div>
      )}
      {adsLeft() > 0 && (
        <button
          class="panel card free-coins"
          onClick={async () => {
            sfx.tap()
            const r = await ads().showRewarded('free_coins')
            if (r.rewarded) {
              const got = rewardAd('coins')
              if (got) toast(`ได้รับ ${got} บุญคอยน์ฟรี`, 'coin')
            }
          }}
        >
          <Icon name="tv" size={34} />
          <div class="grow" style={{ textAlign: 'left' }}>
            <div class="subtitle">คอยน์ไม่พอ? ดูโฆษณารับฟรี</div>
            <div class="small muted">
              +{AD_REWARD_COINS} คอยน์ · เหลือ {adsLeft()} ครั้งวันนี้
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
