// ร้านค้า – a mobile-game storefront: hero banners, featured row, daily
// deals with countdowns, the daily free gift, packs (starter & flood), themed
// bundles, fashion and pets with rarity frames, plus the everyday merit
// items, materials, boosts and area unlocks. Real-money packs go through the
// sandbox payment provider (no money is ever charged in the prototype).

import type { ComponentChildren } from 'preact'
import { useMemo, useState } from 'preact/hooks'
import { game, level } from '../../game/state'
import { ITEMS, BOOSTS, type ItemCategory } from '../../game/data/items'
import { AREAS } from '../../game/data/areas'
import { AD_REWARD_COINS, COIN_PACKS, MATERIAL_PACKS, SPECIAL_OFFERS } from '../../game/data/store'
import { adsLeft, buyBoost, buyItem, buyMaterials, count, isAreaUnlocked, rewardAd, unlockArea } from '../../game/actions'
import type { MaterialId } from '../../game/materials'
import { MatChip } from '../views/PrayerSelect'
import { ads } from '../../services/ads'
import { toast } from '../../game/events'
import { Coin, Icon, useTicker } from '../components/common'
import { PT } from '../pixeltext'
import { coinStoreOpen, shopSection, openPanel, tab, type ShopSection } from '../store'
import { PETS, RARITY } from '../../game/data/pets'
import { OUTFITS, inGeneralShop, type OutfitItem } from '../../game/data/outfits'
import { BUNDLES, FEATURED, buyable, claimGift, dailyDeals, entryById, fmtCountdown, giftText, msUntilReset, outfitRarity, owns } from '../../game/shop'
import { BundleCard, DealsRow, FloodPackCard, GiftCard, ItemCard, OfferCard, StarterPackCard } from '../shop/ShopCards'
import { HeroBanner, dressed, slideArt, type Slide } from '../shop/HeroBanner'
import { ShopConfirm, ShopReveal } from '../shop/ShopModals'
import { checkout, checkoutBusy, openConfirm } from '../shop/flow'
import { sfx } from '../../engine/audio'
import '../shop/shop.css'

type TabId = 'featured' | 'fashion' | 'pets' | 'packs' | 'merit' | 'mats' | 'boost' | 'area'

const TABS: { id: TabId; label: string; icon: string; badge?: string }[] = [
  { id: 'featured', label: 'แนะนำ', icon: 'star' },
  { id: 'fashion', label: 'แฟชั่น', icon: 'shirt', badge: 'ใหม่' },
  { id: 'pets', label: 'สัตว์เลี้ยง', icon: 'paw', badge: 'ใหม่' },
  { id: 'packs', label: 'แพ็กพิเศษ', icon: 'gift' },
  { id: 'merit', label: 'ของทำบุญ', icon: 'bowl' },
  { id: 'mats', label: 'วัสดุ', icon: 'hammer' },
  { id: 'boost', label: 'บูสต์', icon: 'boost' },
  { id: 'area', label: 'ปลดล็อก', icon: 'map' },
]

const MERIT_SECS: ShopSection[] = ['alms', 'offering', 'animal', 'special']

function tabOf(sec: ShopSection): TabId {
  if (MERIT_SECS.includes(sec)) return 'merit'
  return (sec === 'featured' || sec === 'fashion' || sec === 'pets' || sec === 'packs' || sec === 'mats' || sec === 'boost' || sec === 'area' ? sec : 'featured') as TabId
}

function Heading({ icon, text, right }: { icon: string; text: string; right?: ComponentChildren }) {
  return (
    <div class="sh-head">
      <Icon name={icon} size={22} />
      <PT text={text} size={11} weight={600} color="#3b2616" />
      <span class="grow" />
      {right}
    </div>
  )
}

export function ShopScreen() {
  useTicker(1000)
  const sec = shopSection.value
  const t = tabOf(sec)
  const s = game.value
  const setTab = (id: TabId) => {
    sfx.tap()
    shopSection.value = id === 'merit' ? (MERIT_SECS.includes(sec) ? sec : 'alms') : (id as ShopSection)
  }
  const starter = SPECIAL_OFFERS.find((o) => o.oneTime)
  const flood = SPECIAL_OFFERS.find((o) => o.tag === 'flood')
  const deals = useMemo(() => dailyDeals(s), [s.player.friendCode, s.daily.key, s.outfits.length, s.pets.length])

  const slides: Slide[] = []
  const look = s.player.look
  if (starter && !s.starterBought)
    slides.push({ id: 'starter', theme: 'starter', kicker: 'คุ้มสุด ๆ · ครั้งเดียว', title: 'แพ็กช้างน้อย', sub: `หมวกช้าง + กางเกงช้าง + น้องช้าง เพียง ฿${starter.priceTHB}`, cta: 'ดูแพ็ก', onCta: () => openConfirm({ kind: 'pack', id: starter.id }), art: slideArt.outfit(dressed(look, starter.outfits ?? []), starter.pets?.[0] ?? null, 'rgba(255, 213, 79, 0.35)') })
  if (flood)
    slides.push({ id: 'flood', theme: 'flood', kicker: 'แพ็กพิเศษ · เตือนภัย!', title: 'หนีภัยน้ำท่วม', sub: 'ชุดดำน้ำ + ตีนกบ + ปลากัดลอยฟ่อง', cta: 'ลุยน้ำเลย', onCta: () => openConfirm({ kind: 'pack', id: flood.id }), art: slideArt.flood(dressed(look, flood.outfits ?? []), flood.pets?.[0] ?? null) })
  slides.push({ id: 'pop', theme: 'pop', kicker: 'ของใหม่ 29 ชิ้น', title: 'ซอฟต์พาวเวอร์!', sub: 'ต้มยำกุ้ง หมูกระทะ ชาไทย ฮิปโปแคระ', cta: 'ช้อปเลย', onCta: () => (shopSection.value = 'fashion'), art: slideArt.outfit(dressed(look, ['head_tomyum', 'top_floral_neon', 'hand_krapao_box']), 'pygmy_hippo', 'rgba(255, 159, 192, 0.35)') })
  const d0 = deals[0]
  if (d0)
    slides.push({ id: 'deal', theme: 'deal', kicker: `หมดเวลาใน ${fmtCountdown(msUntilReset())}`, title: `ดีลลด ${d0.off}%`, sub: entryById(d0.itemId)?.name ?? '', cta: 'รีบเลย', onCta: () => openConfirm({ kind: 'deal', deal: d0 }), art: d0.kind === 'pet' ? slideArt.pet(d0.itemId, 'rgba(185, 138, 230, 0.4)') : slideArt.outfit(dressed(look, [d0.itemId]), null, 'rgba(185, 138, 230, 0.4)') })
  slides.push({ id: 'pets', theme: 'pets', kicker: 'สัตว์เลี้ยงไวรัล', title: 'หมีเนยถั่วแดนซ์', sub: 'โยกตามเพลงทั้งวัน เหรียญ +6%', cta: 'ดูน้อง', onCta: () => openConfirm({ kind: 'pet', id: 'butter_bear' }), art: slideArt.pet('butter_bear', 'rgba(111, 184, 240, 0.35)') })

  return (
    <div class="screen sh-screen">
      <div class="sh-topbar">
        <span class="sh-wallet">
          <Coin n={s.coins} size={20} />
        </span>
        <button class="btn green small" onClick={() => (sfx.open(), (coinStoreOpen.value = true))}>
          <Icon name="plus" size={16} /> เติม
        </button>
        <span class="grow" />
        <button class={`btn pink small sh-gift-btn ${s.shop.giftDay !== s.daily.key ? 'ready' : ''}`} onClick={() => setTab('featured')}>
          <Icon name="gift" size={18} />
        </button>
      </div>
      <HeroBanner slides={slides} />
      <div class="sh-tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={t === x.id} class={`sh-tab ${t === x.id ? 'on' : ''}`} onClick={() => setTab(x.id)}>
            <Icon name={x.icon} size={26} />
            <span class="sh-tab-label">{x.label}</span>
            {x.badge && t !== x.id && <span class="sh-tab-badge">{x.badge}</span>}
          </button>
        ))}
      </div>

      {t === 'featured' && <Featured deals={deals} />}
      {t === 'fashion' && <FashionTab />}
      {t === 'pets' && <PetsTab />}
      {t === 'packs' && <PacksTab />}
      {t === 'merit' && <MeritTab />}
      {t === 'mats' && <MatsTab />}
      {t === 'boost' && <BoostTab />}
      {t === 'area' && <AreaTab />}

      <FreeCoins />
      <ShopConfirm />
      <ShopReveal />
    </div>
  )
}

// ---------------------------------------------------------------------------

function Featured({ deals }: { deals: ReturnType<typeof dailyDeals> }) {
  const s = game.value
  const starter = SPECIAL_OFFERS.find((o) => o.oneTime)
  const flood = SPECIAL_OFFERS.find((o) => o.tag === 'flood')
  const featured = FEATURED.map((id) => entryById(id)).filter((e) => e && !owns(e.kind, e.id, s) && buyable(e.kind, e.id))
  return (
    <div class="sh-sec">
      <GiftCard
        onClaim={() => {
          const g = claimGift()
          if (g) {
            sfx.coins(5)
            toast(`ของขวัญฟรี: ${giftText(g)}`, g.icon)
          }
        }}
      />
      <Heading
        icon="bolt"
        text="ดีลเวลาจำกัด"
        right={
          <span class="sh-timer">
            <Icon name="calendar" size={14} /> {fmtCountdown(msUntilReset())}
          </span>
        }
      />
      <DealsRow deals={deals} />
      <Heading icon="gift" text="แพ็กสุดคุ้ม" />
      {starter && !s.starterBought && <StarterPackCard o={starter} />}
      {flood && <FloodPackCard o={flood} />}
      {featured.length > 0 && (
        <>
          <Heading icon="star" text="แนะนำสำหรับคุณ" />
          <div class="sh-row scroll-x">
            {featured.map((e) => (
              <ItemCard key={e!.id} kind={e!.kind} id={e!.id} />
            ))}
          </div>
        </>
      )}
      <Heading icon="chest" text="เซ็ตสุดคุ้ม" />
      <div class="sh-list">
        {BUNDLES.slice(0, 3).map((b) => (
          <BundleCard key={b.id} b={b} />
        ))}
      </div>
      <button class="btn paper block" onClick={() => (sfx.tap(), (shopSection.value = 'packs'))}>
        <Icon name="gift" size={16} /> ดูแพ็กและเซ็ตทั้งหมด
      </button>
    </div>
  )
}

type FashionCat = 'all' | 'new' | 'costume' | 'thai' | 'fun' | 'modern' | 'accessory' | 'school'

const FASHION_CATS: [FashionCat, string][] = [
  ['all', 'ทั้งหมด'],
  ['new', 'ใหม่!'],
  ['costume', 'ชุดมาสคอต'],
  ['thai', 'ไทย ๆ'],
  ['fun', 'ฮา ๆ'],
  ['modern', 'สตรีท'],
  ['accessory', 'ของประดับ'],
  ['school', 'นักเรียน'],
]

function fashionMatch(o: OutfitItem, cat: FashionCat): boolean {
  const c = o.category ?? 'modern'
  switch (cat) {
    case 'all':
      return true
    case 'new':
      return !!o.tags?.includes('new')
    case 'costume':
      return o.slot === 'suit'
    case 'accessory':
      return ['head', 'neck', 'hand', 'back'].includes(o.slot)
    case 'fun':
      return c === 'fun' || c === 'work'
    default:
      return c === cat
  }
}

function FashionTab() {
  const s = game.value
  const [cat, setCat] = useState<FashionCat>('new')
  const [sort, setSort] = useState<'hot' | 'cheap' | 'rare'>('hot')
  const items = OUTFITS.filter((o) => inGeneralShop(o) && o.price > 0 && !s.outfits.includes(o.id) && fashionMatch(o, cat))
  const order = { common: 0, rare: 1, epic: 2, legend: 3 }
  const sorted = [...items].sort((a, b) => {
    if (sort === 'cheap') return a.price - b.price
    if (sort === 'rare') return order[outfitRarity(b)] - order[outfitRarity(a)] || b.price - a.price
    const ha = (a.tags?.includes('new') ? 2 : 0) + (FEATURED.includes(a.id) ? 1 : 0)
    const hb = (b.tags?.includes('new') ? 2 : 0) + (FEATURED.includes(b.id) ? 1 : 0)
    return hb - ha || (a.level ?? 1) - (b.level ?? 1)
  })
  return (
    <div class="sh-sec">
      <div class="sh-chips scroll-x">
        {FASHION_CATS.map(([id, label]) => (
          <button key={id} class={`sh-chip ${cat === id ? 'on' : ''} ${id === 'new' ? 'hot' : ''}`} onClick={() => (sfx.tap(), setCat(id))}>
            {label}
          </button>
        ))}
      </div>
      <div class="sh-sortbar small">
        เรียง:
        {(
          [
            ['hot', 'มาแรง'],
            ['cheap', 'ราคาถูก'],
            ['rare', 'หายากสุด'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} class={`sh-sort ${sort === id ? 'on' : ''}`} onClick={() => (sfx.tap(), setSort(id))}>
            {label}
          </button>
        ))}
        <span class="grow" />
        <span class="muted">{sorted.length} ชิ้น</span>
      </div>
      <div class="sh-grid">
        {sorted.map((o) => (
          <ItemCard key={o.id} kind="outfit" id={o.id} />
        ))}
      </div>
      {!sorted.length && <p class="small muted center">มีครบทุกชิ้นในหมวดนี้แล้ว เก่งมาก!</p>}
      <button class="btn pink block" onClick={() => (sfx.open(), (tab.value = 'temple'), openPanel('dress'))}>
        <Icon name="shirt" size={16} /> ไปห้องแต่งตัว ลองชุดที่มีอยู่
      </button>
    </div>
  )
}

function PetsTab() {
  const s = game.value
  const order = (r: keyof typeof RARITY) => RARITY[r].order
  const shop = PETS.filter((p) => buyable('pet', p.id)).sort((a, b) => Number(s.pets.includes(a.id)) - Number(s.pets.includes(b.id)) || order(a.rarity) - order(b.rarity) || a.price - b.price)
  const special = PETS.filter((p) => !buyable('pet', p.id))
  return (
    <div class="sh-sec">
      <div class="sh-note small">
        <Icon name="paw" size={18} /> สัตว์เลี้ยงเดินตามคุณทั้งในวัดและที่บ้าน และช่วยเพิ่มบุญ เหรียญ หรือวัสดุนิดหน่อย
      </div>
      <div class="sh-grid">
        {shop.map((p) => (
          <ItemCard key={p.id} kind="pet" id={p.id} />
        ))}
      </div>
      <Heading icon="gift" text="หาได้จากแพ็ก & บัตรผ่าน" />
      <div class="sh-grid">
        {special.map((p) => (
          <ItemCard key={p.id} kind="pet" id={p.id} />
        ))}
      </div>
    </div>
  )
}

function PacksTab() {
  const s = game.value
  const starter = SPECIAL_OFFERS.find((o) => o.oneTime)
  const flood = SPECIAL_OFFERS.find((o) => o.tag === 'flood')
  const others = SPECIAL_OFFERS.filter((o) => o !== starter && o !== flood)
  return (
    <div class="sh-sec">
      {starter && !s.starterBought && <StarterPackCard o={starter} />}
      {flood && <FloodPackCard o={flood} />}
      <Heading icon="chest" text="เซ็ตสุดคุ้ม (จ่ายด้วยคอยน์)" />
      <div class="sh-list">
        {BUNDLES.map((b) => (
          <BundleCard key={b.id} b={b} />
        ))}
      </div>
      <Heading icon="gift" text="แพ็กพิเศษอื่น ๆ" />
      <div class="sh-list">
        {others.map((o) => (
          <OfferCard key={o.id} o={o} />
        ))}
      </div>
      <Heading icon="coinbag" text="เติมบุญคอยน์" />
      <div class="sh-coin-grid">
        {COIN_PACKS.map((p, i) => (
          <button key={p.id} class={`sh-coinpack tier-${i}`} disabled={!!checkoutBusy.value} onClick={() => (sfx.tap(), void checkout(p.id))}>
            {p.badge && <span class="sh-ribbon hot">{p.badge}</span>}
            <Icon name={p.art === 'chest' || p.art === 'temple' ? 'chest' : i === 0 ? 'coins' : 'coinbag'} size={36 + i * 4} />
            <span class="small">{p.name}</span>
            <Coin n={p.coins} size={14} />
            {p.bonus > 0 && <span class="sh-bonus">+{p.bonus}</span>}
            <span class="sh-baht num">฿{p.priceTHB}</span>
          </button>
        ))}
      </div>
      <p class="small muted center">เวอร์ชันทดลอง: การซื้อทั้งหมดเป็นการจำลอง ไม่มีการตัดเงินจริง</p>
    </div>
  )
}

function MeritTab() {
  const s = game.value
  const lv = level.value.level
  const sec = shopSection.value
  const cats: [ShopSection, string, string][] = [
    ['alms', 'ใส่บาตร', 'bowl'],
    ['offering', 'ของถวาย', 'garland'],
    ['animal', 'อาหารสัตว์', 'paw'],
    ['special', 'พิเศษ', 'krathong'],
  ]
  return (
    <div class="sh-sec">
      <div class="sh-chips">
        {cats.map(([id, label, icon]) => (
          <button key={id} class={`sh-chip ${sec === id ? 'on' : ''}`} onClick={() => (sfx.tap(), (shopSection.value = id))}>
            <Icon name={icon} size={16} /> {label}
          </button>
        ))}
      </div>
      <div class="sh-grid">
        {ITEMS.filter((i) => i.category === (sec as ItemCategory)).map((it) => {
          const locked = (it.level ?? 1) > lv
          return (
            <div class={`sh-card consum ${locked ? 'locked' : ''}`} key={it.id}>
              <span class="sh-card-art">
                <Icon name={it.icon} size={44} />
              </span>
              <span class="sh-card-name">{it.name}</span>
              <span class="small muted sh-card-desc">{it.desc}</span>
              <span class="small">
                มี <b class="num">{it.id === 'lottery_ticket' ? s.daily.lotteryExtra : count(it.id)}</b>
                {it.merit > 0 && <span class="muted"> · +{it.merit} บุญ</span>}
              </span>
              {locked ? (
                <span class="sh-price">
                  <Icon name="lock" size={14} /> Lv.{it.level}
                </span>
              ) : (
                <button
                  class="sh-price buy"
                  onClick={() => {
                    if (buyItem(it.id)) {
                      sfx.coin()
                      toast(`ซื้อ${it.name}${it.pack ? ` (${it.pack} ชิ้น)` : ''} แล้ว`, it.icon)
                    }
                  }}
                >
                  <Coin n={it.price} size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MatsTab() {
  return (
    <div class="sh-sec sh-list">
      {MATERIAL_PACKS.map((p) => (
        <div class="sh-rowcard" key={p.id}>
          <span class="recipe">
            {Object.entries(p.mats).map(([k, v]) => (
              <MatChip key={k} id={k as MaterialId} n={v ?? 0} />
            ))}
          </span>
          <div class="grow">
            <b>{p.name}</b>
            <div class="small muted">{p.desc}</div>
          </div>
          <button
            class="btn small"
            onClick={() => {
              if (buyMaterials(p.id)) {
                sfx.purchase()
                toast(`ได้${p.name}แล้ว ไปทำเฟอร์นิเจอร์กัน`, 'hammer')
              }
            }}
          >
            <Coin n={p.price} size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function BoostTab() {
  return (
    <div class="sh-sec sh-list">
      {BOOSTS.map((b) => (
        <div class="sh-rowcard" key={b.id}>
          <Icon name={b.icon} size={40} />
          <div class="grow">
            <b>{b.name}</b>
            <div class="small muted">{b.desc}</div>
          </div>
          <button class="btn small" onClick={() => buyBoost(b.id) && sfx.purchase()}>
            <Coin n={b.price} size={16} />
          </button>
        </div>
      ))}
      <div class="small muted center">บูสต์หลายอันทำงานพร้อมกันได้ · ดูเวลาที่เหลือได้ที่หน้าวัด</div>
    </div>
  )
}

function AreaTab() {
  const lv = level.value.level
  return (
    <div class="sh-sec sh-list">
      {AREAS.filter((a) => a.id !== 'wat').map((a) => {
        const open = isAreaUnlocked(a.id)
        return (
          <div class="sh-rowcard" key={a.id}>
            <Icon name={open ? 'temple' : 'lock'} size={40} />
            <div class="grow">
              <b>
                {a.name} <span class="small muted">· {a.subtitle}</span>
              </b>
              <div class="small muted">{a.desc}</div>
              {!open && <div class="small">ปลดล็อกฟรีที่เลเวล {a.unlockLevel} (ตอนนี้ Lv.{lv})</div>}
            </div>
            {open ? (
              <span class="chip green">เปิดแล้ว</span>
            ) : (
              <button class="btn small" onClick={() => unlockArea(a.id) && sfx.purchase()}>
                <Coin n={a.unlockPrice} size={16} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FreeCoins() {
  if (adsLeft() <= 0) return null
  return (
    <button
      class="sh-rowcard sh-ad"
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
        <b>คอยน์ไม่พอ? ดูโฆษณารับฟรี</b>
        <div class="small muted">
          +{AD_REWARD_COINS} คอยน์ · เหลือ {adsLeft()} ครั้งวันนี้
        </div>
      </div>
      <span class="chip green">ฟรี</span>
    </button>
  )
}
