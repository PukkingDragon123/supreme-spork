// Job brief card shown before every volunteer job: the requester (portrait,
// name, role and a funny line), the task in a line or two, the time limit,
// the rewards at 3 stars, today's deals and the how-to steps.

import { useMemo, useState } from 'preact/hooks'
import type { JobDef } from '../../game/data/jobs'
import { JOB_GOALS } from '../../game/data/jobs'
import { jobFullLeft, jobReward } from '../../game/jobs'
import { jobDeals, type JobDeal } from '../../game/workDeals'
import { MATERIAL_INFO } from '../../game/materials'
import { spriteDataUrl } from '../../engine/sprite'
import { PBtn, Window } from '../../ui/components/kit'
import { Coin, Icon, Merit } from '../../ui/components/common'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { sfx } from '../../engine/audio'
import { REQUESTERS, requesterLine, requesterPortrait } from './requesters'

const STYLE = `
.jbr { display: flex; flex-direction: column; gap: 8px; }
.jbr-who { display: flex; gap: 8px; align-items: flex-start; }
.jbr-face { flex: none; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 50% 35%, #fff6d8, #f0c97a); box-shadow: 0 0 0 3px #3a2838, 0 0 0 5px #e9a53a, 0 4px 0 5px rgba(58,40,56,0.35); animation: jbr-bob 2.4s ease-in-out infinite; }
.jbr-face img { display: block; width: 64px; height: 64px; image-rendering: pixelated; }
.jbr-say { position: relative; flex: 1; min-width: 0; background: #fffaf0; border-radius: 4px; padding: 5px 8px 6px; box-shadow: 0 0 0 2px #3a2838, 0 3px 0 2px rgba(58,40,56,0.25); animation: jbr-pop 0.28s cubic-bezier(.3,1.7,.5,1) both; }
.jbr-say::before { content: ''; position: absolute; left: -7px; top: 14px; border: 5px solid transparent; border-right-color: #3a2838; border-left: 0; }
.jbr-name { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px; }
.jbr-role { font-size: 11px; padding: 0 5px; border-radius: 3px; background: #f3e3c3; color: #6e4a35; }
.jbr-line { font-size: 13px; line-height: 1.45; color: #3b2616; }
.jbr-task { font-size: 14px; line-height: 1.5; font-weight: 600; color: #3b2616; }
.jbr-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.jbr-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 4px; background: #fff1d6; box-shadow: 0 0 0 2px #c9a06a; font-size: 12px; color: #3b2616; }
.jbr-sub { font-size: 12px; font-weight: 600; color: #8e5a2a; margin-bottom: -2px; }
.jbr-deals { display: flex; flex-direction: column; gap: 4px; }
.jbr-deal { display: flex; align-items: center; gap: 6px; padding: 4px 7px; border-radius: 4px; background: rgba(58,40,56,0.06); color: #8a7a70; font-size: 12px; }
.jbr-deal b { color: #6e5a50; }
.jbr-deal.on { background: linear-gradient(90deg, #fff3a6, #ffe07a); color: #5a3410; box-shadow: 0 0 0 2px #e9a53a; animation: jbr-glow 1.6s ease-in-out infinite; }
.jbr-deal.on b { color: #7a3a10; }
.jbr-deal .jbr-tag { margin-left: auto; font-size: 11px; padding: 0 5px; border-radius: 3px; background: #e8514a; color: #fff; }
.jbr-deal:not(.on) .jbr-tag { background: #c9bfb8; }
.jbr-pips { margin-left: auto; display: inline-flex; gap: 2px; }
.jbr-pip { width: 8px; height: 8px; border-radius: 2px; background: #d8ccc0; box-shadow: 0 0 0 1px #8a7a70; }
.jbr-pip.on { background: #6cc36a; box-shadow: 0 0 0 1px #2f6f4b; }
.jbr-how summary { cursor: pointer; font-size: 12px; color: #6e4a35; }
.jbr-how ol { margin: 4px 0 0; }
.jbr-foot { display: flex; gap: 8px; width: 100%; }
.jbr-foot .btn:last-child { flex: 1; }
@keyframes jbr-bob { 50% { transform: translateY(-2px); } }
@keyframes jbr-pop { from { transform: scale(0.7); opacity: 0; } }
@keyframes jbr-glow { 50% { filter: brightness(1.08); } }
`

function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById('jbr-style')) return
  const el = document.createElement('style')
  el.id = 'jbr-style'
  el.textContent = STYLE
  document.head.appendChild(el)
}

function DealRow({ d }: { d: JobDeal }) {
  const icon = d.id === 'first' ? 'merit' : d.id === 'featured' ? 'coin' : 'gift'
  return (
    <div class={`jbr-deal ${d.active ? 'on' : ''}`}>
      <Icon name={icon} size={16} />
      <span>
        <b>{d.label}</b>
        <br />
        {d.detail}
      </span>
      {d.progress ? (
        <span class="jbr-pips" aria-label={`${d.progress[0]}/${d.progress[1]}`}>
          {Array.from({ length: d.progress[1] }, (_, i) => (
            <span key={i} class={`jbr-pip ${i < d.progress![0] ? 'on' : ''}`} />
          ))}
        </span>
      ) : (
        <span class="jbr-tag">{d.active ? 'ได้เลย!' : d.id === 'featured' ? 'งานอื่น' : 'ใช้แล้ว'}</span>
      )}
    </div>
  )
}

/** Brief card before a job (and the "?" help during it). */
export function JobBrief({ def, onStart, onClose, again }: { def: JobDef; onStart: () => void; onClose: () => void; again?: boolean }) {
  ensureStyle()
  const g = JOB_GOALS[def.id]
  const req = REQUESTERS[def.id]
  const [seed] = useState(() => Math.floor(Math.random() * 1000))
  const face = useMemo(() => spriteDataUrl(requesterPortrait(req), 2), [def.id])
  const left = jobFullLeft(def.id)
  const full = jobReward(def, 3, left > 0 ? 0 : def.daily)
  const deals = jobDeals(def.id)
  return (
    <Window
      title={def.name}
      icon={def.icon}
      onClose={onClose}
      class="jbr-win"
      footer={
        <div class="jbr-foot">
          {!again && (
            <PBtn tone="paper" onClick={() => (sfx.close(), onClose())}>
              กลับ
            </PBtn>
          )}
          <PBtn tone="green" block size="big" icon="play" onClick={onStart}>
            {again ? 'เล่นต่อ' : 'เริ่มเลย'}
          </PBtn>
        </div>
      }
    >
      <div class="jbr">
        <div class="jbr-who">
          <span class="jbr-face">
            <img src={face} alt={req.name} width={64} height={64} draggable={false} />
          </span>
          <div class="jbr-say">
            <div class="jbr-name">
              <PT text={req.name} size={13} weight={600} {...TONE_TEXT.ink} />
              <span class="jbr-role">{req.role}</span>
            </div>
            <div class="jbr-line">“{requesterLine(req, seed)}”</div>
          </div>
        </div>
        <div class="jbr-task">{g.goal}</div>
        <div class="jbr-meta">
          <span class="jbr-chip">
            <Icon name="bolt" size={14} /> {def.time} วินาที
          </span>
          <span class="jbr-chip">
            <Icon name="map" size={14} /> {def.place}
          </span>
        </div>
        <div class="jbr-sub">รางวัล 3 ดาว{left > 0 ? ` · เต็มเหลือ ${left} รอบวันนี้` : ' · วันนี้ได้ 25%'}</div>
        <div class="jbr-meta">
          <span class="chip pink">
            <Merit n={`+${full.merit}`} size={16} />
          </span>
          <span class="chip gold">
            <Coin n={`+${full.coins}`} size={16} />
          </span>
          {def.mat && left > 0 && (
            <span class="jbr-chip">
              {MATERIAL_INFO[def.mat].name} +2
            </span>
          )}
        </div>
        <div class="jbr-sub">ดีลวันนี้</div>
        <div class="jbr-deals">
          {deals.map((d) => (
            <DealRow key={d.id} d={d} />
          ))}
        </div>
        <details class="jbr-how" open={again}>
          <summary>วิธีเล่น</summary>
          <ol class="goal-steps">
            {g.steps.map((s, i) => (
              <li key={i}>
                <span class="goal-n num">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </details>
      </div>
    </Window>
  )
}
