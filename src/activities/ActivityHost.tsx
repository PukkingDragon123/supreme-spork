// Renders whichever merit activity is currently open.

import type { FunctionComponent } from 'preact'
import { activity, type ActivityId, type ActivityRequest } from '../ui/store'
import { HallActivity } from './hall'
import { WishActivity } from './wish'
import { SiamsiActivity } from './siamsi'
import { GoldLeafActivity } from './goldleaf'
import { DedicateActivity } from './dedicate'
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

const REGISTRY: Partial<Record<ActivityId, FunctionComponent<{ req: ActivityRequest }>>> = {
  hall: HallActivity,
  chant: HallActivity,
  meditate: HallActivity,
  wish: WishActivity,
  siamsi: SiamsiActivity,
  gold_leaf: GoldLeafActivity,
  dedicate: DedicateActivity,
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
}

export function ActivityHost() {
  const a = activity.value
  if (!a) return null
  const C = REGISTRY[a.id]
  if (!C) return null
  // Key on id + params so switching activities remounts cleanly.
  return <C key={`${a.id}:${JSON.stringify(a.params ?? {})}`} req={a} />
}
