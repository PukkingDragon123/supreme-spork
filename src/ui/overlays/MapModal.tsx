// แผนที่ – travel between temples; locked areas open by level or coins.

import { AREAS, type AreaId } from '../../game/data/areas'
import { level } from '../../game/state'
import { isAreaUnlocked, setArea, unlockArea } from '../../game/actions'
import { Btn, Coin, Icon, Modal } from '../components/common'
import { area, goTemple, mapOpen, mode } from '../store'
import { CHAPTERS } from '../../game/data/prayers'
import { totalStars } from '../../game/prayer'
import { sfx } from '../../engine/audio'

const AREA_ICON: Record<AreaId, string> = { wat: 'temple', shrine: 'deity', river: 'krathong', mountain: 'sparkle' }

export function MapModal() {
  const lv = level.value.level
  const close = () => (mapOpen.value = false)
  const stars = totalStars()
  const go = (id: AreaId) => {
    sfx.whoosh()
    setArea(id)
    close()
    goTemple(id)
  }
  return (
    <Modal onClose={close} wide>
      <div class="title center">แผนที่ไปวัด</div>
      <div class="small muted center" style={{ marginBottom: '10px' }}>
        สวดมนต์เก็บดาวเพื่อเปิดวัดใหม่ (หรือถึงเลเวลที่กำหนด) จะใช้บุญคอยน์ปลดล็อกก่อนก็ได้
      </div>
      <div class="map-path">
        {AREAS.map((a, i) => {
          const open = isAreaUnlocked(a.id)
          const here = area.value === a.id && mode.value === 'world'
          const need = CHAPTERS.find((c) => c.id === a.id)?.stars ?? 0
          return (
            <div key={a.id} class={`panel map-stop ${here ? 'here' : ''} ${open ? '' : 'locked'}`}>
              <span class="map-no num">{i + 1}</span>
              <Icon name={open ? AREA_ICON[a.id] : 'lock'} size={36} />
              <div class="grow">
                <div class="subtitle">
                  {a.name} <span class="small muted">· {a.subtitle}</span>
                </div>
                <div class="small muted">{a.desc}</div>
                {a.meritBonus > 1 && <div class="small">ทำบุญที่นี่ได้บุญ x{a.meritBonus}</div>}
              </div>
              {here ? (
                <span class="chip gold">อยู่ที่นี่</span>
              ) : open ? (
                <Btn tone="green" size="small" onClick={() => go(a.id)}>
                  ไป
                </Btn>
              ) : (
                <div class="col" style={{ alignItems: 'flex-end', gap: '2px' }}>
                  <span class="small muted">
                    ★{need} หรือ Lv.{a.unlockLevel}
                  </span>
                  <Btn size="small" onClick={() => unlockArea(a.id) && (sfx.purchase(), go(a.id))}>
                    <Coin n={a.unlockPrice} size={14} />
                  </Btn>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div class="small muted center">
        ตอนนี้คุณ Lv.{lv} · ★{stars}
      </div>
    </Modal>
  )
}
