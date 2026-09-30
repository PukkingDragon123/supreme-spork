// แผนที่ประเทศไทย – an illustrated pixel map of Thailand with famous places to
// make merit. Places open with prayer stars (or Boon Coins) and each one is
// visited through the arrival cutscene. Famous temples also sit on a regional
// rank ladder (C → SS) that must be climbed first (see game/homeland.ts).

import { useEffect, useRef, useState } from 'preact/hooks'
import { Stage } from '../../engine/stage'
import { ThaiMapScene, placeIcon } from '../../scenes/thaimap'
import { ALL_PLACES, PLACE_BY_ID, REGION_BY_ID, type Place, type Region } from '../../game/data/places'
import type { AreaId } from '../../game/data/areas'
import { game, mutate } from '../../game/state'
import { isAreaUnlocked, setArea, spendCoins, unlockArea } from '../../game/actions'
import { totalStars } from '../../game/prayer'
import { currentPhase } from '../../scenes/sky'
import { spriteDataUrl } from '../../engine/sprite'
import { area, goTemple, mapOpen, mode, travelGuards } from '../store'
import { CloseX, PBtn, TitlePlate } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Coin, Icon } from '../components/common'
import { toast } from '../../game/events'
import { sfx } from '../../engine/audio'
import { RANK_BY_PLACE, TIER_BY_ID } from '../../game/data/ranks'
import { claimableRanks, HOME_BONUS, homeRegion, inHomeRegion, placeAccess } from '../../game/homeland'
import { installHomelandTracking } from '../../game/homelandActions'
import { trophyIcon } from '../../art/ranks'
import { RankBoard, TierBadge } from '../homeland/RankBoard'
import '../homeland/homeland.css'

// Count merit at ranked temples while the player is really there (not praying at home).
installHomelandTracking(() => mode.value === 'world')
// Every trip to a real place (map, hub pins, links) respects the temple-rank lock.
travelGuards.push((id) => {
  const p = PLACE_BY_ID[id]
  if (!p || p.home || placeAccess(game.value, id).open) return true
  sfx.error()
  toast(`ยังไป${p.name}ไม่ได้ ต้องเลื่อนแรงก์ให้ถึงก่อนนะ`, 'lock', 'warn')
  return false
})

function placeOpen(p: Place): boolean {
  if (p.home) return isAreaUnlocked(p.id as AreaId)
  // Prayer stars (or coins) plus the temple-rank lock.
  return placeAccess(game.value, p.id).open
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
  const [board, setBoard] = useState<Region | null>(null)
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
  const acc = p && !p.home ? placeAccess(s, p.id) : null
  const rank = p ? RANK_BY_PLACE[p.id] : undefined
  const claims = claimableRanks(s).length

  const go = (pl: Place) => {
    // Rank lock is enforced here too, not just by hiding the button.
    if (!placeOpen(pl)) {
      sfx.error()
      toast('ยังไปไม่ได้ ต้องเลื่อนแรงก์ให้ถึงก่อนนะ', 'lock', 'warn')
      return
    }
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
    const a = placeAccess(game.value, pl.id)
    if (!a.canBuy) {
      sfx.error()
      toast(a.rankLocked ? 'ต้องผ่านเงื่อนไขแรงก์ก่อน ถึงจะปลดล็อกด้วยคอยน์ได้' : 'ที่นี่เปิดอยู่แล้ว', 'lock', 'warn')
      return
    }
    if (!spendCoins(a.price)) return
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
      <button
        class="btn gold small hl-rankbtn"
        aria-label="อันดับวัดประจำภาค"
        onClick={() => {
          sfx.open()
          setBoard((p && !p.home ? p.region : null) ?? homeRegion(s) ?? 'bangkok')
        }}
      >
        <img class="px" src={spriteDataUrl(trophyIcon(), 2)} alt="" width={20} height={20} />
        <PT text="อันดับวัด" size={12} weight={600} {...TONE_TEXT.gold} />
        {claims > 0 && <span class="badge num">{claims}</span>}
      </button>
      {!p && <div class="thaimap-hint small">แตะหมุดเพื่อดูสถานที่ · ลากเพื่อเลื่อน · แตะสองครั้งเพื่อซูม</div>}
      {p && (
        <div class="win place-card" key={p.id}>
          <div class="row">
            <img class="px place-icon" src={spriteDataUrl(placeIcon(p.id, !open), 3)} alt="" width={72} height={78} />
            <div class="grow col" style={{ gap: '1px' }}>
              <PT text={p.name} size={14} weight={600} {...TONE_TEXT.ink} />
              {rank && (
                <button class="hl-card-tier" aria-label={`แรงก์ ${rank.tier} ดูอันดับวัด`} onClick={() => (sfx.open(), setBoard(rank.region))}>
                  <TierBadge tier={rank.tier} locked={!open} size={22} />
                  <span class="small">
                    แรงก์ {rank.tier} · {TIER_BY_ID[rank.tier].name}
                  </span>
                  <span class="small hl-card-more">อันดับวัด ▸</span>
                </button>
              )}
              <span class="small muted">
                {p.en} · {p.province}
                {!p.home && REGION_BY_ID[p.region] ? ` · ${REGION_BY_ID[p.region].name}` : ''}
              </span>
              <span class="small place-tag">{p.tagline}</span>
            </div>
          </div>
          <p class="small place-about">{p.about}</p>
          <div class="row wrap place-wish">
            <span class="small muted">{p.kind ? 'ไฮไลต์' : 'นิยมขอพรเรื่อง'}</span>
            {p.wishFor.map((w) => (
              <span class="chip gold small" key={w}>
                {w}
              </span>
            ))}
            {p.bonus > 1 && <span class="chip green small">บุญ x{p.bonus}</span>}
            {inHomeRegion(s, p.id) && <span class="chip gold small">บ้านเกิด บุญ +{Math.round((HOME_BONUS - 1) * 100)}%</span>}
          </div>
          <p class="small muted place-tip">
            <Icon name="info" size={14} /> {p.tip}
          </p>
          {here ? (
            <PBtn tone="paper" block disabled>
              คุณอยู่ที่นี่แล้ว
            </PBtn>
          ) : open ? (
            <PBtn tone="green" block size="big" icon={p.kind === 'beach' ? 'sun' : p.kind ? 'market' : 'temple'} onClick={() => go(p)}>
              ออกเดินทาง
            </PBtn>
          ) : acc?.rankLocked ? (
            <div class="hl-card-lock">
              <div class="row small" style={{ gap: '4px', marginBottom: '2px' }}>
                <Icon name="lock" size={14} />
                <b>ล็อกด้วยแรงก์ {rank?.tier}</b>
                <span class="grow" />
                <button class="hl-link small" onClick={() => (sfx.open(), setBoard(rank?.region ?? p.region))}>
                  ดูเงื่อนไขทั้งหมด ▸
                </button>
              </div>
              {acc.reqs
                .filter((r) => r.kind !== 'stars' && !r.met)
                .map((r) => (
                  <div class="small muted" key={r.kind}>
                    • {r.text} {r.kind === 'quest' ? '' : `(${Math.min(r.have, r.need)}/${r.need})`}
                  </div>
                ))}
            </div>
          ) : (
            <div class="row">
              <span class="chip small">
                <Icon name="star" size={14} /> ต้องมี {acc?.starsNeed ?? p.stars} ดาว (มี {stars})
              </span>
              <span class="grow" />
              <PBtn tone="gold" size="small" onClick={() => buy(p)}>
                ปลดล็อก <Coin n={acc?.price ?? p.coins} size={14} />
              </PBtn>
            </div>
          )}
        </div>
      )}
      {board && (
        <RankBoard
          region={board}
          onClose={() => setBoard(null)}
          onGo={(id) => {
            setBoard(null)
            setSel(id)
            scene.current?.select(id)
            scene.current?.focus(id)
          }}
        />
      )}
    </div>
  )
}
