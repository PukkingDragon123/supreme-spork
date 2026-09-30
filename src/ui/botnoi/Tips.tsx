// Feature tips: the first time the player meets a system (stalls, the
// market, the collection book, the flood event, the battle pass, hub
// markets, the fair, cooking, crafting, jobs, online chat / player cards,
// the temple rank board, rooms, chant memory stages) Bot Noi pops up with
// 1–3 bubbles and rings the thing. Non-blocking: only the card takes taps.

import { useEffect, useState } from 'preact/hooks'
import { game, level } from '../../game/state'
import { TIP_BY_ID, pickTip, tipLine, type TipDef } from '../../game/botnoiTips'
import { markTipSeen } from '../../game/botnoi'
import { PLACE_BY_ID } from '../../game/data/places'
import { activity, houseEditing, mapId, mode, panel, tab } from '../store'
import { PBtn } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { sfx } from '../../engine/audio'
import { BotFace, useTyped } from './BotBubble'
import { botMenu, popupsAllowed } from './botStore'
import { tutActive } from './tutorialCtl'
import { botSfx } from './botSfx'
import type { BotExpr } from '../../art/botnoi'

const has = (sel: string) => !!document.querySelector(sel)
const placeKind = () => PLACE_BY_ID[mapId.value.split(':')[0]]?.kind

/** When each tip's system is on screen, and what to ring. */
const TRIGGERS: Record<string, { when: () => boolean; ring?: string; top?: boolean }> = {
  stall: { when: () => has('.stall'), ring: '.stall-panel', top: true },
  market: { when: () => panel.value === 'market', ring: '.win-backdrop .win', top: true },
  collection: { when: () => panel.value === 'collection', ring: '.cbook-win', top: true },
  event: { when: () => mode.value === 'world' && tab.value === 'temple' && !panel.value && !activity.value && has('.ev-badge:not(.locked)'), ring: '.ev-badge' },
  pass: { when: () => has('.ev-pass'), ring: '.ev-pass-head' },
  hub: { when: () => mode.value === 'world' && !panel.value && !activity.value && tab.value === 'temple' && placeKind() === 'market' },
  fair: { when: () => mode.value === 'world' && !panel.value && !activity.value && tab.value === 'temple' && placeKind() === 'fair' },
  cook: { when: () => activity.value?.id === 'cook', top: true },
  craft: { when: () => panel.value === 'craft' && has('.mat-bar'), ring: '.mat-bar', top: true },
  jobs: { when: () => activity.value?.id === 'job' || panel.value === 'jobs', top: true },
  online_chat: { when: () => has('.ol-chat'), ring: '.ol-chat', top: true },
  online_card: { when: () => has('.ol-card-win'), ring: '.ol-card-win' },
  rank: { when: () => has('.hl-board'), ring: '.hl-board-regions' },
  rooms: { when: () => has('.hl-rooms-win') || (mode.value === 'house' && !houseEditing.value && !panel.value && has('.hl-roombar')), ring: '.hl-roombar' },
  chant_memory: { when: () => panel.value === 'pray' && has('.ch-node-badge[title="ท่องจำ"]'), ring: '.ch-node:has(.ch-node-badge[title="ท่องจำ"])' },
}

function blocked(): boolean {
  return tutActive.value || !!botMenu.value || !popupsAllowed() || has('.modal-backdrop, .qd-backdrop, .ad-overlay, .cine, .bn-card-back, .bn-sheet-back')
}

export function TipHost() {
  const [tip, setTip] = useState<TipDef | null>(null)
  useEffect(() => {
    const iv = setInterval(() => {
      if (tip) {
        // Hide when its system is gone (e.g. the window was closed).
        if (!TRIGGERS[tip.id]?.when() || blocked()) setTip(null)
        return
      }
      if (blocked()) return
      const on = Object.keys(TRIGGERS).filter((id) => !game.value.botnoi.seen.includes(id) && TRIGGERS[id].when())
      const t = pickTip(on, game.value.botnoi.seen, level.value.level)
      if (t) {
        markTipSeen(t.id)
        botSfx.chirp()
        setTip(t)
      }
    }, 450)
    return () => clearInterval(iv)
  }, [tip])
  if (!tip) return null
  return <TipCard key={tip.id} tip={tip} onDone={() => setTip(null)} />
}

function TipCard({ tip, onDone }: { tip: TipDef; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [ring, setRing] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const trig = TRIGGERS[tip.id]
  const line = tipLine(tip.lines[Math.min(i, tip.lines.length - 1)])
  const typed = useTyped(line.t)
  const last = i >= tip.lines.length - 1
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const pr = document.querySelector('.phone')?.getBoundingClientRect()
      const el = trig?.ring ? document.querySelector(trig.ring) : null
      if (pr && el) {
        const r = el.getBoundingClientRect()
        setRing((o) => {
          const n = { x: r.left - pr.left - 4, y: r.top - pr.top - 4, w: r.width + 8, h: r.height + 8 }
          return o && Math.abs(o.x - n.x) < 1 && Math.abs(o.y - n.y) < 1 && Math.abs(o.w - n.w) < 1 && Math.abs(o.h - n.h) < 1 ? o : n
        })
      } else setRing(null)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tip.id])
  const H = document.querySelector('.phone')?.getBoundingClientRect().height ?? 844
  const top = trig?.top ? false : ring ? ring.y + ring.h / 2 > H * 0.55 : false
  const next = () => {
    if (!typed.done) return typed.finish()
    sfx.tap()
    if (last) onDone()
    else setI(i + 1)
  }
  return (
    <div class="bn-root tips">
      {ring && <div class="bn-tip-ring" style={{ left: `${ring.x}px`, top: `${ring.y}px`, width: `${ring.w}px`, height: `${ring.h}px` }} />}
      <div class={`bn-tip ${top ? 'top' : 'bottom'} ${trig?.top ? 'high' : ''}`} role="status">
        <span class="bn-tip-face">
          <BotFace expr={line.e as BotExpr} arm={ring ? 'point' : 'wave'} talking={!typed.done} scale={2} />
        </span>
        <button class="bn-text small" onClick={next}>
          <PT text="บอทน้อย" size={11} weight={600} {...TONE_TEXT.ink} class="bn-tip-name" />
          <span class="bn-typed">{typed.shown}</span>
          <span class="bn-ghost" aria-hidden="true">
            {line.t}
          </span>
        </button>
        <PBtn tone={last ? 'green' : 'paper'} size="small" onClick={next} class="bn-tip-ok">
          {last ? 'เข้าใจแล้ว' : 'ต่อไป'}
        </PBtn>
      </div>
    </div>
  )
}

export { TIP_BY_ID }
