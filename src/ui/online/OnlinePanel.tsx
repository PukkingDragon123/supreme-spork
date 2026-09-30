// "ออนไลน์ตอนนี้": who is really online and where (with ไปหา / ทักทาย),
// friends met online, the honest note about the simulated crowd, and
// privacy switches.

import { game, mutate } from '../../game/state'
import { presence } from '../../services/presence'
import { net, type NetPlayer } from '../../services/net'
import { netBoot } from '../../services/netInit'
import { toast } from '../../game/events'
import { sfx } from '../../engine/audio'
import { mode } from '../store'
import { worldScene } from '../TempleView'
import { Check, PBtn, Window } from '../components/kit'
import { Portrait } from '../components/common'
import { TOPIC_LABEL, goToPlayerMap, mapLabel, sendWave } from './onlineHub'
import { cardPeer, netSummary, onlinePanelOpen } from './onlineStore'
import { NIcon } from './netIcons'
import { pillText } from './OnlinePill'
import './online.css'

function transportNote(kind: string, status: string): string {
  if (kind === 'room')
    return status === 'error'
      ? 'หน้านี้เชื่อมห้องออนไลน์ไม่ได้ เล่นต่อแบบคนเดียวได้ตามปกติ'
      : 'เห็นเฉพาะคนที่เปิดเกมนี้อยู่ตอนนี้ และเข้ามาได้เฉพาะคนที่เจ้าของเกมแชร์ให้ (คนในทีมและแขกที่ได้รับเชิญ)'
  if (kind === 'realtime') return 'ผู้เล่นจริงที่เปิดเกมนี้อยู่ตอนนี้ ชื่อที่เห็นเป็นชื่อเล่นที่แต่ละคนตั้งเอง'
  return netBoot.value === 'probing'
    ? 'กำลังหาห้องออนไลน์…'
    : 'ตอนนี้เล่นแบบออฟไลน์ ยังไม่มีผู้เล่นจริงให้เจอ · เปิดเกมจากลิงก์ที่แชร์ไว้พร้อมเพื่อน แล้วจะเห็นกันในวัด'
}

function Row({ p, here }: { p: NetPlayer; here: boolean }) {
  const go = () => {
    const r = goToPlayerMap(p.map)
    if (r === 'ok') onlinePanelOpen.value = false
    else if (r === 'locked') {
      sfx.error()
      toast(`ยังไป${mapLabel(p.map)}ไม่ได้ ต้องปลดล็อกก่อนนะ`, 'lock', 'warn')
    } else if (r === 'unknown') toast('ตามไปที่นั่นไม่ได้', 'map', 'warn')
  }
  return (
    <div class="panel card ol-row">
      <button
        class="ol-row-who"
        onClick={() => {
          if (!here) return
          sfx.open()
          cardPeer.value = p.id
        }}
        aria-label={here ? `ดูการ์ดของ${p.name}` : p.name}
      >
        <Portrait look={p.look} size={36} />
        <span class="col ol-row-text">
          <b>
            {p.name} <span class="ol-lv num">Lv.{p.level}</span>
          </b>
          {p.accountName && <span class="ol-meta">บัญชี: {p.accountName}</span>}
          <span class="ol-meta">
            {here ? 'อยู่ที่นี่' : p.map ? mapLabel(p.map) : p.doing ?? mapLabel(p.map)}
            {p.doing && p.map ? ` · ${p.doing}` : ''}
            {p.guest ? ' · แขกรับเชิญ' : ''}
          </span>
        </span>
      </button>
      {here ? (
        <PBtn tone="paper" size="small" onClick={() => (sfx.open(), (cardPeer.value = p.id))}>
          การ์ด
        </PBtn>
      ) : (
        <div class="col ol-row-btns">
          <PBtn tone="green" size="small" icon="map" iconSize={14} disabled={!p.map} onClick={go}>
            ไปหา
          </PBtn>
          <button class="ol-link" onClick={() => sendWave(p.id)}>
            <NIcon name="wave" size={14} /> ทักทาย
          </button>
        </div>
      )}
    </div>
  )
}

export function OnlinePanel() {
  const n = netSummary.value
  void n.rev
  const s = game.value
  const sc = mode.value === 'world' ? worldScene() : null
  const myMap = sc?.map.id ?? ''
  const everyone = net.everyone().sort((a, b) => Number(b.map === myMap) - Number(a.map === myMap) || a.name.localeCompare(b.name, 'th'))
  const pill = pillText()
  const sim = sc ? presence().playersOn(sc.map.id, { code: s.player.friendCode, friends: s.social.friends }).length : 0
  const shownSim = sc ? sc.nameTags().filter((t) => !t.real).length : 0
  const realHere = everyone.some((p) => !!myMap && p.map === myMap)
  const friends = s.online.friends
  const onlineCodes = new Map(everyone.filter((p) => p.friendCode).map((p) => [p.friendCode!, p]))
  const close = () => (onlinePanelOpen.value = false)
  return (
    <Window title="ออนไลน์ตอนนี้" icon="friends" onClose={close} class="ol-win ol-panel-win">
      <div class={`ol-status dot-${pill.dot}`}>
        <i class="ol-dot" />
        <div class="col grow" style={{ gap: '0' }}>
          <b>{pill.text}</b>
          <span class="small">{transportNote(n.kind, n.status)}</span>
        </div>
      </div>
      {n.denied.length > 0 && (
        <p class="small ol-warn">คุณดูได้อย่างเดียวสำหรับ{n.denied.map((t) => TOPIC_LABEL[t as keyof typeof TOPIC_LABEL] ?? t).join(' ')} (เจ้าของเกมเปิดสิทธิ์ให้ได้)</p>
      )}

      <h3 class="ol-h">
        <NIcon name="online" size={16} /> ผู้เล่นจริง ({everyone.length})
      </h3>
      {!everyone.length && (
        <p class="small muted center ol-empty">{n.kind === 'offline' ? 'ยังไม่มีการเชื่อมต่อออนไลน์' : 'ยังไม่มีใครออนไลน์ ชวนเพื่อนมาเปิดเกมพร้อมกันสิ!'}</p>
      )}
      <div class="list">
        {everyone.map((p) => (
          <Row key={p.id} p={p} here={!!myMap && p.map === myMap} />
        ))}
      </div>

      {friends.length > 0 && (
        <>
          <h3 class="ol-h">
            <NIcon name="friends" size={16} /> เพื่อนที่เจอกันออนไลน์ ({friends.length})
          </h3>
          <div class="ol-friends">
            {friends.map((f) => {
              const on = onlineCodes.get(f.code)
              return (
                <span key={f.code} class={`chip ${on ? 'green' : ''}`}>
                  <i class={`ol-dot ${on ? '' : 'off'}`} /> {on?.name ?? f.name}
                  {on ? ` · ${on.map === myMap ? 'อยู่ที่นี่' : mapLabel(on.map)}` : ' · ออฟไลน์'}
                </span>
              )
            })}
          </div>
        </>
      )}

      <div class="ol-sim">
        <span class="chip small ol-sim-tag">จำลอง</span>
        <span class="small">
          {realHere
            ? `มีผู้เล่นจริงอยู่ที่นี่ เลยลดคนจำลองจาก ${sim} เหลือ ${shownSim} คน`
            : `คนอื่นที่เดินอยู่ในแผนที่นี้ (${shownSim} คน) เป็นผู้เล่นจำลองให้วัดดูคึกคัก ไม่ใช่คนจริง`}
          {' · ป้ายชื่อสีเขียวคือคนจริงเท่านั้น'}
        </span>
      </div>

      <h3 class="ol-h">
        <NIcon name="eye_off" size={16} /> ความเป็นส่วนตัว
      </h3>
      <Check
        label="ให้คนอื่นเห็นฉัน"
        desc="ปิดแล้วจะไม่มีใครเห็นตัว ชื่อ หรือตำแหน่งของคุณ"
        checked={!s.online.hidden}
        onChange={(v) => mutate((d) => void (d.online.hidden = !v))}
      />
      <Check
        label="โชว์บ้านเกิด"
        desc="แสดงจังหวัดบ้านเกิดบนการ์ดผู้เล่นของคุณ"
        checked={s.online.shareProvince}
        onChange={(v) => mutate((d) => void (d.online.shareProvince = v))}
      />
      <Check
        label="แสดงคนอื่น"
        desc="ผู้เล่นคนอื่นในแผนที่ ทั้งคนจริงและคนจำลอง"
        checked={s.settings.showOthers !== false}
        onChange={(v) => mutate((d) => void (d.settings.showOthers = v))}
      />
    </Window>
  )
}
