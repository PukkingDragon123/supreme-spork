// Shared builder for the beach maps. Each beach supplies its shore line,
// palettes, landmark props, hotspots and extra life; this adds what every
// beach has: the sea (deep water blocked, a wadeable shallow band where
// swimming pets paddle), the sand, surf, palms, boats, ghost crabs,
// seagulls, a beach dog, footprints, wading with a rubber ring, swimmers,
// the beach passport stamp, and the `beach:<game>` hotspots with their
// signboards.

import type { Hotspot, MapDef, PlacedProp, WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import type { Life } from '../../life'
import type { Rect } from '../../pathfind'
import { CloudShadows, SunRays } from '../../life'
import { BEACH_GAMES, BEACH_META, type BeachGameId, type BeachId } from '../../../game/data/beaches'
import { paintSand, paintSea, rentalBoard, SAND, SEA, type SandPal, type SeaPal, type ShoreFn } from '../../../art/places/beach-kit'
import { BeachArrival, BeachDog, Boats, Crabs, Footprints, Gulls, Palms, Shore, Waders, type Moored, type PalmSpot, route } from './beach-life'
import '../../../game/data/beachShops'
import '../../../art/beachMotifs'

export { route }

export type R = Rect

/** Hotspot shorthand. */
export function hs(id: string, label: string, hint: string, icon: string, rect: R, at: { x: number; y: number }, o: Partial<Hotspot> = {}): Hotspot {
  return { id, label, hint, icon, rect, at, face: 'up', ...o }
}

const BOARD: Record<BeachGameId, Parameters<typeof rentalBoard>[0]> = {
  chedi: 'photo',
  cleanup: 'clean',
  turtle: 'turtle',
  shells: 'ring',
  snorkel: 'snorkel',
  banana: 'banana',
  photo: 'photo',
}

/** A `beach:<game>` hotspot with its signboard prop (board stands at x, y; you stand below it). */
export function gameSpot(game: BeachGameId, x: number, y: number, o: { board?: boolean; label?: string; at?: { x: number; y: number }; rect?: R } = {}): { hotspot: Hotspot; props: PlacedProp[]; obstacles: R[] } {
  const def = BEACH_GAMES[game]
  const hotspot = hs(`beach:${game}`, o.label ?? def.name, def.hint, def.icon, o.rect ?? { x: x - 12, y: y - 30, w: 24, h: 32 }, o.at ?? { x, y: y + 10 }, { marker: { x, y: y - 32 }, near: 16 })
  if (o.board === false) return { hotspot, props: [], obstacles: [] }
  return { hotspot, props: [{ sprite: rentalBoard(BOARD[game]), x, y, shadow: [8, 2] }], obstacles: [{ x: x - 9, y: y - 3, w: 18, h: 4 }] }
}

export interface BeachConfig {
  id: BeachId
  w: number
  h: number
  skyH: number
  shore: ShoreFn
  sea?: SeaPal
  sand?: SandPal
  /** How far into the sea (px above the shore line) you may wade. */
  wade?: number
  /** Sand ends here (the back of the beach starts). */
  sandTo: number
  /** Paint the horizon extras, the back of the beach, landmarks on the ground... after sea and sand. */
  paint(g: Surface, night: boolean): void
  props: PlacedProp[]
  obstacles: R[]
  hotspots: Hotspot[]
  spawn: { x: number; y: number }
  palms: PalmSpot[]
  moored?: Moored[]
  routes?: ReturnType<typeof route>[]
  crabHoles: { x: number; y: number }[]
  swimmers?: { x: number; y: number }[]
  dog: { x: number; y: number; range: R; coat?: string }
  lights: MapDef['lights']
  wander: R[]
  pois: MapDef['pois']
  pickupSpots: MapDef['pickupSpots']
  life?(s: WorldScene): Life[]
  ambient?: MapDef['ambient']
  overlay?: MapDef['overlay']
  decor?: MapDef['decor']
  vendors?: MapDef['vendors']
  visitors?: number
  camBias?: number
  /** Extra areas that block walking in the water (piers are carved out of the sea by leaving them open). */
  openWater?: R[]
}

export function buildBeach(c: BeachConfig): MapDef {
  const sea = c.sea ?? SEA[BEACH_META[c.id].sea]
  const sand = c.sand ?? SAND.white
  const wade = c.wade ?? 34
  const bake = (g: Surface, night: boolean) => {
    paintSea(g, c.w, c.skyH, c.shore, night ? SEA.night : sea, c.w)
    paintSand(g, c.w, c.sandTo, c.shore, night ? SAND.night : sand, c.w + 3)
    c.paint(g, night)
  }
  // Deep water: columns above the wade line are blocked (except open corridors like piers).
  const deep: R[] = []
  for (let x = 0; x < c.w; x += 4) {
    const top = c.skyH - 4
    const bottom = Math.round(c.shore(x + 2) - wade)
    const open = (c.openWater ?? []).filter((r) => x + 4 > r.x && x < r.x + r.w)
    if (!open.length) deep.push({ x, y: top, w: 4, h: bottom - top })
    else {
      // Leave the corridor open, block around it.
      let y = top
      for (const r of open.sort((a, b) => a.y - b.y)) {
        if (r.y > y) deep.push({ x, y, w: 4, h: Math.min(bottom, r.y) - y })
        y = Math.max(y, r.y + r.h)
      }
      if (y < bottom) deep.push({ x, y, w: 4, h: bottom - y })
    }
  }
  const water: R[] = []
  for (let x = 0; x < c.w; x += 16) {
    const sy = Math.round(c.shore(x + 8))
    water.push({ x, y: sy - wade - 6, w: 16, h: wade + 4 })
  }
  const meta = BEACH_META[c.id]
  return {
    id: c.id,
    place: c.id,
    area: 'river',
    w: c.w,
    h: c.h,
    skyH: c.skyH,
    ground: sand.base,
    camBias: c.camBias ?? 0.66,
    bake,
    props: c.props,
    obstacles: [...deep, { x: 0, y: 0, w: c.w, h: c.skyH }, ...c.obstacles],
    hotspots: c.hotspots,
    spawn: { ...c.spawn, face: 'up' },
    entries: {},
    lights: c.lights,
    pickupSpots: c.pickupSpots,
    water,
    remoteChat: meta.chat,
    life(s) {
      return [
        new BeachArrival(s),
        new Shore(s, c.shore, sea, SEA.night, c.skyH),
        new Footprints(s, c.shore, c.sandTo),
        new Crabs(s, c.crabHoles),
        new Palms(s, c.palms),
        new Boats(s, c.moored ?? [], c.routes ?? []),
        new Gulls(s, { x: 0, y: c.skyH + 10, w: c.w, h: 120 }, [{ x: 20, y: c.shore(c.w / 2) + 8, w: c.w - 40, h: 30 }], 5),
        new BeachDog(s, c.shore, { x: c.dog.x, y: c.dog.y }, c.dog.range, c.dog.coat),
        new Waders(s, c.shore, c.swimmers ?? [], sea.shallow),
        new CloudShadows(s, 2),
        new SunRays(s),
        ...(c.life?.(s) ?? []),
      ]
    },
    ambient: c.ambient,
    overlay: c.overlay,
    decor: c.decor,
    wander: c.wander,
    pois: c.pois,
    cats: [],
    vendors: c.vendors ?? [],
    dogs: [],
    visitors: c.visitors ?? 5,
    fireflies: [{ x: 0, y: c.sandTo, w: 30, h: 20 }],
  }
}
