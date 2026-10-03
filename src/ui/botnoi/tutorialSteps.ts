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
  /** Step aside (no bubble, no dim) while this is true, e.g. while placing furniture. */
  aside?: () => boolean
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
      L('love', 'ผมจะคอยบอกเคล็ดลับเล็ก ๆ ทำตามลำดับไหนก็ได้ จะเดินเล่นก่อนก็ได้นะ ครบแล้วมีของขวัญชิ้นใหญ่! ^^'),
    ],
    targets: () => [],
  },
  incense: {
    arm: 'point',
    lines: [L('normal', 'นี่คือกระถางธูปหน้าโบสถ์ครับ แตะที่กระถางธูปเพื่อเดินไปจุดธูปขอพรกัน'), L('wink', 'ยังไม่มีธูปใช่ไหมครับ? ไม่เป็นไร ธูปหน้าโบสถ์ผมให้ยืมจุดฟรีก่อนนะ!')],
    targets: () => (arrivedAt('incense') ? [actionBtn] : inWorld() && mapId.value === 'wat' ? [{ kind: 'hotspot', id: 'incense' }] : []),
    mini: () => (activity.value?.id === 'wish' ? 'ธูปนี้บอทน้อยให้ยืมจุดฟรีนะครับ จุด 3 ดอก แล้วกดค้างอธิษฐานเลย (ของถวายข้ามไปก่อนได้)' : null),
    nav: () => goToSpot('wat', 'incense'),
    lost: 'กระถางธูปอยู่หน้าโบสถ์วัดของเราครับ กด “นำทาง” ได้เลย',
    praise: 'สาธุ~ คำอธิษฐานลอยไปแล้วครับ',
  },
  merit: {
    arm: 'point',
    lines: [L('happy', 'ทีนี้ทำบุญจริงกันครับ! แตะบ่อปลาคาร์ฟเพื่อไปให้อาหารปลา (หรือจะไปตักบาตรก็ได้นะ)'), L('wink', 'อาหารปลากับของใส่บาตร บอทน้อยให้ยืมก่อนนะ ใช้เสร็จผมเก็บคืน ^^')],
    targets: () =>
      arrivedAt('pond') || arrivedAt('alms') ? [actionBtn] : inWorld() && mapId.value === 'wat' ? [{ kind: 'hotspot', id: 'pond' }] : [],
    mini: () => (activity.value?.id === 'koi' ? 'อาหารปลาบอทน้อยให้ยืมก่อนนะ แตะที่น้ำเพื่อโปรยอาหารครับ!' : activity.value?.id === 'alms' ? 'ของใส่บาตรบอทน้อยให้ยืมก่อนนะ ใส่ลงบาตรทีละอย่างได้เลยครับ' : null),
    nav: () => goToSpot('wat', 'pond'),
    lost: 'บ่อปลาคาร์ฟอยู่ในวัดของเราครับ กด “นำทาง” เลย',
    praise: 'ปลายิ้มแล้ว! (แปลได้ 3%)',
  },
  pray: {
    arm: 'point',
    lines: [L('normal', 'สวดมนต์ได้บุญเยอะที่สุดครับ ลองสวดด่าน 1 ดูไหม? ผ่านด่านไหน ด่านถัดไปก็เปิด')],
    targets: () =>
      panel.value === 'pray'
        ? [
            { kind: 'ui', sel: '.bj-card-actions .btn:not([disabled])', pad: 3 },
            { kind: 'ui', sel: '.ch-stage-card .btn.big', pad: 3 },
          ]
        : [{ kind: 'ui', sel: '.hotbar .hot.big', pad: 2 }],
    mini: () => (prayStage.value ? 'สวดตามคำที่เรืองแสง หรือแตะตามจังหวะก็ได้ครับ สู้ ๆ!' : null),
    nav: () => (closeAll(), (panel.value = 'pray')),
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
    lines: [L('normal', 'อยากไปทำบุญที่อื่นบ้างไหมครับ? แตะ “แผนที่” ดูวัดดัง ตลาด และงานวัดทั่วไทยสิ')],
    targets: () => [hot('แผนที่')],
    nav: closeAll,
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
  decorate: {
    arm: 'point',
    lines: [L('happy', 'บ้านเราแต่งได้ตามใจนะครับ! ต้นไม้ในคลัง บอทน้อยให้ยืมก่อนนะ ลองวางดู แล้วกด “เสร็จ”')],
    // บ้าน → ดินสอ "จัดห้อง" → the loaner plant in the tray → "เสร็จ".
    targets: () => {
      if (mode.value === 'world') return [hot('บ้าน')]
      if (mode.value !== 'house') return []
      if (!document.querySelector('.house-edit-top')) return [{ kind: 'ui', sel: '.house-tools button[aria-label="จัดห้อง"]', pad: 3 }]
      return [
        ...((game.value.house.storage.plant_monstera ?? 0) > 0 ? [{ kind: 'ui', sel: '.edit-tray .tray-row .slot', pad: 3 } as Target] : []),
        { kind: 'ui', sel: '.house-edit-top .btn.green', pad: 3 },
      ]
    },
    aside: () => !!document.querySelector('.edit-bar'),
    nav: () => (closeAll(), goHome()),
    praise: 'ห้องสวยขึ้นเยอะเลยครับ!',
  },
  finish: {
    card: 'finish',
    arm: 'cheer',
    lines: [L('love', 'เรียนจบแล้ว! เก่งที่สุดในสามโลกเลยครับ'), L('happy', 'ต่อจากนี้ผมจะลอยอยู่ข้าง ๆ นะครับ แตะผมได้ทุกเมื่อ มีภารกิจให้ทำอีกเพียบ!')],
    targets: () => [],
  },
}
