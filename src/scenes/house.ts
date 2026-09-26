// TEMP stand-in (replaced by the home room scene).
import type { Scene, PointerInfo } from '../engine/stage'
import type { Surface } from '../engine/pixel'
import { avatarSprite, type AvatarLook } from '../art/avatar'
import type { HouseState } from '../game/house'
import type { Interact } from '../game/data/furniture'
export interface HouseCallbacks {
  onInteract?(kind: Interact, uid: string): void
  onEditPick?(uid: string): void
  onPlaced?(id: string, x: number, y: number, flip: boolean): void
  onMoved?(uid: string, x: number, y: number, flip: boolean): void
}
export function drawRoomStill(g: Surface, w: number, h: number, _house: HouseState, opts: { night?: boolean; focus?: 'room' | 'mirror' } = {}) {
  g.rect(0, 0, w, h, opts.night ? '#3a3050' : '#f3e6cf')
  g.rect(0, Math.round(h * 0.55), w, h, '#c98a54')
  g.rect(Math.round(w * 0.3), 20, Math.round(w * 0.5), Math.round(h * 0.35), opts.night ? '#2c2f63' : '#a4dcff')
}
export class HouseScene implements Scene {
  w = 160
  h = 300
  mode: 'live' | 'edit' = 'live'
  focus: 'room' | 'mirror' = 'room'
  constructor(
    private house: HouseState,
    private look: AvatarLook,
    private cb: HouseCallbacks,
  ) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
  }
  setHouse(h: HouseState) {
    this.house = h
  }
  setLook(l: AvatarLook) {
    this.look = l
  }
  setMode(m: 'live' | 'edit') {
    this.mode = m
  }
  setFocus(f: 'room' | 'mirror') {
    this.focus = f
  }
  startPlacing(_id: string) {}
  startMoving(_uid: string) {}
  cancelPlacing() {}
  flipGhost() {}
  confirmGhost(): boolean {
    return false
  }
  playerAt(_x: number, _y: number) {}
  update() {}
  pointer(e: PointerInfo) {
    if (e.type === 'up' && e.x < this.w * 0.25 && e.y < this.h * 0.6) this.cb.onInteract?.('wardrobe', 'wardrobe')
    else if (e.type === 'up' && e.x > this.w * 0.75 && e.y < this.h * 0.5) this.cb.onInteract?.('altar', 'altar')
    else if (e.type === 'up' && e.x > this.w * 0.8 && e.y > this.h * 0.7) this.cb.onInteract?.('door', 'door')
  }
  render(g: Surface) {
    drawRoomStill(g, this.w, this.h, this.house)
    const s = avatarSprite(this.look, 'front', 'stand')
    g.drawScaled(s.canvas, Math.round(this.w / 2 - s.w), Math.round(this.h * 0.7 - s.h * 2), 2)
  }
}
