// A new save starts with an empty bag, so when an activity needs something
// the player doesn't have, Bot Noi says where to get it: his quests (the
// main early source of items) or the shop.

import { game } from '../../game/state'
import { ITEMS } from '../../game/data/items'
import { activity, openShop, type ShopSection } from '../store'
import { PBtn } from '../components/kit'
import { BotFace } from './BotBubble'
import { botMenu, openBotMenu } from './botStore'
import { tutActive } from './tutorialCtl'

const ALMS = ITEMS.filter((i) => (i.category === 'alms' && i.id !== 'incense') || i.category === 'dish').map((i) => i.id)

/** Activity id → items it uses, the shop section that sells them and what to call them. */
const NEEDS: Record<string, { items: string[]; shop: ShopSection; what: string }> = {
  alms: { items: ALMS, shop: 'alms', what: 'ของใส่บาตร' },
  dog: { items: ['dog_food', 'chicken'], shop: 'animal', what: 'อาหารน้องหมา' },
  gold_leaf: { items: ['gold_leaf'], shop: 'offering', what: 'ทองคำเปลว' },
}

/** What the running activity is missing (null when fine). */
export function missingFor(act: string | undefined, inv: Record<string, number>): { shop: ShopSection; what: string } | null {
  const n = act ? NEEDS[act] : undefined
  if (!n) return null
  return n.items.some((id) => (inv[id] ?? 0) > 0) ? null : { shop: n.shop, what: n.what }
}

export function BagHint() {
  const miss = missingFor(activity.value?.id, game.value.inventory)
  if (!miss || botMenu.value || tutActive.value) return null
  return (
    <div class="bn-root tips">
      <div class="bn-mini-hint bn-bag-hint">
        <BotFace expr="think" arm="point" scale={1} />
        <span class="grow">ยังไม่มี{miss.what}เลยครับ! ไปรับของจากภารกิจบอทน้อย หรือซื้อที่ร้านก็ได้นะ</span>
        <span class="bn-bag-acts">
          <PBtn tone="gold" size="small" onClick={() => openBotMenu('quests')}>
            ภารกิจบอทน้อย
          </PBtn>
          <PBtn tone="green" size="small" onClick={() => openShop(miss.shop)}>
            ซื้อที่ร้าน
          </PBtn>
        </span>
      </div>
    </div>
  )
}
