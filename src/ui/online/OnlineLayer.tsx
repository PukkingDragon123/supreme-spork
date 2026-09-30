// Speech bubbles and emote icons that follow real players' heads (and
// yours) in the world. Plain DOM text (textContent), repositioned every frame.

import { useEffect, useRef } from 'preact/hooks'
import type { Stage } from '../../engine/stage'
import { worldScene } from '../TempleView'
import { bubbles, emotes, EMOTE_INFO } from './onlineStore'
import { netIconUrl } from './netIcons'
import { iconUrl } from '../../art/icons'
import './online.css'

interface Slot {
  box: HTMLDivElement
  text: HTMLSpanElement
  icon: HTMLImageElement
  key: string
}

function emoteUrl(icon: string): string {
  return netIconUrl(icon, 3) ?? iconUrl(icon, 3)
}

export function OnlineLayer({ stage }: { stage: { current: Stage | null } }) {
  const layer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const pool: Slot[] = []
    const make = (): Slot => {
      const box = document.createElement('div')
      box.className = 'ol-say'
      const icon = document.createElement('img')
      icon.className = 'px ol-emote'
      icon.alt = ''
      const text = document.createElement('span')
      box.append(icon, text)
      layer.current!.appendChild(box)
      return { box, text, icon, key: '' }
    }
    const tick = () => {
      const sc = worldScene()
      const st = stage.current
      raf = requestAnimationFrame(tick)
      if (!sc || !st || !layer.current) return
      const now = Date.now()
      const keys = new Set<string>()
      for (const [k, b] of bubbles) if (b.until > now) keys.add(k)
      for (const [k, e] of emotes) if (e.until > now) keys.add(k)
      const tags = new Map(sc.nameTags().map((t) => [t.id, t]))
      let i = 0
      for (const k of keys) {
        const pos = k === 'me' ? sc.playerScreenPos() : sc.remoteScreenPos(k)
        if (!pos) continue
        const slot = pool[i] ?? (pool[i] = make())
        i++
        const b = bubbles.get(k)
        const e = emotes.get(k)
        const text = b && b.until > now ? b.text : ''
        const em = e && e.until > now ? e : null
        if (slot.text.textContent !== text) slot.text.textContent = text
        const url = em ? emoteUrl(EMOTE_INFO[em.e].icon) : ''
        if (url && slot.icon.getAttribute('src') !== url) slot.icon.src = url
        slot.icon.style.display = em ? '' : 'none'
        const cls = `ol-say${k === 'me' ? ' me' : ''}${text ? '' : ' icon-only'}${em ? ` em-${em.e}` : ''}`
        if (slot.box.className !== cls) slot.box.className = cls
        // Sit above the head (and above the name tag for other players).
        const tag = tags.get(k)
        const lift = k === 'me' ? 4 : tag?.doing ? 34 : 20
        const [x, y] = st.toCss(pos[0], pos[1] - 30)
        const age = Math.min(b && text ? now - b.at : Infinity, em ? now - em.at : Infinity)
        const pop = age < 160 ? 0.7 + (age / 160) * 0.3 : 1
        const left = Math.min(b && text ? b.until - now : Infinity, em ? em.until - now : Infinity, 400)
        slot.box.style.opacity = String(Math.max(0, Math.min(1, left / 400)))
        slot.box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y - lift)}px) translate(-50%, -100%) scale(${pop.toFixed(3)})`
        slot.box.style.display = ''
      }
      for (; i < pool.length; i++) pool[i].box.style.display = 'none'
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div class="ol-layer" ref={layer} aria-hidden="true" />
}
