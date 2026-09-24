// Places you can visit. New areas unlock by level or with Boon Coins.

export type AreaId = 'home' | 'shrine' | 'river' | 'mountain'

export interface Area {
  id: AreaId
  name: string
  subtitle: string
  desc: string
  unlockLevel: number
  unlockPrice: number
  meritBonus: number
  activities: string[]
}

export const AREAS: Area[] = [
  {
    id: 'home',
    name: 'วัดศรีบุญดี',
    subtitle: 'วัดใกล้บ้าน',
    desc: 'วัดอบอุ่นประจำชุมชน มีน้องหมาวัด บ่อปลาคาร์ฟ และต้นตะเคียนศักดิ์สิทธิ์',
    unlockLevel: 1,
    unlockPrice: 0,
    meritBonus: 1,
    activities: ['ตักบาตร', 'สวดมนต์', 'ขอพร', 'ตักน้ำมนต์', 'ขูดเลข', 'ให้อาหารปลา', 'ให้อาหารหมา', 'ตีระฆัง', 'ปิดทอง'],
  },
  {
    id: 'shrine',
    name: 'ลานเทพรวมใจ',
    subtitle: 'ศาลเทพ 4 องค์',
    desc: 'ไหว้พระพิฆเนศ พระพรหม เจ้าแม่กวนอิม และพระแม่ลักษมี รับพรเสริมดวง',
    unlockLevel: 3,
    unlockPrice: 120,
    meritBonus: 1,
    activities: ['ไหว้พระพิฆเนศ', 'ไหว้พระพรหม', 'ไหว้เจ้าแม่กวนอิม', 'ไหว้พระแม่ลักษมี'],
  },
  {
    id: 'river',
    name: 'วัดริมน้ำ',
    subtitle: 'ตักบาตรทางเรือ',
    desc: 'วัดเก่าริมแม่น้ำ ตักบาตรพระที่พายเรือมา ให้อาหารปลาสวาย และลอยกระทงขอพร',
    unlockLevel: 6,
    unlockPrice: 350,
    meritBonus: 1.1,
    activities: ['ตักบาตรทางเรือ', 'ให้อาหารปลาสวาย', 'ลอยกระทง'],
  },
  {
    id: 'mountain',
    name: 'วัดบนดอย',
    subtitle: 'เจดีย์ทองกลางหมอก',
    desc: 'ขึ้นบันไดนาคสู่เจดีย์ทองบนยอดดอย เวียนเทียน ไหว้พญานาค และนั่งสมาธิชมทะเลหมอก',
    unlockLevel: 10,
    unlockPrice: 700,
    meritBonus: 1.2,
    activities: ['เวียนเทียน', 'ไหว้พญานาค', 'ตีระฆังใหญ่', 'สมาธิชมหมอก'],
  },
]

export const AREA_BY_ID: Record<AreaId, Area> = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>
