// Quick chat sheet: emotes, preset Thai phrases and a 60-character line,
// seen as speech bubbles by real players on the same map. It sits at the
// top of the screen so the players stay in view and the phone keyboard
// never covers the input.

import { useEffect, useRef, useState } from 'preact/hooks'
import { sfx } from '../../engine/audio'
import { NET_LIMITS, EMOTES } from '../../services/netValidate'
import { canTalk, sendChat, sendEmote } from './onlineHub'
import { chatLog, chatOpen, EMOTE_INFO, netSummary } from './onlineStore'
import { NIcon } from './netIcons'
import './online.css'

export const QUICK_PHRASES = [
  'สวัสดีครับ 🙏',
  'สวัสดีค่ะ 🙏',
  'สาธุ~',
  'อนุโมทนาบุญด้วยนะ',
  'ไปทำบุญด้วยกันไหม?',
  'ชุดสวยจัง!',
  'น้องสัตว์เลี้ยงน่ารักมาก',
  'แลกของกันไหม?',
  'ขอบคุณมากนะ 💕',
  'ตามมาทางนี้!',
  'รอแป๊บนะ',
  'ไปก่อนนะ บ๊ายบาย 👋',
]

export function ChatSheet() {
  const [text, setText] = useState('')
  const log = chatLog.value
  const here = netSummary.value.here
  const ok = canTalk()
  const chatOk = canTalk('chat')
  const emoteOk = canTalk('emote')
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log.length])
  const close = () => {
    sfx.close()
    chatOpen.value = false
  }
  const send = (t: string) => {
    if (sendChat(t)) setText('')
  }
  return (
    <div class="ol-chat" role="dialog" aria-label="แชทออนไลน์">
      <div class="ol-chat-head">
        <NIcon name="chat" size={18} />
        <b class="grow">แชทกับคนที่อยู่ที่นี่</b>
        <span class={`chip small ${here ? 'green' : ''}`}>{here ? `คนจริง ${here} คน` : 'ยังไม่มีใครที่นี่'}</span>
        <button class="ol-x" aria-label="ปิดแชท" onClick={close}>
          <NIcon name="close" size={14} />
        </button>
      </div>
      <div class="ol-emotes" role="group" aria-label="อีโมต">
        {EMOTES.map((e) => (
          <button key={e} class="ol-emote-btn" disabled={!emoteOk} onClick={() => sendEmote(e)} aria-label={EMOTE_INFO[e].label}>
            <NIcon name={EMOTE_INFO[e].icon} size={20} />
            <span>{EMOTE_INFO[e].label}</span>
          </button>
        ))}
      </div>
      {log.length > 0 && (
        <div class="ol-log" ref={logRef} aria-live="polite">
          {log.map((l) => (
            <div key={l.id} class={`ol-line ${l.from === 'me' ? 'me' : ''}`}>
              <b>{l.from === 'me' ? 'เรา' : l.name}</b>
              {l.emote ? (
                <span class="ol-line-emote">
                  <NIcon name={EMOTE_INFO[l.emote].icon} size={14} /> {EMOTE_INFO[l.emote].label}
                </span>
              ) : (
                <span>{l.text}</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div class="ol-phrases">
        {QUICK_PHRASES.map((p) => (
          <button key={p} class="chip ol-phrase" disabled={!chatOk} onClick={() => send(p)}>
            {p}
          </button>
        ))}
      </div>
      <form
        class="ol-input"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <input
          class="pinput"
          value={text}
          maxLength={NET_LIMITS.chat}
          placeholder="พิมพ์ข้อความสั้น ๆ…"
          aria-label="ข้อความ"
          disabled={!chatOk}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          enterKeyHint="send"
        />
        <span class="ol-count num">
          {text.length}/{NET_LIMITS.chat}
        </span>
        <button class="btn green small ol-send" type="submit" disabled={!chatOk || !text.trim()} aria-label="ส่ง">
          <NIcon name="chat" size={18} />
        </button>
      </form>
      <p class="ol-note">{ok && !chatOk ? 'ห้องนี้ให้คุณดูได้อย่างเดียว ส่งแชทไม่ได้' : 'กรองคำไม่สุภาพให้อัตโนมัติ · เห็นเฉพาะผู้เล่นจริงบนแผนที่นี้'}</p>
    </div>
  )
}
