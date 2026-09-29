// Quests in the south: พระธาตุนครศรีธรรมราช, ไอ้ไข่ วัดเจดีย์, วัดฉลอง,
// พระใหญ่ภูเก็ต.

import type { NpcQuestDef } from '../npcQuestTypes'

const IAD = { giver: 'shop:nst_mahathat_khanomla', map: 'nst_mahathat', npcName: 'แม่เอียด' } as const
const NUI = { giver: 'shop:nst_mahathat_amulet', map: 'nst_mahathat', npcName: 'เซียนพระหนุ่ย' } as const
const KLAO = { giver: 'npc:aikhai_uncle', map: 'ai_khai', npcName: 'ลุงเคล้า' } as const
const SOMSRI = { giver: 'shop:ai_khai_lottery', map: 'ai_khai', npcName: 'ป้าสมศรี' } as const
const KIEW = { giver: 'shop:wat_chalong_ohaew', map: 'wat_chalong', npcName: 'อาม่าเกียว' } as const
const ASA = { giver: 'shop:phuket_big_buddha_tile', map: 'phuket_big_buddha', npcName: 'พี่อาสา' } as const

export const QUESTS: NpcQuestDef[] = [
  {
    ...IAD,
    id: 'nst_sartduan_1',
    title: 'ยกหมฺรับวันสารทเดือนสิบ',
    stars: 2,
    level: 20,
    intro: ['หรอยจังฮู้! ขนมลาแม่เอียดกรอบที่สุดในนครเลยนะ', 'เดือนสิบคนใต้จัดหมฺรับไปวัด ทำบุญส่งถึงบรรพบุรุษ มีขนมลา ขนมพอง ขนมบ้า ครบ', 'ช่วยแม่เอียดใส่บาตร แล้วทำกับข้าวใส่บาตรสักจานได้ไหมลูก'],
    lore: ['คนใต้เชื่อว่าเดือนสิบ บรรพบุรุษจะกลับมาเยี่ยมลูกหลาน', 'เลยต้องทำบุญ ทำขนมไปถวายวัด แล้ว "ชิงเปรต" กันสนุกสนาน', 'ขนมลาเหมือนแพรพรรณ ให้บรรพบุรุษนุ่งห่ม ขนมพองเหมือนแพ ให้ข้ามห้วงน้ำ'],
    steps: [
      { event: 'alms', target: 1, text: 'ตักบาตร 1 รอบ', nav: 'alms' },
      { event: 'dish_alms', target: 1, text: 'ใส่บาตรด้วยอาหารฝีมือตัวเอง 1 จาน', nav: 'alms' },
    ],
    reward: { coins: 160, merit: 36, items: { dessert: 3 } },
    done: 'บรรพบุรุษคงอิ่มบุญแน่ ๆ! เอาขนมไทยไปใส่บาตรต่อนะลูก',
  },
  {
    ...NUI,
    id: 'nst_amulet_1',
    title: 'ส่องพระต้องใจนิ่ง',
    stars: 1,
    level: 20,
    intro: ['ส่องได้เลยครับ แท้ทุกองค์! ไม่แท้ยินดีคืนบุญ', 'เคล็ดลับการดูพระคือใจต้องนิ่งครับ ใจไม่นิ่ง ดูอะไรก็เหมือนกันหมด', 'ไปนั่งสมาธิสักนาที แล้วตีระฆังใหญ่สักห้าที ผมจะมอบเหรียญยันต์ให้'],
    steps: [
      { event: 'meditate_sec', target: 60, text: 'นั่งสมาธิรวม 1 นาที' },
      { event: 'bell', target: 5, text: 'ตีระฆังใหญ่ที่วัดพระมหาธาตุ 5 ครั้ง', map: 'nst_mahathat', nav: 'big_bell' },
    ],
    reward: { coins: 110, merit: 24, outfits: ['neck_yant_medal'] },
    done: 'ใจนิ่งแล้วดูหน้าตาผ่องใสขึ้นนะครับ! เหรียญยันต์นี้แท้แน่นอน (ผมแกะเอง)',
  },
  {
    ...KLAO,
    id: 'aikhai_numbers_1',
    title: 'เลขเด็ดสามตัว',
    stars: 2,
    level: 21,
    intro: ['ไอ้ไข่ให้โชคแม่นนัก! ลุงถูกมาแล้ว... ครั้งนึง เมื่อสิบปีก่อน', 'งวดนี้ลุงขาดอีกสามตัว! ช่วยไปขูดเลขมาให้ลุงสามครั้ง', 'แล้วจุดธูปบอกไอ้ไข่ด้วยนะ ว่าลุงเคล้าฝากมา'],
    lore: ['ไอ้ไข่เป็นเด็กวัดที่คนเชื่อว่าคอยช่วยเหลือคนดี', 'ใครสมหวังก็เอาไก่ชนปูนปั้นมาแก้บน หน้าศาลเลยมีไก่เป็นหมื่นตัว', 'ลุงบนไว้ว่าถ้าถูกจะแก้ด้วยไก่ 99 ตัว... ตอนนี้ลุงแก้ไปแล้วหนึ่งตัว (ตัวที่ถูกเมื่อสิบปีก่อน)'],
    replies: { accept: 'จัดไปสามใบ!', decline: 'ไม่เชื่อเรื่องเลขครับ' },
    steps: [
      { event: 'lottery', target: 3, text: 'ขูดเลขมงคล 3 ครั้ง (ซื้อสิทธิ์เพิ่มได้)', nav: 'tree' },
      { event: 'wish', target: 1, text: 'จุดธูปบอกไอ้ไข่', map: 'ai_khai', nav: 'incense' },
    ],
    reward: { coins: 180, merit: 30, outfits: ['head_gamecock'] },
    done: 'เลขสวยทั้งสามตัว! ถ้าไม่ถูก... ลุงจะถือว่าได้ทำบุญ 555 หมวกไก่ชนนี้ให้เป็นเครื่องราง',
  },
  {
    ...SOMSRI,
    id: 'aikhai_lottery_daily',
    title: 'เลขประจำวันป้าสมศรี',
    stars: 1,
    level: 21,
    repeat: 'daily',
    intro: ['เลขเด็ดไอ้ไข่งวดนี้มาแน่! (ถ้าไม่มาก็ทำบุญไป)', 'ขูดเลขมาให้ป้าดูสักใบ ป้าจะได้รู้ว่าวันนี้คนขูดได้เลขอะไร'],
    steps: [{ event: 'lottery', target: 1, text: 'ขูดเลขมงคล 1 ครั้ง', nav: 'tree' }],
    reward: { coins: 40, merit: 8 },
    done: 'จดไว้แล้ว! ป้าจะเอาไปแปะที่แผง ขายดีแน่ ๆ',
  },
  {
    ...KIEW,
    id: 'chalong_bell_1',
    title: 'ประทัดไม่ต้อง ระฆังพอ',
    stars: 1,
    level: 22,
    intro: ['อาม่าได้ยินเสียงประทัดทั้งวัน หูอื้อไปหมดแล้ว', 'ตีระฆังให้ครบแถวแทนเถอะ เสียงไพเราะกว่า บุญก็ได้เหมือนกัน', 'แล้วหยอดตู้ทำบุญบูรณะวัดด้วยนะลูก อาม่าเลี้ยงโอ้เอ๋ว'],
    steps: [
      { event: 'bell_round', target: 1, text: 'ตีระฆังให้ครบแถวที่วัดฉลอง', map: 'wat_chalong', nav: 'bells' },
      { event: 'donate', target: 1, text: 'หยอดตู้ทำบุญที่วัดฉลอง', map: 'wat_chalong', nav: 'donation' },
    ],
    reward: { coins: 120, merit: 26, outfits: ['top_baba'] },
    done: 'ไพเราะกว่าประทัดเยอะเลย! เสื้อบ้าบ๋าตัวนี้อาม่าตัดเองตอนสาว ๆ ให้ลูกนะ',
  },
  {
    ...ASA,
    id: 'bigbuddha_tile_1',
    title: 'กระเบื้องแผ่นนี้เพื่อพระใหญ่',
    stars: 3,
    level: 23,
    intro: ['พระใหญ่ภูเก็ตสูง 45 เมตร ปูหินอ่อนพม่าทั้งองค์ครับ', 'ฐานยังสร้างไม่เสร็จ ทุกกระเบื้องมาจากแรงศรัทธาของทุกคน', 'ร่วมบุญสองครั้ง ขัดเครื่องทองเหลือง แล้วนั่งชมวิวทะเลอันดามันสักนาทีนะครับ'],
    lore: ['จากตรงนี้มองเห็นอ่าวฉลอง เกาะเฮ และทะเลอันดามัน', 'ตอนพระอาทิตย์ตก องค์พระเป็นสีทองทั้งองค์', 'ผมเป็นอาสามาแปดปี เห็นทุกวันก็ยังขนลุกครับ'],
    steps: [
      { event: 'donate', target: 2, text: 'ร่วมบุญที่พระใหญ่ 2 ครั้ง', map: 'phuket_big_buddha', nav: 'donation' },
      { event: 'job', target: 1, text: 'ขัดเครื่องทองเหลืองที่พระใหญ่', map: 'phuket_big_buddha', nav: 'job:polish_brass' },
      { event: 'meditate_sec', target: 60, text: 'นั่งชมวิวทะเลอันดามัน 1 นาที', map: 'phuket_big_buddha', nav: 'view' },
    ],
    reward: { coins: 200, merit: 45, items: { gold_leaf: 2 } },
    done: 'ชื่อคุณจะอยู่บนกระเบื้องฐานพระใหญ่ตลอดไปครับ อนุโมทนาบุญ!',
  },
]
