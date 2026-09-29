import { describe, expect, it } from 'vitest'
import { CRAFTABLE, FLOORS, FURNITURE, FURNITURE_BY_ID, MATERIALS, WALLPAPERS } from '../data/furniture'
import {
  addToStorage,
  canCraft,
  canPlace,
  CLEAR_ZONES,
  cosyTier,
  defaultHouse,
  findSpot,
  FIXED_LAYOUT,
  missingFor,
  moveFurniture,
  nextUid,
  normalizeHouse,
  ownedCount,
  placeFurniture,
  ROOM,
  roomScore,
  setFloor,
  setWallpaper,
  spendRecipe,
  storeFurniture,
  unlockSurface,
  starterLayout,
  switchRoom,
  unlockRoom,
  viewRoom,
  roomLayout,
  clearZones,
  fixedLayout,
  type HouseState,
} from '../house'
import { ROOMS, ROOM_IDS, isRoomId } from '../data/rooms'
import { ROOM_FLOORS, ROOM_WALLPAPERS } from '../data/roomFurniture'

const withStored = (id: string, n = 1): HouseState => addToStorage(defaultHouse(), id, n)

describe('catalogue', () => {
  it('has unique ids and sane footprints', () => {
    const ids = new Set<string>()
    for (const f of FURNITURE) {
      expect(ids.has(f.id)).toBe(false)
      ids.add(f.id)
      expect(f.w).toBeGreaterThan(0)
      expect(f.h).toBeGreaterThan(0)
      const cols = f.kind === 'wall' ? ROOM.wallCols : ROOM.cols
      const rows = f.kind === 'wall' ? ROOM.wallRows : ROOM.rows
      expect(f.w).toBeLessThanOrEqual(cols)
      expect(f.h).toBeLessThanOrEqual(rows)
      for (const k of Object.keys(f.recipe)) expect(MATERIALS.some((m) => m.id === k)).toBe(true)
    }
  })

  it('has plenty of craftables with Thai names and a recipe', () => {
    expect(CRAFTABLE.length).toBeGreaterThanOrEqual(26)
    for (const f of CRAFTABLE) {
      expect(f.name).toMatch(/[฀-๿]/)
      expect(f.desc.length).toBeGreaterThan(5)
      expect(Object.keys(f.recipe).length).toBeGreaterThan(0)
    }
  })

  it('has the built-ins and surfaces the room needs', () => {
    expect(FURNITURE_BY_ID.wardrobe_mirror.interact).toBe('wardrobe')
    expect(FURNITURE_BY_ID.door.interact).toBe('door')
    expect(FURNITURE_BY_ID.altar_shelf.interact).toBe('altar')
    expect(FURNITURE_BY_ID.workbench.interact).toBe('workbench')
    expect(FURNITURE_BY_ID.workbench.fixed).toBeFalsy()
    expect(WALLPAPERS).toHaveLength(5 + ROOM_WALLPAPERS.length)
    expect(FLOORS).toHaveLength(4 + ROOM_FLOORS.length)
  })
})

describe('default house', () => {
  it('is valid: every placed item fits where it is', () => {
    const h = defaultHouse()
    for (const p of h.placed) expect(canPlace(h, p.id, p.x, p.y, p.uid)).toBe(true)
  })

  it('contains the built-ins and a cosy starter set', () => {
    const h = defaultHouse()
    for (const f of FIXED_LAYOUT) expect(h.placed.some((p) => p.uid === f.uid)).toBe(true)
    for (const id of ['bed_simple', 'rug_mat', 'plant_monstera', 'workbench']) expect(h.placed.some((p) => p.id === id)).toBe(true)
    expect(h.surfaces).toContain(h.wallpaper)
    expect(h.surfaces).toContain(h.floor)
  })

  it('normalises to itself', () => {
    const h = defaultHouse()
    expect(normalizeHouse(JSON.parse(JSON.stringify(h)))).toEqual(h)
  })
})

describe('canPlace', () => {
  const h = defaultHouse()

  it('rejects out of bounds and fractional positions', () => {
    expect(canPlace(h, 'chair_rattan', -1, 5)).toBe(false)
    expect(canPlace(h, 'chair_rattan', ROOM.cols, 5)).toBe(false)
    expect(canPlace(h, 'bed_simple', 0, ROOM.rows - 2)).toBe(false)
    expect(canPlace(h, 'chair_rattan', 1.5, 5)).toBe(false)
    expect(canPlace(h, 'nope', 1, 5)).toBe(false)
  })

  it('stops floor items overlapping each other and the built-ins', () => {
    expect(canPlace(h, 'chair_rattan', 2, 1)).toBe(false) // on the bed
    expect(canPlace(h, 'chair_rattan', 0, 0)).toBe(false) // inside the wardrobe
    expect(canPlace(h, 'chair_rattan', 1, 6)).toBe(true)
  })

  it('lets rugs slide under furniture but not under built-ins or other rugs', () => {
    expect(canPlace(h, 'rug_cloth', 2, 1)).toBe(true) // under the bed
    expect(canPlace(h, 'rug_cloth', 0, 0)).toBe(false) // under the wardrobe
    expect(canPlace(h, 'rug_cloth', 4, 4)).toBe(false) // on the reed mat
    expect(canPlace(h, 'chair_rattan', 5, 4)).toBe(true) // chair on the mat
  })

  it('keeps the door and wardrobe fronts clear (except for rugs)', () => {
    for (const z of CLEAR_ZONES) expect(canPlace(h, 'chair_rattan', z.x, z.y)).toBe(false)
    const empty: HouseState = { ...h, placed: h.placed.filter((p) => p.id !== 'plant_monstera') }
    expect(canPlace(empty, 'rug_cloth', 8, 0)).toBe(true)
  })

  it('keeps wall items on the wall grid, away from the window and each other', () => {
    expect(canPlace(h, 'clock_wall', 0, 0)).toBe(true) // above the wardrobe
    expect(canPlace(h, 'clock_wall', 5, 1)).toBe(false) // on the window
    expect(canPlace(h, 'clock_wall', 2, 0)).toBe(false) // on the altar shelf
    expect(canPlace(h, 'clock_wall', 8, 3)).toBe(false) // on the door
    expect(canPlace(h, 'clock_wall', 8, 0)).toBe(true) // above the door
    expect(canPlace(h, 'clock_wall', 2, ROOM.wallRows)).toBe(false)
    // Wall items don't collide with floor items below them.
    expect(canPlace(h, 'frames_trio', 2, 2)).toBe(true)
  })

  it('ignores the item being moved', () => {
    const bed = h.placed.find((p) => p.id === 'bed_simple')!
    expect(canPlace(h, 'bed_simple', 2, 1)).toBe(false)
    expect(canPlace(h, 'bed_simple', 2, 1, bed.uid)).toBe(true)
  })
})

describe('place / move / store', () => {
  it('places from storage and uses a fresh uid', () => {
    const h = withStored('chair_rattan', 2)
    const n = placeFurniture(h, 'chair_rattan', 1, 6, true)
    expect(n).not.toBe(h)
    expect(n.storage.chair_rattan).toBe(1)
    const p = n.placed[n.placed.length - 1]
    expect(p).toMatchObject({ id: 'chair_rattan', x: 1, y: 6, flip: true })
    expect(h.placed.some((q) => q.uid === p.uid)).toBe(false)
    const m = placeFurniture(n, 'chair_rattan', 2, 6)
    expect(m.storage.chair_rattan).toBeUndefined()
    expect(ownedCount(m, 'chair_rattan')).toBe(2)
  })

  it('refuses without stock or on a taken spot', () => {
    const h = defaultHouse()
    expect(placeFurniture(h, 'chair_rattan', 1, 6)).toBe(h)
    const s = withStored('chair_rattan')
    expect(placeFurniture(s, 'chair_rattan', 2, 1)).toBe(s)
  })

  it('moves and flips items, but never built-ins', () => {
    const h = defaultHouse()
    const plant = h.placed.find((p) => p.id === 'plant_monstera')!
    const m = moveFurniture(h, plant.uid, 0, 7, true)
    expect(m.placed.find((p) => p.uid === plant.uid)).toMatchObject({ x: 0, y: 7, flip: true })
    expect(moveFurniture(h, plant.uid, 2, 1)).toBe(h) // onto the bed
    expect(moveFurniture(h, 'fixed:wardrobe_mirror', 0, 5)).toBe(h)
    expect(moveFurniture(h, 'missing', 0, 5)).toBe(h)
    // Keeps flip when not given.
    expect(moveFurniture(m, plant.uid, 1, 7).placed.find((p) => p.uid === plant.uid)?.flip).toBe(true)
  })

  it('stores items back but keeps built-ins', () => {
    const h = defaultHouse()
    const bed = h.placed.find((p) => p.id === 'bed_simple')!
    const s = storeFurniture(h, bed.uid)
    expect(s.placed.some((p) => p.uid === bed.uid)).toBe(false)
    expect(s.storage.bed_simple).toBe(1)
    expect(storeFurniture(h, 'fixed:door')).toBe(h)
  })

  it('nextUid never collides', () => {
    const h = defaultHouse()
    const u = nextUid(h)
    expect(h.placed.some((p) => p.uid === u)).toBe(false)
  })

  it('findSpot finds a valid place or null', () => {
    const h = defaultHouse()
    const s = findSpot(h, 'bed_teak')!
    expect(s).not.toBeNull()
    expect(canPlace(h, 'bed_teak', s.x, s.y)).toBe(true)
    const w = findSpot(h, 'bunting')!
    expect(canPlace(h, 'bunting', w.x, w.y)).toBe(true)
    expect(findSpot(h, 'nope')).toBeNull()
  })
})

describe('surfaces', () => {
  it('only switches to owned wallpaper/floors', () => {
    const h = defaultHouse()
    expect(setWallpaper(h, 'wp_kanok')).toBe(h)
    const u = unlockSurface(h, 'wp_kanok')
    expect(setWallpaper(u, 'wp_kanok').wallpaper).toBe('wp_kanok')
    expect(unlockSurface(u, 'wp_kanok')).toBe(u)
    expect(setFloor(unlockSurface(h, 'fl_terrazzo'), 'fl_terrazzo').floor).toBe('fl_terrazzo')
    expect(unlockSurface(h, 'bogus')).toBe(h)
  })
})

describe('crafting', () => {
  const bed = FURNITURE_BY_ID.bed_simple // wood 4, cloth 3

  it('checks materials, coins and level', () => {
    expect(canCraft({ wood: 4, cloth: 3 }, 0, bed)).toBe(true)
    expect(canCraft({ wood: 3, cloth: 3 }, 0, bed)).toBe(false)
    const fan = FURNITURE_BY_ID.fan_stand
    expect(canCraft({ wood: 1, clay: 1 }, 39, fan)).toBe(false)
    expect(canCraft({ wood: 1, clay: 1 }, 40, fan)).toBe(true)
    const teak = FURNITURE_BY_ID.bed_teak
    const rich = { wood: 99, cloth: 99, gold: 99 }
    expect(canCraft(rich, 0, teak)).toBe(true)
    expect(canCraft(rich, 0, teak, 1)).toBe(false)
    expect(canCraft(rich, 0, teak, teak.level)).toBe(true)
  })

  it('reports what is missing', () => {
    expect(missingFor({ wood: 1 }, 10, { recipe: { wood: 4, gold: 1 }, coins: 25, level: 3 }, 1)).toEqual({
      mats: { wood: 3, gold: 1 },
      coins: 15,
      level: 2,
    })
    expect(missingFor({ wood: 9 }, 0, bed)).toEqual({ mats: { cloth: 3 }, coins: 0, level: 0 })
  })

  it('spends a recipe', () => {
    expect(spendRecipe({ wood: 5, cloth: 3, gold: 1 }, bed)).toEqual({ wood: 1, gold: 1 })
  })
})

describe('roomScore', () => {
  it('rewards decorating, with diminishing returns for copies', () => {
    const h = defaultHouse()
    const base = roomScore(h)
    expect(base).toBeGreaterThan(0)
    const one = placeFurniture(withStored('lamp_paper', 3), 'lamp_paper', 1, 6)
    const s1 = roomScore(one)
    expect(s1).toBeGreaterThan(base)
    const two = placeFurniture(one, 'lamp_paper', 1, 7)
    const three = placeFurniture(two, 'lamp_paper', 2, 7)
    const d1 = s1 - base
    const d3 = roomScore(three) - roomScore(two)
    expect(d3).toBeLessThan(d1)
    expect(d3).toBeGreaterThan(0)
  })

  it('likes a new wallpaper and an altar table', () => {
    const h = defaultHouse()
    const wp = setWallpaper(unlockSurface(h, 'wp_teak'), 'wp_teak')
    expect(roomScore(wp)).toBeGreaterThan(roomScore(h))
    const alt = placeFurniture(withStored('altar_table'), 'altar_table', 0, 3)
    expect(alt.placed.some((p) => p.id === 'altar_table')).toBe(true)
    expect(roomScore(alt) - roomScore(h)).toBeGreaterThan(15)
  })

  it('maps scores to tiers', () => {
    expect(cosyTier(0).index).toBe(0)
    expect(cosyTier(10_000).next).toBeNull()
    expect(cosyTier(roomScore(defaultHouse())).name.length).toBeGreaterThan(0)
  })
})

describe('normalizeHouse', () => {
  it('repairs junk', () => {
    expect(normalizeHouse(null)).toEqual(defaultHouse())
    const h = normalizeHouse({
      wallpaper: 'bogus',
      floor: 'fl_mat',
      placed: [
        { uid: 'u1', id: 'bed_simple', x: 2, y: 0 },
        { uid: 'u1', id: 'chair_rattan', x: 6, y: 6 }, // duplicate uid
        { uid: 'u9', id: 'chair_rattan', x: 2, y: 1 }, // overlaps the bed → storage
        { uid: 'u10', id: 'unknown', x: 1, y: 1 },
        { uid: 'u11', id: 'door', x: 0, y: 0 }, // built-ins come from the layout
      ],
      storage: { lamp_paper: 2, bogus: 3, window_big: 1 },
    })
    expect(h.wallpaper).toBe('wp_cream')
    expect(h.floor).toBe('fl_mat')
    expect(h.surfaces).toContain('fl_mat')
    expect(h.storage).toEqual({ lamp_paper: 2, chair_rattan: 1 })
    const uids = h.placed.map((p) => p.uid)
    expect(new Set(uids).size).toBe(uids.length)
    expect(h.placed.filter((p) => p.id === 'door')).toHaveLength(1)
    expect(h.placed.filter((p) => p.id === 'chair_rattan')).toHaveLength(1)
    for (const p of h.placed) expect(canPlace(h, p.id, p.x, p.y, p.uid)).toBe(true)
  })
})

describe('rooms', () => {
  it('defines every room with valid built-ins, surfaces and a starter layout that fits', () => {
    expect(ROOMS.length).toBe(10)
    for (const r of ROOMS) {
      expect(r.name).toMatch(/[฀-๿]/)
      expect(WALLPAPERS.some((w) => w.id === r.wallpaper)).toBe(true)
      expect(FLOORS.some((f) => f.id === r.floor)).toBe(true)
      expect(r.fixed.some((f) => f.id === 'door')).toBe(true)
      for (const f of r.fixed) expect(FURNITURE_BY_ID[f.id]?.fixed).toBe(true)
      const lay = starterLayout(r.id)
      const h: HouseState = { ...defaultHouse(), ...lay, room: r.id }
      for (const p of lay.placed) expect(canPlace(h, p.id, p.x, p.y, p.uid), `${r.id}:${p.id}@${p.x},${p.y}`).toBe(true)
      const uids = lay.placed.map((p) => p.uid)
      expect(new Set(uids).size).toBe(uids.length)
    }
  })

  it('keeps the wardrobe front clear only in the bedroom', () => {
    expect(clearZones('bedroom')).toHaveLength(2)
    expect(clearZones('kitchen')).toHaveLength(1)
    expect(fixedLayout('shrine').map((p) => p.id)).toContain('altar_grand')
  })

  it('switches rooms, saving the old layout and opening the new one with its starter set', () => {
    let h = unlockRoom(defaultHouse(), 'shrine')
    expect(h.owned).toContain('shrine')
    const bedroomPlaced = h.placed
    h = switchRoom(h, 'shrine')
    expect(h.room).toBe('shrine')
    expect(h.wallpaper).toBe('wp_rotnam')
    expect(h.surfaces).toContain('wp_rotnam')
    expect(h.placed.some((p) => p.id === 'altar_grand')).toBe(true)
    expect(h.rooms.bedroom?.placed).toEqual(bedroomPlaced)
    expect(h.rooms.shrine).toBeUndefined()
    // Rearrange the shrine, walk out and back in: the change is remembered.
    h = placeFurniture(addToStorage(h, 'lamp_paper'), 'lamp_paper', 0, 6)
    const back = switchRoom(h, 'bedroom')
    expect(back.placed).toEqual(bedroomPlaced)
    const again = switchRoom(back, 'shrine')
    expect(again.placed.some((p) => p.id === 'lamp_paper')).toBe(true)
    // Storage is shared by every room.
    expect(again.storage).toEqual(h.storage)
  })

  it('refuses rooms the player does not own unless they are free for them', () => {
    const h = defaultHouse()
    expect(switchRoom(h, 'north')).toBe(h)
    expect(switchRoom(h, 'bogus' as never)).toBe(h)
    expect(switchRoom(h, 'north', ['north']).room).toBe('north')
    expect(unlockRoom(h, 'bogus' as never)).toBe(h)
  })

  it('uses the room rules when placing', () => {
    const h = switchRoom(unlockRoom(addToStorage(defaultHouse(), 'chair_rattan'), 'kitchen'), 'kitchen')
    // No wardrobe in the kitchen, so its front is free; the counter is not.
    expect(canPlace(h, 'chair_rattan', 0, 1)).toBe(true)
    expect(canPlace(h, 'chair_rattan', 1, 0)).toBe(false)
  })

  it('previews a room without changing anything', () => {
    const h = defaultHouse()
    const v = viewRoom(h, 'bkk')
    expect(v.room).toBe('bkk')
    expect(v.placed.some((p) => p.id === 'window_wide')).toBe(true)
    expect(h.room).toBe('bedroom')
    expect(roomLayout(h, 'bkk')).toBeNull()
    expect(viewRoom(h, 'bedroom')).toBe(h)
  })

  it('counts copies in every room', () => {
    let h = unlockRoom(addToStorage(defaultHouse(), 'lamp_paper', 2), 'shrine')
    h = placeFurniture(h, 'lamp_paper', 1, 6)
    h = switchRoom(h, 'shrine')
    h = placeFurniture(h, 'lamp_paper', 0, 6)
    expect(ownedCount(h, 'lamp_paper')).toBe(2)
  })

  it('knows its room ids', () => {
    expect(ROOM_IDS).toContain('isan')
    expect(isRoomId('isan')).toBe(true)
    expect(isRoomId('attic')).toBe(false)
  })
})

describe('room migration', () => {
  it('turns a single-room save into room 1 (the bedroom), keeping everything', () => {
    const old = {
      wallpaper: 'wp_mint',
      floor: 'fl_mat',
      placed: [
        { uid: 'fixed:wardrobe_mirror', id: 'wardrobe_mirror', x: 0, y: 0 },
        { uid: 'u1', id: 'bed_simple', x: 2, y: 0 },
        { uid: 'u7', id: 'tv_flat', x: 5, y: 3 },
      ],
      storage: { chair_rattan: 2 },
      surfaces: ['wp_cream', 'fl_oak', 'wp_mint', 'fl_mat'],
    }
    const h = normalizeHouse(old)
    expect(h.room).toBe('bedroom')
    expect(h.owned).toEqual(['bedroom'])
    expect(h.rooms).toEqual({})
    expect(h.wallpaper).toBe('wp_mint')
    expect(h.floor).toBe('fl_mat')
    expect(h.storage).toEqual({ chair_rattan: 2 })
    expect(h.placed.find((p) => p.uid === 'u7')).toMatchObject({ id: 'tv_flat', x: 5, y: 3 })
    for (const f of FIXED_LAYOUT) expect(h.placed.some((p) => p.uid === f.uid)).toBe(true)
    // And the migrated room is a proper room: walking out and back keeps it.
    const round = switchRoom(switchRoom(unlockRoom(h, 'shrine'), 'shrine'), 'bedroom')
    expect(round.placed).toEqual(h.placed)
  })

  it('round-trips a multi-room save through JSON', () => {
    let h = unlockRoom(unlockRoom(defaultHouse(), 'shrine'), 'kitchen')
    h = switchRoom(h, 'shrine')
    h = switchRoom(h, 'kitchen')
    const again = normalizeHouse(JSON.parse(JSON.stringify(h)))
    expect(again).toEqual(h)
  })

  it('repairs saved rooms: bad rooms dropped, misfits back to storage', () => {
    const h = normalizeHouse({
      ...defaultHouse(),
      room: 'shrine',
      wallpaper: 'nope', // unknown → the room's own default
      owned: ['shrine', 'bogus', 'shrine'],
      placed: [{ uid: 'u1', id: 'chair_rattan', x: 3, y: 0 }], // under the big altar → storage
      rooms: {
        bedroom: defaultHouse(),
        attic: { wallpaper: 'wp_cream', floor: 'fl_oak', placed: [] },
      },
    })
    expect(h.room).toBe('shrine')
    expect(h.owned).toEqual(['bedroom', 'shrine'])
    expect(Object.keys(h.rooms)).toEqual(['bedroom'])
    expect(h.storage.chair_rattan).toBe(1)
    expect(h.placed.some((p) => p.id === 'altar_grand')).toBe(true)
    expect(h.wallpaper).toBe('wp_rotnam')
  })
})
