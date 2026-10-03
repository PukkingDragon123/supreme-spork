// Bot Noi's sheet: tap him in the world (or "บอทน้อย" in the menu).
//   มีภารกิจอะไรไหม? → his quest chain (accept, progress, hand in)
//   สอนเล่นอีกครั้ง  → replay the tutorial
//   เคล็ดลับวันนี้    → a tip / merit-making fact
//   เล่นมุก          → a joke
// Also the "บอทน้อยมาแล้ว!" intro for players who started before him.

import { useEffect, useMemo, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { acceptQuest, actionableQuests, focusQuest, progressOf, stepIndex, turnInQuest, type GrantedReward } from '../../game/npcQuests'
import { BOTNOI_GIVER } from '../../game/data/npcQuests/botnoi'
import { NPC_QUESTS } from '../../game/data/npcQuests'
import type { NpcQuestDef } from '../../game/data/npcQuestTypes'
import { declineTutorial, nextRotating, pokeBot, setBotHidden, startTutorial, tutorialInput } from '../../game/botnoi'
import { openShopPopup } from '../popups/popupStore'
import { level } from '../../game/state'
import { PBtn, Stars } from '../components/kit'
import { Icon } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { PT, TONE_TEXT } from '../pixeltext'
import { RewardChips } from '../quest/QuestDialog'
import { navigateQuest } from '../quest/questUi'
import { sfx, haptic } from '../../engine/audio'
import { BotFace, useTyped } from './BotBubble'
import { botMenu, closeBotMenu, openBotMenu, type BotMenuView } from './botStore'
import { DAILY_TIPS, JOKES, POKES, type Line } from './botLines'
import { botSfx } from './botSfx'
import { closeAll } from './tutorialSteps'
import type { BotExpr } from '../../art/botnoi'

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

function greeting(): Line {
  const h = new Date().getHours()
  if (h < 11) return { t: 'อรุณสวัสดิ์ครับ! เช้านี้ทำบุญอะไรดี ปิ๊บ?', e: 'happy' }
  if (h < 17) return { t: 'สวัสดีตอนบ่ายครับ มีอะไรให้บอทน้อยช่วยไหม?', e: 'normal' }
  return { t: 'สวัสดีตอนค่ำครับ ดาวสวยจัง... มีอะไรให้ช่วยไหมครับ?', e: 'love' }
}

export function BotMenu() {
  const m = botMenu.value
  if (!m) return null
  return <Sheet key={m.n} view={m.view} />
}

function Sheet({ view: first }: { view: BotMenuView }) {
  const [view, setView] = useState<BotMenuView>(first)
  const [lines, setLines] = useState<Line[]>(() => initial(first))
  const [i, setI] = useState(0)
  const [reward, setReward] = useState<{ def: NpcQuestDef; got: GrantedReward } | null>(null)
  const line = lines[Math.min(i, lines.length - 1)]
  const typed = useTyped(line.t)
  const last = i >= lines.length - 1
  const ready = last && typed.done
  useEffect(() => {
    if (first === 'home') {
      const n = pokeBot()
      if (n > 3 && Math.random() < 0.35) setLines([pick(POKES)])
    }
  }, [])
  const go = (v: BotMenuView, ls?: Line[]) => {
    setView(v)
    setLines(ls ?? initial(v))
    setI(0)
  }
  const close = () => (sfx.close(), closeBotMenu())
  const tap = () => {
    if (!typed.done) return typed.finish()
    if (!last) (sfx.tap(), botSfx.talk(), setI(i + 1))
  }
  const s = game.value
  const qn = actionableQuests(BOTNOI_GIVER, s).filter((x) => x.status !== 'active').length
  const expr: BotExpr = (line.e as BotExpr) ?? 'happy'

  return (
    <div class="bn-sheet-back" onClick={(e) => e.target === e.currentTarget && ready && close()}>
      {reward && (
        <div class="bn-fx">
          <FxCanvas mode="coins" />
        </div>
      )}
      <div class={`bn-sheet ${reward ? 'win-glow' : ''}`} role="dialog" aria-label="บอทน้อย">
        <div class="bn-sheet-head">
          <span class="bn-sheet-face">
            <BotFace expr={expr} arm={view === 'joke' && last ? 'cheer' : view === 'quests' ? 'point' : 'wave'} talking={!typed.done} scale={2} />
          </span>
          <div class="grow">
            <PT text="บอทน้อย" size={13} weight={600} {...TONE_TEXT.ink} />
            <div class="bn-role">หุ่นยนต์ผู้ช่วยสายบุญ</div>
          </div>
          <button class="btn red icon-btn small" aria-label="ปิด" onClick={close}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <button class="bn-text" onClick={tap} aria-live="polite">
          <span class="bn-typed">{typed.shown}</span>
          <span class="bn-ghost" aria-hidden="true">
            {line.t}
          </span>
          {typed.done && !last && <span class="bn-more">▼</span>}
        </button>

        {view === 'quests' && ready && (
          <BotQuestList
            onReward={(def, got) => {
              setReward({ def, got })
              go('quests', [{ t: def.done, e: 'love' }])
            }}
          />
        )}
        {reward && view === 'quests' && ready && (
          <div class="bn-burst panel gold">
            <PT text="บอทน้อยให้ของขวัญ!" size={15} weight={600} {...TONE_TEXT.gold} />
            <div class="small">{reward.def.title}</div>
            <RewardChips r={{ coins: reward.got.coins, merit: reward.got.merit, items: reward.got.items, outfits: reward.got.outfits, pets: reward.got.pets, collectibles: reward.got.collectibles }} />
          </div>
        )}

        {ready && (
          <div class="bn-choices">
            {view === 'home' && (
              <>
                <PBtn tone="gold" icon="scroll" onClick={() => go('quests')}>
                  {`มีภารกิจอะไรไหม?${qn ? ` (${qn})` : ''}`}
                </PBtn>
                {s.botnoi.tut === 'paused' ? (
                  <PBtn tone="green" size="small" icon="book" onClick={() => (closeBotMenu(), tutorialInput({ kind: 'resume' }))}>
                    สอนต่อ
                  </PBtn>
                ) : (
                  <PBtn tone="green" size="small" icon="book" onClick={() => go('replay')}>
                    สอนเล่นอีกครั้ง
                  </PBtn>
                )}
                <PBtn tone="gold" size="small" icon="shop" onClick={() => (closeBotMenu(), openShopPopup())}>
                  ร้านค้าด่วน
                </PBtn>
                <PBtn tone="blue" size="small" icon="sparkle" onClick={() => go('tip')}>
                  เคล็ดลับวันนี้
                </PBtn>
                <PBtn tone="pink" size="small" icon="heart" onClick={() => go('joke')}>
                  เล่นมุก
                </PBtn>
                <PBtn tone="paper" size="small" onClick={() => (setBotHidden(!s.botnoi.hidden), close())}>
                  {s.botnoi.hidden ? 'ออกมาลอยข้าง ๆ หน่อย' : 'ไปพักก่อนนะ'}
                </PBtn>
              </>
            )}
            {view === 'tip' && (
              <>
                <PBtn tone="blue" size="small" icon="sparkle" onClick={() => go('tip')}>
                  อีกข้อ!
                </PBtn>
                <PBtn tone="paper" size="small" onClick={() => go('home')}>
                  กลับ
                </PBtn>
              </>
            )}
            {view === 'joke' && (
              <>
                <PBtn tone="pink" size="small" icon="heart" onClick={() => (botSfx.chirp(), go('joke'))}>
                  ขำ ๆ เอาอีก
                </PBtn>
                <PBtn tone="paper" size="small" onClick={() => go('home')}>
                  กลับ
                </PBtn>
              </>
            )}
            {view === 'replay' && (
              <>
                <PBtn
                  tone="green"
                  icon="check"
                  onClick={() => {
                    closeBotMenu()
                    closeAll()
                    botSfx.beep()
                    startTutorial(true)
                  }}
                >
                  เริ่มเลย!
                </PBtn>
                <PBtn tone="paper" size="small" onClick={() => go('home')}>
                  ไว้ก่อน
                </PBtn>
              </>
            )}
            {view === 'hello' && (
              <>
                <PBtn
                  tone="green"
                  icon="book"
                  onClick={() => {
                    closeBotMenu()
                    closeAll()
                    startTutorial(false)
                  }}
                >
                  สอนเล่นหน่อย!
                </PBtn>
                <PBtn tone="paper" size="small" onClick={() => (declineTutorial(), go('home', [{ t: 'ได้เลยครับ! อยากเรียนเมื่อไหร่ แตะผมแล้วเลือก “สอนเล่นอีกครั้ง” นะ', e: 'wink' }]))}>
                  เล่นเป็นแล้ว ขอบใจนะ
                </PBtn>
              </>
            )}
            {view === 'quests' && (
              <PBtn tone="paper" size="small" onClick={() => (setReward(null), go('home'))}>
                กลับ
              </PBtn>
            )}
          </div>
        )}
        {!ready && <div class="bn-hint">แตะที่คำพูดเพื่อไปต่อ</div>}
      </div>
    </div>
  )
}

function initial(v: BotMenuView): Line[] {
  switch (v) {
    case 'quests': {
      const list = actionableQuests(BOTNOI_GIVER)
      if (list.some((x) => x.status === 'ready')) return [{ t: 'ภารกิจเสร็จแล้วครับ! กดรับรางวัลได้เลย ปิ๊บ ๆ', e: 'love' }]
      if (list.some((x) => x.status === 'available')) return [{ t: 'มีครับ! ภารกิจบอทน้อยช่วยสอนระบบใหม่ ๆ ได้เหรียญด้วยนะ', e: 'happy' }]
      if (list.length) return [{ t: 'ภารกิจที่รับไว้ยังไม่เสร็จนะครับ สู้ ๆ! กด “นำทาง” ได้เลย', e: 'normal' }]
      const f = focusQuest(BOTNOI_GIVER)
      if (f?.status === 'level') return [{ t: `ภารกิจต่อไปเปิดที่เลเวล ${f.def.level} ครับ (ตอนนี้เลเวล ${level.value.level}) สวดมนต์ทำบุญเก็บเลเวลกันนะ`, e: 'think' }]
      const done = NPC_QUESTS.filter((q) => q.giver === BOTNOI_GIVER && q.repeat === 'daily')
      return [{ t: done.length ? 'วันนี้ทำภารกิจครบแล้วครับ เก่งมาก! พรุ่งนี้มีภารกิจรายวันใหม่นะ' : 'ตอนนี้ยังไม่มีภารกิจครับ', e: 'love' }]
    }
    case 'tip':
      return [DAILY_TIPS[nextRotating('tip', DAILY_TIPS.length)]]
    case 'joke':
      return JOKES[nextRotating('joke', JOKES.length)]
    case 'replay':
      return [{ t: 'อยากทบทวนบทเรียนอีกรอบเหรอครับ? ผมพาเดินทีละขั้นเหมือนเดิมเลย', e: 'happy' }]
    case 'hello':
      return [
        { t: 'สวัสดีครับ! ผมชื่อ “บอทน้อย” หุ่นยนต์ผู้ช่วยสายบุญ เพิ่งย้ายมาอยู่วัดนี้ ปิ๊บ!', e: 'happy' },
        { t: 'จากนี้ผมจะลอยตามข้าง ๆ คอยให้คำแนะนำ แจกภารกิจ แถมเล่นมุกให้ฟังด้วย', e: 'love' },
        { t: 'อยากให้ผมสอนเล่นแบบทีละขั้นไหมครับ? เรียนจบมีรางวัลนะ!', e: 'normal' },
      ]
    default:
      return [greeting()]
  }
}

/** Bot Noi's actionable quests with accept / hand-in / นำทาง. */
function BotQuestList({ onReward }: { onReward: (def: NpcQuestDef, got: GrantedReward) => void }) {
  void game.value
  const list = useMemo(() => actionableQuests(BOTNOI_GIVER), [game.value])
  if (!list.length) return null
  return (
    <div class="bn-quests">
      {list.map(({ def, status }) => {
        const prog = progressOf(def.id)
        const cur = prog ? stepIndex(def, prog) : -1
        return (
          <div key={def.id} class={`panel bn-quest ${status}`}>
            <div class="bn-quest-head">
              <span class={`qd-mark ${status === 'active' ? 'active' : ''}`}>{status === 'ready' ? '?' : '!'}</span>
              <b class="grow">{def.title}</b>
              {def.repeat === 'daily' && <span class="chip blue small">รายวัน</span>}
              <Stars n={def.stars ?? 1} size={12} />
            </div>
            <ol class="qd-steps">
              {def.steps.map((st, k) => {
                const n = prog?.p[k] ?? 0
                const done = !!prog && n >= st.target
                return (
                  <li key={k} class={`${done ? 'done' : ''} ${k === cur ? 'now' : ''}`}>
                    <span class="qd-tick">{done ? <Icon name="check" size={14} /> : <i>{k + 1}</i>}</span>
                    <span class="grow">{st.text}</span>
                    {st.target > 1 && prog && <span class="num qd-count">{`${Math.min(n, st.target)}/${st.target}`}</span>}
                  </li>
                )
              })}
            </ol>
            <RewardChips r={def.reward} compact />
            <div class="row bn-quest-acts">
              {status === 'available' && (
                <PBtn
                  tone="green"
                  size="small"
                  icon="check"
                  onClick={() => {
                    if (acceptQuest(def.id)) (sfx.chime(), botSfx.beep(), haptic(20))
                  }}
                >
                  {def.replies?.accept ?? 'รับภารกิจ!'}
                </PBtn>
              )}
              {status === 'ready' && (
                <PBtn
                  tone="gold"
                  size="small"
                  icon="gift"
                  onClick={() => {
                    const got = turnInQuest(def.id, { silent: true })
                    if (!got) return
                    sfx.coins(8)
                    botSfx.done()
                    haptic(40)
                    onReward(def, got)
                  }}
                >
                  รับรางวัล!
                </PBtn>
              )}
              {status === 'active' && (
                <PBtn tone="green" size="small" icon="map" onClick={() => (sfx.whoosh(), closeBotMenu(), navigateQuest(def.id))}>
                  นำทาง
                </PBtn>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Open Bot Noi on his quest page (quest log "นำทาง", tracker pill). */
export function openBotQuests() {
  openBotMenu('quests')
}
