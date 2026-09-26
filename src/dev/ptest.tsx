import { render } from 'preact'
import '@fontsource/mitr/thai-400.css'
import '@fontsource/noto-sans-thai/thai-500.css'
import '@fontsource/noto-sans-thai/thai-400.css'
import '@fontsource/mali/thai-500.css'
import '@fontsource/mali/thai-600.css'
import '@fontsource/itim/thai-400.css'
import '@fontsource/sarabun/thai-500.css'
import '@fontsource/sarabun/thai-600.css'
import '@fontsource/chakra-petch/thai-500.css'
import { PT, fontsReady } from '../ui/pixeltext'
const words = 'ตั้งค่า บทสวดมนต์ ดาว บ้าน ป่า ถ้ำ ภาพ ช้าง ขอพร ศีล ส้ม ปฏิบัติ ท่าน'
function App() {
  void fontsReady.value
  const rows: [string, number, 400 | 500 | 600, number][] = [
    ['Mitr', 13, 400, 84], ['Noto Sans Thai', 13, 500, 100], ['Noto Sans Thai', 14, 500, 110], ['Mali', 13, 500, 100], ['Mali', 14, 600, 120], ['Itim', 13, 400, 90], ['Itim', 14, 400, 100], ['Sarabun', 13, 600, 110], ['Sarabun', 14, 500, 100], ['Chakra Petch', 13, 500, 100], ['Chakra Petch', 14, 500, 110],
  ]
  return (
    <div style={{ background: '#f4e3bd', padding: '10px' }}>
      {rows.map(([f, s, w, t]) => (
        <div key={`${f}${s}${w}${t}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '120px', fontSize: '11px' }}>{f} {s}/{w}/{t}</span>
          <PT text={words} family={f} size={s} weight={w} threshold={t} color="#3b2616" />
        </div>
      ))}
    </div>
  )
}
render(<App />, document.getElementById('app')!)
