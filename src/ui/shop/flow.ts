// Shop UI state and purchase flows: the confirm modal, the celebration
// reveal and the (sandboxed) real-money checkout.

import { signal } from '@preact/signals'
import { game } from '../../game/state'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { COIN_PACKS, SPECIAL_OFFERS, type SpecialOffer } from '../../game/data/store'
import { buyOutfit, buyPet, completePurchase, equip, setPet } from '../../game/actions'
import { buyBundle, buyDeal, BUNDLES, bundleMissing, type Deal, type EntryKind } from '../../game/shop'
import { payments } from '../../services/payments'
import { haptic, sfx } from '../../engine/audio'

export interface RevealItem {
  kind: EntryKind
  id: string
}

export interface RevealReq {
  title: string
  items: RevealItem[]
  coins?: number
  note?: string
}

export type ConfirmReq = { kind: EntryKind; id: string } | { kind: 'deal'; deal: Deal } | { kind: 'bundle'; id: string } | { kind: 'pack'; id: string }

/** The purchase confirm modal (big preview). */
export const shopConfirm = signal<ConfirmReq | null>(null)
/** The celebration reveal after a purchase. */
export const shopReveal = signal<RevealReq | null>(null)
/** Real-money checkout in progress (product id). */
export const checkoutBusy = signal<string | null>(null)

export function openConfirm(req: ConfirmReq) {
  sfx.open()
  shopConfirm.value = req
}

export function closeConfirm() {
  shopConfirm.value = null
}

export function celebrate(req: RevealReq) {
  sfx.purchase()
  haptic(30)
  setTimeout(() => sfx.chime(), 260)
  shopConfirm.value = null
  shopReveal.value = req
}

/** Wear an owned outfit; garments take a worn full-body suit off so they show. */
export function wear(id: string) {
  const o = OUTFIT_BY_ID[id]
  if (!o || !game.value.outfits.includes(id)) return
  equip(o.slot, id)
  if (o.slot !== 'suit' && ['top', 'bottom', 'hair', 'head'].includes(o.slot) && game.value.player.look.suit) equip('suit', null)
}

/** Buy an outfit or pet for coins, wear it / walk with it, then celebrate. */
export function buyEntry(kind: EntryKind, id: string): boolean {
  if (kind === 'outfit') {
    if (!buyOutfit(id)) return false
    wear(id)
  } else {
    if (!buyPet(id)) return false
  }
  celebrate({ title: 'ได้ของใหม่แล้ว!', items: [{ kind, id }] })
  return true
}

export function buyDealFlow(deal: Deal): boolean {
  if (!buyDeal(deal)) return false
  celebrate({ title: `ดีลลด ${deal.off}% สำเร็จ!`, items: [{ kind: deal.kind, id: deal.itemId }] })
  return true
}

export function buyBundleFlow(id: string): boolean {
  const b = BUNDLES.find((x) => x.id === id)
  if (!b) return false
  const missing = bundleMissing(b)
  if (!buyBundle(id)) return false
  celebrate({ title: `ได้${b.name}ครบเซ็ต!`, items: missing.map((e) => ({ kind: e.kind, id: e.id })) })
  return true
}

export function offerById(id: string): SpecialOffer | undefined {
  return SPECIAL_OFFERS.find((o) => o.id === id)
}

/** Everything a special offer contains that the player doesn't own yet. */
export function offerOwnedAll(o: SpecialOffer, s = game.value): boolean {
  if (o.oneTime && s.starterBought) return true
  const things = [...(o.outfits ?? []).map((x) => s.outfits.includes(x)), ...(o.pets ?? []).map((x) => s.pets.includes(x))]
  return things.length > 0 && things.every(Boolean) && !o.monthly
}

/** Sandboxed real-money purchase of a coin pack or special offer. */
export async function checkout(id: string): Promise<boolean> {
  if (checkoutBusy.value) return false
  const pack = COIN_PACKS.find((p) => p.id === id)
  const offer = offerById(id)
  if (!pack && !offer) return false
  const price = pack?.priceTHB ?? offer!.priceTHB
  const title = pack ? `${pack.name} ${pack.coins + pack.bonus} คอยน์` : offer!.name
  shopConfirm.value = null
  checkoutBusy.value = id
  try {
    const r = await payments().purchase(id, price, title)
    if (!r.ok || !r.transactionId) return false
    completePurchase(id, r.transactionId, { quiet: true })
    if (pack) celebrate({ title: `ได้รับ ${pack.name}!`, items: [], coins: pack.coins + pack.bonus, note: 'ขอบคุณที่ร่วมสนับสนุนบุญดี' })
    else {
      const o = offer!
      celebrate({
        title: `ได้รับ${o.name}!`,
        items: [...(o.outfits ?? []).map((x) => ({ kind: 'outfit' as const, id: x })), ...(o.pets ?? []).map((x) => ({ kind: 'pet' as const, id: x }))],
        coins: o.coins,
        note: o.monthly ? 'รับคอยน์เพิ่มได้ทุกวันที่หน้าร้าน' : undefined,
      })
    }
    return true
  } finally {
    checkoutBusy.value = null
  }
}

/** "Wear it all" from the reveal: equip outfits and walk with the last pet. */
export function useRevealed(items: RevealItem[]) {
  for (const it of items) {
    if (it.kind === 'outfit') wear(it.id)
    else if (game.value.pets.includes(it.id)) setPet(it.id)
  }
}
