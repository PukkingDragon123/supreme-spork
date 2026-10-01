// UI pieces shared by the temple mini-games: floating praise words over the
// stage ("เยี่ยม!", "คอมโบ x5"), a combo badge, a status pill and the result
// card with the player's doll celebrating and a star reveal.

import { signal } from '@preact/signals'
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { Stage } from '../engine/stage'
import { spriteDataUrl } from '../engine/sprite'
import { DOLL_H, DOLL_W, dollSprite, type BaseDollPose, type DollView } from '../art/doll'
import { tp, isTPose, type TPose } from '../art/poses/temple'
import { STAR_WORDS, type Stars } from '../art/minigames/rules'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { adsLeft, grantMeritRaw, rewardAd } from '../game/actions'
import { ads } from '../services/ads'
import { Btn, Coin, Icon, Merit } from '../ui/components/common'
import { FxCanvas } from '../ui/components/FxCanvas'
import { PT } from '../ui/pixeltext'
import { sfx } from '../engine/audio'
import type { ResultData } from './kit'

const STYLE = `
.tg-praise-layer { position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; }
.tg-praise { position: absolute; transform: translate(-50%, -50%); line-height: 0; animation: tg-praise 1.05s cubic-bezier(.2,1.6,.4,1) forwards; white-space: nowrap; }
.tg-praise.big { animation-name: tg-praise-big; animation-duration: 1.4s; }
@keyframes tg-praise { 0% { transform: translate(-50%, -30%) scale(0.4); opacity: 0; } 18% { transform: translate(-50%, -60%) scale(1.25); opacity: 1; } 35% { transform: translate(-50%, -70%) scale(1); } 80% { opacity: 1; } 100% { transform: translate(-50%, -130%) scale(0.95); opacity: 0; } }
@keyframes tg-praise-big { 0% { transform: translate(-50%, -50%) scale(2.2) rotate(-6deg); opacity: 0; } 14% { transform: translate(-50%, -50%) scale(0.92) rotate(2deg); opacity: 1; } 24% { transform: translate(-50%, -50%) scale(1.05) rotate(0); } 82% { opacity: 1; transform: translate(-50%, -54%) scale(1); } 100% { transform: translate(-50%, -70%) scale(1.1); opacity: 0; } }
.tg-combo { position: absolute; right: 12px; top: calc(var(--safe-top) + 64px); z-index: 5; pointer-events: none; display: flex; align-items: center; gap: 4px; padding: 3px 8px 4px; background: #3a2838; border-radius: 4px; box-shadow: 0 0 0 2px #fff1d6, 0 3px 0 2px rgba(0,0,0,0.3); line-height: 0; animation: tg-bump 0.25s cubic-bezier(.3,1.8,.5,1); }
.tg-combo.hot { background: #b8343f; }
.tg-pill { position: absolute; left: 50%; top: calc(var(--safe-top) + 64px); transform: translateX(-50%); z-index: 5; pointer-events: none; display: flex; align-items: center; gap: 6px; padding: 3px 10px 4px; background: rgba(43,35,64,0.82); border-radius: 12px; box-shadow: 0 0 0 2px rgba(255,241,214,0.85); line-height: 0; white-space: nowrap; }
.tg-pill .tg-dots { display: flex; gap: 3px; }
.tg-pill .tg-dot { width: 8px; height: 8px; border-radius: 2px; background: #5e5561; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.25); }
.tg-pill .tg-dot.on { background: #ffd54f; box-shadow: inset 0 -2px 0 #d99a2b, 0 0 6px #ffe98a; }
@keyframes tg-bump { from { transform: scale(1.5); } to { transform: scale(1); } }
.tg-meter { position: relative; height: 20px; margin: 10px 6px 8px; background: #3a2f48; box-shadow: 0 -3px 0 0 var(--ink), 0 3px 0 0 var(--ink), -3px 0 0 0 var(--ink), 3px 0 0 0 var(--ink); }
.tg-meter .z { position: absolute; top: 0; bottom: 0; background: repeating-linear-gradient(45deg, rgba(255, 213, 79, 0.7) 0 4px, rgba(255, 243, 166, 0.7) 4px 8px); box-shadow: inset 2px 0 0 #ffd54f, inset -2px 0 0 #ffd54f; }
.tg-meter .f { position: absolute; left: 0; top: 4px; bottom: 4px; transition: width 40ms linear; }
.tg-meter.rice .f { background: linear-gradient(#ffffff, #e9dfd0); }
.tg-meter.water .f { background: linear-gradient(#b3eef4, #47a6cb); }
.tg-meter.gold .f { background: linear-gradient(#fff3a6, #e9a53a); }
.tg-meter.in .z { animation: tg-glow 0.4s steps(2) infinite; }
.tg-meter.over .f { background: linear-gradient(#ff8a7a, #b8343f); }
@keyframes tg-glow { 50% { filter: brightness(1.4); } }
.btn > .tg-charge { position: absolute; left: -2px; top: -2px; bottom: -4px; z-index: 0; pointer-events: none; background: linear-gradient(#fff3a6, #ffd54f 60%, #e9a53a); opacity: 0.85; box-shadow: 2px 0 0 #fffaf0; transition: width 60ms linear; }
.btn > .tg-charge.full { animation: tg-glow 0.3s steps(2) infinite; }
.btn.tg-hold > :not(.tg-charge) { z-index: 1; }
.tg-result { display: flex; flex-direction: column; align-items: center; gap: 6px; padding-top: 4px; }
.tg-hero { position: relative; width: 160px; height: 150px; margin: -4px auto -6px; display: grid; place-items: end center; }
.tg-burst { position: absolute; left: 50%; top: 50%; width: 170px; height: 170px; margin: -85px 0 0 -85px; border-radius: 50%; background: radial-gradient(circle, rgba(255,243,166,0.95) 0 22%, rgba(255,213,79,0.5) 36%, transparent 62%), repeating-conic-gradient(rgba(255,233,168,0.9) 0 9deg, transparent 9deg 22deg); -webkit-mask: radial-gradient(circle, #000 40%, transparent 71%); mask: radial-gradient(circle, #000 40%, transparent 71%); animation: tg-spin 14s linear infinite; }
.tg-hero img.tg-doll { position: relative; image-rendering: pixelated; animation: tg-hop 0.9s ease-in-out infinite alternate; }
.tg-hero .tg-badge { position: absolute; right: 10px; bottom: 4px; padding: 4px; background: #fffaf0; border-radius: 50%; box-shadow: 0 0 0 2px #3a2838, 0 3px 0 2px rgba(0,0,0,0.25); line-height: 0; animation: tg-bump 0.4s 0.3s cubic-bezier(.3,1.8,.5,1) both; }
@keyframes tg-spin { to { transform: rotate(360deg); } }
@keyframes tg-hop { from { transform: translateY(0); } to { transform: translateY(-5px); } }
.tg-stars { display: flex; gap: 4px; align-items: flex-end; margin: 2px 0 -2px; }
.tg-star { opacity: 0.25; transform: scale(0.7); transition: transform 0.28s cubic-bezier(.3,1.9,.5,1), opacity 0.15s; line-height: 0; }
.tg-star.mid { margin-bottom: 8px; }
.tg-star.on { opacity: 1; transform: scale(1.1); }
.tg-result .title { text-align: center; }
.tg-lines { display: flex; flex-direction: column; gap: 2px; text-align: center; }
`

function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById('tg-style')) return
  const el = document.createElement('style')
  el.id = 'tg-style'
  el.textContent = STYLE
  document.head.appendChild(el)
}
ensureStyle()

// ---------------------------------------------------------------------------
// Praise words

export type PraiseTone = 'gold' | 'pink' | 'blue' | 'green' | 'white'
const TONES: Record<PraiseTone, { color: string; outline: string }> = {
  gold: { color: '#fff3a6', outline: '#5a3410' },
  pink: { color: '#ffe8f0', outline: '#8e3a5c' },
  blue: { color: '#e6f6ff', outline: '#1f3f70' },
  green: { color: '#eaffd8', outline: '#1f4a26' },
  white: { color: '#fffaf0', outline: '#3a2838' },
}

interface PraiseItem {
  id: number
  text: string
  x: number
  y: number
  tone: PraiseTone
  big: boolean
}
const praises = signal<PraiseItem[]>([])
let nextId = 1

/** Pop a praise word over the stage at virtual pixel (x, y). */
export function praise(stage: Stage | null | undefined, x: number, y: number, text: string, tone: PraiseTone = 'gold', big = false) {
  const [cx, cy] = stage ? stage.toCss(x, y) : [x, y]
  const id = nextId++
  praises.value = [...praises.value.slice(-5), { id, text, x: cx, y: cy, tone, big }]
  setTimeout(() => (praises.value = praises.value.filter((p) => p.id !== id)), big ? 1450 : 1100)
}

/** A big centred banner ("ครบ ๓ รอบ!"). */
export function banner(stage: Stage | null | undefined, text: string, tone: PraiseTone = 'gold') {
  if (!stage) return
  praise(stage, stage.width / 2, stage.height * 0.3, text, tone, true)
}

export function PraiseLayer() {
  useEffect(() => () => void (praises.value = []), [])
  return (
    <div class="tg-praise-layer">
      {praises.value.map((p) => (
        <div key={p.id} class={`tg-praise ${p.big ? 'big' : ''}`} style={{ left: `${p.x}px`, top: `${p.y}px` }}>
          <PT text={p.text} size={p.big ? 16 : 12} weight={600} scale={p.big ? 3 : 2} color={TONES[p.tone].color} outline={TONES[p.tone].outline} shadow="#1b1026" />
        </div>
      ))}
    </div>
  )
}

/** Combo counter under the top bar (hidden below 2). */
export function ComboBadge({ n }: { n: number }) {
  if (n < 2) return null
  return (
    <div class={`tg-combo ${n >= 7 ? 'hot' : ''}`} key={n}>
      <PT text={`คอมโบ x${n}`} size={11} weight={600} color="#fff3a6" shadow="#1b1026" />
    </div>
  )
}

/** Small progress pill under the top bar: a label and optional dots. */
export function StatusPill({ text, dots, on }: { text: string; dots?: number; on?: number }) {
  return (
    <div class="tg-pill">
      <PT text={text} size={11} weight={600} color="#fff1d6" shadow="#1b1026" />
      {dots ? (
        <span class="tg-dots">
          {Array.from({ length: dots }, (_, i) => (
            <span key={i} class={`tg-dot ${i < (on ?? 0) ? 'on' : ''}`} />
          ))}
        </span>
      ) : null}
    </div>
  )
}

/** Gold fill inside a press-and-hold button (add class tg-hold to the button). */
export function ChargeFill({ p }: { p: number }) {
  if (p <= 0) return null
  return <span class={`tg-charge ${p >= 1 ? 'full' : ''}`} style={{ width: `calc(${Math.min(1, p) * 100}% + 4px)` }} />
}

/** Hold-to-fill meter with a gold target zone. */
export function Meter({ fill, max, lo, hi, tone = 'gold' }: { fill: number; max: number; lo: number; hi: number; tone?: 'rice' | 'water' | 'gold' }) {
  const state = fill > hi ? 'over' : fill >= lo ? 'in' : ''
  return (
    <div class={`tg-meter ${tone} ${state}`}>
      <span class="z" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />
      <span class="f" style={{ width: `${Math.min(100, (fill / max) * 100)}%` }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result card

export interface TempleResultData extends ResultData {
  /** Cosmetic score for skill games (the merit reward is unchanged). */
  stars?: Stars
  /** Pose of the player's doll on the card (default: cheering). */
  pose?: TPose | BaseDollPose
  view?: DollView
}

export function TempleResult({ r, onDone, again }: { r: TempleResultData; onDone: () => void; again?: { label: string; run: () => void } }) {
  const [doubled, setDoubled] = useState(false)
  const [shown, setShown] = useState(0)
  const look = game.value.player.look
  const pose = r.pose ?? 'cheer'
  const doll = useMemo(() => spriteDataUrl(dollSprite(look, isTPose(pose) ? tp(pose) : pose, { view: r.view ?? 'front' }), 3), [look, pose, r.view])
  useEffect(() => {
    tsfx.fanfare()
    const timers: number[] = []
    const n = r.stars ?? 0
    for (let i = 1; i <= n; i++)
      timers.push(
        window.setTimeout(() => {
          setShown(i)
          tsfx.star(i - 1)
        }, 380 + i * 300),
      )
    return () => timers.forEach(clearTimeout)
  }, [])
  const double = async () => {
    const res = await ads().showRewarded('double_reward')
    if (!res.rewarded) return
    rewardAd('bonus')
    grantMeritRaw(r.merit)
    setDoubled(true)
    sfx.chime()
  }
  return (
    <div class="modal-backdrop celebrate">
      <FxCanvas mode="sparkle" />
      <div class="panel modal center tg-result">
        <div class="tg-hero">
          <span class="tg-burst" />
          <img class="tg-doll" src={doll} width={DOLL_W * 3} height={DOLL_H * 3} alt="" draggable={false} />
          <span class="tg-badge">
            <Icon name={r.icon ?? 'lotus'} size={28} />
          </span>
        </div>
        <div class="title">{r.title}</div>
        {r.stars !== undefined && (
          <>
            <div class="tg-stars">
              {[0, 1, 2].map((i) => (
                <span key={i} class={`tg-star ${i === 1 ? 'mid' : ''} ${shown > i ? 'on' : ''}`}>
                  <Icon name={shown > i ? 'star' : 'star_empty'} size={i === 1 ? 40 : 32} />
                </span>
              ))}
            </div>
            <span style={{ visibility: shown >= (r.stars ?? 0) ? 'visible' : 'hidden', lineHeight: 0 }}>
              <PT text={STAR_WORDS[r.stars ?? 0]} size={12} weight={600} color="#8e3a5c" />
            </span>
          </>
        )}
        <div class="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
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
          <div class="tg-lines">
            {r.lines.map((l) => (
              <div class="small muted" key={l}>
                {l}
              </div>
            ))}
          </div>
        )}
        <div class="col" style={{ marginTop: '6px', alignSelf: 'stretch' }}>
          {r.doubleable !== false && r.merit > 0 && !doubled && adsLeft() > 0 && (
            <Btn tone="blue" block onClick={double}>
              <Icon name="tv" size={18} /> ดูโฆษณา รับบุญ x2
            </Btn>
          )}
          {again && (
            <Btn tone="paper" block onClick={again.run}>
              {again.label}
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
