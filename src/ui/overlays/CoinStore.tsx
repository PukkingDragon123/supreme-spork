// Boon Coin store: real-money packs (sandbox in the prototype) and free coins.
// Uses the storefront's confirm modal and celebration reveal.

import { game } from '../../game/state'
import { COIN_PACKS, SPECIAL_OFFERS, AD_REWARD_COINS } from '../../game/data/store'
import { adsLeft, rewardAd } from '../../game/actions'
import { ads } from '../../services/ads'
import { toast } from '../../game/events'
import { Btn, Coin, Icon, Sheet } from '../components/common'
import { coinStoreOpen, tab } from '../store'
import { OfferCard } from '../shop/ShopCards'
import { ShopConfirm, ShopReveal } from '../shop/ShopModals'
import { openConfirm } from '../shop/flow'
import '../shop/shop.css'

export function CoinStore() {
  const s = game.value
  const close = () => (coinStoreOpen.value = false)
  // starter first, then the flood pack, then the rest
  const offers = SPECIAL_OFFERS.filter((o) => !(o.oneTime && s.starterBought)).sort((a, b) => Number(!!b.oneTime) - Number(!!a.oneTime) || Number(b.tag === 'flood') - Number(a.tag === 'flood'))
  return (
    <Sheet title="เติมบุญคอยน์" onClose={close}>
      <div class="row" style={{ margin: '0 4px 8px' }}>
        <span class="chip gold">
          มีอยู่ <Coin n={s.coins} size={16} />
        </span>
        <span class="small muted grow" style={{ textAlign: 'right' }}>
          ใช้ซื้อของใส่บาตร ของถวาย ชุดใหม่ และปลดล็อกวัด
        </span>
      </div>
      <div class="sh-coin-grid">
        {COIN_PACKS.map((p, i) => (
          <button key={p.id} class={`sh-coinpack tier-${i}`} onClick={() => openConfirm({ kind: 'pack', id: p.id })}>
            {p.badge && <span class="sh-ribbon hot">{p.badge}</span>}
            <Icon name={p.art === 'chest' || p.art === 'temple' ? 'chest' : i === 0 ? 'coins' : 'coinbag'} size={36 + i * 4} />
            <span class="small">{p.name}</span>
            <Coin n={p.coins} size={14} />
            {p.bonus > 0 && <span class="sh-bonus">+{p.bonus}</span>}
            <span class="sh-baht num">฿{p.priceTHB}</span>
          </button>
        ))}
      </div>
      <div class="sh-list" style={{ marginTop: '10px' }}>
        {offers.map((o) => (
          <OfferCard key={o.id} o={o} />
        ))}
      </div>
      <div class="panel card" style={{ marginTop: '10px' }}>
        <Icon name="tv" size={34} />
        <div class="grow">
          <div class="subtitle">ดูโฆษณารับฟรี {AD_REWARD_COINS} คอยน์</div>
          <div class="small muted">เหลือ {adsLeft()} ครั้งวันนี้</div>
        </div>
        <Btn
          tone="blue"
          size="small"
          disabled={adsLeft() <= 0}
          onClick={async () => {
            const r = await ads().showRewarded('free_coins')
            if (r.rewarded) {
              const got = rewardAd('coins')
              if (got) toast(`ได้รับ ${got} บุญคอยน์ฟรี`, 'coin')
            }
          }}
        >
          ดูเลย
        </Btn>
      </div>
      <div class="small muted center" style={{ margin: '10px 8px 0' }}>
        เวอร์ชันทดลอง: การซื้อทั้งหมดเป็นการจำลอง ไม่มีการตัดเงินจริง · บางส่วนของรายได้ในเวอร์ชันจริงสมทบกองบุญการกุศล
      </div>
      {s.purchases.length > 0 && (
        <div class="small muted center">ประวัติการซื้อ {s.purchases.length} รายการ · ล่าสุด {new Date(s.purchases[0].at).toLocaleDateString('th-TH')}</div>
      )}
      {tab.value !== 'shop' && (
        <>
          <ShopConfirm />
          <ShopReveal />
        </>
      )}
    </Sheet>
  )
}
