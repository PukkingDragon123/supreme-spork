// Daily quests and achievements. Progress is driven by activity events.

export type GameEvent =
  | 'alms'
  | 'alms_item'
  | 'chant'
  | 'meditate_sec'
  | 'koi_fed'
  | 'dog_fed'
  | 'dog_pet'
  | 'bell'
  | 'bell_round'
  | 'wish'
  | 'siamsi'
  | 'deity'
  | 'holy_water'
  | 'lottery'
  | 'gold_leaf'
  | 'gold_back'
  | 'donate'
  | 'dedicate'
  | 'sathu'
  | 'charity'
  | 'krathong'
  | 'circle_chedi'
  | 'catfish_fed'
  | 'login'
  | 'ad'
  | 'group_merit'
  | 'job'
  | 'cook'
  // v4 systems (shared by NPC quests, stalls, events)
  | 'place_visit'
  | 'npc_talk'
  | 'npc_quest'
  | 'stall_buy'
  | 'collectible'
  | 'trade'
  | 'dish_alms'
  | 'prayer_pass'
  | 'flood_run'
  | 'flood_rescue'
  | 'fair_game'
  | 'hub_visit'

export interface QuestDef {
  id: string
  text: string
  event: GameEvent
  target: number
  coins: number
  merit: number
  /** Minimum level before this quest can be rolled. */
  level?: number
  area?: string
}

export const QUEST_POOL: QuestDef[] = [
  { id: 'q_alms', text: 'ตักบาตรพระ 1 รอบ', event: 'alms', target: 1, coins: 15, merit: 10 },
  { id: 'q_job', text: 'ทำงานอาสาในวัด 1 งาน', event: 'job', target: 1, coins: 10, merit: 5 },
  { id: 'q_job2', text: 'ทำงานอาสาในวัด 3 งาน', event: 'job', target: 3, coins: 20, merit: 10, level: 3 },
  { id: 'q_chant', text: 'สวดมนต์ 1 บท', event: 'chant', target: 1, coins: 10, merit: 5 },
  { id: 'q_chant2', text: 'สวดมนต์ 2 บท', event: 'chant', target: 2, coins: 15, merit: 8, level: 3 },
  { id: 'q_meditate', text: 'นั่งสมาธิรวม 1 นาที', event: 'meditate_sec', target: 60, coins: 12, merit: 6 },
  { id: 'q_koi', text: 'ให้อาหารปลาคาร์ฟ 10 เม็ด', event: 'koi_fed', target: 10, coins: 10, merit: 5 },
  { id: 'q_dog', text: 'ให้อาหารน้องหมาวัด 2 ครั้ง', event: 'dog_fed', target: 2, coins: 12, merit: 6 },
  { id: 'q_pet', text: 'ลูบหัวน้องหมา 1 ตัว', event: 'dog_pet', target: 1, coins: 6, merit: 3 },
  { id: 'q_bell', text: 'ตีระฆังให้ครบทั้งแถว', event: 'bell_round', target: 1, coins: 8, merit: 4 },
  { id: 'q_wish', text: 'จุดธูปขอพร 1 ครั้ง', event: 'wish', target: 1, coins: 8, merit: 4 },
  { id: 'q_siamsi', text: 'เสี่ยงเซียมซี 1 ครั้ง', event: 'siamsi', target: 1, coins: 6, merit: 3 },
  { id: 'q_deity', text: 'ไหว้เทพ 1 องค์', event: 'deity', target: 1, coins: 10, merit: 5 },
  { id: 'q_deity2', text: 'ไหว้เทพ 2 องค์', event: 'deity', target: 2, coins: 16, merit: 8, level: 4 },
  { id: 'q_holy', text: 'ตักน้ำมนต์เสริมสิริมงคล', event: 'holy_water', target: 1, coins: 8, merit: 4 },
  { id: 'q_lottery', text: 'ขูดเลขต้นตะเคียน', event: 'lottery', target: 1, coins: 5, merit: 2 },
  { id: 'q_gold', text: 'ปิดทององค์พระ 1 แผ่น', event: 'gold_leaf', target: 1, coins: 12, merit: 6 },
  { id: 'q_donate', text: 'หยอดตู้ทำบุญ 1 ครั้ง', event: 'donate', target: 1, coins: 8, merit: 4 },
  { id: 'q_sathu', text: 'กดสาธุให้เพื่อน 3 ครั้ง', event: 'sathu', target: 3, coins: 8, merit: 4 },
  { id: 'q_krathong', text: 'ลอยกระทงขอพรที่วัดริมน้ำ', event: 'krathong', target: 1, coins: 15, merit: 8, level: 6, area: 'river' },
  { id: 'q_catfish', text: 'ให้อาหารปลาสวาย 10 ชิ้น', event: 'catfish_fed', target: 10, coins: 12, merit: 6, level: 6, area: 'river' },
  { id: 'q_circle', text: 'เวียนเทียนรอบเจดีย์ 3 รอบ', event: 'circle_chedi', target: 1, coins: 15, merit: 8, level: 10, area: 'mountain' },
]

export const QUESTS_PER_DAY = 4
export const ALL_QUESTS_BONUS = { coins: 30, merit: 20 }

export interface AchievementDef {
  id: string
  name: string
  desc: string
  event: GameEvent
  target: number
  coins: number
  icon: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_first_alms', name: 'ตักบาตรครั้งแรก', desc: 'ตักบาตรพระเป็นครั้งแรก', event: 'alms', target: 1, coins: 20, icon: 'bowl' },
  { id: 'a_alms_10', name: 'สายบุญยามเช้า', desc: 'ตักบาตรครบ 10 รอบ', event: 'alms', target: 10, coins: 60, icon: 'sun' },
  { id: 'a_chant_10', name: 'นักสวดมนต์', desc: 'สวดมนต์ครบ 10 บท', event: 'chant', target: 10, coins: 50, icon: 'book' },
  { id: 'a_meditate', name: 'ใจนิ่งดั่งน้ำ', desc: 'นั่งสมาธิรวม 10 นาที', event: 'meditate_sec', target: 600, coins: 60, icon: 'lotus' },
  { id: 'a_koi_100', name: 'เพื่อนปลาคาร์ฟ', desc: 'ให้อาหารปลาครบ 100 เม็ด', event: 'koi_fed', target: 100, coins: 50, icon: 'koi' },
  { id: 'a_dog_10', name: 'เพื่อนรักหมาวัด', desc: 'ให้อาหารน้องหมา 10 ครั้ง', event: 'dog_fed', target: 10, coins: 50, icon: 'dog' },
  { id: 'a_bell_100', name: 'เสียงระฆังกังวาน', desc: 'ตีระฆังครบ 100 ครั้ง', event: 'bell', target: 100, coins: 40, icon: 'bell' },
  { id: 'a_gold_back', name: 'ปิดทองหลังพระ', desc: 'ทำความดีโดยไม่หวังให้ใครเห็น', event: 'gold_back', target: 1, coins: 80, icon: 'goldleaf' },
  { id: 'a_deity_6', name: 'สายมูตัวจริง', desc: 'ไหว้เทพครบ 6 ครั้ง', event: 'deity', target: 6, coins: 60, icon: 'incense' },
  { id: 'a_lottery_7', name: 'นักล่าเลขเด็ด', desc: 'ขูดเลขครบ 7 ครั้ง', event: 'lottery', target: 7, coins: 40, icon: 'powder' },
  { id: 'a_charity', name: 'ผู้ใจบุญ', desc: 'ร่วมบริจาคกองบุญครบ 300 เหรียญ', event: 'charity', target: 300, coins: 100, icon: 'heart' },
  { id: 'a_sathu_20', name: 'อนุโมทนาบุญ', desc: 'กดสาธุให้เพื่อนครบ 20 ครั้ง', event: 'sathu', target: 20, coins: 40, icon: 'wai' },
  { id: 'a_login_7', name: 'สายบุญ 7 วันติด', desc: 'เข้าวัดต่อเนื่อง 7 วัน', event: 'login', target: 7, coins: 100, icon: 'calendar' },
]
