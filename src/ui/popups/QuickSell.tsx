// "ขายให้ร้าน" in the bag's item popup: a quantity stepper and the coin
// price; the game buys it back (game/quickSell.ts). The market listing form
// below it stays for selling to other players at a better price.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { sellPrice, sellToGame, sellable } from '../../game/quickSell'
import type { TradeKind } from '../../game/market'
import { toast } from '../../game/events'
import { Coin, Icon } from '../components/common'
import { sfx } from '../../engine/audio'
import './popups.css'

export function QuickSell({ kind, id, name }: { kind: TradeKind | null; id: string; name: string }) {
  void game.value
  const have = kind ? sellable(kind, id) : 0
  const [qty, setQty] = useState(1)
  if (!kind || have < 1) return null
  const n = Math.min(qty, have)
  const unit = sellPrice(kind, id)
  return (
    <div class="pp-sell">
      <div class="pp-sell-head">
        <Icon name="coin" size={18} /> <b>ขายให้ร้าน</b>
        <span class="grow" />
        <span class="small muted">
          ชิ้นละ <Coin n={unit} size={12} />
        </span>
      </div>
      <div class="pp-sell-row">
        <button class="inv-step" onClick={() => (sfx.tap(), setQty(Math.max(1, n - 1)))} aria-label="ลดจำนวนที่จะขาย">
          −
        </button>
        <b class="num pp-sell-n">{n}</b>
        <button class="inv-step" onClick={() => (sfx.tap(), setQty(Math.min(have, n + 1)))} aria-label="เพิ่มจำนวนที่จะขาย">
          +
        </button>
        <button class="pp-max" onClick={() => (sfx.tap(), setQty(have))} aria-label="ขายทั้งหมด">
          ทั้งหมด
        </button>
        <span class="grow" />
        <button
          class="btn green small"
          onClick={() => {
            const got = sellToGame(kind, id, n)
            if (!got) return
            sfx.coins(3)
            toast(`ขาย${name} x${n} ได้ ${got} คอยน์`, 'coin')
            setQty(1)
          }}
        >
          ขาย <Coin n={unit * n} size={13} />
        </button>
      </div>
    </div>
  )
}
