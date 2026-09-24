// In-activity quick purchase sheet for consumables.

import { game } from '../game/state'
import { buyItem, count, adsLeft, rewardAd } from '../game/actions'
import { ITEM_BY_ID } from '../game/data/items'
import { AD_REWARD_COINS } from '../game/data/store'
import { ads } from '../services/ads'
import { Btn, Coin, Icon, Sheet } from '../ui/components/common'
import { coinStoreOpen } from '../ui/store'
import { toast } from '../game/events'
import { sfx } from '../engine/audio'

export function QuickBuy({ ids, title, onClose }: { ids: string[]; title?: string; onClose: () => void }) {
  const coins = game.value.coins
  return (
    <Sheet title={title ?? 'ซื้อของทำบุญ'} onClose={onClose}>
      <div class="list">
        {ids.map((id) => {
          const it = ITEM_BY_ID[id]
          if (!it) return null
          return (
            <div class="panel card" key={id}>
              <Icon name={it.icon} size={36} />
              <div class="grow">
                <div class="subtitle">
                  {it.name} {it.pack ? <span class="small muted">({it.pack} ชิ้น)</span> : null}
                </div>
                <div class="small muted">{it.desc}</div>
                <div class="small">มีอยู่ {count(id)}</div>
              </div>
              <Btn
                size="small"
                onClick={() => {
                  if (buyItem(id)) {
                    sfx.coin()
                    toast(`ซื้อ${it.name}แล้ว`, it.icon)
                  }
                }}
              >
                <Coin n={it.price} size={16} />
              </Btn>
            </div>
          )
        })}
      </div>
      <div class="row" style={{ marginTop: '10px' }}>
        {adsLeft() > 0 && (
          <Btn
            tone="blue"
            class="grow"
            onClick={async () => {
              const r = await ads().showRewarded('free_coins')
              if (r.rewarded) {
                const got = rewardAd('coins')
                if (got) toast(`ได้รับ ${got} บุญคอยน์ฟรี`, 'coin')
              }
            }}
          >
            <Icon name="tv" size={16} /> ฟรี +{AD_REWARD_COINS}
          </Btn>
        )}
        <Btn tone="paper" class="grow" onClick={() => (coinStoreOpen.value = true)}>
          เติมคอยน์ (มี {coins})
        </Btn>
      </div>
    </Sheet>
  )
}
