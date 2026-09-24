// Small shared UI components.

import type { ComponentChildren, JSX } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { iconUrl } from '../../art/icons'
import { avatarPortrait, avatarSprite, type AvatarLook, type Pose, type View } from '../../art/avatar'
import { spriteDataUrl } from '../../engine/sprite'
import { sfx } from '../../engine/audio'

export function Icon({ name, size = 24, class: cls, title }: { name: string; size?: number; class?: string; title?: string }) {
  const scale = Math.max(1, Math.ceil((size * (window.devicePixelRatio || 1)) / 16))
  return <img class={`px ${cls ?? ''}`} src={iconUrl(name, scale)} width={size} height={size} alt={title ?? ''} draggable={false} />
}

export function Coin({ n, size = 18, class: cls }: { n: number | string; size?: number; class?: string }) {
  return (
    <span class={`row ${cls ?? ''}`} style={{ gap: '4px', display: 'inline-flex' }}>
      <Icon name="coin" size={size} />
      <span class="num">{typeof n === 'number' ? n.toLocaleString('th-TH') : n}</span>
    </span>
  )
}

export function Merit({ n, size = 18 }: { n: number | string; size?: number }) {
  return (
    <span class="row" style={{ gap: '4px', display: 'inline-flex' }}>
      <Icon name="merit" size={size} />
      <span class="num">{typeof n === 'number' ? n.toLocaleString('th-TH') : n}</span>
    </span>
  )
}

export function AvatarImg({
  look,
  view = 'front',
  pose = 'stand',
  scale = 4,
  class: cls,
  barefoot,
}: {
  look: AvatarLook
  view?: View
  pose?: Pose
  scale?: number
  class?: string
  barefoot?: boolean
}) {
  const url = useMemo(() => spriteDataUrl(avatarSprite(look, view, pose, { barefoot }), scale), [JSON.stringify(look), view, pose, scale, barefoot])
  return <img class={`px ${cls ?? ''}`} src={url} alt="" draggable={false} style={{ width: `${18 * scale}px`, height: `${29 * scale}px` }} />
}

export function Portrait({ look, size = 40 }: { look: AvatarLook; size?: number }) {
  const url = useMemo(() => spriteDataUrl(avatarPortrait(look), 6), [JSON.stringify(look)])
  return (
    <span class="portrait" style={{ width: `${size}px`, height: `${size}px` }}>
      <img class="px" src={url} alt="" draggable={false} style={{ width: `${size}px`, height: `${size}px` }} />
    </span>
  )
}

export function Bar({ value, max, tone, label }: { value: number; max: number; tone?: 'pink' | 'green'; label?: string }) {
  const pct = max <= 0 ? 100 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div class={`bar ${tone ?? ''}`} role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Modal({
  children,
  onClose,
  class: cls,
  wide,
}: {
  children: ComponentChildren
  onClose?: () => void
  class?: string
  wide?: boolean
}) {
  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div class={`panel modal ${wide ? 'wide' : ''} ${cls ?? ''}`}>
        {onClose && (
          <button class="btn paper icon-btn small modal-x" onClick={() => (sfx.tap(), onClose())} aria-label="ปิด">
            <Icon name="close" size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

export function Sheet({ children, onClose, title }: { children: ComponentChildren; onClose?: () => void; title?: string }) {
  return (
    <div class="modal-backdrop sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div class="panel sheet">
        {title && <div class="sheet-title title">{title}</div>}
        {onClose && (
          <button class="btn paper icon-btn small modal-x" onClick={() => (sfx.tap(), onClose())} aria-label="ปิด">
            <Icon name="close" size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

export function Btn(props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: string; size?: 'small' | 'big'; block?: boolean; silent?: boolean }) {
  const { tone, size, block, silent, class: cls, onClick, ...rest } = props
  return (
    <button
      {...rest}
      class={`btn ${tone ?? ''} ${size ?? ''} ${block ? 'block' : ''} ${cls ?? ''}`}
      onClick={(e) => {
        if (!silent) sfx.tap()
        ;(onClick as ((e: MouseEvent) => void) | undefined)?.(e as unknown as MouseEvent)
      }}
    />
  )
}

/** Re-render periodically (for countdowns and time-of-day labels). */
export function useTicker(ms = 1000) {
  const [, set] = useState(0)
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

/** Resolve a promise-returning function into state. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): T | null {
  const [v, setV] = useState<T | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    fn().then((r) => alive.current && setV(r))
    return () => {
      alive.current = false
    }
  }, deps)
  return v
}

export function Hearts({ value, max = 10 }: { value: number; max?: number }) {
  const hearts = []
  for (let i = 0; i < max / 2; i++) {
    const v = value - i * 2
    hearts.push(<span class={`heart ${v >= 2 ? 'full' : v === 1 ? 'half' : 'empty'}`} key={i} />)
  }
  return <span class="hearts">{hearts}</span>
}
