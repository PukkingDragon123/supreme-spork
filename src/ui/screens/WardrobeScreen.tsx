// แต่งตัว – dress your character. Try items on before buying them.

import { useState } from 'preact/hooks'
import { game, level } from '../../game/state'
import { OUTFITS, OUTFIT_BY_ID, type OutfitItem, type Slot } from '../../game/data/outfits'
import { HAIR_COLORS, SKIN_TONES, DAY_COLORS } from '../../art/palette'
import { buyHairColor, buyOutfit, equip, ownsOutfit, setLook, luckyColorActive, setCompanion, dogState } from '../../game/actions'
import { DOGS, MAX_HEARTS } from '../../game/data/dogs'
import type { AvatarLook, View } from '../../art/avatar'
import { AvatarImg, Btn, Coin, Hearts, Icon } from '../components/common'
import { toast } from '../../game/events'
import { sfx } from '../../engine/audio'
import { openActivity, tab } from '../store'

type Tab = Slot | 'hairColor' | 'skin' | 'pet'

const TABS: { id: Tab; label: string }[] = [
  { id: 'top', label: 'เสื้อ' },
  { id: 'bottom', label: 'ท่อนล่าง' },
  { id: 'hair', label: 'ทรงผม' },
  { id: 'hairColor', label: 'สีผม' },
  { id: 'head', label: 'ศีรษะ' },
  { id: 'neck', label: 'คอ' },
  { id: 'hand', label: 'ถือของ' },
  { id: 'skin', label: 'สีผิว' },
  { id: 'pet', label: 'เพื่อนซี้' },
]

function applyItem(look: AvatarLook, o: OutfitItem | null, slot: Slot): AvatarLook {
  const l = { ...look }
  if (slot === 'hair' && o) l.hair = o.id
  else if (slot === 'top' && o) l.top = o.id
  else if (slot === 'bottom' && o) l.bottom = o.id
  else if (slot === 'head') l.head = o?.id ?? null
  else if (slot === 'neck') l.neck = o?.id ?? null
  else if (slot === 'hand') l.hand = o?.id ?? null
  return l
}

export function WardrobeScreen() {
  const s = game.value
  const lv = level.value.level
  const [t, setT] = useState<Tab>('top')
  const [view, setView] = useState<View>('front')
  const [trying, setTrying] = useState<OutfitItem | null>(null)
  const look = s.player.look
  const preview = trying ? applyItem(look, trying, trying.slot) : look
  const today = DAY_COLORS[new Date().getDay()]
  const lucky = luckyColorActive(s)

  const pick = (o: OutfitItem | null, slot: Slot) => {
    sfx.tap()
    if (!o) {
      equip(slot, null)
      setTrying(null)
      return
    }
    if (ownsOutfit(o.id)) {
      equip(slot, o.id)
      setTrying(null)
    } else setTrying(o)
  }

  const buy = () => {
    if (!trying) return
    if (buyOutfit(trying.id)) {
      equip(trying.slot, trying.id)
      sfx.purchase()
      toast(`ได้${trying.name}แล้ว น่ารักมาก!`, 'shirt')
      setTrying(null)
    }
  }

  const slotItems = (slot: Slot) => OUTFITS.filter((o) => o.slot === slot && (!o.premium || ownsOutfit(o.id)))

  return (
    <div class="screen wardrobe">
      <div class="wardrobe-top">
        <button
          class="panel wardrobe-preview sparkle-bg"
          onClick={() => {
            sfx.tap()
            setView(view === 'front' ? 'side' : view === 'side' ? 'back' : 'front')
          }}
          aria-label="หมุนตัวละคร"
        >
          <AvatarImg look={preview} view={view} scale={5} />
        </button>
        <div class="col grow" style={{ gap: '6px' }}>
          <div class="title">{s.player.name}</div>
          <div class={`chip ${lucky ? 'green' : ''}`} style={{ whiteSpace: 'normal' }}>
            <span class="swatch" style={{ background: today.hex }} />
            {lucky ? `ใส่สี${today.name}ประจำวัน${today.day} รับบุญ +10%` : `วัน${today.day}ใส่สี${today.name} รับบุญ +10%`}
          </div>
          {trying ? (
            <div class="panel soft try-bar">
              <div class="subtitle">{trying.name}</div>
              <div class="small muted">{trying.desc}</div>
              {(trying.level ?? 1) > lv ? (
                <span class="chip">
                  <Icon name="lock" size={14} /> ปลดล็อกที่ Lv.{trying.level}
                </span>
              ) : (
                <div class="row">
                  <Btn tone="paper" size="small" onClick={() => setTrying(null)}>
                    ยกเลิก
                  </Btn>
                  <Btn tone="green" size="small" onClick={buy}>
                    ซื้อ <Coin n={trying.price} size={14} />
                  </Btn>
                </div>
              )}
            </div>
          ) : (
            <div class="small muted">แตะตัวละครเพื่อหมุนดูรอบตัว · แตะชุดที่ยังไม่มีเพื่อลองใส่ก่อนซื้อ</div>
          )}
        </div>
      </div>

      <div class="tabs">
        {TABS.map((x) => (
          <button key={x.id} class={`tab ${t === x.id ? 'active' : ''}`} onClick={() => (sfx.tap(), setT(x.id), setTrying(null))}>
            {x.label}
          </button>
        ))}
      </div>

      {t === 'skin' && (
        <div class="grid2">
          {SKIN_TONES.map((tone, i) => (
            <button key={tone.id} class={`panel ward-item ${look.skin === i ? 'on' : ''}`} onClick={() => (sfx.tap(), setLook({ skin: i }))}>
              <AvatarImg look={{ ...look, skin: i }} scale={2} />
              <span class="small">{tone.name}</span>
            </button>
          ))}
        </div>
      )}

      {t === 'hairColor' && (
        <div class="grid3">
          {HAIR_COLORS.map((c, i) => {
            const premium = i >= 4
            const price = 30
            const ownedKey = `haircolor_${c.id}`
            const owned = !premium || s.outfits.includes(ownedKey)
            return (
              <button
                key={c.id}
                class={`panel ward-item ${look.hairColor === i ? 'on' : ''}`}
                onClick={() => {
                  sfx.tap()
                  if (owned) setLook({ hairColor: i })
                  else if (buyHairColor(ownedKey, price)) {
                    setLook({ hairColor: i })
                    sfx.purchase()
                  }
                }}
              >
                <span class="swatch big" style={{ background: c.b }} />
                <span class="small">{c.name}</span>
                {!owned && <Coin n={price} size={12} class="small" />}
              </button>
            )
          })}
        </div>
      )}

      {t === 'pet' && (
        <div class="list">
          <div class="small muted">เลี้ยงน้องหมาวัดจนสนิทครบ 5 หัวใจ น้องจะเดินตามคุณทุกที่</div>
          {DOGS.map((d) => {
            const st = dogState(d.id)
            const ready = st.hearts >= MAX_HEARTS
            return (
              <div class="panel card" key={d.id}>
                <Icon name="dog" size={36} />
                <div class="grow">
                  <div class="subtitle">
                    น้อง{d.name} <Hearts value={st.hearts} />
                  </div>
                  <div class="small muted">{d.about}</div>
                </div>
                {ready ? (
                  <Btn tone={s.companion === d.id ? 'paper' : 'green'} size="small" onClick={() => setCompanion(s.companion === d.id ? null : d.id)}>
                    {s.companion === d.id ? 'พักก่อน' : 'พาไปด้วย'}
                  </Btn>
                ) : (
                  <Btn
                    tone="paper"
                    size="small"
                    onClick={() => {
                      tab.value = 'temple'
                      openActivity('dog', { dog: d.id })
                    }}
                  >
                    ไปหาน้อง
                  </Btn>
                )}
              </div>
            )
          })}
        </div>
      )}

      {(t === 'top' || t === 'bottom' || t === 'hair' || t === 'head' || t === 'neck' || t === 'hand') && (
        <div class="grid3">
          {(t === 'head' || t === 'neck' || t === 'hand') && (
            <button class={`panel ward-item ${!look[t] ? 'on' : ''}`} onClick={() => pick(null, t)}>
              <Icon name="close" size={28} />
              <span class="small">ไม่ใส่</span>
            </button>
          )}
          {slotItems(t).map((o) => {
            const owned = ownsOutfit(o.id)
            const worn = look[t] === o.id
            const locked = (o.level ?? 1) > lv
            return (
              <button key={o.id} class={`panel ward-item ${worn ? 'on' : ''} ${trying?.id === o.id ? 'trying' : ''}`} onClick={() => pick(o, t)}>
                <AvatarImg look={applyItem(look, o, t)} scale={2} />
                <span class="small ward-name">{o.name}</span>
                {owned ? (
                  <span class="small muted">{worn ? 'ใส่อยู่' : 'มีแล้ว'}</span>
                ) : locked ? (
                  <span class="small muted">
                    <Icon name="lock" size={12} /> Lv.{o.level}
                  </span>
                ) : (
                  <Coin n={o.price} size={12} class="small" />
                )}
                {o.top?.dayColor !== undefined && <span class="swatch day" style={{ background: DAY_COLORS[o.top.dayColor].hex }} />}
              </button>
            )
          })}
        </div>
      )}
      <div class="small muted center" style={{ marginTop: '12px' }}>
        ไปวัดควรแต่งกายสุภาพ สีขาวหรือสีสุภาพเหมาะที่สุด · ชุดใหม่ปลดล็อกเพิ่มเมื่อเลเวลสูงขึ้น
      </div>
      {OUTFIT_BY_ID.top_boondee && !ownsOutfit('top_boondee') && (
        <div class="small muted center">เสื้อบุญดีลิมิเต็ดมีในแพ็กเริ่มต้นสายบุญ</div>
      )}
    </div>
  )
}
