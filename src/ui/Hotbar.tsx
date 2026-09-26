// Bottom hotbar: home, map, the big "pray" slot, bag and menu.

import { game } from '../game/state'
import { QUEST_POOL } from '../game/data/quests'
import { loginInfo, questBonusReady } from '../game/actions'
import { Icon } from './components/common'
import { PT, TONE_TEXT } from './pixeltext'
import { goHome, goTemple, mapOpen, mode, openPanel, panel, type Panel } from './store'
import { sfx } from '../engine/audio'

export function claimableCount() {
  const s = game.value
  return (
    s.daily.quests.filter((q) => !q.claimed && q.progress >= (QUEST_POOL.find((d) => d.id === q.id)?.target ?? 1)).length +
    (questBonusReady() ? 1 : 0) +
    (loginInfo().canClaim ? 1 : 0)
  )
}

function HotSlot({ icon, label, onClick, on, badge, big }: { icon: string; label: string; onClick: () => void; on?: boolean; badge?: number; big?: boolean }) {
  return (
    <button
      class={`hot ${big ? 'big' : ''} ${on ? 'on' : ''}`}
      onClick={() => {
        sfx.tap()
        onClick()
      }}
      aria-label={label}
    >
      <span class="hot-slot">
        <Icon name={icon} size={big ? 40 : 28} />
        {!!badge && <span class="badge num hot-badge">{badge}</span>}
      </span>
      <PT text={label} size={12} class="hot-label" {...(big ? TONE_TEXT.gold : TONE_TEXT.wood)} />
    </button>
  )
}

export function Hotbar() {
  const inHouse = mode.value === 'house'
  const p = panel.value
  const toggle = (x: Panel) => openPanel(p === x ? null : x)
  return (
    <nav class="hotbar" aria-label="เมนูหลัก">
      {inHouse ? (
        <HotSlot icon="temple" label="ไปวัด" onClick={() => goTemple()} />
      ) : (
        <HotSlot icon="home" label="บ้าน" onClick={() => goHome()} />
      )}
      <HotSlot icon="map" label="แผนที่" onClick={() => (mapOpen.value = true)} />
      <HotSlot icon="pray" label="สวดมนต์" big on={p === 'pray'} onClick={() => toggle('pray')} />
      <HotSlot icon="bag" label="กระเป๋า" on={p === 'bag'} onClick={() => toggle('bag')} />
      <HotSlot icon="menu" label="เมนู" on={p === 'menu'} badge={claimableCount()} onClick={() => toggle('menu')} />
    </nav>
  )
}
