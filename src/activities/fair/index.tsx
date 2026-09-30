// Temple-fair activity (`openActivity('fair', params)`):
//   { game: darts | rings | cork | scoop | bumper | ramwong }  a ticket game (FairRun)
//   { ride: wheel | carousel | claw | likay }                  a ride / show (FairRideRun)
//   { eat: <placeShopId> }                                     eat at a food cart
//   { booth: 'prizes' }                                        the prize booth
// The hub notice board is activity 'hub' (board.tsx). Hotspot actions: hotspots.ts.

import { useEffect, useState } from 'preact/hooks'
import { FAIR_GAMES, type FairGameId } from '../../game/hubs'
import { closeActivity, type ActivityRequest } from '../../ui/store'
import { PBtn, Window } from '../../ui/components/kit'
import { FairRun, type FairScene } from './shell'
import { FairRideRun } from './ride'
import type { FairShow } from './show'
import { PrizeBooth } from './prizes'
import { EatSheet } from './eat'
import { DartsScene } from './darts'
import { RingsScene } from './rings'
import { CorkScene } from './cork'
import { ScoopScene } from './scoop'
import { BumperScene } from './bumper'
import { RamwongScene } from './ramwong'
import { WheelRide } from './wheel'
import { CarouselRide } from './carousel'
import { ClawMachine } from './claw'
import { LikayShow } from './likay'
import { RIDES, type RideId } from './rides'
import { ensureFairNet } from './live'
import '../../art/poses/fair'
import './fair.css'

export { HubBoard } from './board'

/** Scene factory per fair game. */
export const FAIR_SCENES: Record<FairGameId, () => FairScene> = {
  darts: () => new DartsScene(),
  rings: () => new RingsScene(),
  cork: () => new CorkScene(),
  scoop: () => new ScoopScene(),
  bumper: () => new BumperScene(),
  ramwong: () => new RamwongScene(),
}

/** Scene factory per ride / show. */
export const RIDE_SCENES: Record<RideId, () => FairShow> = {
  wheel: () => new WheelRide(),
  carousel: () => new CarouselRide(),
  claw: () => new ClawMachine(),
  likay: () => new LikayShow(),
}

function Closed() {
  return (
    <Window title="ซุ้มเกมงานวัด" icon="star" onClose={closeActivity} footer={<PBtn tone="green" block onClick={closeActivity}>กลับ</PBtn>}>
      <p class="goal-main">ซุ้มนี้ปิดพักแป๊บนึง ลองซุ้มอื่นก่อนนะ</p>
    </Window>
  )
}

export function FairActivity({ req }: { req: ActivityRequest }) {
  const [round, setRound] = useState(0)
  useEffect(() => ensureFairNet(), [])
  const p = req.params ?? {}
  if (p.booth === 'prizes') return <PrizeBooth />
  if (p.eat) return <EatSheet shopId={String(p.eat)} />
  if (p.ride) {
    const id = String(p.ride) as RideId
    if (!RIDES[id]) return <Closed />
    return <FairRideRun key={`${id}:${round}`} id={id} make={RIDE_SCENES[id]} paid={round > 0} onAgain={() => setRound((r) => r + 1)} />
  }
  const id = String(p.game ?? '') as FairGameId
  const def = FAIR_GAMES[id]
  const make = FAIR_SCENES[id]
  if (!def || !make) return <Closed />
  // A replay was already paid for by the result card, so it skips the how-to card.
  return <FairRun key={`${id}:${round}`} def={def} make={make} paid={round > 0} onAgain={() => setRound((r) => r + 1)} />
}
