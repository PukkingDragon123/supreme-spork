// Mounts everything บอทน้อย in the game shell (App.tsx): the tutorial coach
// marks, feature tips, his sheet, the finale celebration and the
// "บอทน้อยมาแล้ว!" intro for players who started before he arrived.

import { useEffect } from 'preact/hooks'
import { game } from '../../game/state'
import { registerFloatingGiver } from '../quest/questUi'
import { BOTNOI_GIVER } from '../../game/data/npcQuests/botnoi'
import { mode } from '../store'
import { Coach } from './Coach'
import { TipHost } from './Tips'
import { BotMenu, openBotQuests } from './BotMenu'
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
    </>
  )
}
