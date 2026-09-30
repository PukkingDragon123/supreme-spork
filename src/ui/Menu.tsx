// Pause-style main menu window.

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

export function Menu() {
  const close = () => openPanel(null)
  const go = (t: Tab) => {
    close()
    tab.value = t
  }
  const n = claimableCount()
  return (
    <Window title="เมนู" icon="menu" onClose={close} footer={<PBtn tone="red" size="small" icon="logout" onClick={() => (close(), signOut())}>ออกจากระบบ</PBtn>}>
      <div class="menu-grid">
        <PBtn size="small" tone="gold" icon="scroll" onClick={() => go('quests')}>
          ภารกิจ{n ? ` (${n})` : ''}
        </PBtn>
        <PBtn size="small" tone="green" icon="shop" onClick={() => go('shop')}>
          ร้านค้า
        </PBtn>
        <PBtn size="small" tone="pink" icon="shirt" onClick={() => (close(), openPanel('dress'))}>
          แต่งตัว
        </PBtn>
        <PBtn size="small" tone="blue" icon="friends" onClick={() => go('social')}>
          เพื่อน
        </PBtn>
        <PBtn size="small" tone="wood" icon="book" onClick={() => openPanel('chants')}>
          บทสวด
        </PBtn>
        <PBtn size="small" tone="wood" icon="mala" onClick={() => openPanel('mala')}>
          ลูกประคำ
        </PBtn>
        <PBtn size="small" tone="paper" icon="user" onClick={() => (close(), sfx.open(), (profileOpen.value = true))}>
          สมุดบุญ
        </PBtn>
        <PBtn size="small" tone="paper" icon="bell" onClick={() => openPanel('reminder')}>
          เตือนสวด
        </PBtn>
        <PBtn size="small" tone="gold" icon="market" onClick={() => openPanel('market')}>
          ตลาดนัด{soldCount() ? ` (${soldCount()})` : ''}
        </PBtn>
        <PBtn size="small" tone="pink" icon="gift" onClick={() => openPanel('collection')}>
          สมุดสะสม{game.value.collection.fresh.length ? ` (${game.value.collection.fresh.length})` : ''}
        </PBtn>
        <PBtn size="small" tone="gold" icon="coin" onClick={() => (close(), (coinStoreOpen.value = true))}>
          บุญคอยน์
        </PBtn>
        <PBtn size="small" tone="paper" icon="gear" onClick={() => (close(), (settingsOpen.value = true))}>
          ตั้งค่า
        </PBtn>
        <PBtn size="small" tone="blue" icon="sparkle" onClick={() => (close(), openBotMenu('home'))}>
          บอทน้อย
        </PBtn>
        <PBtn size="small" tone="green" icon="book" onClick={() => (closeAll(), startTutorial(true))}>
          เล่นบทเรียนอีกครั้ง
        </PBtn>
      </div>
      <p class="small muted center menu-note">
        <span class="online-dot" /> {netSummary.value.count > 0 ? `ออนไลน์จริง ${netSummary.value.count.toLocaleString('th-TH')} คน` : `ผู้เล่นจำลอง ${presence().onlineCount().toLocaleString('th-TH')} คน`}{mode.value === 'world' ? ' · แตะนอกหน้าต่างเพื่อเล่นต่อ' : ''}
      </p>
    </Window>
  )
}
