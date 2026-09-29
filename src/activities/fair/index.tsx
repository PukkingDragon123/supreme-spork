// Temple-fair activity: `openActivity('fair', { game: 'darts' | 'rings' | 'cork' })`
// runs a booth game for prize tickets, `openActivity('fair', { booth: 'prizes' })`
// opens the prize booth. The hub notice board is activity 'hub' (board.tsx).

import { useState } from 'preact/hooks'
import { FAIR_GAMES, type FairGameId } from '../../game/hubs'
import { closeActivity, type ActivityRequest } from '../../ui/store'
import { PBtn, Window } from '../../ui/components/kit'
import { FairRun, type FairScene } from './shell'
import { PrizeBooth } from './prizes'
import { DartsScene } from './darts'
import { RingsScene } from './rings'
import { CorkScene } from './cork'
import './fair.css'

export { HubBoard } from './board'

/** Scene factory per fair game. */
export const FAIR_SCENES: Record<FairGameId, () => FairScene> = {
  darts: () => new DartsScene(),
  rings: () => new RingsScene(),
  cork: () => new CorkScene(),
}

export function FairActivity({ req }: { req: ActivityRequest }) {
  const [round, setRound] = useState(0)
  if (req.params?.booth === 'prizes') return <PrizeBooth />
  const id = String(req.params?.game ?? '') as FairGameId
  const def = FAIR_GAMES[id]
  const make = FAIR_SCENES[id]
  if (!def || !make) {
    return (
      <Window title="ซุ้มเกมงานวัด" icon="star" onClose={closeActivity} footer={<PBtn tone="green" block onClick={closeActivity}>กลับ</PBtn>}>
        <p class="goal-main">ซุ้มนี้ปิดพักแป๊บนึง ลองซุ้มอื่นก่อนนะ</p>
      </Window>
    )
  }
  // A replay was already paid for by the result card, so it skips the how-to card.
  return <FairRun key={`${id}:${round}`} def={def} make={make} paid={round > 0} onAgain={() => setRound((r) => r + 1)} />
}
