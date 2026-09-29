// Dev page for the temple volunteer jobs: open /dev-jobs.html while running vite.
// URL params: job=<id> opens a job, seen=1 skips the how-to cards,
// art=1 shows an art sheet (z=<zoom>), coins=<n>.
import { render } from 'preact'
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
import '../styles/v2.css'
import { installSkins } from '../ui/skin'
import { activity, openActivity } from '../ui/store'
import { game, defaultState, loadState } from '../game/state'
import { ensureDaily } from '../game/actions'
import { JOBS } from '../game/data/jobs'
import { jobPlaysToday } from '../game/jobs'
import { JobActivity } from '../activities/jobs'
import { PBtn, Window } from '../ui/components/kit'
import { Icon } from '../ui/components/common'
import { Surface } from '../engine/pixel'
import * as ART from '../art/jobs'

installSkins()
const q = new URLSearchParams(location.search)
const loaded = loadState()
game.value = { ...(loaded.onboarded ? loaded : defaultState()), onboarded: true }
if (q.get('coins')) game.value = { ...game.value, coins: Number(q.get('coins')) }
if (q.get('seen') === '1') game.value = { ...game.value, seen: { ...game.value.seen, tips: [...game.value.seen.tips, ...JOBS.map((j) => `goal:job:${j.id}`)] } }
ensureDaily()
if (q.get('job')) openActivity('job', { job: q.get('job')! })

function Menu() {
  return (
    <div style={{ padding: '24px 8px', display: 'flex', justifyContent: 'center' }}>
      <Window title="งานอาสาในวัด" icon="broom" backdrop={false}>
        <div class="col" style={{ gap: '6px' }}>
          {JOBS.map((j) => (
            <PBtn key={j.id} tone="paper" block onClick={() => openActivity('job', { job: j.id })}>
              <Icon name={j.icon} size={20} /> {`${j.name} (${jobPlaysToday(j.id)}/${j.daily})`}
            </PBtn>
          ))}
        </div>
      </Window>
    </div>
  )
}

function Dev() {
  const a = activity.value
  return (
    <div class="app">
      <div class="phone" style={{ background: '#2b2340' }}>{a?.id === 'job' ? <JobActivity req={a} /> : <Menu />}</div>
    </div>
  )
}

/** Art sheet: every job sprite zoomed for inspection. */
function drawArtSheet(host: HTMLElement, z: number, sheet: string) {
  const W = 200
  const H = 150
  const g = new Surface(W, H)
  g.clear('#b8a8b0')
  const add = (name: string, fn: (g: Surface) => void) => {
    if (sheet !== 'all' && sheet !== name) return
    fn(g)
  }
  add('sweep', (g) => {
    for (let k = 0; k < 4; k++) for (let r = 0; r < 8; r++) g.draw(ART.leafSprite(k, r).canvas, 4 + r * 12, 4 + k * 12)
    ART.drawBroom(g, 120, 40, 0.4, 0)
    ART.drawBroom(g, 150, 40, -0.3, 1)
    ART.drawBasket(g, 30, 80, 0.2, 0, 0)
    ART.drawBasket(g, 64, 80, 1, 0, 0)
    ART.drawDustpan(g, 100, 72, 0.8)
  })
  add('shoes', (g) => {
    ART.SHOE_STYLES.forEach((st, i) => {
      g.draw(ART.shoeSprite(st).canvas, 4 + i * 20, 4)
      g.draw(ART.shoeSprite(st, true).canvas, 4 + i * 20, 18)
      g.draw(ART.shoeSprite(st, false, true).canvas, 4 + i * 20, 32)
      ART.drawShoePair(g, st, 12 + i * 20, 62)
    })
    ART.drawShoeRack(g, 10, 70, 4, 24, 16)
  })
  add('brass', (g) => {
    ART.BRASS_KINDS.forEach((k, i) => {
      const b = ART.brassSculpts(k, 1)
      g.draw(b.dull, 2 + i * 64 - b.ox + 30, 70 - b.oy)
      g.draw(b.bright, 2 + i * 64 - b.ox + 30, 140 - b.oy)
    })
  })
  const c = g.canvas
  c.style.width = `${W * z}px`
  c.style.height = `${H * z}px`
  c.style.imageRendering = 'pixelated'
  host.appendChild(c)
}

if (q.get('art') === '1') {
  const host = document.getElementById('app')!
  host.style.overflow = 'auto'
  host.style.background = '#6a5a70'
  drawArtSheet(host, Number(q.get('z') ?? 4), q.get('sheet') ?? 'all')
} else render(<Dev />, document.getElementById('app')!)
