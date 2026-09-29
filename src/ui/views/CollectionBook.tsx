// สมุดสะสม – the collection book: one page per series, silhouettes for
// items you still need, rarity counts, "ใหม่!" badges and a coin prize for
// completing each set.

import './collection.css'
import '../stall/stall.css'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { COLLECTIBLE_BY_ID, RARITIES, RARITY_INFO } from '../../game/data/collectibles'
import type { CollectibleDef } from '../../game/data/collectibleTypes'
import { claimSetReward, collectionStats, inSeason, markSeen, seriesProgress, SEASON_NAMES, rotationCountdown } from '../../game/collectibles'
import { PLACE_BY_ID, REGION_BY_ID } from '../../game/data/places'
import { S_BANGKOK, S_CENTRAL, S_ISAN, S_NORTH, S_SOUTH } from '../../game/data/collectibles/regions'
import { shopFor } from '../../game/data/placeShops'
import { MONTH_TH } from '../../game/time'
import { collectibleUrl, motifUrl } from '../../art/collectibles'
import { openPanel } from '../store'
import { PBtn, Window } from '../components/kit'
import { Bar, Coin, Icon } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { PT, TONE_TEXT } from '../pixeltext'
import { KIND_NAME } from '../stall/StallView'
import { sfx } from '../../engine/audio'

const REGION_OF_SERIES: Record<string, string> = {
  [S_BANGKOK]: REGION_BY_ID.bangkok.name,
  [S_CENTRAL]: 'ภาคกลาง ตะวันออก และตะวันตก',
  [S_NORTH]: REGION_BY_ID.north.name,
  [S_ISAN]: REGION_BY_ID.northeast.name,
  [S_SOUTH]: REGION_BY_ID.south.name,
}

function foundDate(day?: string) {
  if (!day) return ''
  const [y, m, d] = day.split('-').map(Number)
  return `${d} ${MONTH_TH[(m || 1) - 1]} ${y + 543}`
}

/** Where a collectible can be found (for the book). */
export function whereToFind(c: CollectibleDef): string[] {
  const out: string[] = []
  if (c.hint) out.push(c.hint)
  if (c.shop) out.push(`มีขายประจำที่${shopFor(c.shop).name}`)
  else if (c.place && PLACE_BY_ID[c.place]) out.push(`ของขึ้นชื่อ มีขายทุกวันที่ร้านใน${PLACE_BY_ID[c.place].name}`)
  else if (c.source === 'reward') out.push(c.hint ? '' : 'ได้จากภารกิจและกิจกรรมพิเศษ')
  else if (REGION_OF_SERIES[c.series]) out.push(`สุ่มขายตามร้านค้า${REGION_OF_SERIES[c.series]}`)
  else out.push('สุ่มขายตามร้านค้าทั่วไทย เปลี่ยนของทุกวัน')
  if (c.season && c.season !== 'always') out.push(inSeason(c) ? `ช่วง${SEASON_NAMES[c.season]} ตอนนี้มีขายแล้ว!` : `มีขายเฉพาะช่วง${SEASON_NAMES[c.season]}`)
  if (c.tradeable !== false) out.push('หรือหาซื้อจากผู้เล่นในตลาดนัดสายบุญ')
  return out.filter(Boolean)
}

export function CollectionBook() {
  const s = game.value
  const prog = seriesProgress(s)
  const stats = collectionStats(s)
  const firstNew = prog.find((p) => p.fresh > 0)?.series.id
  const [sid, setSid] = useState<string>(firstNew ?? prog[0]?.series.id ?? '')
  const [dir, setDir] = useState(1)
  const [pick, setPick] = useState<string | null>(null)
  const [party, setParty] = useState(0)
  const page = prog.find((p) => p.series.id === sid) ?? prog[0]
  const idx = prog.indexOf(page)
  const close = () => openPanel(null)

  const go = (i: number) => {
    const p = prog[(i + prog.length) % prog.length]
    if (!p || p.series.id === sid) return
    setDir(i > idx ? 1 : -1)
    setSid(p.series.id)
    setPick(null)
    sfx.whoosh()
  }

  const claim = () => {
    const coins = claimSetReward(page.series.id)
    if (coins) {
      sfx.levelUp()
      setParty((n) => n + 1)
    }
  }

  // Opening an item clears its "ใหม่!" badge.
  useEffect(() => {
    if (pick) markSeen([pick])
  }, [pick])

  const sel = pick ? COLLECTIBLE_BY_ID[pick] : null
  return (
    <Window title="สมุดสะสม" icon="book" tone="gold" onClose={close} wide class="cbook-win">
      {party > 0 && <FxCanvas key={party} mode="confetti" />}
      <div class="cbook-head panel soft">
        <div class="cbook-sum">
          <PT text={`สะสมแล้ว ${stats.owned}/${stats.total}`} size={12} weight={600} {...TONE_TEXT.ink} />
          <span class="grow" />
          <span class="cbook-timer">ร้านเปลี่ยนของใน {rotationCountdown()}</span>
        </div>
        <Bar value={stats.owned} max={stats.total} tone="green" label="ความคืบหน้าสมุดสะสม" />
        <div class="cbook-rar">
          {RARITIES.map((r) => (
            <span key={r} class="cbook-rar-chip" style={{ background: RARITY_INFO[r].color, color: RARITY_INFO[r].dark }} title={RARITY_INFO[r].name}>
              {'★'.repeat(RARITY_INFO[r].stars)} {stats.byRarity[r].owned}/{stats.byRarity[r].total}
            </span>
          ))}
        </div>
      </div>
      <div class="cbook-tabs" role="tablist">
        {prog.map((p, i) => (
          <button key={p.series.id} role="tab" aria-selected={p.series.id === sid} aria-label={p.series.id} class={`cbook-tab ${p.series.id === sid ? 'on' : ''} ${p.complete ? 'done' : ''}`} style={{ ['--sc' as string]: p.series.color }} onClick={() => go(i)}>
            <img class="px" src={motifUrl(p.series.motif, [p.series.color, '#ffd54f', '#fffaf0'], 2)} alt="" width={32} height={32} />
            <span class="cbook-tab-n num">
              {p.owned}/{p.total}
            </span>
            {p.fresh > 0 && <span class="cbook-dot">ใหม่</span>}
            {p.complete && <span class="cbook-check">✓</span>}
          </button>
        ))}
      </div>
      {page && (
        <div class={`cbook-page ${dir > 0 ? 'next' : 'prev'}`} key={page.series.id} style={{ ['--sc' as string]: page.series.color }}>
          <div class="cbook-page-head">
            <button class="btn paper small icon-btn" onClick={() => go(idx - 1)} aria-label="ชุดก่อนหน้า">
              <PT text="‹" size={14} weight={600} {...TONE_TEXT.paper} />
            </button>
            <div class="grow center">
              <PT text={page.series.id} size={14} weight={600} {...TONE_TEXT.ink} />
              {page.series.blurb && <div class="small muted">{page.series.blurb}</div>}
            </div>
            <button class="btn paper small icon-btn" onClick={() => go(idx + 1)} aria-label="ชุดถัดไป">
              <PT text="›" size={14} weight={600} {...TONE_TEXT.paper} />
            </button>
          </div>
          <div class="cbook-grid">
            {page.series.items.map((c, i) => {
              const n = s.collection.owned[c.id] ?? 0
              const fresh = s.collection.fresh.includes(c.id)
              const r = RARITY_INFO[c.rarity]
              return (
                <button key={c.id} class={`cbook-item ${n ? 'have' : 'miss'} ${c.rarity}`} style={{ ['--rar' as string]: r.color, animationDelay: `${i * 25}ms` }} onClick={() => (sfx.tap(), setPick(c.id))} aria-label={n ? c.name : `ยังไม่มี (${r.name})`}>
                  <img class="px" src={collectibleUrl(c, 2, !n)} alt="" width={52} height={52} draggable={false} />
                  {!n && <span class="cbook-q">?</span>}
                  {n > 1 && <span class="cbook-count num">×{n}</span>}
                  {fresh && <span class="cbook-new">ใหม่!</span>}
                  <span class="cbook-stars">{'★'.repeat(r.stars)}</span>
                </button>
              )
            })}
          </div>
          <div class={`cbook-reward panel ${page.complete ? 'gold' : ''}`}>
            <Icon name={page.claimed ? 'check' : 'gift'} size={24} />
            <div class="grow">
              <b class="small">{page.claimed ? 'รับรางวัลชุดนี้แล้ว เก่งมาก!' : page.complete ? 'สะสมครบชุดแล้ว! รับรางวัลเลย' : `สะสมครบ ${page.total} ชิ้น รับรางวัล`}</b>
              <Bar value={page.owned} max={page.total} tone={page.complete ? 'green' : 'pink'} label="ความคืบหน้าชุด" />
            </div>
            {page.complete && !page.claimed ? (
              <PBtn tone="gold" size="small" onClick={claim} silent>
                <Coin n={page.series.reward} size={14} />
              </PBtn>
            ) : (
              <span class={`chip ${page.claimed ? 'green' : 'gold'} small`}>
                <Coin n={page.series.reward} size={12} />
              </span>
            )}
          </div>
        </div>
      )}
      {sel && <ItemSheet c={sel} onClose={() => setPick(null)} />}
    </Window>
  )
}

function ItemSheet({ c, onClose }: { c: CollectibleDef; onClose: () => void }) {
  const s = game.value
  const n = s.collection.owned[c.id] ?? 0
  const r = RARITY_INFO[c.rarity]
  const url = collectibleUrl(c, 5, !n)
  const foil = !!n && (c.rarity === 'epic' || c.rarity === 'legendary')
  const where = useMemo(() => whereToFind(c), [c.id])
  return (
    <div class="cbook-sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class={`panel cbook-sheet ${foil ? 'foil' : ''}`} style={{ ['--rar' as string]: r.color }}>
        <button class="btn red icon-btn small cbook-sheet-x" onClick={() => (sfx.close(), onClose())} aria-label="ปิด">
          <Icon name="close" size={14} />
        </button>
        <div class="cbook-sheet-art" style={{ ['--art' as string]: `url(${url})` }}>
          <img class="px" src={url} alt="" draggable={false} />
          {foil && <span class="stall-foil" />}
        </div>
        <b class="cbook-sheet-name">{n ? c.name : '??? ยังไม่ได้สะสม'}</b>
        <div class="row" style={{ justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <span class="cbook-rar-chip" style={{ background: r.color, color: r.dark }}>
            {'★'.repeat(r.stars)} {r.name}
          </span>
          <span class="small muted">{KIND_NAME[c.kind]}</span>
          {c.season && c.season !== 'always' && <span class="small cbook-season">{SEASON_NAMES[c.season]}</span>}
        </div>
        {n ? <p class="small cbook-desc">{c.desc}</p> : <p class="small muted cbook-desc">รูปเงา ๆ นี่คืออะไรนะ… ลองตามหาดูสิ</p>}
        {n > 0 && (
          <div class="small cbook-meta">
            มีอยู่ ×{n} · ได้มาครั้งแรก {foundDate(s.collection.found[c.id])} · ราคาประมาณ <Coin n={c.value} size={12} />
          </div>
        )}
        <ul class="cbook-where small">
          {where.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        {c.tradeable !== false && (
          <PBtn tone="wood" size="small" icon="market" onClick={() => openPanel('market')}>
            {n ? 'ขายในตลาดนัด' : 'หาในตลาดนัด'}
          </PBtn>
        )}
      </div>
    </div>
  )
}
