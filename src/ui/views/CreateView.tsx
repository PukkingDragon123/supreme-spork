// Character creation: dress up in your room, then name + birth day.

import { useState } from 'preact/hooks'
import { DressUp } from '../DressUp'
import { Window, PBtn } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { game } from '../../game/state'
import { finishOnboarding } from '../../game/actions'
import { DAY_COLORS } from '../../art/palette'
import { goTemple } from '../store'
import { sfx } from '../../engine/audio'
import { ProvinceField, ProvincePicker } from '../homeland/ProvincePicker'

export function CreateView() {
  const [naming, setNaming] = useState(false)
  const [picking, setPicking] = useState(false)
  const s = game.value
  const [name, setName] = useState(s.player.name === 'สายบุญ' ? '' : s.player.name)
  const [day, setDay] = useState(s.player.birthDay)
  const done = () => {
    finishOnboarding(name || 'สายบุญ', day)
    sfx.levelUp()
    goTemple('wat', null)
  }
  return (
    <div class="create">
      <div class="create-head">
        <PT text="แต่งตัวไปวัดกัน!" size={15} weight={600} color="#fff6dc" shadow="#3b2616" />
        <span class="small create-sub">เลือกรูปร่าง ส่วนสูง หน้าตา ทรงผม และชุดที่ชอบ แตะตัวละครเพื่อหมุนดูด้านหลัง</span>
      </div>
      <DressUp creating onDone={() => (sfx.open(), setNaming(true))} />
      {picking && <ProvincePicker onClose={() => setPicking(false)} />}
      {naming && !picking && (
        <Window title="ตั้งชื่อตัวละคร" icon="user" onClose={() => setNaming(false)} footer={<PBtn tone="green" block size="big" icon="temple" onClick={done}>ออกเดินทางไปวัด</PBtn>}>
          <label class="field">
            <PT text="ชื่อเล่น" size={12} {...TONE_TEXT.ink} />
            <input class="pinput" value={name} maxLength={16} placeholder="สายบุญ" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </label>
          <div class="field">
            <PT text="เกิดวันอะไร (ใช้ดูสีมงคล)" size={12} {...TONE_TEXT.ink} />
            <div class="day-picks">
              {DAY_COLORS.map((c, i) => (
                <button key={c.day} class={`day-pick ${day === i ? 'on' : ''}`} style={{ ['--c' as string]: c.hex }} onClick={() => (sfx.tap(), setDay(i))} aria-pressed={day === i}>
                  <span class="swatch" style={{ background: c.hex }} />
                  <span class="small">{c.day}</span>
                </button>
              ))}
            </div>
          </div>
          <p class="small muted">ใส่เสื้อสีประจำวันไปวัด รับบุญเพิ่ม 10% ทุกวันนะ</p>
          <ProvinceField onOpen={() => setPicking(true)} />
        </Window>
      )}
    </div>
  )
}
