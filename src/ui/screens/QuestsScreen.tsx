// ภารกิจ – three tabs: รายวัน (login, daily quests, free coins, monthly pass),
// เควสต์ NPC (accepted quests with a step checklist and นำทาง, plus quests
// you can pick up) and ความสำเร็จ (medals and quest-log stats).

import { useState } from 'preact/hooks'
import { game, level } from '../../game/state'
import { ACHIEVEMENTS, QUEST_POOL, ALL_QUESTS_BONUS } from '../../game/data/quests'
import { AD_DAILY_LIMIT, AD_REWARD_COINS } from '../../game/data/store'
import { adsLeft, claimMonthly, claimQuest, claimQuestBonus, loginInfo, monthlyActive, questBonusReady, rewardAd } from '../../game/actions'
import { ads } from '../../services/ads'
import { thaiDate } from '../../game/time'
import { toast } from '../../game/events'
import { Bar, Btn, Coin, Icon, Merit } from '../components/common'
import { PBtn, Stars, Tabs, type TabDef } from '../components/kit'
import { DailyLogin } from '../overlays/Overlays'
import { coinStoreOpen, mapId, profileOpen, tab } from '../store'
import { sfx } from '../../engine/audio'
import { NPC_QUESTS } from '../../game/data/npcQuests'
import { HOME_PLACES, PLACE_BY_ID } from '../../game/data/places'
import type { AreaId } from '../../game/data/areas'
import type { NpcQuestDef } from '../../game/data/npcQuestTypes'
import { abandonQuest, activeQuests, questStats, questStatus, setTracked, stepIndex, type QuestStatus } from '../../game/npcQuests'
import type { NpcQuestProgress } from '../../game/npcQuestState'
import { RewardChips } from '../quest/QuestDialog'
import { goToSpot, navigateQuest, questTab } from '../quest/questUi'
import '../quest/quest.css'

const QUEST_ICON: Record<string, string> = {
  alms: 'bowl',
  chant: 'book',
  meditate_sec: 'meditate',
  koi_fed: 'koi',
  dog_fed: 'dog',
  dog_pet: 'heart',
  bell_round: 'bell',
  wish: 'incense',
  siamsi: 'fortune',
  deity: 'deity',
  holy_water: 'vessel',
  lottery: 'powder',
  gold_leaf: 'goldleaf',
  donate: 'coin',
  dedicate: 'vessel',
  sathu: 'wai',
  krathong: 'krathong',
  catfish_fed: 'bread',
  circle_chedi: 'sparkle',
  job: 'broom',
  cook: 'pan',
  npc_talk: 'friends',
  npc_quest: 'scroll',
  prayer_pass: 'pray',
  place_visit: 'map',
  stall_buy: 'shop',
  collectible: 'star',
  hub_visit: 'market',
  fair_game: 'gift',
  trade: 'market',
  dish_alms: 'bowl',
}

type QTab = 'daily' | 'npc' | 'badges'

export function QuestsScreen() {
  const t = questTab.value
  const s = game.value
  const ready = activeQuests(s).filter((q) => q.status === 'ready').length
  const dailyLeft = s.daily.quests.filter((q) => !q.claimed && q.progress >= (QUEST_POOL.find((d) => d.id === q.id)?.target ?? 1)).length
  const tabs: TabDef<QTab>[] = [
    { id: 'daily', label: 'รายวัน', icon: 'calendar', badge: dailyLeft },
    { id: 'npc', label: 'เควสต์ NPC', icon: 'scroll', badge: ready },
    { id: 'badges', label: 'ความสำเร็จ', icon: 'star' },
  ]
  return (
    <div class="screen">
      <Tabs tabs={tabs} value={t} onChange={(v) => (questTab.value = v)} class="ql-tabs" compact />
      <div class="ptab-body">
        {t === 'daily' && <DailyTab />}
        {t === 'npc' && <NpcTab />}
        {t === 'badges' && <BadgesTab />}
      </div>
      <div class="center" style={{ margin: '14px 0 4px' }}>
        <Btn tone="green" onClick={() => (tab.value = 'temple')}>
          <Icon name="temple" size={18} /> ไปทำบุญที่วัด
        </Btn>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// รายวัน

function DailyTab() {
  const s = game.value
  const [showLogin, setShowLogin] = useState(false)
  const login = loginInfo()
  const done = s.daily.quests.filter((q) => q.claimed).length
  const watchAd = async () => {
    const r = await ads().showRewarded('free_coins')
    if (!r.rewarded) return
    const got = rewardAd('coins')
    if (got) {
      sfx.coins(5)
      toast(`ได้รับ ${got} บุญคอยน์ฟรี`, 'coin')
    }
  }
  return (
    <>
      <div class="screen-head">
        <Icon name="scroll" size={32} />
        <div class="grow">
          <div class="title">ภารกิจวันนี้</div>
          <div class="small muted">{thaiDate()}</div>
        </div>
        <span class="chip gold">
          {done}/{s.daily.quests.length}
        </span>
      </div>

      <div class="panel card">
        <Icon name="calendar" size={36} />
        <div class="grow">
          <div class="subtitle">เข้าวัดต่อเนื่อง {s.login.streak} วัน</div>
          <div class="small muted">สถิติสูงสุด {s.login.best} วัน · รางวัลวันที่ 7 คือชุดสังฆทาน</div>
        </div>
        {login.canClaim ? (
          <Btn tone="green" size="small" onClick={() => setShowLogin(true)}>
            รับรางวัล
          </Btn>
        ) : (
          <span class="chip green">รับแล้ว</span>
        )}
      </div>

      {monthlyActive() && (
        <div class="panel card sparkle-bg">
          <Icon name="gift" size={36} />
          <div class="grow">
            <div class="subtitle">บัตรบุญรายเดือน</div>
            <div class="small muted">ใช้ได้ถึง {s.monthly.until}</div>
          </div>
          <Btn
            tone="green"
            size="small"
            disabled={s.daily.monthlyClaimed}
            onClick={() => {
              const n = claimMonthly()
              if (n) toast(`รับ ${n} คอยน์จากบัตรบุญรายเดือน`, 'coin')
            }}
          >
            {s.daily.monthlyClaimed ? 'รับแล้ว' : 'รับวันนี้'}
          </Btn>
        </div>
      )}

      <div class="list" style={{ marginTop: '10px' }}>
        {s.daily.quests.map((q) => {
          const def = QUEST_POOL.find((d) => d.id === q.id)
          if (!def) return null
          const complete = q.progress >= def.target
          return (
            <div class={`panel card quest ${q.claimed ? 'claimed' : ''}`} key={q.id}>
              <Icon name={QUEST_ICON[def.event] ?? 'sparkle'} size={34} />
              <div class="grow col" style={{ gap: '4px' }}>
                <div class="subtitle">{def.text}</div>
                <Bar value={q.progress} max={def.target} tone="green" />
                <div class="row small">
                  <span class="num">
                    {def.event === 'meditate_sec' ? `${Math.floor(q.progress / 60)}/${def.target / 60} นาที` : `${q.progress}/${def.target}`}
                  </span>
                  <span class="grow" />
                  <Coin n={`+${def.coins}`} size={14} />
                  <Merit n={`+${def.merit}`} size={14} />
                </div>
              </div>
              {q.claimed ? (
                <Icon name="check" size={28} />
              ) : (
                <Btn tone={complete ? 'green' : 'paper'} size="small" disabled={!complete} onClick={() => claimQuest(q.id) && sfx.coins(4)}>
                  รับ
                </Btn>
              )}
            </div>
          )
        })}
        <div class={`panel card ${questBonusReady() ? 'sparkle-bg' : ''}`}>
          <Icon name="gift" size={36} />
          <div class="grow">
            <div class="subtitle">ทำครบทุกภารกิจ</div>
            <div class="small muted">
              รับ <Coin n={ALL_QUESTS_BONUS.coins} size={14} /> + อาหารปลา + ทองคำเปลว
            </div>
          </div>
          <Btn tone="green" size="small" disabled={!questBonusReady()} onClick={() => claimQuestBonus()}>
            {s.daily.bonusClaimed ? 'รับแล้ว' : 'เปิดกล่อง'}
          </Btn>
        </div>
      </div>

      <div class="panel card" style={{ marginTop: '8px' }}>
        <Icon name="scroll" size={32} />
        <div class="grow">
          <div class="subtitle">อยากได้เหรียญเพิ่ม?</div>
          <div class="small muted">คุยกับคนที่มีเครื่องหมาย ! บนหัว รับเควสต์ได้เหรียญเยอะกว่า</div>
        </div>
        <Btn tone="gold" size="small" onClick={() => (questTab.value = 'npc')}>
          ดูเควสต์
        </Btn>
      </div>

      <div class="section-title">
        <Icon name="tv" size={22} /> รับบุญคอยน์ฟรี
      </div>
      <div class="panel card">
        <div class="grow">
          <div class="subtitle">ดูโฆษณาสั้น ๆ รับ {AD_REWARD_COINS} คอยน์</div>
          <div class="small muted">
            วันนี้เหลือ {adsLeft()}/{AD_DAILY_LIMIT} ครั้ง
          </div>
        </div>
        <Btn tone="blue" size="small" disabled={adsLeft() <= 0} onClick={watchAd}>
          ดูเลย
        </Btn>
      </div>
      <div class="row" style={{ marginTop: '6px' }}>
        <Btn tone="paper" class="grow" onClick={() => (coinStoreOpen.value = true)}>
          <Icon name="coinbag" size={18} /> เติมบุญคอยน์
        </Btn>
        <Btn tone="paper" class="grow" onClick={() => (profileOpen.value = true)}>
          <Icon name="book" size={18} /> สมุดบุญ
        </Btn>
      </div>
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
    </>
  )
}

function LoginPopup({ onClose }: { onClose: () => void }) {
  // Reuse the daily login modal; close when it closes itself.
  return (
    <div onClick={(e) => (e.target as HTMLElement).classList.contains('modal-backdrop') && onClose()}>
      <DailyLogin />
    </div>
  )
}

// ---------------------------------------------------------------------------
// เควสต์ NPC

const MAP_NAME: Record<string, string> = { mart: 'ร้าน 7-บุญ หน้าวัด' }

export function placeName(map: string): string {
  if (MAP_NAME[map]) return MAP_NAME[map]
  const root = map.split(':')[0]
  return (HOME_PLACES[root as AreaId] ?? PLACE_BY_ID[root])?.name ?? root
}

function NpcTab() {
  const s = game.value
  const lv = level.value.level
  const active = activeQuests(s)
  const tracked = s.npcQuests.tracked
  const stats = questStats(s)
  const earned = Object.entries(s.npcQuests.done).reduce((sum, [id, n]) => sum + (NPC_QUESTS.find((q) => q.id === id)?.reward.coins ?? 0) * n, 0)
  const here = mapId.value.split(':')[0]
  const offer = NPC_QUESTS.map((def) => ({ def, status: questStatus(def, s) }))
    .filter((x) => x.status === 'available' || x.status === 'level')
    .sort((a, b) => rank(a, here) - rank(b, here))
  const [more, setMore] = useState(false)
  const shown = more ? offer : offer.slice(0, 8)
  return (
    <>
      <div class="panel card ql-summary">
        <Icon name="scroll" size={34} />
        <div class="grow">
          <div class="subtitle">สมุดเควสต์ชาวบ้าน</div>
          <div class="ql-bar" aria-label={`ทำแล้ว ${stats.done} จาก ${stats.total}`}>
            <i style={{ width: `${Math.round((stats.done / Math.max(1, stats.total)) * 100)}%` }} />
          </div>
          <div class="small muted">
            สำเร็จ {stats.done}/{stats.total} เควสต์ · ได้เหรียญรวม <Coin n={earned} size={13} />
          </div>
        </div>
      </div>

      <div class="section-title">
        <Icon name="bolt" size={22} /> กำลังทำ ({active.length})
      </div>
      {!active.length && (
        <div class="panel card ql-empty">
          <div>
            ยังไม่มีเควสต์ ลองเดินไปคุยกับคนที่มี <b style={{ color: '#e8a020' }}>!</b> ลอยอยู่บนหัวดูนะ
            <div class="small">ร้านค้าที่มีถุงช้อปปิ้งลอยอยู่ก็มีเควสต์ให้ช่วยด้วย</div>
          </div>
        </div>
      )}
      <div class="list">
        {active.map(({ def, prog, status }) => (
          <ActiveQuest key={def.id} def={def} prog={prog} status={status === 'ready' ? 'ready' : 'active'} tracked={tracked === def.id || (!tracked && active[0]?.def.id === def.id)} />
        ))}
      </div>

      <div class="section-title">
        <Icon name="sparkle" size={22} /> เควสต์ที่รับได้
      </div>
      <div class="list">
        {shown.map(({ def, status }) => (
          <button
            key={def.id}
            class={`panel card ql-avail ${status === 'level' ? 'locked' : ''}`}
            onClick={() => {
              sfx.tap()
              goToSpot(def.map, def.giver)
            }}
          >
            <span class={`qd-mark ${status === 'level' ? 'active' : ''}`}>!</span>
            <span class="grow" style={{ minWidth: 0 }}>
              <b class="small">{def.title}</b>
              <span class="ql-place">
                {def.npcName} · {placeName(def.map)}
                {def.repeat === 'daily' ? ' · รายวัน' : ''}
              </span>
            </span>
            <span class="col" style={{ alignItems: 'flex-end', gap: '2px' }}>
              {status === 'level' ? <span class="chip small">Lv {def.level}</span> : <Stars n={def.stars ?? 1} size={12} />}
              <Coin n={`+${def.reward.coins}`} size={13} />
            </span>
          </button>
        ))}
        {!shown.length && <div class="panel card ql-empty">รับเควสต์ครบทุกเรื่องแล้ว เก่งมาก! พรุ่งนี้มีเควสต์รายวันใหม่นะ</div>}
        {offer.length > shown.length && (
          <PBtn tone="paper" size="small" onClick={() => setMore(true)}>
            ดูเพิ่มอีก {offer.length - shown.length} เควสต์
          </PBtn>
        )}
      </div>
      <div class="small muted center" style={{ marginTop: '6px' }}>
        ตอนนี้เลเวล {lv} · เควสต์สีเทาจะเปิดเมื่อเลเวลถึง
      </div>
    </>
  )
}

function rank(x: { def: NpcQuestDef; status: QuestStatus }, here: string) {
  const onHere = x.def.map.split(':')[0] === here || (here === 'wat' && x.def.map === 'mart') ? 0 : 1
  return (x.status === 'level' ? 1000 : 0) + onHere * 100 + (x.def.level ?? 1)
}

function ActiveQuest({ def, prog, status, tracked }: { def: NpcQuestDef; prog: NpcQuestProgress; status: 'active' | 'ready'; tracked: boolean }) {
  const cur = stepIndex(def, prog)
  return (
    <div class={`panel card ql-quest ${tracked ? 'tracked' : ''} ${status === 'ready' ? 'gold' : ''}`}>
      <div class="ql-head">
        <span class="qd-mark">{status === 'ready' ? '?' : '!'}</span>
        <div class="grow" style={{ minWidth: 0 }}>
          <b>{def.title}</b>
          <div class="ql-giver">
            {def.npcName} · {placeName(def.map)}
          </div>
        </div>
        <Stars n={def.stars ?? 1} size={13} />
      </div>
      <ol class="qd-steps">
        {def.steps.map((st, i) => {
          const n = prog.p[i] ?? 0
          const done = n >= st.target
          return (
            <li key={i} class={`${done ? 'done' : ''} ${i === cur ? 'now' : ''}`}>
              <span class="qd-tick">{done ? <Icon name="check" size={14} /> : <i>{i + 1}</i>}</span>
              <span class="grow">
                {st.text}
                {st.map && i === cur && <span class="ql-place"> · ที่{placeName(st.map)}</span>}
              </span>
              {st.target > 1 && <span class="num qd-count">{st.event === 'meditate_sec' ? `${Math.floor(Math.min(n, st.target))}/${st.target}วิ` : `${Math.min(n, st.target)}/${st.target}`}</span>}
            </li>
          )
        })}
        {status === 'ready' && (
          <li class="now">
            <span class="qd-tick">
              <Icon name="gift" size={14} />
            </span>
            <span class="grow">กลับไปหา{def.npcName}เพื่อรับรางวัล</span>
          </li>
        )}
      </ol>
      <RewardChips r={def.reward} compact />
      <div class="ql-actions">
        <Btn tone={status === 'ready' ? 'gold' : 'green'} size="small" class="ql-go" onClick={() => (sfx.whoosh(), navigateQuest(def.id))}>
          <Icon name="map" size={18} /> {status === 'ready' ? 'ส่งเควสต์' : 'นำทาง'}
        </Btn>
        <Btn tone="paper" size="small" disabled={tracked} onClick={() => setTracked(def.id)}>
          <Icon name={tracked ? 'check' : 'star'} size={16} /> {tracked ? 'ติดตามอยู่' : 'ติดตาม'}
        </Btn>
        {status === 'active' && (
          <Btn
            tone="paper"
            size="small"
            class="icon-btn"
            aria-label="ยกเลิกเควสต์"
            onClick={() => {
              abandonQuest(def.id)
              toast(`ยกเลิก “${def.title}” แล้ว รับใหม่ได้ที่${def.npcName}`, 'scroll', 'info')
            }}
          >
            <Icon name="trash" size={16} />
          </Btn>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ความสำเร็จ

function BadgesTab() {
  const s = game.value
  const stats = questStats(s)
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length
  return (
    <>
      <div class="panel card ql-summary">
        <Icon name="star" size={34} />
        <div class="grow">
          <div class="subtitle">เหรียญตรา {got}/{ACHIEVEMENTS.length}</div>
          <div class="small muted">
            เควสต์ชาวบ้าน {stats.done}/{stats.total} · ส่งเควสต์ทั้งหมด {stats.turnedIn} ครั้ง · คุยกับชาวบ้าน {s.stats.npc_talk ?? 0} ครั้ง
          </div>
        </div>
      </div>
      <div class="grid3" style={{ marginTop: '6px' }}>
        {ACHIEVEMENTS.map((a) => {
          const has = !!s.achievements[a.id]
          const cur = s.stats[a.event] ?? 0
          return (
            <div class={`panel badge-card ${has ? 'got' : ''}`} key={a.id} title={a.desc}>
              <Icon name={a.icon} size={30} />
              <div class="small badge-name">{a.name}</div>
              {has ? <div class="small muted">ได้แล้ว</div> : <div class="small muted num">{Math.min(cur, a.target)}/{a.target}</div>}
              <div class="small">
                <Coin n={a.coins} size={12} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
