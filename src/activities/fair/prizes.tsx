// ซุ้มแลกของรางวัล – swap the prize tickets won at the fair games for fair-
// exclusive collectibles, a couple of outfits and coin bags.

import { game } from '../../game/state'
import { FAIR_GAMES, FAIR_GAME_IDS, FAIR_PRIZES, prizeAvailable, prizeOwned, redeemPrize, type FairPrize } from '../../game/hubs'
import { HUB_COLLECTIBLE_BY_ID } from '../../game/data/collectibles/hubs'
import { closeActivity, openActivity, mapId } from '../../ui/store'
import { PBtn, Window } from '../../ui/components/kit'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { spriteDataUrl } from '../../engine/sprite'
import { sfx } from '../../engine/audio'
import { prizeIcon } from './art'
import { collectibleUrl } from '../../art/collectibles'
import { hasPlushArt } from '../../art/plush'
import { TicketIcon } from './shell'
import { fairSfx } from './sound'

const RARITY_TH: Record<string, string> = { common: 'ธรรมดา', uncommon: 'ไม่ธรรมดา', rare: 'หายาก', epic: 'หายากมาก', legendary: 'ตำนาน' }
const RARITY_TONE: Record<string, string> = { common: '', uncommon: 'green', rare: 'blue', epic: 'pink', legendary: 'gold' }

const iconUrls = new Map<string, string>()
export function prizeIconUrl(motif: string) {
  let u = iconUrls.get(motif)
  if (!u) {
    u = spriteDataUrl(prizeIcon(motif), 3)
    iconUrls.set(motif, u)
  }
  return u
}

/** Prize-wall art: plushies show their stitched plush sprite (26×26), the rest the booth icon. */
export function prizeArt(p: FairPrize): { url: string; plush: boolean } {
  const col = p.kind === 'collectible' ? HUB_COLLECTIBLE_BY_ID[p.ref] : null
  if (col && col.kind === 'plush' && hasPlushArt(col.art.motif)) return { url: collectibleUrl(col, 4), plush: true }
  return { url: prizeIconUrl(p.art), plush: false }
}

function PrizeCard({ p }: { p: FairPrize }) {
  const s = game.value
  const avail = prizeAvailable(p, s)
  const owned = prizeOwned(p, s)
  const afford = s.hubs.tickets >= p.tickets
  const col = p.kind === 'collectible' ? HUB_COLLECTIBLE_BY_ID[p.ref] : null
  return (
    <div class={`panel fairx-prize ${avail ? '' : 'owned'}`}>
      {(() => {
        const art = prizeArt(p)
        const px = art.plush ? 52 : 60
        return <img class={`px fairx-prize-img ${art.plush ? 'plush' : ''}`} src={art.url} alt="" width={px} height={px} style={{ width: `${px}px`, height: `${px}px` }} />
      })()}
      <div class="fairx-name">{p.name}</div>
      {col && <span class={`chip small fairx-rar ${RARITY_TONE[col.rarity] ?? ''}`}>{RARITY_TH[col.rarity]}</span>}
      <div class="fairx-desc">{p.desc}</div>
      {owned > 0 && p.kind !== 'coins' && <span class="small muted">มีแล้ว {p.kind === 'outfit' ? '' : `${owned} ชิ้น`}</span>}
      {avail ? (
        <PBtn
          tone={afford ? 'gold' : 'paper'}
          size="small"
          disabled={!afford}
          onClick={() => {
            if (redeemPrize(p.id)) {
              fairSfx.tada()
              sfx.purchase()
            }
          }}
        >
          <TicketIcon size={12} /> {p.tickets}
        </PBtn>
      ) : (
        <span class="chip green small">แลกแล้ว ✓</span>
      )}
    </div>
  )
}

export function PrizeBooth() {
  const s = game.value
  const onFair = mapId.value === 'fair_temple'
  return (
    <Window title="ซุ้มแลกของรางวัล" icon="gift" tone="gold" onClose={closeActivity} wide>
        <div class="panel fairx-prize-head">
          <span class="small">
            <b>ป้าเพ็ญ:</b> “เอาตั๋วมาแลกได้เลยจ้า~ ตุ๊กตาตัวใหญ่ต้องใช้ตั๋วเยอะหน่อยนะ”
          </span>
          <span class="chip gold">
            <TicketIcon size={14} />
            <PT text={String(s.hubs.tickets)} size={14} weight={600} {...TONE_TEXT.ink} />
          </span>
        </div>
        <div class="fairx-prizes">
          {FAIR_PRIZES.map((p) => (
            <PrizeCard key={p.id} p={p} />
          ))}
        </div>
        <div class="small muted center">ตั๋วได้จากซุ้มเกมในงานวัด · ได้มาแล้วทั้งหมด {s.hubs.ticketsTotal} ใบ</div>
        {onFair && (
          <div class="fairx-games">
            {FAIR_GAME_IDS.map((id) => (
              <PBtn key={id} tone="paper" size="small" icon={FAIR_GAMES[id].icon} onClick={() => openActivity('fair', { game: id })}>
                {FAIR_GAMES[id].name}
              </PBtn>
            ))}
          </div>
        )}
    </Window>
  )
}
