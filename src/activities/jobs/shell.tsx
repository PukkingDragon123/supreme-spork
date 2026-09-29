// The frame every volunteer job runs in: top bar with help, a how-to card on
// first play, a 3-2-1 countdown, the live HUD (goal, timer, progress bar with
// star marks), speech bubbles, a star reveal and the result card.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { JobDef } from '../../game/data/jobs'
import { JOB_GOALS } from '../../game/data/jobs'
import { finishJob, jobFullLeft, type JobStars } from '../../game/jobs'
import { game, mutate } from '../../game/state'
import { track } from '../../game/actions'
import type { GameEvent } from '../../game/data/quests'
import { MATERIAL_INFO } from '../../game/materials'
import { closeActivity, coinStoreOpen } from '../../ui/store'
import { ResultCard, useStage, type ResultData } from '../kit'
import { PBtn, Window } from '../../ui/components/kit'
import { Bar, Icon } from '../../ui/components/common'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { haptic, sfx } from '../../engine/audio'
import { fmtTime, type Bubble, type JobScene, type JobSummary } from './base'

const STYLE = `
.jobx-hud { padding: 6px 10px 8px; display: flex; flex-direction: column; gap: 6px; }
.jobx-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 22px; }
.jobx-goal { display: flex; align-items: center; gap: 6px; min-width: 0; }
.jobx-time { display: inline-flex; align-items: center; justify-content: center; min-width: 46px; padding: 1px 6px; background: #3a2838; border-radius: 3px; box-shadow: 0 2px 0 #1e141e; }
.jobx-time.low { background: #b8343f; animation: jobx-pulse 0.5s steps(2) infinite; }
.jobx-meter { position: relative; margin: 4px 10px 2px 2px; }
.jobx-meter .bar { height: 16px; }
.jobx-star { position: absolute; top: 50%; transform: translate(-50%, -50%); line-height: 0; transition: transform 0.2s; }
.jobx-star.on { transform: translate(-50%, -50%) scale(1.25); }
.jobx-bubble { position: absolute; z-index: 4; pointer-events: none; transform: translate(-50%, -100%); padding: 2px 5px 3px; background: #fffaf0; box-shadow: 0 0 0 2px #3a2838, 0 3px 0 2px rgba(58,40,56,0.35); border-radius: 2px; animation: jobx-pop 0.18s ease-out; white-space: nowrap; line-height: 0; }
.jobx-bubble.warn { background: #ffe1d6; }
.jobx-bubble.l { transform: translate(0, -100%); animation-name: jobx-pop-l; }
.jobx-bubble.r { transform: translate(-100%, -100%); animation-name: jobx-pop-r; }
.jobx-bubble.l::after { left: 14px; }
.jobx-bubble.r::after { left: auto; right: 11px; }
.jobx-bubble.good { background: #eaffd8; }
.jobx-bubble::after { content: ''; position: absolute; left: 50%; bottom: -5px; margin-left: -3px; border: 3px solid transparent; border-top-color: #3a2838; border-bottom: 0; }
.jobx-count { animation: jobx-zoom 0.55s ease-out; }
.jobx-done { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; pointer-events: none; }
.jobx-done .stars-row { display: flex; gap: 6px; }
.jobx-bigstar { opacity: 0.25; transform: scale(0.8); transition: transform 0.25s cubic-bezier(.3,1.8,.5,1), opacity 0.2s; }
.jobx-bigstar.on { opacity: 1; transform: scale(1.15); }
@keyframes jobx-pop { from { transform: translate(-50%, -80%) scale(0.6); } to { transform: translate(-50%, -100%) scale(1); } }
@keyframes jobx-pop-l { from { transform: translate(0, -80%) scale(0.6); } to { transform: translate(0, -100%) scale(1); } }
@keyframes jobx-pop-r { from { transform: translate(-100%, -80%) scale(0.6); } to { transform: translate(-100%, -100%) scale(1); } }
@keyframes jobx-zoom { from { transform: scale(1.8); opacity: 0; } 40% { opacity: 1; } to { transform: scale(1); } }
@keyframes jobx-pulse { 50% { filter: brightness(1.35); } }
`

function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById('jobx-style')) return
  const el = document.createElement('style')
  el.id = 'jobx-style'
  el.textContent = STYLE
  document.head.appendChild(el)
}

const STAR_WORDS = ['ลองใหม่อีกนิดนะ', 'ดีแล้ว', 'เก่งมาก', 'ยอดเยี่ยม!']

interface Hud {
  goal: string
  progress: number
  stars: JobStars
  left: number
  thresholds: [number, number, number]
  bubbles: Bubble[]
}

/** How-to card for a job (goal, three steps, rewards). */
export function JobGoalCard({ def, onStart, onClose, again }: { def: JobDef; onStart: () => void; onClose: () => void; again?: boolean }) {
  const g = JOB_GOALS[def.id]
  const left = jobFullLeft(def.id)
  return (
    <Window
      title={g.title}
      icon={g.icon}
      onClose={onClose}
      footer={
        <PBtn tone="green" block size="big" icon="play" onClick={onStart}>
          {again ? 'เล่นต่อ' : 'เริ่มเลย'}
        </PBtn>
      }
    >
      <p class="goal-main">{g.goal}</p>
      <ol class="goal-steps">
        {g.steps.map((s, i) => (
          <li key={i}>
            <span class="goal-n num">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div class="panel gold goal-reward small">
        <Icon name="gift" size={18} /> {g.reward}
      </div>
      <div class="small muted center" style={{ marginTop: '6px' }}>
        {def.place} · {def.time} วินาที · {left > 0 ? `รางวัลเต็มเหลือ ${left} รอบวันนี้` : 'วันนี้ได้รางวัลเต็มครบแล้ว'}
      </div>
    </Window>
  )
}

export function JobRun({ def, make, onAgain, tw = 190 }: { def: JobDef; make: () => JobScene; onAgain: () => void; tw?: number }) {
  ensureStyle()
  const { host, scene, stage } = useStage(make, { targetWidth: tw })
  const topRef = useRef<HTMLDivElement>(null)
  const botRef = useRef<HTMLDivElement>(null)
  const tipKey = `goal:job:${def.id}`
  const [intro, setIntro] = useState(() => !game.value.seen.tips.includes(tipKey))
  const [help, setHelp] = useState(false)
  const [quit, setQuit] = useState(false)
  const [count, setCount] = useState<string | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [reveal, setReveal] = useState<{ stars: JobStars; shown: number } | null>(null)
  const [result, setResult] = useState<ResultData | null>(null)
  const timers = useRef<number[]>([])
  const started = useRef(false)

  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms))

  // Keep the play area between the top bar and the HUD.
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
      later(i * 600, () => {
        setCount(s)
        if (i < 3) sfx.tap()
        else {
          sfx.chime()
          scene.current?.start()
        }
      }),
    )
    later(steps.length * 600 + 200, () => setCount(null))
  }

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    measure()
    sc.onDone = (stars, summary) => onDone(stars, summary)
    if (!intro) countdown()
    const iv = window.setInterval(() => {
      const s = scene.current
      if (!s) return
      measure()
      setHud({ goal: s.goalText(), progress: s.progress(), stars: s.stars(), left: s.timeLeft, thresholds: s.thresholds, bubbles: [...s.bubbles] })
    }, 100)
    // Dev/test hook.
    ;(window as unknown as { __jobScene?: JobScene; __jobK?: number }).__jobScene = sc
    ;(window as unknown as { __jobK?: number }).__jobK = stage.current?.cssScale ?? 2
    return () => {
      clearInterval(iv)
      for (const t of timers.current) clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (scene.current) scene.current.paused = intro || help || quit
  }, [intro, help, quit, scene.current])

  const onDone = (stars: JobStars, summary: JobSummary) => {
    const r = finishJob(def.id, stars)
    for (const [ev, n] of Object.entries(summary.events ?? {})) if (n) track(ev as GameEvent, n)
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
    const lines = [`${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} ${STAR_WORDS[stars]}`, ...summary.lines]
    if (r.mat) lines.push(`ได้${MATERIAL_INFO[r.mat.id].name} +${r.mat.n} ไว้ทำเฟอร์นิเจอร์`)
    const left = jobFullLeft(def.id)
    if (r.capped) lines.push('วันนี้รับรางวัลเต็มครบแล้ว รอบนี้ได้ 25%')
    else if (stars > 0) lines.push(left > 0 ? `รางวัลเต็มเหลืออีก ${left} รอบวันนี้` : 'ครบรางวัลเต็มของวันนี้แล้ว ขอบคุณจิตอาสา!')
    const title = summary.title ?? (stars >= 2 ? `${def.name} เสร็จเรียบร้อย!` : `${def.name} ได้ช่วยวัดแล้ว`)
    later(1700, () => {
      setReveal(null)
      setResult({ title, merit: r.merit, coins: r.coins, icon: def.icon, lines })
    })
  }

  const start = () => {
    mutate((d) => {
      if (!d.seen.tips.includes(tipKey)) d.seen.tips.push(tipKey)
    })
    setIntro(false)
    setHelp(false)
    countdown()
  }

  const back = () => {
    sfx.close()
    const sc = scene.current
    if (sc && sc.phase === 'play' && sc.progress() > 0) setQuit(true)
    else closeActivity()
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
          <PT text={def.name} size={def.name.length > 12 ? 10 : def.name.length > 10 ? 11 : 12} weight={600} {...TONE_TEXT.wood} />
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
        const sw = scene.current?.w ?? 190
        const side = b.x < sw * 0.3 ? 'l' : b.x > sw * 0.7 ? 'r' : ''
        return (
          <div key={b.id} class={`jobx-bubble ${b.tone} ${side}`} style={{ left: `${side === 'l' ? x - 14 : side === 'r' ? x + 14 : x}px`, top: `${y}px` }}>
            <PT text={b.text} size={11} weight={600} color={b.tone === 'warn' ? '#8e2a2a' : '#3b2616'} />
          </div>
        )
      })}
      {count && (
        <div class="act-center">
          <div key={count} class="jobx-count">
            <PT text={count} size={count.length > 1 ? 22 : 30} weight={600} color="#fffaf0" outline="#3a2838" scale={3} />
          </div>
        </div>
      )}
      {!result && (
        <div class="act-bottom" ref={botRef}>
          <div class="panel act-tip jobx-hud">
            <div class="jobx-row">
              <span class="jobx-goal">
                <Icon name={def.icon} size={20} />
                <PT text={hud?.goal ?? JOB_GOALS[def.id].goal} size={12} weight={600} {...TONE_TEXT.ink} />
              </span>
              <span class={`jobx-time ${low ? 'low' : ''}`}>
                <PT text={fmtTime(hud?.left ?? def.time)} size={12} weight={600} color="#fff1d6" />
              </span>
            </div>
            <div class="jobx-meter">
              <Bar value={pct} max={100} tone="green" label="ความคืบหน้า" />
              {(hud?.thresholds ?? [1 / 3, 2 / 3, 1]).map((t, i) => (
                <span key={i} class={`jobx-star ${(hud?.stars ?? 0) > i ? 'on' : ''}`} style={{ left: `${t * 100}%` }}>
                  <Icon name={(hud?.stars ?? 0) > i ? 'star' : 'star_empty'} size={20} />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {reveal && (
        <div class="jobx-done">
          <PT text={reveal.stars >= 3 ? 'ยอดเยี่ยม!' : reveal.stars >= 1 ? 'เสร็จแล้ว!' : 'หมดเวลา'} size={20} weight={600} color="#fffaf0" outline="#3a2838" scale={3} />
          <div class="stars-row">
            {[0, 1, 2].map((i) => (
              <span key={i} class={`jobx-bigstar ${reveal.shown > i && reveal.stars > i ? 'on' : ''}`}>
                <Icon name={reveal.stars > i ? 'star' : 'star_empty'} size={52} />
              </span>
            ))}
          </div>
        </div>
      )}
      {(intro || help) && !result && <JobGoalCard def={def} again={help} onStart={start} onClose={intro ? closeActivity : () => setHelp(false)} />}
      {quit && (
        <Window
          title="ออกจากงานนี้?"
          icon="door"
          onClose={() => setQuit(false)}
          footer={
            <>
              <PBtn tone="paper" onClick={() => setQuit(false)}>
                ทำต่อ
              </PBtn>
              <PBtn tone="red" onClick={closeActivity}>
                ออก
              </PBtn>
            </>
          }
        >
          <p class="goal-main">งานที่ทำไว้รอบนี้จะยังไม่ได้รับรางวัลนะ</p>
        </Window>
      )}
      {result && <ResultCard r={result} onDone={closeActivity} again={{ label: 'เล่นอีกครั้ง', run: onAgain }} />}
    </div>
  )
}
