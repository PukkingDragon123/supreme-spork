// "ความหมายของบทนี้": an illustrated card with a chant's meaning in simple
// Thai, when Thai people chant it, and a tiny animated pixel picture whose
// highlighted parts follow the verse.

import { useEffect, useRef, useState } from 'preact/hooks'
import { Surface } from '../../engine/pixel'
import { ART_H, ART_PARTS, ART_W, drawChantArt } from '../../art/chantArt'
import type { Chant, ChantArt, ChantVerse } from '../../game/data/chants'
import { game } from '../../game/state'
import { PT, TONE_TEXT } from '../pixeltext'
import { Icon } from './common'
import { sfx } from '../../engine/audio'
import '../../styles/chant.css'

export function MeaningArt({ art, focus = null, scale = 3, class: cls }: { art: ChantArt; focus?: number[] | null; scale?: number; class?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const props = useRef({ art, focus })
  props.current = { art, focus }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const g = new Surface(ART_W, ART_H, el)
    const look = game.value.player.look
    const still = game.value.settings.reduceMotion
    const t0 = performance.now()
    let raf = 0
    const draw = () => {
      const t = still ? 1.3 : 1.3 + (performance.now() - t0) / 1000
      drawChantArt(g, props.current.art, { t, focus: props.current.focus, look })
    }
    const loop = () => {
      if (document.visibilityState === 'visible') draw()
      raf = requestAnimationFrame(loop)
    }
    draw()
    if (!still) raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  useEffect(() => {
    // Redraw at once when the verse changes under reduced motion.
    if (game.value.settings.reduceMotion && ref.current) drawChantArt(new Surface(ART_W, ART_H, ref.current), art, { t: 1.3, focus, look: game.value.player.look })
  }, [art, focus?.join(',')])
  return <canvas ref={ref} class={`ch-art px ${cls ?? ''}`} width={ART_W} height={ART_H} style={{ width: `${ART_W * scale}px`, height: `${ART_H * scale}px` }} aria-hidden="true" />
}

/** Verses of a chant that fall inside lines [from, to). */
export function versesIn(c: Chant, from = 0, to = c.lines.length): ChantVerse[] {
  const vs = c.verses ?? []
  return vs.filter((v) => v.to > from && v.from < to)
}

const FAITH: Record<NonNullable<Chant['faith']>, string> = {
  buddhist: 'บทสวดในพระพุทธศาสนา',
  hindu: 'มนตร์ในศาสนาพราหมณ์-ฮินดู',
  mahayana: 'บทสวดพุทธมหายาน',
}

export function MeaningCard({
  chant,
  range,
  verse,
  compact,
  title = 'ความหมายของบทนี้',
  scale,
}: {
  chant: Chant
  /** Chant lines the card is about (a stage's passage). */
  range?: [number, number]
  /** Start on this verse (index within the range's verses). */
  verse?: number
  compact?: boolean
  title?: string
  scale?: number
}) {
  const verses = versesIn(chant, range?.[0], range?.[1])
  const [vi, setVi] = useState<number>(verse ?? -1)
  useEffect(() => setVi(verse ?? -1), [verse, chant.id, range?.[0]])
  const v = vi >= 0 ? verses[vi] : null
  const art = v?.art ?? chant.art
  const parts = ART_PARTS[art]
  const focus = v?.focus ?? null
  const step = (d: number) => {
    sfx.tap()
    const n = verses.length
    // -1 is the overview, then each verse in turn.
    setVi((i) => ((i + 1 + d + n + 1) % (n + 1)) - 1)
  }
  return (
    <div class={`ch-card ${compact ? 'compact' : ''}`}>
      <div class="ch-card-head">
        <Icon name="book" size={16} />
        <PT text={title} size={12} weight={600} {...TONE_TEXT.ink} />
      </div>
      <div class="ch-art-frame">
        <MeaningArt art={art} focus={focus} scale={scale ?? (compact ? 2 : 3)} />
      </div>
      {parts && !compact && (
        <div class="ch-parts" aria-label="ส่วนที่ภาพอธิบาย">
          {parts.map((p, i) => (
            <span key={p} class={`ch-part ${!focus || focus.includes(i) ? 'on' : ''}`}>
              {p}
            </span>
          ))}
        </div>
      )}
      <p class={`ch-meaning ${v ? 'verse' : ''}`}>{v ? v.text : chant.meaning}</p>
      {!compact && verses.length > 1 && (
        <div class="ch-verse-nav">
          <button class="btn paper small icon-btn" aria-label="ท่อนก่อนหน้า" onClick={() => step(-1)}>
            ◀
          </button>
          <span class="small">{vi < 0 ? `ภาพรวม · มี ${verses.length} ท่อน` : `ท่อนที่ ${vi + 1} / ${verses.length}`}</span>
          <button class="btn paper small icon-btn" aria-label="ท่อนถัดไป" onClick={() => step(1)}>
            ▶
          </button>
        </div>
      )}
      {!compact && (
        <p class="ch-when small">
          <b>สวดเมื่อไหร่:</b> {chant.when}
          {chant.faith && chant.faith !== 'buddhist' && <span class="ch-faith"> · {FAITH[chant.faith]}</span>}
        </p>
      )}
    </div>
  )
}
