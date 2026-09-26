// All state changes go through these actions so rules (multipliers, daily
// limits, quests, achievements, level ups) live in one place.

import { game, mutate, replaceState, defaultState, emptyDaily, storage, type BuffKind, type GameState, type Settings } from './state'
import { levelFromMerit, levelUpCoins, applyMerit, repeatFactor, loginReward } from './economy'
import { dayKey, weekKey, hourOf, isAlmsMorning, daysBetween } from './time'
import { ITEM_BY_ID, BOOSTS } from './data/items'
import { OUTFIT_BY_ID, type Slot } from './data/outfits'
import { AREAS, AREA_BY_ID, type AreaId } from './data/areas'
import { ACHIEVEMENTS, QUEST_POOL, QUESTS_PER_DAY, ALL_QUESTS_BONUS, type GameEvent } from './data/quests'
import { CHANTS } from './data/chants'
import { COIN_PACKS, SPECIAL_OFFERS, AD_DAILY_LIMIT, AD_REWARD_COINS, MATERIAL_PACKS } from './data/store'
import { DOG_BY_ID, MAX_HEARTS } from './data/dogs'
import { notify, toast } from './events'
import { Rng } from '../engine/rng'
import { MATERIAL_INFO, type MaterialId } from './materials'
import { PET_BY_ID } from './data/pets'

const today = () => dayKey()

// ---------------------------------------------------------------------------
// Daily rollover

export function rollQuests(key: string, seed: string, lvl: number, areas: AreaId[]) {
  const rng = new Rng(`${key}:${seed}`)
  const pool = QUEST_POOL.filter((q) => (q.level ?? 1) <= lvl && (!q.area || areas.includes(q.area as AreaId)))
  // Avoid two quests on the same event.
  const picked: typeof pool = []
  for (const q of rng.shuffle([...pool])) {
    if (picked.length >= QUESTS_PER_DAY) break
    if (picked.some((p) => p.event === q.event)) continue
    picked.push(q)
  }
  return picked.map((q) => ({ id: q.id, progress: 0, claimed: false }))
}

export function ensureDaily() {
  const key = today()
  const s = game.value
  if (s.daily.key === key && s.week.key === weekKey()) return
  mutate((d) => {
    if (d.daily.key !== key) {
      const lvl = levelFromMerit(d.merit).level
      d.daily = emptyDaily(key)
      d.daily.quests = rollQuests(key, d.player.friendCode, lvl, unlockedAreas(d))
      for (const dog of Object.values(d.dogs)) {
        dog.fedToday = 0
        dog.petToday = false
      }
    }
    const wk = weekKey()
    if (d.week.key !== wk) d.week = { key: wk, merit: 0 }
    d.buffs = d.buffs.filter((b) => b.until > Date.now())
  })
}

// ---------------------------------------------------------------------------
// Login streak

export function loginInfo() {
  const s = game.value
  const key = today()
  let streak = 1
  if (s.login.last) {
    const gap = daysBetween(s.login.last, key)
    if (gap === 0) streak = s.login.streak
    else if (gap === 1) streak = s.login.streak + 1
  }
  return { canClaim: !s.daily.loginClaimed && s.login.last !== key, streak, reward: loginReward(streak) }
}

export function claimLogin(double = false) {
  const info = loginInfo()
  if (!info.canClaim) return null
  const mult = double ? 2 : 1
  mutate((d) => {
    d.daily.loginClaimed = true
    d.login.last = today()
    d.login.streak = info.streak
    d.login.best = Math.max(d.login.best, info.streak)
    if (info.reward.item) d.inventory[info.reward.item] = (d.inventory[info.reward.item] ?? 0) + (info.reward.qty ?? 1) * mult
  })
  addCoins(info.reward.coins * mult)
  track('login', info.streak)
  return info
}

// ---------------------------------------------------------------------------
// Buffs

export function activeBuffs(kind?: BuffKind) {
  const now = Date.now()
  return game.value.buffs.filter((b) => b.until > now && (!kind || b.kind === kind))
}

export function buffMult(kind: BuffKind): number {
  return activeBuffs(kind).reduce((m, b) => m + (b.mult - 1), 1)
}

export function addBuff(kind: BuffKind, mult: number, minutes: number, source: string) {
  mutate((d) => {
    const now = Date.now()
    d.buffs = d.buffs.filter((b) => b.until > now && b.source !== source)
    d.buffs.push({ id: `${source}:${now}`, kind, mult, until: now + minutes * 60_000, source })
  })
}

// ---------------------------------------------------------------------------
// Merit & coins

export function luckyColorActive(s: GameState = game.value): boolean {
  const top = OUTFIT_BY_ID[s.player.look.top]?.top
  return top?.dayColor === new Date().getDay()
}

export interface MeritOptions {
  /** Repeat key for diminishing returns within a day. */
  key?: string
  /** How many repeats per day are worth full merit. */
  free?: number
  area?: AreaId
  morning?: boolean
  animal?: boolean
}

/** Grant merit (EXP) with every multiplier applied. Returns the amount given. */
/** The active pet's perk multiplier for a kind (1 when it doesn't apply). */
export function petPerk(kind: 'merit' | 'coin' | 'animal' | 'mats', s: GameState = game.value): number {
  const def = s.pet ? PET_BY_ID[s.pet] : null
  return def && def.perk.kind === kind ? 1 + def.perk.pct / 100 : 1
}

export function addMerit(base: number, o: MeritOptions = {}): number {
  const s = game.value
  const count = o.key ? s.daily.counts[o.key] ?? 0 : 0
  let buff = buffMult('merit') * petPerk('merit', s)
  if (o.animal) buff += buffMult('animal') - 1 + (petPerk('animal', s) - 1)
  const gained = applyMerit(base, {
    buffMult: buff,
    luckyColor: luckyColorActive(s),
    morningAlms: !!o.morning && isAlmsMorning(hourOf()),
    areaBonus: o.area ? AREA_BY_ID[o.area]?.meritBonus ?? 1 : 1,
    repeat: o.key ? repeatFactor(count, o.free ?? 3) : 1,
  })
  const before = levelFromMerit(s.merit).level
  mutate((d) => {
    d.merit += gained
    if (d.week.key !== weekKey()) d.week = { key: weekKey(), merit: 0 }
    d.week.merit += gained
    const k = today()
    d.days[k] = (d.days[k] ?? 0) + gained
    if (o.key) d.daily.counts[o.key] = count + 1
  })
  const after = levelFromMerit(game.value.merit).level
  if (after > before) onLevelUp(before, after)
  return gained
}

/** Add merit without multipliers (e.g. the ad-doubled bonus of a result). */
export function grantMeritRaw(n: number): number {
  if (n <= 0) return 0
  const before = levelFromMerit(game.value.merit).level
  mutate((d) => {
    d.merit += n
    if (d.week.key !== weekKey()) d.week = { key: weekKey(), merit: 0 }
    d.week.merit += n
    const k = today()
    d.days[k] = (d.days[k] ?? 0) + n
  })
  const after = levelFromMerit(game.value.merit).level
  if (after > before) onLevelUp(before, after)
  return n
}

function onLevelUp(from: number, to: number) {
  let coins = 0
  const unlocks: string[] = []
  for (let l = from + 1; l <= to; l++) {
    coins += levelUpCoins(l)
    for (const a of AREAS) if (a.unlockLevel === l && l > 1) unlocks.push(`พื้นที่ใหม่: ${a.name}`)
    for (const o of Object.values(OUTFIT_BY_ID)) if (o.level === l) unlocks.push(`ชุดใหม่ในร้าน: ${o.name}`)
    for (const c of CHANTS) if (c.level === l) unlocks.push(`บทสวดใหม่: ${c.name}`)
    for (const i of Object.values(ITEM_BY_ID)) if (i.level === l) unlocks.push(`ของใหม่ในร้าน: ${i.name}`)
  }
  mutate((d) => {
    d.coins += coins
    for (const a of AREAS) if (a.unlockLevel <= to && !d.areas.includes(a.id)) d.areas.push(a.id)
  })
  notify({ kind: 'levelup', level: to, coins, unlocks })
}

export function addCoins(n: number, o: { boost?: boolean } = {}): number {
  const gained = Math.round(n * (o.boost ? buffMult('coin') * petPerk('coin') : 1))
  if (gained <= 0) return 0
  mutate((d) => {
    d.coins += gained
  })
  return gained
}

export function spendCoins(n: number, silent = false): boolean {
  if (game.value.coins < n) {
    if (!silent) toast('บุญคอยน์ไม่พอ เติมหรือดูโฆษณารับฟรีได้นะ', 'coin', 'warn')
    return false
  }
  mutate((d) => {
    d.coins -= n
  })
  return true
}

// ---------------------------------------------------------------------------
// Inventory

export const count = (id: string) => game.value.inventory[id] ?? 0

export function buyItem(id: string, qty = 1): boolean {
  const item = ITEM_BY_ID[id]
  if (!item) return false
  if (!spendCoins(item.price * qty)) return false
  if (id === 'lottery_ticket') {
    mutate((d) => {
      d.daily.lotteryExtra += qty
    })
    return true
  }
  mutate((d) => {
    d.inventory[id] = (d.inventory[id] ?? 0) + (item.pack ?? 1) * qty
  })
  return true
}

export function useItem(id: string, qty = 1): boolean {
  if (count(id) < qty) return false
  mutate((d) => {
    d.inventory[id] = (d.inventory[id] ?? 0) - qty
    if (d.inventory[id] <= 0) delete d.inventory[id]
  })
  return true
}

export function addItems(items: Record<string, number>) {
  mutate((d) => {
    for (const [k, v] of Object.entries(items)) d.inventory[k] = (d.inventory[k] ?? 0) + v
  })
}

export function buyMaterials(id: string): boolean {
  const p = MATERIAL_PACKS.find((x) => x.id === id)
  if (!p || !spendCoins(p.price)) return false
  mutate((d) => {
    for (const [k, v] of Object.entries(p.mats)) d.materials[k as MaterialId] = (d.materials[k as MaterialId] ?? 0) + (v ?? 0)
  })
  return true
}

// ---------------------------------------------------------------------------
// Pets

export function buyPet(id: string): boolean {
  const p = PET_BY_ID[id]
  if (!p || p.premium || game.value.pets.includes(id)) return false
  if (!spendCoins(p.price)) return false
  mutate((d) => {
    d.pets.push(id)
    d.pet = id
  })
  return true
}

export function setPet(id: string | null) {
  mutate((d) => {
    d.pet = id && d.pets.includes(id) ? id : null
  })
}

export function buyBoost(id: string): boolean {
  const b = BOOSTS.find((x) => x.id === id)
  if (!b) return false
  if (!spendCoins(b.price)) return false
  addBuff(b.buff.kind, b.buff.mult, b.buff.minutes, b.id)
  toast(`${b.name} เริ่มทำงานแล้ว!`, b.icon)
  return true
}

// ---------------------------------------------------------------------------
// Wardrobe

export function ownsOutfit(id: string) {
  return game.value.outfits.includes(id)
}

export function buyOutfit(id: string): boolean {
  const o = OUTFIT_BY_ID[id]
  if (!o || ownsOutfit(id) || o.premium) return false
  if ((o.level ?? 1) > levelFromMerit(game.value.merit).level) {
    toast(`ปลดล็อกที่เลเวล ${o.level}`, 'lock', 'warn')
    return false
  }
  if (!spendCoins(o.price)) return false
  mutate((d) => {
    d.outfits.push(id)
  })
  return true
}

export function equip(slot: Slot, id: string | null) {
  mutate((d) => {
    const look = d.player.look
    if (slot === 'hair' && id) look.hair = id
    else if (slot === 'top' && id) look.top = id
    else if (slot === 'bottom' && id) look.bottom = id
    else if (slot === 'head') look.head = id
    else if (slot === 'neck') look.neck = id
    else if (slot === 'hand') look.hand = id
    else if ((slot as string) === 'shoes') look.shoes = id
  })
}

/** Premium hair colours are bought once (stored like outfits). */
export function buyHairColor(key: string, price: number): boolean {
  if (game.value.outfits.includes(key)) return true
  if (!spendCoins(price)) return false
  mutate((d) => {
    d.outfits.push(key)
  })
  return true
}

export function setLook(patch: Partial<GameState['player']['look']>) {
  mutate((d) => {
    d.player.look = { ...d.player.look, ...patch }
  })
}

// ---------------------------------------------------------------------------
// Areas

export function unlockedAreas(s: GameState = game.value): AreaId[] {
  const lvl = levelFromMerit(s.merit).level
  return AREAS.filter((a) => s.areas.includes(a.id) || lvl >= a.unlockLevel).map((a) => a.id)
}

export function isAreaUnlocked(id: AreaId) {
  return unlockedAreas().includes(id)
}

export function unlockArea(id: AreaId): boolean {
  const a = AREA_BY_ID[id]
  if (!a || isAreaUnlocked(id)) return true
  if (!spendCoins(a.unlockPrice)) return false
  mutate((d) => {
    d.areas.push(id)
  })
  toast(`ปลดล็อก ${a.name} แล้ว!`, 'map')
  return true
}

export function setArea(id: AreaId) {
  mutate((d) => {
    d.lastArea = id
  })
}

// ---------------------------------------------------------------------------
// Events → stats, quests, achievements

/** Crafting materials that mini-games drop (a few times per day each). */
export const EVENT_MATERIALS: Partial<Record<GameEvent, MaterialId>> = {
  alms: 'cloth',
  koi_fed: 'flower',
  catfish_fed: 'flower',
  dog_fed: 'wood',
  bell_round: 'gold',
  holy_water: 'clay',
  gold_leaf: 'gold',
  krathong: 'cloth',
  circle_chedi: 'gold',
  wish: 'flower',
  donate: 'clay',
  dedicate: 'flower',
  deity: 'gold',
  siamsi: 'wood',
  lottery: 'wood',
}
export const EVENT_MATERIAL_DAILY = 3

export function track(event: GameEvent, amount = 1) {
  const unlocked: { id: string; name: string; coins: number }[] = []
  const mat = EVENT_MATERIALS[event]
  let dropped = false
  mutate((d) => {
    if (mat) {
      const k = `mat:${event}`
      const n = d.daily.counts[k] ?? 0
      if (n < EVENT_MATERIAL_DAILY) {
        d.daily.counts[k] = n + 1
        // A crafty pet sometimes finds a second one.
        d.materials[mat] = (d.materials[mat] ?? 0) + (Math.random() < (petPerk('mats', d) - 1) * 5 ? 2 : 1)
        dropped = true
      }
    }
    const prev = d.stats[event] ?? 0
    d.stats[event] = event === 'login' ? Math.max(prev, amount) : prev + amount
    for (const q of d.daily.quests) {
      const def = QUEST_POOL.find((x) => x.id === q.id)
      if (def && def.event === event && !q.claimed) q.progress = Math.min(def.target, q.progress + (event === 'login' ? 0 : amount))
    }
    for (const a of ACHIEVEMENTS) {
      if (a.event !== event || d.achievements[a.id]) continue
      if ((d.stats[event] ?? 0) >= a.target) {
        d.achievements[a.id] = Date.now()
        d.coins += a.coins
        unlocked.push({ id: a.id, name: a.name, coins: a.coins })
      }
    }
  })
  for (const u of unlocked) notify({ kind: 'achievement', ...u })
  if (dropped && mat) toast(`ได้${MATERIAL_INFO[mat].name} +1 ไว้ทำเฟอร์นิเจอร์`, 'hammer')
}

export function claimQuest(id: string): boolean {
  const q = game.value.daily.quests.find((x) => x.id === id)
  const def = QUEST_POOL.find((x) => x.id === id)
  if (!q || !def || q.claimed || q.progress < def.target) return false
  mutate((d) => {
    const dq = d.daily.quests.find((x) => x.id === id)
    if (dq) dq.claimed = true
  })
  const coins = addCoins(def.coins, { boost: true })
  const merit = addMerit(def.merit)
  toast(`ภารกิจสำเร็จ +${coins} คอยน์ +${merit} บุญ`, 'scroll')
  return true
}

export function questBonusReady(): boolean {
  const d = game.value.daily
  return d.quests.length > 0 && d.quests.every((q) => q.claimed) && !d.bonusClaimed
}

export function claimQuestBonus(): boolean {
  if (!questBonusReady()) return false
  mutate((d) => {
    d.daily.bonusClaimed = true
    d.inventory.fish_food = (d.inventory.fish_food ?? 0) + 12
    d.inventory.gold_leaf = (d.inventory.gold_leaf ?? 0) + 1
  })
  addCoins(ALL_QUESTS_BONUS.coins, { boost: true })
  addMerit(ALL_QUESTS_BONUS.merit)
  notify({ kind: 'reward', title: 'ทำภารกิจครบทุกข้อ!', merit: ALL_QUESTS_BONUS.merit, coins: ALL_QUESTS_BONUS.coins, items: { fish_food: 12, gold_leaf: 1 } })
  return true
}

// ---------------------------------------------------------------------------
// Temple dogs

export function dogState(id: string) {
  return game.value.dogs[id] ?? { hearts: 0, fedToday: 0, lastFedDay: '', petToday: false }
}

export function feedDog(id: string, itemId: string): { ok: boolean; merit: number; full: boolean } {
  const dog = DOG_BY_ID[id]
  if (!dog) return { ok: false, merit: 0, full: false }
  const st = dogState(id)
  if (st.fedToday >= 3) return { ok: false, merit: 0, full: true }
  if (!useItem(itemId)) return { ok: false, merit: 0, full: false }
  const item = ITEM_BY_ID[itemId]
  const hearts = itemId === 'chicken' ? 2 : 1
  mutate((d) => {
    const cur = d.dogs[id] ?? { hearts: 0, fedToday: 0, lastFedDay: '', petToday: false }
    cur.hearts = Math.min(MAX_HEARTS, cur.hearts + hearts)
    cur.fedToday += 1
    cur.lastFedDay = today()
    d.dogs[id] = cur
  })
  const merit = addMerit(item?.merit ?? 8, { key: `dog:${id}`, free: 2, animal: true, area: dog.area })
  track('dog_fed')
  return { ok: true, merit, full: false }
}

export function petDog(id: string): number {
  const st = dogState(id)
  if (st.petToday) return 0
  mutate((d) => {
    const cur = d.dogs[id] ?? { hearts: 0, fedToday: 0, lastFedDay: '', petToday: false }
    cur.petToday = true
    cur.hearts = Math.min(MAX_HEARTS, cur.hearts + 1)
    d.dogs[id] = cur
  })
  track('dog_pet')
  return addMerit(3, { animal: true })
}

export function setCompanion(id: string | null) {
  mutate((d) => {
    d.companion = id
  })
}

// ---------------------------------------------------------------------------
// Lucky numbers (ขูดเลข)

export function lotteryLeft(): number {
  const d = game.value.daily
  return Math.max(0, 1 + d.lotteryExtra - d.lotteryUsed)
}

export function luckyNumbers(seed: string): { two: string; three: string } {
  const rng = new Rng(seed)
  const three = String(rng.int(0, 999)).padStart(3, '0')
  const two = String(rng.int(0, 99)).padStart(2, '0')
  return { two, three }
}

export function useLottery(source: string): { two: string; three: string } | null {
  if (lotteryLeft() <= 0) return null
  const s = game.value
  const nums = luckyNumbers(`${today()}:${s.player.friendCode}:${source}:${s.daily.lotteryUsed}`)
  mutate((d) => {
    d.daily.lotteryUsed += 1
    d.lotteryLog.unshift({ day: today(), nums: [nums.three, nums.two], source })
    d.lotteryLog = d.lotteryLog.slice(0, 30)
  })
  track('lottery')
  return nums
}

// ---------------------------------------------------------------------------
// Journal entries

export function recordWish(text: string, cat: string, place: string) {
  mutate((d) => {
    d.wishes.unshift({ day: today(), text: text.slice(0, 120), cat, place })
    d.wishes = d.wishes.slice(0, 50)
  })
}

export function recordFortune(n: number) {
  mutate((d) => {
    d.fortunes.unshift({ day: today(), n })
    d.fortunes = d.fortunes.slice(0, 30)
  })
}

export function markDedicated() {
  mutate((d) => {
    d.daily.dedicated = true
  })
}

// ---------------------------------------------------------------------------
// Donations

export function donateBox(coins: number): number {
  if (!spendCoins(coins)) return 0
  track('donate')
  return addMerit(Math.round(coins * 1.5))
}

export function donateCharity(id: string, coins: number): number {
  if (!spendCoins(coins)) return 0
  mutate((d) => {
    d.charity[id] = (d.charity[id] ?? 0) + coins
  })
  track('charity', coins)
  return addMerit(coins * 2)
}

// ---------------------------------------------------------------------------
// Purchases & ads

export function completePurchase(productId: string, tx: string): boolean {
  const pack = COIN_PACKS.find((p) => p.id === productId)
  const offer = SPECIAL_OFFERS.find((p) => p.id === productId)
  if (!pack && !offer) return false
  const price = pack?.priceTHB ?? offer?.priceTHB ?? 0
  mutate((d) => {
    d.purchases.unshift({ id: productId, at: Date.now(), priceTHB: price, tx })
  })
  if (pack) {
    addCoins(pack.coins + pack.bonus)
    notify({ kind: 'reward', title: `ได้รับ ${pack.name}`, merit: 0, coins: pack.coins + pack.bonus, note: 'ขอบคุณที่ร่วมสนับสนุนบุญดี' })
  }
  if (offer) {
    mutate((d) => {
      if (offer.oneTime) d.starterBought = true
      if (offer.outfits) for (const o of offer.outfits) if (!d.outfits.includes(o)) d.outfits.push(o)
      if (offer.pets)
        for (const p of offer.pets) {
          if (!d.pets.includes(p)) d.pets.push(p)
          d.pet = p
        }
      if (offer.monthly) {
        const until = new Date()
        until.setDate(until.getDate() + offer.monthly.days - 1)
        d.monthly.until = dayKey(until)
        d.daily.monthlyClaimed = true
      }
    })
    if (offer.items) addItems(offer.items)
    if (offer.buff) addBuff(offer.buff.kind, offer.buff.mult, offer.buff.minutes, offer.id)
    addCoins(offer.coins)
    notify({ kind: 'reward', title: `ได้รับ ${offer.name}`, merit: 0, coins: offer.coins, items: offer.items, note: offer.desc })
  }
  return true
}

export function monthlyActive(): boolean {
  const u = game.value.monthly.until
  return !!u && u >= today()
}

export function claimMonthly(): number {
  if (!monthlyActive() || game.value.daily.monthlyClaimed) return 0
  const offer = SPECIAL_OFFERS.find((o) => o.monthly)
  const amount = offer?.monthly?.daily ?? 40
  mutate((d) => {
    d.daily.monthlyClaimed = true
  })
  return addCoins(amount)
}

export function adsLeft(): number {
  return Math.max(0, AD_DAILY_LIMIT - game.value.daily.ads)
}

/** Called after a rewarded ad finished. Returns coins granted (if any). */
export function rewardAd(kind: 'coins' | 'bonus'): number {
  if (adsLeft() <= 0) return 0
  mutate((d) => {
    d.daily.ads += 1
  })
  track('ad')
  if (kind === 'coins') return addCoins(AD_REWARD_COINS)
  return 0
}

// ---------------------------------------------------------------------------
// Social

export function reactSathu(feedId: string): number {
  if (game.value.social.reacted[feedId]) return 0
  mutate((d) => {
    d.social.reacted[feedId] = true
    d.daily.sathuGiven += 1
  })
  track('sathu')
  // Rejoicing in others' merit (อนุโมทนา) is itself meritorious.
  return addMerit(2, { key: 'sathu', free: 10 })
}

export function addFriend(code: string): boolean {
  const c = code.trim().toUpperCase()
  if (!/^BD-[A-Z0-9]{6}$/.test(c) || c === game.value.player.friendCode) return false
  if (game.value.social.friends.includes(c)) return false
  mutate((d) => {
    d.social.friends.push(c)
  })
  return true
}

export function joinGroup(id: string | null) {
  mutate((d) => {
    d.social.groupId = id
  })
}

export function createGroup(name: string, icon: string): string {
  const id = `g_${Date.now().toString(36)}`
  mutate((d) => {
    d.social.created.push({ id, name: name.slice(0, 24), icon, createdAt: Date.now() })
    d.social.groupId = id
  })
  return id
}

export function claimGroupReward(key: string, coins: number): boolean {
  if (game.value.social.groupClaims[key]) return false
  mutate((d) => {
    d.social.groupClaims[key] = Date.now()
  })
  addCoins(coins)
  track('group_merit')
  return true
}

// ---------------------------------------------------------------------------
// Settings & profile

export function updateSettings(p: Partial<Settings>) {
  mutate((d) => {
    d.settings = { ...d.settings, ...p }
  })
}

export function finishOnboarding(name: string, birthDay: number) {
  mutate((d) => {
    d.onboarded = true
    d.player.name = name.trim().slice(0, 16) || 'สายบุญ'
    d.player.birthDay = birthDay
  })
}

export function resetGame() {
  storage.clear()
  replaceState(defaultState())
  ensureDaily()
}
