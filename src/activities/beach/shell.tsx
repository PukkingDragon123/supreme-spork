// The frame every beach mini-game runs in: the brief card (host, what to
// do, price and deals; paying happens there), a 3-2-1 countdown, the live
// HUD (goal, timer, meter with star marks), speech bubbles and praise, the
// star reveal and a result card with merit, coins, shells found and new
// fish for the log.

import { useEffect, useRef, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { BEACH_GAMES, type BeachGameId } from '../../game/data/beaches'
import { beachFullLeft, finishBeachRound, type BeachRoundResult } from '../../game/beach'
import { COLLECTIBLE_BY_ID, RARITY_INFO } from '../../game/data/collectibles'
import { collectibleUrl } from '../../art/collectibles'
import { closeActivity, coinStoreOpen } from '../../ui/store'
import { useStage } from '../kit'
import { PBtn, Window } from '../../ui/components/kit'
import { Bar, Coin, Icon, Merit } from '../../ui/components/common'
import { FxCanvas } from '../../ui/components/FxCanvas'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { haptic, sfx } from '../../engine/audio'
import { spriteDataUrl } from '../../engine/sprite'
import { workerCard, type CardMood } from '../../art/workActor'
import { fmtTime, type Bubble, type JobSummary, type Praise } from '../jobs/base'
import type { JobStars } from '../../game/jobs'
import { FISH_BY_ID } from './rules'
import type { BeachScene } from './base'
import { BriefCard } from './brief'

const STAR_WORDS = ['ลองใหม่อีกนิดนะ', 'ดีแล้ว', 'เก่งมาก', 'ยอดเยี่ยม!']
const PRAISE_TONE: Record<Praise['tone'], { color: string; outline: string }> = {
  gold: { color: '#ffe45e', outline: '#7a3a10' },
  pink: { color: '#ffd0e4', outline: '#8e2a5c' },
  blue: { color: '#d4f1ff', outline: '#1f3f70' },
  green: { color: '#d8ffb0', outline: '#1f4a26' },
}
const MOOD: Record<JobStars, CardMood> = { 0: 'phew', 1: 'cheer', 2: 'thumbs', 3: 'thumbs' }

interface Hud {
  goal: string
  progress: number
  stars: JobStars
  left: number
  thresholds: [number, number, number]
  bubbles: Bubble[]
  praises: Praise[]
}

function BeachResult({ id, stars, summary, res, onAgain }: { id: BeachGameId; stars: JobStars; summary: JobSummary; res: BeachRoundResult; onAgain: () => void }) {
  const def = BEACH_GAMES[id]
  const [shown, setShown] = useState(0)
  const look = game.value.player.look
  const urls = [0, 1].map((f) => spriteDataUrl(workerCard(look, MOOD[stars], f as 0 | 1), 3))
  useEffect(() => {
    sfx.merit()
    const ids: number[] = []
    for (let i = 1; i <= stars; i++) ids.push(window.setTimeout(() => (setShown(i), sfx.sparkle(), haptic(10)), 260 + i * 300))
    return () => ids.forEach(clearTimeout)
  }, [])
  const left = beachFullLeft(id)
  return (
    <div class="modal-backdrop celebrate">
      <FxCanvas mode={stars >= 2 ? 'confetti' : 'sparkle'} />
      <div class="panel modal center result-card bchx-result">
        <div class="bchx-hero">
          <img class="px a" src={urls[0]} alt="" width={138} height={180} draggable={false} />
          <img class="px b" src={urls[1]} alt="" width={138} height={180} draggable={false} />
        </div>
        <div class="stars-row" aria-label={`${stars} ดาว`}>
          {[0, 1, 2].map((i) => (
            <span key={i} class={`bchx-bigstar ${shown > i ? 'on' : ''}`}>
              <Icon name={shown > i ? 'star' : 'star_empty'} size={i === 1 ? 40 : 32} />
            </span>
          ))}
        </div>
        <PT text={STAR_WORDS[stars]} size={15} weight={600} color={stars >= 2 ? '#ffe45e' : '#d4f1ff'} outline={stars >= 2 ? '#7a3a10' : '#1f3f70'} scale={2} />
        <div class="title">{summary.title ?? `${def.name} เสร็จแล้ว!`}</div>
        <div class="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: '6px' }}>
          {res.merit > 0 && (
            <span class="chip pink big-chip">
              <Merit n={`+${res.merit}`} size={20} /> <span class="small">บุญ</span>
            </span>
          )}
          {res.coins > 0 && (
            <span class="chip gold big-chip">
              <Coin n={`+${res.coins}`} size={20} />
            </span>
          )}
        </div>
        {Object.keys(res.finds).length > 0 && (
          <div class="bchx-finds">
            {Object.entries(res.finds).map(([cid, n]) => {
              const c = COLLECTIBLE_BY_ID[cid]
              if (!c) return null
              return (
                <div class="bchx-find" key={cid} style={{ '--rc': RARITY_INFO[c.rarity].color } as never}>
                  <img src={collectibleUrl(c, 2)} alt="" width={52} height={52} />
                  <span class="small">
                    {c.name}
                    {n > 1 ? ` ×${n}` : ''}
                  </span>
                  <span class="small muted">{RARITY_INFO[c.rarity].name}</span>
                </div>
              )
            })}
          </div>
        )}
        <div class="bchx-lines">
          {summary.lines.map((l) => (
            <div class="small muted" key={l}>
              {l}
            </div>
          ))}
          {res.newFish.length > 0 && <div class="small">สมุดปลาใหม่: {res.newFish.map((f) => FISH_BY_ID[f]?.name ?? f).join(' · ')}</div>}
          {res.best && <div class="small">สถิติใหม่!</div>}
          <div class="small muted">{res.capped ? 'วันนี้รับรางวัลเต็มครบแล้ว รอบนี้ได้ 25%' : left > 0 ? `รางวัลเต็มเหลืออีก ${left} รอบวันนี้` : 'ครบรางวัลเต็มของวันนี้แล้ว'}</div>
        </div>
        <div class="col" style={{ marginTop: '6px', width: '100%' }}>
          <PBtn tone="paper" block onClick={onAgain}>
            เล่นอีกรอบ
          </PBtn>
          <PBtn tone="green" block onClick={closeActivity}>
            {def.merit > 0 ? 'สาธุ ๆ ๆ' : 'กลับไปเที่ยวหาดต่อ'}
          </PBtn>
        </div>
      </div>
    </div>
  )
}

export function BeachRun({ id, make, onAgain, tw = 190 }: { id: BeachGameId; make: () => BeachScene; onAgain: () => void; tw?: number }) {
  const def = BEACH_GAMES[id]
  const { host, scene, stage } = useStage(make, { targetWidth: tw })
  const topRef = useRef<HTMLDivElement>(null)
  const botRef = useRef<HTMLDivElement>(null)
  const [brief, setBrief] = useState(true)
  const [quit, setQuit] = useState(false)
  const [count, setCount] = useState<string | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [reveal, setReveal] = useState<{ stars: JobStars; shown: number } | null>(null)
  const [result, setResult] = useState<{ stars: JobStars; summary: JobSummary; res: BeachRoundResult } | null>(null)
  const timers = useRef<number[]>([])
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

  const onDone = (stars: JobStars, summary: JobSummary) => {
    const sc = scene.current
    const res = finishBeachRound(id, stars, sc?.stats() ?? {})
    haptic(30)
    setReveal({ stars, shown: 0 })
    for (let i = 1; i <= 3; i++)
      later(250 + i * 330, () => {
        setReveal({ stars, shown: i })
        if (i <= stars) sfx.sparkle()
      })
    later(1700, () => {
      setReveal(null)
      setResult({ stars, summary, res })
    })
  }

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    measure()
    sc.onDone = onDone
    const iv = window.setInterval(() => {
      const s = scene.current
      if (!s) return
      measure()
      setHud({ goal: s.goalText(), progress: s.progress(), stars: s.stars(), left: s.timeLeft, thresholds: s.thresholds, bubbles: [...s.bubbles], praises: [...s.praises] })
    }, 100)
    ;(window as unknown as { __beachScene?: BeachScene }).__beachScene = sc
    return () => {
      clearInterval(iv)
      for (const t of timers.current) clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (scene.current) scene.current.paused = brief || quit
  }, [brief, quit, scene.current])

  const start = () => {
    setBrief(false)
    const steps = ['3', '2', '1', 'เริ่ม!']
    steps.forEach((s, i) =>
      later(i * 550, () => {
        setCount(s)
        if (i < 3) sfx.tap()
        else {
          sfx.chime()
          scene.current?.start()
        }
      }),
    )
    later(steps.length * 550 + 200, () => setCount(null))
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
          <PT text={def.name} size={12} weight={600} {...TONE_TEXT.wood} />
        </div>
        <button class="hud2-coins" onClick={() => (coinStoreOpen.value = true)} aria-label="เติมบุญคอยน์">
          <Icon name="coin" size={18} />
          <PT text={game.value.coins.toLocaleString('en-US')} size={13} weight={600} {...TONE_TEXT.wood} />
        </button>
      </div>
      {hud?.bubbles.map((b) => {
        const [x, y] = stage.current?.toCss(b.x, b.y) ?? [0, 0]
        return (
          <div key={b.id} class={`bchx-bubble ${b.tone}`} style={{ left: `${x}px`, top: `${y}px` }}>
            <PT text={b.text} size={11} weight={600} color={b.tone === 'warn' ? '#8e2a2a' : '#3b2616'} />
          </div>
        )
      })}
      {hud?.praises.slice(-1).map((p) => (
        <div key={p.id} class="bchx-praise">
          <PT text={p.text} size={p.text.length > 10 ? 18 : 22} weight={600} color={PRAISE_TONE[p.tone].color} outline={PRAISE_TONE[p.tone].outline} scale={2} />
        </div>
      ))}
      {count && (
        <div class="act-center">
          <div key={count} class="bchx-count">
            <PT text={count} size={count.length > 1 ? 22 : 30} weight={600} color="#fffaf0" outline="#3a2838" scale={3} />
          </div>
        </div>
      )}
      {!result && !brief && (
        <div class="act-bottom" ref={botRef}>
          <div class="panel act-tip bchx-hud">
            <div class="bchx-row">
              <span class="bchx-goal">
                <Icon name={def.icon} size={20} />
                <PT text={hud?.goal ?? def.goal} size={12} weight={600} {...TONE_TEXT.ink} />
              </span>
              <span class={`bchx-time ${low ? 'low' : ''}`}>
                <PT text={fmtTime(hud?.left ?? def.time)} size={12} weight={600} color="#fff1d6" />
              </span>
            </div>
            <div class="bchx-meter">
              <Bar value={pct} max={100} tone="green" label="คะแนน" />
              {(hud?.thresholds ?? [1 / 3, 2 / 3, 1]).map((t, i) => (
                <span key={i} class={`bchx-star ${(hud?.stars ?? 0) > i ? 'on' : ''}`} style={{ left: `${t * 100}%` }}>
                  <Icon name={(hud?.stars ?? 0) > i ? 'star' : 'star_empty'} size={20} />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {reveal && (
        <div class="bchx-done">
          <PT text={reveal.stars >= 3 ? 'ยอดเยี่ยม!' : reveal.stars >= 1 ? 'เสร็จแล้ว!' : 'หมดเวลา'} size={20} weight={600} color="#fffaf0" outline="#3a2838" scale={3} />
          <div class="stars-row">
            {[0, 1, 2].map((i) => (
              <span key={i} class={`bchx-bigstar ${reveal.shown > i && reveal.stars > i ? 'on' : ''}`}>
                <Icon name={reveal.stars > i ? 'star' : 'star_empty'} size={52} />
              </span>
            ))}
          </div>
        </div>
      )}
      {brief && <BriefCard id={id} onPlay={start} onBack={closeActivity} />}
      {quit && (
        <Window
          title="ออกจากกิจกรรมนี้?"
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
          <p class="goal-main">รอบนี้จะยังไม่ได้รับรางวัลนะ (ค่าเล่นที่จ่ายแล้วไม่คืน)</p>
        </Window>
      )}
      {result && <BeachResult id={id} stars={result.stars} summary={result.summary} res={result.res} onAgain={onAgain} />}
    </div>
  )
}
