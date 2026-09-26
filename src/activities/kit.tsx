// Shared building blocks for mini-game activities.

import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Stage, type Scene, type StageOptions } from '../engine/stage'
import { game } from '../game/state'
import { adsLeft, grantMeritRaw, rewardAd } from '../game/actions'
import { ads } from '../services/ads'
import { Btn, Coin, Icon, Merit } from '../ui/components/common'
import { FxCanvas } from '../ui/components/FxCanvas'
import { coinStoreOpen, openActivity, activity } from '../ui/store'
import { signal } from '@preact/signals'
import { PT, TONE_TEXT } from '../ui/pixeltext'
import { GOALS } from './goals'

/** Activity id whose goal card should be shown again (the ? button). */
export const goalRequest = signal<string | null>(null)
import { sfx } from '../engine/audio'

/** Mount a pixel stage with the given scene for the lifetime of a component. */
export function useStage<S extends Scene>(factory: () => S, opts: StageOptions = {}, deps: unknown[] = []) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<S | null>(null)
  const stage = useRef<Stage | null>(null)
  useEffect(() => {
    const st = new Stage(host.current!, opts)
    const sc = factory()
    scene.current = sc
    stage.current = st
    st.setScene(sc)
    st.start()
    return () => {
      st.destroy()
      scene.current = null
      stage.current = null
    }
  }, deps)
  return { host, scene, stage }
}

export function ActivityFrame({
  title,
  onClose,
  children,
  backLabel,
}: {
  title: string
  onClose: () => void
  children?: ComponentChildren
  backLabel?: string
}) {
  const id = activity.value?.id
  return (
    <>
      <div class="act-top">
        <button class="btn paper small icon-btn" onClick={() => (sfx.close(), onClose())} aria-label={backLabel ?? 'กลับ'}>
          <PT text="‹" size={16} weight={600} {...TONE_TEXT.paper} />
        </button>
        <div class="title-plate wood act-title">
          <PT text={title} size={12} weight={600} {...TONE_TEXT.wood} />
        </div>
        {id && GOALS[id] && (
          <button class="btn blue small icon-btn" onClick={() => (sfx.open(), (goalRequest.value = id))} aria-label="วิธีเล่น">
            <PT text="?" size={14} weight={600} {...TONE_TEXT.blue} />
          </button>
        )}
        <button class="hud2-coins" onClick={() => (coinStoreOpen.value = true)} aria-label="เติมบุญคอยน์">
          <Icon name="coin" size={18} />
          <PT text={game.value.coins.toLocaleString('en-US')} size={13} weight={600} {...TONE_TEXT.wood} />
        </button>
      </div>
      {children}
    </>
  )
}

export interface ResultData {
  title: string
  merit: number
  coins?: number
  lines?: string[]
  icon?: string
  /** Offer to double the merit with a rewarded ad. */
  doubleable?: boolean
}

export function ResultCard({ r, onDone, again }: { r: ResultData; onDone: () => void; again?: { label: string; run: () => void } }) {
  const [doubled, setDoubled] = useState(false)
  useEffect(() => {
    sfx.merit()
  }, [])
  const double = async () => {
    const res = await ads().showRewarded('double_reward')
    if (!res.rewarded) return
    rewardAd('bonus')
    grantMeritRaw(r.merit)
    setDoubled(true)
    sfx.chime()
  }
  const dedicated = game.value.daily.dedicated
  return (
    <div class="modal-backdrop celebrate">
      <FxCanvas mode="sparkle" />
      <div class="panel modal center result-card">
        <Icon name={r.icon ?? 'lotus'} size={48} />
        <div class="title">{r.title}</div>
        <div class="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <span class="chip pink big-chip">
            <Merit n={`+${doubled ? r.merit * 2 : r.merit}`} size={20} />
            <span class="small">บุญ</span>
          </span>
          {!!r.coins && (
            <span class="chip gold big-chip">
              <Coin n={`+${r.coins}`} size={20} />
            </span>
          )}
        </div>
        {r.lines?.map((l) => (
          <div class="small muted" key={l}>
            {l}
          </div>
        ))}
        <div class="col" style={{ marginTop: '8px' }}>
          {r.doubleable !== false && r.merit > 0 && !doubled && adsLeft() > 0 && (
            <Btn tone="blue" block onClick={double}>
              <Icon name="tv" size={18} /> ดูโฆษณา รับบุญ x2
            </Btn>
          )}
          {again && (
            <Btn tone="paper" block onClick={again.run}>
              {again.label}
            </Btn>
          )}
          {!dedicated && (
            <Btn tone="pink" block onClick={() => openActivity('dedicate')}>
              <Icon name="vessel" size={18} /> กรวดน้ำอุทิศส่วนกุศล
            </Btn>
          )}
          <Btn tone="green" block onClick={onDone}>
            สาธุ ๆ ๆ
          </Btn>
        </div>
      </div>
    </div>
  )
}

/** Simple step-by-step hint bubble at the bottom of an activity. */
export function Tip({ children }: { children: ComponentChildren }) {
  return <div class="panel act-tip">{children}</div>
}
