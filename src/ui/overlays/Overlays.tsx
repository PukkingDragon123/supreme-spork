// Global overlays: toasts, level-up, rewards, achievements, purchase sheet,
// rewarded ads and the daily login calendar.

import { useEffect, useState } from 'preact/hooks'
import { notices, dismiss, type QueuedNotice } from '../../game/events'
import { game, level } from '../../game/state'
import { titleFor } from '../../game/economy'
import { ITEM_BY_ID } from '../../game/data/items'
import { loginInfo, claimLogin, rewardAd, adsLeft } from '../../game/actions'
import { loginReward } from '../../game/economy'
import { pendingPurchase } from '../../services/payments'
import { activeAd } from '../../services/ads'
import { ads } from '../../services/ads'
import { Btn, Coin, Icon, Merit, Modal } from '../components/common'
import { FxCanvas } from '../components/FxCanvas'
import { AdCanvas } from './AdCanvas'
import { sfx, haptic } from '../../engine/audio'

export function Overlays() {
  const list = notices.value
  const toasts = list.filter((n) => n.notice.kind === 'toast' || n.notice.kind === 'achievement')
  const modal = list.find((n) => n.notice.kind === 'levelup' || n.notice.kind === 'reward')
  return (
    <>
      <div class="toast-stack" aria-live="polite">
        {toasts.slice(-3).map((t) => (
          <Toast key={t.id} q={t} />
        ))}
      </div>
      {modal && <NoticeModal q={modal} />}
      {game.value.onboarded && <DailyLogin />}
      {pendingPurchase.value && <PurchaseSheet />}
      {activeAd.value && <AdOverlay />}
    </>
  )
}

function Toast({ q }: { q: QueuedNotice }) {
  useEffect(() => {
    const n = q.notice
    if (n.kind === 'achievement') sfx.chime()
    const id = setTimeout(() => dismiss(q.id), n.kind === 'achievement' ? 3600 : 2400)
    return () => clearTimeout(id)
  }, [q.id])
  const n = q.notice
  if (n.kind === 'achievement')
    return (
      <div class="toast panel sparkle-bg achievement">
        <Icon name="star" size={28} />
        <div>
          <div class="small muted">ได้รับเหรียญตรา</div>
          <div class="subtitle">{n.name}</div>
        </div>
        <Coin n={`+${n.coins}`} />
      </div>
    )
  if (n.kind !== 'toast') return null
  return (
    <div class={`toast panel ${n.tone === 'warn' ? 'warn' : ''}`}>
      {n.icon && <Icon name={n.icon} size={22} />}
      <span>{n.text}</span>
    </div>
  )
}

function NoticeModal({ q }: { q: QueuedNotice }) {
  const n = q.notice
  useEffect(() => {
    if (n.kind === 'levelup') {
      sfx.levelUp()
      haptic(40)
    } else sfx.chime()
  }, [q.id])
  if (n.kind === 'levelup') {
    return (
      <div class="modal-backdrop celebrate">
        <FxCanvas mode="confetti" />
        <div class="panel modal center levelup">
          <div class="levelup-burst">
            <Icon name="lotus" size={64} />
          </div>
          <div class="small muted">บุญเต็มแก้ว!</div>
          <div class="title">เลเวลอัป! Lv.{n.level}</div>
          <div class="subtitle">{titleFor(n.level)}</div>
          <div class="row" style={{ justifyContent: 'center', margin: '8px 0' }}>
            <span class="chip gold">
              <Coin n={`+${n.coins}`} />
            </span>
          </div>
          {n.unlocks.length > 0 && (
            <div class="panel soft unlock-list">
              {n.unlocks.map((u) => (
                <div key={u} class="row small">
                  <Icon name="sparkle" size={14} /> {u}
                </div>
              ))}
            </div>
          )}
          <Btn tone="green" block onClick={() => dismiss(q.id)}>
            สาธุ ๆ
          </Btn>
        </div>
      </div>
    )
  }
  if (n.kind === 'reward') {
    return (
      <div class="modal-backdrop celebrate">
        <FxCanvas mode="sparkle" />
        <div class="panel modal center">
          <div class="title">{n.title}</div>
          {n.note && <div class="small muted" style={{ margin: '4px 0 8px' }}>{n.note}</div>}
          <div class="row" style={{ justifyContent: 'center', flexWrap: 'wrap', margin: '8px 0' }}>
            {n.merit > 0 && (
              <span class="chip pink">
                <Merit n={`+${n.merit}`} />
              </span>
            )}
            {n.coins > 0 && (
              <span class="chip gold">
                <Coin n={`+${n.coins}`} />
              </span>
            )}
            {Object.entries(n.items ?? {}).map(([id, qty]) => (
              <span class="chip" key={id}>
                <Icon name={ITEM_BY_ID[id]?.icon ?? 'gift'} size={16} /> {ITEM_BY_ID[id]?.name ?? id} x{qty}
              </span>
            ))}
          </div>
          <Btn block onClick={() => dismiss(q.id)}>
            รับไว้
          </Btn>
        </div>
      </div>
    )
  }
  return null
}

// ---------------------------------------------------------------------------

const SKIP_LOGIN = import.meta.env.DEV && new URLSearchParams(location.search).has('nologin')

export function DailyLogin() {
  const [open, setOpen] = useState(() => !SKIP_LOGIN && loginInfo().canClaim)
  const [claimed, setClaimed] = useState<null | { coins: number }>(null)
  if (!open) return null
  const info = loginInfo()
  const day = ((info.streak - 1) % 7) + 1
  const finish = () => setOpen(false)
  const claim = async (double: boolean) => {
    if (double) {
      const r = await ads().showRewarded('login_double')
      if (!r.rewarded) return
      rewardAd('bonus')
    }
    const r = claimLogin(double)
    if (r) {
      sfx.coins(6)
      setClaimed({ coins: r.reward.coins * (double ? 2 : 1) })
    }
  }
  return (
    <Modal onClose={claimed ? finish : undefined}>
      <div class="center">
        <div class="title">เข้าวัดวันที่ {info.streak}</div>
        <div class="small muted">มาทำบุญต่อเนื่อง รับรางวัลทุกวัน</div>
      </div>
      <div class="login-grid">
        {Array.from({ length: 7 }, (_, i) => {
          const r = loginReward(i + 1)
          const state = i + 1 < day ? 'done' : i + 1 === day ? 'today' : 'next'
          return (
            <div key={i} class={`login-day panel ${state} ${i === 6 ? 'big' : ''}`}>
              <div class="small">วันที่ {i + 1}</div>
              <Icon name={r.item ? ITEM_BY_ID[r.item]?.icon ?? 'gift' : 'coins'} size={i === 6 ? 34 : 26} />
              <div class="small num">+{r.coins}</div>
              {state === 'done' && <span class="stamp">✓</span>}
            </div>
          )
        })}
      </div>
      {claimed ? (
        <div class="center col">
          <div class="subtitle">ได้รับ <Coin n={`+${claimed.coins}`} /> แล้ว</div>
          <Btn tone="green" block onClick={finish}>
            ไปวัดกันเลย
          </Btn>
        </div>
      ) : (
        <div class="col">
          <Btn tone="green" block onClick={() => claim(false)}>
            รับรางวัลวันนี้
          </Btn>
          {adsLeft() > 0 && (
            <Btn tone="blue" block onClick={() => claim(true)}>
              <Icon name="tv" size={18} /> ดูโฆษณา รับ x2
            </Btn>
          )}
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------

function PurchaseSheet() {
  const p = pendingPurchase.value!
  const [busy, setBusy] = useState(false)
  const done = (ok: boolean) => {
    const resolve = p.resolve
    pendingPurchase.value = null
    resolve(ok ? { ok: true, transactionId: `sandbox-${Date.now().toString(36)}` } : { ok: false, cancelled: true })
  }
  return (
    <div class="modal-backdrop sheet-backdrop" onClick={(e) => !busy && e.target === e.currentTarget && done(false)}>
      <div class="panel sheet purchase">
        <div class="row">
          <Icon name="coinbag" size={40} />
          <div class="grow">
            <div class="subtitle">{p.title}</div>
            <div class="small muted">บุญดี · ซื้อภายในแอป</div>
          </div>
          <div class="title num">฿{p.priceTHB}</div>
        </div>
        <div class="panel soft sandbox-note small">
          <Icon name="lock" size={16} /> โหมดทดลอง: ไม่มีการตัดเงินจริง ในแอปเวอร์ชันร้านค้าจะชำระผ่าน App Store / Google Play
        </div>
        {busy ? (
          <div class="center" style={{ padding: '12px' }}>
            <Icon name="coin" size={32} class="spin" />
            <div class="small muted">กำลังดำเนินการ...</div>
          </div>
        ) : (
          <div class="row">
            <Btn tone="paper" class="grow" onClick={() => done(false)}>
              ยกเลิก
            </Btn>
            <Btn
              tone="green"
              class="grow"
              onClick={() => {
                setBusy(true)
                setTimeout(() => done(true), 900)
              }}
            >
              ยืนยันการซื้อ
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function AdOverlay() {
  const ad = activeAd.value!
  const [left, setLeft] = useState(5)
  useEffect(() => {
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(id)
  }, [])
  const finish = (rewarded: boolean) => {
    const resolve = ad.resolve
    activeAd.value = null
    if (rewarded) sfx.coins(4)
    resolve({ rewarded })
  }
  return (
    <div class="ad-overlay">
      <AdCanvas />
      <div class="ad-top">
        <span class="chip">โฆษณา · ตัวอย่าง</span>
        {left > 0 ? (
          <span class="chip num">{left}</span>
        ) : (
          <button class="btn paper small" onClick={() => finish(true)}>
            รับรางวัล ✓
          </button>
        )}
      </div>
      <div class="ad-bottom panel">
        <div class="subtitle">ข้าวหอมมะลิตราน้องหมาวัด</div>
        <div class="small muted">โฆษณาตัวอย่างในแอปทดลอง · ดูจนจบเพื่อรับรางวัล</div>
        {left > 0 && (
          <button class="btn paper small" onClick={() => finish(false)}>
            ข้าม (ไม่รับรางวัล)
          </button>
        )}
      </div>
    </div>
  )
}

export function useLevel() {
  return level.value
}
