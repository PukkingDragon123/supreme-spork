import { useEffect } from 'preact/hooks'
import { game } from '../game/state'
import { unlockAudio, setAudioEnabled, setHaptics } from '../engine/audio'
import { TempleView } from './TempleView'
import { Hud } from './Hud'
import { Hotbar } from './Hotbar'
import { Menu } from './Menu'
import { ActionCard } from './ActionCard'
import { activity, tab, coinStoreOpen, mapOpen, settingsOpen, profileOpen, mode, panel, prayStage, houseEditing, type Tab } from './store'
import { QuestsScreen } from './screens/QuestsScreen'
import { ShopScreen } from './screens/ShopScreen'
import { SocialScreen } from './screens/SocialScreen'
import { Overlays } from './overlays/Overlays'
import { CoinStore } from './overlays/CoinStore'
import { MapModal } from './overlays/MapModal'
import { SettingsSheet } from './overlays/SettingsSheet'
import { ProfileSheet } from './overlays/ProfileSheet'
import { ActivityHost } from '../activities/ActivityHost'
import { IntroView, ArrivalView } from './views/Cutscenes'
import { TitleView } from './views/TitleView'
import { CreateView } from './views/CreateView'
import { HouseView } from './views/HouseView'
import { PrayerSelect } from './views/PrayerSelect'
import { PrayerSession } from './views/PrayerSession'
import { Panels, useReminderTicker } from './views/Panels'
import { Window } from './components/kit'
import { QuestHost } from './quest/QuestDialog'
import { QuestTracker } from './quest/QuestTracker'
import { OnlineChat, OnlineHost } from './online/OnlineHost'
import { BotnoiHost } from './botnoi/BotnoiHost'

const SCREEN: Partial<Record<Tab, { title: string; icon: string }>> = {
  quests: { title: 'ภารกิจ', icon: 'scroll' },
  shop: { title: 'ร้านค้า', icon: 'shop' },
  social: { title: 'เพื่อนสายบุญ', icon: 'friends' },
}

function ScreenWindow() {
  const t = tab.value
  const meta = SCREEN[t]
  if (!meta) return null
  return (
    <Window title={meta.title} icon={meta.icon} full onClose={() => (tab.value = 'temple')} class="screen-win">
      {t === 'quests' && <QuestsScreen />}
      {t === 'shop' && <ShopScreen />}
      {t === 'social' && <SocialScreen />}
    </Window>
  )
}

export function App() {
  const s = game.value
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])
  useEffect(() => {
    setAudioEnabled(s.settings.sound, s.settings.music)
  }, [s.settings.sound, s.settings.music])
  useEffect(() => {
    setHaptics(s.settings.haptics)
  }, [s.settings.haptics])
  useReminderTicker()

  const m = mode.value
  const act = activity.value
  const praying = !!prayStage.value
  const inGame = m === 'world' || m === 'house'
  const overlay = !!act || praying || !!panel.value || tab.value !== 'temple'
  return (
    <div class={`app ${s.settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <div class="phone">
        {m === 'intro' && <IntroView />}
        {m === 'title' && <TitleView />}
        {m === 'create' && <CreateView />}
        {m === 'arrival' && <ArrivalView />}
        {m === 'world' && (
          <>
            <TempleView active={!overlay} />
            {!act && !praying && <ActionCard />}
          </>
        )}
        {m === 'house' && <HouseView active={!overlay} />}
        {inGame && !act && !praying && tab.value === 'temple' && !(m === 'house' && houseEditing.value) && (
          <>
            <Hud />
            {m === 'world' && <QuestTracker />}
            {m === 'world' && <OnlineChat />}
            <Hotbar />
          </>
        )}
        {inGame && (
          <>
            <ScreenWindow />
            {act && <ActivityHost />}
            {panel.value === 'menu' && <Menu />}
            {panel.value === 'pray' && <PrayerSelect />}
            <Panels />
            {praying && <PrayerSession />}
            {coinStoreOpen.value && <CoinStore />}
            {mapOpen.value && <MapModal />}
            {settingsOpen.value && <SettingsSheet />}
            {profileOpen.value && <ProfileSheet />}
            <OnlineHost />
            <QuestHost />
            <BotnoiHost />
          </>
        )}
        <Overlays />
      </div>
    </div>
  )
}
