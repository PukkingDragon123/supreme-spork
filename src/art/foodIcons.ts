// Polished 16×16 food icons drawn with the food kit (src/art/foodKit.ts):
// alms food, offerings that are food, cooking ingredients, home-cooked
// dishes (and their gold "ฝีมือเชฟ" variants), every stall snack, fruits,
// drinks and the 7-บุญ packaged goods. `foodKitSprite(name)` returns the
// finished sprite; `hasFoodKitIcon(name)` says whether a name is drawn here.
// Lighting is always top-left, outlines are the kit's tinted warm ink.

import { cached, type Sprite } from '../engine/sprite'
import { M, Pix, R5, foodSprite, ramp } from './foodKit'
import { DISHES_ART, SNACK_ICON_ART } from './foodDishes'
import { bowl, cup, plate } from './foodVessels'

export type FoodDraw = (k: Pix) => void

// ---------------------------------------------------------------------------
// Fruits, vegetables, eggs, rice and pantry

const ICON: Record<string, FoodDraw> = {
  // ---- alms food ----
  rice: (k) => {
    bowl(k, 8)
    k.form(M.rice, (m) => {
      m.ell(8, 7.5, 5.5, 3.2, '#000')
    }, 'ball', { lightAt: 0.55 })
    k.grains(3, 4, 12, 9, M.rice, 5)
    // Steam.
    k.steam(6, 2)
  },
  sticky: (k) => {
    // Bamboo กระติ๊บ basket with a lid, weave pattern and a string.
    const w = M.wood
    k.form(w, (m) => m.poly([[3, 5], [13, 5], [12, 14], [4, 14]], '#000'), 'cyl')
    for (let y = 7; y <= 13; y += 2) for (let x = 4 + ((y >> 1) & 1); x <= 12; x += 2) k.on(x, y, w.s)
    k.hline(4, 12, 9, w.d)
    k.form(w, (m) => m.poly([[2.5, 3], [13.5, 3], [13, 6], [3, 6]], '#000'), 'cyl')
    k.hline(3, 13, 6, w.d)
    // Sticky rice peeking out and the string loop.
    k.px(6, 2, M.sticky.l)
    k.px(7, 2, M.sticky.m)
    k.px(8, 2, M.sticky.l)
    k.line(3, 7, 1, 11, '#c0392b')
    k.px(1, 12, '#e8514a')
  },
  curry: (k) => {
    // ถุงแกง: green curry in a knotted plastic bag with a rubber band.
    k.form(M.glass, (m) => m.poly([[6, 1], [10, 1], [9, 4], [7, 4]], '#000'), 'bevel')
    k.px(6, 0, M.glass.l)
    k.px(10, 0, M.glass.l)
    k.hline(6, 10, 4, '#e8514a')
    k.hline(7, 9, 5, '#b8343f')
    k.form(M.glass, (m) => m.ell(8, 10, 6, 4.4, '#000'), 'ball')
    k.form(ramp('#8fc75a'), (m) => m.ell(8, 11, 5.2, 3.2, '#000'), 'ball', { spec: false })
    k.hline(4, 12, 8, '#b6e080')
    k.px(6, 11, M.chicken.l)
    k.px(9, 10, M.chicken.m)
    k.px(10, 12, M.chili.m)
    k.px(5, 12, '#3f7a2f')
    k.px(8, 13, M.eggW.l)
    k.px(4, 7, '#ffffff')
    k.px(4, 8, '#ffffff')
  },
  egg: (k) => {
    // ไข่พะโล้: two glossy braised eggs in dark five-spice broth.
    bowl(k, 8, false, M.sauce)
    k.ball(6, 6.6, 2.8, 3, M.sauce)
    k.ball(10.2, 7, 2.6, 2.8, R5('#fff4d8', '#f2c078', '#c47a3a', '#96522a', '#6a3620'))
    k.px(11, 8, M.yolk.m)
    k.px(10, 8, M.yolk.s)
  },
  dessert: (k) => {
    // ทองหยอด drops and a ทองหยิบ flower on a plate – golden egg-yolk sweets.
    plate(k, 12)
    const g = M.gold
    for (const [x, y] of [[4.4, 9.6], [8, 10.2], [11.6, 9.6]] as [number, number][]) k.ball(x, y, 2.3, 2, g, { sep: 'down' })
    // ทองหยิบ: a five-petal pinched flower with a darker heart.
    k.form(g, (m) => {
      m.ell(8, 5.6, 4, 3.2, '#000')
      m.px(8, 1.8, '#000')
    }, 'ball', { sep: 'down' })
    for (const [x, y] of [[8, 3], [5, 5], [11, 5], [6, 8], [10, 8]] as [number, number][]) k.on(x, y, g.s)
    k.px(8, 5, g.d)
    k.px(8, 6, g.s)
    k.px(7, 4, g.hi)
  },
  friedegg: (k) => {
    // ไข่ดาว on a plate: crispy lacy edge, runny yolk.
    plate(k, 12)
    k.form(M.crispy, (m) => {
      m.ell(8, 9, 6, 3.4, '#000')
      m.px(2, 9, '#000')
      m.px(13, 8, '#000')
    }, 'bevel', { sep: 'down' })
    k.form(M.eggW, (m) => m.ell(7.6, 8.6, 4.8, 2.6, '#000'), 'ball', { rim: false })
    k.ball(8.4, 8.2, 2.2, 1.8, M.yolk)
    k.on(3, 10, M.crispy.hi)
    k.on(12, 10, M.crispy.l)
  },
  banana: (k) => {
    // Bunch of กล้วยน้ำว้า: three curved fingers from one green crown.
    const b = M.banana
    const finger = (x1: number, y1: number, sep: boolean) =>
      k.form(b, (m) => {
        for (let i = 0; i <= 6; i++) {
          const t = i / 6
          const x = 4 + (x1 - 4) * t
          const y = 3 + (y1 - 3) * t + Math.sin(t * Math.PI) * 2.4
          m.ell(x, y, 1.9 - t * 0.5, 1.9 - t * 0.5, '#000')
        }
      }, 'ball', { cx: (4 + x1) / 2 - 1, cy: (3 + y1) / 2, rx: 5, ry: 4, sep })
    finger(13, 4, false)
    finger(13, 9, true)
    finger(10, 13, true)
    k.form(ramp('#8fbf4a'), (m) => m.rect(2, 1, 4, 3, '#000'), 'bevel')
    k.px(13, 3, b.d)
    k.px(13, 8, b.d)
    k.px(10, 13, b.d)
  },
  water: (k) => {
    // น้ำดื่ม "บุญใส" bottle: clear PET with a blue cap and label, drops.
    k.form(M.glass, (m) => {
      m.rect(5, 5, 6, 9, '#000')
      m.poly([[6, 3], [10, 3], [11, 5], [5, 5]], '#000')
    }, 'cyl')
    k.form(M.blue, (m) => m.rect(6, 1, 4, 2, '#000'), 'bevel')
    k.form(M.blue, (m) => m.rect(5, 7, 6, 3, '#000'), 'cyl')
    k.px(7, 8, '#ffffff')
    k.px(8, 8, '#ffffff')
    k.hline(5, 10, 12, M.glass.s)
    k.drop(9, 11, '#ffffff')
    k.drop(6, 12, '#ffffff')
  },
  fruit: (k) => {
    // Offering tray (พาน) of fruit: orange, apple-red rambutan, grapes.
    k.form(M.gold, (m) => {
      m.ell(8, 11.5, 6.5, 2, '#000')
      m.rect(6, 12, 4, 2, '#000')
      m.rect(4, 13, 8, 1, '#000')
    }, 'bevel')
    k.ball(5, 9, 2.6, 2.4, M.orange)
    k.ball(11, 9, 2.6, 2.4, M.red)
    for (const [x, y] of [[8, 5], [7, 7], [9, 7], [8, 9]] as [number, number][]) k.ball(x, y, 1.4, 1.4, M.purple, { spec: false })
    k.px(7, 4, M.purple.hi)
    k.px(8, 2, '#5ea653')
    k.px(8, 3, '#3f8543')
  },
  laddu: (k) => {
    plate(k, 11.5)
    const o = R5('#ffe8b0', '#ffc05a', '#f89a2e', '#cf6a20', '#8f4016')
    for (const [x, y] of [[5, 8.6], [11, 8.6], [8, 5]] as [number, number][]) {
      k.ball(x, y, 2.9, 2.8, o)
      k.speckle(x - 2, y - 2, x + 2, y + 2, o.d, 2, x * 7 + y)
    }
  },
  milk: (k) => {
    // Milk carton (นม "บุญเย็น") with a cow patch and a blue gable.
    k.form(M.paper, (m) => m.rect(4, 5, 8, 9, '#000'), 'cyl')
    k.form(M.blue, (m) => m.poly([[4, 5], [8, 1.5], [12, 5]], '#000'), 'bevel')
    k.rect(7, 1, 2, 1, M.blue.s)
    k.form(M.blue, (m) => m.rect(4, 8, 8, 3, '#000'), 'cyl')
    k.px(6, 9, '#ffffff')
    k.px(7, 9, '#ffffff')
    k.px(9, 9, '#ffffff')
    k.px(5, 12, '#3a3040')
    k.px(10, 6, '#3a3040')
  },
  redsoda: (k) => {
    // น้ำแดง: a glass of strawberry-red soda with ice, a straw and fizz.
    cup(k, M.soda, { ice: true, straw: '#86c95f' })
    k.px(6, 7, M.soda.hi)
    k.px(9, 9, M.soda.hi)
  },
  boiledegg: (k) => {
    plate(k, 11.5)
    k.ball(5.4, 7.6, 3, 3.6, M.eggW)
    k.ball(10.8, 8.4, 3, 3, M.eggW)
    k.ball(10.8, 8.6, 1.8, 1.7, M.yolk, { spec: false })
    k.px(10, 8, M.yolk.l)
  },
  tea: (k) => {
    // Chinese teapot and a tiny cup, steam curling up.
    const t = R5('#ffffff', '#fff9ee', '#f1e8d8', '#d6c3a6', '#a8906e')
    k.form(t, (m) => m.ell(7, 9.5, 5, 4, '#000'), 'ball')
    k.form(t, (m) => m.poly([[11, 9], [14, 6], [14, 7], [12, 11]], '#000'), 'bevel')
    k.form(t, (m) => m.rect(5, 4, 4, 2, '#000'), 'bevel')
    k.px(6, 3, t.s)
    k.px(7, 3, t.s)
    k.hline(3, 11, 9, '#5a8de0')
    k.px(5, 11, '#5a8de0')
    k.px(9, 11, '#5a8de0')
    k.px(2, 8, t.m)
    k.px(1, 9, t.m)
    k.px(1, 10, t.s)
    k.steam(12, 3)
  },
  fishfood: (k) => {
    // Bag of fish pellets with a koi on the label.
    k.form(M.blue, (m) => m.poly([[3, 3], [13, 3], [13.5, 14], [2.5, 14]], '#000'), 'cyl')
    k.form(M.blue, (m) => m.rect(3, 2, 10, 2, '#000'), 'bevel')
    for (let x = 3; x <= 12; x += 2) k.px(x, 2, M.blue.d)
    k.form(M.paper, (m) => m.ell(8, 9, 4, 3, '#000'), 'ball', { spec: false })
    k.ball(7, 9, 2.2, 1.5, M.orange, { spec: false })
    k.px(10, 8, M.orange.m)
    k.px(10, 10, M.orange.m)
    k.px(6, 9, '#3a3040')
    for (const [x, y] of [[5, 12], [9, 12], [11, 13]] as [number, number][]) k.px(x, y, M.brown.m)
  },
  dogfood: (k) => {
    // Red pet bowl heaped with kibble.
    k.form(M.red, (m) => m.poly([[1.5, 9], [14.5, 9], [13, 13.5], [3, 13.5]], '#000'), 'cyl')
    k.form(M.brown, (m) => m.ell(8, 8.5, 6, 3, '#000'), 'ball', { spec: false })
    for (const [x, y] of [[4, 8], [6, 7], [8, 6], [10, 7], [12, 8], [7, 9], [9, 9], [5, 9], [11, 9]] as [number, number][]) {
      k.px(x, y, M.brown.l)
      k.px(x + 1, y + 1, M.brown.d)
    }
    k.hline(3, 12, 10, M.red.l)
    k.px(6, 12, '#fffaf0')
    k.px(9, 12, '#fffaf0')
  },
  chicken: (k) => {
    // Boiled chicken drumstick on a plate.
    plate(k, 12)
    k.form(M.chicken, (m) => m.ell(6.5, 7.5, 4.5, 3.8, '#000'), 'ball')
    k.form(M.cream, (m) => m.thick(9.5, 9, 12.5, 11, 0.7, '#000'), 'bevel')
    k.ball(13, 11, 1.3, 1.3, M.cream, { spec: false })
    k.ball(12, 12, 1.2, 1, M.cream, { spec: false })
    k.px(5, 9, M.chicken.s)
    k.px(7, 10, M.chicken.s)
  },
  bread: (k) => {
    // Loaf of bread with a split top and crumbs.
    const c = R5('#ffe7b0', '#f6c270', '#dc9a4a', '#b0703a', '#7a4628')
    k.form(c, (m) => {
      m.ell(8, 8, 6.5, 4.5, '#000')
      m.rect(1.5, 8, 13, 5, '#000')
    }, 'ball', { cy: 8, ry: 5.5 })
    k.line(4, 6, 6, 8, c.s)
    k.line(7, 5, 9, 7, c.s)
    k.line(10, 5, 12, 7, c.s)
    k.px(5, 6, c.hi)
    k.px(8, 5, c.hi)
    k.hline(2, 13, 12, c.d)
    k.px(2, 14, c.m)
    k.px(13, 14, c.s)
  },
  sangkhathan: (k) => {
    // Yellow สังฆทาน bucket wrapped in cellophane with a red bow.
    const y = R5('#fff8c8', '#ffe474', '#f8c83a', '#d4962a', '#8c5a18')
    k.form(y, (m) => m.poly([[2.5, 6], [13.5, 6], [12.5, 14], [3.5, 14]], '#000'), 'cyl')
    k.form(M.glass, (m) => m.poly([[3, 6], [6, 1], [10, 1], [13, 6]], '#000'), 'bevel')
    k.px(5, 4, M.orange.m)
    k.px(6, 4, M.orange.m)
    k.px(9, 3, M.blue.m)
    k.px(10, 4, M.blue.l)
    k.px(8, 5, '#ffffff')
    k.rect(7, 6, 2, 8, M.red.m)
    k.hline(3, 12, 9, M.red.m)
    k.px(6, 5, M.red.l)
    k.px(9, 5, M.red.l)
    k.px(7, 5, M.red.d)
    k.px(8, 5, M.red.d)
  },

  // ---- fruit & produce (not all are items yet; free for other systems) ----
  mango: (k) => {
    k.form(M.mango, (m) => m.poly([[3, 6], [6, 3], [11, 3], [14, 7], [13, 12], [9, 14], [4, 13], [2, 10]], '#000'), 'ball', { cx: 7.5, cy: 7.5 })
    k.px(11, 2, M.leaf.d)
    k.form(M.leaf, (m) => m.poly([[11, 2], [14, 0.5], [14, 2.5]], '#000'), 'bevel')
    k.px(12, 11, M.mango.s)
  },
  durian: (k) => {
    const d = M.durian
    k.ball(8, 8.5, 6, 5.4, d)
    for (let y = 4; y <= 13; y += 2) for (let x = 3 + ((y >> 1) & 1); x <= 13; x += 2) k.on(x, y, d.d)
    for (const [x, y] of [[2, 8], [14, 8], [5, 3], [11, 3], [8, 2], [4, 13], [12, 13]] as [number, number][]) k.px(x, y, d.s)
    k.px(6, 5, d.hi)
    k.rect(7, 0, 2, 2, M.brown.m)
    k.px(7, 0, M.brown.l)
  },
  rambutan: (k) => {
    const r = M.rambutan
    for (const [cx, cy] of [[5.5, 9], [10.5, 8]] as [number, number][]) {
      k.ball(cx, cy, 3.6, 3.6, r)
      // Soft spiky hair, green tipped.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        k.px(cx + Math.cos(a) * 4.4, cy + Math.sin(a) * 4.4, i % 3 ? r.m : '#86c95f')
      }
    }
    // A peeled one showing the translucent flesh.
    k.ball(8, 12, 2, 1.6, R5('#ffffff', '#fbfaf2', '#ecead8', '#cfcdb4', '#a8a68c'), { rim: false })
  },
  mangosteen: (k) => {
    const p = M.mangosteen
    k.ball(8, 9, 6, 5, p)
    // Calyx.
    k.form(M.leaf, (m) => {
      m.ell(8, 4.5, 3.6, 1.4, '#000')
    }, 'bevel')
    k.rect(7, 1, 2, 3, M.leaf.s)
    // Split to show white segments.
    k.form(M.coconutMeat, (m) => m.ell(9.5, 9.5, 2.6, 2.2, '#000'), 'ball', { rim: false })
    k.vline(9, 8, 11, M.coconutMeat.s)
    k.px(5, 7, p.hi)
  },
  fish: (k) => {
    // ปลาทู (short mackerel), the Mae Klong classic.
    const f = M.fish
    k.form(f, (m) => m.poly([[1.5, 9], [5, 5.5], [10, 5], [12, 7], [15, 5], [15, 12], [12, 10], [9, 12.5], [4, 12]], '#000'), 'ball', { cx: 7, cy: 8.5, rx: 6, ry: 3.5 })
    for (let x = 5; x <= 10; x += 2) k.on(x, 7, f.d)
    k.hline(3, 11, 9, '#f2e0a0')
    k.px(3, 8, '#3a3040')
    k.px(3, 7, '#ffffff')
    k.line(5, 6, 5, 11, f.s)
  },
  shrimp: (k) => {
    // Curled prawn: segmented arc, fan tail, long feelers.
    const s = M.shrimp
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (-0.95 + i * 0.19)
      pts.push([8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 2.3 - i * 0.16])
    }
    k.form(s, (m) => {
      for (let i = 0; i < pts.length - 1; i++) m.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i][2], '#000')
    }, 'ball', { cx: 7, cy: 7, rx: 6, ry: 6 })
    // Segment lines.
    for (const i of [2, 3, 4, 5, 6]) {
      const [x, y] = pts[i]
      k.on(x + (8 - x) * 0.35, y + (8 - y) * 0.35, s.s)
    }
    // Tail fan.
    k.form(s, (m) => m.poly([[5, 11], [3, 14], [7, 14.5]], '#000'), 'bevel')
    // Head, eye and feelers.
    k.px(4, 7, '#3a3040')
    k.line(3, 7, 1, 2, s.d)
    k.line(4, 6, 5, 1, s.d)
    k.px(9, 5, s.hi)
  },
}

// ---------------------------------------------------------------------------
// Cooking ingredients (ids from game/data/items.ts INGREDIENTS)

Object.assign(ICON, {
  ing_egg: (k: Pix) => {
    // Three farm eggs (two brown, one white) in a pulp tray.
    const white = R5('#ffffff', '#fffaf2', '#f4ece0', '#dccdb8', '#b8a48c')
    k.ball(4.4, 6.6, 2.8, 3.4, M.egg)
    k.ball(11.6, 6.6, 2.8, 3.4, M.egg)
    k.ball(8, 5.6, 2.8, 3.4, white, { sep: true })
    const t = R5('#f4f0ea', '#dcd6ce', '#c4bcb2', '#a0978c', '#766e66')
    k.form(t, (m) => m.poly([[1, 9], [15, 9], [14, 13.6], [2, 13.6]], '#000'), 'bevel', { sep: true })
    for (const x of [5, 8, 11]) k.vline(x, 10, 12, t.s)
    k.hline(2, 13, 10, t.l)
  },
  ing_rice: (k: Pix) => {
    // Sack of jasmine rice (ตรา "หอมบุญ") with grains spilling out.
    k.form(M.paper, (m) => m.poly([[3, 4], [13, 4], [13.5, 13], [2.5, 13]], '#000'), 'cyl')
    k.form(M.paper, (m) => m.poly([[4, 1.5], [12, 1.5], [13, 4], [3, 4]], '#000'), 'bevel')
    k.hline(5, 11, 2, M.paper.s)
    k.px(8, 1, '#c0392b')
    k.form(M.green, (m) => m.rect(4, 6, 8, 5, '#000'), 'bevel')
    k.ball(8, 8.5, 1.8, 1.6, M.rice, { spec: false })
    k.px(6, 7, '#ffd54f')
    k.px(10, 10, '#e8514a')
    for (const [x, y] of [[1, 13], [14, 12], [14, 13]] as [number, number][]) k.px(x, y, M.rice.l)
  },
  ing_sticky: (k: Pix) => {
    // Bowl of soaked sticky rice.
    bowl(k, 8)
    k.form(M.sticky, (m) => m.ell(8, 7.5, 5.5, 3, '#000'), 'ball', { lightAt: 0.5 })
    k.grains(3, 5, 12, 9, M.sticky, 11)
    k.px(4, 4, '#b3e4f4')
    k.px(11, 5, '#b3e4f4')
  },
  ing_pork: (k: Pix) => {
    // Tray of minced pork under cling film.
    const t = R5('#ffffff', '#f4f2ee', '#e2ded6', '#bfb8ac', '#8e867a')
    k.form(t, (m) => m.poly([[1, 8], [15, 8], [14, 13.5], [2, 13.5]], '#000'), 'bevel')
    k.form(M.porkRaw, (m) => m.ell(8, 8, 6, 3.5, '#000'), 'ball')
    k.speckle(3, 5, 13, 10, M.porkRaw.s, 10, 4)
    k.speckle(3, 5, 13, 10, '#ffe8ea', 6, 9)
    k.px(4, 5, '#ffffff')
    k.px(5, 5, '#ffffff')
    k.px(11, 10, '#ffffff')
  },
  ing_chicken: (k: Pix) => {
    const t = R5('#dff0ff', '#b8dcf6', '#8fc4ec', '#6aa0d0', '#48729e')
    k.form(t, (m) => m.poly([[1, 9], [15, 9], [14, 13.5], [2, 13.5]], '#000'), 'bevel')
    const raw = R5('#fff4ee', '#ffdcd2', '#f6bfb2', '#d89488', '#a66a64')
    k.ball(5.5, 8, 3.6, 2.6, raw)
    k.ball(10.5, 8.5, 3.6, 2.4, raw)
    k.line(4, 8, 6, 7, raw.s)
    k.line(9, 9, 11, 8, raw.s)
  },
  ing_tofu: (k: Pix) => {
    // Tube of egg tofu with a red label, and two slices.
    k.form(M.tofu, (m) => m.rect(1, 3, 14, 5, '#000'), 'cyl')
    k.form(M.red, (m) => m.rect(6, 3, 4, 5, '#000'), 'cyl')
    k.px(7, 5, '#ffffff')
    k.px(8, 5, '#ffffff')
    k.vline(1, 3, 7, M.glass.l)
    k.vline(14, 3, 7, M.glass.m)
    k.ball(4.5, 11, 3, 2.4, M.tofu)
    k.ball(11, 11, 3, 2.4, M.tofu)
    k.ell(4.5, 11, 1.4, 0.8, M.tofu.l)
    k.ell(11, 11, 1.4, 0.8, M.tofu.l)
  },
  ing_noodle: (k: Pix) => {
    // Bundle of เส้นจันท์ rice sticks tied with a red band.
    const n = M.noodle
    k.form(n, (m) => m.poly([[3, 1.5], [12, 1.5], [11, 7], [13, 13.5], [2, 13.5], [4, 7]], '#000'), 'cyl')
    for (let x = 4; x <= 11; x += 2) {
      k.line(x, 2, x, 6, n.s)
      k.line(x, 9, x - 1 + ((x >> 1) & 1), 13, n.s)
    }
    k.form(M.red, (m) => m.rect(3, 6, 10, 3, '#000'), 'cyl')
    k.px(7, 7, M.gold.l)
    k.px(8, 7, M.gold.l)
  },
  ing_basil: (k: Pix) => {
    // Sprig of holy basil with purple stems.
    k.line(8, 14, 8, 6, '#8a4a6a')
    k.line(8, 11, 5, 8, '#8a4a6a')
    k.line(8, 10, 11, 7, '#8a4a6a')
    const b = M.basil
    for (const [x, y, rx, ry] of [
      [8, 3.4, 2.4, 2.4],
      [4.4, 6.6, 2.6, 2],
      [11.6, 6, 2.6, 2],
      [4.6, 10.6, 2.4, 1.8],
      [11.4, 10.2, 2.4, 1.8],
      [8, 7.6, 1.8, 1.6],
    ] as [number, number, number, number][])
      k.ball(x, y, rx, ry, b)
    k.px(8, 2, b.hi)
    for (const [x, y] of [[4, 6], [11, 6], [8, 4]] as [number, number][]) k.on(x + 1, y + 1, b.s)
  },
  ing_chili: (k: Pix) => {
    // Three bird's-eye chillies, glossy.
    const c = M.chili
    const pod = (x0: number, y0: number, x1: number, y1: number, r: typeof c) => {
      k.form(r, (m) => m.thick(x0, y0, x1, y1, 1.3, '#000'), 'ball', { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: 3, ry: 4 })
      k.px(x0, y0 - 1, M.leaf.m)
      k.px(x0, y0 - 2, M.leaf.s)
    }
    pod(4, 4, 2.5, 12, c)
    pod(12, 4, 13.5, 12, R5('#e0ffb0', '#98dc5c', '#56b03c', '#3a8434', '#255a2c'))
    pod(8, 3, 8, 13, c)
  },
  ing_garlic: (k: Pix) => {
    const g = R5('#ffffff', '#fffaf2', '#f4eadb', '#dcc6b6', '#b79c8c')
    k.ball(8, 9, 5.6, 4.6, g)
    k.line(5, 6, 4, 12, g.s)
    k.line(8, 5, 8, 13, g.s)
    k.line(11, 6, 12, 12, g.s)
    k.px(6, 12, '#e8b8d0')
    k.px(10, 12, '#e8b8d0')
    k.form(g, (m) => m.poly([[7, 1.5], [9, 1.5], [9.5, 5], [6.5, 5]], '#000'), 'bevel')
    k.hline(6, 10, 14, '#c9b8a0')
  },
  ing_veg: (k: Pix) => {
    // Cabbage, a spring onion and a bean-sprout pinch.
    const c = R5('#f4ffe0', '#d8f5b0', '#aee082', '#7cb85c', '#4f8a44')
    k.ball(6.5, 8.5, 5.4, 5, c)
    k.line(6, 12, 4, 6, c.s)
    k.line(6, 12, 8, 6, c.s)
    k.line(6, 12, 6, 5, c.l)
    k.form(M.green, (m) => m.rect(12, 1, 2, 10, '#000'), 'cyl')
    k.form(M.cream, (m) => m.rect(12, 11, 2, 3, '#000'), 'cyl')
    k.px(11, 12, M.cream.m)
  },
  ing_coconut: (k: Pix) => {
    // Half a coconut with white flesh, plus a splash of cream.
    k.form(M.husk, (m) => {
      m.ell(8, 9, 6.5, 4.6, '#000')
    }, 'ball')
    k.speckle(2, 9, 14, 13, M.husk.d, 6, 3)
    k.form(M.coconutMeat, (m) => m.ell(8, 7.4, 5.8, 2.4, '#000'), 'ball', { rim: false })
    k.ell(8, 7.6, 4.2, 1.4, R5('#fff', '#fff', '#fffef9', '#f0e8d8', '#ddd').s)
    k.px(4, 6, '#ffffff')
  },
  ing_paste: (k: Pix) => {
    // Granite mortar (ครก) with green curry paste and a pestle.
    const s = R5('#e8e4ea', '#c4bcc4', '#9a929c', '#766e78', '#524a56')
    k.form(s, (m) => m.poly([[1.5, 7], [14.5, 7], [12.5, 13.5], [3.5, 13.5]], '#000'), 'cyl')
    k.speckle(2, 8, 13, 13, s.d, 7, 5)
    k.speckle(2, 8, 13, 13, s.l, 4, 9)
    k.ell(8, 7, 6, 1.8, s.d)
    k.ell(8, 7.2, 5, 1.3, M.pandan.s)
    k.px(5, 7, M.pandan.l)
    k.px(9, 7, M.chili.m)
    k.form(M.wood, (m) => m.thick(10, 5, 13, 1, 0.9, '#000'), 'bevel')
  },
  ing_mango: (k: Pix) => ICON.mango(k),
  ing_flour: (k: Pix) => {
    // Bag of glutinous rice flour ("แป้งบุญ") with a pink label.
    k.form(M.paper, (m) => m.poly([[3, 4], [13, 4], [13, 14], [3, 14]], '#000'), 'cyl')
    k.form(M.paper, (m) => m.poly([[4, 2], [12, 2], [13, 4], [3, 4]], '#000'), 'bevel')
    k.form(M.pink, (m) => m.rect(4, 6, 8, 5, '#000'), 'bevel')
    k.ball(8, 8.5, 1.8, 1.6, M.cream, { spec: false })
    k.fx(4, 1, '#ffffff')
    k.fx(11, 0, '#ffffff')
  },
  ing_sugar: (k: Pix) => {
    // Palm-sugar cakes (น้ำตาลปี๊บ) stacked.
    const p = R5('#ffe8b8', '#f2c078', '#d9964a', '#b06a2c', '#7a441c')
    for (let i = 0; i < 3; i++) {
      const y = 11 - i * 3
      k.form(p, (m) => m.ell(8, y, 5.4, 2, '#000'), 'ball', { spec: i === 2 })
    }
    k.fx(3, 3, '#ffffff')
  },
  ing_fishsauce: (k: Pix) => {
    // น้ำปลา "ตราปลาบุญ": amber bottle, red cap, fish on the label.
    const a = R5('#ffe0a0', '#f0a050', '#c86f1a', '#9a5214', '#643410')
    k.form(a, (m) => {
      m.rect(5, 6, 6, 8, '#000')
      m.poly([[6.5, 2], [9.5, 2], [11, 6], [5, 6]], '#000')
    }, 'cyl')
    k.form(M.red, (m) => m.rect(6, 0, 4, 2, '#000'), 'bevel')
    k.form(M.paper, (m) => m.rect(5, 8, 6, 4, '#000'), 'cyl')
    k.px(6, 10, M.blue.m)
    k.px(7, 10, M.blue.m)
    k.px(8, 9, M.blue.m)
    k.px(9, 10, M.blue.l)
  },
  ing_oil: (k: Pix) => {
    // Vegetable oil bottle with a green label and a golden drip.
    k.form(M.gold, (m) => {
      m.rect(4, 5, 7, 9, '#000')
      m.poly([[5.5, 2], [9.5, 2], [11, 5], [4, 5]], '#000')
    }, 'cyl')
    k.form(M.green, (m) => m.rect(6, 0, 3, 2, '#000'), 'bevel')
    k.form(M.green, (m) => m.rect(4, 7, 7, 4, '#000'), 'cyl')
    k.px(7, 8, M.gold.l)
    k.px(7, 9, M.gold.m)
    k.px(13, 9, M.gold.m)
    k.px(13, 10, M.gold.s)
    k.px(13, 8, M.gold.l)
  },
})

const ALL: Record<string, FoodDraw> = { ...ICON }
for (const [id, fn] of Object.entries(DISHES_ART)) {
  ALL[id] = (k) => fn(k, false)
  ALL[`${id}_gold`] = (k) => fn(k, true)
}
for (const [id, fn] of Object.entries(SNACK_ICON_ART)) if (!ALL[id]) ALL[id] = fn

// Friendly aliases so other systems can ask for the Thai classics by name.
const ALIAS: Record<string, string> = {
  kaprao: 'dish_kaprao',
  padthai: 'dish_padthai',
  mangosticky: 'mango_sticky',
  khanomkrok: 'dish_khanomkrok',
  bualoy: 'dish_bualoy',
  thongyod: 'dessert',
  icecream: 'icecream_coconut',
  namdaeng: 'red_soda',
  popcorn: 'hub_popcorn',
  saimai: 'hub_sai_mai',
  khaolam: 'khao_lam',
  moopin: 'moo_ping',
  somtam: 'som_tam',
}
for (const [a, to] of Object.entries(ALIAS)) if (!ALL[a] && ALL[to]) ALL[a] = ALL[to]

/** Every icon name this module draws. */
export const FOOD_KIT_NAMES = Object.keys(ALL)

export function hasFoodKitIcon(name: string): boolean {
  return name in ALL
}

/** Finished 16×16 food icon (cached). */
export function foodKitSprite(name: string): Sprite {
  return cached(`foodkit:${name}`, () => foodSprite(ALL[name] ?? ALL.rice))
}
