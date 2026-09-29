// HUD button for the live event: pulsing icon, season timer and a count of
// things to claim. Below the level requirement it shows the lock.

import { game } from '../../game/state'
import { LIVE_EVENTS } from '../../game/events/registry'
import { claimableCount, eventSeason, isEventUnlocked } from '../../game/liveEvents'
import { fmtCountdownTiny } from '../../game/events/season'
import { useTicker, Icon } from '../components/common'
import { PT } from '../pixeltext'
import { sfx } from '../../engine/audio'
import { EvIcon } from './EventParts'
import { openEvent } from './EventHub'

export function EventBadge() {
  useTicker(30_000)
  void game.value
  const def = LIVE_EVENTS[0]
  if (!def) return null
  const unlocked = isEventUnlocked(def.id)
  const n = unlocked ? claimableCount(def.id) : 0
  const left = eventSeason(def.id).msLeft
  return (
    <button
      class={`ev-badge ${unlocked ? '' : 'locked'}`}
      onClick={() => {
        sfx.open()
        openEvent(def.id)
      }}
      aria-label={`อีเวนต์${def.name}${unlocked ? '' : ` ล็อกถึง Lv.${def.level}`}`}
    >
      <span class="ev-badge-icon">
        <EvIcon name={def.icon} size={30} />
        {!unlocked && (
          <span class="ev-badge-lock">
            <Icon name="lock" size={14} />
          </span>
        )}
      </span>
      <span class="ev-badge-label">
        <PT text="อีเวนต์" size={10} weight={600} color="#fff6dc" shadow="#16324a" />
      </span>
      <span class="ev-badge-time">
        <PT text={unlocked ? fmtCountdownTiny(left) : `Lv.${def.level}`} size={9} weight={600} color={unlocked ? '#5a3410' : '#fff1d6'} />
      </span>
      {n > 0 && <span class="badge num ev-badge-n">{n}</span>}
    </button>
  )
}
