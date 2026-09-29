// ห้องในบ้าน – the rooms of the player's home. Three base rooms plus one
// regional-style room per ภาค. The home province's regional room is free;
// the others open with a region rank (ranks.ts) or with level + Boon Coins.

import type { Region } from './places'
import type { TierId } from './ranks'

export type RoomId = 'bedroom' | 'shrine' | 'kitchen' | 'central' | 'north' | 'isan' | 'south' | 'bkk' | 'east' | 'west'

/** What you see through the room's window. */
export type WindowView = 'city' | 'bts' | 'garden' | 'river' | 'mountain' | 'field' | 'oldtown' | 'orchard' | 'kwai'

/** Window frame style. */
export type WindowFrame = 'alu' | 'black' | 'kitchen' | 'shutter' | 'lanna' | 'bamboo' | 'arch'

export interface RoomSpot {
  id: string
  x: number
  y: number
  flip?: boolean
}

export interface RoomUnlock {
  /** Player level needed to buy it with coins. */
  level?: number
  /** Price in Boon Coins (0 = free once the level is reached). */
  coins?: number
  /** Reaching this rank tier in the region unlocks it for free. */
  rank?: { region: Region; tier: TierId }
}

export interface RoomDef {
  id: RoomId
  name: string
  /** Short label for the room switcher. */
  short: string
  desc: string
  /** Regional rooms: the ภาค it belongs to. */
  region?: Region
  /** Built-ins (uid `fixed:<id>`), same rules as the bedroom's. */
  fixed: RoomSpot[]
  /** Furniture placed for free the first time the room opens. */
  starter: RoomSpot[]
  wallpaper: string
  floor: string
  view: WindowView | null
  frame: WindowFrame
  unlock: RoomUnlock
  /** Accent colour for tabs and cards. */
  color: string
}

const DOOR: RoomSpot = { id: 'door', x: 8, y: 2 }
const WIN: RoomSpot = { id: 'window_big', x: 4, y: 0 }
const buy = (region: Region): RoomUnlock => ({ level: 12, coins: 1500, rank: { region, tier: 'A' } })

export const ROOMS: RoomDef[] = [
  {
    id: 'bedroom',
    name: 'ห้องนอน',
    short: 'ห้องนอน',
    desc: 'ห้องแรกของเรา มีตู้เสื้อผ้าบานกระจก หิ้งพระ และวิวตึกสูงกลางกรุง',
    fixed: [{ id: 'wardrobe_mirror', x: 0, y: 0 }, { id: 'altar_shelf', x: 2, y: 0 }, WIN, DOOR],
    starter: [
      { id: 'bed_simple', x: 2, y: 0 },
      { id: 'side_table', x: 4, y: 0 },
      { id: 'plant_monstera', x: 7, y: 0 },
      { id: 'rug_mat', x: 4, y: 4 },
      { id: 'workbench', x: 7, y: 6 },
    ],
    wallpaper: 'wp_cream',
    floor: 'fl_oak',
    view: 'city',
    frame: 'alu',
    unlock: {},
    color: '#ff9fc0',
  },
  {
    id: 'shrine',
    name: 'ห้องพระ',
    short: 'ห้องพระ',
    desc: 'ห้องสงบกลางบ้าน มีโต๊ะหมู่บูชาใหญ่ สวดมนต์ได้บุญเหมือนไปวัด',
    fixed: [{ id: 'altar_grand', x: 3, y: 0 }, DOOR],
    starter: [
      { id: 'lotus_pot', x: 1, y: 0 },
      { id: 'lotus_pot', x: 7, y: 0 },
      { id: 'rug_cloth', x: 4, y: 3 },
      { id: 'cushion_khwan', x: 4, y: 3 },
      { id: 'garland_hang', x: 2, y: 1 },
      { id: 'garland_hang', x: 7, y: 1 },
    ],
    wallpaper: 'wp_rotnam',
    floor: 'fl_parquet',
    view: null,
    frame: 'alu',
    unlock: { level: 4, coins: 250 },
    color: '#ffd23f',
  },
  {
    id: 'kitchen',
    name: 'ห้องครัว',
    short: 'ห้องครัว',
    desc: 'ครัวไทยพร้อมเตาและครกหิน ทำอาหารใส่บาตรเองได้บุญแรงกว่าซื้อ',
    fixed: [{ id: 'kitchen_counter', x: 0, y: 0 }, WIN, DOOR],
    starter: [
      { id: 'kitchen_fridge', x: 7, y: 0 },
      { id: 'rice_cooker', x: 5, y: 0 },
      { id: 'table_low', x: 4, y: 4 },
      { id: 'chair_rattan', x: 3, y: 4 },
      { id: 'chair_rattan', x: 6, y: 4, flip: true },
      { id: 'plant_monstera', x: 9, y: 7 },
    ],
    wallpaper: 'wp_tile',
    floor: 'fl_checker',
    view: 'garden',
    frame: 'kitchen',
    unlock: { level: 10, coins: 0 },
    color: '#7cd6b0',
  },
  {
    id: 'central',
    name: 'เรือนไทยภาคกลางริมน้ำ',
    short: 'เรือนริมน้ำ',
    desc: 'เรือนไม้ฝาปะกนริมเจ้าพระยา เปิดหน้าต่างเห็นเรือหางยาวแล่นผ่าน',
    region: 'central',
    fixed: [WIN, DOOR],
    starter: [
      { id: 'c_samkhok_jar', x: 0, y: 0 },
      { id: 'c_pinto', x: 2, y: 0 },
      { id: 'rug_mat', x: 3, y: 4 },
      { id: 'cushion_khwan', x: 4, y: 4 },
    ],
    wallpaper: 'wp_riverhouse',
    floor: 'fl_chan',
    view: 'river',
    frame: 'shutter',
    unlock: buy('central'),
    color: '#c8e58a',
  },
  {
    id: 'north',
    name: 'เรือนกาแลล้านนา',
    short: 'เรือนกาแล',
    desc: 'เรือนไม้สักทรงกาแล มองเห็นดอยสุเทพในทะเลหมอก กินขันโตกกันนะเจ้า',
    region: 'north',
    fixed: [WIN, DOOR],
    starter: [
      { id: 'n_khantok', x: 3, y: 4 },
      { id: 'n_tung', x: 0, y: 1 },
      { id: 'n_tung', x: 3, y: 1 },
      { id: 'cushion_khwan', x: 5, y: 4 },
    ],
    wallpaper: 'wp_lanna',
    floor: 'fl_lanna',
    view: 'mountain',
    frame: 'lanna',
    unlock: buy('north'),
    color: '#8fd06c',
  },
  {
    id: 'isan',
    name: 'ใต้ถุนเรือนอีสาน',
    short: 'ใต้ถุนอีสาน',
    desc: 'ใต้ถุนบ้านลมโกรก มีแคร่ไม้ไผ่ ไหปลาร้า และเสียงแคนจากทุ่งนา',
    region: 'northeast',
    fixed: [WIN, DOOR],
    starter: [
      { id: 'i_khrae', x: 1, y: 0 },
      { id: 'i_plara', x: 0, y: 2 },
      { id: 'rug_mat', x: 4, y: 4 },
    ],
    wallpaper: 'wp_khattae',
    floor: 'fl_earth',
    view: 'field',
    frame: 'bamboo',
    unlock: buy('northeast'),
    color: '#f4c86a',
  },
  {
    id: 'south',
    name: 'บ้านชิโนโปรตุกีสภูเก็ต',
    short: 'ชิโนฯ ภูเก็ต',
    desc: 'ตึกแถวเมืองเก่าสีพาสเทล หน้าต่างโค้งบานเกล็ด โคมแดงแขวนเรียงราย',
    region: 'south',
    fixed: [WIN, DOOR],
    starter: [
      { id: 's_lantern', x: 1, y: 0 },
      { id: 's_lantern', x: 3, y: 0 },
      { id: 's_mukchair', x: 1, y: 1 },
      { id: 'plant_bonsai', x: 0, y: 0 },
    ],
    wallpaper: 'wp_sino',
    floor: 'fl_peranakan',
    view: 'oldtown',
    frame: 'arch',
    unlock: buy('south'),
    color: '#5fc27c',
  },
  {
    id: 'bkk',
    name: 'คอนโดกรุงเทพวิวรถไฟฟ้า',
    short: 'คอนโดวิวBTS',
    desc: 'คอนโดชั้นสิบ กระจกเต็มผนัง รถไฟฟ้าวิ่งผ่านหน้าห้องแบบใกล้มาก',
    region: 'bangkok',
    fixed: [{ id: 'window_wide', x: 1, y: 0 }, DOOR],
    starter: [
      { id: 'b_sofa', x: 2, y: 3 },
      { id: 'b_robot', x: 6, y: 6 },
      { id: 'plant_monstera', x: 0, y: 0 },
    ],
    wallpaper: 'wp_loft',
    floor: 'fl_marble',
    view: 'bts',
    frame: 'black',
    unlock: buy('bangkok'),
    color: '#ff9fc0',
  },
  {
    id: 'east',
    name: 'บ้านสวนทุเรียนภาคตะวันออก',
    short: 'บ้านสวน',
    desc: 'บ้านไม้กลางสวนทุเรียนจันทบุรี หน้าต่างเปิดรับลมกลิ่นหมอนทอง',
    region: 'east',
    fixed: [WIN, DOOR],
    starter: [
      { id: 'e_durian', x: 0, y: 0 },
      { id: 'e_ngop', x: 1, y: 1 },
      { id: 'rug_mat', x: 4, y: 4 },
    ],
    wallpaper: 'wp_orchard',
    floor: 'fl_redtile',
    view: 'orchard',
    frame: 'shutter',
    unlock: buy('east'),
    color: '#86d6c0',
  },
  {
    id: 'west',
    name: 'เรือนแพกาญจนบุรี',
    short: 'เรือนแพ',
    desc: 'เรือนแพลอยน้ำแคว ภูเขาหินปูนตรงหน้า นอนเปลไกวฟังเสียงน้ำ',
    region: 'west',
    fixed: [WIN, DOOR],
    starter: [
      { id: 'w_hammock', x: 3, y: 3 },
      { id: 'w_lifering', x: 1, y: 1 },
      { id: 'w_fishtrap', x: 0, y: 0 },
    ],
    wallpaper: 'wp_raft',
    floor: 'fl_bamboo',
    view: 'kwai',
    frame: 'bamboo',
    unlock: buy('west'),
    color: '#dcc47c',
  },
]

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, RoomDef>

export const ROOM_IDS: RoomId[] = ROOMS.map((r) => r.id)

export function isRoomId(id: unknown): id is RoomId {
  return typeof id === 'string' && id in ROOM_BY_ID
}

/** The regional room of each ภาค. */
export const REGION_ROOM: Record<Region, RoomId> = {
  central: 'central',
  north: 'north',
  northeast: 'isan',
  south: 'south',
  bangkok: 'bkk',
  east: 'east',
  west: 'west',
}
