// The core gameplay: chant along with the highlighted syllables. A guide
// (a real recording, the device's Thai voice or a hummed voice, over a drone
// and a wood-block beat) sets the clock. With the microphone the voice is
// judged on timing, flow and steadiness (no speech recognition); without it
// the player taps each word on the beat, and in memory stages picks the
// missing words.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useStage } from '../../activities/kit'
import { PrayerHallScene, type HallTemple, type KneelPose } from '../../scenes/prayer'
import { dollSprite, type DollPose } from '../../art/doll'
import { VoiceInput } from '../../engine/voice'
import { ChantScorer, lineWords, type ChantResult, type Judge } from '../../game/chantScore'
import { CHAPTERS, STAGE_BY_ID, STAGES, HINT_LABEL, chantById, stageRange, stageStarScores, type PrayerStage } from '../../game/data/prayers'
import { StageChips } from '../components/StageChips'
import { verseOf } from '../../game/data/chants'
import { LEAD_IN, pickQuiz, planStage, type QuizWord, type StagePlan } from '../../game/chantTiming'
import { finishPrayer, followingStage, setPrayerMode, stageUnlocked, type PrayerReward } from '../../game/prayer'
import { game } from '../../game/state'
import { adsLeft, grantMeritRaw, rewardAd } from '../../game/actions'
import { ads } from '../../services/ads'
import { openPanel, prayAtHome, prayStage } from '../store'
import { PBtn, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Coin, Icon, Merit } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { MeaningCard } from '../components/MeaningCard'
import { KaraokeLines, wordAt } from '../components/ChantKaraoke'
import { MatChip } from './PrayerSelect'
import type { MaterialId } from '../../game/materials'
import { haptic, sfx } from '../../engine/audio'
import { ChantGuide, pickVoice, primeAudio, primeSpeech, thaiVoice, type GuideVoice } from '../../engine/chantGuide'
import { loadChantAudio, type ChantRecording } from '../../engine/chantSources'
import { chantPrefs, setChantPrefs, chantBookFocus } from '../chantPrefs'
import '../../styles/chant.css'

type Phase = 'intro' | 'chant' | 'paused' | 'bows' | 'result'

const JUDGE_TEXT: Record<Judge, { text: string; color: string; shadow: string }> = {
  perfect: { text: 'ดีเยี่ยม!', color: '#ffe58a', shadow: '#7a4f12' },
  good: { text: 'ดี', color: '#c8f0a8', shadow: '#1f4a26' },
  miss: { text: 'พลาด', color: '#e6dccb', shadow: '#4a3a30' },
}

const VOICE_TEXT: Record<GuideVoice, string> = {
  file: 'เสียงสวดจริง',
  speech: 'เสียงพูดนำสวด',
  hum: 'เสียงฮัมนำจังหวะ',
  none: 'ไม่มีเสียงนำ',
}

const POSE: Record<KneelPose, DollPose> = { kneel: 'kneel', wai: 'kneelWai', bow: 'bow', sit: 'sit' }
const MILESTONES = [10, 20, 30, 50, 75, 100]

let voice: VoiceInput | null = null
function mic() {
  if (!voice) voice = new VoiceInput()
  return voice
}

export function PrayerSession() {
  const stageId = prayStage.value!
  const st = STAGE_BY_ID[stageId] ?? STAGES[0]
  const chant = chantById(st.chant)
  const chapter = CHAPTERS.find((c) => c.id === st.chapter)!
  const s = game.value
  const range = stageRange(st)
  const prefs = chantPrefs.value

  const [phase, setPhase] = useState<Phase>('intro')
  const [mode, setMode] = useState<'voice' | 'tap'>(s.prayer.mode)
  const [micMsg, setMicMsg] = useState<string | null>(null)
  const [, force] = useState(0)
  const [popups, setPopups] = useState<{ id: number; j: Judge; note?: string }[]>([])
  const [banner, setBanner] = useState<{ id: number; n: number } | null>(null)
  const [result, setResult] = useState<ChantResult | null>(null)
  const [reward, setReward] = useState<PrayerReward | null>(null)
  const [bowsLeft, setBowsLeft] = useState(st.bows)
  const [recs, setRecs] = useState<ChantRecording[] | undefined>(undefined)
  const [tts, setTts] = useState<SpeechSynthesisVoice | null | undefined>(undefined)
  const [caption, setCaption] = useState(prefs.caption && (st.hint === 'learn' || st.hint === 'read'))
  const [starting, setStarting] = useState(false)

  const guide = useRef<ChantGuide | null>(null)
  const plan = useRef<StagePlan | null>(null)
  const scorer = useRef<ChantScorer | null>(null)
  const quiz = useRef<Map<number, QuizWord>>(new Map())
  const tNow = useRef(0)
  const level = useRef(0)
  const judged = useRef<(Judge | undefined)[]>([])
  const popId = useRef(0)
  const bowQueue = useRef(new Set<number>())
  const lastFrame = useRef(0)
  const wrongPick = useRef<{ i: number; k: number } | null>(null)
  const loads = useRef<{ recs: Promise<ChantRecording[]>; tts: Promise<SpeechSynthesisVoice | null> } | null>(null)

  const temple: HallTemple = prayAtHome.value ? 'home' : (chapter.hall as HallTemple)
  const deity = st.chant === 'ganesha' || st.chant === 'guanyin' || st.chant === 'lakshmi' ? st.chant : st.chant === 'deva_set' ? 'ganesha' : undefined
  const { host, scene } = useStage(
    () =>
      new PrayerHallScene({
        temple,
        deity,
        look: s.player.look,
        // The karaoke card covers the bottom ~30%: kneel just above it.
        safe: { top: 0.1, bottom: 0.36, player: 0.12 },
        playerSprite: (pose, blink) => dollSprite(s.player.look, POSE[pose], { view: 'back', blink, barefoot: true }),
      }),
    { targetWidth: 200 },
  )

  useEffect(() => {
    scene.current?.setPose('kneel')
    let alive = true
    const r = loadChantAudio(st.chant).catch(() => [] as ChantRecording[])
    const v = thaiVoice()
    loads.current = { recs: r, tts: v }
    r.then((x) => alive && setRecs(x))
    v.then((x) => alive && setTts(x))
    return () => {
      alive = false
      mic().stop()
      guide.current?.stop()
      guide.current = null
    }
  }, [stageId])

  // ---- main loop ---------------------------------------------------------
  useEffect(() => {
    if (phase !== 'chant') return
    let raf = 0
    lastFrame.current = performance.now()
    let chantPhase = false
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrame.current) / 1000)
      lastFrame.current = now
      const g = guide.current
      const sc = scorer.current
      const p = plan.current
      if (!g || !sc || !p) return
      g.update()
      const t = g.now()
      tNow.current = t
      if (mode === 'voice') {
        const f = mic().read(dt)
        sc.feed({ ...f, t })
        level.current = f.active ? Math.max(0.15, f.loudness) : 0
      } else {
        sc.advance(t)
        level.current = Math.max(0, level.current - dt * 3)
      }
      scene.current?.setVoice(level.current)
      scene.current?.setFocus(Math.min(1, sc.combo / 12))
      if (!chantPhase && t >= LEAD_IN - 0.25) {
        chantPhase = true
        scene.current?.setPhase('chant')
      }
      for (const w of p.words)
        if (w.bow && t > w.start + w.dur + 0.1 && !bowQueue.current.has(w.index)) {
          bowQueue.current.add(w.index)
          scene.current?.bow()
        }
      force((n) => (n + 1) & 0xffff)
      if (t >= p.total) {
        const r = sc.finish()
        setResult(r)
        mic().stop()
        g.stop()
        scene.current?.setPose('wai')
        setPhase('bows')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const key = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return
      e.preventDefault()
      tap()
    }
    window.addEventListener('keydown', key)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', key)
    }
  }, [phase, mode])

  const pop = (j: Judge, note?: string) => {
    const id = ++popId.current
    setPopups((p) => [...p.slice(-2), { id, j, note }])
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900)
  }

  const onJudge = (i: number, j: Judge) => {
    judged.current[i] = j
    const sc = scorer.current
    scene.current?.hit(j === 'perfect' ? 'perfect' : j === 'good' ? 'good' : 'miss')
    if (j === 'perfect') sfx.sparkle()
    else if (j === 'miss') haptic(20)
    let note: string | undefined
    if (j === 'good' && sc?.mode === 'tap' && !quiz.current.has(i)) {
      const off = sc.tapOffset(i)
      if (off !== null) note = off < 0 ? 'เร็วไปนิด' : 'ช้าไปนิด'
    }
    pop(j, note)
    const combo = sc?.combo ?? 0
    if (j !== 'miss' && MILESTONES.includes(combo)) {
      setBanner({ id: popId.current, n: combo })
      scene.current?.milestone(Math.min(4, MILESTONES.indexOf(combo) + 1))
      sfx.chime()
      haptic(30)
    }
  }

  const begin = async (m: 'voice' | 'tap') => {
    if (starting) return
    // Still inside the tap: unlock media and speech for later (iOS).
    const primed = recs?.length && st.hint !== 'memory' ? primeAudio(recs.map((r) => r.url)) : []
    primeSpeech()
    setStarting(true)
    setMicMsg(null)
    let use = m
    if (m === 'voice') {
      const r = await mic().start()
      if (r !== 'ok') {
        use = 'tap'
        setMicMsg(
          r === 'denied'
            ? 'ใช้ไมค์ในหน้านี้ไม่ได้ เลยสลับเป็นโหมดแตะให้นะ แตะปุ่มทองทุกครั้งที่คำใหม่ไฮไลต์'
            : 'อุปกรณ์นี้ใช้ไมโครโฟนไม่ได้ เลยใช้โหมดแตะตามจังหวะแทนนะ',
        )
      }
    }
    // Wait a moment for the recording and the voice list (they usually are ready).
    const timeout = <T,>(p: Promise<T>, ms: number, dflt: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(dflt), ms))])
    const recordings = recs !== undefined ? recs : await timeout(loads.current!.recs, 2500, [] as ChantRecording[])
    const speech = tts !== undefined ? tts : await timeout(loads.current!.tts, 1200, null)
    setMode(use)
    setPrayerMode(m)
    const p = planStage(st, recordings)
    plan.current = p
    guide.current?.stop()
    guide.current = new ChantGuide({ plan: p, hint: st.hint, pref: chantPrefs.value.guide, recordings, elements: primed, mic: use === 'voice', speechVoice: speech, countIn: true })
    const pool = chant.lines.flatMap(lineWords)
    quiz.current = st.hint === 'memory' && use === 'tap' ? new Map(pickQuiz(p.words, pool, s.prayer.plays + 7, 0.4).map((q) => [q.i, q])) : new Map()
    scorer.current = new ChantScorer(p.words, { mode: use, onJudge, judge: st.judge, stars: stageStarScores(st), quiz: [...quiz.current.keys()] })
    judged.current = []
    bowQueue.current.clear()
    wrongPick.current = null
    scene.current?.setPhase('ready')
    scene.current?.setPose('wai')
    tNow.current = 0
    guide.current.start(0)
    if (import.meta.env.DEV) (window as unknown as { __chant: unknown }).__chant = { guide: guide.current, plan: p, scorer: scorer.current }
    setStarting(false)
    setPhase('chant')
  }

  const tap = () => {
    if (phase !== 'chant' || mode !== 'tap') return
    const g = guide.current
    const sc = scorer.current
    if (!g || !sc) return
    const t = g.now()
    // The quiz chips handle words that are blanks.
    const target = currentTarget(t)
    if (target !== null && quiz.current.has(target)) return
    const j = sc.tap(t)
    level.current = 1
    sfx.tap()
    if (!j) haptic(8)
  }

  const pick = (q: QuizWord, k: number) => {
    const g = guide.current
    const sc = scorer.current
    if (!g || !sc || phase !== 'chant') return
    const ok = k === q.answer
    level.current = 1
    if (!ok) {
      wrongPick.current = { i: q.i, k }
      sfx.error()
      haptic(25)
    } else sfx.tap()
    sc.answer(q.i, g.now(), ok)
  }

  /** The next word still waiting to be judged, if it is close. */
  const currentTarget = (t: number): number | null => {
    const sc = scorer.current
    const p = plan.current
    if (!sc || !p) return null
    const i = sc.judgedCount
    if (i >= p.words.length) return null
    return p.words[i].start - t < 1.2 ? i : null
  }

  const pause = () => {
    if (phase !== 'chant') return
    sfx.tap()
    guide.current?.pause()
    setPhase('paused')
  }

  const resume = () => {
    guide.current?.resume()
    lastFrame.current = performance.now()
    setPhase('chant')
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
        if (rw.passed) {
          scene.current?.finale()
          sfx.merit()
        } else {
          scene.current?.soften()
          sfx.bell(0)
        }
        setPhase('result')
      }
    })
  }

  const exit = () => {
    mic().stop()
    guide.current?.stop()
    prayStage.value = null
  }

  const goStage = (id: string) => {
    guide.current?.stop()
    prayStage.value = null
    setTimeout(() => (prayStage.value = id), 0)
  }

  const next = followingStage(st)

  // ---- render --------------------------------------------------------------
  const t = tNow.current
  const p = plan.current
  const sc = scorer.current
  const inChant = phase === 'chant' || phase === 'paused'
  const combo = sc?.combo ?? 0
  const live = sc?.liveScore() ?? 0
  const thresholds = stageStarScores(st)
  const curWord = p ? wordAt(p.words, t) : 0
  const curLine = p && t >= (p.words[0]?.start ?? 0) ? (p.words[curWord]?.line ?? 0) : 0
  const verse = p ? verseOf(chant, p.src[curLine] ?? 0) : null
  const target = inChant && mode === 'tap' ? currentTarget(t) : null
  const q = target !== null ? quiz.current.get(target) : undefined
  const count = t < LEAD_IN ? 3 - Math.floor(t / 0.8) : 0
  const nextWord = p && target !== null ? p.words[target] : null
  const approach = st.hint === 'learn' && mode === 'tap' && nextWord && !q ? Math.max(0, Math.min(1, (nextWord.start - t) / 0.8)) : -1
  const expectPlan = useMemo(() => (recs?.length ? planStage(st, recs) : null), [recs, stageId])
  const expectVoice = pickVoice({ pref: prefs.guide, hint: st.hint, hasFile: expectPlan?.source === 'file', hasSpeech: !!tts })
  const voiceNow = guide.current?.voice ?? expectVoice

  return (
    <div class={`pray phase-${phase}`}>
      <div class="stage-host" ref={host} onPointerDown={phase === 'chant' && mode === 'tap' ? tap : undefined} />

      {inChant && (
        <div class="pray-top">
          <button class="btn dark small icon-btn" aria-label={phase === 'paused' ? 'สวดต่อ' : 'พัก'} onClick={() => (phase === 'paused' ? resume() : pause())}>
            <Icon name={phase === 'paused' ? 'play' : 'pause'} size={18} />
          </button>
          <div class="pray-title ch-title">
            <PT text={st.big ? `ด่านบอส ${st.n}` : `ด่าน ${st.n}`} size={11} weight={600} color="#fff6dc" shadow="#2a1a10" />
            <span class="ch-title-name">{chant.name}</span>
          </div>
          <button class={`btn dark small icon-btn ${caption ? 'on' : ''}`} aria-label="ความหมายของบทนี้" aria-pressed={caption} onClick={() => (sfx.tap(), setCaption(!caption), setChantPrefs({ caption: !caption }))}>
            <Icon name="book" size={18} />
          </button>
        </div>
      )}

      {inChant && (
        <div class="ch-hud">
          <div class="ch-meter" aria-label={`คะแนนตอนนี้ประมาณ ${live}`}>
            <span class="ch-meter-fill" style={{ width: `${live}%` }} />
            {thresholds.map((v, i) => (
              <span key={i} class={`ch-meter-star ${live >= v ? 'lit' : ''}`} style={{ left: `${v}%` }}>
                <Icon name={live >= v ? 'star' : 'star_empty'} size={i === 0 ? 20 : 16} />
                {i === 0 && <span class="ch-meter-pass">ผ่าน</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {inChant && combo >= 3 && (
        <div class={`ch-combo ${combo >= 20 ? 'hot' : ''}`} key={combo}>
          <PT text={combo} size={20} weight={600} color="#ffe58a" shadow="#7a4f12" scale={2} />
          <PT text="คอมโบ" size={11} weight={600} color="#fff6dc" shadow="#7a4f12" />
        </div>
      )}

      {inChant && caption && verse && t >= LEAD_IN - 0.5 && (
        <div class="ch-caption" key={verse.from}>
          <Icon name="book" size={14} /> {verse.text}
        </div>
      )}

      {banner && inChant && (
        <div class="ch-banner" key={banner.id} onAnimationEnd={() => setBanner(null)}>
          <PT text={`คอมโบ ${banner.n}!`} size={18} weight={600} color="#fff6dc" shadow="#7a4f12" scale={3} />
          <span class="ch-banner-sub">สมาธิดีมาก สาธุ</span>
        </div>
      )}

      {micMsg && inChant && t < LEAD_IN + 4 && (
        <div class="mic-note panel dark small" role="status">
          <Icon name="mic_off" size={16} /> {micMsg}
        </div>
      )}

      {phase === 'chant' && count > 0 && (
        <div class="pray-count" key={count}>
          <PT text={count} size={28} weight={600} color="#fff6dc" shadow="#7a4f12" scale={3} />
        </div>
      )}

      {inChant && p && (
        <div class="karaoke win ch-kara">
          <div class="ch-kara-top">
            <span class="ch-progress">
              <span style={{ width: `${Math.min(100, (t / p.total) * 100)}%` }} />
            </span>
            <span class={`ch-voice-chip ${voiceNow}`}>
              <Icon name={voiceNow === 'none' ? 'music' : 'bell'} size={12} /> {VOICE_TEXT[voiceNow]}
            </span>
          </div>
          <KaraokeLines plan={p} t={t} hint={st.hint} judged={judged.current} quiz={quiz.current} />
          <div class="kara-pop">
            {popups.map((x) => (
              <span class={`pop ${x.j}`} key={x.id}>
                <PT text={JUDGE_TEXT[x.j].text} size={14} weight={600} color={JUDGE_TEXT[x.j].color} shadow={JUDGE_TEXT[x.j].shadow} />
                {x.note && <span class="pop-note">{x.note}</span>}
              </span>
            ))}
          </div>
          {mode === 'tap' ? (
            q ? (
              <div class="ch-quiz" role="group" aria-label="เลือกคำที่หายไป">
                <span class="ch-quiz-label">เลือกคำที่หายไป</span>
                {q.choices.map((c, k) => (
                  <button
                    key={`${q.i}-${k}`}
                    class={`btn ${wrongPick.current?.i === q.i && wrongPick.current.k === k ? 'red' : 'paper'} ch-choice`}
                    onPointerDown={(e) => (e.preventDefault(), pick(q, k))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <div class="ch-tapwrap">
                {approach >= 0 && <span class="ch-approach" style={{ transform: `scale(${1 + approach * 0.35})`, opacity: String(1 - approach * 0.7) }} />}
                <button class="btn gold big block kara-tap" onPointerDown={(e) => (e.preventDefault(), tap())}>
                  <Icon name="lotus" size={26} />
                  <PT text={st.hint === 'memory' ? 'แตะเมื่อถึงคำ' : 'แตะเมื่อคำเริ่ม'} size={14} weight={600} {...TONE_TEXT.gold} />
                </button>
              </div>
            )
          ) : (
            <div class="kara-hint small">{st.hint === 'memory' ? 'ท่องจากความจำ เปล่งเสียงให้ตรงจังหวะช่องว่าง' : 'เปล่งเสียงสวดตามพยางค์ที่ไฮไลต์ ช้า ๆ สม่ำเสมอ'}</div>
          )}
        </div>
      )}

      {phase === 'intro' && (
        <Window
          title={st.big ? `ด่านบอส ${st.n}` : `ด่าน ${st.n}`}
          icon="pray"
          tone={st.big ? 'gold' : 'green'}
          backdrop={false}
          class="pray-intro ch-intro"
          onClose={exit}
          footer={
            <div class="col" style={{ width: '100%', gap: '2px' }}>
              <PBtn tone="green" size="big" block icon="mic" disabled={starting} onClick={() => void begin('voice')}>
                สวดด้วยเสียงจริง
              </PBtn>
              <PBtn tone="wood" block icon="lotus" disabled={starting} onClick={() => void begin('tap')}>
                แตะตามจังหวะ (เงียบ ๆ)
              </PBtn>
            </div>
          }
        >
          <PT text={chant.name} size={13} weight={600} {...TONE_TEXT.ink} />
          <StageChips st={st} />
          {(st.hint === 'memory' || st.hint === 'fade' || st.big) && (
            <p class={`ch-hint-note hint-${st.hint}`}>
              {st.big ? 'ด่านบอส: สวดทั้งบทรวดเดียว ตั้งสมาธิให้ดี · ' : ''}
              {HINT_LABEL[st.hint].name}: {HINT_LABEL[st.hint].desc}
            </p>
          )}
          <MeaningCard chant={chant} range={range} scale={2} />
          <div class="ch-guide-row small">
            <Icon name="bell" size={14} />
            <span class="grow">
              เสียงนำ: <b>{recs === undefined ? 'กำลังเตรียม…' : VOICE_TEXT[expectVoice]}</b>
              {expectVoice === 'file' && recs && recs.length > 1 && ` (ต่อกัน ${recs.length} ไฟล์)`}
              {expectVoice === 'file' && recs?.some((r) => r.timingFrom === 'auto') && ' (จังหวะอัตโนมัติ)'}
            </span>
            <button class="chip small" onClick={() => (sfx.tap(), setChantPrefs({ guide: prefs.guide === 'auto' ? 'hum' : prefs.guide === 'hum' ? 'off' : 'auto' }))}>
              {prefs.guide === 'auto' ? 'อัตโนมัติ' : prefs.guide === 'hum' ? 'ฮัมอย่างเดียว' : prefs.guide === 'off' ? 'ปิดเสียงนำ' : 'เสียงพูด'}
            </button>
            <button class="chip small" onClick={() => (sfx.tap(), exit(), (chantBookFocus.value = chant.parts ? chant.parts[0] : chant.id), openPanel('chants'))}>
              นำเข้าเสียงสวด
            </button>
          </div>
          {mode === 'voice' && <p class="small muted">ใส่หูฟังจะนับคะแนนเสียงได้แม่นขึ้น · สวดด้วยไมค์ได้บุญมากกว่า 25%</p>}
          {micMsg && <p class="field-err">{micMsg}</p>}
        </Window>
      )}

      {phase === 'paused' && (
        <Window
          title="พักสักครู่"
          icon="pause"
          onClose={resume}
          footer={
            <>
              <PBtn tone="red" icon="close" onClick={exit}>
                ออก
              </PBtn>
              <PBtn tone="green" icon="play" onClick={resume}>
                สวดต่อ
              </PBtn>
            </>
          }
        >
          <p class="small">หายใจเข้าลึก ๆ แล้วค่อยสวดต่อนะ</p>
          <MeaningCard chant={chant} range={range} verse={verse ? Math.max(0, (chant.verses ?? []).filter((v) => v.to > range[0] && v.from < range[1]).indexOf(verse)) : undefined} />
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
        <StageClear
          st={st}
          result={result}
          reward={reward}
          mode={mode}
          onExit={exit}
          onReplay={() => goStage(stageId)}
          next={next && stageUnlocked(next) ? () => goStage(next.id) : undefined}
          onStages={() => (exit(), openPanel('pray'))}
        />
      )}
    </div>
  )
}

const CHEER_CLOSE = ['อีกนิดเดียวก็ผ่านแล้ว สู้ ๆ!', 'เกือบ ๆ แล้ว รอบหน้าผ่านแน่นอน']
const CHEER_FAIL = ['ไม่เป็นไรนะ ค่อย ๆ ฝึก พระท่านไม่รีบ', 'ใจเย็น ๆ หายใจลึก ๆ แล้วลองใหม่', 'สวดผิดไม่บาปนะ ตั้งใจก็ได้บุญแล้ว']

function failTip(st: PrayerStage, r: ChantResult, mode: 'voice' | 'tap'): string {
  if (st.hint === 'memory') return 'ลองเปิดหนังสือสวดมนต์ อ่านบทนี้สักรอบก่อน แล้วค่อยมาท่องจำ'
  if (r.miss > r.perfect + r.good) return mode === 'tap' ? 'ฟังเสียงเกราะ "ก๊อก" แล้วแตะพร้อมเสียง ตอนคำเริ่มไฮไลต์' : 'เปล่งเสียงให้ดังขึ้นอีกนิด ทุกคำที่ไฮไลต์'
  if (r.rhythm < 60) return 'ลองแตะให้ตรงตอนคำเริ่มพอดี ไม่ต้องรีบ ไม่ต้องรอ'
  return 'ต่อคอมโบให้ยาว ๆ คะแนนความต่อเนื่องจะพุ่ง'
}

function StageClear({
  st,
  result,
  reward,
  mode,
  onExit,
  onReplay,
  next,
  onStages,
}: {
  st: PrayerStage
  result: ChantResult
  reward: PrayerReward
  mode: 'voice' | 'tap'
  onExit: () => void
  onReplay: () => void
  next?: () => void
  onStages: () => void
}) {
  const chant = chantById(st.chant)
  const [shown, setShown] = useState(0)
  const [score, setScore] = useState(0)
  const [doubled, setDoubled] = useState(false)
  const [showMeaning, setShowMeaning] = useState(false)
  const passed = reward.passed
  const close = result.score >= reward.passMark - 12
  const cheer = useMemo(() => {
    const list = close ? CHEER_CLOSE : CHEER_FAIL
    return list[(result.score + st.n) % list.length]
  }, [])
  useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const up = () => {
      const k = Math.min(1, (performance.now() - t0) / 900)
      setScore(Math.round(result.score * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(up)
    }
    raf = requestAnimationFrame(up)
    const ids = [0, 1, 2].map((i) =>
      setTimeout(
        () => {
          if (i < result.stars) {
            setShown(i + 1)
            sfx.bell(i * 2)
            haptic(12)
          }
        },
        700 + i * 420,
      ),
    )
    return () => (cancelAnimationFrame(raf), ids.forEach(clearTimeout))
  }, [])
  const double = async () => {
    const r = await ads().showRewarded('double_reward')
    if (!r.rewarded) return
    rewardAd('bonus')
    grantMeritRaw(reward.merit)
    setDoubled(true)
    sfx.chime()
  }
  const mats = Object.entries(reward.mats).filter(([, v]) => (v ?? 0) > 0)
  const nextSt = followingStage(st)
  const opened = reward.chaptersOpened.map((id) => CHAPTERS.find((c) => c.id === id)?.name).filter(Boolean)
  return (
    <div class="win-backdrop result-back">
      {passed && <FxCanvas mode={result.stars >= 3 ? 'confetti' : 'sparkle'} />}
      <div class={`win titled result-win ch-clear ${passed ? 'pass' : 'fail'}`}>
        <div class={`title-plate ${passed ? 'gold' : 'wood'} win-title`}>
          <PT text={passed ? (result.stars >= 3 ? 'สมบูรณ์แบบ!' : st.big ? 'ชนะด่านบอส!' : 'ผ่านด่าน!') : close ? 'เกือบแล้ว!' : 'ลองอีกนิดนะ'} size={15} weight={600} {...(passed ? TONE_TEXT.gold : TONE_TEXT.wood)} />
        </div>
        <div class="win-body scroll">
          <div class="ch-stars-big">
            {[0, 1, 2].map((i) => (
              <span key={i} class={`ch-bigstar s${i} ${i < shown ? 'on' : ''}`}>
                <Icon name={i < shown ? 'star' : 'star_empty'} size={i === 1 ? 54 : 44} />
              </span>
            ))}
          </div>
          <div class="ch-score">
            <PT text={score} size={24} weight={600} color={passed ? '#b27418' : '#6b4d34'} scale={2} />
            <span class="small muted">คะแนน · ต้องได้ {reward.passMark} เพื่อผ่าน</span>
          </div>
          <div class="ch-score-bar">
            <span class="fill" style={{ width: `${score}%` }} />
            <span class="mark" style={{ left: `${reward.passMark}%` }} />
          </div>
          {!passed && (
            <div class="ch-cheer panel">
              <b class="ch-cheer-title">{cheer}</b>
              <span class="small">{failTip(st, result, mode)}</span>
            </div>
          )}
          <div class="ch-stats">
            <span class="perfect">
              <b>{result.perfect}</b> ดีเยี่ยม
            </span>
            <span class="good">
              <b>{result.good}</b> ดี
            </span>
            <span class="miss">
              <b>{result.miss}</b> พลาด
            </span>
            <span class="combo">
              <b>{result.maxCombo}</b> คอมโบ
            </span>
          </div>
          <div class="panel gold res-rewards">
            <Merit n={`+${doubled ? reward.merit * 2 : reward.merit}`} size={20} />
            <Coin n={`+${reward.coins}`} size={20} />
            {mats.map(([k, v]) => (
              <MatChip key={k} id={k as MaterialId} n={v ?? 0} />
            ))}
          </div>
          <div class="small muted center ch-notes">
            {reward.unlockedNext && nextSt && <div class="ch-unlock">ปลดล็อกด่าน {nextSt.n} แล้ว!</div>}
            {opened.length > 0 && <div class="ch-unlock">เปิดวัดใหม่: {opened.join(', ')}</div>}
            {reward.firstClear && 'ผ่านด่านครั้งแรก! '}
            {reward.best && !reward.firstClear && 'ทำคะแนนดีที่สุดใหม่! '}
            {reward.goalDone && 'ครบเป้าสวดมนต์วันนี้ +30 เหรียญ '}
            {reward.streak > 1 && `สวดต่อเนื่อง ${reward.streak} วัน`}
          </div>
          <button class="ch-meaning-toggle" onClick={() => (sfx.tap(), setShowMeaning(!showMeaning))} aria-expanded={showMeaning}>
            <Icon name="book" size={16} /> ความหมายของบทนี้ {showMeaning ? '▴' : '▾'}
          </button>
          {showMeaning && <MeaningCard chant={chant} range={stageRange(st)} compact />}
        </div>
        <div class="win-foot col" style={{ gap: '2px' }}>
          {passed && next && (
            <PBtn tone="green" block icon="play" onClick={next}>
              ด่านถัดไป
            </PBtn>
          )}
          {!passed && (
            <PBtn tone="green" block icon="retry" onClick={onReplay}>
              ลองอีกครั้ง
            </PBtn>
          )}
          <div class="row" style={{ width: '100%', gap: '2px' }}>
            {passed && (
              <PBtn tone="wood" size="small" class="grow" onClick={onReplay}>
                สวดอีก
              </PBtn>
            )}
            <PBtn tone="paper" size="small" class="grow" onClick={onStages}>
              แผนที่
            </PBtn>
            <PBtn tone="paper" size="small" class="grow" onClick={onExit}>
              กลับ
            </PBtn>
          </div>
          {!doubled && adsLeft() > 0 && (
            <PBtn tone="blue" size="small" block icon="tv" onClick={double}>
              ดูโฆษณา บุญ x2
            </PBtn>
          )}
        </div>
      </div>
    </div>
  )
}
