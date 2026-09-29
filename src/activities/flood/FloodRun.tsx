// หนีภัยน้ำท่วม run screen: how-to card, 3-2-1, live HUD (timer, rescues,
// seats, water meter), speech bubbles and the results with pass progress.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { game, mutate } from '../../game/state'
import { track } from '../../game/actions'
import { eventDef, eventProgress, finishRun, type RunReward } from '../../game/liveEvents'
import { tierProgress } from '../../game/battlepass'
import { useStage } from '../kit'
import { PBtn, Window } from '../../ui/components/kit'
import { Coin, Icon, Merit } from '../../ui/components/common'
import { FxCanvas } from '../../ui/components/FxCanvas'
import { PT, TONE_TEXT, renderPixelText } from '../../ui/pixeltext'
import { spriteDataUrl } from '../../engine/sprite'
import { haptic, sfx } from '../../engine/audio'
import { survivorSprite } from '../../art/flood'
import { SKIN_TONES } from '../../art/palette'
import { eventIconUrl } from '../../art/eventIcons'
import { FloodScene, type Bubble } from './scene'
import { KINDS, MAX_SEATS, STAR_RESCUES, type FloodSummary, type SurvivorKind } from './sim'
import { floodSfx } from './sfx'
import './flood.css'

const TIP_KEY = 'goal:event:flood'

interface Hud {
  left: number
  rescued: number
  score: number
  seats: number
  aboard: SurvivorKind[]
  level: number
  boost: number
  bubbles: Bubble[]
  done: boolean
  moved: boolean
}

function EvIcon({ name, size = 24 }: { name: string; size?: number }) {
  const scale = Math.max(1, Math.ceil((size * (window.devicePixelRatio || 1)) / 16))
  return <img class="px" src={eventIconUrl(name, scale)} width={size} height={size} alt="" draggable={false} />
}

function Mini({ kind, size = 22 }: { kind: SurvivorKind; size?: number }) {
  const url = useMemo(() => spriteDataUrl(survivorSprite(kind, 0, true), 3), [kind])
  return <img class="px fl-mini" src={url} alt={KINDS[kind].name} style={{ height: `${size}px` }} draggable={false} />
}

const fmt = (s: number) => {
  const n = Math.ceil(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

/** How-to card (first run, or the ? button). */
export function FloodHowTo({ onStart, onClose, again }: { onStart: () => void; onClose: () => void; again?: boolean }) {
  const steps: [string, string][] = [
    ['ev_boat', 'ลากนิ้วที่ไหนก็ได้บนจอเพื่อบังคับเรือกู้ภัย'],
    ['ev_ring', 'จอดนิ่ง ๆ ข้างบ้านหรือคนที่ลอยน้ำ รอวงกลมสีทองเต็มก็ขึ้นเรือ'],
    ['ev_flood', 'เรือจุ 4 ที่ พาทุกคนไปส่งที่วัดบนเนินด้านบน ส่งครบครอบครัวได้โบนัส'],
  ]
  return (
    <Window
      title="หนีภัยน้ำท่วม"
      icon="water"
      onClose={onClose}
      footer={
        <PBtn tone="green" block size="big" icon="play" onClick={onStart}>
          {again ? 'ลุยต่อ' : 'ออกเรือ!'}
        </PBtn>
      }
    >
      <p class="goal-main">น้ำกำลังขึ้น! ช่วยชาวบ้านและน้องสัตว์ให้ได้มากที่สุดใน 90 วินาที</p>
      <ol class="goal-steps fl-steps">
        {steps.map(([ic, s], i) => (
          <li key={i}>
            <span class="goal-n num">{i + 1}</span>
            <EvIcon name={ic} size={26} />
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div class="fl-howto-extra small">
        <span>
          <Mini kind="vipcat" size={18} /> แมวท้อง VIP แต้มเยอะ
        </span>
        <span>
          <Mini kind="buffalo" size={18} /> น้องควายนั่ง 2 ที่
        </span>
        <span>
          <Icon name="rice" size={18} /> ข้าวกล่อง +6 วิ
        </span>
        <span>
          <Icon name="dog" size={18} /> ตูบกู้ภัยช่วยลาก
        </span>
      </div>
      <div class="panel gold goal-reward small">
        <Icon name="gift" size={18} /> ★ ที่ {STAR_RESCUES[0]} / {STAR_RESCUES[1]} / {STAR_RESCUES[2]} ชีวิต · แต้มกู้ภัยใช้ปลดขั้นบัตรผ่าน
      </div>
    </Window>
  )
}

export function FloodRun({ eventId, onExit, onAgain }: { eventId: string; onExit: (claim?: boolean) => void; onAgain: () => void }) {
  const seed = useMemo(() => `${Date.now()}`, [])
  const { host, scene, stage } = useStage(() => new FloodScene(seed), { targetWidth: 190 })
  const topRef = useRef<HTMLDivElement>(null)
  const [intro, setIntro] = useState(() => !game.value.seen.tips.includes(TIP_KEY))
  const [help, setHelp] = useState(false)
  const [quit, setQuit] = useState(false)
  const [count, setCount] = useState<string | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [result, setResult] = useState<{ sum: FloodSummary; reward: RunReward | null } | null>(null)
  const timers = useRef<number[]>([])
  const started = useRef(false)
  const finished = useRef(false)
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
    if (tb) sc.setSafe((tb.bottom - hr.top - off) / k + 2)
  }

  const countdown = () => {
    if (started.current) return
    started.current = true
    const steps = ['3', '2', '1', 'ออกเรือ!']
    steps.forEach((s, i) =>
      later(i * 600, () => {
        setCount(s)
        if (i < 3) floodSfx.tick()
        else {
          sfx.chime()
          scene.current?.start()
        }
      }),
    )
    later(steps.length * 600 + 250, () => setCount(null))
  }

  const finish = () => {
    const sc = scene.current
    if (!sc?.sim || finished.current) return
    finished.current = true
    const sum = sc.sim.summary()
    const reward = finishRun(eventId, { score: sum.score, rescued: sum.rescued, animals: sum.animals, stars: sum.stars })
    track('flood_run')
    if (sum.rescued > 0) track('flood_rescue', sum.rescued)
    haptic(30)
    later(900, () => setResult({ sum, reward }))
  }

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    // Sign on the corner shop, printed with the pixel-text renderer.
    sc.skin = SKIN_TONES[game.value.player.look.skin]?.b
    const sign = renderPixelText('ร้านชำ', { size: 8, weight: 600, color: '#fffaf0', shadow: '#23407a' })
    const img = new Image()
    img.src = sign.url
    sc.setSign(img)
    measure()
    if (!intro) countdown()
    const iv = window.setInterval(() => {
      const s = scene.current
      if (!s?.sim) return
      measure()
      const sim = s.sim
      setHud({
        left: sim.timeLeft,
        rescued: sim.rescued(),
        score: Math.round(sim.score),
        seats: sim.boat.seats,
        aboard: sim.boat.aboard.map((id) => sim.byId(id)?.kind ?? 'kid'),
        level: sim.level,
        boost: sim.boat.boost,
        bubbles: [...s.bubbles],
        done: sim.done,
        moved: s.moved,
      })
      if (sim.done) finish()
    }, 100)
    ;(window as unknown as { __floodScene?: FloodScene }).__floodScene = sc
    return () => {
      clearInterval(iv)
      for (const t of timers.current) clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (scene.current) scene.current.paused = intro || help || quit
  }, [intro, help, quit])

  const start = () => {
    mutate((d) => {
      if (!d.seen.tips.includes(TIP_KEY)) d.seen.tips.push(TIP_KEY)
    })
    setIntro(false)
    setHelp(false)
    countdown()
  }

  const back = () => {
    sfx.close()
    const sim = scene.current?.sim
    if (sim && sim.started && !sim.done) setQuit(true)
    else onExit()
  }

  const low = !!hud && hud.left <= 15 && !hud.done && started.current
  const seatsUsed = (hud?.aboard ?? []).reduce((n, k) => n + KINDS[k].seats, 0)
  const pips: (SurvivorKind | null | 'x')[] = []
  for (const k of hud?.aboard ?? []) {
    pips.push(k)
    if (KINDS[k].seats === 2) pips.push('x')
  }
  while (pips.length < (hud?.seats ?? 4)) pips.push(null)
  const water = Math.round((hud?.level ?? 0) * 100)

  return (
    <div class="activity fl-run">
      <div class="stage-host" ref={host} />
      <div class="fl-top" ref={topRef}>
        <div class="act-top fl-bar">
          <button class="btn paper small icon-btn" onClick={back} aria-label="กลับ">
            <PT text="‹" size={16} weight={600} {...TONE_TEXT.paper} />
          </button>
          <div class="title-plate wood act-title">
            <PT text="หนีภัยน้ำท่วม" size={12} weight={600} {...TONE_TEXT.wood} />
          </div>
          <button class="btn blue small icon-btn" onClick={() => (sfx.open(), setHelp(true))} aria-label="วิธีเล่น">
            <PT text="?" size={14} weight={600} {...TONE_TEXT.blue} />
          </button>
          <span class={`fl-time ${low ? 'low' : ''}`}>
            <PT text={fmt(hud?.left ?? 90)} size={14} weight={600} color="#fff1d6" />
          </span>
        </div>
        <div class="panel fl-hud">
          <div class="fl-hud-row">
            <span class="fl-stat" title="ช่วยได้">
              <Mini kind="kid" size={20} />
              <PT text={`${hud?.rescued ?? 0}`} size={14} weight={600} {...TONE_TEXT.ink} />
            </span>
            <span class="fl-stat" title="แต้มกู้ภัย">
              <EvIcon name="ev_points" size={18} />
              <PT text={`${hud?.score ?? 0}`} size={13} weight={600} {...TONE_TEXT.ink} />
            </span>
            <span class={`fl-seats ${seatsUsed >= (hud?.seats ?? 4) ? 'full' : ''}`} aria-label={`ที่นั่ง ${seatsUsed}/${hud?.seats ?? 4}`}>
              {pips.slice(0, MAX_SEATS).map((p, i) => (
                <span key={i} class={`fl-pip ${p ? 'on' : ''} ${p === 'x' ? 'ext' : ''}`}>
                  {p && p !== 'x' && <Mini kind={p} size={16} />}
                </span>
              ))}
            </span>
          </div>
          <div class={`fl-water ${water >= 70 ? 'high' : ''}`}>
            <span class="fl-water-label">
              <Icon name="water" size={14} />
              <PT text="ระดับน้ำ" size={10} weight={600} {...TONE_TEXT.ink} />
            </span>
            <span class="fl-water-bar">
              <span style={{ width: `${water}%` }} />
              <i />
            </span>
            {!!hud && hud.boost > 0 && (
              <span class="fl-boost">
                <Icon name="dog" size={14} />
                <PT text="เร็วขึ้น!" size={10} weight={600} color="#5a3410" />
              </span>
            )}
          </div>
        </div>
      </div>
      {hud?.bubbles.map((b) => {
        const sc = scene.current
        if (!sc) return null
        const [vx, vy] = sc.toScreen(b.x, b.y)
        const [x, y] = stage.current?.toCss(vx, vy) ?? [0, 0]
        const side = vx < sc.w * 0.3 ? 'l' : vx > sc.w * 0.7 ? 'r' : ''
        return (
          <div key={b.id} class={`fl-bubble ${b.tone} ${side}`} style={{ left: `${side === 'l' ? x - 14 : side === 'r' ? x + 14 : x}px`, top: `${y}px` }}>
            <PT text={b.text} size={10} weight={600} color={b.tone === 'warn' ? '#8e2a2a' : '#3b2616'} />
          </div>
        )
      })}
      {count && (
        <div class="act-center">
          <div key={count} class="fl-count">
            <PT text={count} size={count.length > 1 ? 22 : 30} weight={600} color="#fffaf0" outline="#1d3c52" scale={3} />
          </div>
        </div>
      )}
      {!!hud && !hud.moved && started.current && !count && !result && (
        <div class="fl-hint">
          <span class="fl-hint-pill">
            <Icon name="play" size={14} />
            <PT text="ลากนิ้วที่ไหนก็ได้ เพื่อบังคับเรือ" size={10} weight={600} color="#fffaf0" shadow="#1d3c52" />
          </span>
        </div>
      )}
      {!!hud && hud.done && !result && (
        <div class="act-center">
          <div class="fl-count">
            <PT text={hud.rescued >= STAR_RESCUES[2] ? 'ฮีโร่กู้ภัย!' : 'หมดเวลา!'} size={22} weight={600} color="#fffaf0" outline="#1d3c52" scale={3} />
          </div>
        </div>
      )}
      {(intro || help) && !result && <FloodHowTo again={help} onStart={start} onClose={intro ? () => onExit() : () => setHelp(false)} />}
      {quit && (
        <Window
          title="เลิกกู้ภัยรอบนี้?"
          icon="door"
          onClose={() => setQuit(false)}
          footer={
            <>
              <PBtn tone="paper" onClick={() => setQuit(false)}>
                ช่วยต่อ
              </PBtn>
              <PBtn tone="red" onClick={() => onExit()}>
                ออก
              </PBtn>
            </>
          }
        >
          <p class="goal-main">ตั๋วรอบนี้ใช้ไปแล้ว และจะยังไม่ได้แต้มกู้ภัยนะ ชาวบ้านยังรออยู่!</p>
        </Window>
      )}
      {result && <FloodResult eventId={eventId} sum={result.sum} reward={result.reward} onExit={onExit} onAgain={onAgain} />}
    </div>
  )
}

const STAR_TITLE = ['ทีม ฮ. มาช่วยต่อแล้ว', 'ช่วยได้หลายชีวิต!', 'กู้ภัยมือโปร!', 'ฮีโร่กู้ภัยแห่งหมู่บ้าน!']

function FloodResult({ eventId, sum, reward, onExit, onAgain }: { eventId: string; sum: FloodSummary; reward: RunReward | null; onExit: (claim?: boolean) => void; onAgain: () => void }) {
  const def = eventDef(eventId)!
  const [shown, setShown] = useState(0)
  const [fill, setFill] = useState(0)
  const tickets = eventProgress(eventId).tickets
  useEffect(() => {
    const ts: number[] = []
    for (let i = 1; i <= 3; i++)
      ts.push(
        window.setTimeout(() => {
          setShown(i)
          if (i <= sum.stars) {
            sfx.sparkle()
            haptic(12)
          }
        }, 200 + i * 320),
      )
    ts.push(window.setTimeout(() => setFill(1), 1300))
    ts.push(
      window.setTimeout(() => {
        if (reward && reward.tierAfter > reward.tierBefore) sfx.levelUp()
        else sfx.coins(6)
      }, 1700),
    )
    return () => ts.forEach(clearTimeout)
  }, [])
  const before = tierProgress(reward?.before ?? 0, def.pass)
  const after = tierProgress(reward?.after ?? 0, def.pass)
  const cur = fill ? after : before
  const up = reward ? reward.tierAfter - reward.tierBefore : 0
  return (
    <div class="modal-backdrop celebrate">
      {sum.stars >= 2 && <FxCanvas mode="confetti" />}
      <div class="panel modal center fl-result">
        <div class="fl-res-stars">
          {[0, 1, 2].map((i) => (
            <span key={i} class={`fl-bigstar ${shown > i && sum.stars > i ? 'on' : ''}`}>
              <Icon name={sum.stars > i && shown > i ? 'star' : 'star_empty'} size={i === 1 ? 44 : 34} />
            </span>
          ))}
        </div>
        <PT text={STAR_TITLE[sum.stars]} size={14} weight={600} {...TONE_TEXT.ink} />
        <div class="fl-res-grid">
          <span class="panel soft fl-res-cell">
            <Mini kind="man" size={22} />
            <b class="num">{sum.people}</b>
            <span class="small muted">คน</span>
          </span>
          <span class="panel soft fl-res-cell">
            <Mini kind="cat" size={20} />
            <b class="num">{sum.animals}</b>
            <span class="small muted">สัตว์</span>
          </span>
          <span class="panel soft fl-res-cell">
            <Mini kind="vipcat" size={20} />
            <b class="num">{sum.vip}</b>
            <span class="small muted">VIP</span>
          </span>
          <span class="panel soft fl-res-cell">
            <Icon name="home" size={20} />
            <b class="num">{sum.families}</b>
            <span class="small muted">ครอบครัว</span>
          </span>
        </div>
        <div class="small muted fl-res-line">
          ช่วยได้ {sum.rescued}/{sum.total} ชีวิต · เต็มลำสูงสุด {sum.bestTrip} · ชนขยะ {sum.crashes} ครั้ง
          {sum.timeBonus ? ` · โบนัสเวลา +${sum.timeBonus}` : ''}
          {sum.missed > 0 ? ` · อีก ${sum.missed} ชีวิต ทีม ฮ. รับช่วงต่อแล้ว` : ''}
        </div>
        <div class="panel gold fl-res-points">
          <div class="row">
            <EvIcon name="ev_points" size={26} />
            <PT text={`+${reward?.points ?? sum.score} ${def.pointsName}`} size={13} weight={600} {...TONE_TEXT.gold} />
            <span class="grow" />
            {reward?.best && <span class="chip pink small">สถิติใหม่!</span>}
          </div>
          <div class="fl-res-tier">
            <span class="fl-tier-badge num">{cur.tier}</span>
            <span class="fl-res-bar">
              <span style={{ width: `${Math.round(cur.pct * 100)}%` }} />
            </span>
            <span class="small num">{cur.maxed ? 'MAX' : `${cur.into}/${cur.need}`}</span>
          </div>
          {up > 0 && fill > 0 && (
            <div class="fl-res-up">
              <PT text={`ขึ้นเป็นขั้น ${reward!.tierAfter} แล้ว! มีรางวัลรอรับ`} size={13} weight={600} color="#2f6e36" scale={1} />
            </div>
          )}
        </div>
        <div class="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {!!reward?.merit && (
            <span class="chip pink big-chip">
              <Merit n={`+${reward.merit}`} size={18} />
              <span class="small">บุญ</span>
            </span>
          )}
          {!!reward?.coins && (
            <span class="chip gold big-chip">
              <Coin n={`+${reward.coins}`} size={18} />
            </span>
          )}
        </div>
        <div class="col fl-res-btns">
          {up > 0 && (
            <PBtn tone="gold" block icon="gift" onClick={() => onExit(true)}>
              ไปรับรางวัลบัตรผ่าน
            </PBtn>
          )}
          <PBtn tone="green" block icon="play" disabled={tickets <= 0} onClick={onAgain}>
            {tickets > 0 ? `ออกเรืออีกรอบ (ตั๋ว ${tickets})` : 'ตั๋วหมดแล้ว'}
          </PBtn>
          <PBtn tone="paper" block onClick={() => onExit()}>
            กลับหน้าอีเวนต์
          </PBtn>
        </div>
      </div>
    </div>
  )
}
