// First-run flow: welcome → create your character → how to play.

import { useEffect, useRef, useState } from 'preact/hooks'
import { Stage } from '../../engine/stage'
import { WorldScene } from '../../scenes/world'
import { watMap } from '../../scenes/maps/wat'
import { game } from '../../game/state'
import { finishOnboarding, setLook } from '../../game/actions'
import { HAIR_COLORS, SKIN_TONES, DAY_COLORS } from '../../art/palette'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { AvatarImg, Btn, Icon } from '../components/common'
import type { View } from '../../art/avatar'
import { sfx, unlockAudio } from '../../engine/audio'

const PRESETS = [
  { id: 'white', name: 'ชุดขาวไปวัด', top: 'top_white', bottom: 'bot_skirt' },
  { id: 'white2', name: 'เสื้อขาวกางเกงกากี', top: 'top_white', bottom: 'bot_khaki' },
  { id: 'dark', name: 'เสื้อขาวกางเกงดำ', top: 'top_white', bottom: 'bot_black' },
]

const HAIRS = ['hair_bob', 'hair_short', 'hair_long']

const BIRTHDAYS = [...DAY_COLORS.map((d, i) => ({ id: i, label: `วัน${d.day}`, color: d.hex })), { id: 7, label: 'วันพุธ (กลางคืน)', color: '#5a5a6e' }]

export function TitleBackdrop() {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const st = new Stage(host.current!, { targetWidth: 170 })
    const scene = new WorldScene(watMap(), game.value.player.look, { onArrive() {} }, { spawn: { x: 112, y: 214 } })
    scene.interactive = false
    st.setScene(scene)
    st.start()
    // Gently walk the player around so the scene feels alive.
    const spots: [number, number][] = [
      [112, 214],
      [96, 262],
      [150, 250],
      [112, 190],
    ]
    let i = 0
    const id = setInterval(() => {
      i = (i + 1) % spots.length
      scene.walkTo(spots[i][0], spots[i][1])
    }, 5200)
    return () => {
      clearInterval(id)
      st.destroy()
    }
  }, [])
  return <div class="stage-host" ref={host} />
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div class={`logo ${small ? 'small' : ''}`}>
      <Icon name="lotus" size={small ? 36 : 56} />
      <div class="logo-th">บุญดี</div>
      <div class="logo-en">BOONDEE</div>
    </div>
  )
}

export function Onboarding() {
  const [step, setStep] = useState(0)
  const s = game.value
  const [name, setName] = useState(s.player.name === 'สายบุญ' ? '' : s.player.name)
  const [birth, setBirth] = useState(new Date().getDay())
  const [view, setView] = useState<View>('front')
  const look = s.player.look

  if (step === 0) {
    return (
      <div class="onboard">
        <TitleBackdrop />
        <div class="onboard-shade" />
        <div class="onboard-center">
          <Logo />
          <div class="panel tagline">ทำบุญทุกวัน ใจฟูทุกวัน</div>
        </div>
        <div class="onboard-bottom">
          <Btn
            tone="green"
            size="big"
            block
            onClick={() => {
              unlockAudio()
              sfx.chime()
              setStep(1)
            }}
          >
            เริ่มต้นสายบุญ
          </Btn>
          <div class="small center onboard-note">ตักบาตร สวดมนต์ ขอพร ไหว้เทพ ให้อาหารน้องหมาวัด ได้ทุกวันจากมือถือ</div>
        </div>
      </div>
    )
  }

  if (step === 1) {
    const preset = PRESETS.find((p) => p.top === look.top && p.bottom === look.bottom)?.id
    return (
      <div class="onboard creator">
        <div class="creator-top">
          <div class="title center">สร้างตัวละครของคุณ</div>
          <button
            class="creator-preview panel sparkle-bg"
            onClick={() => {
              sfx.tap()
              setView(view === 'front' ? 'side' : view === 'side' ? 'back' : 'front')
            }}
            aria-label="หมุนตัวละคร"
          >
            <AvatarImg look={look} view={view} scale={5} />
            <span class="small muted">แตะเพื่อหมุน</span>
          </button>
        </div>
        <div class="creator-body scroll">
          <label class="field">
            <span class="subtitle">ชื่อเล่น</span>
            <input
              id="player-name"
              class="text-input"
              maxLength={16}
              placeholder="เช่น น้องบุญ"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
            />
          </label>
          <div class="field">
            <span class="subtitle">สีผิว</span>
            <div class="row wrap">
              {SKIN_TONES.map((t, i) => (
                <button key={t.id} class={`swatch-btn ${look.skin === i ? 'on' : ''}`} style={{ background: t.b }} onClick={() => (sfx.tap(), setLook({ skin: i }))} aria-label={t.name} />
              ))}
            </div>
          </div>
          <div class="field">
            <span class="subtitle">ทรงผม</span>
            <div class="row wrap">
              {HAIRS.map((h) => (
                <button key={h} class={`tab ${look.hair === h ? 'active' : ''}`} onClick={() => (sfx.tap(), setLook({ hair: h }))}>
                  {OUTFIT_BY_ID[h].name}
                </button>
              ))}
            </div>
          </div>
          <div class="field">
            <span class="subtitle">สีผม</span>
            <div class="row wrap">
              {HAIR_COLORS.slice(0, 5).map((c, i) => (
                <button key={c.id} class={`swatch-btn ${look.hairColor === i ? 'on' : ''}`} style={{ background: c.b }} onClick={() => (sfx.tap(), setLook({ hairColor: i }))} aria-label={c.name} />
              ))}
            </div>
          </div>
          <div class="field">
            <span class="subtitle">ชุดไปวัด</span>
            <div class="row wrap">
              {PRESETS.map((p) => (
                <button key={p.id} class={`tab ${preset === p.id ? 'active' : ''}`} onClick={() => (sfx.tap(), setLook({ top: p.top, bottom: p.bottom }))}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div class="field">
            <span class="subtitle">วันเกิด</span>
            <span class="small muted">ใช้ไหว้พระประจำวันเกิดและดูสีมงคลของคุณ</span>
            <div class="row wrap">
              {BIRTHDAYS.map((b) => (
                <button key={b.id} class={`tab ${birth === b.id ? 'active' : ''}`} onClick={() => (sfx.tap(), setBirth(b.id))}>
                  <span class="swatch" style={{ background: b.color, marginRight: '4px' }} />
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div class="creator-foot">
          <Btn tone="green" size="big" block onClick={() => setStep(2)}>
            ต่อไป
          </Btn>
        </div>
      </div>
    )
  }

  return (
    <div class="onboard">
      <TitleBackdrop />
      <div class="onboard-shade" />
      <div class="onboard-center">
        <div class="panel howto">
          <div class="title center">วิธีทำบุญที่บุญดี</div>
          <div class="howto-row">
            <Icon name="paw" size={32} />
            <div>
              <b>แตะพื้นเพื่อเดิน</b>
              <div class="small muted">เดินเล่นในวัด ลากนิ้วเพื่อมองรอบ ๆ</div>
            </div>
          </div>
          <div class="howto-row">
            <Icon name="bowl" size={32} />
            <div>
              <b>แตะสิ่งที่มีป้ายลอยอยู่</b>
              <div class="small muted">ตักบาตร สวดมนต์ ตีระฆัง ให้อาหารปลาและน้องหมา</div>
            </div>
          </div>
          <div class="howto-row">
            <Icon name="merit" size={32} />
            <div>
              <b>สะสมบุญเพื่อเลเวลอัป</b>
              <div class="small muted">ปลดล็อกวัดใหม่ ชุดน่ารัก และบทสวดใหม่</div>
            </div>
          </div>
          <div class="howto-row">
            <Icon name="coin" size={32} />
            <div>
              <b>บุญคอยน์</b>
              <div class="small muted">ใช้ซื้อของใส่บาตร ของถวาย และชุดใหม่ รับฟรีทุกวันจากภารกิจ</div>
            </div>
          </div>
          <Btn
            tone="green"
            size="big"
            block
            onClick={() => {
              sfx.levelUp()
              finishOnboarding(name, birth)
            }}
          >
            เข้าวัดกันเลย
          </Btn>
        </div>
      </div>
    </div>
  )
}
