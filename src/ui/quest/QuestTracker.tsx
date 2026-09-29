// Floating quest-tracker pill in the world HUD: the tracked NPC quest's
// current step with progress; tap → quest log, arrow → นำทาง.

import { useEffect, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { questPulse, trackedInfo } from '../../game/npcQuests'
import { sfx, haptic } from '../../engine/audio'
import { Icon } from '../components/common'
import { tab } from '../store'
import { navigateQuest, questTab } from './questUi'
import './quest.css'

export function QuestTracker() {
  void game.value
  const info = trackedInfo()
  const pulse = questPulse.value
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (!pulse || Date.now() - pulse.t > 1500) return
    setFlash(true)
    if (pulse.ready) {
      sfx.chime()
      haptic(30)
    } else if (pulse.done) sfx.merit()
    const id = setTimeout(() => setFlash(false), 650)
    return () => clearTimeout(id)
  }, [pulse?.t])
  if (!info) return null
  const { def, prog, step, index, ready } = info
  const n = step ? Math.min(prog.p[index] ?? 0, step.target) : 0
  const pct = ready ? 100 : step ? Math.round(((index + n / step.target) / def.steps.length) * 100) : 0
  const count = step && step.target > 1 ? (step.event === 'meditate_sec' ? ` ${Math.floor(n)}/${step.target}วิ` : ` ${n}/${step.target}`) : ''
  return (
    <div class="qt-pill">
      <button
        class={`qt-main ${ready ? 'ready' : ''} ${flash ? 'pulse' : ''}`}
        onClick={() => {
          sfx.open()
          questTab.value = 'npc'
          tab.value = 'quests'
        }}
        aria-label={`เควสต์ ${def.title}`}
      >
        <span class="qt-mark">{ready ? '?' : '!'}</span>
        <span class="qt-body">
          <span class="qt-title">{def.title}</span>
          <span class="qt-step">{ready ? `กลับไปหา${def.npcName}รับรางวัล` : `${step?.text ?? ''}${count}`}</span>
          <span class="qt-bar">
            <i style={{ width: `${pct}%` }} />
          </span>
        </span>
      </button>
      <button
        class="qt-nav"
        aria-label="นำทาง"
        onClick={() => {
          sfx.whoosh()
          navigateQuest(def.id)
        }}
      >
        <Icon name="map" size={20} />
      </button>
    </div>
  )
}
