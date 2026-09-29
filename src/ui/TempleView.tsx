// Hosts the walkable world canvas for the current area.

import { useEffect, useRef, useState } from 'preact/hooks'
import { Stage } from '../engine/stage'
import { WorldScene, type ArriveTarget } from '../scenes/world'
import { hasMap, mapFor } from '../scenes/maps'
import { game } from '../game/state'
import { lookKey } from '../art/avatar'
import { area, arrived, mapId } from './store'
import { setAmbientMood, sfx } from '../engine/audio'
import { currentPhase } from '../scenes/sky'
import { hotspotActions } from './hotspots'
import type { Pickup, PickupKindT as PickupKind } from '../scenes/world'
import { mutate } from '../game/state'
import { dayKey } from '../game/time'
import { Rng } from '../engine/rng'
import { MATERIAL_INFO } from '../game/materials'
import { toast } from '../game/events'

let current: WorldScene | null = null
let autoOpen: string | null = null
/** Map we just left through a door (picks the matching entry point). */
let prevMap: string | null = null

/** Walk to a hotspot and open its main activity on arrival. */
export function travelTo(hotspotId: string) {
  if (!current) return
  autoOpen = hotspotId
  current.goTo(hotspotId)
}

export function worldScene() {
  return current
}

const PICKUPS_PER_DAY = 5
const PICK_KINDS: PickupKind[] = ['wood', 'cloth', 'clay', 'gold', 'flower', 'wood', 'flower', 'cloth']

/** Today's collectible pickups for an area (same every time you visit that day). */
function todaysPickups(id: string, spots: { x: number; y: number }[]): Pickup[] {
  const day = dayKey()
  const taken = game.value.pickups.day === day ? game.value.pickups.taken : []
  const rng = new Rng(`${day}:${id}:${game.value.player.friendCode}`)
  const pool = spots.map((p, i) => ({ ...p, i }))
  const out: Pickup[] = []
  for (let n = 0; n < Math.min(PICKUPS_PER_DAY, pool.length); n++) {
    const k = rng.int(0, pool.length - 1)
    const sp = pool.splice(k, 1)[0]
    const pid = `${id}:${sp.i}`
    if (!taken.includes(pid)) out.push({ id: pid, kind: rng.pick(PICK_KINDS), x: sp.x, y: sp.y })
  }
  return out
}

function collect(id: string, kind: PickupKind) {
  mutate((d) => {
    const day = dayKey()
    if (d.pickups.day !== day) d.pickups = { day, taken: [] }
    if (!d.pickups.taken.includes(id)) d.pickups.taken.push(id)
    d.materials[kind] = (d.materials[kind] ?? 0) + 1
  })
  sfx.sparkle()
  toast(`เก็บ${MATERIAL_INFO[kind].name}ได้ 1 ชิ้น`, 'hammer')
}

/** DOM speech bubbles for tappable scenery characters. */
function SpeechLayer({ stage }: { stage: { current: Stage | null } }) {
  const layer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const pool: HTMLDivElement[] = []
    const tick = () => {
      const sc = current
      const st = stage.current
      const el = layer.current
      if (sc && st && el) {
        const bs = sc.speechBubbles()
        while (pool.length < bs.length) {
          const d = document.createElement('div')
          d.className = 'say'
          el.appendChild(d)
          pool.push(d)
        }
        pool.forEach((d, i) => {
          const b = bs[i]
          d.style.display = b ? 'block' : 'none'
          if (!b) return
          const [x, y] = st.toCss(b.x, b.y)
          if (d.textContent !== b.text) d.textContent = b.text
          d.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`
          d.style.opacity = String(b.alpha)
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div class="say-layer" ref={layer} aria-live="polite" />
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

  const [fade, setFade] = useState(false)

  useEffect(() => {
    const s = game.value
    const onArrive = (t: ArriveTarget) => {
      // Doors lead straight into another map (interiors, shops, courtyards).
      if (t.kind === 'hotspot' && t.hotspot.id.startsWith('door:')) {
        const to = t.hotspot.id.slice(5)
        if (!hasMap(to)) return
        autoOpen = null
        sfx.whoosh()
        setFade(true)
        setTimeout(() => {
          prevMap = mapId.value
          mapId.value = to
          setTimeout(() => setFade(false), 60)
        }, 260)
        return
      }
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
    const map = mapFor(mapId.value)
    if (map.area && map.area !== area.value) area.value = map.area
    const entry = prevMap ? map.entries?.[prevMap] : undefined
    const scene = new WorldScene(
      map,
      s.player.look,
      { onArrive, onMove: () => (arrived.value = null), onPickup: collect, onSay: () => undefined },
      { companion: s.companion, pet: s.pet, spawn: entry, pickups: map.indoor ? [] : todaysPickups(map.id, map.pickupSpots) },
    )
    prevMap = null
    current = scene
    stage.current!.setScene(scene)
    arrived.value = null
  }, [mapId.value])

  const lk = lookKey(game.value.player.look)
  useEffect(() => {
    current?.setLook(game.value.player.look)
  }, [lk])

  const pet = game.value.pet
  useEffect(() => {
    current?.setPet(pet)
  }, [pet])

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

  return (
    <>
      <div class="stage-host" ref={host} />
      <SpeechLayer stage={stage} />
      <div class={`map-fade ${fade ? 'on' : ''}`} />
    </>
  )
}
