// Beach mini-games: `openActivity('beach', { game: '<BeachGameId>' })` from a
// `beach:<game>` hotspot on a beach map. Every round starts with the brief
// card (host, what to do, price and deals). The photo spot is its own
// screen (photo.tsx).

import { useState } from 'preact/hooks'
import { BEACH_GAMES, type BeachGameId } from '../../game/data/beaches'
import { closeActivity, type ActivityRequest } from '../../ui/store'
import { PBtn, Window } from '../../ui/components/kit'
import type { BeachScene } from './base'
import { BeachRun } from './shell'
import { ChediScene } from './chedi'
import { CleanupScene } from './cleanup'
import { TurtleScene } from './turtle'
import { ShellsScene } from './shells'
import { SnorkelScene } from './snorkel'
import { BananaScene } from './banana'
import { PhotoSpot } from './photo'
import './beach.css'

/** Scene factory per timed beach game. */
export const BEACH_SCENES: Partial<Record<BeachGameId, () => BeachScene>> = {
  chedi: () => new ChediScene(),
  cleanup: () => new CleanupScene(),
  turtle: () => new TurtleScene(),
  shells: () => new ShellsScene(),
  snorkel: () => new SnorkelScene(),
  banana: () => new BananaScene(),
}

export function BeachActivity({ req }: { req: ActivityRequest }) {
  const id = String(req.params?.game ?? '') as BeachGameId
  const [round, setRound] = useState(0)
  if (id === 'photo') return <PhotoSpot />
  const def = BEACH_GAMES[id]
  const make = BEACH_SCENES[id]
  if (!def || !make) {
    return (
      <div class="activity">
        <Window title="ริมหาด" icon="sun" onClose={closeActivity} footer={<PBtn tone="green" block onClick={closeActivity}>กลับ</PBtn>}>
          <p class="goal-main">กิจกรรมนี้ปิดพักแป๊บนึง ลองอย่างอื่นก่อนนะ</p>
        </Window>
      </div>
    )
  }
  return <BeachRun key={`${id}:${round}`} id={id} make={make} onAgain={() => setRound((r) => r + 1)} />
}
