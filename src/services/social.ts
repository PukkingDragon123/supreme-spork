// Social backend abstraction (friends, leaderboards, merit groups, feed).
// The prototype uses a deterministic local simulation so the app feels alive
// offline. A production backend (Firebase / Supabase / custom API)
// implements the same interface.

import type { AvatarLook } from '../art/avatar'
import { OUTFITS } from '../game/data/outfits'
import { SKIN_TONES, HAIR_COLORS } from '../art/palette'
import { Rng, hashString } from '../engine/rng'
import { dayKey, weekKey, weekProgress } from '../game/time'
import { levelFromMerit, titleFor } from '../game/economy'
import type { GameState } from '../game/state'

export interface Profile {
  id: string
  code: string
  name: string
  level: number
  title: string
  look: AvatarLook
  weekly: number
  isYou?: boolean
  online?: boolean
  bio?: string
}

export interface Group {
  id: string
  name: string
  icon: string
  desc: string
  members: Profile[]
  goal: number
  weekly: number
  isYours?: boolean
  joined?: boolean
}

export interface FeedItem {
  id: string
  who: Profile
  text: string
  merit: number
  at: number
  icon: string
  sathu: number
}

export interface SocialBackend {
  friends(s: GameState): Promise<Profile[]>
  lookup(code: string): Promise<Profile | null>
  leaderboard(s: GameState, scope: 'friends' | 'national'): Promise<Profile[]>
  groups(s: GameState): Promise<Group[]>
  feed(s: GameState): Promise<FeedItem[]>
}

const NAMES = [
  'มะปราง', 'ต้นกล้า', 'ใบเตย', 'ข้าวหอม', 'ป๋อมแป๋ม', 'น้ำฝน', 'ภูผา', 'แพรวา', 'ขวัญข้าว', 'เจ้าสัวน้อย',
  'ยายศรี', 'ลุงชม', 'พี่หมีใจบุญ', 'น้องแก้ม', 'ฟ้าใส', 'บุญมา', 'ส้มจี๊ด', 'ทองดี', 'กะทิ', 'มิ้นท์',
  'ปาล์ม', 'เอิร์ธ', 'ครูนก', 'หมอตุ๋ย', 'น้ำหวาน', 'ไข่มุก', 'ตะวัน', 'จันทร์เจ้า', 'โมจิ', 'บัวบาน',
  'สายไหม', 'ข้าวตู', 'เจ๊หมวย', 'เฮียเล้ง', 'น้องเนย', 'พลอย', 'ธาม', 'ภูมิ', 'ใบบัว', 'แสงเดือน',
]

const BIOS = ['ตักบาตรทุกเช้าก่อนไปทำงาน', 'สายมูสายบุญ', 'รักน้องหมาวัด', 'สวดมนต์ก่อนนอนทุกคืน', 'ชอบปิดทองหลังพระ', 'ทำบุญกับครอบครัว']

const ACTIVITY_TEMPLATES: { text: string; icon: string; merit: [number, number] }[] = [
  { text: 'ตักบาตรพระตอนเช้า', icon: 'bowl', merit: [30, 70] },
  { text: 'สวดมนต์บทอิติปิโส', icon: 'book', merit: [12, 20] },
  { text: 'ให้อาหารน้องหมาวัด', icon: 'dog', merit: [8, 20] },
  { text: 'ไหว้พระพิฆเนศขอพรเรื่องงาน', icon: 'incense', merit: [10, 24] },
  { text: 'ปิดทององค์พระ', icon: 'goldleaf', merit: [12, 18] },
  { text: 'ร่วมบริจาคกองบุญข้าวอิ่มท้องน้องหมาจร', icon: 'heart', merit: [40, 120] },
  { text: 'ให้อาหารปลาคาร์ฟในบ่อวัด', icon: 'koi', merit: [6, 14] },
  { text: 'นั่งสมาธิ 10 นาที', icon: 'lotus', merit: [20, 50] },
  { text: 'ตักน้ำมนต์เสริมสิริมงคล', icon: 'water', merit: [8, 12] },
  { text: 'กรวดน้ำอุทิศส่วนกุศลให้คุณพ่อคุณแม่', icon: 'water', merit: [10, 14] },
  { text: 'ลอยกระทงขอพรที่วัดริมน้ำ', icon: 'krathong', merit: [15, 25] },
  { text: 'ตีระฆังครบทั้งแถว', icon: 'bell', merit: [5, 9] },
]

const PUBLIC_GROUPS = [
  { id: 'g_morning', name: 'ชมรมตักบาตรเช้า', icon: 'bowl', desc: 'สายบุญตื่นเช้า ตักบาตรก่อนไปทำงาน' },
  { id: 'g_office', name: 'สายบุญออฟฟิศ', icon: 'book', desc: 'พักเที่ยงสวดมนต์ เลิกงานไหว้พระ' },
  { id: 'g_dogs', name: 'เพื่อนหมาวัด', icon: 'dog', desc: 'รวมพลคนรักน้องหมาวัดและสัตว์จร' },
  { id: 'g_mutelu', name: 'สายมูเตลู', icon: 'incense', desc: 'ไหว้เทพ ขอพร เสริมดวงทุกวัน' },
  { id: 'g_family', name: 'ครอบครัวใจบุญ', icon: 'heart', desc: 'ทำบุญด้วยกันทั้งครอบครัว' },
]

export const GROUP_GOAL = 6000
export const GROUP_MILESTONES = [
  { at: 0.25, coins: 20 },
  { at: 0.5, coins: 40 },
  { at: 1, coins: 100 },
]

function randomLook(rng: Rng): AvatarLook {
  const of = (slot: string) => OUTFITS.filter((o) => o.slot === slot && !o.premium)
  return {
    gender: rng.chance(0.5) ? 'm' : 'f',
    face: rng.int(0, 2),
    skin: rng.int(0, SKIN_TONES.length - 1),
    hairColor: rng.chance(0.75) ? rng.int(0, 2) : rng.int(0, HAIR_COLORS.length - 1),
    hair: rng.pick(of('hair')).id,
    top: rng.pick(of('top')).id,
    bottom: rng.pick(of('bottom')).id,
    head: rng.chance(0.35) ? rng.pick(of('head')).id : null,
    neck: rng.chance(0.2) ? rng.pick(of('neck')).id : null,
    hand: null,
  }
}

/** Deterministic simulated player for a friend code. */
export function simulatedProfile(code: string, strength = 1): Profile {
  const rng = new Rng(`profile:${code}`)
  const name = NAMES[hashString(code) % NAMES.length]
  const daily = rng.range(60, 260) * strength
  const wk = weekKey()
  const noise = new Rng(`${code}:${wk}`).range(0.75, 1.25)
  const weekly = Math.round(daily * 7 * weekProgress() * noise)
  const lifetime = Math.round(daily * rng.range(12, 160))
  const lv = levelFromMerit(lifetime).level
  return {
    id: code,
    code,
    name,
    level: lv,
    title: titleFor(lv),
    look: randomLook(rng),
    weekly,
    online: new Rng(`${code}:${dayKey()}:${new Date().getHours()}`).chance(0.35),
    bio: rng.pick(BIOS),
  }
}

export function youProfile(s: GameState): Profile {
  const lv = levelFromMerit(s.merit).level
  return {
    id: 'you',
    code: s.player.friendCode,
    name: s.player.name,
    level: lv,
    title: titleFor(lv),
    look: s.player.look,
    weekly: s.week.key === weekKey() ? s.week.merit : 0,
    isYou: true,
    online: true,
  }
}

function codeFrom(seed: string, i: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rng = new Rng(`${seed}:${i}`)
  let c = 'BD-'
  for (let k = 0; k < 6; k++) c += chars[rng.int(0, chars.length - 1)]
  return c
}

/** Friends every new player starts with (so the leaderboard isn't empty). */
export function starterFriendCodes(seed: string): string[] {
  return Array.from({ length: 7 }, (_, i) => codeFrom(`starter:${seed}`, i))
}

export class LocalSocialBackend implements SocialBackend {
  async friends(s: GameState): Promise<Profile[]> {
    const codes = [...starterFriendCodes(s.player.friendCode), ...s.social.friends]
    return codes.map((c) => simulatedProfile(c))
  }

  async lookup(code: string): Promise<Profile | null> {
    if (!/^BD-[A-Z0-9]{6}$/.test(code)) return null
    return simulatedProfile(code)
  }

  async leaderboard(s: GameState, scope: 'friends' | 'national'): Promise<Profile[]> {
    const others =
      scope === 'friends'
        ? await this.friends(s)
        : Array.from({ length: 40 }, (_, i) => simulatedProfile(codeFrom('national', i), 2.4 - i * 0.04))
    return [...others, youProfile(s)].sort((a, b) => b.weekly - a.weekly)
  }

  async groups(s: GameState): Promise<Group[]> {
    const you = youProfile(s)
    const friends = await this.friends(s)
    const out: Group[] = PUBLIC_GROUPS.map((g) => {
      const n = 5 + (hashString(g.id) % 6)
      const members = Array.from({ length: n }, (_, i) => simulatedProfile(codeFrom(g.id, i), 0.9))
      return { ...g, members, goal: GROUP_GOAL, weekly: 0 }
    })
    for (const c of s.social.created) {
      out.unshift({ id: c.id, name: c.name, icon: c.icon, desc: 'กลุ่มทำบุญของคุณ ชวนเพื่อนมาสะสมบุญด้วยกัน', members: friends.slice(0, 3), goal: 3000, weekly: 0, isYours: true })
    }
    for (const g of out) {
      g.joined = s.social.groupId === g.id
      if (g.joined) g.members = [you, ...g.members]
      g.weekly = g.members.reduce((sum, m) => sum + m.weekly, 0)
    }
    return out
  }

  async feed(s: GameState): Promise<FeedItem[]> {
    const friends = await this.friends(s)
    const now = Date.now()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const items: FeedItem[] = []
    for (const f of friends) {
      const rng = new Rng(`feed:${f.code}:${dayKey()}`)
      const n = rng.int(1, 3)
      for (let i = 0; i < n; i++) {
        const t = rng.pick(ACTIVITY_TEMPLATES)
        const hour = rng.range(5.5, 22)
        const at = start.getTime() + hour * 3600_000
        if (at > now) continue
        items.push({
          id: `${f.code}:${dayKey()}:${i}`,
          who: f,
          text: t.text,
          merit: rng.int(t.merit[0], t.merit[1]),
          at,
          icon: t.icon,
          sathu: rng.int(0, 24),
        })
      }
    }
    return items.sort((a, b) => b.at - a.at).slice(0, 30)
  }
}

let backend: SocialBackend = new LocalSocialBackend()

export function setSocialBackend(b: SocialBackend) {
  backend = b
}

export function social(): SocialBackend {
  return backend
}
