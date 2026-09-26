// The player's home: walk around, use furniture, pray at the home altar,
// change clothes at the mirror wardrobe, craft and arrange furniture.

import { useEffect, useRef, useState } from 'preact/hooks'
import { Stage } from '../../engine/stage'
import { HouseScene } from '../../scenes/house'
import { game, mutate } from '../../game/state'
import { lookKey } from '../../art/avatar'
import { FURNITURE_BY_ID, FLOORS, WALLPAPERS, type Interact } from '../../game/data/furniture'
import { moveFurniture, placeFurniture, storeFurniture, roomScore } from '../../game/house'
import { furnitureThumb } from '../../art/furniture'
import { spriteDataUrl } from '../../engine/sprite'
import { nextStage } from '../../game/prayer'
import { adsLeft, rewardAd } from '../../game/actions'
import { ads } from '../../services/ads'
import { toast } from '../../game/events'
import { goTemple, openPanel, prayAtHome, prayStage } from '../store'
import { PBtn, Slot, Tabs, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { sfx } from '../../engine/audio'

let houseScene: HouseScene | null = null
export function currentHouseScene() {
  return houseScene
}

type Tray = 'items' | 'wall' | 'floor'

export function HouseView({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const stage = useRef<Stage | null>(null)
  const [editing, setEditing] = useState(false)
  const [placing, setPlacing] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [tray, setTray] = useState<Tray>('items')
  const [altar, setAltar] = useState(false)
  const s = game.value

  useEffect(() => {
    const st = new Stage(host.current!, { targetWidth: 160 })
    stage.current = st
    const scene = new HouseScene(game.value.house, game.value.player.look, {
      onInteract: (kind, uid) => interact(kind, uid),
      onEditPick: (uid) => {
        sfx.tap()
        setPicked(uid)
      },
      onPlaced: (id, x, y, flip) => {
        mutate((d) => {
          d.house = placeFurniture(d.house, id, x, y, flip)
        })
        sfx.plop()
        setPlacing(null)
      },
      onMoved: (uid, x, y, flip) => {
        mutate((d) => {
          d.house = moveFurniture(d.house, uid, x, y, flip)
        })
        sfx.plop()
        setPlacing(null)
        setPicked(null)
      },
    })
    houseScene = scene
    st.setScene(scene)
    st.start()
    return () => {
      st.destroy()
      houseScene = null
    }
  }, [])

  useEffect(() => {
    if (!stage.current) return
    if (active) stage.current.start()
    else stage.current.stop()
  }, [active])

  const house = s.house
  useEffect(() => {
    houseScene?.setHouse(house)
  }, [house])
  const lk = lookKey(s.player.look)
  useEffect(() => {
    houseScene?.setLook(game.value.player.look)
  }, [lk])
  useEffect(() => {
    houseScene?.setMode(editing ? 'edit' : 'live')
    if (!editing) {
      houseScene?.cancelPlacing()
      setPlacing(null)
      setPicked(null)
    }
  }, [editing])

  function interact(kind: Interact, _uid: string) {
    switch (kind) {
      case 'wardrobe':
        sfx.open()
        openPanel('dress')
        break
      case 'altar':
        sfx.bell(0)
        setAltar(true)
        break
      case 'workbench':
        sfx.open()
        openPanel('craft')
        break
      case 'door':
        sfx.open()
        goTemple()
        break
      case 'bed':
        toast('นอนพักสักงีบ… สดชื่นแล้ว ไปวัดกันต่อ', 'bed')
        break
      case 'tv':
        if (adsLeft() > 0)
          void ads()
            .showRewarded('tv_coins')
            .then((r) => {
              if (r.rewarded) toast(`ดูรายการธรรมะจบ รับ ${rewardAd('coins')} บุญคอยน์`, 'coin')
            })
        else toast('วันนี้ดูทีวีครบแล้ว พรุ่งนี้มาใหม่นะ', 'tv')
        break
      default:
        break
    }
  }

  const stored = Object.entries(house.storage).filter(([id, n]) => n > 0 && FURNITURE_BY_ID[id])
  const pickedItem = picked ? house.placed.find((p) => p.uid === picked) : null

  return (
    <div class="house">
      <div class="stage-host" ref={host} />
      {!editing && (
        <div class="house-tools">
          <PBtn tone="wood" size="small" icon="edit" onClick={() => setEditing(true)}>
            จัดห้อง
          </PBtn>
          <PBtn tone="wood" size="small" icon="hammer" onClick={() => openPanel('craft')}>
            ทำเฟอร์นิเจอร์
          </PBtn>
        </div>
      )}
      {editing && (
        <div class="house-edit">
          <div class="house-edit-top">
            <PT text={`ความน่าอยู่ ${roomScore(house)}`} size={12} color="#fff6dc" shadow="#3b2616" />
            <span class="grow" />
            <PBtn tone="green" size="small" icon="check" onClick={() => setEditing(false)}>
              เสร็จ
            </PBtn>
          </div>
          {placing || pickedItem ? (
            <div class="win edit-bar">
              <div class="row">
                {placing && (
                  <>
                    <PT text="ลากเพื่อวาง" size={12} {...TONE_TEXT.ink} />
                    <span class="grow" />
                    <PBtn tone="paper" size="small" icon="flip" onClick={() => houseScene?.flipGhost()}>
                      กลับด้าน
                    </PBtn>
                    <PBtn tone="red" size="small" onClick={() => (houseScene?.cancelPlacing(), setPlacing(null), setPicked(null))}>
                      ยกเลิก
                    </PBtn>
                    <PBtn tone="green" size="small" onClick={() => houseScene?.confirmGhost() || (sfx.error(), toast('วางตรงนี้ไม่ได้นะ', 'close', 'warn'))}>
                      วาง
                    </PBtn>
                  </>
                )}
                {!placing && pickedItem && (
                  <>
                    <PT text={FURNITURE_BY_ID[pickedItem.id]?.name ?? ''} size={12} {...TONE_TEXT.ink} />
                    <span class="grow" />
                    <PBtn tone="blue" size="small" onClick={() => (houseScene?.startMoving(pickedItem.uid), setPlacing(pickedItem.id))}>
                      ย้าย
                    </PBtn>
                    {!FURNITURE_BY_ID[pickedItem.id]?.fixed && (
                      <PBtn
                        tone="paper"
                        size="small"
                        icon="bag"
                        onClick={() => {
                          mutate((d) => {
                            d.house = storeFurniture(d.house, pickedItem.uid)
                          })
                          sfx.plop()
                          setPicked(null)
                        }}
                      >
                        เก็บ
                      </PBtn>
                    )}
                    <PBtn tone="paper" size="small" onClick={() => setPicked(null)}>
                      ปิด
                    </PBtn>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div class="win edit-tray">
              <Tabs
                tabs={[
                  { id: 'items', label: 'ของในคลัง', icon: 'bag' },
                  { id: 'wall', label: 'วอลเปเปอร์' },
                  { id: 'floor', label: 'พื้น' },
                ]}
                value={tray}
                onChange={setTray}
              />
              <div class="ptab-body tray-body">
                {tray === 'items' &&
                  (stored.length ? (
                    <div class="tray-row">
                      {stored.map(([id, n]) => (
                        <Slot
                          key={id}
                          size={60}
                          count={n}
                          title={FURNITURE_BY_ID[id].name}
                          onClick={() => {
                            houseScene?.startPlacing(id)
                            setPlacing(id)
                          }}
                        >
                          <img class="px slot-img" src={spriteDataUrl(furnitureThumb(id), 2)} alt="" />
                        </Slot>
                      ))}
                    </div>
                  ) : (
                    <p class="small muted">คลังว่าง · ทำเฟอร์นิเจอร์ใหม่ที่โต๊ะช่างไม้ หรือแตะของในห้องเพื่อย้าย</p>
                  ))}
                {tray === 'wall' && <SurfacePicker list={WALLPAPERS} value={house.wallpaper} kind="wallpaper" />}
                {tray === 'floor' && <SurfacePicker list={FLOORS} value={house.floor} kind="floor" />}
              </div>
            </div>
          )}
        </div>
      )}
      {altar && (
        <Window
          title="หิ้งพระในบ้าน"
          icon="pray"
          onClose={() => setAltar(false)}
          footer={
            <PBtn
              tone="green"
              block
              icon="pray"
              onClick={() => {
                setAltar(false)
                prayAtHome.value = true
                prayStage.value = nextStage().id
              }}
            >
              สวดมนต์หน้าหิ้งพระ
            </PBtn>
          }
        >
          <p class="small">สวดมนต์ก่อนนอนที่บ้านก็ได้บุญเหมือนกัน นับรวมเป้าหมายรายวันและดาวของด่านด้วยนะ</p>
          <div class="row">
            <PBtn tone="wood" size="small" icon="mala" onClick={() => (setAltar(false), openPanel('mala'))}>
              นับลูกประคำ
            </PBtn>
            <PBtn tone="wood" size="small" icon="book" onClick={() => (setAltar(false), openPanel('chants'))}>
              หนังสือสวดมนต์
            </PBtn>
          </div>
        </Window>
      )}
    </div>
  )
}

function SurfacePicker({ list, value, kind }: { list: { id: string; name: string; recipe: Record<string, number | undefined>; coins?: number }[]; value: string; kind: 'wallpaper' | 'floor' }) {
  const owned = game.value.house.storage
  return (
    <div class="tray-row">
      {list.map((w) => {
        const have = w.id === value || (owned[w.id] ?? 0) > 0 || !Object.keys(w.recipe).length
        return (
          <PBtn
            key={w.id}
            tone={w.id === value ? 'green' : have ? 'paper' : 'dark'}
            size="small"
            onClick={() => {
              if (!have) {
                openPanel('craft')
                return
              }
              mutate((d) => {
                if (kind === 'wallpaper') d.house.wallpaper = w.id
                else d.house.floor = w.id
              })
              sfx.plop()
            }}
          >
            {w.name}
          </PBtn>
        )
      })}
    </div>
  )
}

