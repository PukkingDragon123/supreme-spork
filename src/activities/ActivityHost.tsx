// Renders whichever merit activity is currently open.

import type { FunctionComponent } from 'preact'
import { useState } from 'preact/hooks'
import { activity, closeActivity, type ActivityId, type ActivityRequest } from '../ui/store'
import { GOALS } from './goals'
import { game, mutate } from '../game/state'
import { PBtn, Window } from '../ui/components/kit'
import { Icon } from '../ui/components/common'
import { goalRequest } from './kit'
import { BRIEFS, TempleBrief } from './temple-brief'
import { HallActivity } from './hall'
import { WishActivity } from './wish'
import { SiamsiActivity } from './siamsi'
import { GoldLeafActivity } from './goldleaf'
import { AlmsActivity } from './alms'
import { KoiActivity } from './koi'
import { DogActivity } from './dog'
import { BellsActivity } from './bells'
import { HolyWaterActivity } from './holywater'
import { DeityActivity } from './deity'
import { LotteryActivity } from './lottery'
import { DonateActivity } from './donate'
import { KrathongActivity } from './krathong'
import { CircleActivity } from './circle'
import { JobActivity } from './jobs'
import { CookActivity } from './cook'
import { FairActivity, HubBoard } from './fair'

const REGISTRY: Partial<Record<ActivityId, FunctionComponent<{ req: ActivityRequest }>>> = {
  hall: HallActivity,
  chant: HallActivity,
  meditate: HallActivity,
  wish: WishActivity,
  siamsi: SiamsiActivity,
  gold_leaf: GoldLeafActivity,
  alms: AlmsActivity,
  koi: KoiActivity,
  dog: DogActivity,
  bells: BellsActivity,
  holy_water: HolyWaterActivity,
  deity: DeityActivity,
  lottery: LotteryActivity,
  donate: DonateActivity,
  krathong: KrathongActivity,
  circle: CircleActivity,
  job: JobActivity,
  cook: CookActivity,
  fair: FairActivity,
  hub: HubBoard,
}

export function GoalCard({ id, onStart, onClose }: { id: ActivityId; onStart: () => void; onClose?: () => void }) {
  const g = GOALS[id]
  if (!g) return null
  return (
    <Window title={g.title} icon={g.icon} onClose={onClose} footer={<PBtn tone="green" block size="big" icon="play" onClick={onStart}>เริ่มเลย</PBtn>}>
      <p class="goal-main">{g.goal}</p>
      <ol class="goal-steps">
        {g.steps.map((s, i) => (
          <li key={i}>
            <span class="goal-n num">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div class="panel gold goal-reward small">
        <Icon name="gift" size={18} /> {g.reward}
      </div>
    </Window>
  )
}

export function ActivityHost() {
  const a = activity.value
  const [started, setStarted] = useState<string | null>(null)
  const [briefed, setBriefed] = useState<ActivityRequest | null>(null)
  if (!a) return null
  const C = REGISTRY[a.id]
  if (!C) return null
  const key = `${a.id}:${JSON.stringify(a.params ?? {})}`
  const needGoal = !!GOALS[a.id] && !game.value.seen.tips.includes(`goal:${a.id}`) && started !== key
  const again = goalRequest.value === a.id
  const start = () => {
    setStarted(key)
    goalRequest.value = null
    mutate((d) => {
      if (!d.seen.tips.includes(`goal:${a.id}`)) d.seen.tips.push(`goal:${a.id}`)
    })
  }
  // Temple games get the host's brief card (price, deals) every time they open.
  if (BRIEFS[a.id]) {
    const show = briefed !== a || again
    const go = () => {
      setBriefed(a)
      start()
    }
    return (
      <>
        <C key={key} req={a} />
        {show && <TempleBrief req={a} again={again} onStart={go} onBack={closeActivity} />}
      </>
    )
  }
  // Key on id + params so switching activities remounts cleanly.
  return (
    <>
      <C key={key} req={a} />
      {(needGoal || again) && <GoalCard id={a.id} onStart={start} onClose={again ? start : closeActivity} />}
    </>
  )
}
