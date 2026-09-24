// ตั้งค่า – sound, time of day, profile and reset.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { resetGame, updateSettings, finishOnboarding } from '../../game/actions'
import type { Settings } from '../../game/state'
import { Btn, Sheet } from '../components/common'
import { settingsOpen } from '../store'
import { toast } from '../../game/events'
import { payments } from '../../services/payments'
import { ads } from '../../services/ads'

const TIMES: { id: Settings['time']; label: string }[] = [
  { id: 'real', label: 'ตามเวลาจริง' },
  { id: 'dawn', label: 'เช้าตรู่' },
  { id: 'day', label: 'กลางวัน' },
  { id: 'golden', label: 'ยามเย็น' },
  { id: 'night', label: 'กลางคืน' },
]

function Toggle({ on, onChange, label, id }: { on: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <label class="toggle-row" for={id}>
      <span class="grow">{label}</span>
      <input id={id} type="checkbox" checked={on} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
      <span class={`toggle ${on ? 'on' : ''}`} aria-hidden="true" />
    </label>
  )
}

export function SettingsSheet() {
  const s = game.value
  const [confirm, setConfirm] = useState(false)
  const [name, setName] = useState(s.player.name)
  const close = () => (settingsOpen.value = false)
  return (
    <Sheet title="ตั้งค่า" onClose={close}>
      <div class="col">
        <div class="panel col settings-group">
          <Toggle id="set-sound" label="เสียงประกอบ" on={s.settings.sound} onChange={(v) => updateSettings({ sound: v })} />
          <Toggle id="set-music" label="เสียงบรรยากาศวัด" on={s.settings.music} onChange={(v) => updateSettings({ music: v })} />
          <Toggle id="set-motion" label="ลดการเคลื่อนไหว" on={s.settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} />
          <Toggle id="set-haptics" label="สั่นเมื่อแตะ" on={s.settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />
        </div>
        <div class="panel col settings-group">
          <div class="subtitle">ช่วงเวลาในวัด</div>
          <div class="small muted">ท้องฟ้าและแสงไฟในวัดเปลี่ยนตามเวลาจริงของคุณ</div>
          <div class="row wrap">
            {TIMES.map((t) => (
              <button key={t.id} class={`tab ${s.settings.time === t.id ? 'active' : ''}`} onClick={() => updateSettings({ time: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div class="panel col settings-group">
          <div class="subtitle">ชื่อเล่น</div>
          <div class="row">
            <input id="set-name" class="text-input grow" maxLength={16} value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
            <Btn
              size="small"
              onClick={() => {
                finishOnboarding(name, s.player.birthDay)
                toast('บันทึกชื่อแล้ว', 'check')
              }}
            >
              บันทึก
            </Btn>
          </div>
          <div class="small muted">รหัสเพื่อน {s.player.friendCode}</div>
        </div>
        <div class="panel col settings-group small">
          <div class="subtitle">เกี่ยวกับบุญดี</div>
          <div class="muted">
            เวอร์ชันทดลอง 0.1 · ระบบชำระเงิน: {payments().sandbox ? 'จำลอง (ไม่ตัดเงินจริง)' : payments().name} · โฆษณา: {ads().name === 'demo' ? 'ตัวอย่าง' : ads().name}
          </div>
          <div class="muted">ข้อมูลการเล่นเก็บไว้ในเครื่องของคุณ คำอธิษฐานไม่ถูกส่งไปที่ใด</div>
          <div class="muted">บทสวดอ้างอิงจากหนังสือสวดมนต์ทั่วไป หากพบข้อผิดพลาดแจ้งทีมงานได้เลย</div>
        </div>
        {confirm ? (
          <div class="panel col settings-group warn-box">
            <div class="subtitle">เริ่มต้นใหม่ทั้งหมด?</div>
            <div class="small">บุญ เหรียญ ชุด และความสนิทกับน้องหมาจะหายทั้งหมด</div>
            <div class="row">
              <Btn tone="paper" class="grow" onClick={() => setConfirm(false)}>
                ไม่ใช่ตอนนี้
              </Btn>
              <Btn
                class="grow"
                tone="pink"
                onClick={() => {
                  resetGame()
                  close()
                }}
              >
                เริ่มใหม่
              </Btn>
            </div>
          </div>
        ) : (
          <Btn tone="paper" block onClick={() => setConfirm(true)}>
            เริ่มเกมใหม่
          </Btn>
        )}
      </div>
    </Sheet>
  )
}
