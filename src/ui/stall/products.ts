// Everything a stall sells, as one list of products, split into shelf
// pages and assigned to the scene's slots (shelves, hooks, counter…).

import type { Sprite } from '../../engine/sprite'
import { spriteDataUrl } from '../../engine/sprite'
import type { GameState } from '../../game/state'
import { SNACK_BY_ID, type PlaceShop, type StallKind } from '../../game/data/placeShops'
import { OUTFITS, OUTFIT_BY_ID } from '../../game/data/outfits'
import { ITEM_BY_ID, MART_ALMS, INGREDIENT_IDS } from '../../game/data/items'
import { COLLECTIBLE_BY_ID } from '../../game/data/collectibles'
import type { CollectibleKind, Rarity } from '../../game/data/collectibleTypes'
import { shopStock, stockLeft, type StockEntry } from '../../game/collectibles'
import { collectibleSprite, collectibleUrl } from '../../art/collectibles'
import { grocerySprite, outfitDisplaySprite, snackSprite } from '../../art/stallGoods'
import { iconUrl } from '../../art/icons'
import type { SlotRole, StallSlot } from '../../art/stall'

export type ProductKind = 'snack' | 'outfit' | 'grocery' | 'collectible'

export interface Product {
  key: string
  kind: ProductKind
  id: string
  name: string
  desc: string
  price: number
  rarity?: Rarity
  ckind?: CollectibleKind
  /** Units left today (collectibles); null = plenty. */
  left: number | null
  stock?: StockEntry
  section: string
  prefer: SlotRole[]
  /** Hangs from a hook by itself (others get a blister card). */
  hangs: boolean
  sprite: () => Sprite
  bigUrl: () => string
}

const HANGING: CollectibleKind[] = ['keychain', 'charm', 'pin', 'amulet']

function prefer(kind: ProductKind, ck?: CollectibleKind): SlotRole[] {
  if (kind === 'snack') return ['counter', 'case', 'shelf', 'hook']
  if (kind === 'grocery') return ['shelf', 'counter', 'case', 'hook']
  if (kind === 'outfit') return ['rack', 'hook', 'shelf', 'counter', 'case']
  if (ck === 'amulet') return ['case', 'hook', 'shelf', 'counter']
  if (ck && HANGING.includes(ck)) return ['hook', 'rack', 'shelf', 'case', 'counter']
  if (ck === 'postcard' || ck === 'stamp') return ['hook', 'shelf', 'case', 'counter']
  return ['shelf', 'case', 'counter', 'hook', 'rack']
}

export const SECTION_ALMS = 'ของใส่บาตร'
export const SECTION_COOK = 'วัตถุดิบทำอาหาร'
export const SECTION_MAIN = 'ของในร้าน'

/** Everything this stall sells today. */
export function stallProducts(shop: PlaceShop, kind: StallKind, s: GameState): Product[] {
  const out: Product[] = []
  const main = shop.mart ? 'ขนม & ของสะสม' : SECTION_MAIN
  for (const sid of shop.snacks) {
    const sn = SNACK_BY_ID[sid]
    if (!sn) continue
    out.push({
      key: `snack:${sid}`,
      kind: 'snack',
      id: sid,
      name: sn.name,
      desc: sn.desc,
      price: sn.price,
      left: null,
      section: main,
      prefer: prefer('snack'),
      hangs: false,
      sprite: () => snackSprite(sid, sn.icon),
      bigUrl: () => spriteDataUrl(snackSprite(sid, sn.icon), 5),
    })
  }
  for (const e of shopStock(shop, kind, s)) {
    const c = COLLECTIBLE_BY_ID[e.id]
    if (!c) continue
    out.push({
      key: `col:${c.id}`,
      kind: 'collectible',
      id: c.id,
      name: c.name,
      desc: c.desc,
      price: c.value,
      rarity: c.rarity,
      ckind: c.kind,
      left: stockLeft(shop.id, e, s),
      stock: e,
      section: main,
      prefer: prefer('collectible', c.kind),
      hangs: HANGING.includes(c.kind),
      sprite: () => collectibleSprite(c),
      bigUrl: () => collectibleUrl(c, 5),
    })
  }
  if (shop.place)
    for (const o of OUTFITS) {
      if ((o as { shopOnly?: string }).shopOnly !== shop.place) continue
      out.push({
        key: `outfit:${o.id}`,
        kind: 'outfit',
        id: o.id,
        name: o.name,
        desc: o.desc,
        price: o.price,
        left: null,
        section: main,
        prefer: prefer('outfit'),
        hangs: true,
        sprite: () => outfitDisplaySprite(o.id),
        bigUrl: () => spriteDataUrl(outfitDisplaySprite(o.id), 4),
      })
    }
  if (shop.mart) {
    const add = (id: string, section: string) => {
      const it = ITEM_BY_ID[id]
      if (!it) return
      out.push({
        key: `grocery:${id}`,
        kind: 'grocery',
        id,
        name: it.name,
        desc: it.desc,
        price: it.price,
        left: null,
        section,
        prefer: prefer('grocery'),
        hangs: false,
        sprite: () => grocerySprite(it.icon),
        bigUrl: () => iconUrl(it.icon, 5),
      })
    }
    for (const id of MART_ALMS) add(id, SECTION_ALMS)
    for (const id of INGREDIENT_IDS) add(id, SECTION_COOK)
  }
  return out
}

export interface ShelfPage {
  label: string
  /** slot index → product */
  placed: Map<number, Product>
}

const RANK: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 }

/** Put products on slots, page by page (sections first, overflow after). */
export function layoutPages(products: Product[], slots: StallSlot[], width = 156): ShelfPage[] {
  const mid = width / 2
  const sections: string[] = []
  for (const p of products) if (!sections.includes(p.section)) sections.push(p.section)
  // The mart shows its snacks & collectibles first.
  sections.sort((a, b) => (a.includes('ของสะสม') ? -1 : b.includes('ของสะสม') ? 1 : 0))
  const pages: ShelfPage[] = []
  for (const sec of sections) {
    let queue = products
      .filter((p) => p.section === sec)
      .sort((a, b) => (a.kind === 'collectible' && b.kind === 'collectible' ? (RANK[a.rarity!] ?? 5) - (RANK[b.rarity!] ?? 5) : 0))
    let n = 0
    while (queue.length) {
      const placed = new Map<number, Product>()
      const free = new Set(slots.map((_, i) => i))
      const left: Product[] = []
      for (const p of queue) {
        let spot = -1
        for (const role of p.prefer) {
          // Spread items: take the free slot of that role nearest the middle of its row.
          const cands = [...free].filter((i) => slots[i].role === role)
          if (!cands.length) continue
          cands.sort((a, b) => rowOrder(slots[a]) - rowOrder(slots[b]) || Math.abs(slots[a].x - mid) - Math.abs(slots[b].x - mid))
          spot = cands[0]
          break
        }
        if (spot < 0) {
          left.push(p)
          continue
        }
        free.delete(spot)
        placed.set(spot, p)
      }
      pages.push({ label: n ? `${sec} ${n + 1}` : sec, placed })
      if (left.length === queue.length) break
      queue = left
      n++
    }
  }
  if (!pages.length) pages.push({ label: SECTION_MAIN, placed: new Map() })
  return pages
}

function rowOrder(s: StallSlot): number {
  // Counter first for food, then eye-level rows.
  return { D: 0, B: 1, C: 2, A: 3 }[s.row]
}

export function outfitName(id: string) {
  return OUTFIT_BY_ID[id]?.name ?? id
}
