// Full-screen cinematic hosts: the intro and the temple arrival.

import { useState } from 'preact/hooks'
import { useStage } from '../../activities/kit'
import { IntroCutscene } from '../../scenes/cutscenes/intro'
import { ArrivalCutscene } from '../../scenes/cutscenes/arrival'
import { game, mutate } from '../../game/state'
import { setArea } from '../../game/actions'
import { area, arrivalTarget, mode } from '../store'
import { PT } from '../pixeltext'
import { sfx } from '../../engine/audio'

function Caption({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div class="cine-caption" key={text}>
      <PT text={text} size={15} weight={600} color="#fff6dc" shadow="#2a1a10" scale={2} />
    </div>
  )
}

function SkipBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      class="btn dark small cine-skip"
      onClick={() => {
        sfx.tap()
        onClick()
      }}
    >
      <PT text="ข้าม ▸▸" size={12} color="#fff1d6" shadow="#1c120c" />
    </button>
  )
}

export function IntroView() {
  const [cap, setCap] = useState<string | null>(null)
  const finish = () => {
    mutate((d) => {
      d.seen.intro = true
    })
    mode.value = 'title'
  }
  const { host, scene } = useStage(() => new IntroCutscene({ onCaption: setCap, onDone: finish }), { targetWidth: 200 })
  return (
    <div class="cine">
      <div class="stage-host" ref={host} />
      <div class="letterbox top" />
      <div class="letterbox bottom" />
      <Caption text={cap} />
      <SkipBtn onClick={() => scene.current?.skip()} />
    </div>
  )
}

export function ArrivalView() {
  const [cap, setCap] = useState<string | null>(null)
  const target = arrivalTarget.value
  const first = !game.value.seen.arrival.includes(target)
  const finish = () => {
    mutate((d) => {
      if (!d.seen.arrival.includes(target)) d.seen.arrival.push(target)
    })
    setArea(target)
    area.value = target
    mode.value = 'world'
  }
  const { host, scene } = useStage(
    () => new ArrivalCutscene({ look: game.value.player.look, area: target, first }, { onCaption: setCap, onDone: finish }),
    { targetWidth: 200 },
  )
  return (
    <div class="cine">
      <div class="stage-host" ref={host} />
      <div class="letterbox top" />
      <div class="letterbox bottom" />
      <Caption text={cap} />
      <SkipBtn onClick={() => scene.current?.skip()} />
    </div>
  )
}
