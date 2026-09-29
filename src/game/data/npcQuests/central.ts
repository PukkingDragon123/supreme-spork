// Quests in the central region and the historic cities: พระปฐมเจดีย์,
// วัดโสธรฯ, วัดสมานฯ, วัดจุฬามณี, วัดพระพุทธบาท, อยุธยา, วัดห้วยมงคล,
// วัดใหญ่พิษณุโลก.

import type { NpcQuestDef } from '../npcQuestTypes'

const LAMYAI = { giver: 'shop:pathom_chedi_khaolam', map: 'pathom_chedi', npcName: 'แม่ลำใย' } as const
const KLA = { giver: 'npc:pathom_kid', map: 'pathom_chedi', npcName: 'น้องต้นกล้า' } as const
const JIM = { giver: 'shop:wat_sothon_eggs', map: 'wat_sothon', npcName: 'ป้าจิ๋ม' } as const
const MAY = { giver: 'npc:samarn_single', map: 'wat_samarn', npcName: 'น้องเมย์' } as const
const PRAE = { giver: 'shop:wat_samarn_ratwish', map: 'wat_samarn', npcName: 'น้องแพร' } as const
const PUI = { giver: 'shop:wat_chulamanee_sugar', map: 'wat_chulamanee', npcName: 'ยายปุ๋ย' } as const
const YEN = { giver: 'npc:phutthabat_ta', map: 'wat_phutthabat', npcName: 'ตาเย็น' } as const
const TON = { giver: 'npc:ayut_guide', map: 'wat_mahathat_ayutthaya', npcName: 'พี่ต้น' } as const
const BANG = { giver: 'shop:wat_mahathat_ayutthaya_rotisaimai', map: 'wat_mahathat_ayutthaya', npcName: 'บังนิด' } as const
const SRI = { giver: 'shop:wat_huay_mongkol_elephant', map: 'wat_huay_mongkol', npcName: 'ป้าศรี' } as const
const PAEN = { giver: 'shop:wat_yai_phitsanulok_kluaytak', map: 'wat_yai_phitsanulok', npcName: 'ยายแป้น' } as const

export const QUESTS: NpcQuestDef[] = [
  // ------------------------------------------------------------------ พระปฐมเจดีย์
  {
    ...LAMYAI,
    id: 'pathom_shoes_1',
    title: 'รองเท้าเป็นภูเขา',
    stars: 1,
    level: 4,
    intro: ['ลูก ๆ ช่วยแม่หน่อย! คนมางานวัดเยอะจนรองเท้ากองเป็นภูเขาเลากา', 'ใครจะหาคู่ตัวเองเจอเนี่ย... แม่เห็นคุณลุงคนนึงใส่รองเท้าคนละสีกลับบ้านไปแล้ว', 'ไปช่วยจัดรองเท้าหน้าวิหารทีนะ เดี๋ยวแม่ให้ข้าวหลามร้อน ๆ'],
    lore: ['ข้าวหลามนครปฐมต้องเผาในกระบอกไม้ไผ่ข้าวหลามเท่านั้น', 'แม่เผามาตั้งแต่ตีสาม กลิ่นหอมไปทั้งซอย เพื่อนบ้านตื่นมากินทุกเช้า'],
    steps: [{ event: 'job', target: 2, text: 'ทำงานอาสาที่พระปฐมเจดีย์ 2 งาน', map: 'pathom_chedi', nav: 'job:arrange_shoes' }],
    reward: { coins: 80, merit: 18, items: { sticky: 2 } },
    done: 'เรียบร้อยเป็นแถวเลย! คุณลุงคนนั้นกลับมาเปลี่ยนรองเท้าแล้วนะ ฮ่า ๆ',
  },
  {
    ...KLA,
    id: 'pathom_balloon_1',
    title: 'ลูกโป่งลอยไปแล้ว',
    stars: 1,
    level: 4,
    intro: ['ฮือ... ลูกโป่งหนูลอยไปติดยอดพระปฐมเจดีย์แล้ว', '(สูงตั้ง 120 เมตรเลยนะ!)', 'พี่ช่วยตีระฆังเรียกลูกโป่งกลับมาให้หน่อยได้ไหม... แม่บอกว่าตีระฆังแล้วสมหวัง'],
    replies: { accept: 'พี่ตีให้เอง!', decline: 'เดี๋ยวซื้อลูกใหม่ให้' },
    steps: [{ event: 'bell_round', target: 1, text: 'ตีระฆังให้ครบแถวที่พระปฐมเจดีย์', map: 'pathom_chedi', nav: 'bells' }],
    reward: { coins: 60, merit: 15 },
    done: 'ลูกโป่งไม่กลับมา... แต่หนูหายเศร้าแล้ว เสียงระฆังเพราะมาก! เอาเหรียญหนูไปนะ',
  },
  {
    ...KLA,
    id: 'pathom_balloon_2',
    title: 'งานวัดต้องมีรางวัล',
    stars: 2,
    level: 5,
    requires: ['pathom_balloon_1'],
    intro: ['พี่ ๆ หนูอยากได้ตุ๊กตาช้างที่ซุ้มปาเป้า!', 'แต่หนูปาไม่โดนเลย โดนแต่พี่ตุ๊กคนคุมซุ้ม', 'ช่วยหนูเล่นเกมงานวัดหน่อย แล้วขอพรให้หนูได้ตุ๊กตานะ'],
    steps: [
      { event: 'fair_game', target: 1, text: 'เล่นเกมซุ้มงานวัด 1 ครั้ง', map: 'pathom_chedi', nav: 'shop:pathom_chedi_fairgame' },
      { event: 'wish', target: 1, text: 'จุดธูปขอพรให้น้องต้นกล้า', map: 'pathom_chedi', nav: 'incense' },
    ],
    reward: { coins: 110, merit: 22 },
    done: 'พี่เก่งที่สุดในโลก! โตขึ้นหนูจะเป็นแบบพี่',
  },

  // ------------------------------------------------------------------ วัดโสธรฯ
  {
    ...JIM,
    id: 'sothon_eggs_1',
    title: 'ขอแล้วต้องแก้บน',
    stars: 1,
    level: 6,
    intro: ['มาขอพรหลวงพ่อโสธรใช่ไหมลูก ขอเรื่องอะไรจ๊ะ', 'ถ้าสมหวังต้องมาแก้บนด้วยไข่ต้มนะ ห้ามลืม!', 'ป้าเห็นคนลืมมาเยอะแล้ว... ป้าไม่พูดดีกว่า ไปขอพรก่อนเลยจ้ะ'],
    lore: ['ร้านป้าต้มไข่วันละสามพันฟอง', 'ไข่แก้บนต้องเป็นเลขคี่นะ 9 ฟอง 99 ฟอง', 'มีคนแก้บน 999 ฟองด้วย ป้าต้มจนหม้อทะลุ'],
    steps: [
      { event: 'wish', target: 1, text: 'จุดธูปขอพรหลวงพ่อโสธร', map: 'wat_sothon', nav: 'incense' },
      { event: 'chant', target: 1, text: 'สวดมนต์ที่วัดโสธรฯ 1 บท', map: 'wat_sothon', nav: 'pray_sala' },
    ],
    reward: { coins: 80, merit: 20, items: { boiled_egg: 5 } },
    done: 'ขอให้สมหวังนะลูก! ไข่ห้าฟองนี้เอาไปก่อน เผื่อสมหวังเร็ว',
  },
  {
    ...JIM,
    id: 'sothon_eggs_2',
    title: 'ปลาหน้าวัดรอไข่แดง',
    stars: 1,
    level: 7,
    requires: ['sothon_eggs_1'],
    intro: ['คนแก้บนเยอะ ไข่แดงเหลือเยอะ ปลาหน้าวัดเลยอ้วนกันใหญ่', 'แต่วันนี้ปลาดูหิวผิดปกติ ช่วยไปให้อาหารปลาที่ท่าน้ำหน่อยนะ'],
    steps: [{ event: 'catfish_fed', target: 15, text: 'ให้อาหารปลาที่ท่าน้ำหน้าวัดโสธรฯ 15 ชิ้น', map: 'wat_sothon', nav: 'river_fish' }],
    reward: { coins: 70, merit: 15 },
    done: 'ปลาหน้าวัดโสธรฯ ตัวใหญ่ที่สุดในแปดริ้วเลยนะ ต้องขอบใจหลานด้วย',
  },

  // ------------------------------------------------------------------ วัดสมานฯ
  {
    ...MAY,
    id: 'samarn_love_1',
    title: 'พระพิฆเนศช่วยด้วย',
    stars: 2,
    level: 7,
    intro: ['พี่ขา! หนูโสดมา 28 ปีแล้วค่ะ', 'เพื่อนบอกให้กระซิบหนูประจำวันเกิดที่วัดสมานฯ แต่หนูกลัวหนูค่ะ', '(หนูตัวจริงนะคะ ไม่ใช่หนูที่เป็นหนู... งงไหมคะ) ช่วยไหว้พระพิฆเนศแล้วซื้อเหรียญกระซิบแทนหนูที'],
    lore: ['องค์พระพิฆเนศปางนอนที่นี่สีชมพูทั้งองค์ ใหญ่มาก', 'คนเชื่อว่าท่านใจดี ขอเรื่องความรักได้ไวทันใจ', 'หนูมาห้าครั้งแล้ว ยังไม่สมหวัง แต่หนูเชื่อว่าครั้งนี้แหละ!'],
    replies: { accept: 'พี่กระซิบให้เอง', decline: 'ลองแอปหาคู่ดีไหม' },
    steps: [
      { event: 'deity', target: 1, text: 'ไหว้พระพิฆเนศปางนอน', map: 'wat_samarn', nav: 'ganesha' },
      { event: 'stall_buy', target: 1, text: 'ซื้อของที่ซุ้มกระซิบหนู', map: 'wat_samarn', nav: 'shop:wat_samarn_ratwish' },
    ],
    reward: { coins: 110, merit: 25, outfits: ['head_rat_ears'] },
    done: 'มีคนทักแชทมาแล้วค่ะ!! ...เป็นแก๊งคอลเซ็นเตอร์ แต่หนูมีความหวังแล้ว หมวกหูหนูนี้ให้พี่นะ',
  },
  {
    ...PRAE,
    id: 'samarn_rat_daily',
    title: 'ปลาหน้าวัดสมานฯ',
    stars: 1,
    level: 7,
    repeat: 'daily',
    intro: ['หยอดเหรียญกระซิบหนูแล้ว อย่าลืมทำบุญกับปลาด้วยนะคะ', 'ปลาที่ท่าน้ำหลังวัดตัวใหญ่มาก หิวทั้งวันเลย'],
    steps: [{ event: 'catfish_fed', target: 10, text: 'ให้อาหารปลาที่วัดสมานฯ 10 ชิ้น', map: 'wat_samarn', nav: 'river_fish' }],
    reward: { coins: 35, merit: 8 },
    done: 'ปลาอิ่ม หนูก็ยิ้ม ขอบคุณค่า~',
  },

  // ------------------------------------------------------------------ วัดจุฬามณี
  {
    ...PUI,
    id: 'chula_sugar_1',
    title: 'น้ำตาลมะพร้าวลงเรือ',
    stars: 1,
    level: 8,
    intro: ['ยายเคี่ยวน้ำตาลมะพร้าวมาตั้งแต่เช้ามืด หอมไปทั้งคลอง', 'พระท่านพายเรือมาบิณฑบาตตอนเช้า ยายอยากให้หลานลองใส่บาตรทางเรือ', 'แล้วแวะให้อาหารปลาในคลองด้วยนะ ปลาที่นี่เชื่องมาก'],
    steps: [
      { event: 'alms', target: 1, text: 'ตักบาตรทางเรือที่วัดจุฬามณี', map: 'wat_chulamanee', nav: 'boat_alms' },
      { event: 'koi_fed', target: 15, text: 'ให้อาหารปลาที่วัดจุฬามณี 15 เม็ด', map: 'wat_chulamanee', nav: 'job:feed_fish' },
    ],
    reward: { coins: 90, merit: 20, items: { ing_sugar: 3, ing_coconut: 1 } },
    done: 'อ่อนหวานเหมือนน้ำตาลมะพร้าวยายเลย! เอาไปทำขนมใส่บาตรนะหลาน',
  },

  // ------------------------------------------------------------------ วัดพระพุทธบาท
  {
    ...YEN,
    id: 'phutthabat_bells_1',
    title: 'ขอให้ยายบ่นน้อยลง',
    stars: 2,
    level: 9,
    intro: ['หนุ่มสาวมานี่หน่อย ตามีเรื่องจะเล่า', 'สมัยหนุ่ม ๆ ตาขึ้นบันไดนาคมาตีระฆังทุกใบ ขอให้ได้แต่งงานกับยาย... ได้จริงด้วย!', 'ตอนนี้ตาอยากขอพรใหม่ ขอให้ยายบ่นน้อยลง ช่วยตาตีระฆังหน่อย แล้วนั่งชมวิวเขาสักพัก'],
    lore: ['รอยพระพุทธบาทที่นี่ คนสมัยก่อนเดินเท้ามาเป็นเดือนเพื่อมากราบ', 'ตากับยายก็เดินมา ตอนนั้นยายยังไม่บ่นเลย... ตอนนั้นยายยังไม่รู้จักตาดี'],
    steps: [
      { event: 'bell', target: 30, text: 'ตีระฆังที่วัดพระพุทธบาท 30 ครั้ง', map: 'wat_phutthabat', nav: 'bells' },
      { event: 'meditate_sec', target: 30, text: 'นั่งชมวิวเขาสุวรรณบรรพต 30 วินาที', map: 'wat_phutthabat', nav: 'view' },
    ],
    reward: { coins: 120, merit: 28 },
    done: 'ยายโทรมาแล้ว! ...บ่นว่าตาไปไหนมา ฮ่า ๆ แต่เสียงยายอ่อนโยนขึ้นนะ ตารู้สึกได้',
  },

  // ------------------------------------------------------------------ อยุธยา
  {
    ...TON,
    id: 'ayut_head_1',
    title: 'เศียรพระในรากโพธิ์',
    stars: 1,
    level: 9,
    intro: ['ยินดีต้อนรับสู่กรุงศรีอยุธยาครับ!', 'ไฮไลต์ของวัดนี้คือเศียรพระในรากต้นโพธิ์ ทั่วโลกรู้จัก', 'ไปกราบไหว้ให้ถูกวิธีนะครับ นั่งลงให้ต่ำกว่าเศียรท่านด้วย'],
    lore: ['ตอนเสียกรุงครั้งที่สอง วัดนี้ถูกเผา เศียรพระหล่นอยู่ที่โคนต้นโพธิ์', 'ร้อยกว่าปีผ่านไป รากโพธิ์ค่อย ๆ โอบเศียรท่านไว้ เหมือนปกป้อง', 'ผมเล่าเรื่องนี้ทุกวัน แต่ยังขนลุกทุกครั้งครับ'],
    steps: [{ event: 'chant', target: 1, text: 'กราบไหว้เศียรพระในรากโพธิ์ (สวดมนต์)', map: 'wat_mahathat_ayutthaya', nav: 'pray_head' }],
    reward: { coins: 80, merit: 20 },
    done: 'กราบได้สวยงามครับ ท่านคงเมตตาแน่นอน',
  },
  {
    ...TON,
    id: 'ayut_ruin_2',
    title: 'ย้อนเวลากรุงเก่า',
    stars: 2,
    level: 10,
    requires: ['ayut_head_1'],
    intro: ['ทัวร์ต่อไปครับ! เข้าไปในซากวิหารกัน', 'ช่วยกวาดลานโบราณสถาน แล้วจุดธูปรำลึกถึงบรรพชนที่สร้างบ้านเมืองมา', 'ทำเสร็จผมมีเสื้อลายอยุธยาให้ครับ'],
    steps: [
      { event: 'place_visit', target: 1, text: 'เข้าไปในซากวิหาร', map: 'wat_mahathat_ayutthaya:ruin' },
      { event: 'job', target: 1, text: 'ช่วยกวาดลานโบราณสถาน', map: 'wat_mahathat_ayutthaya:ruin', nav: 'job:sweep_leaves' },
      { event: 'wish', target: 1, text: 'จุดธูปรำลึกบรรพชน', map: 'wat_mahathat_ayutthaya:ruin', nav: 'incense' },
    ],
    reward: { coins: 150, merit: 35, outfits: ['top_ayutthaya'] },
    done: 'อิฐทุกก้อนคงยิ้มให้เรา ขอบคุณที่ช่วยดูแลนะครับ',
  },
  {
    ...BANG,
    id: 'ayut_roti_1',
    title: 'โรตีส่งพี่ไกด์',
    stars: 1,
    level: 9,
    intro: ['โรตีสายไหมร้อน ๆ ครับ! แป้งบาง ๆ ห่อสายไหมสีชมพู', 'พี่ต้นไกด์ประจำวัดสั่งไว้ แต่ผมทิ้งร้านไม่ได้', 'ช่วยเอาไปส่งให้หน่อยครับ เขายืนอยู่แถวลานวัด'],
    steps: [
      {
        event: 'npc_talk',
        target: 1,
        text: 'ส่งโรตีสายไหมให้พี่ต้น',
        npc: 'npc:ayut_guide',
        map: 'wat_mahathat_ayutthaya',
        say: 'โรตีบังนิด! ของโปรดพี่เลย ยิ่งกินยิ่งเล่าเก่ง ขอบใจนะ',
      },
    ],
    reward: { coins: 50, merit: 10 },
    done: 'ส่งถึงมือแล้ว! สายไหมไม่ละลายด้วย เก่งครับ',
  },

  // ------------------------------------------------------------------ วัดห้วยมงคล
  {
    ...SRI,
    id: 'huaymongkol_elephant_1',
    title: 'ช้างไม้ถวายหลวงปู่',
    stars: 1,
    level: 10,
    intro: ['คนมาขอพรหลวงปู่ทวด สมหวังแล้วก็ถวายช้างไม้', 'ป้าแกะช้างไม้ทุกตัวเองนะ ตัวนี้ตาเหล่นิดนึง แต่ใจดี', 'ไปกราบหลวงปู่ แล้วให้อาหารปลาที่สระก่อนนะ ป้าจะเลือกช้างตัวสวยไว้ให้'],
    steps: [
      { event: 'chant', target: 1, text: 'กราบหลวงปู่ทวด (สวดมนต์)', map: 'wat_huay_mongkol', nav: 'pray' },
      { event: 'koi_fed', target: 15, text: 'ให้อาหารปลาที่สระวัดห้วยมงคล 15 เม็ด', map: 'wat_huay_mongkol', nav: 'job:feed_fish' },
    ],
    reward: { coins: 90, merit: 20, items: { elephant: 2 } },
    done: 'ช้างไม้สองตัว เอาไปถวายตอนสมหวังนะลูก ตัวที่ตาเหล่ป้าแถมให้',
  },

  // ------------------------------------------------------------------ วัดใหญ่ พิษณุโลก
  {
    ...PAEN,
    id: 'phitsanulok_kluay_1',
    title: 'กล้วยตากตากแดด',
    stars: 1,
    level: 11,
    intro: ['กล้วยตากยายตากแดดมาสามวันแล้ว หวานหนึบเลย', 'มาไหว้พระพุทธชินราชแล้ว อย่าลืมทำบุญกับปลาแม่น้ำน่านนะหลาน', 'แล้วหยอดตู้ทำบุญช่วยค่าไฟวัดด้วย พระพุทธชินราชต้องสว่างไสว'],
    lore: ['พระพุทธชินราชคนว่าสวยที่สุดในประเทศไทย', 'ยายนั่งขายกล้วยตากมองท่านทุกวัน ห้าสิบปีแล้วยังสวยไม่เปลี่ยน... ต่างจากยาย ฮ่า ๆ'],
    steps: [
      { event: 'catfish_fed', target: 15, text: 'ให้อาหารปลาแม่น้ำน่าน 15 ชิ้น', map: 'wat_yai_phitsanulok', nav: 'river_fish' },
      { event: 'donate', target: 1, text: 'หยอดตู้ทำบุญที่วัดใหญ่', map: 'wat_yai_phitsanulok', nav: 'donation' },
    ],
    reward: { coins: 90, merit: 20, items: { banana: 3 } },
    done: 'ใจดีแบบนี้ กล้วยตากยายแถมให้สามลูกเลย (ในเกมเป็นกล้วยน้ำว้านะ)',
  },
]
