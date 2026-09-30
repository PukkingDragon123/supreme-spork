// Minimal in-game HUD: round portrait with level + two bars (merit to the
// next level, today's prayer goal) and the coin counter.

import { useMemo } from 'preact/hooks'
import { game, level } from '../game/state'
import { spriteDataUrl } from '../engine/sprite'
import { dollPortrait } from '../art/doll'
import { lookKey } from '../art/avatar'
import { Icon } from './components/common'
import { PT, TONE_TEXT } from './pixeltext'
import { coinStoreOpen, profileOpen } from './store'
import { sfx } from '../engine/audio'
import { DAILY_PRAYER_GOAL, prayersToday } from '../game/prayer'
import { EventBadge } from './views/EventBadge'
import { HomeTag } from './homeland/ProvincePicker'
import { OnlinePill } from './online/OnlinePill'

export function PortraitRing({ size = 72 }: { size?: number }) {
  const look = game.value.player.look
  const url = useMemo(() => spriteDataUrl(dollPortrait(look), 4), [lookKey(look)])
  return (
    <span class="ring" style={{ width: `${size}px`, height: `${size}px` }}>
      <img class="px" src={url} alt="" draggable={false} />
    </span>
  )
}

export function Hud() {
  const s = game.value
  const lv = level.value
  const done = Math.min(DAILY_PRAYER_GOAL, prayersToday(s))
  return (
    <div class="hud2">
      <button class="hud2-player" onClick={() => (sfx.open(), (profileOpen.value = true))} aria-label="โปรไฟล์และสมุดบุญ">
        <PortraitRing />
        <span class="hud2-lv num">{lv.level}</span>
        <span class="hud2-bars">
          <span class="hud2-name"><PT text={s.player.name} size={12} color="#fff6dc" shadow="#1c120c" /><HomeTag /></span>
          <span class="hbar gold" title="บุญสะสมสู่เลเวลถัดไป">
            <span style={{ width: `${Math.round((lv.into / Math.max(1, lv.need)) * 100)}%` }} />
          </span>
          <span class="hbar green" title={`สวดมนต์วันนี้ ${done}/${DAILY_PRAYER_GOAL}`}>
            <span style={{ width: `${(done / DAILY_PRAYER_GOAL) * 100}%` }} />
            <i class="hbar-ticks" />
          </span>
        </span>
      </button>
      <button class="hud2-coins" onClick={() => (sfx.open(), (coinStoreOpen.value = true))} aria-label={`บุญคอยน์ ${s.coins} เติมเพิ่ม`}>
        <Icon name="coin" size={22} />
        <PT text={s.coins.toLocaleString('en-US')} size={14} weight={600} {...TONE_TEXT.wood} />
        <span class="hud2-plus">
          <Icon name="plus" size={14} />
        </span>
      </button>
      <EventBadge />
      <OnlinePill />
    </div>
  )
}
