import { useEffect } from 'preact/hooks'
import { game } from '../game/state'
import { unlockAudio, setAudioEnabled, setHaptics } from '../engine/audio'
import { TempleView } from './TempleView'
import { Hud } from './Hud'
import { NavBar } from './NavBar'
import { ActionCard, QuickTravel } from './ActionCard'
import { activity, tab, coinStoreOpen, mapOpen, settingsOpen, profileOpen } from './store'
import { QuestsScreen } from './screens/QuestsScreen'
import { ShopScreen } from './screens/ShopScreen'
import { WardrobeScreen } from './screens/WardrobeScreen'
import { SocialScreen } from './screens/SocialScreen'
import { Overlays } from './overlays/Overlays'
import { CoinStore } from './overlays/CoinStore'
import { MapModal } from './overlays/MapModal'
import { SettingsSheet } from './overlays/SettingsSheet'
import { Onboarding } from './overlays/Onboarding'
import { ProfileSheet } from './overlays/ProfileSheet'
import { ActivityHost } from '../activities/ActivityHost'

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

  const t = tab.value
  const act = activity.value
  return (
    <div class={`app ${s.settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <div class="phone">
        {s.onboarded ? (
          <>
            <TempleView active={t === 'temple' && !act} />
            {t === 'temple' && !act && (
              <>
                <QuickTravel />
                <ActionCard />
              </>
            )}
            {t === 'quests' && <QuestsScreen />}
            {t === 'shop' && <ShopScreen />}
            {t === 'wardrobe' && <WardrobeScreen />}
            {t === 'social' && <SocialScreen />}
            <Hud />
            <NavBar />
            {act && <ActivityHost />}
            {coinStoreOpen.value && <CoinStore />}
            {mapOpen.value && <MapModal />}
            {settingsOpen.value && <SettingsSheet />}
            {profileOpen.value && <ProfileSheet />}
          </>
        ) : (
          <Onboarding />
        )}
        <Overlays />
      </div>
    </div>
  )
}
