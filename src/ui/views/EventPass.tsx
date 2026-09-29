// Battle pass view: points bar, a horizontally scrolling two-row track
// (free / premium) with locked, claimable and claimed cards, "claim all" and
// the premium upsell with a preview of the top rewards.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { game } from '../../game/state'
import type { EventProgress } from '../../game/events/save'
import type { EventReward, LiveEventDef, PassTier } from '../../game/events/types'
import { claimable, tierProgress, tierState, type PassRow, type TierState } from '../../game/battlepass'
import { rewardName } from '../../game/events/rewards'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { petArtIds, petIcon } from '../../art/pets'
import { rescueDogBigSprite, rescuerBigSprite } from '../../art/flood'
import { spriteDataUrl } from '../../engine/sprite'
import { AvatarImg, Icon } from '../components/common'
import { PBtn } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { EvIcon, RewardIcon, rewardAmount } from './EventParts'

const COL = 70

function RewardCard({ rewards, state, row, big, onTap }: { rewards: EventReward[]; state: TierState; row: PassRow; big?: boolean; onTap: () => void }) {
  if (!rewards.length) return <span class="ev-card empty" />
  const [main, extra] = rewards
  const ready = state === 'claimable'
  return (
    <button
      class={`ev-card ${row} ${state} ${big ? 'big' : ''}`}
      onClick={onTap}
      aria-label={`${rewardName(main)}${ready ? ' กดรับ' : ''}`}
    >
      <span class="ev-card-icon">
        <RewardIcon r={main} size={big ? 36 : 30} />
      </span>
      <span class="ev-card-amt">
        <PT text={rewardAmount(main)} size={12} weight={600} scale={1} color={row === 'premium' ? '#6e2a08' : '#3b2616'} />
      </span>
      {extra && (
        <span class="ev-card-extra" title={rewardName(extra)}>
          <RewardIcon r={extra} size={16} />
        </span>
      )}
      {state === 'claimed' && (
        <span class="ev-card-stamp">
          <Icon name="check" size={22} />
        </span>
      )}
      {(state === 'locked' || state === 'premium_locked') && (
        <span class="ev-card-lock">
          <Icon name="lock" size={14} />
        </span>
      )}
      {ready && <span class="ev-card-ready">รับ!</span>}
    </button>
  )
}

function PremiumPreview() {
  const look = game.value.player.look
  const hasSuit = !!OUTFIT_BY_ID.suit_rescue
  const hasDog = useMemo(() => petArtIds().includes('tub_rescue'), [])
  const crew = useMemo(() => spriteDataUrl(rescuerBigSprite(), 3), [])
  const dog = useMemo(() => spriteDataUrl(hasDog ? petIcon('tub_rescue') : rescueDogBigSprite(), 3), [hasDog])
  return (
    <div class="ev-preview">
      <span class="ev-preview-rays" />
      {hasSuit ? (
        <AvatarImg look={{ ...look, suit: 'suit_rescue', head: OUTFIT_BY_ID.head_rescue_helmet ? 'head_rescue_helmet' : look.head }} scale={3} class="ev-preview-crew" />
      ) : (
        <img class="px ev-preview-crew" src={crew} alt="ชุดกู้ภัยเต็มยศ" />
      )}
      <img class="px ev-preview-dog" src={dog} alt="ตูบกู้ภัย" />
    </div>
  )
}

function Upsell({ def, onBuy, busy }: { def: LiveEventDef; onBuy: (id: string) => void; busy: boolean }) {
  const sum = (row: 'free' | 'premium', kind: 'coins' | 'merit') => def.pass.tiers.reduce((n, t) => n + t[row].filter((r) => r.kind === kind).reduce((m, r) => m + (r.n ?? 0), 0), 0)
  const cosm = def.pass.tiers.flatMap((t) => t.premium).filter((r) => r.kind === 'outfit' || r.kind === 'pet')
  return (
    <div class="panel gold ev-upsell">
      <span class="ribbon">พรีเมียม</span>
      <div class="ev-upsell-head">
        <EvIcon name="ev_crown" size={22} />
        <PT text={`บัตรผ่าน${def.pass.premiumName}`} size={14} weight={600} {...TONE_TEXT.ink} />
      </div>
      <div class="ev-upsell-top">
        <PremiumPreview />
        <div class="ev-upsell-text">
          <ul class="ev-upsell-list small">
            <li>ปลดรางวัลแถว “{def.pass.premiumName}” ครบ {def.pass.tiers.length} ขั้น รวมขั้นที่ผ่านมาแล้ว</li>
            <li>
              ชุดกู้ภัยเต็มยศ ของแต่ง {cosm.length - 1} ชิ้น และ <b>{rewardName(cosm[cosm.length - 1])}</b>
            </li>
            <li>
              คอยน์ {sum('premium', 'coins').toLocaleString('th-TH')} + บุญ {sum('premium', 'merit').toLocaleString('th-TH')} (มากกว่าแถวฟรี {Math.round(sum('premium', 'merit') / Math.max(1, sum('free', 'merit')))} เท่า)
            </li>
          </ul>
        </div>
      </div>
      <div class="ev-upsell-cosm">
        {cosm.map((r, i) => (
          <span class="ev-upsell-chip" key={i} title={rewardName(r)}>
            <RewardIcon r={r} size={26} />
          </span>
        ))}
      </div>
      <div class="ev-upsell-btns">
        {def.pass.products.map((p) => (
          <PBtn key={p.id} tone={p.bonusPoints ? 'pink' : 'gold'} class="ev-buy" disabled={busy} onClick={() => onBuy(p.id)}>
            <span class="ev-buy-in">
              <PT text={p.bonusPoints ? `${p.title}` : `ปลดล็อกแถว${def.pass.premiumName}`} size={12} weight={600} {...(p.bonusPoints ? TONE_TEXT.pink : TONE_TEXT.gold)} />
              <span class="ev-buy-price">
                <PT text={`฿${p.priceTHB}`} size={13} weight={600} {...(p.bonusPoints ? TONE_TEXT.pink : TONE_TEXT.gold)} />
              </span>
            </span>
            {p.badge && <span class="ev-buy-badge">{p.badge}</span>}
          </PBtn>
        ))}
      </div>
      <div class="small muted center">เวอร์ชันทดลอง: การซื้อเป็นการจำลอง ไม่มีการตัดเงินจริง</div>
    </div>
  )
}

export function EventPass({
  def,
  p,
  onClaim,
  onClaimAll,
  onBuy,
  busy,
  readOnly,
}: {
  def: LiveEventDef
  p: EventProgress
  onClaim: (tier: number, row: PassRow) => void
  onClaimAll: () => void
  onBuy: (productId: string) => void
  busy?: boolean
  readOnly?: boolean
}) {
  const pass = def.pass
  const tp = tierProgress(p.points, pass)
  const ready = readOnly ? [] : claimable(p, pass)
  const scroller = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<{ tier: number; row: PassRow } | null>(null)
  // Scroll so the next tier to reach sits in view.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const first = ready[0]?.tier ?? tp.tier + 1
    el.scrollLeft = Math.max(0, (first - 1) * COL - el.clientWidth / 2 + COL / 2)
  }, [])
  const tap = (t: PassTier, row: PassRow) => {
    const st = tierState(p, pass, t.tier, row)
    if (st === 'claimable' && !readOnly) onClaim(t.tier, row)
    else setSel({ tier: t.tier, row })
  }
  const selTier = sel ? pass.tiers.find((t) => t.tier === sel.tier) : null
  const selState = sel && selTier ? tierState(p, pass, sel.tier, sel.row) : null
  const lineW = Math.min(pass.tiers.length, tp.tier + (tp.maxed ? 0 : tp.pct)) * COL
  return (
    <div class="ev-pass">
      <div class="ev-pass-head panel soft">
        <span class="ev-tier-badge">
          <PT text={`${tp.tier}`} size={16} weight={600} color="#fff6dc" shadow="#16324a" />
        </span>
        <div class="grow col" style={{ gap: '2px' }}>
          <div class="row small">
            <b>ขั้น {tp.tier}/{pass.tiers.length}</b>
            <span class="grow" />
            <EvIcon name="ev_points" size={14} />
            <span class="num">{tp.maxed ? `${p.points.toLocaleString('th-TH')} แต้ม (ครบแล้ว!)` : `${tp.into}/${tp.need}`}</span>
          </div>
          <span class="ev-pbar">
            <span style={{ width: `${Math.round(tp.pct * 100)}%` }} />
          </span>
          <span class="small muted">{def.pointsName}ได้จากการออกเรือกู้ภัยและภารกิจอีเวนต์ · ขั้นละ {pass.pointsPerTier} แต้ม</span>
        </div>
      </div>

      <div class="ev-track-wrap">
        <div class="ev-rowlabels">
          <span class="ev-rowlabel free">
            <PT text={pass.freeName} size={11} weight={600} scale={1} {...TONE_TEXT.ink} />
            <span class="small muted">ฟรี</span>
          </span>
          <span class="ev-rowlabel premium">
            <EvIcon name="ev_crown" size={16} />
            <PT text={pass.premiumName} size={14} weight={600} scale={1} {...TONE_TEXT.wood} />
            {!p.premium && <Icon name="lock" size={12} />}
          </span>
        </div>
        <div class="ev-track" ref={scroller}>
          <div class="ev-track-inner" style={{ width: `${pass.tiers.length * COL + 8}px` }}>
            <span class="ev-line">
              <span style={{ width: `${lineW}px` }} />
            </span>
            {pass.tiers.map((t) => {
              const reached = t.tier <= tp.tier
              return (
                <div class={`ev-col ${reached ? 'reached' : ''} ${t.tier === tp.tier + 1 ? 'next' : ''}`} key={t.tier} style={{ width: `${COL}px` }}>
                  <RewardCard rewards={t.free} state={tierState(p, pass, t.tier, 'free')} row="free" big={t.big && t.free.some((r) => r.kind === 'outfit' || r.kind === 'pet')} onTap={() => tap(t, 'free')} />
                  <span class={`ev-node ${reached ? 'on' : ''} ${t.tier === pass.tiers.length ? 'final' : ''}`}>
                    <PT text={`${t.tier}`} size={12} weight={600} scale={1} color={reached ? '#5a3410' : '#fff1d6'} />
                  </span>
                  <RewardCard rewards={t.premium} state={tierState(p, pass, t.tier, 'premium')} row="premium" big={t.big && t.premium.some((r) => r.kind === 'outfit' || r.kind === 'pet')} onTap={() => tap(t, 'premium')} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div class="ev-pass-foot">
        {selTier && sel ? (
          <div class="ev-detail small">
            <b>ขั้น {sel.tier}</b> · {(sel.row === 'free' ? selTier.free : selTier.premium).map((r) => rewardName(r) + (r.kind === 'outfit' || r.kind === 'pet' ? '' : ` ${rewardAmount(r)}`)).join(' + ')}
            <span class="muted">
              {' '}
              ·{' '}
              {selState === 'claimed'
                ? 'รับแล้ว'
                : selState === 'locked'
                  ? `ต้องการอีก ${(sel.tier * pass.pointsPerTier - p.points).toLocaleString('th-TH')} แต้ม`
                  : selState === 'premium_locked'
                    ? `ต้องมีบัตรผ่าน${pass.premiumName}`
                    : 'กดรับได้เลย'}
            </span>
          </div>
        ) : (
          <div class="ev-detail small muted">แตะการ์ดเพื่อดูรางวัล · ขั้นสุดท้าย: {rewardName(pass.tiers[pass.tiers.length - 1].free[0])} / {rewardName(pass.tiers[pass.tiers.length - 1].premium[0])}</div>
        )}
        {!readOnly && ready.length > 0 && (
          <PBtn tone="green" size="small" icon="gift" onClick={onClaimAll} class="ev-pulse">
            {`รับทั้งหมด (${ready.length})`}
          </PBtn>
        )}
      </div>

      {!p.premium && !readOnly && <Upsell def={def} onBuy={onBuy} busy={!!busy} />}
      {p.premium && (
        <div class="panel soft ev-premium-on small">
          <EvIcon name="ev_crown" size={20} /> คุณมีบัตรผ่าน{pass.premiumName}แล้ว ขอบคุณที่ร่วมเป็นฮีโร่กู้ภัย!
        </div>
      )}
    </div>
  )
}
