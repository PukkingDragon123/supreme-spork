// v2 pixel UI kit: wooden windows with green title plates, chunky buttons,
// inventory slots, folder tabs, stars, toggles and sliders.

import type { ComponentChildren, JSX } from 'preact'
import { toChildArray } from 'preact'
import { PT, TONE_TEXT } from '../pixeltext'
import { Icon } from './common'
import { sfx } from '../../engine/audio'

export type Tone = 'green' | 'gold' | 'red' | 'blue' | 'paper' | 'wood' | 'pink' | 'dark'

const LABEL_SIZE = { small: 12, normal: 13, big: 14 } as const

/** Turn plain strings inside a button into pixel text. */
function pixelChildren(children: ComponentChildren, tone: Tone, size: keyof typeof LABEL_SIZE) {
  return toChildArray(children).map((c, i) =>
    typeof c === 'string' || typeof c === 'number' ? (
      String(c).trim() ? <PT key={`t${i}`} text={String(c).trim()} size={LABEL_SIZE[size]} weight={size === 'big' ? 600 : 500} {...TONE_TEXT[tone]} /> : null
    ) : (
      c
    ),
  )
}

export type PBtnProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> & {
  tone?: Tone
  size?: 'small' | 'big'
  block?: boolean
  silent?: boolean
  icon?: string
  iconSize?: number
}

/** Chunky pixel button with a pixel-text label. */
export function PBtn(props: PBtnProps) {
  const { tone = 'green', size, block, silent, icon, iconSize, class: cls, onClick, children, ...rest } = props
  const sz = size === 'small' ? 'small' : size === 'big' ? 'big' : 'normal'
  return (
    <button
      {...rest}
      class={`btn ${tone} ${size ?? ''} ${block ? 'block' : ''} ${cls ?? ''}`}
      onClick={(e) => {
        if (!silent) sfx.tap()
        ;(onClick as ((e: MouseEvent) => void) | undefined)?.(e as unknown as MouseEvent)
      }}
    >
      {icon && <Icon name={icon} size={iconSize ?? (size === 'small' ? 18 : size === 'big' ? 26 : 22)} />}
      {pixelChildren(children, tone, sz)}
    </button>
  )
}

/** Green (or gold) plate with a pixel-text title. */
export function TitlePlate({ text, tone = 'green', icon, class: cls }: { text: string; tone?: 'green' | 'gold' | 'wood'; icon?: string; class?: string }) {
  return (
    <div class={`title-plate ${tone} ${cls ?? ''}`}>
      {icon && <Icon name={icon} size={20} />}
      <PT text={text} size={15} weight={600} {...(tone === 'gold' ? TONE_TEXT.gold : tone === 'wood' ? TONE_TEXT.wood : TONE_TEXT.green)} />
    </div>
  )
}

export function CloseX({ onClick, label = 'ปิด' }: { onClick: () => void; label?: string }) {
  return (
    <button
      class="btn red icon-btn small win-x"
      aria-label={label}
      onClick={() => {
        sfx.close()
        onClick()
      }}
    >
      <Icon name="close" size={16} />
    </button>
  )
}

/**
 * Modal window: backdrop + wooden frame + title plate. `full` makes it fill
 * the phone (for big screens like the shop), otherwise it hugs its content.
 */
export function Window({
  title,
  icon,
  tone = 'green',
  onClose,
  children,
  full,
  wide,
  class: cls,
  footer,
  backdrop = true,
}: {
  title?: string
  icon?: string
  tone?: 'green' | 'gold' | 'wood'
  onClose?: () => void
  children: ComponentChildren
  full?: boolean
  wide?: boolean
  class?: string
  footer?: ComponentChildren
  backdrop?: boolean
}) {
  const win = (
    <div class={`win ${full ? 'full' : ''} ${wide ? 'wide' : ''} ${title ? 'titled' : ''} ${cls ?? ''}`} role="dialog" aria-label={title}>
      {title && <TitlePlate text={title} tone={tone} icon={icon} class="win-title" />}
      {onClose && <CloseX onClick={onClose} />}
      <div class="win-body scroll">{children}</div>
      {footer && <div class="win-foot">{footer}</div>}
    </div>
  )
  if (!backdrop) return win
  return (
    <div class="win-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      {win}
    </div>
  )
}

/** Inventory-style slot. */
export function Slot({
  icon,
  img,
  count,
  active,
  locked,
  label,
  onClick,
  children,
  size = 56,
  class: cls,
  title,
  badge,
}: {
  icon?: string
  img?: string
  count?: number | string
  active?: boolean
  locked?: boolean
  label?: string
  onClick?: () => void
  children?: ComponentChildren
  size?: number
  class?: string
  title?: string
  badge?: ComponentChildren
}) {
  return (
    <button
      class={`slot ${active ? 'on' : ''} ${locked ? 'locked' : ''} ${cls ?? ''}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      onClick={() => {
        if (!onClick) return
        sfx.tap()
        onClick()
      }}
      aria-label={title ?? label}
      aria-pressed={active}
      title={title}
    >
      {img && <img class="px slot-img" src={img} alt="" draggable={false} />}
      {icon && <Icon name={icon} size={Math.round(size * 0.55)} />}
      {children}
      {count != null && count !== '' && <span class="slot-count num">{count}</span>}
      {locked && (
        <span class="slot-lock">
          <Icon name="lock" size={18} />
        </span>
      )}
      {badge && <span class="slot-badge">{badge}</span>}
      {label && <span class="slot-label">{label}</span>}
    </button>
  )
}

export interface TabDef<T extends string> {
  id: T
  label: string
  icon?: string
  badge?: number
}

/** Folder tabs that sit on top of a window body. */
export function Tabs<T extends string>({ tabs, value, onChange, class: cls }: { tabs: TabDef<T>[]; value: T; onChange: (id: T) => void; class?: string }) {
  return (
    <div class={`ptabs ${cls ?? ''}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          class={`ptab ${t.id === value ? 'on' : ''}`}
          onClick={() => {
            if (t.id === value) return
            sfx.tap()
            onChange(t.id)
          }}
        >
          {t.icon && <Icon name={t.icon} size={18} />}
          <PT text={t.label} size={12} {...(t.id === value ? TONE_TEXT.paper : TONE_TEXT.wood)} />
          {!!t.badge && <span class="badge num">{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

export function Stars({ n, max = 3, size = 18, class: cls }: { n: number; max?: number; size?: number; class?: string }) {
  const out = []
  for (let i = 0; i < max; i++) out.push(<Icon key={i} name={i < n ? 'star' : 'star_empty'} size={size} />)
  return (
    <span class={`stars ${cls ?? ''}`} aria-label={`${n} ดาว จาก ${max}`}>
      {out}
    </span>
  )
}

/** Pixel checkbox row (reference: settings window). */
export function Check({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) {
  return (
    <label class="pcheck">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          sfx.click()
          onChange((e.target as HTMLInputElement).checked)
        }}
      />
      <span class="pcheck-box" aria-hidden="true">
        {checked && <Icon name="check" size={18} />}
      </span>
      <span class="pcheck-text">
        <PT text={label} size={13} {...TONE_TEXT.ink} />
        {desc && <span class="small muted">{desc}</span>}
      </span>
    </label>
  )
}

/** Pixel slider (0–100). */
export function Slider({ label, value, onChange, min = 0, max = 100 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const pct = (value - min) / (max - min)
  return (
    <label class="pslider">
      <PT text={label} size={13} {...TONE_TEXT.ink} />
      <span class="pslider-track" style={{ ['--p' as string]: String(pct) }}>
        <span class="pslider-fill" />
        <span class="pslider-knob" />
        <input type="range" min={min} max={max} value={value} onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))} aria-label={label} />
      </span>
    </label>
  )
}

/** A heading inside a window body. */
export function Heading({ text, icon, right }: { text: string; icon?: string; right?: ComponentChildren }) {
  return (
    <div class="pheading">
      {icon && <Icon name={icon} size={20} />}
      <PT text={text} size={14} weight={600} {...TONE_TEXT.ink} />
      <span class="grow" />
      {right}
    </div>
  )
}
