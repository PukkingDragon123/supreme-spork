// What each tutorial step says and points at (the step machine itself is
// src/game/botnoiTutorial.ts). Targets are tried in order; the first one
// that is really on screen gets the coach mark. When none is, the bubble
// explains what to do and offers "นำทาง".

import type { BotArm } from '../../art/botnoi'
import type { TutStepId } from '../../game/botnoiTutorial'
import { game } from '../../game/state'
import { dayKey } from '../../game/time'
import { giftReady } from '../../game/shop'
import { NPC_QUESTS } from '../../game/data/npcQuests'
import { questStatus } from '../../game/npcQuests'
import { activity, arrived, coinStoreOpen, goHome, mapId, mapOpen, mode, panel, prayStage, profileOpen, settingsOpen, shopSection, tab } from '../store'
import { goToSpot, questDialog, questTab } from '../quest/questUi'
import { L, type Line } from './botLines'
import { claimableCount } from '../Hotbar'

export type Target =
  /** A DOM element (optionally the first whose label starts with `text`). */
  | { kind: 'ui'; sel: string; text?: string; pad?: number }
  /** A world hotspot on the current map. */
  | { kind: 'hotspot'; id: string }
  /** The glowing walk-to spot. */
  | { kind: 'spot' }
  /** Any quest giver with a marker on this map. */
  | { kind: 'npc' }

export interface StepUi {
  lines: Line[]
  arm?: BotArm
  /** Big centred card instead of a coach mark. */
  card?: 'hello' | 'finish'
  targets: () => Target[]
  /** Hint shown while an activity / prayer is running (null = hide). */
  mini?: () => string | null
  /** "นำทาง": get the player to where the step can be done. */
  nav?: () => void
  /** Bubble when no target is on screen. */
  lost?: string
  /** A "ต่อไป"-style button (label) for reading steps. */
  next?: string
  /** Offer a skip-this-step button when this is true (e.g. nothing to claim). */
  fallback?: () => { text: string; label: string } | null
  /** Said by Bot Noi when the step is done. */
  praise?: string
}

/** Close windows, sheets and screens so the hotbar is reachable. */
export function closeAll() {
  panel.value = null
  activity.value = null
  arrived.value = null
  tab.value = 'temple'
  mapOpen.value = false
  coinStoreOpen.value = false
  settingsOpen.value = false
  profileOpen.value = false
  questDialog.value = null
}

const inWorld = () => mode.value === 'world'
const hot = (label: string): Target => ({ kind: 'ui', sel: `.hotbar button[aria-label="${label}"]`, pad: 2 })
const arrivedAt = (id: string) => arrived.value?.kind === 'hotspot' && arrived.value.hotspot.id === id
const actionBtn: Target = { kind: 'ui', sel: '.prompt .prompt-acts .btn', pad: 3 }

/** The first quest giver with something to offer on the home temple (for นำทาง). */
function homeGiver(): string {
  const s = game.value
  return NPC_QUESTS.find((q) => q.map === 'wat' && q.giver.startsWith('npc:') && questStatus(q, s) === 'available')?.giver ?? 'npc:yai_sri'
}

/** Anything claimable on the daily quest screen (quests, the bonus box, the login reward)? */
export function dailyClaimable(): boolean {
  return claimableCount() > 0
}

const menuOr = (label: string, t: 'quests' | 'shop'): Target[] => {
  if (tab.value === t) return []
  if (panel.value === 'menu') return [{ kind: 'ui', sel: '.menu-grid button', text: label, pad: 3 }]
  return [hot('เมนู')]
}

export const STEP_UI: Record<TutStepId, StepUi> = {
  hello: {
    card: 'hello',
    arm: 'wave',
    lines: [
      L('happy', 'สวัสดีครับ! ผมชื่อ “บอทน้อย” หุ่นยนต์ผู้ช่วยสายบุญรุ่นจิ๋ว ปิ๊บ ๆ!'),
      L('normal', 'ผมจะพาทัวร์วัด สอนทำบุญทีละขั้น ลงมือทำจริงทุกขั้นเลยนะครับ'),
      L('love', 'เรียนจบมีรางวัลด้วย! เหรียญ แถมที่คาดผมเสาอากาศแบบผมอีกหนึ่งอัน ^^'),
    ],
    targets: () => [],
  },
  walk: {
    arm: 'point',
    lines: [L('happy', 'เริ่มจากเดินก่อนครับ! แตะที่พื้นเพื่อเดิน ลองเดินไปที่วงแหวนเรืองแสงดูสิ')],
    targets: () => (inWorld() ? [{ kind: 'spot' }] : []),
    nav: () => (closeAll(), goToSpot('wat', null)),
    lost: 'ขั้นนี้ต้องเดินในวัดครับ กด “นำทาง” เดี๋ยวผมพาไป',
    praise: 'เดินเก่งมาก! ไม่สะดุดเหมือนผมเลย',
  },
  incense: {
    arm: 'point',
    lines: [L('normal', 'นี่คือกระถางธูปหน้าโบสถ์ครับ แตะที่กระถางธูปเพื่อเดินไปจุดธูปขอพรกัน')],
    targets: () => (arrivedAt('incense') ? [actionBtn] : inWorld() && mapId.value === 'wat' ? [{ kind: 'hotspot', id: 'incense' }] : []),
    mini: () => (activity.value?.id === 'wish' ? 'จุดธูป 3 ดอก เลือกของถวาย แล้วกดค้างส่งคำอธิษฐานนะครับ' : null),
    nav: () => goToSpot('wat', 'incense'),
    lost: 'กระถางธูปอยู่หน้าโบสถ์วัดของเราครับ กด “นำทาง” ได้เลย',
    praise: 'สาธุ~ คำอธิษฐานลอยไปแล้วครับ',
  },
  bag: {
    arm: 'point',
    lines: [L('happy', 'ของที่ได้มาจะเก็บไว้ในกระเป๋าครับ แตะ “กระเป๋า” ข้างล่างดูสิ!')],
    targets: () => [hot('กระเป๋า')],
    nav: closeAll,
  },
  bag_look: {
    arm: 'wave',
    lines: [L('love', 'นี่ไงครับ ข้าว แกง ธูป ของถวายพระอยู่ในนี้หมด เอาไปทำบุญได้เลย'), L('normal', 'ดูเสร็จแล้วปิดกระเป๋าได้เลยครับ')],
    targets: () => (panel.value === 'bag' ? [{ kind: 'ui', sel: '.win-backdrop .win', pad: 4 }] : []),
    next: 'เข้าใจแล้ว',
  },
  merit: {
    arm: 'point',
    lines: [L('happy', 'ทีนี้ทำบุญจริงกันครับ! แตะบ่อปลาคาร์ฟเพื่อไปให้อาหารปลา (หรือจะไปตักบาตรก็ได้นะ)')],
    targets: () =>
      arrivedAt('pond') || arrivedAt('alms') ? [actionBtn] : inWorld() && mapId.value === 'wat' ? [{ kind: 'hotspot', id: 'pond' }] : [],
    mini: () => (activity.value?.id === 'koi' ? 'แตะที่น้ำเพื่อโปรยอาหารครับ ปลาอ้วน เราอิ่มบุญ!' : activity.value?.id === 'alms' ? 'ใส่ของลงบาตรทีละอย่างนะครับ ตั้งใจทำ ได้บุญเต็ม ๆ' : null),
    nav: () => goToSpot('wat', 'pond'),
    lost: 'บ่อปลาคาร์ฟอยู่ในวัดของเราครับ กด “นำทาง” เลย',
    praise: 'ปลายิ้มแล้ว! (แปลได้ 3%)',
  },
  pray: {
    arm: 'point',
    lines: [L('normal', 'สวดมนต์ได้บุญเยอะที่สุดครับ แตะปุ่ม “สวดมนต์” ตรงกลางเลย')],
    targets: () => [{ kind: 'ui', sel: '.hotbar .hot.big', pad: 2 }],
    nav: closeAll,
  },
  pray_stage: {
    arm: 'point',
    lines: [
      L('surprised', 'นี่คือแผนที่ด่านสวดมนต์ครับ! ผ่านด่านไหน ด่านถัดไปก็จะปลดล็อก'),
      L('happy', 'เก็บดาวให้เยอะ ๆ ดาวใช้ปลดล็อกวัดดังบนแผนที่ด้วย เริ่มด่าน 1 กด “เริ่มสวดมนต์” เลยครับ'),
    ],
    targets: () => (panel.value === 'pray' ? [{ kind: 'ui', sel: '.ch-stage-card .btn.big', pad: 3 }] : []),
    nav: () => (closeAll(), (panel.value = 'pray')),
  },
  pray_do: {
    arm: 'cheer',
    lines: [L('happy', 'สวดตามคำที่เรืองแสงครับ หรือเลือก “แตะตามจังหวะ” ก็ได้ ผมเชียร์อยู่!')],
    targets: () => [],
    mini: () => (prayStage.value ? 'สวดตามคำที่เรืองแสง หรือแตะตามจังหวะก็ได้ครับ สู้ ๆ!' : null),
    nav: () => (closeAll(), (panel.value = 'pray')),
    lost: 'กลับไปสวดให้จบด่านกันครับ กด “นำทาง” เพื่อเปิดด่านสวดมนต์',
    praise: 'เสียงสวดเพราะมากครับ!',
  },
  quests: {
    arm: 'point',
    lines: [L('normal', 'ภารกิจรายวันมีรางวัลทุกวันครับ เปิด “เมนู” แล้วไปที่ “ภารกิจ” กัน'), L('happy', 'ทำภารกิจเสร็จแล้วกด “รับ” ได้เลยครับ')],
    targets: () =>
      tab.value === 'quests'
        ? [
            { kind: 'ui', sel: '.screen-win .quest .btn.green:not([disabled])', pad: 3 },
            { kind: 'ui', sel: '.screen-win .btn.green:not([disabled])', text: 'เปิดกล่อง', pad: 3 },
            { kind: 'ui', sel: '.screen-win .btn.green:not([disabled])', text: 'รับรางวัล', pad: 3 },
          ]
        : menuOr('ภารกิจ', 'quests'),
    nav: () => (closeAll(), (questTab.value = 'daily'), (tab.value = 'quests')),
    fallback: () => (tab.value === 'quests' && !dailyClaimable() ? { text: 'ตอนนี้ยังไม่มีรางวัลให้รับครับ ทำภารกิจให้ครบแล้วกลับมากด “รับ” นะ', label: 'เข้าใจแล้ว' } : null),
    praise: 'ได้รางวัลแล้ว เย้!',
  },
  npc: {
    arm: 'point',
    lines: [L('surprised', 'เห็นเครื่องหมาย “!” บนหัวชาวบ้านไหมครับ? แปลว่ามีเรื่องอยากให้ช่วย'), L('happy', 'แตะที่เขาเพื่อเดินไปคุยดูสิครับ')],
    targets: () => (inWorld() && tab.value === 'temple' && !panel.value ? [{ kind: 'npc' }] : []),
    nav: () => {
      closeAll()
      goToSpot('wat', homeGiver())
    },
    lost: 'ไปหาคนที่มี “!” บนหัวกันครับ กด “นำทาง” ผมพาไปเอง',
    praise: 'ได้ทั้งเหรียญทั้งบุญ!',
  },
  map: {
    arm: 'point',
    lines: [L('normal', 'อยากไปทำบุญที่อื่นบ้างไหมครับ? แตะ “แผนที่” ดูสิ')],
    targets: () => [hot('แผนที่')],
    nav: closeAll,
  },
  map_look: {
    arm: 'wave',
    lines: [
      L('love', 'นี่คือแผนที่ทำบุญทั่วไทยครับ! มีวัดดังทุกภาค ตลาดย่านเก่า และงานวัดสุดม่วน'),
      L('happy', 'เก็บดาวจากการสวดมนต์เพื่อปลดล็อกที่ใหม่ ๆ แล้วแตะหมุดเพื่อเดินทางได้เลยครับ'),
    ],
    targets: () => (mapOpen.value ? [{ kind: 'ui', sel: '.thaimap .thaimap-stats', pad: 4 }] : []),
    next: 'ต่อไป',
  },
  shop: {
    arm: 'point',
    lines: [L('happy', 'แวะร้านค้ากันครับ! ทุกวันมีของขวัญฟรี ไม่รับถือว่าเสียดายมาก ๆ'), L('normal', 'กด “รับฟรี” ที่ของขวัญเลยครับ')],
    targets: () =>
      tab.value === 'shop'
        ? [{ kind: 'ui', sel: '.sh-gift.ready .btn', pad: 3 }, { kind: 'ui', sel: '.sh-gift-btn.ready', pad: 3 }]
        : menuOr('ร้านค้า', 'shop'),
    nav: () => (closeAll(), (shopSection.value = 'featured'), (tab.value = 'shop')),
    fallback: () => (tab.value === 'shop' && !giftReady(game.value, dayKey()) ? { text: 'วันนี้รับของขวัญไปแล้วครับ พรุ่งนี้มาใหม่นะ!', label: 'ต่อไป' } : null),
    praise: 'ของขวัญฟรี! พรุ่งนี้มาใหม่นะ',
  },
  home: {
    arm: 'point',
    lines: [L('happy', 'กลับบ้านกันครับ! บ้านเราแต่งได้ตามใจเลย แตะ “บ้าน” ข้างล่าง')],
    targets: () => (mode.value === 'world' ? [hot('บ้าน')] : []),
    nav: () => (closeAll(), goHome()),
  },
  decorate: {
    arm: 'point',
    lines: [L('normal', 'ยินดีต้อนรับสู่บ้านครับ! แตะปุ่มดินสอเพื่อ “จัดห้อง” กัน')],
    targets: () => (mode.value === 'house' ? [{ kind: 'ui', sel: '.house-tools button[aria-label="จัดห้อง"]', pad: 3 }] : []),
    nav: () => (closeAll(), goHome()),
    lost: 'ขั้นนี้ทำที่บ้านครับ กด “นำทาง” กลับบ้านกัน',
  },
  decorate_done: {
    arm: 'wave',
    lines: [L('love', 'ลากของจากคลังไปวางตรงไหนก็ได้ แตะของในห้องเพื่อย้ายครับ'), L('happy', 'พอใจแล้วกด “เสร็จ” เลย!')],
    targets: () => (mode.value === 'house' ? [{ kind: 'ui', sel: '.house-edit-top .btn.green', pad: 3 }] : []),
    next: 'เข้าใจแล้ว',
  },
  finish: {
    card: 'finish',
    arm: 'cheer',
    lines: [L('love', 'เรียนจบแล้ว! เก่งที่สุดในสามโลกเลยครับ'), L('happy', 'ต่อจากนี้ผมจะลอยอยู่ข้าง ๆ นะครับ แตะผมได้ทุกเมื่อ มีภารกิจให้ทำอีกเพียบ!')],
    targets: () => [],
  },
}
