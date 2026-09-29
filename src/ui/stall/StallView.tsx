// First-person stall screen: the canvas scene, the shopkeeper's typed-out
// speech bubble with reply choices, the product detail card and the
// purchase juice (flying coins, reactions, sparkles).
//
//   <StallView shop={shopFor('wat_phra_kaew_icecream')} onClose={…}
//     extraChoices={[{ label: 'มีอะไรให้ช่วยไหม?', onPick: (npc) => npc.say('…') }]} />
//
// Other systems can also add reply choices to every stall with
// `registerStallChoices((shop) => [...])`.

import './stall.css'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { game, level } from '../../game/state'
import { SNACK_BY_ID, type PlaceShop } from '../../game/data/placeShops'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { ITEM_BY_ID } from '../../game/data/items'
import { COLLECTIBLE_BY_ID, RARITY_INFO } from '../../game/data/collectibles'
import { buyCollectible, rotationCountdown, SEASON_NAMES } from '../../game/collectibles'
import { buySnack, buyGrocery, buyStallOutfit, stallKindFor, stallNpc, tryHaggle, type StallNpc } from '../../game/stalls'
import { PLACE_BY_ID } from '../../game/data/places'
import { addCoins, equip, ownsOutfit } from '../../game/actions'
import { toast } from '../../game/events'
import { sfx, haptic } from '../../engine/audio'
import { useStage } from '../../activities/kit'
import { PBtn, type Tone } from '../components/kit'
import { Coin, Icon } from '../components/common'
import { PT, TONE_TEXT } from '../pixeltext'
import { coinStoreOpen, openPanel } from '../store'
import { signInk } from '../../art/stall'
import type { DollPose } from '../../art/doll'
import { StallScene, type Emote } from './scene'
import { stallProducts, type Product } from './products'
import { brokeLine, buyLine, byeLine, haggleLine, lookLine, pokeLine, recommendLine, soldOutLine, thanksLine } from './dialogue'
import type { CollectibleKind } from '../../game/data/collectibleTypes'

export interface StallApi {
  shop: PlaceShop
  npc: StallNpc
  /** Make the shopkeeper say one or more lines (tap to advance). */
  say(lines: string | string[], o?: { pose?: DollPose; emote?: Emote }): void
  /** Say something and offer your own reply buttons until one is picked. */
  ask(lines: string | string[], choices: StallChoice[]): void
  react(pose: DollPose, emote?: Emote): void
  close(): void
  /** Re-read stock / state (e.g. after granting something). */
  refresh(): void
}

export interface StallChoice {
  label: string
  onPick: (npc: StallApi) => void
  icon?: string
  tone?: Tone
}

type Provider = (shop: PlaceShop) => StallChoice[]
const providers: Provider[] = []

/** Add reply choices to every stall (e.g. NPC quests). Returns an unregister function. */
export function registerStallChoices(fn: Provider): () => void {
  providers.push(fn)
  return () => {
    const i = providers.indexOf(fn)
    if (i >= 0) providers.splice(i, 1)
  }
}

export const KIND_NAME: Record<CollectibleKind, string> = {
  figure: 'ฟิกเกอร์',
  keychain: 'พวงกุญแจ',
  magnet: 'แม่เหล็กติดตู้เย็น',
  postcard: 'โปสการ์ด',
  amulet: 'ล็อกเก็ตจำลอง',
  plush: 'ตุ๊กตา',
  snowglobe: 'สโนว์โกลบ',
  stamp: 'แสตมป์',
  pin: 'เข็มกลัด',
  relic: 'ของล้ำค่า',
  toy: 'ของเล่น',
  charm: 'ชาร์มห้อย',
}

const BUFF_NAME = { merit: 'บุญ', coin: 'เหรียญ', animal: 'บุญสัตว์' } as const

/** CSS height reserved for the speech bubble (its margin included). */
const BUBBLE_H = 92

// ---------------------------------------------------------------------------
// Typed-out text (grapheme aware so Thai vowels and tone marks stay attached)

const COMBINING = /[ัิ-ฺ็-๎]/

function graphemes(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter
  if (Seg) return [...new Seg('th', { granularity: 'grapheme' }).segment(s)].map((x) => x.segment)
  const out: string[] = []
  for (const ch of s) {
    if (COMBINING.test(ch) && out.length) out[out.length - 1] += ch
    else out.push(ch)
  }
  return out
}

function useTyped(text: string, id: number) {
  const segs = useMemo(() => graphemes(text), [text, id])
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    let i = 0
    const t = setInterval(() => {
      i += 1
      setN(i)
      if (i >= segs.length) clearInterval(t)
    }, 26)
    return () => clearInterval(t)
  }, [text, id])
  return { shown: segs.slice(0, n).join(''), done: n >= segs.length, skip: () => setN(segs.length) }
}

// ---------------------------------------------------------------------------

function flyCoins(root: HTMLElement | null, from: DOMRect | null, to: [number, number] | null, n = 7) {
  if (!root || !from || !to) return
  const r0 = root.getBoundingClientRect()
  const sx = from.left + from.width / 2 - r0.left
  const sy = from.top + from.height / 2 - r0.top
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div')
    el.className = 'stall-coin'
    el.style.left = `${sx - 9 + (Math.random() - 0.5) * 30}px`
    el.style.top = `${sy - 9}px`
    root.appendChild(el)
    const dx = to[0] - sx + (Math.random() - 0.5) * 16
    const dy = to[1] - sy
    const anim = el.animate(
      [
        { transform: 'translate(0,0) scale(0.6) rotate(0deg)', opacity: 0 },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.5 - 70 - Math.random() * 30}px) scale(1.15) rotate(180deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.55) rotate(360deg)`, opacity: 0.9 },
      ],
      { duration: 620 + i * 35, delay: i * 55, easing: 'cubic-bezier(.35,.1,.45,1)', fill: 'both' },
    )
    anim.onfinish = () => el.remove()
    setTimeout(() => el.remove(), 2000)
  }
}

export function StallView({ shop, onClose, extraChoices = [] }: { shop: PlaceShop; onClose: () => void; extraChoices?: StallChoice[] }) {
  const kind = useMemo(() => stallKindFor(shop), [shop.id])
  const npc = useMemo(() => stallNpc(shop, kind), [shop.id])
  const { host, scene, stage } = useStage(() => new StallScene(kind, npc), { targetWidth: 156 }, [shop.id])
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const buyBtn = useRef<HTMLDivElement>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  /** Tallest reply list seen this visit: the stall only moves up, never back down. */
  const maxInset = useRef(0)
  const s = game.value
  const [sel, setSel] = useState<number | null>(null)
  const [line, setLine] = useState({ text: shop.greeting, id: 0 })
  const [queue, setQueue] = useState<string[]>([])
  const [custom, setCustom] = useState<StallChoice[] | null>(null)
  const [discount, setDiscount] = useState(0)
  const [page, setPage] = useState(0)
  const [closing, setClosing] = useState(false)
  const [signBox, setSignBox] = useState<[number, number, number, number] | null>(null)
  const [tail, setTail] = useState(50)
  const [, tick] = useState(0)
  const typed = useTyped(line.text, line.id)
  const lineId = useRef(0)

  const products = useMemo(() => stallProducts(shop, kind, s), [shop.id, s.collection, s.outfits, s.inventory, s.coins])
  const byKey = useMemo(() => new Map(products.map((p) => [p.key, p])), [products])
  const pages = scene.current?.pages ?? []
  const selected = sel !== null ? scene.current?.productAt(sel) ?? null : null
  const current = selected ? byKey.get(selected.key) ?? selected : null

  const say = (lines: string | string[], o?: { pose?: DollPose; emote?: Emote }) => {
    const arr = (Array.isArray(lines) ? lines : [lines]).filter(Boolean)
    if (!arr.length) return
    lineId.current++
    setLine({ text: arr[0], id: lineId.current })
    setQueue(arr.slice(1))
    if (o?.pose) scene.current?.react(o.pose, o.emote)
  }

  const deselect = () => {
    setSel(null)
    scene.current?.select(null)
  }

  const leave = () => {
    if (closing) return
    setClosing(true)
    deselect()
    say(byeLine(npc), { pose: 'wave' })
    sfx.close()
    setTimeout(onClose, 520)
  }

  const api: StallApi = {
    shop,
    npc,
    say,
    ask: (lines, choices) => {
      say(lines)
      setCustom(choices)
    },
    react: (pose, emote) => scene.current?.react(pose, emote),
    close: leave,
    refresh: () => tick((n) => n + 1),
  }

  // Scene wiring: products, owned set, callbacks, insets.
  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.owned = new Set(Object.keys(game.value.collection.owned))
    sc.setProducts(products)
    setPage(sc.page)
  }, [products, scene.current])

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.talking = !typed.done
  }, [typed.done, scene.current])

  // Fit the stall above the bottom panel. Only the reply list (not the
  // bubble text or the product card) decides the height, so the scene never
  // jumps while you chat or browse.
  useEffect(() => {
    const sc = scene.current
    const st = stage.current
    const el = choicesRef.current
    if (!sc || !st || !el || sel !== null) return
    const fit = () => {
      // The observer also fires when the list is swapped for the card: ignore that.
      if (!st.cssScale || !el.isConnected || !el.offsetHeight) return
      const tabs = panel.current?.querySelector('.stall-pages') as HTMLElement | null
      const bub = bubbleRef.current ? bubbleRef.current.offsetHeight + 18 : BUBBLE_H
      const css = el.offsetHeight + (tabs?.offsetHeight ?? 0) + Math.min(bub, BUBBLE_H + 10) + 10
      maxInset.current = Math.max(maxInset.current, Math.round(css / st.cssScale))
      sc.setInsets(Math.round(58 / st.cssScale), maxInset.current)
      const L = sc.L
      if (L.sign[3]) {
        const [x, y] = st.toCss(L.sign[0], L.sign[1])
        setSignBox([x, y, L.sign[2] * st.cssScale, L.sign[3] * st.cssScale])
      } else setSignBox(null)
      const [hx] = st.toCss(sc.npcHead()[0], 0)
      setTail(Math.round(hx))
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(el)
    const onWin = () =>
      setTimeout(() => {
        maxInset.current = 0
        fit()
      }, 50)
    window.addEventListener('resize', onWin)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', onWin)
    }
  }, [scene.current, stage.current, sel === null, custom?.length, pages.length, extraChoices.length, providers.length])

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.cb = {
      onPick: (slot, p) => {
        if (closing) return
        if (sel === slot) {
          deselect()
          sfx.tap()
          return
        }
        setSel(slot)
        sc.select(slot)
        sfx.plop()
        haptic(8)
        const l = lookLine(npc, p.rarity)
        if (l) say(l)
      },
      onTapNpc: () => {
        sc.react('happy', 'heart', 0.8)
        sfx.tap()
        say(pokeLine(npc))
      },
      onTapEmpty: () => {
        if (sel !== null) deselect()
      },
    }
  })

  useEffect(() => {
    sfx.open()
    if (kind === 'mart') setTimeout(() => sfx.chime(), 150)
    scene.current?.react('wave', undefined, 1.4)
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    if (import.meta.env.DEV) Object.assign(window as unknown as Record<string, unknown>, { __stall: scene.current, __stallStage: stage.current })
    return () => clearInterval(id)
  }, [scene.current])

  // ---------------------------------------------------------------------------
  // Reply choices

  const recommend = () => {
    const sc = scene.current
    if (!sc) return
    const rank = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 }
    const owned = game.value.collection.owned
    const best = [...products]
      .filter((p) => p.left !== 0 && (p.kind !== 'outfit' || !ownsOutfit(p.id)))
      .sort((a, b) => score(b) - score(a))[0]
    function score(p: Product) {
      if (p.kind === 'collectible') return 10 + (rank[p.rarity!] ?? 0) * 3 + (owned[p.id] ? 0 : 4) + Math.random()
      if (p.kind === 'snack') return 8 + Math.random() * 6
      return 4 + Math.random()
    }
    if (!best) {
      say(recommendLine(npc, shop, null), { pose: 'think', emote: 'sweat' })
      return
    }
    const pi = sc.pages.findIndex((pg) => [...pg.placed.values()].some((x) => x.key === best.key))
    if (pi >= 0 && pi !== sc.page) {
      sc.goPage(pi)
      setPage(pi)
    }
    const slot = [...(sc.pages[pi]?.placed ?? new Map()).entries()].find(([, x]) => x.key === best.key)?.[0]
    if (slot !== undefined) {
      setSel(slot)
      sc.select(slot)
    }
    say(recommendLine(npc, shop, { name: best.name, rarity: best.rarity, kind: best.kind }), { pose: 'wave', emote: 'bang' })
  }

  const haggle = () => {
    if (discount > 0) {
      say(`ลดให้ ${Math.round(discount * 100)}% แล้วไง ชิ้นต่อไปเลย~`, { pose: 'think', emote: 'sweat' })
      return
    }
    const r = tryHaggle(shop.id)
    say(haggleLine(npc, r.discount, r.again), { pose: r.discount ? 'happy' : 'think', emote: r.discount ? 'sweat' : r.again ? 'bang' : 'anger' })
    if (r.discount) {
      setDiscount(r.discount)
      sfx.sparkle()
    } else sfx.error()
  }

  const thank = () => {
    say(thanksLine(npc, shop), { pose: 'wai', emote: 'heart' })
    sfx.chime()
  }

  const polite = s.player.look.gender === 'm' ? 'ครับ' : 'ค่ะ'
  const baseChoices: StallChoice[] = [
    { label: 'มีอะไรแนะนำบ้าง?', icon: 'star', onPick: recommend },
    { label: 'ขอลดหน่อยได้ไหม~', icon: 'coin', onPick: haggle },
    { label: `ขอบคุณ${polite}`, icon: 'heart', onPick: thank },
  ]
  const injected = [...providers.flatMap((f) => f(shop)), ...extraChoices]
  const choices = custom ?? [...injected, ...baseChoices]

  // ---------------------------------------------------------------------------
  // Buying

  const priceOf = (p: Product) => Math.max(1, Math.round(p.price * (1 - discount)))

  const buy = (p: Product) => {
    const sc = scene.current
    if (!sc || sel === null) return
    const price = priceOf(p)
    if (p.left === 0) {
      say(soldOutLine(npc), { pose: 'think', emote: 'sweat' })
      sfx.error()
      return
    }
    if (game.value.coins < price) {
      say(brokeLine(npc), { pose: 'think', emote: 'sweat' })
      toast('บุญคอยน์ไม่พอ เติมหรือดูโฆษณารับฟรีได้นะ', 'coin', 'warn')
      sfx.error()
      return
    }
    let ok = false
    let rare = false
    if (p.kind === 'snack') {
      const sn = SNACK_BY_ID[p.id]
      ok = !!sn && buySnack(sn, price)
      if (ok) {
        setTimeout(() => sfx.munch(), 450)
        toast(`อร่อยจัง! ${sn.name} ช่วยเพิ่มพลัง${BUFF_NAME[sn.buff.kind]} x${sn.buff.mult} ${sn.buff.minutes} นาที`, sn.icon)
      }
    } else if (p.kind === 'grocery') {
      ok = buyGrocery(p.id, price)
      const it = ITEM_BY_ID[p.id]
      if (ok) toast(`ได้${it.name}${(it.pack ?? 1) > 1 ? ` ×${it.pack}` : ''} ใส่กระเป๋าแล้ว`, it.icon)
    } else if (p.kind === 'outfit') {
      const o = OUTFIT_BY_ID[p.id]
      ok = buyStallOutfit(p.id)
      if (ok) {
        if (price < o.price) addCoins(o.price - price)
        equip(o.slot, o.id)
        toast(`ได้${o.name}แล้ว ของหายากเลยนะ! ใส่ให้แล้ว`, 'shirt')
        rare = true
      }
    } else if (p.kind === 'collectible' && p.stock) {
      const first = !game.value.collection.owned[p.id]
      ok = buyCollectible(shop.id, p.stock, price)
      const c = COLLECTIBLE_BY_ID[p.id]
      rare = c.rarity === 'rare' || c.rarity === 'epic' || c.rarity === 'legendary'
      if (ok) toast(first ? `ของสะสมใหม่! ${c.name} เข้าสมุดสะสมแล้ว` : `ได้${c.name}เพิ่มอีกชิ้น (มี ${game.value.collection.owned[p.id]})`, 'gift')
    }
    if (!ok) return
    const st = stage.current
    flyCoins(root.current, buyBtn.current?.getBoundingClientRect() ?? null, st ? st.toCss(...sc.npcHands()) : null, Math.min(12, 4 + Math.round(price / 40)))
    sfx.purchase()
    haptic(20)
    setTimeout(() => {
      sc.react('happy', rare ? 'sparkle' : 'heart', 1.2)
      sc.bought(sel, rare)
      say(buyLine(npc, shop, p.kind))
    }, 520)
    if (discount) setDiscount(0)
    setTimeout(() => deselect(), 700)
  }

  const onChoice = (c: StallChoice) => {
    if (closing) return
    sfx.tap()
    if (custom) setCustom(null)
    deselect()
    c.onPick(api)
  }

  const advance = () => {
    if (!typed.done) return typed.skip()
    if (queue.length) {
      lineId.current++
      setLine({ text: queue[0], id: lineId.current })
      setQueue(queue.slice(1))
    }
  }

  const place = shop.place ? PLACE_BY_ID[shop.place] : null
  const ink = signInk(kind)
  const pageLabels = pages.map((p) => p.label)

  return (
    <div class={`stall stall-${kind} ${closing ? 'closing' : ''}`} ref={root}>
      <div class="stage-host stall-stage" ref={host} />
      <div class="act-top stall-top">
        <button class="btn paper small icon-btn" onClick={leave} aria-label="ออกจากร้าน">
          <PT text="‹" size={16} weight={600} {...TONE_TEXT.paper} />
        </button>
        {!signBox ? (
          <div class="title-plate wood act-title">
            <PT text={shop.name} size={12} weight={600} {...TONE_TEXT.wood} />
          </div>
        ) : (
          <span class="grow" />
        )}
        <button class="hud2-coins" onClick={() => (coinStoreOpen.value = true)} aria-label="เติมบุญคอยน์">
          <Icon name="coin" size={18} />
          <PT text={s.coins.toLocaleString('en-US')} size={13} weight={600} {...TONE_TEXT.wood} />
        </button>
      </div>
      {signBox && (
        <div class="stall-sign" style={{ left: `${signBox[0]}px`, top: `${signBox[1]}px`, width: `${signBox[2]}px`, height: `${signBox[3]}px` }}>
          <PT text={shop.name} size={13} weight={600} color={ink.color} shadow={ink.shadow} />
          <span class="stall-timer" style={{ color: ink.color }}>
            ของหมุนเวียนใหม่ใน {rotationCountdown()}
          </span>
        </div>
      )}
      <div class="stall-panel" ref={panel}>
        {pageLabels.length > 1 && (
          <div class="stall-pages" role="tablist">
            {pageLabels.map((l, i) => (
              <button
                key={l}
                role="tab"
                aria-selected={i === page}
                class={`chip ${i === page ? 'green' : ''}`}
                onClick={() => {
                  sfx.whoosh()
                  deselect()
                  scene.current?.goPage(i)
                  setPage(i)
                }}
              >
                {l}
              </button>
            ))}
          </div>
        )}
        {!current && (
          <div class="panel stall-bubble" ref={bubbleRef} onClick={advance} style={{ ['--tail' as string]: `${tail}px` }}>
            <span class="stall-npc-name">{npc.name}</span>
            {discount > 0 && <span class="chip green small stall-deal">ลด {Math.round(discount * 100)}% ชิ้นถัดไป</span>}
            <p class="stall-say">
              {typed.shown}
              {!typed.done && <span class="stall-caret" />}
            </p>
            {typed.done && queue.length > 0 && <span class="stall-more">▼</span>}
          </div>
        )}
        {current ? (
          <Detail p={current} price={priceOf(current)} discount={discount} onClose={() => (sfx.tap(), deselect())} onBuy={() => buy(current)} btnRef={buyBtn} placeName={place?.name} npcName={npc.name} say={typed.shown} />
        ) : (
          <div class="stall-choices" ref={choicesRef}>
            {choices.map((c) => (
              <button key={c.label} class={`stall-reply ${c.tone === 'gold' ? 'gold' : ''}`} onClick={() => onChoice(c)}>
                {c.icon && <Icon name={c.icon} size={18} />}
                <span class="grow stall-reply-text">{c.label}</span>
                <span class="stall-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ children }: { children: ComponentChildren }) {
  return <div class="stall-row">{children}</div>
}

function Detail({ p, price, discount, onClose, onBuy, btnRef, placeName, npcName, say }: { p: Product; price: number; discount: number; onClose: () => void; onBuy: () => void; btnRef: { current: HTMLDivElement | null }; placeName?: string; npcName: string; say: string }) {
  const s = game.value
  const c = p.kind === 'collectible' ? COLLECTIBLE_BY_ID[p.id] : null
  const sn = p.kind === 'snack' ? SNACK_BY_ID[p.id] : null
  const it = p.kind === 'grocery' ? ITEM_BY_ID[p.id] : null
  const o = p.kind === 'outfit' ? OUTFIT_BY_ID[p.id] : null
  const rar = p.rarity ? RARITY_INFO[p.rarity] : null
  const foil = p.rarity === 'epic' || p.rarity === 'legendary'
  const owned = c ? s.collection.owned[c.id] ?? 0 : 0
  const hasOutfit = o ? ownsOutfit(o.id) : false
  const locked = o && (o.level ?? 1) > level.value.level ? o.level ?? 1 : 0
  const soldOut = p.left === 0
  const url = p.bigUrl()
  return (
    <div class={`panel stall-card ${foil ? 'foil' : ''}`} style={{ ['--rar' as string]: rar?.color ?? '#e0bb8a' }}>
      <button class="btn red icon-btn small stall-card-x" onClick={onClose} aria-label="ปิด">
        <Icon name="close" size={14} />
      </button>
      <div class="stall-card-say">
        <b>{npcName}</b> {say || '…'}
        {discount > 0 && <span class="stall-deal-inline">ลด {Math.round(discount * 100)}%</span>}
      </div>
      <div class="stall-card-top">
      <div class="stall-card-art" style={{ ['--art' as string]: `url(${url})` }}>
        <img class="px" src={url} alt="" draggable={false} />
        {foil && <span class="stall-foil" />}
      </div>
      <div class="stall-card-info">
        <b class="stall-card-name">{p.name}</b>
        <div class="stall-tags">
          {rar && (
            <span class="stall-rar" style={{ background: rar.color, color: rar.dark }}>
              {'★'.repeat(rar.stars)} {rar.name}
            </span>
          )}
          {c && <span class="stall-kind">{KIND_NAME[c.kind]}</span>}
          {c?.season && c.season !== 'always' && <span class="stall-kind season">{SEASON_NAMES[c.season]}</span>}
          {sn && <span class="chip green small">{`${BUFF_NAME[sn.buff.kind]} x${sn.buff.mult} · ${sn.buff.minutes} นาที`}</span>}
          {o && <span class="chip gold small">มีขายที่นี่ที่เดียว</span>}
        </div>
        <p class="stall-card-desc">{p.desc}</p>
      </div>
      </div>
      <div class="stall-card-foot">
        <Row>
          {c && (
            <>
              <span class={`stall-stock ${soldOut ? 'out' : (p.left ?? 9) <= 1 ? 'low' : ''}`}>{soldOut ? 'หมดแล้ววันนี้' : `เหลือ ${p.left}/${p.stock?.qty ?? p.left} ชิ้น`}</span>
              <span class="small muted">
                {p.stock?.fixed ? `ของขึ้นชื่อ${placeName ?? 'ประจำร้าน'}` : 'ของหมุนเวียนวันนี้'}
                {owned > 0 ? ` · มีแล้ว ×${owned}` : ''}
              </span>
              {!owned && <span class="stall-newtag">ยังไม่มีในสมุด!</span>}
            </>
          )}
          {it && <span class="small muted">มีอยู่ {s.inventory[it.id] ?? 0} · ได้ {it.pack ?? 1} ชิ้นต่อแพ็ค</span>}
          {sn && <span class="small muted">กินแล้วได้พลังพิเศษทันที</span>}
          {o && <span class="small muted">{hasOutfit ? 'มีชุดนี้แล้ว' : locked ? `ปลดล็อกที่เลเวล ${locked}` : 'ซื้อแล้วใส่ให้ทันที'}</span>}
        </Row>
      <div class="stall-buy" ref={btnRef}>
        {o && hasOutfit ? (
          <PBtn tone="green" icon="shirt" onClick={() => (equip(o.slot, o.id), sfx.tap(), onClose())}>
            ใส่เลย
          </PBtn>
        ) : locked ? (
          <PBtn tone="paper" icon="lock" disabled>
            {`ต้องเลเวล ${locked}`}
          </PBtn>
        ) : soldOut ? (
          <PBtn tone="paper" disabled>
            หมดแล้ว
          </PBtn>
        ) : (
          <PBtn tone="gold" onClick={onBuy} silent>
            <span class="stall-price">
              {discount > 0 && <s class="stall-old">{p.price}</s>}
              <Coin n={price} size={16} />
              <PT text="ซื้อ" size={13} weight={600} {...TONE_TEXT.gold} />
            </span>
          </PBtn>
        )}
      </div>
      </div>
    </div>
  )
}

/** Close helper for the panel router. */
export function closeStall() {
  openPanel(null)
}
