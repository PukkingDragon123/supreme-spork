// Quest-giver conversation: a bottom sheet with the NPC's portrait, typed
// speech bubbles, 2-3 reply choices (รับ / เล่าให้ฟังหน่อย / ไว้ก่อน), quest
// details with a reward preview and difficulty stars, and the turn-in
// celebration. Mounted once by <QuestHost/> (App.tsx).

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { game, level } from '../../game/state'
import {
  acceptQuest,
  abandonQuest,
  actionableQuests,
  focusQuest,
  progressOf,
  questById,
  questStatus,
  stepIndex,
  talkTo,
  turnInQuest,
  activeQuests,
  type GrantedReward,
  type QuestStatus,
} from '../../game/npcQuests'
import type { NpcQuestDef, NpcQuestReward } from '../../game/data/npcQuestTypes'
import { ITEM_BY_ID } from '../../game/data/items'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { PET_BY_ID } from '../../game/data/pets'
import { dollSprite, type DollPose } from '../../art/doll'
import { monkSprite } from '../../art/characters'
import { petIcon } from '../../art/pets'
import { spriteDataUrl, type Sprite } from '../../engine/sprite'
import { createCanvas } from '../../engine/pixel'
import { sfx, haptic } from '../../engine/audio'
import { Icon } from '../components/common'
import { PBtn, Stars } from '../components/kit'
import { FxCanvas } from '../components/FxCanvas'
import { PT, TONE_TEXT } from '../pixeltext'
import { thumbFor } from '../DressUp'
import { mapId, mode } from '../store'
import { closeQuestDialog, giverInfo, navigateQuest, questDialog, resumeNav, type GiverInfo } from './questUi'
import './quest.css'

// ---------------------------------------------------------------------------
// Host: dialog + finishing navigation after a map change

export function QuestHost() {
  const m = mapId.value
  const md = mode.value
  useEffect(() => {
    resumeNav()
  }, [m, md])
  const d = questDialog.value
  return d ? <Dialog key={d.n} giver={d.giver} focus={d.quest} /> : null
}

// ---------------------------------------------------------------------------
// Portraits

function crop(s: Sprite, h: number): Sprite {
  const c = createCanvas(s.w, h)
  c.getContext('2d')!.drawImage(s.canvas, 0, 0, s.w, h, 0, 0, s.w, h)
  return { canvas: c, w: s.w, h }
}

function portraitUrl(who: GiverInfo, pose: DollPose): string {
  if (who.kind !== 'person') {
    const s = monkSprite('front', pose === 'wai' || pose === 'happy' ? 'bless' : 'stand', { novice: who.kind === 'novice', skin: who.skin })
    return spriteDataUrl(crop(s, 19), 5)
  }
  return spriteDataUrl(crop(dollSprite(who.look, pose, { blink: false }), 36), 3)
}

// ---------------------------------------------------------------------------
// Typed speech

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new (Intl as unknown as { Segmenter: new (l: string, o: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter('th', { granularity: 'grapheme' }) : null
const graphemes = (s: string) => (seg ? [...seg.segment(s)].map((x) => x.segment) : Array.from(s))

function useTyped(key: string, text: string) {
  const parts = useMemo(() => graphemes(text), [key])
  const [n, setN] = useState(0)
  const pos = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  useEffect(() => {
    pos.current = game.value.settings.reduceMotion ? parts.length : 0
    setN(pos.current)
    if (pos.current >= parts.length) return
    timer.current = setInterval(() => {
      pos.current = Math.min(parts.length, pos.current + 1)
      setN(pos.current)
      if (pos.current % 4 === 1) sfx.click()
      if (pos.current >= parts.length) clearInterval(timer.current)
    }, 28)
    return () => clearInterval(timer.current)
  }, [parts])
  const finish = () => {
    clearInterval(timer.current)
    pos.current = parts.length
    setN(parts.length)
  }
  return { shown: parts.slice(0, n).join(''), done: n >= parts.length, finish }
}

// ---------------------------------------------------------------------------
// Views

type View =
  | { kind: 'menu' }
  | { kind: 'offer'; id: string; lore?: boolean; loreSeen?: boolean }
  | { kind: 'accepted'; id: string }
  | { kind: 'progress'; id: string }
  | { kind: 'ready'; id: string }
  | { kind: 'reward'; id: string; got: GrantedReward; next: string | null }
  | { kind: 'locked'; id: string }
  | { kind: 'declined' }
  | { kind: 'chat' }

interface Choice {
  label: string
  icon?: string
  tone?: 'green' | 'gold' | 'paper' | 'blue' | 'red' | 'pink'
  run: () => void
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

function firstView(giver: string, focus?: string): View {
  const f = focus ? questById(focus) : null
  if (f) {
    const st = questStatus(f)
    if (st === 'ready') return { kind: 'ready', id: f.id }
    if (st === 'available') return { kind: 'offer', id: f.id }
    if (st === 'active') return { kind: 'progress', id: f.id }
    if (st === 'level') return { kind: 'locked', id: f.id }
  }
  const list = actionableQuests(giver)
  if (list.length > 1) return { kind: 'menu' }
  if (list.length === 1) return viewFor(list[0].def.id, list[0].status)
  const fq = focusQuest(giver)
  if (fq?.status === 'level') return { kind: 'locked', id: fq.def.id }
  return { kind: 'chat' }
}

function viewFor(id: string, st: QuestStatus): View {
  if (st === 'ready') return { kind: 'ready', id }
  if (st === 'active') return { kind: 'progress', id }
  if (st === 'level') return { kind: 'locked', id }
  return { kind: 'offer', id }
}

function Dialog({ giver, focus }: { giver: string; focus?: string }) {
  const who = useMemo(() => giverInfo(giver), [giver])
  // Deliveries: what this NPC says when your current step was "talk to me".
  const [greet] = useState<string[]>(() => {
    const lines: string[] = []
    for (const a of activeQuests()) {
      const st = a.def.steps[stepIndex(a.def, a.prog)]
      if (st?.event === 'npc_talk' && st.npc === giver) lines.push(st.say ?? 'ขอบใจมากนะ! ได้รับแล้วจ้า')
    }
    return lines
  })
  // Record the conversation once (completes delivery steps, counts npc_talk).
  useEffect(() => {
    talkTo(giver)
    if (greet.length) sfx.chime()
  }, [])
  const [view, setView] = useState<View>(() => firstView(giver, focus))
  const [line, setLine] = useState(0)
  const [pose, setPose] = useState<DollPose>('wave')
  const close = () => {
    sfx.close()
    closeQuestDialog()
  }
  const go = (v: View) => {
    setLine(0)
    setView(v)
  }

  const first = useRef(view)
  const def = 'id' in view ? questById(view.id) : null
  const lines = useMemo(() => linesFor(view, def, who, view === first.current ? greet : []), [view])
  const text = lines[Math.min(line, lines.length - 1)] ?? ''
  const typed = useTyped(`${view.kind}:${'id' in view ? view.id : ''}:${line}:${text}`, text)
  const last = line >= lines.length - 1
  const showChoices = last && typed.done

  useEffect(() => {
    setPose(view.kind === 'reward' || view.kind === 'ready' ? 'happy' : view.kind === 'accepted' ? 'wai' : view.kind === 'offer' && view.lore ? 'think' : view.kind === 'progress' || view.kind === 'locked' ? 'think' : 'wave')
    const t = setTimeout(() => setPose((p) => (p === 'wave' ? 'stand' : p)), 900)
    return () => clearTimeout(t)
  }, [view])

  const tapBubble = () => {
    if (!typed.done) return typed.finish()
    if (!last) {
      sfx.tap()
      setLine((l) => l + 1)
    }
  }

  const choices = choicesFor(view, def, giver, who, go, close)
  const card = def && (view.kind === 'offer' || view.kind === 'accepted' || view.kind === 'progress' || view.kind === 'ready' || view.kind === 'locked') ? def : null
  const portrait = useMemo(() => portraitUrl(who, pose), [who, pose])

  return (
    <div class="qd-backdrop" onClick={(e) => e.target === e.currentTarget && showChoices && close()}>
      {view.kind === 'reward' && (
        <div class="qd-fx">
          <FxCanvas mode="coins" />
        </div>
      )}
      <div class={`qd-sheet ${view.kind === 'reward' ? 'win-glow' : ''}`} role="dialog" aria-label={`คุยกับ${who.name}`}>
        <div class="qd-head">
          <span class={`qd-portrait ${who.kind !== 'person' ? 'monk' : ''} pose-${pose}`}>
            <img class="px" src={portrait} alt={who.name} draggable={false} />
          </span>
          <div class="qd-name">
            <PT text={who.name} size={13} weight={600} {...TONE_TEXT.wood} />
            <span class="qd-role">{who.role}</span>
          </div>
          <button class="btn red icon-btn small qd-x" aria-label="ปิด" onClick={close}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <button class="qd-bubble" onClick={tapBubble} aria-live="polite">
          <span class="qd-text">{typed.shown}</span>
          <span class="qd-ghost" aria-hidden="true">
            {text}
          </span>
          {typed.done && !last && <span class="qd-more">▼</span>}
          {lines.length > 1 && (
            <span class="qd-dots" aria-hidden="true">
              {lines.map((_, i) => (
                <i key={i} class={i <= line ? 'on' : ''} />
              ))}
            </span>
          )}
        </button>

        {view.kind === 'menu' && showChoices && <QuestMenu giver={giver} onPick={(id, st) => go(viewFor(id, st))} />}
        {card && (showChoices || view.kind !== 'offer') && <QuestCard def={card} view={view.kind} />}
        {view.kind === 'reward' && showChoices && <RewardBurst got={view.got} def={def!} />}

        {showChoices && (
          <div class="qd-choices">
            {choices.map((c, i) => (
              <PBtn key={c.label} tone={c.tone ?? (i === 0 ? 'green' : 'paper')} icon={c.icon} size={i === 0 ? undefined : 'small'} class="qd-choice" style={{ animationDelay: `${i * 60}ms` }} onClick={c.run}>
                {c.label}
              </PBtn>
            ))}
          </div>
        )}
        {!showChoices && <div class="qd-hint">แตะที่คำพูดเพื่อไปต่อ</div>}
      </div>
    </div>
  )
}

function linesFor(view: View, def: NpcQuestDef | null | undefined, who: GiverInfo, greet: string[]): string[] {
  const out = [...greet]
  switch (view.kind) {
    case 'menu':
      out.push(pick(['มาแล้วเหรอ! มีเรื่องอยากให้ช่วยอยู่พอดีเลย', 'ว่าไงจ๊ะ วันนี้มีงานให้ช่วยหลายอย่างเลยนะ', 'ดีใจที่แวะมานะ เลือกเรื่องที่อยากช่วยได้เลย']))
      break
    case 'offer':
      if (view.lore) out.push(...(def?.lore ?? []))
      else out.push(...(def?.intro ?? []))
      break
    case 'accepted':
      out.push(def?.accepted ?? pick(['ขอบใจมากนะ! ทำเสร็จแล้วกลับมาหาที่นี่นะ', 'เยี่ยมเลย! ฝากด้วยนะ รอข่าวดีอยู่ตรงนี้', 'ไปได้เลย! ถ้าหลงทางกด "นำทาง" ในสมุดเควสต์นะ']))
      break
    case 'progress': {
      const prog = def ? progressOf(def.id) : null
      const st = def && prog ? def.steps[stepIndex(def, prog)] : null
      out.push(def?.waiting ?? (st ? `ว่าไง... "${st.text}" ได้หรือยังเอ่ย?` : 'ใกล้เสร็จแล้ว สู้ ๆ นะ'))
      break
    }
    case 'ready':
      out.push(def?.done ?? 'เก่งมาก! ขอบใจนะ')
      break
    case 'reward':
      out.push(view.next ? 'ว่าแต่... ยังมีอีกเรื่องอยากให้ช่วยนะ ฟังไหม?' : pick(['อนุโมทนาบุญด้วยนะ! แวะมาคุยกันอีกนะ', 'ขอบคุณจากใจเลย ไว้เจอกันใหม่นะ', 'สาธุ~ ขอให้บุญรักษานะ']))
      break
    case 'locked':
      out.push(`เรื่องนี้ยากไปหน่อยนะ... ไว้ถึงเลเวล ${def?.level ?? 1} แล้วมาหา${who.name}ใหม่นะ (ตอนนี้เลเวล ${level.value.level})`)
      break
    case 'declined':
      out.push(pick(['ไม่เป็นไรเลย ว่างแล้วค่อยมานะ', 'โอเค ไว้คราวหน้านะ ไม่หนีไปไหนหรอก', 'จ้า ไว้พร้อมแล้วมาหากันใหม่นะ']))
      break
    case 'chat':
      out.push(pick(who.lines))
      break
  }
  return out.length ? out : ['...']
}

function choicesFor(view: View, def: NpcQuestDef | null | undefined, giver: string, who: GiverInfo, go: (v: View) => void, close: () => void): Choice[] {
  switch (view.kind) {
    case 'menu':
      return [{ label: 'ไว้ก่อนนะ', icon: 'close', tone: 'paper', run: close }]
    case 'offer': {
      if (!def) return []
      const accept: Choice = {
        label: def.replies?.accept ?? 'รับเควสต์เลย!',
        icon: 'check',
        tone: 'green',
        run: () => {
          if (acceptQuest(def.id)) {
            sfx.chime()
            haptic(20)
            go({ kind: 'accepted', id: def.id })
          }
        },
      }
      const out = [accept]
      if (def.lore?.length && !view.lore && !view.loreSeen) out.push({ label: 'เล่าให้ฟังหน่อย', icon: 'book', tone: 'blue', run: () => go({ kind: 'offer', id: def.id, lore: true, loreSeen: true }) })
      if (view.lore) out.push({ label: 'ฟังเรื่องงานอีกที', icon: 'scroll', tone: 'paper', run: () => go({ kind: 'offer', id: def.id, loreSeen: true }) })
      out.push({ label: def.replies?.decline ?? 'ไว้ก่อนนะ', icon: 'close', tone: 'paper', run: () => go({ kind: 'declined' }) })
      return out
    }
    case 'accepted':
      return [
        { label: 'นำทางไปเลย', icon: 'map', tone: 'green', run: () => (sfx.whoosh(), navigateQuest(def!.id)) },
        { label: 'ไปกันเลย!', icon: 'check', tone: 'paper', run: close },
      ]
    case 'progress':
      return [
        { label: 'นำทาง', icon: 'map', tone: 'green', run: () => (sfx.whoosh(), navigateQuest(def!.id)) },
        { label: 'เดี๋ยวจัดให้!', icon: 'check', tone: 'paper', run: close },
        {
          label: 'ขอยกเลิกเควสต์นี้',
          icon: 'trash',
          tone: 'paper',
          run: () => {
            abandonQuest(def!.id)
            go({ kind: 'declined' })
          },
        },
      ]
    case 'ready':
      return [
        {
          label: 'รับรางวัล!',
          icon: 'gift',
          tone: 'gold',
          run: () => {
            const got = turnInQuest(def!.id, { silent: true })
            if (!got) return
            sfx.coins(8)
            setTimeout(() => sfx.levelUp(), 250)
            haptic(40)
            const next = actionableQuests(giver).find((x) => x.status === 'available' || x.status === 'ready')
            go({ kind: 'reward', id: def!.id, got, next: next?.def.id ?? null })
          },
        },
      ]
    case 'reward': {
      const next = view.next
      if (next) {
        const nd = questById(next)!
        return [
          { label: 'ฟังสิ มีอะไรเหรอ', icon: 'scroll', tone: 'green', run: () => go(viewFor(next, questStatus(nd))) },
          { label: 'ไว้คราวหน้านะ', icon: 'close', tone: 'paper', run: close },
        ]
      }
      return [{ label: 'สาธุ~', icon: 'wai', tone: 'green', run: close }]
    }
    case 'locked':
      return [{ label: 'ได้เลย ไว้มาใหม่!', icon: 'check', tone: 'green', run: close }]
    case 'declined':
      return [{ label: 'ลาก่อน~', icon: 'wai', tone: 'paper', run: close }]
    case 'chat': {
      const out: Choice[] = [{ label: pick(['สาธุ~', 'จ้า ขอบคุณนะ', 'ไว้เจอกันใหม่!']), icon: 'wai', tone: 'green', run: close }]
      if (focusQuest(giver)?.status === 'level') out.push({ label: 'มีงานให้ช่วยไหม?', icon: 'scroll', tone: 'paper', run: () => go({ kind: 'locked', id: focusQuest(giver)!.def.id }) })
      void who
      return out
    }
  }
}

// ---------------------------------------------------------------------------
// Pieces

function QuestMenu({ giver, onPick }: { giver: string; onPick: (id: string, st: QuestStatus) => void }) {
  const list = actionableQuests(giver)
  return (
    <div class="qd-menu">
      {list.map(({ def, status }) => (
        <button
          key={def.id}
          class={`qd-menu-item panel ${status}`}
          onClick={() => {
            sfx.tap()
            onPick(def.id, status)
          }}
        >
          <span class={`qd-mark ${status}`}>{status === 'ready' ? '?' : '!'}</span>
          <span class="grow">
            <b>{def.title}</b>
            <span class="qd-sub">{status === 'ready' ? 'พร้อมส่งแล้ว!' : status === 'active' ? 'กำลังทำอยู่' : def.repeat === 'daily' ? 'เควสต์รายวัน' : 'เควสต์ใหม่'}</span>
          </span>
          <Stars n={def.stars ?? 1} size={14} />
        </button>
      ))}
    </div>
  )
}

export function RewardChips({ r, compact, noCoins }: { r: NpcQuestReward; compact?: boolean; noCoins?: boolean }) {
  const look = game.value.player.look
  return (
    <div class={`qd-rewards ${compact ? 'compact' : ''}`}>
      {!noCoins && (
        <span class="qd-chip gold">
          <Icon name="coin" size={16} /> <b class="num">+{r.coins}</b>
        </span>
      )}
      {!!r.merit && (
        <span class="qd-chip pink">
          <Icon name="merit" size={16} /> <b class="num">+{r.merit}</b>
        </span>
      )}
      {Object.entries(r.items ?? {}).map(([id, n]) => (
        <span class="qd-chip" key={id} title={ITEM_BY_ID[id]?.name}>
          <Icon name={ITEM_BY_ID[id]?.icon ?? 'gift'} size={16} /> {!compact && <span class="qd-chip-name">{ITEM_BY_ID[id]?.name ?? id}</span>} <b class="num">x{n}</b>
        </span>
      ))}
      {(r.outfits ?? []).map((o) => {
        const it = OUTFIT_BY_ID[o]
        if (!it) return null
        return (
          <span class="qd-chip rare" key={o} title={it.name}>
            <img class="px qd-thumb" src={thumbFor({ ...look, [it.slot]: o }, it.slot)} alt="" />
            {!compact && <span class="qd-chip-name">{it.name}</span>}
          </span>
        )
      })}
      {(r.pets ?? []).map((p) => (
        <span class="qd-chip rare" key={p} title={PET_BY_ID[p]?.name}>
          <img class="px qd-thumb" src={spriteDataUrl(petIcon(p), 1)} alt="" />
          {!compact && <span class="qd-chip-name">น้อง{PET_BY_ID[p]?.name}</span>}
        </span>
      ))}
      {Object.entries(r.collectibles ?? {}).map(([id, n]) => (
        <span class="qd-chip rare" key={id}>
          <Icon name="star" size={16} /> {!compact && <span class="qd-chip-name">ของสะสม</span>} <b class="num">x{n}</b>
        </span>
      ))}
    </div>
  )
}

function QuestCard({ def, view }: { def: NpcQuestDef; view: View['kind'] }) {
  const prog = progressOf(def.id)
  const cur = prog ? stepIndex(def, prog) : -1
  return (
    <div class={`qd-card panel ${view === 'ready' ? 'gold' : ''}`}>
      <div class="qd-card-head">
        <Icon name="scroll" size={20} />
        <b class="grow qd-title">{def.title}</b>
        {def.repeat === 'daily' && <span class="chip blue small">รายวัน</span>}
        <Stars n={def.stars ?? 1} size={14} />
      </div>
      <ol class="qd-steps">
        {def.steps.map((st, i) => {
          const n = prog?.p[i] ?? 0
          const done = !!prog && n >= st.target
          const now = i === cur
          return (
            <li key={i} class={`${done ? 'done' : ''} ${now ? 'now' : ''}`}>
              <span class="qd-tick">{done ? <Icon name="check" size={14} /> : <i>{i + 1}</i>}</span>
              <span class="grow">{st.text}</span>
              {st.target > 1 && prog && <span class="num qd-count">{st.event === 'meditate_sec' ? `${Math.floor(n)}/${st.target}วิ` : `${Math.min(n, st.target)}/${st.target}`}</span>}
            </li>
          )
        })}
      </ol>
      <div class="qd-reward-label">รางวัล</div>
      <RewardChips r={def.reward} />
    </div>
  )
}

function RewardBurst({ got, def }: { got: GrantedReward; def: NpcQuestDef }) {
  const [n, setN] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    const total = got.coins
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900)
      const v = Math.round(total * (1 - Math.pow(1 - k, 3)))
      if (v !== ref.current) {
        ref.current = v
        setN(v)
      }
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [got])
  const r: NpcQuestReward = { coins: got.coins, merit: got.merit, items: got.items, outfits: got.outfits, pets: got.pets, collectibles: got.collectibles }
  return (
    <div class="qd-burst panel gold">
      <div class="qd-burst-title">
        <PT text="เควสต์สำเร็จ!" size={16} weight={600} {...TONE_TEXT.gold} />
      </div>
      <div class="qd-burst-sub">{def.title}</div>
      <div class="qd-burst-coins">
        <Icon name="coin" size={32} />
        <PT text={`+${n}`} size={22} weight={600} {...TONE_TEXT.gold} />
      </div>
      <RewardChips r={r} noCoins />
      {got.dupeCoins > 0 && <div class="qd-sub center">มีของชิ้นนี้แล้ว เลยได้เป็นเหรียญแทน +{got.dupeCoins}</div>}
    </div>
  )
}
