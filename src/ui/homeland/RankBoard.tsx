// กระดานอันดับวัด – each region's temple ladder (C → SS) with tier badges,
// lock requirements with progress, rewards preview and the player's progress.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { PLACE_BY_ID, REGION_BY_ID, type Region } from '../../game/data/places'
import { BOARD_TITLE, ranksOf, TEMPLE_DONE_KINDS, TIER_BY_ID, TIERS, type RankEntry, type TierId } from '../../game/data/ranks'
import { PROVINCE_REGIONS } from '../../game/data/provinces'
import { RANK_QUEST_BY_ID } from '../../game/data/npcQuests/ranks'
import { RANK_COLLECTIBLE_BY_ID } from '../../game/data/collectibles/ranks'
import { PLACE_SHOPS } from '../../game/data/placeShops'
import { FURNITURE_BY_ID } from '../../game/data/furniture'
import { canClaimRank, homeRegion, placeAccess, rankReward, regionProgress, templeDone, templeKinds, type RankReq } from '../../game/homeland'
import { claimRank } from '../../game/homelandActions'
import { spriteDataUrl } from '../../engine/sprite'
import { tierBadge, homePin } from '../../art/ranks'
import { furnitureThumb } from '../../art/furniture'
import { placeIcon } from '../../scenes/thaimap'
import { PBtn, Window } from '../components/kit'
import { Bar, Coin, Icon, Merit } from '../components/common'
import { PT, TONE_TEXT } from '../pixeltext'
import { sfx } from '../../engine/audio'
import './homeland.css'

export function TierBadge({ tier, locked, size = 28 }: { tier: TierId; locked?: boolean; size?: number }) {
  const sp = tierBadge(tier, locked)
  return <img class="px hl-mini" src={spriteDataUrl(sp, 2)} alt={`แรงก์ ${tier}`} title={`แรงก์ ${tier} · ${TIER_BY_ID[tier].name}`} width={size} height={Math.round((size * sp.h) / sp.w)} />
}

const REQ_ICON: Record<RankReq['kind'], string> = { level: 'exp', stars: 'star', lower: 'temple', quest: 'scroll' }

function ReqRow({ r }: { r: RankReq }) {
  return (
    <div class={`hl-rq ${r.met ? 'met' : ''}`}>
      <Icon name={r.met ? 'check' : REQ_ICON[r.kind]} size={14} />
      <span>{r.text}</span>
      <span class="num">
        {r.kind === 'quest' ? (r.met ? 'สำเร็จ' : 'ยังไม่ผ่าน') : `${Math.min(r.have, r.need)}/${r.need}`}
      </span>
      {r.kind !== 'quest' && !r.met && <Bar value={r.have} max={r.need} tone="pink" />}
    </div>
  )
}

function Rewards({ e }: { e: RankEntry }) {
  const r = rankReward(e)
  return (
    <div class="hl-rewards">
      <span class="muted">รางวัล</span>
      <span class="chip gold small">
        <Coin n={r.coins} size={12} />
      </span>
      <span class="chip small">
        <Merit n={r.merit} size={12} />
      </span>
      {r.furniture.map((f) =>
        FURNITURE_BY_ID[f] ? <img key={f} class="px hl-furn" src={spriteDataUrl(furnitureThumb(f), 1)} alt={FURNITURE_BY_ID[f].name} title={FURNITURE_BY_ID[f].name} width={28} height={28} /> : null,
      )}
      {r.collectibles.map((c) => {
        const def = RANK_COLLECTIBLE_BY_ID[c]
        if (!def) return null
        return (
          <span key={c} class={`hl-col ${def.rarity}`}>
            ★ {def.name} ({def.rarity === 'legendary' ? 'ตำนาน' : 'หายาก'})
          </span>
        )
      })}
    </div>
  )
}

function TempleRow({ e, onGo }: { e: RankEntry; onGo: (placeId: string) => void }) {
  const s = game.value
  const p = PLACE_BY_ID[e.place]
  const acc = placeAccess(s, e.place)
  const done = templeDone(s, e.place)
  const claim = canClaimRank(s, e.place)
  const kinds = templeKinds(s, e.place).length
  const visited = s.places.visited.includes(e.place)
  const q = e.quest ? RANK_QUEST_BY_ID[e.quest] : null
  const giverShop = q ? (PLACE_SHOPS as Record<string, { place?: string }>)[q.giver.replace('shop:', '')] : null
  const giverPlace = giverShop?.place ? PLACE_BY_ID[giverShop.place] : null
  const [open, setOpen] = useState(false)
  const cls = claim ? 'claim' : done ? 'done' : acc.open ? '' : 'locked'
  return (
    <div class={`panel hl-temple ${cls}`}>
      <div class="hl-temple-top">
        <TierBadge tier={e.tier} locked={!acc.open} />
        <img class="px hl-temple-icon" src={spriteDataUrl(placeIcon(e.place, !acc.open), 2)} alt="" width={48} height={52} />
        <div class="col grow" style={{ gap: '1px', minWidth: 0 }}>
          <b class="hl-temple-name">{p.name}</b>
          <span class="muted hl-temple-blurb">{e.blurb}</span>
          {done ? (
            <span class="hl-state ok">{claim ? 'ทำบุญครบแล้ว! กดรับรางวัลเลย' : '✓ ทำบุญครบ รับรางวัลแล้ว'}</span>
          ) : acc.open ? (
            <span class="hl-state">
              {visited ? `ทำบุญแล้ว ${kinds}/${TEMPLE_DONE_KINDS} แบบ` : 'เปิดแล้ว ไปเยือนกันเลย'}
            </span>
          ) : (
            <span class="hl-state lock">
              <Icon name="lock" size={12} /> {acc.rankLocked ? 'ยังไม่ถึงแรงก์' : `ต้องการดาว ${acc.starsNeed} ดวง`}
            </span>
          )}
        </div>
      </div>
      {!done && acc.open && visited && <Bar value={kinds} max={TEMPLE_DONE_KINDS} tone="green" />}
      {(!acc.open || open) && acc.reqs.length > 0 && (
        <div class="col" style={{ gap: '1px' }}>
          {acc.reqs.map((r) => (
            <ReqRow key={r.kind} r={r} />
          ))}
        </div>
      )}
      {q && !done && (
        <div class="hl-quest">
          <Icon name="scroll" size={12} /> <b>{q.title}</b> · รับจาก{q.npcName}
          {giverPlace ? ` ที่${giverPlace.name}` : ''}
        </div>
      )}
      <Rewards e={e} />
      <div class="hl-actions">
        {acc.open && acc.reqs.length > 0 && !done && (
          <PBtn tone="paper" size="small" onClick={() => setOpen(!open)}>
            {open ? 'ซ่อนเงื่อนไข' : 'ดูเงื่อนไข'}
          </PBtn>
        )}
        {claim ? (
          <PBtn
            tone="gold"
            size="small"
            icon="gift"
            onClick={() => {
              if (claimRank(e.place)) sfx.levelUp()
            }}
          >
            รับรางวัลแรงก์
          </PBtn>
        ) : (
          <PBtn tone={acc.open ? 'green' : 'wood'} size="small" icon="map" onClick={() => onGo(e.place)}>
            {acc.open ? 'ไปวัดนี้' : 'ดูบนแผนที่'}
          </PBtn>
        )}
      </div>
    </div>
  )
}

export function RankBoard({ region: start, onClose, onGo }: { region: Region; onClose: () => void; onGo: (placeId: string) => void }) {
  const [region, setRegion] = useState<Region>(start)
  const s = game.value
  const prog = regionProgress(s, region)
  const home = homeRegion(s)
  const byTier = [...TIERS].reverse().map((t) => ({ t, list: ranksOf(region).filter((e) => e.tier === t.id) }))
  return (
    <Window title={BOARD_TITLE[region]} icon="star" tone="gold" onClose={onClose} full class="hl-board">
      <div class="hl-regions hl-board-regions" role="tablist" aria-label="เลือกภาค">
        {PROVINCE_REGIONS.map((r) => {
          const pr = regionProgress(s, r)
          const def = REGION_BY_ID[r]
          return (
            <button
              key={r}
              role="tab"
              aria-selected={region === r}
              class={`hl-region ${region === r ? 'on' : ''}`}
              style={{ ['--hl-c' as string]: def.color }}
              onClick={() => (sfx.tap(), setRegion(r))}
            >
              {pr.best ? <TierBadge tier={pr.best} size={20} /> : <span class="hl-dot" />}
              <span class="hl-region-name">{def.name.replace('ภาค', '')}</span>
              {pr.claimable > 0 && <span class="badge num hl-ready">{pr.claimable}</span>}
              {home === r && <img class="px hl-region-pin" src={spriteDataUrl(homePin(), 2)} alt="บ้านเกิด" width={9} height={11} />}
            </button>
          )
        })}
      </div>
      <div class="panel gold hl-progress">
        {prog.best ? <TierBadge tier={prog.best} size={34} /> : <Icon name="temple" size={30} />}
        <div class="col grow" style={{ gap: '2px' }}>
          <b class="hl-progress-title">ความคืบหน้าของคุณ</b>
          <Bar value={prog.done} max={prog.total} tone="green" />
          <span class="small">
            ทำบุญครบ {prog.done}/{prog.total} วัด
            {prog.best ? ` · แรงก์สูงสุด ${prog.best}` : ''}
            {home === region ? ' · ภาคบ้านเกิด บุญ +10%' : ''}
          </span>
          {prog.next && <span class="small muted">ต่อไป: {PLACE_BY_ID[prog.next.place].name} (แรงก์ {prog.next.tier})</span>}
        </div>
      </div>
      <div class="hl-ladder scroll">
        {byTier.map(({ t, list }) =>
          list.length ? (
            <div key={t.id} class="col" style={{ gap: '4px' }}>
              <div class="hl-tier-head">
                <TierBadge tier={t.id} size={22} />
                <PT text={`${t.id} · ${t.name}`} size={12} weight={600} {...TONE_TEXT.ink} />
              </div>
              {list.map((e) => (
                <TempleRow key={e.place} e={e} onGo={onGo} />
              ))}
            </div>
          ) : null,
        )}
        <div class="hl-legend">
          {TIERS.map((t) => (
            <span key={t.id}>
              <TierBadge tier={t.id} size={16} /> Lv.{t.level}
              {t.stars ? ` · ${t.stars}★` : ''}
              {t.quest ? ' · ภารกิจ' : ''}
            </span>
          ))}
        </div>
        <p class="small muted" style={{ textAlign: 'center', margin: '2px 0 6px' }}>
          ทำบุญ {TEMPLE_DONE_KINDS} แบบที่วัดเดียวกัน (ตักบาตร สวดมนต์ ขอพร ตีระฆัง …) = ทำบุญครบวัดนั้น
        </p>
      </div>
    </Window>
  )
}
