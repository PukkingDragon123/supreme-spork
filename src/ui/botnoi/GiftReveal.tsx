// "บอทน้อยให้ของขวัญ!": the one big reveal at the end of the tutorial. A gift
// box wobbles, pops open and the whole starter kit flies out as chips:
// coins, merit, incense, the alms set, fish food, furniture and the antenna
// headband. (A new save starts empty; during the tutorial Bot Noi only
// lends things, see game/botnoi.ts lendFor.)

import { useEffect, useState } from 'preact/hooks'
import { signal } from '@preact/signals'
import { game } from '../../game/state'
import type { TutPayout } from '../../game/botnoi'
import { ITEM_BY_ID } from '../../game/data/items'
import { FURNITURE_BY_ID } from '../../game/data/furniture'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { equip } from '../../game/actions'
import { PBtn } from '../components/kit'
import { Icon } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { PT, TONE_TEXT } from '../pixeltext'
import { thumbFor } from '../DressUp'
import { sfx, haptic } from '../../engine/audio'
import { BotFace } from './BotBubble'
import { botSfx } from './botSfx'

/** The finale payout being revealed. */
export const tutCelebrate = signal<TutPayout | null>(null)

export function GiftReveal() {
  const g = tutCelebrate.value
  if (!g) return null
  return <Reveal g={g} />
}

function Reveal({ g }: { g: TutPayout }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    botSfx.chirp()
    const t = setTimeout(() => {
      setOpen(true)
      sfx.coins(8)
      setTimeout(() => sfx.levelUp(), 250)
      haptic(40)
    }, 700)
    return () => clearTimeout(t)
  }, [])
  const close = () => (tutCelebrate.value = null)
  const out = g.outfit ? OUTFIT_BY_ID[g.outfit] : null
  const look = game.value.player.look
  let k = 0
  const delay = () => ({ animationDelay: `${++k * 60}ms` })
  return (
    <div class="bn-root">
      <div class="bn-card-back bn-gift" onClick={(e) => e.target === e.currentTarget && open && close()}>
        {open && <FxCanvas mode="confetti" />}
        <div class={`bn-card gift ${open ? 'win-glow' : ''}`} role="dialog" aria-label="บอทน้อยให้ของขวัญ">
          <div class="bn-card-face">
            <BotFace expr={open ? 'love' : 'happy'} arm="cheer" scale={3} />
          </div>
          <PT text="บอทน้อยให้ของขวัญ!" size={17} weight={600} {...TONE_TEXT.gold} class="bn-card-title" />
          <div class={`bn-giftbox ${open ? 'open' : ''}`} aria-hidden="true">
            <Icon name="gift" size={64} />
          </div>
          {open && (
            <>
              <div class="bn-text big">
                <span class="bn-typed">{out ? 'ของที่ให้ยืมไป ตอนนี้เป็นของคุณจริง ๆ แล้ว! แถมชุดเริ่มต้นเต็มกระเป๋าเลยครับ' : 'ขอบคุณที่ทบทวนบทเรียนนะครับ ค่าขนมเล็ก ๆ จากผมเอง!'}</span>
              </div>
              <div class="bn-reward">
                <span class="bn-chip gold pop" style={delay()}>
                  <Icon name="coin" size={18} /> <b class="num">+{g.coins}</b>
                </span>
                {g.merit > 0 && (
                  <span class="bn-chip pink pop" style={delay()}>
                    <Icon name="merit" size={18} /> <b class="num">+{g.merit}</b>
                  </span>
                )}
                {Object.entries(g.items).map(([id, n]) => (
                  <span class="bn-chip pop" key={id} style={delay()}>
                    <Icon name={ITEM_BY_ID[id]?.icon ?? 'gift'} size={18} /> {ITEM_BY_ID[id]?.name ?? id} <b class="num">x{n}</b>
                  </span>
                ))}
                {Object.entries(g.furniture).map(([id, n]) => (
                  <span class="bn-chip rare pop" key={id} style={delay()}>
                    <Icon name="home" size={18} /> {FURNITURE_BY_ID[id]?.name ?? id} <b class="num">x{n}</b>
                  </span>
                ))}
                {out && (
                  <span class="bn-chip rare pop" style={delay()}>
                    <img class="px" src={thumbFor({ ...look, [out.slot]: out.id }, out.slot)} alt="" width={28} height={28} />
                    <span>{out.name}</span>
                  </span>
                )}
              </div>
              <div class="bn-card-actions">
                {out && look.head !== out.id && (
                  <PBtn tone="pink" icon="shirt" onClick={() => (equip(out.slot, out.id), close())}>
                    ใส่เลย!
                  </PBtn>
                )}
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
