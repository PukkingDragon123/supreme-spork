// Mounts the online windows (list, player card, gift picker, trade, chat)
// and a little "trade in progress" pill when the trade window is tucked away.

import { tradeActive } from '../../services/netTrade'
import { sfx } from '../../engine/audio'
import { ChatSheet } from './ChatSheet'
import { GiftPicker } from './GiftPicker'
import { OnlinePanel } from './OnlinePanel'
import { PlayerCard } from './PlayerCard'
import { TradeWindow } from './TradeWindow'
import { cardPeer, chatOpen, giftFor, onlinePanelOpen, trade, tradeOpen } from './onlineStore'
import { NIcon } from './netIcons'
import './online.css'

/** Windows that sit above everything in the world and the house. */
export function OnlineHost() {
  const t = trade.value
  return (
    <>
      {onlinePanelOpen.value && <OnlinePanel />}
      {cardPeer.value && <PlayerCard id={cardPeer.value} />}
      {giftFor.value && <GiftPicker id={giftFor.value} />}
      {tradeOpen.value && t.phase !== 'idle' && <TradeWindow />}
      {!tradeOpen.value && tradeActive(t) && (
        <button class="ol-trade-pill" onClick={() => (sfx.open(), (tradeOpen.value = true))} aria-label="กลับไปที่การแลกของ">
          <NIcon name="trade" size={18} /> {t.phase === 'asked' ? 'มีคนชวนแลกของ!' : 'กำลังแลกของ…'}
        </button>
      )}
    </>
  )
}

/** The quick-chat sheet (world HUD only). */
export function OnlineChat() {
  return chatOpen.value ? <ChatSheet /> : null
}
