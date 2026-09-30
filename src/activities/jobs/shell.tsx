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
import { useStage, type ResultData } from '../kit'
import { PBtn, Window } from '../../ui/components/kit'
import { Bar, Btn, Coin, Icon, Merit } from '../../ui/components/common'
import { FxCanvas } from '../../ui/components/FxCanvas'
import { adsLeft, grantMeritRaw, rewardAd } from '../../game/actions'
import { ads } from '../../services/ads'
import { spriteDataUrl } from '../../engine/sprite'
import { workerCard, type CardMood } from '../../art/workActor'
import { wsfx } from './workSfx'
import { JobBrief } from './brief'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { haptic, sfx } from '../../engine/audio'
import { fmtTime, type Bubble, type JobScene, type JobSummary, type Praise } from './base'

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
.jobx-praise { position: absolute; left: 50%; top: 24%; z-index: 5; pointer-events: none; transform: translate(-50%, -50%); animation: jobx-praise 1.3s cubic-bezier(.2,1.6,.4,1) forwards; line-height: 0; filter: drop-shadow(0 3px 0 rgba(58,40,56,0.45)); }
.jobx-praise::before { content: ''; position: absolute; left: 50%; top: 50%; width: 150%; height: 190%; transform: translate(-50%, -50%); background: radial-gradient(closest-side, rgba(255,236,150,0.75), rgba(255,236,150,0)); z-index: -1; }
.jobx-praise.pink::before { background: radial-gradient(closest-side, rgba(255,170,205,0.75), rgba(255,170,205,0)); }
.jobx-praise.blue::before { background: radial-gradient(closest-side, rgba(160,215,255,0.75), rgba(160,215,255,0)); }
.jobx-praise.green::before { background: radial-gradient(closest-side, rgba(180,240,140,0.75), rgba(180,240,140,0)); }
.jobx-result { gap: 4px; padding-top: 10px; overflow: visible; }
.jobx-hero { position: relative; width: 100%; height: 168px; margin-top: -8px; display: flex; align-items: flex-end; justify-content: center; }
.jobx-hero-rays { position: absolute; left: 50%; top: 50%; width: 230px; height: 230px; margin: -115px 0 0 -115px; border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(255, 222, 110, 0.55) 0 11deg, transparent 11deg 22deg); -webkit-mask-image: radial-gradient(circle, #000 18%, transparent 66%); mask-image: radial-gradient(circle, #000 18%, transparent 66%); animation: jobx-spin 9s linear infinite; }
.jobx-hero.low .jobx-hero-rays { background: repeating-conic-gradient(from 0deg, rgba(170, 210, 255, 0.45) 0 11deg, transparent 11deg 22deg); }
.jobx-hero-floor { position: absolute; bottom: 4px; left: 50%; width: 110px; height: 14px; margin-left: -55px; border-radius: 50%; background: radial-gradient(closest-side, rgba(58,40,56,0.28), rgba(58,40,56,0)); }
.jobx-hero img { position: relative; image-rendering: pixelated; animation: jobx-hop 0.9s steps(1) infinite; }
.jobx-hero img.b { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); animation: jobx-hop-b 0.9s steps(1) infinite; }
@keyframes jobx-hop { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes jobx-hop-b { 0%, 49% { opacity: 0; } 50%, 100% { opacity: 1; } }
@keyframes jobx-spin { to { transform: rotate(360deg); } }
.jobx-rstars { display: flex; gap: 4px; margin: -4px 0 2px; }
.jobx-rstar { line-height: 0; opacity: 0.25; transform: scale(0.7); transition: transform 0.28s cubic-bezier(.3,1.9,.5,1), opacity 0.2s; }
.jobx-rstar.mid { margin-top: -10px; }
.jobx-rstar.on { opacity: 1; transform: scale(1.12); }
.jobx-rword { animation: jobx-zoom 0.5s ease-out both; line-height: 0; }
.jobx-rchips { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; }
.jobx-rlines { display: flex; flex-direction: column; gap: 2px; align-items: center; background: rgba(58,40,56,0.06); border-radius: 4px; padding: 4px 10px; width: 100%; box-sizing: border-box; }
@keyframes jobx-praise { 0% { transform: translate(-50%, -50%) scale(0.3) rotate(-8deg); opacity: 0; } 18% { transform: translate(-50%, -50%) scale(1.15) rotate(3deg); opacity: 1; } 30% { transform: translate(-50%, -50%) scale(1) rotate(0); } 78% { transform: translate(-50%, -62%) scale(1); opacity: 1; } 100% { transform: translate(-50%, -80%) scale(0.9); opacity: 0; } }
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
  praises: Praise[]
}

const PRAISE_TONE: Record<Praise['tone'], { color: string; outline: string }> = {
  gold: { color: '#ffe45e', outline: '#7a3a10' },
  pink: { color: '#ffd0e4', outline: '#8e2a5c' },
  blue: { color: '#d4f1ff', outline: '#1f3f70' },
  green: { color: '#d8ffb0', outline: '#1f4a26' },
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

const MOOD: Record<JobStars, CardMood> = { 0: 'phew', 1: 'cheer', 2: 'thumbs', 3: 'thumbs' }

/** Result card: the player's own avatar celebrating, stars landing one by one, rewards. */
export function JobResultCard({ r, onDone, onAgain, mood, apron }: { r: ResultData & { stars: JobStars }; onDone: () => void; onAgain?: () => void; mood?: CardMood; apron?: boolean }) {
  const [shown, setShown] = useState(0)
  const [doubled, setDoubled] = useState(false)
  const look = game.value.player.look
  const m = mood ?? MOOD[r.stars]
  const urls = [0, 1].map((f) => spriteDataUrl(workerCard(look, m, f as 0 | 1, apron), 3))
  useEffect(() => {
    sfx.merit()
    const ids: number[] = []
    for (let i = 1; i <= r.stars; i++)
      ids.push(
        window.setTimeout(() => {
          setShown(i)
          wsfx.star(i - 1)
          haptic(10)
        }, 260 + i * 300),
      )
    return () => ids.forEach(clearTimeout)
  }, [])
  const double = async () => {
    const res = await ads().showRewarded('double_reward')
    if (!res.rewarded) return
    rewardAd('bonus')
    grantMeritRaw(r.merit)
    setDoubled(true)
    sfx.chime()
  }
  const word = STAR_WORDS[r.stars]
  return (
    <div class="modal-backdrop celebrate">
      <FxCanvas mode={r.stars >= 2 ? 'confetti' : 'sparkle'} />
      <div class="panel modal center result-card jobx-result">
        <div class={`jobx-hero ${r.stars <= 1 ? 'low' : ''}`}>
          <span class="jobx-hero-rays" />
          <span class="jobx-hero-floor" />
          <img class="px a" src={urls[0]} alt="" width={138} height={180} draggable={false} />
          <img class="px b" src={urls[1]} alt="" width={138} height={180} draggable={false} />
        </div>
        <div class="jobx-rstars" aria-label={`${r.stars} ดาว`}>
          {[0, 1, 2].map((i) => (
            <span key={i} class={`jobx-rstar ${i === 1 ? 'mid' : ''} ${shown > i ? 'on' : ''}`}>
              <Icon name={shown > i ? 'star' : 'star_empty'} size={i === 1 ? 44 : 36} />
            </span>
          ))}
        </div>
        {shown >= r.stars && (
          <div class="jobx-rword" key={word}>
            <PT text={word} size={16} weight={600} color={r.stars >= 2 ? '#ffe45e' : '#d4f1ff'} outline={r.stars >= 2 ? '#7a3a10' : '#1f3f70'} scale={2} />
          </div>
        )}
        <div class="title">{r.title}</div>
        <div class="jobx-rchips">
          <span class="chip pink big-chip">
            <Merit n={`+${doubled ? r.merit * 2 : r.merit}`} size={20} />
            <span class="small">บุญ</span>
          </span>
          {!!r.coins && (
            <span class="chip gold big-chip">
              <Coin n={`+${r.coins}`} size={20} />
            </span>
          )}
        </div>
        {!!r.lines?.length && (
          <div class="jobx-rlines">
            {r.lines.map((l) => (
              <div class="small muted" key={l}>
                {l}
              </div>
            ))}
          </div>
        )}
        <div class="col" style={{ marginTop: '6px', width: '100%' }}>
          {r.merit > 0 && !doubled && adsLeft() > 0 && (
            <Btn tone="blue" block onClick={double}>
              <Icon name="tv" size={18} /> ดูโฆษณา รับบุญ x2
            </Btn>
          )}
          {onAgain && (
            <Btn tone="paper" block onClick={onAgain}>
              เล่นอีกครั้ง
            </Btn>
          )}
          <Btn tone="green" block onClick={onDone}>
            สาธุ ๆ ๆ
          </Btn>
        </div>
      </div>
    </div>
  )
}

export function JobRun({ def, make, onAgain, tw = 190 }: { def: JobDef; make: () => JobScene; onAgain: () => void; tw?: number }) {
  ensureStyle()
  const { host, scene, stage } = useStage(make, { targetWidth: tw })
  const topRef = useRef<HTMLDivElement>(null)
  const botRef = useRef<HTMLDivElement>(null)
  const tipKey = `goal:job:${def.id}`
  // The brief (requester, task, rewards, deals) opens before every play.
  const [intro, setIntro] = useState(true)
  const [help, setHelp] = useState(false)
  const [quit, setQuit] = useState(false)
  const [count, setCount] = useState<string | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [reveal, setReveal] = useState<{ stars: JobStars; shown: number } | null>(null)
  const [result, setResult] = useState<(ResultData & { stars: JobStars }) | null>(null)
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
      setHud({ goal: s.goalText(), progress: s.progress(), stars: s.stars(), left: s.timeLeft, thresholds: s.thresholds, bubbles: [...s.bubbles], praises: [...s.praises] })
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
    for (const b of r.bonuses ?? []) lines.push(`ดีล: ${b.label}`)
    const left = jobFullLeft(def.id)
    if (r.capped) lines.push('วันนี้รับรางวัลเต็มครบแล้ว รอบนี้ได้ 25%')
    else if (stars > 0) lines.push(left > 0 ? `รางวัลเต็มเหลืออีก ${left} รอบวันนี้` : 'ครบรางวัลเต็มของวันนี้แล้ว ขอบคุณจิตอาสา!')
    const title = summary.title ?? (stars >= 2 ? `${def.name} เสร็จเรียบร้อย!` : `${def.name} ได้ช่วยวัดแล้ว`)
    later(1700, () => {
      setReveal(null)
      setResult({ title, merit: r.merit, coins: r.coins, icon: def.icon, lines: lines.slice(1), stars })
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
      {hud?.praises.slice(-1).map((p) => (
        <div key={p.id} class={`jobx-praise ${p.tone}`}>
          <PT text={p.text} size={p.text.length > 10 ? 18 : 22} weight={600} color={PRAISE_TONE[p.tone].color} outline={PRAISE_TONE[p.tone].outline} scale={2} />
        </div>
      ))}
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
      {(intro || help) && !result && <JobBrief def={def} again={help} onStart={start} onClose={intro ? closeActivity : () => setHelp(false)} />}
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
      {result && <JobResultCard r={result} onDone={closeActivity} onAgain={onAgain} />}
    </div>
  )
}
