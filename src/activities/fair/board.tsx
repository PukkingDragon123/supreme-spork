// บอร์ดข่าวตลาด – the hub notice board (activity 'hub', hotspot
// `board:<hubId>`): who's here now, today's pick of the stalls, the quest
// givers, the schedule (Maeklong shows the next train live), the simulated
// "who's looking for what" feed and the market passport stamps.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { claimPassport, FAIR_GAMES, FAIR_GAME_IDS, FAIR_ID, HUB_IDS, HUB_META, hubCrowd, hubFeed, hubPick, passportStamps, PASSPORT_REWARD } from '../../game/hubs'
import { HUB_QUESTS } from '../../game/data/npcQuests/hubs'
import { presence } from '../../services/presence'
import { closeActivity, openActivity, mapId, type ActivityRequest } from '../../ui/store'
import { travelTo } from '../../ui/TempleView'
import { PBtn, Window } from '../../ui/components/kit'
import { Coin, Icon, useTicker } from '../../ui/components/common'
import { spriteDataUrl } from '../../engine/sprite'
import { sfx } from '../../engine/audio'
import { MK_TRAIN } from '../../scenes/maps/places/hub-maeklong'
import { stampSprite } from './art'
import { TicketIcon } from './shell'

const STAMP_ICON: Record<string, 'jj' | 'dn' | 'mk' | 'tp' | 'ky' | 'ic'> = {
  hub_chatuchak: 'jj',
  hub_damnoen: 'dn',
  hub_maeklong: 'mk',
  hub_thaphae: 'tp',
  hub_kimyong: 'ky',
  hub_indochina: 'ic',
}

/** Close the board and walk to a hotspot on this map (opens it on arrival). */
function go(hotspot: string) {
  sfx.tap()
  closeActivity()
  setTimeout(() => travelTo(hotspot), 30)
}

function TrainLine() {
  useTicker(1000)
  const p = MK_TRAIN.phase
  const txt =
    p === 'in' ? 'รถไฟกำลังวิ่งผ่านตลาด! หุบร่ม~' : p === 'dwell' ? 'รถไฟจอดที่สถานี เดี๋ยวออกแล้ว' : p === 'out' ? 'รถไฟกำลังออกจากตลาด' : `รถไฟขบวนถัดไปอีก ~${Math.max(1, Math.ceil(MK_TRAIN.eta))} วินาที`
  return <div class="fairx-train">🚆 {txt}</div>
}

export function HubBoard({ req }: { req: ActivityRequest }) {
  const id = String(req.params?.hub ?? mapId.value)
  const meta = HUB_META[id]
  const [, bump] = useState(0)
  const s = game.value
  if (!meta) {
    return (
      <Window title="บอร์ดข่าว" icon="scroll" onClose={closeActivity}>
        <p class="goal-main">ยังไม่มีข่าวจากที่นี่</p>
      </Window>
    )
  }
  const here = mapId.value === id
  const onMap = here ? presence().playersOn(id, { code: s.player.friendCode, friends: s.social.friends }).length : 0
  const online = presence().onlineCount()
  // Everyone near you (and you) is part of the market's crowd.
  const crowd = Math.max(hubCrowd(id, Date.now(), online), onMap + 1)
  const pick = hubPick(id)
  const feed = hubFeed(id)
  const stamps = passportStamps(s)
  const isFair = id === FAIR_ID
  return (
    <Window title={`บอร์ดข่าว${meta.short}`} icon="scroll" onClose={closeActivity} wide>
      <div class="fairx-board">
        <div class="panel fairx-sec">
          <div class="small">
            <b>{meta.name}</b> · {meta.province}
          </div>
          <div class="small">{meta.blurb}</div>
          <div class="fairx-live" style={{ marginTop: '6px' }}>
            <span class="chip small">
              <span class="fairx-dot" /> {isFair ? 'คนในงาน' : 'คนในตลาด'}ราว {crowd.toLocaleString('th-TH')} คน
            </span>
            {here && <span class="chip small">ใกล้ ๆ คุณ {onMap} คน</span>}
            <span class="chip small">ออนไลน์ทั้งเกม {online.toLocaleString('th-TH')}</span>
          </div>
        </div>

        {pick && !isFair && (
          <div class="panel fairx-sec">
            <h4>
              <Icon name="star" size={16} /> ร้านเด่นวันนี้
            </h4>
            <div class="fairx-item">
              <span class="grow small">{pick.text}</span>
              {here && (
                <PBtn tone="gold" size="small" icon="shop" onClick={() => go(pick.shop)}>
                  ไปที่ร้าน
                </PBtn>
              )}
            </div>
          </div>
        )}

        {isFair && (
          <div class="panel fairx-sec">
            <h4>
              <TicketIcon size={14} /> ตั๋วของฉัน {s.hubs.tickets} ใบ
            </h4>
            <div class="fairx-list">
              {FAIR_GAME_IDS.map((g) => (
                <div class="fairx-item" key={g}>
                  <Icon name={FAIR_GAMES[g].icon} size={18} />
                  <span class="grow small">
                    {FAIR_GAMES[g].name} · สถิติ {s.hubs.best[g] ?? 0} คะแนน
                  </span>
                  <PBtn tone="paper" size="small" onClick={() => (here ? go(`fair:${g}`) : openActivity('fair', { game: g }))}>
                    เล่น
                  </PBtn>
                </div>
              ))}
              <div class="fairx-item">
                <Icon name="gift" size={18} />
                <span class="grow small">ซุ้มแลกของรางวัล</span>
                <PBtn tone="gold" size="small" onClick={() => (here ? go('fair:prizes') : openActivity('fair', { booth: 'prizes' }))}>
                  ไปแลก
                </PBtn>
              </div>
            </div>
          </div>
        )}

        <div class="panel fairx-sec">
          <h4>
            <Icon name="friends" size={16} /> {isFair ? 'คนในงานที่ขอให้ช่วย' : 'คนในตลาดที่ขอให้ช่วย'}
          </h4>
          <div class="fairx-list">
            {meta.npcs.map((n) => {
              const q = HUB_QUESTS.find((x) => x.giver === n.id)
              return (
                <div class="fairx-item" key={n.id}>
                  <span class="grow small">
                    <b>{n.name}</b> · {n.role}
                    {q && <div class="muted">“{q.title}”</div>}
                  </span>
                  {here && (
                    <PBtn tone="paper" size="small" onClick={() => go(n.id)}>
                      ไปหา
                    </PBtn>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div class="panel fairx-sec">
          <h4>
            <Icon name="calendar" size={16} /> {isFair ? 'ตารางการแสดงคืนนี้' : 'เวลาเปิด–ปิด & กิจกรรม'}
          </h4>
          {id === 'hub_maeklong' && <TrainLine />}
          <div class="fairx-list">
            {meta.schedule.map((e) => (
              <div class="fairx-item small" key={e.time + e.text}>
                <b style={{ minWidth: '96px' }}>{e.time}</b>
                <span class="grow">{e.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div class="panel fairx-sec">
          <h4>
            <Icon name="mail" size={16} /> ใครตามหาอะไร
          </h4>
          <div class="fairx-feed">
            {feed.map((p, i) => (
              <div class="fairx-post" key={i}>
                <b>{p.name}</b> <span class="muted">Lv.{p.level} · {p.ago} นาทีก่อน</span>
                <div>{p.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div class="panel fairx-sec">
          <h4>
            <Icon name="map" size={16} /> พาสปอร์ตตลาดดัง {stamps}/{HUB_IDS.length}
          </h4>
          <div class="fairx-stamps">
            {HUB_IDS.map((h) => {
              const on = s.hubs.visited.includes(h)
              return (
                <div key={h}>
                  <img src={spriteDataUrl(stampSprite(STAMP_ICON[h], on), 2)} alt="" width={40} height={40} />
                  <div class="fairx-stamp-name">{HUB_META[h].short}</div>
                </div>
              )
            })}
          </div>
          {s.hubs.passport ? (
            <div class="small center" style={{ marginTop: '6px' }}>
              ได้พาสปอร์ตนักช้อปทองคำแล้ว ✓
            </div>
          ) : stamps >= HUB_IDS.length ? (
            <PBtn
              tone="gold"
              block
              icon="gift"
              onClick={() => {
                if (claimPassport()) {
                  sfx.levelUp()
                  bump((n) => n + 1)
                }
              }}
            >
              รับรางวัลพาสปอร์ต
            </PBtn>
          ) : (
            <div class="small muted center" style={{ marginTop: '6px' }}>
              ไปให้ครบหกตลาด รับ <Coin n={PASSPORT_REWARD.coins} size={13} /> + <TicketIcon size={11} /> {PASSPORT_REWARD.tickets} + พาสปอร์ตทองคำ
            </div>
          )}
        </div>
        <div class="fairx-note">จำนวนคนและข้อความบนบอร์ดเป็นการจำลองในเครื่อง (เวอร์ชันทดลอง) ยังไม่ได้เชื่อมต่อผู้เล่นจริง</div>
      </div>
    </Window>
  )
}
