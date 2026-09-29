// เลือกจังหวัดบ้านเกิด – region grid + search over all 77 provinces, a fact
// card for the highlighted one, and the perks of choosing it.

import { useMemo, useState } from 'preact/hooks'
import { game } from '../../game/state'
import { PROVINCE_BY_ID, PROVINCE_REGIONS, provincesOf, searchProvinces, type Province } from '../../game/data/provinces'
import { REGION_BY_ID, type Region } from '../../game/data/places'
import { REGION_ROOM, ROOM_BY_ID } from '../../game/data/rooms'
import { HOME_BONUS, moveCost } from '../../game/homeland'
import { setProvince } from '../../game/homelandActions'
import { spriteDataUrl } from '../../engine/sprite'
import { homePin } from '../../art/ranks'
import { PBtn, Window } from '../components/kit'
import { Coin, Icon } from '../components/common'
import { PT, TONE_TEXT } from '../pixeltext'
import { sfx } from '../../engine/audio'
import './homeland.css'

const pinUrl = () => spriteDataUrl(homePin(), 2)

/** 'เชียงใหม่ · ภาคเหนือ · ของดี: ข้าวซอย' card with the home perks. */
export function ProvinceCard({ p, compact }: { p: Province; compact?: boolean }) {
  const region = REGION_BY_ID[p.region]
  const room = ROOM_BY_ID[REGION_ROOM[p.region]]
  return (
    <div class="hl-fact" style={{ ['--hl-c' as string]: region.color }}>
      <img class="px hl-fact-pin" src={pinUrl()} alt="" width={18} height={22} />
      <div class="col grow" style={{ gap: '1px', minWidth: 0 }}>
        <PT text={p.name} size={14} weight={600} {...TONE_TEXT.ink} />
        <span class="small">
          <b>{region.name}</b> · ของดี: {p.good}
        </span>
        {!compact && <span class="small muted">ที่เที่ยว: {p.sight}</span>}
        {!compact && (
          <span class="row wrap hl-fact-perks">
            <span class="chip green small">บุญ +{Math.round((HOME_BONUS - 1) * 100)}% ที่วัด{region.name === 'กรุงเทพฯ' ? 'ในกรุงเทพฯ' : region.name}</span>
            <span class="chip gold small">ห้องฟรี: {room.short}</span>
          </span>
        )}
      </div>
    </div>
  )
}

export function ProvincePicker({ onClose, onDone, title = 'เลือกจังหวัดบ้านเกิด' }: { onClose: () => void; onDone?: (id: string) => void; title?: string }) {
  const cur = game.value.homeland.province
  const [sel, setSel] = useState<string | null>(cur)
  const [region, setRegion] = useState<Region>(cur ? PROVINCE_BY_ID[cur].region : 'bangkok')
  const [q, setQ] = useState('')
  const list = useMemo(() => (q.trim() ? searchProvinces(q) : provincesOf(region)), [q, region])
  const p = sel ? PROVINCE_BY_ID[sel] : null
  const cost = sel ? moveCost(game.value, sel) : 0
  const confirm = () => {
    if (!sel) return
    if (sel === cur) return onClose()
    if (!setProvince(sel)) {
      sfx.error()
      return
    }
    sfx.levelUp()
    onDone?.(sel)
    onClose()
  }
  return (
    <Window
      title={title}
      icon="home"
      onClose={onClose}
      class="hl-picker"
      footer={
        <PBtn tone={sel ? 'green' : 'paper'} block icon="check" disabled={!sel} onClick={confirm}>
          {!sel ? 'แตะเลือกจังหวัดก่อนนะ' : sel === cur ? 'บ้านเกิดของฉัน' : cost > 0 ? `ย้ายทะเบียนบ้าน ${cost} คอยน์` : 'นี่แหละบ้านเกิดฉัน!'}
        </PBtn>
      }
    >
      {p ? (
        <ProvinceCard p={p} />
      ) : (
        <div class="hl-fact hl-fact-empty small">
          <Icon name="map" size={22} /> แตะจังหวัดที่เป็นบ้านเกิด (หรือบ้านในใจ) ของคุณ ได้บุญเพิ่มที่วัดในภาคนั้น และได้ห้องสไตล์ภาคฟรี!
        </div>
      )}
      <label class="hl-search">
        <input
          class="pinput"
          value={q}
          placeholder="ค้นหา เช่น เชียงใหม่ ข้าวซอย ทะเล"
          aria-label="ค้นหาจังหวัด"
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
        />
        {q && (
          <button class="hl-search-x" aria-label="ล้างคำค้น" onClick={() => setQ('')}>
            <Icon name="close" size={12} />
          </button>
        )}
      </label>
      {!q.trim() && (
        <div class="hl-regions" role="tablist" aria-label="เลือกภาค">
          {PROVINCE_REGIONS.map((r) => {
            const def = REGION_BY_ID[r]
            const mine = cur && PROVINCE_BY_ID[cur].region === r
            return (
              <button
                key={r}
                role="tab"
                aria-selected={region === r}
                class={`hl-region ${region === r ? 'on' : ''}`}
                style={{ ['--hl-c' as string]: def.color }}
                onClick={() => (sfx.tap(), setRegion(r))}
              >
                <span class="hl-dot" />
                <span class="hl-region-name">{def.name}</span>
                <span class="hl-region-n num">{provincesOf(r).length}</span>
                {mine && <img class="px hl-region-pin" src={pinUrl()} alt="บ้านเกิด" width={9} height={11} />}
              </button>
            )
          })}
        </div>
      )}
      <div class="hl-provs">
        {list.map((pr) => (
          <button
            key={pr.id}
            class={`hl-prov ${sel === pr.id ? 'on' : ''} ${cur === pr.id ? 'home' : ''}`}
            style={{ ['--hl-c' as string]: REGION_BY_ID[pr.region].color }}
            aria-pressed={sel === pr.id}
            onClick={() => (sfx.tap(), setSel(pr.id))}
          >
            <span class="hl-prov-name">{pr.name}</span>
            <span class="hl-prov-good">{q.trim() ? `${REGION_BY_ID[pr.region].name} · ` : ''}{pr.good}</span>
            {cur === pr.id && <img class="px hl-prov-pin" src={pinUrl()} alt="" width={9} height={11} />}
          </button>
        ))}
        {list.length === 0 && <p class="small muted hl-empty">ไม่เจอจังหวัดนี้เลย ลองพิมพ์ชื่ออื่นดูนะ</p>}
      </div>
      {cur && cost > 0 && sel !== cur && (
        <p class="small muted hl-note">
          ย้ายบ้านเกิดได้เสมอ ครั้งละ <Coin n={cost} size={12} /> · ห้องสไตล์ภาคเดิมจะรอคุณกลับมา
        </p>
      )}
    </Window>
  )
}

/** Compact field for forms: current province (or a prompt) + change button. */
export function ProvinceField({ onOpen }: { onOpen: () => void }) {
  const id = game.value.homeland.province
  const p = id ? PROVINCE_BY_ID[id] : null
  return (
    <div class="field hl-field">
      <PT text="จังหวัดบ้านเกิด" size={12} {...TONE_TEXT.ink} />
      {p ? (
        <button class="hl-field-btn" onClick={() => (sfx.open(), onOpen())} aria-label={`บ้านเกิด ${p.name} แตะเพื่อเปลี่ยน`}>
          <ProvinceCard p={p} compact />
          <Icon name="edit" size={16} />
        </button>
      ) : (
        <PBtn tone="wood" size="small" icon="map" onClick={() => (sfx.open(), onOpen())}>
          เลือกจังหวัด (ได้ห้องฟรี!)
        </PBtn>
      )}
    </div>
  )
}

/** Tiny province tag for name plates. */
export function HomeTag() {
  const id = game.value.homeland?.province
  const p = id ? PROVINCE_BY_ID[id] : null
  if (!p) return null
  return (
    <span class="hl-htag" title={`บ้านเกิด ${p.name}`}>
      <img class="px" src={pinUrl()} alt="" width={7} height={9} />
      {p.name}
    </span>
  )
}
