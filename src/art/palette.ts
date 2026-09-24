// Boondee master palette: warm, soft and a little candy-coloured.
// Outlines use a plum-brown instead of black so everything feels cosy.

export const P = {
  ink: '#3a2838',
  ink2: '#5a3d4f',
  white: '#fffaf0',
  cream: '#fff1d6',
  sand: '#f3dcb2',
  tan: '#e0bb8a',
  brownL: '#c28e5c',
  brown: '#9a6a45',
  brownD: '#6e4a35',
  brownDD: '#4a3128',

  stoneL: '#e4ddd6',
  stone: '#bdb2ae',
  stoneD: '#8c8187',
  stoneDD: '#625867',

  redL: '#ff8a7a',
  red: '#e8514a',
  redD: '#b8343f',
  redDD: '#7e2436',
  orangeL: '#ffbb66',
  orange: '#f58f35',
  orangeD: '#d0661f',
  goldL: '#fff3a6',
  gold: '#ffd54f',
  goldD: '#e9a53a',
  goldDD: '#b8742a',
  yellow: '#ffe45e',

  pinkL: '#ffd6e0',
  pink: '#ff9fc0',
  pinkD: '#e8709e',
  blush: '#ff9aa6',

  mint: '#c8f0cf',
  grassL: '#b4e486',
  grass: '#86c95f',
  grassD: '#5ea653',
  leaf: '#43905a',
  leafD: '#2f6f4b',
  leafDD: '#224f3e',

  waterL: '#b3eef4',
  water: '#78d2e2',
  waterD: '#47a6cb',
  waterDD: '#2f77a8',
  skyL: '#d4f1ff',
  sky: '#a4dcff',
  skyD: '#72b8f0',
  blueL: '#9fd0ff',
  blue: '#5a8de0',
  blueD: '#3d63b5',

  lilacL: '#e2d2ff',
  lilac: '#bea2f5',
  purple: '#9270dc',
  purpleD: '#6448ad',

  night: '#2c2f63',
  nightD: '#1e2048',
  nightDD: '#15163a',
} as const

/** Traditional Thai colour of each weekday (สีประจำวัน), Sunday first. */
export const DAY_COLORS = [
  { name: 'แดง', day: 'อาทิตย์', hex: '#e8514a', shade: '#b8343f', light: '#ff8a7a' },
  { name: 'เหลือง', day: 'จันทร์', hex: '#ffd23f', shade: '#e0a526', light: '#fff09a' },
  { name: 'ชมพู', day: 'อังคาร', hex: '#ff9fc0', shade: '#e8709e', light: '#ffd6e0' },
  { name: 'เขียว', day: 'พุธ', hex: '#6cc36a', shade: '#44944f', light: '#b4e486' },
  { name: 'ส้ม', day: 'พฤหัสบดี', hex: '#f58f35', shade: '#d0661f', light: '#ffbb66' },
  { name: 'ฟ้า', day: 'ศุกร์', hex: '#7fc4ff', shade: '#4f94d8', light: '#c4e6ff' },
  { name: 'ม่วง', day: 'เสาร์', hex: '#a283e8', shade: '#7255c2', light: '#d8c8ff' },
] as const

export const SKIN_TONES = [
  { id: 'skin1', name: 'ผิวขาวอมชมพู', l: '#ffe7d3', b: '#fdd3b6', d: '#eeae90' },
  { id: 'skin2', name: 'ผิวสองสี', l: '#fbd6b0', b: '#f0bd90', d: '#d6966c' },
  { id: 'skin3', name: 'ผิวแทน', l: '#e8b186', b: '#cf9163', d: '#a86d47' },
  { id: 'skin4', name: 'ผิวเข้ม', l: '#b98056', b: '#9a6440', d: '#744a31' },
] as const

export const HAIR_COLORS = [
  { id: 'black', name: 'ดำ', l: '#5a4a5e', b: '#3b2f40', d: '#261d2b' },
  { id: 'brown', name: 'น้ำตาล', l: '#9c6a4a', b: '#744a33', d: '#523324' },
  { id: 'chestnut', name: 'น้ำตาลแดง', l: '#c77a55', b: '#a0553b', d: '#733a2b' },
  { id: 'honey', name: 'น้ำผึ้ง', l: '#f0c27a', b: '#d19a52', d: '#a8733a' },
  { id: 'pink', name: 'ชมพูพาสเทล', l: '#ffc4d8', b: '#f59abb', d: '#d06f95' },
  { id: 'mint', name: 'มิ้นต์', l: '#b8f0dc', b: '#7fd3b5', d: '#4ea58b' },
  { id: 'silver', name: 'เทาเงิน', l: '#f0edf5', b: '#c9c3d6', d: '#9790a8' },
] as const
