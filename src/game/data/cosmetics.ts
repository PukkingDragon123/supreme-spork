// v4 wardrobe drop: pack & battle-pass exclusives plus a big "Thai soft
// power" pop-culture collection for the shop. Art lives in art/doll.ts and
// art/avatar.ts (search for "v4 cosmetics"). Parody names only: no real
// brands or characters.
//
// `exclusive` items never appear in the general shop; they are granted by
// packs (data/store.ts), the battle pass or events via grantOutfit().

import type { OutfitItem, ShoeArt } from './outfits'

const bootie = (main: string, shade: string, sole?: string, accent?: string): ShoeArt => ({ kind: 'shoe', main, shade, sole: sole ?? shade, accent: accent ?? main })

// ---------------------------------------------------------------------------
// Starter pack (แพ็กเริ่มต้นช้างน้อย)

export const STARTER_PACK_OUTFITS = ['hat_elephant', 'bottom_elephant_pants'] as const

const PACK: OutfitItem[] = [
  {
    id: 'hat_elephant',
    slot: 'head',
    name: 'หมวกช้าง',
    desc: 'หมวกหัวช้างน้อยงวงห้อย หูกางปุ๊กปิ๊ก ใส่แล้วบุญวิ่งเข้าหา',
    price: 150,
    acc: 'elephanthat',
    category: 'thai',
    exclusive: 'pack',
    tags: ['set:chang'],
  },
  {
    id: 'bottom_elephant_pants',
    slot: 'bottom',
    name: 'กางเกงช้าง',
    desc: 'กางเกงช้างรุ่นลิมิเต็ดสีแดงทับทิมลายช้างทอง ใส่คู่หมวกช้างคือปังมาก',
    price: 120,
    category: 'thai',
    exclusive: 'pack',
    bottom: { kind: 'loose', main: '#d8435f', shade: '#a8304a', pattern: 'elephant', patternColor: '#ffd54f', hem: '#ffd54f', belt: '#ffd54f' },
    tags: ['set:chang'],
  },

  // -------------------------------------------------------------------------
  // Special pack "หนีภัยน้ำท่วม"
  {
    id: 'suit_scuba',
    slot: 'suit',
    name: 'ชุดดำน้ำหนีน้ำท่วม',
    desc: 'ชุดประดาน้ำครบเซ็ต หน้ากาก ท่อหายใจ ถังอากาศสีเหลือง น้ำมาเท่าไหร่ก็ไม่กลัว',
    price: 480,
    category: 'costume',
    exclusive: 'pack',
    suit: { kind: 'scuba', main: '#2d3650', shade: '#1f2539', belly: '#26b8c4', accent: '#ffd23f', accent2: '#9fe8ff', paws: '#2d3650' },
    tags: ['suit', 'set:flood'],
  },
  {
    id: 'shoes_flippers',
    slot: 'shoes',
    name: 'ตีนกบดำน้ำ',
    desc: 'ตีนกบสีเหลืองสด เดินบนบกต้วมเตี้ยม แต่ในน้ำเร็วยิ่งกว่าเรือหางยาว',
    price: 160,
    category: 'fun',
    exclusive: 'pack',
    shoes: { kind: 'flipper', main: '#ffd23f', shade: '#e0a820', sole: '#b8801a', accent: '#2d3650' },
    tags: ['set:flood'],
  },
]

// ---------------------------------------------------------------------------
// Battle pass, free tier "ผู้ประสบภัย"

const PASS_FREE: OutfitItem[] = [
  {
    id: 'head_basin',
    slot: 'head',
    name: 'กะละมังกันน็อค',
    desc: 'กะละมังสแตนเลสคว่ำหัว ผูกเชือกฟางใต้คาง ของมันต้องมีตอนน้ำมา',
    price: 60,
    acc: 'basin',
    category: 'fun',
    exclusive: 'pass_free',
    tags: ['set:flood_victim'],
  },
  {
    id: 'top_swim_vest',
    slot: 'top',
    name: 'เสื้อชูชีพสีส้ม',
    desc: 'เสื้อชูชีพส้มแจ๊ด สายรัดสองเส้น ลอยตุ๊บป่องได้ทั้งวัน',
    price: 90,
    category: 'fun',
    exclusive: 'pass_free',
    top: {
      main: '#5a8de0',
      shade: '#3d63b5',
      sleeve: 'short',
      collar: 'crew',
      hem: 'out',
      extra: 'lifevest',
      vest: { main: '#ff7a1a', shade: '#d4580c', trim: '#2e2840', patchColor: '#ffb066' },
    },
    tags: ['set:flood_victim'],
  },
  {
    id: 'neck_whistle',
    slot: 'neck',
    name: 'นกหวีดขอความช่วยเหลือ',
    desc: 'นกหวีดสีส้มคล้องคอ ปรี๊ด ๆ สามทีแปลว่าช่วยด้วยจ้า',
    price: 40,
    acc: 'whistle',
    category: 'fun',
    exclusive: 'pass_free',
    tags: ['set:flood_victim'],
  },
  {
    id: 'shoes_rain_boots',
    slot: 'shoes',
    name: 'บูทยางสีเหลือง',
    desc: 'บูทยางลุยน้ำสีเหลืองเป็ด น้ำท่วมถึงเข่าก็ยังเดินไปวัดได้',
    price: 70,
    category: 'fun',
    exclusive: 'pass_free',
    shoes: { kind: 'boot', main: '#ffd23f', shade: '#e0a820', sole: '#8a6a2a', accent: '#fffaf0' },
    tags: ['set:flood_victim'],
  },
  {
    id: 'back_swim_ring',
    slot: 'back',
    name: 'ห่วงยางเป็ดเหลือง',
    desc: 'ห่วงยางหัวเป็ดสวมเอว ก๊าบ ๆ ลอยน้ำได้ ลอยใจได้',
    price: 90,
    acc: 'duckring',
    category: 'fun',
    exclusive: 'pass_free',
    tags: ['set:flood_victim'],
  },
  {
    id: 'hand_bailer',
    slot: 'hand',
    name: 'ขันตักน้ำ',
    desc: 'ขันพลาสติกสีชมพูใบโปรด ตักน้ำออกจากบ้านทีละขัน สู้ ๆ',
    price: 30,
    acc: 'bailer',
    category: 'fun',
    exclusive: 'pass_free',
    tags: ['set:flood_victim'],
  },
]

// ---------------------------------------------------------------------------
// Battle pass, premium tier "กู้ภัย"

const PASS_PREMIUM: OutfitItem[] = [
  {
    id: 'suit_rescue',
    slot: 'suit',
    name: 'ชุดหน่วยกู้ภัยเต็มยศ',
    desc: 'ชุดอาสากู้ภัยสีส้มแถบสะท้อนแสง ตราหน่วยที่อก หมวกนิรภัยพร้อมไฟฉาย ฮีโร่ตัวจริงหน้าวัด',
    price: 600,
    category: 'costume',
    exclusive: 'pass_premium',
    suit: {
      kind: 'rescue',
      head: 'crown',
      main: '#ff7a1a',
      shade: '#d4580c',
      accent: '#e8eef8',
      accent2: '#2e3a6b',
      top: { sleeve: 'long', collar: 'shirt', collarColor: '#2e3a6b', placket: 'zip', fit: 'regular', hem: 'tucked', cuff: '#e8eef8', stripe: '#e8eef8' },
      bottom: { kind: 'pants', main: '#2e3a6b', shade: '#212a52', detail: 'cargo', stripe: '#e8eef8', belt: '#2e2840', buckle: '#e9b949' },
      feet: { kind: 'boot', main: '#2e2a36', shade: '#1f1b25', sole: '#141118', accent: '#ff7a1a' },
    },
    tags: ['suit', 'set:rescue'],
  },
  {
    id: 'head_rescue_helmet',
    slot: 'head',
    name: 'หมวกนิรภัยกู้ภัย',
    desc: 'หมวกนิรภัยสีขาวคาดส้ม ไฟฉายหน้าหมวกส่องทางในคืนน้ำท่วม',
    price: 150,
    acc: 'rescuehelmet',
    category: 'work',
    exclusive: 'pass_premium',
    tags: ['set:rescue'],
  },
  {
    id: 'top_rescue_jacket',
    slot: 'top',
    name: 'เสื้อกั๊กกู้ภัยสะท้อนแสง',
    desc: 'เสื้อกั๊กส้มแถบสะท้อนแสงสองชั้น ปักตราหน่วยกู้ภัยด้านหลัง',
    price: 160,
    category: 'work',
    exclusive: 'pass_premium',
    top: {
      main: '#2e3a6b',
      shade: '#212a52',
      sleeve: 'long',
      collar: 'shirt',
      collarColor: '#3d4a80',
      hem: 'out',
      extra: 'rescue',
      vest: { main: '#ff7a1a', shade: '#d4580c', trim: '#e8eef8', patchColor: '#e8eef8' },
    },
    tags: ['set:rescue'],
  },
  {
    id: 'hand_megaphone',
    slot: 'hand',
    name: 'โทรโข่งกู้ภัย',
    desc: 'โทรโข่งสีขาวแดง "ทางนี้ครับ! ทางนี้!" เสียงดังฟังชัดทั้งซอย',
    price: 100,
    acc: 'megaphone',
    category: 'work',
    exclusive: 'pass_premium',
    tags: ['set:rescue'],
  },
  {
    id: 'back_rescue_tube',
    slot: 'back',
    name: 'ห่วงชูชีพกู้ภัย',
    desc: 'ห่วงชูชีพแดงขาวสะพายหลัง พร้อมโยนช่วยทุกคนที่ลอยคออยู่',
    price: 140,
    acc: 'rescuetube',
    category: 'work',
    exclusive: 'pass_premium',
    tags: ['set:rescue'],
  },
  {
    id: 'shoes_rescue_boots',
    slot: 'shoes',
    name: 'บูทกู้ภัยหัวเหล็ก',
    desc: 'บูทหนังดำพื้นกันลื่น แถบส้มสะท้อนแสง ลุยน้ำลุยโคลนได้ทุกที่',
    price: 110,
    category: 'work',
    exclusive: 'pass_premium',
    shoes: { kind: 'boot', main: '#2e2a36', shade: '#1f1b25', sole: '#141118', accent: '#ff7a1a' },
    tags: ['set:rescue'],
  },
  {
    id: 'back_paddle',
    slot: 'back',
    name: 'ไม้พายเรือกู้ภัย',
    desc: 'ไม้พายไม้สักด้ามยาวสะพายหลัง พายเรือไปส่งข้าวกล่องให้ทุกบ้าน',
    price: 90,
    acc: 'paddle',
    category: 'work',
    exclusive: 'pass_premium',
    tags: ['set:rescue'],
  },
]

// ---------------------------------------------------------------------------
// Buyable pop culture & Thai soft power (general shop)

const POP: OutfitItem[] = [
  // ---- head
  { id: 'head_tomyum', slot: 'head', name: 'หมวกต้มยำกุ้ง', desc: 'หม้อไฟต้มยำน้ำข้นกุ้งแม่น้ำตัวโต หอมตะไคร้ข่าใบมะกรูด ซอฟต์พาวเวอร์ตัวแม่', price: 160, acc: 'tomyum', category: 'fun', tags: ['new', 'softpower', 'food'] },
  { id: 'head_mango_sticky', slot: 'head', name: 'หมวกข้าวเหนียวมะม่วง', desc: 'มะม่วงน้ำดอกไม้ทั้งลูกบนข้าวเหนียวมูนราดกะทิ โรยถั่วทองกรอบ ๆ', price: 150, acc: 'mangohat', category: 'fun', tags: ['new', 'softpower', 'food'] },
  { id: 'head_mookata', slot: 'head', name: 'หมวกกระทะหมูกระทะ', desc: 'กระทะโดมย่างหมูสามชั้นขอบน้ำซุป กันแดดได้ กันหิวได้ ชวนแก๊งไปกินต่อได้', price: 170, acc: 'mookata', category: 'fun', tags: ['new', 'softpower', 'food'] },
  { id: 'head_platu', slot: 'head', name: 'ที่คาดผมปลาทูแม่กลอง', desc: 'ปลาทูหน้างอคอหักสองตัวบนเข่งจิ๋ว ของดีแม่กลองที่ใส่แล้วหน้าไม่งอตาม', price: 90, acc: 'platu', category: 'fun', tags: ['new', 'food'] },
  { id: 'head_malai_bun', slot: 'head', name: 'มาลัยพันมวยผม', desc: 'เทรนด์สาวเจนซีปากคลองตลาด พันมาลัยมะลิดาวเรืองรอบมวยผม หอมทั้งวัน', price: 120, acc: 'malaibun', category: 'thai', tags: ['new', 'trend', 'softpower'] },
  { id: 'head_curlers', slot: 'head', name: 'โรลม้วนผมป้าข้างบ้าน', desc: 'โรลสีพาสเทลเต็มหัว พร้อมเม้าท์มอยหน้าปากซอยตอนเจ็ดโมงเช้า', price: 60, acc: 'curlers', category: 'fun', tags: ['new', 'funny'] },
  { id: 'head_hippo_ears', slot: 'head', name: 'ที่คาดหูฮิปโปแคระ', desc: 'หูกลมจิ๋วสีเทาอมชมพู กระดิกดุ๊กดิ๊ก แก้มยุ้ยเด้งดึ๋งตาม', price: 70, acc: 'hippoears', category: 'accessory', tags: ['new', 'viral'] },

  // ---- neck
  { id: 'neck_saimu', slot: 'neck', name: 'สร้อยหินมงคลสายมู', desc: 'หินนำโชคเจ็ดสี ตะกรุดทอง และลูกแก้วมูเตลู ครบจบในเส้นเดียว มั่นใจขึ้น 200%', price: 150, acc: 'saimu', category: 'temple', tags: ['new', 'softpower', 'mutelu'] },
  { id: 'neck_sabai_genz', slot: 'neck', name: 'สไบพาดบ่าสายเจนซี', desc: 'สไบลายไทยพาดบ่าคู่เสื้อยืด มิกซ์แอนด์แมตช์แบบไทยร่วมสมัย', price: 110, acc: 'sabaigenz', category: 'thai', tags: ['new', 'trend', 'softpower'] },
  { id: 'neck_towel', slot: 'neck', name: 'ผ้าขนหนูพาดคอ', desc: 'ผ้าขนหนูลายทางพาดคอซับเหงื่อ ร้อนสี่สิบองศาก็ยังชิล', price: 35, acc: 'towel', category: 'fun', tags: ['new', 'funny'] },

  // ---- hand
  { id: 'hand_lotus_bouquet', slot: 'hand', name: 'ช่อบัวปากคลอง', desc: 'ช่อบัวชมพูมัดเชือกฟางจากปากคลองตลาด พร็อพถ่ายรูปที่สายเจนซีต้องมี', price: 80, acc: 'lotusbouquet', category: 'thai', tags: ['new', 'trend'] },
  { id: 'hand_ringlight', slot: 'hand', name: 'ไม้เซลฟี่ไฟวงแหวน', desc: 'ไฟวงแหวนหน้าเนียนกริบ ไลฟ์ขายของก็ได้ ไลฟ์สวดมนต์ก็ปัง', price: 90, acc: 'ringlight', category: 'modern', tags: ['new', 'set:selfie'] },
  { id: 'hand_jelly_bag', slot: 'hand', name: 'กระเป๋าเจลลี่ใส', desc: 'กระเป๋าเยลลี่สีลูกกวาดใสแจ๋ว มองเห็นทุกอย่างข้างใน รวมถึงพระเครื่อง', price: 120, acc: 'jellybag', category: 'modern', tags: ['new', 'trend'] },
  { id: 'hand_dubai_choc', slot: 'hand', name: 'ช็อกโกแลตดูไบเยิ้ม ๆ', desc: 'หักครึ่งแล้วไส้พิสตาชิโอเขียวเยิ้มออกมา ถ่ายคลิปยังไงก็ไวรัล', price: 70, acc: 'dubaichoc', category: 'fun', tags: ['new', 'viral', 'food'] },
  { id: 'hand_krapao_box', slot: 'hand', name: 'ข้าวกะเพราไข่ดาวกล่อง', desc: 'คำตอบของคำถาม "กินอะไรดี" ทุกมื้อ ไข่ดาวไม่สุก เผ็ดน้อย', price: 45, acc: 'krapaobox', category: 'fun', tags: ['new', 'food', 'softpower'] },

  // ---- back
  { id: 'back_thaitea', slot: 'back', name: 'เป้แก้วชาไทยไข่มุก', desc: 'เป้ทรงแก้วชาไทยส้มจัดจ้าน ไข่มุกดำลอยฟ่อง หลอดเสียบมาพร้อม', price: 180, acc: 'thaiteabag', category: 'modern', tags: ['new', 'softpower', 'food'] },
  { id: 'back_blindbox', slot: 'back', name: 'น้องลาบุญบู้ห้อยกระเป๋า', desc: 'มอนสเตอร์กล่องสุ่มฟันแหลมยิ้มแฉ่งห้อยเป้ใบจิ๋ว สุ่มได้ตัวนี้คือดวงดีมาก', price: 220, acc: 'blindbox', category: 'fun', tags: ['new', 'viral', 'arttoy'] },

  // ---- tops
  {
    id: 'top_floral_neon',
    slot: 'top',
    name: 'เสื้อลายดอกสะท้อนแสง',
    desc: 'เชิ้ตลายดอกชบาเขียวนีออนชมพูช็อก ใส่ไปงานวัดก็มองเห็นแต่ไกล',
    price: 90,
    category: 'modern',
    top: { main: '#3ee07a', shade: '#22b25a', sleeve: 'short', pattern: 'hawaii', patternColor: '#ff4fa0', patternColor2: '#fff35a', collar: 'camp', placket: 'buttons', buttonColor: '#fffaf0', hem: 'out' },
    tags: ['new', 'softpower'],
  },
  {
    id: 'top_kradao',
    slot: 'top',
    name: 'เสื้อคอกระเช้ายาย',
    desc: 'เสื้อคอกระเช้าผ้าป่านลายดอกจิ๋ว ใส่สบายแบบคุณยายสายชิล',
    price: 60,
    category: 'thai',
    top: { main: '#f6f0ff', shade: '#d8cdea', sleeve: 'none', collar: 'tank', collarColor: '#c9b8e6', pattern: 'floral', patternColor: '#b98ae6', patternColor2: '#ff9fc0', fit: 'regular', hem: 'out' },
    tags: ['new', 'funny'],
  },
  {
    id: 'top_tee_mutelu',
    slot: 'top',
    name: 'เสื้อสกรีนลูกแก้วมูเตลู',
    desc: 'ลูกแก้วทำนายดวงพลังดาวเจ็ดดวง สายมูใส่แล้วดวงเฮงขึ้นทันตา',
    price: 70,
    category: 'fun',
    top: { main: '#3a2d5e', shade: '#2a2046', sleeve: 'short', collar: 'crew', graphic: 'mutelu', graphicColor: '#b98ae6', graphicColor2: '#ffd54f', hem: 'out' },
    tags: ['new', 'mutelu'],
  },
  {
    id: 'top_tee_hippo',
    slot: 'top',
    name: 'เสื้อสกรีนน้องหมูดึ๋ง',
    desc: 'ฮิปโปแคระหน้ามุ่ยแก้มยุ้ย ขวัญใจโซเชียลทั่วโลก',
    price: 70,
    category: 'fun',
    top: { main: '#fffaf0', shade: '#e6dccb', sleeve: 'short', collar: 'crew', graphic: 'hippo', graphicColor: '#9a8fa8', graphicColor2: '#ff9fc0', hem: 'out' },
    tags: ['new', 'viral'],
  },
  {
    id: 'top_sabai_pink',
    slot: 'top',
    name: 'ชุดไทยสไบเฉียงชมพูพาสเทล',
    desc: 'ชุดไทยสไบเฉียงสีชมพูหวาน ถ่ายรูปวัดอรุณตอนแสงเย็นคือเริ่ดมาก',
    price: 200,
    category: 'thai',
    gender: 'f',
    top: { main: '#ffb3cf', shade: '#e88aae', trim: '#ffe7a0', sleeve: 'long', extra: 'sabai', extraColor: '#ffe7a0', pattern: 'silk', patternColor: '#ffd6e4', collar: 'none', fit: 'fitted', hem: 'tucked' },
    tags: ['new', 'set:selfie', 'softpower'],
  },

  // ---- bottoms
  {
    id: 'bot_muay_gold',
    slot: 'bottom',
    name: 'กางเกงมวยไทยดำทอง',
    desc: 'ผ้าซาตินดำขลิบทอง เอวผ้าคาดตัวอักษรทอง สายต่อยก็ได้ สายถ่ายรูปก็ดี',
    price: 110,
    category: 'thai',
    bottom: { kind: 'shorts', main: '#2e2a36', shade: '#1f1b25', length: 'short', detail: 'muay', band: '#ffd54f', bandText: '#2e2a36', hem: '#ffd54f' },
    tags: ['new', 'softpower', 'muaythai'],
  },
  {
    id: 'bot_sin_pink',
    slot: 'bottom',
    name: 'ผ้าซิ่นไหมชมพูทอง',
    desc: 'ซิ่นไหมยกดอกสีชมพูทอง เข้าชุดกับสไบเฉียงชมพู',
    price: 140,
    category: 'thai',
    gender: 'f',
    bottom: { kind: 'sarong', main: '#e88aae', shade: '#c9658e', pattern: 'thai', patternColor: '#ffe7a0', hem: '#ffd54f' },
    tags: ['new', 'set:selfie'],
  },

  // ---- shoes
  {
    id: 'shoes_hippo',
    slot: 'shoes',
    name: 'สลิปเปอร์ฮิปโปแคระ',
    desc: 'สลิปเปอร์หน้าฮิปโปงับเท้าเบา ๆ นุ่มฟูเดินเงียบกริบ',
    price: 80,
    category: 'fun',
    shoes: { kind: 'slipper', main: '#a99db8', shade: '#877a99', sole: '#ffb3cf', accent: '#ffb3cf' },
    tags: ['new', 'viral'],
  },

  // ---- kigurumi suits
  {
    id: 'suit_hippo',
    slot: 'suit',
    name: 'ชุดฮิปโปแคระเด้งดึ๋ง',
    desc: 'ชุดฮิปโปแคระตัวอวบ แก้มชมพู ขี้งอนแต่น่ารัก งับได้แต่ไม่เจ็บ',
    price: 380,
    level: 3,
    category: 'costume',
    suit: { kind: 'hippo', main: '#a99db8', shade: '#877a99', belly: '#e9d6e0', accent: '#ff9fc0', accent2: '#6e6480', paws: '#a99db8', feet: bootie('#877a99', '#6e6480', '#5a5068', '#ffb3cf') },
    tags: ['suit', 'tail', 'new', 'viral'],
  },
  {
    id: 'suit_monitor',
    slot: 'suit',
    name: 'ชุดตัวเงินตัวทอง',
    desc: 'เรียกให้ถูกนะ "ตัวเงินตัวทอง" ใส่แล้วเงินไหลมาทองไหลมา ลายจุดเหลืองเงางาม',
    price: 320,
    level: 2,
    category: 'costume',
    suit: { kind: 'monitor', main: '#5c6b4a', shade: '#465338', belly: '#d9d59a', accent: '#f2d04a', accent2: '#ff6f7a', pattern: 'dots', patternColor: '#e8cf52', paws: '#5c6b4a', feet: bootie('#465338', '#34402a', '#2a3322', '#f2d04a') },
    tags: ['suit', 'tail', 'new', 'mutelu'],
  },
  {
    id: 'suit_capybara',
    slot: 'suit',
    name: 'ชุดคาปิบาร่าชิลล์',
    desc: 'ชุดคาปิบาร่าหน้านิ่ง มีส้มยูซุลอยบนหัว ใจเย็นที่สุดในสามโลก',
    price: 340,
    level: 2,
    category: 'costume',
    suit: { kind: 'capybara', main: '#b58456', shade: '#946640', belly: '#d9ad7c', accent: '#ffb02e', accent2: '#5ea653', paws: '#946640', feet: bootie('#946640', '#7a5232', '#5e3e26', '#d9ad7c') },
    tags: ['suit', 'new', 'viral'],
  },
  {
    id: 'suit_butterbear',
    slot: 'suit',
    name: 'ชุดหมีเนยถั่ว',
    desc: 'มาสคอตหมีเนยถั่วสีคาราเมล ผูกโบว์ใส่หมวกเชฟจิ๋ว เต้นเก่งจนแฟนคลับกรี๊ดทั้งห้าง',
    price: 420,
    level: 4,
    category: 'costume',
    suit: { kind: 'butterbear', main: '#f2c97a', shade: '#d9a756', belly: '#fff3d6', accent: '#6fb8f0', accent2: '#fbfcff', paws: '#f2c97a', feet: bootie('#d9a756', '#b8863e', '#9a6a2e', '#fff3d6') },
    tags: ['suit', 'new', 'softpower', 'mascot'],
  },
]

export const V4_OUTFITS: OutfitItem[] = [...PACK, ...PASS_FREE, ...PASS_PREMIUM, ...POP]

/** Ids by where they come from (handy for other systems and tests). */
export const PASS_FREE_OUTFIT_IDS = PASS_FREE.map((o) => o.id)
export const PASS_PREMIUM_OUTFIT_IDS = PASS_PREMIUM.map((o) => o.id)
export const PACK_OUTFIT_IDS = PACK.map((o) => o.id)
export const POP_OUTFIT_IDS = POP.map((o) => o.id)
