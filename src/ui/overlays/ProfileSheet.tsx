// สมุดบุญ – profile, merit calendar, stats, wishes and lucky numbers.

import { game, level } from '../../game/state'
import { titleFor, meritForLevel } from '../../game/economy'
import { dayKey, WEEKDAY_TH } from '../../game/time'
import { FORTUNES, toThaiDigits } from '../../game/data/fortunes'
import { ACHIEVEMENTS } from '../../game/data/quests'
import { DAY_COLORS } from '../../art/palette'
import { AvatarImg, Bar, Icon, Merit, Sheet } from '../components/common'
import { profileOpen } from '../store'

const STAT_LABELS: [string, string, string][] = [
  ['alms', 'ตักบาตร', 'bowl'],
  ['chant', 'สวดมนต์', 'book'],
  ['meditate_sec', 'นั่งสมาธิ (นาที)', 'meditate'],
  ['wish', 'ขอพร', 'incense'],
  ['deity', 'ไหว้เทพ', 'deity'],
  ['koi_fed', 'ให้อาหารปลา', 'koi'],
  ['dog_fed', 'ให้อาหารน้องหมา', 'dog'],
  ['bell', 'ตีระฆัง', 'bell'],
  ['gold_leaf', 'ปิดทอง', 'goldleaf'],
  ['holy_water', 'ตักน้ำมนต์', 'vessel'],
  ['charity', 'บริจาคกองบุญ (คอยน์)', 'charity'],
  ['dedicate', 'กรวดน้ำ', 'vessel'],
]

export function ProfileSheet() {
  const s = game.value
  const lv = level.value
  const close = () => (profileOpen.value = false)
  // Merit calendar for the last 5 weeks.
  const days: { key: string; v: number; d: Date }[] = []
  const today = new Date()
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const k = dayKey(d)
    days.push({ key: k, v: s.days[k] ?? 0, d })
  }
  const max = Math.max(1, ...days.map((d) => d.v))
  const birth = s.player.birthDay
  const birthLabel = birth === 7 ? 'วันพุธ (กลางคืน)' : `วัน${WEEKDAY_TH[birth]}`
  const birthColor = birth === 7 ? '#5a5a6e' : DAY_COLORS[birth].hex
  return (
    <Sheet title="สมุดบุญ" onClose={close}>
      <div class="panel profile-card sparkle-bg">
        <AvatarImg look={s.player.look} scale={3} />
        <div class="grow col" style={{ gap: '3px' }}>
          <div class="title">{s.player.name}</div>
          <div class="small">
            Lv.{lv.level} · {titleFor(lv.level)}
          </div>
          <Bar value={lv.into} max={lv.need} />
          <div class="small muted">
            บุญสะสมทั้งหมด <Merit n={s.merit} size={14} /> · อีก {Math.max(0, meritForLevel(lv.level + 1) - s.merit)} บุญถึง Lv.{lv.level + 1}
          </div>
          <div class="small">
            <span class="swatch" style={{ background: birthColor }} /> เกิด{birthLabel} · เข้าวัดติดกัน {s.login.streak} วัน
          </div>
        </div>
      </div>

      <div class="section-title">
        <Icon name="calendar" size={20} /> ปฏิทินบุญ 5 สัปดาห์
      </div>
      <div class="panel merit-cal">
        {days.map((d) => {
          const lvl = d.v === 0 ? 0 : d.v < max * 0.34 ? 1 : d.v < max * 0.67 ? 2 : 3
          return <span key={d.key} class={`cal-day l${lvl} ${d.key === dayKey() ? 'today' : ''}`} title={`${d.d.toLocaleDateString('th-TH')} · ${d.v} บุญ`} />
        })}
      </div>
      <div class="small muted" style={{ margin: '2px 6px' }}>
        ดอกบัวเข้มขึ้นเมื่อทำบุญมากขึ้นในวันนั้น
      </div>

      <div class="section-title">
        <Icon name="scroll" size={20} /> สถิติการทำบุญ
      </div>
      <div class="grid2">
        {STAT_LABELS.map(([k, label, icon]) => {
          const v = (s.stats as Record<string, number>)[k] ?? 0
          return (
            <div class="panel stat" key={k}>
              <Icon name={icon} size={24} />
              <div class="grow small">{label}</div>
              <b class="num">{k === 'meditate_sec' ? Math.floor(v / 60) : v}</b>
            </div>
          )
        })}
      </div>

      <div class="section-title">
        <Icon name="star" size={20} /> เหรียญตรา {Object.keys(s.achievements).length}/{ACHIEVEMENTS.length}
      </div>
      <div class="row wrap">
        {ACHIEVEMENTS.filter((a) => s.achievements[a.id]).map((a) => (
          <span class="chip gold" key={a.id}>
            <Icon name={a.icon} size={14} /> {a.name}
          </span>
        ))}
        {Object.keys(s.achievements).length === 0 && <span class="small muted">ยังไม่มีเหรียญตรา ลองตักบาตรครั้งแรกดูนะ</span>}
      </div>

      <div class="section-title">
        <Icon name="number" size={20} /> สมุดเลขมงคล
      </div>
      <div class="panel col" style={{ padding: '8px 10px' }}>
        {s.lotteryLog.length === 0 && <div class="small muted">ยังไม่ได้ขูดเลข ลองไปที่ต้นตะเคียนทองในวัด</div>}
        {s.lotteryLog.slice(0, 8).map((l, i) => (
          <div class="row small" key={i}>
            <span class="muted">{new Date(l.day).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
            <span class="grow" />
            <b class="num">{l.nums.join(' · ')}</b>
          </div>
        ))}
        <div class="small muted">เพื่อความบันเทิงเท่านั้น</div>
      </div>

      <div class="section-title">
        <Icon name="incense" size={20} /> คำอธิษฐานและเซียมซี
      </div>
      <div class="panel col" style={{ padding: '8px 10px' }}>
        {s.wishes.length === 0 && s.fortunes.length === 0 && <div class="small muted">ยังไม่มีบันทึก</div>}
        {s.wishes.slice(0, 5).map((w, i) => (
          <div class="small" key={`w${i}`}>
            <Icon name="incense" size={12} /> {w.cat}
            {w.text ? `: "${w.text}"` : ''} <span class="muted">· {w.day}</span>
          </div>
        ))}
        {s.fortunes.slice(0, 5).map((f, i) => {
          const fo = FORTUNES.find((x) => x.n === f.n)
          return (
            <div class="small" key={`f${i}`}>
              <Icon name="fortune" size={12} /> เซียมซีใบที่ {toThaiDigits(f.n)} ({fo?.level}) <span class="muted">· {f.day}</span>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
