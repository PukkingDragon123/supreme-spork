// The "ตัวละคร" tab of dress-up / character creation: body preset, skin,
// height, build and every face option (art/body.ts), each shown as a live
// thumbnail of the player's own doll.

import { useMemo } from 'preact/hooks'
import { createCanvas } from '../engine/pixel'
import { spriteDataUrl } from '../engine/sprite'
import { game } from '../game/state'
import { OUTFIT_BY_ID } from '../game/data/outfits'
import { HAIR_COLORS, SKIN_TONES } from '../art/palette'
import { lookKey, type AvatarLook, type BodyType } from '../art/avatar'
import { DOLL_H, FACE_STYLES, dollSprite } from '../art/doll'
import { BEARDS, BLUSHES, BROW_COLORS, BROWS, BUILDS, bodyOf, DOLL_HEIGHT, EYE_COLORS, EYE_SIZES, EYELIDS, FACE_DECOS, FACE_SHAPES, HEIGHTS, LASHES, LIPS, MARKS, MOUTHS, NOSES, SHINES, switchGender, type BodyKey, type BodyOption } from '../art/body'
import { buyHairColor, setLook } from '../game/actions'
import { sfx } from '../engine/audio'
import { PBtn, Slot as SlotBtn } from './components/kit'
import { PT, TONE_TEXT } from './pixeltext'
import '../styles/body-editor.css'

/** The starter hair each preset switches to when the current style is the other preset's. */
const PRESET_HAIR: Record<BodyType, string> = { m: 'hair_twoblock', f: 'hair_bob' }

export function BodyEditor({ look, onChange, creating }: { look: AvatarLook; onChange: () => void; creating?: boolean }) {
  const s = game.value
  const body = bodyOf(look)
  const set = (p: Partial<AvatarLook>) => {
    sfx.tap()
    setLook(p)
    onChange()
  }
  const setGender = (g: BodyType) => {
    if (g === look.gender) return
    const patch = switchGender(look, g)
    // a fresh character gets a matching starter haircut
    const hg = (OUTFIT_BY_ID[look.hair] as { gender?: BodyType } | undefined)?.gender
    if (creating && hg && hg !== g) patch.hair = PRESET_HAIR[g]
    set(patch)
  }
  const feature = (title: string, key: BodyKey, list: readonly BodyOption[], crop: 'head' | 'eyes' | 'body' = 'head') => (
    <div class="be-sec">
      <PT text={title} size={13} weight={600} {...TONE_TEXT.ink} />
      <div class="slot-grid be-grid">
        {list.map((o) => (
          <FeatureSlot key={o.id} look={look} patch={{ [key]: o.id }} crop={crop} label={o.name} on={body[key] === o.id} onClick={() => set({ [key]: o.id })} />
        ))}
      </div>
    </div>
  )
  return (
    <div class="col body-editor">
      <div class="row">
        <PT text="รูปร่าง" size={13} weight={600} {...TONE_TEXT.ink} />
        <span class="grow" />
        <PBtn tone={look.gender === 'm' ? 'blue' : 'paper'} size="small" onClick={() => setGender('m')}>
          ผู้ชาย
        </PBtn>
        <PBtn tone={look.gender === 'f' ? 'pink' : 'paper'} size="small" onClick={() => setGender('f')}>
          ผู้หญิง
        </PBtn>
      </div>
      <div class="row wrap">
        <PT text="สีผิว" size={13} weight={600} {...TONE_TEXT.ink} />
        <span class="grow" />
        {SKIN_TONES.map((t, i) => (
          <button key={t.id} class={`swatch-btn ${look.skin === i ? 'on' : ''}`} style={{ background: t.b }} onClick={() => set({ skin: i })} aria-label={t.name} title={t.name} />
        ))}
      </div>
      {feature('ความสูง', 'height', HEIGHTS, 'body')}
      {feature('หุ่น', 'build', BUILDS, 'body')}
      {feature('รูปหน้า', 'faceShape', FACE_SHAPES)}
      <div class="be-sec">
        <PT text="ดวงตา" size={13} weight={600} {...TONE_TEXT.ink} />
        <div class="slot-grid be-grid">
          {FACE_STYLES.map((f) => (
            <FeatureSlot key={f.id} look={look} patch={{ face: f.id }} crop="eyes" label={f.name} on={(look.face ?? 0) === f.id} onClick={() => set({ face: f.id })} />
          ))}
        </div>
      </div>
      {feature('สีตา', 'eyeColor', EYE_COLORS, 'eyes')}
      {feature('ขนาดตา', 'eyeSize', EYE_SIZES, 'eyes')}
      {feature('ชั้นตา', 'eyelid', EYELIDS, 'eyes')}
      {feature('ขนตา', 'lashes', LASHES, 'eyes')}
      {feature('ประกายตา', 'shine', SHINES, 'eyes')}
      {feature('คิ้ว', 'brows', BROWS, 'eyes')}
      {feature('สีคิ้ว', 'browColor', BROW_COLORS, 'eyes')}
      {feature('จมูก', 'nose', NOSES)}
      {feature('ปาก', 'mouth', MOUTHS)}
      {feature('สีปาก', 'lips', LIPS)}
      {feature('แก้ม', 'blush', BLUSHES)}
      {feature('หนวดเครา', 'beard', BEARDS)}
      {feature('กระ / ไฝ', 'marks', MARKS)}
      {feature('ของแต่งหน้า', 'faceDeco', FACE_DECOS)}
      <div class="row wrap">
        <PT text="สีผม" size={13} weight={600} {...TONE_TEXT.ink} />
        <span class="grow" />
        {HAIR_COLORS.map((c, i) => {
          const premium = i >= 4
          const key = `haircolor_${c.id}`
          const owned = !premium || s.outfits.includes(key)
          return (
            <button
              key={c.id}
              class={`swatch-btn ${look.hairColor === i ? 'on' : ''} ${owned ? '' : 'locked'}`}
              style={{ background: c.b }}
              title={owned ? c.name : `${c.name} · 30 บุญคอยน์`}
              aria-label={c.name}
              onClick={() => {
                if (owned) set({ hairColor: i })
                else if (buyHairColor(key, 30)) set({ hairColor: i })
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/** A thumbnail of the player's doll with one option applied. */
function FeatureSlot({ look, patch, crop, label, on, onClick }: { look: AvatarLook; patch: Partial<AvatarLook>; crop: 'head' | 'eyes' | 'body'; label: string; on: boolean; onClick: () => void }) {
  const l = { ...look, ...patch }
  const url = useMemo(() => {
    const s = dollSprite(l, 'stand')
    if (crop === 'body') {
      // same canvas for every option so heights compare honestly
      const H = DOLL_H + 2
      const c = createCanvas(40, H)
      c.getContext('2d')!.drawImage(s.canvas, Math.round((40 - s.w) / 2), H - s.h)
      return spriteDataUrl({ canvas: c, w: 40, h: H }, 2)
    }
    // head crop (eyes crop is a tighter zoom on the brows and eyes)
    const off = Math.max(0, -(DOLL_HEIGHT[bodyOf(l).height] ?? 0))
    const [y0, h] = crop === 'eyes' ? [off + 12, 14] : [off + 8, 19]
    const w = crop === 'eyes' ? 22 : 24
    const c = createCanvas(w, h)
    c.getContext('2d')!.drawImage(s.canvas, Math.round((w - s.w) / 2), -y0)
    return spriteDataUrl({ canvas: c, w, h }, 3)
  }, [lookKey(l), crop])
  return (
    <div class={`be-opt ${on ? 'on' : ''}`}>
      <SlotBtn size={60} active={on} onClick={onClick} title={label}>
        <img class={`px slot-img be-img be-${crop}`} src={url} alt="" draggable={false} />
      </SlotBtn>
      <span class="be-cap">{label}</span>
    </div>
  )
}
