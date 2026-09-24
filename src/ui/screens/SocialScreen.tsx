// เพื่อน – merit leaderboard, merit groups, friends' feed and charity.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { social, GROUP_MILESTONES, type Group, type Profile } from '../../services/social'
import { addFriend, claimGroupReward, createGroup, donateCharity, joinGroup, reactSathu } from '../../game/actions'
import { CAMPAIGNS } from '../../game/data/charity'
import { weekKey, dayKey } from '../../game/time'
import { toast } from '../../game/events'
import { Bar, Btn, Coin, Icon, Merit, Portrait, useAsync } from '../components/common'
import { socialSection, type SocialSection } from '../store'
import { sfx } from '../../engine/audio'

const SECTIONS: { id: SocialSection; label: string; icon: string }[] = [
  { id: 'friends', label: 'กระดานบุญ', icon: 'star' },
  { id: 'groups', label: 'กลุ่มทำบุญ', icon: 'group' },
  { id: 'feed', label: 'ฟีดบุญ', icon: 'wai' },
  { id: 'charity', label: 'กองบุญ', icon: 'charity' },
]

export function SocialScreen() {
  const sec = socialSection.value
  return (
    <div class="screen">
      <div class="screen-head">
        <Icon name="friends" size={32} />
        <div class="grow">
          <div class="title">เพื่อนสายบุญ</div>
          <div class="small muted">ทำบุญด้วยกัน บุญยิ่งทวีคูณ</div>
        </div>
      </div>
      <div class="tabs">
        {SECTIONS.map((t) => (
          <button key={t.id} class={`tab ${sec === t.id ? 'active' : ''}`} onClick={() => (sfx.tap(), (socialSection.value = t.id))}>
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>
      {sec === 'friends' && <Leaderboard />}
      {sec === 'groups' && <Groups />}
      {sec === 'feed' && <Feed />}
      {sec === 'charity' && <Charity />}
    </div>
  )
}

function Rank({ n }: { n: number }) {
  const cls = n === 1 ? 'gold' : n === 2 ? 'silver' : n === 3 ? 'bronze' : ''
  return <span class={`rank num ${cls}`}>{n}</span>
}

function ProfileRow({ p, rank }: { p: Profile; rank: number }) {
  return (
    <div class={`panel lb-row ${p.isYou ? 'me' : ''}`}>
      <Rank n={rank} />
      <Portrait look={p.look} size={38} />
      <div class="grow">
        <div class="subtitle lb-name">
          {p.name} {p.isYou && <span class="chip gold small">คุณ</span>}
          {p.online && !p.isYou && <span class="online" title="ออนไลน์" />}
        </div>
        <div class="small muted">
          Lv.{p.level} · {p.title}
        </div>
      </div>
      <Merit n={p.weekly} size={16} />
    </div>
  )
}

function Leaderboard() {
  const s = game.value
  const [scope, setScope] = useState<'friends' | 'national'>('friends')
  const [code, setCode] = useState('')
  const list = useAsync(() => social().leaderboard(s, scope), [scope, s.week.merit, s.social.friends.length, s.player.look])
  const myRank = list ? list.findIndex((p) => p.isYou) + 1 : 0
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(`มาทำบุญด้วยกันที่แอปบุญดี ใส่รหัสเพื่อน ${s.player.friendCode}`)
      toast('คัดลอกรหัสเพื่อนแล้ว ส่งให้เพื่อนได้เลย', 'check')
    } catch {
      toast(`รหัสเพื่อนของคุณคือ ${s.player.friendCode}`, 'friends', 'info')
    }
  }
  return (
    <>
      <div class="row" style={{ justifyContent: 'center' }}>
        <button class={`tab ${scope === 'friends' ? 'active' : ''}`} onClick={() => setScope('friends')}>
          เพื่อน
        </button>
        <button class={`tab ${scope === 'national' ? 'active' : ''}`} onClick={() => setScope('national')}>
          ทั่วประเทศ
        </button>
      </div>
      <div class="panel card sparkle-bg">
        <Icon name="star" size={34} />
        <div class="grow">
          <div class="subtitle">บุญสัปดาห์นี้ · {weekKey()}</div>
          <div class="small muted">นับบุญใหม่ทุกวันจันทร์ · อันดับของคุณ #{myRank || '-'}</div>
        </div>
        <Merit n={s.week.key === weekKey() ? s.week.merit : 0} />
      </div>
      <div class="list" style={{ marginTop: '8px' }}>
        {!list && <div class="empty">กำลังโหลด...</div>}
        {list?.slice(0, scope === 'national' ? 30 : 20).map((p, i) => <ProfileRow key={p.id} p={p} rank={i + 1} />)}
        {list && scope === 'national' && myRank > 30 && list[myRank - 1] && <ProfileRow p={list[myRank - 1]} rank={myRank} />}
      </div>
      <div class="section-title">
        <Icon name="plus" size={18} /> ชวนเพื่อนมาทำบุญ
      </div>
      <div class="panel col" style={{ padding: '10px' }}>
        <div class="row">
          <div class="grow">
            <div class="small muted">รหัสเพื่อนของคุณ</div>
            <div class="title num friend-code">{s.player.friendCode}</div>
          </div>
          <Btn tone="paper" size="small" onClick={copyCode}>
            คัดลอก
          </Btn>
        </div>
        <div class="row">
          <input
            id="friend-code"
            class="text-input grow"
            placeholder="ใส่รหัสเพื่อน เช่น BD-7F3K2Q"
            value={code}
            maxLength={9}
            onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
          />
          <Btn
            tone="green"
            size="small"
            onClick={() => {
              if (addFriend(code)) {
                toast('เพิ่มเพื่อนแล้ว!', 'friends')
                setCode('')
              } else toast('รหัสไม่ถูกต้อง หรือเป็นเพื่อนกันอยู่แล้ว', 'friends', 'warn')
            }}
          >
            เพิ่ม
          </Btn>
        </div>
      </div>
    </>
  )
}

const GROUP_ICONS = ['group', 'bowl', 'lotus', 'dog', 'heart', 'temple', 'bell', 'incense']

function Groups() {
  const s = game.value
  const groups = useAsync(() => social().groups(s), [s.social.groupId, s.social.created.length, s.week.merit])
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(GROUP_ICONS[0])
  const mine = groups?.find((g) => g.joined)
  return (
    <>
      {mine && <MyGroup g={mine} />}
      <div class="section-title">
        <Icon name="group" size={20} /> {mine ? 'กลุ่มอื่น ๆ' : 'เข้าร่วมกลุ่มทำบุญ'}
      </div>
      <div class="list">
        {!groups && <div class="empty">กำลังโหลด...</div>}
        {groups
          ?.filter((g) => !g.joined)
          .map((g) => (
            <div class="panel card" key={g.id}>
              <Icon name={g.icon} size={34} />
              <div class="grow">
                <div class="subtitle">{g.name}</div>
                <div class="small muted">
                  {g.desc} · สมาชิก {g.members.length} คน
                </div>
                <Bar value={g.weekly} max={g.goal} />
              </div>
              <Btn
                size="small"
                tone="green"
                onClick={() => {
                  joinGroup(g.id)
                  toast(`เข้าร่วม ${g.name} แล้ว`, 'group')
                }}
              >
                เข้าร่วม
              </Btn>
            </div>
          ))}
      </div>
      <div class="section-title">
        <Icon name="plus" size={18} /> สร้างกลุ่มของคุณเอง
      </div>
      <div class="panel col" style={{ padding: '10px' }}>
        <input
          id="group-name"
          class="text-input"
          placeholder="ชื่อกลุ่ม เช่น ครอบครัวบุญมาก"
          maxLength={24}
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <div class="row wrap">
          {GROUP_ICONS.map((ic) => (
            <button key={ic} class={`tab ${icon === ic ? 'active' : ''}`} onClick={() => setIcon(ic)} aria-label={ic}>
              <Icon name={ic} size={20} />
            </button>
          ))}
        </div>
        <Btn
          tone="green"
          block
          disabled={!name.trim()}
          onClick={() => {
            createGroup(name.trim(), icon)
            setName('')
            toast('สร้างกลุ่มแล้ว ชวนเพื่อนมาร่วมบุญกัน', 'group')
          }}
        >
          สร้างกลุ่มทำบุญ
        </Btn>
      </div>
    </>
  )
}

function MyGroup({ g }: { g: Group }) {
  const s = game.value
  const wk = weekKey()
  const pct = g.weekly / g.goal
  const top = [...g.members].sort((a, b) => b.weekly - a.weekly)
  return (
    <div class="panel col my-group">
      <div class="row">
        <Icon name={g.icon} size={40} />
        <div class="grow">
          <div class="title">{g.name}</div>
          <div class="small muted">{g.desc}</div>
        </div>
      </div>
      <div class="subtitle">ทอดผ้าป่าสามัคคีออนไลน์สัปดาห์นี้</div>
      <Bar value={g.weekly} max={g.goal} tone="pink" />
      <div class="row small">
        <Merit n={g.weekly} size={14} />
        <span class="grow" />
        <span class="muted">เป้าหมาย {g.goal.toLocaleString('th-TH')} บุญ</span>
      </div>
      <div class="grid3">
        {GROUP_MILESTONES.map((m, i) => {
          const key = `${g.id}:${wk}:${i}`
          const claimed = !!s.social.groupClaims[key]
          const ready = pct >= m.at
          return (
            <button
              key={key}
              class={`panel milestone ${ready ? 'ready' : ''} ${claimed ? 'claimed' : ''}`}
              disabled={!ready || claimed}
              onClick={() => {
                if (claimGroupReward(key, m.coins)) {
                  sfx.coins(5)
                  toast(`รับรางวัลกลุ่ม ${m.coins} คอยน์`, 'gift')
                }
              }}
            >
              <Icon name={claimed ? 'check' : 'gift'} size={24} />
              <span class="small">{Math.round(m.at * 100)}%</span>
              <Coin n={m.coins} size={12} />
            </button>
          )
        })}
      </div>
      <div class="small muted">สมาชิกที่ทำบุญมากที่สุด</div>
      {top.slice(0, 5).map((p, i) => (
        <div class="row small" key={p.id}>
          <Rank n={i + 1} />
          <Portrait look={p.look} size={26} />
          <span class="grow">
            {p.name}
            {p.isYou ? ' (คุณ)' : ''}
          </span>
          <Merit n={p.weekly} size={12} />
        </div>
      ))}
      <Btn tone="paper" size="small" onClick={() => joinGroup(null)}>
        ออกจากกลุ่ม
      </Btn>
    </div>
  )
}

function timeAgo(at: number) {
  const m = Math.max(1, Math.round((Date.now() - at) / 60000))
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.round(m / 60)
  return `${h} ชั่วโมงที่แล้ว`
}

function Feed() {
  const s = game.value
  const feed = useAsync(() => social().feed(s), [dayKey()])
  const todayMerit = s.days[dayKey()] ?? 0
  const cheers = Math.min(12, Math.floor(todayMerit / 25))
  return (
    <>
      {cheers > 0 && (
        <div class="panel card sparkle-bg">
          <Icon name="wai" size={34} />
          <div class="grow">
            <div class="subtitle">เพื่อน {cheers} คนอนุโมทนาบุญกับคุณวันนี้</div>
            <div class="small muted">วันนี้คุณทำบุญไปแล้ว {todayMerit} บุญ สาธุ!</div>
          </div>
        </div>
      )}
      <div class="list" style={{ marginTop: '8px' }}>
        {!feed && <div class="empty">กำลังโหลด...</div>}
        {feed?.length === 0 && <div class="empty">เช้านี้เพื่อน ๆ ยังไม่ได้ทำบุญ ลองชวนกันดูนะ</div>}
        {feed?.map((f) => {
          const reacted = !!s.social.reacted[f.id]
          return (
            <div class="panel card feed-item" key={f.id}>
              <Portrait look={f.who.look} size={40} />
              <div class="grow">
                <div>
                  <b>{f.who.name}</b> {f.text}
                </div>
                <div class="small muted">
                  {timeAgo(f.at)} · +{f.merit} บุญ
                </div>
              </div>
              <Btn
                tone={reacted ? 'paper' : 'pink'}
                size="small"
                disabled={reacted}
                onClick={() => {
                  const m = reactSathu(f.id)
                  if (m) toast(`อนุโมทนาสาธุ +${m} บุญ`, 'wai')
                }}
              >
                สาธุ {f.sathu + (reacted ? 1 : 0)}
              </Btn>
            </div>
          )
        })}
      </div>
      <div class="small muted center" style={{ marginTop: '10px' }}>
        การยินดีในบุญของผู้อื่น (มุทิตา) ก็เป็นบุญเช่นกัน
      </div>
    </>
  )
}

function campaignTotal(base: number, rate: number, mine: number) {
  const now = new Date()
  const hours = (now.getDate() - 1) * 24 + now.getHours()
  return base + rate * hours + mine
}

function Charity() {
  const s = game.value
  const totalMine = Object.values(s.charity).reduce((a, b) => a + b, 0)
  return (
    <>
      <div class="panel card sparkle-bg">
        <Icon name="charity" size={40} />
        <div class="grow">
          <div class="subtitle">กองบุญการกุศล</div>
          <div class="small muted">คุณร่วมบริจาคแล้ว {totalMine.toLocaleString('th-TH')} คอยน์ · ทุก 1 คอยน์ได้ 2 บุญ</div>
        </div>
      </div>
      <div class="list" style={{ marginTop: '8px' }}>
        {CAMPAIGNS.map((c) => {
          const mine = s.charity[c.id] ?? 0
          const total = Math.min(c.goal, campaignTotal(c.base, c.rate, mine))
          return (
            <div class="panel col campaign" key={c.id} style={{ ['--c' as string]: c.color }}>
              <div class="row">
                <span class="campaign-icon">
                  <Icon name={c.icon} size={34} />
                </span>
                <div class="grow">
                  <div class="subtitle">{c.name}</div>
                  <div class="small muted">{c.org}</div>
                </div>
              </div>
              <div class="small">{c.desc}</div>
              <Bar value={total} max={c.goal} tone="green" />
              <div class="row small">
                <Coin n={total} size={14} />
                <span class="grow" />
                <span class="muted">เป้าหมาย {c.goal.toLocaleString('th-TH')} · ของคุณ {mine}</span>
              </div>
              <div class="row">
                {[10, 50, 100].map((n) => (
                  <Btn
                    key={n}
                    size="small"
                    class="grow"
                    tone={n === 50 ? 'pink' : ''}
                    onClick={() => {
                      const m = donateCharity(c.id, n)
                      if (m) {
                        sfx.purchase()
                        toast(`ร่วมบุญ ${c.name} ${n} คอยน์ +${m} บุญ`, 'charity')
                      }
                    }}
                  >
                    <Coin n={n} size={14} />
                  </Btn>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div class="small muted center" style={{ marginTop: '10px' }}>
        โครงการในเวอร์ชันทดลองเป็นตัวอย่าง ในเวอร์ชันจริงเหรียญที่บริจาคจะแปลงเป็นเงินบริจาคให้มูลนิธิพันธมิตรที่ตรวจสอบได้ พร้อมใบอนุโมทนาบัตร
      </div>
    </>
  )
}
