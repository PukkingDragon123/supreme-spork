import { game } from '../game/state'
import { QUEST_POOL } from '../game/data/quests'
import { questBonusReady, loginInfo } from '../game/actions'
import { Icon } from './components/common'
import { tab, type Tab, arrived } from './store'
import { sfx } from '../engine/audio'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'temple', label: 'วัด', icon: 'temple' },
  { id: 'quests', label: 'ภารกิจ', icon: 'scroll' },
  { id: 'shop', label: 'ร้านค้า', icon: 'shop' },
  { id: 'wardrobe', label: 'แต่งตัว', icon: 'shirt' },
  { id: 'social', label: 'เพื่อน', icon: 'friends' },
]

export function NavBar() {
  const s = game.value
  const claimable =
    s.daily.quests.filter((q) => !q.claimed && q.progress >= (QUEST_POOL.find((d) => d.id === q.id)?.target ?? 1)).length +
    (questBonusReady() ? 1 : 0) +
    (loginInfo().canClaim ? 1 : 0)
  return (
    <nav class="nav panel" aria-label="เมนูหลัก">
      {TABS.map((t) => (
        <button
          key={t.id}
          class={`nav-btn ${tab.value === t.id ? 'active' : ''}`}
          onClick={() => {
            sfx.tap()
            arrived.value = null
            tab.value = t.id
          }}
          aria-current={tab.value === t.id ? 'page' : undefined}
        >
          <Icon name={t.icon} size={26} />
          <span>{t.label}</span>
          {t.id === 'quests' && claimable > 0 && <span class="badge num">{claimable}</span>}
        </button>
      ))}
    </nav>
  )
}
