// Title screen over the animated temple backdrop, with sign up / log in /
// guest play.

import { useState } from 'preact/hooks'
import { useStage } from '../../activities/kit'
import { TitleScene } from '../../scenes/cutscenes/title'
import { game } from '../../game/state'
import { auth, validateEmail, validateName, validatePassword, type Gender } from '../../services/auth'
import { authReady, hasIdentity, playAsGuest, session, signIn, signOut, signUp } from '../account'
import { goTemple, mode } from '../store'
import { PBtn, Tabs } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Icon } from '../components/common'
import { sfx, unlockAudio } from '../../engine/audio'

function startPlaying() {
  unlockAudio()
  sfx.bigBell()
  if (!game.value.onboarded) mode.value = 'create'
  else goTemple(game.value.lastArea)
}

export function TitleView() {
  const { host } = useStage(() => new TitleScene(), { targetWidth: 200 })
  const [forceAuth, setForceAuth] = useState(false)
  const ready = authReady.value
  const known = ready && hasIdentity() && !forceAuth
  const s = game.value
  return (
    <div class="title-screen">
      <div class="stage-host" ref={host} />
      <div class="title-bottom">
        {!ready ? (
          <div class="title-loading">
            <PT text="กำลังเตรียมวัด…" size={13} color="#fff6dc" shadow="#3b2616" />
          </div>
        ) : known ? (
          <div class="win title-card">
            <div class="col center" style={{ gap: '6px' }}>
              <PT text={s.onboarded ? `ยินดีต้อนรับกลับ ${s.player.name}` : 'ยินดีต้อนรับสายบุญ'} size={14} weight={600} {...TONE_TEXT.ink} />
              {session.value && <span class="small muted">{session.value.email}</span>}
              <PBtn tone="green" size="big" block icon="pray" onClick={startPlaying}>
                {s.onboarded ? 'ไปวัดกันเลย' : 'เริ่มการเดินทาง'}
              </PBtn>
              <div class="row" style={{ justifyContent: 'center' }}>
                {session.value ? (
                  <PBtn tone="paper" size="small" icon="logout" onClick={() => void signOut()}>
                    เปลี่ยนบัญชี
                  </PBtn>
                ) : (
                  <PBtn tone="paper" size="small" icon="user" onClick={() => setForceAuth(true)}>
                    สมัคร / เข้าสู่ระบบ เพื่อเก็บความคืบหน้า
                  </PBtn>
                )}
              </div>
            </div>
          </div>
        ) : (
          <AuthPanel onDone={() => (setForceAuth(false), startPlaying())} onGuest={() => (playAsGuest(), setForceAuth(false), startPlaying())} />
        )}
        <div class="title-foot small">ทำบุญ ใจฟู · เวอร์ชัน 2</div>
      </div>
    </div>
  )
}

type AuthTab = 'signup' | 'login'

export function AuthPanel({ onDone, onGuest }: { onDone: () => void; onGuest: () => void }) {
  const [t, setT] = useState<AuthTab>('signup')
  const [name, setName] = useState(game.value.player.name === 'สายบุญ' ? '' : game.value.player.name)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [gender, setGender] = useState<Gender>(game.value.player.look.gender === 'm' ? 'male' : 'female')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const local = auth().kind === 'local'

  const submit = async (e: Event) => {
    e.preventDefault()
    if (busy) return
    setErr(null)
    setInfo(null)
    const v = validateEmail(email) ?? (t === 'signup' ? validatePassword(pw) ?? validateName(name) : pw ? null : { message: 'กรอกรหัสผ่านด้วยนะ' })
    if (v) {
      sfx.error()
      setErr(v.message)
      return
    }
    setBusy(true)
    const r = t === 'signup' ? await signUp({ email, password: pw, name, gender }) : await signIn(email, pw)
    setBusy(false)
    if (!r.ok) {
      sfx.error()
      setErr(r.message)
      return
    }
    if (r.needsConfirmation) {
      setInfo('ส่งลิงก์ยืนยันไปที่อีเมลแล้ว ยืนยันแล้วกลับมาเข้าสู่ระบบได้เลย')
      setT('login')
      return
    }
    sfx.chime()
    onDone()
  }

  return (
    <div class="win title-card auth">
      <Tabs
        tabs={[
          { id: 'signup', label: 'สมัครสมาชิก', icon: 'sparkle' },
          { id: 'login', label: 'เข้าสู่ระบบ', icon: 'key' },
        ]}
        value={t}
        onChange={(x) => (setT(x), setErr(null))}
      />
      <form class="ptab-body auth-form" onSubmit={submit}>
        {t === 'signup' && (
          <label class="field">
            <PT text="ชื่อเล่นในเกม" size={12} {...TONE_TEXT.ink} />
            <input class="pinput" value={name} maxLength={24} autoComplete="nickname" placeholder="เช่น น้องบุญ" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </label>
        )}
        <label class="field">
          <PT text="อีเมล" size={12} {...TONE_TEXT.ink} />
          <input class="pinput" type="email" inputMode="email" autoComplete="email" value={email} placeholder="you@example.com" onInput={(e) => setEmail((e.target as HTMLInputElement).value)} />
        </label>
        <label class="field">
          <PT text="รหัสผ่าน" size={12} {...TONE_TEXT.ink} />
          <input
            class="pinput"
            type="password"
            autoComplete={t === 'signup' ? 'new-password' : 'current-password'}
            value={pw}
            placeholder={t === 'signup' ? 'อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข' : ''}
            onInput={(e) => setPw((e.target as HTMLInputElement).value)}
          />
        </label>
        {t === 'signup' && (
          <div class="row auth-gender">
            <PT text="เพศ" size={12} {...TONE_TEXT.ink} />
            <span class="grow" />
            {(
              [
                ['male', 'ชาย', 'blue'],
                ['female', 'หญิง', 'pink'],
                ['other', 'ไม่ระบุ', 'wood'],
              ] as const
            ).map(([g, label, tone]) => (
              <PBtn key={g} type="button" size="small" tone={gender === g ? tone : 'paper'} onClick={() => setGender(g)} aria-pressed={gender === g}>
                {label}
              </PBtn>
            ))}
          </div>
        )}
        {err && (
          <div class="field-err" role="alert">
            {err}
          </div>
        )}
        {info && <div class="small auth-info">{info}</div>}
        <PBtn tone="green" block type="submit" disabled={busy} icon={t === 'signup' ? 'sparkle' : 'key'}>
          {busy ? 'รอสักครู่…' : t === 'signup' ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
        </PBtn>
        {local && (
          <p class="small muted auth-note">
            <Icon name="info" size={14} /> บัญชีเก็บไว้ในเครื่องนี้อย่างปลอดภัย (รหัสผ่านถูกเข้ารหัส) เชื่อมคลาวด์ได้เมื่อเปิดเซิร์ฟเวอร์
          </p>
        )}
      </form>
      <button class="auth-guest" type="button" onClick={() => (sfx.tap(), onGuest())}>
        <PT text="เล่นเลยโดยไม่สมัคร ▸" size={12} {...TONE_TEXT.wood} />
      </button>
    </div>
  )
}
