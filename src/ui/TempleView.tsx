// Hosts the walkable world canvas for the current area.

import { useEffect, useRef } from 'preact/hooks'
import { Stage } from '../engine/stage'
import { WorldScene, type ArriveTarget } from '../scenes/world'
import { mapFor } from '../scenes/maps'
import { game } from '../game/state'
import { lookKey } from '../art/avatar'
import { area, arrived } from './store'
import { setAmbientMood, sfx } from '../engine/audio'
import { currentPhase } from '../scenes/sky'
import { hotspotActions } from './hotspots'

let current: WorldScene | null = null
let autoOpen: string | null = null

/** Walk to a hotspot and open its main activity on arrival. */
export function travelTo(hotspotId: string) {
  if (!current) return
  autoOpen = hotspotId
  current.goTo(hotspotId)
}

export function worldScene() {
  return current
}

export function TempleView({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const stage = useRef<Stage | null>(null)

  useEffect(() => {
    stage.current = new Stage(host.current!, { targetWidth: 180 })
    return () => {
      stage.current?.destroy()
      stage.current = null
      current = null
    }
  }, [])

  useEffect(() => {
    const s = game.value
    const onArrive = (t: ArriveTarget) => {
      if (t.kind === 'hotspot' && autoOpen === t.hotspot.id) {
        autoOpen = null
        const acts = hotspotActions(t.hotspot.id)
        if (acts[0]) {
          acts[0].run()
          return
        }
      }
      autoOpen = null
      sfx.open()
      arrived.value = t
    }
    const scene = new WorldScene(mapFor(area.value), s.player.look, { onArrive, onMove: () => (arrived.value = null) }, { companion: s.companion })
    current = scene
    stage.current!.setScene(scene)
    arrived.value = null
  }, [area.value])

  const lk = lookKey(game.value.player.look)
  useEffect(() => {
    current?.setLook(game.value.player.look)
  }, [lk])

  const comp = game.value.companion
  useEffect(() => {
    current?.setCompanion(comp)
  }, [comp])

  useEffect(() => {
    if (!stage.current) return
    if (active) stage.current.start()
    else stage.current.stop()
  }, [active])

  useEffect(() => {
    const id = setInterval(() => {
      const ph = currentPhase()
      setAmbientMood(ph === 'night' || ph === 'dusk' ? 'night' : 'day')
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const hl = arrived.value?.kind === 'hotspot' ? arrived.value.hotspot.id : null
  useEffect(() => {
    if (current) current.highlight = hl
  }, [hl])

  return <div class="stage-host" ref={host} />
}
