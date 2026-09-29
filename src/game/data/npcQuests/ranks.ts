// Temple-rank quests (ภารกิจเลื่อนแรงก์): finishing one opens the matching
// S / SS temple on the ranking ladder (see data/ranks.ts and game/homeland.ts).
// Each is given by a shop keeper at a lower-rank temple of the same region,
// so the player meets the giver on the way up. Register with:
//   import { RANK_QUESTS } from './ranks'   (in npcQuests/index.ts)

import type { NpcQuestDef } from '../npcQuestTypes'

export const RANK_QUESTS: NpcQuestDef[] = [
  // --- กรุงเทพฯ ---------------------------------------------------------------
  {
    id: 'rank_bangkok_s',
    giver: 'shop:golden_mount_redcloth',
    map: 'golden_mount',
    npcName: 'พี่อาสา',
    title: 'ตามรอยทองคำเยาวราช',
    intro: [
      'ขึ้นมาถึงยอดภูเขาทองได้ ใจสู้มากครับ!',
      'รู้ไหมว่าที่วัดไตรมิตรมีพระพุทธรูปทองคำหนักห้าตันกว่า เคยถูกพอกปูนซ่อนไว้ตั้งหลายร้อยปี',
      'ใครจะไปกราบได้ต้องบุญถึงนะ ลองทำบุญให้ครบตามนี้ แล้วพี่จะเขียนใบรับรองสายบุญให้',
    ],
    replies: { accept: 'จัดไป! บุญต้องถึง', decline: 'ขอเตรียมตัวก่อน' },
    steps: [
      { event: 'gold_leaf', target: 3, text: 'ปิดทององค์พระ 3 แผ่น' },
      { event: 'chant', target: 5, text: 'สวดมนต์ 5 บท' },
      { event: 'donate', target: 3, text: 'หยอดตู้ทำบุญ 3 ครั้ง' },
    ],
    reward: { coins: 300, merit: 120, collectibles: { rk_traimit_pin: 1 } },
    done: 'ใบรับรองมาแล้วครับ! เดินลงบันไดระวังนะ แล้วไปเยาวราชกินบะหมี่ต่อได้เลย',
    level: 12,
    repeat: 'once',
    stars: 2,
  },
  {
    id: 'rank_bangkok_ss',
    giver: 'shop:wat_traimit_gold',
    map: 'wat_traimit',
    npcName: 'เถ้าแก่ทอง',
    title: 'บัตรทองเข้าวังหลวง',
    intro: [
      'อั๊วเห็นลื้อมาทำบุญบ่อย ๆ จนทองในร้านยังอาย',
      'ถ้าอยากไปกราบพระแก้วมรกตที่วังหลวง ต้องแต่งตัวสุภาพ ใจสงบ และบุญแน่นปึ้ก',
      'ไปทำตามลิสต์นี้ให้ครบ แล้วอั๊วจะให้บัตรทองสายบุญ ใครเห็นก็ต้องหลีกทางให้!',
    ],
    replies: { accept: 'รับบัตรทองไปเลย!', decline: 'เดี๋ยวกลับมานะเถ้าแก่' },
    steps: [
      { event: 'alms', target: 5, text: 'ตักบาตรพระ 5 รอบ' },
      { event: 'meditate_sec', target: 300, text: 'นั่งสมาธิรวม 5 นาที' },
      { event: 'bell_round', target: 3, text: 'ตีระฆังให้ครบแถว 3 รอบ' },
      { event: 'wish', target: 3, text: 'จุดธูปขอพร 3 ครั้ง' },
    ],
    reward: { coins: 600, merit: 250, collectibles: { rk_phra_kaew_globe: 1 } },
    done: 'เอ้า บัตรทองของลื้อ! ไปกราบพระแก้วให้ชื่นใจ แล้วอย่าลืมกลับมาซื้อทองนะ',
    level: 16,
    requires: ['rank_bangkok_s'],
    repeat: 'once',
    stars: 3,
  },

  // --- ภาคกลาง ----------------------------------------------------------------
  {
    id: 'rank_central_s',
    giver: 'shop:wat_mahathat_ayutthaya_rotisaimai',
    map: 'wat_mahathat_ayutthaya',
    npcName: 'บังนิด',
    title: 'ทางบุญสู่รอยพระพุทธบาท',
    intro: [
      'สายบุญมาเที่ยวกรุงเก่าเหรอครับ กินโรตีก่อน หวานละมุน!',
      'คนโบราณเดินทางไกลเป็นวัน ๆ เพื่อไปนมัสการรอยพระพุทธบาทที่สระบุรี เรียกว่า "ไปพระบาท"',
      'ลองทำบุญตามแบบคนโบราณดูไหมครับ ครบแล้วมารับเสบียงเดินทาง',
    ],
    replies: { accept: 'ไปพระบาทกัน!', decline: 'ขอกินโรตีก่อน' },
    steps: [
      { event: 'alms', target: 3, text: 'ตักบาตรพระ 3 รอบ' },
      { event: 'bell_round', target: 2, text: 'ตีระฆังให้ครบแถว 2 รอบ' },
      { event: 'holy_water', target: 2, text: 'ตักน้ำมนต์ 2 ครั้ง' },
    ],
    reward: { coins: 300, merit: 120, collectibles: { rk_phutthabat_stamp: 1 } },
    done: 'เก่งมากครับ! เสบียงโรตีสายไหมห่อให้แล้ว เดินทางปลอดภัยนะ',
    level: 12,
    repeat: 'once',
    stars: 2,
  },
  {
    id: 'rank_central_ss',
    giver: 'shop:wat_phutthabat_souvenir',
    map: 'wat_phutthabat',
    npcName: 'ลุงเสริม',
    title: 'เวียนเทียนองค์พระปฐมเจดีย์',
    intro: [
      'มาถึงพระบาทแล้ว ใจบุญจริง ๆ หลานเอ๊ย',
      'ยังเหลืออีกที่เดียว องค์พระปฐมเจดีย์ เจดีย์ที่สูงที่สุดในเมืองไทย',
      'ลุงมีระฆังจิ๋วไว้ให้ถือไปถวาย แต่หลานต้องสะสมบุญให้พอก่อนนะ',
    ],
    replies: { accept: 'รับระฆังไปถวายครับ', decline: 'ไว้ก่อนนะลุง' },
    steps: [
      { event: 'chant', target: 7, text: 'สวดมนต์ 7 บท' },
      { event: 'gold_leaf', target: 5, text: 'ปิดทององค์พระ 5 แผ่น' },
      { event: 'donate', target: 5, text: 'หยอดตู้ทำบุญ 5 ครั้ง' },
      { event: 'alms', target: 5, text: 'ตักบาตรพระ 5 รอบ' },
    ],
    reward: { coins: 600, merit: 250, collectibles: { rk_pathom_figure: 1 } },
    done: 'บุญเต็มระฆังแล้ว! ไปนครปฐม อย่าลืมซื้อข้าวหลามมาฝากลุงด้วยนะ',
    level: 16,
    requires: ['rank_central_s'],
    repeat: 'once',
    stars: 3,
  },

  // --- ภาคเหนือ ---------------------------------------------------------------
  {
    id: 'rank_north_s',
    giver: 'shop:lampang_luang_khaotaen',
    map: 'lampang_luang',
    npcName: 'แม่อุ๊ย',
    title: 'ส่องเงาบุญ ไปไหว้พระชินราช',
    intro: [
      'มาแอ่วลำปางเจ้า ข้าวแต๋นกรอบ ๆ ลองเน้อ',
      'แม่อุ๊ยเคยไปไหว้พระพุทธชินราชที่พิษณุโลกตอนสาว ๆ งามแต๊งามว่า',
      'ถ้าหลานทำบุญครบตามนี้ แม่อุ๊ยจะผูกข้อมือเรียกขวัญให้ ไปไหนก็ปลอดภัยเจ้า',
    ],
    replies: { accept: 'ขอบคุณเจ้าแม่อุ๊ย', decline: 'ขอเตรียมตัวก่อนเจ้า' },
    steps: [
      { event: 'chant', target: 5, text: 'สวดมนต์ 5 บท' },
      { event: 'wish', target: 3, text: 'จุดธูปขอพร 3 ครั้ง' },
      { event: 'bell_round', target: 2, text: 'ตีระฆังให้ครบแถว 2 รอบ' },
    ],
    reward: { coins: 300, merit: 120, collectibles: { rk_chinnarat_postcard: 1 } },
    done: 'ผูกข้อมือแล้วเจ้า ขวัญเอ๋ยขวัญมา! เดินทางดี ๆ เน้อ',
    level: 12,
    repeat: 'once',
    stars: 2,
  },
  {
    id: 'rank_north_ss',
    giver: 'shop:wat_yai_phitsanulok_kluaytak',
    map: 'wat_yai_phitsanulok',
    npcName: 'ยายแป้น',
    title: 'บันไดนาค 306 ขั้น',
    intro: [
      'กราบพระชินราชแล้วใจฟูไหมหลาน',
      'ยอดสุดของเมืองเหนือคือพระธาตุดอยสุเทพ ต้องเดินขึ้นบันไดนาค 306 ขั้น ขาสั่นแน่นอน',
      'เอากล้วยตากยายไปกินเป็นแรง แล้วทำบุญเก็บแต้มให้ครบ ยายเชื่อว่าหลานทำได้!',
    ],
    replies: { accept: 'ขึ้นดอยกันเลยยาย!', decline: 'ขอออกกำลังขาก่อน' },
    steps: [
      { event: 'circle_chedi', target: 1, text: 'เวียนเทียนรอบเจดีย์ 1 ครั้ง' },
      { event: 'meditate_sec', target: 300, text: 'นั่งสมาธิรวม 5 นาที' },
      { event: 'alms', target: 5, text: 'ตักบาตรพระ 5 รอบ' },
      { event: 'gold_leaf', target: 3, text: 'ปิดทององค์พระ 3 แผ่น' },
    ],
    reward: { coins: 600, merit: 250, collectibles: { rk_doi_suthep_figure: 1 } },
    done: 'เก่งที่สุดในสามโลก! ขึ้นไปถึงยอดดอยแล้วอย่าลืมมองทะเลหมอกนะหลาน',
    level: 16,
    requires: ['rank_north_s'],
    repeat: 'once',
    stars: 3,
  },

  // --- ภาคอีสาน ---------------------------------------------------------------
  {
    id: 'rank_northeast_ss',
    giver: 'shop:kham_chanod_offerings',
    map: 'kham_chanod',
    npcName: 'ป้าบุญมี',
    title: 'บุญใหญ่ริมฝั่งโขง',
    intro: [
      'มาถึงคำชะโนดได้ แสดงว่าพ่อปู่เปิดทางให้แล้วเด้อ',
      'ลงไปทางนครพนมคือองค์พระธาตุพนม หลักใจของคนลุ่มน้ำโขงทั้งสองฝั่ง',
      'ป้าจะทำบายศรีให้ถือไปถวาย แต่ต้องทำบุญให้ครบก่อน บุญใหญ่ต้องตั้งใจหลาย ๆ',
    ],
    replies: { accept: 'ตั้งใจหลาย ๆ เลยป้า', decline: 'ไว้ก่อนเด้อป้า' },
    steps: [
      { event: 'alms', target: 5, text: 'ตักบาตรพระ 5 รอบ' },
      { event: 'deity', target: 3, text: 'ไหว้เทพ 3 องค์' },
      { event: 'krathong', target: 1, text: 'ลอยกระทงขอพร 1 ครั้ง' },
      { event: 'chant', target: 5, text: 'สวดมนต์ 5 บท' },
    ],
    reward: { coins: 600, merit: 250, collectibles: { rk_that_phanom_naga: 1 } },
    done: 'บายศรีสวยงามคือบุญของหลานเอง ไปกราบพระธาตุพนมให้ชื่นใจเด้อ',
    level: 16,
    repeat: 'once',
    stars: 3,
  },

  // --- ภาคตะวันออก ------------------------------------------------------------
  {
    id: 'rank_east_s',
    giver: 'shop:wat_samarn_marigold',
    map: 'wat_samarn',
    npcName: 'ป้าดวง',
    title: 'ไข่ต้มแก้บนหลวงพ่อโสธร',
    intro: [
      'ขอพรพระพิฆเนศแล้วใช่ไหมจ๊ะ งั้นต้องไปต่อที่วัดโสธรนะ ใกล้ ๆ กันนี่เอง',
      'คนแปดริ้วเขาไหว้หลวงพ่อโสธรกันทุกบ้าน ขอแล้วได้ต้องแก้บนด้วยไข่ต้มนะ',
      'ช่วยป้าทำบุญให้ครบ แล้วป้าจะให้ดาวเรืองพวงใหญ่ไปถวายเลย',
    ],
    replies: { accept: 'ได้เลยจ้าป้า', decline: 'ขอดูทางก่อนนะป้า' },
    steps: [
      { event: 'deity', target: 3, text: 'ไหว้เทพ 3 องค์' },
      { event: 'wish', target: 3, text: 'จุดธูปขอพร 3 ครั้ง' },
      { event: 'donate', target: 3, text: 'หยอดตู้ทำบุญ 3 ครั้ง' },
    ],
    reward: { coins: 300, merit: 120, collectibles: { rk_sothon_charm: 1 } },
    done: 'ดาวเรืองพวงใหญ่มาแล้วจ้า ขอให้สมหวังทุกข้อนะลูก',
    level: 12,
    repeat: 'once',
    stars: 2,
  },

  // --- ภาคใต้ -----------------------------------------------------------------
  {
    id: 'rank_south_ss',
    giver: 'shop:wat_chalong_ohaew',
    map: 'wat_chalong',
    npcName: 'อาม่าเกียว',
    title: 'ขบวนแห่ผ้าขึ้นธาตุ',
    intro: [
      'กินโอ้เอ๋วเย็น ๆ ก่อนลูก ร้อนจะตายแล้ว',
      'อาม่าอยากไปงานแห่ผ้าขึ้นธาตุที่เมืองคอนสักครั้ง คนทั้งใต้มาห่มผ้าพระบรมธาตุพร้อมกัน',
      'ลูกไปแทนอาม่าได้ไหม ทำบุญให้ครบ แล้วอาม่าจะฝากผ้าผืนงามไปด้วย',
    ],
    replies: { accept: 'ไปแทนอาม่าเองค่ะ/ครับ', decline: 'ขอกินโอ้เอ๋วก่อน' },
    steps: [
      { event: 'alms', target: 5, text: 'ตักบาตรพระ 5 รอบ' },
      { event: 'circle_chedi', target: 1, text: 'เวียนเทียนรอบเจดีย์ 1 ครั้ง' },
      { event: 'wish', target: 3, text: 'จุดธูปขอพร 3 ครั้ง' },
      { event: 'holy_water', target: 3, text: 'ตักน้ำมนต์ 3 ครั้ง' },
    ],
    reward: { coins: 600, merit: 250, collectibles: { rk_nst_charm: 1 } },
    done: 'ผ้าผืนนี้อาม่าปักเองนะ ฝากห่มพระธาตุด้วย บุญนี้แบ่งกันคนละครึ่งนะลูก',
    level: 16,
    repeat: 'once',
    stars: 3,
  },
]

export const RANK_QUEST_BY_ID: Record<string, NpcQuestDef> = Object.fromEntries(RANK_QUESTS.map((q) => [q.id, q]))
