// Hub markets (ตลาดดังทั่วไทย) and the temple fair (งานวัด): metadata for the
// notice boards, the market passport, fair ticket maths, the prize booth and
// the simulated "what's happening" feed. Everything that looks online here
// (crowd numbers, trade chatter) is generated locally and deterministically,
// like src/services/presence.ts; nothing is sent anywhere.

import { game, mutate } from './state'
import { addCoins, addMerit, grantOutfit, track } from './actions'
import { addToCollection } from './collectibles'
import { toast } from './events'
import { dayKey } from './time'
import { Rng } from '../engine/rng'
import { simulatedProfile } from '../services/social'
import { presence } from '../services/presence'
import { OUTFITS } from './data/outfits'
import { HUB_COLLECTIBLE_BY_ID } from './data/collectibles/hubs'

export const HUB_IDS = ['hub_chatuchak', 'hub_damnoen', 'hub_maeklong', 'hub_thaphae', 'hub_kimyong', 'hub_indochina'] as const
export type HubId = (typeof HUB_IDS)[number]
export const FAIR_ID = 'fair_temple'

/** Hub / fair maps (their ids equal their place ids). */
export function isHubMap(id: string): boolean {
  return id.startsWith('hub_') || id.startsWith('fair_')
}

export interface HubMeta {
  id: string
  name: string
  short: string
  province: string
  icon: string
  kind: 'market' | 'fair'
  /** Board header line. */
  blurb: string
  /** Stalls the board recommends today (one is the "pick of the day"). */
  picks: { shop: string; text: string }[]
  /** Opening hours and shows. */
  schedule: { time: string; text: string }[]
  /** Quest givers standing on this map. */
  npcs: { id: string; name: string; role: string }[]
  /** Chatter of the (simulated) players here: speech bubbles and the board feed. */
  chat: string[]
}

const TRADE_CHAT = [
  'ใครมีพวงกุญแจหมูดึ๋ง แลกกับแม่เหล็กแมวส้มไหม 🤝',
  'รับซื้อกล่องสุ่มลาบุ๊บลาบั๊บสีม่วง ให้ราคาดี!',
  'ขายตุ๊กตาตัวเงินตัวทองค่ะ ทักได้เลย 💬',
  'ดีลจบ! ขอบคุณค้าบ 🙏',
  'แลกของกันตรงหอนาฬิกานะ 📍',
  'ตามหาร่มบ่อสร้างลายดอกบัว ใครมีบ้าง',
  'ของแรร์มาแล้ว ✨ ใครไว ได้ไป',
  'ต่อได้ไหมคะ ลดหน่อยนะ 🥺',
]

export const HUB_META: Record<string, HubMeta> = {
  hub_chatuchak: {
    id: 'hub_chatuchak',
    name: 'ตลาดนัดจตุจักร',
    short: 'จตุจักร',
    province: 'กรุงเทพฯ',
    icon: 'market',
    kind: 'market',
    blurb: 'ตลาดนัดสุดสัปดาห์ที่ใหญ่ที่สุดในไทย หลงทางเมื่อไหร่ให้มองหาหอนาฬิกา',
    picks: [
      { shop: 'shop:hub_chatuchak_coconut', text: 'ไอติมมะพร้าวคิวสั้นกว่าปกติ รีบไป!' },
      { shop: 'shop:hub_chatuchak_hippo', text: 'ตุ๊กตาหมูดึ๋งล็อตใหม่เข้าแล้ว' },
      { shop: 'shop:hub_chatuchak_blindbox', text: 'ป๊อปบุญเปิดขายกล่องสุ่มรอบพิเศษ' },
      { shop: 'shop:hub_chatuchak_mango', text: 'ข้าวเหนียวมะม่วงพิสตาชิโอ เมนูฮิตวันนี้' },
      { shop: 'shop:hub_chatuchak_paella', text: 'ลุงโจ้ผัดข้าวกระทะยักษ์โชว์ทุกชั่วโมง' },
    ],
    schedule: [
      { time: 'ส.–อา. 9:00–18:00', text: 'ตลาดนัดสุดสัปดาห์ (ร้านต้นไม้เปิดวันพุธ–พฤหัสด้วย)' },
      { time: 'ทุกชั่วโมง', text: 'ลุงโจ้โชว์ผัดข้าวกระทะยักษ์' },
      { time: 'ตลอดวัน', text: 'คิวกล่องสุ่มหน้าป๊อปบุญ (ยาวมาก)' },
    ],
    npcs: [
      { id: 'npc:jj_win', name: 'เจ๊วิน', role: 'เจ้าของร้านวินเทจ' },
      { id: 'npc:jj_som', name: 'ป้าส้ม', role: 'คนรักแมวส้ม' },
      { id: 'npc:jj_guide', name: 'พี่ไกด์ต้น', role: 'ไกด์หอนาฬิกา' },
    ],
    chat: ['หอนาฬิกาอยู่ไหนนะ 555', 'ร้อนมาก ไอติมมะพร้าวด่วน 🥥', 'คิวกล่องสุ่มยาวถึงซอย 26 แล้ว', 'หมูดึ๋งน่ารักจนต้องซื้อ 🦛', 'แมวส้มหลับบนกองเสื้ออีกแล้ว', ...TRADE_CHAT],
  },
  hub_damnoen: {
    id: 'hub_damnoen',
    name: 'ตลาดน้ำดำเนินสะดวก',
    short: 'ดำเนินสะดวก',
    province: 'ราชบุรี',
    icon: 'koi',
    kind: 'market',
    blurb: 'ตลาดน้ำเก่าแก่ เรือแม่ค้าแน่นคลอง ซื้อของจากเรือส่งถึงมือ',
    picks: [
      { shop: 'shop:hub_damnoen_noodle', text: 'ก๋วยเตี๋ยวเรือชามจิ๋ว สั่งทีละห้า!' },
      { shop: 'shop:hub_damnoen_fruit', text: 'มังคุดจากสวนเพิ่งขึ้นเรือมา' },
      { shop: 'shop:hub_damnoen_krok', text: 'ขนมครกเตาถ่านร้อน ๆ' },
    ],
    schedule: [
      { time: '7:00–12:00', text: 'เรือแม่ค้าเต็มคลอง ไปเช้าคนน้อย' },
      { time: 'ทุก ~2 นาที', text: 'ตัวเงินตัวทองว่ายข้ามคลอง (ตะโกนพร้อมกันนะ)' },
      { time: 'ตลอดวัน', text: 'ให้อาหารปลาที่ท่าน้ำ' },
    ],
    npcs: [
      { id: 'npc:dn_somjai', name: 'ป้าสมใจ', role: 'แม่ค้าเรือก๋วยเตี๋ยว' },
      { id: 'npc:dn_jaew', name: 'ลุงแจว', role: 'คนแจวเรือ' },
      { id: 'npc:dn_kla', name: 'น้องกล้า', role: 'เด็กริมคลอง' },
    ],
    chat: ['ตัวเงินตัวทอง!! 🦎', 'ก๋วยเตี๋ยวเรือชามที่เจ็ดแล้ว', 'เรือชนกันเบา ๆ ขอโทษค้าบ', 'งอบใบนี้เท่ไหม', ...TRADE_CHAT],
  },
  hub_maeklong: {
    id: 'hub_maeklong',
    name: 'ตลาดร่มหุบ แม่กลอง',
    short: 'ร่มหุบ',
    province: 'สมุทรสงคราม',
    icon: 'bell',
    kind: 'market',
    blurb: 'รถไฟวิ่งผ่านกลางตลาด แม่ค้าหุบร่มหลบทันทีที่ได้ยินหวูด',
    picks: [
      { shop: 'shop:hub_maeklong_platu', text: 'ปลาทูหน้างอคอหักล็อตเช้า' },
      { shop: 'shop:hub_maeklong_fruit', text: 'ลิ้นจี่ค่อมหวานจัด' },
      { shop: 'shop:hub_maeklong_kanom', text: 'ขนมตาลออกจากเตาแล้ว' },
    ],
    schedule: [
      { time: '8:30 · 11:10 · 14:30 · 17:40', text: 'รถไฟเข้าสถานีแม่กลอง (ตารางจริง)' },
      { time: '6:20 · 9:00 · 11:30 · 15:30', text: 'รถไฟออกจากสถานี (ตารางจริง)' },
      { time: 'ในเกม', text: 'รถไฟผ่านตลาดทุก ~80 วินาที' },
    ],
    npcs: [
      { id: 'npc:mk_piak', name: 'ลุงเปี๊ยก', role: 'พ่อค้าปลาทูประจำราง' },
      { id: 'npc:mk_master', name: 'นายสถานี', role: 'นายสถานีแม่กลอง' },
      { id: 'npc:mk_cam', name: 'พี่กล้อง', role: 'ช่างภาพสายรถไฟ' },
    ],
    chat: ['รถไฟมาแล้ว! หุบร่ม~ ☂️', 'ได้คลิปรถไฟแล้ว 📸', 'ปลาทูหน้างอคอหักจริงด้วย', 'ถอยหลังนิดนึงครับ', ...TRADE_CHAT],
  },
  hub_thaphae: {
    id: 'hub_thaphae',
    name: 'ถนนคนเดินท่าแพ',
    short: 'ท่าแพ',
    province: 'เชียงใหม่',
    icon: 'music',
    kind: 'market',
    blurb: 'ถนนคนเดินวันอาทิตย์หน้าประตูท่าแพ โคมล้านนาเรียงยาว งานคราฟต์เต็มถนน',
    picks: [
      { shop: 'shop:hub_thaphae_khaosoi', text: 'ข้าวซอยแม่คำปันน้ำข้นวันนี้' },
      { shop: 'shop:hub_thaphae_umbrella', text: 'ร่มบ่อสร้างวาดชื่อให้ฟรี' },
      { shop: 'shop:hub_thaphae_roti', text: 'โรตีป้าเฮาะคิวสั้น!' },
    ],
    schedule: [
      { time: 'อา. 16:00–22:00', text: 'ถนนคนเดินราชดำเนิน–ท่าแพ' },
      { time: '18:00', text: 'เพลงชาติ ทุกคนหยุดยืนตรง' },
      { time: 'ค่ำ', text: 'โคมล้านนาเปิดไฟทั้งถนน' },
    ],
    npcs: [
      { id: 'npc:tp_kham', name: 'แม่อุ๊ยคำ', role: 'ช่างทำโคมล้านนา' },
      { id: 'npc:tp_sueng', name: 'น้องซึง', role: 'นักดนตรีเปิดหมวก' },
    ],
    chat: ['โคมสวยมากกก 🏮', 'นวดเท้าต่อคิวหน่อยนะ', 'ข้าวซอยอร่อยสุดในชีวิต', 'นกพิราบเยอะมากหน้าประตู', ...TRADE_CHAT],
  },
  hub_kimyong: {
    id: 'hub_kimyong',
    name: 'ตลาดกิมหยง',
    short: 'กิมหยง',
    province: 'สงขลา (หาดใหญ่)',
    icon: 'chicken',
    kind: 'market',
    blurb: 'ตลาดของแห้งกลางหาดใหญ่ ไก่ทอดหอมเจียว อินทผลัม ของฝากข้ามแดน',
    picks: [
      { shop: 'shop:hub_kimyong_chicken', text: 'ไก่ทอดหาดใหญ่ทอดใหม่ทุกสิบนาที' },
      { shop: 'shop:hub_kimyong_dates', text: 'อินทผลัมเม็ดโต ชิมฟรีสามเม็ด' },
      { shop: 'shop:hub_kimyong_dried', text: 'หมึกแห้งล็อตใหม่จากสงขลา' },
    ],
    schedule: [
      { time: '8:00–18:00', text: 'ตลาดเปิดทุกวัน ของแห้งเต็มชั้น' },
      { time: 'เช้า', text: 'ไก่ทอดชุดแรกออกจากกระทะ' },
    ],
    npcs: [
      { id: 'npc:ky_din', name: 'บังดีน', role: 'พ่อค้าอินทผลัม' },
      { id: 'npc:ky_siew', name: 'อาม่าซิ้ว', role: 'เจ้าของแผงของแห้งรุ่นแรก' },
      { id: 'npc:ky_ali', name: 'อาลี', role: 'นักท่องเที่ยวข้ามแดน' },
    ],
    chat: ['Terima kasih! ขอบคุณครับ', 'ไก่ทอดหอมเจียวไม่ไหวแล้ว 🍗', 'อินทผลัมหวานมาก', 'ถุงเต็มมือแล้ว 🛍️', ...TRADE_CHAT],
  },
  hub_indochina: {
    id: 'hub_indochina',
    name: 'ตลาดอินโดจีน',
    short: 'อินโดจีน',
    province: 'มุกดาหาร',
    icon: 'sun',
    kind: 'market',
    blurb: 'ตลาดริมโขงของไทย ลาว เวียดนาม จีน มองข้ามน้ำเห็นสะหวันนะเขต',
    picks: [
      { shop: 'shop:hub_indochina_naem', text: 'แหนมเนืองลุงเหงียนผักเยอะเป็นพิเศษ' },
      { shop: 'shop:hub_indochina_mookata', text: 'หมูกระทะริมโขงรอบพระอาทิตย์ตก' },
      { shop: 'shop:hub_indochina_silk', text: 'ผ้าไหมมัดหมี่ลายใหม่' },
    ],
    schedule: [
      { time: '8:00–18:00', text: 'ตลาดเปิดทุกวันริมเขื่อนโขง' },
      { time: '17:30', text: 'พระอาทิตย์ตกหลังฝั่งลาว สวยที่สุด' },
    ],
    npcs: [
      { id: 'npc:ic_khampong', name: 'แม่ใหญ่คำพอง', role: 'ช่างทอผ้าไหม' },
      { id: 'npc:ic_nguyen', name: 'ลุงเหงียน', role: 'เจ้าของร้านแหนมเนือง' },
      { id: 'npc:ic_champa', name: 'น้องจำปา', role: 'ไกด์ริมโขง' },
    ],
    chat: ['โขงสวยมากตอนเย็น 🌅', 'สะบายดี~', 'แหนมเนืองห่อไม่เป็น ช่วยด้วย 555', 'หมูกระทะริมโขงคือที่สุด', ...TRADE_CHAT],
  },
  fair_temple: {
    id: 'fair_temple',
    name: 'งานวัดศรีบุญดี',
    short: 'งานวัด',
    province: 'บ้านเรา',
    icon: 'star',
    kind: 'fair',
    blurb: 'งานประจำปีของวัดใกล้บ้าน ชิงช้าสวรรค์ ม้าหมุน รถบั๊มพ์ ลิเก รำวง บ้านผีสิง ซุ้มเกม ของกินเพียบ',
    picks: [
      { shop: 'shop:fair_temple_saimai', text: 'สายไหมป้าจุกฟูพิเศษคืนนี้' },
      { shop: 'shop:fair_temple_lookchin', text: 'ลูกชิ้นทอดไม้ใหญ่ ไม้ละสิบ' },
      { shop: 'shop:fair_temple_icepop', text: 'ไอติมหลอดสีใหม่ สีม่วงอัญชัน' },
      { shop: 'shop:fair_temple_tokyo', text: 'ขนมโตเกียวไส้ครีมใบเตย ร้อน ๆ' },
      { shop: 'shop:fair_temple_takoyaki', text: 'ทาโกะยากิลูกโต ปลาโอแห้งเต้นระบำ' },
      { shop: 'shop:fair_temple_squid', text: 'หมึกย่างตัวใหญ่ น้ำจิ้มซีฟู้ดแซ่บ' },
    ],
    schedule: [
      { time: '19:00', text: 'รำวงรอบแรก ใครก็ร่วมได้ (มีผู้เล่นจริงรำด้วยกัน)' },
      { time: '20:30', text: 'ลิเกคณะดาวเลื่อม เรื่อง "เจ้าชายนกยูงทอง"' },
      { time: 'ทุก 3 นาที', text: 'จุดพลุเหนือโบสถ์ (ตรงนาทีเดียวกันทุกเครื่อง)' },
      { time: 'ทุก ~2 นาที', text: 'ประกวดธิดาลูกชิ้น · มวยตู้ยกใหม่ · ลุงเป็ดตกน้ำ' },
      { time: 'ทั้งคืน', text: 'ชิงช้าสวรรค์ ม้าหมุน รถบั๊มพ์ ตู้คีบ บ้านผีสิง ซุ้มเกมแลกตั๋ว' },
    ],
    npcs: [
      { id: 'npc:fair_mc', name: 'พี่โบ๊ท', role: 'พิธีกรงานวัด' },
      { id: 'npc:fair_likay', name: 'พระเอกเพชร', role: 'พระเอกลิเก' },
    ],
    chat: ['ได้ตั๋วตั้ง 8 ใบ! 🎟️', 'ชิงช้าสวรรค์วิวสวยมาก 🎡', 'ไปรำวงกัน 💃', 'ผีบ้านไม่น่ากลัวเลย (กรี๊ด)', 'สายไหมติดผมอีกแล้ว', 'ใครจะแลกปลาทองกับหมีชมพูบ้าง', 'ตู้คีบใจร้ายมาก หลุดทุกรอบ 😭', 'รถบั๊มพ์ชนท้ายสนุกสุด!', 'พลุจะขึ้นแล้ว มาดูหน้าโบสถ์!', 'ตักได้ปลาทองหัวสิงห์! ✨', ...TRADE_CHAT.slice(3)],
  },
}

// ---------------------------------------------------------------------------
// Arrival: passport stamps and the hub_visit event.

export interface HubArrival {
  first: boolean
  firstToday: boolean
  stamps: number
}

/** Record an arrival on a hub map (call once per arrival). */
export function hubArrived(id: string): HubArrival {
  const day = dayKey()
  const h = game.value.hubs
  const first = !h.visited.includes(id)
  const firstToday = h.days[id] !== day
  mutate((d) => {
    if (!d.hubs.visited.includes(id)) d.hubs.visited.push(id)
    d.hubs.days[id] = day
    d.hubs.visits++
  })
  track('hub_visit')
  const stamps = passportStamps()
  const meta = HUB_META[id]
  if (meta && first && meta.kind === 'market') toast(`ได้ตราประทับ${meta.short}แล้ว! พาสปอร์ตตลาด ${stamps}/${HUB_IDS.length}`, 'map')
  else if (meta && firstToday) toast(`ยินดีต้อนรับสู่${meta.name}!`, meta.icon, 'info')
  return { first, firstToday, stamps }
}

/** Market passport: how many of the six hubs are stamped. */
export function passportStamps(s = game.value): number {
  return HUB_IDS.filter((id) => s.hubs.visited.includes(id)).length
}

export const PASSPORT_REWARD = { coins: 300, tickets: 20 }

export function claimPassport(): boolean {
  if (game.value.hubs.passport || passportStamps() < HUB_IDS.length) return false
  mutate((d) => {
    d.hubs.passport = true
    d.hubs.tickets += PASSPORT_REWARD.tickets
    d.hubs.ticketsTotal += PASSPORT_REWARD.tickets
    d.hubs.prizes.hub_passport_gold = (d.hubs.prizes.hub_passport_gold ?? 0) + 1
    addToCollection(d, 'hub_passport_gold', 1)
  })
  addCoins(PASSPORT_REWARD.coins)
  track('collectible')
  toast('พาสปอร์ตนักช้อปทองคำ! ครบทั้งหกตลาดแล้ว', 'gift')
  return true
}

// ---------------------------------------------------------------------------
// Fair games: ticket maths (pure) and round bookkeeping.

export type FairGameId = 'darts' | 'rings' | 'cork' | 'scoop' | 'bumper' | 'ramwong'

export interface FairGameDef {
  id: FairGameId
  name: string
  booth: string
  icon: string
  goal: string
  steps: string[]
  /** Round length (s). */
  time: number
}

export const FAIR_GAMES: Record<FairGameId, FairGameDef> = {
  darts: {
    id: 'darts',
    name: 'ปาลูกโป่ง',
    booth: 'ซุ้มปาลูกโป่งพี่ตุ๊ก',
    icon: 'sparkle',
    goal: 'ปาลูกดอกให้โดนลูกโป่งให้ได้มากที่สุด',
    steps: ['แตะที่ลูกโป่งเพื่อปาลูกดอก (ลูกดอกบินช้านิดนึง ปาดักหน้าไว้)', 'ลูกโป่งทอง +3 · ลูกโป่งหมูดึ๋งที่ลอยผ่าน +5 · ลูกโป่งเหล็กปาไม่แตก', 'มีลูกดอก 12 ดอก ปาโดนติดกันได้โบนัสคอมโบ'],
    time: 35,
  },
  rings: {
    id: 'rings',
    name: 'โยนห่วง',
    booth: 'ซุ้มโยนห่วงลุงแหวน',
    icon: 'gift',
    goal: 'โยนห่วงให้คล้องคอขวดและตุ๊กตา',
    steps: ['ลากนิ้วขึ้นแล้วปล่อยเพื่อโยนห่วง', 'ลากยาว = โยนไกล · เอียงซ้ายขวาเพื่อเล็ง', 'แถวหลังคะแนนสูงกว่า มีห่วง 8 วง'],
    time: 40,
  },
  cork: {
    id: 'cork',
    name: 'ยิงปืนจุก',
    booth: 'ซุ้มยิงปืนจุกเฮียปัง',
    icon: 'star',
    goal: 'ยิงจุกคอร์กให้ของรางวัลตกจากชั้น',
    steps: ['แตะค้างแล้วลากเพื่อเล็ง (เป้าส่ายนิด ๆ) ปล่อยนิ้วเพื่อยิง', 'ของเล็กโดนทีเดียวตก ตุ๊กตาต้องสองนัด หมียักษ์สามนัด (ยิงหัวแรงกว่า)', 'เป็ดว่ายบนราง ยิงโดนได้โบนัส มีจุก 10 นัด'],
    time: 40,
  },
  scoop: {
    id: 'scoop',
    name: 'ตักปลาทอง',
    booth: 'ซุ้มตักปลาป้าพร',
    icon: 'koi',
    goal: 'ตักปลาทองด้วยกระดาษโปยให้ได้มากที่สุด',
    steps: ['แตะค้างในอ่างเพื่อจุ่มโปย ลากไปใต้ปลา แล้วปล่อยนิ้วเพื่อช้อนขึ้น', 'จุ่มนานหรือลากเร็วกระดาษจะขาด! มีโปย 3 อัน', 'ปลาดำ +2 · ปลาสามสี +3 · ปลาทองหัวสิงห์ +5 เอากลับบ้านได้หนึ่งตัว'],
    time: 40,
  },
  bumper: {
    id: 'bumper',
    name: 'รถบั๊มพ์',
    booth: 'ลานรถบั๊มพ์ซิ่งสายฟ้า',
    icon: 'bolt',
    goal: 'ขับรถบั๊มพ์ไปชนรถคันอื่นให้ได้มากที่สุด',
    steps: ['แตะค้างที่ไหน รถจะพุ่งไปทางนั้น ปล่อยนิ้วเพื่อเบรก', 'ชนแรง ๆ ได้แต้ม ชนท้ายหรือชนข้างได้สองเท่า', 'รถสีทองชนได้ +3 ระวังโดนชนจนหมุนติ้ว!'],
    time: 30,
  },
  ramwong: {
    id: 'ramwong',
    name: 'รำวงมาตรฐาน',
    booth: 'ลานรำวงวงดนตรีลุงเสนาะ',
    icon: 'music',
    goal: 'รำตามจังหวะกลองโทนให้ตรงเพลง',
    steps: ['ท่ารำจะลอยมาตามวง แตะฝั่งซ้ายหรือขวาของจอให้ตรงกับท่า', 'แตะตอนท่าเข้าวงทองพอดี = เป๊ะ! ต่อคอมโบได้แต้มเพิ่ม', 'ผู้เล่นคนอื่นที่อยู่บนลานรำจะรำไปพร้อมกับคุณ'],
    time: 36,
  },
}

export const FAIR_GAME_IDS = Object.keys(FAIR_GAMES) as FairGameId[]
/** Coins per round after the free first round of the day. */
export const FAIR_PLAY_COST = 10
/** Rounds per game per day that pay full tickets. */
export const FAIR_FULL_ROUNDS = 6

/** Price of the next round when `playsToday` rounds were played today. */
export function fairPlayCost(playsToday: number): number {
  return playsToday <= 0 ? 0 : FAIR_PLAY_COST
}

/** Tickets won for a round: by stars, halved after the daily full rounds. */
export function ticketsFor(stars: number, playsBefore: number): number {
  const s = Math.max(0, Math.min(3, Math.floor(stars)))
  const base = [1, 3, 5, 8][s]
  return playsBefore >= FAIR_FULL_ROUNDS ? Math.ceil(base / 2) : base
}

export function fairPlaysToday(gameId: string, s = game.value): number {
  return s.hubs.plays.day === dayKey() ? (s.hubs.plays.n[gameId] ?? 0) : 0
}

/** Pay for a round (the first each day is free). Returns false if you can't afford it. */
export function startFairRound(gameId: FairGameId): boolean {
  const cost = fairPlayCost(fairPlaysToday(gameId))
  if (cost > 0 && game.value.coins < cost) {
    toast('บุญคอยน์ไม่พอค่าเล่นรอบนี้', 'coin', 'warn')
    return false
  }
  mutate((d) => {
    const day = dayKey()
    if (d.hubs.plays.day !== day) d.hubs.plays = { day, n: {} }
    d.hubs.plays.n[gameId] = (d.hubs.plays.n[gameId] ?? 0) + 1
    if (cost > 0) d.coins -= cost
  })
  return true
}

export interface FairRoundResult {
  tickets: number
  best: boolean
  total: number
  /** A little merit: the booths' takings go to the temple. */
  merit: number
}

/** Book a finished round: tickets, best score and the fair_game event. */
export function finishFairRound(gameId: FairGameId, stars: number, score: number): FairRoundResult {
  // The round was already counted by startFairRound.
  const before = Math.max(0, fairPlaysToday(gameId) - 1)
  const tickets = ticketsFor(stars, before)
  const best = score > (game.value.hubs.best[gameId] ?? 0)
  mutate((d) => {
    d.hubs.tickets += tickets
    d.hubs.ticketsTotal += tickets
    if (best) d.hubs.best[gameId] = score
  })
  track('fair_game')
  const merit = addMerit(1 + Math.max(0, Math.min(3, stars)), { key: `fair:${gameId}`, free: 6 })
  return { tickets, best, total: game.value.hubs.tickets, merit }
}

// ---------------------------------------------------------------------------
// Prize booth.

export interface FairPrize {
  id: string
  name: string
  desc: string
  tickets: number
  kind: 'collectible' | 'outfit' | 'coins'
  /** Collectible id, outfit id, or coin amount. */
  ref: string
  amount?: number
  /** Art motif for the booth icon. */
  art: string
  /** Max redemptions (collectibles are one each unless set). */
  limit?: number
}

const prizeFromCollectible = (id: string, tickets: number, limit = 1): FairPrize => {
  const c = HUB_COLLECTIBLE_BY_ID[id]
  return { id, name: c?.name ?? id, desc: c?.desc ?? '', tickets, kind: 'collectible', ref: id, art: c?.art.motif ?? 'star', limit }
}

export const FAIR_PRIZES: FairPrize[] = [
  { id: 'prize_coins_s', name: 'ถุงเหรียญบุญ', desc: 'บุญคอยน์ 30 เหรียญ แลกได้ไม่จำกัด', tickets: 6, kind: 'coins', ref: 'coins', amount: 30, art: 'coins' },
  prizeFromCollectible('fair_goldfish', 8, 3),
  prizeFromCollectible('fair_ghost_keychain', 14),
  prizeFromCollectible('fair_balloon_hippo', 18),
  { id: 'prize_lookchin', name: 'ลูกชิ้นปิ้ง (ชุดแต่งตัว)', desc: 'ถือไม้ลูกชิ้นเดินงานวัดให้ครบสูตร', tickets: 20, kind: 'outfit', ref: 'hand_lookchin', art: 'lookchin' },
  prizeFromCollectible('fair_teddy_pink', 30),
  prizeFromCollectible('fair_uncle_duck', 34),
  prizeFromCollectible('fair_likay_doll', 40),
  { id: 'prize_likay_hat', name: 'ปันจุเหร็จลิเก (ชุดแต่งตัว)', desc: 'ขนนกฟูเพชรวิบวับแบบพระเอกลิเก', tickets: 55, kind: 'outfit', ref: 'head_likay', art: 'likayhat' },
  prizeFromCollectible('fair_ferris_globe', 70),
  prizeFromCollectible('fair_mega_hippo', 150),
]

export const FAIR_PRIZE_BY_ID: Record<string, FairPrize> = Object.fromEntries(FAIR_PRIZES.map((p) => [p.id, p]))

export function prizeOwned(p: FairPrize, s = game.value): number {
  if (p.kind === 'outfit') return s.outfits.includes(p.ref) ? 1 : 0
  if (p.kind === 'collectible') return s.hubs.prizes[p.ref] ?? 0
  return s.hubs.prizes[p.id] ?? 0
}

export function prizeAvailable(p: FairPrize, s = game.value): boolean {
  if (p.kind === 'outfit') return !s.outfits.includes(p.ref)
  if (p.kind === 'collectible') return prizeOwned(p, s) < (p.limit ?? 1)
  return true
}

/** Swap tickets for a prize. */
export function redeemPrize(id: string): boolean {
  const p = FAIR_PRIZE_BY_ID[id]
  if (!p || !prizeAvailable(p)) return false
  if (game.value.hubs.tickets < p.tickets) {
    toast(`ตั๋วไม่พอ ต้องใช้ ${p.tickets} ใบ`, 'gift', 'warn')
    return false
  }
  mutate((d) => {
    d.hubs.tickets -= p.tickets
    if (p.kind === 'collectible') {
      d.hubs.prizes[p.ref] = (d.hubs.prizes[p.ref] ?? 0) + 1
      addToCollection(d, p.ref, 1)
    } else if (p.kind !== 'outfit') d.hubs.prizes[p.id] = (d.hubs.prizes[p.id] ?? 0) + 1
  })
  // Wardrobe grant (records it as new in the bag); plain push if the id is unknown.
  if (p.kind === 'outfit' && !grantOutfit(p.ref))
    mutate((d) => {
      if (!d.outfits.includes(p.ref)) d.outfits.push(p.ref)
    })
  if (p.kind === 'coins') addCoins(p.amount ?? 0)
  if (p.kind === 'collectible') track('collectible')
  const outfit = p.kind === 'outfit' ? OUTFITS.find((o) => o.id === p.ref) : null
  toast(`แลก${outfit?.name ?? p.name}แล้ว!`, 'gift')
  return true
}

// ---------------------------------------------------------------------------
// Notice board (simulated, deterministic per 10-minute slot).

export interface HubPost {
  name: string
  level: number
  text: string
  ago: number
}

const SLOT_MS = 600_000

/** Share of everyone online who hangs out at each hub (the rest are at temples). */
const CROWD_SHARE: Record<string, number> = { hub_chatuchak: 0.12, [FAIR_ID]: 0.08 }
const CROWD_SHARE_DEFAULT = 0.05

/**
 * How many (simulated) players are in the whole market right now: a slice of
 * the game's (simulated) online count, so the numbers on the board add up.
 */
export function hubCrowd(id: string, now = Date.now(), online = presence().onlineCount()): number {
  const slot = Math.floor(now / SLOT_MS)
  const share = CROWD_SHARE[id] ?? CROWD_SHARE_DEFAULT
  return Math.max(8, Math.round(online * share * new Rng(`crowd:${id}:${slot}`).range(0.8, 1.25)))
}

/** Recent chatter on the board: who is looking for what. */
export function hubFeed(id: string, now = Date.now(), n = 5): HubPost[] {
  const meta = HUB_META[id]
  if (!meta) return []
  const slot = Math.floor(now / SLOT_MS)
  const r = new Rng(`feed:${id}:${slot}`)
  const out: HubPost[] = []
  let ago = 0
  for (let i = 0; i < n; i++) {
    const p = simulatedProfile(`feed:${id}:${slot}:${i}`)
    ago += r.int(1, 4)
    out.push({ name: p.name, level: p.level, text: r.pick(meta.chat), ago })
  }
  return out
}

/** Today's recommended stall (same all day). */
export function hubPick(id: string, day = dayKey()): { shop: string; text: string } | null {
  const meta = HUB_META[id]
  if (!meta?.picks.length) return null
  return new Rng(`pick:${id}:${day}`).pick(meta.picks)
}
