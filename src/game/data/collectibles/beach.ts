// Beach collectibles (group `beach`): shells and sea finds picked up in the
// beach mini-games (never sold, `source: 'reward'`), beach souvenirs sold at
// the beach stalls (`place` = beach id, always in stock there), and a few
// quest-only prizes. Motif art: src/art/beachMotifs.ts.

import type { CollectibleDef, CollectibleGroup, Rarity } from '../collectibleTypes'

export const S_SHELLS = 'เปลือกหอยชายหาด'
export const S_BEACH = 'ของที่ระลึกชายหาด'

const FIND = 'เก็บได้จากมินิเกมริมหาด (เก็บเปลือกหอย เก็บขยะ ดำน้ำ)'

/** Shells and sea finds, commonest first. */
export const BEACH_SHELLS: CollectibleDef[] = [
  { id: 'bc_shell_donax', name: 'หอยเสียบลายรุ้ง', desc: 'หอยสองฝาตัวจิ๋วที่มุดทรายเก่งที่สุด ฝาเปล่ามีลายรุ้งจาง ๆ เหมือนเล็บทาสี', rarity: 'common', kind: 'charm', series: S_SHELLS, value: 20, art: { motif: 'clam', palette: ['#f0d8e0', '#c8a0b8', '#fffaf0'] }, source: 'reward', hint: FIND },
  { id: 'bc_shell_meretrix', name: 'หอยตลับลายคลื่น', desc: 'ฝาหอยตลับสีครีมลายหยักเหมือนคลื่น เก็บไว้ใส่ตลับแป้งก็ได้', rarity: 'common', kind: 'charm', series: S_SHELLS, value: 22, art: { motif: 'clam', palette: ['#e8d4a8', '#9a7a58', '#fffaf0'] }, source: 'reward', hint: FIND },
  { id: 'bc_seaglass', name: 'แก้วทะเลสีเขียว', desc: 'เศษขวดแก้วที่ทะเลขัดจนมนเรียบนับสิบปี ขยะกลายเป็นอัญมณี', rarity: 'uncommon', kind: 'charm', series: S_SHELLS, value: 45, art: { motif: 'seaglass', palette: ['#86d6c0', '#4f9a88', '#e8fff8'] }, source: 'reward', hint: FIND },
  { id: 'bc_shell_cowrie', name: 'หอยเบี้ยลายเสือ', desc: 'หอยเบี้ยมันวาวลายจุด สมัยก่อนใช้แทนเงินตรา เก็บไว้เงินทองไหลมา', rarity: 'uncommon', kind: 'charm', series: S_SHELLS, value: 55, art: { motif: 'cowrie', palette: ['#f0c890', '#8a5a3a', '#fffaf0'] }, source: 'reward', hint: FIND },
  { id: 'bc_shell_scallop', name: 'หอยพัดสีส้ม', desc: 'หอยพัดสีส้มอมชมพูเหมือนพระอาทิตย์ตก ลายรัศมีสวยทุกมุม', rarity: 'uncommon', kind: 'charm', series: S_SHELLS, value: 60, art: { motif: 'scallop', palette: ['#f5a55a', '#d0661f', '#ffe0b8'] }, source: 'reward', hint: FIND },
  { id: 'bc_sanddollar', name: 'เหรียญทะเล', desc: 'โครงเม่นทะเลแบนรูปดอกไม้ห้ากลีบ เจอทั้งแผ่นไม่แตกถือว่าดวงดีมาก', rarity: 'rare', kind: 'charm', series: S_SHELLS, value: 120, art: { motif: 'sanddollar', palette: ['#f4ecd8', '#c8b490', '#fffaf0'] }, source: 'reward', hint: FIND },
  { id: 'bc_shell_conch', name: 'หอยสังข์หนาม', desc: 'หอยสังข์เปลือกหนาม เอาแนบหูแล้วได้ยินเสียงคลื่น (จริง ๆ คือเสียงเลือดเราเอง)', rarity: 'rare', kind: 'figure', series: S_SHELLS, value: 140, art: { motif: 'conch', palette: ['#f0d8c0', '#e0908a', '#fffaf0'] }, source: 'reward', hint: FIND },
  { id: 'bc_shell_goldcowrie', name: 'หอยเบี้ยทอง', desc: 'หอยเบี้ยสีทองอร่ามหายากมาก ชาวเลเชื่อว่าเป็นเครื่องรางค้าขายร่ำรวย', rarity: 'epic', kind: 'charm', series: S_SHELLS, value: 320, art: { motif: 'cowrie', palette: ['#ffd54f', '#c98a2a', '#fff3c4'], foil: true }, source: 'reward', hint: FIND },
  { id: 'bc_pearl', name: 'ไข่มุกอันดามัน', desc: 'ไข่มุกกลมใสสีชมพูอ่อนจากหอยมุกกลางแนวปะการัง ส่องแดดแล้วเป็นประกายรุ้ง', rarity: 'epic', kind: 'relic', series: S_SHELLS, value: 380, art: { motif: 'pearl', palette: ['#fff0f4', '#c8a0c0', '#ffffff'], foil: true }, source: 'reward', hint: 'ลุ้นได้จากการดำน้ำดูปะการัง' },
  { id: 'bc_shell_sacred', name: 'หอยสังข์ทักษิณาวัฏ', desc: 'หอยสังข์เวียนขวาหายากยิ่ง ใช้หลั่งน้ำพระพุทธมนต์ในพิธีมงคล เจอหนึ่งในล้าน!', rarity: 'legendary', kind: 'relic', series: S_SHELLS, value: 900, art: { motif: 'sacredconch', palette: ['#fffaf0', '#ffd54f', '#e0c8a8'], foil: true }, source: 'reward', tradeable: false, hint: 'ของหายากที่สุดริมหาด เก็บเปลือกหอยทุกวันอาจได้เจอ' },
]

/** Souvenirs sold at the beach stalls (two per beach). */
const SOUVENIRS: CollectibleDef[] = [
  { id: 'bc_bs_ring', name: 'พวงกุญแจห่วงยางบางแสน', desc: 'ห่วงยางสีขาวจิ๋ว ลอยน้ำได้จริง (แต่ตัวเราไม่ลอยด้วยนะ)', rarity: 'common', kind: 'keychain', series: S_BEACH, place: 'beach_bangsaen', value: 40, art: { motif: 'swimring', palette: ['#fffaf0', '#e8514a', '#5aa9e8'] } },
  { id: 'bc_bs_monkey', name: 'ตุ๊กตาลิงเขาสามมุขฉกแว่น', desc: 'ลิงแสมใส่แว่นกันแดดที่เพิ่งขโมยมา ทำหน้าไม่รู้ไม่ชี้', rarity: 'uncommon', kind: 'plush', series: S_BEACH, place: 'beach_bangsaen', value: 95, art: { motif: 'monkey', palette: ['#b8906a', '#f0c8a0', '#2e2840'] } },
  { id: 'bc_hh_station', name: 'โมเดลสถานีรถไฟหัวหิน', desc: 'พลับพลาทรงไทยสีแดงครีมริมชานชาลา สวยจนคนมาถ่ายรูปมากกว่ามาขึ้นรถไฟ', rarity: 'rare', kind: 'figure', series: S_BEACH, place: 'beach_huahin', value: 210, art: { motif: 'station', palette: ['#c8343f', '#fff1d6', '#ffd54f'] } },
  { id: 'bc_hh_horse', name: 'ม้าน้อยหัวหิน', desc: 'ม้าตัวจิ๋วห้อยพู่สีแดง ขี่เลียบหาดได้ในจินตนาการ', rarity: 'uncommon', kind: 'toy', series: S_BEACH, place: 'beach_huahin', value: 90, art: { motif: 'horse', palette: ['#b87c43', '#e8514a', '#fbe3bf'] } },
  { id: 'bc_sm_mermaid', name: 'นางเงือกทองสมิหลา', desc: 'นางเงือกทองนั่งหวีผมบนโขดหิน สัญลักษณ์เมืองสงขลา ขอพรแล้วสมหวัง', rarity: 'rare', kind: 'figure', series: S_BEACH, place: 'beach_samila', value: 220, art: { motif: 'mermaid', palette: ['#ffd54f', '#c98a2a', '#5aa9e8'], foil: true } },
  { id: 'bc_sm_catrat', name: 'แม่เหล็กเกาะหนูเกาะแมว', desc: 'ตำนานแมวกับหนูที่ว่ายหนีกันจนกลายเป็นเกาะ ติดตู้เย็นคู่กันไม่ทะเลาะแล้ว', rarity: 'common', kind: 'magnet', series: S_BEACH, place: 'beach_samila', value: 40, art: { motif: 'cat', palette: ['#8a9a8a', '#fffaf0', '#3a2838'] } },
  { id: 'bc_su_bigbuddha', name: 'ลูกแก้วพระใหญ่เกาะฟาน', desc: 'พระพุทธรูปองค์ทองบนเกาะเล็กกลางทะเล เขย่าแล้วมีทรายขาววิบวับ', rarity: 'rare', kind: 'snowglobe', series: S_BEACH, place: 'beach_samui', value: 230, art: { motif: 'buddha', palette: ['#ffd54f', '#5aa9e8', '#fffaf0'] } },
  { id: 'bc_su_coconut', name: 'แม่เหล็กมะพร้าวสมุย', desc: 'มะพร้าวน้ำหอมเจาะรูเสียบหลอด หวานชื่นใจจนต้องติดตู้เย็นไว้ดู', rarity: 'common', kind: 'magnet', series: S_BEACH, place: 'beach_samui', value: 40, art: { motif: 'coconut', palette: ['#7cc55e', '#fffaf0', '#8a5a3a'] } },
  { id: 'bc_pt_parasail', name: 'ร่มพาราเซลจิ๋ว', desc: 'ร่มชูชีพสีรุ้งลอยเหนือทะเลอันดามัน ตัวคนห้อยอยู่ข้างล่างทำหน้าตื่นเต้น', rarity: 'uncommon', kind: 'toy', series: S_BEACH, place: 'beach_patong', value: 100, art: { motif: 'umbrella', palette: ['#ff6f91', '#ffd23f', '#5aa9e8'] } },
  { id: 'bc_pt_postcard', name: 'โปสการ์ดป่าตองยามเย็น', desc: 'พระอาทิตย์ดวงโตจมลงทะเลอันดามัน ร่มชายหาดเรียงยาวสุดตา', rarity: 'common', kind: 'postcard', series: S_BEACH, place: 'beach_patong', value: 35, art: { motif: 'sunset', palette: ['#ff9f5a', '#5a8de0', '#ffe27a'] } },
  { id: 'bc_rl_longtail', name: 'เรือหางยาวไร่เลย์', desc: 'เรือไม้หัวเรือผูกผ้าแพรสามสี ชาวเรือผูกไว้ขอพรแม่ย่านางให้เดินทางปลอดภัย', rarity: 'uncommon', kind: 'figure', series: S_BEACH, place: 'beach_railay', value: 110, art: { motif: 'longtail', palette: ['#8a5a3a', '#e8514a', '#ffd23f'] } },
  { id: 'bc_rl_karst', name: 'โปสการ์ดหน้าผาไร่เลย์', desc: 'หน้าผาหินปูนสีส้มห้อยหินย้อย ทะเลใสสีมรกตข้างล่าง', rarity: 'common', kind: 'postcard', series: S_BEACH, place: 'beach_railay', value: 35, art: { motif: 'karst', palette: ['#d89060', '#43b8a8', '#6cc36a'] } },
]

/** Quest-only prizes. */
const PRIZES: CollectibleDef[] = [
  { id: 'bc_turtle_plush', name: 'ตุ๊กตาลูกเต่าทะเล', desc: 'ลูกเต่าตากลมโตที่เราพาลงทะเลวันนั้น โตขึ้นจะกลับมาวางไข่ที่หาดเดิมนะ', rarity: 'epic', kind: 'plush', series: S_BEACH, value: 360, art: { motif: 'turtle', palette: ['#6cc36a', '#fbe3bf', '#2f6f4b'], foil: true }, source: 'reward', tradeable: false, hint: 'รางวัลเควสต์ช่วยเต่าทะเล' },
  { id: 'bc_sand_chedi', name: 'ฟิกเกอร์พระเจดีย์ทราย', desc: 'เจดีย์ทรายยอดแหลมปักธงทิว ก่อถวายวัดช่วงสงกรานต์ได้บุญคืนทรายที่ติดเท้าออกมา', rarity: 'rare', kind: 'figure', series: S_BEACH, value: 180, art: { motif: 'chedi', palette: ['#e8d4a8', '#ff6f91', '#fffaf0'] }, source: 'reward', hint: 'รางวัลเควสต์ก่อเจดีย์ทราย' },
  { id: 'bc_beach_passport', name: 'สแตมป์นักเที่ยวทะเลไทย', desc: 'ตราประทับครบหกหาดดังทั้งอ่าวไทยและอันดามัน ผิวแทนเป็นหลักฐาน', rarity: 'epic', kind: 'stamp', series: S_BEACH, value: 500, art: { motif: 'swimring', palette: ['#5aa9e8', '#ffd54f', '#fffaf0'], foil: true }, source: 'reward', tradeable: false, hint: 'รางวัลเควสต์เที่ยวครบทุกหาด' },
]

export const BEACH_COLLECTIBLES: CollectibleDef[] = [...BEACH_SHELLS, ...SOUVENIRS, ...PRIZES]

export const BEACH_COLLECTIBLE_BY_ID: Record<string, CollectibleDef> = Object.fromEntries(BEACH_COLLECTIBLES.map((c) => [c.id, c]))

export const BEACH_GROUP: CollectibleGroup = {
  id: 'beach',
  items: BEACH_COLLECTIBLES,
  series: [
    { id: S_SHELLS, blurb: 'เปลือกหอยและของทะเลที่เก็บเองกับมือ', color: '#9fd9e8', motif: 'scallop', order: 60 },
    { id: S_BEACH, blurb: 'ของฝากจากหกหาดดังทั่วไทย', color: '#ffd9a0', motif: 'swimring', order: 61 },
  ],
}

/** Shells by rarity (for the find rolls). */
export function shellsOf(r: Rarity): CollectibleDef[] {
  return BEACH_SHELLS.filter((c) => c.rarity === r)
}
