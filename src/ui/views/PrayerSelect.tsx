// Stage map for the prayer loop: temples as tabs, a winding path of stages
// that climbs from the first stage (lock → pass → 3 stars; gold boss
// stages), and a card for the chosen stage with its meaning picture.

import { useEffect, useRef, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { CHAPTERS, stagesOf, chantById, stageLines, stageStarScores, type PrayerStage } from '../../game/data/prayers'
import { chapterStars, chapterUnlocked, nextStage, stagePassed, stageUnlocked, totalStars, DAILY_PRAYER_GOAL, prayersToday, prevStage } from '../../game/prayer'
import type { AreaId } from '../../game/data/areas'
import { MATERIAL_INFO, type MaterialId } from '../../game/materials'
import { materialSprite } from '../../art/furniture'
import { spriteDataUrl } from '../../engine/sprite'
import { lineWords } from '../../game/chantScore'
import { openPanel, prayStage } from '../store'
import { PBtn, Stars, Tabs, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Coin, Icon, Merit } from '../components/common'
import { MeaningArt } from '../components/MeaningCard'
import { StageChips } from '../components/StageChips'
import { chantBookFocus } from '../chantPrefs'
import { sfx } from '../../engine/audio'
import '../../styles/chant.css'

export function MatChip({ id, n }: { id: MaterialId; n: number }) {
  return (
    <span class="mat-chip" title={MATERIAL_INFO[id].name}>
      <img class="px" src={spriteDataUrl(materialSprite(id), 2)} alt={MATERIAL_INFO[id].name} width={24} height={24} />
      <span class="num">×{n}</span>
    </span>
  )
}

const ROW = 78
const MAP_W = 300
const XS = [150, 232, 150, 68]

function StageMap({ list, sel, onSel }: { list: PrayerStage[]; sel: PrayerStage; onSel: (st: PrayerStage) => void }) {
  const s = game.value
  const box = useRef<HTMLDivElement>(null)
  const H = list.length * ROW + 30
  // Stage 1 sits at the bottom; the path climbs.
  const pos = (i: number) => ({ x: XS[i % XS.length], y: H - 40 - i * ROW })
  useEffect(() => {
    const el = box.current?.querySelector('.ch-node.sel') as HTMLElement | null
    if (el && box.current) box.current.scrollTop = Math.max(0, el.offsetTop - box.current.clientHeight / 2 + 30)
  }, [list[0]?.chapter])
  let d = ''
  list.forEach((_, i) => {
    const { x, y } = pos(i)
    if (i === 0) d += `M ${x} ${y}`
    else {
      const p = pos(i - 1)
      d += ` C ${p.x} ${p.y - ROW / 2}, ${x} ${y + ROW / 2}, ${x} ${y}`
    }
  })
  const passedUpTo = list.reduce((n, st, i) => (stagePassed(st, s) ? i + 1 : n), 0)
  let dDone = ''
  list.slice(0, Math.min(list.length, passedUpTo + 1)).forEach((_, i) => {
    const { x, y } = pos(i)
    if (i === 0) dDone += `M ${x} ${y}`
    else {
      const p = pos(i - 1)
      dDone += ` C ${p.x} ${p.y - ROW / 2}, ${x} ${y + ROW / 2}, ${x} ${y}`
    }
  })
  return (
    <div class="ch-map" ref={box}>
      <div class="ch-map-inner" style={{ height: `${H}px` }}>
        <svg class="ch-path" width={MAP_W} height={H} viewBox={`0 0 ${MAP_W} ${H}`} aria-hidden="true">
          <path d={d} class="road" />
          <path d={d} class="dots" />
          {passedUpTo > 0 && <path d={dDone} class="done" />}
        </svg>
        {list.map((st, i) => {
          const { x, y } = pos(i)
          const n = s.prayer.stars[st.id] ?? 0
          const open = stageUnlocked(st, s)
          const passed = n >= 1
          const current = open && !passed
          const cls = ['ch-node', st.big ? 'boss' : '', open ? 'open' : 'locked', passed ? 'passed' : '', current ? 'current' : '', n >= 3 ? 'perfect' : '', sel.id === st.id ? 'sel' : ''].join(' ')
          return (
            <button
              key={st.id}
              class={cls}
              style={{ left: `calc(50% + ${x - MAP_W / 2}px)`, top: `${y}px` }}
              onClick={() => (sfx.tap(), onSel(st))}
              aria-label={`ด่าน ${st.n}${st.big ? ' บอส' : ''} ${open ? (passed ? `ผ่านแล้ว ${n} ดาว` : 'เล่นได้') : 'ล็อก'}`}
              aria-pressed={sel.id === st.id}
            >
              {current && !st.big && <span class="ch-flag">ถัดไป</span>}
              <span class="ch-node-disc">
                {open ? <PT text={st.n} size={15} weight={600} {...(passed && n < 3 ? TONE_TEXT.title : TONE_TEXT.gold)} /> : <Icon name="lock" size={20} />}
              </span>
              {st.hint === 'memory' && open && (
                <span class="ch-node-badge" title="ท่องจำ">
                  <Icon name="meditate" size={14} />
                </span>
              )}
              {st.hint === 'fade' && open && (
                <span class="ch-node-badge" title="จางหาย">
                  <Icon name="sparkle" size={14} />
                </span>
              )}
              {passed && <Stars n={n} size={13} class="ch-node-stars" />}
              {st.big && <span class="ch-node-boss">บอส</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PrayerSelect() {
  const s = game.value
  const first = nextStage(s)
  const [ch, setCh] = useState<AreaId>(first.chapter)
  const [sel, setSel] = useState<PrayerStage>(first)
  const stars = totalStars(s)
  const close = () => openPanel(null)

  const pickChapter = (c: AreaId) => {
    setCh(c)
    const list = stagesOf(c)
    setSel(list.find((x) => stageUnlocked(x) && !stagePassed(x)) ?? [...list].reverse().find((x) => stageUnlocked(x)) ?? list[0])
  }

  const start = (st: PrayerStage) => {
    sfx.bigBell()
    openPanel(null)
    prayStage.value = st.id
  }

  const chapter = CHAPTERS.find((c) => c.id === ch)!
  const open = chapterUnlocked(ch)
  const cs = chapterStars(ch)
  const chant = chantById(sel.chant)
  const got = s.prayer.stars[sel.id] ?? 0
  const selOpen = stageUnlocked(sel)
  const words = stageLines(sel).flatMap(lineWords).length
  const prev = prevStage(sel)
  const best = s.prayer.best[sel.id] ?? 0

  return (
    <Window title="สวดมนต์" icon="pray" onClose={close} wide class="ch-select">
      <div class="pray-sum row">
        <Stars n={1} max={1} size={18} />
        <PT text={`${stars} ดาว`} size={12} weight={600} {...TONE_TEXT.ink} />
        <span class="grow" />
        <PT text={`วันนี้ ${Math.min(prayersToday(s), DAILY_PRAYER_GOAL)}/${DAILY_PRAYER_GOAL}`} size={12} {...TONE_TEXT.ink} />
        {s.prayer.streak > 1 && <span class="chip gold small">🔥 {s.prayer.streak} วัน</span>}
      </div>
      <Tabs
        tabs={CHAPTERS.map((c) => ({ id: c.id, label: chapterUnlocked(c.id) || c.id === ch ? c.short : '', icon: chapterUnlocked(c.id) ? undefined : 'lock' }))}
        value={ch}
        onChange={pickChapter}
      />
      <div class="ptab-body ch-map-body">
        <div class="row pray-chapter">
          <PT text={chapter.name} size={13} weight={600} {...TONE_TEXT.ink} />
          <span class="grow" />
          <Stars n={1} max={1} size={14} />
          <span class="num small">
            {cs.got}/{cs.max}
          </span>
        </div>
        {!open ? (
          <div class="pray-locked center">
            <Icon name="lock" size={40} />
            <PT text={`สะสมให้ครบ ${chapter.stars} ดาวเพื่อเปิด`} size={13} {...TONE_TEXT.ink} />
            <div class="small muted">ตอนนี้มี {stars} ดาว · เก็บ 3 ดาวในด่านก่อน ๆ เพื่อได้ดาวเพิ่ม</div>
            <span class="bar" style={{ width: '80%' }}>
              <span style={{ width: `${Math.min(100, (stars / Math.max(1, chapter.stars)) * 100)}%` }} />
            </span>
          </div>
        ) : (
          <StageMap list={stagesOf(ch)} sel={sel} onSel={setSel} />
        )}
      </div>
      {open && (
        <div class={`panel stage-card ch-stage-card ${sel.big ? 'boss' : ''}`}>
          <div class="row" style={{ alignItems: 'flex-start', gap: '8px' }}>
            <div class="ch-thumb">
              <MeaningArt art={chant.art} scale={1} />
            </div>
            <div class="grow col" style={{ gap: '2px', minWidth: 0 }}>
              <b class="ch-stage-name">
                {sel.big && <span class="ch-boss-tag">บอส</span>}
                {chant.name}
              </b>
              <span class="small muted ch-ellipsis">
                {chant.short}… · {words} คำ
              </span>
              <StageChips st={sel} />
            </div>
          </div>
          <div class="row wrap stage-rewards">
            <Stars n={got} size={16} />
            {best > 0 && <span class="small muted">สูงสุด {best}</span>}
            <span class="grow" />
            <Merit n={`+${sel.merit}`} size={16} />
            <Coin n={`+${sel.coins}`} size={16} />
            {Object.entries(sel.mats).map(([k, v]) => (
              <MatChip key={k} id={k as MaterialId} n={got ? 1 : (v ?? 0)} />
            ))}
          </div>
          <PBtn tone={sel.big ? 'gold' : 'green'} size="big" block icon="pray" disabled={!selOpen} onClick={() => start(sel)}>
            {selOpen ? (got ? (got >= 3 ? 'สวดอีกครั้ง' : 'เก็บดาวให้ครบ') : 'เริ่มสวดมนต์') : `ผ่านด่าน ${prev?.n ?? 1} ก่อนนะ (${stageStarScores(prev ?? sel)[0]} คะแนน)`}
          </PBtn>
          <button class="ch-link small" onClick={() => (sfx.tap(), (chantBookFocus.value = chant.parts ? chant.parts[0] : chant.id), openPanel('chants'))}>
            <Icon name="book" size={14} /> อ่านบท · ฟังเสียงนำ · นำเข้าเสียงสวด
          </button>
        </div>
      )}
    </Window>
  )
}
