// The frame the fair's rides and shows run in (ferris wheel, carousel, claw
// machine, likay): a ticket card with the price (first go of the day free),
// the live HUD with the scene's tip and action button (📸 / เชียร์!), speech
// bubbles, and a result card with the souvenir and the photo you took.

import { useEffect, useRef, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { COLLECTIBLE_BY_ID, RARITY_INFO } from '../../game/data/collectibles'
import { collectibleUrl } from '../../art/collectibles'
import { closeActivity, coinStoreOpen, openActivity } from '../../ui/store'
import { useStage } from '../kit'
import { PBtn, Window } from '../../ui/components/kit'
import { Bar, Coin, Icon, Merit } from '../../ui/components/common'
import { FxCanvas } from '../../ui/components/FxCanvas'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { haptic, sfx } from '../../engine/audio'
import type { JobSummary } from '../jobs/base'
import { fairSfx } from './sound'
import { finishRide, rideCost, RIDES, startRide, type RideId, type RideResult } from './rides'
import type { FairShow, ShowAction } from './show'
import { setDoing } from './live'

export function CollectibleChip({ id, big }: { id: string; big?: boolean }) {
  const c = COLLECTIBLE_BY_ID[id]
  if (!c) return null
  const r = RARITY_INFO[c.rarity]
  return (
    <div class={`fairx-souvenir ${big ? 'big' : ''}`}>
      <img class="px" src={collectibleUrl(c, 3)} alt="" width={big ? 72 : 48} height={big ? 72 : 48} />
      <div>
        <div class="fairx-souvenir-name">{c.name}</div>
        <span class="chip small" style={{ background: r.color, color: '#2a1a24' }}>
          {r.name}
        </span>
      </div>
    </div>
  )
}

function RideCard({ id, onStart, onClose, again }: { id: RideId; onStart: () => void; onClose: () => void; again?: boolean }) {
  const def = RIDES[id]
  const cost = rideCost(id)
  return (
    <Window
      title={def.name}
      icon={def.icon}
      onClose={onClose}
      footer={
        <PBtn tone="green" block size="big" icon="play" onClick={onStart}>
          {again ? 'ไปต่อ' : def.price === 0 ? 'เข้าไปนั่งดู (ฟรี)' : cost === 0 ? 'ขึ้นเลย (รอบแรกฟรี)' : `ขึ้นเลย · ${cost} คอยน์`}
        </PBtn>
      }
    >
      <p class="goal-main">{def.blurb}</p>
      <ol class="goal-steps">
        {def.steps.map((s, i) => (
          <li key={i}>
            <span class="goal-n num">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {!again && (
        <div class="fairx-cost small">
          {def.price === 0 ? <span class="chip green small">ดูฟรีทุกรอบ</span> : cost === 0 ? <span class="chip green small">รอบแรกของวันฟรี!</span> : <span class="chip small">ค่าตั๋วรอบละ <Coin n={cost} size={14} /></span>}
          <span class="chip pink small">ได้บุญนิดหน่อย (ค่าตั๋วเข้าวัด)</span>
        </div>
      )}
    </Window>
  )
}

function RideResultCard({ id, summary, res, photo, onAgain }: { id: RideId; summary: JobSummary; res: RideResult; photo: string | null; onAgain: () => void }) {
  const def = RIDES[id]
  useEffect(() => {
    fairSfx.tada()
    if (res.got) sfx.levelUp()
  }, [])
  const cost = rideCost(id)
  return (
    <div class="modal-backdrop celebrate">
      <FxCanvas mode="sparkle" />
      <div class="panel modal center result-card">
        <div class="title">{summary.title ?? `${def.name} สนุกไหม?`}</div>
        {photo && (
          <div class="fairx-polaroid">
            <img src={photo} alt="รูปที่ถ่ายไว้" />
            <div class="small">{def.name} · งานวัด</div>
          </div>
        )}
        {res.got && (
          <div class="fairx-got">
            <div class="small">ได้ของสะสมใหม่!</div>
            <CollectibleChip id={res.got} big />
          </div>
        )}
        {res.merit > 0 && (
          <div class="row" style={{ justifyContent: 'center' }}>
            <span class="chip pink">
              <Merit n={`+${res.merit}`} size={16} /> <span class="small">บุญ (ค่าตั๋วเข้าวัด)</span>
            </span>
          </div>
        )}
        {summary.lines.map((l) => (
          <div class="small muted" key={l}>
            {l}
          </div>
        ))}
        <div class="col" style={{ marginTop: '8px' }}>
          <PBtn tone="paper" block onClick={onAgain}>
            {def.price === 0 ? 'ดูอีกรอบ' : cost === 0 ? 'อีกรอบ (ฟรี)' : `อีกรอบ · ${cost} คอยน์`}
          </PBtn>
          {id === 'claw' && (
            <PBtn tone="gold" block icon="gift" onClick={() => openActivity('fair', { booth: 'prizes' })}>
              ไปซุ้มแลกของรางวัล
            </PBtn>
          )}
          <PBtn tone="green" block onClick={closeActivity}>
            กลับไปเที่ยวงาน
          </PBtn>
        </div>
      </div>
    </div>
  )
}

interface Hud {
  tip: string
  progress: number
  bubbles: FairShow['bubbles']
  action: ShowAction | null
}

/** Virtual width per ride (smaller = bigger pixels). */
const RIDE_TW: Partial<Record<RideId, number>> = { carousel: 160 }

export function FairRideRun({ id, make, paid, onAgain }: { id: RideId; make: () => FairShow; paid: boolean; onAgain: () => void }) {
  const def = RIDES[id]
  const { host, scene, stage } = useStage(make, { targetWidth: RIDE_TW[id] ?? 190 })
  const topRef = useRef<HTMLDivElement>(null)
  const botRef = useRef<HTMLDivElement>(null)
  const [intro, setIntro] = useState(!paid)
  const [help, setHelp] = useState(false)
  const [hud, setHud] = useState<Hud | null>(null)
  const [result, setResult] = useState<{ summary: JobSummary; res: RideResult; photo: string | null } | null>(null)
  const timers = useRef<number[]>([])

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

  const go = () => {
    const sc = scene.current
    if (!sc) return
    sc.start()
    setDoing(def.doing)
  }

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    measure()
    sc.snap = () => {
      try {
        return stage.current?.el.toDataURL('image/png') ?? null
      } catch {
        return null
      }
    }
    sc.onDone = (_stars, summary) => {
      const res = finishRide(id, sc.prize)
      haptic(30)
      timers.current.push(window.setTimeout(() => setResult({ summary, res, photo: sc.photo }), 300))
    }
    if (paid) go()
    const iv = window.setInterval(() => {
      const s = scene.current
      if (!s) return
      measure()
      setHud({ tip: s.tip(), progress: s.progress(), bubbles: [...s.bubbles], action: s.action() })
    }, 100)
    ;(window as unknown as { __fairScene?: FairShow }).__fairScene = sc
    return () => {
      clearInterval(iv)
      for (const t of timers.current) clearTimeout(t)
      setDoing(null)
    }
  }, [])

  useEffect(() => {
    if (scene.current) scene.current.paused = intro || help
  }, [intro, help, scene.current])

  const start = () => {
    if (!startRide(id)) return
    if (def.price > 0) sfx.coin()
    setIntro(false)
    go()
  }

  const again = () => {
    if (!startRide(id)) return
    if (def.price > 0) sfx.coin()
    onAgain()
  }

  const act = hud?.action
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <div class="act-top" ref={topRef}>
        <button class="btn paper small icon-btn" onClick={() => (sfx.close(), closeActivity())} aria-label="กลับ">
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
      {!result && (
        <div class="act-bottom" ref={botRef}>
          {act && !intro && (
            <div class="fairx-actrow">
              <PBtn
                tone={act.hot ? 'gold' : 'paper'}
                size="small"
                icon={act.icon}
                disabled={act.disabled}
                class={act.hot ? 'fairx-hot' : ''}
                onClick={() => {
                  scene.current?.onAction()
                  haptic(10)
                }}
              >
                {act.label}
              </PBtn>
            </div>
          )}
          <div class="panel act-tip fairx-hud">
            <div class="fairx-row">
              <span class="fairx-goal">
                <Icon name={def.icon} size={20} />
                <PT text={hud?.tip ?? def.blurb} size={12} weight={600} {...TONE_TEXT.ink} />
              </span>
            </div>
            <div class="fairx-meter">
              <Bar value={Math.round((hud?.progress ?? 0) * 100)} max={100} tone="green" label="ความคืบหน้า" />
            </div>
          </div>
        </div>
      )}
      {(intro || help) && !result && <RideCard id={id} again={help} onStart={help ? () => setHelp(false) : start} onClose={intro ? closeActivity : () => setHelp(false)} />}
      {result && <RideResultCard id={id} summary={result.summary} res={result.res} photo={result.photo} onAgain={again} />}
    </div>
  )
}
