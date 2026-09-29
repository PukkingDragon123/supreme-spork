// Actions for the home province, rooms and temple ranks (state changes,
// rewards, toasts). The rules they apply live in homeland.ts.

import { game, mutate } from './state'
import { addCoins, grantMeritRaw, onTrack, spendCoins } from './actions'
import { notify, toast } from './events'
import { addToStorage, switchRoom, unlockRoom } from './house'
import { canClaimRank, freeRooms, homeRoom, moveCost, rankReward, roomStatus, templeDone, templeKinds } from './homeland'
import { PROVINCE_BY_ID } from './data/provinces'
import { PLACE_BY_ID } from './data/places'
import { RANK_BY_PLACE, TEMPLE_ACTIONS, TEMPLE_DONE_KINDS, TIER_BY_ID } from './data/ranks'
import { ROOM_BY_ID, type RoomId } from './data/rooms'
import { FURNITURE_BY_ID } from './data/furniture'

/**
 * Choose (or move) the home province. The first pick is free, later moves
 * cost MOVE_COST coins. Returns false when it could not be paid.
 */
export function setProvince(id: string): boolean {
  const p = PROVINCE_BY_ID[id]
  if (!p) return false
  const s = game.value
  if (s.homeland.province === id) return true
  const cost = moveCost(s, id)
  if (cost > 0 && !spendCoins(cost)) return false
  const before = homeRoom(s)
  mutate((d) => {
    if (d.homeland.province) d.homeland.moves++
    d.homeland.province = id
  })
  const room = homeRoom(game.value)
  // Standing in a room that was only free for the old home? Walk back to the bedroom.
  const h = game.value.house
  if (h.room !== 'bedroom' && !roomStatus(game.value, h.room).owned) {
    mutate((d) => {
      d.house = switchRoom(d.house, 'bedroom')
    })
  }
  if (room && room !== before) toast(`ปลดล็อก${ROOM_BY_ID[room].name}ฟรี! ห้องบ้านเกิดของคุณ`, 'home')
  return true
}

/** Unlock a room: free (home region / region rank) or pay its coins. */
export function unlockRoomNow(id: RoomId): boolean {
  const st = roomStatus(game.value, id)
  if (st.owned) return true
  if (!st.canUnlock) return false
  if (st.price > 0 && !spendCoins(st.price)) return false
  mutate((d) => {
    d.house = unlockRoom(d.house, id)
  })
  toast(`ได้ห้องใหม่: ${ROOM_BY_ID[id].name}!`, 'home')
  return true
}

/** Walk into a room the player can use. */
export function enterRoom(id: RoomId): boolean {
  const s = game.value
  if (s.house.room === id) return true
  if (!roomStatus(s, id).owned) return false
  mutate((d) => {
    d.house = switchRoom(d.house, id, freeRooms(d))
  })
  return game.value.house.room === id
}

/** Claim a completed temple's rank reward (coins, merit and regional furniture). */
export function claimRank(placeId: string): boolean {
  const s = game.value
  const entry = RANK_BY_PLACE[placeId]
  if (!entry || !canClaimRank(s, placeId)) return false
  const r = rankReward(entry)
  mutate((d) => {
    d.homeland.claimed.push(placeId)
    for (const f of r.furniture) if (FURNITURE_BY_ID[f]) d.house = addToStorage(d.house, f)
  })
  const coins = addCoins(r.coins)
  const merit = grantMeritRaw(r.merit)
  const names = r.furniture.map((f) => FURNITURE_BY_ID[f]?.name).filter(Boolean)
  notify({
    kind: 'reward',
    title: `แรงก์ ${entry.tier} · ${PLACE_BY_ID[placeId]?.name ?? ''}`,
    merit,
    coins,
    note: names.length ? `ได้เฟอร์นิเจอร์: ${names.join(', ')} (อยู่ในคลังบ้าน)` : TIER_BY_ID[entry.tier].name,
  })
  return true
}

const ACTIONS = new Set<string>(TEMPLE_ACTIONS)

/**
 * Count merit made at ranked temples. `atPlace` says whether the player is
 * really at `places.current` (not praying at home). Call once at start-up.
 */
export function installHomelandTracking(atPlace: () => boolean): () => void {
  return onTrack((event) => {
    if (!ACTIONS.has(event) || !atPlace()) return
    const s = game.value
    const cur = s.places.current
    if (!cur || !RANK_BY_PLACE[cur]) return
    const kinds = templeKinds(s, cur)
    if (kinds.includes(event)) return
    const wasDone = templeDone(s, cur)
    mutate((d) => {
      d.homeland.temples[cur] = [...kinds, event]
    })
    const name = PLACE_BY_ID[cur]?.name ?? ''
    if (!wasDone && templeDone(game.value, cur)) toast(`ทำบุญครบที่${name}แล้ว! รับรางวัลแรงก์ได้ที่แผนที่ ▸ อันดับวัด`, 'star')
    else if (kinds.length + 1 < TEMPLE_DONE_KINDS) toast(`${name} ทำบุญแล้ว ${kinds.length + 1}/${TEMPLE_DONE_KINDS} แบบ`, 'temple', 'info')
  })
}
