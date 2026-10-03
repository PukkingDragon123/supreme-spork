// Small game popups: the quick-shop sheet, "ได้รับของใหม่!" and short
// level-up cards. Popups are queued and merged so they never spam.

import { signal } from '@preact/signals'

export const shopPopupOpen = signal(false)

export function openShopPopup() {
  shopPopupOpen.value = true
}

export interface GotEntry {
  /** 'item' | 'outfit' | 'furniture' | 'pet' */
  kind: string
  id: string
  n: number
}

export type Popup = { kind: 'got'; items: GotEntry[]; key: number } | { kind: 'level'; level: number; coins: number; key: number }

/** Waiting popups (the first one shows). */
export const popupQueue = signal<Popup[]>([])
let seq = 0

/** Queue a popup; a "got" popup merges into a waiting one instead of stacking. */
export function pushPopup(p: { kind: 'got'; items: GotEntry[] } | { kind: 'level'; level: number; coins: number }) {
  const q = [...popupQueue.value]
  if (p.kind === 'got') {
    const tail = q.length ? q[q.length - 1] : null
    if (tail?.kind === 'got') {
      popupQueue.value = [...q.slice(0, -1), { ...tail, items: mergeGot(tail.items, p.items) }]
      return
    }
  }
  if (p.kind === 'level') {
    // Several level-ups at once: keep the highest, add up the coins.
    const old = q.findIndex((x, i) => i > 0 && x.kind === 'level')
    if (old > 0) {
      const o = q[old] as Extract<Popup, { kind: 'level' }>
      q[old] = { ...o, level: Math.max(o.level, p.level), coins: o.coins + p.coins }
      popupQueue.value = q
      return
    }
  }
  popupQueue.value = [...q, { ...p, key: ++seq } as Popup]
}

export function popPopup() {
  popupQueue.value = popupQueue.value.slice(1)
}

export function mergeGot(a: GotEntry[], b: GotEntry[]): GotEntry[] {
  const out = a.map((x) => ({ ...x }))
  for (const e of b) {
    const hit = out.find((x) => x.kind === e.kind && x.id === e.id)
    if (hit) hit.n += e.n
    else out.push({ ...e })
  }
  return out
}

/** What is new between two snapshots of the bag (items, outfits, stored furniture, pets). */
export function diffGot(
  before: { inventory: Record<string, number>; outfits: string[]; storage: Record<string, number>; pets: string[] },
  after: { inventory: Record<string, number>; outfits: string[]; storage: Record<string, number>; pets: string[] },
): GotEntry[] {
  const out: GotEntry[] = []
  for (const [id, n] of Object.entries(after.inventory)) if (n > (before.inventory[id] ?? 0)) out.push({ kind: 'item', id, n: n - (before.inventory[id] ?? 0) })
  for (const id of after.outfits) if (!before.outfits.includes(id)) out.push({ kind: 'outfit', id, n: 1 })
  for (const [id, n] of Object.entries(after.storage)) if (n > (before.storage[id] ?? 0)) out.push({ kind: 'furniture', id, n: n - (before.storage[id] ?? 0) })
  for (const id of after.pets) if (!before.pets.includes(id)) out.push({ kind: 'pet', id, n: 1 })
  return out
}
