// จุดถ่ายรูป: the beach photo spot. The photographer's brief card first,
// then a viewfinder over this beach's view (the sky of the real time of
// day, the landmark, waves and gulls) with the player striking a pose;
// press the shutter for a polaroid. A new shot for this beach and time of
// day (day / sunset / night) pays coins and fills the sea album.

import { useRef, useState } from 'preact/hooks'
import type { Surface } from '../../engine/pixel'
import type { Scene } from '../../engine/stage'
import { game } from '../../game/state'
import { BEACH_IDS, BEACH_META, beachOf, type BeachId } from '../../game/data/beaches'
import { PLACE_BY_ID } from '../../game/data/places'
import { PHOTO_TIME_NAME, photoKey, photoTime, takePhoto, type PhotoTime } from '../../game/beach'
import { closeActivity, mapId } from '../../ui/store'
import { useStage } from '../kit'
import { PBtn } from '../../ui/components/kit'
import { Coin, Icon } from '../../ui/components/common'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { sfx, haptic } from '../../engine/audio'
import { currentPhase, drawSky, applyTint } from '../../scenes/sky'
import { dollSprite, DOLL_H, DOLL_W, type DollPose } from '../../art/doll'
import { BP } from '../../art/poses/beach'
import { bigBuddhaSamui, goldenMermaid, huaHinPavilion, samMukShrine, standingBuddha } from '../../art/places/beach-landmarks'
import { isle, SEA, SAND, umbrella, palmCrown, palmTrunk } from '../../art/places/beach-kit'
import { BriefCard } from './brief'
import { drawSurf, shadow } from './base'

const POSES: { id: DollPose; name: string }[] = [
  { id: 'wai', name: 'ไหว้สวย' },
  { id: BP.peace, name: 'ชูสองนิ้ว' },
  { id: BP.heart, name: 'มินิฮาร์ต' },
  { id: BP.jump, name: 'กระโดด!' },
  { id: BP.point, name: 'ชี้วิว' },
]

class PhotoScene implements Scene {
  w = 190
  h = 300
  t = 0
  pose: DollPose = BP.peace
  flash = 0
  constructor(private beach: BeachId) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
  }
  update(dt: number) {
    this.t += dt
    this.flash = Math.max(0, this.flash - dt)
  }
  render(g: Surface) {
    const phase = currentPhase()
    const night = phase === 'dusk' || phase === 'night'
    const W = this.w
    const H = this.h
    const horizon = Math.round(H * 0.42)
    const shore = Math.round(H * 0.7)
    drawSky(g, 0, 0, W, horizon, phase, this.t)
    const sea = night ? SEA.night : SEA[BEACH_META[this.beach].sea]
    g.gradientV(0, horizon, W, shore - horizon, [sea.deep, sea.mid, sea.shallow], 5)
    for (let i = 0; i < 30; i++) g.hline((i * 41) % W, ((i * 41) % W) + 2, horizon + 3 + ((i * 23) % (shore - horizon - 6)), sea.glint)
    const sand = night ? SAND.night : SAND.white
    g.rect(0, shore, W, H - shore, sand.base)
    g.rect(0, shore, W, 10, sand.wet)
    drawSurf(g, W, shore, this.t, sea, 5)
    this.landmark(g, horizon, shore, night)
    // Gulls.
    for (let i = 0; i < 3; i++) {
      const x = ((this.t * (8 + i * 3) + i * 60) % (W + 20)) - 10
      const y = 20 + i * 14 + Math.sin(this.t * 2 + i) * 3
      const f = Math.floor(this.t * 5 + i) % 2
      g.line(x - 4, y - (f ? 2 : -1), x, y, '#fffaf0')
      g.line(x + 4, y - (f ? 2 : -1), x, y, '#fffaf0')
    }
    // The player posing.
    const jump = this.pose === BP.jump ? Math.round(Math.abs(Math.sin(this.t * 4)) * 6) : 0
    const sp = dollSprite(game.value.player.look, this.pose, { view: 'front' })
    const fx = Math.round(W / 2)
    const fy = H - 18
    shadow(g, fx, fy + 1, 10 - jump / 2, 2.6)
    g.draw(sp.canvas, fx - Math.round(DOLL_W / 2), fy - DOLL_H + 1 - jump)
    applyTint(g, phase)
    // Viewfinder corners and focus dot.
    const c = '#fffaf0'
    for (const [x, y, dx, dy] of [[6, 6, 1, 1], [W - 7, 6, -1, 1], [6, H - 7, 1, -1], [W - 7, H - 7, -1, -1]] as [number, number, number, number][]) {
      g.hline(x, x + dx * 10, y, c)
      g.vline(x, y, y + dy * 10, c)
    }
    if (Math.floor(this.t * 2) % 2) g.px(W - 16, 12, '#e8514a')
    if (this.flash > 0) {
      g.alpha(Math.min(1, this.flash * 3))
      g.rect(0, 0, W, H, '#ffffff')
      g.alpha(1)
    }
  }
  private landmark(g: Surface, horizon: number, shore: number, night: boolean) {
    const W = this.w
    const draw = (p: { canvas: HTMLCanvasElement; ax: number; ay: number }, x: number, y: number) => g.draw(p.canvas, Math.round(x - p.ax), Math.round(y - p.ay))
    switch (this.beach) {
      case 'beach_samui':
        g.ellipse(W - 40, horizon + 20, 50, 12, night ? '#4a4a5a' : '#f0e0bc')
        draw(bigBuddhaSamui(), W - 40, horizon + 26)
        break
      case 'beach_samila':
        draw(goldenMermaid(), W - 36, shore + 8)
        isle(g, 50, horizon + 2, 18, 6, night)
        break
      case 'beach_railay':
        isle(g, 40, horizon + 2, 18, 40, night, { karst: true })
        isle(g, W - 40, horizon + 2, 22, 50, night, { karst: true })
        isle(g, W / 2 + 10, horizon + 2, 8, 22, night, { karst: true })
        break
      case 'beach_bangsaen':
        g.poly([[0, horizon - 30], [40, horizon - 20], [70, horizon + 10], [60, shore], [0, shore]], night ? '#1e3a34' : '#356e48')
        draw(samMukShrine(night), 34, shore + 4)
        break
      case 'beach_huahin':
        g.ellipse(W - 30, horizon, 44, 30, night ? '#1e3a34' : '#3f7a4f')
        draw(standingBuddha(), W - 32, horizon - 8)
        draw(huaHinPavilion(night), 30, shore + 40)
        break
      case 'beach_patong': {
        const cx = W / 2 + 40 + Math.sin(this.t * 0.5) * 20
        const cy = horizon - 40
        const cols = ['#e8514a', '#ffd23f', '#6cc36a', '#5aa9e8', '#b37cf0']
        for (let i = 0; i < 5; i++) {
          const a0 = Math.PI + (i / 5) * Math.PI
          const a1 = Math.PI + ((i + 1) / 5) * Math.PI
          g.poly([[cx, cy + 6], [cx + Math.cos(a0) * 16, cy + 6 + Math.sin(a0) * 9], [cx + Math.cos(a1) * 16, cy + 6 + Math.sin(a1) * 9]], cols[i])
        }
        g.line(cx, cy + 6, cx - 30, horizon + 20, '#fffaf0')
        draw(umbrella('#e8514a', '#fffaf0'), 30, shore + 30)
        break
      }
    }
    // A palm framing the shot.
    const tr = palmTrunk(1)
    g.draw(tr.canvas, -6, shore + 36 - tr.ay)
    const cr = palmCrown(1, 2 + Math.round(Math.sin(this.t) * 1))
    const cx = -6 + tr.ax + tr.hooks.crown[0].x
    const cy = shore + 36 + tr.hooks.crown[0].y
    g.draw(cr.canvas, Math.round(cx - cr.w / 2), Math.round(cy - 17))
  }
}

function Album({ current }: { current: string }) {
  const have = game.value.beach.photos
  const times: PhotoTime[] = ['day', 'sunset', 'night']
  return (
    <div class="bchx-album">
      {BEACH_IDS.flatMap((b) =>
        times.map((t) => {
          const key = `${b}:${t}`
          const on = have.includes(key)
          return (
            <div key={key} class={`bchx-slot small ${on ? 'on' : ''}`} style={key === current ? { boxShadow: 'inset 0 0 0 2px #e8514a' } : undefined}>
              {on ? `${BEACH_META[b].short} ${PHOTO_TIME_NAME[t]}` : '?'}
            </div>
          )
        }),
      )}
    </div>
  )
}

export function PhotoSpot() {
  const beach = beachOf(mapId.value) ?? 'beach_samila'
  const [brief, setBrief] = useState(true)
  const [pose, setPose] = useState<DollPose>(BP.peace)
  const [shot, setShot] = useState<{ url: string; fresh: boolean; coins: number; key: string } | null>(null)
  const { host, scene, stage } = useStage(() => new PhotoScene(beach), { targetWidth: 190 })
  const busy = useRef(false)
  const phase = currentPhase()
  const key = photoKey(beach, phase)
  const pick = (p: DollPose) => {
    setPose(p)
    if (scene.current) scene.current.pose = p
    sfx.tap()
  }
  const snap = () => {
    if (busy.current) return
    busy.current = true
    const sc = scene.current
    if (sc) sc.flash = 0.35
    sfx.click()
    haptic(20)
    setTimeout(() => {
      const url = stage.current?.el.toDataURL('image/png') ?? ''
      const r = takePhoto(beach, phase)
      if (r.fresh) sfx.purchase()
      else sfx.chime()
      setShot({ url, ...r })
      busy.current = false
    }, 160)
  }
  const place = PLACE_BY_ID[beach]
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <div class="act-top">
        <button class="btn paper small icon-btn" onClick={() => (sfx.close(), closeActivity())} aria-label="กลับ">
          <PT text="‹" size={16} weight={600} {...TONE_TEXT.paper} />
        </button>
        <div class="title-plate wood act-title">
          <PT text="จุดถ่ายรูปริมทะเล" size={12} weight={600} {...TONE_TEXT.wood} />
        </div>
      </div>
      {!brief && !shot && (
        <div class="act-bottom">
          <div class="panel act-tip col" style={{ gap: '8px', padding: '8px 10px' }}>
            <div class="small center">
              {place?.name} · {PHOTO_TIME_NAME[photoTime(phase)]} {game.value.beach.photos.includes(key) ? '(มีในอัลบั้มแล้ว)' : '(ภาพใหม่! ได้คอยน์)'}
            </div>
            <div class="bchx-poses">
              {POSES.map((p) => (
                <PBtn key={p.id} size="small" tone={pose === p.id ? 'gold' : 'paper'} onClick={() => pick(p.id)}>
                  {p.name}
                </PBtn>
              ))}
            </div>
            <div class="row" style={{ justifyContent: 'center' }}>
              <button class="bchx-shutter" aria-label="ถ่ายรูป" onClick={snap} />
            </div>
          </div>
        </div>
      )}
      {shot && (
        <div class="modal-backdrop celebrate">
          <div class="panel modal center col" style={{ gap: '8px', alignItems: 'center' }}>
            <div class="bchx-polaroid">
              <img src={shot.url} alt="ภาพถ่ายริมทะเล" width={200} height={Math.round((200 * (stage.current?.el.height ?? 400)) / (stage.current?.el.width ?? 200))} style={{ maxHeight: '44vh', objectFit: 'cover' }} />
              <PT text={`${place?.name ?? ''} · ${PHOTO_TIME_NAME[photoTime(phase)]}`} size={12} weight={600} {...TONE_TEXT.ink} />
            </div>
            {shot.fresh ? (
              <span class="chip gold">
                ภาพใหม่เข้าอัลบั้ม! <Coin n={`+${shot.coins}`} size={16} />
              </span>
            ) : (
              <span class="chip small">ภาพนี้มีในอัลบั้มแล้ว ลองมาใหม่ตอน{photoTime(phase) === 'sunset' ? 'กลางคืน' : 'พระอาทิตย์ตก'}นะ</span>
            )}
            <div class="small muted">
              <Icon name="camera" size={14} /> อัลบั้มทะเล {game.value.beach.photos.length}/{BEACH_IDS.length * 3}
            </div>
            <Album current={shot.key} />
            <div class="col" style={{ width: '100%' }}>
              <PBtn tone="paper" block onClick={() => setShot(null)}>
                ถ่ายอีกรูป
              </PBtn>
              <PBtn tone="green" block onClick={closeActivity}>
                เก็บภาพแล้วกลับไปเที่ยวต่อ
              </PBtn>
            </div>
          </div>
        </div>
      )}
      {brief && <BriefCard id="photo" onPlay={() => setBrief(false)} onBack={closeActivity} />}
    </div>
  )
}
