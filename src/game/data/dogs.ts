// The temple dogs (หมาวัด) you can befriend.

import type { AreaId } from './areas'

export interface DogDef {
  id: string
  name: string
  coat: string
  area: AreaId
  about: string
}

export const DOGS: DogDef[] = [
  { id: 'somo', name: 'ส้มโอ', coat: 'tan', area: 'wat', about: 'ขี้อ้อนที่สุดในวัด ชอบนอนใต้ศาลา' },
  { id: 'thuadam', name: 'ถั่วดำ', coat: 'black', area: 'wat', about: 'ยามเฝ้าประตูวัด ใจดีแต่หน้าดุ' },
  { id: 'mali', name: 'มะลิ', coat: 'white', area: 'wat', about: 'สาวน้อยขาวสะอาด ชอบเดินตามเณร' },
  { id: 'khanom', name: 'ขนมปัง', coat: 'cream', area: 'shrine', about: 'ชอบนั่งเฝ้าศาลเทพ รอขนมตก' },
  { id: 'dang', name: 'เจ้าด่าง', coat: 'spotted', area: 'river', about: 'นักว่ายน้ำตัวยงแห่งวัดริมน้ำ' },
  { id: 'cocoa', name: 'โกโก้', coat: 'brown', area: 'mountain', about: 'ขาแข็งแรง ขึ้นบันไดนาคเก่งที่สุด' },
]

export const DOG_BY_ID: Record<string, DogDef> = Object.fromEntries(DOGS.map((d) => [d.id, d]))

/** Hearts are stored 0..10 and shown as five hearts. */
export const MAX_HEARTS = 10
