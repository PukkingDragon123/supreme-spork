// Temple-rank collectibles (ของสะสมแรงก์วัด): the rare souvenirs handed out by
// the S / SS rank quests (npcQuests/ranks.ts). SS temples give a legendary,
// S temples an epic. Register with:
//   import { RANK_COLLECTIBLES } from './ranks'   (in collectibles/index.ts)

import type { CollectibleDef } from '../collectibleTypes'

const SERIES = 'ทำเนียบแรงก์วัดดัง'

export const RANK_COLLECTIBLES: CollectibleDef[] = [
  // --- SS: legendary (bound to the player) ----------------------------------
  {
    id: 'rk_phra_kaew_globe',
    name: 'ลูกแก้วหิมะวัดพระแก้ว',
    desc: 'เขย่าแล้วเกล็ดทองปลิวรอบพระศรีรัตนเจดีย์ ได้เฉพาะสายบุญแรงก์ SS กรุงเทพฯ',
    rarity: 'legendary',
    kind: 'snowglobe',
    series: SERIES,
    value: 2400,
    art: { motif: 'chedi', palette: ['#ffd23f', '#2f9f6a', '#c8423f'], foil: true },
    tradeable: false,
  },
  {
    id: 'rk_pathom_figure',
    name: 'องค์พระปฐมเจดีย์จำลองทองส้ม',
    desc: 'เจดีย์ทรงระฆังคว่ำองค์ใหญ่ที่สุดในไทย ย่อส่วนเหลือวางบนหิ้งได้ แรงก์ SS ภาคกลาง',
    rarity: 'legendary',
    kind: 'figure',
    series: SERIES,
    value: 2400,
    art: { motif: 'chedi', palette: ['#f58f35', '#ffd23f', '#8a4030'], foil: true },
    tradeable: false,
  },
  {
    id: 'rk_doi_suthep_figure',
    name: 'พระธาตุดอยสุเทพฉัตรทอง',
    desc: 'พระธาตุทองอร่ามกับฉัตรสี่มุม มีบันไดนาคเลื้อยลงมาข้างล่าง แรงก์ SS ภาคเหนือ',
    rarity: 'legendary',
    kind: 'figure',
    series: SERIES,
    value: 2400,
    art: { motif: 'chedi', palette: ['#ffd54f', '#fff3a6', '#6b3b24'], foil: true },
    tradeable: false,
  },
  {
    id: 'rk_that_phanom_naga',
    name: 'พญานาคคู่พระธาตุพนม',
    desc: 'นาคเขียวมรกตขดรอบองค์พระธาตุสีขาวทอง ริมโขงยามเช้า แรงก์ SS ภาคอีสาน',
    rarity: 'legendary',
    kind: 'figure',
    series: SERIES,
    value: 2400,
    art: { motif: 'naga', palette: ['#3fbf8a', '#fff6dc', '#d09a2a'], foil: true },
    tradeable: false,
  },
  {
    id: 'rk_nst_charm',
    name: 'เหรียญที่ระลึกพระบรมธาตุนครฯ',
    desc: 'เหรียญเงินลงยาสีขาว ยอดทองคำ ระลึกงานแห่ผ้าขึ้นธาตุ แรงก์ SS ภาคใต้',
    rarity: 'legendary',
    kind: 'charm',
    series: SERIES,
    value: 2400,
    art: { motif: 'chedi', palette: ['#f4f6f8', '#ffd23f', '#5a5a8e'], foil: true },
    tradeable: false,
  },

  // --- S: epic ---------------------------------------------------------------
  {
    id: 'rk_traimit_pin',
    name: 'เข็มกลัดบัวทองเยาวราช',
    desc: 'ดอกบัวทองคำแท้ (ในเกม) จากย่านเยาวราช แรงก์ S กรุงเทพฯ',
    rarity: 'epic',
    kind: 'pin',
    series: SERIES,
    value: 900,
    art: { motif: 'lotus', palette: ['#ffd23f', '#ff9fc0', '#c8423f'] },
  },
  {
    id: 'rk_phutthabat_stamp',
    name: 'แสตมป์ไปพระบาทสระบุรี',
    desc: 'แสตมป์ลายดอกบัวร้อยแปดกลีบ ระลึกการเดินทางไปพระบาท แรงก์ S ภาคกลาง',
    rarity: 'epic',
    kind: 'stamp',
    series: SERIES,
    value: 900,
    art: { motif: 'lotus', palette: ['#b98af0', '#ffd23f', '#5e3aa0'] },
  },
  {
    id: 'rk_chinnarat_postcard',
    name: 'โปสการ์ดซุ้มเรือนแก้วพิษณุโลก',
    desc: 'ลายพญานาคทองเลื้อยเป็นซุ้มงามอ่อนช้อย พิมพ์ทองบนพื้นแดง แรงก์ S ภาคเหนือ',
    rarity: 'epic',
    kind: 'postcard',
    series: SERIES,
    value: 900,
    art: { motif: 'naga', palette: ['#c8423f', '#ffd23f', '#5e1c30'] },
  },
  {
    id: 'rk_sothon_charm',
    name: 'พวงกุญแจไข่ต้มนำโชคแปดริ้ว',
    desc: 'ไข่ต้มสีทองห้อยดาวเรือง แก้บนหลวงพ่อโสธรแล้วสมหวังทุกข้อ แรงก์ S ภาคตะวันออก',
    rarity: 'epic',
    kind: 'keychain',
    series: SERIES,
    value: 900,
    art: { motif: 'lotus', palette: ['#ffb84a', '#fff6dc', '#e2701f'] },
  },
]

export const RANK_COLLECTIBLE_BY_ID: Record<string, CollectibleDef> = Object.fromEntries(RANK_COLLECTIBLES.map((c) => [c.id, c]))
