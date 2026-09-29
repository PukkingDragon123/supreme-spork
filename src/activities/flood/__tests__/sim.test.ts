import { describe, expect, it } from 'vitest'
import { FloodSim, KINDS, STAR_RESCUES, starsForRescued, type SimEvent, type Steer, type Survivor } from '../sim'

const DT = 1 / 30

function step(sim: FloodSim, seconds: number, steer: (s: FloodSim) => Steer | null = () => null) {
  const out: SimEvent[] = []
  for (let t = 0; t < seconds && !sim.done; t += DT) {
    sim.update(DT, steer(sim))
    out.push(...sim.takeEvents())
  }
  return out
}

/** Park the boat right at a survivor's pickup point. */
function park(sim: FloodSim, s: Survivor) {
  const [x, y] = sim.dockOf(s)
  sim.boat.x = x
  sim.boat.y = y
  sim.boat.vx = sim.boat.vy = 0
}

/** Greedy autopilot: fetch the most urgent reachable survivor, unload when full or nobody is left. */
function bot(sim: FloodSim): Steer | null {
  const b = sim.boat
  const free = b.seats - sim.seatsUsed()
  const open = sim.survivors.filter((s) => (s.state === 'wait' || s.state === 'adrift') && KINDS[s.kind].seats <= free)
  const goShore = !open.length || free <= 0 || (b.aboard.length > 0 && sim.timeLeft < 8)
  let tx: number
  let ty: number
  if (goShore) {
    if (!b.aboard.length) return null
    tx = b.x
    ty = sim.shoreY + 6
  } else {
    const score = (s: Survivor) => {
      const [x, y] = sim.dockOf(s)
      const urgent = s.state === 'adrift' ? 60 : sim.houses[s.house!]?.danger ? 40 : 0
      return Math.hypot(x - b.x, y - b.y) - urgent - KINDS[s.kind].points
    }
    const t = open.sort((a, c) => score(a) - score(c))[0]
    ;[tx, ty] = sim.dockOf(t)
  }
  const dx = tx - b.x
  const dy = ty - b.y
  const d = Math.hypot(dx, dy)
  if (!goShore && d < 5) return null
  const m = Math.min(1, d / 20)
  return { x: (dx / d) * m, y: (dy / d) * m }
}

describe('flood rescue sim', () => {
  it('builds the same village for the same seed', () => {
    const a = new FloodSim({ seed: 'x', w: 195 })
    const b = new FloodSim({ seed: 'x', w: 195 })
    expect(a.houses.map((h) => [h.x, h.floodAt])).toEqual(b.houses.map((h) => [h.x, h.floodAt]))
    expect(a.survivors.length).toBe(b.survivors.length)
    expect(a.survivors.some((s) => s.kind === 'vipcat')).toBe(true)
    expect(a.survivors.some((s) => s.kind === 'buffalo')).toBe(true)
    expect(a.totalLives()).toBeGreaterThanOrEqual(STAR_RESCUES[2])
  })

  it('does nothing until started', () => {
    const sim = new FloodSim({ seed: 1 })
    step(sim, 2, () => ({ x: 1, y: 0 }))
    expect(sim.elapsed).toBe(0)
    expect(sim.level).toBe(0)
  })

  it('picks someone up after idling next to them, then saves them at the temple', () => {
    const sim = new FloodSim({ seed: 2 })
    sim.started = true
    const kid = sim.survivors.find((s) => s.kind === 'kid' && s.state === 'wait')!
    park(sim, kid)
    const ev = step(sim, KINDS.kid.hold + 0.3)
    expect(ev.some((e) => e.type === 'pickup' && e.id === kid.id)).toBe(true)
    expect(kid.state).toBe('aboard')
    expect(sim.boat.aboard).toContain(kid.id)
    sim.boat.x = sim.w / 2
    sim.boat.y = sim.shoreY + 10
    const ev2 = step(sim, 1)
    expect(kid.state).toBe('saved')
    expect(ev2.some((e) => e.type === 'saved' && e.id === kid.id)).toBe(true)
    expect(sim.score).toBeGreaterThanOrEqual(KINDS.kid.points)
    expect(sim.rescued()).toBe(1)
  })

  it('will not pick up while racing past', () => {
    const sim = new FloodSim({ seed: 3 })
    sim.started = true
    const s = sim.survivors.find((x) => x.state === 'wait')!
    park(sim, s)
    sim.boat.vx = 60
    // Keep full throttle sideways for a few frames.
    for (let i = 0; i < 4; i++) sim.update(DT, { x: 1, y: 0 })
    expect(s.state).toBe('wait')
  })

  it('respects the seats: the buffalo needs two', () => {
    const sim = new FloodSim({ seed: 4 })
    sim.started = true
    const others = sim.survivors.filter((s) => s.kind !== 'buffalo' && s.state === 'wait').slice(0, 3)
    for (const o of others) {
      o.state = 'aboard'
      sim.boat.aboard.push(o.id)
    }
    const buff = sim.survivors.find((s) => s.kind === 'buffalo')!
    park(sim, buff)
    const ev = step(sim, 2)
    expect(buff.state).toBe('wait')
    expect(ev.some((e) => e.type === 'full')).toBe(true)
  })

  it('gives a family bonus when a whole family reaches the temple', () => {
    const sim = new FloodSim({ seed: 5 })
    sim.started = true
    const fam = sim.survivors.filter((s) => s.family === 'บ้านยายมา')
    expect(fam).toHaveLength(3)
    for (const s of fam) {
      s.state = 'aboard'
      sim.boat.aboard.push(s.id)
    }
    sim.boat.y = sim.shoreY + 10
    const ev = step(sim, 1.5)
    expect(fam.every((s) => s.state === 'saved')).toBe(true)
    const f = ev.find((e) => e.type === 'family')
    expect(f).toBeTruthy()
    expect(sim.families).toBe(1)
    // Three off the boat in one trip is a full-boat bonus too.
    step(sim, 0.1, () => ({ x: 0, y: 1 }))
    sim.boat.y = sim.shoreY + 60
    const ev2 = step(sim, 0.2)
    expect(ev.concat(ev2).some((e) => e.type === 'trip')).toBe(true)
  })

  it('floods houses as the water rises and survivors drift until the helicopter comes', () => {
    const sim = new FloodSim({ seed: 6 })
    sim.started = true
    const tuk = sim.houses.find((h) => h.style === 'tuktuk')!
    const cat = sim.survivors.find((s) => s.house === tuk.id)!
    sim.boat.x = 10
    sim.boat.y = sim.shoreY + 10
    const ev: SimEvent[] = []
    while (!ev.some((e) => e.type === 'flood' && e.house === tuk.id) && sim.elapsed < 80) ev.push(...step(sim, 0.5))
    expect(ev.some((e) => e.type === 'danger' && e.house === tuk.id)).toBe(true)
    expect(tuk.flooded).toBe(true)
    expect(sim.level).toBeGreaterThanOrEqual(tuk.floodAt)
    expect(cat.state).toBe('adrift')
    const ev2 = step(sim, 16)
    expect(cat.state).toBe('gone')
    expect(ev2.concat(ev).some((e) => e.type === 'heli' && e.id === cat.id)).toBe(true)
  })

  it('crashing into debris stuns the boat', () => {
    const sim = new FloodSim({ seed: 7 })
    sim.started = true
    const d = sim.debris[0]
    sim.boat.x = d.x
    sim.boat.y = d.y + 3
    const ev = step(sim, 0.1)
    expect(ev.some((e) => e.type === 'crash')).toBe(true)
    expect(sim.boat.stun).toBeGreaterThan(0)
    expect(sim.crashes).toBe(1)
  })

  it('power-ups: rice adds time, the rescue dog boosts, the ring adds a seat', () => {
    const sim = new FloodSim({ seed: 8 })
    sim.started = true
    const d0 = sim.duration
    for (const kind of ['rice', 'dog', 'ring'] as const) {
      sim.powers.push({ id: 999, kind, x: sim.boat.x, y: sim.boat.y, t: 0, life: 10 })
      step(sim, DT * 2)
    }
    expect(sim.duration).toBe(d0 + 6)
    expect(sim.boat.boost).toBeGreaterThan(0)
    expect(sim.boat.seats).toBe(5)
    expect(sim.powerups).toBe(3)
  })

  it('ends on time, brings passengers ashore and summarises', () => {
    const sim = new FloodSim({ seed: 9, duration: 20 })
    sim.started = true
    const s = sim.survivors.find((x) => x.kind === 'uncle')!
    s.state = 'aboard'
    sim.boat.aboard.push(s.id)
    step(sim, 25)
    expect(sim.done).toBe(true)
    const sum = sim.summary()
    expect(sum.rescued).toBe(2)
    expect(sum.people).toBe(1)
    expect(sum.animals).toBe(1)
    expect(sum.missed).toBe(sum.total - sum.rescued)
    expect(sum.stars).toBe(starsForRescued(2))
  })

  it('a steady player can earn stars (autopilot balance check)', () => {
    const results = [11, 12, 13].map((seed) => {
      const sim = new FloodSim({ seed, w: 195 })
      sim.started = true
      step(sim, 200, bot)
      return sim.summary()
    })
    for (const r of results) {
      expect(r.rescued).toBeGreaterThanOrEqual(STAR_RESCUES[0])
      expect(r.score).toBeGreaterThan(0)
    }
    // Good play reaches two stars on at least one seed; three stars stays hard.
    expect(Math.max(...results.map((r) => r.stars))).toBeGreaterThanOrEqual(2)
  })
})
