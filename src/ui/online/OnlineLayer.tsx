// Speech bubbles and emote icons that follow real players' heads (and
// yours) in the world. Plain DOM text (textContent), repositioned every
// frame; bubbles of players standing close together stack instead of
// covering each other or their name tags.

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
}

interface Box {
  l: number
  r: number
  t: number
  b: number
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
      return { box, text, icon }
    }
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const sc = worldScene()
      const st = stage.current
      if (!sc || !st || !layer.current) return
      const now = Date.now()
      const keys = new Set<string>()
      for (const [k, b] of bubbles) if (b.until > now) keys.add(k)
      for (const [k, e] of emotes) if (e.until > now) keys.add(k)
      const tagList = sc.nameTags()
      const tags = new Map(tagList.map((t) => [t.id, t]))
      // Real players' name tags are obstacles too (approximate boxes, CSS px).
      const taken: Box[] = tagList
        .filter((t) => t.real)
        .map((t) => {
          const [x, y] = st.toCss(t.x, t.y)
          const h = t.doing ? 30 : 16
          return { l: x - 48, r: x + 48, t: y - h, b: y }
        })
      const placed: { slot: Slot; x: number; y: number; scale: number; opacity: number }[] = []
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
        slot.box.style.display = ''
        // Sit above the head (and above the name tag for other players).
        const tag = tags.get(k)
        const lift = k === 'me' ? 4 : tag?.doing ? 34 : 20
        const [x, y] = st.toCss(pos[0], pos[1] - 30)
        const age = Math.min(b && text ? now - b.at : Infinity, em ? now - em.at : Infinity)
        const scale = age < 160 ? 0.7 + (age / 160) * 0.3 : 1
        const left = Math.min(b && text ? b.until - now : Infinity, em ? em.until - now : Infinity, 400)
        placed.push({ slot, x, y: y - lift, scale, opacity: Math.max(0, Math.min(1, left / 400)) })
      }
      // Lowest bubble first; anything overlapping moves up above it.
      placed.sort((a, b) => b.y - a.y)
      for (const p of placed) {
        const w = p.slot.box.offsetWidth
        const h = p.slot.box.offsetHeight
        let bottom = p.y
        for (let n = 0; n < 6; n++) {
          const l = p.x - w / 2
          const r = p.x + w / 2
          const hit = taken.find((o) => l < o.r && r > o.l && bottom - h < o.b && bottom > o.t)
          if (!hit) break
          bottom = hit.t - 2
        }
        taken.push({ l: p.x - w / 2, r: p.x + w / 2, t: bottom - h, b: bottom })
        p.slot.box.style.opacity = String(p.opacity)
        p.slot.box.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(bottom)}px) translate(-50%, -100%) scale(${p.scale.toFixed(3)})`
      }
      for (; i < pool.length; i++) pool[i].box.style.display = 'none'
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div class="ol-layer" ref={layer} aria-hidden="true" />
}
