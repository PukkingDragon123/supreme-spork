// The brief card shown before every beach mini-game or ride: the host /
// vendor (their own HD doll waving), a funny line, what to do in two lines,
// the price or "free", today's deals (lit up when they apply), the rewards,
// and the play / back buttons. Paying happens here (payBeachRound).

import { useMemo } from 'preact/hooks'
import { game } from '../../game/state'
import { BEACH_GAMES, type BeachGameId } from '../../game/data/beaches'
import { beachFullLeft, beachOffer, canSnorkel, payBeachRound } from '../../game/beach'
import { dollSprite } from '../../art/doll'
import { DEFAULT_LOOK } from '../../art/avatar'
import { spriteDataUrl } from '../../engine/sprite'
import { PBtn } from '../../ui/components/kit'
import { Coin, Icon, Merit } from '../../ui/components/common'
import { PT } from '../../ui/pixeltext'
import { sfx } from '../../engine/audio'
import { openShop } from '../../ui/store'

export function BriefCard({ id, onPlay, onBack }: { id: BeachGameId; onPlay: () => void; onBack: () => void }) {
  const def = BEACH_GAMES[id]
  const s = game.value
  const offer = beachOffer(id)
  const left = beachFullLeft(id)
  const hostUrl = useMemo(() => spriteDataUrl(dollSprite({ ...DEFAULT_LOOK, ...def.host.look }, 'wave'), 2), [id])
  const locked = id === 'snorkel' && !canSnorkel(s.player.look)
  const pay = (pack = false) => {
    if (locked) return
    if (!payBeachRound(id, pack)) {
      sfx.error()
      return
    }
    if (offer.price > 0 || pack) sfx.coin()
    else sfx.chime()
    onPlay()
  }
  const free = offer.price === 0
  return (
    <div class="bchx-brief" role="dialog" aria-label={def.name}>
      <div class="bchx-card">
        <div class="bchx-host">
          <img src={hostUrl} alt={def.host.name} width={68} height={104} draggable={false} />
          <div class="bchx-say">
            <b class="bchx-name small">
              {def.host.name} <span class="muted">· {def.host.role}</span>
            </b>
            <span class="small">“{def.host.line}”</span>
          </div>
        </div>
        <div class="title center">
          <Icon name={def.icon} size={20} /> {def.name}
        </div>
        <div class="bchx-what small">
          <Icon name="info" size={16} />
          <span>
            {def.goal}
            <br />
            <span class="muted">{def.steps[0]}</span>
          </span>
        </div>
        {locked && (
          <div class="bchx-lock small">
            <Icon name="lock" size={14} /> ต้องใส่ชุดดำน้ำหรือตีนกบก่อนนะ (ชุดหนีภัยน้ำท่วมในร้านค้า) ไม่งั้นลงไปได้แค่ลอยห่วงยางริมหาด
          </div>
        )}
        <div class="bchx-price">
          <PT text="ราคา" size={12} weight={600} color="#fff1d6" />
          {free ? (
            <PT text={offer.credits > 0 ? `จ่ายแล้ว · เหลือ ${offer.credits} รอบ` : offer.base > 0 ? 'ฟรี' : 'ฟรี!'} size={13} weight={600} color="#b4e486" />
          ) : (
            <span class="row" style={{ gap: '6px', alignItems: 'center' }}>
              {offer.price < offer.base && <s class="small">{offer.base}</s>}
              <Coin n={offer.price} size={16} />
            </span>
          )}
        </div>
        {offer.deals.length > 0 && (
          <div class="bchx-deals">
            {offer.deals.map((d) => (
              <div class={`bchx-deal small ${d.active ? 'on' : ''}`} key={d.kind}>
                <span class="bchx-tag">{d.active ? 'ดีล' : 'พลาด'}</span>
                {d.text}
              </div>
            ))}
          </div>
        )}
        <div class="bchx-reward small">
          <Icon name="gift" size={16} />
          <span>
            {def.reward}
            {def.merit > 0 && (
              <>
                {' '}
                · สูงสุด <Merit n={`${def.merit * (offer.deals.some((d) => d.kind === 'first' && d.active) ? def.firstBonus ?? 1 : 1)}`} size={14} />
              </>
            )}
            <br />
            <span class="muted">{left > 0 ? `รางวัลเต็มเหลือ ${left} รอบวันนี้` : 'วันนี้รับรางวัลเต็มครบแล้ว รอบต่อไปได้ 25%'}</span>
          </span>
        </div>
        <div class="bchx-btns">
          {offer.pack && offer.credits === 0 ? (
            <div class="row">
              <PBtn tone="green" icon="play" disabled={locked || s.coins < offer.price} onClick={() => pay(false)}>
                1 รอบ · {offer.price}
              </PBtn>
              <PBtn tone="gold" icon="gift" disabled={locked || s.coins < offer.pack.price} onClick={() => pay(true)}>
                {offer.pack.n} รอบ · {offer.pack.price}
              </PBtn>
            </div>
          ) : (
            <PBtn tone="green" block size="big" icon="play" disabled={locked || s.coins < offer.price} onClick={() => pay(false)}>
              {free ? 'เล่นเลย!' : `เล่นเลย · ${offer.price} คอยน์`}
            </PBtn>
          )}
          {locked && (
            <PBtn tone="blue" block icon="shop" onClick={() => openShop('packs')}>
              ไปดูชุดดำน้ำในร้านค้า
            </PBtn>
          )}
          {!locked && s.coins < offer.price && <div class="small center muted">บุญคอยน์ไม่พอ ไปเก็บขยะหรือก่อเจดีย์ทรายก่อนก็ได้ (ฟรี)</div>}
          <PBtn tone="paper" block onClick={onBack}>
            ไว้ก่อน กลับไปเดินเล่น
          </PBtn>
        </div>
      </div>
    </div>
  )
}
