// The core gameplay: chant along with the highlighted words. With the real
// microphone the voice is judged on timing, flow and steadiness (no speech
// recognition); without it the player taps each word on the beat.

import { Fragment } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useStage } from '../../activities/kit'
import { PrayerHallScene, type HallTemple, type KneelPose } from '../../scenes/prayer'
import { dollSprite, type DollPose } from '../../art/doll'
import { VoiceInput } from '../../engine/voice'
import { buildTimeline, ChantScorer, BOW_TOKEN, type ChantResult, type Judge, type TimelineWord } from '../../game/chantScore'
import { CHAPTERS, STAGE_BY_ID, STAGES, chantById, stageLines } from '../../game/data/prayers'
import { finishPrayer, setPrayerMode, stageUnlocked, type PrayerReward } from '../../game/prayer'
import { game } from '../../game/state'
import { adsLeft, grantMeritRaw, rewardAd } from '../../game/actions'
import { ads } from '../../services/ads'
import { openActivity, openPanel, prayAtHome, prayStage } from '../store'
import { PBtn, Stars, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Coin, Icon, Merit } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { MatChip } from './PrayerSelect'
import type { MaterialId } from '../../game/materials'
import { haptic, sfx } from '../../engine/audio'

type Phase = 'intro' | 'count' | 'chant' | 'paused' | 'bows' | 'result'

const JUDGE_TEXT: Record<Judge, { text: string; color: string; shadow: string }> = {
  perfect: { text: 'ดีเยี่ยม!', color: '#ffe58a', shadow: '#7a4f12' },
  good: { text: 'ดี', color: '#c8f0a8', shadow: '#1f4a26' },
  miss: { text: 'พลาด', color: '#e6dccb', shadow: '#4a3a30' },
}

const POSE: Record<KneelPose, DollPose> = { kneel: 'kneel', wai: 'kneelWai', bow: 'bow', sit: 'sit' }

let voice: VoiceInput | null = null
function mic() {
  if (!voice) voice = new VoiceInput()
  return voice
}

export function PrayerSession() {
  const stageId = prayStage.value!
  const st = STAGE_BY_ID[stageId]
  const chant = chantById(st.chant)
  const chapter = CHAPTERS.find((c) => c.id === st.chapter)!
  const s = game.value
  const lines = useMemo(() => stageLines(st), [stageId])
  const timeline = useMemo(() => buildTimeline(lines, { msPerSyllable: st.tempo, leadInMs: 2400 }), [stageId])

  const [phase, setPhase] = useState<Phase>('intro')
  const [mode, setMode] = useState<'voice' | 'tap'>(s.prayer.mode)
  const [micMsg, setMicMsg] = useState<string | null>(null)
  const [count, setCount] = useState(3)
  const [, force] = useState(0)
  const [popups, setPopups] = useState<{ id: number; j: Judge }[]>([])
  const [result, setResult] = useState<ChantResult | null>(null)
  const [reward, setReward] = useState<PrayerReward | null>(null)
  const [bowsLeft, setBowsLeft] = useState(st.bows)

  const clock = useRef({ t: 0, last: 0, running: false })
  const scorer = useRef<ChantScorer | null>(null)
  const level = useRef(0)
  const judged = useRef<(Judge | undefined)[]>([])
  const popId = useRef(0)
  const bowQueue = useRef(new Set<number>())

  const temple: HallTemple = prayAtHome.value ? 'home' : (chapter.hall as HallTemple)
  const deity = st.chant === 'ganesha' || st.chant === 'guanyin' || st.chant === 'lakshmi' ? st.chant : undefined
  const { host, scene } = useStage(
    () =>
      new PrayerHallScene({
        temple,
        deity,
        look: s.player.look,
        playerSprite: (pose, blink) => dollSprite(s.player.look, POSE[pose], { view: 'back', blink, barefoot: true }),
      }),
    { targetWidth: 200 },
  )

  useEffect(() => {
    scene.current?.setPose('kneel')
    return () => mic().stop()
  }, [])

  // ---- main loop ---------------------------------------------------------
  useEffect(() => {
    if (phase !== 'chant') return
    let raf = 0
    const c = clock.current
    c.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - c.last) / 1000)
      c.last = now
      c.t += dt
      const sc = scorer.current!
      if (mode === 'voice') {
        const f = mic().read(dt)
        const fr = { ...f, t: c.t }
        sc.feed(fr)
        level.current = f.active ? Math.max(0.15, f.loudness) : 0
        scene.current?.setVoice(level.current)
      } else {
        sc.advance(c.t)
        level.current = Math.max(0, level.current - dt * 3)
        scene.current?.setVoice(level.current)
      }
      scene.current?.setFocus(Math.min(1, sc.combo / 12))
      // Bows marked in the chant text.
      for (const w of timeline.words)
        if (w.bow && c.t > w.start + w.dur + 0.1 && !bowQueue.current.has(w.index)) {
          bowQueue.current.add(w.index)
          scene.current?.bow()
          sfx.click()
        }
      force((n) => (n + 1) & 0xffff)
      if (c.t >= timeline.total) {
        const r = sc.finish()
        setResult(r)
        mic().stop()
        scene.current?.setPose('wai')
        setPhase('bows')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, mode])

  const onJudge = (i: number, j: Judge) => {
    judged.current[i] = j
    scene.current?.hit(j === 'perfect' ? 'perfect' : j === 'good' ? 'good' : 'miss')
    if (j === 'perfect') sfx.sparkle()
    else if (j === 'miss') haptic(20)
    const id = ++popId.current
    setPopups((p) => [...p.slice(-3), { id, j }])
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900)
  }

  const begin = async (m: 'voice' | 'tap') => {
    setMicMsg(null)
    let use = m
    if (m === 'voice') {
      const r = await mic().start()
      if (r !== 'ok') {
        use = 'tap'
        setMicMsg(
          r === 'denied'
            ? 'ยังไม่ได้อนุญาตไมโครโฟน เลยใช้โหมดแตะตามจังหวะแทนนะ (เปิดสิทธิ์ไมค์ในเบราว์เซอร์เพื่อสวดด้วยเสียงจริง)'
            : 'อุปกรณ์นี้ใช้ไมโครโฟนไม่ได้ เลยใช้โหมดแตะตามจังหวะแทนนะ',
        )
      }
    }
    setMode(use)
    setPrayerMode(m)
    scorer.current = new ChantScorer(timeline, { mode: use, onJudge })
    judged.current = []
    bowQueue.current.clear()
    clock.current = { t: 0, last: 0, running: false }
    scene.current?.setPhase('ready')
    scene.current?.setPose('wai')
    setPhase('count')
    setCount(3)
    sfx.bell(0)
    let n = 3
    const id = setInterval(() => {
      n--
      if (n > 0) {
        setCount(n)
        sfx.bell(3 - n)
      } else {
        clearInterval(id)
        sfx.bigBell()
        scene.current?.setPhase('chant')
        setPhase('chant')
      }
    }, 800)
  }

  const tap = () => {
    if (phase !== 'chant' || mode !== 'tap') return
    const j = scorer.current?.tap(clock.current.t)
    level.current = 1
    sfx.tap()
    if (!j) haptic(8)
  }

  const bowOnce = () => {
    if (bowsLeft <= 0) return
    sfx.click()
    haptic(15)
    const left = bowsLeft - 1
    setBowsLeft(left)
    scene.current?.bow(() => {
      if (left === 0) {
        const rw = finishPrayer(stageId, result!, mode)
        setReward(rw)
        scene.current?.finale()
        sfx.merit()
        setPhase('result')
      }
    })
  }

  const exit = () => {
    mic().stop()
    prayStage.value = null
  }

  const replay = () => {
    prayStage.value = null
    setTimeout(() => (prayStage.value = stageId), 0)
  }

  const next = STAGES.find((x) => x.chapter === st.chapter && x.n === st.n + 1)

  // ---- karaoke ------------------------------------------------------------
  const t = clock.current.t
  const words = timeline.words
  let cur = words.findIndex((w) => t < w.start + w.dur)
  if (cur < 0) cur = words.length - 1
  const curLine = phase === 'chant' || phase === 'paused' ? words[Math.max(0, cur)]?.line ?? 0 : 0

  return (
    <div class={`pray phase-${phase}`}>
      <div class="stage-host" ref={host} onPointerDown={phase === 'chant' && mode === 'tap' ? tap : undefined} />

      {(phase === 'chant' || phase === 'paused' || phase === 'count') && (
        <div class="pray-top">
          <button class="btn dark small icon-btn" aria-label="พัก" onClick={() => (sfx.tap(), setPhase(phase === 'paused' ? 'chant' : 'paused'))}>
            <Icon name={phase === 'paused' ? 'play' : 'pause'} size={18} />
          </button>
          <div class="pray-title">
            <PT text={chant.name} size={12} color="#fff6dc" shadow="#2a1a10" />
          </div>
          <div class="pray-combo">
            {(scorer.current?.combo ?? 0) >= 3 && <PT text={`คอมโบ ${scorer.current!.combo}`} size={13} weight={600} color="#ffe58a" shadow="#7a4f12" />}
          </div>
        </div>
      )}

      {phase === 'count' && (
        <div class="pray-count" key={count}>
          <PT text={count} size={28} weight={600} color="#fff6dc" shadow="#7a4f12" scale={3} />
        </div>
      )}

      {(phase === 'chant' || phase === 'paused' || phase === 'count') && (
        <div class="karaoke win">
          <VoiceMeter level={level.current} mode={mode} />
          <div class="kara-lines" aria-live="off">
            {[curLine, curLine + 1].map((li) =>
              li < lines.length ? (
                <div key={li} class={`kara-line ${li === curLine ? 'now' : 'next'}`}>
                  {words
                    .filter((w) => w.line === li)
                    .map((w) => (
                      <Fragment key={w.index}>
                        <Word w={w} t={t} j={judged.current[w.index]} />{' '}
                      </Fragment>
                    ))}
                  {lines[li].includes(BOW_TOKEN) && <span class="kara-bow">(กราบ)</span>}
                </div>
              ) : null,
            )}
          </div>
          <div class="kara-pop">
            {popups.map((p) => (
              <span class="pop" key={p.id}>
                <PT text={JUDGE_TEXT[p.j].text} size={14} weight={600} color={JUDGE_TEXT[p.j].color} shadow={JUDGE_TEXT[p.j].shadow} />
              </span>
            ))}
          </div>
          {mode === 'tap' ? (
            <button class="btn gold big block kara-tap" onPointerDown={(e) => (e.preventDefault(), tap())}>
              <Icon name="lotus" size={26} />
              <PT text="แตะเมื่อคำเริ่ม" size={14} weight={600} {...TONE_TEXT.gold} />
            </button>
          ) : (
            <div class="kara-hint small">เปล่งเสียงสวดตามคำที่ไฮไลต์ ช้า ๆ สม่ำเสมอ</div>
          )}
        </div>
      )}

      {phase === 'intro' && (
        <Window
          title={`ด่าน ${st.n}`}
          icon="pray"
          backdrop={false}
          class="pray-intro"
          onClose={exit}
          footer={
            <div class="col" style={{ width: '100%', gap: '2px' }}>
              <PBtn tone="green" size="big" block icon="mic" onClick={() => void begin('voice')}>
                สวดด้วยเสียงจริง
              </PBtn>
              <PBtn tone="wood" block icon="lotus" onClick={() => void begin('tap')}>
                แตะตามจังหวะ (เงียบ ๆ)
              </PBtn>
            </div>
          }
        >
          <PT text={chant.name} size={14} weight={600} {...TONE_TEXT.ink} />
          <p class="small pray-meaning">{chant.meaning}</p>
          <div class="row wrap small muted">
            <span>
              <Icon name="mic" size={14} /> สวดด้วยไมค์ได้บุญมากกว่า 25%
            </span>
            <span>· นั่งพับเพียบ พนมมือ ตั้งใจ</span>
          </div>
          {micMsg && <p class="field-err">{micMsg}</p>}
        </Window>
      )}

      {phase === 'paused' && (
        <Window
          title="พักสักครู่"
          icon="pause"
          onClose={() => setPhase('chant')}
          footer={
            <>
              <PBtn tone="red" icon="close" onClick={exit}>
                ออก
              </PBtn>
              <PBtn tone="green" icon="play" onClick={() => setPhase('chant')}>
                สวดต่อ
              </PBtn>
            </>
          }
        >
          <p class="small">หายใจเข้าลึก ๆ แล้วค่อยสวดต่อนะ</p>
        </Window>
      )}

      {phase === 'bows' && result && (
        <div class="bows">
          <PT text={bowsLeft > 0 ? `กราบ ${st.bows - bowsLeft + 1} / ${st.bows}` : 'สาธุ'} size={16} weight={600} color="#fff6dc" shadow="#3b2616" />
          <PBtn tone="gold" size="big" icon="wai" onClick={bowOnce} disabled={bowsLeft <= 0}>
            กราบพระ
          </PBtn>
          <span class="small bows-hint">กราบแบบเบญจางคประดิษฐ์ ศีรษะ มือ เข่า จรดพื้น</span>
        </div>
      )}

      {phase === 'result' && result && reward && (
        <ResultWindow
          result={result}
          reward={reward}
          mode={mode}
          meaning={chant.meaning}
          onExit={exit}
          onReplay={replay}
          next={next && stageUnlocked(next) ? () => (prayStage.value = null, setTimeout(() => (prayStage.value = next.id), 0)) : undefined}
          onStages={() => (exit(), openPanel('pray'))}
        />
      )}
    </div>
  )
}

function Word({ w, t, j }: { w: TimelineWord; t: number; j?: Judge }) {
  const p = t <= w.start ? 0 : t >= w.start + w.dur ? 1 : (t - w.start) / w.dur
  const state = j ? `done ${j}` : p > 0 ? 'now' : 'wait'
  return (
    <span class={`w ${state}`} style={{ ['--p' as string]: `${Math.round(p * 100)}%` }}>
      {w.text}
    </span>
  )
}

function VoiceMeter({ level, mode }: { level: number; mode: 'voice' | 'tap' }) {
  const n = 12
  const lit = Math.round(level * n)
  return (
    <div class="vmeter" aria-hidden="true">
      <Icon name={mode === 'voice' ? 'mic' : 'lotus'} size={18} />
      {Array.from({ length: n }, (_, i) => (
        <span key={i} class={`seg ${i < lit ? 'on' : ''} ${i >= n - 3 ? 'hot' : ''}`} />
      ))}
    </div>
  )
}

function ResultWindow({
  result,
  reward,
  mode,
  meaning,
  onExit,
  onReplay,
  next,
  onStages,
}: {
  result: ChantResult
  reward: PrayerReward
  mode: 'voice' | 'tap'
  meaning: string
  onExit: () => void
  onReplay: () => void
  next?: () => void
  onStages: () => void
}) {
  const [shown, setShown] = useState(0)
  const [doubled, setDoubled] = useState(false)
  useEffect(() => {
    const ids = [0, 1, 2].map((i) =>
      setTimeout(() => {
        if (i < result.stars) {
          setShown(i + 1)
          sfx.bell(i)
        }
      }, 450 + i * 380),
    )
    return () => ids.forEach(clearTimeout)
  }, [])
  const double = async () => {
    const r = await ads().showRewarded('double_reward')
    if (!r.rewarded) return
    rewardAd('bonus')
    grantMeritRaw(reward.merit)
    setDoubled(true)
    sfx.chime()
  }
  const rows: [string, number][] = [
    ['ความครบถ้วน', result.completeness],
    ['จังหวะ', result.rhythm],
    ['ความต่อเนื่อง', result.flow],
    [mode === 'voice' ? 'เสียงนิ่ง มีสมาธิ' : 'สม่ำเสมอ', result.focus],
  ]
  const mats = Object.entries(reward.mats).filter(([, v]) => (v ?? 0) > 0)
  return (
    <div class="win-backdrop result-back">
      <FxCanvas mode="sparkle" />
      <div class="win titled result-win">
        <div class="title-plate gold win-title">
          <PT text={result.stars ? 'สาธุ สวดได้ดีมาก' : 'ลองอีกครั้งนะ'} size={15} weight={600} {...TONE_TEXT.gold} />
        </div>
        <div class="win-body scroll">
          <div class="res-head">
            <div class={`grade g-${result.grade}`}>
              <PT text={result.grade} size={28} weight={600} color="#fff6dc" shadow="#3b2616" scale={2} />
            </div>
            <div class="col" style={{ gap: '2px' }}>
              <Stars n={shown} size={30} class="res-stars" />
              <PT text={`คะแนน ${result.score}`} size={14} weight={600} {...TONE_TEXT.ink} />
              <span class="small muted">
                ดีเยี่ยม {result.perfect} · ดี {result.good} · พลาด {result.miss} · คอมโบ {result.maxCombo}
              </span>
            </div>
          </div>
          <div class="res-bars">
            {rows.map(([k, v]) => (
              <div class="res-row" key={k}>
                <span class="small">{k}</span>
                <span class="bar green grow">
                  <span style={{ width: `${v}%` }} />
                </span>
                <span class="num small">{v}</span>
              </div>
            ))}
          </div>
          <div class="panel gold res-rewards">
            <Merit n={`+${doubled ? reward.merit * 2 : reward.merit}`} size={20} />
            <Coin n={`+${reward.coins}`} size={20} />
            {mats.map(([k, v]) => (
              <MatChip key={k} id={k as MaterialId} n={v ?? 0} />
            ))}
          </div>
          <div class="small muted center">
            {reward.firstClear && 'ผ่านด่านครั้งแรก! '}
            {reward.best && !reward.firstClear && 'ทำคะแนนดีที่สุดใหม่! '}
            {reward.goalDone && 'ครบเป้าสวดมนต์วันนี้ +30 เหรียญ '}
            {reward.streak > 1 && `สวดต่อเนื่อง ${reward.streak} วัน`}
          </div>
          <p class="small pray-meaning">{meaning}</p>
        </div>
        <div class="win-foot col" style={{ gap: '2px' }}>
          {next && (
            <PBtn tone="green" block icon="play" onClick={next}>
              ด่านถัดไป
            </PBtn>
          )}
          <div class="row" style={{ width: '100%' }}>
            <PBtn tone="wood" class="grow" icon="retry" onClick={onReplay}>
              สวดอีก
            </PBtn>
            <PBtn tone="paper" class="grow" icon="book" onClick={onStages}>
              เลือกด่าน
            </PBtn>
          </div>
          <div class="row" style={{ width: '100%' }}>
            {!doubled && adsLeft() > 0 && (
              <PBtn tone="blue" size="small" class="grow" icon="tv" onClick={double}>
                บุญ x2
              </PBtn>
            )}
            {!game.value.daily.dedicated && (
              <PBtn tone="pink" size="small" class="grow" icon="vessel" onClick={() => (onExit(), openActivity('dedicate'))}>
                กรวดน้ำ
              </PBtn>
            )}
            <PBtn tone="paper" size="small" class="grow" onClick={onExit}>
              กลับ
            </PBtn>
          </div>
        </div>
      </div>
    </div>
  )
}
