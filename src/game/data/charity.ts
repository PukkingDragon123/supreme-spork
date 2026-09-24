// Charity campaigns (กองบุญ). These are sample campaigns for the prototype.
// In production each campaign maps to a verified partner organisation and
// donated coins are converted to real donations (see README).

export interface Campaign {
  id: string
  name: string
  org: string
  desc: string
  goal: number
  /** Community progress at the start of the campaign (simulated). */
  base: number
  /** Community coins added per hour (simulated). */
  rate: number
  icon: string
  color: string
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'c_dogs',
    name: 'ข้าวอิ่มท้องน้องหมาจร',
    org: 'โครงการตัวอย่าง: ศูนย์พักพิงสัตว์',
    desc: 'ทุก 50 คอยน์ ช่วยซื้ออาหารให้น้องหมาจรได้ 1 มื้อ',
    goal: 50000,
    base: 31240,
    rate: 38,
    icon: 'dog',
    color: '#e0a868',
  },
  {
    id: 'c_school',
    name: 'ทุนการศึกษาน้องบนดอย',
    org: 'โครงการตัวอย่าง: ทุนการศึกษาชนบท',
    desc: 'ร่วมซื้อชุดนักเรียน สมุด ดินสอ ให้น้อง ๆ บนดอย',
    goal: 80000,
    base: 45210,
    rate: 52,
    icon: 'book',
    color: '#7fc4ff',
  },
  {
    id: 'c_forest',
    name: 'ปลูกป่าต้นน้ำ',
    org: 'โครงการตัวอย่าง: อนุรักษ์ป่าต้นน้ำ',
    desc: 'ทุก 100 คอยน์ ร่วมปลูกต้นไม้ 1 ต้น คืนความชุ่มชื้นให้ผืนป่า',
    goal: 60000,
    base: 18950,
    rate: 44,
    icon: 'tree',
    color: '#6cc36a',
  },
  {
    id: 'c_hospital',
    name: 'ข้าวกล่องผู้ป่วยยากไร้',
    org: 'โครงการตัวอย่าง: โรงพยาบาลชุมชน',
    desc: 'มอบอาหารให้ผู้ป่วยและญาติที่มาจากต่างจังหวัด',
    goal: 40000,
    base: 27700,
    rate: 30,
    icon: 'rice',
    color: '#ff9fc0',
  },
]
