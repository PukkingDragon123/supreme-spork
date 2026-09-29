// Room switcher for the home: a wooden plate with ◀ ▶ arrows, a door wipe
// between rooms, and the "ห้องในบ้าน" window with previews, locks and unlocks.

import { useMemo, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { bake, Surface } from '../../engine/pixel'
import { drawRoomStill } from '../../scenes/house'
import { roomLayout, ROOM_ORDER, viewRoom, type HouseState } from '../../game/house'
import { ROOM_BY_ID, type RoomId } from '../../game/data/rooms'
import { REGION_BY_ID } from '../../game/data/places'
import { homeRoom, roomStatus } from '../../game/homeland'
import { unlockRoomNow } from '../../game/homelandActions'
import { currentPhase } from '../../scenes/sky'
import { PBtn, Window } from '../components/kit'
import { Coin, Icon } from '../components/common'
import { PT, TONE_TEXT } from '../pixeltext'
import { ProvincePicker } from './ProvincePicker'
import { sfx } from '../../engine/audio'
import './homeland.css'

const previewCache = new Map<string, string>()

/** Data URL still of a room (the saved layout, or its starter layout if never opened). */
export function roomPreview(h: HouseState, id: RoomId, w = 172, hgt = 192): string {
  const lay = roomLayout(h, id)
  const night = ['dusk', 'night'].includes(currentPhase())
  const key = `${id}|${night ? 1 : 0}|${lay ? JSON.stringify(lay) : 'starter'}`
  let url = previewCache.get(key)
  if (!url) {
    const c = bake(w, hgt, (g: Surface) => drawRoomStill(g, w, hgt, viewRoom(h, id), { night }))
    url = c.toDataURL()
    if (previewCache.size > 40) previewCache.clear()
    previewCache.set(key, url)
  }
  return url
}

/** Rooms the player can walk into, in switcher order. */
export function usableRooms(): RoomId[] {
  const s = game.value
  return ROOM_ORDER.filter((id) => roomStatus(s, id).owned)
}

/** ◀ ห้องนอน ▶ plate. */
export function RoomBar({ onGo, onOpenList }: { onGo: (id: RoomId) => void; onOpenList: () => void }) {
  const s = game.value
  const rooms = usableRooms()
  const cur = s.house.room
  const i = Math.max(0, rooms.indexOf(cur))
  const step = (d: number) => {
    if (rooms.length < 2) {
      sfx.tap()
      onOpenList()
      return
    }
    onGo(rooms[(i + d + rooms.length) % rooms.length])
  }
  const locked = ROOM_ORDER.filter((id) => !roomStatus(s, id).owned)
  // Badge only rooms that are free to claim right now (home region, rank, level).
  const ready = locked.filter((id) => {
    const st = roomStatus(s, id)
    return st.canUnlock && st.price === 0
  }).length
  const def = ROOM_BY_ID[cur]
  return (
    <div class="hl-roombar" style={{ ['--hl-c' as string]: def.color }}>
      <button class="hl-arrow" aria-label="ห้องก่อนหน้า" onClick={() => step(-1)}>
        <span class="hl-tri l" />
      </button>
      <button class="hl-roomname" onClick={() => (sfx.open(), onOpenList())} aria-label={`ห้องตอนนี้ ${def.name} แตะเพื่อดูห้องทั้งหมด`}>
        <Icon name="door" size={18} />
        <PT text={def.short} size={12} weight={600} color="#fff6dc" shadow="#3b2616" />
        <span class="hl-roomcount num">
          {rooms.indexOf(cur) + 1}/{rooms.length}
        </span>
        {ready > 0 && <span class="badge num hl-ready">{ready}</span>}
      </button>
      <button class="hl-arrow" aria-label="ห้องถัดไป" onClick={() => step(1)}>
        <span class="hl-tri r" />
      </button>
    </div>
  )
}

/** Two teak door leaves that close over the screen and open on the new room. */
export function DoorWipe({ phase, label }: { phase: 'closing' | 'opening' | null; label: string }) {
  if (!phase) return null
  return (
    <div class={`hl-door ${phase}`} aria-hidden="true">
      <span class="hl-leaf l" />
      <span class="hl-leaf r" />
      <span class="hl-door-label">
        <PT text={label} size={15} weight={600} color="#fff6dc" shadow="#3b2616" />
      </span>
    </div>
  )
}

function RoomCard({ id, onGo, onPickProvince }: { id: RoomId; onGo: (id: RoomId) => void; onPickProvince: () => void }) {
  const s = game.value
  const def = ROOM_BY_ID[id]
  const st = roomStatus(s, id)
  const here = s.house.room === id
  const url = useMemo(() => roomPreview(s.house, id), [id, st.owned, s.house.room === id ? JSON.stringify(s.house.placed) + s.house.wallpaper + s.house.floor : JSON.stringify(s.house.rooms[id] ?? null)])
  const isHome = homeRoom(s) === id
  const noHome = !s.homeland.province && !!def.region
  const unlock = () => {
    if (unlockRoomNow(id)) {
      sfx.purchase()
      onGo(id)
    } else sfx.error()
  }
  return (
    <div class={`panel hl-room ${st.owned ? '' : 'locked'} ${here ? 'here' : ''}`} style={{ ['--hl-c' as string]: def.color }}>
      <div class="hl-room-img">
        <img class="px" src={url} alt={`ตัวอย่าง${def.name}`} />
        {!st.owned && (
          <span class="hl-room-lock">
            <Icon name="lock" size={22} />
          </span>
        )}
        {def.region && <span class="hl-room-region">{REGION_BY_ID[def.region].name}</span>}
        {isHome && <span class="hl-room-home">บ้านเกิด · ฟรี</span>}
      </div>
      <b class="hl-room-name">{def.name}</b>
      <span class="small muted hl-room-desc">{def.desc}</span>
      {st.owned ? (
        here ? (
          <span class="chip green small hl-room-here">อยู่ห้องนี้</span>
        ) : (
          <PBtn tone="green" size="small" icon="door" onClick={() => onGo(id)}>
            เข้าห้อง
          </PBtn>
        )
      ) : (
        <>
          <ul class="hl-reqs">
            {st.reqs.map((r) => (
              <li key={r.text} class={r.met ? 'met' : ''}>
                <Icon name={r.met ? 'check' : 'lock'} size={12} /> {r.text}
              </li>
            ))}
          </ul>
          {noHome && (
            <button class="hl-link small" onClick={() => (sfx.open(), onPickProvince())}>
              หรือเลือกบ้านเกิด{def.region ? REGION_BY_ID[def.region].name : ''} รับห้องนี้ฟรี ▸
            </button>
          )}
          {st.canUnlock && st.price > 0 ? (
            <PBtn tone="gold" size="small" icon="key" onClick={unlock} aria-label={`ปลดล็อก ${st.price} คอยน์`}>
              <Coin n={st.price} size={16} />
            </PBtn>
          ) : (
            <PBtn tone={st.canUnlock ? 'gold' : 'paper'} size="small" icon={st.canUnlock ? 'gift' : 'lock'} disabled={!st.canUnlock} onClick={unlock}>
              {st.canUnlock ? 'รับฟรี!' : 'ล็อกอยู่'}
            </PBtn>
          )}
        </>
      )}
    </div>
  )
}

export function RoomsWindow({ onClose, onGo }: { onClose: () => void; onGo: (id: RoomId) => void }) {
  const [picking, setPicking] = useState(false)
  const s = game.value
  const owned = ROOM_ORDER.filter((id) => roomStatus(s, id).owned).length
  if (picking) return <ProvincePicker onClose={() => setPicking(false)} />
  return (
    <Window title="ห้องในบ้าน" icon="home" onClose={onClose} wide class="hl-rooms-win">
      <div class="row hl-rooms-head">
        <PT text={`มีแล้ว ${owned}/${ROOM_ORDER.length} ห้อง`} size={12} {...TONE_TEXT.ink} />
        <span class="grow" />
        <span class="small muted">ของในคลังใช้ได้ทุกห้อง</span>
      </div>
      <div class="hl-rooms">
        {ROOM_ORDER.map((id) => (
          <RoomCard key={id} id={id} onGo={(r) => (onClose(), onGo(r))} onPickProvince={() => setPicking(true)} />
        ))}
      </div>
    </Window>
  )
}
