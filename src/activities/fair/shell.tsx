// The frame every fair game runs in: how-to card with the price (first
// round of the day is free), a 3-2-1 countdown, the live HUD, speech
// bubbles, the star reveal and a result card that pays out prize tickets.

import { useEffect, useRef, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { FAIR_FULL_ROUNDS, FAIR_PLAY_COST, fairPlaysToday, finishFairRound, ticketsFor, type FairGameDef, type FairRoundResult } from '../../game/hubs'
import { nextQuote, payRound } from './deals'
import { gameBooth } from './vendors'
import { BriefCard } from './brief'
import { closeActivity, coinStoreOpen, openActivity } from '../../ui/store'
import { useStage } from '../kit'
import { PBtn, Window } from '../../ui/components/kit'
import { Bar, Coin, Icon, Merit } from '../../ui/components/common'
import { FxCanvas } from '../../ui/components/FxCanvas'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { haptic, sfx } from '../../engine/audio'
import { spriteDataUrl } from '../../engine/sprite'
import { fmtTime, type Bubble, type JobScene, type JobSummary } from '../jobs/base'
import type { JobStars } from '../../game/jobs'
import { ticketSprite } from './art'
import { fairSfx } from './sound'
import { liveScores, sendFairScore, setDoing } from './live'

export type FairScene = JobScene & { score: number }

const STAR_WORDS = ['ลองใหม่อีกนิดนะ', 'ดีแล้ว', 'เก่งมาก', 'ยอดเยี่ยม!']

let ticketUrl: string | null = null
export function TicketIcon({ size = 16 }: { size?: number }) {
  ticketUrl ??= spriteDataUrl(ticketSprite(), 3)
  return <img class="px" src={ticketUrl} alt="ตั๋ว" width={Math.round(size * 1.5)} height={size} style={{ imageRendering: 'pixelated' }} />
}

export function Tickets({ n, size = 16 }: { n: number | string; size?: number }) {
  return (
    <span class="fairx-ticket">
      <TicketIcon size={size} />
      <PT text={String(n)} size={13} weight={600} {...TONE_TEXT.ink} />
    </span>
  )
}

interface Hud {
  goal: string
  progress: number
  stars: JobStars
  left: number
  thresholds: [number, number, number]
  bubbles: Bubble[]
}

function CostLine({ def }: { def: FairGameDef }) {
  const plays = fairPlaysToday(def.id)
  const cost = nextQuote(def.id, FAIR_PLAY_COST).cost
  return (
    <div class="fairx-cost small">
      {cost === 0 ? <span class="chip green small">รอบแรกของวันเล่นฟรี!</span> : <span class="chip small">ค่าเล่นรอบละ <Coin n={cost} size={14} /></span>}
      <span class="chip gold small">
        ได้สูงสุด <TicketIcon size={12} /> {ticketsFor(3, plays)}
      </span>
    </div>
  )
}

/** How-to card for a fair game (goal, three steps, price and best score). */
export function FairGoalCard({ def, onStart, onClose, again }: { def: FairGameDef; onStart: () => void; onClose: () => void; again?: boolean }) {
  const cost = nextQuote(def.id, FAIR_PLAY_COST).cost
  const best = game.value.hubs.best[def.id] ?? 0
  return (
    <Window
      title={def.name}
      icon={def.icon}
      onClose={onClose}
      footer={
        <PBtn tone="green" block size="big" icon="play" onClick={onStart}>
          {again ? 'เล่นต่อ' : cost === 0 ? 'เริ่มเลย (ฟรี)' : `เริ่มเลย · ${cost} คอยน์`}
        </PBtn>
      }
    >
      <p class="goal-main">
        <b>{def.booth}</b> · {def.goal}
      </p>
      <ol class="goal-steps">
        {def.steps.map((s, i) => (
          <li key={i}>
            <span class="goal-n num">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div class="panel gold goal-reward small">
        <Icon name="gift" size={18} /> ★1 = 3 ตั๋ว · ★2 = 5 ตั๋ว · ★3 = 8 ตั๋ว (ครบ {FAIR_FULL_ROUNDS} รอบต่อวันแล้วได้ครึ่งเดียว) · เอาตั๋วไปแลกของที่ซุ้มรางวัล
      </div>
      {!again && <CostLine def={def} />}
      <div class="fairx-best small muted">
        สถิติสูงสุด {best} คะแนน · มีตั๋ว <TicketIcon size={11} /> {game.value.hubs.tickets} ใบ
      </div>
      <LiveBoard game={def.id} />
    </Window>
  )
}

/** Other real players' latest scores at this booth (hidden when nobody is around). */
export function LiveBoard({ game: id }: { game: string }) {
  const list = liveScores.value.filter((x) => x.game === id).slice(0, 3)
  if (!list.length) return null
  return (
    <div class="fairx-live-list" style={{ margin: '6px 0' }}>
      <div class="small">
        <span class="fairx-dot" /> คะแนนสดจากเพื่อนในงานตอนนี้
      </div>
      {list.map((x) => (
        <div class="fairx-live-row" key={x.from + x.at}>
          <b>{x.name}</b>
          <span class="grow">{'★'.repeat(x.stars) || '☆'}</span>
          <span>{x.score} แต้ม</span>
        </div>
      ))}
    </div>
  )
}

function FairResult({
  def,
  stars,
  summary,
  res,
  score,
  onAgain,
}: {
  def: FairGameDef
  stars: JobStars
  summary: JobSummary
  res: FairRoundResult
  score: number
  onAgain: () => void
}) {
  useEffect(() => {
    fairSfx.tada()
  }, [])
  const cost = nextQuote(def.id, FAIR_PLAY_COST).cost
  return (
    <div class="modal-backdrop celebrate">
      <FxCanvas mode="sparkle" />
      <div class="panel modal center result-card">
        <div class="title">{summary.title ?? (stars >= 2 ? `${def.name} เก่งมาก!` : `${def.name} สนุกไหม?`)}</div>
        <div class="small">
          {'★'.repeat(stars)}
          {'☆'.repeat(3 - stars)} {STAR_WORDS[stars]}
        </div>
        <div class="fairx-tickets-big">
          <TicketIcon size={22} />
          <PT text={`+${res.tickets} ตั๋ว`} size={16} weight={600} {...TONE_TEXT.ink} />
        </div>
        <div class="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {res.merit > 0 && (
            <span class="chip pink">
              <Merit n={`+${res.merit}`} size={16} /> <span class="small">บุญ (ค่าเล่นเข้าวัด)</span>
            </span>
          )}
          <span class="chip gold">
            <TicketIcon size={12} /> มีทั้งหมด {res.total} ใบ
          </span>
        </div>
        {summary.lines.map((l) => (
          <div class="small muted" key={l}>
            {l}
          </div>
        ))}
        <LiveBoard game={def.id} />
        {res.best && score > 0 && (
          <div>
            <span class="fairx-newbest small">สถิติใหม่! {score} คะแนน</span>
          </div>
        )}
        <div class="col" style={{ marginTop: '8px' }}>
          <PBtn tone="gold" block icon="gift" onClick={() => openActivity('fair', { booth: 'prizes' })}>
            ไปแลกของรางวัล
          </PBtn>
          <PBtn tone="paper" block onClick={onAgain}>
            {cost === 0 ? 'เล่นอีกรอบ (ฟรี)' : `เล่นอีกรอบ · ${cost} คอยน์`}
          </PBtn>
          <PBtn tone="green" block onClick={closeActivity}>
            กลับไปเที่ยวงาน
          </PBtn>
        </div>
      </div>
    </div>
  )
}

export function FairRun({ def, make, onAgain, paid, tw = 190 }: { def: FairGameDef; make: () => FairScene; onAgain: () => void; paid: boolean; tw?: number }) {
  const { host, scene, stage } = useStage(make, { targetWidth: tw })
  const topRef = useRef<HTMLDivElement>(null)
  const botRef = useRef<HTMLDivElement>(null)
  const [intro, setIntro] = useState(!paid)
  const [help, setHelp] = useState(false)
  const [quit, setQuit] = useState(false)
  const [count, setCount] = useState<string | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [reveal, setReveal] = useState<{ stars: JobStars; shown: number } | null>(null)
  const [result, setResult] = useState<{ stars: JobStars; summary: JobSummary; res: FairRoundResult; score: number } | null>(null)
  const timers = useRef<number[]>([])
  const started = useRef(false)
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms))

  const measure = () => {
    const st = stage.current
    const sc = scene.current
    const hostEl = host.current
    if (!st || !sc || !hostEl) return
    const hr = hostEl.getBoundingClientRect()
    const off = parseFloat(st.el.style.top || '0')
    const k = st.cssScale || 1
    const tb = topRef.current?.getBoundingClientRect()
    const bb = botRef.current?.getBoundingClientRect()
    const top = tb ? (tb.bottom - hr.top - off) / k + 3 : sc.top
    const bottom = bb ? (bb.top - hr.top - off) / k - 3 : sc.bottom
    sc.setSafe(top, bottom)
  }

  const countdown = () => {
    if (started.current) return
    started.current = true
    const steps = ['3', '2', '1', 'เริ่ม!']
    steps.forEach((s, i) =>
      later(i * 550, () => {
        setCount(s)
        if (i < 3) sfx.tap()
        else {
          sfx.chime()
          scene.current?.start()
          setDoing(`กำลังเล่น${def.name}`)
        }
      }),
    )
    later(steps.length * 550 + 200, () => setCount(null))
  }

  const onDone = (stars: JobStars, summary: JobSummary) => {
    const sc = scene.current
    const score = sc?.score ?? 0
    const res = finishFairRound(def.id, stars, score)
    // Real players at the fair see it on their live scoreboard (no-op offline).
    sendFairScore({ game: def.id, score, stars })
    haptic(30)
    setReveal({ stars, shown: 0 })
    for (let i = 1; i <= 3; i++)
      later(250 + i * 330, () => {
        setReveal({ stars, shown: i })
        if (i <= stars) {
          sfx.sparkle()
          haptic(12)
        }
      })
    later(1700, () => {
      setReveal(null)
      setResult({ stars, summary, res, score })
    })
  }

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    measure()
    sc.onDone = (stars, summary) => onDone(stars, summary)
    if (paid) countdown()
    const iv = window.setInterval(() => {
      const s = scene.current
      if (!s) return
      measure()
      setHud({ goal: s.goalText(), progress: s.progress(), stars: s.stars(), left: s.timeLeft, thresholds: s.thresholds, bubbles: [...s.bubbles] })
    }, 100)
    ;(window as unknown as { __fairScene?: FairScene }).__fairScene = sc
    return () => {
      clearInterval(iv)
      for (const t of timers.current) clearTimeout(t)
      setDoing(null)
    }
  }, [])

  useEffect(() => {
    if (scene.current) scene.current.paused = intro || help || quit
  }, [intro, help, quit, scene.current])

  const start = () => {
    if (!payRound(def.id, FAIR_PLAY_COST).ok) return
    sfx.coin()
    setIntro(false)
    countdown()
  }

  const back = () => {
    sfx.close()
    const sc = scene.current
    if (sc && sc.phase === 'play' && sc.progress() > 0) setQuit(true)
    else closeActivity()
  }

  const again = () => {
    if (!payRound(def.id, FAIR_PLAY_COST).ok) return
    sfx.coin()
    onAgain()
  }

  const pct = Math.round((hud?.progress ?? 0) * 100)
  const low = !!hud && hud.left <= 8 && scene.current?.phase === 'play'

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <div class="act-top" ref={topRef}>
        <button class="btn paper small icon-btn" onClick={back} aria-label="กลับ">
          <PT text="‹" size={16} weight={600} {...TONE_TEXT.paper} />
        </button>
        <div class="title-plate wood act-title">
          <PT text={def.name} size={12} weight={600} {...TONE_TEXT.wood} />
        </div>
        <button class="btn blue small icon-btn" onClick={() => (sfx.open(), setHelp(true))} aria-label="วิธีเล่น">
          <PT text="?" size={14} weight={600} {...TONE_TEXT.blue} />
        </button>
        <button class="hud2-coins" onClick={() => (coinStoreOpen.value = true)} aria-label="เติมบุญคอยน์">
          <Icon name="coin" size={18} />
          <PT text={game.value.coins.toLocaleString('en-US')} size={13} weight={600} {...TONE_TEXT.wood} />
        </button>
      </div>
      {hud?.bubbles.map((b) => {
        const [x, y] = stage.current?.toCss(b.x, b.y) ?? [0, 0]
        // Keep long lines on screen (the bubble is centred on x).
        const hw = host.current?.clientWidth ?? 390
        const bw = Math.min(hw - 8, b.text.length * 7 + 16)
        const left = Math.max(bw / 2 + 4, Math.min(hw - bw / 2 - 4, x))
        return (
          <div key={b.id} class={`fairx-bubble ${b.tone}`} style={{ left: `${left}px`, top: `${y}px` }}>
            <PT text={b.text} size={11} weight={600} color={b.tone === 'warn' ? '#8e2a2a' : '#3b2616'} />
          </div>
        )
      })}
      {count && (
        <div class="act-center">
          <div key={count} class="fairx-count">
            <PT text={count} size={count.length > 1 ? 22 : 30} weight={600} color="#fffaf0" outline="#3a2838" scale={3} />
          </div>
        </div>
      )}
      {!result && (
        <div class="act-bottom" ref={botRef}>
          <div class="panel act-tip fairx-hud">
            <div class="fairx-row">
              <span class="fairx-goal">
                <Icon name={def.icon} size={20} />
                <PT text={hud?.goal ?? def.goal} size={12} weight={600} {...TONE_TEXT.ink} />
              </span>
              <span class={`fairx-time ${low ? 'low' : ''}`}>
                <PT text={fmtTime(hud?.left ?? def.time)} size={12} weight={600} color="#fff1d6" />
              </span>
            </div>
            <div class="fairx-meter">
              <Bar value={pct} max={100} tone="pink" label="คะแนน" />
              {(hud?.thresholds ?? [1 / 3, 2 / 3, 1]).map((t, i) => (
                <span key={i} class={`fairx-star ${(hud?.stars ?? 0) > i ? 'on' : ''}`} style={{ left: `${t * 100}%` }}>
                  <Icon name={(hud?.stars ?? 0) > i ? 'star' : 'star_empty'} size={20} />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {reveal && (
        <div class="fairx-done">
          <PT text={reveal.stars >= 3 ? 'ยอดเยี่ยม!' : reveal.stars >= 1 ? 'หมดรอบแล้ว!' : 'เกือบได้แล้ว!'} size={20} weight={600} color="#fffaf0" outline="#3a2838" scale={3} />
          <div class="stars-row">
            {[0, 1, 2].map((i) => (
              <span key={i} class={`fairx-bigstar ${reveal.shown > i && reveal.stars > i ? 'on' : ''}`}>
                <Icon name={reveal.stars > i ? 'star' : 'star_empty'} size={52} />
              </span>
            ))}
          </div>
        </div>
      )}
      {intro && !help && !result && <BriefCard b={gameBooth(def.id)} onPlay={start} onClose={closeActivity} onHowTo={() => setHelp(true)} />}
      {help && !result && <FairGoalCard def={def} again onStart={() => setHelp(false)} onClose={() => setHelp(false)} />}
      {quit && (
        <Window
          title="ออกจากเกมนี้?"
          icon="door"
          onClose={() => setQuit(false)}
          footer={
            <>
              <PBtn tone="paper" onClick={() => setQuit(false)}>
                เล่นต่อ
              </PBtn>
              <PBtn tone="red" onClick={closeActivity}>
                ออก
              </PBtn>
            </>
          }
        >
          <p class="goal-main">รอบนี้จะยังไม่ได้ตั๋วนะ</p>
        </Window>
      )}
      {result && <FairResult def={def} stars={result.stars} summary={result.summary} res={result.res} score={result.score} onAgain={again} />}
    </div>
  )
}
