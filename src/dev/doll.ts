// Dev-only HD doll preview: open /dev-doll.html while running `npm run dev`.
// Query params: ?s=poses|faces|hair|items|looks|new|sets|suits|suitsmall|exclusives
// (comma separated, default all) &z=4
// &slot=top (filter the new-items section) &ids=a,b (inspect items large)
import { dollSprite, dollPortrait, dollDefaultLook, FACE_STYLES, type DollPose } from '../art/doll'
import { avatarSprite, type AvatarLook, type Pose, type View } from '../art/avatar'
import { OUTFITS } from '../game/data/outfits'
import type { Sprite } from '../engine/sprite'
import { PACK_OUTFIT_IDS, PASS_FREE_OUTFIT_IDS, PASS_PREMIUM_OUTFIT_IDS, POP_OUTFIT_IDS } from '../game/data/cosmetics'

const root = document.getElementById('g')!
const params = new URLSearchParams(location.search)
const Z = Number(params.get('z') ?? 4)
const section = params.get('s') ?? 'all'
const want = (s: string) => section === 'all' || section.split(',').includes(s)

window.addEventListener('error', (e) => {
  document.getElementById('err')!.textContent += `${e.message}\n`
})

function canvasOf(s: Sprite, z: number) {
  const c = document.createElement('canvas')
  c.width = s.w
  c.height = s.h
  c.style.width = `${s.w * z}px`
  c.style.height = `${s.h * z}px`
  c.getContext('2d')!.drawImage(s.canvas, 0, 0)
  return c
}

function title(t: string) {
  const h = document.createElement('h3')
  h.textContent = t
  root.appendChild(h)
}

function row() {
  const r = document.createElement('div')
  r.className = 'row'
  root.appendChild(r)
  return r
}

function cell(parent: HTMLElement, label: string, sprites: [Sprite, number][]) {
  const c = document.createElement('div')
  c.className = 'cell'
  const p = document.createElement('div')
  p.className = 'pair'
  for (const [s, z] of sprites) p.appendChild(canvasOf(s, z))
  c.appendChild(p)
  const l = document.createElement('div')
  l.textContent = label
  c.appendChild(l)
  parent.appendChild(c)
}

const M = dollDefaultLook('m')
const F = dollDefaultLook('f')

const frontPoses: DollPose[] = ['stand', 'wave', 'wai', 'happy', 'think', 'kneel', 'kneelWai', 'sit']
const backPoses: DollPose[] = ['stand', 'kneel', 'kneelWai', 'bow', 'sit']
const smallFor: Record<string, [View, Pose]> = {
  stand: ['front', 'stand'],
  wave: ['front', 'happy'],
  wai: ['front', 'wai'],
  happy: ['front', 'happy'],
  think: ['front', 'stand'],
  kneel: ['back', 'kneel'],
  kneelWai: ['back', 'wai'],
  bow: ['back', 'bow'],
  sit: ['back', 'sit'],
}

if (want('poses')) {
  for (const [name, look] of [
    ['male', M],
    ['female', F],
  ] as [string, AvatarLook][]) {
    title(`${name} – front`)
    const r1 = row()
    for (const p of frontPoses) cell(r1, p, [[dollSprite(look, p), Z]])
    cell(r1, 'blink', [[dollSprite(look, 'stand', { blink: true }), Z]])
    cell(r1, 'portrait', [[dollPortrait(look), Z]])
    title(`${name} – back (barefoot) + small sprite`)
    const r2 = row()
    for (const p of backPoses) {
      const [v, sp] = smallFor[p]
      cell(r2, p, [
        [dollSprite(look, p, { view: 'back', barefoot: p !== 'stand' }), Z],
        [avatarSprite(look, v, sp, { barefoot: p !== 'stand' }), Z],
      ])
    }
  }
}

if (want('faces')) {
  title('face styles')
  const r = row()
  for (const f of FACE_STYLES) {
    cell(r, `${f.id} ${f.name}`, [
      [dollPortrait({ ...F, face: f.id }), Z],
      [dollPortrait({ ...M, face: f.id }), Z],
    ])
  }
}

if (want('hair')) {
  title('hair styles (front / back, doll + small)')
  const r = row()
  const hairs = OUTFITS.filter((o) => o.slot === 'hair')
  hairs.forEach((h, i) => {
    const look: AvatarLook = { ...(i % 2 ? M : F), hair: h.id, hairColor: i % 7, top: 'top_tee_white', bottom: 'bot_jeans', shoes: 'shoes_sneaker_white' }
    cell(r, h.name, [
      [dollSprite(look, 'stand'), Z],
      [dollSprite(look, 'stand', { view: 'back' }), Z],
      [avatarSprite(look, 'front', 'stand'), Z],
      [avatarSprite(look, 'back', 'stand'), Z],
    ])
  })
}

if (want('items')) {
  for (const slot of ['top', 'bottom', 'shoes', 'head', 'neck', 'hand', 'back'] as const) {
    title(`${slot} items (f / m / back, + small)`)
    const r = row()
    for (const o of OUTFITS.filter((x) => x.slot === slot)) {
      const f = { ...F, [slot]: o.id } as AvatarLook
      const m = { ...M, [slot]: o.id } as AvatarLook
      cell(r, o.name, [
        [dollSprite(f, 'stand'), Z],
        [dollSprite(m, 'stand'), Z],
        [dollSprite(m, 'stand', { view: 'back' }), Z],
        [avatarSprite(f, 'front', 'stand'), Z],
        [avatarSprite(m, 'side', 'walk1'), Z],
      ])
    }
  }
}

const COOL: [string, AvatarLook][] = [
  ['school boy', M],
  ['school girl', F],
  ['uni student m', { ...M, hair: 'hair_curtain', top: 'top_uni_m', bottom: 'bot_uni_slacks', shoes: 'shoes_school' }],
  ['uni student f', { ...F, hair: 'hair_long', hairColor: 1, top: 'top_uni_f', bottom: 'bot_uni_pleat', shoes: 'shoes_maryjane' }],
  ['elephant pants tourist', { ...F, skin: 0, hair: 'hair_bun', hairColor: 3, top: 'top_elephant', bottom: 'bot_elephant_purple', shoes: 'shoes_flipflop', head: 'head_sunglasses', hand: 'hand_chayen' }],
  ['hoodie + jeans', { ...M, hair: 'hair_twoblock', hairColor: 6, top: 'top_hoodie_over', bottom: 'bot_jeans', shoes: 'shoes_sneaker_white', head: 'head_headphones' }],
  ['jersey fan', { ...M, skin: 2, hair: 'hair_buzz', top: 'top_jersey', bottom: 'bot_denim_shorts', shoes: 'shoes_hightop', head: 'head_cap' }],
  ['thai silk', { ...F, skin: 2, hair: 'hair_braid', top: 'top_chitralada', bottom: 'bot_chitralada', shoes: 'shoes_sandal', head: 'head_jasmine' }],
  ['sukajan', { ...M, skin: 3, hair: 'hair_curly', face: 3, top: 'top_sukajan', bottom: 'bot_cargo', shoes: 'shoes_canvas_black' }],
  ['wavy cardigan', { ...F, hair: 'hair_wavy', hairColor: 4, face: 4, top: 'top_cardigan', bottom: 'bot_pinkskirt', shoes: 'shoes_sneaker_pastel', head: 'head_clips' }],
]

if (want('looks')) {
  title('cool looks')
  const r = row()
  for (const [n, l] of COOL) {
    cell(r, n, [
      [dollSprite(l, 'stand'), Z],
      [dollSprite(l, 'wave'), Z],
      [dollSprite(l, 'kneelWai', { view: 'back', barefoot: true }), Z],
      [dollSprite(l, 'bow', { view: 'back', barefoot: true }), Z],
      [avatarSprite(l, 'front', 'stand'), Z],
      [avatarSprite(l, 'back', 'bow', { barefoot: true }), Z],
    ])
  }
  title('2× readability')
  const r2 = row()
  for (const [n, l] of COOL) cell(r2, n, [[dollSprite(l, 'stand'), 2]])
}

// Lifestyle pack: every item added after the original catalogue, on both
// genders, front / back / kneeling wai / bow + the small sprite in all views.
if (want('new')) {
  const first = OUTFITS.findIndex((o) => o.id === 'hand_umbrella') + 1
  const slotF = params.get('slot')
  const fresh = OUTFITS.slice(first).filter((o) => !slotF || slotF.split(',').includes(o.slot))
  title(`lifestyle pack (${fresh.length} items): f / m / back / kneelWai / bow · small front / back / side / bow`)
  const r = row()
  for (const o of fresh) {
    const f = { ...F, [o.slot]: o.id } as AvatarLook
    const m = { ...M, [o.slot]: o.id } as AvatarLook
    cell(r, `${o.id} ${o.name}`, [
      [dollSprite(f, 'stand'), Z],
      [dollSprite(m, 'stand'), Z],
      [dollSprite(f, 'stand', { view: 'back' }), Z],
      [dollSprite(m, 'kneelWai'), Z],
      [dollSprite(f, 'bow', { view: 'back', barefoot: true }), Z],
      [avatarSprite(f, 'front', 'stand'), Z],
      [avatarSprite(m, 'back', 'stand'), Z],
      [avatarSprite(f, 'side', 'walk1'), Z],
      [avatarSprite(m, 'back', 'bow', { barefoot: true }), Z],
    ])
  }
}

const SETS: [string, AvatarLook][] = [
  ['วินมอเตอร์ไซค์', { ...M, skin: 2, hair: 'hair_short', top: 'top_winmoto', bottom: 'bot_jeans', shoes: 'shoes_flipflop', head: 'head_helmet', hand: 'hand_phone' }],
  ['แม่ค้าตลาดนัด', { ...F, skin: 2, hair: 'hair_bun', hairColor: 1, top: 'top_vendor', bottom: 'bot_batik', shoes: 'shoes_flipflop_green', head: 'head_sunhat', hand: 'hand_grocery' }],
  ['พนักงานออฟฟิศ', { ...M, hair: 'hair_curtain', top: 'top_office', bottom: 'bot_slacks_grey', shoes: 'shoes_school', neck: 'neck_lanyard', hand: 'hand_bubbletea' }],
  ['สาวออฟฟิศ', { ...F, hair: 'hair_wavy', hairColor: 2, top: 'top_office_f', bottom: 'bot_pencil', shoes: 'shoes_heels', neck: 'neck_lanyard', hand: 'hand_phone' }],
  ['เชฟข้าวมันไก่', { ...M, skin: 1, hair: 'hair_buzz', top: 'top_chef', bottom: 'bot_chef', shoes: 'shoes_clog', head: 'head_chefhat' }],
  ['นักมวยไทย', { ...M, skin: 3, hair: 'hair_buzz', top: 'top_muay', bottom: 'bot_muay', shoes: 'shoes_wrap', head: 'head_mongkol', neck: 'neck_prajiad' }],
  ['ลิเก', { ...M, skin: 0, face: 3, hair: 'hair_short', top: 'top_likay', bottom: 'bot_likay', shoes: 'shoes_sandal', head: 'head_likay', neck: 'neck_amulet_big' }],
  ['ชุดไทยจักรี', { ...F, skin: 1, hair: 'hair_bun', top: 'top_chakri', bottom: 'bot_chitralada', shoes: 'shoes_sandal', head: 'head_jasmine' }],
  ['ชุดไทยบรมพิมาน', { ...F, skin: 2, hair: 'hair_long', hairColor: 1, top: 'top_borompiman', bottom: 'bot_borompiman', shoes: 'shoes_heels', hand: 'hand_parasol' }],
  ['โขน', { ...M, skin: 1, hair: 'hair_short', top: 'top_khon', bottom: 'bot_khon', shoes: 'shoes_sandal', head: 'head_chada', back: 'back_aura' }],
  ['นักบินอวกาศ', { ...F, skin: 1, hair: 'hair_ponytail', top: 'top_astro', bottom: 'bot_astro', shoes: 'shoes_astro', head: 'head_spacehelmet', back: 'back_oxygen' }],
  ['ชุดนอน', { ...F, hair: 'hair_twin', hairColor: 3, top: 'top_pajama', bottom: 'bot_pajama', shoes: 'shoes_bunny', head: 'head_sleepcap' }],
  ['กีฬาสี', { ...M, skin: 2, hair: 'hair_twoblock', top: 'top_sports_yellow', bottom: 'bot_track', shoes: 'shoes_glow', back: 'back_schoolbag' }],
  ['ร้านสะดวกซื้อ', { ...F, hair: 'hair_ponytail', top: 'top_convenience', bottom: 'bot_black', shoes: 'shoes_sneaker_white', hand: 'hand_patongo' }],
  ['สงกรานต์', { ...M, skin: 1, hair: 'hair_curly', top: 'top_floral', bottom: 'bot_songkran_shorts', shoes: 'shoes_flipflop', head: 'head_dinsor', hand: 'hand_watergun' }],
  ['ลอยกระทง', { ...F, skin: 1, hair: 'hair_braid', top: 'top_thaisilk', bottom: 'bot_sin_mudmee', shoes: 'shoes_sandal', head: 'head_flowercrown', hand: 'hand_krathong' }],
  ['สายตลก', { ...M, skin: 1, hair: 'hair_twoblock', top: 'top_tee_hiw', bottom: 'bot_ripped', shoes: 'shoes_hightop', head: 'head_heartshades', hand: 'hand_lookchin', back: 'back_butterfly' }],
  ['ลุงข้างบ้าน', { ...M, skin: 2, hair: 'hair_buzz', hairColor: 5, top: 'top_tank', bottom: 'bot_fisherman', shoes: 'shoes_flipflop', neck: 'neck_amulet', hand: 'hand_fan' }],
  ['เทวดาน้อย', { ...F, hair: 'hair_long', hairColor: 4, top: 'top_white', bottom: 'bot_skirt', shoes: 'shoes_sandal', head: 'head_flowercrown', back: 'back_angel' }],
  ['ทัวร์วัด', { ...F, skin: 0, hair: 'hair_bob', hairColor: 3, top: 'top_hawaii_elephant', bottom: 'bot_elephant', shoes: 'shoes_sneaker_pastel', head: 'head_catears', hand: 'hand_selfie', back: 'back_thaibag' }],
  ['แห่ผ้าป่า', { ...M, hair: 'hair_short', top: 'top_tee_boonma', bottom: 'bot_fisherman', shoes: 'shoes_flipflop', head: 'head_turban', neck: 'neck_mask', back: 'back_flag' }],
]

const V4_LOOKS: [string, AvatarLook][] = [
  ['starter ช้างน้อย', { ...F, hair: 'hair_bob', top: 'top_tee_white', bottom: 'bottom_elephant_pants', shoes: 'shoes_flipflop', head: 'hat_elephant' }],
  ['flood scuba', { ...M, skin: 2, shoes: 'shoes_flippers', suit: 'suit_scuba' }],
  ['ผู้ประสบภัย', { ...F, skin: 1, hair: 'hair_ponytail', top: 'top_swim_vest', bottom: 'bot_denim_shorts', shoes: 'shoes_rain_boots', head: 'head_basin', neck: 'neck_whistle', hand: 'hand_bailer', back: 'back_swim_ring' }],
  ['กู้ภัย', { ...M, skin: 2, hair: 'hair_short', top: 'top_rescue_jacket', bottom: 'bot_cargo', shoes: 'shoes_rescue_boots', head: 'head_rescue_helmet', hand: 'hand_megaphone', back: 'back_rescue_tube' }],
  ['กู้ภัยเต็มยศ', { ...F, hair: 'hair_bob', hand: 'hand_megaphone', back: 'back_paddle', suit: 'suit_rescue' }],
  ['สายกิน', { ...M, hair: 'hair_twoblock', top: 'top_floral_neon', bottom: 'bot_denim_shorts', shoes: 'shoes_flipflop', head: 'head_tomyum', hand: 'hand_krapao_box', back: 'back_thaitea' }],
  ['สไบเซลฟี่', { ...F, hair: 'hair_long', hairColor: 1, top: 'top_sabai_pink', bottom: 'bot_sin_pink', shoes: 'shoes_sandal', head: 'head_malai_bun', hand: 'hand_ringlight' }],
  ['สายมู', { ...F, skin: 2, hair: 'hair_wavy', top: 'top_tee_mutelu', bottom: 'bot_jeans', shoes: 'shoes_sneaker_white', neck: 'neck_saimu', hand: 'hand_lotus_bouquet', back: 'back_blindbox' }],
  ['ป้าข้างบ้าน', { ...F, skin: 1, hair: 'hair_bob', hairColor: 5, top: 'top_kradao', bottom: 'bot_batik', shoes: 'shoes_flipflop', head: 'head_curlers', neck: 'neck_towel', hand: 'hand_grocery' }],
  ['นักมวยดำทอง', { ...M, skin: 3, hair: 'hair_buzz', top: 'top_muay', bottom: 'bot_muay_gold', shoes: 'shoes_wrap', head: 'head_mongkol' }],
  ['ฮิปโปแคระ', { ...F, hair: 'hair_twin', top: 'top_tee_hippo', bottom: 'bot_pinkskirt', shoes: 'shoes_hippo', head: 'head_hippo_ears', hand: 'hand_dubai_choc' }],
  ['สายเจนซี', { ...F, skin: 1, hair: 'hair_ponytail', top: 'top_tee_black', bottom: 'bot_jeans', shoes: 'shoes_sneaker_white', neck: 'neck_sabai_genz', hand: 'hand_jelly_bag', head: 'head_platu' }],
  ['หมูกระทะ', { ...M, skin: 1, hair: 'hair_curtain', top: 'top_hawaii', bottom: 'bot_fisherman', shoes: 'shoes_flipflop', head: 'head_mookata', hand: 'hand_chayen' }],
  ['ข้าวเหนียวมะม่วง', { ...F, skin: 0, hair: 'hair_bun', top: 'top_tee_white', bottom: 'bot_songkran_shorts', shoes: 'shoes_sneaker_pastel', head: 'head_mango_sticky' }],
]

if (want('sets')) {
  title('sets: stand / wave / back / kneelWai / back kneel / bow · small front / back / side / kneel')
  const r = row()
  for (const [n, l] of SETS) {
    cell(r, n, [
      [dollSprite(l, 'stand'), Z],
      [dollSprite(l, 'wave'), Z],
      [dollSprite(l, 'stand', { view: 'back' }), Z],
      [dollSprite(l, 'kneelWai'), Z],
      [dollSprite(l, 'kneelWai', { view: 'back', barefoot: true }), Z],
      [dollSprite(l, 'bow', { view: 'back', barefoot: true }), Z],
      [avatarSprite(l, 'front', 'stand'), Z],
      [avatarSprite(l, 'back', 'stand'), Z],
      [avatarSprite(l, 'side', 'walk2'), Z],
      [avatarSprite(l, 'back', 'kneel', { barefoot: true }), Z],
    ])
  }
}

// ?ids=top_jersey,bot_jeans – inspect specific items large (f / m / back).
const ids = params.get('ids')
if (ids) {
  title('selected')
  const r = row()
  for (const id of ids.split(',')) {
    const o = OUTFITS.find((x) => x.id === id)
    if (!o) continue
    const f = { ...F, [o.slot]: o.id } as AvatarLook
    const m = { ...M, [o.slot]: o.id } as AvatarLook
    cell(r, o.name, [
      [dollSprite(f, 'stand'), Z],
      [dollSprite(m, 'stand'), Z],
      [dollSprite(m, 'stand', { view: 'back' }), Z],
      [avatarSprite(f, 'front', 'stand'), Z],
    ])
  }
}

// ?s=suits – every full-body suit on both genders: doll stand / wave / back /
// kneelWai / back kneel / bow / sit · small front / back / side / wai / back
// kneel / bow. &only=suit_trex,suit_shark narrows the list.
const only = params.get('only')?.split(',')
if (want('suits')) {
  const suits = OUTFITS.filter((o) => o.slot === 'suit' && (!only || only.includes(o.id)))
  title(`suits (${suits.length}): doll stand / wave / back / kneelWai / back kneel / bow / sit · small front / back / side / wai / back kneel / bow`)
  for (const o of suits) {
    const r = row()
    for (const [g, base] of [
      ['f', { ...F, hair: 'hair_bob', hairColor: 1 }],
      ['m', { ...M, skin: 2 }],
    ] as [string, AvatarLook][]) {
      const l = { ...base, suit: o.id }
      cell(r, `${o.id} ${o.name} (${g})`, [
        [dollSprite(l, 'stand'), Z],
        [dollSprite(l, 'wave'), Z],
        [dollSprite(l, 'stand', { view: 'back' }), Z],
        [dollSprite(l, 'kneelWai'), Z],
        [dollSprite(l, 'kneel', { view: 'back', barefoot: true }), Z],
        [dollSprite(l, 'bow', { view: 'back', barefoot: true }), Z],
        [dollSprite(l, 'sit'), Z],
        [avatarSprite(l, 'front', 'stand'), Z],
        [avatarSprite(l, 'back', 'stand'), Z],
        [avatarSprite(l, 'side', 'walk1'), Z],
        [avatarSprite(l, 'front', 'wai'), Z],
        [avatarSprite(l, 'back', 'kneel', { barefoot: true }), Z],
        [avatarSprite(l, 'back', 'bow', { barefoot: true }), Z],
      ])
    }
  }
}

// ?s=suitsmall – the world sprite only, big, for pixel work.
if (want('suitsmall')) {
  const suits = OUTFITS.filter((o) => o.slot === 'suit' && (!only || only.includes(o.id)))
  title('suits – small sprite: front / back / side / walk / wai / sit / back kneel / back sit / bow')
  const r = row()
  for (const o of suits) {
    const l: AvatarLook = { ...F, hair: 'hair_bob', hairColor: 1, suit: o.id }
    cell(r, o.name, [
      [avatarSprite(l, 'front', 'stand'), Z],
      [avatarSprite(l, 'back', 'stand'), Z],
      [avatarSprite(l, 'side', 'stand'), Z],
      [avatarSprite(l, 'side', 'walk2'), Z],
      [avatarSprite(l, 'front', 'wai'), Z],
      [avatarSprite(l, 'front', 'sit'), Z],
      [avatarSprite(l, 'back', 'kneel'), Z],
      [avatarSprite(l, 'back', 'sit'), Z],
      [avatarSprite(l, 'back', 'bow'), Z],
    ])
  }
}

// ?s=exclusives – place-only souvenirs grouped by place, on both genders.
if (want('exclusives')) {
  const byPlace = new Map<string, typeof OUTFITS>()
  for (const o of OUTFITS) if (o.shopOnly) byPlace.set(o.shopOnly, [...(byPlace.get(o.shopOnly) ?? []), o])
  title(`place-exclusive souvenirs (${[...byPlace.values()].flat().length} items, ${byPlace.size} places): f / m / back / kneelWai / bow · small front / back / side / bow`)
  for (const [place, items] of byPlace) {
    const r = row()
    for (const o of items) {
      const f = { ...F, [o.slot]: o.id } as AvatarLook
      const m = { ...M, [o.slot]: o.id } as AvatarLook
      cell(r, `${place} · ${o.id} ${o.name} ${o.price}`, [
        [dollSprite(f, 'stand'), Z],
        [dollSprite(m, 'stand'), Z],
        [dollSprite(f, 'stand', { view: 'back' }), Z],
        [dollSprite(m, 'kneelWai'), Z],
        [dollSprite(f, 'bow', { view: 'back', barefoot: true }), Z],
        [avatarSprite(f, 'front', 'stand'), Z],
        [avatarSprite(m, 'back', 'stand'), Z],
        [avatarSprite(f, 'side', 'walk1'), Z],
        [avatarSprite(m, 'back', 'bow', { barefoot: true }), Z],
      ])
    }
  }
}

// ?s=v4 – the v4 drop: pack & battle-pass exclusives and the pop-culture
// shop items (f / m / back / kneelWai / bow · small front / back / side / bow),
// then full v4 looks. &grp=pack,pass_free,pass_premium,pop,looks narrows it.
if (want('v4')) {
  const grp = params.get('grp')?.split(',')
  const groups: [string, string[]][] = [
    ['pack', PACK_OUTFIT_IDS],
    ['pass_free', PASS_FREE_OUTFIT_IDS],
    ['pass_premium', PASS_PREMIUM_OUTFIT_IDS],
    ['pop', POP_OUTFIT_IDS],
  ]
  for (const [g, idsOf] of groups) {
    if (grp && !grp.includes(g)) continue
    title(`v4 ${g} (${idsOf.length})`)
    const r = row()
    for (const id of idsOf) {
      const o = OUTFITS.find((x) => x.id === id)!
      const f = { ...F, [o.slot]: o.id } as AvatarLook
      const m = { ...M, skin: 2, [o.slot]: o.id } as AvatarLook
      cell(r, `${o.id} ${o.name}`, [
        [dollSprite(f, 'stand'), Z],
        [dollSprite(m, 'wave'), Z],
        [dollSprite(f, 'stand', { view: 'back' }), Z],
        [dollSprite(m, 'kneelWai'), Z],
        [dollSprite(f, 'bow', { view: 'back', barefoot: true }), Z],
        [avatarSprite(f, 'front', 'stand'), Z],
        [avatarSprite(m, 'back', 'stand'), Z],
        [avatarSprite(f, 'side', 'walk1'), Z],
        [avatarSprite(m, 'back', 'bow', { barefoot: true }), Z],
      ])
    }
  }
  if (!grp || grp.includes('looks')) {
    title('v4 looks')
    const r = row()
    for (const [n, l] of V4_LOOKS) {
      cell(r, n, [
        [dollSprite(l, 'stand'), Z],
        [dollSprite(l, 'wave'), Z],
        [dollSprite(l, 'stand', { view: 'back' }), Z],
        [dollSprite(l, 'kneelWai'), Z],
        [dollSprite(l, 'bow', { view: 'back', barefoot: true }), Z],
        [avatarSprite(l, 'front', 'stand'), Z],
        [avatarSprite(l, 'back', 'stand'), Z],
        [avatarSprite(l, 'side', 'walk2'), Z],
      ])
    }
  }
}
