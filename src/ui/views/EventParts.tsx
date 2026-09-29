// Small shared pieces for the live-event screens: event icons, reward icons
// and the reward reveal popup.

import { useMemo } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { eventIconUrl, hasEventIcon } from '../../art/eventIcons'
import { ITEM_BY_ID } from '../../game/data/items'
import { rewardLabel, rewardName } from '../../game/events/rewards'
import type { EventReward } from '../../game/events/types'
import { Icon } from '../components/common'
import { PBtn } from '../components/kit'
import { FxCanvas } from '../components/FxCanvas'
import { PT, TONE_TEXT } from '../pixeltext'

export function EvIcon({ name, size = 24, class: cls }: { name: string; size?: number; class?: string }) {
  const scale = Math.max(1, Math.ceil((size * (window.devicePixelRatio || 1)) / 16))
  const url = useMemo(() => eventIconUrl(name, scale), [name, scale])
  return <img class={`px ${cls ?? ''}`} src={url} width={size} height={size} alt="" draggable={false} />
}

/** Icon for any event reward (placeholder art for cosmetics/pets lives in src/art/eventIcons.ts). */
export function RewardIcon({ r, size = 32 }: { r: EventReward; size?: number }) {
  if (r.kind === 'coins') return <Icon name={(r.n ?? 0) >= 200 ? 'coinbag' : 'coins'} size={size} />
  if (r.kind === 'merit') return <Icon name="merit" size={size} />
  if (r.kind === 'ticket') return <EvIcon name="ev_ticket" size={size} />
  if (r.kind === 'item') return <Icon name={ITEM_BY_ID[r.id ?? '']?.icon ?? 'gift'} size={size} />
  const id = r.id ?? ''
  return hasEventIcon(id) ? <EvIcon name={id} size={size} /> : <Icon name={r.kind === 'pet' ? 'paw' : 'shirt'} size={size} />
}

/** Short amount under a reward card: "+60", "x5" or nothing for cosmetics. */
export function rewardAmount(r: EventReward): string {
  if (r.kind === 'coins' || r.kind === 'merit') return `+${r.n ?? 0}`
  if (r.kind === 'ticket' || r.kind === 'item') return `x${r.n ?? 1}`
  return r.kind === 'pet' ? 'สัตว์เลี้ยง' : 'ชุด'
}

export interface Revealed {
  r: EventReward
  label: string
}

/** "ได้รับรางวัล!" popup listing what was just claimed. */
export function RewardReveal({ items, title = 'ได้รับรางวัล!', onClose, children }: { items: Revealed[]; title?: string; onClose: () => void; children?: ComponentChildren }) {
  const big = items.filter((x) => x.r.kind === 'outfit' || x.r.kind === 'pet')
  const small = items.filter((x) => x.r.kind !== 'outfit' && x.r.kind !== 'pet')
  // Merge same-kind small rewards (claim all can pay many coins at once).
  const merged = new Map<string, Revealed>()
  for (const x of small) {
    const key = `${x.r.kind}:${'id' in x.r ? x.r.id ?? '' : ''}`
    const prev = merged.get(key)
    if (prev) {
      const n = (prev.r.n ?? 0) + (x.r.n ?? 0)
      const r = { ...prev.r, n } as EventReward
      merged.set(key, { r, label: rewardLabel(r) })
    } else merged.set(key, x)
  }
  return (
    <div class="modal-backdrop celebrate" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <FxCanvas mode={big.length ? 'confetti' : 'sparkle'} />
      <div class="panel modal center ev-reveal">
        <PT text={title} size={18} weight={600} {...TONE_TEXT.ink} />
        {big.length > 0 && (
          <div class="ev-reveal-big">
            {big.map((x, i) => (
              <div class="panel gold ev-reveal-card" key={i}>
                <span class="ev-reveal-glow" />
                <RewardIcon r={x.r} size={56} />
                <b class="small">{rewardName(x.r)}</b>
                <span class="small muted">{x.label.includes('มีแล้ว') ? x.label.replace(rewardName(x.r), '').trim() : x.r.kind === 'pet' ? 'สัตว์เลี้ยงคู่ใจตัวใหม่!' : 'ใส่ได้ที่ห้องแต่งตัว'}</span>
              </div>
            ))}
          </div>
        )}
        <div class="ev-reveal-list">
          {[...merged.values()].map((x, i) => (
            <span class="chip ev-reveal-chip" key={i}>
              <RewardIcon r={x.r} size={20} />
              <span>{x.label}</span>
            </span>
          ))}
        </div>
        {children}
        <PBtn tone="green" block onClick={onClose}>
          เยี่ยมไปเลย!
        </PBtn>
      </div>
    </div>
  )
}
