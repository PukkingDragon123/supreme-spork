// Puts real online players into the walkable world: one RemotePlayer per
// real player on this map, driven by an interpolation buffer fed from
// presence updates, with emote poses. When real players are around the
// simulated crowd thins out so the place doesn't feel fake.

import type { RemotePlayer, WorldScene } from '../../scenes/world'
import { net, type NetPlayer } from '../../services/net'
import { InterpTable } from '../../services/netInterp'
import { lookKey } from '../../art/avatar'
import { emotePose } from './onlineStore'

const interp = new InterpTable({ delay: 150, teleport: 96, extrapolate: 120 })
const clock = () => performance.now()

/** How many simulated players to keep when `real` real players are on the map. */
export function thinCrowd<T>(sim: T[], real: number): T[] {
  if (real <= 0) return sim
  // Each real player replaces two simulated ones; a busy real crowd replaces them all.
  const keep = real >= 4 ? 0 : Math.max(0, Math.min(sim.length, sim.length - real * 2))
  return sim.slice(0, keep)
}

function toRemote(p: NetPlayer): RemotePlayer {
  const id = p.id
  return {
    id,
    name: p.name,
    look: p.look,
    pet: p.pet ?? null,
    level: p.level,
    real: true,
    guest: !!p.guest,
    doing: p.doing ?? null,
    pos: () => {
      const q = interp.sample(id, clock())
      if (!q) return null
      const pose = emotePose(id, Date.now())
      // Emotes face the camera.
      return pose ? { x: q.x, y: q.y, face: q.moving ? q.face : 'down', moving: q.moving && !pose, pose } : { ...q, pose: null }
    },
  }
}

/**
 * Keep a scene's other players in sync with the network. `simulated()` gives
 * the simulated crowd (re-rolled every minute). Returns a detach function.
 */
export function attachNet(scene: WorldScene, simulated: () => RemotePlayer[], hidden: () => boolean): () => void {
  const mapId = scene.map.id
  // Fresh buffers per map: nobody slides in from where they stood on the last one.
  interp.clear()
  let sim = simulated()
  let lastKey = ''
  const refresh = (force = false) => {
    if (hidden()) {
      if (lastKey !== 'hidden') scene.setRemotePlayers([])
      lastKey = 'hidden'
      return
    }
    if (lastKey === 'hidden') force = true
    const now = clock()
    const list = net.players(mapId)
    for (const p of list) interp.push(p.id, { t: now, x: p.x, y: p.y, face: p.face, moving: !!p.moving })
    interp.retain([...list, ...net.everyone()].map((p) => p.id))
    // Rebuild the entity list only when who / how they look changed.
    const key = list.map((p) => `${p.id}|${p.name}|${p.level}|${lookKey(p.look)}|${p.pet ?? ''}|${p.doing ?? ''}|${p.guest ? 1 : 0}`).join('\n') + `#${sim.length}`
    if (!force && key === lastKey) return
    lastKey = key
    scene.setRemotePlayers([...list.map(toRemote), ...thinCrowd(sim, list.length)])
  }
  refresh(true)
  const off = net.onChange(() => refresh())
  const timer = setInterval(() => {
    sim = simulated()
    refresh(true)
  }, 60_000)
  // Settings (show others) and quiet periods: a cheap check every second.
  const poll = setInterval(() => refresh(), 1000)
  return () => {
    off()
    clearInterval(timer)
    clearInterval(poll)
  }
}
