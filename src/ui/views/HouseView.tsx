// The player's home: walk around, use furniture, pray at the home altar,
// change clothes at the mirror wardrobe, craft and arrange furniture, and
// walk between rooms (ห้องนอน, ห้องพระ, ห้องครัว and the regional rooms).

import { useEffect, useRef, useState } from 'preact/hooks'
import { Stage } from '../../engine/stage'
import { HouseScene } from '../../scenes/house'
import { game, mutate } from '../../game/state'
import { lookKey } from '../../art/avatar'
import { FURNITURE_BY_ID, FLOORS, WALLPAPERS, type Interact } from '../../game/data/furniture'
import { storeFurniture, roomScore, cosyTier, ownsSurface, setWallpaper, setFloor } from '../../game/house'
import { furnitureThumb, surfaceThumb } from '../../art/furniture'
import { spriteDataUrl } from '../../engine/sprite'
import { nextStage } from '../../game/prayer'
import { adsLeft, rewardAd } from '../../game/actions'
import { ads } from '../../services/ads'
import { toast } from '../../game/events'
import { goTemple, houseEditing, openActivity, openPanel, prayAtHome, prayStage } from '../store'
import { PBtn, Slot, Tabs, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { sfx } from '../../engine/audio'
import { enterRoom } from '../../game/homelandActions'
import { ROOM_BY_ID, type RoomId } from '../../game/data/rooms'
import { DoorWipe, RoomBar, RoomsWindow } from '../homeland/Rooms'

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
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [door, setDoor] = useState<{ phase: 'closing' | 'opening'; label: string } | null>(null)
  const s = game.value

  /** Walk through the door into another room (door wipe, then the new room). */
  function goRoom(id: RoomId) {
    if (door || id === game.value.house.room) return
    const label = ROOM_BY_ID[id].name
    sfx.open()
    setDoor({ phase: 'closing', label })
    setTimeout(() => {
      if (enterRoom(id)) {
        houseScene?.setHouse(game.value.house)
        houseScene?.enterFromDoor()
      }
      sfx.plop()
      setDoor({ phase: 'opening', label })
      setTimeout(() => setDoor(null), 360)
    }, 260)
  }

  useEffect(() => {
    const st = new Stage(host.current!, { targetWidth: 168 })
    stage.current = st
    const scene = new HouseScene(game.value.house, game.value.player.look, {
      onInteract: (kind, uid) => interact(kind, uid),
      onEditPick: (uid) => {
        sfx.tap()
        setPicked(uid)
      },
      onPlaced: (_id, _x, _y, _flip, next) => {
        mutate((d) => {
          d.house = next
        })
        sfx.plop()
        setPlacing(null)
      },
      onMoved: (_uid, _x, _y, _flip, next) => {
        mutate((d) => {
          d.house = next
        })
        sfx.plop()
        setPlacing(null)
        setPicked(null)
      },
    })
    houseScene = scene
    st.setScene(scene)
    // Keep the room clear of the HUD (top) and hotbar (bottom), in virtual px.
    scene.setInsets(Math.round(76 / st.cssScale), Math.round(110 / st.cssScale))
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
    houseEditing.value = editing
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
      case 'cook':
        sfx.open()
        openActivity('cook')
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
      {!editing && <RoomBar onGo={goRoom} onOpenList={() => setRoomsOpen(true)} />}
      {!editing && (
        <div class="house-tools">
          <PBtn tone="wood" class="icon-btn" icon="edit" iconSize={24} aria-label="จัดห้อง" onClick={() => setEditing(true)} />
          <PBtn tone="wood" class="icon-btn" icon="hammer" iconSize={24} aria-label="ทำเฟอร์นิเจอร์" onClick={() => openPanel('craft')} />
        </div>
      )}
      {editing && (
        <div class="house-edit">
          <div class="house-edit-top">
            <PT text={`ความน่าอยู่ ${roomScore(house)} · ${cosyTier(roomScore(house)).name}`} size={12} color="#fff6dc" shadow="#3b2616" />
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
                  { id: 'wall', label: 'ผนัง', icon: 'home' },
                  { id: 'floor', label: 'พื้น', icon: 'edit' },
                ]}
                compact
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
      {roomsOpen && <RoomsWindow onClose={() => setRoomsOpen(false)} onGo={goRoom} />}
      <DoorWipe phase={door?.phase ?? null} label={door?.label ?? ''} />
      {altar && (
        <Window
          title={house.room === 'shrine' ? 'โต๊ะหมู่บูชาห้องพระ' : 'หิ้งพระในบ้าน'}
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

function SurfacePicker({ list, value, kind }: { list: { id: string; name: string }[]; value: string; kind: 'wallpaper' | 'floor' }) {
  const h = game.value.house
  return (
    <div class="tray-row">
      {list.map((w) => {
        const have = ownsSurface(h, w.id)
        return (
          <Slot
            key={w.id}
            size={60}
            active={w.id === value}
            locked={!have}
            title={w.name}
            onClick={() => {
              if (!have) {
                openPanel('craft')
                return
              }
              mutate((d) => {
                d.house = kind === 'wallpaper' ? setWallpaper(d.house, w.id) : setFloor(d.house, w.id)
              })
              sfx.plop()
            }}
          >
            <img class="px slot-img" src={spriteDataUrl(surfaceThumb(w.id), 2)} alt="" />
          </Slot>
        )
      })}
    </div>
  )
}
