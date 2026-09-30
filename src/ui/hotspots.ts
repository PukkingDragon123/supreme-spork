// What each world hotspot lets you do.

import { openActivity, openShop, openSocial, mapOpen, openPanel, goHome, openPlaceShop } from './store'
import { openQuestDialog, questChoicesFor } from './quest/questUi'
import { fairHotspotActions } from '../activities/fair/hotspots'

export interface HotspotAction {
  label: string
  icon: string
  tone?: string
  run: () => void
}

export function hotspotActions(id: string): HotspotAction[] {
  // Generic hotspot families used by the place maps.
  if (id.startsWith('job:')) {
    const job = id.slice(4)
    return [{ label: 'รับงานอาสา', icon: 'broom', run: () => openActivity('job', { job }) }]
  }
  if (id.startsWith('shop:')) {
    const shop = id.slice(5)
    return [{ label: 'เข้าร้าน', icon: 'shop', run: () => openPlaceShop(shop) }, ...questChoicesFor(shop).map((c) => ({ label: c.label, icon: c.icon, tone: 'gold', run: c.onPick }))]
  }
  // Quest-giver NPCs (src/game/data/questNpcs.ts).
  if (id.startsWith('npc:')) return [{ label: 'คุยด้วย', icon: 'wai', run: () => openQuestDialog(id) }]
  // Temple fair: booths, rides, shows, food carts (src/activities/fair/hotspots.ts).
  if (id.startsWith('fair:')) return fairHotspotActions(id.slice(5))
  // Beaches: `beach:<game>` mini-games and the photo spot (src/activities/beach).
  if (id.startsWith('beach:')) {
    const game = id.slice(6)
    const label = game === 'photo' ? 'ถ่ายรูป' : game === 'banana' ? 'ขึ้นเรือ' : game === 'snorkel' ? 'ลงดำน้ำ' : game === 'cleanup' ? 'รับงานอาสา' : 'เริ่มเลย'
    return [{ label, icon: game === 'photo' ? 'camera' : 'play', run: () => openActivity('beach', { game }) }]
  }
  // Hub markets: `board:<hubId>` notice boards.
  if (id.startsWith('board:')) return [{ label: 'อ่านบอร์ดข่าวตลาด', icon: 'scroll', run: () => openActivity('hub', { hub: id.slice(6) }) }]
  if (id.startsWith('pray')) return [{ label: 'สวดมนต์', icon: 'pray', run: () => openPanel('pray') }]
  if (id.startsWith('cook')) return [{ label: 'ทำอาหาร', icon: 'bowl', run: () => openActivity('cook') }]
  switch (id) {
    case 'alms':
    case 'boat_alms':
      return [
        { label: 'ตักบาตร', icon: 'bowl', run: () => openActivity('alms', { boat: id === 'boat_alms' }) },
        { label: 'ซื้อของใส่บาตร', icon: 'shop', tone: 'paper', run: () => openShop('alms') },
      ]
    case 'food_stall':
      return [{ label: 'ซื้อของใส่บาตร', icon: 'shop', run: () => openShop('alms') }]
    case 'flower_stall':
      return [
        { label: 'ซื้อของถวาย', icon: 'garland', run: () => openShop('offering') },
        { label: 'อาหารสัตว์', icon: 'fishfood', tone: 'paper', run: () => openShop('animal') },
      ]
    case 'guardian':
      return [{ label: 'ไหว้ท้าวเวสสุวรรณ', icon: 'incense', run: () => openActivity('deity', { deity: 'vessavana' }) }]
    case 'tree':
      return [{ label: 'ขูดเลขมงคล', icon: 'powder', run: () => openActivity('lottery') }]
    case 'pond':
      return [{ label: 'ให้อาหารปลาคาร์ฟ', icon: 'koi', run: () => openActivity('koi') }]
    case 'river_fish':
      return [{ label: 'ให้อาหารปลาสวาย', icon: 'bread', run: () => openActivity('koi', { river: true }) }]
    case 'bells':
      return [{ label: 'ตีระฆัง', icon: 'bell', run: () => openActivity('bells') }]
    case 'big_bell':
      return [{ label: 'ตีระฆังใหญ่', icon: 'bell', run: () => openActivity('bells', { big: true }) }]
    case 'holy_water':
      return [{ label: 'ตักน้ำมนต์', icon: 'vessel', run: () => openActivity('holy_water') }]
    case 'donation':
      return [{ label: 'หยอดตู้ทำบุญ', icon: 'coin', run: () => openActivity('donate') }]
    case 'hall':
    case 'hall_mountain':
      return [
        { label: 'สวดมนต์', icon: 'pray', run: () => openPanel('pray') },
        { label: 'กราบพระ ปิดทอง เซียมซี', icon: 'temple', tone: 'paper', run: () => openActivity('hall', { area: id === 'hall_mountain' ? 'mountain' : 'wat' }) },
      ]
    case 'gate':
      return [
        { label: 'กลับบ้าน', icon: 'home', run: () => goHome() },
        { label: 'ไปวัดอื่น', icon: 'map', tone: 'paper', run: () => (mapOpen.value = true) },
      ]
    case 'incense':
      return [{ label: 'จุดธูปขอพร', icon: 'incense', run: () => openActivity('wish', { place: 'incense' }) }]
    case 'sala':
      return [
        { label: 'กลุ่มทำบุญ', icon: 'group', run: () => openSocial('groups') },
        { label: 'กองบุญการกุศล', icon: 'charity', tone: 'pink', run: () => openSocial('charity') },
      ]
    case 'sign':
      return [{ label: 'ดูแผนที่', icon: 'map', run: () => (mapOpen.value = true) }]
    case 'krathong':
      return [{ label: 'ลอยกระทง', icon: 'krathong', run: () => openActivity('krathong') }]
    case 'chedi':
      return [{ label: 'เวียนเทียนรอบเจดีย์', icon: 'sparkle', run: () => openActivity('circle') }]
    case 'view':
      return [{ label: 'นั่งสมาธิชมหมอก', icon: 'meditate', run: () => openActivity('meditate', { place: 'mountain' }) }]
    case 'ganesha':
    case 'brahma':
    case 'guanyin':
    case 'lakshmi':
    case 'naga':
      return [{ label: 'ไหว้ขอพร', icon: 'incense', run: () => openActivity('deity', { deity: id }) }]
  }
  return []
}
