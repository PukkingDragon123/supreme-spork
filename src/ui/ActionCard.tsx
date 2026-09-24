// Bottom card shown after walking up to something interactive.

import { useState } from 'preact/hooks'
import { arrived, openActivity } from './store'
import { hotspotActions } from './hotspots'
import { Btn, Hearts, Icon, Sheet } from './components/common'
import { DOG_BY_ID, MAX_HEARTS } from '../game/data/dogs'
import { dogState, petDog, setCompanion } from '../game/actions'
import { game } from '../game/state'
import { mapFor } from '../scenes/maps'
import { area } from './store'
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
    <div class="action-card panel" key={h.id}>
      <div class="row">
        <Icon name={h.icon} size={32} />
        <div class="grow">
          <div class="subtitle">{h.label}</div>
          {h.hint && <div class="small muted">{h.hint}</div>}
        </div>
        <button class="btn paper icon-btn small" onClick={() => (sfx.close(), (arrived.value = null))} aria-label="ปิด">
          <Icon name="close" size={14} />
        </button>
      </div>
      <div class="row wrap">
        {acts.map((a, i) => (
          <Btn key={a.label} tone={a.tone ?? (i === 0 ? '' : 'paper')} onClick={() => a.run()} class="grow">
            <Icon name={a.icon} size={20} /> {a.label}
          </Btn>
        ))}
      </div>
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
    <div class="action-card panel" key={id}>
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
  const m = mapFor(area.value)
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
