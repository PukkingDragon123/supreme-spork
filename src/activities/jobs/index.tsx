// Temple volunteer jobs (งานอาสาในวัด): `openActivity('job', { job: '<id>' })`.

import { useState } from 'preact/hooks'
import { JOB_BY_ID, type JobId } from '../../game/data/jobs'
import { closeActivity, type ActivityRequest } from '../../ui/store'
import { PBtn, Window } from '../../ui/components/kit'
import type { JobScene } from './base'
import { JobRun } from './shell'
import { SweepScene } from './sweep'
import { MopScene } from './mop'
import { FishScene } from './fish'
import { CatfishScene } from './catfish'
import { ShoeScene } from './shoes'
import { CandleScene } from './candles'
import { WaterScene } from './water'
import { BrassScene } from './brass'
import { StatueScene } from './statues'

/** Virtual stage width per job (smaller = chunkier, bigger art on screen). */
export const JOB_STAGE_WIDTH: Partial<Record<JobId, number>> = {
  arrange_shoes: 160,
  water_plants: 160,
}

/** Scene factory per job id. */
export const JOB_SCENES: Partial<Record<JobId, () => JobScene>> = {
  sweep_leaves: () => new SweepScene(),
  mop_floor: () => new MopScene(),
  feed_fish: () => new FishScene(),
  feed_catfish: () => new CatfishScene(),
  arrange_shoes: () => new ShoeScene(),
  light_candles: () => new CandleScene(),
  water_plants: () => new WaterScene(),
  polish_brass: () => new BrassScene(),
  wipe_statues: () => new StatueScene(),
}

export function JobActivity({ req }: { req: ActivityRequest }) {
  const id = String(req.params?.job ?? '')
  const def = JOB_BY_ID[id]
  const make = def ? JOB_SCENES[def.id] : undefined
  const [round, setRound] = useState(0)
  if (!def || !make) {
    return (
      <div class="activity">
        <Window title="งานอาสา" icon="broom" onClose={closeActivity} footer={<PBtn tone="green" block onClick={closeActivity}>กลับ</PBtn>}>
          <p class="goal-main">วันนี้ยังไม่มีงานนี้ ลองงานอื่นก่อนนะ</p>
        </Window>
      </div>
    )
  }
  return <JobRun key={`${id}:${round}`} def={def} make={make} tw={JOB_STAGE_WIDTH[def.id]} onAgain={() => setRound((r) => r + 1)} />
}

export { JobGoalCard } from './shell'
