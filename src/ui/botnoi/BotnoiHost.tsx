// Mounts everything บอทน้อย in the game shell (App.tsx): the tutorial coach
// marks, feature tips, his sheet, the finale celebration and the
// "บอทน้อยมาแล้ว!" intro for players who started before he arrived.

import { useEffect } from 'preact/hooks'
import { game } from '../../game/state'
import { OUTFIT_BY_ID } from '../../game/data/outfits'
import { equip } from '../../game/actions'
import { registerFloatingGiver } from '../quest/questUi'
import { BOTNOI_GIVER } from '../../game/data/npcQuests/botnoi'
import { mode } from '../store'
import { PBtn } from '../components/kit'
import { Icon } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { PT, TONE_TEXT } from '../pixeltext'
import { thumbFor } from '../DressUp'
import { Coach, tutCelebrate } from './Coach'
import { TipHost } from './Tips'
import { BotMenu, openBotQuests } from './BotMenu'
import { BotFace } from './BotBubble'
import { botMenu, openBotMenu, popupsAllowed } from './botStore'
import { installTutorial } from './tutorialCtl'
import { GiftReveal } from './GiftReveal'
import { BagHint } from './BagHint'
import './botnoi.css'

installTutorial()
// Quest log / tracker "นำทาง" for Bot Noi's quests opens his sheet.
registerFloatingGiver(BOTNOI_GIVER, openBotQuests)

let offered = false

export function BotnoiHost() {
  const m = mode.value
  const st = game.value.botnoi
  useEffect(() => {
    if (offered || m !== 'world' || st?.tut !== 'offer' || !popupsAllowed()) return
    const iv = setInterval(() => {
      if (document.querySelector('.modal-backdrop, .qd-backdrop, .cine, .win-backdrop') || botMenu.value) return
      offered = true
      openBotMenu('hello')
      clearInterval(iv)
    }, 700)
    return () => clearInterval(iv)
  }, [m, st?.tut])
  return (
    <>
      <Coach />
      <TipHost />
      <BotMenu />
      <BagHint />
      <GiftReveal />
      {tutCelebrate.value && <Celebrate />}
    </>
  )
}

function Celebrate() {
  const got = tutCelebrate.value!
  const out = got.outfit ? OUTFIT_BY_ID[got.outfit] : null
  const close = () => (tutCelebrate.value = null)
  return (
    <div class="bn-root">
      <div class="bn-card-back celebrate" onClick={(e) => e.target === e.currentTarget && close()}>
        <FxCanvas mode="confetti" />
        <div class="bn-card finish win-glow" role="dialog" aria-label="รางวัลเรียนจบ">
          <div class="bn-card-face">
            <BotFace expr="love" arm="cheer" scale={3} />
          </div>
          <PT text="ยินดีด้วยครับ!" size={17} weight={600} {...TONE_TEXT.gold} class="bn-card-title" />
          <div class="bn-reward big">
            <span class="bn-chip gold">
              <Icon name="coin" size={22} /> <b class="num">+{got.coins}</b>
            </span>
            {got.merit > 0 && (
              <span class="bn-chip pink">
                <Icon name="merit" size={22} /> <b class="num">+{got.merit}</b>
              </span>
            )}
            {out && (
              <span class="bn-chip rare">
                <img class="px" src={thumbFor({ ...game.value.player.look, [out.slot]: out.id }, out.slot)} alt="" width={32} height={32} />
                <span>{out.name}</span>
              </span>
            )}
          </div>
          <div class="bn-card-actions">
            {out && game.value.player.look.head !== out.id && (
              <PBtn tone="pink" icon="shirt" onClick={() => (equip(out.slot, out.id), close())}>
                ใส่เลย!
              </PBtn>
            )}
            <PBtn tone="green" icon="check" onClick={close}>
              เย้! ไปทำบุญกันต่อ
            </PBtn>
          </div>
        </div>
      </div>
    </div>
  )
}
