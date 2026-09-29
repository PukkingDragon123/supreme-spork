// Bottom card shown after walking up to something interactive.

import { useState } from 'preact/hooks'
import { arrived, openActivity } from './store'
import { hotspotActions } from './hotspots'
import { Btn, Hearts, Icon, Sheet } from './components/common'
import { CloseX, PBtn } from './components/kit'
import { PT, TONE_TEXT } from './pixeltext'
import { DOG_BY_ID, MAX_HEARTS } from '../game/data/dogs'
import { dogState, petDog, setCompanion } from '../game/actions'
import { game } from '../game/state'
import { mapFor } from '../scenes/maps'
import { mapId } from './store'
import { travelTo, worldScene } from './TempleView'
import { toast } from '../game/events'
import { sfx } from '../engine/audio'

export function ActionCard() {
  const t = arrived.value
  if (!t) return null
  if (t.kind === 'dog') return <DogCard id={t.id} />
  const h = t.hotspot
  const acts = hotspotActions(h.id)
  return (
    <div class="prompt win" key={h.id}>
      <div class="row prompt-head">
        <Icon name={h.icon} size={26} />
        <div class="grow col" style={{ gap: '0' }}>
          <PT text={h.label} size={13} weight={600} {...TONE_TEXT.ink} />
          {h.hint && <span class="small muted">{h.hint}</span>}
        </div>
      </div>
      <div class="row wrap prompt-acts">
        {acts.map((a, i) => (
          <PBtn key={a.label} tone={(a.tone as never) ?? (i === 0 ? 'green' : 'paper')} size={i === 0 ? undefined : 'small'} icon={a.icon} onClick={() => a.run()} class="grow">
            {a.label}
          </PBtn>
        ))}
      </div>
      <CloseX onClick={() => (arrived.value = null)} />
    </div>
  )
}

function DogCard({ id }: { id: string }) {
  const def = DOG_BY_ID[id]
  const st = dogState(id)
  const s = game.value
  const isCompanion = s.companion === id
  if (!def) return null
  return (
    <div class="prompt win" key={id}>
      <div class="row">
        <Icon name="dog" size={32} />
        <div class="grow">
          <div class="subtitle">
            น้อง{def.name} <Hearts value={st.hearts} max={MAX_HEARTS} />
          </div>
          <div class="small muted">{def.about}</div>
        </div>
        <button
          class="btn paper icon-btn small"
          onClick={() => {
            sfx.close()
            worldScene()?.releaseDog(id)
            arrived.value = null
          }}
          aria-label="ปิด"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      <div class="row wrap">
        <Btn class="grow" onClick={() => openActivity('dog', { dog: id })}>
          <Icon name="dogfood" size={20} /> ให้อาหาร
        </Btn>
        <Btn
          tone="pink"
          class="grow"
          disabled={st.petToday}
          onClick={() => {
            const m = petDog(id)
            if (m > 0) {
              sfx.bark()
              toast(`น้อง${def.name}มีความสุข +${m} บุญ`, 'heart')
              worldScene()?.particles.hearts(worldScene()!.player.x, worldScene()!.player.y - 30, 5)
            }
          }}
        >
          <Icon name="heart" size={18} /> {st.petToday ? 'ลูบหัวแล้ววันนี้' : 'ลูบหัว'}
        </Btn>
        {st.hearts >= MAX_HEARTS && (
          <Btn tone="green" class="grow" onClick={() => setCompanion(isCompanion ? null : id)}>
            <Icon name="paw" size={18} /> {isCompanion ? 'ให้พักที่วัด' : 'ชวนเดินด้วยกัน'}
          </Btn>
        )}
      </div>
      {st.hearts < MAX_HEARTS && <div class="small muted center">สนิทครบ 5 หัวใจ น้อง{def.name}จะเดินตามคุณไปทุกที่</div>}
    </div>
  )
}

/** Compass button listing every spot in this area for one-tap travel. */
export function QuickTravel() {
  const [open, setOpen] = useState(false)
  const m = mapFor(mapId.value)
  return (
    <>
      <button class="panel quick-btn" onClick={() => (sfx.open(), setOpen(true))} aria-label="รายการกิจกรรมในวัดนี้">
        <Icon name="sparkle" size={22} />
        <span class="small">ทำบุญ</span>
      </button>
      {open && (
        <Sheet title="ไปทำบุญที่..." onClose={() => setOpen(false)}>
          <div class="quick-grid">
            {m.hotspots.map((h) => (
              <button
                key={h.id}
                class="panel quick-item"
                onClick={() => {
                  sfx.tap()
                  setOpen(false)
                  travelTo(h.id)
                }}
              >
                <Icon name={h.icon} size={30} />
                <span>{h.label}</span>
                <span class="small muted">{h.hint}</span>
              </button>
            ))}
          </div>
          <div class="small muted center" style={{ padding: '6px' }}>
            {s0(game.value.companion)}
          </div>
        </Sheet>
      )}
    </>
  )
}

function s0(companion: string | null) {
  if (!companion) return 'แตะที่พื้นเพื่อเดิน แตะสิ่งของเพื่อทำบุญ ลากนิ้วเพื่อมองรอบ ๆ'
  return `น้อง${DOG_BY_ID[companion]?.name ?? ''}เดินตามคุณอยู่นะ`
}
