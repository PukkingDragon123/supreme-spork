// ทำอาหาร — Cooking-Mama-style kitchen (unlocks at level 10). Pick a recipe
// from the book, play its step mini-games, then get the dish (1–3 stars;
// 3 stars = the gold "ฝีมือเชฟ" dish + a bonus serving) to offer in ตักบาตร.
//
//   <CookActivity req={{ id: 'cook', params: { recipe?: 'kaprao' } }} />

import "./cook.css";
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { game, level } from "../../game/state";
import {
  COOKING_LEVEL,
  canCook,
  cook,
  dishFor,
  gradeFor,
  rewardCooking,
  starsFor,
  recipeBook,
  recipeStatus,
  type CookResult,
} from "../../game/cooking";
import {
  CONDIMENT_NAMES,
  RECIPE_BY_ID,
  STEP_NAMES,
  type Condiment,
} from "../../game/data/recipes";
import { ITEM_BY_ID } from "../../game/data/items";
import {
  closeActivity,
  openActivity,
  type ActivityRequest,
} from "../../ui/store";
import { ActivityFrame } from "../kit";
import { useStage } from "../kit";
import { PBtn, Stars } from "../../ui/components/kit";
import { Bar, Icon } from "../../ui/components/common";
import { FxCanvas } from "../../ui/components/FxCanvas";
import { PT, TONE_TEXT } from "../../ui/pixeltext";
import { sfx, haptic } from "../../engine/audio";
import { bottleUrl } from "../../art/cooking";
import { KitchenScene } from "./scene";
import type { Chip } from "./games";
import { LockedKitchen, RecipeBook } from "./book";
import { DishImg } from "./parts";
import { spriteDataUrl } from "../../engine/sprite";
import { workerCard, type CardMood } from "../../art/workActor";
import { wsfx } from "../jobs/workSfx";

type View = "book" | "cook" | "result";

interface Snap {
  progress: number;
  hint: string;
  time: number;
  chips: Chip[];
}

const GRADE_TONE: Record<string, { color: string; outline: string }> = {
  perfect: { color: "#ffe45e", outline: "#7a3a10" },
  great: { color: "#b4f08a", outline: "#1f4a26" },
  close: { color: "#9fd0ff", outline: "#1f3f70" },
  oops: { color: "#ffc4d8", outline: "#8e3a5c" },
};

function firstRecipe(): string {
  const book = recipeBook();
  return (
    book.find((r) => recipeStatus(r.id) === "ready") ??
    book.find((r) => recipeStatus(r.id) !== "locked") ??
    book[0]
  ).id;
}

export function CookActivity({ req }: { req: ActivityRequest }) {
  const locked = level.value.level < COOKING_LEVEL;
  const want =
    typeof req.params?.recipe === "string" && RECIPE_BY_ID[req.params.recipe]
      ? req.params.recipe
      : null;
  const { host, scene, stage } = useStage(() => new KitchenScene(), {
    targetWidth: 150,
  });
  const [view, setView] = useState<View>("book");
  const [sel, setSel] = useState<string>(want ?? firstRecipe());
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState<Snap>({
    progress: 0,
    hint: "",
    time: 0,
    chips: [],
  });
  const [grade, setGrade] = useState<{
    text: string;
    key: string;
    n: number;
    score: number;
  } | null>(null);
  const [result, setResult] = useState<
    (CookResult & { bonusMerit: number; burnt: boolean }) | null
  >(null);
  const panel = useRef<HTMLDivElement>(null);
  const recipe = RECIPE_BY_ID[sel];

  // Dev hooks for screenshot scripts.
  useEffect(() => {
    if (import.meta.env.DEV)
      Object.assign(window as unknown as Record<string, unknown>, {
        __kitchen: scene.current,
        __kitchenStage: stage.current,
      });
  }, [scene.current]);

  // Keep the stage station clear of the bottom panel.
  useEffect(() => {
    const el = panel.current;
    const st = stage.current;
    const sc = scene.current;
    if (!el || !st || !sc) return;
    const fit = () => {
      sc.insetBottom = Math.round((el.offsetHeight + 16) / (st.cssScale || 1));
    };
    fit();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [view, scene.current]);

  // Poll the running game for the DOM panel.
  useEffect(() => {
    if (view !== "cook") return;
    const id = setInterval(() => {
      const g = scene.current?.game;
      if (!g) return;
      setSnap((s) => {
        const next = {
          progress: g.progress,
          hint: g.hint,
          time: Math.min(1, g.time / g.limit),
          chips: g.chips,
        };
        return s.progress === next.progress &&
          s.hint === next.hint &&
          Math.abs(s.time - next.time) < 0.02 &&
          s.chips === next.chips
          ? s
          : next;
      });
    }, 90);
    return () => clearInterval(id);
  }, [view]);

  const start = (id: string) => {
    const sc = scene.current;
    const r = RECIPE_BY_ID[id];
    if (!sc || !r || !canCook(id)) return;
    setSel(id);
    setStep(0);
    setGrade(null);
    setResult(null);
    sc.cb = {
      onStep: (i, g) => {
        setStep(i);
        setSnap({ progress: 0, hint: g.hint, time: 0, chips: g.chips });
        // Plate the gold dish when the cook is on track for three stars.
        if (g.step.kind === "plate")
          sc.dishId = dishFor(id, starsFor(sc.scores))!.id;
      },
      onGrade: (i, score) => {
        const gr = gradeFor(score);
        setGrade({ ...gr, n: i, score });
        if (gr.key === "perfect") sfx.chime();
        else if (gr.key === "great") sfx.sparkle();
        else sfx.tap();
        haptic(gr.key === "perfect" ? 30 : 12);
        setTimeout(
          () => setGrade((g0) => (g0 && g0.n === i ? null : g0)),
          1150,
        );
      },
      onFinish: (scores) => {
        const stars = starsFor(scores);
        const res = cook(id, stars);
        const bonusMerit = res ? rewardCooking(stars) : 0;
        setTimeout(() => {
          if (res) {
            setResult({ ...res, bonusMerit, burnt: sc.burnt });
            sfx.levelUp();
          }
          setView(res ? "result" : "book");
        }, 350);
      },
    };
    sc.start(r, dishFor(id, 1)!.id);
    setView("cook");
    sfx.open();
  };

  // Deep link straight into a recipe (e.g. from a hotspot).
  useEffect(() => {
    if (want && !locked && canCook(want)) setTimeout(() => start(want), 50);
  }, []);

  const backToBook = () => {
    const sc = scene.current;
    if (sc) {
      sc.phase = "idle";
      sc.game = null;
      sc.recipe = null;
    }
    setView("book");
    setResult(null);
  };

  const title = view === "cook" && recipe ? recipe.name : "ครัวบุญดี";
  const cur = recipe?.steps[step];
  return (
    <div class="activity cook">
      <div class="stage-host" ref={host} />
      <ActivityFrame
        title={title}
        onClose={view === "cook" ? backToBook : closeActivity}
        backLabel={view === "cook" ? "กลับไปตำราอาหาร" : undefined}
      />
      {locked ? (
        <LockedKitchen onClose={closeActivity} />
      ) : view === "book" ? (
        <RecipeBook
          selected={sel}
          onSelect={setSel}
          onCook={start}
          onClose={closeActivity}
        />
      ) : null}
      {!locked && view === "cook" && recipe && cur && (
        <>
          <div class="act-bottom" ref={panel}>
            <div class="panel act-tip cook-panel">
              <div class="cook-steps">
                {recipe.steps.map((s, i) => (
                  <span
                    key={i}
                    class={`cook-step ${i < step ? "done" : i === step ? "now" : ""}`}
                  >
                    {i < step ? (
                      <Icon name="check" size={12} />
                    ) : (
                      <b class="num">{i + 1}</b>
                    )}{" "}
                    {STEP_NAMES[s.kind]}
                  </span>
                ))}
              </div>
              <div class="cook-instr">
                <PT text={cur.text} size={13} weight={600} {...TONE_TEXT.ink} />
              </div>
              {snap.chips.length > 0 && (
                <div class="cook-order">
                  {snap.chips.map((c, i) => (
                    <span key={c.key} class={`cook-bottle ${c.state}`}>
                      <img
                        class="px"
                        src={bottleUrl(c.label as Condiment, 2)}
                        alt=""
                        width={16}
                        height={26}
                      />
                      <span>
                        {i + 1}. {CONDIMENT_NAMES[c.label as Condiment]}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <div class="row cook-meter">
                <div class="grow">
                  <Bar
                    value={snap.progress}
                    max={1}
                    tone="green"
                    label="ความคืบหน้า"
                  />
                </div>
                {snap.hint && (
                  <span class="chip gold cook-hint">{snap.hint}</span>
                )}
              </div>
              <div
                class="cook-timer"
                style={{ ["--t" as string]: String(1 - snap.time) }}
                aria-hidden="true"
              >
                <span />
              </div>
            </div>
          </div>
          {grade && <GradePop grade={grade} />}
        </>
      )}
      {!locked && view === "result" && result && (
        <ResultView
          r={result}
          onAlms={() => openActivity("alms")}
          onAgain={backToBook}
          onDone={closeActivity}
        />
      )}
    </div>
  );
}

function GradePop({
  grade,
}: {
  grade: { text: string; key: string; n: number; score: number };
}) {
  const tone = GRADE_TONE[grade.key];
  const stars =
    grade.score >= 0.88
      ? 3
      : grade.score >= 0.66
        ? 2
        : grade.score >= 0.4
          ? 1
          : 0;
  // The chef behind the counter reacts in the scene; this is just the big word.
  return (
    <div class={`cook-grade ${grade.key}`} key={grade.n}>
      <div class="cook-grade-text">
        <PT
          text={grade.text}
          size={22}
          weight={600}
          color={tone.color}
          outline={tone.outline}
          scale={2}
        />
        {stars > 0 && <Stars n={stars} size={18} />}
      </div>
    </div>
  );
}

const TASTE_WORD: Record<
  number,
  { text: string; color: string; outline: string }
> = {
  3: { text: "อร่อยเหาะ!", color: "#ffe45e", outline: "#7a3a10" },
  2: { text: "อร่อยจัง!", color: "#b4f08a", outline: "#1f4a26" },
  1: { text: "เค็มปี๋!", color: "#9fd0ff", outline: "#1f3f70" },
};

/** The chef tastes the dish (ชิม) and pulls a face: heart eyes, a thumbs up or a sour pucker. */
function ChefTaste({
  stars,
  burnt,
  children,
}: {
  stars: number;
  burnt: boolean;
  children?: ComponentChildren;
}) {
  const [react, setReact] = useState(false);
  const look = game.value.player.look;
  useEffect(() => {
    const id = setTimeout(() => {
      setReact(true);
      if (stars >= 2) wsfx.yum();
      else wsfx.wahwah();
      haptic(stars >= 3 ? 30 : 15);
    }, 1100);
    return () => clearTimeout(id);
  }, []);
  const mood: CardMood = !react
    ? "taste"
    : stars >= 3
      ? "yum"
      : stars >= 2
        ? "thumbs"
        : burnt
          ? "burnt"
          : "sour";
  const urls = [0, 1].map((f) =>
    spriteDataUrl(workerCard(look, mood, f as 0 | 1, true), 2),
  );
  const word =
    stars <= 1 && burnt
      ? { text: "ไหม้นิดนึง~", color: "#ffd0a0", outline: "#6e2a10" }
      : TASTE_WORD[Math.max(1, Math.min(3, stars))];
  return (
    <div class={`cook-reveal-row ${react ? "react" : ""}`}>
      <div class="cook-taste">
        <div class="cook-taste-chef">
          <img
            class="px a"
            src={urls[0]}
            width={92}
            height={120}
            alt=""
            draggable={false}
          />
          <img
            class="px b"
            src={urls[1]}
            width={92}
            height={120}
            alt=""
            draggable={false}
          />
          {!react && (
            <span class="cook-taste-bubble">
              <PT text="ชิม…" size={11} weight={600} {...TONE_TEXT.ink} />
            </span>
          )}
        </div>
      </div>
      {children}
      {react && (
        <div class="cook-taste-word">
          <PT
            text={word.text}
            size={17}
            weight={600}
            color={word.color}
            outline={word.outline}
            scale={2}
          />
        </div>
      )}
    </div>
  );
}

function ResultView({
  r,
  onAlms,
  onAgain,
  onDone,
}: {
  r: CookResult & { bonusMerit: number; burnt: boolean };
  onAlms: () => void;
  onAgain: () => void;
  onDone: () => void;
}) {
  const gold = r.stars >= 3;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= r.stars; i++)
      ids.push(
        setTimeout(
          () => {
            setShown(i);
            wsfx.star(i - 1);
          },
          1300 + i * 300,
        ),
      );
    return () => ids.forEach(clearTimeout);
  }, []);
  const dish = r.recipe;
  return (
    <div class="modal-backdrop celebrate cook-result-back">
      <FxCanvas mode={gold ? "confetti" : "sparkle"} />
      <div class="panel modal center cook-result">
        <PT
          text={dish.name}
          size={dish.name.length > 14 ? 13 : dish.name.length > 10 ? 15 : 17}
          weight={600}
          {...TONE_TEXT.ink}
        />
        <ChefTaste stars={r.stars} burnt={r.burnt}>
          <div class={`cook-reveal ${gold ? "gold" : ""}`}>
            <span class="cook-rays" />
            <DishImg id={r.id} scale={3} class="cook-reveal-dish" />
          </div>
        </ChefTaste>
        <div class="cook-result-stars">
          <Stars n={shown} size={30} />
        </div>
        {gold && (
          <span class="chip gold cook-chef">ฝีมือเชฟ! บุญพิเศษ x1.5</span>
        )}
        <div class="subtitle">
          ได้ {ITEM_BY_ID[r.id]?.name ?? dish.name} {r.qty} ที่
          {r.bonus > 0 && (
            <span class="small muted"> (โบนัส 3 ดาว +{r.bonus})</span>
          )}
        </div>
        <div class="panel gold small cook-alms-note">
          <Icon name="bowl" size={20} /> ใช้ตักบาตรได้บุญมาก{" "}
          <b class="num">+{r.merit}</b> บุญต่อที่
          <br />
          <span class="muted">
            มากกว่าซื้อของใส่บาตรหลายเท่า! (x2 ช่วงเช้า)
          </span>
        </div>
        {r.bonusMerit > 0 && (
          <div class="small muted">
            ตั้งใจทำอาหารถวายพระ ได้บุญ +{r.bonusMerit}
          </div>
        )}
        <div class="col" style={{ marginTop: "6px", width: "100%" }}>
          <PBtn tone="gold" block size="big" icon="bowl" onClick={onAlms}>
            ไปตักบาตรเลย
          </PBtn>
          <PBtn tone="paper" block onClick={onAgain}>
            ทำเมนูอื่น
          </PBtn>
          <PBtn tone="green" block onClick={onDone}>
            เก็บไว้ก่อน
          </PBtn>
        </div>
      </div>
    </div>
  );
}
