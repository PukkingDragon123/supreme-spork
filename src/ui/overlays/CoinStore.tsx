// Boon Coin store: real-money packs (sandbox in the prototype) and free coins.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { COIN_PACKS, SPECIAL_OFFERS, AD_REWARD_COINS, type CoinPack, type SpecialOffer } from '../../game/data/store'
import { adsLeft, completePurchase, rewardAd } from '../../game/actions'
import { payments } from '../../services/payments'
import { ads } from '../../services/ads'
import { toast } from '../../game/events'
import { Btn, Coin, Icon, Sheet } from '../components/common'
import { coinStoreOpen } from '../store'
import { sfx } from '../../engine/audio'

const PACK_ICON: Record<CoinPack['art'], string> = {
  'pouch-s': 'coins',
  'pouch-m': 'coinbag',
  'pouch-l': 'coinbag',
  chest: 'gift',
  temple: 'temple',
}

export function CoinStore() {
  const s = game.value
  const [busy, setBusy] = useState<string | null>(null)
  const close = () => (coinStoreOpen.value = false)

  const buy = async (id: string, price: number, title: string) => {
    if (busy) return
    setBusy(id)
    const r = await payments().purchase(id, price, title)
    setBusy(null)
    if (r.ok && r.transactionId) {
      completePurchase(id, r.transactionId)
      sfx.purchase()
    }
  }

  const offers = SPECIAL_OFFERS.filter((o) => !(o.oneTime && s.starterBought))
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
      {offers.map((o: SpecialOffer) => (
        <button key={o.id} class="panel promo" disabled={!!busy} onClick={() => buy(o.id, o.priceTHB, o.name)}>
          {o.oneTime && <span class="ribbon">ครั้งเดียว</span>}
          <Icon name={o.monthly ? 'calendar' : 'gift'} size={40} />
          <div class="grow" style={{ textAlign: 'left' }}>
            <div class="subtitle">{o.name}</div>
            <div class="small muted">{o.desc}</div>
          </div>
          <span class="price num">฿{o.priceTHB}</span>
        </button>
      ))}
      <div class="grid2" style={{ marginTop: '8px' }}>
        {COIN_PACKS.map((p) => (
          <button key={p.id} class="panel pack" disabled={!!busy} onClick={() => buy(p.id, p.priceTHB, `${p.name} ${p.coins + p.bonus} คอยน์`)}>
            {p.badge && <span class="ribbon">{p.badge}</span>}
            <Icon name={PACK_ICON[p.art]} size={44} />
            <div class="subtitle">{p.name}</div>
            <Coin n={p.coins} size={16} />
            {p.bonus > 0 && <span class="chip pink small">แถม +{p.bonus}</span>}
            <span class="price num">฿{p.priceTHB}</span>
          </button>
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
    </Sheet>
  )
}
