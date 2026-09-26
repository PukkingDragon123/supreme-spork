// What each world hotspot lets you do.

import { openActivity, openShop, openSocial, mapOpen } from './store'

export interface HotspotAction {
  label: string
  icon: string
  tone?: string
  run: () => void
}

export function hotspotActions(id: string): HotspotAction[] {
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
      return [{ label: 'เข้าโบสถ์กราบพระ', icon: 'temple', run: () => openActivity('hall', { area: id === 'hall_mountain' ? 'mountain' : 'wat' }) }]
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
