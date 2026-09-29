// Karaoke lines for chanting: the current line big, the next one small.
// Highlighting runs per syllable on the chant clock (which follows the
// audio when a recording plays). Hint levels hide text: 'fade' shows words
// only as they arrive, 'memory' turns them into blanks until judged.

import { Fragment } from 'preact'
import type { TimelineWord, Judge } from '../../game/chantScore'
import type { StagePlan, QuizWord } from '../../game/chantTiming'
import type { HintLevel } from '../../game/data/prayers'
import '../../styles/chant.css'

/** Index of the word being sung (or next) at time t. */
export function wordAt(words: TimelineWord[], t: number): number {
  const i = words.findIndex((w) => t < w.start + w.dur)
  return i < 0 ? words.length - 1 : i
}

function Syllables({ w, t }: { w: TimelineWord; t: number }) {
  return (
    <>
      {w.syl.map((s, k) => {
        const p = t <= s.start ? 0 : t >= s.start + s.dur ? 1 : (t - s.start) / s.dur
        const cls = p >= 1 ? 'sd' : p > 0 ? 'sn' : 'sw'
        return (
          <span key={k} class={`ch-syl ${cls}`} style={p > 0 && p < 1 ? { ['--p' as string]: `${Math.round(p * 100)}%` } : undefined}>
            {s.text}
          </span>
        )
      })}
    </>
  )
}

function WordView({ w, t, j, hint, cur, quiz }: { w: TimelineWord; t: number; j?: Judge; hint: HintLevel; cur: number; quiz?: QuizWord }) {
  const active = t >= w.start && t < w.start + w.dur
  const started = t >= w.start
  let hidden = false
  if (hint === 'memory') hidden = !j
  else if (hint === 'fade') hidden = !j && !started && w.start - t > 0.45 && w.index > cur
  const state = j ? `done ${j}` : active ? 'now' : started ? 'past' : 'wait'
  if (hidden)
    return (
      <span class={`ch-w blank ${quiz ? 'quiz' : ''} ${active ? 'now' : ''}`} aria-label="ช่องว่าง">
        {quiz ? <span class="ch-q">?</span> : null}
        <span class="ch-blank-text">{w.text}</span>
      </span>
    )
  return <span class={`ch-w ${state} ${hint === 'memory' && j ? 'reveal' : ''}`}>{active && !j ? <Syllables w={w} t={t} /> : w.text}</span>
}

export function KaraokeLines({
  plan,
  t,
  hint = 'read',
  judged,
  quiz,
  big = true,
}: {
  plan: StagePlan
  t: number
  hint?: HintLevel
  judged?: (Judge | undefined)[]
  quiz?: Map<number, QuizWord>
  big?: boolean
}) {
  const words = plan.words
  const cur = wordAt(words, t)
  const curLine = t < (words[0]?.start ?? 0) ? 0 : (words[Math.max(0, cur)]?.line ?? 0)
  const next = curLine + 1
  const lineWords = (li: number) => words.filter((w) => w.line === li)
  return (
    <div class={`ch-lines ${big ? 'big' : ''}`} aria-live="off">
      <div class="ch-line now">
        {lineWords(curLine).map((w) => (
          <Fragment key={w.index}>
            <WordView w={w} t={t} j={judged?.[w.index]} hint={hint} cur={cur} quiz={quiz?.get(w.index)} />
            {w.bow && <span class="ch-bow">(กราบ)</span>}{' '}
          </Fragment>
        ))}
      </div>
      {next < plan.lines.length && (
        <div class="ch-line next">
          {hint === 'memory' || hint === 'fade'
            ? lineWords(next).map((w) => <span key={w.index} class="ch-dot" style={{ width: `${Math.min(6, w.syl.length) * 6}px` }} />)
            : lineWords(next).map((w) => (
                <Fragment key={w.index}>
                  <span class="ch-w wait">{w.text}</span>{' '}
                </Fragment>
              ))}
        </div>
      )}
    </div>
  )
}
