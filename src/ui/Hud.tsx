import { game, level } from '../game/state'
import { activeBuffs, luckyColorActive } from '../game/actions'
import { titleFor } from '../game/economy'
import { DAY_COLORS } from '../art/palette'
import { AREA_BY_ID } from '../game/data/areas'
import { greeting, hourOf, isAlmsMorning, formatDuration } from '../game/time'
import { Bar, Icon, Portrait, useTicker } from './components/common'
import { area, coinStoreOpen, mapOpen, openShop, profileOpen, settingsOpen, tab } from './store'
import { sfx } from '../engine/audio'

export function Hud() {
  useTicker(15000)
  const s = game.value
  const lv = level.value
  const today = DAY_COLORS[new Date().getDay()]
  const lucky = luckyColorActive(s)
  const buffs = activeBuffs()
  const morning = isAlmsMorning(hourOf())
  return (
    <div class="hud">
      <div class="hud-row">
        <button class="panel hud-player" onClick={() => (sfx.open(), (profileOpen.value = true))} aria-label="โปรไฟล์และสมุดบุญ">
          <Portrait look={s.player.look} size={38} />
          <div class="hud-player-info">
            <div class="row" style={{ gap: '6px' }}>
              <span class="lv-badge num">Lv.{lv.level}</span>
              <span class="hud-name">{s.player.name}</span>
            </div>
            <div class="hud-title small muted">{titleFor(lv.level)}</div>
            <Bar value={lv.into} max={lv.need} label="บุญสะสมสู่เลเวลถัดไป" />
          </div>
        </button>
        <div class="hud-right">
          <button class="panel hud-coins" onClick={() => (sfx.open(), (coinStoreOpen.value = true))} aria-label="เติมบุญคอยน์">
            <Icon name="coin" size={20} />
            <span class="num">{s.coins.toLocaleString('th-TH')}</span>
            <span class="hud-plus">+</span>
          </button>
          <button class="btn paper icon-btn small" onClick={() => (sfx.open(), (settingsOpen.value = true))} aria-label="ตั้งค่า">
            <Icon name="gear" size={18} />
          </button>
        </div>
      </div>
      {tab.value === 'temple' && (
        <div class="hud-chips">
          <button class="chip gold" onClick={() => (sfx.open(), (mapOpen.value = true))}>
            <Icon name="map" size={14} /> {AREA_BY_ID[area.value].name} ▾
          </button>
          <button
            class={`chip ${lucky ? 'green' : ''}`}
            onClick={() => (tab.value = 'wardrobe')}
            title="แต่งสีประจำวันรับบุญเพิ่ม 10%"
          >
            <span class="swatch" style={{ background: today.hex }} />
            {lucky ? `ใส่สี${today.name}แล้ว +10%` : `สีมงคลวันนี้: ${today.name}`}
          </button>
          {morning && (
            <span class="chip pink">
              <Icon name="sun" size={14} /> ตักบาตรเช้า บุญ x2
            </span>
          )}
          {buffs.slice(0, 2).map((b) => (
            <button class="chip blue" key={b.id} onClick={() => openShop('boost')}>
              <Icon name={b.kind === 'coin' ? 'coinbag' : b.kind === 'animal' ? 'paw' : 'boost'} size={14} />
              {b.kind === 'coin' ? 'เหรียญ' : b.kind === 'animal' ? 'บุญสัตว์' : 'บุญ'} x{b.mult} · {formatDuration(b.until - Date.now())}
            </button>
          ))}
        </div>
      )}
      {tab.value === 'temple' && <div class="hud-greet small">{greeting(hourOf())} · ขอให้เป็นวันที่ดีนะ</div>}
    </div>
  )
}
