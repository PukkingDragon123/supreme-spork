// "บอทน้อยให้ของขวัญ!": the reveal card when Bot Noi hands something out
// (tutorial gifts; a new save starts with an empty bag). A gift box
// wobbles, pops open and the goodies fly out as chips.

import { useEffect, useState } from 'preact/hooks'
import { signal } from '@preact/signals'
import type { TutGift } from '../../game/botnoiTutorial'
import { ITEM_BY_ID } from '../../game/data/items'
import { FURNITURE_BY_ID } from '../../game/data/furniture'
import { PBtn } from '../components/kit'
import { Icon } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { PT, TONE_TEXT } from '../pixeltext'
import { sfx, haptic } from '../../engine/audio'
import { BotFace } from './BotBubble'
import { botSfx } from './botSfx'
import { activity, prayStage } from '../store'

/** The gift being revealed right now. */
export const botGift = signal<TutGift | null>(null)

/** Wait until the player is back in the world (no mini-game, prayer or pop-up). */
function free() {
  return !activity.value && !prayStage.value && !document.querySelector('.modal-backdrop, .qd-backdrop, .ad-overlay, .cine')
}

export function GiftReveal() {
  const g = botGift.value
  const [ok, setOk] = useState(false)
  useEffect(() => {
    if (!g) return
    setOk(free())
    const iv = setInterval(() => setOk(free()), 250)
    return () => clearInterval(iv)
  }, [g?.id])
  if (!g || !ok) return null
  return <Reveal key={g.id} g={g} />
}

function Reveal({ g }: { g: TutGift }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    botSfx.chirp()
    const t = setTimeout(() => {
      setOpen(true)
      sfx.sparkle()
      haptic(20)
    }, 650)
    return () => clearTimeout(t)
  }, [])
  const close = () => {
    sfx.coins(4)
    botGift.value = null
  }
  return (
    <div class="bn-root">
      <div class="bn-card-back bn-gift" onClick={(e) => e.target === e.currentTarget && open && close()}>
        {open && <FxCanvas mode="sparkle" />}
        <div class="bn-card gift" role="dialog" aria-label="บอทน้อยให้ของขวัญ">
          <div class="bn-card-face">
            <BotFace expr={open ? 'love' : 'happy'} arm="cheer" scale={3} />
          </div>
          <PT text="บอทน้อยให้ของขวัญ!" size={16} weight={600} {...TONE_TEXT.gold} class="bn-card-title" />
          <div class={`bn-giftbox ${open ? 'open' : ''}`} aria-hidden="true">
            <Icon name="gift" size={64} />
          </div>
          {open && (
            <>
              <div class="bn-text big">
                <span class="bn-typed">{g.line}</span>
              </div>
              <div class="bn-reward">
                {!!g.coins && (
                  <span class="bn-chip gold pop">
                    <Icon name="coin" size={18} /> <b class="num">+{g.coins}</b>
                  </span>
                )}
                {Object.entries(g.items ?? {}).map(([id, n], i) => (
                  <span class="bn-chip pop" key={id} style={{ animationDelay: `${(i + 1) * 70}ms` }}>
                    <Icon name={ITEM_BY_ID[id]?.icon ?? 'gift'} size={18} /> {ITEM_BY_ID[id]?.name ?? id} <b class="num">x{n}</b>
                  </span>
                ))}
                {Object.entries(g.furniture ?? {}).map(([id, n], i) => (
                  <span class="bn-chip rare pop" key={id} style={{ animationDelay: `${(i + 1) * 90}ms` }}>
                    <Icon name="home" size={18} /> {FURNITURE_BY_ID[id]?.name ?? id} <b class="num">x{n}</b>
                  </span>
                ))}
              </div>
              <div class="bn-card-actions">
                <PBtn tone="green" icon="wai" onClick={close}>
                  ขอบใจนะบอทน้อย!
                </PBtn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
