// Live event hub (panel 'event'): big banner with the season countdown,
// tickets and the "เล่นเลย" button, then tabs for daily missions, the battle
// pass and the rules. Event agnostic: the banner art and the mini-game are
// looked up per event id.

import type { FunctionComponent } from 'preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { signal } from '@preact/signals'
import { game, level } from '../../game/state'
import { meritForLevel } from '../../game/economy'
import {
  buyPremium,
  buyTicket,
  claimAll,
  claimDailyTicket,
  claimMission,
  claimTier,
  claimableCount,
  dailyTicketReady,
  ensureEvent,
  eventDef,
  eventProgress,
  eventSeason,
  isEventUnlocked,
  startRun,
  ticketBuyLeft,
} from '../../game/liveEvents'
import { claimable } from '../../game/battlepass'
import { missionReady } from '../../game/events/missions'
import { fmtClock, fmtCountdown, msToMidnight } from '../../game/events/season'
import { rewardLabel } from '../../game/events/rewards'
import type { EventReward } from '../../game/events/types'
import { toast } from '../../game/events'
import { floodBanner } from '../../art/flood'
import { spriteDataUrl } from '../../engine/sprite'
import { haptic, sfx } from '../../engine/audio'
import { openPanel, coinStoreOpen } from '../store'
import { Bar, Coin, Icon, useTicker } from '../components/common'
import { PBtn, Tabs, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { FloodRun } from '../../activities/flood/FloodRun'
import { EventPass } from './EventPass'
import { EvIcon, RewardIcon, RewardReveal, type Revealed } from './EventParts'
import './Event.css'

export type HubTab = 'missions' | 'pass' | 'rules'

/** Which event the hub shows, its tab, and the running mini-game (a key per run). */
export const eventUi = signal<{ id: string; tab: HubTab; run: number | null }>({ id: 'flood', tab: 'missions', run: null })

export function openEvent(id = 'flood', tab?: HubTab) {
  eventUi.value = { id, tab: tab ?? (claimable(eventProgress(id), eventDef(id)!.pass).length ? 'pass' : eventUi.value.tab), run: null }
  openPanel('event')
}

interface RunProps {
  eventId: string
  onExit: (claim?: boolean) => void
  onAgain: () => void
}

/** Mini-game per event id. */
const RUNNERS: Record<string, FunctionComponent<RunProps>> = { flood: FloodRun }
/** Banner art per event id. */
const BANNERS: Record<string, () => HTMLCanvasElement> = { flood: () => floodBanner(160, 72) }

function tryPlay(id: string): boolean {
  if (!startRun(id)) {
    sfx.error()
    if (isEventUnlocked(id)) eventUi.value = { ...eventUi.value, run: null, tab: 'missions' }
    toast(isEventUnlocked(id) ? 'ตั๋วหมดแล้ว รับเพิ่มจากภารกิจอีเวนต์ได้นะ' : `ปลดล็อกที่ Lv.${eventDef(id)?.level ?? 10}`, 'lock', 'warn')
    return false
  }
  sfx.open()
  eventUi.value = { ...eventUi.value, run: Date.now() }
  return true
}

/** Panel root: the hub, or the event's mini-game while a run is going. */
export function EventPanel() {
  const ui = eventUi.value
  const def = eventDef(ui.id)
  useEffect(() => {
    ensureEvent(ui.id)
  }, [ui.id])
  if (!def) return null
  const Run = RUNNERS[def.id]
  if (ui.run != null && Run)
    return (
      <Run
        key={ui.run}
        eventId={def.id}
        onExit={(claim) => (eventUi.value = { ...eventUi.value, run: null, tab: claim ? 'pass' : eventUi.value.tab })}
        onAgain={() => tryPlay(def.id)}
      />
    )
  return <EventHub />
}

function Banner({ id, locked }: { id: string; locked: boolean }) {
  useTicker(30_000)
  const def = eventDef(id)!
  const season = eventSeason(id)
  const url = useMemo(() => {
    const c = (BANNERS[id] ?? BANNERS.flood)()
    return spriteDataUrl({ canvas: c, w: c.width, h: c.height }, 3)
  }, [id])
  return (
    <div class={`ev-banner ${locked ? 'locked' : ''}`}>
      <img class="px ev-banner-img" src={url} alt="" draggable={false} />
      <span class="ev-rain" />
      <span class="ev-flash" />
      <div class="ev-banner-title">
        <PT text={def.name} size={15} weight={600} color="#fffaf0" outline="#16324a" />
        <span class="ev-banner-tag" hidden={locked}>
          <PT text={`ซีซัน ${season.index + 1}`} size={12} weight={600} color="#5a3410" scale={1} />
        </span>
      </div>
      <div class="ev-banner-time" hidden={locked}>
        <Icon name="calendar" size={14} />
        <PT text={`เหลือ ${fmtCountdown(season.msLeft)}`} size={13} weight={600} color="#fff6dc" shadow="#16324a" scale={1} />
      </div>
      {locked && (
        <div class="ev-banner-lock">
          <Icon name="lock" size={30} />
          <PT text={`ปลดล็อกที่ Lv.${def.level}`} size={12} weight={600} color="#fffaf0" outline="#16324a" />
        </div>
      )}
    </div>
  )
}

function LockedHub({ id }: { id: string }) {
  const def = eventDef(id)!
  const lv = level.value.level
  const need = meritForLevel(def.level)
  const have = game.value.merit
  const highlights = def.pass.tiers.filter((t) => t.big).flatMap((t) => [...t.free, ...t.premium].filter((r) => r.kind === 'outfit' || r.kind === 'pet'))
  return (
    <div class="ev-hub">
      <Banner id={id} locked />
      <div class="panel ev-locked">
        <PT text={`ปลดล็อกที่ Lv.${def.level}`} size={14} weight={600} {...TONE_TEXT.ink} />
        <p class="small muted">ตอนนี้ Lv.{lv} · สวดมนต์ ตักบาตร และทำงานอาสาในวัดเพื่อเก็บบุญ แล้วมาเป็นฮีโร่กู้ภัยกัน!</p>
        <Bar value={have} max={need} tone="green" label="บุญสู่ Lv.10" />
        <div class="small num">
          บุญ {have.toLocaleString('th-TH')}/{need.toLocaleString('th-TH')}
        </div>
      </div>
      <div class="ev-subhead">
        <Icon name="gift" size={18} />
        <PT text="ของรางวัลในอีเวนต์นี้" size={12} weight={600} {...TONE_TEXT.ink} />
      </div>
      <div class="ev-teaser">
        {highlights.map((r, i) => (
          <span class="ev-teaser-item" key={i}>
            <RewardIcon r={r} size={30} />
          </span>
        ))}
      </div>
      <Rules id={id} />
    </div>
  )
}

function Rules({ id }: { id: string }) {
  const def = eventDef(id)!
  return (
    <div class="ev-rules">
      <ol class="goal-steps">
        {def.rules.map((r, i) => (
          <li key={i}>
            <span class="goal-n num">{i + 1}</span>
            {r}
          </li>
        ))}
      </ol>
      <div class="small muted center ev-sim-note">อีเวนต์ในเวอร์ชันทดลองทำงานในเครื่อง ซีซันหมุนเวียนอัตโนมัติ จึงเปิดเล่นได้เสมอ</div>
    </div>
  )
}

function Missions({ id, onReveal }: { id: string; onReveal: (items: Revealed[], title?: string) => void }) {
  useTicker(1000)
  const def = eventDef(id)!
  const p = eventProgress(id)
  const free = dailyTicketReady(id)
  const buyLeft = ticketBuyLeft(id)
  const claimFree = () => {
    if (!claimDailyTicket(id)) return
    sfx.coins(4)
    haptic(15)
    onReveal([{ r: { kind: 'ticket', n: def.ticket.dailyFree }, label: rewardLabel({ kind: 'ticket', n: def.ticket.dailyFree }) }], 'ได้ตั๋วฟรีประจำวัน!')
  }
  const buy = () => {
    if (buyTicket(id)) {
      sfx.coins(3)
      toast(`ได้${def.ticket.name}เพิ่ม 1 ใบ`, 'coin')
    } else if (game.value.coins < (def.ticket.coinPrice ?? 0)) coinStoreOpen.value = true
  }
  return (
    <div class="ev-missions">
      <div class="ev-ticket-row">
        <button class={`ev-tcard ${free ? 'ready' : ''}`} onClick={free ? claimFree : undefined} aria-label="รับตั๋วฟรีประจำวัน">
          <EvIcon name={def.ticket.icon} size={30} class={free ? 'ev-wiggle' : ''} />
          <span class="ev-tcard-text">
            <b>ตั๋วฟรีวันนี้</b>
            <span class="small muted">{free ? 'แตะเพื่อรับ 1 ใบ' : `ใบใหม่ใน ${fmtClock(msToMidnight())}`}</span>
          </span>
          <span class={`ev-tcard-cta ${free ? 'go' : 'done'}`}>{free ? 'รับฟรี' : <Icon name="check" size={16} />}</span>
        </button>
        {!!def.ticket.coinPrice && (
          <button class="ev-tcard" onClick={buyLeft > 0 ? buy : undefined} aria-label="ซื้อตั๋วเพิ่มด้วยคอยน์">
            <Icon name="coin" size={28} />
            <span class="ev-tcard-text">
              <b>ซื้อตั๋วเพิ่มด้วยคอยน์</b>
              <span class="small muted">
                เหลือ {buyLeft}/{def.ticket.coinBuyDaily} ครั้งวันนี้
              </span>
            </span>
            <span class={`ev-tcard-cta ${buyLeft > 0 ? 'coin' : 'done'}`}>
              <Coin n={def.ticket.coinPrice} size={12} />
            </span>
          </button>
        )}
      </div>
      <div class="ev-subhead">
        <Icon name="scroll" size={18} />
        <PT text="ภารกิจอีเวนต์วันนี้" size={11} weight={600} {...TONE_TEXT.ink} />
        <span class="grow" />
        <span class="small muted num">รีเซ็ตใน {fmtClock(msToMidnight())}</span>
      </div>
      <div class="ev-mlist">
        {p.missions.map((m) => {
          const md = def.missions.find((x) => x.id === m.id)
          if (!md) return null
          const ready = missionReady(m, md)
          const claim = () => {
            const got = claimMission(id, m.id)
            if (!got) return
            sfx.coins(5)
            haptic(15)
            onReveal([{ r: { kind: 'ticket', n: got.tickets }, label: rewardLabel({ kind: 'ticket', n: got.tickets }) }], `ภารกิจสำเร็จ! +${got.points} ${def.pointsName}`)
          }
          return (
            <div class={`ev-mission ${m.claimed ? 'claimed' : ''} ${ready ? 'ready' : ''}`} key={m.id}>
              <span class="ev-mission-icon">{md.icon.startsWith('ev_') ? <EvIcon name={md.icon} size={30} /> : <Icon name={md.icon} size={30} />}</span>
              <div class="ev-mission-main">
                <div class="ev-mission-text">
                  {md.text}
                  {md.always && <span class="ev-tag">อีเวนต์</span>}
                </div>
                <div class="ev-mission-bar">
                  <Bar value={m.progress} max={md.target} tone="green" />
                  <span class="small num">
                    {Math.min(m.progress, md.target)}/{md.target}
                  </span>
                </div>
                <div class="ev-mission-rew small">
                  <span class="ev-mini-reward">
                    <EvIcon name="ev_ticket" size={14} />x{md.tickets}
                  </span>
                  <span class="ev-mini-reward">
                    <EvIcon name="ev_points" size={14} />+{md.points} แต้ม
                  </span>
                  {md.mode === 'max' && !ready && !m.claimed && <span class="muted ev-mission-note">นับรอบที่ดีที่สุด</span>}
                </div>
              </div>
              {m.claimed ? (
                <span class="ev-mission-done">
                  <Icon name="check" size={22} />
                </span>
              ) : ready ? (
                <PBtn tone="green" size="small" class="ev-pulse ev-mission-btn" onClick={claim}>
                  รับ
                </PBtn>
              ) : null}
            </div>
          )
        })}
      </div>
      <p class="small muted center">ภารกิจยากขึ้นนิดนึงนะ ทำครบได้ตั๋วออกเรือเพิ่ม และแต้มกู้ภัยไปปลดบัตรผ่าน</p>
    </div>
  )
}

function EventHub() {
  const ui = eventUi.value
  const id = ui.id
  const def = eventDef(id)!
  const close = () => openPanel(null)
  const unlocked = isEventUnlocked(id)
  const [reveal, setReveal] = useState<{ items: Revealed[]; title?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  void game.value
  if (!unlocked)
    return (
      <Window title="อีเวนต์" icon="bolt" tone="gold" full onClose={close} class="ev-win">
        <LockedHub id={id} />
      </Window>
    )
  const p = eventProgress(id)
  const s = eventSeason(id)
  const readyPass = claimable(p, def.pass).length
  const readyMissions = p.missions.filter((m) => missionReady(m, def.missions.find((x) => x.id === m.id))).length + (dailyTicketReady(id) ? 1 : 0)
  const setTab = (tab: HubTab) => (eventUi.value = { ...eventUi.value, tab })
  const doReveal = (items: Revealed[], title?: string) => setReveal({ items, title })
  const grantedList = (rewards: EventReward[], labels: string[]) => rewards.map((r, i) => ({ r, label: labels[i] ?? rewardLabel(r) }))
  const onClaim = (tier: number, row: 'free' | 'premium') => {
    const t = def.pass.tiers.find((x) => x.tier === tier)!
    const res = claimTier(id, tier, row)
    if (!res) return
    const rewards = row === 'free' ? t.free : t.premium
    const big = rewards.some((r) => r.kind === 'outfit' || r.kind === 'pet')
    if (big) sfx.levelUp()
    else sfx.coins(5)
    haptic(big ? 40 : 15)
    doReveal(grantedList(rewards, res.map((x) => x.label)), `ขั้น ${tier} · ${row === 'free' ? def.pass.freeName : def.pass.premiumName}`)
  }
  const onClaimAll = () => {
    const all = claimAll(id)
    if (!all.length) return
    const items = all.flatMap((c) => grantedList(c.rewards, c.results.map((x) => x.label)))
    const big = items.some((x) => x.r.kind === 'outfit' || x.r.kind === 'pet')
    if (big) sfx.levelUp()
    else sfx.purchase()
    haptic(40)
    doReveal(items, `รับรางวัล ${all.length} ขั้น!`)
  }
  const onBuy = async (productId: string) => {
    if (busy) return
    setBusy(true)
    const ok = await buyPremium(id, productId)
    setBusy(false)
    if (ok) {
      sfx.purchase()
      haptic(50)
      const n = claimable(eventProgress(id), def.pass).length
      doReveal([], `ปลดล็อกบัตรผ่าน${def.pass.premiumName}แล้ว!`)
      toast(n ? `มีรางวัลให้รับ ${n} ชิ้น กด “รับทั้งหมด” ได้เลย` : 'ออกเรือเก็บแต้มเพื่อรับรางวัลแถวกู้ภัยกัน!', 'gift')
    }
  }
  return (
    <Window title="อีเวนต์" icon="bolt" tone="gold" full onClose={close} class="ev-win">
      <div class="ev-hub">
        <Banner id={id} locked={false} />
        <div class="ev-play-row">
          <div class="ev-tickets" title={def.ticket.name}>
            <span class="ev-tickets-top">
              <EvIcon name={def.ticket.icon} size={26} />
              <PT text={`x${p.tickets}`} size={13} weight={600} {...TONE_TEXT.ink} />
            </span>
            <span class="ev-tickets-name">{def.ticket.name}</span>
          </div>
          <PBtn tone={p.tickets > 0 ? 'green' : 'paper'} class={`ev-play ${p.tickets > 0 ? 'ev-pulse' : ''}`} onClick={() => tryPlay(id)} aria-label="เล่นเลย">
            <Icon name="play" size={22} />
            <PT text="เล่นเลย" size={14} weight={600} {...(p.tickets > 0 ? TONE_TEXT.green : TONE_TEXT.paper)} />
            <span class="ev-play-cost">
              <EvIcon name={def.ticket.icon} size={14} />
              <PT text={p.tickets > 0 ? '-1' : 'หมด'} size={12} weight={600} color="#5a3410" scale={1} />
            </span>
          </PBtn>
        </div>
        <div class="ev-stats small">
          <span>
            <EvIcon name="ev_points" size={14} /> {p.points.toLocaleString('th-TH')} แต้ม
          </span>
          <span>สถิติ {p.best.toLocaleString('th-TH')}</span>
          <span>ช่วยสูงสุด {p.bestRescued} ชีวิต</span>
          <span>จบ {s.end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
        </div>
        <Tabs
          tabs={[
            { id: 'missions', label: 'ภารกิจ', icon: 'scroll', badge: readyMissions },
            { id: 'pass', label: 'บัตรผ่าน', icon: 'gift', badge: readyPass },
            { id: 'rules', label: 'กติกา', icon: 'info' },
          ]}
          value={ui.tab}
          onChange={setTab}
          compact
        />
        <div class="ptab-body ev-tab-body">
          {ui.tab === 'missions' && <Missions id={id} onReveal={doReveal} />}
          {ui.tab === 'pass' && <EventPass def={def} p={p} onClaim={onClaim} onClaimAll={onClaimAll} onBuy={onBuy} busy={busy} />}
          {ui.tab === 'rules' && <Rules id={id} />}
        </div>
      </div>
      {reveal && <RewardReveal items={reveal.items} title={reveal.title} onClose={() => setReveal(null)} />}
    </Window>
  )
}

/** Count for badges (claimables across all live events). */
export function eventBadgeCount(id = 'flood'): number {
  return claimableCount(id)
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Console / smoke-test hooks: __event.open('flood', 'pass'), __event.set('flood', { points: 900 }).
  void import('../../game/liveEvents').then((m) => {
    ;(window as unknown as Record<string, unknown>).__event = { open: openEvent, ui: eventUi, set: m.devSetEvent, play: tryPlay, progress: m.eventProgress }
  })
}
