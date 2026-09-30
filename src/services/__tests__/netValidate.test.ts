import { describe, expect, it } from 'vitest'
import { bodyDefaults } from '../../art/body'
import {
  NET_LIMITS,
  cleanChat,
  cleanLines,
  cleanLook,
  cleanMapId,
  cleanName,
  cleanText,
  filterProfanity,
  lobbyPresence,
  mapPresence,
  parseChat,
  parseEmote,
  parseGift,
  parsePresence,
  parseSathu,
  roomName,
  applyMePatch,
  defaultMe,
  toNetPlayer,
} from '../netValidate'
import { DEFAULT_LOOK } from '../../art/avatar'

describe('cleanText', () => {
  it('drops control, zero-width and bidi characters and collapses spaces', () => {
    expect(cleanText('สวัส​ดี‮  ค่ะ\u0007\n', 60)).toBe('สวัสดี ค่ะ')
  })

  it('keeps emoji joiners but caps runs of them', () => {
    expect(cleanText('👩‍‍👧', 20)).toBe('👩‍👧')
  })

  it('cuts to the limit without splitting a surrogate pair', () => {
    const s = cleanText('ab🙏🙏🙏', 4)
    expect(s.length).toBeLessThanOrEqual(4)
    expect(s).toBe('ab🙏')
  })

  it('caps stacked combining marks (zalgo)', () => {
    expect(cleanText('ก่้๊๋่้', 20)).toBe('ก่้๊')
  })

  it('rejects non-strings', () => {
    expect(cleanText({ toString: () => 'x' }, 10)).toBe('')
    expect(cleanText(42, 10)).toBe('')
  })
})

describe('profanity filter', () => {
  it('masks Thai and English swear words, even split up or in leetspeak', () => {
    expect(filterProfanity('ไอ้เหี้ย')).toBe('ไอ้***')
    expect(filterProfanity('เห ี้ ย')).toBe('***')
    expect(filterProfanity('what the FUCK')).toBe('what the ***')
    expect(filterProfanity('f.u.c.k you')).toBe('*** you')
    expect(filterProfanity('sh1t')).toBe('***')
  })

  it('leaves ordinary merit-making talk alone', () => {
    for (const s of ['สาธุ อนุโมทนาบุญ', 'ไปตักบาตรกันไหม', 'ขอบคุณมากนะ 💕', 'hello friend']) expect(filterProfanity(s)).toBe(s)
  })

  it('chat lines are cleaned, filtered and never empty', () => {
    expect(cleanChat('  ควย  ')).toBeNull()
    expect(cleanChat('x'.repeat(100))!.length).toBe(NET_LIMITS.chat)
    expect(cleanChat('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>')
  })
})

describe('ids and looks', () => {
  it('accepts map ids and turns them into room names', () => {
    expect(cleanMapId('wat')).toBe('wat')
    expect(cleanMapId('wat:ubosot')).toBe('wat:ubosot')
    expect(cleanMapId('hub_chatuchak')).toBe('hub_chatuchak')
    expect(cleanMapId('../etc')).toBeNull()
    expect(cleanMapId('a'.repeat(60))).toBeNull()
    for (const id of ['wat', 'wat:ubosot', 'hub_chatuchak', 'fair_temple']) expect(roomName(id)).toMatch(/^[a-z0-9][a-z0-9_.-]{0,47}$/)
    expect(roomName('wat:ubosot')).toBe('map-wat.ubosot')
  })

  it('rebuilds looks from known outfits only (unknown → default)', () => {
    const l = cleanLook({ gender: 'm', skin: 99, face: -1, hairColor: 2, hair: 'hair_short', top: 'bot_khaki', bottom: '<script>', head: 'nope', __proto__: { x: 1 } })
    expect(l.gender).toBe('m')
    expect(l.skin).toBe(DEFAULT_LOOK.skin)
    expect(l.face).toBe(0)
    expect(l.hairColor).toBe(2)
    expect(l.hair).toBe('hair_short')
    expect(l.top).toBe(DEFAULT_LOOK.top)
    expect(l.bottom).toBe(DEFAULT_LOOK.bottom)
    expect(l.head).toBeNull()
    expect(cleanLook(null)).toEqual({ ...DEFAULT_LOOK, ...bodyDefaults('f') })
  })

  it('names are cleaned and filtered', () => {
    expect(cleanName('  มะปราง​  ')).toBe('มะปราง')
    expect(cleanName('')).toBeNull()
    expect(cleanName('x'.repeat(40))!.length).toBe(NET_LIMITS.name)
  })
})

describe('presence', () => {
  it('round-trips our own presence through the parser', () => {
    const me = applyMePatch(defaultMe(), { name: 'มะปราง', level: 7, map: 'wat', x: 120.26, y: 300, face: 'left', moving: true, pet: 'nope', friendCode: 'BD-ABC234', doing: 'กำลังตักบาตร' })
    expect(me.pet).toBeNull()
    const info = parsePresence(JSON.parse(JSON.stringify(mapPresence(me))))!
    expect(info.name).toBe('มะปราง')
    expect(info.map).toBe('wat')
    expect(info.full).toMatchObject({ x: 120.3, y: 300, face: 'left', moving: true, doing: 'กำลังตักบาตร' })
    const p = toNetPlayer('peer1', info, { guest: true, accountName: 'Somchai' })
    expect(p).toMatchObject({ id: 'peer1', level: 7, friendCode: 'BD-ABC234', guest: true, accountName: 'Somchai' })
  })

  it('lobby presence is small and has no position', () => {
    const me = applyMePatch(defaultMe(), { name: 'ต้นกล้า', level: 3, map: 'hub_chatuchak', x: 1, y: 2 })
    const lobby = lobbyPresence(me)
    expect(JSON.stringify(lobby).length).toBeLessThan(200)
    expect(parsePresence(lobby)!.full).toBeUndefined()
  })

  it('drops or clamps hostile presence', () => {
    expect(parsePresence({ n: '', m: 'wat' })).toBeNull()
    expect(parsePresence({ n: 'x', m: 'bad map!' })).toBeNull()
    expect(parsePresence('hello')).toBeNull()
    const info = parsePresence({ n: 'x', m: 'wat', lv: 1e9, x: -50, y: 1e12, f: 'sideways', d: 'เหี้ย' })!
    expect(info.level).toBe(NET_LIMITS.level)
    expect(info.full).toMatchObject({ x: 0, y: NET_LIMITS.coord, face: 'down', doing: '***' })
    expect(parsePresence({ n: 'x', m: 'wat', x: NaN, y: 1 })!.full).toBeUndefined()
  })
})

describe('event payloads', () => {
  it('parses chat, emotes and สาธุ', () => {
    expect(parseChat({ text: 'สาธุ' })).toEqual({ text: 'สาธุ' })
    expect(parseChat({ text: 5 })).toBeNull()
    expect(parseChat('สาธุ')).toBeNull()
    expect(parseEmote({ e: 'dance' })).toEqual({ e: 'dance' })
    expect(parseEmote({ e: 'explode' })).toBeNull()
    expect(parseSathu({ to: 'abc123' })).toEqual({ to: 'abc123' })
    expect(parseSathu({ to: 'a b' })).toBeNull()
  })

  it('gifts: only known shop items, few units, capped value', () => {
    expect(parseGift({ t: 'offer', to: 'p1', gid: 'abcdef12', id: 'lotus', n: 2 })).toMatchObject({ t: 'offer', id: 'lotus', n: 2 })
    expect(parseGift({ t: 'offer', to: 'p1', gid: 'abcdef12', id: 'lotus', n: 50 })).toBeNull()
    expect(parseGift({ t: 'offer', to: 'p1', gid: 'abcdef12', id: 'dragon_egg', n: 1 })).toBeNull()
    expect(parseGift({ t: 'offer', to: 'p1', gid: 'abcdef12', id: 'lottery_ticket', n: 1 })).toBeNull()
    expect(parseGift({ t: 'ack', to: 'p1', gid: 'abcdef12', ok: true })).toMatchObject({ t: 'ack', ok: true })
    expect(parseGift({ t: 'ack', to: 'p1', gid: 'abcdef12', ok: 'yes', why: 'haha' })).toEqual({ t: 'ack', to: 'p1', gid: 'abcdef12', ok: false })
  })

  it('trade lines: merge duplicates, cap quantities, reject unknown or bound items', () => {
    expect(cleanLines([{ k: 'item', id: 'lotus', n: 3 }, { k: 'item', id: 'lotus', n: 30 }])).toEqual([{ k: 'item', id: 'lotus', n: NET_LIMITS.tradeQty }])
    expect(cleanLines([{ k: 'item', id: 'nope', n: 1 }])).toBeNull()
    expect(cleanLines([{ k: 'outfit', id: 'top_white', n: 1 }])).toBeNull()
    expect(cleanLines([{ k: 'item', id: 'lotus', n: 0 }])).toBeNull()
    expect(cleanLines([{ k: 'item', id: 'lotus', n: 1.5 }])).toBeNull()
    expect(cleanLines('lotus')).toBeNull()
    const many = ['rice', 'sticky', 'curry', 'egg', 'dessert', 'banana', 'water'].map((id) => ({ k: 'item', id, n: 1 }))
    expect(cleanLines(many)).toBeNull()
  })
})
