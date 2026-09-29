// ร้านค้า – offerings, alms food, animal food, boosts and area unlocks.

import { game, level } from '../../game/state'
import { ITEMS, BOOSTS, type ItemCategory } from '../../game/data/items'
import { AREAS } from '../../game/data/areas'
import { SPECIAL_OFFERS, AD_REWARD_COINS } from '../../game/data/store'
import { buyPet, setPet, buyOutfit, equip, ownsOutfit, adsLeft, buyBoost, buyItem, buyMaterials, count, isAreaUnlocked, rewardAd, unlockArea } from '../../game/actions'
import { MATERIAL_PACKS } from '../../game/data/store'
import type { MaterialId } from '../../game/materials'
import { MatChip } from '../views/PrayerSelect'
import { Tabs } from '../components/kit'
import { ads } from '../../services/ads'
import { toast } from '../../game/events'
import { Btn, Coin, Icon } from '../components/common'
import { coinStoreOpen, shopSection, openPanel, tab, type ShopSection } from '../store'
import { useState } from 'preact/hooks'
import { petsForShop, RARITY, perkText } from '../../game/data/pets'
import { petIcon } from '../../art/pets'
import { spriteDataUrl } from '../../engine/sprite'
import { OUTFITS } from '../../game/data/outfits'
import { thumbFor, applyItem } from '../DressUp'
import { sfx } from '../../engine/audio'

const SECTIONS: { id: ShopSection; label: string; icon: string }[] = [
  { id: 'pets', label: 'สัตว์เลี้ยง', icon: 'paw' },
  { id: 'fashion', label: 'แฟชั่น', icon: 'shirt' },
  { id: 'alms', label: 'ของใส่บาตร', icon: 'bowl' },
  { id: 'offering', label: 'ของถวาย', icon: 'garland' },
  { id: 'animal', label: 'อาหารสัตว์', icon: 'paw' },
  { id: 'mats', label: 'วัสดุ', icon: 'hammer' },
  { id: 'special', label: 'พิเศษ', icon: 'krathong' },
  { id: 'boost', label: 'บูสต์บุญ', icon: 'boost' },
  { id: 'area', label: 'ปลดล็อกวัด', icon: 'map' },
]

export function ShopScreen() {
  const sec = shopSection.value
  const s = game.value
  const lv = level.value.level
  const starter = SPECIAL_OFFERS.find((o) => o.oneTime)
  return (
    <div class="screen">
      <div class="screen-head">
        <Icon name="shop" size={32} />
        <div class="grow">
          <div class="title">ร้านค้าหน้าวัด</div>
          <div class="small muted">ป้าแดงกับยายศรียินดีต้อนรับจ้า</div>
        </div>
        <Btn tone="green" size="small" onClick={() => (coinStoreOpen.value = true)}>
          <Icon name="coin" size={16} /> เติม
        </Btn>
      </div>
      {!s.starterBought && starter && (
        <button class="panel promo" onClick={() => (sfx.open(), (coinStoreOpen.value = true))}>
          <span class="ribbon">คุ้มสุด ๆ</span>
          <Icon name="gift" size={40} />
          <div class="grow" style={{ textAlign: 'left' }}>
            <div class="subtitle">{starter.name} · ฿{starter.priceTHB}</div>
            <div class="small muted">{starter.desc}</div>
          </div>
        </button>
      )}
      <Tabs compact tabs={SECTIONS} value={sec} onChange={(id) => (shopSection.value = id)} />

      {sec === 'pets' ? (
        <PetShop />
      ) : sec === 'fashion' ? (
        <FashionShop />
      ) : sec === 'mats' ? (
        <div class="list">
          {MATERIAL_PACKS.map((p) => (
            <div class="panel card" key={p.id}>
              <span class="recipe">
                {Object.entries(p.mats).map(([k, v]) => (
                  <MatChip key={k} id={k as MaterialId} n={v ?? 0} />
                ))}
              </span>
              <div class="grow">
                <div class="subtitle">{p.name}</div>
                <div class="small muted">{p.desc}</div>
              </div>
              <Btn
                tone="green"
                size="small"
                onClick={() => {
                  if (buyMaterials(p.id)) {
                    sfx.purchase()
                    toast(`ได้${p.name}แล้ว ไปทำเฟอร์นิเจอร์กัน`, 'hammer')
                  }
                }}
              >
                <Coin n={p.price} size={14} />
              </Btn>
            </div>
          ))}
        </div>
      ) : sec === 'boost' ? (
        <div class="list">
          {BOOSTS.map((b) => (
            <div class="panel card" key={b.id}>
              <Icon name={b.icon} size={40} />
              <div class="grow">
                <div class="subtitle">{b.name}</div>
                <div class="small muted">{b.desc}</div>
              </div>
              <Btn size="small" onClick={() => buyBoost(b.id) && sfx.purchase()}>
                <Coin n={b.price} size={16} />
              </Btn>
            </div>
          ))}
          <div class="small muted center">บูสต์หลายอันทำงานพร้อมกันได้ · ดูเวลาที่เหลือได้ที่หน้าวัด</div>
        </div>
      ) : sec === 'area' ? (
        <div class="list">
          {AREAS.filter((a) => a.id !== 'wat').map((a) => {
            const open = isAreaUnlocked(a.id)
            return (
              <div class="panel card" key={a.id}>
                <Icon name={open ? 'temple' : 'lock'} size={40} />
                <div class="grow">
                  <div class="subtitle">
                    {a.name} <span class="small muted">· {a.subtitle}</span>
                  </div>
                  <div class="small muted">{a.desc}</div>
                  {!open && <div class="small">ปลดล็อกฟรีที่เลเวล {a.unlockLevel} (ตอนนี้ Lv.{lv})</div>}
                </div>
                {open ? (
                  <span class="chip green">เปิดแล้ว</span>
                ) : (
                  <Btn size="small" onClick={() => unlockArea(a.id) && sfx.purchase()}>
                    <Coin n={a.unlockPrice} size={16} />
                  </Btn>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div class="grid2">
          {ITEMS.filter((i) => i.category === (sec as ItemCategory)).map((it) => {
            const locked = (it.level ?? 1) > lv
            return (
              <div class={`panel shop-item ${locked ? 'locked' : ''}`} key={it.id}>
                <Icon name={it.icon} size={44} />
                <div class="subtitle center">{it.name}</div>
                <div class="small muted center shop-desc">{it.desc}</div>
                <div class="small center">
                  มีอยู่ <b class="num">{it.id === 'lottery_ticket' ? s.daily.lotteryExtra : count(it.id)}</b>
                  {it.merit > 0 && <span class="muted"> · +{it.merit} บุญ</span>}
                </div>
                {locked ? (
                  <span class="chip">
                    <Icon name="lock" size={14} /> Lv.{it.level}
                  </span>
                ) : (
                  <Btn
                    size="small"
                    block
                    onClick={() => {
                      if (buyItem(it.id)) {
                        sfx.coin()
                        toast(`ซื้อ${it.name}${it.pack ? ` (${it.pack} ชิ้น)` : ''} แล้ว`, it.icon)
                      }
                    }}
                  >
                    <Coin n={it.price} size={16} />
                  </Btn>
                )}
              </div>
            )
          })}
        </div>
      )}
      {adsLeft() > 0 && (
        <button
          class="panel card free-coins"
          onClick={async () => {
            sfx.tap()
            const r = await ads().showRewarded('free_coins')
            if (r.rewarded) {
              const got = rewardAd('coins')
              if (got) toast(`ได้รับ ${got} บุญคอยน์ฟรี`, 'coin')
            }
          }}
        >
          <Icon name="tv" size={34} />
          <div class="grow" style={{ textAlign: 'left' }}>
            <div class="subtitle">คอยน์ไม่พอ? ดูโฆษณารับฟรี</div>
            <div class="small muted">
              +{AD_REWARD_COINS} คอยน์ · เหลือ {adsLeft()} ครั้งวันนี้
            </div>
          </div>
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function PetShop() {
  const s = game.value
  return (
    <div class="list">
      <div class="panel gold pet-hero small">
        <Icon name="paw" size={20} /> สัตว์เลี้ยงเดินตามคุณทั้งในวัดและที่บ้าน และช่วยเพิ่มบุญ เหรียญ หรือวัสดุนิดหน่อย
      </div>
      <div class="pet-grid">
        {petsForShop().map((p) => {
          const owned = s.pets.includes(p.id)
          const active = s.pet === p.id
          const r = RARITY[p.rarity]
          return (
            <div class={`panel pet-card ${active ? 'gold' : ''}`} key={p.id} style={{ ['--rar' as string]: r.color }}>
              <span class="pet-rarity small" style={{ background: r.color }}>
                {r.name}
              </span>
              <img class="px pet-img" src={spriteDataUrl(petIcon(p.id), 3)} alt="" width={72} height={72} />
              <b class="pet-name">{p.name}</b>
              <span class="small muted pet-desc">{p.desc}</span>
              <span class="chip green small">{perkText(p.perk)}</span>
              {owned ? (
                <Btn tone={active ? 'paper' : 'green'} size="small" block onClick={() => (sfx.tap(), setPet(active ? null : p.id))}>
                  {active ? 'ให้พักก่อน' : 'พาไปด้วย'}
                </Btn>
              ) : p.premium ? (
                <Btn tone="pink" size="small" block onClick={() => (sfx.open(), (coinStoreOpen.value = true))}>
                  <Icon name="gift" size={14} /> แพ็กพิเศษ
                </Btn>
              ) : (
                <Btn
                  tone="gold"
                  size="small"
                  block
                  onClick={() => {
                    if (buyPet(p.id)) {
                      sfx.purchase()
                      toast(`${p.name}มาอยู่กับคุณแล้ว!`, 'paw')
                    }
                  }}
                >
                  <Coin n={p.price} size={14} />
                </Btn>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type FashionCat = 'all' | 'school' | 'thai' | 'modern' | 'fun' | 'accessory'

function FashionShop() {
  const s = game.value
  const lv = level.value.level
  const [cat, setCat] = useState<FashionCat>('all')
  const items = OUTFITS.filter((o) => !o.premium && !ownsOutfit(o.id) && o.price > 0 && !(o as { shopOnly?: string }).shopOnly).filter((o) => {
    const c = (o as { category?: string }).category ?? 'modern'
    if (cat === 'all') return true
    if (cat === 'accessory') return ['head', 'neck', 'hand', 'shoes', 'back'].includes(o.slot as string)
    return c === cat || (cat === 'fun' && c === 'work')
  })
  const cats: [FashionCat, string][] = [
    ['all', 'ทั้งหมด'],
    ['school', 'ชุดนักเรียน'],
    ['thai', 'ไทย ๆ'],
    ['modern', 'สตรีท'],
    ['fun', 'ฮา ๆ'],
    ['accessory', 'ของประดับ'],
  ]
  return (
    <div class="list">
      <div class="row dress-styles">
        {cats.map(([id, label]) => (
          <button key={id} class={`chip ${cat === id ? 'green' : ''}`} onClick={() => (sfx.tap(), setCat(id))}>
            {label}
          </button>
        ))}
      </div>
      <div class="fashion-grid">
        {items.map((o) => {
          const locked = (o.level ?? 1) > lv
          return (
            <div class="panel fashion-card" key={o.id}>
              <img class="px" src={thumbFor(applyItem(s.player.look, o, o.slot as never), o.slot)} alt="" width={72} height={72} />
              <b class="small fashion-name">{o.name}</b>
              {locked ? (
                <span class="chip small">
                  <Icon name="lock" size={12} /> Lv.{o.level}
                </span>
              ) : (
                <Btn
                  tone="gold"
                  size="small"
                  block
                  onClick={() => {
                    if (buyOutfit(o.id)) {
                      equip(o.slot, o.id)
                      sfx.purchase()
                      toast(`ได้${o.name}แล้ว ใส่ให้เลย!`, 'shirt')
                    }
                  }}
                >
                  <Coin n={o.price} size={14} />
                </Btn>
              )}
            </div>
          )
        })}
      </div>
      {!items.length && <p class="small muted center">มีครบทุกชุดในหมวดนี้แล้ว เก่งมาก!</p>}
      <Btn tone="pink" block onClick={() => (sfx.open(), (tab.value = 'temple'), openPanel('dress'))}>
        <Icon name="shirt" size={16} /> ไปห้องแต่งตัว ลองชุดก่อนซื้อ
      </Btn>
    </div>
  )
}
