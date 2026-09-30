// Beach-only cosmetics: sold by the stalls of one beach each
// (`shopOnly: <beachId>`). The hat and the shades have their own art in
// art/doll.ts and art/avatar.ts (acc 'beachstraw' / 'sunsetshades'); the pareo
// and the shirt are drawn from their garment data.

import type { OutfitItem } from './outfits'

export const BEACH_OUTFITS: OutfitItem[] = [
  {
    id: 'head_beach_strawhat',
    slot: 'head',
    shopOnly: 'beach_patong',
    name: 'หมวกสานคาดแว่นริมหาด',
    desc: 'หมวกสานปีกกว้างคาดริบบิ้นฟ้า เสียบแว่นดำไว้บนปีกหมวก ดอกชบาข้างหูหนึ่งดอก ลุคเที่ยวทะเลครบในใบเดียว',
    price: 180,
    acc: 'beachstraw',
    category: 'accessory',
    tags: ['souvenir', 'set:beach'],
  },
  {
    id: 'head_sunset_shades',
    slot: 'head',
    shopOnly: 'beach_huahin',
    name: 'แว่นพระอาทิตย์ตก',
    desc: 'เลนส์ไล่สีส้มชมพูเหมือนท้องฟ้าหัวหินตอนหกโมงเย็น ใส่แล้วทุกช่วงเวลาเป็นโกลเด้นอาวร์',
    price: 120,
    acc: 'sunsetshades',
    category: 'accessory',
    tags: ['souvenir', 'set:beach'],
  },
  {
    id: 'bot_beach_pareo',
    slot: 'bottom',
    shopOnly: 'beach_samui',
    name: 'ผ้าปาเต๊ะลายชบา',
    desc: 'ผ้าปาเต๊ะสีฟ้าทะเลลายดอกชบาชมพู ผูกเป็นกระโปรงเดินหาด หรือคลุมไหล่ขึ้นไปกราบพระใหญ่ก็สุภาพ',
    price: 140,
    category: 'thai',
    bottom: { kind: 'sarong', main: '#3aa8c8', shade: '#2a84a4', pattern: 'hawaii', patternColor: '#ff7eaa', patternColor2: '#fff3a6', hem: '#ffd54f' },
    tags: ['souvenir', 'set:beach'],
  },
  {
    id: 'top_beach_wave',
    slot: 'top',
    shopOnly: 'beach_railay',
    name: 'เสื้อฮาวายทะเลอันดามัน',
    desc: 'เสื้อเชิ้ตลายดอกสีเขียวมรกตเหมือนน้ำทะเลไร่เลย์ ใส่ไปนั่งเรือหางยาวคือเข้ากันสุด',
    price: 130,
    category: 'modern',
    top: { main: '#2fb0a0', shade: '#228a7e', sleeve: 'short', pattern: 'hawaii', patternColor: '#fffaf0', patternColor2: '#ffd23f', collar: 'camp', placket: 'buttons', buttonColor: '#fffaf0', hem: 'out' },
    tags: ['souvenir', 'set:beach'],
  },
]
