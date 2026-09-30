// The vendor's brief card, shown before any booth game or ride starts: the
// vendor (portrait, name, a funny line), what the game is, the price of the
// next round, the deals (free first round, happy hour, round bundles, the
// 5th-round ticket bonus), what you can win here, and play / buy / back.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { FAIR_PRIZE_BY_ID } from '../../game/hubs'
import { COLLECTIBLE_BY_ID } from '../../game/data/collectibles'
import { collectibleUrl } from '../../art/collectibles'
import { dollPortrait } from '../../art/doll'
import { spriteDataUrl } from '../../engine/sprite'
import { pick } from '../../engine/rng'
import { sfx } from '../../engine/audio'
import { coinStoreOpen } from '../../ui/store'
import { PBtn, Window } from '../../ui/components/kit'
import { Coin, Icon } from '../../ui/components/common'
import { BONUS_AT, BONUS_TICKETS, buyDeal, dealsFor, HAPPY_FROM, HAPPY_TO, isHappyHour, nextQuote, passesOf, playsOf } from './deals'
import { prizeArt } from './prizes'
import { TicketIcon } from './shell'
import { fairSfx } from './sound'
import type { BoothInfo } from './vendors'

const portraits = new Map<string, string>()
function portraitUrl(b: BoothInfo) {
  let u = portraits.get(b.key)
  if (!u) {
    u = spriteDataUrl(dollPortrait(b.vendor.look, 30), 3)
    portraits.set(b.key, u)
  }
  return u
}

const pad = (n: number) => String(n).padStart(2, '0')

function PriceLine({ b }: { b: BoothInfo }) {
  const q = nextQuote(b.key, b.base)
  const left = passesOf(b.key)
  let main: preact.ComponentChildren
  if (b.base <= 0) main = <span class="fairx-price-big green">ฟรีทุกรอบ!</span>
  else if (q.via === 'free') main = <span class="fairx-price-big green">รอบนี้ฟรี! (รอบแรกของวัน)</span>
  else if (q.via === 'pass') main = <span class="fairx-price-big green">ใช้รอบเหมา (เหลือ {left} รอบ)</span>
  else if (q.via === 'happy')
    main = (
      <span class="fairx-price-big">
        <Coin n={q.cost} size={16} /> <s class="muted small">{q.normal}</s> <span class="chip pink small">ลด 50%</span>
      </span>
    )
  else
    main = (
      <span class="fairx-price-big">
        <Coin n={q.cost} size={16} /> ต่อรอบ
      </span>
    )
  return (
    <div class="fairx-price">
      <span class="small muted">ค่าเล่นรอบถัดไป</span>
      {main}
      {left > 0 && q.via !== 'pass' && <span class="chip green small">มีรอบเหมาเหลือ {left} รอบ</span>}
    </div>
  )
}

function Deals({ b, onBought }: { b: BoothInfo; onBought: () => void }) {
  const plays = playsOf(b.key)
  const happy = isHappyHour()
  const coins = game.value.coins
  return (
    <div class="fairx-deals">
      <div class="fairx-sec">
        <Icon name="coin" size={14} /> โปรเด็ดวันนี้
      </div>
      <div class={`fairx-deal perk ${plays > 0 ? 'used' : 'on'}`}>
        <span class="grow">รอบแรกของวันเล่นฟรี</span>
        <span class="chip small">{plays > 0 ? 'ใช้แล้ว' : 'ใช้ได้!'}</span>
      </div>
      {b.base > 0 && (
        <div class={`fairx-deal perk ${happy ? 'on' : ''}`}>
          <span class="grow">
            Happy hour {pad(HAPPY_FROM)}:00–{pad(HAPPY_TO)}:00 ลด 50%
          </span>
          <span class="chip small">{happy ? 'ตอนนี้เลย!' : 'รอก่อน'}</span>
        </div>
      )}
      <div class={`fairx-deal perk ${plays >= BONUS_AT ? 'used' : ''}`}>
        <span class="grow">
          เล่นครบ {BONUS_AT} รอบวันนี้ แถมตั๋ว +{BONUS_TICKETS} <TicketIcon size={10} />
        </span>
        <span class="chip small">{plays >= BONUS_AT ? 'ได้แล้ว' : `${plays}/${BONUS_AT}`}</span>
      </div>
      {dealsFor(b.key, b.base).map((d) => (
        <div class="fairx-deal fairx-pack" key={d.id}>
          <div class="grow">
            <b>
              {d.rounds} รอบ {d.price} คอยน์
            </b>{' '}
            <span class="small muted">
              (ปกติ <s>{d.normal}</s>)
            </span>
            <div class="small">
              {d.label} · ประหยัด {d.normal - d.price}
            </div>
          </div>
          <PBtn
            tone={coins >= d.price ? 'gold' : 'paper'}
            size="small"
            onClick={() => {
              if (coins < d.price) {
                coinStoreOpen.value = true
                return
              }
              if (buyDeal(b.key, b.base, d.id)) {
                sfx.purchase()
                fairSfx.tada()
                onBought()
              }
            }}
          >
            ซื้อ <Coin n={d.price} size={12} />
          </PBtn>
        </div>
      ))}
    </div>
  )
}

function Prizes({ b }: { b: BoothInfo }) {
  const prizes = b.vendor.prizes.map((id) => FAIR_PRIZE_BY_ID[id]).filter(Boolean)
  const souvenirs = b.vendor.souvenirs.filter((s) => COLLECTIBLE_BY_ID[s.id])
  if (!prizes.length && !souvenirs.length) return null
  return (
    <div class="fairx-brief-prizes">
      <div class="fairx-sec">
        <Icon name="gift" size={14} /> ของรางวัลซุ้มนี้
      </div>
      <div class="fairx-prize-strip">
        {souvenirs.map((s) => {
          const c = COLLECTIBLE_BY_ID[s.id]!
          return (
            <div class="fairx-mini" key={s.id}>
              <img class="px" src={collectibleUrl(c, 3)} alt="" width={40} height={40} />
              <div class="fairx-mini-name">{c.name}</div>
              <span class="chip green small">{s.how}</span>
            </div>
          )
        })}
        {prizes.map((p) => (
          <div class="fairx-mini" key={p.id}>
            {(() => {
              const art = prizeArt(p)
              return <img class="px" src={art.url} alt="" width={art.plush ? 39 : 40} height={art.plush ? 39 : 40} />
            })()}
            <div class="fairx-mini-name">{p.name}</div>
            <span class="chip gold small">
              <TicketIcon size={10} /> {p.tickets}
            </span>
          </div>
        ))}
      </div>
      {prizes.length > 0 && <div class="small muted">เล่นได้ตั๋ว แล้วเอาตั๋วไปแลกที่ซุ้มรางวัลหน้าเวที</div>}
    </div>
  )
}

/** Vendor brief card: play one round, buy a deal, or go back. */
export function BriefCard({ b, onPlay, onClose, onHowTo }: { b: BoothInfo; onPlay: () => void; onClose: () => void; onHowTo?: () => void }) {
  const [line] = useState(() => pick(b.vendor.lines))
  const [, bump] = useState(0)
  const q = nextQuote(b.key, b.base)
  const label = b.base <= 0 || q.cost === 0 ? (q.via === 'pass' ? 'เล่น (รอบเหมา)' : 'เล่น 1 รอบ (ฟรี)') : `เล่น 1 รอบ · ${q.cost} คอยน์`
  return (
    <Window
      title={b.name}
      icon={b.icon}
      onClose={onClose}
      footer={
        <div class="col" style={{ gap: '6px', width: '100%', minWidth: 0 }}>
          <PBtn tone="green" block size="big" icon="play" onClick={onPlay}>
            {label}
          </PBtn>
          <div class="row" style={{ gap: '6px' }}>
            {onHowTo && (
              <PBtn tone="blue" block size="small" onClick={onHowTo}>
                วิธีเล่น
              </PBtn>
            )}
            <PBtn tone="paper" block size="small" onClick={onClose}>
              กลับ
            </PBtn>
          </div>
        </div>
      }
    >
      <div class="fairx-vendor">
        <img class="px fairx-vendor-face" src={portraitUrl(b)} alt="" width={78} height={78} />
        <div class="grow">
          <div class="fairx-vendor-name">
            <b>{b.vendor.name}</b> <span class="small muted">· {b.vendor.role}</span>
          </div>
          <div class="fairx-vendor-say">{line}</div>
        </div>
      </div>
      <p class="fairx-what small">{b.vendor.what}</p>
      <PriceLine b={b} />
      <Deals b={b} onBought={() => bump((n) => n + 1)} />
      <Prizes b={b} />
      <div class="fairx-best small muted">
        มีบุญคอยน์ <Coin n={game.value.coins} size={12} /> · ตั๋ว <TicketIcon size={10} /> {game.value.hubs.tickets} ใบ
      </div>
    </Window>
  )
}
