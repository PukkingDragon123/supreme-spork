// Main menu: six big, clear buttons; everything else sits behind a small
// "เพิ่มเติม" list.

import { useState } from 'preact/hooks'
import { Window, PBtn } from './components/kit'
import { claimableCount } from './Hotbar'
import { coinStoreOpen, mode, openPanel, profileOpen, settingsOpen, tab, type Tab } from './store'
import { signOut } from './account'
import { soldCount } from '../game/market'
import { presence } from '../services/presence'
import { game } from '../game/state'
import { sfx } from '../engine/audio'
import { netSummary } from './online/onlineStore'
import { openBotMenu } from './botnoi/botStore'
import { startTutorial } from '../game/botnoi'
import { closeAll } from './botnoi/tutorialSteps'

/** Remembered while the app runs, so "เพิ่มเติม" stays open between visits. */
let moreOpen = false

export function Menu() {
  const [more, setMore] = useState(moreOpen)
  const close = () => openPanel(null)
  const go = (t: Tab) => {
    close()
    tab.value = t
  }
  const n = claimableCount()
  const fresh = game.value.collection.fresh.length
  return (
    <Window title="เมนู" icon="menu" onClose={close}>
      <div class="menu-grid menu-big">
        <PBtn tone="green" icon="shop" onClick={() => go('shop')}>
          ร้านค้า
        </PBtn>
        <PBtn tone="wood" icon="bag" onClick={() => openPanel('bag')}>
          กระเป๋า
        </PBtn>
        <PBtn tone="gold" icon="scroll" onClick={() => go('quests')}>
          ภารกิจ{n ? ` (${n})` : ''}
        </PBtn>
        <PBtn tone="pink" icon="gift" onClick={() => openPanel('collection')}>
          สมุดสะสม{fresh ? ` (${fresh})` : ''}
        </PBtn>
        <PBtn tone="paper" icon="gear" onClick={() => (close(), (settingsOpen.value = true))}>
          ตั้งค่า
        </PBtn>
        <PBtn tone="blue" icon="sparkle" onClick={() => (close(), openBotMenu('home'))}>
          บอทน้อย
        </PBtn>
      </div>
      <button
        class="menu-more-toggle"
        aria-expanded={more}
        onClick={() => {
          sfx.tap()
          moreOpen = !more
          setMore(!more)
        }}
      >
        {more ? '▲ ซ่อน' : '▼ เพิ่มเติม'}
      </button>
      {more && (
        <div class="menu-more">
          <button onClick={() => (close(), openPanel('dress'))}>แต่งตัว</button>
          <button onClick={() => go('social')}>เพื่อน</button>
          <button onClick={() => openPanel('chants')}>บทสวด</button>
          <button onClick={() => openPanel('mala')}>ลูกประคำ</button>
          <button onClick={() => (close(), sfx.open(), (profileOpen.value = true))}>สมุดบุญ</button>
          <button onClick={() => openPanel('reminder')}>เตือนสวด</button>
          <button onClick={() => openPanel('market')}>ตลาดนัด{soldCount() ? ` (${soldCount()})` : ''}</button>
          <button onClick={() => (close(), (coinStoreOpen.value = true))}>บุญคอยน์</button>
          <button onClick={() => (closeAll(), startTutorial(true))}>เล่นบทเรียนอีกครั้ง</button>
          <button class="danger" onClick={() => (close(), signOut())}>
            ออกจากระบบ
          </button>
        </div>
      )}
      <p class="small muted center menu-note">
        <span class="online-dot" /> {netSummary.value.count > 0 ? `ออนไลน์จริง ${netSummary.value.count.toLocaleString('th-TH')} คน` : `ผู้เล่นจำลอง ${presence().onlineCount().toLocaleString('th-TH')} คน`}{mode.value === 'world' ? ' · แตะนอกหน้าต่างเพื่อเล่นต่อ' : ''}
      </p>
    </Window>
  )
}
