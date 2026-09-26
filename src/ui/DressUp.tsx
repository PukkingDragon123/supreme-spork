// Dress-up in the player's Thai-style room: the doll stands in front of the
// mirror wardrobe, categories along the bottom. Used for character creation
// (starter items, gender, skin, face) and as the everyday wardrobe.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, createCanvas, type Surface } from '../engine/pixel'
import { spriteDataUrl, type Sprite } from '../engine/sprite'
import { Particles } from '../engine/particles'
import { game, level } from '../game/state'
import { OUTFITS, type OutfitItem, type Slot } from '../game/data/outfits'
import { DAY_COLORS, HAIR_COLORS, SKIN_TONES } from '../art/palette'
import { lookKey, type AvatarLook } from '../art/avatar'
import { DOLL_H, FACE_STYLES, dollSprite, type DollPose } from '../art/doll'
import { drawRoomStill } from '../scenes/house'
import { buyHairColor, buyOutfit, equip, luckyColorActive, ownsOutfit, setLook } from '../game/actions'
import { currentPhase } from '../scenes/sky'
import { toast } from '../game/events'
import { sfx } from '../engine/audio'
import { useStage } from '../activities/kit'
import { Coin, Icon } from './components/common'
import { PBtn, Slot as SlotBtn, Tabs } from './components/kit'
import { PT, TONE_TEXT } from './pixeltext'

type Cat = 'body' | 'hair' | 'top' | 'bottom' | 'shoes' | 'acc'
type Style = 'all' | 'school' | 'thai' | 'modern' | 'temple'

const CATS: { id: Cat; label: string; icon: string }[] = [
  { id: 'body', label: 'ตัวละคร', icon: 'user' },
  { id: 'hair', label: 'ทรงผม', icon: 'sparkle' },
  { id: 'top', label: 'เสื้อ', icon: 'shirt' },
  { id: 'bottom', label: 'ท่อนล่าง', icon: 'shirt' },
  { id: 'shoes', label: 'รองเท้า', icon: 'paw' },
  { id: 'acc', label: 'ประดับ', icon: 'garland' },
]

const STYLES: { id: Style; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'school', label: 'ชุดนักเรียน' },
  { id: 'thai', label: 'ไทย ๆ' },
  { id: 'modern', label: 'สตรีท' },
  { id: 'temple', label: 'ไปวัด' },
]

type OutfitX = OutfitItem & { category?: string; gender?: 'm' | 'f' }

function applyItem(look: AvatarLook, o: OutfitItem | null, slot: Slot | 'shoes'): AvatarLook {
  const l = { ...look }
  if (slot === 'hair' && o) l.hair = o.id
  else if (slot === 'top' && o) l.top = o.id
  else if (slot === 'bottom' && o) l.bottom = o.id
  else if (slot === 'head') l.head = o?.id ?? null
  else if (slot === 'neck') l.neck = o?.id ?? null
  else if (slot === 'hand') l.hand = o?.id ?? null
  else if (slot === 'shoes') l.shoes = o?.id ?? null
  return l
}

/** Crop of the doll that shows off one slot (head for hair, torso for tops…). */
function thumbFor(look: AvatarLook, slot: string): string {
  const s = dollSprite(look, 'stand')
  const H = s.h
  const [y0, y1] =
    slot === 'hair' || slot === 'head' ? [0, 0.5] : slot === 'top' || slot === 'neck' || slot === 'hand' ? [0.3, 0.78] : slot === 'shoes' ? [0.72, 1] : [0.55, 1]
  const top = Math.floor(H * y0)
  const h = Math.max(8, Math.ceil(H * y1) - top)
  const side = Math.max(h, s.w)
  const c = createCanvas(side, side)
  const x = c.getContext('2d')!
  x.drawImage(s.canvas, 0, top, s.w, h, Math.round((side - s.w) / 2), Math.round((side - h) / 2), s.w, h)
  return spriteDataUrl({ canvas: c, w: side, h: side }, 2)
}

// ---------------------------------------------------------------------------

class DressScene implements Scene {
  w = 110
  h = 160
  t = 0
  pose: DollPose = 'stand'
  poseT = 0
  view: 'front' | 'back' = 'front'
  particles = new Particles()
  private bg: HTMLCanvasElement | null = null
  private blinkT = 2
  constructor(public look: AvatarLook) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  celebrate() {
    this.pose = 'happy'
    this.poseT = 0.7
    for (let i = 0; i < 10; i++)
      this.particles.add({ kind: 'sparkle', x: this.w / 2 + (Math.random() - 0.5) * 30, y: this.h * 0.55 + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, max: 0.8, color: i % 2 ? '#fff3a6' : '#ffd6e0' })
  }
  update(dt: number) {
    this.t += dt
    if (this.poseT > 0) {
      this.poseT -= dt
      if (this.poseT <= 0) this.pose = 'stand'
    }
    this.blinkT -= dt
    if (this.blinkT < -0.14) this.blinkT = 2 + Math.random() * 3
    this.particles.update(dt)
  }
  pointer(e: { type: string }) {
    if (e.type === 'up') {
      sfx.whoosh()
      this.view = this.view === 'front' ? 'back' : 'front'
    }
  }
  render(g: Surface) {
    const { w, h } = this
    if (!this.bg) {
      const night = currentPhase() === 'night'
      this.bg = bake(w, h, (b) => drawRoomStill(b, w, h, game.value.house, { focus: 'mirror', night }))
    }
    g.draw(this.bg, 0, 0)
    const s = dollSprite(this.look, this.view === 'back' ? 'stand' : this.pose, { view: this.view, blink: this.blinkT < 0 })
    const baseY = Math.round(h * 0.94)
    const bob = this.pose === 'happy' ? -Math.round(Math.abs(Math.sin(this.poseT * 9)) * 3) : 0
    g.ctx.fillStyle = 'rgba(40,20,10,0.25)'
    g.ellipse(Math.round(w / 2), baseY, Math.round(s.w * 0.36), 2, 'rgba(40,20,10,0.25)')
    g.draw(s.canvas, Math.round(w / 2 - s.w / 2), baseY - s.h + 1 + bob)
    this.particles.render(g)
  }
}

// ---------------------------------------------------------------------------

export function DressUp({ creating, onDone }: { creating?: boolean; onDone: () => void }) {
  const s = game.value
  const lv = level.value.level
  const look = s.player.look
  const [cat, setCat] = useState<Cat>(creating ? 'body' : 'top')
  const [style, setStyle] = useState<Style>('all')
  const [trying, setTrying] = useState<OutfitX | null>(null)
  const preview = trying ? applyItem(look, trying, trying.slot as Slot) : look
  const sceneRef = useRef<DressScene | null>(null)
  const { host } = useStage(
    () => {
      const sc = new DressScene(preview)
      sceneRef.current = sc
      return sc
    },
    { targetWidth: 110 },
  )
  const pk = lookKey(preview)
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.look = preview
  }, [pk])

  const celebrate = () => sceneRef.current?.celebrate()

  const pick = (o: OutfitX | null, slot: Slot | 'shoes') => {
    sfx.tap()
    if (!o) {
      equip(slot as Slot, null)
      setTrying(null)
      return
    }
    if (ownsOutfit(o.id)) {
      equip(slot as Slot, o.id)
      setTrying(null)
      celebrate()
    } else {
      setTrying(o)
      celebrate()
    }
  }

  const buy = () => {
    if (!trying) return
    if (buyOutfit(trying.id)) {
      equip(trying.slot, trying.id)
      sfx.purchase()
      toast(`ได้${trying.name}แล้ว เท่มาก!`, 'shirt')
      setTrying(null)
      celebrate()
    }
  }

  const slotsOf = (c: Cat): (Slot | 'shoes')[] => (c === 'acc' ? ['head', 'neck', 'hand'] : c === 'body' ? [] : [c as Slot | 'shoes'])
  const items = (c: Cat): OutfitX[] =>
    (OUTFITS as OutfitX[]).filter((o) => {
      if (!slotsOf(c).includes(o.slot as Slot)) return false
      if (o.premium && !ownsOutfit(o.id)) return false
      if (creating && !ownsOutfit(o.id)) return false
      if ((c === 'top' || c === 'bottom') && style !== 'all' && (o.category ?? 'modern') !== style) return false
      return true
    })

  const today = DAY_COLORS[new Date().getDay()]
  const lucky = luckyColorActive(s)

  return (
    <div class="dress">
      <div class="dress-stage" ref={host} role="img" aria-label="ตัวละครของคุณ แตะเพื่อหมุน" />
      <div class={`dress-lucky chip ${lucky ? 'green' : 'gold'}`}>
        <span class="swatch" style={{ background: today.hex }} />
        {lucky ? `ใส่สี${today.name}แล้ว บุญ +10%` : `วัน${today.day} ใส่สี${today.name} บุญ +10%`}
      </div>
      <div class="dress-panel win">
        <Tabs compact tabs={CATS} value={cat} onChange={(c) => (setCat(c), setTrying(null))} />
        <div class="ptab-body dress-body scroll">
          {cat === 'body' && <BodyEditor look={look} onChange={celebrate} />}
          {(cat === 'top' || cat === 'bottom') && (
            <div class="row dress-styles">
              {STYLES.map((x) => (
                <button key={x.id} class={`chip ${style === x.id ? 'green' : ''}`} onClick={() => (sfx.tap(), setStyle(x.id))}>
                  {x.label}
                </button>
              ))}
            </div>
          )}
          {cat !== 'body' && (
            <div class="slot-grid dress-grid">
              {(cat === 'acc' || cat === 'shoes') &&
                slotsOf(cat).map((sl) => (
                  <SlotBtn key={`none-${sl}`} size={64} active={!look[sl as keyof AvatarLook]} onClick={() => pick(null, sl)} title={`ไม่ใส่ (${sl})`}>
                    <Icon name="close" size={22} />
                  </SlotBtn>
                ))}
              {items(cat).map((o) => {
                const owned = ownsOutfit(o.id)
                const worn = look[o.slot as keyof AvatarLook] === o.id
                const locked = (o.level ?? 1) > lv
                return (
                  <ItemSlot
                    key={o.id}
                    item={o}
                    look={look}
                    worn={worn}
                    trying={trying?.id === o.id}
                    owned={owned}
                    locked={locked}
                    onClick={() => pick(o, o.slot as Slot)}
                  />
                )
              })}
              {!items(cat).length && <p class="small muted">{creating ? 'ชุดเพิ่มเติมซื้อได้ในร้านเมื่อเริ่มเกม' : 'ยังไม่มีของในหมวดนี้'}</p>}
            </div>
          )}
        </div>
        <div class="dress-foot">
          {trying ? (
            <>
              <div class="grow dress-try">
                <PT text={trying.name} size={13} weight={600} {...TONE_TEXT.ink} />
                <span class="small muted">{trying.desc}</span>
              </div>
              {(trying.level ?? 1) > lv ? (
                <span class="chip">
                  <Icon name="lock" size={14} /> Lv.{trying.level}
                </span>
              ) : (
                <PBtn tone="gold" size="small" onClick={buy}>
                  ซื้อ <Coin n={trying.price} size={14} />
                </PBtn>
              )}
              <PBtn tone="paper" size="small" onClick={() => setTrying(null)}>
                ถอด
              </PBtn>
            </>
          ) : (
            <PBtn tone="green" block size={creating ? 'big' : undefined} icon={creating ? 'sparkle' : 'check'} onClick={onDone}>
              {creating ? 'เสร็จแล้ว ไปต่อ' : 'แต่งเสร็จแล้ว'}
            </PBtn>
          )}
        </div>
      </div>
    </div>
  )
}

function ItemSlot({ item, look, worn, trying, owned, locked, onClick }: { item: OutfitX; look: AvatarLook; worn: boolean; trying: boolean; owned: boolean; locked: boolean; onClick: () => void }) {
  const url = useMemo(() => thumbFor(applyItem(look, item, item.slot as Slot), item.slot), [lookKey(look), item.id])
  return (
    <SlotBtn size={64} active={worn || trying} locked={locked} onClick={onClick} title={item.name} class="item-slot" badge={!owned && !locked ? <span class="price-tag num">{item.price}</span> : undefined}>
      <img class="px slot-img" src={url} alt="" draggable={false} />
      {item.top?.dayColor !== undefined && <span class="swatch day" style={{ background: DAY_COLORS[item.top.dayColor].hex }} />}
    </SlotBtn>
  )
}

function BodyEditor({ look, onChange }: { look: AvatarLook; onChange: () => void }) {
  const s = game.value
  const set = (p: Partial<AvatarLook>) => {
    sfx.tap()
    setLook(p)
    onChange()
  }
  return (
    <div class="col body-editor">
      <div class="row">
        <PT text="รูปร่าง" size={13} weight={600} {...TONE_TEXT.ink} />
        <span class="grow" />
        <PBtn tone={look.gender === 'm' ? 'blue' : 'paper'} size="small" onClick={() => set({ gender: 'm' })}>
          ผู้ชาย
        </PBtn>
        <PBtn tone={look.gender === 'f' ? 'pink' : 'paper'} size="small" onClick={() => set({ gender: 'f' })}>
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
      <div>
        <PT text="ดวงตา" size={13} weight={600} {...TONE_TEXT.ink} />
        <div class="slot-grid" style={{ marginTop: '4px' }}>
          {FACE_STYLES.map((name, i) => (
            <FaceSlot key={i} look={look} face={i} name={name} on={(look.face ?? 0) === i} onClick={() => set({ face: i })} />
          ))}
        </div>
      </div>
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

function FaceSlot({ look, face, name, on, onClick }: { look: AvatarLook; face: number; name: string; on: boolean; onClick: () => void }) {
  const url = useMemo(() => {
    const s: Sprite = dollSprite({ ...look, face }, 'stand')
    const h = Math.round(Math.min(s.h, DOLL_H) * 0.48)
    const side = Math.max(h, s.w)
    const c = createCanvas(side, side)
    c.getContext('2d')!.drawImage(s.canvas, 0, 0, s.w, h, Math.round((side - s.w) / 2), Math.round((side - h) / 2), s.w, h)
    return spriteDataUrl({ canvas: c, w: side, h: side }, 2)
  }, [lookKey(look), face])
  return (
    <SlotBtn size={64} active={on} onClick={onClick} title={name}>
      <img class="px slot-img" src={url} alt="" draggable={false} />
    </SlotBtn>
  )
}
