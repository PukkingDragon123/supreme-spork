// Shared Bot Noi UI pieces: the animated portrait (blinks, glowing antenna,
// flickering jet, talking mouth) and typed speech text.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { botnoiPortraitUrl, botnoiSpriteUrl, type BotArm, type BotExpr } from '../../art/botnoi'
import { game } from '../../game/state'
import { botSfx } from './botSfx'

const seg =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new (Intl as unknown as { Segmenter: new (l: string, o: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter('th', { granularity: 'grapheme' })
    : null
const graphemes = (s: string) => (seg ? [...seg.segment(s)].map((x) => x.segment) : Array.from(s))

/** Typewriter text; `finish()` shows it all at once. */
export function useTyped(text: string, speed = 26) {
  const parts = useMemo(() => graphemes(text), [text])
  const [n, setN] = useState(0)
  const pos = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  useEffect(() => {
    pos.current = game.value.settings.reduceMotion ? parts.length : 0
    setN(pos.current)
    if (pos.current >= parts.length) return
    timer.current = setInterval(() => {
      pos.current = Math.min(parts.length, pos.current + 1)
      setN(pos.current)
      if (pos.current % 5 === 1) botSfx.talk()
      if (pos.current >= parts.length) clearInterval(timer.current)
    }, speed)
    return () => clearInterval(timer.current)
  }, [parts])
  const finish = () => {
    clearInterval(timer.current)
    pos.current = parts.length
    setN(parts.length)
  }
  return { shown: parts.slice(0, n).join(''), done: n >= parts.length, finish }
}

/** Animated portrait. `talking` flaps the screen mouth. */
export function BotFace({ expr = 'normal', arm = 'down', talking = false, scale = 2, flip = false, class: cls }: { expr?: BotExpr; arm?: BotArm; talking?: boolean; scale?: number; flip?: boolean; class?: string }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120)
    return () => clearInterval(id)
  }, [])
  const blink = expr === 'normal' && tick % 32 === 31
  const url = botnoiPortraitUrl({ expr: blink ? 'blink' : expr, arm, talk: talking && tick % 2 === 0, glow: tick % 8 < 4, flame: tick % 3, phase: tick % 4, flip }, scale)
  return <img class={`px bn-face ${cls ?? ''}`} src={url} alt="บอทน้อย" draggable={false} width={37 * scale} height={48 * scale} />
}

/** Small world-sprite Bot Noi (pointing helper next to coach marks). */
export function BotMini({ arm = 'point', expr = 'happy', flip = false, scale = 3 }: { arm?: BotArm; expr?: BotExpr; flip?: boolean; scale?: number }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 110)
    return () => clearInterval(id)
  }, [])
  const url = botnoiSpriteUrl({ arm, expr, flip, flame: tick % 3, glow: tick % 8 < 4 }, scale)
  return <img class="px bn-mini" src={url} alt="" draggable={false} width={15 * scale} height={19 * scale} />
}
