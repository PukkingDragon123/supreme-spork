// แผนที่ประเทศไทย – an illustrated pixel map of Thailand with famous places to
// make merit. Places open with prayer stars (or Boon Coins) and each one is
// visited through the arrival cutscene.

import { useEffect, useRef, useState } from 'preact/hooks'
import { Stage } from '../../engine/stage'
import { ThaiMapScene, placeIcon } from '../../scenes/thaimap'
import { ALL_PLACES, PLACE_BY_ID, REGION_BY_ID, type Place } from '../../game/data/places'
import type { AreaId } from '../../game/data/areas'
import { game, mutate } from '../../game/state'
import { isAreaUnlocked, setArea, spendCoins, unlockArea } from '../../game/actions'
import { totalStars } from '../../game/prayer'
import { currentPhase } from '../../scenes/sky'
import { spriteDataUrl } from '../../engine/sprite'
import { area, goTemple, mapOpen, mode } from '../store'
import { CloseX, PBtn, TitlePlate } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Coin, Icon } from '../components/common'
import { toast } from '../../game/events'
import { sfx } from '../../engine/audio'

function placeOpen(p: Place): boolean {
  if (p.home) return isAreaUnlocked(p.id as AreaId)
  return totalStars() >= p.stars || game.value.places.bought.includes(p.id)
}

function currentPin(): string | null {
  const s = game.value
  if (mode.value !== 'world') return null
  return s.places.current ?? area.value
}

export function MapModal() {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<ThaiMapScene | null>(null)
  const stage = useRef<Stage | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const close = () => (sfx.close(), (mapOpen.value = false))

  useEffect(() => {
    const st = new Stage(host.current!, { targetWidth: 200 })
    const sc = new ThaiMapScene(
      {
        unlocked: (id) => {
          const p = PLACE_BY_ID[id]
          return !!p && placeOpen(p)
        },
        current: currentPin(),
        visited: game.value.places.visited,
        night: ['dusk', 'night'].includes(currentPhase()),
      },
      {
        onSelect: (id) => {
          sfx.tap()
          setSel(id)
        },
        onDeselect: () => setSel(null),
      },
    )
    st.setScene(sc)
    st.start()
    stage.current = st
    scene.current = sc
    return () => {
      st.destroy()
      scene.current = null
    }
  }, [])

  // Keep the selected pin clear of the header and the card.
  useEffect(() => {
    const st = stage.current
    const sc = scene.current
    if (!st || !sc) return
    sc.setInsets(Math.round(64 / st.cssScale), sel ? Math.round(300 / st.cssScale) : 0)
    if (sel) sc.focus(sel)
  }, [sel])

  const s = game.value
  const stars = totalStars(s)
  const p = sel ? PLACE_BY_ID[sel] : null
  const open = p ? placeOpen(p) : false
  const here = p ? currentPin() === p.id : false

  const go = (pl: Place) => {
    sfx.whoosh()
    mapOpen.value = false
    if (pl.home) {
      setArea(pl.id as AreaId)
      goTemple(pl.id as AreaId, null)
    } else goTemple(pl.scene, pl.id)
  }

  const buy = (pl: Place) => {
    if (pl.home) {
      if (unlockArea(pl.id as AreaId)) {
        sfx.purchase()
        scene.current?.setState({})
        setSel(pl.id)
      }
      return
    }
    if (!spendCoins(pl.coins)) return
    mutate((d) => {
      if (!d.places.bought.includes(pl.id)) d.places.bought.push(pl.id)
    })
    sfx.purchase()
    toast(`ปลดล็อก${pl.name}แล้ว!`, 'map')
    scene.current?.setState({})
    setSel(pl.id)
  }

  const visited = s.places.visited.filter((id) => !PLACE_BY_ID[id]?.home).length
  const total = ALL_PLACES.filter((x) => !x.home).length

  return (
    <div class="thaimap">
      <div class="stage-host" ref={host} />
      <div class="thaimap-head">
        <TitlePlate text="แผนที่ทำบุญทั่วไทย" icon="map" />
        <span class="chip dark thaimap-stats">
          <Icon name="star" size={14} /> {stars} · เยือนแล้ว {visited}/{total}
        </span>
      </div>
      <CloseX onClick={close} />
      {!p && <div class="thaimap-hint small">แตะหมุดเพื่อดูสถานที่ · ลากเพื่อเลื่อน · แตะสองครั้งเพื่อซูม</div>}
      {p && (
        <div class="win place-card" key={p.id}>
          <div class="row">
            <img class="px place-icon" src={spriteDataUrl(placeIcon(p.id, !open), 3)} alt="" width={72} height={78} />
            <div class="grow col" style={{ gap: '1px' }}>
              <PT text={p.name} size={14} weight={600} {...TONE_TEXT.ink} />
              <span class="small muted">
                {p.en} · {p.province}
                {!p.home && REGION_BY_ID[p.region] ? ` · ${REGION_BY_ID[p.region].name}` : ''}
              </span>
              <span class="small place-tag">{p.tagline}</span>
            </div>
          </div>
          <p class="small place-about">{p.about}</p>
          <div class="row wrap place-wish">
            <span class="small muted">นิยมขอพรเรื่อง</span>
            {p.wishFor.map((w) => (
              <span class="chip gold small" key={w}>
                {w}
              </span>
            ))}
            {p.bonus > 1 && <span class="chip green small">บุญ x{p.bonus}</span>}
          </div>
          <p class="small muted place-tip">
            <Icon name="info" size={14} /> {p.tip}
          </p>
          {here ? (
            <PBtn tone="paper" block disabled>
              คุณอยู่ที่นี่แล้ว
            </PBtn>
          ) : open ? (
            <PBtn tone="green" block size="big" icon="temple" onClick={() => go(p)}>
              ออกเดินทาง
            </PBtn>
          ) : (
            <div class="row">
              <span class="chip small">
                <Icon name="star" size={14} /> ต้องมี {p.stars} ดาว (มี {stars})
              </span>
              <span class="grow" />
              <PBtn tone="gold" size="small" onClick={() => buy(p)}>
                ปลดล็อก <Coin n={p.coins} size={14} />
              </PBtn>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
