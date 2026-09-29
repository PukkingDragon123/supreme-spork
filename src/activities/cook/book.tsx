// Recipe book (ตำราอาหาร) and the locked kitchen card.

import { useState } from 'preact/hooks'
import { game } from '../../game/state'
import { levelFromMerit, meritForLevel } from '../../game/economy'
import { COOKING_LEVEL, DELIVERY_FEE, buyMissing, dishFor, missingCost, missingIngredients, recipeBook, recipeStatus } from '../../game/cooking'
import { RECIPE_BY_ID, STEP_NAMES, type CookRecipe } from '../../game/data/recipes'
import { ITEM_BY_ID } from '../../game/data/items'
import { PBtn, Window } from '../../ui/components/kit'
import { Bar, Coin, Icon } from '../../ui/components/common'
import { PT, TONE_TEXT } from '../../ui/pixeltext'
import { toast } from '../../game/events'
import { sfx } from '../../engine/audio'
import { DishImg, FoodIcon } from './parts'

export function LockedKitchen({ onClose }: { onClose: () => void }) {
  const s = game.value
  const lv = levelFromMerit(s.merit).level
  const need = meritForLevel(COOKING_LEVEL)
  return (
    <Window title="ครัวบุญดี" icon="lock" onClose={onClose} footer={<PBtn tone="green" block onClick={onClose}>ไว้เจอกันนะ</PBtn>}>
      <div class="cook-locked">
        <div class="cook-locked-art">
          <DishImg id="dish_kaprao" scale={2} class="cook-lock-dish a" />
          <DishImg id="dish_mango" scale={2} class="cook-lock-dish b" />
          <DishImg id="dish_kiaowan" scale={2} class="cook-lock-dish c" />
          <span class="cook-lock-badge">
            <Icon name="lock" size={34} />
          </span>
        </div>
        <PT text="ปลดล็อกการทำอาหาร" size={15} weight={600} {...TONE_TEXT.ink} />
        <PT text={`ที่เลเวล ${COOKING_LEVEL}`} size={15} weight={600} color="#b8343f" />
        <div class="small muted">ทำอาหารไทยแสนอร่อยด้วยมินิเกมสไตล์คุกกิ้งมาม่า หั่น ผัด ทอด ปรุงรส แล้วนำไปตักบาตรได้บุญมากกว่าเดิมหลายเท่า!</div>
        <div class="cook-lock-bar">
          <span class="small">
            ตอนนี้ Lv.<b class="num">{lv}</b> / {COOKING_LEVEL}
          </span>
          <Bar value={Math.min(s.merit, need)} max={need} tone="pink" label="บุญที่ต้องสะสม" />
        </div>
        <div class="panel gold small cook-lock-tip">
          <Icon name="bowl" size={18} /> ตักบาตร สวดมนต์ และทำภารกิจทุกวัน เพื่อเก็บบุญให้ถึงเลเวล {COOKING_LEVEL}
        </div>
      </div>
    </Window>
  )
}

function StatusChip({ r }: { r: CookRecipe }) {
  const st = recipeStatus(r.id)
  if (st === 'locked')
    return (
      <span class="chip dark">
        <Icon name="lock" size={12} /> Lv.{r.level}
      </span>
    )
  if (st === 'ready') return <span class="chip green">พร้อมทำ</span>
  return <span class="chip">ขาดวัตถุดิบ</span>
}

export function RecipeBook({ selected, onSelect, onCook, onClose }: { selected: string; onSelect: (id: string) => void; onCook: (id: string) => void; onClose: () => void }) {
  const [, bump] = useState(0)
  const r = RECIPE_BY_ID[selected]
  const lv = levelFromMerit(game.value.merit).level
  const st = recipeStatus(r.id)
  const miss = missingIngredients(r.id)
  const cost = missingCost(r.id)
  const plain = dishFor(r.id, 1)!
  const gold = dishFor(r.id, 3)!
  const deliver = () => {
    if (buyMissing(r.id, DELIVERY_FEE)) {
      sfx.purchase()
      toast('ไรเดอร์ส่งวัตถุดิบถึงครัวแล้ว!', 'bag')
      bump((n) => n + 1)
    }
  }
  return (
    <Window title="ตำราอาหารบุญดี" icon="book" onClose={onClose} full class="cook-book">
      <div class="cook-detail panel">
        <div class="row cook-detail-head">
          <DishImg id={plain.id} scale={2} />
          <div class="grow">
            <PT text={r.name} size={16} weight={600} {...TONE_TEXT.ink} />
            <div class="small muted">{r.desc}</div>
            <div class="row wrap cook-merit">
              <span class="chip pink">
                <Icon name="merit" size={14} /> +{plain.merit}/ที่
              </span>
              <span class="chip gold">
                <Icon name="star" size={14} /> 3 ดาว +{gold.merit}/ที่
              </span>
              <span class="chip">ได้ {r.qty} ที่</span>
            </div>
          </div>
        </div>
        <div class="cook-sub">วัตถุดิบ</div>
        <div class="cook-ings">
          {Object.entries(r.ingredients).map(([id, n]) => {
            const have = game.value.inventory[id] ?? 0
            const ok = have >= n
            return (
              <div class={`cook-ing ${ok ? 'ok' : 'no'}`} key={id}>
                <FoodIcon id={id} size={28} />
                <span class="cook-ing-name">{ITEM_BY_ID[id]?.name ?? id}</span>
                <span class="cook-ing-n num">
                  {Math.min(have, 99)}/{n}
                </span>
                <span class="cook-ing-mark">{ok ? <Icon name="check" size={14} /> : null}</span>
              </div>
            )
          })}
        </div>
        <div class="cook-sub">ขั้นตอน</div>
        <div class="cook-steps book">
          {r.steps.map((s, i) => (
            <span class="cook-step" key={i}>
              <b class="num">{i + 1}</b> {STEP_NAMES[s.kind]}
            </span>
          ))}
        </div>
        <div class="small muted cook-tip">
          <Icon name="info" size={14} /> {r.tip}
        </div>
        {st === 'locked' ? (
          <div class="panel dark small center">
            <Icon name="lock" size={16} /> ปลดล็อกเมนูนี้ที่เลเวล {r.level} (ตอนนี้ Lv.{lv})
          </div>
        ) : st === 'missing' ? (
          <>
            <div class="panel soft small cook-mart-hint">
              <Icon name="shop" size={18} /> ขาด {Object.entries(miss).map(([id, n]) => `${ITEM_BY_ID[id]?.name ?? id} ×${n}`).join(', ')}
              <br />
              <b>ไปซื้อที่ 7-บุญ</b> ร้านสะดวกซื้อตรงข้ามประตูวัด มีวัตถุดิบครบทุกเมนู
            </div>
            <PBtn tone="blue" block icon="bag" onClick={deliver}>
              สั่งไรเดอร์ส่งด่วน
              <Coin n={cost.coins + DELIVERY_FEE} size={16} />
            </PBtn>
          </>
        ) : (
          <PBtn tone="green" size="big" block icon="play" onClick={() => onCook(r.id)}>
            เริ่มทำอาหาร!
          </PBtn>
        )}
      </div>
      <div class="cook-list">
        {recipeBook().map((x) => {
          const d = dishFor(x.id, 1)!
          const locked = recipeStatus(x.id) === 'locked'
          return (
            <button key={x.id} class={`panel cook-card ${x.id === selected ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => (sfx.tap(), onSelect(x.id))}>
              <FoodIcon id={d.id} size={36} />
              <span class="cook-card-text">
                <span class="cook-card-name">{x.name}</span>
                <StatusChip r={x} />
              </span>
            </button>
          )
        })}
      </div>
    </Window>
  )
}
