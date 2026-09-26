// Pause-style main menu window.

import { Window, PBtn } from './components/kit'
import { claimableCount } from './Hotbar'
import { coinStoreOpen, mode, openPanel, profileOpen, settingsOpen, tab, type Tab } from './store'
import { signOut } from './account'
import { sfx } from '../engine/audio'

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
        <PBtn size="small" tone="gold" icon="coin" onClick={() => (close(), (coinStoreOpen.value = true))}>
          บุญคอยน์
        </PBtn>
        <PBtn size="small" tone="paper" icon="gear" onClick={() => (close(), (settingsOpen.value = true))}>
          ตั้งค่า
        </PBtn>
      </div>
      {mode.value === 'world' && <p class="small muted center menu-note">เกมหยุดชั่วคราว · แตะนอกหน้าต่างเพื่อเล่นต่อ</p>}
    </Window>
  )
}
