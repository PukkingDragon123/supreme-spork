// Quest-giver NPCs injected into maps without touching the map files.
// WorldScene merges `questNpcsOn(map.id)` into the map at load: each NPC gets
// a hotspot `npc:<id>` (tap → walk up → dialog) and is drawn y-sorted with the
// avatar/monk drawers. Other systems may add their own with registerQuestNpcs.
//
// Placement: (x, y) is where the NPC's feet are; the player walks to `at`
// (default 10px below, facing up). Every spot is checked for walkability and
// reachability from the map spawn by src/dev/quests.ts (dev-quests.html) and
// the unit tests.

import type { AvatarLook } from '../../art/avatar'
import { HUB_QUEST_NPCS } from './hubQuestNpcs'
import { BEACH_QUEST_NPCS } from './beachQuestNpcs'

export type QuestNpcSprite = 'person' | 'monk' | 'novice'

export interface QuestNpc {
  id: string
  map: string
  name: string
  /** Short role shown under the name in the dialog. */
  role: string
  sprite?: QuestNpcSprite
  /** Avatar look for 'person' NPCs (merged over the default look). */
  look?: Partial<AvatarLook>
  x: number
  y: number
  /** Where the player stands to talk (default x, y + 10). */
  at?: { x: number; y: number }
  /** Small talk when there is no quest to discuss. */
  lines: string[]
  /** Idle animation flavour. */
  idle?: 'wave' | 'wai' | 'sweep' | 'phone' | 'none'
  /** Prop drawn with the NPC (see gags.drawPerson extras). */
  prop?: 'vest' | 'phone' | 'drink' | 'umbrella'
  /** Hotspot icon (defaults to 'scroll'). */
  icon?: string
}

export const QUEST_NPCS: QuestNpc[] = [
  // ---------------------------------------------------------------- home temples
  {
    id: 'yai_sri',
    map: 'wat',
    name: 'ยายศรี',
    role: 'แม่ครัวใจดีประจำวัด',
    look: { gender: 'f', skin: 1, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' },
    x: 70,
    y: 322,
    idle: 'wave',
    lines: ['กินข้าวมาหรือยังหลาน? ยังเหรอ! เดี๋ยวยายตักให้', 'ทำบุญด้วยใจ ได้บุญกว่าทำด้วยเงินนะ', 'สมัยยายสาว ๆ วัดนี้ยังไม่มีไวไฟนะ', 'หลานผอมไปนะ กินเยอะ ๆ'],
  },
  {
    id: 'nen_ohm',
    map: 'wat',
    name: 'เณรโอม',
    role: 'สามเณรจอมซน',
    sprite: 'novice',
    look: { skin: 2 },
    x: 142,
    y: 350,
    idle: 'sweep',
    lines: ['เจริญพรครับ... เอ๊ย สวัสดีครับ ผมยังเป็นเณรอยู่', 'ใบโพธิ์ร่วงอีกแล้ว!', 'หลวงพ่อบอกว่ากวาดลานวัดคือการกวาดใจ... แต่ใบไม้เยอะมากครับ', 'ตอนเย็นมีฟุตบอลที่ลานวัดนะครับ (ห้ามบอกหลวงพ่อ)'],
  },
  {
    id: 'lung_dum',
    map: 'wat',
    name: 'ลุงดำ',
    role: 'เซียนเลขประจำต้นตะเคียน',
    look: { gender: 'm', skin: 2, face: 2, hair: 'hair_buzz', hairColor: 6, top: 'top_hawaii', bottom: 'bot_fisherman', neck: 'neck_amulet' },
    x: 98,
    y: 502,
    idle: 'none',
    lines: ['เลขเด็ดงวดนี้... ลุงไม่บอกหรอก (เพราะลุงไม่รู้)', 'ต้นตะเคียนต้นนี้อายุร้อยปีแล้วนะ', 'ถูกหวยไม่สำคัญ สำคัญที่ใจสบาย', 'งวดหน้ามาแน่! (พูดมาสามปีแล้ว)'],
  },
  {
    id: 'pee_puy',
    map: 'wat',
    name: 'พี่ปุ้ย',
    role: 'อาสาดูแลน้องหมาแมวในวัด',
    look: { gender: 'f', skin: 1, face: 0, hair: 'hair_ponytail', hairColor: 1, top: 'top_tee_boon', bottom: 'bot_jeans', head: 'head_cap' },
    x: 190,
    y: 558,
    idle: 'wave',
    lines: ['น้องหมาที่นี่ฉีดวัคซีนครบแล้วนะ ลูบได้เลย', 'แมวส้มตัวนั้นชื่อเจ้าขนมปัง กินเก่งมาก', 'อย่าให้ขนมหวานน้องหมานะ เดี๋ยวฟันผุ', 'รักสัตว์ก็ได้บุญนะ~'],
  },
  {
    id: 'ma_mooh',
    map: 'shrine',
    name: 'แม่หมอมูมู่',
    role: 'อินฟลูสายมู ไลฟ์สดทุกวัน',
    look: { gender: 'f', skin: 0, face: 1, hair: 'hair_long', hairColor: 4, top: 'top_thaisilk', bottom: 'bot_sin_mudmee', neck: 'neck_garland', hand: 'hand_phone' },
    x: 150,
    y: 374,
    idle: 'phone',
    lines: ['สวัสดีค่าแม่ ๆ ทุกคน! กดหัวใจรัว ๆ เลยค่ะ', 'สีมงคลวันนี้... ใส่อะไรก็ปังค่ะถ้าใจดี', 'ขอพรพระพิฆเนศเรื่องงาน พระแม่ลักษมีเรื่องเงิน จำไว้นะคะ', 'กดติดตามช่องมูมู่ด้วยนะคะ~'],
  },
  {
    id: 'lung_pan',
    map: 'river',
    name: 'ลุงพาน',
    role: 'คนพายเรือประจำท่าวัด',
    look: { gender: 'm', skin: 3, face: 2, hair: 'hair_short', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman', head: 'head_ngob' },
    x: 198,
    y: 258,
    idle: 'wave',
    lines: ['น้ำขึ้นให้รีบตัก... บุญขึ้นให้รีบทำ', 'ปลาสวายตัวนั้นลุงตั้งชื่อว่าไอ้อ้วน', 'ลุงพายเรือส่งพระมาสี่สิบปีแล้ว', 'หน้าน้ำปีนี้น้ำมาเยอะนะ ระวังด้วย'],
  },
  {
    id: 'pee_mok',
    map: 'mountain',
    name: 'พี่หมอก',
    role: 'ไกด์เดินป่าสายธรรมะ',
    look: { gender: 'm', skin: 1, face: 0, hair: 'hair_curtain', hairColor: 1, top: 'top_flannel', bottom: 'bot_cargo', head: 'head_cap' },
    x: 122,
    y: 338,
    idle: 'wave',
    lines: ['หายใจลึก ๆ... อากาศบนดอยสดชื่นที่สุด', 'ทะเลหมอกมาตอนตีห้า อย่าตื่นสายนะ', 'เดินขึ้นบันไดนาคช้า ๆ ได้บุญเท่ากัน', 'ใครทิ้งขยะบนดอย พี่หมอกจะเสียใจมาก'],
  },
  {
    id: 'jay_tai',
    map: 'mart',
    name: 'เจ๊ต่าย',
    role: 'ผู้จัดการร้าน 7-บุญ สาขาหน้าวัด',
    look: { gender: 'f', skin: 1, face: 1, hair: 'hair_bob', hairColor: 2, top: 'top_convenience', bottom: 'bot_black' },
    x: 62,
    y: 212,
    idle: 'wave',
    lines: ['สวัสดีค่ะ ยินดีต้อนรับค่า~ รับถุงไหมคะ', 'ชุดตักบาตรพร้อมถวาย ลดราคาช่วงเช้านะคะ', 'สะสมแต้มบุญ แลกบุญได้ค่ะ (ล้อเล่น)', 'ไมโครเวฟว่างนะคะ อุ่นอะไรไหม'],
  },

  // ---------------------------------------------------------------- Bangkok
  {
    id: 'wpk_volunteer',
    map: 'wat_phra_kaew',
    name: 'พี่ต้อม',
    role: 'อาสาเช็ดรูปปั้นกินรี',
    look: { gender: 'm', skin: 2, face: 0, hair: 'hair_short', hairColor: 0, top: 'top_tee_white', bottom: 'bot_jeans' },
    prop: 'vest',
    x: 110,
    y: 452,
    idle: 'wave',
    lines: ['กินรีตัวนี้ครึ่งคนครึ่งนก เช็ดยากมาก ปีกเยอะ', 'ร้อนนน แต่ใจฟู', 'เช็ดเบา ๆ นะ ท่านอายุสองร้อยกว่าปีแล้ว', 'ใครมีน้ำเย็นบ้าง~'],
  },
  {
    id: 'pho_guide',
    map: 'wat_pho',
    name: 'ไกด์นิด',
    role: 'ไกด์ประจำวัดโพธิ์ (ลูกทัวร์หายบ่อย)',
    look: { gender: 'm', skin: 1, face: 2, hair: 'hair_twoblock', hairColor: 0, top: 'top_polo', bottom: 'bot_khaki', head: 'head_sunglasses', neck: 'neck_lanyard' },
    x: 112,
    y: 914,
    idle: 'wave',
    lines: ['This way please! เอ้ย ทางนี้ครับ', 'พระนอนยาว 46 เมตร นอนสบายกว่าผมอีก', 'วัดโพธิ์คือมหาวิทยาลัยแห่งแรกของไทยนะครับ', 'ลูกทัวร์ผมหายอีกแล้ว...'],
  },
  {
    id: 'arun_ferry',
    map: 'wat_arun',
    name: 'ลุงเจิม',
    role: 'คนขับเรือข้ามฟากท่าเตียน',
    look: { gender: 'm', skin: 3, face: 2, hair: 'hair_buzz', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman', head: 'head_ngob' },
    x: 158,
    y: 856,
    idle: 'none',
    lines: ['ข้ามฟากไหมหลาน ห้าบาท (ขึ้นราคาแล้วนะ)', 'พระปรางค์ตอนเย็นสวยที่สุดในโลก', 'เรือลุงไม่เคยล่ม... ยกเว้นครั้งนั้น', 'ปลาหน้าท่าเยอะมาก อย่าทำตกน้ำนะ'],
  },
  {
    id: 'erawan_office',
    map: 'erawan',
    name: 'พี่ออฟ',
    role: 'มนุษย์เงินเดือนสายมู',
    look: { gender: 'm', skin: 1, face: 0, hair: 'hair_short', hairColor: 0, top: 'top_office', bottom: 'bot_slacks_grey', neck: 'neck_lanyard' },
    x: 106,
    y: 640,
    idle: 'phone',
    lines: ['พักเที่ยงแค่ชั่วโมงเดียว ต้องไหว้ให้ไว', 'เจ้านายโทรมาอีกแล้ว...', 'ไหว้ครบสี่หน้า ได้พรครบสี่ด้าน', 'ขอให้ได้โบนัสสักที สาธุ'],
  },
  {
    id: 'gm_auntie',
    map: 'golden_mount',
    name: 'ป้าอร',
    role: 'ขาประจำบันได 344 ขั้น',
    look: { gender: 'f', skin: 2, face: 1, hair: 'hair_curly', hairColor: 6, top: 'top_floral', bottom: 'bot_track', head: 'head_sunhat' },
    x: 202,
    y: 966,
    idle: 'wave',
    lines: ['ป้าเดินขึ้นทุกเช้า เข่าป้าแข็งแรงกว่าหลานอีก', 'ขั้นที่ 200 มีม้านั่ง พักได้นะ', 'บนยอดลมเย็นมาก เห็นกรุงเทพฯ ทั้งเมือง', 'เดินช้า ๆ ไม่ต้องรีบ บุญไม่หนีไปไหน'],
  },
  {
    id: 'yaowarat_foodie',
    map: 'wat_traimit',
    name: 'เฮียโต้ง',
    role: 'บล็อกเกอร์สายกินเยาวราช',
    look: { gender: 'm', skin: 0, face: 0, hair: 'hair_curtain', hairColor: 0, top: 'top_hawaii_elephant', bottom: 'bot_joggers', hand: 'hand_bubbletea' },
    x: 226,
    y: 932,
    idle: 'none',
    lines: ['ร้านนี้ห้าดาว! (ผมให้ทุกร้าน)', 'ท้องผมมีพื้นที่เหลือเสมอ', 'กินอิ่มแล้วต้องทำบุญ จะได้กินอีก', 'รีวิวร้านที่ 999 แล้วครับ'],
  },

  // ---------------------------------------------------------------- central & historic
  {
    id: 'pathom_kid',
    map: 'pathom_chedi',
    name: 'น้องต้นกล้า',
    role: 'เด็กน้อยมาเที่ยวงานวัด',
    look: { gender: 'f', skin: 1, face: 2, hair: 'hair_twin', hairColor: 0, top: 'top_school_f', bottom: 'bot_school_skirt', head: 'head_ribbon' },
    x: 198,
    y: 868,
    idle: 'wave',
    lines: ['งานวัดสนุกที่สุดในโลก!', 'หนูอยากได้ตุ๊กตาช้างตัวโต', 'พระปฐมเจดีย์สูงกว่าตึกบ้านหนูอีก', 'แม่ให้ตังค์มายี่สิบบาท หนูจะใช้ให้คุ้ม!'],
  },
  {
    id: 'samarn_single',
    map: 'wat_samarn',
    name: 'น้องเมย์',
    role: 'สาวโสดสายมู (โสดมา 28 ปี)',
    look: { gender: 'f', skin: 0, face: 1, hair: 'hair_wavy', hairColor: 3, top: 'top_lace', bottom: 'bot_pinkskirt', head: 'head_ribbon' },
    x: 206,
    y: 750,
    idle: 'phone',
    lines: ['พระพิฆเนศองค์ชมพูใจดีมากเลยนะคะ', 'ขอแค่คนที่ตอบแชทไวก็พอค่ะ', 'หนูกระซิบหนูมาเจ็ดตัวแล้ว!', 'ใส่ชุดสีมงคลมาด้วยนะคะ วันนี้'],
  },
  {
    id: 'phutthabat_ta',
    map: 'wat_phutthabat',
    name: 'ตาเย็น',
    role: 'ผู้เฒ่าเล่าเรื่องเขาสุวรรณบรรพต',
    look: { gender: 'm', skin: 2, face: 2, hair: 'hair_buzz', hairColor: 6, top: 'top_mohom', bottom: 'bot_sarong' },
    x: 190,
    y: 694,
    idle: 'none',
    lines: ['สมัยตาหนุ่ม ๆ ต้องเดินเท้ามาไหว้พระพุทธบาทนะ', 'ยายบ่นทุกวัน แต่ตารักยายนะ', 'ระฆังที่นี่เสียงดี ตีแล้วใจโล่ง', 'ทำบุญตอนแข็งแรง อย่ารอแก่อย่างตา'],
  },
  {
    id: 'ayut_guide',
    map: 'wat_mahathat_ayutthaya',
    name: 'พี่ต้น',
    role: 'ไกด์ประวัติศาสตร์กรุงเก่า',
    look: { gender: 'm', skin: 2, face: 0, hair: 'hair_short', hairColor: 0, top: 'top_polo', bottom: 'bot_cargo', head: 'head_cap', neck: 'neck_lanyard' },
    x: 222,
    y: 668,
    idle: 'wave',
    lines: ['อยุธยาเป็นราชธานี 417 ปีนะครับ', 'ถ่ายรูปกับเศียรพระ ต้องนั่งลงให้ต่ำกว่านะ', 'อิฐทุกก้อนที่นี่มีเรื่องเล่า', 'โรตีสายไหมบังนิดอร่อยที่สุด (ผมกินทุกวัน)'],
  },

  // ---------------------------------------------------------------- north & isan
  {
    id: 'doi_runner',
    map: 'doi_suthep',
    name: 'พี่เจมส์',
    role: 'นักวิ่งเทรลสายบุญ',
    look: { gender: 'm', skin: 1, face: 0, hair: 'hair_twoblock', hairColor: 1, top: 'top_jersey', bottom: 'bot_track', head: 'head_headphones' },
    x: 190,
    y: 1050,
    idle: 'none',
    lines: ['วอร์มอัพก่อนขึ้นบันไดนะ!', 'ผมขึ้นดอยสุเทพมา 108 รอบแล้ว', 'ขาไม่ไป ใจไปก่อน', 'ลงดอยไปกินข้าวซอยต่อ ใครไปบ้าง'],
  },
  {
    id: 'yamo_molam',
    map: 'ya_mo',
    name: 'พี่แคน',
    role: 'หมอลำซิ่งรับงานแก้บน',
    look: { gender: 'm', skin: 2, face: 1, hair: 'hair_curtain', hairColor: 0, top: 'top_likay', bottom: 'bot_likay', neck: 'neck_pakaoma' },
    x: 196,
    y: 712,
    idle: 'wave',
    lines: ['ม่วนบ่ พี่น้อง!', 'คืนนี้มีลำถวายย่าโม มาฟังนะ', 'เสียงพี่แหบเพราะร้องมาสามคืนติด', 'ย่าโมชอบเพลงเพราะ ๆ นะ รู้ไหม'],
  },
  {
    id: 'phanom_boat',
    map: 'that_phanom',
    name: 'ลุงคำพันธ์',
    role: 'คนเรือริมฝั่งโขง',
    look: { gender: 'm', skin: 3, face: 2, hair: 'hair_short', hairColor: 6, top: 'top_pakaoma', bottom: 'bot_fisherman', head: 'head_ngob' },
    x: 226,
    y: 826,
    idle: 'none',
    lines: ['แม่น้ำโขงกว้างใหญ่ เหมือนใจคนอีสาน', 'ฝั่งโน้นลาว ฝั่งนี้ไทย พี่น้องกันทั้งนั้น', 'ไหลเรือไฟเดือนสิบเอ็ด สวยหลาย!', 'พระธาตุพนมคุ้มครองคนริมโขงมานานแล้ว'],
  },

  // ---------------------------------------------------------------- south
  {
    id: 'aikhai_uncle',
    map: 'ai_khai',
    name: 'ลุงเคล้า',
    role: 'เซียนเลขประจำศาลไอ้ไข่',
    look: { gender: 'm', skin: 2, face: 2, hair: 'hair_buzz', hairColor: 0, top: 'top_aikhai', bottom: 'bot_khaki', neck: 'neck_amulet_big' },
    x: 190,
    y: 794,
    idle: 'none',
    lines: ['ไอ้ไข่ให้โชคแม่นนัก!', 'ไก่ชนปูนปั้นตัวนั้น ลุงแก้บนเองนะ', 'ถูกเลขท้ายสองตัว... ปี 2558', 'ขอดี ๆ เดี๋ยวไอ้ไข่เอ็นดู'],
  },
]

const extra: QuestNpc[] = []

/** Other systems (hub markets, events…) can add quest NPCs at load time. */
export function registerQuestNpcs(list: QuestNpc[]) {
  for (const n of list) if (!QUEST_NPCS.some((x) => x.id === n.id) && !extra.some((x) => x.id === n.id)) extra.push(n)
}

// Hub-market and temple-fair givers (drawn by their own maps).
registerQuestNpcs(HUB_QUEST_NPCS)
// Beach givers (drawn by the quest layer).
registerQuestNpcs(BEACH_QUEST_NPCS)

export function allQuestNpcs(): QuestNpc[] {
  return extra.length ? [...QUEST_NPCS, ...extra] : QUEST_NPCS
}

export function questNpcsOn(map: string): QuestNpc[] {
  return allQuestNpcs().filter((n) => n.map === map)
}

export function questNpc(idOrHotspot: string): QuestNpc | undefined {
  const id = idOrHotspot.startsWith('npc:') ? idOrHotspot.slice(4) : idOrHotspot
  return allQuestNpcs().find((n) => n.id === id)
}

/** Player's standing spot for an NPC. */
export function npcAt(n: QuestNpc): { x: number; y: number } {
  return n.at ?? { x: n.x, y: n.y + 10 }
}

/** Dialog portraits for shop keepers who give quests (`shop:<id>`). */
export const SHOP_KEEPER_LOOKS: Record<string, Partial<AvatarLook>> = {
  mart: { gender: 'f', skin: 1, hair: 'hair_ponytail', hairColor: 0, top: 'top_convenience', bottom: 'bot_black' },
  wat_phra_kaew_icecream: { gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 0, top: 'top_vendor', bottom: 'bot_sarong', head: 'head_vendorband' },
  wat_phra_kaew_amulet: { gender: 'f', skin: 1, hair: 'hair_bob', hairColor: 1, top: 'top_polo', bottom: 'bot_jeans' },
  wat_pho_massage: { gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman', head: 'head_massage' },
  wat_arun_costume: { gender: 'f', skin: 0, face: 1, hair: 'hair_long', hairColor: 3, top: 'top_sabai', bottom: 'bot_jong', head: 'head_jasmine' },
  erawan_dance: { gender: 'f', skin: 1, face: 1, hair: 'hair_bun', hairColor: 0, top: 'top_nangram', bottom: 'bot_jong', head: 'head_chada' },
  golden_mount_drinks: { gender: 'm', skin: 2, face: 2, hair: 'hair_buzz', hairColor: 6, top: 'top_polo', bottom: 'bot_khaki' },
  wat_traimit_gold: { gender: 'm', skin: 0, face: 2, hair: 'hair_short', hairColor: 6, top: 'top_qipao', bottom: 'bot_black', neck: 'neck_goldchain' },
  pathom_chedi_khaolam: { gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 0, top: 'top_vendor', bottom: 'bot_sarong' },
  wat_sothon_eggs: { gender: 'f', skin: 2, face: 1, hair: 'hair_curly', hairColor: 0, top: 'top_floral', bottom: 'bot_sarong', head: 'head_vendorband' },
  wat_samarn_ratwish: { gender: 'f', skin: 1, face: 0, hair: 'hair_ponytail', hairColor: 0, top: 'top_tee_white', bottom: 'bot_jeans', head: 'head_rat_ears' },
  wat_chulamanee_sugar: { gender: 'f', skin: 3, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_mohom', bottom: 'bot_sarong', head: 'head_ngob' },
  wat_mahathat_ayutthaya_rotisaimai: { gender: 'm', skin: 2, face: 0, hair: 'hair_short', hairColor: 0, top: 'top_white', bottom: 'bot_sarong', head: 'head_turban' },
  wat_huay_mongkol_elephant: { gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 0, top: 'top_floral', bottom: 'bot_sarong' },
  wat_yai_phitsanulok_kluaytak: { gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_mohom', bottom: 'bot_sarong' },
  doi_suthep_khaosoi: { gender: 'f', skin: 1, face: 1, hair: 'hair_bun', hairColor: 0, top: 'top_vendor', bottom: 'bot_sin_nan' },
  lampang_luang_chickenbowl: { gender: 'm', skin: 1, face: 0, hair: 'hair_short', hairColor: 0, top: 'top_mohom', bottom: 'bot_khaki' },
  wat_rong_khun_artshop: { gender: 'm', skin: 1, face: 0, hair: 'hair_long', hairColor: 0, top: 'top_white_artist', bottom: 'bot_black', head: 'head_glasses' },
  wat_huay_pla_kang_teahouse: { gender: 'm', skin: 0, face: 2, hair: 'hair_buzz', hairColor: 6, top: 'top_qipao', bottom: 'bot_black' },
  wat_phumin_cloth: { gender: 'f', skin: 1, face: 1, hair: 'hair_bun', hairColor: 0, top: 'top_hilltribe', bottom: 'bot_sin_nan' },
  ya_mo_padmee: { gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_korat', bottom: 'bot_sarong' },
  kham_chanod_offerings: { gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 0, top: 'top_pakaoma', bottom: 'bot_sin_mudmee' },
  nst_mahathat_khanomla: { gender: 'f', skin: 3, face: 1, hair: 'hair_bun', hairColor: 0, top: 'top_floral', bottom: 'bot_batik' },
  nst_mahathat_amulet: { gender: 'm', skin: 2, face: 2, hair: 'hair_buzz', hairColor: 0, top: 'top_polo', bottom: 'bot_khaki', neck: 'neck_amulet_big', head: 'head_glasses' },
  ai_khai_lottery: { gender: 'f', skin: 2, face: 1, hair: 'hair_curly', hairColor: 0, top: 'top_floral', bottom: 'bot_sarong', head: 'head_sunhat' },
  wat_chalong_ohaew: { gender: 'f', skin: 0, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_baba', bottom: 'bot_batik' },
  phuket_big_buddha_tile: { gender: 'm', skin: 2, face: 0, hair: 'hair_short', hairColor: 0, top: 'top_tee_boon', bottom: 'bot_jeans' },
}
