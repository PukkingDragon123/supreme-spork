// หนังสือสวดมนต์: every chant with its meaning card, a guide to listen to,
// and real-audio tools: import your own recording (นำเข้าเสียงสวด, kept in
// IndexedDB) and tap to mark where each line starts so the highlight follows
// the audio.

import { useEffect, useRef, useState } from 'preact/hooks'
import { CHANTS, type Chant } from '../../game/data/chants'
import { STAGES, type PrayerStage } from '../../game/data/prayers'
import { stageUnlocked } from '../../game/prayer'
import { filePlan, synthPlan, timingJson, type LineTiming, type StagePlan } from '../../game/chantTiming'
import { lineWords } from '../../game/chantScore'
import { toast } from '../../game/events'
import { haptic, sfx } from '../../engine/audio'
import { ChantGuide, thaiVoice, type GuideVoice } from '../../engine/chantGuide'
import { invalidateRecording, loadRecording, resetTiming, saveManualTiming, type ChantRecording } from '../../engine/chantSources'
import { deleteImported, listImported, saveImported } from '../../services/chantAudioStore'
import { openPanel, prayStage, prayAtHome, mode } from '../store'
import { PBtn, Window } from '../components/kit'
import { PT, TONE_TEXT } from '../pixeltext'
import { Icon } from '../components/common'
import { MeaningCard } from '../components/MeaningCard'
import { KaraokeLines } from '../components/ChantKaraoke'
import { chantBookFocus, chantPrefs } from '../chantPrefs'
import '../../styles/chant.css'

const MAX_BYTES = 40 * 1024 * 1024

/** A plain listening "stage" for a whole chant. */
function bookStage(chantId: string): PrayerStage {
  return { id: `book-${chantId}`, chapter: 'wat', n: 0, chant: chantId, tempo: 420, judge: 2, hint: 'read', bows: 0, merit: 0, coins: 0, mats: {} }
}

function bookPlan(c: Chant, rec: ChantRecording | null): StagePlan {
  const st = bookStage(c.id)
  const t = rec?.timing
  if (rec && t && ((t.end ?? rec.duration) > t.lines[t.lines.length - 1] + 0.3)) return filePlan(st, t, rec.duration || t.end || 0, { rate: 1 })
  return synthPlan(st)
}

const VOICE_TEXT: Record<GuideVoice, string> = { file: 'เสียงสวดจริง', speech: 'เสียงพูดนำ', hum: 'เสียงฮัมนำ', none: 'ไม่มีเสียง' }

export function ChantBook({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(chantBookFocus.value)
  const [imported, setImported] = useState<string[]>([])
  const [recs, setRecs] = useState<Record<string, ChantRecording | null | undefined>>({})
  const [listen, setListen] = useState<Chant | null>(null)
  const [marking, setMarking] = useState<{ chant: Chant; rec: ChantRecording } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const pickFor = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chantBookFocus.value = null
    void listImported().then(setImported)
  }, [])

  const refresh = (id: string) => {
    setRecs((r) => ({ ...r, [id]: undefined }))
    void loadRecording(id).then((rec) => setRecs((r) => ({ ...r, [id]: rec })))
  }

  useEffect(() => {
    if (!open) return
    if (!(open in recs)) refresh(open)
    const el = listRef.current?.querySelector(`[data-chant="${open}"]`) as HTMLElement | null
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [open])

  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const f = input.files?.[0]
    const id = pickFor.current ?? open
    input.value = ''
    if (!f || !id) return
    if (f.size > MAX_BYTES) {
      toast('ไฟล์ใหญ่เกิน 40 MB ลองย่อไฟล์ก่อนนะ', 'info', 'warn')
      return
    }
    if (f.type && !f.type.startsWith('audio/') && !/\.(mp3|m4a|aac|ogg|oga|opus|wav|webm)$/i.test(f.name)) {
      toast('ต้องเป็นไฟล์เสียง เช่น mp3 m4a ogg หรือ wav', 'info', 'warn')
      return
    }
    setBusy(id)
    try {
      await saveImported(id, f, f.name)
      invalidateRecording(id)
      setImported(await listImported())
      const rec = await loadRecording(id)
      setRecs((r) => ({ ...r, [id]: rec }))
      sfx.chime()
      if (!rec || !rec.duration) toast('เปิดไฟล์นี้ไม่ได้ ลอง mp3 หรือ m4a นะ', 'info', 'warn')
      else if (rec.timingFrom === 'auto') toast('นำเข้าเสียงสวดแล้ว! จับจังหวะให้อัตโนมัติ ลองกดตั้งจังหวะให้แม่นขึ้นได้', 'music')
      else toast('นำเข้าเสียงสวดแล้ว! แตะ "ตั้งจังหวะ" เพื่อให้ไฮไลต์ตรงเสียง', 'music')
    } catch {
      toast('บันทึกไฟล์เสียงไม่ได้ในเบราว์เซอร์นี้', 'info', 'warn')
    } finally {
      setBusy(null)
    }
  }

  const importFor = (id: string) => {
    pickFor.current = id
    file.current?.click()
  }

  const remove = async (id: string) => {
    await deleteImported(id)
    invalidateRecording(id)
    setImported(await listImported())
    refresh(id)
    sfx.close()
    toast('ลบเสียงที่นำเข้าแล้ว', 'trash', 'info')
  }

  return (
    <Window title="หนังสือสวดมนต์" icon="book" onClose={onClose} wide class="ch-book">
      <p class="small muted">อ่านบทสวดพร้อมความหมายได้ทุกบท ฟังเสียงนำ หรือนำเข้าเสียงสวดของคุณเองให้เกมใช้นำสวด</p>
      <input ref={file} type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav" class="ch-file" onChange={onFile} aria-label="เลือกไฟล์เสียงสวด" />
      <div class="col" style={{ gap: '4px' }} ref={listRef}>
        {CHANTS.map((c) => {
          const st = STAGES.find((x) => x.chant === c.id && stageUnlocked(x))
          const isOpen = open === c.id
          const rec = recs[c.id]
          const has = imported.includes(c.id) || !!rec
          return (
            <div class={`panel chant-entry ${isOpen ? 'open' : ''}`} key={c.id} data-chant={c.id}>
              <button class="chant-head" onClick={() => (sfx.tap(), setOpen(isOpen ? null : c.id))} aria-expanded={isOpen}>
                <Icon name="book" size={20} />
                <span class="grow ch-book-title">
                  <b>{c.name}</b>
                  <span class="small muted">{c.short}…</span>
                </span>
                {has && <span class="ch-has-audio">เสียงจริง</span>}
                <span class="small muted">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <div class="chant-body">
                  <MeaningCard chant={c} />
                  {c.lines.map((l, i) => (
                    <p class="chant-line" key={i}>
                      {l}
                    </p>
                  ))}
                  <div class="ch-audio panel">
                    <div class="small">
                      <b>เสียงสวด: </b>
                      {rec === undefined
                        ? 'กำลังหาไฟล์เสียง…'
                        : rec === null
                          ? 'ยังไม่มีไฟล์เสียงจริง ใช้เสียงนำที่เกมสร้างให้'
                          : `${rec.kind === 'import' ? 'ไฟล์ที่นำเข้า' : 'ไฟล์ในเกม'} (${rec.name}) · จังหวะ: ${rec.timingFrom === 'manual' ? 'ตั้งเองแล้ว' : rec.timingFrom === 'file' ? 'จากไฟล์จังหวะ' : rec.timingFrom === 'auto' ? 'อัตโนมัติ' : 'ยังไม่ได้ตั้ง'}`}
                    </div>
                    <div class="ch-audio-grid">
                      <PBtn tone="blue" size="small" icon="play" onClick={() => setListen(c)}>
                        ฟังเสียงนำ
                      </PBtn>
                      <PBtn tone="gold" size="small" icon="music" disabled={busy === c.id} onClick={() => importFor(c.id)}>
                        {busy === c.id ? 'กำลังนำเข้า…' : 'นำเข้าเสียงสวด'}
                      </PBtn>
                      {rec && (
                        <PBtn tone="wood" size="small" icon="edit" onClick={() => setMarking({ chant: c, rec })}>
                          ตั้งจังหวะ
                        </PBtn>
                      )}
                      {rec?.kind === 'import' && (
                        <PBtn tone="red" size="small" icon="trash" onClick={() => void remove(c.id)}>
                          ลบ
                        </PBtn>
                      )}
                    </div>
                  </div>
                  {st && (
                    <PBtn
                      tone="green"
                      size="small"
                      icon="pray"
                      onClick={() => {
                        openPanel(null)
                        prayAtHome.value = mode.value === 'house'
                        prayStage.value = st.id
                      }}
                    >
                      ฝึกสวดบทนี้
                    </PBtn>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {listen && <ListenPlayer chant={listen} onClose={() => setListen(null)} />}
      {marking && (
        <TimingTool
          chant={marking.chant}
          rec={marking.rec}
          onClose={(changed) => {
            const id = marking.chant.id
            setMarking(null)
            if (changed) refresh(id)
          }}
        />
      )}
    </Window>
  )
}

/** Listen to a chant with the karaoke highlight (recording or synthesized guide). */
function ListenPlayer({ chant, onClose }: { chant: Chant; onClose: () => void }) {
  const [plan, setPlan] = useState<StagePlan | null>(null)
  const [playing, setPlaying] = useState(false)
  const [, force] = useState(0)
  const guide = useRef<ChantGuide | null>(null)
  const t = useRef(0)

  useEffect(() => {
    let alive = true
    let raf = 0
    void Promise.all([loadRecording(chant.id), thaiVoice()]).then(([rec, v]) => {
      if (!alive) return
      const p = bookPlan(chant, rec)
      setPlan(p)
      guide.current = new ChantGuide({ plan: p, hint: 'read', pref: chantPrefs.value.guide === 'off' ? 'auto' : chantPrefs.value.guide, recording: rec, speechVoice: v, countIn: true })
      guide.current.start(0)
      setPlaying(true)
      const loop = () => {
        const g = guide.current
        if (!g || !alive) return
        g.update()
        t.current = g.now()
        force((n) => (n + 1) & 0xffff)
        if (t.current >= p.total) {
          g.stop()
          setPlaying(false)
          return
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      guide.current?.stop()
    }
  }, [chant.id])

  const toggle = () => {
    const g = guide.current
    if (!g) return
    if (g.isRunning) {
      g.pause()
      setPlaying(false)
    } else {
      g.resume()
      setPlaying(true)
    }
  }

  return (
    <Window title="ฟังเสียงนำ" icon="music" onClose={onClose} class="ch-listen">
      <b class="ch-listen-name">{chant.name}</b>
      {plan ? (
        <>
          <span class={`ch-voice-chip ${guide.current?.voice ?? 'none'}`}>
            <Icon name="bell" size={12} /> {VOICE_TEXT[guide.current?.voice ?? 'none']}
          </span>
          <div class="ch-listen-kara">
            <KaraokeLines plan={plan} t={t.current} hint="read" big={false} />
          </div>
          <span class="ch-progress">
            <span style={{ width: `${Math.min(100, (t.current / plan.total) * 100)}%` }} />
          </span>
        </>
      ) : (
        <p class="small muted">กำลังเตรียมเสียง…</p>
      )}
      <div class="row" style={{ justifyContent: 'center' }}>
        <PBtn tone="green" size="small" icon={playing ? 'pause' : 'play'} onClick={toggle} disabled={!plan || t.current >= (plan?.total ?? 0)}>
          {playing ? 'พัก' : 'เล่นต่อ'}
        </PBtn>
      </div>
    </Window>
  )
}

/** Tap when each line starts in the recording; saves line timings for the karaoke. */
function TimingTool({ chant, rec, onClose }: { chant: Chant; rec: ChantRecording; onClose: (changed: boolean) => void }) {
  const n = chant.lines.length
  const audio = useRef<HTMLAudioElement | null>(null)
  const [marks, setMarks] = useState<number[]>([])
  const [end, setEnd] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [now, setNow] = useState(0)
  const [saved, setSaved] = useState(false)
  const done = marks.length === n && end !== null
  const REACTION = 0.12

  useEffect(() => {
    const a = new Audio(rec.url)
    a.preload = 'auto'
    audio.current = a
    let raf = 0
    const loop = () => {
      setNow(a.currentTime)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    a.onended = () => setPlaying(false)
    return () => {
      cancelAnimationFrame(raf)
      a.pause()
      a.removeAttribute('src')
      a.load()
    }
  }, [rec.url])

  const play = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) {
      void a.play()?.catch(() => undefined)
      setPlaying(true)
    } else {
      a.pause()
      setPlaying(false)
    }
  }

  const restart = () => {
    const a = audio.current
    if (!a) return
    a.currentTime = 0
    setMarks([])
    setEnd(null)
    setSaved(false)
    void a.play()?.catch(() => undefined)
    setPlaying(true)
  }

  const mark = () => {
    const a = audio.current
    if (!a || a.paused) return
    const tt = Math.max(0, a.currentTime - REACTION)
    haptic(12)
    sfx.tap()
    if (marks.length < n) {
      if (marks.length && tt <= marks[marks.length - 1] + 0.2) return
      setMarks([...marks, tt])
    } else if (end === null) {
      setEnd(Math.max(tt + REACTION, (marks[n - 1] ?? 0) + 0.5))
      a.pause()
      setPlaying(false)
    }
  }

  const undo = () => {
    const a = audio.current
    if (end !== null) setEnd(null)
    else if (marks.length) {
      const m = marks.slice(0, -1)
      setMarks(m)
      if (a) a.currentTime = Math.max(0, (m[m.length - 1] ?? 0) - 0.5)
    }
    sfx.tap()
  }

  const timing: LineTiming | null = done ? { lines: marks, end: end! } : null

  const save = async () => {
    if (!timing) return
    await saveManualTiming(rec, timing)
    setSaved(true)
    sfx.chime()
    toast('บันทึกจังหวะแล้ว ไฮไลต์จะตามเสียงสวดนี้', 'check')
  }

  const copy = async () => {
    if (!timing) return
    try {
      await navigator.clipboard.writeText(timingJson(chant.id, timing))
      toast(`คัดลอกแล้ว วางเป็นไฟล์ ${chant.id}.json ได้เลย`, 'check')
    } catch {
      toast('คัดลอกไม่ได้ ใช้ปุ่มดาวน์โหลดแทนนะ', 'info', 'warn')
    }
  }

  const download = () => {
    if (!timing) return
    const blob = new Blob([timingJson(chant.id, timing)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${chant.id}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const reset = async () => {
    await resetTiming(rec)
    toast('กลับไปใช้จังหวะอัตโนมัติ', 'retry', 'info')
    onClose(true)
  }

  const cur = Math.min(marks.length, n - 1)
  return (
    <Window title="ตั้งจังหวะ" icon="edit" onClose={() => onClose(saved)} class="ch-timing">
      <p class="small">กดเล่น แล้วแตะปุ่มใหญ่ตอนที่เสียงสวด <b>เริ่ม</b> แต่ละบรรทัด พอบรรทัดสุดท้ายสวดจบให้แตะอีกครั้ง</p>
      <div class="ch-tl-lines">
        {chant.lines.map((l, i) => (
          <div key={i} class={`ch-tl-line ${i < marks.length ? 'set' : i === marks.length && !done ? 'cur' : ''}`}>
            <span class="num">{i < marks.length ? marks[i].toFixed(1) : '·'}</span>
            <span class="grow">{lineWords(l).join(' ')}</span>
          </div>
        ))}
        <div class={`ch-tl-line ${end !== null ? 'set' : marks.length === n ? 'cur' : ''}`}>
          <span class="num">{end !== null ? end.toFixed(1) : '·'}</span>
          <span class="grow muted">จบการสวด</span>
        </div>
      </div>
      <div class="ch-tl-time small muted">
        {now.toFixed(1)} / {rec.duration ? rec.duration.toFixed(1) : '?'} วินาที
      </div>
      {!done ? (
        <button class="btn gold big block ch-tl-tap" onPointerDown={(e) => (e.preventDefault(), mark())} disabled={!playing}>
          <PT text={marks.length < n ? `แตะ: เริ่มบรรทัดที่ ${cur + 1}` : 'แตะ: สวดจบแล้ว'} size={14} weight={600} {...TONE_TEXT.gold} />
        </button>
      ) : (
        <pre class="ch-json">{timingJson(chant.id, timing!)}</pre>
      )}
      <div class="ch-audio-grid">
        <PBtn tone="green" size="small" icon={playing ? 'pause' : 'play'} onClick={play}>
          {playing ? 'พัก' : marks.length ? 'เล่นต่อ' : 'เล่น'}
        </PBtn>
        <PBtn tone="wood" size="small" icon="retry" onClick={restart}>
          เริ่มใหม่
        </PBtn>
        <PBtn tone="paper" size="small" onClick={undo} disabled={!marks.length}>
          ย้อน 1
        </PBtn>
        {rec.timingFrom === 'manual' && (
          <PBtn tone="paper" size="small" onClick={() => void reset()}>
            ใช้อัตโนมัติ
          </PBtn>
        )}
      </div>
      {done && (
        <div class="ch-audio-grid">
          <PBtn tone="green" size="small" icon="check" onClick={() => void save()} disabled={saved}>
            {saved ? 'บันทึกแล้ว' : 'บันทึก'}
          </PBtn>
          <PBtn tone="blue" size="small" onClick={() => void copy()}>
            คัดลอก JSON
          </PBtn>
          <PBtn tone="blue" size="small" onClick={download}>
            ดาวน์โหลด
          </PBtn>
        </div>
      )}
      <p class="small muted">ไฟล์จังหวะใช้กับไฟล์ public/audio/chant/{chant.id}.json ได้ด้วย (ดู README ในโฟลเดอร์นั้น)</p>
    </Window>
  )
}
