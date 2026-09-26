// TEMP stand-in (replaced by the HD doll renderer).
import { avatarPortrait, avatarSprite, DEFAULT_LOOK, type AvatarLook } from './avatar'
import { createCanvas } from '../engine/pixel'
import { cached, type Sprite } from '../engine/sprite'
import { lookKey } from './avatar'

export type DollPose = 'stand' | 'wave' | 'wai' | 'happy' | 'think' | 'kneel' | 'kneelWai' | 'bow' | 'sit'
export type DollView = 'front' | 'back'
export const DOLL_W = 34
export const DOLL_H = 50
export const FACE_STYLES = ['ตากลมวิ้ง', 'ยิ้มตาหยี', 'ตาสงบ', 'ตาคม']

const MAP: Record<DollPose, Parameters<typeof avatarSprite>[2]> = {
  stand: 'stand',
  wave: 'happy',
  wai: 'wai',
  happy: 'happy',
  think: 'stand',
  kneel: 'kneel',
  kneelWai: 'wai',
  bow: 'bow',
  sit: 'sit',
}

export function dollSprite(look: AvatarLook, pose: DollPose, opts: { view?: DollView; blink?: boolean; flip?: boolean; barefoot?: boolean } = {}): Sprite {
  const view = opts.view ?? 'front'
  return cached(`dollstub:${lookKey(look)}:${pose}:${view}:${opts.flip ? 1 : 0}`, () => {
    const s = avatarSprite(look, view, MAP[pose], { barefoot: opts.barefoot, flip: opts.flip })
    const c = createCanvas(s.w * 2, s.h * 2)
    const x = c.getContext('2d')!
    x.imageSmoothingEnabled = false
    x.drawImage(s.canvas, 0, 0, s.w * 2, s.h * 2)
    return { canvas: c, w: s.w * 2, h: s.h * 2 }
  })
}

export function dollPortrait(look: AvatarLook): Sprite {
  return avatarPortrait(look)
}

export function dollDefaultLook(gender: 'm' | 'f'): AvatarLook {
  return gender === 'm' ? { ...DEFAULT_LOOK, gender, hair: 'hair_short' } : { ...DEFAULT_LOOK, gender }
}
