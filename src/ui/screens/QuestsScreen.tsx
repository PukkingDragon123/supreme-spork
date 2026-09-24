// ภารกิจ – daily login, daily quests, free coins, monthly pass, achievements.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { ACHIEVEMENTS, QUEST_POOL, ALL_QUESTS_BONUS } from '../../game/data/quests'
import { AD_DAILY_LIMIT, AD_REWARD_COINS } from '../../game/data/store'
import { adsLeft, claimMonthly, claimQuest, claimQuestBonus, loginInfo, monthlyActive, questBonusReady, rewardAd } from '../../game/actions'
import { ads } from '../../services/ads'
import { thaiDate } from '../../game/time'
import { toast } from '../../game/events'
import { Bar, Btn, Coin, Icon, Merit } from '../components/common'
import { DailyLogin } from '../overlays/Overlays'
import { coinStoreOpen, profileOpen, tab } from '../store'
import { sfx } from '../../engine/audio'

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
}

export function QuestsScreen() {
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
    <div class="screen">
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

      <div class="section-title">
        <Icon name="star" size={22} /> เหรียญตรา
      </div>
      <div class="grid3">
        {ACHIEVEMENTS.map((a) => {
          const got = !!s.achievements[a.id]
          const cur = s.stats[a.event] ?? 0
          return (
            <div class={`panel badge-card ${got ? 'got' : ''}`} key={a.id} title={a.desc}>
              <Icon name={a.icon} size={30} />
              <div class="small badge-name">{a.name}</div>
              {got ? <div class="small muted">ได้แล้ว</div> : <div class="small muted num">{Math.min(cur, a.target)}/{a.target}</div>}
            </div>
          )
        })}
      </div>
      <div class="center" style={{ margin: '16px 0 4px' }}>
        <Btn tone="green" onClick={() => (tab.value = 'temple')}>
          <Icon name="temple" size={18} /> ไปทำบุญที่วัด
        </Btn>
      </div>
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
    </div>
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
