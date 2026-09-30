// Dishes and stall snacks for the food icons (16×16, food kit style).
// DISHES_ART draws the home-cooked dishes of data/recipes.ts (gold = the
// ฝีมือเชฟ variant on a gilded vessel with a twinkle); SNACK_ICON_ART draws
// every snack sold at place and hub stalls (keyed by snack id) plus a few
// extra Thai classics other systems can use as icon names.

import { M, Pix, R5, ramp, twinkle, type Ramp } from './foodKit'
import { bowl, cup, plate, stick } from './foodVessels'

type Draw = (k: Pix) => void

// ---------------------------------------------------------------------------
// Toppings

function mound(k: Pix, cx: number, cy: number, rx: number, ry: number, r: Ramp, seed = 3) {
  k.form(r, (m) => m.ell(cx, cy, rx, ry, '#000'), 'ball', { lightAt: 0.55 })
  k.grains(Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(cx + rx), Math.ceil(cy + ry), r, seed)
}

/** ไข่ดาว: glossy white with a lacy golden crispy rim and a domed yolk. */
function friedEgg(k: Pix, cx: number, cy: number, rx: number, ry: number) {
  const c = M.crispy
  k.form(c, (m) => {
    m.ell(cx, cy + 0.4, rx, ry, '#000')
    m.px(cx - rx - 0.5, cy + 0.4, '#000')
    m.px(cx + rx - 0.5, cy - 0.4, '#000')
    m.px(cx + 1, cy + ry + 0.2, '#000')
  }, 'bevel', { sep: 'down' })
  k.form(M.eggW, (m) => m.ell(cx - 0.4, cy - 0.2, rx - 1, ry - 0.7, '#000'), 'ball', { rim: false, spec: false })
  // Lace bubbles on the crispy edge.
  k.on(cx - rx + 1, cy + 1, c.hi)
  k.on(cx + rx - 2, cy + 1, c.l)
  k.ball(cx + 0.5, cy - 0.5, Math.max(1.4, rx * 0.36), Math.max(1.3, ry * 0.55), M.yolk)
}

function lime(k: Pix, x: number, y: number) {
  k.form(M.lime, (m) => m.poly([[x, y], [x + 3, y - 1], [x + 3, y + 2]], '#000'), 'bevel')
  k.px(x + 2, y, M.lime.hi)
}

function cucumber(k: Pix, x: number, y: number) {
  k.px(x, y, M.cucumber.s)
  k.px(x + 1, y, M.cucumber.l)
  k.px(x, y + 1, M.cucumber.d)
  k.px(x + 1, y + 1, M.cucumber.m)
}

function sparkleGold(k: Pix, gold: boolean) {
  if (gold) twinkle(k, 13, 2)
}

/** Banana-leaf tray (กระทงใบตอง) seen from the front. */
function leafTray(k: Pix, gold = false, top = 8) {
  const l = gold ? M.gold : M.leaf
  k.form(l, (m) => m.poly([[1, top], [15, top], [13, 14], [3, 14]], '#000'), 'cyl')
  for (let x = 3; x <= 12; x += 3) k.on(x, top + 3, l.s)
  k.hline(2, 13, top, l.hi)
}

/** Clear broth in a bowl with bits floating on it. */
function brothBowl(k: Pix, broth: Ramp, gold: boolean, top = 7) {
  bowl(k, top, gold, broth)
}

// ---------------------------------------------------------------------------
// Home-cooked dishes

export const DISHES_ART: Record<string, (k: Pix, gold: boolean) => void> = {
  dish_kaijiao: (k, gold) => {
    plate(k, 12, gold)
    mound(k, 5, 9.4, 3.6, 2.6, M.rice, 2)
    // Puffy omelette with crispy lace.
    k.form(M.crispy, (m) => {
      m.ell(10, 8.6, 4.6, 3.2, '#000')
      m.px(14, 7, '#000')
      m.px(6, 10, '#000')
    }, 'bevel')
    k.ball(9.8, 8.2, 3.6, 2.4, M.yolk)
    k.px(11, 9, M.crispy.s)
    k.px(8, 7, M.crispy.l)
    // Sriracha squiggle.
    k.px(12, 7, M.chili.m)
    k.px(13, 8, M.chili.s)
    sparkleGold(k, gold)
  },
  dish_khaopad: (k, gold) => {
    plate(k, 12, gold)
    const fr = R5('#fff6d8', '#f8e2a8', '#ecc47a', '#cc9a52', '#96683a')
    mound(k, 7.5, 8.6, 5, 3.4, fr, 4)
    k.speckle(3, 6, 12, 11, M.yolk.m, 4, 12)
    k.speckle(3, 6, 12, 11, M.green.m, 3, 21)
    k.speckle(3, 6, 12, 11, M.chili.m, 2, 31)
    lime(k, 11, 10)
    cucumber(k, 2, 10)
    sparkleGold(k, gold)
  },
  dish_tomjued: (k, gold) => {
    brothBowl(k, R5('#fffbe6', '#fff4c8', '#f4e2a2', '#d8bf7c', '#a88c52'), gold)
    k.form(M.tofu, (m) => m.rect(4, 5, 2, 2, '#000'), 'bevel')
    k.ball(9, 6, 1.4, 1.2, M.brown, { spec: false })
    k.form(R5('#f4ffe0', '#d8f5b0', '#aee082', '#7cb85c', '#4f8a44'), (m) => m.ell(11.5, 6.8, 1.8, 1, '#000'), 'bevel')
    k.px(7, 7, M.green.m)
    k.px(6, 6, M.green.l)
    k.steam(3, 3)
    sparkleGold(k, gold)
  },
  dish_khaotom: (k, gold) => {
    bowl(k, 7, gold)
    k.form(R5('#ffffff', '#fffcf4', '#f5efe2', '#ddd0bc', '#b8a892'), (m) => m.ell(8, 7, 5.8, 1.8, '#000'), 'ball', { lightAt: 0.4 })
    k.px(5, 7, M.rice.s)
    k.px(10, 7, M.rice.s)
    k.ball(8.5, 6.4, 1.2, 1, M.brown, { spec: false })
    k.px(6, 6, M.green.l)
    k.px(11, 7, M.green.m)
    k.px(7, 7, '#f0c878')
    k.steam(4, 3)
    sparkleGold(k, gold)
  },
  dish_kaprao: (k, gold) => {
    // ข้าวกะเพรา ไข่ดาว: rice, basil pork, and a crispy fried egg on top.
    plate(k, 12, gold)
    mound(k, 4.8, 10, 3.6, 2.2, M.rice, 6)
    const pk = R5('#e8b080', '#b8703c', '#8a4a26', '#62321c', '#3e1e12')
    k.form(pk, (m) => m.ell(11, 10.2, 3.8, 2.3, '#000'), 'ball', { sep: true })
    k.speckle(8, 8, 14, 12, pk.l, 3, 5)
    k.px(13, 9, M.basil.l)
    k.px(12, 11, M.basil.m)
    k.px(9, 11, M.basil.m)
    k.px(14, 10, M.chili.m)
    friedEgg(k, 7.6, 5.6, 5, 3)
    sparkleGold(k, gold)
  },
  dish_khanomkrok: (k, gold) => {
    // ขนมครก: golden crisp half-spheres with coconut-cream tops and spring onion.
    leafTray(k, gold, 10)
    const piece = (x: number, y: number, sep: boolean) => {
      k.form(M.crispy, (m) => m.ell(x, y, 3, 2.3, '#000'), 'ball', { sep: sep ? 'down' : false, spec: false })
      k.form(M.cream, (m) => m.ell(x - 0.2, y - 0.5, 2, 1.3, '#000'), 'ball', { rim: false })
      k.px(Math.round(x), Math.round(y - 1), M.green.m)
    }
    piece(4.6, 7, false)
    piece(11.4, 7, false)
    piece(5.4, 10.6, true)
    piece(10.6, 10.6, true)
    sparkleGold(k, gold)
  },
  dish_bualoy: (k, gold) => {
    bowl(k, 7, gold, M.cream)
    // Rainbow glutinous-rice balls bobbing in coconut milk.
    const cols = [M.pandan, M.pink, M.orange, M.pandan]
    for (const [i, [x, y]] of ([[4.8, 7.4], [8, 6.6], [11.2, 7.4], [8.4, 8.8]] as [number, number][]).entries()) k.ball(x, y, 1.9, 1.6, cols[i], { sep: 'down' })
    sparkleGold(k, gold)
  },
  dish_padthai: (k, gold) => {
    // ผัดไทยห่อไข่: tamarind noodles wrapped in a thin omelette, cut open on
    // top, with a shrimp, chives, bean sprouts, peanuts and lime.
    plate(k, 12, gold)
    const om = R5('#fff6c0', '#ffe07a', '#f8c648', '#d8982e', '#9a6420')
    k.form(om, (m) => m.ell(7.6, 8.8, 5.4, 3.2, '#000'), 'ball', { sep: 'down' })
    // Folded envelope creases.
    k.line(3, 8, 7, 11, om.s)
    k.line(12, 8, 8, 11, om.s)
    // The cut: noodles peeking out.
    const n = R5('#ffe8c0', '#f7c486', '#e49a56', '#bb6e3a', '#844626')
    k.form(n, (m) => m.ell(7.6, 7.4, 2.6, 1.4, '#000'), 'ball', { spec: false })
    k.line(6, 7, 9, 8, n.s)
    k.form(M.shrimp, (m) => {
      m.px(6, 5, '#000')
      m.px(7, 5, '#000')
      m.px(8, 5, '#000')
      m.px(9, 6, '#000')
      m.px(5, 6, '#000')
    }, 'bevel', { sep: 'down' })
    k.px(7, 5, M.shrimp.hi)
    k.px(10, 6, M.green.m)
    k.px(11, 7, M.green.l)
    k.px(4, 10, '#fffaf0')
    k.px(3, 11, '#f4f0d8')
    lime(k, 11, 10)
    sparkleGold(k, gold)
  },
  dish_mango: (k, gold) => {
    plate(k, 12, gold)
    mound(k, 5, 9.2, 3.8, 2.8, M.sticky, 8)
    // Coconut cream drizzle and crispy mung beans.
    k.hline(3, 7, 7, M.cream.hi)
    k.px(3, 8, M.cream.l)
    k.px(6, 8, M.cream.l)
    k.px(4, 6, '#e8b848')
    k.px(6, 6, '#d49a38')
    // Mango cheek, scored.
    k.form(M.mango, (m) => m.poly([[8, 7], [11, 4.5], [14.5, 6.5], [14, 10.5], [9, 11.5]], '#000'), 'ball', { cx: 11.5, cy: 7.6, rx: 3.8, ry: 3.6 })
    for (const [x, y] of [[10, 7], [11, 8], [12, 9], [12, 6], [13, 7]] as [number, number][]) k.on(x, y, M.mango.s)
    k.px(11, 5, M.mango.hi)
    sparkleGold(k, gold)
  },
  dish_kiaowan: (k, gold) => {
    const c = R5('#eaf8c8', '#c0e48a', '#94c85a', '#6a9e40', '#44702c')
    bowl(k, 7, gold, c)
    k.ell(5, 6.6, 1.4, 0.9, M.chicken.m)
    k.px(9, 6, '#f2f8e0')
    k.px(10, 6, M.basil.s)
    k.px(11, 7, M.chili.m)
    k.px(7, 7, M.basil.m)
    k.px(12, 6, c.hi)
    k.steam(3, 3)
    sparkleGold(k, gold)
  },
}

// ---------------------------------------------------------------------------
// Snack builders

/** Grilled pieces on a bamboo stick (หมูปิ้ง, ลูกชิ้น, ไส้อั่ว…). */
function skewer(k: Pix, r: Ramp, pieces: [number, number, number, number][], o: { char?: string; glaze?: string; stick?: boolean; sep?: boolean } = {}) {
  if (o.stick !== false) stick(k, 2, 14, 14, 1)
  for (const [x, y, rx, ry] of pieces) {
    k.ball(x, y, rx, ry, r, { sep: o.sep ? 'down' : false })
    if (o.char) {
      k.on(x - 1, y + 1, o.char)
      k.on(x + 1, y, o.char)
    }
    if (o.glaze) k.on(x - 1, y - 1, o.glaze)
  }
}

/** A noodle bowl: broth, a tangle of noodles heaped above it, toppings, chopsticks. */
function noodleBowl(k: Pix, broth: Ramp, noodle: string, tops: [number, number, string][]) {
  bowl(k, 7, false, broth)
  const n = ramp(noodle)
  k.form(n, (m) => m.ell(8, 7, 4.2, 2, '#000'), 'ball', { spec: false })
  k.line(5, 6, 8, 8, n.s)
  k.line(8, 6, 11, 7, n.s)
  k.line(6, 7, 9, 6, n.l)
  for (const [x, y, c] of tops) k.px(x, y, c)
  // Chopsticks resting in the bowl.
  k.line(10, 6, 14, 0, M.wood.l)
  k.line(11, 6, 15, 1, M.wood.s)
}

/** Iced drink in a cup (optionally with a creamy layer). */
function iced(k: Pix, d: Ramp, straw: string, layer?: Ramp) {
  cup(k, d, { ice: true, straw, layer })
}

/** Dessert on a small plate: a shape drawer on top. */
function onPlate(k: Pix, draw: () => void, cy = 12) {
  plate(k, cy)
  draw()
}

/** Paper bag (เกาลัด, ถั่ว) with a heap of contents spilling over the top. */
function paperBag(k: Pix, paper: Ramp, fill: Ramp) {
  for (const [x, y] of [[5, 7], [8, 6], [11, 7], [6.5, 4.6], [9.5, 4.4], [8, 2.8]] as [number, number][]) k.ball(x, y, 1.9, 1.6, fill, { sep: 'down' })
  k.form(paper, (m) => m.poly([[3, 8], [13, 8], [12, 14.5], [4, 14.5]], '#000'), 'cyl', { sep: true })
  k.hline(3, 12, 8, paper.hi)
  k.px(7, 11, paper.s)
  k.px(9, 11, paper.s)
}

// ---------------------------------------------------------------------------
// Snacks (by snack id) and extra classics

const TEA_MILK = R5('#ffffff', '#fff8ec', '#f8ead2', '#e0caa4', '#b89a70')

export const SNACK_ICON_ART: Record<string, Draw> = {
  // ---- iced drinks ----
  chayen: (k) => iced(k, M.tea, '#ff5a8a', TEA_MILK),
  cha_chak: (k) => {
    // Pulled tea in a glass mug with a foamy head.
    k.form(M.glass, (m) => m.rect(3, 4, 9, 10, '#000'), 'cyl')
    k.form(M.milkTea, (m) => m.rect(3.5, 7, 8, 6.5, '#000'), 'cyl')
    k.form(TEA_MILK, (m) => m.ell(7.5, 5, 4.6, 2, '#000'), 'ball', { rim: false })
    k.px(5, 3, '#ffffff')
    k.px(8, 3, TEA_MILK.l)
    k.form(M.glass, (m) => {
      m.rect(12, 6, 2, 1, '#000')
      m.rect(13, 6, 1, 5, '#000')
      m.rect(12, 10, 2, 1, '#000')
    }, 'bevel')
    k.drop(10, 9, '#ffffff')
  },
  matoom: (k) => iced(k, R5('#fff0c0', '#f8cc78', '#e6a042', '#bc742a', '#824a1c'), '#86c95f'),
  chrysanthemum: (k) => {
    iced(k, R5('#fffbe0', '#fff0b0', '#f4dc84', '#d6b85e', '#a8883c'), '#86c95f')
    k.ball(6.5, 8, 1.6, 1.4, M.corn, { spec: false })
    k.px(6, 8, '#ffffff')
  },
  red_soda: (k) => iced(k, M.soda, '#86c95f'),
  hub_matcha: (k) => iced(k, M.pandan, '#3a3040', TEA_MILK),
  hub_longan_juice: (k) => {
    iced(k, R5('#fffbe8', '#fbf0cc', '#efdca6', '#d0b87c', '#a08a52'), '#ffd54f')
    k.ball(7, 9, 1.4, 1.4, M.coconutMeat, { spec: false })
    k.ball(9.5, 11, 1.3, 1.2, M.coconutMeat, { spec: false })
  },
  hub_lao_coffee: (k) => iced(k, M.choc, '#e8514a', TEA_MILK),
  fair_red_soda_bag: (k) => {
    // น้ำแดงถุง: plastic bag knotted with a rubber band, straw poking out.
    k.thick(10, 0.5, 8.5, 5, 0.6, '#86c95f')
    k.form(M.glass, (m) => m.poly([[6, 2], [10, 2], [9, 5], [7, 5]], '#000'), 'bevel')
    k.hline(6, 10, 5, '#e8514a')
    k.form(M.soda, (m) => m.ell(8, 10.5, 5.6, 4, '#000'), 'ball')
    k.px(5, 9, M.ice.l)
    k.px(9, 11, M.ice.m)
    k.px(4, 8, '#ffffff')
    k.drop(11, 12, '#ffffff')
  },
  hub_blindbox_soda: (k) => {
    // Mystery-flavour can with a big "?".
    k.form(M.purple, (m) => m.rect(4, 3, 8, 11, '#000'), 'cyl')
    k.form(M.steel, (m) => m.rect(4, 2, 8, 2, '#000'), 'cyl')
    k.px(9, 1, M.steel.s)
    k.hline(6, 8, 6, '#fff3a6')
    k.px(9, 7, '#fff3a6')
    k.px(8, 8, '#fff3a6')
    k.px(7, 9, '#fff3a6')
    k.px(7, 11, '#fff3a6')
    k.drop(10, 10, '#ffffff')
  },
  hub_coconut_water: (k) => {
    SNACK_ICON_ART.coconut(k)
    // Scorched top from roasting (มะพร้าวเผา).
    k.px(6, 4, M.husk.m)
    k.px(10, 4, M.husk.m)
  },

  // ---- ice cream & chilled sweets ----
  icecream_coconut: (k) => {
    // ไอติมกะทิ in a coconut shell, with peanuts and a palm seed.
    k.form(M.husk, (m) => m.ell(8, 11, 6.5, 3.4, '#000'), 'ball')
    k.speckle(2, 11, 14, 14, M.husk.d, 5, 7)
    k.ell(8, 9, 6.4, 1.5, M.coconutMeat.m)
    k.ball(6.2, 7, 2.8, 2.5, M.cream, { sep: 'down' })
    k.ball(10, 6.4, 2.8, 2.6, M.cream, { sep: 'down' })
    k.ball(8, 4.2, 2.4, 2.2, M.cream, { sep: 'down' })
    k.px(6, 6, '#e0a860')
    k.px(10, 5, '#e0a860')
    k.px(8, 3, '#c07a40')
    k.px(12, 8, '#b4e486')
    k.fx(13, 3, '#ffffff')
  },
  hub_coconut_icecream: (k) => {
    SNACK_ICON_ART.icecream_coconut(k)
    k.px(4, 8, M.sticky.l)
    k.px(5, 9, M.sticky.m)
  },
  hub_catface_icecream: (k) => {
    // Orange cat-face scoop in a cone, cookie ears.
    k.form(M.crispy, (m) => m.poly([[4, 9], [12, 9], [8, 15]], '#000'), 'bevel')
    k.line(6, 10, 8, 13, M.crispy.s)
    k.line(10, 10, 8, 12, M.crispy.s)
    k.form(M.brown, (m) => {
      m.poly([[3, 5], [4, 1], [7, 4]], '#000')
      m.poly([[13, 5], [12, 1], [9, 4]], '#000')
    }, 'bevel')
    k.ball(8, 6.4, 5, 3.6, M.orange)
    k.px(6, 6, '#3a3040')
    k.px(10, 6, '#3a3040')
    k.px(8, 7, '#e8709e')
    k.px(4, 7, '#ff9aa6')
    k.px(12, 7, '#ff9aa6')
  },
  hub_ice_pop: (k) => {
    // Three-colour ice pop on a stick.
    k.form(M.wood, (m) => m.rect(7, 11, 2, 4, '#000'), 'bevel')
    k.form(M.soda, (m) => m.poly([[4, 3], [6, 1], [10, 1], [12, 3], [12, 5], [4, 5]], '#000'), 'cyl')
    k.form(M.orange, (m) => m.rect(4, 5, 8, 3, '#000'), 'cyl')
    k.form(M.pandan, (m) => m.rect(4, 8, 8, 3, '#000'), 'cyl')
    k.px(10, 12, M.soda.m)
    k.px(10, 13, M.soda.s)
  },
  oh_aew: (k) => {
    // Clear jelly shaved-ice dessert with red syrup.
    bowl(k, 8)
    k.form(M.ice, (m) => m.ell(8, 6, 5.4, 3.6, '#000'), 'ball')
    k.speckle(3, 3, 12, 8, M.soda.m, 5, 4)
    k.px(6, 6, M.pandan.m)
    k.px(9, 5, '#fff3a6')
    k.px(10, 7, M.ice.s)
  },

  // ---- sweets ----
  mango_sticky: (k) => DISHES_ART.dish_mango(k, false),
  hub_mango_pistachio: (k) => {
    DISHES_ART.dish_mango(k, false)
    k.px(4, 6, '#9cd46a')
    k.px(6, 6, '#6cb04c')
    k.px(5, 7, '#b4e486')
  },
  roti_saimai: (k) => {
    // Thin roti sheet with a puff of pink cotton-candy floss.
    k.form(R5('#fff8e8', '#fbeccc', '#f2d8a8', '#d6b27a', '#a8844c'), (m) => m.poly([[1, 10], [7, 7], [15, 9], [11, 14], [3, 13]], '#000'), 'bevel')
    k.speckle(2, 9, 13, 13, '#e8c080', 4, 3)
    k.form(M.pink, (m) => {
      m.ell(7, 6, 4.4, 3.4, '#000')
      m.ell(10.4, 5, 3, 2.6, '#000')
    }, 'ball', { cx: 8, cy: 5.5, rx: 5, ry: 3.5 })
    k.speckle(4, 3, 12, 8, M.pink.l, 4, 9)
  },
  hub_sai_mai: (k) => {
    // สายไหม: fluffy pink cloud on a stick.
    k.line(8, 14, 8, 9, M.wood.l)
    k.form(M.pink, (m) => {
      m.ell(8, 6, 5.6, 4.6, '#000')
      m.ell(4.5, 7, 2.6, 2.4, '#000')
      m.ell(11.6, 5, 2.6, 2.6, '#000')
    }, 'ball', { cx: 8, cy: 6, rx: 6, ry: 5 })
    k.speckle(3, 2, 13, 10, M.pink.l, 6, 13)
    k.speckle(3, 2, 13, 10, M.pink.s, 3, 5)
  },
  kalamae: (k) => onPlate(k, () => {
    const c = M.choc
    for (const [x, y] of [[3, 6], [8, 6], [5, 9], [10, 9]] as [number, number][]) {
      k.form(c, (m) => m.rect(x, y, 4, 3, '#000'), 'bevel')
      k.px(x + 1, y, c.hi)
    }
  }),
  khanom_la: (k) => onPlate(k, () => {
    // Lacy golden threads folded into a parcel.
    const g = M.gold
    k.form(g, (m) => m.poly([[3, 5], [13, 4], [14, 10], [2, 11]], '#000'), 'bevel')
    for (let y = 5; y <= 10; y++) for (let x = 3 + (y % 2); x <= 13; x += 2) k.on(x, y, g.s)
    k.line(3, 8, 13, 7, g.l)
  }),
  baba_sweets: (k) => onPlate(k, () => {
    // เต้าส้อ pastry + a green อาโป้ง.
    k.ball(5.4, 8.4, 3.4, 2.4, M.crispy)
    k.px(5, 7, M.crispy.d)
    k.px(6, 7, M.crispy.d)
    k.ball(10.8, 8.6, 3, 2.2, M.pandan)
    k.ell(10.8, 8.6, 1.4, 0.8, M.cream.l)
    k.px(9, 5, M.pink.m)
    k.px(10, 6, M.pink.l)
  }),
  kanom_pang: (k) => {
    // ขนมปังสังขยา: fluffy steamed bread slices with green pandan custard.
    const b = R5('#ffffff', '#fffaf0', '#f6ead4', '#dcc8a8', '#b09a78')
    k.form(b, (m) => m.poly([[2, 5], [9, 3], [12, 8], [5, 10]], '#000'), 'bevel')
    k.form(M.pandan, (m) => m.poly([[3.4, 5.4], [8.6, 4], [10.4, 7.4], [5.4, 8.6]], '#000'), 'ball', { cx: 7, cy: 6, rx: 4, ry: 3 })
    k.px(6, 5, M.pandan.hi)
    k.form(b, (m) => m.poly([[5, 10], [12, 8], [14.5, 12], [7.5, 14.5]], '#000'), 'bevel', { sep: true })
    k.form(M.pandan, (m) => m.poly([[6.4, 10.4], [11.6, 9], [13, 11.8], [8, 13.4]], '#000'), 'ball', { cx: 10, cy: 11, rx: 4, ry: 2.5 })
    k.px(9, 10, M.pandan.hi)
  },
  hub_roti_banana: (k) => onPlate(k, () => {
    // Folded crispy roti squares, banana slices, condensed milk zigzag.
    const r = R5('#fff4d0', '#f8d890', '#e8b456', '#c08432', '#8a5a22')
    k.form(r, (m) => m.poly([[2, 8], [8, 5], [14, 8], [8, 11]], '#000'), 'bevel')
    k.line(5, 8, 8, 7, '#ffffff')
    k.line(8, 7, 11, 8, '#ffffff')
    k.px(6, 7, M.banana.l)
    k.px(10, 9, M.banana.l)
    k.px(8, 9, '#fff8e0')
  }),
  hub_kanom_tan: (k) => {
    // Fluffy yellow palm cakes in leaf cups.
    for (const [x, y] of [[4.5, 9], [11.5, 9], [8, 6]] as [number, number][]) {
      k.form(M.leaf, (m) => m.poly([[x - 3, y], [x + 3, y], [x + 2, y + 3], [x - 2, y + 3]], '#000'), 'cyl')
      k.ball(x, y - 0.6, 2.6, 2, M.corn)
      k.px(Math.round(x), Math.round(y - 3), M.cream.hi)
    }
  },
  hub_kanom_krok: (k) => DISHES_ART.dish_khanomkrok(k, false),
  fair_khanom_tokyo: (k) => {
    // Rolled crepes with pandan cream, on a paper sheet.
    k.form(M.paper, (m) => m.poly([[1, 10], [15, 8], [15, 13], [1, 14]], '#000'), 'bevel')
    const c = R5('#fff4d8', '#f8d8a0', '#e8b870', '#c48c48', '#8a5a2c')
    for (const [y, fill] of [[5, M.pandan], [9, M.pink]] as [number, Ramp][]) {
      k.form(c, (m) => m.rect(3, y, 10, 3, '#000'), 'cyl')
      k.ell(13, y + 1.5, 1.2, 1.4, fill.m)
      k.px(13, y + 1, fill.l)
    }
  },
  hub_hippo_pancake: (k) => onPlate(k, () => {
    // หมูดึ๋ง-face pancake with pink cheeks.
    const p = R5('#fff0c8', '#f8cc84', '#e0a052', '#b87438', '#804c24')
    k.form(p, (m) => {
      m.ell(8, 7.6, 5.4, 4, '#000')
      m.ell(4, 4, 1.6, 1.6, '#000')
      m.ell(12, 4, 1.6, 1.6, '#000')
    }, 'ball', { cx: 8, cy: 7, rx: 6, ry: 5 })
    k.ell(8, 9, 2.8, 1.6, p.l)
    k.px(6, 6, '#3a2838')
    k.px(10, 6, '#3a2838')
    k.px(7, 9, p.d)
    k.px(9, 9, p.d)
    k.px(4, 8, '#ff9aa6')
    k.px(12, 8, '#ff9aa6')
  }, 13),
  salapao: (k) => {
    // Two fluffy steamed buns, one with a red dot, one pleated.
    const b = R5('#ffffff', '#fffcf6', '#f6efe4', '#ddd0c0', '#b4a492')
    k.ball(5.5, 9, 4, 3.6, b)
    k.ball(11, 8.5, 3.6, 3.4, b)
    k.px(5, 7, M.red.m)
    k.px(11, 6, b.s)
    k.px(10, 7, b.s)
    k.px(12, 7, b.s)
    k.px(11, 7, b.d)
  },
  dumpling: (k) => {
    // Bamboo steamer with xiao long bao and a cup of tea behind.
    const w = M.wood
    k.form(w, (m) => m.poly([[1, 9], [15, 9], [14, 14], [2, 14]], '#000'), 'cyl')
    for (let x = 3; x <= 13; x += 2) k.on(x, 12, w.s)
    k.hline(2, 13, 10, w.d)
    for (const x of [4.5, 8, 11.5]) {
      k.ball(x, 7.6, 2.2, 2, M.cream)
      k.px(Math.round(x) - 1, 6, M.cream.s)
    }
  },
  fair_takoyaki: (k) => {
    // Takoyaki in a paper boat with sauce, mayo and bonito flakes.
    k.form(M.paper, (m) => m.poly([[1, 9], [15, 9], [13, 14], [3, 14]], '#000'), 'cyl')
    for (const [x, y] of [[4.5, 8], [8, 7], [11.5, 8]] as [number, number][]) {
      k.ball(x, y, 2.4, 2.2, M.crispy)
      k.on(x - 1, y - 1, M.sauce.m)
      k.on(x, y - 1, M.sauce.s)
    }
    k.line(3, 7, 13, 6, '#fffaf0')
    k.px(6, 5, '#e8a888')
    k.px(10, 5, '#f0c0a0')
    k.px(8, 6, M.green.m)
  },
  hub_popcorn: (k) => {
    // Striped popcorn bucket (ข้าวโพดคั่ว) overflowing with caramel corn.
    k.form(M.paper, (m) => m.poly([[3, 7], [13, 7], [12, 14], [4, 14]], '#000'), 'cyl')
    for (const x of [5, 8, 11]) k.form(M.red, (m) => m.poly([[x - 0.8, 7], [x + 0.8, 7], [x + 0.5, 14], [x - 0.5, 14]], '#000'), 'cyl')
    for (const [x, y] of [[4, 6], [6.5, 5], [9, 4.6], [11.6, 5.8], [5.6, 3], [8, 2.4], [10.4, 3.4]] as [number, number][]) k.ball(x, y, 1.7, 1.5, M.corn, { spec: false })
    k.px(7, 2, '#ffffff')
    k.px(10, 3, M.corn.hi)
    k.px(5, 5, M.crispy.m)
  },
  coconut_sugar: (k) => {
    const p = R5('#ffe8b8', '#f2c078', '#d9964a', '#b06a2c', '#7a441c')
    for (let i = 0; i < 3; i++) k.form(p, (m) => m.ell(8, 11 - i * 3, 5.4, 2, '#000'), 'ball', { spec: i === 2 })
  },

  // ---- skewers & grills ----
  moo_ping: (k) => {
    // หมูปิ้ง: three glazed grilled pork pieces with char marks + sticky rice.
    k.form(M.sticky, (m) => m.ell(4, 11.5, 3.2, 2.4, '#000'), 'ball')
    k.grains(1, 9, 7, 14, M.sticky, 4)
    skewer(k, M.grill, [[11, 4, 2.6, 2.2], [8.6, 6.6, 2.6, 2.2], [6.2, 9.2, 2.6, 2.2]], { char: '#4a2418', glaze: M.grill.hi, sep: true })
  },
  hub_lookchin_tod: (k) => {
    // ลูกชิ้นทอด: puffy fried balls with sweet chilli sauce.
    skewer(k, R5('#fff0d0', '#f2c890', '#d89a60', '#b0703e', '#7a4628'), [[11.4, 3.6, 2.2, 2.2], [9, 6, 2.2, 2.2], [6.6, 8.4, 2.2, 2.2], [4.2, 10.8, 2.2, 2.2]])
    for (const [x, y] of [[11, 3], [9, 5], [6, 8], [4, 10]] as [number, number][]) {
      k.on(x, y, M.chili.m)
      k.on(x + 1, y + 1, M.chili.s)
    }
  },
  lookchin: (k) => SNACK_ICON_ART.hub_lookchin_tod(k),
  sai_ua: (k) => {
    // ไส้อั่ว coil with herbs, and a pork crackling.
    const s = R5('#ffd8a0', '#e0985a', '#b86030', '#8a3e22', '#5a2418')
    k.form(s, (m) => {
      m.thick(3, 9, 8, 6, 1.8, '#000')
      m.thick(8, 6, 13, 8, 1.8, '#000')
      m.thick(13, 8, 10, 11, 1.8, '#000')
    }, 'ball', { cx: 8, cy: 8, rx: 6, ry: 4 })
    k.speckle(2, 4, 14, 12, M.basil.m, 4, 3)
    k.speckle(2, 4, 14, 12, M.chili.m, 2, 7)
    k.form(M.crispy, (m) => m.poly([[2, 12], [6, 11], [7, 14], [3, 14]], '#000'), 'bevel')
    k.px(4, 12, M.crispy.hi)
  },
  gai_yang: (k) => {
    // Grilled chicken in a bamboo clamp, with sticky-rice basket.
    k.line(3, 14, 13, 1, M.bamboo.m)
    k.line(5, 14, 14, 3, M.bamboo.s)
    const c = R5('#ffdca0', '#eaa860', '#c47a34', '#94522a', '#5e321c')
    k.form(c, (m) => m.ell(9, 7, 4.2, 3.6, '#000'), 'ball')
    k.line(7, 5, 10, 8, '#4a2418')
    k.line(9, 4, 12, 7, '#4a2418')
    k.form(M.wood, (m) => m.poly([[1, 10], [6, 10], [5.5, 14], [1.5, 14]], '#000'), 'cyl')
    k.px(3, 9, M.sticky.l)
  },
  hub_kai_tod_hatyai: (k) => {
    // Hat Yai fried chicken piled with crispy fried shallots.
    const c = R5('#ffe0a0', '#f2b050', '#d4842c', '#a45a22', '#6a3818')
    k.form(M.paper, (m) => m.poly([[1, 10], [15, 10], [13, 14], [3, 14]], '#000'), 'cyl')
    k.form(c, (m) => {
      m.ell(6, 7.5, 4, 3.2, '#000')
      m.thick(9, 8, 13, 5, 1.4, '#000')
    }, 'ball', { cx: 7, cy: 7, rx: 6, ry: 4 })
    k.speckle(3, 4, 13, 10, c.hi, 4, 5)
    k.speckle(3, 4, 13, 10, c.d, 4, 9)
    k.ball(13.5, 4.5, 1.3, 1.3, M.cream, { spec: false })
  },
  dried_squid: (k) => {
    // หมึกย่าง: a whole grilled squid on a stick – long glossy mantle with a
    // diamond fin on top, a fringe of curly tentacles below.
    const s = R5('#ffe8c8', '#f6c890', '#e09a5c', '#b8703c', '#804a26')
    k.form(s, (m) => {
      m.poly([[4.5, 10], [5.5, 4], [8, 1.5], [10.5, 4], [11.5, 10]], '#000')
      m.poly([[8, 0], [11, 2.6], [8, 4], [5, 2.6]], '#000')
    }, 'cyl')
    // Three curly tentacle strands (the gaps fill with outline ink).
    for (const [x, dir] of [[5.6, -1], [8, 0], [10.4, 1]] as [number, number][]) {
      k.px(x, 10, s.m)
      k.px(x + dir * 0.5, 11, s.l)
      k.px(x + dir, 12, s.m)
      k.px(x + dir * 1.5 + (dir === 0 ? 1 : 0), 13, s.s)
    }
    stick(k, 8, 15, 8, 11)
    for (const [x, y] of [[7, 4], [9, 6], [7, 7], [9, 8]] as [number, number][]) k.px(x, y, '#9a4a28')
    k.px(7, 3, s.hi)
  },
  fair_squid_grill: (k) => {
    SNACK_ICON_ART.dried_squid(k)
    k.px(8, 4, M.chili.m)
    k.px(10, 3, M.chili.s)
    k.px(9, 8, M.green.m)
  },
  fair_squid_pressed: (k) => {
    // Pressed squid sheet – flattened fan shape with a grid of roller marks.
    const s = R5('#fff4e0', '#f8dcb4', '#ecc08a', '#c8945c', '#946636')
    k.form(s, (m) => m.poly([[4, 13], [2, 5], [5, 2], [11, 2], [14, 5], [12, 13]], '#000'), 'bevel')
    for (let y = 4; y <= 12; y += 2) for (let x = 4 + (y % 4 ? 1 : 0); x <= 12; x += 2) k.on(x, y, s.s)
    k.px(6, 3, s.hi)
  },
  khanom_jak: (k) => {
    // Grilled nipa-leaf parcels bundled with a stick.
    const l = R5('#b8c088', '#8a8a54', '#66683a', '#4a4a28', '#30301c')
    for (let i = 0; i < 3; i++) k.form(l, (m) => m.thick(3 + i * 2, 13 - i, 12 + i, 3 - i, 0.9, '#000'), 'bevel')
    k.speckle(3, 2, 14, 13, '#3a2818', 5, 3)
    k.px(9, 8, '#e8a060')
  },

  // ---- rice, noodles & plates ----
  khao_soi: (k) => {
    noodleBowl(k, R5('#fff0b8', '#fbd070', '#f0a832', '#c47a24', '#8a5018'), M.noodle.m, [[6, 6, M.chicken.s], [9, 7, M.chili.m]])
    // Crispy noodle nest on top.
    k.form(M.crispy, (m) => m.ell(7, 5.6, 2.6, 1.4, '#000'), 'bevel')
    k.px(6, 5, M.crispy.hi)
  },
  yaowarat: (k) => noodleBowl(k, R5('#fffbe8', '#fbf0c8', '#f0dca0', '#ccb67a', '#9a8250'), M.yolk.m, [[5, 6, M.red.m], [6, 6, M.red.s], [11, 7, M.green.m], [8, 7, M.cream.l]]),
  mee_hoon: (k) => noodleBowl(k, M.orange, M.cream.l, [[5, 6, M.shrimp.l], [10, 7, M.shrimp.m], [7, 7, M.green.m]]),
  hub_boat_noodle: (k) => noodleBowl(k, M.sauce, M.noodle.l, [[5, 6, M.brown.l], [10, 7, '#8a3a2a'], [8, 6, M.green.l]]),
  hub_nam_ngiao: (k) => noodleBowl(k, M.tomato, M.cream.l, [[5, 6, M.tomato.l], [10, 7, '#6a2a2a'], [8, 6, M.green.m]]),
  tomyum: (k) => {
    // ต้มยำกุ้ง: fiery clear-red broth, shrimp, mushroom, lemongrass, chilli.
    brothBowl(k, M.tomyum, false)
    k.form(M.shrimp, (m) => {
      m.px(4, 6, '#000')
      m.px(5, 5, '#000')
      m.px(6, 5, '#000')
      m.px(7, 6, '#000')
    }, 'bevel')
    k.px(10, 6, '#f4ecdc')
    k.px(10, 7, '#c8b8a0')
    k.px(12, 7, M.leaf.m)
    k.px(8, 7, M.chili.m)
    k.px(9, 6, M.lime.l)
    k.steam(3, 3)
  },
  khaomangai: (k) => {
    // ข้าวมันไก่: yellow-tinted chicken-fat rice, sliced poached chicken with
    // golden skin, cucumber, and a cup of ginger-soy sauce.
    plate(k, 12)
    mound(k, 6.4, 9.6, 4.8, 2.8, R5('#ffffff', '#fff8dc', '#f8eab8', '#e0c890', '#b89a64'), 9)
    const skin = R5('#fff8d0', '#ffe590', '#f5c85c', '#d49c3c', '#9a6a28')
    const meat = R5('#ffffff', '#fffaf2', '#f8ecdc', '#e0c8b0', '#b09880')
    for (let i = 0; i < 3; i++) {
      const x = 4 + i * 2.6
      k.form(meat, (m) => m.poly([[x, 7.6], [x + 2.4, 6.8], [x + 2.4, 9], [x, 9.8]], '#000'), 'bevel', { sep: 'down' })
      k.line(x, 7, x + 2, 6.4, skin.m)
      k.px(Math.round(x), 7, skin.l)
    }
    k.px(3, 6, M.green.m)
    k.px(4, 6, M.green.l)
    cucumber(k, 11, 10)
    cucumber(k, 9, 11)
    k.form(M.plate, (m) => m.ell(12.8, 6.6, 2.2, 1.6, '#000'), 'bevel', { sep: 'down' })
    k.ell(12.8, 6.4, 1.4, 0.8, M.sauce.s)
    k.px(12, 6, M.chili.m)
    k.px(13, 6, '#f0c060')
  },
  som_tam: (k) => {
    // ส้มตำ: shredded papaya, tomato, long bean, chilli, peanuts – with a mortar.
    plate(k, 12)
    const p = R5('#f8ffe0', '#e0f4b0', '#bcdc84', '#8eb85e', '#608a3e')
    k.form(p, (m) => m.ell(7.6, 9, 5.2, 3, '#000'), 'ball')
    for (const [x, y] of [[4, 8], [6, 7], [8, 9], [10, 8], [5, 10], [9, 10]] as [number, number][]) k.line(x, y, x + 2, y - 1, p.l)
    k.px(6, 9, M.tomato.m)
    k.px(7, 9, M.tomato.l)
    k.px(10, 7, M.tomato.m)
    k.px(9, 7, M.chili.s)
    k.px(4, 9, M.green.s)
    k.px(11, 10, M.green.s)
    k.speckle(4, 7, 11, 10, '#e0b070', 3, 4)
    // Lime-green long bean crossing.
    k.line(1, 6, 5, 7, M.green.m)
  },
  pad_mee: (k) => {
    plate(k, 12)
    const n = R5('#ffe4cc', '#f4bc94', '#e09266', '#b86a44', '#80462c')
    k.form(n, (m) => m.ell(7.5, 9, 5.4, 3, '#000'), 'ball')
    for (let y = 7; y <= 10; y++) k.line(3, y, 12, y - 1 + (y % 2), y % 2 ? n.s : n.l)
    k.px(6, 7, M.green.m)
    k.px(9, 9, M.cream.l)
    k.px(10, 7, M.chili.m)
  },
  hokkien: (k) => {
    plate(k, 12)
    k.form(M.yolk, (m) => m.ell(7.5, 9, 5.4, 3, '#000'), 'ball')
    for (let y = 7; y <= 10; y++) k.line(3, y, 12, y + 1 - (y % 2), M.yolk.s)
    k.px(5, 7, M.shrimp.m)
    k.px(6, 7, M.shrimp.l)
    k.px(10, 8, M.green.m)
    k.px(9, 10, M.green.s)
    k.px(8, 7, M.red.m)
  },
  khao_yam: (k) => {
    // Southern rice salad: blue butterfly-pea rice ringed by herbs.
    plate(k, 12)
    mound(k, 8, 9, 3.4, 2.4, R5('#e4ecff', '#b8ccff', '#8ea8f0', '#6a80c8', '#48589a'), 3)
    for (const [x, y, c] of [[3, 9, M.green.m], [4, 11, M.orange.m], [12, 9, M.green.l], [12, 11, '#f0e0a0'], [5, 7, M.lime.m], [11, 7, M.chili.m], [8, 12, M.green.s]] as [number, number, string][]) k.px(x, y, c)
    k.px(3, 10, M.green.s)
    k.px(13, 10, M.orange.l)
  },
  hub_giant_paella: (k) => {
    // Giant pan of seafood fried rice.
    k.form(M.steel, (m) => m.ell(8, 10, 7, 3.8, '#000'), 'bevel')
    k.form(R5('#fff4c8', '#f8dc88', '#ecbc52', '#c48a34', '#8a5a22'), (m) => m.ell(8, 9.6, 5.8, 2.8, '#000'), 'ball')
    k.speckle(3, 7, 13, 12, M.shrimp.m, 3, 4)
    k.speckle(3, 7, 13, 12, M.green.m, 3, 8)
    k.px(6, 8, M.lime.m)
    k.px(10, 10, '#3a3040')
    k.line(14, 8, 15, 4, M.wood.s)
  },
  hub_pad_thai_boat: (k) => {
    // Pad thai wrapped in banana leaf.
    k.form(M.leaf, (m) => m.poly([[1, 9], [8, 6], [15, 9], [13, 14], [3, 14]], '#000'), 'bevel')
    k.form(R5('#ffe8c0', '#f7c486', '#e49a56', '#bb6e3a', '#844626'), (m) => m.ell(8, 8.5, 4.4, 2.2, '#000'), 'ball')
    k.px(6, 7, M.shrimp.m)
    k.px(7, 7, M.shrimp.l)
    k.px(10, 8, M.green.m)
    k.px(9, 9, M.cream.hi)
    lime(k, 11, 10)
  },
  hub_platu: (k) => {
    // Short mackerel in its little bamboo basket + chilli paste cup.
    k.form(M.wood, (m) => m.poly([[1, 9], [15, 9], [13, 14], [3, 14]], '#000'), 'cyl')
    for (let x = 3; x <= 12; x += 2) k.on(x, 12, M.wood.s)
    const f = M.fish
    k.form(f, (m) => m.poly([[2, 8], [5, 5.5], [10, 5.5], [12, 7], [14, 5], [14, 10], [12, 9], [9, 10], [4, 10]], '#000'), 'ball', { cx: 7, cy: 7.6, rx: 6, ry: 3 })
    k.hline(4, 10, 8, '#f2e0a0')
    k.px(4, 7, '#3a3040')
    // Head bent ("หน้างอ คอหัก").
    k.px(5, 6, f.s)
    k.px(6, 6, f.d)
  },
  hub_mataba: (k) => onPlate(k, () => {
    const r = R5('#fff4d0', '#f8d890', '#e8b456', '#c08432', '#8a5a22')
    k.form(r, (m) => m.rect(2, 6, 8, 5, '#000'), 'bevel')
    k.form(r, (m) => m.rect(6, 5, 7, 5, '#000'), 'bevel')
    k.px(7, 7, '#f2c060')
    k.px(10, 7, M.green.m)
    // Ajad cucumber relish.
    k.px(12, 10, M.cucumber.m)
    k.px(13, 10, M.red.m)
  }),
  hub_naem_nueang: (k) => onPlate(k, () => {
    // Rice-paper rolls with grilled pork and herbs.
    const w = R5('#ffffff', '#fbfbf2', '#eaf0dc', '#c8d6b8', '#94a88a')
    for (const [x, y] of [[2, 6], [4, 9]] as [number, number][]) {
      k.form(w, (m) => m.rect(x, y, 9, 3, '#000'), 'cyl')
      k.px(x + 8, y + 1, M.green.m)
      k.px(x + 7, y + 1, M.grill.m)
    }
    k.ball(13, 8.4, 1.6, 1.3, M.sauce, { spec: false })
  }),
  hub_moo_kata: (k) => {
    // หมูกระทะ: domed grill over a moat of broth, pork slices sizzling.
    k.form(M.steel, (m) => m.ell(8, 11, 7, 3, '#000'), 'bevel')
    k.ell(8, 10.6, 6, 2.2, M.tomyum.l)
    k.form(R5('#e4e4ec', '#a8a8b8', '#76768a', '#50505e', '#34343e'), (m) => m.ell(8, 8, 4.6, 3.6, '#000'), 'ball')
    for (const [x, y] of [[6, 6], [9, 7], [7, 9]] as [number, number][]) {
      k.px(x, y, M.porkRaw.m)
      k.px(x + 1, y, M.porkRaw.l)
    }
    k.px(3, 10, M.green.m)
    k.px(12, 11, M.cream.l)
    k.steam(4, 4)
  },
  fair_quail_egg: (k) => {
    // Quail eggs frying in a dimpled pan.
    k.form(R5('#e4e4ec', '#a8a8b8', '#76768a', '#50505e', '#34343e'), (m) => m.ell(8, 9.6, 7, 4, '#000'), 'bevel')
    for (const [x, y] of [[4.6, 8.4], [8, 7.4], [11.4, 8.4], [6.2, 11], [9.8, 11]] as [number, number][]) {
      k.form(M.eggW, (m) => m.ell(x, y, 1.8, 1.2, '#000'), 'bevel')
      k.px(Math.round(x), Math.round(y - 0.5), M.yolk.m)
    }
  },
  boiled_egg: (k) => {
    plate(k, 11.5)
    k.ball(5.4, 7.6, 3, 3.6, M.eggW)
    k.ball(10.8, 8.4, 3, 3, M.eggW)
    k.ball(10.8, 8.6, 1.8, 1.7, M.yolk, { spec: false })
  },
  hub_khao_jee: (k) => {
    // Lao-style baguette stuffed with pork roll and pickles.
    const b = R5('#ffe7b0', '#f6c270', '#dc9a4a', '#b0703a', '#7a4628')
    k.form(b, (m) => m.thick(2.5, 11, 13.5, 5, 2.2, '#000'), 'ball', { cx: 8, cy: 8, rx: 6, ry: 3 })
    for (const [x, y] of [[5, 9], [8, 7.6], [11, 6]] as [number, number][]) k.line(x - 1, y + 1, x + 1, y - 1, b.s)
    k.line(4, 12, 13, 7, M.porkRaw.l)
    k.px(7, 11, M.green.m)
    k.px(10, 9, M.orange.m)
  },

  // ---- fruit, nuts & produce ----
  kluay_tak: (k) => {
    // Sun-dried bananas: flattened sticky-brown fingers in a tray.
    k.form(M.paper, (m) => m.poly([[1, 10], [15, 10], [13, 14], [3, 14]], '#000'), 'cyl')
    const d = R5('#f8c890', '#d88a4a', '#a8582c', '#7a3a20', '#4a2216')
    for (const y of [5, 7.5, 10]) k.form(d, (m) => m.thick(3, y + 1, 12, y - 1, 1.2, '#000'), 'ball', { cx: 7.5, cy: y, rx: 5, ry: 2 })
  },
  kluaytod: (k) => {
    // กล้วยทอด: crunchy battered banana slices on paper.
    k.form(M.paper, (m) => m.poly([[1, 10], [15, 10], [13, 14.5], [3, 14.5]], '#000'), 'cyl')
    for (const [x, y] of [[4.5, 9], [11, 9], [7.8, 6.6], [7.6, 11]] as [number, number][]) {
      k.ball(x, y, 3.2, 2.2, M.crispy, { sep: 'down' })
      k.on(x - 1, y, M.crispy.d)
      k.on(x + 1, y + 1, M.crispy.hi)
    }
    k.ell(7.8, 6.3, 1.6, 0.8, M.banana.l)
  },
  pomelo: (k) => {
    k.ball(7.5, 8.6, 6, 5.2, R5('#f4ffd0', '#c8ec86', '#9ccc5a', '#6c9e40', '#46702e'))
    k.speckle(3, 5, 12, 12, '#8ab850', 5, 3)
    // A peeled segment showing pink flesh.
    k.form(M.pink, (m) => m.poly([[10, 13], [14, 9], [15, 13]], '#000'), 'bevel')
    k.px(7, 2, M.leaf.s)
    k.px(8, 3, M.leaf.m)
  },
  sugarcane: (k) => {
    // Bag of cut sugarcane chunks (อ้อยควั่น).
    k.form(M.glass, (m) => m.poly([[3, 4], [13, 4], [14, 14], [2, 14]], '#000'), 'cyl')
    for (const [x, y] of [[5, 7], [9, 6], [7, 10], [11, 10], [4, 11]] as [number, number][])
      k.form(R5('#fffcd8', '#f4eca0', '#e2d470', '#bca84c', '#8a7830'), (m) => m.rect(x, y, 3, 3, '#000'), 'bevel')
    k.hline(3, 12, 4, '#e8514a')
  },
  chestnut: (k) => paperBag(k, R5('#ffffff', '#fff4dc', '#f0dcb4', '#d0b488', '#a08458'), M.choc),
  hub_cashew: (k) => {
    paperBag(k, M.red, R5('#fff8e0', '#f8e0a8', '#ecc47c', '#c89a56', '#946c38'))
  },
  hub_dates: (k) => {
    // Plump dates on a plate.
    plate(k, 12)
    const d = R5('#e8a878', '#b0643a', '#7e3a22', '#5a2418', '#381410')
    for (const [x, y] of [[4.8, 9], [8, 7.6], [11.2, 9], [8, 10.4]] as [number, number][]) k.ball(x, y, 2.4, 1.7, d)
  },
  hub_lychee: (k) => {
    // Bunch of lychee, one peeled.
    const l = R5('#ffd0c0', '#f47a6a', '#d84a4a', '#a02e3a', '#681c2a')
    for (const [x, y] of [[5, 7], [10, 6.4], [7.6, 10.4]] as [number, number][]) {
      k.ball(x, y, 3, 2.8, l)
      k.speckle(Math.floor(x - 2), Math.floor(y - 2), Math.ceil(x + 2), Math.ceil(y + 2), l.s, 3, x * 3)
    }
    k.ball(12, 11, 2, 1.8, R5('#ffffff', '#fbfaf2', '#ecead8', '#cfcdb4', '#a8a68c'))
    k.line(7, 3, 9, 1, M.leaf.s)
    k.px(9, 3, M.leaf.m)
  },
  khao_lam: (k) => {
    // ข้าวหลาม: roasted bamboo tube, peeled open to sticky rice with black beans.
    k.form(M.bamboo, (m) => m.thick(4, 13, 11, 3, 2.4, '#000'), 'cyl')
    k.px(6, 10, M.bamboo.d)
    k.px(7, 9, M.bamboo.d)
    k.form(M.sticky, (m) => m.ell(11.6, 3, 2.6, 2, '#000'), 'ball')
    k.px(11, 2, '#3a3040')
    k.px(13, 3, '#6a3a5a')
    k.px(10, 3, M.husk.d)
  },

  // ---- non-food stall goods sold as "snacks" ----
  thai_massage: (k) => {
    // Rolled herbal compress & a folded towel.
    k.form(M.cream, (m) => m.rect(2, 8, 12, 5, '#000'), 'bevel')
    k.hline(3, 12, 10, M.pink.m)
    const h = R5('#f4ecc8', '#d8cc90', '#b8a864', '#8a7c44', '#5c5230')
    k.ball(9, 5, 3.4, 3, h)
    k.px(9, 1, '#c0392b')
    k.px(8, 2, h.d)
    k.px(10, 2, h.d)
    k.speckle(6, 3, 12, 7, M.green.s, 3, 4)
  },
  herbal_balm: (k) => {
    // Tiny green balm jar with a gold lid.
    k.form(M.green, (m) => m.rect(3, 7, 10, 6, '#000'), 'cyl')
    k.form(M.gold, (m) => m.rect(3, 4, 10, 3, '#000'), 'cyl')
    k.form(M.paper, (m) => m.rect(5, 8, 6, 3, '#000'), 'bevel')
    k.px(7, 9, M.red.m)
    k.px(8, 9, M.red.m)
  },
}

// Young coconut (มะพร้าวน้ำหอม), top trimmed, with a straw.
SNACK_ICON_ART.coconut = (k) => {
  const g = R5('#f0ffd0', '#c8e890', '#98c860', '#6a9a44', '#436a2e')
  k.form(g, (m) => m.poly([[2, 8], [5, 4], [11, 4], [14, 8], [13, 12], [9, 14], [7, 14], [3, 12]], '#000'), 'ball', { cy: 8 })
  k.form(M.coconutMeat, (m) => m.poly([[5, 4], [8, 1.5], [11, 4]], '#000'), 'bevel')
  k.hline(6, 10, 4, M.coconutMeat.s)
  k.thick(10, 0.5, 8.5, 3, 0.6, '#ff6f91')
}
