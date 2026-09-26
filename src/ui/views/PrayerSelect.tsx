// Stage select for the prayer loop: temples as tabs, numbered tiles with
// stars and locks, and a detail card for the chosen stage.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { CHAPTERS, stagesOf, chantById, stageLines, type PrayerStage } from '../../game/data/prayers'
import { chapterStars, chapterUnlocked, nextStage, stageUnlocked, totalStars, DAILY_PRAYER_GOAL, prayersToday } from '../../game/prayer'
import type { AreaId } from '../../game/data/areas'
import { MATERIAL_INFO, type MaterialId } from '../../game/materials'
import { materialSprite } from '../../art/furniture'
import { spriteDataUrl } from '../../engine/sprite'
import { openPanel, prayStage } from '../store'
import { PBtn, Slot, Stars, Tabs, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Coin, Icon, Merit } from '../components/common'
import { sfx } from '../../engine/audio'

export function MatChip({ id, n }: { id: MaterialId; n: number }) {
  return (
    <span class="mat-chip" title={MATERIAL_INFO[id].name}>
      <img class="px" src={spriteDataUrl(materialSprite(id), 2)} alt={MATERIAL_INFO[id].name} width={24} height={24} />
      <span class="num">×{n}</span>
    </span>
  )
}

export function PrayerSelect() {
  const s = game.value
  const first = nextStage(s)
  const [ch, setCh] = useState<AreaId>(first.chapter)
  const [sel, setSel] = useState<PrayerStage>(first.chapter === ch ? first : stagesOf(ch)[0])
  const stars = totalStars(s)
  const close = () => openPanel(null)

  const pickChapter = (c: AreaId) => {
    setCh(c)
    const list = stagesOf(c)
    setSel(list.find((x) => stageUnlocked(x) && !(s.prayer.stars[x.id] ?? 0)) ?? list[0])
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
  const words = stageLines(sel).join(' ').split(/\s+/).filter((w) => w && w !== '(กราบ)').length

  return (
    <Window title="สวดมนต์" icon="pray" onClose={close} wide>
      <div class="pray-sum row">
        <Stars n={1} max={1} size={18} />
        <PT text={`${stars} ดาว`} size={12} weight={600} {...TONE_TEXT.ink} />
        <span class="grow" />
        <PT text={`วันนี้ ${Math.min(prayersToday(s), DAILY_PRAYER_GOAL)}/${DAILY_PRAYER_GOAL}`} size={12} {...TONE_TEXT.ink} />
        {s.prayer.streak > 1 && <span class="chip gold small">🔥 {s.prayer.streak} วัน</span>}
      </div>
      <Tabs tabs={CHAPTERS.map((c) => ({ id: c.id, label: chapterUnlocked(c.id) || c.id === ch ? c.short : '', icon: chapterUnlocked(c.id) ? undefined : 'lock' }))} value={ch} onChange={pickChapter} />
      <div class="ptab-body">
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
            <div class="small muted">ตอนนี้มี {stars} ดาว · สวดบทก่อนหน้าให้ได้ 3 ดาวเพื่อเก็บดาวเพิ่ม</div>
          </div>
        ) : (
          <div class="stage-grid">
            {stagesOf(ch).map((st) => {
              const n = s.prayer.stars[st.id] ?? 0
              const unlocked = stageUnlocked(st)
              return (
                <Slot key={st.id} size={58} active={sel.id === st.id} locked={!unlocked} class={`stage-tile ${st.big ? 'big' : ''}`} onClick={() => setSel(st)} title={`ด่าน ${st.n}`}>
                  {unlocked && <PT text={st.n} size={15} weight={600} {...TONE_TEXT.ink} />}
                  {unlocked && <Stars n={n} size={11} class="tile-stars" />}
                </Slot>
              )
            })}
          </div>
        )}
      </div>
      {open && (
        <div class="panel stage-card">
          <div class="row">
            <div class="grow col" style={{ gap: '2px' }}>
              <PT text={chant.name} size={13} weight={600} {...TONE_TEXT.ink} />
              <span class="small muted">
                {chant.short}… · {words} คำ{sel.rounds && sel.rounds > 1 ? ` · ${sel.rounds} รอบ` : ''} · กราบ {sel.bows}
              </span>
            </div>
            <Stars n={got} size={18} />
          </div>
          <div class="row wrap stage-rewards">
            <Merit n={`+${sel.merit}`} size={16} />
            <Coin n={`+${sel.coins}`} size={16} />
            {Object.entries(sel.mats).map(([k, v]) => (
              <MatChip key={k} id={k as MaterialId} n={got ? 1 : (v ?? 0)} />
            ))}
            {(s.prayer.best[sel.id] ?? 0) > 0 && <span class="small muted">สูงสุด {s.prayer.best[sel.id]}</span>}
          </div>
          <PBtn tone="green" size="big" block icon="pray" disabled={!selOpen} onClick={() => start(sel)}>
            {selOpen ? (got ? 'สวดอีกครั้ง' : 'เริ่มสวดมนต์') : 'ผ่านด่านก่อนหน้าก่อนนะ'}
          </PBtn>
        </div>
      )}
    </Window>
  )
}
