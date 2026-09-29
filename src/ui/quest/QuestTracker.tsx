// Floating quest-tracker pill in the world HUD: the tracked NPC quest's
// current step with progress; tap → quest log, arrow → นำทาง. With no quest
// running it points at someone on this map who has a quest to give.

import { useEffect, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { questPulse, questStatus, trackedInfo } from '../../game/npcQuests'
import { NPC_QUESTS } from '../../game/data/npcQuests'
import { sfx, haptic } from '../../engine/audio'
import { Icon } from '../components/common'
import { mapId, tab } from '../store'
import { goToSpot, navigateQuest, questDialog, questTab } from './questUi'
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
  // The conversation sheet already shows the quest.
  if (questDialog.value) return null
  if (!info) return <QuestHint />
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

/** No quest running: invite the player to someone nearby with a "!". */
function QuestHint() {
  const s = game.value
  const here = mapId.value
  const def = NPC_QUESTS.find((q) => q.map === here && questStatus(q, s) === 'available')
  if (!def) return null
  return (
    <div class="qt-pill hint">
      <button
        class="qt-main"
        onClick={() => {
          sfx.open()
          questTab.value = 'npc'
          tab.value = 'quests'
        }}
        aria-label={`${def.npcName}มีเควสต์ให้`}
      >
        <span class="qt-mark">!</span>
        <span class="qt-body">
          <span class="qt-title">มีคนรอให้ช่วย · ได้ {def.reward.coins} เหรียญ</span>
          <span class="qt-step">
            {def.npcName} · {def.title}
          </span>
        </span>
      </button>
      <button
        class="qt-nav"
        aria-label={`ไปหา${def.npcName}`}
        onClick={() => {
          sfx.whoosh()
          goToSpot(def.map, def.giver)
        }}
      >
        <Icon name="map" size={20} />
      </button>
    </div>
  )
}
