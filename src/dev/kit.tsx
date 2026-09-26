// Dev-only UI kit preview: open /dev-kit.html while running `npm run dev`.
import { render } from 'preact'
import { useState } from 'preact/hooks'
import '@fontsource/mali/thai-400.css'
import '@fontsource/mali/latin-400.css'
import '@fontsource/mali/thai-500.css'
import '@fontsource/mali/latin-500.css'
import '@fontsource/mali/thai-600.css'
import '@fontsource/mali/latin-600.css'
import '@fontsource/pixelify-sans/latin-500.css'
import '@fontsource/pixelify-sans/latin-600.css'
import '../styles/base.css'
import '../styles/app.css'
import '../styles/kit.css'
import { installSkins } from '../ui/skin'
import { Check, Heading, PBtn, Slider, Slot, Stars, Tabs, TitlePlate, Window } from '../ui/components/kit'
import { PT, TONE_TEXT } from '../ui/pixeltext'
import { Bar } from '../ui/components/common'

installSkins()

function Kit() {
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a')
  const [c1, setC1] = useState(true)
  const [c2, setC2] = useState(false)
  const [v, setV] = useState(70)
  const which = new URLSearchParams(location.search).get('w') ?? 'all'
  return (
    <div style={{ background: '#6fb85a', minHeight: '100vh', padding: '40px 12px', display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center' }}>
      {(which === 'all' || which === 'settings') && (
        <Window title="ตั้งค่า" onClose={() => {}} backdrop={false} footer={<><PBtn tone="red">ยกเลิก</PBtn><PBtn>บันทึก</PBtn></>}>
          <Check label="เสียงประกอบ" checked={c1} onChange={setC1} />
          <Check label="ดนตรีพื้นหลัง" checked={c2} onChange={setC2} desc="เสียงลมและระฆังเบา ๆ" />
          <Slider label="ความดัง" value={v} onChange={setV} />
        </Window>
      )}
      {(which === 'all' || which === 'levels') && (
        <Window title="บทสวดมนต์" icon="book" onClose={() => {}} backdrop={false}>
          <Tabs tabs={[{ id: 'a', label: 'ใกล้บ้าน', icon: 'temple' }, { id: 'b', label: 'ริมน้ำ' }, { id: 'c', label: 'บนดอย', badge: 2 }]} value={tab} onChange={setTab} />
          <div class="ptab-body">
            <div class="slot-grid">
              {Array.from({ length: 12 }, (_, i) => (
                <Slot key={i} locked={i > 6} active={i === 3} onClick={() => {}} badge={i < 6 ? <Stars n={(i % 3) + 1} size={12} /> : undefined}>
                  {i <= 6 && <PT text={i + 1} size={14} weight={600} {...TONE_TEXT.ink} />}
                </Slot>
              ))}
            </div>
          </div>
        </Window>
      )}
      {(which === 'all' || which === 'inv') && (
        <Window title="กระเป๋า" icon="bag" tone="gold" onClose={() => {}} backdrop={false}>
          <Heading text="วัสดุ" icon="hammer" right={<PT text="12/40" size={11} {...TONE_TEXT.ink} />} />
          <div class="slot-grid">
            {['coin', 'lotus', 'incense', 'garland', 'rice', 'banana', 'goldleaf', 'fishfood', 'dogfood', 'egg'].map((n, i) => (
              <Slot key={n} icon={n} count={i * 3 + 1} active={i === 1} onClick={() => {}} />
            ))}
          </div>
          <Heading text="พลังบุญ" />
          <Bar value={60} max={100} />
          <div style={{ height: '8px' }} />
          <Bar value={30} max={100} tone="green" />
          <div class="row" style={{ flexWrap: 'wrap', marginTop: '10px' }}>
            <PBtn>สวดมนต์</PBtn>
            <PBtn tone="gold" icon="coin">ซื้อ 120</PBtn>
            <PBtn tone="paper" size="small">ยกเลิก</PBtn>
            <PBtn tone="wood" size="small" icon="map">แผนที่</PBtn>
            <PBtn tone="blue" size="big" icon="mic">เริ่มสวด</PBtn>
            <PBtn tone="pink">ขอพร</PBtn>
            <PBtn tone="dark" size="small">ข้าม</PBtn>
          </div>
          <div class="panel" style={{ padding: '6px', marginTop: '8px' }}>
            การ์ดกระดาษธรรมดา ใช้กับรายการในหน้าต่าง อ่านง่ายด้วยฟอนต์ปกติ
          </div>
          <div class="row">
            <span class="chip gold">ชิปทอง</span>
            <span class="chip green">ชิปเขียว</span>
            <span class="chip dark">ชิปเข้ม</span>
          </div>
          <TitlePlate text="ภารกิจวันนี้" tone="gold" />
        </Window>
      )}
    </div>
  )
}

render(<Kit />, document.getElementById('app')!)
