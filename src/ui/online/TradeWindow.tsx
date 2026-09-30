// Live 1-to-1 trade window: request → both sides put things on the table
// (every change resets the handshake) → both "พร้อม" → both confirm → swap.
// See services/netTrade.ts for the rules that keep it safe.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { ITEM_BY_ID } from '../../game/data/items'
import { COLLECTIBLE_BY_ID, RARITY_INFO } from '../../game/data/collectibles'
import { collectibleUrl } from '../../art/collectibles'
import { NET_LIMITS, tradeable, type TradeLine } from '../../services/netValidate'
import { tradeActive } from '../../services/netTrade'
import { PBtn, Tabs, Window } from '../components/kit'
import { Icon } from '../components/common'
import { sfx } from '../../engine/audio'
import { findPlayer, lineName, tradeDo } from './onlineHub'
import { netSummary, trade, tradeOpen } from './onlineStore'
import { NIcon } from './netIcons'
import './online.css'

function LineIcon({ l, size = 32 }: { l: Pick<TradeLine, 'k' | 'id'>; size?: number }) {
  if (l.k === 'item') return <Icon name={ITEM_BY_ID[l.id]?.icon ?? 'gift'} size={size} />
  return <img class="px" src={collectibleUrl(l.id, 2)} alt="" width={size} height={size} />
}

function Lines({ lines, edit, empty }: { lines: TradeLine[]; edit?: (l: TradeLine) => void; empty: string }) {
  if (!lines.length) return <p class="small muted center ol-empty">{empty}</p>
  return (
    <div class="ol-lines">
      {lines.map((l) => (
        <div key={`${l.k}:${l.id}`} class="ol-lineitem">
          <LineIcon l={l} size={28} />
          <span class="grow ol-lname">
            {lineName(l)}
            {l.k === 'collectible' && COLLECTIBLE_BY_ID[l.id] && <i class={`ol-rar r-${COLLECTIBLE_BY_ID[l.id].rarity}`}>{RARITY_INFO[COLLECTIBLE_BY_ID[l.id].rarity].name}</i>}
          </span>
          <b class="num">×{l.n}</b>
          {edit && (
            <button class="ol-minus" aria-label={`เอา${lineName(l)}ออก 1 ชิ้น`} onClick={() => (sfx.tap(), edit(l))}>
              −
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

type PickTab = 'item' | 'collectible'

function Picker({ lines, onAdd }: { lines: TradeLine[]; onAdd: (k: PickTab, id: string) => void }) {
  const [tab, setTab] = useState<PickTab>('item')
  const s = game.value
  const inOffer = (k: PickTab, id: string) => lines.find((l) => l.k === k && l.id === id)?.n ?? 0
  const list: [string, number][] =
    tab === 'item'
      ? Object.entries(s.inventory).filter(([id, n]) => n > 0 && tradeable('item', id))
      : Object.entries(s.collection.owned).filter(([id, n]) => n > 0 && tradeable('collectible', id))
  return (
    <div class="ol-picker">
      <Tabs
        compact
        tabs={[
          { id: 'item', label: 'ของทำบุญ', icon: 'bag' },
          { id: 'collectible', label: 'ของสะสม', icon: 'star' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div class="ptab-body ol-pick-grid">
        {!list.length && <p class="small muted center">{tab === 'item' ? 'กระเป๋าว่าง' : 'ยังไม่มีของสะสมที่แลกได้'}</p>}
        {list.map(([id, n]) => {
          const left = n - inOffer(tab, id)
          const name = tab === 'item' ? ITEM_BY_ID[id]?.name : COLLECTIBLE_BY_ID[id]?.name
          return (
            <button key={id} class="slot ol-pick" disabled={left <= 0 || inOffer(tab, id) >= NET_LIMITS.tradeQty} onClick={() => onAdd(tab, id)} aria-label={`เพิ่ม${name ?? id}`} title={name}>
              <LineIcon l={{ k: tab, id }} size={30} />
              <span class="slot-count num">{left}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TradeWindow() {
  void netSummary.value.rev
  const t = trade.value
  const [picking, setPicking] = useState(false)
  const other = t.peer ? findPlayer(t.peer) : null
  const who = other?.name ?? 'อีกฝ่าย'
  const hide = () => (tradeOpen.value = false)
  const finish = () => {
    tradeDo({ kind: 'reset' })
    tradeOpen.value = false
  }
  const setMine = (lines: TradeLine[]) => tradeDo({ kind: 'offer', lines })
  const add = (k: PickTab, id: string) => {
    sfx.tap()
    const cur = t.mine.find((l) => l.k === k && l.id === id)
    if (!cur && t.mine.length >= NET_LIMITS.tradeLines) return
    setMine(cur ? t.mine.map((l) => (l === cur ? { ...l, n: Math.min(NET_LIMITS.tradeQty, l.n + 1) } : l)) : [...t.mine, { k, id, n: 1 }])
  }
  const minus = (l: TradeLine) => setMine(t.mine.flatMap((x) => (x === l ? (x.n > 1 ? [{ ...x, n: x.n - 1 }] : []) : [x])))

  if (t.phase === 'idle') return null

  if (t.phase === 'asking' || t.phase === 'asked') {
    const asked = t.phase === 'asked'
    return (
      <Window title="แลกของ" icon="market" tone="gold" onClose={asked ? () => tradeDo({ kind: 'decline' }) : hide} class="ol-win ol-trade-win">
        <div class="ol-ask">
          <NIcon name="trade" size={48} />
          {asked ? (
            <>
              <p>
                <b>{who}</b> ชวนคุณแลกของกัน
              </p>
              <p class="small muted">ยังไม่มีอะไรเสียไป ดูของกันก่อนได้ ของจะแลกก็ต่อเมื่อทั้งสองฝ่ายกดยืนยัน</p>
              <div class="row ol-ask-btns">
                <PBtn tone="red" onClick={() => tradeDo({ kind: 'decline' })}>
                  ไม่ดีกว่า
                </PBtn>
                <PBtn tone="green" icon="check" onClick={() => tradeDo({ kind: 'accept' })}>
                  ดูของกัน
                </PBtn>
              </div>
            </>
          ) : (
            <>
              <p>
                รอ<b>{who}</b>ตอบรับ…
              </p>
              <PBtn tone="red" onClick={() => tradeDo({ kind: 'cancel' })}>
                ยกเลิก
              </PBtn>
            </>
          )}
        </div>
      </Window>
    )
  }

  if (t.phase === 'done' || t.phase === 'closed') {
    const done = t.phase === 'done'
    return (
      <Window title={done ? 'แลกของสำเร็จ!' : 'จบการแลกของ'} icon="market" tone={done ? 'gold' : 'wood'} onClose={finish} class={`ol-win ol-trade-win ${done ? 'win-glow' : ''}`}>
        {done ? (
          <>
            <p class="center">ได้รับจาก{who}</p>
            <Lines lines={t.theirs} empty="ไม่ได้รับอะไร (ให้อย่างเดียว ใจบุญมาก!)" />
            <p class="center small muted">ให้ไป</p>
            <Lines lines={t.mine} empty="ไม่ได้ให้อะไร" />
          </>
        ) : (
          <p class="center">ไม่ได้แลกของกัน ของทุกชิ้นยังอยู่ครบ</p>
        )}
        <PBtn tone="green" block onClick={finish}>
          ตกลง
        </PBtn>
      </Window>
    )
  }

  // open / confirmed
  const confirmed = t.phase === 'confirmed'
  const both = t.myReady && t.theirReady
  const canConfirm = both && !confirmed && (t.mine.length > 0 || t.theirs.length > 0)
  return (
    <Window title="แลกของ" icon="market" tone="gold" onClose={hide} class="ol-win ol-trade-win" wide>
      <p class="ol-trade-with">
        กำลังแลกกับ <b>{who}</b> <span class="chip green small">ผู้เล่นจริง</span>
      </p>
      <div class="ol-trade">
        <section class={`ol-side ${t.myReady ? 'ready' : ''}`}>
          <header>
            <b>ของเรา</b>
            {t.myReady && <span class="chip green small">พร้อม ✓</span>}
          </header>
          <Lines lines={t.mine} edit={confirmed ? undefined : minus} empty="ยังไม่ได้ใส่ของ" />
          {!confirmed && (
            <button class="ol-link" onClick={() => (sfx.tap(), setPicking(!picking))}>
              <Icon name="plus" size={14} /> {picking ? 'ปิดกระเป๋า' : 'ใส่ของจากกระเป๋า'}
            </button>
          )}
        </section>
        <div class="ol-swap" aria-hidden="true">
          <NIcon name="trade" size={26} />
        </div>
        <section class={`ol-side theirs ${t.theirReady ? 'ready' : ''}`}>
          <header>
            <b>ของเขา</b>
            {t.theirReady && <span class="chip green small">พร้อม ✓</span>}
          </header>
          <Lines lines={t.theirs} empty="รอเขาเลือกของ…" />
        </section>
      </div>
      {picking && !confirmed && <Picker lines={t.mine} onAdd={add} />}
      <p class="small muted ol-trade-note">
        {confirmed
          ? 'ยืนยันแล้ว ของของเราพักไว้ก่อน รออีกฝ่ายยืนยัน… (ถ้ายกเลิก ของจะคืนทันที)'
          : both
            ? 'ทั้งสองฝ่ายพร้อมแล้ว กดยืนยันเพื่อแลกได้เลย'
            : 'เปลี่ยนของเมื่อไหร่ ต้องกดพร้อมใหม่ทั้งสองฝ่าย'}
      </p>
      <div class="row ol-trade-btns">
        <PBtn tone="red" size="small" onClick={() => tradeDo({ kind: 'cancel' })}>
          ยกเลิก
        </PBtn>
        {!confirmed && (
          <PBtn tone={t.myReady ? 'wood' : 'green'} onClick={() => tradeDo({ kind: 'ready', on: !t.myReady })}>
            {t.myReady ? 'ขอแก้ก่อน' : 'พร้อมแลก'}
          </PBtn>
        )}
        <PBtn tone="gold" icon="check" disabled={!canConfirm} onClick={() => tradeDo({ kind: 'confirm' })}>
          {confirmed ? 'รออีกฝ่าย…' : 'ยืนยันแลก'}
        </PBtn>
      </div>
    </Window>
  )
}

export function tradeBadge(): boolean {
  return tradeActive(trade.value) && !tradeOpen.value
}
