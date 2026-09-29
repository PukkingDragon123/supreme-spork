// ป๊อปไทยแลนด์ – funny modern-Thai collectibles (all parody-safe names),
// plus สายมูต้องมี (amulet replicas and lucky charms) and the temple
// postcard & stamp set.

import type { CollectibleDef, CollectibleGroup, CollectibleSeries } from '../collectibleTypes'

export const S_POP = 'ป๊อปไทยแลนด์'
export const S_MU = 'สายมูต้องมี'
export const S_STAMP = 'แสตมป์ & โปสการ์ดวัดไทย'

const GOLD: [string, string, string] = ['#ffd54f', '#e9a53a', '#fff3a6']

const POP: CollectibleDef[] = [
  { id: 'cl_hippo_plush', name: 'ตุ๊กตาน้องหมูดึ๋ง', desc: 'ฮิปโปแคระแก้มป่องจอมดื้อ กัดขาพี่เลี้ยงเก่งมาก กอดแล้วเด้งดึ๋ง ๆ', rarity: 'rare', kind: 'plush', series: S_POP, value: 160, art: { motif: 'hippo', palette: ['#b8a0b4', '#ff9aa6', '#8a7088'] } },
  { id: 'cl_hippo_bite', name: 'น้องหมูดึ๋งงับขา (รุ่นซีเคร็ต)', desc: 'ท่าเด็ดประจำตัว อ้าปากงับได้จริง แต่ไม่เจ็บ ของหายากสุดในวงการฮิปโป', rarity: 'legendary', kind: 'figure', series: S_POP, value: 1100, art: { motif: 'hippo', palette: ['#c8a8c4', '#ffd54f', '#8a7088'], foil: true } },
  { id: 'cl_monitor_figure', name: 'น้องเงินทองนำโชค', desc: 'ตัวเงินตัวทองอ้วนพี เจอแล้วชีวิตจะรุ่ง (ความเชื่อใหม่ปี 2026)', rarity: 'uncommon', kind: 'figure', series: S_POP, value: 70, art: { motif: 'monitor', palette: ['#6a7a4a', '#ffd54f', '#3a4a2a'] } },
  { id: 'cl_orange_cat', name: 'ตุ๊กตาแมวส้มจอมป่วน', desc: 'ร่างกายเป็นแมว จิตวิญญาณเป็นนักเลง ทำแก้วตกไปแล้ว 3 ใบวันนี้', rarity: 'uncommon', kind: 'plush', series: S_POP, value: 65, art: { motif: 'cat', palette: ['#f5a55a', '#fff1d6', '#c96a2a'] } },
  { id: 'cl_labubun', name: 'ชาร์มลาบูบุญ', desc: 'มอนสเตอร์ฟันซี่เล็กหูแหลม ยิ้มกวน ๆ ห้อยกระเป๋าแล้วคนทักทั้งวัด', rarity: 'rare', kind: 'charm', series: S_POP, value: 170, art: { motif: 'monster', palette: ['#c9a0a0', '#fff1d6', '#e8709e'] } },
  { id: 'cl_labubun_gold', name: 'ลาบูบุญทองคำ (ซีเคร็ต)', desc: 'สุ่มกล่องจุ่มร้อยกล่องเจอหนึ่ง ใครได้ถือว่าดวงดีกว่าถูกหวย', rarity: 'legendary', kind: 'charm', series: S_POP, value: 1200, art: { motif: 'monster', palette: GOLD, foil: true } },
  { id: 'cl_boba_keychain', name: 'พวงกุญแจชานมไข่มุก', desc: 'หวาน 200% ไข่มุกเพิ่ม ห้อยแล้วอยากกินทุกห้านาที', rarity: 'common', kind: 'keychain', series: S_POP, value: 25, art: { motif: 'boba', palette: ['#d9a878', '#3a2838', '#fff1d6'] } },
  { id: 'cl_mookata_magnet', name: 'แม่เหล็กหมูกระทะ', desc: 'กระทะทองเหลืองเสียงฉ่า ๆ ติดตู้เย็นแล้ววันศุกร์นี้นัดกันเลย', rarity: 'common', kind: 'magnet', series: S_POP, value: 25, art: { motif: 'mookata', palette: ['#c9a05a', '#f2a0a0', '#6cc36a'] } },
  { id: 'cl_yadom_keychain', name: 'พวงกุญแจยาดม', desc: 'หลอดยาดมจิ๋วสูดแล้วตาสว่าง อุปกรณ์เอาตัวรอดของคนไทยทุกคน', rarity: 'common', kind: 'keychain', series: S_POP, value: 25, art: { motif: 'yadom', palette: ['#6cc36a', '#fffaf0', '#e8514a'] } },
  { id: 'cl_toastie_keychain', name: 'พวงกุญแจแซนด์วิชอบ 7-บุญ', desc: 'ขนมปังอบชีสยืด ๆ ร้อนจนต้องเป่า ถึงจะเป็นพวงกุญแจก็ยังร้อน (ในใจ)', rarity: 'common', kind: 'keychain', series: S_POP, value: 25, art: { motif: 'toastie', palette: ['#e8b060', '#ffe45e', '#9a6a45'] } },
  { id: 'cl_teabag_keychain', name: 'พวงกุญแจชาเย็นถุงหูหิ้ว', desc: 'ชาเย็นใส่ถุงมัดหนังยาง หิ้วได้ ห้อยได้ เป็นไทยที่สุดในโลก', rarity: 'common', kind: 'keychain', series: S_POP, value: 25, art: { motif: 'teabag', palette: ['#f58f35', '#fffaf0', '#ff5a8a'] } },
  { id: 'cl_winmotor_figure', name: 'พี่วินเสื้อส้ม', desc: 'วินมอไซค์ขวัญใจซอย ปาดเก่ง จอดเก่ง รู้ทุกทางลัด', rarity: 'uncommon', kind: 'figure', series: S_POP, value: 65, art: { motif: 'motorbike', palette: ['#f58f35', '#3a3a44', '#ffd54f'] } },
  { id: 'cl_soidog_plush', name: 'ตุ๊กตาหมาวัดหน้าบึ้ง', desc: 'หน้าดุแต่ใจดี นอนเฝ้าศาลาทั้งวัน ตื่นเฉพาะตอนมีคนถือข้าว', rarity: 'common', kind: 'plush', series: S_POP, value: 30, art: { motif: 'dog', palette: ['#e0a868', '#fbe3bf', '#8a5a32'] } },
  { id: 'cl_currybag_keychain', name: 'พวงกุญแจถุงแกง', desc: 'แกงเขียวหวานใส่ถุงมัดยางสองรอบ ตำนานของคนเมืองทุกคน', rarity: 'common', kind: 'keychain', series: S_POP, value: 25, art: { motif: 'currybag', palette: ['#9ccc65', '#fffaf0', '#e8413a'] } },
  { id: 'cl_gecko_toy', name: 'ตุ๊กแกร้องทักนำโชค', desc: 'กดท้องแล้วร้อง ตุ๊กแก! ตุ๊กแก! นับได้เจ็ดครั้งถือว่าโชคดี', rarity: 'uncommon', kind: 'toy', series: S_POP, value: 60, art: { motif: 'gecko', palette: ['#8fb0c0', '#ff8a7a', '#5a7080'] } },
  { id: 'cl_cupnoodle_toy', name: 'บะหมี่มาบุญคัพจิ๋ว', desc: 'บะหมี่ถ้วยเพื่อนยามดึก เปิดฝาแล้วมีเส้นเด้งออกมาเป็นสปริง', rarity: 'common', kind: 'toy', series: S_POP, value: 30, art: { motif: 'cupnoodle', palette: ['#ffd54f', '#e8514a', '#fff1d6'] } },
]

const MU: CollectibleDef[] = [
  { id: 'cl_somdej_amulet', name: 'พระสมเด็จจำลอง', desc: 'พิมพ์ทรงซุ้มระฆังจำลองสำหรับนักสะสม เซียนพระยังต้องขอส่อง', rarity: 'uncommon', kind: 'amulet', series: S_MU, value: 70, art: { motif: 'somdej', palette: ['#e8dcc0', '#b89a6a', '#fffaf0'] } },
  { id: 'cl_monk_coin', name: 'เหรียญที่ระลึกหลวงพ่อ', desc: 'เหรียญกลมรมดำขอบเลื่อม ห้อยคอแล้วเดินผ่านหมาดุ ๆ ได้สบาย', rarity: 'common', kind: 'amulet', series: S_MU, value: 30, art: { motif: 'monkcoin', palette: ['#c28e5c', '#6e4a35', '#ffd54f'] } },
  { id: 'cl_takrut_charm', name: 'ตะกรุดจิ๋วมหาลาภ', desc: 'ม้วนแผ่นทองลงยันต์ ร้อยเชือกแดง พกไว้เงินไม่รั่ว (ถ้าไม่ช้อปออนไลน์)', rarity: 'common', kind: 'charm', series: S_MU, value: 30, art: { motif: 'takrut', palette: GOLD } },
  { id: 'cl_yant_pin', name: 'เข็มกลัดยันต์ห้าแถว', desc: 'ลายยันต์ดังที่คนต่างชาติชอบสัก แบบติดเสื้อไม่ต้องเจ็บตัว', rarity: 'uncommon', kind: 'pin', series: S_MU, value: 60, art: { motif: 'yant', palette: ['#fffaf0', '#3a2838', '#e8514a'] } },
  { id: 'cl_nangkwak', name: 'นางกวักเรียกทรัพย์', desc: 'กวักมือเรียกลูกค้าเข้าร้านทั้งวัน ไม่เคยเมื่อยแขน', rarity: 'rare', kind: 'figure', series: S_MU, value: 170, art: { motif: 'nangkwak', palette: ['#e8514a', '#ffd54f', '#fff1d6'] } },
  { id: 'cl_lottery_postcard', name: 'โปสการ์ดเลขเด็ดต้นตะเคียน', desc: 'ขูดแป้งแล้วเห็นเลขเลือนลาง ตีความได้ทั้ง 17 และ 71', rarity: 'common', kind: 'postcard', series: S_MU, value: 25, art: { motif: 'lottery', palette: ['#6cc36a', '#fffaf0', '#e8514a'] } },
  { id: 'cl_wish_crystal', name: 'แก้วสารพัดนึก', desc: 'ลูกแก้วประกายรุ้งในผอบทอง ตำนานว่าขออะไรได้หนึ่งข้อ… ขอให้ได้อีกลูกได้ไหม', rarity: 'legendary', kind: 'relic', series: S_MU, value: 1200, art: { motif: 'crystal', palette: ['#c9a0f0', '#ffd54f', '#b3eef4'], foil: true } },
  { id: 'cl_lucky_cat', name: 'แมวกวักทองนำโชค', desc: 'แมวกวักรุ่นทอง กวักทั้งสองมือ เรียกทั้งเงินทั้งคนโสด', rarity: 'epic', kind: 'figure', series: S_MU, value: 400, art: { motif: 'cat', palette: GOLD } },
]

const STAMPS: CollectibleDef[] = [
  { id: 'cl_stamp_arun', name: 'แสตมป์วัดอรุณ', desc: 'พระปรางค์ยามเย็น ขอบหยักสวยงาม ชุดวัดไทยดวงที่ 1', rarity: 'common', kind: 'stamp', series: S_STAMP, value: 25, art: { motif: 'prang', palette: ['#fff1d6', '#f58f35', '#5a8de0'] } },
  { id: 'cl_stamp_mount', name: 'แสตมป์ภูเขาทอง', desc: 'เจดีย์ทองบนเนินสูง ชุดวัดไทยดวงที่ 2', rarity: 'common', kind: 'stamp', series: S_STAMP, value: 25, art: { motif: 'mount', palette: ['#ffd54f', '#6cc36a', '#fffaf0'] } },
  { id: 'cl_stamp_chedi', name: 'แสตมป์พระธาตุ', desc: 'พระธาตุทองอร่าม ชุดวัดไทยดวงที่ 3', rarity: 'common', kind: 'stamp', series: S_STAMP, value: 25, art: { motif: 'chedi', palette: GOLD } },
  { id: 'cl_stamp_sala', name: 'แสตมป์ศาลาไทย', desc: 'ศาลาหลังคาจั่วซ้อนสองชั้น ชุดวัดไทยดวงที่ 4', rarity: 'uncommon', kind: 'stamp', series: S_STAMP, value: 55, art: { motif: 'sala', palette: ['#e8514a', '#ffd54f', '#fff1d6'] } },
  { id: 'cl_stamp_elephant', name: 'แสตมป์ช้างไทยรุ่นพิเศษ', desc: 'พิมพ์นูนสีทอง ออกเฉพาะวันช้างไทย ชุดวัดไทยดวงพิเศษ', rarity: 'rare', kind: 'stamp', series: S_STAMP, value: 150, art: { motif: 'elephant', palette: ['#ffd54f', '#e9a53a', '#fff3a6'] } },
  { id: 'cl_alms_postcard', name: 'โปสการ์ดตักบาตรยามเช้า', desc: 'พระเดินเรียงแถวในหมอกเช้า ส่งให้เพื่อนแล้วเพื่อนจะตื่นเช้าขึ้น (หวังว่า)', rarity: 'common', kind: 'postcard', series: S_STAMP, value: 25, art: { motif: 'alms', palette: ['#f58f35', '#fff1d6', '#ffd54f'] } },
  { id: 'cl_temple_postcard', name: 'โปสการ์ดโบสถ์ยามเย็น', desc: 'หลังคาช่อฟ้าใบระกาต้องแสงสีทอง ถ่ายด้วยมือถือไม่สวยเท่านี้', rarity: 'uncommon', kind: 'postcard', series: S_STAMP, value: 55, art: { motif: 'sala', palette: ['#f58f35', '#ffd54f', '#ff9fc0'] } },
  { id: 'cl_stamp_album', name: 'สมุดสะสมแสตมป์ปกทอง', desc: 'สมุดปกทองลายกนก สำหรับเก็บแสตมป์วัดไทยครบชุด คนเห็นต้องขอดู', rarity: 'epic', kind: 'relic', series: S_STAMP, value: 380, art: { motif: 'book', palette: GOLD } },
]

export const POP_SERIES: CollectibleSeries[] = [
  { id: S_POP, blurb: 'ของฮิตโซเชียล ขำ ๆ ปัง ๆ แบบไทย ๆ', color: '#b394f0', motif: 'hippo', order: 20 },
  { id: S_MU, blurb: 'ของขลังจำลองสำหรับสายมูสายบุญ', color: '#ffd54f', motif: 'takrut', order: 21 },
  { id: S_STAMP, blurb: 'สะสมให้ครบชุดวัดไทย ส่งให้เพื่อนก็ได้', color: '#9fd0ff', motif: 'prang', order: 22 },
]

export const POP_GROUP: CollectibleGroup = {
  id: 'pop',
  items: [...POP, ...MU, ...STAMPS],
  series: POP_SERIES,
}
