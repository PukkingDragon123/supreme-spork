// Windows opened from the hotbar and menu: crafting, bag, prayer beads,
// chant book, daily reminder and the wardrobe.

import { useEffect, useMemo, useState } from 'preact/hooks'
import { game, mutate, level } from '../../game/state'
import { FURNITURE, FLOORS, WALLPAPERS, FURNITURE_BY_ID } from '../../game/data/furniture'
import { craft, craftable, recipeOf, isSurface, craftingOpen, requirements, unlocked, CRAFT_LEVEL } from '../../game/crafting'
import { ownsSurface } from '../../game/house'
import { furnitureSprite, furnitureThumb, materialSprite, surfaceThumb } from '../../art/furniture'
import { bake } from '../../engine/pixel'
import { MATERIAL_IDS, MATERIAL_INFO, type MaterialId } from '../../game/materials'
import { ITEM_BY_ID } from '../../game/data/items'
import { CHANTS } from '../../game/data/chants'
import { STAGES, chantById } from '../../game/data/prayers'
import { stageUnlocked } from '../../game/prayer'
import { addMerit } from '../../game/actions'
import { spriteDataUrl } from '../../engine/sprite'
import { toast } from '../../game/events'
import { haptic, sfx } from '../../engine/audio'
import { openPanel, panel, prayStage, prayAtHome, openShop, mode } from '../store'
import { DressUp } from '../DressUp'
import { MarketWindow } from './Market'
import { PlaceShopWindow } from './PlaceShop'
import { InventoryWindow } from './Inventory'
import { PBtn, Slot, Tabs, Window, Check } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Coin, Icon } from '../components/common'
import { dayKey } from '../../game/time'

const close = () => openPanel(null)

export function Panels() {
  switch (panel.value) {
    case 'craft':
      return <CraftWindow />
    case 'bag':
      return <InventoryWindow onClose={close} />
    case 'mala':
      return <MalaWindow />
    case 'chants':
      return <ChantBook />
    case 'reminder':
      return <ReminderWindow />
    case 'market':
      return <MarketWindow />
    case 'placeShop':
      return <PlaceShopWindow />
    case 'dress':
      return (
        <div class="dress-screen">
          <DressUp onDone={close} />
        </div>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------

function Recipe({ recipe, coins }: { recipe: Partial<Record<MaterialId, number>>; coins?: number }) {
  const mats = game.value.materials
  return (
    <span class="recipe">
      {Object.entries(recipe).map(([k, v]) => {
        const have = mats[k as MaterialId] ?? 0
        return (
          <span key={k} class={`mat-chip ${have >= (v ?? 0) ? '' : 'short'}`} title={MATERIAL_INFO[k as MaterialId].name}>
            <img class="px" src={spriteDataUrl(materialSprite(k as MaterialId), 2)} alt={MATERIAL_INFO[k as MaterialId].name} width={22} height={22} />
            <span class="num">
              {have}/{v}
            </span>
          </span>
        )
      })}
      {!!coins && <Coin n={coins} size={14} />}
    </span>
  )
}

type CraftTab = 'furniture' | 'deco' | 'room'

/** Big still of one furniture piece standing on a patch of floor. */
function PreviewStage({ id }: { id: string }) {
  const url = useMemo(() => {
    const isF = !!FURNITURE_BY_ID[id]
    const spr = isF ? furnitureSprite(id) : surfaceThumb(id)
    const W = Math.max(48, spr.w + 16)
    const H = Math.max(40, spr.h + 12)
    const c = bake(W, H, (g) => {
      g.rect(0, 0, W, H, '#f3e6cf')
      g.rect(0, Math.round(H * 0.62), W, H, '#c98a54')
      for (let x = 0; x < W; x += 8) g.vline(x, Math.round(H * 0.62), H - 1, '#b7773f')
      g.rect(0, Math.round(H * 0.62), W, 1, '#8a5a30')
      g.ellipse(Math.round(W / 2), H - 5, Math.round(spr.w * 0.4), 2, 'rgba(60,30,10,0.25)')
      g.draw(spr.canvas, Math.round((W - spr.w) / 2), H - 4 - spr.h)
    })
    return spriteDataUrl({ canvas: c, w: c.width, h: c.height }, 3)
  }, [id])
  return <img class="px craft-preview-img" src={url} alt="" />
}

function CraftWindow() {
  const [t, setT] = useState<CraftTab>('furniture')
  const lv = level.value.level
  const s = game.value
  const list =
    t === 'room'
      ? [...WALLPAPERS, ...FLOORS].map((w) => ({ id: w.id, name: w.name, desc: w.desc ?? 'เปลี่ยนบรรยากาศทั้งห้อง' }))
      : FURNITURE.filter((f) => !f.fixed && (t === 'deco' ? f.kind === 'wall' || f.kind === 'rug' || f.tags?.includes('deco') : f.kind === 'floor' && !f.tags?.includes('deco'))).map((f) => ({
          id: f.id,
          name: f.name,
          desc: f.desc,
        }))
  const [sel, setSel] = useState<string>(list[0]?.id ?? '')
  const cur = list.find((x) => x.id === sel) ?? list[0]
  if (!craftingOpen()) {
    return (
      <Window title="โต๊ะช่างไม้" icon="hammer" onClose={close}>
        <div class="col center craft-locked">
          <Icon name="lock" size={48} />
          <PT text={`ปลดล็อกที่เลเวล ${CRAFT_LEVEL}`} size={14} weight={600} {...TONE_TEXT.ink} />
          <p class="small muted">ตอนนี้เลเวล {lv} · สวดมนต์และทำงานอาสาในวัดเพื่อเก็บบุญ แล้วมาสร้างเฟอร์นิเจอร์แต่งบ้านกันนะ</p>
          <span class="bar grow" style={{ width: '80%' }}>
            <span style={{ width: `${Math.min(100, (lv / CRAFT_LEVEL) * 100)}%` }} />
          </span>
        </div>
      </Window>
    )
  }
  const r = cur ? recipeOf(cur.id) : null
  const reqs = cur ? requirements(cur.id) : []
  const open = reqs.every((q) => q.met)
  const ok = cur ? craftable(cur.id) : false
  const owned = cur ? (isSurface(cur.id) ? (ownsSurface(s.house, cur.id) ? 1 : 0) : (s.house.storage[cur.id] ?? 0) + s.house.placed.filter((p) => p.id === cur.id).length) : 0
  return (
    <Window title="โต๊ะช่างไม้" icon="hammer" onClose={close} wide>
      <div class="mat-bar">
        {MATERIAL_IDS.map((m) => (
          <span class="mat-chip" key={m} title={MATERIAL_INFO[m].name}>
            <img class="px" src={spriteDataUrl(materialSprite(m), 2)} alt={MATERIAL_INFO[m].name} width={24} height={24} />
            <span class="num">{s.materials[m] ?? 0}</span>
          </span>
        ))}
      </div>
      {cur && r && (
        <div class={`panel craft-preview ${open ? '' : 'locked'}`}>
          <PreviewStage id={cur.id} />
          <div class="craft-info">
            <b class="craft-name">{cur.name}</b>
            <span class="small muted craft-desc">{cur.desc}</span>
            {open ? (
              <Recipe recipe={r.recipe} coins={r.coins} />
            ) : (
              <ul class="craft-reqs">
                {reqs.map((q) => (
                  <li key={q.text} class={q.met ? 'met' : ''}>
                    <Icon name={q.met ? 'check' : 'lock'} size={14} /> {q.text}
                  </li>
                ))}
              </ul>
            )}
            <div class="row">
              {owned > 0 && <span class="small muted">มีแล้ว {owned}</span>}
              <span class="grow" />
              <PBtn
                tone={ok ? 'green' : 'paper'}
                size="small"
                icon="hammer"
                disabled={!open}
                onClick={() => {
                  if (craft(cur.id)) {
                    sfx.coins()
                    haptic(20)
                    toast(`สร้าง${cur.name}แล้ว! ไปจัดห้องกันเลย`, 'hammer')
                  } else sfx.error()
                }}
              >
                {open ? 'สร้าง' : 'ยังล็อกอยู่'}
              </PBtn>
            </div>
          </div>
        </div>
      )}
      <Tabs
        tabs={[
          { id: 'furniture', label: 'ของใช้', icon: 'bed' },
          { id: 'deco', label: 'ของแต่ง', icon: 'garland' },
          { id: 'room', label: 'ผนัง/พื้น', icon: 'home' },
        ]}
        value={t}
        onChange={(x) => {
          setT(x)
          setSel('')
        }}
        compact
      />
      <div class="ptab-body">
        <div class="slot-grid craft-grid">
          {list.map((f) => {
            const locked = !unlocked(f.id)
            const can = craftable(f.id)
            return (
              <Slot key={f.id} size={60} active={cur?.id === f.id} locked={locked} onClick={() => setSel(f.id)} title={f.name} badge={can ? <span class="badge num">!</span> : undefined}>
                <img class="px slot-img" src={spriteDataUrl(FURNITURE_BY_ID[f.id] ? furnitureThumb(f.id) : surfaceThumb(f.id), 2)} alt="" />
              </Slot>
            )
          })}
        </div>
      </div>
      <div class="row" style={{ justifyContent: 'center' }}>
        <PBtn tone="gold" size="small" icon="shop" onClick={() => (close(), openShop('mats'))}>
          ซื้อวัสดุ
        </PBtn>
        <PBtn tone="wood" size="small" icon="market" onClick={() => openPanel('market')}>
          ตลาดนัด
        </PBtn>
      </div>
    </Window>
  )
}

// ---------------------------------------------------------------------------

type BagTab = 'mats' | 'items' | 'furniture'

/** Legacy three-tab bag (replaced by InventoryWindow in v4; kept for reference). */
export function BagWindow() {
  const [t, setT] = useState<BagTab>('mats')
  const [sel, setSel] = useState<string | null>(null)
  const s = game.value
  const items = Object.entries(s.inventory).filter(([id, n]) => n > 0 && ITEM_BY_ID[id])
  const furn = Object.entries(s.house.storage).filter(([id, n]) => n > 0 && FURNITURE_BY_ID[id])
  const info =
    t === 'mats' && sel
      ? { name: MATERIAL_INFO[sel as MaterialId]?.name, desc: MATERIAL_INFO[sel as MaterialId]?.desc }
      : t === 'items' && sel
        ? { name: ITEM_BY_ID[sel]?.name, desc: ITEM_BY_ID[sel]?.desc }
        : t === 'furniture' && sel
          ? { name: FURNITURE_BY_ID[sel]?.name, desc: FURNITURE_BY_ID[sel]?.desc }
          : null
  return (
    <Window title="กระเป๋า" icon="bag" tone="gold" onClose={close}>
      <Tabs
        tabs={[
          { id: 'mats', label: 'วัสดุ', icon: 'hammer' },
          { id: 'items', label: 'ของทำบุญ', icon: 'bowl' },
          { id: 'furniture', label: 'ของแต่งบ้าน', icon: 'home' },
        ]}
        value={t}
        onChange={(x) => (setT(x), setSel(null))}
      />
      <div class="ptab-body">
        <div class="slot-grid">
          {t === 'mats' &&
            MATERIAL_IDS.map((m) => (
              <Slot key={m} size={56} count={s.materials[m] ?? 0} active={sel === m} onClick={() => setSel(m)} title={MATERIAL_INFO[m].name}>
                <img class="px slot-img" src={spriteDataUrl(materialSprite(m), 2)} alt="" />
              </Slot>
            ))}
          {t === 'items' && items.map(([id, n]) => <Slot key={id} size={56} icon={ITEM_BY_ID[id].icon} count={n} active={sel === id} onClick={() => setSel(id)} title={ITEM_BY_ID[id].name} />)}
          {t === 'furniture' &&
            furn.map(([id, n]) => (
              <Slot key={id} size={56} count={n} active={sel === id} onClick={() => setSel(id)} title={FURNITURE_BY_ID[id].name}>
                <img class="px slot-img" src={spriteDataUrl(furnitureThumb(id), 2)} alt="" />
              </Slot>
            ))}
          {Array.from({ length: Math.max(0, 10 - (t === 'mats' ? 5 : t === 'items' ? items.length : furn.length)) }, (_, i) => (
            <Slot key={`e${i}`} size={56} />
          ))}
        </div>
      </div>
      <div class="panel bag-info">
        {info ? (
          <>
            <PT text={info.name ?? ''} size={13} weight={600} {...TONE_TEXT.ink} />
            <div class="small muted">{info.desc}</div>
          </>
        ) : (
          <span class="small muted">แตะช่องเพื่อดูรายละเอียด</span>
        )}
      </div>
      <div class="row" style={{ justifyContent: 'center' }}>
        {t === 'items' && (
          <PBtn tone="gold" size="small" icon="shop" onClick={() => (close(), openShop('alms'))}>
            ซื้อของทำบุญ
          </PBtn>
        )}
        {t !== 'items' && (
          <PBtn tone="wood" size="small" icon="hammer" onClick={() => openPanel('craft')}>
            ไปโต๊ะช่างไม้
          </PBtn>
        )}
      </div>
    </Window>
  )
}

// ---------------------------------------------------------------------------

const MANTRAS = [
  { id: 'buddho', text: 'พุทโธ', desc: 'ภาวนาตามลมหายใจ เข้า "พุท" ออก "โธ"' },
  { id: 'samma', text: 'สัมมาอะระหัง', desc: 'คำภาวนายอดนิยมสำหรับทำสมาธิ' },
  { id: 'napatha', text: 'นะมะพะธะ', desc: 'หัวใจพระคาถาธาตุทั้งสี่' },
  { id: 'metta', text: 'สัพเพ สัตตา', desc: 'แผ่เมตตาให้สรรพสัตว์' },
]

function MalaWindow() {
  const s = game.value
  const [m, setM] = useState(MANTRAS[0].id)
  const [n, setN] = useState(0)
  const [pulse, setPulse] = useState(0)
  const mantra = MANTRAS.find((x) => x.id === m)!
  const today = s.mala.day === dayKey() ? s.mala.today : 0
  const bead = () => {
    const next = n + 1
    setN(next % 108)
    setPulse((p) => p + 1)
    haptic(8)
    sfx.click()
    mutate((d) => {
      if (d.mala.day !== dayKey()) {
        d.mala.day = dayKey()
        d.mala.today = 0
      }
      d.mala.today++
      d.mala.total++
    })
    if (next === 108) {
      sfx.bigBell()
      const merit = addMerit(9, { key: 'mala_round', free: 3 })
      toast(`ครบ 108 เม็ด อนุโมทนาบุญ +${merit} บุญ`, 'mala')
    }
  }
  const beads = 36
  const lit = Math.floor((n / 108) * beads)
  return (
    <Window title="ลูกประคำ ๑๐๘" icon="mala" onClose={close}>
      <div class="row wrap" style={{ justifyContent: 'center' }}>
        {MANTRAS.map((x) => (
          <button key={x.id} class={`chip ${m === x.id ? 'green' : ''}`} onClick={() => (sfx.tap(), setM(x.id))}>
            {x.text}
          </button>
        ))}
      </div>
      <button class="mala-ring" onClick={bead} aria-label={`นับลูกประคำ ตอนนี้ ${n} จาก 108`}>
        {Array.from({ length: beads }, (_, i) => {
          const a = (i / beads) * Math.PI * 2 - Math.PI / 2
          return <span key={i} class={`bead ${i < lit ? 'on' : ''} ${i === lit ? 'cur' : ''}`} style={{ left: `${50 + Math.cos(a) * 42}%`, top: `${50 + Math.sin(a) * 42}%` }} />
        })}
        <span class="mala-center" key={pulse}>
          <PT text={mantra.text} size={15} weight={600} {...TONE_TEXT.ink} />
          <PT text={`${n} / 108`} size={13} {...TONE_TEXT.ink} />
        </span>
      </button>
      <p class="small muted center">{mantra.desc} · แตะวงลูกประคำทุกครั้งที่ภาวนาจบหนึ่งคำ</p>
      <div class="row small" style={{ justifyContent: 'space-around' }}>
        <span>วันนี้ {today} ครั้ง</span>
        <span>ทั้งหมด {s.mala.total.toLocaleString('th-TH')} ครั้ง</span>
      </div>
    </Window>
  )
}

// ---------------------------------------------------------------------------

function ChantBook() {
  const [open, setOpen] = useState<string | null>(null)
  const all = [...CHANTS, chantById('namo1'), chantById('dedication')].filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i)
  return (
    <Window title="หนังสือสวดมนต์" icon="book" onClose={close} wide>
      <p class="small muted">อ่านบทสวดพร้อมคำแปลได้ทุกบทฟรี แตะเพื่อเปิดอ่าน หรือกดฝึกสวดเพื่อเล่นด่านที่ใช้บทนี้</p>
      <div class="col" style={{ gap: '4px' }}>
        {all.map((c) => {
          const st = STAGES.find((x) => x.chant === c.id && stageUnlocked(x))
          const isOpen = open === c.id
          return (
            <div class={`panel chant-entry ${isOpen ? 'open' : ''}`} key={c.id}>
              <button class="chant-head" onClick={() => (sfx.tap(), setOpen(isOpen ? null : c.id))} aria-expanded={isOpen}>
                <Icon name="book" size={20} />
                <PT text={c.name} size={12} weight={600} {...TONE_TEXT.ink} />
                <span class="grow" />
                <span class="small muted">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <div class="chant-body">
                  {c.lines.map((l, i) => (
                    <p class="chant-line" key={i}>
                      {l}
                    </p>
                  ))}
                  <p class="small muted">{c.meaning}</p>
                  {st && (
                    <PBtn
                      tone="green"
                      size="small"
                      icon="pray"
                      onClick={() => {
                        close()
                        prayAtHome.value = mode.value === 'house'
                        prayStage.value = st.id
                      }}
                    >
                      ฝึกสวดบทนี้
                    </PBtn>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Window>
  )
}

// ---------------------------------------------------------------------------

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** A daily calendar event file the player can add to any calendar app. */
function reminderIcs(hour: number, minute: number): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boondee//TH',
    'BEGIN:VEVENT',
    `UID:boondee-pray-${stamp}@boondee`,
    `DTSTAMP:${stamp}T000000Z`,
    `DTSTART:${stamp}T${pad(hour)}${pad(minute)}00`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:สวดมนต์กับบุญดี 🙏',
    'DESCRIPTION:ถึงเวลาสวดมนต์ไหว้พระแล้ว เปิดบุญดีแล้วสวดด้วยกันนะ',
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:ถึงเวลาสวดมนต์แล้ว',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function ReminderWindow() {
  const r = game.value.reminder
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const set = (p: Partial<typeof r>) =>
    mutate((d) => {
      d.reminder = { ...d.reminder, ...p }
    })
  const download = () => {
    const blob = new Blob([reminderIcs(r.hour, r.minute)], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'boondee-reminder.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    sfx.chime()
  }
  return (
    <Window title="เตือนสวดมนต์" icon="bell" onClose={close}>
      <Check
        label="เตือนทุกวัน"
        checked={r.on}
        desc="แจ้งเตือนเมื่อเปิดแอปค้างไว้ และบันทึกลงปฏิทินได้"
        onChange={(v) => {
          set({ on: v })
          if (v && typeof Notification !== 'undefined' && Notification.permission === 'default')
            void Notification.requestPermission()
              .then(setPerm)
              .catch(() => undefined)
        }}
      />
      <div class="row">
        <PT text="เวลา" size={13} {...TONE_TEXT.ink} />
        <span class="grow" />
        <input
          class="pinput time-input"
          type="time"
          value={`${pad(r.hour)}:${pad(r.minute)}`}
          onInput={(e) => {
            const [h, m] = (e.target as HTMLInputElement).value.split(':').map(Number)
            if (Number.isFinite(h) && Number.isFinite(m)) set({ hour: h, minute: m })
          }}
        />
      </div>
      <div class="row wrap">
        {[
          [6, 0, 'เช้าตรู่'],
          [12, 0, 'เที่ยง'],
          [19, 0, 'หัวค่ำ'],
          [21, 30, 'ก่อนนอน'],
        ].map(([h, m, l]) => (
          <button key={String(l)} class={`chip ${r.hour === h && r.minute === m ? 'green' : ''}`} onClick={() => (sfx.tap(), set({ hour: h as number, minute: m as number }))}>
            {l} {pad(h as number)}:{pad(m as number)}
          </button>
        ))}
      </div>
      <PBtn tone="gold" block icon="calendar" onClick={download}>
        เพิ่มลงปฏิทินในมือถือ
      </PBtn>
      {perm === 'denied' && <p class="small muted">การแจ้งเตือนถูกปิดในเบราว์เซอร์ ใช้ไฟล์ปฏิทินแทนได้นะ</p>}
    </Window>
  )
}

/** Fire a gentle in-app/OS reminder when the chosen time arrives while the app is open. */
export function useReminderTicker() {
  useEffect(() => {
    const id = setInterval(() => {
      const r = game.value.reminder
      if (!r.on) return
      const now = new Date()
      if (now.getHours() !== r.hour || now.getMinutes() !== r.minute) return
      const key = `${dayKey()}@${r.hour}:${r.minute}`
      if (sessionStorageGet('boondee.remind') === key) return
      sessionStorageSet('boondee.remind', key)
      toast('ถึงเวลาสวดมนต์แล้ว มาสวดด้วยกันนะ 🙏', 'bell')
      sfx.bell(0)
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('บุญดี', { body: 'ถึงเวลาสวดมนต์แล้ว 🙏' })
      } catch {
        /* ignore */
      }
    }, 20_000)
    return () => clearInterval(id)
  }, [])
}

function sessionStorageGet(k: string) {
  try {
    return sessionStorage.getItem(k)
  } catch {
    return null
  }
}
function sessionStorageSet(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}
