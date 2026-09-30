// The brief card shown before every temple mini-game: the host NPC with a
// funny line, what you'll do (with a tiny picture of you doing it), what it
// costs, today's deals (which really work, see game/templeDeals.ts), what you
// earn, and play / back.

import { useMemo, useState } from 'preact/hooks'
import type { ActivityId, ActivityRequest } from '../ui/store'
import { spriteDataUrl } from '../engine/sprite'
import { dollSprite, type BaseDollPose, type DollView } from '../art/doll'
import { hdMonkSprite } from '../art/minigames/monk'
import { HOSTS, type TempleHost } from '../art/minigames/hosts'
import { isTPose, tp, type TPose } from '../art/poses/temple'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { count, lotteryLeft } from '../game/actions'
import { ITEM_BY_ID } from '../game/data/items'
import { buyDeal, dealBlock, dealsFor, isWanPra, nextWanPra, regularPrice, type TempleDeal } from '../game/templeDeals'
import { toast } from '../game/events'
import { GOALS } from './goals'
import { Coin, Icon } from '../ui/components/common'
import { PBtn, Window } from '../ui/components/kit'
import { sfx } from '../engine/audio'

interface Price {
  text: string
  icon: string
  /** Owned count shown next to the price. */
  have?: number
}

interface BriefDef {
  host: (p: Record<string, unknown>) => string
  pose: TPose | BaseDollPose
  view: DollView
  doing: string
  price: (p: Record<string, unknown>) => Price
  deals: (p: Record<string, unknown>) => string
}

const same = (k: string) => () => k
const item = (id: string, per: string): Price => ({ text: `${ITEM_BY_ID[id]?.name ?? id} ${per}`, icon: ITEM_BY_ID[id]?.icon ?? 'gift', have: count(id) })
const FREE: Price = { text: 'ฟรี ไม่เสียคอยน์', icon: 'heart' }

export const BRIEFS: Partial<Record<ActivityId, BriefDef>> = {
  alms: { host: same('alms'), pose: 'alms_give', view: 'front', doing: 'ยืนรอพระบิณฑบาต ยกของใส่บาตรทีละอย่าง แล้วคุกเข่าพนมมือรับพร', price: () => ({ text: 'ของใส่บาตร 1 ชิ้น/อย่าง · ข้าวสวย 5 คอยน์', icon: 'bowl', have: count('rice') }), deals: same('alms') },
  koi: {
    host: (p) => (p.river ? 'koi_river' : 'koi'),
    pose: 'toss_throw',
    view: 'back',
    doing: 'ยืนบนสะพานไม้ แตะผิวน้ำเพื่อโยนอาหาร ปลากินต่อเนื่องได้คอมโบ',
    price: (p) => (p.river ? item('catfish_food', '1 ชิ้น/ครั้ง · ก้อนละ 5 คอยน์') : item('fish_food', '1 เม็ด/ครั้ง · ถุงละ 5 คอยน์ (12 เม็ด)')),
    deals: (p) => (p.river ? 'koi_river' : 'koi'),
  },
  wish: { host: same('wish'), pose: 'incense_wai', view: 'back', doing: 'จุดธูป ๓ ดอกที่เทียน ถวายดอกไม้ ยกธูปอธิษฐาน แล้วปักลงกระถาง', price: () => ({ text: 'จุดธูปฟรี · ดอกไม้ถวายไม่บังคับ', icon: 'incense', have: count('lotus') }), deals: same('wish') },
  siamsi: { host: same('siamsi'), pose: 'ss_shake_a', view: 'front', doing: 'คุกเข่า เขย่ากระบอกเซียมซีจนไม้หล่นออกมา ๑ อัน', price: () => ({ text: (game.value.daily.counts.siamsi ?? 0) > 0 ? `วันนี้เสี่ยงแล้ว · ครั้งต่อไป 5 คอยน์${(game.value.daily.counts.siamsi_credit ?? 0) > 0 ? ` (มีสิทธิ์ ${game.value.daily.counts.siamsi_credit} ครั้ง)` : ''}` : 'ครั้งแรกของวันฟรี', icon: 'fortune' }), deals: same('siamsi') },
  deity: { host: same('deity'), pose: 'offer_up', view: 'back', doing: 'วางของโปรดบนโต๊ะ จุดธูปเทียน ยกธูปอธิษฐานจนแสงเต็ม', price: () => ({ text: 'ของถวายสูงสุด 3 อย่าง (ไม่บังคับ)', icon: 'fruit', have: count('fruit') }), deals: same('deity') },
  lottery: { host: same('lottery'), pose: 'rub_b', view: 'back', doing: 'ไหว้ขอขมา โรยแป้ง แล้วใช้นิ้วลูบเปลือกไม้จนเห็นเลข', price: () => ({ text: `เหลือสิทธิ์วันนี้ ${lotteryLeft()} ครั้ง · เพิ่มครั้งละ 15 คอยน์`, icon: 'powder' }), deals: same('lottery') },
  gold_leaf: { host: same('gold_leaf'), pose: 'press_b', view: 'back', doing: 'ถือทองคำเปลว ลากนิ้วกดทองให้ทั่วองค์พระ ทั้งหน้าและหลัง', price: () => item('gold_leaf', '1 แผ่น/ครั้ง · แผ่นละ 10 คอยน์'), deals: same('gold_leaf') },
  donate: { host: same('donate'), pose: 'coin_drop', view: 'back', doing: 'เลือกจำนวน แล้วหยอดเหรียญลงช่องตู้ทีละเหรียญ', price: () => ({ text: 'ใช้บุญคอยน์ตามที่หยอด (5–100)', icon: 'coin', have: game.value.coins }), deals: same('donate') },
  bells: { host: same('bells'), pose: 'bell_hit', view: 'back', doing: 'แตะระฆังที่มีวงแสง ตีตอนวงแสงหดพอดีได้คอมโบ ครบ ๙ ใบได้โบนัส', price: () => FREE, deals: same('bells') },
  circle: { host: same('circle'), pose: 'candle_walk', view: 'front', doing: 'ถือเทียนเดินวนขวารอบพระธาตุ ๓ รอบ อย่ารีบจนเทียนดับ', price: () => FREE, deals: same('circle') },
  holy_water: { host: same('holy_water'), pose: 'ladle_up', view: 'back', doing: 'กดค้างจุ่มกระบวย ปล่อยเมื่อน้ำถึงช่องทอง แล้วรดน้ำมนต์', price: () => FREE, deals: same('holy_water') },
  krathong: { host: same('krathong'), pose: 'kt_raise', view: 'back', doing: 'ประดับกระทง จุดเทียน ยกขึ้นอธิษฐาน แล้วลอยลงน้ำ', price: () => item('krathong', '1 ใบ · ใบละ 15 คอยน์'), deals: same('krathong') },
  dog: { host: same('dog'), pose: 'pet_a', view: 'front', doing: 'เทอาหารใส่ชาม แล้วลากนิ้วลูบหัวน้องหมา', price: () => ({ text: 'อาหาร 1 ชิ้น/มื้อ · วันละ 3 มื้อ', icon: 'dogfood', have: count('dog_food') }), deals: same('dog') },
  hall: { host: same('hall'), pose: 'kneelWai', view: 'front', doing: 'สวดมนต์ นั่งสมาธิ หรือกราบพระ ๓ ครั้ง ในอุโบสถ', price: () => FREE, deals: same('hall') },
}

const REWARD: Partial<Record<ActivityId, string>> = {
  hall: 'บุญจากการสวดมนต์ นั่งสมาธิ และกราบพระ',
}

const STYLE = `
.tb-win { max-width: 380px; }
.tb-host { display: flex; gap: 8px; align-items: flex-end; margin: -2px 0 6px; }
.tb-host img { flex-shrink: 0; image-rendering: pixelated; filter: drop-shadow(0 2px 0 rgba(58,40,56,0.25)); }
.tb-bubble { position: relative; flex: 1; padding: 6px 9px 7px; background: #fffaf0; border-radius: 6px; box-shadow: 0 0 0 2px #3a2838, 0 3px 0 2px rgba(58,40,56,0.25); font-size: 13px; line-height: 1.35; margin-bottom: 12px; animation: tb-pop 0.3s cubic-bezier(.3,1.7,.5,1); }
.tb-bubble::after { content: ''; position: absolute; left: -8px; bottom: 10px; border: 5px solid transparent; border-right: 6px solid #3a2838; }
.tb-bubble b { display: block; font-size: 12px; color: #8e3a5c; }
.tb-bubble small { color: #7a6a60; font-size: 11px; }
.tb-row { display: flex; gap: 8px; align-items: center; padding: 6px 8px; margin: 4px 0; background: #fff3dc; border-radius: 4px; box-shadow: inset 0 0 0 2px #e8cfa3; font-size: 13px; line-height: 1.35; }
.tb-row .tb-k { flex-shrink: 0; min-width: 44px; font-size: 11px; color: #8a6a50; font-weight: 600; }
.tb-row img.tb-me { flex-shrink: 0; image-rendering: pixelated; margin: -8px 0 -6px; }
.tb-grow { flex: 1; min-width: 0; }
.tb-have { flex-shrink: 0; font-size: 11px; padding: 1px 6px; background: #e8f4d8; border-radius: 8px; color: #2f6f4b; }
.tb-deals { display: flex; flex-direction: column; gap: 5px; margin: 6px 0; }
.tb-deal { display: flex; align-items: center; gap: 7px; padding: 5px 6px 5px 8px; background: linear-gradient(90deg, #ffe9f0, #fff6d6); border-radius: 4px; box-shadow: inset 0 0 0 2px #f5b2c8; font-size: 13px; line-height: 1.25; }
.tb-deal.wanpra { background: linear-gradient(90deg, #fff3b8, #ffe0a0); box-shadow: inset 0 0 0 2px #e9a53a; }
.tb-deal .tb-note { display: block; font-size: 11px; color: #8e3a5c; }
.tb-deal s { color: #9a8a80; font-size: 11px; margin-right: 3px; }
.tb-tag { position: relative; top: -1px; margin-right: 4px; padding: 0 5px; background: #e8514a; color: #fff; border-radius: 3px; font-size: 10px; font-weight: 700; }
.tb-deal .btn { flex-shrink: 0; min-height: 36px; margin: 0; }
.tb-reward { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #fff1b8; border-radius: 4px; box-shadow: inset 0 0 0 2px #e9c46a; font-size: 13px; }
.tb-foot { display: flex; gap: 8px; width: 100%; }
.tb-foot > :first-child { flex: 0 0 34%; }
.tb-foot > :last-child { flex: 1; }
@keyframes tb-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
`
function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById('tb-style')) return
  const el = document.createElement('style')
  el.id = 'tb-style'
  el.textContent = STYLE
  document.head.appendChild(el)
}
ensureStyle()

function hostSprite(h: TempleHost): string {
  if (h.monk) return spriteDataUrl(hdMonkSprite('front', 'bless', { novice: h.monk === 'novice', skin: 1 }), 2)
  return spriteDataUrl(dollSprite(h.look!, 'wave', { view: 'front' }), 2)
}

const BLOCK_TEXT = { used: 'รับแล้ววันนี้', coins: 'คอยน์ไม่พอ', not_wanpra: 'รอวันพระ' } as const

function DealRow({ d, onBought }: { d: TempleDeal; onBought: () => void }) {
  void game.value
  const block = dealBlock(game.value, d)
  const was = regularPrice(d)
  const buy = () => {
    if (!buyDeal(d)) {
      sfx.error()
      if (block === 'coins') toast('บุญคอยน์ไม่พอ เติมหรือดูโฆษณารับฟรีได้นะ', 'coin', 'warn')
      return
    }
    tsfx.plink()
    if (d.price > 0) sfx.coins(4)
    else sfx.sparkle()
    toast(d.buff ? `รับพร${d.label}แล้ว` : `ได้รับ ${d.label}`, d.icon)
    onBought()
  }
  return (
    <div class={`tb-deal ${d.wanpra ? 'wanpra' : ''}`}>
      <Icon name={d.icon} size={28} />
      <div class="tb-grow">
        <span class="tb-tag">{d.price === 0 ? 'ฟรี' : 'ดีล'}</span>
        {d.label}
        <span class="tb-note">
          {was > d.price && d.price > 0 && <s>{was}</s>}
          {d.note}
        </span>
      </div>
      <PBtn tone={d.price === 0 ? 'green' : 'gold'} size="small" onClick={buy} disabled={!!block}>
        {block ? BLOCK_TEXT[block] : d.price === 0 ? 'รับฟรี' : <Coin n={d.price} size={14} />}
      </PBtn>
    </div>
  )
}

export function TempleBrief({ req, onStart, onBack, again }: { req: ActivityRequest; onStart: () => void; onBack: () => void; again?: boolean }) {
  const def = BRIEFS[req.id]
  const p = (req.params ?? {}) as Record<string, unknown>
  const [, bump] = useState(0)
  const host = def ? HOSTS[def.host(p)] ?? HOSTS.hall : HOSTS.hall
  const line = useMemo(() => host.lines[Math.floor(Math.random() * host.lines.length)], [host])
  const hostImg = useMemo(() => hostSprite(host), [host])
  const look = game.value.player.look
  const meImg = useMemo(() => (def ? spriteDataUrl(dollSprite(look, isTPose(def.pose) ? tp(def.pose) : def.pose, { view: def.view }), 1) : ''), [look, def])
  if (!def) return null
  const goal = GOALS[req.id]
  const price = def.price(p)
  const deals = dealsFor(def.deals(p))
  const next = !isWanPra() ? nextWanPra() : null
  const title = goal?.title ?? 'ในอุโบสถ'
  return (
    <Window
      title={title}
      icon={goal?.icon ?? 'wai'}
      class="tb-win"
      onClose={again ? onStart : onBack}
      footer={
        <div class="tb-foot">
          {!again && (
            <PBtn tone="paper" size="big" onClick={onBack}>
              กลับ
            </PBtn>
          )}
          <PBtn tone="green" size="big" icon="play" onClick={() => (tsfx.praise(), onStart())}>
            {again ? 'เล่นต่อ' : 'เริ่มเลย'}
          </PBtn>
        </div>
      }
    >
      <div class="tb-host">
        <img src={hostImg} width={host.monk ? 64 : 68} height={host.monk ? 108 : 104} alt={host.name} draggable={false} />
        <div class="tb-bubble">
          <b>
            {host.name} <small>· {host.role}</small>
          </b>
          “{line}”
        </div>
      </div>
      <div class="tb-row">
        <img class="tb-me" src={meImg} width={51} height={78} alt="" draggable={false} />
        <div class="tb-grow">
          <span class="tb-k">ทำอะไร</span>
          <div>{def.doing}</div>
        </div>
      </div>
      <div class="tb-row">
        <span class="tb-k">ราคา</span>
        <Icon name={price.icon} size={22} />
        <span class="tb-grow">{price.text}</span>
        {price.have !== undefined && <span class="tb-have num">มี {price.have.toLocaleString('th-TH')}</span>}
      </div>
      {deals.length > 0 && (
        <div class="tb-deals">
          <div class="subtitle" style={{ color: "#8e3a5c" }}>ดีลวันนี้</div>
          {deals.map((d) => (
            <DealRow key={d.id} d={d} onBought={() => bump((n) => n + 1)} />
          ))}
        </div>
      )}
      {next && <div class="small muted" style={{ margin: '2px 0 6px' }}>วันพระถัดไป {next.getDate()}/{next.getMonth() + 1} · รับพรบุญ x2 ฟรี</div>}
      <div class="tb-reward">
        <Icon name="gift" size={20} />
        <span>
          <b>ได้รับ</b> {REWARD[req.id] ?? goal?.reward}
        </span>
      </div>
    </Window>
  )
}
