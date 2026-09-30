// HUD: the "🟢 3 คนออนไลน์จริง" pill (opens the online list) and, when
// connected, the chat button under it.

import { game } from '../../game/state'
import { sfx } from '../../engine/audio'
import { netBoot } from '../../services/netInit'
import { chatOpen, netSummary, onlinePanelOpen } from './onlineStore'
import { mode } from '../store'
import { NIcon } from './netIcons'
import './online.css'

export function pillText(): { dot: 'green' | 'yellow' | 'grey' | 'ghost'; text: string; sub?: string } {
  const n = netSummary.value
  if (n.kind === 'offline') return netBoot.value === 'probing' ? { dot: 'yellow', text: 'กำลังหาห้องออนไลน์…' } : { dot: 'grey', text: 'ออฟไลน์', sub: 'คนในแผนที่เป็นแบบจำลอง' }
  if (n.status === 'error') return { dot: 'grey', text: 'เชื่อมต่อออนไลน์ไม่ได้' }
  if (n.status !== 'online') return { dot: 'yellow', text: 'กำลังเชื่อมต่อ…' }
  if (game.value.online.hidden) return { dot: 'ghost', text: 'ซ่อนตัวอยู่', sub: `ออนไลน์จริง ${n.count} คน` }
  if (!n.count) return { dot: 'green', text: 'ออนไลน์ · ยังไม่มีใคร' }
  return { dot: 'green', text: `${n.count} คนออนไลน์จริง`, sub: n.here ? `อยู่ที่นี่ ${n.here} คน` : undefined }
}

export function OnlinePill() {
  const p = pillText()
  const n = netSummary.value
  const live = mode.value === 'world' && n.kind !== 'offline' && n.status === 'online' && !game.value.online.hidden
  return (
    <div class="ol-hud">
      <button
        class={`ol-pill dot-${p.dot}`}
        onClick={() => {
          sfx.open()
          onlinePanelOpen.value = true
        }}
        aria-label={`ออนไลน์ตอนนี้: ${p.text}`}
      >
        <i class="ol-dot" aria-hidden="true" />
        <span class="ol-pill-body">
          <span class="ol-pill-text">{p.text}</span>
          {p.sub && <span class="ol-pill-sub">{p.sub}</span>}
        </span>
      </button>
      {live && (
        <button
          class={`ol-fab ${chatOpen.value ? 'on' : ''}`}
          onClick={() => {
            sfx.tap()
            chatOpen.value = !chatOpen.value
          }}
          aria-label="แชทและอีโมต"
        >
          <NIcon name="chat" size={26} />
          {n.here > 0 && <span class="ol-fab-n num">{n.here}</span>}
        </button>
      )}
    </div>
  )
}
