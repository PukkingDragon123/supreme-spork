// The prayer stage road map as a storybook journey through the life of the
// Buddha (พุทธประวัติ). Pure data + layout maths only (no DOM), so it can be
// unit tested: which stage belongs to which chapter of the story, where each
// stage node sits on the painted map and the winding road that joins them.
//
// Map space is measured in art pixels (1 art px = 2 CSS px on screen).
// Chapters are stacked bottom → top: the road starts at the birth in Lumbini
// at the bottom and climbs to the Parinibbāna and the relic stupa at the top.
// Inside a chapter a point is written as [dx, up]: dx from the map centre
// line (right is +), `up` from the chapter's bottom edge.

import { STAGES, type PrayerStage } from '../game/data/prayers'
import type { AreaId } from '../game/data/areas'

export type JourneyChapterId = 'birth' | 'palace' | 'renounce' | 'ascetic' | 'enlighten' | 'sermon' | 'teaching' | 'nibbana'

export type LocalPt = [number, number]

/** A painted vignette the player can tap for its short story. */
export interface JourneyScene {
  id: string
  title: string
  /** One or two short sentences in simple Thai. */
  caption: string
  /** Tap area [dx0, up0, dx1, up1] in chapter-local coordinates. */
  box: [number, number, number, number]
  /** The part of the painting shown on the story card (default: the tap area). */
  view?: [number, number, number, number]
}

export interface JourneyChapter {
  id: JourneyChapterId
  /** 1…8, shown as a Thai numeral. */
  n: number
  title: string
  /** Short title for the cartouche painted on the map. */
  tag: string
  /** Where it happened. */
  place: string
  /** Painted at night (the escape, the enlightenment). */
  night?: boolean
  /** Stage ids on this chapter, in play order. */
  stages: string[]
  /** Height of the chapter band in art px. */
  h: number
  /** One node per stage, chapter-local. */
  nodes: LocalPt[]
  /**
   * The road through the chapter: node indices and extra bends. The first
   * point is where the road enters from below and the last where it leaves.
   */
  route: (number | LocalPt)[]
  scenes: JourneyScene[]
}

/** Thai digits for chapter numbers (๑ ๒ ๓ …). */
export function thaiNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[+d])
}

// ---------------------------------------------------------------------------
// The story. Captions follow the Thai Pathamasambodhi tradition that temple
// murals illustrate, in plain words for players of every age.

export const JOURNEY: JourneyChapter[] = [
  {
    id: 'birth',
    n: 1,
    title: 'ประสูติ ณ ลุมพินีวัน',
    tag: 'ประสูติ',
    place: 'สวนลุมพินี',
    stages: ['wat-1', 'wat-2', 'wat-3'],
    h: 214,
    nodes: [
      [34, 40],
      [-18, 104],
      [-52, 172],
    ],
    route: [[0, 0], [10, 14], 0, [30, 72], 1, [-44, 134], 2, [-30, 214]],
    scenes: [
      {
        id: 'steps',
        title: 'เจ็ดก้าวบนดอกบัว',
        caption: 'พระกุมารสิทธัตถะทรงดำเนินได้ 7 ก้าว มีดอกบัวผุดขึ้นมารองรับทุกก้าว แล้วทรงเปล่งวาจาว่า "เราเป็นผู้เลิศที่สุดในโลก ชาตินี้เป็นชาติสุดท้าย"',
        box: [-96, 16, -14, 92],
      },
      {
        id: 'maya',
        title: 'พระนางสิริมหามายา',
        caption: 'พระนางสิริมหามายาเสด็จกลับกรุงเทวทหะบ้านเกิดตามธรรมเนียม ระหว่างทางแวะพักที่สวนลุมพินี ทรงเหนี่ยวกิ่งต้นสาละ แล้วประสูติพระโอรสในวันเพ็ญเดือนหก',
        box: [4, 100, 96, 212],
      },
    ],
  },
  {
    id: 'palace',
    n: 2,
    title: 'ชีวิตในวัง และเทวทูต ๔',
    tag: 'เทวทูต ๔',
    place: 'กรุงกบิลพัสดุ์',
    stages: ['wat-4', 'wat-5', 'wat-6', 'wat-7'],
    h: 262,
    nodes: [
      [-46, 44],
      [8, 106],
      [52, 164],
      [-10, 226],
    ],
    route: [[-30, 0], [-44, 20], 0, [-30, 84], 1, [40, 128], 2, [30, 200], 3, [-20, 262]],
    scenes: [
      {
        id: 'palace',
        title: 'ปราสาท ๓ ฤดู',
        caption: 'พระเจ้าสุทโธทนะทรงสร้างปราสาท 3 หลังให้เจ้าชายประทับตามฤดูกาล มีแต่ความสุขสบาย ไม่ให้ได้เห็นความทุกข์เลย',
        box: [2, 6, 96, 96],
      },
      {
        id: 'old',
        title: 'เทวทูตที่ ๑ · คนแก่',
        caption: 'เจ้าชายเสด็จประพาสอุทยานกับนายฉันนะ ทรงเห็นคนแก่ผมขาว หลังค่อม ถือไม้เท้า จึงรู้ว่าทุกคนต้องแก่',
        box: [-96, 64, -58, 104],
      },
      {
        id: 'sick',
        title: 'เทวทูตที่ ๒ · คนเจ็บ',
        caption: 'ทรงเห็นคนเจ็บไข้นอนทรมาน มีญาติคอยดูแล จึงรู้ว่าทุกคนต้องเจ็บป่วย',
        box: [-68, 120, -14, 156],
      },
      {
        id: 'dead',
        title: 'เทวทูตที่ ๓ · คนตาย',
        caption: 'ทรงเห็นผู้คนหามร่างที่สิ้นลมอย่างสงบไปส่ง จึงรู้ว่าทุกชีวิตต้องจากไปเป็นธรรมดา',
        box: [4, 186, 70, 222],
      },
      {
        id: 'monk',
        title: 'เทวทูตที่ ๔ · สมณะ',
        caption: 'ทรงเห็นสมณะผู้มีใบหน้าสงบเย็น จึงตั้งใจจะออกบวช เพื่อหาทางพ้นจากความทุกข์ทั้งปวง',
        box: [-96, 190, -44, 250],
      },
    ],
  },
  {
    id: 'renounce',
    n: 3,
    title: 'เสด็จออกผนวช',
    tag: 'ออกผนวช',
    place: 'ฝั่งแม่น้ำอโนมา',
    night: true,
    stages: ['wat-8', 'wat-9', 'wat-10'],
    h: 224,
    nodes: [
      [-44, 38],
      [30, 98],
      [-8, 178],
    ],
    route: [[-20, 0], [-40, 16], 0, [-10, 70], 1, [44, 140], 2, [-24, 224]],
    scenes: [
      {
        id: 'kanthaka',
        title: 'ม้ากัณฐกะ',
        caption: 'คืนเพ็ญเดือนแปด เจ้าชายวัย 29 พรรษาเสด็จออกจากวังบนหลังม้ากัณฐกะ มีนายฉันนะตามเสด็จ เหล่าเทวดาช่วยรองรับกีบม้าไม่ให้มีเสียงดัง',
        box: [2, 8, 96, 76],
      },
      {
        id: 'hair',
        title: 'ตัดพระเมาลี',
        caption: 'ถึงฝั่งแม่น้ำอโนมา ทรงตัดพระเมาลีด้วยพระขรรค์แล้วโยนขึ้นฟ้า พระอินทร์นำผอบแก้วมารับไปบรรจุไว้ในพระจุฬามณีเจดีย์บนสวรรค์ชั้นดาวดึงส์',
        box: [-96, 110, -30, 216],
      },
    ],
  },
  {
    id: 'ascetic',
    n: 4,
    title: 'แสวงหาทางพ้นทุกข์',
    tag: 'ทางสายกลาง',
    place: 'ริมแม่น้ำเนรัญชรา',
    stages: ['shrine-1', 'shrine-2', 'shrine-3', 'shrine-4', 'shrine-5', 'shrine-6'],
    h: 330,
    nodes: [
      [-40, 34],
      [18, 82],
      [58, 134],
      [8, 190],
      [-52, 240],
      [14, 296],
    ],
    route: [[-24, 0], [-40, 14], 0, [-8, 60], 1, [48, 104], 2, [40, 166], 3, [-30, 212], 4, [-40, 272], 5, [20, 330]],
    scenes: [
      {
        id: 'fast',
        title: 'บำเพ็ญทุกรกิริยา',
        caption: 'พระโพธิสัตว์ทรงอดอาหารทรมานพระวรกายอยู่ถึง 6 ปี จนซูบผอมมาก มีปัญจวัคคีย์ทั้ง 5 คอยปรนนิบัติ แต่ก็ยังไม่พบทางพ้นทุกข์',
        box: [4, 8, 96, 62],
      },
      {
        id: 'lute',
        title: 'พิณสามสาย',
        caption: 'พระอินทร์ดีดพิณ 3 สายถวาย สายตึงเกินไปก็ขาด สายหย่อนเกินไปก็ไม่ดัง สายที่พอดีเสียงไพเราะ จึงทรงรู้ว่าต้องเดิน "ทางสายกลาง"',
        box: [-96, 70, -20, 130],
      },
      {
        id: 'sujata',
        title: 'นางสุชาดาถวายข้าวมธุปายาส',
        caption: 'เช้าวันเพ็ญเดือนหก นางสุชาดานำข้าวมธุปายาสใส่ถาดทองมาถวายใต้ต้นไทร พระโพธิสัตว์เสวยแล้วมีกำลังกลับคืนมา',
        box: [-96, 150, -14, 214],
      },
      {
        id: 'tray',
        title: 'ถาดทองลอยทวนน้ำ',
        caption: 'ทรงลอยถาดทองลงในแม่น้ำเนรัญชรา อธิษฐานว่าถ้าจะได้ตรัสรู้ ขอให้ถาดลอยทวนกระแสน้ำ แล้วถาดทองก็ลอยทวนน้ำขึ้นไปจริง ๆ',
        box: [20, 208, 96, 290],
      },
    ],
  },
  {
    id: 'enlighten',
    n: 5,
    title: 'ตรัสรู้ใต้ต้นโพธิ์',
    tag: 'ตรัสรู้',
    place: 'พุทธคยา',
    night: true,
    stages: ['river-1', 'river-2', 'river-3', 'river-4', 'river-5', 'river-6', 'river-7', 'river-8'],
    h: 430,
    nodes: [
      [26, 30],
      [-34, 72],
      [-70, 124],
      [-72, 184],
      [-68, 244],
      [-66, 304],
      [-34, 358],
      [30, 404],
    ],
    route: [[20, 0], [30, 12], 0, [-4, 56], 1, [-60, 96], 2, [-78, 154], 3, [-76, 214], 4, [-74, 274], 5, [-60, 336], 6, [-4, 390], 7, [40, 430]],
    scenes: [
      {
        id: 'grass',
        title: 'หญ้าคา ๘ กำ',
        caption: 'โสตถิยพราหมณ์ถวายหญ้าคา 8 กำ พระโพธิสัตว์ทรงปูเป็นที่ประทับใต้ต้นโพธิ์ ตั้งใจมั่นว่าหากยังไม่ตรัสรู้จะไม่ลุกขึ้น',
        box: [-96, 8, -6, 52],
      },
      {
        id: 'mara',
        title: 'กองทัพพญามาร',
        caption: 'พญาวสวัตตีมารขี่ช้างคีรีเมขล์ ยกทัพมาแย่งบัลลังก์ แต่พระโพธิสัตว์ไม่หวั่นไหว ทรงนิ่งสงบด้วยบารมีที่สั่งสมมา',
        box: [34, 60, 96, 150],
        view: [-12, 54, 97, 170],
      },
      {
        id: 'thorani',
        title: 'พระแม่ธรณีบีบมวยผม',
        caption: 'พระโพธิสัตว์ชี้พระหัตถ์ลงแตะพื้นดิน พระแม่ธรณีผุดขึ้นเป็นพยาน บีบมวยผมให้น้ำกรวดที่พระองค์หลั่งทำบุญมาทุกชาติไหลหลาก ท่วมกองทัพมารจนพ่ายแพ้',
        box: [-40, 120, 40, 228],
        view: [-40, 60, 97, 232],
      },
      {
        id: 'bodhi',
        title: 'ตรัสรู้เป็นพระพุทธเจ้า',
        caption: 'คืนวันเพ็ญเดือนหก ใต้ต้นพระศรีมหาโพธิ์ ริมแม่น้ำเนรัญชรา พระโพธิสัตว์ทรงตรัสรู้อริยสัจ 4 เป็นพระสัมมาสัมพุทธเจ้า เมื่อพระชนมายุ 35 พรรษา',
        box: [-24, 232, 62, 376],
        view: [-46, 236, 90, 386],
      },
    ],
  },
  {
    id: 'sermon',
    n: 6,
    title: 'ปฐมเทศนา',
    tag: 'ปฐมเทศนา',
    place: 'ป่าอิสิปตนมฤคทายวัน',
    stages: ['mountain-1', 'mountain-2'],
    h: 200,
    nodes: [
      [-40, 44],
      [44, 150],
    ],
    route: [[40, 0], [0, 20], 0, [-50, 96], [10, 124], 1, [20, 200]],
    scenes: [
      {
        id: 'wheel',
        title: 'ธรรมจักรหมุนครั้งแรก',
        caption: 'วันเพ็ญเดือนแปด พระพุทธเจ้าทรงแสดงธัมมจักกัปปวัตตนสูตรแก่ปัญจวัคคีย์ โกณฑัญญะได้ดวงตาเห็นธรรม บวชเป็นพระสงฆ์รูปแรก พระรัตนตรัยจึงครบ 3 ประการ',
        box: [-8, 20, 96, 118],
      },
      {
        id: 'deer',
        title: 'ป่ากวาง',
        caption: 'มฤคทายวัน แปลว่า ป่าที่ให้อภัยแก่กวาง ห้ามใครทำร้ายกวางที่นี่ รูปธรรมจักรกับกวางหมอบจึงเป็นสัญลักษณ์ของวันแสดงธรรมครั้งแรก',
        box: [-96, 116, -2, 196],
      },
    ],
  },
  {
    id: 'teaching',
    n: 7,
    title: 'ประกาศพระศาสนา',
    tag: 'เผยแผ่ธรรม',
    place: 'ราชคฤห์ · สาวัตถี',
    stages: ['mountain-3', 'mountain-4', 'mountain-5', 'mountain-6'],
    h: 282,
    nodes: [
      [-30, 36],
      [48, 92],
      [-20, 160],
      [40, 232],
    ],
    route: [[20, 0], [-20, 16], 0, [10, 70], 1, [30, 126], 2, [-10, 196], 3, [30, 282]],
    scenes: [
      {
        id: 'veluvana',
        title: 'วัดเวฬุวัน',
        caption: 'พระเจ้าพิมพิสารถวายสวนไผ่ให้เป็นวัดแห่งแรกในพระพุทธศาสนา ต่อมาพระอรหันต์ 1,250 รูปมาประชุมกันที่นี่โดยไม่ได้นัดหมาย ในวันมาฆบูชา',
        box: [2, 8, 96, 70],
      },
      {
        id: 'jetavana',
        title: 'วัดเชตวัน',
        caption: 'อนาถบิณฑิกเศรษฐีซื้อสวนของเจ้าเชตด้วยการเอาเหรียญทองปูจนเต็มพื้น แล้วสร้างวัดถวาย พระพุทธเจ้าประทับจำพรรษาที่นี่ถึง 19 พรรษา',
        box: [-96, 60, 12, 130],
      },
      {
        id: 'alms',
        title: 'บิณฑบาตยามเช้า',
        caption: 'ทุกเช้าพระสงฆ์ออกบิณฑบาตอย่างสงบ ชาวบ้านใส่บาตรด้วยใจเลื่อมใส เป็นบุญที่สืบทอดมาจนถึงทุกวันนี้',
        box: [12, 132, 96, 196],
      },
      {
        id: 'nalagiri',
        title: 'ช้างนาฬาคีรี',
        caption: 'พระเทวทัตปล่อยช้างนาฬาคีรีที่ถูกมอมเหล้าให้วิ่งเข้าทำร้าย พระพุทธเจ้าแผ่เมตตา ช้างก็หายดุร้าย ย่อตัวลงหมอบอย่างสงบ',
        box: [-96, 190, 10, 276],
      },
    ],
  },
  {
    id: 'nibbana',
    n: 8,
    title: 'ปรินิพพาน',
    tag: 'ปรินิพพาน',
    place: 'เมืองกุสินารา',
    stages: ['mountain-7', 'mountain-8'],
    h: 270,
    nodes: [
      [50, 40],
      [0, 190],
    ],
    route: [[30, 0], [50, 18], 0, [70, 96], [40, 150], 1],
    scenes: [
      {
        id: 'nibbana',
        title: 'ระหว่างต้นสาละคู่',
        caption: 'เมื่อพระชนมายุ 80 พรรษา พระพุทธเจ้าเสด็จดับขันธปรินิพพานระหว่างต้นสาละคู่ ประทานปัจฉิมโอวาทว่า "สังขารทั้งหลายมีความเสื่อมไปเป็นธรรมดา จงทำความเพียรด้วยความไม่ประมาทเถิด"',
        box: [-96, 20, 22, 130],
      },
      {
        id: 'stupa',
        title: 'พระบรมสารีริกธาตุ',
        caption: 'หลังถวายพระเพลิง โทณพราหมณ์แบ่งพระบรมสารีริกธาตุเป็น 8 ส่วน นำไปประดิษฐานในสถูปเจดีย์ ให้ผู้คนได้กราบไหว้ระลึกถึงพระองค์มาจนทุกวันนี้',
        box: [-40, 196, 40, 268],
      },
    ],
  },
]

export const JOURNEY_BY_ID: Record<JourneyChapterId, JourneyChapter> = Object.fromEntries(JOURNEY.map((c) => [c.id, c])) as Record<JourneyChapterId, JourneyChapter>

const CHAPTER_OF: Record<string, JourneyChapter> = {}
for (const c of JOURNEY) for (const id of c.stages) CHAPTER_OF[id] = c

/** The story chapter a prayer stage is painted in. */
export function chapterOfStage(id: string): JourneyChapter | undefined {
  return CHAPTER_OF[id]
}

/** Every stage in journey order (the order of the road). */
export const JOURNEY_STAGES: string[] = JOURNEY.flatMap((c) => c.stages)

/** The temple (prayer chapter / tab) whose first stage opens at a chapter boundary. */
export interface TempleGate {
  temple: AreaId
  /** The first stage behind this gate. */
  stageId: string
}

/** Where each temple's stages begin along the road. */
export function templeGates(stages: PrayerStage[] = STAGES): TempleGate[] {
  const out: TempleGate[] = []
  for (const id of JOURNEY_STAGES) {
    const st = stages.find((s) => s.id === id)
    if (st && st.n === 1) out.push({ temple: st.chapter, stageId: id })
  }
  return out
}

// ---------------------------------------------------------------------------
// Layout

/** Empty ground below the first chapter (the start) and sky above the last. */
export const MAP_BOTTOM = 44
export const MAP_TOP = 40
/** One art pixel in CSS pixels. */
export const MAP_SCALE = 2

export interface NodeSpot {
  stageId: string
  chapter: JourneyChapterId
  /** Index in journey order. */
  i: number
  x: number
  y: number
  /** Arc length of the road at this node. */
  s: number
}

export interface ChapterBand {
  id: JourneyChapterId
  /** Top edge (smaller y) and bottom edge in map space. */
  top: number
  bottom: number
}

export interface JourneyLayout {
  w: number
  h: number
  cx: number
  bands: ChapterBand[]
  nodes: NodeSpot[]
  /** The sampled road (≈1 px apart) with cumulative arc length. */
  road: RoadPath
}

export interface RoadPath {
  xs: Float32Array
  ys: Float32Array
  /** Cumulative length at each sample. */
  cum: Float32Array
  length: number
}

/** Total map height in art px. */
export function journeyHeight(): number {
  return MAP_BOTTOM + MAP_TOP + JOURNEY.reduce((a, c) => a + c.h, 0)
}

/** Chapter-local point → map point. */
export function toMap(band: ChapterBand, cx: number, p: LocalPt): [number, number] {
  return [cx + p[0], band.bottom - p[1]]
}

const layoutCache = new Map<number, JourneyLayout>()

/** Positions of chapters, stage nodes and the road for a map `w` art px wide. */
export function journeyLayout(w: number): JourneyLayout {
  const key = Math.round(w)
  const hit = layoutCache.get(key)
  if (hit) return hit
  const h = journeyHeight()
  const cx = Math.floor(key / 2)
  const bands: ChapterBand[] = []
  let bottom = h - MAP_BOTTOM
  for (const c of JOURNEY) {
    bands.push({ id: c.id, top: bottom - c.h, bottom })
    bottom -= c.h
  }
  // Control points of the road, remembering which ones are stage nodes.
  const ctrl: [number, number][] = [[cx, h - 6]]
  const nodeCtrl: { stageId: string; chapter: JourneyChapterId; k: number }[] = []
  JOURNEY.forEach((c, ci) => {
    const band = bands[ci]
    c.route.forEach((r, ri) => {
      const p = typeof r === 'number' ? c.nodes[r] : r
      const m = toMap(band, cx, p)
      // Consecutive chapters share their joining point.
      const last = ctrl[ctrl.length - 1]
      if (ri === 0 && ci > 0 && Math.abs(last[0] - m[0]) < 0.5 && Math.abs(last[1] - m[1]) < 0.5) return
      if (typeof r === 'number') nodeCtrl.push({ stageId: c.stages[r], chapter: c.id, k: ctrl.length })
      ctrl.push(m)
    })
  })
  const road = sampleRoad(ctrl)
  const nodes: NodeSpot[] = nodeCtrl.map((n, i) => ({
    stageId: n.stageId,
    chapter: n.chapter,
    i,
    x: ctrl[n.k][0],
    y: ctrl[n.k][1],
    s: road.ctrlS[n.k],
  }))
  const out: JourneyLayout = { w: key, h, cx, bands, nodes, road }
  layoutCache.set(key, out)
  return out
}

/**
 * Sample a Catmull-Rom spline through the control points into a polyline
 * about one art px per step, recording the arc length at each control point.
 */
export function sampleRoad(ctrl: [number, number][]): RoadPath & { ctrlS: number[] } {
  const xs: number[] = []
  const ys: number[] = []
  const cum: number[] = []
  const ctrlS: number[] = []
  let len = 0
  const push = (x: number, y: number) => {
    if (xs.length) len += Math.hypot(x - xs[xs.length - 1], y - ys[ys.length - 1])
    xs.push(x)
    ys.push(y)
    cum.push(len)
  }
  if (ctrl.length === 1) {
    push(ctrl[0][0], ctrl[0][1])
    ctrlS.push(0)
  }
  for (let i = 0; i + 1 < ctrl.length; i++) {
    const p0 = ctrl[Math.max(0, i - 1)]
    const p1 = ctrl[i]
    const p2 = ctrl[i + 1]
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)]
    const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const steps = Math.max(2, Math.ceil(seg * 1.4))
    if (i === 0) {
      push(p1[0], p1[1])
      ctrlS.push(0)
    }
    for (let k = 1; k <= steps; k++) {
      const t = k / steps
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      push(f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]))
    }
    ctrlS.push(len)
  }
  return { xs: Float32Array.from(xs), ys: Float32Array.from(ys), cum: Float32Array.from(cum), length: len, ctrlS }
}

/** Point on the road at arc length s (clamped), with the travel direction. */
export function roadAt(road: RoadPath, s: number): { x: number; y: number; dx: number; dy: number } {
  const n = road.xs.length
  if (n === 0) return { x: 0, y: 0, dx: 0, dy: -1 }
  if (s <= 0) return { x: road.xs[0], y: road.ys[0], dx: road.xs[Math.min(1, n - 1)] - road.xs[0], dy: road.ys[Math.min(1, n - 1)] - road.ys[0] }
  if (s >= road.length) return { x: road.xs[n - 1], y: road.ys[n - 1], dx: road.xs[n - 1] - road.xs[Math.max(0, n - 2)], dy: road.ys[n - 1] - road.ys[Math.max(0, n - 2)] }
  // Binary search the segment.
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (road.cum[mid] <= s) lo = mid
    else hi = mid
  }
  const span = road.cum[hi] - road.cum[lo] || 1
  const t = (s - road.cum[lo]) / span
  return {
    x: road.xs[lo] + (road.xs[hi] - road.xs[lo]) * t,
    y: road.ys[lo] + (road.ys[hi] - road.ys[lo]) * t,
    dx: road.xs[hi] - road.xs[lo],
    dy: road.ys[hi] - road.ys[lo],
  }
}

/** Arc length of the road sample nearest to a map point. */
export function nearestS(road: RoadPath, x: number, y: number): number {
  let best = Infinity
  let s = 0
  for (let i = 0; i < road.xs.length; i++) {
    const d = (road.xs[i] - x) ** 2 + (road.ys[i] - y) ** 2
    if (d < best) {
      best = d
      s = road.cum[i]
    }
  }
  return s
}

/**
 * Where a temple's gate stands on the road: at the start of the journey for
 * the first temple, otherwise where the road enters the gate stage's chapter.
 */
export function gatePoint(layout: JourneyLayout, stageId: string): { x: number; y: number; s: number } {
  const ci = JOURNEY.findIndex((c) => c.stages.includes(stageId))
  const c = JOURNEY[ci]
  const band = layout.bands[ci]
  const s = ci === 0 ? 14 : nearestS(layout.road, layout.cx + (c.route[0] as LocalPt)[0], band.bottom) - 4
  const p = roadAt(layout.road, s)
  return { x: Math.round(p.x), y: Math.round(p.y), s }
}

/** The chapter band containing map y (clamped to the first / last). */
export function bandAt(layout: JourneyLayout, y: number): ChapterBand {
  for (const b of layout.bands) if (y >= b.top && y < b.bottom) return b
  return y >= layout.bands[0].bottom ? layout.bands[0] : layout.bands[layout.bands.length - 1]
}

// ---------------------------------------------------------------------------
// Where the player stands

/**
 * Where the avatar's feet go beside a node (map px offset): next to the disc
 * on the side facing the middle of the map, a little lower than its centre.
 */
export function standOffset(node: { x: number }, cx: number): [number, number] {
  return [node.x <= cx ? 19 : -19, 6]
}

/**
 * The avatar's feet while walking from node a to node b (k: 0..1 eased):
 * it steps onto the road, follows it, and steps aside again at the end.
 */
export function walkPoint(road: RoadPath, a: { x: number; s: number }, b: { x: number; s: number }, cx: number, k: number): { x: number; y: number; dy: number } {
  const p = roadAt(road, a.s + (b.s - a.s) * k)
  const oa = standOffset(a, cx)
  const ob = standOffset(b, cx)
  const wa = Math.max(0, 1 - k * 5)
  const wb = Math.max(0, (k - 0.8) * 5)
  return { x: p.x + oa[0] * wa + ob[0] * wb, y: p.y + oa[1] * wa + ob[1] * wb, dy: p.dy }
}

export interface StageView {
  unlocked: (id: string) => boolean
  passed: (id: string) => boolean
}

/**
 * The stage the avatar stands at: the first open stage not yet passed along
 * the road, or (when everything open is passed) the furthest open stage.
 */
export function avatarStage(v: StageView, order: string[] = JOURNEY_STAGES): string {
  const next = order.find((id) => v.unlocked(id) && !v.passed(id))
  if (next) return next
  for (let i = order.length - 1; i >= 0; i--) if (v.unlocked(order[i])) return order[i]
  return order[0]
}

/**
 * Should the avatar walk from the stage it stood at last time to the new one?
 * Only forward along the road, and not across more than a few nodes (a big
 * jump just appears there).
 */
export function walkFrom(prev: string | null, next: string, order: string[] = JOURNEY_STAGES, maxHops = 3): string | null {
  if (!prev || prev === next) return null
  const a = order.indexOf(prev)
  const b = order.indexOf(next)
  if (a < 0 || b < 0 || b <= a || b - a > maxHops) return null
  return prev
}
