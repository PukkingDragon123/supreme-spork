// Difficulty chips for a prayer stage: hint level, tempo, timing, pass mark.

import { HINT_LABEL, JUDGE_LABEL, stageStarScores, tempoLabel, type PrayerStage } from '../../game/data/prayers'
import { Icon } from './common'
import '../../styles/chant.css'

export function StageChips({ st }: { st: PrayerStage }) {
  const h = HINT_LABEL[st.hint]
  return (
    <div class="ch-chips">
      <span class={`ch-chip hint-${st.hint}`} title={h.desc}>
        <Icon name={h.icon} size={12} /> {h.name}
      </span>
      <span class="ch-chip">
        <Icon name="music" size={12} /> {tempoLabel(st.tempo)}
      </span>
      <span class="ch-chip">
        <Icon name="star" size={12} /> {JUDGE_LABEL[st.judge]}
      </span>
      <span class="ch-chip pass">ผ่าน ≥ {stageStarScores(st)[0]}</span>
      {(st.rounds ?? 1) > 1 && <span class="ch-chip">{st.rounds} รอบ</span>}
    </div>
  )
}

