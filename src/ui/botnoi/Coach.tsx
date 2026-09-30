// Coach marks for the tutorial: dims the screen except the real target (a
// UI element or a world hotspot), rings it with a pulsing highlight, points
// at it with an arrow and a little Bot Noi, and speaks in a typed bubble.
// Stray taps get a gentle redirect; after two the dim stops blocking and a
// "ข้ามขั้นนี้" button appears, so the tutorial can never soft-lock.

import { useEffect, useRef, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { tutProgress, type TutStepId } from '../../game/botnoiTutorial'
import { finishTutorial, skipTutorial, tutorialInput, type TutPayout } from '../../game/botnoi'
import { questMarkerFor } from '../../game/npcQuests'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { activity, mode, prayStage } from '../store'
import { worldScene } from '../TempleView'
import { PBtn } from '../components/kit'
import { Icon } from '../components/common'
import { PT, TONE_TEXT } from '../pixeltext'
import { thumbFor } from '../DressUp'
import { sfx, haptic } from '../../engine/audio'
import { BotFace, BotMini, useTyped } from './BotBubble'
import { STEP_UI, type Target } from './tutorialSteps'
import { ensureWalkSpot, tutStep } from './tutorialCtl'
import { botFocus, botMenu } from './botStore'
import { botSfx } from './botSfx'
import type { Line } from './botLines'
import { signal } from '@preact/signals'

interface Box {
  x: number
  y: number
  w: number
  h: number
  /** A world target (round ring, Bot Noi flies there). */
  world?: boolean
  /** World action for a tap inside the ring (walk there / to the hotspot). */
  act?: { hotspot?: string; x?: number; y?: number }
}

type Place = { kind: 'hidden' } | { kind: 'mini'; text: string } | { kind: 'target'; box: Box } | { kind: 'lost' }

/** Something is covering the game (a modal, dialog, ad, cutscene or Bot Noi's own sheet). */
function covered(): boolean {
  return !!document.querySelector('.modal-backdrop, .qd-backdrop, .ad-overlay, .cine, .bn-sheet-back, .stall')
}

function phoneRect(): DOMRect | null {
  return document.querySelector('.phone')?.getBoundingClientRect() ?? null
}

function labelOf(el: Element): string {
  const alt = [...el.querySelectorAll('img.pt')].map((i) => (i as HTMLImageElement).alt).join(' ')
  return `${el.getAttribute('aria-label') ?? ''} ${alt} ${el.textContent ?? ''}`.trim()
}

function onTop(el: Element, cx: number, cy: number): boolean {
  const hit = document.elementFromPoint(cx, cy)
  return !!hit && (el === hit || el.contains(hit) || !!hit.closest('.bn-root'))
}

const scrolled = new WeakSet<Element>()

function uiBox(t: Extract<Target, { kind: 'ui' }>, pr: DOMRect): Box | null {
  for (const el of document.querySelectorAll(t.sel)) {
    if (t.text && !labelOf(el).includes(t.text)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue
    if (r.top < pr.top + 60 || r.bottom > pr.bottom - 20) {
      // Inside a scrolling window but out of sight: bring it into view once.
      if (!scrolled.has(el)) {
        scrolled.add(el)
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      if (r.bottom < pr.top || r.top > pr.bottom) continue
    }
    if (!onTop(el, r.left + r.width / 2, r.top + r.height / 2)) continue
    const pad = t.pad ?? 4
    return { x: r.left - pr.left - pad, y: r.top - pr.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }
  }
  return null
}

/** World rect (virtual px) → phone CSS box. */
function worldBox(x: number, y: number, w: number, h: number, pr: DOMRect): Box | null {
  const sc = worldScene()
  const cv = document.querySelector('.phone > .stage-host > canvas') as HTMLCanvasElement | null
  if (!sc || !cv) return null
  const cr = cv.getBoundingClientRect()
  const k = cr.width / sc.vw
  const bx = cr.left - pr.left + (x - sc.camX) * k
  const by = cr.top - pr.top + (y - sc.camY) * k
  return { x: bx, y: by, w: w * k, h: h * k, world: true }
}

const inView = (b: Box, pr: DOMRect) => b.x + b.w / 2 > 8 && b.x + b.w / 2 < pr.width - 8 && b.y + b.h / 2 > 150 && b.y + b.h / 2 < pr.height - 120

let panned: string | null = null

function resolve(t: Target, pr: DOMRect, step: string): Box | null {
  if (t.kind === 'ui') return uiBox(t, pr)
  const sc = worldScene()
  if (!sc || mode.value !== 'world') return null
  let wx = 0
  let wy = 0
  let ww = 0
  let wh = 0
  let focus: { x: number; y: number } | null = null
  let act: Box['act'] = undefined
  if (t.kind === 'spot') {
    const sp = ensureWalkSpot()
    if (!sp) return null
    ;[wx, wy, ww, wh] = [sp.x - 9, sp.y - 6, 18, 12]
    focus = { x: sp.x, y: sp.y - 4 }
    act = { x: sp.x, y: sp.y }
  } else {
    let h = t.kind === 'hotspot' ? sc.map.hotspots.find((x) => x.id === t.id) : null
    if (t.kind === 'npc') {
      const p = sc.player
      const npcs = sc.map.hotspots.filter((x) => x.id.startsWith('npc:') && questMarkerFor(x.id))
      npcs.sort((a, b) => (questMarkerFor(a.id)?.kind === 'quest' ? 0 : 1) - (questMarkerFor(b.id)?.kind === 'quest' ? 0 : 1) || Math.hypot(a.at.x - p.x, a.at.y - p.y) - Math.hypot(b.at.x - p.x, b.at.y - p.y))
      h = npcs[0]
    }
    if (!h) return null
    const r = h.rect
    ;[wx, wy, ww, wh] = [r.x, r.y, r.w, r.h]
    const mk = h.marker ?? { x: r.x + r.w / 2, y: r.y - 4 }
    focus = { x: mk.x, y: Math.min(r.y + r.h, mk.y + 12) }
    act = { hotspot: h.id }
  }
  const b = worldBox(wx, wy, ww, wh, pr)
  if (!b) return null
  b.act = act
  // A window or sheet in front of the map hides world targets.
  const hit = document.elementFromPoint(pr.left + b.x + b.w / 2, pr.top + b.y + b.h / 2)
  if (hit && !hit.closest('.bn-root') && !(hit instanceof HTMLCanvasElement && hit.parentElement?.parentElement?.classList.contains('phone'))) return null
  if (!inView(b, pr)) {
    // Off screen on this map: pan the camera to it once.
    const key = `${step}:${wx},${wy}`
    if (panned !== key) {
      panned = key
      sc.lookAt(wx + ww / 2, wy + wh / 2)
    }
    return null
  }
  if (botFocus.value?.x !== focus?.x || botFocus.value?.y !== focus?.y) botFocus.value = focus
  // Make small world targets comfortably tappable.
  const minS = 44
  if (b.w < minS) (b.x -= (minS - b.w) / 2), (b.w = minS)
  if (b.h < minS) (b.y -= (minS - b.h) / 2), (b.h = minS)
  return b
}

function where(id: TutStepId): Place {
  if (covered() || botMenu.value) return { kind: 'hidden' }
  const ui = STEP_UI[id]
  if (activity.value || prayStage.value) {
    const m = ui.mini?.()
    return m ? { kind: 'mini', text: m } : { kind: 'hidden' }
  }
  const pr = phoneRect()
  if (!pr) return { kind: 'hidden' }
  for (const t of ui.targets()) {
    const b = resolve(t, pr, id)
    if (b) return { kind: 'target', box: b }
  }
  if (botFocus.value) botFocus.value = null
  return { kind: 'lost' }
}

const same = (a: Place, b: Place) => {
  if (a.kind !== b.kind) return false
  if (a.kind === 'mini' && b.kind === 'mini') return a.text === b.text
  if (a.kind === 'target' && b.kind === 'target') return Math.abs(a.box.x - b.box.x) < 1 && Math.abs(a.box.y - b.box.y) < 1 && Math.abs(a.box.w - b.box.w) < 1 && Math.abs(a.box.h - b.box.h) < 1
  return true
}

// ---------------------------------------------------------------------------

/** Shown after the finale: the reward burst (outlives the tutorial state). */
export const tutCelebrate = signal<TutPayout | null>(null)

export function Coach() {
  const st = tutStep.value
  const m = mode.value
  if (!st || (m !== 'world' && m !== 'house')) return null
  const ui = STEP_UI[st.id]
  if (ui.card) return <TutCard key={st.id} id={st.id} />
  return <CoachMark key={st.id} id={st.id} />
}

function SkipConfirm({ onNo }: { onNo: () => void }) {
  return (
    <div class="bn-confirm">
      <span class="small">ข้ามบทเรียนจริงเหรอครับ? เล่นใหม่ได้จาก “เมนู” นะ</span>
      <div class="row">
        <PBtn tone="red" size="small" onClick={() => (botSfx.boop(), skipTutorial())}>
          ข้ามเลย
        </PBtn>
        <PBtn tone="green" size="small" onClick={onNo}>
          เรียนต่อ
        </PBtn>
      </div>
    </div>
  )
}

function Speech({ lines, override, onLastShown }: { lines: Line[]; override?: string | null; onLastShown?: (last: boolean) => void }) {
  const [i, setI] = useState(0)
  const line = override ? { t: override, e: 'sorry' as const } : lines[Math.min(i, lines.length - 1)]
  const typed = useTyped(line.t)
  const last = !!override || i >= lines.length - 1
  useEffect(() => onLastShown?.(last && typed.done), [last, typed.done])
  const tap = () => {
    if (!typed.done) return typed.finish()
    if (!last) (sfx.tap(), setI(i + 1))
  }
  return (
    <button class="bn-text" onClick={tap} aria-live="polite">
      <span class="bn-typed">{typed.shown}</span>
      <span class="bn-ghost" aria-hidden="true">
        {line.t}
      </span>
      {typed.done && !last && <span class="bn-more">▼</span>}
    </button>
  )
}

function CoachMark({ id }: { id: TutStepId }) {
  const ui = STEP_UI[id]
  const [place, setPlace] = useState<Place>({ kind: 'hidden' })
  const [strays, setStrays] = useState(0)
  const [redirect, setRedirect] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [wiggle, setWiggle] = useState(0)
  const ref = useRef(place)
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      if (t - last > 60) {
        last = t
        const p = where(id)
        if (!same(p, ref.current)) {
          ref.current = p
          setPlace(p)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      botFocus.value = null
    }
  }, [id])
  const prog = tutProgress(game.value.botnoi)
  const relaxed = strays >= 2 || !!ui.next
  const stray = () => {
    botSfx.boop()
    haptic(15)
    setWiggle((w) => w + 1)
    setStrays((n) => n + 1)
    setRedirect(strays >= 1 ? 'ถ้าติดตรงไหน กด “ข้ามขั้นนี้” ได้เลยนะครับ ผมไม่งอน ^^' : 'อ๊ะ! แตะตรงที่เรืองแสงนะครับ ✨')
  }
  const fb = ui.fallback?.() ?? null

  if (place.kind === 'hidden') return null
  if (place.kind === 'mini')
    return (
      <div class="bn-root">
        <div class="bn-mini-hint">
          <BotFace expr="happy" arm="cheer" scale={1} />
          <span>{place.text}</span>
        </div>
      </div>
    )

  const box = place.kind === 'target' ? place.box : null
  const pr = phoneRect()
  const H = pr?.height ?? 844
  const W = pr?.width ?? 390
  const bubbleTop = box ? box.y + box.h / 2 > H * 0.5 : false
  const lostText = place.kind === 'lost' && !ui.next ? (fb ? fb.text : (ui.lost ?? 'อ๊ะ หลงทางแล้วครับ! กด “นำทาง” เดี๋ยวผมพากลับเอง')) : null

  return (
    <div class="bn-root">
      {box && (
        <>
          <Dim box={box} soft={relaxed} W={W} H={H} />
          <div class={`bn-hole ${box.world ? 'round' : ''}`} style={{ left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` }}>
            <i class="bn-ring" />
            <i class="bn-ring r2" />
            {box.act && <button class="bn-catch" aria-label="แตะตรงนี้" onClick={() => worldTap(box.act!)} />}
          </div>
          {!relaxed && (
            <>
              <div class="bn-block" style={{ left: 0, top: 0, width: '100%', height: `${Math.max(0, box.y)}px` }} onPointerDown={stray} />
              <div class="bn-block" style={{ left: 0, top: `${box.y + box.h}px`, width: '100%', bottom: 0 }} onPointerDown={stray} />
              <div class="bn-block" style={{ left: 0, top: `${box.y}px`, width: `${Math.max(0, box.x)}px`, height: `${box.h}px` }} onPointerDown={stray} />
              <div class="bn-block" style={{ left: `${box.x + box.w}px`, top: `${box.y}px`, right: 0, height: `${box.h}px` }} onPointerDown={stray} />
            </>
          )}
          <Pointer box={box} up={!bubbleTop} W={W} />
        </>
      )}
      <div class={`bn-bubble ${bubbleTop ? 'top' : 'bottom'} ${!box ? 'lost' : ''} ${wiggle % 2 ? 'wig' : ''}`} key={`w${wiggle}`}>
        <div class="bn-bubble-face">
          <BotFace expr={redirect ? 'surprised' : lostText ? 'think' : 'happy'} arm={box ? (ui.arm ?? 'point') : 'wave'} talking scale={2} />
        </div>
        <div class="bn-bubble-body">
          <div class="bn-bubble-head">
            <PT text="บอทน้อย" size={12} weight={600} {...TONE_TEXT.ink} />
            {prog.n > 0 && (
              <span class="bn-step num">
                {prog.n}/{prog.total}
              </span>
            )}
            <span class="grow" />
            <button class="bn-skip" onClick={() => (sfx.tap(), setConfirm(true))}>
              ข้ามบทเรียน
            </button>
          </div>
          {confirm ? (
            <SkipConfirm onNo={() => setConfirm(false)} />
          ) : (
            <>
              <Speech key={`${place.kind}:${redirect ?? ''}:${lostText ?? ''}`} lines={ui.lines} override={redirect ?? lostText} />
              <div class="bn-actions">
                {place.kind === 'lost' && fb && (
                  <PBtn tone="green" size="small" icon="check" onClick={() => tutorialInput({ kind: 'skipStep' })}>
                    {fb.label}
                  </PBtn>
                )}
                {place.kind === 'lost' && !fb && ui.nav && (
                  <PBtn tone="green" size="small" icon="map" onClick={() => (sfx.whoosh(), ui.nav!())}>
                    นำทาง
                  </PBtn>
                )}
                {ui.next && (
                  <PBtn tone="green" size="small" icon="check" onClick={() => tutorialInput({ kind: 'next' })}>
                    {ui.next}
                  </PBtn>
                )}
                {(strays >= 2 || (place.kind === 'lost' && !fb)) && !ui.next && (
                  <PBtn tone="paper" size="small" onClick={() => tutorialInput({ kind: 'skipStep' })}>
                    ข้ามขั้นนี้
                  </PBtn>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Tap inside a world ring: walk to the spot / go to the hotspot, as a tap on the map would. */
function worldTap(act: NonNullable<Box['act']>) {
  const sc = worldScene()
  if (!sc) return
  sfx.tap()
  if (act.hotspot) sc.goTo(act.hotspot)
  else if (act.x !== undefined && act.y !== undefined) sc.walkTo(act.x, act.y)
}

/** The dim layer: a full-screen veil with a hole cut around the target. */
function Dim({ box, soft, W, H }: { box: Box; soft: boolean; W: number; H: number }) {
  const r = box.world ? Math.min(box.w, box.h) / 2 : 12
  const { x, y, w, h } = box
  const hole = `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`
  return (
    <svg class={`bn-dim ${soft ? 'soft' : ''}`} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path fill-rule="evenodd" fill={soft ? 'rgba(24, 14, 34, 0.3)' : 'rgba(24, 14, 34, 0.58)'} d={`M0,0 H${W} V${H} H0 Z ${hole}`} />
    </svg>
  )
}

/** Bouncing arrow + a little pointing Bot Noi next to the highlight. */
function Pointer({ box, up, W }: { box: Box; up: boolean; W: number }) {
  // `up`: the bubble is below the target, so the arrow sits under it pointing up.
  const cx = box.x + box.w / 2
  if (box.h > 320) return null
  const ay = up ? box.y + box.h + 4 : box.y - 34
  const left = cx > W / 2
  const bx = left ? cx - 62 : cx + 18
  const by = up ? box.y + box.h + 8 : box.y - 58
  return (
    <>
      <div class={`bn-arrow ${up ? 'up' : 'down'}`} style={{ left: `${cx - 13}px`, top: `${ay}px` }}>
        <i />
      </div>
      {!box.world && box.h < 240 && (
        <div class="bn-pointer" style={{ left: `${Math.max(4, Math.min(W - 50, bx))}px`, top: `${Math.max(4, by)}px` }}>
          <BotMini arm="point" flip={!left} />
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Greeting and finale cards

function TutCard({ id }: { id: TutStepId }) {
  const ui = STEP_UI[id]
  const replay = game.value.botnoi?.replay
  const lines: Line[] =
    id === 'hello' && replay ? [{ t: 'มาทบทวนกันอีกรอบเหรอครับ? ดีใจจัง! เปิดโหมดครูน้อยแล้ว ปิ๊บ!', e: 'love' }, { t: 'รอบนี้ลงมือทำจริงทุกขั้นเหมือนเดิมนะครับ ไปกันเลย!', e: 'happy' }] : ui.lines
  const [i, setI] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const [hidden, setHidden] = useState(true)
  const line = lines[Math.min(i, lines.length - 1)]
  const typed = useTyped(line.t)
  const last = i >= lines.length - 1
  useEffect(() => {
    // Wait for modals (daily login etc.) to close first.
    const iv = setInterval(() => setHidden(covered() || !!botMenu.value || !!activity.value), 200)
    setHidden(covered() || !!botMenu.value)
    if (id === 'hello') botSfx.chirp()
    return () => clearInterval(iv)
  }, [])
  if (hidden) return null
  const tap = () => {
    if (!typed.done) return typed.finish()
    if (!last) (sfx.tap(), setI(i + 1))
  }
  const reward = id === 'finish' ? (game.value.botnoi.rewarded ? { coins: 30, merit: 0, outfit: null } : { coins: 300, merit: 30, outfit: 'head_botnoi_antenna' }) : null
  const out = reward?.outfit ? OUTFIT_BY_ID[reward.outfit] : null
  return (
    <div class="bn-root">
      <div class="bn-card-back">
        <div class={`bn-card ${id}`} role="dialog" aria-label="บอทน้อย">
          <div class="bn-card-face">
            <BotFace expr={line.e ?? 'happy'} arm={ui.arm ?? 'wave'} talking={!typed.done} scale={3} />
          </div>
          <PT text={id === 'finish' ? 'เรียนจบแล้ว!' : 'บอทน้อยมาแล้ว!'} size={16} weight={600} {...TONE_TEXT.gold} class="bn-card-title" />
          <button class="bn-text big" onClick={tap}>
            <span class="bn-typed">{typed.shown}</span>
            <span class="bn-ghost" aria-hidden="true">
              {line.t}
            </span>
            {typed.done && !last && <span class="bn-more">▼</span>}
          </button>
          <div class="bn-dots">
            {lines.map((_, k) => (
              <i key={k} class={k <= i ? 'on' : ''} />
            ))}
          </div>
          {reward && last && typed.done && (
            <div class="bn-reward">
              <span class="bn-chip gold">
                <Icon name="coin" size={18} /> <b class="num">+{reward.coins}</b>
              </span>
              {!!reward.merit && (
                <span class="bn-chip pink">
                  <Icon name="merit" size={18} /> <b class="num">+{reward.merit}</b>
                </span>
              )}
              {out && (
                <span class="bn-chip rare">
                  <img class="px" src={thumbFor({ ...game.value.player.look, [out.slot]: out.id }, out.slot)} alt="" width={28} height={28} />
                  <span>{out.name}</span>
                </span>
              )}
            </div>
          )}
          {confirm ? (
            <SkipConfirm onNo={() => setConfirm(false)} />
          ) : (
            last &&
            typed.done && (
              <div class="bn-card-actions">
                {id === 'hello' ? (
                  <>
                    <PBtn tone="green" icon="check" onClick={() => (botSfx.beep(), tutorialInput({ kind: 'next' }))}>
                      ไปกันเลย!
                    </PBtn>
                    <button class="bn-skip" onClick={() => (sfx.tap(), setConfirm(true))}>
                      ข้ามบทเรียน
                    </button>
                  </>
                ) : (
                  <PBtn
                    tone="gold"
                    size="big"
                    icon="gift"
                    onClick={() => {
                      const got = finishTutorial()
                      if (!got) return
                      sfx.coins(8)
                      setTimeout(() => sfx.levelUp(), 250)
                      haptic(40)
                      tutCelebrate.value = got
                    }}
                  >
                    รับรางวัล!
                  </PBtn>
                )}
              </div>
            )
          )}
          {!(last && typed.done) && <div class="bn-hint">แตะที่คำพูดเพื่อไปต่อ</div>}
        </div>
      </div>
    </div>
  )
}
