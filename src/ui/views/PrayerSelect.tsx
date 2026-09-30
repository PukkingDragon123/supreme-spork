// Stage select for the prayer loop, painted as a storybook journey through the
// life of the Buddha (พุทธประวัติ): the road of stages winds up a tall
// Thai-mural map from the birth at Lumbini to the Parinibbāna and the relic
// stupa. Stages open by passing the one before; temples (the old tabs) open
// by stars and show up as gates on the road. The player's doll stands at the
// next stage and walks along the road after a pass. Tap a painted scene for
// its story.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { CHAPTERS, STAGE_BY_ID, chantById, stageLines, stageStarScores, type PrayerStage } from '../../game/data/prayers'
import { chapterUnlocked, DAILY_PRAYER_GOAL, prayersToday, prevStage, stagePassed, stageUnlocked, totalStars } from '../../game/prayer'
import type { AreaId } from '../../game/data/areas'
import { MATERIAL_INFO, type MaterialId } from '../../game/materials'
import { materialSprite } from '../../art/furniture'
import { spriteDataUrl } from '../../engine/sprite'
import { Surface } from '../../engine/pixel'
import { lineWords } from '../../game/chantScore'
import { openPanel, prayStage } from '../store'
import { CloseX, PBtn, Stars } from '../components/kit'
import { PT, TONE_TEXT, renderPixelText } from '../pixeltext'
import { Coin, Icon, Merit } from '../components/common'
import { MeaningArt } from '../components/MeaningCard'
import { StageChips } from '../components/StageChips'
import { chantBookFocus } from '../chantPrefs'
import { sfx } from '../../engine/audio'
import { currentPhase } from '../../scenes/sky'
import { avatarSprite, type Pose, type View } from '../../art/avatar'
import { petSprite, type PetFacing } from '../../art/pets'
import { drawJourneyFx, journeyArt, journeyNight, type JourneyArt } from '../../art/buddhaJourney'
import { avatarStage, bandAt, chapterOfStage, gatePoint, JOURNEY, JOURNEY_BY_ID, JOURNEY_STAGES, MAP_SCALE, templeGates, thaiNum, walkFrom, walkPoint, type JourneyChapterId, type JourneyLayout, type NodeSpot } from '../../art/buddhaJourneyStory'
import { bossSprite, cartouche, lacquerTile, muralFrame, nodeSprite, parchTile, stupaSprite, type NodeLook } from '../../art/buddhaJourneyUi'
import { drawTrail, drawArrivalBurst } from '../../art/buddhaJourneyFx'
import '../../styles/chant.css'
import '../../styles/buddhaJourney.css'

export function MatChip({ id, n }: { id: MaterialId; n: number }) {
  return (
    <span class="mat-chip" title={MATERIAL_INFO[id].name}>
      <img class="px" src={spriteDataUrl(materialSprite(id), 2)} alt={MATERIAL_INFO[id].name} width={24} height={24} />
      <span class="num">×{n}</span>
    </span>
  )
}

const S = MAP_SCALE
/** The walker's box in map pixels (avatar + pet), feet near the bottom centre. */
const AV_BOX_W = 52
const AV_BOX_H = 40
/** Same step cycle the world maps use (scenes/world.ts), 8 frames a second. */
const WALK_CYCLE: Pose[] = ['walk1', 'pass', 'walk2', 'pass']

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number) {
  ctx.fillStyle = 'rgba(40, 20, 10, 0.28)'
  ctx.fillRect(Math.round(x - rx + 1), Math.round(y), rx * 2 - 2, 1)
  ctx.fillRect(Math.round(x - rx + 2), Math.round(y + 1), rx * 2 - 4, 1)
}
const AVATAR_KEY = 'boondee.bj.avatar'

function readAvatar(): string | null {
  try {
    return localStorage.getItem(AVATAR_KEY)
  } catch {
    return null
  }
}
function writeAvatar(id: string) {
  try {
    localStorage.setItem(AVATAR_KEY, id)
  } catch {
    /* private mode: the avatar simply won't walk next time */
  }
}

const isNight = () => ['dusk', 'night'].includes(currentPhase())

// Paint the journey map while the app is idle, so the stage select opens at once.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setTimeout(() => {
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1200))
    idle(() => {
      const phone = document.querySelector('.phone') as HTMLElement | null
      const w = Math.max(176, Math.min(240, Math.ceil((phone?.clientWidth ?? Math.min(480, window.innerWidth)) / S)))
      journeyArt(w)
    })
  }, 7000)
}

function nodeLook(st: PrayerStage): NodeLook {
  const n = game.value.prayer.stars[st.id] ?? 0
  if (!stageUnlocked(st)) return 'locked'
  if (n >= 3) return 'perfect'
  if (n >= 1) return 'passed'
  return 'open'
}

function templeOf(ch: JourneyChapterId): AreaId {
  return STAGE_BY_ID[JOURNEY_BY_ID[ch].stages[0]].chapter
}

// ---------------------------------------------------------------------------
// The painted map

interface MapApi {
  scrollToStage: (id: string, smooth?: boolean) => void
  art: JourneyArt | null
}

function JourneyMap({
  sel,
  onSel,
  onStory,
  onView,
  api,
}: {
  sel: PrayerStage
  onSel: (st: PrayerStage) => void
  onStory: (ch: JourneyChapterId, scene: number) => void
  onView: (ch: JourneyChapterId) => void
  api: { current: MapApi | null }
}) {
  const s = game.value
  const scroller = useRef<HTMLDivElement>(null)
  const bg = useRef<HTMLCanvasElement>(null)
  const fxc = useRef<HTMLCanvasElement>(null)
  const avEl = useRef<HTMLCanvasElement>(null)
  const [w, setW] = useState(0)
  const [art, setArt] = useState<JourneyArt | null>(null)
  const [night] = useState(isNight)
  const [offView, setOffView] = useState<0 | 1 | -1>(0)
  const still = s.settings.reduceMotion
  const view = { unlocked: (id: string) => stageUnlocked(STAGE_BY_ID[id]), passed: (id: string) => stagePassed(STAGE_BY_ID[id]) }
  const here = avatarStage(view)
  // Where the avatar stood last time: walk from there if it's a step or two back.
  const walk = useMemo(() => walkFrom(readAvatar(), here), [])
  const avatar = useRef({ a: null as NodeSpot | null, b: null as NodeSpot | null, k: 1, t0: 0, dur: 1, walking: false, arrivedAt: 0 })

  // Measure the width → art pixels.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => setW(Math.max(176, Math.min(240, Math.ceil(el.clientWidth / S))))
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  // Bake (after first paint so the panel opens at once).
  useEffect(() => {
    if (!w) return
    let dead = false
    const id = requestAnimationFrame(() =>
      setTimeout(() => {
        if (dead) return
        const a = journeyArt(w)
        if (import.meta.env.DEV) console.debug(`[bj] baked ${w}×${a.layout.h} in ${a.ms.toFixed(0)} ms`)
        setArt(a)
      }, 0),
    )
    return () => {
      dead = true
      cancelAnimationFrame(id)
    }
  }, [w])

  const L: JourneyLayout | null = art?.layout ?? null
  const nodeOf = (id: string): NodeSpot | undefined => L?.nodes.find((n) => n.stageId === id)

  // Progress trail on the painted road, up to the node the avatar stands at.
  const trailTo = (L && nodeOf(walk ?? here)?.s) ?? 0
  useEffect(() => {
    const c = bg.current
    if (!art || !c) return
    const g = new Surface(art.layout.w, art.layout.h, c)
    g.ctx.drawImage(night ? journeyNight(art) : art.day, 0, 0)
    drawTrail(g, art.layout.road, 0, trailTo)
  }, [art, night, trailTo])

  // Scroll to the avatar on open, then maybe walk.
  useEffect(() => {
    const el = scroller.current
    if (!art || !el || !L) return
    const to = nodeOf(here)!
    const from = walk ? nodeOf(walk) : undefined
    const av = avatar.current
    av.a = from ?? to
    av.b = to
    av.k = from ? 0 : 1
    const midY = from ? (from.y + to.y) / 2 : to.y
    el.scrollTop = Math.max(0, midY * S - el.clientHeight * 0.58)
    placeAvatar()
    writeAvatar(here)
    if (from) {
      const t = setTimeout(() => {
        av.t0 = performance.now()
        av.dur = still ? 1 : Math.max(1000, Math.min(2800, ((to.s - from.s) / 50) * 1000))
        av.walking = true
        sfx.whoosh()
      }, 650)
      return () => clearTimeout(t)
    }
  }, [art])

  // The walker is the same animated sprite that walks the world maps, drawn in
  // map pixels (so it scales crisply with the art) into a small box that also
  // holds the pet trotting behind.
  const facing = useRef({ view: 'front' as View, flip: false, last: null as { x: number; y: number } | null })
  const drawAvatar = (pose: Pose, view: View, flip: boolean, t: number, moving: boolean, petSide: 1 | -1) => {
    const c = avEl.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    const look = game.value.player.look
    const fx = AV_BOX_W / 2
    const fy = AV_BOX_H - 2
    const pet = game.value.pet
    const petAt = (): [number, number] => {
      // behind the walker while walking, beside them when standing
      if (!moving) return [fx + 12 * petSide, fy + 1]
      if (view === 'side') return [fx + (flip ? 13 : -13), fy]
      return view === 'back' ? [fx + 9, fy + 3] : [fx - 9, fy - 3]
    }
    const drawPet = () => {
      if (!pet) return
      const [px, py] = petAt()
      const pf: PetFacing = view === 'side' ? 'side' : view === 'back' ? 'up' : 'down'
      const ps = petSprite(pet, moving ? pf : 'down', moving ? 'walk' : 'idle', Math.floor(t * (moving ? 8 : 2)), { flip: view === 'side' && flip })
      shadow(ctx, px, py, 5)
      ctx.drawImage(ps.canvas, Math.round(px - ps.w / 2), Math.round(py - ps.h + 1))
    }
    // the pet walks behind: paint it first when it's further up the road
    const petBehind = !moving || view === 'back'
    if (petBehind) drawPet()
    const s = avatarSprite(look, view, pose, { flip })
    shadow(ctx, fx, fy, 6)
    ctx.drawImage(s.canvas, Math.round(fx - s.w / 2), Math.round(fy - s.h + 1))
    if (!petBehind) drawPet()
  }

  const avatarFeet = () => {
    const av = avatar.current
    if (!L || !av.a || !av.b) return { x: 0, y: 0, dy: 0 }
    return walkPoint(L.road, av.a, av.b, L.cx, av.k)
  }

  const placeAvatar = () => {
    const c = avEl.current
    if (!c || !L) return
    const p = avatarFeet()
    c.style.transform = `translate(${Math.round((p.x - AV_BOX_W / 2) * S)}px, ${Math.round((p.y - AV_BOX_H + 2) * S)}px)`
  }

  // The fx loop: animated sprites on the visible band, and the walking avatar.
  useEffect(() => {
    const c = fxc.current
    const el = scroller.current
    if (!art || !c || !el) return
    const g = new Surface(art.layout.w, art.layout.h, c)
    const av = avatar.current
    const face = facing.current
    let raf = 0
    let last: [number, number] | null = null
    let lastKey = ''
    const t0 = performance.now()
    const frame = () => {
      const now = performance.now()
      const t = (now - t0) / 1000
      const top = el.scrollTop / S
      const y0 = Math.floor(top - 24)
      const y1 = Math.ceil(top + el.clientHeight / S + 24)
      if (last) g.ctx.clearRect(0, last[0], art.layout.w, last[1] - last[0])
      g.ctx.clearRect(0, y0, art.layout.w, y1 - y0)
      last = [y0, y1]
      drawJourneyFx(g, art, still ? 2 : t, y0, y1, { night, viewMid: top + el.clientHeight / S / 2, still })
      // Walking: the world walk cycle, facing the way the road goes.
      let pose: Pose = 'stand'
      let moving = false
      if (av.walking && av.a && av.b) {
        const k = Math.min(1, (now - av.t0) / av.dur)
        av.k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
        const d = avatarFeet()
        if (face.last) {
          const dx = d.x - face.last.x
          const dy = d.y - face.last.y
          if (Math.hypot(dx, dy) > 0.05) {
            if (Math.abs(dx) > Math.abs(dy) * 1.2) {
              face.view = 'side'
              face.flip = dx < 0
            } else {
              face.view = dy > 0 ? 'front' : 'back'
              face.flip = false
            }
          }
        }
        face.last = { x: d.x, y: d.y }
        moving = true
        pose = WALK_CYCLE[Math.floor(((now - av.t0) / 1000) * 8) % 4]
        // Keep the walker in view.
        const py = d.y * S - el.scrollTop
        if (py < el.clientHeight * 0.3) el.scrollTop -= Math.min(6, el.clientHeight * 0.3 - py)
        if (k >= 1) {
          av.walking = false
          av.arrivedAt = now
          face.view = 'front'
          face.flip = false
          sfx.chime()
        }
      } else if (av.arrivedAt && now - av.arrivedAt < 1600 && av.b) {
        // at the stage: turn to the viewer and wai
        pose = 'wai'
        face.view = 'front'
        face.flip = false
        drawArrivalBurst(g, av.b, (now - av.arrivedAt) / 1600)
      }
      if (av.a && av.b && av.a !== av.b && av.k > 0) drawTrail(g, art.layout.road, av.a.s, av.a.s + (av.b.s - av.a.s) * av.k)
      // idle pets blink/breathe at 2 fps; walking redraws every step
      const key = `${pose}:${face.view}:${face.flip}:${moving ? Math.floor(t * 8) : Math.floor(t * 2)}`
      if (key !== lastKey) {
        const f = avatarFeet()
        drawAvatar(pose, face.view, face.flip, t, moving, av.b && f.x < av.b.x ? -1 : 1)
        lastKey = key
      }
      placeAvatar()
      if (!still || av.walking) raf = requestAnimationFrame(loop)
    }
    const loop = () => {
      if (document.visibilityState === 'visible') frame()
      else raf = requestAnimationFrame(loop)
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [art])

  // Which chapter is in view (for the header), and is the avatar off screen?
  const onScroll = () => {
    const el = scroller.current
    if (!el || !L) return
    const mid = (el.scrollTop + el.clientHeight * 0.5) / S
    onView(bandAt(L, mid).id)
    const ay = avatarFeet().y * S
    setOffView(ay < el.scrollTop + 20 ? -1 : ay > el.scrollTop + el.clientHeight - 20 ? 1 : 0)
    if (still && fxc.current) {
      // Reduced motion: repaint the (static) fx for the new view.
      const g = new Surface(L.w, L.h, fxc.current)
      const top = el.scrollTop / S
      g.ctx.clearRect(0, 0, L.w, L.h)
      drawJourneyFx(g, art!, 2, top - 24, top + el.clientHeight / S + 24, { night, viewMid: top + el.clientHeight / S / 2, still })
    }
  }
  useEffect(onScroll, [art])

  api.current = {
    art,
    scrollToStage: (id, smooth = true) => {
      const el = scroller.current
      const n = nodeOf(id)
      if (!el || !n) return
      el.scrollTo({ top: Math.max(0, n.y * S - el.clientHeight * 0.55), behavior: smooth && !still ? 'smooth' : 'auto' })
    },
  }

  const stars = totalStars(s)
  const gates = templeGates()
  return (
    <div class={`bj-mapwrap ${night ? 'night' : ''}`}>
      <div class="bj-map" ref={scroller} onScroll={onScroll}>
        {!L ? (
          <div class="bj-loading">
            <Icon name="lotus" size={36} />
            <PT text="กำลังวาดเส้นทาง…" size={13} {...TONE_TEXT.dark} />
          </div>
        ) : (
          <div class="bj-inner" style={{ width: `${L.w * S}px`, height: `${L.h * S}px`, marginLeft: `${Math.min(0, Math.floor(((scroller.current?.clientWidth ?? L.w * S) - L.w * S) / 2))}px` }}>
            <canvas ref={bg} class="bj-canvas" width={L.w} height={L.h} aria-hidden="true" />
            <canvas ref={fxc} class="bj-canvas bj-fx" width={L.w} height={L.h} aria-hidden="true" />
            {/* Locked temples: a soft veil over their part of the road. */}
            {gates.map((gt, i) => {
              if (chapterUnlocked(gt.temple, s)) return null
              const a = nodeOf(gt.stageId)!
              const next = gates[i + 1] ? nodeOf(gates[i + 1].stageId)! : null
              const top = next ? next.y + 26 : 0
              return <div key={`v${gt.temple}`} class="bj-veil" style={{ top: `${top * S}px`, height: `${(a.y + 34 - top) * S}px` }} />
            })}
            {JOURNEY.map((c, i) => {
              const b = L.bands[i]
              const entry = c.route[0] as [number, number]
              const label = `${thaiNum(c.n)} ${c.tag}`
              const half = (renderPixelText(label, { size: 9, weight: 600, shadow: '#3b1a0e' }).w * 2 + 48) / 2
              // On the สินเทา, beside (not over) the place where the road crosses it.
              const side = entry[0] < 0 ? 1 : -1
              const want = (L.cx + entry[0] + side * 22) * S + side * half
              const left = Math.max(half + 2, Math.min(L.w * S - half - 2, want))
              return (
                <div key={c.id} class={`bj-banner ${c.night ? 'night' : ''}`} style={{ left: `${left}px`, top: `${b.bottom * S}px`, ['--bj-cart' as string]: `url(${cartouche(!!c.night)})` }}>
                  <PT text={label} size={9} weight={600} color="#fff1c4" shadow="#3b1a0e" />
                </div>
              )
            })}
            {JOURNEY.map((c, ci) =>
              c.scenes.map((sc, si) => {
                const b = L.bands[ci]
                const [a0, u0, a1, u1] = sc.box
                return (
                  <button
                    key={`${c.id}-${sc.id}`}
                    class="bj-scene"
                    style={{ left: `${(L.cx + a0) * S}px`, top: `${(b.bottom - u1) * S}px`, width: `${(a1 - a0) * S}px`, height: `${(u1 - u0) * S}px` }}
                    aria-label={`เรื่องเล่า: ${sc.title}`}
                    onClick={() => (sfx.open(), onStory(c.id, si))}
                  >
                    <span class="bj-scene-tag">
                      <Icon name="scroll" size={14} />
                    </span>
                  </button>
                )
              }),
            )}
            {gates.map((gt) => {
              // A name board hung on each temple gate; a locked gate shows what it needs.
              const p = gatePoint(L, gt.stageId)
              const ch = CHAPTERS.find((c) => c.id === gt.temple)!
              const open = chapterUnlocked(gt.temple, s)
              return (
                <div key={`g${gt.temple}`} class={`bj-gate ${open ? '' : 'locked'}`} style={{ left: `${p.x * S}px`, top: `${(p.y - 11) * S}px` }} title={ch.name}>
                  {!open && <Icon name="lock" size={12} />}
                  <PT text={open ? ch.short : `${Math.min(stars, ch.stars)}/${ch.stars}★`} size={7} weight={600} {...(open ? TONE_TEXT.gold : TONE_TEXT.dark)} />
                </div>
              )
            })}
            {L.nodes.map((n) => {
              const st = STAGE_BY_ID[n.stageId]
              const got = s.prayer.stars[st.id] ?? 0
              const look = nodeLook(st)
              const open = look !== 'locked'
              const final = n.i === L.nodes.length - 1
              const cls = ['bj-node', st.big ? 'boss' : '', final ? 'final' : '', look, n.stageId === here && open && !got ? 'next' : '', sel.id === st.id ? 'sel' : ''].join(' ')
              return (
                <button
                  key={n.stageId}
                  class={cls}
                  style={{ left: `${n.x * S}px`, top: `${n.y * S}px` }}
                  onClick={() => (sfx.tap(), onSel(st))}
                  aria-label={`ด่าน ${st.n}${st.big ? ' บอส' : ''} ${open ? (got ? `ผ่านแล้ว ${got} ดาว` : 'เล่นได้') : 'ล็อก'}`}
                  aria-pressed={sel.id === st.id}
                >
                  <img class="px bj-node-img" src={final ? stupaSprite(look) : st.big ? bossSprite(look) : nodeSprite(look)} alt="" draggable={false} />
                  <span class="bj-node-num">{open ? <PT text={String(st.n)} size={st.big ? 14 : 13} weight={600} {...(look === 'passed' ? TONE_TEXT.paper : TONE_TEXT.gold)} /> : <Icon name="lock" size={16} />}</span>
                  {got > 0 && <Stars n={got} size={11} class="bj-node-stars" />}
                  {st.hint === 'memory' && open && (
                    <span class="bj-node-badge" title="ท่องจำ">
                      <Icon name="meditate" size={12} />
                    </span>
                  )}
                  {st.hint === 'fade' && open && (
                    <span class="bj-node-badge" title="จางหาย">
                      <Icon name="sparkle" size={12} />
                    </span>
                  )}
                  {n.stageId === here && open && !got && <span class="bj-flag">ถัดไป</span>}
                </button>
              )
            })}
            <canvas ref={avEl} class="bj-avatar" width={AV_BOX_W} height={AV_BOX_H} style={{ width: `${AV_BOX_W * S}px`, height: `${AV_BOX_H * S}px` }} aria-hidden="true" />
          </div>
        )}
      </div>
      {offView !== 0 && L && (
        <button class={`bj-goto ${offView < 0 ? 'up' : 'down'}`} onClick={() => (sfx.tap(), api.current?.scrollToStage(here))}>
          <Icon name="map" size={16} />
          <PT text="ด่านถัดไป" size={9} weight={600} {...TONE_TEXT.gold} />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Story card

function StoryCard({ ch, i, art: mapArt, onClose, onGo }: { ch: JourneyChapterId; i: number; art: JourneyArt | null; onClose: () => void; onGo: (ch: JourneyChapterId, i: number) => void }) {
  const c = JOURNEY_BY_ID[ch]
  const sc = c.scenes[i]
  const all = JOURNEY.flatMap((x) => x.scenes.map((_, k) => [x.id, k] as const))
  const at = all.findIndex(([a, k]) => a === ch && k === i)
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const art = mapArt ?? journeyArt(195)
    const L = art.layout
    const b = L.bands[JOURNEY.indexOf(c)]
    const [a0, u0, a1, u1] = sc.view ?? sc.box
    const pad = 4
    const x = L.cx + a0 - pad
    const y = b.bottom - u1 - pad
    const ww = a1 - a0 + pad * 2
    const hh = u1 - u0 + pad * 2
    el.width = ww
    el.height = hh
    const ctx = el.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(isNight() ? journeyNight(art) : art.day, x, y, ww, hh, 0, 0, ww, hh)
    // Whole-pixel zoom that fits the card.
    const availW = (el.parentElement?.clientWidth ?? 300) - 4
    const availH = Math.max(140, window.innerHeight * 0.38)
    const fit = Math.min(availW / ww, availH / hh)
    const k = Math.max(1, Math.min(4, fit >= 2 ? Math.floor(fit) : fit))
    el.style.width = `${ww * k}px`
    el.style.height = `${hh * k}px`
  }, [ch, i])
  const go = (d: number) => {
    const [a, k] = all[(at + d + all.length) % all.length]
    sfx.tap()
    onGo(a, k)
  }
  return (
    <div class="bj-story-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="bj-story bj-frame" role="dialog" aria-label={sc.title} style={{ ['--bj-frame' as string]: `url(${muralFrame()})` }}>
        <div class="bj-story-head">
          <PT text={`บทที่ ${thaiNum(c.n)} · ${c.title}`} size={10} weight={600} color="#fff1c4" shadow="#3b1a0e" />
          <span class="small bj-story-place">{c.place}</span>
        </div>
        <div class="bj-story-pic">
          <canvas ref={ref} class="pixel-canvas" />
        </div>
        <div class="bj-story-title">
          <PT text={sc.title} size={15} weight={600} {...TONE_TEXT.ink} />
        </div>
        <p class="bj-story-text">{sc.caption}</p>
        <div class="row bj-story-nav">
          <PBtn tone="wood" size="small" onClick={() => go(-1)} aria-label="เรื่องก่อนหน้า">
            ก่อนหน้า
          </PBtn>
          <span class="grow center small muted">
            {at + 1}/{all.length}
          </span>
          <PBtn tone="wood" size="small" onClick={() => go(1)} aria-label="เรื่องถัดไป">
            ถัดไป
          </PBtn>
        </div>
        <PBtn tone="gold" block icon="wai" onClick={onClose}>
          สาธุ
        </PBtn>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The screen

export function PrayerSelect() {
  const s = game.value
  const here = avatarStage({ unlocked: (id) => stageUnlocked(STAGE_BY_ID[id]), passed: (id) => stagePassed(STAGE_BY_ID[id]) })
  const [sel, setSel] = useState<PrayerStage>(() => STAGE_BY_ID[here])
  const [story, setStory] = useState<{ ch: JourneyChapterId; i: number } | null>(null)
  const [viewCh, setViewCh] = useState<JourneyChapterId>(() => chapterOfStage(here)?.id ?? 'birth')
  const api = useRef<MapApi | null>(null)
  const stars = totalStars(s)
  const close = () => openPanel(null)

  const start = (st: PrayerStage) => {
    sfx.bigBell()
    openPanel(null)
    prayStage.value = st.id
  }

  const chant = chantById(sel.chant)
  const got = s.prayer.stars[sel.id] ?? 0
  const selOpen = stageUnlocked(sel)
  const templeOpen = chapterUnlocked(sel.chapter)
  const temple = CHAPTERS.find((c) => c.id === sel.chapter)!
  const words = stageLines(sel).flatMap(lineWords).length
  const prev = prevStage(sel)
  const best = s.prayer.best[sel.id] ?? 0
  const selCh = chapterOfStage(sel.id)
  const viewChapter = JOURNEY_BY_ID[viewCh]
  const viewTemple = templeOf(viewCh)
  const vars = { ['--bj-frame' as string]: `url(${muralFrame()})`, ['--bj-lacq' as string]: `url(${lacquerTile()})`, ['--bj-parch' as string]: `url(${parchTile()})` }

  return (
    <div class="bj-screen" role="dialog" aria-label="สวดมนต์ เส้นทางพุทธประวัติ" style={vars}>
      <header class="bj-head">
        <div class="bj-head-row">
          <Icon name="pray" size={20} />
          <div class="col bj-head-title">
            <PT text="เส้นทางพุทธประวัติ" size={10} weight={600} color="#ffe58a" shadow="#3b1a0e" />
            <span class="bj-head-sub">สวดมนต์ผ่านด่าน เดินตามรอยพระพุทธเจ้า</span>
          </div>
          <span class="grow" />
          <CloseX onClick={close} />
        </div>
        <div class="bj-temples" role="tablist" aria-label="วัด">
          {CHAPTERS.map((c) => {
            const open = chapterUnlocked(c.id)
            const first = JOURNEY_STAGES.find((id) => STAGE_BY_ID[id].chapter === c.id)!
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={viewTemple === c.id}
                class={`bj-temple ${viewTemple === c.id ? 'on' : ''} ${open ? '' : 'locked'}`}
                onClick={() => (sfx.tap(), api.current?.scrollToStage(first))}
                aria-label={open ? c.name : `${c.name} ล็อก ต้องมี ${c.stars} ดาว`}
              >
                {!open && <Icon name="lock" size={12} />}
                <span>{open ? c.short : `${c.stars}★`}</span>
              </button>
            )
          })}
          <span class="bj-pill" title="ดาวทั้งหมด">
            <Icon name="star" size={14} />
            <b class="num">{stars}</b>
          </span>
          <span class="bj-pill" title="สวดมนต์วันนี้">
            <Icon name="pray" size={14} />
            <b class="num">
              {Math.min(prayersToday(s), DAILY_PRAYER_GOAL)}/{DAILY_PRAYER_GOAL}
            </b>
          </span>
          {s.prayer.streak > 1 && <span class="bj-pill streak">🔥{s.prayer.streak}</span>}
        </div>
      </header>
      <div class="bj-body">
        <JourneyMap sel={sel} onSel={setSel} onStory={(ch, i) => setStory({ ch, i })} onView={setViewCh} api={api} />
        <button class={`bj-chapter ${viewChapter.night ? 'night' : ''}`} onClick={() => (sfx.open(), setStory({ ch: viewCh, i: 0 }))} aria-label={`บทที่ ${viewChapter.n} ${viewChapter.title} อ่านเรื่อง`}>
          <span class="bj-chapter-n">{thaiNum(viewChapter.n)}</span>
          <span class="col bj-chapter-t">
            <PT text={viewChapter.title} size={9} weight={600} color="#fff1c4" shadow="#3b1a0e" />
          </span>
          <Icon name="scroll" size={16} />
        </button>
      </div>
      <section class={`bj-card bj-frame ${sel.big ? 'boss' : ''}`}>
        <div class="row bj-card-top">
          <div class="bj-thumb">
            <MeaningArt art={chant.art} scale={1} />
          </div>
          <div class="grow col bj-card-info">
            <span class="bj-card-kicker">
              {selCh && `${thaiNum(selCh.n)} ${selCh.place} · `}ด่าน {sel.n}
              {sel.big && <span class="bj-boss-tag">บอส</span>}
            </span>
            <b class="bj-card-name">{chant.name}</b>
            <span class="small muted ch-ellipsis">
              {chant.short}… · {words} คำ
            </span>
          </div>
          <Stars n={got} size={14} class="bj-card-stars" />
        </div>
        <StageChips st={sel} />
        <div class="row wrap bj-card-rewards">
          {best > 0 && <span class="small muted">สูงสุด {best}</span>}
          <span class="grow" />
          <Merit n={`+${sel.merit}`} size={15} />
          <Coin n={`+${sel.coins}`} size={15} />
          {Object.entries(sel.mats).map(([k, v]) => (
            <MatChip key={k} id={k as MaterialId} n={got ? 1 : (v ?? 0)} />
          ))}
        </div>
        <div class="row bj-card-actions">
          <PBtn tone={sel.big ? 'gold' : 'green'} block icon="pray" disabled={!selOpen} onClick={() => start(sel)}>
            {selOpen
              ? got
                ? got >= 3
                  ? 'สวดอีกครั้ง'
                  : 'เก็บดาวให้ครบ'
                : 'เริ่มสวดมนต์'
              : !templeOpen
                ? `สะสมให้ครบ ${temple.stars} ดาว (มี ${stars})`
                : `ผ่านด่าน ${prev?.n ?? 1} ก่อนนะ (${stageStarScores(prev ?? sel)[0]} คะแนน)`}
          </PBtn>
          <button class="bj-book" onClick={() => (sfx.tap(), (chantBookFocus.value = chant.parts ? chant.parts[0] : chant.id), openPanel('chants'))} aria-label="อ่านบท ฟังเสียงนำ">
            <Icon name="book" size={22} />
          </button>
        </div>
      </section>
      {story && <StoryCard ch={story.ch} i={story.i} art={api.current?.art ?? null} onClose={() => (sfx.close(), setStory(null))} onGo={(ch, i) => setStory({ ch, i })} />}
    </div>
  )
}
