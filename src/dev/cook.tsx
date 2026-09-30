// Dev-only cooking preview: open /dev-cook.html while running `npm run dev`.
//   ?v=gallery   icons, plated dishes, bottles, tools and kitchen pieces
//   ?v=cook      the real CookActivity (level 14 with a bag of ingredients)
//                &lv=5 shows the locked card · &recipe=kaprao jumps straight in
//                &empty=1 starts with an empty bag (shows the 7-บุญ hint)
//   ?v=mart      overview of the whole 7-บุญ interior map (&s=3 scale)
import { render } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
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
import { bake, Surface } from '../engine/pixel'
import { spriteDataUrl } from '../engine/sprite'
import {
  bakeKitchen,
  bottleSprite,
  dishSprite,
  drawBananaLeaf,
  drawBits,
  drawBoard,
  drawChopItem,
  drawFlames,
  drawKrokPan,
  drawMixBowl,
  drawPan,
  drawPlate,
  drawPot,
  drawServeBowl,
  drawStove,
  drawWok,
  eggSprite,
  FOOD_ICON_IDS,
  foodIcon,
  toolSprite,
  type Tool,
} from '../art/cooking'
import { furnitureSprite, furnitureThumb } from '../art/furniture'
import { ITEM_BY_ID } from '../game/data/items'
import { RECIPES, type Bit, type Condiment } from '../game/data/recipes'
import { game, defaultState } from '../game/state'
import { meritForLevel } from '../game/economy'
import { ensureDaily } from '../game/actions'
import { activity } from '../ui/store'
import { Overlays } from '../ui/overlays/Overlays'
import { CookActivity } from '../activities/cook'
import { martMap } from '../scenes/maps/mart'
import { WorldScene } from '../scenes/world'

installSkins()

const q = new URLSearchParams(location.search)
const view = q.get('v') ?? 'gallery'

function Img({ url, w, title }: { url: string; w?: number; title?: string }) {
  return <img src={url} title={title} style={{ imageRendering: 'pixelated', width: w ? `${w}px` : undefined }} />
}

function CanvasOf({ w, h, scale, draw }: { w: number; h: number; scale: number; draw: (g: Surface) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const src = bake(w, h, draw)
    c.width = w * scale
    c.height = h * scale
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(src, 0, 0, w * scale, h * scale)
  }, [])
  return <canvas ref={ref} style={{ display: 'block', maxWidth: '100%' }} />
}

function Gallery() {
  const cell = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontSize: '10px', width: '76px', textAlign: 'center' } as const
  return (
    <div style={{ background: '#fbeed6', minHeight: '100vh', padding: '12px', overflow: 'auto', height: '100vh' }}>
      <h3>ไอคอนวัตถุดิบและอาหาร (16×16 ×4)</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {FOOD_ICON_IDS.map((id) => (
          <div style={cell} key={id}>
            <Img url={spriteDataUrl(foodIcon(id), 4)} />
            <span>{ITEM_BY_ID[id]?.name ?? id}</span>
          </div>
        ))}
      </div>
      <h3>จานใหญ่ (×3)</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {FOOD_ICON_IDS.filter((i) => i.startsWith('dish_')).map((id) => (
          <Img key={id} url={spriteDataUrl(dishSprite(id), 3)} title={id} />
        ))}
      </div>
      <h3>ขวดเครื่องปรุง · เครื่องมือ · ไข่</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'end' }}>
        {(['fishsauce', 'soy', 'sugar', 'chili', 'pepper', 'lime', 'tamarind'] as Condiment[]).map((c) => (
          <Img key={c} url={spriteDataUrl(bottleSprite(c), 4)} title={c} />
        ))}
        {(['knife', 'turner', 'ladle', 'whisk', 'spoon', 'finger'] as Tool[]).map((t) => (
          <Img key={t} url={spriteDataUrl(toolSprite(t), 4)} title={t} />
        ))}
        {([0, 1, 2] as const).map((s) => (
          <Img key={s} url={spriteDataUrl(eggSprite(s), 4)} />
        ))}
      </div>
      <h3>เฟอร์นิเจอร์ครัว</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end' }}>
        {['kitchen_stove', 'kitchen_fridge', 'rice_cooker'].map((id) => (
          <Img key={id} url={spriteDataUrl(furnitureSprite(id), 4)} title={id} />
        ))}
        {['kitchen_stove', 'kitchen_fridge', 'rice_cooker'].map((id) => (
          <Img key={`t${id}`} url={spriteDataUrl(furnitureThumb(id), 3)} title={`${id} thumb`} />
        ))}
      </div>
      <h3>ครัว</h3>
      <CanvasOf
        w={190}
        h={420}
        scale={2}
        draw={(g) => {
          g.draw(bakeKitchen(190, 420, 150), 0, 0)
          drawStove(g, 95, 236)
          drawFlames(g, 95, 236, 0.3)
          const w = drawWok(g, 95, 226)
          drawBits(g, ['rice', 'egg', 'onion'], w.cx, w.cy, w.rx, w.ry, 0.4, 3, 0.4)
          drawBoard(g, 95, 360)
          let x = 30
          for (const b of ['garlic', 'chili', 'onion'] as Bit[]) x += drawChopItem(g, b, x, 356, b === 'chili' ? [10, 20] : []) + 6
        }}
      />
      <CanvasOf
        w={380}
        h={200}
        scale={2}
        draw={(g) => {
          g.rect(0, 0, 380, 200, '#e8c48e')
          const p = drawPan(g, 50, 50)
          drawBits(g, ['egg'], p.cx, p.cy, p.rx, p.ry, 0, 2)
          const pot = drawPot(g, 190, 60)
          drawBits(g, ['curry', 'chicken'], pot.cx, pot.cy, pot.rx, pot.ry, 0.8, 4)
          const b = drawMixBowl(g, 310, 60)
          drawBits(g, ['batter'], b.cx, b.cy, b.rx, b.ry, 0.8, 4)
          drawKrokPan(g, 60, 150)
          drawPlate(g, 170, 150)
          drawServeBowl(g, 250, 145)
          drawBananaLeaf(g, 330, 150)
        }}
      />
    </div>
  )
}

function setupState() {
  const lv = Number(q.get('lv') ?? (q.has('recipe') ? 20 : 14))
  const inv: Record<string, number> = {}
  if (!q.has('empty')) for (const r of RECIPES) for (const [id, n] of Object.entries(r.ingredients)) inv[id] = (inv[id] ?? 0) + n * 2
  game.value = { ...defaultState(), onboarded: true, merit: meritForLevel(lv) + 5, coins: 320, inventory: { ...defaultState().inventory, ...inv } }
  // Skip the daily login pop-up in screenshots.
  ensureDaily()
  game.value = { ...game.value, daily: { ...game.value.daily, loginClaimed: true }, login: { streak: 1, last: game.value.daily.key, best: 1 } }
}

function CookView() {
  const a = activity.value
  return (
    <div class="app">
      <div class="phone">
        {a && <CookActivity req={a} />}
        <Overlays />
      </div>
    </div>
  )
}

function MartOverview() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const map = martMap()
    const scale = Number(q.get('s') ?? 3)
    const scene = new WorldScene(map, game.value.player.look, { onArrive() {} }, { spawn: map.entries?.wat })
    scene.interactive = true
    scene.resize(map.w, map.h)
    const surf = new Surface(map.w, map.h)
    let t = 0
    const c = ref.current!
    c.width = map.w * scale
    c.height = map.h * scale
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    let raf = 0
    const tick = () => {
      t += 1 / 60
      scene.update(1 / 60, t)
      surf.reset()
      surf.setCamera(0, 0)
      scene.render(surf)
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(surf.canvas, 0, 0, c.width, c.height)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    Object.assign(window as unknown as Record<string, unknown>, { __mart: scene })
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div style={{ background: '#2b2340', minHeight: '100vh', padding: '8px', overflow: 'auto', height: '100vh' }}>
      <canvas ref={ref} style={{ display: 'block' }} />
    </div>
  )
}

async function main() {
  const app = document.getElementById('app')!
  if (view === 'gallery') render(<Gallery />, app)
  else if (view === 'mart') {
    setupState()
    render(<MartOverview />, app)
  } else {
    setupState()
    const recipe = q.get('recipe') ?? undefined
    activity.value = { id: 'cook', params: recipe ? { recipe, ...(q.has('go') ? { go: '1' } : {}) } : {} }
    render(<CookView />, app)
  }
}
void main()
