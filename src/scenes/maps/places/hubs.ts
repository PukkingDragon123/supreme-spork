// Hub markets (group `hubs`): ตลาดนัดจตุจักร, ตลาดน้ำดำเนินสะดวก, ตลาดร่มหุบ
// แม่กลอง, ถนนคนเดินท่าแพ, ตลาดกิมหยง, ตลาดอินโดจีน – plus the temple fair
// (งานวัด) and its haunted house interior (fair_temple:ghost). Map ids equal
// their place ids (src/game/data/places.ts).

import type { MapDef } from '../../world'
import { chatuchakMap } from './hub-chatuchak'
import { damnoenMap } from './hub-damnoen'
import { maeklongMap } from './hub-maeklong'
import { thaphaeMap } from './hub-thaphae'
import { kimyongMap } from './hub-kimyong'
import { indochinaMap } from './hub-indochina'
import { fairMap } from './fair-temple'
import { ghostMap } from './fair-ghost'

export const MAPS: Record<string, () => MapDef> = {
  hub_chatuchak: chatuchakMap,
  hub_damnoen: damnoenMap,
  hub_maeklong: maeklongMap,
  hub_thaphae: thaphaeMap,
  hub_kimyong: kimyongMap,
  hub_indochina: indochinaMap,
  fair_temple: fairMap,
  'fair_temple:ghost': ghostMap,
}
