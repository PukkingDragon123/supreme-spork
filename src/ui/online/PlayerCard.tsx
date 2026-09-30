// Card for a real online player: their look, level, nickname (self-chosen)
// and the account name the host vouches for, province if shared, and
// สาธุ / add friend / gift / trade.

import { useMemo } from 'preact/hooks'
import { spriteDataUrl } from '../../engine/sprite'
import { dollSprite, DOLL_H, DOLL_W } from '../../art/doll'
import { lookKey } from '../../art/avatar'
import { PET_BY_ID } from '../../game/data/pets'
import { PROVINCE_BY_ID } from '../../game/data/provinces'
import { net } from '../../services/net'
import { PBtn, Window } from '../components/kit'
import { addOnlineFriend, canTalk, findPlayer, isOnlineFriend, mapLabel, sathuReady, sendSathu, startTrade, toggleMute } from './onlineHub'
import { cardPeer, giftFor, muted, netSummary } from './onlineStore'
import { NIcon } from './netIcons'
import { sfx } from '../../engine/audio'
import './online.css'

export function PlayerCard({ id }: { id: string }) {
  void netSummary.value.rev
  const p = findPlayer(id)
  const look = p?.look
  const url = useMemo(() => (look ? spriteDataUrl(dollSprite(look, 'wave'), 3) : ''), [look ? lookKey(look) : ''])
  if (!p) return null
  const close = () => (cardPeer.value = null)
  const friend = isOnlineFriend(p.friendCode)
  const pet = p.pet ? PET_BY_ID[p.pet] : null
  const prov = p.province ? PROVINCE_BY_ID[p.province] : null
  const isMuted = muted.value.has(p.id)
  const room = net.kind() === 'room'
  return (
    <Window title="ผู้เล่นออนไลน์" icon="friends" onClose={close} class="ol-win ol-card-win">
      <div class="ol-card">
        <div class="ol-card-doll">
          <img class="px" src={url} alt="" width={DOLL_W * 3} height={DOLL_H * 3} />
          <span class="ol-live">
            <i class="ol-dot" /> ผู้เล่นจริง
          </span>
        </div>
        <div class="ol-card-info">
          <div class="ol-card-name">
            <b>{p.name}</b>
            <span class="ol-lv num">Lv.{p.level}</span>
          </div>
          <span class="ol-meta">ชื่อในเกม (ผู้เล่นตั้งเอง)</span>
          {room && (
            <span class="ol-meta">
              บัญชี: <b>{p.accountName || 'ไม่แสดงชื่อ'}</b>
              {p.guest && <span class="chip small ol-guest">แขกรับเชิญ</span>}
            </span>
          )}
          {!room && <span class="ol-meta">เซิร์ฟเวอร์ไม่ยืนยันตัวตน เชื่อเฉพาะที่เห็นในเกมนะ</span>}
          <span class="ol-meta">
            <NIcon name="map" size={14} /> {mapLabel(p.map)}
            {p.doing ? ` · ${p.doing}` : ''}
          </span>
          {prov && <span class="ol-meta">บ้านเกิด: {prov.name}</span>}
          {pet && <span class="ol-meta">เดินกับ{pet.name}</span>}
        </div>
      </div>
      <div class="ol-card-acts">
        <PBtn size="small" tone="gold" icon="wai" disabled={!canTalk('sathu') || !sathuReady(p.id)} onClick={() => sendSathu(p.id)}>
          สาธุ
        </PBtn>
        <PBtn size="small" tone="green" icon="friends" disabled={!p.friendCode || friend} onClick={() => addOnlineFriend(p)}>
          {friend ? 'เป็นเพื่อนแล้ว' : 'เพิ่มเพื่อน'}
        </PBtn>
        <PBtn
          size="small" tone="pink"
          icon="gift"
          aria-label="ส่งของขวัญ"
          disabled={!canTalk('gift')}
          onClick={() => {
            giftFor.value = p.id
            cardPeer.value = null
          }}
        >
          ของขวัญ
        </PBtn>
        <PBtn
          size="small" tone="blue"
          icon="market"
          aria-label="ชวนแลกของ"
          disabled={!canTalk('trade')}
          onClick={() => {
            cardPeer.value = null
            startTrade(p.id)
          }}
        >
          แลกของ
        </PBtn>
      </div>
      <div class="ol-card-foot">
        <button
          class="ol-link"
          onClick={() => {
            sfx.tap()
            toggleMute(p.id)
          }}
        >
          <NIcon name="eye_off" size={14} /> {isMuted ? 'เลิกซ่อนแชทของคนนี้' : 'ซ่อนแชทของคนนี้'}
        </button>
        <span class="ol-meta">สาธุให้กัน ได้บุญทั้งสองฝ่าย 🙏</span>
      </div>
    </Window>
  )
}
